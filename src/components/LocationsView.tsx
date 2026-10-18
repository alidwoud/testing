import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Layers,
  ChevronRight,
  ChevronDown,
  Plus,
  Building,
  MapPin,
  Cpu,
  ArrowRight,
  ArrowLeft,
  Map,
  FileText,
  AlertTriangle,
  ClipboardCheck,
  Cable as CableIcon,
  Search,
  ExternalLink,
  Settings,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { LocationNode, EquipmentItem, CableItem, ItrInstance, IssueItem, PhotoEvidence, Drawing } from '../types/index.ts';
import { ConfigureLevelPlanModal, RoomHotspotConfig } from './ConfigureLevelPlanModal.tsx';
import { AddItrModal } from './AddItrModal.tsx';
import { InteractiveLevelMap } from './InteractiveLevelMap.tsx';

export const LocationsView: React.FC = () => {
  const {
    apiFetch,
    setSelectedEquipmentId,
    setSelectedCableId,
    setSelectedItrId,
    selectedLocationId,
    setSelectedLocationId,
    setActiveTab,
    addToast,
    activeProject,
    currentUser,
  } = useApp();

  const [locationTree, setLocationTree] = useState<LocationNode[]>([]);
  const [flatLocations, setFlatLocations] = useState<LocationNode[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationNode | null>(null);

  // Tab states for Level and Room workspaces
  const [levelTab, setLevelTab] = useState<'floorplan' | 'rooms' | 'equipment' | 'issues'>('floorplan');
  const [roomTab, setRoomTab] = useState<'equipment' | 'cables' | 'itrs' | 'issues' | 'photos' | 'drawings'>('equipment');

  // Related data for the selected location
  const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
  const [cablesList, setCablesList] = useState<CableItem[]>([]);
  const [itrsList, setItrsList] = useState<ItrInstance[]>([]);
  const [issuesList, setIssuesList] = useState<IssueItem[]>([]);
  const [photosList, setPhotosList] = useState<PhotoEvidence[]>([]);
  const [drawingsList, setDrawingsList] = useState<Drawing[]>([]);

  // Modals
  const [isAddItrOpen, setIsAddItrOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocCode, setNewLocCode] = useState('');
  const [newLocType, setNewLocType] = useState('Room');
  const [newLocParentId, setNewLocParentId] = useState<number | ''>('');

  // Tree UI state
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Level Plan configuration
  const [levelPlan, setLevelPlan] = useState<{
    configured: boolean;
    drawingId?: number;
    drawingNumber?: string;
    title?: string;
    fileUrl?: string;
    scale?: string;
    revision?: string;
    pageNumber?: number;
    pageCount?: number;
    hotspots?: RoomHotspotConfig[];
  } | null>(null);

  const isAdmin =
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Project Manager' ||
    currentUser.role === 'QA Manager';

  // Fetch real plan configuration for a level
  const fetchLevelPlan = async (levelId: number) => {
    try {
      const res = await apiFetch(`/api/locations/${levelId}/plan`);
      if (res.ok) {
        const data = await res.json();
        setLevelPlan(data);
      } else {
        setLevelPlan({ configured: false, hotspots: [] });
      }
    } catch {
      setLevelPlan({ configured: false, hotspots: [] });
    }
  };

  // Fetch locations for active project
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/locations');
      if (res.ok) {
        const data = await res.json();
        const tree = data.tree || [];
        const flat: LocationNode[] = data.flat || [];
        setLocationTree(tree);
        setFlatLocations(flat);

        // Auto-expand Building, Level, and Root nodes
        const initialExpanded: Record<number, boolean> = {};
        flat.forEach((loc) => {
          if (loc.type === 'Level' || loc.type === 'Building' || !loc.parentId) {
            initialExpanded[loc.id] = true;
          }
        });
        setExpandedNodes(initialExpanded);

        // Targeted selection or default to Level 02
        if (selectedLocationId) {
          const targeted = flat.find((l) => l.id === selectedLocationId);
          if (targeted) {
            handleSelectLocation(targeted);
            setSelectedLocationId(null);
            return;
          }
        }

        const defaultLevel =
          flat.find((l) => l.name === 'Level 02' && l.type === 'Level') ||
          flat.find((l) => l.type === 'Level') ||
          flat[0];

        if (defaultLevel) {
          handleSelectLocation(defaultLevel);
        }
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, [activeProject]);

  // Handle external location targeting (e.g. from Drawing Register)
  useEffect(() => {
    if (selectedLocationId && flatLocations.length > 0) {
      const targeted = flatLocations.find((l) => l.id === selectedLocationId);
      if (targeted) {
        handleSelectLocation(targeted);
        setSelectedLocationId(null);
      }
    }
  }, [selectedLocationId, flatLocations]);

  // Load associated equipment, cables, ITRs, issues, photos, and plan for selected location
  const handleSelectLocation = async (loc: LocationNode) => {
    setSelectedLocation(loc);

    if (loc.type === 'Level') {
      setLevelTab('floorplan');
      await fetchLevelPlan(loc.id);
    } else {
      setRoomTab('equipment');
    }

    try {
      // Find all target location IDs (this node + children if it's a Level)
      const targetIds = [loc.id];
      if (loc.type === 'Level') {
        const children = flatLocations.filter((l) => l.parentId === loc.id);
        children.forEach((c) => targetIds.push(c.id));
      }

      // Fetch equipment
      const eqRes = await apiFetch('/api/equipment');
      let currentEq: EquipmentItem[] = [];
      if (eqRes.ok) {
        const allEq: EquipmentItem[] = await eqRes.json();
        currentEq = allEq.filter((e) => targetIds.includes(e.locationId));
        setEquipmentList(currentEq);
      }

      // Fetch cables
      const cbRes = await apiFetch('/api/cables');
      if (cbRes.ok) {
        const cbData = await cbRes.json();
        const allCables: CableItem[] = cbData.data || cbData.cables || [];
        const eqCodes = new Set(currentEq.map((e) => e.equipmentCode));
        const filteredCables = allCables.filter(
          (c) =>
            (c.locationId && targetIds.includes(c.locationId)) ||
            eqCodes.has(c.fromEquipmentCode) ||
            eqCodes.has(c.toEquipmentCode)
        );
        setCablesList(filteredCables);
      }

      // Fetch ITRs
      const itrRes = await apiFetch('/api/itr-instances');
      if (itrRes.ok) {
        const allItrs: ItrInstance[] = await itrRes.json();
        const eqCodes = new Set(currentEq.map((e) => e.equipmentCode));
        const filteredItrs = allItrs.filter(
          (i) =>
            (i.targetType === 'Equipment' && eqCodes.has(i.targetCode)) ||
            (i.targetType === 'Location' && targetIds.includes(i.targetId))
        );
        setItrsList(filteredItrs);
      }

      // Fetch Issues
      const issRes = await apiFetch('/api/issues');
      if (issRes.ok) {
        const allIssues: IssueItem[] = await issRes.json();
        const eqIds = new Set(currentEq.map((e) => e.id));
        const filteredIssues = allIssues.filter(
          (i) =>
            (i.locationId && targetIds.includes(i.locationId)) ||
            (i.equipmentId && eqIds.has(i.equipmentId))
        );
        setIssuesList(filteredIssues);
      }

      // Fetch Photos
      const photoRes = await apiFetch('/api/photos');
      if (photoRes.ok) {
        const allPhotos: PhotoEvidence[] = await photoRes.json();
        const filteredPhotos = allPhotos.filter((p) => {
          const cap = (p.caption || '').toLowerCase();
          const title = (p.title || '').toLowerCase();
          const name = loc.name.toLowerCase();
          return cap.includes(name) || title.includes(name);
        });
        setPhotosList(filteredPhotos);
      }

      // Fetch Drawings
      const dwgRes = await apiFetch('/api/drawings');
      if (dwgRes.ok) {
        const allDwgs: Drawing[] = await dwgRes.json();
        const filteredDwgs = allDwgs.filter((d) => {
          if (d.locationId === loc.id) return true;
          if (loc.type === 'Room' && d.levelName && loc.path?.includes(d.levelName)) return true;
          if (d.levelName && d.levelName === loc.name) return true;
          return false;
        });
        setDrawingsList(filteredDwgs);
      }
    } catch (err) {
      console.error('Failed to load related location records:', err);
    }
  };

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Create location
  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName || !newLocCode) return;

    try {
      const res = await apiFetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLocName,
          code: newLocCode,
          type: newLocType,
          parentId: newLocParentId === '' ? null : Number(newLocParentId),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        addToast('success', 'Location Created', `${created.name} (${created.code})`);
        setIsAddModalOpen(false);
        setNewLocName('');
        setNewLocCode('');
        await fetchLocations();
        handleSelectLocation(created);
      } else {
        const err = await res.json();
        addToast('error', 'Failed to create location', err.error);
      }
    } catch {
      addToast('error', 'Error', 'Failed to save location record.');
    }
  };

  // Ancestor chain for breadcrumb: [Project] > [Building] > [Level] > [Room]
  const getAncestors = (loc: LocationNode | null): LocationNode[] => {
    if (!loc) return [];
    const chain: LocationNode[] = [];
    let curr: LocationNode | undefined = loc;
    while (curr) {
      chain.unshift(curr);
      if (curr.parentId) {
        curr = flatLocations.find((l) => l.id === curr!.parentId);
      } else {
        break;
      }
    }
    return chain;
  };

  const ancestorChain = getAncestors(selectedLocation);
  const isLevelSelected = selectedLocation?.type === 'Level';
  const childRooms = flatLocations.filter((l) => l.parentId === selectedLocation?.id);
  const parentLevel =
    selectedLocation?.parentId
      ? flatLocations.find((l) => l.id === selectedLocation.parentId)
      : null;

  // Filtered tree
  const matchesSearch = (node: LocationNode): boolean => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    const nameMatch = node.name.toLowerCase().includes(term) || node.code.toLowerCase().includes(term);
    if (nameMatch) return true;
    const children = flatLocations.filter((l) => l.parentId === node.id);
    return children.some((c) => matchesSearch(c));
  };

  // Render tree item
  const renderTreeNode = (node: LocationNode, depth = 0) => {
    if (!matchesSearch(node)) return null;

    const children = flatLocations.filter((l) => l.parentId === node.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodes[node.id];
    const isSelected = selectedLocation?.id === node.id;

    const badgeColor =
      node.type === 'Building'
        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
        : node.type === 'Level'
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => handleSelectLocation(node)}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center justify-between py-2 pr-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
            isSelected
              ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
          }`}
        >
          <div className="flex items-center space-x-2 truncate">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.id, e)}
                className={`p-0.5 rounded hover:bg-slate-700/50 ${
                  isSelected ? 'text-slate-950 hover:bg-amber-400' : 'text-slate-400'
                }`}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-3.5" />
            )}

            {node.type === 'Building' ? (
              <Building className="w-3.5 h-3.5 shrink-0 opacity-80" />
            ) : node.type === 'Level' ? (
              <Map className="w-3.5 h-3.5 shrink-0 opacity-80" />
            ) : (
              <MapPin className="w-3.5 h-3.5 shrink-0 opacity-80" />
            )}

            <span className="truncate">{node.name}</span>
          </div>

          <span
            className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono border ${
              isSelected ? 'bg-slate-950/20 border-slate-950/30 text-slate-950' : badgeColor
            }`}
          >
            {node.code}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumb Trail: DC Melbourne 02 > LA2 > Level 02 > Switch Room 01 */}
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 flex-wrap">
            <button
              onClick={() => {
                const root = flatLocations.find((l) => !l.parentId) || flatLocations[0];
                if (root) handleSelectLocation(root);
              }}
              className="text-amber-600 hover:text-amber-700 transition-colors uppercase tracking-wider font-extrabold"
            >
              {activeProject?.name || 'MAXIM FORGE'}
            </button>

            {ancestorChain.map((anc, idx) => {
              const isLast = idx === ancestorChain.length - 1;
              return (
                <React.Fragment key={anc.id}>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <button
                    onClick={() => handleSelectLocation(anc)}
                    className={`transition-colors truncate max-w-[160px] ${
                      isLast
                        ? 'text-slate-900 font-extrabold cursor-default'
                        : 'text-slate-600 hover:text-amber-600 font-bold'
                    }`}
                  >
                    {anc.name}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
            Locations & Interactive Site Maps
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Unified physical hierarchy and spatial floor plans with clickable rooms, equipment, and defects.
          </p>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          {isLevelSelected && isAdmin && (
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 hover:border-amber-400 font-bold text-xs uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Configure Level Plan</span>
            </button>
          )}

          <button
            onClick={() => {
              setNewLocParentId(selectedLocation ? selectedLocation.id : '');
              setIsAddModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Location</span>
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Hierarchy Tree on Left, Workspace on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Tree Panel */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
              <Building className="w-3.5 h-3.5 text-amber-400" />
              <span>Project Structure Tree</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {flatLocations.length} nodes
            </span>
          </div>

          {/* Quick Filter */}
          <div className="relative mb-3">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter rooms or levels..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[640px] pr-1">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading locations hierarchy...</div>
            ) : locationTree.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No locations configured yet.</div>
            ) : (
              locationTree.map((root) => renderTreeNode(root))
            )}
          </div>
        </div>

        {/* Right Workspace: Level Page or Room Page */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          {selectedLocation ? (
            isLevelSelected ? (
              /* ==================================================== */
              /* LEVEL PAGE WORKSPACE: Floor Plan, Rooms, Equipment, Issues */
              /* ==================================================== */
              <div className="space-y-6">
                {/* Level Title & Header Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <div className="flex items-center space-x-2 text-[11px] text-amber-400 font-bold uppercase tracking-wider mb-1">
                      <span className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        LEVEL • {selectedLocation.code}
                      </span>
                      <span>•</span>
                      <span className="text-slate-400 font-mono">{activeProject?.name}</span>
                    </div>
                    <h2 className="text-2xl font-black text-white">{selectedLocation.name}</h2>
                    <div className="text-xs text-slate-400 mt-1 font-mono flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{selectedLocation.path}</span>
                    </div>
                  </div>

                  {/* Level Quick Stats */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Rooms</div>
                      <div className="text-sm font-black text-amber-400">{childRooms.length}</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Equipment</div>
                      <div className="text-sm font-black text-blue-400">{equipmentList.length}</div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-center">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Open Issues</div>
                      <div className="text-sm font-black text-rose-400">{issuesList.length}</div>
                    </div>
                  </div>
                </div>

                {/* Level View Tabs: Floor Plan (Default), Rooms, Equipment, Issues */}
                <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2">
                  <button
                    onClick={() => setLevelTab('floorplan')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      levelTab === 'floorplan'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>FLOOR PLAN</span>
                    {levelPlan?.configured && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" title="Plan Active" />
                    )}
                  </button>

                  <button
                    onClick={() => setLevelTab('rooms')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      levelTab === 'rooms'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>ROOMS ({childRooms.length})</span>
                  </button>

                  <button
                    onClick={() => setLevelTab('equipment')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      levelTab === 'equipment'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>EQUIPMENT ({equipmentList.length})</span>
                  </button>

                  <button
                    onClick={() => setLevelTab('issues')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      levelTab === 'issues'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>ISSUES ({issuesList.length})</span>
                  </button>
                </div>

                {/* TAB 1: INTERACTIVE LEVEL FLOOR PLAN (ONE SPATIAL MAP SYSTEM) */}
                {levelTab === 'floorplan' && (
                  <InteractiveLevelMap
                    levelLocation={selectedLocation}
                    flatLocations={flatLocations}
                    equipmentList={equipmentList}
                    issuesList={issuesList}
                    levelPlan={levelPlan}
                    onSelectRoom={(roomLoc) => handleSelectLocation(roomLoc)}
                    onSelectEquipment={(eq) => {
                      setSelectedEquipmentId(eq.id);
                      setActiveTab('equipment');
                    }}
                    onSelectIssue={() => {
                      setActiveTab('issues');
                    }}
                    onConfigurePlan={() => setIsConfigModalOpen(true)}
                    isAdmin={isAdmin}
                  />
                )}

                {/* TAB 2: ROOMS LIST */}
                {levelTab === 'rooms' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Physical Rooms & Spaces on {selectedLocation.name}</span>
                      <span>{childRooms.length} rooms</span>
                    </div>

                    {childRooms.length === 0 ? (
                      <div className="text-center py-12 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No rooms configured directly under {selectedLocation.name} yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {childRooms.map((room) => {
                          const roomEq = equipmentList.filter((e) => e.locationId === room.id);
                          const roomIssues = issuesList.filter((i) => i.locationId === room.id);

                          return (
                            <div
                              key={room.id}
                              onClick={() => handleSelectLocation(room)}
                              className="p-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all flex flex-col justify-between group shadow-sm"
                            >
                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                                    {room.code}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-400">
                                    {room.type}
                                  </span>
                                </div>
                                <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                                  {room.name}
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1 font-mono truncate">
                                  {room.path}
                                </p>
                              </div>

                              <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-3 text-slate-400">
                                  <span>{roomEq.length} Equipment</span>
                                  {roomIssues.length > 0 && (
                                    <span className="text-rose-400 font-semibold">
                                      {roomIssues.length} Defects
                                    </span>
                                  )}
                                </div>
                                <span className="text-amber-400 font-bold group-hover:translate-x-1 transition-transform flex items-center space-x-1">
                                  <span>Open Room</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: LEVEL EQUIPMENT */}
                {levelTab === 'equipment' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Equipment on {selectedLocation.name}</span>
                      <span>{equipmentList.length} items</span>
                    </div>

                    {equipmentList.length === 0 ? (
                      <div className="text-center py-12 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No equipment registered on this level.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {equipmentList.map((eq) => (
                          <div
                            key={eq.id}
                            onClick={() => {
                              setSelectedEquipmentId(eq.id);
                              setActiveTab('equipment');
                            }}
                            className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-amber-400 text-xs">
                                  {eq.equipmentCode}
                                </span>
                                <span className="text-xs text-white font-semibold">
                                  {eq.equipmentName}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium">
                                  {eq.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                {eq.equipmentType} • {eq.system} • {eq.manufacturer || 'Schneider'}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                              <span>Open Object</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: LEVEL ISSUES */}
                {levelTab === 'issues' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Defects & Open Issues on {selectedLocation.name}</span>
                      <span>{issuesList.length} items</span>
                    </div>

                    {issuesList.length === 0 ? (
                      <div className="text-center py-12 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No open issues recorded on this level.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {issuesList.map((issue) => (
                          <div
                            key={issue.id}
                            onClick={() => setActiveTab('issues')}
                            className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-rose-400 text-xs">
                                  {issue.issueNumber}
                                </span>
                                <span className="text-xs text-white font-semibold">
                                  {issue.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                                  {issue.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                Priority: {issue.priority} • Assigned: {issue.assignedCompany || 'Not Set'}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 text-xs font-semibold text-rose-400 group-hover:translate-x-1 transition-transform">
                              <span>Open Defect</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* ==================================================== */
              /* ROOM / AREA PAGE WORKSPACE (e.g. Switch Room 01) */
              /* ==================================================== */
              <div className="space-y-6">
                {/* Room Header with Breadcrumb and Back Button to Level Plan */}
                <div className="border-b border-slate-800 pb-5">
                  <div className="flex items-center justify-between gap-4 mb-3">
                    {parentLevel && (
                      <button
                        onClick={() => {
                          handleSelectLocation(parentLevel);
                          setLevelTab('floorplan');
                        }}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold transition-colors border border-slate-700 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to {parentLevel.name} Floor Plan</span>
                      </button>
                    )}

                    <div className="flex items-center space-x-2 text-[11px] text-amber-400 font-bold uppercase tracking-wider">
                      <span className="bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {selectedLocation.type} • {selectedLocation.code}
                      </span>
                    </div>
                  </div>

                  <h2 className="text-2xl font-black text-white">{selectedLocation.name}</h2>
                  <div className="text-xs text-slate-400 mt-1 font-mono flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedLocation.path}</span>
                  </div>
                </div>

                {/* Room Stat Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Equipment</div>
                    <div className="text-lg font-black text-amber-400 mt-0.5">
                      {equipmentList.length} units
                    </div>
                  </div>
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Cables</div>
                    <div className="text-lg font-black text-cyan-400 mt-0.5">
                      {cablesList.length} cables
                    </div>
                  </div>
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">ITRs / QA</div>
                    <div className="text-lg font-black text-emerald-400 mt-0.5">
                      {itrsList.length} records
                    </div>
                  </div>
                  <div className="bg-slate-850 p-3 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Open Issues</div>
                    <div className="text-lg font-black text-rose-400 mt-0.5">
                      {issuesList.length} defects
                    </div>
                  </div>
                </div>

                {/* Room Sub-Tabs: Equipment, Cables, ITRs, Issues, Photos, Related Drawings */}
                <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
                  <button
                    onClick={() => setRoomTab('equipment')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      roomTab === 'equipment'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Equipment ({equipmentList.length})</span>
                  </button>

                  <button
                    onClick={() => setRoomTab('cables')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      roomTab === 'cables'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <CableIcon className="w-3.5 h-3.5" />
                    <span>Cables ({cablesList.length})</span>
                  </button>

                  <button
                    onClick={() => setRoomTab('itrs')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      roomTab === 'itrs'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    <span>ITRs / QA ({itrsList.length})</span>
                  </button>

                  <button
                    onClick={() => setRoomTab('issues')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      roomTab === 'issues'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Issues ({issuesList.length})</span>
                  </button>

                  <button
                    onClick={() => setRoomTab('photos')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      roomTab === 'photos'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Photos ({photosList.length})</span>
                  </button>

                  <button
                    onClick={() => setRoomTab('drawings')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                      roomTab === 'drawings'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Related Drawings ({drawingsList.length})</span>
                  </button>
                </div>

                {/* ROOM CONTENT TAB 1: EQUIPMENT */}
                {roomTab === 'equipment' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Equipment in {selectedLocation.name}</span>
                      <span>{equipmentList.length} units</span>
                    </div>

                    {equipmentList.length === 0 ? (
                      <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No equipment registered directly to this room yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {equipmentList.map((eq) => (
                          <div
                            key={eq.id}
                            onClick={() => {
                              setSelectedEquipmentId(eq.id);
                              setActiveTab('equipment');
                            }}
                            className="p-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-amber-400 text-sm">
                                  {eq.equipmentCode}
                                </span>
                                <span className="text-xs text-white font-semibold">
                                  {eq.equipmentName}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                  {eq.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                {eq.equipmentType} • {eq.system} • {eq.manufacturer || 'Schneider'}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
                              <span>Open Object</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ROOM CONTENT TAB 2: CABLES */}
                {roomTab === 'cables' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Cables connected to {selectedLocation.name}</span>
                      <span>{cablesList.length} cables</span>
                    </div>

                    {cablesList.length === 0 ? (
                      <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No cables currently terminating in this room.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {cablesList.map((cb) => (
                          <div
                            key={cb.id}
                            onClick={() => {
                              setSelectedCableId(cb.id);
                              setActiveTab('cables');
                            }}
                            className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between group"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-cyan-400 text-xs">
                                  {cb.cableId}
                                </span>
                                <span className="text-xs text-slate-300">
                                  {cb.fromEquipmentCode} → {cb.toEquipmentCode}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                  {cb.installationStatus || 'Installed'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                {cb.cableType} • Length: {cb.length ? `${cb.length}m` : 'TBD'}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 text-xs font-semibold text-cyan-400 group-hover:translate-x-1 transition-transform">
                              <span>Open Cable</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ROOM CONTENT TAB 3: ITRS / QA */}
                {roomTab === 'itrs' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Inspection Test Records for {selectedLocation.name}</span>
                      <button
                        onClick={() => setIsAddItrOpen(true)}
                        className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Add ITR</span>
                      </button>
                    </div>

                    {itrsList.length === 0 ? (
                      <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No ITR records registered to this room. Click "+ Add ITR" to create or link an inspection.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {itrsList.map((itr) => (
                          <div
                            key={itr.id}
                            onClick={() => {
                              setSelectedItrId(itr.id);
                              setActiveTab('itrs');
                            }}
                            className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition-all flex items-center justify-between group"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-emerald-400 text-xs">
                                  {itr.itrNumber}
                                </span>
                                <span className="text-xs text-white font-semibold">
                                  {itr.templateTitle || 'Inspection Record'}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                  {itr.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                Target: {itr.targetType} {itr.targetCode}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
                              <span>View Inspection</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ROOM CONTENT TAB 4: ISSUES / DEFECTS */}
                {roomTab === 'issues' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Defects & Open Issues in {selectedLocation.name}</span>
                      <span>{issuesList.length} defects</span>
                    </div>

                    {issuesList.length === 0 ? (
                      <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No active defect records for this room.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {issuesList.map((iss) => (
                          <div
                            key={iss.id}
                            onClick={() => setActiveTab('issues')}
                            className="p-3.5 rounded-xl bg-slate-850 hover:bg-slate-800 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition-all flex items-center justify-between group"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-rose-400 text-xs">
                                  {iss.issueNumber}
                                </span>
                                <span className="text-xs text-white font-semibold">
                                  {iss.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-300 font-bold border border-rose-500/25">
                                  {iss.status}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                Priority: {iss.priority} • Assigned: {iss.assignedCompany || 'Not Set'}
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 text-xs font-semibold text-rose-400 group-hover:translate-x-1 transition-transform">
                              <span>View Defect</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ROOM CONTENT TAB 5: PHOTOS */}
                {roomTab === 'photos' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Photo Evidence for {selectedLocation.name}</span>
                      <span>{photosList.length} photos</span>
                    </div>

                    {photosList.length === 0 ? (
                      <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No photos captured for this room yet. Use the Site Mode camera or upload from inspector.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {photosList.map((p) => (
                          <div
                            key={p.id}
                            className="bg-slate-850 border border-slate-800 rounded-xl overflow-hidden group shadow-sm"
                          >
                            <img
                              src={p.thumbnailUrl || p.photoUrl}
                              alt={p.title}
                              className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="p-2.5">
                              <div className="text-xs font-bold text-white truncate">{p.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{p.category}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ROOM CONTENT TAB 6: RELATED DRAWINGS */}
                {roomTab === 'drawings' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <span>Drawings Covering {selectedLocation.name}</span>
                      <span>{drawingsList.length} sheets</span>
                    </div>

                    {drawingsList.length === 0 ? (
                      <div className="text-center py-10 bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-xs">
                        No drawings directly mapped to this room.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {drawingsList.map((dwg) => (
                          <div
                            key={dwg.id}
                            className="p-3.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-amber-400 text-xs">
                                  {dwg.drawingNumber}
                                </span>
                                <span className="text-xs text-white font-semibold">
                                  {dwg.title}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                  {dwg.revision}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 mt-1">
                                {dwg.discipline} • Scale: {dwg.scale || '1:100'} • Status: {dwg.status}
                              </div>
                            </div>

                            {parentLevel && (
                              <button
                                onClick={() => {
                                  handleSelectLocation(parentLevel);
                                  setLevelTab('floorplan');
                                }}
                                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase cursor-pointer"
                              >
                                <span>[VIEW ON LEVEL MAP]</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="text-center py-16 text-slate-400 text-sm">
              Select a location from the hierarchy tree to view its workspace.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add Location */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Physical Location</h3>
            <form onSubmit={handleCreateLocation} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Location Type
                </label>
                <select
                  value={newLocType}
                  onChange={(e) => setNewLocType(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Building">Building / Facility</option>
                  <option value="Level">Level / Floor</option>
                  <option value="Room">Room</option>
                  <option value="Zone">Zone</option>
                  <option value="Area">Area</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Location Name
                </label>
                <input
                  type="text"
                  required
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="e.g. Switch Room 03"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Location Code
                </label>
                <input
                  type="text"
                  required
                  value={newLocCode}
                  onChange={(e) => setNewLocCode(e.target.value)}
                  placeholder="e.g. L02-SR03"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Parent Location
                </label>
                <select
                  value={newLocParentId}
                  onChange={(e) => setNewLocParentId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">None (Top-level node)</option>
                  {flatLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.code}) — {loc.type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
                >
                  Create Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure Real Level Plan */}
      {isConfigModalOpen && selectedLocation && isLevelSelected && (
        <ConfigureLevelPlanModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          levelLocation={selectedLocation}
          childLocations={childRooms}
          currentPlan={levelPlan}
          onSaveSuccess={() => {
            fetchLevelPlan(selectedLocation.id);
            addToast('success', 'Level Plan Updated', `Saved floor plan for ${selectedLocation.name}`);
          }}
        />
      )}

      {/* Modal: Add ITR */}
      {isAddItrOpen && selectedLocation && (
        <AddItrModal
          isOpen={isAddItrOpen}
          onClose={() => setIsAddItrOpen(false)}
          context={{
            targetType: 'Location',
            targetId: selectedLocation.id,
            targetCode: selectedLocation.code,
            locationName: selectedLocation.name,
          }}
          onItrCreated={() => {
            handleSelectLocation(selectedLocation);
          }}
        />
      )}
    </div>
  );
};
