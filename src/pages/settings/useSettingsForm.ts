import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useTimetable } from '../../contexts/TimetableContext';
import { useCourses } from '../../contexts/CourseContext';
import { useAuth } from '../../contexts/AuthContext';
import { defaultPeriods } from '../../shared/constants/defaults';
import { getBeijingTime } from '../../lib/timeUtils';
import { generateId } from '../../shared/lib/id';
import type { ThemeColor } from '../../shared/types/timetable';
import type { ParsedCourse } from '../../lib/parseSchedule';

export function useSettingsForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    themeColor, setThemeColor,
    transparency, setTransparency,
    cornerRadius, setCornerRadius,
    cellHeight, setCellHeight,
  } = usePreferences();
  const { timetables, setTimetables } = useTimetable();
  const { deleteCoursesByTimetable, addCourse } = useCourses();
  const { getUserEmail, signOut } = useAuth();

  const colors = [
    { id: 'purple', class: 'bg-[#6d23f9]' },
    { id: 'blue', class: 'bg-[#008bff]' },
    { id: 'emerald', class: 'bg-[#00b48e]' },
    { id: 'rose', class: 'bg-[#ff007a]' },
    { id: 'amber', class: 'bg-[#ff7a4b]' },
    { id: 'indigo', class: 'bg-indigo-500' },
  ] as const;

  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [isTimetableManageOpen, setIsTimetableManageOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editTotalWeeks, setEditTotalWeeks] = useState(20);
  const [editPeriods, setEditPeriods] = useState(defaultPeriods);
  const [pendingImport, setPendingImport] = useState<ParsedCourse[] | null>(null);

  useEffect(() => {
    if (location.state?.openCreateTimetable) {
      setIsTimetableManageOpen(true);
      setEditingTableId('new');
      setEditName('');
      setEditStartDate(getBeijingTime().toISOString().split('T')[0]);
      setEditTotalWeeks(20);
      setEditPeriods(defaultPeriods);
      
      if (location.state?.pendingImport) {
        setPendingImport(location.state.pendingImport);
      }

      // Clear the state so it doesn't reopen on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const closeEditModal = () => {
    setEditingTableId(null);
    if (pendingImport) {
      setPendingImport(null);
      navigate(-1);
    }
  };

  const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
  const [initialPersonalization, setInitialPersonalization] = useState<{ themeColor: ThemeColor; cornerRadius: number; cellHeight: number; transparency: number } | null>(null);

  const handleOpenPersonalization = () => {
    setInitialPersonalization({ themeColor, cornerRadius, cellHeight, transparency });
    setIsPersonalizationOpen(true);
  };

  const handleCancelPersonalization = () => {
    if (initialPersonalization) {
      setThemeColor(initialPersonalization.themeColor);
      setCornerRadius(initialPersonalization.cornerRadius);
      setCellHeight(initialPersonalization.cellHeight);
      setTransparency(initialPersonalization.transparency);
    }
    setIsPersonalizationOpen(false);
  };

  const [isStartDatePickerOpen, setIsStartDatePickerOpen] = useState(false);
  const [isTotalWeeksPickerOpen, setIsTotalWeeksPickerOpen] = useState(false);
  const [activeTimePicker, setActiveTimePicker] = useState<{ index: number; type: 'start' | 'end' } | null>(null);

  const addMinutes = (time: string, mins: number) => {
    const [h, m] = time.split(':').map(Number);
    const totalMins = h * 60 + m + mins;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  const totalWeeksOptions = Array.from({ length: 50 }, (_, i) => ({
    label: `${i + 1} 周`,
    value: i + 1
  }));

  const handleEditSave = () => {
    if (editingTableId && editName.trim()) {
      if (editingTableId === 'new') {
        const newTimetableId = generateId();
        const newTimetable = {
          id: newTimetableId,
          name: editName,
          term: '',
          active: timetables.length === 0 || !!pendingImport,
          startDate: editStartDate || '2024-09-01',
          totalWeeks: editTotalWeeks,
          periods: editPeriods
        };
        const updated = timetables.map(t => ({
          ...t,
          active: newTimetable.active ? false : t.active
        }));
        updated.push(newTimetable);
        setTimetables(updated);
        
        setEditingTableId(null);

        if (pendingImport) {
          pendingImport.forEach(c => {
            addCourse({
              id: generateId(),
              timetableId: newTimetableId,
              name: c.name,
              teacher: c.teacher || '',
              location: c.location,
              weeks: c.weeks || '1-16',
              day: c.day,
              periodStart: c.periodStart,
              periodEnd: c.periodEnd,
              color: '',
              bg: ''
            });
          });

          navigate('/timetable', { replace: true });
          return;
        }

      } else {
        setTimetables(timetables.map(t => t.id === editingTableId ? {
          ...t,
          name: editName,
          startDate: editStartDate,
          totalWeeks: editTotalWeeks,
          periods: editPeriods
        } : t));
      }
      setEditingTableId(null);
    }
  };

  const handleSetActive = (id: string) => {
    setTimetables(timetables.map(t => ({ ...t, active: t.id === id })));
  };

  const handleDeleteTimetable = (id: string) => {
    const newTimetables = timetables.filter(t => t.id !== id);
    if (newTimetables.length > 0 && timetables.find(t => t.id === id)?.active) {
      newTimetables[0].active = true;
    }
    setTimetables(newTimetables);
    deleteCoursesByTimetable(id);
    setEditingTableId(null);
    setShowDeleteConfirm(false);
  };

  return {
    navigate,
    themeColor, setThemeColor,
    transparency, setTransparency,
    cornerRadius, setCornerRadius,
    cellHeight, setCellHeight,
    timetables,
    colors,
    editingTableId, setEditingTableId,
    isTimetableManageOpen, setIsTimetableManageOpen,
    showDeleteConfirm, setShowDeleteConfirm,
    editName, setEditName,
    editStartDate, setEditStartDate,
    editTotalWeeks, setEditTotalWeeks,
    editPeriods, setEditPeriods,
    isPersonalizationOpen, setIsPersonalizationOpen,
    isStartDatePickerOpen, setIsStartDatePickerOpen,
    isTotalWeeksPickerOpen, setIsTotalWeeksPickerOpen,
    activeTimePicker, setActiveTimePicker,
    getUserEmail, signOut,
    closeEditModal,
    handleOpenPersonalization,
    handleCancelPersonalization,
    addMinutes,
    totalWeeksOptions,
    handleEditSave,
    handleSetActive,
    handleDeleteTimetable
  };
}
