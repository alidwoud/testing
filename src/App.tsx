import React from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/Header.tsx';
import { HomeDashboard } from './components/HomeDashboard.tsx';
import { SiteModeView } from './components/SiteModeView.tsx';
import { LocationsView } from './components/LocationsView.tsx';
import { EquipmentView } from './components/EquipmentView.tsx';
import { CablesView } from './components/CablesView.tsx';
import { ItrsView } from './components/ItrsView.tsx';
import { TestingView } from './components/TestingView.tsx';
import { IssuesView } from './components/IssuesView.tsx';
import { AuditView } from './components/AuditView.tsx';
import { DrawingsAndMapsView } from './components/DrawingsAndMapsView.tsx';
import { PhotosView } from './components/PhotosView.tsx';
import { ProjectReadinessView } from './components/ProjectReadinessView.tsx';
import { NoProjectSelectedView } from './components/NoProjectSelectedView.tsx';
import { ProjectSwitcherModal } from './components/ProjectSwitcherModal.tsx';
import { ProjectManageModal } from './components/ProjectManageModal.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { QrModal } from './components/QrModal.tsx';
import { Navigation } from './components/Navigation.tsx';
import { WorkforceView } from './components/workforce/WorkforceView.tsx';
import { TodayView } from './components/TodayView.tsx';
import { HomeView } from './components/HomeView.tsx';
import { MyWorkView } from './components/MyWorkView.tsx';
import { TradiePhotosView } from './components/TradiePhotosView.tsx';
import { ProjectHubView } from './components/ProjectHubView.tsx';
import { ReportsHubView } from './components/ReportsHubView.tsx';
import { TrainingAndLicencesView } from './components/training/TrainingAndLicencesView.tsx';

const MainLayout: React.FC = () => {
  const {
    activeProject,
    siteMode,
    activeTab,
  } = useApp();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <Header />

      {/* Global Module Navigation Bar */}
      {activeProject && <Navigation />}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {!activeProject ? (
          <NoProjectSelectedView />
        ) : siteMode ? (
          <SiteModeView />
        ) : (
          <>
            {activeTab === 'today' && <TodayView />}
            {activeTab === 'my-work' && <MyWorkView />}
            {activeTab === 'home' && <HomeView />}
            {activeTab === 'dashboard' && <HomeDashboard />}
            {activeTab === 'project' && <ProjectHubView />}
            {activeTab === 'reports' && <ReportsHubView />}
            {activeTab === 'readiness' && <ProjectReadinessView />}
            {activeTab === 'workforce' && <WorkforceView />}
            {activeTab === 'training' && <TrainingAndLicencesView />}
            {activeTab === 'maps' && <DrawingsAndMapsView />}
            {activeTab === 'locations' && <LocationsView />}
            {activeTab === 'equipment' && <EquipmentView />}
            {activeTab === 'cables' && <CablesView />}
            {activeTab === 'itrs' && <ItrsView />}
            {activeTab === 'testing' && <TestingView />}
            {activeTab === 'issues' && <IssuesView />}
            {activeTab === 'photos' && <TradiePhotosView />}
            {activeTab === 'history' && <AuditView />}
          </>
        )}
      </main>

      {/* Global Modals */}
      <ProjectSwitcherModal />
      <ProjectManageModal />
      <GlobalSearchModal />
      <QrModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
