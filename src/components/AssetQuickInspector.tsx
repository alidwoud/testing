import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  X,
  ExternalLink,
  Camera,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Cpu,
  Cable as CableIcon,
  ClipboardCheck,
  Building2,
  Plus,
} from 'lucide-react';
import { SpatialPin, PhotoEvidence } from '../types/index.ts';

interface AssetQuickInspectorProps {
  pin: SpatialPin | null;
  onClose: () => void;
  onOpenAsset?: (entityType: string, entityId: number) => void;
  onAddPhoto?: (entityType: string, entityId: number, entityCode: string, pinId: number) => void;
}

export const AssetQuickInspector: React.FC<AssetQuickInspectorProps> = ({
  pin,
  onClose,
  onOpenAsset,
  onAddPhoto,
}) => {
  const {
    apiFetch,
    setSelectedCableId,
    setSelectedEquipmentId,
    setSelectedItrId,
    setActiveTab,
  } = useApp();

  const [entityDetails, setEntityDetails] = useState<any>(null);
  const [photos, setPhotos] = useState<PhotoEvidence[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pin) {
      setEntityDetails(null);
      setPhotos([]);
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        // Fetch specific asset details based on entity type
        if (pin.entityType === 'Cable') {
          const res = await apiFetch(`/api/cables/${pin.entityId}`);
          if (res.ok) setEntityDetails(await res.json());
        } else if (pin.entityType === 'Equipment') {
          const res = await apiFetch(`/api/equipment/${pin.entityId}`);
          if (res.ok) setEntityDetails(await res.json());
        } else if (pin.entityType === 'ITR') {
          const res = await apiFetch(`/api/itr-instances/${pin.entityId}`);
          if (res.ok) setEntityDetails(await res.json());
        } else if (pin.entityType === 'Issue') {
          const res = await apiFetch(`/api/issues/${pin.entityId}`);
          if (res.ok) setEntityDetails(await res.json());
        }

        // Fetch photos linked to this asset or pin
        const photoRes = await apiFetch(`/api/photos?entityId=${pin.entityId}`);
        if (photoRes.ok) {
          const data = await photoRes.json();
          setPhotos(data);
        }
      } catch (err) {
        console.error('Failed to load pin asset details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pin]);

  if (!pin) return null;

  const handleNavigateToAsset = () => {
    if (onOpenAsset) {
      onOpenAsset(pin.entityType, pin.entityId);
    } else {
      if (pin.entityType === 'Cable') {
        setSelectedCableId(pin.entityId);
        setActiveTab('cables');
      } else if (pin.entityType === 'Equipment') {
        setSelectedEquipmentId(pin.entityId);
        setActiveTab('equipment');
      } else if (pin.entityType === 'ITR') {
        setSelectedItrId(pin.entityId);
        setActiveTab('itrs');
      } else if (pin.entityType === 'Issue') {
        setActiveTab('issues');
      }
    }
    onClose();
  };

  const getStatusBadge = () => {
    const s = pin.status as string;
    if (s === 'Approved' || s === 'Tested') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{s}</span>
        </span>
      );
    }
    if (s === 'In Progress' || s === 'Testing') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <Clock className="w-3.5 h-3.5" />
          <span>{s}</span>
        </span>
      );
    }
    if (s === 'Defect' || s === 'Rejected') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{s}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
        <span>{s}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            {pin.entityType === 'Cable' && <CableIcon className="w-4 h-4" />}
            {pin.entityType === 'Equipment' && <Cpu className="w-4 h-4" />}
            {pin.entityType === 'ITR' && <ClipboardCheck className="w-4 h-4" />}
            {pin.entityType === 'Issue' && <AlertTriangle className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Spatial Pin
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-[10px] font-mono text-slate-400">
                {pin.x.toFixed(1)}%, {pin.y.toFixed(1)}%
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">{pin.entityCode}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title & Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {pin.entityType}
            </span>
            {getStatusBadge()}
          </div>
          <h2 className="text-base font-bold text-white leading-snug">{pin.title}</h2>
          {pin.notes && (
            <p className="text-xs text-slate-300 bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 leading-relaxed">
              {pin.notes}
            </p>
          )}
        </div>

        {/* Entity-Specific Quick Stats */}
        {entityDetails && (
          <div className="bg-slate-850 border border-slate-800 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
              Asset Specifications
            </div>

            {pin.entityType === 'Cable' && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>Routing:</span>
                  <span className="text-white font-medium">
                    {entityDetails.fromEquipmentCode} → {entityDetails.toEquipmentCode}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Type & Size:</span>
                  <span className="text-white font-medium">{entityDetails.cableType} ({entityDetails.cableSize})</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Length:</span>
                  <span className="text-white font-medium">{entityDetails.length ? `${entityDetails.length}m` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>QA Status:</span>
                  <span className="text-amber-400 font-bold">{entityDetails.qaStatus}</span>
                </div>
              </>
            )}

            {pin.entityType === 'Equipment' && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>Equipment Name:</span>
                  <span className="text-white font-medium truncate max-w-[180px]">{entityDetails.equipmentName}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Type / System:</span>
                  <span className="text-white font-medium">{entityDetails.equipmentType} ({entityDetails.system})</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Responsible:</span>
                  <span className="text-white font-medium">{entityDetails.responsibleCompany}</span>
                </div>
              </>
            )}

            {pin.entityType === 'ITR' && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>Inspection Number:</span>
                  <span className="text-white font-medium font-mono">{entityDetails.itrNumber}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Template:</span>
                  <span className="text-white font-medium">{entityDetails.templateTitle}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Current Stage:</span>
                  <span className="text-amber-400 font-bold">{entityDetails.status}</span>
                </div>
              </>
            )}

            {pin.entityType === 'Issue' && (
              <>
                <div className="flex justify-between text-slate-400">
                  <span>Priority:</span>
                  <span className="text-rose-400 font-bold">{entityDetails.priority}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Assigned To:</span>
                  <span className="text-white font-medium">{entityDetails.assignedPerson || 'Unassigned'}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Photo Evidence Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Photo Evidence ({photos.length})</span>
            </div>
            {onAddPhoto && (
              <button
                onClick={() => onAddPhoto(pin.entityType, pin.entityId, pin.entityCode, pin.id)}
                className="flex items-center space-x-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Add Photo</span>
              </button>
            )}
          </div>

          {photos.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No photos attached to this spatial point yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative rounded-lg overflow-hidden border border-slate-800 bg-slate-950 aspect-video"
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-1.5">
                    <span className="text-[10px] font-medium text-white line-clamp-1">
                      {photo.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pin Creator Info */}
        <div className="text-[11px] text-slate-500 border-t border-slate-800/80 pt-3 flex items-center justify-between">
          <span>Placed by {pin.createdByName || 'Site Engineer'}</span>
          <span>{new Date(pin.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center space-x-3">
        <button
          onClick={handleNavigateToAsset}
          className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 transition-colors shadow-md shadow-amber-500/20"
        >
          <span>Open Full {pin.entityType} Object</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
