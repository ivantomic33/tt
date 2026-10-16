import React, { useMemo, useState } from 'react';
import { Loader2, Lock, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff, ShieldCheck, XCircle } from 'lucide-react';
import { ApiAuth } from '../services/apiAuth';

interface ResetPasswordViewProps {
  onNavigateHome: () => void;
}

const RULES = [
  { key: 'length', label: 'Najmanje 8 karaktera' },
  { key: 'upper', label: 'Bar jedno veliko slovo' },
  { key: 'lower', label: 'Bar jedno malo slovo' },
  { key: 'digit', label: 'Bar jedan broj' },
] as const;

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({ onNavigateHome }) => {
  const token = useMemo(() => {
    try {
      return new URLSearchParams(window.location.search).get('token') || '';
    } catch {
      return '';
    }
  }, []);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const checks: Record<string, boolean> = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    digit: /\d/.test(password),
  };
  const isStrong = Object.values(checks).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Nedostaje token za resetovanje. Otvorite link iz email-a ponovo.');
      return;
    }
    if (!isStrong) {
      setError('Lozinka ne zadovoljava bezbednosne uslove.');
      return;
    }
    if (password !== confirm) {
      setError('Lozinke se ne poklapaju.');
      return;
    }

    setLoading(true);
    const res = await ApiAuth.resetPassword(token, password);
    setLoading(false);

    if (res.success) {
      setSuccess(true);
      window.setTimeout(onNavigateHome, 2600);
    } else {
      setError(res.error || 'Resetovanje lozinke nije uspelo. Link je možda istekao ili je već iskorišćen.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-600/15 border border-purple-500/30 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">Resetovanje lozinke</h1>
            <p className="text-xs text-zinc-400">Nexus Gaming Portal</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#111114] p-6 shadow-2xl">
          {!token ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-amber-400">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm">
                  Link za resetovanje nije validan ili je istekao. Zatražite novi link sa stranice za prijavu.
                </p>
              </div>
              <button
                onClick={onNavigateHome}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-3 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Nazad na početnu
              </button>
            </div>
          ) : success ? (
            <div className="space-y-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <p className="text-sm text-zinc-300">
                Lozinka je uspešno promenjena. Bićete preusmereni na početnu stranicu...
              </p>
              <button
                onClick={onNavigateHome}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium py-3 transition-colors"
              >
                Idi na prijavu
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="new-password">
                  Nova lozinka
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-purple-500/60 outline-none text-sm text-white placeholder-zinc-600 py-3 pl-10 pr-10 transition-colors"
                    placeholder="Unesite novu lozinku"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    aria-label="Prikaži lozinku"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5" htmlFor="confirm-password">
                  Potvrdite lozinku
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    className="w-full rounded-xl bg-[#0a0a0a] border border-white/10 focus:border-purple-500/60 outline-none text-sm text-white placeholder-zinc-600 py-3 pl-10 pr-3 transition-colors"
                    placeholder="Ponovite novu lozinku"
                  />
                </div>
              </div>

              <ul className="space-y-1.5 pt-1">
                {RULES.map((rule) => {
                  const ok = checks[rule.key];
                  return (
                    <li
                      key={rule.key}
                      className={`flex items-center gap-2 text-xs ${ok ? 'text-emerald-400' : 'text-zinc-500'}`}
                    >
                      {ok ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {rule.label}
                    </li>
                  );
                })}
              </ul>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium py-3 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {loading ? 'Menjam lozinku...' : 'Postavi novu lozinku'}
              </button>

              <button
                type="button"
                onClick={onNavigateHome}
                className="w-full inline-flex items-center justify-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 py-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Nazad na početnu
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
