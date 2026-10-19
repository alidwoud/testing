import React from 'react';
import { Card, Tag, Avatar, Button, Rate, Tooltip, Row, Col } from 'antd';
import {
  PhoneOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';

export const TechniciansView: React.FC = () => {
  const { technicians, jobs, setSelectedJob } = useJobs();

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 m-0">Field Technicians Roster</h2>
          <span className="text-xs text-slate-600">
            {technicians.length} licensed trade specialists across Electrical, HVAC, Plumbing, Fire & Controls
          </span>
        </div>
      </div>

      {/* Grid of Technician Cards */}
      <Row gutter={[16, 16]}>
        {technicians.map((tech) => {
          const currentJob = jobs.find((j) => j.id === tech.currentJobId);

          return (
            <Col key={tech.id} xs={24} md={12} lg={8}>
              <Card className="border-slate-200 rounded-xl shadow-2xs hover:border-blue-400 transition-all h-full flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Header: Avatar, Name, Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={tech.avatar} size={52} className="border-2 border-slate-200 shadow-2xs" />
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 leading-snug m-0">
                          {tech.name}
                        </h3>
                        <div className="text-xs text-blue-600 font-medium">{tech.role}</div>
                        <div className="text-[11px] text-slate-600">{tech.trade}</div>
                      </div>
                    </div>

                    <Tag
                      color={tech.status === 'On Job' ? 'processing' : 'success'}
                      className="m-0 text-xs font-semibold px-2 py-0.5"
                    >
                      {tech.status}
                    </Tag>
                  </div>

                  {/* Active Job Alert / Link */}
                  {currentJob ? (
                    <div
                      onClick={() => setSelectedJob(currentJob)}
                      className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-lg cursor-pointer hover:bg-blue-100/60 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] text-blue-900 font-semibold mb-0.5">
                        <span className="flex items-center gap-1">
                          <ThunderboltOutlined className="text-blue-600" />
                          Currently On Site:
                        </span>
                        <span className="font-mono text-xs">{currentJob.jobCode}</span>
                      </div>
                      <div className="text-xs text-slate-800 font-medium truncate">
                        {currentJob.title}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-xs text-slate-600 flex items-center gap-1.5">
                      <CheckCircleOutlined className="text-emerald-500" />
                      Available for immediate dispatch
                    </div>
                  )}

                  {/* Contact & Equipment Specs */}
                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <PhoneOutlined /> Phone:
                      </span>
                      <a href={`tel:${tech.phone}`} className="font-mono font-medium text-slate-800 hover:text-blue-600">
                        {tech.phone}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MailOutlined /> Email:
                      </span>
                      <a href={`mailto:${tech.email}`} className="text-slate-800 hover:text-blue-600 truncate max-w-[160px]">
                        {tech.email}
                      </a>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CarOutlined /> Vehicle / Fleet:
                      </span>
                      <span className="font-mono font-medium text-slate-700">{tech.vehicleId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Standard Rate:</span>
                      <span className="font-mono font-bold text-slate-900">${tech.hourlyRate}/hr</span>
                    </div>
                  </div>

                  {/* Certifications Tags */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                      <SafetyCertificateOutlined className="text-blue-600" />
                      Verified Licences & Accreditations:
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tech.certifications.map((cert) => (
                        <span
                          key={cert}
                          className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                        >
                          {cert}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Stats */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-mono">
                    <strong>{tech.completedJobsCount}</strong> jobs completed
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-amber-600">{tech.rating}</span>
                    <Rate disabled defaultValue={tech.rating} allowHalf className="text-xs text-amber-500" />
                  </div>
                </div>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};
