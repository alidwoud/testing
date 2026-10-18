import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Users,
  Search,
  Filter,
  Check,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Layers,
  Building,
  ArrowRight,
  Shield,
  ShieldAlert,
  Sparkles,
  ChevronRight,
  CheckSquare,
  Square,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface BulkAllocateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSelectedPersonIds?: number[];
  initialDate?: string;
  initialShift?: string;
}

export const BulkAllocateModal: React.FC<BulkAllocateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSelectedPersonIds = [],
  initialDate,
  initialShift = 'Day Shift',
}) => {
  const { activeProject, userProjects, currentUser, addToast } = useApp();

  // Wizard Steps: 1 = SELECT WORKERS, 2 = ASSIGN ONCE, 3 = REVIEW & COMMIT
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [targetProjectId, setTargetProjectId] = useState<number>(activeProject?.id || 1);
  const [date, setDate] = useState<string>(initialDate || '2026-10-12');
  const [shift, setShift] = useState<string>(initialShift);
  const [startTime, setStartTime] = useState<string>('07:00');
  const [endTime, setEndTime] = useState<string>('15:30');
  const [zoneId, setZoneId] = useState<number | ''>('');
  const [workstreamId, setWorkstreamId] = useState<number | ''>('');
  const [crewId, setCrewId] = useState<number | ''>('');
  const [supervisorName, setSupervisorName] = useState<string>('');

  // People & Selection State
  const [people, setPeople] = useState<any[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(initialSelectedPersonIds));

  // Selection Filters
  const [search, setSearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState('All');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [crewFilter, setCrewFilter] = useState('All');
  const [unallocatedOnly, setUnallocatedOnly] = useState(false);

  // Available Areas & Workstreams
  const [zones, setZones] = useState<any[]>([]);
  const [crews, setCrews] = useState<any[]>([]);

  // Validation / Review Result
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [reviewResult, setReviewResult] = useState<{
    readyWorkers: any[];
    exceptions: any[];
    warnings: any[];
  } | null>(null);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedIds(new Set(initialSelectedPersonIds));
      if (initialDate) setDate(initialDate);
      if (initialShift) setShift(initialShift);
      setReviewResult(null);
      fetchPeopleList();
      fetchZonesAndCrews();
    }
  }, [isOpen, initialSelectedPersonIds, initialDate, initialShift]);

  const fetchPeopleList = async () => {
    setLoadingPeople(true);
    try {
      const res = await fetch(`/api/workforce/people?projectId=${targetProjectId}`, {
        headers: {
          'x-project-id': String(targetProjectId),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setPeople(data.people || data || []);
      }
    } catch (err) {
      console.error('Failed to load workers:', err);
    } finally {
      setLoadingPeople(false);
    }
  };

  const fetchZonesAndCrews = async () => {
    try {
      const [zRes, cRes] = await Promise.all([
        fetch(`/api/workforce/zones?projectId=${targetProjectId}`, {
          headers: { 'x-project-id': String(targetProjectId), 'x-user-role': currentUser.role },
        }),
        fetch(`/api/workforce/crews?projectId=${targetProjectId}`, {
          headers: { 'x-project-id': String(targetProjectId), 'x-user-role': currentUser.role },
        }),
      ]);
      if (zRes.ok) {
        const zData = await zRes.json();
        setZones(zData || []);
        if (zData?.length > 0 && !zoneId) {
          setZoneId(zData[0].id);
          if (zData[0].workstreams?.length > 0) {
            setWorkstreamId(zData[0].workstreams[0].id);
          }
        }
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setCrews(cData || []);
      }
    } catch (err) {
      console.error('Failed to load zones/crews:', err);
    }
  };

  // Filtered workers list for step 1
  const filteredPeople = useMemo(() => {
    return people.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.displayName.toLowerCase().includes(q) ||
        p.employeeId.toLowerCase().includes(q) ||
        p.companyName.toLowerCase().includes(q);
      const matchTrade = tradeFilter === 'All' || p.tradeRole === tradeFilter;
      const matchCompany = companyFilter === 'All' || p.companyName === companyFilter;
      return matchSearch && matchTrade && matchCompany;
    });
  }, [people, search, tradeFilter, companyFilter]);

  // Unique trades and companies for filter dropdowns
  const tradesList = useMemo(() => {
    return Array.from(new Set(people.map((p) => p.tradeRole).filter(Boolean)));
  }, [people]);

  const companiesList = useMemo(() => {
    return Array.from(new Set(people.map((p) => p.companyName).filter(Boolean)));
  }, [people]);

  // Selected Area's Workstreams
  const activeZoneWorkstreams = useMemo(() => {
    const found = zones.find((z) => z.id === Number(zoneId));
    return found?.workstreams || [];
  }, [zones, zoneId]);

  // Toggle selection
  const toggleSelectPerson = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredPeople.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  // Step 2 -> Step 3: Run Validation Dry Run
  const handleRunValidation = async () => {
    if (!zoneId || !workstreamId) {
      addToast('error', 'Missing Information', 'Area and Workstream are required');
      return;
    }
    if (selectedIds.size === 0) {
      addToast('error', 'No Workers Selected', 'Please select at least one worker');
      return;
    }

    setIsValidating(true);
    try {
      const payload = {
        personIds: Array.from(selectedIds),
        date,
        shift,
        startTime,
        endTime,
        zoneId: Number(zoneId),
        workstreamId: Number(workstreamId),
        crewId: crewId ? Number(crewId) : undefined,
        supervisorName,
        dryRun: true,
      };

      const res = await fetch('/api/workforce/allocations/bulk-allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(targetProjectId),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to validate bulk allocation');

      setReviewResult({
        readyWorkers: data.readyWorkers || [],
        exceptions: data.exceptions || [],
        warnings: data.warnings || [],
      });
      setStep(3);
    } catch (err: any) {
      addToast('error', 'Validation Error', err.message);
    } finally {
      setIsValidating(false);
    }
  };

  // Step 3: Commit Valid Workers (One invalid worker never blocks valid workers!)
  const handleCommitValid = async (onlyValid: boolean = true) => {
    if (!reviewResult) return;
    setIsCommitting(true);

    try {
      const workersToCommit = onlyValid
        ? reviewResult.readyWorkers.map((w) => w.personId)
        : Array.from(selectedIds);

      if (workersToCommit.length === 0) {
        addToast('error', 'No Valid Workers', 'No valid workers available to allocate');
        return;
      }

      const payload = {
        personIds: workersToCommit,
        date,
        shift,
        startTime,
        endTime,
        zoneId: Number(zoneId),
        workstreamId: Number(workstreamId),
        crewId: crewId ? Number(crewId) : undefined,
        supervisorName,
        dryRun: false,
      };

      const res = await fetch('/api/workforce/allocations/bulk-allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(targetProjectId),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to commit allocations');

      addToast(
        'success',
        'Labour Allocated',
        `Successfully allocated ${data.allocatedCount} workers for ${date} (${shift})`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Commit Error', err.message);
    } finally {
      setIsCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header with Wizard Step Indicator */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Allocate Labour (Bulk Assignment)</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                  {selectedIds.size} Selected
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Select workers, configure assignment parameters once, and review conflict checks before commit.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Step badges */}
            <div className="hidden sm:flex items-center space-x-2 text-xs font-bold">
              <span
                className={`px-2.5 py-1 rounded-lg ${
                  step === 1 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                1. Select ({selectedIds.size})
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span
                className={`px-2.5 py-1 rounded-lg ${
                  step === 2 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                2. Assign
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span
                className={`px-2.5 py-1 rounded-lg ${
                  step === 3 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                3. Review
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wizard Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* =================================================== */}
          {/* STEP 1: SELECT WORKERS                              */}
          {/* =================================================== */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Filter Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search worker name, ID, trade..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 outline-none"
                  />
                </div>

                <div>
                  <select
                    value={tradeFilter}
                    onChange={(e) => setTradeFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="All">All Trades</option>
                    {tradesList.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="All">All Companies</option>
                    {companiesList.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quick Selection Shortcuts */}
              <div className="flex flex-wrap items-center justify-between text-xs border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] cursor-pointer"
                  >
                    Select All Visible ({filteredPeople.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] cursor-pointer"
                  >
                    Clear Selection
                  </button>
                </div>
                <div className="text-slate-400 font-medium">
                  Showing {filteredPeople.length} workers &bull;{' '}
                  <strong className="text-amber-400">{selectedIds.size} selected</strong>
                </div>
              </div>

              {/* Worker Checkbox List */}
              <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                {loadingPeople ? (
                  <div className="py-12 text-center text-slate-400">Loading worker directory...</div>
                ) : filteredPeople.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">No workers matching filters</div>
                ) : (
                  filteredPeople.map((person) => {
                    const isSelected = selectedIds.has(person.id);
                    return (
                      <div
                        key={person.id}
                        onClick={() => toggleSelectPerson(person.id)}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500/50 text-white'
                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/60 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                          />
                          <div>
                            <div className="font-bold text-xs flex items-center space-x-2">
                              <span>{person.displayName}</span>
                              <span className="text-[10px] font-mono text-slate-400">
                                {person.employeeId}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center space-x-2 mt-0.5">
                              <span>{person.tradeRole}</span>
                              <span>&bull;</span>
                              <span>{person.companyName}</span>
                              {person.classification && (
                                <>
                                  <span>&bull;</span>
                                  <span className="text-slate-400">{person.classification}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              person.employmentStatus === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {person.employmentStatus}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* STEP 2: ASSIGN ONCE                                 */}
          {/* =================================================== */}
          {step === 2 && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-300 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Configuring single assignment template for <strong>{selectedIds.size} selected workers</strong>.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                {/* Project */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Destination Project <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={targetProjectId}
                    onChange={(e) => {
                      setTargetProjectId(Number(e.target.value));
                      fetchZonesAndCrews();
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    {userProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} &bull; {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Allocation Date <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>

                {/* Area / Zone */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Area / Zone <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={zoneId}
                    onChange={(e) => {
                      const nextZ = Number(e.target.value) || '';
                      setZoneId(nextZ);
                      const z = zones.find((item) => item.id === nextZ);
                      if (z?.workstreams?.length > 0) {
                        setWorkstreamId(z.workstreams[0].id);
                      } else {
                        setWorkstreamId('');
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">-- Choose Area --</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        [{z.code}] {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Workstream */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Workstream <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={workstreamId}
                    onChange={(e) => setWorkstreamId(Number(e.target.value) || '')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">-- Choose Workstream --</option>
                    {activeZoneWorkstreams.map((ws: any) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name} ({ws.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Shift */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Shift
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => {
                      setShift(e.target.value);
                      if (e.target.value === 'Day Shift') {
                        setStartTime('07:00');
                        setEndTime('15:30');
                      } else if (e.target.value === 'Back Shift') {
                        setStartTime('15:00');
                        setEndTime('23:00');
                      } else if (e.target.value === 'Night Shift') {
                        setStartTime('23:00');
                        setEndTime('07:00');
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="Day Shift">Day Shift</option>
                    <option value="Back Shift">Back Shift</option>
                    <option value="Night Shift">Night Shift</option>
                  </select>
                </div>

                {/* Hours */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Finish Time
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* Optional Crew */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Crew Assignment (Optional)
                  </label>
                  <select
                    value={crewId}
                    onChange={(e) => setCrewId(Number(e.target.value) || '')}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">-- No Crew Tag --</option>
                    {crews.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.leadTrade})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Supervisor */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Supervising Leading Hand
                  </label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* =================================================== */}
          {/* STEP 3: REVIEW & COMMIT                             */}
          {/* =================================================== */}
          {step === 3 && reviewResult && (
            <div className="space-y-4">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Selected</div>
                  <div className="text-xl font-black text-white">{selectedIds.size}</div>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/30">
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase">Ready to Allocate</div>
                  <div className="text-xl font-black text-emerald-300">
                    {reviewResult.readyWorkers.length}
                  </div>
                </div>
                <div className="bg-rose-500/10 p-3 rounded-2xl border border-rose-500/30">
                  <div className="text-[10px] text-rose-400 font-semibold uppercase">Exceptions Detected</div>
                  <div className="text-xl font-black text-rose-300">
                    {reviewResult.exceptions.length}
                  </div>
                </div>
              </div>

              {/* Ready Workers Box */}
              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Valid Workers Ready for Immediate Allocation ({reviewResult.readyWorkers.length})</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Destination: {zones.find((z) => z.id === Number(zoneId))?.name || 'Area'} &bull; {shift}
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {reviewResult.readyWorkers.map((w: any) => (
                    <div
                      key={w.personId}
                      className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2 font-medium">
                        <span className="text-slate-200">{w.workerName}</span>
                        <span className="text-[10px] text-slate-500">({w.tradeRole})</span>
                      </div>
                      <span className="text-emerald-400 text-[11px] font-bold">✓ Ready</span>
                    </div>
                  ))}
                  {reviewResult.readyWorkers.length === 0 && (
                    <div className="py-4 text-center text-slate-500 text-xs">
                      No workers passed validation without exceptions.
                    </div>
                  )}
                </div>
              </div>

              {/* Exceptions Box */}
              {reviewResult.exceptions.length > 0 && (
                <div className="bg-rose-950/20 p-4 rounded-2xl border border-rose-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-rose-300 border-b border-rose-500/30 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>Exceptions (Excluded from Commit by Default)</span>
                    </div>
                    <span className="text-[11px] text-rose-400">
                      Valid workers can still be committed safely
                    </span>
                  </div>

                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {reviewResult.exceptions.map((ex: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-slate-950 border border-rose-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                      >
                        <div>
                          <div className="font-bold text-white flex items-center space-x-2">
                            <span>{ex.workerName}</span>
                            <span className="text-[10px] text-rose-400 font-mono bg-rose-500/10 px-1 rounded">
                              {ex.exceptionType}
                            </span>
                          </div>
                          <div className="text-[11px] text-rose-300 mt-0.5">{ex.reason}</div>
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          {ex.suggestedAction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Wizard Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((step - 1) as any)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Back
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>

            {step === 1 && (
              <button
                type="button"
                disabled={selectedIds.size === 0}
                onClick={() => setStep(2)}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>Continue to Assignment ({selectedIds.size} Workers)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                type="button"
                disabled={isValidating || !zoneId || !workstreamId}
                onClick={handleRunValidation}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>{isValidating ? 'Validating Conflicts...' : 'Validate & Review Allocation'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 3 && reviewResult && (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={isCommitting || reviewResult.readyWorkers.length === 0}
                  onClick={() => handleCommitValid(true)}
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isCommitting
                      ? 'Committing...'
                      : `Allocate ${reviewResult.readyWorkers.length} Valid Workers`}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
