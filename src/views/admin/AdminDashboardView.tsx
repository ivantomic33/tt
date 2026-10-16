import React from 'react';
import {
  FileText,
  Eye,
  CheckCircle2,
  FileClock,
  MessageSquare,
  MessagesSquare,
  Trophy,
  Layers,
  Flame,
  ArrowRight,
  Mail,
  Plus,
  Sparkles,
  ExternalLink,
  TrendingUp,
  Edit,
  Trash2,
} from 'lucide-react';
import { AdminStats, Post, Category } from '../../types';
import { StorageService } from '../../services/storage';
import { ForumService } from '../../services/forumService';

interface AdminDashboardViewProps {
  stats: AdminStats;
  recentPosts: Post[];
  categories: Category[];
  onNavigateTab: (tab: string, param?: any) => void;
  onNavigatePublic: (slug?: string) => void;
  onRefresh: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  stats,
  recentPosts,
  categories,
  onNavigateTab,
  onNavigatePublic,
  onRefresh,
}) => {
  const togglePostStatus = (post: Post) => {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    StorageService.updatePost(post.id, { status: newStatus });
    onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
            Kontrolna Tabla
          </h1>
          <p className="text-xs text-[#a1a1a1]">
            Pregled stanja portala, najnovijih objava i aktivnosti čitalaca.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigateTab('post_new')}
            className="flex items-center gap-2 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md hover:shadow-purple-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Vest</span>
          </button>
          <button
            onClick={() => onNavigatePublic()}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-medium text-[#22d3ee] rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Otvori Portal</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
            <span className="text-xs font-medium">Ukupno vesti</span>
            <FileText className="w-4 h-4 text-[#a855f7]" />
          </div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {stats.totalPosts}
          </div>
          <span className="text-[11px] text-[#71717a]">u bazi podataka</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
            <span className="text-xs font-medium">Objavljeno</span>
            <CheckCircle2 className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div className="text-2xl font-display font-bold text-[#22c55e] tabular-nums">
            {stats.publishedPosts}
          </div>
          <span className="text-[11px] text-[#71717a]">vidljivo posetiocima</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
            <span className="text-xs font-medium">Draftovi</span>
            <FileClock className="w-4 h-4 text-[#eab308]" />
          </div>
          <div className="text-2xl font-display font-bold text-[#eab308] tabular-nums">
            {stats.draftPosts}
          </div>
          <span className="text-[11px] text-[#71717a]">u pripremi</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
            <span className="text-xs font-medium">Pregledi</span>
            <Eye className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {stats.totalViews.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#71717a]">kumulativno</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
            <span className="text-xs font-medium">Komentari</span>
            <MessageSquare className="w-4 h-4 text-[#38bdf8]" />
          </div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {stats.totalComments}
          </div>
          <span className="text-[11px] text-[#71717a]">
            {stats.pendingComments} na čekanju
          </span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
            <span className="text-xs font-medium">Newsletter</span>
            <Mail className="w-4 h-4 text-[#ec4899]" />
          </div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {stats.totalSubscribers}
          </div>
          <span className="text-[11px] text-[#71717a]">pretplatnika</span>
        </div>
      </div>

      {/* Main Row: Recent Posts Table & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Posts - 8 cols */}
        <div className="lg:col-span-8 bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                Poslednjih 5 vesti
              </h3>
              <p className="text-xs text-[#a1a1a1]">Najskorije kreirani ili izmenjeni tekstovi</p>
            </div>
            <button
              onClick={() => onNavigateTab('posts')}
              className="text-xs text-[#a855f7] hover:text-[#22d3ee] font-semibold transition-colors"
            >
              Vidi sve vesti →
            </button>
          </div>

          <div className="divide-y divide-[#1f1f1f]">
            {recentPosts.slice(0, 5).map(post => (
              <div key={post.id} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      style={{ color: post.category?.color || '#a1a1a1' }}
                      className="text-[10px] font-bold uppercase tracking-wider"
                    >
                      {post.category?.name}
                    </span>
                    <span>·</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        post.status === 'published'
                          ? 'bg-[#22c55e]/20 text-[#22c55e]'
                          : 'bg-[#eab308]/20 text-[#eab308]'
                      }`}
                    >
                      {post.status === 'published' ? 'Objavljeno' : 'Draft'}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-white truncate">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#71717a]">
                    <span>{post.views.toLocaleString()} pregleda</span>
                    <span>·</span>
                    <span>{new Date(post.created_at).toLocaleDateString('sr-RS')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => togglePostStatus(post)}
                    title={post.status === 'published' ? 'Vrati u draft' : 'Objavi vest'}
                    className="p-1.5 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-xs text-[#a1a1a1] hover:text-white transition-colors"
                  >
                    {post.status === 'published' ? 'Depublikuj' : 'Objavi'}
                  </button>
                  <button
                    onClick={() => onNavigateTab('post_edit', post.id)}
                    title="Izmeni vest"
                    className="p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-[#22d3ee] transition-colors"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Distribution - 4 cols */}
        <div className="lg:col-span-4 bg-[#141414] border border-[#262626] rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <div>
              <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                Kategorije
              </h3>
              <p className="text-xs text-[#a1a1a1]">Raspodela objavljenih vesti</p>
            </div>
            <button
              onClick={() => onNavigateTab('categories')}
              className="text-xs text-[#a855f7] hover:text-[#22d3ee] font-semibold transition-colors"
            >
              Uredi →
            </button>
          </div>

          <div className="space-y-3">
            {categories.map(cat => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-medium text-[#d4d4d8]">{cat.name}</span>
                  </div>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {cat.postCount || 0}
                  </span>
                </div>
                <div className="w-full bg-[#1c1c1c] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: cat.color,
                      width: `${Math.min(100, ((cat.postCount || 0) / Math.max(1, stats.publishedPosts)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* AI Drafting Quick Banner */}
          <div className="pt-4 mt-6 border-t border-[#262626]">
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#a855f7]/20 to-[#141414] border border-[#a855f7]/30 space-y-2">
              <div className="flex items-center gap-1.5 text-[#a855f7]">
                <Sparkles className="w-4 h-4" />
                <span className="font-display text-xs font-bold uppercase tracking-wider">
                  AI Pomoćnik za pisanje
                </span>
              </div>
              <p className="text-xs text-[#a1a1a1] leading-relaxed">
                Generišite kompletan nacrt članka, naslov i strukturu na osnovu teme u nekoliko sekundi.
              </p>
              <button
                onClick={() => onNavigateTab('post_new')}
                className="w-full py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
              >
                Isprobaj AI Generator
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gaming Forum & Community Moderation Section */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#262626]">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-[#a855f7]/15 text-[#a855f7] border border-[#a855f7]/30">
              <MessagesSquare className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                Gaming Forum & Moderacija Zajednice
              </h3>
              <p className="text-xs text-[#a1a1a1]">
                Nadzor tema, brisanje neprimerenih diskusija, potforumi i raspodela karme.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('forum_threads')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-semibold transition-colors shadow-md"
            >
              <MessagesSquare className="w-3.5 h-3.5" />
              <span>Moderiraj Teme</span>
            </button>
            <button
              onClick={() => onNavigateTab('subforums')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-white text-xs font-semibold transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-[#22d3ee]" />
              <span>Potforumi</span>
            </button>
            <button
              onClick={() => onNavigateTab('forum_members')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-white text-xs font-semibold transition-colors"
            >
              <Trophy className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Top Članovi</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Forum Threads */}
          <div
            onClick={() => onNavigateTab('forum_threads')}
            className="p-4 rounded-xl bg-[#18181b] border border-[#262626] hover:border-[#a855f7]/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
              <span className="text-xs font-medium">Aktivne Diskusije</span>
              <MessagesSquare className="w-4 h-4 text-[#a855f7] group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-display font-bold text-white tabular-nums">
              {ForumService.getThreads().length}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#71717a] mt-2">
              <span>{ForumService.getThreads().reduce((sum, t) => sum + (t.replyCount || 0), 0)} odgovora</span>
              <span className="text-[#a855f7] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Upravljaj <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 2: Subforums */}
          <div
            onClick={() => onNavigateTab('subforums')}
            className="p-4 rounded-xl bg-[#18181b] border border-[#262626] hover:border-[#22d3ee]/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
              <span className="text-xs font-medium">Potforumi & Rubrike</span>
              <Layers className="w-4 h-4 text-[#22d3ee] group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-display font-bold text-[#22d3ee] tabular-nums">
              {ForumService.getSubforums().length}
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#71717a] mt-2">
              <span>PC, Konzole, Esports...</span>
              <span className="text-[#22d3ee] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                Uredi <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Card 3: Top Karma Member */}
          <div
            onClick={() => onNavigateTab('forum_members')}
            className="p-4 rounded-xl bg-[#18181b] border border-[#262626] hover:border-[#f59e0b]/50 cursor-pointer transition-all group"
          >
            <div className="flex items-center justify-between text-[#a1a1a1] mb-2">
              <span className="text-xs font-medium">Top Karma Lider</span>
              <Trophy className="w-4 h-4 text-[#f59e0b] group-hover:scale-110 transition-transform" />
            </div>
            {ForumService.getLeaderboard()[0] ? (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white truncate">
                    {ForumService.getLeaderboard()[0].name}
                  </span>
                  <span className="text-xs font-mono font-bold text-[#f59e0b]">
                    🔥 {ForumService.getLeaderboard()[0].karma}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#71717a] mt-2">
                  <span>{ForumService.getLeaderboard()[0].role}</span>
                  <span className="text-[#f59e0b] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Podesi Karmu <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-[#71717a]">Nema lidera</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
