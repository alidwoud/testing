import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Filter,
  Calendar,
  Clock,
  Sparkles,
  Building,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import {
  buildDailyLabourExportPayload,
  generateDailyLabourWorkbook,
  generateDailyLabourPdf,
  generateDailyLabourPrintHtml,
  getStandardFilename,
} from '../../lib/dailyLabourExportService.ts';

interface DailyLabourExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  shift: string;
  dataMode: 'PLANNED' | 'ACTUAL';
  boardData: any;
  filteredPersonRows: any[];
  searchQuery: string;
  tradeFilter: string;
}

export const DailyLabourExportModal: React.FC<DailyLabourExportModalProps> = ({
  isOpen,
  onClose,
  date,
  shift,
  dataMode: initialDataMode,
  boardData,
  filteredPersonRows,
  searchQuery,
  tradeFilter,
}) => {
  const { activeProject, addToast } = useApp();

  const [scope, setScope] = useState<'FULL' | 'FILTERED'>('FULL');
  const [dataMode, setDataMode] = useState<'PLANNED' | 'ACTUAL'>(initialDataMode);
  const [showRawCsv, setShowRawCsv] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  if (!isOpen) return null;

  const projectCode = activeProject?.code || 'MEL02';
  const projectName = activeProject?.name || 'DC Melbourne 02';

  const filterDescription = [
    tradeFilter !== 'All' ? `Trade: ${tradeFilter}` : null,
    searchQuery.trim() ? `Search: "${searchQuery}"` : null,
  ]
    .filter(Boolean)
    .join(', ') || 'Active View';

  // Construct export payload on the fly
  const getPayload = () => {
    return buildDailyLabourExportPayload({
      project: {
        id: activeProject?.id,
        name: projectName,
        code: projectCode,
      },
      date,
      shift,
      dataMode,
      boardData,
      scope,
      filteredPersonRows,
      filterDescription,
    });
  };

  // 1. Export Excel (.XLSX)
  const handleExportXlsx = async () => {
    setIsExporting('xlsx');
    try {
      const payload = getPayload();
      const workbook = await generateDailyLabourWorkbook(payload);
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = getStandardFilename(projectCode, date, shift, dataMode, 'xlsx', scope);

      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast('success', 'Excel Export Ready', `Downloaded formatted spreadsheet: ${filename}`);
      onClose();
    } catch (err: any) {
      console.error('XLSX export error:', err);
      addToast('error', 'Export Failed', err.message || 'Could not generate Excel workbook');
    } finally {
      setIsExporting(null);
    }
  };

  // 2. Export PDF
  const handleExportPdf = async () => {
    setIsExporting('pdf');
    try {
      const payload = getPayload();
      const doc = await generateDailyLabourPdf(payload);
      const filename = getStandardFilename(projectCode, date, shift, dataMode, 'pdf', scope);

      doc.save(filename);

      addToast('success', 'PDF Export Ready', `Downloaded presentation PDF: ${filename}`);
      onClose();
    } catch (err: any) {
      console.error('PDF export error:', err);
      addToast('error', 'Export Failed', err.message || 'Could not generate PDF');
    } finally {
      setIsExporting(null);
    }
  };

  // 3. Print Daily Labour Sheet
  const handlePrint = () => {
    try {
      const payload = getPayload();
      const printHtml = generateDailyLabourPrintHtml(payload);

      // Create invisible iframe for clean print dialog execution without popup blockers
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(printHtml);
        doc.close();
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }, 400);
      }

      addToast('info', 'Print View Ready', 'Prepared Daily Labour Sheet for printing.');
      onClose();
    } catch (err: any) {
      console.error('Print error:', err);
      addToast('error', 'Print Error', err.message || 'Could not prepare print view');
    }
  };

  // 4. Raw CSV Fallback
  const handleRawCsv = () => {
    try {
      const p = getPayload();
      const filename = getStandardFilename(projectCode, date, shift, dataMode, 'csv', scope);
      const rows: string[][] = [
        ['MAXIM FORGE — DAILY LABOUR SHEET (RAW DATA)'],
        [`Project: ${p.project.name} (${p.project.code})`, `Date: ${p.formattedDate}`, `Shift: ${p.shift}`, `Mode: ${p.dataMode}`],
        [],
        ['Area / Zone', 'Workstream', 'Employee ID', 'Worker Name', 'Trade / Role', 'Company', 'Crew', 'Hours', 'Attendance / Status', 'Supervisor', 'Notes / Mid-Shift Transfer'],
      ];

      p.areas.forEach((area) => {
        area.workstreams.forEach((ws) => {
          ws.workers.forEach((w) => {
            rows.push([
              area.code,
              ws.name,
              w.employeeId,
              w.workerName,
              w.tradeRole,
              w.companyName,
              w.crewName,
              w.hours,
              w.attendance,
              w.supervisor,
              (w.notes || '').replace(/,/g, ';'),
            ]);
          });
        });
      });

      // Special sections in CSV
      p.specialSections.unallocated.forEach((u) => {
        rows.push(['UNALLOCATED', 'Unallocated', u.employeeId, u.workerName, u.tradeRole, u.companyName, '—', '—', u.statusOrReason, '—', u.notes || '—']);
      });
      p.specialSections.unavailable.forEach((u) => {
        rows.push(['UNAVAILABLE', 'Unavailable', u.employeeId, u.workerName, u.tradeRole, u.companyName, '—', '—', u.statusOrReason, '—', u.notes || '—']);
      });
      p.specialSections.onLeave.forEach((u) => {
        rows.push(['ON_LEAVE', 'On Leave', u.employeeId, u.workerName, u.tradeRole, u.companyName, '—', '—', u.statusOrReason, '—', u.notes || '—']);
      });

      const csvContent = '\uFEFF' + rows.map((r) => r.map((c) => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addToast('success', 'CSV Export Ready', `Downloaded raw data CSV: ${filename}`);
      onClose();
    } catch (err: any) {
      addToast('error', 'CSV Error', err.message);
    }
  };

  const samplePayload = getPayload();
  const estimatedWorkers =
    scope === 'FILTERED' && filteredPersonRows
      ? filteredPersonRows.length
      : samplePayload.summary.totalWorkforce;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-900 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black shadow-inner shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                  EXPORT & SHARE LABOUR
                </span>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  {projectCode}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-0.5">
                Daily Labour Sheet
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Active Context Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                <Building className="w-3.5 h-3.5 text-amber-600" />
                <span>{projectName}</span>
              </div>
              <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{samplePayload.formattedDate}</span>
              </div>
              <div className="flex items-center space-x-1.5 font-bold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{shift}</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
              {samplePayload.status.toUpperCase()}
            </span>
          </div>

          {/* 1. Export Scope Selection */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              Export Scope
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setScope('FULL')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  scope === 'FULL'
                    ? 'border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  scope === 'FULL' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Full Daily Labour</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Entire site roster ({samplePayload.summary.totalWorkforce} workers across all areas)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('FILTERED')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  scope === 'FILTERED'
                    ? 'border-amber-500 bg-amber-50/30 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  scope === 'FILTERED' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-100 text-slate-600'
                }`}>
                  <Filter className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs">Current Filtered View</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[220px]">
                    {filteredPersonRows.length} workers matching {filterDescription}
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Data Mode Toggle (Planned vs Actual) */}
          <div className="space-y-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              Data Perspective
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 font-bold text-xs">
              <button
                type="button"
                onClick={() => setDataMode('PLANNED')}
                className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
                  dataMode === 'PLANNED'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Planned Allocations (07:00–15:30)
              </button>
              <button
                type="button"
                onClick={() => setDataMode('ACTUAL')}
                className={`py-2 rounded-xl transition-all cursor-pointer text-center ${
                  dataMode === 'ACTUAL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Actual / Muster Attendance
              </button>
            </div>
          </div>

          {/* 3. Primary Export Actions */}
          <div className="space-y-2 pt-2">
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-700">
              Professional Export Formats
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Card 1: Excel (.XLSX) */}
              <button
                type="button"
                onClick={handleExportXlsx}
                disabled={Boolean(isExporting)}
                className="p-4 rounded-2xl border-2 border-emerald-600/30 hover:border-emerald-600 bg-emerald-50/30 hover:bg-emerald-50/70 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs disabled:opacity-50"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="font-black text-sm text-slate-900">
                    EXPORT EXCEL (.XLSX)
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Formatted workbook with Area/Workstream hierarchy, freeze panes, print setup & KPI cards.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[10px] font-bold text-emerald-800 font-mono">
                  <span>.XLSX WORKBOOK</span>
                  <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </div>
              </button>

              {/* Card 2: PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={Boolean(isExporting)}
                className="p-4 rounded-2xl border-2 border-rose-600/30 hover:border-rose-600 bg-rose-50/30 hover:bg-rose-50/70 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs disabled:opacity-50"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="font-black text-sm text-slate-900">
                    EXPORT PDF
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Clean A4 landscape presentation document for email, Teams, project meetings & daily site briefings.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-rose-200/60 flex items-center justify-between text-[10px] font-bold text-rose-800 font-mono">
                  <span>A4 LANDSCAPE PDF</span>
                  <Download className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </div>
              </button>

              {/* Card 3: Print */}
              <button
                type="button"
                onClick={handlePrint}
                disabled={Boolean(isExporting)}
                className="p-4 rounded-2xl border-2 border-slate-700/30 hover:border-slate-900 bg-slate-50 hover:bg-slate-100 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs disabled:opacity-50"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center mb-3 shadow-sm group-hover:scale-105 transition-transform">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div className="font-black text-sm text-slate-900">
                    PRINT LABOUR SHEET
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Dedicated print layout with page breaks, Area tables, and high-contrast styling for hardcopy printing.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-800 font-mono">
                  <span>PRINT DIALOG</span>
                  <Printer className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
                </div>
              </button>
            </div>
          </div>

          {/* 4. More / Raw Data Collapsible */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowRawCsv(!showRawCsv)}
              className="w-full flex items-center justify-between text-slate-500 hover:text-slate-800 py-1.5 font-bold text-[11px] cursor-pointer"
            >
              <span>MORE / RAW DATA (LEGACY EXPORTS)</span>
              {showRawCsv ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showRawCsv && (
              <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800 text-xs">Raw CSV Export</div>
                  <div className="text-[10px] text-slate-500">Unformatted tabular CSV data dump for external ingestion.</div>
                </div>
                <button
                  type="button"
                  onClick={handleRawCsv}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <Download className="w-3 h-3" />
                  <span>Download CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center space-x-1.5">
            <Info className="w-4 h-4 text-slate-400" />
            <span>Target: <strong>{estimatedWorkers}</strong> workers in <strong>{samplePayload.areas.length}</strong> areas</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
