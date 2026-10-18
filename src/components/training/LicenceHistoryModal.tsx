import React, { useState, useEffect } from 'react';
import {
  X,
  History,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Building,
  User,
  Shield,
  ExternalLink,
} from 'lucide-react';

interface LicenceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  personId: number | null;
  typeCode: string | null;
  workerName?: string;
  qualificationName?: string;
}

export const LicenceHistoryModal: React.FC<LicenceHistoryModalProps> = ({
  isOpen,
  onClose,
  personId,
  typeCode,
  workerName,
  qualificationName,
}) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && personId && typeCode) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const res = await fetch(`/api/workforce/training/licences/${personId}/${typeCode}/history`);
          if (res.ok) {
            const data = await res.json();
            setHistory(data);
          }
        } catch (err) {
          console.error('Failed to load qualification history:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [isOpen, personId, typeCode]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-sm text-white">Credential Version History</h3>
                <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                  {typeCode}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {workerName ? `${workerName} &bull; ` : ''}{qualificationName || 'Historical records'}
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

        {/* Explanatory Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 text-xs text-slate-600 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Only the latest verified credential is used for site compliance checks. Prior renewals and certificates are archived here for audit trail and compliance verification.
          </span>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              Loading qualification history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No historical records found for this credential.
            </div>
          ) : (
            history.map((record, index) => {
              const isCurrent = index === 0;
              const isExpired = record.expiryDate && new Date(record.expiryDate) < new Date();

              return (
                <div
                  key={record.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-500/5 border-amber-500/40 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isCurrent
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {isCurrent ? 'Current Active Credential' : `Superseded Version (v${history.length - index})`}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900">
                        {record.licenceNumber ? `#${record.licenceNumber}` : '—'}
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        record.verificationStatus === 'Verified'
                          ? 'text-emerald-700 bg-emerald-50'
                          : record.verificationStatus === 'Pending Verification'
                          ? 'text-amber-700 bg-amber-50'
                          : 'text-slate-600 bg-slate-100'
                      }`}
                    >
                      {record.verificationStatus || 'Not Assessed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Authority</div>
                      <div className="font-semibold text-slate-800">{record.issuingAuthority || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Issue Date</div>
                      <div className="font-medium text-slate-800">{record.issueDate || '—'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Expiry Date</div>
                      <div className={`font-semibold ${isExpired && !record.noExpiry ? 'text-rose-600' : 'text-slate-800'}`}>
                        {record.noExpiry ? 'No Expiry (Lifetime)' : record.expiryDate || '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Evidence</div>
                      <div className="text-blue-600 font-medium truncate flex items-center space-x-1">
                        <FileText className="w-3 h-3" />
                        <span>{record.evidenceUrl ? 'View Certificate' : 'On File'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            Total records: {history.length}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close History
          </button>
        </div>
      </div>
    </div>
  );
};
