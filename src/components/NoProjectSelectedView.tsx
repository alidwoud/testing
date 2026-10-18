import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Building2, Search, Briefcase, MapPin, ArrowRight, Shield, Layers, Plus } from 'lucide-react';

export const NoProjectSelectedView: React.FC = () => {
  const { userProjects, switchProject, currentUser, setIsProjectManageModalOpen } = useApp();
  const [search, setSearch] = useState('');

  const isAdmin = currentUser.role === 'Administrator' || currentUser.role === 'Project Manager';

  const filtered = userProjects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      (p.clientName && p.clientName.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-xl shadow-amber-500/10">
          <Building2 className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            Select a Project
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            Welcome, <span className="text-white font-medium">{currentUser.name}</span> ({currentUser.role}).
            Select an authorized construction project below to load drawing registers, equipment, cables, and QA workflows.
          </p>
        </div>

        {/* Search Input */}
        <div className="max-w-md mx-auto relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects by name, code, client, or location..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9.5 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
          />
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left pt-2">
          {filtered.map((proj) => (
            <div
              key={proj.id}
              onClick={() => switchProject(proj)}
              className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/60 p-5 rounded-2xl transition-all cursor-pointer group hover:shadow-xl hover:shadow-amber-500/10 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400">
                    {proj.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      proj.status === 'Active'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {proj.status}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition-colors">
                  {proj.name}
                </h3>
                {proj.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1">{proj.description}</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-850 flex items-center justify-between text-xs text-slate-400 mt-4">
                <div className="flex items-center space-x-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{proj.location || 'Site'}</span>
                </div>
                <div className="flex items-center space-x-1 text-amber-400 font-bold group-hover:translate-x-1 transition-transform shrink-0">
                  <span>Enter</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {isAdmin && (
          <div className="pt-4">
            <button
              onClick={() => setIsProjectManageModalOpen(true)}
              className="inline-flex items-center space-x-2 text-xs font-bold px-5 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:text-amber-300 transition-all shadow-md shadow-amber-500/10 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ NEW PROJECT (SETUP WIZARD)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
