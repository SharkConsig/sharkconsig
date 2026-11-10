import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"
import { areOperatorsEquivalent, isProposalCancelled } from "@/lib/sync-kanban-propostas"

export async function POST(req: NextRequest) {
  try {
    const proposal = await req.json()
    if (!proposal) {
      return NextResponse.json({ success: false, error: "Dados da proposta ausentes" }, { status: 400 })
    }

    const ade = proposal.ade ? String(proposal.ade).trim() : ""
    const dataDigitacao = proposal.data_digitacao ? String(proposal.data_digitacao).trim() : ""
    const pStatus = (proposal.status || "").toUpperCase().trim()
    const isCancelled = isProposalCancelled(pStatus)

    if (!ade && !isCancelled) {
      return NextResponse.json({ success: false, message: "Proposta sem ADE/data de digitação válida" })
    }

    const cleanCpf = (proposal.cliente_cpf || "").replace(/\D/g, "")
    const idLead = proposal.id_lead ? String(proposal.id_lead).trim() : ""

    if (!cleanCpf && !idLead) {
      return NextResponse.json({ success: false, error: "CPF ou ID Lead não fornecido" }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()

    // Monta termos de busca para localizar todas as fichas associadas a este cliente
    const lookupTerms = [
      cleanCpf ? `cliente_cpf.eq.${cleanCpf}` : "",
      cleanCpf ? `cliente_cpf.eq.${cleanCpf.padStart(11, "0")}` : "",
      cleanCpf ? `cliente_cpf.eq.${cleanCpf.replace(/^0+/, "")}` : "",
      idLead ? `id.eq.${idLead}` : ""
    ].filter(Boolean).join(",")

    const { data: fichas, error } = await supabaseAdmin
      .from("kanban_fichas")
      .select("id, cliente_cpf, operador_id, operador_nome, etapa, motivo_perda, observacoes, metadata, historico_movimentacoes")
      .or(lookupTerms)

    if (error) {
      console.error("Erro ao buscar fichas para sincronização:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!fichas || fichas.length === 0) {
      return NextResponse.json({ success: true, count: 0, message: "Nenhuma ficha encontrada" })
    }

    const closingName = proposal.nome_corretor || proposal.corretor || proposal.estagiario_colaborador_nome || "outro operador"
    const closingIds = [
      proposal.corretor_id,
      proposal.estagiario_colaborador_id,
      proposal.user_id
    ].map(id => String(id || "").trim().toLowerCase()).filter(Boolean)
    const closingNames = [
      proposal.nome_corretor,
      proposal.corretor,
      proposal.estagiario_colaborador_nome
    ].map(n => String(n || "").trim().toLowerCase()).filter(Boolean)

    let updatedCount = 0

    for (const f of fichas) {
      const meta = (f.metadata && typeof f.metadata === "object") ? { ...f.metadata } : {}
      const fUserId = String(f.operador_id || meta.operador_id || meta.user_id || "").trim()
      const fUserName = String(f.operador_nome || meta.operador_nome || meta.user_nome || "").trim()

      const isSameOperator = 
        (idLead && String(f.id).trim() === idLead) ||
        closingIds.some(cid => areOperatorsEquivalent(cid, null, fUserId, null)) ||
        closingNames.some(cn => areOperatorsEquivalent(null, cn, null, fUserName))

      if (isSameOperator) {
        if (isCancelled) {
          // Proposta cancelada no banco vai para a coluna 'PERDIDO'
          if (f.etapa !== "PERDIDO") {
            meta.kanban_stage = "PERDIDO"
            meta.motivo_perda = "Proposta cancelada pelo banco"
            if (ade) meta.ade = ade
            const historico = Array.isArray(f.historico_movimentacoes) ? [...f.historico_movimentacoes] : []
            historico.push({
              data: new Date().toISOString(),
              autor: "Sistema",
              motivo: `Proposta cancelada pelo banco${ade ? ` (ADE: ${ade})` : ""}`,
              etapa_anterior: f.etapa || "EM RETOMADA",
              etapa_nova: "PERDIDO"
            })

            await supabaseAdmin
              .from("kanban_fichas")
              .update({
                etapa: "PERDIDO",
                motivo_perda: "Proposta cancelada pelo banco",
                metadata: meta,
                historico_movimentacoes: historico,
                updated_at: new Date().toISOString()
              })
              .eq("id", f.id)

            updatedCount++
          }
        } else {
          // Proposta ativa com ADE vai para a coluna 'FECHADO'
          if (f.etapa !== "FECHADO") {
            meta.kanban_stage = "FECHADO"
            meta.motivo_perda = null
            if (ade) meta.ade = ade
            const historico = Array.isArray(f.historico_movimentacoes) ? [...f.historico_movimentacoes] : []
            historico.push({
              data: new Date().toISOString(),
              autor: closingName,
              motivo: `Proposta digitada no banco com ADE ${ade}`,
              etapa_anterior: f.etapa || "EM RETOMADA",
              etapa_nova: "FECHADO"
            })

            await supabaseAdmin
              .from("kanban_fichas")
              .update({
                etapa: "FECHADO",
                motivo_perda: null,
                metadata: meta,
                historico_movimentacoes: historico,
                updated_at: new Date().toISOString()
              })
              .eq("id", f.id)

            updatedCount++
          }
        }
      } else if (!isCancelled && f.etapa !== "FECHADO" && f.etapa !== "PERDIDO") {
        // Para outro usuário com este mesmo cliente em comum: se fechou de verdade, move concorrente para 'PERDIDO'
        meta.kanban_stage = "PERDIDO"
        const noteText = `Cliente já foi fechado pelo operador ${closingName} (ADE: ${ade}). Atendimento encerrado automaticamente.`

        const obsHistorico = Array.isArray(meta.observacoes_historico) ? [...meta.observacoes_historico] : []
        const alreadyNotified = obsHistorico.some((o: any) => String(o?.texto || "").includes(`ADE: ${ade}`))
        if (!alreadyNotified) {
          obsHistorico.push({
            texto: noteText,
            data: new Date().toISOString(),
            autor: "Sistema"
          })
        }
        meta.observacoes_historico = obsHistorico

        const existingObs = f.observacoes ? String(f.observacoes).trim() : ""
        const newObs = existingObs.includes(`ADE: ${ade}`)
          ? existingObs
          : (existingObs ? `${existingObs}\n\n${noteText}` : noteText)

        const historico = Array.isArray(f.historico_movimentacoes) ? [...f.historico_movimentacoes] : []
        historico.push({
          data: new Date().toISOString(),
          autor: "Sistema",
          motivo: `Cliente já foi fechado por outro usuário (${closingName} - ADE: ${ade})`,
          etapa_anterior: f.etapa || "EM RETOMADA",
          etapa_nova: "PERDIDO"
        })

        await supabaseAdmin
          .from("kanban_fichas")
          .update({
            etapa: "PERDIDO",
            motivo_perda: "Cliente já foi fechado por outro usuário",
            observacoes: newObs,
            metadata: meta,
            historico_movimentacoes: historico,
            updated_at: new Date().toISOString()
          })
          .eq("id", f.id)

        updatedCount++
      }
    }

    return NextResponse.json({ success: true, updated: updatedCount })
  } catch (err: any) {
    console.error("Erro na API sync-closed-proposal:", err)
    return NextResponse.json({ success: false, error: err?.message || "Erro interno" }, { status: 500 })
  }
}
