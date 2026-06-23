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
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying Auth Users...');
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error listing users:', error);
    return;
  }

  console.log(`Found ${users.length} users in Auth:`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Email: ${u.email}, Metadata:`, u.user_metadata);
  });
}

check();
