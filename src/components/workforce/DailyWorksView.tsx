import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Layers,
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  HardHat,
  AlertTriangle,
  CheckCircle2,
  Building,
  Plus,
  RefreshCw,
  Sparkles,
  MoveRight,
  MapPin,
  LayoutGrid,
  Table,
  Check,
  UserCheck,
  Award,
  Copy,
  Shield,
  ShieldAlert,
  ArrowRight,
  Info,
  Printer,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { DailyLabourBoard } from './DailyLabourBoard.tsx';
import { BulkAllocateModal } from './BulkAllocateModal.tsx';
import { BulkMoveModal } from './BulkMoveModal.tsx';
import { TomorrowLabourModal } from './TomorrowLabourModal.tsx';
import { WorkerQuickPanel } from './WorkerQuickPanel.tsx';
import { PersonProfileModal } from './PersonProfileModal.tsx';
import { DailyLabourExportModal } from './DailyLabourExportModal.tsx';

// ==========================================
// COMPONENT ERROR BOUNDARY (REQUIREMENTS 8 & 9)
// ==========================================
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class DailyWorksErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[DAILY WORKS] Unhandled render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-lg mx-auto my-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-wide uppercase">
              DAILY WORKS COULDN'T LOAD
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {this.state.error?.message || 'An unexpected rendering error occurred. The technical error has been logged.'}
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                if (this.props.onReset) this.props.onReset();
              }}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>TRY AGAIN</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// MAIN DAILY WORKS VIEW
