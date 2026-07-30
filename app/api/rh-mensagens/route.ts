import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { usuario_id, mensagem } = await request.json()

    if (!usuario_id) {
      return NextResponse.json({ error: 'ID do usuário destinatário é obrigatório' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Retrieve target user auth data
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(usuario_id)
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Usuário destinatário não encontrado' }, { status: 404 })
    }

    const currentMeta = user.user_metadata || {}

    // Update user_metadata with the RH custom message
    const updatedMeta = {
      ...currentMeta,
      rh_mensagem_destaque: mensagem ? mensagem.trim() : '',
      rh_mensagem_updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(usuario_id, {
      user_metadata: updatedMeta
    })

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: mensagem ? 'Mensagem enviada com sucesso para o colaborador!' : 'Mensagem removida com sucesso.',
      usuario_id,
      rh_mensagem_destaque: updatedMeta.rh_mensagem_destaque
    })
  } catch (error: any) {
    console.error('Erro ao salvar mensagem RH:', error)
    return NextResponse.json({ error: error.message || 'Erro ao processar mensagem' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const usuario_id = searchParams.get('usuario_id')
    const supabaseAdmin = createAdminClient()

    if (usuario_id) {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(usuario_id)
      if (error || !user) {
        return NextResponse.json({ mensagem: '' })
      }
      return NextResponse.json({
        usuario_id: user.id,
        mensagem: user.user_metadata?.rh_mensagem_destaque || ''
      })
    }

    // List all users with active RH messages
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) throw error

    const activeMessages = users
      .filter(u => u.user_metadata?.rh_mensagem_destaque)
      .map(u => ({
        usuario_id: u.id,
        nome: u.user_metadata?.nome_completo || u.user_metadata?.full_name || u.email || 'Usuário',
        mensagem: u.user_metadata?.rh_mensagem_destaque,
        updated_at: u.user_metadata?.rh_mensagem_updated_at || ''
      }))

    return NextResponse.json(activeMessages)
  } catch (error: any) {
    console.error('Erro ao buscar mensagens RH:', error)
    return NextResponse.json({ error: error.message || 'Erro ao buscar mensagens' }, { status: 500 })
  }
}
