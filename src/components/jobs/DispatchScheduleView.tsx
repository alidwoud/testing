import React, { useState } from 'react';
import { Card, Tag, Button, Select, Avatar, Tooltip, Space, Badge } from 'antd';
import {
  CalendarOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  UserOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { Job, JobPriority } from '../../types/jobTypes.ts';

const DAYS = [
  { label: 'Monday, 19 Oct', dateStr: '2026-10-19', isToday: true },
  { label: 'Tuesday, 20 Oct', dateStr: '2026-10-20', isToday: false },
  { label: 'Wednesday, 21 Oct', dateStr: '2026-10-21', isToday: false },
  { label: 'Thursday, 22 Oct', dateStr: '2026-10-22', isToday: false },
  { label: 'Friday, 23 Oct', dateStr: '2026-10-23', isToday: false },
];

export const DispatchScheduleView: React.FC = () => {
  const { jobs, technicians, setSelectedJob, setIsCreateJobModalOpen } = useJobs();
  const [selectedDate, setSelectedDate] = useState('2026-10-19');

  const selectedDayJobs = jobs.filter((j) => j.scheduledDate === selectedDate);

  return (
    <div className="space-y-6 pb-12">
      {/* Schedule Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 m-0">
            Field Dispatch & Crew Schedule Matrix
          </h2>
          <span className="text-xs text-slate-600">
            Real-time technician assignments and timeline dispatches
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateJobModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium"
          >
            Dispatch Job
          </Button>
        </div>
      </div>

      {/* Day Selector Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {DAYS.map((day) => {
          const count = jobs.filter((j) => j.scheduledDate === day.dateStr).length;
          const isSelected = selectedDate === day.dateStr;

          return (
            <div
              key={day.dateStr}
              onClick={() => setSelectedDate(day.dateStr)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all text-center ${
                isSelected
                  ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                  : 'bg-white border-slate-200 hover:border-blue-400 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <span className={`text-xs font-semibold ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                  {day.label}
                </span>
                {day.isToday && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white text-blue-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    TODAY
                  </span>
                )}
              </div>
              <div
                className={`text-sm font-mono font-bold mt-1.5 ${
                  isSelected ? 'text-blue-100' : 'text-slate-600'
                }`}
              >
                {count} {count === 1 ? 'Dispatch' : 'Dispatches'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid: Technician Rows vs Time Allocation */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase">
            Technician Deployment for {DAYS.find((d) => d.dateStr === selectedDate)?.label}
          </span>
          <span className="text-xs text-slate-600">
            {selectedDayJobs.length} scheduled work orders
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {technicians.map((tech) => {
            const techJobs = selectedDayJobs.filter((j) => j.assignedTechIds.includes(tech.id));

            return (
              <div
                key={tech.id}
                className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col lg:flex-row lg:items-center gap-4"
              >
                {/* Tech Profile Summary (Left) */}
                <div className="w-full lg:w-64 shrink-0 flex items-center gap-3">
                  <Avatar src={tech.avatar} size={42} className="border border-slate-200" />
                  <div>
                    <div className="font-bold text-xs text-slate-900 leading-snug">{tech.name}</div>
                    <div className="text-[11px] text-slate-600">{tech.trade}</div>
                    <div className="text-[10px] font-mono text-slate-600 mt-0.5">{tech.vehicleId}</div>
                  </div>
                </div>

                {/* Tech Assigned Jobs in this day (Right Timeline Block) */}
                <div className="flex-1">
                  {techJobs.length === 0 ? (
                    <div className="text-xs text-slate-600 italic py-2">
                      Available for on-call dispatch / Standby
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {techJobs.map((job) => (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJob(job)}
                          className="bg-white p-3 rounded-lg border border-slate-200 hover:border-blue-500 hover:shadow-2xs cursor-pointer transition-all space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-blue-700">
                              {job.jobCode}
                            </span>
                            <span className="text-xs font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {job.scheduledStartTime} – {job.scheduledEndTime}
                            </span>
                          </div>

                          <div className="font-semibold text-xs text-slate-900 truncate">
                            {job.title}
                          </div>

                          <div className="text-[11px] text-slate-600 flex items-center gap-1 truncate">
                            <EnvironmentOutlined />
                            <span className="truncate">{job.clientName} · {job.siteCity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
