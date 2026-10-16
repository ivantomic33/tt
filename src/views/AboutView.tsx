import React from 'react';
import { ShieldCheck, Award, Users, Terminal } from 'lucide-react';

interface AboutViewProps {
  onNavigateHome: () => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigateHome }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs uppercase font-bold tracking-widest text-[#a855f7]">
          O Nama & Manifest
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wider text-white">
          NEXUS GAMING PORTAL
        </h1>
        <p className="text-base text-[#a1a1a1] max-w-2xl mx-auto leading-relaxed">
          Nezavisno novinarstvo posvećeno video igrama, hardverskim inovacijama, industrijskim analizama i esport dešavanjima na Balkanu.
        </p>
      </div>

      {/* Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl bg-[#141414] border border-[#262626] space-y-3">
          <ShieldCheck className="w-8 h-8 text-[#22d3ee]" />
          <h3 className="font-display text-lg font-bold text-white uppercase">
            Nepristrasnost
          </h3>
          <p className="text-xs text-[#a1a1a1] leading-relaxed">
            Naše recenzije i stavovi nisu sponzorisani. Ako je igra loše optimizovana ili puna mikrotransakcija, to otvoreno kažemo.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#141414] border border-[#262626] space-y-3">
          <Award className="w-8 h-8 text-[#a855f7]" />
          <h3 className="font-display text-lg font-bold text-white uppercase">
            Sistem Ocenjivanja
          </h3>
          <p className="text-xs text-[#a1a1a1] leading-relaxed">
            Koristimo skalu od 1 do 10 sa decimalnim rangiranjem. Ocena 9+ rezervisana je samo za naslove koji redefinišu standarde svog žanra.
          </p>
        </div>

        <div className="p-6 rounded-xl bg-[#141414] border border-[#262626] space-y-3">
          <Users className="w-8 h-8 text-[#22c55e]" />
          <h3 className="font-display text-lg font-bold text-white uppercase">
            Zajednica na Prvom Mestu
          </h3>
          <p className="text-xs text-[#a1a1a1] leading-relaxed">
            Aktivno pratimo komentare, organizujemo diskusije na Discordu i prenosimo glas domaće gaming scene.
          </p>
        </div>
      </div>

      {/* Tech & Editorial Overview */}
      <div className="p-8 rounded-2xl bg-[#141414] border border-[#262626] space-y-4">
        <div className="flex items-center gap-2 text-[#22d3ee]">
          <Terminal className="w-5 h-5" />
          <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
            O Projektu
          </h3>
        </div>
        <p className="text-sm text-[#d4d4d8] leading-relaxed">
          NEXUS Gaming Portal razvijen je kao brz, moderan, tipski siguran Content Management System (CMS) skrojen prema specifičnim potrebama gaming redakcija. Sadrži kompletan administratorski panel, integrisanu analitiku, modul za AI pripremu nacrta članaka, i optimizovanu tamnu temu za maksimalnu čitljivost.
        </p>
        <div className="pt-4 border-t border-[#262626] flex items-center justify-between text-xs text-[#71717a]">
          <span>Glavni urednik: Ivan Tomić</span>
          <span>Verzija 1.0</span>
        </div>
      </div>
    </div>
  );
};
