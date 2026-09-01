'use client';

import React from 'react';
import { ScreenType } from '@/lib/types';
import { LayoutGrid, Flame, PlusSquare, Trash2, SlidersHorizontal } from 'lucide-react';

interface BottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  binCount?: number;
}

export default function BottomNav({ currentScreen, onNavigate, binCount = 0 }: BottomNavProps) {
  const navItems: { id: ScreenType; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    {
      id: 'home',
      label: 'Home',
      icon: (active) => <LayoutGrid size={20} strokeWidth={active ? 2.5 : 1.75} />,
    },
    {
      id: 'consistency',
      label: 'Streak',
      icon: (active) => <Flame size={20} strokeWidth={active ? 2.5 : 1.75} className={active ? 'fill-black' : ''} />,
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: (active) => <PlusSquare size={20} strokeWidth={active ? 2.5 : 1.75} />,
    },
    {
      id: 'bin',
      label: 'Bin',
      icon: (active) => (
        <div className="relative">
          <Trash2 size={20} strokeWidth={active ? 2.5 : 1.75} />
          {binCount > 0 && (
            <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-black" />
          )}
        </div>
      ),
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: (active) => <SlidersHorizontal size={20} strokeWidth={active ? 2.5 : 1.75} />,
    },
  ];

  return (
    <nav
      aria-label="Main Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-black select-none"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => onNavigate(item.id)}
              aria-label={item.label}
              className={`flex-1 flex flex-col items-center justify-center h-full min-h-[44px] transition-colors relative ${
                isActive
                  ? 'text-black font-extrabold'
                  : 'text-neutral-400 hover:text-black'
              }`}
            >
              <div className="flex items-center justify-center">
                {item.icon(isActive)}
              </div>
              <span className="text-[10px] font-mono tracking-widest uppercase mt-1">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-10 h-0.5 bg-black" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
