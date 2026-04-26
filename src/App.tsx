/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

export default function App() {
  // --- StatusBar setup ---
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true });
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#00000000' });
    }
  }, []);

  // --- Capgo OTA Hot Update ---
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Action A: Send heartbeat immediately — tells Capgo the current
    // bundle loaded successfully and should NOT be rolled back.
    CapacitorUpdater.notifyAppReady();

    // Action B: Silently check, download, and apply updates.
    const checkForUpdate = async () => {
      try {
        const latest = await CapacitorUpdater.download({
          url: '',      // Capgo cloud resolves the URL automatically
          version: '0.0.0', // placeholder; Capgo picks the latest
        });

        // A new bundle was downloaded — apply it and reload the WebView.
        if (latest?.version) {
          console.log('[Capgo] New version downloaded:', latest.version);
          await CapacitorUpdater.set({ id: latest.id });
          // set() triggers an automatic WebView reload.
        }
      } catch (err) {
        // Network failure or no update available — silently log and
        // let the user continue using the current version.
        console.error('[Capgo] Update check failed (non-blocking):', err);
      }
    };

    checkForUpdate();
  }, []);

  return (
    <AuthProvider>
      <SettingsProvider>
        <CourseProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/" element={<ProtectedRoute><Navigate to="/timetable" replace /></ProtectedRoute>} />
              <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
              <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
              <Route path="/import" element={<ProtectedRoute><Import /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/editor" element={<ProtectedRoute><CourseEditor /></ProtectedRoute>} />
              <Route path="/nextclass" element={<ProtectedRoute><NextClass /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
        </CourseProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
