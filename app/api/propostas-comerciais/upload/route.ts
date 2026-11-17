import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export const dynamic = "force-dynamic"

const BUCKET_NAME = "propostas-comerciais"
let bucketEnsured = false

async function ensureBucket(supabaseAdmin: ReturnType<typeof createAdminClient>) {
  if (bucketEnsured) return

  const { data: existing, error: getErr } = await supabaseAdmin.storage.getBucket(BUCKET_NAME)
  if (existing && !getErr) {
    bucketEnsured = true
    return
  }

  const { error: createErr } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
    public: true,
    fileSizeLimit: 26214400, // 25MB
    allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "application/pdf"],
  })

  if (createErr && !String(createErr.message || "").toLowerCase().includes("already exists")) {
    throw new Error(`Falha ao preparar bucket ${BUCKET_NAME}: ${createErr.message}`)
  }

  bucketEnsured = true
}

function resolveMimeAndExt(mimeInput?: string, fileName?: string, tipoArquivo?: string) {
  const mime = (mimeInput || "").toLowerCase().trim()
  const tipo = (tipoArquivo || "").toLowerCase().trim()
  const nameExt = (fileName?.split(".").pop() || "").toLowerCase().trim()

  if (mime.includes("pdf") || tipo === "pdf" || nameExt === "pdf") {
    return { contentType: "application/pdf", ext: "pdf" }
  }
  if (mime.includes("jpeg") || mime.includes("jpg") || tipo === "jpg" || tipo === "jpeg" || nameExt === "jpg" || nameExt === "jpeg") {
    return { contentType: "image/jpeg", ext: "jpg" }
  }
  return { contentType: "image/png", ext: "png" }
}

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i)
  if (!match) return null
  return {
    mime: match[1].toLowerCase(),
    buffer: Buffer.from(match[2], "base64"),
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = createAdminClient()
    await ensureBucket(supabaseAdmin)

    const contentTypeHeader = req.headers.get("content-type") || ""
    let fileBuffer: Buffer | null = null
    let mime = ""
    let fileName = ""
    let tipoArquivo = ""
    let model = "geral"

    if (contentTypeHeader.includes("multipart/form-data")) {
      const formData = await req.formData()
      const file = formData.get("file") as File | null
      model = String(formData.get("model") || "geral")
      tipoArquivo = String(formData.get("tipoArquivo") || "")

      if (!file) {
        return NextResponse.json({ success: false, error: "Nenhum arquivo enviado." }, { status: 400 })
      }

      mime = file.type || ""
      fileName = file.name || ""
      fileBuffer = Buffer.from(await file.arrayBuffer())
    } else {
      const body = await req.json()
      model = String(body?.model || "geral")
      tipoArquivo = String(body?.tipoArquivo || "")
      const dataUrl = String(body?.dataUrl || "")

      const parsed = parseDataUrl(dataUrl)
      if (!parsed) {
        return NextResponse.json({ success: false, error: "Formato de arquivo inválido." }, { status: 400 })
      }
      mime = parsed.mime
      fileBuffer = parsed.buffer
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ success: false, error: "Arquivo vazio." }, { status: 400 })
    }

    const { contentType, ext } = resolveMimeAndExt(mime, fileName, tipoArquivo)
    const safeModel = model
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/^-+|-+$/g, "") || "geral"

    const now = new Date()
    const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
    const storagePath = `${safeModel}/${yearMonth}/${crypto.randomUUID()}.${ext}`

    let uploadRes = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(storagePath, fileBuffer, {
        contentType,
        cacheControl: "31536000",
        upsert: false,
      })

    if (uploadRes.error && String(uploadRes.error.message || "").toLowerCase().includes("bucket")) {
      bucketEnsured = false
      await ensureBucket(supabaseAdmin)
      uploadRes = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType,
          cacheControl: "31536000",
          upsert: false,
        })
    }

    if (uploadRes.error) {
      console.error("[API propostas-comerciais/upload] Erro no upload:", uploadRes.error)
      return NextResponse.json({ success: false, error: uploadRes.error.message }, { status: 500 })
    }

    const { data: publicData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(storagePath)

    return NextResponse.json({
      success: true,
      bucket: BUCKET_NAME,
      path: storagePath,
      url: publicData.publicUrl,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno ao enviar proposta para o Storage."
    console.error("[API propostas-comerciais/upload] Erro inesperado:", err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
