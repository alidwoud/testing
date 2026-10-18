/**
 * MAXIM FORGE — Professional Daily Labour Export Service
 * Produces production-grade Excel (.xlsx), presentation-ready PDF, and Print layouts
 * with strict hierarchy: Area/Zone -> Workstream -> Workers, compact summary KPIs,
 * mid-shift transfer tracking, special bottom sections, and strict neutral fallbacks.
 */

import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface ExportWorkerAllocation {
  id: number;
  personId: number;
  employeeId: string;
  workerName: string;
  tradeRole: string;
  companyName: string;
  crewName: string;
  shift: string;
  plannedStartTime: string;
  plannedEndTime: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  hours: string; // e.g. "07:00–15:30"
  status: string; // "Allocated", "Present", "Absent", "Late", "Transferred"
  attendance: string; // "Present", "Absent", "Late", "Transferred"
  supervisor: string;
  notes: string;
  isTransferred: boolean;
  transferDetails?: string | null;
  hasWarning?: boolean;
  warningText?: string | null;
}

export interface ExportWorkstream {
  id: number;
  name: string;
  color?: string;
  workerCount: number;
  workers: ExportWorkerAllocation[];
}

export interface ExportArea {
  id: number;
  code: string;
  name: string;
  headcount: number;
  workstreams: ExportWorkstream[];
}

export interface ExportSpecialWorker {
  id: number;
  personId?: number;
  employeeId: string;
  workerName: string;
  tradeRole: string;
  companyName: string;
  statusOrReason: string;
  details?: string;
  notes?: string;
}

export interface DailyLabourExportPayload {
  project: {
    id?: number;
    name: string;
    code: string;
  };
  date: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "16/10/2026" or "Friday, 16 October 2026"
  shift: string; // e.g. "Day Shift — 07:00–15:30"
  dataMode: 'PLANNED' | 'ACTUAL' | 'COMPARISON';
  status: 'Published' | 'Draft' | 'Locked';
  generatedAt: string;
  scope: 'FULL' | 'FILTERED';
  filterDescription?: string;

  summary: {
    totalWorkforce: number;
    allocated: number;
    present: number;
    absent: number;
    unallocated: number;
    unavailable: number;
    training: number;
    warnings: number;
    conflicts: number;
  };

  areas: ExportArea[];

  specialSections: {
    unallocated: ExportSpecialWorker[];
    unavailable: ExportSpecialWorker[];
    onLeave: ExportSpecialWorker[];
    training: ExportSpecialWorker[];
    warningsAndConflicts: ExportSpecialWorker[];
  };
}

// ==========================================
// STANDARD FILE NAMING HELPER
// ==========================================

