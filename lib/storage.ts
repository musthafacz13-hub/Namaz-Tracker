import {
  SalahItem,
  AppSettings,
  DayStatusRecord,
  SalahStatus,
  PrayerKey,
  DbPrayerStatus,
} from './types';
import {
  parseDateKey,
  getDeviceTodayKey,
} from './calendar';

export const PRAYER_KEYS: PrayerKey[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

const STORAGE_KEYS = {
  SALAH_ITEMS: 'salah_tracker_items_v3',
  DAY_LOGS: 'salah_tracker_logs_v3',
  SETTINGS: 'salah_tracker_settings_v3',
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
  { id: 'fajr', name: 'Fajr', arabicName: 'الفجر', time: '', order: 1, createdAt: 1700000000000 },
  { id: 'dhuhr', name: 'Dhuhr', arabicName: 'الظهر', time: '', order: 2, createdAt: 1700000000001 },
  { id: 'asr', name: 'Asr', arabicName: 'العصر', time: '', order: 3, createdAt: 1700000000002 },
  { id: 'maghrib', name: 'Maghrib', arabicName: 'المغرب', time: '', order: 4, createdAt: 1700000000003 },
  { id: 'isha', name: 'Isha', arabicName: 'العشاء', time: '', order: 5, createdAt: 1700000000004 },
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

export function normalizePrayerKey(id: string): PrayerKey | null {
  if (!id) return null;
  const lower = id.toLowerCase().replace(/[-_](default|\d+)$/i, '').trim();
  if (lower === 'fajr') return 'fajr';
  if (lower === 'dhuhr' || lower === 'zuhr' || lower === 'duhr') return 'dhuhr';
  if (lower === 'asr') return 'asr';
  if (lower === 'maghrib' || lower === 'magrib') return 'maghrib';
  if (lower === 'isha' || lower === 'ishaa') return 'isha';
  return null;
}

export function toDbPrayerStatus(status: SalahStatus | undefined): DbPrayerStatus {
  if (status === 'prayed') return 'PRAYED';
  if (status === 'missed') return 'MISSED';
  return 'NOT_RECORDED';
}

export function fromDbPrayerStatus(status: DbPrayerStatus | string | undefined): SalahStatus {
  if (!status) return 'not_recorded';
  const upper = String(status).toUpperCase();
  if (upper === 'PRAYED') return 'prayed';
  if (upper === 'MISSED') return 'missed';
  return 'not_recorded';
}

export function createEmptyDayRecord(): DayStatusRecord {
  return {
    fajr: 'not_recorded',
    dhuhr: 'not_recorded',
    asr: 'not_recorded',
    maghrib: 'not_recorded',
    isha: 'not_recorded',
    prayed: [],
    missed: [],
  };
}

export function parseDayRecord(raw: unknown): DayStatusRecord {
  const record: DayStatusRecord = createEmptyDayRecord();
  if (!raw || typeof raw !== 'object') return record;

  const obj = raw as Record<string, unknown>;

  for (const key of PRAYER_KEYS) {
    if (key in obj && typeof obj[key] === 'string') {
      record[key] = fromDbPrayerStatus(obj[key] as string);
    }
  }

  // Handle legacy array format or legacy { prayed: [...], missed: [...] }
  if (Array.isArray(obj.prayed)) {
    for (const item of obj.prayed) {
      const pKey = normalizePrayerKey(String(item));
      if (pKey) record[pKey] = 'prayed';
    }
  }
  if (Array.isArray(obj.missed)) {
    for (const item of obj.missed) {
      const pKey = normalizePrayerKey(String(item));
      if (pKey) record[pKey] = 'missed';
    }
  }

  // Populate computed arrays
  record.prayed = PRAYER_KEYS.filter((k) => record[k] === 'prayed');
  record.missed = PRAYER_KEYS.filter((k) => record[k] === 'missed');

  return record;
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
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return DEFAULT_SALAH_ITEMS;
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

export function saveDayLog(
  dateKey: string,
  status: DayStatusRecord | Record<string, unknown>,
  userId?: string
): void {
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
  dayLogs: Record<string, DayStatusRecord | unknown>,
  dateKey: string,
  salahId: string
): SalahStatus {
  const dayRec = parseDayRecord(dayLogs[dateKey]);
  const pKey = normalizePrayerKey(salahId);
  if (pKey) {
    return dayRec[pKey];
  }
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
    clearPendingSyncDates(userId);
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
    clearPendingSyncDates(userId);
  } catch (err) {
    console.error('Failed to reset defaults', err);
  }
}

function getPendingKey(userId?: string): string {
  return userId ? `salah_tracker_pending_${userId}` : 'salah_tracker_pending_v3';
}

export function getPendingSyncDates(userId?: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getPendingKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addPendingSyncDate(dateKey: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getPendingSyncDates(userId);
    if (!current.includes(dateKey)) {
      current.push(dateKey);
      localStorage.setItem(getPendingKey(userId), JSON.stringify(current));
    }
  } catch (err) {
    console.error('Failed to add pending sync date', err);
  }
}

export function removePendingSyncDate(dateKey: string, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getPendingSyncDates(userId).filter((d) => d !== dateKey);
    localStorage.setItem(getPendingKey(userId), JSON.stringify(current));
  } catch (err) {
    console.error('Failed to remove pending sync date', err);
  }
}

export function clearPendingSyncDates(userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(getPendingKey(userId));
  } catch (err) {
    console.error('Failed to clear pending sync dates', err);
  }
}

export function exportAllData(userId?: string): string {
  if (typeof window === 'undefined') return '{}';
  const data = {
    salahItems: loadSalahItems(userId),
    dayLogs: loadDayLogs(userId),
    settings: loadSettings(userId),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function importData(jsonString: string, userId?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const data = JSON.parse(jsonString);
    if (data.salahItems && Array.isArray(data.salahItems)) {
      saveSalahItems(data.salahItems, userId);
    }
    if (data.dayLogs && typeof data.dayLogs === 'object') {
      saveAllDayLogs(data.dayLogs, userId);
    }
    if (data.settings && typeof data.settings === 'object') {
      saveSettings(data.settings, userId);
    }
    return true;
  } catch (err) {
    console.error('Failed to import data', err);
    return false;
  }
}
