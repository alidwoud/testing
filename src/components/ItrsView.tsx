import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  ClipboardCheck,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  Check,
  X,
  Layers,
  Table,
  Building,
  User,
  ShieldCheck,
  FileText,
  Save,
  Camera,
} from 'lucide-react';
import { ItrInstance, ItrTemplate, ItrTemplateSection, PhotoEvidence } from '../types/index.ts';
import { PhotoUploadModal } from './PhotoUploadModal.tsx';

export const ItrsView: React.FC = () => {
  const {
    apiFetch,
    selectedItrId,
    setSelectedItrId,
    setSelectedCableId,
    setSelectedEquipmentId,
    setActiveTab,
    addToast,
    currentUser,
    activeProject,
    refreshStats,
  } = useApp();

  const [itrsList, setItrsList] = useState<ItrInstance[]>([]);
  const [templatesList, setTemplatesList] = useState<ItrTemplate[]>([]);
  const [singleItr, setSingleItr] = useState<any | null>(null);
  const [itrPhotos, setItrPhotos] = useState<PhotoEvidence[]>([]);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Active form state when completing an ITR
  const [formAnswers, setFormAnswers] = useState<Record<string, any>>({});
  const [spreadsheetRows, setSpreadsheetRows] = useState<any[]>([]);
  const [supervisorNotes, setSupervisorNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Template Builder Modal
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [newTplCode, setNewTplCode] = useState('');
  const [newTplTitle, setNewTplTitle] = useState('');
  const [newTplDiscipline, setNewTplDiscipline] = useState('Electrical');
  const [newTplTarget, setNewTplTarget] = useState<'Cable' | 'Equipment'>('Cable');
  const [newTplDesc, setNewTplDesc] = useState('');
  const [builderIncludeSpreadsheet, setBuilderIncludeSpreadsheet] = useState(true);

  const fetchItrs = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        status: statusFilter,
        targetType: targetTypeFilter,
        search,
      });
      const [itrsRes, tplsRes] = await Promise.all([
        apiFetch(`/api/itr-instances?${q.toString()}`),
        apiFetch('/api/itr-templates'),
      ]);
      if (itrsRes.ok) {
        const data = await itrsRes.json();
        setItrsList(data);
      }
      if (tplsRes.ok) {
        const tplData = await tplsRes.json();
        setTemplatesList(tplData);
      }
    } catch (err) {
      console.error('Failed to load ITRs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleItr = async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/itr-instances/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSingleItr(data);

        // Parse existing form answers
        let parsedForm: any = {};
        try {
          parsedForm = data.formData ? JSON.parse(data.formData) : {};
        } catch {
          parsedForm = {};
        }
        setFormAnswers(parsedForm);

        // Parse template definition to get spreadsheet rows if available
        let templateSchema: any = {};
        try {
          templateSchema =
            typeof data.template?.schemaDefinition === 'string'
              ? JSON.parse(data.template.schemaDefinition)
              : data.template?.schemaDefinition || {};
        } catch {
          templateSchema = {};
        }

        const tableSection = templateSchema.sections?.find((s: any) => s.type === 'spreadsheet_table');
        if (parsedForm.spreadsheet_rows) {
          setSpreadsheetRows(parsedForm.spreadsheet_rows);
        } else if (tableSection?.defaultRows) {
          setSpreadsheetRows(tableSection.defaultRows);
        } else {
          setSpreadsheetRows([]);
        }

        // Load photos linked to this ITR
        const pRes = await apiFetch(`/api/photos?entityId=${id}`);
        if (pRes.ok) {
          setItrPhotos(await pRes.json());
        }
      }
    } catch (err) {
      console.error('Failed to load single ITR:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItrId) {
      fetchSingleItr(selectedItrId);
    } else {
      setSingleItr(null);
      fetchItrs();
    }
  }, [selectedItrId, statusFilter, targetTypeFilter, search, activeProject]);

  // Form Answer Handlers
  const handleAnswerChange = (fieldId: string, value: any) => {
    setFormAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSpreadsheetRowChange = (index: number, key: string, value: any) => {
    setSpreadsheetRows((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [key]: value };
      return copy;
    });
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!selectedItrId) return;
    setSubmitting(true);
    try {
      const payload = {
        formData: {
          ...formAnswers,
          spreadsheet_rows: spreadsheetRows,
        },
      };
      const res = await apiFetch(`/api/itr-instances/${selectedItrId}/save`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        addToast('success', 'Draft Saved', 'Inspection answers saved successfully');
        await fetchSingleItr(selectedItrId);
      }
    } catch {
      addToast('error', 'Save Failed', 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit for Supervisor Review (Tradesperson action)
  const handleSubmitItr = async () => {
    if (!selectedItrId) return;
    setSubmitting(true);
    try {
      const payload = {
        formData: {
          ...formAnswers,
          spreadsheet_rows: spreadsheetRows,
        },
      };
      const res = await apiFetch(`/api/itr-instances/${selectedItrId}/submit`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        addToast('success', 'ITR Submitted', 'Inspection sent to Supervisor for QA verification');
        await fetchSingleItr(selectedItrId);
        await refreshStats();
      }
    } catch {
      addToast('error', 'Submission Failed', 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // Review ITR (Supervisor / QA Manager action: Approve or Reject)
  const handleReviewItr = async (action: 'Approve' | 'Reject') => {
    if (!selectedItrId) return;
    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/itr-instances/${selectedItrId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          notes: supervisorNotes || (action === 'Approve' ? 'Approved on site.' : 'Needs correction.'),
        }),
      });

      if (res.ok) {
        addToast(
          'success',
          action === 'Approve' ? 'ITR Approved' : 'ITR Returned',
          action === 'Approve'
            ? 'Inspection approved! Target cable QA status updated to Approved.'
            : 'Inspection marked as rejected for trade rectification.'
        );
        setSupervisorNotes('');
        await fetchSingleItr(selectedItrId);
        await refreshStats();
      } else {
        const err = await res.json();
        addToast('error', 'Review Failed', err.error);
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to submit review decision');
    } finally {
      setSubmitting(false);
    }
  };

  // Create Template in Builder
  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplCode.trim() || !newTplTitle.trim()) return;

    const sections: ItrTemplateSection[] = [
      {
        id: 'sec_containment',
        title: '1. Containment & Physical Inspection',
        fields: [
          { id: 'fld_containment', label: 'Installed in accordance with approved route and drawings', type: 'pass_fail_na', required: true },
          { id: 'fld_labels', label: 'Stainless steel identification tags fitted at both ends', type: 'pass_fail_na', required: true },
          { id: 'fld_cleats', label: 'Cleating / ties properly rated and spaced', type: 'pass_fail_na', required: true },
        ],
      },
    ];

    if (builderIncludeSpreadsheet) {
      sections.push({
        id: 'sec_spreadsheet_table',
        title: '2. Structured Insulation Resistance Readings (Table)',
        type: 'spreadsheet_table',
        columns: [
          { id: 'phase', label: 'Phase Under Test', type: 'text', readOnly: true },
          { id: 'reading', label: 'Reading', type: 'number', required: true },
          { id: 'unit', label: 'Unit', type: 'text', defaultValue: 'MΩ', readOnly: true },
          { id: 'result', label: 'Result', type: 'pass_fail', required: true },
        ],
        defaultRows: [
          { phase: 'L1 to Earth (L1-E)', reading: '1000', unit: 'MΩ', result: 'PASS' },
          { phase: 'L2 to Earth (L2-E)', reading: '998', unit: 'MΩ', result: 'PASS' },
          { phase: 'L3 to Earth (L3-E)', reading: '1002', unit: 'MΩ', result: 'PASS' },
          { phase: 'Neutral to Earth (N-E)', reading: '850', unit: 'MΩ', result: 'PASS' },
        ],
      });
    }

    try {
      const res = await apiFetch('/api/itr-templates', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          code: newTplCode.trim(),
          title: newTplTitle.trim(),
          discipline: newTplDiscipline,
          targetType: newTplTarget,
          description: newTplDesc,
          schemaDefinition: JSON.stringify({ sections }),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        addToast('success', 'Template Created', `${created.code} — ${created.title}`);
        setIsBuilderOpen(false);
        setNewTplCode('');
        setNewTplTitle('');
        await fetchItrs();
      }
    } catch {
      addToast('error', 'Error', 'Failed to save template');
    }
  };

  // If viewing a single ITR form instance:
  if (selectedItrId && singleItr) {
    let autoData: any = {};
    try {
      autoData = typeof singleItr.autoPopulatedData === 'string' ? JSON.parse(singleItr.autoPopulatedData) : {};
    } catch {
      autoData = {};
    }

    let templateSchema: any = {};
    try {
      templateSchema =
        typeof singleItr.template?.schemaDefinition === 'string'
          ? JSON.parse(singleItr.template.schemaDefinition)
          : singleItr.template?.schemaDefinition || {};
    } catch {
      templateSchema = {};
    }

    const isApproved = singleItr.status === 'Approved';
    const isSubmitted = singleItr.status === 'Submitted' || singleItr.status === 'Under Review';
    const canReview = currentUser.role === 'Supervisor' || currentUser.role === 'QA Manager' || currentUser.role === 'Administrator';

    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-16">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedItrId(null)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Back to ITR Register"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-purple-400">
                <span>{singleItr.itrNumber}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-sans">
                  Target: {singleItr.targetType} ({singleItr.targetCode})
                </span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>{singleItr.templateTitle}</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    isApproved
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : isSubmitted
                      ? 'bg-blue-950 text-blue-400 border border-blue-800'
                      : singleItr.status === 'Rejected'
                      ? 'bg-rose-950 text-rose-400 border border-rose-800'
                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                  }`}
                >
                  {singleItr.status}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isApproved && (
              <button
                disabled={submitting}
                onClick={handleSaveDraft}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold uppercase tracking-wider transition-colors border border-slate-700"
              >
                <Save className="w-4 h-4 text-slate-400" />
                <span>Save Draft</span>
              </button>
            )}
          </div>
        </div>

        {/* 1. ITR AUTO-POPULATION BANNER (CRITICAL USER REQUIREMENT) */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Auto-Populated Known Project Data</span>
            </span>
            <span className="text-[11px] text-slate-400">Zero duplicate typing</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Target Cable / Unit</span>
              <span className="font-mono font-bold text-amber-300 text-sm">
                {autoData.cableId || autoData.equipmentCode || singleItr.targetCode}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">From → To</span>
              <span className="font-mono font-bold text-white">
                {autoData.fromEquipment && autoData.toEquipment
                  ? `${autoData.fromEquipment} → ${autoData.toEquipment}`
                  : 'Switch Room 01'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Specification</span>
              <span className="text-slate-200 font-medium">
                {autoData.cableType || autoData.equipmentType || '4C 240mm² Cu XLPE'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Responsible Contractor</span>
              <span className="text-slate-200 font-medium">
                {autoData.responsibleCompany || singleItr.assignedCompany || 'Not Set'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. INSPECTION CHECKLIST SECTIONS */}
        {templateSchema.sections?.map((section: ItrTemplateSection, sIdx: number) => {
          // If section is spreadsheet table:
          if (section.type === 'spreadsheet_table') {
            return (
              <div
                key={section.id || sIdx}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <Table className="w-5 h-5 text-amber-400" />
                    <h3 className="text-base font-bold text-white">{section.title}</h3>
                  </div>
                  <span className="text-xs text-amber-400 font-mono font-bold">Structured Database Table</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Phase Under Test</th>
                        <th className="py-2.5 px-3 w-40">Reading</th>
                        <th className="py-2.5 px-3 w-20">Unit</th>
                        <th className="py-2.5 px-3 w-28">Min Limit</th>
                        <th className="py-2.5 px-3 w-36">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {spreadsheetRows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-850">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-200">
                            {row.phase}
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="number"
                              disabled={isApproved}
                              value={row.reading || ''}
                              onChange={(e) => handleSpreadsheetRowChange(rIdx, 'reading', e.target.value)}
                              placeholder="e.g. 1000"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400 disabled:opacity-75"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{row.unit || 'MΩ'}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{row.min_limit || '≥ 50 MΩ'}</td>
                          <td className="py-2.5 px-3">
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                disabled={isApproved}
                                onClick={() => handleSpreadsheetRowChange(rIdx, 'result', 'PASS')}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-colors ${
                                  row.result === 'PASS'
                                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                PASS
                              </button>
                              <button
                                type="button"
                                disabled={isApproved}
                                onClick={() => handleSpreadsheetRowChange(rIdx, 'result', 'FAIL')}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-black transition-colors ${
                                  row.result === 'FAIL'
                                    ? 'bg-rose-500 text-white shadow-sm'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                FAIL
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }

          // Standard Checklist Section
          return (
            <div
              key={section.id || sIdx}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4"
            >
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2">
                {section.title}
              </h3>

              <div className="space-y-3.5">
                {section.fields?.map((field) => {
                  const currentValue = formAnswers[field.id];

                  if (field.type === 'pass_fail_na' || field.type === 'pass_fail') {
                    return (
                      <div
                        key={field.id}
                        className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="text-xs font-medium text-slate-200 flex-1">
                          {field.label}
                          {field.required && <span className="text-amber-400 ml-1">*</span>}
                        </div>

                        <div className="flex items-center space-x-2 shrink-0">
                          <button
                            type="button"
                            disabled={isApproved}
                            onClick={() => handleAnswerChange(field.id, 'PASS')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              currentValue === 'PASS'
                                ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            ✓ PASS
                          </button>
                          <button
                            type="button"
                            disabled={isApproved}
                            onClick={() => handleAnswerChange(field.id, 'FAIL')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              currentValue === 'FAIL'
                                ? 'bg-rose-600 text-white shadow-md font-black'
                                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            ✗ FAIL
                          </button>
                          {field.type === 'pass_fail_na' && (
                            <button
                              type="button"
                              disabled={isApproved}
                              onClick={() => handleAnswerChange(field.id, 'N/A')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                currentValue === 'N/A'
                                  ? 'bg-slate-600 text-white shadow-md font-black'
                                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              N/A
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (field.type === 'textarea') {
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-300">{field.label}</label>
                        <textarea
                          rows={2}
                          disabled={isApproved}
                          value={currentValue || ''}
                          onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                          placeholder="Notes or observations..."
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                        />
                      </div>
                    );
                  }

                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-xs font-bold text-slate-300">{field.label}</label>
                      <input
                        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                        disabled={isApproved}
                        value={currentValue || ''}
                        onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-75"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* 2.5 PHOTO EVIDENCE ATTACHMENTS */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Camera className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Inspection Photo Evidence ({itrPhotos.length})
              </h3>
            </div>
            {!isApproved && (
              <button
                type="button"
                onClick={() => setIsPhotoModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Attach Photo</span>
              </button>
            )}
          </div>

          {itrPhotos.length === 0 ? (
            <div className="p-5 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-400">
              No photos attached to this inspection yet. Attach visual quality evidence (meter readings, torque marks, terminations).
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {itrPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group relative"
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.title}
                    className="w-full aspect-video object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="p-2 space-y-0.5">
                    <div className="text-[11px] font-bold text-white truncate">{photo.title}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{photo.category}</span>
                      {photo.qaVerified === 'true' && (
                        <span className="text-emerald-400 font-bold">✓ QA</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 3. SIGN-OFF & WORKFLOW ACTION PANEL */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <h3 className="text-base font-bold text-white border-b border-slate-800 pb-2 flex items-center justify-between">
            <span>Inspection Sign-off & Verification Status</span>
            <span className="text-xs font-mono font-bold text-amber-400">
              Role: {currentUser.role}
            </span>
          </h3>

          {/* Submission Info */}
          {singleItr.submittedAt && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[11px]">Submitted By Tradesperson:</span>
                <span className="font-bold text-white">{singleItr.submittedByName || 'Dave Miller (Tradesperson)'}</span>
              </div>
              <span className="font-mono text-slate-400">
                {new Date(singleItr.submittedAt).toLocaleString()}
              </span>
            </div>
          )}

          {/* Approval Sign-off info if approved */}
          {isApproved && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Approved by Supervisor / QA Manager</span>
                </span>
                <span className="font-mono text-slate-400">
                  {singleItr.reviewedAt ? new Date(singleItr.reviewedAt).toLocaleString() : 'Recent'}
                </span>
              </div>
              <div className="text-white font-medium">
                Reviewer: {singleItr.reviewedByName || 'Mark Callahan (Supervisor)'}
              </div>
              {singleItr.approvalNotes && (
                <div className="text-slate-300 italic">"{singleItr.approvalNotes}"</div>
              )}
            </div>
          )}

          {/* Supervisor / QA Action Buttons */}
          {canReview && !isApproved && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
              <div className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Supervisor QA Verification Controls:
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Supervisor Verification Comments:
                </label>
                <textarea
                  rows={2}
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  placeholder="e.g. Cleats and torque marks inspected on site. IR values pass spec."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center space-x-3 pt-1">
                <button
                  disabled={submitting}
                  onClick={() => handleReviewItr('Approve')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Inspection (Sign Off)</span>
                </button>
                <button
                  disabled={submitting}
                  onClick={() => handleReviewItr('Reject')}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject / Return</span>
                </button>
              </div>
            </div>
          )}

          {/* Tradesperson Submit Button */}
          {!isApproved && !isSubmitted && (
            <div className="pt-2">
              <button
                disabled={submitting}
                onClick={handleSubmitItr}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Submit Inspection to Supervisor for QA Review</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ITR Register View
  return (
    <div className="space-y-6">
      {/* 0. QA PERSPECTIVES / NAVIGATION SWITCHER BAR (Direct Access, No 4-level nesting required) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter !== 'Draft'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>All ITRs (Flat Register)</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                statusFilter !== 'Draft'
                  ? 'bg-slate-950/20 text-slate-950 font-black'
                  : 'bg-slate-900 text-slate-400'
              }`}
            >
              {itrsList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('locations')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white transition-all cursor-pointer"
            title="Inspect by Building, Level, and Room in the Project Structure Tree"
          >
            <Building className="w-3.5 h-3.5 text-blue-400" />
            <span>By Location / Area (Tree View)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('equipment')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white transition-all cursor-pointer"
            title="Inspect by Equipment Tag, Switchboards, Transformers & DBs"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>By Equipment / Tag</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('testing')}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white transition-all cursor-pointer"
            title="Structured Megger 1000V, Phase Rotation & Torque seal test sheets"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Testing Register</span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Draft')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'Draft'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
            }`}
            title="In-progress offline drafts and unsubmitted checklists"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Offline / Drafts</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-400 px-2 hidden lg:block">
          Direct flat register • No deep tree traversing needed
        </div>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <ClipboardCheck className="w-6 h-6 text-purple-400" />
            <span>ITR & Inspection Workflows</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Standardised inspection test records, spreadsheet test tables, and supervisor approval sign-off.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>ITR Template Builder</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ITR number, target cable/equipment (e.g. CB-L02, UT-01)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-purple-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
        >
          <option value="">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="In Progress">In Progress</option>
          <option value="Submitted">Submitted (Under Review)</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
        >
          <option value="">All Targets</option>
          <option value="Cable">Cable</option>
          <option value="Equipment">Equipment</option>
        </select>
      </div>

      {/* Register List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading inspections...</div>
        ) : itrsList.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No inspection records match filter criteria.
          </div>
        ) : (
          itrsList.map((itr) => {
            const isApproved = itr.status === 'Approved';
            const isSubmitted = itr.status === 'Submitted' || itr.status === 'Under Review';
            return (
              <div
                key={itr.id}
                onClick={() => setSelectedItrId(itr.id)}
                className="p-4 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-purple-400 text-xs">
                      {itr.itrNumber}
                    </span>
                    <span className="font-mono text-amber-400 font-bold text-xs bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {itr.targetCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        isApproved
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : isSubmitted
                          ? 'bg-blue-950 text-blue-400 border border-blue-800'
                          : itr.status === 'Rejected'
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : 'bg-amber-950 text-amber-400 border border-amber-800'
                      }`}
                    >
                      {itr.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">
                    {itr.templateTitle}
                  </h3>

                  <div className="text-[11px] text-slate-400 flex items-center space-x-3">
                    <span>Assigned: {itr.assignedTo || 'Unassigned'}</span>
                    <span>•</span>
                    <span>{itr.assignedCompany || 'Not Set'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-auto text-xs font-semibold text-purple-400 group-hover:translate-x-1 transition-transform">
                  <span>{isApproved ? 'View Record' : isSubmitted ? 'Review & Sign-Off' : 'Open Form'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* TEMPLATE BUILDER MODAL */}
      {isBuilderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Create Reusable ITR Template</h3>
            <p className="text-xs text-slate-400 mb-4">
              Build a standard QA checklist template with Pass/Fail questions and spreadsheet test reading sections.
            </p>

            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Template Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ITR-EL-03"
                    value={newTplCode}
                    onChange={(e) => setNewTplCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Target Type
                  </label>
                  <select
                    value={newTplTarget}
                    onChange={(e) => setNewTplTarget(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="Cable">Cable</option>
                    <option value="Equipment">Equipment</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Template Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. High Voltage Hi-Pot Testing & Continuity Record"
                  value={newTplTitle}
                  onChange={(e) => setNewTplTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newTplDesc}
                  onChange={(e) => setNewTplDesc(e.target.value)}
                  placeholder="Scope of inspection..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                <label className="flex items-center space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={builderIncludeSpreadsheet}
                    onChange={(e) => setBuilderIncludeSpreadsheet(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-0"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">
                      Include Spreadsheet-Style Test Readings Section
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Auto generates structured repeated phase readings (L1, L2, L3, N, Earth) in MΩ.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
