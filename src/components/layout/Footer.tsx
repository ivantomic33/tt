import React, { useState } from 'react';
import { Send, CheckCircle2, Mail, MessageSquare } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';

interface FooterProps {
  onNavigate: (path: string, param?: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { showToast } = useToast();
  const { role } = useAuth();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      showToast('Molimo unesite validnu email adresu', 'error');
      return;
    }
    const res = StorageService.addSubscriber(email);
    if (res.success) {
      setIsSubscribed(true);
      setEmail('');
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'info');
    }
  };

  return (
    <footer className="bg-[#050507] border-t border-white/10 text-slate-400 pt-14 pb-8">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8">
        {/* Spojeno u tačno 3 kolone */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
          {/* Kolona 1: Logo + opis + social */}
          <div className="space-y-4">
            <span className="font-display text-2xl font-extrabold tracking-wider text-white block">
              NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">GG</span>
            </span>
            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              Nezavisni portal za najnovije gaming vesti, nepristrasne recenzije, hardverske analize i esport dešavanja na Balkanu.
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs text-slate-400">
              <span className="font-semibold text-white">Social:</span>
              <a
                href="https://discord.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-purple-400 transition-colors"
              >
                Discord
              </a>
              <span className="text-slate-600">·</span>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-cyan-400 transition-colors"
              >
                X / Twitter
              </a>
              <span className="text-slate-600">·</span>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-red-400 transition-colors"
              >
                YouTube
              </a>
              <span className="text-slate-600">·</span>
              <a
                href="https://steamcommunity.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-white transition-colors"
              >
                Steam
              </a>
            </div>
          </div>

          {/* Kolona 2: Kategorije (linkovi) */}
          <div className="space-y-3">
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white">
              Kategorije
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onNavigate('forum')}
                className="hover:text-purple-300 text-purple-400 font-semibold transition-colors text-left cursor-pointer flex items-center gap-1"
              >
                <span>Gaming Forum</span>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              </button>
              <button
                onClick={() => onNavigate('category', 'pc')}
                className="hover:text-purple-300 transition-colors text-left cursor-pointer"
              >
                PC Gaming & Modovi
              </button>

              <button
                onClick={() => onNavigate('category', 'playstation')}
                className="hover:text-purple-300 transition-colors text-left cursor-pointer"
              >
                PlayStation & PS5 Pro
              </button>
              <button
                onClick={() => onNavigate('category', 'xbox')}
                className="hover:text-purple-300 transition-colors text-left cursor-pointer"
              >
                Xbox & Game Pass
              </button>
              <button
                onClick={() => onNavigate('category', 'nintendo')}
                className="hover:text-purple-300 transition-colors text-left cursor-pointer"
              >
                Nintendo Switch 2
              </button>
              <button
                onClick={() => onNavigate('category', 'esports')}
                className="hover:text-purple-300 transition-colors text-left cursor-pointer"
              >
                Esports & Turniri
              </button>
              <button
                onClick={() => onNavigate('category', 'recenzije')}
                className="hover:text-purple-300 transition-colors text-left cursor-pointer"
              >
                Recenzije Igara
              </button>
            </div>
          </div>

          {/* Kolona 3: Newsletter + kontakt */}
          <div className="space-y-4">
            <div>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white mb-2">
                Newsletter & Kontakt
              </h4>
              <p className="text-xs text-slate-400 mb-3">
                Primajte najvažnije gaming izveštaje direktno u inbox.
              </p>
              {isSubscribed ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Prijavljeni ste na newsletter!</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="space-y-2">
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Unesite vaš email..."
                      className="w-full bg-[#121216] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                    />
                    <button
                      type="submit"
                      aria-label="Prijavi se na newsletter"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </form>
              )}
            </div>

            <div className="pt-2 flex items-center gap-4 text-xs">
              <button
                onClick={() => onNavigate('contact')}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Kontakt redakcije
              </button>
              <span className="text-slate-600">·</span>
              <button
                onClick={() => onNavigate('about')}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                O nama
              </button>
              {role === 'admin' && (
                <>
                  <span className="text-slate-600">·</span>
                  <button
                    onClick={() => onNavigate('admin')}
                    className="text-purple-400 hover:text-purple-300 transition-colors font-medium cursor-pointer"
                  >
                    CMS Prijava
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Copyright na dnu */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-xs text-[#71717a] gap-4">
          <p>© 2026 NEXUS GG · Sva prava zadržana.</p>
          <div className="flex items-center gap-4">
            <span>Contained Layout · 1440px</span>
            {role === 'admin' && (
              <>
                <span>·</span>
                <span>Admin-only CMS</span>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
