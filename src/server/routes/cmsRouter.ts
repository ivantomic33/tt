import { Router, Response } from 'express';
import { getAdminSupabaseClient } from '../db/supabaseClient';
import { requireAuth, optionalAuth, requireAdmin } from '../security/authMiddleware';
import { AuthenticatedRequest } from '../security/bolaMiddleware';
import { sanitizePlainText, sanitizeRichHtml } from '../validation/schemas';
import { voteRateLimiter } from '../security/rateLimiter';

/**
 * CMS API RUTER
 *
 * Razlog postojanja: frontend (StorageService / userService) je ranije pisao
 * DIREKTNO u Supabase preko anon ključa, što je zahtevalo permisivne RLS politike
 * (USING(true)) i omogućavalo anonimno menjanje/brisanje sadržaja.
 *
 * Sada svi upisi idu preko ovog rutera (server-side, service_role), pa RLS može
 * biti strogo zaključan (vidi RLS sekciju u supabase/schema.sql).
 */

const router = Router();

const isAdminUser = (req: AuthenticatedRequest): boolean => {
  const role = (req.user?.role || '').toLowerCase();
  return role === 'admin' || role === 'administrator';
};

/* ------------------------------------------------------------------ */
/* KATEGORIJE                                                          */
/* ------------------------------------------------------------------ */

router.post('/categories', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, slug, color, description } = req.body || {};
    if (!name || !slug) {
      res.status(400).json({ success: false, error: 'Naziv i slug su obavezni.' });
      return;
    }
    const client = getAdminSupabaseClient();
    const { data, error } = await client
      .from('categories')
      .upsert(
        {
          name: sanitizePlainText(String(name)),
          slug: String(slug).trim().toLowerCase(),
          color: color || '#a855f7',
          description: sanitizePlainText(String(description || '')),
        },
        { onConflict: 'slug' }
      )
      .select()
      .single();

    if (error) {
      console.error('[cmsRouter.createCategory]', error);
      res.status(400).json({ success: false, error: 'Greška pri čuvanju kategorije.' });
      return;
    }
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[cmsRouter.createCategory]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

