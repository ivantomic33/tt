import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  Edit3,
  Save,
  X,
  Bookmark,
  MessageSquare,
  MessagesSquare,
  Share2,
  ArrowLeft,
  User,
  Plus,
  Gamepad2,
  Lock,
  Box,
  Layers,
  Upload,
  Image as ImageIcon,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';

import {
  ForumThread,
  ForumReply,
  Post,
  ForumMemberKarma,
  GamingAccounts,
  UserBadge,
  MemberReputation,
} from '../types';
import { ForumService } from '../services/forumService';
import { StorageService } from '../services/storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import { RoleBadge, AchievementBadge } from '../components/profile/Badges';
import { buildBadgeBoard } from '../data/badgeCatalog';
import type { LucideIcon } from 'lucide-react';

interface ProfileViewProps {
  username?: string; // If undefined, views current user's profile
  onNavigateBack: () => void;
  onSelectThread: (slug: string) => void;
  onSelectPost: (slug: string) => void;
  onNavigateForum: () => void;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80';
const DEFAULT_BANNER =
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=80';

// =========================================================================
// Gaming Platform Vector Icons
// =========================================================================
const SteamIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M12 2a10 10 0 0 0-10 9.94c0 4.7 3.26 8.65 7.69 9.71l2.5-3.66a2.76 2.76 0 0 1-.3-.64L7.8 15.6a3.86 3.86 0 0 1-.41-1.74c0-2.14 1.74-3.88 3.88-3.88.35 0 .69.05 1.01.14l2.76-4a4.96 4.96 0 0 1 4.96-.06 5 5 0 0 1 1.76 6.84 5 5 0 0 1-6.84 1.76l-3.9 2.7c.07.28.1.58.1.88 0 1.95-1.46 3.56-3.35 3.84l-2.45 3.58A10 10 0 1 0 12 2zm8 9.95a3.3 3.3 0 1 0-6.6 0 3.3 3.3 0 0 0 6.6 0zm-1.65 0a1.65 1.65 0 1 1-3.3 0 1.65 1.65 0 0 1 3.3 0z" />
  </svg>
);

const DiscordIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const TwitchIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M2.149 0l-1.612 4.119v16.8h5.085V24l3.226-3.081h3.468l6.847-6.857V0zm15.419 13.029l-3.226 3.226H9.726l-2.42 2.42v-2.42H3.761V1.714h13.807zM14.73 4.286h-1.613v5.143h1.613zm-4.839 0H8.278v5.143h1.613z" />
  </svg>
);

const YouTubeIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const EpicGamesIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 3.18l6.82 3.41v6.82L12 18.82l-6.82-3.41V8.59L12 5.18z" />
  </svg>
);

const RiotIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M4 3h16v4H4V3zm0 6h16v2H4V9zm0 4h12v2H4v-2zm0 4h8v2H4v-2z" />
  </svg>
);

// =========================================================================
// Lokalni fallback za reputaciju (ako server ne vrati strukturu)
// =========================================================================
const REPUTATION_TIERS = [
  { name: 'Legendary', color: '#f97316', min: 5000 },
  { name: 'Diamond', color: '#22d3ee', min: 2000 },
  { name: 'Platinum', color: '#a78bfa', min: 1000 },
  { name: 'Gold', color: '#facc15', min: 500 },
  { name: 'Silver', color: '#cbd5e1', min: 200 },
  { name: 'Bronze', color: '#fb923c', min: 0 },
];

