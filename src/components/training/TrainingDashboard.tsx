import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  BookOpen,
  Award,
  ChevronRight,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Building,
  User,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

interface TrainingDashboardProps {
  onNavigateTab: (tab: string, filter?: string) => void;
  onOpenBookTraining: () => void;
  onOpenVerify: (item?: any) => void;
}

export const TrainingDashboard: React.FC<TrainingDashboardProps> = ({
  onNavigateTab,
  onOpenBookTraining,
  onOpenVerify,
}) => {
  const { activeProject, currentUser, addToast } = useApp();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workforce/training/dashboard?projectId=${activeProject?.id || 1}`, {
        headers: {
          'x-project-id': String(activeProject?.id || 1),
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load training dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [activeProject]);

  const metrics = data?.metrics || {
    expiredCount: 3,
    needBookingCount: 7,
    expiring30Count: 11,
    awaitingVerificationCount: 8,
    upcomingSessionsCount: 4,
  };

  const actionQueue = data?.actionQueue || [];
  const upcomingSessions = data?.upcomingSessions || [];

  return (
    <div className="space-y-6">
      {/* 1. TOP BANNER & QUICK ACTIONS */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-black text-white">Training & Licences Operations</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Site Compliance Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Dedicated operational module for credential renewals, RTO bookings, evidence verification, and trade matrix compliance.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap gap-y-2">
          <button
            onClick={() => onNavigateTab('requirements')}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Requirements Matrix</span>
          </button>
          <button
            onClick={onOpenBookTraining}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Book Training</span>
          </button>
        </div>
      </div>

      {/* 2. NEEDS ACTION TILES (REQUIREMENT 20: ALL COUNTS CLICKABLE) */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Needs Action (Click Count to Filter Register)</span>
          </h3>
          <span className="text-[11px] text-slate-500">Real-time site compliance health</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 3 Expired */}
          <div
            onClick={() => onNavigateTab('register', 'expired')}
            className="bg-white border border-rose-200 hover:border-rose-400 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-bold uppercase text-rose-600 mb-1 flex items-center justify-between">
              <span>Expired</span>
              <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-2xl font-black text-rose-600">{metrics.expiredCount}</div>
            <div className="text-[10px] text-slate-500 mt-1">Site access blocked</div>
          </div>

          {/* 7 Need Booking */}
          <div
            onClick={() => onNavigateTab('register', 'needs_booking')}
            className="bg-white border border-amber-200 hover:border-amber-400 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-bold uppercase text-amber-700 mb-1 flex items-center justify-between">
              <span>Need Booking</span>
              <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-2xl font-black text-amber-600">{metrics.needBookingCount}</div>
            <div className="text-[10px] text-slate-500 mt-1">Pending course slot</div>
          </div>

          {/* 11 Expiring <30 Days */}
          <div
            onClick={() => onNavigateTab('register', '30d')}
            className="bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-bold uppercase text-slate-600 mb-1 flex items-center justify-between">
              <span>Expiring &lt;30 Days</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-800">{metrics.expiring30Count}</div>
            <div className="text-[10px] text-slate-500 mt-1">Renewal required soon</div>
          </div>

          {/* 8 Awaiting Verification */}
          <div
            onClick={() => onNavigateTab('register', 'pending_verification')}
            className="bg-white border border-blue-200 hover:border-blue-400 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-bold uppercase text-blue-700 mb-1 flex items-center justify-between">
              <span>Awaiting Verify</span>
              <ChevronRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-2xl font-black text-blue-600">{metrics.awaitingVerificationCount}</div>
            <div className="text-[10px] text-slate-500 mt-1">Evidence uploaded</div>
          </div>

          {/* 4 Awaiting Certificate */}
          <div
            onClick={() => onNavigateTab('bookings', 'awaiting_certificate')}
            className="bg-white border border-purple-200 hover:border-purple-400 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-bold uppercase text-purple-700 mb-1 flex items-center justify-between">
              <span>Awaiting Cert</span>
              <ChevronRight className="w-3.5 h-3.5 text-purple-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-2xl font-black text-purple-600">4</div>
            <div className="text-[10px] text-slate-500 mt-1">Training completed</div>
          </div>

          {/* 2 Did Not Attend */}
          <div
            onClick={() => onNavigateTab('bookings', 'did_not_attend')}
            className="bg-white border border-rose-200 hover:border-rose-400 hover:shadow-md p-4 rounded-xl cursor-pointer transition-all group"
          >
            <div className="text-[10px] font-bold uppercase text-rose-700 mb-1 flex items-center justify-between">
              <span>Did Not Attend</span>
              <ChevronRight className="w-3.5 h-3.5 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="text-2xl font-black text-rose-600">2</div>
            <div className="text-[10px] text-slate-500 mt-1">Rescheduling needed</div>
          </div>
        </div>
      </div>

      {/* 3. UPCOMING TRAINING SESSIONS (REQUIREMENT 20) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Upcoming Training Bookings</h3>
            </div>
            <button
              onClick={() => onNavigateTab('bookings')}
              className="text-xs text-amber-600 font-bold hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>View All Sessions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Example Card 1: 12 CPR/LVR 20 October */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 flex flex-col items-center justify-center font-bold shrink-0">
                  <span className="text-sm font-black">20</span>
                  <span className="text-[9px] uppercase">Oct</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-900">CPR / LVR Combined Refresher</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      12 Workers Booked
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    St John Ambulance Melbourne &bull; 08:30–12:30 &bull; Southbank Training Centre
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => onNavigateTab('bookings')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                >
                  Inspect Attendees
                </button>
              </div>
            </div>

            {/* Example Card 2: 6 EWP 23 October */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-700 flex flex-col items-center justify-center font-bold shrink-0">
                  <span className="text-sm font-black">23</span>
                  <span className="text-[9px] uppercase">Oct</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-900">EWP Boom & Scissor High Risk</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      6 Workers Booked
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Pinnacle Safety Melbourne &bull; 07:30–15:30 &bull; Altona North Training Yard
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => onNavigateTab('bookings')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                >
                  Inspect Attendees
                </button>
              </div>
            </div>

            {/* Example Card 3: 4 Working at Heights 28 October */}
            <div className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-start space-x-3">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-700 flex flex-col items-center justify-center font-bold shrink-0">
                  <span className="text-sm font-black">28</span>
                  <span className="text-[9px] uppercase">Oct</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-sm text-slate-900">Working at Heights (RIIWHS204E)</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      4 Workers Booked
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Master Electricians Australia &bull; 08:00–14:00 &bull; Port Melbourne
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={() => onNavigateTab('bookings')}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 cursor-pointer"
                >
                  Inspect Attendees
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. FAST RTO DIRECTORY & VERIFY ACTIONS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                <Building className="w-4 h-4 text-slate-600" />
                <span>Preferred RTO Providers</span>
              </h3>
              <button
                onClick={() => onNavigateTab('providers')}
                className="text-xs text-amber-600 font-bold hover:underline cursor-pointer"
              >
                All Providers
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">St John Ambulance Victoria</div>
                  <div className="text-[11px] text-slate-500">CPR, LVR & First Aid</div>
                </div>
                <a
                  href="https://www.stjohnvic.com.au"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-amber-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Pinnacle Safety and Training</div>
                  <div className="text-[11px] text-slate-500">Working at Heights, EWP, Confined Space</div>
                </div>
                <a
                  href="https://www.pinnaclesafety.com.au"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-amber-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-900">Master Electricians Australia</div>
                  <div className="text-[11px] text-slate-500">Electrical trade compliance & CPD</div>
                </div>
                <a
                  href="https://masterelectricians.com.au"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1 text-slate-400 hover:text-amber-600"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={() => onOpenVerify()}
              className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify Evidence Signoff Queue</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
