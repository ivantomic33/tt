import React, { useState } from 'react';
import { TrendingUp, MessageSquare, Flame, Mail, Send, CheckCircle2 } from 'lucide-react';
import { Post, Category } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../ui/Toast';

interface SidebarTrendingProps {
  topPosts: Post[];
  categories: Category[];
  onSelectPost: (slug: string) => void;
  onSelectCategory: (slug: string) => void;
}

export const SidebarTrending: React.FC<SidebarTrendingProps> = ({
  topPosts,
  categories,
  onSelectPost,
  onSelectCategory,
}) => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Molimo unesite ispravnu email adresu.', 'error');
      return;
    }
    const res = StorageService.addSubscriber(email);
    if (res.success) {
      setSubscribed(true);
      setEmail('');
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'info');
    }
  };

  return (
    <aside className="space-y-6">
      {/* Top 5 "Najčitanije" */}
      <div className="bg-[#121216] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Flame className="w-4 h-4 text-purple-400" />
            </div>
            <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              Najčitanije
            </h3>
          </div>
          <span className="text-[10px] text-purple-400 font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
            Top 5
          </span>
        </div>

        {/* Razmak između stavki */}
        <div className="space-y-2.5">
          {topPosts.slice(0, 5).map((post, index) => {
            const rank = (index + 1).toString().padStart(2, '0');
            return (
              <article
                key={post.id}
                onClick={() => onSelectPost(post.slug)}
                className="p-3 rounded-xl hover:bg-white/[0.05] transition-all flex items-start gap-3.5 group cursor-pointer border border-transparent hover:border-purple-500/20"
              >
                {/* Brojevi (01, 02, 03) */}
                <span className="font-display text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-indigo-500 tabular-nums shrink-0 leading-none pt-0.5 group-hover:scale-110 transition-transform">
                  {rank}
                </span>

                <div className="flex-1 min-w-0">
                  <span
                    style={{ color: post.category?.color || '#a855f7' }}
                    className="text-[10px] font-extrabold uppercase tracking-wider block mb-1"
                  >
                    {post.category?.name}
                  </span>
                  {/* Naslovi */}
                  <h4 className="font-display text-sm font-semibold text-slate-100 group-hover:text-purple-300 transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 font-medium">
                    <span className="font-mono text-slate-300">{post.views.toLocaleString()} pregleda</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span>{post.reading_time || 4} min</span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* "Newsletter" Box u sidebar-u */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#161322] via-[#121216] to-[#0d0e14] border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-4">
        {/* Subtle ambient glow */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 text-purple-400 relative z-10">
          <div className="p-1.5 rounded-lg bg-purple-500/20 border border-purple-400/30">
            <Mail className="w-4 h-4 text-purple-300" />
          </div>
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
            NEXUS Newsletter
          </h3>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed relative z-10">
          Pratite najvažnije gaming najave, recenzije i popuste nedeljno u inbox.
        </p>

        {subscribed ? (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Uspešno ste prijavljeni!</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} className="space-y-3 relative z-10">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Unesite vaš email..."
                className="w-full bg-[#08080a] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-600/25 border border-purple-400/30 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Pretplati se</span>
            </button>
            <span className="text-[10px] text-slate-500 text-center block font-medium">
              100% besplatno · Bez spama
            </span>
          </form>
        )}
      </div>

      {/* Kategorije Widget */}
      <div className="bg-[#121216] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/10">
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
            Kategorije
          </h3>
          <TrendingUp className="w-4 h-4 text-purple-400" />
        </div>

        <div className="space-y-1.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.slug)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-white/[0.05] transition-all text-left group"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-xs font-medium text-slate-300 group-hover:text-purple-300 transition-colors">
                  {cat.name}
                </span>
              </div>
              <span className="text-xs font-mono tabular-nums text-slate-500 group-hover:text-white group-hover:bg-purple-500/20 px-2 py-0.5 rounded-md transition-all">
                {cat.postCount || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Discord Banner */}
      <div className="bg-gradient-to-br from-[#5865F2]/20 via-[#121218] to-[#0e0e12] border border-[#5865F2]/40 rounded-2xl p-5 shadow-2xl space-y-3">
        <div className="flex items-center gap-2 text-[#5865F2]">
          <MessageSquare className="w-5 h-5 text-[#5865F2]" />
          <span className="font-display text-sm font-bold uppercase tracking-wider text-white">
            NEXUS Discord
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Preko 5.000 gejmera diskutuje o igrama, hardveru i turnirima.
        </p>
        <a
          href="https://discord.com"
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2.5 bg-[#5865F2] hover:bg-[#4752c4] text-white text-xs font-bold uppercase tracking-wider rounded-xl text-center transition-all shadow-lg shadow-[#5865F2]/25"
        >
          Pridruži se
        </a>
      </div>
    </aside>
  );
};
