"use client"

import React, { useState, useEffect, useRef } from "react"
import { MessageSquare, Send, X, Check, Loader2, User, Sparkles, Trash2, Image as ImageIcon, Smartphone, Monitor, Upload, RefreshCw, Move } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SystemUser {
  id: string
  nome: string
  email?: string
  funcao?: string
  rh_mensagem_destaque?: string
}

interface RHMessagingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialUserId?: string
  initialUserName?: string
}

const cleanStr = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()

function findBestMatch(list: SystemUser[], targetId?: string, targetName?: string): SystemUser | undefined {
  if (!list || list.length === 0) return undefined

  if (targetId) {
    const byId = list.find(u => u.id === targetId)
    if (byId) return byId
  }

  if (!targetName || !targetName.trim()) return undefined

  const cleanedTarget = cleanStr(targetName)
  if (!cleanedTarget) return undefined

  // 1. Exact normalized match
  const exact = list.find(u => cleanStr(u.nome) === cleanedTarget)
  if (exact) return exact

  // 2. Includes or is included
  const includesMatch = list.find(u => {
    const cName = cleanStr(u.nome)
    return cName.includes(cleanedTarget) || cleanedTarget.includes(cName)
  })
  if (includesMatch) return includesMatch

  // 3. Match by name tokens (first name + last name or multiple tokens)
  const targetTokens = cleanedTarget.split(" ").filter(t => !["de", "da", "do", "dos", "das", "e"].includes(t))
  if (targetTokens.length > 0) {
    const tokenMatch = list.find(u => {
      const uTokens = cleanStr(u.nome).split(" ").filter(t => !["de", "da", "do", "dos", "das", "e"].includes(t))
      if (uTokens.length === 0) return false
      if (targetTokens[0] === uTokens[0]) {
        if (targetTokens.length === 1 || uTokens.length === 1) return true
        if (targetTokens[targetTokens.length - 1] === uTokens[uTokens.length - 1]) return true
        const common = targetTokens.filter(t => uTokens.includes(t))
        if (common.length >= 2) return true
      }
      return false
    })
    if (tokenMatch) return tokenMatch
  }

  // 4. First name match fallback
  if (targetTokens.length > 0) {
    const firstNameMatch = list.find(u => {
      const uTokens = cleanStr(u.nome).split(" ")
      return uTokens[0] === targetTokens[0]
    })
    if (firstNameMatch) return firstNameMatch
  }

  return undefined
}

