'use client';

import React, { useState } from 'react';
import { SalahItem } from '@/lib/types';
import { formatTimeDisplay } from '@/lib/storage';
import { Trash2, ArrowUp, ArrowDown, Check } from 'lucide-react';

interface EditScreenProps {
  salahItems: SalahItem[];
  onAddSalah: (name: string, time: string, arabicName?: string) => void;
  onUpdateSalah: (id: string, updates: Partial<SalahItem>) => void;
  onDeleteSalah: (id: string) => void; // moves to bin
  onReorderSalah: (id: string, direction: 'up' | 'down') => void;
  timeFormat: '12h' | '24h';
}

const COMMON_PRESETS = [
  { name: 'Fajr', arabic: 'الفجر' },
  { name: 'Dhuhr', arabic: 'الظهر' },
  { name: 'Asr', arabic: 'العصر' },
  { name: 'Maghrib', arabic: 'المغرب' },
  { name: 'Isha', arabic: 'العشاء' },
  { name: 'Tahajjud', arabic: 'التهجد' },
  { name: 'Duha', arabic: 'الضحى' },
  { name: 'Witr', arabic: 'الوتر' },
];

export default function EditScreen({
  salahItems,
  onAddSalah,
  onUpdateSalah,
  onDeleteSalah,
  onReorderSalah,
  timeFormat,
}: EditScreenProps) {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTime, setEditTime] = useState('');
  const [formFeedback, setFormFeedback] = useState<string | null>(null);

  const activeItems = salahItems
    .filter((item) => !item.deletedAt)
    .sort((a, b) => a.order - b.order);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const matchedPreset = COMMON_PRESETS.find(
      (p) => p.name.toLowerCase() === name.trim().toLowerCase()
    );

    onAddSalah(name.trim(), time, matchedPreset?.arabic);
    setName('');
    setTime('');
    setFormFeedback('ADDED TO ROUTINE');
    setTimeout(() => setFormFeedback(null), 2000);
  };

  const handleSelectPreset = (preset: { name: string; arabic?: string }) => {
    setName(preset.name);
  };

  const handleSaveInlineEdit = (id: string) => {
    if (!editName.trim()) return;
    onUpdateSalah(id, { name: editName.trim(), time: editTime });
    setEditingId(null);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-6 pt-10 pb-28 min-h-screen bg-white text-black">
      {/* Header: "MANAGE SALAH" */}
      <div className="border-b border-black pb-4 mb-8">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-none">
          MANAGE SALAH
        </h1>
        <p className="text-xs font-mono tracking-widest text-neutral-500 uppercase mt-2">
          MANUAL ENTRY & ROUTINE CUSTOMIZATION
        </p>
      </div>

      {/* Preset Quick Fill Pills */}
      <div className="mb-8">
        <p className="text-[10px] font-mono tracking-widest uppercase text-neutral-400 mb-3">
          QUICK TEMPLATES
        </p>
        <div className="flex flex-wrap gap-2">
          {COMMON_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className="border border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Minimalist Form */}
      <form onSubmit={handleSubmit} className="space-y-6 mb-12">
        <div>
          <label
            htmlFor="namaz-name-input"
            className="block text-[11px] font-mono font-bold tracking-widest uppercase text-neutral-500 mb-1"
          >
            NAMAZ NAME
          </label>
          <input
            id="namaz-name-input"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fajr, Tahajjud, Jumu'ah"
            className="w-full bg-transparent border-b-2 border-black py-2.5 text-xl font-bold text-black placeholder:text-neutral-300 placeholder:font-normal focus:outline-none focus:border-b-4 transition-all"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="namaz-time-input"
              className="block text-[11px] font-mono font-bold tracking-widest uppercase text-neutral-500"
            >
              PRAYER TIME
            </label>
            <span className="text-[10px] font-mono text-neutral-400 uppercase">
              OPTIONAL (--:--)
            </span>
          </div>
          <input
            id="namaz-time-input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-full bg-transparent border-b-2 border-black py-2.5 text-xl font-mono font-bold text-black focus:outline-none focus:border-b-4 transition-all"
          />
        </div>

        {/* Full-width, solid black button with white text: "+ ADD TO TRACKER" */}
        <button
          id="add-to-tracker-btn"
          type="submit"
          className="w-full bg-black text-white py-4 px-6 text-center font-black text-sm uppercase tracking-[0.2em] hover:bg-neutral-900 active:scale-[0.99] transition-transform select-none flex items-center justify-center gap-2"
        >
          {formFeedback ? (
            <>
              <Check size={18} strokeWidth={3} />
              <span>{formFeedback}</span>
            </>
          ) : (
            <span>+ ADD TO TRACKER</span>
          )}
        </button>
      </form>

      {/* Active Salah Routine Management */}
      <div className="pt-6 border-t border-black">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono font-bold tracking-[0.2em] uppercase text-neutral-600">
            ACTIVE ROUTINE ({activeItems.length})
          </h2>
          <span className="text-[10px] font-mono text-neutral-400">
            USE ARROWS TO REORDER
          </span>
        </div>

        {activeItems.length === 0 ? (
          <div className="border border-dashed border-neutral-300 p-6 text-center text-xs font-mono text-neutral-400">
            NO ACTIVE PRAYERS CONFIGURED
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 border-t border-b border-black">
            {activeItems.map((item, idx) => {
              const isEditing = editingId === item.id;

              return (
                <div
                  key={item.id}
                  className="py-3.5 flex items-center justify-between gap-3 group"
                >
                  {isEditing ? (
                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 border-b border-black bg-transparent py-1 font-bold text-sm focus:outline-none"
                      />
                      <input
                        type="time"
                        value={editTime}
                        onChange={(e) => setEditTime(e.target.value)}
                        className="border-b border-black bg-transparent py-1 font-mono text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveInlineEdit(item.id)}
                        className="bg-black text-white px-3 py-1 text-xs font-bold uppercase"
                      >
                        SAVE
                      </button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-lg tracking-tight truncate">
                          {item.name}
                        </span>
                        {item.arabicName && (
                          <span className="text-xs text-neutral-400 font-serif">
                            {item.arabicName}
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-neutral-500 uppercase">
                        {formatTimeDisplay(item.time, timeFormat) || '--:--'}
                      </span>
                    </div>
                  )}

                  {/* Actions: Reorder, Edit, Move to Bin */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onReorderSalah(item.id, 'up')}
                      aria-label={`Move ${item.name} up`}
                      className="p-1.5 text-neutral-400 hover:text-black disabled:opacity-20 hover:bg-neutral-100 transition-colors"
                    >
                      <ArrowUp size={16} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === activeItems.length - 1}
                      onClick={() => onReorderSalah(item.id, 'down')}
                      aria-label={`Move ${item.name} down`}
                      className="p-1.5 text-neutral-400 hover:text-black disabled:opacity-20 hover:bg-neutral-100 transition-colors"
                    >
                      <ArrowDown size={16} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditing) {
                          setEditingId(null);
                        } else {
                          setEditingId(item.id);
                          setEditName(item.name);
                          setEditTime(item.time);
                        }
                      }}
                      className="px-2 py-1 text-[10px] font-mono font-bold uppercase hover:bg-neutral-100 border border-neutral-300"
                    >
                      {isEditing ? 'CANCEL' : 'EDIT'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSalah(item.id)}
                      aria-label={`Move ${item.name} to Bin`}
                      title="Move to Bin"
                      className="p-1.5 text-neutral-400 hover:text-black hover:bg-neutral-100 transition-colors"
                    >
                      <Trash2 size={16} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
