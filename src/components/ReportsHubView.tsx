import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  TrendingUp,
  Users,
  ClipboardCheck,
  Activity,
  AlertTriangle,
  Download,
  Printer,
  Compass,
  ArrowRight,
  FileText,
  BarChart3,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Breadcrumbs } from './Breadcrumbs.tsx';

export const ReportsHubView: React.FC = () => {
  const { activeProject, setActiveTab, stats, addToast } = useApp();
  const [selectedReport, setSelectedReport] = useState<string>('progress');

  const handleExport = (reportName: string) => {
    addToast('success', 'Report Exported', `Generated ${reportName} (CSV).`);
  };

  const handlePrint = (reportName: string) => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Breadcrumbs />

      {/* Header Banner */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-amber-400">
            EXECUTIVE & DELIVERY REPORTS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            Project Intelligence & Reporting
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Audit-ready progress metrics, labour productivity, QA inspection velocity and handover compliance for {activeProject?.name}.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => handleExport('Master Project Report')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Export Master CSV</span>
          </button>
        </div>
      </div>

      {/* Report Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Report 1: Project Progress */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                78% Physical Completion
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Project Progress & Milestones</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Stage 2 Electrical Fitout tracking against principal contractor program schedule.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={() => handleExport('Project Progress')}
              className="text-amber-400 font-bold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => setActiveTab('home')}
              className="text-slate-400 hover:text-white font-semibold flex items-center space-x-1"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Report 2: Workforce & Labour Hours */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg">
                65 Personnel Allocated
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Workforce Productivity & Hours</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Planned vs actual muster, absent, transfer variances, trade hours and subcontractor allocations.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={() => handleExport('Workforce Productivity')}
              className="text-amber-400 font-bold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Timesheets</span>
            </button>
            <button
              onClick={() => setActiveTab('workforce')}
              className="text-slate-400 hover:text-white font-semibold flex items-center space-x-1"
            >
              <span>Open Workforce</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Report 3: QA & Inspection Status */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                94% QA Pass Rate
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Quality & Inspection Signoffs</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              ITR completion status, witness signatures, approval velocity and contractor compliance.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={() => handleExport('QA Signoffs')}
              className="text-amber-400 font-bold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export ITR Log</span>
            </button>
            <button
              onClick={() => setActiveTab('itrs')}
              className="text-slate-400 hover:text-white font-semibold flex items-center space-x-1"
            >
              <span>View QA</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Report 4: Testing & Commissioning */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-bold text-purple-300 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded-lg">
                8 Circuits Tested
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Testing & Measurements</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Megger 1000V insulation resistance logs, torque witness seals and earth continuity records.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={() => handleExport('Test Readings')}
              className="text-amber-400 font-bold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Readings</span>
            </button>
            <button
              onClick={() => setActiveTab('testing')}
              className="text-slate-400 hover:text-white font-semibold flex items-center space-x-1"
            >
              <span>View Testing</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Report 5: Issues & Punchlist */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-bold text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                {stats?.openIssues || 2} Open Defects
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Defect & Punchlist Closeout</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Open issues, corrective action turnaround time, rectification proof and subcontractor assignments.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={() => handleExport('Defect Register')}
              className="text-amber-400 font-bold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Issues</span>
            </button>
            <button
              onClick={() => setActiveTab('issues')}
              className="text-slate-400 hover:text-white font-semibold flex items-center space-x-1"
            >
              <span>View Issues</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Report 6: Handover & Commissioning Readiness */}
        <div className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 sm:p-6 transition-all shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center">
                <Compass className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-bold text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2 py-0.5 rounded-lg">
                8 Stage Gates
              </span>
            </div>
            <h3 className="text-base font-bold text-white">Handover Readiness & Gates</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Comprehensive client handover verification gates, statutory certifications and asset tagging signoffs.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              onClick={() => handleExport('Handover Readiness')}
              className="text-amber-400 font-bold hover:underline flex items-center space-x-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Gates Log</span>
            </button>
            <button
              onClick={() => setActiveTab('readiness')}
              className="text-slate-400 hover:text-white font-semibold flex items-center space-x-1"
            >
              <span>View Readiness</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
