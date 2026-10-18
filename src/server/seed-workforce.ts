import { db } from '../db/index.ts';
import {
  projects,
  companies,
  workforcePeople,
  workforceProjectMemberships,
  workforceZones,
  workforceWorkstreams,
  workforceCrews,
  workforceCrewMembers,
  workforceAllocations,
  workforceDayStates,
  workforceQualificationTypes,
  workforceQualifications,
  workforceRenewals,
  workforceRoleRequirements,
} from '../db/schema.ts';
import { eq, and } from 'drizzle-orm';
import { ensureWorkforceTables } from './workforce-tables.ts';

export async function seedWorkforceData() {
  await ensureWorkforceTables();

  console.log('Seeding Workforce Management data...');

  // 1. Ensure Qualification Types exist
  const existingTypes = await db.select().from(workforceQualificationTypes);
  if (existingTypes.length === 0) {
    console.log('Seeding default qualification types...');
    await db.insert(workforceQualificationTypes).values([
      { code: 'ELEC-A', name: 'A-Grade Electrical Licence', category: 'Licence', defaultValidityMonths: 60, requiresDocument: true },
      { code: 'WHITE-CARD', name: 'General Construction White Card', category: 'Safety / Rescue', defaultValidityMonths: null, requiresDocument: true },
      { code: 'CPR', name: 'CPR (HLTAID009)', category: 'Safety / Rescue', defaultValidityMonths: 12, requiresDocument: true },
      { code: 'LVR', name: 'Low Voltage Rescue (UETDRMP007)', category: 'Safety / Rescue', defaultValidityMonths: 12, requiresDocument: true },
      { code: 'FIRST-AID', name: 'Provide First Aid (HLTAID011)', category: 'Safety / Rescue', defaultValidityMonths: 36, requiresDocument: true },
      { code: 'EWP', name: 'Elevating Work Platform (>11m)', category: 'High Risk', defaultValidityMonths: 60, requiresDocument: true },
      { code: 'WAH', name: 'Work Safely at Heights (RIIWHS204E)', category: 'Safety / Rescue', defaultValidityMonths: 24, requiresDocument: true },
      { code: 'CABLING', name: 'ACMA Open Cabling Registration', category: 'Licence', defaultValidityMonths: 36, requiresDocument: true },
      { code: 'FORKLIFT', name: 'Forklift High Risk (LF)', category: 'High Risk', defaultValidityMonths: 60, requiresDocument: true },
      { code: 'SCISSOR', name: 'Scissor Lift (Yellow Card)', category: 'Equipment', defaultValidityMonths: 60, requiresDocument: true },
      { code: 'CONF-SPACE', name: 'Confined Space Entry', category: 'Safety / Rescue', defaultValidityMonths: 24, requiresDocument: true },
      { code: 'ARC-FLASH', name: 'Arc Flash Safety & Switching', category: 'Technical', defaultValidityMonths: 12, requiresDocument: true },
    ]);
  }

  // 2. Ensure Role Requirements exist
  const existingReqs = await db.select().from(workforceRoleRequirements);
  if (existingReqs.length === 0) {
    await db.insert(workforceRoleRequirements).values([
      { tradeRole: 'Electrician', qualificationTypeCode: 'ELEC-A', isMandatory: true, projectId: null },
      { tradeRole: 'Electrician', qualificationTypeCode: 'WHITE-CARD', isMandatory: true, projectId: null },
      { tradeRole: 'Electrician', qualificationTypeCode: 'CPR', isMandatory: true, projectId: null },
      { tradeRole: 'Electrician', qualificationTypeCode: 'LVR', isMandatory: true, projectId: null },
      { tradeRole: 'Leading Hand', qualificationTypeCode: 'ELEC-A', isMandatory: true, projectId: null },
      { tradeRole: 'Leading Hand', qualificationTypeCode: 'WHITE-CARD', isMandatory: true, projectId: null },
      { tradeRole: 'Leading Hand', qualificationTypeCode: 'CPR', isMandatory: true, projectId: null },
      { tradeRole: 'Supervisor', qualificationTypeCode: 'ELEC-A', isMandatory: true, projectId: null },
      { tradeRole: 'Supervisor', qualificationTypeCode: 'WHITE-CARD', isMandatory: true, projectId: null },
      { tradeRole: 'Supervisor', qualificationTypeCode: 'FIRST-AID', isMandatory: true, projectId: null },
      { tradeRole: 'Apprentice', qualificationTypeCode: 'WHITE-CARD', isMandatory: true, projectId: null },
      { tradeRole: 'Apprentice', qualificationTypeCode: 'CPR', isMandatory: true, projectId: null },
      { tradeRole: 'Apprentice', qualificationTypeCode: 'LVR', isMandatory: true, projectId: null },
      { tradeRole: 'High Voltage Tech', qualificationTypeCode: 'ELEC-A', isMandatory: true, projectId: null },
      { tradeRole: 'High Voltage Tech', qualificationTypeCode: 'CPR', isMandatory: true, projectId: null },
      { tradeRole: 'High Voltage Tech', qualificationTypeCode: 'LVR', isMandatory: true, projectId: null },
      { tradeRole: 'High Voltage Tech', qualificationTypeCode: 'ARC-FLASH', isMandatory: true, projectId: null },
      { tradeRole: 'Data Tech', qualificationTypeCode: 'CABLING', isMandatory: true, projectId: null },
      { tradeRole: 'Data Tech', qualificationTypeCode: 'WHITE-CARD', isMandatory: true, projectId: null },
      { tradeRole: 'Logistics', qualificationTypeCode: 'WHITE-CARD', isMandatory: true, projectId: null },
      { tradeRole: 'Logistics', qualificationTypeCode: 'FORKLIFT', isMandatory: true, projectId: null },
    ]);
  }

  // 3. Ensure Laverton Demo Project (LAV01) exists
  const allProjects = await db.select().from(projects);
  let lavProject = allProjects.find((p) => p.code === 'LAV01');
  let lavId: number;
  if (!lavProject) {
    const [created] = await db
      .insert(projects)
      .values({
        code: 'LAV01',
        name: 'Laverton Hyperscale Data Centre',
        description: JSON.stringify({
          organisation: 'MAXIM Construction Group',
          client: 'Australis Data Centers',
          principalContractor: 'Apex Electrical Contractors',
          timezone: 'Australia/Melbourne',
          environment: 'TRIAL',
        }),
        status: 'Active',
        clientName: 'Australis Data Centers',
        location: 'Laverton North, Victoria',
      })
      .returning();
    lavId = created.id;
    console.log(`Created Laverton Demo Project LAV01 (ID: ${lavId})`);
  } else {
    lavId = lavProject.id;
  }

  // 4. Ensure Laverton Zones exist (LA1, LA2, LA3)
  const existingZones = await db.select().from(workforceZones).where(eq(workforceZones.projectId, lavId));
  let zoneMap: Record<string, number> = {};
  if (existingZones.length === 0) {
    const createdZones = await db
      .insert(workforceZones)
      .values([
        { projectId: lavId, code: 'LA1', name: 'Laverton Building 1 - Data Hall A & Plant', sequence: 1 },
        { projectId: lavId, code: 'LA2', name: 'Laverton Building 2 - Data Hall B & Substations', sequence: 2 },
        { projectId: lavId, code: 'LA3', name: 'Laverton Building 3 - Central Energy Plant & Stores', sequence: 3 },
      ])
      .returning();
    createdZones.forEach((z) => { zoneMap[z.code] = z.id; });
  } else {
    existingZones.forEach((z) => { zoneMap[z.code] = z.id; });
  }

  // 5. Ensure Laverton Workstreams exist
  const existingStreams = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.projectId, lavId));
  let streamMap: Record<string, number> = {};
  if (existingStreams.length === 0) {
    const createdStreams = await db
      .insert(workforceWorkstreams)
      .values([
        { projectId: lavId, zoneId: zoneMap['LA1'], code: 'PWR', name: 'Temporary Power', color: '#eab308', sequence: 1 },
        { projectId: lavId, zoneId: zoneMap['LA1'], code: 'LGT', name: 'Lighting', color: '#f59e0b', sequence: 2 },
        { projectId: lavId, zoneId: zoneMap['LA1'], code: 'HV', name: 'High Voltage', color: '#ef4444', sequence: 3 },
        { projectId: lavId, zoneId: zoneMap['LA1'], code: 'CONT', name: 'Containment', color: '#3b82f6', sequence: 4 },
        { projectId: lavId, zoneId: zoneMap['LA1'], code: 'TEST', name: 'Testing & Commissioning', color: '#10b981', sequence: 5 },
        { projectId: lavId, zoneId: zoneMap['LA2'], code: 'DH-FIT', name: 'Data Hall Fitout', color: '#6366f1', sequence: 6 },
        { projectId: lavId, zoneId: zoneMap['LA2'], code: 'SWBD', name: 'Switch Rooms', color: '#8b5cf6', sequence: 7 },
        { projectId: lavId, zoneId: zoneMap['LA3'], code: 'LOG', name: 'Logistics & Stores', color: '#64748b', sequence: 8 },
        { projectId: lavId, zoneId: zoneMap['LA3'], code: 'CABLE', name: 'Cable Hauling', color: '#14b8a6', sequence: 9 },
      ])
      .returning();
    createdStreams.forEach((s) => { streamMap[s.code] = s.id; });
  } else {
    existingStreams.forEach((s) => { streamMap[s.code] = s.id; });
  }

  // 6. Ensure Laverton Crews exist
  const existingCrews = await db.select().from(workforceCrews).where(eq(workforceCrews.projectId, lavId));
  let crewMap: Record<string, number> = {};
  if (existingCrews.length === 0) {
    const createdCrews = await db
      .insert(workforceCrews)
      .values([
        { projectId: lavId, name: 'Crew Alpha - Lighting Team', supervisorName: 'Mark Callahan', defaultWorkstreamId: streamMap['LGT'], color: '#f59e0b' },
        { projectId: lavId, name: 'Crew Beta - Temporary Power', supervisorName: 'Chris Reynolds', defaultWorkstreamId: streamMap['PWR'], color: '#eab308' },
        { projectId: lavId, name: 'Crew Gamma - HV Substations', supervisorName: 'Nathan Price', defaultWorkstreamId: streamMap['HV'], color: '#ef4444' },
        { projectId: lavId, name: 'Crew Delta - Containment & Trays', supervisorName: 'Brett Wilson', defaultWorkstreamId: streamMap['CONT'], color: '#3b82f6' },
        { projectId: lavId, name: 'Crew Epsilon - QA & Megger Testers', supervisorName: 'Sarah Jenkins', defaultWorkstreamId: streamMap['TEST'], color: '#10b981' },
        { projectId: lavId, name: 'Crew Logistics - Material & Stores', supervisorName: 'Tom Kelly', defaultWorkstreamId: streamMap['LOG'], color: '#64748b' },
      ])
      .returning();
    createdCrews.forEach((c) => { crewMap[c.name] = c.id; });
  } else {
    existingCrews.forEach((c) => { crewMap[c.name] = c.id; });
  }

  // 7. Seed Fictional Workforce People (at least 65 people)
  const existingPeople = await db.select().from(workforcePeople);
  if (existingPeople.length < 50) {
    console.log(`Seeding 65 master workforce employee records...`);

    const rawPeople = [
      // Key acceptance test workers:
      { employeeId: 'EMP-101', firstName: 'Jordan', lastName: 'Smith', displayName: 'Jordan Smith', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'jordan.smith@example.com', defaultSupervisorName: 'Mark Callahan' },
      { employeeId: 'EMP-102', firstName: 'Marcus', lastName: 'Brody', displayName: 'Marcus Brody', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'marcus.brody@example.com', defaultSupervisorName: 'Mark Callahan' },
      { employeeId: 'EMP-103', firstName: 'Elena', lastName: 'Rostova', displayName: 'Elena Rostova', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Example Electrical', employmentType: 'Direct', workEmail: 'elena.rostova@example.com', defaultSupervisorName: 'Chris Reynolds' },
      { employeeId: 'EMP-104', firstName: 'Mark', lastName: 'Callahan', displayName: 'Mark Callahan', tradeRole: 'Supervisor', classification: 'Dual Trade Supervisor', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'mark.callahan@example.com', defaultSupervisorName: 'Alex Vance', userId: 'user-supervisor-01' },
      { employeeId: 'EMP-105', firstName: 'Dave', lastName: 'Miller', displayName: 'Dave Miller', tradeRole: 'Electrician', classification: 'CW3 A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'dave.miller@example.com', defaultSupervisorName: 'Mark Callahan', userId: 'user-tradesperson-01' },
      { employeeId: 'EMP-106', firstName: 'Sarah', lastName: 'Jenkins', displayName: 'Sarah Jenkins', tradeRole: 'Supervisor', classification: 'QA Electrical Inspector', companyName: 'Example Construction Group', employmentType: 'Direct', workEmail: 'sarah.jenkins@example.com', defaultSupervisorName: 'Alex Vance', userId: 'user-qa-01' },
      { employeeId: 'EMP-107', firstName: 'Chris', lastName: 'Reynolds', displayName: 'Chris Reynolds', tradeRole: 'Leading Hand', classification: 'CW4 Leading Hand', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'chris.reynolds@example.com', defaultSupervisorName: 'Mark Callahan' },
      { employeeId: 'EMP-108', firstName: 'Nathan', lastName: 'Price', displayName: 'Nathan Price', tradeRole: 'High Voltage Tech', classification: 'HV Specialist', companyName: 'Substation Specialists', employmentType: 'Subcontractor', workEmail: 'nathan.price@example.com', defaultSupervisorName: 'Mark Callahan' },
      { employeeId: 'EMP-109', firstName: 'Brett', lastName: 'Wilson', displayName: 'Brett Wilson', tradeRole: 'Leading Hand', classification: 'CW4 Leading Hand', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'brett.wilson@example.com', defaultSupervisorName: 'Mark Callahan' },
      { employeeId: 'EMP-110', firstName: 'Tom', lastName: 'Kelly', displayName: 'Tom Kelly', tradeRole: 'Logistics', classification: 'Stores Lead', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'tom.kelly@example.com', defaultSupervisorName: 'Alex Vance' },

      // Electricians & Techs:
      { employeeId: 'EMP-111', firstName: 'Lucas', lastName: 'Baker', displayName: 'Lucas Baker', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'lucas.baker@example.com' },
      { employeeId: 'EMP-112', firstName: 'Liam', lastName: 'Taylor', displayName: 'Liam Taylor', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'liam.taylor@example.com' },
      { employeeId: 'EMP-113', firstName: 'Noah', lastName: 'Davies', displayName: 'Noah Davies', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'noah.davies@example.com' },
      { employeeId: 'EMP-114', firstName: 'Oliver', lastName: 'Evans', displayName: 'Oliver Evans', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'oliver.evans@example.com' },
      { employeeId: 'EMP-115', firstName: 'Elijah', lastName: 'Thomas', displayName: 'Elijah Thomas', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'elijah.thomas@example.com' },
      { employeeId: 'EMP-116', firstName: 'James', lastName: 'Roberts', displayName: 'James Roberts', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'james.roberts@example.com' },
      { employeeId: 'EMP-117', firstName: 'William', lastName: 'Johnson', displayName: 'William Johnson', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'william.johnson@example.com' },
      { employeeId: 'EMP-118', firstName: 'Benjamin', lastName: 'Walker', displayName: 'Benjamin Walker', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'benjamin.walker@example.com' },
      { employeeId: 'EMP-119', firstName: 'Mason', lastName: 'Hall', displayName: 'Mason Hall', tradeRole: 'High Voltage Tech', classification: 'HV Level 2', companyName: 'Substation Specialists', employmentType: 'Subcontractor', workEmail: 'mason.hall@example.com' },
      { employeeId: 'EMP-120', firstName: 'Ethan', lastName: 'Allen', displayName: 'Ethan Allen', tradeRole: 'High Voltage Tech', classification: 'HV Level 2', companyName: 'Substation Specialists', employmentType: 'Subcontractor', workEmail: 'ethan.allen@example.com' },

      // Apprentices:
      { employeeId: 'EMP-121', firstName: 'Jack', lastName: 'Young', displayName: 'Jack Young', tradeRole: 'Apprentice', classification: '3rd Year Apprentice', companyName: 'Apex Electrical Contractors', employmentType: 'Apprentice', workEmail: 'jack.young@example.com' },
      { employeeId: 'EMP-122', firstName: 'Alexander', lastName: 'King', displayName: 'Alexander King', tradeRole: 'Apprentice', classification: '2nd Year Apprentice', companyName: 'Apex Electrical Contractors', employmentType: 'Apprentice', workEmail: 'alex.king@example.com' },
      { employeeId: 'EMP-123', firstName: 'Henry', lastName: 'Wright', displayName: 'Henry Wright', tradeRole: 'Apprentice', classification: '4th Year Apprentice', companyName: 'Apex Electrical Contractors', employmentType: 'Apprentice', workEmail: 'henry.wright@example.com' },
      { employeeId: 'EMP-124', firstName: 'Jacob', lastName: 'Scott', displayName: 'Jacob Scott', tradeRole: 'Apprentice', classification: '1st Year Apprentice', companyName: 'Apex Electrical Contractors', employmentType: 'Apprentice', workEmail: 'jacob.scott@example.com' },
      { employeeId: 'EMP-125', firstName: 'Daniel', lastName: 'Green', displayName: 'Daniel Green', tradeRole: 'Apprentice', classification: '3rd Year Apprentice', companyName: 'Apex Electrical Contractors', employmentType: 'Apprentice', workEmail: 'daniel.green@example.com' },

      // Data & Communications Cablers:
      { employeeId: 'EMP-126', firstName: 'Ryan', lastName: 'Adams', displayName: 'Ryan Adams', tradeRole: 'Data Tech', classification: 'Open Cabler Cat6A/Fibre', companyName: 'DataCore Cabling', employmentType: 'Subcontractor', workEmail: 'ryan.adams@example.com' },
      { employeeId: 'EMP-127', firstName: 'Michael', lastName: 'Baker', displayName: 'Michael Baker', tradeRole: 'Data Tech', classification: 'Open Cabler Cat6A/Fibre', companyName: 'DataCore Cabling', employmentType: 'Subcontractor', workEmail: 'michael.baker@example.com' },
      { employeeId: 'EMP-128', firstName: 'Samuel', lastName: 'Nelson', displayName: 'Samuel Nelson', tradeRole: 'Data Tech', classification: 'Structured Cabler', companyName: 'DataCore Cabling', employmentType: 'Subcontractor', workEmail: 'samuel.nelson@example.com' },
      { employeeId: 'EMP-129', firstName: 'David', lastName: 'Carter', displayName: 'David Carter', tradeRole: 'Data Tech', classification: 'Fibre Splicer Specialist', companyName: 'DataCore Cabling', employmentType: 'Subcontractor', workEmail: 'david.carter@example.com' },

      // Testers & QA:
      { employeeId: 'EMP-130', firstName: 'Matthew', lastName: 'Mitchell', displayName: 'Matthew Mitchell', tradeRole: 'Electrician', classification: 'Commissioning Tech', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'matthew.m@example.com' },
      { employeeId: 'EMP-131', firstName: 'Andrew', lastName: 'Perez', displayName: 'Andrew Perez', tradeRole: 'Electrician', classification: 'Instrumentation Tech', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'andrew.p@example.com' },
      { employeeId: 'EMP-132', firstName: 'Joseph', lastName: 'Roberts', displayName: 'Joseph Roberts', tradeRole: 'Electrician', classification: 'QA Megger Lead', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'joseph.r@example.com' },

      // Additional Electricians (Containment, Lighting, Temps):
      { employeeId: 'EMP-133', firstName: 'Anthony', lastName: 'Turner', displayName: 'Anthony Turner', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'anthony.t@example.com' },
      { employeeId: 'EMP-134', firstName: 'Joshua', lastName: 'Phillips', displayName: 'Joshua Phillips', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'joshua.p@example.com' },
      { employeeId: 'EMP-135', firstName: 'Christopher', lastName: 'Campbell', displayName: 'Christopher Campbell', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'chris.c@example.com' },
      { employeeId: 'EMP-136', firstName: 'Andrew', lastName: 'Parker', displayName: 'Andrew Parker', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'andrew.parker@example.com' },
      { employeeId: 'EMP-137', firstName: 'Cameron', lastName: 'Evans', displayName: 'Cameron Evans', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'cameron.e@example.com' },
      { employeeId: 'EMP-138', firstName: 'Dylan', lastName: 'Edwards', displayName: 'Dylan Edwards', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'dylan.e@example.com' },
      { employeeId: 'EMP-139', firstName: 'Connor', lastName: 'Collins', displayName: 'Connor Collins', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'connor.c@example.com' },
      { employeeId: 'EMP-140', firstName: 'Tyler', lastName: 'Stewart', displayName: 'Tyler Stewart', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'tyler.s@example.com' },

      // Logistics & Stores:
      { employeeId: 'EMP-141', firstName: 'Brandon', lastName: 'Morris', displayName: 'Brandon Morris', tradeRole: 'Logistics', classification: 'Forklift Operator CW2', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'brandon.m@example.com' },
      { employeeId: 'EMP-142', firstName: 'Justin', lastName: 'Rogers', displayName: 'Justin Rogers', tradeRole: 'Logistics', classification: 'Materials Controller', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'justin.r@example.com' },
      { employeeId: 'EMP-143', firstName: 'Austin', lastName: 'Reed', displayName: 'Austin Reed', tradeRole: 'Logistics', classification: 'Yard Hand CW1', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'austin.r@example.com' },

      // Additional 15 workers to exceed 60 workers:
      { employeeId: 'EMP-144', firstName: 'Lachlan', lastName: 'Cook', displayName: 'Lachlan Cook', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'lachlan.c@example.com' },
      { employeeId: 'EMP-145', firstName: 'Riley', lastName: 'Morgan', displayName: 'Riley Morgan', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'riley.m@example.com' },
      { employeeId: 'EMP-146', firstName: 'Harrison', lastName: 'Bell', displayName: 'Harrison Bell', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'harrison.b@example.com' },
      { employeeId: 'EMP-147', firstName: 'Cooper', lastName: 'Murphy', displayName: 'Cooper Murphy', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'cooper.m@example.com' },
      { employeeId: 'EMP-148', firstName: 'Patrick', lastName: 'Bailey', displayName: 'Patrick Bailey', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'patrick.b@example.com' },
      { employeeId: 'EMP-149', firstName: 'Caleb', lastName: 'Rivera', displayName: 'Caleb Rivera', tradeRole: 'Apprentice', classification: '2nd Year Apprentice', companyName: 'Apex Electrical Contractors', employmentType: 'Apprentice', workEmail: 'caleb.r@example.com' },
      { employeeId: 'EMP-150', firstName: 'Sean', lastName: 'Cooper', displayName: 'Sean Cooper', tradeRole: 'Apprentice', classification: '4th Year Apprentice', companyName: 'Apex Electrical Contractors', employmentType: 'Apprentice', workEmail: 'sean.c@example.com' },
      { employeeId: 'EMP-151', firstName: 'Mitchell', lastName: 'Richardson', displayName: 'Mitchell Richardson', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'mitchell.r@example.com' },
      { employeeId: 'EMP-152', firstName: 'Dominic', lastName: 'Cox', displayName: 'Dominic Cox', tradeRole: 'High Voltage Tech', classification: 'HV Level 1', companyName: 'Substation Specialists', employmentType: 'Subcontractor', workEmail: 'dominic.c@example.com' },
      { employeeId: 'EMP-153', firstName: 'Blake', lastName: 'Howard', displayName: 'Blake Howard', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'Apex Electrical Contractors', employmentType: 'Direct', workEmail: 'blake.h@example.com' },
      { employeeId: 'EMP-154', firstName: 'Adam', lastName: 'Ward', displayName: 'Adam Ward', tradeRole: 'Data Tech', classification: 'Cat6A Installer', companyName: 'DataCore Cabling', employmentType: 'Subcontractor', workEmail: 'adam.w@example.com' },
      { employeeId: 'EMP-155', firstName: 'Dean', lastName: 'Torres', displayName: 'Dean Torres', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'dean.t@example.com' },
      { employeeId: 'EMP-156', firstName: 'Toby', lastName: 'Peterson', displayName: 'Toby Peterson', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'toby.p@example.com' },
      { employeeId: 'EMP-157', firstName: 'Travis', lastName: 'Gray', displayName: 'Travis Gray', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'travis.g@example.com' },
      { employeeId: 'EMP-158', firstName: 'Kyle', lastName: 'Ramirez', displayName: 'Kyle Ramirez', tradeRole: 'Electrician', classification: 'A-Grade', companyName: 'PowerGrid Services', employmentType: 'Labour Hire', workEmail: 'kyle.r@example.com' },
    ];

    const insertedPeople = await db.insert(workforcePeople).values(rawPeople).returning();
    console.log(`Inserted ${insertedPeople.length} master workforce people.`);

    // 8. Assign Project Memberships
    // Most to Laverton (LAV01), plus Marcus Brody and Dave Miller to MEL02 as well
    const mel02 = allProjects.find((p) => p.code === 'MEL02');
    const mel02Id = mel02?.id || 1;

    const membershipsToInsert = insertedPeople.map((p) => ({
      personId: p.id,
      projectId: lavId,
      status: 'Active',
      notes: 'Assigned to Laverton Hyperscale delivery',
    }));

    // Add cross-project memberships for MEL02
    const marcus = insertedPeople.find((p) => p.employeeId === 'EMP-102');
    if (marcus && mel02Id) {
      membershipsToInsert.push({
        personId: marcus.id,
        projectId: mel02Id,
        status: 'Active',
        notes: 'Cross-assigned to MEL02 hyperscale fitout',
      });
    }

    const jordan = insertedPeople.find((p) => p.employeeId === 'EMP-101');
    if (jordan && mel02Id) {
      membershipsToInsert.push({
        personId: jordan.id,
        projectId: mel02Id,
        status: 'Active',
        notes: 'Organisational mobility across Melbourne data centres',
      });
    }

    await db.insert(workforceProjectMemberships).values(membershipsToInsert);

    // 9. Assign Crew Memberships
    const crewAlphaId = crewMap['Crew Alpha - Lighting Team'];
    const crewBetaId = crewMap['Crew Beta - Temporary Power'];
    const crewGammaId = crewMap['Crew Gamma - HV Substations'];
    const crewDeltaId = crewMap['Crew Delta - Containment & Trays'];
    const crewEpsilonId = crewMap['Crew Epsilon - QA & Megger Testers'];
    const crewLogId = crewMap['Crew Logistics - Material & Stores'];

    const crewMembersToInsert: { crewId: number; personId: number; roleInCrew: string }[] = [];
    insertedPeople.forEach((p, idx) => {
      let cId: number | null = null;
      if (idx % 6 === 0) cId = crewAlphaId;
      else if (idx % 6 === 1) cId = crewBetaId;
      else if (idx % 6 === 2) cId = crewGammaId;
      else if (idx % 6 === 3) cId = crewDeltaId;
      else if (idx % 6 === 4) cId = crewEpsilonId;
      else cId = crewLogId;

      if (cId) {
        crewMembersToInsert.push({
          crewId: cId,
          personId: p.id,
          roleInCrew: p.tradeRole === 'Supervisor' ? 'Supervisor' : p.tradeRole === 'Leading Hand' ? 'Leading Hand' : 'Member',
        });
      }
    });
    if (crewMembersToInsert.length > 0) {
      await db.insert(workforceCrewMembers).values(crewMembersToInsert);
    }

    // 10. Seed Realistic Qualifications
    // Qualification Type codes: 'ELEC-A', 'WHITE-CARD', 'CPR', 'LVR', 'FIRST-AID', 'EWP', 'WAH', 'CABLING', 'FORKLIFT'
    const qTypes = await db.select().from(workforceQualificationTypes);
    const typeIdMap = Object.fromEntries(qTypes.map((t) => [t.code, t.id]));

    const qualsToInsert: any[] = [];
    insertedPeople.forEach((p) => {
      // White Card for everyone (Valid)
      qualsToInsert.push({
        personId: p.id,
        typeId: typeIdMap['WHITE-CARD'],
        typeCode: 'WHITE-CARD',
        typeName: 'General Construction White Card',
        licenceNumber: `WC-${p.employeeId.replace('EMP-', '')}-VIC`,
        issuingAuthority: 'WorkSafe Victoria',
        jurisdiction: 'VIC',
        issueDate: '2023-01-15',
        noExpiry: true,
        verificationStatus: 'Verified',
        verifiedBy: 'sarah.jenkins@example.com',
        verifiedByName: 'Sarah Jenkins (QA)',
      });

      // Special worker scenarios for tests:
      if (p.employeeId === 'EMP-101') {
        // Jordan Smith: Valid Electrical, Valid CPR, Valid LVR, Valid EWP
        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['ELEC-A'],
          typeCode: 'ELEC-A',
          typeName: 'A-Grade Electrical Licence',
          licenceNumber: 'A-54912',
          issuingAuthority: 'Energy Safe Victoria',
          jurisdiction: 'VIC',
          issueDate: '2022-04-10',
          expiryDate: '2027-04-10',
          verificationStatus: 'Verified',
          verifiedBy: 'sarah.jenkins@example.com',
          verifiedByName: 'Sarah Jenkins (QA)',
        });
        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['CPR'],
          typeCode: 'CPR',
          typeName: 'CPR (HLTAID009)',
          licenceNumber: 'CPR-2026-991',
          issuingAuthority: 'St John Ambulance Australia',
          jurisdiction: 'VIC',
          issueDate: '2026-02-01',
          expiryDate: '2027-02-01',
          verificationStatus: 'Verified',
        });
        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['LVR'],
          typeCode: 'LVR',
          typeName: 'Low Voltage Rescue (UETDRMP007)',
          licenceNumber: 'LVR-2026-991',
          issuingAuthority: 'St John Ambulance Australia',
          jurisdiction: 'VIC',
          issueDate: '2026-02-01',
          expiryDate: '2027-02-01',
          verificationStatus: 'Verified',
        });
      } else if (p.employeeId === 'EMP-103') {
        // Elena Rostova (Worker C for Acceptance Test 47):
        // Electrical Licence: Valid
        // CPR: Expired (Expired on 2026-09-01)
        // LVR: Expires in 5 Days (e.g. 2026-10-17)
        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['ELEC-A'],
          typeCode: 'ELEC-A',
          typeName: 'A-Grade Electrical Licence',
          licenceNumber: 'A-88421',
          issuingAuthority: 'Energy Safe Victoria',
          jurisdiction: 'VIC',
          issueDate: '2023-01-10',
          expiryDate: '2028-01-10',
          verificationStatus: 'Verified',
        });
        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['CPR'],
          typeCode: 'CPR',
          typeName: 'CPR (HLTAID009)',
          licenceNumber: 'CPR-2025-103',
          issuingAuthority: 'Red Cross Australia',
          jurisdiction: 'VIC',
          issueDate: '2025-08-01',
          expiryDate: '2026-09-01', // EXPIRED!
          verificationStatus: 'Expired',
        });
        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['LVR'],
          typeCode: 'LVR',
          typeName: 'Low Voltage Rescue (UETDRMP007)',
          licenceNumber: 'LVR-2025-103',
          issuingAuthority: 'Red Cross Australia',
          jurisdiction: 'VIC',
          issueDate: '2025-10-17',
          expiryDate: '2026-10-17', // EXPIRES IN 5 DAYS!
          verificationStatus: 'Verified',
        });
      } else if (p.tradeRole === 'Electrician' || p.tradeRole === 'Supervisor' || p.tradeRole === 'Leading Hand' || p.tradeRole === 'High Voltage Tech') {
        // Realistic distribution
        const expYear = 2027 + (p.id % 3);
        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['ELEC-A'],
          typeCode: 'ELEC-A',
          typeName: 'A-Grade Electrical Licence',
          licenceNumber: `A-${30000 + p.id}`,
          issuingAuthority: 'Energy Safe Victoria',
          jurisdiction: 'VIC',
          issueDate: '2022-06-01',
          expiryDate: `${expYear}-06-01`,
          verificationStatus: p.id % 7 === 0 ? 'Pending Verification' : 'Verified',
        });

        // CPR: mostly valid, some expiring soon, some expired
        let cprExp = '2027-03-15';
        let cprStatus = 'Verified';
        if (p.id % 9 === 0) {
          cprExp = '2026-08-15'; // Expired
          cprStatus = 'Expired';
        } else if (p.id % 5 === 0) {
          cprExp = '2026-10-25'; // Expiring in 13 days
          cprStatus = 'Verified';
        } else if (p.id % 4 === 0) {
          cprExp = '2026-11-10'; // Expiring in 29 days
          cprStatus = 'Verified';
        }

        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['CPR'],
          typeCode: 'CPR',
          typeName: 'CPR (HLTAID009)',
          licenceNumber: `CPR-2026-${p.id}`,
          issuingAuthority: 'St John Ambulance Australia',
          jurisdiction: 'VIC',
          issueDate: '2025-10-01',
          expiryDate: cprExp,
          verificationStatus: cprStatus,
        });

        // LVR
        qualsToInsert.push({
          personId: p.id,
          typeId: typeIdMap['LVR'],
          typeCode: 'LVR',
          typeName: 'Low Voltage Rescue (UETDRMP007)',
          licenceNumber: `LVR-2026-${p.id}`,
          issuingAuthority: 'St John Ambulance Australia',
          jurisdiction: 'VIC',
          issueDate: '2025-10-01',
          expiryDate: cprExp,
          verificationStatus: cprStatus,
        });
      }
    });

    if (qualsToInsert.length > 0) {
      await db.insert(workforceQualifications).values(qualsToInsert);
      console.log(`Seeded ${qualsToInsert.length} qualification records.`);
    }

    // 11. Seed Initial Renewals Workflow records for expiring & expired
    const expiredOrExpiringQuals = await db.select().from(workforceQualifications);
    const renewalsToInsert: any[] = [];
    expiredOrExpiringQuals
      .filter((q) => q.expiryDate && q.expiryDate < '2026-11-15')
      .slice(0, 10)
      .forEach((q) => {
        renewalsToInsert.push({
          personId: q.personId,
          qualificationId: q.id,
          qualificationTypeCode: q.typeCode,
          qualificationTypeName: q.typeName,
          status: q.expiryDate! < '2026-10-12' ? 'Renewal Required' : 'Booked',
          trainingProvider: 'St John Ambulance Melbourne Central',
          bookingDate: '2026-10-20',
          bookingTime: '08:30',
          location: '55 Sturt Street, Southbank VIC',
          bookingReference: `STJ-${q.personId}-2026`,
          bookedBy: 'Sarah Jenkins (QA)',
          cost: '$180.00',
          notes: 'Annual refresher course booked via corporate account',
        });
      });

    if (renewalsToInsert.length > 0) {
      await db.insert(workforceRenewals).values(renewalsToInsert);
      console.log(`Seeded ${renewalsToInsert.length} renewal workflow entries.`);
    }

    // 12. Seed Today's Daily Allocations for Laverton (2026-10-12)
    // Allocate ~45 workers across LA1, LA2, LA3 workstreams; leave ~15 unallocated
    const today = '2026-10-12';
    const allocationsToInsert: any[] = [];

    // Jordan Smith allocated 07:00-15:00 on LAV01 LA1 Lighting (For Acceptance Test 45)
    if (jordan) {
      allocationsToInsert.push({
        personId: jordan.id,
        projectId: lavId,
        date: today,
        shift: 'Day Shift',
        startTime: '07:00',
        endTime: '15:00',
        zoneId: zoneMap['LA1'],
        workstreamId: streamMap['LGT'],
        crewId: crewAlphaId,
        supervisorName: 'Mark Callahan',
        status: 'Published',
        notes: 'Lead installation on Level 1 lighting containment',
      });
    }

    // Allocate others across zones & workstreams
    const workersToAllocate = insertedPeople.filter((p) => p.employeeId !== 'EMP-101' && p.employeeId !== 'EMP-102' && p.employeeId !== 'EMP-103').slice(0, 44);

    workersToAllocate.forEach((w, i) => {
      let zCode = 'LA1';
      let sCode = 'LGT';
      let cId = crewAlphaId;

      if (i < 8) {
        zCode = 'LA1'; sCode = 'LGT'; cId = crewAlphaId;
      } else if (i < 16) {
        zCode = 'LA1'; sCode = 'PWR'; cId = crewBetaId;
      } else if (i < 24) {
        zCode = 'LA1'; sCode = 'HV'; cId = crewGammaId;
      } else if (i < 32) {
        zCode = 'LA2'; sCode = 'DH-FIT'; cId = crewDeltaId;
      } else if (i < 38) {
        zCode = 'LA2'; sCode = 'SWBD'; cId = crewEpsilonId;
      } else {
        zCode = 'LA3'; sCode = 'LOG'; cId = crewLogId;
      }

      allocationsToInsert.push({
        personId: w.id,
        projectId: lavId,
        date: today,
        shift: 'Day Shift',
        startTime: '07:00',
        endTime: '15:30',
        zoneId: zoneMap[zCode],
        workstreamId: streamMap[sCode],
        crewId: cId,
        supervisorName: 'Mark Callahan',
        status: 'Published',
      });
    });

    // Also allocate Marcus Brody on MEL02 Demo (07:00-15:00) for cross-project test (Acceptance Test 46)
    if (marcus && mel02Id) {
      // Find a MEL02 zone
      let [melZone] = await db.select().from(workforceZones).where(eq(workforceZones.projectId, mel02Id));
      if (!melZone) {
        const [createdMelZone] = await db.insert(workforceZones).values({
          projectId: mel02Id,
          code: 'MZ1',
          name: 'MEL02 Data Hall Stage 2',
        }).returning();
        melZone = createdMelZone;
      }
      let [melStream] = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.projectId, mel02Id));
      if (!melStream) {
        const [createdMelStream] = await db.insert(workforceWorkstreams).values({
          projectId: mel02Id,
          code: 'FIT',
          name: 'Stage 2 Electrical Fitout',
        }).returning();
        melStream = createdMelStream;
      }

      allocationsToInsert.push({
        personId: marcus.id,
        projectId: mel02Id,
        date: today,
        shift: 'Day Shift',
        startTime: '07:00',
        endTime: '15:00',
        zoneId: melZone.id,
        workstreamId: melStream.id,
        status: 'Published',
        notes: 'MEL02 Switchboard feeder installation',
      });
    }

    if (allocationsToInsert.length > 0) {
      await db.insert(workforceAllocations).values(allocationsToInsert);
      console.log(`Seeded ${allocationsToInsert.length} initial allocations for ${today}.`);
    }

    // Set day state for today on Laverton
    await db.insert(workforceDayStates).values({
      projectId: lavId,
      date: today,
      status: 'Published',
      publishedBy: 'mark.callahan@example.com',
      publishedAt: new Date(),
    }).onConflictDoNothing();
  }

  // 13. Scale test assurance: Ensure at least 110 fictional workers and 100 daily allocations
  const currentTotalPeople = await db.select().from(workforcePeople);
  if (currentTotalPeople.length < 110) {
    console.log(`Current workers (${currentTotalPeople.length}) < 110. Seeding additional scale workers...`);
    const additionalWorkers: any[] = [];
    const roles = [
      { role: 'Electrician', class: 'A-Grade', company: 'Apex Electrical Contractors', type: 'Direct' },
      { role: 'Apprentice', class: '3rd Year Apprentice', company: 'Apex Electrical Contractors', type: 'Apprentice' },
      { role: 'Electrician', class: 'A-Grade', company: 'PowerGrid Services', type: 'Labour Hire' },
      { role: 'Leading Hand', class: 'CW4 Leading Hand', company: 'Apex Electrical Contractors', type: 'Direct' },
      { role: 'High Voltage Tech', class: 'HV Specialist', company: 'Substation Specialists', type: 'Subcontractor' },
      { role: 'Data Tech', class: 'Open Cabler Cat6A', company: 'DataCore Cabling', type: 'Subcontractor' },
      { role: 'Logistics', class: 'Forklift Operator', company: 'Apex Electrical Contractors', type: 'Direct' },
    ];
    const firstNames = ['Liam', 'Noah', 'Oliver', 'Elijah', 'James', 'William', 'Benjamin', 'Lucas', 'Henry', 'Theodore', 'Jack', 'Levi', 'Alexander', 'Jackson', 'Mateo', 'Daniel', 'Michael', 'Mason', 'Sebastian', 'Ethan', 'Logan', 'Owen', 'Samuel', 'Jacob', 'Asher', 'Aiden', 'John', 'Joseph', 'Wyatt', 'David', 'Leo', 'Luke', 'Julian', 'Hudson', 'Grayson', 'Matthew', 'Ezra', 'Gabriel', 'Carter', 'Isaac', 'Jayden', 'Luca', 'Anthony', 'Dylan', 'Lincoln', 'Thomas', 'Maverick', 'Elias', 'Josiah', 'Charles', 'Caleb', 'Christopher', 'Ezekiel', 'Miles', 'Jaxon', 'Isaiah', 'Andrew', 'Joshua', 'Nathan', 'Nolan'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts'];

    const needed = 115 - currentTotalPeople.length;
    const startNum = 160;
    for (let i = 0; i < needed; i++) {
      const fn = firstNames[(i + 7) % firstNames.length];
      const ln = lastNames[(i + 13) % lastNames.length];
      const r = roles[i % roles.length];
      additionalWorkers.push({
        employeeId: `EMP-${startNum + i}`,
        firstName: fn,
        lastName: ln,
        displayName: `${fn} ${ln}`,
        tradeRole: r.role,
        classification: r.class,
        companyName: r.company,
        employmentType: r.type,
        workEmail: `${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
        employmentStatus: 'Active',
        startDate: '2026-01-15',
      });
    }

    const insertedAdditional = await db.insert(workforcePeople).values(additionalWorkers).returning();
    console.log(`Inserted ${insertedAdditional.length} additional scale workers.`);

    // Memberships for additional
    const newMemberships = insertedAdditional.map((p) => ({
      personId: p.id,
      projectId: lavId,
      status: 'Active',
      notes: 'Laverton scale delivery',
    }));
    await db.insert(workforceProjectMemberships).values(newMemberships);

    // Crew assignments
    const allCrews = await db.select().from(workforceCrews).where(eq(workforceCrews.projectId, lavId));
    if (allCrews.length > 0) {
      const newCrewMembers = insertedAdditional.map((p, idx) => ({
        crewId: allCrews[idx % allCrews.length].id,
        personId: p.id,
        roleInCrew: p.tradeRole === 'Leading Hand' ? 'Leading Hand' : 'Member',
      }));
      await db.insert(workforceCrewMembers).values(newCrewMembers);
    }

    // Qualifications for additional workers
    const qTypes = await db.select().from(workforceQualificationTypes);
    const typeIdMap = Object.fromEntries(qTypes.map((t) => [t.code, t.id]));
    const additionalQuals: any[] = [];
    insertedAdditional.forEach((p, idx) => {
      // White Card
      additionalQuals.push({
        personId: p.id,
        typeId: typeIdMap['WHITE-CARD'],
        typeCode: 'WHITE-CARD',
        typeName: 'General Construction White Card',
        licenceNumber: `WC-${p.employeeId.replace('EMP-', '')}-VIC`,
        issuingAuthority: 'WorkSafe Victoria',
        jurisdiction: 'VIC',
        issueDate: '2024-02-10',
        noExpiry: true,
        verificationStatus: 'Verified',
        verifiedBy: 'sarah.jenkins@example.com',
      });

      // Electrical / Trade Licence
      if (p.tradeRole === 'Electrician' || p.tradeRole === 'Leading Hand' || p.tradeRole === 'Supervisor') {
        const isExpiring = idx % 5 === 0;
        const isExpired = idx % 7 === 0;
        const expDate = isExpired ? '2026-09-15' : isExpiring ? '2026-10-25' : '2028-06-30';
        additionalQuals.push({
          personId: p.id,
          typeId: typeIdMap['ELEC-A'],
          typeCode: 'ELEC-A',
          typeName: 'A-Grade Electrical Licence',
          licenceNumber: `A-9${p.id}3`,
          issuingAuthority: 'Energy Safe Victoria',
          jurisdiction: 'VIC',
          issueDate: '2023-05-01',
          expiryDate: expDate,
          verificationStatus: isExpired ? 'Expired' : 'Verified',
        });
        // CPR
        additionalQuals.push({
          personId: p.id,
          typeId: typeIdMap['CPR'],
          typeCode: 'CPR',
          typeName: 'CPR (HLTAID009)',
          licenceNumber: `CPR-2026-${p.id}`,
          issuingAuthority: 'St John Ambulance Australia',
          jurisdiction: 'VIC',
          issueDate: '2025-11-01',
          expiryDate: isExpired ? '2026-09-20' : '2026-11-01',
          verificationStatus: isExpired ? 'Expired' : 'Verified',
        });
      }
    });

    if (additionalQuals.length > 0) {
      await db.insert(workforceQualifications).values(additionalQuals);
    }
  }

  // Ensure allocations on 2026-10-12 reach >= 100 workers for scale test
  const scaleDate = '2026-10-12';
  const existingAllocationsToday = await db
    .select()
    .from(workforceAllocations)
    .where(and(eq(workforceAllocations.projectId, lavId), eq(workforceAllocations.date, scaleDate)));

  if (existingAllocationsToday.length < 100) {
    console.log(`Current allocations on ${scaleDate} (${existingAllocationsToday.length}) < 100. Adding scale allocations...`);
    const allLavMembers = await db
      .select({ person: workforcePeople })
      .from(workforceProjectMemberships)
      .innerJoin(workforcePeople, eq(workforceProjectMemberships.personId, workforcePeople.id))
      .where(eq(workforceProjectMemberships.projectId, lavId));

    const alreadyAllocatedIds = new Set(existingAllocationsToday.map((a) => a.personId));
    const availableToAllocate = allLavMembers.filter((m) => !alreadyAllocatedIds.has(m.person.id));

    const allZones = await db.select().from(workforceZones).where(eq(workforceZones.projectId, lavId));
    const allStreams = await db.select().from(workforceWorkstreams).where(eq(workforceWorkstreams.projectId, lavId));
    const allCrews = await db.select().from(workforceCrews).where(eq(workforceCrews.projectId, lavId));

    const neededAllocs = 104 - existingAllocationsToday.length;
    const toInsertAllocations: any[] = [];

    availableToAllocate.slice(0, neededAllocs).forEach((w, idx) => {
      const z = allZones[idx % allZones.length];
      const s = allStreams.filter((str) => str.zoneId === z.id)[0] || allStreams[idx % allStreams.length];
      const c = allCrews[idx % allCrews.length];

      toInsertAllocations.push({
        personId: w.person.id,
        projectId: lavId,
        date: scaleDate,
        shift: 'Day Shift',
        startTime: '07:00',
        endTime: '15:30',
        zoneId: z.id,
        workstreamId: s.id,
        crewId: c ? c.id : null,
        supervisorName: 'Mark Callahan',
        status: 'Published',
        notes: `Scale allocation ${idx + 1}`,
      });
    });

    if (toInsertAllocations.length > 0) {
      await db.insert(workforceAllocations).values(toInsertAllocations);
      console.log(`Inserted ${toInsertAllocations.length} scale allocations. Total today: ${existingAllocationsToday.length + toInsertAllocations.length}`);
    }
  }

  console.log('Workforce data verification & seeding complete.');
}
