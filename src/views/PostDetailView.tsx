import React, { useState, useEffect } from 'react';
import {
  Clock,
  Eye,
  Bookmark,
  Share2,
  Copy,
  Check,
  Flame,
  ThumbsUp,
  Award,
  ArrowLeft,
  MessageSquare,
  Send,
  Calendar,
} from 'lucide-react';
import { Post, Comment } from '../types';
import { StorageService } from '../services/storage';
import { GameImage } from '../components/ui/GameImage';
import { PostCard } from '../components/post/PostCard';
import { PostReactions } from '../components/post/PostReactions';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import { SanitizedHTML } from '../lib/sanitizer';
import { updateSeoMeta, restoreDefaultSeoMeta } from '../utils/seo';


interface PostDetailViewProps {
  slug: string;
  onNavigateBack: () => void;
  onSelectPost: (slug: string) => void;
  onSelectCategory: (slug: string) => void;
  isBookmarked: boolean;
  onToggleBookmark: (id: number, e: React.MouseEvent) => void;
}

export const PostDetailView: React.FC<PostDetailViewProps> = ({
  slug,
  onNavigateBack,
  onSelectPost,
  onSelectCategory,
  isBookmarked,
  onToggleBookmark,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | undefined>(() => StorageService.getPostBySlug(slug));
  const [comments, setComments] = useState<Comment[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [copied, setCopied] = useState(false);


  useEffect(() => {
    if (user) {
      const defaultName = user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Član');
      setAuthorName(defaultName);
      setAuthorEmail(user.email || '');
    }
  }, [user]);

  useEffect(() => {
    const current = StorageService.getPostBySlug(slug);
    if (current) {
      setPost(current);
      // Auto-increment views once per session for this post
      StorageService.incrementViews(current.id);
      setComments(StorageService.getComments(current.id));
      updateSeoMeta({
        title: current.title,
        description: current.excerpt || current.content.replace(/<[^>]*>/g, '').substring(0, 150),
        image: current.cover_image,
        type: 'article',
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return () => {
      restoreDefaultSeoMeta();
    };
  }, [slug]);

  if (!post) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="font-display text-3xl font-bold text-white mb-4">Vest nije pronađena</h2>
        <p className="text-[#a1a1a1] mb-6">Traženi članak možda je uklonjen ili ne postoji.</p>
        <button
          onClick={onNavigateBack}
          className="px-5 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors"
        >
          Povratak na naslovnu
        </button>
      </div>
    );
  }

  // Related posts from same category, excluding current post
  const relatedPosts = StorageService.getPosts({
    categorySlug: post.category?.slug,
    status: 'published',
    limit: 4,
  }).filter(p => p.id !== post.id).slice(0, 3);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    showToast('Link ka vesti je kopiran u clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareSocial = (platform: 'twitter' | 'facebook' | 'reddit') => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(post.title);
    let shareUrl = '';
    if (platform === 'twitter') shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${text}`;
    if (platform === 'facebook') shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (platform === 'reddit') shareUrl = `https://reddit.com/submit?url=${url}&title=${text}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleCommentSubmit = (e: React.FormEvent) => {

    e.preventDefault();
    if (!authorName.trim() || !commentText.trim()) {
      showToast('Molimo popunite vaše ime i komentar', 'error');
      return;
    }
    const newComm = StorageService.addComment({
      post_id: post.id,
      author_name: authorName.trim(),
      author_email: authorEmail.trim() || 'anonimno@nexus.gg',
      content: commentText.trim(),
    });
    setComments(prev => [newComm, ...prev]);
    setCommentText('');
    showToast('Vaš komentar je uspešno postavljen!', 'success');
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('sr-RS', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb (Home > Kategorija > Vest) */}
      <nav className="flex items-center gap-2 text-xs text-[#a1a1a1] mb-6 flex-wrap" aria-label="Breadcrumb">
        <button
          onClick={onNavigateBack}
          className="flex items-center gap-1 hover:text-purple-400 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Početna</span>
        </button>
        <span className="text-white/20">/</span>
        <button
          onClick={() => onSelectCategory(post.category?.slug)}
          className="hover:text-purple-400 transition-colors font-medium text-[#d4d4d8]"
        >
          {post.category?.name}
        </button>
        <span className="text-white/20">/</span>
        <span className="text-purple-400/80 truncate max-w-[280px] sm:max-w-md font-medium">
          {post.title}
        </span>
      </nav>

      {/* Header Info */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelectCategory(post.category?.slug)}
            style={{
              backgroundColor: `${post.category?.color || '#a855f7'}20`,
              color: post.category?.color || '#a855f7',
              borderColor: `${post.category?.color || '#a855f7'}40`,
            }}
            className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md border transition-colors hover:brightness-125"
          >
            {post.category?.name}
          </button>
        </div>

        {/* Title */}
        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight">
          {post.title}
        </h1>

        {/* Excerpt Lead */}
        <p className="text-base sm:text-lg text-[#d4d4d8] leading-relaxed">
          {post.excerpt}
        </p>

        {/* Unboxed Metadata & Author Card */}
        <div className="pt-4 pb-4 border-y border-[#262626] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={post.author?.avatar}
              alt={post.author?.name}
              referrerPolicy="no-referrer"
              className="w-11 h-11 rounded-full object-cover border border-[#3f3f46]"
            />
            <div>
              <span className="text-sm font-semibold text-white block">
                {post.author?.name}
              </span>
              <span className="text-xs text-[#a1a1a1]">{post.author?.role}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#a1a1a1]">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#a855f7]" />
              {formatDate(post.published_at || post.created_at)}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#22d3ee]" />
              {post.reading_time || 5} min čitanja
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#22c55e]" />
              {post.views.toLocaleString()} pregleda
            </span>
          </div>
        </div>
      </div>

      {/* Cover Image Presentation */}
      <div className="relative rounded-2xl overflow-hidden mb-8 border border-[#262626] aspect-[16/9]">
        <GameImage
          src={post.cover_image}
          alt={post.title}
          aspectRatio="16/9"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Action Utility Ribbon (Save, Reactions, Share) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#141414] border border-[#262626] mb-10">
        {/* Realtime Connected Database Reactions */}
        <PostReactions postId={post.id} />

        {/* Share & Bookmark Tools */}

        <div className="flex items-center gap-2">
          <button
            onClick={e => onToggleBookmark(post.id, e)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isBookmarked
                ? 'bg-[#a855f7]/20 border-[#a855f7] text-[#a855f7]'
                : 'bg-[#1a1a1a] border-[#262626] text-[#a1a1a1] hover:text-white'
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
            <span>{isBookmarked ? 'Sačuvano' : 'Sačuvaj'}</span>
          </button>

          <button
            onClick={handleCopyLink}
            title="Kopiraj link"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-xs font-medium text-[#a1a1a1] hover:text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Kopirano' : 'Kopiraj link'}</span>
          </button>

          <button
            onClick={() => handleShareSocial('twitter')}
            title="Podeli na X"
            className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-xs font-medium text-[#a1a1a1] hover:text-white transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Long-form Article Body Prose with DOMPurify Anti-XSS Protection */}
      <div className="prose prose-invert max-w-none text-[#d4d4d8] leading-relaxed text-base space-y-6">
        <SanitizedHTML
          html={post.content}
          className="[&>h2]:font-display [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-white [&>h2]:mt-8 [&>h2]:mb-4
                     [&>h3]:font-display [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-[#f5f5f5] [&>h3]:mt-6 [&>h3]:mb-3
                     [&>p]:text-[#d4d4d8] [&>p]:leading-relaxed [&>p]:mb-4
                     [&>blockquote]:border-l-4 [&>blockquote]:border-[#a855f7] [&>blockquote]:bg-[#141414] [&>blockquote]:p-4 [&>blockquote]:rounded-r-lg [&>blockquote]:italic [&>blockquote]:text-[#f5f5f5] [&>blockquote]:my-6
                     [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:space-y-2 [&>ul]:text-[#d4d4d8] [&>ul]:my-4
                     [&>strong]:text-white"
        />
      </div>

      {/* Tags Section */}
      {post.tags && post.tags.length > 0 && (
        <div className="pt-8 mt-10 border-t border-[#262626] flex items-center flex-wrap gap-2">
          <span className="text-xs uppercase tracking-wider font-semibold text-[#71717a] mr-2">
            Tagovi:
          </span>
          {post.tags.map(tag => (
            <span
              key={tag.id || tag.name}
              className="text-xs font-medium text-[#a1a1a1] bg-[#141414] border border-[#262626] hover:border-[#a855f7] px-3 py-1 rounded-md transition-colors"
            >
              #{tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Comments Section */}
      <section className="mt-14 pt-10 border-t border-[#262626]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5 text-[#a855f7]" />
            <h3 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              Komentari ({comments.length})
            </h3>
          </div>
          <span className="text-xs text-[#71717a]">Pravila: Bez uvredljivog govora i spama</span>
        </div>

        {/* Comment Input Form */}
        <form onSubmit={handleCommentSubmit} className="bg-[#141414] border border-[#262626] rounded-xl p-5 mb-8 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Ostavite vaš komentar</h4>
            {user && (
              <span className="text-[11px] font-medium text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                Prijavljeni kao: {user.email}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#a1a1a1] mb-1">Vaše ime ili nadimak *</label>
              <input
                type="text"
                required
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                placeholder="npr. CyberGamer"
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a855f7]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#a1a1a1] mb-1">Email adresa (opciono)</label>
              <input
                type="email"
                value={authorEmail}
                onChange={e => setAuthorEmail(e.target.value)}
                placeholder="neće biti javno prikazana"
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a855f7]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[#a1a1a1] mb-1">Komentar *</label>
            <textarea
              required
              rows={3}
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Napišite vaše mišljenje o ovoj temi..."
              className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#a855f7]"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Objavi komentar</span>
            </button>
          </div>
        </form>

        {/* Existing Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-center py-8 text-xs text-[#71717a]">
              Još uvek nema komentara. Budite prvi koji će ostaviti utisak!
            </p>
          ) : (
            comments.map(comm => (
              <div
                key={comm.id}
                className="p-4 rounded-xl bg-[#141414] border border-[#262626] space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{comm.author_name}</span>
                    <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md">
                      Član
                    </span>
                  </div>
                  <span className="text-[#71717a] font-mono">
                    {new Date(comm.created_at).toLocaleDateString('sr-RS')}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#d4d4d8] leading-relaxed">
                  {comm.content}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Posts Section */}
      {relatedPosts.length > 0 && (
        <section className="mt-16 pt-10 border-t border-[#262626]">
          <h3 className="font-display text-2xl font-bold uppercase tracking-wider text-white mb-6">
            Povezane vesti iz iste rubrike
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedPosts.map(rel => (
              <PostCard
                key={rel.id}
                post={rel}
                onSelect={onSelectPost}
                isBookmarked={isBookmarked}
                onToggleBookmark={onToggleBookmark}
              />
            ))}
          </div>
        </section>
      )}
    </article>
  );
};
