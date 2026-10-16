import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, Sparkles, Filter } from 'lucide-react';
import { Post, Category } from '../types';
import { PostCard } from '../components/post/PostCard';

interface SearchViewProps {
  posts: Post[];
  categories: Category[];
  onSelectPost: (slug: string) => void;
  bookmarkedIds: number[];
  onToggleBookmark: (id: number, e: React.MouseEvent) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  posts,
  categories,
  onSelectPost,
  bookmarkedIds,
  onToggleBookmark,
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');

  // 300ms debounce as specified in Faza 3 of project plan
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  const searchResults = useMemo(() => {
    let list = posts.filter(p => p.status === 'published');

    if (selectedCat !== 'all') {
      list = list.filter(p => p.category?.slug === selectedCat);
    }

    if (!debouncedQuery.trim()) {
      return list;
    }

    const q = debouncedQuery.toLowerCase().trim();
    return list.filter(
      p =>
        p.title.toLowerCase().includes(q) ||
        p.excerpt.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q) ||
        p.category.name.toLowerCase().includes(q) ||
        p.tags.some(t => t.name.toLowerCase().includes(q))
    );
  }, [posts, debouncedQuery, selectedCat]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Search Header */}
      <div className="max-w-3xl mx-auto text-center space-y-4">
        <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-wider text-white">
          Pretraga Vesti & Arhiva
        </h1>
        <p className="text-sm text-[#a1a1a1]">
          Pretražite kompletnu bazu članaka, recenzija, vodiča i vesti iz industrije.
        </p>

        {/* Input with icon and clear button */}
        <div className="relative">
          <Search className="w-5 h-5 text-[#a1a1a1] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Unesite naslov, igru, konzolu ili ključnu reč (npr. GTA, PS6, Unreal Engine)..."
            className="w-full bg-[#141414] border border-[#262626] rounded-xl pl-12 pr-12 py-3.5 text-sm sm:text-base text-white placeholder:text-[#71717a] focus:outline-none focus:border-[#a855f7] shadow-lg"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
          <button
            onClick={() => setSelectedCat('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              selectedCat === 'all'
                ? 'bg-[#a855f7] border-[#a855f7] text-white'
                : 'bg-[#141414] border-[#262626] text-[#a1a1a1] hover:text-white'
            }`}
          >
            Sve kategorije
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.slug)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selectedCat === c.slug
                  ? 'bg-[#a855f7] border-[#a855f7] text-white'
                  : 'bg-[#141414] border-[#262626] text-[#a1a1a1] hover:text-white'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
        <div className="text-xs text-[#a1a1a1]">
          {debouncedQuery ? (
            <span>
              Rezultati za upit: <strong className="text-white">"{debouncedQuery}"</strong>
            </span>
          ) : (
            <span>Prikaz svih članaka</span>
          )}
        </div>
        <span className="text-xs font-mono text-[#22d3ee] tabular-nums font-semibold">
          {searchResults.length} pronađeno
        </span>
      </div>

      {/* Results Grid */}
      {searchResults.length === 0 ? (
        <div className="text-center py-20 bg-[#141414] border border-[#262626] rounded-2xl p-8 max-w-xl mx-auto">
          <Sparkles className="w-10 h-10 text-[#a855f7] mx-auto mb-3" />
          <h3 className="font-display text-xl font-bold text-white mb-2">
            Nema rezultata
          </h3>
          <p className="text-xs text-[#a1a1a1] mb-4">
            Nijedan objavljeni članak ne odgovara vašem kriterijumu pretrage. Pokušajte sa drugim pojmom.
          </p>
          <button
            onClick={() => {
              setQuery('');
              setSelectedCat('all');
            }}
            className="px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase rounded-lg"
          >
            Resetuj filtere
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onSelect={onSelectPost}
              isBookmarked={bookmarkedIds.includes(post.id)}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
};
