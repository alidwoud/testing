import React, { useState } from 'react';
import {
  Table,
  Tag,
  Button,
  Input,
  Select,
  Segmented,
  Space,
  Avatar,
  Tooltip,
  Dropdown,
  MenuProps,
  Typography,
} from 'antd';
import {
  TableOutlined,
  AppstoreOutlined,
  SearchOutlined,
  FilterOutlined,
  PlusOutlined,
  DownloadOutlined,
  MoreOutlined,
  DollarOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { Job, JobStatus, JobPriority, WorkOrderType } from '../../types/jobTypes.ts';
import { JobKanbanBoard } from './JobKanbanBoard.tsx';

const { Option } = Select;

const STATUS_TAGS: Record<JobStatus, { color: string }> = {
  New: { color: 'blue' },
  Scheduled: { color: 'cyan' },
  'In Progress': { color: 'processing' },
  'On Hold': { color: 'warning' },
  Completed: { color: 'success' },
  Invoiced: { color: 'purple' },
};

export const JobListView: React.FC = () => {
  const {
    jobs,
    technicians,
    clients,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    searchQuery,
    setSearchQuery,
    setSelectedJob,
    setIsCreateJobModalOpen,
    updateJobStatus,
    deleteJob,
    createInvoiceForJob,
    exportJobsCsv,
  } = useJobs();

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [workOrderTypeFilter, setWorkOrderTypeFilter] = useState<string>('ALL');
  const [techFilter, setTechFilter] = useState<string>('ALL');

  // Filter pipeline
  const filteredJobs = jobs.filter((job) => {
    // Status filter
    if (statusFilter !== 'ALL' && job.status !== statusFilter) return false;
    // Priority filter
    if (priorityFilter !== 'ALL' && job.priority !== priorityFilter) return false;
    // Work order type filter
    if (workOrderTypeFilter !== 'ALL' && job.workOrderType !== workOrderTypeFilter) return false;
    // Tech filter
    if (techFilter !== 'ALL' && !job.assignedTechIds.includes(techFilter)) return false;

    // Search query
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const match =
        job.jobCode.toLowerCase().includes(q) ||
        job.title.toLowerCase().includes(q) ||
        job.clientName.toLowerCase().includes(q) ||
        job.siteAddress.toLowerCase().includes(q) ||
        job.siteCity.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const columns = [
    {
      title: 'Job Code',
      dataIndex: 'jobCode',
      key: 'jobCode',
      width: 130,
      render: (code: string, record: Job) => (
        <div>
          <span className="font-mono font-bold text-xs text-blue-700 hover:text-blue-600 cursor-pointer">
            {code}
          </span>
          <div className="mt-0.5">
            <Tag
              color={record.priority === 'Emergency' ? 'red' : record.priority === 'High' ? 'orange' : 'blue'}
              className="text-[10px] font-medium m-0 px-1.5"
            >
              {record.priority}
            </Tag>
          </div>
        </div>
      ),
      sorter: (a: Job, b: Job) => a.jobCode.localeCompare(b.jobCode),
    },
    {
      title: 'Work Order & Scope',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Job) => (
        <div className="max-w-md">
          <div 
            onClick={() => setSelectedJob(record)}
            className="font-semibold text-slate-900 text-xs hover:text-blue-600 cursor-pointer transition-colors leading-snug"
          >
            {title}
          </div>
          <div className="text-[11px] text-slate-600 mt-0.5">
            {record.workOrderType} · <span className="font-mono">{record.checklist.filter(t => t.completed).length}/{record.checklist.length} tasks done</span>
          </div>
        </div>
      ),
    },
    {
      title: 'Client & Location',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (clientName: string, record: Job) => (
        <div className="text-xs">
          <div className="font-semibold text-slate-800">{clientName}</div>
          <div className="text-[11px] text-slate-600 truncate max-w-xs">{record.siteAddress}, {record.siteCity}</div>
        </div>
      ),
      sorter: (a: Job, b: Job) => a.clientName.localeCompare(b.clientName),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: JobStatus, record: Job) => {
        const menuItems: MenuProps['items'] = (
          ['New', 'Scheduled', 'In Progress', 'On Hold', 'Completed', 'Invoiced'] as JobStatus[]
        ).map((st) => ({
          key: st,
          label: st,
          onClick: () => updateJobStatus(record.id, st),
        }));

        return (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <div className="cursor-pointer inline-flex items-center">
              <Tag color={STATUS_TAGS[status].color} className="text-xs font-medium cursor-pointer m-0">
                {status} ▾
              </Tag>
            </div>
          </Dropdown>
        );
      },
      filters: [
        { text: 'New', value: 'New' },
        { text: 'Scheduled', value: 'Scheduled' },
        { text: 'In Progress', value: 'In Progress' },
        { text: 'On Hold', value: 'On Hold' },
        { text: 'Completed', value: 'Completed' },
        { text: 'Invoiced', value: 'Invoiced' },
      ],
      onFilter: (value: any, record: Job) => record.status === value,
    },
    {
      title: 'Scheduled',
      dataIndex: 'scheduledDate',
      key: 'scheduledDate',
      width: 140,
      render: (date: string, record: Job) => (
        <div className="text-xs font-mono">
          <div className="text-slate-800 font-medium">{date}</div>
          <div className="text-[11px] text-slate-600">{record.scheduledStartTime}–{record.scheduledEndTime}</div>
        </div>
      ),
      sorter: (a: Job, b: Job) => a.scheduledDate.localeCompare(b.scheduledDate),
    },
    {
      title: 'Technicians',
      key: 'technicians',
      width: 120,
      render: (_: any, record: Job) => {
        const assigned = technicians.filter((t) => record.assignedTechIds.includes(t.id));
        return (
          <Avatar.Group max={{ count: 2 }} size={28}>
            {assigned.map((tech) => (
              <Tooltip key={tech.id} title={`${tech.name} (${tech.trade})`}>
                <Avatar src={tech.avatar} />
              </Tooltip>
            ))}
          </Avatar.Group>
        );
      },
    },
    {
      title: 'Quote Value',
      dataIndex: 'quoteAmount',
      key: 'quoteAmount',
      width: 110,
      align: 'right' as const,
      render: (val: number) => (
        <span className="font-mono font-semibold text-xs text-slate-800">
          ${val?.toLocaleString() || '0'}
        </span>
      ),
      sorter: (a: Job, b: Job) => a.quoteAmount - b.quoteAmount,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: Job) => {
        const items: MenuProps['items'] = [
          {
            key: 'view',
            icon: <EyeOutlined />,
            label: 'View Dossier',
            onClick: () => setSelectedJob(record),
          },
          {
            key: 'invoice',
            icon: <DollarOutlined />,
            label: 'Generate Invoice',
            onClick: () => createInvoiceForJob(record.id),
          },
          { type: 'divider' },
          {
            key: 'delete',
            icon: <DeleteOutlined />,
            danger: true,
            label: 'Delete Work Order',
            onClick: () => deleteJob(record.id),
          },
        ];

        return (
          <Dropdown menu={{ items }} trigger={['click']}>
            <Button type="text" size="small" icon={<MoreOutlined className="text-slate-600" />} />
          </Dropdown>
        );
      },
    },
  ];

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 m-0">
            Work Orders & Dispatch Queue
          </h2>
          <span className="text-xs text-slate-600">
            Showing {filteredJobs.length} of {jobs.length} jobs
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as 'table' | 'kanban')}
            options={[
              { label: 'Table Grid', value: 'table', icon: <TableOutlined /> },
              { label: 'Kanban Pipeline', value: 'kanban', icon: <AppstoreOutlined /> },
            ]}
            className="bg-slate-100 p-0.5 rounded-lg"
          />

          <Button
            icon={<DownloadOutlined />}
            onClick={exportJobsCsv}
            className="hidden sm:inline-flex rounded-lg text-xs"
          >
            Export
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateJobModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium"
          >
            New Job
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <Input
          placeholder="Filter by keyword, client, or site..."
          prefix={<SearchOutlined className="text-slate-600" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          allowClear
          className="rounded-lg"
        />

        {/* Status */}
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          className="w-full"
          placeholder="Filter Status"
        >
          <Option value="ALL">All Statuses</Option>
          <Option value="New">New Request</Option>
          <Option value="Scheduled">Scheduled</Option>
          <Option value="In Progress">In Progress</Option>
          <Option value="On Hold">On Hold</Option>
          <Option value="Completed">Completed</Option>
          <Option value="Invoiced">Invoiced</Option>
        </Select>

        {/* Priority */}
        <Select
          value={priorityFilter}
          onChange={setPriorityFilter}
          className="w-full"
          placeholder="Filter Priority"
        >
          <Option value="ALL">All Priorities</Option>
          <Option value="Emergency">Emergency</Option>
          <Option value="High">High</Option>
          <Option value="Medium">Medium</Option>
          <Option value="Low">Low</Option>
        </Select>

        {/* Work Order Type */}
        <Select
          value={workOrderTypeFilter}
          onChange={setWorkOrderTypeFilter}
          className="w-full"
          placeholder="Work Order Type"
        >
          <Option value="ALL">All Work Types</Option>
          <Option value="Emergency Repair">Emergency Repair</Option>
          <Option value="Preventative Maintenance">Preventative Maintenance</Option>
          <Option value="Installation">Installation</Option>
          <Option value="Safety Inspection">Safety Inspection</Option>
          <Option value="Commissioning">Commissioning</Option>
        </Select>

        {/* Field Technician */}
        <Select
          value={techFilter}
          onChange={setTechFilter}
          className="w-full"
          placeholder="Assigned Technician"
        >
          <Option value="ALL">All Technicians</Option>
          {technicians.map((t) => (
            <Option key={t.id} value={t.id}>
              {t.name} ({t.trade.split(' ')[0]})
            </Option>
          ))}
        </Select>
      </div>

      {/* Main Content: Table or Kanban */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <Table
            columns={columns}
            dataSource={filteredJobs}
            rowKey="id"
            onRow={(record) => ({
              onClick: (e) => {
                // If clicked an action dropdown or tag button, don't open drawer
                const target = e.target as HTMLElement;
                if (!target.closest('.ant-dropdown-trigger') && !target.closest('.ant-btn')) {
                  setSelectedJob(record);
                }
              },
            })}
            rowClassName="cursor-pointer hover:bg-slate-50/80 transition-colors"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} jobs`,
            }}
          />
        </div>
      ) : (
        <JobKanbanBoard filteredJobs={filteredJobs} />
      )}
    </div>
  );
};
