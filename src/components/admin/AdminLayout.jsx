import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import AdminSidebar from './AdminSidebar.jsx';
import AdminDashboardHome from './AdminDashboardHome.jsx';
import AdminEventsList from './AdminEventsList.jsx';
import AdminFramesList from './AdminFramesList.jsx';
import AdminFrameCreator from './AdminFrameCreator.jsx';
import AdminGalleryView from './AdminGalleryView.jsx';
import AdminSettingsView from './AdminSettingsView.jsx';
import { validateSupabaseConfig } from '../../lib/supabase.js';

export default function AdminLayout({ adminUser, onLogout, onOpenPhotobooth }) {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' | 'events' | 'frames' | 'gallery' | 'settings'
  const [frameAction, setFrameAction] = useState({ mode: 'list', frameId: null }); // mode: 'list' | 'create' | 'edit'

  const configStatus = validateSupabaseConfig();

  const handleSidebarNavigate = (viewId) => {
    setCurrentView(viewId);
    if (viewId === 'frames') {
      setFrameAction({ mode: 'list', frameId: null });
    }
  };

  const handleDashboardNavigate = (viewId, opts = {}) => {
    setCurrentView(viewId);
    if (viewId === 'frames' && opts.action === 'create') {
      setFrameAction({ mode: 'create', frameId: null });
    }
  };

  return (
    <div className="min-h-screen bg-[#faf7f2] flex flex-col md:flex-row font-sans selection:bg-[#5c4033]/20">
      {/* Sidebar (Desktop left / Mobile header) */}
      <AdminSidebar
        currentView={currentView}
        onSelectView={handleSidebarNavigate}
        onLogout={onLogout}
        onOpenPhotobooth={onOpenPhotobooth}
        adminUser={adminUser}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto max-h-screen bg-[#faf7f2]">
        {/* Configuration Notice if Supabase env vars are missing */}
        {!configStatus.isValid && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-xs text-amber-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Perhatian Konfigurasi:</strong>{' '}
                {configStatus.errors.join(' | ')}. Berjalan dalam mode local storage fallback.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('settings')}
              className="underline font-semibold hover:text-amber-950 shrink-0 cursor-pointer"
            >
              Buka Pengaturan
            </button>
          </div>
        )}

        {currentView === 'dashboard' && (
          <AdminDashboardHome onNavigate={handleDashboardNavigate} />
        )}

        {currentView === 'events' && (
          <AdminEventsList
            onOpenEventPhotobooth={(slug) => {
              onOpenPhotobooth(slug);
            }}
          />
        )}

        {currentView === 'frames' && (
          <>
            {frameAction.mode === 'list' && (
              <AdminFramesList
                onNavigateToCreate={() => setFrameAction({ mode: 'create', frameId: null })}
                onNavigateToEdit={(id) => setFrameAction({ mode: 'edit', frameId: id })}
              />
            )}
            {(frameAction.mode === 'create' || frameAction.mode === 'edit') && (
              <AdminFrameCreator
                frameId={frameAction.frameId}
                onBack={() => setFrameAction({ mode: 'list', frameId: null })}
                onSaved={() => setFrameAction({ mode: 'list', frameId: null })}
              />
            )}
          </>
        )}

        {currentView === 'gallery' && <AdminGalleryView />}

        {currentView === 'settings' && <AdminSettingsView />}
      </main>
    </div>
  );
}
