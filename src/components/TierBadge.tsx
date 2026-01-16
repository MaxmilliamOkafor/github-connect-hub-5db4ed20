import React from 'react';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const tierConfig = {
    1: {
      label: 'Tier 1',
      className: 'bg-gradient-to-r from-amber-400 to-yellow-500 text-amber-950 shadow-lg shadow-amber-500/30',
      icon: '🥇'
    },
    2: {
      label: 'Tier 2',
      className: 'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-800 shadow-md shadow-slate-400/30',
      icon: '🥈'
    },
    3: {
      label: 'Tier 3',
      className: 'bg-gradient-to-r from-orange-600 to-amber-700 text-orange-50 shadow-md shadow-orange-500/20',
      icon: '🥉'
    }
  };

  const config = tierConfig[tier];
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-semibold rounded-full',
        config.className,
        sizeClasses[size]
      )}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
