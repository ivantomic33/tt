import { Response } from 'express';
import { AuthenticatedRequest } from '../security/bolaMiddleware';
import { extractAccessTokenFromReq } from '../security/authMiddleware';
import { getScopedSupabaseClient, executeUserScopedQuery } from '../db/supabaseClient';
import { PostSchema, UpdatePostSchema, CommentSchema } from '../validation/schemas';

export class PostsController {
  /**
   * 1. GET /api/posts - Retrieve posts with optional pagination & status filtering.
   * Non-admin users only receive published posts (or their own drafts).
   */
  static async getAllPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const accessToken = extractAccessTokenFromReq(req) || undefined;
      const client = getScopedSupabaseClient(accessToken);
      const user = req.user;
      const isAdmin = user?.role === 'admin' || user?.role === 'administrator';

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const offset = (page - 1) * limit;
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;

      let query = client
        .from('posts')
        .select('*', { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!isAdmin) {
        query = query.eq('status', 'published');
      }

      if (categoryId && !isNaN(categoryId)) {
        query = query.eq('category_id', categoryId);
      }

      const { data, count, error } = await query;

      if (error) {
        console.error('[PostsController.getAllPosts error]', error);
        res.status(500).json({ success: false, error: 'Greška pri učitavanju postova iz baze.' });
        return;
      }

      res.json({
        success: true,
        data: data || [],
        pagination: {
          page,
          limit,
          total: count ?? (data ? data.length : 0),
        },
        securityContext: {
          rlsEnforced: true,
          scopedClientUsed: Boolean(accessToken),
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška na serveru.';
      res.status(500).json({ success: false, error: msg });
    }
  }

  /**
   * 2. GET /api/posts/:id - Retrieve single post by numeric ID or slug
   */
  static async getPostById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const accessToken = extractAccessTokenFromReq(req) || undefined;
      const client = getScopedSupabaseClient(accessToken);
      const user = req.user;
      const isAdmin = user?.role === 'admin' || user?.role === 'administrator';

      const isNumeric = /^\d+$/.test(id);
      let query = client.from('posts').select('*');
      if (isNumeric) {
        query = query.eq('id', Number(id));
      } else {
        query = query.eq('slug', id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('[PostsController.getPostById error]', error);
        res.status(500).json({ success: false, error: 'Greška pri dohvatanju posta.' });
        return;
      }

      if (!data) {
        res.status(404).json({ success: false, error: 'Post nije pronađen ili nemate pravo pristupa.' });
        return;
      }

      // Restrict draft visibility to author or admin
      if (data.status === 'draft' && !isAdmin && data.author_id !== user?.userId) {
        res.status(403).json({
          success: false,
          error: 'Ovaj članak je još uvek u pripremi (draft).',
        });
        return;
      }

      res.json({ success: true, data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri dohvatanju posta.';
      res.status(500).json({ success: false, error: msg });
    }
  }

  /**
   * 3. POST /api/posts - Create a new post
   */
  static async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Morate biti prijavljeni da biste kreirali post.' });
        return;
      }

      const validatedBody = PostSchema.parse(req.body);
      const accessToken = extractAccessTokenFromReq(req) || undefined;

      const generatedSlug =
        validatedBody.slug ||
        validatedBody.title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

      const parsedCategoryId =
        validatedBody.category_id ||
        (validatedBody.category && !isNaN(Number(validatedBody.category))
          ? Number(validatedBody.category)
          : 1);

      const finalCoverImage =
        validatedBody.cover_image ||
        validatedBody.image_url ||
        'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';

      const nowIso = new Date().toISOString();

      const result = await executeUserScopedQuery({
        accessToken,
        authenticatedUserId: user.userId,
        isAdmin: user.role === 'admin' || user.role === 'administrator',
        queryFn: async (client) => {
          return await client
            .from('posts')
            .insert([
              {
                title: validatedBody.title,
                slug: generatedSlug,
                content: validatedBody.content,
                excerpt: validatedBody.excerpt || validatedBody.content.substring(0, 150),
                category_id: parsedCategoryId,
                cover_image: finalCoverImage,
                author_id: user.userId,
                author_name: user.name || 'Nexus Urednik',
                author_role: user.role === 'admin' ? 'Glavni Urednik' : 'Autor',
                status: validatedBody.status || 'published',
                published: validatedBody.status !== 'draft',
                reading_time: validatedBody.reading_time || 4,
                featured: validatedBody.featured ?? false,
                views: 0,
                views_count: 0,
                likes: 0,
                created_at: nowIso,
                updated_at: nowIso,
                published_at: validatedBody.status === 'published' ? nowIso : null,
              },
            ])
            .select()
            .single();
        },
      });

      if (result.error) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.data,
        message: 'Post uspešno kreiran uz RLS i IDOR zaštitu.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Neispravni podaci za post.';
      res.status(400).json({ success: false, error: msg });
    }
  }

