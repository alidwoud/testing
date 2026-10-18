import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  AlertTriangle,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  MapPin,
  Cpu,
  Cable,
  ArrowRight,
  X,
  Filter,
} from 'lucide-react';
import { IssueItem } from '../types/index.ts';

export const IssuesView: React.FC = () => {
  const { apiFetch, addToast, activeProject, setSelectedEquipmentId, setSelectedCableId, setActiveTab } = useApp();

  const [issuesList, setIssuesList] = useState<IssueItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Issue Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Quality');
  const [formPriority, setFormPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [formAssignedPerson, setFormAssignedPerson] = useState('Dave Miller');
  const [formDueDate, setFormDueDate] = useState('');

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/issues?status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setIssuesList(data);
      }
    } catch (err) {
      console.error('Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, activeProject]);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDesc.trim()) return;

    try {
      const res = await apiFetch('/api/issues', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          title: formTitle.trim(),
          description: formDesc.trim(),
          category: formCategory,
          priority: formPriority,
          assignedPerson: formAssignedPerson,
          dueDate: formDueDate,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        addToast('success', 'Defect Logged', `${created.issueNumber}: ${created.title}`);
        setIsModalOpen(false);
        setFormTitle('');
        setFormDesc('');
        await fetchIssues();
      }
    } catch {
      addToast('error', 'Error', 'Failed to log defect');
    }
  };

  const handleUpdateStatus = async (issueId: number, newStatus: string) => {
    try {
      const res = await apiFetch(`/api/issues/${issueId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        addToast('success', 'Issue Updated', `Status changed to ${newStatus}`);
        await fetchIssues();
      }
    } catch {
      addToast('error', 'Error', 'Failed to update issue');
    }
  };

  const filtered = issuesList.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        item.issueNumber.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        (item.assignedPerson && item.assignedPerson.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <AlertTriangle className="w-6 h-6 text-rose-400" />
            <span>Defects & Quality Issues</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Site defect tracking, non-conformance reports, and punch-list resolution.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Raise Defect</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search defect number (e.g. ISS-001), description, person..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
        >
          <option value="">All Statuses</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading defects...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">Zero matching defects.</div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 shadow-sm"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-bold text-rose-400 text-xs bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900">
                    {item.issueNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      item.priority === 'Critical'
                        ? 'bg-rose-950 text-rose-300 border border-rose-700'
                        : item.priority === 'High'
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.priority} Priority
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {item.category}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm">{item.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{item.description}</p>

                <div className="text-[11px] text-slate-400 pt-1 flex flex-wrap items-center gap-3">
                  <span>Assigned: {item.assignedPerson || 'Dave Miller'}</span>
                  <span>•</span>
                  <span>Raised by: {item.raisedByName}</span>
                  {item.dueDate && (
                    <>
                      <span>•</span>
                      <span>Due: {item.dueDate}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Selector */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                <select
                  value={item.status}
                  onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                  className={`text-xs font-bold rounded-xl px-3 py-1.5 border uppercase tracking-wider cursor-pointer ${
                    item.status === 'Resolved' || item.status === 'Closed'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Raise Defect Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Raise Site Defect</h3>
            <p className="text-xs text-slate-400 mb-4">
              Log an issue or non-conformance for trade rectification.
            </p>

            <form onSubmit={handleCreateIssue} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Missing cable gland earth clamp on UT-01"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe exact physical location and non-conformance details..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  >
                    <option value="Quality">Quality</option>
                    <option value="Safety">Safety</option>
                    <option value="Damage">Damage</option>
                    <option value="Specification Non-Conformance">Specification Non-Conformance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Assigned Person
                  </label>
                  <input
                    type="text"
                    value={formAssignedPerson}
                    onChange={(e) => setFormAssignedPerson(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  Log Defect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