function computeReputation(karma: number): MemberReputation {
  const value = Math.max(0, Number(karma) || 0);
  const tier = REPUTATION_TIERS.find(t => value >= t.min) || REPUTATION_TIERS[REPUTATION_TIERS.length - 1];
  const idx = REPUTATION_TIERS.indexOf(tier);
  const next = idx > 0 ? REPUTATION_TIERS[idx - 1] : null;
  const step = 250;
  const level = Math.max(1, Math.floor(value / step) + 1);
  const currentFloor = (level - 1) * step;
  const nextLevelXp = level * step;
  return {
    total: value,
    base: value,
    fromThreads: 0,
    fromReplies: 0,
    tier: { ...tier, nextTier: next ? { ...next } : null },
    level,
    xp: value,
    nextLevelXp,
    currentFloor,
    progressPercent: Math.min(100, Math.round(((value - currentFloor) / step) * 100)),
  };
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  username,
  onNavigateBack,
  onSelectThread,
  onSelectPost,
  onNavigateForum,
}) => {
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const currentLoggedInName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const targetUsername = username || currentLoggedInName || '';
  const isOwnProfile = !username || (user && currentLoggedInName.toLowerCase() === targetUsername.toLowerCase());
  const isAdmin = role === 'admin';
  const canEdit = isOwnProfile || isAdmin;

  const [member, setMember] = useState<ForumMemberKarma | null>(null);
  const [recentThreads, setRecentThreads] = useState<ForumThread[]>([]);
  const [recentReplies, setRecentReplies] = useState<ForumReply[]>([]);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'threads' | 'replies' | 'saved'>('threads');

  // Gaming Account Connect Modal State
  const [connectModalPlatform, setConnectModalPlatform] = useState<{ key: keyof GamingAccounts; name: string; icon: React.ReactNode; color: string } | null>(null);
  const [accountInputId, setAccountInputId] = useState('');

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBanner, setEditBanner] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = async () => {
    if (!targetUsername) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await ForumService.getMemberProfileAsync(targetUsername);
      if (data) {
        setMember(data);
        setRecentThreads(data.recentThreads || []);
        setRecentReplies(data.recentReplies || []);
        setSavedPosts(data.savedPosts || []);
        setEditBio(data.bio || '');
        setEditAvatar(data.avatar || '');
        setEditBanner(data.coverBanner || '');
      }
    } catch {
      showToast('Greška pri učitavanju profila.', 'error');
    } finally {
      // Ako server nije vratio sačuvane članke (ili je sopstveni profil bez DB unosa),
      // dopuni iz lokalnih bookmark-a kao rezervni izvor.
      if (isOwnProfile) {
        const savedIds = StorageService.getBookmarks();
        if (savedIds.length > 0) {
          const allPosts = StorageService.getPosts();
          setSavedPosts(prev => {
            if (prev.length > 0) return prev;
            return allPosts.filter(p => savedIds.includes(p.id));
          });
        }
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUsername]);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectModalPlatform || !member) return;

    const updatedGaming = {
      ...(member.gamingAccounts || {}),
      [connectModalPlatform.key]: accountInputId || `${targetUsername}_${connectModalPlatform.key}`,
    };

    const success = await ForumService.updateMemberProfileAsync(member.name, {
      gamingAccounts: updatedGaming,
    });

    if (success) {
      showToast(`Uspešno povezan ${connectModalPlatform.name} nalog!`, 'success');
      setConnectModalPlatform(null);
      setAccountInputId('');
      loadProfile();
    } else {
      showToast('Greška pri povezivanju naloga.', 'error');
    }
  };

  const handleDisconnect = async (platformKey: keyof GamingAccounts) => {
    if (!member) return;
    const updatedGaming = { ...(member.gamingAccounts || {}) };
    delete updatedGaming[platformKey];
    const success = await ForumService.updateMemberProfileAsync(member.name, {
      gamingAccounts: updatedGaming as GamingAccounts,
    });
    if (success) {
      showToast('Nalog je uklonjen.', 'info');
      loadProfile();
    }
  };

  const uploadImage = async (file: File, kind: 'avatar' | 'banner'): Promise<string | null> => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showToast('Dozvoljeni formati: JPG, PNG, WEBP ili GIF.', 'error');
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Maksimalna veličina slike je 5MB.', 'error');
      return null;
    }
    setUploading(kind);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const clean = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const safeName = targetUsername.replace(/[^a-zA-Z0-9]/g, '_') || 'user';
      const path = `profiles/${kind}_${safeName}_${Date.now()}_${clean}.${ext}`;

      const { data, error } = await supabase.storage
        .from('covers')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (error || !data) {
        showToast('Otpremanje nije uspelo. Proverite Storage bucket „covers".', 'error');
        return null;
      }

      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(data.path);
      return urlData?.publicUrl || null;
    } catch {
      showToast('Greška pri otpremanju slike.', 'error');
      return null;
    } finally {
      setUploading(null);
    }
  };

  const handleAvatarPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await uploadImage(file, 'avatar');
    if (url) {
      setEditAvatar(url);
      showToast('Avatar je spreman. Klikni „Sačuvaj izmene".', 'success');
    }
  };

  const handleBannerPicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const url = await uploadImage(file, 'banner');
    if (url) {
      setEditBanner(url);
      showToast('Baner je spreman. Klikni „Sačuvaj izmene".', 'success');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setSavingProfile(true);
    const success = await ForumService.updateMemberProfileAsync(member.name, {
      bio: editBio,
      avatar: editAvatar,
      coverBanner: editBanner,
    });
    setSavingProfile(false);
    if (success) {
      showToast('Profil je uspešno sačuvan!', 'success');
      setIsEditModalOpen(false);
      loadProfile();
    } else {
      showToast('Greška pri čuvanju profila.', 'error');
    }
  };

  const handleCopy = (text: string, label: string) => {
    try {
      navigator.clipboard.writeText(text);
      showToast(`${label} kopiran!`, 'success');
    } catch {
      showToast('Kopiranje nije uspelo.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-mono text-slate-400">Učitavanje gejming profila...</span>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
          <User className="w-10 h-10" />
        </div>
        <h1 className="text-xl font-display font-bold text-white">Profil nije pronađen</h1>
        <p className="text-sm text-slate-400">
          Član „{targetUsername}" ne postoji ili još uvek nema profil u bazi.
        </p>
        <button
          onClick={onNavigateBack}
          className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold cursor-pointer"
        >
          Nazad
        </button>
      </div>
    );
  }

  const reputation = member.reputation || computeReputation(member.karma || 0);
  const joinedYear = member.joinedDate ? new Date(member.joinedDate).getFullYear() : null;
  const badgeBoard = buildBadgeBoard(member.badges);

  const gamingPlatforms = [
    { key: 'steamId' as keyof GamingAccounts, name: 'Steam', icon: <SteamIcon />, color: '#3b82f6' },
    { key: 'discordTag' as keyof GamingAccounts, name: 'Discord', icon: <DiscordIcon />, color: '#8b5cf6' },
    { key: 'youtube' as keyof GamingAccounts, name: 'YouTube Gaming', icon: <YouTubeIcon />, color: '#ef4444' },
    { key: 'twitch' as keyof GamingAccounts, name: 'Twitch', icon: <TwitchIcon />, color: '#a855f7' },
    { key: 'psnId' as keyof GamingAccounts, name: 'PlayStation / Epic', icon: <EpicGamesIcon />, color: '#06b6d4' },
    { key: 'xboxGamertag' as keyof GamingAccounts, name: 'Xbox / Riot', icon: <RiotIcon />, color: '#10b981' },
  ];

  const statCards = [
    { label: 'Ukupna Reputacija', value: reputation.total, icon: Trophy, color: '#f59e0b', sub: reputation.tier.name },
    { label: 'Teme na Forumu', value: member.threadCount || 0, icon: MessageSquare, color: '#8b5cf6', sub: 'diskutovano' },
    { label: 'Komentari & Odgovori', value: member.replyCount || 0, icon: MessagesSquare, color: '#22d3ee', sub: 'odgovora' },
    { label: 'Sačuvani Članci', value: savedPosts.length || member.savedCount || 0, icon: Bookmark, color: '#f472b6', sub: 'sačuvano' },
  ];

  const tabs = [
    { key: 'threads' as const, label: 'Teme na Forumu', icon: MessageSquare, color: '#8b5cf6', count: member.threadCount || recentThreads.length },
    { key: 'replies' as const, label: 'Komentari & Odgovori', icon: MessagesSquare, color: '#22d3ee', count: member.replyCount || recentReplies.length },
    { key: 'saved' as const, label: 'Sačuvani Članci', icon: Bookmark, color: '#f472b6', count: savedPosts.length || member.savedCount || 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in text-slate-100">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onNavigateBack}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-all border border-white/5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Nazad</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleCopy(`${window.location.origin}/u/${encodeURIComponent(member.name)}`, 'Link profila')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-all border border-white/5 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Podeli profil</span>
          </button>
          {canEdit && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-all cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Izmeni Profil</span>
            </button>
          )}
        </div>
      </div>

      {/* ===================== HERO BANNER ===================== */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0b0f19]">
        <div className="absolute inset-0 h-52 sm:h-60 overflow-hidden">
          <img
            src={member.coverBanner || DEFAULT_BANNER}
            alt="Profil baner"
            className="w-full h-full object-cover opacity-45 mix-blend-luminosity filter brightness-75 scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f19] via-[#0b0f19]/60 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-violet-950/40 via-transparent to-cyan-950/40 pointer-events-none"></div>
        </div>

        <div className="relative pt-28 sm:pt-36 px-6 sm:px-8 pb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-tr from-violet-600 via-cyan-500 to-emerald-400 rounded-3xl blur opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-slate-900 border-2 border-white/20 shadow-2xl">
                <img src={member.avatar || DEFAULT_AVATAR} alt={member.name} className="w-full h-full object-cover" />
              </div>
              {member.isOnline && (
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#0b0f19] flex items-center justify-center shadow-lg shadow-emerald-500/50">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                </div>
              )}
            </div>

            {/* Name + meta */}
            <div className="space-y-2 pb-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight drop-shadow-md">
                  {member.name}
                </h1>
                <RoleBadge role={member.role} />
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed line-clamp-2">
                {member.bio || 'Član NEXUS gejming zajednice.'}
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-mono text-slate-400">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5 text-violet-400" />
                  {joinedYear ? `Član od ${joinedYear}.` : 'Novi član'}
                </span>
                <span className="text-slate-600">·</span>
                <span>{member.threadCount || 0} tema</span>
                <span className="text-slate-600">·</span>
                <span>{member.replyCount || 0} odgovora</span>
                <span className="text-slate-600">·</span>
                <span className="inline-flex items-center gap-1" style={{ color: reputation.tier.color }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {reputation.tier.name}
                </span>
              </div>
            </div>
          </div>

          {/* Level / XP widget */}
          <div className="w-full lg:w-72 bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${reputation.tier.color}, #6366f1)` }}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Nivo</span>
                  <span className="text-sm font-display font-black text-white">LEVEL {reputation.level}</span>
                </div>
              </div>
              <span className="text-xs font-mono font-bold" style={{ color: reputation.tier.color }}>
                {reputation.progressPercent}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/10">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${reputation.progressPercent}%`,
                  background: `linear-gradient(90deg, ${reputation.tier.color}, #22d3ee)`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono text-slate-400">
              <span>{reputation.total.toLocaleString()} RP</span>
              <span>{reputation.nextLevelXp.toLocaleString()} RP</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== STATS ===================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl bg-[#0f1423]/80 border border-white/10 p-4 hover:border-white/20 transition-all">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border"
                  style={{ color: s.color, borderColor: `${s.color}44`, backgroundColor: `${s.color}14` }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xl font-display font-black text-white leading-none">{s.value.toLocaleString()}</span>
                  <span className="block text-[10px] uppercase tracking-wider text-slate-400 font-mono mt-1 truncate">
                    {s.label}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===================== REPUTATION ===================== */}
      <div className="relative rounded-3xl bg-[#0f1423]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-7 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center border shadow-inner"
              style={{ color: reputation.tier.color, borderColor: `${reputation.tier.color}55`, backgroundColor: `${reputation.tier.color}14` }}
            >
              <Trophy className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest uppercase text-slate-400 font-bold block">Ukupna Reputacija</span>
              <span className="text-3xl font-display font-black text-white">{reputation.total.toLocaleString()}</span>
              <span
                className="ml-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider align-middle"
                style={{ color: reputation.tier.color, borderColor: `${reputation.tier.color}55`, backgroundColor: `${reputation.tier.color}14` }}
              >
                {reputation.tier.name}
              </span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <span className="block text-sm font-bold text-white">{reputation.base.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">Osnova</span>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <span className="block text-sm font-bold text-emerald-400">{reputation.fromThreads.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">Teme</span>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 text-center">
              <span className="block text-sm font-bold text-cyan-400">{reputation.fromReplies.toLocaleString()}</span>
              <span className="text-[10px] text-slate-400 font-mono uppercase">Odgovori</span>
            </div>
          </div>

          {reputation.tier.nextTier && (
            <div className="md:w-56 shrink-0">
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                <span>do {reputation.tier.nextTier.name}</span>
                <span>{Math.max(0, reputation.tier.nextTier.min - reputation.total)} RP</span>
              </div>
              <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min(100, Math.round(((reputation.total - reputation.tier.min) / Math.max(1, reputation.tier.nextTier.min - reputation.tier.min)) * 100))}%`,
                    background: `linear-gradient(90deg, ${reputation.tier.color}, ${reputation.tier.nextTier.color})`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================== GAMING ACCOUNTS & IDENTITY ===================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Gaming accounts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Gamepad2 className="w-4 h-4" />
            </div>
            <h2 className="text-base font-display font-bold text-white tracking-wide">Povezani Gejming Nalozi</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {gamingPlatforms.map(platform => {
              const accountVal = (member.gamingAccounts as Record<string, string | undefined>)?.[platform.key];
              const isConnected = Boolean(accountVal);
              return (
                <div
                  key={platform.key}
                  className="group bg-[#0f1423]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 transition-all duration-300 hover:border-white/20"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        style={{ color: platform.color, backgroundColor: `${platform.color}15` }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform shrink-0"
                      >
                        {platform.icon}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-display font-bold text-white tracking-wide truncate">{platform.name}</h3>
                        <span className="text-[11px] font-mono text-slate-400 truncate block">
                          {accountVal || 'Nije povezano'}
                        </span>
                      </div>
                    </div>

                    {canEdit ? (
                      isConnected ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => { setConnectModalPlatform(platform); setAccountInputId(accountVal || ''); }}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                            title="Izmeni"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDisconnect(platform.key)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer"
                            title="Ukloni"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setConnectModalPlatform(platform); setAccountInputId(''); }}
                          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-500 hover:to-indigo-500 cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Poveži</span>
                        </button>
                      )
                    ) : (
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                          isConnected
                            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                            : 'text-slate-500 border-white/10 bg-white/5'
                        }`}
                      >
                        {isConnected ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {isConnected ? 'Povezano' : 'Nepovezano'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Identity card */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h2 className="text-base font-display font-bold text-white tracking-wide">Identitet</h2>
          </div>

          <div className="rounded-2xl bg-[#0f1423]/80 border border-white/10 p-4 space-y-3">
            <IdentityRow icon={User} label="Korisničko ime" value={member.name} />
            <IdentityRow icon={ShieldCheck} label="Rola" value={member.role || 'Član'} />
            <IdentityRow
              icon={CalendarDays}
              label="Član od"
              value={member.joinedDate ? new Date(member.joinedDate).toLocaleDateString('sr-RS') : '—'}
            />
            <IdentityRow icon={Sparkles} label="Reputacioni rang" value={reputation.tier.name} />
            <IdentityRow icon={Award} label="Osvojeni bedževi" value={String(badgeBoard.earned.length)} />

            <button
              onClick={() => handleCopy(member.name, 'Korisničko ime')}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Kopiraj korisničko ime</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================== BADGES ===================== */}
      <div className="relative rounded-3xl bg-[#0f1423]/90 backdrop-blur-xl border border-white/10 p-6 sm:p-7 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Award className="w-4 h-4" />
              </div>
              <h2 className="text-base font-display font-bold text-white tracking-wide">
                Sistem Reputacije &amp; Osvojeni Bedževi
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {badgeBoard.earned.length} osvojeno · {badgeBoard.locked.length} dostupno
            </span>
          </div>

          {badgeBoard.earned.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {badgeBoard.earned.map((b, i) => (
                <AchievementBadge key={b.id || `${b.name}-${i}`} badge={b as UserBadge} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-4 flex items-center gap-3">
              <Lock className="w-5 h-5 text-slate-500" />
              <p className="text-xs text-slate-400">
                Još nema osvojenih bedževa. Učestvuj u diskusijama i skupljaj reputaciju da otključaš prva odlikovanja.
              </p>
            </div>
          )}

          {badgeBoard.locked.length > 0 && (
            <div className="pt-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block mb-2">
                Dostupna dostignuća
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {badgeBoard.locked.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-3 opacity-60"
                  >
                    <AchievementBadge badge={{ ...b, description: b.description } as unknown as UserBadge} locked compact />
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-bold text-slate-300">{b.name}</span>
                      <span className="block truncate text-[10px] text-slate-500">{b.requirement}</span>
                    </div>
                    <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0 ml-auto" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===================== TABS ===================== */}
      <div className="space-y-5">
        <div className="flex items-center gap-2 sm:gap-6 border-b border-white/10 overflow-x-auto no-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 text-xs sm:text-sm font-display font-bold tracking-wide transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 relative ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" style={{ color: tab.color }} />
                <span>{tab.label}</span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/5 font-mono">{tab.count}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.8)]"></div>
                )}
              </button>
            );
          })}
        </div>

        <div>
          {/* THREADS */}
          {activeTab === 'threads' && (
            recentThreads.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {recentThreads.map(thread => (
                  <div
                    key={thread.id}
                    onClick={() => onSelectThread(thread.slug)}
                    className="p-4 rounded-2xl bg-[#0f1423] border border-white/10 hover:border-violet-500/50 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors truncate">
                        {thread.title}
                      </h3>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                        <span>{thread.subforumId}</span>
                        <span>·</span>
                        <span>{thread.createdAt ? new Date(thread.createdAt).toLocaleDateString('sr-RS') : ''}</span>
                        <span>·</span>
                        <span>{thread.views || 0} pregleda</span>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Box}
                color="#8b5cf6"
                title="Nema aktivnih tema na forumu"
                text="Ovaj korisnik još uvek nije pokrenuo nijednu diskusiju."
                actionLabel="Idi na Forum"
                onAction={onNavigateForum}
              />
            )
          )}

          {/* REPLIES */}
          {activeTab === 'replies' && (
            recentReplies.length > 0 ? (
              <div className="grid grid-cols-1 gap-3">
                {recentReplies.map(reply => (
                  <div key={reply.id} className="p-4 rounded-2xl bg-[#0f1423] border border-white/10 space-y-2">
                    <p className="text-xs text-slate-300 line-clamp-2">{reply.content}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                      <span>{reply.createdAt ? new Date(reply.createdAt).toLocaleDateString('sr-RS') : ''}</span>
                      {typeof reply.score === 'number' && <span>· {reply.score} poena</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Layers}
                color="#22d3ee"
                title="Prazan sandučić odgovora"
                text="Korisnik nije ostavio nijedan odgovor na temama."
                actionLabel="Idi na Forum"
                onAction={onNavigateForum}
              />
            )
          )}

          {/* SAVED */}
          {activeTab === 'saved' && (
            savedPosts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {savedPosts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => onSelectPost(post.slug)}
                    className="p-4 rounded-2xl bg-[#0f1423] border border-white/10 hover:border-amber-500/50 transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-start gap-3">
                      {post.cover_image && (
                        <img src={post.cover_image} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1">{post.excerpt}</p>
                        <span className="text-[10px] text-slate-500 font-mono">{post.category?.name || 'Vesti'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Bookmark}
                color="#f472b6"
                title="Nema sačuvanih članaka"
                text="Sačuvaj zanimljive vesti i recenzije klikom na ikonicu bookmark-a u čitaocu."
              />
            )
          )}
        </div>
      </div>

      {/* ===================== MODALS ===================== */}

      {/* Gaming Account Connect Modal */}
      {connectModalPlatform && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141c] border border-violet-500/30 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <div style={{ color: connectModalPlatform.color }} className="p-2 rounded-xl bg-white/5">
                  {connectModalPlatform.icon}
                </div>
                <h3 className="text-base font-display font-extrabold text-white">
                  Poveži {connectModalPlatform.name} Nalog
                </h3>
              </div>
              <button
                onClick={() => setConnectModalPlatform(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Unesite Vaš {connectModalPlatform.name} ID / Korisničko ime:
                </label>
                <input
                  type="text"
                  value={accountInputId}
                  onChange={e => setAccountInputId(e.target.value)}
                  placeholder={`npr. ${targetUsername}_official`}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-violet-500 outline-none font-mono"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setConnectModalPlatform(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-lg shadow-violet-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Sačuvaj i Poveži</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#14141c] border border-white/10 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-base font-display font-extrabold text-white">Izmena Profila</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Banner */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Baner profila</label>
                <div className="relative rounded-2xl overflow-hidden border border-white/10 h-28 bg-black/40">
                  {editBanner ? (
                    <img src={editBanner} alt="Baner pregled" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploading === 'banner'}
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white text-[11px] font-semibold border border-white/20 cursor-pointer"
                  >
                    {uploading === 'banner' ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Otpremi baner</span>
                  </button>
                  <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerPicked} />
                </div>
                <input
                  type="text"
                  value={editBanner}
                  onChange={e => setEditBanner(e.target.value)}
                  placeholder="…ili nalepi URL banera"
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-violet-500 outline-none"
                />
              </div>

              {/* Avatar */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">Profilna slika</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-black/40 shrink-0">
                    {editAvatar ? (
                      <img src={editAvatar} alt="Avatar pregled" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploading === 'avatar'}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold cursor-pointer border border-white/10"
                    >
                      {uploading === 'avatar' ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Otpremi sliku</span>
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPicked} />
                    <input
                      type="text"
                      value={editAvatar}
                      onChange={e => setEditAvatar(e.target.value)}
                      placeholder="…ili nalepi URL slike"
                      className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-violet-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Biografija / Status</label>
                <textarea
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Kratko predstavi sebe..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-violet-500 outline-none resize-none"
                />
                <span className="text-[10px] text-slate-500 font-mono">{editBio.length}/500</span>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white text-xs font-bold shadow-lg shadow-violet-500/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {savingProfile ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Sačuvaj izmene</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// =========================================================================
// Pomoćne komponente
// =========================================================================
const IdentityRow: React.FC<{ icon: LucideIcon; label: string; value: string }> = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="inline-flex items-center gap-2 text-[11px] text-slate-400">
      <Icon className="w-3.5 h-3.5 text-slate-500" />
      {label}
    </span>
    <span className="text-xs font-semibold text-white truncate max-w-[55%] text-right">{value}</span>
  </div>
);

const EmptyState: React.FC<{
  icon: LucideIcon;
  color: string;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ icon: Icon, color, title, text, actionLabel, onAction }) => (
  <div className="rounded-3xl bg-[#0f1423]/60 border border-white/10 p-12 text-center flex flex-col items-center justify-center space-y-4">
    <div
      className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl border"
      style={{ color, borderColor: `${color}44`, backgroundColor: `${color}14` }}
    >
      <Icon className="w-10 h-10" />
    </div>
    <div className="max-w-md space-y-1">
      <h3 className="text-base font-display font-bold text-white">{title}</h3>
      <p className="text-xs text-slate-400">{text}</p>
    </div>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-violet-500/25 transition-all cursor-pointer"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default ProfileView;
