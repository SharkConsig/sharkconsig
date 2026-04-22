import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const supabaseAdmin = createAdminClient();

    if (id) {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(id)
      if (error) throw error
      if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

      const metadata = user.user_metadata || {};
      return NextResponse.json({
        id: user.id,
        email: user.email,
        nome: metadata.nome_completo || metadata.full_name || 'Sem Nome',
        username: metadata.username,
        funcao: metadata.funcao || 'Corretor',
        supervisor_id: metadata.supervisor_id,
        avatar_url: metadata.avatar_url || `https://picsum.photos/seed/${metadata.username || user.id}/200/200`,
        status: (metadata.status || 'ATIVO').toUpperCase()
      })
    }

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    // Mesclar dados
    const combinedUsers = users.map((user) => {
      const metadata = user.user_metadata || {};
      return {
        id: user.id,
        email: user.email,
        nome: metadata.nome_completo || metadata.full_name || 'Sem Nome',
        username: metadata.username,
        funcao: metadata.funcao || 'Corretor',
        supervisor_id: metadata.supervisor_id,
        avatar_url: metadata.avatar_url || `https://picsum.photos/seed/${metadata.username || user.id}/200/200`,
        status: (metadata.status || 'ATIVO').toUpperCase(),
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      }
    })

    return NextResponse.json(combinedUsers)
  } catch (error: unknown) {
    console.error('Erro ao listar usuários:', error)
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const body = await request.json()
    const { email, password, nome_completo, username, funcao, avatar_url, supervisor_id } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    // 1. Criar usuário no Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        nome_completo, 
        username,
        funcao,
        avatar_url,
        supervisor_id
      }
    })

    if (authError) throw authError

    return NextResponse.json({ user: authUser.user })
  } catch (error: unknown) {
    console.error('Erro ao criar usuário:', error)
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const body = await request.json()
    const { id, email, password, nome_completo, username, funcao, avatar_url, supervisor_id, supervisor_nome, status } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // 1. Atualizar Auth se necessário (email ou senha)
    const updateData: {
      email?: string;
      password?: string;
      user_metadata?: Record<string, unknown>;
    } = {}
    
    if (email) updateData.email = email
    if (password) updateData.password = password
    
    const metadata: Record<string, unknown> = {}
    if (nome_completo) metadata.nome_completo = nome_completo
    if (username) metadata.username = username
    if (funcao) metadata.funcao = funcao
    if (status) metadata.status = status.toUpperCase()
    if (supervisor_id !== undefined) metadata.supervisor_id = supervisor_id
    if (supervisor_nome !== undefined) metadata.supervisor_nome = supervisor_nome
    if (avatar_url !== undefined) {
      metadata.avatar_url = avatar_url?.startsWith('data:image') 
        ? `https://picsum.photos/seed/${username || id}/200/200` 
        : avatar_url;
    }

    if (Object.keys(metadata).length > 0) {
      updateData.user_metadata = metadata
    }

    if (Object.keys(updateData).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, updateData)
      if (authError) throw authError
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erro ao atualizar usuário:', error)
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = createAdminClient();
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // 1. Limpar referências em tabelas que podem ter foreign keys sem CASCADE
    // Isso evita o erro "AuthApiError: Database error deleting user"
    await Promise.all([
      supabaseAdmin.from('campanhas').delete().eq('user_id', id),
      supabaseAdmin.from('lotes').delete().eq('user_id', id),
      // Nos chamados, podemos querer manter o registro mas desvincular o usuário
      supabaseAdmin.from('chamados').update({ user_id: null }).eq('user_id', id)
    ])

    // 2. Deletar do Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) throw authError

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erro ao deletar usuário:', error)
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
