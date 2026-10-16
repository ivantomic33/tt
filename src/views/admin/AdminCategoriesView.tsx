import React, { useState } from 'react';
import { Plus, Edit, Trash2, Tag as TagIcon, Check } from 'lucide-react';
import { Category } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../components/ui/Toast';

interface AdminCategoriesViewProps {
  categories: Category[];
  onRefresh: () => void;
}

export const AdminCategoriesView: React.FC<AdminCategoriesViewProps> = ({
  categories,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState('#a855f7');
  const [description, setDescription] = useState('');

  const colorPresets = ['#a855f7', '#22d3ee', '#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#ec4899', '#06b6d4'];

  const startEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setColor(cat.color);
    setDescription(cat.description || '');
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setColor('#a855f7');
    setDescription('');
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Naziv kategorije je obavezan!', 'error');
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

    if (editingCategory) {
      StorageService.updateCategory(editingCategory.id, {
        name: name.trim(),
        slug: cleanSlug,
        color,
        description: description.trim(),
      });
      showToast('Kategorija je uspešno ažurirana!', 'success');
    } else {
      StorageService.createCategory({
        name: name.trim(),
        slug: cleanSlug,
        color,
        description: description.trim(),
      });
      showToast('Nova kategorija je kreirana!', 'success');
    }

    cancelEdit();
    onRefresh();
  };

  const handleDelete = (id: number) => {
    if (categories.length <= 1) {
      showToast('Mora postojati bar jedna aktivna kategorija!', 'error');
      return;
    }
    const success = StorageService.deleteCategory(id);
    if (success) {
      showToast('Kategorija je obrisana.', 'success');
      onRefresh();
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
          Upravljanje Kategorijama
        </h1>
        <p className="text-xs text-[#a1a1a1]">
          Kreirajte i uređujte rubrike sajta, prilagođene boje i opise za SEO.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column - 5 cols */}
        <div className="lg:col-span-5 bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
              {editingCategory ? 'Izmena Kategorije' : 'Nova Kategorija'}
            </h3>
            {editingCategory && (
              <button
                onClick={cancelEdit}
                className="text-xs text-[#71717a] hover:text-white"
              >
                Otkaži
              </button>
            )}
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                Naziv kategorije *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (!editingCategory) {
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
                placeholder="npr. VR Gejming"
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
                placeholder="vr-gejming"
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-[#22d3ee] font-mono focus:outline-none focus:border-[#a855f7]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                Akcentna boja
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

            <div>
              <label className="block text-xs font-semibold text-[#a1a1a1] mb-1">
                Kratak opis (SEO)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Opis koji se prikazuje na vrhu rubrike..."
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#a855f7]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md"
            >
              {editingCategory ? 'Ažuriraj kategoriju' : 'Kreiraj kategoriju'}
            </button>
          </form>
        </div>

        {/* List Column - 7 cols */}
        <div className="lg:col-span-7 bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
          <div className="p-4 bg-[#1c1c1c] border-b border-[#262626] flex items-center justify-between">
            <span className="font-bold text-xs uppercase tracking-wider text-white">
              Sve aktivne kategorije ({categories.length})
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
                    onClick={() => startEdit(cat)}
                    className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#262626] text-[#22d3ee] transition-colors"
                    title="Izmeni"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
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
    </div>
  );
};
