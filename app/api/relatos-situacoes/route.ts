import { createAdminClient, supabase } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const RELATOS_BUCKET = "relatos_anexos"

function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""
  if (["jpg", "jpeg"].includes(ext)) return "image/jpeg"
  if (ext === "png") return "image/png"
  if (ext === "webp") return "image/webp"
  if (ext === "gif") return "image/gif"
  if (ext === "svg") return "image/svg+xml"
  if (ext === "mp4") return "video/mp4"
  if (ext === "webm") return "video/webm"
  if (ext === "mov") return "video/quicktime"
  if (ext === "mp3") return "audio/mpeg"
  if (ext === "wav") return "audio/wav"
  if (ext === "ogg") return "audio/ogg"
  if (ext === "m4a") return "audio/mp4"
  if (ext === "pdf") return "application/pdf"
  if (ext === "doc") return "application/msword"
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  if (ext === "xls") return "application/vnd.ms-excel"
  if (ext === "xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  if (ext === "txt") return "text/plain; charset=utf-8"
  return "application/octet-stream"
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()

    // Entrega de arquivo de anexo de relato exclusivo (imagem, vídeo, áudio ou documento)
    const fileParam = req.nextUrl.searchParams.get("file")
    if (fileParam) {
      const { data, error } = await supabaseAdmin.storage
        .from(RELATOS_BUCKET)
        .download(fileParam)

      if (error || !data) {
        return new Response("Arquivo do relato não encontrado.", { status: 404 })
      }

      const mime = getMimeType(fileParam)
      const buffer = await data.arrayBuffer()
      return new Response(buffer, {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `inline; filename="${encodeURIComponent(fileParam)}"`,
          "Cache-Control": "private, max-age=86400"
        }
      })
    }

    const { data, error } = await supabaseAdmin
      .from("relatos_situacoes")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Aviso ao buscar relatos_situacoes:", error.message)
      return NextResponse.json(
        { success: true, relatos: [] },
        { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
      )
    }

    return NextResponse.json(
      { success: true, relatos: data || [] },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    )
  } catch (err: any) {
    console.error("Erro no GET de relatos-situacoes:", err)
    return NextResponse.json({ success: false, error: err?.message, relatos: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const contentType = req.headers.get("content-type") || ""

    let usuario_id = ""
    let usuario_nome = "Usuário"
    let usuario_email = ""
    let usuario_role = ""
    let titulo = ""
    let relato = ""
    let imagem_url = ""

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData()
      usuario_id = (formData.get("usuario_id") as string) || ""
      usuario_nome = (formData.get("usuario_nome") as string) || "Usuário"
      usuario_email = (formData.get("usuario_email") as string) || ""
      usuario_role = (formData.get("usuario_role") as string) || ""
      titulo = (formData.get("titulo") as string) || ""
      relato = (formData.get("relato") as string) || ""
      
      const file = (formData.get("imagem") || formData.get("arquivo")) as File | null
      if (file && file.size > 0) {
        try {
          let cleanExt = ""
          if (file.name && file.name.includes(".")) {
            cleanExt = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || ""
          }

          // Se a extensão for "blob", "bin" ou vazia (típico de prints colados via Ctrl+V), deduzir pelo MIME type
          if (!cleanExt || cleanExt === "blob" || cleanExt === "bin") {
            const fileMime = (file.type || "").toLowerCase()
            if (fileMime.includes("png")) cleanExt = "png"
            else if (fileMime.includes("jpeg") || fileMime.includes("jpg")) cleanExt = "jpg"
            else if (fileMime.includes("webp")) cleanExt = "webp"
            else if (fileMime.includes("gif")) cleanExt = "gif"
            else if (fileMime.includes("svg")) cleanExt = "svg"
            else if (fileMime.includes("pdf")) cleanExt = "pdf"
            else if (fileMime.includes("mp4")) cleanExt = "mp4"
            else if (fileMime.includes("webm")) cleanExt = "webm"
            else if (fileMime.includes("quicktime")) cleanExt = "mov"
            else if (fileMime.includes("mpeg") || fileMime.includes("mp3")) cleanExt = "mp3"
            else if (fileMime.includes("wav")) cleanExt = "wav"
            else if (fileMime.includes("ogg")) cleanExt = "ogg"
            else if (fileMime.includes("word") || fileMime.includes("document")) cleanExt = "docx"
            else if (fileMime.includes("sheet") || fileMime.includes("excel")) cleanExt = "xlsx"
            else cleanExt = "png"
          }

          const fileName = `${Date.now()}_anexo_${Math.random().toString(36).substring(7)}.${cleanExt}`
          const buffer = Buffer.from(await file.arrayBuffer())
          const mime = file.type && file.type !== "application/octet-stream" ? file.type : getMimeType(fileName)

          // Tenta criar bucket dedicado para relatos se ainda não existir
          try {
            await supabaseAdmin.storage.createBucket(RELATOS_BUCKET, { public: false })
          } catch {}
          
          const { error: upErr } = await supabaseAdmin.storage
            .from(RELATOS_BUCKET)
            .upload(fileName, buffer, { contentType: mime, upsert: true })

          if (!upErr) {
            imagem_url = `/api/relatos-situacoes?file=${encodeURIComponent(fileName)}`
          } else {
            // Se o storage não estiver disponível para relatos, salva inline como Base64 (100% isolado na tabela)
            imagem_url = `data:${mime};base64,${buffer.toString("base64")}`
          }
        } catch {
          // fallback
        }
      }
    } else {
      const body = await req.json()
      usuario_id = body.usuario_id || ""
      usuario_nome = body.usuario_nome || "Usuário"
      usuario_email = body.usuario_email || ""
      usuario_role = body.usuario_role || ""
      titulo = body.titulo || ""
      relato = body.relato || ""
      imagem_url = body.imagem_url || ""
    }

    if (!relato.trim()) {
      return NextResponse.json({ success: false, error: "O relato não pode estar em branco." }, { status: 400 })
    }

    const payload = {
      usuario_id,
      usuario_nome,
      usuario_email,
      usuario_role,
      titulo: titulo.trim() || "Relato de Situação",
      relato: relato.trim(),
      imagem_url: imagem_url || null,
      lido: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from("relatos_situacoes")
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.warn("Aviso ao salvar relato no Supabase:", error.message)
      return NextResponse.json({ success: true, message: "Relato recebido.", fallback: true })
    }

    return NextResponse.json({ success: true, relato: data })
  } catch (err: any) {
    console.error("Erro no POST de relatos-situacoes:", err)
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const body = await req.json()
    const { id, lido } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "ID não fornecido." }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("relatos_situacoes")
      .update({ lido: Boolean(lido), updated_at: new Date().toISOString() })
      .eq("id", id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Erro no PATCH de relatos-situacoes:", err)
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: "ID não fornecido." }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from("relatos_situacoes")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("Erro no DELETE de relatos-situacoes:", err)
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}
