import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import BottomNav from '../../components/BottomNav';
import PickerModal from '../../components/PickerModal';
import DatePickerModal from '../../components/DatePickerModal';
import TimePickerModal from '../../components/TimePickerModal';
import { useSettingsForm } from './useSettingsForm';
import TimetableManager from './TimetableManager';
import TimetableEditor from './TimetableEditor';
import PersonalizationPanel from './PersonalizationPanel';

export default function SettingsPage() {
  const {
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
  } = useSettingsForm();

  return (
    <div className="app-page bg-[#F7F7F9] text-on-surface font-body">
      <main className="app-content pt-[max(env(safe-area-inset-top),_3rem)] px-3 pb-4 max-w-2xl mx-auto">
        {/* User Profile Section */}
        <section className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 border-2 border-white shadow-sm">
            <span className="material-symbols-outlined text-5xl text-slate-800">person</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">{getUserEmail() || '用户'}</h2>
          <div className="flex items-center text-sm text-slate-500">
            <span>NextClass 用户</span>
          </div>
        </section>

        {/* Menu Group */}
        <section className="mb-6 bg-white rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => setIsTimetableManageOpen(true)}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left border-b border-slate-50"
          >
            <span className="text-[16px] text-slate-800">课表管理</span>
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
          <button
            onClick={handleOpenPersonalization}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left border-b border-slate-50"
          >
            <span className="text-[16px] text-slate-800">个性化设置</span>
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
          <button
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left border-b border-slate-50"
          >
            <span className="text-[16px] text-slate-800">常见问题</span>
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
          <button
            onClick={() => navigate('/nextclass')}
            className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors text-left"
          >
            <span className="text-[16px] text-slate-800">更多</span>
            <span className="material-symbols-outlined text-slate-300">chevron_right</span>
          </button>
        </section>

        <section className="mb-6">
          <button
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
            className="w-full py-4 bg-white text-primary font-bold rounded-2xl shadow-sm border border-primary/20 hover:bg-primary/5 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">logout</span>
            退出登录
          </button>
        </section>
      </main>

      {/* Timetable Management Modal */}
      <AnimatePresence>
        <TimetableManager
          isOpen={isTimetableManageOpen}
          onClose={() => setIsTimetableManageOpen(false)}
          timetables={timetables}
          handleSetActive={handleSetActive}
          setEditingTableId={setEditingTableId}
          setEditName={setEditName}
          setEditStartDate={setEditStartDate}
          setEditTotalWeeks={setEditTotalWeeks}
          setEditPeriods={setEditPeriods}
        />
      </AnimatePresence>

      {/* Edit Timetable Modal */}
      <AnimatePresence>
        {editingTableId && (
          <TimetableEditor
            editingTableId={editingTableId}
            closeEditModal={closeEditModal}
            handleEditSave={handleEditSave}
            editName={editName}
            setEditName={setEditName}
            editStartDate={editStartDate}
            setEditStartDate={setEditStartDate}
            editTotalWeeks={editTotalWeeks}
            editPeriods={editPeriods}
            setEditPeriods={setEditPeriods}
            setIsStartDatePickerOpen={setIsStartDatePickerOpen}
            setIsTotalWeeksPickerOpen={setIsTotalWeeksPickerOpen}
            setActiveTimePicker={setActiveTimePicker}
            addMinutes={addMinutes}
            setShowDeleteConfirm={setShowDeleteConfirm}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Alert */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 px-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white rounded-dynamic p-6 w-full max-w-sm shadow-2xl"
            >
              <h3 className="text-lg font-bold text-primary mb-2">删除课表</h3>
              <p className="text-slate-600 mb-6">确定要删除这个课表吗？此操作不可恢复。</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-full transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDeleteTimetable(editingTableId!)}
                  className="px-6 py-2 bg-primary text-white rounded-full font-bold hover:bg-primary transition-colors"
                >
                  删除
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modals/Pickers */}
      <DatePickerModal
        isOpen={isStartDatePickerOpen}
        onClose={() => setIsStartDatePickerOpen(false)}
        title="选择开学日期"
        value={editStartDate}
        onChange={(v) => setEditStartDate(v)}
      />

      <PickerModal
        isOpen={isTotalWeeksPickerOpen}
        onClose={() => setIsTotalWeeksPickerOpen(false)}
        title="选择学期周数"
        options={totalWeeksOptions}
        value={editTotalWeeks}
        onChange={(v) => setEditTotalWeeks(Number(v))}
      />

      <TimePickerModal
        isOpen={activeTimePicker !== null}
        onClose={() => setActiveTimePicker(null)}
        title={activeTimePicker?.type === 'start' ? '选择开始时间' : '选择结束时间'}
        value={activeTimePicker ? editPeriods[activeTimePicker.index][activeTimePicker.type] : '08:00'}
        onChange={(v) => {
          if (activeTimePicker) {
            const newPeriods = [...editPeriods];
            newPeriods[activeTimePicker.index][activeTimePicker.type] = v;
            setEditPeriods(newPeriods);
          }
        }}
      />

      {/* Personalization Modal */}
      <AnimatePresence>
        <PersonalizationPanel
          isOpen={isPersonalizationOpen}
          onCancel={handleCancelPersonalization}
          onSave={() => setIsPersonalizationOpen(false)}
          cornerRadius={cornerRadius}
          setCornerRadius={setCornerRadius}
          cellHeight={cellHeight}
          setCellHeight={setCellHeight}
          transparency={transparency}
          setTransparency={setTransparency}
          themeColor={themeColor}
          setThemeColor={setThemeColor}
          colors={colors}
        />
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
