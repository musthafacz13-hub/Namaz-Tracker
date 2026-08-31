'use client';

import React, { useMemo } from 'react';
import { SalahItem, SalahStatus, DayStatusRecord } from '@/lib/types';
import {
  formatDateDisplay,
  getTodayKey,
  parseDayRecord,
  getSalahStatusForDay,
} from '@/lib/storage';
import {
  generateMonthCalendar,
  getPreviousMonth,
  getNextMonth,
  clampDateToMonth,
  parseDateKey,
  formatToDateKey,
  getYears,
  getMonths,
  CALENDAR_MIN_YEAR,
  CALENDAR_MAX_YEAR,
} from '@/lib/calendar';
import { playTickSound, triggerHaptic } from '@/lib/audio';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Circle,
} from 'lucide-react';

interface HomeScreenProps {
  salahItems: SalahItem[];
  completedIds: string[];
  dayLogs: Record<string, DayStatusRecord | string[]>;
  currentDateKey: string;
  onSetSalahStatus: (id: string, status: SalahStatus, dateKey?: string) => void;
  onCycleSalahStatus: (id: string, dateKey?: string) => SalahStatus;
  onSelectDate: (dateKey: string) => void;
  onChangeDate: (delta: number) => void;
  onResetDate: () => void;
  onNavigateToEdit: () => void;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  timeFormat: '12h' | '24h';
}

