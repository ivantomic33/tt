import React, { useState } from 'react';
import { Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';
import { useToast } from '../components/ui/Toast';

export const ContactView: React.FC = () => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('news_tip');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      showToast('Molimo popunite sva obavezna polja.', 'error');
      return;
    }
    setSubmitted(true);
    showToast('Vaša poruka je uspešno poslata redakciji!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-xs uppercase font-bold tracking-widest text-[#22d3ee]">
          Redakcija & Prijave
        </span>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase tracking-wider text-white">
          Kontaktirajte Nas
        </h1>
        <p className="text-base text-[#a1a1a1] max-w-xl mx-auto leading-relaxed">
          Imate insajdersku vest, želite da pošaljete igru na recenziju ili imate predlog za saradnju?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Contact info box - 5 cols */}
        <div className="md:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl bg-[#141414] border border-[#262626] space-y-6">
            <h3 className="font-display text-lg font-bold uppercase tracking-wider text-white">
              Direktni kanali
            </h3>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#a855f7] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-[#71717a] block">Email redakcije</span>
                <a
                  href="mailto:redakcija@nexusgaming.gg"
                  className="text-sm font-semibold text-white hover:text-[#22d3ee] transition-colors"
                >
                  redakcija@nexusgaming.gg
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MessageSquare className="w-5 h-5 text-[#5865F2] shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-[#71717a] block">Zvanični Discord</span>
                <a
                  href="https://discord.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-white hover:text-[#5865F2] transition-colors"
                >
                  discord.gg/nexusgaming
                </a>
              </div>
            </div>

            <div className="pt-4 border-t border-[#262626]">
              <span className="text-xs text-[#71717a] block mb-1">Radno vreme redakcije:</span>
              <p className="text-xs text-[#a1a1a1]">Ponedeljak – Nedelja: 09:00 – 23:00</p>
            </div>
          </div>
        </div>

        {/* Form - 7 cols */}
        <div className="md:col-span-7">
          {submitted ? (
            <div className="p-8 rounded-2xl bg-[#141414] border border-[#22c55e]/30 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-[#22c55e] mx-auto" />
              <h3 className="font-display text-2xl font-bold text-white">
                Poruka primljena!
              </h3>
              <p className="text-xs text-[#a1a1a1] leading-relaxed max-w-sm mx-auto">
                Hvala vam što ste nas kontaktirali. Naš urednički tim će odgovoriti u roku od 24 sata.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setName('');
                  setEmail('');
                  setMessage('');
                }}
                className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#262626] border border-[#262626] text-white text-xs font-semibold rounded-lg"
              >
                Pošalji još jednu poruku
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="p-6 sm:p-8 rounded-2xl bg-[#141414] border border-[#262626] space-y-4"
            >
              <h3 className="font-display text-xl font-bold uppercase tracking-wider text-white mb-2">
                Pošaljite upit
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5">
                    Vaše ime ili organizacija *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="npr. Marko Marković"
                    className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a855f7]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5">
                    Email adresa *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="marko@primer.com"
                    className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a855f7]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5">
                  Tema poruke
                </label>
                <select
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#a855f7]"
                >
                  <option value="news_tip">Predlog vesti / Dojava</option>
                  <option value="review_code">Izdavač / Slanje igre za recenziju</option>
                  <option value="marketing">Marketing i sponzorstva</option>
                  <option value="correction">Ispravka u tekstu / Prijava greške</option>
                  <option value="general">Opšti upit</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a1a1a1] mb-1.5">
                  Tekst poruke *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Detaljno opišite vaš predlog ili upit..."
                  className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg p-3 text-sm text-white focus:outline-none focus:border-[#a855f7]"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors shadow-md"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Pošalji poruku redakciji</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
