import React, { useState } from 'react';
import { Modal, Button, Alert, Tabs, Table, Tag, message } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  DatabaseOutlined,
  TableOutlined,
  CodeOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { SUPABASE_SQL_SCHEMA, SUPABASE_SEED_SQL } from '../../mock/jobData.ts';

const TABLES_METADATA = [
  {
    table: 'public.clients',
    description: 'Commercial facilities & residential account directory',
    primaryKey: 'id (UUID)',
    columns: 'name, contact_person, email, phone, address, suburb, industry, contract_type, created_at, updated_at',
  },
  {
    table: 'public.technicians',
    description: 'Licensed field specialists with trade credentials & rates',
    primaryKey: 'id (UUID)',
    columns: 'auth_user_id, name, role, email, phone, trade, status, hourly_rate, vehicle_id, certifications, avatar_url, created_at',
  },
  {
    table: 'public.jobs',
    description: 'Primary work orders & dispatch tickets ledger',
    primaryKey: 'id (UUID)',
    columns: 'job_code, title, description, client_id, site_address, site_city, site_postcode, priority, status, work_order_type, scheduled_date, scheduled_start_time, scheduled_end_time, estimated_hours, actual_hours, estimated_cost, actual_cost, quote_amount, invoice_amount, tags, created_by, created_at, updated_at',
  },
  {
    table: 'public.job_technician_assignments',
    description: 'Many-to-many relationship linking field technicians to jobs',
    primaryKey: 'id (UUID)',
    columns: 'job_id, technician_id, assigned_at',
  },
  {
    table: 'public.job_checklist_items',
    description: 'Step-by-step technical inspections and completion sign-offs',
    primaryKey: 'id (UUID)',
    columns: 'job_id, label, completed, completed_at, completed_by, sort_order',
  },
  {
    table: 'public.job_materials',
    description: 'Parts, consumables, and itemized materials expenses',
    primaryKey: 'id (UUID)',
    columns: 'job_id, name, part_number, quantity, unit_cost, total_cost (GENERATED), created_at',
  },
  {
    table: 'public.job_notes',
    description: 'Chronological timeline notes, hazards, and customer comms',
    primaryKey: 'id (UUID)',
    columns: 'job_id, author, note_type, text, created_at',
  },
  {
    table: 'public.invoices',
    description: 'Tax billing invoices with 10% GST and payment tracking',
    primaryKey: 'id (UUID)',
    columns: 'invoice_number, job_id, client_id, subtotal, tax, total, issue_date, due_date, status, paid_date, created_at',
  },
];

const TYPESCRIPT_DATABASE_TYPES = `export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          contact_person: string
          email: string
          phone: string
          address: string
          suburb: string
          industry: string
          contract_type: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['clients']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clients']['Insert']>
      }
      technicians: {
        Row: {
          id: string
          auth_user_id: string | null
          name: string
          role: string
          email: string
          phone: string
          trade: string
          status: 'Available' | 'On Job' | 'Off Duty'
          hourly_rate: number
          vehicle_id: string | null
          certifications: string[]
          avatar_url: string | null
          created_at: string
        }
      }
      jobs: {
        Row: {
          id: string
          job_code: string
          title: string
          description: string | null
          client_id: string
          site_address: string
          site_city: string
          site_postcode: string
          priority: 'Emergency' | 'High' | 'Medium' | 'Low'
          status: 'New' | 'Scheduled' | 'In Progress' | 'On Hold' | 'Completed' | 'Invoiced'
          work_order_type: string
          scheduled_date: string | null
          scheduled_start_time: string | null
          scheduled_end_time: string | null
          estimated_hours: number
          actual_hours: number
          estimated_cost: number
          actual_cost: number
          quote_amount: number
          invoice_amount: number | null
          tags: string[]
          created_at: string
          updated_at: string
        }
      }
      job_checklist_items: {
        Row: {
          id: string
          job_id: string
          label: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          sort_order: number
        }
      }
      job_materials: {
        Row: {
          id: string
          job_id: string
          name: string
          part_number: string | null
          quantity: number
          unit_cost: number
          total_cost: number
          created_at: string
        }
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          job_id: string | null
          client_id: string
          subtotal: number
          tax: number
          total: number
          issue_date: string
          due_date: string
          status: 'Draft' | 'Sent' | 'Paid' | 'Overdue'
          paid_date: string | null
          created_at: string
        }
      }
    }
  }
}
`;

