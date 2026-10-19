export type JobPriority = 'Emergency' | 'High' | 'Medium' | 'Low';

export type JobStatus = 
  | 'New'
  | 'Scheduled'
  | 'In Progress'
  | 'On Hold'
  | 'Completed'
  | 'Invoiced';

export type WorkOrderType = 
  | 'Emergency Repair'
  | 'Preventative Maintenance'
  | 'Installation'
  | 'Safety Inspection'
  | 'Quoted Work'
  | 'Commissioning';

export interface JobChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface JobMaterialItem {
  id: string;
  name: string;
  partNumber?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface JobNote {
  id: string;
  author: string;
  timestamp: string;
  text: string;
  type?: 'general' | 'safety' | 'client' | 'parts';
}

export interface Job {
  id: string;
  jobCode: string;
  title: string;
  description: string;
  clientId: string;
  clientName: string;
  clientContact: string;
  clientPhone: string;
  clientEmail: string;
  siteAddress: string;
  siteCity: string;
  sitePostcode: string;
  priority: JobPriority;
  status: JobStatus;
  workOrderType: WorkOrderType;
  scheduledDate: string; // YYYY-MM-DD
  scheduledStartTime: string; // HH:mm
  scheduledEndTime: string; // HH:mm
  assignedTechIds: string[];
  estimatedHours: number;
  actualHours: number;
  estimatedCost: number;
  actualCost: number;
  quoteAmount: number;
  invoiceAmount?: number;
  checklist: JobChecklistItem[];
  materials: JobMaterialItem[];
  notes: JobNote[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Technician {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  trade: 'Electrical' | 'HVAC / Refrigeration' | 'Plumbing & Gas' | 'Fire Protection' | 'Instrumentation';
  status: 'Available' | 'On Job' | 'Off Duty';
  currentJobId?: string;
  currentJobCode?: string;
  avatar: string;
  hourlyRate: number;
  certifications: string[];
  vehicleId: string;
  completedJobsCount: number;
  rating: number;
}

export interface Client {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  suburb: string;
  industry: string;
  activeJobsCount: number;
  totalBilled: number;
  contractType: 'Commercial SLA' | 'Facility Maintenance' | 'Ad-Hoc Trade' | 'Residential VIP' | 'Priority Commercial';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  jobId: string;
  jobCode: string;
  clientName: string;
  subtotal: number;
  tax: number;
  total: number;
  issueDate: string;
  dueDate: string;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue';
  paidDate?: string;
}
