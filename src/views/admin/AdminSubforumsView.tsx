import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Layers,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  ExternalLink,
  Monitor,
  Gamepad2,
  Trophy,
  Cpu,
  Users,
  Coffee,
  Flame,
  Shield,
  HelpCircle,
  Sparkles,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { ForumSubforum, Category } from '../../types';
import { ForumService } from '../../services/forumService';
import { StorageService } from '../../services/storage';
import { useToast } from '../../components/ui/Toast';

interface AdminSubforumsViewProps {
  categories: Category[];
  onRefresh: () => void;
}

export const AdminSubforumsView: React.FC<AdminSubforumsViewProps> = ({
  categories,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'subforums' | 'news_categories'>('subforums');
  const [subforums, setSubforums] = useState<ForumSubforum[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing Subforum State
  const [editingSubforum, setEditingSubforum] = useState<ForumSubforum | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('Monitor');
  const [color, setColor] = useState('#22d3ee');
  const [badge, setBadge] = useState('');
  const [displayOrder, setDisplayOrder] = useState<number>(1);

  // News category edit state (integrated seamlessly)
  const [editingNewsCategory, setEditingNewsCategory] = useState<Category | null>(null);
  const [newsCatName, setNewsCatName] = useState('');
  const [newsCatSlug, setNewsCatSlug] = useState('');
  const [newsCatColor, setNewsCatColor] = useState('#a855f7');
  const [newsCatDesc, setNewsCatDesc] = useState('');

  const colorPresets = [
    '#22d3ee', // Cyan
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#ec4899', // Pink
    '#6366f1', // Indigo
    '#ef4444', // Red
    '#3b82f6', // Blue
  ];

  const iconOptions = [
    { id: 'Monitor', label: 'Monitor (PC)', icon: Monitor },
    { id: 'Gamepad2', label: 'Gamepad (Konzole)', icon: Gamepad2 },
    { id: 'Trophy', label: 'Trophy (Esports)', icon: Trophy },
    { id: 'Cpu', label: 'Cpu (Hardver)', icon: Cpu },
    { id: 'Users', label: 'Users (LFG/Timovi)', icon: Users },
    { id: 'Coffee', label: 'Coffee (Lounge)', icon: Coffee },
    { id: 'Flame', label: 'Flame (Vruće)', icon: Flame },
    { id: 'Shield', label: 'Shield (Sigurnost)', icon: Shield },
    { id: 'HelpCircle', label: 'Help (Pomoć)', icon: HelpCircle },
    { id: 'Sparkles', label: 'Sparkles (Novo)', icon: Sparkles },
    { id: 'Layers', label: 'Layers (Opšte)', icon: Layers },
  ];

  const loadSubforums = async () => {
    setLoading(true);
    try {
      const subs = await ForumService.getSubforumsAsync();
      setSubforums(subs);
    } catch {
      setSubforums(ForumService.getSubforums());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubforums();
  }, []);

  const startEditSubforum = (sub: ForumSubforum) => {
    setEditingSubforum(sub);
    setName(sub.name);
    setSlug(sub.slug);
    setDescription(sub.description);
    setIcon(sub.icon || 'Layers');
    setColor(sub.color || '#a855f7');
    setBadge(sub.badge || '');
  };

  const cancelEditSubforum = () => {
    setEditingSubforum(null);
    setName('');
    setSlug('');
    setDescription('');
    setIcon('Monitor');
    setColor('#22d3ee');
    setBadge('');
  };

  const handleSaveSubforum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Naziv potforuma je obavezan!', 'error');
      return;
    }

    const cleanSlug =
      slug.trim() ||
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

    if (editingSubforum) {
      await ForumService.updateSubforumAsync(editingSubforum.id, {
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim(),
        icon,
        color,
        badge: badge.trim() || undefined,
      });
      showToast(`Potforum "${name}" je uspešno ažuriran!`, 'success');
    } else {
      await ForumService.createSubforumAsync({
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim(),
        icon,
        color,
        badge: badge.trim() || undefined,
        display_order: subforums.length + 1,
      });
      showToast(`Novi potforum "${name}" je kreiran!`, 'success');
    }

    cancelEditSubforum();
    await loadSubforums();
    onRefresh();
  };

  const handleDeleteSubforum = async (id: string, subName: string) => {
    if (subforums.length <= 1) {
      showToast('Mora postojati bar jedan aktivan potforum!', 'error');
      return;
    }
    const success = await ForumService.deleteSubforumAsync(id);
    if (success) {
      showToast(`Potforum "${subName}" je uklonjen.`, 'success');
      await loadSubforums();
      onRefresh();
    } else {
      showToast('Greška pri brisanju potforuma.', 'error');
    }
  };

  // Render selected Lucide icon
  const renderIcon = (iconName: string, className: string = 'w-4 h-4') => {
    const matched = iconOptions.find(o => o.id === iconName);
    const Comp = matched ? matched.icon : Layers;
    return <Comp className={className} />;
  };

  return (
    <div className="space-y-8">
      {/* Header & Sub-tab navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-[#a855f7]/20 text-[#a855f7]">
              <FolderTree className="w-5 h-5" />
            </span>
            <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Kategorije & Potforumi
            </h1>
          </div>
          <p className="text-xs text-[#a1a1a1]">
            Upravljajte hijerarhijom foruma (PC Gaming, Konzole, Esports...) i rubrikama vesti portala.
          </p>
        </div>

        {/* Tab switch between Forum Subforums and News Categories */}
        <div className="flex items-center p-1 bg-[#141414] border border-[#262626] rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveSubTab('subforums')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'subforums'
                ? 'bg-[#a855f7] text-white shadow-md'
                : 'text-[#a1a1a1] hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Forum Potforumi ({subforums.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('news_categories')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeSubTab === 'news_categories'
                ? 'bg-[#a855f7] text-white shadow-md'
                : 'text-[#a1a1a1] hover:text-white'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Rubrike Vesti ({categories.length})</span>
          </button>
        </div>
      </div>

      {/* SUBFORUMS MODULE */}
      {activeSubTab === 'subforums' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column - 5 cols */}
          <div className="lg:col-span-5 bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                {editingSubforum ? 'Izmena Potforuma' : 'Novi Forum Potforum'}
              </h3>
              {editingSubforum && (
                <button
                  onClick={cancelEditSubforum}
                  className="text-xs text-[#71717a] hover:text-white"
                >
                  Otkaži
                </button>
              )}
            </div>

            <form onSubmit={handleSaveSubforum} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Naziv Potforuma *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    if (!editingSubforum) {
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)+/g, '')
                      );
                    }
                  }}
                  placeholder="npr. Sim Racing & VR"
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  placeholder="sim-racing-vr"
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#22d3ee] font-mono focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  Ikona Potforuma
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {iconOptions.map(opt => {
                    const IconComp = opt.icon;
                    const isSelected = icon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setIcon(opt.id)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                          isSelected
                            ? 'bg-[#a855f7]/20 border-[#a855f7] text-white shadow-sm'
                            : 'bg-[#1c1c1c] border-[#262626] text-[#71717a] hover:text-white hover:border-[#3f3f46]'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[9px] truncate max-w-full">
                          {opt.id}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  Akcentna Boja
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="flex-1 bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  {colorPresets.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      className="w-5 h-5 rounded-full border border-white/20 transition-transform hover:scale-110"
                      style={{ backgroundColor: preset }}
                    />
                  ))}
                </div>
              </div>

              {/* Badge Tag */}
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Oznaka / Badge (opciono)
                </label>
                <input
                  type="text"
                  value={badge}
                  onChange={e => setBadge(e.target.value)}
                  placeholder="npr. Vruće, Popularno, LFG, Novo"
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Opis potforuma
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Kratak opis o čemu se raspravlja u ovom potforumu..."
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md"
              >
                {editingSubforum ? 'Sačuvaj izmene' : 'Kreiraj potforum'}
              </button>
            </form>
          </div>

          {/* List Column - 7 cols */}
          <div className="lg:col-span-7 bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#1c1c1c] border-b border-[#262626] flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-white">
                Svi aktivni potforumi ({subforums.length})
              </span>
              <span className="text-[11px] text-[#71717a]">
                Povezano direktno sa bazom forum_subforums
              </span>
            </div>

            <div className="divide-y divide-[#262626]">
              {subforums.map(sub => (
                <div
                  key={sub.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border mt-0.5"
                      style={{
                        backgroundColor: `${sub.color || '#a855f7'}15`,
                        borderColor: `${sub.color || '#a855f7'}30`,
                        color: sub.color || '#a855f7',
                      }}
                    >
                      {renderIcon(sub.icon, 'w-4 h-4')}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-white">{sub.name}</h4>
                        <span className="text-[11px] font-mono text-[#71717a]">
                          /{sub.slug}
                        </span>
                        {sub.badge && (
                          <span
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: `${sub.color || '#a855f7'}20`,
                              color: sub.color || '#a855f7',
                            }}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#a1a1a1] line-clamp-1 mt-0.5">
                        {sub.description}
                      </p>

                      <div className="flex items-center gap-3 text-[11px] font-mono text-[#71717a] mt-1.5">
                        <span className="text-[#22d3ee]">
                          {sub.threadCount || 0} tema
                        </span>
                        <span>•</span>
                        <span>{sub.replyCount || 0} odgovora</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`/forum/${sub.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#71717a] hover:text-[#22d3ee] transition-colors"
                      title="Pogledaj na forumu"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => startEditSubforum(sub)}
                      className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#22d3ee] transition-colors"
                      title="Izmeni potforum"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteSubforum(sub.id, sub.name)}
                      className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#ef4444]/20 text-[#ef4444] transition-colors"
                      title="Obriši potforum"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NEWS CATEGORIES MODULE */}
      {activeSubTab === 'news_categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column - 5 cols */}
          <div className="lg:col-span-5 bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
                {editingNewsCategory ? 'Izmena Rubrike Vesti' : 'Nova Rubrika Vesti'}
              </h3>
              {editingNewsCategory && (
                <button
                  onClick={() => {
                    setEditingNewsCategory(null);
                    setNewsCatName('');
                    setNewsCatSlug('');
                    setNewsCatColor('#a855f7');
                    setNewsCatDesc('');
                  }}
                  className="text-xs text-[#71717a] hover:text-white"
                >
                  Otkaži
                </button>
              )}
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                if (!newsCatName.trim()) return;
                const cleanSlug =
                  newsCatSlug.trim() ||
                  newsCatName
                    .toLowerCase()
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)+/g, '');

                if (editingNewsCategory) {
                  StorageService.updateCategory(editingNewsCategory.id, {
                    name: newsCatName.trim(),
                    slug: cleanSlug,
                    color: newsCatColor,
                    description: newsCatDesc.trim(),
                  });
                  showToast('Rubrika je uspešno ažurirana!', 'success');
                } else {
                  StorageService.createCategory({
                    name: newsCatName.trim(),
                    slug: cleanSlug,
                    color: newsCatColor,
                    description: newsCatDesc.trim(),
                  });
                  showToast('Nova rubrika vesti je kreirana!', 'success');
                }
                setEditingNewsCategory(null);
                setNewsCatName('');
                setNewsCatSlug('');
                setNewsCatColor('#a855f7');
                setNewsCatDesc('');
                onRefresh();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Naziv rubrike *
                </label>
                <input
                  type="text"
                  required
                  value={newsCatName}
                  onChange={e => {
                    setNewsCatName(e.target.value);
                    if (!editingNewsCategory) {
                      setNewsCatSlug(
                        e.target.value
                          .toLowerCase()
                          .normalize('NFD')
                          .replace(/[\u0300-\u036f]/g, '')
                          .replace(/[^a-z0-9]+/g, '-')
                          .replace(/(^-|-$)+/g, '')
                      );
                    }
                  }}
                  placeholder="npr. Esports, Recenzije"
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  required
                  value={newsCatSlug}
                  onChange={e => setNewsCatSlug(e.target.value)}
                  placeholder="esports"
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#22d3ee] font-mono focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  Boja rubrike
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="color"
                    value={newsCatColor}
                    onChange={e => setNewsCatColor(e.target.value)}
                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={newsCatColor}
                    onChange={e => setNewsCatColor(e.target.value)}
                    className="flex-1 bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                  Kratak opis (SEO)
                </label>
                <textarea
                  rows={3}
                  value={newsCatDesc}
                  onChange={e => setNewsCatDesc(e.target.value)}
                  placeholder="Opis rubrike za posetioce i meta tagove..."
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md"
              >
                {editingNewsCategory ? 'Ažuriraj rubriku' : 'Kreiraj rubriku'}
              </button>
            </form>
          </div>

          {/* List Column - 7 cols */}
          <div className="lg:col-span-7 bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 bg-[#1c1c1c] border-b border-[#262626] flex items-center justify-between">
              <span className="font-bold text-xs uppercase tracking-wider text-white">
                Sve rubrike vesti ({categories.length})
              </span>
            </div>

            <div className="divide-y divide-[#262626]">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-[#1a1a1a] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: cat.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">{cat.name}</h4>
                        <span className="text-[11px] font-mono text-[#71717a]">
                          /{cat.slug}
                        </span>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-[#a1a1a1] line-clamp-1 mt-0.5">
                          {cat.description}
                        </p>
                      )}
                      <span className="text-[11px] text-[#22d3ee] font-mono mt-1 block">
                        {cat.postCount || 0} objavljenih vesti
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditingNewsCategory(cat);
                        setNewsCatName(cat.name);
                        setNewsCatSlug(cat.slug);
                        setNewsCatColor(cat.color);
                        setNewsCatDesc(cat.description || '');
                      }}
                      className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#22d3ee] transition-colors"
                      title="Izmeni"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (categories.length <= 1) {
                          showToast('Mora postojati bar jedna kategorija!', 'error');
                          return;
                        }
                        const ok = StorageService.deleteCategory(cat.id);
                        if (ok) {
                          showToast('Kategorija je obrisana.', 'success');
                          onRefresh();
                        }
                      }}
                      className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#ef4444]/20 text-[#ef4444] transition-colors"
                      title="Obriši"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
