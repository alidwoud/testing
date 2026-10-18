import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Building,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  FileText,
  Upload,
  BookOpen,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { BookTrainingModal } from './BookTrainingModal.tsx';
import { VerifyEvidenceModal } from './VerifyEvidenceModal.tsx';

interface TrainingBookingsProps {
  initialFilter?: string;
}

export const TrainingBookings: React.FC<TrainingBookingsProps> = ({ initialFilter = 'all' }) => {
  const { activeProject, currentUser, addToast } = useApp();

  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Evidence Modal
  const [verifyTarget, setVerifyTarget] = useState<any | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workforce/training/sessions', {
        headers: {
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
        if (data.length > 0 && !selectedSession) {
          setSelectedSession(data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load training sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [activeProject]);

  const handleMarkCompleted = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/workforce/training/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        addToast('success', 'Session Completed', 'Marked session completed and updated attendees to Awaiting Certificate');
        fetchSessions();
      }
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  const handleUpdateAttendeeAttendance = async (sessionId: number, attendeeId: number, status: string) => {
    try {
      const res = await fetch(`/api/workforce/training/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          attendeesUpdates: [{ attendeeId, attendanceStatus: status }],
        }),
      });
      if (res.ok) {
        addToast('success', 'Attendance Recorded', `Updated attendance to ${status}`);
        fetchSessions();
      }
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & NEW BOOKING BUTTON */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span>Training Sessions & Group Bookings</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage scheduled training slots, record physical attendance, and route completion certificates into site compliance.
          </p>
        </div>

        <button
          onClick={() => setIsBookModalOpen(true)}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>New Training Session</span>
        </button>
      </div>

      {/* 2. SESSIONS LIST & DETAIL DUAL PANE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* LEFT: SESSIONS CARDS */}
        <div className="lg:col-span-1 space-y-3">
          {loading && sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
              <span>Loading training sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-xs">
              No training sessions recorded. Click "New Training Session" to schedule.
            </div>
          ) : (
            sessions.map((sess) => {
              const isSelected = selectedSession?.id === sess.id;
              return (
                <div
                  key={sess.id}
                  onClick={() => setSelectedSession(sess)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/5 border-amber-500 shadow-sm ring-2 ring-amber-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {sess.bookingReference || `TRAIN-${sess.id}`}
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        sess.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sess.status === 'Booked'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {sess.status}
                    </span>
                  </div>

                  <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                    {sess.courseName}
                  </h4>

                  <div className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{sess.providerName}</span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center space-x-1 font-semibold">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>{sess.sessionDate}</span>
                    </span>
                    <span className="flex items-center space-x-1 font-bold text-slate-900">
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                      <span>{sess.attendeeCount || sess.attendees?.length || 0} Attendees</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* RIGHT: SESSION DETAILS & ATTENDEES ROSTER */}
        <div className="lg:col-span-2">
          {selectedSession ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-5">
              {/* Session Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 border border-amber-500/20">
                      {selectedSession.qualificationTypeCode}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedSession.courseName}
                    </h3>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Provided by <span className="font-semibold text-slate-800">{selectedSession.providerName}</span> &bull; Ref: <span className="font-mono">{selectedSession.bookingReference}</span>
                  </div>
                </div>

                {selectedSession.status === 'Booked' && (
                  <button
                    onClick={() => handleMarkCompleted(selectedSession.id)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Mark Session Completed</span>
                  </button>
                )}
              </div>

              {/* Session Timing & Logistics Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl text-xs text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Date & Shift</span>
                  <span className="font-bold text-slate-900">{selectedSession.sessionDate}</span>
                  <span className="text-[11px] text-slate-500 block font-mono">
                    {selectedSession.startTime} – {selectedSession.endTime}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Location</span>
                  <span className="font-medium text-slate-900 truncate block">
                    {selectedSession.location || 'Training Centre'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Coordination Status</span>
                  <span className="font-bold text-purple-700">
                    {selectedSession.status} ({selectedSession.attendees?.length || 0} enrolled)
                  </span>
                </div>
              </div>

              {/* Attendees Roster */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-slate-600" />
                    <span>Enrolled Worker Attendees ({selectedSession.attendees?.length || 0})</span>
                  </h4>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Worker</th>
                        <th className="py-2.5 px-3">Trade / Company</th>
                        <th className="py-2.5 px-3 text-center">Attendance</th>
                        <th className="py-2.5 px-3 text-center">Certificate Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedSession.attendees || []).map((att: any) => {
                        const person = att.person || {};
                        return (
                          <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{person.displayName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown Worker'}</div>
                              <div className="text-[10px] font-mono text-slate-400">{person.employeeId || '—'}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-medium text-slate-800">{person.tradeRole || 'Not Set'}</div>
                              <div className="text-[10px] text-slate-500">{person.companyName || 'Not Set'}</div>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  att.attendanceStatus === 'Completed' || att.attendanceStatus === 'Attended'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : att.attendanceStatus === 'Did Not Attend'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-purple-100 text-purple-800'
                                }`}
                              >
                                {att.attendanceStatus}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                  att.certificateStatus === 'Verified'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : att.certificateStatus === 'Evidence Submitted'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {att.certificateStatus || 'Awaiting Certificate'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {att.attendanceStatus !== 'Did Not Attend' && (
                                  <button
                                    onClick={() =>
                                      handleUpdateAttendeeAttendance(selectedSession.id, att.id, 'Did Not Attend')
                                    }
                                    className="px-2 py-0.5 rounded text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                                    title="Mark Did Not Attend"
                                  >
                                    DNA
                                  </button>
                                )}

                                <button
                                  onClick={() =>
                                    setVerifyTarget({
                                      personId: person.id,
                                      workerName: person.displayName,
                                      qualificationTypeCode: selectedSession.qualificationTypeCode,
                                      qualificationName: selectedSession.courseName,
                                      licenceNumber: `REF-${Math.floor(100000 + Math.random() * 900000)}`,
                                    })
                                  }
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg shadow-xs cursor-pointer flex items-center space-x-1"
                                >
                                  <Upload className="w-3 h-3" />
                                  <span>Submit & Verify</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
              Select a training session on the left to inspect enrolled attendees and record attendance.
            </div>
          )}
        </div>
      </div>

      {/* Book Training Modal */}
      <BookTrainingModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={() => fetchSessions()}
      />

      {/* Verify Evidence Modal */}
      {verifyTarget && (
        <VerifyEvidenceModal
          isOpen={true}
          onClose={() => setVerifyTarget(null)}
          onSuccess={() => fetchSessions()}
          personId={verifyTarget.personId}
          workerName={verifyTarget.workerName}
          qualificationTypeCode={verifyTarget.qualificationTypeCode}
          qualificationName={verifyTarget.qualificationName}
          existingLicenceNumber={verifyTarget.licenceNumber}
        />
      )}
    </div>
  );
};
