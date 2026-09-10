import { useState, useEffect } from 'react';
import { INITIAL_RECORDS, INITIAL_SOURCES, INITIAL_ACTIVITIES, MEDIA_ASSETS } from './data';
import { WaterRecord, WaterSource, FieldActivity } from './types';
import { supabase } from './supabaseClient';
import { useFilters } from './context/FilterContext';
import { safeTrim, safeUpper } from './utils';

// Importing Custom Subcomponents
// Importing Custom Subcomponents
import { HeroSection } from './components/HeroSection';
import { ExecutiveDashboard } from './components/ExecutiveDashboard';
import { DataEntry } from './components/DataEntry';
import { DataViewTable } from './components/DataViewTable';
import { WaterSourcesRegistry } from './components/WaterSourcesRegistry';
import { MapVisualizer } from './components/MapVisualizer';
import { GlowClock } from './components/GlowClock';

// Importing Visual Icons
import { Droplet, Home, BarChart3, Map, Database, ClipboardEdit, FileSpreadsheet, Sparkles, Clock, ArrowLeft, DatabaseZap, CheckCircle2, RotateCcw } from 'lucide-react';


export default function App() {
  const { filters, resetFilters } = useFilters();
  const hasActiveFilters = Object.values(filters).some(val => val !== 'ALL');

  const [activeTab, setActiveTab] = useState<string>('home');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [scrollY, setScrollY] = useState<number>(0);
  const [loadingDb, setLoadingDb] = useState<boolean>(false);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);

  // Loaded Datasets with LocalStorage Persistence Fallback
  const [records, setRecords] = useState<WaterRecord[]>(() => {
    // One-time automatic data sanitization and environment reset to production state
    try {
      if (localStorage.getItem('cho_sanitized') !== 'true') {
        localStorage.removeItem('cho_water_records');
        localStorage.removeItem('cho_water_sources');
        localStorage.removeItem('cho_water_activities');
        localStorage.setItem('cho_sanitized', 'true');
      }
    } catch (e) {
      console.warn('Unable to access/sanitize local storage on init:', e);
    }
    try {
      const cached = localStorage.getItem('cho_water_records');
      return cached ? JSON.parse(cached) : INITIAL_RECORDS;
    } catch (e) {
      console.warn('Unable to parse cached records:', e);
      return INITIAL_RECORDS;
    }
  });

  const [sources, setSources] = useState<WaterSource[]>(() => {
    try {
      const cached = localStorage.getItem('cho_water_sources');
      return cached ? JSON.parse(cached) : INITIAL_SOURCES;
    } catch (e) {
      console.warn('Unable to parse cached sources:', e);
      return INITIAL_SOURCES;
    }
  });

  const [activities, setActivities] = useState<FieldActivity[]>(() => {
    try {
      const cached = localStorage.getItem('cho_water_activities');
      return cached ? JSON.parse(cached) : INITIAL_ACTIVITIES;
    } catch (e) {
      console.warn('Unable to parse cached activities:', e);
      return INITIAL_ACTIVITIES;
    }
  });

  // Cross-Tab focused item states
  const [selectedRecord, setSelectedRecord] = useState<WaterRecord | null>(null);
  const [focusedSourceKey, setFocusedSourceKey] = useState<string | null>(null);

  // Sync state changes with localStorage (fallback)
  useEffect(() => {
    try {
      localStorage.setItem('cho_water_records', JSON.stringify(records));
    } catch (e) {
      console.warn('Unable to persist water records in local storage:', e);
    }
  }, [records]);

  useEffect(() => {
    try {
      localStorage.setItem('cho_water_sources', JSON.stringify(sources));
    } catch (e) {
      console.warn('Unable to persist water sources in local storage:', e);
    }
  }, [sources]);

  useEffect(() => {
    try {
      localStorage.setItem('cho_water_activities', JSON.stringify(activities));
    } catch (e) {
      console.warn('Unable to persist water activities in local storage:', e);
    }
  }, [activities]);

  // Synchronize initially with Supabase
  useEffect(() => {
    async function initSupabaseData() {
      const hasUrl = (import.meta as any).env.VITE_SUPABASE_URL;
      const hasKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
      if (!hasUrl || !hasKey) {
        setSupabaseConnected(false);
        return;
      }

      setLoadingDb(true);
      try {
        // Fetch water_sources
        const { data: sourcesData, error: sourcesError } = await supabase
          .from('water_sources')
          .select('*')
          .order('name_of_source', { ascending: true });
        if (sourcesError) throw sourcesError;

        // Fetch water_records
        const { data: recordsData, error: recordsError } = await supabase
          .from('water_records')
          .select('*')
          .order('date', { ascending: false });
        if (recordsError) throw recordsError;

        // Fetch field_activities
        const { data: activitiesData, error: activitiesError } = await supabase
          .from('field_activities')
          .select('*')
          .order('created_at', { ascending: false });
        if (activitiesError) throw activitiesError;

        const rawSources = (sourcesData as any[]) || [];
        const rawRecords = (recordsData as any[]) || [];
        const rawActivities = (activitiesData as any[]) || [];

        const fetchedSources: WaterSource[] = rawSources.map(s => ({
          ...s,
          source_key: s.source_key || `${safeUpper(s.barangay)}|||${safeUpper(s.name_of_source)}|||${safeTrim(s.zone)}`,
          barangay: s.barangay || '',
          name_of_source: s.name_of_source || '',
          zone: s.zone || '',
          source_type: s.source_type || 'Level 1 - Point Source',
          gps_lat: s.gps_lat != null && !isNaN(Number(s.gps_lat)) ? Number(s.gps_lat) : 0,
          gps_lng: s.gps_lng != null && !isNaN(Number(s.gps_lng)) ? Number(s.gps_lng) : 0,
          status: s.status || 'Active',
          households_served: Number(s.households_served) || 0,
          landmark_description: s.landmark_description || '',
          date_built: s.date_built || '',
          profile_image_url: s.profile_image_url || undefined
        }));

        const fetchedRecords: WaterRecord[] = rawRecords.map(r => ({
          ...r,
          id: r.id != null ? String(r.id) : `rec-${Math.random()}`,
          date: r.date || '',
          year: Number(r.year) || (r.date ? parseInt(r.date.substring(0, 4), 10) : new Date().getFullYear()),
          brgy: r.brgy || '',
          res: r.res || '',
          zone: r.zone || '',
          type: r.type || 'Level 1',
          micro: r.micro || (r.thb_rmk === 'FAIL' || r.tc_rmk === 'FAIL' || r.ec_rmk === 'FAIL' ? 'FAILED' : 'PASSED'),
          phychem: r.phychem || 'PASSED',
          remarks: r.remarks || '',
          status: r.status || 'Potable',
          f_residual: r.f_residual || 'N/A',
          thb: r.thb || '0',
          thb_rmk: r.thb_rmk || 'PASS',
          tc: r.tc || '0',
          tc_rmk: r.tc_rmk || 'PASS',
          ec: r.ec || '0',
          ec_rmk: r.ec_rmk || 'PASS',
          micro_rem: r.micro_rem || '',
          phychem_rem: r.phychem_rem || ''
        }));

        const fetchedActivities: FieldActivity[] = rawActivities.map(a => ({
          ...a,
          id: a.id != null ? String(a.id) : `act-${Math.random()}`,
          source_key: a.source_key || '',
          barangay: a.barangay || '',
          source_name: a.source_name || '',
          zone: a.zone || '',
          date_sampled: a.date_sampled || new Date().toISOString().split('T')[0],
          sanitary_inspector: a.sanitary_inspector || 'CHO Staff',
          chlorinated_status: a.chlorinated_status || 'N/A',
          rain_24h_status: a.rain_24h_status || 'N/A',
          cleaned_recently: a.cleaned_recently || 'N/A',
          activity_remarks: a.activity_remarks || ''
        }));

        setSources(fetchedSources);
        setRecords(fetchedRecords);
        setActivities(fetchedActivities);
        
        setSupabaseConnected(true);
      } catch (err) {
        console.error('Error synchronizing with Supabase:', err);
        setSupabaseConnected(false);
      } finally {
        setLoadingDb(false);
      }
    }
    initSupabaseData();
  }, []);

  // Track global scrolling state to drive dynamic glass effects and cinematic backgrounds
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Live Current Clock effect
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setCurrentTime(d.toLocaleString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- ACTIONS STATE CLOSURES ---
  const handleSaveRecord = async (newRec: WaterRecord, act?: FieldActivity) => {
    // 1. Update React Local Memory State
    setRecords(prev => [newRec, ...prev]);
    if (act) {
      setActivities(prev => [act, ...prev]);
    }

    // 2. Insert into Supabase
    if (supabaseConnected) {
      try {
        const { error: recErr } = await supabase
          .from('water_records')
          .insert([newRec]);
        if (recErr) console.error('Supabase save record error:', recErr);

        if (act) {
          const { error: actErr } = await supabase
            .from('field_activities')
            .insert([act]);
          if (actErr) console.error('Supabase save activity error:', actErr);
        }
      } catch (err) {
        console.error('Failed to insert record in Supabase:', err);
      }
    }
  };

  const handleUpdateRecord = async (updatedRec: WaterRecord) => {
    // 1. Update React Local Memory State
    setRecords(prev => prev.map(r => r.id === updatedRec.id ? updatedRec : r));
    setSelectedRecord(null);

    // 2. Update in Supabase
    if (supabaseConnected) {
      try {
        const { error } = await supabase
          .from('water_records')
          .update(updatedRec)
          .eq('id', updatedRec.id);
        if (error) console.error('Supabase update record error:', error);
      } catch (err) {
        console.error('Failed to update record in Supabase:', err);
      }
    }
  };

  const handleDeleteRecord = async (id: string) => {
    // 1. Update React Local Memory State
    setRecords(prev => prev.filter(r => r.id !== id));
    setSelectedRecord(null);

    // 2. Delete from Supabase
    if (supabaseConnected) {
      try {
        const { error } = await supabase
          .from('water_records')
          .delete()
          .eq('id', id);
        if (error) console.error('Supabase delete record error:', error);
      } catch (err) {
        console.error('Failed to delete record from Supabase:', err);
      }
    }
  };

  const handleAddSource = async (newSource: WaterSource) => {
    // 1. Update React Local Memory State
    setSources(prev => [newSource, ...prev]);

    // 2. Insert into Supabase
    if (supabaseConnected) {
      try {
        const { error } = await supabase
          .from('water_sources')
          .insert([newSource]);
        if (error) console.error('Supabase add source error:', error);
      } catch (err) {
        console.error('Failed to insert source into Supabase:', err);
      }
    }
  };

  const handleUpdateSource = async (updatedSource: WaterSource, originalSourceKey?: string) => {
    const keyToMatch = originalSourceKey || updatedSource.source_key;
    // 1. Update React Local Memory State
    setSources(prev => prev.map(s => s.source_key === keyToMatch ? updatedSource : s));

    // 2. Update in Supabase
    if (supabaseConnected) {
      try {
        const { error } = await supabase
          .from('water_sources')
          .update(updatedSource)
          .eq('source_key', keyToMatch);
        if (error) console.error('Supabase update source error:', error);
      } catch (err) {
        console.error('Failed to update source in Supabase:', err);
      }
    }
  };

  const handleDeleteSource = async (source_key: string) => {
    // 1. Update React Local Memory State
    setSources(prev => prev.filter(s => s.source_key !== source_key));

    // 2. Delete from Supabase
    if (supabaseConnected) {
      try {
        const { error } = await supabase
          .from('water_sources')
          .delete()
          .eq('source_key', source_key);
        if (error) console.error('Supabase delete source error:', error);
      } catch (err) {
        console.error('Failed to delete source from Supabase:', err);
      }
    }
  };

  const handleAddActivity = async (newAct: FieldActivity) => {
    // 1. Update React Local Memory State
    setActivities(prev => [newAct, ...prev]);

    // 2. Insert into Supabase
    if (supabaseConnected) {
      try {
        const { error } = await supabase
          .from('field_activities')
          .insert([newAct]);
        if (error) console.error('Supabase add activity error:', error);
      } catch (err) {
        console.error('Failed to insert activity into Supabase:', err);
      }
    }
  };

  const handleUpdateActivity = async (updatedAct: FieldActivity) => {
    // 1. Update React Local Memory State
    setActivities(prev => prev.map(a => a.activity_id === updatedAct.activity_id ? updatedAct : a));

    // 2. Update in Supabase
    if (supabaseConnected) {
      try {
        const { error } = await supabase
          .from('field_activities')
          .update(updatedAct)
          .eq('activity_id', updatedAct.activity_id);
        if (error) console.error('Supabase update activity error:', error);
      } catch (err) {
        console.error('Failed to update activity in Supabase:', err);
      }
    }
  };

  // Row selection handler from DataView Grid
  const handleSelectRecordFromView = (rec: WaterRecord) => {
    setSelectedRecord(rec);
    setActiveTab('entry');
  };

  // Cross-focus link from Repeat Offenders lists or Map Pins to Source Registry Profiles
  const handleFocusSourceRegistry = (brgy: string, name: string) => {
    const match = sources.find(
      s => safeUpper(s.barangay) === safeUpper(brgy) && 
           safeUpper(s.name_of_source) === safeUpper(name)
    );
    if (match) {
      setFocusedSourceKey(match.source_key);
    } else {
      // If not fully matched, we focus first with a general warning
      const fallbackKey = `${safeUpper(brgy)}|||${safeUpper(name)}|||`;
      setFocusedSourceKey(fallbackKey);
    }
    setActiveTab('sources');
  };

  const isHome = activeTab === 'home';
  const progress = isHome ? Math.min(scrollY / 450, 1) : 1;
  const overlayLeft = 0.82 + progress * 0.14;
  const overlayMid = 0.32 + progress * 0.61;
  const overlayRight = 0.08 + progress * 0.87;

  return (
    <div className="min-h-screen text-brand-soft select-none font-sans pb-12 relative overflow-x-hidden">
      {/* Immersive background image bleeding to the whole screen with scroll-interpolated cinema overlay */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none transition-all duration-300"
        style={{ 
          backgroundImage: `linear-gradient(135deg, rgba(5, 31, 32, ${overlayLeft}) 0%, rgba(5, 31, 32, ${overlayMid}) 50%, rgba(5, 31, 32, ${overlayRight}) 100%), url(${MEDIA_ASSETS.heroBg})`
        }}
      />
      
      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Dynamic Floating Global Header Navbar */}
      <header className={`sticky top-0 z-[100] transition-all duration-300 px-4 md:px-6 py-4 ${
        scrollY > 20 
          ? 'bg-brand-deep/85 backdrop-blur-md border-b border-brand-slate/25 shadow-xl' 
          : 'bg-transparent border-b border-transparent shadow-none'
      }`}>
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Agency Title with raw, clean transparent logos - no circle sections, left aligned */}
          <div 
            onClick={() => {
              setActiveTab('home');
              setSelectedRecord(null);
            }}
            className="flex items-center gap-4 text-left cursor-pointer hover:opacity-90 transition duration-150 select-none w-full md:w-auto"
          >
            {/* Direct Logos without circular containers */}
            <div className="flex items-center gap-2.5 shrink-0 select-none">
              <img src={MEDIA_ASSETS.logoCity} alt="El Salvador City Seal" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              <img src={MEDIA_ASSETS.logoCho} alt="City Health Office Seal" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
              <img src={MEDIA_ASSETS.logoRise} alt="Rise El Salvador Seal" className="h-12 w-auto object-contain" referrerPolicy="no-referrer" />
            </div>
            
            <div className="flex flex-col text-left space-y-0.5">
              <h1 className="text-xs sm:text-sm md:text-base font-black text-white tracking-wide uppercase font-display leading-tight">
                WATER QUALITY ASSURANCE &amp; FIELD REGISTRY
              </h1>
              <div className="text-[10px] font-bold tracking-widest text-[#DAF1DE]/90 uppercase">
                LGU - EL SALVADOR
              </div>
              <div className="text-[10px] font-black tracking-widest text-[#8EB69B] uppercase font-mono">
                CITY HEALTH OFFICE - SANITATION DIVISION
              </div>
            </div>
          </div>

          {/* Running Clock, Database Sync Status, and Dynamic Navigation Back Button */}
          <div className="flex flex-wrap items-center gap-4 shrink-0 w-full md:w-auto justify-between md:justify-end border-t border-brand-slate/10 pt-3 md:pt-0 md:border-t-0">
            
            {/* Supabase Status Pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold font-mono tracking-wider border transition-all duration-300 ${
              loadingDb 
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse' 
                : supabaseConnected 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-black' 
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 font-medium'
            }`} title={supabaseConnected ? "Database link active" : "Using local sandbox data fallback"}>
              <DatabaseZap size={11} className={loadingDb ? "animate-spin" : supabaseConnected ? "text-emerald-400" : "text-rose-400"} />
              <span>
                {loadingDb 
                  ? 'SYNCING...' 
                  : supabaseConnected 
                    ? 'SUPABASE CLOUD' 
                    : 'OFFLINE SANDBOX'}
              </span>
            </div>

            {activeTab !== 'home' && (
              <button
                onClick={() => {
                  setActiveTab('home');
                  setSelectedRecord(null);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-[#8EB69B]/10 hover:bg-[#8EB69B] hover:text-brand-deep border border-[#8EB69B]/30 text-[#8EB69B] cursor-pointer transition-all duration-200 shadow-md hover:shadow-emerald-500/20 hover:-translate-y-0.5"
              >
                <ArrowLeft size={13} strokeWidth={3} />
                <span>Back to Portal Home</span>
              </button>
            )}
            <GlowClock />
          </div>

        </div>
      </header>

      {/* Main Structural Tab Controller Switchboard Grid */}
      <main className="w-full px-4 md:px-6 mt-6 space-y-6">

        {activeTab !== 'home' && (
          /* Navigation Selector Buttons Bar */
          <div id="nav-tabs-bar" className="flex flex-wrap items-center gap-2 border-b border-brand-slate/15 pb-4 w-full justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'home', label: 'Home Feed', icon: Home },
                { id: 'dashboard', label: 'Executive Dashboard', icon: BarChart3 },
                { id: 'map', label: 'Barangay Spatial Map', icon: Map },
                { id: 'sources', label: 'Facilities Registry', icon: Database },
                { id: 'entry', label: selectedRecord ? 'Edit Test Report (Active)' : 'Log Test Report', icon: ClipboardEdit },
                { id: 'view', label: 'Historical Database', icon: FileSpreadsheet }
              ].map((tab) => {
                const Active = activeTab === tab.id;
                return (
                  <button
                    id={`nav-tab-${tab.id}`}
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id !== 'entry') setSelectedRecord(null); // Clear editing focus on switch
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer border ${
                      Active
                        ? 'bg-[#8EB69B] text-brand-deep border-[#8EB69B] shadow-lg shadow-[#8EB69B]/10 font-black'
                        : 'bg-transparent text-[#DAF1DE]/80 border-transparent hover:bg-brand-ocean/20 hover:text-white'
                    }`}
                  >
                    <tab.icon size={13.5} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button
                id="reset-global-filters-btn"
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/30 text-rose-400 cursor-pointer transition-all duration-200 shadow-md hover:shadow-rose-500/10 active:scale-95"
                title="Clear all active filters back to municipal defaults"
              >
                <RotateCcw size={13} strokeWidth={2.5} />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        )}

        {/* Unified Tab Panes Rendering Area */}
        <div className="relative">
          
          {activeTab === 'home' && (
            <HeroSection
              onNavigate={(tab) => setActiveTab(tab)}
              records={records}
              sources={sources}
              scrollY={scrollY}
            />
          )}

          {activeTab === 'dashboard' && (
            <ExecutiveDashboard
              records={records}
              sources={sources}
              onFocusSource={handleFocusSourceRegistry}
            />
          )}

          {activeTab === 'map' && (
            <MapVisualizer
              records={records}
              sources={sources}
              activities={activities}
              onSelectSourceFromMap={(key) => setFocusedSourceKey(key)}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onUpdateSource={handleUpdateSource}
              onDeleteSource={handleDeleteSource}
              onAddActivity={handleAddActivity}
              onUpdateActivity={handleUpdateActivity}
            />
          )}

          {activeTab === 'sources' && (
            <WaterSourcesRegistry
              sources={sources}
              records={records}
              activities={activities}
              onAddSource={handleAddSource}
              onUpdateSource={handleUpdateSource}
              onDeleteSource={handleDeleteSource}
              onAddActivity={handleAddActivity}
              onUpdateActivity={handleUpdateActivity}
              focusedSourceKey={focusedSourceKey}
              onSelectSource={(key) => setFocusedSourceKey(key)}
            />
          )}

          {activeTab === 'entry' && (
            <DataEntry
              onSave={handleSaveRecord}
              onUpdate={handleUpdateRecord}
              onDelete={handleDeleteRecord}
              selectedRecord={selectedRecord}
              onClearSelection={() => setSelectedRecord(null)}
              sources={sources}
            />
          )}

          {activeTab === 'view' && (
            <DataViewTable
              records={records}
              onSelectRecord={handleSelectRecordFromView}
            />
          )}

        </div>

      </main>
      
      {/* Tiny Status Credit Line */}
      <footer className="relative z-10 w-full px-4 md:px-6 mt-12 text-center border-t border-brand-slate/10 pt-4 pb-4">
        <span className="text-[10px] text-brand-autumn font-bold uppercase tracking-widest text-center block">
          City Health Office (CHO) • El Salvador Municipal Water System Safety Registry Portal
        </span>
      </footer>
      </div>
    </div>
  );
}
