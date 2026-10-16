import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Bookmark, ShieldCheck, Menu, X, ArrowRight, User, LayoutDashboard, LogIn, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  currentPath: string;
  onNavigate: (path: string, param?: string) => void;
  savedCount: number;
  isAdminLoggedIn: boolean;
  onOpenAuthModal?: (mode?: 'login' | 'register') => void;
  onOpenSecurityAudit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPath,
  onNavigate,
  savedCount,
  isAdminLoggedIn,
  onOpenAuthModal,
  onOpenSecurityAudit,
}) => {
  const { user, role, loading, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('sr-RS', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const todayDate = new Date().toLocaleDateString('sr-RS', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const capitalizedDate = todayDate.charAt(0).toUpperCase() + todayDate.slice(1);

  const navLinks = [
    { label: 'Sve Vesti', path: 'home' },
    { label: 'Forum', path: 'forum', isSpecial: true },
    { label: 'PC Gaming', path: 'category', param: 'pc' },
    { label: 'PlayStation', path: 'category', param: 'playstation' },
    { label: 'Xbox', path: 'category', param: 'xbox' },
    { label: 'Esports', path: 'category', param: 'esports' },
    { label: 'Recenzije', path: 'category', param: 'recenzije' },
  ];


  const handleLinkClick = (path: string, param?: string) => {
    onNavigate(path, param);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#08080a]/90 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      {/* Red 1: Pojednostavljen Top Bar (datum, vreme, Discord, X) */}
      <div className="border-b border-white/5 bg-[#050507] text-[11px] text-[#94a3b8] py-1.5 px-6 sm:px-8">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-[#cbd5e1] font-medium">{capitalizedDate}</span>
            <span className="text-white/20">·</span>
            <span className="font-mono text-purple-400 font-semibold">{currentTime} CET</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <a
              href="https://discord.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#94a3b8] hover:text-purple-400 transition-colors"
            >
              Discord
            </a>
            <span className="text-white/20">·</span>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noreferrer"
              className="text-[#94a3b8] hover:text-purple-400 transition-colors"
            >
              X (Twitter)
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Navigation */}
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Logo NEXUS GG */}
        <button
          onClick={() => handleLinkClick('home')}
          className="text-left cursor-pointer group flex items-center gap-2 shrink-0"
        >
          <span className="font-display text-2xl font-extrabold tracking-wider text-white group-hover:text-purple-400 transition-colors whitespace-nowrap">
            NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">GG</span>
          </span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#94a3b8]">
          {navLinks.map(link => {
            const isActive =
              (link.path === 'home' && currentPath === 'home') ||
              (link.path === 'forum' && (currentPath === 'forum' || currentPath.startsWith('forum') || currentPath === 'thread')) ||
              (link.path === 'category' && currentPath === `category/${link.param}`);

            return (
              <button
                key={link.label}
                onClick={() => handleLinkClick(link.path, link.param)}
                className={`transition-all whitespace-nowrap shrink-0 hover:text-white py-1 relative flex items-center gap-1.5 ${
                  isActive ? 'text-white font-semibold' : ''
                } ${link.isSpecial ? 'text-purple-300 font-semibold' : ''}`}
              >
                <span>{link.label}</span>
                {link.isSpecial && (
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                )}
              </button>
            );
          })}
        </nav>


        {/* Zone 3: Search, Bookmarks, Admin */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleLinkClick('search')}
            title="Pretraga vesti"
            className="p-2 text-[#94a3b8] hover:text-white hover:bg-white/10 rounded-full transition-all cursor-pointer"
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleLinkClick('bookmarks')}
            title="Sačuvane vesti"
            className="p-2 text-[#94a3b8] hover:text-white hover:bg-white/10 rounded-full transition-all relative cursor-pointer"
          >
            <Bookmark className="w-4 h-4" />
            {savedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-purple-500/50">
                {savedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (onOpenSecurityAudit) {
                onOpenSecurityAudit();
              } else {
                setIsSecurityModalOpen(true);
              }
            }}
            title="Sigurnosni Izveštaj & Audit Autentifikacije"
            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-full transition-all relative cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          {/* Auth kontrole */}
          {loading ? (
            <div className="w-28 h-9 animate-pulse bg-white/5 rounded-full" />
          ) : user ? (
            /* Modern single-capsule profile pill without harsh box borders */
            <div className="flex items-center gap-2 p-1.5 pl-2 pr-2.5 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 hover:bg-white/[0.08] rounded-full backdrop-blur-xl transition-all shadow-md shadow-black/20 group">
              {/* Clickable Profile trigger */}
              <button
                type="button"
                onClick={() => handleLinkClick('profile')}
                className="flex items-center gap-2 text-left cursor-pointer"
                title="Pogledaj i izmeni svoj gejming profil"
              >
                {/* Avatar Circle */}
                <div className="relative shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-400 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-purple-500/30 ring-2 ring-purple-500/30 group-hover:ring-purple-400 transition-all">
                    {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#08080a]" />
                </div>

                {/* User details */}
                <div className="hidden sm:flex flex-col text-left pr-1">
                  <span className="text-white text-xs font-semibold max-w-[110px] truncate leading-tight group-hover:text-purple-200 transition-colors">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                  <span className="text-[10px] text-purple-400 font-medium leading-tight flex items-center gap-1">
                    {role === 'admin' ? (
                      <span className="text-amber-400 font-bold flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3 text-amber-400" /> Admin
                      </span>
                    ) : (
                      <span className="text-cyan-400 font-medium">Moj Profil</span>
                    )}
                  </span>
                </div>
              </button>


              {/* CMS Prijava for Admins */}
              {role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => handleLinkClick('admin')}
                  className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-full shadow-md shadow-purple-600/30 flex items-center gap-1 transition-all transform hover:scale-105"
                  title="Pristup CMS Administratorskom Panelu"
                >
                  <ShieldCheck size={13} className="text-purple-200" />
                  <span className="hidden md:inline">CMS</span>
                </Link>
              )}

              {/* Soft divider */}
              <div className="w-[1px] h-4 bg-white/15 mx-0.5" />

              {/* Integrated Logout Icon */}
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  handleLinkClick('home');
                }}
                title="Odjavi se sa naloga"
                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-all cursor-pointer flex items-center justify-center"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onOpenAuthModal) {
                  onOpenAuthModal('login');
                } else {
                  onNavigate('user_login');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-full transition-all shadow-lg shadow-purple-600/25 hover:scale-105 cursor-pointer"
            >
              <LogIn size={15} />
              <span>Login / Register</span>
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-[#94a3b8] hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#262626] bg-[#0e0e0e] px-6 py-4 space-y-2 animate-in slide-in-from-top-2">
          {navLinks.map(link => (
            <button
              key={link.label}
              onClick={() => handleLinkClick(link.path, link.param)}
              className="w-full text-left px-3 py-2 text-sm text-[#f5f5f5] hover:bg-[#18181b] rounded-md transition-colors flex items-center justify-between"
            >
              <span>{link.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#a1a1a1]" />
            </button>
          ))}
          <div className="pt-2 border-t border-[#262626] flex gap-2">
            <button
              onClick={() => handleLinkClick('about')}
              className="w-1/2 py-2 text-xs text-[#a1a1a1] hover:text-white text-center"
            >
              O nama
            </button>
            <button
              onClick={() => handleLinkClick('contact')}
              className="w-1/2 py-2 text-xs text-[#a1a1a1] hover:text-white text-center"
            >
              Kontakt
            </button>
          </div>
          {user && (
            <div className="pt-2 border-t border-[#262626]">
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setMobileMenuOpen(false);
                  handleLinkClick('home');
                }}
                className="w-full py-2.5 px-3 text-xs font-medium text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={14} />
                <span>Odjavi se</span>
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
