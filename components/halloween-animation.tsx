"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/context/auth-context"

interface HalloweenItem {
  id: number
  type: "witch" | "bat" | "pumpkin" | "skeleton" | "spider" | "ghost"
  symbol: string
  startX: number
  startY: number
  delay: number
  duration: number
  size: number
  wave?: number
  drift?: number
}

export function HalloweenAnimation() {
  const { user, perfil } = useAuth()
  const [isActive, setIsActive] = useState(false)
  const [items, setItems] = useState<HalloweenItem[]>([])

  // Validação de permissão do usuário
  // "Só não quero que apareça para 'Corretores do regime PJ', para 'Desenvolvedor' do regime PJ pode aparecer."
  const role = (perfil?.role || user?.user_metadata?.role || user?.user_metadata?.funcao || "").toString().toLowerCase().trim()
  const regime = (perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || "").toString().toLowerCase().trim()

  const isPJ = regime === "pj" || regime.includes("pj")
  const isCorretor = role === "corretor" || role.includes("corretor")
  const isDev = role === "desenvolvedor" || role.includes("desenvolvedor") || role.includes("dev")

  const isBlocked = isCorretor && isPJ && !isDev

  const triggerAnimation = useCallback(() => {
    // Gerar elementos da revoada de Halloween
    const waveItems: HalloweenItem[] = [
      // 🧙‍♀️ Bruxinha voando em velocidade diagonal
      {
        id: 1,
        type: "witch",
        symbol: "🧙‍♀️",
        startX: -80,
        startY: 22,
        delay: 0.1,
        duration: 5.5,
        size: 56,
        wave: 45,
      },
      // 🦇 Morcegos voando em diferentes alturas
      {
        id: 2,
        type: "bat",
        symbol: "🦇",
        startX: -60,
        startY: 15,
        delay: 0.4,
        duration: 4.8,
        size: 38,
        wave: 35,
      },
      {
        id: 3,
        type: "bat",
        symbol: "🦇",
        startX: 105,
        startY: 32,
        delay: 1.0,
        duration: 4.5,
        size: 44,
        wave: -40,
      },
      {
        id: 4,
        type: "bat",
        symbol: "🦇",
        startX: -70,
        startY: 48,
        delay: 1.8,
        duration: 4.2,
        size: 32,
        wave: 50,
      },
      // 🎃 Abóboras flutuando e subindo
      {
        id: 5,
        type: "pumpkin",
        symbol: "🎃",
        startX: 18,
        startY: 95,
        delay: 0.3,
        duration: 5.0,
        size: 46,
        drift: 60,
      },
      {
        id: 6,
        type: "pumpkin",
        symbol: "🎃",
        startX: 76,
        startY: 92,
        delay: 0.8,
        duration: 5.2,
        size: 52,
        drift: -50,
      },
      // 💀 Esqueletinhos
      {
        id: 7,
        type: "skeleton",
        symbol: "💀",
        startX: 38,
        startY: 95,
        delay: 0.6,
        duration: 5.0,
        size: 40,
        drift: 35,
      },
      {
        id: 8,
        type: "skeleton",
        symbol: "🦴",
        startX: 62,
        startY: 96,
        delay: 1.2,
        duration: 4.6,
        size: 34,
        drift: -30,
      },
      // 🕷️ Aranhas descendo em teia
      {
        id: 9,
        type: "spider",
        symbol: "🕷️",
        startX: 28,
        startY: 0,
        delay: 0.5,
        duration: 4.5,
        size: 36,
      },
      {
        id: 10,
        type: "spider",
        symbol: "🕷️",
        startX: 84,
        startY: 0,
        delay: 1.2,
        duration: 4.8,
        size: 42,
      },
      // 👻 Fantasma
      {
        id: 11,
        type: "ghost",
        symbol: "👻",
        startX: 50,
        startY: 90,
        delay: 0.5,
        duration: 5.5,
        size: 46,
        drift: -40,
      },
    ]

    setItems(waveItems)
    setIsActive(true)

    // Desativa após 6.5s para liberar memória e renderização
    const timeout = setTimeout(() => {
      setIsActive(false)
      setItems([])
    }, 6500)

    return () => clearTimeout(timeout)
  }, [])

  useEffect(() => {
    if (isBlocked) return

    // Disparo inicial após 3 segundos da carga para exibição imediata
    const initialTimer = setTimeout(() => {
      triggerAnimation()
    }, 3000)

    // Repetir a cada 2 minutos (120.000 ms)
    const interval = setInterval(() => {
      triggerAnimation()
    }, 120_000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [isBlocked, triggerAnimation])

  if (isBlocked) {
    return null
  }

  return (
    <>
      {/* 🧙‍♀️ Bruxinha voadora mágica que segue o mouse */}
      <WitchMouseFollower />

      {/* 🎃 Revoada temática a cada 2 minutos */}
      {isActive && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none z-[999999] overflow-hidden select-none"
        >
      <style>{`
        @keyframes hw-fly-left {
          0% {
            transform: translate3d(-100px, 0, 0) rotate(-6deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate3d(50vw, var(--hw-wave, 30px), 0) rotate(6deg) scale(1.08);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate3d(calc(100vw + 120px), calc(var(--hw-wave, 30px) * -1), 0) rotate(-6deg);
            opacity: 0;
          }
        }

        @keyframes hw-fly-right {
          0% {
            transform: translate3d(calc(100vw + 100px), 0, 0) scaleX(-1) rotate(-6deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          50% {
            transform: translate3d(50vw, var(--hw-wave, -30px), 0) scaleX(-1) rotate(6deg) scale(1.08);
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translate3d(-120px, calc(var(--hw-wave, -30px) * -1), 0) scaleX(-1) rotate(-6deg);
            opacity: 0;
          }
        }

        @keyframes hw-float-up {
          0% {
            transform: translate3d(0, 100vh, 0) scale(0.65) rotate(-12deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          50% {
            transform: translate3d(var(--hw-drift, 40px), 45vh, 0) scale(1) rotate(12deg);
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translate3d(calc(var(--hw-drift, 40px) * 1.8), -80px, 0) scale(0.8) rotate(-8deg);
            opacity: 0;
          }
        }

        @keyframes hw-drop-spider {
          0% {
            transform: translate3d(0, -90px, 0);
            opacity: 0;
          }
          20% {
            transform: translate3d(0, 180px, 0);
            opacity: 1;
          }
          45% {
            transform: translate3d(14px, 200px, 0) rotate(14deg);
          }
          70% {
            transform: translate3d(-14px, 190px, 0) rotate(-14deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(0, -90px, 0);
            opacity: 0;
          }
        }

        @keyframes hw-bat-wing {
          0%, 100% {
            transform: scale(1) rotate(0deg);
          }
          50% {
            transform: scale(0.82, 1.22) rotate(-8deg);
          }
        }
      `}</style>

      {items.map((item) => {
        if (item.type === "witch") {
          return (
            <div
              key={item.id}
              style={
                {
                  position: "absolute",
                  top: `${item.startY}vh`,
                  left: 0,
                  fontSize: `${item.size}px`,
                  animation: `hw-fly-left ${item.duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${item.delay}s forwards`,
                  "--hw-wave": `${item.wave || 40}px`,
                  filter: "drop-shadow(0 6px 12px rgba(147, 51, 234, 0.4))",
                } as React.CSSProperties
              }
            >
              <div className="flex items-center">
                <img
                  src="/assets/aistudio/witch-transparent.png"
                  alt="Bruxinha voando"
                  className="w-20 h-auto object-contain select-none pointer-events-none drop-shadow-[0_6px_16px_rgba(0,0,0,0.4)]"
                  draggable={false}
                />
                <span className="text-sm -ml-2 animate-pulse select-none">✨</span>
              </div>
            </div>
          )
        }

        if (item.type === "bat") {
          const isRightToLeft = item.startX > 50
          const animName = isRightToLeft ? "hw-fly-right" : "hw-fly-left"
          return (
            <div
              key={item.id}
              style={
                {
                  position: "absolute",
                  top: `${item.startY}vh`,
                  left: 0,
                  fontSize: `${item.size}px`,
                  animation: `${animName} ${item.duration}s cubic-bezier(0.35, 0.2, 0.25, 1) ${item.delay}s forwards`,
                  "--hw-wave": `${item.wave || 30}px`,
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35))",
                } as React.CSSProperties
              }
            >
              <div
                style={{
                  animation: "hw-bat-wing 0.24s ease-in-out infinite alternate",
                }}
              >
                {item.symbol}
              </div>
            </div>
          )
        }

        if (item.type === "spider") {
          return (
            <div
              key={item.id}
              style={
                {
                  position: "absolute",
                  top: 0,
                  left: `${item.startX}vw`,
                  fontSize: `${item.size}px`,
                  animation: `hw-drop-spider ${item.duration}s ease-in-out ${item.delay}s forwards`,
                  filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))",
                } as React.CSSProperties
              }
            >
              {/* Teia de aranha translúcida */}
              <div
                className="w-[1.5px] bg-slate-400/60 mx-auto"
                style={{ height: "180px", marginBottom: "-8px" }}
              />
              <div>{item.symbol}</div>
            </div>
          )
        }

        // Abóboras, esqueletos e fantasmas subindo/flutuando
        return (
          <div
            key={item.id}
            style={
              {
                position: "absolute",
                bottom: 0,
                left: `${item.startX}vw`,
                fontSize: `${item.size}px`,
                animation: `hw-float-up ${item.duration}s ease-out ${item.delay}s forwards`,
                "--hw-drift": `${item.drift || 40}px`,
                filter:
                  item.type === "pumpkin"
                    ? "drop-shadow(0 6px 12px rgba(249, 115, 22, 0.45))"
                    : "drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25))",
              } as React.CSSProperties
            }
          >
            {item.symbol}
          </div>
        )
      })}
        </div>
      )}
    </>
  )
}

