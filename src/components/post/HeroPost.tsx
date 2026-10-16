import React from 'react';
import { Clock, Eye, Flame, ArrowRight, Bookmark } from 'lucide-react';
import { Post } from '../../types';
import { GameImage } from '../ui/GameImage';

interface HeroPostProps {
  post: Post;
  onSelect: (slug: string) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: number, e: React.MouseEvent) => void;
}

export const HeroPost: React.FC<HeroPostProps> = ({
  post,
  onSelect,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('sr-RS', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="relative mb-12 group">
      {/* Suptilni ambient glow iza hero sekcije */}
      <div className="absolute -inset-1 blur-3xl opacity-25 bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-500 pointer-events-none rounded-3xl group-hover:opacity-40 transition-opacity duration-700" />

      <section className="relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 hover:border-purple-500/40 transition-all duration-500 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Cover Media - 7 cols on desktop */}
          <div className="lg:col-span-7 relative overflow-hidden aspect-[16/9] lg:aspect-auto min-h-[340px] lg:min-h-[480px]">
            <GameImage
              src={post.cover_image}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {/* Gradient overlay to merge smoothly into dark card */}
            <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-[#121216] via-black/40 to-transparent pointer-events-none" />

            {/* FEATURED badge na hero */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 border border-purple-400/30">
                <Flame className="w-3.5 h-3.5 fill-white text-white" />
                FEATURED
              </span>
              <span
                style={{ backgroundColor: post.category?.color || '#a855f7' }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur-md"
              >
                {post.category?.name}
              </span>
            </div>

            {onToggleBookmark && (
              <button
                onClick={e => onToggleBookmark(post.id, e)}
                title={isBookmarked ? 'Ukloni iz sačuvanih' : 'Sačuvaj za kasnije'}
                className="absolute top-4 right-4 z-10 p-2.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white transition-all hover:scale-105"
              >
                <Bookmark
                  className={`w-4 h-4 transition-colors ${
                    isBookmarked ? 'fill-purple-400 text-purple-400' : 'text-white'
                  }`}
                />
              </button>
            )}
          </div>

          {/* Narrative Side - 5 cols on desktop */}
          <div className="lg:col-span-5 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-gradient-to-b from-[#121218] to-[#0e0e12]">
            <div>
              {/* Unboxed Metadata */}
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 font-medium">
                <span>{formatDate(post.published_at || post.created_at)}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  {post.reading_time || 5} min čitanja
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="flex items-center gap-1 font-mono text-slate-300">
                  <Eye className="w-3.5 h-3.5 text-cyan-400" />
                  {post.views.toLocaleString()}
                </span>
              </div>

              {/* Headline */}
              <h2
                onClick={() => onSelect(post.slug)}
                className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white group-hover:text-purple-300 cursor-pointer transition-colors leading-tight mb-4 tracking-tight"
              >
                {post.title}
              </h2>

              {/* Excerpt */}
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed mb-6 line-clamp-3">
                {post.excerpt}
              </p>
            </div>

            <div>
              {/* Author Byline & CTA */}
              <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={post.author?.avatar}
                    alt={post.author?.name}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/30 shadow-md"
                  />
                  <div>
                    <h4 className="text-sm font-semibold text-white leading-none mb-1">
                      {post.author?.name}
                    </h4>
                    <span className="text-xs text-purple-400 font-medium">{post.author?.role}</span>
                  </div>
                </div>

                <button
                  onClick={() => onSelect(post.slug)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-purple-600/30 hover:scale-105 cursor-pointer"
                >
                  <span>Pročitaj</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
