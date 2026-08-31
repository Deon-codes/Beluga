import React from 'react';
import { RiskLevel } from '@/types';
import { AlertOctagon, AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react';

interface RiskBadgeProps {
  level: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function RiskBadge({ level, size = 'md', showIcon = true, className = '' }: RiskBadgeProps) {
  const config = {
    CRITICAL: {
      label: 'CRITICAL',
      bg: 'bg-red-50 dark:bg-red-500/10',
      border: 'border-red-200 dark:border-red-500/20',
      text: 'text-red-700 dark:text-red-400',
      icon: AlertOctagon,
      pulse: 'animate-pulse',
    },
    HIGH: {
      label: 'HIGH RISK',
      bg: 'bg-orange-50 dark:bg-orange-500/10',
      border: 'border-orange-200 dark:border-orange-500/20',
      text: 'text-orange-700 dark:text-orange-400',
      icon: AlertTriangle,
      pulse: '',
    },
    MEDIUM: {
      label: 'MEDIUM RISK',
      bg: 'bg-amber-50 dark:bg-amber-500/10',
      border: 'border-amber-200 dark:border-amber-500/20',
      text: 'text-amber-700 dark:text-amber-400',
      icon: ShieldAlert,
      pulse: '',
    },
    LOW: {
      label: 'LOW HAZARD',
      bg: 'bg-emerald-50 dark:bg-emerald-500/10',
      border: 'border-emerald-200 dark:border-emerald-500/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      icon: ShieldCheck,
      pulse: '',
    },
  }[level] || {
    label: 'UNSPECIFIED',
    bg: 'bg-slate-50 dark:bg-zinc-800/50',
    border: 'border-slate-200 dark:border-zinc-700/50',
    text: 'text-slate-600 dark:text-zinc-400',
    icon: ShieldAlert,
    pulse: '',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-2',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center font-bold tracking-wide uppercase border rounded-md whitespace-nowrap select-none shadow-sm ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={`w-3.5 h-3.5 shrink-0 ${config.pulse}`} />}
      <span>{config.label}</span>
    </span>
  );
}

export default RiskBadge;
