import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function check() {
  const supabase = createClient(url, key)
  
  console.log("Checking table 'campanha_vinculos'...")
  const res = await supabase.from('campanha_vinculos').select('*').limit(5)
  if (res.error) {
    console.log("Error on campanha_vinculos:", res.error.message)
  } else {
    console.log("campanha_vinculos exists! Rows count:", res.data?.length)
    if (res.data && res.data.length > 0) {
      console.log("Columns:", Object.keys(res.data[0] || {}))
      console.log("Sample row:", res.data[0])
    } else {
      console.log("campanha_vinculos is empty. Let's check table structure via querying column names if possible.")
      // Can check details via selecting a mock or schema query
    }
  }
}

check()
