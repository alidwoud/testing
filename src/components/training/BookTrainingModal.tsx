import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  Calendar,
  Clock,
  MapPin,
  Building,
  User,
  Users,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface BookTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialPersonId?: number | null;
  initialWorkerName?: string;
  initialQualificationTypeCode?: string;
  initialQualificationName?: string;
}

export const BookTrainingModal: React.FC<BookTrainingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPersonId,
  initialWorkerName,
  initialQualificationTypeCode,
  initialQualificationName,
}) => {
  const { activeProject, currentUser, addToast } = useApp();

  // Form State
  const [courseName, setCourseName] = useState('HLTAID009 Provide Cardiopulmonary Resuscitation');
  const [qualificationTypeCode, setQualificationTypeCode] = useState('CPR');
  const [sessionDate, setSessionDate] = useState('2026-10-25');
  const [startTime, setStartTime] = useState('08:30');
  const [endTime, setEndTime] = useState('12:30');
  const [location, setLocation] = useState('55 Sturt Street, Southbank VIC');
  const [bookingReference, setBookingReference] = useState('');
  const [notes, setNotes] = useState('');

  // Providers
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | ''>('');
  const [selectedProviderName, setSelectedProviderName] = useState('St John Ambulance Melbourne Central');

  // Attendees selection
  const [people, setPeople] = useState<any[]>([]);
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialQualificationTypeCode) {
        setQualificationTypeCode(initialQualificationTypeCode);
        if (initialQualificationTypeCode === 'CPR') {
          setCourseName('HLTAID009 Provide Cardiopulmonary Resuscitation');
        } else if (initialQualificationTypeCode === 'LVR') {
          setCourseName('UETDRRF004 Perform Rescue from a Live LV Panel');
        } else if (initialQualificationTypeCode === 'EWP') {
          setCourseName('TLILIC0005 Licence to operate a boom-type elevating work platform');
        } else if (initialQualificationTypeCode === 'WAH') {
          setCourseName('RIIWHS204E Work safely at heights');
        } else {
          setCourseName(initialQualificationName || `${initialQualificationTypeCode} Certification`);
        }
      }

      if (initialPersonId) {
        setSelectedPersonIds(new Set([initialPersonId]));
      } else {
        setSelectedPersonIds(new Set());
      }

      fetchProvidersAndPeople();
    }
  }, [isOpen, initialPersonId, initialQualificationTypeCode, initialQualificationName]);

  const fetchProvidersAndPeople = async () => {
    try {
      const [provRes, peopRes] = await Promise.all([
        fetch('/api/workforce/training/providers'),
        fetch(`/api/workforce/people?projectId=${activeProject?.id || 1}`),
      ]);
      if (provRes.ok) {
        const pData = await provRes.json();
        setProviders(pData);
        if (pData.length > 0 && !selectedProviderId) {
          setSelectedProviderId(pData[0].id);
          setSelectedProviderName(pData[0].name);
        }
      }
      if (peopRes.ok) {
        const peopData = await peopRes.json();
        setPeople(peopData.people || peopData || []);
      }
    } catch (err) {
      console.error('Failed to load providers / people:', err);
    }
  };

  const handleProviderChange = (pId: string) => {
    const numId = Number(pId);
    setSelectedProviderId(numId);
    const found = providers.find((p) => p.id === numId);
    if (found) {
      setSelectedProviderName(found.name);
    }
  };

  const togglePerson = (id: number) => {
    setSelectedPersonIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPersonIds.size === 0) {
      addToast('error', 'Select Workers', 'Please select at least one worker for this training session');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        courseName,
        qualificationTypeCode,
        providerId: selectedProviderId || undefined,
        providerName: selectedProviderName,
        sessionDate,
        startTime,
        endTime,
        location,
        bookingReference: bookingReference || `BK-STJ-${Math.floor(100000 + Math.random() * 900000)}`,
        notes,
        attendeePersonIds: Array.from(selectedPersonIds),
      };

      const res = await fetch('/api/workforce/training/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to book training session');

      addToast(
        'success',
        'Training Booked',
        `Booked ${data.attendeesCount} worker(s) for ${courseName} on ${sessionDate}`
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      addToast('error', 'Booking Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">Book Training & Renewal Session</h3>
              <p className="text-[11px] text-slate-400">
                Create training booking, schedule attendees, and establish automated renewal audit trail.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-2.5 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-semibold">
              IN-APP TRAINING ASSIGNMENT CREATED (Calendar / email invite: NOT CONNECTED)
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Qualification Type
              </label>
              <select
                value={qualificationTypeCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setQualificationTypeCode(code);
                  if (code === 'CPR') setCourseName('HLTAID009 Provide Cardiopulmonary Resuscitation');
                  else if (code === 'LVR') setCourseName('UETDRRF004 Perform Rescue from a Live LV Panel');
                  else if (code === 'EWP') setCourseName('TLILIC0005 Licence to operate boom-type EWP');
                  else if (code === 'WAH') setCourseName('RIIWHS204E Work safely at heights');
                  else if (code === 'FIRST_AID') setCourseName('HLTAID011 Provide First Aid');
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              >
                <option value="CPR">CPR — Cardiopulmonary Resuscitation (Annual)</option>
                <option value="LVR">LVR — Low Voltage Rescue (Annual)</option>
                <option value="FIRST_AID">First Aid — HLTAID011</option>
                <option value="EWP">EWP — Elevating Work Platform</option>
                <option value="WAH">WAH — Working at Heights</option>
                <option value="A_GRADE">A-Grade Electrician Renewal</option>
                <option value="WHITE_CARD">Construction Induction (White Card)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Course Title
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Training Provider (RTO)
              </label>
              <select
                value={selectedProviderId}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Booking Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. STJ-2026-9941"
                value={bookingReference}
                onChange={(e) => setBookingReference(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Location / Training Facility
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
            />
          </div>

          {/* Select Attendees */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Select Attendees ({selectedPersonIds.size} Selected)
              </label>
              <span className="text-[11px] text-slate-400">
                Allocates workers to training on schedule for this date
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
              {people.map((p) => {
                const isSelected = selectedPersonIds.has(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => togglePerson(p.id)}
                    className={`p-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors ${
                      isSelected ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-amber-500 focus:ring-0"
                      />
                      <div>
                        <span className="font-bold text-slate-900">{p.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">
                          {p.employeeId}
                        </span>
                        <div className="text-[10px] text-slate-500">
                          {p.tradeRole} &bull; {p.companyName}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Internal Coordination Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Bring safety footwear, PPE, and original identification documents."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-normal focus:border-amber-500 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || selectedPersonIds.size === 0}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isSubmitting ? 'Booking Session...' : `Confirm Booking (${selectedPersonIds.size} Workers)`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
