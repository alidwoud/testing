import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Activity, Search, ShieldCheck } from 'lucide-react';
import { AuditLog } from '../types/index.ts';

export const AuditView: React.FC = () => {
  const { apiFetch, activeProject } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/audit-logs');
        if (res.ok) {
          const data = await res.json();
          setLogs(data);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [activeProject]);

  const filtered = logs.filter((l) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        l.entityCode.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.entityType.toLowerCase().includes(q) ||
        l.performedByName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Activity className="w-6 h-6 text-amber-400" />
            <span>Project Audit & Traceability Log</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete construction evidence trail: who created, modified, submitted, or approved records.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, record code (e.g. CB-L02, UT-01), person..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity Type</th>
                <th className="py-3 px-3">Record Code</th>
                <th className="py-3 px-3">Performed By</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-850 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'Approve'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : log.action === 'Submit'
                            ? 'bg-blue-950 text-blue-400 border border-blue-800'
                            : log.action === 'Create'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{log.entityType}</td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">{log.entityCode}</td>
                    <td className="py-3 px-3 text-white font-semibold">{log.performedByName}</td>
                    <td className="py-3 px-3 text-slate-400">{log.performedByRole}</td>
                    <td className="py-3 px-3 text-slate-400 text-[11px] max-w-xs truncate">
                      {log.details || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
