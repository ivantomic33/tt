import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Check,
  AlertCircle,
  Loader2,
  X,
  Eye,
  Trash2,
  AlertTriangle,
  Heading1,
  Heading2,
  Bold,
  Italic,
  Quote,
  List,
  Link as LinkIcon,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { createSlug } from './NewPost';
import { StorageService } from '../../services/storage';
import { CmsClient } from '../../services/cmsClient';

interface CategoryOption {
  id: number;
  name: string;
}

export const EditPost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('published');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');

  // UI States
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [isLoadingPost, setIsLoadingPost] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Brisanje modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 1. Učitavanje kategorija i postojećih podataka o vesti
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoadingPost(true);

        // Fetch kategorije
        const { data: catData } = await supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true });
        if (catData) setCategories(catData);

        if (!id) return;

        // 1. Preferirano: autentifikovani admin API (obuhvata i draftove + tagove).
        const apiPost = await CmsClient.getPost(Number(id));
        if (apiPost) {
          const post = apiPost as any;
          setTitle(post.title || '');
          setSlug(post.slug || '');
          setExcerpt(post.excerpt || '');
          setContent(post.content || '');
          setCategoryId(post.category_id || (catData && catData[0]?.id) || '');
          setStatus(post.status || 'published');
          setCoverImageUrl(post.cover_image || '');
          if (Array.isArray(post.tags)) {
            const tagNames = post.tags.map((t: any) => t?.name).filter(Boolean);
            setTagsInput(tagNames.join(', '));
          }
          return;
        }

        // 2. Fallback: anon čitanje (vidljivi su samo objavljeni postovi).
        const { data: post, error } = await supabase
          .from('posts')
          .select(`
            id,
            title,
            slug,
            excerpt,
            content,
            cover_image,
            category_id,
            status,
            tags ( id, name )
          `)
          .eq('id', Number(id))
          .single();

        if (error || !post) {
          throw new Error('Vest nije pronađena u bazi.');
        }

        setTitle(post.title || '');
        setSlug(post.slug || '');
        setExcerpt(post.excerpt || '');
        setContent(post.content || '');
        setCategoryId(post.category_id || (catData && catData[0]?.id) || '');
        setStatus(post.status || 'published');
        setCoverImageUrl(post.cover_image || '');

        if (post.tags && Array.isArray(post.tags)) {
          setTagsInput(post.tags.map((t: any) => t.name).join(', '));
        } else {
          const { data: postTags } = await supabase
            .from('post_tags')
            .select('tag_id, tags:tag_id ( name )')
            .eq('post_id', Number(id));

          if (postTags && postTags.length > 0) {
            const tagNames = postTags
              .map((pt: any) => pt.tags?.name)
              .filter(Boolean);
            setTagsInput(tagNames.join(', '));
          }
        }
      } catch (err: any) {
        console.error('Greška pri učitavanju vesti:', err);
        showToast(err?.message || 'Greška pri učitavanju vesti.', 'error');
        navigate('/admin/vesti');
      } finally {
        setIsLoadingPost(false);
      }
    };

    loadData();
  }, [id, navigate, showToast]);

  // Upload slike
  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Maksimalna veličina slike je 5MB.', 'error');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9]/g, '_');
      const filePath = `covers/${Date.now()}_${cleanFileName}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage
        .from('covers')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setCoverImageUrl(reader.result as string);
          showToast('Slika sačuvana lokalno.', 'info');
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: urlData } = supabase.storage.from('covers').getPublicUrl(data.path);
      if (urlData?.publicUrl) {
        setCoverImageUrl(urlData.publicUrl);
        showToast('Nova cover slika je otpremljena!', 'success');
      }
    } catch (err) {
      console.error('Greška pri upload-u:', err);
      showToast('Greška pri upload-u slike.', 'error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);
    const replacement = `${prefix}${selected || 'tekst'}${suffix}`;

    setContent(content.substring(0, start) + replacement + content.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 5));
    }, 10);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim() || title.trim().length < 5) {
      newErrors.title = 'Naslov mora imati najmanje 5 karaktera.';
    }
    if (!slug.trim()) {
      newErrors.slug = 'Slug je obavezan.';
    }
    if (!excerpt.trim() || excerpt.trim().length < 20) {
      newErrors.excerpt = 'Kratak opis (excerpt) mora imati najmanje 20 karaktera.';
    }
    if (!content.trim() || content.trim().length < 20) {
      newErrors.content = 'Sadržaj vesti mora imati najmanje 20 karaktera.';
    }
    if (!categoryId) {
      newErrors.category = 'Izaberite kategoriju.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // UPDATE vesti
  const handleUpdate = async (targetStatus?: 'draft' | 'published') => {
    const finalStatus = targetStatus || status;
    setStatus(finalStatus);

    if (!validate()) {
      showToast('Molimo popunite sva obavezna polja.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const wordCount = content.trim().split(/\s+/).length;
      const readingTime = Math.max(1, Math.ceil(wordCount / 200));

      const selectedCat = categories.find(c => c.id === Number(categoryId));

      // Update StorageService
      if (id) {
        StorageService.updatePost(Number(id), {
          title: title.trim(),
          slug: slug.trim(),
          excerpt: excerpt.trim(),
          content: content.trim(),
          cover_image: coverImageUrl,
          category_id: Number(categoryId),
          status: finalStatus,
          reading_time: readingTime,
          published_at: finalStatus === 'published' ? nowIso : undefined,
        });
      }

      const updatePayload: Record<string, any> = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        content: content.trim(),
        cover_image: coverImageUrl,
        category_id: Number(categoryId),
        status: finalStatus,
        reading_time: readingTime,
        updated_at: nowIso,
      };

      if (finalStatus === 'published') {
        updatePayload.published_at = nowIso;
      }

      const rawTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      // Sinhronizacija preko autentifikovanog CMS API-ja (uključuje i tagove).
      CmsClient.updatePost(Number(id), {
        ...updatePayload,
        tags: rawTags,
      });

      showToast('Izmene su uspešno sačuvane!', 'success');
      navigate('/admin/vesti');
    } catch (err: any) {
      console.error('Greška pri ažuriranju vesti:', err);
      showToast(err?.message || 'Greška pri čuvanju izmena.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // DELETE vesti
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      if (id) {
        StorageService.deletePost(Number(id));
      }
      CmsClient.deletePost(Number(id));

      showToast('Vest je uspešno obrisana.', 'success');
      navigate('/admin/vesti');
    } catch (err: any) {
      console.error('Greška pri brisanju:', err);
      showToast(err?.message || 'Greška pri brisanju vesti.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoadingPost) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="text-purple-400 animate-spin" />
          <p className="text-xs text-zinc-400">Učitavanje podataka o vesti...</p>
        </div>
      </div>
    );
  }

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
            Izmena Vesti <span className="text-[#a855f7]">#{id}</span>
          </h1>
        </div>

        {/* Dugmad za akciju u vrhu */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            title="Obriši vest"
            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 hover:border-red-500/20 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleUpdate()}
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
                <span>Sačuvaj Izmene</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Forma */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEVI DEO: Glavni tekst */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Naslov */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Naslov Vesti <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
                }}
                className={`w-full bg-[#0d0d0d] text-white text-base sm:text-lg font-bold rounded-lg px-4 py-3 border transition-colors focus:outline-none ${
                  errors.title ? 'border-red-500' : 'border-white/10 focus:border-purple-500'
                }`}
              />
              {errors.title && <p className="text-xs text-red-400 mt-1">{errors.title}</p>}

              {/* Slug */}
              <div className="pt-2 flex items-center gap-2 text-xs text-zinc-400">
                <span className="shrink-0 text-zinc-500 font-mono">/post/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={e => setSlug(createSlug(e.target.value))}
                  className="flex-1 bg-[#090909] text-purple-300 font-mono text-xs rounded px-2.5 py-1.5 border border-white/5 focus:border-purple-500 focus:outline-none"
                />
              </div>
              {errors.slug && <p className="text-xs text-red-400">{errors.slug}</p>}
            </div>

            {/* Excerpt */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Kratak opis (Excerpt) <span className="text-red-400">*</span>
                </label>
                <span className="text-xs font-mono text-zinc-500">
                  {excerpt.length} / 200
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={200}
                value={excerpt}
                onChange={e => setExcerpt(e.target.value)}
                className="w-full bg-[#0d0d0d] text-white text-sm rounded-lg p-3.5 border border-white/10 focus:border-purple-500 focus:outline-none resize-none"
              />
              {errors.excerpt && <p className="text-xs text-red-400">{errors.excerpt}</p>}
            </div>

            {/* Content Editor */}
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
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Bold size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<em>', '</em>')}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Italic size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<blockquote>', '</blockquote>')}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <Quote size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('<ul>\n  <li>', '</li>\n</ul>')}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <List size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-[#0d0d0d] p-0.5 rounded-lg border border-white/10 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditorTab('write')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors ${
                      editorTab === 'write' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Pisanje
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorTab('preview')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                      editorTab === 'preview' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Eye size={12} />
                    <span>Pregled</span>
                  </button>
                </div>
              </div>

              <div className="p-4">
                {editorTab === 'write' ? (
                  <textarea
                    ref={textareaRef}
                    rows={15}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="w-full bg-[#0d0d0d] text-white text-sm font-mono leading-relaxed p-4 rounded-lg border border-white/10 focus:border-purple-500 focus:outline-none resize-y min-h-[320px]"
                  />
                ) : (
                  <div
                    className="prose prose-invert max-w-none min-h-[320px] p-4 bg-[#0d0d0d] rounded-lg border border-white/10 text-zinc-200 text-sm leading-relaxed overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                )}
                {errors.content && <p className="text-xs text-red-400 mt-2">{errors.content}</p>}
              </div>
            </div>

          </div>

          {/* DESNI DEO: Meta opcije */}
          <div className="space-y-6">
            
            {/* Status */}
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
                  <span>Draft</span>
                </button>
              </div>
            </div>

            {/* Cover Slika */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Naslovna (Cover) Slika
              </label>

              {coverImageUrl ? (
                <div className="relative rounded-lg overflow-hidden border border-white/10 group aspect-video bg-black">
                  <img src={coverImageUrl} alt="Cover preview" className="w-full h-full object-cover" />
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
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-purple-500/50 rounded-xl p-6 text-center cursor-pointer transition-all"
                >
                  {isUploadingImage ? (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <Loader2 size={24} className="text-purple-400 animate-spin" />
                      <p className="text-xs text-zinc-400">Otpremanje slike...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-3">
                      <Upload size={20} className="text-purple-400" />
                      <p className="text-xs text-white">Kliknite za upload slike</p>
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

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="url"
                  value={customUrlInput}
                  onChange={e => setCustomUrlInput(e.target.value)}
                  placeholder="Ili zalepite URL..."
                  className="flex-1 bg-[#0d0d0d] text-white text-xs rounded px-3 py-2 border border-white/10 focus:border-purple-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customUrlInput.trim()) {
                      setCoverImageUrl(customUrlInput.trim());
                      setCustomUrlInput('');
                    }
                  }}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-xs rounded border border-white/10 cursor-pointer"
                >
                  Postavi
                </button>
              </div>
            </div>

            {/* Kategorija */}
            <div className="bg-[#141414] border border-white/10 rounded-xl p-5 shadow-sm space-y-3">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Kategorija <span className="text-red-400">*</span>
              </label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(Number(e.target.value))}
                className="w-full bg-[#0d0d0d] text-white text-sm rounded-lg px-3.5 py-2.5 border border-white/10 focus:border-purple-500 focus:outline-none cursor-pointer"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
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
                placeholder="RPG, UE5, PC..."
                className="w-full bg-[#0d0d0d] text-white text-sm rounded-lg px-3.5 py-2.5 border border-white/10 focus:border-purple-500 focus:outline-none"
              />
            </div>

          </div>

        </div>
      </div>

      {/* Modal za brisanje */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-white/10 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Trajno brisanje vesti</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Da li ste sigurni da želite da obrišete ovu vest? Ova akcija se ne može poništiti.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Otkaži
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Brisanje...</span>
                  </>
                ) : (
                  <span>Obriši vest</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditPost;