export function RHMessagingModal({ isOpen, onClose, onSuccess, initialUserId, initialUserName }: RHMessagingModalProps) {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [message, setMessage] = useState<string>("")
  const [sending, setSending] = useState(false)
  const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeCommunicado, setActiveCommunicado] = useState<{ mensagem: string; imagem_url: string | null; imagem_orientacao: string } | null>(null)
  const [loadingCommunicado, setLoadingCommunicado] = useState(false)

  // Estado para Anexo de Imagem (Paisagem 1448x1086 e Vertical 1024x1536 com enquadramento ajustável)
  const [selectedImageOriginal, setSelectedImageOriginal] = useState<string | null>(null)
  const [processedImageDataUrl, setProcessedImageDataUrl] = useState<string | null>(null)
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical')
  const [imageSizeKb, setImageSizeKb] = useState<number | null>(null)
  const [isProcessingImage, setIsProcessingImage] = useState(false)
  const [cropPosition, setCropPosition] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 })
  const [isDraggingImage, setIsDraggingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const previewContainerRef = useRef<HTMLDivElement | null>(null)
  const dragStartRef = useRef<{ clientX: number; clientY: number; startX: number; startY: number } | null>(null)

  // Função de processamento e compressão inteligente no navegador com Canvas (< 180 KB)
  // Dimensões solicitadas:
  // - Paisagem (horizontal): 1448 x 1086 px
  // - Vertical: 1024 x 1536 px
  const processImageWithCanvas = (
    imageSrc: string,
    targetOrientation: 'vertical' | 'horizontal',
    cropPos: { x: number; y: number } = cropPosition
  ): Promise<{ dataUrl: string; sizeKb: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => {
        try {
          const targetW = targetOrientation === 'vertical' ? 1024 : 1448
          const targetH = targetOrientation === 'vertical' ? 1536 : 1086
          const targetAspect = targetW / targetH

          const canvas = document.createElement("canvas")
          canvas.width = targetW
          canvas.height = targetH
          const ctx = canvas.getContext("2d")

          if (!ctx) {
            reject(new Error("Não foi possível inicializar o canvas de imagem."))
            return
          }

          // Cálculo do corte com suporte ao reposicionamento interativo do usuário
          const srcAspect = img.width / img.height
          let sW = img.width
          let sH = img.height
          let sX = 0
          let sY = 0

          const posX = Math.max(0, Math.min(1, cropPos.x))
          const posY = Math.max(0, Math.min(1, cropPos.y))

          if (srcAspect > targetAspect) {
            // Imagem original é mais larga: corta laterais usando a posição horizontal escolhida
            sW = img.height * targetAspect
            sX = (img.width - sW) * posX
          } else {
            // Imagem original é mais alta: corta topo e base usando a posição vertical escolhida
            sH = img.width / targetAspect
            sY = (img.height - sH) * posY
          }

          // Preenchimento de fundo e interpolação de alta qualidade
          ctx.fillStyle = "#ffffff"
          ctx.fillRect(0, 0, targetW, targetH)
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = "high"
          ctx.drawImage(img, sX, sY, sW, sH, 0, 0, targetW, targetH)

          // Compressão progressiva para assegurar peso ultraleve (< 180 KB)
          let quality = 0.85
          let dataUrl = canvas.toDataURL("image/jpeg", quality)
          let sizeKb = Math.round((dataUrl.length * 3 / 4) / 1024)

          if (sizeKb > 180) {
            quality = 0.75
            dataUrl = canvas.toDataURL("image/jpeg", quality)
            sizeKb = Math.round((dataUrl.length * 3 / 4) / 1024)
          }

          if (sizeKb > 180) {
            quality = 0.65
            dataUrl = canvas.toDataURL("image/jpeg", quality)
            sizeKb = Math.round((dataUrl.length * 3 / 4) / 1024)
          }

          resolve({ dataUrl, sizeKb })
        } catch (e) {
          reject(e)
        }
      }
      img.onerror = (e) => reject(e)
      img.src = imageSrc
    })
  }

  // Interatividade de enquadramento: Clicar, segurar e posicionar a imagem
  const handleDragStart = (clientX: number, clientY: number) => {
    if (!selectedImageOriginal && !processedImageDataUrl) return
    setIsDraggingImage(true)
    dragStartRef.current = {
      clientX,
      clientY,
      startX: cropPosition.x,
      startY: cropPosition.y,
    }
  }

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingImage || !dragStartRef.current || !previewContainerRef.current) return
    const rect = previewContainerRef.current.getBoundingClientRect()
    const deltaX = clientX - dragStartRef.current.clientX
    const deltaY = clientY - dragStartRef.current.clientY

    // Deslocamento suave inverso (arrastar imagem para esquerda move o enquadramento para a direita)
    const factorX = (rect.width || 300) * 0.95
    const factorY = (rect.height || 300) * 0.95

    const newX = Math.max(0, Math.min(1, dragStartRef.current.startX - (deltaX / factorX)))
    const newY = Math.max(0, Math.min(1, dragStartRef.current.startY - (deltaY / factorY)))

    setCropPosition({ x: newX, y: newY })
  }

  const handleDragEnd = async () => {
    if (!isDraggingImage) return
    setIsDraggingImage(false)
    dragStartRef.current = null

    const srcToUse = selectedImageOriginal || processedImageDataUrl
    if (srcToUse) {
      try {
        const { dataUrl, sizeKb } = await processImageWithCanvas(srcToUse, orientation, cropPosition)
        setProcessedImageDataUrl(dataUrl)
        setImageSizeKb(sizeKb)
      } catch (err) {
        console.error("Erro ao recalcular enquadramento:", err)
      }
    }
  }

  const handleResetCrop = async () => {
    const centerPos = { x: 0.5, y: 0.5 }
    setCropPosition(centerPos)
    const srcToUse = selectedImageOriginal || processedImageDataUrl
    if (srcToUse) {
      try {
        const { dataUrl, sizeKb } = await processImageWithCanvas(srcToUse, orientation, centerPos)
        setProcessedImageDataUrl(dataUrl)
        setImageSizeKb(sizeKb)
      } catch (err) {
        console.error("Erro ao resetar enquadramento:", err)
      }
    }
  }

  // Mudança do arquivo via input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setStatusBanner({ type: 'error', text: 'Por favor, selecione um formato de imagem válido (JPG, PNG ou WEBP).' })
      return
    }

    setIsProcessingImage(true)
    setStatusBanner(null)
    const centerCrop = { x: 0.5, y: 0.5 }
    setCropPosition(centerCrop)

    const reader = new FileReader()
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string
      if (!rawDataUrl) {
        setIsProcessingImage(false)
        return
      }

      setSelectedImageOriginal(rawDataUrl)

      try {
        const { dataUrl, sizeKb } = await processImageWithCanvas(rawDataUrl, orientation, centerCrop)
        setProcessedImageDataUrl(dataUrl)
        setImageSizeKb(sizeKb)
      } catch (err) {
        console.error("Erro ao processar imagem:", err)
        setStatusBanner({ type: 'error', text: 'Falha ao processar a imagem.' })
      } finally {
        setIsProcessingImage(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // Alternar orientação (Vertical 1024x1536 ou Paisagem 1448x1086) com reprocessamento instantâneo
  const handleOrientationChange = async (newOrientation: 'vertical' | 'horizontal') => {
    if (newOrientation === orientation) return
    setOrientation(newOrientation)
    const centerCrop = { x: 0.5, y: 0.5 }
    setCropPosition(centerCrop)

    const srcToUse = selectedImageOriginal || processedImageDataUrl
    if (srcToUse) {
      setIsProcessingImage(true)
      try {
        const { dataUrl, sizeKb } = await processImageWithCanvas(srcToUse, newOrientation, centerCrop)
        setProcessedImageDataUrl(dataUrl)
        setImageSizeKb(sizeKb)
      } catch (err) {
        console.error("Erro ao reorientar imagem:", err)
      } finally {
        setIsProcessingImage(false)
      }
    }
  }

  // Remover anexo de imagem
  const handleRemoveImage = () => {
    setSelectedImageOriginal(null)
    setProcessedImageDataUrl(null)
    setImageSizeKb(null)
    setCropPosition({ x: 0.5, y: 0.5 })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Load system users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setStatusBanner(null)
      handleRemoveImage()
    }
  }, [isOpen])

  // Pre-select initial user if provided
  useEffect(() => {
    if (!isOpen) return

    if (initialUserId || initialUserName) {
      if (users.length > 0) {
        const match = findBestMatch(users, initialUserId, initialUserName)
        if (match) {
          setSelectedUserId(match.id)
          if (match.rh_mensagem_destaque) {
            setMessage(match.rh_mensagem_destaque)
          }
          return
        }
        // Fallback: create & insert local option so it is ALWAYS selected for any collaborator
        const fallbackId = initialUserId || `colab_${Date.now()}`
        const fallbackUser: SystemUser = {
          id: fallbackId,
          nome: initialUserName || 'Colaborador',
          funcao: 'Colaborador',
          rh_mensagem_destaque: ''
        }
        setUsers(prev => [fallbackUser, ...prev.filter(u => u.id !== fallbackId)])
        setSelectedUserId(fallbackId)
      }
    }
  }, [isOpen, users, initialUserId, initialUserName])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch("/api/usuarios")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          let mapped: SystemUser[] = data
            .filter((u: any) => {
              const status = String(u.status || 'ATIVO').toUpperCase().trim()
              return status === 'ATIVO' || status === 'ACTIVE'
            })
            .map((u: any) => ({
              id: u.id,
              nome: u.nome || u.username || 'Sem Nome',
              email: u.email || '',
              funcao: u.funcao || u.role || 'Colaborador',
              rh_mensagem_destaque: u.rh_mensagem_destaque || ''
            }))
          mapped.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }))

          if (initialUserId || initialUserName) {
            const match = findBestMatch(mapped, initialUserId, initialUserName)
            if (match) {
              setSelectedUserId(match.id)
              if (match.rh_mensagem_destaque) {
                setMessage(match.rh_mensagem_destaque)
              }
            } else if (initialUserName) {
              const fallbackId = initialUserId || `colab_${Date.now()}`
              const fallbackUser: SystemUser = {
                id: fallbackId,
                nome: initialUserName,
                funcao: 'Colaborador',
                rh_mensagem_destaque: ''
              }
              mapped = [fallbackUser, ...mapped]
              setSelectedUserId(fallbackId)
            }
          }

          setUsers(mapped)
        }
      }
    } catch (err) {
      console.error("Erro ao carregar colaboradores:", err)
    } finally {
      setLoadingUsers(false)
    }
  }

  // When user is selected, prefill their existing message if present
  const handleUserChange = async (userId: string) => {
    setSelectedUserId(userId)
    setStatusBanner(null)
    setActiveCommunicado(null)

    if (!userId) {
      setMessage("")
      handleRemoveImage()
      return
    }

    setLoadingCommunicado(true)
    try {
      const res = await fetch(`/api/rh-mensagens?usuario_id=${userId}`)
      if (res.ok) {
        const data = await res.json()
        const hasMsg = Boolean(data.mensagem && data.mensagem.trim())
        const hasImg = Boolean(data.imagem_url)
        if (hasMsg || hasImg) {
          setActiveCommunicado({
            mensagem: data.mensagem || "",
            imagem_url: data.imagem_url || null,
            imagem_orientacao: data.imagem_orientacao || 'vertical'
          })
          if (hasMsg) setMessage(data.mensagem.trim())
          if (hasImg) {
            setProcessedImageDataUrl(data.imagem_url)
            setOrientation(data.imagem_orientacao === 'horizontal' ? 'horizontal' : 'vertical')
          }
        } else {
          setMessage("")
          handleRemoveImage()
        }
      }
    } catch (_) {
      const found = users.find(u => u.id === userId)
      if (found && found.rh_mensagem_destaque) {
        setMessage(found.rh_mensagem_destaque)
      } else {
        setMessage("")
      }
    } finally {
      setLoadingCommunicado(false)
    }
  }

  const handleCancel = () => {
    setSelectedUserId("")
    setMessage("")
    handleRemoveImage()
    setActiveCommunicado(null)
    setStatusBanner(null)
    onClose()
  }

  const handleSend = async () => {
    if (!selectedUserId) {
      setStatusBanner({ type: 'error', text: 'Por favor, selecione um usuário destinatário.' })
      return
    }

    if (!message.trim() && !processedImageDataUrl) {
      setStatusBanner({ type: 'error', text: 'Escreva uma mensagem ou anexe uma imagem antes de enviar.' })
      return
    }

    setSending(true)
    setStatusBanner(null)

    try {
      const res = await fetch("/api/rh-mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: selectedUserId,
          mensagem: message.trim(),
          imagem_base64: processedImageDataUrl || "",
          orientacao: orientation
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Falha ao enviar mensagem")
      }

      // Update local state list
      setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, rh_mensagem_destaque: message.trim() } : u))
      setActiveCommunicado({
        mensagem: message.trim(),
        imagem_url: processedImageDataUrl || null,
        imagem_orientacao: orientation
      })
      setStatusBanner({ type: 'success', text: 'Mensagem enviada com sucesso!' })

      // Dispatch global event for live updates
      window.dispatchEvent(new Event("shark_hr_celebration_updated"))

      if (onSuccess) onSuccess()

      setTimeout(() => {
        handleCancel()
      }, 1500)
    } catch (err: any) {
      console.error("Erro ao enviar mensagem RH:", err)
      setStatusBanner({ type: 'error', text: err.message || 'Erro ao enviar mensagem.' })
    } finally {
      setSending(false)
    }
  }

  const handleClearMessage = async () => {
    if (!selectedUserId) return
    setSending(true)
    setStatusBanner(null)
    try {
      const res = await fetch("/api/rh-mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: selectedUserId,
          action: "clear_user"
        })
      })
      if (res.ok) {
        setMessage("")
        handleRemoveImage()
        setActiveCommunicado(null)
        setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, rh_mensagem_destaque: "" } : u))
        setStatusBanner({ type: 'success', text: 'Mensagem e imagem do colaborador foram apagadas com sucesso!' })
        window.dispatchEvent(new Event("shark_hr_celebration_updated"))
        if (onSuccess) onSuccess()
      } else {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Erro ao apagar mensagem do colaborador")
      }
    } catch (err: any) {
      console.error("Erro ao limpar mensagem:", err)
      setStatusBanner({ type: 'error', text: err.message || 'Erro ao apagar mensagem do colaborador.' })
    } finally {
      setSending(false)
    }
  }

  const handleClearAllMessages = async () => {
    setSending(true)
    setStatusBanner(null)
    try {
      const res = await fetch("/api/rh-mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear_all" })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Erro ao apagar mensagens")
      }

      setMessage("")
      handleRemoveImage()
      setUsers(prev => prev.map(u => ({ ...u, rh_mensagem_destaque: "" })))
      setStatusBanner({ type: 'success', text: 'Todas as mensagens foram apagadas com sucesso para todos os colaboradores!' })
      window.dispatchEvent(new Event("shark_hr_celebration_updated"))
      if (onSuccess) onSuccess()
    } catch (err: any) {
      console.error("Erro ao apagar todas as mensagens:", err)
      setStatusBanner({ type: 'error', text: err.message || 'Erro ao apagar mensagens.' })
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0F172B] dark:bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Mensagem do RH
              </h3>
              <p className="text-[12px] sm:text-[13px] text-slate-500 dark:text-slate-400 font-medium">
                Envie comunicados, mensagens personalizadas ou imagens comemorativas para a equipe
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar Janela"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40 space-y-4">
          {statusBanner && (
            <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
              statusBanner.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {statusBanner.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <X className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{statusBanner.text}</span>
            </div>
          )}

          {/* Destinatário Selector Dropdown */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Usuário Destinatário:
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              disabled={loadingUsers || sending}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0F172B] dark:focus:ring-amber-500 cursor-pointer transition-all disabled:opacity-50"
            >
              <option value="">-- Selecione o colaborador destinatário --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.funcao}) {u.rh_mensagem_destaque ? '📌 [Possui Mensagem Ativa]' : ''}
                </option>
              ))}
            </select>
            {loadingUsers && (
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 pt-1">
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" /> Carregando lista de colaboradores...
              </p>
            )}
          </div>

          {/* Active Message Alert Notice if selected user has one */}
          {selectedUser && (selectedUser.rh_mensagem_destaque || activeCommunicado) && (
            <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5 min-w-0">
                <p className="font-extrabold text-amber-950 dark:text-amber-200 text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Comunicado Ativo no Dashboard deste Colaborador</span>
                </p>
                <p className="text-amber-900 dark:text-amber-300 text-xs italic truncate">
                  &ldquo;{activeCommunicado?.mensagem || selectedUser.rh_mensagem_destaque || 'Imagem comemorativa ativa'}&rdquo;
                  {activeCommunicado?.imagem_url && ' (+ imagem anexa)'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearMessage}
                disabled={sending}
                className="h-8 px-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold text-[11px] cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                title="Apagar mensagem e imagem enviadas especificamente para este colaborador"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Apagar Deste Colaborador</span>
              </button>
            </div>
          )}

          {/* Textarea for Message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Mensagem Personalizada:
              </label>
              <span className="text-[10px] text-slate-400 font-normal">
                {message.length} caractere(s)
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem para o colaborador (ex: Parabéns pelo excelente trabalho no projeto! / Feliz Aniversário!)..."
              rows={3}
              disabled={sending}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0F172B] dark:focus:ring-amber-500 transition-all resize-none disabled:opacity-50"
            />
          </div>

          {/* Anexo de Imagem (Paisagem 1448x1086 e Vertical 1024x1536 com enquadramento interativo) */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                Imagem Anexa (Opcional):
              </label>

              {/* Seletor de Orientações com proporções solicitadas */}
              <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => handleOrientationChange('vertical')}
                  disabled={sending || isProcessingImage}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[11px] cursor-pointer ${
                    orientation === 'vertical'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700 font-extrabold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Formato Vertical (1024 x 1536 px)"
                >
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Vertical (1024x1536)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleOrientationChange('horizontal')}
                  disabled={sending || isProcessingImage}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all text-[11px] cursor-pointer ${
                    orientation === 'horizontal'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700 font-extrabold'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title="Formato Paisagem (1448 x 1086 px)"
                >
                  <Monitor className="w-3.5 h-3.5 text-sky-600" />
                  <span>Paisagem (1448x1086)</span>
                </button>
              </div>
            </div>

            {/* Input oculto de arquivo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {!processedImageDataUrl ? (
              /* Dropzone / Botão de Seleção */
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-amber-400 bg-white dark:bg-slate-900/60 rounded-xl p-4 text-center transition-all cursor-pointer group"
              >
                {isProcessingImage ? (
                  <div className="flex flex-col items-center justify-center py-2 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Comprimindo e formatando imagem no Canvas...</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:text-amber-600 group-hover:scale-105 transition-transform">
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                      Clique para anexar imagem comemorativa
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Suporta JPG, PNG ou WEBP • Formatos: Paisagem (1448x1086) ou Vertical (1024x1536) • Peso ultraleve (&lt; 180 KB)
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* Pré-visualização com Proporção Real, Ajuste de Enquadramento e Botões */
              <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-end text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={sending || isProcessingImage}
                      className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                      title="Substituir foto"
                    >
                      <RefreshCw className="w-3 h-3" /> Trocar
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      disabled={sending}
                      className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer transition-colors ml-2"
                      title="Remover anexo"
                    >
                      <Trash2 className="w-3 h-3" /> Remover anexo
                    </button>
                  </div>
                </div>

                {/* Box de Pré-visualização com recurso de Clicar, Segurar e Posicionar para Enquadramento */}
                <div className="w-full flex flex-col items-center bg-slate-900 rounded-xl p-3 overflow-hidden select-none">
                  <div
                    ref={previewContainerRef}
                    onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                    onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
                    onMouseUp={handleDragEnd}
                    onMouseLeave={handleDragEnd}
                    onTouchStart={(e) => {
                      if (e.touches[0]) handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
                    }}
                    onTouchMove={(e) => {
                      if (e.touches[0]) handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
                    }}
                    onTouchEnd={handleDragEnd}
                    className={`relative overflow-hidden rounded-lg shadow-inner bg-black cursor-grab active:cursor-grabbing touch-none ${
                      orientation === 'vertical' 
                        ? 'aspect-[1024/1536] max-h-64 w-auto' 
                        : 'aspect-[1448/1086] w-full max-h-56'
                    }`}
                    title="Clique, segure e arraste para posicionar a imagem"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImageOriginal || processedImageDataUrl}
                      alt="Pré-visualização do comunicado"
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none select-none transition-none"
                      style={{
                        objectPosition: `${cropPosition.x * 100}% ${cropPosition.y * 100}%`
                      }}
                    />

                    {/* Dica de posicionamento sobreposta */}
                    <div className="absolute bottom-2 inset-x-2 pointer-events-none flex items-center justify-center">
                      <span className="bg-black/60 backdrop-blur-xs text-white/90 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs border border-white/10">
                        <Move className="w-2.5 h-2.5" />
                        {isDraggingImage ? "Reposicionando..." : "Arraste para enquadrar"}
                      </span>
                    </div>
                  </div>

                  {/* Botão de Centralizar (quando enquadramento foi alterado) */}
                  {(cropPosition.x !== 0.5 || cropPosition.y !== 0.5) && (
                    <div className="w-full flex items-center justify-end pt-2 px-1 text-[11px]">
                      <button
                        type="button"
                        onClick={handleResetCrop}
                        className="text-[10px] font-bold text-amber-400 hover:text-amber-300 underline cursor-pointer"
                        title="Resetar enquadramento ao centro"
                      >
                        Centralizar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="px-5 sm:px-7 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClearAllMessages}
            disabled={sending}
            className="w-full sm:w-auto h-9 px-3.5 text-xs font-bold text-rose-700 hover:text-rose-800 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            title="Apagar todas as mensagens enviadas para todos os colaboradores"
          >
            {sending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600 shrink-0" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            )}
            <span>{sending ? "Apagando..." : "Apagar todas as mensagens"}</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              disabled={sending}
              className="h-10 px-5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !selectedUserId || (!message.trim() && !processedImageDataUrl)}
              className="h-10 px-6 text-xs font-bold bg-[#0F172B] hover:bg-slate-800 text-white rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-[#00D492] shrink-0" />
                  <span>Enviar mensagem</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

