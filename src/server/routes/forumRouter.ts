import { Router, Request, Response } from 'express';
import { getAdminSupabaseClient } from '../db/supabaseClient';
import {
  requireAuth,
  optionalAuth,
  requireAdmin,
  requireModerator,
} from '../security/authMiddleware';
import { AuthenticatedRequest } from '../security/bolaMiddleware';
import {
  threadRateLimiter,
  commentRateLimiter,
  voteRateLimiter,
} from '../security/rateLimiter';
import { validateBody } from '../validation/validateMiddleware';
import {
  CreateThreadSchema as CreateForumThreadSchema,
  UpdateThreadSchema as UpdateForumThreadSchema,
  CreateReplySchema as CreateForumReplySchema,
  VoteSchema as ForumVoteSchema,
  PollVoteSchema as ForumPollVoteSchema,
  SubforumSchema as CreateSubforumSchema,
  UpdateSubforumSchema,
  MemberUpdateSchema as UpdateForumMemberSchema,
  BadgeSchema as AssignBadgeSchema,
  AdjustKarmaSchema,
  BookmarkSchema,
  sanitizePlainText,
  sanitizeRichHtml as sanitizeRichContent,
} from '../validation/schemas';

const strictWriteRateLimiter = commentRateLimiter;

const router = Router();

// Serverless (npr. Vercel) ne može da drži dugotrajne HTTP konekcije (SSE).
const IS_SERVERLESS_RUNTIME = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

// Set of connected SSE clients listening for real-time forum activity (votes, new threads, replies, leaderboard)
const sseForumClients = new Set<Response>();

function broadcastForumSSE(payload: Record<string, unknown>) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  sseForumClients.forEach((client) => {
    try {
      client.write(data);
    } catch {
      sseForumClients.delete(client);
    }
  });
}

const DEFAULT_SUBFORUMS = [
  {
    id: 'pc-gaming',
    name: 'PC Gaming',
    slug: 'pc-gaming',
    description:
      'Diskusije o PC naslovima, modifikacijama, Steam/Epic rasprodajama i optimizacijama.',
    icon: 'Monitor',
    color: '#22d3ee',
    badge: 'Popularno',
  },
  {
    id: 'consoles',
    name: 'Konzole (PlayStation / Xbox / Switch)',
    slug: 'consoles',
    description:
      'Sve o PlayStation 5, Xbox Series X/S, Nintendo Switch nasledniku i ekskluzivama.',
    icon: 'Gamepad2',
    color: '#a855f7',
  },
  {
    id: 'esports',
    name: 'Esports & Turniri',
    slug: 'esports',
    description:
      'Takmičarski gejming: CS2, Valorant, League of Legends, Dota 2, transferi i analize mečeva.',
    icon: 'Trophy',
    color: '#f59e0b',
    badge: 'Vruće',
  },
  {
    id: 'hardware',
    name: 'Gaming Hardver & Tehnologija',
    slug: 'hardware',
    description:
      'Grafičke karte, procesori, OLED monitori, custom PC konfiguracije i hlađenje.',
    icon: 'Cpu',
    color: '#10b981',
  },
  {
    id: 'lfg',
    name: 'LFG (Looking For Group) / Guild Finder',
    slug: 'lfg',
    description:
      'Pronađite saigrače za Ranked, timove za turnire, WoW gildije ili Co-Op avanture.',
    icon: 'Users',
    color: '#ec4899',
    badge: 'LFG',
  },
  {
    id: 'off-topic',
    name: 'Off-Topic & Gamer Lounge',
    slug: 'off-topic',
    description:
      'Slobodne diskusije o filmovima, muzici, mimovima, gaming kutku i opuštenim temama.',
    icon: 'Coffee',
    color: '#6366f1',
  },
];

// Mutable in-memory store for subforums
let serverSubforums: any[] = [...DEFAULT_SUBFORUMS];

const serverCommunityMembers: Map<string, any> = new Map();

// In-memory sync store for fast local responses and fallback
const serverThreads: any[] = [];
const serverReplies: any[] = [];
// key: targetId_clientId -> 'up' | 'down'
const serverVotes = new Map<string, 'up' | 'down'>();
// key: threadId_clientId -> optionId
const serverPollVotes = new Map<string, string>();

const formatThreadResponse = (t: any) => ({
  id: t.id,
  title: t.title,
  slug: t.slug,
  subforumId: t.subforum_id || t.subforumId,
  authorId: t.author_id || t.authorId,
  authorName: t.author_name || t.authorName,
  authorRole: t.author_role || t.authorRole || 'Član',
  authorAvatar: t.author_avatar || t.authorAvatar,
  authorKarma: t.author_karma || t.authorKarma || 50,
  content: t.content,
  tags: t.tags || [],
  poll: t.poll,
  views: t.views || 0,
  upvotes: t.upvotes || 0,
  downvotes: t.downvotes || 0,
  score: t.score || 0,
  replyCount: t.reply_count || t.replyCount || 0,
  isPinned: t.is_pinned ?? t.isPinned ?? false,
  isLocked: t.is_locked ?? t.isLocked ?? false,
  createdAt: t.created_at || t.createdAt,
  updatedAt: t.updated_at || t.updatedAt,
  lastActivityAt: t.last_activity_at || t.lastActivityAt,
});

const formatReplyResponse = (r: any) => ({
  id: r.id,
  threadId: r.thread_id || r.threadId,
  parentId: r.parent_id ?? r.parentId ?? null,
  authorId: r.author_id || r.authorId,
  authorName: r.author_name || r.authorName,
  authorRole: r.author_role || r.authorRole || 'Član',
  authorAvatar: r.author_avatar || r.authorAvatar,
  authorKarma: r.author_karma || r.authorKarma || 25,
  content: r.content,
  upvotes: r.upvotes || 0,
  downvotes: r.downvotes || 0,
  score: r.score || 0,
  mentions: r.mentions || [],
  createdAt: r.created_at || r.createdAt,
  updatedAt: r.updated_at || r.updatedAt,
});

// =========================================================================
// REPUTACIJA, NIVO I AUTOMATSKI BEDŽEVI (zajednička logika za profile)
// =========================================================================

const KARMA_TIERS = [
  { name: 'Legendary', color: '#f97316', min: 5000 },
  { name: 'Diamond',   color: '#22d3ee', min: 2000 },
  { name: 'Platinum',  color: '#a78bfa', min: 1000 },
  { name: 'Gold',      color: '#facc15', min: 500 },
  { name: 'Silver',    color: '#cbd5e1', min: 200 },
  { name: 'Bronze',    color: '#fb923c', min: 0 },
];

function resolveKarmaTier(karma: number) {
  const value = Math.max(0, Number(karma) || 0);
  const tier = KARMA_TIERS.find((t) => value >= t.min) || KARMA_TIERS[KARMA_TIERS.length - 1];
  const idx = KARMA_TIERS.indexOf(tier);
  const nextTier = idx > 0 ? KARMA_TIERS[idx - 1] : null;
  return {
    name: tier.name,
    color: tier.color,
    min: tier.min,
    nextTier: nextTier ? { name: nextTier.name, color: nextTier.color, min: nextTier.min } : null,
  };
}

function resolveLevelFromKarma(karma: number) {
  const step = 250;
  const value = Math.max(0, Number(karma) || 0);
  const level = Math.max(1, Math.floor(value / step) + 1);
  const currentFloor = (level - 1) * step;
  const nextLevelXp = level * step;
  const progressPercent = Math.min(100, Math.round(((value - currentFloor) / step) * 100));
  return { level, currentFloor, nextLevelXp, progressPercent };
}

/**
 * Automatski bedževi na osnovu aktivnosti i uloge. Minimalistički set dostignuća.
 */
function evaluateAutoBadges(input: {
  role?: string;
  karma: number;
  threadCount: number;
  replyCount: number;
}): any[] {
  const out: any[] = [];
  const now = new Date().toISOString();
  const role = String(input.role || '').toLowerCase();
  const karma = Number(input.karma) || 0;

  if (input.threadCount >= 1) {
    out.push({ id: 'b_first_thread', name: 'Prva Tema', description: 'Pokrenuo prvu diskusiju na forumu', icon: 'MessageSquare', color: '#8b5cf6', isAutomated: true, assignedAt: now });
  }
  if (input.threadCount >= 10) {
    out.push({ id: 'b_theme_master', name: 'Theme Master', description: 'Pokrenuo 10+ tema na forumu', icon: 'Layers', color: '#6366f1', isAutomated: true, assignedAt: now });
  }
  if (input.replyCount >= 25) {
    out.push({ id: 'b_helpful', name: 'Pomagač', description: 'Dao 25+ odgovora zajednici', icon: 'MessagesSquare', color: '#22d3ee', isAutomated: true, assignedAt: now });
  }
  if (karma >= 100) {
    out.push({ id: 'b_top_contrib', name: 'Top Contributor', description: 'Vrhunski doprinos i visoka reputacija (100+)', icon: 'Sparkles', color: '#06b6d4', isAutomated: true, assignedAt: now });
  }
  if (karma >= 1000) {
    out.push({ id: 'b_legend', name: 'Legenda Foruma', description: 'Reputacija preko 1000 poena', icon: 'Crown', color: '#f59e0b', isAutomated: true, assignedAt: now });
  }
  if (role === 'moderator') {
    out.push({ id: 'b_esports_mod', name: 'Esports Mod', description: 'Moderator takmičarskih liga i turnira', icon: 'Shield', color: '#f59e0b', isAutomated: true, assignedAt: now });
  }
  if (role === 'admin' || role === 'administrator') {
    out.push({ id: 'b_staff', name: 'Nexus Tim', description: 'Član administratorskog tima portala', icon: 'ShieldCheck', color: '#ef4444', isAutomated: true, assignedAt: now });
  }
  return out;
}

