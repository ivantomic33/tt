import React, { useState } from 'react';
import { Tag as TagIcon, Plus, Trash2 } from 'lucide-react';
import { Tag } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../components/ui/Toast';

interface AdminTagsViewProps {
  tags: Tag[];
  onRefresh: () => void;
}

export const AdminTagsView: React.FC<AdminTagsViewProps> = ({ tags, onRefresh }) => {
  const { showToast } = useToast();
  const [tagName, setTagName] = useState('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) return;
    StorageService.createTag(tagName.trim());
    setTagName('');
    showToast('Novi tag je dodat.', 'success');
    onRefresh();
  };

  const handleDeleteTag = (id: number) => {
    StorageService.deleteTag(id);
    showToast('Tag je uklonjen.', 'info');
    onRefresh();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
          Upravljanje Tagovima
        </h1>
        <p className="text-xs text-[#a1a1a1]">
          Tagovi pomažu posetiocima da pronađu srodne teme i poboljšavaju internu pretragu.
        </p>
      </div>

      {/* Add Tag Bar */}
      <form
        onSubmit={handleAddTag}
        className="p-4 rounded-xl bg-[#141414] border border-[#262626] flex items-center gap-3"
      >
        <div className="relative flex-1">
          <TagIcon className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            required
            value={tagName}
            onChange={e => setTagName(e.target.value)}
            placeholder="Unesite naziv novog taga (npr. Ray Tracing, Souls-like)..."
            className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg pl-10 pr-3 py-2 text-xs text-white placeholder:text-[#71717a] focus:outline-none focus:border-[#a855f7]"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dodaj Tag</span>
        </button>
      </form>

      {/* Tags Grid / Badges */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6">
        <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white mb-4">
          Aktivni Tagovi ({tags.length})
        </h3>

        <div className="flex flex-wrap gap-2.5">
          {tags.map(tag => (
            <div
              key={tag.id}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1c1c1c] border border-[#262626] hover:border-[#a855f7] text-xs transition-colors"
            >
              <span className="font-medium text-white">#{tag.name}</span>
              <span className="text-[10px] text-[#71717a] font-mono">/{tag.slug}</span>
              <button
                type="button"
                onClick={() => handleDeleteTag(tag.id)}
                className="text-[#71717a] hover:text-[#ef4444] transition-colors p-0.5 ml-1"
                title="Obriši tag"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
