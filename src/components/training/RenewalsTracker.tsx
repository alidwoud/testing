import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  FileText,
  User,
  Building,
  ChevronRight,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { BookTrainingModal } from './BookTrainingModal.tsx';
import { VerifyEvidenceModal } from './VerifyEvidenceModal.tsx';

export const RenewalsTracker: React.FC = () => {
  const { activeProject, currentUser, addToast } = useApp();

  const [renewals, setRenewals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [stageFilter, setStageFilter] = useState('ALL');

  // Modals
  const [bookTarget, setBookTarget] = useState<any | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<any | null>(null);

  const fetchRenewals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workforce/renewals?projectId=${activeProject?.id || 1}`, {
        headers: {
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setRenewals(data);
      }
    } catch (err) {
      console.error('Failed to load renewals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewals();
  }, [activeProject]);

  const filteredRenewals = renewals.filter((r) => {
    if (stageFilter === 'ALL') return true;
    return r.status === stageFilter;
  });

  return (
    <div className="space-y-4">
      {/* 1. RENEWALS PIPELINE SUMMARY TILES */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-900">
        <div
          onClick={() => setStageFilter('ALL')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            stageFilter === 'ALL'
              ? 'bg-white border-amber-500 shadow-sm ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total in Pipeline</div>
          <div className="text-2xl font-black text-slate-900 mt-0.5">{renewals.length}</div>
        </div>

        <div
          onClick={() => setStageFilter('Renewal Required')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            stageFilter === 'Renewal Required'
              ? 'bg-rose-50 border-rose-500 shadow-sm ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-bold text-rose-700 uppercase">1. Needs Booking</div>
          <div className="text-2xl font-black text-rose-600 mt-0.5">
            {renewals.filter((r) => r.status === 'Renewal Required').length}
          </div>
        </div>

        <div
          onClick={() => setStageFilter('Booked')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            stageFilter === 'Booked'
              ? 'bg-purple-50 border-purple-500 shadow-sm ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-bold text-purple-700 uppercase">2. Course Booked</div>
          <div className="text-2xl font-black text-purple-600 mt-0.5">
            {renewals.filter((r) => r.status === 'Booked').length}
          </div>
        </div>

        <div
          onClick={() => setStageFilter('Evidence Submitted')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            stageFilter === 'Evidence Submitted'
              ? 'bg-blue-50 border-blue-500 shadow-sm ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[10px] font-bold text-blue-700 uppercase">3. Awaiting Signoff</div>
          <div className="text-2xl font-black text-blue-600 mt-0.5">
            {renewals.filter((r) => r.status === 'Evidence Submitted').length}
          </div>
        </div>
      </div>

      {/* 2. RENEWALS REGISTER */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900">
              Active Qualification Renewals ({filteredRenewals.length})
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Worker & ID</th>
                <th className="py-3 px-3">Credential Required</th>
                <th className="py-3 px-3">Expiry Deadline</th>
                <th className="py-3 px-3">Training Provider</th>
                <th className="py-3 px-3 text-center">Pipeline Stage</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && renewals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Loading renewals pipeline...</span>
                  </td>
                </tr>
              ) : filteredRenewals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No qualification renewals in this stage.
                  </td>
                </tr>
              ) : (
                filteredRenewals.map((r) => {
                  const person = r.person || {};
                  const qual = r.qualification || {};
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{person.displayName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown Worker'}</div>
                        <div className="text-[10px] font-mono text-slate-400">{person.employeeId || '—'} &bull; {person.tradeRole || 'Not Set'}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{qual.typeName || 'Not Assessed'}</div>
                        <div className="text-[10px] font-mono text-slate-500">{qual.typeCode || '—'}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-rose-600">{qual.expiryDate || '—'}</div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">
                        {r.trainingProvider || '—'}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'Verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === 'Booked'
                              ? 'bg-purple-100 text-purple-800'
                              : r.status === 'Evidence Submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>

                      <td className="py-2.5 px-4 text-right">
                        {r.status === 'Renewal Required' ? (
                          <button
                            onClick={() =>
                              setBookTarget({
                                personId: person.id,
                                workerName: person.displayName,
                                typeCode: qual.typeCode,
                                qualificationName: qual.typeName,
                              })
                            }
                            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                          >
                            Book Renewal
                          </button>
                        ) : r.status === 'Evidence Submitted' ? (
                          <button
                            onClick={() =>
                              setVerifyTarget({
                                personId: person.id,
                                workerName: person.displayName,
                                qualificationTypeCode: qual.typeCode,
                                qualificationName: qual.typeName,
                                licenceNumber: qual.licenceNumber,
                              })
                            }
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-xs cursor-pointer"
                          >
                            Verify Evidence
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">In Progress</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {bookTarget && (
        <BookTrainingModal
          isOpen={true}
          onClose={() => setBookTarget(null)}
          onSuccess={() => fetchRenewals()}
          initialPersonId={bookTarget.personId}
          initialWorkerName={bookTarget.workerName}
          initialQualificationTypeCode={bookTarget.typeCode}
          initialQualificationName={bookTarget.qualificationName}
        />
      )}

      {verifyTarget && (
        <VerifyEvidenceModal
          isOpen={true}
          onClose={() => setVerifyTarget(null)}
          onSuccess={() => fetchRenewals()}
          personId={verifyTarget.personId}
          workerName={verifyTarget.workerName}
          qualificationTypeCode={verifyTarget.qualificationTypeCode}
          qualificationName={verifyTarget.qualificationName}
          existingLicenceNumber={verifyTarget.licenceNumber}
        />
      )}
    </div>
  );
};
