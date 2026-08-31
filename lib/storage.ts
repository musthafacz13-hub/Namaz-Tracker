import { SalahItem, DayLog, AppSettings, DayStatusRecord, SalahStatus } from './types';
import {
  getDaysInMonth,
  formatToDateKey,
  parseDateKey,
  getDeviceTodayKey,
} from './calendar';

const STORAGE_KEYS = {
  SALAH_ITEMS: 'salah_tracker_items_v2',
  DAY_LOGS: 'salah_tracker_logs_v2',
  SETTINGS: 'salah_tracker_settings_v2',
};

function getItemsKey(userId?: string): string {
  return userId ? `salah_tracker_items_${userId}` : STORAGE_KEYS.SALAH_ITEMS;
}

function getLogsKey(userId?: string): string {
  return userId ? `salah_tracker_logs_${userId}` : STORAGE_KEYS.DAY_LOGS;
}

function getSettingsKey(userId?: string): string {
  return userId ? `salah_tracker_settings_${userId}` : STORAGE_KEYS.SETTINGS;
}

export const DEFAULT_SALAH_ITEMS: SalahItem[] = [
  { id: 'fajr-default', name: 'Fajr', arabicName: 'الفجر', time: '', order: 1, createdAt: 1700000000000 },
  { id: 'dhuhr-default', name: 'Dhuhr', arabicName: 'الظهر', time: '', order: 2, createdAt: 1700000000001 },
  { id: 'asr-default', name: 'Asr', arabicName: 'العصر', time: '', order: 3, createdAt: 1700000000002 },
  { id: 'maghrib-default', name: 'Maghrib', arabicName: 'المغرب', time: '', order: 4, createdAt: 1700000000003 },
  { id: 'isha-default', name: 'Isha', arabicName: 'العشاء', time: '', order: 5, createdAt: 1700000000004 },
];

export const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  hapticsEnabled: true,
  notificationsEnabled: false,
  notifyMinutesBefore: 0,
  timeFormat: '12h',
  hasSeenIntro: false,
};

export function getTodayKey(): string {
  return getDeviceTodayKey();
}

export function formatDateDisplay(dateKey: string): {
  title: string;
  subtitle: string;
  dayOfWeek: string;
  formattedMonthDay: string;
} {
  const { year, month, day } = parseDateKey(dateKey);
  const date = new Date(year, month - 1, day);
  const todayKey = getTodayKey();

  let title = 'TODAY';
  if (dateKey === todayKey) {
    title = 'TODAY';
  } else {
    title = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
  }

  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

  const formattedMonthDay = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  }).toUpperCase();

  const subtitle = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).toUpperCase();

  return { title, subtitle, dayOfWeek, formattedMonthDay };
}

export function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}

export function formatTimeDisplay(timeStr: string, format: '12h' | '24h' = '12h'): string {
  if (!timeStr) return '';
  if (format === '24h') return timeStr;

  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  if (isNaN(h)) return timeStr;

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  const formattedH = String(h).padStart(2, '0');

  return `${formattedH}:${m} ${ampm}`;
}

export function loadSalahItems(userId?: string): SalahItem[] {
  if (typeof window === 'undefined') return DEFAULT_SALAH_ITEMS;
  try {
    const key = getItemsKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(DEFAULT_SALAH_ITEMS));
      return DEFAULT_SALAH_ITEMS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SALAH_ITEMS;
  }
}

export function saveSalahItems(items: SalahItem[], userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getItemsKey(userId), JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save items', err);
  }
}

export function parseDayRecord(raw: unknown): DayStatusRecord {
  if (!raw) return { prayed: [], missed: [] };
  if (Array.isArray(raw)) {
    return { prayed: raw, missed: [] };
  }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const prayed = Array.isArray(obj.prayed) ? (obj.prayed as string[]) : [];
    const missed = Array.isArray(obj.missed) ? (obj.missed as string[]) : [];
    return { prayed, missed };
  }
  return { prayed: [], missed: [] };
}

export function loadDayLogs(userId?: string): Record<string, DayStatusRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(getLogsKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const result: Record<string, DayStatusRecord> = {};
    for (const key of Object.keys(parsed)) {
      result[key] = parseDayRecord(parsed[key]);
    }
    return result;
  } catch {
    return {};
  }
}

export function saveDayLog(dateKey: string, status: DayStatusRecord | string[], userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadDayLogs(userId);
    const normalized = parseDayRecord(status);
    current[dateKey] = normalized;
    localStorage.setItem(getLogsKey(userId), JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save day log', err);
  }
}

export function saveAllDayLogs(logs: Record<string, DayStatusRecord>, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getLogsKey(userId), JSON.stringify(logs));
  } catch (err) {
    console.error('Failed to save all day logs', err);
  }
}

export function getSalahStatusForDay(
  dayLogs: Record<string, DayStatusRecord | string[]>,
  dateKey: string,
  salahId: string
): SalahStatus {
  const dayRec = parseDayRecord(dayLogs[dateKey]);
  if (dayRec.prayed.includes(salahId)) return 'prayed';
  if (dayRec.missed.includes(salahId)) return 'missed';
  return 'not_recorded';
}

export function getNextSalahStatus(current: SalahStatus): SalahStatus {
  if (current === 'not_recorded') return 'prayed';
  if (current === 'prayed') return 'missed';
  return 'not_recorded';
}

export function loadSettings(userId?: string): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(getSettingsKey(userId));
    if (!raw) {
      localStorage.setItem(getSettingsKey(userId), JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getSettingsKey(userId), JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function clearAllHistory(userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getLogsKey(userId));
  } catch (err) {
    console.error('Failed to clear history', err);
  }
}

export function resetToDefaults(userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getItemsKey(userId), JSON.stringify(DEFAULT_SALAH_ITEMS));
    localStorage.setItem(getSettingsKey(userId), JSON.stringify(DEFAULT_SETTINGS));
    localStorage.removeItem(getLogsKey(userId));
  } catch (err) {
    console.error('Failed to reset defaults', err);
  }
}

export function exportAllData(): string {
  if (typeof window === 'undefined') return '{}';
  const data = {
    salahItems: loadSalahItems(),
    dayLogs: loadDayLogs(),
    settings: loadSettings(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const data = JSON.parse(jsonString);
    if (data.salahItems && Array.isArray(data.salahItems)) {
      saveSalahItems(data.salahItems);
    }
    if (data.dayLogs && typeof data.dayLogs === 'object') {
      localStorage.setItem(STORAGE_KEYS.DAY_LOGS, JSON.stringify(data.dayLogs));
    }
    if (data.settings && typeof data.settings === 'object') {
      saveSettings(data.settings);
    }
    return true;
  } catch (err) {
    console.error('Failed to import data', err);
    return false;
  }
}
