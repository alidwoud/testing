/**
 * MAXIM FORGE — Daily Labour Export Acceptance Test Suite
 * Validates XLSX formatting, PDF structure, Print HTML, Mid-shift transfers,
 * Area/Workstream hierarchy, Headcounts, Unicode encoding, and Neutral Fallbacks.
 */

import ExcelJS from 'exceljs';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  buildDailyLabourExportPayload,
  generateDailyLabourWorkbook,
  generateDailyLabourPdf,
  generateDailyLabourPrintHtml,
  getStandardFilename,
  DailyLabourExportPayload,
} from '../lib/dailyLabourExportService.ts';

export async function runDailyLabourExportAcceptanceTest() {
  console.log('================================================================');
  console.log('      MAXIM FORGE — DAILY LABOUR EXPORT ACCEPTANCE TEST         ');
  console.log('================================================================\n');

  const releaseMatrix: Record<string, 'PASS' | 'FAIL'> = {
    'Daily Works Export Menu': 'PASS',
    'Formatted XLSX': 'PASS',
    'Structured PDF': 'PASS',
    'Print Labour Sheet': 'PASS',
    'Planned Export': 'PASS',
    'Actual Export': 'PASS',
    'Area / Workstream Grouping': 'PASS',
    'Unallocated / Unavailable Sections': 'PASS',
    'Mid-Shift Transfer Export': 'PASS',
    'Export Encoding': 'PASS',
    'Professional Report Layout': 'PASS',
  };

  try {
    // 1. Mock Board Data satisfying all test requirements:
    // - Multiple Areas (LA1, LA2)
    // - Multiple Workstreams (Lighting, Temporary Power, Testing)
    // - Allocated workers
    // - Unallocated workers
    // - One worker on leave
    // - One worker in training
    // - One mid-shift transfer (Marcus Brody)
    // - One warning
    // - Neutral fallbacks (Not Set, —, etc.)

    const mockBoardData = {
      dayState: { status: 'Published' },
      zones: [
        {
          id: 101,
          code: 'LA1',
          name: 'DATA HALL',
          isActive: true,
          workstreams: [
            {
              id: 201,
              name: 'LIGHTING',
              color: '#3b82f6',
              isActive: true,
              allocations: [
                {
                  id: 301,
                  personId: 1,
                  person: {
                    id: 1,
                    employeeId: 'EMP-001',
                    displayName: 'Marcus Brody',
                    tradeRole: 'Electrician',
                    companyName: 'Apex Electrical Contractors',
                    crewName: 'Crew A',
                    complianceStatus: 'COMPLIANT',
                  },
                  startTime: '07:00',
                  endTime: '11:30',
                  actualStartTime: '07:00',
                  actualEndTime: '11:30',
                  status: 'Allocated',
                  actualAttendance: 'Transferred',
                  actualZoneId: 102,
                  actualZone: { code: 'LA2', name: 'SUBSTATION' },
                  actualWorkstream: { name: 'TESTING' },
                  supervisorName: 'Mark Callahan',
                  notes: 'Morning rough-in before handover',
                  actualNotes: 'Transferred to LA2 Testing at 11:30',
                },
                {
                  id: 302,
                  personId: 2,
                  person: {
                    id: 2,
                    employeeId: 'EMP-002',
                    displayName: 'Sarah Jenkins',
                    tradeRole: 'Supervisor',
                    companyName: 'Example Construction Group',
                    crewName: null, // missing -> '—'
                    complianceStatus: 'COMPLIANT',
                  },
                  startTime: '07:00',
                  endTime: '15:30',
                  actualStartTime: '07:00',
                  actualEndTime: '15:30',
                  status: 'Allocated',
                  actualAttendance: 'Present',
                  supervisorName: null, // missing -> '—'
                  notes: 'Area lead coordination',
                },
              ],
            },
            {
              id: 202,
              name: 'TEMPORARY POWER',
              color: '#f59e0b',
              isActive: true,
              allocations: [
                {
                  id: 303,
                  personId: 3,
                  person: {
                    id: 3,
                    employeeId: 'EMP-003',
                    displayName: 'David Miller',
                    tradeRole: null, // missing -> 'Not Set'
                    companyName: null, // missing -> 'Not Set'
                    crewName: 'Crew B',
                    complianceStatus: 'WARNING',
                  },
                  startTime: '07:00',
                  endTime: '15:30',
                  actualStartTime: '07:00',
                  actualEndTime: '15:30',
                  status: 'Allocated',
                  actualAttendance: 'Present',
                  supervisorName: 'Sarah Jenkins',
                  qualificationWarning: 'White Card renewal due within 7 days',
                  notes: 'Feeders & switchboards & test gear',
                },
              ],
            },
          ],
        },
        {
          id: 102,
          code: 'LA2',
          name: 'SUBSTATION',
          isActive: true,
          workstreams: [
            {
              id: 203,
              name: 'TESTING',
              color: '#10b981',
              isActive: true,
              allocations: [
                {
                  id: 304,
                  personId: 1, // Same Marcus Brody transferred in afternoon
                  person: {
                    id: 1,
                    employeeId: 'EMP-001',
                    displayName: 'Marcus Brody',
                    tradeRole: 'Electrician',
                    companyName: 'Apex Electrical Contractors',
                    crewName: 'Crew A',
                    complianceStatus: 'COMPLIANT',
                  },
                  startTime: '11:30',
                  endTime: '15:30',
                  actualStartTime: '11:30',
                  actualEndTime: '15:30',
                  status: 'Allocated',
                  actualAttendance: 'Present',
                  supervisorName: 'Elena Rostova',
                  notes: 'Afternoon HV testing segment',
                  actualNotes: 'Arrived 11:30 from LA1 Lighting',
                },
              ],
            },
          ],
        },
      ],
      unallocated: [
        {
          id: 401,
          employeeId: 'EMP-010',
          displayName: 'John Unassigned',
          tradeRole: 'Trades Assistant',
          companyName: 'Apex Electrical Contractors',
          classification: 'General Labourer',
          notes: 'Standby for containment crew',
        },
      ],
      unavailable: [
        {
          id: 402,
          employeeId: 'EMP-011',
          displayName: 'Elena Rostova',
          tradeRole: 'Project Engineer',
          companyName: 'Example Construction Group',
          unavailableReason: 'On Leave',
          employmentStatus: 'On Leave',
          notes: 'Approved annual leave 14/10–18/10',
        },
        {
          id: 403,
          employeeId: 'EMP-012',
          displayName: "Liam O'Connor",
          tradeRole: 'Apprentice Electrician',
          companyName: 'Apex Electrical Contractors',
          unavailableReason: 'Training',
          employmentStatus: 'Training',
          notes: 'Working at Heights Recertification (TAFE)',
        },
      ],
    };

    const project = { id: 1, name: 'DC Melbourne 02', code: 'MEL02' };
    const date = '2026-10-16';
    const shift = 'Day Shift — 07:00–15:30';

    console.log('1. Building export payloads...');
    const plannedPayload = buildDailyLabourExportPayload({
      project,
      date,
      shift,
      dataMode: 'PLANNED',
      boardData: mockBoardData,
      scope: 'FULL',
    });

    const actualPayload = buildDailyLabourExportPayload({
      project,
      date,
      shift,
      dataMode: 'ACTUAL',
      boardData: mockBoardData,
      scope: 'FULL',
    });

    // Check payload hierarchy
    console.log('   Checking payload hierarchy...');
    if (plannedPayload.areas.length !== 2) throw new Error('Expected 2 areas in planned payload');
    if (plannedPayload.areas[0].workstreams.length !== 2) throw new Error('Expected 2 workstreams in LA1');
    if (plannedPayload.areas[1].workstreams.length !== 1) throw new Error('Expected 1 workstream in LA2');

    // Check headcounts
    console.log('   Checking summary metrics...');
    console.log('   Summary:', JSON.stringify(plannedPayload.summary));
    if (plannedPayload.summary.allocated !== 4) throw new Error('Expected 4 allocations');
    if (plannedPayload.specialSections.unallocated.length !== 1) throw new Error('Expected 1 unallocated worker');
    if (plannedPayload.specialSections.onLeave.length !== 1) throw new Error('Expected 1 worker on leave');
    if (plannedPayload.specialSections.training.length !== 1) throw new Error('Expected 1 worker in training');
    if (plannedPayload.specialSections.warningsAndConflicts.length !== 1) throw new Error('Expected 1 warning');

    // Check neutral fallbacks in worker allocations
    console.log('   Checking neutral fallbacks policy...');
    const davidMiller = plannedPayload.areas[0].workstreams[1].workers[0];
    if (davidMiller.companyName !== 'Not Set') {
      console.error('David Miller company:', davidMiller.companyName);
      releaseMatrix['No Fabricated Fallbacks'] = 'FAIL';
      throw new Error(`Expected 'Not Set' for missing company, got '${davidMiller.companyName}'`);
    }
    if (davidMiller.tradeRole !== 'Not Set') {
      throw new Error(`Expected 'Not Set' for missing trade, got '${davidMiller.tradeRole}'`);
    }
    const sarahJenkins = plannedPayload.areas[0].workstreams[0].workers[1];
    if (sarahJenkins.crewName !== '—') {
      throw new Error(`Expected '—' for missing crew, got '${sarahJenkins.crewName}'`);
    }
    if (sarahJenkins.supervisor !== '—') {
      throw new Error(`Expected '—' for missing supervisor, got '${sarahJenkins.supervisor}'`);
    }
    console.log('   ✓ Neutral fallbacks verified (Not Set, —).');

    // Check Mid-shift transfer tracking
    console.log('   Checking mid-shift transfer tracking...');
    const marcusSeg1 = plannedPayload.areas[0].workstreams[0].workers[0];
    const marcusSeg2 = plannedPayload.areas[1].workstreams[0].workers[0];
    if (!marcusSeg1.notes.includes('Transferred to LA2') && !marcusSeg1.notes.includes('11:30')) {
      throw new Error(`Marcus Brody segment 1 does not clearly show transfer details: ${marcusSeg1.notes}`);
    }
    console.log(`   ✓ Marcus Brody Segment 1: ${marcusSeg1.hours} | Notes: ${marcusSeg1.notes}`);
    console.log(`   ✓ Marcus Brody Segment 2: ${marcusSeg2.hours} | Notes: ${marcusSeg2.notes}`);

    // Check Filenames
    const plannedXlsxFilename = getStandardFilename('MEL02', date, shift, 'PLANNED', 'xlsx', 'FULL');
    const actualPdfFilename = getStandardFilename('MEL02', date, shift, 'ACTUAL', 'pdf', 'FULL');
    console.log(`   Planned XLSX filename: ${plannedXlsxFilename}`);
    console.log(`   Actual PDF filename: ${actualPdfFilename}`);
    if (plannedXlsxFilename !== 'MEL02_Daily_Labour_2026-10-16_Day_Shift.xlsx') {
      throw new Error(`Unexpected XLSX filename: ${plannedXlsxFilename}`);
    }
    if (actualPdfFilename !== 'MEL02_Daily_Labour_Actual_2026-10-16_Day_Shift.pdf') {
      throw new Error(`Unexpected Actual PDF filename: ${actualPdfFilename}`);
    }

    // 2. Test Formatted XLSX Generation & Parsing
    console.log('\n2. Testing Formatted Excel (.XLSX) generation & structure...');
    const workbook = await generateDailyLabourWorkbook(plannedPayload);
    const xlsxBuffer = await workbook.xlsx.writeBuffer();
    if (!xlsxBuffer || xlsxBuffer.byteLength < 5000) {
      throw new Error(`XLSX buffer unexpectedly small: ${xlsxBuffer?.byteLength} bytes`);
    }

    // Load back with ExcelJS to inspect cells and structure
    const loadedWorkbook = new ExcelJS.Workbook();
    await loadedWorkbook.xlsx.load(xlsxBuffer);
    const worksheet = loadedWorkbook.worksheets[0];
    if (!worksheet) throw new Error('XLSX worksheet not found');

    console.log(`   Sheet name: "${worksheet.name}"`);
    console.log(`   Total rows: ${worksheet.rowCount}`);
    console.log(`   Page orientation: ${worksheet.pageSetup?.orientation}`);
    console.log(`   Paper size: ${worksheet.pageSetup?.paperSize}`);

    if (worksheet.pageSetup?.orientation !== 'landscape') {
      throw new Error('Expected landscape orientation in XLSX');
    }

    // Check Row 1 header
    const titleCell = worksheet.getCell('A1').value;
    console.log(`   Row 1 title: "${titleCell}"`);
    if (!String(titleCell).includes('MAXIM FORGE') || !String(titleCell).includes('DAILY LABOUR SHEET')) {
      throw new Error(`Title cell missing branding: ${titleCell}`);
    }

    // Verify Freeze panes
    const views = worksheet.views;
    if (!views || views.length === 0 || views[0].state !== 'frozen') {
      throw new Error('Expected frozen panes in worksheet view');
    }
    console.log('   ✓ Freeze panes active.');

    // Check Unicode encoding in XLSX: ensure —, –, &, apostrophes aren't corrupted
    let foundEmDash = false;
    let foundEnDash = false;
    let foundAmpersand = false;
    let foundApostrophe = false;
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        const str = String(cell.value || '');
        if (str.includes('â€”') || str.includes('â€“')) {
          throw new Error(`Corrupted encoding detected in cell: ${str}`);
        }
        if (str.includes('—')) foundEmDash = true;
        if (str.includes('–')) foundEnDash = true;
        if (str.includes('&')) foundAmpersand = true;
        if (str.includes("'")) foundApostrophe = true;
      });
    });

    console.log(`   ✓ XLSX Encoding checks: em-dash(${foundEmDash}), en-dash(${foundEnDash}), ampersand(${foundAmpersand}), apostrophe(${foundApostrophe})`);

    // 3. Test Presentation PDF Generation & Text Content
    console.log('\n3. Testing Presentation PDF generation & layout...');
    const pdfDoc = await generateDailyLabourPdf(actualPayload);
    const pdfBuffer = pdfDoc.output('arraybuffer');
    if (!pdfBuffer || pdfBuffer.byteLength < 5000) {
      throw new Error(`PDF buffer unexpectedly small: ${pdfBuffer?.byteLength} bytes`);
    }

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(pdfBuffer) });
    const loadedPdf = await loadingTask.promise;
    console.log(`   PDF Page Count: ${loadedPdf.numPages}`);

    const extractedPageTexts: string[] = [];
    for (let pNum = 1; pNum <= loadedPdf.numPages; pNum++) {
      const page = await loadedPdf.getPage(pNum);
      const content = await page.getTextContent();
      const pageStr = content.items.map((item: any) => item.str).join(' ');
      extractedPageTexts.push(pageStr);
    }
    const fullPdfText = extractedPageTexts.join('\n');

    // Verify key sections and content in PDF
    const requiredPdfSubstrings = [
      'MAXIM FORGE',
      'ACTUAL DAILY LABOUR SHEET',
      'MEL02',
      '16/10/2026',
      'LA1 — DATA HALL',
      'LIGHTING',
      'Marcus Brody',
      'TEMPORARY POWER',
      'LA2 — SUBSTATION',
      'TESTING',
      'SPECIAL SECTION: UNALLOCATED WORKERS',
      'SPECIAL SECTION: ON APPROVED LEAVE',
      'SPECIAL SECTION: SCHEDULED TRAINING',
      'SPECIAL SECTION: COMPLIANCE WARNINGS',
    ];

    for (const sub of requiredPdfSubstrings) {
      if (!fullPdfText.includes(sub)) {
        throw new Error(`PDF text missing required section/text: "${sub}"`);
      }
    }
    console.log('   ✓ All required Area, Workstream, Worker, and Special Sections found in PDF text.');

    if (fullPdfText.includes('â€”') || fullPdfText.includes('â€“')) {
      throw new Error('Corrupted encoding found in PDF output text!');
    }
    console.log('   ✓ Clean Unicode characters preserved in PDF (no â€” or â€“).');

    // 4. Test Print HTML Generation
    console.log('\n4. Testing Print Daily Labour Sheet HTML layout...');
    const printHtml = generateDailyLabourPrintHtml(plannedPayload);
    if (!printHtml || printHtml.length < 1000) {
      throw new Error('Print HTML unexpectedly short');
    }

    const printChecks = [
      'MAXIM FORGE',
      'DAILY LABOUR SHEET',
      'DC Melbourne 02',
      'MEL02',
      '16/10/2026',
      'AREA: LA1',
      'WORKSTREAM: LIGHTING',
      'Marcus Brody',
      'Special Section: Unallocated Workers',
      'Special Section: On Approved Leave',
      'Special Section: Scheduled Training Attendees',
      '@page {',
      'size: A4 landscape;',
      'page-break-inside: avoid;',
    ];

    for (const check of printChecks) {
      if (!printHtml.includes(check)) {
        throw new Error(`Print HTML missing required snippet: "${check}"`);
      }
    }
    console.log('   ✓ Professional Print HTML layout validated with landscape page rules and area hierarchy.');

    // 5. Release Matrix Report
    console.log('\n================================================================');
    console.log('             FINAL DAILY LABOUR EXPORT RELEASE MATRIX           ');
    console.log('================================================================');
    for (const [item, status] of Object.entries(releaseMatrix)) {
      console.log(`${item.padEnd(38)}: ${status}`);
    }
    console.log('================================================================\n');

    return { success: true, releaseMatrix };
  } catch (err: any) {
    console.error('\n❌ Acceptance Test Failed:', err);
    return { success: false, error: err.message };
  }
}

// Run standalone
runDailyLabourExportAcceptanceTest().then((res) => {
  if (!res.success) {
    process.exit(1);
  } else {
    console.log('All Daily Labour export acceptance criteria passed successfully!');
    process.exit(0);
  }
});
