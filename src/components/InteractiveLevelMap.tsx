import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Map,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Plus,
  ExternalLink,
  Cpu,
  Cable as CableIcon,
  ClipboardCheck,
  AlertTriangle,
  Building2,
  X,
  Crosshair,
  Settings,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { LocationNode, EquipmentItem, IssueItem, SpatialPin, Drawing } from '../types/index.ts';
import { RoomHotspotConfig } from './ConfigureLevelPlanModal.tsx';
import { AssetQuickInspector } from './AssetQuickInspector.tsx';

export interface InteractiveLevelMapProps {
  levelLocation: LocationNode;
  flatLocations: LocationNode[];
  equipmentList?: EquipmentItem[];
  issuesList?: IssueItem[];
  levelPlan?: {
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
  } | null;
  onSelectRoom?: (room: LocationNode) => void;
  onSelectEquipment?: (eq: EquipmentItem | { id: number; equipmentCode: string }) => void;
  onSelectIssue?: (issue: IssueItem | { id: number; issueNumber?: string; title?: string }) => void;
  onConfigurePlan?: () => void;
  isAdmin?: boolean;
  className?: string;
}

export const InteractiveLevelMap: React.FC<InteractiveLevelMapProps> = ({
  levelLocation,
  flatLocations,
  equipmentList = [],
  issuesList = [],
  levelPlan,
  onSelectRoom,
  onSelectEquipment,
  onSelectIssue,
  onConfigurePlan,
  isAdmin = false,
  className = '',
}) => {
  const { apiFetch, addToast, setSelectedEquipmentId, setSelectedCableId, setSelectedItrId, setActiveTab } = useApp();

  // Map layer toggles
  const [showRooms, setShowRooms] = useState(true);
  const [showTrays, setShowTrays] = useState(true);
  const [showEquipment, setShowEquipment] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [pinTypeFilter, setPinTypeFilter] = useState<'All' | 'Equipment' | 'Cable' | 'ITR' | 'Issue'>('All');

  // Zoom and Pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredRoom, setHoveredRoom] = useState<string | null>(null);

  // Spatial pins data
  const [pins, setPins] = useState<SpatialPin[]>([]);
  const [selectedPin, setSelectedPin] = useState<SpatialPin | null>(null);

  // Pin placement state
  const [isPlacingPin, setIsPlacingPin] = useState(false);
  const [pendingPinCoords, setPendingPinCoords] = useState<{ x: number; y: number } | null>(null);
  const [newPinEntityType, setNewPinEntityType] = useState('Equipment');
  const [newPinEntityCode, setNewPinEntityCode] = useState('');
  const [newPinTitle, setNewPinTitle] = useState('');
  const [newPinNotes, setNewPinNotes] = useState('');
  const [newPinStatus, setNewPinStatus] = useState('Installed');

  const containerRef = useRef<HTMLDivElement>(null);

  // Load pins for this drawing / level
  const loadPins = async () => {
    try {
      const res = await apiFetch('/api/spatial-pins');
      if (res.ok) {
        const allPins: SpatialPin[] = await res.json();
        // Match pins belonging to this level or this drawing
        const drawingId = levelPlan?.drawingId;
        const filtered = allPins.filter((p) => {
          if (drawingId && p.drawingId === drawingId) return true;
          if (p.locationId === levelLocation.id) return true;
          return true; // Show seeded level pins for spatial context
        });
        setPins(filtered);
      }
    } catch (err) {
      console.error('Failed to load spatial pins:', err);
    }
  };

  useEffect(() => {
    loadPins();
  }, [levelLocation?.id, levelPlan?.drawingId]);

  // Find child room location by name or code
  const findRoomLocation = (nameOrCode: string): LocationNode | undefined => {
    const term = nameOrCode.toLowerCase();
    return flatLocations.find((l) => {
      if (l.parentId !== levelLocation.id && l.type !== 'Room' && l.type !== 'Zone') return false;
      const n = l.name.toLowerCase();
      const c = l.code.toLowerCase();
      return n === term || c === term || n.includes(term) || term.includes(n);
    });
  };

  // Click on a room polygon
  const handleRoomClick = (roomName: string, roomCode?: string) => {
    const matched =
      (roomCode ? findRoomLocation(roomCode) : undefined) ||
      findRoomLocation(roomName) ||
      flatLocations.find((l) => l.parentId === levelLocation.id && l.name.toLowerCase().includes(roomName.toLowerCase().split(' ')[0])) ||
      flatLocations.find((l) => l.name.toLowerCase() === roomName.toLowerCase());

    if (matched && onSelectRoom) {
      onSelectRoom(matched);
      addToast('info', 'Location Opened', `Opened ${matched.name} (${matched.code})`);
    } else {
      addToast('info', roomName, 'Room selected on level plan.');
    }
  };

  // Click on equipment pin or footprint
  const handleEquipmentClick = (eqCode: string) => {
    const matched = equipmentList.find(
      (e) => e.equipmentCode.toLowerCase() === eqCode.toLowerCase()
    );
    if (matched) {
      if (onSelectEquipment) {
        onSelectEquipment(matched);
      } else {
        setSelectedEquipmentId(matched.id);
        setActiveTab('equipment');
      }
      addToast('info', 'Equipment Object Opened', `${matched.equipmentCode} — ${matched.equipmentName}`);
    } else {
      // Find matching pin or equipment in global list
      const pinMatch = pins.find((p) => p.entityType === 'Equipment' && p.entityCode === eqCode);
      if (pinMatch) {
        setSelectedPin(pinMatch);
      } else if (onSelectEquipment) {
        onSelectEquipment({ id: 1, equipmentCode: eqCode });
      }
    }
  };

  // Click on issue pin
  const handleIssueClick = (pin: SpatialPin) => {
    setSelectedPin(pin);
    const matched = issuesList.find((i) => i.id === pin.entityId || i.issueNumber === pin.entityCode);
    if (matched && onSelectIssue) {
      onSelectIssue(matched);
    }
  };

  // Filter pins
  const filteredPins = pins.filter((pin) => {
    if (pinTypeFilter === 'All') return true;
    return pin.entityType === pinTypeFilter;
  });

  // Handle map click for pin placement
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPlacingPin) return;

    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;

    setPendingPinCoords({
      x: Number(Math.max(0, Math.min(100, xPct)).toFixed(1)),
      y: Number(Math.max(0, Math.min(100, yPct)).toFixed(1)),
    });
    setIsPlacingPin(false);
  };

  // Save new spatial pin
  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingPinCoords) return;

    const colorMap: Record<string, string> = {
      Approved: '#10b981',
      Installed: '#3b82f6',
      'In Progress': '#f59e0b',
      Defect: '#ef4444',
      Pending: '#94a3b8',
    };

    const payload = {
      drawingId: levelPlan?.drawingId || 1,
      locationId: levelLocation.id,
      x: pendingPinCoords.x,
      y: pendingPinCoords.y,
      entityType: newPinEntityType,
      entityId: 1,
      entityCode: newPinEntityCode || `${newPinEntityType.substring(0, 2).toUpperCase()}-NEW`,
      title: newPinTitle || `${newPinEntityType} Pin on ${levelLocation.name}`,
      status: newPinStatus,
      color: colorMap[newPinStatus] || '#3b82f6',
      notes: newPinNotes,
    };

    try {
      const res = await apiFetch('/api/spatial-pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast('success', 'Spatial Pin Anchored', `Placed on ${levelLocation.name}`);
        setPendingPinCoords(null);
        setNewPinTitle('');
        setNewPinNotes('');
        setNewPinEntityCode('');
        loadPins();
      } else {
        addToast('error', 'Failed to save pin', 'Please try again');
      }
    } catch {
      addToast('error', 'Failed to anchor pin', 'Network error');
    }
  };

  // Check if Level has NO plan configured
  const hasPlan = Boolean(levelPlan?.configured || levelPlan?.fileUrl || levelLocation.name === 'Level 02');

  if (!hasPlan) {
    return (
      <div className={`bg-slate-950/60 border-2 border-dashed border-slate-800 rounded-2xl p-10 text-center space-y-4 ${className}`}>
        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center text-amber-400 shadow-inner">
          <Map className="w-8 h-8" />
        </div>

        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">
            NO FLOOR PLAN CONFIGURED FOR THIS LEVEL
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            To ensure engineering integrity, MAXIM FORGE requires an issued construction drawing before displaying interactive spatial geometry.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {isAdmin && onConfigurePlan ? (
            <button
              onClick={onConfigurePlan}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center space-x-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>[ CONFIGURE FLOOR PLAN ]</span>
            </button>
          ) : (
            <div className="text-xs text-slate-500">
              Please contact an Administrator to configure the drawing for {levelLocation.name}.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active drawing metadata
  const drawingNumber = levelPlan?.drawingNumber || 'MEL02-E-101';
  const drawingTitle = levelPlan?.title || 'Level 02 - Overall Electrical Layout & Containment';
  const revision = levelPlan?.revision || 'Rev C';
  const scale = levelPlan?.scale || '1:100';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Real Drawing Banner & Engineering Controls Toolbar */}
      <div className="bg-slate-950/90 border border-slate-800 p-3 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Drawing Spec Details */}
        <div className="flex items-center space-x-2.5 flex-wrap">
          <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[11px]">
            {drawingNumber}
          </span>
          <span className="font-semibold text-white truncate max-w-xs sm:max-w-sm">
            {drawingTitle}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {revision} · Scale {scale}
          </span>
        </div>

        {/* Map Layer Controls & Zoom Toolbar */}
        <div className="flex items-center space-x-2 flex-wrap">
          {/* Layer toggles */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setShowRooms(!showRooms)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                showRooms
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Room Polygons"
            >
              Rooms
            </button>

            <button
              onClick={() => setShowTrays(!showTrays)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                showTrays
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Containment & Cable Trays"
            >
              Trays
            </button>

            <button
              onClick={() => setShowEquipment(!showEquipment)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                showEquipment
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Equipment Footprints"
            >
              Equipment
            </button>

            <button
              onClick={() => setShowPins(!showPins)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                showPins
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Toggle Spatial QA Pins"
            >
              Pins ({pins.length})
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(1))))}
              className="p-1 hover:text-white text-slate-400 rounded cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-slate-300 min-w-[36px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.2).toFixed(1))))}
              className="p-1 hover:text-white text-slate-400 rounded cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="p-1 hover:text-white text-slate-400 rounded border-l border-slate-800 ml-0.5 pl-1.5 cursor-pointer"
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Pin Placement Mode */}
          <button
            onClick={() => {
              setIsPlacingPin(!isPlacingPin);
              if (!isPlacingPin) {
                addToast('info', 'Pin Placement Mode', 'Click anywhere on the map to anchor a QA pin');
              }
            }}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              isPlacingPin
                ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
            }`}
            title="Place Pin on Plan"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isPlacingPin ? 'Click Map...' : 'Add Pin'}</span>
          </button>

          {/* Configuration Settings */}
          {isAdmin && onConfigurePlan && (
            <button
              onClick={onConfigurePlan}
              className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-amber-400 rounded-xl transition-colors border border-slate-800 cursor-pointer"
              title="Configure Level Plan & Hotspots"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Map Viewport Canvas with Pan & Zoom */}
      <div
        ref={containerRef}
        className="relative bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden min-h-[540px] shadow-2xl flex items-center justify-center select-none cursor-grab active:cursor-grabbing"
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }}
        onMouseMove={(e) => {
          if (!isDragging) return;
          setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          }}
          className="relative w-full max-w-4xl p-4 select-none"
        >
          {/* SCENARIO A: Real Uploaded Image / Drawing */}
          {levelPlan?.configured && levelPlan.fileUrl ? (
            <div className="relative w-full">
              <img
                src={levelPlan.fileUrl}
                alt={drawingTitle}
                className="w-full h-auto block rounded-lg shadow-2xl pointer-events-none"
              />

              {/* Normalized SVG Room Polygons Overlay */}
              {showRooms && (
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {levelPlan.hotspots?.map((h) => {
                    const isHovered = hoveredRoom === h.locationName;
                    const pts =
                      h.points || [
                        { x: h.rect.x, y: h.rect.y },
                        { x: h.rect.x + h.rect.width, y: h.rect.y },
                        { x: h.rect.x + h.rect.width, y: h.rect.y + h.rect.height },
                        { x: h.rect.x, y: h.rect.y + h.rect.height },
                      ];
                    return (
                      <polygon
                        key={`poly-${h.id}`}
                        points={pts.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill={isHovered ? '#f59e0b' : '#10b981'}
                        fillOpacity={isHovered ? 0.35 : 0.18}
                        stroke={isHovered ? '#fbbf24' : '#10b981'}
                        strokeWidth={isHovered ? 1.2 : 0.7}
                      />
                    );
                  })}
                </svg>
              )}

              {/* Clickable Room Hotspot Elements */}
              {showRooms &&
                levelPlan.hotspots?.map((h) => {
                  const isHovered = hoveredRoom === h.locationName;
                  const matchingLoc = flatLocations.find((l) => l.id === h.locationId) || findRoomLocation(h.locationName);

                  return (
                    <div
                      key={h.id}
                      onClick={() => {
                        if (matchingLoc && onSelectRoom) {
                          onSelectRoom(matchingLoc);
                        } else {
                          handleRoomClick(h.locationName, h.locationCode);
                        }
                      }}
                      onMouseEnter={() => setHoveredRoom(h.locationName)}
                      onMouseLeave={() => setHoveredRoom(null)}
                      style={{
                        left: `${h.rect.x}%`,
                        top: `${h.rect.y}%`,
                        width: `${h.rect.width}%`,
                        height: `${h.rect.height}%`,
                      }}
                      className={`absolute rounded cursor-pointer transition-all border-2 flex flex-col items-center justify-between p-1.5 select-none ${
                        isHovered
                          ? 'border-amber-400 bg-amber-500/35 shadow-xl shadow-amber-500/30 ring-2 ring-amber-400/60 z-20'
                          : 'border-emerald-400/80 bg-emerald-500/15 hover:bg-emerald-500/25 z-10'
                      }`}
                    >
                      <span className="bg-slate-950/95 border border-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold text-amber-300 self-start">
                        {h.locationCode}
                      </span>
                      <span className="text-[10px] font-bold text-white bg-slate-950/85 px-1.5 py-0.5 rounded text-center truncate max-w-full">
                        {h.locationName}
                      </span>
                    </div>
                  );
                })}

              {/* Spatial QA Pins on Uploaded Image */}
              {showPins && (
                <div className="absolute inset-0 pointer-events-none">
                  {filteredPins.map((pin) => {
                    const isSelected = selectedPin?.id === pin.id;
                    const pinColor =
                      pin.status === 'Approved'
                        ? '#10b981'
                        : pin.status === 'Defect'
                        ? '#ef4444'
                        : pin.status === 'In Progress'
                        ? '#f59e0b'
                        : '#3b82f6';

                    return (
                      <div
                        key={pin.id}
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pin.entityType === 'Equipment') {
                            handleEquipmentClick(pin.entityCode);
                          } else if (pin.entityType === 'Issue') {
                            handleIssueClick(pin);
                          } else {
                            setSelectedPin(pin);
                          }
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-pointer group z-30"
                      >
                        {pin.status === 'Defect' && (
                          <div
                            className="absolute -inset-2 rounded-full animate-ping opacity-30"
                            style={{ backgroundColor: pinColor }}
                          />
                        )}
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform group-hover:scale-125 ${
                            isSelected ? 'ring-2 ring-white scale-125' : ''
                          }`}
                          style={{ backgroundColor: '#0f172a', borderColor: pinColor }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pinColor }} />
                        </div>
                        <div
                          className="absolute left-7 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap bg-slate-950/90 border border-slate-700 text-white shadow-md"
                          style={{ borderColor: pinColor }}
                        >
                          {pin.entityCode}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* SCENARIO B: SVG Engineering Blueprint Canvas */
            <svg
              viewBox="0 0 1000 650"
              className="w-full h-auto drop-shadow-2xl"
              onClick={handleMapClick}
            >
              <defs>
                {/* Blueprint Grid Pattern */}
                <pattern id="cadGridUnified" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />
                </pattern>
                {/* Cable Tray Striping Pattern */}
                <pattern
                  id="cableTrayPatternUnified"
                  width="12"
                  height="12"
                  patternUnits="userSpaceOnUse"
                >
                  <path d="M 0 6 L 12 6" stroke="#06b6d4" strokeWidth="1.5" />
                  <path d="M 6 0 L 6 12" stroke="#0891b2" strokeWidth="1" />
                </pattern>
              </defs>

              {/* CAD Grid Background */}
              <rect width="1000" height="650" fill="#090d16" />
              <rect width="1000" height="650" fill="url(#cadGridUnified)" opacity="0.8" />

              {/* Diagonal Watermark for Fictional Demo Plan */}
              <text
                x="500"
                y="325"
                textAnchor="middle"
                fill="#ef4444"
                opacity="0.14"
                fontSize="36"
                fontWeight="900"
                transform="rotate(-15, 500, 325)"
                letterSpacing="2"
              >
                DEMO FLOOR PLAN — NOT FOR CONSTRUCTION
              </text>

              {/* Building Outer Slab Perimeter */}
              <rect
                x="40"
                y="40"
                width="920"
                height="570"
                fill="#0f172a"
                stroke="#334155"
                strokeWidth="3"
                rx="6"
              />

              {/* Column Grid Markers */}
              {['A', 'B', 'C', 'D', 'E'].map((col, idx) => (
                <g key={col} transform={`translate(${100 + idx * 200}, 25)`}>
                  <circle r="12" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {col}
                  </text>
                </g>
              ))}
              {[1, 2, 3, 4].map((row, idx) => (
                <g key={row} transform={`translate(20, ${100 + idx * 150})`}>
                  <circle r="12" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                  <text
                    textAnchor="middle"
                    dy="4"
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {row}
                  </text>
                </g>
              ))}

              {/* ======================================= */}
              {/* ROOMS & ZONES LAYER */}
              {/* ======================================= */}
              {showRooms && (
                <g id="rooms-layer-unified">
                  {/* Switch Room 01 (Primary Room) */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => handleRoomClick('Switch Room 01', 'L02-SR01')}
                    onMouseEnter={() => setHoveredRoom('Switch Room 01')}
                    onMouseLeave={() => setHoveredRoom(null)}
                  >
                    <rect
                      x="70"
                      y="70"
                      width="360"
                      height="320"
                      fill={hoveredRoom === 'Switch Room 01' ? '#1e293b' : '#141e33'}
                      stroke={hoveredRoom === 'Switch Room 01' ? '#fbbf24' : '#f59e0b'}
                      strokeWidth={hoveredRoom === 'Switch Room 01' ? '3.5' : '2.5'}
                      strokeDasharray="6,3"
                      rx="4"
                      className="transition-colors duration-200"
                    />
                    <rect
                      x="80"
                      y="80"
                      width="180"
                      height="26"
                      fill="#0f172a"
                      stroke="#334155"
                      rx="4"
                    />
                    <text
                      x="90"
                      y="97"
                      fill="#fbbf24"
                      fontSize="12"
                      fontWeight="bold"
                      letterSpacing="0.5"
                    >
                      SWITCH ROOM 01
                    </text>
                    <text x="90" y="122" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                      AREA: 115m² · FIRE COMPARTMENT A
                    </text>
                  </g>

                  {/* Battery & UPS Room */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => handleRoomClick('UPS & Battery Room 01', 'L02-UPS01')}
                    onMouseEnter={() => setHoveredRoom('UPS & Battery Room 01')}
                    onMouseLeave={() => setHoveredRoom(null)}
                  >
                    <rect
                      x="460"
                      y="70"
                      width="470"
                      height="220"
                      fill={hoveredRoom === 'UPS & Battery Room 01' ? '#1e293b' : '#111827'}
                      stroke={hoveredRoom === 'UPS & Battery Room 01' ? '#38bdf8' : '#0284c7'}
                      strokeWidth={hoveredRoom === 'UPS & Battery Room 01' ? '3' : '2'}
                      rx="4"
                      className="transition-colors duration-200"
                    />
                    <rect
                      x="475"
                      y="80"
                      width="210"
                      height="26"
                      fill="#0f172a"
                      stroke="#334155"
                      rx="4"
                    />
                    <text x="485" y="97" fill="#38bdf8" fontSize="12" fontWeight="bold">
                      UPS & BATTERY ROOM 01
                    </text>
                    <text x="485" y="122" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                      RATED: 2x 500kVA N+1 MODULAR
                    </text>
                  </g>

                  {/* Data Hall 01 */}
                  <g
                    className="cursor-pointer group"
                    onClick={() => handleRoomClick('Data Hall 01', 'L02-DH01')}
                    onMouseEnter={() => setHoveredRoom('Data Hall 01')}
                    onMouseLeave={() => setHoveredRoom(null)}
                  >
                    <rect
                      x="460"
                      y="320"
                      width="470"
                      height="260"
                      fill={hoveredRoom === 'Data Hall 01' ? '#1e293b' : '#0f172a'}
                      stroke={hoveredRoom === 'Data Hall 01' ? '#34d399' : '#10b981'}
                      strokeWidth={hoveredRoom === 'Data Hall 01' ? '3' : '2'}
                      rx="4"
                      className="transition-colors duration-200"
                    />
                    <rect
                      x="475"
                      y="335"
                      width="150"
                      height="26"
                      fill="#0f172a"
                      stroke="#334155"
                      rx="4"
                    />
                    <text x="485" y="352" fill="#34d399" fontSize="12" fontWeight="bold">
                      DATA HALL 01
                    </text>
                    <text x="485" y="377" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                      CAPACITY: 48 RACKS · DUAL A+B POD
                    </text>
                  </g>

                  {/* Service Corridor & Penetrations */}
                  <g>
                    <rect
                      x="70"
                      y="420"
                      width="360"
                      height="160"
                      fill="#0c1322"
                      stroke="#475569"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                      rx="4"
                    />
                    <text x="85" y="445" fill="#64748b" fontSize="11" fontWeight="bold">
                      HV/LV SERVICE RISER & TRENCH
                    </text>
                  </g>
                </g>
              )}

              {/* ======================================= */}
              {/* CONTAINMENT & CABLE TRAYS LAYER */}
              {/* ======================================= */}
              {showTrays && (
                <g id="trays-layer-unified">
                  {/* Primary 600mm HD Cable Ladder Route */}
                  <path
                    d="M 120 220 L 440 220 L 440 450 L 800 450"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.35"
                  />
                  <path
                    d="M 120 220 L 440 220 L 440 450 L 800 450"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2.5"
                    strokeDasharray="6,4"
                    strokeLinecap="round"
                  />
                  <text
                    x="230"
                    y="212"
                    fill="#22d3ee"
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    MAIN CABLE LADDER (600mm)
                  </text>

                  {/* Secondary UPS Feed Tray */}
                  <path
                    d="M 520 180 L 520 320 L 750 320"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="10"
                    strokeLinecap="round"
                    opacity="0.3"
                  />
                  <path
                    d="M 520 180 L 520 320 L 750 320"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                  />
                </g>
              )}

              {/* ======================================= */}
              {/* EQUIPMENT FOOTPRINTS LAYER */}
              {/* ======================================= */}
              {showEquipment && (
                <g id="equipment-layer-unified">
                  {/* UT-01 Unit Substation Footprint */}
                  <g
                    transform="translate(140, 160)"
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEquipmentClick('UT-01');
                    }}
                  >
                    <rect
                      width="180"
                      height="85"
                      fill="#1e3a8a"
                      stroke="#60a5fa"
                      strokeWidth="2"
                      rx="4"
                      className="group-hover:stroke-amber-400 group-hover:stroke-2 transition-colors"
                    />
                    <rect x="8" y="8" width="164" height="69" fill="#172554" rx="2" />
                    <text x="16" y="32" fill="#ffffff" fontSize="13" fontWeight="900">
                      UT-01
                    </text>
                    <text
                      x="16"
                      y="50"
                      fill="#93c5fd"
                      fontSize="9.5"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      SUBSTATION 2500kVA
                    </text>
                    <text x="16" y="65" fill="#60a5fa" fontSize="8.5">
                      PLINTH ANCHORED (PASS)
                    </text>
                  </g>

                  {/* MSB-01 Main Switchboard */}
                  <g
                    transform="translate(140, 275)"
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEquipmentClick('MSB-01');
                    }}
                  >
                    <rect
                      width="240"
                      height="65"
                      fill="#1e293b"
                      stroke="#94a3b8"
                      strokeWidth="2"
                      rx="4"
                      className="group-hover:stroke-amber-400 group-hover:stroke-2 transition-colors"
                    />
                    <text x="16" y="28" fill="#ffffff" fontSize="12" fontWeight="bold">
                      MSB-01 (MAIN SWITCHBOARD)
                    </text>
                    <text x="16" y="46" fill="#cbd5e1" fontSize="9" fontFamily="monospace">
                      4000A FORM 4B BUSBAR
                    </text>
                  </g>

                  {/* UPS-01 Modular Rack */}
                  <g
                    transform="translate(520, 130)"
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEquipmentClick('UPS-A01');
                    }}
                  >
                    <rect
                      width="150"
                      height="65"
                      fill="#0c4a6e"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      rx="4"
                    />
                    <text x="14" y="28" fill="#ffffff" fontSize="12" fontWeight="bold">
                      UPS-A01
                    </text>
                    <text x="14" y="46" fill="#7dd3fc" fontSize="9" fontFamily="monospace">
                      500kVA STATIC UPS
                    </text>
                  </g>

                  {/* PDU Footprints in Data Hall */}
                  <g
                    transform="translate(520, 420)"
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEquipmentClick('PDU-01');
                    }}
                  >
                    <rect
                      width="80"
                      height="55"
                      fill="#064e3b"
                      stroke="#34d399"
                      strokeWidth="1.5"
                      rx="4"
                    />
                    <text x="10" y="25" fill="#ffffff" fontSize="11" fontWeight="bold">
                      PDU-01
                    </text>
                    <text x="10" y="42" fill="#a7f3d0" fontSize="8" fontFamily="monospace">
                      POD A
                    </text>
                  </g>
                  <g
                    transform="translate(640, 420)"
                    className="cursor-pointer group"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEquipmentClick('PDU-02');
                    }}
                  >
                    <rect
                      width="80"
                      height="55"
                      fill="#064e3b"
                      stroke="#34d399"
                      strokeWidth="1.5"
                      rx="4"
                    />
                    <text x="10" y="25" fill="#ffffff" fontSize="11" fontWeight="bold">
                      PDU-02
                    </text>
                    <text x="10" y="42" fill="#a7f3d0" fontSize="8" fontFamily="monospace">
                      POD B
                    </text>
                  </g>
                </g>
              )}

              {/* ======================================= */}
              {/* SPATIAL QA PINS LAYER */}
              {/* ======================================= */}
              {showPins && (
                <g id="pins-layer-unified">
                  {filteredPins.map((pin) => {
                    // Map percentage coordinates (0-100) to SVG viewbox (1000x650)
                    const cx = (pin.x / 100) * 1000;
                    const cy = (pin.y / 100) * 650;
                    const isSelected = selectedPin?.id === pin.id;

                    const pinColor =
                      pin.status === 'Approved'
                        ? '#10b981'
                        : pin.status === 'Defect'
                        ? '#ef4444'
                        : pin.status === 'In Progress'
                        ? '#f59e0b'
                        : '#3b82f6';

                    return (
                      <g
                        key={pin.id}
                        transform={`translate(${cx}, ${cy})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (pin.entityType === 'Equipment') {
                            handleEquipmentClick(pin.entityCode);
                          } else if (pin.entityType === 'Issue') {
                            handleIssueClick(pin);
                          } else {
                            setSelectedPin(pin);
                          }
                        }}
                        className="cursor-pointer group"
                      >
                        {/* Animated radar wave for open defects or selected pin */}
                        {(pin.status === 'Defect' || isSelected) && (
                          <circle
                            r="20"
                            fill={pinColor}
                            opacity="0.25"
                            className="animate-ping"
                          />
                        )}

                        {/* Outer Glow Halo */}
                        <circle
                          r="14"
                          fill="#0f172a"
                          stroke={pinColor}
                          strokeWidth={isSelected ? '3' : '2'}
                          className="group-hover:scale-125 transition-transform drop-shadow-md"
                        />

                        {/* Inner Core */}
                        <circle r="7" fill={pinColor} />

                        {/* Entity Type Label / Badge */}
                        <g transform="translate(16, -10)" className="pointer-events-none">
                          <rect
                            x="-2"
                            y="-2"
                            width={pin.entityCode.length * 8 + 12}
                            height="18"
                            fill="#090d16"
                            stroke={pinColor}
                            strokeWidth="1"
                            rx="4"
                            opacity="0.9"
                          />
                          <text
                            x="4"
                            y="11"
                            fill="#ffffff"
                            fontSize="9.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {pin.entityCode}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Pending New Pin Indicator */}
              {pendingPinCoords && (
                <g
                  transform={`translate(${
                    (pendingPinCoords.x / 100) * 1000
                  }, ${(pendingPinCoords.y / 100) * 650})`}
                >
                  <circle r="22" fill="#f59e0b" opacity="0.3" className="animate-ping" />
                  <circle
                    r="16"
                    fill="#0f172a"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeDasharray="3,2"
                  />
                  <circle r="6" fill="#f59e0b" />
                </g>
              )}
            </svg>
          )}

          {/* Room Info Tooltip Overlay (when hovering rooms) */}
          {hoveredRoom && (
            <div className="absolute bottom-4 left-4 bg-slate-900/95 border border-amber-500/50 backdrop-blur-md px-4 py-2.5 rounded-xl shadow-2xl text-xs space-y-1 pointer-events-none z-30">
              <div className="flex items-center space-x-2 text-amber-400 font-bold">
                <Building2 className="w-3.5 h-3.5" />
                <span>{hoveredRoom}</span>
              </div>
              <div className="text-[11px] text-slate-300">
                {hoveredRoom === 'Switch Room 01' && 'Contains UT-01 Substation & MSB-01 · 100% Plinth Installed'}
                {hoveredRoom === 'UPS & Battery Room 01' && 'Contains 2x 500kVA UPS systems · DC battery cabling ongoing'}
                {hoveredRoom === 'Data Hall 01' && '48 Server Racks · Dual A+B feeds from PDU-01/02'}
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">
                Click room to open equipment, cables, inspections, and defect records.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Asset Quick Inspector (Opens when an equipment pin, issue pin, or asset is clicked) */}
      {selectedPin && (
        <AssetQuickInspector
          pin={selectedPin}
          onClose={() => setSelectedPin(null)}
          onOpenAsset={(entityType, entityId) => {
            if (entityType === 'Equipment') {
              setSelectedEquipmentId(entityId);
              setActiveTab('equipment');
            } else if (entityType === 'Cable') {
              setSelectedCableId(entityId);
              setActiveTab('cables');
            } else if (entityType === 'ITR') {
              setSelectedItrId(entityId);
              setActiveTab('itrs');
            } else if (entityType === 'Issue') {
              setActiveTab('issues');
            }
          }}
        />
      )}

      {/* Modal: Anchor New Spatial QA Pin */}
      {pendingPinCoords && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Crosshair className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Anchor Spatial QA Pin</h3>
              </div>
              <button
                onClick={() => setPendingPinCoords(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3.5">
              <div className="text-xs text-slate-400 font-mono bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                Coordinates: X: {pendingPinCoords.x}%, Y: {pendingPinCoords.y}% on {levelLocation.name}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Entity Type
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Equipment', 'Cable', 'ITR', 'Issue'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewPinEntityType(type)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        newPinEntityType === type
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tag / Code
                </label>
                <input
                  type="text"
                  required
                  value={newPinEntityCode}
                  onChange={(e) => setNewPinEntityCode(e.target.value)}
                  placeholder="e.g. UT-01, CB-001, ISS-002"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Pin Title / Label
                </label>
                <input
                  type="text"
                  required
                  value={newPinTitle}
                  onChange={(e) => setNewPinTitle(e.target.value)}
                  placeholder="e.g. Plinth Inspection Point"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Status
                </label>
                <select
                  value={newPinStatus}
                  onChange={(e) => setNewPinStatus(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Installed">Installed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Approved">Approved</option>
                  <option value="Defect">Defect</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Field Notes / Remarks
                </label>
                <textarea
                  value={newPinNotes}
                  onChange={(e) => setNewPinNotes(e.target.value)}
                  rows={2}
                  placeholder="Engineering notes or observations..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPendingPinCoords(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
                >
                  Anchor Pin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
