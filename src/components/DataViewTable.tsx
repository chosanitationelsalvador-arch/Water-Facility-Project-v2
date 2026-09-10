import React, { useState, useMemo } from 'react';
import { Table, Search, Shield, ShieldAlert, BadgeAlert, Printer, X, FileText } from 'lucide-react';
import { WaterRecord } from '../types';
import { useFilters } from '../context/FilterContext';
import { parseDateSafe } from '../utils';

interface DataViewTableProps {
  records: WaterRecord[];
  onSelectRecord: (record: WaterRecord) => void;
}

export const DataViewTable: React.FC<DataViewTableProps> = ({ records, onSelectRecord }) => {
  const { filters, setFilterYear, setFilterQuarter, setFilterBrgy, setFilterWaterSource: setFilterSource, setFilterOutcomeViolation: setFilterOutcome } = useFilters();
  const filterYear = filters.year;
  const filterQuarter = filters.quarter;
  const filterBrgy = filters.barangay;
  const filterSource = filters.waterSource;
  const filterOutcome = filters.outcomeViolation;

  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const getQuarterValue = (dateStr: string): string => {
    return parseDateSafe(dateStr).quarter;
  };

  // Unique Lists
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

  const sources = useMemo(() => {
    return Array.from(new Set(records.map(r => r.res))).sort();
  }, [records]);

  // Handle Cascading Filtered dataset
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

  return (
    <div className="space-y-6 animate-fade-in relative selection:bg-brand-ocean">
      {/* Cascading Filter Toolbar */}
      <div className="glass-panel p-4 rounded-xl border border-brand-slate/20 bg-brand-deep/60 grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-[10px] font-bold text-brand-autumn uppercase tracking-wider mb-1.5">
            Year
          </label>
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="glass-input w-full rounded-lg px-2 py-1.5 text-xs font-bold font-mono"
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
          <label className="block text-[10px] font-bold text-brand-autumn uppercase tracking-wider mb-1.5">
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
            {sources.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="col-span-2 md:col-span-1">
          <label className="block text-[10px] font-bold text-brand-autumn uppercase tracking-wider mb-1.5">
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

      {/* Main Datatable */}
      <div className="glass-panel rounded-xl border border-brand-slate/20 overflow-hidden flex flex-col shadow-2xl h-[55vh]">
        <div className="p-4 border-b border-brand-slate/20 bg-brand-deep/30 flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-xs uppercase font-extrabold text-white tracking-widest flex items-center gap-1.5 font-display">
            <Table size={14} className="text-brand-light" /> Water Quality Dataset Registry
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold bg-brand-ocean/40 text-brand-light border border-brand-slate/30 px-3 py-1 rounded-full">
              {filteredRecords.length} entries matching
            </span>
            <button
              onClick={() => setShowPrintPreview(true)}
              className="flex items-center gap-1.5 bg-[#7BBDE8]/15 hover:bg-[#7BBDE8]/30 border border-[#7BBDE8]/30 px-3.5 py-1.5 rounded-lg text-xs font-black text-[#7BBDE8] hover:text-white transition cursor-pointer shrink-0"
              title="Generate a printable PDF report for the filtered dataset"
            >
              <Printer size={12} /> Print PDF / Report
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap min-w-max">
            <thead className="text-[10px] uppercase font-bold bg-[#001D39]/80 text-[#7BBDE8] border-b border-brand-slate/30 sticky top-0 z-10 shadow">
              <tr>
                <th className="px-4 py-3">Date tested</th>
                <th className="px-4 py-3 text-center">Quarter</th>
                <th className="px-4 py-3 text-center">Zone</th>
                <th className="px-4 py-3">Brgy &amp; Boundary</th>
                <th className="px-4 py-3">Water Source Facility</th>
                <th className="px-4 py-3 text-center">Micro</th>
                <th className="px-4 py-3">Remarks (Micro)</th>
                <th className="px-4 py-3 text-center">Phychem</th>
                <th className="px-4 py-3">Remarks (Phychem)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-slate/10 bg-brand-deep/20">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r, idx) => {
                  const q = getQuarterValue(r.date);
                  const isMicroPass = r.micro === 'PASSED';
                  const isPhychemPass = r.phychem === 'PASSED' || r.phychem === 'N/A';

                  return (
                    <tr
                      key={r.id || `rec-${r.date}-${r.brgy}-${r.res}-${idx}`}
                      onClick={() => onSelectRecord(r)}
                      className="hover:bg-brand-ocean/25 transition cursor-pointer"
                      title="Click to load this record for updates"
                    >
                      <td className="px-4 py-3 font-semibold font-mono text-[#7BBDE8]">{r.date}</td>
                      <td className="px-4 py-3 text-center font-bold">{q}</td>
                      <td className="px-4 py-3 text-center text-brand-autumn font-mono">{r.zone || '—'}</td>
                      <td className="px-4 py-3 font-bold text-white uppercase">{r.brgy}</td>
                      <td className="px-4 py-3 font-semibold uppercase text-brand-soft">{r.res}</td>
                      
                      {/* Micro */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-black text-[10px] ${
                          r.micro === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          r.micro === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                          'bg-brand-slate/10 text-brand-soft'
                        }`}>
                          {r.micro === 'PASSED' ? <Shield size={10} /> : r.micro === 'FAILED' ? <ShieldAlert size={10} /> : null}
                          {r.micro}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-brand-autumn italic truncate max-w-[180px]" title={r.micro_rem}>
                        {r.micro_rem || '—'}
                      </td>

                      {/* Physchem */}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-black text-[10px] ${
                          r.phychem === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                          r.phychem === 'FAILED' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                          'bg-brand-slate/10 text-brand-soft'
                        }`}>
                          {r.phychem === 'PASSED' ? <Shield size={10} /> : r.phychem === 'FAILED' ? <BadgeAlert size={10} /> : null}
                          {r.phychem}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-brand-autumn italic truncate max-w-[180px]" title={r.phychem_rem}>
                        {r.phychem_rem || '—'}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center p-12 text-brand-autumn italic">
                    No water testing reports matching critical filters were found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT PREVIEW OVERLAY MODAL */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-brand-deep/95 backdrop-blur-sm z-[250] flex flex-col overflow-y-auto p-4 md:p-8 animate-fade-in animate-duration-200">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: letter portrait;
                margin: 12mm 12mm 12mm 12mm;
              }
              body {
                background: #ffffff !important;
                color: #000000 !important;
                font-family: Arial, sans-serif !important;
              }
              body * {
                visibility: hidden !important;
                background: transparent !important;
              }
              /* Show ONLY print container and children */
              .print-only-container, .print-only-container * {
                visibility: visible !important;
              }
              .print-only-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                font-size: 11px !important;
              }
              .print-only-container table {
                border-collapse: collapse !important;
                width: 100% !important;
              }
              .print-only-container th, .print-only-container td {
                border: 1px solid #222222 !important;
                padding: 5px 7px !important;
                color: #000000 !important;
                font-size: 9px !important;
                white-space: normal !important;
              }
              .print-only-container th {
                background-color: #f3f4f6 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                font-weight: bold !important;
              }
              .print-only-container .no-print {
                display: none !important;
              }
            }
          `}} />

          {/* Non-printable Control Header in preview modality */}
          <div className="max-w-4xl w-full mx-auto bg-brand-ocean border border-brand-slate/40 p-4 rounded-xl flex items-center justify-between shadow-xl mb-6 shrink-0 non-printable">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#7BBDE8]/10 flex items-center justify-center text-[#7BBDE8]">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">Official Report Generation</h3>
                <p className="text-[10px] text-brand-soft font-mono uppercase mt-0.5">
                  Filters Applied: {filterYear !== 'ALL' ? filterYear : 'All Years'} • {filterQuarter !== 'ALL' ? filterQuarter : 'All Quarters'} • {filterBrgy !== 'ALL' ? filterBrgy : 'All Barangays'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-[#7BBDE8] hover:bg-[#7BBDE8]/90 text-brand-deep px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition cursor-pointer shadow-lg hover:shadow-[#7BBDE8]/20"
              >
                <Printer size={13} /> Confirm Print / Save PDF
              </button>
              <button
                onClick={() => setShowPrintPreview(false)}
                className="p-2 text-brand-autumn hover:text-white hover:bg-white/5 rounded-lg transition cursor-pointer"
                title="Exit Preview"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Printable Report Document Sheet Frame */}
          <div className="max-w-4xl w-full mx-auto bg-white text-black p-10 md:p-12 rounded-lg shadow-2xl relative print-only-container mb-12 select-text">
            
            {/* Report Letterhead Logo and Title Header */}
            <div className="flex flex-col items-center text-center border-b-2 border-double border-gray-800 pb-5 mb-6">
              <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Republic of the Philippines</span>
              <span className="text-xs font-black text-gray-800 uppercase tracking-wider mt-0.5">Province of Misamis Oriental</span>
              <span className="text-sm font-black text-gray-900 uppercase tracking-widest mt-0.5">City of El Salvador</span>
              <h1 className="text-lg font-black text-gray-950 uppercase tracking-wide font-display mt-3 flex items-center gap-2">
                City Health Office (CHO)
              </h1>
              <span className="text-[11px] font-bold text-gray-700 uppercase tracking-widest mt-1">Water Quality Sanitation & Surveillance Audit</span>
              <span className="text-[10px] font-mono text-gray-500 mt-1 uppercase">Official Registry Hardcopy Record sheet</span>
            </div>

            {/* Information Grid Section */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-gray-50 border border-gray-200 p-4 rounded-lg mb-6 text-[11px]">
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-500">Report Scope Year</span>
                <span className="font-extrabold text-gray-800 font-mono text-xs">{filterYear === 'ALL' ? 'ALL RECORDED YEARS' : filterYear}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-500">Scope Quarter</span>
                <span className="font-extrabold text-gray-800 uppercase text-xs">{filterQuarter === 'ALL' ? 'ALL QUARTERS' : filterQuarter}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-500">Filtered Barangay</span>
                <span className="font-extrabold text-gray-800 uppercase text-xs">{filterBrgy === 'ALL' ? 'ALL BARANGAYS' : filterBrgy}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-500">Water Facility Class</span>
                <span className="font-extrabold text-gray-800 uppercase font-mono text-xs truncate block" title={filterSource}>{filterSource === 'ALL' ? 'ALL REGISTERED FACILITIES' : filterSource}</span>
              </div>

              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-500">Sanitation Filter Mode</span>
                <span className="font-bold text-gray-800 uppercase text-[10px]">
                  {filterOutcome === 'ALL' && 'All Audited Specimens'}
                  {filterOutcome === 'MICRO_FAIL' && 'Microbiology Failures Only'}
                  {filterOutcome === 'PHYCHEM_FAIL' && 'Phys-Chem Failures Only'}
                  {filterOutcome === 'ALL_PASS' && '100% Fully Compliant Passes'}
                </span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-500">Date Generated</span>
                <span className="font-bold text-gray-800 font-mono text-[10px]">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-500">Total Filtered Logs</span>
                <span className="font-extrabold text-emerald-700 font-mono text-xs">{filteredRecords.length} Audited Events</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-gray-500">Registry System ID</span>
                <span className="font-mono text-gray-500 text-[10px]">CHO-WQS-9188</span>
              </div>
            </div>

            {/* Table of Records */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] print-table border border-gray-300">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="px-3 py-2 font-bold text-gray-800 uppercase border border-gray-300">Test Date</th>
                    <th className="px-2 py-2 text-center font-bold text-gray-800 uppercase border border-gray-300">Quarter</th>
                    <th className="px-2 py-2 text-center font-bold text-gray-800 uppercase border border-gray-300">Zone</th>
                    <th className="px-3 py-2 font-bold text-gray-800 uppercase border border-gray-300">Barangay</th>
                    <th className="px-3 py-2 font-bold text-gray-800 uppercase border border-gray-300">Facility / Source</th>
                    <th className="px-2 py-2 text-center font-bold text-gray-800 uppercase border border-gray-300">Micro</th>
                    <th className="px-3 py-2 font-bold text-gray-800 uppercase border border-gray-300">Micro Remarks</th>
                    <th className="px-2 py-2 text-center font-bold text-gray-800 uppercase border border-gray-300">Phychem</th>
                    <th className="px-3 py-2 font-bold text-gray-800 uppercase border border-gray-300">Physchem Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRecords.length > 0 ? (
                    filteredRecords.map((r, idx) => {
                      const q = getQuarterValue(r.date);
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-900 border border-gray-300 whitespace-nowrap">{r.date}</td>
                          <td className="px-2 py-2 text-center font-bold text-gray-700 border border-gray-300">{q}</td>
                          <td className="px-2 py-2 text-center font-mono text-gray-600 border border-gray-300">{r.zone || '—'}</td>
                          <td className="px-3 py-2 font-bold text-gray-950 uppercase border border-gray-300">{r.brgy}</td>
                          <td className="px-3 py-2 font-semibold text-gray-700 uppercase border border-gray-300">{r.res}</td>
                          
                          {/* Micro */}
                          <td className={`px-2 py-2 text-center font-black border border-gray-300 ${r.micro === 'FAILED' ? 'text-red-700 bg-red-50' : 'text-emerald-700'}`}>
                            {r.micro}
                          </td>
                          <td className="px-3 py-2 text-gray-600 italic border border-gray-300 text-[9.5px]">
                            {r.micro_rem || '—'}
                          </td>

                          {/* Physchem */}
                          <td className={`px-2 py-2 text-center font-black border border-gray-300 ${r.phychem === 'FAILED' ? 'text-red-700 bg-red-50' : 'text-emerald-700'}`}>
                            {r.phychem}
                          </td>
                          <td className="px-3 py-2 text-gray-600 italic border border-gray-300 text-[9.5px]">
                            {r.phychem_rem || '—'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="text-center p-8 text-gray-500 italic border border-gray-300">
                        No historical water testing records matched the filtered scope query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Official Report Sign-off Section */}
            <div className="mt-16 pt-8 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-xs">
              <div className="space-y-12">
                <div className="border-b border-gray-400 mx-6 pt-6"></div>
                <div>
                  <span className="block font-bold text-gray-900 uppercase">CHO Sanitary Inspector</span>
                  <span className="block text-[9px] text-gray-500">Report Compiler & Field Auditor</span>
                </div>
              </div>

              <div className="space-y-12">
                <div className="border-b border-gray-400 mx-6 pt-6"></div>
                <div>
                  <span className="block font-bold text-gray-900 uppercase">CHO Laboratory Supervisor</span>
                  <span className="block text-[9px] text-gray-500">Biological & Physical Assay Analyst</span>
                </div>
              </div>

              <div className="space-y-12">
                <div className="border-b border-gray-400 mx-6 pt-6"></div>
                <div>
                  <span className="block font-bold text-gray-900 uppercase">City Health Officer</span>
                  <span className="block text-[9px] text-gray-500">Authenticating Executive Officer</span>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center text-[9px] text-gray-400 border-t border-gray-100 pt-4 font-mono">
              CONFIDENTIAL DOCUMENT • FOR OFFICIAL MUNICIPAL HEALTH USE ONLY • CITY OF EL SALVADOR, MISAMIS ORIENTAL
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
