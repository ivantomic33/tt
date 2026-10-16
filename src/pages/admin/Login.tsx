import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, Shield, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { ApiAuth } from '../../services/apiAuth';
import { isConfiguredAdminEmail } from '../../utils/adminEmails';

interface LoginProps {
  /** Opcioni callback ukoliko se koristi unutar state-based rutera */
  onSuccess?: (role?: string) => void;
  /** Opcioni callback za navigaciju na register stranicu */
  onNavigateRegister?: () => void;
  /** Ciljna ruta nakon uspešne prijave */
  redirectUrl?: string;
}

export const Login: React.FC<LoginProps> = ({
  onSuccess,
  onNavigateRegister,
  redirectUrl = '/admin',
}) => {
  const { signIn, user: currentAuthUser, role: currentAuthRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Greške validacije polja
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Globalna greška forme
  const [authError, setAuthError] = useState('');

  // Stanja učitavanja
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Funkcija za određivanje uloge iz app_users tabele
  const resolveRole = async (userId: string, userEmail?: string): Promise<string> => {
    const cleanEmail = (userEmail || '').trim().toLowerCase();

    try {
      const { data } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (data?.role) return data.role;
    } catch {
      // ignore
    }

    if (isConfiguredAdminEmail(cleanEmail)) {
      return 'admin';
    }

    return 'user';
  };

  // Funkcija za pametno preusmeravanje u zavisnosti od uloge
  const handleRedirect = async (userId?: string, userEmail?: string) => {
    let resolvedRole = 'user';
    if (userId && userId.length > 20 && !userId.includes('/')) {
      resolvedRole = await resolveRole(userId, userEmail);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        resolvedRole = await resolveRole(session.user.id, session.user.email);
      }
    }

    if (onSuccess) {
      onSuccess(resolvedRole);
    } else {
      if (resolvedRole === 'admin') {
        window.location.href = redirectUrl || '/admin';
      } else {
        window.location.href = '/';
      }
    }
  };

  // Provera postojeće sesije pri mount-ovanju (F5 refresh)
  useEffect(() => {
    let isMounted = true;

    const checkExistingAuth = async () => {
      try {
        // 1. Ako AuthContext već ima ulogovanog korisnika
        if (currentAuthUser && isMounted) {
          await handleRedirect(currentAuthUser.id, currentAuthUser.email);
          return;
        }

        // 2. Proveri backend sesiju preko ApiAuth
        const apiRes = await ApiAuth.getMe();
        if (apiRes.success && apiRes.user && isMounted) {
          if (onSuccess) onSuccess(apiRes.user.role);
          else if (apiRes.user.role === 'admin') window.location.href = redirectUrl || '/admin';
          else window.location.href = '/';
          return;
        }

        // 3. Proveri Supabase sesiju
        const { data: { session } } = await supabase.auth.getSession();
        const localUser = StorageService.getCurrentUser();

        if (session?.user && isMounted) {
          await handleRedirect(session.user.id, session.user.email);
          return;
        } else if (localUser && isMounted) {
          if (onSuccess) onSuccess('admin');
          else window.location.href = '/admin';
          return;
        }
      } catch (err) {
        console.warn('Greška pri proveri sesije:', err);
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
      }
    };

    checkExistingAuth();

    return () => {
      isMounted = false;
    };
  }, [currentAuthUser]);

  // Validacija forme pre slanja
  const validate = (): boolean => {
    let isValid = true;
    setEmailError('');
    setPasswordError('');
    setAuthError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Molimo unesite email adresu.');
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Unesite validnu email adresu.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Molimo unesite lozinku.');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Lozinka mora imati najmanje 6 karaktera.');
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setAuthError('');

    try {
      const cleanEmail = email.trim();

      // Koristi unificirani AuthContext signIn koji postavlja i kolačiće i localStorage tokene i Supabase sesiju
      const { error } = await signIn(cleanEmail, password);

      if (error) {
        console.error('Auth greška pri prijavi:', error);
        setAuthError(error.message || 'Pogrešan email ili lozinka');
        setIsLoading(false);
        return;
      }

      await handleRedirect();
    } catch (err: any) {
      console.error('Neočekivana greška pri prijavi:', err);
      setAuthError(err?.message || 'Pogrešan email ili lozinka');
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#08080c] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="text-xs text-zinc-400">Provera sesije...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c] flex items-center justify-center p-4 relative overflow-hidden font-body">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Main Container - Borderless Card */}
      <div className="relative w-full max-w-[420px]">
        <div className="relative w-full bg-[#111116]/90 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.85)] overflow-hidden">
          
          {/* Header Branding */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>NEXUS GG CMS PANEL</span>
            </div>

            <div className="mb-2">
              <span className="font-display text-3xl font-black tracking-wider text-white">
                NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">GG</span>
              </span>
            </div>
            
            <h1 className="text-lg font-bold text-white tracking-tight">
              Admin Prijava
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Unesite vaše podatke za pristup uredničkom panelu
            </p>
          </div>

          {/* Auth Error Banner */}
          {authError && (
            <div 
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 text-red-400 text-xs flex items-center gap-2.5 animate-fadeIn"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email field */}
            <div>
              <label 
                htmlFor="admin-email" 
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                Email adresa
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                    if (authError) setAuthError('');
                  }}
                  placeholder="admin@nexus.gg"
                  className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-4 py-3 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                    emailError 
                      ? 'bg-red-950/20 text-red-200 placeholder:text-red-400/50' 
                      : 'focus:bg-[#0f0f16]'
                  }`}
                />
              </div>
              {emailError && (
                <p className="mt-1.5 text-xs text-red-400">{emailError}</p>
              )}
            </div>

            {/* Password field */}
            <div>
              <label 
                htmlFor="admin-password" 
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                Lozinka
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                    if (authError) setAuthError('');
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-10 py-3 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                    passwordError 
                      ? 'bg-red-950/20 text-red-200 placeholder:text-red-400/50' 
                      : 'focus:bg-[#0f0f16]'
                  }`}
                />
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-400">{passwordError}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Prijavljujem...</span>
                  </>
                ) : (
                  <>
                    <span>Prijavi Se u CMS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Registration Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-400">
              Nemate administrator nalog?{' '}
              <a
                href="/admin/register"
                onClick={(e) => {
                  if (onNavigateRegister) {
                    e.preventDefault();
                    onNavigateRegister();
                  }
                }}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors cursor-pointer"
              >
                Registrujte se
              </a>
            </p>
          </div>

          {/* Back Home Link */}
          <div className="mt-6 pt-4 border-t border-white/5 text-center">
            <a
              href="/"
              onClick={(e) => {
                if (onSuccess) {
                  e.preventDefault();
                  window.history.pushState(null, '', '/');
                  window.location.href = '/';
                }
              }}
              className="text-xs text-zinc-500 hover:text-zinc-300 inline-flex items-center gap-1.5 transition-colors py-1 px-3 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Povratak na portal</span>
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
