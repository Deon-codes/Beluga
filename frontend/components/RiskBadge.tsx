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
      label: 'CRITICAL RISK',
      bg: 'bg-red-950/80',
      border: 'border-red-500/60',
      text: 'text-red-400',
      icon: AlertOctagon,
      pulse: 'animate-pulse',
    },
    HIGH: {
      label: 'HIGH RISK',
      bg: 'bg-orange-950/80',
      border: 'border-orange-500/60',
      text: 'text-orange-400',
      icon: AlertTriangle,
      pulse: '',
    },
    MEDIUM: {
      label: 'MEDIUM RISK',
      bg: 'bg-amber-950/70',
      border: 'border-amber-500/50',
      text: 'text-amber-400',
      icon: ShieldAlert,
      pulse: '',
    },
    LOW: {
      label: 'LOW HAZARD',
      bg: 'bg-emerald-950/70',
      border: 'border-emerald-500/50',
      text: 'text-emerald-400',
      icon: ShieldCheck,
      pulse: '',
    },
  }[level] || {
    label: 'UNSPECIFIED',
    bg: 'bg-slate-900',
    border: 'border-slate-700',
    text: 'text-slate-400',
    icon: ShieldAlert,
    pulse: '',
  };

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-2.5 py-1 gap-2',
  }[size];

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center font-mono font-semibold tracking-wider uppercase border rounded-xs whitespace-nowrap select-none ${config.bg} ${config.border} ${config.text} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={`w-3.5 h-3.5 shrink-0 ${config.pulse}`} />}
      <span>{config.label}</span>
    </span>
  );
}

export default RiskBadge;
