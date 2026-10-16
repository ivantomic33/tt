import React from 'react';
import { Monitor, Gamepad2, Trophy, Cpu, Users, Coffee, MessageSquare, ArrowRight, Layers } from 'lucide-react';
import { ForumSubforum } from '../../types';

interface SubforumCardProps {
  subforum: ForumSubforum;
  isSelected?: boolean;
  onSelect: (id: string) => void;
}

export const SubforumCard: React.FC<SubforumCardProps> = ({
  subforum,
  isSelected = false,
  onSelect,
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Monitor':
        return <Monitor className="w-5 h-5" />;
      case 'Gamepad2':
        return <Gamepad2 className="w-5 h-5" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5" />;
      case 'Cpu':
        return <Cpu className="w-5 h-5" />;
      case 'Users':
        return <Users className="w-5 h-5" />;
      case 'Coffee':
        return <Coffee className="w-5 h-5" />;
      default:
        return <Layers className="w-5 h-5" />;
    }
  };

  return (
    <div
      onClick={() => onSelect(subforum.id)}
      className={`group relative rounded-2xl p-4 sm:p-5 transition-all duration-300 border cursor-pointer flex flex-col justify-between ${
        isSelected
          ? 'bg-purple-950/25 border-purple-500 ring-1 ring-purple-500/40 shadow-xl shadow-purple-950/30'
          : 'bg-[#121217] hover:bg-[#15151e] border-white/5 hover:border-white/15'
      }`}
    >
      <div>
        {/* Header Icon + Counters */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div
            style={{
              backgroundColor: `${subforum.color}15`,
              color: subforum.color,
              borderColor: `${subforum.color}30`,
            }}
            className="p-2.5 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 shadow-md"
          >
            {getIcon(subforum.icon)}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
              <span className="font-bold text-slate-200">{subforum.threadCount}</span>
              <span className="text-[10px] text-slate-500">teme</span>
            </span>
            <span className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md">
              <MessageSquare className="w-2.5 h-2.5 text-slate-400" />
              <span className="font-bold text-slate-200">{subforum.replyCount}</span>
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-display text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition-colors mb-1">
          {subforum.name}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
          {subforum.description}
        </p>
      </div>

      {/* Latest Thread Preview */}
      {subforum.latestActivity && (
        <div className="pt-3 border-t border-white/5 text-[11px] text-slate-400">
          <span className="text-[10px] uppercase font-bold text-slate-500 block mb-0.5">
            Poslednja aktivnost:
          </span>
          <p className="text-slate-300 font-medium truncate group-hover:text-white transition-colors">
            {subforum.latestActivity.threadTitle}
          </p>
          <div className="flex items-center gap-1.5 text-slate-500 mt-1">
            <span className="text-purple-400 font-medium">
              {subforum.latestActivity.authorName}
            </span>
            <span>·</span>
            <span>{subforum.latestActivity.time}</span>
          </div>
        </div>
      )}
    </div>
  );
};
