"use client"

import React, { useState, useEffect } from "react"
import { MessageSquare, Send, X, Check, Loader2, User, Sparkles, Trash2 } from "lucide-react"
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

  // Load system users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setStatusBanner(null)
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
  const handleUserChange = (userId: string) => {
    setSelectedUserId(userId)
    setStatusBanner(null)
    const found = users.find(u => u.id === userId)
    if (found && found.rh_mensagem_destaque) {
      setMessage(found.rh_mensagem_destaque)
    } else {
      setMessage("")
    }
  }

  const handleCancel = () => {
    setSelectedUserId("")
    setMessage("")
    setStatusBanner(null)
    onClose()
  }

  const handleSend = async () => {
    if (!selectedUserId) {
      setStatusBanner({ type: 'error', text: 'Por favor, selecione um usuário destinatário.' })
      return
    }

    if (!message.trim()) {
      setStatusBanner({ type: 'error', text: 'Escreva uma mensagem antes de enviar.' })
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
          mensagem: message.trim()
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Falha ao enviar mensagem")
      }

      // Update local state list
      setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, rh_mensagem_destaque: message.trim() } : u))
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
    try {
      const res = await fetch("/api/rh-mensagens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario_id: selectedUserId,
          mensagem: ""
        })
      })
      if (res.ok) {
        setMessage("")
        setUsers(prev => prev.map(u => u.id === selectedUserId ? { ...u, rh_mensagem_destaque: "" } : u))
        setStatusBanner({ type: 'success', text: 'Mensagem removida! O dashboard do colaborador voltou à frase padrão.' })
        window.dispatchEvent(new Event("shark_hr_celebration_updated"))
      }
    } catch (err) {
      console.error("Erro ao limpar mensagem:", err)
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  const selectedUser = users.find(u => u.id === selectedUserId)

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-[#171717] px-6 py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                Mensagens do RH
              </h3>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
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
            <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              Usuário Destinatário:
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => handleUserChange(e.target.value)}
              disabled={loadingUsers || sending}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer transition-all disabled:opacity-50"
            >
              <option value="">-- Selecione o colaborador destinatário --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} ({u.funcao}) {u.rh_mensagem_destaque ? '📌 [Possui Mensagem Ativa]' : ''}
                </option>
              ))}
            </select>
            {loadingUsers && (
              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-amber-500" /> Carregando lista de colaboradores...
              </p>
            )}
          </div>

          {/* Active Message Alert Notice if selected user has one */}
          {selectedUser && selectedUser.rh_mensagem_destaque && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start justify-between gap-2 text-xs">
              <div>
                <p className="font-extrabold text-amber-900 text-[11px] uppercase tracking-wide">
                  Mensagem Ativa Atual no Dashboard:
                </p>
                <p className="text-amber-800 font-medium text-[11px] mt-0.5 italic">
                  "{selectedUser.rh_mensagem_destaque}"
                </p>
              </div>
              <button
                type="button"
                onClick={handleClearMessage}
                disabled={sending}
                className="text-[10px] font-extrabold text-rose-600 hover:text-rose-800 underline shrink-0 cursor-pointer flex items-center gap-1"
                title="Remover mensagem atual"
              >
                <Trash2 className="w-3 h-3" /> Limpar
              </button>
            </div>
          )}

          {/* Textarea for Message */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold uppercase text-slate-700 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Mensagem Personalizada:
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {message.length} caractere(s)
              </span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a mensagem para o colaborador (ex: Parabéns pelo excelente trabalho no projeto! / Feliz Aniversário!)..."
              rows={4}
              disabled={sending}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none disabled:opacity-50"
            />
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={sending}
            className="border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs uppercase px-5 py-2.5 rounded-xl cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSend}
            disabled={sending || !selectedUserId || !message.trim()}
            className="bg-[#171717] hover:bg-black text-white font-bold text-xs uppercase px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 text-amber-400" />
                Enviar Mensagem
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