// 🧙‍♀️ Componente da bruxinha mágica que segue o cursor do mouse de forma suave (60 FPS sem re-renders)
function WitchMouseFollower() {
  const witchRef = useRef<HTMLDivElement>(null)
  const posRef = useRef({
    currentX: -100,
    currentY: -100,
    targetX: -100,
    targetY: -100,
    direction: 1, // 1: olhando para a direita, -1: para a esquerda
    isVisible: false,
  })
  const animFrameRef = useRef<number | null>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const pos = posRef.current
      if (e.clientX > pos.targetX + 2) {
        pos.direction = 1
      } else if (e.clientX < pos.targetX - 2) {
        pos.direction = -1
      }

      pos.targetX = e.clientX
      pos.targetY = e.clientY
      pos.isVisible = true

      if (witchRef.current) {
        witchRef.current.style.opacity = "1"
      }
    }

    const handleMouseLeave = () => {
      posRef.current.isVisible = false
      if (witchRef.current) {
        witchRef.current.style.opacity = "0"
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    document.addEventListener("mouseleave", handleMouseLeave)

    let t = 0
    const loop = () => {
      const pos = posRef.current
      if (pos.isVisible && witchRef.current) {
        // Interpolação linear (lerp) com inércia de voo graciosa
        const dx = pos.targetX - pos.currentX
        const dy = pos.targetY - pos.currentY
        pos.currentX += dx * 0.08
        pos.currentY += dy * 0.08

        // Efeito de flutuação ondulante no ar
        t += 0.05
        const bobY = Math.sin(t) * 4.5
        const tilt = Math.max(-16, Math.min(16, dx * 0.22))

        const scaleX = pos.direction === 1 ? 1 : -1
        // Posicionada acompanhando o cursor do mouse
        const renderX = pos.currentX + (pos.direction === 1 ? 14 : -50)
        const renderY = pos.currentY + 8 + bobY

        witchRef.current.style.transform = `translate3d(${renderX}px, ${renderY}px, 0) scaleX(${scaleX}) rotate(${tilt}deg)`
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseleave", handleMouseLeave)
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={witchRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 999998,
        opacity: 0,
        willChange: "transform, opacity",
        transition: "opacity 0.25s ease-out",
      }}
      className="select-none flex items-center"
    >
      <div className="relative">
        <img
          src="/assets/aistudio/witch-transparent.png"
          alt="Bruxinha voando na vassoura"
          className="w-14 h-auto object-contain select-none pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
          draggable={false}
        />
        <span
          className="absolute -left-1 bottom-1 text-xs select-none pointer-events-none animate-pulse"
        >
          ✨
        </span>
      </div>
    </div>
  )
}
