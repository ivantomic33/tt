import React, { useState, useEffect, useRef } from 'react';
import { Flame, Award, ThumbsUp, Radio } from 'lucide-react';
import { ReactionType, ReactionCounts, UserReactions, ReactionEventPayload } from '../../types';
import { StorageService } from '../../services/storage';

interface PostReactionsProps {
  postId: number;
  className?: string;
}

interface FloatingPop {
  id: string;
  type: ReactionType;
  text: string;
}

export const PostReactions: React.FC<PostReactionsProps> = ({ postId, className = '' }) => {
  const [counts, setCounts] = useState<ReactionCounts>({ like: 0, gg: 0, hype: 0 });
  const [userReactions, setUserReactions] = useState<UserReactions>({ like: false, gg: false, hype: false });
  const [activePulse, setActivePulse] = useState<Record<ReactionType, boolean>>({
    like: false,
    gg: false,
    hype: false,
  });
  const [animatingCount, setAnimatingCount] = useState<Record<ReactionType, boolean>>({
    like: false,
    gg: false,
    hype: false,
  });
  const [floatingPops, setFloatingPops] = useState<FloatingPop[]>([]);
  const [liveToast, setLiveToast] = useState<{ message: string; type: ReactionType } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const myClientIdRef = useRef<string>(StorageService.getClientId());
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial reaction data from server / local database
  useEffect(() => {
    let isMounted = true;
    const loadReactions = async () => {
      const data = await StorageService.getPostReactions(postId, myClientIdRef.current);
      if (isMounted) {
        setCounts(data.counts);
        setUserReactions(data.userReactions);
      }
    };

    loadReactions();

    return () => {
      isMounted = false;
    };
  }, [postId]);

  // Real-time listener function when reaction events arrive from SSE or BroadcastChannel
  const handleLiveReactionEvent = (payload: ReactionEventPayload) => {
    if (payload.postId !== postId) return;

    // Update counts
    setCounts(payload.counts);

    // If reaction was triggered by another user/session
    if (payload.triggeringClientId !== myClientIdRef.current) {
      const rType = payload.reactionType;
      const isAdded = payload.action === 'added';

      // 1. Trigger subtle glow animation on the specific reaction button
      setActivePulse(prev => ({ ...prev, [rType]: true }));
      setAnimatingCount(prev => ({ ...prev, [rType]: true }));

      setTimeout(() => {
        setActivePulse(prev => ({ ...prev, [rType]: false }));
      }, 1000);

      setTimeout(() => {
        setAnimatingCount(prev => ({ ...prev, [rType]: false }));
      }, 600);

      // 2. Spawn a subtle floating pop (+1 🔥 or -1 🔥) above the button
      const popId = `${Date.now()}_${Math.random()}`;
      const emojiMap: Record<ReactionType, string> = {
        hype: '🔥',
        gg: '🏆',
        like: '👍',
      };
      const labelMap: Record<ReactionType, string> = {
        hype: 'Hype',
        gg: 'GG',
        like: 'Korisno',
      };

      const popText = `${isAdded ? '+1' : '-1'} ${emojiMap[rType]}`;
      setFloatingPops(prev => [...prev.slice(-4), { id: popId, type: rType, text: popText }]);

      setTimeout(() => {
        setFloatingPops(prev => prev.filter(p => p.id !== popId));
      }, 1800);

      // 3. Show subtle live notification toast
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      setLiveToast({
        message: `Neko je upravo ${isAdded ? 'reagovao' : 'ukloni reakciju'}: ${labelMap[rType]} ${emojiMap[rType]}`,
        type: rType,
      });

      toastTimeoutRef.current = setTimeout(() => {
        setLiveToast(null);
      }, 3500);
    }
  };

  // Subscribe to SSE stream endpoint
  useEffect(() => {
    let sse: EventSource | null = null;
    let isSubscribed = true;

    try {
      sse = new EventSource(`/api/posts/${postId}/reactions/stream`);

      sse.onopen = () => {
        if (isSubscribed) setIsConnected(true);
      };

      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'reaction_updated') {
            handleLiveReactionEvent(data);
          }
        } catch (err) {
          // parse error
        }
      };

      sse.onerror = () => {
        if (isSubscribed) setIsConnected(false);
      };
    } catch (e) {
      setIsConnected(false);
    }

    // Also listen on BroadcastChannel for multi-tab synchronization in local/dev environments
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('nexus_reactions_channel');
        bc.onmessage = (event) => {
          if (event.data && event.data.type === 'reaction_updated') {
            handleLiveReactionEvent(event.data);
          }
        };
      }
    } catch (bcErr) {
      // BroadcastChannel fallback
    }

    return () => {
      isSubscribed = false;
      if (sse) sse.close();
      if (bc) bc.close();
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, [postId]);

  // Click handler for user reaction toggle
  const handleToggle = async (type: ReactionType) => {
    // Optimistic UI update
    const isCurrentlyActive = userReactions[type];
    const newIsActive = !isCurrentlyActive;

    setUserReactions(prev => ({ ...prev, [type]: newIsActive }));
    setCounts(prev => ({
      ...prev,
      [type]: newIsActive ? prev[type] + 1 : Math.max(0, prev[type] - 1),
    }));

    // Perform database toggle
    const res = await StorageService.togglePostReaction(postId, type, myClientIdRef.current);
    setCounts(res.counts);
    setUserReactions(res.userReactions);
  };

  return (
    <div className={`relative flex flex-col gap-2 ${className}`}>
      {/* Subtle Live Toast Notification for real-time user reactions */}
      {liveToast && (
        <div className="absolute -top-10 left-0 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-[#18181b] border border-purple-500/40 text-white text-[11px] font-medium shadow-xl backdrop-blur-md animate-fade-in transition-all">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-purple-300 font-semibold">{liveToast.message}</span>
        </div>
      )}

      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1.5 mr-2 text-xs font-semibold uppercase tracking-wider text-[#a1a1a1]">
          <span>Reakcije:</span>
          {isConnected && (
            <span
              title="Realtime DB Konekcija Aktivna"
              className="flex items-center gap-1 text-[10px] text-emerald-400/90 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
            >
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
              <span>LIVE</span>
            </span>
          )}
        </div>

        {/* HYPE Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleToggle('hype')}
            className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 transform active:scale-95 cursor-pointer ${
              userReactions.hype
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444] shadow-lg shadow-[#ef4444]/20'
                : 'bg-[#18181c] border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#ef4444]/50'
            } ${activePulse.hype ? 'ring-2 ring-[#ef4444] bg-[#ef4444]/30 scale-105' : ''}`}
          >
            <Flame
              className={`w-4 h-4 transition-transform duration-300 ${
                userReactions.hype ? 'fill-[#ef4444] text-[#ef4444] scale-110' : 'text-red-400'
              } ${activePulse.hype ? 'animate-bounce' : ''}`}
            />
            <span>Hype</span>
            <span
              className={`ml-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-black/40 transition-all duration-300 ${
                animatingCount.hype ? 'scale-125 text-red-400 font-bold' : ''
              }`}
            >
              {counts.hype}
            </span>
          </button>
          {/* Floating Pops */}
          {floatingPops
            .filter(p => p.type === 'hype')
            .map(pop => (
              <span
                key={pop.id}
                className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none text-xs font-bold text-red-400 bg-red-950/90 border border-red-500/40 px-2 py-0.5 rounded-full shadow-lg animate-bounce"
              >
                {pop.text}
              </span>
            ))}
        </div>

        {/* GG Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleToggle('gg')}
            className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 transform active:scale-95 cursor-pointer ${
              userReactions.gg
                ? 'bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e] shadow-lg shadow-[#22c55e]/20'
                : 'bg-[#18181c] border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#22c55e]/50'
            } ${activePulse.gg ? 'ring-2 ring-[#22c55e] bg-[#22c55e]/30 scale-105' : ''}`}
          >
            <Award
              className={`w-4 h-4 transition-transform duration-300 ${
                userReactions.gg ? 'text-[#22c55e] scale-110' : 'text-emerald-400'
              } ${activePulse.gg ? 'animate-bounce' : ''}`}
            />
            <span>GG</span>
            <span
              className={`ml-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-black/40 transition-all duration-300 ${
                animatingCount.gg ? 'scale-125 text-emerald-400 font-bold' : ''
              }`}
            >
              {counts.gg}
            </span>
          </button>
          {/* Floating Pops */}
          {floatingPops
            .filter(p => p.type === 'gg')
            .map(pop => (
              <span
                key={pop.id}
                className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none text-xs font-bold text-emerald-400 bg-emerald-950/90 border border-emerald-500/40 px-2 py-0.5 rounded-full shadow-lg animate-bounce"
              >
                {pop.text}
              </span>
            ))}
        </div>

        {/* Korisno / Like Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => handleToggle('like')}
            className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 transform active:scale-95 cursor-pointer ${
              userReactions.like
                ? 'bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee] shadow-lg shadow-[#22d3ee]/20'
                : 'bg-[#18181c] border-[#27272a] text-[#a1a1aa] hover:text-white hover:border-[#22d3ee]/50'
            } ${activePulse.like ? 'ring-2 ring-[#22d3ee] bg-[#22d3ee]/30 scale-105' : ''}`}
          >
            <ThumbsUp
              className={`w-4 h-4 transition-transform duration-300 ${
                userReactions.like ? 'fill-[#22d3ee] text-[#22d3ee] scale-110' : 'text-cyan-400'
              } ${activePulse.like ? 'animate-bounce' : ''}`}
            />
            <span>Korisno</span>
            <span
              className={`ml-1 font-mono text-[11px] px-1.5 py-0.5 rounded-md bg-black/40 transition-all duration-300 ${
                animatingCount.like ? 'scale-125 text-cyan-400 font-bold' : ''
              }`}
            >
              {counts.like}
            </span>
          </button>
          {/* Floating Pops */}
          {floatingPops
            .filter(p => p.type === 'like')
            .map(pop => (
              <span
                key={pop.id}
                className="absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none text-xs font-bold text-cyan-400 bg-cyan-950/90 border border-cyan-500/40 px-2 py-0.5 rounded-full shadow-lg animate-bounce"
              >
                {pop.text}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
};
