import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
                        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'placeholder';

if (typeof window !== 'undefined') {
  // Isso vai aparecer no seu console do navegador (F12)
  const isPlaceholder = supabaseUrl.includes('placeholder');
  console.log('--- DIAGNÓSTICO SUPABASE ---');
  console.log('URL:', isPlaceholder ? '❌ USANDO PLACEHOLDER (ERRO)' : '✅ OK: ' + supabaseUrl.substring(0, 20) + '...');
  console.log('KEY:', supabaseAnonKey === 'placeholder' ? '❌ USANDO PLACEHOLDER (ERRO)' : '✅ OK (Chave Real detectada)');
}

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder') &&
  supabaseAnonKey !== 'placeholder'
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
