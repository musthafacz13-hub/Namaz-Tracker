'use client';

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SalahItem } from '@/lib/types';
import { formatTimeDisplay } from '@/lib/storage';
import { Trash2, RotateCcw } from 'lucide-react';

interface BinScreenProps {
  salahItems: SalahItem[];
  onRestoreSalah: (id: string) => void;
  onPermanentDeleteSalah: (id: string) => void;
  onEmptyBin: () => void;
  timeFormat: '12h' | '24h';
}

export default function BinScreen({
  salahItems,
  onRestoreSalah,
  onPermanentDeleteSalah,
  onEmptyBin,
  timeFormat,
}: BinScreenProps) {
  const deletedItems = salahItems.filter((item) => Boolean(item.deletedAt));

  return (
    <div className="w-full max-w-xl mx-auto px-6 pt-10 pb-28 min-h-screen bg-white text-black">
      {/* Header: "BIN" */}
      <div className="flex items-baseline justify-between border-b border-black pb-4 mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight uppercase leading-none">
            BIN
          </h1>
          <p className="text-xs font-mono tracking-widest text-neutral-400 uppercase mt-2">
            INACTIVE & DELETED SALAH ENTRIES
          </p>
        </div>

        {deletedItems.length > 0 && (
          <button
            id="empty-bin-button"
            onClick={onEmptyBin}
            className="border border-black px-3 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
          >
            PURGE ALL
          </button>
        )}
      </div>

      {deletedItems.length === 0 ? (
        <div className="border border-neutral-200 p-12 text-center my-12">
          <p className="text-sm font-bold uppercase tracking-widest text-neutral-400 font-mono mb-1">
            BIN IS EMPTY
          </p>
          <p className="text-[11px] text-neutral-400 font-mono">
            ITEMS REMOVED FROM MANAGE SALAH APPEAR HERE
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
            SWIPE OR CLICK TRASH TO PERMANENTLY DELETE &bull; CLICK RESTORE TO REACTIVATE
          </p>

          <div className="divide-y divide-neutral-200 border-t border-b border-black">
            <AnimatePresence>
              {deletedItems.map((item) => {
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="relative overflow-hidden"
                  >
                    {/* Item Container */}
                    <div className="flex items-center justify-between py-4 px-2 bg-white">
                      {/* Left: Name and time in muted gray text */}
                      <div className="flex flex-col select-none pr-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-bold tracking-tight text-neutral-400">
                            {item.name}
                          </span>
                          {item.arabicName && (
                            <span className="text-xs text-neutral-300 font-serif">
                              {item.arabicName}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-mono text-neutral-400 uppercase mt-0.5">
                          {formatTimeDisplay(item.time, timeFormat)}
                        </span>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onRestoreSalah(item.id)}
                          aria-label={`Restore ${item.name}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-black text-xs font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white transition-colors"
                        >
                          <RotateCcw size={13} strokeWidth={2.5} />
                          <span>RESTORE</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onPermanentDeleteSalah(item.id)}
                          aria-label={`Permanently delete ${item.name}`}
                          title="Permanently Delete"
                          className="p-2 border border-black text-black hover:bg-black hover:text-white transition-colors"
                        >
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
