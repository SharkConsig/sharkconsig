import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { usuario_id, mensagem, action } = body

    const supabaseAdmin = createAdminClient()

    // Action to clear all messages for all users
    if (action === 'clear_all' || usuario_id === 'ALL') {
      let users: any[] = []
      let page = 1
      const perPage = 1000
      while (true) {
        const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
        if (error) throw error
        const pageUsers = listData?.users || []
        users = users.concat(pageUsers)
        if (pageUsers.length < perPage) break
        page++
      }

      const usersWithMessages = users.filter(u => u.user_metadata?.rh_mensagem_destaque)

      await Promise.all(
        usersWithMessages.map(u => {
          const currentMeta = u.user_metadata || {}
          return supabaseAdmin.auth.admin.updateUserById(u.id, {
            user_metadata: {
              ...currentMeta,
              rh_mensagem_destaque: '',
              rh_mensagem_updated_at: null
            }
          })
        })
      )

      return NextResponse.json({
        success: true,
        message: 'Todas as mensagens do RH foram apagadas com sucesso.',
        cleared_count: usersWithMessages.length
      })
    }

    if (!usuario_id) {
      return NextResponse.json({ error: 'ID do usuário destinatário é obrigatório' }, { status: 400 })
    }

    // Retrieve target user auth data
    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(usuario_id)
    if (getUserError || !user) {
      return NextResponse.json({ error: 'Usuário destinatário não encontrado' }, { status: 404 })
    }

    const currentMeta = user.user_metadata || {}

    // Update user_metadata with the RH custom message and current timestamp
    const updatedMeta = {
      ...currentMeta,
      rh_mensagem_destaque: mensagem ? mensagem.trim() : '',
      rh_mensagem_updated_at: mensagem ? new Date().toISOString() : null
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

      const msg = user.user_metadata?.rh_mensagem_destaque || ''
      const updatedAt = user.user_metadata?.rh_mensagem_updated_at

      // Check 24-hour expiration
      if (msg && updatedAt) {
        const timeDiff = Date.now() - new Date(updatedAt).getTime()
        if (timeDiff > TWENTY_FOUR_HOURS_MS) {
          // Message expired after 24h: clean it up automatically
          const currentMeta = user.user_metadata || {}
          await supabaseAdmin.auth.admin.updateUserById(usuario_id, {
            user_metadata: {
              ...currentMeta,
              rh_mensagem_destaque: '',
              rh_mensagem_updated_at: null
            }
          })
          return NextResponse.json({ usuario_id: user.id, mensagem: '', expired: true })
        }
      }

      return NextResponse.json({
        usuario_id: user.id,
        mensagem: msg
      })
    }

    // List all users with active RH messages
    let users: any[] = []
    let page = 1
    const perPage = 1000
    while (true) {
      const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      const pageUsers = listData?.users || []
      users = users.concat(pageUsers)
      if (pageUsers.length < perPage) break
      page++
    }

    const now = Date.now()
    const validMessages: any[] = []
    const expiredUsersToClean: any[] = []

    for (const u of users) {
      const msg = u.user_metadata?.rh_mensagem_destaque
      const updatedAt = u.user_metadata?.rh_mensagem_updated_at
      if (msg) {
        if (updatedAt && (now - new Date(updatedAt).getTime() > TWENTY_FOUR_HOURS_MS)) {
          expiredUsersToClean.push(u)
        } else {
          validMessages.push({
            usuario_id: u.id,
            nome: u.user_metadata?.nome_completo || u.user_metadata?.full_name || u.email || 'Usuário',
            mensagem: msg,
            updated_at: updatedAt || ''
          })
        }
      }
    }

    // Auto-clean expired in background
    if (expiredUsersToClean.length > 0) {
      Promise.all(
        expiredUsersToClean.map(u => {
          const currentMeta = u.user_metadata || {}
          return supabaseAdmin.auth.admin.updateUserById(u.id, {
            user_metadata: {
              ...currentMeta,
              rh_mensagem_destaque: '',
              rh_mensagem_updated_at: null
            }
          })
        })
      ).catch(e => console.error('Erro ao limpar mensagens expiradas:', e))
    }

    return NextResponse.json(validMessages)
  } catch (error: any) {
    console.error('Erro ao buscar mensagens RH:', error)
    return NextResponse.json({ error: error.message || 'Erro ao buscar mensagens' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabaseAdmin = createAdminClient()

    let users: any[] = []
    let page = 1
    const perPage = 1000
    while (true) {
      const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      const pageUsers = listData?.users || []
      users = users.concat(pageUsers)
      if (pageUsers.length < perPage) break
      page++
    }

    const usersWithMessages = users.filter(u => u.user_metadata?.rh_mensagem_destaque)

    await Promise.all(
      usersWithMessages.map(u => {
        const currentMeta = u.user_metadata || {}
        return supabaseAdmin.auth.admin.updateUserById(u.id, {
          user_metadata: {
            ...currentMeta,
            rh_mensagem_destaque: '',
            rh_mensagem_updated_at: null
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      message: 'Todas as mensagens do RH foram apagadas com sucesso.',
      cleared_count: usersWithMessages.length
    })
  } catch (error: any) {
    console.error('Erro ao apagar todas as mensagens RH:', error)
    return NextResponse.json({ error: error.message || 'Erro ao apagar mensagens' }, { status: 500 })
  }
}
