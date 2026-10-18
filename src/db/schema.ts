import { relations } from 'drizzle-orm';
import { boolean, doublePrecision, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  status: text('status').default('Active').notNull(),
  clientName: text('client_name'),
  location: text('location'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  parentId: integer('parent_id'),
  name: text('name').notNull(),
  code: text('code').notNull(),
  type: text('type').notNull(), // Project, Building, Level, Zone, Room, Area
  path: text('path').notNull(),
  sequence: integer('sequence').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_locations_project_id').on(table.projectId),
  index('idx_locations_parent_id').on(table.parentId),
]);

export const equipment = pgTable('equipment', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  locationId: integer('location_id')
    .references(() => locations.id)
    .notNull(),
  equipmentCode: text('equipment_code').notNull(),
  equipmentName: text('equipment_name').notNull(),
  equipmentType: text('equipment_type').notNull(),
  system: text('system').notNull(),
  manufacturer: text('manufacturer'),
  model: text('model'),
  serialNumber: text('serial_number'),
  responsibleCompany: text('responsible_company').notNull(),
  status: text('status').default('Installed').notNull(),
  description: text('description'),
  qrCode: text('qr_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_equipment_project_id').on(table.projectId),
  index('idx_equipment_code').on(table.equipmentCode),
  index('idx_equipment_location_id').on(table.locationId),
]);

export const cables = pgTable('cables', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  cableId: text('cable_id').notNull(),
  fromEquipmentId: integer('from_equipment_id').references(() => equipment.id),
  fromEquipmentCode: text('from_equipment_code').notNull(),
  toEquipmentId: integer('to_equipment_id').references(() => equipment.id),
  toEquipmentCode: text('to_equipment_code').notNull(),
  locationId: integer('location_id').references(() => locations.id),
  system: text('system').notNull(),
  cableType: text('cable_type').notNull(),
  cableSize: text('cable_size').notNull(),
  coreCount: integer('core_count').default(4).notNull(),
  length: doublePrecision('length'),
  responsibleCompany: text('responsible_company').notNull(),
  installationStatus: text('installation_status').default('Not Installed').notNull(),
  terminationStatus: text('termination_status').default('Not Terminated').notNull(),
  testingStatus: text('testing_status').default('Not Tested').notNull(),
  qaStatus: text('qa_status').default('Not Started').notNull(),
  installationDate: text('installation_date'),
  testDate: text('test_date'),
  comments: text('comments'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_cables_project_id').on(table.projectId),
  index('idx_cables_cable_id').on(table.cableId),
  index('idx_cables_location_id').on(table.locationId),
  index('idx_cables_from_eq').on(table.fromEquipmentId),
  index('idx_cables_to_eq').on(table.toEquipmentId),
  index('idx_cables_qa_status').on(table.qaStatus),
  index('idx_cables_install_status').on(table.installationStatus),
  index('idx_cables_testing_status').on(table.testingStatus),
]);

export const itrTemplates = pgTable('itr_templates', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  code: text('code').notNull(),
  title: text('title').notNull(),
  discipline: text('discipline').notNull(),
  targetType: text('target_type').default('Cable').notNull(), // Cable, Equipment, Location, General
  description: text('description'),
  version: integer('version').default(1).notNull(),
  status: text('status').default('Active').notNull(),
  schemaDefinition: text('schema_definition').notNull(), // JSON
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_itr_templates_project_id').on(table.projectId),
  index('idx_itr_templates_code').on(table.code),
]);

