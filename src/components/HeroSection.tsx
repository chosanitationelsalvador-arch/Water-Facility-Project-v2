import React, { useState } from 'react';
import { Droplet, Map as MapIcon, Database, PenSquare, ArrowRight, Sparkles, CheckCircle2, ShieldCheck, HeartPulse } from 'lucide-react';
import { WaterRecord, WaterSource } from '../types';
import { MEDIA_ASSETS } from '../data';

interface HeroSectionProps {
  onNavigate: (tab: string) => void;
  records: WaterRecord[];
  sources: WaterSource[];
  scrollY?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, records, sources, scrollY = 0 }) => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const totalRecords = records.length;
  const activeSources = sources.filter(s => s.status === 'Active').length;
  
  const passedCount = records.filter(r => r.micro === 'PASSED' && (r.phychem === 'PASSED' || r.phychem === 'N/A')).length;
  const passRate = totalRecords > 0 ? Math.round((passedCount / totalRecords) * 100) : 0;

  // Dynamic glass-morphism adjustments based on precise scroll position
  const statsProgress = Math.min(Math.max((scrollY - 10) / 200, 0), 1);
  const statsBg = `rgba(11, 43, 38, ${0.12 + statsProgress * 0.28})`;
  const statsBlur = `${10 + statsProgress * 10}px`;

  const registryProgress = Math.min(Math.max((scrollY - 80) / 300, 0), 1);
  const registryBg = `rgba(11, 43, 38, ${0.15 + registryProgress * 0.28})`;
  const registryBlur = `${10 + registryProgress * 12}px`;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Immersive Photography-style High-Impact Welcome Banner (Floating text layout sitting on bled background) */}
      <div className="relative select-none py-10 md:py-16">
        {/* Soft radial green ambient overlays */}
        <div className="absolute -left-20 -top-20 w-[600px] h-[600px] rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-brand-steel/5 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-12 text-left">
          
          {/* Main Typography content - strictly left-aligned */}
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold bg-brand-ocean/80 backdrop-blur-md text-[#DAF1DE] border-0 shadow-lg shadow-black/40">
              <Sparkles size={13} className="text-[#8EB69B] animate-pulse" />
              <span>EL SALVADOR CITY SANITATION SURVEILLANCE REGISTER</span>
            </div>
            
            <h1 className="text-4xl md:text-7xl font-black tracking-tight text-white leading-none font-display text-left">
              Pure Water. <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-light to-brand-soft">
                Safeguarded Communities.
              </span>
            </h1>
            
            <p className="text-sm md:text-base text-[#DAF1DE]/90 leading-relaxed font-sans max-w-xl text-left">
              Authorized drinking water register monitoring real-time microbiological trials, physical-chemical elements, and chlorination indexes to defend municipal health lines across Misamis Oriental.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 justify-start">
              <button
                id="hero-btn-dashboard"
                onClick={() => onNavigate('dashboard')}
                className="px-6 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest bg-[#8EB69B] hover:bg-white text-brand-deep transition-all duration-300 border-0 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.85)] hover:shadow-[#8EB69B]/35 hover:-translate-y-1 flex items-center gap-2 cursor-pointer"
              >
                Analyze Executive Dashboard <ArrowRight size={15} />
              </button>
              <button
                id="hero-btn-map"
                onClick={() => onNavigate('map')}
                className="px-6 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest bg-brand-ocean/80 backdrop-blur-md text-[#DAF1DE] hover:text-white transition-all duration-300 border-0 shadow-[0_12px_24px_-4px_rgba(0,0,0,0.85)] hover:bg-[#163832]/60 hover:-translate-y-1 flex items-center gap-2 cursor-pointer"
              >
                Explore Spatial Map
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Modern Numerical Stats Bar - styled with minimal green glass effect, no line borders, emphasized shadow */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Samples Logged', value: totalRecords, desc: 'Quality records in historical database', icon: Droplet, color: 'text-[#8EB69B]' },
          { label: 'Overall Safety rate', value: `${passRate}%`, desc: 'Compliant microbiological trials', icon: ShieldCheck, color: 'text-emerald-400' },
          { label: 'Registered Facilities', value: sources.length, desc: 'Permanent municipal coordinates', icon: Database, color: 'text-[#DAF1DE]' }
        ].map((item, i) => (
          <div 
            key={i} 
            className="rounded-2xl p-6 flex items-center justify-between shadow-[0_14px_30px_-6px_rgba(0,0,0,0.88)] transition-all duration-300 relative overflow-hidden group hover:-translate-y-0.5"
            style={{
              backgroundColor: statsBg,
              backdropFilter: `blur(${statsBlur})`,
              WebkitBackdropFilter: `blur(${statsBlur})`
            }}
          >
            {/* Ambient inner soft green flow */}
            <div className="absolute inset-0 bg-gradient-to-b from-brand-ocean/5 to-[#163832]/5 pointer-events-none opacity-40"></div>
            
            <div className="relative z-10 text-left">
              <p className="text-xs uppercase font-extrabold text-[#DAF1DE] tracking-wider">{item.label}</p>
              <h2 className="text-3xl font-black text-white mt-1.5 font-display">{item.value}</h2>
              <p className="text-[10px] text-brand-light/70 mt-1">{item.desc}</p>
            </div>
            <div className={`p-3.5 rounded-2xl bg-brand-deep/50 border-0 relative z-10 ${item.color}`}>
              <item.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Tab Links - Grid of Features - matching Glass scheme, with inverted button hover copy effects */}
      <div className="space-y-4 pt-2">
        <h3 className="text-sm font-black text-white uppercase tracking-widest font-display border-b border-brand-steel/10 pb-2.5 flex items-center gap-2">
          <span>Active Registry Sections</span>
          <span className="h-1.5 w-1.5 rounded-full bg-brand-light animate-ping" />
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              id: 'lnk-dashboard',
              tab: 'dashboard',
              title: 'Executive Dashboard',
              desc: 'High-level safety rate visualizations, quality trend analyses, and coliform failure summaries.',
              icon: Droplet,
              accent: 'text-[#8EB69B]'
            },
            {
              id: 'lnk-map',
              tab: 'map',
              title: 'Barangay Choropleth',
              desc: 'Interactive map displaying color-coded sanitary boundaries and pinpoint source status markers.',
              icon: MapIcon,
              accent: 'text-emerald-400'
            },
            {
              id: 'lnk-sources',
              tab: 'sources',
              title: 'Registered Sources',
              desc: 'Comprehensive records detailing geographic benchmarks, households served, and logged field histories.',
              accent: 'text-[#DAF1DE]',
              icon: Database
            },
            {
              id: 'lnk-entry',
              tab: 'entry',
              title: 'Data Entry Terminal',
              desc: 'Log new microbiological, chlorination, and phy-chem testing reports with smart autocomplete.',
              icon: PenSquare,
              accent: 'text-brand-light'
            }
          ].map((portal, i) => {
            const isHovered = hoveredCard === i;
            return (
              <div
                id={portal.id}
                key={i}
                onMouseEnter={() => setHoveredCard(i)}
                onMouseLeave={() => setHoveredCard(null)}
                onClick={() => onNavigate(portal.tab)}
                className={`rounded-2xl p-6 cursor-pointer flex flex-col justify-between h-full group transition-all duration-300 relative overflow-hidden border-0 ${
                  isHovered 
                    ? 'shadow-[0_20px_40px_-5px_rgba(142,182,155,0.45)] scale-[1.03] -translate-y-2' 
                    : 'shadow-[0_14px_30px_-6px_rgba(0,0,0,0.88)]'
                }`}
                style={isHovered ? {
                  backgroundColor: '#8EB69B',
                } : {
                  backgroundColor: registryBg,
                  backdropFilter: `blur(${registryBlur})`,
                  WebkitBackdropFilter: `blur(${registryBlur})`
                }}
              >
                {/* Soft inner color blend */}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-deep/30 to-[#235347]/5 pointer-events-none opacity-50"></div>

                <div className="space-y-4 relative z-10 text-left">
                  <div className={`p-3 w-fit rounded-xl transition-all duration-300 border-0 ${
                    isHovered 
                      ? 'bg-[#051F20] text-[#8EB69B]' 
                      : `bg-brand-deep/60 ${portal.accent}`
                  }`}>
                    <portal.icon size={20} />
                  </div>
                  <h4 className={`font-extrabold text-base font-display tracking-tight transition-all duration-300 ${
                    isHovered ? 'text-[#051F20]' : 'text-white'
                  }`}>{portal.title}</h4>
                  <p className={`text-xs leading-relaxed transition-all duration-300 ${
                    isHovered ? 'text-[#051F20]/95 font-semibold' : 'text-[#DAF1DE]/90'
                  }`}>{portal.desc}</p>
                </div>
                <div className={`mt-5 pt-3 border-t transition-all duration-300 flex items-center gap-1.5 text-xs font-semibold relative z-10 ${
                  isHovered 
                    ? 'border-[#051F20]/15 text-[#051F20]' 
                    : 'border-brand-steel/10 text-brand-soft group-hover:text-white'
                }`}>
                  <span>Deploy module</span>
                  <ArrowRight size={13} className={`transition-transform duration-200 ${isHovered ? 'translate-x-1.5 text-[#051F20]' : 'group-hover:translate-x-1.5'}`} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

