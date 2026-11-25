"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Snowflake, Sparkles } from "lucide-react"

const FLIGHT_INTERVAL_MS = 3 * 60 * 1000 // 3 minutos
const FLIGHT_DURATION_S = 8.5
const INITIAL_DELAY_MS = 3500
const STORAGE_KEY = "sharkconsig_santa_last_flight_at"

export function ChristmasSantaOverlay() {
  const [isFlying, setIsFlying] = useState(false)
  const [flightKey, setFlightKey] = useState(0)
  const [viewportWidth, setViewportWidth] = useState(1440)
  const flightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches
    if (reducedMotion) return

    const clearTimers = () => {
      if (flightTimeoutRef.current) {
        clearTimeout(flightTimeoutRef.current)
        flightTimeoutRef.current = null
      }
      if (endTimeoutRef.current) {
        clearTimeout(endTimeoutRef.current)
        endTimeoutRef.current = null
      }
    }

    const triggerFlight = () => {
      if (document.hidden) {
        const onVisible = () => {
          if (!document.hidden) {
            document.removeEventListener("visibilitychange", onVisible)
            triggerFlight()
          }
        }
        document.addEventListener("visibilitychange", onVisible)
        return
      }

      setViewportWidth(window.innerWidth || 1440)
      setFlightKey((prev) => prev + 1)
      setIsFlying(true)

      try {
        sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
      } catch {
        // Ignora indisponibilidade de storage
      }

      if (endTimeoutRef.current) clearTimeout(endTimeoutRef.current)
      endTimeoutRef.current = setTimeout(() => {
        setIsFlying(false)
        scheduleNext(FLIGHT_INTERVAL_MS)
      }, FLIGHT_DURATION_S * 1000 + 300)
    }

    const scheduleNext = (delayMs: number) => {
      if (flightTimeoutRef.current) clearTimeout(flightTimeoutRef.current)
      flightTimeoutRef.current = setTimeout(triggerFlight, delayMs)
    }

    let initialDelay = INITIAL_DELAY_MS
    try {
      const lastRaw = sessionStorage.getItem(STORAGE_KEY)
      if (lastRaw) {
        const lastTs = Number(lastRaw)
        if (!Number.isNaN(lastTs)) {
          const elapsed = Date.now() - lastTs
          initialDelay = elapsed >= FLIGHT_INTERVAL_MS ? INITIAL_DELAY_MS : FLIGHT_INTERVAL_MS - elapsed
        }
      }
    } catch {
      initialDelay = INITIAL_DELAY_MS
    }

    scheduleNext(initialDelay)

    return () => {
      clearTimers()
    }
  }, [])

  return (
    <AnimatePresence>
      {isFlying && (
        <div
          key={flightKey}
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden select-none"
        >
          <motion.div
            initial={{ x: -380, y: 0, rotate: 2, opacity: 0 }}
            animate={{
              x: [-380, viewportWidth * 0.25, viewportWidth * 0.55, viewportWidth * 0.85, viewportWidth + 380],
              y: [22, -16, 12, -20, 6],
              rotate: [2, -2.5, 1.5, -2, 1],
              opacity: [0, 1, 1, 1, 0],
            }}
            transition={{
              duration: FLIGHT_DURATION_S,
              ease: "easeInOut",
              times: [0, 0.22, 0.5, 0.78, 1],
            }}
            className="absolute top-[11vh] left-0 flex items-center will-change-transform"
          >
            {/* Rastro mágico de brilho e flocos de neve */}
            <div className="flex items-center gap-2 -mr-5 mt-5 opacity-90">
              <motion.span
                animate={{ opacity: [0.25, 0.85, 0.25], scale: [0.8, 1.15, 0.8] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="text-sky-300 drop-shadow-[0_0_6px_rgba(125,211,252,0.8)]"
              >
                <Snowflake className="w-3.5 h-3.5" />
              </motion.span>
              <motion.span
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.25, 0.9] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                className="text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.9)]"
              >
                <Sparkles className="w-4 h-4" />
              </motion.span>
              <motion.span
                animate={{ opacity: [0.3, 0.95, 0.3], y: [0, -4, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                className="text-sky-200 drop-shadow-[0_0_6px_rgba(186,230,253,0.9)]"
              >
                <Snowflake className="w-4 h-4" />
              </motion.span>
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5], scale: [1, 1.3, 1] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.95)]"
              >
                <Sparkles className="w-5 h-5" />
              </motion.span>
            </div>

            {/* Ilustração vetorial: Papai Noel no trenó com renas */}
            <div className="relative flex flex-col items-start">
              <span className="ml-8 mb-0.5 px-2.5 py-0.5 rounded-full bg-red-600/95 text-white text-[10px] font-extrabold tracking-wide shadow-md border border-amber-300/80 whitespace-nowrap">
                Ho! Ho! Ho! Feliz Natal!
              </span>

              <svg
                viewBox="0 0 340 110"
                className="w-[260px] sm:w-[320px] h-auto drop-shadow-[0_6px_14px_rgba(15,23,42,0.22)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Rédeas douradas conectando trenó às renas */}
                <path
                  d="M126 56 Q175 68 214 54"
                  stroke="#FBBF24"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <path
                  d="M126 58 Q210 72 282 50"
                  stroke="#FDE68A"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />

                {/* Trenó - Patins Dourados */}
                <path
                  d="M14 92 H122 C133 92 140 84 136 76 C134 73 130 74 129 77"
                  stroke="#F59E0B"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                <line x1="38" y1="80" x2="34" y2="92" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />
                <line x1="98" y1="80" x2="102" y2="92" stroke="#D97706" strokeWidth="3.5" strokeLinecap="round" />

                {/* Saco de presentes e presentes coloridos */}
                <ellipse cx="42" cy="54" rx="18" ry="15" fill="#92400E" />
                <path d="M36 41 L42 36 L48 41" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="26" y="45" width="12" height="12" rx="2" fill="#10B981" />
                <line x1="32" y1="45" x2="32" y2="57" stroke="#FDE047" strokeWidth="2" />
                <rect x="46" y="42" width="11" height="11" rx="2" fill="#3B82F6" />
                <line x1="51.5" y1="42" x2="51.5" y2="53" stroke="#FFFFFF" strokeWidth="2" />

                {/* Papai Noel */}
                {/* Corpo vermelho */}
                <path d="M62 66 C62 49 74 42 86 44 C96 46 100 56 98 68 Z" fill="#DC2626" />
                {/* Cinto */}
                <rect x="65" y="59" width="32" height="4" rx="1.5" fill="#1E293B" />
                <rect x="78" y="58.5" width="6" height="5" rx="1" fill="#FBBF24" />
                {/* Braço acenando */}
                <path d="M88 49 L103 36" stroke="#DC2626" strokeWidth="6" strokeLinecap="round" />
                <circle cx="105" cy="34" r="3.5" fill="#FFFFFF" />
                {/* Cabeça e barba */}
                <circle cx="79" cy="34" r="9.5" fill="#FDBA74" />
                <path d="M69 36 C69 47 89 47 89 36 C86 41 72 41 69 36 Z" fill="#FFFFFF" />
                {/* Olho e nariz */}
                <circle cx="83" cy="32" r="1.2" fill="#1E293B" />
                <circle cx="86" cy="35" r="1.8" fill="#EF4444" />
                {/* Gorro */}
                <path d="M69 30 C70 18 85 16 91 27 Z" fill="#DC2626" />
                <rect x="68" y="27" width="22" height="4.5" rx="2.2" fill="#FFFFFF" />
                <circle cx="66" cy="24" r="3.5" fill="#FFFFFF" />

                {/* Corpo do Trenó */}
                <path
                  d="M20 55 C20 55 34 78 60 80 H112 C122 80 128 70 126 56 C124 49 116 49 113 56 C109 64 98 64 92 60 L60 60 C44 60 32 52 20 55 Z"
                  fill="#B91C1C"
                />
                <path
                  d="M21 55 C34 52 44 60 60 60 H92 C98 64 109 64 113 56 C116 49 124 49 126 56"
                  stroke="#FBBF24"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />

                {/* Rena 2 (Traseira) */}
                <g transform="translate(178, 32)">
                  {/* Pernas galopando */}
                  <path d="M12 34 L3 46" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M18 35 L14 48" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M34 34 L43 44" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M38 32 L50 38" stroke="#92400E" strokeWidth="3.5" strokeLinecap="round" />
                  {/* Corpo */}
                  <ellipse cx="25" cy="28" rx="16" ry="9" fill="#92400E" />
                  <circle cx="9" cy="24" r="3" fill="#FDE68A" />
                  {/* Pescoço e cabeça */}
                  <path d="M35 24 L43 13" stroke="#92400E" strokeWidth="7" strokeLinecap="round" />
                  <ellipse cx="46" cy="12" rx="7.5" ry="5" fill="#92400E" />
                  {/* Coleira vermelha com sino */}
                  <path d="M35 20 L42 23" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="42" cy="24" r="2" fill="#FBBF24" />
                  {/* Chifres */}
                  <path d="M42 8 L38 0 M40 4 L44 2" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
                  {/* Olho e focinho */}
                  <circle cx="48" cy="10.5" r="1.1" fill="#1E293B" />
                  <circle cx="53" cy="12" r="1.8" fill="#451A03" />
                </g>

                {/* Rena 1 (Líder - Rudolph com nariz vermelho brilhante) */}
                <g transform="translate(248, 24)">
                  {/* Pernas galopando */}
                  <path d="M12 34 L2 46" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M18 35 L15 49" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M34 34 L45 43" stroke="#78350F" strokeWidth="3.5" strokeLinecap="round" />
                  <path d="M38 31 L52 36" stroke="#B45309" strokeWidth="3.5" strokeLinecap="round" />
                  {/* Corpo */}
                  <ellipse cx="25" cy="28" rx="16.5" ry="9" fill="#B45309" />
                  <circle cx="9" cy="24" r="3" fill="#FDE68A" />
                  {/* Pescoço e cabeça */}
                  <path d="M35 24 L44 12" stroke="#B45309" strokeWidth="7" strokeLinecap="round" />
                  <ellipse cx="47" cy="11" rx="8" ry="5" fill="#B45309" />
                  {/* Coleira vermelha com sino */}
                  <path d="M35 19 L43 22" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="43" cy="23" r="2.2" fill="#FBBF24" />
                  {/* Chifres */}
                  <path d="M42 7 L38 -1 M40 3 L45 1" stroke="#F59E0B" strokeWidth="2.2" strokeLinecap="round" />
                  {/* Olho e Nariz Brilhante */}
                  <circle cx="49" cy="9.5" r="1.1" fill="#1E293B" />
                  <circle cx="55.5" cy="11" r="2.8" fill="#EF4444" />
                  <circle cx="55.5" cy="11" r="5" fill="#EF4444" fillOpacity="0.3" />
                </g>
              </svg>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
