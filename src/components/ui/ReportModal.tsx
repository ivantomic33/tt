import React, { useState } from 'react';
import { ShieldAlert, X, Flag } from 'lucide-react';
import { StorageService } from '../../services/storage';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'thread' | 'reply' | 'comment';
  targetId: string | number;
  targetTitle: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [reason, setReason] = useState<'Spam' | 'Harassment' | 'Unmarked Spoilers' | 'Other'>('Spam');
  const [details, setDetails] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reporterName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Gost';

    StorageService.createReport({
      id: `rep_${Date.now()}`,
      targetType,
      targetId,
      targetTitle,
      reason,
      details,
      reporterName,
      createdAt: new Date().toISOString(),
      status: 'pending',
    });

    showToast('Prijava je uspešno poslata moderatorima na pregled.', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#141414] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-[#262626] bg-[#18181b]">
          <div className="flex items-center gap-2 text-amber-400">
            <Flag className="w-5 h-5" />
            <h3 className="font-display font-bold text-sm uppercase tracking-wider text-white">
              Prijavi Sadržaj
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Sadržaj koji se prijavljuje:
            </span>
            <p className="text-xs text-white bg-[#1c1c1c] p-2.5 rounded-lg border border-[#262626] truncate">
              {targetTitle}
            </p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Razlog prijave
            </label>
            <div className="space-y-2">
              {[
                { id: 'Spam', label: 'Spam / Reklama / Nerezonski sadržaj' },
                { id: 'Harassment', label: 'Uvrede / Toksičnost / Harasment' },
                { id: 'Unmarked Spoilers', label: 'Neoznačeni spojleri (Spoilers bez upozorenja)' },
                { id: 'Other', label: 'Ostalo / Kršenje pravila zajednice' },
              ].map(opt => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    reason === opt.id
                      ? 'bg-purple-600/10 border-purple-500 text-white'
                      : 'bg-[#1a1a1a] border-[#262626] text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={opt.id}
                    checked={reason === opt.id}
                    onChange={() => setReason(opt.id as any)}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Dodatni detalji (opciono)
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Opišite ukratko razlog prijave..."
              rows={3}
              className="w-full bg-[#1c1c1c] border border-[#262626] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#222] hover:bg-[#333] text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Otkaži
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              Pošalji Prijavu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
