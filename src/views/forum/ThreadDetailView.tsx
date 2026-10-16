import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Pin,
  Clock,
  Eye,
  Share2,
  Copy,
  Check,
  Flame,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { ForumThread, ForumReply, VoteType } from '../../types';
import { FORUM_SUBFORUMS, ForumService } from '../../services/forumService';
import { StorageService } from '../../services/storage';
import { ThreadKarmaVote } from '../../components/forum/ThreadKarmaVote';

import { ForumPollCard } from '../../components/forum/ForumPollCard';
import { NestedReplyItem } from '../../components/forum/NestedReplyItem';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { updateSeoMeta, restoreDefaultSeoMeta } from '../../utils/seo';
import { supabase } from '../../lib/supabase';

interface ThreadDetailViewProps {
  slug: string;
  onNavigateBack: () => void;
  onSelectSubforum?: (subforumId: string) => void;
  onSelectAuthor?: (authorName: string) => void;
}

export const ThreadDetailView: React.FC<ThreadDetailViewProps> = ({
  slug,
  onNavigateBack,
  onSelectSubforum,
  onSelectAuthor,
}) => {

  const { user } = useAuth();
  const { showToast } = useToast();

  const [thread, setThread] = useState<ForumThread | undefined>(() =>
    ForumService.getThreadBySlug(slug)
  );
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [userPollVote, setUserPollVote] = useState<string | null>(null);

  // Root reply form state
  const [rootReplyContent, setRootReplyContent] = useState('');
  const [authorName, setAuthorName] = useState(
    user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Član Foruma')
  );
  const [copied, setCopied] = useState(false);

  const refreshThreadAndReplies = async () => {
    const localCurrent = ForumService.getThreadBySlug(slug);
    if (localCurrent) {
      setThread(localCurrent);
      setReplies(ForumService.getThreadReplies(localCurrent.id));
      setUserPollVote(ForumService.getUserPollVote(localCurrent.id));
    }

    const remoteCurrent = await ForumService.getThreadBySlugAsync(slug);
    const activeThread = remoteCurrent || localCurrent;
    if (activeThread) {
      setThread(activeThread);
      const remoteReplies = await ForumService.getThreadRepliesAsync(activeThread.id);
      setReplies(remoteReplies);
      setUserPollVote(ForumService.getUserPollVote(activeThread.id));
      updateSeoMeta({
        title: `${activeThread.title} - Nexus Forum`,
        description: activeThread.content.replace(/<[^>]*>/g, '').substring(0, 150),
        image:
          activeThread.authorAvatar ||
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        type: 'article',
      });
    }
  };

  useEffect(() => {
    refreshThreadAndReplies();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      restoreDefaultSeoMeta();
    };
  }, [slug]);

  // Real-time synchronization via Supabase Realtime subscriptions + SSE stream & BroadcastChannel
  useEffect(() => {
    let sse: EventSource | null = null;
    let bc: BroadcastChannel | null = null;
    const myClientId = StorageService.getClientId();

    const realtimeChannel = thread
      ? supabase
          .channel(`nexus_thread_detail_${thread.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'forum_threads', filter: `id=eq.${thread.id}` },
            (payload) => {
              if (payload.new) {
                setThread(prev => prev ? { ...prev, ...(payload.new as any) } : prev);
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'forum_replies', filter: `thread_id=eq.${thread.id}` },
            () => {
              refreshThreadAndReplies();
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'forum_votes' },
            () => {
              refreshThreadAndReplies();
            }
          )
          .subscribe()
      : null;

    try {
      sse = new EventSource('/api/forum/stream');
      sse.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'thread_voted' && thread && (data.threadId === thread.id || data.threadId === thread.slug)) {
            setThread(prev => prev ? { ...prev, score: data.score, upvotes: data.upvotes, downvotes: data.downvotes } : prev);
            if (data.triggeringClientId !== myClientId) {
              showToast(`Neko je upravo glasao na ovoj temi! (Karma: ${data.score})`, 'info');
            }
          } else if (data.type === 'reply_voted' || data.type === 'reply_added') {
            refreshThreadAndReplies();
          }
        } catch {}
      };
    } catch {}

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bc = new BroadcastChannel('nexus_forum_channel');
      bc.onmessage = (event) => {
        if (event.data?.type === 'thread_voted' && thread && event.data.threadId === thread.id) {
          setThread(prev => prev ? { ...prev, score: event.data.score } : prev);
        } else {
          refreshThreadAndReplies();
        }
      };
    }

    return () => {
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
      if (sse) sse.close();
      if (bc) bc.close();
    };
  }, [slug, thread?.id]);


  if (!thread) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-display text-3xl font-bold text-white">Diskusija nije pronađena</h2>
        <p className="text-slate-400">Tražena tema na forumu možda je uklonjena ili je link neispravan.</p>
        <button
          onClick={onNavigateBack}
          className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
        >
          Povratak na Forum
        </button>
      </div>
    );
  }

  const subforum = FORUM_SUBFORUMS.find(s => s.id === thread.subforumId);

  const handleVoteThread = (direction: 'up' | 'down') => {
    const updated = ForumService.voteThread(thread.id, direction);
    if (updated) setThread(updated);
  };

  const handleVotePollOption = (optionId: string) => {
    const updatedPoll = ForumService.votePoll(thread.id, optionId);
    if (updatedPoll) {
      setThread(prev => (prev ? { ...prev, poll: updatedPoll } : prev));
      setUserPollVote(optionId);
      showToast('Vaš glas u anketi je zabeležen!', 'success');
    }
  };

  const handleVoteReply = (replyId: string, direction: 'up' | 'down') => {
    ForumService.voteReply(replyId, direction);
    setReplies(ForumService.getThreadReplies(thread.id));
  };

  const handleAddRootReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rootReplyContent.trim()) {
      showToast('Molimo unesite sadržaj odgovora.', 'error');
      return;
    }

    ForumService.addReply({
      threadId: thread.id,
      parentId: null,
      content: rootReplyContent.trim(),
      authorName: authorName.trim() || 'Član Foruma',
      authorRole: user?.role === 'admin' ? 'Admin' : 'Član',
    });

    setRootReplyContent('');
    showToast('Vaš odgovor je uspešno postavljen!', 'success');
    refreshThreadAndReplies();
  };

  const handleAddNestedReply = (parentId: string, content: string, mentions?: string[]) => {
    ForumService.addReply({
      threadId: thread.id,
      parentId,
      content,
      authorName: authorName.trim() || 'Član Foruma',
      authorRole: user?.role === 'admin' ? 'Admin' : 'Član',
      mentions,
    });

    showToast('Odgovor uspešno poslat!', 'success');
    refreshThreadAndReplies();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast('Link ka temi je kopiran u clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 flex-wrap" aria-label="Breadcrumb">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-1 hover:text-purple-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Forum</span>
        </button>
        <span className="text-white/20">/</span>
        {subforum && (
          <>
            <button
              onClick={() => {
                if (onSelectSubforum) onSelectSubforum(subforum.id);
                else onNavigateBack();
              }}
              className="hover:text-purple-300 transition-colors font-medium text-slate-300 cursor-pointer"
            >
              {subforum.name}
            </button>
            <span className="text-white/20">/</span>
          </>
        )}
        <span className="text-purple-400/80 truncate max-w-xs sm:max-w-md font-medium">
          {thread.title}
        </span>
      </nav>

      {/* Main Thread Article Card */}
      <article className="bg-[#121217] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Karma Vote + Thread Details */}
        <div className="flex gap-4 sm:gap-6">
          {/* Karma Vote Widget on Left */}
          <div>
            <ThreadKarmaVote
              score={thread.score}
              userVote={thread.userVote}
              onVote={handleVoteThread}
              size="lg"
            />
          </div>

          {/* Main Body */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Badges row */}
            <div className="flex items-center gap-2 flex-wrap">
              {thread.isPinned && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider">
                  <Pin className="w-3 h-3 fill-amber-300" />
                  Zakačeno
                </span>
              )}

              {subforum && (
                <span
                  style={{
                    backgroundColor: `${subforum.color}15`,
                    color: subforum.color,
                    borderColor: `${subforum.color}40`,
                  }}
                  className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border"
                >
                  {subforum.name}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight">
              {thread.title}
            </h1>

            {/* Author Byline */}
            <div className="flex items-center justify-between gap-4 py-3 border-y border-white/5 flex-wrap text-xs text-slate-400">
              <div
                onClick={() => onSelectAuthor && onSelectAuthor(thread.authorName)}
                className={`flex items-center gap-3 ${onSelectAuthor ? 'hover:text-purple-300 cursor-pointer' : ''}`}
                title={`Pogledaj profil igrača ${thread.authorName}`}
              >
                <img
                  src={thread.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                  alt={thread.authorName}
                  className="w-9 h-9 rounded-full object-cover border border-purple-500/30 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm hover:text-purple-300 transition-colors">
                      {thread.authorName}
                    </span>
                    <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 rounded">
                      Autor Teme (OP)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1 text-purple-400">
                      <Flame className="w-3 h-3" />
                      {thread.authorKarma || 50} karma
                    </span>
                    <span>·</span>
                    <span>{thread.authorRole || 'Član'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {ForumService.formatRelativeTime(thread.createdAt)}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  {thread.views} pregleda
                </span>
              </div>
            </div>

            {/* Thread Body Content */}
            <div className="text-sm sm:text-base text-slate-200 leading-relaxed whitespace-pre-line py-2">
              {thread.content}
            </div>

            {/* Interactive Community Poll (if attached to thread) */}
            {thread.poll && (
              <ForumPollCard
                poll={thread.poll}
                userVotedOptionId={userPollVote}
                onVoteOption={handleVotePollOption}
                isLocked={thread.isLocked}
              />
            )}

            {/* Tags */}
            {thread.tags && thread.tags.length > 0 && (
              <div className="flex items-center flex-wrap gap-1.5 pt-3 border-t border-white/5">
                <span className="text-xs font-semibold text-slate-500 mr-1">Tagovi:</span>
                {thread.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs font-mono text-purple-300 bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-lg"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Utility Ribbon (Share, Copy Link) */}
            <div className="flex items-center justify-between gap-3 pt-3 text-xs">
              <span className="flex items-center gap-1.5 text-purple-300 font-semibold bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl">
                <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
                <span>{thread.replyCount} odgovora</span>
              </span>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Kopirano' : 'Kopiraj Link Teme'}</span>
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Replies & Discussion Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h2 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
              Odgovori & Diskusija ({replies.reduce((sum, r) => sum + 1 + (r.replies?.length || 0), 0)})
            </h2>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            Podržani ugnježdeni odgovori uz @mention
          </span>
        </div>

        {/* Main Root Comment Form */}
        <form onSubmit={handleAddRootReply} className="bg-[#121217] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Napišite vaš odgovor</span>
            </h3>
            {user && (
              <span className="text-[11px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-0.5 rounded-full">
                Prijavljeni kao: {user.email}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Vaš nadimak *
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="npr. ProGamer99"
                className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <textarea
              rows={4}
              required
              value={rootReplyContent}
              onChange={e => setRootReplyContent(e.target.value)}
              placeholder="Napišite vaš stav, podelite iskustvo ili odgovorite autoru (možete koristiti @ime)..."
              className="w-full bg-[#181822] border border-white/10 rounded-xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-500">
              Savet: Koristite @nadimak da pomenete određenog člana u odgovoru.
            </span>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all cursor-pointer transform hover:scale-105"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Objavi Odgovor</span>
            </button>
          </div>
        </form>

        {/* Hierarchical Replies Tree */}
        <div className="space-y-4">
          {replies.length === 0 ? (
            <div className="bg-[#121217] border border-white/5 rounded-2xl p-8 text-center text-xs text-slate-500">
              Još uvek nema odgovora na ovu temu. Budite prvi koji će započeti diskusiju!
            </div>
          ) : (
            replies.map(reply => (
              <NestedReplyItem
                key={reply.id}
                reply={reply}
                threadAuthorName={thread.authorName}
                depth={0}
                onAddReply={handleAddNestedReply}
                onVoteReply={handleVoteReply}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
};
