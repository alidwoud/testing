import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  HardHat,
  QrCode,
  ClipboardCheck,
  Camera,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  Calendar,
  Building2,
  User,
  ShieldAlert,
  ArrowRight,
  Play,
  Sparkles,
  ChevronRight,
  Layers,
  Check,
} from 'lucide-react';
import { PhotoUploadModal } from './PhotoUploadModal.tsx';

export const TodayView: React.FC = () => {
  const {
    currentUser,
    activeProject,
    setActiveTab,
    setIsQrModalOpen,
    setSelectedItrId,
    apiFetch,
    addToast,
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState<any>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [startedWork, setStartedWork] = useState(false);

  const loadTodayData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/worker/today');
      if (res.ok) {
        const data = await res.json();
        setTodayData(data);
      }
    } catch (err) {
      console.error('Failed to load worker today data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTodayData();
  }, [currentUser, activeProject]);

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'Worker';

  const assignment = todayData?.assignment || {
    zone: 'Unassigned',
    workstream: 'Unassigned',
    shift: '—',
    startTime: '—',
    endTime: '—',
    supervisor: '—',
    crew: '—',
  };

  const stats = todayData?.stats || {
    inspectionsCount: 0,
    openIssuesCount: 0,
    photosRequiredCount: 0,
    qualificationWarning: null,
  };

  const handleStartWork = () => {
    setStartedWork(true);
    addToast(
      'success',
      'Shift Started',
      `Clocked in for ${assignment.shift} at ${assignment.zone}. Safe work briefing acknowledged.`
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* 1. GREETING BANNER */}
      <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-amber-300">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
            <HardHat className="w-8 h-8" />
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-900/80">
              {todayData?.dateFormatted || 'Today on Site'}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              {todayData?.greeting || 'Good day'}, {firstName}!
            </h1>
            <div className="text-xs sm:text-sm font-bold text-slate-900/90 mt-0.5">
              {currentUser.role} • {currentUser.companyName || 'Not Set'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-950/90 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center space-x-1.5 shadow-md">
            <Building2 className="w-3.5 h-3.5 text-amber-400" />
            <span>{activeProject?.code || 'MEL02'}</span>
          </div>
          {startedWork && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-xs font-bold flex items-center space-x-1 shadow-md animate-pulse">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shift Active</span>
            </div>
          )}
        </div>
      </div>

      {/* 2. TODAY'S WORK CARD */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                DAILY ALLOCATION
              </span>
              <h2 className="text-lg font-black text-white">TODAY YOU'RE WORKING</h2>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-slate-700">
              {assignment.startTime} – {assignment.endTime}
            </span>
          </div>
        </div>

        {/* Location & Workstream Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Area / Zone */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Area / Zone
            </div>
            <div className="text-lg font-black text-amber-400">{assignment.zone}</div>
            <div className="text-xs text-slate-300 font-semibold mt-0.5">Switch Rooms & Data Hall</div>
          </div>

          {/* Workstream */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Workstream
            </div>
            <div className="text-base font-black text-white">{assignment.workstream}</div>
            <div className="text-xs text-slate-400 font-semibold mt-0.5">Substation to MSB-01</div>
          </div>

          {/* Shift & Crew */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Shift & Crew
            </div>
            <div className="text-base font-black text-white">{assignment.shift}</div>
            <div className="text-xs text-amber-400/90 font-semibold mt-0.5 truncate">
              {assignment.crew}
            </div>
          </div>

          {/* Supervisor */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
              Supervisor
            </div>
            <div className="text-base font-black text-white">{assignment.supervisor}</div>
            <div className="text-xs text-slate-400 font-semibold mt-0.5">Dual Trade Supervisor</div>
          </div>
        </div>
      </div>

      {/* 3. THINGS TO DO (STATUS & ATTENTION) */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center space-x-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            <ClipboardCheck className="w-4 h-4" />
          </div>
          <h2 className="text-lg font-black text-white">THINGS TO DO</h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Inspections */}
          <button
            onClick={() => setActiveTab('my-work')}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-4 h-4" />
              </span>
              <span className="text-xl font-black text-amber-400">{stats.inspectionsCount}</span>
            </div>
            <div className="text-xs font-black text-white">Inspections</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Ready for testing</div>
          </button>

          {/* Open Issues */}
          <button
            onClick={() => setActiveTab('my-work')}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-rose-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-4 h-4" />
              </span>
              <span className="text-xl font-black text-rose-400">{stats.openIssuesCount}</span>
            </div>
            <div className="text-xs font-black text-white">Open Issue</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Requires rectification</div>
          </button>

          {/* Photos Required */}
          <button
            onClick={() => setIsPhotoModalOpen(true)}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
              </span>
              <span className="text-xl font-black text-blue-400">{stats.photosRequiredCount}</span>
            </div>
            <div className="text-xs font-black text-white">Photos Needed</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Witness & signoff</div>
          </button>

          {/* Qualification Warning */}
          <button
            onClick={() => setActiveTab('my-work')}
            className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-amber-500/30 hover:border-amber-400 transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Warning</span>
            </div>
            <div className="text-xs font-black text-white">Licence Notice</div>
            <div className="text-[10px] text-amber-300/90 mt-0.5 truncate">CPR / LVR Due Soon</div>
          </button>
        </div>

        {/* Qualification Alert Pill */}
        {stats.qualificationWarning && (
          <div className="mt-4 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-semibold">{stats.qualificationWarning}</span>
            </div>
            <span className="text-[10px] font-mono uppercase bg-amber-500/20 px-2 py-0.5 rounded font-bold">
              Action Required
            </span>
          </div>
        )}
      </div>

      {/* 4. LARGE PRIMARY ACTION BUTTONS */}
      <div className="space-y-2">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 px-1">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Action 1: START MY WORK */}
          <button
            onClick={handleStartWork}
            disabled={startedWork}
            className={`p-5 rounded-2xl font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center text-center transition-all shadow-xl min-h-[110px] cursor-pointer ${
              startedWork
                ? 'bg-emerald-600/30 border-2 border-emerald-500/50 text-emerald-300'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-97 shadow-amber-500/20'
            }`}
          >
            {startedWork ? (
              <>
                <Check className="w-7 h-7 mb-1 text-emerald-400" />
                <span>WORK STARTED</span>
                <span className="text-[10px] normal-case opacity-90 font-semibold mt-0.5">Shift Logged</span>
              </>
            ) : (
              <>
                <Play className="w-7 h-7 mb-1 fill-current" />
                <span>START MY WORK</span>
                <span className="text-[10px] normal-case opacity-80 font-bold mt-0.5">Log Shift & Safety</span>
              </>
            )}
          </button>

          {/* Action 2: SCAN QR */}
          <button
            onClick={() => setIsQrModalOpen(true)}
            className="p-5 rounded-2xl bg-slate-900 border-2 border-amber-500/40 hover:border-amber-400 text-white font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center text-center active:scale-97 transition-all shadow-xl min-h-[110px] group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <QrCode className="w-6 h-6" />
            </div>
            <span>SCAN QR</span>
            <span className="text-[10px] normal-case text-slate-400 font-semibold mt-0.5">Any Cable / Room</span>
          </button>

          {/* Action 3: MY INSPECTIONS */}
          <button
            onClick={() => setActiveTab('my-work')}
            className="p-5 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-slate-700 text-white font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center text-center active:scale-97 transition-all shadow-xl min-h-[110px] group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <span>MY INSPECTIONS</span>
            <span className="text-[10px] normal-case text-slate-400 font-semibold mt-0.5">
              {stats.inspectionsCount} Pending ITRs
            </span>
          </button>

          {/* Action 4: TAKE PHOTO */}
          <button
            onClick={() => setIsPhotoModalOpen(true)}
            className="p-5 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-slate-700 text-white font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center text-center active:scale-97 transition-all shadow-xl min-h-[110px] group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
              <Camera className="w-6 h-6" />
            </div>
            <span>TAKE PHOTO</span>
            <span className="text-[10px] normal-case text-slate-400 font-semibold mt-0.5">Attach to Job</span>
          </button>
        </div>
      </div>

      {/* Photo Upload Modal Trigger */}
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        defaultCategory="QA / Inspection"
        onPhotoUploaded={() => {
          loadTodayData();
          addToast('success', 'Photo Uploaded', 'Attached to site QA record.');
        }}
      />
    </div>
  );
};
