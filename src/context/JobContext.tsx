import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Job,
  JobStatus,
  JobPriority,
  Technician,
  Client,
  Invoice,
  JobMaterialItem,
} from '../types/jobTypes.ts';
import {
  INITIAL_JOBS,
  INITIAL_TECHNICIANS,
  INITIAL_CLIENTS,
  INITIAL_INVOICES,
} from '../mock/jobData.ts';
import { message } from 'antd';

interface JobMetrics {
  totalJobs: number;
  activeJobs: number;
  inProgressCount: number;
  scheduledTodayCount: number;
  completedThisWeekCount: number;
  overdueEmergencyCount: number;
  totalQuotedValue: number;
  totalInvoicedValue: number;
  utilizationRatePct: number;
  averageCompletionHours: number;
}

interface JobContextType {
  jobs: Job[];
  technicians: Technician[];
  clients: Client[];
  invoices: Invoice[];
  metrics: JobMetrics;
  
  // Navigation & UI state
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedJob: Job | null;
  setSelectedJob: (job: Job | null) => void;
  isCreateJobModalOpen: boolean;
  setIsCreateJobModalOpen: (open: boolean) => void;
  isSupabaseModalOpen: boolean;
  setIsSupabaseModalOpen: (open: boolean) => void;

  // Filters
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;

