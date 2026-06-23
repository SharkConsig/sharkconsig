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

async function check() {
  // Check profiles/users
  console.log('Querying profiles...');
  const { data: profiles, error } = await supabase
    .from('perfis')
    .select('*');
    
  if (error) {
    console.error('Error fetching perfis:', error);
    // Maybe table name is 'usuarios'?
    const { data: users, error: errorUsers } = await supabase
      .from('usuarios')
      .select('*');
    if (errorUsers) console.error('Error fetching usuarios:', errorUsers);
    else console.log('Usuarios:', users);
  } else {
    console.log('Perfis:', profiles.map(p => ({ id: p.id, email: p.email, role: p.role, nome: p.nome })));
  }

  // Count tickets
  const { count, error: countError } = await supabase
    .from('chamados')
    .select('*', { count: 'exact', head: true });
  console.log('Total tickets in database:', count, 'Error:', countError);
}

check();
