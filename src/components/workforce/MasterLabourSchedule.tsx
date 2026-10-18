import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  Calendar,
  Clock,
  Layers,
  Building,
  CheckCircle2,
  AlertTriangle,
  MoveRight,
  Shield,
  ShieldAlert,
  ArrowRight,
  BookOpen,
  Plus,
  RefreshCw,
  Sparkles,
  Download,
  CheckSquare,
  Square,
  Award,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { BulkAllocateModal } from './BulkAllocateModal.tsx';
import { BulkMoveModal } from './BulkMoveModal.tsx';
import { TomorrowLabourModal } from './TomorrowLabourModal.tsx';
import { WorkerQuickPanel } from './WorkerQuickPanel.tsx';
import { PersonProfileModal } from './PersonProfileModal.tsx';

export const MasterLabourSchedule: React.FC = () => {
  const { activeProject, currentUser, addToast } = useApp();

  // Primary controls
  const [date, setDate] = useState<string>('2026-10-12');
  const [shift, setShift] = useState<string>('Day Shift');

  // Filters
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [tradeFilter, setTradeFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [crewFilter, setCrewFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [warningFilterOnly, setWarningFilterOnly] = useState(false);

  // Data & state
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Multi-selection state
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<number>>(new Set());

  // Modals
  const [isBulkAllocateOpen, setIsBulkAllocateOpen] = useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [isTomorrowOpen, setIsTomorrowOpen] = useState(false);
  const [quickPanelPersonId, setQuickPanelPersonId] = useState<number | null>(null);
  const [profileModalPersonId, setProfileModalPersonId] = useState<number | null>(null);

  const fetchMasterSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        projectId: String(activeProject?.id || 1),
        date,
        shift,
        projectFilter,
        search,
        statusFilter,
      });
      if (tradeFilter !== 'All') q.append('tradeRole', tradeFilter);
      if (companyFilter !== 'All') q.append('company', companyFilter);

      const res = await fetch(`/api/workforce/master-schedule?${q.toString()}`, {
        headers: {
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error('Failed to load master schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProject, date, shift, projectFilter, search, statusFilter, tradeFilter, companyFilter, currentUser.role]);

  useEffect(() => {
    fetchMasterSchedule();
  }, [fetchMasterSchedule]);

  const rows = data?.rows || [];
  const counts = data?.counts || {
    total: 0,
    allocatedCount: 0,
    unallocatedCount: 0,
    onLeaveCount: 0,
    trainingCount: 0,
    conflictsCount: 0,
    otherProjectCount: 0,
    qualBlockedCount: 0,
    inactiveCount: 0,
    warningsCount: 0,
  };

  // Trade and Company dropdown lists
  const availableTrades = useMemo(() => {
    return Array.from(new Set(rows.map((r: any) => r.tradeRole).filter(Boolean)));
  }, [rows]);

  const availableCompanies = useMemo(() => {
    return Array.from(new Set(rows.map((r: any) => r.company).filter(Boolean)));
  }, [rows]);

  // Selection helpers
  const handleToggleSelectPerson = (id: number) => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev);
      rows.forEach((r: any) => next.add(r.personId));
      return next;
    });
  };

  const handleSelectUnallocated = () => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev);
      rows.filter((r: any) => r.allocationStatus === 'UNALLOCATED').forEach((r: any) => next.add(r.personId));
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedPersonIds(new Set());
  };

  // Status Badge Colors & Styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ALLOCATED':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black';
      case 'UNALLOCATED':
        return 'bg-slate-100 text-slate-700 border-slate-300 font-bold';
      case 'ON LEAVE':
        return 'bg-blue-50 text-blue-800 border-blue-200 font-bold';
      case 'TRAINING':
        return 'bg-purple-50 text-purple-800 border-purple-200 font-black';
      case 'OTHER PROJECT':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 font-bold';
      case 'CONFLICT':
        return 'bg-rose-50 text-rose-800 border-rose-300 font-black';
      case 'QUALIFICATION BLOCKED':
        return 'bg-amber-50 text-amber-800 border-amber-300 font-black';
      case 'INACTIVE':
        return 'bg-zinc-100 text-zinc-600 border-zinc-200 font-medium';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* 1. TOP HEADER & PRIMARY ACTIONS */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-black text-white">Master Labour Schedule</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Primary Allocation Screen
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete workforce picture across all project sites, trades, leaves, training bookings, and forward allocations.
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2">
          <button
            onClick={() => setIsTomorrowOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Tomorrow's Labour</span>
          </button>

          <button
            onClick={() => {
              if (selectedPersonIds.size > 0) {
                setIsBulkMoveOpen(true);
              } else {
                addToast('info', 'Select Workers', 'Please check at least one worker to move');
              }
            }}
            disabled={selectedPersonIds.size === 0}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1.5 disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
          >
            <MoveRight className="w-4 h-4 text-teal-400" />
            <span>Move Selected ({selectedPersonIds.size})</span>
          </button>

          <button
            onClick={() => setIsBulkAllocateOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Allocate Labour</span>
          </button>
        </div>
      </div>

      {/* 2. STATS KPI TILES (ALL 8 STATUSES AT A GLANCE) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-slate-900">
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALL'
              ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-slate-500 uppercase">Total Workers</div>
          <div className="text-xl font-black text-slate-900 mt-0.5">{counts.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('ALLOCATED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ALLOCATED'
              ? 'bg-emerald-50/50 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-emerald-700 uppercase">Allocated</div>
          <div className="text-xl font-black text-emerald-700 mt-0.5">{counts.allocatedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('UNALLOCATED')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'UNALLOCATED'
              ? 'bg-slate-50 border-slate-500 shadow-md ring-2 ring-slate-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-slate-600 uppercase">Unallocated</div>
          <div className="text-xl font-black text-slate-800 mt-0.5">{counts.unallocatedCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('ON_LEAVE')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'ON_LEAVE'
              ? 'bg-blue-50/50 border-blue-500 shadow-md ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-blue-700 uppercase">On Leave</div>
          <div className="text-xl font-black text-blue-700 mt-0.5">{counts.onLeaveCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('TRAINING')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'TRAINING'
              ? 'bg-purple-50/50 border-purple-500 shadow-md ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-purple-700 uppercase">In Training</div>
          <div className="text-xl font-black text-purple-700 mt-0.5">{counts.trainingCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('OTHER_PROJECT')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'OTHER_PROJECT'
              ? 'bg-indigo-50/50 border-indigo-500 shadow-md ring-2 ring-indigo-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-indigo-700 uppercase">Other Project</div>
          <div className="text-xl font-black text-indigo-700 mt-0.5">{counts.otherProjectCount}</div>
        </div>

        <div
          onClick={() => setStatusFilter('CONFLICT')}
          className={`p-3 rounded-xl border transition-all cursor-pointer ${
            statusFilter === 'CONFLICT'
              ? 'bg-rose-50/50 border-rose-500 shadow-md ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="text-[10px] font-bold text-rose-700 uppercase">Conflicts</div>
          <div className="text-xl font-black text-rose-700 mt-0.5">{counts.conflictsCount}</div>
        </div>
      </div>

      {/* 3. COMPREHENSIVE FILTER TOOLBAR */}
      <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
          {/* Date Picker */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-500 outline-none"
            />
          </div>

          {/* Shift */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Shift
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-500 outline-none"
            >
              <option value="Day Shift">Day Shift (07:00–15:30)</option>
              <option value="Back Shift">Back Shift (15:00–23:00)</option>
              <option value="Night Shift">Night Shift (23:00–07:00)</option>
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Project Scope
            </label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-500 outline-none"
            >
              <option value="ALL">All Projects (Enterprise)</option>
              {(data?.projects || []).map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.code} &bull; {p.name}
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
              {availableTrades.map((t: any) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Employer / Contractor
            </label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:border-amber-500 outline-none"
            >
              <option value="All">All Companies</option>
              {availableCompanies.map((c: any) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second Row: Search + Status Filter + Multi-Select Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by worker name, ID, trade, area..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 outline-none"
            />
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-wrap items-center space-x-2 text-xs font-bold text-slate-600">
            <button
              onClick={handleSelectAllVisible}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              Select All Visible ({rows.length})
            </button>
            <button
              onClick={handleSelectUnallocated}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              Select Unallocated ({counts.unallocatedCount})
            </button>
            {selectedPersonIds.size > 0 && (
              <button
                onClick={handleClearSelection}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                Clear ({selectedPersonIds.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. MASTER LABOUR SCHEDULE TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider select-none">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && selectedPersonIds.size === rows.length}
                    onChange={(e) => {
                      if (e.target.checked) handleSelectAllVisible();
                      else handleClearSelection();
                    }}
                    className="rounded border-slate-300 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Worker / ID</th>
                <th className="py-3 px-3">Trade / Role</th>
                <th className="py-3 px-3">Company</th>
                <th className="py-3 px-3">Project</th>
                <th className="py-3 px-3">Area & Workstream</th>
                <th className="py-3 px-3">Shift & Times</th>
                <th className="py-3 px-3">Supervisor</th>
                <th className="py-3 px-3 text-center">Allocation Status</th>
                <th className="py-3 px-3">Training / Credential Warning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && !data ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Loading Master Labour Schedule...</span>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No workforce records matching active filters.
                  </td>
                </tr>
              ) : (
                rows.map((row: any) => {
                  const isSelected = selectedPersonIds.has(row.personId);
                  return (
                    <tr
                      key={row.personId}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                        isSelected ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectPerson(row.personId);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded border-slate-300 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Worker Name & Employee ID */}
                      <td
                        className="py-2.5 px-3"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{row.workerName || 'Unknown Worker'}</span>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 py-0.5 rounded">
                            {row.employeeId || '—'}
                          </span>
                        </div>
                        {row.crew && row.crew !== '—' && (
                          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                            Crew: {row.crew}
                          </div>
                        )}
                      </td>

                      {/* Trade / Role */}
                      <td
                        className="py-2.5 px-3"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        <div className="font-semibold text-slate-800">{row.tradeRole || 'Not Set'}</div>
                        {row.classification && (
                          <div className="text-[10px] text-slate-400">{row.classification}</div>
                        )}
                      </td>

                      {/* Company */}
                      <td
                        className="py-2.5 px-3 text-slate-600 font-medium"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        {row.company || 'Not Set'}
                      </td>

                      {/* Project */}
                      <td
                        className="py-2.5 px-3"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.project}
                        </span>
                      </td>

                      {/* Area & Workstream */}
                      <td
                        className="py-2.5 px-3"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        {row.area !== '—' ? (
                          <div>
                            <div className="font-bold text-slate-900">{row.area}</div>
                            <div className="text-[10px] text-slate-500">{row.workstream}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Shift & Times */}
                      <td
                        className="py-2.5 px-3"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        {row.allocationStatus === 'ALLOCATED' || row.allocationStatus === 'OTHER PROJECT' ? (
                          <div>
                            <div className="font-semibold text-slate-800">{row.shift}</div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {row.startTime}–{row.endTime}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Supervisor */}
                      <td
                        className="py-2.5 px-3 text-slate-700 font-medium"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        {row.supervisor || '—'}
                      </td>

                      {/* Allocation Status Badge */}
                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] uppercase border ${getStatusBadge(
                            row.allocationStatus
                          )}`}
                        >
                          {row.allocationStatus}
                        </span>
                      </td>

                      {/* Training / Credential Warning */}
                      <td
                        className="py-2.5 px-3"
                        onClick={() => setQuickPanelPersonId(row.personId)}
                      >
                        {row.trainingDetails ? (
                          <div className="flex items-center space-x-1.5 text-purple-700 font-bold text-[11px]">
                            <BookOpen className="w-3.5 h-3.5 shrink-0" />
                            <span>{row.trainingDetails.courseName} ({row.trainingDetails.startTime}–{row.trainingDetails.endTime})</span>
                          </div>
                        ) : row.qualificationWarning ? (
                          <div className="flex items-center space-x-1.5 text-amber-700 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                            <span>{row.qualificationWarning}</span>
                          </div>
                        ) : row.qualificationState === 'Not Assessed' ? (
                          <span className="text-slate-400 text-[11px] italic">Not Assessed</span>
                        ) : (
                          <span className="text-emerald-700 text-[11px]">✓ Compliant</span>
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

      {/* Floating Multi-Select Action Bar */}
      {selectedPersonIds.size > 0 && (
        <div className="fixed bottom-6 inset-x-0 mx-auto w-full max-w-2xl bg-slate-900 border border-slate-700 text-white rounded-2xl p-3.5 shadow-2xl flex items-center justify-between z-40 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
              {selectedPersonIds.size}
            </span>
            <span className="text-xs font-bold text-white">
              Workers Selected for Bulk Operations
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBulkMoveOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-600 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <MoveRight className="w-3.5 h-3.5 text-teal-400" />
              <span>Move Area</span>
            </button>

            <button
              onClick={() => setIsBulkAllocateOpen(true)}
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Allocate ({selectedPersonIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* Slide-over Worker Quick Panel */}
      <WorkerQuickPanel
        personId={quickPanelPersonId}
        onClose={() => setQuickPanelPersonId(null)}
        onOpenAllocate={(person) => {
          if (person?.id) {
            setSelectedPersonIds(new Set([person.id]));
            setIsBulkAllocateOpen(true);
          }
        }}
        onOpenMove={(person) => {
          if (person?.id) {
            setSelectedPersonIds(new Set([person.id]));
            setIsBulkMoveOpen(true);
          }
        }}
        onOpenProfile={(id) => {
          setProfileModalPersonId(id);
        }}
      />

      {/* Person Profile Modal */}
      {profileModalPersonId && (
        <PersonProfileModal
          isOpen={Boolean(profileModalPersonId)}
          personId={profileModalPersonId}
          onClose={() => setProfileModalPersonId(null)}
          onUpdate={() => fetchMasterSchedule()}
        />
      )}

      {/* Bulk Allocate Modal */}
      <BulkAllocateModal
        isOpen={isBulkAllocateOpen}
        onClose={() => setIsBulkAllocateOpen(false)}
        onSuccess={() => {
          handleClearSelection();
          fetchMasterSchedule();
        }}
        initialSelectedPersonIds={Array.from(selectedPersonIds)}
        initialDate={date}
        initialShift={shift}
      />

      {/* Bulk Move Modal */}
      <BulkMoveModal
        isOpen={isBulkMoveOpen}
        onClose={() => setIsBulkMoveOpen(false)}
        onSuccess={() => {
          handleClearSelection();
          fetchMasterSchedule();
        }}
        selectedPersonIds={Array.from(selectedPersonIds)}
        currentDate={date}
      />

      {/* Tomorrow's Labour Modal */}
      <TomorrowLabourModal
        isOpen={isTomorrowOpen}
        onClose={() => setIsTomorrowOpen(false)}
        onSuccess={() => {
          fetchMasterSchedule();
        }}
      />
    </div>
  );
};
