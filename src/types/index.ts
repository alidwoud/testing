export type UserRole =
  | 'Administrator'
  | 'Project Manager'
  | 'QA Manager'
  | 'Supervisor'
  | 'Leading Hand'
  | 'Tradesperson'
  | 'Consultant'
  | 'Client'
  | 'Viewer';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  companyName?: string;
  avatarUrl?: string;
  supervisor?: string;
}

export interface Project {
  id: number;
  code: string;
  name: string;
  description?: string;
  status: string;
  clientName?: string;
  location?: string;
  organisation?: string;
  client?: string;
  principalContractor?: string;
  timezone?: string;
  startDate?: string;
  expectedCompletionDate?: string;
  imageUrl?: string;
  isDemo?: boolean;
}

export interface CompanyOnboardingItem {
  name: string;
  type: string; // Principal Contractor, Electrical Contractor, Mechanical Contractor, Fire Contractor, Consultant, Client, Subcontractor, Other
  abn?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  status: 'Active' | 'Inactive';
}

export interface UserOnboardingItem {
  name: string;
  email: string;
  companyName: string;
  role: 'Administrator' | 'Project Manager' | 'QA Manager' | 'Supervisor' | 'Leading Hand' | 'Tradesperson' | 'Client' | 'Viewer';
  status: 'Pending / Not Invited';
}

export interface StagedDrawingItem {
  drawingNumber: string;
  title: string;
  revision: string;
  discipline: string;
  building?: string;
  levelName: string;
  status: string;
  fileUrl: string;
  fileName?: string;
  pageNumber?: number;
  pageCount?: number;
  hotspots?: any[];
}

export interface ItrTemplateOption {
  code: string;
  title: string;
  version: string;
  discipline: string;
  targetType: 'Cable' | 'Equipment' | 'Location';
  description: string;
  selected: boolean;
  matchingCount: number;
  proposedCount: number;
}

export interface ProjectOnboardingPayload {
  project: {
    code: string;
    name: string;
    organisation: string;
    client: string;
    principalContractor: string;
    clientName?: string;
    location?: string;
    status: string;
    timezone?: string;
    startDate?: string;
    expectedCompletionDate?: string;
    description?: string;
    imageUrl?: string;
  };
  locations?: Array<{
    code: string;
    name: string;
    type: 'Project' | 'Building' | 'Level' | 'Zone' | 'Room' | 'Area';
    parentCode?: string | null;
    sequence?: number;
  }>;
  equipment?: Array<{
    equipmentCode: string;
    equipmentName: string;
    equipmentType: string;
    locationCode: string;
    system: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    responsibleCompany?: string;
    status?: string;
    description?: string;
  }>;
  cables?: Array<{
    cableId: string;
    fromEquipmentCode: string;
    toEquipmentCode: string;
    locationCode?: string;
    system: string;
    cableType: string;
    cableSize: string;
    coreCount?: number;
    length?: number | null;
    responsibleCompany: string;
  }>;
  qa?: {
    selectedTemplateCodes: string[];
    generateItrsNow: boolean;
    configuredTemplatesOnly: boolean;
    totalProposedItrs: number;
  };
  drawings?: Array<{
    drawingNumber: string;
    title: string;
    revision: string;
    discipline: string;
    building?: string;
    levelName: string;
    status: string;
    fileUrl: string;
    pageNumber?: number;
    pageCount?: number;
    hotspots?: any[];
  }>;
  companies?: CompanyOnboardingItem[];
  users?: UserOnboardingItem[];
}

export interface ProjectReadinessData {
  project: Project;
  status: {
    details: 'COMPLETE' | 'PARTIAL' | 'EMPTY';
    locations: 'COMPLETE' | 'PARTIAL' | 'EMPTY';
    equipment: 'COMPLETE' | 'PARTIAL' | 'EMPTY';
    cables: 'COMPLETE' | 'PARTIAL' | 'EMPTY';
    qaTemplates: 'COMPLETE' | 'NOT CONFIGURED';
    itrs: {
      status: 'COMPLETE' | 'GENERATING' | 'NOT GENERATED';
      generatedCount: number;
      targetCount: number;
    };
    drawings: {
      status: 'COMPLETE' | 'PARTIAL' | 'EMPTY';
      configuredLevels: number;
      totalLevels: number;
    };
    companies: 'COMPLETE' | 'PARTIAL' | 'EMPTY';
    users: 'COMPLETE' | 'PARTIAL' | 'EMPTY';
  };
  counts: {
    levels: number;
    rooms: number;
    locationsTotal: number;
    equipment: number;
    cables: number;
    templates: number;
    itrs: number;
    drawings: number;
    companies: number;
    users: number;
  };
}

