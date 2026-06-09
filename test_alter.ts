import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function run() {
  if (!url || !key) {
    console.log("No Supabase URL or Service Role key configured.")
    return
  }
  const supabase = createClient(url, key)
  
  // Try sending a query to alter table using rpc if there's any.
  // Standard Supabase templates sometimes have rpc functions, though not always.
  console.log("Trying to alter table via standard query or see if column can be added...")
  
  // Let's see if we can do an RPC call to check schemas
  const { data: data1, error: error1 } = await supabase.from('hr_colaboradores').select('documentos_anexados').limit(1)
  console.log("Check if column 'documentos_anexados' already exists:", data1, error1)
}

run()