export const SupabaseSqlModal: React.FC = () => {
  const { isSupabaseModalOpen, setIsSupabaseModalOpen } = useJobs();
  const [activeTab, setActiveTab] = useState('ddl');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${label} copied to clipboard!`);
  };

  const handleDownload = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(`Downloaded ${filename}`);
  };

  const tableColumns = [
    {
      title: 'Table Name',
      dataIndex: 'table',
      key: 'table',
      render: (t: string) => (
        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
          {t}
        </span>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (d: string) => <span className="text-xs text-slate-800">{d}</span>,
    },
    {
      title: 'Primary Key',
      dataIndex: 'primaryKey',
      key: 'primaryKey',
      render: (pk: string) => <Tag color="purple" className="text-[11px] font-mono">{pk}</Tag>,
    },
    {
      title: 'Columns & Attributes',
      dataIndex: 'columns',
      key: 'columns',
      render: (c: string) => (
        <span className="text-[11px] font-mono text-slate-600 leading-relaxed">{c}</span>
      ),
    },
  ];

  return (
    <Modal
      open={isSupabaseModalOpen}
      onCancel={() => setIsSupabaseModalOpen(false)}
      title={
        <div className="flex items-center gap-2 text-slate-900 font-bold">
          <DatabaseOutlined className="text-emerald-600 text-lg" />
          <span>Production Supabase SQL Schema & Architecture Reference</span>
        </div>
      }
      width={880}
      footer={[
        <Button key="close" onClick={() => setIsSupabaseModalOpen(false)}>
          Close
        </Button>,
        <Button
          key="download"
          icon={<DownloadOutlined />}
          onClick={() => {
            if (activeTab === 'seed') {
              handleDownload(SUPABASE_SEED_SQL, 'forge_jobs_seed_data.sql');
            } else if (activeTab === 'types') {
              handleDownload(TYPESCRIPT_DATABASE_TYPES, 'database.types.ts');
            } else {
              handleDownload(SUPABASE_SQL_SCHEMA, 'forge_jobs_supabase_schema.sql');
            }
          }}
        >
          Download Current Tab
        </Button>,
        <Button
          key="copy"
          type="primary"
          icon={<CopyOutlined />}
          onClick={() => {
            if (activeTab === 'seed') {
              handleCopy(SUPABASE_SEED_SQL, 'Sample Seed SQL');
            } else if (activeTab === 'types') {
              handleCopy(TYPESCRIPT_DATABASE_TYPES, 'TypeScript Types');
            } else {
              handleCopy(SUPABASE_SQL_SCHEMA, 'Complete Supabase DDL');
            }
          }}
          className="bg-emerald-600 hover:bg-emerald-500 font-semibold"
        >
          Copy Current Tab to Clipboard
        </Button>,
      ]}
    >
      <div className="space-y-4 pt-2">
        <Alert
          type="info"
          showIcon
          message="Zero-Database Development Mode Active"
          description={
            <div className="text-xs text-slate-700 space-y-1">
              <div>
                The app is currently operating on <strong>in-memory hardcoded data</strong> with local persistence. No database connections are made during prompt turns or UI rendering, ensuring maximum speed.
              </div>
              <div className="text-slate-600">
                Whenever you are ready to connect Supabase in the future, navigate to your{' '}
                <strong>Supabase Dashboard &gt; SQL Editor</strong>, run the DDL schema below, and optionally add the seed data.
              </div>
            </div>
          }
        />

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'ddl',
              label: (
                <span>
                  <CodeOutlined /> DDL SQL Schema (8 Tables)
                </span>
              ),
              children: (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Includes 5 custom ENUM types, 8 tables, foreign keys, btree indexes, and RLS policies:</span>
                    <Button
                      size="small"
                      type="link"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(SUPABASE_SQL_SCHEMA, 'Complete Supabase DDL')}
                    >
                      Copy SQL
                    </Button>
                  </div>
                  <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono max-h-96 overflow-y-auto leading-relaxed border border-slate-800 selection:bg-emerald-800 selection:text-white">
                    {SUPABASE_SQL_SCHEMA}
                  </pre>
                </div>
              ),
            },
            {
              key: 'seed',
              label: (
                <span>
                  <FileTextOutlined /> Sample Seed SQL Data
                </span>
              ),
              children: (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Pre-populated INSERT statements matching our hardcoded clients, technicians, and work orders:</span>
                    <Button
                      size="small"
                      type="link"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(SUPABASE_SEED_SQL, 'Sample Seed SQL')}
                    >
                      Copy Seed SQL
                    </Button>
                  </div>
                  <pre className="bg-slate-950 text-emerald-400 p-4 rounded-xl text-xs font-mono max-h-96 overflow-y-auto leading-relaxed border border-slate-800 selection:bg-emerald-800 selection:text-white">
                    {SUPABASE_SEED_SQL}
                  </pre>
                </div>
              ),
            },
            {
              key: 'tables',
              label: (
                <span>
                  <TableOutlined /> Table Architecture
                </span>
              ),
              children: (
                <Table
                  columns={tableColumns}
                  dataSource={TABLES_METADATA}
                  rowKey="table"
                  pagination={false}
                  size="small"
                  className="border border-slate-200 rounded-lg overflow-hidden"
                />
              ),
            },
            {
              key: 'types',
              label: (
                <span>
                  <CodeOutlined /> TypeScript Database Types
                </span>
              ),
              children: (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>Auto-generated TypeScript types matching the Supabase public schema:</span>
                    <Button
                      size="small"
                      type="link"
                      icon={<CopyOutlined />}
                      onClick={() => handleCopy(TYPESCRIPT_DATABASE_TYPES, 'TypeScript Types')}
                    >
                      Copy Types
                    </Button>
                  </div>
                  <pre className="bg-slate-950 text-blue-300 p-4 rounded-xl text-xs font-mono max-h-96 overflow-y-auto leading-relaxed border border-slate-800 selection:bg-blue-800 selection:text-white">
                    {TYPESCRIPT_DATABASE_TYPES}
                  </pre>
                </div>
              ),
            },
          ]}
        />
      </div>
    </Modal>
  );
};
