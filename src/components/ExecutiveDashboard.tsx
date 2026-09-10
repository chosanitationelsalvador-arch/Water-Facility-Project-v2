import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area } from 'recharts';
import { Droplet, AlertTriangle, ShieldCheck, Flag, Sparkles, TrendingUp, Award, Maximize2, X } from 'lucide-react';
import { WaterRecord, WaterSource } from '../types';
import { useFilters } from '../context/FilterContext';
import { parseDateSafe } from '../utils';


interface FiltersToolbarProps {
  filterYear: string;
  setFilterYear: (val: string) => void;
  years: string[];
  filterQuarter: string;
  setFilterQuarter: (val: string) => void;
  filterBrgy: string;
  setFilterBrgy: (val: string) => void;
  barangays: string[];
  filterSource: string;
  setFilterSource: (val: string) => void;
  uniqueSources: string[];
  filterOutcome: string;
  setFilterOutcome: (val: string) => void;
}

const FiltersToolbar: React.FC<FiltersToolbarProps> = ({
  filterYear,
  setFilterYear,
  years,
  filterQuarter,
  setFilterQuarter,
  filterBrgy,
  setFilterBrgy,
  barangays,
  filterSource,
  setFilterSource,
  uniqueSources,
  filterOutcome,
  setFilterOutcome
}) => {
  return (
    <div className="glass-panel p-4 rounded-xl border border-brand-slate/20 bg-brand-deep/60 grid grid-cols-2 md:grid-cols-5 gap-3 items-end w-full">
      <div>
        <label className="block text-[10px] font-bold text-brand-autumn uppercase tracking-wider mb-1.5">
          Year
        </label>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="glass-input w-full rounded-lg px-2 py-1.5 text-xs font-bold font-mono animate-pulse-subtle"
        >
          <option value="ALL">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-brand-autumn uppercase tracking-wider mb-1.5">
          Quarter
        </label>
        <select
          value={filterQuarter}
          onChange={(e) => setFilterQuarter(e.target.value)}
          className="glass-input w-full rounded-lg px-2 py-1.5 text-xs font-semibold"
        >
          <option value="ALL">All Quarters</option>
          <option value="Q1">Q1 (Jan–Mar)</option>
          <option value="Q2">Q2 (Apr–Jun)</option>
          <option value="Q3">Q3 (Jul–Sep)</option>
          <option value="Q4">Q4 (Oct–Dec)</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-[#8EB69B] uppercase tracking-wider mb-1.5">
          Barangay
        </label>
        <select
          value={filterBrgy}
          onChange={(e) => setFilterBrgy(e.target.value)}
          className="glass-input w-full rounded-lg px-2 py-1.5 text-xs"
        >
          <option value="ALL">All Barangays</option>
          {barangays.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-brand-autumn uppercase tracking-wider mb-1.5">
          Water Source
        </label>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="glass-input w-full rounded-lg px-2 py-1.5 text-xs font-semibold uppercase"
        >
          <option value="ALL">All Sources</option>
          {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="col-span-2 md:col-span-1">
        <label className="block text-[10px] font-bold text-[#8EB69B] uppercase tracking-wider mb-1.5">
          Outcome Violation
        </label>
        <select
          value={filterOutcome}
          onChange={(e) => setFilterOutcome(e.target.value)}
          className="glass-input w-full rounded-lg px-2 py-1.5 text-xs text-brand-light font-bold"
        >
          <option value="ALL">Show All Data</option>
          <option value="MICRO_FAIL">Failed Micro Tests</option>
          <option value="PHYCHEM_FAIL">Failed Phys-Chem</option>
          <option value="ALL_PASS">100% Passed Everything</option>
        </select>
      </div>
    </div>
  );
};

interface ExecutiveDashboardProps {
  records: WaterRecord[];
  sources: WaterSource[];
  onFocusSource: (brgy: string, name: string) => void;
}

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ records, sources, onFocusSource }) => {
  const { filters, setFilterYear, setFilterQuarter, setFilterBrgy, setFilterWaterSource: setFilterSource, setFilterOutcomeViolation: setFilterOutcome } = useFilters();
  const filterYear = filters.year;
  const filterQuarter = filters.quarter;
  const filterBrgy = filters.barangay;
  const filterSource = filters.waterSource;
  const filterOutcome = filters.outcomeViolation;

  // Zoomed Chart state
  const [zoomedChart, setZoomedChart] = useState<string | null>(null);

  const getQuarterValue = (dateStr: string): string => {
    return parseDateSafe(dateStr).quarter;
  };

  // Define unique lists for filters
  const years = useMemo(() => {
    return Array.from(new Set(records.map(r => r.year.toString()))).sort((a, b) => String(b).localeCompare(String(a)));
  }, [records]);

  const barangays = useMemo(() => {
    return [
      'AMOROS', 'BOLISONG', 'CALONGONAN', 'COGON', 'HIMAYA', 'HINIGDAAN', 
      'KALABAYLABAY', 'KIBONBON', 'MOLUGAN', 'POBLACION', 'BOLOBOLO', 
      'SAMBULAWAN', 'SINALOC', 'TAYTAY', 'ULALIMAN'
    ].sort();
  }, []);

  const uniqueSources = useMemo(() => {
    return Array.from(new Set(records.map(r => r.res))).sort();
  }, [records]);

  // Filter records based on active filters (all 5 parameters)
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const matchYear = filterYear === 'ALL' || r.year.toString() === filterYear;
      const matchQuarter = filterQuarter === 'ALL' || getQuarterValue(r.date) === filterQuarter;
      const matchBrgy = filterBrgy === 'ALL' || r.brgy === filterBrgy;
      const matchSource = filterSource === 'ALL' || r.res === filterSource;

      let matchOutcome = true;
      if (filterOutcome === 'MICRO_FAIL') matchOutcome = r.micro === 'FAILED';
      else if (filterOutcome === 'PHYCHEM_FAIL') matchOutcome = r.phychem === 'FAILED';
      else if (filterOutcome === 'ALL_PASS') matchOutcome = r.micro === 'PASSED' && (r.phychem === 'PASSED' || r.phychem === 'N/A');

      return matchYear && matchQuarter && matchBrgy && matchSource && matchOutcome;
    });
  }, [records, filterYear, filterQuarter, filterBrgy, filterSource, filterOutcome]);

  // --- KPI CALCULATIONS ---
  const totalSamples = filteredRecords.length;
  
  const passedCount = useMemo(() => {
    return filteredRecords.filter(r => r.micro === 'PASSED' && (r.phychem === 'PASSED' || r.phychem === 'N/A')).length;
  }, [filteredRecords]);

  const passRate = totalSamples > 0 ? Math.round((passedCount / totalSamples) * 100) : 0;

  const criticalCount = useMemo(() => {
    return filteredRecords.filter(r => r.micro === 'FAILED' || r.phychem === 'FAILED').length;
  }, [filteredRecords]);

  const activeBrgysCount = useMemo(() => {
    return new Set(filteredRecords.map(r => r.brgy)).size;
  }, [filteredRecords]);

  // --- PIE CHART DATA: MICROBIOLOGICAL COMPLIANCE ---
  const microData = useMemo(() => {
    let passed = 0, failed = 0, na = 0;
    filteredRecords.forEach(r => {
      if (r.micro === 'PASSED') passed++;
      else if (r.micro === 'FAILED') failed++;
      else na++;
    });
    return [
      { name: 'PASSED', value: passed, color: '#10b981' },
      { name: 'FAILED', value: failed, color: '#f43f5e' },
      { name: 'N/A / PENDING', value: na, color: '#49769F' }
    ].filter(d => d.value > 0);
  }, [filteredRecords]);

  // --- PIE CHART DATA: PHY-CHEM COMPLIANCE ---
  const phyChemData = useMemo(() => {
    let passed = 0, failed = 0, na = 0;
    filteredRecords.forEach(r => {
      if (r.phychem === 'PASSED') passed++;
      else if (r.phychem === 'FAILED') failed++;
      else na++;
    });
    return [
      { name: 'PASSED', value: passed, color: '#4e8ea2' },
      { name: 'FAILED', value: failed, color: '#f59e0b' },
      { name: 'N/A / MISSING', value: na, color: '#49769F' }
    ].filter(d => d.value > 0);
  }, [filteredRecords]);

  // --- PIE CHART DATA: DATA COMPLETENESS ---
  const completenessData = useMemo(() => {
    let completed = 0, missing = 0;
    filteredRecords.forEach(r => {
      if (r.micro !== 'N/A' && r.phychem !== 'N/A') completed++;
      else missing++;
    });
    return [
      { name: 'Fully Logged', value: completed, color: '#7bbde8' },
      { name: 'Missing Parameter', value: missing, color: '#0a4174' }
    ];
  }, [filteredRecords]);

  // --- BAR CHART DATA: PASS / FAIL BY BARANGAY ---
  const brgyComplianceData = useMemo(() => {
    const map: { [key: string]: { brgy: string; passed: number; failed: number } } = {};
    filteredRecords.forEach(r => {
      if (!map[r.brgy]) map[r.brgy] = { brgy: r.brgy, passed: 0, failed: 0 };
      const isPass = r.micro === 'PASSED' && (r.phychem === 'PASSED' || r.phychem === 'N/A');
      if (isPass) map[r.brgy].passed++;
      else map[r.brgy].failed++;
    });
    return Object.values(map).sort((a, b) => b.passed + b.failed - (a.passed + a.failed)).slice(0, 10);
  }, [filteredRecords]);

  // --- TIME TREND DATA ---
  const temporalTrendData = useMemo(() => {
    const quarterMap: { [key: string]: { name: string; total: number; passed: number } } = {};
    
    // Sort chronology logic helper
    const getQuarterLabel = (dateStr: string) => {
      return parseDateSafe(dateStr).label;
    };

    filteredRecords.forEach(r => {
      const qLabel = getQuarterLabel(r.date);
      if (!quarterMap[qLabel]) quarterMap[qLabel] = { name: qLabel, total: 0, passed: 0 };
      quarterMap[qLabel].total++;
      if (r.micro === 'PASSED' && (r.phychem === 'PASSED' || r.phychem === 'N/A')) {
        quarterMap[qLabel].passed++;
      }
    });

    return Object.values(quarterMap).sort((a, b) => a.name.localeCompare(b.name)).map(q => ({
      ...q,
      passRate: q.total > 0 ? Math.round((q.passed / q.total) * 100) : 0
    }));
  }, [filteredRecords]);

  // --- HISTOGRAM: COMMON FAILURE REASONS ---
  const failureReasonsData = useMemo(() => {
    const reasons: { [key: string]: number } = {};
    filteredRecords.forEach(r => {
      const remarks = `${r.micro_rem} ${r.phychem_rem}`.toUpperCase();
      if (remarks.includes('TOTAL COLIFORM')) reasons['Total Coliform'] = (reasons['Total Coliform'] || 0) + 1;
      if (remarks.includes('THERMO')) reasons['Thermotolerant'] = (reasons['Thermotolerant'] || 0) + 1;
      if (remarks.includes('NITRATE')) reasons['High Nitrate'] = (reasons['Nitrate'] || 0) + 1;
      if (remarks.includes('TDS') || remarks.includes('DISSOLVED')) reasons['High TDS'] = (reasons['High TDS'] || 0) + 1;
      if (remarks.includes('TURBIDITY')) reasons['Turbidity'] = (reasons['Turbidity'] || 0) + 1;
      if (remarks.includes('CHLORINE')) reasons['Residual Chlorine'] = (reasons['Chlorine'] || 0) + 1;
    });

    return Object.entries(reasons).map(([reason, count]) => ({
      reason,
      count
    })).sort((a, b) => b.count - a.count);
  }, [filteredRecords]);

  // --- REPEAT OFFENDERS MATRIX LOGIC ---
  const repeatOffenders = useMemo(() => {
    const groupings: { [key: string]: WaterRecord[] } = {};
    records.forEach(r => {
      // Group historical results to calculate accurate local consecutive failures
      const key = `${r.brgy}|||${r.res}`;
      if (!groupings[key]) groupings[key] = [];
      groupings[key].push(r);
    });

    const offenders: Array<{ res: string; brgy: string; zone: string; streak: number; lastTested: string; remarks: string }> = [];

    Object.entries(groupings).forEach(([key, items]) => {
      // Sort descending by date
      const sorted = items.sort((a, b) => b.date.localeCompare(a.date));
      let streak = 0;
      let lastRemarks = '';
      
      for (const item of sorted) {
        if (item.micro === 'FAILED' || item.phychem === 'FAILED') {
          streak++;
          if (streak === 1) {
            lastRemarks = [item.micro_rem, item.phychem_rem].filter(Boolean).join(' / ');
          }
        } else if (item.micro === 'PASSED' || item.phychem === 'PASSED') {
          break; // break streak on first pass
        }
      }

      if (streak >= 2) {
        const [brgy, res] = key.split('|||');
        offenders.push({
          res,
          brgy,
          zone: sorted[0]?.zone || '-',
          streak,
          lastTested: sorted[0]?.date || '-',
          remarks: lastRemarks || 'No active remarks logged.'
        });
      }
    });

    return offenders.sort((a, b) => b.streak - a.streak).slice(0, 10);
  }, [records]);

  // --- BARANGAY LEADERBOARD LOGIC ---
  const leaderboard = useMemo(() => {
    const list: { brgy: string; total: number; passed: number; rate: number }[] = [];
    barangays.forEach(name => {
      const brgyItems = records.filter(r => r.brgy === name);
      const total = brgyItems.length;
      const passed = brgyItems.filter(r => r.micro === 'PASSED' && (r.phychem === 'PASSED' || r.phychem === 'N/A')).length;
      list.push({
        brgy: name,
        total,
        passed,
        rate: total > 0 ? Math.round((passed / total) * 100) : 0
      });
    });
    return list.sort((a, b) => b.rate - a.rate || b.total - a.total);
  }, [records, barangays]);

  // Config definitions for the three primary compliance donut charts
  const chartsConfig = useMemo(() => {
    const microTotal = filteredRecords.length;
    const microPassed = filteredRecords.filter(r => r.micro === 'PASSED').length;
    const microPassRate = microTotal > 0 ? Math.round((microPassed / microTotal) * 100) : 0;

    const phychemTotal = filteredRecords.length;
    const phychemPassed = filteredRecords.filter(r => r.phychem === 'PASSED' || r.phychem === 'N/A').length;
    const phychemPassRate = phychemTotal > 0 ? Math.round((phychemPassed / phychemTotal) * 100) : 0;

    const completedTotal = filteredRecords.length;
    const completedCount = filteredRecords.filter(r => r.micro !== 'N/A' && r.phychem !== 'N/A').length;
    const completenessRate = completedTotal > 0 ? Math.round((completedCount / completedTotal) * 100) : 0;

    return [
      { id: 'micro', title: 'Microbiological Status', dataset: microData, rate: microPassRate, label: 'Safety Index' },
      { id: 'phychem', title: 'Phy-Chem Compliance', dataset: phyChemData, rate: phychemPassRate, label: 'Compliance Index' },
      { id: 'completeness', title: 'Data Completeness', dataset: completenessData, rate: completenessRate, label: 'Fully Logged' }
    ];
  }, [filteredRecords, microData, phyChemData, completenessData]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Dynamic Cascading Dashboard Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-brand-autumn font-extrabold uppercase tracking-wider">
          <TrendingUp size={14} className="text-brand-teal" /> Executive Dashboard Filters
        </div>
        <FiltersToolbar
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          years={years}
          filterQuarter={filterQuarter}
          setFilterQuarter={setFilterQuarter}
          filterBrgy={filterBrgy}
          setFilterBrgy={setFilterBrgy}
          barangays={barangays}
          filterSource={filterSource}
          setFilterSource={setFilterSource}
          uniqueSources={uniqueSources}
          filterOutcome={filterOutcome}
          setFilterOutcome={setFilterOutcome}
        />
      </div>

      {/* KPI Numerical Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Samples Logged', val: totalSamples, icon: Droplet, col: 'text-brand-light', border: 'border-brand-light/30' },
          { label: 'Safety Compliance', val: `${passRate}%`, icon: ShieldCheck, col: 'text-emerald-400', border: 'border-emerald-500/30' },
          { label: 'Unsafe Incidents', val: criticalCount, icon: AlertTriangle, col: 'text-rose-400', border: 'border-rose-500/30' },
          { label: 'Active Barangays', val: activeBrgysCount, icon: Flag, col: 'text-brand-teal', border: 'border-brand-teal/30' }
        ].map((kpi, idx) => (
          <div key={idx} className={`glass-panel border-t-2 ${kpi.border} rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden`}>
            <div>
              <p className="text-[10px] uppercase font-bold text-brand-autumn tracking-wider">{kpi.label}</p>
              <h3 className={`text-2xl md:text-3xl font-extrabold mt-1 font-display ${kpi.col}`}>{kpi.val}</h3>
            </div>
            <kpi.icon size={36} className="absolute right-3 bottom-3 opacity-15" />
          </div>
        ))}
      </div>

      {/* Recharts Pie Graphs for Proportions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {chartsConfig.map((chart) => (
          <div key={chart.id} className="glass-panel p-5 rounded-xl border border-brand-slate/20 flex flex-col items-center relative group">
            <div className="flex justify-between items-center border-b border-brand-slate/20 pb-1.5 mb-4 w-full">
              <h4 className="text-xs uppercase font-extrabold text-brand-soft tracking-wider font-display">
                {chart.title}
              </h4>
              <button
                onClick={() => setZoomedChart(chart.id)}
                className="p-1 rounded bg-brand-deep/60 hover:bg-brand-ocean border border-brand-slate/15 hover:border-brand-light/30 transition text-brand-autumn hover:text-white cursor-pointer"
                title="Zoom Chart"
              >
                <Maximize2 size={12} />
              </button>
            </div>
            
            {chart.dataset.length > 0 ? (
              <div className="w-full h-48 relative flex items-center justify-center">
                {/* Visual percentage representation in the middle of donut */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-[-10px] select-none text-center">
                  <span className="text-2xl font-black font-display text-white tracking-tight">{chart.rate}%</span>
                  <span className="text-[8px] uppercase font-bold text-[#8EB69B] tracking-wider">{chart.label}</span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chart.dataset}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {chart.dataset.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px', color: '#DAF1DE' }}
                    />
                    <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-brand-autumn italic">
                No matching testing parameters logged.
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recharts Area / Line Charts for Historical Trend Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend 1: Quarterly Analytics Vol */}
        <div className="glass-panel p-5 rounded-xl border border-brand-slate/20">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-xs uppercase font-extrabold text-brand-soft tracking-wider font-display flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-light" /> Quarterly Testing Volume
              </h4>
              <p className="text-[11px] text-brand-autumn mt-1">Quantity of completed reports over subsequent quarters.</p>
            </div>
            <button
              onClick={() => setZoomedChart('volume')}
              className="p-1 rounded bg-brand-deep/60 hover:bg-brand-ocean border border-brand-slate/15 hover:border-brand-light/30 transition text-brand-autumn hover:text-white cursor-pointer"
              title="Zoom Chart"
            >
              <Maximize2 size={12} />
            </button>
          </div>
          
          <div className="w-full h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={temporalTrendData}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0B2B26" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#051F20" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#49769f20" />
                <XAxis dataKey="name" tick={{ fill: '#bdd8e9', fontSize: 10 }} />
                <YAxis tick={{ fill: '#bdd8e9', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="total" name="Tests Logged" stroke="#8EB69B" fillOpacity={1} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Trend 2: Safety compliance rate over quarters */}
        <div className="glass-panel p-5 rounded-xl border border-brand-slate/20">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-xs uppercase font-extrabold text-brand-soft tracking-wider font-display flex items-center gap-1.5">
                <TrendingUp size={14} className="text-brand-teal" /> Compliance Trend Index
              </h4>
              <p className="text-[11px] text-brand-autumn mt-1">Passing percentage over subsequent municipal quarters.</p>
            </div>
            <button
              onClick={() => setZoomedChart('trend')}
              className="p-1 rounded bg-brand-deep/60 hover:bg-brand-ocean border border-brand-slate/15 hover:border-brand-light/30 transition text-brand-autumn hover:text-white cursor-pointer"
              title="Zoom Chart"
            >
              <Maximize2 size={12} />
            </button>
          </div>
          
          <div className="w-full h-64 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={temporalTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#49769f20" />
                <XAxis dataKey="name" tick={{ fill: '#bdd8e9', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#bdd8e9', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px' }} />
                <Line type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bar Charts for Comparative Barangay / Fail Histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pass/Fail by Barangay */}
        <div className="glass-panel p-5 rounded-xl border border-brand-slate/20 lg:col-span-2">
          <div className="flex justify-between items-start mb-4">
            <h4 className="text-xs uppercase font-extrabold text-brand-soft tracking-wider font-display">
              Compliance Comparison by Barangay Boundary
            </h4>
            <button
              onClick={() => setZoomedChart('brgy')}
              className="p-1 rounded bg-brand-deep/60 hover:bg-brand-ocean border border-brand-slate/15 hover:border-brand-light/30 transition text-brand-autumn hover:text-white cursor-pointer"
              title="Zoom Chart"
            >
              <Maximize2 size={12} />
            </button>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={brgyComplianceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#49769f20" />
                <XAxis dataKey="brgy" tick={{ fill: '#bdd8e9', fontSize: 9 }} />
                <YAxis tick={{ fill: '#bdd8e9', fontSize: 9 }} />
                <Tooltip contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px' }} />
                <Bar dataKey="passed" name="Safe Samples" fill="#10b981" stackId="stack" />
                <Bar dataKey="failed" name="Unsafe Samples" fill="#f43f5e" stackId="stack" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failed Parameters Histogram */}
        <div className="glass-panel p-5 rounded-xl border border-brand-slate/20">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="text-xs uppercase font-extrabold text-brand-soft tracking-wider font-display">
                Common Contamination Factors
              </h4>
              <p className="text-[11px] text-brand-autumn mt-1">Calculated from analytical flags inside remarks.</p>
            </div>
            <button
              onClick={() => setZoomedChart('factors')}
              className="p-1 rounded bg-brand-deep/60 hover:bg-brand-ocean border border-brand-slate/15 hover:border-brand-light/30 transition text-brand-autumn hover:text-white cursor-pointer"
              title="Zoom Chart"
            >
              <Maximize2 size={12} />
            </button>
          </div>
          
          {failureReasonsData.length > 0 ? (
            <div className="w-full h-60 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={failureReasonsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#49769f20" vertical={true} horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#bdd8e9', fontSize: 9 }} />
                  <YAxis dataKey="reason" type="category" width={90} tick={{ fill: '#bdd8e9', fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px' }} />
                  <Bar dataKey="count" name="Incidents" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center text-xs text-brand-autumn italic text-center">
              100% Sanitary compliance.<br />No analytical failure flags logged.
            </div>
          )}
        </div>
      </div>

      {/* Repeat Offenders Matrix & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Repeat Offenders Table */}
        <div className="glass-panel rounded-xl border border-rose-500/30 overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 bg-rose-950/20 border-b border-rose-500/20">
            <h4 className="text-xs uppercase font-extrabold text-rose-400 tracking-wider flex items-center gap-1.5 font-display">
              <AlertTriangle size={14} className="text-rose-400" /> Chronic Repeat Offenders
            </h4>
            <p className="text-[11px] text-brand-autumn mt-0.5">Water facilities showing 2+ consecutive microbiological or physical-chemical safety violations.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {repeatOffenders.length > 0 ? (
              <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#051F20]/80 text-[#8EB69B] uppercase font-bold sticky top-0 border-b border-brand-slate/20">
                  <tr>
                    <th className="px-4 py-3">Facility</th>
                    <th className="px-4 py-3 text-center">Streak failures</th>
                    <th className="px-4 py-3">Latest parameters</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-slate/10 bg-brand-deep/30">
                  {repeatOffenders.map((off, idx) => (
                    <tr
                      key={idx}
                      onClick={() => onFocusSource(off.brgy, off.res)}
                      className="hover:bg-rose-500/10 transition cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-white uppercase">{off.res}</div>
                        <div className="text-[10px] text-brand-autumn tracking-tight mt-0.5">Zone {off.zone} — {off.brgy}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-extrabold text-rose-400">
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
                          {off.streak} fails
                        </span>
                      </td>
                      <td className="px-4 py-3 text-brand-soft truncate max-w-[180px] italic" title={off.remarks}>
                        {off.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-brand-autumn italic h-64">
                No active repeat offenders identified. All facilities sanitary or successfully treated.
              </div>
            )}
          </div>
        </div>

        {/* Barangay Leaderboard Compliance */}
        <div className="glass-panel rounded-xl border border-brand-slate/20 overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 bg-brand-ocean/30 border-b border-brand-slate/20 flex items-center justify-between">
            <div>
              <h4 className="text-xs uppercase font-extrabold text-brand-soft tracking-wider flex items-center gap-1.5 font-display">
                <Award size={14} className="text-[#8EB69B]" /> Barangay Leaderboard
              </h4>
              <p className="text-[11px] text-brand-autumn mt-0.5">Barangays ranked according to absolute water safety values.</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-[#051F20]/80 text-[#8EB69B] uppercase font-bold sticky top-0 border-b border-brand-slate/20">
                <tr>
                  <th className="px-4 py-3 text-center">Rank</th>
                  <th className="px-4 py-3">Barangay</th>
                  <th className="px-4 py-3 text-center">Total tests</th>
                  <th className="px-4 py-3 text-right">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-slate/10 bg-brand-deep/30">
                {leaderboard.map((brgy, idx) => {
                  let badge = (idx + 1).toString();
                  if (idx === 0) badge = '🥇';
                  else if (idx === 1) badge = '🥈';
                  else if (idx === 2) badge = '🥉';
                  
                  return (
                    <tr key={idx} className="hover:bg-brand-ocean/10 transition">
                      <td className="px-4 py-3 text-center font-extrabold text-brand-soft">{badge}</td>
                      <td className="px-4 py-3 font-bold text-white uppercase">{brgy.brgy}</td>
                      <td className="px-4 py-3 text-center text-brand-autumn">{brgy.total} samples</td>
                      <td className="px-4 py-3 text-right font-black text-emerald-400">{brgy.rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Zoom Modal overlay */}
      {zoomedChart && (
        <div className="fixed inset-0 bg-[#020e0f]/95 backdrop-blur-md z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-panel border border-brand-light/25 bg-[#031c1d]/95 rounded-2xl w-full max-w-5xl shadow-2xl p-6 relative flex flex-col gap-6 select-none my-8 max-h-[95vh] custom-scrollbar overflow-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-brand-slate/20 pb-4">
              <div>
                <h2 className="text-base font-extrabold text-white uppercase tracking-wider font-display">
                  {zoomedChart === 'micro' && 'Microbiological Status Donut Analysis'}
                  {zoomedChart === 'phychem' && 'Phy-Chem Compliance Donut Analysis'}
                  {zoomedChart === 'completeness' && 'Data Completeness Donut Analysis'}
                  {zoomedChart === 'volume' && 'Quarterly Testing Volume History'}
                  {zoomedChart === 'trend' && 'Compliance Trend Index Timeline'}
                  {zoomedChart === 'brgy' && 'Compliance Comparison by Barangay Boundary'}
                  {zoomedChart === 'factors' && 'Common Contamination Factors'}
                </h2>
                <p className="text-[10px] text-[#8EB69B] uppercase font-mono tracking-widest mt-1">
                  Enlarged High-Fidelity Scientific Visualizer
                </p>
              </div>
              <button
                onClick={() => setZoomedChart(null)}
                className="p-1.5 rounded-full bg-brand-ocean/40 hover:bg-rose-500/20 border border-brand-slate/30 hover:border-rose-500/40 text-brand-autumn hover:text-rose-400 transition cursor-pointer"
                title="Minimize / Exit Zoom"
              >
                <X size={18} />
              </button>
            </div>

            {/* Standard filters component injected directly context-wise! */}
            <div className="w-full">
              <span className="text-[10px] font-bold text-brand-autumn uppercase tracking-wider block mb-2">
                Live Data Filtering Parameters:
              </span>
              <FiltersToolbar
                filterYear={filterYear}
                setFilterYear={setFilterYear}
                years={years}
                filterQuarter={filterQuarter}
                setFilterQuarter={setFilterQuarter}
                filterBrgy={filterBrgy}
                setFilterBrgy={setFilterBrgy}
                barangays={barangays}
                filterSource={filterSource}
                setFilterSource={setFilterSource}
                uniqueSources={uniqueSources}
                filterOutcome={filterOutcome}
                setFilterOutcome={setFilterOutcome}
              />
            </div>

            {/* Zoomed Chart Container */}
            <div className="w-full bg-[#031516]/60 border border-brand-slate/20 rounded-xl p-6 min-h-[350px] md:min-h-[420px] h-[55vh] flex items-center justify-center relative">
              {filteredRecords.length === 0 ? (
                <div className="text-center text-xs text-brand-autumn italic">
                  No matching data logged within selected criteria.
                </div>
              ) : (
                <div className="w-full h-full relative flex items-center justify-center">
                  {/* Render specified Zoomed chart */}

                  {/* microbiological donut */}
                  {zoomedChart === 'micro' && (
                    <>
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-[-20px] select-none text-center">
                        <span className="text-4xl font-black font-display text-white tracking-tight">
                          {chartsConfig[0].rate}%
                        </span>
                        <span className="text-xs uppercase font-bold text-[#8EB69B] tracking-wider">
                          {chartsConfig[0].label}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={microData}
                            cx="50%"
                            cy="50%"
                            innerRadius={90}
                            outerRadius={135}
                            dataKey="value"
                          >
                            {microData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px', color: '#DAF1DE', fontSize: '12px' }}
                          />
                          <Legend iconSize={12} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#DAF1DE' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  )}

                  {/* phychem compliance donut */}
                  {zoomedChart === 'phychem' && (
                    <>
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-[-20px] select-none text-center">
                        <span className="text-4xl font-black font-display text-white tracking-tight">
                          {chartsConfig[1].rate}%
                        </span>
                        <span className="text-xs uppercase font-bold text-[#8EB69B] tracking-wider">
                          {chartsConfig[1].label}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={phyChemData}
                            cx="50%"
                            cy="50%"
                            innerRadius={90}
                            outerRadius={135}
                            dataKey="value"
                          >
                            {phyChemData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px', color: '#DAF1DE', fontSize: '12px' }}
                          />
                          <Legend iconSize={12} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#DAF1DE' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  )}

                  {/* completeness donut */}
                  {zoomedChart === 'completeness' && (
                    <>
                      <div className="absolute flex flex-col items-center justify-center pointer-events-none mt-[-20px] select-none text-center">
                        <span className="text-4xl font-black font-display text-white tracking-tight">
                          {chartsConfig[2].rate}%
                        </span>
                        <span className="text-xs uppercase font-bold text-[#8EB69B] tracking-wider">
                          {chartsConfig[2].label}
                        </span>
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={completenessData}
                            cx="50%"
                            cy="50%"
                            innerRadius={90}
                            outerRadius={135}
                            dataKey="value"
                          >
                            {completenessData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px', color: '#DAF1DE', fontSize: '12px' }}
                          />
                          <Legend iconSize={12} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#DAF1DE' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </>
                  )}

                  {/* Quarterly volume */}
                  {zoomedChart === 'volume' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={temporalTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorVolZoom" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0B2B26" stopOpacity={0.5}/>
                            <stop offset="95%" stopColor="#051F20" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#49769f25" />
                        <XAxis dataKey="name" tick={{ fill: '#bdd8e9', fontSize: 11 }} />
                        <YAxis tick={{ fill: '#bdd8e9', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px', color: '#DAF1DE' }} />
                        <Area type="monotone" dataKey="total" name="Tests Logged" stroke="#8EB69B" strokeWidth={2} fillOpacity={1} fill="url(#colorVolZoom)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}

                  {/* compliance trend line */}
                  {zoomedChart === 'trend' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={temporalTrendData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#49769f25" />
                        <XAxis dataKey="name" tick={{ fill: '#bdd8e9', fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#bdd8e9', fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px', color: '#DAF1DE' }} />
                        <Line type="monotone" dataKey="passRate" name="Pass Rate %" stroke="#10b981" strokeWidth={3.5} activeDot={{ r: 10 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}

                  {/* barangay bar */}
                  {zoomedChart === 'brgy' && (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={brgyComplianceData} margin={{ top: 10, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#49769f25" />
                        <XAxis dataKey="brgy" tick={{ fill: '#bdd8e9', fontSize: 10, angle: -15, textAnchor: 'end' }} interval={0} />
                        <YAxis tick={{ fill: '#bdd8e9', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px', color: '#DAF1DE' }} />
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                        <Bar dataKey="passed" name="Safe Samples" fill="#10b981" stackId="stack" />
                        <Bar dataKey="failed" name="Unsafe Samples" fill="#f43f5e" stackId="stack" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* factors vertical bar */}
                  {zoomedChart === 'factors' && (
                    <div className="w-full h-full max-w-4xl mx-auto">
                      {failureReasonsData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={failureReasonsData} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#49769f20" vertical={true} horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#bdd8e9', fontSize: 10 }} />
                            <YAxis dataKey="reason" type="category" width={110} tick={{ fill: '#bdd8e9', fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: '#051F20', borderColor: '#163832', borderRadius: '8px', color: '#DAF1DE' }} />
                            <Bar dataKey="count" name="Incidents" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={24} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-brand-autumn italic text-center">
                          100% Sanitary compliance.<br />No analytical failure flags logged.
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="flex justify-end border-t border-brand-slate/20 pt-4 text-[10px] text-brand-autumn font-bold uppercase tracking-widest leading-none">
              <span>City Health Office (CHO) • Sanitary Compliance Engine</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
