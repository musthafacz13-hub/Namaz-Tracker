export type DbPrayerStatus = 'PRAYED' | 'MISSED' | 'NOT_RECORDED';
export type SalahStatus = 'not_recorded' | 'prayed' | 'missed';
export type PrayerKey = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';

export interface SalahItem {
  id: string;
  name: string;
  arabicName?: string;
  time: string; // "05:15" 24h format or formatted
  period?: 'AM' | 'PM';
  order: number;
  createdAt: number;
  deletedAt?: number | null; // if in bin
}

export interface DayStatusRecord {
  fajr: SalahStatus;
  dhuhr: SalahStatus;
  asr: SalahStatus;
  maghrib: SalahStatus;
  isha: SalahStatus;
  prayed: string[];
  missed: string[];
}

export interface SupabaseDayLogRow {
  id?: string;
  user_id: string;
  date: string; // "YYYY-MM-DD"
  fajr: DbPrayerStatus;
  dhuhr: DbPrayerStatus;
  asr: DbPrayerStatus;
  maghrib: DbPrayerStatus;
  isha: DbPrayerStatus;
  created_at?: string;
  updated_at?: string;
}

export type DayLogsState = Record<string, DayStatusRecord>;

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  notifyMinutesBefore: number;
  timeFormat: '12h' | '24h';
  hasSeenIntro: boolean;
}

export type ScreenType = 'home' | 'consistency' | 'edit' | 'bin' | 'settings' | 'about' | 'loading';

export interface MilestoneReward {
  id: string;
  days: number;
  title: string;
  subtitle: string;
  description: string;
  isUnlocked: boolean;
  progressPercent: number;
  currentDaysProgress: number;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  consistencyPercentage: number;
  totalCompletedDays: number;
  totalRecordedDays: number;
  totalPrayersPrayed: number;
  totalPossiblePrayers: number;
  milestones: MilestoneReward[];
}
