import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Plus,
  Flame,
  Trophy,
  Clock,
  Sparkles,
  Search,
  Users,
  Shield,
  Layers,
  Award,
  Database,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { ForumThread, ForumSubforumId, ThreadSortOption } from '../../types';
import { FORUM_SUBFORUMS, ForumService } from '../../services/forumService';
import { SubforumCard } from '../../components/forum/SubforumCard';
import { ThreadCard } from '../../components/forum/ThreadCard';
import { CreateThreadModal } from '../../components/forum/CreateThreadModal';
import { ForumLeaderboard } from '../../components/forum/ForumLeaderboard';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface ForumHomeViewProps {
  onSelectThread: (slug: string) => void;
  onSelectMember?: (memberName: string) => void;
  initialSubforumId?: string;
}

export const ForumHomeView: React.FC<ForumHomeViewProps> = ({
  onSelectThread,
  onSelectMember,
  initialSubforumId,
}) => {

  const { user } = useAuth();
  const [selectedSubforum, setSelectedSubforum] = useState<string>(initialSubforumId || 'all');
  const [sortBy, setSortBy] = useState<ThreadSortOption>('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [subforums, setSubforums] = useState(ForumService.getSubforums());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDbSynced, setIsDbSynced] = useState(true);

  // Load threads and subforums asynchronously from database
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [thList, subList] = await Promise.all([
        ForumService.getThreadsAsync({
          subforumId: selectedSubforum,
          sortBy,
          search: searchQuery,
          tag: selectedTag || undefined,
        }),
        ForumService.getSubforumsAsync(),
      ]);
      setThreads(thList);
      setSubforums(subList);
      setIsDbSynced(true);
    } catch {
      // Fallback
      setThreads(
        ForumService.getThreads({
          subforumId: selectedSubforum,
          sortBy,
          search: searchQuery,
          tag: selectedTag || undefined,
        })
      );
      setSubforums(ForumService.getSubforums());
    } finally {
      setIsLoading(false);
    }
  }, [selectedSubforum, sortBy, searchQuery, selectedTag]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for real-time forum updates via Supabase Realtime subscriptions + SSE stream & BroadcastChannel
  useEffect(() => {
    let sse: EventSource | null = null;
    let bc: BroadcastChannel | null = null;

    // Supabase Realtime Postgres Changes Subscription
    const realtimeChannel = supabase
      .channel('nexus_forum_postgres_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_threads' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_replies' },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'forum_votes' },
        () => {
          loadData();
        }
      )
      .subscribe();

    try {
      sse = new EventSource('/api/forum/stream');
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'thread_voted') {
            setThreads(prev =>
              prev.map(t =>
                t.id === data.threadId
                  ? { ...t, score: data.score, upvotes: data.upvotes, downvotes: data.downvotes }
                  : t
              )
            );
          } else if (
            data.type === 'thread_created' ||
            data.type === 'reply_added' ||
            data.type === 'reply_voted'
          ) {
            loadData();
          }
        } catch {}
      };
    } catch {}

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('nexus_forum_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'thread_voted') {
          setThreads(prev =>
            prev.map(t =>
              t.id === event.data.threadId ? { ...t, score: event.data.score } : t
            )
          );
        } else {
          loadData();
        }
      };
    }

    return () => {
      supabase.removeChannel(realtimeChannel);
      if (sse) sse.close();
      if (bc) bc.close();
    };
  }, [loadData]);

  const handleVoteThread = async (threadId: string, direction: 'up' | 'down') => {
    // Optimistic UI update
    setThreads(prev =>
      prev.map(t => {
        if (t.id === threadId) {
          const isSame = t.userVote === direction;
          const newVote = isSame ? null : direction;
          let diff = 0;
          if (direction === 'up') diff = isSame ? -1 : (t.userVote === 'down' ? 2 : 1);
          if (direction === 'down') diff = isSame ? 1 : (t.userVote === 'up' ? -2 : -1);
          return {
            ...t,
            userVote: newVote,
            score: t.score + diff,
            upvotes: direction === 'up' ? (isSame ? t.upvotes - 1 : t.upvotes + 1) : t.upvotes,
            downvotes: direction === 'down' ? (isSame ? t.downvotes - 1 : t.downvotes + 1) : t.downvotes,
          };
        }
        return t;
      })
    );

    // Call service to persist in DB
    await ForumService.voteThread(threadId, direction);
    loadData();
  };

  const handleThreadCreated = (newThread: ForumThread) => {
    loadData();
    onSelectThread(newThread.slug);
  };

  const popularTags = [
    'PCGaming',
    'PlayStation',
    'Xbox',
    'CS2',
    'Valorant',
    'EldenRing',
    'Hardware',
    'LFG',
    'DLSS',
  ];

  const getSortDescription = () => {
    switch (sortBy) {
      case 'top':
        return 'Prikaz tema po najvećem broju upvote-a i lajkova (Top Karma)';
      case 'new':
        return 'Prikaz hronološki najnovijih i najsvežije objavljenih tema';
      case 'discussed':
        return 'Prikaz tema sa najviše odgovora i komentara zajednice';
      case 'hot':
      default:
        return 'Prikaz aktuelnih tema po balansu aktivnosti i svežine';
    }
  };

  return (
    <div className="py-8 space-y-10">
      {/* Forum Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#12121c] via-[#101018] to-[#141220] border border-white/10 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>NEXUS Gaming Forum & Community Hub</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              Gde se okuplja gejming zajednica
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Uključite se u diskusije o PC i konzolnom gejmingu, esportu, hardverskim optimizacijama, glasajte u anketama i pronađite saigrače za večerašnje partije.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-xl shadow-purple-600/30 transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Pokreni Novu Temu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subforums Grid (Categories) - Connected to Database */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-purple-400" />
            <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-wider text-white">
              Kategorije & Potforumi
            </h2>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono font-medium">
              <Database className="w-3 h-3 text-emerald-400" />
              <span>BAZA POVEZANA</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadData()}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              title="Osveži podatke iz baze"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
              <span className="hidden md:inline">Sinhronizuj</span>
            </button>
            {selectedSubforum !== 'all' && (
              <button
                onClick={() => setSelectedSubforum('all')}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
              >
                Prikaži sve potforume →
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {subforums.map(sub => (
            <SubforumCard
              key={sub.id}
              subforum={sub}
              isSelected={selectedSubforum === sub.id}
              onSelect={id => {
                setSelectedSubforum(selectedSubforum === id ? 'all' : id);
              }}
            />
          ))}
        </div>
      </div>

      {/* Main Forum Content: Discussion Feeds + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Filters, Sort, Search, Threads */}
        <div className="lg:col-span-8 space-y-6">
          {/* Controls Bar: Search & Subforum Filter Pills */}
          <div className="bg-[#121217] border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Pretraži teme po naslovu, autoru ili igri..."
                className="w-full bg-[#181822] border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 placeholder:text-slate-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort Options & Active Subforum Indicator */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* 4 Sorting Buttons */}
                <div className="flex flex-wrap items-center gap-1 bg-[#181822] p-1 rounded-xl border border-white/5 text-xs">
                  <button
                    type="button"
                    onClick={() => setSortBy('hot')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      sortBy === 'hot'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Vruće</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortBy('top')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      sortBy === 'top'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Top Karma</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortBy('new')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      sortBy === 'new'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Najnovije</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSortBy('discussed')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                      sortBy === 'discussed'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                    <span>Najviše Odgovora</span>
                  </button>
                </div>

                {selectedTag && (
                  <div className="flex items-center gap-1 text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-lg">
                    <span>Tag: #{selectedTag}</span>
                    <button
                      onClick={() => setSelectedTag(null)}
                      className="hover:text-red-400 font-bold ml-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic sort indicator description */}
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                <span>{getSortDescription()}</span>
              </div>
            </div>

            {/* Popular Tags Row */}
            <div className="flex items-center flex-wrap gap-1.5 pt-1 text-xs">
              <span className="text-slate-500 text-[11px] font-semibold mr-1">Tagovi:</span>
              {popularTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                    selectedTag === tag
                      ? 'bg-purple-600 text-white font-bold'
                      : 'bg-white/5 hover:bg-purple-500/10 text-slate-400 hover:text-purple-300 border border-white/5'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>

          {/* Threads List */}
          <div className="space-y-3.5">
            {threads.length === 0 ? (
              <div className="bg-[#121217] border border-white/10 rounded-2xl p-12 text-center space-y-4">
                <MessageSquare className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="font-display text-xl font-bold text-white">Nema pronađenih diskusija</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Budite prvi koji će pokrenuti temu u ovoj kategoriji ili prilagodite filtere pretrage.
                </p>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-lg cursor-pointer"
                >
                  Započni Diskusiju
                </button>
              </div>
            ) : (
              threads.map(thr => (
                <ThreadCard
                  key={thr.id}
                  thread={thr}
                  onSelectThread={onSelectThread}
                  onSelectSubforum={subId => setSelectedSubforum(subId)}
                  onVoteThread={handleVoteThread}
                  onSelectAuthor={onSelectMember}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Real-time Connected Leaderboard + Community Hub Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* Real-time Connected Leaderboard for 'Top Forum Members (Karma)' */}
          <ForumLeaderboard onSelectMember={onSelectMember} />


          {/* LFG Quick Widget */}
          <div className="bg-gradient-to-b from-[#181220] to-[#121217] border border-pink-500/30 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-pink-400">
              <Users className="w-5 h-5" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                LFG / Pronađi Ekipu
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tražite saigrače za Ranked mečeve, Raid-ove ili Co-Op zabavu? Postavite oglas u LFG sekciji foruma!
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedSubforum('lfg');
                setIsCreateModalOpen(true);
              }}
              className="w-full py-2 px-3 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/40 text-pink-300 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
            >
              Postavi LFG Oglas
            </button>
          </div>

          {/* Forum Guidelines */}
          <div className="bg-[#121217] border border-white/10 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-purple-400">
              <Shield className="w-4 h-4" />
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Pravila Foruma
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-slate-400 leading-relaxed list-disc pl-4">
              <li>Poštujte druge članove i izbegavajte govor mržnje.</li>
              <li>Jasno označite spoilere za priče i završetke igara.</li>
              <li>Bez spama, piratskih linkova i samopromocije.</li>
              <li>Objavljujte teme u odgovarajuće potforume.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Thread Modal */}
      <CreateThreadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onThreadCreated={handleThreadCreated}
        defaultSubforumId={
          selectedSubforum !== 'all' ? (selectedSubforum as ForumSubforumId) : 'pc-gaming'
        }
      />
    </div>
  );
};
