import {
  ForumSubforum,
  ForumSubforumId,
  ForumThread,
  ForumReply,
  ThreadSortOption,
  VoteType,
  ForumPoll,
  ForumMemberKarma,
} from '../types';
import { StorageService } from './storage';
import { ApiAuth } from './apiAuth';

const FORUM_STORAGE_KEYS = {
  THREADS: 'nexus_forum_threads_v1',
  REPLIES: 'nexus_forum_replies_v1',
  VOTES: 'nexus_forum_votes_v1',
  POLL_VOTES: 'nexus_forum_poll_votes_v1',
};

function getAuthHeaders(includeJsonContentType = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJsonContentType) {
    headers['Content-Type'] = 'application/json';
  }
  const token = ApiAuth.getStoredAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const FORUM_SUBFORUMS: ForumSubforum[] = [
  {
    id: 'pc-gaming',
    name: 'PC Gaming',
    slug: 'pc-gaming',
    description: 'Diskusije o PC naslovima, modifikacijama, Steam/Epic rasprodajama i optimizacijama.',
    icon: 'Monitor',
    color: '#22d3ee',
    badge: 'Popularno',
    threadCount: 24,
    replyCount: 182,
    latestActivity: {
      threadTitle: 'Optimizacije za Cyberpunk i Unreal Engine 5 igre na novim drajverima',
      threadSlug: 'optimizacije-cyberpunk-ue5-novi-drajveri',
      authorName: 'CyberGeek_RS',
      time: 'pre 12 min',
    },
  },
  {
    id: 'consoles',
    name: 'Konzole (PlayStation / Xbox / Switch)',
    slug: 'consoles',
    description: 'Sve o PlayStation 5, Xbox Series X/S, Nintendo Switch nasledniku i ekskluzivama.',
    icon: 'Gamepad2',
    color: '#a855f7',
    threadCount: 18,
    replyCount: 135,
    latestActivity: {
      threadTitle: 'PS5 Pro iskustva: Da li je PSSR opravdao očekivanja u praksi?',
      threadSlug: 'ps5-pro-iskustva-pssr-analiza',
      authorName: 'SonySamurai',
      time: 'pre 45 min',
    },
  },
  {
    id: 'esports',
    name: 'Esports & Turniri',
    slug: 'esports',
    description: 'Takmičarski gejming: CS2, Valorant, League of Legends, Dota 2, transferi i analize mečeva.',
    icon: 'Trophy',
    color: '#f59e0b',
    badge: 'Vruće',
    threadCount: 31,
    replyCount: 248,
    latestActivity: {
      threadTitle: 'CS2 Major: Analiza taktika i promena u meta postavkama na Mirage mapi',
      threadSlug: 'cs2-major-analiza-taktika-meta',
      authorName: 'AwpMaster99',
      time: 'pre 5 min',
    },
  },
  {
    id: 'hardware',
    name: 'Gaming Hardver & Tehnologija',
    slug: 'hardware',
    description: 'Grafičke karte, procesori, OLED monitori, custom PC konfiguracije i hlađenje.',
    icon: 'Cpu',
    color: '#10b981',
    threadCount: 15,
    replyCount: 94,
    latestActivity: {
      threadTitle: 'RTX 5080 vs RTX 4090: Poređenje performansi i potrošnje u 4K',
      threadSlug: 'rtx-5080-vs-rtx-4090-poređenje',
      authorName: 'Vlado_Overclock',
      time: 'pre 2 sata',
    },
  },
  {
    id: 'lfg',
    name: 'LFG (Looking For Group) / Guild Finder',
    slug: 'lfg',
    description: 'Pronađite saigrače za Ranked, timove za turnire, WoW gildije ili Co-Op avanture.',
    icon: 'Users',
    color: '#ec4899',
    badge: 'LFG',
    threadCount: 22,
    replyCount: 110,
    latestActivity: {
      threadTitle: '[LFG][PC/EU] Tražimo 2 igrača za večernje Valorant Ranked sesije (Ascendant+)',
      threadSlug: 'lfg-valorant-ranked-ascendant-eu',
      authorName: 'JettDuelist',
      time: 'pre 28 min',
    },
  },
  {
    id: 'off-topic',
    name: 'Off-Topic & Gamer Lounge',
    slug: 'off-topic',
    description: 'Slobodne diskusije o filmovima, muzici, mimovima, gaming kutku i opuštenim temama.',
    icon: 'Coffee',
    color: '#6366f1',
    threadCount: 12,
    replyCount: 68,
    latestActivity: {
      threadTitle: 'Gaming setup 2026: Pokažite gde provodite gejming večeri',
      threadSlug: 'gaming-setup-2026-slike-radnih-stolova',
      authorName: 'Nemanja_BG',
      time: 'pre 3 sata',
    },
  },
];

