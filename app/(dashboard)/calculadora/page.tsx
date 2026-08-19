"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { 
  Calculator, 
  DollarSign, 
  Percent, 
  Calendar, 
  FileText, 
  Share2, 
  Save, 
  Table as TableIcon, 
  ChevronRight, 
  ArrowLeftRight, 
  ArrowLeft,
  HelpCircle,
  Download,
  Printer,
  CheckCircle2,
  Info,
  Pencil
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Header } from "@/components/layout/header"

// Helper function to format BRL currency
function formatBRL(val: number): string {
  if (isNaN(val) || !isFinite(val)) return "R$ 0,00"
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val)
}

// Helper function to format percentage
function formatPercent(val: number, maxDecimals = 4): string {
  if (isNaN(val) || !isFinite(val)) return "0,00%"
  return (val * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals
  }) + "%"
}

// Helper function to mask middle 6 digits of CPF (e.g., 000.***.***-00)
function formatMaskedCPF(rawCpf?: string): string {
  if (!rawCpf) return ""
  const digits = rawCpf.replace(/\D/g, "")
  if (digits.length >= 11) {
    const d = digits.substring(0, 11)
    return `${d.substring(0, 3)}.***.***-${d.substring(9, 11)}`
  }
  if (digits.length >= 3) {
    const end = digits.length > 3 ? digits.substring(digits.length - 2) : "**"
    return `${digits.substring(0, 3)}.***.***-${end}`
  }
  return rawCpf.replace(/^(\d{3})\.?\d{3}\.?\d{3}-?(\d{2})$/, "$1.***.***-$2")
}

// Helper function to parse financial input strings with dots, commas, or integers (e.g. 50.000,00; 50000,00; 50000; 50000.00)
function parseFormattedFloat(val: string | number | undefined | null): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val
  if (!val) return 0
  let str = String(val).trim().replace(/^R\$\s?/, '')
  if (!str) return 0

  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (str.includes(',')) {
    str = str.replace(',', '.')
  } else if (str.includes('.')) {
    const parts = str.split('.')
    if (parts.length > 2) {
      str = str.replace(/\./g, '')
    } else {
      if (parts[1].length === 3 && parts[0].length <= 3) {
        str = str.replace('.', '')
      }
    }
  }

  const num = parseFloat(str)
  return isNaN(num) ? 0 : num
}

// Solver for implicit monthly interest rate 'i' in Price table:
// PMT = PV * [ i * (1 + i)^n ] / [ (1 + i)^n - 1 ]
function calculateImplicitRate(pv: number, pmt: number, n: number): number {
  if (pv <= 0 || pmt <= 0 || n <= 0) return 0
  
  // Simple check: total payments PMT * n must be > PV
  if (pmt * n <= pv) return 0

  let rate = 0.015 // initial guess 1.5% a.m.
  const maxIterations = 100
  const tolerance = 1e-7

  for (let iter = 0; iter < maxIterations; iter++) {
    const compound = Math.pow(1 + rate, n)
    const num = rate * compound
    const den = compound - 1
    const f = pv * (num / den) - pmt

    if (Math.abs(f) < tolerance) {
      break
    }

    // Derivative f'(rate)
    const dCompound = n * Math.pow(1 + rate, n - 1)
    const dNum = compound + rate * dCompound
    const dDen = dCompound
    const df = pv * ((dNum * den - num * dDen) / (den * den))

    if (Math.abs(df) < 1e-12) break
    const nextRate = rate - f / df

    if (nextRate <= 0) {
      rate = rate / 2
    } else {
      rate = nextRate
    }
  }

  return rate
}

interface DynamicAmortMonth {
  month: number;
  fixedParcela: number;
  amortNums: number[];
  amortVals: number[];
  sumAmortVals: number;
  totalMes: number;
}

function calculateDynamicAmortizationPlan(
  prazoTotal: number,
  term: number,
  parcela: number,
  rateForAmort: number = 0.05,
  graceMonths: number = 0
): DynamicAmortMonth[] {
  if (term <= 0 || parcela <= 0) {
    return []
  }

  if (prazoTotal <= term) {
    const rows: DynamicAmortMonth[] = []
    for (let m = 1; m <= term; m++) {
      rows.push({
        month: m,
        fixedParcela: parcela,
        amortNums: [],
        amortVals: [],
        sumAmortVals: 0,
        totalMes: parcela
      })
    }
    return rows
  }

  // Pre-calculate present value for each back installment from prazoTotal down to (term + 1)
  // e.g. for prazoTotal=96 and term=24, installments 96 down to 25
  const amortInstallments: { num: number; val: number }[] = []
  for (let k = prazoTotal; k > term; k--) {
    const val = Math.max(0, parcela / Math.pow(1 + rateForAmort, k))
    amortInstallments.push({ num: k, val })
  }

  const N = amortInstallments.length
  const actualGraceMonths = (graceMonths > 0 && term > graceMonths) ? graceMonths : 0
  const T = term - actualGraceMonths

  const schedule: DynamicAmortMonth[] = []

  // Add initial grace months (if any) with fixed parcela only
  for (let m = 1; m <= actualGraceMonths; m++) {
    schedule.push({
      month: m,
      fixedParcela: parcela,
      amortNums: [],
      amortVals: [],
      sumAmortVals: 0,
      totalMes: parcela
    })
  }

  if (N === 0 || T <= 0) {
    for (let m = actualGraceMonths + 1; m <= term; m++) {
      schedule.push({
        month: m,
        fixedParcela: parcela,
        amortNums: [],
        amortVals: [],
        sumAmortVals: 0,
        totalMes: parcela
      })
    }
    return schedule
  }

  // If N < T (fewer installments than active months) or simple edge case
  if (N < T) {
    for (let m = 1; m <= T; m++) {
      const monthNums: number[] = []
      const monthVals: number[] = []
      let monthSum = 0

      if (m - 1 < N) {
        monthNums.push(amortInstallments[m - 1].num)
        monthVals.push(amortInstallments[m - 1].val)
        monthSum += amortInstallments[m - 1].val
      }

      schedule.push({
        month: actualGraceMonths + m,
        fixedParcela: parcela,
        amortNums: monthNums,
        amortVals: monthVals,
        sumAmortVals: monthSum,
        totalMes: parcela + monthSum
      })
    }
    return schedule
  }

  // Prefix sums of installment values: P[i] = sum of first i installments
  const P = new Float64Array(N + 1)
  for (let i = 0; i < N; i++) {
    P[i + 1] = P[i] + amortInstallments[i].val
  }

  const totalAmortSum = P[N]
  const targetMonthlyAmort = totalAmortSum / T

  // Dynamic Programming optimization to partition N installments into T active months
  // Objective 1 (Primary): Minimize the maximum monthly Total (or max monthly amort sum)
  // Objective 2 (Secondary): Minimize the sum of squared deviations from the ideal average
  interface DPState {
    maxPeak: number;
    sumSqDiff: number;
    prevIndex: number;
  }

  const dp: (DPState | null)[][] = Array.from({ length: T + 1 }, () => Array(N + 1).fill(null))

  // Base case: Month 1 of active distribution
  for (let i = 1; i <= N - (T - 1); i++) {
    const sumVal = P[i]
    dp[1][i] = {
      maxPeak: sumVal,
      sumSqDiff: Math.pow(sumVal - targetMonthlyAmort, 2),
      prevIndex: 0
    }
  }

  // DP Transitions: Month m = 2..T
  for (let m = 2; m <= T; m++) {
    const minI = m
    const maxI = N - (T - m)

    for (let i = minI; i <= maxI; i++) {
      const minJ = m - 1
      const maxJ = i - 1

      let bestState: DPState | null = null

      for (let j = minJ; j <= maxJ; j++) {
        const prevState = dp[m - 1][j]
        if (!prevState) continue

        const currentMonthSum = P[i] - P[j]
        const candidatePeak = Math.max(prevState.maxPeak, currentMonthSum)
        const candidateSumSq = prevState.sumSqDiff + Math.pow(currentMonthSum - targetMonthlyAmort, 2)

        if (!bestState) {
          bestState = {
            maxPeak: candidatePeak,
            sumSqDiff: candidateSumSq,
            prevIndex: j
          }
        } else {
          // Compare candidate with bestState
          const peakDiff = candidatePeak - bestState.maxPeak
          if (peakDiff < -0.01) {
            bestState = {
              maxPeak: candidatePeak,
              sumSqDiff: candidateSumSq,
              prevIndex: j
            }
          } else if (Math.abs(peakDiff) <= 0.01) {
            if (candidateSumSq < bestState.sumSqDiff) {
              bestState = {
                maxPeak: candidatePeak,
                sumSqDiff: candidateSumSq,
                prevIndex: j
              }
            }
          }
        }
      }

      dp[m][i] = bestState
    }
  }

  // Reconstruct partition boundaries
  const monthBoundaries: number[] = new Array(T + 1)
  monthBoundaries[T] = N
  let curr = N
  for (let m = T; m >= 2; m--) {
    const state = dp[m][curr]
    if (state && typeof state.prevIndex === 'number') {
      curr = state.prevIndex
      monthBoundaries[m - 1] = curr
    } else {
      curr = Math.max(0, Math.min(curr - 1, m - 1))
      monthBoundaries[m - 1] = curr
    }
  }
  monthBoundaries[0] = 0

  for (let m = 1; m <= T; m++) {
    const startIdx = Math.max(0, Math.min(N, monthBoundaries[m - 1]))
    const endIdx = Math.max(startIdx, Math.min(N, monthBoundaries[m]))

    const monthNums: number[] = []
    const monthVals: number[] = []
    let monthSum = 0

    for (let idx = startIdx; idx < endIdx; idx++) {
      if (amortInstallments[idx]) {
        monthNums.push(amortInstallments[idx].num)
        monthVals.push(amortInstallments[idx].val)
        monthSum += amortInstallments[idx].val
      }
    }

    schedule.push({
      month: actualGraceMonths + m,
      fixedParcela: parcela,
      amortNums: monthNums,
      amortVals: monthVals,
      sumAmortVals: monthSum,
      totalMes: parcela + monthSum
    })
  }

  return schedule
}

interface CalculadoraPageProps {
  clientMargins?: {
    principal: number;
    cartaoConsignado: number;
    cartaoBeneficio: number;
  };
  isEmbedded?: boolean;
  client?: any;
  orgao?: string;
  onProposalSaved?: () => void;
}

