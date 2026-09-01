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
  normalizePrayerKey,
  addPendingSyncDate,
  removePendingSyncDate,
  getPendingSyncDates,
  DEFAULT_SALAH_ITEMS,
  DEFAULT_SETTINGS,
} from '@/lib/storage';
import {
  CALENDAR_MIN_YEAR,
  CALENDAR_MAX_YEAR,
  parseDateKey,
  formatToDateKey,
} from '@/lib/calendar';
import { calculateStreakStats } from '@/lib/streak';
import {
  fetchRemoteDayLogs,
  syncRemoteDayLog,
  flushPendingDayLogs,
  isSupabaseConfigured,
  subscribeToAuthChanges,
  getCurrentSessionUser,
  signOutUser,
} from '@/lib/supabase';
import LoadingScreen from '@/components/LoadingScreen';
import HomeScreen from '@/components/HomeScreen';
import ConsistencyScreen from '@/components/ConsistencyScreen';
import EditScreen from '@/components/EditScreen';
import BinScreen from '@/components/BinScreen';
import SettingsScreen from '@/components/SettingsScreen';
import AboutScreen from '@/components/AboutScreen';
import AuthScreen from '@/components/AuthScreen';
import BottomNav from '@/components/BottomNav';

export default function Page() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(() => !isSupabaseConfigured());
  const [salahItems, setSalahItems] = useState<SalahItem[]>(() => loadSalahItems());
  const [dayLogs, setDayLogs] = useState<Record<string, DayStatusRecord>>({});
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [currentDateKey, setCurrentDateKey] = useState<string>(() => getTodayKey());
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');

  // 1. Service Worker Registration for PWA & Background Support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Check for SW updates
          reg.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('Service worker registration ignored:', err);
        });
    }
  }, []);

  // 2. Dynamic Timezone and Midnight Transition Watcher
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let lastKnownToday = getTodayKey();

    const checkDateTransition = () => {
      const currentToday = getTodayKey();
      if (currentToday !== lastKnownToday) {
        // Device crossed midnight or timezone changed
        setCurrentDateKey((prev) => (prev === lastKnownToday ? currentToday : prev));
        lastKnownToday = currentToday;
      }
    };

    const interval = setInterval(checkDateTransition, 30000);
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkDateTransition();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, []);

  // 3. Online Sync Handler (Flushes pending offline queue on reconnect)
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;

    const handleOnline = async () => {
      try {
        await flushPendingDayLogs(currentUser.id);
        const remote = await fetchRemoteDayLogs();
        if (remote.data) {
          const pending = getPendingSyncDates(currentUser.id);
          setDayLogs((prev) => {
            const merged = { ...prev };
            Object.entries(remote.data!).forEach(([date, rec]) => {
              if (!pending.includes(date)) {
                merged[date] = rec;
              }
            });
            saveAllDayLogs(merged, currentUser.id);
            return merged;
          });
        }
      } catch (err) {
        console.warn('Offline sync flush failed:', err);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [currentUser]);

  // 4. Initialize auth session and listen for auth state changes without duplicate calls
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    let isMounted = true;

    // Check for existing valid session on startup
    getCurrentSessionUser().then((user) => {
      if (isMounted) {
        if (user) {
          setCurrentUser(user);
        }
        setAuthInitialized(true);
      }
    });

    const unsubscribe = subscribeToAuthChanges((user) => {
      if (isMounted) {
        // If logged out or session terminated, lock app immediately
        if (!user) {
          setCurrentUser(null);
        } else {
          setCurrentUser(user);
        }
        setAuthInitialized(true);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // 5. Hydrate from Supabase on initial load or user change
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentUser) return;

    let isMounted = true;
    const userId = currentUser.id;

    async function hydrateCloudData() {
      // Load local user-scoped cache immediately to prevent blank flash
      const localCached = loadDayLogs(userId);
      if (isMounted) {
        setDayLogs(localCached);
        setSalahItems(loadSalahItems(userId));
        setSettings(loadSettings(userId));
      }

      try {
        // Flush any pending unsynced offline records first
        await flushPendingDayLogs(userId);

        const remoteLogs = await fetchRemoteDayLogs();

        if (isMounted) {
          const pending = getPendingSyncDates(userId);
          if (remoteLogs.data && Object.keys(remoteLogs.data).length > 0) {
            // Merge remote with local, preserving any un-synced pending items
            const merged: Record<string, DayStatusRecord> = { ...remoteLogs.data };
            pending.forEach((pendingDate) => {
              if (localCached[pendingDate]) {
                merged[pendingDate] = localCached[pendingDate];
              }
            });

            setDayLogs(merged);
            saveAllDayLogs(merged, userId);
          } else if (Object.keys(localCached).length === 0) {
            // New user account has no logs yet: start with clean isolated logs
            setDayLogs({});
            saveAllDayLogs({}, userId);
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
  };

  const handleSetSalahStatus = useCallback(
    async (id: string, newStatus: SalahStatus, dateKey: string = currentDateKey) => {
      const pKey = normalizePrayerKey(id);
      if (!pKey) return;

      const currentRec = parseDayRecord(dayLogs[dateKey]);
      const updatedRec: DayStatusRecord = {
        ...currentRec,
        [pKey]: newStatus,
        prayed: currentRec.prayed.filter((k) => k !== pKey),
        missed: currentRec.missed.filter((k) => k !== pKey),
      };

      if (newStatus === 'prayed') {
        updatedRec.prayed.push(pKey);
      } else if (newStatus === 'missed') {
        updatedRec.missed.push(pKey);
      }

      const newLogs = { ...dayLogs, [dateKey]: updatedRec };
      setDayLogs(newLogs);
      saveDayLog(dateKey, updatedRec, currentUser?.id);

      // Track in offline pending queue
      if (currentUser?.id) {
        addPendingSyncDate(dateKey, currentUser.id);
      }

      // Perform optimistic remote sync
      if (isSupabaseConfigured() && currentUser?.id) {
        try {
          const res = await syncRemoteDayLog(dateKey, updatedRec);
          if (res.success) {
            removePendingSyncDate(dateKey, currentUser.id);
          }
        } catch {
          // Kept safely in pending queue for background sync
        }
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
  };

  // Notification watcher (supports Service Worker & Web Notifications)
  useEffect(() => {
    if (!settings.notificationsEnabled || typeof window === 'undefined') return;

    const interval = setInterval(async () => {
      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, '0');
      const currentM = String(now.getMinutes()).padStart(2, '0');
      const currentTimeStr = `${currentH}:${currentM}`;

      const active = salahItems.filter((i) => !i.deletedAt);
      for (const item of active) {
        if (item.time === currentTimeStr && 'Notification' in window && Notification.permission === 'granted') {
          try {
            if ('serviceWorker' in navigator) {
              const reg = await navigator.serviceWorker.getRegistration();
              if (reg && 'showNotification' in reg) {
                reg.showNotification(`Salah Tracker: ${item.name}`, {
                  body: `Time for ${item.name} prayer. Focus & consistency.`,
                  icon: '/icon.svg',
                  badge: '/icon.svg',
                  tag: `salah-${item.id}-${currentTimeStr}`,
                });
                continue;
              }
            }
            new Notification(`Salah Tracker: ${item.name}`, {
              body: `Time for ${item.name} prayer. Focus & consistency.`,
              icon: '/icon.svg',
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
  const streakStats = calculateStreakStats(dayLogs);

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
          onViewConsistency={() => setCurrentScreen('consistency')}
          soundEnabled={settings.soundEnabled}
          hapticsEnabled={settings.hapticsEnabled}
          timeFormat={settings.timeFormat}
        />
      )}

      {currentScreen === 'consistency' && (
        <ConsistencyScreen
          stats={streakStats}
          onBack={() => setCurrentScreen('home')}
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
