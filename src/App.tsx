/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import { CourseProvider } from './contexts/CourseContext';
import Agenda from './pages/Agenda';
import Timetable from './pages/Timetable';
import Import from './pages/Import';
import Settings from './pages/Settings';
import CourseEditor from './pages/CourseEditor';
import ScrollToTop from './components/ScrollToTop';

export default function App() {
  return (
    <SettingsProvider>
      <CourseProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Navigate to="/timetable" replace />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/timetable" element={<Timetable />} />
            <Route path="/import" element={<Import />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/editor" element={<CourseEditor />} />
          </Routes>
        </BrowserRouter>
      </CourseProvider>
    </SettingsProvider>
  );
}
