const fs = require('fs');

console.log('--- ENV KEYS ---');
const dbKeys = Object.keys(process.env).filter(k => 
  k.includes('SUPABASE') || 
  k.includes('DATABASE') || 
  k.includes('URL') || 
  k.includes('POSTGRES') || 
  k.includes('PASSWORD') ||
  k.includes('KEY')
);

dbKeys.forEach(k => {
  const v = process.env[k];
  console.log(`${k}: ${v ? (v.length > 30 ? v.substring(0, 15) + '...' + v.substring(v.length - 5) : v) : '[EMPTY]'}`);
});
console.log('----------------');
