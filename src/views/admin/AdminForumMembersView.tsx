import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Search,
  Plus,
  Minus,
  RotateCcw,
  Edit,
  Trash2,
  Check,
  X,
  UserCheck,
  Users,
  Shield,
  Flame,
  ExternalLink,
  MessageSquare,
  MessagesSquare,
  Sparkles,
} from 'lucide-react';
import { ForumMemberKarma } from '../../types';
import { ForumService } from '../../services/forumService';
import { useToast } from '../../components/ui/Toast';

interface AdminForumMembersViewProps {
  onRefresh?: () => void;
}

export const AdminForumMembersView: React.FC<AdminForumMembersViewProps> = ({
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [members, setMembers] = useState<ForumMemberKarma[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Edit Member Modal
  const [editingMember, setEditingMember] = useState<ForumMemberKarma | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('Član');
  const [editAvatar, setEditAvatar] = useState('');
  const [editBaseKarma, setEditBaseKarma] = useState<number>(50);
  const [editIsOnline, setEditIsOnline] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editGaming, setEditGaming] = useState<any>({
    steamId: '',
    discordTag: '',
    twitch: '',
    youtube: '',
    psnId: '',
    xboxGamertag: '',
  });
  const [editBadges, setEditBadges] = useState<any[]>([]);

  // Quick Karma Adjust Modal
  const [karmaAdjustMember, setKarmaAdjustMember] = useState<ForumMemberKarma | null>(null);
  const [karmaDelta, setKarmaDelta] = useState<number>(50);
  const [karmaReason, setKarmaReason] = useState('');

  // Reset Karma Confirmation Modal
  const [resetKarmaMember, setResetKarmaMember] = useState<ForumMemberKarma | null>(null);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const list = await ForumService.getMembersAsync();
      setMembers(list);
    } catch {
      setMembers(ForumService.getLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/forum/stream');
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (
            ['leaderboard_updated', 'thread_voted', 'reply_voted', 'thread_created', 'reply_added'].includes(
              payload.type
            )
          ) {
            loadMembers();
          }
        } catch {}
      };
    } catch {}

    const bc =
      typeof window !== 'undefined' && 'BroadcastChannel' in window
        ? new BroadcastChannel('nexus_forum_channel')
        : null;

    if (bc) {
      bc.onmessage = () => loadMembers();
    }

    return () => {
      eventSource?.close();
      bc?.close();
    };
  }, []);

  const rolesList = ['Administrator', 'Moderator', 'Hardver Guru', 'VIP Član', 'Član'];

  const filteredMembers = members.filter(m => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q);
  });

  // Start Edit Member
  const startEdit = (m: ForumMemberKarma) => {
    setEditingMember(m);
    setEditName(m.name);
    setEditRole(m.role);
    setEditAvatar(m.avatar);
    setEditBaseKarma(m.baseKarma ?? m.karma);
    setEditIsOnline(Boolean(m.isOnline));
    setEditBio(m.bio || '');
    setEditGaming({
      steamId: m.gamingAccounts?.steamId || '',
      discordTag: m.gamingAccounts?.discordTag || '',
      twitch: m.gamingAccounts?.twitch || '',
      youtube: m.gamingAccounts?.youtube || '',
      psnId: m.gamingAccounts?.psnId || '',
      xboxGamertag: m.gamingAccounts?.xboxGamertag || '',
    });
    setEditBadges(m.badges || []);
  };

  // Save Member Changes
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    await ForumService.updateMemberAsync(editingMember.name, {
      role: editRole,
      avatar: editAvatar.trim(),
      baseKarma: Number(editBaseKarma),
      isOnline: editIsOnline,
      bio: editBio.trim(),
      gamingAccounts: editGaming,
      badges: editBadges,
    });

    showToast(`Podaci za člana "${editingMember.name}" su ažurirani!`, 'success');
    setEditingMember(null);
    await loadMembers();
    onRefresh?.();
  };

  // Apply Karma Adjustment
  const handleApplyKarmaAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!karmaAdjustMember) return;

    const delta = Number(karmaDelta);
    await ForumService.adjustMemberKarmaAsync(
      karmaAdjustMember.name,
      delta,
      karmaReason.trim()
    );

    showToast(
      delta >= 0
        ? `Dodato +${delta} karme članu ${karmaAdjustMember.name}.`
        : `Oduzeto ${delta} karme članu ${karmaAdjustMember.name}.`,
      'success'
    );
    setKarmaAdjustMember(null);
    setKarmaReason('');
    await loadMembers();
    onRefresh?.();
  };

  // Reset Karma
  const handleResetKarma = async () => {
    if (!resetKarmaMember) return;
    await ForumService.resetMemberKarmaAsync(resetKarmaMember.name);
    showToast(`Karma člana "${resetKarmaMember.name}" je resetovana na 0.`, 'info');
    setResetKarmaMember(null);
    await loadMembers();
    onRefresh?.();
  };

  // Delete Member
  const handleDeleteMember = async (name: string) => {
    if (confirm(`Da li ste sigurni da želite da uklonite člana "${name}" iz baze foruma?`)) {
      await ForumService.deleteMemberAsync(name);
      showToast(`Član "${name}" je uklonjen iz baze foruma.`, 'success');
      await loadMembers();
      onRefresh?.();
    }
  };

  const totalKarmaDistributed = members.reduce((sum, m) => sum + (m.karma || 0), 0);
  const activeModerators = members.filter(m => m.role === 'Moderator' || m.role === 'Administrator').length;
  const onlineMembersCount = members.filter(m => m.isOnline).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#f59e0b]/20 text-[#f59e0b]">
              <Trophy className="w-5 h-5" />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Top Forum Članovi & Karma
            </h1>
          </div>
          <p className="text-xs text-[#a1a1a1]">
            Upravljajte karmom, ulogama članova zajednice i rang-listom najaktivnijih gejmera u realnom vremenu.
          </p>
        </div>

        <a
          href="/forum"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-xs font-medium text-[#22d3ee] rounded-lg transition-colors self-start sm:self-auto"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Vidi Leaderboard na Forumu</span>
        </a>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-1">
            <span className="text-xs font-medium">Ukupno Članova</span>
            <Users className="w-4 h-4 text-[#a855f7]" />
          </div>
          <div className="text-2xl font-display font-bold text-white tabular-nums">
            {members.length}
          </div>
          <span className="text-[11px] text-[#71717a]">u bazi foruma</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-1">
            <span className="text-xs font-medium">Ukupna Karma</span>
            <Flame className="w-4 h-4 text-[#f59e0b]" />
          </div>
          <div className="text-2xl font-display font-bold text-[#f59e0b] tabular-nums">
            {totalKarmaDistributed.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#71717a]">dodeljeno članovima</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-1">
            <span className="text-xs font-medium">Moderatori</span>
            <Shield className="w-4 h-4 text-[#22c55e]" />
          </div>
          <div className="text-2xl font-display font-bold text-[#22c55e] tabular-nums">
            {activeModerators}
          </div>
          <span className="text-[11px] text-[#71717a]">sa moderatorskim pravima</span>
        </div>

        <div className="p-4 rounded-xl bg-[#141414] border border-[#262626]">
          <div className="flex items-center justify-between text-[#a1a1a1] mb-1">
            <span className="text-xs font-medium">Trenutno Na Mreži</span>
            <UserCheck className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <div className="text-2xl font-display font-bold text-[#22d3ee] tabular-nums">
            {onlineMembersCount}
          </div>
          <span className="text-[11px] text-[#71717a]">aktivno u zajednici</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-xl bg-[#141414] border border-[#262626] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Pretraži člana po imenu ili ulozi..."
            className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none focus:border-[#a855f7]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
          >
            <option value="all">Sve Uloge ({members.length})</option>
            {rolesList.map(r => (
              <option key={r} value={r}>
                {r} ({members.filter(m => m.role === r).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 bg-[#18181b] border-b border-[#262626] flex items-center justify-between">
          <span className="font-bold text-xs uppercase tracking-wider text-white">
            Rang Lista Članova ({filteredMembers.length})
          </span>
          <span className="text-[11px] text-[#71717a]">
            Ažuriranje se vrši u realnom vremenu
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-[#71717a] text-xs">
            Učitavanje članova i bodova karme...
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 text-center text-[#71717a] text-xs">
            Nema članova koji odgovaraju pretrazi.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161618] border-b border-[#262626] text-[#71717a] uppercase font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4 text-center">Rang</th>
                  <th className="py-3 px-4">Član</th>
                  <th className="py-3 px-4">Uloga</th>
                  <th className="py-3 px-4 text-center">Teme / Odgovori</th>
                  <th className="py-3 px-4 text-center">Neto Karma</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Akcije & Podešavanje Karme</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262626]">
                {filteredMembers.map(member => {
                  const isTop3 = member.rank <= 3;
                  const medalColor =
                    member.rank === 1
                      ? 'text-[#eab308] bg-[#eab308]/10 border-[#eab308]/30'
                      : member.rank === 2
                      ? 'text-[#94a3b8] bg-[#94a3b8]/10 border-[#94a3b8]/30'
                      : member.rank === 3
                      ? 'text-[#b45309] bg-[#b45309]/10 border-[#b45309]/30'
                      : 'text-[#71717a] bg-[#1c1c1c] border-[#262626]';

                  return (
                    <tr
                      key={member.name}
                      className="hover:bg-[#1a1a1a] transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-mono font-bold text-xs border ${medalColor}`}
                        >
                          #{member.rank}
                        </span>
                      </td>

                      {/* Member Info */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover border border-[#262626]"
                            />
                            {member.isOnline && (
                              <span
                                className="w-2.5 h-2.5 rounded-full bg-[#22c55e] border-2 border-[#141414] absolute -bottom-0.5 -right-0.5"
                                title="Na mreži"
                              />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold text-white block">
                                {member.name}
                              </span>
                              {member.badges && member.badges.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {member.badges.slice(0, 2).map((b: any) => (
                                    <span
                                      key={b.id || b.name}
                                      style={{ borderColor: `${b.color || '#a855f7'}40`, color: b.color || '#a855f7' }}
                                      className="text-[9px] px-1.5 py-0.2 rounded bg-white/5 border font-medium"
                                      title={b.description || b.name}
                                    >
                                      {b.name}
                                    </span>
                                  ))}
                                  {member.badges.length > 2 && (
                                    <span className="text-[9px] text-[#71717a] font-mono">
                                      +{member.badges.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {member.bio && (
                              <span className="text-[10px] text-[#71717a] line-clamp-1 max-w-xs block mt-0.5">
                                {member.bio}
                              </span>
                            )}

                            {(member.gamingAccounts?.steamId || member.gamingAccounts?.discordTag || member.gamingAccounts?.psnId) && (
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-[#a1a1a1] font-mono">
                                {member.gamingAccounts.steamId && (
                                  <span className="text-[#66c0f4]">Steam</span>
                                )}
                                {member.gamingAccounts.discordTag && (
                                  <span className="text-[#5865F2]">Discord</span>
                                )}
                                {member.gamingAccounts.psnId && (
                                  <span className="text-[#0070d1]">PSN</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                            member.role === 'Administrator'
                              ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
                              : member.role === 'Moderator'
                              ? 'bg-[#a855f7]/20 text-[#a855f7] border border-[#a855f7]/30'
                              : member.role === 'Hardver Guru'
                              ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30'
                              : member.role === 'VIP Član'
                              ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30'
                              : 'bg-[#1c1c1c] text-[#a1a1a1] border border-[#262626]'
                          }`}
                        >
                          {member.role === 'Moderator' && <Shield className="w-2.5 h-2.5" />}
                          {member.role === 'Administrator' && <Sparkles className="w-2.5 h-2.5" />}
                          {member.role}
                        </span>
                      </td>

                      {/* Threads / Replies */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2 text-xs font-mono">
                          <span className="text-[#a1a1a1]" title="Broj tema">
                            {member.threadCount} T
                          </span>
                          <span className="text-[#3f3f46]">/</span>
                          <span className="text-[#22d3ee]" title="Broj odgovora">
                            {member.replyCount} O
                          </span>
                        </div>
                      </td>

                      {/* Net Karma */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-mono font-bold text-sm text-[#f59e0b]">
                          <Flame className="w-4 h-4 text-[#f59e0b]" />
                          <span>{member.karma.toLocaleString()}</span>
                        </div>
                      </td>

                      {/* Online Status */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {member.isOnline ? (
                          <span className="text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded border border-[#22c55e]/20">
                            Online
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#71717a]">
                            Offline
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Add Karma Button */}
                          <button
                            onClick={() => {
                              setKarmaAdjustMember(member);
                              setKarmaDelta(50);
                              setKarmaReason('Nagrada za kvalitetan doprinos forumu');
                            }}
                            className="px-2 py-1 rounded bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/30 font-mono text-[11px] font-bold transition-colors"
                            title="Dodaj / Oduzmi karmu"
                          >
                            ± Karma
                          </button>

                          {/* Edit Member */}
                          <button
                            onClick={() => startEdit(member)}
                            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#22d3ee] transition-colors"
                            title="Izmeni profil i ulogu člana"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Karma */}
                          <button
                            onClick={() => setResetKarmaMember(member)}
                            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#f59e0b]/20 text-[#f59e0b] transition-colors"
                            title="Resetuj karmu na 0"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Member */}
                          <button
                            onClick={() => handleDeleteMember(member.name)}
                            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#ef4444]/20 text-[#ef4444] transition-colors"
                            title="Ukloni člana"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK KARMA ADJUSTMENT MODAL */}
      {karmaAdjustMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-[#f59e0b]" />
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                  Podešavanje Karme: {karmaAdjustMember.name}
                </h3>
              </div>
              <button
                onClick={() => setKarmaAdjustMember(null)}
                className="text-[#71717a] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyKarmaAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Trenutna karma člana: <span className="text-[#f59e0b] font-mono">{karmaAdjustMember.karma}</span>
                </label>
                <div className="flex items-center gap-2 mt-2">
                  {[-50, -20, +25, +50, +100].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setKarmaDelta(val)}
                      className={`flex-1 py-1.5 rounded text-xs font-mono font-bold border transition-colors ${
                        karmaDelta === val
                          ? 'bg-[#f59e0b] text-black border-[#f59e0b]'
                          : 'bg-[#1c1c1c] text-[#d4d4d8] border-[#262626] hover:border-[#3f3f46]'
                      }`}
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Broj poena za promenu (pozitivan ili negativan iznos) *
                </label>
                <input
                  type="number"
                  required
                  value={karmaDelta}
                  onChange={e => setKarmaDelta(Number(e.target.value))}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Razlog dodele / sankcije (za evidenciju)
                </label>
                <input
                  type="text"
                  value={karmaReason}
                  onChange={e => setKarmaReason(e.target.value)}
                  placeholder="npr. Pomoć novim igračima u LFG sekciji"
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setKarmaAdjustMember(null)}
                  className="px-4 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs font-semibold text-[#a1a1a1] hover:text-white"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-xs font-bold uppercase tracking-wider text-black shadow-md shadow-amber-500/20"
                >
                  Primeni Promenu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MEMBER PROFILE MODAL */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#22d3ee]" />
                <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                  Izmena Člana: {editingMember.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-[#71717a] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Uloga na forumu
                </label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                >
                  {rolesList.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  URL Profilne Slike (Avatar)
                </label>
                <input
                  type="url"
                  value={editAvatar}
                  onChange={e => setEditAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Osnovna Karma (Base Karma)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editBaseKarma}
                  onChange={e => setEditBaseKarma(Number(e.target.value))}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Kratka Biografija / Info
                </label>
                <textarea
                  rows={2}
                  value={editBio}
                  onChange={e => setEditBio(e.target.value)}
                  placeholder="Kratak opis ili gejming status..."
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              {/* Gaming Accounts Inputs */}
              <div className="pt-2 border-t border-[#262626] space-y-2.5">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                  Gejming Nalozi & Identitet
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-[#a1a1a1] block mb-0.5">Steam ID</label>
                    <input
                      type="text"
                      value={editGaming.steamId || ''}
                      onChange={e => setEditGaming({ ...editGaming, steamId: e.target.value })}
                      placeholder="Steam username / URL"
                      className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#a1a1a1] block mb-0.5">Discord Tag</label>
                    <input
                      type="text"
                      value={editGaming.discordTag || ''}
                      onChange={e => setEditGaming({ ...editGaming, discordTag: e.target.value })}
                      placeholder="User#1234 ili @tag"
                      className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#a1a1a1] block mb-0.5">Twitch / YouTube</label>
                    <input
                      type="text"
                      value={editGaming.twitch || editGaming.youtube || ''}
                      onChange={e => setEditGaming({ ...editGaming, twitch: e.target.value })}
                      placeholder="twitch.tv/... ili kanal"
                      className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#a1a1a1] block mb-0.5">PSN / Xbox Gamertag</label>
                    <input
                      type="text"
                      value={editGaming.psnId || editGaming.xboxGamertag || ''}
                      onChange={e => setEditGaming({ ...editGaming, psnId: e.target.value })}
                      placeholder="PSN ID ili Xbox Gamertag"
                      className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Badges Assignment */}
              <div className="pt-2 border-t border-[#262626] space-y-2">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider block">
                  Dodeljeni Bedževi ({editBadges.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'b_pro_rev', name: 'Pro Reviewer', color: '#a855f7', icon: 'Star', desc: 'Priznati recenzent igara' },
                    { id: 'b_esports_mod', name: 'Esports Mod', color: '#f59e0b', icon: 'Shield', desc: 'Moderator turnira' },
                    { id: 'b_guild_leader', name: 'Guild Leader', color: '#10b981', icon: 'Crown', desc: 'Vođa klana' },
                    { id: 'b_top_contrib', name: 'Top Contributor', color: '#06b6d4', icon: 'Sparkles', desc: 'Vrhunski forumaški doprinos' },
                    { id: 'b_hw_guru', name: 'Hardware Guru', color: '#10b981', icon: 'Cpu', desc: 'Ekspert za hardver' },
                    { id: 'b_speedrunner', name: 'Speedrunner', color: '#eab308', icon: 'Zap', desc: 'Lovac na brzinske rekorde' },
                    { id: 'b_vip_founder', name: 'VIP Founder', color: '#ec4899', icon: 'Gem', desc: 'Član osnivač' },
                  ].map(b => {
                    const isChecked = editBadges.some(eb => eb.id === b.id || eb.name === b.name);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setEditBadges(editBadges.filter(eb => eb.id !== b.id && eb.name !== b.name));
                          } else {
                            setEditBadges([
                              ...editBadges,
                              {
                                id: b.id,
                                name: b.name,
                                description: b.desc,
                                icon: b.icon,
                                color: b.color,
                                assignedAt: new Date().toISOString(),
                              },
                            ]);
                          }
                        }}
                        style={{
                          borderColor: isChecked ? b.color : '#262626',
                          backgroundColor: isChecked ? `${b.color}25` : '#1c1c1c',
                          color: isChecked ? '#ffffff' : '#a1a1a1',
                        }}
                        className="px-2.5 py-1 rounded-md text-[10px] font-semibold border transition-all flex items-center gap-1 cursor-pointer"
                      >
                        {isChecked && <Check className="w-3 h-3 text-emerald-400" />}
                        <span>{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="onlineStatus"
                  checked={editIsOnline}
                  onChange={e => setEditIsOnline(e.target.checked)}
                  className="w-4 h-4 rounded bg-[#1c1c1c] border-[#262626] text-[#a855f7] focus:ring-0"
                />
                <label htmlFor="onlineStatus" className="text-xs text-[#d4d4d8] cursor-pointer">
                  Označi člana kao <span className="text-[#22c55e] font-semibold">Online</span> na sajtu
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">

                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs font-semibold text-[#a1a1a1] hover:text-white"
                >
                  Otkaži
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-xs font-bold uppercase tracking-wider text-white shadow-md shadow-purple-500/20"
                >
                  Sačuvaj Promene
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET KARMA CONFIRMATION MODAL */}
      {resetKarmaMember && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-[#f59e0b]">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                Resetovanje Karme
              </h3>
            </div>

            <p className="text-xs text-[#a1a1a1]">
              Da li ste sigurni da želite da resetujete osnovnu karmu za člana{' '}
              <span className="font-semibold text-white">{resetKarmaMember.name}</span> na{' '}
              <span className="font-mono text-[#f59e0b]">0</span>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResetKarmaMember(null)}
                className="px-4 py-2 rounded-lg bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs font-semibold text-[#a1a1a1] hover:text-white"
              >
                Otkaži
              </button>
              <button
                type="button"
                onClick={handleResetKarma}
                className="px-4 py-2 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-xs font-bold uppercase tracking-wider text-black shadow-md shadow-amber-500/20"
              >
                Resetuj na 0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
