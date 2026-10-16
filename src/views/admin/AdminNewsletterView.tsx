import React, { useState } from 'react';
import { Mail, Download, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { NewsletterSubscriber } from '../../types';
import { StorageService } from '../../services/storage';
import { useToast } from '../../components/ui/Toast';

interface AdminNewsletterViewProps {
  subscribers: NewsletterSubscriber[];
  onRefresh: () => void;
}

export const AdminNewsletterView: React.FC<AdminNewsletterViewProps> = ({
  subscribers,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [newEmail, setNewEmail] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes('@')) {
      showToast('Unesite validnu email adresu', 'error');
      return;
    }
    const res = StorageService.addSubscriber(newEmail);
    if (res.success) {
      showToast(res.message, 'success');
      setNewEmail('');
      onRefresh();
    } else {
      showToast(res.message, 'info');
    }
  };

  const handleRemove = (id: string) => {
    StorageService.removeSubscriber(id);
    showToast('Pretplatnik je uklonjen.', 'info');
    onRefresh();
  };

  const exportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,Email,Datum_Prijave,Status\n' +
      subscribers.map(s => `${s.email},${s.subscribed_at},${s.active ? 'Aktivan' : 'Neaktivan'}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nexus_newsletter_subscribers_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('CSV lista je preuzeta.', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
            Newsletter Pretplatnici
          </h1>
          <p className="text-xs text-[#a1a1a1]">
            Upravljajte email listom za nedeljne gejming izveštaje i eksportujte kontakte.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1c1c1c] hover:bg-[#262626] border border-[#262626] text-xs font-semibold text-white rounded-lg transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-[#22d3ee]" />
          <span>Izvezi CSV</span>
        </button>
      </div>

      {/* Manual add input */}
      <form
        onSubmit={handleAdd}
        className="p-4 rounded-xl bg-[#141414] border border-[#262626] flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Mail className="w-4 h-4 text-[#71717a] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="email"
            required
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Dodaj novu email adresu ručno..."
            className="w-full bg-[#1c1c1c] border border-[#262626] rounded-lg pl-10 pr-3 py-2 text-xs text-white placeholder:text-[#71717a] focus:outline-none focus:border-[#a855f7]"
          />
        </div>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#a855f7] hover:bg-[#9333ea] text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dodaj</span>
        </button>
      </form>

      {/* Subscribers Table */}
      <div className="bg-[#141414] border border-[#262626] rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#1c1c1c] text-[#a1a1a1] uppercase font-bold tracking-wider border-b border-[#262626]">
            <tr>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Datum Prijave</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Akcija</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#71717a]">
                  Trenutno nema prijavljenih korisnika.
                </td>
              </tr>
            ) : (
              subscribers.map(sub => (
                <tr key={sub.id} className="hover:bg-[#1a1a1a] transition-colors">
                  <td className="py-3 px-4 font-mono text-white">{sub.email}</td>
                  <td className="py-3 px-4 text-[#71717a]">
                    {new Date(sub.subscribed_at).toLocaleDateString('sr-RS')}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#22c55e] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktivan
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleRemove(sub.id)}
                      className="p-1.5 rounded text-[#71717a] hover:text-[#ef4444] transition-colors"
                      title="Ukloni sa liste"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