export interface LocationNode {
  id: number;
  projectId: number;
  parentId: number | null;
  name: string;
  code: string;
  type: string;
  path: string;
  sequence: number;
  children?: LocationNode[];
}

export interface EquipmentItem {
  id: number;
  projectId: number;
  locationId: number;
  locationName?: string;
  locationPath?: string;
  equipmentCode: string;
  equipmentName: string;
  equipmentType: string;
  system: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  responsibleCompany: string;
  status: string;
  description?: string;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CableItem {
  id: number;
  projectId: number;
  cableId: string;
  fromEquipmentId?: number | null;
  fromEquipmentCode: string;
  toEquipmentId?: number | null;
  toEquipmentCode: string;
  locationId?: number | null;
  locationName?: string;
  system: string;
  cableType: string;
  cableSize: string;
  coreCount: number;
  length?: number | null;
  responsibleCompany: string;
  installationStatus: 'Not Installed' | 'Installed' | 'Pulled / Installed';
  terminationStatus: 'Not Terminated' | 'Terminated' | 'Both Terminated';
  testingStatus: 'Not Tested' | 'In Progress' | 'Tested';
  qaStatus: 'Not Started' | 'Pending Review' | 'Approved' | 'Rejected';
  installationDate?: string;
  testDate?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItrTemplateField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'dropdown' | 'pass_fail' | 'pass_fail_na';
  required?: boolean;
  options?: string[];
  defaultValue?: string;
  readOnly?: boolean;
}

export interface ItrSpreadsheetColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'pass_fail';
  defaultValue?: string;
  readOnly?: boolean;
  required?: boolean;
}

export interface ItrSpreadsheetRow {
  phase: string;
  reading: string;
  unit: string;
  min_limit?: string;
  result: 'PASS' | 'FAIL' | 'N/A';
  [key: string]: any;
}

export interface ItrTemplateSection {
  id: string;
  title: string;
  type?: 'standard' | 'spreadsheet_table';
  fields?: ItrTemplateField[];
  columns?: ItrSpreadsheetColumn[];
  defaultRows?: ItrSpreadsheetRow[];
}

export interface ItrTemplate {
  id: number;
  projectId: number;
  code: string;
  title: string;
  discipline: string;
  targetType: 'Cable' | 'Equipment' | 'Location' | 'General';
  description?: string;
  version: number;
  status: 'Draft' | 'Active' | 'Archived';
  schemaDefinition: string | { sections: ItrTemplateSection[] };
  createdAt: string;
}

export interface ItrInstance {
  id: number;
  projectId: number;
  itrNumber: string;
  templateId: number;
  templateTitle: string;
  targetType: 'Cable' | 'Equipment' | 'Location' | 'General';
  targetId: number;
  targetCode: string;
  status: 'Draft' | 'In Progress' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';
  autoPopulatedData: string;
  formData: string;
  assignedTo?: string;
  assignedCompany?: string;
  submittedBy?: string;
  submittedByName?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  template?: ItrTemplate;
  history?: AuditLog[];
}

export interface TestReading {
  id: number;
  projectId: number;
  itrInstanceId?: number | null;
  cableId?: number | null;
  cableCode?: string;
  equipmentId?: number | null;
  equipmentCode?: string;
  testType: string;
  phase: string;
  reading: number;
  unit: string;
  testVoltage?: string;
  result: 'PASS' | 'FAIL' | 'N/A';
  testedBy: string;
  testDate: string;
  notes?: string;
  createdAt: string;
}

