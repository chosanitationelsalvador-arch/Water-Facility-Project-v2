import React, { useState, useMemo, useEffect } from 'react';
import { Camera, MapPin, Users, Calendar, Edit, Trash2, PlusCircle, Clock, X, Check, TriangleAlert, CheckCircle2, AlertCircle } from 'lucide-react';
import { WaterSource, WaterRecord, FieldActivity } from '../types';
import { compressImage, safeTrim, safeUpper } from '../utils';

interface FacilityProfileViewProps {
  activeSource: WaterSource | null;
  records: WaterRecord[];
  activities: FieldActivity[];
  onUpdateSource: (updated: WaterSource, originalKey?: string) => void;
  onDeleteSource: (key: string) => void;
  onAddActivity: (act: FieldActivity) => void;
  onUpdateActivity?: (act: FieldActivity) => void;
  onSelectSource?: (key: string) => void;
  onClose?: () => void;
  isPresentationMode?: boolean;
}

const formatDateNicely = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const FacilityProfileView: React.FC<FacilityProfileViewProps> = ({
  activeSource,
  records,
  activities,
  onUpdateSource,
  onDeleteSource,
  onAddActivity,
  onUpdateActivity,
  onSelectSource,
  onClose,
  isPresentationMode = false
}) => {
  // Feedback and Confirmation Modals
  const [statusToast, setStatusToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState<boolean>(false);

  // Modal State Control
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);

  // Form Fields for Edit Source
  const [editBrgy, setEditBrgy] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editZone, setEditZone] = useState<string>('');
  const [editType, setEditType] = useState<'Level 1 (Point Source)' | 'Level 2 (Communal)' | 'Level 3 (Waterworks)' | 'Commercial Refilling'>('Level 1 (Point Source)');
  const [editHh, setEditHh] = useState<number>(0);
  const [editBuilt, setEditBuilt] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive' | 'Under Repair' | 'Decommissioned'>('Active');
  const [editLat, setEditLat] = useState<string>('');
  const [editLng, setEditLng] = useState<string>('');
  const [editLandmark, setEditLandmark] = useState<string>('');
  const [editNotes, setEditNotes] = useState<string>('');
  const [editProfilePic, setEditProfilePic] = useState<string>('');

  // Form Fields for Activity Note Log
  const [actDate, setActDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [actRemarks, setActRemarks] = useState<string>('');
  const [actChlorinated, setActChlorinated] = useState<'YES' | 'NO' | 'N/A'>('N/A');
  const [actRain, setActRain] = useState<'YES' | 'NO' | 'N/A'>('N/A');
  const [actCleaned, setActCleaned] = useState<'YES' | 'NO' | 'N/A'>('N/A');
  const [actSamplerPic, setActSamplerPic] = useState<string>('');
  const [actSourcePic, setActSourcePic] = useState<string>('');

  // Photo Lightbox Data
  const [lightboxData, setLightboxData] = useState<{
    isOpen: boolean;
    title: string;
    date: string;
    samplerPhoto: string | null;
    sourcePhoto: string | null;
    activityId: string | null;
  }>({
    isOpen: false,
    title: '',
    date: '',
    samplerPhoto: null,
    sourcePhoto: null,
    activityId: null
  });

  // Sync Form Fields when active source shifts
  useEffect(() => {
    if (activeSource) {
      setEditBrgy(activeSource.barangay);
      setEditName(activeSource.name_of_source);
      setEditZone(activeSource.zone || '');
      setEditType(activeSource.source_type as any);
      setEditHh(activeSource.households_served);
      setEditBuilt(activeSource.date_built);
      setEditStatus(activeSource.status);
      setEditLat(activeSource.gps_lat.toString());
      setEditLng(activeSource.gps_lng.toString());
      setEditLandmark(activeSource.landmark_description);
      setEditNotes(activeSource.notes || '');
      setEditProfilePic(activeSource.profile_image_url || '');
    }
  }, [activeSource]);

  // Unique list of barangays
  const barangays = ['AMOROS', 'BOLISONG', 'HIMAYA', 'HINIGDAAN', 'KALABAYLABAY', 'MOLUGAN', 'BOLOBOLO', 'POBLACION', 'KIBONBON', 'SAMBULAWAN', 'CALONGONAN', 'SINALOC', 'TAYTAY', 'ULALIMAN', 'COGON'].sort();

  // Compute test metrics dynamically for the selected source with safe checks
  const activeSourceMetrics = useMemo(() => {
    if (!activeSource) return { totalTests: 0, passed: 0, rate: 0, history: [] };
    const history = records.filter(r =>
      safeUpper(r.brgy) === safeUpper(activeSource.barangay) &&
      safeUpper(r.res) === safeUpper(activeSource.name_of_source) &&
      (!activeSource.zone || !r.zone || safeTrim(r.zone) === safeTrim(activeSource.zone))
    ).sort((a, b) => b.date.localeCompare(a.date));

    const totalTests = history.length;
    const passed = history.filter(r => r.micro === 'PASSED' && (r.phychem === 'PASSED' || r.phychem === 'N/A')).length;
    const rate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;

    return { totalTests, passed, rate, history };
  }, [activeSource, records]);

  // Get log activities for active source
  const activeSourceActivities = useMemo(() => {
    if (!activeSource) return [];
    return activities.filter(a => a.source_key === activeSource.source_key)
                     .sort((a, b) => b.date_sampled.localeCompare(a.date_sampled));
  }, [activeSource, activities]);

  // Photo handlers with client compression
  const handleEditProfilePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const compressed = await compressImage(file);
      setEditProfilePic(compressed);
    }
  };

  const handleOpenLightbox = (dateStr: string, customSampler: string | undefined, customSource: string | undefined, activityId?: string) => {
    const fallbackSampler = "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=600&auto=format&fit=crop";
    const fallbackSource = "https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=600&auto=format&fit=crop";

    setLightboxData({
      isOpen: true,
      title: `Sanitation Field Quality Audit`,
      date: dateStr,
      samplerPhoto: customSampler || fallbackSampler,
      sourcePhoto: customSource || fallbackSource,
      activityId: activityId || null
    });
  };

  const handleLightboxPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'sampler' | 'source') => {
    const file = e.target.files?.[0];
    if (!file || !activeSource) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;

      // Update local lightbox UI state immediately
      setLightboxData(prev => ({
        ...prev,
        samplerPhoto: target === 'sampler' ? dataUrl : prev.samplerPhoto,
        sourcePhoto: target === 'source' ? dataUrl : prev.sourcePhoto
      }));

      // Update or create the FieldActivity
      if (lightboxData.activityId) {
        // Find existing activity
        const existing = activities.find(a => a.activity_id === lightboxData.activityId);
        if (existing) {
          const updated: FieldActivity = {
            ...existing,
            sampler_image_url: target === 'sampler' ? dataUrl : existing.sampler_image_url,
            status_image_url: target === 'source' ? dataUrl : existing.status_image_url
          };
          if (onUpdateActivity) {
            onUpdateActivity(updated);
          }
        }
      } else {
        // Create a new activity for this test date
        const newAct: FieldActivity = {
          activity_id: `ACT-${Date.now()}`,
          source_key: activeSource.source_key,
          barangay: activeSource.barangay,
          source_name: activeSource.name_of_source,
          zone: activeSource.zone,
          date_sampled: lightboxData.date,
          remarks: 'Field photo attachment added to historic test log.',
          linked_result_date: lightboxData.date,
          sampler_image_url: target === 'sampler' ? dataUrl : undefined,
          status_image_url: target === 'source' ? dataUrl : undefined,
          created_at: new Date().toISOString(),
          was_chlorinated: 'N/A',
          rained_prior: 'N/A',
          tank_cleaned: 'N/A'
        };
        onAddActivity(newAct);
        // Set the activityId so subsequent changes update the newly created activity
        setLightboxData(prev => ({
          ...prev,
          activityId: newAct.activity_id
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit functions
  const handleEditSourceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSource) return;
    if (!editBrgy || !editName) {
      setStatusToast({ message: 'Kindly fill in Barangay and Source Name.', type: 'error' });
      return;
    }
    const trimmedBrgy = safeTrim(editBrgy);
    const trimmedName = safeUpper(editName);
    const trimmedZone = safeTrim(editZone);
    const newKey = `${trimmedBrgy.toUpperCase()}|||${trimmedName}|||${trimmedZone}`;
    const updatedSource: WaterSource = {
      source_key: newKey,
      barangay: trimmedBrgy,
      name_of_source: trimmedName,
      zone: trimmedZone,
      source_type: editType,
      households_served: Number(editHh) || 0,
      date_built: editBuilt || new Date().toISOString().split('T')[0],
      status: editStatus,
      landmark_description: editLandmark || 'No landmarks added.',
      gps_lat: Number(editLat) || 8.5630,
      gps_lng: Number(editLng) || 124.5030,
      notes: editNotes || 'No notes added.',
      profile_image_url: editProfilePic || undefined
    };

    onUpdateSource(updatedSource, activeSource.source_key);
    if (onSelectSource) {
      onSelectSource(newKey);
    }
    setShowEditModal(false);
    setStatusToast({ message: 'Water Source successfully updated in the CHO Registry!', type: 'success' });
  };

  const handleDeleteSourceClick = () => {
    if (!activeSource) return;
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDeleteSource = () => {
    if (!activeSource) return;
    onDeleteSource(activeSource.source_key);
    if (onSelectSource) {
      onSelectSource('');
    }
    setShowDeleteConfirmModal(false);
    setStatusToast({ message: 'Water Source successfully deleted from the CHO Registry.', type: 'warning' });
  };

  const handleLogActivitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSource || !actRemarks) return;

    const newActivity: FieldActivity = {
      activity_id: `ACT-${Date.now()}`,
      source_key: activeSource.source_key,
      barangay: activeSource.barangay,
      source_name: activeSource.name_of_source,
      zone: activeSource.zone,
      date_sampled: actDate,
      remarks: actRemarks,
      linked_result_date: undefined,
      sampler_image_url: actSamplerPic || undefined,
      status_image_url: actSourcePic || undefined,
      created_at: new Date().toISOString(),
      was_chlorinated: actChlorinated,
      rained_prior: actRain,
      tank_cleaned: actCleaned
    };

    onAddActivity(newActivity);
    setShowLogModal(false);

    // Reset fields
    setActRemarks(''); setActChlorinated('N/A'); setActRain('N/A'); setActCleaned('N/A');
    setActSamplerPic(''); setActSourcePic('');
    setStatusToast({ message: 'CHO Field Activity successfully logged onto timeline.', type: 'success' });
  };

  if (!activeSource) {
    return (
      <div className="glass-panel rounded-2xl border border-brand-slate/20 p-12 text-center text-brand-autumn italic flex flex-col items-center justify-center h-full">
        <span>Select a water source point to inspect active testing safety logs.</span>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-brand-slate/20 h-full overflow-hidden flex flex-col shadow-2xl relative">
      {/* Toast Notification */}
      {statusToast && (
        <div
          className={`absolute top-3 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold shadow-2xl animate-fade-in ${
            statusToast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : statusToast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/50 text-rose-200'
              : 'bg-amber-950/90 border-amber-500/50 text-amber-200'
          }`}
        >
          {statusToast.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          ) : statusToast.type === 'error' ? (
            <AlertCircle size={16} className="text-rose-400 shrink-0" />
          ) : (
            <TriangleAlert size={16} className="text-amber-400 shrink-0" />
          )}
          <span>{statusToast.message}</span>
        </div>
      )}

      {/* In-app safe confirmation modal for deleting facility (no iframe alert blockage) */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#001D39] border border-brand-slate/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <TriangleAlert size={20} />
              </div>
              <h3 className="text-base font-bold text-white font-display">Delete Water Facility</h3>
            </div>
            <p className="text-xs sm:text-sm text-brand-soft leading-relaxed">
              Are you sure you want to permanently delete the facility <strong className="text-white">"{activeSource.name_of_source}"</strong> from the CHO Registry? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-brand-soft hover:text-white bg-brand-slate/20 hover:bg-brand-slate/30 transition cursor-pointer border border-brand-slate/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSource}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-rose-600 hover:bg-rose-500 transition cursor-pointer shadow-lg shadow-rose-600/30"
              >
                Delete Facility
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header & Meta Section: Left (Large Image) and Right (Info Details) */}
      <div className="border-b border-brand-slate/10 bg-brand-ocean/10 shrink-0 flex flex-col md:flex-row">
        {/* Left Column: Big Facility Image */}
        <div className="w-full h-36 md:h-auto md:w-44 lg:w-48 border-b md:border-b-0 md:border-r border-brand-slate/15 relative group bg-brand-deep/60 flex-shrink-0 overflow-hidden">
          <div 
            onClick={() => document.getElementById('profile-view-photo-upload')?.click()}
            className="absolute inset-0 cursor-pointer overflow-hidden flex flex-col items-center justify-center text-brand-light"
            title="Click to upload or update the physical facility profile picture"
          >
            {activeSource.profile_image_url ? (
              <img 
                src={activeSource.profile_image_url} 
                alt={activeSource.name_of_source} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
            ) : (
              <div className="text-center flex flex-col items-center justify-center p-4">
                <Camera size={22} className="text-[#7BBDE8] mb-1 opacity-80" />
                <span className="text-[8px] font-black uppercase text-brand-autumn tracking-wider">Upload Profile Photo</span>
              </div>
            )}
            {/* Hovering Change Photo Overlay Layer */}
            <div className="absolute inset-0 bg-brand-deep/85 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-[8px] font-black text-[#7BBDE8] tracking-widest uppercase gap-1">
              <Camera size={14} />
              <span>Change Photo</span>
            </div>
          </div>

          {/* Hidden photo input for header update with compression */}
          <input
            id="profile-view-photo-upload"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const compressed = await compressImage(file);
                onUpdateSource({
                  ...activeSource,
                  profile_image_url: compressed
                }, activeSource.source_key);
                setStatusToast({ message: 'Facility profile photo updated.', type: 'success' });
              }
            }}
            className="sr-only"
          />
        </div>

        {/* Right Column: Key Details & Quick Actions */}
        <div className="flex-1 p-4 lg:p-4.5 flex flex-col justify-between min-w-0">
          {/* Row 1: Title block, Safety Rate Badge, and Close Button for Presentation Mode */}
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black uppercase text-white font-display leading-tight tracking-tight truncate" title={activeSource.name_of_source}>
                  {activeSource.name_of_source}
                </h2>
                {isPresentationMode && onClose && (
                  <button
                    onClick={onClose}
                    className="sm:hidden text-brand-autumn hover:text-white transition p-1 bg-brand-deep/50 hover:bg-rose-500/15 rounded-md border border-brand-slate/20 hover:border-rose-500/30"
                    title="Close Presentation Mode"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                <p className="text-[11px] text-[#7BBDE8] font-bold flex items-center gap-1 uppercase tracking-wide">
                  <MapPin size={11} className="text-[#7BBDE8]" /> Zone {activeSource.zone || '?'} — {activeSource.barangay}
                </p>
                <span className="text-[8px] text-brand-autumn font-extrabold uppercase tracking-widest bg-brand-deep/40 px-1.5 py-0.5 rounded border border-brand-slate/10 inline-block">
                  {activeSource.source_type}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {/* Calculated safety Rate badge */}
              <div className="flex items-center gap-2 bg-brand-deep/30 p-1 px-2 rounded-lg border border-brand-slate/10">
                <div className="text-right">
                  <span className="text-[7.5px] uppercase font-bold text-brand-autumn tracking-wider block">Safety Rate</span>
                  <strong className={`scale-95 origin-right font-black font-mono leading-none block text-sm ${
                    activeSourceMetrics.rate >= 90 ? 'text-emerald-400' : (activeSourceMetrics.rate >= 50 ? 'text-amber-400' : 'text-rose-400')
                  }`}>
                    {activeSourceMetrics.rate}%
                  </strong>
                </div>
                <span className="text-[8px] text-brand-soft font-mono font-bold block bg-brand-deep/50 px-1 rounded">
                  ({activeSourceMetrics.totalTests - activeSourceMetrics.history.filter(r => r.micro === 'FAILED' || r.phychem === 'FAILED').length}/{activeSourceMetrics.totalTests})
                </span>
              </div>

              {/* Close Button at top right of details panel for desktop presentation mode */}
              {isPresentationMode && onClose && (
                <button
                  onClick={onClose}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 hover:border-rose-500/40 text-rose-300 transition cursor-pointer shadow uppercase tracking-wider"
                  title="Close Presentation Mode"
                >
                  <X size={12} strokeWidth={2.5} /> Close Presentation
                </button>
              )}
            </div>
          </div>

          {/* Action Row for Administration controls */}
          <div className="flex flex-wrap gap-2 items-center mt-3 border-t border-brand-slate/10 pt-2.5">
            <button
              onClick={() => setShowEditModal(true)}
              className="p-1.5 px-2.5 rounded-lg text-[10px] font-black bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition flex items-center gap-1 shadow cursor-pointer uppercase tracking-wider font-display shrink-0"
              title="Edit facility details (location parameters, name, capacity...)"
            >
              <Edit size={11} /> Edit Info
            </button>

            <button
              onClick={handleDeleteSourceClick}
              className="p-1.5 px-2.5 rounded-lg text-[10px] font-black bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition flex items-center gap-1 shadow cursor-pointer uppercase tracking-wider font-display shrink-0"
              title="Permanently remove facility from CHO Registry"
            >
              <Trash2 size={11} /> Delete
            </button>

            <button
              onClick={() => setShowLogModal(true)}
              className="p-1.5 px-2.5 rounded-lg text-[10px] font-black bg-[#7BBDE8] hover:bg-brand-steel text-brand-deep transition flex items-center gap-1 shadow cursor-pointer uppercase tracking-wider font-display shrink-0 ml-auto"
            >
              <PlusCircle size={11} /> Log Action
            </button>
          </div>

          {/* Row 2: Highly structured quick details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-3">
            <div className="p-2 bg-brand-deep/30 rounded-xl border border-brand-slate/10">
              <span className="text-[8px] uppercase font-bold text-brand-autumn block mb-0.5 flex items-center gap-0.5"><Users size={9} /> HH Served</span>
              <strong className="text-white font-mono text-[11px]">{activeSource.households_served || '—'} families</strong>
            </div>
            <div className="p-2 bg-brand-deep/30 rounded-xl border border-brand-slate/10">
              <span className="text-[8px] uppercase font-bold text-brand-autumn block mb-0.5 flex items-center gap-0.5"><Calendar size={9} /> Date Built</span>
              <strong className="text-white font-mono text-[11px]">{activeSource.date_built || '—'}</strong>
            </div>
            <div className="p-2 bg-brand-deep/30 rounded-xl border border-brand-slate/10">
              <span className="text-[8px] uppercase font-bold text-brand-autumn block mb-0.5">GPS Coordinates</span>
              <a
                href={`https://www.google.com/maps?q=${activeSource.gps_lat},${activeSource.gps_lng}`}
                target="_blank"
                rel="noreferrer"
                className="text-brand-light hover:text-white font-bold transition flex items-center gap-0.5 font-mono text-[10.5px]"
              >
                {activeSource.gps_lat.toFixed(4)}, {activeSource.gps_lng.toFixed(4)}
              </a>
            </div>
            <div className="p-2 bg-brand-deep/30 rounded-xl border border-brand-slate/10 flex flex-col justify-between">
              <span className="text-[8px] uppercase font-bold text-brand-autumn block mb-0.5">Status Control</span>
              <select
                value={activeSource.status}
                onChange={(e) => {
                  const nextStatus = e.target.value as any;
                  onUpdateSource({
                    ...activeSource,
                    status: nextStatus
                  }, activeSource.source_key);
                }}
                className="bg-brand-deep/95 text-white border border-brand-slate/30 rounded-md text-[9.5px] font-bold py-0.5 px-1 focus:outline-none focus:border-brand-light cursor-pointer"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Under Repair">Under Repair</option>
                <option value="Decommissioned">Decommissioned</option>
              </select>
            </div>
          </div>

          {/* Row 3: Landmark reference */}
          <div className="border-t border-brand-slate/15 pt-2 mt-2.5 text-xs text-brand-soft leading-tight flex-1 flex flex-col justify-center">
            <span className="text-[8px] font-black uppercase text-brand-autumn block mb-0.5">Landmark Description:</span>
            <p className="font-semibold text-white/95 truncate text-[11px]" title={activeSource.landmark_description}>
              {activeSource.landmark_description || 'No specific reference landmark registered.'}
            </p>
          </div>
        </div>
      </div>

      {/* Content Body: Specs & Histories */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-6">
        
        {/* Facility Notes block */}
        {activeSource.notes && (
          <div className="text-xs p-3.5 bg-brand-deep/40 rounded-xl border border-brand-slate/10 leading-relaxed text-brand-soft">
            <span className="text-[9px] font-black uppercase text-brand-autumn block mb-1.5">CHO Administration Notes:</span>
            {activeSource.notes}
          </div>
        )}

        {/* Past Reports List */}
        <div className="space-y-3">
          <h3 className="text-xs uppercase font-extrabold text-[#7BBDE8] tracking-widest border-b border-brand-slate/10 pb-1.5 flex items-center gap-1.5 font-display">
            <Clock size={12} /> Test Sampling History ({activeSourceMetrics.totalTests} logs)
          </h3>

          {activeSourceMetrics.history.length > 0 ? (
            <div className="space-y-1.5">
              {activeSourceMetrics.history.map((row, idx) => {
                const isFail = row.micro === 'FAILED' || row.phychem === 'FAILED';
                const matchedAct = activities.find(a => a.source_key === activeSource.source_key && (a.linked_result_date === row.date || a.date_sampled === row.date));
                const remarksText = [row.micro_rem, row.phychem_rem].filter(Boolean).join(' // ');

                return (
                  <div key={idx} className="p-2 rounded-xl border border-brand-slate/10 bg-brand-deep/20 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs hover:bg-brand-ocean/5 transition duration-155">
                    {/* Left: Date & Status */}
                    <div className="flex items-center gap-2 shrink-0 min-w-[130px]">
                      <span className="text-xs font-extrabold text-white font-mono">{row.date}</span>
                      <span className={`text-[8.5px] uppercase font-bold px-2 py-0.5 rounded-full ${isFail ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                        {isFail ? 'UNSAFE' : 'SAFE'}
                      </span>
                    </div>

                    {/* Middle: Remarks / Metadata toggle badges */}
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      {remarksText ? (
                        <span className="text-[10px] text-brand-autumn italic truncate font-medium max-w-[150px] sm:max-w-[280px]" title={remarksText}>
                          {remarksText}
                        </span>
                      ) : matchedAct ? (
                        <div className="hidden md:flex gap-1.5">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${matchedAct.was_chlorinated === 'YES' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-brand-deep text-brand-autumn'}`} title="Chlorinated">
                            Cl: {matchedAct.was_chlorinated}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${matchedAct.rained_prior === 'YES' ? 'bg-rose-500/15 text-rose-400' : 'bg-brand-deep text-brand-autumn'}`} title="Rain (72h)">
                            Rain: {matchedAct.rained_prior}
                          </span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${matchedAct.tank_cleaned === 'YES' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-brand-deep text-brand-autumn'}`} title="Deep Cleaned">
                            Clean: {matchedAct.tank_cleaned}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[9px] text-brand-autumn/40 italic hidden md:inline">Sampling meta-data logged</span>
                      )}
                    </div>

                    {/* Right: Parameter Indicators & Action Button */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto w-full sm:w-auto justify-between sm:justify-end">
                      <div className="flex gap-1">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${row.micro === 'PASSED' ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10' : 'text-rose-400 bg-rose-500/5 border border-rose-500/10'}`} title={`Microbiological: ${row.micro}`}>
                          M: {row.micro === 'PASSED' ? 'PASS' : 'FAIL'}
                        </span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${row.phychem === 'PASSED' ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10' : 'text-rose-500/10 text-rose-400 border border-rose-500/10'}`} title={`Physical/Chemical: ${row.phychem}`}>
                          P: {row.phychem === 'PASSED' ? 'PASS' : 'FAIL'}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          handleOpenLightbox(
                            row.date,
                            matchedAct?.sampler_image_url,
                            matchedAct?.status_image_url,
                            matchedAct?.activity_id
                          );
                        }}
                        className="text-[9px] font-extrabold flex items-center gap-1 bg-[#7BBDE8]/10 hover:bg-[#7BBDE8]/20 border border-[#7BBDE8]/20 hover:border-[#7BBDE8]/40 text-[#7BBDE8] hover:text-white px-2 py-1 rounded transition shrink-0 cursor-pointer"
                        title="View Field Photos"
                      >
                        <Camera size={10} className="text-[#7BBDE8]" /> <span className="hidden sm:inline">Photos</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs p-6 border border-dashed border-brand-slate/25 text-center text-brand-autumn rounded-xl italic">
              No laboratory sampling analyses run for this resident source point.
            </div>
          )}
        </div>

        {/* Timeline of custom field activity log comments */}
        <div className="space-y-4 pt-4 border-t border-brand-slate/15">
          <h3 className="text-xs uppercase font-extrabold text-brand-teal tracking-widest border-b border-brand-slate/10 pb-1.5 flex items-center gap-1.5 font-display">
            <PlusCircle size={12} className="text-brand-teal" /> Field Inspections &amp; Operations Timeline
          </h3>

          {activeSourceActivities.length > 0 ? (
            <div className="relative pl-6 border-l-2 border-brand-slate/20 space-y-5">
              {activeSourceActivities.map((act, i) => (
                <div key={i} className="relative">
                  {/* Dot */}
                  <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-brand-deep bg-brand-teal"></div>
                  
                  <div className="p-3.5 rounded-xl border border-brand-slate/10 bg-brand-deep/30 space-y-2">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-extrabold text-brand-teal font-mono">{act.date_sampled}</span>
                      {act.created_at && <span className="text-brand-autumn font-medium">Logged on agent terminal</span>}
                    </div>
                    <p className="text-xs text-brand-soft leading-relaxed">{act.remarks}</p>

                    {/* Render thumbnails if bases exist */}
                    {(act.sampler_image_url || act.status_image_url) && (
                      <div className="flex gap-2.5 pt-1.5">
                        {act.sampler_image_url && (
                          <div className="w-12 h-12 rounded border border-brand-slate/30 overflow-hidden bg-brand-deep">
                            <img src={act.sampler_image_url} alt="Sampler" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {act.status_image_url && (
                          <div className="w-12 h-12 rounded border border-brand-slate/30 overflow-hidden bg-brand-deep">
                            <img src={act.status_image_url} alt="Source Status" className="w-full h-full object-cover" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-brand-autumn italic p-4 text-center">
              No custom field activities logged. Click &ldquo;Log Action&rdquo; to add inspections.
            </div>
          )}
        </div>

      </div>

      {/* MODAL: EDIT WATER SOURCE */}
      {showEditModal && activeSource && (
        <div className="fixed inset-0 bg-brand-deep/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-panel p-6 border border-brand-light/30 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative select-none">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 text-brand-autumn hover:text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="border-b border-brand-slate/20 pb-3">
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">
                Edit Water Facility Details
              </h2>
              <p className="text-[10px] text-brand-autumn mt-0.5">Modify parameters of the active Water Source facility entry.</p>
            </div>

            <form onSubmit={handleEditSourceSubmit} className="space-y-4 text-xs font-semibold text-brand-soft">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 uppercase text-brand-soft">Barangay Zone *</label>
                  <select
                    required
                    value={editBrgy}
                    onChange={(e) => setEditBrgy(e.target.value)}
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
                    value={editZone}
                    onChange={(e) => setEditZone(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 uppercase">Facility / Resident Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BARANGAY COMMUNITY RESERVOIR"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 uppercase font-bold"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">Facility classification</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
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
                    value={editHh}
                    onChange={(e) => setEditHh(Number(e.target.value))}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 inline-block"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">Date constructed</label>
                  <input
                    type="date"
                    value={editBuilt}
                    onChange={(e) => setEditBuilt(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1 text-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">Operational status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
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
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div>
                  <label className="block mb-1.5 uppercase">GPS Longitude (Centroid)</label>
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="e.g. 124.5176"
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 uppercase">Benchmark Landmarks</label>
                  <input
                    type="text"
                    placeholder="e.g. 50 meters north of Barangay chapel"
                    value={editLandmark}
                    onChange={(e) => setEditLandmark(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 uppercase">Technical notes</label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="glass-input w-full rounded-lg px-2.5 py-1.5 resize-none custom-scrollbar"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block mb-1.5 uppercase">Facility photo upload</label>
                  <label className="relative flex flex-col items-center justify-center h-24 border-2 border-dashed border-brand-slate/40 rounded-xl cursor-pointer hover:border-brand-teal transition overflow-hidden">
                    <input type="file" accept="image/*" onChange={handleEditProfilePicUpload} className="sr-only" />
                    {editProfilePic ? (
                      <img src={editProfilePic} alt="Profile" className="w-full h-full object-cover" />
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
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 font-bold text-brand-soft bg-brand-slate/10 hover:bg-brand-slate/20 rounded-lg cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 font-bold text-brand-deep bg-[#7BBDE8] hover:bg-brand-steel rounded-lg transition shadow-lg flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Check size={14} /> Update Source Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG FIELD INSPECTION ACTION ACTIVITY */}
      {showLogModal && activeSource && (
        <div className="fixed inset-0 bg-brand-deep/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="glass-panel p-6 border border-brand-teal/30 rounded-2xl w-full max-w-lg shadow-2xl relative select-none">
            <button
              onClick={() => setShowLogModal(false)}
              className="absolute top-4 right-4 text-brand-autumn hover:text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="border-b border-brand-slate/20 pb-3">
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-display">
                Log Field Activity Note
              </h2>
              <p className="text-[10px] text-brand-autumn mt-0.5 uppercase">Facility: {activeSource.name_of_source} • {activeSource.barangay}</p>
            </div>

            <form onSubmit={handleLogActivitySubmit} className="space-y-4 text-xs font-semibold text-brand-soft">
              <div>
                <label className="block mb-1.5 uppercase">Inspection visit date</label>
                <input
                  type="date"
                  required
                  value={actDate}
                  onChange={(e) => setActDate(e.target.value)}
                  className="glass-input w-full rounded-lg px-2.5 py-1.5 font-mono"
                />
              </div>

              <div>
                <label className="block mb-1.5 uppercase">Technical Inspection Observations / Action Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe maintenance conducted, chemical treatment dosage, physical pipe repairs, chlorine tablets dropped, or raw structural inspection notes..."
                  value={actRemarks}
                  onChange={(e) => setActRemarks(e.target.value)}
                  className="glass-input w-full rounded-lg px-2.5 py-1.5 resize-none custom-scrollbar text-white font-semibold"
                />
              </div>

              {/* Toggles inside log action modal */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block mb-1 text-brand-autumn uppercase text-[10px] font-bold">Was Chlorinated?</label>
                  <select
                    value={actChlorinated}
                    onChange={(e) => setActChlorinated(e.target.value as any)}
                    className="glass-input w-full rounded-lg px-2 py-1 text-[11px]"
                  >
                    <option value="N/A">N/A</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-brand-autumn uppercase text-[10px] font-bold">Rain in last 72h?</label>
                  <select
                    value={actRain}
                    onChange={(e) => setActRain(e.target.value as any)}
                    className="glass-input w-full rounded-lg px-2 py-1 text-[11px]"
                  >
                    <option value="N/A">N/A</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-brand-autumn uppercase text-[10px] font-bold">Tank/Well Cleaned?</label>
                  <select
                    value={actCleaned}
                    onChange={(e) => setActCleaned(e.target.value as any)}
                    className="glass-input w-full rounded-lg px-2 py-1 text-[11px]"
                  >
                    <option value="N/A">N/A</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
              </div>

              {/* Photo Upload attachments inside log form */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block mb-1 text-brand-autumn uppercase text-[10.5px] font-sans antialiased tracking-tight">1. Inspector Sampler Photo</label>
                  <label className="relative flex flex-col items-center justify-center h-16 border border-dashed border-brand-slate/30 rounded-lg cursor-pointer hover:border-[#7BBDE8] transition overflow-hidden bg-brand-deep/20">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const compressed = await compressImage(file);
                          setActSamplerPic(compressed);
                        }
                      }}
                      className="sr-only"
                    />
                    {actSamplerPic ? (
                      <img src={actSamplerPic} alt="Sampler" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 text-brand-autumn">
                        <Camera size={13} />
                        <span className="text-[7.5px] uppercase font-bold text-center">Add Photo</span>
                      </div>
                    )}
                  </label>
                </div>

                <div>
                  <label className="block mb-1 text-brand-autumn uppercase text-[10.5px] font-sans antialiased tracking-tight">2. Tap/Wellhead State Photo</label>
                  <label className="relative flex flex-col items-center justify-center h-16 border border-dashed border-brand-slate/30 rounded-lg cursor-pointer hover:border-[#7BBDE8] transition overflow-hidden bg-brand-deep/20">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const compressed = await compressImage(file);
                          setActSourcePic(compressed);
                        }
                      }}
                      className="sr-only"
                    />
                    {actSourcePic ? (
                      <img src={actSourcePic} alt="Source" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 text-brand-autumn">
                        <Camera size={13} />
                        <span className="text-[7.5px] uppercase font-bold text-center">Add Photo</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-brand-slate/20">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 font-bold text-brand-soft bg-brand-slate/10 hover:bg-brand-slate/20 rounded-lg cursor-pointer transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 font-bold text-brand-deep bg-brand-teal hover:bg-cyan-700 hover:text-white rounded-lg transition shadow-lg flex items-center gap-1.5 text-xs cursor-pointer"
                >
                  <Check size={14} /> Log activity Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        {/* PHOTO LIGHTBOX MODAL */}
      {lightboxData.isOpen && (
        <div className="fixed inset-0 bg-brand-deep/90 backdrop-blur-sm z-[210] flex items-center justify-center p-4 animate-fade-in animate-duration-200">
          <div className="glass-panel p-6 border border-brand-teal/30 rounded-2xl w-full max-w-2xl shadow-2xl relative">
            <button
              onClick={() => setLightboxData(prev => ({ ...prev, isOpen: false }))}
              className="absolute top-4 right-4 text-brand-autumn hover:text-white transition cursor-pointer"
            >
              <X size={20} />
            </button>

            <div className="border-b border-brand-slate/20 pb-3 mb-5">
              <h2 className="text-base font-bold text-white uppercase tracking-wider font-display flex items-center gap-2">
                <Camera size={16} className="text-[#7BBDE8]" />
                {lightboxData.title}
              </h2>
              <p className="text-[10px] text-brand-autumn mt-0.5 uppercase font-mono">
                Sampling Event Date: {lightboxData.date}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo 1: Sampler Photo */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-semibold text-[#7BBDE8] uppercase tracking-wider block">
                  1. Inspector Sampler Photo / Field ID Verification
                </span>
                <div className="h-64 rounded-xl border border-brand-slate/15 overflow-hidden bg-brand-deep relative flex items-center justify-center shadow-inner group">
                  <div 
                    onClick={() => document.getElementById('lightbox-sampler-upload')?.click()}
                    className="absolute inset-0 cursor-pointer overflow-hidden flex flex-col items-center justify-center text-brand-light"
                    title="Click to upload or update the Inspector Sampler Photo"
                  >
                    {lightboxData.samplerPhoto ? (
                      <img
                        src={lightboxData.samplerPhoto}
                        alt="Field Sampler Profile"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-4 text-brand-autumn flex flex-col items-center gap-1">
                        <Camera size={32} className="opacity-40 mb-1" />
                        <span className="text-[10px] uppercase font-bold italic">No Sampler Photo Submitted</span>
                        <span className="text-[9px] block text-brand-autumn/60">Click to upload photo.</span>
                      </div>
                    )}
                    {/* Hovering Change Photo Overlay Layer */}
                    <div className="absolute inset-0 bg-brand-deep/85 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-[10px] font-black text-[#7BBDE8] tracking-widest uppercase gap-1">
                      <Camera size={18} />
                      <span>Change Photo</span>
                    </div>
                  </div>
                </div>
                <input
                  id="lightbox-sampler-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLightboxPhotoUpload(e, 'sampler')}
                  className="sr-only"
                />
              </div>

              {/* Photo 2: Well / Tap Structural state */}
              <div className="space-y-2">
                <span className="text-[10.5px] font-semibold text-brand-autumn uppercase tracking-wider block">
                  2. Water Facility / Faucet Structural State
                </span>
                <div className="h-64 rounded-xl border border-brand-slate/15 overflow-hidden bg-brand-deep relative flex items-center justify-center shadow-inner group">
                  <div 
                    onClick={() => document.getElementById('lightbox-source-upload')?.click()}
                    className="absolute inset-0 cursor-pointer overflow-hidden flex flex-col items-center justify-center text-brand-light"
                    title="Click to upload or update the Water Facility Photo"
                  >
                    {lightboxData.sourcePhoto ? (
                      <img
                        src={lightboxData.sourcePhoto}
                        alt="Facility Structural State"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-center p-4 text-brand-autumn flex flex-col items-center gap-1">
                        <Camera size={32} className="opacity-40 mb-1" />
                        <span className="text-[10px] uppercase font-bold italic">No Facility State Photo Submitted</span>
                        <span className="text-[9px] block text-brand-autumn/60">Click to upload photo.</span>
                      </div>
                    )}
                    {/* Hovering Change Photo Overlay Layer */}
                    <div className="absolute inset-0 bg-brand-deep/85 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-[10px] font-black text-brand-autumn tracking-widest uppercase gap-1">
                      <Camera size={18} />
                      <span>Change Photo</span>
                    </div>
                  </div>
                </div>
                <input
                  id="lightbox-source-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLightboxPhotoUpload(e, 'source')}
                  className="sr-only"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-brand-slate/20 text-center text-[10px] text-brand-autumn">
              <span>Sanitation inspection photos captured securely via the CHO Inspector Mobile terminal.</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