export function getStandardFilename(
  projectCode: string,
  date: string,
  shift: string,
  dataMode: 'PLANNED' | 'ACTUAL' | 'COMPARISON',
  format: 'xlsx' | 'pdf' | 'csv',
  scope: 'FULL' | 'FILTERED' = 'FULL'
): string {
  const pCode = (projectCode || 'MEL02').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanDate = (date || new Date().toISOString().split('T')[0]).trim();
  const shiftSlug = (shift || 'Day Shift')
    .split(/[—–\-(]/)[0]
    .trim()
    .replace(/\s+/g, '_');
  const modeSlug = dataMode === 'ACTUAL' ? '_Actual' : dataMode === 'COMPARISON' ? '_Comparison' : '';
  const scopeSlug = scope === 'FILTERED' ? '_Filtered' : '';

  return `${pCode}_Daily_Labour${modeSlug}${scopeSlug}_${cleanDate}_${shiftSlug}.${format}`;
}

// ==========================================
// PAYLOAD TRANSFORMER (FROM BOARD DATA)
// ==========================================

export function buildDailyLabourExportPayload(params: {
  project: { id?: number; name?: string; code?: string };
  date: string;
  shift: string;
  dataMode: 'PLANNED' | 'ACTUAL' | 'COMPARISON';
  boardData: any;
  scope: 'FULL' | 'FILTERED';
  filteredPersonRows?: any[];
  filterDescription?: string;
}): DailyLabourExportPayload {
  const { project, date, shift, dataMode, boardData, scope, filteredPersonRows, filterDescription } = params;

  const projName = project.name || 'DC Melbourne 02';
  const projCode = project.code || 'MEL02';

  // Format date as DD/MM/YYYY and extended string
  const dObj = new Date(date + 'T12:00:00Z');
  const day = String(dObj.getUTCDate()).padStart(2, '0');
  const month = String(dObj.getUTCMonth() + 1).padStart(2, '0');
  const year = dObj.getUTCFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  const dayStatus: 'Published' | 'Draft' | 'Locked' = boardData?.dayState?.status || 'Draft';
  const generatedAt = new Date().toLocaleString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Track mid-shift transfers and multiple segment allocations per worker
  // A worker might have allocations in multiple workstreams/zones (e.g. 07:00–11:30 and 11:30–15:30)
  const personAllocCount = new Map<number, number>();
  (boardData?.zones || []).forEach((z: any) => {
    (z.workstreams || []).forEach((ws: any) => {
      (ws.allocations || []).forEach((a: any) => {
        if (a.personId) {
          personAllocCount.set(a.personId, (personAllocCount.get(a.personId) || 0) + 1);
        }
      });
    });
  });

  // If scoped to filtered rows, extract set of included allocation / person IDs
  const filteredPersonIdSet = scope === 'FILTERED' && filteredPersonRows
    ? new Set(filteredPersonRows.map((r: any) => r.person?.id).filter(Boolean))
    : null;

  // Build Areas & Workstreams hierarchy
  let totalAllocated = 0;
  let presentCount = 0;
  let absentCount = 0;
  let warningsCount = 0;

  const areas: ExportArea[] = [];

  (boardData?.zones || []).forEach((z: any) => {
    const workstreams: ExportWorkstream[] = [];

    (z.workstreams || []).forEach((ws: any) => {
      const workers: ExportWorkerAllocation[] = [];

      (ws.allocations || []).forEach((a: any) => {
        const p = a.person || {};
        if (filteredPersonIdSet && !filteredPersonIdSet.has(p.id)) {
          return; // Skip if filtered out
        }

        const isMultiSegment = (personAllocCount.get(a.personId) || 0) > 1;
        const isTransferred =
          a.actualAttendance === 'Transferred' ||
          Boolean(a.actualZoneId && a.actualZoneId !== z.id) ||
          Boolean(a.actualWorkstreamId && a.actualWorkstreamId !== ws.id);

        let transferDetails: string | null = null;
        if (isTransferred) {
          const destZone = a.actualZone?.code || a.actualZone?.name || 'Another Area';
          const destStream = a.actualWorkstream?.name ? ` • ${a.actualWorkstream.name}` : '';
          const atTime = a.actualStartTime ? ` at ${a.actualStartTime}` : '';
          transferDetails = `Transferred to ${destZone}${destStream}${atTime}`;
        } else if (isMultiSegment) {
          transferDetails = `Segment allocation (${a.startTime || '07:00'}–${a.endTime || '15:30'})`;
        }

        const plannedHours = a.startTime && a.endTime ? `${a.startTime}–${a.endTime}` : '07:00–15:30';
        const actualHours =
          a.actualStartTime && a.actualEndTime
            ? `${a.actualStartTime}–${a.actualEndTime}`
            : plannedHours;

        const hoursDisplay = dataMode === 'ACTUAL' ? actualHours : plannedHours;
        const attendanceDisplay =
          dataMode === 'ACTUAL'
            ? a.actualAttendance || 'Present'
            : a.status || 'Allocated';

        if (attendanceDisplay === 'Present' || attendanceDisplay === 'Allocated') presentCount++;
        if (attendanceDisplay === 'Absent') absentCount++;
        if (a.person?.complianceStatus === 'NOT COMPLIANT' || a.person?.complianceStatus === 'WARNING' || a.qualificationWarning) {
          warningsCount++;
        }

        let notes = a.actualNotes || a.notes || '—';
        if (transferDetails && notes === '—') {
          notes = transferDetails;
        } else if (transferDetails && !notes.includes(transferDetails)) {
          notes = `${transferDetails}; ${notes}`;
        }

        workers.push({
          id: a.id,
          personId: p.id || a.personId,
          employeeId: p.employeeId || '—',
          workerName: p.displayName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unknown Worker',
          tradeRole: p.tradeRole || 'Not Set',
          companyName: p.companyName || 'Not Set',
          crewName: a.crewName || p.crewName || p.defaultCrewName || '—',
          shift: a.shift || shift,
          plannedStartTime: a.startTime || '07:00',
          plannedEndTime: a.endTime || '15:30',
          actualStartTime: a.actualStartTime,
          actualEndTime: a.actualEndTime,
          hours: hoursDisplay,
          status: a.status || 'Allocated',
          attendance: attendanceDisplay,
          supervisor: a.supervisorName || p.defaultSupervisorName || '—',
          notes,
          isTransferred,
          transferDetails,
          hasWarning: Boolean(a.person?.complianceStatus === 'NOT COMPLIANT' || a.qualificationWarning),
          warningText: a.qualificationWarning || null,
        });
      });

      if (workers.length > 0 || (ws.isActive && scope === 'FULL')) {
        workstreams.push({
          id: ws.id,
          name: ws.name || 'Unassigned',
          color: ws.color || '#3b82f6',
          workerCount: workers.length,
          workers,
        });
        totalAllocated += workers.length;
      }
    });

    const zoneHeadcount = workstreams.reduce((acc, ws) => acc + ws.workerCount, 0);
    if (zoneHeadcount > 0 || (z.isActive && scope === 'FULL')) {
      areas.push({
        id: z.id,
        code: z.code || 'ZONE',
        name: z.name || 'Unassigned',
        headcount: zoneHeadcount,
        workstreams,
      });
    }
  });

  // Build Special Sections at bottom
  const unallocatedList: ExportSpecialWorker[] = [];
  const unavailableList: ExportSpecialWorker[] = [];
  const onLeaveList: ExportSpecialWorker[] = [];
  const trainingList: ExportSpecialWorker[] = [];
  const warningsAndConflictsList: ExportSpecialWorker[] = [];

  // 1. Unallocated workers
  (boardData?.unallocated || []).forEach((u: any) => {
    if (filteredPersonIdSet && !filteredPersonIdSet.has(u.id)) return;
    unallocatedList.push({
      id: u.id,
      personId: u.id,
      employeeId: u.employeeId || '—',
      workerName: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown Worker',
      tradeRole: u.tradeRole || 'Not Set',
      companyName: u.companyName || 'Not Set',
      statusOrReason: 'Unallocated (Available)',
      details: u.classification || '—',
      notes: u.notes || '—',
    });
  });

  // 2. Unavailable, On Leave, Training
  (boardData?.unavailable || []).forEach((u: any) => {
    if (filteredPersonIdSet && !filteredPersonIdSet.has(u.id)) return;
    const reason = u.unavailableReason || 'Unavailable';
    const specialItem: ExportSpecialWorker = {
      id: u.id,
      personId: u.id,
      employeeId: u.employeeId || '—',
      workerName: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown Worker',
      tradeRole: u.tradeRole || 'Not Set',
      companyName: u.companyName || 'Not Set',
      statusOrReason: reason,
      details: u.unavailableNotes || u.notes || '—',
      notes: u.unavailableNotes || '—',
    };

    if (reason === 'On Leave' || u.employmentStatus === 'On Leave' || u.employmentStatus === 'Leave') {
      onLeaveList.push(specialItem);
    } else if (reason === 'Training' || u.employmentStatus === 'Training') {
      trainingList.push(specialItem);
    } else {
      unavailableList.push(specialItem);
    }
  });

  // 3. Warnings and Conflicts
  areas.forEach((a) => {
    a.workstreams.forEach((ws) => {
      ws.workers.forEach((w) => {
        if (w.hasWarning || w.warningText) {
          warningsAndConflictsList.push({
            id: w.id,
            personId: w.personId,
            employeeId: w.employeeId,
            workerName: w.workerName,
            tradeRole: w.tradeRole,
            companyName: w.companyName,
            statusOrReason: 'Qualification Warning',
            details: w.warningText || 'Qualification restriction or expiry',
            notes: `${a.code} — ${ws.name}`,
          });
        }
      });
    });
  });

  const totalWorkforce =
    totalAllocated +
    unallocatedList.length +
    unavailableList.length +
    onLeaveList.length +
    trainingList.length;

  return {
    project: {
      id: project.id,
      name: projName,
      code: projCode,
    },
    date,
    formattedDate,
    shift,
    dataMode,
    status: dayStatus,
    generatedAt,
    scope,
    filterDescription,
    summary: {
      totalWorkforce,
      allocated: totalAllocated,
      present: presentCount,
      absent: absentCount,
      unallocated: unallocatedList.length,
      unavailable: unavailableList.length + onLeaveList.length,
      training: trainingList.length,
      warnings: warningsCount || warningsAndConflictsList.length,
      conflicts: boardData?.conflictsCount || 0,
    },
    areas,
    specialSections: {
      unallocated: unallocatedList,
      unavailable: unavailableList,
      onLeave: onLeaveList,
      training: trainingList,
      warningsAndConflicts: warningsAndConflictsList,
    },
  };
}

// ==========================================
// 1. EXCEL WORKBOOK GENERATOR (EXCELJS)
// ==========================================

export async function generateDailyLabourWorkbook(payload: DailyLabourExportPayload): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MAXIM FORGE';
  workbook.lastModifiedBy = 'MAXIM FORGE Workforce Engine';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheetTitle = payload.dataMode === 'ACTUAL' ? 'Actual Daily Labour' : 'Daily Labour Sheet';
  const worksheet = workbook.addWorksheet(sheetTitle, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 6 }],
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.5,
        bottom: 0.5,
        header: 0.2,
        footer: 0.2,
      },
    },
    headerFooter: {
      firstHeader: `&LMAXIM FORGE — ${payload.project.code}&C${sheetTitle.toUpperCase()}&R${payload.formattedDate}`,
      oddHeader: `&LMAXIM FORGE — ${payload.project.code}&C${sheetTitle.toUpperCase()}&R${payload.formattedDate}`,
      oddFooter: '&LConfidential — Operational Daily Labour&CPage &P of &N&R&D &T',
    },
  });

  // Define Column Widths (A to H)
  worksheet.columns = [
    { key: 'colA', width: 28 }, // Name & ID
    { key: 'colB', width: 20 }, // Trade / Role
    { key: 'colC', width: 28 }, // Company
    { key: 'colD', width: 16 }, // Crew
    { key: 'colE', width: 16 }, // Hours
    { key: 'colF', width: 16 }, // Attendance / Status
    { key: 'colG', width: 20 }, // Supervisor
    { key: 'colH', width: 34 }, // Notes / Transfer
  ];

  // Helper styles
  const darkSlateFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' },
  };
  const amberAccentFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF59E0B' },
  };
  const slateBannerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  };
  const lightGreyFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' },
  };
  const zebraFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  // --- ROW 1: BRANDING & REPORT TITLE ---
  const reportMainTitle =
    payload.dataMode === 'ACTUAL'
      ? 'MAXIM FORGE — ACTUAL DAILY LABOUR SHEET'
      : payload.dataMode === 'COMPARISON'
      ? 'MAXIM FORGE — PLANNED VS ACTUAL LABOUR COMPARISON'
      : 'MAXIM FORGE — DAILY LABOUR SHEET';

  worksheet.mergeCells('A1:H1');
  const r1 = worksheet.getCell('A1');
  r1.value = reportMainTitle;
  r1.fill = darkSlateFill;
  r1.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  r1.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 36;

  // --- ROW 2: PROJECT METADATA BANNER ---
  worksheet.mergeCells('A2:H2');
  const r2 = worksheet.getCell('A2');
  r2.value = `PROJECT: ${payload.project.name} (${payload.project.code})   •   DATE: ${payload.formattedDate}   •   SHIFT: ${payload.shift}   •   STATUS: ${payload.status.toUpperCase()}`;
  r2.fill = slateBannerFill;
  r2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFBBF24' } }; // Amber-400
  r2.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 22;

  // --- ROW 3: REPORT SUBTITLE / GENERATED INFO ---
  worksheet.mergeCells('A3:H3');
  const r3 = worksheet.getCell('A3');
  const scopeText = payload.scope === 'FILTERED' ? `Filtered View (${payload.filterDescription || 'Active Filters'})` : 'Full Site Daily Labour Roster';
  r3.value = `Generated: ${payload.generatedAt}   |   Scope: ${scopeText}   |   Mode: ${payload.dataMode}   |   MAXIM FORGE Live Operational Export`;
  r3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
  r3.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FFE2E8F0' } };
  r3.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(3).height = 18;

  // --- ROW 4: EMPTY SEPARATOR ---
  worksheet.getRow(4).height = 8;

  // --- ROW 5: SUMMARY KPI HEADERS ---
  const kpiHeaders = [
    'TOTAL WORKFORCE',
    'ALLOCATED',
    payload.dataMode === 'ACTUAL' ? 'PRESENT' : 'SCHEDULED',
    payload.dataMode === 'ACTUAL' ? 'ABSENT' : 'UNALLOCATED',
    'UNAVAILABLE',
    'ON LEAVE',
    'TRAINING',
    'WARNINGS / CONFLICTS',
  ];
  const summaryRow = worksheet.getRow(5);
  summaryRow.height = 18;
  kpiHeaders.forEach((text, idx) => {
    const cell = summaryRow.getCell(idx + 1);
    cell.value = text;
    cell.fill = lightGreyFill;
    cell.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF475569' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  // --- ROW 6: SUMMARY KPI VALUES ---
  const s = payload.summary;
  const kpiValues = [
    s.totalWorkforce,
    s.allocated,
    payload.dataMode === 'ACTUAL' ? s.present : s.allocated,
    payload.dataMode === 'ACTUAL' ? s.absent : s.unallocated,
    s.unavailable,
    payload.specialSections.onLeave.length,
    s.training,
    s.warnings,
  ];
  const valRow = worksheet.getRow(6);
  valRow.height = 24;
  kpiValues.forEach((val, idx) => {
    const cell = valRow.getCell(idx + 1);
    cell.value = val;
    cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
    if (idx === 1) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } }; // Amber
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF92400E' } };
    } else if (idx === 2) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }; // Emerald
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF065F46' } };
    } else if (idx === 3 && payload.dataMode === 'ACTUAL' && Number(val) > 0) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E6' } }; // Rose
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF9F1239' } };
    } else if (idx === 7 && Number(val) > 0) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }; // Alert
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFB91C1C' } };
    }
  });

  // --- ROW 7: EMPTY SEPARATOR ---
  worksheet.getRow(7).height = 10;
  let currentRowNum = 8;

  // --- GROUP LABOUR BY AREA / ZONE -> WORKSTREAM -> WORKERS ---
  payload.areas.forEach((area) => {
    // Area / Zone Heading
    worksheet.mergeCells(`A${currentRowNum}:H${currentRowNum}`);
    const areaCell = worksheet.getCell(`A${currentRowNum}`);
    areaCell.value = `AREA / ZONE: ${area.code} — ${area.name.toUpperCase()}   (Headcount: ${area.headcount})`;
    areaCell.fill = slateBannerFill;
    areaCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    areaCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(currentRowNum).height = 24;
    currentRowNum++;

    // Workstreams under this Area
    area.workstreams.forEach((ws) => {
      // Workstream Subtitle
      worksheet.mergeCells(`A${currentRowNum}:H${currentRowNum}`);
      const wsCell = worksheet.getCell(`A${currentRowNum}`);
      wsCell.value = `WORKSTREAM: ${ws.name.toUpperCase()}   •   ${ws.workerCount} workers`;
      wsCell.fill = lightGreyFill;
      wsCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF1E293B' } };
      wsCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
      worksheet.getRow(currentRowNum).height = 20;
      currentRowNum++;

      // Worker Table Headers
      const colHeaders = [
        'Worker Name',
        'Trade / Role',
        'Company',
        'Crew',
        payload.dataMode === 'ACTUAL' ? 'Actual Hours' : 'Planned Hours',
        payload.dataMode === 'ACTUAL' ? 'Muster Status' : 'Status',
        'Supervisor',
        'Notes / Mid-Shift Transfer',
      ];
      const hRow = worksheet.getRow(currentRowNum);
      hRow.height = 20;
      colHeaders.forEach((title, idx) => {
        const c = hRow.getCell(idx + 1);
        c.value = title;
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF475569' } };
        c.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
        c.alignment = { horizontal: idx === 4 || idx === 5 ? 'center' : 'left', vertical: 'middle' };
        c.border = thinBorder;
      });
      currentRowNum++;

      // Worker Rows
      if (ws.workers.length === 0) {
        worksheet.mergeCells(`A${currentRowNum}:H${currentRowNum}`);
        const emptyCell = worksheet.getCell(`A${currentRowNum}`);
        emptyCell.value = '— No workers allocated to this workstream —';
        emptyCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF94A3B8' } };
        emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
        emptyCell.border = thinBorder;
        worksheet.getRow(currentRowNum).height = 18;
        currentRowNum++;
      } else {
        ws.workers.forEach((w, wIdx) => {
          const wRow = worksheet.getRow(currentRowNum);
          wRow.height = 22;
          const isZebra = wIdx % 2 === 1;

          // 1. Name & ID
          const c1 = wRow.getCell(1);
          c1.value = `${w.workerName} (${w.employeeId})`;
          c1.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0F172A' } };

          // 2. Trade
          const c2 = wRow.getCell(2);
          c2.value = w.tradeRole;
          c2.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };

          // 3. Company
          const c3 = wRow.getCell(3);
          c3.value = w.companyName;
          c3.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };

          // 4. Crew
          const c4 = wRow.getCell(4);
          c4.value = w.crewName;
          c4.font = { name: 'Arial', size: 9, color: { argb: 'FF475569' } };

          // 5. Hours
          const c5 = wRow.getCell(5);
          c5.value = w.hours;
          c5.alignment = { horizontal: 'center', vertical: 'middle' };
          c5.font = { name: 'Arial', size: 9, color: { argb: 'FF0F172A' } };

          // 6. Attendance / Status
          const c6 = wRow.getCell(6);
          c6.value = w.attendance;
          c6.alignment = { horizontal: 'center', vertical: 'middle' };
          c6.font = { name: 'Arial', size: 9, bold: true };
          if (w.attendance === 'Present' || w.attendance === 'Allocated') {
            c6.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
          } else if (w.attendance === 'Absent') {
            c6.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9F1239' } };
          } else if (w.attendance === 'Transferred') {
            c6.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF1D4ED8' } };
          }

          // 7. Supervisor
          const c7 = wRow.getCell(7);
          c7.value = w.supervisor;
          c7.font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };

          // 8. Notes / Mid-Shift Transfer
          const c8 = wRow.getCell(8);
          c8.value = w.notes;
          c8.alignment = { wrapText: true, vertical: 'middle' };
          c8.font = {
            name: 'Arial',
            size: 9,
            color: w.isTransferred ? { argb: 'FF1E40AF' } : { argb: 'FF475569' },
            bold: w.isTransferred,
          };

          for (let c = 1; c <= 8; c++) {
            const cell = wRow.getCell(c);
            cell.border = thinBorder;
            if (isZebra && c !== 6) {
              cell.fill = zebraFill;
            }
          }

          currentRowNum++;
        });
      }

      // Small spacer row
      worksheet.getRow(currentRowNum).height = 4;
      currentRowNum++;
    });

    // Space after Area
    worksheet.getRow(currentRowNum).height = 8;
    currentRowNum++;
  });

  // --- SPECIAL SECTIONS (AT BOTTOM) ---
  const { unallocated, unavailable, onLeave, training, warningsAndConflicts } = payload.specialSections;

  const renderSpecialSection = (
    title: string,
    badgeColor: string,
    items: ExportSpecialWorker[],
    statusHeader: string = 'Status / Reason'
  ) => {
    if (items.length === 0) return;

    worksheet.mergeCells(`A${currentRowNum}:H${currentRowNum}`);
    const secCell = worksheet.getCell(`A${currentRowNum}`);
    secCell.value = `${title} (${items.length} records)`;
    secCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: badgeColor } };
    secCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    secCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    worksheet.getRow(currentRowNum).height = 22;
    currentRowNum++;

    // Headers
    const sHRow = worksheet.getRow(currentRowNum);
    sHRow.height = 18;
    ['Worker Name', 'Trade / Role', 'Company', statusHeader, 'Details / Shift', 'Supervisor', 'Assigned Shift', 'Notes'].forEach((h, idx) => {
      const c = sHRow.getCell(idx + 1);
      c.value = h;
      c.fill = lightGreyFill;
      c.font = { name: 'Arial', size: 8, bold: true, color: { argb: 'FF475569' } };
      c.border = thinBorder;
    });
    currentRowNum++;

    // Items
    items.forEach((item, idx) => {
      const row = worksheet.getRow(currentRowNum);
      row.height = 20;
      row.getCell(1).value = `${item.workerName} (${item.employeeId})`;
      row.getCell(2).value = item.tradeRole;
      row.getCell(3).value = item.companyName;
      row.getCell(4).value = item.statusOrReason;
      row.getCell(5).value = item.details || '—';
      row.getCell(6).value = '—';
      row.getCell(7).value = payload.shift;
      row.getCell(8).value = item.notes || '—';

      for (let c = 1; c <= 8; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF334155' } };
        cell.border = thinBorder;
        if (idx % 2 === 1) cell.fill = zebraFill;
      }
      currentRowNum++;
    });

    worksheet.getRow(currentRowNum).height = 8;
    currentRowNum++;
  };

  renderSpecialSection('SPECIAL SECTION: UNALLOCATED WORKERS (ON ROSTER)', 'FF475569', unallocated);
  renderSpecialSection('SPECIAL SECTION: UNAVAILABLE LABOUR', 'FF991B1B', unavailable, 'Restriction Reason');
  renderSpecialSection('SPECIAL SECTION: ON APPROVED LEAVE', 'FF1E40AF', onLeave, 'Leave Type');
  renderSpecialSection('SPECIAL SECTION: SCHEDULED TRAINING ATTENDEES', 'FF6B21A8', training, 'Training Course');
  renderSpecialSection('SPECIAL SECTION: COMPLIANCE WARNINGS & CONFLICTS', 'FF92400E', warningsAndConflicts, 'Issue Detected');

  return workbook;
}