const INITIAL_THREADS: ForumThread[] = [];
const INITIAL_REPLIES: ForumReply[] = [];

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSet<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage write error for key ' + key, e);
  }
}

export const ForumService = {
  init() {
    try {
      const raw = localStorage.getItem(FORUM_STORAGE_KEYS.THREADS);
      if (!raw) {
        safeSet(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
      }
    } catch {
      safeSet(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    }
    if (!localStorage.getItem(FORUM_STORAGE_KEYS.REPLIES)) {
      safeSet(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);
    }
    if (!localStorage.getItem(FORUM_STORAGE_KEYS.VOTES)) {
      safeSet(FORUM_STORAGE_KEYS.VOTES, {});
    }
    if (!localStorage.getItem(FORUM_STORAGE_KEYS.POLL_VOTES)) {
      safeSet(FORUM_STORAGE_KEYS.POLL_VOTES, {});
    }
  },

  // Subforums
  getSubforums(): ForumSubforum[] {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const replies = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);

    return FORUM_SUBFORUMS.map(sub => {
      const subThreads = threads.filter(t => t.subforumId === sub.id);
      const subReplies = replies.filter(r => {
        const parentThread = threads.find(t => t.id === r.threadId);
        return parentThread?.subforumId === sub.id;
      });

      const sorted = [...subThreads].sort(
        (a, b) =>
          new Date(b.lastActivityAt || b.createdAt).getTime() -
          new Date(a.lastActivityAt || a.createdAt).getTime()
      );
      const latest = sorted[0];

      return {
        ...sub,
        threadCount: subThreads.length,
        replyCount: subReplies.length,
        latestActivity: latest
          ? {
              threadTitle: latest.title,
              threadSlug: latest.slug,
              authorName: latest.authorName,
              time: this.formatRelativeTime(latest.lastActivityAt || latest.createdAt),
            }
          : undefined,
      };
    });
  },

  async getSubforumsAsync(): Promise<ForumSubforum[]> {
    try {
      const res = await fetch('/api/forum/subforums', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {
      // Fallback to local calculation
    }
    return this.getSubforums();
  },

  getSubforumById(id: string): ForumSubforum | undefined {
    return this.getSubforums().find(s => s.id === id || s.slug === id);
  },

  // Real-time Leaderboard calculation for 'Top Forum Members (Karma)'
  getLeaderboard(): ForumMemberKarma[] {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const replies = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);

    const authorsMap = new Map<
      string,
      {
        name: string;
        role: string;
        avatar: string;
        baseKarma: number;
        threadScore: number;
        replyScore: number;
        threadCount: number;
        replyCount: number;
      }
    >();

    const BASE_COMMUNITY_MEMBERS: Record<string, { role: string; avatar: string; baseKarma: number }> = {
      AwpMaster99: {
        role: 'Moderator',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=120&q=80',
        baseKarma: 250,
      },
      Vlado_Overclock: {
        role: 'Hardver Guru',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
        baseKarma: 120,
      },
      Marko_Gamer: {
        role: 'Član',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        baseKarma: 110,
      },
      CyberGeek_RS: {
        role: 'Član',
        avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=120&q=80',
        baseKarma: 90,
      },
      SonySamurai: {
        role: 'Član',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
        baseKarma: 55,
      },
      JettDuelist: {
        role: 'Član',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
        baseKarma: 45,
      },
      Nemanja_BG: {
        role: 'Član',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
        baseKarma: 50,
      },
    };

    Object.entries(BASE_COMMUNITY_MEMBERS).forEach(([name, meta]) => {
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

    threads.forEach(t => {
      const existing = authorsMap.get(t.authorName) || {
        name: t.authorName,
        role: t.authorRole || 'Član',
        avatar:
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
      authorsMap.set(t.authorName, existing);
    });

    replies.forEach(r => {
      const existing = authorsMap.get(r.authorName) || {
        name: r.authorName,
        role: r.authorRole || 'Član',
        avatar:
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
      authorsMap.set(r.authorName, existing);
    });

    return Array.from(authorsMap.values())
      .map(a => ({
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
  },

  async getLeaderboardAsync(): Promise<ForumMemberKarma[]> {
    try {
      const res = await fetch('/api/forum/leaderboard', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          return json.data;
        }
      }
    } catch {}
    return this.getLeaderboard();
  },

  async getThreadsAsync(options?: {
    subforumId?: string;
    sortBy?: ThreadSortOption;
    search?: string;
    tag?: string;
    clientId?: string;
  }): Promise<ForumThread[]> {
    try {
      const params = new URLSearchParams();
      if (options?.subforumId) params.set('subforumId', options.subforumId);
      if (options?.sortBy) params.set('sort', options.sortBy);
      if (options?.tag) params.set('tag', options.tag);
      if (options?.search) params.set('search', options.search);

      const res = await fetch(`/api/forum/threads?${params.toString()}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const userVotes = safeGet<Record<string, VoteType>>(FORUM_STORAGE_KEYS.VOTES, {});
          const activeClientId = options?.clientId || StorageService.getClientId();
          return json.data.map((t: ForumThread) => {
            const voteKey = `${t.id}_${activeClientId}`;
            return {
              ...t,
              userVote: userVotes[voteKey] || null,
            };
          });
        }
      }
    } catch {}
    return this.getThreads(options);
  },

  // Threads
  getThreads(options?: {
    subforumId?: string;
    sortBy?: ThreadSortOption;
    search?: string;
    tag?: string;
    clientId?: string;
  }): ForumThread[] {
    this.init();
    let threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const userVotes = safeGet<Record<string, VoteType>>(FORUM_STORAGE_KEYS.VOTES, {});
    const activeClientId = options?.clientId || StorageService.getClientId();

    threads = threads.map(t => {
      const voteKey = `${t.id}_${activeClientId}`;
      return {
        ...t,
        userVote: userVotes[voteKey] || null,
      };
    });

    if (options?.subforumId && options.subforumId !== 'all') {
      threads = threads.filter(
        t => t.subforumId === options.subforumId || t.slug === options.subforumId
      );
    }

    if (options?.tag) {
      const cleanTag = options.tag.toLowerCase().replace('#', '');
      threads = threads.filter(t => t.tags.some(tag => tag.toLowerCase() === cleanTag));
    }

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      threads = threads.filter(
        t =>
          t.title.toLowerCase().includes(q) ||
          t.content.toLowerCase().includes(q) ||
          t.authorName.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    const sortBy = options?.sortBy || 'hot';
    threads.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortBy === 'hot') {
        const ageA = (Date.now() - new Date(a.lastActivityAt).getTime()) / (1000 * 3600);
        const ageB = (Date.now() - new Date(b.lastActivityAt).getTime()) / (1000 * 3600);
        const scoreA = (a.score + 1) / Math.pow(ageA + 2, 1.3);
        const scoreB = (b.score + 1) / Math.pow(ageB + 2, 1.3);
        return scoreB - scoreA;
      } else if (sortBy === 'top') {
        return b.score - a.score;
      } else if (sortBy === 'discussed') {
        return b.replyCount - a.replyCount;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return threads;
  },

  getThreadBySlug(slug: string, clientId?: string): ForumThread | undefined {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const activeClientId = clientId || StorageService.getClientId();
    const userVotes = safeGet<Record<string, VoteType>>(FORUM_STORAGE_KEYS.VOTES, {});

    const found = threads.find(t => t.slug === slug || t.id === slug);
    if (!found) return undefined;

    const voteKey = `${found.id}_${activeClientId}`;
    return {
      ...found,
      userVote: userVotes[voteKey] || null,
    };
  },

  async getThreadBySlugAsync(slug: string, clientId?: string): Promise<ForumThread | undefined> {
    try {
      const res = await fetch(`/api/forum/threads/${encodeURIComponent(slug)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          const activeClientId = clientId || StorageService.getClientId();
          const userVotes = safeGet<Record<string, VoteType>>(FORUM_STORAGE_KEYS.VOTES, {});
          const voteKey = `${json.data.id}_${activeClientId}`;
          const enriched: ForumThread = {
            ...json.data,
            userVote: userVotes[voteKey] || null,
          };
          // Cache locally
          const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
          const idx = threads.findIndex(t => t.id === enriched.id || t.slug === enriched.slug);
          if (idx !== -1) {
            threads[idx] = enriched;
          } else {
            threads.unshift(enriched);
          }
          safeSet(FORUM_STORAGE_KEYS.THREADS, threads);
          return enriched;
        }
      }
    } catch {
      // Fallback to local
    }
    return this.getThreadBySlug(slug, clientId);
  },

  createThread(data: {
    title: string;
    subforumId: ForumSubforumId;
    content: string;
    tags: string[];
    authorName: string;
    authorAvatar?: string;
    authorRole?: string;
    pollQuestion?: string;
    pollOptions?: string[];
  }): ForumThread {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const now = new Date().toISOString();

    const slug =
      data.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Date.now().toString(36)}`;

    let poll: ForumPoll | undefined = undefined;
    if (
      data.pollQuestion &&
      data.pollOptions &&
      data.pollOptions.filter(o => o.trim()).length >= 2
    ) {
      poll = {
        id: `poll_${Date.now()}`,
        question: data.pollQuestion.trim(),
        options: data.pollOptions
          .filter(o => o.trim())
          .map((opt, i) => ({
            id: `opt_${Date.now()}_${i}`,
            text: opt.trim(),
            votes: 0,
          })),
        totalVotes: 0,
      };
    }

    const newThread: ForumThread = {
      id: `thr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: data.title.trim(),
      slug,
      subforumId: data.subforumId,
      authorId: 'usr_' + Date.now(),
      authorName: data.authorName.trim() || 'Novi Gejmer',
      authorRole: data.authorRole || 'Član',
      authorAvatar:
        data.authorAvatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      authorKarma: 10,
      content: data.content.trim(),
      tags: data.tags.filter(t => t.trim()).map(t => t.replace('#', '').trim()),
      poll,
      views: 0,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      userVote: null,
      replyCount: 0,
      isPinned: false,
      isLocked: false,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    };

    threads.unshift(newThread);
    safeSet(FORUM_STORAGE_KEYS.THREADS, threads);

    try {
      fetch('/api/forum/threads', {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({
          title: newThread.title,
          subforumId: newThread.subforumId,
          content: newThread.content,
          tags: newThread.tags,
          poll: newThread.poll,
          authorName: newThread.authorName,
          authorRole: newThread.authorRole,
          authorAvatar: newThread.authorAvatar,
        }),
      }).catch(e => console.warn('API DB sync thread exception:', e));
    } catch (e) {
      console.warn('API DB sync thread failed:', e);
    }

    this.broadcastForumUpdate({ type: 'thread_created', thread: newThread });
    return newThread;
  },

  voteThread(threadId: string, direction: 'up' | 'down', clientId?: string): ForumThread | null {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const userVotes = safeGet<Record<string, VoteType>>(FORUM_STORAGE_KEYS.VOTES, {});
    const activeClientId = clientId || StorageService.getClientId();
    const voteKey = `${threadId}_${activeClientId}`;

    const thread = threads.find(t => t.id === threadId);
    if (!thread) return null;

    const currentVote = userVotes[voteKey];

    if (currentVote === direction) {
      delete userVotes[voteKey];
      if (direction === 'up') {
        thread.upvotes = Math.max(0, thread.upvotes - 1);
      } else {
        thread.downvotes = Math.max(0, thread.downvotes - 1);
      }
    } else {
      if (currentVote === 'up') {
        thread.upvotes = Math.max(0, thread.upvotes - 1);
      } else if (currentVote === 'down') {
        thread.downvotes = Math.max(0, thread.downvotes - 1);
      }

      userVotes[voteKey] = direction;
      if (direction === 'up') {
        thread.upvotes += 1;
      } else {
        thread.downvotes += 1;
      }
    }

    thread.score = thread.upvotes - thread.downvotes;
    safeSet(FORUM_STORAGE_KEYS.THREADS, threads);
    safeSet(FORUM_STORAGE_KEYS.VOTES, userVotes);

    const updated = { ...thread, userVote: userVotes[voteKey] || null };

    try {
      fetch(`/api/forum/threads/${threadId}/vote`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ voteType: direction, clientId: activeClientId }),
      })
        .then(res => res.json())
        .then(json => {
          if (json.success && typeof json.score === 'number') {
            thread.score = json.score;
            thread.upvotes = json.upvotes ?? thread.upvotes;
            thread.downvotes = json.downvotes ?? thread.downvotes;
            safeSet(FORUM_STORAGE_KEYS.THREADS, threads);
          }
        })
        .catch(err => console.warn('Vote DB sync error:', err));
    } catch (e) {
      console.warn('Vote DB sync failed:', e);
    }

    this.broadcastForumUpdate({
      type: 'thread_voted',
      threadId,
      score: thread.score,
      upvotes: thread.upvotes,
      downvotes: thread.downvotes,
      userVote: updated.userVote,
      direction,
      triggeringClientId: activeClientId,
    });
    return updated;
  },

  // Poll voting
  votePoll(threadId: string, optionId: string, clientId?: string): ForumPoll | null {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const pollVotes = safeGet<Record<string, string>>(FORUM_STORAGE_KEYS.POLL_VOTES, {});
    const activeClientId = clientId || StorageService.getClientId();
    const voteKey = `${threadId}_${activeClientId}`;

    const thread = threads.find(t => t.id === threadId);
    if (!thread || !thread.poll) return null;

    const previousOptionId = pollVotes[voteKey];
    if (previousOptionId === optionId) {
      return thread.poll;
    }

    if (previousOptionId) {
      const prevOpt = thread.poll.options.find(o => o.id === previousOptionId);
      if (prevOpt) prevOpt.votes = Math.max(0, prevOpt.votes - 1);
    } else {
      thread.poll.totalVotes += 1;
    }

    const newOpt = thread.poll.options.find(o => o.id === optionId);
    if (newOpt) newOpt.votes += 1;

    pollVotes[voteKey] = optionId;

    safeSet(FORUM_STORAGE_KEYS.THREADS, threads);
    safeSet(FORUM_STORAGE_KEYS.POLL_VOTES, pollVotes);

    try {
      fetch(`/api/forum/threads/${threadId}/poll-vote`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ optionId, clientId: activeClientId }),
      }).catch(err => console.warn('Poll vote DB sync error:', err));
    } catch {}

    this.broadcastForumUpdate({ type: 'poll_voted', threadId, poll: thread.poll });
    return thread.poll;
  },

  getUserPollVote(threadId: string, clientId?: string): string | null {
    this.init();
    const pollVotes = safeGet<Record<string, string>>(FORUM_STORAGE_KEYS.POLL_VOTES, {});
    const activeClientId = clientId || StorageService.getClientId();
    return pollVotes[`${threadId}_${activeClientId}`] || null;
  },

  // Hierarchical Replies System
  getThreadReplies(threadId: string, clientId?: string): ForumReply[] {
    this.init();
    const allReplies = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);
    const userVotes = safeGet<Record<string, VoteType>>(FORUM_STORAGE_KEYS.VOTES, {});
    const activeClientId = clientId || StorageService.getClientId();

    const threadReplies = allReplies
      .filter(r => r.threadId === threadId)
      .map(r => {
        const voteKey = `${r.id}_${activeClientId}`;
        return {
          ...r,
          userVote: userVotes[voteKey] || null,
          replies: [] as ForumReply[],
        };
      });

    return this.buildReplyTree(threadReplies);
  },

  async getThreadRepliesAsync(threadId: string, clientId?: string): Promise<ForumReply[]> {
    try {
      const res = await fetch(`/api/forum/threads/${encodeURIComponent(threadId)}/replies`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const userVotes = safeGet<Record<string, VoteType>>(FORUM_STORAGE_KEYS.VOTES, {});
          const activeClientId = clientId || StorageService.getClientId();
          const mapped: ForumReply[] = json.data.map((r: ForumReply) => {
            const voteKey = `${r.id}_${activeClientId}`;
            return {
              ...r,
              userVote: userVotes[voteKey] || null,
              replies: [] as ForumReply[],
            };
          });
          // Sync with local cache
          const existing = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES).filter(
            r => r.threadId !== threadId
          );
          safeSet(FORUM_STORAGE_KEYS.REPLIES, [...existing, ...mapped]);
          return this.buildReplyTree(mapped);
        }
      }
    } catch {}
    return this.getThreadReplies(threadId, clientId);
  },

  buildReplyTree(threadReplies: ForumReply[]): ForumReply[] {
    const replyMap = new Map<string, ForumReply>();
    const rootReplies: ForumReply[] = [];

    threadReplies.forEach(r => {
      replyMap.set(r.id, { ...r, replies: [] });
    });

    replyMap.forEach(r => {
      if (r.parentId && replyMap.has(r.parentId)) {
        const parent = replyMap.get(r.parentId)!;
        if (!parent.replies) parent.replies = [];
        parent.replies.push(r);
      } else {
        rootReplies.push(r);
      }
    });

    const sortTree = (list: ForumReply[]) => {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      list.forEach(item => {
        if (item.replies && item.replies.length > 0) {
          sortTree(item.replies);
        }
      });
    };

    sortTree(rootReplies);
    return rootReplies;
  },

  addReply(data: {
    threadId: string;
    parentId?: string | null;
    content: string;
    authorName: string;
    authorAvatar?: string;
    authorRole?: string;
    mentions?: string[];
  }): ForumReply {
    this.init();
    const allReplies = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const now = new Date().toISOString();

    const detectedMentions: string[] = data.mentions || [];
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    let match;
    while ((match = mentionRegex.exec(data.content)) !== null) {
      if (!detectedMentions.includes(match[1])) {
        detectedMentions.push(match[1]);
      }
    }

    const newReply: ForumReply = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      threadId: data.threadId,
      parentId: data.parentId || null,
      authorId: 'usr_' + Date.now(),
      authorName: data.authorName.trim() || 'Član Zajednice',
      authorRole: data.authorRole || 'Član',
      authorAvatar:
        data.authorAvatar ||
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      authorKarma: 25,
      content: data.content.trim(),
      upvotes: 0,
      downvotes: 0,
      score: 0,
      userVote: null,
      createdAt: now,
      updatedAt: now,
      mentions: detectedMentions,
      replies: [],
    };

    allReplies.push(newReply);
    safeSet(FORUM_STORAGE_KEYS.REPLIES, allReplies);

    const thread = threads.find(t => t.id === data.threadId);
    if (thread) {
      thread.replyCount = (thread.replyCount || 0) + 1;
      thread.lastActivityAt = now;
      safeSet(FORUM_STORAGE_KEYS.THREADS, threads);
    }

    try {
      fetch(`/api/forum/threads/${data.threadId}/replies`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({
          parentId: newReply.parentId,
          content: newReply.content,
          authorName: newReply.authorName,
          authorRole: newReply.authorRole,
          authorAvatar: newReply.authorAvatar,
          mentions: newReply.mentions,
        }),
      }).catch(err => console.warn('Database forum reply sync error:', err));
    } catch (e) {
      console.warn('Database forum reply sync failed:', e);
    }

    this.broadcastForumUpdate({ type: 'reply_added', reply: newReply });
    return newReply;
  },

  voteReply(replyId: string, direction: 'up' | 'down', clientId?: string): ForumReply | null {
    this.init();
    const allReplies = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);
    const userVotes = safeGet<Record<string, VoteType>>(FORUM_STORAGE_KEYS.VOTES, {});
    const activeClientId = clientId || StorageService.getClientId();
    const voteKey = `${replyId}_${activeClientId}`;

    const reply = allReplies.find(r => r.id === replyId);
    if (!reply) return null;

    const currentVote = userVotes[voteKey];

    if (currentVote === direction) {
      delete userVotes[voteKey];
      if (direction === 'up') reply.upvotes = Math.max(0, reply.upvotes - 1);
      else reply.downvotes = Math.max(0, reply.downvotes - 1);
    } else {
      if (currentVote === 'up') reply.upvotes = Math.max(0, reply.upvotes - 1);
      else if (currentVote === 'down') reply.downvotes = Math.max(0, reply.downvotes - 1);

      userVotes[voteKey] = direction;
      if (direction === 'up') reply.upvotes += 1;
      else reply.downvotes += 1;
    }

    reply.score = reply.upvotes - reply.downvotes;
    safeSet(FORUM_STORAGE_KEYS.REPLIES, allReplies);
    safeSet(FORUM_STORAGE_KEYS.VOTES, userVotes);

    const updated = { ...reply, userVote: userVotes[voteKey] || null };

    try {
      fetch(`/api/forum/replies/${replyId}/vote`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ voteType: direction, clientId: activeClientId }),
      })
        .then(res => res.json())
        .then(json => {
          if (json.success && typeof json.score === 'number') {
            reply.score = json.score;
            reply.upvotes = json.upvotes ?? reply.upvotes;
            reply.downvotes = json.downvotes ?? reply.downvotes;
            safeSet(FORUM_STORAGE_KEYS.REPLIES, allReplies);
          }
        })
        .catch(err => console.warn('Reply vote DB sync error:', err));
    } catch (e) {
      console.warn('Reply vote DB sync failed:', e);
    }

    this.broadcastForumUpdate({
      type: 'reply_voted',
      replyId,
      score: reply.score,
      upvotes: reply.upvotes,
      downvotes: reply.downvotes,
      userVote: updated.userVote,
      direction,
      triggeringClientId: activeClientId,
    });
    return updated;
  },

  formatRelativeTime(dateStr: string): string {
    try {
      const now = Date.now();
      const past = new Date(dateStr).getTime();
      const diffSec = Math.floor((now - past) / 1000);

      if (diffSec < 60) return 'upravo sad';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `pre ${diffMin} min`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `pre ${diffHours} h`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `pre ${diffDays} d`;

      return new Date(dateStr).toLocaleDateString('sr-RS');
    } catch {
      return dateStr;
    }
  },

  // =========================================================================
  // ADMIN MODERATION: THREAD DELETION, PIN, LOCK, EDIT
  // =========================================================================

  deleteThread(threadId: string): boolean {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const newThreads = threads.filter(t => t.id !== threadId);
    safeSet(FORUM_STORAGE_KEYS.THREADS, newThreads);

    const replies = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);
    const newReplies = replies.filter(r => r.threadId !== threadId);
    safeSet(FORUM_STORAGE_KEYS.REPLIES, newReplies);

    try {
      fetch(`/api/forum/threads/${threadId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
        credentials: 'include',
      }).catch(err => console.warn('Delete thread API sync error:', err));
    } catch (e) {
      console.warn('Delete thread failed:', e);
    }

    this.broadcastForumUpdate({ type: 'thread_deleted', threadId });
    return true;
  },

  togglePinThread(threadId: string): boolean {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return false;

    thread.isPinned = !thread.isPinned;
    safeSet(FORUM_STORAGE_KEYS.THREADS, threads);

    try {
      fetch(`/api/forum/threads/${threadId}/pin`, {
        method: 'PATCH',
        headers: getAuthHeaders(false),
        credentials: 'include',
      }).catch(err => console.warn('Pin thread API sync error:', err));
    } catch {}

    this.broadcastForumUpdate({ type: 'thread_updated', threadId, isPinned: thread.isPinned });
    return thread.isPinned;
  },

  toggleLockThread(threadId: string): boolean {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return false;

    thread.isLocked = !thread.isLocked;
    safeSet(FORUM_STORAGE_KEYS.THREADS, threads);

    try {
      fetch(`/api/forum/threads/${threadId}/lock`, {
        method: 'PATCH',
        headers: getAuthHeaders(false),
        credentials: 'include',
      }).catch(err => console.warn('Lock thread API sync error:', err));
    } catch {}

    this.broadcastForumUpdate({ type: 'thread_updated', threadId, isLocked: thread.isLocked });
    return thread.isLocked;
  },

  updateThread(threadId: string, updates: Partial<ForumThread>): ForumThread | null {
    this.init();
    const threads = safeGet<ForumThread[]>(FORUM_STORAGE_KEYS.THREADS, INITIAL_THREADS);
    const thread = threads.find(t => t.id === threadId);
    if (!thread) return null;

    Object.assign(thread, updates, { updatedAt: new Date().toISOString() });
    safeSet(FORUM_STORAGE_KEYS.THREADS, threads);

    try {
      fetch(`/api/forum/threads/${threadId}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(updates),
      }).catch(err => console.warn('Update thread API sync error:', err));
    } catch {}

    this.broadcastForumUpdate({ type: 'thread_updated', threadId, updates });
    return thread;
  },

  deleteReply(replyId: string): boolean {
    this.init();
    const replies = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);
    const newReplies = replies.filter(r => r.id !== replyId);
    safeSet(FORUM_STORAGE_KEYS.REPLIES, newReplies);

    try {
      fetch(`/api/forum/replies/${replyId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
        credentials: 'include',
      }).catch(err => console.warn('Delete reply API sync error:', err));
    } catch {}

    this.broadcastForumUpdate({ type: 'reply_deleted', replyId });
    return true;
  },

  // =========================================================================
  // SUBFORUMS MANAGEMENT CRUD
  // =========================================================================

  async createSubforumAsync(data: Partial<ForumSubforum>): Promise<ForumSubforum | null> {
    try {
      const res = await fetch('/api/forum/subforums', {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'subforums_updated' });
          return json.data;
        }
      }
    } catch (e) {
      console.warn('createSubforumAsync error:', e);
    }
    return null;
  },

  async updateSubforumAsync(id: string, updates: Partial<ForumSubforum>): Promise<ForumSubforum | null> {
    try {
      const res = await fetch(`/api/forum/subforums/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'subforums_updated' });
          return json.data;
        }
      }
    } catch (e) {
      console.warn('updateSubforumAsync error:', e);
    }
    return null;
  },

  async deleteSubforumAsync(id: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/forum/subforums/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'subforums_updated' });
          return true;
        }
      }
    } catch (e) {
      console.warn('deleteSubforumAsync error:', e);
    }
    return false;
  },

  // =========================================================================
  // TOP FORUM MEMBERS (KARMA) MANAGEMENT CRUD
  // =========================================================================

  async getMembersAsync(): Promise<ForumMemberKarma[]> {
    try {
      const res = await fetch('/api/forum/members', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('getMembersAsync fallback to getLeaderboard:', e);
    }
    return this.getLeaderboard();
  },

  async updateMemberAsync(name: string, updates: Partial<ForumMemberKarma>): Promise<boolean> {
    try {
      const res = await fetch(`/api/forum/members/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'leaderboard_updated', memberName: name });
          return true;
        }
      }
    } catch (e) {
      console.warn('updateMemberAsync error:', e);
    }
    return false;
  },

  async adjustMemberKarmaAsync(name: string, amount: number, reason?: string): Promise<number | null> {
    try {
      const res = await fetch(`/api/forum/members/${encodeURIComponent(name)}/adjust-karma`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ amount, reason }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'leaderboard_updated', memberName: name });
          return json.newBaseKarma;
        }
      }
    } catch (e) {
      console.warn('adjustMemberKarmaAsync error:', e);
    }
    return null;
  },

  async resetMemberKarmaAsync(name: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/forum/members/${encodeURIComponent(name)}/reset-karma`, {
        method: 'POST',
        headers: getAuthHeaders(false),
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'leaderboard_updated', memberName: name });
          return true;
        }
      }
    } catch (e) {
      console.warn('resetMemberKarmaAsync error:', e);
    }
    return false;
  },

  async deleteMemberAsync(name: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/forum/members/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(false),
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'leaderboard_updated', memberName: name });
          return true;
        }
      }
    } catch (e) {
      console.warn('deleteMemberAsync error:', e);
    }
    return false;
  },

  async getMemberProfileAsync(name: string): Promise<any | null> {
    try {
      const res = await fetch(`/api/forum/members/${encodeURIComponent(name)}`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch (e) {
      console.warn('getMemberProfileAsync error:', e);
    }

    const members = this.getLeaderboard();
    const mem = members.find(m => m.name.toLowerCase() === name.toLowerCase()) || {
      name,
      role: 'Član',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      coverBanner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      karma: 50,
      rank: 99,
      isOnline: false,
      bio: 'Član NEXUS gejming zajednice.',
      gamingAccounts: {},
      badges: [],
    };

    const userThreads = this.getThreads().filter(t => t.authorName.toLowerCase() === name.toLowerCase());
    const allReplies = safeGet<ForumReply[]>(FORUM_STORAGE_KEYS.REPLIES, INITIAL_REPLIES);
    const userReplies = allReplies.filter(r => r.authorName.toLowerCase() === name.toLowerCase());

    return {
      ...mem,
      threadCount: userThreads.length,
      replyCount: userReplies.length,
      recentThreads: userThreads,
      recentReplies: userReplies,
      savedPosts: [],
      savedCount: 0,
    };
  },

  // =========================================================================
  // SAČUVANI ČLANCI (bookmarks) — sinhronizacija sa bazom
  // =========================================================================

  async getMemberBookmarksAsync(name: string): Promise<any[]> {
    try {
      const res = await fetch(`/api/forum/members/${encodeURIComponent(name)}/bookmarks`, {
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (e) {
      console.warn('getMemberBookmarksAsync error:', e);
    }
    return [];
  },

  async getMyBookmarksAsync(): Promise<number[]> {
    try {
      const res = await fetch('/api/forum/bookmarks', {
        headers: getAuthHeaders(false),
        credentials: 'include',
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (e) {
      console.warn('getMyBookmarksAsync error:', e);
    }
    return [];
  },

  async syncBookmarkAsync(postId: number, saved: boolean): Promise<boolean> {
    try {
      const url = saved ? '/api/forum/bookmarks' : `/api/forum/bookmarks/${postId}`;
      const res = await fetch(url, {
        method: saved ? 'POST' : 'DELETE',
        headers: getAuthHeaders(saved),
        credentials: 'include',
        ...(saved ? { body: JSON.stringify({ postId }) } : {}),
      });
      if (res.ok) {
        const json = await res.json();
        return Boolean(json.success);
      }
    } catch (e) {
      console.warn('syncBookmarkAsync error:', e);
    }
    return false;
  },

  async updateMemberProfileAsync(name: string, updates: Partial<ForumMemberKarma>): Promise<boolean> {
    try {
      const res = await fetch(`/api/forum/members/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'leaderboard_updated', memberName: name });
          return true;
        }
      }
    } catch (e) {
      console.warn('updateMemberProfileAsync error:', e);
    }
    return false;
  },

  async assignMemberBadgeAsync(
    name: string,
    badge: { badgeId?: string; badgeName: string; description: string; icon: string; color: string; assignedBy?: string }
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/forum/members/${encodeURIComponent(name)}/badges`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(badge),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'leaderboard_updated', memberName: name });
          return true;
        }
      }
    } catch (e) {
      console.warn('assignMemberBadgeAsync error:', e);
    }
    return false;
  },

  async removeMemberBadgeAsync(name: string, badgeId: string): Promise<boolean> {
    try {
      const res = await fetch(
        `/api/forum/members/${encodeURIComponent(name)}/badges/${encodeURIComponent(badgeId)}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(false),
          credentials: 'include',
        }
      );
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          this.broadcastForumUpdate({ type: 'leaderboard_updated', memberName: name });
          return true;
        }
      }
    } catch (e) {
      console.warn('removeMemberBadgeAsync error:', e);
    }
    return false;
  },

  broadcastForumUpdate(event: any): void {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('nexus_forum_channel');
        bc.postMessage(event);
        bc.close();
      }
    } catch {
      // fallback
    }
  },
};
