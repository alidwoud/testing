import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Camera,
  X,
  Upload,
  CheckCircle2,
  Sparkles,
  Layers,
  MapPin,
  Tag,
  Save,
} from 'lucide-react';

interface PhotoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEntityType?: string;
  defaultEntityId?: number;
  defaultEntityCode?: string;
  defaultCategory?: string;
  defaultPinId?: number;
  onPhotoUploaded?: () => void;
}

const PRESET_SAMPLE_PHOTOS = [
  {
    title: 'Torque Seal Witness Marks',
    category: 'Torque Seal',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80',
    caption: 'Hold-down anchor bolts torqued to 125Nm with red inspection witness seal applied.',
  },
  {
    title: 'Cable Glands & Phase Lugs',
    category: 'Termination',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=80',
    caption: '4C 240mm² copper cable terminations glanded with IP66 brass glands.',
  },
  {
    title: 'Megger 1000V Test Reading',
    category: 'Megger / Testing',
    url: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1000&q=80',
    caption: 'Fluke 1587 insulation test showing >999 MΩ on phase-to-earth test.',
  },
  {
    title: 'Cable Ladder Containment Run',
    category: 'Containment',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
    caption: '600mm heavy duty galvanized ladder tray installed with earth bonding strap.',
  },
  {
    title: 'Defect: Damaged Tray Flange',
    category: 'Defect',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80',
    caption: 'Physical obstruction and bent tray rail at Grid B4 requiring replacement.',
  },
  {
    title: 'Rectified Tray & Re-tested',
    category: 'Rectification',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1000&q=80',
    caption: 'Damaged ladder section replaced and approved by QA consultant.',
  },
];

export const PhotoUploadModal: React.FC<PhotoUploadModalProps> = ({
  isOpen,
  onClose,
  defaultEntityType = 'General',
  defaultEntityId,
  defaultEntityCode = '',
  defaultCategory = 'General',
  defaultPinId,
  onPhotoUploaded,
}) => {
  const { apiFetch, addToast, activeProject, currentUser } = useApp();

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState(defaultCategory);
  const [entityType, setEntityType] = useState(defaultEntityType);
  const [entityCode, setEntityCode] = useState(defaultEntityCode);
  const [photoUrl, setPhotoUrl] = useState(PRESET_SAMPLE_PHOTOS[0].url);
  const [customUrl, setCustomUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESET_SAMPLE_PHOTOS[0]) => {
    setTitle(preset.title);
    setCaption(preset.caption);
    setCategory(preset.category);
    setPhotoUrl(preset.url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = customUrl.trim() || photoUrl;
    if (!title.trim() || !finalUrl) {
      addToast('error', 'Incomplete Form', 'Please enter a title and select/provide a photo.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/photos', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          caption: caption.trim() || undefined,
          category,
          photoUrl: finalUrl,
          entityType: entityType !== 'General' ? entityType : undefined,
          entityId: defaultEntityId || undefined,
          entityCode: entityCode.trim() || undefined,
          spatialPinId: defaultPinId || undefined,
          gpsCoords: '-37.8136, 144.9631',
          qaVerified: currentUser.role === 'QA Manager' ? 'true' : 'false',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload photo');
      }

      addToast('success', 'Photo Evidence Saved', `Uploaded "${title}" to project QA records.`);
      onClose();
      if (onPhotoUploaded) onPhotoUploaded();
    } catch (err: any) {
      addToast('error', 'Upload Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Capture QA Photo Evidence</h2>
              <p className="text-xs text-slate-400">
                Project: <span className="text-amber-400 font-semibold">{activeProject?.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Quick Construction Presets */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center justify-between">
              <span>Select Sample Construction Photo (Site Camera Simulation)</span>
              <span className="text-[11px] text-amber-400 font-normal">Click to apply preset</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_SAMPLE_PHOTOS.map((p, idx) => {
                const isSelected = photoUrl === p.url && !customUrl;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectPreset(p)}
                    className={`relative rounded-xl overflow-hidden border cursor-pointer aspect-video group transition-all ${
                      isSelected
                        ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                        : 'border-slate-800 hover:border-slate-600 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent flex items-end p-1.5">
                      <span className="text-[10px] font-bold text-white line-clamp-1">{p.title}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Title & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Photo Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Torque witness seal"
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                QA Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Pre-pour">Pre-pour</option>
                <option value="Containment">Containment</option>
                <option value="Cable Pull">Cable Pull</option>
                <option value="Termination">Termination</option>
                <option value="Torque Seal">Torque Seal</option>
                <option value="Megger / Testing">Megger / Testing</option>
                <option value="Defect">Defect</option>
                <option value="Rectification">Rectification</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Linked Asset */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Linked Asset Type
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="General">General (No Asset)</option>
                <option value="Cable">Cable</option>
                <option value="Equipment">Equipment</option>
                <option value="ITR">ITR Inspection</option>
                <option value="Issue">Issue / Defect</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Asset Code / Tag
              </label>
              <input
                type="text"
                value={entityCode}
                onChange={(e) => setEntityCode(e.target.value)}
                placeholder="e.g. CB-001, UT-01, ITR-0001"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Caption */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Caption / QA Observations
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={2}
              placeholder="Technical observations, manufacturer torque specs, test instrument reading..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Custom Photo URL (Optional) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
              Or Custom Image URL
            </label>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://... (override preset with custom URL)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-800">
            <span className="text-xs text-slate-500">
              Taken by {currentUser.name} ({currentUser.role})
            </span>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold flex items-center space-x-2 transition-colors disabled:opacity-50 shadow-md shadow-amber-500/20"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Uploading...' : 'Save Evidence'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
