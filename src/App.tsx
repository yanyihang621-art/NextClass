/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { SettingsProvider } from './contexts/SettingsContext';
import { CourseProvider } from './contexts/CourseContext';
import Agenda from './pages/Agenda';
import Timetable from './pages/Timetable';
import Import from './pages/Import';
import Settings from './pages/Settings';
import CourseEditor from './pages/CourseEditor';
import NextClass from './pages/NextClass';
import ResetPassword from './pages/ResetPassword';
import ScrollToTop from './components/ScrollToTop';
import PageTransition from './components/PageTransition';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// ─── Pages that live INSIDE the bottom-nav tabs (no slide animation) ───
const TAB_PATHS = ['/agenda', '/timetable', '/import', '/settings'];

function AnimatedRoutes() {
  const location = useLocation();
  const isTabPage = TAB_PATHS.includes(location.pathname);

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={isTabPage ? 'tabs' : location.pathname}>
        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Tab pages — rendered WITHOUT page transition */}
        <Route path="/" element={<ProtectedRoute><Navigate to="/timetable" replace /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
        <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Non-tab pages — slide-in animation */}
        <Route path="/editor" element={
          <ProtectedRoute>
            <PageTransition>
              <CourseEditor />
            </PageTransition>
          </ProtectedRoute>
        } />
        <Route path="/nextclass" element={
          <ProtectedRoute>
            <PageTransition>
              <NextClass />
            </PageTransition>
          </ProtectedRoute>
        } />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  // --- StatusBar setup ---
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true });
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#00000000' });
    }
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <CourseProvider>
          <BrowserRouter>
            <ScrollToTop />
            <AnimatedRoutes />
          </BrowserRouter>
        </CourseProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
