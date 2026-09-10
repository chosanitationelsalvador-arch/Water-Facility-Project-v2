import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BARANGAY_GEOJSON } from '../geojson';
import { WaterRecord, WaterSource, FieldActivity } from '../types';
import { Map as MapIcon, RefreshCw, Info, Layers, Sun, Moon, Globe, X } from 'lucide-react';
import { FacilityProfileView } from './FacilityProfileView';
import { useFilters } from '../context/FilterContext';
import { safeTrim, safeUpper } from '../utils';


interface MapVisualizerProps {
  records: WaterRecord[];
  sources: WaterSource[];
  activities: FieldActivity[];
  onSelectSourceFromMap: (key: string) => void;
  onNavigateToTab: (tab: string) => void;
  onUpdateSource: (updatedSource: WaterSource, originalSourceKey: string) => void;
  onDeleteSource: (source_key: string) => void;
  onAddActivity: (activity: FieldActivity) => void;
  onUpdateActivity?: (activity: FieldActivity) => void;
}

const isRecordedSinceLastQuarter = (testDateStr: string): boolean => {
  const testDate = new Date(testDateStr);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);
  
  let thresholdDate: Date;
  if (currentQuarter === 0) {
    thresholdDate = new Date(currentYear - 1, 9, 1);
  } else if (currentQuarter === 1) {
    thresholdDate = new Date(currentYear, 0, 1);
  } else if (currentQuarter === 2) {
    thresholdDate = new Date(currentYear, 3, 1);
  } else {
    thresholdDate = new Date(currentYear, 6, 1);
  }
  
  return testDate >= thresholdDate;
};

const formatDateNicely = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

