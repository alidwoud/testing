import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ChevronRight, Home, Building2, ArrowLeft } from 'lucide-react';

interface BreadcrumbsProps {
  customItems?: { label: string; onClick?: () => void; active?: boolean }[];
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ customItems }) => {
  const {
    activeProject,
    activeTab,
    setActiveTab,
    selectedEquipmentId,
    setSelectedEquipmentId,
    selectedCableId,
    setSelectedCableId,
    selectedItrId,
    setSelectedItrId,
  } = useApp();

  if (!activeProject) return null;

  // Derive contextual trail based on current active tab and selected items
  const tabNames: Record<string, string> = {
    home: 'Home',
    today: 'Home',
    'my-work': 'My Work',
    workforce: 'Workforce',
    itrs: 'Quality & Inspections',
    qa: 'Quality & Inspections',
    testing: 'Testing & Measurements',
    issues: 'Issues',
    photos: 'Photos',
    maps: 'Drawings & Plans',
    locations: 'Locations & Rooms',
    equipment: 'Equipment',
    cables: 'Cables',
    project: 'Project Hub',
    reports: 'Reports',
    history: 'Audit Trail',
    readiness: 'Project Readiness',
  };

  const items: { label: string; onClick?: () => void; active?: boolean }[] = [];

  // Project Root
  items.push({
    label: activeProject.name || activeProject.code,
    onClick: () => {
      setSelectedEquipmentId(null);
      setSelectedCableId(null);
      setSelectedItrId(null);
      setActiveTab('home');
    },
  });

  if (customItems && customItems.length > 0) {
    items.push(...customItems);
  } else {
    // Current primary section
    const currentSectionName = tabNames[activeTab] || 'Section';
    const isAtSectionRoot =
      !selectedEquipmentId && !selectedCableId && !selectedItrId;

    items.push({
      label: currentSectionName,
      onClick: isAtSectionRoot
        ? undefined
        : () => {
            setSelectedEquipmentId(null);
            setSelectedCableId(null);
            setSelectedItrId(null);
          },
      active: isAtSectionRoot,
    });

    // Deep object drilling
    if (activeTab === 'equipment' && selectedEquipmentId) {
      items.push({
        label: `Equipment #${selectedEquipmentId}`,
        active: true,
      });
    } else if (activeTab === 'cables' && selectedCableId) {
      items.push({
        label: `Cable #${selectedCableId}`,
        active: true,
      });
    } else if (activeTab === 'itrs' && selectedItrId) {
      items.push({
        label: `Inspection #${selectedItrId}`,
        active: true,
      });
    }
  }

  // If we're at home with no sub-items, breadcrumbs are optional/quiet
  if (items.length <= 1 && (activeTab === 'home' || activeTab === 'today')) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className="flex items-center space-x-1.5 text-xs text-slate-400 mb-4 bg-slate-900/60 dark:bg-slate-900/40 border border-slate-800/80 rounded-xl px-3 py-2 overflow-x-auto no-scrollbar"
    >
      <button
        onClick={() => {
          setSelectedEquipmentId(null);
          setSelectedCableId(null);
          setSelectedItrId(null);
          setActiveTab('home');
        }}
        className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
        title="Return to Project Home"
      >
        <Building2 className="w-3.5 h-3.5 text-amber-400" />
      </button>

      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {isLast || item.active || !item.onClick ? (
              <span className="font-semibold text-white truncate max-w-[200px]">
                {item.label}
              </span>
            ) : (
              <button
                onClick={item.onClick}
                className="hover:text-amber-400 hover:underline transition-colors text-slate-300 font-medium truncate max-w-[180px] cursor-pointer"
              >
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}

      {items.length > 2 && (
        <button
          onClick={() => {
            const previousItem = items[items.length - 2];
            if (previousItem?.onClick) previousItem.onClick();
          }}
          className="ml-auto flex items-center space-x-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors shrink-0 pl-2 cursor-pointer"
          title="Go back to previous level"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back</span>
        </button>
      )}
    </nav>
  );
};
