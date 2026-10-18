import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Building2,
  Check,
  Search,
  X,
  Plus,
  Settings,
  MapPin,
  Briefcase,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { Project } from '../types/index.ts';

export const ProjectSwitcherModal: React.FC = () => {
  const {
    userProjects,
    activeProject,
    switchProject,
    isProjectSwitcherOpen,
    setIsProjectSwitcherOpen,
    setIsProjectManageModalOpen,
    currentUser,
  } = useApp();

  const [search, setSearch] = useState('');

  if (!isProjectSwitcherOpen) return null;

  const isAdmin = currentUser.role === 'Administrator' || currentUser.role === 'Project Manager';

  const filteredProjects = userProjects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.clientName && p.clientName.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Select Project</h2>
              <p className="text-xs text-slate-400">
                Accessible projects for <span className="text-amber-400 font-medium">{currentUser.name}</span> ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsProjectSwitcherOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Actions */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-900/50 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by project name, code (e.g. MEL02), client..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9.5 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>
              Showing {filteredProjects.length} of {userProjects.length} project{userProjects.length === 1 ? '' : 's'}
            </span>
            {isAdmin && (
              <button
                onClick={() => {
                  setIsProjectSwitcherOpen(false);
                  setIsProjectManageModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs transition-all shadow-sm cursor-pointer"
                title="Open guided Project Onboarding & Setup Wizard"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ NEW PROJECT</span>
              </button>
            )}
          </div>
        </div>

        {/* Project List */}
        <div className="overflow-y-auto p-4 space-y-2.5 flex-1 divide-y divide-transparent">
          {filteredProjects.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-sm text-slate-300">No projects found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {search ? 'Try adjusting your search query' : 'No projects are assigned to this user profile'}
              </p>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const isSelected = activeProject?.id === project.id;
              return (
                <div
                  key={project.id}
                  onClick={() => switchProject(project)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-md shadow-amber-500/10'
                      : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/60 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white group-hover:text-amber-300 transition-colors text-sm">
                          {project.name}
                        </span>
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400">
                          {project.code}
                        </span>
                        {project.code === 'PRJ-MEL-01' || project.name?.includes('Melbourne Data Centre') ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            DEMO PROJECT
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              project.status === 'Active'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : project.status === 'Commissioning'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                : 'bg-slate-700 text-slate-300'
                            }`}
                          >
                            {project.status}
                          </span>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-xs text-slate-400 line-clamp-1">{project.description}</p>
                      )}

                      <div className="flex items-center space-x-4 pt-1 text-[11px] text-slate-400">
                        {project.clientName && (
                          <div className="flex items-center space-x-1">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            <span>{project.clientName}</span>
                          </div>
                        )}
                        {project.location && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{project.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-md">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          Switch →
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Strict Project Isolation Active</span>
          </div>
          <button
            onClick={() => setIsProjectSwitcherOpen(false)}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
