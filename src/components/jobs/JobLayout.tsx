import React, { useState } from 'react';
import { Layout, Menu, ConfigProvider, theme, Badge } from 'antd';
import {
  DashboardOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  TeamOutlined,
  ShopOutlined,
  DollarOutlined,
  DatabaseOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
} from '@ant-design/icons';
import { useJobs } from '../../context/JobContext.tsx';
import { JobHeader } from './JobHeader.tsx';
import { JobDashboard } from './JobDashboard.tsx';
import { JobListView } from './JobListView.tsx';
import { DispatchScheduleView } from './DispatchScheduleView.tsx';
import { TechniciansView } from './TechniciansView.tsx';
import { ClientsView } from './ClientsView.tsx';
import { InvoicesView } from './InvoicesView.tsx';
import { JobDetailDrawer } from './JobDetailDrawer.tsx';
import { CreateJobModal } from './CreateJobModal.tsx';
import { SupabaseSqlModal } from './SupabaseSqlModal.tsx';

const { Sider, Content } = Layout;

export const JobLayout: React.FC = () => {
  const { activeTab, setActiveTab, metrics, setIsSupabaseModalOpen } = useJobs();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'jobs',
      icon: <ThunderboltOutlined />,
      label: (
        <div className="flex items-center justify-between pr-2">
          <span>Work Orders</span>
          <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded-full">
            {metrics.activeJobs}
          </span>
        </div>
      ),
    },
    {
      key: 'schedule',
      icon: <CalendarOutlined />,
      label: (
        <div className="flex items-center justify-between pr-2">
          <span>Schedule & Dispatch</span>
          <span className="text-[10px] font-mono text-slate-500 font-semibold">
            {metrics.scheduledTodayCount} today
          </span>
        </div>
      ),
    },
    {
      key: 'technicians',
      icon: <TeamOutlined />,
      label: 'Field Technicians',
    },
    {
      key: 'clients',
      icon: <ShopOutlined />,
      label: 'Client Accounts',
    },
    {
      key: 'invoices',
      icon: <DollarOutlined />,
      label: 'Invoices & Billing',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'supabase',
      icon: <DatabaseOutlined className="text-emerald-500" />,
      label: (
        <span className="text-emerald-600 font-medium">
          Supabase SQL DDL
        </span>
      ),
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'supabase') {
      setIsSupabaseModalOpen(true);
    } else {
      setActiveTab(key);
    }
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb',
          colorInfo: '#2563eb',
          borderRadius: 8,
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorText: '#0f172a',
          colorTextSecondary: '#475569',
          colorBorderSecondary: '#e2e8f0',
        },
        components: {
          Card: {
            headerFontSize: 14,
            paddingLG: 20,
          },
          Table: {
            headerBg: '#f8fafc',
            headerColor: '#475569',
            rowHoverBg: '#f1f5f9',
          },
          Menu: {
            itemSelectedBg: '#eff6ff',
            itemSelectedColor: '#1d4ed8',
          },
        },
      }}
    >
      <Layout className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">
        {/* Sider Navigation */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={(value) => setCollapsed(value)}
          width={240}
          className="bg-white border-r border-slate-200 sticky top-0 h-screen z-30"
          theme="light"
          trigger={null}
        >
          {/* Sider Header Brand */}
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            {!collapsed ? (
              <div 
                onClick={() => setActiveTab('dashboard')} 
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  ⚡
                </div>
                <div>
                  <div className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">
                    MAXIM <span className="text-blue-600 font-semibold">Jobs</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">Job Management</div>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => setActiveTab('dashboard')} 
                className="w-8 h-8 mx-auto rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs cursor-pointer"
              >
                ⚡
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>

          {/* Sider Navigation Menu */}
          <Menu
            mode="inline"
            selectedKeys={[activeTab]}
            onClick={handleMenuClick}
            items={menuItems}
            className="border-r-0 py-3 text-xs font-medium"
          />

          {/* Sider Bottom Stats */}
          {!collapsed && (
            <div className="absolute bottom-4 left-3 right-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex items-center justify-between font-medium">
                <span>Crew Online:</span>
                <span className="font-mono font-bold text-emerald-600">6 Technicians</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>App Mode:</span>
                <span className="font-medium text-slate-800">Ant Design v5</span>
              </div>
            </div>
          )}
        </Sider>

        {/* Main Content Area */}
        <Layout className="bg-slate-50 min-h-screen">
          <JobHeader />

          <Content className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && <JobDashboard />}
            {activeTab === 'jobs' && <JobListView />}
            {activeTab === 'schedule' && <DispatchScheduleView />}
            {activeTab === 'technicians' && <TechniciansView />}
            {activeTab === 'clients' && <ClientsView />}
            {activeTab === 'invoices' && <InvoicesView />}
          </Content>
        </Layout>

        {/* Global Modals & Drawers */}
        <JobDetailDrawer />
        <CreateJobModal />
        <SupabaseSqlModal />
      </Layout>
    </ConfigProvider>
  );
};
