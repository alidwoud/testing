import React, { useState, useEffect, useMemo } from 'react';
import {
  Award,
  Search,
  Filter,
  History,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  BookOpen,
  FileCheck,
  RefreshCw,
  ExternalLink,
  Shield,
  ShieldAlert,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { LicenceHistoryModal } from './LicenceHistoryModal.tsx';
import { BookTrainingModal } from './BookTrainingModal.tsx';
import { VerifyEvidenceModal } from './VerifyEvidenceModal.tsx';

interface LicenceRegisterProps {
  initialFilter?: string;
}

export const LicenceRegister: React.FC<LicenceRegisterProps> = ({ initialFilter = 'all' }) => {
  const { activeProject, currentUser, addToast } = useApp();

  // Filters
  const [search, setSearch] = useState('');
  const [expiryWindow, setExpiryWindow] = useState(initialFilter);
  const [tradeFilter, setTradeFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Register Data
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [historyTarget, setHistoryTarget] = useState<{
    personId: number;
    typeCode: string;
    workerName: string;
    qualificationName: string;
  } | null>(null);

  const [bookTarget, setBookTarget] = useState<{
    personId: number;
    workerName: string;
    typeCode: string;
    qualificationName: string;
  } | null>(null);

  const [verifyTarget, setVerifyTarget] = useState<{
    personId: number;
    workerName: string;
    typeCode: string;
    qualificationName: string;
    licenceNumber: string;
  } | null>(null);

  const fetchLicences = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        projectId: String(activeProject?.id || 1),
        search,
        expiryWindow,
      });
      if (tradeFilter !== 'All') q.append('trade', tradeFilter);
      if (companyFilter !== 'All') q.append('company', companyFilter);
      if (typeFilter !== 'All') q.append('typeCode', typeFilter);

      const res = await fetch(`/api/workforce/training/licences?${q.toString()}`, {
        headers: {
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (err) {
      console.error('Failed to load licence register:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLicences();
  }, [search, expiryWindow, tradeFilter, companyFilter, typeFilter]);

  // Unique trades, companies, and qualification types
  const availableTrades = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.tradeRole).filter(Boolean)));
  }, [records]);

  const availableCompanies = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.company).filter(Boolean)));
  }, [records]);

  const availableTypes = useMemo(() => {
    return Array.from(new Set(records.map((r) => r.typeCode).filter(Boolean)));
  }, [records]);

  // Helper for Status Badge styling
  const renderStatusBadge = (status: string, daysRemaining: number | null, noExpiry: boolean) => {
    if (noExpiry) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
          VALID (LIFETIME)
        </span>
      );
    }

    switch (status) {
      case 'VALID':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
            VALID
          </span>
        );
      case 'EXPIRING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-300">
            EXPIRING ({daysRemaining}d)
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-300">
            EXPIRED
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-300">
            PENDING VERIFICATION
          </span>
        );
      case 'BOOKED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200">
            BOOKED FOR RENEWAL
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. FILTER CONTROLS TOOLBAR */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* Expiry Window Filter (Requirement 21) */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Compliance Status / Window
            </label>
            <select
              value={expiryWindow}
              onChange={(e) => setExpiryWindow(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-500 outline-none"
            >
              <option value="all">All Credentials</option>
              <option value="expired">Expired (High Risk)</option>
              <option value="7d">Expires in 7 Days</option>
              <option value="14d">Expires in 14 Days</option>
              <option value="30d">Expires in 30 Days</option>
              <option value="60d">Expires in 60 Days</option>
              <option value="90d">Expires in 90 Days</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="booked">Booked for Renewal</option>
              <option value="no_expiry">Lifetime / No Expiry</option>
            </select>
          </div>

          {/* Qualification Type */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Qualification Type
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-500 outline-none"
            >
              <option value="All">All Types</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Trade Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Trade / Role
            </label>
            <select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-500 outline-none"
            >
              <option value="All">All Trades</option>
              {availableTrades.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Employer / Contractor */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Company
            </label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-500 outline-none"
            >
              <option value="All">All Companies</option>
              {availableCompanies.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search Worker / Ref
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Worker, ID, ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. CREDENTIAL REGISTER TABLE (REQUIREMENT 21 & 22) */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider select-none">
                <th className="py-3 px-4">Worker & ID</th>
                <th className="py-3 px-3">Company & Trade</th>
                <th className="py-3 px-3">Qualification</th>
                <th className="py-3 px-3">Licence Number</th>
                <th className="py-3 px-3">Issue Date</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Renewal State</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Loading Licence Register...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No credentials match active filter criteria.
                  </td>
                </tr>
              ) : (
                records.map((r) => {
                  return (
                    <tr key={`${r.personId}-${r.typeCode}`} className="hover:bg-slate-50 transition-colors">
                      {/* Worker Name & ID */}
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900">{r.workerName || 'Unknown Worker'}</div>
                        <div className="text-[10px] font-mono text-slate-400">{r.employeeId || '—'}</div>
                      </td>

                      {/* Company & Trade */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{r.tradeRole || 'Not Set'}</div>
                        <div className="text-[10px] text-slate-500">{r.company || 'Not Set'}</div>
                      </td>

                      {/* Qualification */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900">{r.qualificationType}</span>
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1 py-0.2 rounded border border-slate-200">
                            {r.typeCode}
                          </span>
                        </div>
                        {r.hasHistory && (
                          <div className="text-[10px] text-amber-600 font-semibold mt-0.5">
                            {r.historyCount} past renewal(s) archived
                          </div>
                        )}
                      </td>

                      {/* Licence Number */}
                      <td className="py-2.5 px-3 font-mono text-slate-700 font-medium">
                        {r.licenceNumber || '—'}
                      </td>

                      {/* Issue Date */}
                      <td className="py-2.5 px-3 text-slate-600">
                        {r.issueDate || '—'}
                      </td>

                      {/* Expiry Date */}
                      <td className="py-2.5 px-3">
                        {r.noExpiry ? (
                          <span className="text-emerald-700 font-medium">Lifetime</span>
                        ) : (
                          <div className={r.status === 'EXPIRED' ? 'text-rose-600 font-bold' : 'text-slate-800 font-medium'}>
                            {r.expiryDate || '—'}
                          </div>
                        )}
                      </td>

                      {/* Status (Requirement 23) */}
                      <td className="py-2.5 px-3 text-center">
                        {renderStatusBadge(r.status, r.daysRemaining, r.noExpiry)}
                      </td>

                      {/* Renewal State */}
                      <td className="py-2.5 px-3 text-center">
                        {r.bookingStatus === 'Booked' ? (
                          <span className="text-[11px] font-bold text-purple-700 flex items-center justify-center space-x-1">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Course Booked</span>
                          </span>
                        ) : r.status === 'EXPIRED' ? (
                          <span className="text-[11px] font-bold text-rose-600">Needs Booking</span>
                        ) : r.status === 'EXPIRING' ? (
                          <span className="text-[11px] font-semibold text-amber-700">Due for Renewal</span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Current</span>
                        )}
                      </td>

                      {/* Actions (Requirement 22 & 24: Actionable buttons) */}
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* VIEW HISTORY BUTTON (Requirement 22) */}
                          <button
                            onClick={() =>
                              setHistoryTarget({
                                personId: r.personId,
                                typeCode: r.typeCode,
                                workerName: r.workerName,
                                qualificationName: r.qualificationType,
                              })
                            }
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 flex items-center space-x-1 cursor-pointer transition-colors"
                            title="View all previous certificates and versions"
                          >
                            <History className="w-3 h-3 text-slate-500" />
                            <span>History ({r.historyCount})</span>
                          </button>

                          {/* ACTIONABLE WARN BUTTONS (Requirement 24: No dead-end warning cards!) */}
                          {r.status === 'EXPIRED' && (
                            <button
                              onClick={() =>
                                setBookTarget({
                                  personId: r.personId,
                                  workerName: r.workerName,
                                  typeCode: r.typeCode,
                                  qualificationName: r.qualificationType,
                                })
                              }
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black rounded-lg shadow-xs cursor-pointer transition-colors"
                            >
                              Book Training
                            </button>
                          )}

                          {r.status === 'EXPIRING' && (
                            <button
                              onClick={() =>
                                setBookTarget({
                                  personId: r.personId,
                                  workerName: r.workerName,
                                  typeCode: r.typeCode,
                                  qualificationName: r.qualificationType,
                                })
                              }
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black rounded-lg shadow-xs cursor-pointer transition-colors"
                            >
                              Book Renewal
                            </button>
                          )}

                          {r.verificationStatus === 'Pending Verification' && (
                            <button
                              onClick={() =>
                                setVerifyTarget({
                                  personId: r.personId,
                                  workerName: r.workerName,
                                  typeCode: r.typeCode,
                                  qualificationName: r.qualificationType,
                                  licenceNumber: r.licenceNumber,
                                })
                              }
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black rounded-lg shadow-xs cursor-pointer transition-colors flex items-center space-x-1"
                            >
                              <FileCheck className="w-3 h-3" />
                              <span>Verify Evidence</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* History Modal */}
      {historyTarget && (
        <LicenceHistoryModal
          isOpen={true}
          onClose={() => setHistoryTarget(null)}
          personId={historyTarget.personId}
          typeCode={historyTarget.typeCode}
          workerName={historyTarget.workerName}
          qualificationName={historyTarget.qualificationName}
        />
      )}

      {/* Book Training Modal */}
      {bookTarget && (
        <BookTrainingModal
          isOpen={true}
          onClose={() => setBookTarget(null)}
          onSuccess={() => {
            fetchLicences();
          }}
          initialPersonId={bookTarget.personId}
          initialWorkerName={bookTarget.workerName}
          initialQualificationTypeCode={bookTarget.typeCode}
          initialQualificationName={bookTarget.qualificationName}
        />
      )}

      {/* Verify Evidence Modal */}
      {verifyTarget && (
        <VerifyEvidenceModal
          isOpen={true}
          onClose={() => setVerifyTarget(null)}
          onSuccess={() => {
            fetchLicences();
          }}
          personId={verifyTarget.personId}
          workerName={verifyTarget.workerName}
          qualificationTypeCode={verifyTarget.typeCode}
          qualificationName={verifyTarget.qualificationName}
          existingLicenceNumber={verifyTarget.licenceNumber}
        />
      )}
    </div>
  );
};
