import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Search,
  X,
  Cpu,
  Cable,
  ClipboardCheck,
  MapPin,
  AlertTriangle,
  ArrowRight,
  FileText,
} from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    apiFetch,
    setSelectedEquipmentId,
    setSelectedCableId,
    setSelectedItrId,
    setActiveTab,
  } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    equipment: any[];
    cables: any[];
    itrs: any[];
    locations: any[];
    issues: any[];
    drawings: any[];
  }>({
    equipment: [],
    cables: [],
    itrs: [],
    locations: [],
    issues: [],
    drawings: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen]);

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults({ equipment: [], cables: [], itrs: [], locations: [], issues: [], drawings: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults({
            equipment: data.equipment || [],
            cables: data.cables || [],
            itrs: data.itrs || [],
            locations: data.locations || [],
            issues: data.issues || [],
            drawings: data.drawings || [],
          });
        }
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isSearchModalOpen) return null;

  const totalResults =
    results.equipment.length +
    results.cables.length +
    results.itrs.length +
    results.locations.length +
    results.issues.length +
    results.drawings.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-amber-400 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Cable IDs, Equipment (e.g. UT-01), ITRs, Locations..."
            className="w-full bg-transparent text-white placeholder-slate-400 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-white p-1 rounded mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsSearchModalOpen(false)}
            className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 bg-slate-800 border border-slate-700 rounded-md"
          >
            ESC
          </button>
        </div>

        {/* Results Container */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1">
          {loading && <div className="text-center py-6 text-sm text-slate-400">Searching project records...</div>}

          {!loading && query.length >= 2 && totalResults === 0 && (
            <div className="text-center py-8">
              <div className="text-slate-400 font-medium text-sm">No matching records found for "{query}"</div>
              <div className="text-slate-400 text-xs mt-1">
                Try searching for 'UT-01', 'MSB-01', 'CB-L02', 'Insulation', or 'Switch Room'.
              </div>
            </div>
          )}

          {/* EQUIPMENT GROUP */}
          {results.equipment.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5 mb-2">
                <Cpu className="w-3.5 h-3.5" />
                <span>Equipment ({results.equipment.length})</span>
              </div>
              <div className="space-y-1">
                {results.equipment.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedEquipmentId(item.id);
                      setActiveTab('equipment');
                      setIsSearchModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors border border-transparent hover:border-slate-700 group"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-amber-400 text-sm">{item.equipmentCode}</span>
                        <span className="text-xs text-slate-200 font-medium">{item.equipmentName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {item.equipmentType} • {item.system} • {item.responsibleCompany}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* CABLES GROUP */}
          {results.cables.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center space-x-1.5 mb-2">
                <Cable className="w-3.5 h-3.5" />
                <span>Cables ({results.cables.length})</span>
              </div>
              <div className="space-y-1">
                {results.cables.map((cable) => (
                  <button
                    key={cable.id}
                    onClick={() => {
                      setSelectedCableId(cable.id);
                      setActiveTab('cables');
                      setIsSearchModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors border border-transparent hover:border-slate-700 group"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-blue-400 text-sm">{cable.cableId}</span>
                        <span className="text-xs text-slate-300 font-mono">
                          {cable.fromEquipmentCode} → {cable.toEquipmentCode}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                            cable.qaStatus === 'Approved'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : cable.qaStatus === 'Pending Review'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          QA: {cable.qaStatus}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {cable.cableType} • {cable.length}m • {cable.responsibleCompany}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ITRS GROUP */}
          {results.itrs.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5 mb-2">
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>ITR Inspections ({results.itrs.length})</span>
              </div>
              <div className="space-y-1">
                {results.itrs.map((itr) => (
                  <button
                    key={itr.id}
                    onClick={() => {
                      setSelectedItrId(itr.id);
                      setActiveTab('itrs');
                      setIsSearchModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors border border-transparent hover:border-slate-700 group"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-purple-400 text-xs">{itr.itrNumber}</span>
                        <span className="text-xs text-slate-200 font-medium">{itr.templateTitle}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {itr.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Target: {itr.targetType} ({itr.targetCode})
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* LOCATIONS GROUP */}
          {results.locations.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>Locations ({results.locations.length})</span>
              </div>
              <div className="space-y-1">
                {results.locations.map((loc) => (
                  <button
                    key={loc.id}
                    onClick={() => {
                      setActiveTab('locations');
                      setIsSearchModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors border border-transparent hover:border-slate-700 group"
                  >
                    <div>
                      <div className="text-xs text-slate-200 font-bold">{loc.name}</div>
                      <div className="text-[11px] text-slate-400">{loc.path}</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ISSUES GROUP */}
          {results.issues.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center space-x-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Issues & Defects ({results.issues.length})</span>
              </div>
              <div className="space-y-1">
                {results.issues.map((iss) => (
                  <button
                    key={iss.id}
                    onClick={() => {
                      setActiveTab('issues');
                      setIsSearchModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors border border-transparent hover:border-slate-700 group"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-rose-400 text-xs">{iss.issueNumber}</span>
                        <span className="text-xs text-slate-200 font-medium">{iss.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Priority: {iss.priority} • Status: {iss.status}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DRAWINGS GROUP */}
          {results.drawings && results.drawings.length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center space-x-1.5 mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Drawings & CAD Sheets ({results.drawings.length})</span>
              </div>
              <div className="space-y-1">
                {results.drawings.map((dwg) => (
                  <button
                    key={dwg.id}
                    onClick={() => {
                      setActiveTab('maps');
                      setIsSearchModalOpen(false);
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-left transition-colors border border-transparent hover:border-slate-700 group"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-cyan-400 text-xs">{dwg.drawingNumber}</span>
                        <span className="text-xs text-slate-200 font-medium">{dwg.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Discipline: {dwg.discipline} • {dwg.revision} ({dwg.status})
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-slate-950/60 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span>Quick search: <strong className="text-slate-300">UT-01</strong>, <strong className="text-slate-300">CB-L02</strong>, <strong className="text-slate-300">Switch Room</strong></span>
          </div>
          <div>Press ESC to close</div>
        </div>
      </div>
    </div>
  );
};