export const MapVisualizer: React.FC<MapVisualizerProps> = ({
  records,
  sources,
  activities,
  onSelectSourceFromMap,
  onNavigateToTab,
  onUpdateSource,
  onDeleteSource,
  onAddActivity,
  onUpdateActivity
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const { filters, setFilterBrgy } = useFilters();
  const activeBrgyFilter = filters.barangay;
  const setActiveBrgyFilter = setFilterBrgy;

  const [mapStyle, setMapStyle] = useState<'day' | 'satellite' | 'dark'>('day');
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const tileLayerRef = useRef<L.Layer | null>(null);

  // Presentation Mode state: stores the key of the source being active profiled
  const [presentationActiveSourceKey, setPresentationActiveSourceKey] = useState<string | null>(null);
  const isPresentationMode = presentationActiveSourceKey !== null;

  const activeSourceForPresentation = useMemo(() => {
    if (!presentationActiveSourceKey) return null;
    return sources.find(s => s.source_key === presentationActiveSourceKey) || null;
  }, [sources, presentationActiveSourceKey]);

  const barangays = useMemo(() => {
    return [
      'AMOROS', 'BOLISONG', 'CALONGONAN', 'COGON', 'HIMAYA', 'HINIGDAAN', 
      'KALABAYLABAY', 'KIBONBON', 'MOLUGAN', 'POBLACION', 'BOLOBOLO', 
      'SAMBULAWAN', 'SINALOC', 'TAYTAY', 'ULALIMAN'
    ].sort();
  }, []);

  // Compute Barangay dynamic statistics on the fly
  const brgyStats = useMemo(() => {
    const stats: { [key: string]: { total: number; passed: number; rate: number } } = {};
    
    // Seed all 15 barangays
    [
      'AMOROS', 'BOLISONG', 'CALONGONAN', 'COGON', 'HIMAYA', 'HINIGDAAN', 
      'KALABAYLABAY', 'KIBONBON', 'MOLUGAN', 'POBLACION', 'BOLOBOLO', 
      'SAMBULAWAN', 'SINALOC', 'TAYTAY', 'ULALIMAN'
    ].forEach(name => {
      stats[name] = { total: 0, passed: 0, rate: -1 };
    });

    records.forEach(r => {
      const name = safeUpper(r.brgy);
      if (stats[name]) {
        stats[name].total++;
        if (r.micro === 'PASSED' && (r.phychem === 'PASSED' || r.phychem === 'N/A')) {
          stats[name].passed++;
        }
      }
    });

    Object.keys(stats).forEach(name => {
      const s = stats[name];
      if (s.total > 0) {
        s.rate = Math.round((s.passed / s.total) * 100);
      }
    });

    return stats;
  }, [records]);

  // Map Color helper based on compliance rate
  const getBrgyColor = (rate: number): string => {
    if (rate === -1) return '#64748b'; // Grey - No Data
    if (rate === 100) return '#10b981'; // Green - Perfect Pass
    if (rate >= 50) return '#f59e0b'; // Amber - Moderate Safety
    return '#f43f5e'; // Red - High Hazard
  };

  // Source pin color calculator
  const getSourceColor = (source: WaterSource): string => {
    if (source.status === 'Decommissioned') return '#a855f7'; // Purple - Decommissioned
    const historical = records.filter(r => {
      const matchBrgy = safeUpper(r.brgy) === safeUpper(source.barangay);
      const matchRes = safeUpper(r.res) === safeUpper(source.name_of_source);
      const matchZone = !source.zone || !r.zone || safeTrim(r.zone) === safeTrim(source.zone);
      return matchBrgy && matchRes && matchZone;
    });
    if (historical.length === 0) return '#64748b'; // Grey - Untested
    const fails = historical.some(r => r.micro === 'FAILED' || r.phychem === 'FAILED');
    return fails ? '#f43f5e' : '#10b981';
  };

  // Initialize Map Container
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center map of El Salvador City Center (approx lat: 8.5615, lng: 124.5126)
    const map = L.map(mapContainerRef.current, {
      center: [8.5615, 124.5126],
      zoom: 13,
      layers: []
    });

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    setMapLoaded(true);

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    // Clean up on component unmount
    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      setMapLoaded(false);
    };
  }, []);

  // Sync / update tile layers dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (mapStyle === 'day') {
      const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
      });
      tile.addTo(map);
      tileLayerRef.current = tile;
    } else if (mapStyle === 'satellite') {
      const tile = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      });
      tile.addTo(map);
      tileLayerRef.current = tile;
    } else {
      // Dark Mode: Esri Dark Gray Base with Reference Labels (high-contrast, clean, no watermark)
      const base = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
      });
      const labels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16
      });
      const group = L.layerGroup([base, labels]);
      group.addTo(map);
      tileLayerRef.current = group;
    }
  }, [mapLoaded, mapStyle]);

  // Sync / Draw Choropleth polygons and Pins overlays when dependencies change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Reset/clear any existing geojson layers
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
    }
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }

    // 1. Draw Barangay GeoJSON Polygons
    geojsonLayerRef.current = L.geoJSON(BARANGAY_GEOJSON as any, {
      style: (feature) => {
        let brgyName = (feature?.properties?.name || feature?.properties?.BARANGAY || '').toUpperCase();
        const stat = brgyStats[brgyName] || { rate: -1 };
        
        // Highlight active filtered Barangay
        const isSelected = activeBrgyFilter !== 'ALL' && activeBrgyFilter.toUpperCase() === brgyName;
        
        const isSat = mapStyle === 'satellite';
        const defaultFillOpacity = isSat ? 0.22 : 0.45;
        const selectedFillOpacity = isSat ? 0.55 : 0.75;
        
        const defaultBorderColor = isSat ? '#ffffff' : '#49769F';
        const selectedBorderColor = isSat ? '#38bdf8' : '#7bbde8';

        return {
          fillColor: getBrgyColor(stat.rate),
          fillOpacity: isSelected ? selectedFillOpacity : defaultFillOpacity,
          color: isSelected ? selectedBorderColor : defaultBorderColor,
          weight: isSelected ? 3 : 1.5,
          dashArray: isSelected ? '' : '3'
        };
      },
      onEachFeature: (feature, layer) => {
        let brgyName = (feature?.properties?.name || feature?.properties?.BARANGAY || '').toUpperCase();
        const stat = brgyStats[brgyName] || { total: 0, passed: 0, rate: -1 };
        
        const rateLabel = stat.rate === -1 ? 'None Conducted' : `${stat.rate}% Passed`;
        const popupContent = `
          <div class="p-2 text-xs custom-leaflet-popup font-sans max-w-[170px]">
            <h4 class="font-extrabold text-white text-sm uppercase mb-1">${brgyName}</h4>
            <div class="h-px bg-brand-slate/20 my-1"></div>
            <p class="text-brand-soft leading-tight">Total reports: <strong>${stat.total}</strong></p>
            <p class="text-brand-soft font-semibold leading-tight mt-1">Passing index: <strong class="text-brand-light">${rateLabel}</strong></p>
            <div class="text-[9px] text-brand-autumn uppercase mt-1.5 font-bold">CHO - Sanitation Monitoring</div>
          </div>
        `;
        
        layer.bindPopup(popupContent, {
          className: 'custom-leaflet-popup'
        });

        // Hover binding feedback effect
        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              fillOpacity: 0.65,
              weight: 2
            });
          },
          mouseout: (e) => {
            if (geojsonLayerRef.current) {
              geojsonLayerRef.current.resetStyle(e.target);
            }
          }
        });
      }
    }).addTo(map);

    // 2. Plot Overlay Pinpoint Markers for Sources
    if (markersLayerRef.current) {
      // Collision offset registry for overlapping coordinates
      const coordBuckets: Record<string, number> = {};

      sources.forEach(source => {
        // Skip sources that have standard empty or placeholder latitude/longitudes
        if (!source.gps_lat || !source.gps_lng) return;

        // Skip marker mismatching Barangay filters if active
        if (activeBrgyFilter !== 'ALL' && safeUpper(source.barangay) !== safeUpper(activeBrgyFilter)) return;

        // Apply slight deterministic radial offset if coordinates collide directly
        const coordKey = `${source.gps_lat.toFixed(5)},${source.gps_lng.toFixed(5)}`;
        const collisionIndex = coordBuckets[coordKey] || 0;
        coordBuckets[coordKey] = collisionIndex + 1;

        let renderLat = source.gps_lat;
        let renderLng = source.gps_lng;
        if (collisionIndex > 0) {
          const angle = (collisionIndex * (2 * Math.PI)) / 6;
          const offsetRadius = 0.00022; // ~22m visual dispersion
          renderLat += Math.sin(angle) * offsetRadius;
          renderLng += Math.cos(angle) * (offsetRadius / Math.cos((source.gps_lat * Math.PI) / 180));
        }

        const pinColor = getSourceColor(source);
        const isDecom = source.status === 'Decommissioned';
        const marker = L.circleMarker([renderLat, renderLng], {
          radius: isDecom ? 9 : 8,
          fillColor: pinColor,
          color: isDecom ? '#ffffff' : '#001D39',
          weight: isDecom ? 2 : 1.5,
          fillOpacity: 0.95,
          dashArray: isDecom ? '3,3' : undefined
        });

        const statusBadgeHTML = isDecom
          ? `<span class="inline-block bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] uppercase font-black px-1.5 py-0.5 rounded leading-none mb-1.5">⚠️ Decommissioned / Inactive</span>`
          : ``;

        // Retrieve historical records for this specific source safely
        const sourceHistory = records.filter(r => {
          const matchBrgy = safeUpper(r.brgy) === safeUpper(source.barangay);
          const matchRes = safeUpper(r.res) === safeUpper(source.name_of_source);
          const matchZone = !source.zone || !r.zone || safeTrim(r.zone) === safeTrim(source.zone);
          return matchBrgy && matchRes && matchZone;
        });

        const sortedHistory = [...sourceHistory].sort((a, b) => b.date.localeCompare(a.date));

        let samplingHTML = '';
        if (sortedHistory.length === 0) {
          samplingHTML = `
            <div class="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-[#f59e0b] font-medium leading-normal mb-2">
              ⚠️ No Data/Sampling Activity conducted since the last quarter
            </div>
          `;
        } else {
          const mostRecent = sortedHistory[0];
          const hasRecentActivity = isRecordedSinceLastQuarter(mostRecent.date);

          if (!hasRecentActivity) {
            samplingHTML = `
              <div class="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-[#f59e0b] font-medium leading-normal mb-2 flex flex-col gap-0.5">
                <span>⚠️ No Data/Sampling Activity conducted since the last quarter</span>
                <span class="text-[9px] text-brand-autumn font-mono">Last run: ${mostRecent.micro === 'FAILED' || mostRecent.phychem === 'FAILED' ? 'FAIL' : 'PASS'} on ${formatDateNicely(mostRecent.date)}</span>
              </div>
            `;
          } else {
            const isFail = mostRecent.micro === 'FAILED' || mostRecent.phychem === 'FAILED';
            const badgeBg = isFail 
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            const badgeLabel = isFail ? 'FAIL' : 'PASS';

            samplingHTML = `
              <div class="p-1.5 rounded bg-brand-ocean/10 border border-brand-slate/20 text-[10px] mb-2 flex flex-col gap-0.5">
                <span class="text-[9px] text-brand-autumn font-black uppercase tracking-wider">Latest Test Result</span>
                <div class="flex items-center gap-1.5 mt-0.5">
                  <span class="inline-block ${badgeBg} text-[9px] uppercase font-black px-1.5 py-0.5 rounded leading-none shrink-0">${badgeLabel}</span>
                  <span class="text-brand-light font-bold font-mono text-[10px]">${formatDateNicely(mostRecent.date)}</span>
                </div>
              </div>
            `;
          }
        }

        const popupDiv = document.createElement('div');
        popupDiv.className = 'p-2 text-xs font-sans max-w-[200px] text-white';
        popupDiv.innerHTML = `
          <h4 class="font-bold uppercase text-sm mb-1">${source.name_of_source}</h4>
          <span class="text-[10px] text-brand-light font-bold block mb-1">Zone ${source.zone} • ${source.barangay}</span>
          ${statusBadgeHTML}
          <p class="text-brand-soft text-[11px] leading-relaxed mb-2">${source.landmark_description || 'No landmarks added.'}</p>
          ${samplingHTML}
          <div class="flex justify-between items-center border-t border-brand-slate/20 pt-1.5 mt-1.5">
            <span class="text-[10px] uppercase font-bold text-brand-autumn">${(source.source_type || 'Level 1').split(' ')[0]} classification</span>
            <button class="profile-lnk-btn text-brand-light font-bold hover:text-white transition cursor-pointer text-[10px] underline">Registry profile &rarr;</button>
          </div>
        `;

        // Intercept profile link click inside pure leaflet HTML popups dynamically to trigger Presentation Mode
        popupDiv.querySelector('.profile-lnk-btn')?.addEventListener('click', () => {
          setPresentationActiveSourceKey(source.source_key);
          onSelectSourceFromMap(source.source_key);
        });

        marker.bindPopup(popupDiv, {
          className: 'custom-leaflet-popup'
        });

        markersLayerRef.current.addLayer(marker);
      });
    }

    // 3. Dynamic territorial boundary fitBounds zoom focus
    if (map && mapLoaded) {
      if (activeBrgyFilter !== 'ALL' && geojsonLayerRef.current) {
        let foundLayer: L.Layer | null = null;
        geojsonLayerRef.current.eachLayer((layer: any) => {
          let featName = (layer.feature?.properties?.name || layer.feature?.properties?.BARANGAY || '').toUpperCase();
          if (featName === activeBrgyFilter.toUpperCase()) {
            foundLayer = layer;
          }
        });
        if (foundLayer && (foundLayer as any).getBounds) {
          const bounds = (foundLayer as any).getBounds();
          map.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 15,
            animate: true,
            duration: 1.0
          });
        }
      } else if (activeBrgyFilter === 'ALL' && !isPresentationMode) {
        // Return to overall El Salvador center view via bounds-fitting
        if (geojsonLayerRef.current && typeof geojsonLayerRef.current.getBounds === 'function') {
          try {
            const bounds = geojsonLayerRef.current.getBounds();
            if (bounds.isValid()) {
              map.fitBounds(bounds, {
                padding: [40, 40],
                maxZoom: 13,
                animate: true,
                duration: 1.0
              });
            } else {
              map.setView([8.5615, 124.5126], 13);
            }
          } catch (e) {
            map.setView([8.5615, 124.5126], 13);
          }
        } else {
          map.setView([8.5615, 124.5126], 13);
        }
      }
    }

  }, [records, sources, brgyStats, activeBrgyFilter, mapStyle, mapLoaded]);

  // Autofocus camera, size update, and panning when Presentation Mode changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoaded) return;

    // Refresh size boundary dimensions when layout split ratio alters (75% -> 50% transition)
    map.invalidateSize();

    if (isPresentationMode && activeSourceForPresentation) {
      const lat = activeSourceForPresentation.gps_lat;
      const lng = activeSourceForPresentation.gps_lng;

      if (lat && lng) {
        // First fly camera
        map.flyTo([lat, lng], 15, {
          animate: true,
          duration: 1.0
        });

        // Re-calculate size and center once animation completes
        const timer = setTimeout(() => {
          map.invalidateSize();
          map.panTo([lat, lng], { animate: true });
        }, 350);

        return () => clearTimeout(timer);
      }
    }
  }, [presentationActiveSourceKey, activeSourceForPresentation, isPresentationMode, mapLoaded]);

  const handleResetMapFocus = () => {
    setActiveBrgyFilter('ALL');
    if (mapInstanceRef.current && geojsonLayerRef.current && typeof geojsonLayerRef.current.getBounds === 'function') {
      try {
        const bounds = geojsonLayerRef.current.getBounds();
        if (bounds.isValid()) {
          mapInstanceRef.current.fitBounds(bounds, {
            padding: [40, 40],
            maxZoom: 13,
            animate: true,
            duration: 1.0
          });
          return;
        }
      } catch (e) {
        // Fallback below
      }
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([8.5615, 124.5126], 13);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in relative selection:bg-brand-ocean">
      
      {/* Sidebar Controls and Legend (Hidden in Presentation Mode) */}
      {!isPresentationMode && (
        <div className="lg:col-span-3 space-y-4">

          {/* Map Theme Selector */}
          <div className="glass-panel p-4 rounded-xl border border-brand-slate/20">
            <label className="block text-xs font-bold text-brand-soft uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Layers size={14} className="text-[#7BBDE8]" /> Map Style Theme
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#011415]/60 p-1 rounded-lg border border-brand-slate/15">
              {[
                { id: 'day', label: 'Day Mode', icon: Sun, color: 'text-amber-400' },
                { id: 'satellite', label: 'Satellite', icon: Globe, color: 'text-emerald-400' },
                { id: 'dark', label: 'Dark Mode', icon: Moon, color: 'text-[#7BBDE8]' }
              ].map(style => {
                const IconComp = style.icon;
                const isSelected = mapStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setMapStyle(style.id as any)}
                    className={`flex flex-col items-center justify-center py-2 px-1 rounded transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-brand-ocean/80 text-white font-extrabold border border-brand-light/20 shadow-md scale-[1.03]'
                        : 'text-brand-soft hover:bg-brand-ocean/20 hover:text-white border border-transparent'
                    }`}
                  >
                    <IconComp size={15} className={`${style.color} mb-1`} />
                    <span className="text-[9px] font-bold tracking-wider leading-none">{style.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-brand-autumn mt-2 leading-relaxed font-semibold">
              {mapStyle === 'day' && 'Bright day-view chart illustrating urban roads, administrative flags, and clear water markings.'}
              {mapStyle === 'satellite' && 'High-res geographical satellite photography illustrating houses, greenery, and facilities.'}
              {mapStyle === 'dark' && 'Low-glare deep-dark visual canvas tailored for high-contrast neon parameter highlights.'}
            </p>
          </div>
          
          {/* Barangay Focus select tool */}
          <div className="glass-panel p-4 rounded-xl border border-brand-slate/20">
            <label className="block text-xs font-bold text-brand-soft uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <MapIcon size={14} className="text-[#7BBDE8]" /> Spatial Focus Filter
            </label>
            <select
              value={activeBrgyFilter}
              onChange={(e) => setActiveBrgyFilter(e.target.value)}
              className="glass-input w-full rounded-lg px-2.5 py-1.5 text-xs font-semibold"
            >
              <option value="ALL">All Barangay Polygons (15)</option>
              {barangays.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <p className="text-[10px] text-brand-autumn mt-2 leading-relaxed">
              Selecting a specific barangay highlights its territorial bounds. Click polygons to reveal local water metrics.
            </p>
          </div>

          {/* Map Legend */}
          <div className="glass-panel p-4 rounded-xl border border-brand-slate/20 space-y-4">
            <h4 className="text-xs uppercase font-extrabold text-[#7BBDE8] tracking-wider border-b border-brand-slate/20 pb-1.5 flex items-center gap-1.5 font-display">
              <Info size={12} /> Map Index Legend
            </h4>

            {/* Choropleth safety ranges */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-brand-soft uppercase tracking-wide">Barangay Compliance (Choropleth)</p>
              {[
                { label: 'Perfect Safety Rate (100% Pass)', color: 'bg-[#10b981]' },
                { label: 'Moderate Risk (50–99% Pass)', color: 'bg-[#f59e0b]' },
                { label: 'Critical Sanitary Hazard (<50% Pass)', color: 'bg-[#f43f5e]' },
                { label: 'Unmonitored Territory (No Data)', color: 'bg-[#64748b]' }
              ].map((leg, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-brand-soft">
                  <span className={`w-3.5 h-3.5 rounded-sm ${leg.color} shrink-0 border border-brand-deep`}></span>
                  <span>{leg.label}</span>
                </div>
              ))}
            </div>

            <hr className="border-brand-slate/10" />

            {/* Pin overlays ranges */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-brand-soft uppercase tracking-wide">Registered facilities overlay</p>
              {[
                { label: '100% Sanitary Pass Rating', color: 'bg-[#10b981]' },
                { label: 'Violation Logged in past tests', color: 'bg-[#f43f5e]' },
                { label: 'Awaiting first analysis run', color: 'bg-[#64748b]' },
                { label: 'Permanently Decommissioned', color: 'bg-[#a855f7]' }
              ].map((pinLeg, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-brand-soft">
                  <span className={`w-3 h-3 rounded-full ${pinLeg.color} shrink-0 border-2 border-[#001D39] ring-1 ring-brand-slate/30`}></span>
                  <span>{pinLeg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Focus Actions */}
          <button
            onClick={handleResetMapFocus}
            className="w-full py-2 bg-brand-ocean/30 hover:bg-brand-ocean/50 text-brand-light border border-brand-slate/25 hover:border-brand-light text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
          >
            <RefreshCw size={12} /> Reset Camera Focus
          </button>

        </div>
      )}

      {/* Actual Map Container Stage - dynamically changes columns from 9 (when sidebar present) to 6 (when split profiled) */}
      <div className={`h-[60vh] lg:h-[710px] rounded-2xl overflow-hidden border border-brand-slate/20 bg-brand-deep shadow-2xl relative transition-all duration-300 ${
        isPresentationMode ? 'lg:col-span-6 col-span-12' : 'lg:col-span-9 col-span-12'
      }`}>
        <div id="map-stage" ref={mapContainerRef} className="w-full h-full" />

        {/* Floating Style Overlay Toggle for Map Customisation directly on Stage */}
        <div className="absolute top-4 right-4 z-[1000] flex bg-brand-deep/90 backdrop-blur border border-brand-slate/20 p-1 rounded-xl shadow-2xl items-center gap-0.5">
          {[
            { id: 'day', icon: Sun, color: 'text-amber-400', label: 'Day' },
            { id: 'satellite', icon: Globe, color: 'text-emerald-400', label: 'Sat' },
            { id: 'dark', icon: Moon, color: 'text-[#7BBDE8]', label: 'Dark' }
          ].map(style => {
            const Icon = style.icon;
            const isSelected = mapStyle === style.id;
            return (
              <button
                key={style.id}
                onClick={() => setMapStyle(style.id as any)}
                className={`p-1.5 px-2.5 rounded-lg text-[9.5px] font-bold flex items-center gap-1 transition cursor-pointer select-none ${
                  isSelected
                    ? 'bg-brand-ocean text-white border border-brand-light/20 shadow-md'
                    : 'text-brand-soft hover:bg-brand-ocean/20 hover:text-white border border-transparent'
                }`}
              >
                <Icon size={11} className={style.color} />
                <span>{style.label}</span>
              </button>
            );
          })}
        </div>

        {/* Floating Controls/Legend for Presentation Mode */}
        {isPresentationMode && (
          <>
            {/* Exit Presentation Mode Floating Action Button */}
            <div className="absolute top-4 left-4 z-[1000] flex gap-2">
              <button
                onClick={() => setPresentationActiveSourceKey(null)}
                className="p-2 px-3.5 rounded-xl text-[10px] font-black bg-rose-500 hover:bg-rose-600 text-white shadow-2xl flex items-center gap-1.5 cursor-pointer border border-rose-400/30 uppercase tracking-wider font-display transition-all"
              >
                <X size={13} strokeWidth={3} /> Exit Presentation
              </button>
            </div>

            {/* Floating Index Legend Layer */}
            <div className="absolute bottom-4 left-4 z-[1000] p-3.5 rounded-xl border border-brand-slate/20 bg-brand-deep/95 backdrop-blur max-w-[210px] pointer-events-auto shadow-2xl flex flex-col gap-2.5">
              <div className="flex justify-between items-center border-b border-brand-slate/15 pb-1">
                <span className="text-[9.5px] uppercase font-bold text-[#7BBDE8] tracking-wide flex items-center gap-1">
                  <Info size={11} /> Floating Map Legend
                </span>
              </div>
              <div className="space-y-1.5 text-[9.5px] text-brand-soft leading-tight font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981] inline-block border border-brand-deep shrink-0"></span>
                  <span>100% Safety Pass</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b] inline-block border border-brand-deep shrink-0"></span>
                  <span>Moderate Risk Zone</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#f43f5e] inline-block border border-brand-deep shrink-0"></span>
                  <span>Critical sanitary hazard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#64748b] inline-block border border-brand-deep shrink-0"></span>
                  <span>Unmonitored Territory</span>
                </div>
                <div className="border-t border-brand-slate/15 pt-1.5 mt-1">
                  <p className="text-[8.5px] font-black uppercase text-brand-autumn tracking-wider mb-1">Overlay Pinpoints</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] inline-block border border-[#001D39] shrink-0"></span>
                    <span>Safe Facility Node</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#f43f5e] inline-block border border-[#001D39] shrink-0"></span>
                    <span>Violation Facility Node</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#a855f7] inline-block border border-[#001D39] shrink-0"></span>
                    <span>Decommissioned Node</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* RIGHT SIDE PANEL: PRESENTATION DETAILED PROFILE VIEW (Visible only in presentation mode) */}
      {isPresentationMode && activeSourceForPresentation && (
        <div className="lg:col-span-6 col-span-12 flex flex-col h-[60vh] lg:h-[710px] space-y-4 animate-fade-in min-w-0 relative z-[1002]">
          
          {/* Presenter Node Status Ribbon */}
          <div className="flex justify-between items-center p-3 px-4 rounded-xl border border-brand-slate/20 bg-brand-ocean/10 backdrop-blur shrink-0">
            <div className="min-w-0">
              <span className="text-[8px] font-black uppercase text-[#7BBDE8] tracking-widest block leading-none mb-1">GIS Node Inspector Profile:</span>
              <h3 className="text-xs font-bold text-white uppercase truncate tracking-wide leading-none">{activeSourceForPresentation.name_of_source}</h3>
            </div>
            <button
              onClick={() => setPresentationActiveSourceKey(null)}
              className="p-1 px-3 rounded-lg text-[9px] font-black uppercase bg-brand-deep/60 hover:bg-rose-500/10 border border-brand-slate/15 hover:border-rose-500/20 text-brand-autumn hover:text-rose-400 transition cursor-pointer"
            >
              Close Profile
            </button>
          </div>

          {/* Profile Renderer */}
          <div className="flex-1 overflow-hidden min-h-0">
            <FacilityProfileView
              activeSource={activeSourceForPresentation}
              records={records}
              activities={activities}
              onUpdateSource={onUpdateSource}
              onDeleteSource={(key) => {
                onDeleteSource(key);
                setPresentationActiveSourceKey(null);
              }}
              onAddActivity={onAddActivity}
              onUpdateActivity={onUpdateActivity}
              onSelectSource={(key) => {
                setPresentationActiveSourceKey(key);
                onSelectSourceFromMap(key);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
};
