import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const CONVENIO_TABLES = [
  { table: 'clientes', label: 'SIAPE' },
  { table: 'governo_sp_clientes', label: 'Governo São Paulo' },
  { table: 'prefeitura_sp_clientes', label: 'Prefeitura de São Paulo' },
  { table: 'governo_mg_clientes', label: 'Governo Minas Gerais' },
  { table: 'governo_rj_clientes', label: 'Governo Rio de Janeiro' },
  { table: 'governo_ba_clientes', label: 'Governo Bahia' },
  { table: 'governo_am_clientes', label: 'Governo Amazonas' },
  { table: 'governo_ce_clientes', label: 'Governo Ceará' },
  { table: 'governo_ro_clientes', label: 'Governo Rondônia' },
  { table: 'governo_pi_clientes', label: 'Governo Piauí' },
  { table: 'governo_ma_clientes', label: 'Governo Maranhão' },
  { table: 'governo_rr_clientes', label: 'Governo Roraima' },
  { table: 'governo_ms_clientes', label: 'Governo Mato Grosso do Sul' },
  { table: 'prefeitura_santo_andre_clientes', label: 'Prefeitura Santo André' },
  { table: 'prefeitura_contagem_clientes', label: 'Prefeitura Contagem' },
  { table: 'prefeitura_natal_clientes', label: 'Prefeitura de Natal' },
  { table: 'prefeitura_porto_velho_clientes', label: 'Prefeitura de Porto Velho' },
  { table: 'prefeitura_ponta_grossa_clientes', label: 'Prefeitura Ponta Grossa' },
  { table: 'inss_clientes', label: 'INSS' }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const rawCpf = searchParams.get('cpf') || ''
    const ticketId = searchParams.get('ticketId') || ''

    const digits = rawCpf.replace(/\D/g, '')
    if (!digits) {
      return NextResponse.json({ convenio: 'Não informado' })
    }

    const padded = digits.padStart(11, '0')
    const supabaseAdmin = createAdminClient()

    // 1. Verificar se a ficha já possui convênio gravado
    if (ticketId) {
      const { data: ficha } = await supabaseAdmin
        .from('kanban_fichas')
        .select('convenio, metadata')
        .eq('id', ticketId)
        .maybeSingle()

      if (ficha?.convenio && ficha.convenio !== 'Não informado') {
        return NextResponse.json({ convenio: ficha.convenio })
      }
      if (ficha?.metadata?.convenio && ficha.metadata.convenio !== 'Não informado') {
        return NextResponse.json({ convenio: ficha.metadata.convenio })
      }
    }

    // 2. Buscar em paralelo em todas as tabelas de convênio
    const results = await Promise.all(
      CONVENIO_TABLES.map(async (item) => {
        try {
          const { data } = await supabaseAdmin
            .from(item.table)
            .select('cpf')
            .eq('cpf', padded)
            .limit(1)

          if (data && data.length > 0) return item.label

          if (digits !== padded) {
            const { data: d2 } = await supabaseAdmin
              .from(item.table)
              .select('cpf')
              .eq('cpf', digits)
              .limit(1)

            if (d2 && d2.length > 0) return item.label
          }
        } catch {
          return null
        }
        return null
      })
    )

    const resolved = results.find(Boolean) || 'Não informado'

    // 3. Persistir convênio na ficha se resolvido com sucesso
    if (ticketId && resolved && resolved !== 'Não informado') {
      try {
        const { data: ficha } = await supabaseAdmin
          .from('kanban_fichas')
          .select('metadata')
          .eq('id', ticketId)
          .maybeSingle()

        const currentMeta = (ficha?.metadata && typeof ficha.metadata === 'object') ? ficha.metadata : {}
        currentMeta.convenio = resolved

        await supabaseAdmin
          .from('kanban_fichas')
          .update({
            convenio: resolved,
            metadata: currentMeta
          })
          .eq('id', ticketId)
      } catch (err) {
        console.warn('[lead-convenio] Erro ao sincronizar ficha:', err)
      }
    }

    return NextResponse.json({ convenio: resolved })
  } catch (err) {
    console.error('[lead-convenio] Erro ao resolver convênio:', err)
    return NextResponse.json({ convenio: 'Não informado' }, { status: 500 })
  }
}