export const itrInstances = pgTable('itr_instances', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  itrNumber: text('itr_number').notNull(),
  templateId: integer('template_id')
    .references(() => itrTemplates.id)
    .notNull(),
  templateTitle: text('template_title').notNull(),
  targetType: text('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  targetCode: text('target_code').notNull(),
  status: text('status').default('Draft').notNull(), // Draft, In Progress, Submitted, Under Review, Approved, Rejected
  autoPopulatedData: text('auto_populated_data').notNull(), // JSON
  formData: text('formData').notNull(), // JSON
  assignedTo: text('assigned_to'),
  assignedCompany: text('assigned_company'),
  submittedBy: text('submitted_by'),
  submittedByName: text('submitted_by_name'),
  submittedAt: timestamp('submitted_at'),
  reviewedBy: text('reviewed_by'),
  reviewedByName: text('reviewed_by_name'),
  reviewedAt: timestamp('reviewed_at'),
  approvalNotes: text('approval_notes'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_itr_instances_project_id').on(table.projectId),
  index('idx_itr_instances_status').on(table.status),
  index('idx_itr_instances_target').on(table.targetType, table.targetId),
  index('idx_itr_instances_target_code').on(table.targetCode),
]);

export const testReadings = pgTable('test_readings', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  itrInstanceId: integer('itr_instance_id').references(() => itrInstances.id),
  cableId: integer('cable_id').references(() => cables.id),
  equipmentId: integer('equipment_id').references(() => equipment.id),
  testType: text('test_type').notNull(), // IR, Continuity, Hi-Pot, Earth Bond
  phase: text('phase').notNull(), // L1-E, L2-E, L3-E, N-E, L1-L2, etc.
  reading: doublePrecision('reading').notNull(),
  unit: text('unit').notNull(), // MΩ, Ω, kV, V
  testVoltage: text('test_voltage'),
  result: text('result').notNull(), // PASS, FAIL, N/A
  testedBy: text('tested_by').notNull(),
  testDate: text('test_date').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_test_readings_project_id').on(table.projectId),
  index('idx_test_readings_cable_id').on(table.cableId),
  index('idx_test_readings_equipment_id').on(table.equipmentId),
]);

export const issues = pgTable('issues', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  issueNumber: text('issue_number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  priority: text('priority').default('Medium').notNull(), // Low, Medium, High, Critical
  status: text('status').default('Open').notNull(), // Open, In Progress, Resolved, Closed
  locationId: integer('location_id').references(() => locations.id),
  equipmentId: integer('equipment_id').references(() => equipment.id),
  cableId: integer('cable_id').references(() => cables.id),
  itrInstanceId: integer('itr_instance_id').references(() => itrInstances.id),
  assignedPerson: text('assigned_person'),
  assignedCompany: text('assigned_company'),
  raisedBy: text('raised_by').notNull(),
  raisedByName: text('raised_by_name').notNull(),
  dueDate: text('due_date'),
  photoUrl: text('photo_url'),
  comments: text('comments'), // JSON array
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_issues_project_id').on(table.projectId),
  index('idx_issues_status').on(table.status),
]);

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  role: text('role').notNull(),
  contactEmail: text('contact_email'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: text('role').default('Supervisor').notNull(), // Administrator, Project Manager, QA Manager, Supervisor, Leading Hand, Tradesperson, Consultant, Client, Viewer
  companyId: integer('company_id').references(() => companies.id),
  companyName: text('company_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  entityType: text('entity_type').notNull(), // Cable, Equipment, ITR, Location, Issue, Template
  entityId: integer('entity_id').notNull(),
  entityCode: text('entity_code').notNull(),
  action: text('action').notNull(), // Create, Update, Submit, Approve, Reject, Bulk Generate, Import
  performedBy: text('performed_by').notNull(),
  performedByName: text('performed_by_name').notNull(),
  performedByRole: text('performed_by_role').notNull(),
  details: text('details'), // JSON string
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_audit_logs_project_id').on(table.projectId),
  index('idx_audit_logs_entity').on(table.entityType, table.entityId),
]);

export const projectMembers = pgTable('project_members', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  userUid: text('user_uid').notNull(),
  role: text('role').notNull(), // Administrator, Project Manager, QA Manager, Supervisor, Leading Hand, Tradesperson, Client, Viewer
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_project_members_project_id').on(table.projectId),
  index('idx_project_members_user_uid').on(table.userUid),
]);

export const drawings = pgTable('drawings', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  drawingNumber: text('drawing_number').notNull(),
  title: text('title').notNull(),
  discipline: text('discipline').notNull(), // Electrical, Architectural, Mechanical, Containment, Security, Fire
  revision: text('revision').default('Rev A').notNull(),
  status: text('status').default('Issued for Construction').notNull(), // Issued for Construction, As-Built, For Review, Superseded
  scale: text('scale').default('1:100'),
  locationId: integer('location_id').references(() => locations.id),
  levelName: text('level_name'),
  fileUrl: text('file_url'),
  svgData: text('svg_data'), // Vector data for blueprint & CAD layers
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_drawings_project_id').on(table.projectId),
  index('idx_drawings_number').on(table.drawingNumber),
  index('idx_drawings_location_id').on(table.locationId),
]);

