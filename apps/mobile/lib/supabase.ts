import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createMobileProtectedFetch, getSafeMobileSupabaseConfig } from './safety';

const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSafeMobileSupabaseConfig();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: createMobileProtectedFetch() },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
