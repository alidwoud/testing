import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  FileText,
  AlertTriangle,
  Upload,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface VerifyEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  personId?: number | null;
  workerName?: string;
  qualificationTypeCode?: string;
  qualificationName?: string;
  existingLicenceNumber?: string;
}

export const VerifyEvidenceModal: React.FC<VerifyEvidenceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  personId,
  workerName,
  qualificationTypeCode,
  qualificationName,
  existingLicenceNumber,
}) => {
  const { activeProject, currentUser, addToast } = useApp();

  const [licenceNumber, setLicenceNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('WorkSafe Victoria');
  const [jurisdiction, setJurisdiction] = useState('VIC');
  const [issueDate, setIssueDate] = useState('2026-10-12');
  const [expiryDate, setExpiryDate] = useState('2027-10-12');
  const [noExpiry, setNoExpiry] = useState(false);
  const [evidenceDocName, setEvidenceDocName] = useState('Certificate_Completion_Oct2026.pdf');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLicenceNumber(existingLicenceNumber || `REF-${Math.floor(100000 + Math.random() * 900000)}`);
      // Default 1-year expiry for CPR/LVR, 5-year for others
      if (qualificationTypeCode === 'CPR' || qualificationTypeCode === 'LVR') {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        setExpiryDate(d.toISOString().slice(0, 10));
        setNoExpiry(false);
      } else if (qualificationTypeCode === 'WHITE_CARD') {
        setNoExpiry(true);
      } else {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 3);
        setExpiryDate(d.toISOString().slice(0, 10));
        setNoExpiry(false);
      }
    }
  }, [isOpen, existingLicenceNumber, qualificationTypeCode]);

  if (!isOpen || !personId) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenceNumber) {
      addToast('error', 'Missing Information', 'Licence or certificate number is required');
      return;
    }

    setIsVerifying(true);
    try {
      const payload = {
        personId,
        qualificationTypeCode: qualificationTypeCode || 'CPR',
        licenceNumber,
        issuingAuthority,
        jurisdiction,
        issueDate,
        expiryDate: noExpiry ? null : expiryDate,
        noExpiry,
      };

      const res = await fetch('/api/workforce/training/verify-renewal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to verify qualification');

      addToast(
        'success',
        'Credential Verified',
        `${qualificationTypeCode} credential verified and activated. Prior record archived in history.`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Verification Error', err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Verify Credential Evidence</h3>
              <p className="text-[11px] text-slate-400">
                {workerName} &bull; {qualificationName || qualificationTypeCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-5 space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{evidenceDocName}</div>
              <div className="text-[11px] text-blue-700">Uploaded Certificate &bull; Ready for Compliance Signoff</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Licence / Certificate Number
              </label>
              <input
                type="text"
                value={licenceNumber}
                onChange={(e) => setLicenceNumber(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Issuing Authority
              </label>
              <input
                type="text"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate}
                disabled={noExpiry}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none disabled:opacity-40"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="noExpiryCheck"
              checked={noExpiry}
              onChange={(e) => setNoExpiry(e.target.checked)}
              className="rounded border-slate-300 text-amber-500 focus:ring-0"
            />
            <label htmlFor="noExpiryCheck" className="text-slate-700 font-medium select-none cursor-pointer">
              No Expiry Date (Lifetime / Permanent Competency)
            </label>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all cursor-pointer shadow-md flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isVerifying ? 'Verifying...' : 'Approve & Activate Credential'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