export const spatialPins = pgTable('spatial_pins', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  drawingId: integer('drawing_id')
    .references(() => drawings.id)
    .notNull(),
  locationId: integer('location_id').references(() => locations.id),
  x: doublePrecision('x').notNull(), // Percentage 0 - 100
  y: doublePrecision('y').notNull(), // Percentage 0 - 100
  entityType: text('entity_type').notNull(), // Equipment, Cable, ITR, Issue
  entityId: integer('entity_id').notNull(),
  entityCode: text('entity_code').notNull(),
  title: text('title').notNull(),
  status: text('status').default('Pending').notNull(), // Approved, In Progress, Defect, Installed, Pending
  color: text('color'),
  notes: text('notes'),
  createdById: text('created_by_id'),
  createdByName: text('created_by_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_spatial_pins_project_id').on(table.projectId),
  index('idx_spatial_pins_drawing_id').on(table.drawingId),
  index('idx_spatial_pins_entity').on(table.entityType, table.entityId),
]);

export const photoEvidence = pgTable('photo_evidence', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  title: text('title').notNull(),
  caption: text('caption'),
  category: text('category').notNull(), // Pre-pour, Containment, Cable Pull, Termination, Torque Seal, Megger / Testing, Defect, Rectification, General
  photoUrl: text('photo_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  takenBy: text('taken_by').notNull(),
  takenByName: text('taken_by_name').notNull(),
  takenAt: timestamp('taken_at').defaultNow().notNull(),
  entityType: text('entity_type'), // Cable, Equipment, ITR, Issue, Drawing, General
  entityId: integer('entity_id'),
  entityCode: text('entity_code'),
  locationId: integer('location_id').references(() => locations.id),
  spatialPinId: integer('spatial_pin_id').references(() => spatialPins.id),
  gpsCoords: text('gps_coords'),
  qaVerified: text('qa_verified').default('false'),
  metadata: text('metadata'), // JSON string with EXIF, tags, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_photo_evidence_project_id').on(table.projectId),
  index('idx_photo_evidence_entity').on(table.entityType, table.entityId),
  index('idx_photo_evidence_category').on(table.category),
]);

// Relationships
export const projectsRelations = relations(projects, ({ many }) => ({
  locations: many(locations),
  equipment: many(equipment),
  cables: many(cables),
  itrTemplates: many(itrTemplates),
  itrInstances: many(itrInstances),
  issues: many(issues),
  companies: many(companies),
  auditLogs: many(auditLogs),
  projectMembers: many(projectMembers),
  drawings: many(drawings),
  spatialPins: many(spatialPins),
  photoEvidence: many(photoEvidence),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  project: one(projects, { fields: [locations.projectId], references: [projects.id] }),
  parent: one(locations, { fields: [locations.parentId], references: [locations.id] }),
  equipment: many(equipment),
  cables: many(cables),
  issues: many(issues),
  drawings: many(drawings),
}));

export const equipmentRelations = relations(equipment, ({ one, many }) => ({
  project: one(projects, { fields: [equipment.projectId], references: [projects.id] }),
  location: one(locations, { fields: [equipment.locationId], references: [locations.id] }),
  cablesFrom: many(cables, { relationName: 'fromEquipment' }),
  cablesTo: many(cables, { relationName: 'toEquipment' }),
  issues: many(issues),
  testReadings: many(testReadings),
}));

export const cablesRelations = relations(cables, ({ one, many }) => ({
  project: one(projects, { fields: [cables.projectId], references: [projects.id] }),
  fromEquipment: one(equipment, { fields: [cables.fromEquipmentId], references: [equipment.id], relationName: 'fromEquipment' }),
  toEquipment: one(equipment, { fields: [cables.toEquipmentId], references: [equipment.id], relationName: 'toEquipment' }),
  location: one(locations, { fields: [cables.locationId], references: [locations.id] }),
  testReadings: many(testReadings),
  issues: many(issues),
}));

export const itrInstancesRelations = relations(itrInstances, ({ one, many }) => ({
  project: one(projects, { fields: [itrInstances.projectId], references: [projects.id] }),
  template: one(itrTemplates, { fields: [itrInstances.templateId], references: [itrTemplates.id] }),
  testReadings: many(testReadings),
  issues: many(issues),
}));

