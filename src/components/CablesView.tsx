import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import Papa from 'papaparse';
import {
  Cable,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  ClipboardCheck,
  Check,
  X,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { CableItem, ItrTemplate } from '../types/index.ts';

export const CablesView: React.FC = () => {
  const {
    apiFetch,
    selectedCableId,
    setSelectedCableId,
    setSelectedItrId,
    setActiveTab,
    addToast,
    activeProject,
  } = useApp();

  const [cablesList, setCablesList] = useState<CableItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [singleCable, setSingleCable] = useState<any | null>(null);
  const [activeCableTab, setActiveCableTab] = useState<'overview' | 'itrs' | 'testing' | 'issues' | 'history'>('overview');

  // Filters & Search
  const [search, setSearch] = useState('');
  const [systemFilter, setSystemFilter] = useState('');
  const [installFilter, setInstallFilter] = useState('');
  const [qaFilter, setQaFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isBulkItrModalOpen, setIsBulkItrModalOpen] = useState(false);
  const [templates, setTemplates] = useState<ItrTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<number[]>([]);

  // CSV Import Wizard Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState({
    cableId: '',
    fromEquipment: '',
    toEquipment: '',
    system: '',
    cableType: '',
    cableSize: '',
    length: '',
    responsibleCompany: '',
  });
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [importing, setImporting] = useState(false);

  // New Cable Modal
  const [isNewCableModalOpen, setIsNewCableModalOpen] = useState(false);
  const [newCableId, setNewCableId] = useState('');
  const [newFromEq, setNewFromEq] = useState('UT-01');
  const [newToEq, setNewToEq] = useState('MSB-01');
  const [newType, setNewType] = useState('4C 240mm² Cu XLPE');
  const [newSize, setNewSize] = useState('240mm²');
  const [newLength, setNewLength] = useState(48);
  const [newSystem, setNewSystem] = useState('LV Power');

  const fetchCables = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search,
        system: systemFilter,
        installationStatus: installFilter,
        qaStatus: qaFilter,
      });

      const res = await apiFetch(`/api/cables?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setCablesList(data.data || []);
        setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      }

      // Fetch templates for bulk creation
      const tplRes = await apiFetch('/api/itr-templates');
      if (tplRes.ok) {
        const tplData = await tplRes.json();
        setTemplates(tplData.filter((t: any) => t.targetType === 'Cable'));
      }
    } catch (err) {
      console.error('Failed to load cables:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleCable = async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/cables/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSingleCable(data);
      }
    } catch (err) {
      console.error('Failed to load cable detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCableId) {
      fetchSingleCable(selectedCableId);
    } else {
      setSingleCable(null);
      fetchCables();
    }
  }, [selectedCableId, pagination.page, search, systemFilter, installFilter, qaFilter, activeProject]);

  // Bulk select handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === cablesList.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(cablesList.map((c) => c.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Bulk ITR Generation
  const handleBulkGenerateItrs = async () => {
    if (selectedIds.length === 0 || selectedTemplateIds.length === 0) return;
    try {
      const res = await apiFetch('/api/itr-instances/bulk-generate', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          targetType: 'Cable',
          targetIds: selectedIds,
          templateIds: selectedTemplateIds,
          assignedTo: 'Dave Miller',
          assignedCompany: 'Apex Electrical Contractors',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        addToast(
          'success',
          'Bulk Inspections Generated',
          `Created ${data.itrs?.length || 0} ITR inspections with automated naming!`
        );
        setIsBulkItrModalOpen(false);
        setSelectedIds([]);
        setSelectedTemplateIds([]);
        setActiveTab('itrs');
      } else {
        const err = await res.json();
        addToast('error', 'Bulk Generation Failed', err.error);
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to generate bulk inspections');
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (cablesList.length === 0) return;
    const csv = Papa.unparse(
      cablesList.map((c) => ({
        'Cable ID': c.cableId,
        From: c.fromEquipmentCode,
        To: c.toEquipmentCode,
        System: c.system,
        'Cable Type': c.cableType,
        'Cable Size': c.cableSize,
        'Length (m)': c.length,
        Installed: c.installationStatus,
        Terminated: c.terminationStatus,
        Tested: c.testingStatus,
        'QA Status': c.qaStatus,
        Company: c.responsibleCompany,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `MAXIM_FORGE_Cables_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('success', 'Export Complete', `Exported ${cablesList.length} cables to CSV`);
  };

  // CSV Import Workflow
  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length > 0) {
          const headers = Object.keys(results.data[0] as object);
          setCsvHeaders(headers);
          setRawCsvData(results.data);

          // Auto map columns
          const autoMap: any = {};
          headers.forEach((h) => {
            const lower = h.toLowerCase();
            if (lower.includes('cable') && (lower.includes('id') || lower.includes('ref') || lower.includes('no') || lower.includes('tag'))) {
              autoMap.cableId = h;
            } else if (lower === 'cable' || lower === 'cable ref' || lower === 'cable id') {
              autoMap.cableId = h;
            } else if (lower.startsWith('from') || lower.includes('origin')) {
              autoMap.fromEquipment = h;
            } else if (lower.startsWith('to') || lower.includes('dest')) {
              autoMap.toEquipment = h;
            } else if (lower.includes('type')) {
              autoMap.cableType = h;
            } else if (lower.includes('size')) {
              autoMap.cableSize = h;
            } else if (lower.includes('length')) {
              autoMap.length = h;
            } else if (lower.includes('system') || lower.includes('discipline')) {
              autoMap.system = h;
            } else if (lower.includes('company') || lower.includes('contractor')) {
              autoMap.responsibleCompany = h;
            }
          });

          setColumnMapping((prev) => ({ ...prev, ...autoMap }));
          setImportStep('mapping');
        }
      },
    });
  };

  const handleUseSampleSpreadsheet = () => {
    // Fictional sample IFC cable schedule
    const sampleRows = [
      { 'Cable Ref': 'CB-L02-UT01-001', 'From Equipment': 'UT-01', 'To Equipment': 'MSB-01', 'Discipline': 'LV Power', 'Cable Spec': '4C 240mm² Cu XLPE', 'Size': '240mm²', 'Design Length': 86.0, 'Contractor': 'Apex Electrical Contractors' },
      { 'Cable Ref': 'CB-L02-UT01-007', 'From Equipment': 'UT-01', 'To Equipment': 'MSB-01', 'Discipline': 'LV Power', 'Cable Spec': '4C 240mm² Cu XLPE', 'Size': '240mm²', 'Design Length': 48.0, 'Contractor': 'Apex Electrical Contractors' },
      { 'Cable Ref': 'CB-L02-UT01-008', 'From Equipment': 'UT-01', 'To Equipment': 'MSB-01', 'Discipline': 'LV Power', 'Cable Spec': '4C 240mm² Cu XLPE', 'Size': '240mm²', 'Design Length': 48.0, 'Contractor': 'Apex Electrical Contractors' },
      { 'Cable Ref': 'CB-L02-UT02-004', 'From Equipment': 'UT-02', 'To Equipment': 'MSB-02', 'Discipline': 'LV Power', 'Cable Spec': '4C 240mm² Cu XLPE', 'Size': '240mm²', 'Design Length': 52.0, 'Contractor': 'Apex Electrical Contractors' },
      { 'Cable Ref': 'CB-L02-UT02-005', 'From Equipment': 'UT-02', 'To Equipment': 'MSB-02', 'Discipline': 'LV Power', 'Cable Spec': '4C 240mm² Cu XLPE', 'Size': '240mm²', 'Design Length': 52.0, 'Contractor': 'Apex Electrical Contractors' },
    ];
    setCsvHeaders(Object.keys(sampleRows[0]));
    setRawCsvData(sampleRows);
    setColumnMapping({
      cableId: 'Cable Ref',
      fromEquipment: 'From Equipment',
      toEquipment: 'To Equipment',
      system: 'Discipline',
      cableType: 'Cable Spec',
      cableSize: 'Size',
      length: 'Design Length',
      responsibleCompany: 'Contractor',
    });
    setImportStep('mapping');
  };

  const handleValidateAndPreview = async () => {
    if (!columnMapping.cableId) {
      addToast('error', 'Mapping Missing', 'Please select a column for Cable ID');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch('/api/cables/import-preview', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          rows: rawCsvData,
          columnMapping,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreviewResult(data);
        setImportStep('preview');
      } else {
        const err = await res.json();
        addToast('error', 'Validation Failed', err.error);
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to validate spreadsheet data');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!previewResult) return;
    setImporting(true);
    try {
      const res = await apiFetch('/api/cables/import-commit', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          newRecords: previewResult.newRecords,
          updates: previewResult.updates,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        addToast(
          'success',
          'Schedule Imported Successfully',
          `${data.createdCount} created, ${data.updatedCount} updated`
        );
        setIsImportModalOpen(false);
        setImportStep('upload');
        setRawCsvData([]);
        setPreviewResult(null);
        await fetchCables();
      } else {
        const err = await res.json();
        addToast('error', 'Commit Failed', err.error);
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to commit imported records');
    } finally {
      setImporting(false);
    }
  };

  // Handle Create Cable form
  const handleCreateCable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCableId.trim() || !newFromEq.trim() || !newToEq.trim()) return;

    try {
      const res = await apiFetch('/api/cables', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          cableId: newCableId.trim(),
          fromEquipmentCode: newFromEq.trim(),
          toEquipmentCode: newToEq.trim(),
          cableType: newType,
          cableSize: newSize,
          length: Number(newLength),
          system: newSystem,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        addToast('success', 'Cable Created', `${created.cableId} added to register`);
        setIsNewCableModalOpen(false);
        setNewCableId('');
        setSelectedCableId(created.id);
      } else {
        const err = await res.json();
        addToast('error', 'Creation Failed', err.error);
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to create cable');
    }
  };

  // If viewing single cable object page:
  if (selectedCableId && singleCable) {
    return (
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedCableId(null)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Back to Cable Register"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-blue-400">
                <span>{singleCable.cableId}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-sans">{singleCable.system}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-sans">{singleCable.responsibleCompany}</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>
                  {singleCable.fromEquipmentCode} → {singleCable.toEquipmentCode}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    singleCable.qaStatus === 'Approved'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : singleCable.qaStatus === 'Pending Review'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  QA: {singleCable.qaStatus}
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Cable Status Flow Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Delivery Stage & Verification Pipeline
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div
              className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                singleCable.installationStatus === 'Installed'
                  ? 'bg-blue-950/40 border-blue-500/50 text-blue-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider">Installation</div>
                <div className="text-xs font-bold text-white">{singleCable.installationStatus}</div>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                singleCable.terminationStatus === 'Terminated'
                  ? 'bg-indigo-950/40 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider">Termination</div>
                <div className="text-xs font-bold text-white">{singleCable.terminationStatus}</div>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                singleCable.testingStatus === 'Tested'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <TrendingUp className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider">Testing (IR)</div>
                <div className="text-xs font-bold text-white">{singleCable.testingStatus}</div>
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center space-x-2.5 ${
                singleCable.qaStatus === 'Approved'
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                  : singleCable.qaStatus === 'Pending Review'
                  ? 'bg-amber-950/40 border-amber-500/50 text-amber-300'
                  : 'bg-slate-950/50 border-slate-800 text-slate-400'
              }`}
            >
              <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider">QA Sign-Off</div>
                <div className="text-xs font-bold text-white">{singleCable.qaStatus}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Cable Tabs */}
        <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'itrs', label: `ITRs (${singleCable.itrs?.length || 0})` },
            { id: 'testing', label: `Test Readings (${singleCable.testReadings?.length || 0})` },
            { id: 'issues', label: `Issues (${singleCable.issues?.length || 0})` },
            { id: 'history', label: 'History' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveCableTab(t.id as any)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
                activeCableTab === t.id
                  ? 'border-blue-400 text-blue-400 bg-slate-900/40 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          {activeCableTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Physical Cable Parameters
                </h3>
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Cable ID</span>
                    <span className="font-mono font-bold text-blue-400">{singleCable.cableId}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">From Equipment</span>
                    <span className="font-mono font-bold text-amber-400">{singleCable.fromEquipmentCode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">To Equipment</span>
                    <span className="font-mono font-bold text-amber-400">{singleCable.toEquipmentCode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Cable Specification</span>
                    <span className="text-white font-medium">{singleCable.cableType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Cable Conductor Size</span>
                    <span className="text-white font-medium">{singleCable.cableSize}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Route Length</span>
                    <span className="font-mono font-bold text-white">{singleCable.length} metres</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Routing & Location
                </h3>
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Location</span>
                    <span className="text-white font-semibold">
                      {singleCable.location?.path || 'Switch Room 01 (Level 02)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Responsible Contractor</span>
                    <span className="text-white font-semibold">{singleCable.responsibleCompany}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Site Notes & Comments</span>
                    <p className="text-slate-300 leading-relaxed">
                      {singleCable.comments || 'Ladder tray route verified. Cleats spaced per spec.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeCableTab === 'itrs' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">ITR Inspections for {singleCable.cableId}</h3>
              {singleCable.itrs?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No ITR generated yet. Use Bulk ITR or click below to generate one.
                </div>
              ) : (
                <div className="space-y-2">
                  {singleCable.itrs.map((itr: any) => (
                    <div
                      key={itr.id}
                      onClick={() => {
                        setSelectedItrId(itr.id);
                        setActiveTab('itrs');
                      }}
                      className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 cursor-pointer flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-purple-400 font-bold text-xs">{itr.itrNumber}</span>
                          <span className="text-xs font-bold text-white">{itr.templateTitle}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                            {itr.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Assigned: {itr.assignedTo || 'Dave Miller'} • {itr.assignedCompany}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCableTab === 'testing' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Insulation Resistance Readings</h3>
              {singleCable.testReadings?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No structured test readings recorded for this cable yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Test Type</th>
                      <th className="py-2 px-3">Phase / Core</th>
                      <th className="py-2 px-3">Reading</th>
                      <th className="py-2 px-3">Result</th>
                      <th className="py-2 px-3">Tester</th>
                      <th className="py-2 px-3">Test Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {singleCable.testReadings.map((r: any) => (
                      <tr key={r.id}>
                        <td className="py-2 px-3 font-semibold text-slate-200">{r.testType}</td>
                        <td className="py-2 px-3 font-mono text-amber-400">{r.phase}</td>
                        <td className="py-2 px-3 font-mono font-bold text-white">
                          {r.reading} {r.unit}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400">
                            {r.result}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400">{r.testedBy}</td>
                        <td className="py-2 px-3 text-slate-400 font-mono">{r.testDate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeCableTab === 'issues' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Defects Linked to Cable</h3>
              {singleCable.issues?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No defects reported.</div>
              ) : (
                <div className="space-y-2">
                  {singleCable.issues.map((iss: any) => (
                    <div key={iss.id} className="p-3.5 rounded-xl bg-slate-850 border border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-rose-400 font-bold text-xs">{iss.issueNumber}</span>
                        <span className="text-xs font-bold text-white">{iss.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{iss.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeCableTab === 'history' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Audit Trail</h3>
              {singleCable.history?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No audit logs for this cable.</div>
              ) : (
                singleCable.history.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>{log.action}</span>
                      <span className="font-mono text-slate-400 text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      By {log.performedByName} ({log.performedByRole})
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Cable Register View
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Cable className="w-6 h-6 text-blue-400" />
            <span>Cable Register</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Searchable project schedule with bulk inspection generation and spreadsheet import.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Import Schedule</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsNewCableModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Add Cable</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions Floating Bar if cables are selected */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-amber-500/20 border-2 border-amber-500/50 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
              {selectedIds.length}
            </span>
            <span className="text-sm font-bold text-white">
              {selectedIds.length} cables selected for bulk processing
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsBulkItrModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center space-x-1.5 shadow-md"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Generate ITR Inspections</span>
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Cable ID (e.g. CB-L02-UT01-001), equipment, type..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-400"
          />
        </div>

        <select
          value={systemFilter}
          onChange={(e) => setSystemFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
        >
          <option value="">All Systems</option>
          <option value="LV Power">LV Power</option>
          <option value="HV Power">HV Power</option>
          <option value="Control">Control</option>
          <option value="Data/Fiber">Data/Fiber</option>
        </select>

        <select
          value={installFilter}
          onChange={(e) => setInstallFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
        >
          <option value="">All Installation</option>
          <option value="Installed">Installed</option>
          <option value="Not Installed">Not Installed</option>
        </select>

        <select
          value={qaFilter}
          onChange={(e) => setQaFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-400"
        >
          <option value="">All QA Status</option>
          <option value="Approved">Approved</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Not Started">Not Started</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {/* Table View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800 select-none">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={cablesList.length > 0 && selectedIds.length === cablesList.length}
                    onChange={toggleSelectAll}
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Cable ID</th>
                <th className="py-3 px-3">From → To</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">System & Type</th>
                <th className="py-3 px-3">Length</th>
                <th className="py-3 px-3">Installed</th>
                <th className="py-3 px-3">Terminated</th>
                <th className="py-3 px-3">Tested</th>
                <th className="py-3 px-3">QA Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    Loading cables...
                  </td>
                </tr>
              ) : cablesList.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    No cables found matching search parameters.
                  </td>
                </tr>
              ) : (
                cablesList.map((cable) => {
                  const isChecked = selectedIds.includes(cable.id);
                  return (
                    <tr
                      key={cable.id}
                      className={`hover:bg-slate-850 transition-colors ${
                        isChecked ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(cable.id)}
                          className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-400">
                        {cable.cableId}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-200">
                        <span className="text-amber-400 font-bold">{cable.fromEquipmentCode}</span>
                        <span className="text-slate-500 mx-1">→</span>
                        <span className="text-amber-400 font-bold">{cable.toEquipmentCode}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {cable.locationName || 'Switch Room 01'}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div>{cable.cableType}</div>
                        <div className="text-[10px] text-slate-400">{cable.system}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">{cable.length}m</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cable.installationStatus === 'Installed'
                              ? 'bg-blue-950 text-blue-400 border border-blue-900'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cable.installationStatus === 'Installed' ? '✓ Installed' : 'Not Pulled'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cable.terminationStatus === 'Terminated'
                              ? 'bg-indigo-950 text-indigo-400 border border-indigo-900'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cable.terminationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cable.testingStatus === 'Tested'
                              ? 'bg-amber-950 text-amber-400 border border-amber-900'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cable.testingStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            cable.qaStatus === 'Approved'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : cable.qaStatus === 'Pending Review'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {cable.qaStatus}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => setSelectedCableId(cable.id)}
                          className="text-amber-400 hover:text-amber-300 font-bold text-xs"
                        >
                          Open →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {cablesList.length} of {pagination.total} project records
          </div>
          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-200"
            >
              Previous
            </button>
            <span className="font-mono text-slate-300">
              Page {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* BULK ITR GENERATION MODAL */}
      {isBulkItrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Bulk Generate Inspections (ITRs)</h3>
            <p className="text-xs text-slate-400 mb-4">
              Generate inspection records for {selectedIds.length} selected cables. Names will be automatically formatted per project standard.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Choose Inspection Templates:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {templates.map((tpl) => {
                    const isChecked = selectedTemplateIds.includes(tpl.id);
                    return (
                      <label
                        key={tpl.id}
                        className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/40 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() =>
                            setSelectedTemplateIds((prev) =>
                              prev.includes(tpl.id)
                                ? prev.filter((id) => id !== tpl.id)
                                : [...prev, tpl.id]
                            )
                          }
                          className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0"
                        />
                        <div className="text-xs">
                          <span className="font-mono font-bold text-amber-400 mr-2">{tpl.code}</span>
                          <span className="font-bold">{tpl.title}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Automatic Naming Preview */}
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Preview ({selectedIds.length * selectedTemplateIds.length} ITRs will be created):
                </div>
                <div className="font-mono text-slate-300 text-[11px] space-y-0.5">
                  <div>CB-L02-UT01-001 — Cable Installation & Routing Inspection</div>
                  <div>CB-L02-UT01-001 — LV Cable Insulation Resistance Test</div>
                  <div>CB-L02-UT01-002 — Cable Installation & Routing Inspection</div>
                  <div className="text-slate-500 italic">...and remaining cables</div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setIsBulkItrModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  disabled={selectedTemplateIds.length === 0}
                  onClick={handleBulkGenerateItrs}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  Generate {selectedIds.length * selectedTemplateIds.length} ITRs
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSV IMPORT WIZARD MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Import Cable Schedule Spreadsheet</h3>
                <p className="text-xs text-slate-400">
                  Step {importStep === 'upload' ? '1: Upload' : importStep === 'mapping' ? '2: Column Mapping' : '3: Validate & Diff'}
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {/* STEP 1: Upload */}
              {importStep === 'upload' && (
                <div className="space-y-4 text-center py-6">
                  <div className="border-2 border-dashed border-slate-700 rounded-2xl p-8 bg-slate-950/40">
                    <FileSpreadsheet className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-white mb-1">Select Excel / CSV Cable Schedule</h4>
                    <p className="text-xs text-slate-400 mb-4">
                      Upload .csv file with columns for Cable ID, From, To, Type, and Length.
                    </p>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileUpload}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:uppercase file:bg-amber-500 file:text-slate-950 hover:file:bg-amber-400 cursor-pointer"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleUseSampleSpreadsheet}
                      className="text-xs text-amber-400 hover:underline font-semibold"
                    >
                      Or load Sample "IFC Rev C Cable Schedule (5 cables)" to test
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: Column Mapping */}
              {importStep === 'mapping' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-300">
                    Map columns from spreadsheet ({rawCsvData.length} rows loaded) to MAXIM FORGE records:
                  </p>

                  <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-xs">
                    <div>
                      <label className="block font-bold text-slate-400 mb-1">Cable ID *</label>
                      <select
                        value={columnMapping.cableId}
                        onChange={(e) => setColumnMapping({ ...columnMapping, cableId: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-400 mb-1">From Equipment *</label>
                      <select
                        value={columnMapping.fromEquipment}
                        onChange={(e) => setColumnMapping({ ...columnMapping, fromEquipment: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-400 mb-1">To Equipment *</label>
                      <select
                        value={columnMapping.toEquipment}
                        onChange={(e) => setColumnMapping({ ...columnMapping, toEquipment: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-400 mb-1">Cable Type</label>
                      <select
                        value={columnMapping.cableType}
                        onChange={(e) => setColumnMapping({ ...columnMapping, cableType: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-400 mb-1">Length</label>
                      <select
                        value={columnMapping.length}
                        onChange={(e) => setColumnMapping({ ...columnMapping, length: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-400 mb-1">Responsible Company</label>
                      <select
                        value={columnMapping.responsibleCompany}
                        onChange={(e) => setColumnMapping({ ...columnMapping, responsibleCompany: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                      >
                        <option value="">Select column...</option>
                        {csvHeaders.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => setImportStep('upload')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleValidateAndPreview}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider"
                    >
                      Validate & Preview Diff →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Validate & Diff Preview */}
              {importStep === 'preview' && previewResult && (
                <div className="space-y-4">
                  {/* Summary Badges */}
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-3 bg-blue-950/50 border border-blue-900 rounded-xl">
                      <div className="text-lg font-black text-blue-400">{previewResult.summary.newCount}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-300">New Cables</div>
                    </div>
                    <div className="p-3 bg-amber-950/50 border border-amber-900 rounded-xl">
                      <div className="text-lg font-black text-amber-400">{previewResult.summary.updatesCount}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-300">Updates</div>
                    </div>
                    <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                      <div className="text-lg font-black text-slate-300">{previewResult.summary.duplicatesCount}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-300">Duplicates</div>
                    </div>
                    <div className="p-3 bg-rose-950/50 border border-rose-900 rounded-xl">
                      <div className="text-lg font-black text-rose-400">{previewResult.summary.errorsCount}</div>
                      <div className="text-[10px] uppercase font-bold text-slate-300">Errors</div>
                    </div>
                  </div>

                  {/* Updates with Current vs Import diff (User requirement!) */}
                  {previewResult.updates.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                        Changes to Existing Cables (Review Diffs):
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {previewResult.updates.map((up: any) => (
                          <div key={up.cableId} className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 text-xs">
                            <div className="font-mono font-bold text-white">{up.cableId}</div>
                            {Object.entries(up.changes).map(([field, diff]: [string, any]) => (
                              <div key={field} className="text-[11px] mt-1 flex items-center space-x-2">
                                <span className="capitalize text-slate-400">{field}:</span>
                                <span className="line-through text-rose-400 font-mono">{diff.current}</span>
                                <span>→</span>
                                <span className="text-emerald-400 font-bold font-mono">{diff.proposed}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* New Cables Preview */}
                  {previewResult.newRecords.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                        New Cables to Insert ({previewResult.newRecords.length}):
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1">
                        {previewResult.newRecords.map((r: any) => (
                          <div key={r.cableId} className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs flex justify-between">
                            <span className="font-mono text-blue-300 font-bold">{r.cableId}</span>
                            <span className="text-slate-400">{r.fromEquipmentCode} → {r.toEquipmentCode}</span>
                            <span className="font-mono text-slate-300">{r.length}m</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                    <button
                      onClick={() => setImportStep('mapping')}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ← Back to Mapping
                    </button>
                    <button
                      disabled={importing || previewResult.summary.errorsCount > 0}
                      onClick={handleCommitImport}
                      className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                    >
                      {importing ? 'Importing...' : 'Confirm & Commit Import'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE SINGLE CABLE MODAL */}
      {isNewCableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Add Project Cable</h3>
            <p className="text-xs text-slate-400 mb-4">
              Register a new cable link into the DC Melbourne 02 schedule.
            </p>

            <form onSubmit={handleCreateCable} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Cable ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CB-L02-UT01-010"
                  value={newCableId}
                  onChange={(e) => setNewCableId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    From Equipment *
                  </label>
                  <input
                    type="text"
                    required
                    value={newFromEq}
                    onChange={(e) => setNewFromEq(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    To Equipment *
                  </label>
                  <input
                    type="text"
                    required
                    value={newToEq}
                    onChange={(e) => setNewToEq(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Cable Type
                  </label>
                  <input
                    type="text"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Length (m)
                  </label>
                  <input
                    type="number"
                    value={newLength}
                    onChange={(e) => setNewLength(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewCableModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  Save Cable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
