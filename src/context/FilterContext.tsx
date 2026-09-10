import React, { createContext, useContext, useState, useEffect } from 'react';

export interface GlobalFilters {
  year: string;
  quarter: string;
  barangay: string;
  waterSource: string;
  outcomeViolation: string;
}

interface FilterContextType {
  filters: GlobalFilters;
  setFilterYear: (year: string) => void;
  setFilterQuarter: (quarter: string) => void;
  setFilterBrgy: (barangay: string) => void;
  setFilterWaterSource: (waterSource: string) => void;
  setFilterOutcomeViolation: (outcomeViolation: string) => void;
  resetFilters: () => void;
}

const DEFAULT_FILTERS: GlobalFilters = {
  year: 'ALL',
  quarter: 'ALL',
  barangay: 'ALL',
  waterSource: 'ALL',
  outcomeViolation: 'ALL'
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<GlobalFilters>(() => {
    try {
      const saved = localStorage.getItem('cho_global_filters');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Unable to load global filters from localStorage:', e);
    }
    return DEFAULT_FILTERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('cho_global_filters', JSON.stringify(filters));
    } catch (e) {
      console.warn('Unable to save global filters to localStorage:', e);
    }
  }, [filters]);

  const setFilterYear = (year: string) => {
    setFilters(prev => ({ ...prev, year }));
  };

  const setFilterQuarter = (quarter: string) => {
    setFilters(prev => ({ ...prev, quarter }));
  };

  const setFilterBrgy = (barangay: string) => {
    setFilters(prev => ({ ...prev, barangay }));
  };

  const setFilterWaterSource = (waterSource: string) => {
    setFilters(prev => ({ ...prev, waterSource }));
  };

  const setFilterOutcomeViolation = (outcomeViolation: string) => {
    setFilters(prev => ({ ...prev, outcomeViolation }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilterYear,
        setFilterQuarter,
        setFilterBrgy,
        setFilterWaterSource,
        setFilterOutcomeViolation,
        resetFilters
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