// ==========================================
// 2. PRESENTATION-READY PDF GENERATOR (JSPDF)
// ==========================================

export async function generateDailyLabourPdf(payload: DailyLabourExportPayload): Promise<jsPDF> {
  // A4 Landscape: width 297mm, height 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210
  const marginX = 12;

  let currentY = 12;

  // Header Bar Branding
  doc.setFillColor(15, 23, 42); // Dark slate (#0F172A)
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 22, 'F');

  // Gold / Amber Top Stripe
  doc.setFillColor(245, 158, 11); // Amber-500
  doc.rect(marginX, currentY, pageWidth - marginX * 2, 2, 'F');

  // Company Brand & Document Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const pdfTitle =
    payload.dataMode === 'ACTUAL'
      ? 'ACTUAL DAILY LABOUR SHEET'
      : payload.dataMode === 'COMPARISON'
      ? 'PLANNED VS ACTUAL LABOUR COMPARISON'
      : 'DAILY LABOUR SHEET';

  doc.text('MAXIM FORGE', marginX + 4, currentY + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(251, 191, 36); // Amber-400
  doc.text('ENTERPRISE LABOUR & SITE ALLOCATIONS', marginX + 4, currentY + 16);

  // Document Title & Project Info (Right side of banner)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text(pdfTitle, pageWidth - marginX - 4, currentY + 10, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(226, 232, 240); // Slate-200
  doc.text(
    `${payload.project.name} (${payload.project.code})   •   ${payload.formattedDate}   •   ${payload.shift}   •   ${payload.status.toUpperCase()}`,
    pageWidth - marginX - 4,
    currentY + 16,
    { align: 'right' }
  );

  currentY += 26;

  // Compact Summary KPI Boxes
  const s = payload.summary;
  const kpis = [
    { label: 'WORKFORCE', val: s.totalWorkforce, bg: [241, 245, 249], text: [15, 23, 42] },
    { label: 'ALLOCATED', val: s.allocated, bg: [254, 243, 199], text: [146, 64, 14] },
    { label: payload.dataMode === 'ACTUAL' ? 'PRESENT' : 'SCHEDULED', val: payload.dataMode === 'ACTUAL' ? s.present : s.allocated, bg: [209, 250, 229], text: [6, 95, 70] },
    { label: payload.dataMode === 'ACTUAL' ? 'ABSENT' : 'UNALLOCATED', val: payload.dataMode === 'ACTUAL' ? s.absent : s.unallocated, bg: [255, 228, 230], text: [159, 18, 57] },
    { label: 'UNAVAILABLE', val: s.unavailable, bg: [248, 250, 252], text: [71, 85, 105] },
    { label: 'ON LEAVE', val: payload.specialSections.onLeave.length, bg: [239, 246, 255], text: [30, 64, 175] },
    { label: 'TRAINING', val: s.training, bg: [237, 233, 254], text: [91, 33, 182] },
    { label: 'WARNINGS', val: s.warnings, bg: [254, 226, 226], text: [185, 28, 28] },
  ];

  const totalKpiWidth = pageWidth - marginX * 2;
  const kpiBoxWidth = (totalKpiWidth - (kpis.length - 1) * 2) / kpis.length;

  kpis.forEach((kpi, idx) => {
    const boxX = marginX + idx * (kpiBoxWidth + 2);
    doc.setFillColor(kpi.bg[0], kpi.bg[1], kpi.bg[2]);
    doc.roundedRect(boxX, currentY, kpiBoxWidth, 12, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(boxX, currentY, kpiBoxWidth, 12, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, boxX + kpiBoxWidth / 2, currentY + 4, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(kpi.text[0], kpi.text[1], kpi.text[2]);
    doc.text(String(kpi.val), boxX + kpiBoxWidth / 2, currentY + 9.5, { align: 'center' });
  });

  currentY += 16;

  // Render Area / Workstream Tables
  for (const area of payload.areas) {
    // Check if new page needed for area banner
    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 14;
    }

    // Area Banner
    doc.setFillColor(30, 41, 59); // Slate-800 (#1E293B)
    doc.rect(marginX, currentY, pageWidth - marginX * 2, 7, 'F');
    doc.setFillColor(245, 158, 11); // Amber accent
    doc.rect(marginX, currentY, 2.5, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(255, 255, 255);
    doc.text(
      `AREA: ${area.code} — ${area.name.toUpperCase()}   (Headcount: ${area.headcount})`,
      marginX + 5,
      currentY + 5
    );

    currentY += 9;

    for (const ws of area.workstreams) {
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 14;
      }

      // Workstream Subtitle
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(marginX, currentY, pageWidth - marginX * 2, 5.5, 'F');
      doc.setFillColor(245, 158, 11); // Amber accent box
      doc.rect(marginX + 2, currentY + 1.8, 1.8, 1.8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(
        `WORKSTREAM: ${ws.name.toUpperCase()}   •   ${ws.workerCount} workers`,
        marginX + 6,
        currentY + 4
      );

      currentY += 6.5;

      const bodyData = ws.workers.map((w) => [
        `${w.workerName}\n${w.employeeId}`,
        w.tradeRole,
        w.companyName,
        w.crewName,
        w.hours,
        w.attendance,
        w.supervisor,
        w.notes,
      ]);

      if (bodyData.length === 0) {
        bodyData.push(['— No workers allocated —', '—', '—', '—', '—', '—', '—', '—']);
      }

      autoTable(doc, {
        startY: currentY,
        margin: { left: marginX, right: marginX },
        head: [[
          'Worker Name & ID',
          'Trade / Role',
          'Company',
          'Crew',
          payload.dataMode === 'ACTUAL' ? 'Actual Hours' : 'Planned Hours',
          payload.dataMode === 'ACTUAL' ? 'Attendance' : 'Status',
          'Supervisor',
          'Notes / Mid-Shift Transfer',
        ]],
        body: bodyData,
        theme: 'grid',
        styles: {
          fontSize: 7.5,
          cellPadding: 1.5,
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [71, 85, 105], // Slate-600
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'left',
        },
        columnStyles: {
          0: { cellWidth: 42, fontStyle: 'bold' }, // Name & ID
          1: { cellWidth: 32 }, // Trade
          2: { cellWidth: 42 }, // Company
          3: { cellWidth: 22 }, // Crew
          4: { cellWidth: 22, halign: 'center' }, // Hours
          5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' }, // Attendance
          6: { cellWidth: 30 }, // Supervisor
          7: { cellWidth: 59 }, // Notes
        },
        didDrawPage: () => {
          // Keep track of page bounds
        },
      });

      // @ts-ignore - jspdf-autotable attaches lastAutoTable
      currentY = (doc as any).lastAutoTable.finalY + 4;
    }

    currentY += 3;
  }

  // --- SPECIAL SECTIONS ---
  const { unallocated, unavailable, onLeave, training, warningsAndConflicts } = payload.specialSections;

  const renderPdfSpecialSection = (title: string, items: ExportSpecialWorker[], headerColor: [number, number, number]) => {
    if (items.length === 0) return;

    if (currentY > pageHeight - 35) {
      doc.addPage();
      currentY = 14;
    }

    doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.rect(marginX, currentY, pageWidth - marginX * 2, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(`${title} (${items.length} records)`, marginX + 3, currentY + 4.2);

    currentY += 7;

    const sBody = items.map((item) => [
      `${item.workerName}\n${item.employeeId}`,
      item.tradeRole,
      item.companyName,
      item.statusOrReason,
      item.details || '—',
      item.notes || '—',
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: marginX, right: marginX },
      head: [['Worker Name & ID', 'Trade / Role', 'Company', 'Status / Reason', 'Details', 'Notes']],
      body: sBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1.5, valign: 'middle' },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 36 },
        2: { cellWidth: 48 },
        3: { cellWidth: 40 },
        4: { cellWidth: 50 },
        5: { cellWidth: 55 },
      },
    });

    // @ts-ignore
    currentY = (doc as any).lastAutoTable.finalY + 4;
  };

  renderPdfSpecialSection('SPECIAL SECTION: UNALLOCATED WORKERS', unallocated, [71, 85, 105]);
  renderPdfSpecialSection('SPECIAL SECTION: UNAVAILABLE LABOUR', unavailable, [153, 27, 27]);
  renderPdfSpecialSection('SPECIAL SECTION: ON APPROVED LEAVE', onLeave, [30, 64, 175]);
  renderPdfSpecialSection('SPECIAL SECTION: SCHEDULED TRAINING', training, [107, 33, 168]);
  renderPdfSpecialSection('SPECIAL SECTION: COMPLIANCE WARNINGS & CONFLICTS', warningsAndConflicts, [146, 64, 14]);

  // Running Footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.line(marginX, pageHeight - 8, pageWidth - marginX, pageHeight - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(
      `MAXIM FORGE Enterprise Daily Labour Report   •   ${payload.project.code}   •   ${payload.formattedDate}   •   ${payload.shift}`,
      marginX,
      pageHeight - 4.5
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - marginX, pageHeight - 4.5, { align: 'right' });
  }

  return doc;
}

