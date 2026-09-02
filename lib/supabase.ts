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
  getPendingSyncDates,
  removePendingSyncDate,
  loadDayLogs,
} from './storage';

/**
 * Client-safe Supabase Integration (No Auth Dependency)
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
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
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
 * Fetch Day Logs from Supabase `day_logs` table.
 * Gracefully returns empty when no authenticated user session exists,
 * preserving clean offline-first storage in localStorage.
 */
export async function fetchRemoteDayLogs(): Promise<{
  data: Record<string, DayStatusRecord> | null;
  error: string | null;
}> {
  const client = getSupabaseClient();
  if (!client) return { data: null, error: null };

  try {
    const { data, error } = await client
      .from('day_logs')
      .select('id, user_id, date, fajr, dhuhr, asr, maghrib, isha');

    if (error) {
      // With RLS enabled and no active auth session, Supabase returns empty or RLS error
      return { data: null, error: error.message };
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
    return { data: null, error: err?.message || 'Network error' };
  }
}

/**
 * Sync single Day Log row to Supabase `day_logs` table if user_id is provided.
 * Without user_id, remains safely handled in local storage.
 */
export async function syncRemoteDayLog(
  date: string,
  record: DayStatusRecord,
  userId?: string
): Promise<{ success: boolean; error: string | null }> {
  const client = getSupabaseClient();
  if (!client || !userId) {
    // Local-only mode: successfully handled locally
    return { success: true, error: null };
  }

  try {
    const payload: SupabaseDayLogRow = {
      user_id: userId,
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
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Offline' };
  }
}

/**
 * Flush all pending offline Day Logs to Supabase
 */
export async function flushPendingDayLogs(userId?: string): Promise<number> {
  if (!userId) return 0;
  const pendingDates = getPendingSyncDates(userId);
  if (pendingDates.length === 0) return 0;

  const localLogs = loadDayLogs(userId);
  let syncedCount = 0;

  for (const dateKey of pendingDates) {
    const record = localLogs[dateKey];
    if (record) {
      const res = await syncRemoteDayLog(dateKey, record, userId);
      if (res.success) {
        removePendingSyncDate(dateKey, userId);
        syncedCount++;
      }
    } else {
      removePendingSyncDate(dateKey, userId);
    }
  }
  return syncedCount;
}

/**
 * Update a specific prayer column in `day_logs` without overwriting the other four prayers
 */
export async function updateRemotePrayerStatus(
  date: string,
  prayer: PrayerKey,
  status: SalahStatus,
  currentRecord: DayStatusRecord,
  userId?: string
): Promise<{ success: boolean; error: string | null }> {
  const updatedRecord = {
    ...currentRecord,
    [prayer]: status,
  };
  return syncRemoteDayLog(date, parseDayRecord(updatedRecord), userId);
}
