import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { campanhaId, selectedSupervisors = [], selectedBrokers = [] } = body

    if (!campanhaId) {
      return NextResponse.json({ error: 'ID da campanha é obrigatório.' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // 1. Obter dados atuais da campanha
    const { data: campaign, error: getError } = await supabaseAdmin
      .from('campanhas')
      .select('id, filtros, filtros_json')
      .eq('id', campanhaId)
      .single()

    if (getError) {
      console.error('[API Distribuir] Erro ao buscar campanha:', getError)
      return NextResponse.json({ error: `Erro ao buscar campanha: ${getError.message}` }, { status: 500 })
    }

    const currentFiltros = (campaign?.filtros && typeof campaign.filtros === 'object') ? campaign.filtros : {}
    const updatedFiltros = {
      ...currentFiltros,
      distribuicao: selectedSupervisors,
      corretores_selecionados: selectedBrokers
    }

    // 2. Atualizar a campanha com os novos filtros de distribuição
    const { error: updateError } = await supabaseAdmin
      .from('campanhas')
      .update({ 
        filtros: updatedFiltros,
        filtros_json: updatedFiltros 
      })
      .eq('id', campanhaId)

    if (updateError) {
      console.error('[API Distribuir] Erro ao atualizar campanha:', updateError)
      return NextResponse.json({ error: `Erro ao atualizar campanha: ${updateError.message}` }, { status: 500 })
    }

    // 3. Atualizar tabela secundária 'campanha_participantes' de forma assíncrona/não-bloqueante
    (async () => {
      try {
        await supabaseAdmin
          .from('campanha_participantes')
          .delete()
          .eq('campanha_id', campanhaId)

        const participantsToInsert: { campanha_id: string; user_id: string; papel: string }[] = []

        selectedSupervisors.forEach((supId: string) => {
          if (supId) participantsToInsert.push({ campanha_id: campanhaId, user_id: supId, papel: 'supervisor' })
        })

        selectedBrokers.forEach((brokerId: string) => {
          if (brokerId) participantsToInsert.push({ campanha_id: campanhaId, user_id: brokerId, papel: 'corretor' })
        })

        if (participantsToInsert.length > 0) {
          await supabaseAdmin
            .from('campanha_participantes')
            .insert(participantsToInsert)
        }
      } catch (syncErr) {
        console.warn('[API Distribuir] Sincronização em segundo plano concluída/ignorada:', syncErr)
      }
    })()

    return NextResponse.json({ 
      success: true, 
      updatedFiltros 
    })
  } catch (error: unknown) {
    console.error('[API Distribuir] Erro interno:', error)
    const message = error instanceof Error ? error.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
