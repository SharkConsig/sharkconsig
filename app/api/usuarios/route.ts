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
      let supervisorNome = metadata.supervisor_nome;

      // If supervisor_nome is missing but id is present, try to find it
      if (!supervisorNome && metadata.supervisor_id) {
        const { data: supervisorUser } = await supabaseAdmin.auth.admin.getUserById(metadata.supervisor_id)
        if (supervisorUser?.user?.user_metadata) {
          const sMeta = supervisorUser.user.user_metadata;
          supervisorNome = sMeta.nome_completo || sMeta.full_name || 'Sem Nome';
        }
      }

      return NextResponse.json({
        id: user.id,
        email: user.email,
        nome: metadata.nome_completo || metadata.full_name || 'Sem Nome',
        username: metadata.username,
        funcao: metadata.funcao || 'Corretor',
        equipe: metadata.equipe || 'Shark',
        supervisor_id: metadata.supervisor_id,
        supervisor_nome: supervisorNome,
        avatar_url: metadata.avatar_url || `https://picsum.photos/seed/${metadata.username || user.id}/200/200`,
        status: (metadata.status || 'ATIVO').toUpperCase()
      })
    }

    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) throw listError

    // Create a map for quick name lookup
    const nameMap = new Map<string, string>()
    users.forEach(user => {
      const metadata = user.user_metadata || {}
      nameMap.set(user.id, metadata.nome_completo || metadata.full_name || 'Sem Nome')
    })

    // Mesclar dados
    const combinedUsers = users.map((user) => {
      const metadata = user.user_metadata || {};
      const supervisorId = metadata.supervisor_id;
      let supervisorNome = metadata.supervisor_nome;
      
      // If supervisor_nome is missing but id is present, try to find it in our list
      if (!supervisorNome && supervisorId && nameMap.has(supervisorId)) {
        supervisorNome = nameMap.get(supervisorId);
      }

      return {
        id: user.id,
        email: user.email,
        nome: metadata.nome_completo || metadata.full_name || 'Sem Nome',
        username: metadata.username,
        funcao: metadata.funcao || 'Corretor',
        equipe: metadata.equipe || 'Shark',
        supervisor_id: metadata.supervisor_id,
        supervisor_nome: supervisorNome,
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
    const transferTo = searchParams.get('transferTo')

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // 1. Se informou um supervisor para transferência, realizar o remanejamento
    if (transferTo) {
      // Buscar dados do novo supervisor para atualizar os nomes nas tabelas
      const { data: supervisorData, error: supError } = await supabaseAdmin.auth.admin.getUserById(transferTo)
      
      if (!supError && supervisorData?.user) {
        const supervisorUser = supervisorData.user
        const supervisorMeta = supervisorUser.user_metadata || {}
        const supervisorNome = supervisorMeta.nome_completo || supervisorMeta.full_name || 'Supervisor'

        await Promise.all([
          // Transferir Propostas
          supabaseAdmin.from('propostas')
            .update({ 
              corretor_id: transferTo,
              corretor: supervisorNome
            })
            .eq('corretor_id', id),
          
          // Transferir Chamados
          supabaseAdmin.from('chamados')
            .update({ 
              user_id: transferTo,
              user_nome: supervisorNome
            })
            .eq('user_id', id)
        ])
      } else {
        console.warn(`Supervisor ${transferTo} não encontrado para transferência. Continuando com exclusão sem transferência.`)
      }
    }

    // 2. Limpar referências em tabelas que podem ter foreign keys sem CASCADE
    const operations = [
      {
        name: 'Deletar campanhas onde o usuário é dono',
        query: supabaseAdmin.from('campanhas').delete().eq('user_id', id)
      },
      {
        name: 'Definir null para criado_por em campanhas',
        query: supabaseAdmin.from('campanhas').update({ criado_por: null }).eq('criado_por', id)
      },
      {
        name: 'Deletar lotes importados pelo usuário',
        query: supabaseAdmin.from('lotes').delete().eq('user_id', id)
      },
      {
        name: 'Definir null em chamados não transferidos',
        query: supabaseAdmin.from('chamados').update({ user_id: null }).eq('user_id', id)
      },
      {
        name: 'Definir null em propostas não transferidas',
        query: supabaseAdmin.from('propostas').update({ corretor_id: null }).eq('corretor_id', id)
      },
      {
        name: 'Definir null em atendimentos da campanha',
        query: supabaseAdmin.from('campanha_atendimentos').update({ corretor_id: null }).eq('corretor_id', id)
      },
      {
        name: 'Definir null no histórico de propostas',
        query: supabaseAdmin.from('historico_propostas').update({ usuario_id: null }).eq('usuario_id', id)
      },
      {
        name: 'Deletar mensagens de chamado',
        query: supabaseAdmin.from('mensagens_chamado').delete().eq('user_id', id)
      },
      {
        name: 'Deletar participante em campanhas',
        query: supabaseAdmin.from('campanha_participantes').delete().eq('user_id', id)
      }
    ];

    const results = await Promise.all(operations.map(op => op.query));
    
    for (let i = 0; i < operations.length; i++) {
      const res = results[i];
      const op = operations[i];
      if (res && typeof res === 'object' && 'error' in res && res.error) {
        const err = res.error as { code?: string; message: string; details?: string };
        // Se a tabela não existir (código 42P01), podemos ignorar com segurança
        if (err.code === '42P01') {
          console.warn(`[Limpeza de Usuário] Tabela ignorada (${op.name} - 42P01):`, err.message);
          continue;
        }
        console.error(`[Limpeza de Usuário] Erro em '${op.name}':`, err);
        throw new Error(`Erro na operação '${op.name}': ${err.message} (${err.details || ''})`);
      } else {
        console.log(`[Limpeza de Usuário] Sucesso: '${op.name}'`);
      }
    }

    // 3. Deletar do Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) throw authError

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error('Erro ao deletar usuário:', error)
    const message = error instanceof Error ? error.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
