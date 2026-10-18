import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  TrendingUp,
  Search,
  Plus,
  ArrowRight,
  Filter,
  CheckCircle2,
  XCircle,
  Zap,
} from 'lucide-react';
import { TestReading } from '../types/index.ts';

export const TestingView: React.FC = () => {
  const { apiFetch, addToast, activeProject, setSelectedCableId, setActiveTab } = useApp();

  const [readingsList, setReadingsList] = useState<TestReading[]>([]);
  const [testTypeFilter, setTestTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Test Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formCableId, setFormCableId] = useState<number>(1);
  const [formTestType, setFormTestType] = useState('Insulation Resistance');
  const [formPhase, setFormPhase] = useState('L1-E');
  const [formReading, setFormReading] = useState('1000');
  const [formUnit, setFormUnit] = useState('MΩ');
  const [formVoltage, setFormVoltage] = useState('1000V DC');
  const [formResult, setFormResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [formNotes, setFormNotes] = useState('');
  const [cablesList, setCablesList] = useState<any[]>([]);

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/test-readings?testType=${testTypeFilter}`);
      if (res.ok) {
        const data = await res.json();
        setReadingsList(data);
      }
      const cbRes = await apiFetch('/api/cables');
      if (cbRes.ok) {
        const cbData = await cbRes.json();
        setCablesList(cbData.data || []);
      }
    } catch (err) {
      console.error('Failed to load readings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
  }, [testTypeFilter, activeProject]);

  const handleCreateReading = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/test-readings', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          cableId: formCableId,
          testType: formTestType,
          phase: formPhase,
          reading: parseFloat(formReading) || 0,
          unit: formUnit,
          testVoltage: formVoltage,
          result: formResult,
          notes: formNotes,
        }),
      });

      if (res.ok) {
        addToast('success', 'Test Reading Added', `${formPhase}: ${formReading} ${formUnit} (${formResult})`);
        setIsModalOpen(false);
        await fetchReadings();
      }
    } catch {
      addToast('error', 'Error', 'Failed to save test reading');
    }
  };

  const filtered = readingsList.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      return (
        r.testType.toLowerCase().includes(q) ||
        r.phase.toLowerCase().includes(q) ||
        (r.cableCode && r.cableCode.toLowerCase().includes(q)) ||
        (r.testedBy && r.testedBy.toLowerCase().includes(q))
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
            <TrendingUp className="w-6 h-6 text-amber-400" />
            <span>Structured Electrical Testing Register</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Insulation Resistance (IR), low-resistance continuity, high potential, and earth bonding test records.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Test Record</span>
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
            placeholder="Search test type, phase (e.g. L1-E), or cable ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-400"
          />
        </div>

        <select
          value={testTypeFilter}
          onChange={(e) => setTestTypeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">All Test Types</option>
          <option value="Insulation Resistance">Insulation Resistance (IR)</option>
          <option value="Continuity">Continuity</option>
          <option value="Hi-Pot">Hi-Pot</option>
          <option value="Earth Bond">Earth Bond</option>
        </select>
      </div>

      {/* Table View */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-3">Test Type</th>
                <th className="py-3 px-3">Associated Cable</th>
                <th className="py-3 px-3">Phase / Core</th>
                <th className="py-3 px-3">Reading Value</th>
                <th className="py-3 px-3">Test Voltage</th>
                <th className="py-3 px-3">Result</th>
                <th className="py-3 px-3">Tester</th>
                <th className="py-3 px-3">Test Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading readings...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No structured test readings found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-850 transition-colors">
                    <td className="py-3 px-3 font-bold text-white flex items-center space-x-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{item.testType}</span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-400">
                      {item.cableCode ? (
                        <button
                          onClick={() => {
                            if (item.cableId) {
                              setSelectedCableId(item.cableId);
                              setActiveTab('cables');
                            }
                          }}
                          className="hover:underline"
                        >
                          {item.cableCode}
                        </button>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-amber-300">
                      {item.phase}
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-white text-sm">
                      {item.reading} <span className="text-xs text-slate-400 font-normal">{item.unit}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {item.testVoltage || '1000V DC'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          item.result === 'PASS'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {item.result}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-300">{item.testedBy}</td>
                    <td className="py-3 px-3 font-mono text-slate-400 text-[11px]">
                      {item.testDate}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Reading Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-1">Add Electrical Test Reading</h3>
            <p className="text-xs text-slate-400 mb-4">
              Record a structured reading against a cable.
            </p>

            <form onSubmit={handleCreateReading} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Select Cable *
                </label>
                <select
                  value={formCableId}
                  onChange={(e) => setFormCableId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {cablesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cableId} ({c.fromEquipmentCode} → {c.toEquipmentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Test Type
                  </label>
                  <select
                    value={formTestType}
                    onChange={(e) => setFormTestType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Insulation Resistance">Insulation Resistance</option>
                    <option value="Continuity">Continuity</option>
                    <option value="Hi-Pot">Hi-Pot</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Phase / Core *
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhase}
                    onChange={(e) => setFormPhase(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Reading *
                  </label>
                  <input
                    type="number"
                    required
                    value={formReading}
                    onChange={(e) => setFormReading(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Unit
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="MΩ">MΩ</option>
                    <option value="GΩ">GΩ</option>
                    <option value="Ω">Ω</option>
                    <option value="kV">kV</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Result
                  </label>
                  <select
                    value={formResult}
                    onChange={(e) => setFormResult(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="PASS">PASS</option>
                    <option value="FAIL">FAIL</option>
                  </select>
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
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider shadow-md"
                >
                  Save Reading
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
