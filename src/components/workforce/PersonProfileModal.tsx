import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  Award,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Trash2,
  Activity,
  History,
  FileText,
  BadgeAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface PersonProfileModalProps {
  personId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onWorkerUpdated?: () => void;
  onUpdate?: () => void;
}

export const PersonProfileModal: React.FC<PersonProfileModalProps> = ({
  personId,
  isOpen,
  onClose,
  onWorkerUpdated,
  onUpdate,
}) => {
  const handleUpdate = () => {
    if (onWorkerUpdated) onWorkerUpdated();
    if (onUpdate) onUpdate();
  };
  const { activeProject, currentUser, addToast } = useApp();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'allocations' | 'qualifications' | 'renewals' | 'audit'>('overview');

  // Assign project state
  const [newProjectId, setNewProjectId] = useState<number | ''>('');
  const [allProjects, setAllProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !personId) return;

    const fetchPerson = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/workforce/people/${personId}`, {
          headers: {
            'x-user-role': currentUser.role,
            'x-project-id': String(activeProject?.id || 1),
          },
        });
        if (!res.ok) throw new Error('Failed to load person profile');
        const data = await res.json();
        setProfile(data);
      } catch (err: any) {
        addToast('error', 'Profile Error', err.message || 'Could not fetch profile');
      } finally {
        setLoading(false);
      }
    };

    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        if (res.ok) {
          const list = await res.json();
          setAllProjects(list);
        }
      } catch (e) {
        // ignore
      }
    };

    fetchPerson();
    fetchProjects();
  }, [isOpen, personId, currentUser.role, activeProject, addToast]);

  const handleAssignProject = async () => {
    if (!newProjectId || !personId) return;
    try {
      const res = await fetch(`/api/workforce/people/${personId}/project-memberships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id || 1),
        },
        body: JSON.stringify({ projectId: newProjectId, status: 'Active' }),
      });
      if (!res.ok) throw new Error('Failed to assign project');
      addToast('success', 'Project Assigned', 'Worker added to project successfully');
      setNewProjectId('');
      onWorkerUpdated?.();
      // Reload profile
      const ref = await fetch(`/api/workforce/people/${personId}`, {
        headers: { 'x-user-role': currentUser.role, 'x-project-id': String(activeProject?.id || 1) },
      });
      if (ref.ok) setProfile(await ref.json());
    } catch (err: any) {
      addToast('error', 'Assignment Failed', err.message);
    }
  };

  const handleRemoveProject = async (projId: number) => {
    if (!personId) return;
    try {
      const res = await fetch(`/api/workforce/people/${personId}/project-memberships/${projId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id || 1),
        },
      });
      if (!res.ok) throw new Error('Failed to remove project membership');
      addToast('success', 'Membership Removed', 'Worker removed from project');
      onWorkerUpdated?.();
      const ref = await fetch(`/api/workforce/people/${personId}`, {
        headers: { 'x-user-role': currentUser.role, 'x-project-id': String(activeProject?.id || 1) },
      });
      if (ref.ok) setProfile(await ref.json());
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-xl font-bold">
              {profile?.person?.displayName?.[0] || profile?.person?.firstName?.[0] || '?'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-100">{profile?.person?.displayName || `${profile?.person?.firstName || ''} ${profile?.person?.lastName || ''}`.trim() || 'Unknown Worker'}</h2>
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {profile?.person?.employeeId || '—'}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${
                  profile?.person?.employmentStatus === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {profile?.person?.employmentStatus || 'Active'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {(profile?.person?.tradeRole || 'Not Set')} &bull; {(profile?.person?.classification || '—')} &bull; {(profile?.person?.companyName || 'Not Set')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 gap-2 text-sm font-medium">
          {[
            { id: 'overview', label: 'Overview & Projects', icon: User },
            { id: 'allocations', label: 'Allocations History', icon: Calendar },
            { id: 'qualifications', label: 'Qualifications & Licences', icon: Award },
            { id: 'renewals', label: 'Renewals & Training', icon: Clock },
            { id: 'audit', label: 'Audit Trail', icon: History },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading worker profile...</div>
          ) : !profile ? (
            <div className="py-16 text-center text-slate-400">Worker record not found.</div>
          ) : activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Profile Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Employment Details</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Company:</span>
                      <span className="text-slate-200 font-medium">{profile.person.companyName || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Employment Type:</span>
                      <span className="text-slate-200 font-medium">{profile.person.employmentType || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Trade / Role:</span>
                      <span className="text-slate-200 font-medium">{profile.person.tradeRole || 'Not Set'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Classification:</span>
                      <span className="text-slate-200 font-medium">{profile.person.classification || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Start Date:</span>
                      <span className="text-slate-200 font-medium">{profile.person.startDate || '—'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-lg border border-slate-800/80 space-y-3">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Contact & Account</h3>
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Work Email:</span>
                      <span className="text-slate-200 font-medium">{profile.person.workEmail || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Phone:</span>
                      <span className="text-slate-200 font-medium">{profile.person.phone || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/60">
                      <span className="text-slate-400">Default Supervisor:</span>
                      <span className="text-slate-200 font-medium">{profile.person.defaultSupervisorName || '—'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Account Link:</span>
                      <span className="text-slate-400 text-xs italic">
                        {profile.person.userId ? `Linked to ${profile.person.userId}` : 'Unlinked (Demo Mode)'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Project Memberships */}
              <div className="bg-slate-950/60 p-5 rounded-lg border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Current Project Memberships</h3>
                    <p className="text-xs text-slate-400">Active project allocations this worker is authorised for.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={newProjectId}
                      onChange={(e) => setNewProjectId(Number(e.target.value) || '')}
                      className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:border-amber-500 outline-none"
                    >
                      <option value="">-- Assign to Project --</option>
                      {allProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} - {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handleAssignProject}
                      disabled={!newProjectId}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 text-xs font-semibold rounded flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Assign
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-800">
                  {profile.memberships?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3">No active project memberships.</p>
                  ) : (
                    profile.memberships.map((m: any) => (
                      <div key={m.id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-200">{m.projectCode}</span>
                            <span className="text-xs text-slate-400">&bull; {m.projectName}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {m.status}
                            </span>
                          </div>
                          {m.notes && <p className="text-xs text-slate-500 mt-0.5">{m.notes}</p>}
                        </div>
                        <button
                          onClick={() => handleRemoveProject(m.projectId)}
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded transition-colors"
                          title="Remove from project"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'allocations' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Labour Allocation Records</h3>
                <span className="text-xs text-slate-400">{profile.allocations?.length || 0} total allocations</span>
              </div>
              <div className="divide-y divide-slate-800 bg-slate-950/60 rounded-lg border border-slate-800 overflow-hidden">
                {profile.allocations?.length === 0 ? (
                  <p className="text-xs text-slate-500 p-6 text-center">No allocations recorded for this worker.</p>
                ) : (
                  profile.allocations.map((a: any) => (
                    <div key={a.id} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-200">{a.date}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {a.shift} ({a.startTime}–{a.endTime})
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {a.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {a.zoneName ? `${a.zoneCode} (${a.zoneName})` : `Zone #${a.zoneId}`} &bull;{' '}
                          {a.workstreamName ? `${a.workstreamCode} (${a.workstreamName})` : `Workstream #${a.workstreamId}`}
                        </p>
                        {a.notes && <p className="text-xs text-slate-500 italic">{a.notes}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <div>Created: {a.createdBy || 'System'}</div>
                        <div>Ver #{a.version}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === 'qualifications' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-200">Credentials, Licences & Compliance</h3>
                <span className="text-xs text-slate-400">{profile.qualifications?.length || 0} registered credentials</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {profile.qualifications?.length === 0 ? (
                  <p className="text-xs text-slate-500 p-6 text-center bg-slate-950/60 rounded-lg border border-slate-800">
                    No qualification records found.
                  </p>
                ) : (
                  profile.qualifications.map((q: any) => (
                    <div key={q.id} className="p-4 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-amber-500" />
                          <span className="font-semibold text-sm text-slate-200">{q.typeName}</span>
                          <span className="text-xs font-mono text-slate-400">#{q.licenceNumber}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            q.computed?.status === 'EXPIRED'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : q.computed?.status === 'EXPIRING_SOON'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {q.computed?.label || q.verificationStatus}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {q.issuingAuthority} ({q.jurisdiction}) &bull; Issue: {q.issueDate || 'N/A'} &bull;{' '}
                          {q.noExpiry ? 'No Expiry' : `Expires: ${q.expiryDate}`}
                        </p>
                      </div>
                      <div className="text-right text-xs">
                        {q.verifiedBy && (
                          <div className="text-emerald-400 flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3 h-3" /> Verified by {q.verifiedByName || q.verifiedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === 'renewals' ? (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">Scheduled Training & Renewal Bookings</h3>
              <div className="divide-y divide-slate-800 bg-slate-950/60 rounded-lg border border-slate-800 overflow-hidden">
                {profile.renewals?.length === 0 ? (
                  <p className="text-xs text-slate-500 p-6 text-center">No pending renewal bookings for this worker.</p>
                ) : (
                  profile.renewals.map((r: any) => (
                    <div key={r.id} className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-slate-200">{r.qualificationTypeName}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {r.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Provider: {r.trainingProvider || 'TBD'} &bull; Date: {r.bookingDate} {r.bookingTime && `at ${r.bookingTime}`}
                        </p>
                        {r.location && <p className="text-xs text-slate-500">Location: {r.location}</p>}
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        {r.bookingReference && <div>Ref: {r.bookingReference}</div>}
                        <div>Booked by: {r.bookedBy}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200">Worker Audit Trail</h3>
              <div className="divide-y divide-slate-800 bg-slate-950/60 rounded-lg border border-slate-800 overflow-hidden">
                {profile.auditTrail?.length === 0 ? (
                  <p className="text-xs text-slate-500 p-6 text-center">No specific audit entries found.</p>
                ) : (
                  profile.auditTrail.map((log: any) => (
                    <div key={log.id} className="p-3 text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200">{log.action}</span>
                          <span className="text-slate-400">&bull; {log.entityType}</span>
                        </div>
                        <div className="text-slate-500">{log.details}</div>
                      </div>
                      <div className="text-right text-slate-500">
                        <div>{log.performedByName || log.performedBy}</div>
                        <div>{new Date(log.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
