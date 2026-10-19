import React, { useState } from 'react';
import {
  Drawer,
  Tag,
  Button,
  Tabs,
  Checkbox,
  Input,
  InputNumber,
  Select,
  Progress,
  Avatar,
  Space,
  Timeline,
  Descriptions,
  Table,
  Divider,
  Popconfirm,
  message,
} from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
  UserOutlined,
  DollarOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  ToolOutlined,
  FileTextOutlined,
  PrinterOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { Job, JobStatus, JobPriority } from '../../types/jobTypes.ts';

const STATUS_TAGS: Record<JobStatus, { color: string }> = {
  New: { color: 'blue' },
  Scheduled: { color: 'cyan' },
  'In Progress': { color: 'processing' },
  'On Hold': { color: 'warning' },
  Completed: { color: 'success' },
  Invoiced: { color: 'purple' },
};

export const JobDetailDrawer: React.FC = () => {
  const {
    selectedJob,
    setSelectedJob,
    technicians,
    updateJobStatus,
    toggleTaskCompletion,
    addJobNote,
    addJobMaterial,
    addChecklistItem,
    createInvoiceForJob,
    deleteJob,
  } = useJobs();

  const [newNoteText, setNewNoteText] = useState('');
  const [newTaskText, setNewTaskText] = useState('');
  
  // New Material form state
  const [matName, setMatName] = useState('');
  const [matPartNum, setMatPartNum] = useState('');
  const [matQty, setMatQty] = useState<number>(1);
  const [matCost, setMatCost] = useState<number>(25);

  if (!selectedJob) return null;

  const assignedTechs = technicians.filter((t) => selectedJob.assignedTechIds.includes(t.id));
  const completedTasks = selectedJob.checklist.filter((t) => t.completed).length;
  const totalTasks = selectedJob.checklist.length;
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const margin = selectedJob.quoteAmount - (selectedJob.actualCost || selectedJob.estimatedCost);
  const marginPct = selectedJob.quoteAmount > 0 
    ? Math.round((margin / selectedJob.quoteAmount) * 100) 
    : 0;

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    addJobNote(selectedJob.id, newNoteText);
    setNewNoteText('');
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    addChecklistItem(selectedJob.id, newTaskText);
    setNewTaskText('');
  };

  const handleAddMaterial = () => {
    if (!matName.trim()) {
      message.error('Please specify a material or part name');
      return;
    }
    addJobMaterial(selectedJob.id, {
      name: matName.trim(),
      partNumber: matPartNum.trim() || undefined,
      quantity: matQty,
      unitCost: matCost,
    });
    setMatName('');
    setMatPartNum('');
    setMatQty(1);
    setMatCost(25);
  };

  const materialsColumns = [
    {
      title: 'Part Description',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: any) => (
        <div>
          <div className="font-semibold text-slate-800 text-xs">{name}</div>
          {record.partNumber && (
            <div className="text-[10px] font-mono text-slate-600">{record.partNumber}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 70,
      align: 'center' as const,
      render: (qty: number) => <span className="font-mono text-xs">{qty}</span>,
    },
    {
      title: 'Unit Cost',
      dataIndex: 'unitCost',
      key: 'unitCost',
      width: 90,
      align: 'right' as const,
      render: (cost: number) => <span className="font-mono text-xs">${cost.toFixed(2)}</span>,
    },
    {
      title: 'Total',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 100,
      align: 'right' as const,
      render: (total: number) => (
        <span className="font-mono font-bold text-xs text-slate-900">${total.toFixed(2)}</span>
      ),
    },
  ];

  return (
    <Drawer
      open={!!selectedJob}
      onClose={() => setSelectedJob(null)}
      width={720}
      title={
        <div className="flex items-center justify-between pr-4 w-full">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {selectedJob.jobCode}
            </span>
            <Tag
              color={selectedJob.priority === 'Emergency' ? 'red' : selectedJob.priority === 'High' ? 'orange' : 'blue'}
              className="text-xs font-semibold m-0"
            >
              {selectedJob.priority} Priority
            </Tag>
          </div>

          {/* Status Quick Changer */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-normal">Status:</span>
            <Select
              value={selectedJob.status}
              onChange={(val) => updateJobStatus(selectedJob.id, val as JobStatus)}
              size="small"
              className="w-36 font-semibold"
            >
              <Select.Option value="New">New Request</Select.Option>
              <Select.Option value="Scheduled">Scheduled</Select.Option>
              <Select.Option value="In Progress">In Progress</Select.Option>
              <Select.Option value="On Hold">On Hold</Select.Option>
              <Select.Option value="Completed">Completed</Select.Option>
              <Select.Option value="Invoiced">Invoiced</Select.Option>
            </Select>
          </div>
        </div>
      }
      extra={
        <Space>
          <Button
            icon={<PrinterOutlined />}
            size="small"
            onClick={() => window.print()}
            className="text-xs"
          >
            Print Dossier
          </Button>
          <Popconfirm
            title="Delete this work order?"
            onConfirm={() => deleteJob(selectedJob.id)}
            okText="Yes, delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<DeleteOutlined />} size="small" danger className="text-xs" />
          </Popconfirm>
        </Space>
      }
    >
      <div className="space-y-6">
        {/* Title & Scope Header */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-snug m-0">
            {selectedJob.title}
          </h2>
          <div className="text-xs text-slate-600 mt-1 flex items-center gap-2 flex-wrap">
            <span className="font-medium text-slate-700">{selectedJob.workOrderType}</span>
            <span>·</span>
            <span>Created {new Date(selectedJob.createdAt).toLocaleDateString()}</span>
            <span>·</span>
            <span className="font-mono text-slate-700">
              Scheduled: {selectedJob.scheduledDate} ({selectedJob.scheduledStartTime}–{selectedJob.scheduledEndTime})
            </span>
          </div>
        </div>

        {/* Tabbed Dossier Sections */}
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: 'Overview & Client',
              children: (
                <div className="space-y-6 pt-2">
                  {/* Client & Site Details Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Client & Site Information
                      </span>
                      <span className="text-xs font-semibold text-blue-700">
                        {selectedJob.clientName}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-700">
                        <UserOutlined className="text-slate-600" />
                        <span>Contact: <strong>{selectedJob.clientContact}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <PhoneOutlined className="text-slate-600" />
                        <a href={`tel:${selectedJob.clientPhone}`} className="text-blue-600 hover:underline">
                          {selectedJob.clientPhone}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <MailOutlined className="text-slate-600" />
                        <a href={`mailto:${selectedJob.clientEmail}`} className="text-blue-600 hover:underline">
                          {selectedJob.clientEmail}
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-slate-700">
                        <EnvironmentOutlined className="text-slate-600" />
                        <span>{selectedJob.siteAddress}, {selectedJob.siteCity} {selectedJob.sitePostcode}</span>
                      </div>
                    </div>
                  </div>

                  {/* Scope Description */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-1.5">
                      Scope of Works & Technical Brief
                    </h4>
                    <p className="text-sm text-slate-700 leading-relaxed bg-white p-3.5 rounded-lg border border-slate-200">
                      {selectedJob.description}
                    </p>
                  </div>

                  {/* Hours & Financial Ledger */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                      <div className="text-[11px] text-slate-600 uppercase">Est. Hours</div>
                      <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                        {selectedJob.estimatedHours}h
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                      <div className="text-[11px] text-slate-600 uppercase">Actual Hours</div>
                      <div className="text-lg font-mono font-bold text-blue-600 mt-0.5">
                        {selectedJob.actualHours}h
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                      <div className="text-[11px] text-slate-600 uppercase">Quote Amount</div>
                      <div className="text-lg font-mono font-bold text-slate-900 mt-0.5">
                        ${selectedJob.quoteAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                      <div className="text-[11px] text-emerald-800 uppercase font-semibold">Projected Margin</div>
                      <div className="text-lg font-mono font-bold text-emerald-700 mt-0.5">
                        {marginPct}% <span className="text-xs font-normal">(${margin})</span>
                      </div>
                    </div>
                  </div>

                  {/* Assigned Technicians */}
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-2">
                      Assigned Field Technicians ({assignedTechs.length})
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {assignedTechs.map((tech) => (
                        <div
                          key={tech.id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar src={tech.avatar} size={40} className="border border-slate-200" />
                            <div>
                              <div className="text-xs font-bold text-slate-900">{tech.name}</div>
                              <div className="text-[11px] text-slate-600">{tech.trade}</div>
                              <div className="text-[10px] text-slate-600 font-mono mt-0.5">{tech.phone}</div>
                            </div>
                          </div>
                          <Tag color="blue" className="text-[10px] m-0">
                            {tech.role.split(' ')[0]}
                          </Tag>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick Action Button */}
                  {selectedJob.status !== 'Invoiced' && (
                    <Button
                      type="primary"
                      icon={<DollarOutlined />}
                      onClick={() => createInvoiceForJob(selectedJob.id)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 font-semibold h-10 rounded-lg"
                    >
                      Generate & Send Tax Invoice (${selectedJob.quoteAmount.toLocaleString()})
                    </Button>
                  )}
                </div>
              ),
            },
            {
              key: 'checklist',
              label: `Checklist (${completedTasks}/${totalTasks})`,
              children: (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Inspection & Task Progress</span>
                      <div className="text-[11px] text-slate-600">
                        {completedTasks} of {totalTasks} items completed ({taskPct}%)
                      </div>
                    </div>
                    <Progress
                      type="circle"
                      percent={taskPct}
                      size={44}
                      strokeColor={taskPct === 100 ? '#10b981' : '#3b82f6'}
                    />
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2">
                    {selectedJob.checklist.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => toggleTaskCompletion(selectedJob.id, item.id)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          item.completed
                            ? 'bg-emerald-50/60 border-emerald-200 text-slate-600 line-through'
                            : 'bg-white border-slate-200 hover:border-blue-400 text-slate-900'
                        }`}
                      >
                        <Checkbox checked={item.completed} className="mt-0.5" />
                        <div className="flex-1 text-xs">
                          <span className={item.completed ? 'text-slate-500' : 'font-medium'}>
                            {item.label}
                          </span>
                          {item.completedAt && (
                            <div className="text-[10px] text-emerald-700 font-mono no-underline mt-0.5">
                              Completed {item.completedAt} {item.completedBy ? `by ${item.completedBy}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Checklist Item Form */}
                  <div className="flex gap-2 pt-2">
                    <Input
                      placeholder="Add specific test, safety isolation, or sign-off item..."
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      onPressEnter={handleAddTask}
                      className="rounded-lg text-xs"
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddTask}
                      className="rounded-lg text-xs bg-blue-600"
                    >
                      Add Item
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'materials',
              label: `Materials (${selectedJob.materials.length})`,
              children: (
                <div className="space-y-5 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase m-0">Parts & Materials Used</h4>
                      <span className="text-[11px] text-slate-600">
                        Total materials cost: <strong>${selectedJob.materials.reduce((acc, m) => acc + m.totalCost, 0).toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>

                  <Table
                    columns={materialsColumns}
                    dataSource={selectedJob.materials}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    className="border border-slate-200 rounded-lg overflow-hidden"
                  />

                  {/* Add Material Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="text-xs font-bold text-slate-900">Add Part / Consumable to Job</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <Input
                        placeholder="Part description..."
                        value={matName}
                        onChange={(e) => setMatName(e.target.value)}
                        className="sm:col-span-2 text-xs"
                      />
                      <Input
                        placeholder="Part / SKU # (optional)"
                        value={matPartNum}
                        onChange={(e) => setMatPartNum(e.target.value)}
                        className="text-xs"
                      />
                      <div className="flex gap-2">
                        <InputNumber
                          min={1}
                          value={matQty}
                          onChange={(v) => setMatQty(v || 1)}
                          className="w-20 text-xs"
                        />
                        <InputNumber
                          min={0}
                          prefix="$"
                          value={matCost}
                          onChange={(v) => setMatCost(v || 0)}
                          className="w-24 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={handleAddMaterial}
                      size="small"
                      className="bg-blue-600 text-xs"
                    >
                      Log Part into Job Inventory
                    </Button>
                  </div>
                </div>
              ),
            },
            {
              key: 'timeline',
              label: `Activity Log (${selectedJob.notes.length})`,
              children: (
                <div className="space-y-6 pt-2">
                  {/* Add note input */}
                  <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <Input.TextArea
                      rows={2}
                      placeholder="Add technician observation, safety hazard notice, or client update..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="text-xs rounded-lg"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="primary"
                        size="small"
                        onClick={handleAddNote}
                        className="bg-blue-600 text-xs rounded-md"
                      >
                        Post Note
                      </Button>
                    </div>
                  </div>

                  {/* Timeline */}
                  <Timeline
                    className="pt-2"
                    items={selectedJob.notes.map((n) => ({
                      color: n.type === 'client' ? 'blue' : n.type === 'parts' ? 'purple' : 'gray',
                      children: (
                        <div className="text-xs space-y-0.5 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{n.author}</span>
                            <span className="text-[10px] text-slate-600 font-mono">{n.timestamp}</span>
                            {n.type && (
                              <Tag color={n.type === 'client' ? 'blue' : 'default'} className="text-[10px] py-0 px-1">
                                {n.type}
                              </Tag>
                            )}
                          </div>
                          <p className="text-slate-700 m-0 leading-relaxed bg-white p-2.5 rounded border border-slate-100">
                            {n.text}
                          </p>
                        </div>
                      ),
                    }))}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </Drawer>
  );
};
