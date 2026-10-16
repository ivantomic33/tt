import React, { useState, useEffect } from 'react';
import { Trophy, Flame, Sparkles, Award, Medal, MessageSquare, Radio, ChevronUp } from 'lucide-react';
import { ForumMemberKarma } from '../../types';
import { ForumService } from '../../services/forumService';

interface ForumLeaderboardProps {
  onSelectMember?: (memberName: string) => void;
}

export const ForumLeaderboard: React.FC<ForumLeaderboardProps> = ({ onSelectMember }) => {
  const [members, setMembers] = useState<ForumMemberKarma[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterMode, setFilterMode] = useState<'karma' | 'activity'>('karma');
  const [recentlyUpdated, setRecentlyUpdated] = useState<Record<string, boolean>>({});

  const fetchLeaderboard = async () => {
    try {
      const data = await ForumService.getLeaderboardAsync();
      setMembers(prev => {
        // Detect changed karma to trigger subtle pulse animation
        const changed: Record<string, boolean> = {};
        data.forEach(m => {
          const old = prev.find(p => p.name === m.name);
          if (old && old.karma !== m.karma) {
            changed[m.name] = true;
          }
        });
        if (Object.keys(changed).length > 0) {
          setRecentlyUpdated(changed);
          setTimeout(() => setRecentlyUpdated({}), 3000);
        }
        return data;
      });
    } catch {
      setMembers(ForumService.getLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    // Listen to real-time events via SSE and BroadcastChannel
    let sse: EventSource | null = null;
    let bc: BroadcastChannel | null = null;

    try {
      sse = new EventSource('/api/forum/stream');
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === 'leaderboard_updated' ||
            data.type === 'thread_voted' ||
            data.type === 'reply_voted' ||
            data.type === 'thread_created' ||
            data.type === 'reply_added'
          ) {
            fetchLeaderboard();
          }
        } catch {}
      };
    } catch {}

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('nexus_forum_channel');
      bc.onmessage = (event) => {
        if (
          event.data?.type === 'thread_voted' ||
          event.data?.type === 'reply_voted' ||
          event.data?.type === 'leaderboard_updated'
        ) {
          fetchLeaderboard();
        }
      };
    }

    return () => {
      if (sse) sse.close();
      if (bc) bc.close();
    };
  }, []);

  const sortedMembers = [...members].sort((a, b) => {
    if (filterMode === 'activity') {
      return (b.threadCount + b.replyCount) - (a.threadCount + a.replyCount);
    }
    return b.karma - a.karma;
  });

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black flex items-center justify-center font-bold text-[10px] shadow-md shadow-amber-500/30">
          🥇
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-slate-400 to-slate-200 text-black flex items-center justify-center font-bold text-[10px]">
          🥈
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-700 to-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
          🥉
        </span>
      );
    }
    return (
      <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center font-mono font-bold text-[10px]">
        #{rank}
      </span>
    );
  };

  return (
    <div className="bg-[#121217] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Trophy className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Top Forumaši (Karma)
            </h3>
            <p className="text-[10px] text-slate-400">Najcenjeniji članovi po ocenama</p>
          </div>
        </div>

        {/* Real-time Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>UŽIVO</span>
        </div>
      </div>

      {/* Filter Tabs: Top Karma vs Najaktivniji */}
      <div className="grid grid-cols-2 gap-1 bg-[#181822] p-1 rounded-xl border border-white/5 text-xs">
        <button
          type="button"
          onClick={() => setFilterMode('karma')}
          className={`py-1 px-2 rounded-lg font-semibold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            filterMode === 'karma'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-3 h-3 text-amber-300" />
          <span>Top Karma</span>
        </button>
        <button
          type="button"
          onClick={() => setFilterMode('activity')}
          className={`py-1 px-2 rounded-lg font-semibold text-[11px] transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            filterMode === 'activity'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <MessageSquare className="w-3 h-3" />
          <span>Najaktivniji</span>
        </button>
      </div>

      {/* Podium Highlight (Top 3) */}
      {sortedMembers.length >= 3 && filterMode === 'karma' && (
        <div className="grid grid-cols-3 gap-2 pt-1 pb-2">
          {/* Rank 2 */}
          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#161622] border border-slate-700/50 relative">
            <span className="text-xs mb-1">🥈</span>
            <div className="relative mb-1">
              <img
                src={sortedMembers[1]?.avatar}
                alt={sortedMembers[1]?.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-400"
              />
              {sortedMembers[1]?.isOnline && (
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#161622]" />
              )}
            </div>
            <span className="text-[11px] font-bold text-white truncate max-w-full">
              {sortedMembers[1]?.name}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
              +{sortedMembers[1]?.karma}
            </span>
          </div>

          {/* Rank 1 (Tallest/Glowing) */}
          <div className="flex flex-col items-center text-center p-3 rounded-xl bg-gradient-to-b from-amber-500/15 via-[#1a1826] to-[#161622] border border-amber-500/40 relative shadow-lg shadow-amber-500/10">
            <span className="text-sm mb-1">🥇</span>
            <div className="relative mb-1">
              <img
                src={sortedMembers[0]?.avatar}
                alt={sortedMembers[0]?.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-amber-400"
              />
              {sortedMembers[0]?.isOnline && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#1a1826]" />
              )}
            </div>
            <span className="text-xs font-bold text-amber-200 truncate max-w-full">
              {sortedMembers[0]?.name}
            </span>
            <span className="text-[11px] text-amber-300 font-mono font-bold mt-0.5">
              +{sortedMembers[0]?.karma}
            </span>
          </div>

          {/* Rank 3 */}
          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-[#161622] border border-amber-800/40 relative">
            <span className="text-xs mb-1">🥉</span>
            <div className="relative mb-1">
              <img
                src={sortedMembers[2]?.avatar}
                alt={sortedMembers[2]?.name}
                className="w-8 h-8 rounded-full object-cover border border-amber-700"
              />
              {sortedMembers[2]?.isOnline && (
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#161622]" />
              )}
            </div>
            <span className="text-[11px] font-bold text-white truncate max-w-full">
              {sortedMembers[2]?.name}
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
              +{sortedMembers[2]?.karma}
            </span>
          </div>
        </div>
      )}

      {/* Member List */}
      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
        {loading ? (
          <div className="py-6 text-center text-xs text-slate-500">Učitavanje rang liste...</div>
        ) : sortedMembers.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">Nema evidentiranih članova.</div>
        ) : (
          sortedMembers.map((member, index) => {
            const isUpdated = recentlyUpdated[member.name];
            return (
              <div
                key={member.name}
                onClick={() => onSelectMember && onSelectMember(member.name)}
                className={`flex items-center justify-between gap-3 p-2 rounded-xl transition-all duration-300 border ${
                  isUpdated
                    ? 'bg-purple-900/30 border-purple-500/50 shadow-md ring-1 ring-purple-500/50'
                    : 'bg-[#15151e] hover:bg-[#1a1a26] border-white/5 hover:border-white/10'
                } ${onSelectMember ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {getRankBadge(index + 1)}

                  <div className="relative shrink-0">
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-7 h-7 rounded-full object-cover border border-purple-500/30"
                    />
                    {member.isOnline && (
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#15151e]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-white truncate">
                        {member.name}
                      </span>
                      {member.role === 'Moderator' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium">
                          Mod
                        </span>
                      )}
                      {member.role === 'Hardver Guru' && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                          Guru
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{member.threadCount} tema</span>
                      <span>·</span>
                      <span>{member.replyCount} odgovora</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-right shrink-0">
                  <span
                    className={`font-mono font-bold text-xs px-2 py-0.5 rounded-lg border flex items-center gap-1 transition-all ${
                      isUpdated
                        ? 'bg-emerald-500/30 text-emerald-200 border-emerald-400 scale-105'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}
                  >
                    <Flame className="w-3 h-3 text-amber-400" />
                    +{member.karma}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Karma Info Footer */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
        <span>Kako se osvaja karma?</span>
        <span className="text-purple-400 hover:text-purple-300 transition-colors">
          +1 po upvote-u
        </span>
      </div>
    </div>
  );
};
