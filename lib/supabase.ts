import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { SalahItem, DayStatusRecord } from './types';
import { parseDayRecord } from './storage';

/**
 * Client-safe Supabase Integration
 * Uses ONLY public anonymous key (NEXT_PUBLIC_SUPABASE_ANON_KEY).
 * Never exposes service role key to browser client.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
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
 * Fetch Salah Items from Supabase
 */
export async function fetchRemoteSalahItems(): Promise<{ data: SalahItem[] | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) {
    return { data: null, error: null }; // Local fallback
  }

  try {
    const { data, error } = await client
      .from('salah_items')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      // User-friendly error message, never show raw postgres error
      return { data: null, error: 'Unable to load your remote Salah routine.' };
    }

    if (!data || data.length === 0) {
      return { data: null, error: null };
    }

    const items: SalahItem[] = data.map((d: any) => ({
      id: d.id,
      name: d.name,
      arabicName: d.arabic_name || d.arabicName || undefined,
      time: d.time || '',
      order: d.order || 0,
      createdAt: typeof d.created_at === 'string' ? new Date(d.created_at).getTime() : (d.createdAt || Date.now()),
      deletedAt: d.deleted_at ? (typeof d.deleted_at === 'string' ? new Date(d.deleted_at).getTime() : d.deletedAt) : null,
    }));

    return { data: items, error: null };
  } catch (err) {
    return { data: null, error: 'Network error while connecting to remote storage.' };
  }
}

/**
 * Upsert / sync Salah Items to Supabase
 */
export async function syncRemoteSalahItems(items: SalahItem[]): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { success: true, error: null };

  try {
    const rows = items.map((item) => ({
      id: item.id,
      name: item.name,
      arabic_name: item.arabicName || null,
      time: item.time || '',
      order: item.order,
      deleted_at: item.deletedAt ? new Date(item.deletedAt).toISOString() : null,
    }));

    const { error } = await client
      .from('salah_items')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      return { success: false, error: 'Unable to save your Salah changes to cloud.' };
    }

    return { success: true, error: null };
  } catch {
    return { success: false, error: 'Offline: Changes saved locally.' };
  }
}

/**
 * Fetch Day Logs from Supabase
 */
export async function fetchRemoteDayLogs(): Promise<{ data: Record<string, DayStatusRecord> | null; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: null };

  try {
    const { data, error } = await client
      .from('day_logs')
      .select('*');

    if (error) {
      return { data: null, error: 'Unable to load completion records from cloud.' };
    }

    if (!data || data.length === 0) {
      return { data: null, error: null };
    }

    const logs: Record<string, DayStatusRecord> = {};
    data.forEach((row: any) => {
      if (row.date_key) {
        logs[row.date_key] = parseDayRecord({
          prayed: row.prayed || [],
          missed: row.missed || [],
        });
      }
    });

    return { data: logs, error: null };
  } catch {
    return { data: null, error: 'Network error while loading logs.' };
  }
}

/**
 * Sync single Day Log to Supabase
 */
export async function syncRemoteDayLog(
  dateKey: string,
  record: DayStatusRecord
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { success: true, error: null };

  try {
    const { error } = await client
      .from('day_logs')
      .upsert(
        {
          date_key: dateKey,
          prayed: record.prayed,
          missed: record.missed,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'date_key' }
      );

    if (error) {
      return { success: false, error: 'Failed to sync log to cloud.' };
    }

    return { success: true, error: null };
  } catch {
    return { success: false, error: 'Offline: Saved locally.' };
  }
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

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // User-friendly error message, never show raw stack
      return { user: null, error: 'Unable to sign in. Please check your email and password.' };
    }

    return { user: data.user, error: null };
  } catch {
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

  try {
    const { data, error } = await client.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message || 'Unable to create account. Please try again.' };
    }

    return { user: data.user, error: null };
  } catch {
    return { user: null, error: 'Unable to connect. Please check your internet connection.' };
  }
}

export async function signOutUser(): Promise<{ error: string | null }> {
  const client = getSupabaseClient();
  if (!client) return { error: null };

  try {
    const { error } = await client.auth.signOut();
    if (error) {
      return { error: 'Unable to sign out.' };
    }
    return { error: null };
  } catch {
    return { error: 'Unable to sign out.' };
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
