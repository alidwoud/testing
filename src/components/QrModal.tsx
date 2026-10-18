import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X, Search, Camera, CheckCircle2, ArrowRight, Printer } from 'lucide-react';

export const QrModal: React.FC = () => {
  const {
    isQrModalOpen,
    setIsQrModalOpen,
    apiFetch,
    setSelectedEquipmentId,
    setSelectedCableId,
    setSelectedItrId,
    setActiveTab,
    addToast,
  } = useApp();

  const [scannedCode, setScannedCode] = useState('');
  const [activeTab, setModalTab] = useState<'scan' | 'generate'>('scan');
  const [selectedEntityForQr, setSelectedEntityForQr] = useState<string>('FORGE:EQ:UT-01');
  const [entityLabel, setEntityLabel] = useState<string>('UT-01 • Unit Substation 01');
  const [isSearching, setIsSearching] = useState(false);

  if (!isQrModalOpen) return null;

  const handleResolveCode = async (codeToLookup: string) => {
    if (!codeToLookup.trim()) return;
    setIsSearching(true);
    try {
      const res = await apiFetch(`/api/qr/lookup?code=${encodeURIComponent(codeToLookup.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setIsQrModalOpen(false);
        if (data.type === 'Equipment') {
          setSelectedEquipmentId(data.item.id);
          setActiveTab('equipment');
          addToast('success', `Scanned Equipment: ${data.item.equipmentCode}`, data.item.equipmentName);
        } else if (data.type === 'Cable') {
          setSelectedCableId(data.item.id);
          setActiveTab('cables');
          addToast('success', `Scanned Cable: ${data.item.cableId}`, `${data.item.fromEquipmentCode || ''} → ${data.item.toEquipmentCode || ''}`);
        } else if (data.type === 'Location') {
          setActiveTab('locations');
          addToast('success', `Scanned Location: ${data.item.name}`, data.item.path || data.item.code);
        } else if (data.type === 'ITR') {
          setSelectedItrId(data.item.id);
          setActiveTab('itrs');
          addToast('success', `Scanned Inspection: ${data.item.itrNumber}`, data.item.title);
        } else if (data.type === 'Issue') {
          setActiveTab('issues');
          addToast('success', `Scanned Issue: ${data.item.issueNumber}`, data.item.title);
        } else if (data.type === 'Drawing') {
          setActiveTab('maps');
          addToast('success', `Scanned Drawing: ${data.item.drawingNumber}`, data.item.title);
        } else if (data.type === 'Worker') {
          setActiveTab('workforce');
          addToast('success', `Scanned Worker: ${data.item.displayName || 'Unknown Worker'}`, `${data.item.tradeRole || 'Not Set'} • ${data.item.companyName || 'Not Set'}`);
        }
      } else {
        addToast('error', 'Item Not Found', `No asset, inspection, or drawing found with QR code '${codeToLookup}'`);
      }
    } catch {
      addToast('error', 'Lookup Failed', 'Could not communicate with project server');
    } finally {
      setIsSearching(false);
    }
  };

  const presetQrs = [
    { code: 'FORGE:EQ:UT-01', label: 'UT-01 (Unit Substation 01)', type: 'Equipment' },
    { code: 'FORGE:EQ:MSB-01', label: 'MSB-01 (Main Switchboard 01)', type: 'Equipment' },
    { code: 'FORGE:CB:CB-L02-UT01-001', label: 'CB-L02-UT01-001 (4C 240mm² Cable)', type: 'Cable' },
    { code: 'FORGE:LOC:LA2', label: 'LA2 (Switch Room 01 Location)', type: 'Location' },
    { code: 'FORGE:ITR:ITR-001', label: 'ITR-001 (Cable Pull & Termination)', type: 'ITR' },
    { code: 'FORGE:ISSUE:ISS-01', label: 'ISS-01 (Missing Torque Seal Witness)', type: 'Issue' },
    { code: 'FORGE:DWG:E-201', label: 'E-201 (Switch Room Single Line Diagram)', type: 'Drawing' },
    { code: 'FORGE:WRK:EMP-105', label: 'EMP-105 (Dave Miller - Electrician)', type: 'Worker' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">QR Code Scanner & Tag Generator</h3>
              <p className="text-xs text-slate-400">Scan physical asset tags or generate labels for site equipment</p>
            </div>
          </div>
          <button
            onClick={() => setIsQrModalOpen(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40">
          <button
            onClick={() => setModalTab('scan')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'scan'
                ? 'border-amber-400 text-amber-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Scan On Site
          </button>
          <button
            onClick={() => setModalTab('generate')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
              activeTab === 'generate'
                ? 'border-amber-400 text-amber-400 bg-slate-900/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Generate Site Tag
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6">
          {activeTab === 'scan' ? (
            <div className="space-y-5">
              {/* Camera Scanner Simulation Viewfinder */}
              <div className="relative border-2 border-dashed border-amber-500/40 rounded-2xl p-6 bg-slate-950/80 flex flex-col items-center justify-center text-center">
                <div className="w-48 h-48 border-2 border-amber-400/80 rounded-xl relative flex items-center justify-center bg-slate-900/50 shadow-inner">
                  {/* Target Crosshairs */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-amber-400" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-amber-400" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-amber-400" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-amber-400" />
                  <Camera className="w-10 h-10 text-amber-400/60 animate-pulse" />
                </div>
                <p className="text-xs text-slate-300 mt-3 font-medium">
                  Point camera at equipment / cable QR tag
                </p>
                <p className="text-[11px] text-slate-400">
                  Instant object page navigation & ITR access
                </p>
              </div>

              {/* Manual Input or Quick Site Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Or Enter Code / Scan Result:
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={scannedCode}
                    onChange={(e) => setScannedCode(e.target.value)}
                    placeholder="e.g. UT-01 or FORGE:EQ:UT-01"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleResolveCode(scannedCode)}
                  />
                  <button
                    onClick={() => handleResolveCode(scannedCode)}
                    disabled={isSearching || !scannedCode.trim()}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center space-x-1"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick site presets */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Site Test Presets (Tap to Open):
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {presetQrs.map((p) => (
                    <button
                      key={p.code}
                      onClick={() => handleResolveCode(p.code)}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left text-xs transition-colors group"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-amber-400 font-bold">{p.code.replace('FORGE:', '')}</span>
                        <span className="text-slate-300">{p.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 group-hover:text-amber-400 font-semibold">
                        Simulate Scan →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider text-left">
                  Select Equipment to Generate Printable Tag:
                </label>
                <select
                  value={selectedEntityForQr}
                  onChange={(e) => {
                    setSelectedEntityForQr(e.target.value);
                    const match = presetQrs.find((p) => p.code === e.target.value);
                    if (match) setEntityLabel(match.label);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="FORGE:EQ:UT-01">UT-01 • Unit Substation 01 (Schneider 2500kVA)</option>
                  <option value="FORGE:EQ:MSB-01">MSB-01 • Main Switchboard 01 (PowerZone 4000A)</option>
                  <option value="FORGE:EQ:UT-02">UT-02 • Unit Substation 02 (Schneider 2500kVA)</option>
                  <option value="FORGE:EQ:MSB-02">MSB-02 • Main Switchboard 02 (PowerZone 4000A)</option>
                  <option value="FORGE:CB:CB-L02-UT01-001">CB-L02-UT01-001 • 4C 240mm² Cable</option>
                  <option value="FORGE:LOC:L02-SR01">Switch Room 01 • Level 02</option>
                </select>
              </div>

              {/* Printable Tag Preview */}
              <div className="bg-white text-slate-950 p-6 rounded-2xl shadow-xl border-4 border-slate-900 inline-block mx-auto max-w-xs">
                <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 border-b pb-1 mb-2">
                  MAXIM FORGE SITE ASSET TAG
                </div>
                <div className="bg-white p-2 rounded-lg inline-block">
                  <QRCodeSVG value={selectedEntityForQr} size={150} level="H" />
                </div>
                <div className="font-mono font-black text-sm tracking-tight text-slate-900 mt-2">
                  {selectedEntityForQr}
                </div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5">{entityLabel}</div>
                <div className="text-[10px] text-slate-400 mt-2">DC Melbourne 02 • Level 02</div>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Asset Tag</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
