'use client';

import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CrescentMorphAnimation } from './IslamicIcons';

interface LoadingScreenProps {
  onDismiss: () => void;
  autoDismissDelay?: number;
}

export default function LoadingScreen({ onDismiss, autoDismissDelay = 2600 }: LoadingScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, autoDismissDelay);

    return () => clearTimeout(timer);
  }, [onDismiss, autoDismissDelay]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white select-none cursor-pointer"
      onClick={onDismiss}
      title="Click to proceed"
    >
      <CrescentMorphAnimation onComplete={() => {}} />

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.4 }}
        onClick={onDismiss}
        className="absolute bottom-10 text-[10px] tracking-[0.25em] uppercase text-neutral-500 hover:text-white transition-colors"
      >
        TAP ANYWHERE TO ENTER
      </motion.button>
    </motion.div>
  );
}
