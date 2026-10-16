import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { User } from '../types';
import { CmsClient } from './cmsClient';

export interface AppUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Dobavlja profil i ulogu korisnika direktno iz tabele 'public.app_users'.
 */
export async function getUserFromDatabase(userId: string): Promise<AppUserRow | null> {
  try {
    if (!userId || !isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('app_users')
      .select('id, email, name, role, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (!error.message?.includes('Invalid API key') && error.code !== '42501') {
        console.warn('[userService] Warning fetching from app_users:', error.message);
      }
      return null;
    }

    return data as AppUserRow | null;
  } catch (err: any) {
    if (!err?.message?.includes('Invalid API key')) {
      console.warn('[userService] Exception fetching user from database:', err);
    }
    return null;
  }
}

/**
 * Sinhronizuje profil korisnika sa 'public.app_users' tabelom u Supabase bazi.
 * Čuva konzistentnost između autentifikacionog toka i baze podataka.
 */
export async function upsertUserToDatabase(user: User | any): Promise<{ success: boolean; error?: any }> {
  try {
    if (!user || !user.id) {
      return { success: false, error: 'No valid user or user ID provided' };
    }

    if (!isSupabaseConfigured()) {
      return { success: true };
    }

    const email = (user.email || '').trim().toLowerCase();
    const name =
      user.name ||
      user.user_metadata?.name ||
      user.user_metadata?.full_name ||
      email.split('@')[0] ||
      'Gamer';

    // NAPOMENA: public.app_users je zaključan RLS-om (pristup ima samo service_role).
    // Server je jedini izvor istine i sam upisuje/ažurira nalog tokom prijave/registracije,
    // pa se direktan upis iz klijenta više ne vrši.

    // Sinhronizujemo sa forum_members tabelom preko autentifikovanog API-ja
    //    (direktan anon upis više nije dozvoljen nakon RLS zaključavanja).
    CmsClient.syncMember({ name });

    return { success: true };
  } catch (err: any) {
    console.warn('[userService] Exception while syncing user to database:', err);
    return { success: false, error: err };
  }
}
