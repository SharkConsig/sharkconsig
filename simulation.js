const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Filters object as in the react code
const filters = {
  orgaos: ['SEFAZ'],
  situacoes: [],
  regimes: [],
  ufs: [],
  margemMin: "",
  margemMax: "",
  saldoMin: "",
  saldoMax: "",
  loanBanks: [],
  loanPrazoMin: "",
  loanPrazoMax: "",
  cardTypes: [],
  cardBanks: [],
  cardMargemMin: "",
  cardBeneficioMin: "",
  idadeMin: "",
  idadeMax: "",
};

const ORGAOS_MAPPING = {}; // assume empty or imported

const applySharedFilters = (q, f, cols) => {
  if (f.orgaos.length > 0 && cols.includes('orgao')) {
    const codeFilters = Object.entries(ORGAOS_MAPPING)
      .filter(([, name]) => f.orgaos.includes(name))
      .map(([code]) => code);
    const combinedOrgaos = Array.from(new Set([...f.orgaos, ...codeFilters]));
    if (combinedOrgaos.length > 0) q = q.in('orgao', combinedOrgaos);
  }
  return q;
};

const runQuery = async (selectedOrgaos) => {
  const f = { ...filters, orgaos: selectedOrgaos };
  const tableName = 'base_consulta_governo_sp';
  const tableCols = [
    'cpf', 'nome', 'data_nascimento', 'telefone_1', 'telefone_2', 'telefone_3', 
    'identificacao', 'orgao', 'situacao_funcional', 'regime_juridico', 
    'margem_35', 'bruta_5', 'liquida_5', 'beneficio_bruta_5', 'beneficio_liquida_5', 'uf'
  ];
  
  let q = supabase.from(tableName).select('cpf', { count: 'exact', head: true });
  q = applySharedFilters(q, f, tableCols);
  
  const { count, error } = await q;
  console.log(`Query count for [${selectedOrgaos.join(', ')}]:`, count, error ? error.message : 'No error');
};

const test = async () => {
  await runQuery(['SEFAZ']);
  await runQuery(['SPPREV']);
  await runQuery(['PMESP']);
  await runQuery(['SEFAZ', 'PMESP']);
};

test();
