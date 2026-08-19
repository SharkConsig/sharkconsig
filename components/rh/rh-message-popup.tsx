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

  const triggerPopup = (msg: string, userId: string) => {
    const cleanMsg = msg.trim()
    const timestampKey = `rh_msg_last_shown_${userId}_${encodeURIComponent(cleanMsg)}`
    const sessionKey = `rh_msg_seen_${userId}_${encodeURIComponent(cleanMsg)}`

    setCurrentMessage(cleanMsg)
    setIsOpen(true)

    const now = Date.now()
    localStorage.setItem(timestampKey, now.toString())
    sessionStorage.setItem(sessionKey, "true")

    // Trigger celebration confetti animation
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.4 }
      })
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    // Check if user has an active rh_mensagem_destaque
    const msg = perfil?.rh_mensagem_destaque
    const userId = perfil?.id || user?.id

    if (!msg || !msg.trim() || !userId) return

    const cleanMsg = msg.trim()
    const timestampKey = `rh_msg_last_shown_${userId}_${encodeURIComponent(cleanMsg)}`
    const sessionKey = `rh_msg_seen_${userId}_${encodeURIComponent(cleanMsg)}`

    const checkAndShow = () => {
      const alreadySeenInSession = sessionStorage.getItem(sessionKey)
      const lastShownStr = localStorage.getItem(timestampKey)
      const lastShown = lastShownStr ? parseInt(lastShownStr, 10) : 0
      const now = Date.now()

      // Show if not yet seen in this session OR if 4 hours have passed since last shown
      if (!alreadySeenInSession || (now - lastShown >= FOUR_HOURS_MS)) {
        triggerPopup(cleanMsg, userId)
      }
    }

    // Check on initial load/navigation
    checkAndShow()

    // Interval to ensure it triggers every 4 hours if the page remains open
    const interval = setInterval(() => {
      const lastShownStr = localStorage.getItem(timestampKey)
      const lastShown = lastShownStr ? parseInt(lastShownStr, 10) : 0
      const now = Date.now()

      if (now - lastShown >= FOUR_HOURS_MS) {
        triggerPopup(cleanMsg, userId)
      }
    }, 60 * 1000) // check every minute

    return () => clearInterval(interval)
  }, [perfil?.rh_mensagem_destaque, perfil?.id, user?.id])

  // Listen for real-time celebration update events (e.g., when RH sends a new message)
  useEffect(() => {
    const handleUpdate = () => {
      const msg = perfil?.rh_mensagem_destaque
      const userId = perfil?.id || user?.id
      if (msg && msg.trim() && userId) {
        triggerPopup(msg.trim(), userId)
      }
    }

    window.addEventListener("shark_hr_celebration_updated", handleUpdate)
    return () => window.removeEventListener("shark_hr_celebration_updated", handleUpdate)
  }, [perfil?.rh_mensagem_destaque, perfil?.id, user?.id])

  if (!isOpen || !currentMessage) return null

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
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform animate-in zoom-in-95 duration-200 cursor-default"
      >
        
        {/* Header Decorator */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-6 py-6 text-slate-950 flex items-center justify-between relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3.5 z-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg border border-amber-400/30 shrink-0">
              <Award className="w-6 h-6 animate-bounce" />
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
        <div className="p-6 sm:p-7 text-center space-y-4 pb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mb-1">
            <MessageSquareText className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Olá, {perfil?.nome?.split(" ")[0] || "Colaborador"}!
            </h4>
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl shadow-inner text-slate-800">
              <p className="text-sm font-bold leading-relaxed italic text-slate-900">
                &ldquo;{currentMessage}&rdquo;
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
