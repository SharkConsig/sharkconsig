const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('prefeitura_sp_clientes')
    .select('*')
    .limit(1);

  if (error) {
    console.error("prefeitura_sp_clientes Error:", error);
  } else {
    console.log("prefeitura_sp_clientes success:", data);
  }
}

run();
