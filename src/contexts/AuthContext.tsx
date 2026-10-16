import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { ApiAuth, AuthUser } from '../services/apiAuth';
import { supabase } from '../lib/supabase';
import { StorageService } from '../services/storage';
import { upsertUserToDatabase, getUserFromDatabase } from '../services/userService';
import { isConfiguredAdminEmail } from '../utils/adminEmails';

export interface AuthContextType {
  user: User | null;
  role: string | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  revokeAllSessions: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  securityAuditData: any | null;
  fetchSecurityAudit: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Autoritativno razrešava ulogu za Supabase-sesiju:
 *  1. eksplicitni admin (bez mrežnog poziva),
 *  2. backend verifikacija (server verifikuje Supabase token i čita app_users preko service_role),
 *  3. lokalni/anon fallback (zaostalo ponašanje).
 */
async function resolveSupabaseRole(session: {
  user?: User | null;
  access_token?: string;
}): Promise<string> {
  const supaUser = session.user;
  if (!supaUser) return 'user';

  if (isConfiguredAdminEmail(supaUser.email) || supaUser.user_metadata?.role === 'admin') {
    return 'admin';
  }

  if (session.access_token) {
    const resolved = await ApiAuth.resolveRole(session.access_token);
    if (resolved?.role) return resolved.role;
  }

  const dbUser = await getUserFromDatabase(supaUser.id);
  if (dbUser?.role === 'admin') return 'admin';
  return dbUser?.role || 'user';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [securityAuditData, setSecurityAuditData] = useState<any | null>(null);

  // Pretvara AuthUser sa našeg bezbednog backend-a u Supabase-kompatibilan User objekat za UI komponente
  const mapAuthUserToUser = (authUser: AuthUser): User => {
    return {
      id: authUser.id,
      email: authUser.email,
      user_metadata: {
        full_name: authUser.name,
        name: authUser.name,
        role: authUser.role,
      },
      app_metadata: {
        role: authUser.role,
      },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;
  };

  // Helper za prepoznavanje administratorskog naloga (lista iz VITE_ADMIN_EMAILS)
  const isSuperAdminEmail = (email?: string): boolean => isConfiguredAdminEmail(email);

  // Dohvatanje izveštaja o bezbednosti sa backend-a
  const fetchSecurityAudit = useCallback(async () => {
    try {
      const audit = await ApiAuth.getSecurityAudit();
      setSecurityAuditData(audit);
      return audit;
    } catch (err) {
      console.warn('Greška pri dohvatanju sigurnosnog audita:', err);
      return null;
    }
  }, []);

  // Sinhronizacija korisnika sa public.app_users tabelom u Supabase bazi
  const upsertUserProfile = async (authUser: User) => {
    await upsertUserToDatabase(authUser);
  };

  // Osvežavanje profila i sesije
  const refreshProfile = useCallback(async () => {
    try {
      // 1. Provera preko custom bezbednog backend servera
      const meResult = await ApiAuth.getMe();
      if (meResult.success && meResult.user) {
        const mapped = mapAuthUserToUser(meResult.user);
        setUser(mapped);
        setRole(meResult.user.role);
        return;
      }

      // 2. Provera Supabase sesije
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        setRole(await resolveSupabaseRole(session));
        return;
      }

      // 3. Ako ni backend ni Supabase nemaju aktivnu sesiju, očisti eventualne zaostale lokalne sesije
      StorageService.logout();
      ApiAuth.clearStoredTokens();
      setUser(null);
      setRole(null);
    } catch (err) {
      console.warn('Greška pri proveri profil sesije:', err);
      setUser(null);
      setRole(null);
    }
  }, []);

  // Inicijalizacija sesije pri pokretanju (mount) i postavljanje onAuthStateChange slušača
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      setLoading(true);

      try {
        // 1. Prioritet 1: Proveri backend sesiju (preko HttpOnly kolačića ili JWT tokena iz localStorage)
        const res = await ApiAuth.getMe();
        if (res.success && res.user && isMounted) {
          const mappedUser = mapAuthUserToUser(res.user);
          setUser(mappedUser);
          setRole(res.user.role);
          return;
        }

        // 2. Prioritet 2: Proveri Supabase sesiju ako backend nije vratio aktivnu sesiju
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          setUser(session.user);
          setRole(await resolveSupabaseRole(session));
          return;
        }

        // 3. Ako korisnik nije u bazi niti ima validnu sesiju, očisti zaostalo lokalno stanje
        if (isMounted) {
          StorageService.logout();
          ApiAuth.clearStoredTokens();
          setUser(null);
          setRole(null);
        }
      } catch (err) {
        console.error('Inicijalna auth greška:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          fetchSecurityAudit();
        }
      }
    };

    initAuth();

    // Slušalac za promene u autentifikaciji (onAuthStateChange)
    // Hvata INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED i USER_UPDATED događaje
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] onAuthStateChange event:', event, session?.user?.id);

      if (
        (event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED') &&
        session?.user
      ) {
        if (isMounted) {
          // Sinhronizuj ulogu i podatke (autoritativno preko backend-a, uz fallback)
          setUser(session.user);
          setRole(await resolveSupabaseRole(session));
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          // Supabase je odjavio svoju sesiju, ali naša custom backend sesija (HttpOnly
          // kolačić) može i dalje biti važeća. Ne gubimo je olako — prvo proveri backend.
          // (Ranije se oslanjalo na localStorage token koji je uklonjen iz bezbednosnih razloga,
          // pa je svaki SIGNED_OUT greškom brisao validnu backend sesiju.)
          try {
            const backendSession = await ApiAuth.getMe();
            if (isMounted && backendSession.success && backendSession.user) {
              setUser(mapAuthUserToUser(backendSession.user));
              setRole(backendSession.user.role);
              return;
            }
          } catch {
            // ignorisano — tretiramo kao da backend sesija ne postoji
          }
          if (isMounted) {
            setUser(null);
            setRole(null);
          }
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchSecurityAudit]);

  // Prijava korisnika (Backend sa HttpOnly kolačićima + localStorage fallback, uz Supabase i demo fallback)
  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const cleanEmail = email.trim();

    try {
      // 1. Pokušaj prijave na bezbednom backend-u (backend automatski sinhronizuje app_users i forum_members)
      const res = await ApiAuth.login(cleanEmail, password);

      if (res.success && res.user) {
        const mappedUser = mapAuthUserToUser(res.user);
        setUser(mappedUser);
        setRole(res.user.role);
        setLoading(false);
        await fetchSecurityAudit();
        return { error: null };
      }

      // 2. Fallback na Supabase auth ako backend nije vratio uspeh
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        // 3. Fallback na lokalni demo CMS nalog
        const local = StorageService.login(cleanEmail, password);
        if (local.success && local.user) {
          const localUser = {
            id: local.user.id,
            email: local.user.email,
            user_metadata: { name: local.user.name, role: local.user.role },
            app_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
          } as unknown as User;
          setUser(localUser);
          setRole('admin');
          setLoading(false);
          await upsertUserProfile(localUser);
          return { error: null };
        }
        setLoading(false);
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setRole(
          await resolveSupabaseRole({ user: data.user, access_token: data.session?.access_token })
        );
        await upsertUserProfile(data.user);
      }

      setLoading(false);
      return { error: null };
    } catch (err: any) {
      setLoading(false);
      return { error: err };
    }
  };

  // Registracija novog korisnika uz strogu proveru jedinstvenosti email-a i korisničkog imena
  const signUp = async (email: string, password: string, name?: string) => {
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && name.trim().length > 0)
      ? name.trim()
      : cleanEmail.split('@')[0].trim();

    try {
      // 1. Primarni kanal: Naš bezbedni Express backend (/api/auth/register)
      const res = await ApiAuth.register(cleanEmail, password, cleanName, true);

      // Ako backend vrati grešku (npr. 409 Conflict za dupli email ili zauzeto ime),
      // STROGO prekidamo registraciju i prosleđujemo tačnu grešku klijentu!
      if (!res.success) {
        setLoading(false);
        return { error: { message: res.error || 'Neuspešna registracija.' } };
      }

      if (res.success && res.user) {
        const mappedUser = mapAuthUserToUser(res.user);
        setUser(mappedUser);
        setRole(res.user.role);
        setLoading(false);
        await fetchSecurityAudit();
        return { error: null };
      }

      // 2. Sekundarni fallback na Supabase direktnu registraciju (samo ako backend rute nisu konfigurisane)
      // Pre-provera jedinstvenosti u public.app_users preko Supabase klijenta
      const { data: existingUser } = await supabase
        .from('app_users')
        .select('id, email, name')
        .or(`email.ilike.${cleanEmail},name.ilike.${cleanName}`)
        .maybeSingle();

      if (existingUser) {
        setLoading(false);
        if (existingUser.email?.toLowerCase() === cleanEmail) {
          return { error: { message: 'Ova email adresa je već registrovana.' } };
        }
        return { error: { message: 'Ovo korisničko ime je već zauzeto.' } };
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            role: isSuperAdminEmail(cleanEmail) ? 'admin' : 'user',
          },
        },
      });

      if (error) {
        setLoading(false);
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('user already exists')) {
          return { error: { message: 'Ova email adresa je već registrovana.' } };
        }
        return { error: { message: error.message || 'Neuspešna registracija.' } };
      }

      // STROGA DETEKCIJA: Email Enumeration Protection u Supabase Auth
      // Kada je uključena potvrda email-a, Supabase vraća lažni user objekat gde je identities prazan niz []!
      if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setLoading(false);
        return { error: { message: 'Ova email adresa je već registrovana.' } };
      }

      if (data?.user) {
        const role = isSuperAdminEmail(cleanEmail) ? 'admin' : 'user';
        setUser(data.user);
        setRole(role);
        await upsertUserProfile(data.user);
      }

      setLoading(false);
      return { error: null };
    } catch (err: any) {
      console.error('[AuthContext] signUp threw exception:', err);
      setLoading(false);
      return { error: { message: err?.message || 'Greška pri registraciji.' } };
    }
  };

  // Odjava uz uklanjanje kolačića i lokalnih tokena
  const signOut = async () => {
    setLoading(true);
    try {
      await ApiAuth.logout();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Greška pri signOut:', err);
    }
    StorageService.logout();
    ApiAuth.clearStoredTokens();
    setUser(null);
    setRole(null);
    setLoading(false);
    await fetchSecurityAudit();
  };

  // Instant opoziv SVIH sesija na svim uređajima
  const revokeAllSessions = async () => {
    setLoading(true);
    try {
      await ApiAuth.revokeAllSessions();
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Greška pri revokeAllSessions:', err);
    }
    StorageService.logout();
    ApiAuth.clearStoredTokens();
    setUser(null);
    setRole(null);
    setLoading(false);
    await fetchSecurityAudit();
  };

  const isAdmin = role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isAdmin,
        loading,
        signIn,
        signUp,
        signOut,
        revokeAllSessions,
        refreshProfile,
        securityAuditData,
        fetchSecurityAudit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
