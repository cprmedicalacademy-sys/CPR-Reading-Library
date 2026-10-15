import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_SUPABASE_CONFIG = 'cpr_supabase_config_override';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  // 1. Check local override first
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SUPABASE_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Could not read saved Supabase configuration', e);
  }

  // 2. Check environment variables
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: envUrl.trim(),
    anonKey: envKey.trim(),
  };
}

export function saveSupabaseConfig(config: SupabaseConfig): void {
  localStorage.setItem(STORAGE_KEY_SUPABASE_CONFIG, JSON.stringify(config));
  // Invalidate cached client
  cachedClient = null;
}

export function clearSupabaseConfigOverride(): void {
  localStorage.removeItem(STORAGE_KEY_SUPABASE_CONFIG);
  cachedClient = null;
}

export function isSupabaseConfigured(): boolean {
  const cfg = getSupabaseConfig();
  return Boolean(cfg.url && cfg.anonKey && cfg.url.startsWith('https://') && !cfg.url.includes('your-project-id'));
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const cfg = getSupabaseConfig();
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Tests connection to the configured Supabase instance
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  message: string;
  hasMembersTable?: boolean;
  hasRenewalsTable?: boolean;
}> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'Supabase credentials are not configured or invalid.',
    };
  }

  try {
    // Attempt to query count on members table
    const { count, error } = await client
      .from('members')
      .select('*', { count: 'exact', head: true });

    if (error) {
      // Check if table missing error (42P01)
      if (error.code === '42P01' || error.message.includes('relation "public.members" does not exist')) {
        return {
          success: false,
          message: 'Connected to Supabase, but the "members" table does not exist. Please run the SQL migration script from the Settings tab.',
          hasMembersTable: false,
        };
      }
      return {
        success: false,
        message: `Connection error: ${error.message} (${error.code || ''})`,
      };
    }

    return {
      success: true,
      message: `Successfully connected to Supabase! Found ${count ?? 0} members recorded in database.`,
      hasMembersTable: true,
      hasRenewalsTable: true,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error connecting to Supabase instance.',
    };
  }
}