  /**
   * 4. PATCH /api/posts/:id - Update post with IDOR Guard & Zod Sanitization
   */
  static async updatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Autentifikacija je obavezna.' });
        return;
      }

      const validatedBody = UpdatePostSchema.parse(req.body);
      const accessToken = extractAccessTokenFromReq(req) || undefined;
      const client = getScopedSupabaseClient(accessToken);

      const isNumeric = /^\d+$/.test(id);
      let fetchQuery = client.from('posts').select('id, author_id, published_at');
      if (isNumeric) {
        fetchQuery = fetchQuery.eq('id', Number(id));
      } else {
        fetchQuery = fetchQuery.eq('slug', id);
      }

      const { data: existingPost, error: fetchErr } = await fetchQuery.maybeSingle();

      if (fetchErr) {
        res.status(500).json({ success: false, error: 'Greška pri proveri posta u bazi.' });
        return;
      }

      if (!existingPost) {
        res.status(404).json({ success: false, error: 'Post nije pronađen.' });
        return;
      }

      const isAdminUser = user.role === 'admin' || user.role === 'administrator';

      // IDOR Guard: dozvoljeno samo vlasniku ili adminu. VAŽNO: blokira i postove
      // bez author_id (NULL), koji bi inače bili otvoreni za svakog prijavljenog korisnika.
      if (!isAdminUser && existingPost.author_id !== user.userId) {
        res.status(403).json({
          success: false,
          error: 'IDOR Guard Blocked: Nemate pravo izmene posta koji nije vaš!',
        });
        return;
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (validatedBody.title !== undefined) updateData.title = validatedBody.title;
      if (validatedBody.slug !== undefined) updateData.slug = validatedBody.slug;
      if (validatedBody.content !== undefined) updateData.content = validatedBody.content;
      if (validatedBody.excerpt !== undefined) updateData.excerpt = validatedBody.excerpt;
      if (validatedBody.cover_image || validatedBody.image_url) {
        updateData.cover_image = validatedBody.cover_image || validatedBody.image_url;
      }
      if (validatedBody.category_id !== undefined) {
        updateData.category_id = Number(validatedBody.category_id);
      } else if (validatedBody.category !== undefined && !isNaN(Number(validatedBody.category))) {
        updateData.category_id = Number(validatedBody.category);
      }
      if (validatedBody.status !== undefined) {
        updateData.status = validatedBody.status;
        updateData.published = validatedBody.status === 'published';
        if (validatedBody.status === 'published' && !existingPost.published_at) {
          updateData.published_at = new Date().toISOString();
        }
      }
      if (validatedBody.reading_time !== undefined) {
        updateData.reading_time = Number(validatedBody.reading_time);
      }
      if (validatedBody.featured !== undefined) {
        updateData.featured = Boolean(validatedBody.featured);
      }

      const { data: updatedPost, error } = await client
        .from('posts')
        .update(updateData)
        .eq('id', existingPost.id)
        .select()
        .single();

      if (error) {
        console.error('[PostsController.updatePost error]', error);
        res.status(400).json({ success: false, error: 'Greška pri izmeni posta u bazi.' });
        return;
      }

      res.json({
        success: true,
        data: updatedPost,
        message: 'Post uspešno ažuriran uz verifikaciju vlasništva.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri izmeni posta.';
      res.status(500).json({ success: false, error: msg });
    }
  }

  /**
   * 5. DELETE /api/posts/:id - Delete post with IDOR Guard
   */
  static async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user;
      if (!user) {
        res.status(401).json({ success: false, error: 'Autentifikacija je obavezna.' });
        return;
      }

      const accessToken = extractAccessTokenFromReq(req) || undefined;
      const client = getScopedSupabaseClient(accessToken);

      const isNumeric = /^\d+$/.test(id);
      let fetchQuery = client.from('posts').select('id, author_id');
      if (isNumeric) {
        fetchQuery = fetchQuery.eq('id', Number(id));
      } else {
        fetchQuery = fetchQuery.eq('slug', id);
      }

      const { data: existingPost, error: fetchErr } = await fetchQuery.maybeSingle();

      if (fetchErr) {
        res.status(500).json({ success: false, error: 'Greška pri dohvatanju posta.' });
        return;
      }

      if (!existingPost) {
        res.status(404).json({ success: false, error: 'Post nije pronađen.' });
        return;
      }

      const isAdminUser = user.role === 'admin' || user.role === 'administrator';

      // IDOR Guard: dozvoljeno samo vlasniku ili adminu. Blokira i postove bez author_id (NULL).
      if (!isAdminUser && existingPost.author_id !== user.userId) {
        res.status(403).json({
          success: false,
          error: 'IDOR Guard Blocked: Nemate pravo brisanja tuđeg posta!',
        });
        return;
      }

      const { error } = await client.from('posts').delete().eq('id', existingPost.id);

      if (error) {
        console.error('[PostsController.deletePost error]', error);
        res.status(500).json({ success: false, error: 'Greška pri brisanju posta.' });
        return;
      }

      res.json({
        success: true,
        message: `Post ${id} je uspešno obrisan.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Greška pri brisanju posta.';
      res.status(500).json({ success: false, error: msg });
    }
  }

  /**
   * 6. POST /api/posts/:id/comments - Add sanitized comment to a post
   */
  static async addComment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id: postIdParam } = req.params;
      const user = req.user;
      const validatedBody = CommentSchema.parse(req.body);
      const accessToken = extractAccessTokenFromReq(req) || undefined;

      const client = getScopedSupabaseClient(accessToken);

      let numericPostId: number;
      if (/^\d+$/.test(postIdParam)) {
        numericPostId = Number(postIdParam);
      } else {
        const { data: p } = await client
          .from('posts')
          .select('id')
          .eq('slug', postIdParam)
          .maybeSingle();
        if (!p) {
          res.status(404).json({
            success: false,
            error: 'Članak na koji ostavljate komentar nije pronađen.',
          });
          return;
        }
        numericPostId = p.id;
      }

      const commentPayload: Record<string, unknown> = {
        post_id: numericPostId,
        author_name: user?.name || validatedBody.author_name || 'Anonimni Gejmer',
        author_email: user?.email || validatedBody.author_email || 'anon@nexus.gg',
        content: validatedBody.content,
        status: 'approved',
      };

      const { data: comment, error } = await client
        .from('comments')
        .insert([commentPayload])
        .select('id, post_id, author_name, content, status, likes, created_at')
        .single();

      if (error) {
        console.error('[PostsController.addComment error]', error);
        res.status(400).json({
          success: false,
          error: 'Greška pri upisu komentara u bazi.',
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: comment,
        message: 'Komentar uspešno sačuvan.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Neispravan komentar.';
      res.status(400).json({ success: false, error: msg });
    }
  }
}
