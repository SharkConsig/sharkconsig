import { createAdminClient, supabase } from "@/lib/supabase"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const CANDIDATE_BUCKETS = ["material_apoio", "material_apoioi", "material-apoio", "materiais_apoio"]
const DEFAULT_BUCKET = "material_apoio"

// Helper para detectar tipo do arquivo
function detectFileType(fileName: string, mime?: string): "video" | "imagem" | "audio" | "documento" | "outro" {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""
  if (mime?.startsWith("video/") || ["mp4", "mov", "webm", "avi", "mkv", "m4v"].includes(ext)) {
    return "video"
  }
  if (mime?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp"].includes(ext)) {
    return "imagem"
  }
  if (mime?.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a", "aac", "flac"].includes(ext)) {
    return "audio"
  }
  if (["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(ext)) {
    return "documento"
  }
  return "outro"
}

// Helper para limpar nome legível
function cleanFileName(fileName: string): string {
  const withoutPrefix = fileName.replace(/^\d+[-_]/, "")
  const lastDot = withoutPrefix.lastIndexOf(".")
  const nameWithoutExt = lastDot > 0 ? withoutPrefix.substring(0, lastDot) : withoutPrefix
  return nameWithoutExt.replace(/[-_]+/g, " ").trim()
}

// Encontra ou assegura que o bucket existe
async function getOrCreateTargetBucket(supabaseAdmin: any): Promise<string> {
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    if (buckets && Array.isArray(buckets)) {
      // 1. Procura se algum dos candidatos existe
      for (const candidate of CANDIDATE_BUCKETS) {
        const found = buckets.find((b: any) => b.name?.toLowerCase() === candidate.toLowerCase() || b.id?.toLowerCase() === candidate.toLowerCase())
        if (found) {
          return found.name || found.id
        }
      }
    }
  } catch (err) {
    console.warn("Aviso ao listar buckets:", err)
  }

  // 2. Tenta criar o bucket padrão caso não exista
  try {
    await supabaseAdmin.storage.createBucket(DEFAULT_BUCKET, {
      public: true,
      fileSizeLimit: 104857600 // 100MB
    })
  } catch (err: any) {
    console.warn("Aviso ao criar bucket:", err?.message)
  }

  return DEFAULT_BUCKET
}

