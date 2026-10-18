import React, { useState, useEffect } from 'react';
import {
  Building,
  ExternalLink,
  Phone,
  Mail,
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

export const TrainingProviders: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [coursesOffered, setCoursesOffered] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workforce/training/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data);
      }
    } catch (err) {
      console.error('Failed to load training providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bookingUrl) {
      addToast('error', 'Missing Fields', 'Provider Name and Booking URL are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/workforce/training/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          name,
          website,
          bookingUrl,
          coursesOffered,
          contactName,
          phone,
          email,
          notes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add provider');
      }

      addToast('success', 'Provider Registered', `${name} added to approved training partners.`);
      setIsAddModalOpen(false);
      setName('');
      setWebsite('');
      setBookingUrl('');
      setCoursesOffered('');
      setContactName('');
      setPhone('');
      setEmail('');
      setNotes('');
      fetchProviders();
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProviders = providers.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.coursesOffered && p.coursesOffered.toLowerCase().includes(q)) ||
      (p.contactName && p.contactName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* 1. HEADER & CONTROLS */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-base text-slate-900 flex items-center space-x-2">
            <Building className="w-5 h-5 text-amber-500" />
            <span>Approved Training Providers & RTO Directory</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered training organisations with active enterprise rates, automated booking URLs, and direct evidence channels.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search providers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-amber-500 outline-none w-48 sm:w-60"
            />
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Provider</span>
          </button>
        </div>
      </div>

      {/* 2. PROVIDERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && providers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
            <span>Loading training providers...</span>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-xs">
            No training providers matching search criteria.
          </div>
        ) : (
          filteredProviders.map((p) => {
            return (
              <div
                key={p.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900">{p.name}</h4>
                      <span className="inline-block mt-0.5 px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Active RTO Partner
                      </span>
                    </div>
                    {p.bookingUrl && (
                      <a
                        href={p.bookingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-500/10 text-slate-600 hover:text-amber-700 transition-colors"
                        title="Open Booking Portal"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {p.coursesOffered && (
                    <div className="mt-3">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Courses Delivered</div>
                      <div className="text-xs text-slate-700 font-medium mt-0.5">{p.coursesOffered}</div>
                    </div>
                  )}

                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    {p.contactName && (
                      <div className="text-slate-800 font-semibold">{p.contactName}</div>
                    )}
                    {p.phone && (
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{p.phone}</span>
                      </div>
                    )}
                    {p.email && (
                      <div className="flex items-center space-x-1.5 text-slate-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{p.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={p.bookingUrl || p.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-amber-700 hover:underline flex items-center space-x-1"
                  >
                    <span>Direct RTO Portal</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Provider Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-900">
            <div className="px-5 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white">Add Training Provider</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProvider} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Provider Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Electricians Training"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Booking URL *
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={bookingUrl}
                    onChange={(e) => setBookingUrl(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Website
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Courses Offered
                </label>
                <input
                  type="text"
                  placeholder="e.g. CPR, LVR, Working at Heights, EWP"
                  value={coursesOffered}
                  onChange={(e) => setCoursesOffered(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:border-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow-md"
                >
                  {isSubmitting ? 'Saving...' : 'Save Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
