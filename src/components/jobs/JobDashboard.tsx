import React from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Progress,
  Button,
  Tag,
  Avatar,
  Space,
  Alert,
  Tooltip,
  Typography,
} from 'antd';
import {
  ThunderboltOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  DollarCircleOutlined,
  TeamOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ArrowRightOutlined,
  PlusOutlined,
  DatabaseOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { Job, JobStatus, JobPriority } from '../../types/jobTypes.ts';

const { Title, Text, Paragraph } = Typography;

const STATUS_CONFIG: Record<JobStatus, { color: string; label: string }> = {
  New: { color: 'blue', label: 'New Request' },
  Scheduled: { color: 'cyan', label: 'Scheduled' },
  'In Progress': { color: 'processing', label: 'In Progress' },
  'On Hold': { color: 'warning', label: 'On Hold' },
  Completed: { color: 'success', label: 'Completed' },
  Invoiced: { color: 'purple', label: 'Invoiced' },
};

const PRIORITY_CONFIG: Record<JobPriority, { color: string; border: string }> = {
  Emergency: { color: '#ef4444', border: '#fca5a5' },
  High: { color: '#f97316', border: '#fdba74' },
  Medium: { color: '#3b82f6', border: '#93c5fd' },
  Low: { color: '#64748b', border: '#cbd5e1' },
};

export const JobDashboard: React.FC = () => {
  const {
    jobs,
    technicians,
    metrics,
    setActiveTab,
    setSelectedJob,
    setIsCreateJobModalOpen,
    setIsSupabaseModalOpen,
    setStatusFilter,
  } = useJobs();

  // Urgent jobs
  const urgentJobs = jobs.filter(
    (j) => j.priority === 'Emergency' && j.status !== 'Completed' && j.status !== 'Invoiced'
  );

  // Today's scheduled jobs
  const todayStr = '2026-10-19';
  const todayJobs = jobs.filter((j) => j.scheduledDate === todayStr);

  const handleStatusCardClick = (status: JobStatus) => {
    setStatusFilter(status);
    setActiveTab('jobs');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md">
              Operations Center
            </span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-600">Melbourne Regional Dispatch</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1 mb-0">
            Field Service & Job Operations Dashboard
          </h1>
          <p className="text-sm text-slate-600 mt-1 mb-0">
            {metrics.activeJobs} active work orders in queue · {metrics.inProgressCount} field crews deployed on site today.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            icon={<DatabaseOutlined />}
            onClick={() => setIsSupabaseModalOpen(true)}
            className="rounded-lg"
          >
            Supabase Schema
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateJobModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 rounded-lg h-9 font-medium"
          >
            New Work Order
          </Button>
        </div>
      </div>

      {/* Critical / Emergency Alerts (if any) */}
      {urgentJobs.length > 0 && (
        <Alert
          message={
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <AlertOutlined className="text-red-600 text-base" />
                <span className="font-semibold text-slate-900 text-sm">
                  {urgentJobs.length} Emergency Priority Work Order{urgentJobs.length > 1 ? 's' : ''} Requiring Immediate Dispatch
                </span>
                <span className="text-slate-600 text-xs hidden sm:inline">
                  — High temperature busbar alert & basement sump pump overflow
                </span>
              </div>
              <div className="flex items-center gap-2">
                {urgentJobs.map((j) => (
                  <Button
                    key={j.id}
                    size="small"
                    danger
                    onClick={() => setSelectedJob(j)}
                    className="text-xs rounded-md"
                  >
                    View {j.jobCode}
                  </Button>
                ))}
              </div>
            </div>
          }
          type="error"
          showIcon={false}
          className="border-red-200 bg-red-50/80 rounded-xl"
        />
      )}

      {/* Primary KPI Statistic Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card 
            hoverable 
            onClick={() => { setStatusFilter('ALL'); setActiveTab('jobs'); }}
            className="border-slate-200 rounded-xl shadow-2xs cursor-pointer hover:border-blue-400 transition-all"
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Active Jobs</span>}
              value={metrics.activeJobs}
              prefix={<ThunderboltOutlined className="text-blue-600 text-lg mr-1.5" />}
              valueStyle={{ fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}
            />
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
              <span>Total recorded:</span>
              <span className="font-mono font-semibold text-slate-700">{metrics.totalJobs}</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card 
            hoverable 
            onClick={() => handleStatusCardClick('In Progress')}
            className="border-slate-200 rounded-xl shadow-2xs cursor-pointer hover:border-blue-400 transition-all"
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">In Progress</span>}
              value={metrics.inProgressCount}
              prefix={<ClockCircleOutlined className="text-blue-500 text-lg mr-1.5" />}
              valueStyle={{ fontWeight: 700, color: '#2563eb', fontFamily: 'monospace' }}
            />
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
              <span>On-site crews:</span>
              <span className="font-mono font-semibold text-blue-600">{metrics.inProgressCount}</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card 
            hoverable 
            onClick={() => { setActiveTab('schedule'); }}
            className="border-slate-200 rounded-xl shadow-2xs cursor-pointer hover:border-blue-400 transition-all"
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Today's Schedule</span>}
              value={metrics.scheduledTodayCount}
              prefix={<CalendarOutlined className="text-cyan-600 text-lg mr-1.5" />}
              valueStyle={{ fontWeight: 700, color: '#0891b2', fontFamily: 'monospace' }}
            />
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
              <span>Date:</span>
              <span className="font-mono font-semibold text-slate-700">19 Oct 2026</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card 
            hoverable 
            onClick={() => handleStatusCardClick('Completed')}
            className="border-slate-200 rounded-xl shadow-2xs cursor-pointer hover:border-emerald-400 transition-all"
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Completed</span>}
              value={metrics.completedThisWeekCount}
              prefix={<CheckCircleOutlined className="text-emerald-600 text-lg mr-1.5" />}
              valueStyle={{ fontWeight: 700, color: '#059669', fontFamily: 'monospace' }}
            />
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
              <span>Avg turnaround:</span>
              <span className="font-mono font-semibold text-emerald-600">{metrics.averageCompletionHours}h</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card 
            hoverable 
            onClick={() => setActiveTab('technicians')}
            className="border-slate-200 rounded-xl shadow-2xs cursor-pointer hover:border-indigo-400 transition-all"
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Crew Utilization</span>}
              value={metrics.utilizationRatePct}
              suffix="%"
              prefix={<TeamOutlined className="text-indigo-600 text-lg mr-1.5" />}
              valueStyle={{ fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace' }}
            />
            <div className="mt-2">
              <Progress 
                percent={metrics.utilizationRatePct} 
                showInfo={false} 
                strokeColor="#4f46e5" 
                size="small" 
              />
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card 
            hoverable 
            onClick={() => setActiveTab('invoices')}
            className="border-slate-200 rounded-xl shadow-2xs cursor-pointer hover:border-purple-400 transition-all"
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-600 uppercase">Invoiced YTD</span>}
              value={metrics.totalInvoicedValue}
              prefix={<DollarCircleOutlined className="text-purple-600 text-lg mr-1.5" />}
              formatter={(val) => `$${Number(val).toLocaleString()}`}
              valueStyle={{ fontWeight: 700, color: '#7c3aed', fontFamily: 'monospace' }}
            />
            <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
              <span>Quoted pipeline:</span>
              <span className="font-mono font-semibold text-slate-700">${metrics.totalQuotedValue.toLocaleString()}</span>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Interactive Status Pipeline Funnel */}
      <Card className="border-slate-200 rounded-xl shadow-2xs p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 m-0">
              Work Order Status Pipeline
            </h3>
            <span className="text-xs text-slate-600">
              Click any status pillar to filter the dispatch board
            </span>
          </div>
          <Button 
            type="link" 
            onClick={() => { setStatusFilter('ALL'); setActiveTab('jobs'); }}
            className="p-0 text-xs font-semibold text-blue-600 flex items-center gap-1"
          >
            Open Full Pipeline <ArrowRightOutlined />
          </Button>
        </div>

        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(['New', 'Scheduled', 'In Progress', 'On Hold', 'Completed', 'Invoiced'] as JobStatus[]).map((st) => {
            const count = jobs.filter((j) => j.status === st).length;
            const pct = Math.round((count / (jobs.length || 1)) * 100);
            return (
              <div
                key={st}
                onClick={() => handleStatusCardClick(st)}
                className="bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-300 p-3.5 rounded-lg cursor-pointer transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{STATUS_CONFIG[st].label}</span>
                  <Tag color={STATUS_CONFIG[st].color} className="m-0 text-[11px] font-mono px-1.5">
                    {count}
                  </Tag>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                    <span>{pct}% share</span>
                  </div>
                  <Progress percent={pct} size="small" showInfo={false} strokeColor="#2563eb" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Main Grid: Today's Schedule & Live Field Status */}
      <Row gutter={[16, 16]}>
        {/* Left: Today's Scheduled Dispatches (8 Cols) */}
        <Col xs={24} lg={16}>
          <Card 
            title={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <CalendarOutlined className="text-blue-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    Today's Priority Field Dispatches
                  </span>
                  <span className="text-xs text-slate-600 font-normal">
                    ({todayJobs.length} scheduled jobs)
                  </span>
                </div>
                <Button 
                  size="small" 
                  onClick={() => setActiveTab('schedule')}
                  className="text-xs"
                >
                  View Schedule Matrix
                </Button>
              </div>
            }
            className="border-slate-200 rounded-xl shadow-2xs"
          >
            <div className="divide-y divide-slate-100">
              {todayJobs.map((job) => {
                const assigned = technicians.filter((t) => job.assignedTechIds.includes(t.id));
                const completedTasks = job.checklist.filter((t) => t.completed).length;
                const totalTasks = job.checklist.length;
                const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="py-4 hover:bg-slate-50/80 px-2 rounded-lg cursor-pointer transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {job.jobCode}
                        </span>
                        <Tag 
                          color={job.priority === 'Emergency' ? 'red' : job.priority === 'High' ? 'orange' : 'blue'}
                          className="text-[11px] font-medium"
                        >
                          {job.priority}
                        </Tag>
                        <Tag color={STATUS_CONFIG[job.status].color} className="text-[11px]">
                          {job.status}
                        </Tag>
                        <span className="text-xs text-slate-600">
                          {job.workOrderType}
                        </span>
                      </div>

                      <div className="font-semibold text-slate-900 text-sm hover:text-blue-600 transition-colors">
                        {job.title}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                        <span className="font-medium text-slate-700">{job.clientName}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <EnvironmentOutlined className="text-slate-600" />
                          {job.siteAddress}, {job.siteCity}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1 font-mono text-slate-700">
                          <ClockCircleOutlined className="text-slate-600" />
                          {job.scheduledStartTime} – {job.scheduledEndTime}
                        </span>
                      </div>
                    </div>

                    {/* Technicians & Task Progress */}
                    <div className="flex items-center gap-5 shrink-0 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-600 mb-0.5">
                          Tasks ({completedTasks}/{totalTasks})
                        </div>
                        <Progress 
                          percent={taskPct} 
                          size="small" 
                          className="w-24 m-0"
                          strokeColor={taskPct === 100 ? '#10b981' : '#3b82f6'}
                        />
                      </div>

                      <Avatar.Group max={{ count: 2 }} size={32}>
                        {assigned.map((tech) => (
                          <Tooltip key={tech.id} title={`${tech.name} (${tech.trade})`}>
                            <Avatar src={tech.avatar} className="border-2 border-white shadow-2xs" />
                          </Tooltip>
                        ))}
                      </Avatar.Group>

                      <Button 
                        type="text" 
                        size="small" 
                        icon={<ArrowRightOutlined className="text-slate-600" />} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* Right: Field Technicians Live Status & Trade Breakdown (8 Cols) */}
        <Col xs={24} lg={8} className="space-y-4">
          {/* Active Field Technicians */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TeamOutlined className="text-blue-600" />
                  <span className="font-bold text-slate-900 text-sm">Field Technicians</span>
                </div>
                <Button size="small" type="link" onClick={() => setActiveTab('technicians')}>
                  All Crew ({technicians.length})
                </Button>
              </div>
            }
            className="border-slate-200 rounded-xl shadow-2xs"
          >
            <div className="space-y-3">
              {technicians.slice(0, 5).map((tech) => (
                <div 
                  key={tech.id} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar src={tech.avatar} size={36} className="border border-slate-200" />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{tech.name}</div>
                      <div className="text-[11px] text-slate-600">{tech.trade}</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <Tag 
                      color={tech.status === 'On Job' ? 'processing' : 'success'} 
                      className="m-0 text-[11px]"
                    >
                      {tech.status}
                    </Tag>
                    {tech.currentJobCode && (
                      <div className="text-[10px] font-mono text-blue-600 mt-0.5">
                        {tech.currentJobCode}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Quick Work Order Types Breakdown */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <SafetyCertificateOutlined className="text-blue-600" />
                <span className="font-bold text-slate-900 text-sm">Work Order Scope Split</span>
              </div>
            }
            className="border-slate-200 rounded-xl shadow-2xs"
          >
            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Preventative Maintenance</span>
                  <span className="font-semibold text-slate-800">42%</span>
                </div>
                <Progress percent={42} strokeColor="#3b82f6" size="small" showInfo={false} />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Emergency Callouts</span>
                  <span className="font-semibold text-slate-800">25%</span>
                </div>
                <Progress percent={25} strokeColor="#ef4444" size="small" showInfo={false} />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">New Equipment Installation</span>
                  <span className="font-semibold text-slate-800">18%</span>
                </div>
                <Progress percent={18} strokeColor="#10b981" size="small" showInfo={false} />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Safety Compliance Inspections</span>
                  <span className="font-semibold text-slate-800">15%</span>
                </div>
                <Progress percent={15} strokeColor="#8b5cf6" size="small" showInfo={false} />
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
