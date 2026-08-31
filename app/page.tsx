'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';
import { SalahItem, AppSettings, ScreenType, DayStatusRecord, SalahStatus } from '@/lib/types';
import {
  loadSalahItems,
  saveSalahItems,
  loadDayLogs,
  saveDayLog,
  saveAllDayLogs,
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
import {
  CALENDAR_MIN_YEAR,
  CALENDAR_MAX_YEAR,
  parseDateKey,
  formatToDateKey,
} from '@/lib/calendar';
import {
  fetchRemoteSalahItems,
  syncRemoteSalahItems,
  fetchRemoteDayLogs,
  syncRemoteDayLog,
  isSupabaseConfigured,
  getCurrentSessionUser,
  subscribeToAuthChanges,
  signOutUser,
} from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';
import HomeScreen from '@/components/HomeScreen';
import EditScreen from '@/components/EditScreen';
import BinScreen from '@/components/BinScreen';
import SettingsScreen from '@/components/SettingsScreen';
import AboutScreen from '@/components/AboutScreen';
import AuthScreen from '@/components/AuthScreen';
import BottomNav from '@/components/BottomNav';

export default function Page() {
  const [salahItems, setSalahItems] = useState<SalahItem[]>(() => loadSalahItems());
  const [dayLogs, setDayLogs] = useState<Record<string, DayStatusRecord>>(() => loadDayLogs());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [currentDateKey, setCurrentDateKey] = useState<string>(() => getTodayKey());
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(() => !isSupabaseConfigured());

  // Initialize auth session and listen for auth state changes without duplicate calls
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (isMounted) {
        setCurrentUser(user);
        setAuthInitialized(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Hydrate from Supabase on initial load or user change if configured
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUser) return;

    let isMounted = true;
    async function hydrateCloudData() {
      try {
        const [remoteItems, remoteLogs] = await Promise.all([
          fetchRemoteSalahItems(),
          fetchRemoteDayLogs(),
        ]);

        if (isMounted) {
          if (remoteItems.data && remoteItems.data.length > 0) {
            setSalahItems(remoteItems.data);
            saveSalahItems(remoteItems.data, currentUser.id);
          } else {
            // New user account with no items yet in cloud: initialize defaults and sync
            const initialItems = DEFAULT_SALAH_ITEMS;
            setSalahItems(initialItems);
            saveSalahItems(initialItems, currentUser.id);
            syncRemoteSalahItems(initialItems).catch(() => {});
          }

          if (remoteLogs.data && Object.keys(remoteLogs.data).length > 0) {
            setDayLogs(remoteLogs.data);
            saveAllDayLogs(remoteLogs.data, currentUser.id);
          } else {
            // New user account has no logs yet: start with completely clean isolated logs
            setDayLogs({});
            saveAllDayLogs({}, currentUser.id);
          }
        }
      } catch (err) {
        console.warn('Silent fallback to local storage:', err);
      }
    }

    hydrateCloudData();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setSalahItems(DEFAULT_SALAH_ITEMS);
    setDayLogs({});
    setCurrentScreen('home');
  };

  // Sync state changes with storage and cloud
  const handleUpdateSalahItems = (newItems: SalahItem[]) => {
    setSalahItems(newItems);
    saveSalahItems(newItems, currentUser?.id);
    if (isSupabaseConfigured() && currentUser) {
      syncRemoteSalahItems(newItems).catch(() => {});
    }
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
      saveDayLog(dateKey, updatedRec, currentUser?.id);
      if (isSupabaseConfigured() && currentUser) {
        syncRemoteDayLog(dateKey, updatedRec).catch(() => {});
      }
    },
    [currentDateKey, dayLogs, currentUser]
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
    const { year, month, day } = parseDateKey(currentDateKey);
    const date = new Date(year, month - 1, day);
    date.setDate(date.getDate() + delta);
    let newY = date.getFullYear();
    let newM = date.getMonth() + 1;
    let newD = date.getDate();

    // Clamp within 2026-01-01 and 2045-12-31 bounds
    if (newY < CALENDAR_MIN_YEAR) {
      newY = CALENDAR_MIN_YEAR;
      newM = 1;
      newD = 1;
    } else if (newY > CALENDAR_MAX_YEAR) {
      newY = CALENDAR_MAX_YEAR;
      newM = 12;
      newD = 31;
    }
    setCurrentDateKey(formatToDateKey(newY, newM, newD));
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
    saveSettings(newSettings, currentUser?.id);
  };

  const handleClearHistory = () => {
    clearAllHistory(currentUser?.id);
    setDayLogs({});
  };

  const handleResetAllData = () => {
    resetToDefaults(currentUser?.id);
    setSalahItems(DEFAULT_SALAH_ITEMS);
    setDayLogs({});
    setSettings(DEFAULT_SETTINGS);
    if (isSupabaseConfigured() && currentUser) {
      syncRemoteSalahItems(DEFAULT_SALAH_ITEMS).catch(() => {});
    }
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

  // 1. Initial Session Check Loading (Prevents flickering)
  if (!authInitialized) {
    return (
      <main className="min-h-screen bg-white text-black flex flex-col items-center justify-center font-sans">
        <span className="text-xs font-mono font-bold tracking-[0.25em] text-neutral-400 uppercase animate-pulse">
          Salah
        </span>
      </main>
    );
  }

  // 2. Unauthenticated Gate: Show Authentication Page as the First Screen
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-white text-black font-sans">
        <AuthScreen
          onSuccess={(user) => {
            setCurrentUser(user);
            setCurrentScreen('home');
          }}
        />
      </main>
    );
  }

  // 3. Authenticated Application Experience
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
          currentUser={currentUser}
          onSignOut={handleSignOut}
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

      {/* Fixed Bottom Navigation (visible on authenticated main app screens) */}
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
