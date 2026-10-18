import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  ClipboardCheck,
  AlertTriangle,
  CheckSquare,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Camera,
  MapPin,
  Tag,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Check,
  User,
  Building2,
} from 'lucide-react';
import { PhotoUploadModal } from './PhotoUploadModal.tsx';

export const MyWorkView: React.FC = () => {
  const {
    currentUser,
    activeProject,
    setSelectedItrId,
    setActiveTab,
    apiFetch,
    addToast,
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<
    'inspections' | 'issues' | 'tasks' | 'upcoming' | 'completed'
  >('inspections');

  const [loading, setLoading] = useState(true);
  const [workData, setWorkData] = useState<any>({
    inspections: [],
    completedInspections: [],
    issues: [],
    tasks: [],
    upcoming: [],
  });

  const [search, setSearch] = useState('');
  const [photoModalState, setPhotoModalState] = useState<{
    isOpen: boolean;
    entityType?: string;
    entityId?: number;
    entityCode?: string;
  }>({ isOpen: false });

  const loadWorkData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/worker/my-work');
      if (res.ok) {
        const data = await res.json();
        setWorkData(data);
      }
    } catch (err) {
      console.error('Failed to load my-work data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkData();
  }, [currentUser, activeProject]);

  const handleOpenInspection = (itrId: number) => {
    setSelectedItrId(itrId);
    setActiveTab('itrs');
  };

  const handleOpenIssue = () => {
    setActiveTab('issues');
  };

  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    'task-3': true,
  });

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const nextState = !prev[taskId];
      if (nextState) {
        addToast('success', 'Task Completed', 'Marked task as completed for today.');
      }
      return { ...prev, [taskId]: nextState };
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-amber-400">
            FIELD TASKS & QA
          </div>
          <h1 className="text-2xl font-black text-white">MY WORK</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            All inspections, issues, and workstream tasks assigned to {currentUser.name}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('today')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            ← Back to Today
          </button>
        </div>
      </div>

      {/* Category Pills Switcher */}
      <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar scrollbar-none pb-1">
        <button
          onClick={() => setActiveCategory('inspections')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeCategory === 'inspections'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>My Inspections</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeCategory === 'inspections'
                ? 'bg-slate-950 text-amber-400'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {workData.inspections?.length || 3}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('issues')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeCategory === 'issues'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>My Issues</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeCategory === 'issues'
                ? 'bg-slate-950 text-rose-300'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {workData.issues?.length || 1}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('tasks')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeCategory === 'tasks'
              ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>My Tasks</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
              activeCategory === 'tasks'
                ? 'bg-slate-950 text-blue-300'
                : 'bg-slate-800 text-slate-300'
            }`}
          >
            {workData.tasks?.length || 4}
          </span>
        </button>

        <button
          onClick={() => setActiveCategory('upcoming')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeCategory === 'upcoming'
              ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Upcoming Work</span>
        </button>

        <button
          onClick={() => setActiveCategory('completed')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeCategory === 'completed'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
              : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Completed Today</span>
        </button>
      </div>

      {/* CATEGORY 1: MY INSPECTIONS */}
      {activeCategory === 'inspections' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Showing active field inspections ready for signoff</span>
            <span className="font-mono text-amber-400 font-bold">
              {workData.inspections?.length || 0} Open
            </span>
          </div>

          {workData.inspections && workData.inspections.length > 0 ? (
            <div className="space-y-3.5">
              {workData.inspections.map((itr: any) => (
                <div
                  key={itr.id}
                  className="bg-slate-900 border-2 border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 transition-all shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        {itr.itrNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          itr.status === 'Draft'
                            ? 'bg-slate-800 text-slate-300 border border-slate-700'
                            : itr.status === 'In Progress'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {itr.status}
                      </span>
                      {itr.equipmentCode && (
                        <span className="text-[11px] text-slate-400 font-mono flex items-center space-x-1">
                          <Tag className="w-3 h-3 text-slate-500" />
                          <span>{itr.equipmentCode}</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">{itr.title}</h3>

                    <div className="flex items-center space-x-4 text-xs text-slate-400 pt-0.5">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400/80" />
                        <span>{itr.locationName || 'Switch Room 01 (LA2)'}</span>
                      </div>
                      <div className="flex items-center space-x-1 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Due: Today</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() =>
                        setPhotoModalState({
                          isOpen: true,
                          entityType: 'ITR',
                          entityId: itr.id,
                          entityCode: itr.itrNumber,
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                      title="Attach photo proof"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Photo</span>
                    </button>

                    <button
                      onClick={() => handleOpenInspection(itr.id)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md active:scale-97 cursor-pointer"
                    >
                      <span>OPEN INSPECTION</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <div className="font-bold text-white text-base">All caught up!</div>
              <p className="text-xs text-slate-400 mt-1">
                No open inspections currently pending for your trade.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CATEGORY 2: MY ISSUES */}
      {activeCategory === 'issues' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Open defects or corrective actions in your work area</span>
            <span className="font-mono text-rose-400 font-bold">
              {workData.issues?.length || 0} Open
            </span>
          </div>

          {workData.issues && workData.issues.length > 0 ? (
            <div className="space-y-3.5">
              {workData.issues.map((issue: any) => (
                <div
                  key={issue.id}
                  className="bg-slate-900 border-2 border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 sm:p-5 transition-all shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        {issue.issueNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          issue.priority === 'Critical'
                            ? 'bg-rose-500 text-white font-black'
                            : issue.priority === 'High'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {issue.priority} Priority
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {issue.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white leading-snug">{issue.title}</h3>

                    <div className="flex items-center space-x-4 text-xs text-slate-400 pt-0.5">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400/80" />
                        <span>{issue.locationName || 'Switch Room 01 (LA2)'}</span>
                      </div>
                      <div className="flex items-center space-x-1 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>Due: {issue.dueDate || '15/10/2026'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() =>
                        setPhotoModalState({
                          isOpen: true,
                          entityType: 'Issue',
                          entityId: issue.id,
                          entityCode: issue.issueNumber,
                        })
                      }
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer"
                      title="Attach photo proof"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Rectification Photo</span>
                    </button>

                    <button
                      onClick={handleOpenIssue}
                      className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-all shadow-md active:scale-97 cursor-pointer"
                    >
                      <span>VIEW ISSUE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
              <div className="font-bold text-white text-base">No open defects!</div>
              <p className="text-xs text-slate-400 mt-1">
                All quality and punchlist items in your area have been resolved.
              </p>
            </div>
          )}
        </div>
      )}

      {/* CATEGORY 3: MY TASKS */}
      {activeCategory === 'tasks' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 px-1">
            Action items and trade deliverables for today's workstream
          </div>

          <div className="space-y-3">
            {workData.tasks?.map((task: any) => {
              const isDone = !!completedTasks[task.id];
              return (
                <div
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3.5 ${
                    isDone
                      ? 'bg-slate-900/50 border-slate-800/60 opacity-75'
                      : 'bg-slate-900 border-slate-800 hover:border-blue-500/50 shadow-md'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 transition-all shrink-0 ${
                      isDone
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'border-2 border-slate-600 bg-slate-950 hover:border-blue-400'
                    }`}
                  >
                    {isDone && <Check className="w-4 h-4 stroke-[3]" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-bold leading-tight ${
                        isDone ? 'line-through text-slate-400' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400 mt-1">
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{task.location}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Target: {task.dueTime}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
                        {task.category}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY 4: UPCOMING WORK */}
      {activeCategory === 'upcoming' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 px-1">
            Weekly scheduled allocations from the Workforce Planner
          </div>

          <div className="space-y-3">
            {workData.upcoming?.map((item: any, idx: number) => (
              <div
                key={idx}
                className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-amber-400">{item.date}</span>
                    <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {item.shift}
                    </span>
                  </div>
                  <div className="text-base font-bold text-white">{item.workstream}</div>
                  <div className="text-xs text-slate-400 flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400/80" />
                      <span>{item.zone}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Supervisor: {item.supervisor}</span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-bold">
                    Scheduled
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CATEGORY 5: COMPLETED TODAY */}
      {activeCategory === 'completed' && (
        <div className="space-y-4">
          <div className="text-xs text-slate-400 px-1">
            Inspections and quality sign-offs completed today
          </div>

          <div className="space-y-3">
            {workData.completedInspections?.map((itr: any) => (
              <div
                key={itr.id}
                className="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">
                        {itr.itrNumber}
                      </span>
                      <span className="text-xs font-black uppercase text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded">
                        Approved
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">{itr.title}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenInspection(itr.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold border border-slate-700"
                >
                  View Sign-off
                </button>
              </div>
            ))}

            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Pre-Start Daily Safety Briefing</div>
                  <div className="text-xs text-slate-400">Signed with Mark Callahan at 07:05</div>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-slate-400">07:05 AM</span>
            </div>
          </div>
        </div>
      )}

      {/* Attach Photo Modal */}
      <PhotoUploadModal
        isOpen={photoModalState.isOpen}
        onClose={() => setPhotoModalState({ isOpen: false })}
        defaultEntityType={photoModalState.entityType || 'General'}
        defaultEntityId={photoModalState.entityId}
        defaultEntityCode={photoModalState.entityCode || ''}
        defaultCategory="QA / Inspection"
        onPhotoUploaded={() => {
          loadWorkData();
          addToast('success', 'Photo Attached', 'Evidence attached to inspection record.');
        }}
      />
    </div>
  );
};
