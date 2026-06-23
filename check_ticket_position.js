const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let envContent = '';
try {
  envContent += fs.readFileSync(path.join(__dirname, '.env'), 'utf8') + '\n';
} catch (e) {}
try {
  envContent += fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8') + '\n';
} catch (e) {}

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: ticket, error: err } = await supabase
    .from('chamados')
    .select('*')
    .eq('id', 2093);

  console.log('Ticket 2093:', ticket, 'Error:', err);

  const { data, error } = await supabase
    .from('chamados')
    .select('id, updated_at')
    .order('updated_at', { ascending: false });

  if (!error) {
    const idx = data.findIndex(t => t.id === 2093);
    console.log(`Index of ticket 2093 in the default fetched list: ${idx}`);
  }
}

run();