export const drawingsRelations = relations(drawings, ({ one, many }) => ({
  project: one(projects, { fields: [drawings.projectId], references: [projects.id] }),
  location: one(locations, { fields: [drawings.locationId], references: [locations.id] }),
  spatialPins: many(spatialPins),
}));

export const spatialPinsRelations = relations(spatialPins, ({ one }) => ({
  project: one(projects, { fields: [spatialPins.projectId], references: [projects.id] }),
  drawing: one(drawings, { fields: [spatialPins.drawingId], references: [drawings.id] }),
  location: one(locations, { fields: [spatialPins.locationId], references: [locations.id] }),
}));

export const photoEvidenceRelations = relations(photoEvidence, ({ one }) => ({
  project: one(projects, { fields: [photoEvidence.projectId], references: [projects.id] }),
  location: one(locations, { fields: [photoEvidence.locationId], references: [locations.id] }),
  spatialPin: one(spatialPins, { fields: [photoEvidence.spatialPinId], references: [spatialPins.id] }),
}));

// ==========================================
// WORKFORCE MANAGEMENT SCHEMA
// ==========================================

export const workforcePeople = pgTable('workforce_people', {
  id: serial('id').primaryKey(),
  employeeId: text('employee_id').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  displayName: text('display_name').notNull(),
  companyId: integer('company_id').references(() => companies.id),
  companyName: text('company_name').notNull(),
  employmentType: text('employment_type').notNull().default('Direct'), // Direct, Subcontractor, Labour Hire, Apprentice
  tradeRole: text('trade_role').notNull(), // Electrician, Apprentice, Leading Hand, Supervisor, Instrumentation Tech, High Voltage Tech, Data Tech, Logistics/Stores
  classification: text('classification'), // CW1, CW2, CW3, CW4, A-Grade, 1st Year, 2nd Year, 3rd Year, 4th Year
  phone: text('phone'),
  workEmail: text('work_email'),
  employmentStatus: text('employment_status').notNull().default('Active'), // Active, Inactive, On Leave, Offboarded, Pending Onboarding
  startDate: text('start_date'),
  endDate: text('end_date'),
  defaultCrewId: integer('default_crew_id'),
  defaultSupervisorName: text('default_supervisor_name'),
  userId: text('user_id'), // Linked MAXIM FORGE user account UID if applicable
  profilePhoto: text('profile_photo'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_workforce_people_emp_id').on(table.employeeId),
  index('idx_workforce_people_trade_role').on(table.tradeRole),
  index('idx_workforce_people_status').on(table.employmentStatus),
  index('idx_workforce_people_company').on(table.companyName),
]);

export const workforceProjectMemberships = pgTable('workforce_project_memberships', {
  id: serial('id').primaryKey(),
  personId: integer('person_id')
    .references(() => workforcePeople.id)
    .notNull(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  status: text('status').default('Active').notNull(), // Active, Inactive, Temporary
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  notes: text('notes'),
}, (table) => [
  index('idx_wf_proj_member_person').on(table.personId),
  index('idx_wf_proj_member_project').on(table.projectId),
]);

export const workforceZones = pgTable('workforce_zones', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  locationId: integer('location_id').references(() => locations.id), // Optional linked MAXIM FORGE project Location
  code: text('code').notNull(), // e.g. LA1, LA2, LA3, Level 01
  name: text('name').notNull(),
  description: text('description'),
  sequence: integer('sequence').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_wf_zones_project').on(table.projectId),
  index('idx_wf_zones_location').on(table.locationId),
]);

export const workforceWorkstreams = pgTable('workforce_workstreams', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  zoneId: integer('zone_id').references(() => workforceZones.id),
  locationId: integer('location_id').references(() => locations.id),
  code: text('code').notNull(), // e.g. LGT, HV, PWR, DATA
  name: text('name').notNull(), // Lighting, Temporary Power, HV, Containment, Testing, Commissioning, Logistics
  description: text('description'),
  defaultSupervisor: text('default_supervisor'),
  defaultCrewId: integer('default_crew_id'),
  color: text('color').default('#f59e0b').notNull(),
  sequence: integer('sequence').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_wf_workstreams_project').on(table.projectId),
  index('idx_wf_workstreams_zone').on(table.zoneId),
]);

export const workforceCrews = pgTable('workforce_crews', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  name: text('name').notNull(), // Crew A, HV Substation Team
  supervisorId: integer('supervisor_id').references(() => workforcePeople.id),
  supervisorName: text('supervisor_name'),
  defaultWorkstreamId: integer('default_workstream_id').references(() => workforceWorkstreams.id),
  color: text('color').default('#3b82f6').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_wf_crews_project').on(table.projectId),
]);

