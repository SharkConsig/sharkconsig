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

// Função para verificar se o usuário atual tem permissão (Admin ou Desenvolvedor)
async function checkPermission(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;

  const token = authHeader.replace('Bearer ', '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
  
  const supabase = createClient(url, anonKey);
  
  // Adicionar timeout para a verificação do usuário
  const userPromise = supabase.auth.getUser(token);
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error("Timeout ao verificar usuário")), 10000)
  );

  try {
    const { data: { user }, error } = await Promise.race([userPromise, timeoutPromise]) as any;
    if (error || !user) return false;

    // Acesso total para os emails especificados
    const adminEmails = ['souendrionovo@gmail.com', 'acertofacilpromotoradecredito@gmail.com'];
    if (user.email && adminEmails.includes(user.email)) return true;

    // Verificar na tabela de perfis
    const { data: perfil } = await supabase
      .from('perfis')
      .select('role')
      .eq('id', user.id)
      .single();

    return perfil?.role === 'Administrador' || perfil?.role === 'Desenvolvedor';
  } catch (e) {
    console.error("Erro na verificação de permissão:", e);
    return false;
  }
}

export async function GET(request: Request) {
  try {
    if (!(await checkPermission(request))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Buscar todos os perfis
    const { data: perfis, error: perfisError } = await supabaseAdmin
      .from('perfis')
      .select('*')
      .order('created_at', { ascending: false });

    if (perfisError) throw perfisError;

    return NextResponse.json(perfis);
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro ao listar usuários:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    console.log("Recebendo requisição POST em /api/usuarios")
    if (!(await checkPermission(request))) {
      console.warn("Permissão negada para criação de usuário")
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json()
    const { email, password, nome, username, role, avatar_url } = body

    console.log("Dados recebidos:", { email, nome, username, role })

    if (!email || !password || !nome || !username) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    // 1. Criar usuário no Auth
    console.log("Chamando supabaseAdmin.auth.admin.createUser...")
    
    const createAuthPromise = supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nome, username, avatar_url }
    })

    const authTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout ao criar usuário no Auth")), 15000)
    )

    const { data: authUser, error: authError } = await Promise.race([createAuthPromise, authTimeoutPromise]) as any

    if (authError) {
      console.error("Erro retornado pelo Supabase Auth:", authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authUser || !authUser.user) {
      console.error("Usuário não retornado após criação")
      return NextResponse.json({ error: "Falha ao obter dados do usuário criado" }, { status: 500 })
    }

    console.log("Usuário Auth criado com ID:", authUser.user.id)

    // 2. Criar perfil na tabela perfis
    console.log("Inserindo na tabela 'perfis'...")
    const insertPerfilPromise = supabaseAdmin
      .from('perfis')
      .insert({
        id: authUser.user.id,
        email,
        nome,
        username,
        role: role || 'Corretor',
        avatar_url,
        status: 'Ativo'
      });

    const insertTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout ao criar perfil na tabela")), 10000)
    )

    const { error: perfilError } = await Promise.race([insertPerfilPromise, insertTimeoutPromise]) as any

    if (perfilError) {
      console.error("Erro ao inserir perfil:", perfilError)
      // Rollback: deletar usuário do auth se falhar ao criar perfil
      console.log("Realizando rollback: deletando usuário do Auth...")
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return NextResponse.json({ error: perfilError.message }, { status: 400 })
    }

    console.log("Processo de criação finalizado com sucesso")
    return NextResponse.json({ user: authUser.user })
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro detalhado ao criar usuário:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await checkPermission(request))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const body = await request.json()
    const { id, email, password, nome, username, role, status, avatar_url } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // 1. Atualizar Auth se necessário
    const authUpdate: Record<string, unknown> = {}
    if (email) authUpdate.email = email
    if (password) authUpdate.password = password
    if (nome || username || avatar_url) {
      authUpdate.user_metadata = { 
        full_name: nome,
        username,
        avatar_url
      }
    }

    if (Object.keys(authUpdate).length > 0) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdate)
      if (authError) throw authError
    }

    // 2. Atualizar Perfil
    const perfilUpdate: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (email) perfilUpdate.email = email
    if (nome) perfilUpdate.nome = nome
    if (username) perfilUpdate.username = username
    if (role) perfilUpdate.role = role
    if (status) perfilUpdate.status = status
    if (avatar_url) perfilUpdate.avatar_url = avatar_url

    const { error: perfilError } = await supabaseAdmin
      .from('perfis')
      .update(perfilUpdate)
      .eq('id', id);

    if (perfilError) throw perfilError;

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro ao atualizar usuário:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await checkPermission(request))) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    // Deletar do Auth (o cascade deve cuidar do perfil se configurado)
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) throw authError

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro ao deletar usuário:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
