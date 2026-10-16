import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { VoteType } from '../../types';

interface ThreadKarmaVoteProps {
  score: number;
  userVote?: VoteType | null;
  onVote: (direction: 'up' | 'down') => void;
  orientation?: 'vertical' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
}

export const ThreadKarmaVote: React.FC<ThreadKarmaVoteProps> = ({
  score,
  userVote,
  onVote,
  orientation = 'vertical',
  size = 'md',
}) => {
  const [animating, setAnimating] = useState(false);
  const [lastDirection, setLastDirection] = useState<'up' | 'down' | null>(null);
  const [particles, setParticles] = useState<{ id: string; text: string; isUp: boolean }[]>([]);

  // Trigger subtle animation whenever score changes (both locally and via live SSE from another user!)
  useEffect(() => {
    setAnimating(true);
    const t = setTimeout(() => setAnimating(false), 500);
    return () => clearTimeout(t);
  }, [score]);

  const handleVote = (direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    setLastDirection(direction);

    // Spawn floating particle pop (+1 or -1)
    const isUp = direction === 'up';
    const text = isUp ? '+1' : '-1';
    const id = `${Date.now()}_${Math.random()}`;

    setParticles(prev => [...prev.slice(-2), { id, text, isUp }]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== id));
    }, 1200);

    onVote(direction);
  };

  const isUpvoted = userVote === 'up';
  const isDownvoted = userVote === 'down';

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base font-bold',
  };

  if (orientation === 'horizontal') {
    return (
      <div className="relative inline-flex items-center gap-1 bg-[#141418] border border-white/10 rounded-full px-2 py-0.5">
        {/* Floating particle */}
        {particles.map(p => (
          <span
            key={p.id}
            className={`absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none text-xs font-bold px-1.5 py-0.5 rounded-full shadow-md animate-bounce z-20 ${
              p.isUp
                ? 'text-emerald-400 bg-emerald-950/90 border border-emerald-500/50'
                : 'text-rose-400 bg-rose-950/90 border border-rose-500/50'
            }`}
          >
            {p.text}
          </span>
        ))}

        <button
          type="button"
          onClick={e => handleVote('up', e)}
          title="Upvote (+1)"
          className={`p-1 rounded-full transition-all duration-200 cursor-pointer ${
            isUpvoted
              ? 'text-emerald-400 bg-emerald-500/20 ring-1 ring-emerald-500/40'
              : 'text-slate-400 hover:text-emerald-400 hover:bg-white/5'
          }`}
        >
          <ChevronUp className={iconSizes[size]} />
        </button>

        <span
          className={`font-mono font-bold px-1 min-w-[20px] text-center transition-all duration-300 ${textSizes[size]} ${
            isUpvoted
              ? 'text-emerald-400'
              : isDownvoted
              ? 'text-rose-400'
              : score > 0
              ? 'text-emerald-300'
              : score < 0
              ? 'text-rose-400'
              : 'text-slate-400'
          } ${animating ? 'scale-125 text-emerald-400' : ''}`}
        >
          {score}
        </span>

        <button
          type="button"
          onClick={e => handleVote('down', e)}
          title="Downvote (-1)"
          className={`p-1 rounded-full transition-all duration-200 cursor-pointer ${
            isDownvoted
              ? 'text-rose-400 bg-rose-500/20 ring-1 ring-rose-500/40'
              : 'text-slate-400 hover:text-rose-400 hover:bg-white/5'
          }`}
        >
          <ChevronDown className={iconSizes[size]} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center bg-[#121216] border border-white/10 rounded-xl p-1.5 w-11 shrink-0 select-none shadow-sm">
      {/* Floating particles */}
      {particles.map(p => (
        <span
          key={p.id}
          className={`absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none text-xs font-extrabold px-1.5 py-0.5 rounded-full shadow-lg animate-bounce z-20 ${
            p.isUp
              ? 'text-emerald-400 bg-emerald-950/95 border border-emerald-500/50'
              : 'text-rose-400 bg-rose-950/95 border border-rose-500/50'
          }`}
        >
          {p.text}
        </span>
      ))}

      <button
        type="button"
        onClick={e => handleVote('up', e)}
        title="Upvote (+1 Karma)"
        className={`p-1 rounded-lg transition-all duration-200 transform active:scale-90 cursor-pointer ${
          isUpvoted
            ? 'text-emerald-400 bg-emerald-500/25 ring-1 ring-emerald-500/40'
            : 'text-slate-400 hover:text-emerald-400 hover:bg-white/5'
        }`}
      >
        <ChevronUp className={`${iconSizes[size]} ${isUpvoted ? 'stroke-[3]' : ''}`} />
      </button>

      <span
        className={`font-mono font-bold my-1 transition-all duration-300 ${textSizes[size]} ${
          isUpvoted
            ? 'text-emerald-400 font-extrabold'
            : isDownvoted
            ? 'text-rose-400 font-extrabold'
            : score > 0
            ? 'text-emerald-400'
            : score < 0
            ? 'text-rose-400 font-extrabold'
            : 'text-slate-400'
        } ${animating ? 'scale-130 text-emerald-300 font-black' : ''}`}
      >
        {score}
      </span>

      <button
        type="button"
        onClick={e => handleVote('down', e)}
        title="Downvote (-1 Karma)"
        className={`p-1 rounded-lg transition-all duration-200 transform active:scale-90 cursor-pointer ${
          isDownvoted
            ? 'text-rose-400 bg-rose-500/25 ring-1 ring-rose-500/40'
            : 'text-slate-400 hover:text-rose-400 hover:bg-white/5'
        }`}
      >
        <ChevronDown className={`${iconSizes[size]} ${isDownvoted ? 'stroke-[3]' : ''}`} />
      </button>
    </div>
  );
};
