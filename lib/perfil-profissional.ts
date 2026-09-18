import {
  DimensaoCodigo,
  FaixaScore,
  ArquetipoNome,
  ModoAprendizagem,
  QUESTOES_TESTE,
  Questao,
  getQuestoesTeste,
  ARQUETIPOS_MAP,
  ARQUETIPO_INFO,
  DICIONARIO_DIMENSOES,
  COMBINACOES_ARQUETIPOS,
  MODOS_APRENDIZAGEM_INFO,
  PARES_CONSISTENCIA,
  DIMENSOES_INFO
} from "./perfil-profissional-data"

export interface PerfilCalculado {
  rawScores: Record<DimensaoCodigo, number>
  normalizedScores: Record<DimensaoCodigo, number>
  faixas: Record<DimensaoCodigo, FaixaScore>
  dimsOrdenadas: DimensaoCodigo[]
  dimPrimaria: DimensaoCodigo
  dimSecundaria: DimensaoCodigo
  arqPrimario: ArquetipoNome
  arqSecundario: ArquetipoNome
  tipoResultado: string
  resumo: string
  tresForcas: { dimensao: string; texto: string }[]
  pontosAtencao: { dimensao?: string; texto: string }[]
  modoAprendizagem: ModoAprendizagem
  modoAprendizagemInfo: { nome: string; sequencia: string }
  desafioDesenvolvimento: string
  // Consistência interna (somente gestão/admin)
  consistenciaPontos: number
  consistenciaIndice: number
  consistenciaClassificacao: "Alta" | "Adequada" | "Baixa"
  // Guia do Líder
  guiaLider: {
    direcionamento: string
    feedback: string
    cobranca: string
    motivadores: string
    sobPressao: string
    treinamento: string
  }
  // Cartão Rápido (6 linhas)
  cartaoRapido: {
    linha1: string
    linha2: string
    linha3: string
    linha4: string
    linha5: string
    linha6: string
    linha7: string
  }
}

export const ORDEM_DESEMPATE: DimensaoCodigo[] = ["ACT", "RES", "COM", "AUT", "CON", "PRE"]

export function classificarScore(score: number): FaixaScore {
  if (score <= 20) return "Muito baixa"
  if (score <= 40) return "Baixa"
  if (score <= 60) return "Equilibrada"
  if (score <= 80) return "Alta"
  return "Muito alta"
}

