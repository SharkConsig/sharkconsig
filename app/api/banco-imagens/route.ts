import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const BUCKET_NAME = 'capacitacao-pj'
const FOLDER_PATH = 'imagens para mensagens'

function formatTitleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '')
  const clean = withoutExt.replace(/[_-]+/g, ' ').trim()
  return clean
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

export async function GET() {
  try {
    const supabaseAdmin = createAdminClient()
    const { data: files, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(FOLDER_PATH, {
        limit: 200,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    if (error) {
      console.error('Erro ao listar imagens no storage:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const imagens = (files || [])
      .filter(f => f.name && !f.name.startsWith('.') && f.name !== '.emptyFolderPlaceholder')
      .map(file => {
        const title = formatTitleFromFilename(file.name)
        const id = file.name.replace(/\.[^/.]+$/, '').replace(/\W+/g, '_').toLowerCase()
        const url = `https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${encodeURIComponent(FOLDER_PATH)}/${encodeURIComponent(file.name)}`

        return {
          id,
          title,
          filename: file.name,
          url,
          created_at: file.created_at
        }
      })

    return NextResponse.json(
      { imagens },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
          Expires: '0'
        }
      }
    )
  } catch (err: any) {
    console.error('Erro ao buscar banco de imagens:', err)
    return NextResponse.json({ error: err?.message || 'Erro desconhecido' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const uploadResults: Array<{ filename: string; url: string; title: string; id: string }> = []
    const errors: Array<{ filename: string; error: string }> = []

    for (const file of files) {
      if (!file || typeof file.name !== 'string') continue

      // Sanitizar nome do arquivo preservando a extensão original
      const originalName = file.name
      const dotIndex = originalName.lastIndexOf('.')
      const ext = dotIndex !== -1 ? originalName.slice(dotIndex).toLowerCase() : '.jpeg'
      const baseName = dotIndex !== -1 ? originalName.slice(0, dotIndex) : originalName

      const safeBaseName = baseName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-zA-Z0-9_-]/g, '_') // caracteres especiais viram underline
        .replace(/_+/g, '_')
        .toLowerCase()

      const cleanFileName = `${safeBaseName}${ext}`
      const targetPath = `${FOLDER_PATH}/${cleanFileName}`

      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const { error: uploadError } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .upload(targetPath, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true
          })

        if (uploadError) {
          errors.push({ filename: originalName, error: uploadError.message })
        } else {
          const url = `https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/${BUCKET_NAME}/${encodeURIComponent(FOLDER_PATH)}/${encodeURIComponent(cleanFileName)}`
          uploadResults.push({
            id: safeBaseName,
            title: formatTitleFromFilename(cleanFileName),
            filename: cleanFileName,
            url
          })
        }
      } catch (fileErr: any) {
        errors.push({ filename: originalName, error: fileErr?.message || 'Falha no upload' })
      }
    }

    return NextResponse.json({
      success: true,
      uploadedCount: uploadResults.length,
      uploaded: uploadResults,
      errors
    })
  } catch (err: any) {
    console.error('Erro na rota de upload de imagens:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno no upload' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const filenames: string[] = Array.isArray(body?.filenames)
      ? body.filenames
      : body?.filename
        ? [body.filename]
        : []

    if (!filenames || filenames.length === 0) {
      return NextResponse.json({ error: 'Nenhum arquivo informado para exclusão.' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient()
    const pathsToRemove = filenames.map((name: string) => `${FOLDER_PATH}/${name}`)

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove(pathsToRemove)

    if (error) {
      console.error('Erro ao excluir imagens no storage:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      removedCount: data?.length ?? filenames.length,
      removed: data
    })
  } catch (err: any) {
    console.error('Erro na rota de exclusão de imagens:', err)
    return NextResponse.json({ error: err?.message || 'Erro interno na exclusão' }, { status: 500 })
  }
}
