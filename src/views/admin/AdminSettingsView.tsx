import React, { useState } from 'react';
import {
  Settings,
  Database,
  Download,
  Upload,
  RotateCcw,
  User,
  Shield,
  Save,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { SiteSettings } from '../../types';
import { StorageService } from '../../services/storage';
import { supabaseUrl, isSupabaseConfigured } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';

interface AdminSettingsViewProps {
  settings: SiteSettings;
  onRefresh: () => void;
}

export const AdminSettingsView: React.FC<AdminSettingsViewProps> = ({
  settings: initialSettings,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [siteName, setSiteName] = useState(initialSettings.siteName);
  const [tagline, setTagline] = useState(initialSettings.tagline);
  const [contactEmail, setContactEmail] = useState(initialSettings.contactEmail);
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.updateSettings({
      siteName: siteName.trim(),
      tagline: tagline.trim(),
      contactEmail: contactEmail.trim(),
    });
    showToast('Podešavanja portala su sačuvana.', 'success');
    onRefresh();
  };

  const handleExportJson = () => {
    const json = StorageService.exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexus_gaming_backup_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Kompletna baza je izvezena u JSON formatu.', 'success');
  };

  const handleImportJson = () => {
    if (!importJsonText.trim()) {
      showToast('Nalepite validan JSON sadržaj za uvoz.', 'error');
      return;
    }
    const ok = StorageService.importDatabase(importJsonText);
    if (ok) {
      showToast('Baza je uspešno uvezena!', 'success');
      setImportJsonText('');
      setShowImportArea(false);
      onRefresh();
    } else {
      showToast('Greška pri parsiranju JSON podataka.', 'error');
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Da li ste sigurni da želite da resetujete sve podatke na fabričke fabričke vesti?')) {
      StorageService.resetToDefault();
      showToast('Baza je resetovana na podrazumevane gejming vesti.', 'success');
      onRefresh();
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
          Podešavanja & Baza Podataka
        </h1>
        <p className="text-xs text-[#a1a1a1]">
          Konfigurišite identitet portala, profile i upravljajte rezervnim kopijama (backup).
        </p>
      </div>

      {/* Portal Branding Form */}
      <form onSubmit={handleSaveSettings} className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#a855f7] pb-3 border-b border-[#262626]">
          <Settings className="w-5 h-5 text-[#22d3ee]" />
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
            Identitet Portala
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
              Naziv Portala
            </label>
            <input
              type="text"
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
              Službeni Email
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={e => setContactEmail(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#a1a1a1] mb-1.5">
            Slogan (Tagline)
          </label>
          <input
            type="text"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#a855f7]"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Sačuvaj izmene</span>
          </button>
        </div>
      </form>

      {/* Admin Profile Info */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#a855f7] pb-3 border-b border-[#262626]">
          <Shield className="w-5 h-5 text-[#22c55e]" />
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
            Administrator Nalog
          </h3>
        </div>

        <div className="flex items-center gap-4">
          <img
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
            alt="Admin Avatar"
            className="w-14 h-14 rounded-full object-cover border border-[#3f3f46]"
          />
          <div>
            <h4 className="text-sm font-semibold text-white">Ivan Tomić</h4>
            <span className="text-xs text-[#22d3ee] font-mono">admin@gamingnews.gg</span>
            <div className="mt-1 text-[11px] text-[#71717a]">
              Uloga: Super Administrator (Puni CMS pristup)
            </div>
          </div>
        </div>
      </div>

      {/* Database Management & Backups */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2 text-[#a855f7] pb-3 border-b border-[#262626]">
          <Database className="w-5 h-5 text-[#38bdf8]" />
          <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
            Baza Podataka & Rezervne Kopije
          </h3>
        </div>

        <p className="text-xs text-[#a1a1a1] leading-relaxed">
          Svi podaci (vesti, kategorije, tagovi, komentari i newsletter lista) čuvaju se u perzistentnom lokalnom skladištu pregledača. Možete izvesti kompletnu bazu kao JSON za bezbedan backup ili prenos.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-2 px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Download className="w-4 h-4 text-[#22d3ee]" />
            <span>Izvezi JSON Backup</span>
          </button>

          <button
            onClick={() => setShowImportArea(!showImportArea)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4 text-[#a855f7]" />
            <span>Uvezi JSON Bazu</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-2 px-4 py-2 bg-[#1c1c1c] hover:bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-xs font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Resetuj na Početne Podatke</span>
          </button>
        </div>

        {showImportArea && (
          <div className="pt-4 border-t border-[#262626] space-y-3">
            <label className="block text-xs font-semibold text-[#a1a1a1]">
              Nalepite JSON sadržaj za vraćanje baze:
            </label>
            <textarea
              rows={5}
              value={importJsonText}
              onChange={e => setImportJsonText(e.target.value)}
              placeholder='{"posts": [...], "categories": [...]}'
              className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-[#a855f7]"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowImportArea(false)}
                className="px-3 py-1.5 text-xs text-[#71717a] hover:text-white"
              >
                Otkaži
              </button>
              <button
                onClick={handleImportJson}
                className="px-4 py-1.5 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase rounded-lg"
              >
                Potvrdi Uvoz
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Supabase Cloud Database Integration */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="font-display text-base font-bold uppercase tracking-wider text-white">
              Supabase Integracija & Konekcija
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#a855f7] px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20">
            @supabase/ssr aktivan
          </span>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-lg bg-[#1a1a1a] border border-[#262626] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[#a1a1a1] block">Supabase URL projekta:</span>
              <span className="font-mono text-white select-all">
                {isSupabaseConfigured() ? supabaseUrl : 'Nije konfigurisano (postavite VITE_SUPABASE_URL)'}
              </span>
            </div>
            <span
              className={`text-[11px] font-semibold flex items-center gap-1 ${
                isSupabaseConfigured() ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSupabaseConfigured() ? 'Kredencijali konfigurisani' : 'Nedostaje konfiguracija'}
            </span>
          </div>

          <p className="text-[#a1a1a1] leading-relaxed">
            Kompletna SQL skripta sa tabelama (<code className="text-purple-400">posts</code>, <code className="text-purple-400">categories</code>, <code className="text-purple-400">tags</code>, <code className="text-purple-400">comments</code>, <code className="text-purple-400">newsletter_subscribers</code>), RLS pravilima i inicijalnim vestima nalazi se u <code className="text-purple-400 font-mono">supabase/schema.sql</code>.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={async () => {
              showToast('Testiram konekciju sa Supabase-om...', 'info');
              const res = await StorageService.testSupabaseConnection();
              showToast(res.message, res.success ? 'success' : 'info');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-md"
          >
            <Database className="w-4 h-4" />
            <span>Testiraj Supabase Konekciju</span>
          </button>

          <button
            type="button"
            onClick={async () => {
              showToast('Preuzimam podatke iz Supabase baze...', 'info');
              const res = await StorageService.syncFromSupabase();
              showToast(res.message, res.success ? 'success' : 'error');
              if (res.success && res.count > 0) {
                onRefresh();
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-cyan-400 text-xs font-semibold rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Sinhronizuj Vesti iz Supabase-a</span>
          </button>

          {isSupabaseConfigured() && (
            <a
              href={`https://supabase.com/dashboard/project/${supabaseUrl.replace(/^https?:\/\//, '').split('.')[0]}/sql`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-[#a1a1a1] hover:text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <span>Otvori Supabase SQL Editor</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
