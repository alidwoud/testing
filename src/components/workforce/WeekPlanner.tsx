import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Copy,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Printer,
  ShieldAlert,
  Building,
  Layers,
  Sparkles,
  ArrowRight,
  Eye,
  Plus,
  Trash2,
  UserCheck,
  BookOpen,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { WorkerQuickPanel } from './WorkerQuickPanel.tsx';
import { BulkAllocateModal } from './BulkAllocateModal.tsx';

interface DaySummary {
  date: string;
  dayName: string;
  dayNumber: string;
  formatted: string;
  dayStatus: string;
  allocatedCount: number;
}

interface WorkstreamRow {
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  linkedLocation: {
    id: number;
    name: string;
    code: string;
    type: string;
    path: string;
  } | null;
  workstreamId: number;
  workstreamCode: string;
  workstreamName: string;
  color: string;
  dailyCounts: Record<string, number>;
  dailyAllocations: Record<string, any[]>;
  totalWeek: number;
}

interface PersonRow {
  id: number;
  employeeId: string;
  displayName: string;
  tradeRole: string;
  classification: string;
  companyName: string;
  employmentStatus: string;
  complianceStatus: 'COMPLIANT' | 'WARNING' | 'NOT COMPLIANT';
  quals: any[];
  totalAllocatedDays: number;
  conflictsCount: number;
  days: Record<string, {
    status: string;
    label?: string;
    allocationId?: number;
    zoneId?: number;
    zoneCode?: string;
    zoneName?: string;
    workstreamId?: number;
    workstreamName?: string;
    workstreamColor?: string;
    startTime?: string;
    endTime?: string;
    shift?: string;
    actualAttendance?: string;
    hasConflict?: boolean;
    conflictDetails?: any;
  }>;
}

