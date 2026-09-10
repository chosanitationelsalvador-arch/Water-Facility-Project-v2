import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

let supabaseClient: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
} else {
  console.warn(
    'Supabase environment variables VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY are missing. The application will fall back to local browser storage.'
  );
}

// Ultra-defensive Proxy to prevent runtime crashes if some code accesses properties of the uninitialized client
const dummyProxy: any = new Proxy({} as any, {
  get(target, prop) {
    if (prop === 'then') return undefined; // Promise check safeguard
    return () => dummyProxy;
  }
});

export const supabase = supabaseClient || dummyProxy;

