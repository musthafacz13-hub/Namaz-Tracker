'use client';

import React, { useState, useRef } from 'react';
import { AppSettings } from '@/lib/types';
import { ArrowRight, ChevronLeft, Download, Upload, Trash2, Bell, Volume2, Smartphone, Clock, Sparkles } from 'lucide-react';
import { exportAllData, importData } from '@/lib/storage';

interface SettingsScreenProps {
  settings: AppSettings;
  onUpdateSettings: (updates: Partial<AppSettings>) => void;
  onClearHistory: () => void;
  onResetAllData: () => void;
  onReplayIntro: () => void;
  onNavigateToAbout: () => void;
}

export default function SettingsScreen({
  settings,
  onUpdateSettings,
  onClearHistory,
  onResetAllData,
  onReplayIntro,
  onNavigateToAbout,
}: SettingsScreenProps) {
  const [activeSubView, setActiveSubView] = useState<
    'notifications' | 'export' | 'clear' | null
  >(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  const handleExportJSON = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salah-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('BACKUP EXPORTED SUCCESSFULLY');
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importData(content)) {
        showFeedback('DATA IMPORTED SUCCESSFULLY. REFRESHING...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showFeedback('INVALID BACKUP FILE FORMAT');
      }
    };
    reader.readAsText(file);
  };

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onUpdateSettings({ notificationsEnabled: true });
        showFeedback('NOTIFICATIONS ENABLED');
      } else {
        onUpdateSettings({ notificationsEnabled: false });
        showFeedback('PERMISSION DENIED IN BROWSER');
      }
    } else {
      showFeedback('NOTIFICATIONS NOT SUPPORTED IN THIS BROWSER');
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-6 pt-10 pb-28 min-h-screen bg-white text-black">
      {/* Header: "SETTINGS" */}
      <div className="border-b border-black pb-4 mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-none">
            SETTINGS
          </h1>
          <p className="text-xs font-mono tracking-widest text-neutral-500 uppercase mt-2">
            PREFERENCES & DATA MANAGEMENT
          </p>
        </div>

        {activeSubView && (
          <button
            onClick={() => setActiveSubView(null)}
            className="flex items-center gap-1 border border-black px-3 py-1 text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
          >
            <ChevronLeft size={14} strokeWidth={3} />
            <span>BACK</span>
          </button>
        )}
      </div>

      {feedbackMsg && (
        <div className="mb-6 p-3 bg-black text-white text-center font-mono text-xs font-bold tracking-wider">
          {feedbackMsg}
        </div>
      )}

      {/* Main List Menu */}
      {!activeSubView && (
        <div className="divide-y divide-black border-t border-b border-black">
          {/* Notification Preferences */}
          <button
            id="menu-notifications"
            onClick={() => setActiveSubView('notifications')}
            className="w-full py-5 px-1 flex items-center justify-between text-left group hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell size={20} strokeWidth={2} />
              <span className="text-lg md:text-xl font-bold tracking-tight uppercase">
                Notification Preferences
              </span>
            </div>
            <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Export Data */}
          <button
            id="menu-export"
            onClick={() => setActiveSubView('export')}
            className="w-full py-5 px-1 flex items-center justify-between text-left group hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download size={20} strokeWidth={2} />
              <span className="text-lg md:text-xl font-bold tracking-tight uppercase">
                Export Data
              </span>
            </div>
            <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Clear History */}
          <button
            id="menu-clear"
            onClick={() => setActiveSubView('clear')}
            className="w-full py-5 px-1 flex items-center justify-between text-left group hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Trash2 size={20} strokeWidth={2} />
              <span className="text-lg md:text-xl font-bold tracking-tight uppercase">
                Clear History
              </span>
            </div>
            <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Sound & Haptic Feedback Toggle row */}
          <div className="py-5 px-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 size={20} strokeWidth={2} />
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight uppercase">
                  Sound Feedback
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  TACTILE MECHANICAL AUDIO TICK
                </span>
              </div>
            </div>
            <button
              id="toggle-sound-btn"
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-12 h-6 border-2 border-black flex items-center p-0.5 transition-colors ${
                settings.soundEnabled ? 'bg-black justify-end' : 'bg-white justify-start'
              }`}
            >
              <div
                className={`w-4 h-4 ${
                  settings.soundEnabled ? 'bg-white' : 'bg-black'
                }`}
              />
            </button>
          </div>

          <div className="py-5 px-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone size={20} strokeWidth={2} />
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight uppercase">
                  Haptic Vibration
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  MOBILE TOUCH PULSE
                </span>
              </div>
            </div>
            <button
              id="toggle-haptic-btn"
              onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              className={`w-12 h-6 border-2 border-black flex items-center p-0.5 transition-colors ${
                settings.hapticsEnabled ? 'bg-black justify-end' : 'bg-white justify-start'
              }`}
            >
              <div
                className={`w-4 h-4 ${
                  settings.hapticsEnabled ? 'bg-white' : 'bg-black'
                }`}
              />
            </button>
          </div>

          {/* Time format */}
          <div className="py-5 px-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock size={20} strokeWidth={2} />
              <span className="text-lg font-bold tracking-tight uppercase">
                Time Format
              </span>
            </div>
            <button
              id="toggle-timeformat-btn"
              onClick={() =>
                onUpdateSettings({
                  timeFormat: settings.timeFormat === '12h' ? '24h' : '12h',
                })
              }
              className="border border-black px-3 py-1 font-mono text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
            >
              {settings.timeFormat.toUpperCase()}
            </button>
          </div>

          {/* Replay Intro */}
          <button
            id="menu-replay-intro"
            onClick={onReplayIntro}
            className="w-full py-5 px-1 flex items-center justify-between text-left group hover:bg-neutral-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sparkles size={20} strokeWidth={2} />
              <span className="text-lg md:text-xl font-bold tracking-tight uppercase">
                Replay Bismillah Intro
              </span>
            </div>
            <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          </button>

          {/* About Screen */}
          <button
            id="menu-about"
            onClick={onNavigateToAbout}
            className="w-full py-5 px-1 flex items-center justify-between text-left group hover:bg-neutral-100 transition-colors"
          >
            <span className="text-lg md:text-xl font-bold tracking-tight uppercase">
              About
            </span>
            <ArrowRight size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {/* SubView: Notification Preferences */}
      {activeSubView === 'notifications' && (
        <div className="space-y-6">
          <div className="border border-black p-6 space-y-4">
            <h2 className="font-bold text-base uppercase tracking-wider">
              BROWSER NOTIFICATIONS
            </h2>
            <p className="text-xs font-mono text-neutral-500 leading-relaxed">
              RECEIVE DISCREET SYSTEM REMINDERS AT MANUALLY CONFIGURED PRAYER TIMES.
            </p>
            <button
              onClick={requestNotificationPermission}
              className="w-full bg-black text-white py-3 px-4 font-mono font-bold text-xs uppercase tracking-widest hover:bg-neutral-900"
            >
              {settings.notificationsEnabled
                ? 'NOTIFICATIONS ENABLED'
                : 'REQUEST PERMISSION'}
            </button>
          </div>

          <div className="border border-black p-6 space-y-4">
            <h2 className="font-bold text-base uppercase tracking-wider">
              REMINDER OFFSET
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[0, 5, 10, 15].map((mins) => (
                <button
                  key={mins}
                  onClick={() => onUpdateSettings({ notifyMinutesBefore: mins })}
                  className={`py-2 px-3 text-xs font-mono font-bold uppercase border border-black ${
                    settings.notifyMinutesBefore === mins
                      ? 'bg-black text-white'
                      : 'bg-white text-black hover:bg-neutral-100'
                  }`}
                >
                  {mins === 0 ? 'AT TIME' : `${mins}M BEFORE`}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SubView: Export Data */}
      {activeSubView === 'export' && (
        <div className="space-y-6">
          <div className="border border-black p-6 space-y-3">
            <h2 className="font-bold text-base uppercase tracking-wider">
              EXPORT BACKUP
            </h2>
            <p className="text-xs font-mono text-neutral-500">
              DOWNLOAD ALL CONFIGURED SALAH ROUTINES AND HISTORICAL TICK LOGS AS JSON.
            </p>
            <button
              onClick={handleExportJSON}
              className="w-full border-2 border-black bg-black text-white py-3.5 px-4 font-mono font-bold text-xs uppercase tracking-widest hover:bg-neutral-900 flex items-center justify-center gap-2"
            >
              <Download size={16} strokeWidth={2.5} />
              <span>DOWNLOAD JSON BACKUP</span>
            </button>
          </div>

          <div className="border border-black p-6 space-y-3">
            <h2 className="font-bold text-base uppercase tracking-wider">
              IMPORT BACKUP
            </h2>
            <p className="text-xs font-mono text-neutral-500">
              RESTORE PREVIOUSLY EXPORTED SALAH DATA FROM A JSON FILE.
            </p>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-black bg-white text-black py-3.5 px-4 font-mono font-bold text-xs uppercase tracking-widest hover:bg-neutral-100 flex items-center justify-center gap-2"
            >
              <Upload size={16} strokeWidth={2.5} />
              <span>SELECT BACKUP FILE</span>
            </button>
          </div>
        </div>
      )}

      {/* SubView: Clear History */}
      {activeSubView === 'clear' && (
        <div className="space-y-6">
          <div className="border border-black p-6 space-y-3">
            <h2 className="font-bold text-base uppercase tracking-wider">
              RESET ALL LOGS
            </h2>
            <p className="text-xs font-mono text-neutral-500">
              CLEARS ALL HISTORICAL COMPLETION TICKS WHILE KEEPING CONFIGURED SALAH TIMES.
            </p>
            <button
              onClick={() => {
                if (confirm('ARE YOU SURE YOU WANT TO CLEAR ALL COMPLETION LOGS?')) {
                  onClearHistory();
                  showFeedback('ALL LOGS CLEARED');
                }
              }}
              className="w-full border-2 border-black bg-black text-white py-3.5 px-4 font-mono font-bold text-xs uppercase tracking-widest hover:bg-neutral-900"
            >
              CLEAR COMPLETION LOGS
            </button>
          </div>

          <div className="border border-neutral-300 p-6 space-y-3">
            <h2 className="font-bold text-base uppercase tracking-wider text-neutral-800">
              FACTORY RESET
            </h2>
            <p className="text-xs font-mono text-neutral-500">
              RESETS APP TO DEFAULT 5 PRAYERS AND PURGES ALL HISTORY AND SETTINGS.
            </p>
            <button
              onClick={() => {
                if (confirm('WARNING: THIS WILL RESET ALL PRAYERS AND DATA TO DEFAULTS. PROCEED?')) {
                  onResetAllData();
                  showFeedback('FACTORY RESET COMPLETE');
                }
              }}
              className="w-full border border-black bg-white text-black py-3.5 px-4 font-mono font-bold text-xs uppercase tracking-widest hover:bg-neutral-100"
            >
              RESET TO FACTORY DEFAULTS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
