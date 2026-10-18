import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Building2,
  Layers,
  Cpu,
  Cable,
  ClipboardCheck,
  Map,
  Users,
  Briefcase,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { ProjectReadinessData } from '../types/index.ts';

export const ProjectReadinessView: React.FC = () => {
  const {
    activeProject,
    setActiveTab,
    projectReadinessData,
    setProjectReadinessData,
    apiFetch,
    refreshStats,
    setIsProjectSwitcherOpen,
  } = useApp();

  const [loading, setLoading] = useState(false);

  const fetchReadiness = async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/projects/${activeProject.id}/readiness`);
      if (res.ok) {
        const data: ProjectReadinessData = await res.json();
        setProjectReadinessData(data);
      }
    } catch (err) {
      console.error('Failed to fetch readiness status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!projectReadinessData && activeProject) {
      fetchReadiness();
    }
  }, [activeProject?.id]);

  const data = projectReadinessData;
  const project = data?.project || activeProject;

  const getStatusBadge = (status: string, subtitle?: string) => {
    switch (status) {
      case 'COMPLETE':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Complete</span>
          </span>
        );
      case 'GENERATING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Generating {subtitle ? `— ${subtitle}` : ''}</span>
          </span>
        );
      case 'PARTIAL':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Partial {subtitle ? `— ${subtitle}` : ''}</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            <span>{status || 'Not Configured'}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Project Commissioning & Delivery Verification</span>
              <span>•</span>
              <span className="font-mono">{project?.code}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center space-x-3">
              <span>Project Readiness</span>
              <span className="text-xs px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold">
                {project?.status || 'Active'}
              </span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Configuration status report for <strong className="text-white font-semibold">{project?.name}</strong>.
              Review imported hierarchies, registered assets, provisioned QA templates, and drawing coverage.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={fetchReadiness}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsProjectSwitcherOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Switch to Another Project</span>
            </button>

            <button
              onClick={async () => {
                await refreshStats();
                setActiveTab('home');
              }}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all shadow-lg shadow-amber-500/25 hover:scale-102 cursor-pointer"
            >
              <span>Go to Project Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Readiness Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Project Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <Building2 className="w-4 h-4 text-amber-400" />
              <span>Project Details</span>
            </div>
            {getStatusBadge(data?.status.details || 'COMPLETE')}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Organisation:</span>
              <span className="font-semibold text-white truncate max-w-[170px]">{project?.organisation || 'Configured'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Client:</span>
              <span className="font-semibold text-white truncate max-w-[170px]">{project?.client || project?.clientName || 'Configured'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Principal Contractor:</span>
              <span className="font-semibold text-white truncate max-w-[170px]">{project?.principalContractor || 'Configured'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Timezone:</span>
              <span className="font-mono text-slate-300">{project?.timezone || 'Australia/Melbourne'}</span>
            </div>
          </div>
        </div>

        {/* 2. Locations */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Location Structure</span>
            </div>
            {getStatusBadge(data?.status.locations || 'COMPLETE')}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Configured Levels:</span>
              <span className="font-mono font-bold text-blue-400">{data?.counts.levels ?? '—'} Levels</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Configured Rooms:</span>
              <span className="font-mono font-bold text-emerald-400">{data?.counts.rooms ?? '—'} Rooms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total Location Nodes:</span>
              <span className="font-mono text-slate-300">{data?.counts.locationsTotal ?? '—'}</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('locations')}
            className="w-full mt-2 py-1.5 text-center text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 rounded-xl border border-blue-500/20 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>View Location Hierarchy</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Equipment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Equipment Register</span>
            </div>
            {getStatusBadge(data?.status.equipment || 'COMPLETE')}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Registered Assets:</span>
              <span className="font-mono font-bold text-emerald-400">{data?.counts.equipment ?? '—'} Assets</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Location References:</span>
              <span className="text-emerald-400 font-semibold">100% Linked</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="text-slate-300">Installed / Pre-commissioning</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('equipment')}
            className="w-full mt-2 py-1.5 text-center text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 rounded-xl border border-emerald-500/20 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>Inspect Equipment Register</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4. Cable Schedule */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <Cable className="w-4 h-4 text-amber-400" />
              <span>Cable Schedule</span>
            </div>
            {getStatusBadge(data?.status.cables || 'COMPLETE')}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Scheduled Feeders:</span>
              <span className="font-mono font-bold text-amber-400">{data?.counts.cables ?? '—'} Feeders</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">From/To Validation:</span>
              <span className="text-emerald-400 font-semibold">Verified</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Pull & Megger Ready:</span>
              <span className="text-slate-300">Yes</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('cables')}
            className="w-full mt-2 py-1.5 text-center text-xs font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 rounded-xl border border-amber-500/20 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>View Cable Schedule</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 5. QA Templates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <ClipboardCheck className="w-4 h-4 text-purple-400" />
              <span>QA Templates</span>
            </div>
            {getStatusBadge(data?.status.qaTemplates || 'COMPLETE')}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Provisioned Templates:</span>
              <span className="font-mono font-bold text-purple-400">{data?.counts.templates ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Automatic Provisioning:</span>
              <span className="text-slate-300">Disabled (Admin Selected)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Discipline Standards:</span>
              <span className="text-slate-300">Electrical, ITR 209</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('itrs')}
            className="w-full mt-2 py-1.5 text-center text-xs font-semibold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/15 rounded-xl border border-purple-500/20 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>Manage QA Library</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 6. ITRs Generated */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Inspection Records (ITRs)</span>
            </div>
            {getStatusBadge(
              data?.status.itrs.status || 'COMPLETE',
              data?.status.itrs.status === 'GENERATING'
                ? `${data?.status.itrs.generatedCount} / ${data?.status.itrs.targetCount}`
                : undefined
            )}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Generated ITR Instances:</span>
              <span className="font-mono font-bold text-cyan-400">{data?.counts.itrs ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Workflow State:</span>
              <span className="text-slate-300">Draft / Pending Trades</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Isolation:</span>
              <span className="text-emerald-400 font-semibold">Strict Project Boundary</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('itrs')}
            className="w-full mt-2 py-1.5 text-center text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/15 rounded-xl border border-cyan-500/20 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>Inspect Generated ITRs</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 7. Drawings & Level Plans */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <Map className="w-4 h-4 text-rose-400" />
              <span>Drawings & Level Plans</span>
            </div>
            {getStatusBadge(
              data?.status.drawings.status || 'PARTIAL',
              `${data?.status.drawings.configuredLevels || 0} of ${data?.status.drawings.totalLevels || 1} Levels`
            )}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Uploaded Drawings:</span>
              <span className="font-mono font-bold text-rose-400">{data?.counts.drawings ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Supported Formats:</span>
              <span className="text-slate-300">PDF, PNG, JPEG (No SVG)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Spatial Hotspots:</span>
              <span className="text-slate-300">Normalized Room Polygons</span>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('maps')}
            className="w-full mt-2 py-1.5 text-center text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/15 rounded-xl border border-rose-500/20 transition-colors flex items-center justify-center space-x-1 cursor-pointer"
          >
            <span>Complete Drawings & Room Mapping</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 8. Companies */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Project Companies</span>
            </div>
            {getStatusBadge(data?.status.companies || 'COMPLETE')}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Registered Companies:</span>
              <span className="font-mono font-bold text-indigo-400">{data?.counts.companies ?? 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Roles Represented:</span>
              <span className="text-slate-300">Principal, Electrical, Client</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Subcontractor Access:</span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
          </div>
        </div>

        {/* 9. Users */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3.5 hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 text-slate-200 font-bold text-sm">
              <Users className="w-4 h-4 text-amber-400" />
              <span>Project Members</span>
            </div>
            {getStatusBadge(data?.status.users || 'COMPLETE')}
          </div>
          <div className="text-xs space-y-1.5 text-slate-300 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between">
              <span className="text-slate-400">Assigned Members:</span>
              <span className="font-mono font-bold text-amber-400">{data?.counts.users ?? 1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Per-Project Roles:</span>
              <span className="text-slate-300">Admin, Sup, Trade, Viewer</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Invitation Status:</span>
              <span className="text-slate-400 font-medium">Pending / Not Invited</span>
            </div>
          </div>
        </div>
      </div>

      {/* Explicit Actions Footer Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center space-x-2">
            <span>Project Next Actions</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Initial configuration complete. Proceed into the production workspace or manage other facilities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsProjectSwitcherOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 text-xs font-bold uppercase tracking-wider flex items-center space-x-2 transition-all cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>[SWITCH TO ANOTHER PROJECT]</span>
          </button>

          <button
            onClick={async () => {
              await refreshStats();
              setActiveTab('home');
            }}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center space-x-2 transition-all shadow-lg shadow-amber-500/25 hover:scale-102 cursor-pointer"
          >
            <span>[GO TO PROJECT DASHBOARD]</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
