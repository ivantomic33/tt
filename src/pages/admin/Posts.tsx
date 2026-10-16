import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  Calendar,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { StorageService } from '../../services/storage';
import { CmsClient } from '../../services/cmsClient';

interface PostItem {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  cover_image?: string;
  status: 'draft' | 'published';
  views: number;
  created_at: string;
  published_at?: string;
  category_id?: number;
  categories?: {
    id: number;
    name: string;
    color?: string;
  } | null;
}

interface CategoryOption {
  id: number;
  name: string;
}

export const Posts: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [posts, setPosts] = useState<PostItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filteri i Pretraga
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Paginacija (20 po strani)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Brisanje modal state
  const [postToDelete, setPostToDelete] = useState<PostItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Učitavanje kategorija
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });
      if (data) setCategories(data);
    } catch (err) {
      console.warn('Greška pri dohvatanju kategorija:', err);
    }
  }, []);

  // Učitavanje vesti (preferirano preko autentifikovanog admin API-ja, uz fallback)
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Autentifikovani CMS API — obuhvata i neobjavljene (draft) postove.
      const apiPosts = await CmsClient.listPosts();
      if (apiPosts !== null) {
        setPosts(apiPosts as any);
        return;
      }

      // 2. Fallback: anon čitanje (nakon RLS-a vidljivi su samo objavljeni postovi).
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          slug,
          excerpt,
          cover_image,
          status,
          views,
          created_at,
          published_at,
          category_id,
          categories:category_id ( id, name, color )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts((data as any) || []);
    } catch (err: any) {
      console.error('Greška pri dohvatanju vesti:', err);
      showToast('Greška pri učitavanju vesti iz baze.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, [fetchCategories, fetchPosts]);

  // Brisanje vesti
  const handleDeletePost = async () => {
    if (!postToDelete) return;

    setIsDeleting(true);
    try {
      StorageService.deletePost(postToDelete.id);
      CmsClient.deletePost(postToDelete.id);

      showToast(`Vest / Tema "${postToDelete.title}" je uspešno obrisana.`, 'success');
      setPosts(prev => prev.filter(p => p.id !== postToDelete.id));
      setPostToDelete(null);
    } catch (err: any) {
      console.error('Greška pri brisanju vesti:', err);
      showToast(err?.message || 'Greška pri brisanju vesti.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtrirani postovi
  const filteredPosts = useMemo(() => {
    return posts.filter(post => {
      // Pretraga po naslovu
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = post.title?.toLowerCase().includes(query);
        const matchesSlug = post.slug?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSlug) return false;
      }

      // Filter po statusu
      if (statusFilter !== 'all' && post.status !== statusFilter) {
        return false;
      }

      // Filter po kategoriji
      if (categoryFilter !== 'all') {
        const catId = Number(categoryFilter);
        if (post.category_id !== catId) return false;
      }

      return true;
    });
  }, [posts, searchQuery, statusFilter, categoryFilter]);

  // Paginacija kalkulacija
  const totalPages = Math.ceil(filteredPosts.length / itemsPerPage) || 1;
  const paginatedPosts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPosts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPosts, currentPage, itemsPerPage]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] pb-24 font-['Inter',sans-serif]">
      {/* Top Header */}
      <div className="bg-[#0e0e0e] border-b border-white/10 px-4 sm:px-8 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-xs text-zinc-400 hover:text-white transition-colors">
                Admin Panel
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="text-xs text-purple-400 font-medium">Vesti</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              Upravljanje Vestima
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Pregled, izmena i objavljivanje svih članaka na portalu
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchPosts()}
              title="Osveži listu"
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <Link
              to="/admin/vesti/nova"
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 shadow-lg shadow-purple-900/30 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Nova Vest</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        
        {/* Kontrole: Pretraga i Filteri */}
        <div className="bg-[#141414] border border-white/10 rounded-xl p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          
          {/* Pretraga po naslovu */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Pretraži vesti po naslovu ili slug-u..."
              className="w-full bg-[#0d0d0d] text-white text-xs sm:text-sm rounded-lg pl-9 pr-4 py-2.5 border border-white/10 focus:border-purple-500 focus:outline-none placeholder:text-zinc-600"
            />
          </div>

          {/* Filteri */}
          <div className="flex items-center gap-3">
            {/* Filter po statusu */}
            <div className="flex items-center gap-1.5 bg-[#0d0d0d] p-1 rounded-lg border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sve
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('published');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'published'
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Objavljeno
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('draft');
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  statusFilter === 'draft'
                    ? 'bg-amber-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Draft
              </button>
            </div>

            {/* Filter po kategoriji */}
            <select
              value={categoryFilter}
              onChange={e => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-[#0d0d0d] text-zinc-300 text-xs rounded-lg px-3 py-2.5 border border-white/10 focus:border-purple-500 focus:outline-none cursor-pointer"
            >
              <option value="all">Sve kategorije</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

        </div>

        {/* Tabela sa vestima */}
        <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-sm">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="text-purple-400 animate-spin" />
              <p className="text-xs text-zinc-400">Učitavanje vesti iz Supabase baze...</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <p className="text-sm text-zinc-400">Nema pronađenih vesti prema zadatim kriterijumima.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                }}
                className="text-xs text-purple-400 hover:underline cursor-pointer"
              >
                Resetuj filtere
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#191919] border-b border-white/10 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-14">ID</th>
                    <th className="py-3 px-4 min-w-[260px]">Naslov vesti</th>
                    <th className="py-3 px-4">Kategorija</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Pregledi</th>
                    <th className="py-3 px-4">Datum</th>
                    <th className="py-3 px-4 text-right">Akcije</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {paginatedPosts.map(post => {
                    const categoryName = post.categories?.name || 'Opšte';
                    const categoryColor = post.categories?.color || '#a855f7';
                    const formattedDate = new Date(post.created_at).toLocaleDateString('sr-RS', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });

                    return (
                      <tr key={post.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* ID */}
                        <td className="py-3.5 px-4 font-mono text-zinc-500">#{post.id}</td>

                        {/* Naslov + Cover thumbnail */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {post.cover_image && (
                              <img
                                src={post.cover_image}
                                alt={post.title}
                                className="w-10 h-7 rounded object-cover bg-black/40 shrink-0 border border-white/10"
                              />
                            )}
                            <div>
                              <div className="font-semibold text-white hover:text-purple-400 transition-colors line-clamp-1">
                                {post.title}
                              </div>
                              <span className="text-[11px] text-zinc-500 font-mono">
                                /{post.slug}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Kategorija */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border"
                            style={{
                              backgroundColor: `${categoryColor}15`,
                              borderColor: `${categoryColor}40`,
                              color: categoryColor,
                            }}
                          >
                            {categoryName}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {post.status === 'published' ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Objavljeno
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              Draft
                            </span>
                          )}
                        </td>

                        {/* Pregledi */}
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-400">
                          {post.views.toLocaleString()}
                        </td>

                        {/* Datum */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-zinc-400">
                          {formattedDate}
                        </td>

                        {/* Akcije */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Javni pregled vesti */}
                            <a
                              href={`/post/${post.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              title="Pogledaj javno"
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                            >
                              <ExternalLink size={14} />
                            </a>

                            {/* Izmena */}
                            <Link
                              to={`/admin/vesti/${post.id}/izmena`}
                              title="Izmeni vest"
                              className="p-1.5 text-zinc-400 hover:text-purple-400 hover:bg-purple-600/10 rounded transition-colors"
                            >
                              <Edit2 size={14} />
                            </Link>

                            {/* Brisanje */}
                            <button
                              type="button"
                              onClick={() => setPostToDelete(post)}
                              title="Obriši vest"
                              className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-red-600/10 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
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

          {/* Paginacija Footer */}
          {totalPages > 1 && (
            <div className="bg-[#121212] border-t border-white/10 px-4 py-3 flex items-center justify-between text-xs text-zinc-400">
              <div>
                Prikazano{' '}
                <span className="text-white font-medium">
                  {(currentPage - 1) * itemsPerPage + 1} -{' '}
                  {Math.min(currentPage * itemsPerPage, filteredPosts.length)}
                </span>{' '}
                od <span className="text-white font-medium">{filteredPosts.length}</span> vesti
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1.5 rounded border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-medium text-white">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal za potvrdu brisanja */}
      {postToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">
                Potvrda brisanja vesti
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Da li ste sigurni da želite trajno da obrišete vest:{' '}
                <span className="text-white font-semibold">"{postToDelete.title}"</span>?
                Ova akcija se ne može poništiti.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPostToDelete(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Otkaži
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeletePost}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Brisanje...</span>
                  </>
                ) : (
                  <span>Obriši vest</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Posts;
