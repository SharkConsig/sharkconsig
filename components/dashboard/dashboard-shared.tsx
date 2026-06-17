"use client"

import React from "react"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"

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
    ? `${(producedValue / 1000).toFixed(1)}k` 
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
