import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Users,
} from 'lucide-react';
import { parseSpreadsheetFile } from '../../lib/spreadsheetParser.ts';

interface WorkforceImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetProjectId?: number;
}

export const WorkforceImportModal: React.FC<WorkforceImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetProjectId,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Column mapping state
  const [mapping, setMapping] = useState<{
    employeeId: string;
    firstName: string;
    lastName: string;
    displayName: string;
    companyName: string;
    employmentType: string;
    tradeRole: string;
    classification: string;
    phone: string;
    workEmail: string;
  }>({
    employeeId: '',
    firstName: '',
    lastName: '',
    displayName: '',
    companyName: '',
    employmentType: '',
    tradeRole: '',
    classification: '',
    phone: '',
    workEmail: '',
  });

  const [stagedWorkers, setStagedWorkers] = useState<any[]>([]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setError(null);
    setLoading(true);

    try {
      const data = await parseSpreadsheetFile(selected);
      if (!data.headers || data.headers.length === 0) {
        throw new Error('No headers found in uploaded file');
      }
      setHeaders(data.headers);
      setRawRows(data.rows);

      // Auto-map columns
      const auto: any = {};
      data.headers.forEach((h) => {
        const lower = h.toLowerCase().trim();
        if (lower.includes('emp') || lower.includes('id') || lower.includes('badge')) auto.employeeId = h;
        else if (lower.includes('first')) auto.firstName = h;
        else if (lower.includes('last') || lower.includes('surname')) auto.lastName = h;
        else if (lower === 'name' || lower.includes('full')) auto.displayName = h;
        else if (lower.includes('company') || lower.includes('subcontractor')) auto.companyName = h;
        else if (lower.includes('type') || lower.includes('hire')) auto.employmentType = h;
        else if (lower.includes('trade') || lower.includes('role') || lower.includes('occupation')) auto.tradeRole = h;
        else if (lower.includes('class') || lower.includes('grade')) auto.classification = h;
        else if (lower.includes('phone') || lower.includes('mobile')) auto.phone = h;
        else if (lower.includes('email') || lower.includes('mail')) auto.workEmail = h;
      });
      setMapping((prev) => ({ ...prev, ...auto }));
      setStep('mapping');
    } catch (err: any) {
      setError(err.message || 'Failed to read spreadsheet');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyMapping = () => {
    if (!mapping.firstName && !mapping.displayName) {
      setError('Please map either First Name or Display Name column');
      return;
    }
    setError(null);

    const parsed = rawRows.map((row, idx) => {
      const fName = mapping.firstName ? String(row[mapping.firstName] || '').trim() : '';
      const lName = mapping.lastName ? String(row[mapping.lastName] || '').trim() : '';
      const dName = mapping.displayName && row[mapping.displayName]
        ? String(row[mapping.displayName]).trim()
        : `${fName} ${lName}`.trim() || 'Unknown Worker';
      const empId = mapping.employeeId && row[mapping.employeeId]
        ? String(row[mapping.employeeId]).trim()
        : `EMP-${1000 + idx}`;
      const trade = mapping.tradeRole && row[mapping.tradeRole] ? String(row[mapping.tradeRole]).trim() : 'Not Set';
      const company = mapping.companyName && row[mapping.companyName] ? String(row[mapping.companyName]).trim() : 'Not Set';

      return {
        employeeId: empId,
        firstName: fName || dName.split(' ')[0] || 'Unknown',
        lastName: lName || dName.split(' ').slice(1).join(' ') || 'Worker',
        displayName: dName,
        companyName: company,
        employmentType: mapping.employmentType && row[mapping.employmentType] ? String(row[mapping.employmentType]).trim() : 'Direct',
        tradeRole: trade,
        classification: mapping.classification && row[mapping.classification] ? String(row[mapping.classification]).trim() : '—',
        phone: mapping.phone ? String(row[mapping.phone] || '').trim() : '',
        workEmail: mapping.workEmail ? String(row[mapping.workEmail] || '').trim() : '',
      };
    });

    setStagedWorkers(parsed);
    setStep('preview');
  };

  const handleCommit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/workforce/bulk-import-people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'Administrator',
        },
        body: JSON.stringify({
          workers: stagedWorkers,
          targetProjectId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import workers');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Import Workforce Labour Register</h2>
              <p className="text-xs text-slate-400">Upload CSV or Excel file to batch import personnel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center space-x-6 text-xs">
          <span className={`font-semibold flex items-center space-x-1.5 ${step === 'upload' ? 'text-amber-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">1</span>
            <span>Upload File</span>
          </span>
          <span className={`font-semibold flex items-center space-x-1.5 ${step === 'mapping' ? 'text-amber-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">2</span>
            <span>Map Columns</span>
          </span>
          <span className={`font-semibold flex items-center space-x-1.5 ${step === 'preview' ? 'text-amber-400' : 'text-slate-400'}`}>
            <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">3</span>
            <span>Preview & Commit</span>
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'upload' && (
            <div className="border-2 border-dashed border-slate-700 hover:border-amber-500/50 rounded-2xl p-8 text-center transition-all">
              <input
                type="file"
                id="workforce-file-input"
                accept=".csv, .xlsx, .xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <label
                htmlFor="workforce-file-input"
                className="cursor-pointer flex flex-col items-center justify-center space-y-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FileSpreadsheet className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Click or drag Excel / CSV roster file</div>
                  <div className="text-xs text-slate-400 mt-1">Supports standard workforce exports (.xlsx, .csv)</div>
                </div>
                <div className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition-colors">
                  Select Spreadsheet File
                </div>
              </label>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-300 mb-2">
                Map columns from <span className="font-semibold text-white">{file?.name}</span> to MAXIM FORGE workforce fields:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {[
                  { key: 'employeeId', label: 'Employee ID' },
                  { key: 'firstName', label: 'First Name' },
                  { key: 'lastName', label: 'Last Name' },
                  { key: 'displayName', label: 'Display / Full Name' },
                  { key: 'companyName', label: 'Company / Employer' },
                  { key: 'tradeRole', label: 'Trade / Role (Electrician, Apprentice, etc.)' },
                  { key: 'classification', label: 'Classification (A-Grade, CW3, etc.)' },
                  { key: 'employmentType', label: 'Employment Type (Direct, Subbie, Labour Hire)' },
                  { key: 'workEmail', label: 'Work Email' },
                  { key: 'phone', label: 'Phone Number' },
                ].map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-300">{field.label}</label>
                    <select
                      value={(mapping as any)[field.key] || ''}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Ignore / Not in file --</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">
                  Ready to import <strong className="text-amber-400">{stagedWorkers.length}</strong> personnel:
                </span>
                <span className="text-slate-400">Duplicate Employee IDs will be skipped automatically</span>
              </div>
              <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-semibold sticky top-0">
                    <tr>
                      <th className="py-2 px-3">ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Trade</th>
                      <th className="py-2 px-3">Company</th>
                      <th className="py-2 px-3">Email</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {stagedWorkers.slice(0, 50).map((w, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/50">
                        <td className="py-1.5 px-3 text-amber-400 font-semibold">{w.employeeId}</td>
                        <td className="py-1.5 px-3 font-sans text-white">{w.displayName}</td>
                        <td className="py-1.5 px-3 font-sans text-slate-300">{w.tradeRole}</td>
                        <td className="py-1.5 px-3 font-sans text-slate-400">{w.companyName}</td>
                        <td className="py-1.5 px-3 text-slate-400">{w.workEmail || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {stagedWorkers.length > 50 && (
                <div className="text-[11px] text-slate-500 italic text-center">
                  Showing first 50 of {stagedWorkers.length} rows...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 'preview') setStep('mapping');
              else if (step === 'mapping') setStep('upload');
              else onClose();
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
          >
            {step === 'upload' ? 'Cancel' : 'Back'}
          </button>

          {step === 'mapping' && (
            <button
              onClick={handleApplyMapping}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow transition-colors"
            >
              <span>Preview Data</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {step === 'preview' && (
            <button
              onClick={handleCommit}
              disabled={loading}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Commit {stagedWorkers.length} Workers</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