/** Spaja ručno dodeljene i automatske bedževe bez duplikata (ručni imaju prednost). */
function mergeBadges(manual: any[], auto: any[]): any[] {
  const map = new Map<string, any>();
  [...(manual || []), ...(auto || [])].forEach((b) => {
    if (!b) return;
    const key = String(b.id || b.name || '').toLowerCase();
    if (!key || map.has(key)) return;
    map.set(key, b);
  });
  return Array.from(map.values());
}

/**
 * Helper to check if the authenticated user is an admin/moderator or the resource author
 */
function isOwnerOrModerator(req: AuthenticatedRequest, authorId?: string, authorName?: string): boolean {
  const user = req.user;
  if (!user) return false;
  const role = String(user.role).toLowerCase();
  if (role === 'admin' || role === 'moderator' || role === 'editor') {
    return true;
  }
  const currentUserId = String(user.sub || user.userId || '');
  if (authorId && currentUserId && String(authorId) === currentUserId) {
    return true;
  }
  const userName = String((user as any).name || (user as any).username || '');
  if (authorName && userName && authorName.toLowerCase() === userName.toLowerCase()) {
    return true;
  }
  return false;
}

/**
 * 0. GET /api/forum/stream
 * Real-time Server-Sent Events stream for votes, threads, comments, and leaderboard updates
 */
router.get('/stream', (_req: Request, res: Response) => {
  const snapshot = {
    type: 'leaderboard_updated',
    timestamp: new Date().toISOString(),
  };

  // Serverless (Vercel): dugotrajna SSE konekcija nije izvodljiva, pa se klijentu
  // vraća jednokratni snapshot i konekcija se zatvara.
  if (IS_SERVERLESS_RUNTIME) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
    });
    res.end(`data: ${JSON.stringify(snapshot)}\n\n`);
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(
    `data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`
  );
  sseForumClients.add(res);

  const heartbeat = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);
  // Ne drži Node proces budnim samo zbog heartbeat intervala.
  heartbeat.unref?.();

  _req.on('close', () => {
    clearInterval(heartbeat);
    sseForumClients.delete(res);
  });
});

/**
 * 1. GET /api/forum/subforums
 * Connects directly to PostgreSQL forum_subforums and aggregates live threadCount & replyCount
 */
router.get('/subforums', async (_req: Request, res: Response) => {
  try {
    const client = getAdminSupabaseClient();

    const [subforumsRes, threadsRes] = await Promise.all([
      client
        .from('forum_subforums')
        .select('*')
        .order('display_order', { ascending: true }),
      client
        .from('forum_threads')
        .select('id, title, slug, subforum_id, author_name, last_activity_at, reply_count')
        .order('last_activity_at', { ascending: false })
        .limit(500),
    ]);

    const subforums: any[] =
      !subforumsRes.error && subforumsRes.data && subforumsRes.data.length > 0
        ? subforumsRes.data
        : serverSubforums;

    const allThreads: any[] =
      !threadsRes.error && threadsRes.data && threadsRes.data.length > 0
        ? threadsRes.data
        : serverThreads;

    const enriched = subforums.map((sub) => {
      const subThreads = allThreads.filter(
        (t) => (t.subforum_id || t.subforumId) === sub.id
      );
      const totalReplies = subThreads.reduce(
        (sum, t) => sum + (t.reply_count || t.replyCount || 0),
        0
      );
      const latest = subThreads[0];

      return {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        description: sub.description,
        icon: sub.icon || 'Layers',
        color: sub.color || '#a855f7',
        badge: sub.badge,
        threadCount: subThreads.length,
        replyCount: totalReplies,
        latestActivity: latest
          ? {
              threadTitle: latest.title,
              threadSlug: latest.slug,
              authorName: latest.author_name || latest.authorName,
              time: latest.last_activity_at || latest.lastActivityAt,
            }
          : undefined,
      };
    });

    res.json({ success: true, data: enriched });
  } catch {
    res.json({ success: true, data: DEFAULT_SUBFORUMS });
  }
});

/**
 * 2. GET /api/forum/threads
 * Supports full filtering, sorting, and pagination (page, limit)
 */
router.get('/threads', async (req: Request, res: Response) => {
  try {
    const { subforumId, sort, tag, search } = req.query as {
      subforumId?: string;
      sort?: string;
      tag?: string;
      search?: string;
    };
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '50'), 10) || 50));
    const offset = (page - 1) * limit;

    const client = getAdminSupabaseClient();

    let query = client.from('forum_threads').select('*');
    if (subforumId && subforumId !== 'all') {
      query = query.eq('subforum_id', subforumId);
    }

    if (tag) {
      const cleanTag = tag.replace('#', '');
      query = query.contains('tags', [cleanTag]);
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim().replace(/[%_]/g, '');
      query = query.or(`title.ilike.%${cleanSearch}%,content.ilike.%${cleanSearch}%`);
    }

    if (sort === 'top') {
      query = query
        .order('is_pinned', { ascending: false })
        .order('score', { ascending: false })
        .order('upvotes', { ascending: false });
    } else if (sort === 'new') {
      query = query
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });
    } else if (sort === 'discussed') {
      query = query
        .order('is_pinned', { ascending: false })
        .order('reply_count', { ascending: false })
        .order('score', { ascending: false });
    } else {
      query = query
        .order('is_pinned', { ascending: false })
        .order('last_activity_at', { ascending: false });
    }

    const { data: dbData, error } = await query.range(offset, offset + limit - 1);
    let results = dbData;

    if (error || !results || results.length === 0) {
      results = [...serverThreads];
      if (subforumId && subforumId !== 'all') {
        results = results.filter((t) => (t.subforum_id || t.subforumId) === subforumId);
      }
      if (tag) {
        const cleanTag = tag.toLowerCase().replace('#', '');
        results = results.filter((t) =>
          (t.tags || []).some((tg: string) => tg.toLowerCase() === cleanTag)
        );
      }
      if (search) {
        const q = search.toLowerCase();
        results = results.filter(
          (t) =>
            (t.title || '').toLowerCase().includes(q) ||
            (t.content || '').toLowerCase().includes(q) ||
            (t.author_name || t.authorName || '').toLowerCase().includes(q)
        );
      }

      if (sort === 'top') {
        results.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (sort === 'new') {
        results.sort(
          (a, b) =>
            new Date(b.created_at || b.createdAt).getTime() -
            new Date(a.created_at || a.createdAt).getTime()
        );
      } else if (sort === 'discussed') {
        results.sort(
          (a, b) =>
            (b.reply_count || b.replyCount || 0) - (a.reply_count || a.replyCount || 0)
        );
      } else {
        results.sort(
          (a, b) =>
            new Date(b.last_activity_at || b.lastActivityAt).getTime() -
            new Date(a.last_activity_at || a.lastActivityAt).getTime()
        );
      }

      results = results.slice(offset, offset + limit);
    }

    const formatted = (results || []).map(formatThreadResponse);

    res.json({
      success: true,
      data: formatted,
      pagination: { page, limit, count: formatted.length },
    });
  } catch {
    res.json({ success: true, data: [] });
  }
});

/**
 * 2.1 GET /api/forum/threads/:idOrSlug
 * Fetch a single thread by ID or Slug from PostgreSQL (or in-memory fallback) and increment views
 */
router.get('/threads/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    const client = getAdminSupabaseClient();

    let threadData: any = null;
    try {
      const { data: bySlug } = await client
        .from('forum_threads')
        .select('*')
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
        .maybeSingle();

      if (bySlug) {
        threadData = bySlug;
        // Asynchronously increment view count
        client
          .from('forum_threads')
          .update({ views: (bySlug.views || 0) + 1 })
          .eq('id', bySlug.id)
          .then(() => {});
      }
    } catch {
      // Fallback to in-memory
    }

    if (!threadData) {
      threadData = serverThreads.find(
        (t) => t.id === idOrSlug || t.slug === idOrSlug
      );
      if (threadData) {
        threadData.views = (threadData.views || 0) + 1;
      }
    }

    if (!threadData) {
      res.status(404).json({ success: false, error: 'Tema nije pronađena.' });
      return;
    }

    res.json({ success: true, data: formatThreadResponse(threadData) });
  } catch {
    res.status(500).json({ success: false, error: 'Greška pri učitavanju teme.' });
  }
});

/**
 * 2.2 GET /api/forum/threads/:id/replies
 * Fetch all replies for a thread from PostgreSQL (or in-memory fallback)
 */
