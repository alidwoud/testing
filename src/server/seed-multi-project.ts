import { db, createPool } from '../db/index.ts';
import {
  projects,
  locations,
  equipment,
  cables,
  itrTemplates,
  itrInstances,
  issues,
  companies,
  users,
  auditLogs,
  drawings,
  spatialPins,
  photoEvidence,
  projectMembers,
} from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';

export async function ensureTablesAndMultiProjectSeed() {
  console.log('Seeding multi-project data (MEL02, MEL03, SYD01, drawings, pins, photos)...');

  // 2. Check if MEL02 exists
  const existingProjects = await db.select().from(projects);
  const mel02 = existingProjects.find((p) => p.code === 'MEL02');
  let mel02Id = mel02?.id || 1;

  // 3. Check / seed MEL03
  let mel03 = existingProjects.find((p) => p.code === 'MEL03');
  let mel03Id: number;
  if (!mel03) {
    const [created] = await db
      .insert(projects)
      .values({
        code: 'MEL03',
        name: 'DC Melbourne 03',
        description: 'Data Centre Expansion Phase 3 - High Voltage & Containment',
        status: 'Active',
        clientName: 'Australis DC JV / Macquarie',
        location: 'Melbourne, Victoria',
      })
      .returning();
    mel03Id = created.id;
    console.log(`Created project MEL03 (ID: ${mel03Id})`);

    // Seed MEL03 locations
    const [bldg] = await db
      .insert(locations)
      .values({
        projectId: mel03Id,
        parentId: null,
        name: 'Building C',
        code: 'BLD-C',
        type: 'Building',
        path: 'Building C',
        sequence: 1,
      })
      .returning();

    const [lvl1] = await db
      .insert(locations)
      .values({
        projectId: mel03Id,
        parentId: bldg.id,
        name: 'Level 01',
        code: 'L01',
        type: 'Level',
        path: 'Building C > Level 01',
        sequence: 1,
      })
      .returning();

    const [hvRoom] = await db
      .insert(locations)
      .values({
        projectId: mel03Id,
        parentId: lvl1.id,
        name: 'HV Switch Room 01',
        code: 'HVSR-01',
        type: 'Room',
        path: 'Building C > Level 01 > HV Switch Room 01',
        sequence: 1,
      })
      .returning();

    // Seed MEL03 Equipment
    const [tx01] = await db
      .insert(equipment)
      .values({
        projectId: mel03Id,
        locationId: hvRoom.id,
        equipmentCode: 'TX-01',
        equipmentName: '11kV / 415V 2500kVA Cast Resin Transformer',
        equipmentType: 'Transformer',
        system: 'High Voltage',
        responsibleCompany: 'Stark Power Systems',
        status: 'Installed',
      })
      .returning();

    const [hvs01] = await db
      .insert(equipment)
      .values({
        projectId: mel03Id,
        locationId: hvRoom.id,
        equipmentCode: 'HVS-01',
        equipmentName: '11kV Schneider HV Switchboard',
        equipmentType: 'HV Switchgear',
        system: 'High Voltage',
        responsibleCompany: 'Stark Power Systems',
        status: 'Installed',
      })
      .returning();

    // Seed MEL03 Cables
    await db.insert(cables).values([
      {
        projectId: mel03Id,
        cableId: 'MEL03-HV-001',
        fromEquipmentId: hvs01.id,
        fromEquipmentCode: 'HVS-01',
        toEquipmentId: tx01.id,
        toEquipmentCode: 'TX-01',
        locationId: hvRoom.id,
        system: 'High Voltage',
        cableType: '11kV 3C 185mm² XLPE/SWA/PVC',
        cableSize: '3C x 185mm²',
        coreCount: 3,
        length: 45.5,
        responsibleCompany: 'Apex Electrical Contractors',
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Approved',
      },
      {
        projectId: mel03Id,
        cableId: 'MEL03-HV-002',
        fromEquipmentId: hvs01.id,
        fromEquipmentCode: 'HVS-01',
        toEquipmentId: tx01.id,
        toEquipmentCode: 'TX-01',
        locationId: hvRoom.id,
        system: 'High Voltage',
        cableType: '11kV 3C 185mm² XLPE/SWA/PVC',
        cableSize: '3C x 185mm²',
        coreCount: 3,
        length: 46.0,
        responsibleCompany: 'Apex Electrical Contractors',
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'In Progress',
        qaStatus: 'Pending Review',
      },
    ]);
  } else {
    mel03Id = mel03.id;
  }

  // 4. Check / seed SYD01
  let syd01 = existingProjects.find((p) => p.code === 'SYD01');
  let syd01Id: number;
  if (!syd01) {
    const [created] = await db
      .insert(projects)
      .values({
        code: 'SYD01',
        name: 'Sydney Data Centre 01',
        description: 'Western Sydney 120MW Hyperscale Facility - Commissioning Phase',
        status: 'Commissioning',
        clientName: 'AirTrunk / Hyperscale Pty Ltd',
        location: 'Western Sydney, NSW',
      })
      .returning();
    syd01Id = created.id;
    console.log(`Created project SYD01 (ID: ${syd01Id})`);

    // Seed SYD01 location & equipment
    const [bldg] = await db
      .insert(locations)
      .values({
        projectId: syd01Id,
        parentId: null,
        name: 'Building 1',
        code: 'SYD-B01',
        type: 'Building',
        path: 'Building 1',
        sequence: 1,
      })
      .returning();

    const [dh01] = await db
      .insert(locations)
      .values({
        projectId: syd01Id,
        parentId: bldg.id,
        name: 'Data Hall 01',
        code: 'DH-01',
        type: 'Room',
        path: 'Building 1 > Data Hall 01',
        sequence: 1,
      })
      .returning();

    const [pdu01] = await db
      .insert(equipment)
      .values({
        projectId: syd01Id,
        locationId: dh01.id,
        equipmentCode: 'PDU-A01',
        equipmentName: '300kVA Precision Power Distribution Unit',
        equipmentType: 'PDU',
        system: 'Low Voltage',
        responsibleCompany: 'Apex Electrical Contractors',
        status: 'Installed',
      })
      .returning();

    await db.insert(cables).values([
      {
        projectId: syd01Id,
        cableId: 'SYD-CB-001',
        fromEquipmentId: pdu01.id,
        fromEquipmentCode: 'PDU-A01',
        toEquipmentId: pdu01.id,
        toEquipmentCode: 'RPP-01',
        locationId: dh01.id,
        system: 'Low Voltage',
        cableType: '4C 70mm² Cu XLPE',
        cableSize: '4C x 70mm²',
        coreCount: 4,
        length: 28.0,
        responsibleCompany: 'Apex Electrical Contractors',
        installationStatus: 'Installed',
        terminationStatus: 'Terminated',
        testingStatus: 'Tested',
        qaStatus: 'Approved',
      },
    ]);
  } else {
    syd01Id = syd01.id;
  }

  // 5. Seed Project Members / Access Rules
  // Alex Vance (user-admin-01): Administrator on MEL02, MEL03, SYD01
  // Sarah Jenkins (user-qa-01): QA Manager on MEL02, MEL03
  // Mark Callahan (user-supervisor-01): Supervisor on MEL02, Leading Hand on MEL03
  // Dave Miller (user-tradesperson-01): Tradesperson on MEL02 ONLY
  const existingMembers = await db.select().from(projectMembers);
  if (existingMembers.length === 0) {
    await db.insert(projectMembers).values([
      // MEL02
      { projectId: mel02Id, userUid: 'user-admin-01', role: 'Administrator' },
      { projectId: mel02Id, userUid: 'user-qa-01', role: 'QA Manager' },
      { projectId: mel02Id, userUid: 'user-supervisor-01', role: 'Supervisor' },
      { projectId: mel02Id, userUid: 'user-tradesperson-01', role: 'Tradesperson' },

      // MEL03
      { projectId: mel03Id, userUid: 'user-admin-01', role: 'Administrator' },
      { projectId: mel03Id, userUid: 'user-qa-01', role: 'QA Manager' },
      { projectId: mel03Id, userUid: 'user-supervisor-01', role: 'Supervisor' },

      // SYD01
      { projectId: syd01Id, userUid: 'user-admin-01', role: 'Administrator' },
    ]);
    console.log('Project members permissions seeded.');
  }

  // 6. Seed Drawings for MEL02, MEL03, SYD01
  const existingDrawings = await db.select().from(drawings);
  let dwgMel02E101Id: number;
  let dwgMel02E102Id: number;

  if (existingDrawings.length === 0) {
    const [d1] = await db
      .insert(drawings)
      .values({
        projectId: mel02Id,
        drawingNumber: 'MEL02-E-101',
        title: 'Level 02 - Overall Electrical Layout & Containment',
        discipline: 'Electrical',
        revision: 'Rev C',
        status: 'Issued for Construction',
        scale: '1:100',
        levelName: 'Level 02',
        svgData: 'blueprint-mel02-l02',
      })
      .returning();
    dwgMel02E101Id = d1.id;

    const [d2] = await db
      .insert(drawings)
      .values({
        projectId: mel02Id,
        drawingNumber: 'MEL02-E-102',
        title: 'Level 02 - Switch Room 01 Equipment & Cable Trays',
        discipline: 'Electrical',
        revision: 'Rev B',
        status: 'Issued for Construction',
        scale: '1:50',
        levelName: 'Level 02',
        svgData: 'blueprint-mel02-sr01',
      })
      .returning();
    dwgMel02E102Id = d2.id;

    await db.insert(drawings).values([
      {
        projectId: mel02Id,
        drawingNumber: 'MEL02-A-001',
        title: 'Level 02 - General Architectural Floor Plan',
        discipline: 'Architectural',
        revision: 'Rev D',
        status: 'As-Built',
        scale: '1:100',
        levelName: 'Level 02',
        svgData: 'blueprint-mel02-arch',
      },
      {
        projectId: mel02Id,
        drawingNumber: 'MEL02-E-201',
        title: 'Main High Voltage Single Line Diagram (SLD)',
        discipline: 'Electrical',
        revision: 'Rev 04',
        status: 'Issued for Construction',
        scale: 'NTS',
        levelName: 'All Levels',
        svgData: 'blueprint-mel02-sld',
      },
      {
        projectId: mel03Id,
        drawingNumber: 'MEL03-E-101',
        title: 'Level 01 - HV Switchboard & Transformer Layout',
        discipline: 'Electrical',
        revision: 'Rev A',
        status: 'Issued for Construction',
        scale: '1:100',
        levelName: 'Level 01',
        svgData: 'blueprint-mel03-l01',
      },
      {
        projectId: syd01Id,
        drawingNumber: 'SYD01-E-101',
        title: 'Ground Floor - Hyperscale Data Hall 01 Electrical Fitout',
        discipline: 'Electrical',
        revision: 'Rev 02',
        status: 'As-Built',
        scale: '1:100',
        levelName: 'Ground Floor',
        svgData: 'blueprint-syd01-g01',
      },
    ]);
    console.log('Project drawings seeded.');
  } else {
    dwgMel02E101Id = existingDrawings[0].id;
    dwgMel02E102Id = existingDrawings[1]?.id || existingDrawings[0].id;
  }

  // 7. Seed Spatial Pins on MEL02
  const existingPins = await db.select().from(spatialPins);
  if (existingPins.length === 0) {
    // Find MEL02 UT-01 equipment
    const [ut01] = await db
      .select()
      .from(equipment)
      .where(and(eq(equipment.projectId, mel02Id), eq(equipment.equipmentCode, 'UT-01')));

    // Find MEL02 cables
    const [cb01] = await db
      .select()
      .from(cables)
      .where(and(eq(cables.projectId, mel02Id), eq(cables.cableId, 'CB-001')));

    const [cb02] = await db
      .select()
      .from(cables)
      .where(and(eq(cables.projectId, mel02Id), eq(cables.cableId, 'CB-002')));

    // Find MEL02 Issue
    const [iss01] = await db
      .select()
      .from(issues)
      .where(eq(issues.projectId, mel02Id));

    await db.insert(spatialPins).values([
      {
        projectId: mel02Id,
        drawingId: dwgMel02E101Id,
        x: 36.5,
        y: 42.0,
        entityType: 'Equipment',
        entityId: ut01?.id || 1,
        entityCode: ut01?.equipmentCode || 'UT-01',
        title: 'Unit Substation UT-01 (Switch Room 01)',
        status: 'Installed',
        color: '#3b82f6', // blue
        notes: 'Switchgear section mounted and anchored to concrete plinth.',
        createdById: 'user-supervisor-01',
        createdByName: 'Mark Callahan',
      },
      {
        projectId: mel02Id,
        drawingId: dwgMel02E101Id,
        x: 52.0,
        y: 35.5,
        entityType: 'Cable',
        entityId: cb01?.id || 1,
        entityCode: cb01?.cableId || 'CB-001',
        title: 'Cable CB-001 Containment Pathway',
        status: 'Approved',
        color: '#10b981', // emerald
        notes: 'Cable pulled in dedicated 600mm heavy-duty ladder tray.',
        createdById: 'user-qa-01',
        createdByName: 'Sarah Jenkins',
      },
      {
        projectId: mel02Id,
        drawingId: dwgMel02E101Id,
        x: 64.0,
        y: 48.0,
        entityType: 'ITR',
        entityId: 1,
        entityCode: 'ITR-0001',
        title: 'Cable Testing ITR Verification Point',
        status: 'In Progress',
        color: '#f59e0b', // amber
        notes: 'Insulation resistance testing point near MSB-01 incoming bus.',
        createdById: 'user-tradesperson-01',
        createdByName: 'Dave Miller',
      },
      {
        projectId: mel02Id,
        drawingId: dwgMel02E101Id,
        x: 28.0,
        y: 68.0,
        entityType: 'Issue',
        entityId: iss01?.id || 1,
        entityCode: iss01?.issueNumber || 'ISS-001',
        title: 'Damaged Ladder Tray Section - Grid B4',
        status: 'Defect',
        color: '#ef4444', // red
        notes: 'Containment bracket deformed during HVAC duct hoist.',
        createdById: 'user-supervisor-01',
        createdByName: 'Mark Callahan',
      },
    ]);
    console.log('Spatial pins seeded.');
  }

  // 8. Seed Photo Evidence
  const existingPhotos = await db.select().from(photoEvidence);
  if (existingPhotos.length === 0) {
    await db.insert(photoEvidence).values([
      {
        projectId: mel02Id,
        title: 'UT-01 Plinth Anchor Torque Seal',
        caption: 'M16 hold-down bolts torqued to 125Nm with red witness torque seal applied.',
        category: 'Torque Seal',
        photoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80',
        takenBy: 'user-supervisor-01',
        takenByName: 'Mark Callahan',
        entityType: 'Equipment',
        entityId: 1,
        entityCode: 'UT-01',
        qaVerified: 'true',
        metadata: JSON.stringify({ device: 'Site iPad Pro', location: 'Switch Room 01 Plinth B' }),
      },
      {
        projectId: mel02Id,
        title: 'CB-001 Gland Plate & Lug Terminations',
        caption: '4C 240mm² XLPE glanded with IP66 brass glands and heat-shrink phase identification.',
        category: 'Termination',
        photoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80',
        takenBy: 'user-tradesperson-01',
        takenByName: 'Dave Miller',
        entityType: 'Cable',
        entityId: 1,
        entityCode: 'CB-001',
        qaVerified: 'true',
        metadata: JSON.stringify({ phaseColors: 'Red/White/Blue/Black', compressionLugs: 'Klauke Hexagonal' }),
      },
      {
        projectId: mel02Id,
        title: 'Cable CB-002 Fluke Megger 1000V Test',
        caption: 'Megger 1000V test showing 999 MΩ on L1-E, L2-E, and L3-E conductors.',
        category: 'Megger / Testing',
        photoUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1000&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=300&q=80',
        takenBy: 'user-tradesperson-01',
        takenByName: 'Dave Miller',
        entityType: 'ITR',
        entityId: 1,
        entityCode: 'ITR-0001',
        qaVerified: 'true',
        metadata: JSON.stringify({ testerSerial: 'FLK-1587-8821', calibrationValidUntil: '2026-12-31' }),
      },
      {
        projectId: mel02Id,
        title: 'Damaged Tray Flange at Grid B4',
        caption: 'Defect photo: Tray side rail bent upward by duct installer scaffold leg.',
        category: 'Defect',
        photoUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
        thumbnailUrl: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=300&q=80',
        takenBy: 'user-qa-01',
        takenByName: 'Sarah Jenkins',
        entityType: 'Issue',
        entityId: 1,
        entityCode: 'ISS-001',
        qaVerified: 'false',
        metadata: JSON.stringify({ defectPriority: 'High', rectDeadline: '24h' }),
      },
    ]);
    console.log('Photo evidence seeded.');
  }

  console.log('ensureTablesAndMultiProjectSeed completed successfully.');
}
