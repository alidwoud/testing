import React from 'react';
import { Card, Tag, Avatar, Tooltip, Progress, Button, Dropdown, MenuProps, Space } from 'antd';
import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  CheckCircleOutlined,
  MoreOutlined,
  RightOutlined,
  LeftOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { Job, JobStatus, JobPriority } from '../../types/jobTypes.ts';

const STATUS_COLUMNS: { key: JobStatus; title: string; color: string; border: string }[] = [
  { key: 'New', title: 'New Requests', color: 'bg-blue-500', border: 'border-t-blue-500' },
  { key: 'Scheduled', title: 'Scheduled', color: 'bg-cyan-500', border: 'border-t-cyan-500' },
  { key: 'In Progress', title: 'In Progress', color: 'bg-blue-600', border: 'border-t-blue-600' },
  { key: 'On Hold', title: 'On Hold', color: 'bg-amber-500', border: 'border-t-amber-500' },
  { key: 'Completed', title: 'Completed', color: 'bg-emerald-500', border: 'border-t-emerald-500' },
  { key: 'Invoiced', title: 'Invoiced', color: 'bg-purple-500', border: 'border-t-purple-500' },
];

const STATUS_ORDER: JobStatus[] = ['New', 'Scheduled', 'In Progress', 'On Hold', 'Completed', 'Invoiced'];

export const JobKanbanBoard: React.FC<{ filteredJobs: Job[] }> = ({ filteredJobs }) => {
  const { setSelectedJob, updateJobStatus, technicians, setIsCreateJobModalOpen } = useJobs();

  const moveStatus = (jobId: string, currentStatus: JobStatus, direction: 'next' | 'prev') => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    if (direction === 'next' && currentIndex < STATUS_ORDER.length - 1) {
      updateJobStatus(jobId, STATUS_ORDER[currentIndex + 1]);
    } else if (direction === 'prev' && currentIndex > 0) {
      updateJobStatus(jobId, STATUS_ORDER[currentIndex - 1]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-6">
      {STATUS_COLUMNS.map((col) => {
        const columnJobs = filteredJobs.filter((j) => j.status === col.key);

        return (
          <div
            key={col.key}
            className="bg-slate-100/80 rounded-xl p-3 border border-slate-200/70 flex flex-col min-w-[280px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <span className="font-bold text-xs text-slate-800 tracking-tight">
                  {col.title}
                </span>
                <span className="text-[11px] font-mono text-slate-600 font-semibold bg-white border border-slate-200 px-1.5 py-0.2 rounded-full">
                  {columnJobs.length}
                </span>
              </div>

              {col.key === 'New' && (
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setIsCreateJobModalOpen(true)}
                  className="w-6 h-6 p-0 text-slate-600 hover:text-blue-600"
                />
              )}
            </div>

            {/* Column Cards */}
            <div className="space-y-3 min-h-[150px]">
              {columnJobs.map((job) => {
                const assigned = technicians.filter((t) => job.assignedTechIds.includes(t.id));
                const completedTasks = job.checklist.filter((t) => t.completed).length;
                const totalTasks = job.checklist.length;
                const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                const currentIndex = STATUS_ORDER.indexOf(job.status);

                return (
                  <div
                    key={job.id}
                    onClick={() => setSelectedJob(job)}
                    className="bg-white rounded-lg p-3.5 border border-slate-200/80 shadow-2xs hover:shadow-sm hover:border-blue-400 cursor-pointer transition-all space-y-2.5"
                  >
                    {/* Top Row: Code, Priority, and Quick Move */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-700">
                          {job.jobCode}
                        </span>
                        <Tag
                          color={job.priority === 'Emergency' ? 'red' : job.priority === 'High' ? 'orange' : 'blue'}
                          className="m-0 text-[10px] font-medium px-1 py-0"
                        >
                          {job.priority}
                        </Tag>
                      </div>

                      {/* Direction Quick Movers */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        {currentIndex > 0 && (
                          <Tooltip title={`Move back to ${STATUS_ORDER[currentIndex - 1]}`}>
                            <button
                              onClick={() => moveStatus(job.id, job.status, 'prev')}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded text-[10px]"
                            >
                              <LeftOutlined />
                            </button>
                          </Tooltip>
                        )}
                        {currentIndex < STATUS_ORDER.length - 1 && (
                          <Tooltip title={`Advance to ${STATUS_ORDER[currentIndex + 1]}`}>
                            <button
                              onClick={() => moveStatus(job.id, job.status, 'next')}
                              className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded text-[10px]"
                            >
                              <RightOutlined />
                            </button>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    {/* Job Title */}
                    <div className="font-semibold text-slate-900 text-xs leading-snug line-clamp-2">
                      {job.title}
                    </div>

                    {/* Client & Location */}
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      <div className="font-medium text-slate-700 truncate">{job.clientName}</div>
                      <div className="flex items-center gap-1 truncate text-slate-600">
                        <EnvironmentOutlined className="text-[10px]" />
                        <span className="truncate">{job.siteAddress}</span>
                      </div>
                    </div>

                    {/* Task Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600 mb-0.5">
                        <span>Checklist</span>
                        <span className="font-mono">{completedTasks}/{totalTasks}</span>
                      </div>
                      <Progress 
                        percent={taskPct} 
                        size="small" 
                        showInfo={false} 
                        strokeColor={taskPct === 100 ? '#10b981' : '#3b82f6'} 
                      />
                    </div>

                    {/* Footer: Date & Assignees */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-600 font-mono text-[10px]">
                        <ClockCircleOutlined />
                        <span>{job.scheduledDate.slice(5)} {job.scheduledStartTime}</span>
                      </div>

                      <Avatar.Group max={{ count: 2 }} size={22}>
                        {assigned.map((tech) => (
                          <Tooltip key={tech.id} title={`${tech.name} (${tech.trade})`}>
                            <Avatar src={tech.avatar} className="border border-white" />
                          </Tooltip>
                        ))}
                      </Avatar.Group>
                    </div>
                  </div>
                );
              })}

              {columnJobs.length === 0 && (
                <div className="border border-dashed border-slate-300/80 rounded-lg p-6 text-center text-xs text-slate-600">
                  No jobs in {col.title}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
