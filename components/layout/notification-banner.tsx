"use client"

import React, { useState, useEffect } from "react"
import { AlertCircle, ChevronRight, X } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"

const TARGET_STATUSES = [
  'COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO',
  'COM INCONSISTÊNCIA NO BANCO',
  'PAGAMENTO DEVOLVIDO'
]

export function NotificationBanner() {
  const { isCorretor, user } = useAuth()
  const pathname = usePathname()
  const [proposalsWithIssue, setProposalsWithIssue] = useState<number>(0)
  const [isVisible, setIsVisible] = useState(true)

  // Reset visibility when route changes
  useEffect(() => {
    setIsVisible(true)
  }, [pathname])

  // Reset visibility every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(true)
    }, 10 * 60 * 1000) // 10 minutes

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isCorretor || !user) return

    const fetchCounts = async () => {
      const { count, error } = await supabase
        .from('propostas')
        .select('*', { count: 'exact', head: true })
        .eq('corretor_id', user.id)
        .in('status', TARGET_STATUSES)
      
      if (!error && count !== null) {
        setProposalsWithIssue(count)
      }
    }

    fetchCounts()

    // Real-time subscription
    const channel = supabase
      .channel('propostas_issues_banner')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'propostas',
          filter: `corretor_id=eq.${user.id}`
        },
        () => {
          fetchCounts()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isCorretor, user])

  if (!isCorretor || proposalsWithIssue === 0 || !isVisible) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#F39E1D] text-black/80 border-t border-black/10 z-[200] shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
      <div className="max-w-[1920px] mx-auto px-4 h-12 flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center justify-center gap-3 overflow-hidden">
          <div className="flex items-center gap-2 px-2 py-1 bg-black/10 rounded text-black border border-black/5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">Atenção</span>
          </div>
          <p className="text-[11px] sm:text-[12px] font-bold text-black/80 truncate leading-tight">
            Você possui <span className="text-black font-black underline decoration-black/30 decoration-2 underline-offset-2">{proposalsWithIssue}</span> {proposalsWithIssue === 1 ? 'proposta' : 'propostas'} com pendências que exigem sua atenção.
          </p>
          <Link 
            href="/propostas" 
            className="flex items-center gap-1 text-[11px] sm:text-[12px] font-extrabold text-black hover:text-black/60 transition-colors shrink-0 border-l border-black/10 pl-4 ml-4"
          >
            Ver Detalhes
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="p-1.5 text-black/40 hover:text-black transition-colors shrink-0"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
