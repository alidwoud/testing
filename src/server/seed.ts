import { db } from '../db/index.ts';
import {
  projects,
  locations,
  equipment,
  cables,
  itrTemplates,
  itrInstances,
  testReadings,
  issues,
  companies,
  users,
  auditLogs,
} from '../db/schema.ts';
import { eq } from 'drizzle-orm';

export async function seedDatabase() {
  try {
    const existingProjects = await db.select().from(projects).limit(1);
    if (existingProjects.length > 0) {
      return { message: 'Database already seeded', projectId: existingProjects[0].id };
    }

    console.log('Seeding initial MAXIM FORGE project data...');

    // 1. Project
    const [project] = await db
      .insert(projects)
      .values({
        code: 'MEL02',
        name: 'DC Melbourne 02',
        description: 'Hyperscale Data Centre Build - Stage 2 Electrical & Fitout',
        status: 'Active',
        clientName: 'Equinix / Australis DC JV',
        location: 'Melbourne, Victoria',
      })
      .returning();

    // 2. Companies
    const [apexCompany] = await db
      .insert(companies)
      .values({
        projectId: project.id,
        name: 'Apex Electrical Contractors',
        code: 'APEX',
        role: 'Electrical Contractor',
        contactEmail: 'qa@apexelectrical.com.au',
      })
      .returning();

    const [starkCompany] = await db
      .insert(companies)
      .values({
        projectId: project.id,
        name: 'Stark Power Systems',
        code: 'STARK',
        role: 'Switchgear & Substation Vendor',
        contactEmail: 'service@starkpower.com',
      })
      .returning();

    await db.insert(companies).values([
      {
        projectId: project.id,
        name: 'Melbourne Data Centre JV',
        code: 'MDC-JV',
        role: 'Principal Contractor',
        contactEmail: 'admin@mdcjv.com',
      },
      {
        projectId: project.id,
        name: 'Aegis QA Engineering',
        code: 'AEGIS',
        role: 'Independent QA Consultant',
        contactEmail: 'lead@aegisqa.com',
      },
    ]);

    // 3. Users
    await db.insert(users).values([
      {
        uid: 'user-supervisor-01',
        email: 'mark.callahan@apexelectrical.com.au',
        name: 'Mark Callahan',
        role: 'Supervisor',
        companyId: apexCompany.id,
        companyName: apexCompany.name,
      },
      {
        uid: 'user-tradesperson-01',
        email: 'dave.miller@apexelectrical.com.au',
        name: 'Dave Miller',
        role: 'Tradesperson',
        companyId: apexCompany.id,
        companyName: apexCompany.name,
      },
      {
        uid: 'user-qa-01',
        email: 'sarah.jenkins@aegisqa.com',
        name: 'Sarah Jenkins',
        role: 'QA Manager',
        companyName: 'Aegis QA Engineering',
      },
      {
        uid: 'user-admin-01',
        email: 'alex.vance@maximforge.com',
        name: 'Alex Vance',
        role: 'Administrator',
        companyName: 'Melbourne Data Centre JV',
      },
    ]);

    // 4. Locations (Flexible Hierarchy)
    // Project root -> Level 01, Level 02, Level 03
    const [level01] = await db
      .insert(locations)
      .values({
        projectId: project.id,
        parentId: null,
        name: 'Level 01',
        code: 'L01',
        type: 'Level',
        path: 'DC Melbourne 02 / Level 01',
        sequence: 1,
      })
      .returning();

    const [level02] = await db
      .insert(locations)
      .values({
        projectId: project.id,
        parentId: null,
        name: 'Level 02',
        code: 'L02',
        type: 'Level',
        path: 'DC Melbourne 02 / Level 02',
        sequence: 2,
      })
      .returning();

    const [level03] = await db
      .insert(locations)
      .values({
        projectId: project.id,
        parentId: null,
        name: 'Level 03',
        code: 'L03',
        type: 'Level',
        path: 'DC Melbourne 02 / Level 03',
        sequence: 3,
      })
      .returning();

    // Under Level 02: Switch Room 01, Switch Room 02, Data Hall 01
    const [switchRoom01] = await db
      .insert(locations)
      .values({
        projectId: project.id,
        parentId: level02.id,
        name: 'Switch Room 01',
        code: 'L02-SR01',
        type: 'Room',
        path: 'DC Melbourne 02 / Level 02 / Switch Room 01',
        sequence: 1,
      })
      .returning();

    const [switchRoom02] = await db
      .insert(locations)
      .values({
        projectId: project.id,
        parentId: level02.id,
        name: 'Switch Room 02',
        code: 'L02-SR02',
        type: 'Room',
        path: 'DC Melbourne 02 / Level 02 / Switch Room 02',
        sequence: 2,
      })
      .returning();

    const [dataHall01] = await db
      .insert(locations)
      .values({
        projectId: project.id,
        parentId: level02.id,
        name: 'Data Hall 01',
        code: 'L02-DH01',
        type: 'Zone',
        path: 'DC Melbourne 02 / Level 02 / Data Hall 01',
        sequence: 3,
      })
      .returning();

    // 5. Equipment
    // In Switch Room 01: UT-01, UT-02, MSB-01, MSB-02
    const [ut01] = await db
      .insert(equipment)
      .values({
        projectId: project.id,
        locationId: switchRoom01.id,
        equipmentCode: 'UT-01',
        equipmentName: 'Unit Substation 01',
        equipmentType: 'Substation Transformer',
        system: 'Electrical LV',
        manufacturer: 'Schneider Electric',
        model: 'Trihal Cast Resin 2500kVA',
        serialNumber: 'SN-TR-2026-9901',
        responsibleCompany: apexCompany.name,
        status: 'Installed',
        description: '11kV to 415V 2500kVA Step-down Unit Substation feeding MSB-01',
        qrCode: 'FORGE:EQ:UT-01',
      })
      .returning();

    const [ut02] = await db
      .insert(equipment)
      .values({
        projectId: project.id,
        locationId: switchRoom01.id,
        equipmentCode: 'UT-02',
        equipmentName: 'Unit Substation 02',
        equipmentType: 'Substation Transformer',
        system: 'Electrical LV',
        manufacturer: 'Schneider Electric',
        model: 'Trihal Cast Resin 2500kVA',
        serialNumber: 'SN-TR-2026-9902',
        responsibleCompany: apexCompany.name,
        status: 'Installed',
        description: '11kV to 415V 2500kVA Step-down Unit Substation feeding MSB-02',
        qrCode: 'FORGE:EQ:UT-02',
      })
      .returning();

    const [msb01] = await db
      .insert(equipment)
      .values({
        projectId: project.id,
        locationId: switchRoom01.id,
        equipmentCode: 'MSB-01',
        equipmentName: 'Main Switchboard 01',
        equipmentType: 'Main Switchboard',
        system: 'Electrical LV',
        manufacturer: 'Stark Power Systems',
        model: 'PowerZone 4000A Form 4b',
        serialNumber: 'SN-MSB-4001',
        responsibleCompany: apexCompany.name,
        status: 'Installed',
        description: 'Main 415V Power Distribution Switchboard A-Side',
        qrCode: 'FORGE:EQ:MSB-01',
      })
      .returning();

    const [msb02] = await db
      .insert(equipment)
      .values({
        projectId: project.id,
        locationId: switchRoom01.id,
        equipmentCode: 'MSB-02',
        equipmentName: 'Main Switchboard 02',
        equipmentType: 'Main Switchboard',
        system: 'Electrical LV',
        manufacturer: 'Stark Power Systems',
        model: 'PowerZone 4000A Form 4b',
        serialNumber: 'SN-MSB-4002',
        responsibleCompany: apexCompany.name,
        status: 'Installed',
        description: 'Main 415V Power Distribution Switchboard B-Side Redundant',
        qrCode: 'FORGE:EQ:MSB-02',
      })
      .returning();

    const [pdu01] = await db
      .insert(equipment)
      .values({
        projectId: project.id,
        locationId: dataHall01.id,
        equipmentCode: 'PDU-01',
        equipmentName: 'Power Distribution Unit 01',
        equipmentType: 'PDU',
        system: 'Electrical LV',
        manufacturer: 'Vertiv',
        model: 'Liebert FPC 300kVA',
        serialNumber: 'SN-PDU-01-VT',
        responsibleCompany: apexCompany.name,
        status: 'Installed',
        description: 'Data Hall Row A Power Distribution Unit',
        qrCode: 'FORGE:EQ:PDU-01',
      })
      .returning();

    // 6. Cables
    const cableData = [
      {
        cableId: 'CB-L02-UT01-001',
        fromEquipmentId: ut01.id,
        fromEquipmentCode: 'UT-01',
        toEquipmentId: msb01.id,
        toEquipmentCode: 'MSB-01',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '4C 240mm² Cu XLPE/SWA/PVC',
        cableSize: '240mm²',
        coreCount: 4,
        length: 48.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Approved',
        installationDate: '2026-09-12',
        testDate: '2026-09-15',
        comments: 'Tray route T-201 verified. Cable ties spaced at 450mm.',
      },
      {
        cableId: 'CB-L02-UT01-002',
        fromEquipmentId: ut01.id,
        fromEquipmentCode: 'UT-01',
        toEquipmentId: msb01.id,
        toEquipmentCode: 'MSB-01',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '4C 240mm² Cu XLPE/SWA/PVC',
        cableSize: '240mm²',
        coreCount: 4,
        length: 48.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Pending Review',
        installationDate: '2026-09-12',
        testDate: '2026-09-15',
        comments: 'Lug torque checked to 45Nm.',
      },
      {
        cableId: 'CB-L02-UT01-003',
        fromEquipmentId: ut01.id,
        fromEquipmentCode: 'UT-01',
        toEquipmentId: msb01.id,
        toEquipmentCode: 'MSB-01',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '4C 240mm² Cu XLPE/SWA/PVC',
        cableSize: '240mm²',
        coreCount: 4,
        length: 50.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'In Progress',
        qaStatus: 'Not Started',
        installationDate: '2026-09-14',
        comments: 'Gland plate fitted. Pending IR test.',
      },
      {
        cableId: 'CB-L02-UT01-004',
        fromEquipmentId: ut01.id,
        fromEquipmentCode: 'UT-01',
        toEquipmentId: msb01.id,
        toEquipmentCode: 'MSB-01',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '4C 240mm² Cu XLPE/SWA/PVC',
        cableSize: '240mm²',
        coreCount: 4,
        length: 50.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Approved',
        installationDate: '2026-09-14',
        testDate: '2026-09-18',
      },
      {
        cableId: 'CB-L02-UT01-005',
        fromEquipmentId: ut01.id,
        fromEquipmentCode: 'UT-01',
        toEquipmentId: msb01.id,
        toEquipmentCode: 'MSB-01',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '1C 630mm² Cu XLPE Neutral',
        cableSize: '630mm²',
        coreCount: 1,
        length: 48.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Approved',
        installationDate: '2026-09-15',
        testDate: '2026-09-18',
      },
      {
        cableId: 'CB-L02-UT01-006',
        fromEquipmentId: ut01.id,
        fromEquipmentCode: 'UT-01',
        toEquipmentId: msb01.id,
        toEquipmentCode: 'MSB-01',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '1C 120mm² Cu Earth',
        cableSize: '120mm²',
        coreCount: 1,
        length: 45.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Approved',
        installationDate: '2026-09-15',
        testDate: '2026-09-18',
      },
      {
        cableId: 'CB-L02-UT02-001',
        fromEquipmentId: ut02.id,
        fromEquipmentCode: 'UT-02',
        toEquipmentId: msb02.id,
        toEquipmentCode: 'MSB-02',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '4C 240mm² Cu XLPE/SWA/PVC',
        cableSize: '240mm²',
        coreCount: 4,
        length: 52.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Approved',
        installationDate: '2026-09-16',
        testDate: '2026-09-19',
      },
      {
        cableId: 'CB-L02-UT02-002',
        fromEquipmentId: ut02.id,
        fromEquipmentCode: 'UT-02',
        toEquipmentId: msb02.id,
        toEquipmentCode: 'MSB-02',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '4C 240mm² Cu XLPE/SWA/PVC',
        cableSize: '240mm²',
        coreCount: 4,
        length: 52.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Not Terminated',
        testingStatus: 'Not Tested',
        qaStatus: 'Not Started',
        installationDate: '2026-09-20',
        comments: 'Cable pulled onto ladder tray. Awaiting gland kit.',
      },
      {
        cableId: 'CB-L02-UT02-003',
        fromEquipmentId: ut02.id,
        fromEquipmentCode: 'UT-02',
        toEquipmentId: msb02.id,
        toEquipmentCode: 'MSB-02',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '4C 240mm² Cu XLPE/SWA/PVC',
        cableSize: '240mm²',
        coreCount: 4,
        length: 54.0,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Not Installed',
        terminationStatus: 'Not Terminated',
        testingStatus: 'Not Tested',
        qaStatus: 'Not Started',
        comments: 'Drum 4 scheduled for delivery Friday.',
      },
      {
        cableId: 'CB-L02-MSB01-PDU01',
        fromEquipmentId: msb01.id,
        fromEquipmentCode: 'MSB-01',
        toEquipmentId: pdu01.id,
        toEquipmentCode: 'PDU-01',
        locationId: switchRoom01.id,
        system: 'LV Power',
        cableType: '4C 95mm² Cu XLPE/SWA/PVC',
        cableSize: '95mm²',
        coreCount: 4,
        length: 72.5,
        responsibleCompany: apexCompany.name,
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Pending Review',
        installationDate: '2026-09-22',
        testDate: '2026-09-24',
      },
    ];

    const insertedCables = [];
    for (const c of cableData) {
      const [inserted] = await db
        .insert(cables)
        .values({
          projectId: project.id,
          ...c,
        })
        .returning();
      insertedCables.push(inserted);
    }

    // 7. ITR Templates
    // Template 1: Cable Installation & Routing Inspection
    const [templateInstall] = await db
      .insert(itrTemplates)
      .values({
        projectId: project.id,
        code: 'ITR-EL-01',
        title: 'Cable Installation & Routing Inspection',
        discipline: 'Electrical',
        targetType: 'Cable',
        description: 'Physical inspection of cable containment, bending radius, mechanical protection, and identification labels.',
        version: 1,
        status: 'Active',
        schemaDefinition: JSON.stringify({
          sections: [
            {
              id: 'sec_containment',
              title: '1. Containment & Support',
              fields: [
                { id: 'tray_route', label: 'Cable installed in accordance with approved cable schedule route', type: 'pass_fail_na', required: true },
                { id: 'bending_radius', label: 'Minimum bending radius maintained per manufacturer standard', type: 'pass_fail_na', required: true },
                { id: 'cleats_ties', label: 'Cable ties/cleats properly rated, spaced, and tensioned without pinch', type: 'pass_fail_na', required: true },
                { id: 'fire_stopping', label: 'Transit fire-stopping intact where penetrating fire-rated barriers', type: 'pass_fail_na', required: false },
              ],
            },
            {
              id: 'sec_termination',
              title: '2. Glanding & Termination',
              fields: [
                { id: 'gland_type', label: 'Cable glands matched to cable type & enclosure IP rating', type: 'pass_fail_na', required: true },
                { id: 'armour_earthing', label: 'Armour earth clamp fitted and bonded to earth bar', type: 'pass_fail_na', required: true },
                { id: 'lug_crimping', label: 'Lugs crimped with correct calibrated die and heat-shrink sleeve', type: 'pass_fail_na', required: true },
                { id: 'torque_marked', label: 'Bolted connections torqued to spec and torque-seal marked', type: 'pass_fail_na', required: true },
                { id: 'phase_id', label: 'Correct phase identification sleeves applied (L1 Red, L2 White, L3 Blue, N Black)', type: 'pass_fail_na', required: true },
              ],
            },
            {
              id: 'sec_comments',
              title: '3. Inspection Sign-Off',
              fields: [
                { id: 'site_comments', label: 'Tradesperson Site Notes / Observations', type: 'textarea', required: false },
                { id: 'photo_notes', label: 'Photo References / Evidence Attached', type: 'text', required: false },
              ],
            },
          ],
        }),
      })
      .returning();

    // Template 2: LV Power Cable Insulation Resistance & Continuity Test (Spreadsheet Table!)
    const [templateTesting] = await db
      .insert(itrTemplates)
      .values({
        projectId: project.id,
        code: 'ITR-EL-02',
        title: 'LV Cable Insulation Resistance & Continuity Test',
        discipline: 'Electrical',
        targetType: 'Cable',
        description: 'Structured 1000V DC Insulation Resistance and low-resistance continuity test records.',
        version: 1,
        status: 'Active',
        schemaDefinition: JSON.stringify({
          sections: [
            {
              id: 'sec_test_instrument',
              title: '1. Test Equipment & Calibration',
              fields: [
                { id: 'meter_model', label: 'Test Instrument Model (e.g. Megger MIT515 / Fluke 1507)', type: 'text', required: true },
                { id: 'meter_serial', label: 'Serial Number', type: 'text', required: true },
                { id: 'calibration_date', label: 'Calibration Due Date', type: 'date', required: true },
                { id: 'test_voltage', label: 'Test Voltage Applied', type: 'dropdown', options: ['500V DC', '1000V DC', '2500V DC'], required: true },
              ],
            },
            {
              id: 'sec_spreadsheet_table',
              title: '2. Insulation Resistance Readings (Table)',
              type: 'spreadsheet_table',
              columns: [
                { id: 'phase', label: 'Phase Under Test', type: 'text', readOnly: true },
                { id: 'reading', label: 'IR Reading', type: 'number', required: true },
                { id: 'unit', label: 'Unit', type: 'text', defaultValue: 'MΩ', readOnly: true },
                { id: 'min_limit', label: 'Min Spec Limit', type: 'text', defaultValue: '≥ 50 MΩ', readOnly: true },
                { id: 'result', label: 'Result', type: 'pass_fail', required: true },
              ],
              defaultRows: [
                { phase: 'L1 to Earth (L1-E)', reading: '998', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
                { phase: 'L2 to Earth (L2-E)', reading: '1005', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
                { phase: 'L3 to Earth (L3-E)', reading: '1012', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
                { phase: 'Neutral to Earth (N-E)', reading: '850', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
                { phase: 'L1 to L2', reading: '1000', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
                { phase: 'L2 to L3', reading: '1000', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
                { phase: 'L3 to L1', reading: '1000', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
              ],
            },
            {
              id: 'sec_continuity',
              title: '3. Continuity & Phase Rotation',
              fields: [
                { id: 'continuity_check', label: 'Low resistance end-to-end conductor continuity verified (< 0.2Ω)', type: 'pass_fail_na', required: true },
                { id: 'phase_rotation', label: 'Phase sequence rotation verified clockwise (1-2-3)', type: 'pass_fail_na', required: true },
                { id: 'tester_signature', label: 'Certified Electrician Name & Licence Number', type: 'text', required: true },
              ],
            },
          ],
        }),
      })
      .returning();

    // Template 3: Equipment Substation Inspection
    const [templateEquipment] = await db
      .insert(itrTemplates)
      .values({
        projectId: project.id,
        code: 'ITR-EQ-01',
        title: 'Substation & Main Switchboard Inspection',
        discipline: 'Electrical',
        targetType: 'Equipment',
        description: 'Mechanical anchoring, busbar torque seals, clearances, and earthing inspection.',
        version: 1,
        status: 'Active',
        schemaDefinition: JSON.stringify({
          sections: [
            {
              id: 'sec_eq_physical',
              title: '1. Physical Installation & Anchoring',
              fields: [
                { id: 'plinth_anchors', label: 'Equipment plinth level and seismic hold-down bolts torqued', type: 'pass_fail_na', required: true },
                { id: 'clearance_access', label: 'Door swing clearances and rear access comply with AS/NZS 3000', type: 'pass_fail_na', required: true },
                { id: 'ip_rating', label: 'Ingress protection seals and gland plates intact', type: 'pass_fail_na', required: true },
              ],
            },
            {
              id: 'sec_eq_busbar',
              title: '2. Busbars & Earthing',
              fields: [
                { id: 'main_earth_bar', label: 'Main station earth connected and bonded (< 0.5Ω)', type: 'pass_fail_na', required: true },
                { id: 'busbar_torque', label: 'All bolted busbar joints torqued to specified torque and torque-sealed', type: 'pass_fail_na', required: true },
                { id: 'ct_polarity', label: 'Protection CT polarities and ratios verified', type: 'pass_fail_na', required: true },
              ],
            },
          ],
        }),
      })
      .returning();

    // 8. ITR Instances
    // Instance 1: CB-L02-UT01-001 (Approved Cable Installation)
    const [itr1] = await db
      .insert(itrInstances)
      .values({
        projectId: project.id,
        itrNumber: 'ITR-MEL02-0001',
        templateId: templateInstall.id,
        templateTitle: templateInstall.title,
        targetType: 'Cable',
        targetId: insertedCables[0].id,
        targetCode: insertedCables[0].cableId,
        status: 'Approved',
        autoPopulatedData: JSON.stringify({
          cableId: insertedCables[0].cableId,
          fromEquipment: insertedCables[0].fromEquipmentCode,
          toEquipment: insertedCables[0].toEquipmentCode,
          cableType: insertedCables[0].cableType,
          cableSize: insertedCables[0].cableSize,
          system: insertedCables[0].system,
          length: insertedCables[0].length,
          responsibleCompany: insertedCables[0].responsibleCompany,
          location: 'Switch Room 01 (Level 02)',
        }),
        formData: JSON.stringify({
          tray_route: 'PASS',
          bending_radius: 'PASS',
          cleats_ties: 'PASS',
          fire_stopping: 'PASS',
          gland_type: 'PASS',
          armour_earthing: 'PASS',
          lug_crimping: 'PASS',
          torque_marked: 'PASS',
          phase_id: 'PASS',
          site_comments: 'Routing checked against IFC Drawing E-201. Gland plate properly bonded.',
        }),
        assignedTo: 'Dave Miller',
        assignedCompany: apexCompany.name,
        submittedBy: 'dave.miller@apexelectrical.com.au',
        submittedByName: 'Dave Miller (Tradesperson)',
        submittedAt: new Date(Date.now() - 86400000 * 5),
        reviewedBy: 'mark.callahan@apexelectrical.com.au',
        reviewedByName: 'Mark Callahan (Supervisor)',
        reviewedAt: new Date(Date.now() - 86400000 * 4),
        approvalNotes: 'Inspected on site. Cleats, torque marks, and glanding conform to client specification.',
      })
      .returning();

    // Instance 2: CB-L02-UT01-002 (Submitted for Supervisor Review!)
    const [itr2] = await db
      .insert(itrInstances)
      .values({
        projectId: project.id,
        itrNumber: 'ITR-MEL02-0002',
        templateId: templateTesting.id,
        templateTitle: templateTesting.title,
        targetType: 'Cable',
        targetId: insertedCables[1].id,
        targetCode: insertedCables[1].cableId,
        status: 'Submitted',
        autoPopulatedData: JSON.stringify({
          cableId: insertedCables[1].cableId,
          fromEquipment: insertedCables[1].fromEquipmentCode,
          toEquipment: insertedCables[1].toEquipmentCode,
          cableType: insertedCables[1].cableType,
          cableSize: insertedCables[1].cableSize,
          system: insertedCables[1].system,
          length: insertedCables[1].length,
          responsibleCompany: insertedCables[1].responsibleCompany,
          location: 'Switch Room 01 (Level 02)',
        }),
        formData: JSON.stringify({
          meter_model: 'Fluke 1507 Insulation Tester',
          meter_serial: 'FLK-99214',
          calibration_date: '2026-12-01',
          test_voltage: '1000V DC',
          continuity_check: 'PASS',
          phase_rotation: 'PASS',
          tester_signature: 'Dave Miller - Lic #EC44921',
          spreadsheet_rows: [
            { phase: 'L1 to Earth (L1-E)', reading: '998', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
            { phase: 'L2 to Earth (L2-E)', reading: '1005', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
            { phase: 'L3 to Earth (L3-E)', reading: '1012', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
            { phase: 'Neutral to Earth (N-E)', reading: '850', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
            { phase: 'L1 to L2', reading: '1000', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
            { phase: 'L2 to L3', reading: '1000', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
            { phase: 'L3 to L1', reading: '1000', unit: 'MΩ', min_limit: '≥ 50 MΩ', result: 'PASS' },
          ],
        }),
        assignedTo: 'Dave Miller',
        assignedCompany: apexCompany.name,
        submittedBy: 'dave.miller@apexelectrical.com.au',
        submittedByName: 'Dave Miller (Tradesperson)',
        submittedAt: new Date(Date.now() - 3600000 * 3),
      })
      .returning();

    // Instance 3: UT-01 Equipment Inspection
    const [itr3] = await db
      .insert(itrInstances)
      .values({
        projectId: project.id,
        itrNumber: 'ITR-MEL02-0003',
        templateId: templateEquipment.id,
        templateTitle: templateEquipment.title,
        targetType: 'Equipment',
        targetId: ut01.id,
        targetCode: ut01.equipmentCode,
        status: 'Approved',
        autoPopulatedData: JSON.stringify({
          equipmentCode: ut01.equipmentCode,
          equipmentName: ut01.equipmentName,
          manufacturer: ut01.manufacturer,
          model: ut01.model,
          serialNumber: ut01.serialNumber,
          location: 'Switch Room 01 (Level 02)',
          responsibleCompany: ut01.responsibleCompany,
        }),
        formData: JSON.stringify({
          plinth_anchors: 'PASS',
          clearance_access: 'PASS',
          ip_rating: 'PASS',
          main_earth_bar: 'PASS',
          busbar_torque: 'PASS',
          ct_polarity: 'PASS',
        }),
        assignedTo: 'Dave Miller',
        assignedCompany: apexCompany.name,
        submittedBy: 'dave.miller@apexelectrical.com.au',
        submittedByName: 'Dave Miller (Tradesperson)',
        submittedAt: new Date(Date.now() - 86400000 * 2),
        reviewedBy: 'sarah.jenkins@aegisqa.com',
        reviewedByName: 'Sarah Jenkins (QA Manager)',
        reviewedAt: new Date(Date.now() - 86400000 * 1),
        approvalNotes: 'Substation mechanical anchor and earth grid verified satisfactory.',
      })
      .returning();

    // 9. Structured Test Readings
    const readings = [
      { itrInstanceId: itr2.id, cableId: insertedCables[1].id, equipmentId: ut01.id, testType: 'Insulation Resistance', phase: 'L1-E', reading: 998, unit: 'MΩ', testVoltage: '1000V DC', result: 'PASS', testedBy: 'Dave Miller', testDate: '2026-09-15' },
      { itrInstanceId: itr2.id, cableId: insertedCables[1].id, equipmentId: ut01.id, testType: 'Insulation Resistance', phase: 'L2-E', reading: 1005, unit: 'MΩ', testVoltage: '1000V DC', result: 'PASS', testedBy: 'Dave Miller', testDate: '2026-09-15' },
      { itrInstanceId: itr2.id, cableId: insertedCables[1].id, equipmentId: ut01.id, testType: 'Insulation Resistance', phase: 'L3-E', reading: 1012, unit: 'MΩ', testVoltage: '1000V DC', result: 'PASS', testedBy: 'Dave Miller', testDate: '2026-09-15' },
      { itrInstanceId: itr2.id, cableId: insertedCables[1].id, equipmentId: ut01.id, testType: 'Insulation Resistance', phase: 'N-E', reading: 850, unit: 'MΩ', testVoltage: '1000V DC', result: 'PASS', testedBy: 'Dave Miller', testDate: '2026-09-15' },
      { itrInstanceId: itr2.id, cableId: insertedCables[1].id, equipmentId: ut01.id, testType: 'Insulation Resistance', phase: 'L1-L2', reading: 1000, unit: 'MΩ', testVoltage: '1000V DC', result: 'PASS', testedBy: 'Dave Miller', testDate: '2026-09-15' },
    ];

    for (const r of readings) {
      await db.insert(testReadings).values({
        projectId: project.id,
        ...r,
      });
    }

    // 10. Sample Issue / Defect
    await db.insert(issues).values({
      projectId: project.id,
      issueNumber: 'ISS-001',
      title: 'Missing stainless steel cable marker tag on CB-L02-UT01-003',
      description: 'Cable tag missing at MSB-01 gland plate entry. Tag must specify Cable ID, From, To, and 4C 240mm² Cu per project specification E-SPECS-04.',
      category: 'Quality',
      priority: 'Medium',
      status: 'Open',
      locationId: switchRoom01.id,
      equipmentId: msb01.id,
      cableId: insertedCables[2].id,
      assignedPerson: 'Dave Miller',
      assignedCompany: apexCompany.name,
      raisedBy: 'sarah.jenkins@aegisqa.com',
      raisedByName: 'Sarah Jenkins (QA Manager)',
      dueDate: '2026-10-15',
      comments: JSON.stringify([
        { author: 'Sarah Jenkins', date: '2026-10-02', text: 'Identified during weekly QA walk-through.' },
        { author: 'Dave Miller', date: '2026-10-03', text: 'Embossing machine ribbon was low, tag ordered and will install tomorrow.' },
      ]),
    });

    // 11. Initial Audit Logs
    await db.insert(auditLogs).values([
      {
        projectId: project.id,
        entityType: 'Equipment',
        entityId: ut01.id,
        entityCode: 'UT-01',
        action: 'Create',
        performedBy: 'admin',
        performedByName: 'Alex Vance',
        performedByRole: 'Administrator',
        details: JSON.stringify({ message: 'Equipment UT-01 registered to Switch Room 01' }),
      },
      {
        projectId: project.id,
        entityType: 'Cable',
        entityId: insertedCables[0].id,
        entityCode: insertedCables[0].cableId,
        action: 'Import',
        performedBy: 'mark.callahan',
        performedByName: 'Mark Callahan',
        performedByRole: 'Supervisor',
        details: JSON.stringify({ message: 'Imported from IFC Cable Schedule Rev C' }),
      },
      {
        projectId: project.id,
        entityType: 'ITR',
        entityId: itr1.id,
        entityCode: itr1.itrNumber,
        action: 'Approve',
        performedBy: 'mark.callahan',
        performedByName: 'Mark Callahan',
        performedByRole: 'Supervisor',
        details: JSON.stringify({ message: 'ITR approved on site. Cable QA status set to Approved.' }),
      },
    ]);

    console.log('MAXIM FORGE seeding completed successfully.');
    return { message: 'Database seeded successfully', projectId: project.id };
  } catch (error) {
    console.error('Error during database seed:', error);
    throw error;
  }
}
