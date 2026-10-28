import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseKey)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      nome,
      email,
      telefone,
      cidade,
      cargo_interesse,
      linkedin,
      experiencia,
      mensagem,
      curriculo_url,
      curriculo_nome
    } = body

    if (!nome || !email || !telefone || !cargo_interesse) {
      return NextResponse.json(
        { error: "Nome, e-mail, telefone e cargo de interesse são obrigatórios." },
        { status: 400 }
      )
    }

    const candidateRecord = {
      id: `cand-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      nome: String(nome).trim().toUpperCase(),
      email: String(email).trim().toLowerCase(),
      telefone: String(telefone).trim(),
      cidade: cidade ? String(cidade).trim() : "Florianópolis / SC",
      areas_interesse: cargo_interesse,
      cargo_pretendido: cargo_interesse,
      linkedin: linkedin ? String(linkedin).trim() : null,
      experiencia_resumo: experiencia || "",
      observacoes: `[TRABALHE CONOSCO] Candidatura recebida pelo site institucional Acerto Fácil.\nMensagem: ${mensagem || "Não informada"}\nData: ${new Date().toLocaleString("pt-BR")}`,
      curriculo_url: curriculo_url || null,
      curriculo_name: curriculo_nome || null,
      status: "NOVO",
      origem: "SITE INSTITUCIONAL",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Tentar salvar na tabela hr_banco_talentos do Supabase
    try {
      const { error: insErr } = await supabase
        .from("hr_banco_talentos")
        .insert([candidateRecord])

      if (insErr) {
        console.warn("Aviso ao salvar em hr_banco_talentos:", insErr.message)
      }
    } catch (dbErr) {
      console.warn("Exceção ao persistir no banco de talentos:", dbErr)
    }

    return NextResponse.json({
      success: true,
      message: "Candidatura enviada com sucesso! Nosso time de Recursos Humanos avaliará o seu perfil.",
      candidato: candidateRecord
    })
  } catch (err: any) {
    console.error("Erro na API pública de candidatura:", err)
    return NextResponse.json(
      { error: "Falha ao processar candidatura. Tente novamente mais tarde." },
      { status: 500 }
    )
  }
}
