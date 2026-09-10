export interface WaterRecord {
  id: string;
  date: string;
  year: number;
  zone: string;
  area: string;
  res: string; // Residence / Source Name
  brgy: string; // Barangay
  micro: 'PASSED' | 'FAILED' | 'N/A';
  phychem: 'PASSED' | 'FAILED' | 'N/A';
  micro_rem: string;
  phychem_rem: string;
  sampler_image_url?: string;
  status_image_url?: string;
}

export interface WaterSource {
  source_key: string; // BARANGAY|||NAME_OF_SOURCE|||ZONE
  barangay: string;
  name_of_source: string;
  zone: string;
  source_type: 'Level 1 (Point Source)' | 'Level 2 (Communal)' | 'Level 3 (Waterworks)' | 'Commercial Refilling';
  households_served: number;
  date_built: string;
  status: 'Active' | 'Inactive' | 'Under Repair' | 'Decommissioned';
  landmark_description: string;
  gps_lat: number;
  gps_lng: number;
  notes: string;
  profile_image_url?: string;
}

export interface FieldActivity {
  activity_id: string;
  source_key: string;
  barangay: string;
  source_name: string;
  zone: string;
  date_sampled: string;
  sampler_image_url?: string;
  status_image_url?: string;
  remarks: string;
  linked_result_date?: string;
  created_at: string;
  was_chlorinated: 'YES' | 'NO' | 'N/A';
  rained_prior: 'YES' | 'NO' | 'N/A';
  tank_cleaned: 'YES' | 'NO' | 'N/A';
}
