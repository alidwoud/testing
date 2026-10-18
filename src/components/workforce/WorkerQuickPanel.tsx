import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  HardHat,
  Calendar,
  Clock,
  MapPin,
  Shield,
  ShieldAlert,
  Award,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  MoveRight,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface WorkerQuickPanelProps {
  personId: number | null;
  onClose: () => void;
  onOpenAllocate?: (person: any) => void;
  onOpenMove?: (person: any) => void;
  onOpenProfile?: (personId: number) => void;
}

export const WorkerQuickPanel: React.FC<WorkerQuickPanelProps> = ({
  personId,
  onClose,
  onOpenAllocate,
  onOpenMove,
  onOpenProfile,
}) => {
  const { activeProject, setActiveTab, currentUser } = useApp();
  const [loading, setLoading] = useState(false);
  const [worker, setWorker] = useState<any | null>(null);

  useEffect(() => {
    if (!personId) {
      setWorker(null);
      return;
    }
    const fetchWorker = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/workforce/people/${personId}`, {
          headers: {
            'x-project-id': String(activeProject?.id || 1),
            'x-user-role': currentUser.role,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setWorker(data);
        }
      } catch (err) {
        console.error('Failed to fetch worker quick details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();
  }, [personId, activeProject, currentUser.role]);

  if (!personId) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200 text-slate-900">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-sm">
            {worker?.person?.firstName?.[0] || worker?.person?.displayName?.[0] || '?'}{worker?.person?.lastName?.[0] || ''}
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-white flex items-center space-x-1.5">
              <span>{worker?.person?.displayName || `${worker?.person?.firstName || ''} ${worker?.person?.lastName || ''}`.trim() || 'Unknown Worker'}</span>
              <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                {worker?.person?.employeeId || '—'}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {worker?.person?.tradeRole || 'Not Set'} &bull; {worker?.person?.companyName || 'Not Set'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {loading ? (
          <div className="py-12 text-center text-slate-400">Loading worker overview...</div>
        ) : !worker ? (
          <div className="py-12 text-center text-slate-400">Worker not found</div>
        ) : (
          <>
            {/* 1. Quick Status Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${
                worker.person.employmentStatus === 'Active'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : worker.person.employmentStatus === 'Leave' || worker.person.employmentStatus === 'On Leave'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {worker.person.employmentStatus}
              </span>

              {worker.currentProject && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {worker.currentProject.code} &bull; {worker.currentProject.name}
                </span>
              )}

              {worker.person.classification && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {worker.person.classification}
                </span>
              )}
            </div>

            {/* 2. Today's Allocation Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-600" />
                  <span>Today's Work Allocation</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date().toISOString().split('T')[0]}
                </span>
              </div>

              {worker.todayAllocation ? (
                <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{worker.todayAllocation.zoneName} &rarr; {worker.todayAllocation.workstreamName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      {worker.todayAllocation.actualAttendance || 'Scheduled'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{worker.todayAllocation.shift} ({worker.todayAllocation.startTime}–{worker.todayAllocation.endTime})</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                    Supervisor: <strong>{worker.todayAllocation.supervisorName || '—'}</strong>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-white rounded-lg border border-dashed border-slate-200 text-center text-slate-400">
                  No active allocation on today's shift.
                </div>
              )}
            </div>

            {/* 3. Training & Licences Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs flex items-center space-x-1.5">
                  <Award className="w-3.5 h-3.5 text-rose-600" />
                  <span>Trade Licences & Credentials</span>
                </span>
                <button
                  onClick={() => {
                    onClose();
                    setActiveTab('training');
                  }}
                  className="text-[10px] text-amber-700 hover:underline font-bold flex items-center space-x-0.5 cursor-pointer"
                >
                  <span>Open Module</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {(worker.qualifications || []).slice(0, 4).map((q: any) => {
                  const isExpired = q.expiryDate && new Date(q.expiryDate) < new Date();
                  const isExpiring = q.expiryDate && !isExpired && (new Date(q.expiryDate).getTime() - Date.now()) < 30 * 86400000;
                  return (
                    <div
                      key={q.id}
                      className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-[11px]">{q.typeName}</div>
                        <div className="text-[10px] text-slate-500">
                          {q.licenceNumber || 'No reg number'} &bull; Exp: {q.expiryDate || 'No Expiry'}
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                        isExpired
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : isExpiring
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {isExpired ? 'EXPIRED' : isExpiring ? 'EXPIRING' : 'VALID'}
                      </span>
                    </div>
                  );
                })}
                {(!worker.qualifications || worker.qualifications.length === 0) && (
                  <div className="text-center py-2 text-slate-400 text-[11px]">No credentials registered</div>
                )}
              </div>
            </div>

            {/* 4. Training Schedule Alert */}
            {worker.trainingToday && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-purple-900 space-y-1">
                <div className="flex items-center space-x-1.5 font-extrabold text-xs text-purple-900">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  <span>TRAINING TODAY</span>
                </div>
                <div className="font-bold text-[11px]">{worker.trainingToday.courseName}</div>
                <div className="text-[10px] text-purple-700">
                  {worker.trainingToday.startTime}–{worker.trainingToday.endTime} &bull; {worker.trainingToday.location}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Panel Footer Actions */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
        <button
          onClick={() => {
            if (onOpenAllocate) onOpenAllocate(worker?.person);
          }}
          className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 shadow-xs transition-all cursor-pointer"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>Allocate</span>
        </button>

        <button
          onClick={() => {
            if (onOpenMove) onOpenMove(worker?.person);
          }}
          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
        >
          Move
        </button>

        <button
          onClick={() => {
            if (onOpenProfile && personId) onOpenProfile(personId);
          }}
          className="px-3 py-2 border border-slate-300 hover:bg-white text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
        >
          Profile
        </button>
      </div>
    </div>
  );
};
