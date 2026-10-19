import React from 'react';
import { Card, Table, Tag, Button, Input, Space, Row, Col } from 'antd';
import {
  ShopOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { Client } from '../../types/jobTypes.ts';

export const ClientsView: React.FC = () => {
  const { clients, jobs, setSearchQuery, setActiveTab, setIsCreateJobModalOpen } = useJobs();

  const handleViewClientJobs = (clientName: string) => {
    setSearchQuery(clientName);
    setActiveTab('jobs');
  };

  const columns = [
    {
      title: 'Client Company',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Client) => (
        <div>
          <div className="font-bold text-slate-900 text-xs">{name}</div>
          <div className="text-[11px] text-slate-600">{record.industry}</div>
        </div>
      ),
      sorter: (a: Client, b: Client) => a.name.localeCompare(b.name),
    },
    {
      title: 'Primary Contact',
      dataIndex: 'contactPerson',
      key: 'contactPerson',
      render: (contact: string, record: Client) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">{contact}</div>
          <div className="text-[11px] text-slate-600 space-x-2">
            <a href={`tel:${record.phone}`} className="text-slate-600 hover:text-blue-600">
              {record.phone}
            </a>
            <span>·</span>
            <a href={`mailto:${record.email}`} className="text-blue-600 hover:underline">
              {record.email}
            </a>
          </div>
        </div>
      ),
    },
    {
      title: 'Facility Address',
      dataIndex: 'address',
      key: 'address',
      render: (address: string, record: Client) => (
        <div className="text-xs text-slate-700">
          <div>{address}</div>
          <div className="text-[11px] text-slate-600">{record.suburb}</div>
        </div>
      ),
    },
    {
      title: 'SLA Contract Type',
      dataIndex: 'contractType',
      key: 'contractType',
      render: (contract: string) => (
        <Tag color={contract.includes('Priority') ? 'purple' : contract.includes('SLA') ? 'blue' : 'default'}>
          {contract}
        </Tag>
      ),
    },
    {
      title: 'Active Jobs',
      key: 'activeJobs',
      align: 'center' as const,
      render: (_: any, record: Client) => {
        const active = jobs.filter(
          (j) => j.clientId === record.id && j.status !== 'Completed' && j.status !== 'Invoiced'
        ).length;
        return (
          <Button
            size="small"
            type={active > 0 ? 'primary' : 'default'}
            ghost={active > 0}
            onClick={() => handleViewClientJobs(record.name)}
            className="text-xs font-mono"
          >
            {active} Active
          </Button>
        );
      },
    },
    {
      title: 'Total Billed',
      dataIndex: 'totalBilled',
      key: 'totalBilled',
      align: 'right' as const,
      render: (val: number) => (
        <span className="font-mono font-bold text-xs text-slate-900">
          ${val.toLocaleString()}
        </span>
      ),
      sorter: (a: Client, b: Client) => a.totalBilled - b.totalBilled,
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 m-0">Commercial Client Accounts</h2>
          <span className="text-xs text-slate-600">
            {clients.length} active service agreements across warehousing, healthcare, data centres, and hotels
          </span>
        </div>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateJobModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium"
        >
          New Client Order
        </Button>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <Table
          columns={columns}
          dataSource={clients}
          rowKey="id"
          pagination={{ pageSize: 8 }}
        />
      </div>
    </div>
  );
};
