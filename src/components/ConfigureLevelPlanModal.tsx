import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Upload,
  Layers,
  Check,
  X,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Plus,
  Info,
  FileCheck,
  CheckCircle2,
  Edit3,
  ShieldCheck,
  History,
  FileText,
} from 'lucide-react';
import {
  LocationNode,
  HotspotPoint,
  RoomHotspotConfig,
  DetectedRoomCandidate,
} from '../types/index.ts';

export type { RoomHotspotConfig };
import {
  analyzeDrawingForRooms,
  polygonToRect,
  rectToPolygon,
} from '../lib/roomDetectionEngine.ts';
import { parsePdfDocument, ExtractedPdfTextItem } from '../lib/pdfParser.ts';

interface ConfigureLevelPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelLocation: LocationNode;
  childLocations: LocationNode[];
  currentPlan?: {
    configured: boolean;
    drawingNumber?: string;
    title?: string;
    fileUrl?: string;
    pageNumber?: number;
    pageCount?: number;
    revision?: string;
    hotspots?: RoomHotspotConfig[];
  } | null;
  onSaveSuccess: () => void;
}

export const ConfigureLevelPlanModal: React.FC<ConfigureLevelPlanModalProps> = ({
  isOpen,
  onClose,
  levelLocation,
  childLocations,
  currentPlan,
  onSaveSuccess,
}) => {
  const { apiFetch, addToast, activeProject } = useApp();

  const [step, setStep] = useState<'upload' | 'mapping'>('upload');
  const [drawingNumber, setDrawingNumber] = useState(
    currentPlan?.drawingNumber || `A-${levelLocation.code || '201'}`
  );
  const [drawingTitle, setDrawingTitle] = useState(
    currentPlan?.title || `${levelLocation.name} General Arrangement & Architectural Plan`
  );
  const [revision, setRevision] = useState(currentPlan?.revision || 'Rev C');
  const [fileUrl, setFileUrl] = useState<string>(currentPlan?.fileUrl || '');
  const [fileName, setFileName] = useState<string>('');
  const [isPdf, setIsPdf] = useState<boolean>(false);
  const [pageNumber, setPageNumber] = useState<number>(currentPlan?.pageNumber || 1);
  const [pageCount, setPageCount] = useState<number>(currentPlan?.pageCount || 1);

  // Cached raw PDF bytes for instant multi-page switching
  const [cachedPdfBytes, setCachedPdfBytes] = useState<ArrayBuffer | null>(null);
  const [rawTextItems, setRawTextItems] = useState<ExtractedPdfTextItem[]>([]);
  const [isScannedDrawing, setIsScannedDrawing] = useState<boolean>(false);

  // Confirmed Hotspots list
  const [hotspots, setHotspots] = useState<RoomHotspotConfig[]>(currentPlan?.hotspots || []);
  const [activeLocationToMap, setActiveLocationToMap] = useState<LocationNode | null>(
    childLocations[0] || null
  );

  // Assisted detection state
  const [detectedCandidates, setDetectedCandidates] = useState<DetectedRoomCandidate[]>([]);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [candidateFilter, setCandidateFilter] = useState<
    'ALL' | 'HIGH' | 'NEEDS_REVIEW' | 'UNMATCHED' | 'CONFIRMED'
  >('ALL');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Active mapping mode
  const [mappingMode, setMappingMode] = useState<'assisted' | 'manual'>('assisted');
  const [manualTool, setManualTool] = useState<'rectangle' | 'polygon'>('rectangle');
  const [manualPolygonPoints, setManualPolygonPoints] = useState<HotspotPoint[]>([]);

  // Polygon Boundary Editing State
  const [editingPolygon, setEditingPolygon] = useState<HotspotPoint[] | null>(null);
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [isDraggingVertex, setIsDraggingVertex] = useState<boolean>(false);

  // Manual drag rect state
  const [isDrawingRect, setIsDrawingRect] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentDragRect, setCurrentDragRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Revision comparison toggle
  const [showPreviousRevisionRef, setShowPreviousRevisionRef] = useState<boolean>(true);

  // Quick Location Creation Modal for Unmatched Drawing Rooms
  const [isCreateLocationModalOpen, setIsCreateLocationModalOpen] = useState<boolean>(false);
  const [createLocName, setCreateLocName] = useState<string>('');
  const [createLocCode, setCreateLocCode] = useState<string>('');
  const [creatingLocation, setCreatingLocation] = useState<boolean>(false);
  const [pendingUnmatchedCandidate, setPendingUnmatchedCandidate] =
    useState<DetectedRoomCandidate | null>(null);

  // Bulk review modal
  const [isBulkReviewModalOpen, setIsBulkReviewModalOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset when plan changes
  useEffect(() => {
    if (currentPlan?.configured) {
      setDrawingNumber(currentPlan.drawingNumber || `A-${levelLocation.code}`);
      setDrawingTitle(currentPlan.title || `${levelLocation.name} Plan`);
      setFileUrl(currentPlan.fileUrl || '');
      setPageNumber(currentPlan.pageNumber || 1);
      setHotspots(currentPlan.hotspots || []);
      setRevision(currentPlan.revision || 'Rev C');
      if (currentPlan.fileUrl) {
        setStep('mapping');
      }
    } else {
      setStep('upload');
    }
  }, [currentPlan, levelLocation]);

  if (!isOpen) return null;

  // Process genuine PDF file buffer through pdfjs-dist
  const processPdfBuffer = async (pdfBuffer: ArrayBuffer, pageNumToLoad = 1) => {
    setAnalyzing(true);
    try {
      const parsed = await parsePdfDocument(pdfBuffer, pageNumToLoad);
      setPageCount(parsed.pageCount);
      setPageNumber(parsed.pageNumber);
      setRawTextItems(parsed.textItems);
      setIsScannedDrawing(parsed.isScannedOrNoText);

      if (parsed.renderedImageDataUrl) {
        setFileUrl(parsed.renderedImageDataUrl);
      }

      // Genuinely analyze extracted text items against current project & level
      const { candidates } = analyzeDrawingForRooms({
        textItems: parsed.textItems,
        levelLocation,
        childLocations,
        previousRevisionHotspots: currentPlan?.hotspots || [],
      });

      setDetectedCandidates(candidates);
      if (candidates.length > 0) {
        setSelectedCandidateId(candidates[0].id);
        setEditingPolygon(candidates[0].polygon);
        setMappingMode('assisted');
      } else {
        setMappingMode('manual');
      }

      setStep('mapping');
      addToast(
        'success',
        'PDF Parsed & Analyzed',
        parsed.isScannedOrNoText
          ? `Sheet ${parsed.pageNumber} is a scanned/raster drawing. Map boundaries manually.`
          : `Genuinely extracted ${parsed.textItems.length} text items on Sheet ${parsed.pageNumber}. Found ${candidates.length} room candidates.`
      );
    } catch (err: any) {
      console.error('PDF parsing error:', err);
      addToast('error', 'PDF Parsing Failed', err.message || 'Could not parse PDF document.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Handle local file selection with strict SVG blocking
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. STRICT SECURITY: REJECT ARBITRARY SVG UPLOADS
    const isSvg =
      file.type === 'image/svg+xml' ||
      file.name.toLowerCase().endsWith('.svg');

    if (isSvg) {
      addToast(
        'error',
        'SVG Upload Rejected',
        'For security, only PDF, PNG, and JPEG construction drawings are permitted. SVG uploads are blocked.'
      );
      if (e.target) e.target.value = '';
      return;
    }

    // 2. MIME & EXTENSION VALIDATION
    const isFilePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage =
      file.type === 'image/png' ||
      file.type === 'image/jpeg' ||
      file.type === 'image/jpg' ||
      /\.(png|jpe?g)$/i.test(file.name);

    if (!isFilePdf && !isImage) {
      addToast(
        'error',
        'Unsupported File Type',
        'Please upload a genuine PDF, PNG, or JPEG construction drawing.'
      );
      if (e.target) e.target.value = '';
      return;
    }

    setFileName(file.name);

    // 3. IF PDF: GENUINELY PARSE EMBEDDED TEXT STREAM & RENDER TO CANVAS
    if (isFilePdf) {
      setIsPdf(true);
      const arrayBuffer = await file.arrayBuffer();
      setCachedPdfBytes(arrayBuffer);
      await processPdfBuffer(arrayBuffer, 1);
      return;
    }

    // 4. IF RASTER PNG / JPEG IMAGE: LOAD GENUINE IMAGE, DO NOT FABRICATE BOUNDARIES
    if (isImage) {
      setIsPdf(false);
      setCachedPdfBytes(null);
      setRawTextItems([]);
      setIsScannedDrawing(true);
      setDetectedCandidates([]);
      setMappingMode('manual');

      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const dataUrl = loadEvt.target?.result as string;
        setFileUrl(dataUrl);
        setStep('mapping');
        addToast(
          'info',
          'Raster Drawing Loaded',
          'Image uploaded. Automatic boundary detection is unavailable for raster drawings. Please map room boundaries manually.'
        );
      };
      reader.readAsDataURL(file);
    }
  };

  // Controlled test PDF containing genuine room labels:
  // SWITCH ROOM 01 [L02-SR01], DATA HALL 01 [L02-DH01], UPS ROOM 01 [L02-UPS01], SERVICE CORRIDOR
  const handleLoadControlledTestPdf = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/test-construction-drawing.pdf');
      if (!res.ok) throw new Error('Test PDF file not found in public folder');
      const arrayBuffer = await res.arrayBuffer();
      setCachedPdfBytes(arrayBuffer);
      setFileName('test-construction-drawing.pdf');
      setIsPdf(true);
      setDrawingNumber(`MEL02-A-201`);
      setDrawingTitle(`${levelLocation.name} General Arrangement Floor Plan`);
      setRevision('Rev C');

      await processPdfBuffer(arrayBuffer, 1);
    } catch (err: any) {
      console.error('Failed to load test PDF:', err);
      addToast('error', 'Test PDF Failed', err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  // Multi-page PDF Sheet switching
  const handlePageChange = async (newPage: number) => {
    setPageNumber(newPage);
    if (cachedPdfBytes) {
      await processPdfBuffer(cachedPdfBytes, newPage);
    }
  };

  // Convert mouse event coordinates to normalized drawing percentage (0 - 100)
  const getNormalizedCoords = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = canvasContainerRef.current;
    if (!container) return { x: 0, y: 0 };
    const rect = container.getBoundingClientRect();
    const xPct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    return {
      x: Math.round(xPct * 10) / 10,
      y: Math.round(yPct * 10) / 10,
    };
  };

  // Canvas Mouse Down
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getNormalizedCoords(e);

    // If currently editing a polygon and clicked near a vertex
    if (editingPolygon && editingPolygon.length > 0) {
      const vIndex = editingPolygon.findIndex(
        (p) => Math.hypot(p.x - coords.x, p.y - coords.y) < 2.5
      );
      if (vIndex !== -1) {
        setSelectedVertexIndex(vIndex);
        setIsDraggingVertex(true);
        return;
      }
    }

    // Manual Rectangle Drawing Mode
    if (mappingMode === 'manual' && manualTool === 'rectangle') {
      if (!activeLocationToMap) {
        addToast('info', 'Select Room First', 'Choose an existing room from the list on the left.');
        return;
      }
      setIsDrawingRect(true);
      setDragStart(coords);
      setCurrentDragRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
      return;
    }

    // Manual Polygon Point Addition
    if (mappingMode === 'manual' && manualTool === 'polygon') {
      if (!activeLocationToMap) {
        addToast('info', 'Select Room First', 'Choose an existing room to map.');
        return;
      }
      setManualPolygonPoints((prev) => [...prev, coords]);
    }
  };

  // Canvas Mouse Move
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getNormalizedCoords(e);

    // Dragging polygon vertex
    if (isDraggingVertex && editingPolygon && selectedVertexIndex !== null) {
      const updated = [...editingPolygon];
      updated[selectedVertexIndex] = coords;
      setEditingPolygon(updated);
      return;
    }

    // Dragging manual rectangle
    if (isDrawingRect && dragStart) {
      const x = Math.min(dragStart.x, coords.x);
      const y = Math.min(dragStart.y, coords.y);
      const width = Math.abs(coords.x - dragStart.x);
      const height = Math.abs(coords.y - dragStart.y);

      setCurrentDragRect({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
      });
    }
  };

  // Canvas Mouse Up
  const handleCanvasMouseUp = () => {
    setIsDraggingVertex(false);

    if (isDrawingRect && currentDragRect && activeLocationToMap) {
      if (currentDragRect.width >= 2 && currentDragRect.height >= 2) {
        const poly = rectToPolygon(currentDragRect);
        const newHotspot: RoomHotspotConfig = {
          id: `hotspot-${activeLocationToMap.id}`,
          locationId: activeLocationToMap.id,
          locationCode: activeLocationToMap.code,
          locationName: activeLocationToMap.name,
          rect: currentDragRect,
          points: poly,
          color: '#f59e0b',
          confidence: 'HIGH',
          detectionSource: 'manual',
          confirmedAt: new Date().toISOString(),
        };

        setHotspots((prev) => {
          const filtered = prev.filter((h) => h.locationId !== activeLocationToMap.id);
          return [...filtered, newHotspot];
        });

        addToast(
          'success',
          'Room Hotspot Mapped',
          `Mapped ${activeLocationToMap.name} (${activeLocationToMap.code}) with normalized coordinates.`
        );
      }
      setIsDrawingRect(false);
      setDragStart(null);
      setCurrentDragRect(null);
    }
  };

  // Commit manual polygon
  const handleFinishManualPolygon = () => {
    if (manualPolygonPoints.length < 3 || !activeLocationToMap) {
      addToast('error', 'Incomplete Polygon', 'Please click at least 3 points to enclose a room.');
      return;
    }
    const rect = polygonToRect(manualPolygonPoints);
    const newHotspot: RoomHotspotConfig = {
      id: `hotspot-${activeLocationToMap.id}`,
      locationId: activeLocationToMap.id,
      locationCode: activeLocationToMap.code,
      locationName: activeLocationToMap.name,
      rect,
      points: manualPolygonPoints,
      color: '#f59e0b',
      confidence: 'HIGH',
      detectionSource: 'manual',
      confirmedAt: new Date().toISOString(),
    };

    setHotspots((prev) => {
      const filtered = prev.filter((h) => h.locationId !== activeLocationToMap.id);
      return [...filtered, newHotspot];
    });

    addToast('success', 'Polygon Mapped', `Saved boundary for ${activeLocationToMap.name}`);
    setManualPolygonPoints([]);
  };

  // Add vertex to active polygon
  const handleAddVertexToEdge = (edgeIndex: number) => {
    if (!editingPolygon || editingPolygon.length === 0) return;
    const p1 = editingPolygon[edgeIndex];
    const p2 = editingPolygon[(edgeIndex + 1) % editingPolygon.length];
    const newVertex: HotspotPoint = {
      x: Math.round(((p1.x + p2.x) / 2) * 10) / 10,
      y: Math.round(((p1.y + p2.y) / 2) * 10) / 10,
    };
    const updated = [...editingPolygon];
    updated.splice(edgeIndex + 1, 0, newVertex);
    setEditingPolygon(updated);
    setSelectedVertexIndex(edgeIndex + 1);
    addToast('info', 'Vertex Added', 'Drag the new vertex to adjust room wall boundary.');
  };

  // Delete selected vertex
  const handleDeleteSelectedVertex = () => {
    if (!editingPolygon || selectedVertexIndex === null || editingPolygon.length <= 3) {
      addToast('info', 'Cannot Delete', 'A room polygon must have at least 3 vertices.');
      return;
    }
    const updated = editingPolygon.filter((_, i) => i !== selectedVertexIndex);
    setEditingPolygon(updated);
    setSelectedVertexIndex(null);
  };

  // CONFIRM A SUGGESTED CANDIDATE AS AN OFFICIAL HOTSPOT
  const handleConfirmCandidate = (candidate: DetectedRoomCandidate) => {
    const locId = candidate.suggestedLocationId;
    if (!locId) {
      addToast('error', 'Location Required', 'Select an existing location before confirming.');
      return;
    }

    // STRICT CHECK: LOCATION MUST BELONG TO THIS LEVEL AND PROJECT
    const matchedLocation = childLocations.find((l) => l.id === locId);
    if (!matchedLocation) {
      addToast('error', 'Cross-Level Blocked', `Location does not belong to ${levelLocation.name}.`);
      return;
    }

    const polyToUse =
      selectedCandidateId === candidate.id && editingPolygon
        ? editingPolygon
        : candidate.polygon;
    const rectToUse = polygonToRect(polyToUse);

    const newHotspot: RoomHotspotConfig = {
      id: `hotspot-${matchedLocation.id}`,
      locationId: matchedLocation.id,
      locationCode: matchedLocation.code,
      locationName: matchedLocation.name,
      rect: rectToUse,
      points: polyToUse,
      color: '#10b981',
      confidence: candidate.confidence,
      detectionSource: 'assisted_vector',
      confirmedAt: new Date().toISOString(),
    };

    setHotspots((prev) => {
      const filtered = prev.filter((h) => h.locationId !== matchedLocation.id);
      return [...filtered, newHotspot];
    });

    setDetectedCandidates((prev) =>
      prev.map((c) => (c.id === candidate.id ? { ...c, status: 'confirmed' } : c))
    );

    addToast(
      'success',
      'Hotspot Confirmed',
      `Mapped ${matchedLocation.name} (${matchedLocation.code}) to ${levelLocation.name}.`
    );
  };

  // Change location binding for a candidate
  const handleChangeCandidateLocation = (candidateId: string, newLocId: number) => {
    const loc = childLocations.find((l) => l.id === newLocId);
    if (!loc) return;

    setDetectedCandidates((prev) =>
      prev.map((c) =>
        c.id === candidateId
          ? {
              ...c,
              suggestedLocationId: loc.id,
              suggestedLocationCode: loc.code,
              suggestedLocationName: loc.name,
              matchType: 'EXACT_CODE',
              confidence: 'HIGH',
              confidenceScore: 90,
            }
          : c
      )
    );
    addToast('info', 'Location Changed', `Candidate linked to ${loc.name} (${loc.code})`);
  };

  // Ignore / Reject candidate (false positive, title block, legend)
  const handleIgnoreCandidate = (candidateId: string) => {
    setDetectedCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, status: 'ignored' } : c))
    );
    addToast('info', 'Candidate Ignored', 'Item removed from active suggestions.');
  };

  // Remove existing hotspot
  const handleRemoveHotspot = (locationId: number) => {
    setHotspots((prev) => prev.filter((h) => h.locationId !== locationId));
    setDetectedCandidates((prev) =>
      prev.map((c) => (c.suggestedLocationId === locationId ? { ...c, status: 'pending' } : c))
    );
    addToast('info', 'Hotspot Removed', 'Room unmapped from plan.');
  };

  // Bulk confirm all high confidence matches
  const handleBulkConfirmHighConfidence = () => {
    const highCandidates = detectedCandidates.filter(
      (c) => c.status === 'pending' && c.confidence === 'HIGH' && c.suggestedLocationId
    );

    if (highCandidates.length === 0) {
      addToast('info', 'No High-Confidence Matches', 'All high-confidence items are already confirmed.');
      return;
    }

    let count = 0;
    const newHotspots: RoomHotspotConfig[] = [...hotspots];

    highCandidates.forEach((cand) => {
      const loc = childLocations.find((l) => l.id === cand.suggestedLocationId);
      if (!loc) return;

      const poly = cand.polygon;
      const rect = polygonToRect(poly);

      const existingIdx = newHotspots.findIndex((h) => h.locationId === loc.id);
      const entry: RoomHotspotConfig = {
        id: `hotspot-${loc.id}`,
        locationId: loc.id,
        locationCode: loc.code,
        locationName: loc.name,
        rect,
        points: poly,
        color: '#10b981',
        confidence: 'HIGH',
        detectionSource: 'assisted_vector',
        confirmedAt: new Date().toISOString(),
      };

      if (existingIdx !== -1) {
        newHotspots[existingIdx] = entry;
      } else {
        newHotspots.push(entry);
      }
      count++;
    });

    setHotspots(newHotspots);
    setDetectedCandidates((prev) =>
      prev.map((c) =>
        highCandidates.some((hc) => hc.id === c.id) ? { ...c, status: 'confirmed' } : c
      )
    );
    setIsBulkReviewModalOpen(false);

    addToast('success', 'Bulk Confirmation Complete', `Confirmed ${count} high-confidence room hotspots.`);
  };

  // Handle explicit creation of location for unmatched drawing rooms
  const handleOpenCreateLocation = (candidate: DetectedRoomCandidate) => {
    setPendingUnmatchedCandidate(candidate);
    setCreateLocName(candidate.extractedName || candidate.rawText);
    setCreateLocCode(candidate.extractedCode || `L02-${candidate.extractedName?.slice(0, 4).toUpperCase() || 'RM01'}`);
    setIsCreateLocationModalOpen(true);
  };

  const handleCreateLocationConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createLocName.trim() || !createLocCode.trim() || !pendingUnmatchedCandidate) return;

    setCreatingLocation(true);
    try {
      const res = await apiFetch('/api/locations', {
        method: 'POST',
        body: JSON.stringify({
          projectId: activeProject?.id || 1,
          parentId: levelLocation.id,
          name: createLocName.trim(),
          code: createLocCode.trim().toUpperCase(),
          type: 'Room',
        }),
      });

      if (res.ok) {
        const createdLoc: LocationNode = await res.json();
        addToast(
          'success',
          'Location Created',
          `Created ${createdLoc.name} (${createdLoc.code}) on ${levelLocation.name}`
        );

        // Update candidate with new location binding
        const updatedCandidate: DetectedRoomCandidate = {
          ...pendingUnmatchedCandidate,
          suggestedLocationId: createdLoc.id,
          suggestedLocationCode: createdLoc.code,
          suggestedLocationName: createdLoc.name,
          matchType: 'EXACT_CODE',
          confidence: 'HIGH',
          confidenceScore: 100,
        };

        setDetectedCandidates((prev) =>
          prev.map((c) => (c.id === pendingUnmatchedCandidate.id ? updatedCandidate : c))
        );

        handleConfirmCandidate(updatedCandidate);

        setIsCreateLocationModalOpen(false);
        setPendingUnmatchedCandidate(null);
      } else {
        const err = await res.json();
        addToast('error', 'Creation Failed', err.error || 'Server error');
      }
    } catch (err: any) {
      addToast('error', 'Network Error', err.message);
    } finally {
      setCreatingLocation(false);
    }
  };

  // Save full configuration to backend
  const handleSaveConfiguration = async () => {
    if (!fileUrl) {
      addToast('error', 'Missing Drawing', 'Please upload or select an architectural plan sheet.');
      return;
    }

    if (hotspots.length === 0) {
      addToast('error', 'No Rooms Mapped', 'Confirm at least one room hotspot over the plan before saving.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/api/locations/${levelLocation.id}/plan`, {
        method: 'POST',
        body: JSON.stringify({
          drawingNumber: drawingNumber.trim().toUpperCase(),
          title: drawingTitle.trim(),
          fileUrl,
          pageNumber,
          pageCount,
          hotspots,
          revision,
        }),
      });

      if (res.ok) {
        addToast(
          'success',
          'Level Plan Configured',
          `Saved ${drawingNumber} with ${hotspots.length} confirmed room hotspots linked to existing locations.`
        );
        onSaveSuccess();
        onClose();
      } else {
        const err = await res.json();
        addToast('error', 'Failed to Save Plan', err.error || 'Server error');
      }
    } catch (err: any) {
      addToast('error', 'Network Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  // Filtered detected candidates
  const filteredCandidates = detectedCandidates.filter((c) => {
    if (c.status === 'ignored') return false;
    if (candidateFilter === 'CONFIRMED') return c.status === 'confirmed';
    if (candidateFilter === 'HIGH') return c.confidence === 'HIGH' && c.status === 'pending';
    if (candidateFilter === 'NEEDS_REVIEW')
      return (c.confidence === 'MEDIUM' || c.confidence === 'LOW') && c.status === 'pending' && c.suggestedLocationId;
    if (candidateFilter === 'UNMATCHED')
      return !c.suggestedLocationId && c.status === 'pending';
    return true;
  });

  // Candidate summary counts
  const countDetected = detectedCandidates.filter((c) => !c.isTitleBlockOrLegend && c.status !== 'ignored').length;
  const countHigh = detectedCandidates.filter((c) => c.confidence === 'HIGH' && c.status === 'pending' && c.suggestedLocationId).length;
  const countNeedsReview = detectedCandidates.filter(
    (c) => (c.confidence === 'MEDIUM' || c.confidence === 'LOW') && c.status === 'pending' && c.suggestedLocationId
  ).length;
  const countUnmatched = detectedCandidates.filter((c) => !c.suggestedLocationId && c.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-7xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-white">Configure Level Plan &amp; Room Hotspots</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {levelLocation.name} ({levelLocation.code})
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                  {revision}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Assisted room detection and editable normalized polygons linked strictly to existing locations.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setStep(step === 'upload' ? 'mapping' : 'upload')}
              disabled={!fileUrl}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                !fileUrl
                  ? 'opacity-40 cursor-not-allowed text-slate-600'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {step === 'upload' ? 'Go to Hotspot Mapper →' : '← Drawing Details'}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: UPLOAD & DRAWING DETAILS */}
        {step === 'upload' && (
          <div className="p-6 overflow-y-auto space-y-6 flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Upload Box */}
              <div className="space-y-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  1. Real Construction Drawing File *
                </label>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-amber-500/60 bg-slate-950/60 p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
                >
                  <Upload className="w-10 h-10 text-slate-500 group-hover:text-amber-400 mb-3 transition-colors" />
                  <p className="text-sm font-bold text-white group-hover:text-amber-300">
                    Click to Upload Untouched Construction Drawing
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Accepts untouched PDF drawings, high-resolution PNG or JPEG plans. SVG uploads are blocked for security.
                  </p>
                  {fileName && (
                    <div className="mt-3 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-400">
                      Loaded: {fileName}
                    </div>
                  )}
                  {/* ONLY ALLOW PDF, PNG, JPEG */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-mono text-[11px]">Verify PDF text extraction:</span>
                  <button
                    type="button"
                    onClick={handleLoadControlledTestPdf}
                    className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer flex items-center space-x-1"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Load Controlled Untouched Test PDF</span>
                  </button>
                </div>
              </div>

              {/* Right: Drawing Attributes & Sheet/PDF Page Selection */}
              <div className="space-y-4 bg-slate-950/40 border border-slate-800 p-5 rounded-2xl">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  2. Drawing Metadata &amp; Sheet Selection
                </label>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Drawing Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={drawingNumber}
                    onChange={(e) => setDrawingNumber(e.target.value)}
                    placeholder="e.g. A-201 or MEL02-E-102"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                    Drawing Sheet Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={drawingTitle}
                    onChange={(e) => setDrawingTitle(e.target.value)}
                    placeholder="e.g. Level 02 General Arrangement Floor Plan"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      Revision
                    </label>
                    <input
                      type="text"
                      value={revision}
                      onChange={(e) => setRevision(e.target.value)}
                      placeholder="Rev C"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                      PDF Page Selection
                    </label>
                    <select
                      value={pageNumber}
                      onChange={(e) => handlePageChange(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                    >
                      {Array.from({ length: pageCount }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          Page / Sheet {i + 1} of {pageCount}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!fileUrl) {
                        addToast('error', 'Drawing Required', 'Please upload a drawing or load test PDF.');
                        return;
                      }
                      setStep('mapping');
                    }}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                  >
                    Proceed to Room Hotspot Mapping →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: INTERACTIVE ROOM HOTSPOT MAPPER & ASSISTED DETECTION */}
        {step === 'mapping' && (
          <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
            {/* Left Column: Assisted Detection Review & Room Management */}
            <div className="lg:col-span-5 p-4 overflow-y-auto space-y-4 max-h-[60vh] lg:max-h-none bg-slate-900/60 flex flex-col">
              {/* Mode Switcher: Assisted vs Manual */}
              <div className="flex items-center justify-between bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setMappingMode('assisted')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mappingMode === 'assisted'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Assisted Detection</span>
                  </button>
                  <button
                    onClick={() => setMappingMode('manual')}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      mappingMode === 'manual'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Manual Mapping</span>
                  </button>
                </div>

                {cachedPdfBytes && (
                  <button
                    type="button"
                    onClick={() => processPdfBuffer(cachedPdfBytes, pageNumber)}
                    disabled={analyzing}
                    className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Re-run PDF text analysis"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin text-amber-400' : ''}`} />
                  </button>
                )}
              </div>

              {/* ASSISTED DETECTION INTERFACE */}
              {mappingMode === 'assisted' && (
                <div className="space-y-3 flex-1 flex flex-col">
                  {/* SCANNED OR RASTER NOTICE: NO FABRICATED BOUNDARIES */}
                  {isScannedDrawing && detectedCandidates.length === 0 ? (
                    <div className="bg-slate-950/80 border border-slate-800 p-5 rounded-2xl space-y-3 text-center">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                        <Info className="w-5 h-5" />
                      </div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Automatic boundary detection is unavailable for this drawing
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                        This drawing contains raster linework or scanned content without embedded vector text streams. No boundaries are fabricated. You can map locations manually using Quick Rectangle or Polygon.
                      </p>
                      <button
                        type="button"
                        onClick={() => setMappingMode('manual')}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded-xl transition-colors shadow-md cursor-pointer"
                      >
                        Switch to Manual Mapping Mode →
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Summary Bar: LEVEL 02 — DETECTED LOCATIONS */}
                      <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                            <span>{levelLocation.name.toUpperCase()} — DETECTED LOCATIONS</span>
                          </span>
                          {countHigh > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsBulkReviewModalOpen(true)}
                              className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Review &amp; Confirm High ({countHigh})
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                          <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
                            <div className="text-slate-400 text-[9px] uppercase">Detected</div>
                            <div className="text-sm font-bold text-white">{countDetected}</div>
                          </div>
                          <div className="bg-slate-900 border border-emerald-500/30 p-1.5 rounded-xl">
                            <div className="text-emerald-400 text-[9px] uppercase">High Conf</div>
                            <div className="text-sm font-bold text-emerald-300">{countHigh}</div>
                          </div>
                          <div className="bg-slate-900 border border-amber-500/30 p-1.5 rounded-xl">
                            <div className="text-amber-400 text-[9px] uppercase">Needs Review</div>
                            <div className="text-sm font-bold text-amber-300">{countNeedsReview}</div>
                          </div>
                          <div className="bg-slate-900 border border-rose-500/30 p-1.5 rounded-xl">
                            <div className="text-rose-400 text-[9px] uppercase">Unmatched</div>
                            <div className="text-sm font-bold text-rose-300">{countUnmatched}</div>
                          </div>
                        </div>
                      </div>

                      {/* Filter Pills */}
                      <div className="flex items-center space-x-1 text-[10px] overflow-x-auto pb-1">
                        {(['ALL', 'HIGH', 'NEEDS_REVIEW', 'UNMATCHED', 'CONFIRMED'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setCandidateFilter(f)}
                            className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-colors shrink-0 ${
                              candidateFilter === f
                                ? 'bg-slate-800 text-amber-400 border border-slate-700'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {f.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      {/* Detected Candidates List */}
                      <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                        {filteredCandidates.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800">
                            No detected items match this filter.
                          </div>
                        ) : (
                          filteredCandidates.map((cand) => {
                            const isSelected = selectedCandidateId === cand.id;
                            const isConfirmed = cand.status === 'confirmed';

                            return (
                              <div
                                key={cand.id}
                                onClick={() => {
                                  setSelectedCandidateId(cand.id);
                                  setEditingPolygon(cand.polygon);
                                  setSelectedVertexIndex(null);
                                }}
                                className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-2.5 ${
                                  isSelected
                                    ? 'bg-amber-500/15 border-amber-500/60 shadow-md ring-1 ring-amber-500/30'
                                    : isConfirmed
                                    ? 'bg-emerald-950/20 border-emerald-500/30 text-slate-300 hover:bg-slate-850'
                                    : 'bg-slate-850 border-slate-800 hover:border-slate-700'
                                }`}
                              >
                                {/* Card Top: Raw Detected Text & Confidence Badge */}
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                                      Extracted from PDF:
                                    </span>
                                    <h4 className="text-xs font-bold text-white leading-tight">
                                      {cand.rawText}
                                    </h4>
                                  </div>

                                  <div className="flex flex-col items-end shrink-0">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${
                                        cand.confidence === 'HIGH'
                                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                          : cand.confidence === 'MEDIUM'
                                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                      }`}
                                    >
                                      {cand.confidence} ({cand.confidenceScore}%)
                                    </span>
                                    <span className="text-[8.5px] text-slate-500 mt-0.5">Advisory only</span>
                                  </div>
                                </div>

                                {/* Previous Revision Notice */}
                                {cand.hasPreviousRevisionMatch && (
                                  <div className="flex items-center space-x-1.5 text-[10px] text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-1 rounded-lg">
                                    <History className="w-3 h-3 shrink-0" />
                                    <span>
                                      Previous mapping available ({cand.previousRevisionCode}) · Detected new boundary
                                    </span>
                                  </div>
                                )}

                                {/* Suggested Existing Location Link */}
                                {cand.suggestedLocationId ? (
                                  <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl flex items-center justify-between text-xs">
                                    <div>
                                      <div className="text-[10px] text-slate-400 font-semibold uppercase">
                                        Suggested Existing Location:
                                      </div>
                                      <div className="font-bold text-white flex items-center space-x-1.5">
                                        <span className="font-mono text-amber-400">
                                          {cand.suggestedLocationCode}
                                        </span>
                                        <span>—</span>
                                        <span>{cand.suggestedLocationName}</span>
                                      </div>
                                    </div>

                                    <select
                                      value={cand.suggestedLocationId}
                                      onChange={(e) =>
                                        handleChangeCandidateLocation(cand.id, Number(e.target.value))
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[11px] bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 max-w-[120px] truncate"
                                    >
                                      {childLocations.map((loc) => (
                                        <option key={loc.id} value={loc.id}>
                                          {loc.code} ({loc.name})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  /* UNMATCHED ROOM SCENARIO */
                                  <div className="bg-rose-950/30 border border-rose-500/40 p-2.5 rounded-xl space-y-2">
                                    <div className="flex items-center space-x-2 text-rose-300 text-xs font-bold uppercase tracking-wider">
                                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                      <span>NO EXISTING LOCATION MATCH</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-tight">
                                      This room label was extracted from the drawing but has no existing location record on {levelLocation.name}.
                                    </p>
                                    <div className="flex items-center space-x-2 pt-1">
                                      <select
                                        defaultValue=""
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleChangeCandidateLocation(cand.id, Number(e.target.value));
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[10px] bg-slate-900 text-slate-300 border border-slate-700 rounded-lg px-2 py-1 flex-1"
                                      >
                                        <option value="" disabled>
                                          Select Existing Location...
                                        </option>
                                        {childLocations.map((loc) => (
                                          <option key={loc.id} value={loc.id}>
                                            {loc.code} — {loc.name}
                                          </option>
                                        ))}
                                      </select>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenCreateLocation(cand);
                                        }}
                                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] uppercase rounded-lg transition-colors shrink-0 cursor-pointer"
                                      >
                                        + Create Location
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Candidate Action Buttons */}
                                <div className="flex items-center justify-between pt-1 text-xs">
                                  <div className="flex items-center space-x-2">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedCandidateId(cand.id);
                                        setEditingPolygon(cand.polygon);
                                        addToast('info', 'Edit Boundary Active', 'Drag vertices on the canvas to refine.');
                                      }}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] uppercase rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                      <span>Edit Boundary</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleIgnoreCandidate(cand.id);
                                      }}
                                      className="px-2 py-1 text-slate-500 hover:text-rose-400 font-semibold text-[10px] uppercase rounded-lg transition-colors cursor-pointer"
                                    >
                                      Ignore
                                    </button>
                                  </div>

                                  {cand.suggestedLocationId && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConfirmCandidate(cand);
                                      }}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1 transition-all cursor-pointer ${
                                        isConfirmed
                                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                          : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-sm'
                                      }`}
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>{isConfirmed ? 'Confirmed' : 'Confirm'}</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* MANUAL MAPPING INTERFACE */}
              {mappingMode === 'manual' && (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-2.5 rounded-xl">
                    <span className="text-xs font-bold text-slate-300 uppercase">Manual Tool:</span>
                    <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg">
                      <button
                        onClick={() => {
                          setManualTool('rectangle');
                          setManualPolygonPoints([]);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                          manualTool === 'rectangle'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Quick Rectangle
                      </button>
                      <button
                        onClick={() => {
                          setManualTool('polygon');
                          setManualPolygonPoints([]);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                          manualTool === 'polygon'
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Multi-Point Polygon
                      </button>
                    </div>
                  </div>

                  {manualTool === 'polygon' && manualPolygonPoints.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl flex items-center justify-between text-xs">
                      <span className="text-amber-300 font-mono text-[11px]">
                        Points placed: {manualPolygonPoints.length}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => setManualPolygonPoints([])}
                          className="px-2 py-0.5 text-slate-400 hover:text-white text-[10px] font-bold cursor-pointer"
                        >
                          Clear
                        </button>
                        <button
                          onClick={handleFinishManualPolygon}
                          className="px-2.5 py-1 bg-amber-500 text-slate-950 font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          Finish Polygon
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1">
                      Select Room to Map:
                    </div>
                    {childLocations.map((loc) => {
                      const mapped = hotspots.find((h) => h.locationId === loc.id);
                      const isSelected = activeLocationToMap?.id === loc.id;

                      return (
                        <div
                          key={loc.id}
                          onClick={() => setActiveLocationToMap(loc)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                              : mapped
                              ? 'bg-slate-850 border-emerald-500/30 text-slate-300 hover:bg-slate-800'
                              : 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs font-bold text-amber-400">
                                {loc.code}
                              </span>
                              <span className="text-xs font-semibold text-white truncate max-w-[140px]">
                                {loc.name}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {mapped ? (
                                <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                                  <Check className="w-3 h-3" />
                                  <span>Mapped ({mapped.points?.length || 4} vertices)</span>
                                </span>
                              ) : (
                                <span className="text-slate-500">Unmapped — draw rectangle on plan</span>
                              )}
                            </div>
                          </div>

                          {mapped && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveHotspot(loc.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Remove Hotspot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Interactive Drawing Canvas with Normalized Polygons */}
            <div className="lg:col-span-7 p-4 flex flex-col space-y-3 bg-slate-950/90 overflow-hidden">
              {/* Instructions & Tools Bar */}
              <div className="flex flex-wrap items-center justify-between bg-slate-900 border border-slate-800 px-3 py-2 rounded-xl text-xs gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-300">Active Location:</span>
                  <span className="font-mono font-bold text-amber-400">
                    {mappingMode === 'assisted'
                      ? selectedCandidateId
                        ? detectedCandidates.find((c) => c.id === selectedCandidateId)?.rawText
                        : 'Select candidate'
                      : activeLocationToMap
                      ? `${activeLocationToMap.name} (${activeLocationToMap.code})`
                      : 'None'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Previous Revision Ghost Reference Toggle */}
                  {currentPlan?.configured && (
                    <label className="flex items-center space-x-1.5 text-[11px] text-slate-400 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showPreviousRevisionRef}
                        onChange={(e) => setShowPreviousRevisionRef(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-amber-500"
                      />
                      <span>Show Previous Revision</span>
                    </label>
                  )}

                  {/* Polygon vertex actions if active */}
                  {editingPolygon && selectedVertexIndex !== null && (
                    <button
                      type="button"
                      onClick={handleDeleteSelectedVertex}
                      className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete Vertex</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Viewport Canvas */}
              <div
                ref={canvasContainerRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                className="relative flex-1 min-h-[480px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden select-none cursor-crosshair shadow-inner flex items-center justify-center"
              >
                {/* Real Drawing Image / Vector Base */}
                <img
                  src={fileUrl}
                  alt={drawingTitle}
                  className="w-full h-full object-contain pointer-events-none select-none"
                />

                {/* SVG Layer for Normalized Polygons and Boundary Editing */}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 w-full h-full pointer-events-none"
                >
                  {/* Previous Revision Ghost Reference Outlines */}
                  {showPreviousRevisionRef &&
                    currentPlan?.hotspots?.map((prev) => {
                      const pts = prev.points || rectToPolygon(prev.rect);
                      const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
                      return (
                        <g key={`prev-${prev.id}`} opacity={0.45}>
                          <polygon
                            points={pointsStr}
                            fill="none"
                            stroke="#38bdf8"
                            strokeWidth="0.6"
                            strokeDasharray="1.5,1"
                          />
                        </g>
                      );
                    })}

                  {/* Confirmed Hotspots Overlay */}
                  {hotspots.map((h) => {
                    const pts = h.points || rectToPolygon(h.rect);
                    const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
                    return (
                      <g key={h.id}>
                        <polygon
                          points={pointsStr}
                          fill="#10b981"
                          fillOpacity={0.2}
                          stroke="#10b981"
                          strokeWidth="0.8"
                        />
                      </g>
                    );
                  })}

                  {/* Active Candidate Polygon in Editing Mode */}
                  {editingPolygon && editingPolygon.length > 0 && (
                    <g>
                      <polygon
                        points={editingPolygon.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="#f59e0b"
                        fillOpacity={0.28}
                        stroke="#f59e0b"
                        strokeWidth="1.2"
                      />

                      {/* Vertex Handles */}
                      {editingPolygon.map((pt, idx) => {
                        const isVertexSelected = selectedVertexIndex === idx;
                        return (
                          <circle
                            key={idx}
                            cx={pt.x}
                            cy={pt.y}
                            r={isVertexSelected ? 1.4 : 1.0}
                            fill={isVertexSelected ? '#fbbf24' : '#ffffff'}
                            stroke="#d97706"
                            strokeWidth="0.4"
                            className="pointer-events-auto cursor-pointer"
                          />
                        );
                      })}

                      {/* Midpoint "+" handles on edges to add vertex */}
                      {editingPolygon.map((pt, idx) => {
                        const nextPt = editingPolygon[(idx + 1) % editingPolygon.length];
                        const midX = (pt.x + nextPt.x) / 2;
                        const midY = (pt.y + nextPt.y) / 2;
                        return (
                          <g
                            key={`edge-${idx}`}
                            className="pointer-events-auto cursor-pointer opacity-75 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddVertexToEdge(idx);
                            }}
                          >
                            <circle cx={midX} cy={midY} r={0.7} fill="#3b82f6" />
                          </g>
                        );
                      })}
                    </g>
                  )}

                  {/* Manual Polygon Line in Progress */}
                  {mappingMode === 'manual' && manualTool === 'polygon' && manualPolygonPoints.length > 0 && (
                    <g>
                      <polyline
                        points={manualPolygonPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1"
                        strokeDasharray="1,1"
                      />
                      {manualPolygonPoints.map((pt, idx) => (
                        <circle key={idx} cx={pt.x} cy={pt.y} r={0.8} fill="#f59e0b" />
                      ))}
                    </g>
                  )}
                </svg>

                {/* HTML Labels Overlaid on Confirmed Hotspots */}
                {hotspots.map((h) => (
                  <div
                    key={`badge-${h.id}`}
                    style={{
                      left: `${h.rect.x + h.rect.width / 2}%`,
                      top: `${h.rect.y + h.rect.height / 2}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className="absolute bg-slate-950/90 border border-emerald-500/50 px-2 py-0.5 rounded-lg text-center pointer-events-none shadow-md z-10"
                  >
                    <div className="font-mono text-[9px] font-bold text-emerald-400">{h.locationCode}</div>
                    <div className="text-[8px] font-semibold text-slate-200 truncate max-w-[100px]">
                      {h.locationName}
                    </div>
                  </div>
                ))}

                {/* Manual Drag Rect Preview */}
                {isDrawingRect && currentDragRect && (
                  <div
                    style={{
                      left: `${currentDragRect.x}%`,
                      top: `${currentDragRect.y}%`,
                      width: `${currentDragRect.width}%`,
                      height: `${currentDragRect.height}%`,
                    }}
                    className="absolute border-2 border-dashed border-amber-400 bg-amber-500/30 rounded pointer-events-none flex items-center justify-center z-20"
                  >
                    <span className="bg-slate-950/90 text-amber-300 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                      {activeLocationToMap?.code} ({Math.round(currentDragRect.width)}% ×{' '}
                      {Math.round(currentDragRect.height)}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Final location-to-plan relationships require administrator confirmation. Unmatched rooms can be added explicitly.
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveConfiguration}
              disabled={saving || hotspots.length === 0}
              className={`px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md flex items-center space-x-2 cursor-pointer ${
                saving || hotspots.length === 0
                  ? 'opacity-50 cursor-not-allowed bg-slate-800 text-slate-500'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  <span>Save Level Plan Configuration ({hotspots.length} Rooms)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* BULK CONFIRMATION PREVIEW MODAL */}
      {isBulkReviewModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm High-Confidence Room Detections</span>
              </div>
              <button
                onClick={() => setIsBulkReviewModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              The following {countHigh} room detections have strong code/name matches against existing {levelLocation.name} location records. Confirming will create official hotspots.
            </p>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {detectedCandidates
                .filter((c) => c.confidence === 'HIGH' && c.status === 'pending' && c.suggestedLocationId)
                .map((cand) => (
                  <div
                    key={cand.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-white">{cand.rawText}</span>
                      <div className="text-[10px] text-emerald-400 mt-0.5">
                        Matches: {cand.suggestedLocationCode} — {cand.suggestedLocationName}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300">
                      {cand.confidenceScore}% High
                    </span>
                  </div>
                ))}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsBulkReviewModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkConfirmHighConfidence}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase rounded-xl shadow-md cursor-pointer"
              >
                Confirm {countHigh} Mappings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE LOCATION MODAL FOR UNMATCHED ROOMS */}
      {isCreateLocationModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleCreateLocationConfirm}
            className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Plus className="w-5 h-5" />
                <span>Create Location for Unmatched Drawing Room</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateLocationModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This drawing area has no matching location record on <strong>{levelLocation.name}</strong>. Create an authoritative location record now to map this room.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Location Code *
                </label>
                <input
                  type="text"
                  required
                  value={createLocCode}
                  onChange={(e) => setCreateLocCode(e.target.value)}
                  placeholder="e.g. L02-ER04"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                  Room / Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={createLocName}
                  onChange={(e) => setCreateLocName(e.target.value)}
                  placeholder="e.g. Electrical Room 04"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white"
                />
              </div>

              <div className="text-[11px] text-slate-400">
                Parent: <strong>{levelLocation.name} ({levelLocation.code})</strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsCreateLocationModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingLocation}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
              >
                {creatingLocation ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create &amp; Map Hotspot</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
