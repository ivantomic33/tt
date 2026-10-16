import React, { useState, useEffect } from 'react';
import {
  MessagesSquare,
  Search,
  Filter,
  Trash2,
  Pin,
  Lock,
  Unlock,
  Eye,
  ExternalLink,
  MessageSquare,
  Flame,
  ThumbsUp,
  AlertTriangle,
  Edit,
  Check,
  X,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ForumThread, ForumSubforum } from '../../types';
import { ForumService } from '../../services/forumService';
import { useToast } from '../../components/ui/Toast';

interface AdminForumThreadsViewProps {
  onNavigatePublic?: (slug?: string) => void;
  onRefresh?: () => void;
}

export const AdminForumThreadsView: React.FC<AdminForumThreadsViewProps> = ({
  onNavigatePublic,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [subforums, setSubforums] = useState<ForumSubforum[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubforum, setSelectedSubforum] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'top' | 'replies'>('newest');

  // Deletion modal state
  const [threadToDelete, setThreadToDelete] = useState<ForumThread | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit modal state
  const [editingThread, setEditingThread] = useState<ForumThread | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editSubforumId, setEditSubforumId] = useState('');
  const [editTags, setEditTags] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [allThreads, allSubs] = await Promise.all([
        ForumService.getThreadsAsync({ subforumId: 'all', sortBy: 'new' }),
        ForumService.getSubforumsAsync(),
      ]);
      setThreads(allThreads);
      setSubforums(allSubs);
    } catch {
      setThreads(ForumService.getThreads());
      setSubforums(ForumService.getSubforums());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time events
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/forum/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            ['thread_created', 'thread_voted', 'thread_deleted', 'thread_updated', 'reply_added', 'reply_deleted'].includes(
              payload.type
            )
          ) {
            loadData();
          }
        } catch {}
      };
    } catch {}

    const bc = typeof window !== 'undefined' && 'BroadcastChannel' in window
      ? new BroadcastChannel('nexus_forum_channel')
      : null;

    if (bc) {
      bc.onmessage = () => loadData();
    }

    return () => {
      eventSource?.close();
      bc?.close();
    };
  }, []);

  // Filtered and sorted threads
  const filteredThreads = threads
    .filter(t => {
      if (selectedSubforum !== 'all' && t.subforumId !== selectedSubforum) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.authorName.toLowerCase().includes(q) ||
        t.content.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'top') return b.score - a.score;
      if (sortBy === 'replies') return b.replyCount - a.replyCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  // Handle Delete Thread
  const confirmDelete = async () => {
    if (!threadToDelete) return;
    setIsDeleting(true);
    try {
      ForumService.deleteThread(threadToDelete.id);
      setThreads(prev => prev.filter(t => t.id !== threadToDelete.id));
      showToast(`Tema "${threadToDelete.title}" je obrisana sa foruma.`, 'success');
      setThreadToDelete(null);
      onRefresh?.();
    } catch (err: any) {
      showToast('Greška pri brisanju teme.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Toggle Pin
  const handleTogglePin = (thread: ForumThread) => {
    const newStatus = ForumService.togglePinThread(thread.id);
    setThreads(prev =>
      prev.map(t => (t.id === thread.id ? { ...t, isPinned: newStatus } : t))
    );
    showToast(newStatus ? 'Tema je prikačena na vrh.' : 'Uklonjeno prikačivanje teme.', 'info');
  };

  // Handle Toggle Lock
  const handleToggleLock = (thread: ForumThread) => {
    const newStatus = ForumService.toggleLockThread(thread.id);
    setThreads(prev =>
      prev.map(t => (t.id === thread.id ? { ...t, isLocked: newStatus } : t))
    );
    showToast(newStatus ? 'Tema je zaključana za nove komentare.' : 'Tema je otključana.', 'info');
  };

  // Start Edit Modal
  const startEdit = (thread: ForumThread) => {
    setEditingThread(thread);
    setEditTitle(thread.title);
    setEditContent(thread.content);
    setEditSubforumId(thread.subforumId);
    setEditTags(thread.tags.join(', '));
  };

  // Save Thread Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingThread || !editTitle.trim()) return;

    const parsedTags = editTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    ForumService.updateThread(editingThread.id, {
      title: editTitle.trim(),
      content: editContent.trim(),
      subforumId: editSubforumId,
      tags: parsedTags,
    });

    setThreads(prev =>
      prev.map(t =>
        t.id === editingThread.id
          ? {
              ...t,
              title: editTitle.trim(),
              content: editContent.trim(),
              subforumId: editSubforumId,
              tags: parsedTags,
            }
          : t
      )
    );

    showToast('Tema je uspešno ažurirana!', 'success');
    setEditingThread(null);
    onRefresh?.();
  };

  const totalReplies = threads.reduce((sum, t) => sum + (t.replyCount || 0), 0);
  const totalKarmaScore = threads.reduce((sum, t) => sum + (t.score || 0), 0);
  const pinnedCount = threads.filter(t => t.isPinned).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#a855f7]/20 text-[#a855f7]">
              <MessagesSquare className="w-5 h-5" />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Moderacija Forum Tema
            </h1>
          </div>
          <p className="text-xs text-[#a1a1a1]">
            Upravljajte svim diskusijama na forumu, brišite nepoželjne teme, zaključavajte ili pinujte postove.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/forum"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-medium text-[#22d3ee] rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Otvori Forum</span>
          </a>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-1">
            <span className="text-xs font-medium">Ukupno Tema</span>
            <MessagesSquare className="w-4 h-4 text-[#a855f7]" />
          </div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {threads.length}
          </div>
          <span className="text-[11px] text-[#71717a]">aktivne u bazi</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-1">
            <span className="text-xs font-medium">Komentari & Odgovori</span>
            <MessageSquare className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <div className="text-2xl font-display font-bold text-[#22d3ee] tabular-nums">
            {totalReplies}
          </div>
          <span className="text-[11px] text-[#71717a]">diskusija i replika</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-1">
            <span className="text-xs font-medium">Ukupna Karma</span>
            <Flame className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="text-2xl font-display font-bold text-[#f59e0b] tabular-nums">
            {totalKarmaScore}
          </div>
          <span className="text-[11px] text-[#71717a]">neto upvotes/downvotes</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-1">
            <span className="text-xs font-medium">Pinovane Teme</span>
            <Pin className="w-4 h-4 text-[#ec4899]" />
          </div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {pinnedCount}
          </div>
          <span className="text-[11px] text-[#71717a]">istaknute na vrhu</span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pretraži teme po naslovu, autoru, sadržaju ili tagovima..."
            className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-[#a855f7]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Subforum Filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSubforum}
            onChange={e => setSelectedSubforum(e.target.value)}
            className="bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
          >
            <option value="all">Svi Potforumi ({threads.length})</option>
            {subforums.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.name} ({threads.filter(t => t.subforumId === sub.id).length})
              </option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
          >
            <option value="newest">Najnovije prvo</option>
            <option value="top">Najveća karma (Top)</option>
            <option value="replies">Najviše odgovora</option>
          </select>
        </div>
      </div>

      {/* Threads Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#18181b] border-b border-[#262626] flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-white">
            Prikazano tema: {filteredThreads.length} od {threads.length}
          </span>
          <span className="text-[11px] text-[#71717a]">
            Kliknite na akcije za brisanje, izmenu ili zaključavanje teme
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#71717a] text-xs">
            Učitavanje tema foruma...
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-12 text-center text-[#71717a] text-xs">
            Nema tema koje odgovaraju pretrazi ili filterima.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161618] border-b border-[#262626] text-[#71717a] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4">Tema i Sadržaj</th>
                  <th className="py-3 px-4">Potforum</th>
                  <th className="py-3 px-4">Autor</th>
                  <th className="py-3 px-4 text-center">Karma</th>
                  <th className="py-3 px-4 text-center">Odgovori</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Akcije</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredThreads.map(thread => {
                  const subforum = subforums.find(s => s.id === thread.subforumId);

                  return (
                    <tr
                      key={thread.id}
                      className="hover:bg-[#1a1a1a] transition-colors group"
                    >
                      {/* Thread Title & Preview */}
                      <td className="py-3.5 px-4 max-w-md">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {thread.isPinned && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#ec4899]/10 text-[#ec4899] border border-[#ec4899]/30">
                                <Pin className="w-2.5 h-2.5" /> Pinned
                              </span>
                            )}
                            {thread.isLocked && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/30">
                                <Lock className="w-2.5 h-2.5" /> Locked
                              </span>
                            )}
                            <h4 className="font-semibold text-white line-clamp-1 group-hover:text-[#22d3ee] transition-colors">
                              {thread.title}
                            </h4>
                          </div>

                          <p className="text-[#a1a1a1] text-[11px] line-clamp-1">
                            {thread.content}
                          </p>

                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            {thread.tags.map(tag => (
                              <span
                                key={tag}
                                className="text-[10px] text-[#71717a] font-mono bg-[#1c1c1c] px-1.5 py-0.5 rounded border border-[#262626]"
                              >
                                #{tag}
                              </span>
                            ))}
                            {thread.poll && (
                              <span className="text-[10px] text-[#a855f7] bg-[#a855f7]/10 px-1.5 py-0.5 rounded border border-[#a855f7]/20">
                                Anketa ({thread.poll.totalVotes} glasova)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Subforum */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider inline-block"
                          style={{
                            backgroundColor: `${subforum?.color || '#a855f7'}15`,
                            color: subforum?.color || '#a855f7',
                            border: `1px solid ${subforum?.color || '#a855f7'}30`,
                          }}
                        >
                          {subforum?.name || thread.subforumId}
                        </span>
                      </td>

                      {/* Author */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <img
                            src={
                              thread.authorAvatar ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'
                            }
                            alt={thread.authorName}
                            className="w-6 h-6 rounded-full object-cover border border-[#262626]"
                          />
                          <div>
                            <span className="text-xs font-medium text-white block">
                              {thread.authorName}
                            </span>
                            <span className="text-[10px] text-[#71717a]">
                              {thread.authorRole || 'Član'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Karma Score */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-xs text-[#22c55e]">
                          <ThumbsUp className="w-3 h-3 text-[#22c55e]" />
                          <span>{thread.score}</span>
                        </div>
                        <div className="text-[9px] text-[#71717a]">
                          +{thread.upvotes} / -{thread.downvotes}
                        </div>
                      </td>

                      {/* Reply Count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-mono text-xs text-white">
                          <MessageSquare className="w-3 h-3 text-[#22d3ee]" />
                          <span>{thread.replyCount}</span>
                        </div>
                        <div className="text-[9px] text-[#71717a]">
                          {thread.views} pregleda
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="text-[10px] font-mono text-[#71717a]">
                          {ForumService.formatRelativeTime(thread.createdAt)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* View public link */}
                          <a
                            href={`/forum/thread/${thread.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#71717a] hover:text-[#22d3ee] transition-colors"
                            title="Pregledaj javno na forumu"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          {/* Toggle Pin */}
                          <button
                            onClick={() => handleTogglePin(thread)}
                            className={`p-1.5 rounded transition-colors ${
                              thread.isPinned
                                ? 'bg-[#ec4899]/20 text-[#ec4899]'
                                : 'bg-[#1c1c1c] hover:bg-[#262626] text-[#71717a] hover:text-white'
                            }`}
                            title={thread.isPinned ? 'Otkači sa vrha' : 'Prikači na vrh'}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Lock */}
                          <button
                            onClick={() => handleToggleLock(thread)}
                            className={`p-1.5 rounded transition-colors ${
                              thread.isLocked
                                ? 'bg-[#ef4444]/20 text-[#ef4444]'
                                : 'bg-[#1c1c1c] hover:bg-[#262626] text-[#71717a] hover:text-white'
                            }`}
                            title={thread.isLocked ? 'Otključaj diskusiju' : 'Zaključaj temu'}
                          >
                            {thread.isLocked ? (
                              <Lock className="w-3.5 h-3.5" />
                            ) : (
                              <Unlock className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Edit thread */}
                          <button
                            onClick={() => startEdit(thread)}
                            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#71717a] hover:text-[#22d3ee] transition-colors"
                            title="Izmeni temu"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete thread */}
                          <button
                            onClick={() => setThreadToDelete(thread)}
                            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#ef4444]/20 text-[#ef4444] transition-colors"
                            title="Obriši temu sa foruma"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {threadToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-[#ef4444]">
              <div className="p-2 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                  Potvrda Brisanja Teme
                </h3>
                <span className="text-xs text-[#a1a1a1]">Ova akcija je nepovratna</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#262626] text-xs text-[#d4d4d8] space-y-1">
              <span className="font-semibold text-white block">
                {threadToDelete.title}
              </span>
              <p className="text-[11px] text-[#71717a] line-clamp-2">
                {threadToDelete.content}
              </p>
              <div className="text-[10px] text-[#ef4444] pt-1">
                Uklanjanjem ove teme biće obrisani i svi ugnježdeni odgovori ({threadToDelete.replyCount}) i glasovi korisnika.
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setThreadToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs font-semibold text-[#a1a1a1] hover:text-white transition-colors"
              >
                Otkaži
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-xs font-bold uppercase tracking-wider text-white transition-colors shadow-lg shadow-red-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Brisanje...' : 'Obriši Temu'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT THREAD MODAL */}
      {editingThread && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#22d3ee]" />
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                  Izmena Forum Teme
                </h3>
              </div>
              <button
                onClick={() => setEditingThread(null)}
                className="text-[#71717a] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Naslov Teme *
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Potforum *
                </label>
                <select
                  value={editSubforumId}
                  onChange={e => setEditSubforumId(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                >
                  {subforums.map(sub => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Tagovi (razdvojeni zarezom)
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={e => setEditTags(e.target.value)}
                  placeholder="PC, Nvidia, CS2..."
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Tekst diskusije / sadržaj *
                </label>
                <textarea
                  rows={5}
                  required
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingThread(null)}
                  className="px-4 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs font-semibold text-[#a1a1a1] hover:text-white"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-purple-500/20"
                >
                  Sačuvaj Izmene
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
