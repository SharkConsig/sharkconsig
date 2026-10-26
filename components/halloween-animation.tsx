"use client"

import { useEffect, useRef } from "react"
import { useAuth } from "@/context/auth-context"

export function HalloweenAnimation() {
  const { user, perfil } = useAuth()

  // Validação de permissão do usuário
  // "Só não quero que apareça para 'Corretores do regime PJ', para 'Desenvolvedor' do regime PJ pode aparecer."
  const role = (perfil?.role || user?.user_metadata?.role || user?.user_metadata?.funcao || "").toString().toLowerCase().trim()
  const regime = (perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || "").toString().toLowerCase().trim()

  const isPJ = regime === "pj" || regime.includes("pj")
  const isCorretor = role === "corretor" || role.includes("corretor")
  const isDev = role === "desenvolvedor" || role.includes("desenvolvedor") || role.includes("dev")

  const isBlocked = isCorretor && isPJ && !isDev

  if (isBlocked) {
    return null
  }

  return <WitchMouseFollower />
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
          src="/assets/aistudio/witch-small.png"
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
