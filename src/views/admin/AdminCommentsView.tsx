import React, { useState, useEffect } from 'react';
import { MessageSquare, CheckCircle, ShieldAlert, Trash2, Flag, AlertTriangle, EyeOff } from 'lucide-react';
import { Comment, Post } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../components/ui/Toast';

interface AdminCommentsViewProps {
  comments: Comment[];
  posts: Post[];
  onRefresh: () => void;
}

export const AdminCommentsView: React.FC<AdminCommentsViewProps> = ({
  comments,
  posts,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'comments' | 'reports'>('comments');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'spam'>('all');
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    setReports(StorageService.getReports());
  }, []);

  const filteredComments = comments.filter(c => {
    if (filter === 'all') return true;
    return c.status === filter;
  });

  const getPostTitle = (postId: number) => {
    const p = posts.find(post => post.id === postId);
    return p ? p.title : `Članak #${postId}`;
  };

  const handleUpdateStatus = (id: string, status: 'approved' | 'pending' | 'spam') => {
    StorageService.updateCommentStatus(id, status);
    showToast(`Status komentara postavljen na: ${status}`, 'success');
    onRefresh();
  };

  const handleDelete = (id: string) => {
    StorageService.deleteComment(id);
    showToast('Komentar je obrisan.', 'info');
    onRefresh();
  };

  const handleResolveReport = (id: string, status: 'resolved' | 'dismissed') => {
    StorageService.updateReportStatus(id, status);
    setReports(StorageService.getReports());
    showToast(status === 'resolved' ? 'Prijava rešena i zatvorena.' : 'Prijava odbačena.', 'success');
  };

  const handleDeleteReport = (id: string) => {
    StorageService.deleteReport(id);
    setReports(StorageService.getReports());
    showToast('Prijava je uklonjena.', 'info');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
            Moderacija & Prijave Sadržaja
          </h1>
          <p className="text-xs text-[#a1a1a1]">
            Upravljajte komentarima čitalaca i pregledajte prijave neprimerenog sadržaja.
          </p>
        </div>

        {/* Main Tab switch: Komentari vs Prijave */}
        <div className="flex items-center gap-2 p-1 bg-[#141414] border border-[#262626] rounded-xl text-xs">
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'comments'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Komentari ({comments.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Prijave Sadržaja ({reports.filter(r => r.status === 'pending').length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'comments' ? (
        <div className="space-y-4">
          {/* Filter controls */}
          <div className="flex items-center gap-1.5 p-1 bg-[#141414] border border-[#262626] rounded-lg text-xs w-fit">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'all' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Svi ({comments.length})
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'approved' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Odobreni
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'pending' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Na čekanju
            </button>
            <button
              onClick={() => setFilter('spam')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                filter === 'spam' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Spam
            </button>
          </div>

          {/* Comments List */}
          <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
            <div className="divide-y divide-[#262626]">
              {filteredComments.length === 0 ? (
                <div className="text-center py-16 text-xs text-[#71717a]">
                  Nema komentara sa izabranim statusom.
                </div>
              ) : (
                filteredComments.map(c => (
                  <div key={c.id} className="p-5 hover:bg-[#18181b] transition-colors space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">{c.author_name}</span>
                        <span className="text-xs text-[#71717a] font-mono">({c.author_email})</span>
                        <span>·</span>
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            c.status === 'approved'
                              ? 'bg-[#22c55e]/20 text-[#22c55e]'
                              : c.status === 'pending'
                              ? 'bg-[#eab308]/20 text-[#eab308]'
                              : 'bg-[#ef4444]/20 text-[#ef4444]'
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>
                      <span className="text-xs text-[#71717a]">
                        {new Date(c.created_at).toLocaleString('sr-RS')}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#d4d4d8] leading-relaxed bg-[#1c1c1c] p-3 rounded-lg border border-[#262626]">
                      {c.content}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-[#a1a1a1]">
                        Vest: <strong className="text-white">{getPostTitle(c.post_id)}</strong>
                      </span>

                      <div className="flex items-center gap-2">
                        {c.status !== 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'approved')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#22c55e]/20 hover:bg-[#22c55e]/30 text-[#22c55e] text-xs font-semibold cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Odobri</span>
                          </button>
                        )}
                        {c.status !== 'spam' && (
                          <button
                            onClick={() => handleUpdateStatus(c.id, 'spam')}
                            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] text-xs font-semibold cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Spam</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#ef4444]/20 text-[#71717a] hover:text-[#ef4444] cursor-pointer"
                          title="Obriši trajno"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Reports Section */
        <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
          <div className="divide-y divide-[#262626]">
            {reports.length === 0 ? (
              <div className="text-center py-16 text-xs text-[#71717a]">
                Nema prijavljenog sadržaja. Svi izveštaji su čisti!
              </div>
            ) : (
              reports.map(r => (
                <div key={r.id} className="p-5 hover:bg-[#18181b] transition-colors space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold text-[10px] uppercase tracking-wider">
                        {r.reason}
                      </span>
                      <span className="text-xs text-slate-400">
                        Prijavio: <strong className="text-white">{r.reporterName}</strong>
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                          r.status === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : r.status === 'resolved'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {r.status}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString('sr-RS')}
                    </span>
                  </div>

                  <div className="bg-[#1c1c1c] p-3 rounded-lg border border-[#262626] space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Prijavljeni sadržaj ({r.targetType}):
                    </span>
                    <p className="text-xs font-semibold text-white">{r.targetTitle}</p>
                    {r.details && (
                      <p className="text-xs text-slate-300 italic pt-1">Napomena: "{r.details}"</p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {r.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleResolveReport(r.id, 'resolved')}
                          className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Reši & Zatvori</span>
                        </button>
                        <button
                          onClick={() => handleResolveReport(r.id, 'dismissed')}
                          className="flex items-center gap-1 px-3 py-1 rounded bg-slate-700/30 hover:bg-slate-700/50 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          <span>Odbaci</span>
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteReport(r.id)}
                      className="p-1.5 rounded bg-[#1c1c1c] hover:bg-red-500/20 text-slate-400 hover:text-red-400 cursor-pointer"
                      title="Ukloni prijavu"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