// ==========================================
// 3. PRINT HTML TEMPLATE
// ==========================================

export function generateDailyLabourPrintHtml(payload: DailyLabourExportPayload): string {
  const p = payload;
  const s = p.summary;

  const areaSectionsHtml = p.areas
    .map((area) => {
      const workstreamsHtml = area.workstreams
        .map((ws) => {
          const rowsHtml =
            ws.workers.length > 0
              ? ws.workers
                  .map(
                    (w) => `
                <tr class="${w.isTransferred ? 'bg-blue-50/50' : ''}">
                  <td class="font-bold text-slate-900">${w.workerName} <span class="font-mono text-xs text-slate-500">${w.employeeId}</span></td>
                  <td>${w.tradeRole}</td>
                  <td class="text-slate-600">${w.companyName}</td>
                  <td class="text-slate-600">${w.crewName}</td>
                  <td class="text-center font-mono">${w.hours}</td>
                  <td class="text-center font-bold ${
                    w.attendance === 'Present' || w.attendance === 'Allocated'
                      ? 'text-emerald-700'
                      : w.attendance === 'Absent'
                      ? 'text-rose-700'
                      : 'text-blue-700'
                  }">${w.attendance}</td>
                  <td class="text-slate-700">${w.supervisor}</td>
                  <td class="${w.isTransferred ? 'font-semibold text-blue-800' : 'text-slate-500'}">${w.notes}</td>
                </tr>
              `
                  )
                  .join('')
              : `
                <tr>
                  <td colspan="8" class="text-center italic text-slate-400 py-2">
                    — No workers allocated to this workstream —
                  </td>
                </tr>
              `;

          return `
            <div class="mt-2.5 mb-3 page-break-avoid">
              <div class="bg-slate-100 border border-slate-200 px-3 py-1 font-bold text-xs text-slate-800 flex justify-between">
                <span>WORKSTREAM: ${ws.name.toUpperCase()}</span>
                <span class="text-slate-500 font-mono">${ws.workerCount} workers</span>
              </div>
              <table class="w-full text-xs border border-slate-200 border-collapse mt-0.5">
                <thead>
                  <tr class="bg-slate-600 text-white font-bold">
                    <th class="p-1.5 text-left w-[22%]">Worker Name</th>
                    <th class="p-1.5 text-left w-[14%]">Trade / Role</th>
                    <th class="p-1.5 text-left w-[18%]">Company</th>
                    <th class="p-1.5 text-left w-[10%]">Crew</th>
                    <th class="p-1.5 text-center w-[9%]">Hours</th>
                    <th class="p-1.5 text-center w-[9%]">Attendance</th>
                    <th class="p-1.5 text-left w-[10%]">Supervisor</th>
                    <th class="p-1.5 text-left w-[18%]">Notes / Transfer</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
          `;
        })
        .join('');

      return `
        <div class="mt-4 mb-4 page-break-avoid">
          <div class="bg-slate-900 text-white px-3 py-1.5 rounded-t font-black text-xs uppercase tracking-wider flex justify-between items-center border-l-4 border-amber-500">
            <span>AREA: ${area.code} — ${area.name}</span>
            <span class="bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold">Headcount: ${area.headcount}</span>
          </div>
          ${workstreamsHtml}
        </div>
      `;
    })
    .join('');

  // Special sections HTML
  const specialSectionHtml = (title: string, color: string, items: ExportSpecialWorker[]) => {
    if (!items || items.length === 0) return '';
    const rows = items
      .map(
        (i) => `
      <tr>
        <td class="font-bold text-slate-900">${i.workerName} <span class="font-mono text-xs text-slate-500">${i.employeeId}</span></td>
        <td>${i.tradeRole}</td>
        <td>${i.companyName}</td>
        <td class="font-semibold">${i.statusOrReason}</td>
        <td class="text-slate-500">${i.details || '—'}</td>
        <td class="text-slate-500">${i.notes || '—'}</td>
      </tr>
    `
      )
      .join('');

    return `
      <div class="mt-4 mb-3 page-break-avoid">
        <div class="${color} text-white px-3 py-1 text-xs font-bold uppercase rounded-t">
          ${title} (${items.length} records)
        </div>
        <table class="w-full text-xs border border-slate-200 border-collapse">
          <thead>
            <tr class="bg-slate-100 text-slate-700 font-bold">
              <th class="p-1 text-left w-[24%]">Worker Name</th>
              <th class="p-1 text-left w-[16%]">Trade</th>
              <th class="p-1 text-left w-[20%]">Company</th>
              <th class="p-1 text-left w-[16%]">Status / Reason</th>
              <th class="p-1 text-left w-[14%]">Details</th>
              <th class="p-1 text-left w-[10%]">Notes</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  };

  const specialsHtml = `
    ${specialSectionHtml('Special Section: Unallocated Workers', 'bg-slate-700', p.specialSections.unallocated)}
    ${specialSectionHtml('Special Section: Unavailable Labour', 'bg-rose-800', p.specialSections.unavailable)}
    ${specialSectionHtml('Special Section: On Approved Leave', 'bg-blue-800', p.specialSections.onLeave)}
    ${specialSectionHtml('Special Section: Scheduled Training Attendees', 'bg-purple-800', p.specialSections.training)}
    ${specialSectionHtml('Special Section: Compliance Warnings & Conflicts', 'bg-amber-800', p.specialSections.warningsAndConflicts)}
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${p.project.code} Daily Labour - ${p.formattedDate}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm 8mm 10mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 10px;
      font-size: 11px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .page-break-avoid {
      break-inside: avoid;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .kpi-box {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 8px;
      text-align: center;
      flex: 1;
      margin: 0 2px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div style="background: #0f172a; color: #ffffff; padding: 10px 14px; border-radius: 6px; margin-bottom: 8px; border-top: 3px solid #f59e0b; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <div style="font-size: 16px; font-weight: 900; letter-spacing: 0.5px;">MAXIM FORGE</div>
      <div style="font-size: 9px; color: #fbbf24; font-weight: bold;">ENTERPRISE SITE LABOUR SHEET</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 14px; font-weight: 800;">${p.dataMode === 'ACTUAL' ? 'ACTUAL DAILY LABOUR' : 'DAILY LABOUR SHEET'}</div>
      <div style="font-size: 9px; color: #cbd5e1;">
        ${p.project.name} (${p.project.code}) &bull; Date: ${p.formattedDate} &bull; ${p.shift} &bull; Status: ${p.status.toUpperCase()}
      </div>
    </div>
  </div>

  <!-- Summary KPI Bar -->
  <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
    <div class="kpi-box" style="background: #f8fafc;">
      <div style="font-size: 8px; color: #64748b; font-weight: bold;">TOTAL WORKFORCE</div>
      <div style="font-size: 14px; font-weight: 900;">${s.totalWorkforce}</div>
    </div>
    <div class="kpi-box" style="background: #fef3c7;">
      <div style="font-size: 8px; color: #92400e; font-weight: bold;">ALLOCATED</div>
      <div style="font-size: 14px; font-weight: 900; color: #92400e;">${s.allocated}</div>
    </div>
    <div class="kpi-box" style="background: #d1fae5;">
      <div style="font-size: 8px; color: #065f46; font-weight: bold;">${p.dataMode === 'ACTUAL' ? 'PRESENT' : 'SCHEDULED'}</div>
      <div style="font-size: 14px; font-weight: 900; color: #065f46;">${p.dataMode === 'ACTUAL' ? s.present : s.allocated}</div>
    </div>
    <div class="kpi-box" style="background: #ffe4e6;">
      <div style="font-size: 8px; color: #9f1239; font-weight: bold;">${p.dataMode === 'ACTUAL' ? 'ABSENT' : 'UNALLOCATED'}</div>
      <div style="font-size: 14px; font-weight: 900; color: #9f1239;">${p.dataMode === 'ACTUAL' ? s.absent : s.unallocated}</div>
    </div>
    <div class="kpi-box" style="background: #f1f5f9;">
      <div style="font-size: 8px; color: #475569; font-weight: bold;">UNAVAILABLE</div>
      <div style="font-size: 14px; font-weight: 900;">${s.unavailable}</div>
    </div>
    <div class="kpi-box" style="background: #eff6ff;">
      <div style="font-size: 8px; color: #1e40af; font-weight: bold;">ON LEAVE</div>
      <div style="font-size: 14px; font-weight: 900; color: #1e40af;">${p.specialSections.onLeave.length}</div>
    </div>
    <div class="kpi-box" style="background: #ede9fe;">
      <div style="font-size: 8px; color: #5b21b6; font-weight: bold;">TRAINING</div>
      <div style="font-size: 14px; font-weight: 900; color: #5b21b6;">${s.training}</div>
    </div>
    <div class="kpi-box" style="background: #fee2e2;">
      <div style="font-size: 8px; color: #b91c1c; font-weight: bold;">WARNINGS</div>
      <div style="font-size: 14px; font-weight: 900; color: #b91c1c;">${s.warnings}</div>
    </div>
  </div>

  <!-- Area & Workstream Hierarchy -->
  ${areaSectionsHtml}

  <!-- Special Sections -->
  ${specialsHtml}

  <!-- Footer -->
  <div style="margin-top: 15px; pt-2; border-top: 1px solid #cbd5e1; font-size: 8px; color: #94a3b8; display: flex; justify-content: space-between;">
    <span>MAXIM FORGE &bull; Generated: ${p.generatedAt} &bull; Scope: ${p.scope === 'FILTERED' ? 'Filtered View' : 'Full Daily Labour'}</span>
    <span>Operational Site Record &bull; Confidential</span>
  </div>

  <script>
    window.onload = function() {
      // Auto print if requested via query or iframe
      if (window.location.search.includes('autoprint=true')) {
        window.print();
      }
    };
  </script>
</body>
</html>`;
}
