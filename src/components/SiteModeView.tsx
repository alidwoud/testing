import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  HardHat,
  QrCode,
  Search,
  ClipboardCheck,
  CheckCircle2,
  Clock,
  MapPin,
  ArrowRight,
  Cpu,
  Cable,
  Check,
  AlertCircle,
  ExternalLink,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { ItrInstance } from '../types/index.ts';

export const SiteModeView: React.FC = () => {
  const {
    currentUser,
    activeProject,
    setSiteMode,
    setIsQrModalOpen,
    setIsSearchModalOpen,
    setIsProjectSwitcherOpen,
    setSelectedItrId,
    setSelectedEquipmentId,
    setSelectedCableId,
    setActiveTab,
    apiFetch,
    addToast,
  } = useApp();

  const [myItrs, setMyItrs] = useState<ItrInstance[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSiteData = async () => {
    setLoading(true);
    try {
      const [itrsRes, locsRes] = await Promise.all([
        apiFetch('/api/itr-instances'),
        apiFetch('/api/locations'),
      ]);
      if (itrsRes.ok) {
        const all = await itrsRes.json();
        // In site mode, prioritize in-progress and draft ITRs
        setMyItrs(all);
      }
      if (locsRes.ok) {
        const locData = await locsRes.json();
        setLocationsList(locData.flat || []);
      }
    } catch (err) {
      console.error('Failed to load site data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSiteData();
  }, [currentUser]);

  const pendingItrs = myItrs.filter(
    (i) => i.status === 'Draft' || i.status === 'In Progress' || i.status === 'Submitted'
  );
  const completedItrs = myItrs.filter((i) => i.status === 'Approved');

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Site Mode Header Banner */}
      <div className="bg-amber-500 text-slate-950 p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-xl shadow-md">
            <HardHat className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-900/80">
              Site Work Interface
            </div>
            <div className="text-xl sm:text-2xl font-black tracking-tight">
              Hello, {currentUser.name.split(' ')[0]}
            </div>
            <div className="text-xs font-semibold text-slate-900/90">
              {currentUser.role} • {currentUser.companyName || 'Not Set'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Compact Project Switcher in Site Mode */}
          <button
            onClick={() => setIsProjectSwitcherOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-950/80 hover:bg-slate-950 text-amber-300 font-bold text-xs rounded-xl transition-all shadow-md border border-slate-900/60"
            title="Switch project"
          >
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-amber-300 font-extrabold">{activeProject?.code}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          <button
            onClick={() => setSiteMode(false)}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow-md"
          >
            Exit Site Mode
          </button>
        </div>
      </div>

      {/* Primary Site Action Buttons (Oversized touch targets for field trades) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {/* Scan QR */}
        <button
          onClick={() => setIsQrModalOpen(true)}
          className="p-5 rounded-2xl bg-slate-900 border-2 border-amber-500/30 hover:border-amber-400 active:scale-97 transition-all flex flex-col items-center justify-center text-center group shadow-lg min-h-[120px]"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <QrCode className="w-7 h-7" />
          </div>
          <div className="text-sm font-black text-white uppercase tracking-wider">Scan QR Tag</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Instant object page</div>
        </button>

        {/* Search */}
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="p-5 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-slate-700 active:scale-97 transition-all flex flex-col items-center justify-center text-center group shadow-lg min-h-[120px]"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <Search className="w-7 h-7" />
          </div>
          <div className="text-sm font-black text-white uppercase tracking-wider">Quick Search</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Find cable or room</div>
        </button>

        {/* Switch Room 01 Direct Jump */}
        <button
          onClick={() => {
            setActiveTab('locations');
            setSiteMode(false);
          }}
          className="p-5 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-slate-700 active:scale-97 transition-all flex flex-col items-center justify-center text-center group shadow-lg col-span-2 sm:col-span-1 min-h-[120px]"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
            <MapPin className="w-7 h-7" />
          </div>
          <div className="text-sm font-black text-white uppercase tracking-wider">Locations</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Level 02 / Rooms</div>
        </button>
      </div>

      {/* Today's Tasks / My Active ITRs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-extrabold text-white">Active Site Inspections (ITRs)</h2>
          </div>
          <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
            {pendingItrs.length} Assigned
          </span>
        </div>

        {pendingItrs.length === 0 ? (
          <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-slate-800/80">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-white">All clear for today!</div>
            <div className="text-xs text-slate-400 mt-0.5">
              No outstanding inspection forms pending your sign-off.
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {pendingItrs.map((itr) => {
              const isSubmitted = itr.status === 'Submitted';
              return (
                <div
                  key={itr.id}
                  className="p-4 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-amber-400 bg-slate-900 px-2 py-0.5 rounded">
                        {itr.targetCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isSubmitted
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-700/50'
                            : 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                        }`}
                      >
                        {itr.status}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{itr.itrNumber}</span>
                    </div>

                    <div className="text-sm font-bold text-white">{itr.templateTitle}</div>

                    <div className="text-xs text-slate-400 flex items-center space-x-2">
                      <span>Assigned to: {itr.assignedTo || 'Tradesperson'}</span>
                      <span>•</span>
                      <span>Switch Room 01 (Level 02)</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedItrId(itr.id);
                        setActiveTab('itrs');
                        setSiteMode(false);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-1 shadow-md transition-colors"
                    >
                      <span>{isSubmitted ? 'View Submission' : 'Complete Form'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Location Shortcuts */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-extrabold text-white">Site Rooms & Switchboards</h2>
          </div>
          <span className="text-xs text-slate-400">Quick Tap</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => {
              // Open UT-01 directly
              setSelectedEquipmentId(1);
              setActiveTab('equipment');
              setSiteMode(false);
            }}
            className="p-3.5 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-amber-400 text-sm">UT-01</span>
                <span className="text-xs text-slate-300 font-semibold">Unit Substation 01</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Switch Room 01 • Level 02 (Schneider 2500kVA)
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => {
              // Open MSB-01 directly
              setSelectedEquipmentId(3);
              setActiveTab('equipment');
              setSiteMode(false);
            }}
            className="p-3.5 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-amber-400 text-sm">MSB-01</span>
                <span className="text-xs text-slate-300 font-semibold">Main Switchboard 01</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Switch Room 01 • Level 02 (PowerZone 4000A)
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => {
              // Open Cable CB-L02-UT01-002 directly
              setSelectedCableId(2);
              setActiveTab('cables');
              setSiteMode(false);
            }}
            className="p-3.5 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-blue-400 text-sm">CB-L02-UT01-002</span>
                <span className="text-xs text-slate-300 font-semibold">4C 240mm²</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                UT-01 → MSB-01 (QA Pending Review)
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            onClick={() => {
              setSelectedEquipmentId(2);
              setActiveTab('equipment');
              setSiteMode(false);
            }}
            className="p-3.5 rounded-2xl bg-slate-850 hover:bg-slate-800 border border-slate-800 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-amber-400 text-sm">UT-02</span>
                <span className="text-xs text-slate-300 font-semibold">Unit Substation 02</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Switch Room 01 • Level 02 (Schneider 2500kVA)
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </div>
  );
};