// ==========================================
export const DailyWorksViewInner: React.FC = () => {
  const { activeProject, currentUser, addToast } = useApp();

  // Controls (Requirement 3: Project, Date, Shift, Planned/Actual, Views)
  const [date, setDate] = useState<string>('2026-10-12');
  const [shift, setShift] = useState<string>('Day Shift');
  const [viewMode, setViewMode] = useState<'BY_AREA' | 'BY_PERSON' | 'SPATIAL'>('BY_AREA');
  const [dataMode, setDataMode] = useState<'PLANNED' | 'ACTUAL'>('PLANNED');

  // Search & Filter
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('All');
  const [personStatusFilter, setPersonStatusFilter] = useState<'ALL' | 'ALLOCATED' | 'UNALLOCATED' | 'UNAVAILABLE'>('ALL');

  // Board Data & Loading State
  const [boardData, setBoardData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [buildingPrevious, setBuildingPrevious] = useState(false);

  // Collapsed Area & Workstream IDs for 'BY_AREA' view
  const [collapsedZones, setCollapsedZones] = useState<Set<number>>(new Set());
  const [collapsedStreams, setCollapsedStreams] = useState<Set<number>>(new Set());

  // Modals & Panels
  const [isBulkAllocateOpen, setIsBulkAllocateOpen] = useState(false);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);
  const [isTomorrowOpen, setIsTomorrowOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [quickPanelPersonId, setQuickPanelPersonId] = useState<number | null>(null);
  const [profileModalPersonId, setProfileModalPersonId] = useState<number | null>(null);

  // Selected Worker for quick allocation / bulk move
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<number>>(new Set());

  // Fetch Daily Works
  const fetchDailyWorks = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await fetch(
        `/api/workforce/daily-board?projectId=${activeProject?.id || 1}&date=${date}&shift=${encodeURIComponent(
          shift
        )}`,
        {
          headers: {
            'x-project-id': String(activeProject?.id || 1),
            'x-user-role': currentUser.role,
          },
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to load daily works data`);
      }

      const data = await res.json();
      setBoardData(data);
    } catch (err: any) {
      console.error('[DAILY WORKS] API Failure:', err);
      setApiError(err.message || 'Failed to load daily works');
    } finally {
      setLoading(false);
    }
  }, [activeProject, date, shift, currentUser.role]);

  useEffect(() => {
    fetchDailyWorks();
  }, [fetchDailyWorks]);

  // Collapse toggles
  const toggleZone = (zId: number) => {
    setCollapsedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zId)) next.delete(zId);
      else next.add(zId);
      return next;
    });
  };

  const toggleStream = (sId: number) => {
    setCollapsedStreams((prev) => {
      const next = new Set(prev);
      if (next.has(sId)) next.delete(sId);
      else next.add(sId);
      return next;
    });
  };

  // Safe Total Allocated Worker count
  const totalAllocatedWorkers = useMemo(() => {
    if (!boardData?.zones || !Array.isArray(boardData.zones)) return 0;
    return boardData.zones.reduce((sum: number, z: any) => {
      if (!z || !Array.isArray(z.workstreams)) return sum;
      return (
        sum +
        z.workstreams.reduce((sSum: number, s: any) => sSum + (s?.allocations?.length || 0), 0)
      );
    }, 0);
  }, [boardData]);

  // Safe Flattened allocations list for 'BY_PERSON' (Requirement 5)
  const allAllocatedItems = useMemo(() => {
    if (!boardData?.zones || !Array.isArray(boardData.zones)) return [];
    const list: any[] = [];
    boardData.zones.forEach((z: any) => {
      if (!z || !Array.isArray(z.workstreams)) return;
      z.workstreams.forEach((s: any) => {
        if (!s || !Array.isArray(s.allocations)) return;
        s.allocations.forEach((a: any) => {
          if (!a) return;
          list.push({
            type: 'ALLOCATED',
            allocation: a,
            person: a.person || {},
            zone: z,
            workstream: s,
          });
        });
      });
    });
    return list;
  }, [boardData]);

  // Flattened unallocated and unavailable items
  const allPersonItems = useMemo(() => {
    const list = [...allAllocatedItems];

    // Unallocated workers
    if (boardData?.unallocated && Array.isArray(boardData.unallocated)) {
      boardData.unallocated.forEach((u: any) => {
        if (!u) return;
        list.push({
          type: 'UNALLOCATED',
          allocation: null,
          person: u,
          zone: null,
          workstream: null,
        });
      });
    }

    // Unavailable workers (Leave / Training / Qualifications)
    if (boardData?.unavailable && Array.isArray(boardData.unavailable)) {
      boardData.unavailable.forEach((u: any) => {
        if (!u) return;
        list.push({
          type: 'UNAVAILABLE',
          allocation: null,
          person: u,
          zone: null,
          workstream: null,
        });
      });
    }

    return list;
  }, [allAllocatedItems, boardData]);

  // Filtered person rows
  const filteredPersonRows = useMemo(() => {
    return allPersonItems.filter((item) => {
      // 1. Status Filter
      if (personStatusFilter === 'ALLOCATED' && item.type !== 'ALLOCATED') return false;
      if (personStatusFilter === 'UNALLOCATED' && item.type !== 'UNALLOCATED') return false;
      if (personStatusFilter === 'UNAVAILABLE' && item.type !== 'UNAVAILABLE') return false;

      // 2. Trade Filter
      const p = item.person || {};
      const trade = p.tradeRole || 'Not Set';
      if (tradeFilter !== 'All' && trade !== tradeFilter) return false;

      // 3. Search query
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const displayName = (p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Worker').toLowerCase();
      const empId = (p.employeeId || '').toLowerCase();
      const zoneName = (item.zone?.name || 'Unassigned').toLowerCase();
      const streamName = (item.workstream?.name || 'Unassigned').toLowerCase();
      const company = (p.companyName || 'Not Set').toLowerCase();

      return (
        displayName.includes(q) ||
        empId.includes(q) ||
        zoneName.includes(q) ||
        streamName.includes(q) ||
        company.includes(q)
      );
    });
  }, [allPersonItems, personStatusFilter, tradeFilter, search]);

  // Unique trades list
  const tradesList = useMemo(() => {
    const set = new Set<string>();
    allPersonItems.forEach((item) => {
      if (item.person?.tradeRole) {
        set.add(item.person.tradeRole);
      }
    });
    return Array.from(set);
  }, [allPersonItems]);

  // Quick Action: Build from previous day
  const handleQuickBuildFromPrevious = async () => {
    setBuildingPrevious(true);
    try {
      // Determine previous day (date - 1 day)
      const curDate = new Date(date);
      curDate.setDate(curDate.getDate() - 1);
      const prevDateStr = curDate.toISOString().split('T')[0];

      const res = await fetch('/api/workforce/daily-board/build-from-previous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          sourceDate: prevDateStr,
          targetDate: date,
          shift,
          previewOnly: false,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to replicate schedule from previous day');
      }

      const result = await res.json();
      addToast(
        'success',
        'Daily Works Built',
        `Applied ${result.appliedCount || 0} allocations from ${prevDateStr}.${
          result.skippedCount ? ` Skipped ${result.skippedCount} exceptions.` : ''
        }`
      );
      fetchDailyWorks();
    } catch (err: any) {
      console.error('[DAILY WORKS] Replicate failure:', err);
      addToast('error', 'Replication Blocked', err.message);
    } finally {
      setBuildingPrevious(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* =================================================== */}
      {/* 1. TOP CONTROLS BAR (REQUIREMENT 3)                  */}
      {/* =================================================== */}
      <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-2xl shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Project Display / Indicator */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Project
            </label>
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-800">
              <Building className="w-3.5 h-3.5 text-amber-500" />
              <span>{activeProject?.code || 'Unassigned'}</span>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Date
            </label>
            <div className="flex items-center space-x-1">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Shift Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Shift
            </label>
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-bold focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="Day Shift">Day Shift (07:00–15:30)</option>
              <option value="Back Shift">Back Shift (15:00–23:00)</option>
              <option value="Night Shift">Night Shift (23:00–07:00)</option>
            </select>
          </div>

          {/* Planned vs Actual Switch */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Data Mode
            </label>
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDataMode('PLANNED')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  dataMode === 'PLANNED'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Planned
              </button>
              <button
                type="button"
                onClick={() => setDataMode('ACTUAL')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  dataMode === 'ACTUAL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Actual / Muster
              </button>
            </div>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher Tabs */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setViewMode('BY_AREA')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'BY_AREA'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>BY AREA</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('BY_PERSON')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'BY_PERSON'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>BY PERSON</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('SPATIAL')}
              className={`px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all cursor-pointer ${
                viewMode === 'SPATIAL'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>SPATIAL BOARD</span>
            </button>
          </div>

          {/* Quick Actions */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-700 hover:border-amber-400/50 text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all shrink-0"
            title="Export Excel (.XLSX), PDF, or Print Daily Labour Sheet"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span>EXPORT / PRINT</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBulkAllocateOpen(true)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Allocate</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTomorrowOpen(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer transition-all shrink-0"
            title="Preview Tomorrow's Labour Setup"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Tomorrow</span>
          </button>
        </div>
      </div>

      {/* =================================================== */}
      {/* 2. API ERROR STATE (REQUIREMENT 8)                  */}
      {/* =================================================== */}
      {apiError && (
        <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-wide uppercase">
              DAILY WORKS COULDN'T LOAD
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {apiError}
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchDailyWorks()}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>TRY AGAIN</span>
          </button>
        </div>
      )}

      {/* =================================================== */}
      {/* 3. LOADING STATE                                    */}
      {/* =================================================== */}
      {loading && !apiError && (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
          <span className="text-xs font-semibold text-slate-600">Loading Daily Works for {date} ({shift})...</span>
        </div>
      )}

      {/* =================================================== */}
      {/* 4. SAFE EMPTY STATE (REQUIREMENT 7)                 */}
      {/* =================================================== */}
      {!loading && !apiError && totalAllocatedWorkers === 0 && viewMode !== 'SPATIAL' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-wide uppercase">
              NO LABOUR ALLOCATED FOR THIS DATE
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              There are currently 0 active worker allocations recorded for {date} ({shift}) on {activeProject?.code || 'Unassigned'}.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsBulkAllocateOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs cursor-pointer inline-flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>ALLOCATE LABOUR</span>
            </button>
            <button
              type="button"
              onClick={handleQuickBuildFromPrevious}
              disabled={buildingPrevious}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer inline-flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Copy className="w-4 h-4 text-emerald-400" />
              <span>{buildingPrevious ? 'BUILDING SCHEDULE...' : 'BUILD FROM PREVIOUS DAY'}</span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================== */}
      {/* 5. VIEW 1: BY AREA (REQUIREMENT 4)                  */}
      {/* =================================================== */}
      {!loading && !apiError && viewMode === 'BY_AREA' && totalAllocatedWorkers > 0 && (
        <div className="space-y-4">
          {(!boardData?.zones || boardData.zones.length === 0) ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-xs">
              No Areas or Zones configured for this project.
            </div>
          ) : (
            boardData.zones.map((zone: any) => {
              if (!zone) return null;
              const isZoneCollapsed = collapsedZones.has(zone.id);
              const workstreams = Array.isArray(zone.workstreams) ? zone.workstreams : [];
              const totalZoneWorkers = workstreams.reduce(
                (sum: number, ws: any) => sum + (ws?.allocations?.length || 0),
                0
              );

              return (
                <div
                  key={zone.id}
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs transition-all"
                >
                  {/* Area / Zone Header (e.g. LA1 — 54) */}
                  <div
                    onClick={() => toggleZone(zone.id)}
                    className="p-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <button type="button" className="text-slate-500 hover:text-slate-900 cursor-pointer">
                        {isZoneCollapsed ? (
                          <ChevronRight className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 font-mono font-black text-xs flex items-center justify-center shrink-0">
                        {zone.code || 'AREA'}
                      </span>
                      <div>
                        <h3 className="font-extrabold text-sm text-slate-900 flex items-center space-x-2">
                          <span>{zone.name || 'Unassigned'}</span>
                          <span className="text-xs font-black text-amber-700 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                            {totalZoneWorkers} Workers
                          </span>
                        </h3>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 font-medium">
                      {workstreams.length} Workstreams
                    </div>
                  </div>

                  {/* Workstreams List */}
                  {!isZoneCollapsed && (
                    <div className="p-3.5 sm:p-4 space-y-3.5 bg-slate-50/30">
                      {workstreams.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs italic">
                          No workstreams under this area.
                        </div>
                      ) : (
                        workstreams.map((stream: any) => {
                          if (!stream) return null;
                          const isStreamCollapsed = collapsedStreams.has(stream.id);
                          const allocations = Array.isArray(stream.allocations) ? stream.allocations : [];
                          const workersCount = allocations.length;

                          return (
                            <div
                              key={stream.id}
                              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
                            >
                              {/* Workstream Sub-Header (e.g. Lighting — 18) */}
                              <div
                                onClick={() => toggleStream(stream.id)}
                                className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between cursor-pointer select-none hover:bg-slate-100/40"
                              >
                                <div className="flex items-center space-x-2.5">
                                  <button type="button" className="text-slate-400 hover:text-slate-700 cursor-pointer">
                                    {isStreamCollapsed ? (
                                      <ChevronRight className="w-3.5 h-3.5" />
                                    ) : (
                                      <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: stream.color || '#3b82f6' }}
                                  />
                                  <div className="font-bold text-xs text-slate-900 flex items-center space-x-2">
                                    <span>{stream.name || 'Unassigned'}</span>
                                    {stream.code && (
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ({stream.code})
                                      </span>
                                    )}
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-slate-100 text-slate-700">
                                      {workersCount}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsBulkAllocateOpen(true);
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold text-amber-700 hover:bg-amber-50 rounded-lg flex items-center space-x-1 border border-amber-200 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Assign Worker</span>
                                </button>
                              </div>

                              {/* Workers Grid (Worker info: Name, Trade, Crew, Hours, Attendance, Warnings) */}
                              {!isStreamCollapsed && (
                                <div className="p-3">
                                  {workersCount === 0 ? (
                                    <div className="py-4 text-center text-slate-400 text-xs italic">
                                      No personnel assigned to this workstream for {shift}.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                      {allocations.map((alloc: any) => {
                                        if (!alloc) return null;
                                        const p = alloc.person || {};
                                        const displayName =
                                          p.displayName ||
                                          `${p.firstName || ''} ${p.lastName || ''}`.trim() ||
                                          'Unknown Worker';
                                        const empId = p.employeeId || '—';
                                        const tradeRole = p.tradeRole || 'Not Set';
                                        const crewName = alloc.crewName || p.crewName || null;
                                        const hours = alloc.startTime && alloc.endTime ? `${alloc.startTime}–${alloc.endTime}` : '—';
                                        const attendance = alloc.actualAttendance || 'Present';
                                        const warning = alloc.qualificationWarning || null;
                                        const hasAssessedQuals = p.quals && Array.isArray(p.quals) && p.quals.length > 0;

                                        return (
                                          <div
                                            key={alloc.id}
                                            onClick={() => setQuickPanelPersonId(p.id || alloc.personId)}
                                            className="p-2.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/20 transition-all cursor-pointer shadow-2xs space-y-1.5 group"
                                          >
                                            <div className="flex items-center justify-between">
                                              <div className="font-bold text-xs text-slate-900 flex items-center space-x-1.5 truncate">
                                                <span className="truncate group-hover:text-amber-800 transition-colors">
                                                  {displayName}
                                                </span>
                                                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                                  {empId}
                                                </span>
                                              </div>
                                              <span
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold shrink-0 ${
                                                  attendance === 'Absent'
                                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                    : attendance === 'Late'
                                                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                                    : attendance === 'Transferred'
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                }`}
                                              >
                                                {dataMode === 'ACTUAL'
                                                  ? attendance
                                                  : alloc.status || 'Allocated'}
                                              </span>
                                            </div>

                                            <div className="text-[10px] text-slate-500 flex items-center justify-between">
                                              <span>{tradeRole}</span>
                                              <span className="font-mono">{hours}</span>
                                            </div>

                                            <div className="flex items-center justify-between text-[9px] pt-1 border-t border-slate-100">
                                              <span className="text-slate-600 font-medium">
                                                {crewName ? `Crew: ${crewName}` : '—'}
                                              </span>
                                              {warning ? (
                                                <span className="text-rose-600 font-bold flex items-center space-x-0.5">
                                                  <AlertTriangle className="w-3 h-3" />
                                                  <span>Warning</span>
                                                </span>
                                              ) : hasAssessedQuals ? (
                                                <span className="text-emerald-700 font-medium flex items-center space-x-0.5">
                                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                                  <span>Compliant</span>
                                                </span>
                                              ) : (
                                                <span className="text-slate-400 italic">
                                                  Not Assessed
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =================================================== */}
      {/* 6. VIEW 2: BY PERSON (REQUIREMENT 5)                */}
      {/* =================================================== */}
      {!loading && !apiError && viewMode === 'BY_PERSON' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          {/* Sub-Filters: Status pill bar & Search */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Status Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setPersonStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  personStatusFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                All Personnel ({allPersonItems.length})
              </button>
              <button
                type="button"
                onClick={() => setPersonStatusFilter('ALLOCATED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  personStatusFilter === 'ALLOCATED'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Allocated ({allAllocatedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setPersonStatusFilter('UNALLOCATED')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  personStatusFilter === 'UNALLOCATED'
                    ? 'bg-blue-600 text-white font-black shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Unallocated ({boardData?.unallocated?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setPersonStatusFilter('UNAVAILABLE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  personStatusFilter === 'UNAVAILABLE'
                    ? 'bg-rose-600 text-white font-black shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Unavailable ({boardData?.unavailable?.length || 0})
              </button>
            </div>

            {/* Search & Trade Filter */}
            <div className="flex items-center space-x-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search worker, trade, area..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-amber-500 outline-none"
                />
              </div>

              <select
                value={tradeFilter}
                onChange={(e) => setTradeFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:border-amber-500 outline-none cursor-pointer"
              >
                <option value="All">All Trades</option>
                {tradesList.map((t: any) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table with all required columns (Requirement 5) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                  <th className="py-3 px-3">Worker</th>
                  <th className="py-3 px-3">Company</th>
                  <th className="py-3 px-3">Trade</th>
                  <th className="py-3 px-3">Crew</th>
                  <th className="py-3 px-3">Project</th>
                  <th className="py-3 px-3">Area</th>
                  <th className="py-3 px-3">Workstream</th>
                  <th className="py-3 px-3">Shift</th>
                  <th className="py-3 px-3">Hours</th>
                  <th className="py-3 px-3">Supervisor</th>
                  <th className="py-3 px-3 text-center">Attendance</th>
                  <th className="py-3 px-3">Availability</th>
                  <th className="py-3 px-3">Warnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPersonRows.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400">
                      No personnel records match the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredPersonRows.map((item, idx) => {
                    const p = item.person || {};
                    const alloc = item.allocation;
                    const zone = item.zone;
                    const workstream = item.workstream;

                    const displayName =
                      p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Worker';
                    const empId = p.employeeId || '—';
                    const company = p.companyName || 'Not Set';
                    const tradeRole = p.tradeRole || 'Not Set';
                    const crew = alloc?.crewName || p.defaultCrewName || p.crewName || '—';
                    const projectCode = activeProject?.code || 'Unassigned';
                    const areaDisplay = zone?.code ? `${zone.code} — ${zone.name}` : (zone?.name || 'Unassigned');
                    const streamDisplay = workstream?.name || 'Unassigned';
                    const shiftDisplay = alloc?.shift || (item.type === 'UNALLOCATED' ? '—' : shift);
                    const hoursDisplay = alloc && alloc.startTime && alloc.endTime
                      ? `${alloc.startTime}–${alloc.endTime}`
                      : '—';
                    const supervisor = alloc?.supervisorName || p.defaultSupervisorName || '—';
                    const attendance = alloc?.actualAttendance || (item.type === 'ALLOCATED' ? 'Present' : '—');

                    // Availability badge
                    const availability =
                      item.type === 'UNAVAILABLE'
                        ? p.unavailableReason || 'Unavailable'
                        : item.type === 'UNALLOCATED'
                        ? 'Unallocated'
                        : 'Available';

                    // Qualification Warnings / State
                    const hasWarning =
                      alloc?.qualificationWarning ||
                      (p.quals && p.quals.some((q: any) => q.computed?.status === 'EXPIRED'));
                    const hasAssessedQuals = p.quals && Array.isArray(p.quals) && p.quals.length > 0;

                    return (
                      <tr
                        key={`${item.type}-${p.id || idx}`}
                        onClick={() => setQuickPanelPersonId(p.id)}
                        className="hover:bg-amber-50/25 transition-colors cursor-pointer whitespace-nowrap"
                      >
                        {/* Worker */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{displayName}</span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {empId}
                            </span>
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[120px]">
                          {company}
                        </td>

                        {/* Trade */}
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {tradeRole}
                        </td>

                        {/* Crew */}
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {crew}
                        </td>

                        {/* Project */}
                        <td className="py-2.5 px-3 font-mono text-slate-600 font-bold">
                          {projectCode}
                        </td>

                        {/* Area */}
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {areaDisplay}
                        </td>

                        {/* Workstream */}
                        <td className="py-2.5 px-3 text-slate-700">
                          {streamDisplay}
                        </td>

                        {/* Shift */}
                        <td className="py-2.5 px-3 text-slate-600">
                          {shiftDisplay}
                        </td>

                        {/* Hours */}
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {hoursDisplay}
                        </td>

                        {/* Supervisor */}
                        <td className="py-2.5 px-3 text-slate-700">
                          {supervisor}
                        </td>

                        {/* Attendance */}
                        <td className="py-2.5 px-3 text-center">
                          {attendance !== '—' ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                                attendance === 'Absent'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : attendance === 'Late'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : attendance === 'Transferred'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {attendance}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono text-[11px]">—</span>
                          )}
                        </td>

                        {/* Availability */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              availability === 'Available'
                                ? 'bg-emerald-100 text-emerald-800'
                                : availability === 'Unallocated'
                                ? 'bg-slate-100 text-slate-700'
                                : availability === 'Training'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {availability}
                          </span>
                        </td>

                        {/* Warnings / Qualification State */}
                        <td className="py-2.5 px-3">
                          {hasWarning ? (
                            <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <AlertTriangle className="w-3 h-3 text-rose-600" />
                              <span>Action Req</span>
                            </span>
                          ) : hasAssessedQuals ? (
                            <span className="text-emerald-700 text-[10px] font-semibold flex items-center space-x-1">
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">
                              Not Assessed
                            </span>
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
      )}

      {/* =================================================== */}
      {/* 7. VIEW 3: SPATIAL BOARD VIEW (REQUIREMENT 6)       */}
      {/* =================================================== */}
      {viewMode === 'SPATIAL' && <DailyLabourBoard />}

      {/* =================================================== */}
      {/* 8. MODALS & SLIDE-OUT DRAWERS                      */}
      {/* =================================================== */}

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
        onOpenProfile={(id) => setProfileModalPersonId(id)}
      />

      {/* Profile Modal */}
      {profileModalPersonId && (
        <PersonProfileModal
          isOpen={Boolean(profileModalPersonId)}
          personId={profileModalPersonId}
          onClose={() => setProfileModalPersonId(null)}
          onUpdate={() => fetchDailyWorks()}
        />
      )}

      {/* Bulk Allocate Modal */}
      <BulkAllocateModal
        isOpen={isBulkAllocateOpen}
        onClose={() => setIsBulkAllocateOpen(false)}
        onSuccess={() => fetchDailyWorks()}
        initialSelectedPersonIds={Array.from(selectedPersonIds)}
        initialDate={date}
        initialShift={shift}
      />

      {/* Bulk Move Modal */}
      <BulkMoveModal
        isOpen={isBulkMoveOpen}
        onClose={() => setIsBulkMoveOpen(false)}
        onSuccess={() => fetchDailyWorks()}
        selectedPersonIds={Array.from(selectedPersonIds)}
        currentDate={date}
      />

      {/* Tomorrow's Labour Modal */}
      <TomorrowLabourModal
        isOpen={isTomorrowOpen}
        onClose={() => setIsTomorrowOpen(false)}
        onSuccess={() => fetchDailyWorks()}
      />
    </div>
  );
};

// Export wrapped with error protection (Requirement 9)
export const DailyWorksView: React.FC = () => {
  return (
    <DailyWorksErrorBoundary>
      <DailyWorksViewInner />
    </DailyWorksErrorBoundary>
  );
};
