'use client';

import React from 'react';
import { motion } from 'motion/react';

// Minimalist wireframe 8-point star (Rub el Hizb)
export function EightPointStar({
  size = 32,
  className = '',
  strokeWidth = 1.5,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Square 1 */}
      <rect
        x="20"
        y="20"
        width="60"
        height="60"
        stroke="currentColor"
        strokeWidth={strokeWidth * 2.5}
        fill="none"
      />
      {/* Square 2 rotated 45 degrees */}
      <rect
        x="20"
        y="20"
        width="60"
        height="60"
        transform="rotate(45 50 50)"
        stroke="currentColor"
        strokeWidth={strokeWidth * 2.5}
        fill="none"
      />
      {/* Center subtle concentric point */}
      <circle cx="50" cy="50" r="3" fill="currentColor" />
    </svg>
  );
}

// Minimal wireframe crescent moon
export function WireframeCrescent({
  size = 48,
  className = '',
  strokeWidth = 2,
}: {
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M 50 15 A 35 35 0 1 0 85 50 A 28 28 0 1 1 50 15 Z"
        stroke="currentColor"
        strokeWidth={strokeWidth * 2}
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// Minimalist Loading morph animation component
// "A minimalist white wireframe crescent moon that smoothly rotates and morphs into a perfect white circle, which then fills with a white checkmark."
export function CrescentMorphAnimation({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="relative w-36 h-36 flex items-center justify-center">
        {/* Step 1 & 2: Rotating crescent morphing into circle */}
        <motion.svg
          width={120}
          height={120}
          viewBox="0 0 100 100"
          fill="none"
          initial={{ rotate: -45, scale: 0.85, opacity: 0 }}
          animate={{
            rotate: [ -45, 0, 180, 360 ],
            scale: [ 0.85, 1, 1.05, 1 ],
            opacity: [ 0, 1, 1, 1 ],
          }}
          transition={{
            duration: 1.8,
            ease: "easeInOut",
            times: [0, 0.2, 0.6, 1],
          }}
          className="text-white"
        >
          {/* Morphing Path */}
          <motion.circle
            cx="50"
            cy="50"
            r="40"
            stroke="white"
            strokeWidth="3"
            initial={{ pathLength: 0, fill: "transparent" }}
            animate={{
              pathLength: 1,
              fill: "white",
            }}
            transition={{
              pathLength: { duration: 1.2, ease: "easeInOut" },
              fill: { delay: 1.3, duration: 0.4, ease: "easeOut" },
            }}
          />

          {/* Wireframe Crescent Inner Mask Cutout that retracts */}
          <motion.path
            d="M 50 12 A 38 38 0 1 0 88 50 A 30 30 0 1 1 50 12 Z"
            fill="black"
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              opacity: [1, 1, 0],
              scale: [1, 1.1, 0.4],
            }}
            transition={{
              duration: 1.3,
              times: [0, 0.7, 1],
              ease: "easeInOut",
            }}
            style={{ transformOrigin: "50px 50px" }}
          />
        </motion.svg>

        {/* Step 3: Checkmark appearing inside the filled white circle */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.4, duration: 0.35, ease: "backOut" }}
          onAnimationComplete={onComplete}
        >
          <svg
            width="44"
            height="44"
            viewBox="0 0 24 24"
            fill="none"
            stroke="black"
            strokeWidth="3.5"
            strokeLinecap="square"
            strokeLinejoin="miter"
          >
            <motion.polyline
              points="20 6 9 17 4 12"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 1.5, duration: 0.3, ease: "easeInOut" }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Text: Below the icon, the word "BISMILLAH" in a clean, small, all-caps sans-serif font */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: "easeOut" }}
        className="mt-8 text-xs font-mono tracking-[0.4em] uppercase text-white font-bold"
      >
        BISMILLAH
      </motion.p>
    </div>
  );
}
