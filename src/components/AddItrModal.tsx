import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  X,
  ClipboardCheck,
  Check,
  Plus,
  Link as LinkIcon,
  FilePlus,
  ShieldCheck,
  Building,
  Layers,
  Search,
  Sparkles,
  GitBranch,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { ItrTemplate, ItrInstance } from '../types/index.ts';

export interface AddItrContext {
  targetType: 'Equipment' | 'Cable' | 'Location';
  targetId?: number;
  targetCode: string;
  locationName?: string;
  discipline?: string;
  responsibleCompany?: string;
}

interface AddItrModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: AddItrContext;
  onItrCreated: (createdItr: ItrInstance) => void;
}

interface CablesPreviewData {
  equipmentId: number;
  equipmentCode: string;
  equipmentName?: string;
  template?: ItrTemplate | null;
  connectedCablesCount: number;
  existingMatchingItrsCount: number;
  missingItrsCount: number;
  proposedNewItrsCount: number;
  cables: Array<{
    id: number;
    cableId: string;
    cableType?: string;
    hasExistingItr: boolean;
  }>;
}

export const AddItrModal: React.FC<AddItrModalProps> = ({
  isOpen,
  onClose,
  context,
  onItrCreated,
}) => {
  const { apiFetch, activeProject, currentUser, addToast } = useApp();

  const [mode, setMode] = useState<'template' | 'blank' | 'link' | 'cables'>('template');
  const [templates, setTemplates] = useState<ItrTemplate[]>([]);
  const [allItrs, setAllItrs] = useState<ItrInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Connected cables preview state
  const [cablesPreview, setCablesPreview] = useState<CablesPreviewData | null>(null);
  const [loadingCablesPreview, setLoadingCablesPreview] = useState(false);

  // Template mode form state
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [assignedTo, setAssignedTo] = useState(currentUser.name || 'Unassigned');
  const [assignedCompany, setAssignedCompany] = useState(
    context.responsibleCompany || currentUser.companyName || 'Not Set'
  );

  // Blank mode form state
  const [blankTitle, setBlankTitle] = useState('');
  const [blankDiscipline, setBlankDiscipline] = useState(context.discipline || 'Electrical');

  // Link mode form state
  const [linkSearch, setLinkSearch] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setMode('template');
    setBlankTitle(`Installation & Pre-Commission Inspection — ${context.targetCode}`);
    setBlankDiscipline(context.discipline || 'Electrical');
    setAssignedTo(currentUser.name || 'Unassigned');
    setAssignedCompany(context.responsibleCompany || currentUser.companyName || 'Not Set');

    const loadPrerequisites = async () => {
      setLoading(true);
      try {
        const [tplRes, itrRes] = await Promise.all([
          apiFetch('/api/itr-templates'),
          apiFetch('/api/itr-instances'),
        ]);

        if (tplRes.ok) {
          const tplData: ItrTemplate[] = await tplRes.json();
          setTemplates(tplData);

          // Select first applicable template
          const matching = tplData.filter(
            (t) => t.targetType?.toLowerCase() === context.targetType?.toLowerCase()
          );
          if (matching.length > 0) {
            setSelectedTemplateId(matching[0].id);
          } else if (tplData.length > 0) {
            setSelectedTemplateId(tplData[0].id);
          }
        }

        if (itrRes.ok) {
          const itrData = await itrRes.json();
          setAllItrs(itrData);
        }
      } catch (err) {
        console.error('Failed to load ITR modal prerequisites:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPrerequisites();

    // If target is Equipment, also load connected cables preview
    if (context.targetType === 'Equipment' && context.targetId) {
      setLoadingCablesPreview(true);
      apiFetch(`/api/equipment/${context.targetId}/cables-itr-preview`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setCablesPreview(data);
        })
        .catch((err) => console.error('Failed to load cables preview:', err))
        .finally(() => setLoadingCablesPreview(false));
    } else {
      setCablesPreview(null);
    }
  }, [isOpen, context]);

  if (!isOpen) return null;

  // Filter templates: only show applicable templates matching targetType
  const applicableTemplates = templates.filter((tpl) => {
    if (context.targetType) {
      return tpl.targetType?.toLowerCase() === context.targetType?.toLowerCase();
    }
    return true;
  });

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplateId) {
      addToast('error', 'Select Template', 'Please pick an ITR template.');
      return;
    }

    setSubmitting(true);
    try {
      const chosenTpl = templates.find((t) => t.id === selectedTemplateId);
      const res = await apiFetch('/api/itr-instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          templateId: selectedTemplateId,
          templateCode: chosenTpl?.code,
          targetType: context.targetType,
          targetId: context.targetId || 0,
          targetCode: context.targetCode,
          assignedTo,
          assignedCompany,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create ITR');
      }

      const created = await res.json();
      addToast('success', 'ITR Created', `✓ ${created.itrNumber} generated for ${context.targetCode}`);
      onItrCreated(created);
      onClose();
    } catch (err: any) {
      addToast('error', 'Creation Failed', err.message || 'Could not create ITR record');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBlank = async () => {
    if (!blankTitle.trim()) {
      addToast('error', 'Title Required', 'Please enter an inspection title.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/itr-instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          templateId: applicableTemplates[0]?.id || templates[0]?.id || 1,
          templateCode: 'ITR-GEN-01',
          targetType: context.targetType,
          targetId: context.targetId || 0,
          targetCode: context.targetCode,
          assignedTo,
          assignedCompany,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to create blank ITR');
      }

      const created = await res.json();
      addToast('success', 'Blank ITR Created', `✓ ${created.itrNumber} ready for inspection`);
      onItrCreated(created);
      onClose();
    } catch (err: any) {
      addToast('error', 'Creation Failed', err.message || 'Could not generate blank ITR');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLinkExisting = async () => {
    if (!selectedExistingId) {
      addToast('error', 'Select ITR', 'Please pick an existing ITR to link.');
      return;
    }

    const linked = allItrs.find((i) => i.id === selectedExistingId);
    if (linked) {
      addToast('success', 'ITR Linked', `Linked ${linked.itrNumber} to ${context.targetCode}`);
      onItrCreated(linked);
      onClose();
    }
  };

  // Generate ITRs for connected cables (bulk generate)
  const handleGenerateCableItrs = async (missingOnly: boolean) => {
    if (!cablesPreview || cablesPreview.cables.length === 0) return;

    const targetCables = missingOnly
      ? cablesPreview.cables.filter((c) => !c.hasExistingItr)
      : cablesPreview.cables;

    if (targetCables.length === 0) {
      addToast('info', 'No Missing ITRs', 'All connected cables already have generated ITRs.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch('/api/itrs/bulk-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          targetType: 'Cable',
          targetIds: targetCables.map((c) => c.id),
          templateIds: [cablesPreview.template?.id || 1],
          generateMissingOnly: missingOnly,
          assignedTo,
          assignedCompany,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate cable inspections');
      }

      const data = await res.json();
      const count = data.createdItrs?.length || targetCables.length;
      addToast('success', 'Cable ITRs Generated', `✓ Successfully generated ${count} cable inspection records.`);
      onClose();
    } catch (err: any) {
      addToast('error', 'Generation Failed', err.message || 'Failed to bulk generate cable ITRs');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredExistingItrs = allItrs.filter((i) => {
    if (!linkSearch) return true;
    const s = linkSearch.toLowerCase();
    return (
      i.itrNumber.toLowerCase().includes(s) ||
      i.templateTitle.toLowerCase().includes(s) ||
      i.targetCode.toLowerCase().includes(s)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-tight">
                Add Inspection Test Record (ITR)
              </h2>
              <p className="text-xs text-slate-400">
                Contextual QA creation for <strong className="text-amber-400">{context.targetCode}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pre-Populated Context Pill Banner */}
        <div className="px-6 py-3 bg-slate-850/60 border-b border-slate-800/80 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 font-medium">Target:</span>
            <span className="font-mono font-bold text-white">{context.targetCode}</span>
          </div>

          {context.locationName && (
            <div className="flex items-center space-x-1.5 text-slate-300">
              <Building className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-slate-400 font-medium">Location:</span>
              <span className="font-semibold text-slate-200">{context.locationName}</span>
            </div>
          )}

          <div className="flex items-center space-x-1.5 text-slate-300">
            <Layers className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-400 font-medium">Discipline:</span>
            <span className="font-semibold text-purple-300">{context.discipline || 'Electrical'}</span>
          </div>

          {context.targetType === 'Equipment' && cablesPreview && (
            <div className="flex items-center space-x-1.5 text-slate-300">
              <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-400 font-medium">Connected Cables:</span>
              <span className="font-mono font-bold text-cyan-300">{cablesPreview.connectedCablesCount}</span>
            </div>
          )}
        </div>

        {/* Creation Mode Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800 flex items-center space-x-2 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setMode('template')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              mode === 'template'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Select from Template</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('blank')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              mode === 'blank'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>Instant Blank ITR</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('link')}
            className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
              mode === 'link'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Quick Link Existing</span>
          </button>

          {/* Connected Cables Tab for Equipment */}
          {context.targetType === 'Equipment' && (
            <button
              type="button"
              onClick={() => setMode('cables')}
              className={`pb-3 px-3 text-xs font-bold border-b-2 flex items-center space-x-1.5 transition-all whitespace-nowrap cursor-pointer ${
                mode === 'cables'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Connected Cables</span>
              {cablesPreview && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 font-mono">
                  {cablesPreview.connectedCablesCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {mode === 'template' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Choose Applicable Template ({context.targetType})
                </label>
                <span className="text-[11px] text-slate-500">
                  {applicableTemplates.length} matching template{applicableTemplates.length === 1 ? '' : 's'}
                </span>
              </div>

              {loading ? (
                <div className="text-center py-6 text-slate-400 text-xs">Loading templates...</div>
              ) : applicableTemplates.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/40 border border-slate-800 rounded-2xl p-4">
                  <p className="text-xs text-slate-400">No specific {context.targetType} templates found.</p>
                  <button
                    type="button"
                    onClick={() => setMode('blank')}
                    className="mt-3 text-xs font-bold text-amber-400 hover:underline"
                  >
                    Create an instant blank ITR instead →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {applicableTemplates.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[11px] font-bold text-purple-400">
                            {tpl.code}
                          </span>
                          {isSelected && (
                            <span className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-bold text-white leading-tight">
                          {tpl.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          {tpl.discipline} • {tpl.targetType}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Assigned Inspector / Tradesperson
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Responsible Contractor
                  </label>
                  <input
                    type="text"
                    value={assignedCompany}
                    onChange={(e) => setAssignedCompany(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'blank' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Inspection Title
                </label>
                <input
                  type="text"
                  value={blankTitle}
                  onChange={(e) => setBlankTitle(e.target.value)}
                  placeholder="e.g. Switchboard Pre-Commissioning & Torque Seal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Discipline
                  </label>
                  <select
                    value={blankDiscipline}
                    onChange={(e) => setBlankDiscipline(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Electrical">Electrical</option>
                    <option value="HV / Substation">HV / Substation</option>
                    <option value="Communications">Communications</option>
                    <option value="Mechanical / HVAC">Mechanical / HVAC</option>
                    <option value="Fire Services">Fire Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Assigned Inspector
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'link' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder="Search existing ITR number or target..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {filteredExistingItrs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No matching ITR records found.
                  </div>
                ) : (
                  filteredExistingItrs.map((itr) => {
                    const isSelected = selectedExistingId === itr.id;
                    return (
                      <div
                        key={itr.id}
                        onClick={() => setSelectedExistingId(itr.id)}
                        className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-purple-400 font-bold text-xs">
                              {itr.itrNumber}
                            </span>
                            <span className="text-xs font-semibold text-white">
                              {itr.templateTitle}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Target: {itr.targetCode} • Status: {itr.status}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Mode 4: Connected Cables Preview & Generation */}
          {mode === 'cables' && (
            <div className="space-y-4">
              {loadingCablesPreview ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Scanning connected cables and matching ITRs...
                </div>
              ) : !cablesPreview || cablesPreview.cables.length === 0 ? (
                <div className="text-center py-8 bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
                  <GitBranch className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">No Connected Cables Found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    No cable schedule entries originate from or terminate at {context.targetCode}.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Cables</span>
                      <span className="text-lg font-black text-cyan-400 font-mono">
                        {cablesPreview.connectedCablesCount}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Existing ITRs</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {cablesPreview.existingMatchingItrsCount}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Missing ITRs</span>
                      <span className="text-lg font-black text-amber-400 font-mono">
                        {cablesPreview.missingItrsCount}
                      </span>
                    </div>
                  </div>

                  {/* Connected Cables List */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Connected Cable Schedule & QA Status
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {cablesPreview.cables.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-xl border border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="font-mono font-bold text-cyan-300">{c.cableId}</span>
                            <span className="text-slate-400 text-[11px] truncate max-w-xs">
                              {c.cableType || 'LV Power Cable'}
                            </span>
                          </div>
                          {c.hasExistingItr ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                              <Check className="w-3 h-3" />
                              <span>ITR Exists</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Missing ITR</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Template Note */}
                  <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Generation Template</span>
                      <span className="font-semibold text-white">
                        {cablesPreview.template?.title || 'ITR-CAB-01: Cable Installation & Megger Verification'}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-purple-400">
                      {cablesPreview.template?.code || 'ITR-CAB-01'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {mode === 'template' && (
            <button
              type="button"
              disabled={submitting || applicableTemplates.length === 0}
              onClick={handleCreateFromTemplate}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Generating...' : 'Create & Link ITR'}
            </button>
          )}

          {mode === 'blank' && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleCreateBlank}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Blank ITR'}
            </button>
          )}

          {mode === 'link' && (
            <button
              type="button"
              onClick={handleLinkExisting}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Link to Equipment
            </button>
          )}

          {mode === 'cables' && cablesPreview && cablesPreview.cables.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleGenerateCableItrs(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
              >
                All Cables ({cablesPreview.connectedCablesCount})
              </button>
              <button
                type="button"
                disabled={submitting || cablesPreview.missingItrsCount === 0}
                onClick={() => handleGenerateCableItrs(true)}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {submitting
                  ? 'Generating...'
                  : `Generate Missing Only (${cablesPreview.missingItrsCount})`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
