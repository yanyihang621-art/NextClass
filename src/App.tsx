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
import TabTransition from './components/TabTransition';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

// ─── Pages that live INSIDE the bottom-nav tabs (no slide animation) ───
const TAB_PATHS = ['/agenda', '/timetable', '/import', '/settings'];

function AnimatedRoutes() {
  const location = useLocation();
  const isTabPage = TAB_PATHS.includes(location.pathname);

  return (
    <AnimatePresence mode="wait">
      {/* @ts-expect-error - key is required by AnimatePresence to trigger page transition animations */}
      <Routes location={location} key={location.pathname}>
        {/* Auth pages */}
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Tab pages — fade-in transition */}
        <Route path="/" element={<ProtectedRoute><Navigate to="/timetable" replace /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><TabTransition><Agenda /></TabTransition></ProtectedRoute>} />
        <Route path="/timetable" element={<ProtectedRoute><TabTransition><Timetable /></TabTransition></ProtectedRoute>} />
        <Route path="/import" element={<ProtectedRoute><TabTransition><Import /></TabTransition></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><TabTransition><Settings /></TabTransition></ProtectedRoute>} />

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
    const setupStatusBar = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#00000000' });
        }
      } catch (error) {
        console.warn('StatusBar configuration failed:', error);
      }
    };
    setupStatusBar();
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
