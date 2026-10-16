import React, { useState, useMemo } from 'react';
import { ArrowLeft, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Category, Post } from '../types';
import { PostCard } from '../components/post/PostCard';

interface CategoryViewProps {
  category: Category;
  posts: Post[];
  onSelectPost: (slug: string) => void;
  onNavigateHome: () => void;
  bookmarkedIds: number[];
  onToggleBookmark: (id: number, e: React.MouseEvent) => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  category,
  posts,
  onSelectPost,
  onNavigateHome,
  bookmarkedIds,
  onToggleBookmark,
}) => {
  const [sortBy, setSortBy] = useState<'newest' | 'views'>('newest');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 12;

  const sortedCategoryPosts = useMemo(() => {
    const list = posts.filter(
      p => p.status === 'published' && p.category?.slug === category.slug
    );
    if (sortBy === 'views') {
      return [...list].sort((a, b) => b.views - a.views);
    }
    return [...list].sort(
      (a, b) =>
        new Date(b.published_at || b.created_at).getTime() -
        new Date(a.published_at || a.created_at).getTime()
    );
  }, [posts, category.slug, sortBy]);

  const totalPages = Math.ceil(sortedCategoryPosts.length / ITEMS_PER_PAGE) || 1;

  const paginatedPosts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedCategoryPosts.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedCategoryPosts, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="py-8 space-y-8">
      {/* Breadcrumb & Header */}
      <div>
        <nav className="flex items-center gap-2 text-xs text-[#a1a1a1] mb-4" aria-label="Breadcrumb">
          <button
            onClick={onNavigateHome}
            className="flex items-center gap-1 hover:text-purple-400 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Početna</span>
          </button>
          <span className="text-white/20">/</span>
          <span className="text-purple-400 font-medium">Rubrika: {category.name}</span>
        </nav>

        <div className="p-6 sm:p-8 rounded-xl bg-[#141414] border border-white/10 relative overflow-hidden">
          <div
            className="absolute top-0 right-0 w-96 h-96 opacity-10 blur-3xl pointer-events-none rounded-full"
            style={{ backgroundColor: category.color }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span
                  className="w-3.5 h-3.5 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs uppercase font-bold tracking-widest text-[#a1a1a1]">
                  Rubrika ({sortedCategoryPosts.length} objavljenih vesti)
                </span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                {category.name}
              </h1>
              <p className="text-sm text-[#a1a1a1] max-w-2xl leading-relaxed">
                {category.description ||
                  `Sve najnovije objave, analize i vodiči iz sveta ${category.name}.`}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#a1a1a1]">Sortiranje:</span>
              <div className="flex items-center gap-1 p-1 bg-[#1a1a1a] border border-white/10 rounded-lg text-xs">
                <button
                  onClick={() => {
                    setSortBy('newest');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    sortBy === 'newest'
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  Najnovije
                </button>
                <button
                  onClick={() => {
                    setSortBy('views');
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                    sortBy === 'views'
                      ? 'bg-purple-600 text-white font-semibold'
                      : 'text-[#a1a1a1] hover:text-white'
                  }`}
                >
                  Najčitanije
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      {sortedCategoryPosts.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-white/10 rounded-lg p-8">
          <Sparkles className="w-10 h-10 text-purple-400 mx-auto mb-3" />
          <h3 className="font-display text-xl font-bold text-white mb-2">
            Nema pronađenih vesti
          </h3>
          <p className="text-xs text-[#a1a1a1] max-w-sm mx-auto mb-6">
            Trenutno nema objavljenih članaka u kategoriji {category.name}. Uskoro stižu novi tekstovi!
          </p>
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            Nazad na početnu
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedPosts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onSelect={onSelectPost}
                isBookmarked={bookmarkedIds.includes(post.id)}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>

          {/* 4. Paginacija (12 po strani) */}
          {totalPages > 1 && (
            <div className="pt-8 flex items-center justify-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="p-2 rounded-lg bg-[#141414] border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-purple-500/50 transition-colors"
                title="Prethodna stranica"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNumber = idx + 1;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`w-9 h-9 rounded-lg text-xs font-mono font-semibold transition-colors ${
                      currentPage === pageNumber
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-[#141414] border border-white/10 text-[#a1a1a1] hover:text-white hover:border-purple-500/50'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-2 rounded-lg bg-[#141414] border border-white/10 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:border-purple-500/50 transition-colors"
                title="Sledeća stranica"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
