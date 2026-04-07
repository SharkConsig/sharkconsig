import { createClient } from '@supabase/supabase-js';

const getEnvVarByPrefix = (prefix: string) => {
  const key = Object.keys(process.env).find(k => k.startsWith(prefix));
  return key ? process.env[key] : '';
};

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_URL')) || 'https://placeholder.supabase.co';
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_PUBLISHABLE') ||
                        getEnvVarByPrefix('NEXT_PUBLIC_SUPABASE_ANON')) || 'placeholder';

if (typeof window !== 'undefined') {
  const maskedUrl = supabaseUrl.includes('placeholder') ? 'PLACEHOLDER' : supabaseUrl.substring(0, 15) + '...';
  console.log('Supabase URL detectada:', maskedUrl);
  console.log('Supabase Key detectada:', supabaseAnonKey !== 'placeholder' ? 'OK (Real)' : 'ERRO (Placeholder)');
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
    console.log('Env vars disponíveis:', Object.keys(process.env).filter(k => k.includes('SUPAB')));
  }
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'placeholder'
);

if (!isSupabaseConfigured) {
  if (typeof window !== 'undefined') {
    console.warn('Supabase não configurado ou URL inválida. Certifique-se de configurar NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY no seu arquivo .env.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
