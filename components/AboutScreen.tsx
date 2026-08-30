'use client';

import React from 'react';
import { motion } from 'motion/react';
import { EightPointStar } from './IslamicIcons';
import { ChevronLeft } from 'lucide-react';

interface AboutScreenProps {
  onBack: () => void;
}

export default function AboutScreen({ onBack }: AboutScreenProps) {
  return (
    <div className="relative w-full max-w-xl mx-auto px-6 pt-10 pb-28 min-h-screen bg-white text-black flex flex-col items-center justify-center select-none">
      {/* Top Back Button */}
      <button
        onClick={onBack}
        aria-label="Back to settings"
        className="absolute top-10 left-6 flex items-center gap-1 border border-black px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
      >
        <ChevronLeft size={14} strokeWidth={3} />
        <span>BACK</span>
      </button>

      {/* Dead Center: Small, black geometric 8-point star icon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center text-center max-w-xs"
      >
        <div className="text-black mb-8">
          <EightPointStar size={44} strokeWidth={1.5} />
        </div>

        {/* Text: App version number, followed by "Designed for focus. Built for consistency." */}
        <div className="space-y-4">
          <p className="text-[11px] font-mono tracking-[0.3em] uppercase text-neutral-400 font-bold">
            VERSION 1.0.0
          </p>

          <p className="text-lg md:text-xl font-bold tracking-tight text-black leading-snug">
            Designed for focus. Built for consistency.
          </p>

          <div className="w-12 h-0.5 bg-black mx-auto mt-6" />

          <p className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase pt-2">
            SALAH &bull; NAMAZ &bull; MINDFULNESS
          </p>
        </div>
      </motion.div>
    </div>
  );
}
