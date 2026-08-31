import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CONFIG_KEY = 'STATUS_CHAMADOS_GRUPOS_CONFIG'

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    
    // 1. Busca os status normais do banco
    const { data: statuses, error } = await supabaseAdmin
      .from('status_chamados')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    // 2. Busca o mapa de grupos persistido
    const { data: bannerConfig } = await supabaseAdmin
      .from('dashboard_banners')
      .select('*')
      .eq('title', CONFIG_KEY)
      .maybeSingle()

    let groupMap: Record<string, string> = {}
    if (bannerConfig && bannerConfig.image_url) {
      try {
        groupMap = JSON.parse(bannerConfig.image_url)
      } catch (e) {
        console.error('Erro ao ler mapa de grupos:', e)
      }
    }

    // 3. Mescla com prioridade no groupMap ou status.grupo
    const enrichedStatuses = (statuses || []).map((s: { id: string | number; grupo?: string }) => ({
      ...s,
      grupo: groupMap[String(s.id)] || s.grupo || 'EM NEGOCIAÇÃO'
    }))

    return NextResponse.json({ success: true, data: enrichedStatuses, groupMap })
  } catch (err: unknown) {
    const error = err as { message?: string }
    console.error('Erro no GET de status_chamados:', error)
    return NextResponse.json({ error: error.message || 'Erro ao carregar' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, id, nome, cor, cor_texto, grupo } = body

    const supabaseAdmin = createAdminClient()

    // 1. Garante a persistência do mapeamento de grupos em dashboard_banners
    const syncGroupMapping = async (statusId: string | number, novoGrupo: string) => {
      try {
        const { data: existing } = await supabaseAdmin
          .from('dashboard_banners')
          .select('*')
          .eq('title', CONFIG_KEY)
          .maybeSingle()

        let map: Record<string, string> = {}
        if (existing && existing.image_url) {
          try {
            map = JSON.parse(existing.image_url)
          } catch {
            map = {}
          }
        }

        map[String(statusId)] = novoGrupo

        if (existing) {
          await supabaseAdmin
            .from('dashboard_banners')
            .update({
              image_url: JSON.stringify(map),
              link: 'STATUS_GROUPS',
              active: true
            })
            .eq('id', existing.id)
        } else {
          await supabaseAdmin
            .from('dashboard_banners')
            .insert({
              title: CONFIG_KEY,
              image_url: JSON.stringify(map),
              link: 'STATUS_GROUPS',
              active: true
            })
        }
      } catch (mapErr) {
        console.error('Erro ao sincronizar mapa de grupos de status:', mapErr)
      }
    }

    if (action === 'update' && id) {
      // Salva no banco de dados na coluna grupo se existir
      try {
        await supabaseAdmin
          .from('status_chamados')
          .update({
            nome: nome?.toUpperCase(),
            cor,
            cor_texto,
            grupo
          })
          .eq('id', id)
      } catch {
        await supabaseAdmin
          .from('status_chamados')
          .update({
            nome: nome?.toUpperCase(),
            cor,
            cor_texto
          })
          .eq('id', id)
      }

      // Garante a persistência do Grupo
      if (grupo) {
        await syncGroupMapping(id, grupo)
      }

      return NextResponse.json({ success: true, id, grupo })
    }

    if (action === 'create') {
      let createdId: string | number | null = null

      const { data, error } = await supabaseAdmin
        .from('status_chamados')
        .insert({
          nome: nome?.toUpperCase(),
          cor,
          cor_texto,
          grupo
        })
        .select()

      if (error) {
        const fallback = await supabaseAdmin
          .from('status_chamados')
          .insert({
            nome: nome?.toUpperCase(),
            cor,
            cor_texto
          })
          .select()
        if (fallback.error) throw fallback.error
        createdId = fallback.data?.[0]?.id
      } else {
        createdId = data?.[0]?.id
      }

      if (createdId && grupo) {
        await syncGroupMapping(createdId, grupo)
      }

      return NextResponse.json({ success: true, id: createdId, grupo })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err: unknown) {
    const error = err as { message?: string; details?: string; code?: string }
    console.error('Erro na API de status_chamados:', error)
    return NextResponse.json(
      { error: error.message || error.details || 'Erro ao processar status' },
      { status: 500 }
    )
  }
}
