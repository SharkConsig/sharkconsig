import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { nome, cpf, telefone, convenio, valor_pretendido, tipo_operacao, observacoes } = body

    if (!nome || !cpf || !telefone) {
      return NextResponse.json(
        { error: "Nome, CPF e Telefone são campos obrigatórios." },
        { status: 400 }
      )
    }

    const cleanCpf = String(cpf).replace(/\D/g, "")
    const cleanTelefone = String(telefone).trim()
    const valorNum = parseFloat(String(valor_pretendido || "0").replace(/[R$\s.]/g, "").replace(",", ".")) || 0

    const metadata = {
      origem: "SITE INSTITUCIONAL",
      tipo_operacao: tipo_operacao || "Crédito Consignado",
      valor_solicitado: valorNum,
      convenio: convenio || "INSS",
      observacao_lead: observacoes || "Simulação solicitada através do site público da Acerto Fácil",
      data_envio: new Date().toISOString(),
      canal: "Site Público Acerto Fácil"
    }

    // 1. Inserir ou atualizar na ficha comercial do Kanban (kanban_fichas) com etapa "ENTRADA DO SITE"
    const fichaPayload = {
      cliente_nome: String(nome).trim().toUpperCase(),
      cliente_cpf: cleanCpf,
      cliente_telefone: cleanTelefone,
      origem: "SITE INSTITUCIONAL",
      etapa: "ENTRADA DO SITE",
      convenio: convenio || "INSS",
      valor_solicitado: valorNum > 0 ? valorNum : null,
      observacoes: `[ENTRADA DO SITE] Simulação enviada pelo site Acerto Fácil. Operação: ${tipo_operacao || "Crédito Consignado"}. ${observacoes ? `Obs: ${observacoes}` : ""}`,
      metadata,
      updated_at: new Date().toISOString()
    }

    const { data: kfData, error: kfError } = await supabase
      .from("kanban_fichas")
      .insert([fichaPayload])
      .select()
      .maybeSingle()

    if (kfError) {
      console.warn("Aviso ao salvar em kanban_fichas:", kfError.message)
    }

    // 2. Registrar também um chamado de abertura para visibilidade imediata no sistema
    try {
      await supabase.from("chamados").insert({
        status: "ABERTO",
        origem: "SITE INSTITUCIONAL",
        cliente_nome: String(nome).trim().toUpperCase(),
        cliente_cpf: cleanCpf,
        cliente_telefone: cleanTelefone,
        convenio: convenio || "INSS",
        valor_operacao: valorNum > 0 ? valorNum : null,
        descricao: `[ENTRADA DO SITE] Nova simulação de crédito recebida pelo site institucional Acerto Fácil.\n\nOperação pretendida: ${tipo_operacao || "Crédito Consignado"}\nValor estimado: R$ ${valorNum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}\nConvênio: ${convenio || "INSS"}\n${observacoes ? `Observações do cliente: ${observacoes}\n` : ""}\n<!-- TICKET_METADATA: ${JSON.stringify(metadata)} -->`,
        created_at: new Date().toISOString()
      })
    } catch (chErr) {
      console.warn("Aviso ao registrar chamado correspondente:", chErr)
    }

    return NextResponse.json({
      success: true,
      message: "Simulação recebida com sucesso! Nossos consultores entrarão em contato em instantes.",
      leadId: kfData?.id || null
    })
  } catch (err: any) {
    console.error("Erro na API pública de simulação:", err)
    return NextResponse.json(
      { error: "Falha ao processar solicitação. Tente novamente mais tarde." },
      { status: 500 }
    )
  }
}