export const workforceCrewMembers = pgTable('workforce_crew_members', {
  id: serial('id').primaryKey(),
  crewId: integer('crew_id')
    .references(() => workforceCrews.id)
    .notNull(),
  personId: integer('person_id')
    .references(() => workforcePeople.id)
    .notNull(),
  roleInCrew: text('role_in_crew').default('Member').notNull(), // Supervisor, Leading Hand, Member, Apprentice
}, (table) => [
  index('idx_wf_crew_members_crew').on(table.crewId),
  index('idx_wf_crew_members_person').on(table.personId),
]);

export const workforceAllocations = pgTable('workforce_allocations', {
  id: serial('id').primaryKey(),
  personId: integer('person_id')
    .references(() => workforcePeople.id)
    .notNull(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  shift: text('shift').default('Day Shift').notNull(), // Day Shift, Back Shift, Night Shift, Custom Shift
  startTime: text('start_time').default('07:00').notNull(), // HH:MM
  endTime: text('end_time').default('15:30').notNull(), // HH:MM
  zoneId: integer('zone_id')
    .references(() => workforceZones.id)
    .notNull(),
  workstreamId: integer('workstream_id')
    .references(() => workforceWorkstreams.id)
    .notNull(),
  crewId: integer('crew_id').references(() => workforceCrews.id),
  supervisorName: text('supervisor_name'),
  status: text('status').default('Draft').notNull(), // Draft, Published, Changed, Cancelled
  isOverride: boolean('is_override').default(false).notNull(),
  overrideReason: text('override_reason'),
  overrideBy: text('override_by'),
  notes: text('notes'),
  // Actual labour tracking (separate from planned allocation, not timesheet/payroll)
  actualAttendance: text('actual_attendance'), // 'Present', 'Absent', 'Late', 'Transferred', 'Leave', 'Training'
  actualZoneId: integer('actual_zone_id').references(() => workforceZones.id),
  actualWorkstreamId: integer('actual_workstream_id').references(() => workforceWorkstreams.id),
  actualCrewId: integer('actual_crew_id').references(() => workforceCrews.id),
  actualStartTime: text('actual_start_time'),
  actualEndTime: text('actual_end_time'),
  actualHours: text('actual_hours'),
  actualNotes: text('actual_notes'),
  actualRecordedBy: text('actual_recorded_by'),
  actualRecordedAt: timestamp('actual_recorded_at'),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
}, (table) => [
  index('idx_wf_alloc_person_date').on(table.personId, table.date),
  index('idx_wf_alloc_project_date').on(table.projectId, table.date),
  index('idx_wf_alloc_zone').on(table.zoneId),
  index('idx_wf_alloc_workstream').on(table.workstreamId),
]);

export const workforceDayStates = pgTable('workforce_day_states', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .references(() => projects.id)
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  status: text('status').default('Draft').notNull(), // Draft, Published, Locked
  publishedAt: timestamp('published_at'),
  publishedBy: text('published_by'),
  lockedAt: timestamp('locked_at'),
  lockedBy: text('locked_by'),
  unlockReason: text('unlock_reason'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_wf_day_state_proj_date').on(table.projectId, table.date),
]);

export const workforceQualificationTypes = pgTable('workforce_qualification_types', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(), // e.g. ELEC-A, WHITE-CARD, CPR, LVR, EWP, WAH
  name: text('name').notNull(),
  category: text('category').notNull(), // Licence, High Risk, Safety / Rescue, Equipment, Technical
  defaultValidityMonths: integer('default_validity_months'), // null = No expiry
  requiresDocument: boolean('requires_document').default(true).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
});

