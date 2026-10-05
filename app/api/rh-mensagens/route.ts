import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { usuario_id, mensagem, action, imagem_base64, orientacao } = body

    const supabaseAdmin = createAdminClient()

    // Ação para apagar todas as mensagens de todos os usuários e limpar o bucket rh_images
    if (action === 'clear_all' || usuario_id === 'ALL') {
      // 1. Limpa todas as imagens salvas na tabela perfis e no bucket rh_images
      try {
        const { data: perfisComMsg } = await supabaseAdmin
          .from('perfis')
          .select('id, preferencias')
          .or('rh_mensagem_destaque.not.is.null,rh_mensagem_updated_at.not.is.null')

        if (perfisComMsg && perfisComMsg.length > 0) {
          const filesToDelete: string[] = []
          for (const p of perfisComMsg) {
            const path = p.preferencias?.rh_mensagem_imagem_path
            if (path && typeof path === 'string') {
              filesToDelete.push(path)
            }
          }

          if (filesToDelete.length > 0) {
            await supabaseAdmin.storage.from('rh_images').remove(filesToDelete).catch(console.error)
          }

          // Limpa colunas em perfis
          for (const p of perfisComMsg) {
            const prefs = { ...(p.preferencias || {}) }
            delete prefs.rh_mensagem_imagem_url
            delete prefs.rh_mensagem_imagem_orientacao
            delete prefs.rh_mensagem_imagem_path
            await supabaseAdmin
              .from('perfis')
              .update({
                rh_mensagem_destaque: null,
                rh_mensagem_updated_at: null,
                preferencias: prefs
              })
              .eq('id', p.id)
          }
        }

        // Limpeza completa de qualquer arquivo restante no bucket rh_images
        const { data: bucketFiles } = await supabaseAdmin.storage.from('rh_images').list('', { limit: 1000 })
        if (bucketFiles && bucketFiles.length > 0) {
          const allBucketPaths = bucketFiles.map(f => f.name)
          await supabaseAdmin.storage.from('rh_images').remove(allBucketPaths).catch(console.error)
        }
      } catch (e) {
        console.error('Erro ao limpar perfis em lote:', e)
      }

      // 2. Limpa metadados do Auth de forma segura (garantindo que nunca fique Base64 no token)
      try {
        let users: any[] = []
        let page = 1
        const perPage = 1000
        while (true) {
          const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
          if (error) break
          const pageUsers = listData?.users || []
          users = users.concat(pageUsers)
          if (pageUsers.length < perPage) break
          page++
        }

        const usersWithMessages = users.filter(u => u.user_metadata?.rh_mensagem_destaque || u.user_metadata?.rh_mensagem_imagem)

        await Promise.all(
          usersWithMessages.map(u => {
            const currentMeta = u.user_metadata || {}
            return supabaseAdmin.auth.admin.updateUserById(u.id, {
              user_metadata: {
                ...currentMeta,
                rh_mensagem_destaque: '',
                rh_mensagem_updated_at: null,
                rh_mensagem_imagem: null,
                rh_mensagem_imagem_orientacao: null
              }
            }).catch(() => {})
          })
        )
      } catch (authErr) {
        console.error('Erro ao limpar Auth em lote:', authErr)
      }

      return NextResponse.json({
        success: true,
        message: 'Todas as mensagens e imagens do RH foram apagadas com sucesso.'
      })
    }

    if (!usuario_id) {
      return NextResponse.json({ error: 'ID do usuário destinatário é obrigatório' }, { status: 400 })
    }

    // Ação para apagar individualmente a mensagem e imagem do usuário selecionado
    if (action === 'clear_user' || (mensagem === '' && imagem_base64 === '')) {
      const { data: perfilData } = await supabaseAdmin
        .from('perfis')
        .select('*')
        .eq('id', usuario_id)
        .maybeSingle()

      const currentPrefs = perfilData?.preferencias || {}
      const uploadedImagePath = currentPrefs.rh_mensagem_imagem_path

      if (uploadedImagePath) {
        await supabaseAdmin.storage.from('rh_images').remove([uploadedImagePath]).catch(console.error)
      }

      try {
        const { data: userFiles } = await supabaseAdmin.storage.from('rh_images').list('', { search: `rh_${usuario_id}` })
        if (userFiles && userFiles.length > 0) {
          await supabaseAdmin.storage.from('rh_images').remove(userFiles.map(f => f.name)).catch(console.error)
        }
      } catch (_) {}

      const updatedPrefs = { ...currentPrefs }
      delete updatedPrefs.rh_mensagem_imagem_url
      delete updatedPrefs.rh_mensagem_imagem_path
      delete updatedPrefs.rh_mensagem_imagem_orientacao

      await supabaseAdmin
        .from('perfis')
        .upsert({
          id: usuario_id,
          rh_mensagem_destaque: null,
          rh_mensagem_updated_at: null,
          preferencias: updatedPrefs
        }, { onConflict: 'id' })

      try {
        const { data: uData } = await supabaseAdmin.auth.admin.getUserById(usuario_id)
        if (uData?.user) {
          const currentMeta = uData.user.user_metadata || {}
          await supabaseAdmin.auth.admin.updateUserById(usuario_id, {
            user_metadata: {
              ...currentMeta,
              rh_mensagem_destaque: '',
              rh_mensagem_updated_at: null,
              rh_mensagem_imagem: null,
              rh_mensagem_imagem_orientacao: null
            }
          })
        }
      } catch (_) {}

      return NextResponse.json({
        success: true,
        message: 'Mensagem e anexo do colaborador foram apagados com sucesso.',
        usuario_id
      })
    }

    // Busca perfil e dados atuais
    const { data: perfilData } = await supabaseAdmin
      .from('perfis')
      .select('*')
      .eq('id', usuario_id)
      .maybeSingle()

    const currentPrefs = perfilData?.preferencias || {}
    let uploadedImageUrl: string | null = currentPrefs.rh_mensagem_imagem_url || null
    let uploadedImagePath: string | null = currentPrefs.rh_mensagem_imagem_path || null
    const chosenOrientation: 'vertical' | 'horizontal' = orientacao === 'horizontal' ? 'horizontal' : 'vertical'

    // Se houver uma nova imagem em Base64, salva no bucket rh_images (NUNCA no Auth nem no JWT)
    if (imagem_base64 && typeof imagem_base64 === 'string') {
      if (imagem_base64.trim() === '') {
        // Remoção da imagem existente
        if (uploadedImagePath) {
          await supabaseAdmin.storage.from('rh_images').remove([uploadedImagePath]).catch(console.error)
          uploadedImagePath = null
          uploadedImageUrl = null
        }
      } else if (imagem_base64.startsWith('data:image')) {
        // Remove imagem anterior se existir
        if (uploadedImagePath) {
          await supabaseAdmin.storage.from('rh_images').remove([uploadedImagePath]).catch(console.error)
        }

        const matches = imagem_base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        const mimeType = matches ? matches[1] : 'image/jpeg'
        const ext = mimeType.includes('webp') ? 'webp' : (mimeType.includes('png') ? 'png' : 'jpg')
        const buffer = Buffer.from(matches ? matches[2] : imagem_base64, 'base64')
        const fileName = `rh_${usuario_id}_${Date.now()}.${ext}`

        const { error: uploadError } = await supabaseAdmin.storage
          .from('rh_images')
          .upload(fileName, buffer, {
            contentType: mimeType,
            upsert: true
          })

        if (!uploadError) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('rh_images')
            .getPublicUrl(fileName)
          uploadedImageUrl = publicUrlData.publicUrl
          uploadedImagePath = fileName
        } else {
          console.error('[API RH Mensagens] Erro ao fazer upload no bucket rh_images:', uploadError)
        }
      }
    }

    const hasActiveContent = Boolean((mensagem && mensagem.trim()) || uploadedImageUrl)
    const nowISO = hasActiveContent ? new Date().toISOString() : null

    // Atualiza ou insere na tabela public.perfis
    const updatedPrefs = { ...currentPrefs }
    if (uploadedImageUrl && uploadedImagePath) {
      updatedPrefs.rh_mensagem_imagem_url = uploadedImageUrl
      updatedPrefs.rh_mensagem_imagem_path = uploadedImagePath
      updatedPrefs.rh_mensagem_imagem_orientacao = chosenOrientation
    } else {
      delete updatedPrefs.rh_mensagem_imagem_url
      delete updatedPrefs.rh_mensagem_imagem_path
      delete updatedPrefs.rh_mensagem_imagem_orientacao
    }

    await supabaseAdmin
      .from('perfis')
      .upsert({
        id: usuario_id,
        rh_mensagem_destaque: mensagem ? mensagem.trim() : null,
        rh_mensagem_updated_at: nowISO,
        preferencias: updatedPrefs
      }, { onConflict: 'id' })

    // Atualiza Auth apenas com texto curto e GARANTE que imagem em Base64 seja sempre nula (protege o token JWT)
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(usuario_id)
      if (userData?.user) {
        const currentMeta = userData.user.user_metadata || {}
        await supabaseAdmin.auth.admin.updateUserById(usuario_id, {
          user_metadata: {
            ...currentMeta,
            rh_mensagem_destaque: mensagem ? mensagem.trim() : '',
            rh_mensagem_updated_at: nowISO,
            rh_mensagem_imagem: null,
            rh_mensagem_imagem_orientacao: null
          }
        })
      }
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: mensagem ? 'Mensagem enviada com sucesso para o colaborador!' : 'Mensagem removida com sucesso.',
      usuario_id,
      rh_mensagem_destaque: mensagem ? mensagem.trim() : '',
      imagem_url: uploadedImageUrl,
      imagem_orientacao: chosenOrientation
    })
  } catch (error: any) {
    console.error('Erro ao salvar mensagem RH:', error)
    return NextResponse.json({ error: error.message || 'Erro ao processar mensagem' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const usuario_id = searchParams.get('usuario_id')
    const supabaseAdmin = createAdminClient()

    if (usuario_id) {
      // 1. Consulta primária na tabela public.perfis
      const { data: perfilRow } = await supabaseAdmin
        .from('perfis')
        .select('*')
        .eq('id', usuario_id)
        .maybeSingle()

      let msg = perfilRow?.rh_mensagem_destaque || ''
      let updatedAt = perfilRow?.rh_mensagem_updated_at
      let imgUrl = perfilRow?.preferencias?.rh_mensagem_imagem_url || ''
      let imgOrientacao = perfilRow?.preferencias?.rh_mensagem_imagem_orientacao || 'vertical'
      let imgPath = perfilRow?.preferencias?.rh_mensagem_imagem_path || ''

      // Fallback para user_metadata caso não encontre em perfis
      if (!msg) {
        const { data: authData } = await supabaseAdmin.auth.admin.getUserById(usuario_id).catch(() => ({ data: null }))
        if (authData?.user) {
          msg = authData.user.user_metadata?.rh_mensagem_destaque || ''
          updatedAt = authData.user.user_metadata?.rh_mensagem_updated_at
        }
      }

      // Verificação do ciclo de expiração de 24 horas
      if (msg && updatedAt) {
        const timeDiff = Date.now() - new Date(updatedAt).getTime()
        if (timeDiff > TWENTY_FOUR_HOURS_MS) {
          // Mensagem expirou após 24h: apaga imagem do bucket rh_images automaticamente
          if (imgPath) {
            await supabaseAdmin.storage.from('rh_images').remove([imgPath]).catch(console.error)
          }

          // Limpa registro em perfis
          if (perfilRow) {
            const pPrefs = { ...(perfilRow.preferencias || {}) }
            delete pPrefs.rh_mensagem_imagem_url
            delete pPrefs.rh_mensagem_imagem_path
            delete pPrefs.rh_mensagem_imagem_orientacao
            await supabaseAdmin
              .from('perfis')
              .update({
                rh_mensagem_destaque: null,
                rh_mensagem_updated_at: null,
                preferencias: pPrefs
              })
              .eq('id', usuario_id)
          }

          // Limpa no Auth
          try {
            const { data: uData } = await supabaseAdmin.auth.admin.getUserById(usuario_id)
            if (uData?.user) {
              const currentMeta = uData.user.user_metadata || {}
              await supabaseAdmin.auth.admin.updateUserById(usuario_id, {
                user_metadata: {
                  ...currentMeta,
                  rh_mensagem_destaque: '',
                  rh_mensagem_updated_at: null,
                  rh_mensagem_imagem: null,
                  rh_mensagem_imagem_orientacao: null
                }
              })
            }
          } catch (_) {}

          return NextResponse.json({ usuario_id, mensagem: '', expired: true, imagem_url: null })
        }
      }

      return NextResponse.json({
        usuario_id,
        mensagem: msg,
        imagem_url: imgUrl || null,
        imagem_orientacao: imgOrientacao || 'vertical',
        updated_at: updatedAt
      })
    }

    // Listagem de todas as mensagens ativas do RH
    const { data: perfisList } = await supabaseAdmin
      .from('perfis')
      .select('id, nome, rh_mensagem_destaque, rh_mensagem_updated_at, preferencias')
      .not('rh_mensagem_destaque', 'is', null)

    const now = Date.now()
    const validMessages: any[] = []
    const expiredToClean: any[] = []

    if (perfisList && perfisList.length > 0) {
      for (const p of perfisList) {
        const msg = p.rh_mensagem_destaque
        const updatedAt = p.rh_mensagem_updated_at
        if (msg) {
          if (updatedAt && (now - new Date(updatedAt).getTime() > TWENTY_FOUR_HOURS_MS)) {
            expiredToClean.push(p)
          } else {
            validMessages.push({
              usuario_id: p.id,
              nome: p.nome || 'Colaborador',
              mensagem: msg,
              imagem_url: p.preferencias?.rh_mensagem_imagem_url || null,
              imagem_orientacao: p.preferencias?.rh_mensagem_imagem_orientacao || 'vertical',
              updated_at: updatedAt || ''
            })
          }
        }
      }
    }

    // Limpeza automática de expirados em background
    if (expiredToClean.length > 0) {
      (async () => {
        const pathsToDelete: string[] = []
        for (const p of expiredToClean) {
          const path = p.preferencias?.rh_mensagem_imagem_path
          if (path) pathsToDelete.push(path)

          const pPrefs = { ...(p.preferencias || {}) }
          delete pPrefs.rh_mensagem_imagem_url
          delete pPrefs.rh_mensagem_imagem_path
          delete pPrefs.rh_mensagem_imagem_orientacao
          await supabaseAdmin
            .from('perfis')
            .update({
              rh_mensagem_destaque: null,
              rh_mensagem_updated_at: null,
              preferencias: pPrefs
            })
            .eq('id', p.id)

          await supabaseAdmin.auth.admin.updateUserById(p.id, {
            user_metadata: {
              rh_mensagem_destaque: '',
              rh_mensagem_updated_at: null,
              rh_mensagem_imagem: null,
              rh_mensagem_imagem_orientacao: null
            }
          }).catch(() => {})
        }

        if (pathsToDelete.length > 0) {
          await supabaseAdmin.storage.from('rh_images').remove(pathsToDelete).catch(console.error)
        }
      })().catch(console.error)
    }

    return NextResponse.json(validMessages)
  } catch (error: any) {
    console.error('Erro ao buscar mensagens RH:', error)
    return NextResponse.json({ error: error.message || 'Erro ao buscar mensagens' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Limpa todas as imagens salvas na tabela perfis e no bucket rh_images
    const { data: perfisComMsg } = await supabaseAdmin
      .from('perfis')
      .select('id, preferencias')
      .or('rh_mensagem_destaque.not.is.null,rh_mensagem_updated_at.not.is.null')

    if (perfisComMsg && perfisComMsg.length > 0) {
      const filesToDelete: string[] = []
      for (const p of perfisComMsg) {
        const path = p.preferencias?.rh_mensagem_imagem_path
        if (path && typeof path === 'string') {
          filesToDelete.push(path)
        }
      }

      if (filesToDelete.length > 0) {
        await supabaseAdmin.storage.from('rh_images').remove(filesToDelete).catch(console.error)
      }

      for (const p of perfisComMsg) {
        const prefs = { ...(p.preferencias || {}) }
        delete prefs.rh_mensagem_imagem_url
        delete prefs.rh_mensagem_imagem_orientacao
        delete prefs.rh_mensagem_imagem_path
        await supabaseAdmin
          .from('perfis')
          .update({
            rh_mensagem_destaque: null,
            rh_mensagem_updated_at: null,
            preferencias: prefs
          })
          .eq('id', p.id)
      }
    }

    // 2. Limpa no Auth
    let users: any[] = []
    let page = 1
    const perPage = 1000
    while (true) {
      const { data: listData, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      const pageUsers = listData?.users || []
      users = users.concat(pageUsers)
      if (pageUsers.length < perPage) break
      page++
    }

    const usersWithMessages = users.filter(u => u.user_metadata?.rh_mensagem_destaque || u.user_metadata?.rh_mensagem_imagem)

    await Promise.all(
      usersWithMessages.map(u => {
        const currentMeta = u.user_metadata || {}
        return supabaseAdmin.auth.admin.updateUserById(u.id, {
          user_metadata: {
            ...currentMeta,
            rh_mensagem_destaque: '',
            rh_mensagem_updated_at: null,
            rh_mensagem_imagem: null,
            rh_mensagem_imagem_orientacao: null
          }
        })
      })
    )

    return NextResponse.json({
      success: true,
      message: 'Todas as mensagens e imagens do RH foram apagadas com sucesso.',
      cleared_count: usersWithMessages.length
    })
  } catch (error: any) {
    console.error('Erro ao apagar todas as mensagens RH:', error)
    return NextResponse.json({ error: error.message || 'Erro ao apagar mensagens' }, { status: 500 })
  }
}

