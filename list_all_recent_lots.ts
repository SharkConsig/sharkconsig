import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

async function run() {
  if (!url || !serviceKey || !anonKey) {
    console.log("Environment variables not fully populated.")
    return
  }
  
  // 1. Create client admin
  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const email = `temp_admin_revert_${Math.floor(Math.random() * 100000)}@example.com`
  const password = `StrongTempPass123!_${Math.floor(Math.random() * 100000)}`
  
  await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })
  
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
  
  const { data: sessionRes } = await client.auth.signInWithPassword({ email, password })
  const userId = sessionRes.user?.id
  
  console.log("Logged in! Fetching last 40 lots from lotes table...")
  
  const { data: lotes, error: lotesErr } = await client
    .from('lotes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(40)
    
  if (lotesErr) {
    console.error("Error fetching lotes:", lotesErr.message)
    await adminClient.auth.admin.deleteUser(userId!)
    return
  }
  
  console.log("Last 40 Lots:")
  lotes?.forEach((l, i) => {
    console.log(`[${i+1}] ID: ${l.id} | Desc: "${l.descricao || l.nome}" | Tipo: "${l.tipo}" | Status: "${l.status}" | Criado em: ${l.created_at}`)
  })
  
  // Clean up user
  await adminClient.auth.admin.deleteUser(userId!)
}

run()
