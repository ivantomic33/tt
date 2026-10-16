import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart3, Tag as TagIcon, Sparkles, MessageSquare, Send } from 'lucide-react';
import { ForumSubforumId, ForumThread } from '../../types';
import { FORUM_SUBFORUMS, ForumService } from '../../services/forumService';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/Toast';

interface CreateThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onThreadCreated: (thread: ForumThread) => void;
  defaultSubforumId?: ForumSubforumId;
}

export const CreateThreadModal: React.FC<CreateThreadModalProps> = ({
  isOpen,
  onClose,
  onThreadCreated,
  defaultSubforumId = 'pc-gaming',
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [subforumId, setSubforumId] = useState<ForumSubforumId>(defaultSubforumId);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>(['PCGaming']);
  const [tagInput, setTagInput] = useState('');

  // Poll state
  const [hasPoll, setHasPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Opcija 1', 'Opcija 2']);

  const [authorName, setAuthorName] = useState(
    user?.user_metadata?.full_name || (user?.email ? user.email.split('@')[0] : 'Gamer_2026')
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const popularTags = [
    'PCGaming',
    'PlayStation',
    'Xbox',
    'Switch',
    'CS2',
    'Valorant',
    'EldenRing',
    'Hardware',
    'LFG',
    'Recenzija',
    'Optimizacija',
  ];

  const handleAddTag = (tagToAdd?: string) => {
    const raw = tagToAdd || tagInput;
    const clean = raw.replace('#', '').trim();
    if (!clean) return;
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    if (!tagToAdd) setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, `Opcija ${pollOptions.length + 1}`]);
    }
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const updated = [...pollOptions];
    updated[index] = val;
    setPollOptions(updated);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!title.trim()) {
      showToast('Molimo unesite naslov teme.', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('Sadržaj teme ne može biti prazan.', 'error');
      return;
    }

    if (hasPoll && (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2)) {
      showToast('Anketa mora imati pitanje i najmanje 2 popunjene opcije.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = ForumService.createThread({
        title: title.trim(),
        subforumId,
        content: content.trim(),
        tags,
        authorName: authorName.trim() || 'Član Foruma',
        authorRole: user?.role === 'admin' ? 'Admin' : 'Član',
        pollQuestion: hasPoll ? pollQuestion.trim() : undefined,
        pollOptions: hasPoll ? pollOptions.filter(o => o.trim()) : undefined,
      });

      showToast('Vaša diskusija je uspešno objavljena na forumu!', 'success');
      onThreadCreated(created);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Greška pri objavi teme.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#121217] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-5 p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold uppercase tracking-wider text-white">
                Nova Gaming Diskusija
              </h2>
              <p className="text-xs text-slate-400">
                Podelite vest, postavite pitanje, pronađite tim ili napravite anketu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subforum & Author */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kategorija / Potforum *
              </label>
              <select
                value={subforumId}
                onChange={e => setSubforumId(e.target.value as ForumSubforumId)}
                className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                {FORUM_SUBFORUMS.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Vaš Nadimak na Forumu *
              </label>
              <input
                type="text"
                required
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Naslov Teme *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="npr. Koji optimizacioni tweak vam je doneo najviše FPS-a?"
              className="w-full bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Igra i Tagovi (npr. #CS2, #Valorant, #Hardware)
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Unesite tag i pritisnite Enter..."
                className="flex-1 bg-[#181820] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                className="px-3 py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-semibold"
              >
                Dodaj
              </button>
            </div>

            {/* Selected Tags */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-500/30 text-xs text-purple-300"
                >
                  <span>#{t}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:text-red-400 text-purple-400 ml-1"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Popular Tags */}
            <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
              <span>Preporučeni:</span>
              {popularTags.slice(0, 6).map(pt => (
                <button
                  key={pt}
                  type="button"
                  onClick={() => handleAddTag(pt)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-purple-500/10 hover:text-purple-300 text-slate-400 transition-colors"
                >
                  #{pt}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Sadržaj / Poruka *
            </label>
            <textarea
              rows={5}
              required
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Napišite detaljan opis teme, postavite pitanje ili opišite vaš tim..."
              className="w-full bg-[#181820] border border-white/10 rounded-xl p-3.5 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500 leading-relaxed"
            />
          </div>

          {/* Poll Builder Section */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs sm:text-sm font-semibold text-slate-200">
                <input
                  type="checkbox"
                  checked={hasPoll}
                  onChange={e => setHasPoll(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 text-purple-600 focus:ring-0 bg-[#181820]"
                />
                <span className="flex items-center gap-1.5 text-purple-300">
                  <BarChart3 className="w-4 h-4" />
                  Priloži Anketu uz ovu temu
                </span>
              </label>
            </div>

            {hasPoll && (
              <div className="bg-[#181824] border border-purple-500/30 rounded-xl p-4 space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-[11px] font-semibold text-purple-300 mb-1">
                    Pitanje za anketu *
                  </label>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={e => setPollQuestion(e.target.value)}
                    placeholder="npr. Koju platformu najčešće koristite za igranje?"
                    className="w-full bg-[#121218] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-400">
                    Opcije za glasanje (2 do 6):
                  </label>
                  {pollOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-5 text-center text-xs font-mono text-slate-500">
                        {i + 1}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={e => handlePollOptionChange(i, e.target.value)}
                        placeholder={`Opcija ${i + 1}`}
                        className="flex-1 bg-[#121218] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(i)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-semibold pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Dodaj opciju</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Otkaži
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all cursor-pointer ${
                isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:from-purple-500 hover:to-indigo-500 transform hover:scale-105'
              }`}
            >
              <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
              <span>{isSubmitting ? 'Objavljivanje...' : 'Objavi Temu'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