export function calcularPerfil(
  respostas: Record<number, string>,
  nomeUsuario: string = "Colaborador",
  questoesOuCargo?: Questao[] | string
): PerfilCalculado {
  const questoes = Array.isArray(questoesOuCargo)
    ? questoesOuCargo
    : typeof questoesOuCargo === "string"
    ? getQuestoesTeste(questoesOuCargo)
    : QUESTOES_TESTE

  const rawScores: Record<DimensaoCodigo, number> = { ACT: 0, COM: 0, CON: 0, PRE: 0, RES: 0, AUT: 0 }
  const minPossible: Record<DimensaoCodigo, number> = { ACT: 0, COM: 0, CON: 0, PRE: 0, RES: 0, AUT: 0 }
  const maxPossible: Record<DimensaoCodigo, number> = { ACT: 0, COM: 0, CON: 0, PRE: 0, RES: 0, AUT: 0 }

  // 1. Min/Max e soma de Raw
  questoes.forEach(q => {
    const dimValores: Record<DimensaoCodigo, number[]> = { ACT: [], COM: [], CON: [], PRE: [], RES: [], AUT: [] }

    q.opcoes.forEach(opt => {
      const p = opt.pesos
      ;(Object.keys(dimValores) as DimensaoCodigo[]).forEach(d => {
        dimValores[d].push(p[d] || 0)
      })
    })

    ;(Object.keys(minPossible) as DimensaoCodigo[]).forEach(d => {
      minPossible[d] += Math.min(...dimValores[d])
      maxPossible[d] += Math.max(...dimValores[d])
    })

    const resp = respostas[q.numero]
    if (resp) {
      const optEscolhida = q.opcoes.find(o => o.letra === resp)
      if (optEscolhida && optEscolhida.pesos) {
        ;(Object.keys(rawScores) as DimensaoCodigo[]).forEach(d => {
          rawScores[d] += optEscolhida.pesos[d] || 0
        })
      }
    }
  })

  // 2. Normalização
  const normalizedScores: Record<DimensaoCodigo, number> = {} as any
  const faixas: Record<DimensaoCodigo, FaixaScore> = {} as any

  ;(Object.keys(rawScores) as DimensaoCodigo[]).forEach(d => {
    const min = minPossible[d]
    const max = maxPossible[d]
    const raw = rawScores[d]
    const val = max > min ? Math.round((100 * (raw - min)) / (max - min)) : 0
    const clamped = Math.max(0, Math.min(100, val))
    normalizedScores[d] = clamped
    faixas[d] = classificarScore(clamped)
  })

  // 3. Desempate: 1) SCORE; 2) RAW; 3) Ordem Fixa
  const dimsOrdenadas = (Object.keys(normalizedScores) as DimensaoCodigo[]).sort((a, b) => {
    if (normalizedScores[b] !== normalizedScores[a]) {
      return normalizedScores[b] - normalizedScores[a]
    }
    if (rawScores[b] !== rawScores[a]) {
      return rawScores[b] - rawScores[a]
    }
    return ORDEM_DESEMPATE.indexOf(a) - ORDEM_DESEMPATE.indexOf(b)
  })

  const dimPrimaria = dimsOrdenadas[0]
  const dimSecundaria = dimsOrdenadas[1]
  const arqPrimario = ARQUETIPOS_MAP[dimPrimaria]
  const arqSecundario = ARQUETIPOS_MAP[dimSecundaria]

  const diff = normalizedScores[dimPrimaria] - normalizedScores[dimSecundaria]
  const tipoResultado = diff <= 5
    ? `Híbrido ${arqPrimario} + ${arqSecundario}`
    : `${arqPrimario} com tendência ${arqSecundario}`

  // Resumo determinístico (Seção 8)
  const parInfoPrimario = ARQUETIPO_INFO[arqPrimario]
  const parInfoSecundario = ARQUETIPO_INFO[arqSecundario]
  const combKey = `${arqPrimario}-${arqSecundario}`
  const leituraComb = COMBINACOES_ARQUETIPOS[combKey] || `${parInfoPrimario.forcas} com ${parInfoSecundario.forcas}`
  const resumo = `${parInfoPrimario.essencia} Sua tendência secundária acrescenta ${parInfoSecundario.forcas.toLowerCase()}, combinando ${leituraComb}.`

  // 4. Modo de Aprendizagem (Q08 e Q31)
  const learn8 = questoes.find(q => q.numero === 8)?.opcoes.find(o => o.letra === respostas[8])?.learn
  const learn31 = questoes.find(q => q.numero === 31)?.opcoes.find(o => o.letra === respostas[31])?.learn

  let modoAprendizagem: ModoAprendizagem = "PRACTICE"
  if (learn8 && learn31 && learn8 === learn31) {
    modoAprendizagem = learn8
  } else {
    const scoreMap: Record<ModoAprendizagem, number> = {
      PRACTICE: Math.max(normalizedScores.ACT, normalizedScores.CON),
      LOGIC: normalizedScores.PRE,
      DISCOVERY: normalizedScores.AUT,
      GUIDED: normalizedScores.COM
    }
    const opcoesDisputa: ModoAprendizagem[] = [learn8, learn31].filter(Boolean) as ModoAprendizagem[]
    if (opcoesDisputa.length > 0) {
      opcoesDisputa.sort((a, b) => {
        if (scoreMap[b] !== scoreMap[a]) return scoreMap[b] - scoreMap[a]
        const prio: ModoAprendizagem[] = ["PRACTICE", "GUIDED", "LOGIC", "DISCOVERY"]
        return prio.indexOf(a) - prio.indexOf(b)
      })
      modoAprendizagem = opcoesDisputa[0]
    }
  }
  const modoAprendizagemInfo = MODOS_APRENDIZAGEM_INFO[modoAprendizagem]

  // 5. Consistência das Respostas (Seção 6)
  let consistenciaPontos = 0
  PARES_CONSISTENCIA.forEach(([qA, qB]) => {
    const itemA = questoes.find(q => q.numero === qA)
    const itemB = questoes.find(q => q.numero === qB)
    const optA = itemA?.opcoes.find(o => o.letra === respostas[qA])
    const optB = itemB?.opcoes.find(o => o.letra === respostas[qB])
    if (!optA || !optB) return

    const entriesA = Object.entries(optA.pesos).sort((x: any, y: any) => y[1] - x[1])
    const entriesB = Object.entries(optB.pesos).sort((x: any, y: any) => y[1] - x[1])

    const primA = entriesA[0]?.[0]
    const secA = entriesA[1]?.[0]
    const primB = entriesB[0]?.[0]
    const secB = entriesB[1]?.[0]

    if (primA && primB && primA === primB) {
      consistenciaPontos += 2
    } else if ((primA && secB && primA === secB) || (primB && secA && primB === secA)) {
      consistenciaPontos += 1
    }
  })
  const consistenciaIndice = Math.round((consistenciaPontos / 24) * 100)
  let consistenciaClassificacao: "Alta" | "Adequada" | "Baixa" = "Baixa"
  if (consistenciaIndice >= 70) consistenciaClassificacao = "Alta"
  else if (consistenciaIndice >= 50) consistenciaClassificacao = "Adequada"

  // 6. Seleção das 3 Forças Naturais (Seção 9)
  const tresForcas = dimsOrdenadas.slice(0, 3).map(d => {
    const fx = faixas[d]
    return {
      dimensao: DIMENSOES_INFO[d].nome,
      texto: DICIONARIO_DIMENSOES[d][fx].forcaPotencial
    }
  })

  // 7. Pontos de Atenção (Seção 9): até 2 dimensões em extremos (0-20 ou 81-100), priorizando maior dist de 50
  const dimExtremas = (Object.keys(normalizedScores) as DimensaoCodigo[])
    .filter(d => normalizedScores[d] <= 20 || normalizedScores[d] >= 81)
    .sort((a, b) => Math.abs(normalizedScores[b] - 50) - Math.abs(normalizedScores[a] - 50))

  let pontosAtencao: { dimensao?: string; texto: string }[] = []
  if (dimExtremas.length > 0) {
    pontosAtencao = dimExtremas.slice(0, 2).map(d => ({
      dimensao: DIMENSOES_INFO[d].nome,
      texto: DICIONARIO_DIMENSOES[d][faixas[d]].riscoPotencial
    }))
  } else {
    pontosAtencao = [{
      dimensao: DIMENSOES_INFO[dimPrimaria].nome,
      texto: parInfoPrimario.riscos
    }]
  }

  // 8. Desafio de Desenvolvimento (Seção 9)
  let desafioDesenvolvimento = ""
  if (dimExtremas.length > 0) {
    const extMaiorDist = dimExtremas[0]
    desafioDesenvolvimento = `Equilibrar ${DIMENSOES_INFO[dimPrimaria].nome} com ${DIMENSOES_INFO[extMaiorDist].nome}.`
  } else {
    desafioDesenvolvimento = parInfoPrimario.desafioPadrao
  }

  // 9. Guia do Líder (Seção 10)
  // Direcionamento: "Como liderar" primário + ação do líder com score mais extremo se diferente
  let dirExtra = ""
  if (dimExtremas.length > 0 && dimExtremas[0] !== dimPrimaria) {
    dirExtra = ` ${DICIONARIO_DIMENSOES[dimExtremas[0]][faixas[dimExtremas[0]]].acaoLider}`
  }
  const direcionamento = `${parInfoPrimario.comoLiderar}${dirExtra}`

  // Feedback (Seção 10)
  let feedback = "Objetivo, claro e focado em resultados."
  if (faixas.ACT === "Alta" || faixas.ACT === "Muito alta") {
    feedback = "Curto, específico e com foco em ação imediata."
  } else if (faixas.PRE === "Alta" || faixas.PRE === "Muito alta") {
    feedback = "Apresente exemplos concretos e critérios objetivos de qualidade."
  } else if (faixas.COM === "Alta" || faixas.COM === "Muito alta") {
    feedback = "Conversa objetiva, dando espaço para resposta e alinhando conclusões."
  } else if (faixas.CON === "Alta" || faixas.CON === "Muito alta") {
    feedback = "Combinado claro com acompanhamento de rotina e cadência."
  } else if (faixas.RES === "Baixa" || faixas.RES === "Muito baixa") {
    feedback = "Individual, próximo e focado em retomada rápida após dificuldades."
  } else if (faixas.AUT === "Alta" || faixas.AUT === "Muito alta") {
    feedback = "Foco em resultado e limites claros, sem microgerenciar o caminho."
  }

  // Cobrança (Seção 10)
  let cobranca = "Sempre: resultado atual → resultado esperado → ação concreta → prazo/checkpoint."
  if (faixas.AUT === "Baixa" || faixas.AUT === "Muito baixa") {
    cobranca += " Incluir o primeiro passo de execução de forma explícita."
  }
  if (faixas.PRE === "Alta" || faixas.PRE === "Muito alta") {
    cobranca += " Incluir critério claro de conferência e qualidade."
  }
  if (faixas.ACT === "Alta" || faixas.ACT === "Muito alta") {
    cobranca += " Limitar prioridades imediatas a 1 ou 2 alvos."
  }

  // Motivadores (Seção 10)
  const motivadores = `${parInfoPrimario.motivador} + ${parInfoSecundario.motivador}`

  // Sob Pressão (Seção 10)
  const sobPressao = `${DICIONARIO_DIMENSOES.RES[faixas.RES].riscoPotencial} Risco associado: ${parInfoPrimario.riscos}`

  // Guia completo
  const guiaLider = {
    direcionamento,
    feedback,
    cobranca,
    motivadores,
    sobPressao,
    treinamento: modoAprendizagemInfo.sequencia
  }

  // 10. Cartão Rápido de Liderança (Seção 11) - Máximo 6 linhas
  const cartaoRapido = {
    linha1: `${nomeUsuario.toUpperCase()} • ${tipoResultado.toUpperCase()}`,
    linha2: `Estimule: ${motivadores}`,
    linha3: `Direcione: ${parInfoPrimario.comoLiderar}`,
    linha4: `Feedback: ${feedback}`,
    linha5: `Aprendizado: ${modoAprendizagemInfo.sequencia}`,
    linha6: `Atenção: ${pontosAtencao[0]?.texto || parInfoPrimario.riscos}`,
    linha7: `Queda de resultado: número → trava → ação → checkpoint`
  }

  return {
    rawScores,
    normalizedScores,
    faixas,
    dimsOrdenadas,
    dimPrimaria,
    dimSecundaria,
    arqPrimario,
    arqSecundario,
    tipoResultado,
    resumo,
    tresForcas,
    pontosAtencao,
    modoAprendizagem,
    modoAprendizagemInfo,
    desafioDesenvolvimento,
    consistenciaPontos,
    consistenciaIndice,
    consistenciaClassificacao,
    guiaLider,
    cartaoRapido
  }
}

