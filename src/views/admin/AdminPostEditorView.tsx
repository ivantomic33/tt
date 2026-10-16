import React, { useState, useEffect } from 'react';
import {
  Save,
  ArrowLeft,
  Sparkles,
  Eye,
  Edit3,
  Image as ImageIcon,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  List,
  Code,
  Tag as TagIcon,
  CheckCircle2,
  Clock,
  Flame,
} from 'lucide-react';
import { Post, Category, Tag } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../components/ui/Toast';
import { GameImage } from '../../components/ui/GameImage';

interface AdminPostEditorViewProps {
  editPostId?: number;
  categories: Category[];
  tags: Tag[];
  onNavigateBack: () => void;
  onPostSaved: () => void;
}

export const AdminPostEditorView: React.FC<AdminPostEditorViewProps> = ({
  editPostId,
  categories,
  tags: initialTags,
  onNavigateBack,
  onPostSaved,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<'hype' | 'analytical' | 'breaking'>('hype');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [readingTime, setReadingTime] = useState(4);
  const [featured, setFeatured] = useState(false);

  // Available Presets for Cover Images
  const presetImages = [
    { label: 'GTA 6 / Vice City', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Cyberpunk 2077', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80' },
    { label: 'PlayStation / Kontroler', url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Esports Arena', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Fantasy RPG / Elden Ring', url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Nintendo Switch', url: 'https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=1200&q=80' },
    { label: 'Nvidia RTX Hardver', url: 'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80' },
  ];

  // Load existing post if editing
  useEffect(() => {
    if (editPostId) {
      const existing = StorageService.getPostById(editPostId);
      if (existing) {
        setTitle(existing.title);
        setSlug(existing.slug);
        setExcerpt(existing.excerpt);
        setContent(existing.content);
        setCoverImage(existing.cover_image);
        setCategoryId(existing.category_id);
        setSelectedTagNames(existing.tags.map(t => t.name));
        setStatus(existing.status);
        setReadingTime(existing.reading_time || 4);
        setFeatured(Boolean(existing.featured));
      }
    } else {
      // Default initial cover image
      setCoverImage(presetImages[0].url);
    }
  }, [editPostId]);

  // Auto-slugify when title changes and slug hasn't been manually diverged
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editPostId) {
      const generated = val
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  // Content formatting toolbar helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('post-content-area') as HTMLTextAreaElement;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || 'Tekst'}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected ? selected.length : 5));
    }, 50);
  };

  const handleAddTag = () => {
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim();
    if (!selectedTagNames.includes(clean)) {
      setSelectedTagNames([...selectedTagNames, clean]);
      StorageService.createTag(clean);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagName: string) => {
    setSelectedTagNames(selectedTagNames.filter(t => t !== tagName));
  };

  // AI Generator Execution (Faza 7)
  const handleRunAiGenerator = () => {
    if (!aiTopic.trim()) {
      showToast('Molimo unesite temu za članak.', 'error');
      return;
    }
    setIsAiGenerating(true);
    setTimeout(() => {
      const draft = StorageService.generateAIDraft(aiTopic, aiTone);
      setTitle(draft.title);
      setSlug(draft.slug);
      setExcerpt(draft.excerpt);
      setContent(draft.content);
      setCoverImage(draft.cover_image);
      setSelectedTagNames(draft.tags);
      setIsAiGenerating(false);
      setShowAiModal(false);
      showToast('AI nacrt je uspešno generisan i popunjen u formi!', 'success');
    }, 600);
  };

  // Save / Publish
  const handleSave = (forcedStatus?: 'draft' | 'published') => {
    if (!title.trim()) {
      showToast('Naslov vesti je obavezan!', 'error');
      return;
    }
    if (!content.trim()) {
      showToast('Sadržaj vesti ne može biti prazan!', 'error');
      return;
    }

    const currentCat = categories.find(c => c.id === Number(categoryId)) || categories[0];
    const targetStatus = forcedStatus || status;

    // Convert selected tags to Tag objects
    const allTags = StorageService.getTags();
    const resolvedTags: Tag[] = selectedTagNames.map(name => {
      const existing = allTags.find(t => t.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;
      return StorageService.createTag(name);
    });

    const defaultAuthor = {
      id: 'usr_admin_1',
      name: 'Ivan Tomić',
      role: 'Glavni Urednik',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    };

    if (editPostId) {
      StorageService.updatePost(editPostId, {
        title,
        slug: slug.trim() || `vest-${Date.now()}`,
        excerpt: excerpt.trim() || title.substring(0, 160),
        content,
        cover_image: coverImage.trim() || presetImages[0].url,
        category_id: currentCat.id,
        category: currentCat,
        tags: resolvedTags,
        status: targetStatus,
        reading_time: Number(readingTime) || 4,
        featured,
      });
      showToast('Članak je uspešno ažuriran!', 'success');
    } else {
      StorageService.createPost({
        title,
        slug: slug.trim() || `vest-${Date.now()}`,
        excerpt: excerpt.trim() || title.substring(0, 160),
        content,
        cover_image: coverImage.trim() || presetImages[0].url,
        category_id: currentCat.id,
        category: currentCat,
        author: defaultAuthor,
        status: targetStatus,
        reading_time: Number(readingTime) || 4,
        featured,
        tags: resolvedTags,
        published_at: targetStatus === 'published' ? new Date().toISOString() : '',
      });
      showToast(
        targetStatus === 'published' ? 'Vest je uspešno objavljena na portalu!' : 'Nacrt je uspešno sačuvan!',
        'success'
      );
    }

    onPostSaved();
  };

  const selectedCategoryObj = categories.find(c => c.id === Number(categoryId)) || categories[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
        <div className="flex items-center gap-3">
          <button
            onClick={onNavigateBack}
            className="p-2 rounded-lg bg-[#141414] hover:bg-[#1f1f1f] border border-[#262626] text-[#a1a1a1] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold uppercase tracking-wider text-white">
              {editPostId ? 'Izmena Vesti' : 'Nova Gaming Vest'}
            </h1>
            <p className="text-xs text-[#a1a1a1]">
              Unesite podatke, formatirajte sadržaj ili iskoristite AI pomoćnika.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Drafting Modal Trigger */}
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#a855f7]/30 to-[#22d3ee]/30 hover:from-[#a855f7]/50 hover:to-[#22d3ee]/50 border border-[#a855f7]/50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-all shadow-md"
          >
            <Sparkles className="w-4 h-4 text-[#22d3ee]" />
            <span>AI Nacrt</span>
          </button>

          {/* Tab Switcher: Editor vs Live Preview */}
          <div className="flex items-center p-1 bg-[#141414] border border-[#262626] rounded-lg text-xs">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeTab === 'editor' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Uređivač</span>
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                activeTab === 'preview' ? 'bg-[#a855f7] text-white font-semibold' : 'text-[#a1a1a1] hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pregled</span>
            </button>
          </div>

          {/* Action buttons */}
          <button
            onClick={() => handleSave('draft')}
            className="px-3.5 py-2 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs font-semibold text-[#a1a1a1] hover:text-white rounded-lg transition-colors"
          >
            Sačuvaj draft
          </button>
          <button
            onClick={() => handleSave('published')}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{editPostId ? 'Sačuvaj izmene' : 'Objavi odmah'}</span>
          </button>
        </div>
      </div>

      {activeTab === 'preview' ? (
        /* Live Preview Mode */
        <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-10 space-y-6">
          <div className="flex items-center gap-2">
            <span
              style={{ backgroundColor: `${selectedCategoryObj.color}20`, color: selectedCategoryObj.color }}
              className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md border border-white/10"
            >
              {selectedCategoryObj.name}
            </span>
            <span className="text-xs text-[#71717a]">· Pregled uživo</span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
            {title || 'Naslov članka'}
          </h1>

          <p className="text-base text-[#d4d4d8] leading-relaxed">
            {excerpt || 'Kratak uvodni opis vesti...'}
          </p>

          <div className="aspect-[16/9] rounded-xl overflow-hidden border border-[#262626]">
            <GameImage src={coverImage} alt={title || 'Cover'} aspectRatio="16/9" />
          </div>

          <div
            dangerouslySetInnerHTML={{ __html: content || '<p>Sadržaj članka...</p>' }}
            className="prose prose-invert max-w-none text-[#d4d4d8] space-y-4 [&>h2]:text-2xl [&>h2]:font-bold [&>h2]:text-white [&>blockquote]:border-l-4 [&>blockquote]:border-[#a855f7] [&>blockquote]:p-4 [&>blockquote]:bg-[#1c1c1c] [&>blockquote]:rounded-r-lg"
          />
        </div>
      ) : (
        /* Edit Form Mode */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Title */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#a1a1a1]">
                Naslov Vesti *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => handleTitleChange(e.target.value)}
                placeholder="Unesite naslov članka..."
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3.5 py-2.5 text-base text-white focus:outline-none focus:border-[#a855f7]"
              />

              {/* Slug */}
              <div className="flex items-center gap-2 pt-1 text-xs text-[#71717a]">
                <span>Slug: /vest/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="flex-1 bg-[#1c1c1c] border border-[#262626] rounded px-2 py-0.5 text-xs text-[#22d3ee] font-mono focus:outline-none focus:border-[#a855f7]"
                />
              </div>
            </div>

            {/* Excerpt */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a1a1a1]">
                  Kratak Opis (Excerpt)
                </label>
                <span className="text-[11px] text-[#71717a] font-mono">
                  {excerpt.length}/240 karaktera
                </span>
              </div>
              <textarea
                rows={2}
                maxLength={240}
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                placeholder="Sažetak od 2-3 rečenice koji se prikazuje na kartici vesti..."
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-[#a855f7]"
              />
            </div>

            {/* Content with Rich Text Toolbar */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#a1a1a1]">
                  Sadržaj Članka *
                </label>
                <span className="text-[11px] text-[#71717a]">
                  HTML / Tekstualni editor
                </span>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-[#1c1c1c] border border-[#262626] rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => insertFormatting('<h2>', '</h2>')}
                  title="Podnaslov H2"
                  className="p-1.5 rounded hover:bg-[#262626] text-[#a1a1a1] hover:text-white"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<h3>', '</h3>')}
                  title="Podnaslov H3"
                  className="p-1.5 rounded hover:bg-[#262626] text-[#a1a1a1] hover:text-white"
                >
                  <Heading3 className="w-4 h-4" />
                </button>
                <span className="w-px h-4 bg-[#3f3f46] mx-1" />
                <button
                  type="button"
                  onClick={() => insertFormatting('<strong>', '</strong>')}
                  title="Podebljano (Bold)"
                  className="p-1.5 rounded hover:bg-[#262626] text-[#a1a1a1] hover:text-white"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<em>', '</em>')}
                  title="Kurziv (Italic)"
                  className="p-1.5 rounded hover:bg-[#262626] text-[#a1a1a1] hover:text-white"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <span className="w-px h-4 bg-[#3f3f46] mx-1" />
                <button
                  type="button"
                  onClick={() => insertFormatting('<blockquote>"', '"</blockquote>')}
                  title="Citat (Quote)"
                  className="p-1.5 rounded hover:bg-[#262626] text-[#a1a1a1] hover:text-white"
                >
                  <Quote className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<ul>\n<li>', '</li>\n<li>Stavka 2</li>\n</ul>')}
                  title="Lista"
                  className="p-1.5 rounded hover:bg-[#262626] text-[#a1a1a1] hover:text-white"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<code>', '</code>')}
                  title="Kod"
                  className="p-1.5 rounded hover:bg-[#262626] text-[#a1a1a1] hover:text-white"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('<p>', '</p>')}
                  title="Pasus"
                  className="px-2 py-1 rounded hover:bg-[#262626] text-[#a1a1a1] hover:text-white font-mono text-[11px]"
                >
                  &lt;p&gt;
                </button>
              </div>

              {/* Textarea */}
              <textarea
                id="post-content-area"
                rows={14}
                required
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Napišite tekst vesti ovde (podržava HTML oznake kao što su <h2>, <p>, <blockquote>, <ul>)..."
                className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-3.5 text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-[#a855f7]"
              />
            </div>
          </div>

          {/* Sidebar Settings (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Publication Settings */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Objavljivanje
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  Status članka
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('published')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      status === 'published'
                        ? 'bg-[#22c55e]/20 border-[#22c55e] text-[#22c55e]'
                        : 'bg-[#1c1c1c] border-[#262626] text-[#a1a1a1]'
                    }`}
                  >
                    Objavljeno
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('draft')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      status === 'draft'
                        ? 'bg-[#eab308]/20 border-[#eab308] text-[#eab308]'
                        : 'bg-[#1c1c1c] border-[#262626] text-[#a1a1a1]'
                    }`}
                  >
                    Draft
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  Kategorija
                </label>
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(Number(e.target.value))}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  Vreme čitanja (minuta)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={readingTime}
                  onChange={e => setReadingTime(Number(e.target.value))}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-[#d4d4d8]">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={e => setFeatured(e.target.checked)}
                    className="rounded border-[#262626] text-[#a855f7] focus:ring-0"
                  />
                  <span>Postavi kao Izdvojenu (Hero) vest</span>
                </label>
              </div>
            </div>

            {/* Cover Image Selector */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-4">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Cover Slika
              </h3>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  URL Slike
                </label>
                <input
                  type="url"
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              {/* Preview Thumbnail */}
              <div className="aspect-[16/9] rounded-lg overflow-hidden border border-[#262626]">
                <GameImage src={coverImage} alt="Cover preview" aspectRatio="16/9" />
              </div>

              {/* Quick Preset Selector */}
              <div>
                <span className="text-[11px] font-semibold text-[#71717a] block mb-2">
                  Brzi odabir gaming pozadine:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {presetImages.map(p => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setCoverImage(p.url)}
                      className={`px-2 py-1.5 rounded text-[10px] text-left truncate transition-colors ${
                        coverImage === p.url
                          ? 'bg-[#a855f7]/20 border border-[#a855f7] text-[#a855f7]'
                          : 'bg-[#1c1c1c] hover:bg-[#262626] text-[#a1a1a1]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tags Box */}
            <div className="bg-[#141414] border border-[#262626] rounded-xl p-5 space-y-3">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-white">
                Tagovi
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={e => setNewTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Dodaj tag (npr. RPG)..."
                  className="flex-1 bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#a855f7]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-semibold rounded-lg"
                >
                  Dodaj
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedTagNames.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1c1c1c] border border-[#262626] text-xs text-[#d4d4d8]"
                  >
                    <span>#{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-[#71717a] hover:text-[#ef4444]"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal (Faza 7 from spec) */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in">
          <div className="bg-[#141414] border border-[#262626] rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
              <div className="flex items-center gap-2 text-[#a855f7]">
                <Sparkles className="w-5 h-5 text-[#22d3ee]" />
                <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
                  AI Generator Gaming Vesti
                </h3>
              </div>
              <button
                onClick={() => setShowAiModal(false)}
                className="text-[#71717a] hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#a1a1a1] leading-relaxed">
              Unesite naslov, temu ili sažetak (npr. "Najava novog Witchera u Unreal Engine 5"). AI asistent će pripremiti kompletan strukturiran članak sa podnaslovima, citatima i tagovima.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  Tema ili izvor vesti *
                </label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="npr. Half-Life 3 glasine i novi Valve patenti"
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a855f7]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
                  Ton članka
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setAiTone('hype')}
                    className={`py-2 rounded-lg border font-medium transition-colors ${
                      aiTone === 'hype'
                        ? 'bg-[#a855f7]/20 border-[#a855f7] text-[#a855f7]'
                        : 'bg-[#1c1c1c] border-[#262626] text-[#a1a1a1]'
                    }`}
                  >
                    🔥 Hype
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiTone('analytical')}
                    className={`py-2 rounded-lg border font-medium transition-colors ${
                      aiTone === 'analytical'
                        ? 'bg-[#22d3ee]/20 border-[#22d3ee] text-[#22d3ee]'
                        : 'bg-[#1c1c1c] border-[#262626] text-[#a1a1a1]'
                    }`}
                  >
                    📊 Analitički
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiTone('breaking')}
                    className={`py-2 rounded-lg border font-medium transition-colors ${
                      aiTone === 'breaking'
                        ? 'bg-[#ef4444]/20 border-[#ef4444] text-[#ef4444]'
                        : 'bg-[#1c1c1c] border-[#262626] text-[#a1a1a1]'
                    }`}
                  >
                    ⚡ Breaking
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#262626]">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] text-[#a1a1a1] text-xs font-semibold rounded-lg"
              >
                Otkaži
              </button>
              <button
                type="button"
                disabled={isAiGenerating}
                onClick={handleRunAiGenerator}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg"
              >
                {isAiGenerating ? (
                  <span>Generišem nacrt...</span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generiši nacrt vesti</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
