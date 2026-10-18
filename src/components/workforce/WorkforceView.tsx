import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Calendar,
  Award,
  Clock,
  BarChart3,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Upload,
  RefreshCw,
  UserCheck,
  Building,
  Shield,
  Layers,
  ChevronRight,
  ShieldAlert,
  Send,
  MoreVertical,
  Check,
  X,
  FileSpreadsheet,
  MapPin,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';
import { DailyLabourBoard } from './DailyLabourBoard.tsx';
import { MasterLabourSchedule } from './MasterLabourSchedule.tsx';
import { DailyWorksView } from './DailyWorksView.tsx';
import { WeekPlanner } from './WeekPlanner.tsx';
import { PersonProfileModal } from './PersonProfileModal.tsx';
import { WorkforceImportModal } from './WorkforceImportModal.tsx';
import { WorkforceStructureModal } from './WorkforceStructureModal.tsx';
import { CreateCrewModal } from './CreateCrewModal.tsx';

export const WorkforceView: React.FC = () => {
  const { activeProject, currentUser, addToast, setActiveTab } = useApp();

  // 5 Primary Sections + Secondary Reports (Master Schedule is Primary Screen)
  type WorkforceSection = 'master' | 'daily' | 'plan' | 'people' | 'reports';
  const [activeSection, setActiveSection] = useState<WorkforceSection>('master');

  // Sub-tabs for PLAN
  const [planSubTab, setPlanSubTab] = useState<'planner' | 'crews' | 'structure'>('planner');
  const [complianceSubTab, setComplianceSubTab] = useState<'qualifications' | 'renewals'>('qualifications');

  // Stats
  const [stats, setStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Selected worker for Person Profile Modal
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // People Register State
  const [people, setPeople] = useState<any[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleTradeFilter, setPeopleTradeFilter] = useState('All');
  const [peopleStatusFilter, setPeopleStatusFilter] = useState('All');
  const [isAddWorkerModalOpen, setIsAddWorkerModalOpen] = useState(false);
  const [newWorkerForm, setNewWorkerForm] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    displayName: '',
    tradeRole: '',
    classification: '',
    companyName: '',
    employmentType: 'Direct',
    workEmail: '',
    phone: '',
    employmentStatus: 'Active',
  });

  // Crews State
  const [crews, setCrews] = useState<any[]>([]);
  const [crewsLoading, setCrewsLoading] = useState(false);
  const [selectedCrew, setSelectedCrew] = useState<any | null>(null);
  const [isCreateCrewModalOpen, setIsCreateCrewModalOpen] = useState(false);
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewSupervisor, setNewCrewSupervisor] = useState('');
  const [addMemberPersonId, setAddMemberPersonId] = useState<number | ''>('');

  // Structure Modal State
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);

  // Qualifications State
  const [qualifications, setQualifications] = useState<any[]>([]);
  const [qualsLoading, setQualsLoading] = useState(false);
  const [qualFilterType, setQualFilterType] = useState('All');
  const [qualFilterStatus, setQualFilterStatus] = useState('All');

  // Renewals State
  const [renewals, setRenewals] = useState<any[]>([]);
  const [renewalsLoading, setRenewalsLoading] = useState(false);
  const [renewalFilterWindow, setRenewalFilterWindow] = useState('All');
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedQualForBooking, setSelectedQualForBooking] = useState<any | null>(null);
  const [bookingForm, setBookingForm] = useState({
    trainingProvider: 'St John Ambulance Melbourne Central',
    bookingDate: '2026-10-25',
    bookingTime: '08:30',
    location: '55 Sturt Street, Southbank VIC',
    bookingReference: '',
    cost: '$180.00',
    notes: '',
  });

  // Fetch KPI Stats
  const fetchStats = useCallback(async () => {
    if (!activeProject) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/workforce/stats?projectId=${activeProject.id}`, {
        headers: { 'x-user-role': currentUser.role, 'x-project-id': String(activeProject.id) },
      });
      if (res.ok) setStats(await res.json());
    } catch (e) {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  }, [activeProject, currentUser.role]);

  // Fetch People
  const fetchPeople = useCallback(async () => {
    if (!activeProject) return;
    setPeopleLoading(true);
    try {
      const res = await fetch(`/api/workforce/people?projectId=${activeProject.id}`, {
        headers: { 'x-user-role': currentUser.role, 'x-project-id': String(activeProject.id) },
      });
      if (res.ok) {
        const data = await res.json();
        setPeople(data);
      }
    } catch (e) {
      // ignore
    } finally {
      setPeopleLoading(false);
    }
  }, [activeProject, currentUser.role]);

  // Fetch Crews
  const fetchCrews = useCallback(async () => {
    if (!activeProject) return;
    setCrewsLoading(true);
    try {
      const res = await fetch(`/api/workforce/crews?projectId=${activeProject.id}`, {
        headers: { 'x-user-role': currentUser.role, 'x-project-id': String(activeProject.id) },
      });
      if (res.ok) {
        const data = await res.json();
        setCrews(data);
        if (data.length > 0 && !selectedCrew) setSelectedCrew(data[0]);
      }
    } catch (e) {
      // ignore
    } finally {
      setCrewsLoading(false);
    }
  }, [activeProject, currentUser.role, selectedCrew]);

  // Fetch Qualifications
  const fetchQualifications = useCallback(async () => {
    if (!activeProject) return;
    setQualsLoading(true);
    try {
      const res = await fetch(`/api/workforce/qualifications?projectId=${activeProject.id}`, {
        headers: { 'x-user-role': currentUser.role, 'x-project-id': String(activeProject.id) },
      });
      if (res.ok) setQualifications(await res.json());
    } catch (e) {
      // ignore
    } finally {
      setQualsLoading(false);
    }
  }, [activeProject, currentUser.role]);

  // Fetch Renewals
  const fetchRenewals = useCallback(async () => {
    if (!activeProject) return;
    setRenewalsLoading(true);
    try {
      const res = await fetch(`/api/workforce/renewals?projectId=${activeProject.id}`, {
        headers: { 'x-user-role': currentUser.role, 'x-project-id': String(activeProject.id) },
      });
      if (res.ok) setRenewals(await res.json());
    } catch (e) {
      // ignore
    } finally {
      setRenewalsLoading(false);
    }
  }, [activeProject, currentUser.role]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeSection === 'people') fetchPeople();
    else if (activeSection === 'plan' && planSubTab === 'crews') fetchCrews();
  }, [activeSection, planSubTab, fetchPeople, fetchCrews]);

  // Add Worker handler
  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkerForm.firstName || !newWorkerForm.lastName) {
      addToast('error', 'Validation Error', 'First name and last name are required');
      return;
    }
    try {
      const res = await fetch('/api/workforce/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id || 1),
        },
        body: JSON.stringify({
          ...newWorkerForm,
          assignedProjectId: activeProject?.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add worker');
      }
      addToast('success', 'Worker Added', `${newWorkerForm.firstName} ${newWorkerForm.lastName} registered successfully`);
      setIsAddWorkerModalOpen(false);
      fetchPeople();
      fetchStats();
      setNewWorkerForm({
        employeeId: '',
        firstName: '',
        lastName: '',
        displayName: '',
        tradeRole: '',
        classification: '',
        companyName: '',
        employmentType: 'Direct',
        workEmail: '',
        phone: '',
        employmentStatus: 'Active',
      });
    } catch (err: any) {
      addToast('error', 'Registration Error', err.message);
    }
  };

  // Add Crew Member handler
  const handleAddCrewMember = async () => {
    if (!selectedCrew || !addMemberPersonId) return;
    try {
      const res = await fetch(`/api/workforce/crews/${selectedCrew.id}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({ personId: Number(addMemberPersonId), roleInCrew: 'Member' }),
      });
      if (!res.ok) throw new Error('Failed to add crew member');
      addToast('success', 'Member Added', 'Worker added to crew successfully');
      setAddMemberPersonId('');
      fetchCrews();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  // Remove Crew Member handler
  const handleRemoveCrewMember = async (personId: number) => {
    if (!selectedCrew) return;
    try {
      const res = await fetch(`/api/workforce/crews/${selectedCrew.id}/members/${personId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
      });
      if (!res.ok) throw new Error('Failed to remove crew member');
      addToast('success', 'Member Removed', 'Worker removed from crew');
      fetchCrews();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  // Verify Qualification handler
  const handleVerifyQual = async (qualId: number, status: 'Verified' | 'Rejected') => {
    try {
      const res = await fetch(`/api/workforce/qualifications/${qualId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Verification failed');
      }
      addToast('success', 'Credential Updated', `Qualification marked as ${status}`);
      fetchQualifications();
      fetchStats();
    } catch (err: any) {
      addToast('error', 'Action Blocked', err.message);
    }
  };

  // Book Training Renewal handler
  const handleSaveRenewalBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQualForBooking) return;
    try {
      const res = await fetch('/api/workforce/renewals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
          'x-project-id': String(activeProject?.id),
        },
        body: JSON.stringify({
          personId: selectedQualForBooking.personId,
          qualificationId: selectedQualForBooking.id,
          qualificationTypeCode: selectedQualForBooking.typeCode,
          ...bookingForm,
        }),
      });
      if (!res.ok) throw new Error('Failed to create booking');
      addToast('success', 'Training Booked', 'Course booking recorded in renewal register');
      setIsBookModalOpen(false);
      fetchRenewals();
      fetchStats();
    } catch (err: any) {
      addToast('error', 'Booking Error', err.message);
    }
  };

  // Filtered People
  const filteredPeople = people.filter((p) => {
    const matchesSearch =
      peopleSearch === '' ||
      p.displayName.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      p.employeeId.toLowerCase().includes(peopleSearch.toLowerCase()) ||
      p.companyName.toLowerCase().includes(peopleSearch.toLowerCase());
    const matchesTrade = peopleTradeFilter === 'All' || p.tradeRole === peopleTradeFilter;
    const matchesStatus = peopleStatusFilter === 'All' || p.employmentStatus === peopleStatusFilter;
    return matchesSearch && matchesTrade && matchesStatus;
  });

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* 1. CLEAN MAXIM WORKFORCE HEADER WITH NATURAL TYPOGRAPHY */}
      <div className="bg-slate-900 border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Workforce & Labour Operations
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono">
                  {activeProject?.code || 'Unassigned'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Site labour allocations, week planning, crew coordination, and trade credential compliance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import Workers</span>
          </button>
          <button
            onClick={() => setIsAddWorkerModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Person</span>
          </button>
        </div>
      </div>

      {/* 2. FOUR HIGH-LEVEL WORKFORCE SUMMARY TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* MASTER SCHEDULE TILE (REQUIREMENT 4: PRIMARY LABOUR SCREEN) */}
        <div
          onClick={() => setActiveSection('master')}
          className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
            activeSection === 'master'
              ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span className="flex items-center space-x-1.5">
              <Users className="w-3.5 h-3.5 text-amber-500" />
              <span>Master Schedule</span>
            </span>
            {activeSection === 'master' && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            {stats?.allocatedCount || 105} <span className="text-xs font-normal text-slate-500">Allocated</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2">
            <span>{stats?.unallocatedCount || 10} unallocated</span>
            <span>•</span>
            <span className="text-emerald-700 font-semibold">Primary Screen</span>
          </div>
        </div>

        {/* DAILY WORKS TILE (REQUIREMENT 1: WHERE IS EVERYONE TODAY) */}
        <div
          onClick={() => setActiveSection('daily')}
          className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
            activeSection === 'daily'
              ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span className="flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Daily Works</span>
            </span>
            {activeSection === 'daily' && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            Site Deployment
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2">
            <span>By Area</span>
            <span>•</span>
            <span>By Person</span>
            <span>•</span>
            <span>Spatial</span>
          </div>
        </div>

        {/* PLAN TILE */}
        <div
          onClick={() => setActiveSection('plan')}
          className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
            activeSection === 'plan'
              ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span className="flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Week Plan</span>
            </span>
            {activeSection === 'plan' && (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">
            Week Planner
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center space-x-2">
            <span>{crews.length || 3} crews</span>
            <span>•</span>
            <span>Areas & streams</span>
          </div>
        </div>

        {/* TRAINING & LICENCES MODULE SHORTCUT (REQUIREMENT 18) */}
        <div
          onClick={() => setActiveTab('training')}
          className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/10 transition-all cursor-pointer text-left shadow-xs group"
          title="Open Dedicated Training & Licences System"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
            <span className="flex items-center space-x-1.5">
              <Award className="w-3.5 h-3.5 text-rose-600" />
              <span className="group-hover:text-amber-800 transition-colors">Training & Licences</span>
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform" />
          </div>
          <div className="text-lg font-bold text-slate-900 mt-0.5 flex items-center space-x-2">
            <span className="text-rose-600">{stats?.expiredQualsCount || 3}</span>
            <span className="text-xs font-normal text-slate-500">Expired &bull; {stats?.expiring30DaysCount || 11} &lt;30d</span>
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            Dedicated Operational Module &rarr;
          </div>
        </div>
      </div>

      {/* 3. PRIMARY WORKFORCE NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-2 rounded-xl shadow-xs">
        <div className="flex items-center space-x-1">
          {/* MASTER SCHEDULE TAB (REQUIREMENT 4: PRIMARY LABOUR SCREEN) */}
          <button
            onClick={() => setActiveSection('master')}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeSection === 'master'
                ? 'border-amber-500 text-slate-900 bg-amber-500/5 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4 text-amber-500" />
            <span>MASTER SCHEDULE</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
              Primary
            </span>
          </button>

          {/* DAILY WORKS TAB (REQUIREMENT 1: WHERE IS EVERYONE TODAY) */}
          <button
            onClick={() => setActiveSection('daily')}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeSection === 'daily'
                ? 'border-amber-500 text-slate-900 bg-amber-500/5 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>DAILY WORKS</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {stats?.allocatedCount || 105}
            </span>
          </button>

          {/* PLAN TAB */}
          <button
            onClick={() => setActiveSection('plan')}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeSection === 'plan'
                ? 'border-amber-500 text-slate-900 bg-amber-500/5 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>WEEK PLANNER</span>
          </button>

          {/* PEOPLE REGISTER TAB */}
          <button
            onClick={() => setActiveSection('people')}
            className={`flex items-center space-x-2 px-4 py-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeSection === 'people'
                ? 'border-amber-500 text-slate-900 bg-amber-500/5 font-black'
                : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <Users className="w-4 h-4 text-purple-600" />
            <span>PERSONNEL REGISTER</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {people.length || 115}
            </span>
          </button>
        </div>

        {/* Right Side: Reports & Training Module Jump */}
        <div className="flex items-center space-x-2 my-2 mr-2">
          <button
            onClick={() => setActiveSection('reports')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSection === 'reports'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Workforce Reports</span>
          </button>

          <button
            onClick={() => setActiveTab('training')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 border border-amber-500/30 rounded-lg text-xs font-black transition-all cursor-pointer"
            title="Open Training & Licences System"
          >
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Training & Licences &rarr;</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: MASTER LABOUR SCHEDULE (PRIMARY LABOUR SCREEN) */}
      {/* ======================================================== */}
      {activeSection === 'master' && (
        <MasterLabourSchedule />
      )}

      {/* ======================================================== */}
      {/* SECTION 2: DAILY WORKS ("WHERE IS EVERYONE TODAY?")       */}
      {/* ======================================================== */}
      {activeSection === 'daily' && (
        <DailyWorksView />
      )}

      {/* ======================================================== */}
      {/* SECTION 2: PLAN (WEEK PLANNER, CREWS, AREAS & STREAMS)   */}
      {/* ======================================================== */}
      {activeSection === 'plan' && (
        <div className="space-y-4">
          {/* Plan Sub-Navigation */}
          <div className="bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-1.5">
              <button
                onClick={() => setPlanSubTab('planner')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  planSubTab === 'planner'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Week Planner</span>
              </button>

              <button
                onClick={() => setPlanSubTab('crews')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  planSubTab === 'crews'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Crews ({crews.length})</span>
              </button>

              <button
                onClick={() => setIsStructureModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Manage Areas & Workstreams</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-500 font-medium px-2">
              Forward 7-day labour forecasting & workstream assignment
            </span>
          </div>

          {planSubTab === 'planner' && <WeekPlanner />}

          {planSubTab === 'crews' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left: Crew List */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="font-bold text-sm text-slate-900">Construction Crews</h3>
                  <button
                    onClick={() => setIsCreateCrewModalOpen(true)}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> New Crew
                  </button>
                </div>

                <div className="space-y-2">
                  {crewsLoading ? (
                    <p className="text-xs text-slate-500 py-6 text-center">Loading crews...</p>
                  ) : crews.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <Shield className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="font-bold text-slate-900 text-xs">NO CREWS YET</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Create a crew to allocate workers together.
                      </p>
                      <button
                        onClick={() => setIsCreateCrewModalOpen(true)}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ CREATE CREW</span>
                      </button>
                    </div>
                  ) : (
                    crews.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => setSelectedCrew(c)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedCrew?.id === c.id
                            ? 'border-amber-500 bg-amber-50/50 shadow-xs'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color || '#f59e0b' }} />
                            {c.name}
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-bold">
                            {c.memberCount || 0} workers
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Lead: {c.supervisorName || '—'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Selected Crew Details & Members */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-xs">
                {!selectedCrew ? (
                  <p className="text-xs text-slate-500 py-12 text-center">Select a crew to manage workers and dispatch.</p>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: selectedCrew.color || '#f59e0b' }} />
                          {selectedCrew.name}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Supervisor: <span className="text-slate-900 font-semibold">{selectedCrew.supervisorName || '—'}</span> &bull; {selectedCrew.memberCount || 0} active members
                        </p>
                      </div>
                    </div>

                    {/* Add member controls */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="flex-1">
                        <select
                          value={addMemberPersonId}
                          onChange={(e) => setAddMemberPersonId(Number(e.target.value) || '')}
                          className="w-full bg-white border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2 focus:border-amber-500 outline-none"
                        >
                          <option value="">-- Add Worker to {selectedCrew.name} --</option>
                          {people
                            .filter((p) => !selectedCrew.members?.some((m: any) => m.id === p.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.displayName} ({p.tradeRole} - {p.companyName})
                              </option>
                            ))}
                        </select>
                      </div>
                      <button
                        onClick={handleAddCrewMember}
                        disabled={!addMemberPersonId}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Worker
                      </button>
                    </div>

                    {/* Crew Members Table */}
                    <div>
                      <h3 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-3">
                        Allocated Crew Members
                      </h3>
                      {!selectedCrew.members || selectedCrew.members.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                          No workers assigned to this crew yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                              <tr>
                                <th className="p-3">Worker</th>
                                <th className="p-3">Trade</th>
                                <th className="p-3">Company</th>
                                <th className="p-3 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {selectedCrew.members.map((m: any) => (
                                <tr key={m.id} className="hover:bg-slate-50/80">
                                  <td className="p-3 font-semibold text-slate-900">{m.displayName || `${m.firstName || ''} ${m.lastName || ''}`.trim() || 'Unknown Worker'}</td>
                                  <td className="p-3 text-slate-600">{m.tradeRole || 'Not Set'}</td>
                                  <td className="p-3 text-slate-500">{m.companyName || 'Not Set'}</td>
                                  <td className="p-3 text-right">
                                    <button
                                      onClick={() => handleRemoveCrewMember(m.id)}
                                      className="text-rose-600 hover:text-rose-700 text-xs font-bold cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Areas & Workstreams Master Modal */}
          <WorkforceStructureModal
            isOpen={isStructureModalOpen}
            onClose={() => setIsStructureModalOpen(false)}
            onStructureChange={() => {
              fetchStats();
            }}
          />
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: PEOPLE (MASTER PERSONNEL REGISTER & PROFILES) */}
      {/* ======================================================== */}
      {activeSection === 'people' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search workers by name, ID or company..."
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-lg px-3 py-2 w-full focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span>Trade:</span>
                <select
                  value={peopleTradeFilter}
                  onChange={(e) => setPeopleTradeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="All">All Trades</option>
                  <option value="Electrician">Electrician</option>
                  <option value="Apprentice">Apprentice</option>
                  <option value="Leading Hand">Leading Hand</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="High Voltage Tech">High Voltage Tech</option>
                  <option value="Data Tech">Data Tech</option>
                  <option value="Logistics">Logistics</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Status:</span>
                <select
                  value={peopleStatusFilter}
                  onChange={(e) => setPeopleStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Pending Onboarding">Pending Onboarding</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Offboarded">Offboarded</option>
                </select>
              </div>

              <button
                onClick={fetchPeople}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                title="Refresh people"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* People Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {peopleLoading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading workers...</div>
            ) : filteredPeople.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No workers match the current search or filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Worker ID</th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Trade / Role</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Compliance</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPeople.map((person) => {
                      const isCompliant = person.complianceStatus === 'COMPLIANT';
                      const isWarning = person.complianceStatus === 'WARNING';
                      return (
                        <tr
                          key={person.id}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedPersonId(person.id);
                            setIsProfileModalOpen(true);
                          }}
                        >
                          <td className="p-3 font-mono text-slate-500">{person.employeeId || '—'}</td>
                          <td className="p-3 font-bold text-slate-900">{person.displayName || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unknown Worker'}</td>
                          <td className="p-3 text-slate-700">
                            {person.tradeRole || 'Not Set'}
                            {person.classification && (
                              <span className="text-[10px] text-slate-400 block">{person.classification}</span>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">{person.companyName || 'Not Set'}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCompliant
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isWarning
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {person.complianceStatus || 'Not Assessed'}
                            </span>
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                person.employmentStatus === 'Active'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {person.employmentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPersonId(person.id);
                                setIsProfileModalOpen(true);
                              }}
                              className="text-xs font-bold text-amber-600 hover:text-amber-700"
                            >
                              Profile &rarr;
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {false && (
        <div className="space-y-4">
          {/* Compliance Sub-Navigation & KPI Pills */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setComplianceSubTab('qualifications')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  complianceSubTab === 'qualifications'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Qualifications & Licences
              </button>
              <button
                onClick={() => setComplianceSubTab('renewals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  complianceSubTab === 'renewals'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Renewals & Training Queue
              </button>
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold">
              <span className="text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                {stats?.expiredQualsCount || 3} Expired
              </span>
              <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                {stats?.expiring30DaysCount || 11} Expiring &lt;30d
              </span>
              <span className="text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                {stats?.pendingVerificationCount || 8} Pending Verification
              </span>
            </div>
          </div>

          {/* Sub-Tab: Qualifications & Licences */}
          {complianceSubTab === 'qualifications' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <h3 className="font-bold text-sm text-slate-900">
                  Trade Licences & Safety Certifications
                </h3>
                <div className="flex items-center gap-2">
                  <select
                    value={qualFilterStatus}
                    onChange={(e) => setQualFilterStatus(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-xs text-slate-900 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  >
                    <option value="All">All Verification Statuses</option>
                    <option value="Verified">Verified</option>
                    <option value="Pending Verification">Pending Verification</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <button
                    onClick={fetchQualifications}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {qualsLoading ? (
                <div className="py-12 text-center text-slate-500 text-xs">Loading credentials...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Worker</th>
                        <th className="p-3">Credential Name</th>
                        <th className="p-3">Licence Number</th>
                        <th className="p-3">Expiry Date</th>
                        <th className="p-3">Verification</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {qualifications
                        .filter((q) => qualFilterStatus === 'All' || q.verificationStatus === qualFilterStatus)
                        .map((q) => (
                          <tr key={q.id} className="hover:bg-slate-50/80">
                            <td className="p-3 font-semibold text-slate-900">{q.personName || 'Unknown Worker'}</td>
                            <td className="p-3 text-slate-700 font-medium">{q.typeName || q.typeCode || 'Not Assessed'}</td>
                            <td className="p-3 font-mono text-slate-500">{q.licenceNumber || '—'}</td>
                            <td className="p-3 font-mono text-slate-700">{q.expiryDate || '—'}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  q.verificationStatus === 'Verified'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : q.verificationStatus === 'Rejected'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                                }`}
                              >
                                {q.verificationStatus}
                              </span>
                            </td>
                            <td className="p-3 text-right space-x-1">
                              {q.verificationStatus === 'Pending Verification' && (
                                <>
                                  <button
                                    onClick={() => handleVerifyQual(q.id, 'Verified')}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                                  >
                                    Verify
                                  </button>
                                  <button
                                    onClick={() => handleVerifyQual(q.id, 'Rejected')}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white hover:bg-rose-500 cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab: Renewals & Training Queue */}
          {complianceSubTab === 'renewals' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Training & Renewal Bookings Queue</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Automated expiry tracking and mandatory retraining bookings.</p>
                </div>
                <button
                  onClick={fetchRenewals}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 self-start"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Worker</th>
                      <th className="p-3">Course / Qualification</th>
                      <th className="p-3">Expiry</th>
                      <th className="p-3">Training Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {renewals.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-semibold text-slate-900">{r.personName}</td>
                        <td className="p-3 text-slate-700">{r.typeName}</td>
                        <td className="p-3 font-mono text-rose-700">{r.expiryDate}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {r.status || 'Requires Booking'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedQualForBooking(r);
                              setIsBookModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors cursor-pointer"
                          >
                            Book Training
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 5: REPORTS (HEADCOUNTS & ANALYTICS - SECONDARY)  */}
      {/* ======================================================== */}
      {activeSection === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-2">Workforce Headcount & Delivery Reports</h2>
            <p className="text-xs text-slate-500 mb-6">Master analytics for contractor labour velocity and trade allocation breakdown.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase block">Daily Attendance Rate</span>
                <span className="text-3xl font-black text-emerald-600 block mt-1">94.8%</span>
                <span className="text-xs text-slate-500 mt-1 block">17 of 18 scheduled muster confirmed</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase block">Total Roster Manning</span>
                <span className="text-3xl font-black text-slate-900 block mt-1">{stats?.totalWorkforce || 115}</span>
                <span className="text-xs text-slate-500 mt-1 block">Contractors & direct trades</span>
              </div>
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <span className="text-xs font-bold text-slate-500 uppercase block">Credential Compliance</span>
                <span className="text-3xl font-black text-amber-600 block mt-1">96.2%</span>
                <span className="text-xs text-slate-500 mt-1 block">3 expired licences pending refresh</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Modals */}
      <PersonProfileModal
        personId={selectedPersonId}
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedPersonId(null);
        }}
        onWorkerUpdated={fetchPeople}
      />

      <WorkforceImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchPeople();
          fetchStats();
        }}
        targetProjectId={activeProject?.id}
      />

      <CreateCrewModal
        isOpen={isCreateCrewModalOpen}
        onClose={() => setIsCreateCrewModalOpen(false)}
        onCrewCreated={(newCrew) => {
          setCrews((prev) => [newCrew, ...prev]);
          setSelectedCrew(newCrew);
          fetchCrews();
        }}
      />
    </div>
  );
};
