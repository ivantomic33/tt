import React from 'react';
import { BarChart3, CheckCircle2 } from 'lucide-react';
import { ForumPoll } from '../../types';

interface ForumPollCardProps {
  poll: ForumPoll;
  userVotedOptionId?: string | null;
  onVoteOption: (optionId: string) => void;
  isLocked?: boolean;
}

export const ForumPollCard: React.FC<ForumPollCardProps> = ({
  poll,
  userVotedOptionId,
  onVoteOption,
  isLocked = false,
}) => {
  const totalVotes = poll.totalVotes || 0;

  return (
    <div className="bg-[#121218] border border-purple-500/30 rounded-2xl p-5 sm:p-6 my-6 shadow-xl relative overflow-hidden">
      {/* Background ambient accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
              Zajednička Anketa
            </span>
            <h3 className="font-display text-base sm:text-lg font-bold text-white leading-snug">
              {poll.question}
            </h3>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-semibold text-slate-300 block">
            {totalVotes} {totalVotes === 1 ? 'glas' : 'glasova'}
          </span>
          <span className="text-[10px] text-slate-500">
            {userVotedOptionId ? 'Glasali ste' : 'Kliknite za glas'}
          </span>
        </div>
      </div>

      {/* Options List */}
      <div className="space-y-3">
        {poll.options.map(option => {
          const isSelected = userVotedOptionId === option.id;
          const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

          return (
            <button
              key={option.id}
              type="button"
              disabled={isLocked}
              onClick={() => onVoteOption(option.id)}
              className={`w-full text-left relative overflow-hidden rounded-xl border p-3.5 transition-all duration-300 group cursor-pointer ${
                isSelected
                  ? 'bg-purple-950/30 border-purple-500 ring-1 ring-purple-500/50 shadow-md shadow-purple-900/20'
                  : 'bg-[#181820] border-white/5 hover:border-purple-500/40 hover:bg-[#1c1c24]'
              }`}
            >
              {/* Animated Progress Bar fill */}
              <div
                style={{ width: `${percentage}%` }}
                className={`absolute top-0 bottom-0 left-0 transition-all duration-700 ease-out pointer-events-none rounded-xl ${
                  isSelected
                    ? 'bg-gradient-to-r from-purple-600/30 to-indigo-600/20'
                    : 'bg-white/[0.04] group-hover:bg-purple-600/10'
                }`}
              />

              {/* Option Content */}
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'border-purple-400 bg-purple-500 text-white'
                        : 'border-slate-600 group-hover:border-purple-400'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-4 h-4 fill-white text-purple-900" />}
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      isSelected ? 'text-purple-200 font-semibold' : 'text-slate-200 group-hover:text-white'
                    }`}
                  >
                    {option.text}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs sm:text-sm font-bold text-slate-300">
                    {percentage}%
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
                    ({option.votes})
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