export const workforceQualifications = pgTable('workforce_qualifications', {
  id: serial('id').primaryKey(),
  personId: integer('person_id')
    .references(() => workforcePeople.id)
    .notNull(),
  typeId: integer('type_id')
    .references(() => workforceQualificationTypes.id)
    .notNull(),
  typeCode: text('type_code').notNull(),
  typeName: text('type_name').notNull(),
  licenceNumber: text('licence_number').notNull(),
  issuingAuthority: text('issuing_authority').notNull(),
  jurisdiction: text('jurisdiction').default('VIC').notNull(),
  issueDate: text('issue_date').notNull(), // YYYY-MM-DD
  expiryDate: text('expiry_date'), // YYYY-MM-DD or null
  noExpiry: boolean('no_expiry').default(false).notNull(),
  documentFrontUrl: text('document_front_url'),
  documentBackUrl: text('document_back_url'),
  verificationStatus: text('verification_status').default('Pending Verification').notNull(), // Pending Verification, Verified, Rejected, Expired
  verifiedBy: text('verified_by'),
  verifiedByName: text('verified_by_name'),
  verifiedAt: timestamp('verified_at'),
  notes: text('notes'),
  version: integer('version').default(1).notNull(),
  previousRecordId: integer('previous_record_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_wf_quals_person').on(table.personId),
  index('idx_wf_quals_type').on(table.typeCode),
  index('idx_wf_quals_status').on(table.verificationStatus),
  index('idx_wf_quals_expiry').on(table.expiryDate),
]);

export const workforceRenewals = pgTable('workforce_renewals', {
  id: serial('id').primaryKey(),
  personId: integer('person_id')
    .references(() => workforcePeople.id)
    .notNull(),
  qualificationId: integer('qualification_id').references(() => workforceQualifications.id),
  qualificationTypeCode: text('qualification_type_code').notNull(),
  qualificationTypeName: text('qualification_type_name').notNull(),
  status: text('status').default('Booking Requested').notNull(), // Renewal Required, Booking Requested, Booked, Completed, Awaiting Evidence, Evidence Submitted, Verified, Renewed
  trainingProvider: text('training_provider'),
  bookingDate: text('booking_date'), // YYYY-MM-DD
  bookingTime: text('booking_time'),
  location: text('location'),
  bookingReference: text('booking_reference'),
  bookedBy: text('booked_by'),
  cost: text('cost'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_wf_renewals_person').on(table.personId),
  index('idx_wf_renewals_status').on(table.status),
]);

export const workforceRoleRequirements = pgTable('workforce_role_requirements', {
  id: serial('id').primaryKey(),
  tradeRole: text('trade_role').notNull(), // Electrician, Apprentice, etc.
  qualificationTypeCode: text('qualification_type_code').notNull(),
  isMandatory: boolean('is_mandatory').default(true).notNull(),
  projectId: integer('project_id').references(() => projects.id), // null = default
}, (table) => [
  index('idx_wf_role_req_trade').on(table.tradeRole),
]);

export const workforceTrainingProviders = pgTable('workforce_training_providers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  website: text('website'),
  bookingUrl: text('booking_url').notNull(),
  coursesOffered: text('courses_offered'), // Comma-separated or description of courses
  contactName: text('contact_name'),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workforceTrainingSessions = pgTable('workforce_training_sessions', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').references(() => projects.id),
  courseName: text('course_name').notNull(),
  qualificationTypeCode: text('qualification_type_code').notNull(),
  providerId: integer('provider_id').references(() => workforceTrainingProviders.id),
  providerName: text('provider_name').notNull(),
  bookingUrl: text('booking_url'),
  sessionDate: text('session_date').notNull(), // YYYY-MM-DD
  startTime: text('start_time').default('07:00').notNull(),
  endTime: text('end_time').default('11:00').notNull(),
  location: text('location').notNull(),
  bookingReference: text('booking_reference'),
  status: text('status').default('Booked').notNull(), // Needs Booking, Booking In Progress, Booked, Completed, Cancelled, Rescheduled
  notes: text('notes'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_wf_training_sess_date').on(table.sessionDate),
  index('idx_wf_training_sess_status').on(table.status),
]);

export const workforceTrainingAttendees = pgTable('workforce_training_attendees', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id').references(() => workforceTrainingSessions.id).notNull(),
  personId: integer('person_id').references(() => workforcePeople.id).notNull(),
  attendanceStatus: text('attendance_status').default('Scheduled').notNull(), // Scheduled, Attended, Did Not Attend, Cancelled, Completed
  certificateStatus: text('certificate_status').default('Awaiting Certificate').notNull(), // Awaiting Certificate, Evidence Submitted, Verified, Rejected
  evidenceUrl: text('evidence_url'),
  verifiedAt: timestamp('verified_at'),
  verifiedBy: text('verified_by'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_wf_training_att_sess').on(table.sessionId),
  index('idx_wf_training_att_person').on(table.personId),
]);