export const WeekPlanner: React.FC = () => {
  const { activeProject, currentUser, addToast } = useApp();

  // Mode: 'WORKSTREAM' | 'PEOPLE'
  const [viewMode, setViewMode] = useState<'WORKSTREAM' | 'PEOPLE'>('WORKSTREAM');

  // Week selection (startDate is Monday of week)
  const [startDate, setStartDate] = useState<string>('2026-10-12');
  const [shiftFilter, setShiftFilter] = useState<string>('All');
  const [areaFilter, setAreaFilter] = useState<string>('All');
  const [tradeFilter, setTradeFilter] = useState<string>('All');
  const [companyFilter, setCompanyFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [weekData, setWeekData] = useState<{
    weekStartDate: string;
    weekEndDate: string;
    weekDays: DaySummary[];
    dailySummaries: DaySummary[];
    byWorkstream: WorkstreamRow[];
    byPerson: PersonRow[];
  } | null>(null);

  // Cell Detail Slide-Over (for Workstream mode)
  const [selectedCellDetail, setSelectedCellDetail] = useState<{
    workstream: WorkstreamRow;
    day: DaySummary;
    allocations: any[];
  } | null>(null);

  // Copy Schedule Modal
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [copyMode, setCopyMode] = useState<'WEEK' | 'AREA' | 'WORKSTREAM' | 'CREW' | 'SELECTED_WORKERS'>('WEEK');
  const [targetCopyWeekStart, setTargetCopyWeekStart] = useState('2026-10-19');
  const [copyFilterZoneId, setCopyFilterZoneId] = useState<string>('');
  const [copyFilterWorkstreamId, setCopyFilterWorkstreamId] = useState<string>('');
  const [copyFilterCrewId, setCopyFilterCrewId] = useState<string>('');
  const [copyDryRunResult, setCopyDryRunResult] = useState<any | null>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [isCommittingCopy, setIsCommittingCopy] = useState(false);
  const [excludedPersonIds, setExcludedPersonIds] = useState<number[]>([]);

  // Print View
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Drilldown & Worker Quick Panel
  const [quickPanelPersonId, setQuickPanelPersonId] = useState<number | null>(null);
  const [bulkAllocateData, setBulkAllocateData] = useState<{ personIds: number[]; date: string } | null>(null);
  const [drilldownData, setDrilldownData] = useState<{
    type: 'ALLOCATED' | 'CONFLICT' | 'TRAINING' | 'LEAVE' | 'UNALLOCATED';
    person: PersonRow;
    day: DaySummary;
    cell: any;
  } | null>(null);

  // Fetch week planner data
  const fetchWeekPlan = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        projectId: String(activeProject.id),
        startDate,
        shift: shiftFilter,
        trade: tradeFilter,
        company: companyFilter,
      });
      const res = await fetch(`/api/workforce/week-planner?${params.toString()}`, {
        headers: {
          'x-project-id': String(activeProject.id),
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) throw new Error('Failed to load weekly plan');
      const data = await res.json();
      setWeekData(data);
    } catch (err: any) {
      addToast('error', 'Week Planner Error', err.message || 'Could not fetch weekly plan');
    } finally {
      setLoading(false);
    }
  }, [activeProject, startDate, shiftFilter, tradeFilter, companyFilter, currentUser.role, addToast]);

  useEffect(() => {
    fetchWeekPlan();
  }, [fetchWeekPlan]);

  // Navigate weeks
  const handlePrevWeek = () => {
    const cur = new Date(startDate);
    cur.setDate(cur.getDate() - 7);
    setStartDate(cur.toISOString().split('T')[0]);
  };

  const handleNextWeek = () => {
    const cur = new Date(startDate);
    cur.setDate(cur.getDate() + 7);
    setStartDate(cur.toISOString().split('T')[0]);
  };

  const handleThisWeek = () => {
    setStartDate('2026-10-12');
  };

  // Dry run copy schedule
  const handleRunCopyPreview = async () => {
    if (!activeProject) return;
    setIsDryRunning(true);
    try {
      const payload: any = {
        mode: copyMode,
        sourceStartDate: startDate,
        sourceEndDate: weekData?.weekEndDate || startDate,
        targetStartDate: targetCopyWeekStart,
        shift: shiftFilter !== 'All' ? shiftFilter : undefined,
        filter: {
          zoneId: copyFilterZoneId ? Number(copyFilterZoneId) : undefined,
          workstreamId: copyFilterWorkstreamId ? Number(copyFilterWorkstreamId) : undefined,
          crewId: copyFilterCrewId ? Number(copyFilterCrewId) : undefined,
        },
        dryRun: true,
      };

      const res = await fetch('/api/workforce/copy-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject.id),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dry run validation failed');
      setCopyDryRunResult(data);
      // Pre-exclude workers who have hard conflicts or are unavailable
      const autoExcluded: number[] = [];
      data.conflicts?.forEach((c: any) => autoExcluded.push(c.personId));
      data.unavailableWorkers?.forEach((u: any) => autoExcluded.push(u.personId));
      setExcludedPersonIds(autoExcluded);
    } catch (err: any) {
      addToast('error', 'Validation Error', err.message);
    } finally {
      setIsDryRunning(false);
    }
  };

  // Commit copy schedule
  const handleCommitCopy = async () => {
    if (!activeProject) return;
    setIsCommittingCopy(true);
    try {
      const payload: any = {
        mode: copyMode,
        sourceStartDate: startDate,
        sourceEndDate: weekData?.weekEndDate || startDate,
        targetStartDate: targetCopyWeekStart,
        shift: shiftFilter !== 'All' ? shiftFilter : undefined,
        filter: {
          zoneId: copyFilterZoneId ? Number(copyFilterZoneId) : undefined,
          workstreamId: copyFilterWorkstreamId ? Number(copyFilterWorkstreamId) : undefined,
          crewId: copyFilterCrewId ? Number(copyFilterCrewId) : undefined,
        },
        excludedPersonIds,
        dryRun: false,
      };

      const res = await fetch('/api/workforce/copy-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject.id),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Copy failed');
      addToast('success', 'Schedule Copied', `Successfully copied ${data.copiedCount} allocations to ${targetCopyWeekStart}`);
      setIsCopyModalOpen(false);
      setCopyDryRunResult(null);
      setStartDate(targetCopyWeekStart);
    } catch (err: any) {
      addToast('error', 'Commit Error', err.message);
    } finally {
      setIsCommittingCopy(false);
    }
  };

  // Export CSV download
  const handleExportCSV = () => {
    if (!activeProject) return;
    const url = `/api/workforce/week-planner/export-csv?projectId=${activeProject.id}&startDate=${startDate}`;
    window.open(url, '_blank');
  };

  // Filter people list
  const filteredPeople = (weekData?.byPerson || []).filter((p) => {
    const name = p.displayName || 'Unknown Worker';
    const empId = p.employeeId || '—';
    const trade = p.tradeRole || 'Not Set';
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      name.toLowerCase().includes(q) ||
      empId.toLowerCase().includes(q) ||
      trade.toLowerCase().includes(q);
    return matchesSearch;
  });

  // Extract unique trade roles, companies and areas for filters
  const tradeOptions = Array.from(new Set((weekData?.byPerson || []).map((p) => p.tradeRole || 'Not Set'))).sort();
  const companyOptions = Array.from(new Set((weekData?.byPerson || []).map((p) => p.companyName || 'Not Set'))).sort();
  const areaOptions = Array.from(new Set((weekData?.byWorkstream || []).map((w) => w.zoneCode || 'Unassigned'))).sort();

  // Filter workstreams list
  const filteredWorkstreams = (weekData?.byWorkstream || []).filter((w) => {
    const matchesArea = areaFilter === 'All' || w.zoneCode === areaFilter;
    const matchesSearch =
      searchQuery === '' ||
      w.workstreamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.zoneCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArea && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* 1. TOP CONTROLS BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Week Navigation & Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Previous Week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleThisWeek}
              className="px-2.5 py-1 text-xs font-bold text-amber-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              Current Week
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Next Week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Week Date Display */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
            <Calendar className="w-4 h-4 text-amber-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            />
            <span className="text-xs text-slate-400 font-medium">
              to {weekData?.weekEndDate || ''}
            </span>
          </div>

          {/* Shift Filter */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
            <Clock className="w-4 h-4 text-amber-400" />
            <select
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="All" className="bg-slate-900">All Shifts</option>
              <option value="Day Shift" className="bg-slate-900">Day Shift</option>
              <option value="Back Shift" className="bg-slate-900">Back Shift</option>
              <option value="Night Shift" className="bg-slate-900">Night Shift</option>
            </select>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setViewMode('WORKSTREAM')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'WORKSTREAM'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              By Workstream
            </button>
            <button
              onClick={() => setViewMode('PEOPLE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'PEOPLE'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              By People
            </button>
          </div>
        </div>

        {/* Right: Actions (Copy Week, Print, Export CSV) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy Schedule */}
          <button
            onClick={() => {
              const cur = new Date(startDate);
              cur.setDate(cur.getDate() + 7);
              setTargetCopyWeekStart(cur.toISOString().split('T')[0]);
              setCopyDryRunResult(null);
              setIsCopyModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors shadow-sm"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span>Copy Week / Scope</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>

          {/* Print */}
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print View</span>
          </button>
        </div>
      </div>

      {/* 2. SECONDARY FILTER ROW (Area, Trade, Company, Search) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Area / Zone Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-semibold">Area:</span>
            <select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-medium focus:outline-none"
            >
              <option value="All">All Areas</option>
              {areaOptions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          {/* Trade Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-semibold">Trade:</span>
            <select
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-medium focus:outline-none"
            >
              <option value="All">All Trades</option>
              {tradeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-semibold">Company:</span>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 font-medium focus:outline-none"
            >
              <option value="All">All Companies</option>
              {companyOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search worker or trade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* 3. MAIN TABLE: BY WORKSTREAM SUMMARY MODE */}
      {viewMode === 'WORKSTREAM' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Workforce Planning Aggregation (Mon–Sun)</h3>
            </div>
            <div className="text-xs text-slate-400">
              Click any headcount cell to inspect or adjust detailed worker allocations
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-64">Workforce Area / Workstream</th>
                  <th className="py-3 px-3 w-36">Linked Location</th>
                  {weekData?.weekDays.map((d) => (
                    <th key={d.date} className="py-3 px-3 text-center">
                      <div className="font-extrabold text-white">{d.dayName}</div>
                      <div className="text-[10px] text-slate-400">{d.dayNumber} Oct</div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right font-extrabold text-amber-400">Week Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredWorkstreams.map((row, idx) => (
                  <tr key={`${row.zoneId}-${row.workstreamId}-${idx}`} className="hover:bg-slate-800/40 transition-colors">
                    {/* Area & Workstream */}
                    <td className="py-3 px-4 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: row.color || '#3b82f6' }}
                        />
                        <div>
                          <div className="font-bold text-slate-200">
                            {row.zoneCode} — {row.workstreamName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {row.zoneName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Linked Project Location */}
                    <td className="py-3 px-3">
                      {row.linkedLocation ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/25">
                          <Building className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-[110px]" title={row.linkedLocation.name}>
                            {row.linkedLocation.code}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          Site Wide / Non-physical
                        </span>
                      )}
                    </td>

                    {/* 7 Daily Headcount Cells */}
                    {weekData?.weekDays.map((d) => {
                      const count = row.dailyCounts[d.date] || 0;
                      const hasCount = count > 0;
                      return (
                        <td key={d.date} className="py-3 px-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedCellDetail({
                                workstream: row,
                                day: d,
                                allocations: row.dailyAllocations[d.date] || [],
                              });
                            }}
                            className={`w-12 py-1 rounded-lg text-xs font-black transition-all ${
                              hasCount
                                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 shadow-sm'
                                : 'bg-slate-950/60 text-slate-400 hover:text-slate-400 hover:bg-slate-800'
                            }`}
                          >
                            {count}
                          </button>
                        </td>
                      );
                    })}

                    {/* Week Total */}
                    <td className="py-3 px-4 text-right font-black text-amber-400 text-sm">
                      {row.totalWeek}
                    </td>
                  </tr>
                ))}

                {(!weekData?.byWorkstream || weekData.byWorkstream.length === 0) && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      No workstreams found for the active project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. MAIN TABLE: BY PEOPLE MODE */}
      {viewMode === 'PEOPLE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">
                Individual Worker Weekly Schedule ({filteredPeople.length} Workers)
              </h3>
            </div>
            <div className="text-xs text-slate-400 flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Allocated</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                <span>Training</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Leave</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span>Conflict</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/70 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4 w-60">Worker Name & ID</th>
                  <th className="py-3 px-3 w-32">Trade / Role</th>
                  {weekData?.weekDays.map((d) => (
                    <th key={d.date} className="py-3 px-2 text-center min-w-[105px]">
                      <div className="font-extrabold text-white">{d.dayName}</div>
                      <div className="text-[10px] text-slate-400">{d.dayNumber} Oct</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-20">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filteredPeople.map((person) => {
                  const hasWarning = person.complianceStatus === 'WARNING' || person.complianceStatus === 'NOT COMPLIANT';
                  return (
                    <tr key={person.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Worker info - Click opens Quick Worker Panel */}
                      <td
                        className="py-2.5 px-4 font-semibold text-white cursor-pointer group"
                        onClick={() => setQuickPanelPersonId(person.id)}
                        title="Click to view Quick Worker Panel"
                      >
                        <div className="flex items-center space-x-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-amber-400 flex-shrink-0 group-hover:border-amber-400">
                            {(person.displayName || 'Unknown Worker').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center space-x-1">
                              <span className="font-bold text-slate-200 group-hover:text-amber-400 transition-colors">{person.displayName || 'Unknown Worker'}</span>
                              {hasWarning && (
                                <span title="Qualification Expiring or Non-compliant">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                </span>
                              )}
                              {person.conflictsCount > 0 && (
                                <span title="Forward Planning Conflict">
                                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {person.employeeId || '—'} • {person.companyName || 'Not Set'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Trade */}
                      <td className="py-2.5 px-3 text-slate-300 font-medium">
                        {person.tradeRole || 'Not Set'}
                      </td>

                      {/* 7 Days - All States Clickable (Requirements 14 & 15) */}
                      {weekData?.weekDays.map((d) => {
                        const dayCell = person.days[d.date];
                        if (!dayCell) {
                          return (
                            <td key={d.date} className="py-2.5 px-1.5 text-center">
                              <span className="text-[10px] text-slate-400">-</span>
                            </td>
                          );
                        }

                        if (dayCell.hasConflict) {
                          return (
                            <td key={d.date} className="py-2.5 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => setDrilldownData({ type: 'CONFLICT', person, day: d, cell: dayCell })}
                                className="w-full px-2 py-1 rounded-md bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 text-[10px] font-bold truncate cursor-pointer transition-all shadow-2xs"
                                title="Click to view Conflict Details"
                              >
                                ⚠ Conflict
                              </button>
                            </td>
                          );
                        }

                        if (dayCell.status === 'Allocated') {
                          return (
                            <td key={d.date} className="py-2.5 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => setDrilldownData({ type: 'ALLOCATED', person, day: d, cell: dayCell })}
                                className="w-full px-1.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold truncate cursor-pointer transition-all shadow-2xs"
                                title={`Click to view allocation details for ${dayCell.zoneCode} ${dayCell.workstreamName}`}
                              >
                                {dayCell.zoneCode} {dayCell.workstreamName}
                              </button>
                            </td>
                          );
                        }

                        if (dayCell.status === 'Training') {
                          return (
                            <td key={d.date} className="py-2.5 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => setDrilldownData({ type: 'TRAINING', person, day: d, cell: dayCell })}
                                className="w-full px-1.5 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[10px] font-bold cursor-pointer transition-all"
                                title="Click to view Training Session Details"
                              >
                                Training
                              </button>
                            </td>
                          );
                        }

                        if (dayCell.status === 'Leave') {
                          return (
                            <td key={d.date} className="py-2.5 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => setDrilldownData({ type: 'LEAVE', person, day: d, cell: dayCell })}
                                className="w-full px-1.5 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10px] font-bold cursor-pointer transition-all"
                                title="Click to view Leave Details"
                              >
                                On Leave
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td key={d.date} className="py-2.5 px-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => setBulkAllocateData({ personIds: [person.id], date: d.date })}
                              className="w-full py-1 text-[10px] text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded italic cursor-pointer transition-colors"
                              title="Click to allocate this worker"
                            >
                              + Allocate
                            </button>
                          </td>
                        );
                      })}

                      {/* Total Days */}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-200">
                        {person.totalAllocatedDays}d
                      </td>
                    </tr>
                  );
                })}

                {filteredPeople.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      No workers found matching the search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SLIDE-OVER: DETAILED ALLOCATIONS FOR SELECTED CELL */}
      {selectedCellDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg h-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: selectedCellDetail.workstream.color }}
                  />
                  <span>
                    {selectedCellDetail.workstream.zoneCode} — {selectedCellDetail.workstream.workstreamName}
                  </span>
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedCellDetail.day.dayName} {selectedCellDetail.day.date} • {selectedCellDetail.allocations.length} Workers Allocated
                </div>
              </div>
              <button
                onClick={() => setSelectedCellDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedCellDetail.allocations.map((alloc) => (
                <div
                  key={alloc.id}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-amber-400">
                      {(alloc.displayName || 'WK').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-slate-200 text-xs">{alloc.displayName || 'Unknown Worker'}</div>
                      <div className="text-[10px] text-slate-400">
                        {alloc.tradeRole || 'Not Set'} • {alloc.companyName || 'Not Set'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Planned: {alloc.startTime}–{alloc.endTime} • {alloc.shift}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {alloc.actualAttendance || 'Present'}
                    </span>
                  </div>
                </div>
              ))}

              {selectedCellDetail.allocations.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No workers currently allocated for this workstream on this date.
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button
                onClick={() => setSelectedCellDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. ADVANCED COPY SCHEDULE MODAL (WITH PRE-COMMIT VALIDATION) */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <Copy className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Copy Labour Schedule & Multi-Scope Planning</h3>
              </div>
              <button
                onClick={() => setIsCopyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Copy Scope Mode */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Copy Scope
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'WEEK', label: 'Copy Full Week' },
                    { id: 'AREA', label: 'Copy Area / Zone' },
                    { id: 'WORKSTREAM', label: 'Copy Workstream' },
                    { id: 'CREW', label: 'Copy Crew' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setCopyMode(m.id as any);
                        setCopyDryRunResult(null);
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        copyMode === m.id
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source & Target Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Source Period</span>
                  <div className="text-xs font-bold text-white mt-0.5">
                    {startDate} to {weekData?.weekEndDate || startDate}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                    Target Week Start (Monday)
                  </label>
                  <input
                    type="date"
                    value={targetCopyWeekStart}
                    onChange={(e) => {
                      setTargetCopyWeekStart(e.target.value);
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Scope specific filters */}
              {copyMode === 'AREA' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Area / Zone to Copy:</label>
                  <select
                    value={copyFilterZoneId}
                    onChange={(e) => {
                      setCopyFilterZoneId(e.target.value);
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-medium focus:outline-none"
                  >
                    <option value="">Select an area...</option>
                    {weekData?.byWorkstream
                      .map((w) => ({ id: w.zoneId, code: w.zoneCode, name: w.zoneName }))
                      .filter((v, i, a) => a.findIndex((t) => t.id === v.id) === i)
                      .map((z) => (
                        <option key={z.id} value={z.id}>{z.code} — {z.name}</option>
                      ))}
                  </select>
                </div>
              )}

              {copyMode === 'WORKSTREAM' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Select Workstream to Copy:</label>
                  <select
                    value={copyFilterWorkstreamId}
                    onChange={(e) => {
                      setCopyFilterWorkstreamId(e.target.value);
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white font-medium focus:outline-none"
                  >
                    <option value="">Select a workstream...</option>
                    {weekData?.byWorkstream.map((w) => (
                      <option key={`${w.zoneId}-${w.workstreamId}`} value={w.workstreamId}>
                        {w.zoneCode} — {w.workstreamName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Pre-Commit Dry Run Action */}
              {!copyDryRunResult && (
                <div className="pt-2">
                  <button
                    onClick={handleRunCopyPreview}
                    disabled={isDryRunning}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-colors"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{isDryRunning ? 'Validating Conflicts & Availability...' : 'Run Pre-Commit Conflict & Compliance Check'}</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Validates forward conflicts across projects, worker availability, and qualification restrictions before copying.
                  </p>
                </div>
              )}

              {/* Pre-Commit Report & Exclusions */}
              {copyDryRunResult && (
                <div className="space-y-3 bg-slate-950 border border-slate-800 rounded-xl p-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-extrabold text-white">Validation Analysis</span>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      {copyDryRunResult.readyToCopyCount} Ready to Copy
                    </span>
                  </div>

                  {/* Summary badges */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-400 font-semibold">Total Evaluated</div>
                      <div className="text-base font-black text-white">{copyDryRunResult.totalSourceAllocations}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                      <div className="text-[10px] text-rose-400 font-semibold">Conflicts Found</div>
                      <div className="text-base font-black text-rose-300">{copyDryRunResult.conflictsCount}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2 rounded-lg">
                      <div className="text-[10px] text-amber-400 font-semibold">Unavailable / Warnings</div>
                      <div className="text-base font-black text-amber-300">
                        {copyDryRunResult.unavailableCount + copyDryRunResult.warningsCount}
                      </div>
                    </div>
                  </div>

                  {/* Conflict & Problem Records with Exclude Checkbox */}
                  {(copyDryRunResult.conflicts?.length > 0 || copyDryRunResult.unavailableWorkers?.length > 0) && (
                    <div className="space-y-2 mt-2">
                      <div className="text-[11px] font-bold text-slate-300">
                        Detected Problem Records (Uncheck to Exclude from Commit):
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {copyDryRunResult.conflicts?.map((c: any, i: number) => {
                          const isExcluded = excludedPersonIds.includes(c.personId);
                          return (
                            <div
                              key={`conf-${i}`}
                              className="flex items-center justify-between p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-[11px]"
                            >
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setExcludedPersonIds(excludedPersonIds.filter((id) => id !== c.personId));
                                    } else {
                                      setExcludedPersonIds([...excludedPersonIds, c.personId]);
                                    }
                                  }}
                                  className="rounded border-rose-500 text-rose-500 focus:ring-0"
                                />
                                <span className="font-bold text-rose-200">{c.workerName}</span>
                              </label>
                              <span className="text-rose-400 text-[10px]">{c.reason}</span>
                            </div>
                          );
                        })}

                        {copyDryRunResult.unavailableWorkers?.map((u: any, i: number) => {
                          const isExcluded = excludedPersonIds.includes(u.personId);
                          return (
                            <div
                              key={`unavail-${i}`}
                              className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px]"
                            >
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setExcludedPersonIds(excludedPersonIds.filter((id) => id !== u.personId));
                                    } else {
                                      setExcludedPersonIds([...excludedPersonIds, u.personId]);
                                    }
                                  }}
                                  className="rounded border-amber-500 text-amber-500 focus:ring-0"
                                />
                                <span className="font-bold text-amber-200">{u.workerName}</span>
                              </label>
                              <span className="text-amber-400 text-[10px]">{u.reason}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      onClick={() => setCopyDryRunResult(null)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors"
                    >
                      Re-configure Scope
                    </button>
                    <button
                      onClick={handleCommitCopy}
                      disabled={isCommittingCopy || copyDryRunResult.readyToCopyCount === 0}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isCommittingCopy
                          ? 'Committing Allocations...'
                          : `Confirm & Commit Safe Allocations to ${targetCopyWeekStart}`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. PRINT VIEW MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-extrabold text-sm text-slate-900">
                MAXIM FORGE — WEEKLY LABOUR PLAN (PRINT SUMMARY)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Print to Paper / PDF
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="border-b border-slate-300 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{activeProject?.name || activeProject?.code}</h2>
                  <div className="text-xs text-slate-600 font-semibold mt-0.5">
                    Weekly Schedule: {startDate} to {weekData?.weekEndDate} • Shift: {shiftFilter}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  Generated: {new Date().toLocaleDateString()}
                </div>
              </div>

              <table className="w-full text-left text-xs border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                    <th className="p-2">Workforce Area / Workstream</th>
                    <th className="p-2">Location</th>
                    {weekData?.weekDays.map((d) => (
                      <th key={d.date} className="p-2 text-center">{d.dayName}</th>
                    ))}
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {weekData?.byWorkstream.map((w, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-bold">{w.zoneCode} — {w.workstreamName}</td>
                      <td className="p-2">{w.linkedLocation?.code || 'Site Wide'}</td>
                      {weekData?.weekDays.map((d) => (
                        <td key={d.date} className="p-2 text-center font-bold">
                          {w.dailyCounts[d.date] || 0}
                        </td>
                      ))}
                      <td className="p-2 text-right font-black">{w.totalWeek}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-300 pt-6 mt-6 flex justify-between text-xs text-slate-600">
                <div>
                  <span className="font-bold">Project Supervisor Sign-Off:</span> ___________________________
                </div>
                <div>
                  <span className="font-bold">Date:</span> ___________________________
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. WEEK PLANNER DRILLDOWN MODAL (REQUIREMENT 15) */}
      {drilldownData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  drilldownData.type === 'ALLOCATED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : drilldownData.type === 'CONFLICT'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : drilldownData.type === 'TRAINING'
                    ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {drilldownData.type === 'ALLOCATED' && <CheckCircle2 className="w-4 h-4" />}
                  {drilldownData.type === 'CONFLICT' && <ShieldAlert className="w-4 h-4" />}
                  {drilldownData.type === 'TRAINING' && <BookOpen className="w-4 h-4" />}
                  {drilldownData.type === 'LEAVE' && <Clock className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {drilldownData.type === 'ALLOCATED' && 'Shift Allocation Details'}
                    {drilldownData.type === 'CONFLICT' && 'Forward Planning Conflict'}
                    {drilldownData.type === 'TRAINING' && 'Training Session Details'}
                    {drilldownData.type === 'LEAVE' && 'Worker Leave & Unavailability'}
                  </h3>
                  <div className="text-[11px] text-slate-400">{drilldownData.day.formatted}</div>
                </div>
              </div>
              <button
                onClick={() => setDrilldownData(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Worker Header Card */}
              <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-100 text-sm">{drilldownData.person.displayName || 'Unknown Worker'}</div>
                  <div className="text-[11px] text-slate-400">
                    {drilldownData.person.tradeRole || 'Not Set'} &bull; {drilldownData.person.companyName || 'Not Set'}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setQuickPanelPersonId(drilldownData.person.id);
                    setDrilldownData(null);
                  }}
                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  Worker Panel &rarr;
                </button>
              </div>

              {/* Type-Specific Details */}
              {drilldownData.type === 'ALLOCATED' && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Workforce Area</span>
                      <span className="font-bold text-slate-200">{drilldownData.cell.zoneCode || 'Area'}</span>
                      <span className="text-[10px] text-slate-400 block">{drilldownData.cell.zoneName}</span>
                    </div>
                    <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Workstream</span>
                      <span className="font-bold text-amber-400">{drilldownData.cell.workstreamName}</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">Planned Times</span>
                      <span className="font-mono font-bold text-slate-200">
                        {drilldownData.cell.startTime || '07:00'} – {drilldownData.cell.endTime || '15:30'} ({drilldownData.cell.shift || 'Day Shift'})
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Active
                    </span>
                  </div>
                </div>
              )}

              {drilldownData.type === 'CONFLICT' && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2 text-rose-200">
                  <div className="font-bold text-xs flex items-center space-x-1.5 text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span>Overlapping Cross-Project Allocation</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {drilldownData.cell.conflictDetails?.projectDisplay || 'Worker is allocated on another site or project during this date.'}
                  </p>
                </div>
              )}

              {drilldownData.type === 'TRAINING' && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl space-y-2 text-purple-200">
                  <div className="font-bold text-xs flex items-center space-x-1.5 text-purple-300">
                    <BookOpen className="w-4 h-4 text-purple-400" />
                    <span>Certified Training Attendance</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Worker is booked for credential refresher course on {drilldownData.day.formatted}. Shift allocation is blocked for safety compliance.
                  </p>
                </div>
              )}

              {drilldownData.type === 'LEAVE' && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-amber-200">
                  <div className="font-bold text-xs flex items-center space-x-1.5 text-amber-300">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Scheduled Leave / Unavailability</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Worker has approved leave or RDO recorded on {drilldownData.day.formatted}.
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => setDrilldownData(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>

              {drilldownData.type === 'ALLOCATED' && (
                <button
                  onClick={() => {
                    setBulkAllocateData({
                      personIds: [drilldownData.person.id],
                      date: drilldownData.day.date,
                    });
                    setDrilldownData(null);
                  }}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl cursor-pointer shadow-md"
                >
                  Reallocate Worker
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Worker Panel Drawer */}
      <WorkerQuickPanel
        personId={quickPanelPersonId}
        onClose={() => setQuickPanelPersonId(null)}
        onOpenAllocate={(worker) => {
          setQuickPanelPersonId(null);
          setBulkAllocateData({ personIds: [worker.person.id], date: startDate });
        }}
      />

      {/* Bulk / Single Allocate Modal */}
      {bulkAllocateData && (
        <BulkAllocateModal
          isOpen={true}
          onClose={() => setBulkAllocateData(null)}
          onSuccess={() => {
            setBulkAllocateData(null);
            fetchWeekPlan();
          }}
          initialSelectedPersonIds={bulkAllocateData.personIds}
          initialDate={bulkAllocateData.date}
        />
      )}
    </div>
  );
};
