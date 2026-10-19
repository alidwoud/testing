import React from 'react';
import { Layout, Input, Button, Badge, Avatar, Space, Dropdown, MenuProps, Tag } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  BellOutlined,
  DatabaseOutlined,
  UserOutlined,
  ReloadOutlined,
  DownloadOutlined,
  ThunderboltFilled,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';

const { Header } = Layout;

export const JobHeader: React.FC = () => {
  const {
    searchQuery,
    setSearchQuery,
    setIsCreateJobModalOpen,
    setIsSupabaseModalOpen,
    resetToSampleData,
    exportJobsCsv,
    metrics,
    activeTab,
    setActiveTab,
  } = useJobs();

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'role',
      label: (
        <div>
          <div className="font-semibold text-slate-800">Dispatch Controller</div>
          <div className="text-xs text-slate-500">ops@forgejobs.com.au</div>
        </div>
      ),
    },
    { type: 'divider' },
    {
      key: 'reset',
      icon: <ReloadOutlined />,
      label: 'Reset to Sample Data',
      onClick: resetToSampleData,
    },
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: 'Export All Jobs (CSV)',
      onClick: exportJobsCsv,
    },
    {
      key: 'supabase',
      icon: <DatabaseOutlined />,
      label: 'Supabase SQL Schema',
      onClick: () => setIsSupabaseModalOpen(true),
    },
  ];

  return (
    <Header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Brand / Logo */}
      <div className="flex items-center gap-6">
        <div 
          onClick={() => setActiveTab('dashboard')} 
          className="flex items-center gap-2.5 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:bg-blue-700 transition-colors">
            <ThunderboltFilled className="text-lg" />
          </div>
          <div>
            <div className="font-bold text-base text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              FORGE <span className="text-blue-600 font-semibold text-sm">Jobs</span>
            </div>
            <div className="text-[11px] text-slate-600 font-medium tracking-wide">
              Field Operations & Dispatch
            </div>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:block w-72 lg:w-96">
          <Input
            placeholder="Search jobs, clients, addresses, codes..."
            prefix={<SearchOutlined className="text-slate-600" />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTab === 'dashboard' && e.target.value.trim().length > 0) {
                setActiveTab('jobs');
              }
            }}
            allowClear
            className="rounded-lg bg-slate-50 border-slate-200 hover:bg-white focus:bg-white"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Supabase Schema quick button */}
        <Button
          icon={<DatabaseOutlined />}
          onClick={() => setIsSupabaseModalOpen(true)}
          className="hidden sm:inline-flex rounded-lg border-slate-300 text-slate-700 hover:text-blue-600 hover:border-blue-600"
        >
          Supabase SQL
        </Button>

        {/* Create Job Primary Action */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateJobModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 font-medium rounded-lg shadow-xs h-9 px-4"
        >
          New Work Order
        </Button>

        {/* Notification bell */}
        <Badge count={metrics.overdueEmergencyCount} overflowCount={9} offset={[-2, 2]}>
          <Button
            type="text"
            icon={<BellOutlined className="text-lg text-slate-600" />}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100"
            onClick={() => setActiveTab('jobs')}
          />
        </Badge>

        {/* User profile dropdown */}
        <Dropdown menu={{ items: userMenuItems }} trigger={['click']} placement="bottomRight">
          <div className="flex items-center gap-2 pl-2 cursor-pointer select-none">
            <Avatar 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250" 
              icon={<UserOutlined />} 
              size={36} 
              className="border border-slate-200 shadow-2xs" 
            />
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-slate-800 leading-tight">Marcus Callahan</div>
              <div className="text-[10px] text-slate-600 font-medium">Duty Controller</div>
            </div>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
};