router.get('/threads/:id/replies', async (req: Request, res: Response) => {
  try {
    const { id: threadId } = req.params;
    const client = getAdminSupabaseClient();

    let repliesData: any[] = [];
    try {
      const { data, error } = await client
        .from('forum_replies')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(500);

      if (!error && data && data.length > 0) {
        repliesData = data;
      }
    } catch {
      // Fallback to in-memory
    }

    if (repliesData.length === 0) {
      repliesData = serverReplies.filter(
        (r) => (r.thread_id || r.threadId) === threadId
      );
    }

    res.json({
      success: true,
      data: repliesData.map(formatReplyResponse),
    });
  } catch {
    res.status(500).json({ success: false, error: 'Greška pri učitavanju odgovora.' });
  }
});

/**
 * 3. GET /api/forum/leaderboard
 * Real-time Leaderboard for 'Top Forum Members (Karma)'
 */
router.get('/leaderboard', async (_req: Request, res: Response) => {
  try {
    const client = getAdminSupabaseClient();

    const [threadsRes, repliesRes, membersRes] = await Promise.all([
      client
        .from('forum_threads')
        .select('id, author_name, author_role, author_avatar, score, upvotes')
        .limit(1000),
      client
        .from('forum_replies')
        .select('id, author_name, author_role, author_avatar, score, upvotes')
        .limit(2000),
      client.from('forum_members').select('*').limit(500),
    ]);

    const threadsData: any[] =
      threadsRes.data && !threadsRes.error ? threadsRes.data : serverThreads;
    const repliesData: any[] =
      repliesRes.data && !repliesRes.error ? repliesRes.data : serverReplies;
    const dbMembers: any[] =
      membersRes.data && !membersRes.error ? membersRes.data : [];
    const authorsMap = new Map<string, any>();

    if (dbMembers.length > 0) {
      dbMembers.forEach((m: any) => {
        authorsMap.set(m.name, {
          name: m.name,
          role: m.role || 'Član',
          avatar:
            m.avatar ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
          baseKarma: m.base_karma ?? 50,
          threadScore: 0,
          replyScore: 0,
          threadCount: 0,
          replyCount: 0,
        });
      });
    } else {
      serverCommunityMembers.forEach((meta, name) => {
        authorsMap.set(name, {
          name,
          role: meta.role,
          avatar: meta.avatar,
          baseKarma: meta.baseKarma,
          threadScore: 0,
          replyScore: 0,
          threadCount: 0,
          replyCount: 0,
        });
      });
    }

    threadsData.forEach((t) => {
      const authorName = t.author_name || t.authorName || 'Anonimni Gamer';
      const existing = authorsMap.get(authorName) || {
        name: authorName,
        role: t.author_role || t.authorRole || 'Član',
        avatar:
          t.author_avatar ||
          t.authorAvatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        baseKarma: 25,
        threadScore: 0,
        replyScore: 0,
        threadCount: 0,
        replyCount: 0,
      };

      existing.threadScore += t.score || 0;
      existing.threadCount += 1;
      authorsMap.set(authorName, existing);
    });

    repliesData.forEach((r) => {
      const authorName = r.author_name || r.authorName || 'Anonimni Gamer';
      const existing = authorsMap.get(authorName) || {
        name: authorName,
        role: r.author_role || r.authorRole || 'Član',
        avatar:
          r.author_avatar ||
          r.authorAvatar ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        baseKarma: 25,
        threadScore: 0,
        replyScore: 0,
        threadCount: 0,
        replyCount: 0,
      };

      existing.replyScore += r.score || 0;
      existing.replyCount += 1;
      authorsMap.set(authorName, existing);
    });

    const leaderboard = Array.from(authorsMap.values())
      .map((a) => ({
        name: a.name,
        role: a.role,
        avatar: a.avatar,
        karma: Math.max(0, a.baseKarma + a.threadScore + a.replyScore),
        threadCount: a.threadCount,
        replyCount: a.replyCount,
        rank: 1,
        isOnline: ['AwpMaster99', 'Marko_Gamer', 'Vlado_Overclock'].includes(a.name),
      }))
      .sort((a, b) => b.karma - a.karma)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    res.json({ success: true, data: leaderboard });
  } catch {
    res.status(500).json({ success: false, error: 'Greška pri učitavanju leaderboard-a.' });
  }
});

/**
 * 4. POST /api/forum/threads
 * Rate-limited, Zod-validated, XSS-sanitized thread creation.
 * Author role is verified via JWT (prevents unauthenticated Admin role spoofing).
 */
