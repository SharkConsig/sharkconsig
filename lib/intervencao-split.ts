export interface InterventionParticipantSplit {
  userId: string
  pct: number
  factor: number
}

export interface ResolvedInterventionSplit {
  isActive: boolean
  hasExplicitSplit: boolean
  participants: InterventionParticipantSplit[]
  factorMap: Record<string, number>
}

export interface ProposalSplitInput {
  corretor_id?: string | null
  estagiario_colaborador_id?: string | null
  intervencao_operacional?: boolean | null
  intervencao_operacional_id?: string | null
  intervencao_motivo?: string | null
}

export interface UserRoleLike {
  id?: string
  funcao?: string | null
  role?: string | null
}

export function isSupervisorLikeUser(u?: UserRoleLike | null): boolean {
  if (!u) return false
  const f = (u.funcao || "").trim().toLowerCase()
  const r = (u.role || "").trim().toLowerCase()
  return f === "supervisor" || r === "supervisor"
}

export function stripInterventionTechnicalTags(raw?: string | null): string {
  if (!raw) return ""
  return String(raw)
    .replace(/\[SPLIT_V1:[^\]]*\]/gi, "")
    .replace(/\[?PCT:\[[0-9.,]+\]\]?/gi, "")
    .replace(/^[\s|:-]+|[\s|:-]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

export function parseExplicitInterventionSplit(
  motivo?: string | null
): Array<{ userId: string; pct: number }> | null {
  if (!motivo) return null
  const match = String(motivo).match(/\[SPLIT_V1:([^\]]+)\]/i)
  if (!match || !match[1]) return null

  const parsed: Array<{ userId: string; pct: number }> = []
  const entries = match[1].split(";")
  for (const entry of entries) {
    const [rawId, rawPct] = entry.split("=")
    const userId = (rawId || "").trim()
    const pct = parseFloat((rawPct || "").trim())
    if (userId && !isNaN(pct) && pct > 0) {
      const existing = parsed.find((p) => p.userId === userId)
      if (existing) {
        existing.pct += pct
      } else {
        parsed.push({ userId, pct })
      }
    }
  }

  return parsed.length > 0 ? parsed : null
}

export function encodeInterventionMotivo(
  reasonText: string,
  participants: Array<{ userId: string; pct: number }>
): string {
  const valid = participants
    .map((p) => ({
      userId: (p.userId || "").trim(),
      pct: Math.round(Number(p.pct) * 100) / 100,
    }))
    .filter((p) => p.userId !== "" && !isNaN(p.pct) && p.pct > 0)

  const tag =
    valid.length > 0
      ? `[SPLIT_V1:${valid.map((p) => `${p.userId}=${p.pct}`).join(";")}]`
      : ""

  const cleanReason = stripInterventionTechnicalTags(reasonText)
  if (tag && cleanReason) return `${tag} ${cleanReason}`
  if (tag) return `${tag} Intervenção operacional registrada`
  return cleanReason || "Intervenção operacional registrada"
}

