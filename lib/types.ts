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

export type SalahStatus = 'not_recorded' | 'prayed' | 'missed';

export interface DayStatusRecord {
  prayed: string[];
  missed: string[];
}

export interface DayLog {
  dateKey: string; // "YYYY-MM-DD"
  completedSalahIds: string[]; // for backward compat
  prayedSalahIds?: string[];
  missedSalahIds?: string[];
  updatedAt: number;
}

export type DayLogsState = Record<string, DayStatusRecord | string[]>;

export interface AppSettings {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  notifyMinutesBefore: number;
  timeFormat: '12h' | '24h';
  hasSeenIntro: boolean;
}

export type ScreenType = 'home' | 'edit' | 'bin' | 'settings' | 'about' | 'loading';
