'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { SalahItem, AppSettings, ScreenType, DayStatusRecord, SalahStatus } from '@/lib/types';
import {
  loadSalahItems,
  saveSalahItems,
  loadDayLogs,
  saveDayLog,
  loadSettings,
  saveSettings,
  getTodayKey,
  clearAllHistory,
  resetToDefaults,
  parseDayRecord,
  getSalahStatusForDay,
  getNextSalahStatus,
  DEFAULT_SALAH_ITEMS,
  DEFAULT_SETTINGS,
} from '@/lib/storage';
import LoadingScreen from '@/components/LoadingScreen';
import HomeScreen from '@/components/HomeScreen';
import EditScreen from '@/components/EditScreen';
import BinScreen from '@/components/BinScreen';
import SettingsScreen from '@/components/SettingsScreen';
import AboutScreen from '@/components/AboutScreen';
import BottomNav from '@/components/BottomNav';

export default function Page() {
  const [salahItems, setSalahItems] = useState<SalahItem[]>(() => loadSalahItems());
  const [dayLogs, setDayLogs] = useState<Record<string, DayStatusRecord>>(() => loadDayLogs());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [currentDateKey, setCurrentDateKey] = useState<string>(() => getTodayKey());
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');

  // Sync state changes with storage
  const handleUpdateSalahItems = (newItems: SalahItem[]) => {
    setSalahItems(newItems);
    saveSalahItems(newItems);
  };

  const handleSetSalahStatus = useCallback(
    (id: string, newStatus: SalahStatus, dateKey: string = currentDateKey) => {
      const currentRec = parseDayRecord(dayLogs[dateKey]);
      const newPrayed = currentRec.prayed.filter((itemId) => itemId !== id);
      const newMissed = currentRec.missed.filter((itemId) => itemId !== id);

      if (newStatus === 'prayed') {
        newPrayed.push(id);
      } else if (newStatus === 'missed') {
        newMissed.push(id);
      }

      const updatedRec: DayStatusRecord = { prayed: newPrayed, missed: newMissed };
      const newLogs = { ...dayLogs, [dateKey]: updatedRec };
      setDayLogs(newLogs);
      saveDayLog(dateKey, updatedRec);
    },
    [currentDateKey, dayLogs]
  );

  const handleCycleSalahStatus = useCallback(
    (id: string, dateKey: string = currentDateKey) => {
      const currentStatus = getSalahStatusForDay(dayLogs, dateKey, id);
      const next = getNextSalahStatus(currentStatus);
      handleSetSalahStatus(id, next, dateKey);
      return next;
    },
    [dayLogs, currentDateKey, handleSetSalahStatus]
  );

  const handleSelectDate = (dateKey: string) => {
    setCurrentDateKey(dateKey);
  };

  const handleChangeDate = (delta: number) => {
    const [year, month, day] = currentDateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + delta);
    const newY = date.getFullYear();
    const newM = String(date.getMonth() + 1).padStart(2, '0');
    const newD = String(date.getDate()).padStart(2, '0');
    setCurrentDateKey(`${newY}-${newM}-${newD}`);
  };

  const handleResetDate = () => {
    setCurrentDateKey(getTodayKey());
  };

  // Salah CRUD
  const handleAddSalah = (name: string, time: string, arabicName?: string) => {
    const maxOrder = salahItems.reduce((max, item) => Math.max(max, item.order), 0);
    const newItem: SalahItem = {
      id: `salah-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      arabicName,
      time,
      order: maxOrder + 1,
      createdAt: Date.now(),
      deletedAt: null,
    };
    handleUpdateSalahItems([...salahItems, newItem]);
  };

  const handleUpdateSalah = (id: string, updates: Partial<SalahItem>) => {
    const updated = salahItems.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    handleUpdateSalahItems(updated);
  };

  const handleDeleteSalah = (id: string) => {
    // Soft delete -> move to Bin
    const updated = salahItems.map((item) =>
      item.id === id ? { ...item, deletedAt: Date.now() } : item
    );
    handleUpdateSalahItems(updated);
  };

  const handleRestoreSalah = (id: string) => {
    const updated = salahItems.map((item) =>
      item.id === id ? { ...item, deletedAt: null } : item
    );
    handleUpdateSalahItems(updated);
  };

  const handlePermanentDeleteSalah = (id: string) => {
    const updated = salahItems.filter((item) => item.id !== id);
    handleUpdateSalahItems(updated);
  };

  const handleEmptyBin = () => {
    const updated = salahItems.filter((item) => !item.deletedAt);
    handleUpdateSalahItems(updated);
  };

  const handleReorderSalah = (id: string, direction: 'up' | 'down') => {
    const active = salahItems.filter((i) => !i.deletedAt).sort((a, b) => a.order - b.order);
    const index = active.findIndex((i) => i.id === id);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const prev = active[index - 1];
      const curr = active[index];
      const prevOrder = prev.order;
      prev.order = curr.order;
      curr.order = prevOrder;
    } else if (direction === 'down' && index < active.length - 1) {
      const next = active[index + 1];
      const curr = active[index];
      const nextOrder = next.order;
      next.order = curr.order;
      curr.order = nextOrder;
    }

    handleUpdateSalahItems([...salahItems]);
  };

  const handleUpdateSettings = (updates: Partial<AppSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleClearHistory = () => {
    clearAllHistory();
    setDayLogs({});
  };

  const handleResetAllData = () => {
    resetToDefaults();
    setSalahItems(DEFAULT_SALAH_ITEMS);
    setDayLogs({});
    setSettings(DEFAULT_SETTINGS);
  };

  // Notification watcher
  useEffect(() => {
    if (!settings.notificationsEnabled || typeof window === 'undefined') return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, '0');
      const currentM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentH}:${currentM}`;

      const active = salahItems.filter((i) => !i.deletedAt);
      for (const item of active) {
        if (item.time === currentTimeStr && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification(`Salah Tracker: ${item.name}`, {
              body: `Time for ${item.name} prayer. Focus & consistency.`,
              icon: '/favicon.ico',
            });
          } catch {
            // ignore
          }
        }
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [settings.notificationsEnabled, salahItems]);

  const activeDayRec = parseDayRecord(dayLogs[currentDateKey]);
  const activeCompletedIds = activeDayRec.prayed;
  const binCount = salahItems.filter((i) => Boolean(i.deletedAt)).length;

  return (
    <main className="min-h-screen bg-white text-black flex flex-col font-sans">
      <AnimatePresence mode="wait">
        {currentScreen === 'loading' && (
          <LoadingScreen
            key="loading-screen"
            onDismiss={() => {
              setCurrentScreen('home');
              if (!settings.hasSeenIntro) {
                handleUpdateSettings({ hasSeenIntro: true });
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* Screens Render */}
      {currentScreen === 'home' && (
        <HomeScreen
          salahItems={salahItems}
          completedIds={activeCompletedIds}
          dayLogs={dayLogs}
          currentDateKey={currentDateKey}
          onSetSalahStatus={handleSetSalahStatus}
          onCycleSalahStatus={handleCycleSalahStatus}
          onSelectDate={handleSelectDate}
          onChangeDate={handleChangeDate}
          onResetDate={handleResetDate}
          onNavigateToEdit={() => setCurrentScreen('edit')}
          soundEnabled={settings.soundEnabled}
          hapticsEnabled={settings.hapticsEnabled}
          timeFormat={settings.timeFormat}
        />
      )}

      {currentScreen === 'edit' && (
        <EditScreen
          salahItems={salahItems}
          onAddSalah={handleAddSalah}
          onUpdateSalah={handleUpdateSalah}
          onDeleteSalah={handleDeleteSalah}
          onReorderSalah={handleReorderSalah}
          timeFormat={settings.timeFormat}
        />
      )}

      {currentScreen === 'bin' && (
        <BinScreen
          salahItems={salahItems}
          onRestoreSalah={handleRestoreSalah}
          onPermanentDeleteSalah={handlePermanentDeleteSalah}
          onEmptyBin={handleEmptyBin}
          timeFormat={settings.timeFormat}
        />
      )}

      {currentScreen === 'settings' && (
        <SettingsScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onClearHistory={handleClearHistory}
          onResetAllData={handleResetAllData}
          onReplayIntro={() => setCurrentScreen('loading')}
          onNavigateToAbout={() => setCurrentScreen('about')}
        />
      )}

      {currentScreen === 'about' && (
        <AboutScreen onBack={() => setCurrentScreen('settings')} />
      )}

      {/* Fixed Bottom Navigation (visible except during loading animation) */}
      {currentScreen !== 'loading' && (
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen)}
          binCount={binCount}
        />
      )}
    </main>
  );
}
