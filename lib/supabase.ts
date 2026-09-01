import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  DayStatusRecord,
  SalahStatus,
  PrayerKey,
  SupabaseDayLogRow,
} from './types';
import {
  fromDbPrayerStatus,
  toDbPrayerStatus,
  parseDayRecord,
} from './storage';

/**
 * Client-safe Supabase Integration
 * Uses ONLY public anonymous key (NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * Never exposes service role key to browser client.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Single persistent client instance initialized once
let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return supabaseInstance;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Fetch all Day Logs for the authenticated user from Supabase `day_logs` table
 */
export async function fetchRemoteDayLogs(): Promise<{
  data: Record<string, DayStatusRecord> | null;
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: null };

  const user = await getCurrentSessionUser();
  if (!user) return { data: null, error: null };

  try {
    const { data, error } = await client
      .from('day_logs')
      .select('id, user_id, date, fajr, dhuhr, asr, maghrib, isha')
      .eq('user_id', user.id);

    if (error) {
      console.warn('[Supabase fetchRemoteDayLogs error]:', error.message);
      return { data: null, error: 'Unable to load prayer records from cloud.' };
    }

    if (!data || data.length === 0) {
      return { data: {}, error: null };
    }

    const logs: Record<string, DayStatusRecord> = {};
    data.forEach((row: any) => {
      if (row.date) {
        logs[row.date] = parseDayRecord({
          fajr: row.fajr,
          dhuhr: row.dhuhr,
          asr: row.asr,
          maghrib: row.maghrib,
          isha: row.isha,
        });
      }
    });

    return { data: logs, error: null };
  } catch (err: any) {
    console.warn('[Supabase fetchRemoteDayLogs exception]:', err?.message);
    return { data: null, error: 'Network error while loading prayer records.' };
  }
}

/**
 * Sync single Day Log row to Supabase `day_logs` table
 * Uses unique (user_id, date) constraint.
 */
export async function syncRemoteDayLog(
  date: string,
  record: DayStatusRecord
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { success: true, error: null };

  const user = await getCurrentSessionUser();
  if (!user) return { success: false, error: 'User is not authenticated' };

  try {
    const payload: SupabaseDayLogRow = {
      user_id: user.id,
      date: date,
      fajr: toDbPrayerStatus(record.fajr),
      dhuhr: toDbPrayerStatus(record.dhuhr),
      asr: toDbPrayerStatus(record.asr),
      maghrib: toDbPrayerStatus(record.maghrib),
      isha: toDbPrayerStatus(record.isha),
      updated_at: new Date().toISOString(),
    };

    const { error } = await client
      .from('day_logs')
      .upsert(payload, { onConflict: 'user_id,date' });

    if (error) {
      console.warn('[Supabase syncRemoteDayLog error]:', error.message);
      return { success: false, error: 'Failed to sync prayer record to cloud.' };
    }

    return { success: true, error: null };
  } catch (err: any) {
    console.warn('[Supabase syncRemoteDayLog exception]:', err?.message);
    return { success: false, error: 'Offline: Saved locally.' };
  }
}

/**
 * Update a specific prayer column in `day_logs` without overwriting the other four prayers
 */
export async function updateRemotePrayerStatus(
  date: string,
  prayer: PrayerKey,
  status: SalahStatus,
  currentRecord: DayStatusRecord
): Promise<{ success: boolean; error: string | null }> {
  const updatedRecord = {
    ...currentRecord,
    [prayer]: status,
  };
  return syncRemoteDayLog(date, parseDayRecord(updatedRecord));
}

/**
 * Supabase Auth Methods (Email + Password only)
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ user: any; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: 'Supabase client is not configured.' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      console.warn('[Supabase Auth sign-in failure]:', error.message);
      let msg = error.message;
      const lower = error.message.toLowerCase();
      if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
        msg = 'Invalid email or password. Please try again.';
      } else if (lower.includes('email not confirmed')) {
        msg = 'Please confirm your email before signing in.';
      } else if (lower.includes('too many') || lower.includes('rate limit')) {
        msg = 'Too many attempts. Please wait a moment and try again.';
      } else if (lower.includes('user not found')) {
        msg = 'No account found with this email.';
      }
      return { user: null, error: msg };
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    console.warn('[Supabase Auth network error]:', err?.message);
    return { user: null, error: 'Unable to connect. Please check your internet connection.' };
  }
}

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ user: any; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { user: null, error: 'Supabase client is not configured.' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password,
    });

    if (error) {
      console.warn('[Supabase Auth sign-up failure]:', error.message);
      let msg = error.message;
      const lower = error.message.toLowerCase();
      if (
        lower.includes('already registered') ||
        lower.includes('already exists') ||
        lower.includes('already been registered')
      ) {
        msg = 'An account with this email already exists. Please sign in.';
      } else if (lower.includes('password')) {
        msg = 'Password must be at least 6 characters.';
      } else if (lower.includes('rate limit') || lower.includes('too many')) {
        msg = 'Too many attempts. Please wait a moment and try again.';
      }
      return { user: null, error: msg };
    }

    // Check if user already exists when Supabase returns obfuscated user with 0 identities
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { user: null, error: 'An account with this email already exists. Please sign in.' };
    }

    return { user: data.user, error: null };
  } catch (err: any) {
    console.warn('[Supabase Auth sign-up error]:', err?.message);
    return { user: null, error: 'Unable to connect. Please check your internet connection.' };
  }
}

export async function signOutUser(): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: null };

  try {
    const { error } = await client.auth.signOut();
    if (error) {
      console.warn('[Supabase Auth sign-out error]:', error.message);
    }
    return { error: null };
  } catch (err: any) {
    console.warn('[Supabase Auth sign-out exception]:', err?.message);
    return { error: null };
  }
}

export async function getCurrentSessionUser(): Promise<any | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data } = await client.auth.getSession();
    return data?.session?.user ?? null;
  } catch {
    return null;
  }
}

export function subscribeToAuthChanges(callback: (user: any | null) => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => {};

  try {
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  } catch {
    return () => {};
  }
}
