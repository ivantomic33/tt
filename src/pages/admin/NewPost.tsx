import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Check,
  AlertCircle,
  Loader2,
  X,
  Eye,
  Edit3,
  Heading1,
  Heading2,
  Bold,
  Italic,
  Quote,
  List,
  Code,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { StorageService } from '../../services/storage';
import { CmsClient } from '../../services/cmsClient';

// Helper funkcija za kreiranje slug-a
export function createSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
}

export const NewPost: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');

  // UI & Loading States - inicijalizacija sa lokalnim kategorijama radi instant učitavanja bez čekanja
  const initialLocalCats = StorageService.getCategories();
  const fallbackCats: CategoryOption[] = initialLocalCats.length > 0
    ? initialLocalCats
    : [
        { id: 1, name: 'PC Gaming', slug: 'pc' },
        { id: 2, name: 'PlayStation', slug: 'playstation' },
        { id: 3, name: 'Xbox', slug: 'xbox' },
        { id: 4, name: 'Nintendo', slug: 'nintendo' },
        { id: 5, name: 'Esports', slug: 'esports' },
        { id: 6, name: 'Recenzije', slug: 'recenzije' },
      ];

  const [categories, setCategories] = useState<CategoryOption[]>(fallbackCats);
  const [categoryId, setCategoryId] = useState<number | ''>(fallbackCats[0]?.id || 1);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI Generator Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [aiTone, setAiTone] = useState<'hype' | 'analytical' | 'breaking'>('hype');
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  // 1. Asinhrono ažuriranje kategorija iz Supabase-a u pozadini bez blokiranja prikaza
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name, slug')
          .order('name', { ascending: true });

        if (!error && data && data.length > 0) {
          setCategories(data);
          if (!categoryId) {
            setCategoryId(data[0].id);
          }
        }
      } catch (err) {
        console.warn('Asinhrono dohvatanje kategorija iz Supabase-a:', err);
      }
    };

    fetchCategories();
  }, [categoryId]);

  // Automatsko ažuriranje sluga dok korisnik nije ručno menjao polje
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    if (!isSlugManuallyEdited) {
      setSlug(createSlug(val));
    }
    if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(createSlug(e.target.value));
    if (errors.slug) setErrors(prev => ({ ...prev, slug: '' }));
  };

  // Upload slike u Supabase Storage bucket 'covers'
  const handleImageUpload = async (file: File) => {
    // Validacija formata i veličine (max 5MB)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      showToast('Dozvoljeni su formati: JPG, PNG, WEBP ili GIF.', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Maksimalna dozvoljena veličina slike je 5MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `covers/${Date.now()}_${cleanFileName}.${fileExt}`;

      // Upload u Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // Ako bucket ne postoji ili nema prava, čuvamo sliku kao base64 data-URL za preview
        console.warn('Storage upload upozorenje:', uploadError.message);
        const reader = new FileReader();
        reader.onloadend = () => {
          setCoverImageUrl(reader.result as string);
          showToast('Slika sačuvana lokalno (proverite RLS na covers bucket-u).', 'info');
        };
        reader.readAsDataURL(file);
        return;
      }

      // Preuzimanje javnog URL-a
      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(data.path);
      if (urlData?.publicUrl) {
        setCoverImageUrl(urlData.publicUrl);
        showToast('Cover slika je uspešno otpremljena!', 'success');
        if (errors.cover) setErrors(prev => ({ ...prev, cover: '' }));
      }
    } catch (err: any) {
      console.error('Greška pri upload-u slike:', err);
      showToast('Došlo je do greške pri upload-u slike.', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageUpload(e.dataTransfer.files[0]);
    }
  };

  // Ubacivanje Markdown/HTML tagova u editor
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || 'tekst'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 5));
    }, 10);
  };

  // Validacija forme
  const validateForm = (targetStatus: 'draft' | 'published'): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 5) {
      newErrors.title = 'Naslov mora imati najmanje 5 karaktera.';
    }

    const currentSlug = slug || createSlug(title);
    if (!currentSlug) {
      newErrors.slug = 'Slug je obavezan.';
    }

    if (!excerpt.trim() || excerpt.trim().length < 20) {
      newErrors.excerpt = 'Kratak opis (excerpt) mora imati najmanje 20 karaktera.';
    }

    if (!content.trim() || content.trim().length < 20) {
      newErrors.content = 'Sadržaj vesti mora imati najmanje 20 karaktera.';
    }

    if (!categoryId) {
      newErrors.category = 'Izaberite kategoriju za vest.';
    }

    if (targetStatus === 'published' && !coverImageUrl) {
      newErrors.cover = 'Objavljena vest mora imati cover sliku.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // AI Nacrt Generator Handler
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
      if (draft.cover_image) setCoverImageUrl(draft.cover_image);
      if (draft.tags && draft.tags.length > 0) setTagsInput(draft.tags.join(', '));
      setIsAiGenerating(false);
      setShowAiModal(false);
      showToast('AI nacrt je uspešno generisan i popunjen u formi!', 'success');
    }, 500);
  };

  // Slanje forme u StorageService i Supabase bazu
  const handleSubmit = async (targetStatus: 'draft' | 'published') => {
    setStatus(targetStatus);
    if (!validateForm(targetStatus)) {
      showToast('Molimo ispravite greške u formi pre čuvanja.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const finalSlug = (slug || createSlug(title)).trim();
      const nowIso = new Date().toISOString();

      // Procena vremena čitanja
      const wordCount = content.trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const selectedCategoryObj = categories.find(c => c.id === Number(categoryId)) || categories[0] || {
        id: 1,
        name: 'PC Gaming',
        slug: 'pc',
      };

      // 1. Sačuvaj u StorageService (localStorage) za trenutnu dostupnost u app stanju
      const rawTags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const resolvedTags = rawTags.map(tagName => StorageService.createTag(tagName));

      StorageService.createPost({
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        cover_image: coverImageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        category_id: Number(categoryId),
        category: {
          id: Number(categoryId),
          name: selectedCategoryObj.name,
          slug: selectedCategoryObj.slug,
          color: '#a855f7',
        },
        author: {
          id: 'usr_admin_1',
          name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Ivan Tomić',
          role: 'Glavni Urednik',
          avatar: user?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        },
        status: targetStatus,
        reading_time: readingTime,
        featured: false,
        tags: resolvedTags,
        published_at: targetStatus === 'published' ? nowIso : '',
      });

      // 2. Sinhronizacija u bazu preko autentifikovanog CMS API-ja (service_role na serveru).
      CmsClient.upsertPost({
        title: title.trim(),
        slug: finalSlug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        cover_image:
          coverImageUrl ||
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
        category_id: Number(categoryId),
        author_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Nexus Urednik',
        author_role: 'Glavni Urednik',
        author_avatar:
          user?.user_metadata?.avatar_url ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        status: targetStatus,
        reading_time: readingTime,
        views: 0,
        likes: 0,
        featured: false,
        published_at: targetStatus === 'published' ? nowIso : null,
        tags: rawTags,
      });

      showToast(
        targetStatus === 'published'
          ? 'Nova vest / tema je uspešno objavljena na portalu!'
          : 'Nova vest / tema je sačuvana kao draft.',
        'success'
      );

      navigate('/admin/vesti');
    } catch (err: any) {
      console.error('Greška pri kreiranju vesti:', err);
      showToast(err?.message || 'Greška pri čuvanju vesti.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] pb-24 font-['Inter',sans-serif]">
      {/* Top Header */}
      <div className="sticky top-0 z-30 bg-[#0e0e0e]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/vesti"
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <ArrowLeft size={16} />
            <span>Nazad na vesti</span>
          </Link>
          <div className="h-4 w-px bg-white/10 hidden sm:block" />
          <h1 className="text-sm sm:text-base font-bold text-white tracking-wide">
            Nova Vest <span className="text-[#a855f7]">Editor</span>
          </h1>
        </div>

        {/* Dugmad za akciju u vrhu */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-purple-600/40 to-cyan-500/40 hover:from-purple-600/60 hover:to-cyan-500/60 border border-purple-500/50 rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={14} className="text-cyan-400" />
            <span>AI Nacrt</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('draft')}
            className="px-3.5 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all cursor-pointer disabled:opacity-50"
          >
            Sačuvaj kao draft
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('published')}
            className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg transition-all shadow-lg shadow-purple-900/30 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Čuvanje...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Objavi</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Glavni Layout Forme */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEVI DEO: Glavni tekstualni sadržaj (2 kolone) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Naslov vesti */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Naslov Vesti <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Unesite upečatljiv naslov vesti..."
                className={`w-full bg-[#0d0d0d] text-white text-base sm:text-lg font-bold rounded-lg px-4 py-3 border transition-colors focus:outline-none placeholder:text-zinc-600 ${
                  errors.title
                    ? 'border-red-500/80 focus:border-red-500'
                    : 'border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                }`}
              />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}

              {/* Slug polje */}
              <div className="pt-2 flex items-center gap-2 text-xs text-zinc-400">
                <span className="shrink-0 text-zinc-500 font-mono">/post/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="automatski-generisani-slug"
                  className="flex-1 bg-[#090909] text-purple-300 font-mono text-xs rounded px-2.5 py-1.5 border border-white/5 focus:border-purple-500 focus:outline-none"
                />
              </div>
              {errors.slug && <p className="text-xs text-red-400">{errors.slug}</p>}
            </div>

            {/* Kratak opis (Excerpt) sa brojačem */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Kratak opis (Excerpt) <span className="text-red-400">*</span>
                </label>
                <span
                  className={`text-xs font-mono ${
                    excerpt.length > 200 ? 'text-red-400 font-bold' : 'text-zinc-500'
                  }`}
                >
                  {excerpt.length} / 200
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={200}
                value={excerpt}
                onChange={e => {
                  setExcerpt(e.target.value);
                  if (errors.excerpt) setErrors(prev => ({ ...prev, excerpt: '' }));
                }}
                placeholder="Kratak sažetak vesti za kartice i društvene mreže (20 - 200 karaktera)..."
                className={`w-full bg-[#0d0d0d] text-white text-sm rounded-lg p-3.5 border transition-colors focus:outline-none resize-none placeholder:text-zinc-600 ${
                  errors.excerpt
                    ? 'border-red-500/80 focus:border-red-500'
                    : 'border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                }`}
              />
              {errors.excerpt && <p className="text-xs text-red-400">{errors.excerpt}</p>}
            </div>

            {/* Rich Content Editor */}
            <div className="bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-sm">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5 bg-[#181818]">
                <div className="flex items-center gap-1 overflow-x-auto py-1">
                  <button
                    type="button"
                    onClick={() => insertFormatting('<h2>', '</h2>')}
                    title="Podnaslov H2"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Heading1 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<h3>', '</h3>')}
                    title="Podnaslov H3"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Heading2 size={15} />
                  </button>
                  <div className="h-4 w-px bg-white/10 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('<strong>', '</strong>')}
                    title="Podebljano"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    title="Kurziv"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<blockquote>', '</blockquote>')}
                    title="Citat"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Quote size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                    title="Lista"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <List size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<a href="https://...">', '</a>')}
                    title="Link"
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <LinkIcon size={15} />
                  </button>
                </div>

                {/* Tabovi: Pisanje / Pregled */}
                <div className="flex items-center gap-1 bg-[#0d0d0d] p-0.5 rounded-lg border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditorTab('write')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      editorTab === 'write'
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Pisanje
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('preview')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                      editorTab === 'preview'
                        ? 'bg-purple-600 text-white'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Pregled</span>
                  </button>
                </div>
              </div>

              {/* Polje editora ili Preview */}
              <div className="p-4">
                {editorTab === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    rows={15}
                    value={content}
                    onChange={e => {
                      setContent(e.target.value);
                      if (errors.content) setErrors(prev => ({ ...prev, content: '' }));
                    }}
                    placeholder="Unesite kompletan tekst vesti. Možete koristiti HTML tagove poput <h2>, <p>, <blockquote>, <ul>, <li>..."
                    className="w-full bg-[#0d0d0d] text-white text-sm font-mono leading-relaxed p-4 rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none resize-y min-h-[320px]"
                  />
                ) : (
                  <div
                    className="prose prose-invert max-w-none min-h-[320px] p-4 bg-[#0d0d0d] rounded-lg border border-white/10 text-zinc-200 text-sm leading-relaxed overflow-y-auto"
                    dangerouslySetInnerHTML={{
                      __html: content || '<p class="text-zinc-500 italic">Ovde će biti prikazan formatiran tekst vesti...</p>',
                    }}
                  />
                )}
                {errors.content && <p className="text-xs text-red-400 mt-2">{errors.content}</p>}
              </div>
            </div>

          </div>

          {/* DESNI DEO: Meta opcije, Cover slika, Kategorije i Status (1 kolona) */}
          <div className="space-y-6">
            
            {/* Status Objavljivanja */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Status Vesti
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus('published')}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    status === 'published'
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                      : 'bg-[#0d0d0d] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Objavljeno</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    status === 'draft'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                      : 'bg-[#0d0d0d] border-white/10 text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Draft (Nacrt)</span>
                </button>
              </div>
            </div>

            {/* Cover Slika Upload */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Naslovna (Cover) Slika <span className="text-red-400">*</span>
              </label>

              {coverImageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-white/10 group aspect-video bg-black">
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-medium cursor-pointer"
                    >
                      Zameni
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl('')}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer"
                      title="Ukloni sliku"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={e => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                    isDragOver
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-white/10 hover:border-purple-500/50 hover:bg-white/[0.02]'
                  }`}
                >
                  {isUploadingImage ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Loader2 size={24} className="text-purple-400 animate-spin" />
                      <p className="text-xs text-zinc-400">Otpremanje slike u bazu...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600/20 text-purple-400 flex items-center justify-center">
                        <Upload size={18} />
                      </div>
                      <p className="text-xs font-medium text-white">
                        Prevucite sliku ovde ili <span className="text-purple-400">kliknite</span>
                      </p>
                      <p className="text-[11px] text-zinc-500">JPG, PNG, WEBP (maks. 5MB)</p>
                    </div>
                  )}
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageUpload(e.target.files[0]);
                  }
                }}
              />

              {/* Ili direktan unos URL-a */}
              <div className="pt-2">
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={customUrlInput}
                    onChange={e => setCustomUrlInput(e.target.value)}
                    placeholder="Ili zalepite URL slike..."
                    className="flex-1 bg-[#0d0d0d] text-white text-xs rounded px-3 py-2 border border-white/10 focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customUrlInput.trim()) {
                        setCoverImageUrl(customUrlInput.trim());
                        setCustomUrlInput('');
                        if (errors.cover) setErrors(prev => ({ ...prev, cover: '' }));
                      }
                    }}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-xs rounded font-medium border border-white/10 cursor-pointer"
                  >
                    Postavi
                  </button>
                </div>
              </div>

              {errors.cover && <p className="text-xs text-red-400">{errors.cover}</p>}
            </div>

            {/* Kategorija */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Kategorija <span className="text-red-400">*</span>
              </label>
              {isLoadingCategories ? (
                <div className="h-10 bg-[#0d0d0d] animate-pulse rounded-lg border border-white/10" />
              ) : (
                <select
                  value={categoryId}
                  onChange={e => {
                    setCategoryId(Number(e.target.value));
                    if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
                  }}
                  className="w-full bg-[#0d0d0d] text-white text-sm rounded-lg px-3.5 py-2.5 border border-white/10 focus:border-purple-500 focus:outline-none cursor-pointer"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.category && <p className="text-xs text-red-400">{errors.category}</p>}
            </div>

            {/* Tagovi */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Tagovi (odvojeni zarezom)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                placeholder="RPG, Unreal Engine 5, GTA VI, PC..."
                className="w-full bg-[#0d0d0d] text-white text-sm rounded-lg px-3.5 py-2.5 border border-white/10 focus:border-purple-500 focus:outline-none placeholder:text-zinc-600"
              />
              <p className="text-[11px] text-zinc-500">
                Primer: <span className="text-zinc-400">PlayStation 5, Ray Tracing, Open World</span>
              </p>
            </div>

          </div>

        </div>
      </div>

      {/* AI Assistant Modal */}
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
                type="button"
                onClick={() => setShowAiModal(false)}
                className="text-[#71717a] hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#a1a1a1] leading-relaxed">
              Unesite naslov, temu ili sažetak (npr. &quot;Najava novog Witchera u Unreal Engine 5&quot;). AI asistent će pripremiti kompletan strukturiran članak sa podnaslovima, citatima i tagovima.
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
                className="flex items-center gap-2 px-5 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-lg cursor-pointer"
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

export default NewPost;
