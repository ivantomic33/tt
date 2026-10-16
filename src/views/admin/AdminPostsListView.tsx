import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  Edit,
  Trash2,
  Eye,
  CheckCircle2,
  FileClock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Post, Category } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../components/ui/Toast';

interface AdminPostsListViewProps {
  posts: Post[];
  categories: Category[];
  onNavigateTab: (tab: string, param?: any) => void;
  onNavigatePublic: (slug?: string) => void;
  onRefresh: () => void;
}

export const AdminPostsListView: React.FC<AdminPostsListViewProps> = ({
  posts,
  categories,
  onNavigateTab,
  onNavigatePublic,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Filtered list
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      if (statusFilter !== 'all' && post.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && post.category?.slug !== categoryFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return post.title.toLowerCase().includes(q) || post.excerpt.toLowerCase().includes(q);
      }
      return true;
    });
  }, [posts, statusFilter, categoryFilter, search]);

  const handleDelete = (id: number) => {
    const success = StorageService.deletePost(id);
    if (success) {
      showToast('Vest je uspešno obrisana.', 'success');
      setDeleteConfirmId(null);
      onRefresh();
    } else {
      showToast('Došlo je do greške prilikom brisanja.', 'error');
    }
  };

  const toggleStatus = (post: Post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    StorageService.updatePost(post.id, { status: newStatus });
    showToast(`Status vesti promenjen u: ${newStatus === 'published' ? 'Objavljeno' : 'Draft'}`, 'info');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header & New Post CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
            Upravljanje Vestima
          </h1>
          <p className="text-xs text-[#a1a1a1]">
            Pregledajte, filtrirajte, uređujte ili objavljujte sve gaming članke.
          </p>
        </div>

        <button
          onClick={() => onNavigateTab('post_new')}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Dodaj Novu Vest</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pretraži po naslovu..."
            className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-[#71717a] focus:outline-none focus:border-[#a855f7]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status filter */}
          <div className="flex items-center gap-1 p-1 bg-[#1c1c1c] border border-[#262626] rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'all' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Sve ({posts.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'published' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Objavljene
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 rounded-md transition-colors ${
                statusFilter === 'draft' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              Draftovi
            </button>
          </div>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
          >
            <option value="all">Sve kategorije</option>
            {categories.map(c => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Posts Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1c1c1c] text-[#a1a1a1] uppercase font-bold tracking-wider border-b border-[#262626]">
              <tr>
                <th className="py-3 px-4">Naslov & Slika</th>
                <th className="py-3 px-4">Kategorija</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Pregledi</th>
                <th className="py-3 px-4">Datum</th>
                <th className="py-3 px-4 text-right">Akcije</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#71717a]">
                    Nema vesti koje odgovaraju zadatom filteru.
                  </td>
                </tr>
              ) : (
                filteredPosts.map(post => (
                  <tr key={post.id} className="hover:bg-[#1a1a1a] transition-colors">
                    {/* Title & thumb */}
                    <td className="py-3.5 px-4 max-w-md">
                      <div className="flex items-center gap-3">
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          referrerPolicy="no-referrer"
                          className="w-14 h-9 rounded object-cover border border-[#262626] shrink-0"
                        />
                        <div className="min-w-0">
                          <button
                            onClick={() => onNavigateTab('post_edit', post.id)}
                            className="font-semibold text-white hover:text-[#22d3ee] truncate block text-left transition-colors"
                          >
                            {post.title}
                          </button>
                          <span className="text-[11px] text-[#71717a] truncate block">
                            /{post.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        style={{ color: post.category?.color || '#a1a1a1' }}
                        className="font-bold uppercase tracking-wider text-[11px]"
                      >
                        {post.category?.name}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleStatus(post)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                          post.status === 'published'
                            ? 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30'
                            : 'bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30'
                        }`}
                      >
                        {post.status === 'published' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Objavljeno</span>
                          </>
                        ) : (
                          <>
                            <FileClock className="w-3 h-3" />
                            <span>Draft</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Views */}
                    <td className="py-3.5 px-4 tabular-nums text-[#d4d4d8] font-mono whitespace-nowrap">
                      {post.views.toLocaleString()}
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-[#71717a] whitespace-nowrap">
                      {new Date(post.created_at).toLocaleDateString('sr-RS')}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onNavigatePublic(post.slug)}
                          title="Pogledaj na portalu"
                          className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#a1a1a1] hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onNavigateTab('post_edit', post.id)}
                          title="Izmeni vest"
                          className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#22d3ee] transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(post.id)}
                          title="Obriši vest"
                          className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#ef4444]/20 text-[#ef4444] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#ef4444]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-display text-lg font-bold text-white uppercase">
                Potvrda brisanja
              </h3>
            </div>
            <p className="text-xs text-[#a1a1a1] leading-relaxed">
              Da li ste sigurni da želite trajno da obrišete ovaj članak iz baze podataka? Ova radnja se ne može poništiti.
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262626]">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] text-[#a1a1a1] hover:text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Otkaži
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-bold uppercase rounded-lg transition-colors"
              >
                Obriši trajno
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
