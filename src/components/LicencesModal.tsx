import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  ShieldCheck,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  User,
  Building2,
  Award,
  ExternalLink,
} from 'lucide-react';

interface LicencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LicencesModal: React.FC<LicencesModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useApp();

  if (!isOpen) return null;

  const licences = [
    {
      id: 1,
      title: 'Victorian A-Grade Electrical Licence',
      number: 'EC44921',
      issuer: 'Energy Safe Victoria (ESV)',
      status: 'Valid',
      expiry: '30/11/2027',
      type: 'Trade Licence',
    },
    {
      id: 2,
      title: 'General Construction Induction (White Card)',
      number: 'CI-881923',
      issuer: 'WorkSafe Victoria',
      status: 'Valid',
      expiry: 'Perpetual',
      type: 'Site Safety',
    },
    {
      id: 3,
      title: 'CPR & Low Voltage Rescue (LVR Refresher)',
      number: 'CPR-2025-99',
      issuer: 'St John Ambulance Australia',
      status: 'Expiring Soon',
      expiry: '27/10/2026',
      warning: 'Renewal due in 14 days. Book refresher with supervisor.',
      type: 'Safety Compliance',
    },
    {
      id: 4,
      title: 'Working at Heights & EWP Competency',
      number: 'WAH-44102',
      issuer: 'Pinnacle Safety',
      status: 'Valid',
      expiry: '14/08/2028',
      type: 'Competency',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">My Licences & Qualifications</h3>
              <p className="text-xs text-slate-400">
                {currentUser.name} • {currentUser.companyName || 'Not Set'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Licences List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {licences.map((lic) => {
            const isExpiring = lic.status === 'Expiring Soon';
            return (
              <div
                key={lic.id}
                className={`p-4 rounded-2xl border-2 transition-all ${
                  isExpiring
                    ? 'bg-amber-950/20 border-amber-500/50'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      {lic.type}
                    </span>
                    <h4 className="text-sm font-black text-white mt-0.5">{lic.title}</h4>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      isExpiring
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {lic.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Licence / Rego No.</span>
                    <span className="font-mono font-bold text-slate-200">{lic.number}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Expiry Date</span>
                    <span className={`font-mono font-bold ${isExpiring ? 'text-amber-400' : 'text-slate-200'}`}>
                      {lic.expiry}
                    </span>
                  </div>
                </div>

                {lic.warning && (
                  <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{lic.warning}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <span>Synced with MAXIM FORGE People Register</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
