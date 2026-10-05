"use client"

import React, { useState, useEffect } from "react"
import { Sparkles, X, MessageSquareText, Award } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import confetti from "canvas-confetti"

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000

export function RHMessagePopup() {
  const { perfil, user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<string>("")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical')

  const triggerPopup = (msg: string, img: string | null, orient: 'vertical' | 'horizontal', userId: string, updateKey?: string) => {
    const cleanMsg = (msg || "").trim()
    if (!cleanMsg && !img) return

    const keyToken = updateKey || `${encodeURIComponent(cleanMsg)}_${encodeURIComponent(img || "")}`
    const timestampKey = `rh_msg_last_shown_${userId}_${keyToken}`
    const sessionKey = `rh_msg_seen_${userId}_${keyToken}`

    setCurrentMessage(cleanMsg)
    setImageUrl(img)
    setOrientation(orient === 'horizontal' ? 'horizontal' : 'vertical')
    setIsOpen(true)

    const now = Date.now()
    localStorage.setItem(timestampKey, now.toString())
    sessionStorage.setItem(sessionKey, "true")

    // Trigger celebration confetti animation
    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.4 }
      })
    } catch (e) {
      // ignore
    }
  }

  const checkMessageFromApi = async (userId: string, isManualUpdate = false) => {
    try {
      const res = await fetch(`/api/rh-mensagens?usuario_id=${userId}`)
      if (!res.ok) return
      const data = await res.json()

      const msg = (data.mensagem || "").trim()
      const img = data.imagem_url || null
      const orient = data.imagem_orientacao === 'horizontal' ? 'horizontal' : 'vertical'
      const updatedAt = data.updated_at || ""

      if (!msg && !img) return

      const keyToken = updatedAt || `${encodeURIComponent(msg)}_${encodeURIComponent(img || "")}`
      const timestampKey = `rh_msg_last_shown_${userId}_${keyToken}`
      const sessionKey = `rh_msg_seen_${userId}_${keyToken}`

      if (isManualUpdate) {
        triggerPopup(msg, img, orient, userId, keyToken)
        return
      }

      const alreadySeenInSession = sessionStorage.getItem(sessionKey)
      const lastShownStr = localStorage.getItem(timestampKey)
      const lastShown = lastShownStr ? parseInt(lastShownStr, 10) : 0
      const now = Date.now()

      // Show if not yet seen in this session OR if 4 hours have passed since last shown
      if (!alreadySeenInSession || (now - lastShown >= FOUR_HOURS_MS)) {
        triggerPopup(msg, img, orient, userId, keyToken)
      }
    } catch (e) {
      console.error("Erro ao verificar mensagem do RH:", e)
    }
  }

  useEffect(() => {
    const userId = perfil?.id || user?.id
    if (!userId) return

    checkMessageFromApi(userId, false)

    // Interval to ensure it triggers every 4 hours if the page remains open
    const interval = setInterval(() => {
      checkMessageFromApi(userId, false)
    }, 60 * 1000)

    return () => clearInterval(interval)
  }, [perfil?.id, user?.id, perfil?.rh_mensagem_destaque])

  // Listen for real-time celebration update events (e.g., when RH sends a new message)
  useEffect(() => {
    const handleUpdate = () => {
      const userId = perfil?.id || user?.id
      if (userId) {
        checkMessageFromApi(userId, true)
      }
    }

    window.addEventListener("shark_hr_celebration_updated", handleUpdate)
    return () => window.removeEventListener("shark_hr_celebration_updated", handleUpdate)
  }, [perfil?.id, user?.id])

  if (!isOpen || (!currentMessage && !imageUrl)) return null

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <div 
      onClick={handleClose}
      className="fixed inset-0 bg-slate-900/65 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className={`bg-white border border-slate-200 rounded-3xl shadow-2xl w-full ${
          orientation === 'horizontal' ? 'max-w-lg' : 'max-w-md'
        } overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200 cursor-default max-h-[92vh]`}
      >
        
        {/* Header Decorator */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-5 text-slate-950 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg border border-amber-400/30 shrink-0">
              <Award className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-950 leading-tight">
                Mensagem do RH
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-slate-950/20 hover:bg-slate-950/30 flex items-center justify-center text-slate-950 transition-all cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 text-center space-y-4 overflow-y-auto">
          {/* Saudação */}
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Olá, {perfil?.nome?.split(" ")[0] || "Colaborador"}!
            </h4>
          </div>

          {/* Imagem em Destaque respeitando a Proporção Oficial do Instagram */}
          {imageUrl && (
            <div className="w-full flex justify-center bg-slate-950/90 rounded-2xl p-2.5 shadow-inner overflow-hidden border border-slate-200">
              <div className={`relative overflow-hidden rounded-xl shadow-lg bg-black ${
                orientation === 'vertical' 
                  ? 'aspect-[4/5] max-h-[380px] w-auto' 
                  : 'aspect-[1.91/1] w-full max-h-[300px]'
              }`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Comunicado do RH"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* Mensagem de Texto */}
          {currentMessage && (
            <div className="p-4 bg-amber-50/60 border border-amber-200/70 rounded-2xl shadow-inner text-slate-800 text-left">
              <div className="flex items-start gap-2.5">
                <MessageSquareText className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm font-semibold leading-relaxed italic text-slate-900">
                  &ldquo;{currentMessage}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