export async function GET(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const targetBucket = await getOrCreateTargetBucket(supabaseAdmin)

    // Se a requisição pedir um arquivo específico (?file=nome), entrega o conteúdo diretamente (evita problemas de bucket privado e CORS)
    const fileParam = req.nextUrl.searchParams.get("file")
    if (fileParam) {
      const { data, error } = await supabaseAdmin.storage
        .from(targetBucket)
        .download(fileParam)

      if (error || !data) {
        // Fallback tenta em material_apoio se tiver sido salvo em outro bucket
        const { data: fbData, error: fbError } = await supabaseAdmin.storage
          .from("material_apoio")
          .download(fileParam)
        
        if (fbError || !fbData) {
          return new Response("Arquivo não encontrado no storage.", { status: 404 })
        }
        
        const ext = fileParam.split(".").pop()?.toLowerCase() || ""
        let mime = "application/octet-stream"
        if (["jpg", "jpeg"].includes(ext)) mime = "image/jpeg"
        else if (ext === "png") mime = "image/png"
        else if (ext === "webp") mime = "image/webp"
        else if (ext === "gif") mime = "image/gif"
        else if (ext === "svg") mime = "image/svg+xml"
        else if (ext === "mp4") mime = "video/mp4"
        else if (ext === "webm") mime = "video/webm"
        else if (ext === "mp3") mime = "audio/mpeg"
        else if (ext === "wav") mime = "audio/wav"
        else if (ext === "ogg") mime = "audio/ogg"
        else if (ext === "pdf") mime = "application/pdf"

        const buffer = await fbData.arrayBuffer()
        return new Response(buffer, {
          headers: {
            "Content-Type": mime,
            "Cache-Control": "public, max-age=31536000, immutable"
          }
        })
      }

      const ext = fileParam.split(".").pop()?.toLowerCase() || ""
      let mime = "application/octet-stream"
      if (["jpg", "jpeg"].includes(ext)) mime = "image/jpeg"
      else if (ext === "png") mime = "image/png"
      else if (ext === "webp") mime = "image/webp"
      else if (ext === "gif") mime = "image/gif"
      else if (ext === "svg") mime = "image/svg+xml"
      else if (ext === "mp4") mime = "video/mp4"
      else if (ext === "webm") mime = "video/webm"
      else if (ext === "mp3") mime = "audio/mpeg"
      else if (ext === "wav") mime = "audio/wav"
      else if (ext === "ogg") mime = "audio/ogg"
      else if (ext === "pdf") mime = "application/pdf"

      const buffer = await data.arrayBuffer()
      return new Response(buffer, {
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      })
    }

    // Lista os arquivos do bucket
    const { data: files, error } = await supabaseAdmin.storage
      .from(targetBucket)
      .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } })

    let activeFiles = files
    let bucketInUse = targetBucket

    if (error && targetBucket !== "material_apoio") {
      const { data: altFiles, error: altError } = await supabaseAdmin.storage
        .from("material_apoio")
        .list("", { limit: 200, sortBy: { column: "created_at", order: "desc" } })
      
      if (!altError && altFiles) {
        activeFiles = altFiles
        bucketInUse = "material_apoio"
      }
    }

    const validFiles = (activeFiles || []).filter((f: any) => f.name && !f.name.startsWith(".") && f.name !== ".emptyFolderPlaceholder")
    
    // Gerar URLs seguras para cada item (usando o endpoint de proxy /api/materiais-apoio?file= para garantir carregamento 100% de imagens/vídeos/áudios)
    const items = validFiles.map((file: any) => {
      // URL proxy direta que nunca falha por permissão de bucket
      const proxyUrl = `/api/materiais-apoio?file=${encodeURIComponent(file.name)}`
      
      return {
        id: file.id || file.name,
        name: file.name,
        url: proxyUrl,
        size: file.metadata?.size || 0,
        created_at: file.created_at || new Date().toISOString(),
        tipo: detectFileType(file.name, file.metadata?.mimetype),
        tituloFormatado: cleanFileName(file.name)
      }
    })

    return NextResponse.json(
      { success: true, bucket: bucketInUse, files: items },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } }
    )
  } catch (err: any) {
    console.error("Erro na API /api/materiais-apoio GET:", err)
    return NextResponse.json({ success: false, error: err?.message, files: [] }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    const targetBucket = await getOrCreateTargetBucket(supabaseAdmin)

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const customTitle = (formData.get("customTitle") as string) || ""

    if (!file) {
      return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 })
    }

    const ext = file.name.split(".").pop() || ""
    const sanitizedBase = (customTitle.trim() || file.name.replace(/\.[^/.]+$/, ""))
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
    
    const fileName = `${Date.now()}_${sanitizedBase}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from(targetBucket)
      .upload(fileName, buffer, {
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
        upsert: true
      })

    if (uploadError) {
      console.error("Erro no upload do storage:", uploadError)
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 })
    }

    const { data } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(fileName)

    const newItem = {
      id: fileName,
      name: fileName,
      url: data?.publicUrl || "",
      size: file.size,
      created_at: new Date().toISOString(),
      tipo: detectFileType(fileName, file.type),
      tituloFormatado: cleanFileName(fileName)
    }

    return NextResponse.json({ success: true, bucket: targetBucket, file: newItem })
  } catch (err: any) {
    console.error("Erro na API /api/materiais-apoio POST:", err)
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()

    const body = await req.json()
    const { fileName } = body

    if (!fileName) {
      return NextResponse.json({ success: false, error: "Nome do arquivo não informado." }, { status: 400 })
    }

    // Remove de todos os possíveis buckets para garantir exclusão definitiva independente de onde foi enviado
    await Promise.allSettled(
      CANDIDATE_BUCKETS.map(b => supabaseAdmin.storage.from(b).remove([fileName]))
    )

    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    )
  } catch (err: any) {
    console.error("Erro na API /api/materiais-apoio DELETE:", err)
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 })
  }
}
