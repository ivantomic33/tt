import React, { useState } from 'react';
import { Reply as ReplyIcon, MessageSquare, ChevronDown, ChevronRight, Send, ShieldCheck, Flame } from 'lucide-react';
import { ForumReply, VoteType } from '../../types';
import { ThreadKarmaVote } from './ThreadKarmaVote';
import { ForumService } from '../../services/forumService';
import { useAuth } from '../../contexts/AuthContext';

interface NestedReplyItemProps {
  reply: ForumReply;
  threadAuthorName?: string;
  depth?: number;
  onAddReply: (parentId: string, content: string, mentions?: string[]) => void;
  onVoteReply: (replyId: string, direction: 'up' | 'down') => void;
}

export const NestedReplyItem: React.FC<NestedReplyItemProps> = ({
  reply,
  threadAuthorName,
  depth = 0,
  onAddReply,
  onVoteReply,
}) => {
  const { user } = useAuth();
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState(`@${reply.authorName} `);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isOP = threadAuthorName && reply.authorName.toLowerCase() === threadAuthorName.toLowerCase();
  const childReplies = reply.replies || [];
  const hasChildren = childReplies.length > 0;

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    onAddReply(reply.id, replyText.trim(), [reply.authorName]);
    setReplyText(`@${reply.authorName} `);
    setIsReplying(false);
  };

  // Render text with styled @mentions
  const renderContentWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9_-]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={index}
            className="inline-flex items-center text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-semibold text-xs border border-purple-500/20 mr-1 hover:bg-purple-500/20 cursor-pointer"
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const maxVisualIndent = 4;
  const currentVisualDepth = Math.min(depth, maxVisualIndent);

  return (
    <div
      className={`relative transition-all duration-300 ${
        depth > 0 ? 'ml-3 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-purple-900/30 hover:border-purple-500/40' : ''
      }`}
    >
      <div className="bg-[#121217] hover:bg-[#14141c] border border-white/5 hover:border-white/10 rounded-2xl p-4 sm:p-5 transition-all my-3 shadow-sm">
        {/* Reply Header: Author, Karma, Time, OP Badge */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <img
              src={reply.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
              alt={reply.authorName}
              className="w-8 h-8 rounded-full object-cover border border-purple-500/30"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs sm:text-sm text-white">
                {reply.authorName}
              </span>

              {isOP && (
                <span className="px-1.5 py-0.5 rounded bg-purple-600/30 border border-purple-400/40 text-purple-300 text-[10px] font-bold uppercase tracking-wider">
                  OP
                </span>
              )}

              {reply.authorRole === 'Moderator' && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                  <ShieldCheck className="w-2.5 h-2.5" /> Mod
                </span>
              )}

              <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20 flex items-center gap-1">
                <Flame className="w-2.5 h-2.5 text-purple-400" />
                {reply.authorKarma || 25} karma
              </span>

              <span className="text-[11px] text-slate-500">
                · {ForumService.formatRelativeTime(reply.createdAt)}
              </span>
            </div>
          </div>

          {/* Collapse Button */}
          {hasChildren && (
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-xs flex items-center gap-1"
            >
              {isCollapsed ? (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-[11px]">({childReplies.length})</span>
                </>
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>

        {/* Content */}
        {!isCollapsed && (
          <>
            <div className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4 pl-1">
              {renderContentWithMentions(reply.content)}
            </div>

            {/* Actions: Karma Vote & Reply button */}
            <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
              <div className="flex items-center gap-3">
                <ThreadKarmaVote
                  score={reply.score}
                  userVote={reply.userVote}
                  onVote={dir => onVoteReply(reply.id, dir)}
                  orientation="horizontal"
                  size="sm"
                />

                <button
                  type="button"
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors cursor-pointer"
                >
                  <ReplyIcon className="w-3 h-3" />
                  <span>Odgovori</span>
                </button>
              </div>

              {hasChildren && isCollapsed && (
                <span className="text-[11px] text-purple-400/80 font-medium">
                  {childReplies.length} skrivenih odgovora
                </span>
              )}
            </div>

            {/* Inline Threaded Reply Form */}
            {isReplying && (
              <form onSubmit={handleSendReply} className="mt-3 pt-3 border-t border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs text-purple-300 font-medium">
                  <span>Odgovor za @{reply.authorName}:</span>
                  <button
                    type="button"
                    onClick={() => setIsReplying(false)}
                    className="text-slate-500 hover:text-slate-300"
                  >
                    Otkaži
                  </button>
                </div>
                <textarea
                  rows={2}
                  required
                  autoFocus
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Napišite vaš odgovor..."
                  className="w-full bg-[#181822] border border-white/10 rounded-xl p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer shadow-md transition-colors"
                  >
                    <Send className="w-3 h-3" />
                    <span>Pošalji odgovor</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Hierarchical Child Replies */}
      {!isCollapsed && hasChildren && (
        <div className="space-y-1">
          {childReplies.map(child => (
            <NestedReplyItem
              key={child.id}
              reply={child}
              threadAuthorName={threadAuthorName}
              depth={depth + 1}
              onAddReply={onAddReply}
              onVoteReply={onVoteReply}
            />
          ))}
        </div>
      )}
    </div>
  );
};
