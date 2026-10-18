import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Cpu,
  Search,
  Filter,
  Plus,
  ArrowRight,
  ArrowLeft,
  Cable,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  History,
  QrCode,
  MapPin,
  CheckCircle2,
  Clock,
  Building,
} from 'lucide-react';
import { EquipmentItem } from '../types/index.ts';
import { AddItrModal } from './AddItrModal.tsx';

export const EquipmentView: React.FC = () => {
  const {
    apiFetch,
    selectedEquipmentId,
    setSelectedEquipmentId,
    setSelectedCableId,
    setSelectedItrId,
    setActiveTab,
    addToast,
    activeProject,
    setIsQrModalOpen,
  } = useApp();

  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [singleEquipment, setSingleEquipment] = useState<any | null>(null);
  const [activeObjectTab, setActiveObjectTab] = useState<
    'overview' | 'cables' | 'itrs' | 'testing' | 'issues' | 'history'
  >('overview');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAddItrOpen, setIsAddItrOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);

  // Create Equipment form
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('Substation Transformer');
  const [formSystem, setFormSystem] = useState('Electrical LV');
  const [formLocationId, setFormLocationId] = useState<number>(1);
  const [formManufacturer, setFormManufacturer] = useState('Schneider Electric');
  const [formModel, setFormModel] = useState('');
  const [formSerial, setFormSerial] = useState('');
  const [formCompany, setFormCompany] = useState('Apex Electrical Contractors');
  const [formDesc, setFormDesc] = useState('');

  const [loading, setLoading] = useState(true);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/equipment?search=${encodeURIComponent(search)}&status=${statusFilter}`);
      if (res.ok) {
        const data = await res.json();
        setEquipmentList(data);
      }
      const locRes = await apiFetch('/api/locations');
      if (locRes.ok) {
        const locData = await locRes.json();
        setLocations(locData.flat || []);
        if (locData.flat?.length > 0 && !formLocationId) {
          setFormLocationId(locData.flat[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load equipment:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSingleEquipment = async (id: number) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/equipment/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSingleEquipment(data);
      }
    } catch (err) {
      console.error('Failed to load equipment detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEquipmentId) {
      fetchSingleEquipment(selectedEquipmentId);
    } else {
      setSingleEquipment(null);
      fetchEquipment();
    }
  }, [selectedEquipmentId, search, statusFilter, activeProject]);

  const handleCreateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim() || !formLocationId) return;

    try {
      const res = await apiFetch('/api/equipment', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          equipmentCode: formCode.trim(),
          equipmentName: formName.trim(),
          equipmentType: formType,
          system: formSystem,
          locationId: Number(formLocationId),
          manufacturer: formManufacturer,
          model: formModel,
          serialNumber: formSerial,
          responsibleCompany: formCompany,
          description: formDesc,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        addToast('success', 'Equipment Created', `${created.equipmentCode} registered`);
        setIsCreateModalOpen(false);
        setFormCode('');
        setFormName('');
        setSelectedEquipmentId(created.id);
      } else {
        const err = await res.json();
        addToast('error', 'Creation Failed', err.error);
      }
    } catch {
      addToast('error', 'Network Error', 'Failed to register equipment');
    }
  };

  // If viewing a single equipment object page:
  if (selectedEquipmentId && singleEquipment) {
    const metrics = singleEquipment.metrics || {
      totalCables: 0,
      installedCables: 0,
      terminatedCables: 0,
      testedCables: 0,
      qaCompleteCables: 0,
      openIssues: 0,
      progressPercent: 0,
    };

    return (
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedEquipmentId(null)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Back to Equipment Register"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono font-bold text-amber-400">
                <span>{singleEquipment.equipmentCode}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-sans">{singleEquipment.system}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-sans">{singleEquipment.responsibleCompany}</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center space-x-2">
                <span>{singleEquipment.equipmentName}</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {singleEquipment.status}
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>QR Tag</span>
            </button>
          </div>
        </div>

        {/* Central Object Metric Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="border-r border-slate-800 pr-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Connected Cables
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {metrics.totalCables}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Feeders & Tails</div>
          </div>

          <div className="border-r border-slate-800 pr-3">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              Installed
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {metrics.installedCables}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pulled to board</div>
          </div>

          <div className="border-r border-slate-800 pr-3">
            <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Tested
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {metrics.testedCables}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">IR & Continuity</div>
          </div>

          <div className="border-r border-slate-800 pr-3">
            <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              QA Complete
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {metrics.qaCompleteCables}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Approved ITRs</div>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
              Open Defects
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {metrics.openIssues}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pending fix</div>
          </div>
        </div>

        {/* Object Page Tabs */}
        <div className="flex border-b border-slate-800 space-x-1 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'cables', label: `Cables (${singleEquipment.cables?.length || 0})` },
            { id: 'itrs', label: `ITRs (${singleEquipment.itrs?.length || 0})` },
            { id: 'testing', label: `Testing (${singleEquipment.testReadings?.length || 0})` },
            { id: 'issues', label: `Issues (${singleEquipment.issues?.length || 0})` },
            { id: 'history', label: 'History' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveObjectTab(t.id as any)}
              className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${
                activeObjectTab === t.id
                  ? 'border-amber-400 text-amber-400 bg-slate-900/40 rounded-t-lg'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
          {activeObjectTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Technical Specifications
                </h3>
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Equipment Code</span>
                    <span className="font-mono font-bold text-amber-400">{singleEquipment.equipmentCode}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Equipment Type</span>
                    <span className="text-white font-medium">{singleEquipment.equipmentType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">System</span>
                    <span className="text-white font-medium">{singleEquipment.system}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Manufacturer</span>
                    <span className="text-white font-medium">{singleEquipment.manufacturer || 'Schneider Electric'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">Model</span>
                    <span className="text-white font-medium">{singleEquipment.model || 'Trihal Cast Resin 2500kVA'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Serial Number</span>
                    <span className="font-mono text-slate-300">{singleEquipment.serialNumber || 'SN-TR-2026-9901'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Location & Description
                </h3>
                <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-1">Physical Location</span>
                    <div className="text-white font-semibold flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{singleEquipment.location?.path || 'Switch Room 01 (Level 02)'}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Responsible Contractor</span>
                    <span className="text-white font-semibold">{singleEquipment.responsibleCompany}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-1">Scope Description</span>
                    <p className="text-slate-300 leading-relaxed">
                      {singleEquipment.description || 'Step-down unit substation feeding Main Switchboard MSB-01.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeObjectTab === 'cables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Cables Connected to {singleEquipment.equipmentCode}
                </h3>
                <button
                  onClick={() => {
                    setActiveTab('cables');
                  }}
                  className="text-xs text-amber-400 hover:underline flex items-center space-x-1"
                >
                  <span>Open Full Cable Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {singleEquipment.cables?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No cables connected to this equipment yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Cable ID</th>
                        <th className="py-2.5 px-3">From → To</th>
                        <th className="py-2.5 px-3">Type & Size</th>
                        <th className="py-2.5 px-3">Length</th>
                        <th className="py-2.5 px-3">Installed</th>
                        <th className="py-2.5 px-3">Tested</th>
                        <th className="py-2.5 px-3">QA Status</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {singleEquipment.cables.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-850 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-400">
                            {c.cableId}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300">
                            {c.fromEquipmentCode} → {c.toEquipmentCode}
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{c.cableType}</td>
                          <td className="py-2.5 px-3 font-mono text-slate-400">{c.length}m</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.installationStatus === 'Installed'
                                  ? 'bg-blue-950 text-blue-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {c.installationStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.testingStatus === 'Tested'
                                  ? 'bg-amber-950 text-amber-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {c.testingStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                c.qaStatus === 'Approved'
                                  ? 'bg-emerald-950 text-emerald-400'
                                  : c.qaStatus === 'Pending Review'
                                  ? 'bg-amber-950 text-amber-400'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {c.qaStatus}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setSelectedCableId(c.id);
                                setActiveTab('cables');
                              }}
                              className="text-amber-400 hover:text-amber-300 font-bold text-[11px]"
                            >
                              Open Cable →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeObjectTab === 'itrs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Inspections & ITR Records</h3>
                  <p className="text-[11px] text-slate-400">Contextual quality checks, pre-commissioning, and witness marks</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddItrOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ ADD ITR</span>
                </button>
              </div>

              {singleEquipment.itrs?.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
                  <ClipboardCheck className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                  <p className="font-bold text-white text-xs">NO ITRs LINKED TO THIS EQUIPMENT</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Start a pre-commissioning checklist or select from standard equipment templates.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddItrOpen(true)}
                    className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center space-x-1.5 cursor-pointer shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ ADD FIRST ITR</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {singleEquipment.itrs.map((itr: any) => (
                    <div
                      key={itr.id}
                      onClick={() => {
                        setSelectedItrId(itr.id);
                        setActiveTab('itrs');
                      }}
                      className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-purple-400 font-bold text-xs">
                            {itr.itrNumber}
                          </span>
                          <span className="text-xs font-bold text-white">{itr.templateTitle}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                            {itr.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Assigned: {itr.assignedTo || 'Tradesperson'} • {itr.assignedCompany}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeObjectTab === 'testing' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Structured Electrical Test Readings</h3>
              {singleEquipment.testReadings?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No structured test readings recorded for this equipment.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Test Type</th>
                      <th className="py-2 px-3">Phase</th>
                      <th className="py-2 px-3">Reading</th>
                      <th className="py-2 px-3">Result</th>
                      <th className="py-2 px-3">Tester</th>
                      <th className="py-2 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {singleEquipment.testReadings.map((r: any) => (
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

          {activeObjectTab === 'issues' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">Associated Issues & Defects</h3>
              {singleEquipment.issues?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Zero open defects for this equipment.
                </div>
              ) : (
                <div className="space-y-2">
                  {singleEquipment.issues.map((iss: any) => (
                    <div
                      key={iss.id}
                      className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-rose-400 font-bold text-xs">{iss.issueNumber}</span>
                          <span className="text-xs font-bold text-white">{iss.title}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                            {iss.priority}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{iss.description}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-amber-400">{iss.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeObjectTab === 'history' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white">Audit Trail</h3>
              {singleEquipment.history?.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">No historical changes logged.</div>
              ) : (
                singleEquipment.history.map((log: any) => (
                  <div key={log.id} className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-xs">
                    <div className="flex justify-between font-bold text-slate-200">
                      <span>{log.action}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{new Date(log.createdAt).toLocaleString()}</span>
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

  // Otherwise: Equipment Register View
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center space-x-2.5">
            <Cpu className="w-6 h-6 text-amber-400" />
            <span>Equipment Register</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Major substation switchgear, transformers, boards, and PDUs. Open to view connected cables & ITRs.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Equipment</span>
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
            placeholder="Search equipment code (e.g. UT-01), name, manufacturer..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">All Statuses</option>
          <option value="Installed">Installed</option>
          <option value="Pre-Commissioning">Pre-Commissioning</option>
          <option value="Commissioned">Commissioned</option>
          <option value="QA Complete">QA Complete</option>
        </select>
      </div>

      {/* Equipment Register Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">Loading equipment...</div>
        ) : equipmentList.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">No equipment matching query.</div>
        ) : (
          equipmentList.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedEquipmentId(item.id)}
              className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-amber-400 text-base">
                    {item.equipmentCode}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {item.status}
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                  {item.equipmentName}
                </h3>

                <div className="text-xs text-slate-400 mt-1 flex items-center space-x-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.locationName || 'Switch Room 01'}</span>
                </div>

                <div className="mt-3.5 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span className="text-slate-300 font-medium">{item.equipmentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>System:</span>
                    <span className="text-slate-300 font-medium">{item.system}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vendor:</span>
                    <span className="text-slate-300 font-medium">{item.manufacturer || 'Schneider'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-semibold text-amber-400">
                <span>Open Object Page</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Equipment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Register New Equipment</h3>
            <p className="text-xs text-slate-400 mb-5">
              Add a new physical unit (e.g. UT-03, MSB-03) with location and specifications.
            </p>

            <form onSubmit={handleCreateEquipment} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Equipment Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. UT-03, MSB-03"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Equipment Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unit Substation 03"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Equipment Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Substation Transformer">Substation Transformer</option>
                    <option value="Main Switchboard">Main Switchboard</option>
                    <option value="Distribution Board">Distribution Board</option>
                    <option value="PDU">PDU</option>
                    <option value="UPS System">UPS System</option>
                    <option value="Generator">Generator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Location *
                  </label>
                  <select
                    value={formLocationId}
                    onChange={(e) => setFormLocationId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Manufacturer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Schneider Electric"
                    value={formManufacturer}
                    onChange={(e) => setFormManufacturer(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Trihal 2500kVA"
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Scope Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes on installation, plinth, feed details..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-md"
                >
                  Save Equipment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contextual ITR Creation Modal */}
      {singleEquipment && (
        <AddItrModal
          isOpen={isAddItrOpen}
          onClose={() => setIsAddItrOpen(false)}
          context={{
            targetType: 'Equipment',
            targetId: singleEquipment.id,
            targetCode: singleEquipment.equipmentTag,
            locationName: singleEquipment.locationName,
            discipline: singleEquipment.systemDiscipline || 'Electrical',
            responsibleCompany: singleEquipment.responsibleCompany,
          }}
          onItrCreated={(newItr) => {
            if (singleEquipment) {
              setSingleEquipment((prev: any) => ({
                ...prev,
                itrs: [newItr, ...(prev?.itrs || [])],
              }));
            }
            fetchEquipment();
          }}
        />
      )}
    </div>
  );
};
