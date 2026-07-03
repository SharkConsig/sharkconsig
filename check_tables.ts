import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function check() {
  const supabase = createClient(url, key)
  
  console.log("Checking columns of chamados...")
  const res = await supabase.from('chamados').select('*').limit(1)
  if (res.error) {
    console.log("Error selecting from chamados:", res.error.message)
  } else {
    console.log("chamados columns:", Object.keys(res.data?.[0] || {}))
    console.log("Sample:", res.data?.[0])
  }
}

check()
