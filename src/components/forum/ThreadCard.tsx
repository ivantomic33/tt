import React from 'react';
import { MessageSquare, Eye, Pin, BarChart3, Clock, Sparkles } from 'lucide-react';
import { ForumThread, VoteType } from '../../types';
import { ThreadKarmaVote } from './ThreadKarmaVote';
import { FORUM_SUBFORUMS, ForumService } from '../../services/forumService';

interface ThreadCardProps {
  thread: ForumThread;
  onSelectThread: (slug: string) => void;
  onSelectSubforum?: (subforumId: string) => void;
  onVoteThread: (threadId: string, direction: 'up' | 'down') => void;
  onSelectAuthor?: (authorName: string) => void;
}

export const ThreadCard: React.FC<ThreadCardProps> = ({
  thread,
  onSelectThread,
  onSelectSubforum,
  onVoteThread,
  onSelectAuthor,
}) => {
  const subforum = FORUM_SUBFORUMS.find(s => s.id === thread.subforumId);

  return (
    <div
      onClick={() => onSelectThread(thread.slug)}
      className="group relative bg-[#121217] hover:bg-[#15151e] border border-white/5 hover:border-purple-500/30 rounded-2xl p-4 sm:p-5 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-purple-950/20 cursor-pointer flex gap-3 sm:gap-4"
    >
      {/* Left Column: Karma Vote */}
      <div onClick={e => e.stopPropagation()}>
        <ThreadKarmaVote
          score={thread.score}
          userVote={thread.userVote}
          onVote={dir => onVoteThread(thread.id, dir)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          {/* Header row: Subforum, Pinned, Poll, Tags */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {thread.isPinned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                <Pin className="w-2.5 h-2.5 fill-amber-300" />
                Zakačeno
              </span>
            )}

            {subforum && (
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (onSelectSubforum) onSelectSubforum(subforum.id);
                }}
                style={{
                  backgroundColor: `${subforum.color}15`,
                  color: subforum.color,
                  borderColor: `${subforum.color}35`,
                }}
                className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border hover:brightness-125 transition-all"
              >
                {subforum.name}
              </button>
            )}

            {thread.poll && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-semibold">
                <BarChart3 className="w-2.5 h-2.5 text-purple-400" />
                Anketa ({thread.poll.totalVotes} glasova)
              </span>
            )}

            {thread.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5"
              >
                #{tag}
              </span>
            ))}
          </div>

          {/* Title */}
          <h3 className="font-display text-base sm:text-lg font-bold text-white group-hover:text-purple-300 transition-colors leading-snug line-clamp-2 mb-1.5">
            {thread.title}
          </h3>

          {/* Excerpt */}
          <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed mb-3">
            {thread.content}
          </p>
        </div>

        {/* Footer: Author, Timestamp, Reply Count, Views */}
        <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-white/5 text-xs text-slate-400 flex-wrap">
          <div
            onClick={e => {
              if (onSelectAuthor && thread.authorName) {
                e.stopPropagation();
                onSelectAuthor(thread.authorName);
              }
            }}
            className={`flex items-center gap-2 ${onSelectAuthor ? 'hover:text-purple-300 cursor-pointer' : ''}`}
            title={`Pogledaj profil igrača ${thread.authorName}`}
          >
            <img
              src={thread.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
              alt={thread.authorName}
              className="w-5 h-5 rounded-full object-cover border border-purple-500/20"
            />
            <span className="font-medium text-slate-300 hover:text-purple-300 transition-colors">
              {thread.authorName}
            </span>
            <span className="text-slate-600">·</span>
            <span className="flex items-center gap-1 text-[11px] text-slate-500">
              <Clock className="w-3 h-3" />
              {ForumService.formatRelativeTime(thread.lastActivityAt || thread.createdAt)}
            </span>
          </div>


          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="flex items-center gap-1 text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20 group-hover:bg-purple-500/20 transition-colors">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>{thread.replyCount}</span>
              <span className="hidden sm:inline">odgovora</span>
            </span>

            <span className="flex items-center gap-1 text-slate-400 font-mono text-[11px]">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <span>{thread.views}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