router.post(
  '/threads',
  threadRateLimiter,
  optionalAuth,
  validateBody(CreateForumThreadSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title, subforumId, content, tags, poll, authorName, authorAvatar } = req.body;

      const slug =
        title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '') + `-${Date.now().toString(36)}`;

      const verifiedUser = req.user;
      const verifiedRole =
        verifiedUser && String(verifiedUser.role).toLowerCase() === 'admin'
          ? 'Admin'
          : verifiedUser && String(verifiedUser.role).toLowerCase() === 'moderator'
          ? 'Moderator'
          : 'Član';

      const newThread = {
        id: `thr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: sanitizePlainText(title),
        slug,
        subforum_id: subforumId,
        author_id: verifiedUser?.sub || verifiedUser?.userId || 'usr_anon',
        author_name: sanitizePlainText(
          authorName || verifiedUser?.username || 'Član Foruma'
        ),
        author_role: verifiedRole,
        author_avatar: authorAvatar || null,
        author_karma: 25,
        content: sanitizeRichContent(content),
        tags: tags || [],
        poll: poll || null,
        views: 0,
        upvotes: 0,
        downvotes: 0,
        score: 0,
        reply_count: 0,
        is_pinned: false,
        is_locked: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_activity_at: new Date().toISOString(),
      };

      try {
        const client = getAdminSupabaseClient();
        await client.from('forum_threads').insert([newThread]);
      } catch (dbErr) {
        console.warn('Database insert fallback for thread:', dbErr);
      }

      serverThreads.unshift(newThread);

      broadcastForumSSE({
        type: 'thread_created',
        thread: newThread,
        timestamp: new Date().toISOString(),
      });

      broadcastForumSSE({
        type: 'leaderboard_updated',
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ success: true, data: formatThreadResponse(newThread) });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Greška pri kreiranju teme.',
      });
    }
  }
);

/**
 * 5. POST /api/forum/threads/:id/vote
 * Rate-limited and Zod-validated thread voting
 */
router.post(
  '/threads/:id/vote',
  voteRateLimiter,
  optionalAuth,
  validateBody(ForumVoteSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: threadId } = req.params;
      const { voteType, clientId } = req.body;
      const activeClientId =
        req.user?.sub ||
        clientId ||
        (req.headers['x-client-id'] as string) ||
        'anon_' + (req.ip || 'client');
      const voteKey = `${threadId}_${activeClientId}`;

      let newUserVote: 'up' | 'down' | null = null;
      const client = getAdminSupabaseClient();

      let existingVote = serverVotes.get(voteKey);
      try {
        const { data: dbVote } = await client
          .from('forum_votes')
          .select('vote_type')
          .eq('target_id', threadId)
          .eq('client_id', activeClientId)
          .maybeSingle();
        if (dbVote) existingVote = dbVote.vote_type;
      } catch {
        // ignore
      }

      if (existingVote === voteType) {
        serverVotes.delete(voteKey);
        newUserVote = null;
        try {
          await client
            .from('forum_votes')
            .delete()
            .eq('target_id', threadId)
            .eq('client_id', activeClientId);
        } catch {}
      } else {
        serverVotes.set(voteKey, voteType);
        newUserVote = voteType;
        try {
          await client.from('forum_votes').upsert(
            {
              target_id: threadId,
              target_type: 'thread',
              client_id: activeClientId,
              vote_type: voteType,
            },
            { onConflict: 'target_id,client_id' }
          );
        } catch {}
      }

      let upvotes = 0;
      let downvotes = 0;
      try {
        const { data: allVotes } = await client
          .from('forum_votes')
          .select('vote_type')
          .eq('target_id', threadId);

        if (allVotes && allVotes.length > 0) {
          allVotes.forEach((v: any) => {
            if (v.vote_type === 'up') upvotes++;
            if (v.vote_type === 'down') downvotes++;
          });
        } else {
          serverVotes.forEach((v, k) => {
            if (k.startsWith(`${threadId}_`)) {
              if (v === 'up') upvotes++;
              if (v === 'down') downvotes++;
            }
          });
        }
      } catch {
        serverVotes.forEach((v, k) => {
          if (k.startsWith(`${threadId}_`)) {
            if (v === 'up') upvotes++;
            if (v === 'down') downvotes++;
          }
        });
      }

      const newScore = upvotes - downvotes;

      try {
        await client
          .from('forum_threads')
          .update({
            upvotes,
            downvotes,
            score: newScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', threadId);
      } catch {}

      const memThread = serverThreads.find((t) => t.id === threadId);
      if (memThread) {
        memThread.upvotes = upvotes;
        memThread.downvotes = downvotes;
        memThread.score = newScore;
      }

      const broadcastPayload = {
        type: 'thread_voted',
        threadId,
        score: newScore,
        upvotes,
        downvotes,
        direction: voteType,
        triggeringClientId: activeClientId,
        timestamp: new Date().toISOString(),
      };

      broadcastForumSSE(broadcastPayload);
      broadcastForumSSE({
        type: 'leaderboard_updated',
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        threadId,
        score: newScore,
        upvotes,
        downvotes,
        userVote: newUserVote,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Greška pri glasanju na temi.',
      });
    }
  }
);

/**
 * 5.1 POST /api/forum/threads/:id/poll-vote
 * Persist poll votes to PostgreSQL (forum_threads.poll JSONB) and broadcast via SSE
 */
router.post(
  '/threads/:id/poll-vote',
  voteRateLimiter,
  optionalAuth,
  validateBody(ForumPollVoteSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: threadId } = req.params;
      const { optionId, clientId } = req.body;
      const activeClientId =
        req.user?.sub ||
        clientId ||
        (req.headers['x-client-id'] as string) ||
        'anon_' + (req.ip || 'client');
      const voteKey = `${threadId}_${activeClientId}`;

      const client = getAdminSupabaseClient();
      let threadData: any = null;

      try {
        const { data } = await client
          .from('forum_threads')
          .select('id, poll')
          .eq('id', threadId)
          .maybeSingle();
        if (data) threadData = data;
      } catch {}

      const memThread = serverThreads.find((t) => t.id === threadId);
      const poll = threadData?.poll || memThread?.poll;

      if (!poll || !Array.isArray(poll.options)) {
        res.status(404).json({ success: false, error: 'Anketa nije pronađena.' });
        return;
      }

      const previousOptionId = serverPollVotes.get(voteKey);
      if (previousOptionId === optionId) {
        res.json({ success: true, poll, userPollVote: optionId });
        return;
      }

      if (previousOptionId) {
        const prevOpt = poll.options.find((o: any) => o.id === previousOptionId);
        if (prevOpt) prevOpt.votes = Math.max(0, (prevOpt.votes || 1) - 1);
      } else {
        poll.totalVotes = (poll.totalVotes || 0) + 1;
      }

      const selectedOpt = poll.options.find((o: any) => o.id === optionId);
      if (!selectedOpt) {
        res.status(400).json({ success: false, error: 'Nepostojeća opcija ankete.' });
        return;
      }
      selectedOpt.votes = (selectedOpt.votes || 0) + 1;
      serverPollVotes.set(voteKey, optionId);

      if (memThread) {
        memThread.poll = poll;
      }

      try {
        await client
          .from('forum_threads')
          .update({ poll, updated_at: new Date().toISOString() })
          .eq('id', threadId);
      } catch {}

      broadcastForumSSE({
        type: 'poll_voted',
        threadId,
        poll,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, poll, userPollVote: optionId });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri glasanju u anketi.' });
    }
  }
);

/**
 * 6. POST /api/forum/replies/:id/vote
 * Rate-limited and Zod-validated reply voting
 */
router.post(
  '/replies/:id/vote',
  voteRateLimiter,
  optionalAuth,
  validateBody(ForumVoteSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: replyId } = req.params;
      const { voteType, clientId } = req.body;
      const activeClientId =
        req.user?.sub ||
        clientId ||
        (req.headers['x-client-id'] as string) ||
        'anon_' + (req.ip || 'client');
      const voteKey = `${replyId}_${activeClientId}`;

      let newUserVote: 'up' | 'down' | null = null;
      const client = getAdminSupabaseClient();

      let existingVote = serverVotes.get(voteKey);
      try {
        const { data: dbVote } = await client
          .from('forum_votes')
          .select('vote_type')
          .eq('target_id', replyId)
          .eq('client_id', activeClientId)
          .maybeSingle();
        if (dbVote) existingVote = dbVote.vote_type;
      } catch {}

      if (existingVote === voteType) {
        serverVotes.delete(voteKey);
        newUserVote = null;
        try {
          await client
            .from('forum_votes')
            .delete()
            .eq('target_id', replyId)
            .eq('client_id', activeClientId);
        } catch {}
      } else {
        serverVotes.set(voteKey, voteType);
        newUserVote = voteType;
        try {
          await client.from('forum_votes').upsert(
            {
              target_id: replyId,
              target_type: 'reply',
              client_id: activeClientId,
              vote_type: voteType,
            },
            { onConflict: 'target_id,client_id' }
          );
        } catch {}
      }

      let upvotes = 0;
      let downvotes = 0;
      try {
        const { data: allVotes } = await client
          .from('forum_votes')
          .select('vote_type')
          .eq('target_id', replyId);

        if (allVotes && allVotes.length > 0) {
          allVotes.forEach((v: any) => {
            if (v.vote_type === 'up') upvotes++;
            if (v.vote_type === 'down') downvotes++;
          });
        } else {
          serverVotes.forEach((v, k) => {
            if (k.startsWith(`${replyId}_`)) {
              if (v === 'up') upvotes++;
              if (v === 'down') downvotes++;
            }
          });
        }
      } catch {
        serverVotes.forEach((v, k) => {
          if (k.startsWith(`${replyId}_`)) {
            if (v === 'up') upvotes++;
            if (v === 'down') downvotes++;
          }
        });
      }

      const newScore = upvotes - downvotes;

      try {
        await client
          .from('forum_replies')
          .update({
            upvotes,
            downvotes,
            score: newScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', replyId);
      } catch {}

      broadcastForumSSE({
        type: 'reply_voted',
        replyId,
        score: newScore,
        upvotes,
        downvotes,
        direction: voteType,
        triggeringClientId: activeClientId,
        timestamp: new Date().toISOString(),
      });
      broadcastForumSSE({
        type: 'leaderboard_updated',
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        replyId,
        score: newScore,
        upvotes,
        downvotes,
        userVote: newUserVote,
      });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri glasanju na odgovoru.' });
    }
  }
);

/**
 * 7. POST /api/forum/threads/:id/replies
 * Rate-limited, Zod-validated, XSS-sanitized reply creation.
 */
router.post(
  '/threads/:id/replies',
  commentRateLimiter,
  optionalAuth,
  validateBody(CreateForumReplySchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: threadId } = req.params;
      const { parentId, content, authorName, authorAvatar, mentions } = req.body;

      // Check if thread is locked
      const memThread = serverThreads.find((t) => t.id === threadId);
      if (memThread?.is_locked && !isOwnerOrModerator(req)) {
        res.status(403).json({
          success: false,
          error: 'Ova tema je zaključana za nove odgovore.',
        });
        return;
      }

      const verifiedUser = req.user;
      const verifiedRole =
        verifiedUser && String(verifiedUser.role).toLowerCase() === 'admin'
          ? 'Admin'
          : verifiedUser && String(verifiedUser.role).toLowerCase() === 'moderator'
          ? 'Moderator'
          : 'Član';

      const newReply = {
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        thread_id: threadId,
        parent_id: parentId || null,
        author_id: verifiedUser?.sub || verifiedUser?.userId || 'usr_anon',
        author_name: sanitizePlainText(
          authorName || verifiedUser?.username || 'Član Zajednice'
        ),
        author_role: verifiedRole,
        author_avatar: authorAvatar || null,
        author_karma: 25,
        content: sanitizeRichContent(content),
        upvotes: 0,
        downvotes: 0,
        score: 0,
        mentions: mentions || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        const client = getAdminSupabaseClient();
        await client.from('forum_replies').insert(newReply);
        try {
          await client.rpc('increment_thread_replies', { thread_id_param: threadId });
        } catch {
          const { count } = await client
            .from('forum_replies')
            .select('id', { count: 'exact', head: true })
            .eq('thread_id', threadId);

          await client
            .from('forum_threads')
            .update({
              reply_count: count ?? 1,
              last_activity_at: new Date().toISOString(),
            })
            .eq('id', threadId);
        }
      } catch (dbErr) {
        console.warn('Database forum reply insert error:', dbErr);
      }

      serverReplies.push(newReply);

      broadcastForumSSE({
        type: 'reply_added',
        threadId,
        reply: formatReplyResponse(newReply),
        timestamp: new Date().toISOString(),
      });
      broadcastForumSSE({
        type: 'leaderboard_updated',
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ success: true, data: formatReplyResponse(newReply) });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri dodavanju odgovora.' });
    }
  }
);

// =========================================================================
// ADMIN & AUTHOR MODERATION ENDPOINTS (Protected by JWT Auth & RBAC)
// =========================================================================

/**
 * 8. DELETE /api/forum/threads/:id
 * Delete a thread (Requires Moderator/Admin or Thread Author)
 */
router.delete(
  '/threads/:id',
  requireAuth,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: threadId } = req.params;
      const client = getAdminSupabaseClient();

      // Check ownership if not moderator/admin
      if (
        String(req.user?.role).toLowerCase() !== 'admin' &&
        String(req.user?.role).toLowerCase() !== 'moderator'
      ) {
        const memThread = serverThreads.find((t) => t.id === threadId);
        let dbThread: any = null;
        try {
          const { data } = await client
            .from('forum_threads')
            .select('author_id, author_name')
            .eq('id', threadId)
            .maybeSingle();
          dbThread = data;
        } catch {}

        const targetAuthorId = dbThread?.author_id || memThread?.author_id;
        const targetAuthorName = dbThread?.author_name || memThread?.author_name;

        if (!isOwnerOrModerator(req, targetAuthorId, targetAuthorName)) {
          res.status(403).json({
            success: false,
            error: 'Pristup odbijen: Možete obrisati samo sopstvene teme.',
          });
          return;
        }
      }

      try {
        await client.from('forum_votes').delete().eq('target_id', threadId);
        await client.from('forum_replies').delete().eq('thread_id', threadId);
        await client.from('forum_threads').delete().eq('id', threadId);
      } catch (dbErr) {
        console.warn('Database delete thread fallback error:', dbErr);
      }

      const threadIdx = serverThreads.findIndex((t) => t.id === threadId);
      if (threadIdx !== -1) {
        serverThreads.splice(threadIdx, 1);
      }

      for (let i = serverReplies.length - 1; i >= 0; i--) {
        if (serverReplies[i].thread_id === threadId) {
          serverReplies.splice(i, 1);
        }
      }

      broadcastForumSSE({
        type: 'thread_deleted',
        threadId,
        timestamp: new Date().toISOString(),
      });
      broadcastForumSSE({
        type: 'leaderboard_updated',
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, message: 'Tema je uspešno obrisana sa foruma.' });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err?.message || 'Greška pri brisanju teme.',
      });
    }
  }
);

/**
 * 9. PUT /api/forum/threads/:id
 * Edit an existing thread (Requires Moderator/Admin or Thread Author)
 */
router.put(
  '/threads/:id',
  requireAuth,
  strictWriteRateLimiter,
  validateBody(UpdateForumThreadSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: threadId } = req.params;
      const { title, content, subforumId, tags, isPinned, isLocked } = req.body;
      const client = getAdminSupabaseClient();

      const isMod =
        String(req.user?.role).toLowerCase() === 'admin' ||
        String(req.user?.role).toLowerCase() === 'moderator';

      if (!isMod) {
        const memThread = serverThreads.find((t) => t.id === threadId);
        let dbThread: any = null;
        try {
          const { data } = await client
            .from('forum_threads')
            .select('author_id, author_name')
            .eq('id', threadId)
            .maybeSingle();
          dbThread = data;
        } catch {}

        if (
          !isOwnerOrModerator(
            req,
            dbThread?.author_id || memThread?.author_id,
            dbThread?.author_name || memThread?.author_name
          )
        ) {
          res.status(403).json({
            success: false,
            error: 'Pristup odbijen: Nemate dozvolu za izmenu ove teme.',
          });
          return;
        }
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title) updates.title = sanitizePlainText(title);
      if (content) updates.content = sanitizeRichContent(content);
      if (subforumId) updates.subforum_id = subforumId;
      if (tags) updates.tags = tags;
      // Only moderators/admins can change pin/lock flags
      if (isMod && typeof isPinned === 'boolean') updates.is_pinned = isPinned;
      if (isMod && typeof isLocked === 'boolean') updates.is_locked = isLocked;

      try {
        await client.from('forum_threads').update(updates).eq('id', threadId);
      } catch {}

      const thread = serverThreads.find((t) => t.id === threadId);
      if (thread) {
        Object.assign(thread, updates);
      }

      broadcastForumSSE({
        type: 'thread_updated',
        threadId,
        updates,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, data: thread || updates });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri ažuriranju teme.' });
    }
  }
);

/**
 * 10. PATCH /api/forum/threads/:id/pin
 * Toggle pinned status of thread (Moderator/Admin only)
 */
router.patch(
  '/threads/:id/pin',
  requireModerator,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: threadId } = req.params;
      const client = getAdminSupabaseClient();

      let newPinned = false;
      const thread = serverThreads.find((t) => t.id === threadId);
      if (thread) {
        thread.is_pinned = !thread.is_pinned;
        newPinned = thread.is_pinned;
      } else {
        try {
          const { data } = await client
            .from('forum_threads')
            .select('is_pinned')
            .eq('id', threadId)
            .maybeSingle();
          newPinned = !(data?.is_pinned ?? false);
        } catch {
          newPinned = true;
        }
      }

      try {
        await client
          .from('forum_threads')
          .update({ is_pinned: newPinned })
          .eq('id', threadId);
      } catch {}

      broadcastForumSSE({
        type: 'thread_updated',
        threadId,
        updates: { is_pinned: newPinned },
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, isPinned: newPinned });
    } catch {
      res
        .status(500)
        .json({ success: false, error: 'Greška pri promeni statusa pinovanja.' });
    }
  }
);

/**
 * 11. PATCH /api/forum/threads/:id/lock
 * Toggle locked status of thread (Moderator/Admin only)
 */
router.patch(
  '/threads/:id/lock',
  requireModerator,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: threadId } = req.params;
      const client = getAdminSupabaseClient();

      let newLocked = false;
      const thread = serverThreads.find((t) => t.id === threadId);
      if (thread) {
        thread.is_locked = !thread.is_locked;
        newLocked = thread.is_locked;
      } else {
        try {
          const { data } = await client
            .from('forum_threads')
            .select('is_locked')
            .eq('id', threadId)
            .maybeSingle();
          newLocked = !(data?.is_locked ?? false);
        } catch {
          newLocked = true;
        }
      }

      try {
        await client
          .from('forum_threads')
          .update({ is_locked: newLocked })
          .eq('id', threadId);
      } catch {}

      broadcastForumSSE({
        type: 'thread_updated',
        threadId,
        updates: { is_locked: newLocked },
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, isLocked: newLocked });
    } catch {
      res
        .status(500)
        .json({ success: false, error: 'Greška pri promeni statusa zaključavanja.' });
    }
  }
);

/**
 * 12. DELETE /api/forum/replies/:id
 * Delete a comment/reply from forum (Requires Moderator/Admin or Reply Author)
 */
router.delete(
  '/replies/:id',
  requireAuth,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id: replyId } = req.params;
      const client = getAdminSupabaseClient();

      const isMod =
        String(req.user?.role).toLowerCase() === 'admin' ||
        String(req.user?.role).toLowerCase() === 'moderator';

      if (!isMod) {
        const memReply = serverReplies.find((r) => r.id === replyId);
        let dbReply: any = null;
        try {
          const { data } = await client
            .from('forum_replies')
            .select('author_id, author_name')
            .eq('id', replyId)
            .maybeSingle();
          dbReply = data;
        } catch {}

        if (
          !isOwnerOrModerator(
            req,
            dbReply?.author_id || memReply?.author_id,
            dbReply?.author_name || memReply?.author_name
          )
        ) {
          res.status(403).json({
            success: false,
            error: 'Pristup odbijen: Možete obrisati samo sopstveni odgovor.',
          });
          return;
        }
      }

      try {
        await client.from('forum_votes').delete().eq('target_id', replyId);
        await client.from('forum_replies').delete().eq('id', replyId);
      } catch {}

      const replyIdx = serverReplies.findIndex((r) => r.id === replyId);
      let threadId = '';
      if (replyIdx !== -1) {
        threadId = serverReplies[replyIdx].thread_id;
        serverReplies.splice(replyIdx, 1);
      }

      if (threadId) {
        const parentThread = serverThreads.find((t) => t.id === threadId);
        if (parentThread) {
          parentThread.reply_count = Math.max(0, (parentThread.reply_count || 1) - 1);
        }
      }

      broadcastForumSSE({
        type: 'reply_deleted',
        replyId,
        threadId,
        timestamp: new Date().toISOString(),
      });
      broadcastForumSSE({
        type: 'leaderboard_updated',
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, message: 'Odgovor je obrisan.' });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri brisanju odgovora.' });
    }
  }
);

// =========================================================================
// SUBFORUMS MANAGEMENT CRUD (Admin Only)
// =========================================================================

/**
 * 13. POST /api/forum/subforums
 */
router.post(
  '/subforums',
  requireAdmin,
  strictWriteRateLimiter,
  validateBody(CreateSubforumSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, slug, description, icon, color, badge, display_order } = req.body;

      const cleanSlug =
        slug ||
        name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const id = cleanSlug;
      const newSub = {
        id,
        name: sanitizePlainText(name),
        slug: cleanSlug,
        description: sanitizePlainText(description || ''),
        icon: icon || 'Layers',
        color: color || '#a855f7',
        badge: badge ? sanitizePlainText(badge) : null,
        display_order: display_order ?? serverSubforums.length + 1,
        created_at: new Date().toISOString(),
      };

      try {
        const client = getAdminSupabaseClient();
        await client.from('forum_subforums').upsert(newSub);
      } catch {}

      const existingIdx = serverSubforums.findIndex((s) => s.id === id);
      if (existingIdx !== -1) {
        serverSubforums[existingIdx] = newSub;
      } else {
        serverSubforums.push(newSub);
      }

      broadcastForumSSE({
        type: 'subforums_updated',
        timestamp: new Date().toISOString(),
      });

      res.status(201).json({ success: true, data: newSub });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri kreiranju potforuma.' });
    }
  }
);

/**
 * 14. PUT /api/forum/subforums/:id
 */
router.put(
  '/subforums/:id',
  requireAdmin,
  strictWriteRateLimiter,
  validateBody(UpdateSubforumSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, slug, description, icon, color, badge, display_order } = req.body;

      const updates: Record<string, unknown> = {};
      if (name) updates.name = sanitizePlainText(name);
      if (slug) updates.slug = slug;
      if (description !== undefined) updates.description = sanitizePlainText(description);
      if (icon) updates.icon = icon;
      if (color) updates.color = color;
      if (badge !== undefined) updates.badge = badge ? sanitizePlainText(badge) : null;
      if (display_order !== undefined) updates.display_order = display_order;

      try {
        const client = getAdminSupabaseClient();
        await client.from('forum_subforums').update(updates).eq('id', id);
      } catch {}

      const sub = serverSubforums.find((s) => s.id === id);
      if (sub) {
        Object.assign(sub, updates);
      }

      broadcastForumSSE({
        type: 'subforums_updated',
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, data: sub || updates });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri izmeni potforuma.' });
    }
  }
);

/**
 * 15. DELETE /api/forum/subforums/:id
 */
router.delete(
  '/subforums/:id',
  requireAdmin,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (serverSubforums.length <= 1) {
        res.status(400).json({
          success: false,
          error: 'Mora postojati bar jedan aktivan potforum!',
        });
        return;
      }

      try {
        const client = getAdminSupabaseClient();
        await client.from('forum_subforums').delete().eq('id', id);
      } catch {}

      serverSubforums = serverSubforums.filter((s) => s.id !== id);

      broadcastForumSSE({
        type: 'subforums_updated',
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, message: 'Potforum je obrisan.' });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri brisanju potforuma.' });
    }
  }
);

// =========================================================================
// TOP FORUM MEMBERS (KARMA) MANAGEMENT CRUD
// =========================================================================

/**
 * 16. GET /api/forum/members
 */
router.get('/members', async (_req: Request, res: Response) => {
  try {
    const client = getAdminSupabaseClient();

    const [threadsRes, repliesRes, membersRes] = await Promise.all([
      client.from('forum_threads').select('author_name, score, upvotes').limit(1000),
      client.from('forum_replies').select('author_name, score, upvotes').limit(2000),
      client.from('forum_members').select('*').limit(500),
    ]);

    const threadsData: any[] =
      threadsRes.data && !threadsRes.error ? threadsRes.data : serverThreads;
    const repliesData: any[] =
      repliesRes.data && !repliesRes.error ? repliesRes.data : serverReplies;
    const dbMembers: any[] =
      membersRes.data && !membersRes.error ? membersRes.data : [];

    const membersMap = new Map<string, any>();

    if (dbMembers.length > 0) {
      dbMembers.forEach((m: any) => {
        const fallbackMem = serverCommunityMembers.get(m.name);
        membersMap.set(m.name, {
          name: m.name,
          role: m.role || 'Član',
          avatar:
            m.avatar ||
            fallbackMem?.avatar ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
          coverBanner:
            m.cover_banner ||
            fallbackMem?.coverBanner ||
            'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
          baseKarma: m.base_karma ?? (fallbackMem?.baseKarma ?? 50),
          isOnline: m.is_online ?? (fallbackMem?.isOnline ?? false),
          bio: m.bio || fallbackMem?.bio || '',
          gamingAccounts: {
            steamId: m.steam_id || fallbackMem?.gamingAccounts?.steamId || '',
            discordTag: m.discord_tag || fallbackMem?.gamingAccounts?.discordTag || '',
            twitch: m.twitch || fallbackMem?.gamingAccounts?.twitch || '',
            youtube: m.youtube || fallbackMem?.gamingAccounts?.youtube || '',
            psnId: m.psn_id || fallbackMem?.gamingAccounts?.psnId || '',
            xboxGamertag: m.xbox_gamertag || fallbackMem?.gamingAccounts?.xboxGamertag || '',
          },
          badges:
            Array.isArray(m.badges) && m.badges.length > 0
              ? m.badges
              : fallbackMem?.badges || [],
          threadCount: 0,
          replyCount: 0,
          threadScore: 0,
          replyScore: 0,
        });
      });
    } else {
      serverCommunityMembers.forEach((meta, name) => {
        membersMap.set(name, {
          name,
          role: meta.role,
          avatar: meta.avatar,
          coverBanner:
            meta.coverBanner ||
            'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
          baseKarma: meta.baseKarma,
          isOnline: meta.isOnline ?? false,
          bio: meta.bio || '',
          gamingAccounts: meta.gamingAccounts || {},
          badges: meta.badges || [],
          threadCount: 0,
          replyCount: 0,
          threadScore: 0,
          replyScore: 0,
        });
      });
    }

    threadsData.forEach((t) => {
      const name = t.author_name || 'Anonimni Gamer';
      const existing = membersMap.get(name) || {
        name,
        role: 'Član',
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        coverBanner:
          'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        baseKarma: 25,
        isOnline: false,
        bio: '',
        gamingAccounts: {},
        badges: [],
        threadCount: 0,
        replyCount: 0,
        threadScore: 0,
        replyScore: 0,
      };
      existing.threadCount += 1;
      existing.threadScore += t.score || 0;
      membersMap.set(name, existing);
    });

    repliesData.forEach((r) => {
      const name = r.author_name || 'Anonimni Gamer';
      const existing = membersMap.get(name) || {
        name,
        role: 'Član',
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        coverBanner:
          'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
        baseKarma: 25,
        isOnline: false,
        bio: '',
        gamingAccounts: {},
        badges: [],
        threadCount: 0,
        replyCount: 0,
        threadScore: 0,
        replyScore: 0,
      };
      existing.replyCount += 1;
      existing.replyScore += r.score || 0;
      membersMap.set(name, existing);
    });

    const list = Array.from(membersMap.values())
      .map((m) => {
        const totalKarma = Math.max(0, m.baseKarma + m.threadScore + m.replyScore);
        const evaluatedBadges = mergeBadges(
          m.badges || [],
          evaluateAutoBadges({
            role: m.role,
            karma: totalKarma,
            threadCount: m.threadCount,
            replyCount: m.replyCount,
          })
        );

        return {
          name: m.name,
          role: m.role,
          avatar: m.avatar,
          coverBanner: m.coverBanner,
          baseKarma: m.baseKarma,
          karma: totalKarma,
          threadCount: m.threadCount,
          replyCount: m.replyCount,
          isOnline: m.isOnline,
          bio: m.bio,
          gamingAccounts: m.gamingAccounts || {},
          badges: evaluatedBadges,
        };
      })
      .sort((a, b) => b.karma - a.karma)
      .map((item, idx) => ({ ...item, rank: idx + 1 }));

    res.json({ success: true, data: list });
  } catch {
    res.status(500).json({ success: false, error: 'Greška pri dohvatanju članova.' });
  }
});

/**
 * 16.1 GET /api/forum/members/:name
 *      Kompletan javni profil: osnovni podaci, reputacija, statistika,
 *      teme, odgovori i sačuvani članci — sve iz baze (uz in-memory fallback).
 */
router.get('/members/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const client = getAdminSupabaseClient();

    let memberData: any = null;
    try {
      const { data } = await client
        .from('forum_members')
        .select('*')
        .eq('name', name)
        .maybeSingle();
      if (data) memberData = data;
    } catch {}

    const memFallback = serverCommunityMembers.get(name);

    // Datum pridruživanja: forum_members.created_at, u suprotnom app_users.created_at
    let joinedDate: string | null = memberData?.created_at || null;
    if (!joinedDate) {
      try {
        const { data: appUser } = await client
          .from('app_users')
          .select('created_at')
          .eq('name', name)
          .maybeSingle();
        joinedDate = appUser?.created_at || null;
      } catch {}
    }

    const gamingAccounts = {
      steamId: memberData?.steam_id || memFallback?.gamingAccounts?.steamId || '',
      discordTag: memberData?.discord_tag || memFallback?.gamingAccounts?.discordTag || '',
      twitch: memberData?.twitch || memFallback?.gamingAccounts?.twitch || '',
      youtube: memberData?.youtube || memFallback?.gamingAccounts?.youtube || '',
      psnId: memberData?.psn_id || memFallback?.gamingAccounts?.psnId || '',
      xboxGamertag: memberData?.xbox_gamertag || memFallback?.gamingAccounts?.xboxGamertag || '',
    };

    const manualBadges = memberData?.badges || memFallback?.badges || [];

    // --- Teme: ukupan broj + zbir skora + poslednjih 20 ---
    let threadCount = 0;
    let threadScore = 0;
    let recentThreads: any[] = [];
    try {
      const [countRes, scoreRes, listRes] = await Promise.all([
        client.from('forum_threads').select('*', { count: 'exact', head: true }).eq('author_name', name),
        client.from('forum_threads').select('score').eq('author_name', name),
        client.from('forum_threads').select('*').eq('author_name', name).order('created_at', { ascending: false }).limit(20),
      ]);
      if (!countRes.error) threadCount = countRes.count || 0;
      if (!scoreRes.error) threadScore = (scoreRes.data || []).reduce((a: number, t: any) => a + (t.score || 0), 0);
      if (!listRes.error) recentThreads = listRes.data || [];
    } catch {}

    // --- Odgovori: ukupan broj + zbir skora + poslednjih 20 ---
    let replyCount = 0;
    let replyScore = 0;
    let recentReplies: any[] = [];
    try {
      const [countRes, scoreRes, listRes] = await Promise.all([
        client.from('forum_replies').select('*', { count: 'exact', head: true }).eq('author_name', name),
        client.from('forum_replies').select('score').eq('author_name', name),
        client.from('forum_replies').select('*').eq('author_name', name).order('created_at', { ascending: false }).limit(20),
      ]);
      if (!countRes.error) replyCount = countRes.count || 0;
      if (!scoreRes.error) replyScore = (scoreRes.data || []).reduce((a: number, r: any) => a + (r.score || 0), 0);
      if (!listRes.error) recentReplies = listRes.data || [];
    } catch {}

    // Fallback na in-memory store ako baza nije dostupna
    if (threadCount === 0 && recentThreads.length === 0) {
      const fallbackThreads = serverThreads.filter((t) => t.author_name === name || t.authorName === name);
      if (fallbackThreads.length > 0) {
        recentThreads = fallbackThreads;
        threadCount = fallbackThreads.length;
        threadScore = fallbackThreads.reduce((a, t) => a + (t.score || 0), 0);
      }
    }
    if (replyCount === 0 && recentReplies.length === 0) {
      const fallbackReplies = serverReplies.filter((r) => r.author_name === name || r.authorName === name);
      if (fallbackReplies.length > 0) {
        recentReplies = fallbackReplies;
        replyCount = fallbackReplies.length;
        replyScore = fallbackReplies.reduce((a, r) => a + (r.score || 0), 0);
      }
    }

    // --- Sačuvani članci (bookmarks) ---
    let savedPosts: any[] = [];
    try {
      const { data: bms } = await client
        .from('user_bookmarks')
        .select('post_id, created_at')
        .eq('user_name', name)
        .order('created_at', { ascending: false })
        .limit(100);

      const ids: number[] = (bms || []).map((b: any) => b.post_id).filter(Boolean);
      if (ids.length > 0) {
        const { data: posts } = await client
          .from('posts')
          .select('id, title, slug, excerpt, cover_image, category_id, status, created_at')
          .in('id', ids);

        const catIds = Array.from(new Set((posts || []).map((p: any) => p.category_id).filter(Boolean)));
        let catMap = new Map<number, any>();
        if (catIds.length > 0) {
          const { data: cats } = await client.from('categories').select('id, name, slug, color').in('id', catIds);
          catMap = new Map((cats || []).map((c: any) => [c.id, c]));
        }
        const order = new Map<number, number>(ids.map((id: number, i: number) => [id, i]));
        savedPosts = (posts || [])
          .map((p: any) => ({ ...p, category: catMap.get(p.category_id) || null }))
          .sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
      }
    } catch {}

    // --- Reputacija ---
    const baseKarma = memberData?.base_karma ?? (memFallback?.baseKarma ?? 50);
    const karma = Math.max(0, baseKarma + threadScore + replyScore);
    const tier = resolveKarmaTier(karma);
    const levelInfo = resolveLevelFromKarma(karma);

    const evaluatedBadges = mergeBadges(
      manualBadges,
      evaluateAutoBadges({
        role: memberData?.role || memFallback?.role,
        karma,
        threadCount,
        replyCount,
      })
    );

    const profile = {
      name,
      role: memberData?.role || memFallback?.role || 'Član',
      avatar:
        memberData?.avatar ||
        memFallback?.avatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      coverBanner:
        memberData?.cover_banner ||
        memFallback?.coverBanner ||
        'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      baseKarma,
      karma,
      reputation: {
        total: karma,
        base: baseKarma,
        fromThreads: threadScore,
        fromReplies: replyScore,
        tier,
        level: levelInfo.level,
        xp: karma,
        nextLevelXp: levelInfo.nextLevelXp,
        currentFloor: levelInfo.currentFloor,
        progressPercent: levelInfo.progressPercent,
      },
      threadCount,
      replyCount,
      savedCount: savedPosts.length,
      joinedDate,
      isOnline: memberData?.is_online ?? (memFallback?.isOnline ?? false),
      bio: memberData?.bio || memFallback?.bio || '',
      gamingAccounts,
      badges: evaluatedBadges,
      recentThreads: recentThreads.map(formatThreadResponse),
      recentReplies: recentReplies.map(formatReplyResponse),
      savedPosts,
    };

    res.json({ success: true, data: profile });
  } catch {
    res.status(500).json({ success: false, error: 'Greška pri dohvatanju profila člana.' });
  }
});

/**
 * 16.2 GET /api/forum/members/:name/bookmarks
 *      Javna lista sačuvanih članaka člana (isto kao profile.savedPosts).
 */
router.get('/members/:name/bookmarks', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const client = getAdminSupabaseClient();

    const { data: bms } = await client
      .from('user_bookmarks')
      .select('post_id, created_at')
      .eq('user_name', name)
      .order('created_at', { ascending: false })
      .limit(100);

    const ids: number[] = (bms || []).map((b: any) => b.post_id).filter(Boolean);
    if (ids.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }

    const { data: posts } = await client
      .from('posts')
      .select('id, title, slug, excerpt, cover_image, category_id, status, created_at')
      .in('id', ids);

    const catIds = Array.from(new Set((posts || []).map((p: any) => p.category_id).filter(Boolean)));
    let catMap = new Map<number, any>();
    if (catIds.length > 0) {
      const { data: cats } = await client.from('categories').select('id, name, slug, color').in('id', catIds);
      catMap = new Map((cats || []).map((c: any) => [c.id, c]));
    }
    const order = new Map<number, number>(ids.map((id: number, i: number) => [id, i]));
    const savedPosts = (posts || [])
      .map((p: any) => ({ ...p, category: catMap.get(p.category_id) || null }))
      .sort((a: any, b: any) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    res.json({ success: true, data: savedPosts });
  } catch {
    res.status(500).json({ success: false, error: 'Greška pri dohvatanju sačuvanih članaka.' });
  }
});

/**
 * 16.3 GET /api/forum/bookmarks
 *      ID-jevi članaka koje je sačuvao prijavljeni korisnik.
 */
router.get('/bookmarks', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userName = String((req.user as any)?.name || (req.user as any)?.username || '');
    if (!userName) {
      res.json({ success: true, data: [] });
      return;
    }
    const client = getAdminSupabaseClient();
    const { data } = await client
      .from('user_bookmarks')
      .select('post_id')
      .eq('user_name', userName)
      .order('created_at', { ascending: false })
      .limit(500);
    res.json({ success: true, data: (data || []).map((b: any) => b.post_id) });
  } catch {
    res.status(500).json({ success: false, error: 'Greška pri dohvatanju sačuvanih članaka.' });
  }
});

/**
 * 16.4 POST /api/forum/bookmarks
 *      Sačuvaj članak za prijavljenog korisnika (idempotentno).
 */
router.post(
  '/bookmarks',
  requireAuth,
  strictWriteRateLimiter,
  validateBody(BookmarkSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userName = String((req.user as any)?.name || (req.user as any)?.username || '');
      if (!userName) {
        res.status(401).json({ success: false, error: 'Nije moguće utvrditi korisnika.' });
        return;
      }
      const { postId } = req.body;
      const client = getAdminSupabaseClient();
      await client
        .from('user_bookmarks')
        .upsert({ user_name: userName, post_id: postId }, { onConflict: 'user_name,post_id' });
      res.json({ success: true, saved: true, postId });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri čuvanju članka.' });
    }
  }
);

/**
 * 16.5 DELETE /api/forum/bookmarks/:postId
 *      Ukloni sačuvani članak za prijavljenog korisnika.
 */
router.delete(
  '/bookmarks/:postId',
  requireAuth,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userName = String((req.user as any)?.name || (req.user as any)?.username || '');
      const postId = Number(req.params.postId);
      if (!userName || !Number.isFinite(postId)) {
        res.status(400).json({ success: false, error: 'Neispravan zahtev.' });
        return;
      }
      const client = getAdminSupabaseClient();
      await client.from('user_bookmarks').delete().eq('user_name', userName).eq('post_id', postId);
      res.json({ success: true, saved: false, postId });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri uklanjanju članka.' });
    }
  }
);

/**
 * 17. PUT /api/forum/members/:name
 * Update member profile (Requires Auth: Owner can update bio/avatar/gamingAccounts; Admin can update role/baseKarma/badges)
 */
router.put(
  '/members/:name',
  requireAuth,
  strictWriteRateLimiter,
  validateBody(UpdateForumMemberSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const { role, avatar, coverBanner, baseKarma, isOnline, bio, gamingAccounts, badges } =
        req.body;

      const isAdminUser =
        String(req.user?.role).toLowerCase() === 'admin' ||
        String(req.user?.role).toLowerCase() === 'moderator';

      if (!isAdminUser && !isOwnerOrModerator(req, undefined, name)) {
        res.status(403).json({
          success: false,
          error: 'Pristup odbijen: Možete uređivati samo sopstveni profil.',
        });
        return;
      }

      const client = getAdminSupabaseClient();

      // Učitaj postojećeg člana (iz memorije ili baze) da izmena profila
      // ne bi pregazila karmu, rolu ili bedževe koji već postoje.
      let mem = serverCommunityMembers.get(name);
      if (!mem) {
        let dbMem: any = null;
        try {
          const { data } = await client
            .from('forum_members')
            .select('*')
            .eq('name', name)
            .maybeSingle();
          dbMem = data;
        } catch {}

        mem = {
          role: dbMem?.role || 'Član',
          avatar:
            dbMem?.avatar ||
            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
          coverBanner:
            dbMem?.cover_banner ||
            'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
          baseKarma: dbMem?.base_karma ?? 50,
          isOnline: dbMem?.is_online ?? false,
          bio: dbMem?.bio || '',
          gamingAccounts: {
            steamId: dbMem?.steam_id || '',
            discordTag: dbMem?.discord_tag || '',
            twitch: dbMem?.twitch || '',
            youtube: dbMem?.youtube || '',
            psnId: dbMem?.psn_id || '',
            xboxGamertag: dbMem?.xbox_gamertag || '',
          },
          badges: Array.isArray(dbMem?.badges) ? dbMem.badges : [],
        };
      }

      // Only admins/moderators can modify roles, baseKarma, or badges directly
      if (isAdminUser && role) mem.role = sanitizePlainText(role);
      if (isAdminUser && typeof baseKarma === 'number') mem.baseKarma = baseKarma;
      if (isAdminUser && Array.isArray(badges)) mem.badges = badges;

      if (avatar) mem.avatar = avatar;
      if (coverBanner !== undefined) mem.coverBanner = coverBanner;
      if (typeof isOnline === 'boolean') mem.isOnline = isOnline;
      if (bio !== undefined) mem.bio = sanitizePlainText(bio);
      if (gamingAccounts) {
        // Zamena celog objekta (klijent uvek šalje kompletno stanje) — omogućava i uklanjanje naloga.
        mem.gamingAccounts = { ...gamingAccounts };
      }

      serverCommunityMembers.set(name, mem);

      try {
        await client.from('forum_members').upsert({
          name,
          role: mem.role,
          avatar: mem.avatar,
          cover_banner: mem.coverBanner,
          base_karma: mem.baseKarma,
          is_online: mem.isOnline,
          bio: mem.bio,
          steam_id: mem.gamingAccounts?.steamId || null,
          discord_tag: mem.gamingAccounts?.discordTag || null,
          twitch: mem.gamingAccounts?.twitch || null,
          youtube: mem.gamingAccounts?.youtube || null,
          psn_id: mem.gamingAccounts?.psnId || null,
          xbox_gamertag: mem.gamingAccounts?.xboxGamertag || null,
          badges: mem.badges || [],
          updated_at: new Date().toISOString(),
        });
      } catch {}

      broadcastForumSSE({
        type: 'leaderboard_updated',
        memberName: name,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, data: { name, ...mem } });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri ažuriranju člana.' });
    }
  }
);

/**
 * 17.1 POST /api/forum/members/:name/badges
 * Assign a badge to a member (Moderator/Admin only)
 */
router.post(
  '/members/:name/badges',
  requireModerator,
  strictWriteRateLimiter,
  validateBody(AssignBadgeSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const { badgeId, badgeName, description, icon, color, assignedBy } = req.body;

      const mem = serverCommunityMembers.get(name) || {
        role: 'Član',
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        baseKarma: 50,
        badges: [],
      };

      const newBadge = {
        id: badgeId || `b_${Date.now()}`,
        name: sanitizePlainText(badgeName || 'Badge'),
        description: sanitizePlainText(description || 'Zaslužena značka'),
        icon: icon || 'Award',
        color: color || '#a855f7',
        assignedBy: assignedBy || (req.user as any)?.name || (req.user as any)?.username || 'Admin',
        assignedAt: new Date().toISOString(),
      };

      const badges = mem.badges || [];
      const updatedBadges = [
        ...badges.filter((b: any) => b.id !== newBadge.id),
        newBadge,
      ];
      mem.badges = updatedBadges;
      serverCommunityMembers.set(name, mem);

      try {
        const client = getAdminSupabaseClient();
        await client.from('forum_members').upsert({
          name,
          badges: updatedBadges,
          updated_at: new Date().toISOString(),
        });
      } catch {}

      broadcastForumSSE({
        type: 'leaderboard_updated',
        memberName: name,
        badgeAdded: newBadge,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, data: updatedBadges });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri dodeli bedža.' });
    }
  }
);

/**
 * 17.2 DELETE /api/forum/members/:name/badges/:badgeId
 * Remove a badge from a member (Moderator/Admin only)
 */
router.delete(
  '/members/:name/badges/:badgeId',
  requireModerator,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, badgeId } = req.params;
      const client = getAdminSupabaseClient();
      let mem = serverCommunityMembers.get(name);
      if (!mem) {
        const { data: dbMem } = await client
          .from('forum_members')
          .select('*')
          .eq('name', name)
          .maybeSingle();
        if (dbMem) {
          mem = {
            role: dbMem.role || 'Član',
            avatar:
              dbMem.avatar ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
            baseKarma: dbMem.base_karma ?? 50,
            badges: dbMem.badges || [],
          };
        }
      }
      if (!mem) {
        res.status(404).json({ success: false, error: 'Član nije pronađen.' });
        return;
      }

      const updatedBadges = (mem.badges || []).filter((b: any) => b.id !== badgeId);
      mem.badges = updatedBadges;
      serverCommunityMembers.set(name, mem);

      try {
        await client.from('forum_members').upsert({
          name,
          badges: updatedBadges,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('DB badge delete error:', e);
      }

      broadcastForumSSE({
        type: 'leaderboard_updated',
        memberName: name,
        badgeRemoved: badgeId,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, data: updatedBadges });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri uklanjanju bedža.' });
    }
  }
);

/**
 * 18. POST /api/forum/members/:name/adjust-karma
 * Add or subtract karma points (Moderator/Admin only)
 */
router.post(
  '/members/:name/adjust-karma',
  requireModerator,
  strictWriteRateLimiter,
  validateBody(AdjustKarmaSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const { amount, reason } = req.body;
      const delta = Number(amount) || 0;
      const client = getAdminSupabaseClient();

      let mem = serverCommunityMembers.get(name);
      if (!mem) {
        const { data: dbMem } = await client
          .from('forum_members')
          .select('*')
          .eq('name', name)
          .maybeSingle();
        if (dbMem) {
          mem = {
            role: dbMem.role || 'Član',
            avatar:
              dbMem.avatar ||
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
            baseKarma: dbMem.base_karma ?? 50,
            isOnline: dbMem.is_online ?? false,
            bio: dbMem.bio || '',
          };
        } else {
          mem = {
            role: 'Član',
            avatar:
              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
            baseKarma: 50,
            isOnline: false,
            bio: '',
          };
        }
      }

      mem.baseKarma = Math.max(0, mem.baseKarma + delta);
      serverCommunityMembers.set(name, mem);

      try {
        await client.from('forum_members').upsert({
          name,
          role: mem.role,
          avatar: mem.avatar,
          base_karma: mem.baseKarma,
          is_online: mem.isOnline,
          bio: mem.bio,
          updated_at: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('DB adjust karma error:', e);
      }

      broadcastForumSSE({
        type: 'leaderboard_updated',
        memberName: name,
        delta,
        reason,
        timestamp: new Date().toISOString(),
      });

      res.json({ success: true, newBaseKarma: mem.baseKarma });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri izmeni karme.' });
    }
  }
);

/**
 * 19. POST /api/forum/members/:name/reset-karma
 * Reset member's base karma to 0 (Moderator/Admin only)
 */
router.post(
  '/members/:name/reset-karma',
  requireModerator,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      const mem = serverCommunityMembers.get(name) || {
        role: 'Član',
        avatar:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        baseKarma: 50,
        isOnline: false,
        bio: '',
      };

      mem.baseKarma = 0;
      serverCommunityMembers.set(name, mem);

      try {
        const client = getAdminSupabaseClient();
        await client.from('forum_members').upsert({
          name,
          role: mem.role,
          avatar: mem.avatar,
          base_karma: 0,
          is_online: mem.isOnline,
          bio: mem.bio,
          updated_at: new Date().toISOString(),
        });
      } catch {}

      broadcastForumSSE({
        type: 'leaderboard_updated',
        memberName: name,
        reset: true,
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: `Karma za ${name} je resetovana na 0.`,
      });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri resetovanju karme.' });
    }
  }
);

/**
 * 20. DELETE /api/forum/members/:name
 * Delete member from forum directory (Admin only)
 */
router.delete(
  '/members/:name',
  requireAdmin,
  strictWriteRateLimiter,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name } = req.params;
      serverCommunityMembers.delete(name);

      try {
        const client = getAdminSupabaseClient();
        await client.from('forum_members').delete().eq('name', name);
      } catch {}

      broadcastForumSSE({
        type: 'leaderboard_updated',
        timestamp: new Date().toISOString(),
      });

      res.json({
        success: true,
        message: `Član ${name} je uklonjen iz baze foruma.`,
      });
    } catch {
      res.status(500).json({ success: false, error: 'Greška pri brisanju člana.' });
    }
  }
);

export default router;
