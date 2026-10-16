import React from 'react';
import { Bookmark, ArrowLeft, Trash2 } from 'lucide-react';
import { Post } from '../types';
import { PostCard } from '../components/post/PostCard';

interface BookmarksViewProps {
  posts: Post[];
  bookmarkedIds: number[];
  onSelectPost: (slug: string) => void;
  onNavigateHome: () => void;
  onToggleBookmark: (id: number, e: React.MouseEvent) => void;
}

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  posts,
  bookmarkedIds,
  onSelectPost,
  onNavigateHome,
  onToggleBookmark,
}) => {
  const savedPosts = posts.filter(p => bookmarkedIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#a1a1a1] hover:text-[#22d3ee] mb-4 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Povratak na naslovnu</span>
        </button>

        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div className="flex items-center gap-3">
            <Bookmark className="w-7 h-7 text-[#a855f7] fill-current" />
            <div>
              <h1 className="font-display text-3xl font-bold uppercase tracking-wider text-white">
                Sačuvane Vesti
              </h1>
              <p className="text-xs text-[#a1a1a1]">
                Članci koje ste označili za kasnije čitanje na ovom uređaju.
              </p>
            </div>
          </div>
          <span className="text-sm font-mono text-[#22d3ee] tabular-nums font-semibold">
            {savedPosts.length} sačuvano
          </span>
        </div>
      </div>

      {savedPosts.length === 0 ? (
        <div className="text-center py-24 bg-[#141414] border border-[#262626] rounded-2xl p-8 max-w-lg mx-auto">
          <Bookmark className="w-12 h-12 text-[#3f3f46] mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-white mb-2">
            Nemate sačuvanih vesti
          </h3>
          <p className="text-xs text-[#a1a1a1] mb-6 leading-relaxed">
            Kliknite na ikonicu obeleživača (bookmark) na bilo kojoj kartici vesti kako biste je sačuvali za čitanje van mreže ili kasnije.
          </p>
          <button
            onClick={onNavigateHome}
            className="px-5 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
          >
            Istražite najnovije vesti
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              onSelect={onSelectPost}
              isBookmarked={true}
              onToggleBookmark={onToggleBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
};