router.put('/categories/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body || {};
    const payload: Record<string, unknown> = {};
    if (body.name !== undefined) payload.name = sanitizePlainText(String(body.name));
    if (body.slug !== undefined) payload.slug = String(body.slug).trim().toLowerCase();
    if (body.color !== undefined) payload.color = body.color;
    if (body.description !== undefined) payload.description = sanitizePlainText(String(body.description));

    if (Object.keys(payload).length === 0) {
      res.status(400).json({ success: false, error: 'Nema polja za izmenu.' });
      return;
    }

    const client = getAdminSupabaseClient();
    const { error } = await client.from('categories').update(payload).eq('id', Number(id));
    if (error) {
      console.error('[cmsRouter.updateCategory]', error);
      res.status(400).json({ success: false, error: 'Greška pri izmeni kategorije.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[cmsRouter.updateCategory]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

router.delete('/categories/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const client = getAdminSupabaseClient();
    const { error } = await client.from('categories').delete().eq('id', Number(req.params.id));
    if (error) {
      console.error('[cmsRouter.deleteCategory]', error);
      res.status(400).json({ success: false, error: 'Greška pri brisanju kategorije.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[cmsRouter.deleteCategory]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

/* ------------------------------------------------------------------ */
/* TAGOVI                                                              */
/* ------------------------------------------------------------------ */

router.post('/tags', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, slug } = req.body || {};
    if (!name || !slug) {
      res.status(400).json({ success: false, error: 'Naziv i slug su obavezni.' });
      return;
    }
    const client = getAdminSupabaseClient();
    const { data, error } = await client
      .from('tags')
      .upsert({ name: sanitizePlainText(String(name)), slug: String(slug).trim().toLowerCase() }, { onConflict: 'slug' })
      .select()
      .single();

    if (error) {
      console.error('[cmsRouter.createTag]', error);
      res.status(400).json({ success: false, error: 'Greška pri čuvanju taga.' });
      return;
    }
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[cmsRouter.createTag]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

router.delete('/tags/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const client = getAdminSupabaseClient();
    const { error } = await client.from('tags').delete().eq('id', Number(req.params.id));
    if (error) {
      console.error('[cmsRouter.deleteTag]', error);
      res.status(400).json({ success: false, error: 'Greška pri brisanju taga.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[cmsRouter.deleteTag]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

/* ------------------------------------------------------------------ */
/* POSTOVI (CMS sinhronizacija)                                        */
/* ------------------------------------------------------------------ */

const POST_FIELDS = [
  'title',
  'slug',
  'excerpt',
  'content',
  'cover_image',
  'category_id',
  'status',
  'views',
  'likes',
  'reading_time',
  'featured',
  'author_name',
  'author_role',
  'author_avatar',
  'published_at',
  'updated_at',
] as const;

function pickPostFields(body: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const key of POST_FIELDS) {
    if (body[key] !== undefined) payload[key] = body[key];
  }
  if (typeof payload.title === 'string') payload.title = sanitizePlainText(payload.title);
  if (typeof payload.content === 'string') payload.content = sanitizeRichHtml(payload.content);
  return payload;
}

function toSlug(input: string): string {
  return String(input)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/**
 * Sinhronizuje tagove posta (post_tags) — koristi isključivo service_role.
 */
async function syncPostTags(
  client: ReturnType<typeof getAdminSupabaseClient>,
  postId: number,
  tagsRaw: unknown
): Promise<void> {
  if (!Array.isArray(tagsRaw)) return;

  const tagNames = Array.from(
    new Set(
      tagsRaw
        .filter((t): t is string => typeof t === 'string')
        .map((t) => sanitizePlainText(t).trim())
        .filter(Boolean)
    )
  );

  // Obriši postojeće veze
  await client.from('post_tags').delete().eq('post_id', postId);

  for (const name of tagNames) {
    const slug = toSlug(name);
    if (!slug) continue;

    let tagId: number | null = null;
    const { data: existing } = await client.from('tags').select('id').eq('slug', slug).maybeSingle();

    if (existing?.id) {
      tagId = existing.id;
    } else {
      const { data: created, error } = await client
        .from('tags')
        .insert({ name, slug })
        .select('id')
        .single();
      if (!error && created?.id) tagId = created.id;
    }

    if (tagId) {
      await client.from('post_tags').insert({ post_id: postId, tag_id: tagId });
    }
  }
}

router.post('/posts', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body || {};
    const payload = pickPostFields(body);
    if (!payload.title || !payload.slug) {
      res.status(400).json({ success: false, error: 'Naslov i slug su obavezni.' });
      return;
    }
    payload.updated_at = new Date().toISOString();
    const client = getAdminSupabaseClient();

    // Postoji li već post sa istim slug-om? (izbegava se potreba za unique constraint-om)
    const { data: existing } = await client
      .from('posts')
      .select('id')
      .eq('slug', payload.slug)
      .maybeSingle();

    let data: { id: number } | null = null;
    let error: { message?: string } | null = null;

    if (existing?.id) {
      ({ data, error } = await client
        .from('posts')
        .update(payload)
        .eq('id', existing.id)
        .select('id')
        .single());
    } else {
      ({ data, error } = await client.from('posts').insert(payload).select('id').single());
    }

    if (error) {
      console.error('[cmsRouter.upsertPost]', error);
      res.status(400).json({ success: false, error: 'Greška pri čuvanju posta.' });
      return;
    }

    const postId = data?.id ?? existing?.id;
    if (postId && body.tags !== undefined) {
      await syncPostTags(client, postId, body.tags);
    }

    res.status(201).json({ success: true, data: { id: postId } });
  } catch (err) {
    console.error('[cmsRouter.upsertPost]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

router.put('/posts/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const postId = Number(req.params.id);
    const payload = pickPostFields(req.body || {});
    payload.updated_at = new Date().toISOString();

    const client = getAdminSupabaseClient();
    const { error } = await client.from('posts').update(payload).eq('id', postId);
    if (error) {
      console.error('[cmsRouter.updatePost]', error);
      res.status(400).json({ success: false, error: 'Greška pri izmeni posta.' });
      return;
    }

    if (req.body?.tags !== undefined) {
      await syncPostTags(client, postId, req.body.tags);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('[cmsRouter.updatePost]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

router.delete('/posts/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const client = getAdminSupabaseClient();
    const { error } = await client.from('posts').delete().eq('id', Number(req.params.id));
    if (error) {
      console.error('[cmsRouter.deletePost]', error);
      res.status(400).json({ success: false, error: 'Greška pri brisanju posta.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[cmsRouter.deletePost]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

/* ------------------------------------------------------------------ */
/* KOMENTARI                                                           */
/* ------------------------------------------------------------------ */

router.post('/comments', optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { post_id, content, author_name, author_email } = req.body || {};
    if (!post_id || !content) {
      res.status(400).json({ success: false, error: 'Post i sadržaj komentara su obavezni.' });
      return;
    }
    const client = getAdminSupabaseClient();
    const { data, error } = await client
      .from('comments')
      .insert({
        post_id: Number(post_id),
        content: sanitizePlainText(String(content)),
        author_name: sanitizePlainText(String(req.user?.name || author_name || 'Anonimni Gejmer')),
        author_email: req.user?.email || author_email || 'anon@nexus.gg',
        status: 'approved',
      })
      .select()
      .single();

    if (error) {
      console.error('[cmsRouter.addComment]', error);
      res.status(400).json({ success: false, error: 'Greška pri upisu komentara.' });
      return;
    }
    res.status(201).json({ success: true, data });
  } catch (err) {
    console.error('[cmsRouter.addComment]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

/* ------------------------------------------------------------------ */
/* SINHRONIZACIJA ČLANA FORUMA (self)                                  */
/* ------------------------------------------------------------------ */

router.post('/members/sync', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const name = sanitizePlainText(String(req.user?.name || req.body?.name || ''));
    if (!name) {
      res.status(400).json({ success: false, error: 'Nedostaje ime člana.' });
      return;
    }
    const role = isAdminUser(req) ? 'Administrator' : 'Član';
    const client = getAdminSupabaseClient();
    const { error } = await client.from('forum_members').upsert(
      {
        name,
        role,
        is_online: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'name' }
    );

    if (error) {
      console.error('[cmsRouter.syncMember]', error);
      res.status(400).json({ success: false, error: 'Greška pri sinhronizaciji člana.' });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[cmsRouter.syncMember]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

/* ------------------------------------------------------------------ */
/* PREGLEDI I LAJKOVI (javno, rate-limited, ne-destruktivno)           */
/* ------------------------------------------------------------------ */

router.post('/posts/:id/views', optionalAuth, voteRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, error: 'Neispravan ID posta.' });
      return;
    }
    const client = getAdminSupabaseClient();
    const { error } = await client.rpc('increment_post_views', { post_id_param: id });
    if (error) {
      // Fallback ako RPC funkcija ne postoji
      const { data } = await client.from('posts').select('views').eq('id', id).maybeSingle();
      if (data) {
        await client
          .from('posts')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', id);
      }
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[cmsRouter.incrementViews]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

router.post('/posts/:id/likes', optionalAuth, voteRateLimiter, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const delta = Number(req.body?.delta);
    if (!Number.isFinite(id) || id <= 0 || !Number.isFinite(delta)) {
      res.status(400).json({ success: false, error: 'Neispravan zahtev.' });
      return;
    }
    const step = delta >= 0 ? 1 : -1;
    const client = getAdminSupabaseClient();
    const { data } = await client.from('posts').select('likes').eq('id', id).maybeSingle();
    if (!data) {
      res.status(404).json({ success: false, error: 'Post nije pronađen.' });
      return;
    }
    const nextLikes = Math.max(0, (data.likes || 0) + step);
    await client.from('posts').update({ likes: nextLikes }).eq('id', id);
    res.json({ success: true, likes: nextLikes });
  } catch (err) {
    console.error('[cmsRouter.toggleLike]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

/* ------------------------------------------------------------------ */
/* ADMIN ČITANJE (uključuje i neobjavljene / draft postove)            */
/* ------------------------------------------------------------------ */

router.get('/posts', requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const client = getAdminSupabaseClient();
    const { data, error } = await client
      .from('posts')
      .select(`
        id,
        title,
        slug,
        excerpt,
        cover_image,
        status,
        views,
        likes,
        created_at,
        published_at,
        category_id,
        categories:category_id ( id, name, color )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[cmsRouter.listPosts]', error);
      res.status(400).json({ success: false, error: 'Greška pri učitavanju vesti.' });
      return;
    }
    res.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[cmsRouter.listPosts]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

router.get('/posts/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, error: 'Neispravan ID posta.' });
      return;
    }
    const client = getAdminSupabaseClient();
    const { data, error } = await client
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
        featured,
        reading_time,
        tags ( id, name )
      `)
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('[cmsRouter.getPost]', error);
      res.status(400).json({ success: false, error: 'Greška pri učitavanju posta.' });
      return;
    }
    if (!data) {
      res.status(404).json({ success: false, error: 'Post nije pronađen.' });
      return;
    }
    res.json({ success: true, data });
  } catch (err) {
    console.error('[cmsRouter.getPost]', err);
    res.status(500).json({ success: false, error: 'Greška na serveru.' });
  }
});

export default router;