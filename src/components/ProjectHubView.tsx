import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Map,
  Layers,
  Cpu,
  Cable,
  Camera,
  AlertTriangle,
  Building2,
  Users2,
  Settings,
  Info,
  ArrowRight,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs.tsx';

export const ProjectHubView: React.FC = () => {
  const {
    activeProject,
    setActiveTab,
    setIsProjectManageModalOpen,
    setIsProjectSwitcherOpen,
    stats,
  } = useApp();

  const sections = [
    {
      id: 'locations',
      title: 'Locations & Rooms',
      desc: 'Spatial hierarchy: buildings, levels, switch rooms, data halls & risers.',
      icon: Layers,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      stat: '5 Levels • 12 Rooms',
      action: () => setActiveTab('locations'),
    },
    {
      id: 'equipment',
      title: 'Equipment Register',
      desc: 'Substations, MSBs, transformers, switchgear, distribution boards.',
      icon: Cpu,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      stat: `${stats?.equipmentCount || 14} Tagged Assets`,
      action: () => setActiveTab('equipment'),
    },
    {
      id: 'cables',
      title: 'Cable Schedule',
      desc: 'HV/LV cable schedules, pull status, gland plates and termination logs.',
      icon: Cable,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      stat: `${stats?.cables?.total || 28} Cables Scheduled`,
      action: () => setActiveTab('cables'),
    },
    {
      id: 'maps',
      title: 'Drawings & Plans',
      desc: 'IFC electrical single lines, spatial pin overlays and engineering schematics.',
      icon: Map,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      stat: `${stats?.drawingsCount || 8} Active Sheets`,
      action: () => setActiveTab('maps'),
    },
    {
      id: 'photos',
      title: 'Photos & Site Evidence',
      desc: 'Installation proof, torque seal witness marks, QA photos and defect closeouts.',
      icon: Camera,
      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
      stat: `${stats?.photosCount || 18} Field Records`,
      action: () => setActiveTab('photos'),
    },
    {
      id: 'issues',
      title: 'Issues & Defect Register',
      desc: 'Open quality defects, corrective actions, and punchlist tickets.',
      icon: AlertTriangle,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      stat: `${stats?.openIssues || 2} Open Issues`,
      action: () => setActiveTab('issues'),
    },
    {
      id: 'setup',
      title: 'Project Setup & Wizard',
      desc: 'Onboarding wizard for stages, milestones, initial registers and drawing staging.',
      icon: Settings,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      stat: 'Stage 2 In Progress',
      action: () => setIsProjectManageModalOpen(true),
    },
    {
      id: 'switcher',
      title: 'Switch Construction Job',
      desc: 'Switch between assigned projects across Melbourne and Victoria.',
      icon: Building2,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      stat: `${activeProject?.code || 'MEL02'} Active`,
      action: () => setIsProjectSwitcherOpen(true),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Breadcrumbs />

      {/* Header Banner */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-amber-400">
            PROJECT REGISTERS & ASSETS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {activeProject?.name || 'Project Assets & Registers'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Central repository for locations, equipment, cables, drawings, photos, and project configuration for {activeProject?.code}.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsProjectManageModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Setup Wizard</span>
          </button>
        </div>
      </div>

      {/* Grid of Clean Grouped Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {sections.map((sec) => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.id}
              onClick={sec.action}
              className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-sm hover:shadow-md cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${sec.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700/60">
                    {sec.stat}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                  {sec.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {sec.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-amber-400 transition-colors">
                <span>Open Register</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
