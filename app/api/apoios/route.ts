import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'active'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const supabaseAdmin = createAdminClient()

    if (type === 'history') {
      let query = supabaseAdmin
        .from('mensagens_chamado')
        .select('id, chamado_id, user_nome, content, action, created_at')
        .in('action', ['pediu_apoio', 'resolveu_apoio'])

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`)
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`)
      }

      const { data, error } = await query.order('created_at', { ascending: true })
      if (error) throw error

      if (!data || data.length === 0) {
        return NextResponse.json({ success: true, data: [] })
      }

      const ticketIds = Array.from(new Set(data.map((m: any) => m.chamado_id).filter(Boolean)))
      const chamadosMap = new Map<number, any>()

      if (ticketIds.length > 0) {
        try {
          const { data: chamadosData } = await supabaseAdmin
            .from('chamados')
            .select('id, cliente_nome, margem, margem_liquida_5, margem_beneficio_5, usuario_abertura, equipe')
            .in('id', ticketIds)

          if (chamadosData) {
            chamadosData.forEach((c: any) => chamadosMap.set(Number(c.id), c))
          }
        } catch (cErr) {
          console.error('Erro ao carregar chamados para histórico de apoios:', cErr)
        }
      }

      const pedidos: any[] = []
      const resolveuMsgs = data.filter((msg: any) => msg.action === 'resolveu_apoio')

      for (const msg of data) {
        if (msg.action === 'pediu_apoio') {
          const resolved = resolveuMsgs.some(
            (r: any) => r.chamado_id === msg.chamado_id && new Date(r.created_at) >= new Date(msg.created_at)
          )
          pedidos.push({
            ...msg,
            chamados: chamadosMap.get(Number(msg.chamado_id)) || null,
            is_resolved: resolved
          })
        }
      }

      pedidos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      return NextResponse.json({ success: true, data: pedidos })
    }

    // Default: active
    const { data, error } = await supabaseAdmin
      .from('mensagens_chamado')
      .select('id, chamado_id, user_id, user_nome, user_role, content, action, created_at')
      .in('action', ['pediu_apoio', 'resolveu_apoio'])
      .order('created_at', { ascending: true })

    if (error) throw error

    const activeMap = new Map()
    if (data) {
      for (const msg of data) {
        if (msg.action === 'pediu_apoio') {
          activeMap.set(msg.chamado_id, msg)
        } else if (msg.action === 'resolveu_apoio') {
          activeMap.delete(msg.chamado_id)
        }
      }
    }

    const activeList = Array.from(activeMap.values())
    const ticketIds = activeList.map((m: any) => m.chamado_id).filter(Boolean)

    let chamadosList: any[] = []
    if (ticketIds.length > 0) {
      try {
        const { data: chamadosData } = await supabaseAdmin
          .from('chamados')
          .select('id, cliente_nome, margem, margem_liquida_5, margem_beneficio_5, usuario_abertura, equipe, user_id')
          .in('id', ticketIds)

        if (chamadosData) {
          chamadosList = chamadosData
        }
      } catch (cErr) {
        console.error('Erro ao buscar detalhes dos chamados de apoio:', cErr)
      }
    }

    // Buscar perfis para filtragem
    let userProfiles: any[] = []
    try {
      const { data: profiles } = await supabaseAdmin
        .from('perfis')
        .select('id, nome, role, funcao, regime_contratacao')

      if (profiles) {
        userProfiles = profiles
      }
    } catch (pErr) {
      console.warn('Erro ao carregar perfis para apoios:', pErr)
    }

    return NextResponse.json({
      success: true,
      activeList,
      chamados: chamadosList,
      userProfiles
    })
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('Erro na API de apoios:', error)
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 })
  }
}
