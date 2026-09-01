'use client';

import React, { useState, useRef } from 'react';
import { AppSettings } from '@/lib/types';
import {
  Download,
  Upload,
  Trash2,
  Bell,
  Volume2,
  Smartphone,
  Clock,
  User,
  LogOut,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { exportAllData, importData } from '@/lib/storage';

interface SettingsScreenProps {
  settings: AppSettings;
  currentUser?: { email?: string; id?: string } | null;
  onSignOut: () => void;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onClearHistory: () => void;
  onResetAllData?: () => void;
  onReplayIntro?: () => void;
  onNavigateToAbout?: () => void;
}

export default function SettingsScreen({
  settings,
  currentUser,
  onSignOut,
  onUpdateSettings,
  onClearHistory,
}: SettingsScreenProps) {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleExportJSON = () => {
    try {
      const data = exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `salah-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showFeedback('BACKUP EXPORTED SUCCESSFULLY');
    } catch {
      showFeedback('EXPORT FAILED');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importData(content)) {
        showFeedback('BACKUP IMPORTED. REFRESHING...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showFeedback('INVALID BACKUP FILE');
      }
    };
    reader.readAsText(file);
  };

  const handleToggleNotifications = async () => {
    if (!settings.notificationsEnabled) {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            onUpdateSettings({ notificationsEnabled: true });
            showFeedback('PRAYER REMINDERS ENABLED');
          } else {
            onUpdateSettings({ notificationsEnabled: false });
            showFeedback('PERMISSION DENIED IN BROWSER');
          }
        } catch {
          showFeedback('NOTIFICATION REQUEST FAILED');
        }
      } else {
        showFeedback('NOTIFICATIONS NOT SUPPORTED');
      }
    } else {
      onUpdateSettings({ notificationsEnabled: false });
      showFeedback('PRAYER REMINDERS DISABLED');
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 pt-6 pb-28 text-black selection:bg-black selection:text-white">
      {/* Header */}
      <header className="border-b border-black pb-4 mb-6">
        <h1 className="text-xl font-black font-sans tracking-tight uppercase">
          Settings
        </h1>
        <p className="text-xs font-mono text-neutral-500 uppercase tracking-wider mt-0.5">
          Preferences & Account
        </p>
      </header>

      {/* Temporary Feedback Notification */}
      {feedbackMsg && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 px-4 py-2.5 bg-black text-white font-mono text-xs font-bold uppercase tracking-wider text-center"
        >
          {feedbackMsg}
        </div>
      )}

      <div className="space-y-8">
        {/* ================================================== */}
        {/* SECTION 1: ACCOUNT                                 */}
        {/* ================================================== */}
        <section aria-label="Account Settings">
          <div className="border-b border-black pb-1.5 mb-3">
            <h2 className="text-xs font-black font-mono tracking-widest text-neutral-500 uppercase">
              ACCOUNT
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 border border-black flex items-center justify-center shrink-0">
                  <User size={18} strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold font-mono text-black truncate max-w-[200px] sm:max-w-xs">
                    {currentUser?.email || 'Authenticated User'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-black inline-block"></span>
                    <span className="text-[11px] font-mono uppercase text-neutral-500 tracking-wider">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              id="sign-out-btn"
              onClick={onSignOut}
              aria-label="Sign Out of Account"
              className="w-full min-h-[44px] px-4 border border-black bg-white text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut size={15} strokeWidth={2.5} />
              <span>SIGN OUT</span>
            </button>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 2: PREFERENCES                             */}
        {/* ================================================== */}
        <section aria-label="Application Preferences">
          <div className="border-b border-black pb-1.5 mb-3">
            <h2 className="text-xs font-black font-mono tracking-widest text-neutral-500 uppercase">
              PREFERENCES
            </h2>
          </div>

          <div className="divide-y divide-neutral-200">
            {/* Time Format */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Clock size={18} strokeWidth={2} className="text-neutral-700 shrink-0" />
                <div>
                  <span className="text-sm font-bold font-sans text-black block">
                    Time Format
                  </span>
                  <span className="text-xs font-mono text-neutral-500">
                    Display in 12-hour or 24-hour cycle
                  </span>
                </div>
              </div>

              <div className="flex border border-black shrink-0">
                <button
                  onClick={() => onUpdateSettings({ timeFormat: '12h' })}
                  className={`min-h-[40px] px-3 font-mono text-xs font-bold uppercase transition-colors cursor-pointer ${
                    settings.timeFormat === '12h'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                  aria-pressed={settings.timeFormat === '12h'}
                >
                  12H
                </button>
                <button
                  onClick={() => onUpdateSettings({ timeFormat: '24h' })}
                  className={`min-h-[40px] px-3 font-mono text-xs font-bold uppercase border-l border-black transition-colors cursor-pointer ${
                    settings.timeFormat === '24h'
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                  aria-pressed={settings.timeFormat === '24h'}
                >
                  24H
                </button>
              </div>
            </div>

            {/* Sound Effects */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Volume2 size={18} strokeWidth={2} className="text-neutral-700 shrink-0" />
                <div>
                  <span className="text-sm font-bold font-sans text-black block">
                    Sound Effects
                  </span>
                  <span className="text-xs font-mono text-neutral-500">
                    Mechanical audio feedback on tick
                  </span>
                </div>
              </div>

              <button
                id="toggle-sound-btn"
                role="switch"
                aria-checked={settings.soundEnabled}
                aria-label="Toggle Sound Effects"
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className="min-h-[44px] min-w-[60px] flex items-center justify-center cursor-pointer"
              >
                <div
                  className={`w-12 h-6 border-2 border-black flex items-center p-0.5 transition-colors ${
                    settings.soundEnabled ? 'bg-black justify-end' : 'bg-white justify-start'
                  }`}
                >
                  <div
                    className={`w-4 h-4 ${
                      settings.soundEnabled ? 'bg-white' : 'bg-black'
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Haptic Feedback */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Smartphone size={18} strokeWidth={2} className="text-neutral-700 shrink-0" />
                <div>
                  <span className="text-sm font-bold font-sans text-black block">
                    Haptic Feedback
                  </span>
                  <span className="text-xs font-mono text-neutral-500">
                    Tactile touch pulse on mobile
                  </span>
                </div>
              </div>

              <button
                id="toggle-haptic-btn"
                role="switch"
                aria-checked={settings.hapticsEnabled}
                aria-label="Toggle Haptic Feedback"
                onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
                className="min-h-[44px] min-w-[60px] flex items-center justify-center cursor-pointer"
              >
                <div
                  className={`w-12 h-6 border-2 border-black flex items-center p-0.5 transition-colors ${
                    settings.hapticsEnabled ? 'bg-black justify-end' : 'bg-white justify-start'
                  }`}
                >
                  <div
                    className={`w-4 h-4 ${
                      settings.hapticsEnabled ? 'bg-white' : 'bg-black'
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Prayer Reminders */}
            <div className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Bell size={18} strokeWidth={2} className="text-neutral-700 shrink-0" />
                <div>
                  <span className="text-sm font-bold font-sans text-black block">
                    Prayer Reminders
                  </span>
                  <span className="text-xs font-mono text-neutral-500 block">
                    Active while app/tab is open
                  </span>
                </div>
              </div>

              <button
                id="toggle-notifications-btn"
                role="switch"
                aria-checked={settings.notificationsEnabled}
                aria-label="Toggle Prayer Reminders"
                onClick={handleToggleNotifications}
                className="min-h-[44px] min-w-[60px] flex items-center justify-center cursor-pointer"
              >
                <div
                  className={`w-12 h-6 border-2 border-black flex items-center p-0.5 transition-colors ${
                    settings.notificationsEnabled ? 'bg-black justify-end' : 'bg-white justify-start'
                  }`}
                >
                  <div
                    className={`w-4 h-4 ${
                      settings.notificationsEnabled ? 'bg-white' : 'bg-black'
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 3: DATA & BACKUP                           */}
        {/* ================================================== */}
        <section aria-label="Data and Backup">
          <div className="border-b border-black pb-1.5 mb-3">
            <h2 className="text-xs font-black font-mono tracking-widest text-neutral-500 uppercase">
              DATA & BACKUP
            </h2>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Export Button */}
              <button
                id="export-backup-btn"
                onClick={handleExportJSON}
                aria-label="Export JSON Backup"
                className="min-h-[44px] px-3.5 border border-black bg-white text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download size={15} strokeWidth={2.5} />
                <span>Export JSON Backup</span>
              </button>

              {/* Import Button */}
              <button
                id="import-backup-btn"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Import JSON Backup"
                className="min-h-[44px] px-3.5 border border-black bg-white text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-black hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload size={15} strokeWidth={2.5} />
                <span>Import JSON Backup</span>
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              aria-hidden="true"
            />

            {/* Sync State Indicator */}
            <div className="pt-2 flex items-center justify-between text-xs font-mono text-neutral-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-black" />
                <span className="uppercase tracking-wider font-semibold text-black">Status: Synced</span>
              </div>
              <span className="text-[11px] text-neutral-400 uppercase tracking-widest">
                Cloud & Local Storage
              </span>
            </div>
          </div>
        </section>

        {/* ================================================== */}
        {/* SECTION 4: DANGER ZONE                             */}
        {/* ================================================== */}
        <section aria-label="Danger Zone">
          <div className="border-b border-black pb-1.5 mb-3">
            <h2 className="text-xs font-black font-mono tracking-widest text-neutral-500 uppercase">
              DANGER ZONE
            </h2>
          </div>

          <div>
            {!showClearConfirm ? (
              <button
                id="clear-history-btn"
                onClick={() => setShowClearConfirm(true)}
                aria-label="Clear All History"
                className="w-full min-h-[44px] px-4 border border-black bg-white text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-black transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 size={15} strokeWidth={2.5} />
                <span>Clear All History</span>
              </button>
            ) : (
              <div className="border border-black p-4 bg-neutral-50 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={18} className="text-black shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-bold font-mono uppercase text-black block">
                      Confirm History Reset
                    </span>
                    <span className="text-xs font-mono text-neutral-600">
                      Permanently clear all historical Salah completion records? This action cannot be undone.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      onClearHistory();
                      setShowClearConfirm(false);
                      showFeedback('ALL HISTORY CLEARED');
                    }}
                    className="flex-1 min-h-[40px] px-3 bg-black text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    CONFIRM CLEAR
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 min-h-[40px] px-3 border border-black bg-white text-black text-xs font-mono font-bold uppercase tracking-wider hover:bg-neutral-100 transition-colors cursor-pointer"
                  >
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Single Clean Version Footer */}
      <footer className="mt-12 pt-6 border-t border-neutral-200 text-center">
        <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-widest">
          NAMAZ-TRACKER v1.0 • MONOCHROME EDITION
        </p>
      </footer>
    </div>
  );
}