export default function HomeScreen({
  salahItems,
  dayLogs,
  currentDateKey,
  onSetSalahStatus,
  onSelectDate,
  onResetDate,
  onNavigateToEdit,
  soundEnabled,
  hapticsEnabled,
}: HomeScreenProps) {
  // Parse year, month, day of selected date
  const { year: selectedYear, month: selectedMonth, day: selectedDay } = useMemo(() => {
    return parseDateKey(currentDateKey || getTodayKey());
  }, [currentDateKey]);

  const activeItems = useMemo(() => {
    return salahItems
      .filter((item) => !item.deletedAt)
      .sort((a, b) => a.order - b.order);
  }, [salahItems]);

  const todayKey = getTodayKey();
  const isSelectedDateToday = currentDateKey === todayKey;

  // Selected date formatting
  const { title: dayTitle, subtitle: daySubtitle, dayOfWeek, formattedMonthDay } =
    formatDateDisplay(currentDateKey);

  // ----------------------------------------------------
  // 1. GENERATE FULL 20-YEAR DETERMINISTIC MONTH CALENDAR
  // ----------------------------------------------------
  const monthCalendarData = useMemo(() => {
    return generateMonthCalendar(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  const { daysInMonth, monthYearDisplay, canGoPrev, canGoNext } = monthCalendarData;

  // ----------------------------------------------------
  // 2. MONTHLY PROGRESS & COMPLETION CALCULATION
  // Formula: actual number of days in month * active salah count
  // E.g., Jan/Aug = 31 * 5 = 155, Feb 2028 = 29 * 5 = 145, Feb 2029 = 28 * 5 = 140
  // ----------------------------------------------------
  const monthStats = useMemo(() => {
    const totalPossiblePerDay = activeItems.length || 5;
    const totalOpportunitiesInMonth = daysInMonth * totalPossiblePerDay;

    const daysWithLogs = monthCalendarData.days.map((dayInfo) => {
      const rec = parseDayRecord(dayLogs[dayInfo.dateKey]);
      const prayedCount = rec.prayed.length;
      const missedCount = rec.missed.length;

      let statusType: 'none' | 'partial' | 'all' = 'none';
      if (prayedCount >= totalPossiblePerDay) {
        statusType = 'all';
      } else if (prayedCount > 0 || missedCount > 0) {
        statusType = 'partial';
      }

      const rate = totalPossiblePerDay > 0 ? prayedCount / totalPossiblePerDay : 0;

      return {
        ...dayInfo,
        prayedCount,
        missedCount,
        rate,
        statusType,
        isSelected: dayInfo.dateKey === currentDateKey,
      };
    });

    const totalPrayedMonth = daysWithLogs.reduce((acc, d) => acc + d.prayedCount, 0);
    const totalMissedMonth = daysWithLogs.reduce((acc, d) => acc + d.missedCount, 0);

    const overallMonthlyPercent =
      totalOpportunitiesInMonth > 0
        ? Math.round((totalPrayedMonth / totalOpportunitiesInMonth) * 100)
        : 0;

    return {
      daysWithLogs,
      totalPrayedMonth,
      totalMissedMonth,
      totalOpportunitiesInMonth,
      overallMonthlyPercent,
    };
  }, [monthCalendarData, activeItems.length, daysInMonth, dayLogs, currentDateKey]);

  // ----------------------------------------------------
  // 3. SVG MONTHLY LINE CHART COORDINATES
  // ----------------------------------------------------
  const chartCoordinates = useMemo(() => {
    const width = 600;
    const height = 120;
    const padLeft = 20;
    const padRight = 20;
    const padTop = 15;
    const padBottom = 22;

    const usableWidth = width - padLeft - padRight;
    const usableHeight = height - padTop - padBottom;
    const days = monthStats.daysWithLogs;
    const count = days.length;

    if (count === 0) {
      return {
        width,
        height,
        padBottom,
        pathD: '',
        areaD: '',
        points: [],
        currentPoint: null,
      };
    }

    const stepX = count > 1 ? usableWidth / (count - 1) : usableWidth;

    const points = days.map((d, idx) => {
      const x = padLeft + idx * stepX;
      const y = height - padBottom - d.rate * usableHeight;
      return {
        ...d,
        x,
        y,
      };
    });

    let pathD = '';
    points.forEach((pt, i) => {
      if (i === 0) {
        pathD += `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      } else {
        pathD += ` L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
      }
    });

    const firstPt = points[0];
    const lastPt = points[points.length - 1];
    const areaD = `${pathD} L ${lastPt.x.toFixed(1)} ${height - padBottom} L ${firstPt.x.toFixed(1)} ${height - padBottom} Z`;

    const currentPoint = points.find((p) => p.isSelected) || null;

    return {
      width,
      height,
      padBottom,
      pathD,
      areaD,
      points,
      currentPoint,
    };
  }, [monthStats.daysWithLogs]);

  // ----------------------------------------------------
  // 4. MONTH & YEAR NAVIGATION HANDLERS (2026 – 2045 BOUNDED)
  // ----------------------------------------------------
  const availableYears = useMemo(() => getYears(), []);
  const availableMonths = useMemo(() => getMonths(selectedYear), [selectedYear]);

  const handlePrevMonth = () => {
    const prev = getPreviousMonth(selectedYear, selectedMonth);
    if (!prev) return;
    const newKey = clampDateToMonth(prev.year, prev.month, selectedDay);
    onSelectDate(newKey);
  };

  const handleNextMonth = () => {
    const next = getNextMonth(selectedYear, selectedMonth);
    if (!next) return;
    const newKey = clampDateToMonth(next.year, next.month, selectedDay);
    onSelectDate(newKey);
  };

  const handleSelectYear = (year: number) => {
    const newKey = clampDateToMonth(year, selectedMonth, selectedDay);
    onSelectDate(newKey);
  };

  const handleSelectMonth = (month: number) => {
    const newKey = clampDateToMonth(selectedYear, month, selectedDay);
    onSelectDate(newKey);
  };

  // ----------------------------------------------------
  // 5. MONTHLY DAY SELECTOR (WEEK STRIP IN SELECTED MONTH)
  // Shows 7 days centered/aligned on the selected day
  // ----------------------------------------------------
  const weekDays = useMemo(() => {
    // Current selected js date
    const selectedJsDate = new Date(selectedYear, selectedMonth - 1, selectedDay);
    const dayOfWeekIdx = selectedJsDate.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = (dayOfWeekIdx + 6) % 7; // 0 = Mon, 6 = Sun

    const monday = new Date(selectedJsDate);
    monday.setDate(selectedJsDate.getDate() - diffToMonday);

    const list = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);

      const yr = cur.getFullYear();
      const mo = cur.getMonth() + 1;
      const da = cur.getDate();
      const key = formatToDateKey(yr, mo, da);

      const rec = parseDayRecord(dayLogs[key]);
      const prayedCount = rec.prayed.length;
      const missedCount = rec.missed.length;
      const totalPossible = activeItems.length || 5;

      let statusType: 'none' | 'partial' | 'all' = 'none';
      if (prayedCount >= totalPossible) {
        statusType = 'all';
      } else if (prayedCount > 0 || missedCount > 0) {
        statusType = 'partial';
      }

      list.push({
        dayName: cur.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
        dayNum: da,
        dateKey: key,
        statusType,
        isToday: key === todayKey,
        isSelected: key === currentDateKey,
        isCurrentMonth: yr === selectedYear && mo === selectedMonth,
      });
    }

    return list;
  }, [selectedYear, selectedMonth, selectedDay, dayLogs, activeItems.length, todayKey, currentDateKey]);

  // ----------------------------------------------------
  // 6. SELECTED DAY SALAH STATS
  // ----------------------------------------------------
  const currentDayRecord = useMemo(() => {
    return parseDayRecord(dayLogs[currentDateKey]);
  }, [dayLogs, currentDateKey]);

  const selectedDayPrayedCount = currentDayRecord.prayed.length;
  const selectedDayTotalCount = activeItems.length;
  const selectedDayPercent =
    selectedDayTotalCount > 0
      ? Math.round((selectedDayPrayedCount / selectedDayTotalCount) * 100)
      : 0;

  // Status toggle handler
  const handleStatusChange = (salahId: string, newStatus: SalahStatus) => {
    if (soundEnabled) {
      playTickSound(newStatus === 'prayed');
    }
    if (hapticsEnabled) {
      triggerHaptic(newStatus === 'prayed' ? 30 : 15);
    }
    onSetSalahStatus(salahId, newStatus, currentDateKey);
  };

  const handleRowClick = (salahId: string) => {
    const current = getSalahStatusForDay(dayLogs, currentDateKey, salahId);
    let next: SalahStatus = 'prayed';
    if (current === 'not_recorded') next = 'prayed';
    else if (current === 'prayed') next = 'missed';
    else if (current === 'missed') next = 'not_recorded';

    handleStatusChange(salahId, next);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 md:px-6 pt-5 pb-28 min-h-screen bg-white text-black flex flex-col font-sans select-none">
      {/* -------------------------------------------------- */}
      {/* 1. TOP HEADER                                      */}
      {/* -------------------------------------------------- */}
      <header className="pb-4 pt-1 border-b border-black flex items-end justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight uppercase leading-none">
            SALAH
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm font-bold font-mono tracking-wider text-black uppercase">
              {formattedMonthDay}
            </span>
            <span className="text-xs text-neutral-400 font-mono">&bull;</span>
            <span className="text-xs font-semibold tracking-wider text-neutral-500 uppercase">
              {dayOfWeek}
            </span>
          </div>
        </div>

        {/* Minimalist Today Indicator / Reset Button */}
        {!isSelectedDateToday ? (
          <button
            id="jump-today-btn"
            onClick={onResetDate}
            className="px-3 py-1 border border-black bg-black text-white text-[11px] font-mono font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
          >
            JUMP TO TODAY
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 border border-neutral-300 text-[11px] font-mono font-semibold uppercase text-neutral-600">
            <span className="w-1.5 h-1.5 rounded-full bg-black" />
            <span>TODAY</span>
          </div>
        )}
      </header>

      <div className="mt-5 space-y-6 flex-1">
        {/* -------------------------------------------------- */}
        {/* 2. MONTHLY PROGRESS CHART                          */}
        {/* -------------------------------------------------- */}
        <section
          aria-label="Monthly Progress"
          className="border border-black bg-white p-4 relative"
        >
          {/* Heading & Large Metric Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-xs font-bold font-mono tracking-widest text-neutral-500 uppercase">
                SALAH COMPLETION
              </h2>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-black">
                  {monthStats.overallMonthlyPercent}%
                </span>
                <span className="text-xs font-mono font-medium text-neutral-500 uppercase">
                  MONTHLY AVERAGE
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-mono font-bold tracking-wider text-black uppercase">
                {monthYearDisplay}
              </span>
            </div>
          </div>

          {/* Clean Minimalist Monthly Line Chart */}
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${chartCoordinates.width} ${chartCoordinates.height}`}
              className="w-full h-24 md:h-28 overflow-visible"
            >
              {/* Subtle Horizontal Reference Grid Lines */}
              <line
                x1="20"
                y1={chartCoordinates.height - chartCoordinates.padBottom}
                x2={chartCoordinates.width - 20}
                y2={chartCoordinates.height - chartCoordinates.padBottom}
                stroke="#e5e5e5"
                strokeWidth="1"
              />
              <line
                x1="20"
                y1={chartCoordinates.height / 2}
                x2={chartCoordinates.width - 20}
                y2={chartCoordinates.height / 2}
                stroke="#f0f0f0"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <line
                x1="20"
                y1="15"
                x2={chartCoordinates.width - 20}
                y2="15"
                stroke="#e5e5e5"
                strokeWidth="1"
              />

              {/* Area Under Curve */}
              {chartCoordinates.areaD && (
                <path
                  d={chartCoordinates.areaD}
                  fill="#000000"
                  fillOpacity="0.04"
                />
              )}

              {/* Main Line Stroke */}
              {chartCoordinates.pathD && (
                <path
                  d={chartCoordinates.pathD}
                  fill="none"
                  stroke="#000000"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Selected Day Vertical Indicator Line */}
              {chartCoordinates.currentPoint && (
                <line
                  x1={chartCoordinates.currentPoint.x}
                  y1="15"
                  x2={chartCoordinates.currentPoint.x}
                  y2={chartCoordinates.height - chartCoordinates.padBottom}
                  stroke="#000000"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {/* Day Dots for Days that have completed prayers */}
              {chartCoordinates.points.map((pt) => {
                if (pt.prayedCount === 0 && !pt.isSelected) return null;
                return (
                  <circle
                    key={pt.dateKey}
                    cx={pt.x}
                    cy={pt.y}
                    r={pt.isSelected ? 4 : 2.5}
                    fill={pt.isSelected ? '#000000' : '#ffffff'}
                    stroke="#000000"
                    strokeWidth={pt.isSelected ? 2 : 1.5}
                  />
                );
              })}

              {/* Exact Baseline Labels from actual month length */}
              <text
                x="20"
                y={chartCoordinates.height - 6}
                fill="#a3a3a3"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="600"
              >
                DAY 1
              </text>
              <text
                x={chartCoordinates.width - 20}
                y={chartCoordinates.height - 6}
                textAnchor="end"
                fill="#a3a3a3"
                fontSize="9"
                fontFamily="monospace"
                fontWeight="600"
              >
                DAY {daysInMonth}
              </text>
            </svg>
          </div>
        </section>

        {/* -------------------------------------------------- */}
        {/* 3. MONTH + YEAR NAVIGATION (2026 – 2045)           */}
        {/* -------------------------------------------------- */}
        <section
          aria-label="Month and Year Selector"
          className="flex items-center justify-between border border-black bg-white px-2 py-1.5"
        >
          <button
            id="prev-month-btn"
            onClick={handlePrevMonth}
            disabled={!canGoPrev}
            aria-label="Previous Month"
            className={`w-10 h-10 flex items-center justify-center border transition-colors ${
              canGoPrev
                ? 'border-transparent hover:border-black hover:bg-neutral-100 text-black cursor-pointer'
                : 'border-transparent text-neutral-300 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>

          <div className="flex items-center justify-center gap-2">
            <label htmlFor="month-select" className="sr-only">
              Select Month
            </label>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => handleSelectMonth(Number(e.target.value))}
              aria-label="Select Month"
              className="text-xs md:text-sm font-black font-sans tracking-wider uppercase bg-transparent cursor-pointer py-1 px-1 border-b border-dashed border-transparent hover:border-black focus:border-black focus:outline-none text-center"
            >
              {availableMonths.map((m) => (
                <option key={m.month} value={m.month} className="bg-white text-black font-mono">
                  {m.name}
                </option>
              ))}
            </select>

            <label htmlFor="year-select" className="sr-only">
              Select Year
            </label>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => handleSelectYear(Number(e.target.value))}
              aria-label="Select Year"
              className="text-xs md:text-sm font-black font-mono tracking-wider uppercase bg-transparent cursor-pointer py-1 px-1 border-b border-dashed border-transparent hover:border-black focus:border-black focus:outline-none text-center"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="bg-white text-black font-mono">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <button
            id="next-month-btn"
            onClick={handleNextMonth}
            disabled={!canGoNext}
            aria-label="Next Month"
            className={`w-10 h-10 flex items-center justify-center border transition-colors ${
              canGoNext
                ? 'border-transparent hover:border-black hover:bg-neutral-100 text-black cursor-pointer'
                : 'border-transparent text-neutral-300 cursor-not-allowed'
            }`}
          >
            <ChevronRight size={18} strokeWidth={2.5} />
          </button>
        </section>

        {/* -------------------------------------------------- */}
        {/* 4. MONTHLY DAY SELECTOR (WEEK STRIP)              */}
        {/* -------------------------------------------------- */}
        <section aria-label="Day Selector">
          <div className="grid grid-cols-7 gap-1.5 border border-black p-2 bg-white">
            {weekDays.map((item) => {
              return (
                <button
                  key={item.dateKey}
                  id={`day-btn-${item.dateKey}`}
                  onClick={() => onSelectDate(item.dateKey)}
                  className={`flex flex-col items-center justify-between py-2 px-1 min-h-[58px] transition-all border ${
                    item.isSelected
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-white text-black border-transparent hover:border-neutral-300'
                  }`}
                >
                  {/* Day of Week Name (MON, TUE...) */}
                  <span
                    className={`text-[10px] font-mono font-bold tracking-wider ${
                      item.isSelected
                        ? 'text-neutral-300'
                        : item.isCurrentMonth
                        ? 'text-neutral-400'
                        : 'text-neutral-300'
                    }`}
                  >
                    {item.dayName}
                  </span>

                  {/* Day of Month Number (24, 25...) */}
                  <span
                    className={`text-base font-extrabold font-sans leading-none my-0.5 ${
                      !item.isSelected && !item.isCurrentMonth ? 'text-neutral-400' : ''
                    }`}
                  >
                    {item.dayNum}
                  </span>

                  {/* Completion Status Indicator:
                      ○ = no Salah recorded
                      ◐ = partially completed
                      ● = all five Salah completed */}
                  <div className="flex items-center justify-center h-3.5">
                    {item.statusType === 'all' && (
                      <span
                        title="All 5 Salah Completed"
                        className={`text-xs leading-none ${
                          item.isSelected ? 'text-white' : 'text-black'
                        }`}
                      >
                        ●
                      </span>
                    )}
                    {item.statusType === 'partial' && (
                      <span
                        title="Partially Completed"
                        className={`text-xs leading-none ${
                          item.isSelected ? 'text-white' : 'text-black'
                        }`}
                      >
                        ◐
                      </span>
                    )}
                    {item.statusType === 'none' && (
                      <span
                        title="No Salah Recorded"
                        className={`text-xs leading-none ${
                          item.isSelected ? 'text-neutral-400' : 'text-neutral-400'
                        }`}
                      >
                        ○
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* -------------------------------------------------- */}
        {/* 5. SELECTED DAY'S SALAH CHECKLIST                  */}
        {/* -------------------------------------------------- */}
        <section aria-label="Salah Checklist" className="space-y-3">
          <div className="flex items-center justify-between border-b border-black pb-2">
            <h3 className="text-xs font-mono font-bold tracking-widest text-black uppercase">
              {daySubtitle || dayTitle}
            </h3>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              TAP STATUS TO CYCLE (○ &rarr; ✓ &rarr; &times;)
            </span>
          </div>

          {activeItems.length === 0 ? (
            <div className="border border-black p-6 text-center bg-white">
              <p className="font-bold text-sm mb-2 uppercase">NO ACTIVE PRAYERS</p>
              <button
                onClick={onNavigateToEdit}
                className="bg-black text-white py-2 px-4 font-mono font-bold text-xs uppercase"
              >
                + ADD PRAYERS
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {activeItems.map((salah) => {
                const status = getSalahStatusForDay(dayLogs, currentDateKey, salah.id);

                return (
                  <div
                    key={salah.id}
                    id={`salah-row-${salah.id}`}
                    className={`border border-black p-3 md:p-3.5 transition-all flex items-center justify-between gap-3 ${
                      status === 'prayed'
                        ? 'bg-neutral-100'
                        : status === 'missed'
                        ? 'bg-neutral-50 border-neutral-400'
                        : 'bg-white hover:bg-neutral-50/70'
                    }`}
                  >
                    {/* Left: Salah Name + Arabic Subtitle */}
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => handleRowClick(salah.id)}
                    >
                      <div className="flex items-baseline gap-2">
                        <h4 className="text-lg md:text-xl font-black tracking-tight uppercase">
                          {salah.name}
                        </h4>
                        {salah.arabicName && (
                          <span className="text-xs font-serif text-neutral-500">
                            {salah.arabicName}
                          </span>
                        )}
                      </div>

                      {/* Current Status Micro-Label */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                            status === 'prayed'
                              ? 'text-black'
                              : status === 'missed'
                              ? 'text-neutral-500 line-through'
                              : 'text-neutral-400'
                          }`}
                        >
                          {status === 'prayed'
                            ? 'PRAYED'
                            : status === 'missed'
                            ? 'MISSED'
                            : 'NOT RECORDED'}
                        </span>
                      </div>
                    </div>

                    {/* Right: Explicit 3-State Action Chips */}
                    <div className="flex items-center gap-1 shrink-0">
                      {/* 1. NOT RECORDED (○) */}
                      <button
                        id={`btn-unrecorded-${salah.id}`}
                        onClick={() => handleStatusChange(salah.id, 'not_recorded')}
                        aria-label="Mark as not recorded"
                        title="Not Recorded"
                        className={`w-8 h-8 flex items-center justify-center border transition-all ${
                          status === 'not_recorded'
                            ? 'border-black bg-white text-black font-bold shadow-xs'
                            : 'border-neutral-200 text-neutral-300 hover:border-neutral-400 hover:text-black bg-white'
                        }`}
                      >
                        <Circle size={14} strokeWidth={status === 'not_recorded' ? 2.5 : 1.5} />
                      </button>

                      {/* 2. PRAYED (✓) */}
                      <button
                        id={`btn-prayed-${salah.id}`}
                        onClick={() => handleStatusChange(salah.id, 'prayed')}
                        aria-label="Mark as prayed"
                        title="Prayed"
                        className={`w-8 h-8 flex items-center justify-center border transition-all ${
                          status === 'prayed'
                            ? 'border-black bg-black text-white'
                            : 'border-neutral-200 text-neutral-300 hover:border-black hover:text-black bg-white'
                        }`}
                      >
                        <Check size={16} strokeWidth={status === 'prayed' ? 3 : 2} />
                      </button>

                      {/* 3. MISSED (×) */}
                      <button
                        id={`btn-missed-${salah.id}`}
                        onClick={() => handleStatusChange(salah.id, 'missed')}
                        aria-label="Mark as missed"
                        title="Missed"
                        className={`w-8 h-8 flex items-center justify-center border transition-all ${
                          status === 'missed'
                            ? 'border-black bg-neutral-800 text-white'
                            : 'border-neutral-200 text-neutral-300 hover:border-neutral-400 hover:text-black bg-white'
                        }`}
                      >
                        <X size={15} strokeWidth={status === 'missed' ? 3 : 2} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* -------------------------------------------------- */}
        {/* 6. TODAY/SELECTED-DAY COMPLETION SUMMARY           */}
        {/* -------------------------------------------------- */}
        <section
          aria-label="Daily Completion Summary"
          className="border border-black bg-white p-3.5 flex items-center justify-between"
        >
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-500 uppercase block">
              DAILY COMPLETION
            </span>
            <div className="text-lg font-black font-mono tracking-tight mt-0.5">
              {selectedDayPrayedCount} / {selectedDayTotalCount} COMPLETED
            </div>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black font-sans tracking-tight">
              {selectedDayPercent}%
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
