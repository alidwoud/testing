import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Camera,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  Calendar,
  User,
  Tag,
  ExternalLink,
  MapPin,
  Download,
  ShieldCheck,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { PhotoEvidence } from '../types/index.ts';
import { PhotoUploadModal } from './PhotoUploadModal.tsx';

export const PhotosView: React.FC = () => {
  const { apiFetch, addToast, activeProject, currentUser } = useApp();

  const [photos, setPhotos] = useState<PhotoEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedEntityType, setSelectedEntityType] = useState('All');
  const [activePhoto, setActivePhoto] = useState<PhotoEvidence | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const isQaOrAdmin =
    currentUser.role === 'QA Manager' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Supervisor';

  const categories = [
    'All',
    'Pre-pour',
    'Containment',
    'Cable Pull',
    'Termination',
    'Torque Seal',
    'Megger / Testing',
    'Defect',
    'Rectification',
    'General',
  ];

  const entityTypes = ['All', 'Cable', 'Equipment', 'ITR', 'Issue', 'General'];

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      let url = '/api/photos?';
      if (selectedCategory !== 'All') url += `category=${encodeURIComponent(selectedCategory)}&`;
      if (selectedEntityType !== 'All') url += `entityType=${encodeURIComponent(selectedEntityType)}&`;
      if (search.trim()) url += `search=${encodeURIComponent(search.trim())}&`;

      const res = await apiFetch(url);
      if (res.ok) {
        setPhotos(await res.json());
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, [activeProject, selectedCategory, selectedEntityType, search]);

  const handleVerifyPhoto = async (photo: PhotoEvidence) => {
    try {
      const nextVerified = photo.qaVerified === 'true' ? 'false' : 'true';
      const res = await apiFetch(`/api/photos/${photo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ qaVerified: nextVerified }),
      });

      if (res.ok) {
        addToast(
          'success',
          nextVerified === 'true' ? 'QA Sign-off Added' : 'Sign-off Removed',
          `Photo "${photo.title}" ${nextVerified === 'true' ? 'verified by QA' : 'unverified'}.`
        );
        loadPhotos();
        if (activePhoto?.id === photo.id) {
          setActivePhoto({ ...photo, qaVerified: nextVerified });
        }
      }
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-amber-400 mb-1">
            <Camera className="w-4 h-4" />
            <span>Site Visual Records</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 font-mono">{activeProject?.code}</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Photo Evidence Register</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Immutable visual audit trail for pre-pour inspections, containment runs, torque seal witness marks, and testing meters.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-amber-500/20 shrink-0 cursor-pointer"
        >
          <Camera className="w-4 h-4" />
          <span>Capture / Upload Photo</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, caption, asset code (e.g. CB-001, UT-01)..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9.5 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Asset Entity Filter */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] shrink-0">
              Entity:
            </span>
            {entityTypes.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedEntityType(t)}
                className={`px-3 py-1 rounded-lg font-bold transition-colors shrink-0 ${
                  selectedEntityType === t
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px] shrink-0 mr-1">
            Category:
          </span>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                selectedCategory === c
                  ? 'bg-slate-100 text-slate-950 font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Photos Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400">Loading photo evidence...</div>
      ) : photos.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <Camera className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h3 className="text-base font-bold text-white">No photo evidence found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No photos match your current filters. Capture a photo from site to record visual quality proof.
          </p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            <Camera className="w-4 h-4" />
            <span>Upload Photo Now</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => {
                setActivePhoto(photo);
                setZoomLevel(1);
              }}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all cursor-pointer group flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-amber-500/5"
            >
              <div>
                {/* Image Container */}
                <div className="relative aspect-video bg-slate-950 overflow-hidden">
                  <img
                    src={photo.photoUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                      {photo.category}
                    </span>
                    {photo.qaVerified === 'true' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950/80 backdrop-blur-md text-emerald-400 border border-emerald-500/40 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>QA Verified</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom Image Overlay Tag */}
                  {photo.entityCode && (
                    <div className="absolute bottom-2 left-2.5">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/90 text-white border border-slate-700">
                        {photo.entityCode}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors line-clamp-1">
                    {photo.title}
                  </h3>
                  {photo.caption && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {photo.caption}
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-3 bg-slate-850/60 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center space-x-1 truncate">
                  <User className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{photo.takenByName}</span>
                </div>
                <div className="flex items-center space-x-1 shrink-0 text-slate-400 font-mono text-[10px]">
                  <span>{new Date(photo.takenAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Lightbox Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                    {activePhoto.category}
                  </span>
                  {activePhoto.entityCode && (
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-white">
                      {activePhoto.entityCode}
                    </span>
                  )}
                </div>
                <h2 className="text-sm font-bold text-white truncate max-w-md">
                  {activePhoto.title}
                </h2>
              </div>
              <button
                onClick={() => setActivePhoto(null)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Image Preview Canvas */}
            <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden min-h-[350px] max-h-[550px] p-2">
              <img
                src={activePhoto.photoUrl}
                alt={activePhoto.title}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-[500px] w-auto max-w-full object-contain transition-transform duration-200 rounded-lg select-none"
              />

              {/* Zoom Controls */}
              <div className="absolute bottom-4 right-4 flex items-center space-x-1.5 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-2 py-1 rounded-xl shadow-lg">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1 text-slate-400">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded ml-1 border-l border-slate-700 pl-1.5"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Lightbox Footer & Metadata */}
            <div className="p-5 border-t border-slate-800 bg-slate-900 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  {activePhoto.caption && (
                    <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                      {activePhoto.caption}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
                    <span>Taken by {activePhoto.takenByName}</span>
                    <span>•</span>
                    <span>{new Date(activePhoto.takenAt).toLocaleString()}</span>
                    {activePhoto.gpsCoords && (
                      <>
                        <span>•</span>
                        <span className="flex items-center space-x-1 font-mono">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{activePhoto.gpsCoords}</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* QA Verification Action */}
                <div className="flex items-center space-x-3 shrink-0">
                  {isQaOrAdmin && (
                    <button
                      onClick={() => handleVerifyPhoto(activePhoto)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
                        activePhoto.qaVerified === 'true'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-slate-700 border border-slate-700'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {activePhoto.qaVerified === 'true' ? 'QA Verified ✓' : 'Mark as QA Verified'}
                      </span>
                    </button>
                  )}

                  <a
                    href={activePhoto.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    title="Open Full Image"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <PhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onPhotoUploaded={loadPhotos}
      />
    </div>
  );
};
