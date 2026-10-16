import { UserBadge } from '../types';

/**
 * Katalog svih dostupnih dostignuća (bedževa) na platformi.
 * ID-jevi se poklapaju sa automatskim bedževima koje dodeljuje server
 * (forumRouter -> evaluateAutoBadges) i sa ručnim bedževima iz admin panela.
 */
export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Kratak uslov za otključavanje (prikazuje se na zaključanim bedževima). */
  requirement: string;
}

export const BADGE_CATALOG: BadgeDefinition[] = [
  {
    id: 'b_first_thread',
    name: 'Prva Tema',
    description: 'Pokrenuo prvu diskusiju na forumu',
    icon: 'MessageSquare',
    color: '#8b5cf6',
    requirement: 'Pokreni 1 temu',
  },
  {
    id: 'b_theme_master',
    name: 'Theme Master',
    description: 'Pokrenuo 10+ tema na forumu',
    icon: 'Layers',
    color: '#6366f1',
    requirement: 'Pokreni 10 tema',
  },
  {
    id: 'b_helpful',
    name: 'Pomagač',
    description: 'Dao 25+ odgovora zajednici',
    icon: 'MessagesSquare',
    color: '#22d3ee',
    requirement: 'Napiši 25 odgovora',
  },
  {
    id: 'b_top_contrib',
    name: 'Top Contributor',
    description: 'Vrhunski doprinos i visoka reputacija (100+)',
    icon: 'Sparkles',
    color: '#06b6d4',
    requirement: '100 reputacije',
  },
  {
    id: 'b_legend',
    name: 'Legenda Foruma',
    description: 'Reputacija preko 1000 poena',
    icon: 'Crown',
    color: '#f59e0b',
    requirement: '1000 reputacije',
  },
  {
    id: 'b_pro_rev',
    name: 'Pro Recenzent',
    description: 'Priznati recenzent igara',
    icon: 'Star',
    color: '#a855f7',
    requirement: 'Dodeljuje admin',
  },
  {
    id: 'b_guild_leader',
    name: 'Vođa Klana',
    description: 'Vođa gejming klana ili zajednice',
    icon: 'Crown',
    color: '#10b981',
    requirement: 'Dodeljuje admin',
  },
  {
    id: 'b_hw_guru',
    name: 'Hardver Guru',
    description: 'Ekspert za hardver i konfiguracije',
    icon: 'Cpu',
    color: '#10b981',
    requirement: 'Dodeljuje admin',
  },
  {
    id: 'b_speedrunner',
    name: 'Speedrunner',
    description: 'Lovac na brzinske rekorde',
    icon: 'Zap',
    color: '#eab308',
    requirement: 'Dodeljuje admin',
  },
  {
    id: 'b_vip_founder',
    name: 'VIP Founder',
    description: 'Član osnivač NEXUS zajednice',
    icon: 'Gem',
    color: '#ec4899',
    requirement: 'Dodeljuje admin',
  },
  {
    id: 'b_esports_mod',
    name: 'Esports Mod',
    description: 'Moderator takmičarskih liga i turnira',
    icon: 'Shield',
    color: '#f59e0b',
    requirement: 'Moderator role',
  },
  {
    id: 'b_staff',
    name: 'Nexus Tim',
    description: 'Član administratorskog tima portala',
    icon: 'ShieldCheck',
    color: '#ef4444',
    requirement: 'Staff role',
  },
];

/** Vraća definiciju iz kataloga za zadati id ili ime. */
export function findBadgeDefinition(idOrName?: string): BadgeDefinition | undefined {
  if (!idOrName) return undefined;
  const key = idOrName.toLowerCase();
  return BADGE_CATALOG.find(
    (b) => b.id.toLowerCase() === key || b.name.toLowerCase() === key
  );
}

/**
 * Spaja osvojene bedževe (iz baze) sa katalogom kako bi se dobio
 * objedinjen prikaz (osvojeni + zaključani sa uslovima).
 */
export function buildBadgeBoard(earned: UserBadge[] | undefined): {
  earned: UserBadge[];
  locked: BadgeDefinition[];
} {
  const list = Array.isArray(earned) ? earned : [];
  const earnedKeys = new Set(
    list.map((b) => String(b.id || b.name || '').toLowerCase()).filter(Boolean)
  );

  const locked = BADGE_CATALOG.filter(
    (def) => !earnedKeys.has(def.id.toLowerCase()) && !earnedKeys.has(def.name.toLowerCase())
  );

  return { earned: list, locked };
}
