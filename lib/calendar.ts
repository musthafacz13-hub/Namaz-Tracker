/**
 * Deterministic Gregorian Calendar Engine (2026 – 2045)
 * Pure, lightweight, mathematical calendar generation without external dependencies.
 */

export const CALENDAR_MIN_YEAR = 2026;
export const CALENDAR_MAX_YEAR = 2045;

export interface CalendarDayInfo {
  year: number;
  month: number; // 1 - 12
  day: number; // 1 - 31
  weekday: string; // "Sunday", "Monday", ...
  weekdayShort: string; // "SUN", "MON", ...
  weekdayIndex: number; // 0 = Sun, 1 = Mon ... 6 = Sat
  dateKey: string; // "YYYY-MM-DD"
  isToday: boolean;
}

export interface MonthCalendarData {
  year: number;
  month: number; // 1 - 12
  monthName: string; // "AUGUST"
  monthYearDisplay: string; // "AUGUST 2026"
  daysInMonth: number;
  days: CalendarDayInfo[];
  canGoPrev: boolean;
  canGoNext: boolean;
}

/**
 * Checks if a given year is a Gregorian leap year.
 * Rule: Divisible by 4, except if divisible by 100 unless also divisible by 400.
 */
export function isLeapYear(year: number): boolean {
  if (year % 400 === 0) return true;
  if (year % 100 === 0) return false;
  return year % 4 === 0;
}

/**
 * Returns exact days in a given month.
 * January: 31, February: 28 or 29, March: 31, April: 30, May: 31, June: 30,
 * July: 31, August: 31, September: 30, October: 31, November: 30, December: 31.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
  }

  // February
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  // April, June, September, November = 30
  if (month === 4 || month === 6 || month === 9 || month === 11) {
    return 30;
  }

  // Jan, Mar, May, Jul, Aug, Oct, Dec = 31
  return 31;
}

const MONTH_NAMES = [
  'JANUARY',
  'FEBRUARY',
  'MARCH',
  'APRIL',
  'MAY',
  'JUNE',
  'JULY',
  'AUGUST',
  'SEPTEMBER',
  'OCTOBER',
  'NOVEMBER',
  'DECEMBER',
];

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const WEEKDAY_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * Formats components into an ISO date key: "YYYY-MM-DD"
 */
export function formatToDateKey(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Parses a dateKey "YYYY-MM-DD" into { year, month, day }
 */
export function parseDateKey(dateKey: string): { year: number; month: number; day: number } {
  const [y, m, d] = dateKey.split('-').map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Get device's current real-time today key clamped within 2026-2045 range
 */
export function getDeviceTodayKey(): string {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  let d = now.getDate();

  if (y < CALENDAR_MIN_YEAR) {
    y = CALENDAR_MIN_YEAR;
    m = 1;
    d = 1;
  } else if (y > CALENDAR_MAX_YEAR) {
    y = CALENDAR_MAX_YEAR;
    m = 12;
    d = 31;
  }

  // Clamp day to month
  const maxD = getDaysInMonth(y, m);
  if (d > maxD) d = maxD;

  return formatToDateKey(y, m, d);
}

/**
 * Generates the full day list for a specific year and month.
 */
export function generateMonthCalendar(year: number, month: number): MonthCalendarData {
  // Clamp year within 2026 - 2045
  const clampedYear = Math.max(CALENDAR_MIN_YEAR, Math.min(CALENDAR_MAX_YEAR, year));
  const clampedMonth = Math.max(1, Math.min(12, month));
  const numDays = getDaysInMonth(clampedYear, clampedMonth);
  const todayKey = getDeviceTodayKey();

  const days: CalendarDayInfo[] = [];

  for (let day = 1; day <= numDays; day++) {
    // JavaScript Date: month is 0-indexed
    const jsDate = new Date(clampedYear, clampedMonth - 1, day);
    const dayOfWeek = jsDate.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

    const dateKey = formatToDateKey(clampedYear, clampedMonth, day);

    days.push({
      year: clampedYear,
      month: clampedMonth,
      day,
      weekday: WEEKDAY_NAMES[dayOfWeek],
      weekdayShort: WEEKDAY_SHORT[dayOfWeek],
      weekdayIndex: dayOfWeek,
      dateKey,
      isToday: dateKey === todayKey,
    });
  }

  const canGoPrev = !(clampedYear === CALENDAR_MIN_YEAR && clampedMonth === 1);
  const canGoNext = !(clampedYear === CALENDAR_MAX_YEAR && clampedMonth === 12);

  return {
    year: clampedYear,
    month: clampedMonth,
    monthName: MONTH_NAMES[clampedMonth - 1],
    monthYearDisplay: `${MONTH_NAMES[clampedMonth - 1]} ${clampedYear}`,
    daysInMonth: numDays,
    days,
    canGoPrev,
    canGoNext,
  };
}

/**
 * Returns previous month { year, month } within 2026-2045 bounds, or null if at beginning
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } | null {
  if (year === CALENDAR_MIN_YEAR && month === 1) return null;
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Returns next month { year, month } within 2026-2045 bounds, or null if at end
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } | null {
  if (year === CALENDAR_MAX_YEAR && month === 12) return null;
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Clamp a target day to the target month's maximum days
 */
export function clampDateToMonth(year: number, month: number, targetDay: number): string {
  const maxDays = getDaysInMonth(year, month);
  const safeDay = Math.max(1, Math.min(maxDays, targetDay));
  return formatToDateKey(year, month, safeDay);
}
