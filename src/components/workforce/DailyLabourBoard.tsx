import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Copy,
  Lock,
  Unlock,
  Send,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronDown,
  Layers,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Building,
  Building2,
  Printer,
  Download,
  Eye,
  Check,
  UserCheck,
  UserX,
  Repeat,
  FileSpreadsheet,
  LayoutGrid,
  Table,
  CheckSquare,
  Square,
  Users2,
  ClipboardCheck,
  Activity,
  FileText,
  MoveRight,
  Split,
  CopyPlus,
  Shield,
  Info,
  ArrowUp,
  ArrowDown,
  Edit2,
  Archive,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { WorkforceDatePicker } from './WorkforceDatePicker.tsx';
import { WorkforceStructureModal } from './WorkforceStructureModal.tsx';

interface AllocationItem {
  id: number;
  personId: number;
  projectId: number;
  date: string;
  shift: string;
  startTime: string;
  endTime: string;
  zoneId: number;
  workstreamId: number;
  crewId?: number;
  supervisorName?: string;
  status: string;
  notes?: string;
  version: number;
  actualAttendance?: string;
  actualZoneId?: number;
  actualWorkstreamId?: number;
  actualCrewId?: number;
  actualStartTime?: string;
  actualEndTime?: string;
  actualHours?: string;
  actualNotes?: string;
  actualRecordedBy?: string;
  actualRecordedAt?: string;
  actualZone?: { id: number; code: string; name: string } | null;
  actualWorkstream?: { id: number; code: string; name: string } | null;
  person: {
    id: number;
    employeeId: string;
    displayName: string;
    tradeRole: string;
    companyName: string;
    complianceStatus: 'COMPLIANT' | 'WARNING' | 'NOT COMPLIANT';
    quals?: any[];
  };
}

interface WorkstreamItem {
  id: number;
  zoneId?: number;
  code: string;
  name: string;
  description?: string | null;
  color: string;
  sequence?: number;
  isActive?: boolean;
  workerCount: number;
  allocations: AllocationItem[];
}

interface ZoneItem {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  sequence?: number;
  isActive?: boolean;
  locationId?: number | null;
  linkedLocation?: {
    id: number;
    name: string;
    code: string;
    type: string;
    path: string;
  } | null;
  workerCount: number;
  workstreams: WorkstreamItem[];
}

