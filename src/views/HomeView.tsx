import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, Radio, AlertCircle, RefreshCw, MessageSquare, ArrowRight, Flame, BarChart3 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { HeroPost } from '../components/post/HeroPost';
import { PostCard } from '../components/post/PostCard';
import { SidebarTrending } from '../components/post/SidebarTrending';
import { Post, Category } from '../types';
import { StorageService } from '../services/storage';
import { ForumService } from '../services/forumService';

// Interfejsi specifični za Supabase odgovor sa join-om
export interface SupabaseCategory {
  id?: number;
  name: string;
  slug: string;
  color: string;
  description?: string;
  postCount?: number;
}

export interface SupabasePostRaw {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  category_id: number;
  status: 'draft' | 'published';
  views: number;
  created_at: string;
  published_at: string;
  likes?: number;
  reading_time?: number;
  featured?: boolean;
  category?: SupabaseCategory | null;
}

interface HomeProps {
  onSelectPost?: (slug: string) => void;
  onSelectCategory?: (slug: string) => void;
  onNavigateForum?: (subId?: string) => void;
  onSelectThread?: (slug: string) => void;
  bookmarkedIds?: number[];
  onToggleBookmark?: (id: number, e: React.MouseEvent) => void;
}


// Skeleton loader kartica sa sivim površinama i pulse animacijom
const CardSkeleton = () => (
  <div className="bg-[#141414] border border-white/10 rounded-lg overflow-hidden animate-pulse flex flex-col h-[380px]">
    <div className="aspect-[16/9] w-full bg-[#1c1c1c] relative">
      <div className="absolute top-3 left-3 w-16 h-5 rounded-md bg-[#262626]" />
    </div>
    <div className="p-5 flex flex-col flex-1 justify-between space-y-4">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-20 h-3 rounded bg-[#262626]" />
          <div className="w-12 h-3 rounded bg-[#262626]" />
        </div>
        <div className="w-full h-5 rounded bg-[#262626]" />
        <div className="w-4/5 h-5 rounded bg-[#262626]" />
        <div className="w-full h-3.5 rounded bg-[#1f1f1f]" />
        <div className="w-2/3 h-3.5 rounded bg-[#1f1f1f]" />
      </div>
      <div className="pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="w-16 h-3 rounded bg-[#262626]" />
        <div className="w-20 h-3 rounded bg-[#262626]" />
      </div>
    </div>
  </div>
);

// Hero skeleton loader
const HeroSkeleton = () => (
  <div className="relative mb-10 overflow-hidden rounded-xl bg-[#141414] border border-white/10 animate-pulse">
    <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[360px]">
      <div className="lg:col-span-7 bg-[#1c1c1c] aspect-[16/9] lg:aspect-auto" />
      <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col justify-between space-y-4">
        <div className="space-y-4">
          <div className="w-28 h-5 rounded bg-[#262626]" />
          <div className="w-full h-8 rounded bg-[#262626]" />
          <div className="w-4/5 h-8 rounded bg-[#262626]" />
          <div className="w-full h-4 rounded bg-[#1f1f1f]" />
          <div className="w-3/4 h-4 rounded bg-[#1f1f1f]" />
        </div>
        <div className="w-32 h-4 rounded bg-[#262626]" />
      </div>
    </div>
  </div>
);

export const HomeView: React.FC<HomeProps> = ({
  onSelectPost = (slug: string) => {
    window.location.href = `/vest/${slug}`;
  },
  onSelectCategory = (slug: string) => {
    window.location.href = `/kategorija/${slug}`;
  },
  onNavigateForum,
  onSelectThread,
  bookmarkedIds = [],
  onToggleBookmark,
}) => {
  // State za Supabase podatke
  const [posts, setPosts] = useState<Post[]>([]);
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [forumThreads, setForumThreads] = useState(() => ForumService.getThreads({ sortBy: 'hot' }).slice(0, 3));
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');


  // Funkcija za mapiranje sirovog Supabase posta u domen tip Post
  const mapSupabasePost = useCallback((raw: any): Post => {
    const rawCategory = Array.isArray(raw.category) ? raw.category[0] : raw.category;
    const category: Category = {
      id: raw.category_id || rawCategory?.id || 1,
      name: rawCategory?.name || 'Vesti',
      slug: rawCategory?.slug || 'vesti',
      color: rawCategory?.color || '#a855f7',
      description: rawCategory?.description || '',
    };

    return {
      id: raw.id,
      title: raw.title || 'Bez naslova',
      slug: raw.slug || `post-${raw.id}`,
      excerpt: raw.excerpt || '',
      content: raw.content || '',
      cover_image:
        raw.cover_image ||
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      category_id: raw.category_id || category.id,
      category,
      author: {
        id: '1',
        name: 'Nexus Redakcija',
        role: 'Gaming Redaktor',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      },
      status: raw.status || 'published',
      views: Number(raw.views) || 0,
      likes: Number(raw.likes) || 12,
      reading_time: raw.reading_time || Math.max(2, Math.ceil((raw.content?.length || 500) / 450)),
      featured: raw.featured ?? false,
      tags: [],
      created_at: raw.created_at || new Date().toISOString(),
      updated_at: raw.created_at || new Date().toISOString(),
      published_at: raw.published_at || raw.created_at || new Date().toISOString(),
    };
  }, []);

  // Fetchovanje svih potrebnih podataka iz Supabase baze
  const fetchHomeData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetchuj published vesti, sortiraj po published_at DESC, limit 30 sa join-om kategorije
      const postsQuery = supabase
        .from('posts')
        .select('*, category:categories(name, slug, color)')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(30);

      // 4. Fetchuj top 5 vesti po views DESC za sidebar "Najčitanije"
      const trendingQuery = supabase
        .from('posts')
        .select('*, category:categories(name, slug, color)')
        .eq('status', 'published')
        .order('views', { ascending: false })
        .limit(5);

      // 5. Fetchuj sve kategorije za sidebar "Kategorije"
      const categoriesQuery = supabase
        .from('categories')
        .select('id, name, slug, color, description');

      // Paralelno izvršavanje sva tri upita
      const [postsRes, trendingRes, categoriesRes] = await Promise.all([
        postsQuery,
        trendingQuery,
        categoriesQuery,
      ]);

      let mappedPosts: Post[] = [];

      if (!postsRes.error && postsRes.data) {
        mappedPosts = postsRes.data.map(mapSupabasePost);
      }

      // Spajanje lokalno kreiranih vesti iz StorageService ako nisu još sinhronizovane sa Supabase
      const localPosts = StorageService.getPosts({ status: 'published' });
      if (localPosts.length > 0) {
        const existingSlugs = new Set(mappedPosts.map(p => p.slug));
        const existingIds = new Set(mappedPosts.map(p => p.id));
        const newLocal = localPosts.filter(p => !existingSlugs.has(p.slug) && !existingIds.has(p.id));
        mappedPosts = [...mappedPosts, ...newLocal].sort(
          (a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime()
        );
      }

      if (mappedPosts.length === 0 && postsRes.error) {
        throw new Error(postsRes.error.message || 'Greška pri učitavanju vesti');
      }

      setPosts(mappedPosts);

      // Mapiranje top 5 vesti
      if (!trendingRes.error && trendingRes.data) {
        setTopPosts(trendingRes.data.map(mapSupabasePost));
      } else {
        // Fallback: sortiraj postojeće postove
        const sortedByViews = [...mappedPosts].sort((a, b) => b.views - a.views).slice(0, 5);
        setTopPosts(sortedByViews);
      }

      // Izračunavanje count-a postova po kategoriji
      let rawCategories = categoriesRes.data || [];
      if (rawCategories.length === 0) {
        // Fallback default kategorije ako tabela još nije popunjena
        rawCategories = [
          { id: 1, name: 'PC Gaming', slug: 'pc', color: '#a855f7', description: 'Vesti iz sveta PC gejminga' },
          { id: 2, name: 'PlayStation', slug: 'playstation', color: '#3b82f6', description: 'PS5 i PS4 novosti' },
          { id: 3, name: 'Xbox', slug: 'xbox', color: '#10b981', description: 'Xbox Series X/S i Game Pass' },
          { id: 4, name: 'Nintendo', slug: 'nintendo', color: '#ef4444', description: 'Nintendo Switch i najave' },
          { id: 5, name: 'Esports', slug: 'esports', color: '#f59e0b', description: 'Turniri, mečevi i transferi' },
          { id: 6, name: 'Recenzije', slug: 'recenzije', color: '#ec4899', description: 'Detaljne recenzije igara' },
        ];
      }

      // Prebrojavanje vesti po svakoj kategoriji
      const mappedCategories: Category[] = rawCategories.map((c: any) => {
        const count = mappedPosts.filter(
          p => p.category_id === c.id || p.category?.slug === c.slug
        ).length;
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          color: c.color || '#a855f7',
          description: c.description || '',
          postCount: count,
        };
      });

      setCategories(mappedCategories);
    } catch (err: any) {
      console.error('Supabase fetch error:', err);
      setError(err?.message || 'Greška pri učitavanju vesti');
    } finally {
      setLoading(false);
    }
  }, [mapSupabasePost]);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // 2. HERO SEKCIJA: Prva najnovija vest kao featured
  const heroPost = useMemo(() => {
    if (posts.length === 0) return null;
    return posts[0];
  }, [posts]);

  // Pagination / Load more state
  const [visibleCount, setVisibleCount] = useState<number>(6);

  // 3. GRID KARTICA: Filtrirani postovi za grid pod "Najnovije objave"
  const filteredGridPosts = useMemo(() => {
    if (posts.length === 0) return [];
    if (filter === 'all') {
      return posts;
    }
    if (filter === 'views') {
      return [...posts].sort((a, b) => b.views - a.views);
    }
    return posts.filter(p => p.category?.slug === filter);
  }, [posts, filter]);

  useEffect(() => {
    setVisibleCount(6);
  }, [filter]);

  const displayedGridPosts = useMemo(() => {
    return filteredGridPosts.slice(0, visibleCount);
  }, [filteredGridPosts, visibleCount]);

  const hasMorePosts = visibleCount < filteredGridPosts.length;

  return (
    <div className="space-y-10 py-6">
      {/* Breaking / Hot Topics Ticker */}
      <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#121216] border border-white/10 shadow-xl overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold uppercase tracking-wider shrink-0 shadow-sm">
          <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
          <span>Vruće teme</span>
        </div>
        <div className="flex items-center gap-6 whitespace-nowrap text-slate-400 overflow-x-auto font-medium">
          {posts.slice(0, 4).map((p, idx) => (
            <React.Fragment key={p.id}>
              {idx > 0 && <span className="text-slate-600">·</span>}
              <button
                onClick={() => onSelectPost(p.slug)}
                className="hover:text-purple-300 transition-colors cursor-pointer"
              >
                {p.title}
              </button>
            </React.Fragment>
          ))}
          {posts.length === 0 && (
            <span className="text-slate-500">Povezivanje sa Supabase bazom vesti...</span>
          )}
        </div>
      </div>

      {/* ERROR STATE: Ako fetch pukne */}
      {error && (
        <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-red-300">Greška pri učitavanju vesti</h4>
              <p className="text-xs text-red-400/80">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchHomeData}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 rounded-xl text-xs font-semibold self-start sm:self-auto transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Pokušaj ponovo</span>
          </button>
        </div>
      )}

      {/* HERO SEKCIJA: Najnovija vest ili Skeleton */}
      {loading ? (
        <HeroSkeleton />
      ) : heroPost ? (
        <HeroPost
          post={heroPost}
          onSelect={onSelectPost}
          isBookmarked={bookmarkedIds.includes(heroPost.id)}
          onToggleBookmark={onToggleBookmark}
        />
      ) : (
        /* Placeholder ako nema vesti u bazi */
        <div className="text-center py-12 px-6 bg-[#121216] border border-white/10 rounded-2xl space-y-3 shadow-xl">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto" />
          <h3 className="font-display text-lg font-bold text-white">Nema objavljenih vesti u bazi</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Baza je uspešno povezana, ali trenutno nema postova sa statusom &apos;published&apos;.
          </p>
          <a
            href="/test"
            onClick={e => {
              e.preventDefault();
              window.location.href = '/test';
            }}
            className="inline-block px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase rounded-xl shadow-lg shadow-purple-600/30"
          >
            Idi na DB Test & Unesi vesti
          </a>
        </div>
      )}

      {/* Filter sekcija */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div>
          <h2 className="font-display text-2xl font-extrabold uppercase tracking-wider text-white flex items-center gap-2">
            <span>Najnovije objave</span>
            <span className="text-xs font-mono text-purple-400 font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
              {filteredGridPosts.length}
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Vesti iz baze sortirane po datumu objave
          </p>
        </div>

        {/* Interactive Filter Segmented Control */}
        <div className="flex items-center gap-1.5 p-1 bg-[#121216] border border-white/10 rounded-2xl overflow-x-auto max-w-full">
          {[
            { id: 'all', label: 'Sve vesti' },
            { id: 'views', label: 'Najpopularnije' },
            ...categories.map(c => ({ id: c.slug, label: c.name })),
          ].map(tab => {
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid (8 cols) & Sidebar (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Post Grid (8 cols) */}
        <div className="lg:col-span-8">
          {/* 6. LOADING STATE: Skeleton Loader */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : filteredGridPosts.length === 0 ? (
            <div className="text-center py-16 bg-[#141414] border border-white/10 rounded-lg p-8">
              <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold text-white mb-2">
                Nema pronađenih vesti
              </h3>
              <p className="text-xs text-[#a1a1a1] max-w-sm mx-auto mb-4">
                {filter === 'all'
                  ? 'Trenutno nema dodatnih vesti u gridu.'
                  : 'U ovoj kategoriji nema objavljenih članaka.'}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase rounded-lg"
                >
                  Prikaži sve vesti
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {displayedGridPosts.map(post => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onSelect={onSelectPost}
                    isBookmarked={bookmarkedIds.includes(post.id)}
                    onToggleBookmark={onToggleBookmark}
                  />
                ))}
              </div>

              {hasMorePosts && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 6)}
                    className="px-6 py-3 bg-[#18181b] hover:bg-[#202026] text-white font-bold text-xs uppercase tracking-wider rounded-xl border border-white/10 hover:border-purple-500/30 transition-all cursor-pointer shadow-lg"
                  >
                    Prikaži još vesti ({filteredGridPosts.length - visibleCount} preostalo)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. & 5. Right Column: Sidebar "Najčitanije" & "Kategorije" (4 cols) */}
        <div className="lg:col-span-4">
          <SidebarTrending
            topPosts={topPosts}
            categories={categories}
            onSelectPost={onSelectPost}
            onSelectCategory={onSelectCategory}
          />
        </div>
      </div>

      {/* 6. Gaming Forum & Community Discussions Highlight Strip */}
      <section className="mt-16 pt-12 border-t border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
              <MessageSquare className="w-4 h-4" />
              <span>Zajednica & Gaming Forum</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Aktivne diskusije forumaša
            </h2>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onNavigateForum) onNavigateForum();
              else window.location.href = '/forum';
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all self-start sm:self-auto cursor-pointer"
          >
            <span>Poseti Forum & Sve Teme</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {forumThreads.map(thread => (
            <div
              key={thread.id}
              onClick={() => {
                if (onSelectThread) onSelectThread(thread.slug);
                else if (onNavigateForum) onNavigateForum();
              }}
              className="bg-[#121217] hover:bg-[#151520] border border-white/5 hover:border-purple-500/40 rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between group shadow-sm hover:shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    {thread.subforumId.toUpperCase()}
                  </span>
                  {thread.poll && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <BarChart3 className="w-2.5 h-2.5" />
                      Anketa
                    </span>
                  )}
                </div>

                <h3 className="font-display text-sm font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug mb-2">
                  {thread.title}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                  {thread.content}
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <img
                    src={thread.authorAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80'}
                    alt={thread.authorName}
                    className="w-5 h-5 rounded-full object-cover border border-purple-500/20"
                  />
                  <span>{thread.authorName}</span>
                </span>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-emerald-400">
                    ▲ {thread.score}
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <MessageSquare className="w-3 h-3 text-purple-400" />
                    <span>{thread.replyCount}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};


export default HomeView;
