import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import {
  X,
  Users,
  Shield,
  CheckCircle2,
  AlertCircle,
  Plus,
  Building2,
  MapPin,
  Palette,
  Search,
} from 'lucide-react';

interface CreateCrewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrewCreated: (crew: any) => void;
}

const PRESET_CREW_COLORS = [
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Orange', hex: '#f97316' },
];

export const CreateCrewModal: React.FC<CreateCrewModalProps> = ({
  isOpen,
  onClose,
  onCrewCreated,
}) => {
  const { activeProject, userProjects, currentUser, addToast } = useApp();

  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState<number>(activeProject?.id || 1);
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorId, setSupervisorId] = useState<number | ''>('');
  const [leadingHandName, setLeadingHandName] = useState('');
  const [leadingHandId, setLeadingHandId] = useState<number | ''>('');
  const [defaultZoneId, setDefaultZoneId] = useState<number | ''>('');
  const [defaultWorkstreamId, setDefaultWorkstreamId] = useState<number | ''>('');
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#f59e0b');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  // Lists for dropdowns
  const [people, setPeople] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [workstreams, setWorkstreams] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    setName('');
    setDescription('');
    setSelectedMemberIds([]);
    setProjectId(activeProject?.id || 1);
    setSupervisorName('');
    setSupervisorId('');

    const loadData = async () => {
      try {
        const pId = activeProject?.id || 1;
        const [peopleRes, zonesRes, streamsRes] = await Promise.all([
          fetch(`/api/workforce/people?projectId=${pId}`),
          fetch(`/api/workforce/zones?projectId=${pId}`),
          fetch(`/api/workforce/workstreams?projectId=${pId}`),
        ]);
        if (peopleRes.ok) {
          const pData = await peopleRes.json();
          setPeople(pData);
        }
        if (zonesRes.ok) setZones(await zonesRes.json());
        if (streamsRes.ok) setWorkstreams(await streamsRes.json());
      } catch (err) {
        console.error('Failed to load crew modal prerequisites:', err);
      }
    };

    loadData();
  }, [isOpen, activeProject]);

  if (!isOpen) return null;

  const handleToggleMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSupervisorSelect = (val: string) => {
    const pId = Number(val);
    if (pId) {
      const p = people.find((item) => item.id === pId);
      setSupervisorId(pId);
      setSupervisorName(p?.displayName || '');
    } else {
      setSupervisorId('');
      setSupervisorName('');
    }
  };

  const handleLeadingHandSelect = (val: string) => {
    const pId = Number(val);
    if (pId) {
      const p = people.find((item) => item.id === pId);
      setLeadingHandId(pId);
      setLeadingHandName(p?.displayName || '');
    } else {
      setLeadingHandId('');
      setLeadingHandName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Crew Name is required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        projectId: Number(projectId) || activeProject?.id || 1,
        supervisorName: supervisorName ? supervisorName.trim() : undefined,
        supervisorId: supervisorId ? Number(supervisorId) : undefined,
        leadingHandName: leadingHandName || undefined,
        leadingHandId: leadingHandId ? Number(leadingHandId) : undefined,
        defaultWorkstreamId: defaultWorkstreamId ? Number(defaultWorkstreamId) : undefined,
        defaultZoneId: defaultZoneId ? Number(defaultZoneId) : undefined,
        color,
        isActive,
        description: description.trim() || undefined,
        memberIds: selectedMemberIds,
      };

      const res = await fetch('/api/workforce/crews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(projectId),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create crew');
      }

      addToast('success', 'Crew Created', `✓ Crew "${data.name}" created successfully`);
      onCrewCreated(data);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create crew');
      addToast('error', "CAN'T CREATE CREW", err.message || 'Supervisor or valid name required');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPeople = people.filter((p) => {
    if (!memberSearch) return true;
    const term = memberSearch.toLowerCase();
    return (
      p.displayName?.toLowerCase().includes(term) ||
      p.tradeRole?.toLowerCase().includes(term) ||
      p.companyName?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-900">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-600 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Create Construction Crew</h2>
              <p className="text-xs text-slate-500">
                Register a dedicated site crew for labour allocation and shift dispatch.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Row 1: Crew Name & Project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Crew Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Crew Z, Cable Hauling Team"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-medium"
              >
                {userProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Supervisor & Leading Hand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Supervisor <span className="text-rose-500">*</span>
              </label>
              <select
                value={supervisorId || ''}
                onChange={(e) => handleSupervisorSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-medium"
              >
                <option value="">-- No Supervisor / Unassigned --</option>
                {people
                  .filter((p) => p.tradeRole === 'Supervisor' || p.tradeRole === 'Leading Hand')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName || 'Unknown Worker'} ({p.tradeRole || 'Not Set'})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Leading Hand <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={leadingHandId || ''}
                onChange={(e) => handleLeadingHandSelect(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-medium"
              >
                <option value="">-- No Leading Hand --</option>
                {people
                  .filter((p) => p.tradeRole === 'Leading Hand' || p.tradeRole === 'Electrician')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName || 'Unknown Worker'} ({p.tradeRole || 'Not Set'})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Row 3: Default Area / Zone & Workstream */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Area / Zone <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={defaultZoneId}
                onChange={(e) => setDefaultZoneId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-medium"
              >
                <option value="">-- Unassigned Area --</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.code} — {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Workstream <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <select
                value={defaultWorkstreamId}
                onChange={(e) => setDefaultWorkstreamId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-medium"
              >
                <option value="">-- Unassigned Workstream --</option>
                {workstreams.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.code} — ` : ''}{s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Status & Color */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Status
              </label>
              <div className="flex items-center space-x-4 bg-slate-50 border border-slate-300 rounded-xl p-2.5">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="crewStatus"
                    checked={isActive}
                    onChange={() => setIsActive(true)}
                    className="text-amber-500 focus:ring-0"
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-500 cursor-pointer">
                  <input
                    type="radio"
                    name="crewStatus"
                    checked={!isActive}
                    onChange={() => setIsActive(false)}
                    className="text-amber-500 focus:ring-0"
                  />
                  <span>Inactive</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Crew Marker Color
              </label>
              <div className="flex items-center space-x-2 pt-1">
                {PRESET_CREW_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    className={`w-7 h-7 rounded-xl transition-all cursor-pointer ${
                      color === c.hex ? 'ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                    }`}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Optional Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Scope <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Primary HV substation & transformer haul crew"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-medium"
            />
          </div>

          {/* Initial Member Selection */}
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Initial Crew Members ({selectedMemberIds.length} Selected)
              </label>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter workers..."
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-2.5 py-1 text-xs text-slate-900 focus:bg-white focus:border-amber-500 outline-none font-medium"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl max-h-44 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
              {filteredPeople.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center">No matching workers found.</p>
              ) : (
                filteredPeople.map((p) => {
                  const isChecked = selectedMemberIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`px-3.5 py-2 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-amber-50/80 font-bold text-amber-900' : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleMember(p.id)}
                          className="rounded text-amber-500 focus:ring-0"
                        />
                        <span>{p.displayName}</span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          &bull; {p.tradeRole}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                        {p.companyName}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Creating Crew...' : 'Create Crew'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
