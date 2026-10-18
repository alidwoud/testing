import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  HardHat,
  Users,
  ClipboardCheck,
  AlertTriangle,
  Clock,
  MapPin,
  CheckCircle2,
  Building2,
  User,
  ShieldAlert,
  ArrowRight,
  Play,
  QrCode,
  Camera,
  Layers,
  Check,
  TrendingUp,
  Activity,
  FileText,
  UserCheck,
  UserX,
  HelpCircle,
  ExternalLink,
  Plus,
  BarChart3,
} from 'lucide-react';
import { PhotoUploadModal } from './PhotoUploadModal.tsx';
import { Breadcrumbs } from './Breadcrumbs.tsx';

export const HomeView: React.FC = () => {
  const {
    currentUser,
    activeProject,
    setActiveTab,
    setIsQrModalOpen,
    setSelectedItrId,
    apiFetch,
    addToast,
    stats,
  } = useApp();

  const [loading, setLoading] = useState(true);
  const [workerTodayData, setWorkerTodayData] = useState<any>(null);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [startedWork, setStartedWork] = useState(false);
  const [confirmedAttendance, setConfirmedAttendance] = useState(false);

  const role = currentUser.role;
  const isTradie = role === 'Tradesperson' || role === 'Viewer' || role === 'Client';
  const isSupervisor = role === 'Supervisor' || role === 'Leading Hand';
  const isQaManager = role === 'QA Manager';
  const isAdmin = role === 'Administrator' || role === 'Project Manager';

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/worker/today');
      if (res.ok) {
        const data = await res.json();
        setWorkerTodayData(data);
      }
    } catch (err) {
      console.error('Failed to load home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser, activeProject]);

  const firstName = currentUser.name ? currentUser.name.split(' ')[0] : 'Worker';

  const handleStartWork = () => {
    setStartedWork(true);
    addToast(
      'success',
      'Shift Started',
      `Clocked into ${activeProject?.code || 'MEL02'}. Safe work briefing logged.`
    );
  };

  const handleConfirmAttendance = () => {
    setConfirmedAttendance(true);
    addToast(
      'success',
      'Attendance Confirmed',
      'Confirmed 17 of 18 scheduled workers present on morning muster.'
    );
  };

  // ==========================================
  // RENDER 1: TRADESPERSON HOME SCREEN
  // ==========================================
  if (isTradie) {
    const assignment = workerTodayData?.assignment || {
      zone: 'Unassigned',
      workstream: 'Unassigned',
      shift: '—',
      startTime: '—',
      endTime: '—',
      supervisor: '—',
      crew: '—',
    };

    const workerStats = workerTodayData?.stats || {
      inspectionsCount: 0,
      openIssuesCount: 0,
      photosRequiredCount: 0,
      qualificationWarning: null,
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* Greeting Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-2 border-slate-800 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
              <HardHat className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">
                {workerTodayData?.dateFormatted || 'Today on Site'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {workerTodayData?.greeting || 'Good day'}, {firstName}!
              </h1>
              <div className="text-xs sm:text-sm text-slate-300 font-semibold mt-0.5">
                {currentUser.role} • {currentUser.companyName || 'Not Set'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-amber-300 text-xs font-mono font-bold flex items-center space-x-1.5 border border-slate-700">
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{activeProject?.code || 'MEL02'}</span>
            </div>
            {startedWork && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-xs font-bold flex items-center space-x-1 shadow-md">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Shift Active</span>
              </div>
            )}
          </div>
        </div>

        {/* Today's Allocation Card */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  Where You're Working
                </span>
                <h2 className="text-lg font-black text-white">TODAY'S ALLOCATION</h2>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-slate-700">
              {assignment.startTime} – {assignment.endTime}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Area / Zone</div>
              <div className="text-lg font-black text-amber-400">{assignment.zone}</div>
              <div className="text-xs text-slate-300 font-semibold mt-0.5">Switch Rooms & Data Hall</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Workstream</div>
              <div className="text-base font-black text-white">{assignment.workstream}</div>
              <div className="text-xs text-slate-400 font-semibold mt-0.5">Substation to MSB-01</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Shift & Crew</div>
              <div className="text-base font-black text-white">{assignment.shift}</div>
              <div className="text-xs text-amber-400/90 font-semibold mt-0.5 truncate">{assignment.crew}</div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Supervisor</div>
              <div className="text-base font-black text-white">{assignment.supervisor}</div>
              <div className="text-xs text-slate-400 font-semibold mt-0.5">Dual Trade Supervisor</div>
            </div>
          </div>
        </div>

        {/* Things To Do */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
          <div className="flex items-center space-x-2.5 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-white">THINGS TO DO</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <button
              onClick={() => setActiveTab('my-work')}
              className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4" />
                </span>
                <span className="text-xl font-black text-amber-400">{workerStats.inspectionsCount}</span>
              </div>
              <div className="text-xs font-bold text-white">My Inspections</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Ready for testing</div>
            </button>

            <button
              onClick={() => setActiveTab('my-work')}
              className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-rose-500/50 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <span className="text-xl font-black text-rose-400">{workerStats.openIssuesCount}</span>
              </div>
              <div className="text-xs font-bold text-white">My Issues</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Requires rectification</div>
            </button>

            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-blue-500/50 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </span>
                <span className="text-xl font-black text-blue-400">{workerStats.photosRequiredCount}</span>
              </div>
              <div className="text-xs font-bold text-white">Photos Needed</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Witness & signoff</div>
            </button>

            <button
              onClick={() => setActiveTab('my-work')}
              className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-amber-500/30 hover:border-amber-400 transition-all text-left cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Notice</span>
              </div>
              <div className="text-xs font-bold text-white">Licence Warning</div>
              <div className="text-[10px] text-amber-300/90 mt-0.5 truncate">CPR / LVR Refresher</div>
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Quick Actions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <button
              onClick={handleStartWork}
              disabled={startedWork}
              className={`p-5 rounded-2xl font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center text-center transition-all shadow-md min-h-[105px] cursor-pointer ${
                startedWork
                  ? 'bg-emerald-600/30 border-2 border-emerald-500/50 text-emerald-300'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950 active:scale-97'
              }`}
            >
              {startedWork ? (
                <>
                  <Check className="w-7 h-7 mb-1 text-emerald-400" />
                  <span>WORK STARTED</span>
                </>
              ) : (
                <>
                  <Play className="w-7 h-7 mb-1 fill-current" />
                  <span>START MY WORK</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsQrModalOpen(true)}
              className="p-5 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-amber-400 text-white font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center text-center active:scale-97 transition-all shadow-md min-h-[105px] cursor-pointer"
            >
              <QrCode className="w-6 h-6 mb-1 text-amber-400" />
              <span>SCAN QR</span>
            </button>

            <button
              onClick={() => setActiveTab('my-work')}
              className="p-5 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-slate-700 text-white font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center text-center active:scale-97 transition-all shadow-md min-h-[105px] cursor-pointer"
            >
              <ClipboardCheck className="w-6 h-6 mb-1 text-blue-400" />
              <span>MY INSPECTIONS</span>
            </button>

            <button
              onClick={() => setIsPhotoModalOpen(true)}
              className="p-5 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-slate-700 text-white font-black text-sm uppercase tracking-wider flex flex-col items-center justify-center text-center active:scale-97 transition-all shadow-md min-h-[105px] cursor-pointer"
            >
              <Camera className="w-6 h-6 mb-1 text-emerald-400" />
              <span>TAKE PHOTO</span>
            </button>
          </div>
        </div>

        <PhotoUploadModal
          isOpen={isPhotoModalOpen}
          onClose={() => setIsPhotoModalOpen(false)}
          defaultCategory="QA / Inspection"
          onPhotoUploaded={() => {
            loadData();
            addToast('success', 'Photo Attached', 'Attached to site QA record.');
          }}
        />
      </div>
    );
  }

  // ==========================================
  // RENDER 2: SUPERVISOR HOME SCREEN
  // ==========================================
  if (isSupervisor) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Supervisor Welcome Header */}
        <div className="bg-slate-900 border-2 border-slate-800 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-13 h-13 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
              <Users className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">
                Supervisor Site Operations • {activeProject?.code}
              </div>
              <h1 className="text-2xl font-black text-white">
                Good day, {firstName}
              </h1>
              <div className="text-xs text-slate-300 font-semibold mt-0.5">
                Area Lead: Laverton & Switch Rooms • {currentUser.companyName || 'Not Set'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setActiveTab('workforce')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Open Daily Board →
            </button>
          </div>
        </div>

        {/* MY AREA / CREW OVERVIEW (Answers: Where is my crew? Who is present? Who is missing?) */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <MapPin className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Current Shift Manning
                </span>
                <h2 className="text-lg font-black text-white">MY AREA: LA1 — Lighting & Containment</h2>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono text-xs font-bold">
              Day Shift (07:00 – 15:30)
            </span>
          </div>

          {/* Core Crew Status Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Planned</span>
              <span className="text-2xl font-black text-white mt-1 block">18</span>
              <span className="text-[10px] text-slate-400">Roster target</span>
            </div>

            <div className="bg-slate-950/70 border border-emerald-500/30 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-emerald-400 block">Present</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">17</span>
              <span className="text-[10px] text-emerald-400/80">On muster</span>
            </div>

            <div className="bg-slate-950/70 border border-rose-500/30 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-rose-400 block">Absent</span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">1</span>
              <span className="text-[10px] text-rose-400/80">Unscheduled</span>
            </div>

            <div className="bg-slate-950/70 border border-blue-500/30 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-blue-400 block">Transferred</span>
              <span className="text-2xl font-black text-blue-400 mt-1 block">2</span>
              <span className="text-[10px] text-blue-400/80">To LA2 hall</span>
            </div>

            <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-amber-400 block">Unallocated</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">3</span>
              <span className="text-[10px] text-amber-400/80">In site pool</span>
            </div>

            <div className="bg-slate-950/70 border border-purple-500/30 rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase text-purple-400 block">Licence Notice</span>
              <span className="text-2xl font-black text-purple-400 mt-1 block">1</span>
              <span className="text-[10px] text-purple-400/80">CPR due</span>
            </div>
          </div>
        </div>

        {/* NEEDS YOUR ATTENTION SECTION */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              NEEDS YOUR ATTENTION
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div
              onClick={() => setActiveTab('workforce')}
              className="p-3.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 hover:border-amber-400 text-left cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-400 mb-1">
                <span>Attendance Alert</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <div className="text-sm font-bold text-white">1 worker absent, 3 in pool</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Morning muster not fully completed</div>
            </div>

            <div
              onClick={() => setActiveTab('itrs')}
              className="p-3.5 rounded-2xl bg-slate-950/80 border border-blue-500/30 hover:border-blue-400 text-left cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-xs font-bold text-blue-400 mb-1">
                <span>Inspections Ready</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20">2 ITRs</span>
              </div>
              <div className="text-sm font-bold text-white">Supervisor sign-off needed</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Switchboard MSB-01 torque seal & cables</div>
            </div>

            <div
              onClick={() => setActiveTab('issues')}
              className="p-3.5 rounded-2xl bg-slate-950/80 border border-rose-500/30 hover:border-rose-400 text-left cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-xs font-bold text-rose-400 mb-1">
                <span>Open Defect</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-500/20">Critical</span>
              </div>
              <div className="text-sm font-bold text-white">1 open issue in your area</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Missing containment bracket LA1</div>
            </div>

            <div
              onClick={() => setActiveTab('workforce')}
              className="p-3.5 rounded-2xl bg-slate-950/80 border border-purple-500/30 hover:border-purple-400 text-left cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-1">
                <span>Licence Expiry</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20">14 Days</span>
              </div>
              <div className="text-sm font-bold text-white">1 expiring mandatory licence</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Dave Miller — CPR / LVR Refresher</div>
            </div>
          </div>
        </div>

        {/* TODAY'S ACTIONS FOR SUPERVISOR (6 Large Actions) */}
        <div className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Supervisor Operational Actions
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <button
              onClick={handleConfirmAttendance}
              className={`p-4 rounded-2xl border-2 text-left transition-all shadow-sm cursor-pointer ${
                confirmedAttendance
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 hover:border-emerald-400 text-white'
              }`}
            >
              <UserCheck className="w-5 h-5 mb-2 text-emerald-400" />
              <div className="text-xs font-black uppercase">Confirm Attendance</div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {confirmedAttendance ? 'Muster Logged' : '17 of 18 present'}
              </div>
            </button>

            <button
              onClick={() => setActiveTab('workforce')}
              className="p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-amber-400 text-white text-left transition-all shadow-sm cursor-pointer"
            >
              <Users className="w-5 h-5 mb-2 text-amber-400" />
              <div className="text-xs font-black uppercase">Move Labour</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Rebalance workstreams</div>
            </button>

            <button
              onClick={() => setActiveTab('workforce')}
              className="p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-blue-400 text-white text-left transition-all shadow-sm cursor-pointer"
            >
              <UserX className="w-5 h-5 mb-2 text-blue-400" />
              <div className="text-xs font-black uppercase">View Unallocated</div>
              <div className="text-[10px] text-slate-400 mt-0.5">3 workers available</div>
            </button>

            <button
              onClick={() => setActiveTab('itrs')}
              className="p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-purple-400 text-white text-left transition-all shadow-sm cursor-pointer"
            >
              <ClipboardCheck className="w-5 h-5 mb-2 text-purple-400" />
              <div className="text-xs font-black uppercase">Review Inspections</div>
              <div className="text-[10px] text-slate-400 mt-0.5">2 ITRs ready for check</div>
            </button>

            <button
              onClick={() => setActiveTab('issues')}
              className="p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-rose-400 text-white text-left transition-all shadow-sm cursor-pointer"
            >
              <AlertTriangle className="w-5 h-5 mb-2 text-rose-400" />
              <div className="text-xs font-black uppercase">View Issues</div>
              <div className="text-[10px] text-slate-400 mt-0.5">1 open in your area</div>
            </button>

            <button
              onClick={() => setActiveTab('workforce')}
              className="p-4 rounded-2xl bg-slate-900 border-2 border-slate-800 hover:border-teal-400 text-white text-left transition-all shadow-sm cursor-pointer"
            >
              <HardHat className="w-5 h-5 mb-2 text-teal-400" />
              <div className="text-xs font-black uppercase">View My Crew</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Roster & skills</div>
            </button>
          </div>
        </div>

        {/* MY OWN ALLOCATION (Secondary, does not dominate the screen) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold">
              <User className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                MY OWN ALLOCATION
              </span>
              <span className="font-bold text-white">
                LA2 — Switch Rooms & Data Hall • Cable Hauling & Terminations
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-slate-400 shrink-0">
            <span>Shift: <strong className="text-white">07:00 – 15:30</strong></span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">Active</span>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 3: QA MANAGER HOME SCREEN
  // ==========================================
  if (isQaManager) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* QA Manager Header */}
        <div className="bg-slate-900 border-2 border-slate-800 text-white p-5 sm:p-6 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-13 h-13 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
              <ClipboardCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">
                Quality Assurance & Compliance Oversight
              </div>
              <h1 className="text-2xl font-black text-white">
                QA Dashboard: {firstName}
              </h1>
              <div className="text-xs text-slate-300 font-semibold mt-0.5">
                QA Lead • {activeProject?.name} ({activeProject?.code})
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setActiveTab('itrs')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Open QA Register →
            </button>
          </div>
        </div>

        {/* NEEDS YOUR ATTENTION SECTION (Actionable counters: 14 awaiting review, 3 rejected, 8 testing due, 2 critical issues) */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-800 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-black text-white uppercase tracking-wider">
              NEEDS YOUR ATTENTION
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <button
              onClick={() => setActiveTab('itrs')}
              className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-400 text-left transition-all cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-amber-400 block">Review Queue</span>
              <span className="text-3xl font-black text-white mt-1 block">14</span>
              <span className="text-xs text-slate-400 mt-1 block">Awaiting QA Review</span>
            </button>

            <button
              onClick={() => setActiveTab('itrs')}
              className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-rose-400 text-left transition-all cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-rose-400 block">Non-Conformance</span>
              <span className="text-3xl font-black text-rose-400 mt-1 block">3</span>
              <span className="text-xs text-slate-400 mt-1 block">Failed / Rejected</span>
            </button>

            <button
              onClick={() => setActiveTab('testing')}
              className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-blue-400 text-left transition-all cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-blue-400 block">Testing Schedule</span>
              <span className="text-3xl font-black text-blue-400 mt-1 block">8</span>
              <span className="text-xs text-slate-400 mt-1 block">Megger / Torque Due</span>
            </button>

            <button
              onClick={() => setActiveTab('issues')}
              className="p-4 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-amber-400 text-left transition-all cursor-pointer"
            >
              <span className="text-[10px] font-bold uppercase text-purple-400 block">Punchlist Defects</span>
              <span className="text-3xl font-black text-purple-400 mt-1 block">2</span>
              <span className="text-xs text-slate-400 mt-1 block">Critical Defect Issues</span>
            </button>
          </div>
        </div>

        {/* QA Progress & Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => setActiveTab('itrs')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span>ITR Velocity</span>
              <span className="text-emerald-400 font-mono">94% Pass Rate</span>
            </div>
            <div className="text-lg font-bold text-white">Inspections Signoff</div>
            <p className="text-xs text-slate-400 mt-1">Review cable pull, termination and torque seal witness marks.</p>
          </div>

          <div
            onClick={() => setActiveTab('testing')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span>Electrical Testing</span>
              <span className="text-blue-400 font-mono">8 Circuits Logged</span>
            </div>
            <div className="text-lg font-bold text-white">Megger 1000V Test Sheets</div>
            <p className="text-xs text-slate-400 mt-1">Phase rotation, resistance and multi-core continuity.</p>
          </div>

          <div
            onClick={() => setActiveTab('issues')}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
              <span>Quality Tickets</span>
              <span className="text-rose-400 font-mono">2 Open</span>
            </div>
            <div className="text-lg font-bold text-white">Defects & Corrective Actions</div>
            <p className="text-xs text-slate-400 mt-1">Verify contractor rectifications and sign off punchlist items.</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER 4: PROJECT MANAGER / ADMIN HOME SCREEN
  // ==========================================
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Executive Welcome Banner */}
      <div className="bg-slate-900 border-2 border-slate-800 text-white p-6 sm:p-7 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-amber-400">
            PROJECT OVERVIEW & DELIVERY
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {activeProject?.name || 'Project Dashboard'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {activeProject?.code} • Melbourne Hyperscale Data Centre JV • Stage 2 Electrical
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setActiveTab('project')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
          >
            Project Hub →
          </button>
        </div>
      </div>

      {/* Core Project Delivery KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('workforce')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-400/50 p-4 rounded-2xl transition-all cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Today's Workforce</span>
          <span className="text-2xl font-black text-white mt-1 block">65 On Site</span>
          <span className="text-xs text-emerald-400 font-semibold">95% Attendance</span>
        </div>

        <div
          onClick={() => setActiveTab('itrs')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-400/50 p-4 rounded-2xl transition-all cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Quality Signoff</span>
          <span className="text-2xl font-black text-white mt-1 block">94% Pass</span>
          <span className="text-xs text-amber-400 font-semibold">14 Under Review</span>
        </div>

        <div
          onClick={() => setActiveTab('project')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-400/50 p-4 rounded-2xl transition-all cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Assets & Cables</span>
          <span className="text-2xl font-black text-white mt-1 block">28 Cables</span>
          <span className="text-xs text-blue-400 font-semibold">14 Major Assets</span>
        </div>

        <div
          onClick={() => setActiveTab('reports')}
          className="bg-slate-900 border border-slate-800 hover:border-amber-400/50 p-4 rounded-2xl transition-all cursor-pointer"
        >
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Handover Readiness</span>
          <span className="text-2xl font-black text-white mt-1 block">Stage 2</span>
          <span className="text-xs text-teal-400 font-semibold">8 Readiness Gates</span>
        </div>
      </div>

      {/* Quick Action Destinations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setActiveTab('workforce')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/60 text-left transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                Workforce Daily Board
              </div>
              <div className="text-xs text-slate-400">Labour allocations, shifts, and attendance</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('itrs')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/60 text-left transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                Quality & ITRs
              </div>
              <div className="text-xs text-slate-400">Inspection signoffs and witness records</div>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-400/60 text-left transition-all cursor-pointer group"
        >
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                Reports & Intelligence
              </div>
              <div className="text-xs text-slate-400">Progress, timesheets, and QA reports</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
