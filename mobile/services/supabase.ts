import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

import Constants from 'expo-constants';

// Keys moved to .env, with fallback to EAS Secrets via app.config.ts
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants.expoConfig?.extra?.supabaseAnonKey || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Missing Supabase keys in .env');
}

/**
 * Supabase Client Configuration
 * 
 * Initializes the connection to the Supabase backend.
 * Uses environment variables for security.
 * 
 * NOTE: The 'Anon' key is safe for client-side use as it is restricted by 
 * Row Level Security (RLS) policies on the database.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface Match {
    id: string;
    host_name: string;
    guest_name?: string | null;
    host_food: string;
    guest_food?: string | null;
    host_move?: string | null;
    guest_move?: string | null;
    status: 'waiting' | 'playing' | 'revealed';
    created_at?: string;
}
