/**
 * Klijentski servis za komunikaciju sa bezbednim backend autentifikacionim sistemom.
 * Podržava i HttpOnly kolačiće (credentials: 'include') i JWT Bearer tokene u localStorage
 * kao fallback za cross-origin iFrame okruženja (npr. Google AI Studio / Cloud Run).
 */

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
  error?: string;
  message?: string;
  reuseDetected?: boolean;
}

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  NEXUS_TOKEN: 'nexus_auth_token',
};

export const ApiAuth = {
  /**
   * Dohvata sačuvani pristupni token iz lokalnog skladišta
   */
  getStoredAccessToken(): string | null {
    // BEZBEDNOSNO: tokeni se NE čuvaju u localStorage (sprečava krađu sesije pri XSS-u).
    // Sesija se prenosi isključivo HttpOnly kolačićem (credentials: 'include').
    return null;
  },

  /**
   * Dohvata sačuvani refresh token iz lokalnog skladišta
   */
  getStoredRefreshToken(): string | null {
    // BEZBEDNOSNO: refresh token se NE čuva u localStorage.
    return null;
  },

  /**
   * Ranije je čuvao tokene u localStorage. Sada je namerni NO-OP:
   * dodatno uklanja eventualne zaostale token-e iz starih verzija.
   */
  setStoredTokens(_accessToken?: string, _refreshToken?: string): void {
    this.clearStoredTokens();
  },

  /**
   * Čisti sve tokene iz lokalnog skladišta (pri odjavi)
   */
  clearStoredTokens(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.NEXUS_TOKEN);
      localStorage.removeItem('token');
    } catch {
      // ignore
    }
  },

  /**
   * Prijavljuje korisnika preko /api/auth/login.
   * Server postavlja HttpOnly kolačiće i vraća tokene u telu odgovora.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data: AuthResponse = await response.json();
      if (data.success && data.accessToken) {
        this.setStoredTokens(data.accessToken, data.refreshToken);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Greška u mrežnoj komunikaciji pri prijavi.' };
    }
  },

  /**
   * Registruje novog korisnika preko /api/auth/register.
   */
  async register(email: string, password: string, name?: string, termsAccepted: boolean = true): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password, name, termsAccepted }),
      });

      const data: AuthResponse = await response.json();
      if (data.success && data.accessToken) {
        this.setStoredTokens(data.accessToken, data.refreshToken);
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Greška u mrežnoj komunikaciji pri registraciji.' };
    }
  },

  /**
   * Osvežava sesiju preko /api/auth/refresh (Refresh Token Rotation).
   */
  async refreshSession(): Promise<AuthResponse> {
    try {
      const storedRefresh = this.getStoredRefreshToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedRefresh) {
        headers['x-refresh-token'] = storedRefresh;
      }

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: storedRefresh ? JSON.stringify({ refreshToken: storedRefresh }) : undefined,
      });

      const data: AuthResponse = await response.json();
      if (data.success && data.accessToken) {
        this.setStoredTokens(data.accessToken, data.refreshToken);
      } else if (!data.success) {
        this.clearStoredTokens();
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Greška pri osvežavanju sesije.' };
    }
  },

  /**
   * Dobavlja profil trenutno ulogovanog korisnika preko /api/auth/me.
   * Koristi HttpOnly access_token kolačić i/ili Bearer zaglavlje.
   */
  async getMe(): Promise<AuthResponse> {
    try {
      const token = this.getStoredAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers,
        credentials: 'include',
      });

      if (response.status === 401) {
        // Pokušaj tihog osvežavanja ako je access token istekao
        const refreshResult = await this.refreshSession();
        if (refreshResult.success && refreshResult.accessToken) {
          // Ponovi upit sa novim tokenom nakon rotacije
          const retryHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshResult.accessToken}`,
          };
          const retryResponse = await fetch('/api/auth/me', {
            method: 'GET',
            headers: retryHeaders,
            credentials: 'include',
          });
          return await retryResponse.json();
        }
        this.clearStoredTokens();
        return { success: false, error: 'Sesija je istekla.' };
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err?.message || 'Greška pri proveri sesije.' };
    }
  },

  /**
   * Odjavljuje korisnika preko /api/auth/logout.
   */
  async logout(): Promise<AuthResponse> {
    try {
      const storedRefresh = this.getStoredRefreshToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedRefresh) {
        headers['x-refresh-token'] = storedRefresh;
      }

      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: storedRefresh ? JSON.stringify({ refreshToken: storedRefresh }) : undefined,
      });

      this.clearStoredTokens();
      const data = await response.json();
      return data;
    } catch (err: any) {
      this.clearStoredTokens();
      return { success: false, error: err?.message || 'Greška pri odjavi.' };
    }
  },

  /**
   * INSTANT OPOZIV SVIH SESIJA ("Sign out of all devices")
   */
  async revokeAllSessions(): Promise<AuthResponse> {
    try {
      const token = this.getStoredAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/auth/revoke-all', {
        method: 'POST',
        headers,
        credentials: 'include',
      });

      this.clearStoredTokens();
      return await response.json();
    } catch (err: any) {
      this.clearStoredTokens();
      return { success: false, error: err?.message || 'Greška pri opozivu svih sesija.' };
    }
  },

  /**
   * Dobavlja izveštaj sigurnosnog audita sa backend-a
   */
  async getSecurityAudit(): Promise<any> {
    try {
      const token = this.getStoredAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch('/api/auth/security-audit', {
        method: 'GET',
        headers,
        credentials: 'include',
      });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (err: any) {
      return { error: err?.message || 'Neuspešan dohvatanje sigurnosnog izveštaja.' };
    }
  },

  /**
   * Zahteva link za reset lozinke preko /api/auth/forgot-password.
   * Server uvek vraća konstantan odgovor (bez enumeracije naloga).
   */
  async forgotPassword(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim() }),
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Greška pri zahtevu za reset lozinke.' };
    }
  },

  /**
   * Resetuje lozinku pomoću jednokratnog tokena preko /api/auth/reset-password.
   */
  async resetPassword(token: string, newPassword: string): Promise<AuthResponse> {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, newPassword }),
      });
      return await response.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Greška pri resetovanju lozinke.' };
    }
  },

  /**
   * Autoritativno razrešava ulogu korisnika iz Supabase sesije preko backend-a.
   * Server verifikuje Supabase token i čita ulogu (app_users/service_role),
   * umesto oslanjanja na anon RLS čitanje na klijentu.
   */
  async resolveRole(supabaseAccessToken: string): Promise<AuthUser | null> {
    if (!supabaseAccessToken) return null;
    try {
      const response = await fetch('/api/auth/resolve-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ supabaseAccessToken }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data?.user ?? null;
    } catch {
      return null;
    }
  },

  /**
   * Čisti zaostale nepotrebne tokene (kompatibilnost)
   */
  cleanupLegacyStorageTokens(): void {
    // Uklanja zaostale token-e iz starijih verzija koje su ih čuvale u localStorage.
    this.clearStoredTokens();
  },
};
