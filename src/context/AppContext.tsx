import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Project, ProjectStats, ProjectReadinessData } from '../types/index.ts';

export const DEMO_USERS: UserProfile[] = [
  {
    id: 1,
    uid: 'user-supervisor-01',
    email: 'mark.callahan@apexelectrical.com.au',
    name: 'Mark Callahan',
    role: 'Supervisor',
    companyName: 'Apex Electrical Contractors',
  },
  {
    id: 2,
    uid: 'user-tradesperson-01',
    email: 'dave.miller@apexelectrical.com.au',
    name: 'Dave Miller',
    role: 'Tradesperson',
    companyName: 'Apex Electrical Contractors',
  },
  {
    id: 3,
    uid: 'user-qa-01',
    email: 'sarah.jenkins@aegisqa.com',
    name: 'Sarah Jenkins',
    role: 'QA Manager',
    companyName: 'Aegis QA Engineering',
  },
  {
    id: 4,
    uid: 'user-admin-01',
    email: 'alex.vance@maximforge.com',
    name: 'Alex Vance',
    role: 'Administrator',
    companyName: 'Melbourne Data Centre JV',
  },
];

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}

interface AppContextType {
  currentUser: UserProfile;
  setCurrentUser: (user: UserProfile) => void;
  userProjects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  switchProject: (project: Project) => void;
  fetchProjects: () => Promise<void>;
  isProjectSwitcherOpen: boolean;
  setIsProjectSwitcherOpen: (open: boolean) => void;
  isProjectManageModalOpen: boolean;
  setIsProjectManageModalOpen: (open: boolean) => void;
  projectReadinessData: ProjectReadinessData | null;
  setProjectReadinessData: (data: ProjectReadinessData | null) => void;
  stats: ProjectStats | null;
  refreshStats: () => Promise<void>;
  siteMode: boolean;
  setSiteMode: (enabled: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedEquipmentId: number | null;
  setSelectedEquipmentId: (id: number | null) => void;
  selectedCableId: number | null;
  setSelectedCableId: (id: number | null) => void;
  selectedItrId: number | null;
  setSelectedItrId: (id: number | null) => void;
  selectedLocationId: number | null;
  setSelectedLocationId: (id: number | null) => void;
  isQrModalOpen: boolean;
  setIsQrModalOpen: (open: boolean) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  addToast: (type: 'success' | 'error' | 'info', title: string, message?: string) => void;
  removeToast: (id: string) => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile>(DEMO_USERS[0]); // default Mark Callahan (Supervisor)
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>({
    id: 1,
    code: 'MEL02',
    name: 'DC Melbourne 02',
    description: 'Hyperscale Data Centre Build - Stage 2 Electrical & Fitout',
    status: 'Active',
    clientName: 'Equinix / Australis DC JV',
    location: 'Melbourne, Victoria',
  });
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState<boolean>(false);
  const [isProjectManageModalOpen, setIsProjectManageModalOpen] = useState<boolean>(false);
  const [projectReadinessData, setProjectReadinessData] = useState<ProjectReadinessData | null>(null);
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [siteMode, setSiteMode] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('today');
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<number | null>(null);
  const [selectedCableId, setSelectedCableId] = useState<number | null>(null);
  const [selectedItrId, setSelectedItrId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Role-based default landing experience
  useEffect(() => {
    if (currentUser.role === 'Tradesperson' || currentUser.role === 'Viewer') {
      setActiveTab('today');
    } else if (currentUser.role === 'Supervisor' || currentUser.role === 'Leading Hand') {
      if (activeTab === 'home' || activeTab === 'my-work') {
        setActiveTab('today');
      }
    } else if (currentUser.role === 'Administrator' || currentUser.role === 'Project Manager') {
      if (activeTab === 'today' || activeTab === 'my-work') {
        setActiveTab('home');
      }
    }
  }, [currentUser.role]);

  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'x-user-role': currentUser.role,
      'x-user-name': currentUser.name,
      'x-user-email': currentUser.email,
      'x-user-uid': currentUser.uid,
      ...(activeProject ? { 'x-project-id': String(activeProject.id) } : {}),
      ...(options.headers || {}),
    };

    return fetch(url, {
      ...options,
      headers,
    });
  };

  const refreshStats = async () => {
    try {
      const res = await apiFetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await apiFetch('/api/projects');
      if (res.ok) {
        const projs: Project[] = await res.json();
        setUserProjects(projs);

        // Check remembered project
        const savedId = localStorage.getItem('maxim_active_project_id');
        let matched = projs.find((p) => p.id === Number(savedId));

        if (!matched && activeProject) {
          matched = projs.find((p) => p.id === activeProject.id);
        }

        if (!matched && projs.length > 0) {
          // If only 1 project, auto-select
          matched = projs[0];
        }

        if (matched) {
          setActiveProject(matched);
          localStorage.setItem('maxim_active_project_id', String(matched.id));
        } else if (projs.length === 0) {
          setActiveProject(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user projects:', err);
    }
  };

  const switchProject = (project: Project) => {
    // Reset any individual asset drilldowns immediately to avoid cross-project contamination
    setSelectedEquipmentId(null);
    setSelectedCableId(null);
    setSelectedItrId(null);
    setActiveProject(project);
    localStorage.setItem('maxim_active_project_id', String(project.id));
    setIsProjectSwitcherOpen(false);
    addToast('info', `Switched Project`, `Active context: ${project.name} (${project.code})`);
  };

  useEffect(() => {
    fetchProjects();
  }, [currentUser]);

  useEffect(() => {
    if (activeProject) {
      refreshStats();
    }
  }, [activeProject, currentUser]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        userProjects,
        activeProject,
        setActiveProject,
        switchProject,
        fetchProjects,
        isProjectSwitcherOpen,
        setIsProjectSwitcherOpen,
        isProjectManageModalOpen,
        setIsProjectManageModalOpen,
        projectReadinessData,
        setProjectReadinessData,
        stats,
        refreshStats,
        siteMode,
        setSiteMode,
        activeTab,
        setActiveTab,
        selectedEquipmentId,
        setSelectedEquipmentId,
        selectedCableId,
        setSelectedCableId,
        selectedItrId,
        setSelectedItrId,
        selectedLocationId,
        setSelectedLocationId,
        isQrModalOpen,
        setIsQrModalOpen,
        isSearchModalOpen,
        setIsSearchModalOpen,
        toasts,
        addToast,
        removeToast,
        apiFetch,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
