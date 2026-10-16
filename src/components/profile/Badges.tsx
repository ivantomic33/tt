import React from 'react';
import {
  Award,
  Medal,
  Trophy,
  Star,
  Sparkles,
  Shield,
  ShieldCheck,
  Crown,
  Gem,
  Cpu,
  Zap,
  Flame,
  Compass,
  Code2,
  PenTool,
  User,
  MessageSquare,
  MessagesSquare,
  Layers,
  CheckCircle2,
  Gamepad2,
  type LucideIcon,
} from 'lucide-react';
import { UserBadge } from '../../types';

/**
 * Mapiranje string identifikatora ikone (koju čuvamo u bazi) u lucide komponentu.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  Award,
  Medal,
  Trophy,
  Star,
  Sparkles,
  Shield,
  ShieldCheck,
  Crown,
  Gem,
  Cpu,
  Zap,
  Flame,
  Compass,
  Code2,
  PenTool,
  MessageSquare,
  MessagesSquare,
  Layers,
  CheckCircle2,
  Gamepad2,
};

export function resolveBadgeIcon(name?: string): LucideIcon {
  if (!name) return Award;
  return ICON_MAP[name] || Award;
}

// =========================================================================
// ROLE BADGE — minimalistički, animiran SAMO za staff role
// =========================================================================

interface RoleVisual {
  key: string;
  label: string;
  color: string;
  icon: LucideIcon;
  animated: boolean;
}

const ROLE_MAP: Record<string, RoleVisual> = {
  administrator: { key: 'admin', label: 'Administrator', color: '#ef4444', icon: ShieldCheck, animated: true },
  admin: { key: 'admin', label: 'Administrator', color: '#ef4444', icon: ShieldCheck, animated: true },
  owner: { key: 'owner', label: 'Osnivač', color: '#f43f5e', icon: Crown, animated: true },
  founder: { key: 'owner', label: 'Osnivač', color: '#f43f5e', icon: Crown, animated: true },
  developer: { key: 'developer', label: 'Developer', color: '#22d3ee', icon: Code2, animated: true },
  moderator: { key: 'moderator', label: 'Moderator', color: '#f59e0b', icon: Shield, animated: true },
  editor: { key: 'editor', label: 'Urednik', color: '#a855f7', icon: PenTool, animated: true },
  'hardver guru': { key: 'hardware', label: 'Hardver Guru', color: '#10b981', icon: Cpu, animated: false },
  hardware: { key: 'hardware', label: 'Hardver Guru', color: '#10b981', icon: Cpu, animated: false },
  'vip član': { key: 'vip', label: 'VIP Član', color: '#ec4899', icon: Gem, animated: false },
  vip: { key: 'vip', label: 'VIP Član', color: '#ec4899', icon: Gem, animated: false },
  'član': { key: 'member', label: 'Član', color: '#94a3b8', icon: User, animated: false },
  clan: { key: 'member', label: 'Član', color: '#94a3b8', icon: User, animated: false },
  member: { key: 'member', label: 'Član', color: '#94a3b8', icon: User, animated: false },
  user: { key: 'member', label: 'Član', color: '#94a3b8', icon: User, animated: false },
};

export function resolveRole(role?: string): RoleVisual {
  const key = String(role || '').trim().toLowerCase();
  return ROLE_MAP[key] || ROLE_MAP['član'];
}

interface RoleBadgeProps {
  role?: string;
  className?: string;
}

/**
 * Minimalistički bedž role uz ime. Animacija (shimmer + glow) samo za
 * admin / developer / moderator / urednik / osnivač. Obični članovi su statični.
 */
export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '' }) => {
  const v = resolveRole(role);
  const Icon = v.icon;

  return (
    <span
      className={`relative inline-flex items-center gap-1.5 overflow-hidden rounded-full border px-2.5 py-[3px] text-[10px] font-bold uppercase tracking-wider ${
        v.animated ? 'role-badge-glow' : ''
      } ${className}`}
      style={{ color: v.color, borderColor: `${v.color}55`, backgroundColor: `${v.color}14` }}
      title={`Rola: ${v.label}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="leading-none">{v.label}</span>
      {v.animated && (
        <span className="role-badge-shimmer pointer-events-none absolute inset-0 rounded-full" aria-hidden="true" />
      )}
    </span>
  );
};

// =========================================================================
// ACHIEVEMENT BADGE — osvojeni / zaključan bedž
// =========================================================================

interface AchievementBadgeProps {
  badge?: UserBadge & { desc?: string };
  locked?: boolean;
  compact?: boolean;
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({ badge, locked = false, compact = false }) => {
  const Icon = resolveBadgeIcon(badge?.icon);
  const color = badge?.color || '#a855f7';
  const name = badge?.name || 'Bedž';
  const description = badge?.description || (badge as any)?.desc || '';

  if (compact) {
    return (
      <span
        className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border transition-transform hover:scale-110 ${
          locked ? 'opacity-35' : ''
        }`}
        style={{ color, borderColor: `${color}44`, backgroundColor: `${color}14` }}
        title={`${name}${description ? ` — ${description}` : ''}`}
      >
        <Icon className="w-4 h-4" />
      </span>
    );
  }

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 transition-all ${
        locked ? 'opacity-50' : 'hover:border-white/20 hover:bg-white/[0.06]'
      }`}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
        style={{ color, borderColor: `${color}44`, backgroundColor: `${color}14` }}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-xs font-bold text-white">{name}</span>
          {badge?.isAutomated && (
            <span className="rounded-full bg-white/5 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-slate-400">
              Auto
            </span>
          )}
        </div>
        <p className="truncate text-[10px] text-slate-400">{description}</p>
      </div>
    </div>
  );
};

export default RoleBadge;
