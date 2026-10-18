import React, { useState } from 'react';
import { useApp, DEMO_USERS } from '../context/AppContext.tsx';
import {
  Map,
  Layers,
  Cpu,
  Cable,
  TrendingUp,
  Activity,
  Award,
  User,
  Info,
  HelpCircle,
  LogOut,
  X,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Users,
  Settings,
  Plus,
  Compass,
  ClipboardCheck,
} from 'lucide-react';
import { LicencesModal } from './LicencesModal.tsx';

interface MoreMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MoreMenuModal: React.FC<MoreMenuModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    setCurrentUser,
    activeProject,
    activeTab,
    setActiveTab,
    setIsProjectManageModalOpen,
    setIsProjectSwitcherOpen,
    addToast,
  } = useApp();

  const [isLicencesOpen, setIsLicencesOpen] = useState(false);
  const [isProjectInfoOpen, setIsProjectInfoOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  if (!isOpen) return null;

  const isTradie =
    currentUser.role === 'Tradesperson' ||
    currentUser.role === 'Viewer' ||
    currentUser.role === 'Client';

  const isSupervisorOrAbove =
    currentUser.role === 'Supervisor' ||
    currentUser.role === 'Leading Hand' ||
    currentUser.role === 'QA Manager' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Project Manager';

  const isAdmin = currentUser.role === 'Administrator' || currentUser.role === 'Project Manager';

  const handleNavigate = (tabId: string) => {
    setActiveTab(tabId);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                MAXIM FORGE NAVIGATION
              </div>
              <h2 className="text-lg font-black text-white">MORE OPTIONS</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Mini Card */}
          <div className="px-6 py-4 bg-slate-950/40 border-b border-slate-800/80 flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-black text-amber-400 text-sm shrink-0">
              {currentUser.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{currentUser.name}</div>
              <div className="text-xs text-amber-400/90 font-semibold">{currentUser.role}</div>
              <div className="text-[11px] text-slate-400 truncate">
                {currentUser.companyName || 'Not Set'}
              </div>
            </div>
            <button
              onClick={() => setIsProfileOpen(true)}
              className="text-xs font-bold text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 transition-colors"
            >
              Profile
            </button>
          </div>

          {/* Scrollable Menu Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. PROJECT REGISTERS & DRAWINGS */}
            <div className="space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                Project Registers & Plans
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleNavigate('maps')}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                    activeTab === 'maps'
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Map className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        Drawings & Plans
                      </div>
                      <div className="text-[11px] text-slate-400">IFC schematics, single line & site plans</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </button>

                <button
                  onClick={() => handleNavigate('locations')}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                    activeTab === 'locations'
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        Locations & Rooms
                      </div>
                      <div className="text-[11px] text-slate-400">Switch rooms, data halls, substations</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </button>

                <button
                  onClick={() => handleNavigate('equipment')}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                    activeTab === 'equipment'
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        Equipment
                      </div>
                      <div className="text-[11px] text-slate-400">Transformers, MSBs, switchgear</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </button>

                <button
                  onClick={() => handleNavigate('cables')}
                  className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                    activeTab === 'cables'
                      ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                      <Cable className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        Cables
                      </div>
                      <div className="text-[11px] text-slate-400">Cable schedule, pull, gland & terminate</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </button>
              </div>
            </div>

            {/* 2. SUPERVISOR & QA MODULES (Hidden from regular tradie unless authorised) */}
            {isSupervisorOrAbove && (
              <div className="space-y-2">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                  Quality, Testing & Administration
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => handleNavigate('training')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                      activeTab === 'training'
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                          Training & Licences
                        </div>
                        <div className="text-[11px] text-slate-400">Credential register, RTO bookings & matrix</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                  </button>

                  <button
                    onClick={() => handleNavigate('itrs')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                      activeTab === 'itrs'
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <ClipboardCheck className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                          Quality Assurance & ITRs
                        </div>
                        <div className="text-[11px] text-slate-400">Inspection test records, signoffs & QA</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                  </button>

                  <button
                    onClick={() => handleNavigate('testing')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                      activeTab === 'testing'
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                          Testing & Measurements
                        </div>
                        <div className="text-[11px] text-slate-400">Megger 1000V, torque, continuity</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                  </button>

                  <button
                    onClick={() => handleNavigate('history')}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                      activeTab === 'history'
                        ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                          Audit Trail
                        </div>
                        <div className="text-[11px] text-slate-400">Immutable change log & signoffs</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => handleNavigate('readiness')}
                      className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all group cursor-pointer ${
                        activeTab === 'readiness'
                          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                          : 'hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                            Project Readiness
                          </div>
                          <div className="text-[11px] text-slate-400">Commissioning gates & safety signoffs</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 3. PERSONAL & COMPLIANCE */}
            <div className="space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 px-1">
                Personal & Compliance
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setIsLicencesOpen(true)}
                  className="w-full p-3 rounded-2xl hover:bg-slate-800 flex items-center justify-between transition-all group cursor-pointer text-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                      <Award className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        My Licences & Qualifications
                      </div>
                      <div className="text-[11px] text-slate-400">Electrical licence, White Card, CPR/LVR</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </button>

                <button
                  onClick={() => setIsProjectInfoOpen(true)}
                  className="w-full p-3 rounded-2xl hover:bg-slate-800 flex items-center justify-between transition-all group cursor-pointer text-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Info className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        Project Information
                      </div>
                      <div className="text-[11px] text-slate-400">Site address, principal contractor & hours</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </button>

                <button
                  onClick={() => setIsHelpOpen(true)}
                  className="w-full p-3 rounded-2xl hover:bg-slate-800 flex items-center justify-between transition-all group cursor-pointer text-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                        Help & Support
                      </div>
                      <div className="text-[11px] text-slate-400">Field user guide, QR instructions & FAQs</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400" />
                </button>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <button
              onClick={() => setIsProjectSwitcherOpen(true)}
              className="flex items-center space-x-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>Switch Project</span>
            </button>

            <button
              onClick={() => {
                addToast('info', 'Signed Out', 'Returned to role selection.');
                onClose();
              }}
              className="flex items-center space-x-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Licences Modal */}
      <LicencesModal isOpen={isLicencesOpen} onClose={() => setIsLicencesOpen(false)} />

      {/* Project Information Modal */}
      {isProjectInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">{activeProject?.name}</h3>
              </div>
              <button
                onClick={() => setIsProjectInfoOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Project Code</span>
                <span className="text-amber-400 font-mono font-bold text-sm">
                  {activeProject?.code}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Site Location</span>
                <span className="text-white font-semibold">
                  {activeProject?.location || '40 Laverton Boulevard, Truganina VIC 3029'}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Client / Developer</span>
                <span className="text-white font-semibold">
                  {activeProject?.clientName || 'Equinix / Australis DC JV'}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Site Operating Hours</span>
                <span className="text-white font-semibold">
                  Day Shift: 07:00 – 15:30 • Back Shift: 15:30 – 23:00
                </span>
              </div>

              <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Site Emergency Contact</span>
                <span className="text-rose-400 font-mono font-bold">
                  03 9999 1234 (Site Safety Office)
                </span>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setIsProjectInfoOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">MAXIM FORGE Field Guide</h3>
              </div>
              <button onClick={() => setIsHelpOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white">How do I start my shift?</div>
                <p className="text-slate-400">
                  On the TODAY tab, tap [START MY WORK] to clock into your assigned zone and confirm the daily safety briefing.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white">How do I scan an asset?</div>
                <p className="text-slate-400">
                  Tap SCAN in the navigation or on any screen. Point your camera at any cable tag, equipment QR code, room door, or drawing reference to jump straight to that record.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white">Where do I find my assigned inspections?</div>
                <p className="text-slate-400">
                  Go to MY WORK → My Inspections. Tap [OPEN INSPECTION] to complete witness checklists and test readings.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-1">
                <div className="font-bold text-white">Keyboard Shortcut</div>
                <p className="text-slate-400">
                  Press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-amber-400 font-mono">⌘K</kbd> anywhere to search cables, equipment, rooms, and drawings instantly.
                </p>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl text-xs"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <User className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">My Worker Profile</h3>
              </div>
              <button onClick={() => setIsProfileOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Full Name</span>
                <span className="text-white font-bold text-sm">{currentUser.name}</span>
              </div>
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Role</span>
                <span className="text-amber-400 font-bold">{currentUser.role}</span>
              </div>
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Company / Employer</span>
                <span className="text-white font-bold">{currentUser.companyName || 'Not Set'}</span>
              </div>
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Direct Supervisor</span>
                <span className="text-white font-bold">{currentUser.supervisor || '—'}</span>
              </div>
              <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block font-bold">Work Email</span>
                <span className="text-slate-300 font-mono">{currentUser.email}</span>
              </div>
            </div>

            <div className="text-right pt-2">
              <button
                onClick={() => setIsProfileOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
