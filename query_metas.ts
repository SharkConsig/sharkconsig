import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || 'placeholder_anon_key'

async function run() {
  console.log(`URL: ${url ? 'present' : 'missing'}`)
  console.log(`KEY: ${key ? 'present' : 'missing'}`)
  if (!url) {
    console.log("No Supabase URL configured.")
    return
  }
  const supabase = createClient(url, key)
  const { data, error } = await supabase.from('metas_config').select('*')
  if (error) {
    console.error("Error fetching metas:", error)
    return
  }
  console.log("METAS CONFIG LIST:")
  console.log(JSON.stringify(data, null, 2))
}

run()
