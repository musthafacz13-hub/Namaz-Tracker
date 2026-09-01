/**
 * Salah Daily Streak & Consistency Engine
 * 
 * Derives daily streaks and overall consistency purely from existing `day_logs` state.
 * Uses native JavaScript calendar calculations respecting all leap years (2028, 2032, etc.)
 * and actual month lengths (28, 29, 30, 31).
 */

import { DayStatusRecord, StreakStats, MilestoneReward } from './types';
import { getDeviceTodayKey, formatToDateKey } from './calendar';

export const MILESTONE_DEFINITIONS: ReadonlyArray<{
  id: string;
  days: number;
  title: string;
  subtitle: string;
  description: string;
}> = [
  {
    id: '7_days',
    days: 7,
    title: '7 DAYS',
    subtitle: 'First Week',
    description: '7 consecutive days of 5 daily prayers completed.',
  },
  {
    id: '30_days',
    days: 30,
    title: '30 DAYS',
    subtitle: 'One Month',
    description: '30 consecutive days of 5 daily prayers completed.',
  },
  {
    id: '100_days',
    days: 100,
    title: '100 DAYS',
    subtitle: 'Century Mark',
    description: '100 consecutive days of 5 daily prayers completed.',
  },
  {
    id: '200_days',
    days: 200,
    title: '200 DAYS',
    subtitle: 'Steadfast Devotion',
    description: '200 consecutive days of 5 daily prayers completed.',
  },
  {
    id: '365_days',
    days: 365,
    title: '365 DAYS',
    subtitle: 'Yearly Mastery',
    description: '365 consecutive days of 5 daily prayers completed.',
  },
];

/**
 * Checks if a specific day record has all 5 prayers marked as 'prayed'
 */
export function isDayFullyCompleted(record?: DayStatusRecord | null): boolean {
  if (!record) return false;
  return (
    record.fajr === 'prayed' &&
    record.dhuhr === 'prayed' &&
    record.asr === 'prayed' &&
    record.maghrib === 'prayed' &&
    record.isha === 'prayed'
  );
}

/**
 * Returns previous date key (e.g. "2028-03-01" -> "2028-02-29")
 */
export function getPreviousDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return formatToDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Returns next date key (e.g. "2028-02-28" -> "2028-02-29")
 */
export function getNextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return formatToDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/**
 * Checks if a date has any user-recorded Salah activity (prayed or missed)
 */
export function isDayRecorded(record?: DayStatusRecord | null): boolean {
  if (!record) return false;
  return (
    record.fajr !== 'not_recorded' ||
    record.dhuhr !== 'not_recorded' ||
    record.asr !== 'not_recorded' ||
    record.maghrib !== 'not_recorded' ||
    record.isha !== 'not_recorded'
  );
}

/**
 * Pure calculation function deriving streak, best streak, and consistency from day_logs
 */
export function calculateStreakStats(
  dayLogs: Record<string, DayStatusRecord>,
  customTodayKey?: string
): StreakStats {
  const todayKey = customTodayKey || getDeviceTodayKey();

  // 1. Current Streak calculation:
  // Consecutive fully completed days ending at today or yesterday (if today is in progress)
  let currentStreak = 0;
  const isTodayComplete = isDayFullyCompleted(dayLogs[todayKey]);

  if (isTodayComplete) {
    currentStreak = 1;
    let prev = getPreviousDateKey(todayKey);
    while (prev >= '2026-01-01' && isDayFullyCompleted(dayLogs[prev])) {
      currentStreak++;
      prev = getPreviousDateKey(prev);
    }
  } else {
    // Today is in progress; check if yesterday was completed
    const yesterday = getPreviousDateKey(todayKey);
    if (isDayFullyCompleted(dayLogs[yesterday])) {
      currentStreak = 1;
      let prev = getPreviousDateKey(yesterday);
      while (prev >= '2026-01-01' && isDayFullyCompleted(dayLogs[prev])) {
        currentStreak++;
        prev = getPreviousDateKey(prev);
      }
    } else {
      currentStreak = 0;
    }
  }

  // 2. Best Streak calculation across all recorded history up to todayKey
  let bestStreak = currentStreak;
  const completedKeys = Object.keys(dayLogs)
    .filter((k) => k <= todayKey && isDayFullyCompleted(dayLogs[k]))
    .sort();

  if (completedKeys.length > 0) {
    const earliestDate = completedKeys[0];
    let running = 0;
    let maxFound = 0;
    let curr = earliestDate;

    while (curr <= todayKey) {
      if (isDayFullyCompleted(dayLogs[curr])) {
        running++;
        if (running > maxFound) {
          maxFound = running;
        }
      } else {
        running = 0;
      }
      curr = getNextDateKey(curr);
    }

    bestStreak = Math.max(maxFound, currentStreak);
  }

  // 3. Consistency calculation:
  // Proportion of fully completed days out of total user-recorded non-future days
  const recordedDates = Object.keys(dayLogs).filter((date) => {
    if (date > todayKey) return false;
    return isDayRecorded(dayLogs[date]);
  });

  const totalRecordedDays = recordedDates.length;
  let totalCompletedDays = 0;
  let totalPrayersPrayed = 0;

  recordedDates.forEach((date) => {
    const rec = dayLogs[date];
    if (isDayFullyCompleted(rec)) {
      totalCompletedDays++;
    }
    if (rec.fajr === 'prayed') totalPrayersPrayed++;
    if (rec.dhuhr === 'prayed') totalPrayersPrayed++;
    if (rec.asr === 'prayed') totalPrayersPrayed++;
    if (rec.maghrib === 'prayed') totalPrayersPrayed++;
    if (rec.isha === 'prayed') totalPrayersPrayed++;
  });

  const consistencyPercentage =
    totalRecordedDays > 0
      ? Math.round((totalCompletedDays / totalRecordedDays) * 100)
      : 0;

  const totalPossiblePrayers = totalRecordedDays * 5;

  // 4. Milestone rewards calculation based on highest achieved streak
  const qualifyingStreak = Math.max(bestStreak, currentStreak);
  const milestones: MilestoneReward[] = MILESTONE_DEFINITIONS.map((def) => {
    const isUnlocked = qualifyingStreak >= def.days;
    const currentDaysProgress = Math.min(def.days, qualifyingStreak);
    const progressPercent = Math.min(100, Math.round((qualifyingStreak / def.days) * 100));

    return {
      id: def.id,
      days: def.days,
      title: def.title,
      subtitle: def.subtitle,
      description: def.description,
      isUnlocked,
      progressPercent,
      currentDaysProgress,
    };
  });

  return {
    currentStreak,
    bestStreak,
    consistencyPercentage,
    totalCompletedDays,
    totalRecordedDays,
    totalPrayersPrayed,
    totalPossiblePrayers,
    milestones,
  };
}