  // Actions
  addJob: (jobData: Partial<Job>) => Job;
  updateJob: (id: string, updates: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  updateJobStatus: (id: string, newStatus: JobStatus) => void;
  toggleTaskCompletion: (jobId: string, taskId: string) => void;
  addJobNote: (jobId: string, text: string, author?: string) => void;
  addJobMaterial: (jobId: string, material: Omit<JobMaterialItem, 'id' | 'totalCost'>) => void;
  addChecklistItem: (jobId: string, label: string) => void;
  createInvoiceForJob: (jobId: string) => void;
  markInvoicePaid: (invoiceId: string) => void;
  resetToSampleData: () => void;
  exportJobsCsv: () => void;
}

const JobContext = createContext<JobContextType | undefined>(undefined);

const STORAGE_KEYS = {
  JOBS: 'forge_jobs_data_v1',
  TECHS: 'forge_techs_data_v1',
  CLIENTS: 'forge_clients_data_v1',
  INVOICES: 'forge_invoices_data_v1',
};

export const JobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<Job[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.JOBS);
      return saved ? JSON.parse(saved) : INITIAL_JOBS;
    } catch {
      return INITIAL_JOBS;
    }
  });

  const [technicians, setTechnicians] = useState<Technician[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TECHS);
      return saved ? JSON.parse(saved) : INITIAL_TECHNICIANS;
    } catch {
      return INITIAL_TECHNICIANS;
    }
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
      return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
    } catch {
      return INITIAL_CLIENTS;
    }
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return saved ? JSON.parse(saved) : INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isCreateJobModalOpen, setIsCreateJobModalOpen] = useState<boolean>(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.JOBS, JSON.stringify(jobs));
    } catch (e) {
      console.warn('Failed to save jobs to localStorage', e);
    }
  }, [jobs]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
    } catch (e) {
      console.warn('Failed to save invoices to localStorage', e);
    }
  }, [invoices]);

  // If selectedJob is open, keep it in sync with updated jobs state
  useEffect(() => {
    if (selectedJob) {
      const fresh = jobs.find((j) => j.id === selectedJob.id);
      if (fresh) setSelectedJob(fresh);
    }
  }, [jobs]);

  // Compute metrics
  const activeJobs = jobs.filter((j) => j.status !== 'Completed' && j.status !== 'Invoiced');
  const inProgressCount = jobs.filter((j) => j.status === 'In Progress').length;
  const todayStr = '2026-10-19';
  const scheduledTodayCount = jobs.filter((j) => j.scheduledDate === todayStr).length;
  const completedThisWeekCount = jobs.filter((j) => j.status === 'Completed' || j.status === 'Invoiced').length;
  const overdueEmergencyCount = jobs.filter((j) => j.priority === 'Emergency' && j.status !== 'Completed' && j.status !== 'Invoiced').length;
  const totalQuotedValue = jobs.reduce((acc, j) => acc + (j.quoteAmount || 0), 0);
  const totalInvoicedValue = invoices.reduce((acc, inv) => acc + (inv.total || 0), 0);
  
  // Technician utilization rate
  const assignedTechs = new Set(activeJobs.flatMap((j) => j.assignedTechIds));
  const utilizationRatePct = Math.round((assignedTechs.size / (technicians.length || 1)) * 100);

  const completedJobsWithHours = jobs.filter((j) => (j.status === 'Completed' || j.status === 'Invoiced') && j.actualHours > 0);
  const averageCompletionHours = completedJobsWithHours.length > 0 
    ? Number((completedJobsWithHours.reduce((acc, j) => acc + j.actualHours, 0) / completedJobsWithHours.length).toFixed(1))
    : 4.8;

  const metrics: JobMetrics = {
    totalJobs: jobs.length,
    activeJobs: activeJobs.length,
    inProgressCount,
    scheduledTodayCount,
    completedThisWeekCount,
    overdueEmergencyCount,
    totalQuotedValue,
    totalInvoicedValue,
    utilizationRatePct,
    averageCompletionHours,
  };

  const addJob = (jobData: Partial<Job>): Job => {
    const nextNum = 2400 + jobs.length + 1;
    const client = clients.find((c) => c.id === jobData.clientId) || clients[0];
    
    const newJob: Job = {
      id: `job-${Date.now()}`,
      jobCode: `JOB-${nextNum}`,
      title: jobData.title || 'Untitled Work Order',
      description: jobData.description || 'No description provided.',
      clientId: client.id,
      clientName: client.name,
      clientContact: client.contactPerson,
      clientPhone: client.phone,
      clientEmail: client.email,
      siteAddress: jobData.siteAddress || client.address,
      siteCity: jobData.siteCity || client.suburb.split(' ')[0] || 'Melbourne',
      sitePostcode: jobData.sitePostcode || '3000',
      priority: (jobData.priority as JobPriority) || 'Medium',
      status: (jobData.status as JobStatus) || 'New',
      workOrderType: jobData.workOrderType || 'Preventative Maintenance',
      scheduledDate: jobData.scheduledDate || todayStr,
      scheduledStartTime: jobData.scheduledStartTime || '08:00',
      scheduledEndTime: jobData.scheduledEndTime || '12:00',
      assignedTechIds: jobData.assignedTechIds || [],
      estimatedHours: jobData.estimatedHours || 4,
      actualHours: 0,
      estimatedCost: jobData.estimatedCost || 500,
      actualCost: 0,
      quoteAmount: jobData.quoteAmount || 850,
      checklist: jobData.checklist && jobData.checklist.length > 0 
        ? jobData.checklist 
        : [
            { id: `t-${Date.now()}-1`, label: 'Site hazard check & risk assessment sign-off', completed: false },
            { id: `t-${Date.now()}-2`, label: 'Complete scope of works as documented', completed: false },
            { id: `t-${Date.now()}-3`, label: 'Customer verification & testing sign-off', completed: false },
          ],
      materials: jobData.materials || [],
      notes: [
        {
          id: `n-${Date.now()}`,
          author: 'Dispatch Coordinator',
          timestamp: 'Just now',
          text: 'Work order created and dispatched to mobile schedule.',
          type: 'general',
        },
      ],
      tags: jobData.tags || ['New Dispatch'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setJobs((prev) => [newJob, ...prev]);
    message.success(`Job ${newJob.jobCode} successfully created!`);
    return newJob;
  };

  const updateJob = (id: string, updates: Partial<Job>) => {
    setJobs((prev) =>
      prev.map((job) =>
        job.id === id
          ? { ...job, ...updates, updatedAt: new Date().toISOString() }
          : job
      )
    );
    message.success('Job updated successfully');
  };

  const deleteJob = (id: string) => {
    const job = jobs.find((j) => j.id === id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
    if (selectedJob?.id === id) setSelectedJob(null);
    message.info(`Job ${job?.jobCode || id} removed`);
  };

  const updateJobStatus = (id: string, newStatus: JobStatus) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== id) return job;
        const statusNote = {
          id: `n-${Date.now()}`,
          author: 'System Operations',
          timestamp: 'Just now',
          text: `Status moved from ${job.status} to ${newStatus}`,
          type: 'general' as const,
        };
        return {
          ...job,
          status: newStatus,
          notes: [statusNote, ...job.notes],
          updatedAt: new Date().toISOString(),
        };
      })
    );
    message.success(`Status updated to ${newStatus}`);
  };

  const toggleTaskCompletion = (jobId: string, taskId: string) => {
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const updatedChecklist = job.checklist.map((item) => {
          if (item.id !== taskId) return item;
          const nextState = !item.completed;
          return {
            ...item,
            completed: nextState,
            completedAt: nextState ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            completedBy: nextState ? 'Marcus Callahan' : undefined,
          };
        });
        return {
          ...job,
          checklist: updatedChecklist,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const addJobNote = (jobId: string, text: string, author: string = 'Operations Team') => {
    if (!text.trim()) return;
    const newNote = {
      id: `n-${Date.now()}`,
      author,
      timestamp: 'Just now',
      text: text.trim(),
      type: 'general' as const,
    };
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, notes: [newNote, ...job.notes], updatedAt: new Date().toISOString() }
          : job
      )
    );
    message.success('Note added to job timeline');
  };

  const addJobMaterial = (jobId: string, material: Omit<JobMaterialItem, 'id' | 'totalCost'>) => {
    const totalCost = material.quantity * material.unitCost;
    const newItem: JobMaterialItem = {
      id: `m-${Date.now()}`,
      name: material.name,
      partNumber: material.partNumber,
      quantity: material.quantity,
      unitCost: material.unitCost,
      totalCost,
    };
    setJobs((prev) =>
      prev.map((job) => {
        if (job.id !== jobId) return job;
        const newMaterials = [...job.materials, newItem];
        const additionalActualCost = totalCost;
        return {
          ...job,
          materials: newMaterials,
          actualCost: (job.actualCost || 0) + additionalActualCost,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    message.success(`Added ${material.name} to job inventory`);
  };

  const addChecklistItem = (jobId: string, label: string) => {
    if (!label.trim()) return;
    const newItem = {
      id: `t-${Date.now()}`,
      label: label.trim(),
      completed: false,
    };
    setJobs((prev) =>
      prev.map((job) =>
        job.id === jobId
          ? { ...job, checklist: [...job.checklist, newItem], updatedAt: new Date().toISOString() }
          : job
      )
    );
    message.success('Checklist item added');
  };

  const createInvoiceForJob = (jobId: string) => {
    const job = jobs.find((j) => j.id === jobId);
    if (!job) return;

    const amount = job.quoteAmount || 1200;
    const tax = amount * 0.1;
    const total = amount + tax;
    const invNum = `INV-2026-${String(885 + invoices.length).padStart(4, '0')}`;

    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: invNum,
      jobId: job.id,
      jobCode: job.jobCode,
      clientName: job.clientName,
      subtotal: amount,
      tax,
      total,
      issueDate: todayStr,
      dueDate: '2026-11-19',
      status: 'Sent',
    };

    setInvoices((prev) => [newInvoice, ...prev]);
    updateJobStatus(job.id, 'Invoiced');
    message.success(`Invoice ${invNum} generated for $${total.toLocaleString()}`);
  };

  const markInvoicePaid = (invoiceId: string) => {
    setInvoices((prev) =>
      prev.map((inv) =>
        inv.id === invoiceId
          ? { ...inv, status: 'Paid', paidDate: new Date().toISOString().split('T')[0] }
          : inv
      )
    );
    message.success('Invoice marked as paid');
  };

  const resetToSampleData = () => {
    setJobs(INITIAL_JOBS);
    setTechnicians(INITIAL_TECHNICIANS);
    setClients(INITIAL_CLIENTS);
    setInvoices(INITIAL_INVOICES);
    localStorage.removeItem(STORAGE_KEYS.JOBS);
    localStorage.removeItem(STORAGE_KEYS.TECHS);
    localStorage.removeItem(STORAGE_KEYS.CLIENTS);
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    message.info('Sample data restored to initial state');
  };

  const exportJobsCsv = () => {
    const headers = [
      'Job Code',
      'Title',
      'Client',
      'Site Address',
      'Suburb',
      'Priority',
      'Status',
      'Work Order Type',
      'Scheduled Date',
      'Estimated Hours',
      'Actual Hours',
      'Quote Amount ($)',
      'Actual Cost ($)',
    ];

    const rows = jobs.map((j) => [
      `"${j.jobCode}"`,
      `"${j.title.replace(/"/g, '""')}"`,
      `"${j.clientName}"`,
      `"${j.siteAddress}"`,
      `"${j.siteCity}"`,
      `"${j.priority}"`,
      `"${j.status}"`,
      `"${j.workOrderType}"`,
      `"${j.scheduledDate}"`,
      j.estimatedHours,
      j.actualHours,
      j.quoteAmount,
      j.actualCost,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `forge_jobs_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Exported jobs to CSV');
  };

  return (
    <JobContext.Provider
      value={{
        jobs,
        technicians,
        clients,
        invoices,
        metrics,
        activeTab,
        setActiveTab,
        selectedJob,
        setSelectedJob,
        isCreateJobModalOpen,
        setIsCreateJobModalOpen,
        isSupabaseModalOpen,
        setIsSupabaseModalOpen,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        priorityFilter,
        setPriorityFilter,
        addJob,
        updateJob,
        deleteJob,
        updateJobStatus,
        toggleTaskCompletion,
        addJobNote,
        addJobMaterial,
        addChecklistItem,
        createInvoiceForJob,
        markInvoicePaid,
        resetToSampleData,
        exportJobsCsv,
      }}
    >
      {children}
    </JobContext.Provider>
  );
};

export const useJobs = () => {
  const context = useContext(JobContext);
  if (!context) {
    throw new Error('useJobs must be used within a JobProvider');
  }
  return context;
};
