const fs = require('fs');
const path = require('path');

// Try to load env variables from .env or .env.local
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

const allKeys = Object.keys({ ...process.env, ...env });
const dbKeys = allKeys.filter(k => k.includes('DATABASE') || k.includes('SUPABASE') || k.includes('PG') || k.includes('POSTGRES'));

console.log('Detected DB-related env keys:');
dbKeys.forEach(k => {
  const val = env[k] || process.env[k];
  console.log(`- ${k}: exists=${!!val}, length=${val ? val.length : 0}`);
});
