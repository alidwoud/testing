import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Building,
  CheckCircle2,
  AlertTriangle,
  Layers,
  MapPin,
  RefreshCw,
  Archive,
  RotateCcw,
  Shield,
  Palette,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface WorkforceStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStructureChange: () => void;
  initialAddZone?: boolean;
  initialAddStreamZoneId?: number | null;
}

const PRESET_COLORS = [
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Rose', hex: '#f43f5e' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Indigo', hex: '#6366f1' },
];

export const WorkforceStructureModal: React.FC<WorkforceStructureModalProps> = ({
  isOpen,
  onClose,
  onStructureChange,
  initialAddZone = false,
  initialAddStreamZoneId = null,
}) => {
  const { activeProject, currentUser, addToast } = useApp();

  const userRole = (currentUser?.role || '').trim();
  const isAuthorized =
    userRole.toLowerCase() === 'administrator' ||
    userRole.toLowerCase() === 'project manager' ||
    userRole.toLowerCase() === 'workforce administrator' ||
    userRole.toLowerCase() === 'supervisor' ||
    userRole.toLowerCase() === 'leading hand' ||
    (currentUser as any)?.permissions?.includes('WORKFORCE_STRUCTURE_MANAGE') ||
    userRole === 'Administrator' ||
    userRole === 'Project Manager' ||
    userRole === 'Supervisor';

  const [loading, setLoading] = useState(false);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [workstreams, setWorkstreams] = useState<any[]>([]);
  const [locationsList, setLocationsList] = useState<any[]>([]);
  const [crewsList, setCrewsList] = useState<any[]>([]);

  // Sub-modals for Zone Add/Edit
  const [editingZone, setEditingZone] = useState<any | null>(null);
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    code: '',
    description: '',
    locationId: '' as string | number,
    sequence: 0,
    isActive: true,
  });

  // Sub-modals for Workstream Add/Edit
  const [editingStream, setEditingStream] = useState<any | null>(null);
  const [isStreamModalOpen, setIsStreamModalOpen] = useState(false);
  const [streamForm, setStreamForm] = useState({
    name: '',
    code: '',
    description: '',
    zoneId: '' as string | number,
    locationId: '' as string | number,
    defaultSupervisor: '',
    defaultCrewId: '' as string | number,
    color: '#f59e0b',
    sequence: 0,
    isActive: true,
  });

  // Fetch all structure data
  const loadData = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const headers = {
        'x-user-role': currentUser.role,
        'x-project-id': String(activeProject.id),
      };

      const [zonesRes, streamsRes, locsRes, crewsRes] = await Promise.all([
        fetch(`/api/workforce/zones?projectId=${activeProject.id}&includeArchived=${includeArchived}`, { headers }),
        fetch(`/api/workforce/workstreams?projectId=${activeProject.id}&includeArchived=${includeArchived}`, { headers }),
        fetch(`/api/locations?projectId=${activeProject.id}`, { headers }),
        fetch(`/api/workforce/crews?projectId=${activeProject.id}`, { headers }),
      ]);

      if (zonesRes.ok) setZones(await zonesRes.json());
      if (streamsRes.ok) setWorkstreams(await streamsRes.json());
      if (locsRes.ok) {
        const locData = await locsRes.json();
        setLocationsList(locData.flat || []);
      }
      if (crewsRes.ok) setCrewsList(await crewsRes.json());
    } catch (err) {
      console.error('Failed to load workforce structure:', err);
      addToast('error', 'Error', 'Failed to load workforce structure data');
    } finally {
      setLoading(false);
    }
  }, [activeProject, currentUser.role, includeArchived, addToast]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  // Handle initial triggers
  useEffect(() => {
    if (isOpen && initialAddZone) {
      handleOpenAddZone();
    } else if (isOpen && initialAddStreamZoneId) {
      handleOpenAddStream(initialAddStreamZoneId);
    }
  }, [isOpen, initialAddZone, initialAddStreamZoneId]);

  // ZONE ACTIONS
  const handleOpenAddZone = () => {
    setEditingZone(null);
    setZoneForm({
      name: '',
      code: '',
      description: '',
      locationId: '',
      sequence: zones.length,
      isActive: true,
    });
    setIsZoneModalOpen(true);
  };

  const handleOpenEditZone = (zone: any) => {
    setEditingZone(zone);
    setZoneForm({
      name: zone.name,
      code: zone.code,
      description: zone.description || '',
      locationId: zone.locationId || '',
      sequence: zone.sequence,
      isActive: zone.isActive,
    });
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (!zoneForm.name.trim()) {
      addToast('error', 'Validation Error', 'Area / Zone Name is required');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-user-role': currentUser.role,
        'x-project-id': String(activeProject.id),
      };

      const payload = {
        name: zoneForm.name.trim(),
        code: zoneForm.code.trim() || undefined,
        description: zoneForm.description.trim() || null,
        locationId: zoneForm.locationId ? Number(zoneForm.locationId) : null,
        sequence: Number(zoneForm.sequence) || 0,
        isActive: zoneForm.isActive,
      };

      if (editingZone) {
        const res = await fetch(`/api/workforce/zones/${editingZone.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update workforce zone');
        }
        addToast('success', 'Area Updated', `Area ${payload.name} was updated successfully`);
      } else {
        const res = await fetch('/api/workforce/zones', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create workforce zone');
        }
        addToast('success', 'Area Created', `New Area ${payload.name} is now available on the Daily Board`);
      }

      setIsZoneModalOpen(false);
      loadData();
      onStructureChange();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  const handleArchiveZone = async (zone: any) => {
    if (!activeProject) return;
    if (!confirm(`Archive Workforce Area "${zone.code} — ${zone.name}"?\n\nHistorical Safety: All past labour allocations and hours will be preserved in reports, but this Area will be hidden from new Daily Board allocations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workforce/zones/${zone.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to archive area');
      }

      addToast('success', 'Area Archived', `Area "${zone.name}" archived. Historical labour data preserved.`);
      loadData();
      onStructureChange();
    } catch (err: any) {
      addToast('error', 'Archive Error', err.message);
    }
  };

  const handleReactivateZone = async (zone: any) => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/workforce/zones/${zone.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
        body: JSON.stringify({ isActive: true }),
      });

      if (!res.ok) throw new Error('Failed to reactivate area');

      addToast('success', 'Area Restored', `Area "${zone.name}" reactivated successfully`);
      loadData();
      onStructureChange();
    } catch (err: any) {
      addToast('error', 'Reactivate Error', err.message);
    }
  };

  const handleMoveZone = async (index: number, direction: 'up' | 'down') => {
    if (!activeProject) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= zones.length) return;

    const newZones = [...zones];
    const temp = newZones[index];
    newZones[index] = newZones[targetIndex];
    newZones[targetIndex] = temp;

    setZones(newZones);

    try {
      const res = await fetch('/api/workforce/zones/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
        body: JSON.stringify({ zoneIds: newZones.map((z) => z.id) }),
      });
      if (!res.ok) throw new Error('Failed to reorder areas');
      onStructureChange();
    } catch (err: any) {
      addToast('error', 'Reorder Error', err.message);
      loadData();
    }
  };

  // WORKSTREAM ACTIONS
  const handleOpenAddStream = (zoneId: number) => {
    setEditingStream(null);
    const existingInZone = workstreams.filter((s) => s.zoneId === zoneId);
    setStreamForm({
      name: '',
      code: '',
      description: '',
      zoneId,
      locationId: '',
      defaultSupervisor: '',
      defaultCrewId: '',
      color: PRESET_COLORS[existingInZone.length % PRESET_COLORS.length].hex,
      sequence: existingInZone.length,
      isActive: true,
    });
    setIsStreamModalOpen(true);
  };

  const handleOpenEditStream = (stream: any) => {
    setEditingStream(stream);
    setStreamForm({
      name: stream.name,
      code: stream.code,
      description: stream.description || '',
      zoneId: stream.zoneId || '',
      locationId: stream.locationId || '',
      defaultSupervisor: stream.defaultSupervisor || '',
      defaultCrewId: stream.defaultCrewId || '',
      color: stream.color || '#f59e0b',
      sequence: stream.sequence,
      isActive: stream.isActive,
    });
    setIsStreamModalOpen(true);
  };

  const handleSaveStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    if (!streamForm.name.trim()) {
      addToast('error', 'Validation Error', 'Workstream Name is required');
      return;
    }

    try {
      const headers = {
        'Content-Type': 'application/json',
        'x-user-role': currentUser.role,
        'x-project-id': String(activeProject.id),
      };

      const payload = {
        name: streamForm.name.trim(),
        code: streamForm.code.trim() || undefined,
        description: streamForm.description.trim() || null,
        zoneId: streamForm.zoneId ? Number(streamForm.zoneId) : null,
        locationId: streamForm.locationId ? Number(streamForm.locationId) : null,
        defaultSupervisor: streamForm.defaultSupervisor.trim() || null,
        defaultCrewId: streamForm.defaultCrewId ? Number(streamForm.defaultCrewId) : null,
        color: streamForm.color,
        sequence: Number(streamForm.sequence) || 0,
        isActive: streamForm.isActive,
      };

      if (editingStream) {
        const res = await fetch(`/api/workforce/workstreams/${editingStream.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to update workstream');
        }
        addToast('success', 'Workstream Updated', `Workstream "${payload.name}" updated`);
      } else {
        const res = await fetch('/api/workforce/workstreams', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create workstream');
        }
        addToast('success', 'Workstream Created', `Workstream "${payload.name}" is now ready for allocations`);
      }

      setIsStreamModalOpen(false);
      loadData();
      onStructureChange();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  const handleArchiveStream = async (stream: any) => {
    if (!activeProject) return;
    if (!confirm(`Archive Workstream "${stream.name}"?\n\nHistorical Safety: All past labour allocations to "${stream.name}" will remain intact on previous daily boards and reports. It will no longer be offered for new allocations.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/workforce/workstreams/${stream.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to archive workstream');
      }

      addToast('success', 'Workstream Archived', `Workstream "${stream.name}" archived. Historical allocations preserved.`);
      loadData();
      onStructureChange();
    } catch (err: any) {
      addToast('error', 'Archive Error', err.message);
    }
  };

  const handleReactivateStream = async (stream: any) => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/workforce/workstreams/${stream.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
        body: JSON.stringify({ isActive: true }),
      });

      if (!res.ok) throw new Error('Failed to reactivate workstream');

      addToast('success', 'Workstream Restored', `Workstream "${stream.name}" reactivated`);
      loadData();
      onStructureChange();
    } catch (err: any) {
      addToast('error', 'Reactivate Error', err.message);
    }
  };

  const handleMoveStream = async (zoneId: number, streamIndex: number, direction: 'up' | 'down') => {
    if (!activeProject) return;
    const zoneStreams = workstreams.filter((s) => s.zoneId === zoneId);
    const targetIndex = direction === 'up' ? streamIndex - 1 : streamIndex + 1;
    if (targetIndex < 0 || targetIndex >= zoneStreams.length) return;

    const newStreams = [...zoneStreams];
    const temp = newStreams[streamIndex];
    newStreams[streamIndex] = newStreams[targetIndex];
    newStreams[targetIndex] = temp;

    // Persist reorder to database
    try {
      const res = await fetch('/api/workforce/workstreams/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
        body: JSON.stringify({ workstreamIds: newStreams.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error('Failed to reorder workstreams');
      loadData();
      onStructureChange();
    } catch (err: any) {
      addToast('error', 'Reorder Error', err.message);
    }
  };

  if (!isOpen || !activeProject) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-bold text-white">Manage Workforce Structure</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                  {activeProject.name}
                </span>
                {!isAuthorized && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center space-x-1">
                    <Shield className="w-3 h-3" />
                    <span>View Only</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Configure custom project Areas/Zones, linked locations, workstreams, and board display order.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Show Archived Toggle */}
            <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 hover:text-slate-200">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
                className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950"
              />
              <span>Show Archived</span>
            </label>

            {/* Refresh */}
            <button
              onClick={loadData}
              title="Refresh structure"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Add Area Button */}
            {isAuthorized ? (
              <button
                onClick={handleOpenAddZone}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ ADD AREA / ZONE</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Historical Safety Callout */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex items-start space-x-3 text-xs text-slate-300">
            <Building className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Project-Specific Structure & Historical Allocation Integrity</p>
              <p className="text-slate-400 mt-0.5">
                Each project can define unique Areas (e.g. LA1, LA2, LA4, Site Logistics, Stores, Commissioning, External Works).
                Areas can optionally link to physical MAXIM FORGE Locations or remain site-wide/non-physical.
                When an Area or Workstream is archived, historical allocations and reports are strictly preserved.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-2" />
              <span>Loading workforce structure...</span>
            </div>
          ) : zones.length === 0 ? (
            <div className="py-12 text-center text-slate-400 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
              <Layers className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              {isAuthorized ? (
                <>
                  <p className="font-bold text-white text-base">NO WORKFORCE AREAS YET</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    Create the labour structure for this project by setting up Areas and Workstreams.
                  </p>
                  <button
                    onClick={handleOpenAddZone}
                    className="mt-4 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center space-x-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ ADD FIRST AREA</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="font-bold text-white text-base">VIEW ONLY</p>
                  <p className="text-xs text-slate-400 mt-1">
                    You don't have permission to edit Workforce Structure. Contact your Project Administrator.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {zones.map((zone, zIdx) => {
                const zoneStreams = workstreams.filter((s) => s.zoneId === zone.id);
                const isFirstZone = zIdx === 0;
                const isLastZone = zIdx === zones.length - 1;

                return (
                  <div
                    key={zone.id}
                    className={`border rounded-2xl overflow-hidden transition-all shadow-md ${
                      zone.isActive
                        ? 'bg-slate-950/70 border-slate-800'
                        : 'bg-slate-950/40 border-slate-800/60 opacity-75'
                    }`}
                  >
                    {/* Area Header */}
                    <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        {/* Area Code Badge */}
                        <span className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono font-black text-xs flex items-center justify-center">
                          {zone.code}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-bold text-sm text-white">{zone.name}</h3>
                            {!zone.isActive && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                ARCHIVED
                              </span>
                            )}
                            {zone.linkedLocation ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                                <Building className="w-3 h-3 flex-shrink-0" />
                                <span>Linked: {zone.linkedLocation.code}</span>
                                <span className="text-slate-400 hidden sm:inline">({zone.linkedLocation.path})</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Non-physical / Site-wide
                              </span>
                            )}
                          </div>
                          {zone.description && (
                            <p className="text-xs text-slate-400 mt-0.5">{zone.description}</p>
                          )}
                        </div>
                      </div>

                      {/* Area Controls */}
                      <div className="flex items-center space-x-2">
                        {isAuthorized && (
                          <>
                            {/* Reorder Buttons */}
                            <div className="flex items-center space-x-1 bg-slate-950 rounded-lg p-1 border border-slate-800">
                              <button
                                type="button"
                                disabled={isFirstZone}
                                onClick={() => handleMoveZone(zIdx, 'up')}
                                title="Move Area Up"
                                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isLastZone}
                                onClick={() => handleMoveZone(zIdx, 'down')}
                                title="Move Area Down"
                                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Add Workstream under this Area */}
                            <button
                              type="button"
                              onClick={() => handleOpenAddStream(zone.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center space-x-1 border border-slate-700 active:scale-95 transition-all"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Workstream</span>
                            </button>

                            {/* Edit Area */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditZone(zone)}
                              title="Edit Area"
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Archive / Reactivate */}
                            {zone.isActive ? (
                              <button
                                type="button"
                                onClick={() => handleArchiveZone(zone)}
                                title="Archive Area (protects historical allocations)"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReactivateZone(zone)}
                                title="Restore / Reactivate Area"
                                className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Workstreams List */}
                    <div className="p-4">
                      {zoneStreams.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                          <span>No workstreams configured in this area.</span>
                          {isAuthorized && (
                            <button
                              onClick={() => handleOpenAddStream(zone.id)}
                              className="ml-2 text-amber-400 hover:underline font-bold"
                            >
                              + Add one now
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {zoneStreams.map((stream, sIdx) => {
                            const isFirstStream = sIdx === 0;
                            const isLastStream = sIdx === zoneStreams.length - 1;

                            return (
                              <div
                                key={stream.id}
                                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                                  stream.isActive
                                    ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                                    : 'bg-slate-900/40 border-slate-800/60 opacity-60'
                                }`}
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2 truncate">
                                      <span
                                        className="w-3 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: stream.color || '#f59e0b' }}
                                      />
                                      <span className="font-bold text-xs text-white truncate">
                                        {stream.name}
                                      </span>
                                      {stream.code && (
                                        <span className="text-[10px] font-mono text-slate-400">
                                          ({stream.code})
                                        </span>
                                      )}
                                    </div>

                                    {!stream.isActive && (
                                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">
                                        Archived
                                      </span>
                                    )}
                                  </div>

                                  {/* Metadata badges */}
                                  <div className="flex flex-wrap gap-1 text-[10px] text-slate-400">
                                    {stream.defaultSupervisor && (
                                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300">
                                        Sup: {stream.defaultSupervisor}
                                      </span>
                                    )}
                                    {stream.linkedLocation && (
                                      <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                                        Loc: {stream.linkedLocation.code}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Workstream Action Controls */}
                                {isAuthorized && (
                                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                                    {/* Reorder Up/Down */}
                                    <div className="flex items-center space-x-1">
                                      <button
                                        type="button"
                                        disabled={isFirstStream}
                                        onClick={() => handleMoveStream(zone.id, sIdx, 'up')}
                                        title="Move Workstream Up"
                                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLastStream}
                                        onClick={() => handleMoveStream(zone.id, sIdx, 'down')}
                                        title="Move Workstream Down"
                                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                    </div>

                                    <div className="flex items-center space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditStream(stream)}
                                        title="Edit Workstream"
                                        className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      {stream.isActive ? (
                                        <button
                                          type="button"
                                          onClick={() => handleArchiveStream(stream)}
                                          title="Archive Workstream"
                                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                        >
                                          <Archive className="w-3 h-3" />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleReactivateStream(stream)}
                                          title="Restore Workstream"
                                          className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                                        >
                                          <RotateCcw className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            {zones.filter((z) => z.isActive).length} Active Areas •{' '}
            {workstreams.filter((s) => s.isActive).length} Active Workstreams
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
          >
            Done
          </button>
        </div>
      </div>

      {/* SUB-MODAL 1: ADD / EDIT WORKFORCE AREA */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingZone ? `Edit Area: ${editingZone.code}` : 'Create New Workforce Area'}
              </h3>
              <button
                onClick={() => setIsZoneModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Area / Zone Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. LA4, Site Logistics, Stores, Commissioning, External Works"
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Area Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LA4, LOG, STR"
                    value={zoneForm.code}
                    onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-[10px] text-slate-500">Auto-generated if blank</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Display Order</label>
                  <input
                    type="number"
                    value={zoneForm.sequence}
                    onChange={(e) => setZoneForm({ ...zoneForm, sequence: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Optional Linked MAXIM FORGE Project Location
                </label>
                <select
                  value={zoneForm.locationId}
                  onChange={(e) => setZoneForm({ ...zoneForm, locationId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">None / Site-wide (Operational group, Stores, Logistics)</option>
                  {locationsList.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} — {loc.name} ({loc.path})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500">
                  Links to an existing physical location without duplicating location records.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Operational details, scope, or access guidelines..."
                  value={zoneForm.description}
                  onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="zoneActiveCheck"
                  checked={zoneForm.isActive}
                  onChange={(e) => setZoneForm({ ...zoneForm, isActive: e.target.checked })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950"
                />
                <label htmlFor="zoneActiveCheck" className="text-slate-300 font-medium">
                  Active (available on Daily Labour Board)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  {editingZone ? 'Save Changes' : 'Create Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL 2: ADD / EDIT WORKSTREAM */}
      {isStreamModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-white animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">
                {editingStream ? `Edit Workstream: ${editingStream.name}` : 'Create New Workstream'}
              </h3>
              <button
                onClick={() => setIsStreamModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStream} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Workstream Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Commissioning, Lighting, Temporary Power, HV, Containment"
                  value={streamForm.name}
                  onChange={(e) => setStreamForm({ ...streamForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Parent Area / Zone</label>
                  <select
                    value={streamForm.zoneId}
                    onChange={(e) => setStreamForm({ ...streamForm, zoneId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.code} — {z.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. COMM, LGT, PWR"
                    value={streamForm.code}
                    onChange={(e) => setStreamForm({ ...streamForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center space-x-1">
                  <Palette className="w-3.5 h-3.5 text-amber-400" />
                  <span>Workstream Color Badge</span>
                </label>
                <div className="flex items-center space-x-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setStreamForm({ ...streamForm, color: c.hex })}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        streamForm.color === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                  <input
                    type="color"
                    value={streamForm.color}
                    onChange={(e) => setStreamForm({ ...streamForm, color: e.target.value })}
                    className="w-7 h-7 rounded-full bg-transparent border-0 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Default Supervisor (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Jenkins"
                    value={streamForm.defaultSupervisor}
                    onChange={(e) => setStreamForm({ ...streamForm, defaultSupervisor: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Default Crew (Optional)
                  </label>
                  <select
                    value={streamForm.defaultCrewId}
                    onChange={(e) => setStreamForm({ ...streamForm, defaultCrewId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">None / Unassigned</option>
                    {crewsList.map((crew) => (
                      <option key={crew.id} value={crew.id}>
                        {crew.name} ({crew.tradeRole || 'Crew'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Linked MAXIM FORGE Location (Optional)
                </label>
                <select
                  value={streamForm.locationId}
                  onChange={(e) => setStreamForm({ ...streamForm, locationId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Inherit from Area / None</option>
                  {locationsList.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.code} — {loc.name} ({loc.path})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="streamActiveCheck"
                  checked={streamForm.isActive}
                  onChange={(e) => setStreamForm({ ...streamForm, isActive: e.target.checked })}
                  className="rounded border-slate-700 text-amber-500 focus:ring-0 bg-slate-950"
                />
                <label htmlFor="streamActiveCheck" className="text-slate-300 font-medium">
                  Active (available for Daily Board allocation)
                </label>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsStreamModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md"
                >
                  {editingStream ? 'Save Changes' : 'Create Workstream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
