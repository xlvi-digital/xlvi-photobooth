import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Image as ImageIcon,
  Settings,
  LogOut,
  Camera,
  ExternalLink,
  Sparkles,
  Database
} from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase.js';

export default function AdminSidebar({
  currentView = 'dashboard',
  onSelectView,
  onLogout,
  onOpenPhotobooth,
  adminUser = null,
}) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'events', label: 'Kelola Event', icon: Calendar },
    { id: 'frames', label: 'Kelola Frame', icon: Layers },
    { id: 'gallery', label: 'Galeri Submisi', icon: ImageIcon },
    { id: 'settings', label: 'Pengaturan & DB', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#201d1c] text-[#faf7f2] flex flex-col justify-between border-r border-[#3a3430] shrink-0 min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#3a3430]/70 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              <h1 className="font-serif text-lg font-semibold tracking-wide text-white">
                XLVI Admin
              </h1>
            </div>
            <p className="text-[10px] text-[#a39286] font-sans mt-0.5 tracking-wider uppercase">
              Photobooth Management
            </p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#352f2c] text-amber-200/90 border border-amber-500/20">
            v2.0
          </span>
        </div>

        {/* Supabase Status Pill */}
        <div className="px-4 pt-3 pb-1">
          <div className={`p-2 rounded-xl text-[10px] flex items-center justify-between border ${
            isSupabaseConfigured()
              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
              : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
          }`}>
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="w-3 h-3" />
              <span>{isSupabaseConfigured() ? 'Supabase Connected' : 'Local Fallback Mode'}</span>
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#5c4033] text-white shadow-sm shadow-[#5c4033]/30 font-semibold'
                    : 'text-[#d4c5b9] hover:bg-[#2e2825] hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-[#a39286]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer User Info & Exit to Photobooth */}
      <div className="p-4 border-t border-[#3a3430]/70 space-y-2.5">
        {/* Switch to User Photobooth button */}
        <button
          type="button"
          onClick={onOpenPhotobooth}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#2e2825] hover:bg-[#3d3531] text-[#faf7f2] text-xs font-medium cursor-pointer transition-colors border border-[#4a403a]"
        >
          <Camera className="w-3.5 h-3.5 text-amber-300" />
          <span>Buka Photobooth</span>
          <ExternalLink className="w-3 h-3 text-[#a39286] ml-auto" />
        </button>

        {/* Admin user info & Logout */}
        <div className="flex items-center justify-between pt-1">
          <div className="overflow-hidden pr-2">
            <p className="text-xs font-medium text-white truncate">
              {adminUser?.email || 'Administrator'}
            </p>
            <p className="text-[10px] text-[#a39286] capitalize font-sans">
              {adminUser?.profile?.role || adminUser?.role || 'Admin'}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#a39286] hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
            title="Keluar (Logout)"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
