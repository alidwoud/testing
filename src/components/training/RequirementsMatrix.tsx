import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Info,
  Shield,
  Check,
  X,
  HelpCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext.tsx';

export const RequirementsMatrix: React.FC = () => {
  const { currentUser, addToast } = useApp();
  const [data, setData] = useState<{ types: any[]; matrix: any[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workforce/training/requirements-matrix', {
        headers: {
          'x-user-role': currentUser.role,
        },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const handleToggleRequirement = async (role: string, typeCode: string, currentVal: boolean) => {
    const key = `${role}_${typeCode}`;
    setUpdatingKey(key);

    try {
      const newVal = !currentVal;
      const res = await fetch('/api/workforce/training/requirements-matrix', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser.role,
        },
        body: JSON.stringify({
          tradeRole: role,
          qualificationTypeCode: typeCode,
          isMandatory: newVal,
        }),
      });

      if (res.ok) {
        // Update local state optimistically
        setData((prev) => {
          if (!prev) return prev;
          const nextMatrix = prev.matrix.map((row) => {
            if (row.role === role) {
              return {
                ...row,
                requirements: {
                  ...row.requirements,
                  [typeCode]: newVal,
                },
              };
            }
            return row;
          });
          return { ...prev, matrix: nextMatrix };
        });

        addToast(
          'info',
          'Requirement Updated',
          `${typeCode} is now ${newVal ? 'Mandatory' : 'Optional / Not Required'} for ${role}`
        );
      }
    } catch (err: any) {
      addToast('error', 'Update Failed', err.message);
    } finally {
      setUpdatingKey(null);
    }
  };

  const types = data?.types || [];
  const matrix = data?.matrix || [];

  return (
    <div className="space-y-4">
      {/* 1. HEADER & EXPLANATION */}
      <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="font-black text-base text-slate-900">Trade & Role Qualification Requirements Matrix</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Defines mandatory vs recommended competency requirements. Workers lacking mandatory qualifications are flagged on allocation.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-semibold shrink-0">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-slate-700">Mandatory (Blocks Work)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-200" />
            <span className="text-slate-500">Optional / Not Required</span>
          </span>
        </div>
      </div>

      {/* 2. MATRIX TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider select-none">
                <th className="py-3 px-4 w-48">Trade / Role Classification</th>
                {types.map((t) => (
                  <th key={t.code} className="py-3 px-3 text-center min-w-[100px]">
                    <div className="font-bold text-slate-900">{t.code}</div>
                    <div className="text-[9px] text-slate-400 font-normal truncate max-w-[120px]" title={t.name}>
                      {t.name}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && matrix.length === 0 ? (
                <tr>
                  <td colSpan={types.length + 1} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Loading compliance requirements matrix...</span>
                  </td>
                </tr>
              ) : (
                matrix.map((row) => {
                  return (
                    <tr key={row.role} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 bg-slate-50/40">
                        {row.role}
                      </td>

                      {types.map((t) => {
                        const isMandatory = Boolean(row.requirements?.[t.code]);
                        const isUpdating = updatingKey === `${row.role}_${t.code}`;

                        return (
                          <td key={t.code} className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleRequirement(row.role, t.code, isMandatory)}
                              disabled={isUpdating}
                              className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                                isMandatory
                                  ? 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 shadow-2xs font-black'
                                  : 'bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 border border-slate-200 font-medium'
                              }`}
                              title={`Click to toggle ${t.code} requirement for ${row.role}`}
                            >
                              {isUpdating ? (
                                <RefreshCw className="w-3 h-3 animate-spin mx-auto text-slate-400" />
                              ) : isMandatory ? (
                                <span className="flex items-center justify-center space-x-1">
                                  <Shield className="w-3 h-3 text-rose-500" />
                                  <span>Mandatory</span>
                                </span>
                              ) : (
                                <span>Optional</span>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