// Cálculo do Checkpoint da Liderança - 30 dias (Seções 12 e 13)
export function calcularCheckpointLideranca(
  respostas: Record<string, "A" | "B" | "C" | "D" | "E">,
  perfilInicialFaixas: Record<DimensaoCodigo, FaixaScore>
) {
  const pontuacaoOpcao: Record<string, number | null> = {
    A: 100,
    B: 67,
    C: 33,
    D: 0,
    E: null
  }

  const dimensoes: DimensaoCodigo[] = ["ACT", "COM", "CON", "PRE", "RES", "AUT"]
  const mapeamentoQuestoes: Record<DimensaoCodigo, [string, string]> = {
    ACT: ["C01", "C02"],
    COM: ["C03", "C04"],
    CON: ["C05", "C06"],
    PRE: ["C07", "C08"],
    RES: ["C09", "C10"],
    AUT: ["C11", "C12"]
  }

  const resultadoPorDimensao: Record<DimensaoCodigo, {
    scoreObservado: number | null
    classificacao: "Consolidado" | "Adequado" | "Em desenvolvimento" | "Necessita apoio" | "Sem evidência"
    evidencia: "total" | "parcial" | "sem_evidencia"
    leituraCombinada: string
    orientacao: string
  }> = {} as any

  dimensoes.forEach(d => {
    const [q1, q2] = mapeamentoQuestoes[d]
    const val1 = pontuacaoOpcao[respostas[q1]]
    const val2 = pontuacaoOpcao[respostas[q2]]

    let score: number | null = null
    let evidencia: "total" | "parcial" | "sem_evidencia" = "total"

    if (val1 === null && val2 === null) {
      evidencia = "sem_evidencia"
      score = null
    } else if (val1 !== null && val2 !== null) {
      score = Math.round((val1 + val2) / 2)
      evidencia = "total"
    } else {
      score = val1 !== null ? val1 : val2
      evidencia = "parcial"
    }

    let classificacao: "Consolidado" | "Adequado" | "Em desenvolvimento" | "Necessita apoio" | "Sem evidência" = "Sem evidência"
    if (score !== null) {
      if (score >= 75) classificacao = "Consolidado"
      else if (score >= 50) classificacao = "Adequado"
      else if (score >= 25) classificacao = "Em desenvolvimento"
      else classificacao = "Necessita apoio"
    }

    // Regras qualitativas Perfil Inicial x Comportamento Observado (Seção 13)
    const faixaInicial = perfilInicialFaixas[d] || "Equilibrada"
    let leituraCombinada = "Sem evidência observada"
    let orientacao = "Observar mais situações práticas na rotina."

    if (classificacao !== "Sem evidência") {
      const isInicialAlta = faixaInicial === "Alta" || faixaInicial === "Muito alta"
      const isInicialEquilibrada = faixaInicial === "Equilibrada"
      const isInicialBaixa = faixaInicial === "Baixa" || faixaInicial === "Muito baixa"

      const isObsConsolidado = classificacao === "Consolidado" || classificacao === "Adequado"
      const isObsApoio = classificacao === "Em desenvolvimento" || classificacao === "Necessita apoio"

      if (isInicialAlta && isObsConsolidado) {
        leituraCombinada = "Tendência aparecendo de forma funcional"
        orientacao = "Preservar a força e acompanhar riscos do extremo."
      } else if (isInicialAlta && isObsApoio) {
        leituraCombinada = "Potencial declarado ainda não convertido em comportamento consistente"
        orientacao = "Treinar competência relacionada; reduzir julgamento de 'perfil'."
      } else if (isInicialEquilibrada && classificacao === "Consolidado") {
        leituraCombinada = "Competência construída além de uma preferência natural forte"
        orientacao = "Reconhecer método/treino que está funcionando e manter."
      } else if (isInicialEquilibrada && isObsApoio) {
        leituraCombinada = "Necessidade de desenvolvimento comportamental na função"
        orientacao = "Aplicar ação do líder da faixa observada e novo checkpoint."
      } else if (isInicialBaixa && isObsConsolidado) {
        leituraCombinada = "Boa adaptação: comportamento funcional apesar de menor tendência natural"
        orientacao = "Preservar estrutura que sustenta o comportamento."
      } else if (isInicialBaixa && isObsApoio) {
        leituraCombinada = "A função exige esforço consciente nessa dimensão"
        orientacao = "Criar processo, treino e acompanhamento específico; não rotular incapacidade."
      }
    }

    resultadoPorDimensao[d] = {
      scoreObservado: score,
      classificacao,
      evidencia,
      leituraCombinada,
      orientacao
    }
  })

  return resultadoPorDimensao
}