export interface IssueItem {
  id: number;
  projectId: number;
  issueNumber: string;
  title: string;
  description: string;
  category: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  locationId?: number | null;
  locationName?: string;
  equipmentId?: number | null;
  cableId?: number | null;
  itrInstanceId?: number | null;
  assignedPerson?: string;
  assignedCompany?: string;
  raisedBy: string;
  raisedByName: string;
  dueDate?: string;
  photoUrl?: string;
  comments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: number;
  projectId: number;
  entityType: string;
  entityId: number;
  entityCode: string;
  action: string;
  performedBy: string;
  performedByName: string;
  performedByRole: string;
  details?: string;
  createdAt: string;
}

export interface ProjectStats {
  cables: {
    total: number;
    installed: number;
    terminated: number;
    tested: number;
    qaApproved: number;
    installedPercent: number;
    testedPercent: number;
    qaApprovedPercent: number;
  };
  equipmentCount: number;
  openIssues: number;
  itrs: {
    total: number;
    draft: number;
    inProgress: number;
    submitted: number;
    approved: number;
    rejected: number;
  };
  drawingsCount?: number;
  pinsCount?: number;
  photosCount?: number;
}

export interface Drawing {
  id: number;
  projectId: number;
  drawingNumber: string;
  title: string;
  discipline: 'Electrical' | 'Architectural' | 'Mechanical' | 'Containment' | 'Security' | 'Fire';
  revision: string;
  status: 'Issued for Construction' | 'As-Built' | 'For Review' | 'Superseded';
  scale?: string;
  locationId?: number | null;
  locationName?: string;
  levelName?: string;
  fileUrl?: string;
  svgData?: string;
  pinCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SpatialPin {
  id: number;
  projectId: number;
  drawingId: number;
  drawingNumber?: string;
  locationId?: number | null;
  locationName?: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  entityType: 'Equipment' | 'Cable' | 'ITR' | 'Issue';
  entityId: number;
  entityCode: string;
  title: string;
  status: 'Approved' | 'In Progress' | 'Defect' | 'Installed' | 'Pending';
  color?: string;
  notes?: string;
  createdById?: string;
  createdByName?: string;
  createdAt: string;
}

export interface PhotoEvidence {
  id: number;
  projectId: number;
  title: string;
  caption?: string;
  category: 'Pre-pour' | 'Containment' | 'Cable Pull' | 'Termination' | 'Torque Seal' | 'Megger / Testing' | 'Defect' | 'Rectification' | 'General';
  photoUrl: string;
  thumbnailUrl?: string;
  takenBy: string;
  takenByName: string;
  takenAt: string;
  entityType?: 'Cable' | 'Equipment' | 'ITR' | 'Issue' | 'Drawing' | 'General';
  entityId?: number | null;
  entityCode?: string;
  locationId?: number | null;
  locationName?: string;
  spatialPinId?: number | null;
  gpsCoords?: string;
  qaVerified?: string;
  metadata?: string;
  createdAt: string;
}

export interface ProjectMember {
  id: number;
  projectId: number;
  userUid: string;
  role: UserRole;
  createdAt: string;
}

export interface HotspotPoint {
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
}

export interface RoomHotspotConfig {
  id: string;
  locationId: number;
  locationCode: string;
  locationName: string;
  // Normalized drawing coordinates (0 - 100 percentage)
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  points?: HotspotPoint[];
  color?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  detectionSource?: 'manual' | 'assisted_vector' | 'assisted_raster';
  confirmedAt?: string;
}

export interface DetectedRoomCandidate {
  id: string;
  rawText: string;
  extractedCode?: string;
  extractedName?: string;
  polygon: HotspotPoint[];
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceScore: number; // 0 - 100 percentage
  suggestedLocationId?: number | null;
  suggestedLocationCode?: string;
  suggestedLocationName?: string;
  matchType: 'EXACT_CODE' | 'EXACT_NAME' | 'FUZZY_NAME' | 'UNMATCHED';
  detectionMethod: 'vector_text' | 'vector_linework' | 'raster_contour';
  status: 'pending' | 'confirmed' | 'ignored';
  isTitleBlockOrLegend?: boolean;
  hasPreviousRevisionMatch?: boolean;
  previousRevisionCode?: string;
}

