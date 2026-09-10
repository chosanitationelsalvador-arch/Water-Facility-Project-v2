import React, { useState, useMemo } from 'react';
import { Search, Plus, Check, X, Camera, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WaterSource, WaterRecord, FieldActivity } from '../types';
import { FacilityProfileView } from './FacilityProfileView';
import { useFilters } from '../context/FilterContext';
import { compressImage, safeTrim, safeUpper } from '../utils';

interface WaterSourcesRegistryProps {
  sources: WaterSource[];
  records: WaterRecord[];
  activities: FieldActivity[];
  onAddSource: (source: WaterSource) => void;
  onUpdateSource: (updatedSource: WaterSource, originalSourceKey: string) => void;
  onDeleteSource: (source_key: string) => void;
  onAddActivity: (activity: FieldActivity) => void;
  onUpdateActivity?: (activity: FieldActivity) => void;
  focusedSourceKey: string | null;
  onSelectSource: (key: string) => void;
}

export const WaterSourcesRegistry: React.FC<WaterSourcesRegistryProps> = ({
  sources,
  records,
  activities,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onAddActivity,
  onUpdateActivity,
  focusedSourceKey,
  onSelectSource
}) => {
  const { filters, setFilterBrgy } = useFilters();
  const selectedBrgyFilter = filters.barangay;
  const setSelectedBrgyFilter = setFilterBrgy;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKey, setSelectedKey] = useState<string | null>(focusedSourceKey || (sources[0]?.source_key || null));
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Form Fields for Add Source
  const [newBrgy, setNewBrgy] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newZone, setNewZone] = useState<string>('');
  const [newType, setNewType] = useState<'Level 1 (Point Source)' | 'Level 2 (Communal)' | 'Level 3 (Waterworks)' | 'Commercial Refilling'>('Level 1 (Point Source)');
  const [newHh, setNewHh] = useState<number>(0);
  const [newBuilt, setNewBuilt] = useState<string>('');
  const [newStatus, setNewStatus] = useState<'Active' | 'Inactive' | 'Under Repair' | 'Decommissioned'>('Active');
  const [newLat, setNewLat] = useState<string>('');
  const [newLng, setNewLng] = useState<string>('');
  const [newLandmark, setNewLandmark] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');
  const [newProfilePic, setNewProfilePic] = useState<string>('');

  // Synchronize key if focused from outside (eg. clicking repeat offenders in dashboard)
  React.useEffect(() => {
    if (focusedSourceKey) {
      setSelectedKey(focusedSourceKey);
    }
  }, [focusedSourceKey]);

  // Unique Lists
  const barangays = ['AMOROS', 'BOLISONG', 'HIMAYA', 'HINIGDAAN', 'KALABAYLABAY', 'MOLUGAN', 'BOLOBOLO', 'POBLACION', 'KIBONBON', 'SAMBULAWAN', 'CALONGONAN', 'SINALOC', 'TAYTAY', 'ULALIMAN', 'COGON'];

  const sortedBarangays = useMemo(() => {
    return [...barangays].sort();
  }, [barangays]);

  // Filter sources directory
  const filteredSources = useMemo(() => {
    return sources.filter(s => {
      const matchBrgy = selectedBrgyFilter === 'ALL' || s.barangay.toUpperCase() === selectedBrgyFilter.toUpperCase();
      const matchSearch = s.name_of_source.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.source_type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchBrgy && matchSearch;
    });
  }, [sources, searchQuery, selectedBrgyFilter]);

  const [modalError, setModalError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Selected water source object
  const activeSource = useMemo(() => {
    const key = selectedKey || focusedSourceKey || (sources[0]?.source_key || null);
    return sources.find(s => s.source_key === key) || null;
  }, [sources, selectedKey, focusedSourceKey]);

  // Support local photo uploads for Add Source with client compression
  const handleProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setNewProfilePic(compressed);
    }
  };

  const handleAddSourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrgy || !newName) {
      setModalError('Kindly fill in Barangay and Source Name.');
      return;
    }
    const trimmedBrgy = safeTrim(newBrgy);
    const trimmedName = safeUpper(newName);
    const trimmedZone = safeTrim(newZone);
    const key = `${trimmedBrgy.toUpperCase()}|||${trimmedName}|||${trimmedZone}`;
    const newSource: WaterSource = {
      source_key: key,
      barangay: trimmedBrgy,
      name_of_source: trimmedName,
      zone: trimmedZone,
      source_type: newType,
      households_served: Number(newHh) || 0,
      date_built: newBuilt || new Date().toISOString().split('T')[0],
      status: newStatus,
      landmark_description: newLandmark || 'No landmarks added.',
      gps_lat: Number(newLat) || 8.5630,
      gps_lng: Number(newLng) || 124.5030,
      notes: newNotes || 'No notes added.',
      profile_image_url: newProfilePic || undefined
    };

    onAddSource(newSource);
    setSelectedKey(key);
    onSelectSource(key);
    setShowAddModal(false);
    setModalError(null);

    // Reset Form Fields
    setNewBrgy(''); setNewName(''); setNewZone(''); setNewHh(0);
    setNewBuilt(''); setNewNotes(''); setNewProfilePic(''); setNewLandmark('');
    setNewLat(''); setNewLng('');
    setStatusMessage({ text: 'Water Source successfully registered in the CHO Registry!', type: 'success' });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in relative selection:bg-brand-ocean">
      
      {/* LEFT COLUMN: REGISTRY INDEX */}
      <div className="glass-panel p-5 rounded-2xl border border-brand-slate/20 lg:col-span-4 flex flex-col h-[80vh]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
            CHO Sources Registry
          </h3>
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1 px-3 rounded-lg text-xs font-bold bg-[#7BBDE8] hover:bg-brand-steel text-brand-deep transition flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Plus size={14} className="mr-0.5" /> New
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`flex items-center gap-2 p-2.5 mb-3 rounded-xl border text-xs font-semibold animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle size={14} className="text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Directory Filters */}
        <div className="space-y-2 mb-3.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search water facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="glass-input w-full rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-white placeholder:text-brand-autumn/50"
            />
            <Search size={14} className="absolute left-3.5 top-2.5 text-brand-autumn" />
          </div>
          <div>
            <select
              value={selectedBrgyFilter}
              onChange={(e) => setSelectedBrgyFilter(e.target.value)}
              className="glass-input w-full rounded-lg px-3 py-2 text-xs font-semibold select-none cursor-pointer text-brand-light bg-brand-deep/80 focus:outline-none focus:ring-1 focus:ring-brand-light"
            >
              <option value="ALL">All Barangays (No Filter)</option>
              {sortedBarangays.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sources Directory Index */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
          {filteredSources.length > 0 ? (
            filteredSources.map((source, i) => {
              const active = activeSource?.source_key === source.source_key;
              const fails = records.filter(r => 
                safeUpper(r.brgy) === safeUpper(source.barangay) && 
                safeUpper(r.res) === safeUpper(source.name_of_source) && 
                (!source.zone || !r.zone || safeTrim(r.zone) === safeTrim(source.zone)) && 
                (r.micro === 'FAILED' || r.phychem === 'FAILED')
              ).length;

              return (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedKey(source.source_key);
                    onSelectSource(source.source_key);
                  }}
                  className={`p-2 rounded-xl border transition cursor-pointer flex justify-between items-center ${
                    active
                      ? 'bg-brand-ocean/30 border-brand-light/60 shadow-md'
                      : 'bg-brand-deep/30 border-brand-slate/15 hover:border-brand-soft/40'
                  }`}
                >
                  <div className="min-w-0 flex-1 flex items-baseline gap-2">
                    <h4 className="font-extrabold text-[11px] uppercase text-white truncate shrink-0 max-w-[125px]" title={source.name_of_source}>
                      {source.name_of_source}
                    </h4>
                    <span className="text-[9px] text-brand-autumn uppercase truncate">
                      Zone {source.zone || '-'} • {source.barangay}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full ${
                      source.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                      source.status === 'Inactive' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                      source.status === 'Decommissioned' ? 'bg-slate-400/15 text-slate-400 border border-slate-500/30' :
                      'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                    }`}>
                      {source.status}
                    </span>
                    {fails > 0 && (
                      <span className="text-[8.5px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 px-1 py-0.5 rounded shrink-0">
                        {fails} fails
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center p-8 text-xs text-brand-autumn italic">
              No registered facilities match query.
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ACTIVE SOURCE PROFILE & FIELD HISTORY TIMELINE */}
      <div className="lg:col-span-8 flex flex-col h-[80vh] space-y-6">
        <FacilityProfileView
          activeSource={activeSource}
          records={records}
          activities={activities}
          onUpdateSource={onUpdateSource}
          onDeleteSource={onDeleteSource}
          onAddActivity={onAddActivity}
          onUpdateActivity={onUpdateActivity}
          onSelectSource={(key) => {
            setSelectedKey(key);
            onSelectSource(key);
          }}
        />
      </div>

      {/* MODAL 1: REGISTER WATER SOURCE */}
      {showAddModal && (
        <div className="fixed inset-0 bg-brand-deep/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-panel p-6 border border-brand-light/30 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative select-none">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-brand-autumn hover:text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="border-b border-brand-slate/20 pb-3">
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">
                Register New Water Facility
              </h2>
              <p className="text-[10px] text-brand-autumn mt-0.5">Initialize a new water benchmark inside the CHO dataset directory.</p>
            </div>

            <form onSubmit={handleAddSourceSubmit} className="space-y-4 text-xs font-semibold text-brand-soft">
              {modalError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl border border-rose-500/40 bg-rose-950/80 text-rose-200 text-xs">
                  <AlertCircle size={14} className="shrink-0 text-rose-400" />
                  <span>{modalError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 uppercase text-brand-soft">Barangay Zone *</label>
                  <select
                    required
                    value={newBrgy}
                    onChange={(e) => setNewBrgy(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="" disabled>Select Barangay</option>
                    {barangays.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">Sitio / Zone</label>
                  <input
                    type="text"
                    placeholder="e.g. 3"
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 uppercase">Facility / Resident Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BARANGAY COMMUNITY RESERVOIR"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">Facility classification</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs"
                  >
                    <option value="Level 1 (Point Source)">Level 1 (Point Source - Well/Spring)</option>
                    <option value="Level 2 (Communal)">Level 2 (Communal Faucet)</option>
                    <option value="Level 3 (Waterworks)">Level 3 (Waterworks System)</option>
                    <option value="Commercial Refilling">Commercial Refilling Station</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">Family units served</label>
                  <input
                    type="number"
                    value={newHh}
                    onChange={(e) => setNewHh(Number(e.target.value))}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 inline-block"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">Date constructed</label>
                  <input
                    type="date"
                    value={newBuilt}
                    onChange={(e) => setNewBuilt(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1 text-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">Operational status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as any)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Under Repair">Under Repair / Maintenance</option>
                    <option value="Decommissioned">Decommissioned / Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">GPS Latitude (Centroid)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 8.5555"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">GPS Longitude (Centroid)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 124.5176"
                    value={newLng}
                    onChange={(e) => setNewLng(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 uppercase">Benchmark Landmarks</label>
                  <input
                    type="text"
                    placeholder="e.g. 50 meters north of Barangay chapel"
                    value={newLandmark}
                    onChange={(e) => setNewLandmark(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 uppercase">Technical notes</label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 resize-none custom-scrollbar"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 uppercase">Facility photo upload</label>
                  <label className="relative flex flex-col items-center justify-center h-24 border-2 border-dashed border-brand-slate/40 rounded-xl cursor-pointer hover:border-brand-teal transition overflow-hidden">
                    <input type="file" accept="image/*" onChange={handleProfilePicUpload} className="sr-only" />
                    {newProfilePic ? (
                      <img src={newProfilePic} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-brand-autumn">
                        <Camera size={18} />
                        <span className="text-[9px] uppercase font-bold">Pick an image</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-brand-slate/20">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 font-bold text-brand-soft bg-brand-slate/10 hover:bg-brand-slate/20 rounded-lg cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 font-bold text-brand-deep bg-[#7BBDE8] hover:bg-brand-steel rounded-lg transition shadow-lg flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Check size={14} /> Save Source Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
