import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext.tsx';
import {
  HardHat,
  Search,
  QrCode,
  Smartphone,
  LayoutDashboard,
  ShieldCheck,
  ChevronDown,
  Building2,
  CheckCircle2,
  AlertCircle,
  X,
  User,
  Plus,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    activeProject,
    siteMode,
    setSiteMode,
    setIsQrModalOpen,
    setIsSearchModalOpen,
    setIsProjectSwitcherOpen,
    setIsProjectManageModalOpen,
    toasts,
    removeToast,
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const isAdmin = currentUser.role === 'Administrator' || currentUser.role === 'Project Manager';

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Branding & Interactive Project Switcher Trigger */}
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center font-black text-slate-950 text-xl tracking-tighter shadow-md shadow-amber-500/20 shrink-0">
                  MF
                </div>
                <div className="hidden sm:block">
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold tracking-tight text-white text-lg">MAXIM FORGE</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      QA & Delivery
                    </span>
                  </div>
                </div>
              </div>

              {/* Interactive Project Switcher Button */}
              <button
                onClick={() => setIsProjectSwitcherOpen(true)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 transition-all text-left group shadow-sm cursor-pointer"
                title="Click to switch construction project"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors shrink-0">
                  <Building2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors flex items-center space-x-1">
                    <span className="max-w-[120px] sm:max-w-[180px] md:max-w-[220px] truncate">
                      {activeProject?.name || 'Select Project'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0" />
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5 flex-wrap">
                    <span className="text-amber-400/90 font-semibold">{activeProject?.code || 'NO PROJECT'}</span>
                    {activeProject?.code === 'PRJ-MEL-01' || activeProject?.code === 'MEL02' || activeProject?.isDemo || activeProject?.name?.includes('Melbourne Data Centre') ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-sans uppercase tracking-tight bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        DEMO
                      </span>
                    ) : activeProject ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold font-sans uppercase tracking-tight bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        TRIAL
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            </div>

            {/* Quick Actions & Navigation Controls */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Admin Project Onboarding Wizard Trigger */}
              {isAdmin && (
                <button
                  onClick={() => setIsProjectManageModalOpen(true)}
                  className="flex items-center space-x-1 sm:space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                  title="Open Project Onboarding & Setup Wizard"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">+ New Project</span>
                  <span className="sm:hidden">+ New</span>
                </button>
              )}

              {/* Global Search Bar Trigger */}
              <button
                onClick={() => setIsSearchModalOpen(true)}
                className="flex items-center space-x-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-sm transition-colors shadow-inner"
                title="Search cables, equipment, locations, ITRs..."
              >
                <Search className="w-4 h-4 text-slate-400" />
                <span className="hidden md:inline text-xs text-slate-400">Search cables, UT-01, ITRs...</span>
                <kbd className="hidden md:inline-block text-[10px] px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400 font-mono">
                  ⌘K
                </kbd>
              </button>

              {/* QR Scanner Button - Only for non-tradies who do not have SCAN in their primary 5-item tab bar */}
              {currentUser.role !== 'Tradesperson' && currentUser.role !== 'Viewer' && (
                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  title="Scan QR Code on equipment, cable, room or drawing"
                >
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline">Scan QR</span>
                </button>
              )}

              {/* Role & User Switcher */}
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 px-2.5 py-1.5 rounded-lg text-sm text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded bg-slate-700 border border-slate-600 flex items-center justify-center font-bold text-amber-400 text-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-slate-200 leading-tight">{currentUser.name}</div>
                    <div className="text-[10px] text-amber-400 font-semibold">{currentUser.role}</div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50">
                    <div className="px-3 py-2 border-b border-slate-800 mb-1">
                      <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Switch Project Role</div>
                      <div className="text-[11px] text-slate-400">
                        Test tradesperson completion & supervisor approval workflows
                      </div>
                    </div>
                    <div className="space-y-1">
                      {DEMO_USERS.map((user) => {
                        const isSelected = user.id === currentUser.id;
                        return (
                          <button
                            key={user.id}
                            onClick={() => {
                              setCurrentUser(user);
                              setIsUserMenuOpen(false);
                            }}
                            className={`w-full text-left p-2.5 rounded-lg flex items-start space-x-3 transition-colors ${
                              isSelected
                                ? 'bg-amber-500/10 border border-amber-500/30 text-white'
                                : 'hover:bg-slate-800 text-slate-300'
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold mt-0.5 ${
                                user.role === 'Tradesperson'
                                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                                  : user.role === 'Supervisor'
                                  ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                                  : user.role === 'QA Manager'
                                  ? 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                                  : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                              }`}
                            >
                              {user.role === 'Tradesperson' ? 'TR' : user.role === 'Supervisor' ? 'SV' : user.role === 'QA Manager' ? 'QA' : 'AD'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate flex items-center justify-between">
                                <span>{user.name}</span>
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                  {user.role}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">{user.companyName}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Real-Data Safety Warning Banner */}
      <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
          <div className="flex items-center space-x-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold font-mono text-[9px] tracking-wider uppercase border border-amber-500/40 shrink-0">
              SAFETY NOTICE
            </span>
            <span className="font-bold text-amber-200">
              REAL PROJECT DATA NOT YET APPROVED:
            </span>
            <span className="text-amber-300/80 text-[11px] sm:text-xs">
              MAXIM FORGE is currently operating in Demo/Trial mode. Complete production infrastructure and security approval before uploading confidential project information.
            </span>
          </div>
          <div className="flex items-center space-x-2 shrink-0 text-[10px] text-amber-400/90 font-mono">
            <span>Mode: {activeProject?.code === 'MEL02' || activeProject?.code === 'PRJ-MEL-01' || activeProject?.isDemo ? 'DEMO' : 'TRIAL'}</span>
          </div>
        </div>
      </div>

      {/* Floating Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-xl border flex items-start space-x-3 transition-all transform animate-in slide-in-from-right-5 ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-100 shadow-emerald-900/20'
                : toast.type === 'error'
                ? 'bg-slate-900/95 border-rose-500/40 text-rose-100 shadow-rose-900/20'
                : 'bg-slate-900/95 border-amber-500/40 text-amber-100 shadow-amber-900/20'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}

            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white">{toast.title}</div>
              {toast.message && <div className="text-xs text-slate-300 mt-0.5">{toast.message}</div>}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
};
