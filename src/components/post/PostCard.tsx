import React from 'react';
import { Bookmark, Clock, Eye } from 'lucide-react';
import { Post } from '../../types';
import { GameImage } from '../ui/GameImage';

interface PostCardProps {
  post: Post;
  onSelect: (slug: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: number, e: React.MouseEvent) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onSelect,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <article
      onClick={() => onSelect(post.slug)}
      className="group cursor-pointer bg-[#121216] border border-white/10 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-600/15 hover:-translate-y-1 rounded-xl overflow-hidden transition-all duration-300 flex flex-col h-full"
    >
      {/* 16:9 Cover Image with Category Badge PREKO SLIKE */}
      <div className="relative overflow-hidden aspect-[16/9] w-full">
        <GameImage
          src={post.cover_image}
          alt={post.title}
          aspectRatio="16/9"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
        />

        {/* Gradient overlay na slikama kartica */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#121216] via-black/20 to-transparent pointer-events-none" />

        {/* Kategorija badge preko slike - gore levo */}
        <div className="absolute top-3 left-3 z-10">
          <span
            style={{ backgroundColor: post.category?.color || '#9333ea' }}
            className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-md text-white shadow-lg backdrop-blur-md block border border-white/20"
          >
            {post.category?.name || 'Vesti'}
          </span>
        </div>

        {/* Bookmark Action */}
        {onToggleBookmark && (
          <button
            onClick={e => {
              e.stopPropagation();
              onToggleBookmark(post.id, e);
            }}
            title={isBookmarked ? 'Ukloni iz sačuvanih' : 'Sačuvaj za kasnije'}
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white transition-all hover:scale-110"
          >
            <Bookmark
              className={`w-3.5 h-3.5 transition-colors ${
                isBookmarked ? 'fill-purple-400 text-purple-400' : 'text-white'
              }`}
            />
          </button>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between bg-gradient-to-b from-[#121216] to-[#0e0e12]">
        <div>
          {/* Metadata sa istaknutom ikonom oka */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-2.5 font-medium">
            <span>{formatDate(post.published_at || post.created_at)}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" />
              {post.reading_time || 4} min
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="flex items-center gap-1 font-mono text-slate-300">
              <Eye className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{post.views.toLocaleString()}</span>
            </span>
          </div>

          {/* Naslov u kartici: line-clamp-2, hover postaje ljubičast */}
          <h3 className="font-display text-lg sm:text-xl font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug mb-2 tracking-tight">
            {post.title}
          </h3>

          {/* Excerpt: line-clamp-2 */}
          <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 leading-relaxed">
            {post.excerpt}
          </p>
        </div>

        {/* Card Footer */}
        <div className="pt-3.5 mt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-slate-300">
            {post.author?.name || 'Redakcija'}
          </span>
          <span className="text-purple-400 group-hover:translate-x-1 transition-transform font-semibold flex items-center gap-1">
            <span>Pročitaj</span>
            <span>→</span>
          </span>
        </div>
      </div>
    </article>
  );
};
