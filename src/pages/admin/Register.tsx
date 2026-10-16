import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, Mail, User, Loader2, AlertCircle, CheckCircle2, Shield, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { StorageService } from '../../services/storage';
import { useAuth } from '../../contexts/AuthContext';
import { isConfiguredAdminEmail } from '../../utils/adminEmails';

interface RegisterProps {
  /** Opcioni callback ukoliko se koristi unutar state-based rutera */
  onSuccess?: (role?: string) => void;
  /** Opcioni callback za navigaciju na login stranicu */
  onNavigateLogin?: () => void;
  /** Ciljna ruta nakon uspešne prijave (podrazumevano '/admin') */
  redirectUrl?: string;
}

export const Register: React.FC<RegisterProps> = ({
  onSuccess,
  onNavigateLogin,
  redirectUrl = '/admin',
}) => {
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Vidljivost lozinki
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Greške validacije pojedinačnih polja
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');

  // Globalna greška / uspeh
  const [authError, setAuthError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Stanja učitavanja
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Funkcija za određivanje uloge
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

  // Funkcija za preusmeravanje u zavisnosti od uloge korisnika
  const handleRedirect = async (userId?: string, userEmail?: string) => {
    let role = 'user';
    if (userId && userId.length > 20 && !userId.includes('/')) {
      role = await resolveRole(userId, userEmail);
    } else {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        role = await resolveRole(session.user.id, session.user.email);
      }
    }

    if (onSuccess) {
      onSuccess(role);
    } else {
      if (role === 'admin') {
        window.location.href = redirectUrl || '/admin';
      } else {
        window.location.href = '/';
      }
    }
  };

  const handleGoToLogin = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (onNavigateLogin) {
      onNavigateLogin();
    } else {
      window.location.href = '/admin/login';
    }
  };

  // Provera sesije
  useEffect(() => {
    let isMounted = true;

    const checkExistingAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && isMounted) {
          handleRedirect(session.user.id, session.user.email);
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
  }, []);

  // Validacija forme
  const validate = (): boolean => {
    let isValid = true;
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setTermsError('');
    setAuthError('');

    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Molimo unesite korisničko ime / GamerTag (najmanje 2 karaktera).');
      isValid = false;
    }

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

    if (!confirmPassword) {
      setConfirmPasswordError('Molimo potvrdite lozinku.');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Lozinke se ne podudaraju.');
      isValid = false;
    }

    if (!acceptTerms) {
      setTermsError('Morate prihvatiti uslove korišćenja.');
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
    setSuccessMessage('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();

      const { error } = await signUp(cleanEmail, password, trimmedName);

      if (error) {
        const msg = error.message || 'Došlo je do greške, pokušajte ponovo.';
        const lowerMsg = msg.toLowerCase();
        if (
          lowerMsg.includes('already registered') ||
          lowerMsg.includes('email adresa je već registrovana') ||
          lowerMsg.includes('već postoji')
        ) {
          setEmailError(msg);
          setAuthError(msg);
        } else if (
          lowerMsg.includes('korisničko ime') ||
          lowerMsg.includes('username') ||
          lowerMsg.includes('zauzeto')
        ) {
          setNameError(msg);
          setAuthError(msg);
        } else if (
          lowerMsg.includes('password') &&
          (lowerMsg.includes('weak') || lowerMsg.includes('least 6') || lowerMsg.includes('characters'))
        ) {
          setPasswordError('Lozinka je previše slaba');
          setAuthError('Lozinka je previše slaba');
        } else {
          setAuthError(msg);
        }
        return;
      }

      localStorage.removeItem('nexus_gaming_auth_v1');
      setSuccessMessage('Nalog je uspešno kreiran!');
      await handleRedirect();
    } catch (err: any) {
      console.error('Neočekivana greška pri registraciji:', err);
      setAuthError(err?.message || 'Došlo je do greške, pokušajte ponovo.');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Slaba lozinka', color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Umerena lozinka', color: 'bg-amber-500' };
    if (score === 3) return { score: 3, label: 'Dobra lozinka', color: 'bg-blue-500' };
    return { score: 4, label: 'Jaka lozinka', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength(password);

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
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-semibold mb-3">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>NEXUS GG CMS REGISTRACIJA</span>
            </div>

            <div className="mb-2">
              <span className="font-display text-3xl font-black tracking-wider text-white">
                NEXUS <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">GG</span>
              </span>
            </div>
            
            <h1 className="text-lg font-bold text-white tracking-tight">
              Kreirajte Nalog
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Registrujte se za pristup CMS sistemu
            </p>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div 
              role="status"
              className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-2.5 animate-fadeIn"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="flex-1">
                <span className="font-semibold">{successMessage}</span>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Nakon verifikacije u pošti, možete se prijaviti.
                </p>
              </div>
            </div>
          )}

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

          {/* Registration Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Username / GamerTag Field */}
            <div>
              <label 
                htmlFor="register-name" 
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                Korisničko ime / GamerTag
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="register-name"
                  type="text"
                  autoComplete="username"
                  value={name}
                  disabled={isLoading}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError('');
                    if (authError) setAuthError('');
                  }}
                  placeholder="npr. IvanT / AdminGamer"
                  className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-4 py-3 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                    nameError 
                      ? 'bg-red-950/20 text-red-200 placeholder:text-red-400/50' 
                      : 'focus:bg-[#0f0f16]'
                  }`}
                />
              </div>
              {nameError && (
                <p className="mt-1.5 text-xs text-red-400">{nameError}</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label 
                htmlFor="register-email" 
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                Email adresa
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  disabled={isLoading}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                    if (authError) setAuthError('');
                  }}
                  placeholder="urednik@nexus.gg"
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

            {/* Password Field */}
            <div>
              <label 
                htmlFor="register-password" 
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                Lozinka
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  disabled={isLoading}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                    if (authError) setAuthError('');
                  }}
                  placeholder="Najmanje 6 karaktera"
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
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pwdStrength.score >= 1 ? pwdStrength.color : 'bg-transparent'
                      }`}
                      style={{ width: `${(pwdStrength.score / 4) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-400">
                    <span>Snaga lozinke:</span>
                    <span className="font-semibold">{pwdStrength.label}</span>
                  </div>
                </div>
              )}
              {passwordError && (
                <p className="mt-1.5 text-xs text-red-400">{passwordError}</p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label 
                htmlFor="register-confirm-password" 
                className="block text-xs font-semibold text-zinc-300 mb-1.5"
              >
                Potvrdite lozinku
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="register-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={isLoading}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (confirmPasswordError) setConfirmPasswordError('');
                    if (authError) setAuthError('');
                  }}
                  placeholder="Ponovite lozinku"
                  className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-10 py-3 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                    confirmPasswordError 
                      ? 'bg-red-950/20 text-red-200 placeholder:text-red-400/50' 
                      : 'focus:bg-[#0f0f16]'
                  }`}
                />
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                  aria-label={showConfirmPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPasswordError && (
                <p className="mt-1.5 text-xs text-red-400">{confirmPasswordError}</p>
              )}
            </div>

            {/* Checkbox: Accept Terms */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  disabled={isLoading}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    if (termsError) setTermsError('');
                  }}
                  className="mt-0.5 h-4 w-4 rounded bg-[#0a0a0e] text-purple-600 focus:ring-purple-500/30 cursor-pointer accent-purple-600"
                />
                <span className="text-xs text-zinc-300 leading-tight">
                  Prihvatam <span className="text-purple-400 hover:underline">uslove korišćenja</span> i pravila privatnosti portala
                </span>
              </label>
              {termsError && (
                <p className="mt-1 text-xs text-red-400">{termsError}</p>
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
                    <span>Registrujem...</span>
                  </>
                ) : (
                  <>
                    <span>Registruj Se</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-xs text-zinc-400">
              Već imate nalog?{' '}
              <a
                href="/admin/login"
                onClick={handleGoToLogin}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors cursor-pointer"
              >
                Prijavite se
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

export default Register;
