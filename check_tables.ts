import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'placeholder_anon_key'

async function check() {
  const supabase = createClient(url, key)
  
  // Let's check query on hr_interviews in the rh schema
  console.log("Checking table 'hr_interviews' in schema 'rh'...")
  const res1 = await supabase.schema('rh').from('hr_interviews').select('*').limit(1)
  if (res1.error) {
    console.log("Error on hr_interviews:", res1.error.message)
  } else {
    console.log("hr_interviews exists! Columns:", Object.keys(res1.data[0] || {}))
  }

  // Let's check query on entrevistas
  console.log("Checking table 'entrevistas'...")
  const res2 = await supabase.from('entrevistas').select('*').limit(1)
  if (res2.error) {
    console.log("Error on entrevistas:", res2.error.message)
  } else {
    console.log("entrevistas exists! Columns:", Object.keys(res2.data[0] || {}))
  }
}

check()
