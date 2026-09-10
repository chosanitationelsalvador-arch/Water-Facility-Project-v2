import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, ClipboardCheck, Trash2, RotateCcw, Search, Camera, Check, TriangleAlert, CheckCircle2 } from 'lucide-react';
import { WaterRecord, WaterSource, FieldActivity } from '../types';
import { compressImage, safeTrim, safeUpper } from '../utils';

interface DataEntryProps {
  onSave: (record: WaterRecord, activity?: FieldActivity) => void;
  onUpdate: (record: WaterRecord) => void;
  onDelete: (id: string) => void;
  selectedRecord: WaterRecord | null;
  onClearSelection: () => void;
  sources: WaterSource[];
}

export const DataEntry: React.FC<DataEntryProps> = ({
  onSave,
  onUpdate,
  onDelete,
  selectedRecord,
  onClearSelection,
  sources
}) => {
  const [statusBanner, setStatusBanner] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const [date, setDate] = useState<string>('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [zone, setZone] = useState<string>('');
  const [area, setArea] = useState<string>('');
  const [res, setRes] = useState<string>('');
  const [brgy, setBrgy] = useState<string>('');
  const [micro, setMicro] = useState<'PASSED' | 'FAILED' | 'N/A'>('PASSED');
  const [phychem, setPhychem] = useState<'PASSED' | 'FAILED' | 'N/A'>('N/A');
  const [microRem, setMicroRem] = useState<string>('');
  const [phychemRem, setPhychemRem] = useState<string>('');

  // Added Fields
  const [wasChlorinated, setWasChlorinated] = useState<'YES' | 'NO' | 'N/A'>('N/A');
  const [rainedPrior, setRainedPrior] = useState<'YES' | 'NO' | 'N/A'>('N/A');
  const [tankCleaned, setTankCleaned] = useState<'YES' | 'NO' | 'N/A'>('N/A');

  const [samplerPhoto, setSamplerPhoto] = useState<string>('');
  const [sourcePhoto, setSourcePhoto] = useState<string>('');

  // Autocomplete state
  const [sourceSearch, setSourceSearch] = useState<string>('');
  const [showSuggestions, setShowShowSuggestions] = useState<boolean>(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const barangays = ['AMOROS', 'BOLISONG', 'HIMAYA', 'HINIGDAAN', 'KALABAYLABAY', 'MOLUGAN', 'BOLOBOLO', 'POBLACION', 'KIBONBON', 'SAMBULAWAN', 'CALONGONAN', 'SINALOC', 'TAYTAY', 'ULALIMAN', 'COGON'];

  // Handle outside clicks to close suggestion dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Compute Year automatically when Date changes
  useEffect(() => {
    if (date) {
      const yearFromDate = new Date(date).getFullYear();
      if (!isNaN(yearFromDate)) {
        setYear(yearFromDate);
      }
    }
  }, [date]);

  // Load selected record for editing
  useEffect(() => {
    if (selectedRecord) {
      setDate(selectedRecord.date);
      setYear(selectedRecord.year);
      setZone(selectedRecord.zone);
      setArea(selectedRecord.area);
      setRes(selectedRecord.res);
      setBrgy(selectedRecord.brgy);
      setMicro(selectedRecord.micro);
      setPhychem(selectedRecord.phychem);
      setMicroRem(selectedRecord.micro_rem);
      setPhychemRem(selectedRecord.phychem_rem);
      setSamplerPhoto(selectedRecord.sampler_image_url || '');
      setSourcePhoto(selectedRecord.status_image_url || '');

      setWasChlorinated('N/A');
      setRainedPrior('N/A');
      setTankCleaned('N/A');
    }
  }, [selectedRecord]);

  // Filter sources for autocomplete based on selected Barangay
  const filteredSuggestions = useMemo(() => {
    if (!res) return [];
    return sources.filter(s => {
      const matchBrgy = !brgy || s.barangay.toUpperCase() === brgy.toUpperCase();
      const matchName = s.name_of_source.toUpperCase().includes(res.toUpperCase());
      return matchBrgy && matchName;
    });
  }, [sources, res, brgy]);

  // Image upload with compression helper to prevent localStorage quota exhaustion
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'sampler' | 'source') => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      if (type === 'sampler') setSamplerPhoto(compressed);
      else setSourcePhoto(compressed);
    }
  };

  const handleReset = () => {
    setDate('');
    setYear(new Date().getFullYear());
    setZone('');
    setArea('');
    setRes('');
    setBrgy('');
    setMicro('PASSED');
    setPhychem('N/A');
    setMicroRem('');
    setPhychemRem('');
    setWasChlorinated('N/A');
    setRainedPrior('N/A');
    setTankCleaned('N/A');
    setSamplerPhoto('');
    setSourcePhoto('');
    onClearSelection();
    setShowShowSuggestions(false);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !res || !brgy) {
      setStatusBanner({ message: 'Kindly fill in all required fields (Date, Source Name, Barangay).', type: 'error' });
      return;
    }

    const newRecord: WaterRecord = {
      id: selectedRecord ? selectedRecord.id : Date.now().toString(),
      date,
      year,
      zone,
      area,
      res: res.trim().toUpperCase(),
      brgy,
      micro,
      phychem,
      micro_rem: microRem,
      phychem_rem: phychemRem,
      sampler_image_url: samplerPhoto || undefined,
      status_image_url: sourcePhoto || undefined
    };

    // If matching source key exists, auto-generate field activity log
    const match = sources.find(s => 
      safeUpper(s.barangay) === safeUpper(brgy) && 
      safeUpper(s.name_of_source) === safeUpper(res) && 
      (!s.zone || !zone || safeTrim(s.zone) === safeTrim(zone))
    );
    
    let subActivity: FieldActivity | undefined = undefined;
    if (match) {
      subActivity = {
        activity_id: `ACT-${Date.now()}`,
        source_key: match.source_key,
        barangay: brgy,
        source_name: res.toUpperCase(),
        zone,
        date_sampled: date,
        remarks: [microRem, phychemRem].filter(Boolean).join(' | ') || `Logged: Micro ${micro}, PhyChem ${phychem}`,
        linked_result_date: date,
        sampler_image_url: samplerPhoto || undefined,
        status_image_url: sourcePhoto || undefined,
        created_at: new Date().toISOString(),
        was_chlorinated: wasChlorinated,
        rained_prior: rainedPrior,
        tank_cleaned: tankCleaned
      };
    }

    if (selectedRecord) {
      onUpdate(newRecord);
      setStatusBanner({ message: 'Testing report successfully updated.', type: 'success' });
    } else {
      onSave(newRecord, subActivity);
      setStatusBanner({ message: 'New testing report successfully logged in registry.', type: 'success' });
    }
    handleReset();
  };

  const handleDeleteClick = () => {
    if (selectedRecord) {
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = () => {
    if (selectedRecord) {
      onDelete(selectedRecord.id);
      setStatusBanner({ message: 'Water safety report deleted.', type: 'warning' });
      setShowDeleteConfirm(false);
      handleReset();
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in relative selection:bg-brand-ocean">
      {statusBanner && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-xs sm:text-sm font-semibold transition animate-fade-in ${
            statusBanner.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : statusBanner.type === 'error'
              ? 'bg-rose-950/80 border-rose-500/40 text-rose-200'
              : 'bg-amber-950/80 border-amber-500/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusBanner.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            ) : (
              <TriangleAlert size={18} className="text-amber-400 shrink-0" />
            )}
            <span>{statusBanner.message}</span>
          </div>
          <button
            onClick={() => setStatusBanner(null)}
            className="text-white/60 hover:text-white transition text-xs uppercase px-2 py-1"
          >
            Close
          </button>
        </div>
      )}

      {/* In-app safe confirmation modal for deletion (no iframe alert blockage) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#001D39] border border-brand-slate/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <TriangleAlert size={20} />
              </div>
              <h3 className="text-base font-bold text-white font-display">Delete Water Safety Report</h3>
            </div>
            <p className="text-xs sm:text-sm text-brand-soft leading-relaxed">
              Are you absolutely sure you want to delete this water safety report? This record will be permanently removed from the registry.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-soft hover:text-white bg-brand-slate/20 hover:bg-brand-slate/30 transition cursor-pointer border border-brand-slate/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 transition cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Delete Report
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel p-6 rounded-2xl border border-brand-slate/20 shadow-2xl space-y-6">
        <div className="border-b border-brand-slate/20 pb-4">
          <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
            <ClipboardCheck size={22} className="text-brand-light" />
            {selectedRecord ? 'Update Safety Report' : 'Log Water Quality Test Report'}
          </h2>
          <p className="text-xs text-brand-autumn mt-1">
            Maintain municipal testing values. Fill in microbiological and chemical readings accurately.
          </p>
        </div>

        <form onSubmit={handleSaveSubmit} className="space-y-6">
          {/* Spatial / Date Markers Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-brand-soft uppercase tracking-wider mb-2">
                Date Sampled <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-soft uppercase tracking-wider mb-2">
                Year
              </label>
              <input
                type="number"
                disabled
                value={year}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm font-bold font-mono opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-soft uppercase tracking-wider mb-2">
                Zone / Sitio
              </label>
              <input
                type="text"
                placeholder="e.g. 2"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-brand-soft uppercase tracking-wider mb-2">
                Area Marker / Layer
              </label>
              <input
                type="text"
                placeholder="e.g. A"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Autocomplete / Barangay Search Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-brand-soft uppercase tracking-wider mb-2">
                Barangay <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={brgy}
                onChange={(e) => setBrgy(e.target.value)}
                className="glass-input w-full rounded-lg px-3 py-2 text-sm font-semibold"
              >
                <option value="" disabled>Select Barangay</option>
                {barangays.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="relative" ref={suggestionRef}>
              <label className="block text-xs font-bold text-brand-soft uppercase tracking-wider mb-2">
                Source / Residence Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Type address or search registry..."
                  value={res}
                  onChange={(e) => {
                    setRes(e.target.value);
                    setShowShowSuggestions(true);
                  }}
                  onFocus={() => setShowShowSuggestions(true)}
                  className="glass-input w-full rounded-lg pl-10 pr-3 py-2 text-sm uppercase font-semibold text-white"
                />
                <Search size={16} className="absolute left-3.5 top-3 text-brand-autumn" />
              </div>

              {/* Autocomplete Suggestions Box */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-brand-slate bg-brand-deep shadow-2xl z-[110]">
                  <div className="p-2 border-b border-brand-slate/20 text-[10px] uppercase font-bold text-brand-autumn">
                    Matching Registered Sources
                  </div>
                  {filteredSuggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setRes(s.name_of_source);
                        if (s.zone) setZone(s.zone);
                        if (s.barangay) setBrgy(s.barangay);
                        setShowShowSuggestions(false);
                      }}
                      className="p-3 cursor-pointer hover:bg-brand-ocean/30 border-b border-brand-slate/10 transition text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-white uppercase">{s.name_of_source}</div>
                        <div className="text-[10px] text-brand-autumn mt-0.5">{s.barangay} • Zone {s.zone}</div>
                      </div>
                      <span className="text-[10px] bg-brand-ocean/40 text-brand-light border border-brand-slate/40 px-2 py-0.5 rounded font-bold">
                        Autofill
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Test Parameters Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Microbiological */}
            <div className="p-4 rounded-xl border border-brand-slate/10 bg-brand-ocean/10 space-y-4">
              <h3 className="text-xs font-bold uppercase text-[#7BBDE8] tracking-widest border-b border-brand-slate/20 pb-2 flex items-center gap-1.5">
                <span className="p-1 rounded bg-[#7BBDE8]/10 text-brand-light">🔬</span> Microbiological Parameters
              </h3>
              
              <div>
                <label className="block text-[10px] font-bold text-brand-soft uppercase tracking-wider mb-2">
                  Testing Status Result
                </label>
                <select
                  value={micro}
                  onChange={(e) => setMicro(e.target.value as 'PASSED' | 'FAILED' | 'N/A')}
                  className={`glass-input w-full rounded-lg px-3 py-2 text-xs font-bold ${micro === 'PASSED' ? 'text-emerald-400' : (micro === 'FAILED' ? 'text-rose-400' : 'text-brand-autumn')}`}
                >
                  <option value="PASSED">PASSED</option>
                  <option value="FAILED">FAILED</option>
                  <option value="N/A">N/A / UNTESTED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-soft uppercase tracking-wider mb-2">
                  Microbiological Remarks / Lab values
                </label>
                <textarea
                  placeholder="e.g. TOTAL COLIFORM (8.0), THERMOTOLERANT (4.6)"
                  value={microRem}
                  onChange={(e) => setMicroRem(e.target.value)}
                  rows={3}
                  className="glass-input w-full rounded-lg px-3 py-2 text-xs custom-scrollbar resize-none h-20"
                />
              </div>
            </div>

            {/* Physical-Chemical */}
            <div className="p-4 rounded-xl border border-brand-slate/10 bg-brand-ocean/10 space-y-4">
              <h3 className="text-xs font-bold uppercase text-brand-teal tracking-widest border-b border-brand-slate/20 pb-2 flex items-center gap-1.5">
                <span className="p-1 rounded bg-brand-teal/10 text-brand-teal">⚗️</span> Phys-Chem Parameters
              </h3>

              <div>
                <label className="block text-[10px] font-bold text-brand-soft uppercase tracking-wider mb-2">
                  Testing Status Result
                </label>
                <select
                  value={phychem}
                  onChange={(e) => setPhychem(e.target.value as 'PASSED' | 'FAILED' | 'N/A')}
                  className={`glass-input w-full rounded-lg px-3 py-2 text-xs font-bold ${phychem === 'PASSED' ? 'text-emerald-400' : (phychem === 'FAILED' ? 'text-rose-400' : 'text-brand-autumn')}`}
                >
                  <option value="PASSED">PASSED</option>
                  <option value="FAILED">FAILED</option>
                  <option value="N/A">N/A / UNTESTED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-brand-soft uppercase tracking-wider mb-2">
                  Phys-Chem Remarks / Chemicals
                </label>
                <textarea
                  placeholder="e.g. Nitrate FAILED (110.0), Turbidity Clear, TDS 320"
                  value={phychemRem}
                  onChange={(e) => setPhychemRem(e.target.value)}
                  rows={3}
                  className="glass-input w-full rounded-lg px-3 py-2 text-xs custom-scrollbar resize-none h-20"
                />
              </div>
            </div>
          </div>

          {/* ADDED SECTION: SAMPLES SANITARY CONDITIONS AND PHOTOS */}
          <div className="glass-panel p-5 rounded-xl border border-brand-slate/20 space-y-5">
            <h3 className="text-xs font-bold uppercase text-[#7BBDE8] tracking-widest border-b border-brand-slate/20 pb-2 flex items-center gap-2">
              <span>💧</span> Auxiliary Sanitary Conditions & Photos
            </h3>

            {/* Toggle group buttons representing conditions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Was the source Chlorinated?', value: wasChlorinated, onChange: setWasChlorinated },
                { label: 'Rain in previous 72 hours?', value: rainedPrior, onChange: setRainedPrior },
                { label: 'Tank/reservoir cleaned?', value: tankCleaned, onChange: setTankCleaned }
              ].map((cond, i) => (
                <div key={i} className="flex flex-col gap-2 p-3.5 rounded-lg bg-brand-deep/50 border border-brand-slate/10">
                  <span className="text-[11px] font-bold text-brand-soft">{cond.label}</span>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {['YES', 'NO', 'N/A'].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => cond.onChange(val as 'YES' | 'NO' | 'N/A')}
                        className={`py-1.5 rounded text-[10px] font-bold transition border ${
                          cond.value === val
                            ? 'bg-brand-ocean border-brand-light text-white shadow-lg'
                            : 'bg-brand-deep/80 border-brand-slate/10 text-brand-autumn hover:bg-brand-deep hover:text-brand-soft'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Photo Previews */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Photo 1 */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-brand-autumn tracking-wider block">Sampler Agent Photo</span>
                <label className="relative flex flex-col items-center justify-center h-28 border-2 border-dashed border-brand-slate/30 hover:border-brand-light rounded-lg cursor-pointer bg-brand-deep/30 transition group overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'sampler')}
                    className="sr-only"
                  />
                  {samplerPhoto ? (
                    <>
                      <img src={samplerPhoto} alt="Sampler" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setSamplerPhoto(''); }}
                        className="absolute top-2 right-2 bg-rose-500/80 hover:bg-rose-600 p-1.5 rounded-full text-white text-[10px] font-bold shadow-lg"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-brand-autumn group-hover:text-brand-light transition">
                      <Camera size={22} />
                      <span className="text-[10px] font-extrabold uppercase">Upload Sampler photo</span>
                    </div>
                  )}
                </label>
              </div>

              {/* Photo 2 */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-brand-autumn tracking-wider block">Well / Tap State Photo</span>
                <label className="relative flex flex-col items-center justify-center h-28 border-2 border-dashed border-brand-slate/30 hover:border-brand-light rounded-lg cursor-pointer bg-brand-deep/30 transition group overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'source')}
                    className="sr-only"
                  />
                  {sourcePhoto ? (
                    <>
                      <img src={sourcePhoto} alt="Source" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setSourcePhoto(''); }}
                        className="absolute top-2 right-2 bg-rose-500/80 hover:bg-rose-600 p-1.5 rounded-full text-white text-[10px] font-bold shadow-lg"
                      >
                        Remove
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-brand-autumn group-hover:text-brand-light transition">
                      <Camera size={22} />
                      <span className="text-[10px] font-extrabold uppercase">Upload Source State photo</span>
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions Section */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-slate/20 pt-4">
            <div>
              {selectedRecord && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="px-4 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 hover:border-rose-500/50 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} /> Delete Report
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 text-xs font-bold text-brand-soft bg-brand-slate/10 border border-brand-slate/10 rounded-lg hover:bg-brand-slate/25 transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={14} /> Reset
              </button>
              <button
                type="submit"
                className="px-6 py-2 text-xs font-bold text-brand-deep bg-[#7BBDE8] hover:bg-brand-steel rounded-lg transition shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                {selectedRecord ? (
                  <>
                    <Check size={14} /> Update Record
                  </>
                ) : (
                  <>
                    <Save size={14} /> Save Record Report
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
