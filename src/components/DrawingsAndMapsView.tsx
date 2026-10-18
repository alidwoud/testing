import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  FileText,
  Map,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  X,
  ExternalLink,
  Layers,
  ArrowRight,
  Eye,
  SlidersHorizontal,
  FileCheck,
} from 'lucide-react';
import { Drawing, SpatialPin, LocationNode } from '../types/index.ts';
import { InteractiveLevelMap } from './InteractiveLevelMap.tsx';

export const DrawingsAndMapsView: React.FC = () => {
  const { apiFetch, addToast, activeProject, currentUser, setActiveTab, setSelectedLocationId } = useApp();

  // Drawing Register is the primary experience
  const [activeSubTab, setActiveSubTab] = useState<'drawings' | 'maps'>('drawings');
  const [drawingsList, setDrawingsList] = useState<Drawing[]>([]);
  const [locationsList, setLocationsList] = useState<LocationNode[]>([]);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);

  // Filters & Search
  const [drawingSearch, setDrawingSearch] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('All');
  const [isUploadDrawingModalOpen, setIsUploadDrawingModalOpen] = useState(false);

  // New drawing form
  const [newDwgNumber, setNewDwgNumber] = useState('');
  const [newDwgTitle, setNewDwgTitle] = useState('');
  const [newDwgDiscipline, setNewDwgDiscipline] = useState('Electrical');
  const [newDwgRevision, setNewDwgRevision] = useState('Rev A');
  const [newDwgScale, setNewDwgScale] = useState('1:100');
  const [newDwgLevel, setNewDwgLevel] = useState('Level 02');

  const disciplines = [
    'All',
    'Electrical',
    'Architectural',
    'Mechanical',
    'Containment',
    'Security',
    'Fire',
  ];

  const loadDrawingsAndLocations = async () => {
    try {
      const dwgRes = await apiFetch(`/api/drawings`);
      if (dwgRes.ok) {
        const dwgs: Drawing[] = await dwgRes.json();
        setDrawingsList(dwgs);
        if (!selectedDrawing && dwgs.length > 0) {
          setSelectedDrawing(dwgs[0]);
        }
      }

      const locRes = await apiFetch('/api/locations');
      if (locRes.ok) {
        const data = await locRes.json();
        setLocationsList(data.flat || []);
      }
    } catch (err) {
      console.error('Failed to load drawing register:', err);
    }
  };

  useEffect(() => {
    loadDrawingsAndLocations();
  }, [activeProject]);

  // Navigate directly to Level Map in Locations
  const handleViewOnLevelMap = (dwg: Drawing) => {
    const levelLoc = locationsList.find(
      (l) => l.type === 'Level' && (l.name === dwg.levelName || l.id === dwg.locationId)
    ) || locationsList.find((l) => l.type === 'Level' && l.name === 'Level 02') || locationsList.find((l) => l.type === 'Level');

    if (levelLoc) {
      setSelectedLocationId(levelLoc.id);
    }
    setActiveTab('locations');
    addToast('info', 'Opening Physical Map', `Navigated to ${dwg.levelName || 'Level Floor Plan'}`);
  };

  // Filter drawings list
  const filteredDrawings = drawingsList.filter((dwg) => {
    const matchesSearch =
      dwg.drawingNumber.toLowerCase().includes(drawingSearch.toLowerCase()) ||
      dwg.title.toLowerCase().includes(drawingSearch.toLowerCase());
    const matchesDisc =
      selectedDiscipline === 'All' || dwg.discipline === selectedDiscipline;
    return matchesSearch && matchesDisc;
  });

  // Handle register new drawing
  const handleCreateDrawing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDwgNumber || !newDwgTitle) return;

    const matchedLevel = locationsList.find((l) => l.name === newDwgLevel && l.type === 'Level');

    const payload = {
      drawingNumber: newDwgNumber,
      title: newDwgTitle,
      discipline: newDwgDiscipline,
      revision: newDwgRevision,
      status: 'Issued for Construction',
      scale: newDwgScale,
      levelName: newDwgLevel,
      locationId: matchedLevel?.id || null,
    };

    try {
      const res = await apiFetch('/api/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast('success', 'Drawing Registered', `${newDwgNumber} added to Drawing Register`);
        setIsUploadDrawingModalOpen(false);
        setNewDwgNumber('');
        setNewDwgTitle('');
        loadDrawingsAndLocations();
      } else {
        addToast('error', 'Failed to register drawing');
      }
    } catch {
      addToast('error', 'Network error');
    }
  };

  // Find level location for selected drawing if in maps mode
  const currentLevelLocation =
    locationsList.find(
      (l) => l.type === 'Level' && (l.name === selectedDrawing?.levelName || l.id === selectedDrawing?.locationId)
    ) ||
    locationsList.find((l) => l.type === 'Level' && l.name === 'Level 02') || {
      id: 2,
      name: 'Level 02',
      code: 'L02',
      type: 'Level',
      projectId: 1,
      parentId: null,
      path: 'DC Melbourne 02 > LA2 > Level 02',
      sequence: 2,
    };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">
            <FileText className="w-4 h-4" />
            <span>Document Control & Plans</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500 font-mono">{activeProject?.code}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Drawing Register & Level Plans
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Issued engineering drawings, single-line diagrams, and revision control linked to physical locations.
          </p>
        </div>

        {/* View Switcher: Drawing Register vs Interactive Map */}
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('drawings')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'drawings'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Drawing Register</span>
            </button>

            <button
              onClick={() => setActiveSubTab('maps')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'maps'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map View</span>
            </button>
          </div>

          <button
            onClick={() => setIsUploadDrawingModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Drawing</span>
          </button>
        </div>
      </div>

      {/* ==================================================== */}
      {/* SUBTAB 1: PRIMARY DRAWING REGISTER */}
      {/* ==================================================== */}
      {activeSubTab === 'drawings' && (
        <div className="space-y-4">
          {/* Search & Discipline Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center space-x-3 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={drawingSearch}
                  onChange={(e) => setDrawingSearch(e.target.value)}
                  placeholder="Search drawing number or title (e.g. MEL02-E-101)..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] shrink-0 mr-1">
                Discipline:
              </span>
              {disciplines.map((d) => (
                <button
                  key={d}
                  onClick={() => setSelectedDiscipline(d)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    selectedDiscipline === d
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Drawing Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrawings.map((dwg) => {
              const isLevelPlan = Boolean(dwg.levelName || dwg.locationId);

              return (
                <div
                  key={dwg.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl transition-all flex flex-col justify-between hover:shadow-xl shadow-sm"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {dwg.drawingNumber}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                          {dwg.revision}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {dwg.status}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-white text-sm mb-1.5">
                      {dwg.title}
                    </h3>

                    <div className="flex items-center space-x-3 text-[11px] text-slate-400">
                      <span>{dwg.discipline}</span>
                      <span>•</span>
                      <span>Scale {dwg.scale || '1:100'}</span>
                      {dwg.levelName && (
                        <>
                          <span>•</span>
                          <span className="text-amber-400 font-semibold">{dwg.levelName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    {/* View on Level Map Button */}
                    {isLevelPlan ? (
                      <button
                        onClick={() => handleViewOnLevelMap(dwg)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        <Map className="w-3.5 h-3.5" />
                        <span>[VIEW ON LEVEL MAP]</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-slate-500">Document Only</span>
                    )}

                    <button
                      onClick={() => {
                        setSelectedDrawing(dwg);
                        setActiveSubTab('maps');
                      }}
                      className="text-slate-400 hover:text-white font-semibold flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Preview Sheet</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* SUBTAB 2: UNIFIED INTERACTIVE LEVEL MAP VIEW */}
      {/* ==================================================== */}
      {activeSubTab === 'maps' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider">Active Level Plan:</span>
              <span className="font-bold text-white bg-slate-800 px-2.5 py-1 rounded-xl">
                {currentLevelLocation.name}
              </span>
            </div>

            <button
              onClick={() => {
                if (currentLevelLocation) {
                  setSelectedLocationId(currentLevelLocation.id);
                }
                setActiveTab('locations');
              }}
              className="flex items-center space-x-1 text-xs font-bold text-amber-400 hover:text-amber-300"
            >
              <span>Open in Physical Locations →</span>
            </button>
          </div>

          {/* Uses EXACT SAME InteractiveLevelMap component */}
          <InteractiveLevelMap
            levelLocation={currentLevelLocation}
            flatLocations={locationsList}
            onSelectRoom={(room) => {
              setSelectedLocationId(room.id);
              setActiveTab('locations');
            }}
            onSelectEquipment={(eq) => {
              setSelectedLocationId(currentLevelLocation.id);
              setActiveTab('locations');
            }}
            onSelectIssue={() => {
              setActiveTab('issues');
            }}
            isAdmin={currentUser.role === 'Administrator' || currentUser.role === 'Project Manager'}
          />
        </div>
      )}

      {/* Modal: Register Drawing */}
      {isUploadDrawingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Register New Drawing</h3>
              <button
                onClick={() => setIsUploadDrawingModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDrawing} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Drawing Number
                </label>
                <input
                  type="text"
                  required
                  value={newDwgNumber}
                  onChange={(e) => setNewDwgNumber(e.target.value)}
                  placeholder="e.g. MEL02-E-103"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Drawing Title
                </label>
                <input
                  type="text"
                  required
                  value={newDwgTitle}
                  onChange={(e) => setNewDwgTitle(e.target.value)}
                  placeholder="e.g. Level 02 Transformer Schematics"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Discipline
                  </label>
                  <select
                    value={newDwgDiscipline}
                    onChange={(e) => setNewDwgDiscipline(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    {disciplines.filter((d) => d !== 'All').map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Revision
                  </label>
                  <input
                    type="text"
                    value={newDwgRevision}
                    onChange={(e) => setNewDwgRevision(e.target.value)}
                    placeholder="Rev A"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Scale
                  </label>
                  <input
                    type="text"
                    value={newDwgScale}
                    onChange={(e) => setNewDwgScale(e.target.value)}
                    placeholder="1:100"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Assigned Level
                  </label>
                  <select
                    value={newDwgLevel}
                    onChange={(e) => setNewDwgLevel(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Level 02">Level 02</option>
                    <option value="Level 01">Level 01</option>
                    <option value="Level 03">Level 03</option>
                    <option value="All Levels">All Levels / Schematics</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUploadDrawingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
                >
                  Register Drawing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
