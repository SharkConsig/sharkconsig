import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Função para obter o cliente admin do Supabase de forma preguiçosa (lazy)
// Isso evita erros durante o build se as variáveis de ambiente não estiverem presentes
let supabaseAdminInstance: any = null;

function getSupabaseAdmin() {
  if (!supabaseAdminInstance) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new Error('Configuração do Supabase Admin incompleta. Verifique NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.');
    }

    supabaseAdminInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return supabaseAdminInstance;
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) throw error

    // Buscar perfis para complementar os dados
    const { data: perfis, error: perfisError } = await supabaseAdmin
      .from('perfis')
      .select('*')

    if (perfisError) throw perfisError

    // Mesclar dados
    const combinedUsers = users.map((user: any) => {
      const perfil = perfis?.find(p => p.id === user.id)
      return {
        id: user.id,
        email: user.email,
        nome: perfil?.nome || user.user_metadata?.full_name || 'Sem Nome',
        username: perfil?.username || user.user_metadata?.username,
        role: perfil?.role || 'Corretor',
        status: perfil?.status || 'Ativo',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }
    })

    return NextResponse.json(combinedUsers)
  } catch (error: any) {
    console.error('Erro ao listar usuários:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json()
    const { email, password, nome, username, role, status } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    // 1. Criar usuário no Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nome, username }
    })

    if (authError) throw authError

    // 2. Criar/Atualizar perfil na tabela perfis
    const { error: perfilError } = await supabaseAdmin
      .from('perfis')
      .upsert({
        id: authUser.user.id,
        email,
        nome,
        username,
        role,
        status,
        permissoes: {}
      })

    if (perfilError) {
      // Se falhar ao criar o perfil, vamos remover o usuário do auth para manter consistência
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw perfilError
    }

    return NextResponse.json({ user: authUser.user })
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json()
    const { id, email, password, nome, username, role, status } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // 1. Atualizar Auth se necessário (email ou senha)
    const updateData: any = {}
    if (email) updateData.email = email
    if (password) updateData.password = password
    if (nome || username) {
      updateData.user_metadata = { 
        ...updateData.user_metadata,
        full_name: nome,
        username 
      }
    }

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData)
      if (authError) throw authError
    }

    // 2. Atualizar Perfil
    const { error: perfilError } = await supabaseAdmin
      .from('perfis')
      .update({
        nome,
        username,
        role,
        status,
        email // Sincronizar email se mudou
      })
      .eq('id', id)

    if (perfilError) throw perfilError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Deletar do Auth (o cascade deve cuidar do perfil se configurado, mas vamos garantir)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) throw authError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
