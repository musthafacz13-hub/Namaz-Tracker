'use client';

import React from 'react';
import { StreakStats } from '@/lib/types';
import MilestoneEmblem from './MilestoneEmblem';
import { ArrowLeft, CheckCircle2, Lock, Flame, Shield, CalendarCheck } from 'lucide-react';

interface ConsistencyScreenProps {
  stats: StreakStats;
  onBack: () => void;
}

export default function ConsistencyScreen({ stats, onBack }: ConsistencyScreenProps) {
  const isYearlyAchieved = stats.milestones.find((m) => m.days === 365)?.isUnlocked ?? false;

  return (
    <div className="w-full max-w-lg mx-auto px-4 pt-6 pb-28 text-black selection:bg-black selection:text-white">
      {/* Top Header */}
      <header className="flex items-center justify-between border-b border-black pb-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            id="consistency-back-btn"
            onClick={onBack}
            aria-label="Back to Home"
            className="w-11 h-11 -ml-2 flex items-center justify-center text-black hover:bg-neutral-100 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-black cursor-pointer"
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-xl font-black font-sans tracking-tight uppercase">
              Consistency
            </h1>
            <p className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
              Daily Streak & Milestones
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 border border-black bg-black text-white text-[11px] font-mono font-bold uppercase tracking-wider">
          <Flame size={13} className="text-white fill-white" />
          <span>{stats.currentStreak}D STREAK</span>
        </div>
      </header>

      {/* 365-Day Master Achievement Banner (Only if unlocked) */}
      {isYearlyAchieved && (
        <section
          aria-label="Yearly Consistency Milestone"
          className="border-2 border-black bg-black text-white p-5 mb-6 shadow-sm transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white text-black flex items-center justify-center shrink-0 border border-white">
              <MilestoneEmblem days={365} isUnlocked={true} size={40} />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                Master Milestone
              </span>
              <h2 className="text-base font-black font-sans uppercase tracking-tight text-white">
                365 Day Consistency Achieved
              </h2>
              <p className="text-xs text-neutral-300 font-mono mt-0.5">
                Steadfast dedication across an entire 365-day cycle.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Core Metrics Grid */}
      <section aria-label="Salah Performance Metrics" className="grid grid-cols-3 gap-2.5 mb-6">
        {/* Metric 1: Current Streak */}
        <div className="border border-black bg-white p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">
              CURRENT
            </span>
            <Flame size={14} className="text-black" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-black">
              {stats.currentStreak}
            </div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">
              Days
            </div>
          </div>
        </div>

        {/* Metric 2: Best Streak */}
        <div className="border border-black bg-white p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">
              BEST
            </span>
            <Shield size={14} className="text-black" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-black">
              {stats.bestStreak}
            </div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">
              Days Record
            </div>
          </div>
        </div>

        {/* Metric 3: Consistency */}
        <div className="border border-black bg-white p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 font-bold">
              OVERALL
            </span>
            <CalendarCheck size={14} className="text-black" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-black">
              {stats.consistencyPercentage}%
            </div>
            <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">
              {stats.totalCompletedDays}/{stats.totalRecordedDays} Days
            </div>
          </div>
        </div>
      </section>

      {/* History Summary Bar */}
      <section
        aria-label="Recorded Salah Summary"
        className="border border-black bg-white px-4 py-3 mb-8 flex items-center justify-between text-xs font-mono"
      >
        <div>
          <span className="text-neutral-500">PRAYERS PRAYED: </span>
          <span className="font-bold text-black">{stats.totalPrayersPrayed}</span>
          <span className="text-neutral-400"> / {stats.totalPossiblePrayers}</span>
        </div>
        <div className="text-right">
          <span className="text-neutral-500">LOGGED DAYS: </span>
          <span className="font-bold text-black">{stats.totalRecordedDays}</span>
        </div>
      </section>

      {/* Reward Milestones Section */}
      <section aria-label="Consistency Milestones">
        <div className="flex items-center justify-between border-b border-black pb-2 mb-4">
          <h2 className="text-sm font-black font-sans tracking-wider uppercase text-black">
            Reward Milestones
          </h2>
          <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500">
            {stats.milestones.filter((m) => m.isUnlocked).length} OF {stats.milestones.length} UNLOCKED
          </span>
        </div>

        <div className="space-y-3">
          {stats.milestones.map((milestone) => {
            const isUnlocked = milestone.isUnlocked;

            return (
              <div
                key={milestone.id}
                id={`milestone-card-${milestone.id}`}
                className={`border p-4 transition-all ${
                  isUnlocked
                    ? 'border-black bg-white shadow-xs'
                    : 'border-neutral-200 bg-neutral-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Geometric Emblem */}
                  <div
                    className={`w-12 h-12 flex items-center justify-center shrink-0 border ${
                      isUnlocked
                        ? 'border-black bg-neutral-100 text-black'
                        : 'border-neutral-200 bg-white text-neutral-400'
                    }`}
                  >
                    <MilestoneEmblem
                      days={milestone.days}
                      isUnlocked={isUnlocked}
                      size={32}
                    />
                  </div>

                  {/* Center: Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-black font-mono tracking-tight uppercase ${
                          isUnlocked ? 'text-black' : 'text-neutral-700'
                        }`}
                      >
                        {milestone.title}
                      </h3>
                      <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
                        • {milestone.subtitle}
                      </span>
                    </div>

                    <p className="text-xs text-neutral-600 font-sans mt-0.5 line-clamp-2">
                      {milestone.description}
                    </p>

                    {/* Progress indicator */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase text-neutral-500 mb-1">
                        <span>
                          {milestone.currentDaysProgress} / {milestone.days} DAYS
                        </span>
                        <span>{milestone.progressPercent}%</span>
                      </div>
                      <div className="w-full h-1 bg-neutral-200 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isUnlocked ? 'bg-black' : 'bg-neutral-500'
                          }`}
                          style={{ width: `${milestone.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Pill */}
                  <div className="shrink-0 pt-0.5">
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                        <CheckCircle2 size={11} strokeWidth={2.5} />
                        UNLOCKED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 border border-neutral-300 bg-white text-neutral-500 text-[10px] font-mono uppercase tracking-wider">
                        <Lock size={10} strokeWidth={2} />
                        LOCKED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Semantic Guidance Note */}
      <footer className="mt-8 border-t border-neutral-200 pt-4 text-center">
        <p className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
          Consistency is built day by day. Every completed day reinforces your streak.
        </p>
      </footer>
    </div>
  );
}