export function resolveProposalInterventionSplit(
  proposal: ProposalSplitInput,
  getUserById?: (id: string) => UserRoleLike | undefined | null
): ResolvedInterventionSplit {
  const brokerId = (proposal.corretor_id || "").trim()
  const op1Id = (proposal.intervencao_operacional_id || "").trim()
  const estId = (proposal.estagiario_colaborador_id || "").trim()
  const isActiveFlag = Boolean(proposal.intervencao_operacional)

  const explicit = isActiveFlag
    ? parseExplicitInterventionSplit(proposal.intervencao_motivo)
    : null

  if (explicit && explicit.length > 0) {
    const participants: InterventionParticipantSplit[] = explicit.map((p) => ({
      userId: p.userId,
      pct: p.pct,
      factor: p.pct / 100,
    }))
    const factorMap: Record<string, number> = {}
    participants.forEach((p) => {
      factorMap[p.userId] = (factorMap[p.userId] || 0) + p.factor
    })
    return {
      isActive: true,
      hasExplicitSplit: true,
      participants,
      factorMap,
    }
  }

  if (isActiveFlag && op1Id !== "") {
    let op2Id: string | null = null
    if (estId !== "" && estId !== brokerId && estId !== op1Id) {
      op2Id = estId
    } else if (proposal.intervencao_motivo && proposal.intervencao_motivo.includes("2º")) {
      const m = proposal.intervencao_motivo.match(/2º [^()]+\(([^)]+)\)/)
      if (m && m[1]) op2Id = m[1].trim()
    }

    const pctMatch = proposal.intervencao_motivo
      ? String(proposal.intervencao_motivo).match(
          /PCT:\[([0-9.]+),([0-9.]+)(?:,([0-9.]+))?\]/
        )
      : null

    const participants: InterventionParticipantSplit[] = []

    if (pctMatch) {
      const pC = parseFloat(pctMatch[1]) || 0
      const pOp1 = parseFloat(pctMatch[2]) || 0
      const pOp2 = parseFloat(pctMatch[3] || "0") || 0
      if (brokerId && pC > 0) {
        participants.push({ userId: brokerId, pct: pC, factor: pC / 100 })
      }
      if (op1Id && pOp1 > 0) {
        participants.push({ userId: op1Id, pct: pOp1, factor: pOp1 / 100 })
      }
      if (op2Id && pOp2 > 0) {
        participants.push({ userId: op2Id, pct: pOp2, factor: pOp2 / 100 })
      }
    } else if (op2Id) {
      const brokerUser = getUserById ? getUserById(brokerId) : null
      // Se o corretor titular é Supervisor (ex.: acompanhando estagiário) e há estagiário + intervenção,
      // o supervisor NÃO entra na divisão: divide 50/50 entre os dois participantes (estagiário e intervenção).
      if (!brokerId || isSupervisorLikeUser(brokerUser)) {
        participants.push({ userId: op2Id, pct: 50, factor: 0.5 })
        participants.push({ userId: op1Id, pct: 50, factor: 0.5 })
      } else {
        participants.push({ userId: brokerId, pct: 34, factor: 0.34 })
        participants.push({ userId: op1Id, pct: 33, factor: 0.33 })
        participants.push({ userId: op2Id, pct: 33, factor: 0.33 })
      }
    } else if (brokerId && brokerId !== op1Id) {
      participants.push({ userId: brokerId, pct: 50, factor: 0.5 })
      participants.push({ userId: op1Id, pct: 50, factor: 0.5 })
    } else {
      participants.push({ userId: op1Id, pct: 100, factor: 1.0 })
    }

    const factorMap: Record<string, number> = {}
    participants.forEach((p) => {
      factorMap[p.userId] = (factorMap[p.userId] || 0) + p.factor
    })

    return {
      isActive: true,
      hasExplicitSplit: false,
      participants,
      factorMap,
    }
  }

  // Sem intervenção ativa: pontua 100% para titular e estagiário regular (acompanhamento)
  const factorMap: Record<string, number> = {}
  const participants: InterventionParticipantSplit[] = []
  if (brokerId) {
    factorMap[brokerId] = 1.0
    participants.push({ userId: brokerId, pct: 100, factor: 1.0 })
  }
  if (estId && estId !== brokerId) {
    factorMap[estId] = 1.0
    participants.push({ userId: estId, pct: 100, factor: 1.0 })
  }

  return {
    isActive: false,
    hasExplicitSplit: false,
    participants,
    factorMap,
  }
}

export function getInterventionBadgeLabel(proposal: ProposalSplitInput): string {
  if (!proposal.intervencao_operacional) return "INTERVENÇÃO OPERACIONAL"
  const explicit = parseExplicitInterventionSplit(proposal.intervencao_motivo)
  if (explicit && explicit.length > 0) {
    const pctSummary = explicit.map((p) => `${Math.round(p.pct)}`).join("/")
    return `INTERVENÇÃO (${pctSummary} ATIVA)`
  }
  return "INTERVENÇÃO ATIVA"
}