export const DailyLabourBoard: React.FC = () => {
  const { activeProject, userProjects, switchProject, currentUser, addToast } = useApp();
  const [date, setDate] = useState<string>('2026-10-12');
  const [shift, setShift] = useState<string>('Day Shift');
  const [loading, setLoading] = useState(false);
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);

  // View Layout Modes: 'SPATIAL' | 'SUPERVISOR_SHEET'
  const [viewMode, setViewMode] = useState<'SPATIAL' | 'SUPERVISOR_SHEET'>('SPATIAL');

  // Planned vs Actual display mode: 'PLANNED' | 'ACTUALS' | 'VARIANCES'
  const [dataPerspective, setDataPerspective] = useState<'PLANNED' | 'ACTUALS' | 'VARIANCES'>('ACTUALS');

  const [boardData, setBoardData] = useState<{
    date: string;
    shift: string;
    dayState: any;
    totalWorkforce: number;
    totalAllocated: number;
    totalUnallocated: number;
    totalUnavailable: number;
    qualificationWarnings: number;
    conflictsCount: number;
    zones: ZoneItem[];
    unallocated: any[];
    unavailable: any[];
  } | null>(null);

  // Drawer tab: 'UNALLOCATED' vs 'UNAVAILABLE'
  const [drawerTab, setDrawerTab] = useState<'UNALLOCATED' | 'UNAVAILABLE'>('UNALLOCATED');
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerTradeFilter, setDrawerTradeFilter] = useState('All');
  const [drawerReasonFilter, setDrawerReasonFilter] = useState('All');

  // Compact Allocation Detail & Actuals Recording Modal
  const [selectedAllocationDetail, setSelectedAllocationDetail] = useState<AllocationItem | null>(null);
  const [actualAttendanceStatus, setActualAttendanceStatus] = useState<string>('Present');
  const [actualTargetZone, setActualTargetZone] = useState<string>('');
  const [actualTargetStream, setActualTargetStream] = useState<string>('');
  const [actualNotesText, setActualNotesText] = useState<string>('');
  const [isSavingActual, setIsSavingActual] = useState(false);

  // Quick manual allocation modal state
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [selectedPersonForAlloc, setSelectedPersonForAlloc] = useState<any | null>(null);
  const [allocTargetZone, setAllocTargetZone] = useState<number | ''>('');
  const [allocTargetStream, setAllocTargetStream] = useState<number | ''>('');
  const [allocStartTime, setAllocStartTime] = useState('07:00');
  const [allocEndTime, setAllocEndTime] = useState('15:30');

  // Conflict modal state (when server returns 409)
  const [conflictModalData, setConflictModalData] = useState<{
    error: string;
    workerName?: string;
    existingTime?: string;
    payload?: any;
    isCrossProject?: boolean;
  } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Copy Previous Day / Schedule state
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [sourceCopyDate, setSourceCopyDate] = useState('2026-10-11');
  const [targetCopyDate, setTargetCopyDate] = useState('2026-10-12');
  const [copyMode, setCopyMode] = useState<'WEEK' | 'AREA' | 'WORKSTREAM' | 'CREW'>('WEEK');
  const [copyFilterZoneId, setCopyFilterZoneId] = useState<number | ''>('');
  const [copyFilterWorkstreamId, setCopyFilterWorkstreamId] = useState<number | ''>('');
  const [copyFilterCrewId, setCopyFilterCrewId] = useState<number | ''>('');
  const [copyShift, setCopyShift] = useState<string>('Day Shift');
  const [copyDryRunResult, setCopyDryRunResult] = useState<any | null>(null);
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [isCommittingCopy, setIsCommittingCopy] = useState(false);
  const [copyExcludedPersonIds, setCopyExcludedPersonIds] = useState<number[]>([]);

  // Unlock reason modal state
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');

  // Print Daily Sheet modal
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Drag state
  const [draggedPersonId, setDraggedPersonId] = useState<number | null>(null);
  const [draggedAllocationId, setDraggedAllocationId] = useState<number | null>(null);

  // Multi-Select & Bulk Move state
  const [selectedAllocIds, setSelectedAllocIds] = useState<Set<number>>(new Set());
  const handleToggleSelectAlloc = (allocId: number) => {
    setSelectedAllocIds((prev) => {
      const next = new Set(prev);
      if (next.has(allocId)) next.delete(allocId);
      else next.add(allocId);
      return next;
    });
  };
  const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);
  const [bulkMoveZoneId, setBulkMoveZoneId] = useState<number | ''>('');
  const [bulkMoveWorkstreamId, setBulkMoveWorkstreamId] = useState<number | ''>('');
  const [bulkMovePreview, setBulkMovePreview] = useState<any | null>(null);
  const [isBulkMoving, setIsBulkMoving] = useState(false);

  // Morning Attendance Confirmation ("Confirm All Present")
  const [isConfirmAllModalOpen, setIsConfirmAllModalOpen] = useState(false);
  const [isConfirmingAttendance, setIsConfirmingAttendance] = useState(false);

  // Quick Move Modal (for mobile & accessibility)
  const [quickMoveAllocation, setQuickMoveAllocation] = useState<AllocationItem | null>(null);
  const [quickMoveTargetZone, setQuickMoveTargetZone] = useState<number | ''>('');
  const [quickMoveTargetWorkstream, setQuickMoveTargetWorkstream] = useState<number | ''>('');

  // Display density: 'compact' | 'comfortable' (Requirement 15)
  const [displayDensity, setDisplayDensity] = useState<'compact' | 'comfortable'>('comfortable');

  // Collapsed Area IDs (Requirement 14)
  const [collapsedZoneIds, setCollapsedZoneIds] = useState<Set<number>>(new Set());

  const toggleZoneCollapse = (zoneId: number) => {
    setCollapsedZoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(zoneId)) next.delete(zoneId);
      else next.add(zoneId);
      return next;
    });
  };

  // Crew First Workflow state
  const [isCrewModalOpen, setIsCrewModalOpen] = useState(false);
  const [availableCrews, setAvailableCrews] = useState<any[]>([]);
  const [selectedCrewId, setSelectedCrewId] = useState<number | ''>('');
  const [crewActionType, setCrewActionType] = useState<'MOVE' | 'DUPLICATE' | 'SPLIT'>('MOVE');
  const [crewTargetZone, setCrewTargetZone] = useState<number | ''>('');
  const [crewTargetWorkstream, setCrewTargetWorkstream] = useState<number | ''>('');
  const [crewDuplicateDate, setCrewDuplicateDate] = useState<string>('2026-10-13');
  const [crewSplitSelectedIds, setCrewSplitSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessingCrewAction, setIsProcessingCrewAction] = useState(false);

  // Operational Changes Today Modal
  const [isChangesTodayModalOpen, setIsChangesTodayModalOpen] = useState(false);

  // Daily Labour Summary Breakdown Modal
  const [isDailySummaryModalOpen, setIsDailySummaryModalOpen] = useState(false);

  // Workforce Structure Management state
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [initialAddZoneTrigger, setInitialAddZoneTrigger] = useState(false);
  const [initialAddStreamZoneId, setInitialAddStreamZoneId] = useState<number | null>(null);

  // Labour Transfer to Another Project state
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferPersonId, setTransferPersonId] = useState<number | ''>('');
  const [transferTargetProjectId, setTransferTargetProjectId] = useState<number>(2);
  const [transferDate, setTransferDate] = useState(date);
  const [transferShift, setTransferShift] = useState(shift);
  const [transferNotes, setTransferNotes] = useState('Reassigned across projects');
  const [transferLoading, setTransferLoading] = useState(false);

  const userRole = (currentUser?.role || '') as string;
  const canManageStructure =
    userRole === 'Administrator' ||
    userRole === 'Project Manager' ||
    userRole === 'Workforce Administrator';

  const handleExecuteProjectTransfer = async () => {
    if (!transferPersonId || !transferTargetProjectId) {
      addToast('error', 'Validation Error', 'Worker and target project are required');
      return;
    }
    setTransferLoading(true);
    try {
      const res = await fetch('/api/workforce/allocations/transfer-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          personId: Number(transferPersonId),
          sourceProjectId: activeProject?.id,
          targetProjectId: Number(transferTargetProjectId),
          date: transferDate,
          shift: transferShift,
          notes: transferNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to transfer worker');

      addToast('success', 'Labour Transferred', `✓ ${data.message || 'Worker transferred to project'}`);
      setIsTransferModalOpen(false);
      fetchBoard();
    } catch (err: any) {
      addToast('error', "CAN'T TRANSFER WORKER", err.message);
    } finally {
      setTransferLoading(false);
    }
  };

  const getPreviousDateStr = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().split('T')[0];
      }
    } catch {}
    return dateStr;
  };

  const handleOpenCopyModal = () => {
    const prev = getPreviousDateStr(date);
    setSourceCopyDate(prev);
    setTargetCopyDate(date);
    setCopyShift(shift || 'Day Shift');
    setCopyMode('WEEK');
    setCopyFilterZoneId('');
    setCopyFilterWorkstreamId('');
    setCopyFilterCrewId('');
    setCopyDryRunResult(null);
    setCopyExcludedPersonIds([]);
    setIsCopyModalOpen(true);
  };

  const handleRunCopyPreview = async () => {
    if (!activeProject) return;
    setIsDryRunning(true);
    try {
      const payload: any = {
        mode: copyMode,
        sourceStartDate: sourceCopyDate,
        sourceEndDate: sourceCopyDate,
        targetStartDate: targetCopyDate,
        shift: copyShift !== 'All' ? copyShift : undefined,
        filter: {
          zoneId: copyFilterZoneId ? Number(copyFilterZoneId) : undefined,
          workstreamId: copyFilterWorkstreamId ? Number(copyFilterWorkstreamId) : undefined,
          crewId: copyFilterCrewId ? Number(copyFilterCrewId) : undefined,
        },
        dryRun: true,
      };

      const res = await fetch('/api/workforce/copy-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject.id),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Dry run validation failed');
      setCopyDryRunResult(data);
      const autoExcluded: number[] = [];
      data.conflicts?.forEach((c: any) => autoExcluded.push(c.personId));
      data.unavailableWorkers?.forEach((u: any) => autoExcluded.push(u.personId));
      setCopyExcludedPersonIds(autoExcluded);
    } catch (err: any) {
      addToast('error', 'Validation Error', err.message);
    } finally {
      setIsDryRunning(false);
    }
  };

  const handleCommitCopy = async () => {
    if (!activeProject) return;
    setIsCommittingCopy(true);
    try {
      const payload: any = {
        mode: copyMode,
        sourceStartDate: sourceCopyDate,
        sourceEndDate: sourceCopyDate,
        targetStartDate: targetCopyDate,
        shift: copyShift !== 'All' ? copyShift : undefined,
        filter: {
          zoneId: copyFilterZoneId ? Number(copyFilterZoneId) : undefined,
          workstreamId: copyFilterWorkstreamId ? Number(copyFilterWorkstreamId) : undefined,
          crewId: copyFilterCrewId ? Number(copyFilterCrewId) : undefined,
        },
        excludedPersonIds: copyExcludedPersonIds,
        dryRun: false,
      };

      const res = await fetch('/api/workforce/copy-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-project-id': String(activeProject.id),
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Copy failed');
      addToast(
        'success',
        'Schedule Copied',
        `Successfully copied ${data.copiedCount} allocations from ${sourceCopyDate} to ${targetCopyDate}`
      );
      setIsCopyModalOpen(false);
      setCopyDryRunResult(null);
      if (targetCopyDate !== date) {
        setDate(targetCopyDate);
      } else {
        fetchBoard();
      }
    } catch (err: any) {
      addToast('error', 'Commit Error', err.message);
    } finally {
      setIsCommittingCopy(false);
    }
  };

  const handleQuickMoveZone = async (zoneId: number, direction: 'up' | 'down') => {
    if (!boardData?.zones || !canManageStructure || !activeProject) return;
    const currentZones = [...boardData.zones];
    const index = currentZones.findIndex((z) => z.id === zoneId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentZones.length) return;

    const temp = currentZones[index];
    currentZones[index] = currentZones[targetIndex];
    currentZones[targetIndex] = temp;

    setBoardData({
      ...boardData,
      zones: currentZones,
    });

    try {
      const res = await fetch('/api/workforce/zones/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
        body: JSON.stringify({ zoneIds: currentZones.map((z) => z.id) }),
      });
      if (!res.ok) throw new Error('Failed to save area order');
      addToast('success', 'Order Saved', 'Area display order updated');
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
      fetchBoard();
    }
  };

  const handleQuickMoveStream = async (zoneId: number, streamId: number, direction: 'up' | 'down') => {
    if (!boardData?.zones || !canManageStructure || !activeProject) return;
    const targetZone = boardData.zones.find((z) => z.id === zoneId);
    if (!targetZone) return;

    const currentStreams = [...targetZone.workstreams];
    const index = currentStreams.findIndex((s) => s.id === streamId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentStreams.length) return;

    const temp = currentStreams[index];
    currentStreams[index] = currentStreams[targetIndex];
    currentStreams[targetIndex] = temp;

    try {
      const res = await fetch('/api/workforce/workstreams/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
        body: JSON.stringify({ workstreamIds: currentStreams.map((s) => s.id) }),
      });
      if (!res.ok) throw new Error('Failed to save workstream order');
      addToast('success', 'Order Saved', 'Workstream display order updated');
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
      fetchBoard();
    }
  };

  const handleQuickArchiveZone = async (zone: ZoneItem) => {
    if (!canManageStructure || !activeProject) return;
    if (!confirm(`Archive Workforce Area "${zone.code} — ${zone.name}"?\n\nHistorical Safety: All past labour allocations and hours will be preserved in reports, but this Area will be hidden from new Daily Board allocations.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/workforce/zones/${zone.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to archive area');
      }
      addToast('success', 'Area Archived', `Area "${zone.name}" archived. Historical labour data preserved.`);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Archive Error', err.message);
    }
  };

  const handleQuickArchiveStream = async (stream: WorkstreamItem) => {
    if (!canManageStructure || !activeProject) return;
    if (!confirm(`Archive Workstream "${stream.name}"?\n\nHistorical Safety: All past labour allocations to "${stream.name}" will remain intact on previous daily boards and reports. It will no longer be offered for new allocations.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/workforce/workstreams/${stream.id}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject.id),
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to archive workstream');
      }
      addToast('success', 'Workstream Archived', `Workstream "${stream.name}" archived. Historical allocations preserved.`);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Archive Error', err.message);
    }
  };

  const fetchBoard = useCallback(async () => {
    if (!activeProject) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/workforce/daily-board?projectId=${activeProject.id}&date=${date}&shift=${encodeURIComponent(shift)}`, {
        headers: {
          'x-project-id': String(activeProject.id),
          'x-user-role': currentUser.role,
        },
      });
      if (!res.ok) throw new Error('Failed to load daily board');
      const data = await res.json();
      setBoardData(data);
    } catch (err: any) {
      addToast('error', 'Board Error', err.message || 'Could not fetch daily board');
    } finally {
      setLoading(false);
    }
  }, [activeProject, date, shift, currentUser.role, addToast]);

  const fetchCrews = useCallback(async () => {
    if (!activeProject) return;
    try {
      const res = await fetch(`/api/workforce/crews?projectId=${activeProject.id}`, {
        headers: {
          'x-project-id': String(activeProject.id),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableCrews(data);
      }
    } catch (e) {
      // ignore
    }
  }, [activeProject, currentUser.role]);

  useEffect(() => {
    fetchBoard();
    fetchCrews();
  }, [fetchBoard, fetchCrews]);

  // Toggle single allocation selection for bulk move
  const toggleSelectAllocation = (id: number) => {
    setSelectedAllocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Preview Bulk Move
  const handlePreviewBulkMove = async (zoneIdOverride?: number, streamIdOverride?: number) => {
    const targetZ = zoneIdOverride !== undefined ? zoneIdOverride : bulkMoveZoneId;
    const targetS = streamIdOverride !== undefined ? streamIdOverride : bulkMoveWorkstreamId;
    if (!targetZ || !targetS) return;

    try {
      const res = await fetch('/api/workforce/allocations/bulk-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          allocationIds: Array.from(selectedAllocIds),
          zoneId: targetZ,
          workstreamId: targetS,
          dryRun: true,
        }),
      });
      if (res.ok) {
        const preview = await res.json();
        setBulkMovePreview(preview);
      }
    } catch (e) {
      // ignore
    }
  };

  // Execute Bulk Move
  const handleExecuteBulkMove = async () => {
    if (!bulkMoveZoneId || !bulkMoveWorkstreamId || selectedAllocIds.size === 0) return;
    setIsBulkMoving(true);
    try {
      const res = await fetch('/api/workforce/allocations/bulk-move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          allocationIds: Array.from(selectedAllocIds),
          zoneId: bulkMoveZoneId,
          workstreamId: bulkMoveWorkstreamId,
          dryRun: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to move allocations');

      addToast(
        'success',
        'Bulk Move Completed',
        `Successfully moved ${data.movedCount} of ${data.totalRequested} workers.`
      );
      setSelectedAllocIds(new Set());
      setIsBulkMoveModalOpen(false);
      setBulkMovePreview(null);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Bulk Move Error', err.message);
    } finally {
      setIsBulkMoving(false);
    }
  };

  // Confirm All Present (Morning Attendance)
  const handleConfirmAllPresent = async () => {
    if (!allAllocationsList.length) return;
    setIsConfirmingAttendance(true);
    try {
      const allocIds = allAllocationsList.map((item) => item.allocation.id);
      const res = await fetch('/api/workforce/allocations/batch-actual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          allocationIds: allocIds,
          actualAttendance: 'Present',
          actualNotes: 'Confirmed Present at morning muster',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to confirm attendance');

      addToast('success', 'Attendance Confirmed', `All ${data.count} scheduled workers marked Present on site`);
      setIsConfirmAllModalOpen(false);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Attendance Error', err.message);
    } finally {
      setIsConfirmingAttendance(false);
    }
  };

  // Handle Crew Action (Move, Duplicate, Split)
  const handleExecuteCrewAction = async () => {
    if (!selectedCrewId) return;
    setIsProcessingCrewAction(true);
    try {
      if (crewActionType === 'MOVE') {
        if (!crewTargetZone || !crewTargetWorkstream) {
          addToast('error', 'Validation Error', 'Target Zone and Workstream are required');
          return;
        }
        // Find all allocations for this crew on current day
        const crewAllocIds = allAllocationsList
          .filter((a) => a.allocation.crewId === Number(selectedCrewId))
          .map((a) => a.allocation.id);

        if (crewAllocIds.length === 0) {
          // If not yet allocated today, allocate entire crew
          const res = await fetch(`/api/workforce/crews/${selectedCrewId}/allocate-entire-crew`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': currentUser.role,
              'x-project-id': String(activeProject?.id),
            },
            body: JSON.stringify({
              date,
              shift,
              zoneId: crewTargetZone,
              workstreamId: crewTargetWorkstream,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to allocate crew');
          addToast('success', 'Crew Allocated', `Allocated ${data.allocatedCount} crew members`);
        } else {
          // Bulk move existing allocations
          const res = await fetch('/api/workforce/allocations/bulk-move', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-role': currentUser.role,
              'x-project-id': String(activeProject?.id),
            },
            body: JSON.stringify({
              allocationIds: crewAllocIds,
              zoneId: crewTargetZone,
              workstreamId: crewTargetWorkstream,
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to move crew');
          addToast('success', 'Crew Moved', `Moved ${data.movedCount} crew members to new location`);
        }
      } else if (crewActionType === 'DUPLICATE') {
        const res = await fetch(`/api/workforce/crews/${selectedCrewId}/duplicate-day`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentUser.role,
            'x-project-id': String(activeProject?.id),
          },
          body: JSON.stringify({
            sourceDate: date,
            targetDate: crewDuplicateDate,
            shift,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to duplicate crew');
        addToast(
          'success',
          'Crew Duplicated',
          `Duplicated ${data.duplicatedCount} crew allocations to ${crewDuplicateDate}`
        );
      } else if (crewActionType === 'SPLIT') {
        if (!crewTargetZone || !crewTargetWorkstream) {
          addToast('error', 'Validation Error', 'Target Zone and Workstream are required for split move');
          return;
        }
        if (crewSplitSelectedIds.size === 0) {
          addToast('error', 'Validation Error', 'Select at least one crew member to split');
          return;
        }
        // Move only selected split allocations
        const res = await fetch('/api/workforce/allocations/bulk-move', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-role': currentUser.role,
            'x-project-id': String(activeProject?.id),
          },
          body: JSON.stringify({
            allocationIds: Array.from(crewSplitSelectedIds),
            zoneId: crewTargetZone,
            workstreamId: crewTargetWorkstream,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to split crew');
        addToast(
          'success',
          'Crew Split Complete',
          `Split ${data.movedCount} workers to new workstream. Permanent crew membership preserved.`
        );
      }

      setIsCrewModalOpen(false);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Crew Action Error', err.message);
    } finally {
      setIsProcessingCrewAction(false);
    }
  };

  // Handle Drag Start
  const handleDragStartPerson = (e: React.DragEvent, personId: number, allocationId?: number) => {
    setDraggedPersonId(personId);
    setDraggedAllocationId(allocationId || null);
    e.dataTransfer.setData('text/plain', JSON.stringify({ personId, allocationId }));
  };

  // Handle Drop on Workstream
  const handleDropOnWorkstream = async (zoneId: number, workstreamId: number) => {
    if (!draggedPersonId) return;

    if (draggedAllocationId) {
      await handleMoveAllocation(draggedAllocationId, zoneId, workstreamId);
    } else {
      await handleAllocatePerson(draggedPersonId, zoneId, workstreamId, '07:00', '15:30');
    }

    setDraggedPersonId(null);
    setDraggedAllocationId(null);
  };

  // Handle Move Allocation
  const handleMoveAllocation = async (allocationId: number, newZoneId: number, newWorkstreamId: number) => {
    try {
      const res = await fetch(`/api/workforce/allocations/${allocationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          zoneId: newZoneId,
          workstreamId: newWorkstreamId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConflictModalData({
            error: data.error,
            workerName: data.workerName,
            existingTime: data.existingTime,
            isCrossProject: data.isCrossProject,
            payload: { allocationId, zoneId: newZoneId, workstreamId: newWorkstreamId },
          });
        } else {
          addToast('error', 'Move Blocked', data.error || 'Failed to move allocation');
        }
        return;
      }

      addToast('success', 'Allocation Moved', 'Worker reassigned successfully');
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  // Handle Commit Allocation
  const handleAllocatePerson = async (
    personId: number,
    zoneId: number,
    workstreamId: number,
    start: string,
    end: string,
    isOverride = false,
    overrideRsn = ''
  ) => {
    try {
      const res = await fetch('/api/workforce/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          personId,
          zoneId,
          workstreamId,
          date,
          shift,
          startTime: start,
          endTime: end,
          isOverride,
          overrideReason: overrideRsn,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setConflictModalData({
            error: data.error,
            workerName: data.workerName,
            existingTime: data.existingTime,
            isCrossProject: data.isCrossProject,
            payload: { personId, zoneId, workstreamId, start, end },
          });
        } else {
          addToast('error', 'Allocation Blocked', data.error || 'Failed to allocate worker');
        }
        return;
      }

      if (data.hasComplianceWarning) {
        addToast('info', 'Allocated with Warning', data.complianceIssues.join('; '));
      } else {
        addToast('success', 'Allocated', 'Worker successfully placed on daily board');
      }

      setIsAllocModalOpen(false);
      setConflictModalData(null);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  // Handle Save Actual Labour Outcome
  const handleSaveActualOutcome = async () => {
    if (!selectedAllocationDetail) return;
    setIsSavingActual(true);
    try {
      const res = await fetch(`/api/workforce/allocations/${selectedAllocationDetail.id}/actual`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          actualAttendance: actualAttendanceStatus,
          actualZoneId: actualTargetZone ? Number(actualTargetZone) : null,
          actualWorkstreamId: actualTargetStream ? Number(actualTargetStream) : null,
          actualNotes: actualNotesText,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record actuals');

      addToast('success', 'Actual Outcome Recorded', `Worker recorded as ${actualAttendanceStatus}`);
      setSelectedAllocationDetail(null);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Save Failed', err.message);
    } finally {
      setIsSavingActual(false);
    }
  };

  // Handle Quick Actual Status (Present, Absent, Late)
  const handleQuickActualStatus = async (allocId: number, status: string) => {
    try {
      const res = await fetch(`/api/workforce/allocations/${allocId}/actual`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          actualAttendance: status,
        }),
      });
      if (!res.ok) throw new Error('Failed to update actual status');
      addToast('success', 'Attendance Recorded', `Marked as ${status}`);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  // Handle Remove Allocation
  const handleRemoveAllocation = async (allocId: number) => {
    if (!confirm('Remove this worker allocation from the daily board?')) return;
    try {
      const res = await fetch(`/api/workforce/allocations/${allocId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to remove');
      }
      addToast('info', 'Allocation Cancelled', 'Worker returned to unallocated pool');
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  // Day State Actions: Publish & Lock
  const handlePublishDay = async () => {
    try {
      const res = await fetch('/api/workforce/daily-board/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error('Failed to publish');
      addToast('success', 'Day Published', `Daily labour board for ${date} is now Published`);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Publish Failed', err.message);
    }
  };

  const handleLockDay = async () => {
    if (!confirm(`Lock daily board for ${date}? Historical records will be protected against accidental changes.`)) return;
    try {
      const res = await fetch('/api/workforce/daily-board/lock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({ date }),
      });
      if (!res.ok) throw new Error('Failed to lock');
      addToast('success', 'Day Locked', `Daily labour board for ${date} is locked`);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Lock Failed', err.message);
    }
  };

  const handleUnlockDay = async () => {
    if (!unlockReason.trim()) return;
    try {
      const res = await fetch('/api/workforce/daily-board/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({ date, unlockReason }),
      });
      if (!res.ok) throw new Error('Failed to unlock');
      addToast('success', 'Day Unlocked', `Board unlocked for authorized amendment`);
      setIsUnlockModalOpen(false);
      fetchBoard();
    } catch (err: any) {
      addToast('error', 'Unlock Failed', err.message);
    }
  };

  // Handle Export CSV
  const handleExportCSV = () => {
    if (!activeProject) return;
    const url = `/api/workforce/daily-board/export-csv?projectId=${activeProject.id}&date=${date}&shift=${encodeURIComponent(shift)}`;
    window.open(url, '_blank');
  };

  const isLocked = boardData?.dayState?.status === 'Locked';
  const isDraft = boardData?.dayState?.status === 'Draft';

  // Filter unallocated list
  const filteredUnallocated = (boardData?.unallocated || []).filter((w) => {
    const matchesSearch =
      w.displayName.toLowerCase().includes(drawerSearch.toLowerCase()) ||
      w.employeeId.toLowerCase().includes(drawerSearch.toLowerCase()) ||
      w.tradeRole.toLowerCase().includes(drawerSearch.toLowerCase());
    const matchesTrade = drawerTradeFilter === 'All' || w.tradeRole === drawerTradeFilter;
    return matchesSearch && matchesTrade;
  });

  // Filter unavailable list
  const filteredUnavailable = (boardData?.unavailable || []).filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(drawerSearch.toLowerCase()) ||
      u.employeeId.toLowerCase().includes(drawerSearch.toLowerCase()) ||
      u.tradeRole.toLowerCase().includes(drawerSearch.toLowerCase());
    const matchesReason = drawerReasonFilter === 'All' || u.unavailableReason === drawerReasonFilter;
    return matchesSearch && matchesReason;
  });

  // Flat list of all allocated workers for Supervisor Sheet view
  const allAllocationsList: {
    allocation: AllocationItem;
    zone: ZoneItem;
    workstream: WorkstreamItem;
  }[] = [];
  boardData?.zones.forEach((z) => {
    z.workstreams.forEach((s) => {
      s.allocations.forEach((a) => {
        allAllocationsList.push({ allocation: a, zone: z, workstream: s });
      });
    });
  });

  const absentCount = allAllocationsList.filter((a) => a.allocation.actualAttendance === 'Absent').length;
  const transferredCount = allAllocationsList.filter((a) => a.allocation.actualAttendance === 'Transferred' || Boolean(a.allocation.actualZoneId)).length;
  const lateCount = allAllocationsList.filter((a) => a.allocation.actualAttendance === 'Late').length;
  const trainingCount = allAllocationsList.filter((a) => a.allocation.actualAttendance === 'Training').length;
  const presentCount = allAllocationsList.filter((a) => !a.allocation.actualAttendance || a.allocation.actualAttendance === 'Present').length;
  const totalVariances = absentCount + transferredCount + lateCount + trainingCount;

  return (
    <div className="space-y-5">
      {/* 1. TOP BAR: Date / Shift Controls & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 0. WORKFORCE PROJECT SELECTOR */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
            <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={activeProject?.id || 1}
              onChange={(e) => {
                const selectedProj = userProjects.find((p) => p.id === Number(e.target.value));
                if (selectedProj) {
                  switchProject(selectedProj);
                }
              }}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
              title="Change Workforce Project"
            >
              {userProjects.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Australian Calendar Date Picker with Chevrons & Today Button */}
          <WorkforceDatePicker
            value={date}
            onChange={(newDate) => setDate(newDate)}
          />

          {/* Shift Selector */}
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-inner">
            <Clock className="w-4 h-4 text-amber-400" />
            <select
              value={shift}
              onChange={(e) => setShift(e.target.value)}
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="Day Shift" className="bg-slate-900">Day Shift (07:00–15:30)</option>
              <option value="Back Shift" className="bg-slate-900">Back Shift (15:00–23:00)</option>
              <option value="Night Shift" className="bg-slate-900">Night Shift (23:00–07:00)</option>
              <option value="Custom Shift" className="bg-slate-900">Custom Shift</option>
            </select>
          </div>

          {/* Status Badge */}
          <div className="flex items-center space-x-1.5">
            {isDraft ? (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                DRAFT DAY
              </span>
            ) : isLocked ? (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>LOCKED DAY</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PUBLISHED</span>
              </span>
            )}
          </div>

          {/* View Mode Toggle: Spatial vs Supervisor Sheet */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setViewMode('SPATIAL')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'SPATIAL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Spatial Board</span>
            </button>
            <button
              onClick={() => setViewMode('SUPERVISOR_SHEET')}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'SUPERVISOR_SHEET'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Supervisor Sheet</span>
            </button>
          </div>

          {/* Planned vs Actuals Perspective */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-semibold mr-1">View:</span>
            <button
              onClick={() => setDataPerspective('PLANNED')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                dataPerspective === 'PLANNED' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Planned
            </button>
            <button
              onClick={() => setDataPerspective('ACTUALS')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                dataPerspective === 'ACTUALS' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Actuals
            </button>
          </div>

          {/* Display Density Toggle (Requirement 15) */}
          <div className="flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Density:</span>
            <button
              onClick={() => setDisplayDensity('comfortable')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                displayDensity === 'comfortable' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDisplayDensity('compact')}
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                displayDensity === 'compact' ? 'bg-slate-800 text-amber-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Compact
            </button>
          </div>
        </div>

        {/* Action Controls: Clean Header with Allocate Labour + Smart Actions Menu (Requirement 8 & 9) */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* PRIMARY: Allocate Labour */}
          <button
            onClick={() => {
              setSelectedPersonForAlloc(null);
              setAllocTargetZone('');
              setAllocTargetStream('');
              setIsAllocModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>ALLOCATE LABOUR</span>
          </button>

          {/* ACTIONS DROPDOWN MENU */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 transition-colors shadow-sm cursor-pointer shrink-0"
            >
              <span>••• ACTIONS</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isActionsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isActionsDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-2 z-50 space-y-1 animate-in fade-in duration-150"
                onClick={() => setIsActionsDropdownOpen(false)}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Daily Operations
                </div>

                {/* State-relevant Contextual Action (Requirement 9) */}
                {isDraft ? (
                  <button
                    onClick={handlePublishDay}
                    className="w-full text-left px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-xs font-bold text-emerald-400 flex items-center space-x-2 cursor-pointer border border-emerald-500/30"
                  >
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Publish Day</span>
                  </button>
                ) : isLocked ? (
                  <button
                    onClick={() => setIsUnlockModalOpen(true)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-xs font-bold text-purple-300 flex items-center space-x-2 cursor-pointer border border-purple-500/30"
                  >
                    <Unlock className="w-4 h-4 text-purple-400" />
                    <span>Amend Day</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsConfirmAllModalOpen(true)}
                    className="w-full text-left px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-xs font-bold text-emerald-400 flex items-center space-x-2 cursor-pointer border border-emerald-500/30"
                  >
                    <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                    <span>Confirm Attendance</span>
                  </button>
                )}

                {canManageStructure && (
                  <button
                    onClick={() => {
                      setInitialAddZoneTrigger(false);
                      setInitialAddStreamZoneId(null);
                      setIsStructureModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-bold text-amber-400 flex items-center space-x-2 cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Manage Areas & Workstreams</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    if (availableCrews.length > 0 && !selectedCrewId) {
                      setSelectedCrewId(availableCrews[0].id);
                    }
                    setIsCrewModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center space-x-2 cursor-pointer"
                >
                  <Users2 className="w-4 h-4 text-amber-400" />
                  <span>Crew Operations</span>
                </button>

                <button
                  onClick={() => setIsTransferModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center space-x-2 cursor-pointer"
                >
                  <MoveRight className="w-4 h-4 text-teal-400" />
                  <span>Transfer Labour to Another Project</span>
                </button>

                <button
                  onClick={handleOpenCopyModal}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center space-x-2 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-emerald-400" />
                  <span>Copy Previous Day</span>
                </button>

                <button
                  onClick={() => setIsDailySummaryModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center space-x-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Daily Labour Summary</span>
                </button>

                <button
                  onClick={() => setIsChangesTodayModalOpen(true)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-bold text-slate-200 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-blue-400" />
                    <span>Changes Today</span>
                  </div>
                  {totalVariances > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300">
                      {totalVariances}
                    </span>
                  )}
                </button>

                <div className="border-t border-slate-800 pt-1 mt-1">
                  <button
                    onClick={handleExportCSV}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center space-x-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-400" />
                    <span>Export Master CSV</span>
                  </button>

                  <button
                    onClick={() => setIsPrintModalOpen(true)}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-medium text-slate-300 flex items-center space-x-2 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-slate-400" />
                    <span>Print Supervisor Sheet</span>
                  </button>

                  {isLocked ? (
                    <button
                      onClick={() => setIsUnlockModalOpen(true)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-bold text-purple-400 flex items-center space-x-2 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Unlock Day</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleLockDay}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-medium text-slate-400 flex items-center space-x-2 cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Lock Day</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toggle Labour Drawer */}
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors shadow-sm ${
              isDrawerOpen
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Labour Pool</span>
          </button>
        </div>
      </div>

      {/* 2. OPERATIONAL DAY METRICS (REQUIREMENT 10, 18 & 22) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* ALLOCATED */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Allocated</div>
          <div className="text-2xl font-black text-emerald-600 mt-0.5">{boardData?.totalAllocated || 0}</div>
        </div>
        {/* UNALLOCATED */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unallocated</div>
          <div className="text-2xl font-black text-amber-600 mt-0.5">{boardData?.totalUnallocated || 0}</div>
        </div>
        {/* UNAVAILABLE */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unavailable</div>
          <div className="text-2xl font-black text-slate-700 mt-0.5">{boardData?.totalUnavailable || 0}</div>
        </div>
        {/* WARNINGS */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Warnings</div>
          <div className="text-2xl font-black text-amber-500 mt-0.5">{boardData?.qualificationWarnings || 0}</div>
        </div>
        {/* CONFLICTS */}
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conflicts</div>
          <div className="text-2xl font-black text-rose-600 mt-0.5">{boardData?.conflictsCount || 0}</div>
        </div>
      </div>

      {/* 3. MAIN BODY CONTAINER: SPATIAL BOARD OR SUPERVISOR COMPACT SHEET */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT: PRIMARY BOARD (SPATIAL OR SUPERVISOR SHEET) */}
        <div className="flex-1 w-full space-y-6">
          {loading && !boardData ? (
            <div className="flex items-center justify-center p-12 text-slate-400 space-x-2 bg-slate-900 border border-slate-800 rounded-2xl">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
              <span>Loading daily labour board...</span>
            </div>
          ) : viewMode === 'SPATIAL' ? (
            /* SPATIAL BOARD VIEW */
            <>
              {allAllocationsList.length === 0 && !loading && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 mb-4 animate-in fade-in">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold shrink-0">
                      <Copy className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        No workers allocated for {date} ({shift})
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5">
                        Quickly replicate allocations from the previous shift with automated forward conflict detection.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenCopyModal}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-1.5 shadow-sm shrink-0 cursor-pointer transition-all"
                  >
                    <Copy className="w-4 h-4" />
                    <span>Copy Previous Day</span>
                  </button>
                </div>
              )}

              {boardData?.zones.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-2xl">
                  No zones or workstreams configured for this project.
                </div>
              ) : (
                boardData?.zones.map((zone, zIdx) => {
                const isFirstZone = zIdx === 0;
                const isLastZone = zIdx === (boardData?.zones.length || 0) - 1;
                const isZoneArchived = zone.isActive === false;

                const isCollapsed = collapsedZoneIds.has(zone.id);

                return (
                  <div
                    key={zone.id}
                    className={`border rounded-xl overflow-hidden shadow-xs transition-all ${
                      isZoneArchived
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    {/* Zone Header with Collapsible Toggle & Linked Location */}
                    <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5">
                        {/* Collapsible Chevron Button (Requirement 14) */}
                        <button
                          type="button"
                          onClick={() => toggleZoneCollapse(zone.id)}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
                          title={isCollapsed ? 'Expand Area' : 'Collapse Area'}
                        >
                          <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                              isCollapsed ? '-rotate-90' : 'rotate-0'
                            }`}
                          />
                        </button>

                        <span className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 flex items-center justify-center text-xs font-black font-mono">
                          {zone.code}
                        </span>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => toggleZoneCollapse(zone.id)}
                            className="text-sm font-bold text-slate-900 hover:text-amber-600 transition-colors cursor-pointer text-left"
                          >
                            {zone.name}
                          </button>
                          {isZoneArchived && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ARCHIVED
                            </span>
                          )}
                          {zone.linkedLocation ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Building className="w-3 h-3 flex-shrink-0" />
                              <span>Loc: {zone.linkedLocation.code}</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              Site Wide
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-bold font-mono">
                          {zone.workerCount} workers
                        </span>

                        {canManageStructure && (
                          <div className="flex items-center space-x-1 ml-2">
                            {/* Reorder Buttons */}
                            <div className="flex items-center space-x-0.5 bg-white rounded-lg p-0.5 border border-slate-200">
                              <button
                                type="button"
                                disabled={isFirstZone}
                                onClick={() => handleQuickMoveZone(zone.id, 'up')}
                                title="Move Area Up"
                                className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-20 transition-colors cursor-pointer"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={isLastZone}
                                onClick={() => handleQuickMoveZone(zone.id, 'down')}
                                title="Move Area Down"
                                className="p-1 rounded text-slate-500 hover:text-slate-900 disabled:opacity-20 transition-colors cursor-pointer"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* + Add Workstream */}
                            {!isZoneArchived && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInitialAddZoneTrigger(false);
                                  setInitialAddStreamZoneId(zone.id);
                                  setIsStructureModalOpen(true);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                                title={`Add new workstream under ${zone.name}`}
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Workstream</span>
                              </button>
                            )}

                            {/* Edit Area */}
                            <button
                              type="button"
                              onClick={() => setIsStructureModalOpen(true)}
                              title="Edit Area details or linked location"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Archive Area */}
                            {!isZoneArchived && (
                              <button
                                type="button"
                                onClick={() => handleQuickArchiveZone(zone)}
                                title="Archive Area (protects historical allocations)"
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Collapsed State Summary Row (Requirement 14) */}
                    {isCollapsed ? (
                      <div className="px-4 py-2.5 bg-slate-50/50 text-xs text-slate-600 flex flex-wrap items-center gap-2 border-t border-slate-100">
                        <span className="font-semibold text-slate-500">Workstreams:</span>
                        {zone.workstreams.map((ws) => (
                          <span
                            key={ws.id}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-2xs"
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ws.color }} />
                            <span>{ws.name}:</span>
                            <span className="font-bold font-mono">{ws.workerCount}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      /* Workstreams Grid */
                      <div className={`p-3.5 grid grid-cols-1 ${displayDensity === 'compact' ? 'md:grid-cols-2 xl:grid-cols-4 gap-2.5' : 'md:grid-cols-2 xl:grid-cols-3 gap-3.5'}`}>
                    {zone.workstreams.map((stream, sIdx) => {
                          const isFirstStream = sIdx === 0;
                          const isLastStream = sIdx === zone.workstreams.length - 1;
                          const isStreamArchived = stream.isActive === false;
                          const isEmpty = stream.allocations.length === 0;

                          if (isEmpty) {
                            return (
                              <div
                                key={stream.id}
                                onDragOver={(e) => {
                                  if (!isStreamArchived) e.preventDefault();
                                }}
                                onDrop={() => {
                                  if (isStreamArchived) {
                                    addToast('error', 'Archived Workstream', 'Cannot allocate workers to an archived workstream');
                                    return;
                                  }
                                  handleDropOnWorkstream(zone.id, stream.id);
                                }}
                                className={`border rounded-lg p-2.5 flex items-center justify-between transition-colors shadow-2xs ${
                                  isStreamArchived
                                    ? 'bg-slate-50/50 border-slate-200 opacity-70'
                                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2 min-w-0 pr-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: stream.color }}
                                  />
                                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[130px]">
                                    {stream.name}
                                  </span>
                                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                                    0 workers
                                  </span>
                                </div>

                                {!isLocked && !isStreamArchived && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedPersonForAlloc(null);
                                      setAllocTargetZone(zone.id);
                                      setAllocTargetStream(stream.id);
                                      setIsAllocModalOpen(true);
                                    }}
                                    className="px-2 py-0.5 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-md transition-colors cursor-pointer shrink-0 flex items-center space-x-0.5"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Allocate</span>
                                  </button>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div
                              key={stream.id}
                              onDragOver={(e) => {
                                if (!isStreamArchived) e.preventDefault();
                              }}
                              onDrop={() => {
                                if (isStreamArchived) {
                                  addToast('error', 'Archived Workstream', 'Cannot allocate workers to an archived workstream');
                                  return;
                                }
                                handleDropOnWorkstream(zone.id, stream.id);
                              }}
                              className={`border rounded-xl flex flex-col transition-colors shadow-2xs ${
                                displayDensity === 'compact' ? 'p-2.5' : 'p-3'
                              } ${
                                isStreamArchived
                                  ? 'bg-slate-50/60 border-slate-200 opacity-80'
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                                <div className="flex items-center space-x-2">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: stream.color }}
                                  />
                                  <span className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                                    {stream.name}
                                  </span>
                                  {isStreamArchived && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                      Archived
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-bold">
                                    {stream.workerCount}
                                  </span>

                                  {canManageStructure && (
                                    <div className="flex items-center space-x-0.5 opacity-60 hover:opacity-100 transition-opacity">
                                      <button
                                        type="button"
                                        disabled={isFirstStream}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuickMoveStream(zone.id, stream.id, 'up');
                                        }}
                                        title="Move Workstream Up"
                                        className="p-0.5 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 transition-colors cursor-pointer"
                                      >
                                        <ArrowUp className="w-3 h-3" />
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isLastStream}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleQuickMoveStream(zone.id, stream.id, 'down');
                                        }}
                                        title="Move Workstream Down"
                                        className="p-0.5 rounded text-slate-400 hover:text-slate-800 disabled:opacity-20 transition-colors cursor-pointer"
                                      >
                                        <ArrowDown className="w-3 h-3" />
                                      </button>
                                      {!isStreamArchived && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleQuickArchiveStream(stream);
                                          }}
                                          title="Archive Workstream (preserves historical data)"
                                          className="p-0.5 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                        >
                                          <Archive className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex-1 space-y-1.5">
                                {stream.allocations.map((alloc) => {
                                  const hasWarning =
                                    alloc.person.complianceStatus === 'WARNING' ||
                                    alloc.person.complianceStatus === 'NOT COMPLIANT';
                                  const isTransferred =
                                    alloc.actualAttendance === 'Transferred' ||
                                    Boolean(alloc.actualZoneId);
                                  const isAbsent = alloc.actualAttendance === 'Absent';
                                  const isLate = alloc.actualAttendance === 'Late';
                                  const isSelected = selectedAllocIds.has(alloc.id);
                                  const isTraining = alloc.actualAttendance === 'Training';
                                  const isChangedAfterPublish = alloc.version > 1;

                                  return (
                                    <div
                                      key={alloc.id}
                                      draggable={!isLocked}
                                      onDragStart={(e) =>
                                        handleDragStartPerson(e, alloc.personId, alloc.id)
                                      }
                                      onClick={() => {
                                        setSelectedAllocationDetail(alloc);
                                        setActualAttendanceStatus(
                                          alloc.actualAttendance || 'Present'
                                        );
                                        setActualTargetZone(
                                          alloc.actualZoneId ? String(alloc.actualZoneId) : ''
                                        );
                                        setActualTargetStream(
                                          alloc.actualWorkstreamId
                                            ? String(alloc.actualWorkstreamId)
                                            : ''
                                        );
                                        setActualNotesText(alloc.actualNotes || '');
                                      }}
                                      className={`rounded-lg border text-xs flex items-center justify-between transition-all cursor-pointer ${
                                        displayDensity === 'compact' ? 'p-1.5' : 'p-2'
                                      } ${
                                        isSelected
                                          ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500/40 shadow-xs'
                                          : 'bg-slate-50/80 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                                      }`}
                                    >
                                      <div className="flex items-center space-x-2 min-w-0 pr-1">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            handleToggleSelectAlloc(alloc.id);
                                          }}
                                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 cursor-pointer shrink-0"
                                        />
                                        <div className="min-w-0">
                                          <div className="flex items-center space-x-1.5">
                                            <span className="font-bold text-slate-900 truncate">
                                              {alloc.person.displayName}
                                            </span>
                                            {hasWarning && (
                                              <span
                                                className="inline-flex items-center space-x-0.5 px-1 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                                                title="Qualification Warning"
                                              >
                                                <AlertTriangle className="w-2.5 h-2.5" />
                                                <span>Warn</span>
                                              </span>
                                            )}
                                            {isTraining && (
                                              <span className="px-1 rounded text-[9px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                                Training
                                              </span>
                                            )}
                                            {isChangedAfterPublish && (
                                              <span
                                                className="px-1 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200"
                                                title="Amended after schedule"
                                              >
                                                Moved
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5 truncate">
                                            <span>{alloc.person.tradeRole}</span>
                                            <span>•</span>
                                            <span className="font-mono text-slate-600">
                                              {alloc.startTime}–{alloc.endTime}
                                            </span>
                                          </div>
                                          {isTransferred && (
                                            <div className="text-[9px] font-bold text-blue-600 mt-0.5">
                                              Transferred to {alloc.actualZone?.code || 'Another Zone'}
                                            </div>
                                          )}
                                          {isAbsent && (
                                            <div className="text-[9px] font-bold text-rose-600 mt-0.5">
                                              Absent
                                            </div>
                                          )}
                                          {isLate && (
                                            <div className="text-[9px] font-bold text-amber-600 mt-0.5">
                                              Late
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                          isAbsent
                                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                            : isLate
                                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                            : isTransferred
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        }`}
                                      >
                                        {alloc.actualAttendance || 'Present'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>

                              {!isLocked && !isStreamArchived && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAllocTargetZone(zone.id);
                                    setAllocTargetStream(stream.id);
                                    setIsAllocModalOpen(true);
                                  }}
                                  className="mt-2 w-full py-1 rounded-lg border border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-[11px] font-semibold text-slate-500 hover:text-amber-800 flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Assign Worker</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            </>
          ) : (
            /* SUPERVISOR COMPACT OPERATIONAL SHEET */
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Table className="w-4 h-4 text-amber-400" />
                    <span>Supervisor Operational Labour Sheet ({allAllocationsList.length} Allocated)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Field attendance, daily transfer recording, and site sign-off view
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      <th className="py-3 px-4">Worker & Trade</th>
                      <th className="py-3 px-3">Planned Area & Stream</th>
                      <th className="py-3 px-3">Hours</th>
                      <th className="py-3 px-3">Actual Outcome</th>
                      <th className="py-3 px-3">Notes</th>
                      <th className="py-3 px-4 text-right">Field Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allAllocationsList.map(({ allocation, zone, workstream }) => {
                      const hasWarning = allocation.person.complianceStatus === 'WARNING' || allocation.person.complianceStatus === 'NOT COMPLIANT';
                      return (
                        <tr key={allocation.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-800">
                                {(allocation.person.displayName || 'WK').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 flex items-center space-x-1">
                                  <span>{allocation.person.displayName || 'Unknown Worker'}</span>
                                  {hasWarning && (
                                    <span title="Credential warning">
                                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {allocation.person.tradeRole || 'Not Set'} • {allocation.person.companyName || 'Not Set'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-800">
                              {zone.code} — {workstream.name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {zone.linkedLocation ? `Loc: ${zone.linkedLocation.code}` : 'Site Wide'}
                            </div>
                          </td>

                          <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                            {allocation.startTime}–{allocation.endTime}
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                allocation.actualAttendance === 'Absent'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : allocation.actualAttendance === 'Late'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : allocation.actualAttendance === 'Transferred'
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {allocation.actualAttendance || 'Present'}
                            </span>
                            {allocation.actualZone && (
                              <div className="text-[10px] text-blue-600 font-medium mt-0.5">
                                Moved to: {allocation.actualZone.code}
                              </div>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-[150px] truncate">
                            {allocation.actualNotes || allocation.notes || '-'}
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              <button
                                onClick={() => handleQuickActualStatus(allocation.id, 'Present')}
                                className="px-2 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Mark Present"
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleQuickActualStatus(allocation.id, 'Absent')}
                                className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Mark Absent"
                              >
                                Absent
                              </button>
                              <button
                                onClick={() => handleQuickActualStatus(allocation.id, 'Late')}
                                className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition-colors cursor-pointer"
                                title="Mark Late"
                              >
                                Late
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAllocationDetail(allocation);
                                  setActualAttendanceStatus(allocation.actualAttendance || 'Present');
                                  setActualTargetZone(allocation.actualZoneId ? String(allocation.actualZoneId) : '');
                                  setActualTargetStream(allocation.actualWorkstreamId ? String(allocation.actualWorkstreamId) : '');
                                  setActualNotesText(allocation.actualNotes || '');
                                }}
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Edit...
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {allAllocationsList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-slate-400 text-xs">
                          <p className="font-semibold text-slate-500 mb-3">No workers currently allocated on this shift.</p>
                          <button
                            type="button"
                            onClick={handleOpenCopyModal}
                            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy Previous Day Schedule</span>
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: LABOUR POOL SIDE DRAWER (TABBED: UNALLOCATED vs UNAVAILABLE) */}
        {isDrawerOpen && (
          <div className="w-full lg:w-84 shrink-0 bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col max-h-[820px]">
            {/* Drawer Header & Tabs */}
            <div className="border-b border-slate-100 pb-3">
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  onClick={() => setDrawerTab('UNALLOCATED')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    drawerTab === 'UNALLOCATED'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Unallocated ({boardData?.totalUnallocated || 0})
                </button>
                <button
                  onClick={() => setDrawerTab('UNAVAILABLE')}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
                    drawerTab === 'UNAVAILABLE'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Unavailable ({boardData?.totalUnavailable || 0})
                </button>
              </div>
            </div>

            {/* Search & Filter Inputs */}
            <div className="py-2.5 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter workers..."
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {drawerTab === 'UNALLOCATED' ? (
                <select
                  value={drawerTradeFilter}
                  onChange={(e) => setDrawerTradeFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 focus:outline-none"
                >
                  <option value="All">All Trades</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Apprentice">Apprentice</option>
                  <option value="Leading Hand">Leading Hand</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="High Voltage Tech">High Voltage Tech</option>
                  <option value="Data Tech">Data Tech</option>
                  <option value="Logistics">Logistics</option>
                </select>
              ) : (
                <select
                  value={drawerReasonFilter}
                  onChange={(e) => setDrawerReasonFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700 focus:outline-none"
                >
                  <option value="All">All Reasons</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Training">Training</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="Qualification Restriction">Qualification Restriction</option>
                  <option value="Inactive Project Membership">Inactive Project Membership</option>
                  <option value="Offboarded">Offboarded</option>
                </select>
              )}
            </div>

            {/* Drawer Body List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {drawerTab === 'UNALLOCATED' ? (
                /* Available Unallocated Workers */
                filteredUnallocated.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    All available workers allocated!
                  </div>
                ) : (
                  filteredUnallocated.map((worker) => (
                    <div
                      key={worker.id}
                      draggable={!isLocked}
                      onDragStart={(e) => handleDragStartPerson(e, worker.id)}
                      className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 text-xs flex items-center justify-between cursor-grab active:cursor-grabbing transition-all group"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              worker.complianceStatus === 'COMPLIANT'
                                ? 'bg-emerald-400'
                                : worker.complianceStatus === 'WARNING'
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-bold text-slate-900 truncate text-xs">{worker.displayName || 'Unknown Worker'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                          <span className="text-amber-400/90 font-mono">{worker.employeeId || '—'}</span> • {worker.tradeRole || 'Not Set'}
                        </div>
                      </div>

                      {!isLocked && (
                        <button
                          onClick={() => {
                            setSelectedPersonForAlloc(worker);
                            setIsAllocModalOpen(true);
                          }}
                          className="px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-[10px] font-bold text-amber-800 border border-amber-300 transition-colors shrink-0"
                        >
                          Allocate
                        </button>
                      )}
                    </div>
                  ))
                )
              ) : (
                /* Unavailable Labour List */
                filteredUnavailable.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No unavailable workers on this date.
                  </div>
                ) : (
                  filteredUnavailable.map((u) => {
                    const reason = u.unavailableReason || 'Unavailable';
                    let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                    if (reason === 'On Leave') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                    else if (reason === 'Training') badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                    else if (reason === 'Qualification Restriction') badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                    else if (reason === 'Inactive Project Membership') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';

                    return (
                      <div
                        key={u.id}
                        className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{u.displayName || 'Unknown Worker'}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badgeColor}`}>
                            {reason}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          <span className="text-amber-700 font-mono">{u.employeeId || '—'}</span> • {u.tradeRole || 'Not Set'}
                        </div>
                        {u.unavailableNotes && (
                          <div className="text-[11px] text-slate-500 italic pt-0.5">
                            "{u.unavailableNotes}"
                          </div>
                        )}
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. COMPACT ALLOCATION DETAIL & ACTUALS RECORDING MODAL */}
      {selectedAllocationDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Labour Outcome & Attendance Recording</h3>
              </div>
              <button
                onClick={() => setSelectedAllocationDetail(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Worker Summary Banner */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                {selectedAllocationDetail.person.displayName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-white">
                  {selectedAllocationDetail.person.displayName || 'Unknown Worker'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedAllocationDetail.person.employeeId || '—'} • {selectedAllocationDetail.person.tradeRole || 'Not Set'} • {selectedAllocationDetail.person.companyName || 'Not Set'}
                </div>
              </div>
            </div>

            {/* Planned Allocation Details */}
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Planned Allocation (Protected Record)
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Shift / Times:</span>
                <span className="font-mono text-white">
                  {selectedAllocationDetail.shift} ({selectedAllocationDetail.startTime}–{selectedAllocationDetail.endTime})
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Supervisor:</span>
                <span className="text-white">{selectedAllocationDetail.supervisorName || '—'}</span>
              </div>
            </div>

            {/* Actual Attendance Outcome Controls */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Actual Attendance Outcome
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { id: 'Present', label: 'Present', color: 'emerald' },
                  { id: 'Absent', label: 'Absent', color: 'rose' },
                  { id: 'Transferred', label: 'Transferred', color: 'blue' },
                  { id: 'Late', label: 'Late', color: 'amber' },
                  { id: 'Left Early', label: 'Left Early', color: 'amber' },
                  { id: 'Training', label: 'Training', color: 'purple' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActualAttendanceStatus(s.id)}
                    className={`py-2 px-1.5 rounded-xl text-xs font-bold border transition-all ${
                      actualAttendanceStatus === s.id
                        ? s.color === 'emerald'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : s.color === 'rose'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : s.color === 'amber'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : s.color === 'purple'
                          ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                          : 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* If Transferred: Mid-Shift Transfer Split Details */}
              {actualAttendanceStatus === 'Transferred' && (
                <div className="space-y-3 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-300">
                    <Repeat className="w-3.5 h-3.5" />
                    <span>Mid-Shift Operational Transfer</span>
                  </div>
                  <p className="text-[11px] text-blue-200/80">
                    The original planned allocation remains preserved. Record the mid-shift handover times and destination workstream below.
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Morning Segment (Planned Location)</span>
                      <span className="font-mono text-white text-[11px]">07:00 – 11:30</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold">Afternoon Segment (Transferred)</span>
                      <span className="font-mono text-blue-300 text-[11px]">11:30 – 15:30</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-blue-300 block mb-1">
                        Transfer to Area / Zone:
                      </label>
                      <select
                        value={actualTargetZone}
                        onChange={(e) => setActualTargetZone(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="">Select Zone...</option>
                        {boardData?.zones
                          .filter((z) => z.isActive !== false)
                          .map((z) => (
                            <option key={z.id} value={z.id}>{z.code} - {z.name}</option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-blue-300 block mb-1">
                        Transfer to Workstream:
                      </label>
                      <select
                        value={actualTargetStream}
                        onChange={(e) => setActualTargetStream(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                      >
                        <option value="">Select Stream...</option>
                        {boardData?.zones
                          .find((z) => z.id === Number(actualTargetZone))
                          ?.workstreams.filter((s) => s.isActive !== false)
                          .map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Actual Notes & Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Midday site transfer to LV containment, approved early departure..."
                  value={actualNotesText}
                  onChange={(e) => setActualNotesText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  handleRemoveAllocation(selectedAllocationDetail.id);
                  setSelectedAllocationDetail(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
              >
                Remove Allocation
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSelectedAllocationDetail(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveActualOutcome}
                  disabled={isSavingActual}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow"
                >
                  {isSavingActual ? 'Saving...' : 'Save Actual Outcome'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. QUICK ALLOCATION MODAL (Non-drag accessibility) */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white">Allocate Worker to Daily Board</h3>
              <button onClick={() => setIsAllocModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedPersonForAlloc ? (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {selectedPersonForAlloc.displayName.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-xs font-bold text-white">{selectedPersonForAlloc.displayName || 'Unknown Worker'}</div>
                  <div className="text-[10px] text-slate-400">{selectedPersonForAlloc.tradeRole || 'Not Set'} • {selectedPersonForAlloc.companyName || 'Not Set'}</div>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Select Worker</label>
                <select
                  onChange={(e) => {
                    const found = boardData?.unallocated.find((w) => w.id === Number(e.target.value));
                    setSelectedPersonForAlloc(found || null);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="">-- Choose available worker --</option>
                  {(boardData?.unallocated || []).map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.displayName} ({w.tradeRole}) - {w.employeeId}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Zone / Area</label>
                <select
                  value={allocTargetZone}
                  onChange={(e) => setAllocTargetZone(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="">-- Select Zone --</option>
                  {boardData?.zones
                    .filter((z) => z.isActive !== false)
                    .map((z) => (
                      <option key={z.id} value={z.id}>{z.code} - {z.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Workstream</label>
                <select
                  value={allocTargetStream}
                  onChange={(e) => setAllocTargetStream(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="">-- Select Workstream --</option>
                  {boardData?.zones
                    .find((z) => z.id === allocTargetZone)
                    ?.workstreams.filter((s) => s.isActive !== false)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={allocStartTime}
                  onChange={(e) => setAllocStartTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">End Time</label>
                <input
                  type="time"
                  value={allocEndTime}
                  onChange={(e) => setAllocEndTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsAllocModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                disabled={!selectedPersonForAlloc || !allocTargetZone || !allocTargetStream}
                onClick={() =>
                  handleAllocatePerson(
                    selectedPersonForAlloc.id,
                    Number(allocTargetZone),
                    Number(allocTargetStream),
                    allocStartTime,
                    allocEndTime
                  )
                }
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow"
              >
                Confirm Allocation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. CONFLICT MODAL */}
      {conflictModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Double-Allocation Conflict Detected</h3>
                <p className="text-xs text-rose-300">Server rejected overlapping shift assignment</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-rose-400">{conflictModalData.error}</div>
              {conflictModalData.workerName && (
                <div className="text-slate-300">
                  Worker: <strong className="text-white">{conflictModalData.workerName}</strong>
                </div>
              )}
            </div>

            {/* Authorised Override form for Administrators & PMs */}
            {(currentUser.role === 'Administrator' || currentUser.role === 'Project Manager') ? (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="text-xs font-bold text-amber-300 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Authorised Manager Override</span>
                </div>
                <p className="text-[11px] text-amber-200/80">
                  As an Administrator or Project Manager, you may override this conflict with an audited justification (e.g. midday site transfer, split shift).
                </p>
                <input
                  type="text"
                  placeholder="Enter explicit override reason (required)..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic">
                Only Administrators and Project Managers have permission to perform an authorized conflict override.
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setConflictModalData(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              {(currentUser.role === 'Administrator' || currentUser.role === 'Project Manager') && (
                <button
                  disabled={!overrideReason.trim() || isSubmittingOverride}
                  onClick={async () => {
                    setIsSubmittingOverride(true);
                    const p = conflictModalData.payload;
                    if (p.allocationId) {
                      await handleMoveAllocation(p.allocationId, p.zoneId, p.workstreamId);
                    } else {
                      await handleAllocatePerson(p.personId, p.zoneId, p.workstreamId, p.start, p.end, true, overrideReason);
                    }
                    setIsSubmittingOverride(false);
                  }}
                  className="px-4 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold text-xs shadow"
                >
                  Confirm Authorised Override
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. PRINT VIEW MODAL */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="font-extrabold text-sm text-slate-900">
                MAXIM FORGE — DAILY LABOUR SHEET (SITE NOTICEBOARD)
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 bg-slate-900 text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Print to PDF / Paper
                </button>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="border-b border-slate-300 pb-3 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-slate-900">{activeProject?.name || activeProject?.code}</h2>
                  <div className="text-xs text-slate-600 font-semibold mt-0.5">
                    Date: {date} • Shift: {shift} • Total Allocated: {boardData?.totalAllocated || 0} Workers
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  Printed: {new Date().toLocaleDateString()}
                </div>
              </div>

              {/* Area by Area Breakdown */}
              {boardData?.zones.map((zone) => (
                <div key={zone.id} className="space-y-2">
                  <div className="bg-slate-100 p-2 font-bold text-xs text-slate-800 flex justify-between">
                    <span>{zone.code} — {zone.name}</span>
                    <span>Headcount: {zone.workerCount}</span>
                  </div>

                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                        <th className="p-2">Worker</th>
                        <th className="p-2">Trade</th>
                        <th className="p-2">Workstream</th>
                        <th className="p-2">Hours</th>
                        <th className="p-2">Actual Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {zone.workstreams.flatMap((s) => s.allocations).map((a) => (
                        <tr key={a.id}>
                          <td className="p-2 font-bold">{a.person.displayName || 'Unknown Worker'}</td>
                          <td className="p-2">{a.person.tradeRole || 'Not Set'}</td>
                          <td className="p-2">
                            {zone.workstreams.find((s) => s.id === a.workstreamId)?.name || 'Unassigned'}
                          </td>
                          <td className="p-2 font-mono">{a.startTime}–{a.endTime}</td>
                          <td className="p-2 font-bold text-slate-700">{a.actualAttendance || 'Present'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}

              <div className="border-t border-slate-300 pt-6 mt-6 flex justify-between text-xs text-slate-600">
                <div>
                  <span className="font-bold">Site Supervisor Sign-Off:</span> ___________________________
                </div>
                <div>
                  <span className="font-bold">Date & Time:</span> ___________________________
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. UNLOCK REASON MODAL */}
      {isUnlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2 text-purple-400 pb-2 border-b border-slate-800">
              <Unlock className="w-5 h-5" />
              <h3 className="text-sm font-bold text-white">Unlock Historical Board</h3>
            </div>
            <p className="text-xs text-slate-300">
              Please enter an explicit reason for amending the locked labour board for <strong>{date}</strong>. This action will be audited.
            </p>
            <textarea
              rows={3}
              placeholder="e.g. Weather disruption shift change, late timecard rectification..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none"
            />
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsUnlockModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                disabled={!unlockReason.trim()}
                onClick={handleUnlockDay}
                className="px-4 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white font-bold text-xs"
              >
                Unlock Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. STICKY FLOATING MULTI-SELECT BAR */}
      {selectedAllocIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md border border-amber-500/50 shadow-2xl rounded-2xl px-5 py-3 flex items-center space-x-4 animate-slideUp text-white">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <span className="text-sm font-bold">{selectedAllocIds.size} Workers Selected</span>
          </div>
          <div className="h-5 w-px bg-slate-700" />
          <button
            onClick={() => {
              const allIds = new Set<number>();
              allAllocationsList.forEach(({ allocation }) => allIds.add(allocation.id));
              setSelectedAllocIds(allIds);
            }}
            className="text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            Select All ({allAllocationsList.length})
          </button>
          <button
            onClick={() => setSelectedAllocIds(new Set())}
            className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => {
              setIsBulkMoveModalOpen(true);
              if (boardData && boardData.zones.length > 0) {
                const z0 = boardData.zones[0];
                setBulkMoveZoneId(z0.id);
                if (z0.workstreams.length > 0) {
                  setBulkMoveWorkstreamId(z0.workstreams[0].id);
                  handlePreviewBulkMove(z0.id, z0.workstreams[0].id);
                }
              }
            }}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow transition-all"
          >
            <MoveRight className="w-4 h-4" />
            <span>Move Selected ({selectedAllocIds.size})</span>
          </button>
        </div>
      )}

      {/* 10. BULK MOVE MODAL */}
      {isBulkMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <MoveRight className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Bulk Reassign / Move Labour</h3>
                  <p className="text-xs text-slate-400">{selectedAllocIds.size} workers selected for movement</p>
                </div>
              </div>
              <button onClick={() => setIsBulkMoveModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Destination Selection */}
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Destination Area / Zone</label>
                <select
                  value={bulkMoveZoneId}
                  onChange={(e) => {
                    const zid = Number(e.target.value);
                    setBulkMoveZoneId(zid);
                    const z = boardData?.zones.find((item) => item.id === zid);
                    if (z && z.workstreams.length > 0) {
                      setBulkMoveWorkstreamId(z.workstreams[0].id);
                      handlePreviewBulkMove(zid, z.workstreams[0].id);
                    }
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  {boardData?.zones
                    .filter((z) => z.isActive !== false)
                    .map((z) => (
                      <option key={z.id} value={z.id}>{z.code} — {z.name} {z.linkedLocation ? `(${z.linkedLocation.code})` : ''}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Destination Workstream</label>
                <select
                  value={bulkMoveWorkstreamId}
                  onChange={(e) => {
                    const sid = Number(e.target.value);
                    setBulkMoveWorkstreamId(sid);
                    handlePreviewBulkMove(undefined, sid);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  {boardData?.zones
                    .find((z) => z.id === Number(bulkMoveZoneId))
                    ?.workstreams.filter((s) => s.isActive !== false)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
            </div>

            {/* Live Movement Preview & Conflict Check */}
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Reallocation Preview & Audit Check
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Workers Moving</div>
                  <div className="text-lg font-black text-white">{selectedAllocIds.size}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-yellow-400">Qualification Warnings</div>
                  <div className="text-lg font-black text-yellow-300">{bulkMovePreview?.warningsCount || 0}</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-rose-400">Conflicts Detected</div>
                  <div className="text-lg font-black text-rose-300">{bulkMovePreview?.conflictsCount || 0}</div>
                </div>
              </div>

              {/* Workers Preview List */}
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 pt-1">
                {allAllocationsList
                  .filter((a) => selectedAllocIds.has(a.allocation.id))
                  .map(({ allocation, zone, workstream }) => (
                    <div key={allocation.id} className="p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 text-[11px] flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{allocation.person.displayName}</span>
                        <span className="text-slate-400">({allocation.person.tradeRole})</span>
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        From: <span className="text-slate-300 font-semibold">{zone.code} {workstream.name}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsBulkMoveModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteBulkMove}
                disabled={isBulkMoving}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow flex items-center space-x-1.5"
              >
                {isBulkMoving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm Move ({selectedAllocIds.size} Workers)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. QUICK MOVE MODAL (Single Worker Touch / Accessibility) */}
      {quickMoveAllocation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white">Quick Move Labour</h3>
                <p className="text-xs text-slate-400">Reassign worker to another workstream</p>
              </div>
              <button onClick={() => setQuickMoveAllocation(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                {quickMoveAllocation.person.displayName.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{quickMoveAllocation.person.displayName}</div>
                <div className="text-[10px] text-slate-400">{quickMoveAllocation.person.tradeRole} • {quickMoveAllocation.startTime}–{quickMoveAllocation.endTime}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Target Area / Zone</label>
                <select
                  value={quickMoveTargetZone}
                  onChange={(e) => {
                    const zid = Number(e.target.value);
                    setQuickMoveTargetZone(zid);
                    const z = boardData?.zones.find((item) => item.id === zid);
                    if (z && z.workstreams.length > 0) {
                      setQuickMoveTargetWorkstream(z.workstreams[0].id);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  {boardData?.zones
                    .filter((z) => z.isActive !== false)
                    .map((z) => (
                      <option key={z.id} value={z.id}>{z.code} — {z.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Target Workstream</label>
                <select
                  value={quickMoveTargetWorkstream}
                  onChange={(e) => setQuickMoveTargetWorkstream(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                >
                  {boardData?.zones
                    .find((z) => z.id === Number(quickMoveTargetZone))
                    ?.workstreams.filter((s) => s.isActive !== false)
                    .map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setQuickMoveAllocation(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (quickMoveTargetZone && quickMoveTargetWorkstream) {
                    await handleMoveAllocation(
                      quickMoveAllocation.id,
                      Number(quickMoveTargetZone),
                      Number(quickMoveTargetWorkstream)
                    );
                    setQuickMoveAllocation(null);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 12. CONFIRM ALL PRESENT MODAL (Morning Attendance Muster) */}
      {isConfirmAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-emerald-400 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Confirm Morning Attendance Muster</h3>
                <p className="text-xs text-emerald-300">{allAllocationsList.length} Scheduled Workers • {shift}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2">
              <p className="text-slate-300 leading-relaxed">
                Confirm all <strong className="text-white">{allAllocationsList.length}</strong> allocated personnel on the daily board as <strong>Present</strong> on site for today's shift ({date}).
              </p>
              <p className="text-slate-400 text-[11px]">
                After mass confirmation, supervisors can easily mark exceptions (Absent, Transferred, Left Early, Training) directly from the board or Supervisor Sheet. Original planned allocations remain completely preserved.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsConfirmAllModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAllPresent}
                disabled={isConfirmingAttendance}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow flex items-center space-x-1.5"
              >
                {isConfirmingAttendance ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm All Present</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 13. CREW OPERATIONS MODAL */}
      {isCrewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Users2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Crew Operations & Dispatch</h3>
                  <p className="text-xs text-slate-400">First-class gang movement, shift duplication, and crew splitting</p>
                </div>
              </div>
              <button onClick={() => setIsCrewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Crew Selector */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Select Crew</label>
              <select
                value={selectedCrewId}
                onChange={(e) => setSelectedCrewId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
              >
                {availableCrews.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Sup: {c.supervisorName || '—'} ({c.memberCount || 0} Members)
                  </option>
                ))}
              </select>
            </div>

            {/* Crew Action Type Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setCrewActionType('MOVE')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  crewActionType === 'MOVE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Move Entire Crew
              </button>
              <button
                onClick={() => setCrewActionType('DUPLICATE')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  crewActionType === 'DUPLICATE' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Duplicate to Date
              </button>
              <button
                onClick={() => setCrewActionType('SPLIT')}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                  crewActionType === 'SPLIT' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
                }`}
              >
                Split Crew
              </button>
            </div>

            {/* Action Specific Fields */}
            {crewActionType === 'MOVE' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Target Area / Zone</label>
                  <select
                    value={crewTargetZone}
                    onChange={(e) => {
                      const zid = Number(e.target.value);
                      setCrewTargetZone(zid);
                      const z = boardData?.zones.find((item) => item.id === zid);
                      if (z && z.workstreams.length > 0) setCrewTargetWorkstream(z.workstreams[0].id);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Select Zone --</option>
                    {boardData?.zones
                      .filter((z) => z.isActive !== false)
                      .map((z) => (
                        <option key={z.id} value={z.id}>{z.code} — {z.name}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">Target Workstream</label>
                  <select
                    value={crewTargetWorkstream}
                    onChange={(e) => setCrewTargetWorkstream(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                  >
                    <option value="">-- Select Workstream --</option>
                    {boardData?.zones
                      .find((z) => z.id === Number(crewTargetZone))
                      ?.workstreams.filter((s) => s.isActive !== false)
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {crewActionType === 'DUPLICATE' && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="text-[11px] font-bold text-slate-300 block">Target Duplication Date</label>
                <input
                  type="date"
                  value={crewDuplicateDate}
                  onChange={(e) => setCrewDuplicateDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
                />
                <p className="text-[10px] text-slate-400">
                  Duplicates this entire crew's allocations from {date} to {crewDuplicateDate} with full conflict validation.
                </p>
              </div>
            )}

            {crewActionType === 'SPLIT' && (
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-300">
                  Select individual crew members to temporarily split to another workstream. Permanent crew roster is not affected.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Destination Zone</label>
                    <select
                      value={crewTargetZone}
                      onChange={(e) => {
                        const zid = Number(e.target.value);
                        setCrewTargetZone(zid);
                        const z = boardData?.zones.find((item) => item.id === zid);
                        if (z && z.workstreams.length > 0) setCrewTargetWorkstream(z.workstreams[0].id);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- Select Zone --</option>
                      {boardData?.zones
                        .filter((z) => z.isActive !== false)
                        .map((z) => (
                          <option key={z.id} value={z.id}>{z.code} — {z.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Destination Stream</label>
                    <select
                      value={crewTargetWorkstream}
                      onChange={(e) => setCrewTargetWorkstream(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="">-- Select Stream --</option>
                      {boardData?.zones
                        .find((z) => z.id === Number(crewTargetZone))
                        ?.workstreams.filter((s) => s.isActive !== false)
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Member selection checkboxes */}
                <div className="max-h-40 overflow-y-auto space-y-1.5 pt-1">
                  {allAllocationsList
                    .filter((a) => a.allocation.crewId === Number(selectedCrewId))
                    .map(({ allocation }) => {
                      const isSplitSelected = crewSplitSelectedIds.has(allocation.id);
                      return (
                        <div
                          key={allocation.id}
                          onClick={() => {
                            setCrewSplitSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(allocation.id)) next.delete(allocation.id);
                              else next.add(allocation.id);
                              return next;
                            });
                          }}
                          className={`p-2 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isSplitSelected
                              ? 'bg-amber-500/15 border-amber-500 text-white'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            {isSplitSelected ? <CheckSquare className="w-4 h-4 text-amber-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                            <span className="font-bold">{allocation.person.displayName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{allocation.person.tradeRole}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsCrewModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteCrewAction}
                disabled={isProcessingCrewAction}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-bold text-xs shadow flex items-center space-x-1.5"
              >
                {isProcessingCrewAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Execute Crew Action</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 14. CHANGES TODAY OPERATIONAL VARIANCE MODAL */}
      {isChangesTodayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Activity className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Changes Today — Operational Variances</h3>
                  <p className="text-xs text-slate-400">{activeProject?.name} • {date} • {shift}</p>
                </div>
              </div>
              <button onClick={() => setIsChangesTodayModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Variance Summary Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-rose-400">Absent on Site</div>
                <div className="text-xl font-black text-rose-300 mt-0.5">{absentCount}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-blue-400">Mid-Shift Transfers</div>
                <div className="text-xl font-black text-blue-300 mt-0.5">{transferredCount}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-amber-400">Late / Left Early</div>
                <div className="text-xl font-black text-amber-300 mt-0.5">{lateCount}</div>
              </div>
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <div className="text-[10px] font-bold text-purple-400">Training Queue</div>
                <div className="text-xl font-black text-purple-300 mt-0.5">{trainingCount}</div>
              </div>
            </div>

            {/* Detailed Variance Timeline & Lists */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Field Variance Log vs Published Baseline
              </div>

              {allAllocationsList
                .filter((a) => a.allocation.actualAttendance && a.allocation.actualAttendance !== 'Present')
                .map(({ allocation, zone, workstream }) => (
                  <div key={allocation.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="font-bold text-white flex items-center space-x-2">
                        <span>{allocation.person.displayName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({allocation.person.tradeRole})</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            allocation.actualAttendance === 'Absent'
                              ? 'bg-rose-500/20 text-rose-400'
                              : allocation.actualAttendance === 'Transferred'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {allocation.actualAttendance}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Planned in <strong className="text-slate-300">{zone.code} — {workstream.name}</strong> ({allocation.startTime}–{allocation.endTime})
                      </div>
                      {allocation.actualZone && (
                        <div className="text-[11px] text-blue-300 font-semibold">
                          ↳ Transferred to Area: {allocation.actualZone.code}
                        </div>
                      )}
                      {allocation.actualNotes && (
                        <div className="text-[10px] text-slate-400 italic">
                          "{allocation.actualNotes}"
                        </div>
                      )}
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      {allocation.actualRecordedBy ? `Signed: ${allocation.actualRecordedBy}` : 'Field Recorded'}
                    </div>
                  </div>
                ))}

              {totalVariances === 0 && (
                <div className="p-8 text-center text-slate-500 text-xs bg-slate-950 rounded-xl border border-slate-800">
                  Zero variances recorded today. All personnel matching published muster.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsChangesTodayModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 15. DAILY LABOUR SUMMARY BREAKDOWN MODAL */}
      {isDailySummaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>MAXIM FORGE — DAILY LABOUR SUMMARY</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeProject?.name || activeProject?.code} • {date} • {shift}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={() => {
                    setIsDailySummaryModalOpen(false);
                    setIsPrintModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Sheet</span>
                </button>
                <button onClick={() => setIsDailySummaryModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Executive Rollup KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Workforce</div>
                  <div className="text-xl font-black text-white mt-0.5">{boardData?.totalWorkforce || 0}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-amber-400 uppercase">Planned</div>
                  <div className="text-xl font-black text-amber-300 mt-0.5">{allAllocationsList.length}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-emerald-400 uppercase">Actual Headcount</div>
                  <div className="text-xl font-black text-emerald-300 mt-0.5">{presentCount + transferredCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-rose-400 uppercase">Absent</div>
                  <div className="text-xl font-black text-rose-300 mt-0.5">{absentCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-purple-400 uppercase">Training</div>
                  <div className="text-xl font-black text-purple-300 mt-0.5">{trainingCount}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Unallocated</div>
                  <div className="text-xl font-black text-slate-300 mt-0.5">{boardData?.totalUnallocated || 0}</div>
                </div>
              </div>

              {/* Area Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  <span>Breakdown by Workforce Area (Physical & Logistics)</span>
                </h4>
                <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
                  <thead className="bg-slate-950/80 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">Workforce Area</th>
                      <th className="p-2.5">Linked Project Location</th>
                      <th className="p-2.5 text-center">Planned Headcount</th>
                      <th className="p-2.5 text-center">Actual Headcount</th>
                      <th className="p-2.5 text-center">Absent</th>
                      <th className="p-2.5 text-center">Transferred</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                    {boardData?.zones.map((zone) => {
                      const zoneAllocs = zone.workstreams.flatMap((s) => s.allocations);
                      const zPlanned = zoneAllocs.length;
                      const zAbsent = zoneAllocs.filter((a) => a.actualAttendance === 'Absent').length;
                      const zTransferred = zoneAllocs.filter((a) => a.actualAttendance === 'Transferred' || Boolean(a.actualZoneId)).length;
                      const zActual = zPlanned - zAbsent;
                      return (
                        <tr key={zone.id} className="hover:bg-slate-900/60">
                          <td className="p-2.5 font-bold text-white">{zone.code} — {zone.name}</td>
                          <td className="p-2.5 text-slate-400">
                            {zone.linkedLocation ? (
                              <span className="text-blue-400 font-mono font-bold">Location: {zone.linkedLocation.code}</span>
                            ) : (
                              <span className="italic text-slate-500">Site Logistics / Unlinked</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-amber-300">{zPlanned}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-emerald-300">{zActual}</td>
                          <td className="p-2.5 text-center font-mono text-rose-400">{zAbsent}</td>
                          <td className="p-2.5 text-center font-mono text-blue-400">{zTransferred}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Trade Breakdown */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Breakdown by Trade & Discipline</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {['Electrician', 'Apprentice', 'Leading Hand', 'High Voltage Tech', 'Data Tech', 'Supervisor', 'Logistics'].map((trade) => {
                    const tradeAllocs = allAllocationsList.filter((a) => a.allocation.person.tradeRole === trade);
                    const tPlanned = tradeAllocs.length;
                    const tActual = tradeAllocs.filter((a) => a.allocation.actualAttendance !== 'Absent').length;
                    if (tPlanned === 0) return null;
                    return (
                      <div key={trade} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                        <div className="text-[11px] font-bold text-white">{trade}</div>
                        <div className="flex justify-between text-[11px] mt-1 font-mono">
                          <span className="text-slate-400">Planned: <strong className="text-amber-300">{tPlanned}</strong></span>
                          <span className="text-slate-400">Actual: <strong className="text-emerald-300">{tActual}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Labour to Another Project Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center font-bold">
                  <MoveRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Transfer Labour to Another Project</h3>
                  <p className="text-xs text-slate-400">
                    Reassign worker to another project with conflict and overlap protection.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Select Worker */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Worker to Transfer <span className="text-rose-400">*</span>
                </label>
                <select
                  value={transferPersonId}
                  onChange={(e) => setTransferPersonId(Number(e.target.value) || '')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
                >
                  <option value="">-- Choose Worker --</option>
                  {allAllocationsList.map((a) => (
                    <option key={a.allocation.id} value={a.allocation.person.id}>
                      {a.allocation.person.displayName} ({a.allocation.person.tradeRole}) &bull; {a.allocation.startTime}–{a.allocation.endTime}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Project */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Destination Project <span className="text-rose-400">*</span>
                </label>
                <select
                  value={transferTargetProjectId}
                  onChange={(e) => setTransferTargetProjectId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
                >
                  {userProjects
                    .filter((p) => p.id !== activeProject?.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} &bull; {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Date & Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Transfer Date
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Shift
                  </label>
                  <select
                    value={transferShift}
                    onChange={(e) => setTransferShift(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="Day Shift">Day Shift (07:00–15:30)</option>
                    <option value="Back Shift">Back Shift (15:00–23:00)</option>
                    <option value="Night Shift">Night Shift (23:00–07:00)</option>
                  </select>
                </div>
              </div>

              {/* Transfer Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Transfer Reason / Notes
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Surge containment support for Level 02"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-start space-x-2">
                <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  The cross-project conflict engine strictly prevents double-booking across projects during identical shift hours.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setIsTransferModalOpen(false)}
                disabled={transferLoading}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteProjectTransfer}
                disabled={transferLoading || !transferPersonId}
                className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center space-x-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <MoveRight className="w-4 h-4" />
                <span>{transferLoading ? 'Transferring...' : 'Execute Transfer'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 16. COPY PREVIOUS DAY / REPLICATE SCHEDULE MODAL */}
      {isCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                  <Copy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Copy Day Allocations & Schedule</h3>
                  <p className="text-xs text-slate-400">
                    Replicate labour allocations with conflict detection, qualification checks, and pre-commit validation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCopyModalOpen(false);
                  setCopyDryRunResult(null);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-140px)]">
              {/* Source & Target Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Date Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Source Date</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Day to copy from</span>
                  </div>
                  <input
                    type="date"
                    value={sourceCopyDate}
                    onChange={(e) => {
                      setSourceCopyDate(e.target.value);
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                  {/* Quick helper shortcuts */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceCopyDate(getPreviousDateStr(targetCopyDate));
                        setCopyDryRunResult(null);
                      }}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 cursor-pointer"
                    >
                      Previous Day
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const parts = targetCopyDate.split('-');
                          const d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
                          d.setUTCDate(d.getUTCDate() - 7);
                          setSourceCopyDate(d.toISOString().split('T')[0]);
                          setCopyDryRunResult(null);
                        } catch {}
                      }}
                      className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300 cursor-pointer"
                    >
                      Last Week (-7d)
                    </button>
                  </div>
                </div>

                {/* Target Date Card */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                      <span>Target Date</span>
                    </label>
                    <span className="text-[10px] text-slate-500">Destination board</span>
                  </div>
                  <input
                    type="date"
                    value={targetCopyDate}
                    onChange={(e) => {
                      setTargetCopyDate(e.target.value);
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:border-amber-500 outline-none"
                  />
                  <div className="text-[10px] text-slate-400 pt-1">
                    {targetCopyDate === date ? (
                      <span className="text-amber-400 font-medium">Currently viewing this day</span>
                    ) : (
                      <span>Will populate board for {targetCopyDate}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Shift and Scope Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shift Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Shift Selection
                  </label>
                  <select
                    value={copyShift}
                    onChange={(e) => {
                      setCopyShift(e.target.value);
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="All">All Shifts</option>
                    <option value="Day Shift">Day Shift (07:00–15:30)</option>
                    <option value="Back Shift">Back Shift (15:00–23:00)</option>
                    <option value="Night Shift">Night Shift (23:00–07:00)</option>
                  </select>
                </div>

                {/* Scope Mode Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Copy Scope
                  </label>
                  <select
                    value={copyMode}
                    onChange={(e: any) => {
                      setCopyMode(e.target.value);
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="WEEK">Entire Day (All Areas & Streams)</option>
                    <option value="AREA">Specific Area / Zone Only</option>
                    <option value="WORKSTREAM">Specific Workstream Only</option>
                    <option value="CREW">Specific Crew Only</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Scope Filters */}
              {copyMode === 'AREA' && (
                <div className="animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Area / Zone <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={copyFilterZoneId}
                    onChange={(e) => {
                      setCopyFilterZoneId(Number(e.target.value) || '');
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">-- Choose Area / Zone --</option>
                    {boardData?.zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        [{z.code}] {z.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {copyMode === 'WORKSTREAM' && (
                <div className="animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Workstream <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={copyFilterWorkstreamId}
                    onChange={(e) => {
                      setCopyFilterWorkstreamId(Number(e.target.value) || '');
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">-- Choose Workstream --</option>
                    {boardData?.zones.flatMap((z) =>
                      z.workstreams.map((ws) => (
                        <option key={ws.id} value={ws.id}>
                          {z.name} &rarr; {ws.name} ({ws.code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {copyMode === 'CREW' && (
                <div className="animate-in fade-in">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Select Crew <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={copyFilterCrewId}
                    onChange={(e) => {
                      setCopyFilterCrewId(Number(e.target.value) || '');
                      setCopyDryRunResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-amber-500 outline-none"
                  >
                    <option value="">-- Choose Crew --</option>
                    {availableCrews.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.leadTrade})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action 1: Pre-commit dry run analysis button */}
              {!copyDryRunResult && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleRunCopyPreview}
                    disabled={
                      isDryRunning ||
                      !sourceCopyDate ||
                      !targetCopyDate ||
                      (copyMode === 'AREA' && !copyFilterZoneId) ||
                      (copyMode === 'WORKSTREAM' && !copyFilterWorkstreamId) ||
                      (copyMode === 'CREW' && !copyFilterCrewId)
                    }
                    className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isDryRunning
                        ? 'Validating Conflicts & Availability...'
                        : 'Run Pre-Commit Conflict & Compliance Check'}
                    </span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Validates forward conflicts across projects, worker availability, and qualification restrictions before copying.
                  </p>
                </div>
              )}

              {/* Pre-Commit Dry Run Report */}
              {copyDryRunResult && (
                <div className="space-y-4 bg-slate-950 border border-slate-800 rounded-2xl p-4.5 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span className="font-extrabold text-sm text-white">Validation Analysis</span>
                    </div>
                    <span className="text-xs text-emerald-400 font-extrabold">
                      {copyDryRunResult.readyToCopyCount} Ready to Copy
                    </span>
                  </div>

                  {/* Summary Metric Badges */}
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Source Records</div>
                      <div className="text-lg font-black text-white">{copyDryRunResult.totalSourceAllocations}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] text-rose-400 font-semibold uppercase">Conflicts</div>
                      <div className="text-lg font-black text-rose-300">{copyDryRunResult.conflictsCount}</div>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      <div className="text-[10px] text-amber-400 font-semibold uppercase">Unavailable / Warn</div>
                      <div className="text-lg font-black text-amber-300">
                        {copyDryRunResult.unavailableCount + copyDryRunResult.warningsCount}
                      </div>
                    </div>
                  </div>

                  {/* Problem Records List (with Exclusion Checkbox) */}
                  {(copyDryRunResult.conflicts?.length > 0 || copyDryRunResult.unavailableWorkers?.length > 0) && (
                    <div className="space-y-2 mt-2">
                      <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                        <span>Detected Issues (Excluded by Default to Protect Board):</span>
                        <span className="text-[10px] text-slate-400">
                          {copyExcludedPersonIds.length} worker(s) excluded
                        </span>
                      </div>
                      <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                        {copyDryRunResult.conflicts?.map((c: any, i: number) => {
                          const isExcluded = copyExcludedPersonIds.includes(c.personId);
                          return (
                            <div
                              key={`c-${i}`}
                              className="flex items-center justify-between p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-[11px]"
                            >
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCopyExcludedPersonIds(copyExcludedPersonIds.filter((id) => id !== c.personId));
                                    } else {
                                      setCopyExcludedPersonIds([...copyExcludedPersonIds, c.personId]);
                                    }
                                  }}
                                  className="rounded border-rose-500 text-rose-500 focus:ring-0"
                                />
                                <span className="font-bold text-rose-200">{c.workerName}</span>
                              </label>
                              <span className="text-rose-400 text-[10px]">{c.reason}</span>
                            </div>
                          );
                        })}

                        {copyDryRunResult.unavailableWorkers?.map((u: any, i: number) => {
                          const isExcluded = copyExcludedPersonIds.includes(u.personId);
                          return (
                            <div
                              key={`u-${i}`}
                              className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px]"
                            >
                              <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!isExcluded}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setCopyExcludedPersonIds(copyExcludedPersonIds.filter((id) => id !== u.personId));
                                    } else {
                                      setCopyExcludedPersonIds([...copyExcludedPersonIds, u.personId]);
                                    }
                                  }}
                                  className="rounded border-amber-500 text-amber-500 focus:ring-0"
                                />
                                <span className="font-bold text-amber-200">{u.workerName}</span>
                              </label>
                              <span className="text-amber-400 text-[10px]">{u.reason}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Ready to Copy Preview Items */}
                  {copyDryRunResult.readyToCopy?.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-bold text-slate-300">
                        Ready to Allocate ({copyDryRunResult.readyToCopyCount} total):
                      </div>
                      <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                        {copyDryRunResult.readyToCopy.slice(0, 15).map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                          >
                            <span className="text-slate-200 font-medium">Worker #{item.personId}</span>
                            <span className="text-slate-400 text-[10px]">
                              {item.shift} &bull; {item.startTime}–{item.endTime}
                            </span>
                          </div>
                        ))}
                        {copyDryRunResult.readyToCopy.length > 15 && (
                          <div className="text-[10px] text-center text-slate-500 pt-1">
                            + {copyDryRunResult.readyToCopy.length - 15} more workers ready
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Modal Action Buttons */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCopyDryRunResult(null)}
                      className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Re-configure Scope
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitCopy}
                      disabled={isCommittingCopy || copyDryRunResult.readyToCopyCount === 0}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center space-x-2 shadow-md transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {isCommittingCopy
                          ? 'Committing Allocations...'
                          : `Confirm & Commit Safe Allocations to ${targetCopyDate}`}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workforce Structure Management Master Modal */}
      <WorkforceStructureModal
        isOpen={isStructureModalOpen}
        onClose={() => {
          setIsStructureModalOpen(false);
          setInitialAddZoneTrigger(false);
          setInitialAddStreamZoneId(null);
        }}
        onStructureChange={() => {
          fetchBoard();
        }}
        initialAddZone={initialAddZoneTrigger}
        initialAddStreamZoneId={initialAddStreamZoneId}
      />
    </div>
  );
};

