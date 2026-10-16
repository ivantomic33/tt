/**
 * Klijentski helper za autentifikovani CMS API.
 *
 * Zamenjuje direktne upise u Supabase preko anon ključa (koji su zahtevali
 * permisivne RLS politike). Svi pozivi idu na /api/cms i oslanjaju se na
 * HttpOnly kolačić sesije (credentials: 'include').
 *
 * Greške se ne propagiraju (fire-and-forget sinhronizacija) već se samo loguju.
 */

async function request(method: string, path: string, body?: unknown): Promise<boolean> {
  try {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.warn(`[cmsClient] ${method} ${path} -> HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`[cmsClient] ${method} ${path} failed:`, e);
    return false;
  }
}

/**
 * Varijanta `request` koja vraća JSON (za autentifikovano admin čitanje).
 * Vraća `null` na bilo kakvu grešku (fallback na lokalne/anon podatke).
 */
async function requestJson<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  try {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      console.warn(`[cmsClient] ${method} ${path} -> HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    return (json?.data ?? json) as T;
  } catch (e) {
    console.warn(`[cmsClient] ${method} ${path} failed:`, e);
    return null;
  }
}

export const CmsClient = {
  // Kategorije
  upsertCategory: (c: Record<string, unknown>) => request('POST', '/api/cms/categories', c),
  updateCategory: (id: number, c: Record<string, unknown>) => request('PUT', `/api/cms/categories/${id}`, c),
  deleteCategory: (id: number) => request('DELETE', `/api/cms/categories/${id}`),

  // Tagovi
  upsertTag: (t: Record<string, unknown>) => request('POST', '/api/cms/tags', t),
  deleteTag: (id: number) => request('DELETE', `/api/cms/tags/${id}`),

  // Postovi
  upsertPost: (p: Record<string, unknown>) => request('POST', '/api/cms/posts', p),
  updatePost: (id: number, p: Record<string, unknown>) => request('PUT', `/api/cms/posts/${id}`, p),
  deletePost: (id: number) => request('DELETE', `/api/cms/posts/${id}`),

  // Admin čitanje (vidi i neobjavljene / draft postove)
  listPosts: () => requestJson<Record<string, unknown>[]>('GET', '/api/cms/posts'),
  getPost: (id: number) => requestJson<Record<string, unknown>>('GET', `/api/cms/posts/${id}`),

  // Javne (ne-destruktivne) akcije
  incrementViews: (id: number) => request('POST', `/api/cms/posts/${id}/views`),
  toggleLike: (id: number, delta: number) => request('POST', `/api/cms/posts/${id}/likes`, { delta }),

  // Komentari
  addComment: (c: Record<string, unknown>) => request('POST', '/api/cms/comments', c),

  // Sinhronizacija člana foruma
  syncMember: (m: Record<string, unknown>) => request('POST', '/api/cms/members/sync', m),
};