export default function CalculadoraPage({ clientMargins, isEmbedded, client: passedClient, orgao: passedOrgao, onProposalSaved }: CalculadoraPageProps = {}) {
  const { perfil, isAdmin } = useAuth()

  const [clienteNome, setClienteNome] = useState<string>(passedClient?.nome || "")
  const lastSavedProposalRef = useRef<{ key: string; time: number } | null>(null)

  useEffect(() => {
    if (passedClient?.nome) {
      setClienteNome(passedClient.nome)
    }
  }, [passedClient?.nome])

  useEffect(() => {
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("calculator_proposals_channel") : null;

    const saveProposal = async (proposalData: any) => {
      try {
        const cleanCpf = proposalData.cliente_cpf ? String(proposalData.cliente_cpf).replace(/\D/g, "") : (passedClient?.cpf ? String(passedClient.cpf).replace(/\D/g, "") : "");
        const nome = proposalData.cliente_nome || passedClient?.nome || "";
        const valContrato = Number(proposalData.valor_contrato) || 0;
        const prazo = Number(proposalData.prazo_estrategia) || 0;
        const pmMedia = Number(proposalData.parcela_media) || 0;
        const taxa = Number(proposalData.taxa_am) || 0;

        const dedupeKey = `${cleanCpf}_${nome}_${valContrato}_${prazo}_${pmMedia}_${taxa}`;
        const now = Date.now();

        if (lastSavedProposalRef.current && lastSavedProposalRef.current.key === dedupeKey && (now - lastSavedProposalRef.current.time) < 4000) {
          return;
        }

        lastSavedProposalRef.current = { key: dedupeKey, time: now };

        const { data: authData } = await supabase.auth.getUser();
        const activeUser = authData?.user;

        const payloadToInsert = {
          cliente_cpf: cleanCpf,
          cliente_nome: nome,
          user_id: activeUser?.id || null,
          user_nome: perfil?.nome || "",
          user_email: activeUser?.email || perfil?.email || "",
          telefone_consultor: (perfil as any)?.telefone || "",
          valor_contrato: valContrato,
          prazo_estrategia: prazo,
          parcela_media: pmMedia,
          taxa_am: taxa,
          tipo_arquivo: proposalData.tipo_arquivo || "PDF",
          arquivo_url: proposalData.arquivo_url || null
        };

        const { error } = await supabase
          .from("historico_proposta_comercial_calculadora")
          .insert(payloadToInsert);

        if (error) {
          console.error("Erro ao salvar no Supabase (historico_proposta_comercial_calculadora):", error);
        } else {
          if (onProposalSaved) {
            onProposalSaved();
          }
        }
      } catch (err) {
        console.error("Erro ao salvar histórico de proposta calculadora:", err);
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "SAVE_CALCULATOR_PROPOSAL") {
        saveProposal(event.data.payload);
      }
    };

    window.addEventListener("message", handleMessage);

    if (channel) {
      channel.onmessage = (event) => {
        if (event.data && event.data.type === "SAVE_CALCULATOR_PROPOSAL") {
          saveProposal(event.data.payload);
        }
      };
    }

    (window as any).saveCalculatorProposal = saveProposal;

    return () => {
      window.removeEventListener("message", handleMessage);
      if (channel) channel.close();
    };
  }, [perfil, onProposalSaved, passedClient]);

  // Active view state
  const [activeTab, setActiveTab] = useState<string>("liberacao")

  // Premissas Inputs
  const [parcelaInput, setParcelaInput] = useState<string>("")
  const parcela = useMemo(() => parseFormattedFloat(parcelaInput), [parcelaInput])

  const [coeficienteInput, setCoeficienteInput] = useState<string>("")
  const coeficiente = useMemo(() => parseFormattedFloat(coeficienteInput), [coeficienteInput])

  const [prazoInput, setPrazoInput] = useState<string>("")
  const prazo = useMemo(() => parseFormattedFloat(prazoInput), [prazoInput])

  const [iofPercent, setIofPercent] = useState<number>(5)
  const [valorBolsoInput, setValorBolsoInput] = useState<string>("")
  const valorBolso = useMemo(() => parseFormattedFloat(valorBolsoInput), [valorBolsoInput])
  const [valorLiberadoInput, setValorLiberadoInput] = useState<string>("")

  // Selected plan term in grid
  const [selectedPlanTerm, setSelectedPlanTerm] = useState<number | null>(null)

  // Modals state for Plano de Amortização
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false)
  const [showChangePlanModal, setShowChangePlanModal] = useState<boolean>(false)

  // Show full summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false)

  // Modals state for Comparativo de Planos
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false)
  const [selectedCompareTerms, setSelectedCompareTerms] = useState<number[]>([24, 48, 72])
  const [compareWarning, setCompareWarning] = useState<string | null>(null)

  // Portabilidade da Liberação Inputs & State
  const [novaTaxaInput, setNovaTaxaInput] = useState<string>("")
  const [novoPrazoInput, setNovoPrazoInput] = useState<string>("")
  const [amortizacaoPosPort, setAmortizacaoPosPort] = useState<boolean>(false)
  const [valorClientePortInput, setValorClientePortInput] = useState<string>("")

  const novaTaxaDecimal = useMemo(() => parseFormattedFloat(novaTaxaInput) / 100, [novaTaxaInput])
  const novoPrazo = useMemo(() => parseFormattedFloat(novoPrazoInput), [novoPrazoInput])
  const valorClientePort = useMemo(() => parseFormattedFloat(valorClientePortInput), [valorClientePortInput])

  // Calculadora do Cidadão (BACEN) State
  const [cidadaoPvInput, setCidadaoPvInput] = useState<string>("")
  const [cidadaoPmtInput, setCidadaoPmtInput] = useState<string>("")
  const [cidadaoPrazoInput, setCidadaoPrazoInput] = useState<string>("")
  const [cidadaoTaxaInput, setCidadaoTaxaInput] = useState<string>("")

  const cidadaoCalculo = useMemo(() => {
    const hasPv = cidadaoPvInput.trim() !== ""
    const hasPmt = cidadaoPmtInput.trim() !== ""
    const hasPrazo = cidadaoPrazoInput.trim() !== ""
    const hasTaxa = cidadaoTaxaInput.trim() !== ""

    const count = (hasPv ? 1 : 0) + (hasPmt ? 1 : 0) + (hasPrazo ? 1 : 0) + (hasTaxa ? 1 : 0)

    if (count !== 3) {
      return { status: "invalid_count" as const }
    }

    const pv = parseFormattedFloat(cidadaoPvInput)
    const pmt = parseFormattedFloat(cidadaoPmtInput)
    const n = parseFormattedFloat(cidadaoPrazoInput)
    const i_perc = parseFormattedFloat(cidadaoTaxaInput)
    const i = i_perc / 100

    if (!hasPmt) {
      if (pv <= 0 || n <= 0 || i <= 0) return { status: "error" as const }
      const compound = Math.pow(1 + i, n)
      const pmtCalc = pv * ((i * compound) / (compound - 1))
      return {
        status: "success" as const,
        label: "PARCELA ENCONTRADO",
        value: formatBRL(pmtCalc)
      }
    }

    if (!hasPv) {
      if (pmt <= 0 || n <= 0 || i <= 0) return { status: "error" as const }
      const compound = Math.pow(1 + i, n)
      const pvCalc = pmt * ((compound - 1) / (i * compound))
      return {
        status: "success" as const,
        label: "VALOR FINANCIADO / SALDO ENCONTRADO",
        value: formatBRL(pvCalc)
      }
    }

    if (!hasPrazo) {
      if (pv <= 0 || pmt <= 0 || i <= 0) return { status: "error" as const }
      if (pmt <= pv * i) return { status: "error" as const }
      const nCalc = Math.log(pmt / (pmt - pv * i)) / Math.log(1 + i)
      const nExato = nCalc.toFixed(2)
      const nArred = Math.round(nCalc)
      return {
        status: "success" as const,
        label: "PRAZO ENCONTRADO",
        value: `${nArred} meses (exato: ${nExato})`
      }
    }

    if (!hasTaxa) {
      if (pv <= 0 || pmt <= 0 || n <= 0) return { status: "error" as const }
      const iCalc = calculateImplicitRate(pv, pmt, n)
      if (iCalc <= 0) return { status: "error" as const }
      const iPerc = iCalc * 100
      const formattedRate = iPerc.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + "% a.m."
      return {
        status: "success" as const,
        label: "TAXA ENCONTRADO",
        value: formattedRate
      }
    }

    return { status: "error" as const }
  }, [cidadaoPvInput, cidadaoPmtInput, cidadaoPrazoInput, cidadaoTaxaInput])

  // Calculations:
  // 1. Valor Liberado & Contrato + IOF
  const valorLiberado = useMemo(() => {
    if (coeficiente <= 0) return 0
    return parcela / coeficiente
  }, [parcela, coeficiente])

  const contratoComIof = useMemo(() => {
    return valorLiberado * (1 + iofPercent / 100)
  }, [valorLiberado, iofPercent])

  const totalAPagar = useMemo(() => {
    return parcela * prazo
  }, [parcela, prazo])

  const totalJuros = useMemo(() => {
    return Math.max(0, totalAPagar - valorLiberado)
  }, [totalAPagar, valorLiberado])

  // 2. Taxa Implícita (i)
  const taxaImplicita = useMemo(() => {
    return calculateImplicitRate(contratoComIof, parcela, prazo)
  }, [contratoComIof, parcela, prazo])

  // 3. Price Amortization Schedule (Base do contrato)
  const tabelaPrice = useMemo(() => {
    if (contratoComIof <= 0 || taxaImplicita <= 0 || prazo <= 0) return []
    
    const rows = []
    let saldo = contratoComIof

    for (let m = 1; m <= prazo; m++) {
      const juros = saldo * taxaImplicita
      const principal = Math.min(saldo, parcela - juros)
      const novoSaldo = Math.max(0, saldo - principal)

      rows.push({
        pmtNum: m,
        parcela: parcela,
        principal: principal,
        juros: juros,
        saldoDevedor: novoSaldo,
        saldoInicial: saldo
      })

      saldo = novoSaldo
    }

    return rows
  }, [contratoComIof, taxaImplicita, parcela, prazo])

  // 5. Antecipação / Resumo Amortização (calculado com base nas parcelas do contrato original)
  const temAntecipacao = valorBolso > 0
  const resumoAmortizacao = useMemo(() => {
    if (!temAntecipacao || tabelaPrice.length === 0) {
      return null
    }

    const valorAntecipacao = Math.max(0, valorLiberado - valorBolso)

    let parcelasQuitadas = 0
    let quantoAntecipado = 0
    let remanescentes = prazo
    let acumuladoPV = 0

    for (let q = 1; q <= prazo; q++) {
      const mesContrato = prazo - q + 1
      const valPresenteParcela = taxaImplicita > 0 
        ? parcela / Math.pow(1 + taxaImplicita, mesContrato)
        : parcela

      if (acumuladoPV + valPresenteParcela <= valorAntecipacao + 0.01) {
        acumuladoPV += valPresenteParcela
        parcelasQuitadas = q
        quantoAntecipado = acumuladoPV
        remanescentes = prazo - q
      } else {
        break
      }
    }

    const saldoParaPort = Math.max(0, contratoComIof - quantoAntecipado)

    return {
      valorAntecipacao,
      quantoAntecipado,
      parcelasQuitadas,
      remanescentes,
      saldoParaPort
    }
  }, [temAntecipacao, valorLiberado, valorBolso, contratoComIof, taxaImplicita, parcela, prazo, tabelaPrice])

  // 4. Plano de Amortização (Term options: 12x, 24x, 36x, 48x, 60x, 72x, 84x, 96x, 120x)
  const planosAmortizacao = useMemo(() => {
    const roundCoef = Math.round(coeficiente * 100000) / 100000
    const isSpecialCoef = roundCoef >= 0.039 && roundCoef <= 0.0455

    const rawTerms = isSpecialCoef
      ? [12, 24, prazo]
      : [12, 24, 36, 48, 60, 72, 84, 96, 120]
    
    const terms = Array.from(new Set(rawTerms.filter(t => t > 0)))

    return terms
      .filter(t => t <= prazo)
      .map(t => {
        if (isSpecialCoef && (t === 12 || t === 24)) {
          const specialRate = t === 12 ? 0.0082 : 0.0096
          const calcParcelaMedia = t === 12 
            ? parcela * (1 + 1.0289) 
            : parcela * (1 + 0.0816)

          const calcTotalPagar = calcParcelaMedia * t

          return {
            term: t,
            taxa: specialRate,
            parcelaMedia: calcParcelaMedia,
            totalPagar: calcTotalPagar,
            invalido: false
          }
        }

        if (t === prazo) {
          return {
            term: t,
            taxa: taxaImplicita,
            parcelaMedia: parcela,
            totalPagar: parcela * t,
            invalido: false
          }
        }

        // Calculate dynamic plan minimizing max monthly total and smoothing variance
        const dynPlan = calculateDynamicAmortizationPlan(prazo, t, parcela, taxaImplicita)
        const sumTotalMes = dynPlan.reduce((acc, row) => acc + row.totalMes, 0)
        const pmtMedia = t > 0 ? sumTotalMes / t : 0
        const rateN = calculateImplicitRate(contratoComIof, pmtMedia, t)
        const tx2Dec = Math.round(rateN * 10000) / 10000

        let calcParcelaMedia = pmtMedia
        if (t !== prazo) {
          const pv = valorLiberado
          if (tx2Dec > 0 && t > 0) {
            const compound = Math.pow(1 + tx2Dec, t)
            calcParcelaMedia = pv * ((tx2Dec * compound) / (compound - 1))
          } else if (t > 0) {
            calcParcelaMedia = pv / t
          }
        }

        return {
          term: t,
          taxa: Math.max(0, rateN),
          parcelaMedia: calcParcelaMedia,
          totalPagar: calcParcelaMedia * t,
          invalido: false
        }
      })
  }, [valorLiberado, contratoComIof, taxaImplicita, parcela, prazo, totalAPagar, coeficiente])

  const selectedPlanObj = useMemo(() => {
    return planosAmortizacao.find(p => p.term === selectedPlanTerm) || planosAmortizacao[0]
  }, [planosAmortizacao, selectedPlanTerm])

  const activeResult = useMemo(() => {
    if (resumoAmortizacao) {
      const prz = resumoAmortizacao.remanescentes
      const totPagar = prz * parcela
      const totJuros = Math.max(0, totPagar - resumoAmortizacao.saldoParaPort)
      return {
        labelParcela: "Parcela",
        parcela: parcela,
        taxa: taxaImplicita,
        prazo: prz,
        totalAPagar: totPagar,
        totalJuros: totJuros
      }
    }

    if (selectedPlanTerm && selectedPlanObj && !selectedPlanObj.invalido && valorBolso <= 0) {
      const prz = selectedPlanObj.term
      const tx = selectedPlanObj.taxa
      const tx2Dec = Math.round(tx * 10000) / 10000
      let pmt = selectedPlanObj.term === prazo ? parcela : selectedPlanObj.parcelaMedia

      if (prz !== prazo) {
        const roundCoef = Math.round(coeficiente * 100000) / 100000
        const isSpecialCoef = roundCoef >= 0.039 && roundCoef <= 0.0455
        if (isSpecialCoef) {
          pmt = selectedPlanObj.parcelaMedia
        } else {
          const pv = valorLiberado
          if (tx2Dec > 0 && prz > 0) {
            const compound = Math.pow(1 + tx2Dec, prz)
            pmt = pv * ((tx2Dec * compound) / (compound - 1))
          } else if (prz > 0) {
            pmt = pv / prz
          }
        }
      }

      const totPagar = selectedPlanObj.totalPagar
      const totJuros = Math.max(0, totPagar - valorLiberado)
      return {
        labelParcela: prz === prazo ? "Parcela" : "Parcela média",
        parcela: pmt,
        taxa: tx2Dec,
        prazo: prz,
        totalAPagar: totPagar,
        totalJuros: totJuros
      }
    }

    return {
      labelParcela: "Parcela",
      parcela: parcela,
      taxa: taxaImplicita,
      prazo: prazo,
      totalAPagar: totalAPagar,
      totalJuros: totalJuros
    }
  }, [selectedPlanTerm, selectedPlanObj, valorBolso, parcela, taxaImplicita, prazo, totalAPagar, totalJuros, valorLiberado, resumoAmortizacao])

  const activeTabelaPrice = useMemo(() => {
    const pmt = activeResult.parcela
    const tx = activeResult.taxa
    const prz = activeResult.prazo

    if (contratoComIof <= 0 || tx <= 0 || prz <= 0) return []
    
    const rows = []
    let saldo = contratoComIof

    for (let m = 1; m <= prz; m++) {
      const juros = saldo * tx
      const principal = Math.min(saldo, pmt - juros)
      const novoSaldo = Math.max(0, saldo - principal)

      rows.push({
        pmtNum: m,
        parcela: pmt,
        principal: principal,
        juros: juros,
        saldoDevedor: novoSaldo,
        saldoInicial: saldo
      })

      saldo = novoSaldo
    }

    return rows
  }, [contratoComIof, activeResult])

  // Portabilidade da Liberação - Handshake & Calculations
  const saldoPort = resumoAmortizacao ? resumoAmortizacao.saldoParaPort : contratoComIof
  const nAtual = resumoAmortizacao ? resumoAmortizacao.remanescentes : activeResult.prazo
  const pmtAtual = resumoAmortizacao ? parcela : activeResult.parcela
  const iAtual = resumoAmortizacao ? taxaImplicita : activeResult.taxa

  useEffect(() => {
    if (nAtual > 0) {
      setNovoPrazoInput(nAtual.toString())
    }
  }, [nAtual])


  const coefPosPort = useMemo(() => {
    if (novoPrazo <= 0) return 0
    if (novaTaxaDecimal <= 0) return 1 / novoPrazo
    const compound = Math.pow(1 + novaTaxaDecimal, novoPrazo)
    if (compound <= 1) return 0
    return (novaTaxaDecimal * compound) / (compound - 1)
  }, [novaTaxaDecimal, novoPrazo])

  const pmtNova = useMemo(() => {
    return saldoPort * coefPosPort
  }, [saldoPort, coefPosPort])

  const totalAtualPort = useMemo(() => pmtAtual * nAtual, [pmtAtual, nAtual])
  const totalNovoPort = useMemo(() => pmtNova * novoPrazo, [pmtNova, novoPrazo])
  const economiaMensal = useMemo(() => pmtAtual - pmtNova, [pmtAtual, pmtNova])
  const economiaTotal = useMemo(() => totalAtualPort - totalNovoPort, [totalAtualPort, totalNovoPort])

  // Price Table - Pós-Portabilidade
  const tabelaPricePosPort = useMemo(() => {
    if (saldoPort <= 0 || novoPrazo <= 0) return []
    const rows = []
    let saldo = saldoPort
    for (let m = 1; m <= novoPrazo; m++) {
      const juros = saldo * novaTaxaDecimal
      const principal = Math.min(saldo, pmtNova - juros)
      const novoSaldo = Math.max(0, saldo - principal)
      rows.push({
        pmtNum: m,
        parcela: pmtNova,
        principal: principal,
        juros: juros,
        saldoDevedor: novoSaldo,
        saldoInicial: saldo
      })
      saldo = novoSaldo
    }
    return rows
  }, [saldoPort, novoPrazo, novaTaxaDecimal, pmtNova])

  const planosAmortizacaoPort = useMemo(() => {
    const terms = [12, 24, 36, 48, 60, 72, 84, 96, 120]
    const pz = novoPrazo > 0 ? novoPrazo : nAtual

    if (pz <= 0 || saldoPort <= 0) return []

    return terms
      .filter(t => t <= pz)
      .map(t => {
        if (t === pz) {
          return {
            term: t,
            taxa: novaTaxaDecimal,
            parcelaMedia: pmtNova,
            totalPagar: pmtNova * t
          }
        }

        const pvFirstT = novaTaxaDecimal > 0
          ? (pmtNova * (1 - Math.pow(1 + novaTaxaDecimal, -t)) / novaTaxaDecimal)
          : (pmtNova * t)

        const pvRemaining = Math.max(0, saldoPort - pvFirstT)
        const sumTotalMes = (t * pmtNova) + pvRemaining
        const pmtMedia = t > 0 ? sumTotalMes / t : 0
        const rateN = calculateImplicitRate(saldoPort, pmtMedia, t)

        return {
          term: t,
          taxa: Math.max(0, rateN),
          parcelaMedia: pmtMedia,
          totalPagar: sumTotalMes
        }
      })
  }, [saldoPort, novoPrazo, nAtual, novaTaxaDecimal, pmtNova])

  const valorLiberadoPort = useMemo(() => {
    if (iofPercent > 0) {
      return saldoPort / (1 + iofPercent / 100)
    }
    return saldoPort
  }, [saldoPort, iofPercent])

  const valorParaAntecipacaoPort = Math.max(0, valorLiberadoPort - valorClientePort)

  const resumoAmortizacaoPort = useMemo(() => {
    if (!amortizacaoPosPort || valorClientePort <= 0 || tabelaPricePosPort.length === 0) {
      return null
    }

    let parcelasQuitadas = 0
    let quantoAntecipado = 0
    let remanescentes = novoPrazo

    for (let q = 1; q < novoPrazo; q++) {
      const remIndex = novoPrazo - q - 1
      const sdRem = remIndex >= 0 ? tabelaPricePosPort[remIndex].saldoDevedor : saldoPort
      const pvAnt = saldoPort - sdRem

      if (pvAnt <= valorParaAntecipacaoPort + 0.01) {
        parcelasQuitadas = q
        quantoAntecipado = pvAnt
        remanescentes = novoPrazo - q
      } else {
        break
      }
    }

    return {
      valorAntecipacao: valorParaAntecipacaoPort,
      quantoAntecipado,
      parcelasQuitadas,
      remanescentes
    }
  }, [amortizacaoPosPort, valorClientePort, tabelaPricePosPort, novoPrazo, saldoPort, valorParaAntecipacaoPort])

  const handleOpenCompareModal = () => {
    setCompareWarning(null)
    const termsAvailable = planosAmortizacao.map((p) => p.term)
    const roundCoef = Math.round(coeficiente * 100000) / 100000
    const isSpecialCoef = roundCoef >= 0.039 && roundCoef <= 0.0455

    if (isSpecialCoef) {
      setSelectedCompareTerms(termsAvailable)
      setShowCompareModal(true)
      return
    }

    const validSelected = selectedCompareTerms.filter((t) => termsAvailable.includes(t))

    if (validSelected.length >= 2) {
      setSelectedCompareTerms(validSelected)
    } else {
      if (selectedPlanTerm && termsAvailable.includes(selectedPlanTerm)) {
        const idx = termsAvailable.indexOf(selectedPlanTerm)
        const autoSet: number[] = [selectedPlanTerm]
        if (idx > 0) autoSet.push(termsAvailable[idx - 1])
        if (idx + 1 < termsAvailable.length && autoSet.length < 3) autoSet.push(termsAvailable[idx + 1])
        if (autoSet.length < 2 && idx + 2 < termsAvailable.length) autoSet.push(termsAvailable[idx + 2])
        setSelectedCompareTerms(autoSet.sort((a, b) => a - b))
      } else {
        setSelectedCompareTerms(termsAvailable.slice(0, Math.min(3, termsAvailable.length)))
      }
    }
    setShowCompareModal(true)
  }

  const handleToggleCompareTerm = (term: number) => {
    setCompareWarning(null)
    if (selectedCompareTerms.includes(term)) {
      if (selectedCompareTerms.length <= 2) {
        setCompareWarning("Selecione pelo menos 2 planos para comparação.")
        return
      }
      setSelectedCompareTerms((prev) => prev.filter((t) => t !== term))
    } else {
      if (selectedCompareTerms.length >= 3) {
        setCompareWarning("Você pode selecionar no máximo 3 planos simultaneamente.")
        return
      }
      setSelectedCompareTerms((prev) => [...prev, term].sort((a, b) => a - b))
    }
  }

  const handleGerarPDFComparativo = () => {
    const selectedPlans = selectedCompareTerms
      .map((term) => planosAmortizacao.find((p) => p.term === term))
      .filter(Boolean) as Array<(typeof planosAmortizacao)[0]>

    if (selectedPlans.length < 2) return

    const client = clienteNome.trim() || passedClient?.nome || "Cliente"
    const initials =
      client
        .split(" ")
        .filter(Boolean)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "CL"

    const consultant = perfil?.nome || "Consultor"
    const email = perfil?.email || ""
    const phone = (perfil as any)?.telefone || ""

    const formatFullCPF = (c?: string) => {
      if (!c) return ""
      const d = String(c).replace(/\D/g, "")
      if (d.length === 11) {
        return `${d.substring(0, 3)}.${d.substring(3, 6)}.${d.substring(6, 9)}-${d.substring(9, 11)}`
      }
      return String(c)
    }

    const cpf = formatFullCPF(passedClient?.cpf)
    const orgao = passedOrgao || (passedClient?.orgao as string) || ""
    const todayStr = new Date().toLocaleDateString("pt-BR")

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const colsCount = selectedPlans.length

    let cardsHtml = ""
    selectedPlans.forEach((plan) => {
      const economiaTotal = totalAPagar > plan.totalPagar ? totalAPagar - plan.totalPagar : 0

      cardsHtml += `
        <div style="border: 2px solid #0F172A; border-radius: 16px; overflow: hidden; background: #FFFFFF; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="background-color: #0F172A; color: #FFFFFF; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 900; color: #00D492; letter-spacing: -0.5px;">${plan.term} Meses</div>
              <div style="font-size: 10px; font-weight: 500; color: #94A3B8; letter-spacing: 0.5px; margin-top: 2px;">Plano de Amortização</div>
            </div>
            <div style="padding: 16px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #F1F5F9;">
                <span style="color: #64748B; font-weight: 600;">Valor Liberado</span>
                <span style="color: #00D492; font-weight: 800; font-size: 16px;">${formatBRL(valorLiberado)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #F1F5F9;">
                <span style="color: #64748B; font-weight: 600;">Parcela Média</span>
                <span style="color: #0F172A; font-weight: 800;">${formatBRL(plan.parcelaMedia)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #F1F5F9;">
                <span style="color: #64748B; font-weight: 600;">Taxa Mês</span>
                <span style="color: #0F172A; font-weight: 800;">${formatPercent(plan.taxa, 2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0;">
                <span style="color: #64748B; font-weight: 600;">Total Previsto</span>
                <span style="color: #0F172A; font-weight: 800;">${formatBRL(plan.totalPagar)}</span>
              </div>
            </div>
          </div>

          ${
            economiaTotal > 0
              ? `
            <div style="padding: 16px; padding-top: 0;">
              <div style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; padding: 12px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: #065F46; text-transform: uppercase; letter-spacing: 0.5px;">Economia no Total</div>
                <div style="font-size: 16px; font-weight: 900; color: #059669; margin-top: 2px;">${formatBRL(economiaTotal)}</div>
              </div>
            </div>
          `
              : ""
          }
        </div>
      `
    })

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Comparativo de Planos de Amortização - ${client}</title>
          <style>
            @page { size: A4 landscape; margin: 0mm; }
            * { font-family: Arial, Helvetica, sans-serif !important; box-sizing: border-box; }
            body { 
              font-family: Arial, Helvetica, sans-serif; 
              margin: 0; 
              padding: 10mm 12mm; 
              color: #1E293B; 
              background: #FFFFFF; 
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
            @media print { 
              @page { size: A4 landscape; margin: 0mm; }
              .no-print { display: none !important; }
            }
            .title-banner {
              text-align: center;
              margin-bottom: 12px;
            }
            .main-title {
              font-size: 22px;
              font-weight: 900;
              color: #0F172A;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .green-line {
              height: 4px;
              background-color: #00D492;
              border-radius: 2px;
              margin: 8px 0 16px 0;
            }
            .meta-grid {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background-color: #F8FAFC;
              border: 1px solid #E2E8F0;
              border-radius: 10px;
              padding: 12px 18px;
              margin-bottom: 20px;
              font-size: 12px;
            }
            .client-box {
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .avatar {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: #00D492;
              color: #0F172A;
              font-weight: 900;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
            }
            .consultant-box {
              text-align: right;
            }
            .cards-grid {
              display: grid;
              grid-template-columns: repeat(${colsCount}, 1fr);
              gap: 16px;
              margin-bottom: 20px;
            }
            .footer-info {
              border-top: 1px solid #E2E8F0;
              padding-top: 10px;
              font-size: 10px;
              color: #64748B;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <button onclick="window.print()" class="no-print" style="position: fixed; top: 18px; right: 24px; background-color: #00D492; color: #0F172A; font-weight: 800; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: inherit; z-index: 100;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            <span>Imprimir / Salvar PDF (Paisagem)</span>
          </button>

          <div class="title-banner">
            <div class="main-title">Comparativo de Planos de Amortização</div>
          </div>
          <div class="green-line"></div>

          <div class="meta-grid">
            <div class="client-box">
              <div class="avatar">${initials}</div>
              <div>
                <div style="font-weight: 900; font-size: 14px; color: #0F172A;">${client}</div>
                ${cpf ? `<div style="color: #64748B; font-size: 11px;">CPF: ${cpf} ${orgao ? `• ${orgao}` : ""}</div>` : ""}
              </div>
            </div>
            <div class="consultant-box">
              <div style="font-weight: 800; color: #00D492; font-size: 13px;">${consultant}</div>
              ${email ? `<div style="color: #64748B; font-size: 11px;">${email}</div>` : ""}
              ${phone ? `<div style="color: #64748B; font-size: 11px;">${phone}</div>` : ""}
            </div>
          </div>

          <div class="cards-grid">
            ${cardsHtml}
          </div>

          <div class="footer-info">
            <span>SharkConsig - Calculadora e Simulação Comercial</span>
            <span>Data da Simulação: ${todayStr}</span>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleGerarPDF = async () => {
    const vContrato = (activeTab === "port_liberacao" || activeTab === "amort_pos_port")
      ? (saldoPort || 0)
      : (contratoComIof || valorLiberado || 0);

    const przEst = (activeTab === "port_liberacao" || activeTab === "amort_pos_port")
      ? (novoPrazo || 0)
      : (activeResult?.prazo || 0);

    const pmMedia = (activeTab === "port_liberacao" || activeTab === "amort_pos_port")
      ? (pmtNova || 0)
      : (activeResult?.parcela || 0);

    const txAm = (activeTab === "port_liberacao" || activeTab === "amort_pos_port")
      ? (novaTaxaDecimal ? novaTaxaDecimal * 100 : 0)
      : (activeResult?.taxa ? activeResult.taxa * 100 : 0);

    const client = clienteNome.trim() || passedClient?.nome || "Cliente"
    const initials = client
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "CL"

    const consultant = perfil?.nome || "Elisandra Cassol"
    const email = perfil?.email || "elis_cassol@yahoo.com.br"
    const phone = (perfil as any)?.telefone || ""
    const consultantPhoto = (perfil as any)?.foto_proposta_url || (perfil as any)?.foto_url || ""

    const formatFullCPF = (c?: string) => {
      if (!c) return ""
      const d = String(c).replace(/\D/g, "")
      if (d.length === 11) {
        return `${d.substring(0, 3)}.${d.substring(3, 6)}.${d.substring(6, 9)}-${d.substring(9, 11)}`
      }
      return String(c)
    }

    const cpf = formatFullCPF(passedClient?.cpf)
    const orgao = passedOrgao || (passedClient?.orgao as string) || ""
    const defaultValidityDays = 1
    const validityDate = new Date()
    validityDate.setDate(validityDate.getDate() + defaultValidityDays)
    const validityDateStr = `${String(validityDate.getDate()).padStart(2, "0")}/${String(validityDate.getMonth() + 1).padStart(2, "0")}/${validityDate.getFullYear()}`
    const todayStr = new Date().toLocaleDateString("pt-BR")

    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    if (activeTab === "port_liberacao" || activeTab === "amort_pos_port") {
      let rowsHtmlPort = ""
      tabelaPricePosPort.forEach((row) => {
        const isEven = row.pmtNum % 2 === 0
        const rowBg = isEven ? "#F8FAFC" : "#FFFFFF"
        rowsHtmlPort += `
          <tr style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B;">${row.pmtNum}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B;">${formatBRL(row.parcela)}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #475569;">${formatBRL(row.principal)}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #475569;">${formatBRL(row.juros)}</td>
            <td style="padding: 10px 16px; text-align: right; font-weight: bold; color: #1E293B;">${formatBRL(row.saldoDevedor)}</td>
          </tr>
        `
      })

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title></title>
            <style>
              @page { size: A4; margin: 0mm; }
              * { font-family: Arial, Helvetica, sans-serif !important; }
              body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 10mm 12mm; color: #1E293B; background: #FFF; position: relative; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              @media print { 
                @page { size: A4; margin: 0mm; }
                .no-print { display: none !important; }
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
                body { padding: 10mm 12mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              }
              .pdf-header { padding: 16px 0 0 0; }
              .pdf-title { margin: 0 0 12px 0; font-size: 26px; letter-spacing: 1px; font-weight: 900; text-transform: uppercase; color: #64748B; text-align: center; }
              .green-bar { height: 4px; background-color: #00D492; border-radius: 2px; margin-bottom: 20px; }
              .sub-header { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; }
              .client-info { display: flex; align-items: center; gap: 12px; }
              .avatar { width: 38px; height: 38px; border-radius: 50%; background: #00D492; color: #111827; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 14px; }
              .consultant-info { text-align: right; font-size: 12px; }
              .consultant-info .name { color: #00D492; font-weight: bold; font-size: 13px; }
              .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; align-items: stretch; }
              .metric-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 12px; background: #FFF; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-sizing: border-box; }
              .metric-label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
              .metric-value { font-size: 16px; font-weight: 900; color: #0F172A; margin: 6px 0 4px 0; line-height: 1.2; }
              .metric-highlight { color: #00D492; }
              .metric-sub { font-size: 10.5px; color: #64748B; font-weight: 600; }
              .table-container { margin: 0 0 24px 0; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th { background-color: #111827; color: #00D492; padding: 12px 16px; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-align: center; }
              .footer-note { margin: 24px 0; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <!-- Top Right Gerar PDF Button -->
            <button id="btn-gerar-pdf-page" onclick="openCustomizeModal()" class="no-print" style="position: absolute; top: 20px; right: 28px; background-color: #00D492; color: #162546; font-weight: 800; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: inherit; transition: all 0.2s; z-index: 100;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              <span>Gerar PDF</span>
            </button>

            <!-- Modal Overlay for PDF Personalization -->
            <div id="customize-pdf-modal" class="modal-overlay no-print" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
              <div style="background: #FFFFFF; border-radius: 16px; width: 100%; max-width: 520px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid #E2E8F0; font-family: inherit; color: #0F172A; max-height: 90vh; overflow-y: auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 14px; margin-bottom: 18px;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(0, 212, 146, 0.15); display: flex; align-items: center; justify-content: center; color: #00D492;">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#162546" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div>
                      <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #162546;">Personalizar PDF</h3>
                      <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748B;">Plano de Amortização</p>
                    </div>
                  </div>
                  <button onclick="closeCustomizeModal()" style="background: none; border: none; font-size: 20px; color: #94A3B8; cursor: pointer; padding: 4px; border-radius: 6px; font-weight: 700;">✕</button>
                </div>

                <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                      <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">NOME DO CLIENTE</label>
                      <input id="input-modal-client" type="text" value="${client}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                    </div>
                    <div>
                      <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">CPF DO CLIENTE</label>
                      <input id="input-modal-cpf" type="text" value="${cpf}" placeholder="000.000.000-00" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                    </div>
                  </div>

                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                      <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">ÓRGÃO / CONVÊNIO</label>
                      <input id="input-modal-orgao" type="text" value="${orgao}" placeholder="Ex: GOVERNO SP, INSS..." style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                    </div>
                    <div>
                      <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">VALIDADE DA PROPOSTA (DIAS)</label>
                      <input id="input-modal-validity" type="number" min="1" max="90" value="${defaultValidityDays}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                    </div>
                  </div>

                  <div style="border-top: 1px solid #F1F5F9; padding-top: 10px;">
                    <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">DADOS DO CONSULTOR</label>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                      <div>
                        <label style="display: block; font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px;">NOME</label>
                        <input id="input-modal-consultant" type="text" value="${consultant}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                      </div>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                          <label style="display: block; font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px;">E-MAIL</label>
                          <input id="input-modal-email" type="text" value="${email}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                        </div>
                        <div>
                          <label style="display: block; font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px;">TELEFONE</label>
                          <input id="input-modal-phone" type="text" value="${phone}" placeholder="(00) 00000-0000" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style="border-top: 1px solid #F1F5F9; padding-top: 10px;">
                    <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">FOTO DO CONSULTOR (PNG SEM FUNDO)</label>
                    <div style="display: flex; gap: 12px; align-items: center;">
                      <div id="consultant-photo-preview-box" style="width: 48px; height: 48px; border-radius: 10px; border: 1px dashed #CBD5E1; background: #F8FAFC; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                        <img id="consultant-photo-img-preview" src="${consultantPhoto}" style="width: 100%; height: 100%; object-fit: contain; display: ${consultantPhoto ? 'block' : 'none'};" />
                        <span id="consultant-photo-placeholder-icon" style="display: ${consultantPhoto ? 'none' : 'block'}; font-size: 18px; color: #94A3B8;">📷</span>
                      </div>
                      <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                        <input id="input-modal-photo-file" type="file" accept="image/*" style="display: none;" onchange="handlePhotoUpload(event)" />
                        <button onclick="document.getElementById('input-modal-photo-file').click()" style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer; text-align: center; width: fit-content;">Selecionar Foto</button>
                        <div style="display: flex; gap: 12px; align-items: center; margin-top: 2px;">
                          <button id="btn-remove-photo" onclick="removePhoto()" style="background: none; border: none; color: #EF4444; font-size: 10px; font-weight: 700; cursor: pointer; padding: 0; display: ${consultantPhoto ? 'inline-block' : 'none'};">Remover foto</button>
                          <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #475569; cursor: pointer;">
                            <input id="check-show-photo" type="checkbox" ${consultantPhoto ? 'checked' : ''} style="width: 14px; height: 14px; accent-color: #00D492; cursor: pointer;" />
                            Mostrar no PDF
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style="border-top: 1px solid #F1F5F9; padding-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                    <label style="font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">OPÇÕES DE EXIBIÇÃO</label>

                    <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                      <input id="check-show-card-contrato" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                      Exibir VALOR DO CONTRATO
                    </label>

                    <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                      <input id="check-show-card-prazo" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                      Exibir PRAZO ESTRATÉGIA
                    </label>

                    <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                      <input id="check-show-card-parcela" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                      Exibir PARCELA MÉDIA
                    </label>

                    <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                      <input id="check-show-card-taxa" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                      Exibir TAXA A.M.
                    </label>

                    <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                      <input id="check-show-consultant" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                      Exibir Informações do Consultor
                    </label>

                    <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                      <input id="check-show-footer" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                      Exibir Rodapé Legal
                    </label>
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
                  <button onclick="closeCustomizeModal()" style="background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">Cancelar</button>
                  <button onclick="applyPDFCustomization()" style="background: #00D492; color: #162546; border: none; border-radius: 8px; padding: 8px 18px; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">Aplicar Personalização</button>
                </div>
              </div>
            </div>
            <div class="pdf-header">
              <!-- Top Branding Header -->
              <div id="branding-logo-header" style="display: flex; align-items: center; justify-content: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0; margin-bottom: 40px;">
                <div style="display: flex; align-items: center; justify-content: center;">
                  <img src="/logo.png" alt="SharkConsig" style="height: 38px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                  <div style="display: none; align-items: center; gap: 6px; font-weight: 900; font-size: 22px; color: #162546;">
                    <span style="color: #00D492;">Shark</span>Consig
                  </div>
                </div>
                <span style="color: #CBD5E1; font-size: 28px; font-weight: 300; margin: 0 4px;">|</span>
                <div style="display: flex; flex-direction: column; text-align: left;">
                  <span style="font-size: 10px; color: #64748B; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1;">FORMALIZAÇÃO DE</span>
                  <span style="font-size: 24px; font-weight: 900; color: #162546; letter-spacing: -0.5px; line-height: 1.1; text-transform: uppercase;">PROPOSTA</span>
                </div>
              </div>

              <!-- Main Dark Blue Banner Card -->
              <div id="header-banner-card" style="background-color: #162546 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; border-radius: 18px; padding: 20px 24px; color: #FFF; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); position: relative; overflow: visible;">
                <!-- Left: Client Details -->
                <div style="display: flex; align-items: center; gap: 16px;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #F4C600; display: flex; align-items: center; justify-content: center; background: rgba(244, 198, 0, 0.1); color: #F4C600; font-weight: 900; font-size: 15px; flex-shrink: 0;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div style="display: flex; flex-direction: column; text-align: left;">
                    <div class="client-name-display" style="font-weight: 900; font-size: 14px; text-transform: uppercase; color: #FFFFFF; letter-spacing: 0.5px; line-height: 1.2;">${client}</div>
                    <div class="client-meta-display" style="font-size: 11px; color: #94A3B8; margin-top: 3px; font-weight: 600; display: flex; flex-direction: column; gap: 2px;">
                      <span class="cpf-display">${cpf ? 'CPF: ' + formatMaskedCPF(cpf) : ''}</span>
                      <span class="orgao-display">${orgao ? 'Órgão: ' + orgao : ''}</span>
                    </div>
                  </div>
                </div>

                <!-- Center: Consultant Photo Banner -->
                <div id="consultant-photo-banner" style="display: ${consultantPhoto ? 'flex' : 'none'}; align-items: flex-end; justify-content: center; position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; height: 140px; pointer-events: none; z-index: 10;">
                  <img id="banner-consultant-photo-img" src="${consultantPhoto}" style="max-height: 140px; height: 140px; width: auto; object-fit: contain; object-position: bottom;" />
                </div>

                <!-- Right: Consultant Details -->
                <div id="consultant-info-banner" style="display: flex; flex-direction: column; text-align: right; align-items: flex-end; gap: 4px; border-left: 1px solid rgba(255, 255, 255, 0.15); padding-left: 20px;">
                  <div class="consultant-name-display" style="color: #F4C600; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${consultant}</div>
                  <div style="display: flex; align-items: center; gap: 6px; color: #E2E8F0; font-size: 11px; font-weight: 500;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                    <span class="email-display">${email}</span>
                  </div>
                  <div class="phone-wrapper" style="display: ${phone ? 'flex' : 'none'}; align-items: center; gap: 6px; color: #E2E8F0; font-size: 11px; font-weight: 500;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span class="phone-display">${phone}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="metrics-grid">
              <div class="metric-card" id="metric-card-contrato">
                <div class="metric-label">SALDO PORTADO</div>
                <div class="metric-value">${formatBRL(saldoPort)}</div>
                <div class="metric-sub">Prazo anterior: ${nAtual} meses</div>
              </div>
              <div class="metric-card" id="metric-card-parcela">
                <div class="metric-label">NOVA PARCELA</div>
                <div class="metric-value metric-highlight">${formatBRL(pmtNova)}</div>
                <div class="metric-sub">Economia mensal: ${formatBRL(economiaMensal)}</div>
              </div>
              <div class="metric-card" id="metric-card-prazo">
                <div class="metric-label">NOVO PRAZO</div>
                <div class="metric-value">${novoPrazo} meses</div>
                <div class="metric-sub">Economia total: ${formatBRL(economiaTotal)}</div>
              </div>
            </div>

            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Nº PMT</th>
                    <th>PARCELA</th>
                    <th>PRINCIPAL</th>
                    <th>JUROS</th>
                    <th style="text-align: right;">SALDO DEVEDOR</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtmlPort}
                </tbody>
              </table>
            </div>

            <div class="footer-note" style="margin: 24px 32px; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; flex-direction: column; gap: 3px; font-size: 10px; color: #475569; line-height: 1.4;">
                <div>• Cálculos de amortização de parcela são diários e sofrem alteração.</div>
                <div>• Proposta válida até <span class="validity-date-display">${validityDateStr}</span>, sujeita a alteração sem aviso prévio.</div>
                <div>• A taxa de juros final e a redução do valor da parcela poderão sofrer oscilações a critério das instituições bancárias.</div>
              </div>
            </div>

            <script>
              var currentPhotoData = "${consultantPhoto}";

              function handlePhotoUpload(e) {
                var file = e.target.files[0];
                if (file) {
                  var reader = new FileReader();
                  reader.onload = function(evt) {
                    currentPhotoData = evt.target.result;
                    var imgPrev = document.getElementById('consultant-photo-img-preview');
                    var placeholder = document.getElementById('consultant-photo-placeholder-icon');
                    var removeBtn = document.getElementById('btn-remove-photo');
                    var checkShow = document.getElementById('check-show-photo');
                    if (imgPrev) { imgPrev.src = currentPhotoData; imgPrev.style.display = 'block'; }
                    if (placeholder) placeholder.style.display = 'none';
                    if (removeBtn) removeBtn.style.display = 'inline-block';
                    if (checkShow) checkShow.checked = true;
                  };
                  reader.readAsDataURL(file);
                }
              }

              function removePhoto() {
                currentPhotoData = "";
                var imgPrev = document.getElementById('consultant-photo-img-preview');
                var placeholder = document.getElementById('consultant-photo-placeholder-icon');
                var removeBtn = document.getElementById('btn-remove-photo');
                var checkShow = document.getElementById('check-show-photo');
                var fileInput = document.getElementById('input-modal-photo-file');
                if (imgPrev) { imgPrev.src = ""; imgPrev.style.display = 'none'; }
                if (placeholder) placeholder.style.display = 'block';
                if (removeBtn) removeBtn.style.display = 'none';
                if (checkShow) checkShow.checked = false;
                if (fileInput) fileInput.value = "";
              }

              function openCustomizeModal() {
                document.getElementById('customize-pdf-modal').style.display = 'flex';
              }
              function closeCustomizeModal() {
                document.getElementById('customize-pdf-modal').style.display = 'none';
              }
              function maskCPF(cpf) {
                if (!cpf) return '';
                var digits = cpf.replace(/\D/g, '');
                if (digits.length >= 11) {
                  var d = digits.substring(0, 11);
                  return d.substring(0, 3) + '.***.***-' + d.substring(9, 11);
                }
                if (digits.length >= 3) {
                  var end = digits.length > 3 ? digits.substring(digits.length - 2) : '**';
                  return digits.substring(0, 3) + '.***.***-' + end;
                }
                return cpf.replace(/^(\d{3})\.?\d{3}\.?\d{3}-?(\d{2})$/, '$1.***.***-$2');
              }

              function applyPDFCustomization() {
                var clientVal = document.getElementById('input-modal-client').value.trim();
                var cpfVal = document.getElementById('input-modal-cpf').value.trim();
                var orgaoVal = document.getElementById('input-modal-orgao').value.trim();
                var consultantVal = document.getElementById('input-modal-consultant').value.trim();
                var emailVal = document.getElementById('input-modal-email').value.trim();
                var phoneVal = document.getElementById('input-modal-phone').value.trim();
                var validityDaysVal = parseInt(document.getElementById('input-modal-validity').value) || 1;

                var showCardContrato = document.getElementById('check-show-card-contrato') ? document.getElementById('check-show-card-contrato').checked : true;
                var showCardPrazo = document.getElementById('check-show-card-prazo') ? document.getElementById('check-show-card-prazo').checked : true;
                var showCardParcela = document.getElementById('check-show-card-parcela') ? document.getElementById('check-show-card-parcela').checked : true;
                var showCardTaxa = document.getElementById('check-show-card-taxa') ? document.getElementById('check-show-card-taxa').checked : true;

                var showConsultant = document.getElementById('check-show-consultant').checked;
                var showFooter = document.getElementById('check-show-footer').checked;
                var showPhoto = document.getElementById('check-show-photo') ? document.getElementById('check-show-photo').checked : false;

                var d = new Date();
                d.setDate(d.getDate() + validityDaysVal);
                var day = String(d.getDate()).padStart(2, '0');
                var month = String(d.getMonth() + 1).padStart(2, '0');
                var year = d.getFullYear();
                var formattedValidityDate = day + '/' + month + '/' + year;

                var clientEls = document.querySelectorAll('.client-name-display');
                clientEls.forEach(function(el) { el.textContent = clientVal || 'CLIENTE'; });

                var maskedCpf = maskCPF(cpfVal);
                var cpfEls = document.querySelectorAll('.cpf-display');
                cpfEls.forEach(function(el) { el.textContent = cpfVal ? 'CPF: ' + maskedCpf : ''; });

                var orgaoEls = document.querySelectorAll('.orgao-display');
                orgaoEls.forEach(function(el) { 
                  if (orgaoVal) {
                    el.textContent = 'Órgão: ' + orgaoVal;
                  } else {
                    el.textContent = '';
                  }
                });

                var consultantEls = document.querySelectorAll('.consultant-name-display');
                consultantEls.forEach(function(el) { el.textContent = consultantVal; });

                var emailEls = document.querySelectorAll('.email-display');
                emailEls.forEach(function(el) { el.textContent = emailVal; });

                var phoneEls = document.querySelectorAll('.phone-display');
                phoneEls.forEach(function(el) { el.textContent = phoneVal; });

                var phoneWrappers = document.querySelectorAll('.phone-wrapper');
                phoneWrappers.forEach(function(el) {
                  el.style.display = phoneVal ? 'flex' : 'none';
                });

                var validityEls = document.querySelectorAll('.validity-date-display');
                validityEls.forEach(function(el) { el.textContent = formattedValidityDate; });

                var cardContrato = document.getElementById('metric-card-contrato');
                if (cardContrato) cardContrato.style.display = showCardContrato ? 'flex' : 'none';

                var cardPrazo = document.getElementById('metric-card-prazo');
                if (cardPrazo) cardPrazo.style.display = showCardPrazo ? 'flex' : 'none';

                var cardParcela = document.getElementById('metric-card-parcela');
                if (cardParcela) cardParcela.style.display = showCardParcela ? 'flex' : 'none';

                var cardTaxa = document.getElementById('metric-card-taxa');
                if (cardTaxa) cardTaxa.style.display = showCardTaxa ? 'flex' : 'none';

                var consultantBox = document.getElementById('consultant-info-banner');
                if (consultantBox) consultantBox.style.display = showConsultant ? 'flex' : 'none';

                var photoBox = document.getElementById('consultant-photo-banner');
                var photoImg = document.getElementById('banner-consultant-photo-img');
                if (photoBox) {
                  if (showPhoto && currentPhotoData) {
                    if (photoImg) photoImg.src = currentPhotoData;
                    photoBox.style.display = 'flex';
                  } else {
                    photoBox.style.display = 'none';
                  }
                }

                var footerEl = document.querySelector('.footer-note');
                if (footerEl) footerEl.style.display = showFooter ? 'flex' : 'none';

                var proposalPayload = {
                  cliente_cpf: cpfVal ? cpfVal.replace(/\D/g, '') : '',
                  cliente_nome: clientVal || '',
                  valor_contrato: ${vContrato},
                  prazo_estrategia: ${przEst},
                  parcela_media: ${pmMedia},
                  taxa_am: ${txAm}
                };

                var proposalSaved = false;
                if (window.opener) {
                  try {
                    if (typeof window.opener.saveCalculatorProposal === 'function') {
                      window.opener.saveCalculatorProposal(proposalPayload);
                      proposalSaved = true;
                    }
                  } catch (e) {}
                  if (!proposalSaved) {
                    try {
                      window.opener.postMessage({ type: 'SAVE_CALCULATOR_PROPOSAL', payload: proposalPayload }, '*');
                      proposalSaved = true;
                    } catch (e) {}
                  }
                }
                if (!proposalSaved) {
                  try {
                    if (typeof BroadcastChannel !== 'undefined') {
                      var bc = new BroadcastChannel('calculator_proposals_channel');
                      bc.postMessage({ type: 'SAVE_CALCULATOR_PROPOSAL', payload: proposalPayload });
                    }
                  } catch (e) {}
                }

                closeCustomizeModal();

                setTimeout(function() {
                  window.print();
                }, 150);
              }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
      return
    }

    const roundCoef = Math.round(coeficiente * 100000) / 100000
    const isSpecialCoef = roundCoef >= 0.039 && roundCoef <= 0.0455
    const isSpecialTerm = isSpecialCoef && (activeResult.prazo === 12 || activeResult.prazo === 24)
    const rateForAmort = isSpecialTerm ? 0.05 : taxaImplicita
    const graceMonths = isSpecialTerm ? 3 : 0

    const term = activeResult.prazo
    const pmt = activeResult.parcela
    const tx = activeResult.taxa

    let rowsHtml = ""

    if (term < prazo) {
      const dynPlan = calculateDynamicAmortizationPlan(prazo, term, parcela, rateForAmort, graceMonths)
      for (const row of dynPlan) {
        const isEven = row.month % 2 === 0
        const rowBg = isEven ? "#F8FAFC" : "#FFFFFF"
        const amortNumsStr = row.amortNums.length > 0 ? row.amortNums.join(", ") : "-"
        const amortValsStr = row.amortVals.length > 0 
          ? row.amortVals.map(v => formatBRL(v)).join("<br/>") 
          : formatBRL(0)

        rowsHtml += `
          <tr style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${row.month}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(row.fixedParcela)}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #475569; vertical-align: top;">${amortNumsStr}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${amortValsStr}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(row.totalMes)}</td>
          </tr>
        `
      }
    } else {
      for (let m = 1; m <= term; m++) {
        const isEven = m % 2 === 0
        const rowBg = isEven ? "#F8FAFC" : "#FFFFFF"
        rowsHtml += `
          <tr style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${m}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(parcela)}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #475569; vertical-align: top;">-</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(0)}</td>
            <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(parcela)}</td>
          </tr>
        `
      }
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title></title>
          <style>
            @page { size: A4; margin: 0mm; }
            * { font-family: Arial, Helvetica, sans-serif !important; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 10mm 12mm; color: #1E293B; background: #FFF; position: relative; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            @media print { 
              @page { size: A4; margin: 0mm; }
              .no-print { display: none !important; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
              body { padding: 10mm 12mm; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
            }
            .pdf-header { padding: 16px 0 0 0; }
            .pdf-title { margin: 0 0 12px 0; font-size: 26px; letter-spacing: 1px; font-weight: 900; text-transform: uppercase; color: #64748B; text-align: center; }
            .green-bar { height: 4px; background-color: #00D492; border-radius: 2px; margin-bottom: 20px; }
            .sub-header { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; }
            .client-info { display: flex; align-items: center; gap: 12px; }
            .avatar { width: 38px; height: 38px; border-radius: 50%; background: #00D492; color: #111827; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 14px; }
            .consultant-info { text-align: right; font-size: 12px; }
            .consultant-info .name { color: #00D492; font-weight: bold; font-size: 13px; }
            .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; align-items: stretch; }
            .metric-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 12px; background: #FFF; display: flex; flex-direction: column; justify-content: space-between; height: 100%; box-sizing: border-box; }
            .metric-label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
            .metric-value { font-size: 16px; font-weight: 900; color: #0F172A; margin: 6px 0 4px 0; line-height: 1.2; }
            .metric-highlight { color: #00D492; }
            .metric-sub { font-size: 10.5px; color: #64748B; font-weight: 600; }
            .table-container { margin: 0 0 24px 0; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: #111827; color: #00D492; padding: 12px 16px; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-align: center; }
            .footer-note { margin: 24px 0; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <!-- Top Right Gerar PDF Button -->
          <button id="btn-gerar-pdf-page" onclick="openCustomizeModal()" class="no-print" style="position: absolute; top: 20px; right: 28px; background-color: #00D492; color: #162546; font-weight: 800; font-size: 13px; padding: 10px 18px; border-radius: 10px; border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-family: inherit; transition: all 0.2s; z-index: 100;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>Gerar PDF</span>
          </button>

          <!-- Modal Overlay for PDF Personalization -->
          <div id="customize-pdf-modal" class="modal-overlay no-print" style="display: none; position: fixed; inset: 0; background: rgba(15, 23, 42, 0.65); backdrop-filter: blur(4px); z-index: 9999; align-items: center; justify-content: center; padding: 16px;">
            <div style="background: #FFFFFF; border-radius: 16px; width: 100%; max-width: 520px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border: 1px solid #E2E8F0; font-family: inherit; color: #0F172A; max-height: 90vh; overflow-y: auto;">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #E2E8F0; padding-bottom: 14px; margin-bottom: 18px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 36px; height: 36px; border-radius: 10px; background: rgba(0, 212, 146, 0.15); display: flex; align-items: center; justify-content: center; color: #00D492;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#162546" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #162546;">Personalizar PDF</h3>
                    <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748B;">Plano de Amortização</p>
                  </div>
                </div>
                <button onclick="closeCustomizeModal()" style="background: none; border: none; font-size: 20px; color: #94A3B8; cursor: pointer; padding: 4px; border-radius: 6px; font-weight: 700;">✕</button>
              </div>

              <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div>
                    <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">NOME DO CLIENTE</label>
                    <input id="input-modal-client" type="text" value="${client}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">CPF DO CLIENTE</label>
                    <input id="input-modal-cpf" type="text" value="${cpf}" placeholder="000.000.000-00" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div>
                    <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">ÓRGÃO / CONVÊNIO</label>
                    <input id="input-modal-orgao" type="text" value="${orgao}" placeholder="Ex: GOVERNO SP, INSS..." style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                  </div>
                  <div>
                    <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">VALIDADE DA PROPOSTA (DIAS)</label>
                    <input id="input-modal-validity" type="number" min="1" max="90" value="${defaultValidityDays}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                  </div>
                </div>

                <div style="border-top: 1px solid #F1F5F9; padding-top: 10px;">
                  <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">DADOS DO CONSULTOR</label>
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    <div>
                      <label style="display: block; font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px;">NOME</label>
                      <input id="input-modal-consultant" type="text" value="${consultant}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                      <div>
                        <label style="display: block; font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px;">E-MAIL</label>
                        <input id="input-modal-email" type="text" value="${email}" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                      </div>
                      <div>
                        <label style="display: block; font-size: 9px; font-weight: 700; color: #94A3B8; text-transform: uppercase; margin-bottom: 2px;">TELEFONE</label>
                        <input id="input-modal-phone" type="text" value="${phone}" placeholder="(00) 00000-0000" style="width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid #CBD5E1; font-size: 12px; font-weight: 600; color: #0F172A; box-sizing: border-box; outline: none;" />
                      </div>
                    </div>
                  </div>
                </div>

                <div style="border-top: 1px solid #F1F5F9; padding-top: 10px;">
                  <label style="display: block; font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">FOTO DO CONSULTOR (PNG SEM FUNDO)</label>
                  <div style="display: flex; gap: 12px; align-items: center;">
                    <div id="consultant-photo-preview-box" style="width: 48px; height: 48px; border-radius: 10px; border: 1px dashed #CBD5E1; background: #F8FAFC; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;">
                      <img id="consultant-photo-img-preview" src="${consultantPhoto}" style="width: 100%; height: 100%; object-fit: contain; display: ${consultantPhoto ? 'block' : 'none'};" />
                      <span id="consultant-photo-placeholder-icon" style="display: ${consultantPhoto ? 'none' : 'block'}; font-size: 18px; color: #94A3B8;">📷</span>
                    </div>
                    <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
                      <input id="input-modal-photo-file" type="file" accept="image/*" style="display: none;" onchange="handlePhotoUpload(event)" />
                      <button onclick="document.getElementById('input-modal-photo-file').click()" style="background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; border-radius: 6px; padding: 6px 10px; font-size: 11px; font-weight: 700; cursor: pointer; text-align: center; width: fit-content;">Selecionar Foto</button>
                      <div style="display: flex; gap: 12px; align-items: center; margin-top: 2px;">
                        <button id="btn-remove-photo" onclick="removePhoto()" style="background: none; border: none; color: #EF4444; font-size: 10px; font-weight: 700; cursor: pointer; padding: 0; display: ${consultantPhoto ? 'inline-block' : 'none'};">Remover foto</button>
                        <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: #475569; cursor: pointer;">
                          <input id="check-show-photo" type="checkbox" ${consultantPhoto ? 'checked' : ''} style="width: 14px; height: 14px; accent-color: #00D492; cursor: pointer;" />
                          Mostrar no PDF
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div style="border-top: 1px solid #F1F5F9; padding-top: 10px; display: flex; flex-direction: column; gap: 8px;">
                  <label style="font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px;">OPÇÕES DE EXIBIÇÃO</label>

                  <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                    <input id="check-show-card-contrato" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                    Exibir VALOR DO CONTRATO
                  </label>

                  <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                    <input id="check-show-card-prazo" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                    Exibir PRAZO ESTRATÉGIA
                  </label>

                  <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                    <input id="check-show-card-parcela" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                    Exibir PARCELA MÉDIA
                  </label>

                  <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                    <input id="check-show-card-taxa" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                    Exibir TAXA A.M.
                  </label>

                  <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                    <input id="check-show-consultant" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                    Exibir Informações do Consultor
                  </label>

                  <label style="display: flex; align-items: center; gap: 10px; font-size: 12px; font-weight: 600; color: #334155; cursor: pointer;">
                    <input id="check-show-footer" type="checkbox" checked style="width: 16px; height: 16px; accent-color: #00D492; cursor: pointer;" />
                    Exibir Rodapé Legal
                  </label>
                </div>
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #E2E8F0; padding-top: 14px;">
                <button onclick="closeCustomizeModal()" style="background: #F1F5F9; color: #475569; border: 1px solid #CBD5E1; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer;">Cancelar</button>
                <button onclick="applyPDFCustomization()" style="background: #00D492; color: #162546; border: none; border-radius: 8px; padding: 8px 18px; font-size: 12px; font-weight: 800; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">Aplicar Personalização</button>
              </div>
            </div>
          </div>
          <div class="pdf-header">
            <!-- Top Branding Header -->
            <div id="branding-logo-header" style="display: flex; align-items: center; justify-content: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0; margin-bottom: 40px;">
              <div style="display: flex; align-items: center; justify-content: center;">
                <img src="/logo.png" alt="SharkConsig" style="height: 38px; object-fit: contain;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
                <div style="display: none; align-items: center; gap: 6px; font-weight: 900; font-size: 22px; color: #162546;">
                  <span style="color: #00D492;">Shark</span>Consig
                </div>
              </div>
              <span style="color: #CBD5E1; font-size: 28px; font-weight: 300; margin: 0 4px;">|</span>
              <div style="display: flex; flex-direction: column; text-align: left;">
                <span style="font-size: 10px; color: #64748B; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1;">FORMALIZAÇÃO DE</span>
                <span style="font-size: 24px; font-weight: 900; color: #162546; letter-spacing: -0.5px; line-height: 1.1; text-transform: uppercase;">PROPOSTA</span>
              </div>
            </div>

            <!-- Main Dark Blue Banner Card -->
            <div id="header-banner-card" style="background-color: #162546 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; border-radius: 18px; padding: 20px 24px; color: #FFF; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); position: relative; overflow: visible;">
              <!-- Left: Client Details -->
              <div style="display: flex; align-items: center; gap: 16px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #F4C600; display: flex; align-items: center; justify-content: center; background: rgba(244, 198, 0, 0.1); color: #F4C600; font-weight: 900; font-size: 15px; flex-shrink: 0;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div style="display: flex; flex-direction: column; text-align: left;">
                  <div class="client-name-display" style="font-weight: 900; font-size: 14px; text-transform: uppercase; color: #FFFFFF; letter-spacing: 0.5px; line-height: 1.2;">${client}</div>
                  <div class="client-meta-display" style="font-size: 11px; color: #94A3B8; margin-top: 3px; font-weight: 600; display: flex; flex-direction: column; gap: 2px;">
                    <span class="cpf-display">${cpf ? 'CPF: ' + formatMaskedCPF(cpf) : ''}</span>
                    <span class="orgao-display">${orgao ? 'Órgão: ' + orgao : ''}</span>
                  </div>
                </div>
              </div>

              <!-- Center: Consultant Photo Banner -->
              <div id="consultant-photo-banner" style="display: ${consultantPhoto ? 'flex' : 'none'}; align-items: flex-end; justify-content: center; position: absolute; left: 50%; transform: translateX(-50%); bottom: 0; height: 140px; pointer-events: none; z-index: 10;">
                <img id="banner-consultant-photo-img" src="${consultantPhoto}" style="max-height: 140px; height: 140px; width: auto; object-fit: contain; object-position: bottom;" />
              </div>

              <!-- Right: Consultant Details -->
              <div id="consultant-info-banner" style="display: flex; flex-direction: column; text-align: right; align-items: flex-end; gap: 4px; border-left: 1px solid rgba(255, 255, 255, 0.15); padding-left: 20px;">
                <div class="consultant-name-display" style="color: #F4C600; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${consultant}</div>
                <div style="display: flex; align-items: center; gap: 6px; color: #E2E8F0; font-size: 11px; font-weight: 500;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </svg>
                  <span class="email-display">${email}</span>
                </div>
                <div class="phone-wrapper" style="display: ${phone ? 'flex' : 'none'}; align-items: center; gap: 6px; color: #E2E8F0; font-size: 11px; font-weight: 500;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  <span class="phone-display">${phone}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card" id="metric-card-contrato">
              <div class="metric-label">${resumoAmortizacao ? 'VALOR P/ CLIENTE' : 'VALOR DO CONTRATO'}</div>
              <div class="metric-value">${formatBRL(resumoAmortizacao ? valorBolso : valorLiberado)}</div>
            </div>
            <div class="metric-card" id="metric-card-prazo">
              <div class="metric-label">${resumoAmortizacao ? 'PRAZO REMANESCENTE' : 'PRAZO ESTRATÉGIA'}</div>
              <div class="metric-value metric-highlight">${term} meses</div>
            </div>
            <div class="metric-card" id="metric-card-parcela">
              <div class="metric-label">${resumoAmortizacao ? 'PARCELA' : 'PARCELA MÉDIA'}</div>
              <div class="metric-value">${formatBRL(pmt)}</div>
            </div>
            <div class="metric-card" id="metric-card-taxa">
              <div class="metric-label">${resumoAmortizacao ? 'SALDO P/ PORT' : 'TAXA A.M.'}</div>
              <div class="metric-value">${resumoAmortizacao ? formatBRL(resumoAmortizacao.saldoParaPort) : formatPercent(tx, 2)}</div>
            </div>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>PRAZO</th>
                  <th>FIXA EM FOLHA</th>
                  <th>AMORTIZADAS</th>
                  <th>VALOR AMORTIZAÇÕES</th>
                  <th>TOTAL MÊS</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div class="footer-note" style="margin: 24px 32px; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 10px; color: #475569; line-height: 1.4;">
              <div>• Cálculos de amortização de parcela são diários e sofrem alteração.</div>
              <div>• Proposta válida até <span class="validity-date-display">${validityDateStr}</span>, sujeita a alteração sem aviso prévio.</div>
              <div>• A taxa de juros final e a redução do valor da parcela poderão sofrer oscilações a critério das instituições bancárias.</div>
            </div>
          </div>

          <script>
            var currentPhotoData = "${consultantPhoto}";

            function handlePhotoUpload(e) {
              var file = e.target.files[0];
              if (file) {
                var reader = new FileReader();
                reader.onload = function(evt) {
                  currentPhotoData = evt.target.result;
                  var imgPrev = document.getElementById('consultant-photo-img-preview');
                  var placeholder = document.getElementById('consultant-photo-placeholder-icon');
                  var removeBtn = document.getElementById('btn-remove-photo');
                  var checkShow = document.getElementById('check-show-photo');
                  if (imgPrev) { imgPrev.src = currentPhotoData; imgPrev.style.display = 'block'; }
                  if (placeholder) placeholder.style.display = 'none';
                  if (removeBtn) removeBtn.style.display = 'inline-block';
                  if (checkShow) checkShow.checked = true;
                };
                reader.readAsDataURL(file);
              }
            }

            function removePhoto() {
              currentPhotoData = "";
              var imgPrev = document.getElementById('consultant-photo-img-preview');
              var placeholder = document.getElementById('consultant-photo-placeholder-icon');
              var removeBtn = document.getElementById('btn-remove-photo');
              var checkShow = document.getElementById('check-show-photo');
              var fileInput = document.getElementById('input-modal-photo-file');
              if (imgPrev) { imgPrev.src = ""; imgPrev.style.display = 'none'; }
              if (placeholder) placeholder.style.display = 'block';
              if (removeBtn) removeBtn.style.display = 'none';
              if (checkShow) checkShow.checked = false;
              if (fileInput) fileInput.value = "";
            }

            function openCustomizeModal() {
              document.getElementById('customize-pdf-modal').style.display = 'flex';
            }
            function closeCustomizeModal() {
              document.getElementById('customize-pdf-modal').style.display = 'none';
            }
            function maskCPF(cpf) {
              if (!cpf) return '';
              var digits = cpf.replace(/\D/g, '');
              if (digits.length >= 11) {
                var d = digits.substring(0, 11);
                return d.substring(0, 3) + '.***.***-' + d.substring(9, 11);
              }
              if (digits.length >= 3) {
                var end = digits.length > 3 ? digits.substring(digits.length - 2) : '**';
                return digits.substring(0, 3) + '.***.***-' + end;
              }
              return cpf.replace(/^(\d{3})\.?\d{3}\.?\d{3}-?(\d{2})$/, '$1.***.***-$2');
            }

            function applyPDFCustomization() {
              var clientVal = document.getElementById('input-modal-client').value.trim();
              var cpfVal = document.getElementById('input-modal-cpf').value.trim();
              var orgaoVal = document.getElementById('input-modal-orgao').value.trim();
              var consultantVal = document.getElementById('input-modal-consultant').value.trim();
              var emailVal = document.getElementById('input-modal-email').value.trim();
              var phoneVal = document.getElementById('input-modal-phone').value.trim();
              var validityDaysVal = parseInt(document.getElementById('input-modal-validity').value) || 1;

              var showCardContrato = document.getElementById('check-show-card-contrato') ? document.getElementById('check-show-card-contrato').checked : true;
              var showCardPrazo = document.getElementById('check-show-card-prazo') ? document.getElementById('check-show-card-prazo').checked : true;
              var showCardParcela = document.getElementById('check-show-card-parcela') ? document.getElementById('check-show-card-parcela').checked : true;
              var showCardTaxa = document.getElementById('check-show-card-taxa') ? document.getElementById('check-show-card-taxa').checked : true;

              var showConsultant = document.getElementById('check-show-consultant').checked;
              var showFooter = document.getElementById('check-show-footer').checked;
              var showPhoto = document.getElementById('check-show-photo') ? document.getElementById('check-show-photo').checked : false;

              var d = new Date();
              d.setDate(d.getDate() + validityDaysVal);
              var day = String(d.getDate()).padStart(2, '0');
              var month = String(d.getMonth() + 1).padStart(2, '0');
              var year = d.getFullYear();
              var formattedValidityDate = day + '/' + month + '/' + year;

              var clientEls = document.querySelectorAll('.client-name-display');
              clientEls.forEach(function(el) { el.textContent = clientVal || 'CLIENTE'; });

              var maskedCpf = maskCPF(cpfVal);
              var cpfEls = document.querySelectorAll('.cpf-display');
              cpfEls.forEach(function(el) { el.textContent = cpfVal ? 'CPF: ' + maskedCpf : ''; });

              var orgaoEls = document.querySelectorAll('.orgao-display');
              orgaoEls.forEach(function(el) { 
                if (orgaoVal) {
                  el.textContent = 'Órgão: ' + orgaoVal;
                } else {
                  el.textContent = '';
                }
              });

              var consultantEls = document.querySelectorAll('.consultant-name-display');
              consultantEls.forEach(function(el) { el.textContent = consultantVal; });

              var emailEls = document.querySelectorAll('.email-display');
              emailEls.forEach(function(el) { el.textContent = emailVal; });

              var phoneEls = document.querySelectorAll('.phone-display');
              phoneEls.forEach(function(el) { el.textContent = phoneVal; });

              var phoneWrappers = document.querySelectorAll('.phone-wrapper');
              phoneWrappers.forEach(function(el) {
                el.style.display = phoneVal ? 'flex' : 'none';
              });

              var validityEls = document.querySelectorAll('.validity-date-display');
              validityEls.forEach(function(el) { el.textContent = formattedValidityDate; });

              var cardContrato = document.getElementById('metric-card-contrato');
              if (cardContrato) cardContrato.style.display = showCardContrato ? 'flex' : 'none';

              var cardPrazo = document.getElementById('metric-card-prazo');
              if (cardPrazo) cardPrazo.style.display = showCardPrazo ? 'flex' : 'none';

              var cardParcela = document.getElementById('metric-card-parcela');
              if (cardParcela) cardParcela.style.display = showCardParcela ? 'flex' : 'none';

              var cardTaxa = document.getElementById('metric-card-taxa');
              if (cardTaxa) cardTaxa.style.display = showCardTaxa ? 'flex' : 'none';

              var consultantBox = document.getElementById('consultant-info-banner');
              if (consultantBox) consultantBox.style.display = showConsultant ? 'flex' : 'none';

              var photoBox = document.getElementById('consultant-photo-banner');
              var photoImg = document.getElementById('banner-consultant-photo-img');
              if (photoBox) {
                if (showPhoto && currentPhotoData) {
                  if (photoImg) photoImg.src = currentPhotoData;
                  photoBox.style.display = 'flex';
                } else {
                  photoBox.style.display = 'none';
                }
              }

              var footerEl = document.querySelector('.footer-note');
              if (footerEl) footerEl.style.display = showFooter ? 'flex' : 'none';

              var proposalPayload = {
                cliente_cpf: cpfVal ? cpfVal.replace(/\D/g, '') : '',
                cliente_nome: clientVal || '',
                valor_contrato: ${vContrato},
                prazo_estrategia: ${przEst},
                parcela_media: ${pmMedia},
                taxa_am: ${txAm}
              };

              var proposalSaved = false;
              if (window.opener) {
                try {
                  if (typeof window.opener.saveCalculatorProposal === 'function') {
                    window.opener.saveCalculatorProposal(proposalPayload);
                    proposalSaved = true;
                  }
                } catch (e) {}
                if (!proposalSaved) {
                  try {
                    window.opener.postMessage({ type: 'SAVE_CALCULATOR_PROPOSAL', payload: proposalPayload }, '*');
                    proposalSaved = true;
                  } catch (e) {}
                }
              }
              if (!proposalSaved) {
                try {
                  if (typeof BroadcastChannel !== 'undefined') {
                    var bc = new BroadcastChannel('calculator_proposals_channel');
                    bc.postMessage({ type: 'SAVE_CALCULATOR_PROPOSAL', payload: proposalPayload });
                  }
                } catch (e) {}
              }

              closeCustomizeModal();

              setTimeout(function() {
                window.print();
              }, 150);
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  // Event handlers
  const handleParcelaChange = (vStr: string) => {
    setParcelaInput(vStr)
    setValorLiberadoInput("")
  }

  const handleCoeficienteChange = (vStr: string) => {
    setCoeficienteInput(vStr)
    setValorLiberadoInput("")
  }

  const handleLiberadoChange = (vStr: string) => {
    setValorLiberadoInput(vStr)
    const v = parseFormattedFloat(vStr)
    if (v > 0 && parcela > 0) {
      const calc = parcela / v
      setCoeficienteInput(Number.isFinite(calc) ? calc.toString() : "")
    } else {
      setCoeficienteInput("")
    }
  }

  return (
    <div className={cn("text-slate-800 flex-1 flex flex-col", isEmbedded ? "p-0 bg-transparent min-h-0" : "min-h-screen bg-slate-50")}>
      {!isEmbedded && <Header title="CALCULADORA" />}
      {/* Main Content Area */}
      <main className={cn("max-w-7xl mx-auto space-y-6 w-full", isEmbedded ? "p-0" : "p-6 md:p-8 lg:p-10")}>
        {/* TOP TABS NAVBAR */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <button
            onClick={() => setActiveTab("liberacao")}
            className={cn(
              "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
              (activeTab === "liberacao" || activeTab === "amort_liberacao")
                ? "bg-slate-900 text-white shadow-md ring-2 ring-[#00D492]"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <Calculator className={cn("w-4 h-4", (activeTab === "liberacao" || activeTab === "amort_liberacao") ? "text-[#00D492]" : "")} />
            <span>Liberação de Crédito</span>
          </button>

          <button
            onClick={() => setActiveTab("port_liberacao")}
            className={cn(
              "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
              (activeTab === "port_liberacao" || activeTab === "amort_pos_port")
                ? "bg-slate-900 text-white shadow-md ring-2 ring-[#00D492]"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <ArrowLeftRight className={cn("w-4 h-4", (activeTab === "port_liberacao" || activeTab === "amort_pos_port") ? "text-[#00D492]" : "")} />
            <span>Portabilidade da Liberação</span>
          </button>

          <button
            onClick={() => setActiveTab("cidadao")}
            className={cn(
              "px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
              activeTab === "cidadao"
                ? "bg-slate-900 text-white shadow-md ring-2 ring-[#00D492]"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            <Calculator className={cn("w-4 h-4", activeTab === "cidadao" ? "text-[#00D492]" : "")} />
            <span>Calculadora do Cidadão</span>
          </button>
        </div>

        {/* VIEW 1: LIBERAÇÃO */}
        {activeTab === "liberacao" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: PREMISSAS & VALOR PARA O CLIENTE */}
              <div className="lg:col-span-7 space-y-6">
                {/* PREMISSAS CARD */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#00D492]">
                    <FileText className="w-4 h-4 text-[#00D492]" />
                    <span>PREMISSAS</span>
                  </div>

                  {/* MARGENS DO CLIENTE (quando acessado via simulação do cliente) */}
                  {clientMargins && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Margens do Cliente (Clique para selecionar)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleParcelaChange(clientMargins.principal ? clientMargins.principal.toFixed(2).replace(".", ",") : "0,00")}
                          className="text-left p-2.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all group cursor-pointer shadow-2xs"
                        >
                          <span className="block text-[10px] font-bold text-slate-400 group-hover:text-emerald-700 uppercase">Margem Principal</span>
                          <span className="block text-sm font-bold text-slate-800 group-hover:text-emerald-900">{formatBRL(clientMargins.principal || 0)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleParcelaChange(clientMargins.cartaoConsignado ? clientMargins.cartaoConsignado.toFixed(2).replace(".", ",") : "0,00")}
                          className="text-left p-2.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all group cursor-pointer shadow-2xs"
                        >
                          <span className="block text-[10px] font-bold text-slate-400 group-hover:text-emerald-700 uppercase">Cartão Consignado</span>
                          <span className="block text-sm font-bold text-slate-800 group-hover:text-emerald-900">{formatBRL(clientMargins.cartaoConsignado || 0)}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleParcelaChange(clientMargins.cartaoBeneficio ? clientMargins.cartaoBeneficio.toFixed(2).replace(".", ",") : "0,00")}
                          className="text-left p-2.5 bg-white hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-lg transition-all group cursor-pointer shadow-2xs"
                        >
                          <span className="block text-[10px] font-bold text-slate-400 group-hover:text-emerald-700 uppercase">Cartão Benefício</span>
                          <span className="block text-sm font-bold text-slate-800 group-hover:text-emerald-900">{formatBRL(clientMargins.cartaoBeneficio || 0)}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                        PARCELA / MARGEM (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={parcelaInput}
                        onChange={(e) => handleParcelaChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                        COEFICIENTE
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={coeficienteInput}
                        onChange={(e) => handleCoeficienteChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="0.020"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                        VALOR LIBERADO (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valorLiberadoInput !== "" ? valorLiberadoInput : (valorLiberado > 0 ? (Math.round(valorLiberado * 100) / 100).toString() : "")}
                        onChange={(e) => handleLiberadoChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="50000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                        PRAZO (MESES)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={prazoInput}
                        onChange={(e) => setPrazoInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="120"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                        IOF (%)
                      </label>
                      <select
                        value={iofPercent}
                        onChange={(e) => setIofPercent(parseFloat(e.target.value) || 5)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value={5.0}>5%</option>
                        <option value={8.0}>8%</option>
                      </select>
                    </div>
                  </div>

                  {/* VALOR PARA O CLIENTE BOX */}
                  <div className="bg-[#00D492]/10 border border-[#00D492]/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase">
                      <DollarSign className="w-4 h-4 text-[#00D492]" />
                      <span>VALOR PARA O CLIENTE (CALCULAR PRAZO FIXO)</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        QUANTO O CLIENTE FICA NO BOLSO (R$)
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={valorBolsoInput}
                        onChange={(e) => {
                          setValorBolsoInput(e.target.value)
                          if (e.target.value) {
                            setSelectedPlanTerm(null)
                          }
                        }}
                        placeholder="Deixe vazio se não amortiza"
                        className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D492] shadow-inner"
                      />
                    </div>

                    <p className="text-[11px] font-medium text-slate-600 italic">
                      Antecipação = Liberado - Valor cliente · roda na tabela Price do Contrato+IOF
                    </p>
                  </div>
                </div>

                {/* PLANO DE AMORTIZAÇÃO GRID */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#00D492]">
                      <TableIcon className="w-4 h-4 text-[#00D492]" />
                      <span>PLANO DE AMORTIZAÇÃO</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      A partir do valor já liberado — quanto sobra de prazo e parcela média ao escolher cada opção
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {planosAmortizacao
                      .filter((p) => {
                        const roundCoef = Math.round(coeficiente * 100000) / 100000
                        const isSpecialCoef = roundCoef >= 0.039 && roundCoef <= 0.0455
                        if (isSpecialCoef) {
                          return p.term === 12 || p.term === 24
                        }
                        return true
                      })
                      .map((p) => {
                      const isSelected = selectedPlanTerm === p.term
                      return (
                        <button
                          key={p.term}
                          onClick={() => {
                            setSelectedPlanTerm(p.term)
                          }}
                          className={cn(
                            "p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1",
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-[#00D492]"
                              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <span className="text-xl font-extrabold tracking-tight">
                            {p.term}x
                          </span>
                          <span className={cn(
                            "text-[12px] font-semibold",
                            isSelected ? "text-[#00D492]" : "text-slate-500"
                          )}>
                            Taxa {formatPercent(p.taxa, 2)}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: RESULTADO & RESUMO AMORTIZAÇÃO */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#00D492]">
                    <Calculator className="w-4 h-4 text-[#00D492]" />
                    <span>RESULTADO</span>
                  </div>

                  {/* Black Banner Metrics */}
                  <div>
                    <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        VALOR LIBERADO
                      </p>
                      <p className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                        {formatBRL(valorLiberado)}
                      </p>
                    </div>
                  </div>

                  {/* Summary Rows */}
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">{activeResult.labelParcela}</span>
                      <span className="font-bold text-slate-900">{formatBRL(activeResult.parcela)}</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Taxa implícita</span>
                      <span className="font-bold text-slate-900">{formatPercent(activeResult.taxa)}</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Prazo</span>
                      <span className="font-bold text-slate-900">{activeResult.prazo} meses</span>
                    </div>
                  </div>

                  {/* RESUMO AMORTIZAÇÃO (If active) */}
                  {resumoAmortizacao && (
                    <div className="pt-2 space-y-4 border-t border-slate-200">
                      <div className="font-bold text-xs uppercase tracking-wider text-[#00D492]">
                        RESUMO AMORTIZAÇÃO
                      </div>

                      <div className="divide-y divide-slate-100 text-xs">
                        <div className="py-2 flex justify-between items-center">
                          <span className="font-semibold text-slate-500">Valor p/ antecipação</span>
                          <span className="font-bold text-slate-900">
                            {formatBRL(resumoAmortizacao.valorAntecipacao)}
                          </span>
                        </div>

                        <div className="py-2 flex justify-between items-center">
                          <span className="font-semibold text-slate-500">Quanto antecipado</span>
                          <span className="font-bold text-slate-900">
                            {formatBRL(resumoAmortizacao.quantoAntecipado)}
                          </span>
                        </div>

                        <div className="py-2 flex justify-between items-center">
                          <span className="font-semibold text-slate-500">Parcelas quitadas</span>
                          <span className="font-bold text-slate-900">
                            {resumoAmortizacao.parcelasQuitadas} parcelas
                          </span>
                        </div>

                        <div className="py-2 flex justify-between items-center">
                          <span className="font-semibold text-slate-500">Remanescentes</span>
                          <span className="font-bold text-slate-900">
                            {resumoAmortizacao.remanescentes} meses
                          </span>
                        </div>
                      </div>

                      {/* SALDO PARA PORT */}
                      <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1 shadow-md">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#00D492]">
                          SALDO PARA PORT
                        </p>
                        <p className="text-2xl font-black text-white tracking-tight">
                          {formatBRL(resumoAmortizacao.saldoParaPort)}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      onClick={() => setActiveTab("amort_liberacao")}
                      className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-1"
                    >
                      <TableIcon className="w-3.5 h-3.5 text-slate-600" />
                      <span>Tabela</span>
                    </button>

                    <button
                      onClick={() => setShowSummaryModal(true)}
                      className="bg-[#00D492] hover:bg-[#00b87f] text-slate-900 font-bold text-xs py-3 px-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Resumo</span>
                    </button>

                    <button
                      onClick={handleOpenCompareModal}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-3 px-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 border border-amber-600 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-slate-950" />
                      <span>Comparar</span>
                    </button>

                    <button
                      onClick={handleGerarPDF}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-2 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 border border-slate-800"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#00D492]" />
                      <span>Ver Plano</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: AMORT. LIBERAÇÃO (PRICE TABLE SCHEDULE) */}
        {activeTab === "amort_liberacao" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("liberacao")}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-md hover:shadow transition-all border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-[#00D492]" />
                <span>Voltar para Liberação</span>
              </button>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Amort. Liberação
              </h1>
            </div>

            {/* Header Summary Banner */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Liberado:</span>
                <span className="text-[#00D492] font-bold">{formatBRL(valorLiberado)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Contrato+IOF:</span>
                <span className="text-[#00D492] font-bold">{formatBRL(contratoComIof)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Parcela:</span>
                <span className="text-[#00D492] font-bold">{formatBRL(activeResult.parcela)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Prazo:</span>
                <span className="text-[#00D492] font-bold">{activeResult.prazo} meses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Taxa:</span>
                <span className="text-[#00D492] font-bold">{formatPercent(activeResult.taxa)}</span>
              </div>
            </div>

            {/* Price Schedule Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-700 tracking-wider">
                  <TableIcon className="w-4 h-4 text-[#00D492]" />
                  <span>TABELA PRICE — LIBERAÇÃO</span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {activeTabelaPrice.length} parcelas geradas
                </span>
              </div>

              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nº PMT</th>
                      <th className="py-3 px-4">PARCELA</th>
                      <th className="py-3 px-4">PRINCIPAL</th>
                      <th className="py-3 px-4">JUROS</th>
                      <th className="py-3 px-4 text-right">SALDO DEVEDOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {activeTabelaPrice.map((row) => {
                      const isQuitada = resumoAmortizacao && row.pmtNum > (activeResult.prazo - resumoAmortizacao.parcelasQuitadas)
                      return (
                        <tr 
                          key={row.pmtNum}
                          className={cn(
                            "hover:bg-slate-50 transition-colors",
                            isQuitada ? "bg-[#00D492]/10 text-slate-700" : "text-slate-800"
                          )}
                        >
                          <td className="py-2.5 px-4 font-bold text-slate-500">
                            {row.pmtNum}
                            {isQuitada && (
                              <span className="ml-2 text-[9px] bg-[#00D492]/20 text-emerald-900 px-1.5 py-0.5 rounded font-bold">
                                Quitada
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-semibold text-slate-900">
                            {formatBRL(row.parcela)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-700">
                            {formatBRL(row.principal)}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-600">
                            {formatBRL(row.juros)}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900 text-right">
                            {formatBRL(row.saldoDevedor)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: PORTABILIDADE DA LIBERAÇÃO */}
        {activeTab === "port_liberacao" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: PORTABILIDADE & PLANO DE AMORTIZAÇÃO */}
              <div className="lg:col-span-6 space-y-6">
                {/* PORTABILIDADE CARD */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#00D492]">
                    <ArrowLeftRight className="w-4 h-4 text-[#00D492]" />
                    <span>PORTABILIDADE</span>
                  </div>

                  {/* Green Handshake Banner */}
                  <div className="bg-[#00D492]/15 border border-[#00D492]/40 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-slate-800 flex-wrap">
                    <span className="flex items-center gap-1 text-slate-600">
                      <span>🔗 Da liberação —</span>
                    </span>
                    <span>Saldo: <strong className="text-slate-900">{formatBRL(saldoPort)}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>PMT: <strong className="text-slate-900">{formatBRL(pmtAtual)}</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Prazo: <strong className="text-slate-900">{nAtual} meses</strong></span>
                    <span className="text-slate-300">•</span>
                    <span>Taxa: <strong className="text-slate-900">{formatPercent(iAtual)}</strong></span>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                      NOVA PROPOSTA
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          NOVA TAXA (% A.M.)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={novaTaxaInput}
                          onChange={(e) => setNovaTaxaInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          placeholder="0,15"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          NOVO PRAZO (MESES)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={novoPrazoInput}
                          onChange={(e) => setNovoPrazoInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          placeholder="96"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          NOVA PARCELA (R$)
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={formatBRL(pmtNova).replace("R$", "").trim()}
                          className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-800 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* COEF PÓS-PORT DISPLAY */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                        COEF PÓS-PORT
                      </span>
                      <span className="text-base font-extrabold text-indigo-900">
                        {coefPosPort.toFixed(6)}
                      </span>
                    </div>

                    {/* Toggle Switch Amortização pós-port */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setAmortizacaoPosPort(!amortizacaoPosPort)}
                        className={cn(
                          "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                          amortizacaoPosPort ? "bg-[#00D492]" : "bg-slate-300"
                        )}
                      >
                        <span
                          className={cn(
                            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                            amortizacaoPosPort ? "translate-x-5" : "translate-x-0"
                          )}
                        />
                      </button>
                      <span className="text-xs font-semibold text-slate-600">
                        Amortização pós-port
                      </span>
                    </div>

                    {amortizacaoPosPort && (
                      <div className="pt-1">
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                          VALOR PARA O CLIENTE (R$)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={valorClientePortInput}
                          onChange={(e) => setValorClientePortInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                          placeholder="2000"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* PLANO DE AMORTIZAÇÃO (NOVA PROPOSTA) */}
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#00D492]">
                      <TableIcon className="w-4 h-4 text-[#00D492]" />
                      <span>PLANO DE AMORTIZAÇÃO</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {planosAmortizacaoPort.map((p) => {
                      const isSelected = novoPrazo === p.term
                      return (
                        <button
                          key={p.term}
                          type="button"
                          onClick={() => {
                            setNovoPrazoInput(p.term.toString())
                            setSelectedPlanTerm(p.term)
                          }}
                          className={cn(
                            "p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-slate-400",
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-[#00D492]"
                              : "bg-white text-slate-800 border-slate-200"
                          )}
                        >
                          <span className="text-lg font-extrabold tracking-tight">{p.term}x</span>
                          <span className={cn(
                            "text-[10px] font-semibold flex flex-col items-center gap-0.5",
                            isSelected ? "text-[#00D492]" : "text-slate-500"
                          )}>
                            <span>Taxa {formatPercent(p.taxa, 2)}</span>
                            <span>{p.term === novoPrazo ? "Parcela" : "Média"} {formatBRL(p.parcelaMedia)}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: COMPARATIVO & AÇÕES */}
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#00D492]">
                    <Calculator className="w-4 h-4 text-[#00D492]" />
                    <span>COMPARATIVO</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* SITUAÇÃO ATUAL */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        SITUAÇÃO ATUAL
                      </p>
                      <p className="text-xl font-black text-slate-900">
                        {formatBRL(pmtAtual)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-500">
                        {nAtual} parcelas · {formatPercent(iAtual)} a.m.
                      </p>
                      <p className="text-[11px] font-bold text-slate-700 pt-1">
                        Total: {formatBRL(totalAtualPort)}
                      </p>
                    </div>

                    {/* NOSSA PROPOSTA NOVO */}
                    <div className="bg-[#00D492]/10 border border-[#00D492]/40 rounded-xl p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          NOSSA PROPOSTA
                        </p>
                        <span className="bg-[#00D492] text-slate-900 text-[9px] font-extrabold px-1.5 py-0.5 rounded">
                          NOVO
                        </span>
                      </div>
                      <p className="text-xl font-black text-slate-900">
                        {formatBRL(pmtNova)}
                      </p>
                      <p className="text-[11px] font-semibold text-slate-600">
                        {novoPrazo} meses · {formatPercent(novaTaxaDecimal, 2)} a.m.
                      </p>
                      <p className="text-[11px] font-bold text-slate-800 pt-1">
                        Total: {formatBRL(totalNovoPort)}
                      </p>
                    </div>
                  </div>

                  {/* ECONOMIA MENSAL & ECONOMIA TOTAL BANNER */}
                  <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-md">
                    <div>
                      <p className="text-[10px] font-extrabold text-[#00D492] uppercase tracking-wider">
                        ECONOMIA MENSAL
                      </p>
                      <p className="text-2xl font-black text-[#00D492]">
                        {formatBRL(economiaMensal)}<span className="text-xs font-normal text-slate-300">/mês</span>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-extrabold text-[#00D492] uppercase tracking-wider">
                        ECONOMIA TOTAL
                      </p>
                      <p className="text-2xl font-black text-[#00D492]">
                        {formatBRL(economiaTotal)}
                      </p>
                    </div>
                  </div>

                  {/* RESUMO AMORTIZAÇÃO PÓS-PORT */}
                  {amortizacaoPosPort && resumoAmortizacaoPort && (
                    <div className="pt-3 border-t border-slate-200 space-y-3">
                      <p className="text-[10px] font-extrabold text-[#00D492] uppercase tracking-wider">
                        RESUMO AMORTIZAÇÃO PÓS-PORT
                      </p>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Valor p/ antecipação</span>
                          <span className="font-extrabold text-slate-900">{formatBRL(resumoAmortizacaoPort.valorAntecipacao)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Quanto antecipado</span>
                          <span className="font-extrabold text-slate-900">{formatBRL(resumoAmortizacaoPort.quantoAntecipado)}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-slate-100">
                          <span className="text-slate-600 font-medium">Parcelas quitadas</span>
                          <span className="font-extrabold text-slate-900">{resumoAmortizacaoPort.parcelasQuitadas} parcelas</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-slate-600 font-medium">Remanescentes</span>
                          <span className="font-extrabold text-slate-900">{resumoAmortizacaoPort.remanescentes} meses</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* BOTÕES DE AÇÃO */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setActiveTab("amort_pos_port")}
                    className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <TableIcon className="w-4 h-4 text-slate-500" />
                    <span>Ver amortização</span>
                  </button>

                  <button
                    onClick={() => setShowSummaryModal(true)}
                    className="bg-[#00D492] hover:bg-[#00b87f] text-slate-900 font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-sm flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Resumo completo</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: TABELA PRICE PÓS-PORTABILIDADE */}
        {activeTab === "amort_pos_port" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab("port_liberacao")}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-md hover:shadow transition-all border border-slate-700"
                >
                  <ArrowLeft className="w-4 h-4 text-[#00D492]" />
                  <span>Voltar para Portabilidade</span>
                </button>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Amort. pós Port
                </h1>
              </div>
            </div>

            {/* Top Black Metrics Banner */}
            <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center gap-6 text-xs shadow-md">
              <div>
                <span className="text-slate-400">Saldo port:</span>{" "}
                <strong className="text-[#00D492]">{formatBRL(saldoPort)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Nova parcela:</span>{" "}
                <strong className="text-[#00D492]">{formatBRL(pmtNova)}</strong>
              </div>
              <div>
                <span className="text-slate-400">Prazo:</span>{" "}
                <strong className="text-[#00D492]">{novoPrazo} meses</strong>
              </div>
              <div>
                <span className="text-slate-400">Taxa:</span>{" "}
                <strong className="text-[#00D492]">{formatPercent(novaTaxaDecimal, 2)}</strong>
              </div>
            </div>

            {/* Price Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2 font-bold text-xs uppercase text-slate-700 tracking-wider">
                  <TableIcon className="w-4 h-4 text-[#00D492]" />
                  <span>TABELA PRICE — PÓS-PORTABILIDADE</span>
                </div>
                <span className="text-xs font-medium text-slate-500">
                  {tabelaPricePosPort.length} parcelas geradas
                </span>
              </div>

              <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[10px] sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Nº PMT</th>
                      <th className="py-3 px-4">PARCELA</th>
                      <th className="py-3 px-4">PRINCIPAL</th>
                      <th className="py-3 px-4">JUROS</th>
                      <th className="py-3 px-4 text-right">SALDO DEVEDOR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {tabelaPricePosPort.map((row) => (
                      <tr key={row.pmtNum} className="hover:bg-slate-50 transition-colors text-slate-800">
                        <td className="py-2.5 px-4 font-bold text-slate-500">{row.pmtNum}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{formatBRL(row.parcela)}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-700">{formatBRL(row.principal)}</td>
                        <td className="py-2.5 px-4 font-medium text-slate-600">{formatBRL(row.juros)}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900 text-right">{formatBRL(row.saldoDevedor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: CALCULADORA DO CIDADÃO (BACEN) */}
        {activeTab === "cidadao" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div>
                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#00D492] mb-2">
                  <Calculator className="w-4 h-4 text-[#00D492]" />
                  <span>CALCULADORA DO CIDADÃO (BACEN)</span>
                </div>
                <p className="text-xs text-slate-500">
                  Preencha 3 dos 4 campos abaixo — deixe em branco o que você quer descobrir. Funciona igual a calculadora do cidadão do Banco Central (Tabela Price).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                    VALOR FINANCIADO / SALDO (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cidadaoPvInput}
                    onChange={(e) => setCidadaoPvInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="deixe em branco para calcular"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                    PARCELA (R$)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cidadaoPmtInput}
                    onChange={(e) => setCidadaoPmtInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="deixe em branco para calcular"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                    PRAZO (MESES)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cidadaoPrazoInput}
                    onChange={(e) => setCidadaoPrazoInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="deixe em branco para calcular"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                    TAXA (% A.M.)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={cidadaoTaxaInput}
                    onChange={(e) => setCidadaoTaxaInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    placeholder="deixe em branco para calcular"
                  />
                </div>
              </div>
            </div>

            {/* RESULTS OR WARNING BANNER */}
            {cidadaoCalculo.status === "invalid_count" && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-center text-sm font-semibold">
                Deixe um dos 4 campos em branco — esse é o que será calculado.
              </div>
            )}

            {cidadaoCalculo.status === "success" && (
              <div className="bg-white rounded-2xl p-8 border-2 border-[#00D492] shadow-sm space-y-2">
                <div className="flex items-center justify-start gap-2 text-xs font-bold uppercase tracking-wider text-[#00D492]">
                  <CheckCircle2 className="w-4 h-4 text-[#00D492]" />
                  <span>RESULTADO</span>
                </div>
                <div className="text-center pt-2">
                  <p className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    {cidadaoCalculo.label}
                  </p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                    {cidadaoCalculo.value}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* SUMMARY MODAL */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <FileText className="w-5 h-5 text-[#00D492]" />
                <span>Resumo Completo da Simulação</span>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 p-4 rounded-xl space-y-2">
                <p className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Premissas</p>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div>Parcela: <span className="font-bold">{formatBRL(activeResult.parcela)}</span></div>
                  <div>Coeficiente: <span className="font-bold">{coeficiente}</span></div>
                  <div>Valor Liberado: <span className="font-bold">{formatBRL(valorLiberado)}</span></div>
                  <div>IOF: <span className="font-bold">{iofPercent}%</span></div>
                  <div>Prazo: <span className="font-bold">{activeResult.prazo} meses</span></div>
                  <div>Taxa: <span className="font-bold">{formatPercent(activeResult.taxa)}</span></div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-2">
                <p className="font-bold uppercase tracking-wider text-[10px] text-[#00D492]">Resultados Financeiros</p>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Contrato + IOF:</span>
                    <span className="font-bold">{formatBRL(contratoComIof)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total a Pagar:</span>
                    <span className="font-bold">{formatBRL(activeResult.totalAPagar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total de Juros:</span>
                    <span className="font-bold">{formatBRL(activeResult.totalJuros)}</span>
                  </div>
                </div>
              </div>

              {resumoAmortizacao && (
                <div className="bg-[#00D492]/10 border border-[#00D492]/30 p-4 rounded-xl space-y-2 text-slate-800">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-800">Resumo de Antecipação</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Valor no Bolso do Cliente:</span>
                      <span className="font-bold">{formatBRL(valorBolso)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor p/ Antecipação:</span>
                      <span className="font-bold">{formatBRL(resumoAmortizacao.valorAntecipacao)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quanto Antecipado:</span>
                      <span className="font-bold">{formatBRL(resumoAmortizacao.quantoAntecipado)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Parcelas Quitadas:</span>
                      <span className="font-bold">{resumoAmortizacao.parcelasQuitadas}</span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-extrabold pt-1 border-t border-[#00D492]/30">
                      <span>Saldo para Portabilidade:</span>
                      <span className="text-emerald-700">{formatBRL(resumoAmortizacao.saldoParaPort)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* PORTABILIDADE SUMMARY IN MODAL */}
              {(activeTab === "port_liberacao" || activeTab === "amort_pos_port") && (
                <div className="bg-[#00D492]/10 border border-[#00D492]/30 p-4 rounded-xl space-y-2 text-slate-800">
                  <p className="font-bold uppercase tracking-wider text-[10px] text-emerald-800">
                    Proposta de Portabilidade
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Saldo Portado:</span>
                      <span className="font-bold">{formatBRL(saldoPort)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nova Taxa / Prazo:</span>
                      <span className="font-bold">{formatPercent(novaTaxaDecimal, 2)} a.m. / {novoPrazo} meses</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nova Parcela:</span>
                      <span className="font-bold text-slate-900">{formatBRL(pmtNova)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Economia Mensal:</span>
                      <span className="font-bold text-emerald-700">{formatBRL(economiaMensal)}/mês</span>
                    </div>
                    <div className="flex justify-between font-extrabold pt-1 border-t border-[#00D492]/30 text-slate-900">
                      <span>Economia Total:</span>
                      <span className="text-emerald-700">{formatBRL(economiaTotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PLANO DE AMORTIZAÇÃO (OPÇÃO DO PLANO + NOME DO CLIENTE + GERAR PDF) */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <FileText className="w-5 h-5 text-[#00D492]" />
              <span>Plano de amortização</span>
            </div>

            {/* Selected Plan Summary Box */}
            {activeTab === "port_liberacao" || activeTab === "amort_pos_port" ? (
              <div className="bg-[#00D492]/15 border border-[#00D492]/40 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#00D492]/20 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {novoPrazo}x · Parcela {formatBRL(pmtNova)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-600">
                      Taxa {formatPercent(novaTaxaDecimal, 2)} a.m.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChangePlanModal(true)}
                  className="bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>Alterar</span>
                </button>
              </div>
            ) : resumoAmortizacao ? (
              <div className="bg-[#00D492]/15 border border-[#00D492]/40 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#00D492]/20 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {resumoAmortizacao.remanescentes}x · Parcela {formatBRL(parcela)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-600">
                      {resumoAmortizacao.parcelasQuitadas} parcelas quitadas · Cliente: {formatBRL(valorBolso)}
                    </p>
                  </div>
                </div>
              </div>
            ) : selectedPlanObj && (
              <div className="bg-[#00D492]/15 border border-[#00D492]/40 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#00D492]/20 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      {selectedPlanObj.term}x · Parcela média {formatBRL(selectedPlanObj.parcelaMedia)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-600">
                      Taxa {formatPercent(selectedPlanObj.taxa)} a.m.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowChangePlanModal(true)}
                  className="bg-white hover:bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm flex items-center gap-1 transition-all"
                >
                  <Pencil className="w-3.5 h-3.5 text-slate-500" />
                  <span>Alterar</span>
                </button>
              </div>
            )}

            {/* Input Nome do Cliente */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                NOME DO CLIENTE
              </label>
              <input
                type="text"
                value={clienteNome}
                onChange={(e) => setClienteNome(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#00D492] shadow-sm"
              />
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPlanModal(false)}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-xl transition-all font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleGerarPDF}
                className="bg-[#00D492] hover:bg-[#00b87f] text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4" />
                <span>Ver Plano</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALTERAR PLANO (ESCOLHA O PRAZO DE AMORTIZAÇÃO) */}
      {showChangePlanModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <FileText className="w-5 h-5 text-[#00D492]" />
              <span>Plano de amortização</span>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                ESCOLHA O PRAZO DE AMORTIZAÇÃO
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {planosAmortizacao.map((p) => {
                  const isSelected = selectedPlanTerm === p.term
                  return (
                    <button
                      key={p.term}
                      onClick={() => {
                        setSelectedPlanTerm(p.term)
                        if (activeTab === "port_liberacao" || activeTab === "amort_pos_port") {
                          setNovoPrazoInput(p.term.toString())
                        }
                        setShowChangePlanModal(false)
                      }}
                      className={cn(
                        "py-3 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5",
                        isSelected
                          ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-[#00D492]"
                          : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      )}
                    >
                      <span className="text-base font-extrabold tracking-tight">
                        {p.term}x
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowChangePlanModal(false)}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl transition-all font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPARATIVE MODAL (COMPARAR PLANOS DE AMORTIZAÇÃO) */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 border border-slate-200 shadow-2xl space-y-6 my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <ArrowLeftRight className="w-5 h-5 text-[#00D492]" />
                <span>Comparativo de Planos de Amortização</span>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Plan selector chips */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-xs text-slate-700 uppercase tracking-wider">
                    Selecione 2 ou 3 planos para comparar lado a lado:
                  </p>
                  <span className="text-[11px] font-bold text-slate-500">
                    {selectedCompareTerms.length} selecionado(s) (Máx. 3)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {planosAmortizacao.map((p) => {
                    const isSelected = selectedCompareTerms.includes(p.term)
                    return (
                      <button
                        key={p.term}
                        type="button"
                        onClick={() => handleToggleCompareTerm(p.term)}
                        className={cn(
                          "px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          isSelected
                            ? "bg-slate-900 text-[#00D492] border-slate-900 shadow-sm ring-1 ring-[#00D492]"
                            : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100"
                        )}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#00D492]" />}
                        <span>{p.term}x</span>
                      </button>
                    )
                  })}
                </div>

                {compareWarning && (
                  <p className="text-xs font-bold text-amber-600 pt-1">
                    ⚠️ {compareWarning}
                  </p>
                )}
              </div>

              {/* Cards Comparison Grid */}
              <div
                className={cn(
                  "grid gap-4",
                  selectedCompareTerms.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"
                )}
              >
                {selectedCompareTerms
                  .map((term) => planosAmortizacao.find((p) => p.term === term))
                  .filter(Boolean)
                  .map((plan) => {
                    if (!plan) return null
                    const totJuros = Math.max(0, plan.totalPagar - valorLiberado)
                    const economiaTotal = totalAPagar > plan.totalPagar ? totalAPagar - plan.totalPagar : 0

                    return (
                      <div
                        key={plan.term}
                        className="bg-white border-2 border-slate-900 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          {/* Plan Header */}
                          <div className="bg-slate-900 text-white p-4 text-center space-y-0.5">
                            <span className="text-2xl font-black text-[#00D492] tracking-tight block">
                              {plan.term} Meses
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 tracking-wider block">
                              Plano de Amortização
                            </span>
                          </div>

                          {/* Metrics List */}
                          <div className="p-4 space-y-2.5 text-xs divide-y divide-slate-100">
                            <div className="flex justify-between items-center pt-1">
                              <span className="font-semibold text-slate-500">Valor Liberado</span>
                              <span className="font-extrabold text-[#00D492] text-base">{formatBRL(valorLiberado)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2.5">
                              <span className="font-semibold text-slate-500">Parcela Média</span>
                              <span className="font-extrabold text-slate-900">{formatBRL(plan.parcelaMedia)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2.5">
                              <span className="font-semibold text-slate-500">Taxa Mês</span>
                              <span className="font-extrabold text-slate-900">{formatPercent(plan.taxa, 2)}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2.5">
                              <span className="font-semibold text-slate-500">Total Previsto</span>
                              <span className="font-extrabold text-slate-900">{formatBRL(plan.totalPagar)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Economy Callout */}
                        {economiaTotal > 0 && (
                          <div className="p-4 pt-0">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center space-y-0.5">
                              <p className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider">
                                Economia no Total
                              </p>
                              <p className="text-base font-black text-emerald-600">
                                {formatBRL(economiaTotal)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCompareModal(false)}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs px-5 py-3 rounded-xl transition-all cursor-pointer"
              >
                Fechar
              </button>

              <button
                type="button"
                onClick={handleGerarPDFComparativo}
                disabled={selectedCompareTerms.length < 2}
                className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 border border-slate-800 cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-[#00D492]" />
                <span>Gerar PDF Comparativo (Paisagem)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
