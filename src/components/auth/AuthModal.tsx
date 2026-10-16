import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Sparkles,
  Check,
  ArrowRight,
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { isConfiguredAdminEmail } from '../../utils/adminEmails';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onSuccess?: (role?: string) => void;
  onNavigateAdminLogin?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onSuccess,
  onNavigateAdminLogin,
}) => {
  const { showToast } = useToast();
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');

  // Legal modal state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTermsModal) {
      setHasScrolledToBottom(false);
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          const el = scrollContainerRef.current;
          if (el.scrollHeight <= el.clientHeight + 15) {
            setHasScrolledToBottom(true);
          }
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showTermsModal]);

  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation & Loading
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [authError, setAuthError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    setMode(initialMode);
    resetForm();
  }, [initialMode, isOpen]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setConfirmPassword('');
    setAcceptTerms(false);
    setForgotEmail('');
    setForgotSuccess('');
    setForgotError('');
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setTermsError('');
    setAuthError('');
    setSuccessMsg('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowTermsModal(false);
    setHasScrolledToBottom(false);
  };

  if (!isOpen) return null;

  // Utility to determine role
  const checkAdminEmail = (emailStr: string): boolean => {
    return isConfiguredAdminEmail(emailStr);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setAuthError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setEmailError('Unesite vašu email adresu.');
      return;
    }
    if (!password) {
      setPasswordError('Unesite vašu lozinku.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(trimmedEmail, password);

      if (error) {
        setAuthError(error.message || 'Pogrešan email ili lozinka.');
        setIsLoading(false);
        return;
      }

      const isUserAdmin = checkAdminEmail(trimmedEmail);
      const userRole = isUserAdmin ? 'admin' : 'user';

      showToast(
        userRole === 'admin'
          ? 'Prijavljeni ste kao administrator.'
          : `Dobrodošli nazad, ${trimmedEmail.split('@')[0]}!`,
        'success'
      );

      resetForm();
      onClose();
      if (onSuccess) onSuccess(userRole);
    } catch (err) {
      console.error('Greška pri prijavi:', err);
      setAuthError('Došlo je do neočekivane greške.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setTermsError('');
    setAuthError('');
    setSuccessMsg('');

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    let valid = true;

    if (!trimmedName || trimmedName.length < 2) {
      setNameError('Korisničko ime / GamerTag mora imati najmanje 2 karaktera.');
      valid = false;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Unesite ispravnu email adresu.');
      valid = false;
    }

    // Strict validation matching criteria
    const hasMinLen = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNum = /[0-9]/.test(password);
    const hasSpec = /[^A-Za-z0-9]/.test(password);

    if (!hasMinLen || !hasUpper || !hasLower || !hasNum || !hasSpec) {
      setPasswordError('Lozinka mora zadovoljiti sve bezbednosne zahteve.');
      valid = false;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Lozinke se ne podudaraju.');
      valid = false;
    }

    if (!acceptTerms) {
      setTermsError('Morate prihvatiti uslove korišćenja.');
      valid = false;
    }

    if (!valid) return;

    setIsLoading(true);

    try {
      const { error } = await signUp(trimmedEmail, password, trimmedName);

      if (error) {
        const errorMsg = error.message || 'Greška pri registraciji.';
        setAuthError(errorMsg);
        const lower = errorMsg.toLowerCase();
        if (lower.includes('email') || lower.includes('adresa')) {
          setEmailError(errorMsg);
        }
        if (
          lower.includes('korisničko ime') ||
          lower.includes('username') ||
          lower.includes('ime') ||
          lower.includes('zajednici')
        ) {
          setNameError(errorMsg);
        }
        setIsLoading(false);
        return;
      }

      const assignedRole = checkAdminEmail(trimmedEmail) ? 'admin' : 'user';

      showToast('Nalog je uspešno kreiran! Dobrodošli na NEXUS GG.', 'success');
      resetForm();
      onClose();
      if (onSuccess) onSuccess(assignedRole);
    } catch (err) {
      console.error('Greška pri registraciji:', err);
      setAuthError('Došlo je do neočekivane greške.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setForgotError('Unesite ispravnu email adresu.');
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (error) {
        setForgotError(error.message || 'Greška pri slanju zahteva za resetovanje lozinke.');
      } else {
        setForgotSuccess('Link za resetovanje lozinke je poslat na vašu email adresu.');
        showToast('Link za resetovanje lozinke je poslat.', 'success');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'Došlo je do neočekivane greške.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Password requirements calculation
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

  const getPasswordStrength = () => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (hasMinLength) score += 1;
    if (hasUpperCase) score += 1;
    if (hasLowerCase) score += 1;
    if (hasNumber) score += 1;
    if (hasSpecialChar) score += 1;

    if (score <= 2) return { score, label: 'Slaba lozinka', color: 'bg-red-500' };
    if (score === 3 || score === 4) return { score, label: 'Umerena lozinka', color: 'bg-amber-500' };
    return { score: 5, label: 'Jaka lozinka', color: 'bg-emerald-500' };
  };

  const pwdStrength = getPasswordStrength();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
        {/* Background Dimming Click to close */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Main Container - Clean Borderless Design */}
        <div
          className="relative w-full max-w-lg bg-[#111116]/95 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden z-10 transition-all duration-300 max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Soft Ambient Radial Glow Behind Modal Content */}
          <div className="absolute -top-32 -right-32 w-72 h-72 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all cursor-pointer z-20"
            title="Zatvori"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Brand Header */}
          <div className="text-center mb-6 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>NEXUS GG COMMUNITY PORTAL</span>
            </div>

            <h2 className="text-2xl font-black tracking-tight text-white font-display">
              {mode === 'forgot' ? 'Resetovanje Lozinke' : mode === 'login' ? 'Dobrodošli Nazad' : 'Pridružite Se Zajednici'}
            </h2>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
              {mode === 'forgot'
                ? 'Unesite svoju email adresu za prijem linka za resetovanje lozinke.'
                : mode === 'login'
                ? 'Prijavite se da biste komentarisali, sačuvali vesti i prilagodili svoj gaming profil.'
                : 'Kreirajte besplatan nalog u nekoliko sekundi i postanite deo NEXUS GG zajednice.'}
            </p>
          </div>

          {/* Toggle Mode Segmented Controller (Hidden in Forgot Mode) */}
          {mode !== 'forgot' && (
            <div className="relative bg-[#09090d] p-1 rounded-2xl mb-6 flex items-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setAuthError('');
                  setSuccessMsg('');
                }}
                className={`relative flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'login'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Prijava</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setAuthError('');
                  setSuccessMsg('');
                }}
                className={`relative flex-1 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span>Registracija</span>
              </button>
            </div>
          )}

          {/* Auth Error Alert Banner */}
          {authError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-500/10 text-red-400 text-xs flex items-center gap-3 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span className="leading-snug">{authError}</span>
            </div>
          )}

          {/* Success Alert Banner */}
          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-3 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {forgotError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 text-red-400 text-xs flex items-center gap-3 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span className="leading-snug">{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs flex items-center gap-3 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span className="leading-snug">{forgotSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Email adresa
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={forgotEmail}
                    disabled={forgotLoading}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="vaš.email@example.com"
                    className="w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-4 py-3 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 focus:bg-[#0f0f16]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={forgotLoading}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-purple-600/25 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {forgotLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Slanje zahteva...</span>
                  </>
                ) : (
                  <>
                    <span>Pošalji Link za Resetovanje</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                  className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  ← Nazad na prijavu
                </button>
              </div>
            </form>
          ) : mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Email adresa
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    disabled={isLoading}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                      if (authError) setAuthError('');
                    }}
                    placeholder="vaš.email@example.com"
                    className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-4 py-3 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                      emailError
                        ? 'bg-red-950/20 text-red-200 placeholder:text-red-400/50'
                        : 'focus:bg-[#0f0f16]'
                    }`}
                  />
                </div>
                {emailError && <p className="mt-1.5 text-xs text-red-400">{emailError}</p>}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-zinc-300">
                    Lozinka
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
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
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passwordError && <p className="mt-1.5 text-xs text-red-400">{passwordError}</p>}
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#0a0a0e] text-purple-600 focus:ring-purple-500/30 cursor-pointer accent-purple-600"
                  />
                  <span className="text-xs text-zinc-400">Zapamti moju prijavu</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setAuthError('');
                    setSuccessMsg('');
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors cursor-pointer"
                >
                  Zaboravili ste lozinku?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Prijavljivanje...</span>
                  </>
                ) : (
                  <>
                    <span>Prijavi Se</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Full Name / Gamertag */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  GamerTag / Ime
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={fullName}
                    disabled={isLoading}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (nameError) setNameError('');
                      if (authError) setAuthError('');
                    }}
                    placeholder="GamerTag123"
                    className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                      nameError ? 'bg-red-950/20 text-red-200' : 'focus:bg-[#0f0f16]'
                    }`}
                  />
                </div>
                {nameError && <p className="mt-1 text-xs text-red-400">{nameError}</p>}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Email adresa
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    disabled={isLoading}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError('');
                    }}
                    placeholder="vaš.email@example.com"
                    className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-4 py-2.5 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                      emailError ? 'bg-red-950/20 text-red-200' : 'focus:bg-[#0f0f16]'
                    }`}
                  />
                </div>
                {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
              </div>

              {/* Password Field & Strength Meter */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Lozinka
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    disabled={isLoading}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) setPasswordError('');
                    }}
                    placeholder="Unesite sigurnu lozinku"
                    className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-10 py-2.5 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                      passwordError ? 'bg-red-950/20 text-red-200' : 'focus:bg-[#0f0f16]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Bar */}
                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                        style={{ width: `${(pwdStrength.score / 5) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-400">
                      <span>Snaga lozinke:</span>
                      <span className="font-semibold">{pwdStrength.label}</span>
                    </div>
                  </div>
                )}

                {/* Password Requirements Checklist (Compact 2-Column Grid) */}
                <div className="mt-2.5 p-2.5 bg-[#09090d]/80 rounded-xl border border-white/5 space-y-2 text-[11px]">
                  <div className="text-zinc-400 font-semibold mb-0.5 text-[10px] uppercase tracking-wider col-span-full">
                    Zahtevi za lozinku:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className={`flex items-center gap-2 transition-colors ${hasMinLength ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${hasMinLength ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>Najmanje 8 znakova</span>
                    </div>
                    <div className={`flex items-center gap-2 transition-colors ${hasUpperCase ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${hasUpperCase ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>Veliko slovo (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-2 transition-colors ${hasLowerCase ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${hasLowerCase ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>Malo slovo (a-z)</span>
                    </div>
                    <div className={`flex items-center gap-2 transition-colors ${hasNumber ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${hasNumber ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>Broj (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-2 transition-colors col-span-full ${hasSpecialChar ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${hasSpecialChar ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-600'}`}>
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>Specijalan znak (!@#$%^&* itd.)</span>
                    </div>
                  </div>
                </div>

                {passwordError && <p className="mt-1 text-xs text-red-400">{passwordError}</p>}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Potvrda lozinke
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    disabled={isLoading}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError('');
                    }}
                    placeholder="Ponovite lozinku"
                    className={`w-full bg-[#0a0a0e] text-white text-sm rounded-xl pl-10 pr-10 py-2.5 placeholder:text-zinc-600 focus:outline-none transition-all duration-200 ${
                      confirmPasswordError ? 'bg-red-950/20 text-red-200' : 'focus:bg-[#0f0f16]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && (
                  <p className={`mt-1.5 text-xs font-medium flex items-center gap-1 ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                    {password === confirmPassword ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Lozinke se poklapaju</span>
                      </>
                    ) : (
                      <>
                        <X className="w-3.5 h-3.5" />
                        <span>Lozinke se ne poklapaju</span>
                      </>
                    )}
                  </p>
                )}
                {confirmPasswordError && (
                  <p className="mt-1 text-xs text-red-400">{confirmPasswordError}</p>
                )}
              </div>

              {/* Terms Checkbox (Triggers Legal Modal) */}
              <div className="pt-1">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="termsCheckbox"
                    checked={acceptTerms}
                    onClick={(e) => {
                      if (!acceptTerms) {
                        e.preventDefault();
                        setShowTermsModal(true);
                      }
                    }}
                    onChange={(e) => {
                      setAcceptTerms(e.target.checked);
                      if (termsError) setTermsError('');
                    }}
                    className="mt-0.5 w-4 h-4 rounded bg-[#0a0a0e] text-purple-600 focus:ring-purple-500/30 cursor-pointer accent-purple-600 shrink-0"
                  />
                  <label
                    htmlFor="termsCheckbox"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!acceptTerms) {
                        setShowTermsModal(true);
                      } else {
                        setAcceptTerms(false);
                      }
                    }}
                    className="text-xs text-zinc-400 leading-tight cursor-pointer hover:text-purple-300 transition-colors select-none"
                  >
                    Prihvatam uslove korišćenja i pravila privatnosti NEXUS GG portala.{' '}
                    <span className="text-purple-400 underline font-semibold inline-flex items-center gap-0.5 ml-0.5">
                      (Pročitaj tekst <ExternalLink className="w-3 h-3 inline" />)
                    </span>
                  </label>
                </div>
                {termsError && <p className="mt-1 text-xs text-red-400">{termsError}</p>}
              </div>

              {/* Community Benefits Pill Grid */}
              <div className="py-2.5 px-3.5 bg-purple-950/20 rounded-xl space-y-1.5 text-[11px] text-purple-200/80">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Komentarisanje i reakcije na gaming vesti</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  <span>Sačuvane vesti i prilagođeni pregled</span>
                </div>
              </div>

              {/* Submit Register Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all duration-200 shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Kreiranje naloga...</span>
                  </>
                ) : (
                  <>
                    <span>Registruj Se</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Link to Admin Login */}
          <div className="mt-6 pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onNavigateAdminLogin) {
                  onNavigateAdminLogin();
                } else {
                  window.location.href = '/admin/login';
                }
              }}
              className="text-xs text-zinc-500 hover:text-purple-400 flex items-center justify-center gap-1.5 mx-auto transition-colors py-1.5 px-3 rounded-lg hover:bg-white/5"
            >
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Administrator ste? Prijava za CMS Admin Panel</span>
            </button>
          </div>
        </div>
      </div>

      {/* LEGAL TERMS & PRIVACY POLICY MODAL */}
      {showTermsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setShowTermsModal(false)} />
          <div
            className="relative w-full max-w-2xl bg-[#14141c] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] z-10 text-zinc-300 flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-display">Uslovi korišćenja i Pravila privatnosti</h3>
                  <p className="text-xs text-zinc-400">NEXUS GG Gaming Portal — Važeće od Oktobra 2026.</p>
                </div>
              </div>
              <button
                onClick={() => setShowTermsModal(false)}
                className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Legal Content in Serbian */}
            <div
              ref={scrollContainerRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const isAtBottom = Math.ceil(el.scrollHeight - el.scrollTop) <= el.clientHeight + 10;
                if (isAtBottom) {
                  setHasScrolledToBottom(true);
                }
              }}
              className="overflow-y-auto pr-2 space-y-6 text-xs leading-relaxed text-zinc-300 max-h-[50vh] scrollbar-thin scrollbar-thumb-purple-500/30"
            >
              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-purple-400">1.</span> Uslovi korišćenja i odgovornost
                </h4>
                <p>
                  Dobrodošli na NEXUS GG gaming portal. Pristupanjem našem portalu i registracijom naloga prihvatate ove uslove u celosti. Svi korisnici su dužni da čuvaju poverljivost svojih pristupnih podataka (lozinke i email adrese). Administratori NEXUS GG portala ne snose odgovornost za neovlašćeno korišćenje naloga usled nemara korisnika.
                </p>
                <p className="italic text-zinc-400">
                  <strong>Pravno odricanje od odgovornosti (Disclaimer):</strong> Svi korisnički komentari, recenzije, forumi i autorske objave na NEXUS GG portalu predstavljaju isključivo lične stavove autora, a ne redakcije portala. NEXUS GG ni na koji način ne odgovara za sadržaj postavljen od strane trećih lica.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-purple-400">2.</span> Pravila zajednice i komentarisanja
                </h4>
                <p>
                  NEXUS GG neguje fer-plej, strast prema gejmingu i poštovanje. Strogo su zabranjeni:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-zinc-400">
                  <li>Govor mržnje, nacionalističke, verske ili rodne uvrede i diskriminacija.</li>
                  <li>Uznemiravanje, pretnje, vređanje drugih članova zajednice ili redakcije.</li>
                  <li>Spamovanje, reklamiranje komercijalnih usluga bez dozvole i deljenje lažnih vesti.</li>
                </ul>
                <p>
                  Administratori zadržavaju pravo da bez prethodnog upozorenja obrišu komentare, privremeno ili trajno zaključaju naloge koji krše pravila zajednice.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-purple-400">3.</span> Politika privatnosti i GDPR zaštita podataka
                </h4>
                <p>
                  Poštujemo vašu privatnost. Prilikom registracije sakupljamo isključivo neophodne podatke: vašu email adresu, korisničko ime (GamerTag) i enkriptovanu lozinku. Vaši podaci se čuvaju u bezbednoj bazi podataka uz primenu naprednih kriptografskih standarda.
                </p>
                <p>
                  Podaci se ne dele sa trećim licima i koriste se isključivo za funkcionisanje vašeg profila, personalizaciju sadržaja i učešće u diskusijama na portalu. U svakom trenutku možete zatražiti brisanje naloga i svih pripadajućih podataka slanjem zahteva našem administrativnom timu.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="text-purple-400">4.</span> Starosna granica i potvrda saglasnosti
                </h4>
                <p>
                  Potvrđivanjem ovih uslova izjavljujete da imate najmanje 16 godina (ili posedujete zakonsku saglasnost roditelja/staratelja) za učešće na NEXUS GG portalu, komentarisanje i deljenje sadržaja.
                </p>
              </section>
            </div>

            {/* Scroll Indicator helper if not scrolled */}
            {!hasScrolledToBottom && (
              <div className="my-3 py-2 px-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center text-[11px] text-purple-300 animate-pulse shrink-0">
                ↓ Molimo skrolujte do dna teksta da biste mogli da prihvatite uslove ↓
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-medium text-xs transition-colors cursor-pointer"
              >
                Zatvori
              </button>
              <button
                type="button"
                disabled={!hasScrolledToBottom}
                onClick={() => {
                  setAcceptTerms(true);
                  if (termsError) setTermsError('');
                  setShowTermsModal(false);
                  showToast('Uslovi korišćenja i pravila privatnosti su uspešno prihvaćeni.', 'success');
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-4 h-4" />
                <span>{hasScrolledToBottom ? 'Pročitao/la sam i slažem se' : 'Pročitajte do dna'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
