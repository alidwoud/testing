import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Home,
  CheckSquare,
  QrCode,
  Camera,
  MoreHorizontal,
  Users,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  FolderKanban,
  BarChart3,
  MapPin,
  Award,
  X,
} from 'lucide-react';
import { MoreMenuModal } from './MoreMenuModal.tsx';

interface PrimaryNavTab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeType?: 'default' | 'alert';
  isAction?: boolean;
}

export const Navigation: React.FC = () => {
  const {
    currentUser,
    activeProject,
    activeTab,
    setActiveTab,
    setIsQrModalOpen,
    stats,
  } = useApp();

  const [isMoreOpen, setIsMoreOpen] = useState(false);

  if (!activeProject) return null;

  const role = currentUser.role;

  // Determine role classification
  const isTradie =
    role === 'Tradesperson' ||
    role === 'Viewer' ||
    role === 'Client';

  const isSupervisor = role === 'Supervisor' || role === 'Leading Hand';
  const isQaManager = role === 'QA Manager';
  const isAdmin = role === 'Administrator' || role === 'Project Manager';

  // Helper to format actionable counts (never show 10008 or 4999; format as 99+ if very large)
  const formatBadge = (rawCount: number | undefined): string | number | undefined => {
    if (rawCount === undefined || rawCount <= 0) return undefined;
    if (rawCount > 99) return '99+';
    return rawCount;
  };

  // 1. Build primary navigation choices based on role
  let primaryTabs: PrimaryNavTab[] = [];

  if (isTradie) {
    // TRADESPERSON NAVIGATION: HOME | MY WORK | SCAN | PHOTOS | MORE
    primaryTabs = [
      { id: 'home', label: 'HOME', icon: Home },
      {
        id: 'my-work',
        label: 'MY WORK',
        icon: CheckSquare,
        badge: formatBadge(4), // Actionable count (3 inspections + 1 issue)
      },
      { id: 'scan', label: 'SCAN', icon: QrCode, isAction: true },
      { id: 'photos', label: 'PHOTOS', icon: Camera },
    ];
  } else if (isSupervisor) {
    // SUPERVISOR / LEADING HAND: HOME | WORKFORCE | LOCATIONS | ISSUES | MORE
    primaryTabs = [
      { id: 'home', label: 'HOME', icon: Home },
      { id: 'workforce', label: 'WORKFORCE', icon: Users },
      { id: 'locations', label: 'LOCATIONS', icon: MapPin },
      { id: 'issues', label: 'ISSUES', icon: AlertTriangle, badge: formatBadge(stats?.openIssues || 1), badgeType: 'alert' },
    ];
  } else if (isQaManager) {
    // QA MANAGER: HOME | QA | TESTING | ISSUES | MORE
    primaryTabs = [
      { id: 'home', label: 'HOME', icon: Home },
      { id: 'itrs', label: 'QA', icon: ClipboardCheck, badge: formatBadge(14) }, // 14 awaiting review
      { id: 'testing', label: 'TESTING', icon: TrendingUp, badge: formatBadge(8) }, // 8 testing due
      { id: 'issues', label: 'ISSUES', icon: AlertTriangle, badge: formatBadge(2), badgeType: 'alert' },
    ];
  } else {
    // PROJECT MANAGER / ADMINISTRATOR: HOME | WORKFORCE | LOCATIONS | ISSUES | MORE
    primaryTabs = [
      { id: 'home', label: 'HOME', icon: Home },
      { id: 'workforce', label: 'WORKFORCE', icon: Users },
      { id: 'locations', label: 'LOCATIONS', icon: MapPin },
      { id: 'issues', label: 'ISSUES', icon: AlertTriangle, badge: formatBadge(stats?.openIssues || 1), badgeType: 'alert' },
    ];
  }

  // Check if current active tab is one of the primary tabs (or today alias)
  const isPrimaryTabActive =
    primaryTabs.some((t) => t.id === activeTab) ||
    (activeTab === 'today' && primaryTabs.some((t) => t.id === 'home'));

  // Friendly names for secondary modules
  const secondaryTabNames: Record<string, string> = {
    maps: 'Drawings & Plans',
    locations: 'Locations & Rooms',
    equipment: 'Equipment Register',
    cables: 'Cable Register',
    photos: 'Photos & Evidence',
    testing: 'Testing & Measurements',
    history: 'Audit Trail',
    readiness: 'Project Readiness',
    project: 'Project Hub',
    reports: 'Reports Hub',
    issues: 'Issues & Defect Register',
    training: 'Training & Licences',
  };

  const handleTabClick = (tab: PrimaryNavTab) => {
    if (tab.isAction && tab.id === 'scan') {
      setIsQrModalOpen(true);
      return;
    }
    setActiveTab(tab.id);
  };

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-16 z-30 select-none shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Primary Navigation Tabs */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto no-scrollbar scrollbar-none py-1.5">
              {primaryTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive =
                  activeTab === tab.id || (tab.id === 'home' && activeTab === 'today');

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab)}
                    type="button"
                    className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 shadow-sm font-black ring-1 ring-amber-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-slate-950' : tab.id === 'scan' ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span>{tab.label}</span>

                    {tab.badge !== undefined && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ml-0.5 transition-colors ${
                          isActive
                            ? 'bg-slate-950 text-amber-400'
                            : tab.badgeType === 'alert'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* MORE Destination */}
              <button
                type="button"
                onClick={() => setIsMoreOpen(true)}
                className={`flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
                  !isPrimaryTabActive
                    ? 'bg-slate-800 text-amber-400 border border-amber-500/50 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <MoreHorizontal className="w-4 h-4 shrink-0" />
                <span>MORE</span>
                {!isPrimaryTabActive && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
                )}
              </button>
            </div>

            {/* Right Side: Context Indicator when in secondary view */}
            <div className="flex items-center space-x-2 shrink-0">
              {!isPrimaryTabActive && (
                <div className="hidden md:flex items-center space-x-2 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-xl text-xs">
                  <span className="text-slate-400">Viewing:</span>
                  <span className="font-bold text-amber-400">
                    {secondaryTabNames[activeTab] || activeTab}
                  </span>
                  <button
                    onClick={() => setActiveTab('home')}
                    className="ml-1 text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-700 cursor-pointer"
                    title="Return to Home"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Role-Aware MORE Menu Slideout */}
      <MoreMenuModal isOpen={isMoreOpen} onClose={() => setIsMoreOpen(false)} />
    </>
  );
};
