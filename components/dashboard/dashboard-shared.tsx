"use client"

import React, { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { motion } from "motion/react"
import { Loader2, Target, TrendingUp, Kanban } from "lucide-react"
import { cn, formatName } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export interface UserRankingGoalStats {
  goal: number
  produced: number
  remaining: number
  avatar_url?: string
  funcao?: string
}

export interface UserKanbanSummary {
  count: number
  totalProd: number
  loading?: boolean
}

function getInitials(name: string): string {
  const formatted = formatName(name || "")
  const parts = formatted.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return formatted.slice(0, 2).toUpperCase() || "US"
}

export function RankingUserAvatar({
  name,
  avatarUrl,
  sizeClass = "w-8 h-8",
  textClass = "text-[10px]",
  className,
}: {
  name: string
  avatarUrl?: string
  sizeClass?: string
  textClass?: string
  className?: string
}) {
  const formattedName = formatName(name || "")
  const initials = getInitials(formattedName)

  return (
    <Avatar className={cn(sizeClass, "border border-slate-200/80 shadow-2xs shrink-0", className)}>
      {avatarUrl ? (
        <AvatarImage
          src={avatarUrl}
          alt={formattedName}
          className="object-cover"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <AvatarFallback className={cn("bg-[#1C2643]/10 text-[#1C2643] font-black", textClass)}>
        {initials}
      </AvatarFallback>
    </Avatar>
  )
}

export function RankingNameHoverCard({
  userId,
  name,
  avatarUrl,
  funcao,
  goalStats,
  kanbanStats,
  onRequestKanbanStats,
  className,
  children,
}: {
  userId: string
  name: string
  avatarUrl?: string
  funcao?: string
  goalStats?: UserRankingGoalStats
  kanbanStats?: UserKanbanSummary
  onRequestKanbanStats?: (userId: string) => void
  className?: string
  children: React.ReactNode
}) {
  const triggerRef = useRef<HTMLDivElement>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; placement: "top" | "bottom" }>({
    top: 0,
    left: 0,
    placement: "top",
  })

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const cardWidth = 310
    const estimatedHeight = 235
    const margin = 12

    let left = rect.left
    if (left + cardWidth > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - cardWidth - margin)
    }

    const spaceAbove = rect.top
    const placement: "top" | "bottom" = spaceAbove >= estimatedHeight + 16 ? "top" : "bottom"
    const top = placement === "top" ? rect.top - 10 : rect.bottom + 10

    setCoords({ top, left, placement })
  }

  const handleMouseEnter = () => {
    updatePosition()
    setIsOpen(true)
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => {
      if (userId && onRequestKanbanStats) {
        onRequestKanbanStats(userId)
      }
    }, 90)
  }

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current)
      hoverTimerRef.current = null
    }
    setIsOpen(false)
  }

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    }
  }, [])

  const formattedName = formatName(name || "")
  const resolvedAvatar = avatarUrl || goalStats?.avatar_url
  const resolvedRole = funcao || goalStats?.funcao
  const goal = goalStats?.goal ?? 47000
  const produced = goalStats?.produced ?? 0
  const remaining = goalStats?.remaining ?? Math.max(0, goal - produced)
  const pct = goal > 0 ? Math.min(100, Math.round((produced / goal) * 100)) : 0
  const achieved = goal > 0 && remaining <= 0

  return (
    <div
      ref={triggerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn("inline-flex items-center max-w-full cursor-default", className)}
    >
      {children}

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            transform: coords.placement === "top" ? "translateY(-100%)" : "translateY(0)",
            zIndex: 9999,
          }}
          className="pointer-events-none w-[310px] rounded-2xl border border-slate-200/95 bg-white/98 backdrop-blur-md shadow-2xl shadow-[#1C2643]/15 p-4 text-left animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Cabeçalho com Foto à esquerda + Nome */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <RankingUserAvatar
              name={formattedName}
              avatarUrl={resolvedAvatar}
              sizeClass="w-11 h-11"
              textClass="text-xs"
              className="border-2 border-white shadow-sm"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-black text-[#1C2643] leading-tight truncate uppercase">
                {formattedName}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {resolvedRole && (
                  <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider truncate">
                    {resolvedRole}
                  </span>
                )}
                <span
                  className={cn(
                    "text-[9.5px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tight shrink-0",
                    achieved
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/70"
                      : "bg-slate-100 text-[#1C2643]"
                  )}
                >
                  {achieved ? "Meta batida!" : `${pct}% da meta`}
                </span>
              </div>
            </div>
          </div>

          {/* Meta / Produzido / Quanto falta */}
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-bold flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-slate-400" />
                Meta Mensal
              </span>
              <span className="font-black text-[#1C2643]">{formatCurrency(goal)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-bold flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Produzido
              </span>
              <span className="font-black text-emerald-600">{formatCurrency(produced)}</span>
            </div>

            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-bold">Quanto Falta</span>
              <span className={cn("font-black", achieved ? "text-emerald-600" : "text-amber-600")}>
                {achieved ? "Meta batida!" : formatCurrency(remaining)}
              </span>
            </div>

            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  achieved ? "bg-emerald-500" : pct >= 67 ? "bg-blue-500" : pct >= 34 ? "bg-amber-500" : "bg-rose-500"
                )}
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
          </div>

          {/* Resumo do Kanban */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 bg-slate-50/80 -mx-1 px-2.5 py-2 rounded-xl">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Kanban className="w-3.5 h-3.5 text-indigo-500" />
                Oportunidades no Kanban
              </span>
              {kanbanStats?.loading && (
                <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
              )}
            </div>

            {kanbanStats?.loading && kanbanStats.count === 0 ? (
              <p className="text-[10.5px] font-semibold text-slate-400">Consultando leads ativos...</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-lg border border-slate-200/70 px-2 py-1.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Quantidade</p>
                  <p className="text-[12px] font-black text-[#1C2643]">
                    {kanbanStats?.count ?? 0} {(kanbanStats?.count ?? 0) === 1 ? "lead" : "leads"}
                  </p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200/70 px-2 py-1.5">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Produção Leads</p>
                  <p className="text-[12px] font-black text-indigo-600 truncate">
                    {formatCurrency(kanbanStats?.totalProd ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export function DashboardCard({ children, className, id, onClick }: { children: React.ReactNode, className?: string, id?: string, onClick?: () => void }) {
  return (
    <div 
      id={id}
      onClick={onClick}
      className={cn(
        "bg-white p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] border border-slate-200 transition-all duration-500",
        className
      )}
    >
      {children}
    </div>
  )
}

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "R$ 0,00"
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function Gauge({ value, producedValue }: { value: number, producedValue: number }) {
  const segments = 9
  const radius = 70
  const centerX = 90
  const centerY = 90
  
  const getGaugeColor = (val: number) => {
    if (val <= 25) return "#94A3B8" 
    if (val <= 50) return "#EF4444" 
    if (val <= 75) return "#FB923C" 
    if (val <= 90) return "#FACC15" 
    if (val <= 99) return "#86EFAC" 
    return "#10B981" 
  }

  const currentColor = getGaugeColor(value)
  const needleRotation = 180 + (Math.min(100, value) / 100) * 180
  
  const formattedValue = producedValue >= 1000 
    ? `${(producedValue / 1000).toFixed(1).replace('.', ',')}k` 
    : producedValue.toFixed(0)

  return (
    <div className="relative w-full">
      <svg className="w-full" viewBox="-40 -40 260 160">
        {Array.from({ length: segments }).map((_, i) => {
          const startAngle = Math.PI + (i * Math.PI) / segments
          const endAngle = Math.PI + ((i + 1) * Math.PI) / segments
          
          const gap = 0.08
          const x1 = centerX + radius * Math.cos(startAngle + gap)
          const y1 = centerY + radius * Math.sin(startAngle + gap)
          const x2 = centerX + radius * Math.cos(endAngle - gap)
          const y2 = centerY + radius * Math.sin(endAngle - gap)
          
          return (
            <path
              key={`track-${i}`}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="14"
              strokeLinecap="butt"
            />
          )
        })}

        {Array.from({ length: segments }).map((_, i) => {
          const clampedValue = Math.min(100, value)
          const segmentThreshold = (i / segments) * 100
          if (clampedValue < segmentThreshold) return null

          const startAngle = Math.PI + (i * Math.PI) / segments
          const segmentProgress = Math.min(1, Math.max(0, (clampedValue - segmentThreshold) / (100 / segments)))
          const endAngle = startAngle + (segmentProgress * Math.PI) / segments
          
          const gap = 0.08
          const x1 = centerX + radius * Math.cos(startAngle + gap)
          const y1 = centerY + radius * Math.sin(startAngle + gap)
          const x2 = centerX + radius * Math.cos(Math.max(startAngle + gap, endAngle - gap))
          const y2 = centerY + radius * Math.sin(Math.max(startAngle + gap, endAngle - gap))
          
          return (
            <motion.path
              key={`active-${i}`}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
              d={`M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`}
              fill="none"
              stroke={currentColor}
              strokeWidth="14"
              strokeLinecap="butt"
            />
          )
        })}

        <motion.g
          initial={{ rotate: 180 }}
          animate={{ rotate: needleRotation }}
          transition={{ duration: 1.5, type: "spring", stiffness: 40, damping: 12 }}
          style={{ originX: '90px', originY: '90px' }}
        >
          <line
            x1="90"
            y1="90"
            x2="160"
            y2="92"
            stroke="black"
            strokeOpacity="0.05"
            strokeWidth="4"
            transform="translate(2, 2)"
            className="blur-[2px]"
          />
          <line
            x1="90"
            y1="90"
            x2="160"
            y2="90"
            stroke="#1C2643"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="90" cy="90" r="6" fill="#1C2643" stroke="white" strokeWidth="2.5" />
          
          <g transform={`translate(160, 90) rotate(${-needleRotation}, 0, 0)`}>
            <rect 
              x="-22" 
              y="-11" 
              width="44" 
              height="22" 
              rx="6" 
              fill="#1C2643"
              stroke="white"
              strokeWidth="1.5"
            />
            <text
              x="0"
              y="0"
              dominantBaseline="central"
              textAnchor="middle"
              fill="white"
              className="text-[10px] font-black"
            >
              {formattedValue}
            </text>
          </g>
        </motion.g>
      </svg>
    </div>
  )
}
