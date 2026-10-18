import React, { useState, useEffect } from 'react';
import {
  X,
  MoveRight,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface BulkMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedAllocationIds?: number[];
  selectedPersonIds?: number[];
  currentDate?: string;
}

export const BulkMoveModal: React.FC<BulkMoveModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedAllocationIds = [],
  selectedPersonIds = [],
  currentDate = '2026-10-12',
}) => {
  const { activeProject, currentUser, addToast } = useApp();

  const [targetZoneId, setTargetZoneId] = useState<number | ''>('');
  const [targetWorkstreamId, setTargetWorkstreamId] = useState<number | ''>('');
  const [shift, setShift] = useState('Day Shift');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:30');
  const [zones, setZones] = useState<any[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchZones();
    }
  }, [isOpen]);

  const fetchZones = async () => {
    setLoadingZones(true);
    try {
      const res = await fetch(`/api/workforce/zones?projectId=${activeProject?.id || 1}`, {
        headers: {
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setZones(data || []);
        if (data?.length > 0) {
          setTargetZoneId(data[0].id);
          if (data[0].workstreams?.length > 0) {
            setTargetWorkstreamId(data[0].workstreams[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      setLoadingZones(false);
    }
  };

  const activeZone = zones.find((z) => z.id === Number(targetZoneId));

  const handleExecuteMove = async () => {
    if (!targetZoneId || !targetWorkstreamId) {
      addToast('error', 'Validation Error', 'Area and Workstream are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        date: currentDate,
        targetZoneId: Number(targetZoneId),
        targetWorkstreamId: Number(targetWorkstreamId),
        shift,
        startTime,
        endTime,
      };

      if (selectedAllocationIds.length > 0) {
        payload.allocationIds = selectedAllocationIds;
      }
      if (selectedPersonIds.length > 0) {
        payload.personIds = selectedPersonIds;
      }

      const res = await fetch('/api/workforce/allocations/bulk-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to move workers');

      addToast(
        'success',
        'Labour Moved',
        `✓ Successfully moved workers to ${activeZone?.name || 'Unassigned'}`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Move Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalWorkers = selectedAllocationIds.length || selectedPersonIds.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
              <MoveRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>Move Selected Labour</span>
                <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 font-bold">
                  {totalWorkers} Workers
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Reassign selected workers to a new Area or Workstream with conflict protection.
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
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Destination Area / Zone <span className="text-amber-400">*</span>
            </label>
            <select
              value={targetZoneId}
              onChange={(e) => {
                const zId = Number(e.target.value) || '';
                setTargetZoneId(zId);
                const z = zones.find((item) => item.id === zId);
                if (z?.workstreams?.length > 0) {
                  setTargetWorkstreamId(z.workstreams[0].id);
                } else {
                  setTargetWorkstreamId('');
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
            >
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  [{z.code}] {z.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Destination Workstream <span className="text-amber-400">*</span>
            </label>
            <select
              value={targetWorkstreamId}
              onChange={(e) => setTargetWorkstreamId(Number(e.target.value) || '')}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
            >
              {(activeZone?.workstreams || []).map((ws: any) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name} ({ws.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Shift
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
              >
                <option value="Day Shift">Day Shift</option>
                <option value="Back Shift">Back Shift</option>
                <option value="Night Shift">Night Shift</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Start
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Finish
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start space-x-2">
            <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              All existing shift assignments for these {totalWorkers} workers will be moved to the selected area with automatic conflict and audit tracking.
            </span>
          </div>
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
            disabled={isSubmitting || !targetZoneId || !targetWorkstreamId || totalWorkers === 0}
            onClick={handleExecuteMove}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 shadow-md transition-all cursor-pointer"
          >
            <MoveRight className="w-4 h-4" />
            <span>{isSubmitting ? 'Moving Workers...' : `Confirm Move (${totalWorkers} Workers)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
