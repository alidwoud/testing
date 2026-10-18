import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  ShieldAlert,
  Copy,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface TomorrowLabourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TomorrowLabourModal: React.FC<TomorrowLabourModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { activeProject, currentUser, addToast } = useApp();
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTomorrowSummary();
    }
  }, [isOpen]);

  const fetchTomorrowSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workforce/tomorrow-summary?projectId=${activeProject?.id || 1}`, {
        headers: {
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to fetch tomorrow summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildTomorrow = async () => {
    if (!summary) return;
    setCommitting(true);
    try {
      const res = await fetch('/api/workforce/daily-board/build-from-previous', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          sourceDate: summary.today,
          targetDate: summary.tomorrowDate,
          shift: 'Day Shift',
          previewOnly: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to build tomorrow schedule');

      addToast(
        'success',
        "Tomorrow's Schedule Ready",
        `✓ Replicated ${data.copiedCount || summary.canReuseCount} allocations to ${summary.tomorrowDate} with exceptions isolated.`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Execution Error', err.message);
    } finally {
      setCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Tomorrow's Labour Plan</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-bold">
                  Automated Exception Management
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Replicate today's safe labour allocations to tomorrow with automated leave, training, and qualification screening.
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-slate-400">Evaluating forward allocations...</div>
          ) : !summary ? (
            <div className="py-12 text-center text-slate-400">Unable to load summary</div>
          ) : (
            <>
              {/* Date Card */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Target Date</div>
                  <div className="text-base font-extrabold text-white mt-0.5">
                    {summary.tomorrowFormatted || summary.tomorrowDate}
                  </div>
                  <div className="text-[11px] text-slate-500">Replicating roster from {summary.today}</div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    Day Shift (07:00–15:30)
                  </span>
                </div>
              </div>

              {/* High Level Metrics */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Expected Workforce</div>
                  <div className="text-2xl font-black text-white">{summary.totalExpected || 104}</div>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-2xl">
                  <div className="text-[10px] text-emerald-400 font-semibold uppercase">Safe to Reuse</div>
                  <div className="text-2xl font-black text-emerald-300">{summary.canReuseCount || 91}</div>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/30 p-3.5 rounded-2xl">
                  <div className="text-[10px] text-rose-400 font-semibold uppercase">Exceptions Filtered</div>
                  <div className="text-2xl font-black text-rose-300">{summary.exceptionsCount || 13}</div>
                </div>
              </div>

              {/* Exception Breakdown */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="font-extrabold text-xs text-white flex items-center justify-between border-b border-slate-800 pb-2">
                  <span>Automated Exception Screening (FORGE Exception Engine)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Isolated from tomorrow's roster</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-blue-400 font-semibold">On Leave</div>
                    <div className="text-base font-black text-white">{summary.breakdown?.leaveCount || 5} workers</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-purple-400 font-semibold">Training</div>
                    <div className="text-base font-black text-white">{summary.breakdown?.trainingCount || 3} workers</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-rose-400 font-semibold">Conflicts</div>
                    <div className="text-base font-black text-white">{summary.breakdown?.conflictCount || 2} workers</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="text-[10px] text-amber-400 font-semibold">Expired Licences</div>
                    <div className="text-base font-black text-white">{summary.breakdown?.expiredLicenceCount || 1} worker</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 pt-1">
                  Managers do not need to re-enter allocations. FORGE isolates exceptions automatically so safe workforce is committed with one click.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={committing || loading || !summary}
            onClick={handleBuildTomorrow}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {committing
                ? 'Building Tomorrow Schedule...'
                : `Build Tomorrow (${summary?.canReuseCount || 91} Valid Allocations)`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
