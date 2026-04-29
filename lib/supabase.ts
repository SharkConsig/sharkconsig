import { createClient } from '@supabase/supabase-js';

const getEnvVarByPrefix = (prefix: string) => {
  const key = Object.keys(process.env).find(k => k.startsWith(prefix));
  return key ? process.env[key] : '';
};

let supabaseUrl = (
  process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.SUPABASE_URL ||
  getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_URL') ||
  getEnvVarByPrefix('SUPABASE_LINK')
)?.trim() || 'https://placeholder.supabase.co';

// Remove trailing slash if present
if (supabaseUrl && supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}

// Add protocol if missing
if (supabaseUrl && !supabaseUrl.startsWith('http') && supabaseUrl !== 'placeholder' && !supabaseUrl.includes('placeholder')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.SUPABASE_ANON_KEY ||
                        getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_PUBLISHABLE') ||
                        getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_ANON') ||
                        getEnvVarByPrefix('SUPABASE_ANON'))?.trim() || 'placeholder';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'placeholder'
);

if (typeof window !== 'undefined') {
  const maskedUrl = supabaseUrl.includes('placeholder') ? 'PLACEHOLDER' : supabaseUrl.substring(0, 20) + '...';
  console.log('Supabase Configuration Status:', {
    url: maskedUrl,
    keyDetected: supabaseAnonKey !== 'placeholder',
    isConfigured: isSupabaseConfigured
  });
  
  if (!isSupabaseConfigured) {
    console.error('CRITICAL: Supabase is NOT configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to Settings -> Secrets.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sharkconsig-auth-token'
  },
  global: {
    headers: { 'x-application-name': 'sharkconsig' }
  }
});

export const createAdminClient = () => {
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 
                          process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
                          getEnvVarByPrefix('SUPABASE_SERVICE_ROLE_KEY') ||
                          getEnvVarByPrefix('SUPABASE_SECRET'))?.trim();
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined. Please add it to Settings -> Secrets.');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
