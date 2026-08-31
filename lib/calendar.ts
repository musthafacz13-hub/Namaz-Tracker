/**
 * Deterministic 20-Year Calendar Utility (2026 – 2045)
 * Built strictly with native JavaScript Date mechanics.
 * No external dependencies, no AI/APIs, no hardcoded day lists.
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

export interface MonthInfo {
  month: number; // 1 - 12
  name: string; // "JANUARY"
  shortName: string; // "JAN"
  daysInMonth: number;
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

export const MONTH_NAMES: readonly string[] = [
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

export const MONTH_SHORT_NAMES: readonly string[] = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

export const WEEKDAY_NAMES: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const WEEKDAY_SHORT: readonly string[] = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

/**
 * 1. Checks if a year is a leap year using native JavaScript Date evaluation.
 * In JS Date: new Date(year, 1, 29).getMonth() === 1 (February is 0-indexed month 1).
 */
export function isLeapYear(year: number): boolean {
  // Using native JavaScript Date behavior:
  // February is month 1. If Feb 29 rolls into March (month 2), it's not a leap year.
  return new Date(year, 1, 29).getMonth() === 1;
}

/**
 * 2. Returns the exact number of days in any month using native JavaScript Date logic.
 * In JS Date: Passing day 0 for month M (1-indexed) gives the last day of month M.
 * E.g., new Date(2028, 2, 0).getDate() => 29.
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be an integer between 1 and 12.`);
  }
  // Passing month (1-indexed) with day 0 resolves to the last day of that month
  return new Date(year, month, 0).getDate();
}

/**
 * 3. Returns the list of supported years: [2026, 2027, ... 2045].
 */
export function getYears(): number[] {
  const years: number[] = [];
  for (let y = CALENDAR_MIN_YEAR; y <= CALENDAR_MAX_YEAR; y++) {
    years.push(y);
  }
  return years;
}

/**
 * 4. Returns the list of months for a specified year with their computed day counts.
 */
export function getMonths(year: number = CALENDAR_MIN_YEAR): MonthInfo[] {
  const clampedYear = Math.max(CALENDAR_MIN_YEAR, Math.min(CALENDAR_MAX_YEAR, year));
  return MONTH_NAMES.map((name, index) => {
    const month = index + 1;
    return {
      month,
      name,
      shortName: MONTH_SHORT_NAMES[index],
      daysInMonth: getDaysInMonth(clampedYear, month),
    };
  });
}

/**
 * 5. Returns all CalendarDayInfo objects for a given year and month.
 */
export function getDays(year: number, month: number): CalendarDayInfo[] {
  const clampedYear = Math.max(CALENDAR_MIN_YEAR, Math.min(CALENDAR_MAX_YEAR, year));
  const clampedMonth = Math.max(1, Math.min(12, month));
  const numDays = getDaysInMonth(clampedYear, clampedMonth);
  const todayKey = getDeviceTodayKey();

  const days: CalendarDayInfo[] = [];

  for (let day = 1; day <= numDays; day++) {
    // Native JavaScript Date (month is 0-indexed)
    const jsDate = new Date(clampedYear, clampedMonth - 1, day);
    const dayOfWeek = jsDate.getDay(); // 0 = Sun ... 6 = Sat
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

  return days;
}

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
  if (!dateKey || typeof dateKey !== 'string') {
    const today = parseDateKey(getDeviceTodayKey());
    return today;
  }
  const [y, m, d] = dateKey.split('-').map(Number);
  const year = isNaN(y) ? CALENDAR_MIN_YEAR : y;
  const month = isNaN(m) ? 1 : Math.max(1, Math.min(12, m));
  const maxDay = getDaysInMonth(year, month);
  const day = isNaN(d) ? 1 : Math.max(1, Math.min(maxDay, d));
  return { year, month, day };
}

/**
 * Detect device's current real-time today key using JavaScript, clamped within 2026-2045 range.
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

  const maxD = getDaysInMonth(y, m);
  if (d > maxD) d = maxD;

  return formatToDateKey(y, m, d);
}

/**
 * Generates month calendar data with navigation constraints (2026-01 to 2045-12).
 */
export function generateMonthCalendar(year: number, month: number): MonthCalendarData {
  const clampedYear = Math.max(CALENDAR_MIN_YEAR, Math.min(CALENDAR_MAX_YEAR, year));
  const clampedMonth = Math.max(1, Math.min(12, month));
  const days = getDays(clampedYear, clampedMonth);
  const daysInMonth = days.length;

  const canGoPrev = !(clampedYear === CALENDAR_MIN_YEAR && clampedMonth === 1);
  const canGoNext = !(clampedYear === CALENDAR_MAX_YEAR && clampedMonth === 12);

  return {
    year: clampedYear,
    month: clampedMonth,
    monthName: MONTH_NAMES[clampedMonth - 1],
    monthYearDisplay: `${MONTH_NAMES[clampedMonth - 1]} ${clampedYear}`,
    daysInMonth,
    days,
    canGoPrev,
    canGoNext,
  };
}

/**
 * Returns previous month { year, month } within 2026-2045 bounds, or null if at beginning (2026-01).
 * Seamlessly transitions across year boundaries (e.g. 2027-01 -> 2026-12).
 */
export function getPreviousMonth(year: number, month: number): { year: number; month: number } | null {
  if (year <= CALENDAR_MIN_YEAR && month <= 1) return null;
  if (month === 1) {
    return { year: year - 1, month: 12 };
  }
  return { year, month: month - 1 };
}

/**
 * Returns next month { year, month } within 2026-2045 bounds, or null if at end (2045-12).
 * Seamlessly transitions across year boundaries (e.g. 2026-12 -> 2027-01).
 */
export function getNextMonth(year: number, month: number): { year: number; month: number } | null {
  if (year >= CALENDAR_MAX_YEAR && month >= 12) return null;
  if (month === 12) {
    return { year: year + 1, month: 1 };
  }
  return { year, month: month + 1 };
}

/**
 * Clamps a target day to the target month's maximum days (e.g. Feb 31 -> Feb 28/29).
 */
export function clampDateToMonth(year: number, month: number, targetDay: number): string {
  const safeYear = Math.max(CALENDAR_MIN_YEAR, Math.min(CALENDAR_MAX_YEAR, year));
  const safeMonth = Math.max(1, Math.min(12, month));
  const maxDays = getDaysInMonth(safeYear, safeMonth);
  const safeDay = Math.max(1, Math.min(maxDays, targetDay));
  return formatToDateKey(safeYear, safeMonth, safeDay);
}
