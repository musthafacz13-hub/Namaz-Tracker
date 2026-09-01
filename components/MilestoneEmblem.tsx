'use client';

import React from 'react';

interface MilestoneEmblemProps {
  days: number;
  isUnlocked: boolean;
  size?: number;
  className?: string;
}

export default function MilestoneEmblem({
  days,
  isUnlocked,
  size = 48,
  className = '',
}: MilestoneEmblemProps) {
  const strokeColor = isUnlocked ? '#000000' : '#A3A3A3';
  const fillColor = isUnlocked ? '#000000' : 'none';
  const accentFill = isUnlocked ? '#000000' : 'none';

  switch (days) {
    case 7:
      // 7 DAYS: Minimalist single dot inside a delicate geometric circle
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r="20"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2.5' : '1.5'}
            strokeDasharray={isUnlocked ? 'none' : '3 3'}
          />
          <circle
            cx="24"
            cy="24"
            r={isUnlocked ? '7' : '4'}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
      );

    case 30:
      // 30 DAYS: Dual concentric rings with cardinal crosshairs
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r="21"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2' : '1.5'}
            strokeDasharray={isUnlocked ? 'none' : '3 3'}
          />
          <circle
            cx="24"
            cy="24"
            r="14"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2.5' : '1.5'}
          />
          <circle
            cx="24"
            cy="24"
            r="6"
            fill={accentFill}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
          <path
            d="M24 3v4M24 41v4M3 24h4M41 24h4"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2' : '1.5'}
            strokeLinecap="round"
          />
        </svg>
      );

    case 100:
      // 100 DAYS: Crisp 8-point geometric octagon star
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <rect
            x="7"
            y="7"
            width="34"
            height="34"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2' : '1.5'}
            strokeDasharray={isUnlocked ? 'none' : '3 3'}
          />
          <rect
            x="7"
            y="7"
            width="34"
            height="34"
            transform="rotate(45 24 24)"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2' : '1.5'}
            strokeDasharray={isUnlocked ? 'none' : '3 3'}
          />
          <circle
            cx="24"
            cy="24"
            r="8"
            fill={accentFill}
            stroke={strokeColor}
            strokeWidth="2"
          />
        </svg>
      );

    case 200:
      // 200 DAYS: Dual layered diamond-octagon emblem
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2' : '1.5'}
          />
          <path
            d="M24 5L43 24L24 43L5 24Z"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2' : '1.5'}
            strokeDasharray={isUnlocked ? 'none' : '3 3'}
          />
          <path
            d="M24 10L38 24L24 38L10 24Z"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2' : '1.5'}
          />
          <rect
            x="18"
            y="18"
            width="12"
            height="12"
            fill={accentFill}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
      );

    case 365:
    default:
      // 365 DAYS: Premium multifaceted starburst compass emblem
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <circle
            cx="24"
            cy="24"
            r="22"
            stroke={strokeColor}
            strokeWidth={isUnlocked ? '2.5' : '1.5'}
          />
          <circle
            cx="24"
            cy="24"
            r="17"
            stroke={strokeColor}
            strokeWidth="1"
            strokeDasharray={isUnlocked ? 'none' : '2 2'}
          />
          {/* 8-point compass star */}
          <path
            d="M24 2L27 18L43 21L29 27L32 43L24 32L16 43L19 27L5 21L21 18Z"
            fill={isUnlocked ? '#000000' : 'none'}
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle
            cx="24"
            cy="24"
            r="4"
            fill={isUnlocked ? '#ffffff' : 'none'}
            stroke={strokeColor}
            strokeWidth="1.5"
          />
        </svg>
      );
  }
}
