import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Cable,
  Cpu,
  ClipboardCheck,
  AlertTriangle,
  HardHat,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Activity,
  Layers,
  Sparkles,
  Map,
  Camera,
  Plus,
  Users,
} from 'lucide-react';

export const HomeDashboard: React.FC = () => {
  const {
    activeProject,
    stats,
    refreshStats,
    setActiveTab,
    setSiteMode,
    apiFetch,
    setSelectedEquipmentId,
    setSelectedCableId,
    setSelectedItrId,
    setIsProjectManageModalOpen,
    currentUser,
  } = useApp();

  const isAdmin = currentUser.role === 'Administrator' || currentUser.role === 'Project Manager';

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await refreshStats();
      try {
        const res = await apiFetch('/api/audit-logs');
        if (res.ok) {
          const logs = await res.json();
          setAuditLogs(logs);
        }
      } catch (err) {
        console.error('Failed to load audit logs:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const cables = stats?.cables || {
    total: 0,
    installed: 0,
    terminated: 0,
    tested: 0,
    qaApproved: 0,
    installedPercent: 0,
    testedPercent: 0,
    qaApprovedPercent: 0,
  };

  const itrs = stats?.itrs || {
    total: 0,
    draft: 0,
    inProgress: 0,
    submitted: 0,
    approved: 0,
    rejected: 0,
  };

  return (
    <div className="space-y-6">
      {/* Hero Project Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-1" />
              <span>Project Delivery & QA Workspace</span>
              <span>•</span>
              <span className="font-mono">{activeProject?.code}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeProject?.name || 'DC Melbourne 02'}
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              {activeProject?.description || 'Hyperscale Data Centre Build - Stage 2 Electrical & Fitout'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setIsProjectManageModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold text-xs transition-colors cursor-pointer shadow-sm"
                title="Launch Project Onboarding & Setup Wizard"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Project Wizard</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('workforce')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-amber-400" />
              <span>Workforce Board</span>
            </button>
            <button
              onClick={() => setActiveTab('maps')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Map className="w-4 h-4 text-cyan-400" />
              <span>Interactive Level Maps</span>
            </button>
            <button
              onClick={() => setActiveTab('photos')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <Camera className="w-4 h-4 text-amber-400" />
              <span>Photo Evidence ({stats?.photosCount || 0})</span>
            </button>
            <button
              onClick={() => setSiteMode(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all hover:scale-102 cursor-pointer"
            >
              <HardHat className="w-4 h-4" />
              <span>Enter Site Mode</span>
            </button>
          </div>
        </div>
      </div>

      {/* Demo Project Notice Banner */}
      {(activeProject?.code === 'PRJ-MEL-01' || activeProject?.name?.includes('Melbourne Data Centre')) && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 shadow-sm">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0 font-black text-xs">
              DEMO
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                Demo Project Environment — Fictional Geometry & Sample Schedules
              </div>
              <div className="text-xs text-amber-200/80 mt-0.5">
                Current floor plans, room geometry, and tray layouts are generated demonstration content. To set up an authentic construction project, launch the Onboarding Wizard.
              </div>
            </div>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsProjectManageModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shrink-0 self-start sm:self-auto transition-colors cursor-pointer shadow-sm"
            >
              + Setup New Project
            </button>
          )}
        </div>
      )}

      {/* Real Progress Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cables Delivery Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span className="flex items-center space-x-1.5 text-blue-400 uppercase tracking-wider text-[11px] font-bold">
              <Cable className="w-3.5 h-3.5" />
              <span>Cables Installed</span>
            </span>
            <span className="font-mono text-slate-300 font-bold">
              {cables.installed} / {cables.total}
            </span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {cables.installedPercent}%
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${cables.installedPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 font-medium">
            <span>Terminated: {cables.terminated}</span>
            <button
              onClick={() => setActiveTab('cables')}
              className="text-blue-400 hover:underline flex items-center space-x-0.5"
            >
              <span>View register</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Cable Testing Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span className="flex items-center space-x-1.5 text-amber-400 uppercase tracking-wider text-[11px] font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Testing Complete</span>
            </span>
            <span className="font-mono text-slate-300 font-bold">
              {cables.tested} / {cables.total}
            </span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {cables.testedPercent}%
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${cables.testedPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 font-medium">
            <span>Insulation / Continuity</span>
            <button
              onClick={() => setActiveTab('testing')}
              className="text-amber-400 hover:underline flex items-center space-x-0.5"
            >
              <span>View tests</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* QA Sign-off Complete */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span className="flex items-center space-x-1.5 text-emerald-400 uppercase tracking-wider text-[11px] font-bold">
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>QA Approved</span>
            </span>
            <span className="font-mono text-slate-300 font-bold">
              {cables.qaApproved} / {cables.total}
            </span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {cables.qaApprovedPercent}%
          </div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mt-3">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${cables.qaApprovedPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 font-medium">
            <span>{itrs.submitted} ITRs in review</span>
            <button
              onClick={() => setActiveTab('itrs')}
              className="text-emerald-400 hover:underline flex items-center space-x-0.5"
            >
              <span>Review ITRs</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Equipment & Defects */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span className="flex items-center space-x-1.5 text-rose-400 uppercase tracking-wider text-[11px] font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Open Defects</span>
            </span>
            <span className="text-[11px] text-slate-400">
              {stats?.equipmentCount || 5} Major Units
            </span>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {stats?.openIssues ?? 0}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            Active items needing rectification before final handover sign-off.
          </div>
          <div className="mt-3 text-[11px]">
            <button
              onClick={() => setActiveTab('issues')}
              className="text-rose-400 hover:underline flex items-center space-x-0.5 font-semibold"
            >
              <span>Manage issues</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Core Workspaces & Recent Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Connected Workspaces & Quick Nav */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>Core Project Modules</span>
              </h2>
              <span className="text-xs text-slate-400">All modules active & functional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Equipment Card */}
              <button
                onClick={() => setActiveTab('equipment')}
                className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                      {stats?.equipmentCount || 5} units
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-3 group-hover:text-amber-400 transition-colors">
                    Equipment Objects
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    UT-01, MSB-01 central object pages, cable terminations, and testing.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                  <span>Open equipment register →</span>
                </div>
              </button>

              {/* Cable Register Card */}
              <button
                onClick={() => setActiveTab('cables')}
                className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/40 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                      <Cable className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                      {cables.total} cables
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-3 group-hover:text-blue-400 transition-colors">
                    Cable Register & Import
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Searchable register, Excel schedule import with column mapping & diffs.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                  <span>Open cable register →</span>
                </div>
              </button>

              {/* ITR System Card */}
              <button
                onClick={() => setActiveTab('itrs')}
                className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-purple-500/40 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold">
                      <ClipboardCheck className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                      {itrs.total} inspections
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-3 group-hover:text-purple-400 transition-colors">
                    ITRs & Template Builder
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Spreadsheet test tables, auto-population, and supervisor approval flow.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>Open inspection workflows →</span>
                </div>
              </button>

              {/* Location Hierarchy */}
              <button
                onClick={() => setActiveTab('locations')}
                className="p-4 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/40 text-left transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                      <Layers className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded">
                      Levels & Rooms
                    </span>
                  </div>
                  <h3 className="font-bold text-white text-sm mt-3 group-hover:text-emerald-400 transition-colors">
                    Physical Hierarchy
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Level 01, Level 02 → Switch Room 01, Switch Room 02, Data Hall 01.
                  </p>
                </div>
                <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                  <span>Explore locations →</span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick End-to-End Workflow Guide Banner */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start space-x-3 text-slate-200">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-amber-300 text-sm">Target End-to-End Flow Ready:</div>
              <div>
                <strong>1.</strong> Create Location / Equipment (UT-01) → <strong>2.</strong> Import Cables → <strong>3.</strong> Open Cable & Bulk/Single ITR → <strong>4.</strong> Tradesperson completes form with spreadsheet readings → <strong>5.</strong> Submit → <strong>6.</strong> Supervisor Reviews & Approves → <strong>7.</strong> Cable QA status updates to Approved and Equipment metrics advance!
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Construction Audit Trail */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Activity className="w-4 h-4 text-amber-400" />
              <span>Project Audit Trail</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">Traceability</span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                No activity logs recorded yet.
              </div>
            ) : (
              auditLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 text-xs space-y-1 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {log.action} {log.entityType}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                        log.action === 'Approve'
                          ? 'bg-emerald-950 text-emerald-400'
                          : log.action === 'Submit'
                          ? 'bg-blue-950 text-blue-400'
                          : log.action === 'Create'
                          ? 'bg-amber-950 text-amber-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.entityCode}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>
                      {log.performedByName} ({log.performedByRole})
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
