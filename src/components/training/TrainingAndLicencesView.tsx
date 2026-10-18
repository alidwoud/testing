import React, { useState } from 'react';
import {
  Award,
  Layers,
  Calendar,
  BookOpen,
  ShieldCheck,
  Building,
  RefreshCw,
  Plus,
  Users,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { TrainingDashboard } from './TrainingDashboard.tsx';
import { LicenceRegister } from './LicenceRegister.tsx';
import { RenewalsTracker } from './RenewalsTracker.tsx';
import { TrainingBookings } from './TrainingBookings.tsx';
import { RequirementsMatrix } from './RequirementsMatrix.tsx';
import { TrainingProviders } from './TrainingProviders.tsx';
import { BookTrainingModal } from './BookTrainingModal.tsx';
import { VerifyEvidenceModal } from './VerifyEvidenceModal.tsx';

export const TrainingAndLicencesView: React.FC = () => {
  const { activeProject } = useApp();

  // 6 Primary Navigation Tabs (Requirement 19)
  type TrainingTab = 'dashboard' | 'register' | 'renewals' | 'bookings' | 'requirements' | 'providers';
  const [activeTab, setActiveTab] = useState<TrainingTab>('dashboard');
  const [registerFilter, setRegisterFilter] = useState<string>('all');

  // Modals
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<any | null>(null);

  const handleNavigateWithFilter = (tab: string, filter?: string) => {
    setActiveTab(tab as TrainingTab);
    if (filter) setRegisterFilter(filter);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* 1. TOP MODULE NAVIGATION TABS (REQUIREMENT 19) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex items-center justify-between overflow-x-auto no-scrollbar">
        <div className="flex items-center space-x-1 min-w-max">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4 text-amber-900" />
            <span>DASHBOARD</span>
          </button>

          <button
            onClick={() => {
              setRegisterFilter('all');
              setActiveTab('register');
            }}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'register'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>LICENCE REGISTER</span>
          </button>

          <button
            onClick={() => setActiveTab('renewals')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'renewals'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-blue-600" />
            <span>RENEWALS</span>
          </button>

          <button
            onClick={() => setActiveTab('bookings')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            <span>TRAINING BOOKINGS</span>
          </button>

          <button
            onClick={() => setActiveTab('requirements')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'requirements'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>REQUIREMENTS</span>
          </button>

          <button
            onClick={() => setActiveTab('providers')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'providers'
                ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building className="w-4 h-4 text-slate-600" />
            <span>PROVIDERS</span>
          </button>
        </div>

        <div className="hidden md:flex items-center space-x-2 px-3 text-xs text-slate-400 font-medium">
          <span>Project:</span>
          <span className="font-bold text-slate-800">{activeProject?.code || 'Unassigned'}</span>
        </div>
      </div>

      {/* 2. TAB CONTENT PANES */}
      {activeTab === 'dashboard' && (
        <TrainingDashboard
          onNavigateTab={handleNavigateWithFilter}
          onOpenBookTraining={() => setIsBookModalOpen(true)}
          onOpenVerify={(item?: any) => {
            if (item) {
              setVerifyTarget({
                personId: item.personId,
                workerName: item.workerName || 'Unknown Worker',
                qualificationTypeCode: item.typeCode || item.qualificationTypeCode || '',
                licenceNumber: item.licenceNumber || '',
              });
            } else {
              setRegisterFilter('pending');
              setActiveTab('register');
            }
          }}
        />
      )}

      {activeTab === 'register' && (
        <LicenceRegister initialFilter={registerFilter} />
      )}

      {activeTab === 'renewals' && (
        <RenewalsTracker />
      )}

      {activeTab === 'bookings' && (
        <TrainingBookings initialFilter={registerFilter} />
      )}

      {activeTab === 'requirements' && (
        <RequirementsMatrix />
      )}

      {activeTab === 'providers' && (
        <TrainingProviders />
      )}

      {/* Global Book Training Modal */}
      <BookTrainingModal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        onSuccess={() => {}}
      />

      {/* Global Verify Evidence Modal */}
      {verifyTarget && (
        <VerifyEvidenceModal
          isOpen={true}
          onClose={() => setVerifyTarget(null)}
          onSuccess={() => {}}
          personId={verifyTarget.personId}
          workerName={verifyTarget.workerName}
          qualificationTypeCode={verifyTarget.qualificationTypeCode}
          existingLicenceNumber={verifyTarget.licenceNumber}
        />
      )}
    </div>
  );
};
