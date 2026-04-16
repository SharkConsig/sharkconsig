import { createClient } from '@supabase/supabase-js';

const getEnvVarByPrefix = (prefix: string) => {
  const key = Object.keys(process.env).find(k => k.startsWith(prefix));
  return key ? process.env[key] : '';
};

let supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_URL'))?.trim() || 'https://placeholder.supabase.co';
// Remove trailing slash if present
if (supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}

const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_PUBLISHABLE') ||
                        getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_ANON'))?.trim() || 'placeholder';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'placeholder'
);

if (typeof window !== 'undefined') {
  const maskedUrl = supabaseUrl.includes('placeholder') ? 'PLACEHOLDER' : supabaseUrl.substring(0, 15) + '...';
  console.log('Supabase URL detectada:', maskedUrl);
  console.log('Supabase Key detectada:', supabaseAnonKey !== 'placeholder' ? 'OK (Real)' : 'ERRO (Placeholder)');
  
  if (!isSupabaseConfigured) {
    console.warn('Supabase não configurado corretamente. Verifique as variáveis na aba Secrets.');
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
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};
