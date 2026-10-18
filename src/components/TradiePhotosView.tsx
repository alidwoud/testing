import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Camera,
  Upload,
  Plus,
  Tag,
  CheckCircle2,
  MapPin,
  Clock,
  ExternalLink,
  X,
  Maximize2,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Search,
  Filter,
} from 'lucide-react';
import { PhotoEvidence } from '../types/index.ts';
import { PhotoUploadModal } from './PhotoUploadModal.tsx';
import { PhotosView } from './PhotosView.tsx';

export const TradiePhotosView: React.FC = () => {
  const { apiFetch, addToast, activeProject, currentUser } = useApp();

  const [photos, setPhotos] = useState<PhotoEvidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedEntityForUpload, setSelectedEntityForUpload] = useState<string>('General');
  const [activePhoto, setActivePhoto] = useState<PhotoEvidence | null>(null);
  const [showAdvancedRegister, setShowAdvancedRegister] = useState(false);

  const isSupervisorOrQa =
    currentUser.role === 'Supervisor' ||
    currentUser.role === 'QA Manager' ||
    currentUser.role === 'Administrator' ||
    currentUser.role === 'Project Manager';

  const loadRecentPhotos = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/photos');
      if (res.ok) {
        setPhotos(await res.json());
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecentPhotos();
  }, [activeProject]);

  const handleOpenAttachFor = (entityType: string) => {
    setSelectedEntityForUpload(entityType);
    setIsUploadModalOpen(true);
  };

  // If user wants advanced register, render the full PhotosView
  if (showAdvancedRegister) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl">
          <span className="text-xs font-bold text-amber-400">
            Advanced Photo Register Mode
          </span>
          <button
            onClick={() => setShowAdvancedRegister(false)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-colors"
          >
            ← Switch to Simple Tradie Photos
          </button>
        </div>
        <PhotosView />
      </div>
    );
  }

  const attachTargets = [
    { label: 'Inspection / ITR', type: 'ITR', icon: '📋', desc: 'Attach to QA checklist' },
    { label: 'Issue / Defect', type: 'Issue', icon: '⚠️', desc: 'Attach to defect ticket' },
    { label: 'Equipment', type: 'Equipment', icon: '⚡', desc: 'Nameplate or mounting' },
    { label: 'Cable', type: 'Cable', icon: '🔌', desc: 'Gland, lug, or pull run' },
    { label: 'Location / Room', type: 'Location', icon: '📍', desc: 'Room containment view' },
    { label: 'Work Item', type: 'General', icon: '🔨', desc: 'General progress evidence' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border-2 border-slate-800 p-5 rounded-3xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-widest text-emerald-400">
            SITE EVIDENCE
          </div>
          <h1 className="text-2xl font-black text-white">PHOTOS</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Quickly capture and attach photographic proof to your site inspections & installations
          </p>
        </div>

        {isSupervisorOrQa && (
          <button
            onClick={() => setShowAdvancedRegister(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700 text-xs font-bold transition-all shadow-sm shrink-0"
          >
            Advanced QA Register →
          </button>
        )}
      </div>

      {/* 2. Giant Tactile TAKE PHOTO Button */}
      <div className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 p-6 sm:p-8 rounded-3xl shadow-xl text-center text-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-2xl bg-slate-950 text-emerald-400 flex items-center justify-center mb-3 shadow-lg">
          <Camera className="w-9 h-9" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
          TAKE SITE PHOTO
        </h2>
        <p className="text-xs sm:text-sm font-bold text-slate-900/90 max-w-md mt-1 mb-5">
          Snap work in progress, torque witness marks, or cable glanding for instant QA record
        </p>

        <button
          onClick={() => handleOpenAttachFor('General')}
          className="px-8 py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-900 text-emerald-300 font-black text-sm uppercase tracking-wider shadow-2xl transition-all transform active:scale-95 cursor-pointer flex items-center space-x-2"
        >
          <Camera className="w-5 h-5 text-emerald-400" />
          <span>OPEN CAMERA / UPLOAD</span>
        </button>
      </div>

      {/* 3. ATTACH PHOTO TO: Quick Selectors */}
      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Attach Photo Directly To:
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {attachTargets.map((t) => (
            <button
              key={t.type}
              onClick={() => handleOpenAttachFor(t.type)}
              className="p-3.5 rounded-2xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/50 transition-all text-left group cursor-pointer"
            >
              <div className="text-2xl mb-1.5">{t.icon}</div>
              <div className="text-xs font-black text-white group-hover:text-emerald-400 transition-colors">
                {t.label}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. RECENT PHOTOS GALLERY */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span className="font-extrabold uppercase tracking-wider">Recent Site Photos</span>
          <span className="font-mono text-emerald-400 font-bold">{photos.length} Captured</span>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
            {photos.map((photo) => (
              <div
                key={photo.id}
                onClick={() => setActivePhoto(photo)}
                className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/60 rounded-2xl overflow-hidden shadow-md cursor-pointer transition-all aspect-square flex flex-col justify-end"
              >
                <img
                  src={photo.photoUrl}
                  alt={photo.title}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />

                {/* Top Badge */}
                <div className="absolute top-2 left-2 z-10 flex items-center space-x-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-950/80 backdrop-blur-md text-amber-300 border border-slate-800">
                    {photo.category || photo.entityType || 'QA'}
                  </span>
                  {photo.qaVerified === 'true' && (
                    <span className="p-0.5 rounded-md bg-emerald-500/80 backdrop-blur-md text-slate-950" title="Verified by QA">
                      <ShieldCheck className="w-3 h-3" />
                    </span>
                  )}
                </div>

                {/* Bottom Overlay */}
                <div className="relative z-10 p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
                  <div className="text-xs font-bold text-white truncate">{photo.title}</div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between mt-0.5 font-mono">
                    <span>{photo.entityCode || photo.entityType || 'Site'}</span>
                    <span>{new Date(photo.takenAt).toLocaleDateString('en-AU')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
            <Camera className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <div className="font-bold text-white text-base">No photos uploaded yet</div>
            <p className="text-xs text-slate-400 mt-1">
              Tap the button above to capture your first site photo.
            </p>
          </div>
        )}
      </div>

      {/* Modal for Lightbox Preview */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{activePhoto.title}</h3>
                <p className="text-xs text-slate-400">
                  Taken by {activePhoto.takenByName || 'Dave Miller'} • {new Date(activePhoto.takenAt).toLocaleString('en-AU')}
                </p>
              </div>
              <button
                onClick={() => setActivePhoto(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[60vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={activePhoto.photoUrl}
                alt={activePhoto.title}
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div className="p-5 space-y-3 bg-slate-900">
              {activePhoto.caption && (
                <p className="text-xs text-slate-300 italic">"{activePhoto.caption}"</p>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
                <span className="font-mono text-amber-400">
                  Target: {activePhoto.entityType} {activePhoto.entityCode ? `(${activePhoto.entityCode})` : ''}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                  {activePhoto.category}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <PhotoUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        defaultEntityType={selectedEntityForUpload}
        defaultCategory="QA / Inspection"
        onPhotoUploaded={() => {
          loadRecentPhotos();
          addToast('success', 'Photo Attached', 'Site photo uploaded successfully.');
        }}
      />
    </div>
  );
};
