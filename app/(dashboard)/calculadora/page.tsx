"use client"

import { useState, useMemo, useEffect } from "react"
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

export default function CalculadoraPage() {
  const { perfil, isAdmin } = useAuth()
  
  // Active view state
  const [activeTab, setActiveTab] = useState<string>("liberacao")

  // Premissas Inputs
  const [parcela, setParcela] = useState<number>(0)
  const [coeficienteInput, setCoeficienteInput] = useState<string>("")
  const coeficiente = useMemo(() => {
    return parseFloat(coeficienteInput.replace(",", ".")) || 0
  }, [coeficienteInput])
  const [prazo, setPrazo] = useState<number>(0)
  const [iofPercent, setIofPercent] = useState<number>(5)
  const [valorBolsoInput, setValorBolsoInput] = useState<string>("")

  // Selected plan term in grid
  const [selectedPlanTerm, setSelectedPlanTerm] = useState<number | null>(null)

  // Modals state for Plano de Amortização
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false)
  const [showChangePlanModal, setShowChangePlanModal] = useState<boolean>(false)
  const [clienteNome, setClienteNome] = useState<string>("")

  // Show full summary modal state
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false)

  // Portabilidade da Liberação Inputs & State
  const [novaTaxaInput, setNovaTaxaInput] = useState<string>("")
  const [novoPrazoInput, setNovoPrazoInput] = useState<string>("")
  const [amortizacaoPosPort, setAmortizacaoPosPort] = useState<boolean>(false)
  const [valorClientePortInput, setValorClientePortInput] = useState<string>("")

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

    const pv = parseFloat(cidadaoPvInput.replace(",", ".")) || 0
    const pmt = parseFloat(cidadaoPmtInput.replace(",", ".")) || 0
    const n = parseFloat(cidadaoPrazoInput.replace(",", ".")) || 0
    const i_perc = parseFloat(cidadaoTaxaInput.replace(",", ".")) || 0
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
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
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

  const valorBolso = parseFloat(valorBolsoInput) || 0

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

  // 4. Plano de Amortização (Term options: 12x, 24x, 36x, 48x, 60x, 72x, 84x, 96x, 120x)
  const planosAmortizacao = useMemo(() => {
    const terms = [12, 24, 36, 48, 60, 72, 84, 96, 120]
    
    return terms.map(t => {
      if (t > prazo) {
        return {
          term: t,
          taxa: 0,
          parcelaMedia: 0,
          totalPagar: 0,
          invalido: true
        }
      }

      if (t === prazo) {
        return {
          term: t,
          taxa: taxaImplicita,
          parcelaMedia: parcela,
          totalPagar: totalAPagar,
          invalido: false
        }
      }

      // Present value of first t installments at original implicit rate
      const pvFirstT = taxaImplicita > 0 
        ? (parcela * (1 - Math.pow(1 + taxaImplicita, -t)) / taxaImplicita)
        : (parcela * t)

      // Present value of remaining (prazo - t) back-end installments at month 0
      const pvRemaining = Math.max(0, contratoComIof - pvFirstT)

      // Total to pay over t months = regular t payments + PV of remaining installments
      const sumTotalMes = (t * parcela) + pvRemaining
      const pmtMedia = t > 0 ? sumTotalMes / t : 0
      const rateN = calculateImplicitRate(contratoComIof, pmtMedia, t)

      // Unreachable condition (e.g. 12x or rate below threshold)
      const invalido = t < 24 || rateN < 0.008 || pmtMedia <= 0 || sumTotalMes < contratoComIof

      return {
        term: t,
        taxa: rateN,
        parcelaMedia: pmtMedia,
        totalPagar: sumTotalMes,
        invalido
      }
    })
  }, [contratoComIof, taxaImplicita, parcela, prazo, totalAPagar])

  const selectedPlanObj = useMemo(() => {
    return planosAmortizacao.find(p => p.term === selectedPlanTerm) || planosAmortizacao[0]
  }, [planosAmortizacao, selectedPlanTerm])

  const activeResult = useMemo(() => {
    if (selectedPlanTerm && selectedPlanObj && !selectedPlanObj.invalido && valorBolso <= 0) {
      const pmt = selectedPlanObj.parcelaMedia
      const tx = selectedPlanObj.taxa
      const prz = selectedPlanObj.term
      const totPagar = selectedPlanObj.totalPagar
      const totJuros = Math.max(0, totPagar - valorLiberado)
      return {
        labelParcela: prz === prazo ? "Parcela" : "Parcela média",
        parcela: pmt,
        taxa: tx,
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
  }, [selectedPlanTerm, selectedPlanObj, valorBolso, parcela, taxaImplicita, prazo, totalAPagar, totalJuros, valorLiberado])

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

  const novaTaxaPercent = parseFloat(novaTaxaInput) || 0
  const novaTaxaDecimal = novaTaxaPercent / 100
  const novoPrazo = parseInt(novoPrazoInput) || 0

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

  const valorClientePort = parseFloat(valorClientePortInput) || 0
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

  const handleGerarPDF = () => {
    const client = clienteNome.trim() || "Cliente"
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
    const cpf = ""
    const orgao = ""
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

    const term = activeResult.prazo
    const pmt = activeResult.parcela
    const tx = activeResult.taxa
    const totalExtraAmort = Math.max(0, prazo - term)
    const extraPerMonth = term > 0 ? totalExtraAmort / term : 0

    let currentBackInstallment = prazo
    let rowsHtml = ""

    for (let m = 1; m <= term; m++) {
      const numAmortThisMonth = Math.min(
        Math.round(m * extraPerMonth) - Math.round((m - 1) * extraPerMonth),
        currentBackInstallment - term
      )

      const amortNums: number[] = []
      const amortVals: string[] = []
      let sumAmortValsThisMonth = 0

      for (let k = 0; k < numAmortThisMonth && currentBackInstallment > term; k++) {
        amortNums.push(currentBackInstallment)
        const valAmort = Math.max(0, parcela / Math.pow(1 + taxaImplicita, currentBackInstallment))
        sumAmortValsThisMonth += valAmort
        amortVals.push(formatBRL(valAmort))
        currentBackInstallment--
      }

      const isEven = m % 2 === 0
      const rowBg = isEven ? "#F8FAFC" : "#FFFFFF"

      const amortNumsStr = amortNums.length > 0 ? amortNums.join(", ") : "-"
      const amortValsStr = amortVals.length > 0 ? amortVals.join("<br/>") : formatBRL(0)
      const totalMes = parcela + sumAmortValsThisMonth

      rowsHtml += `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${m}</td>
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(parcela)}</td>
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #475569; vertical-align: top;">${amortNumsStr}</td>
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${amortValsStr}</td>
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(totalMes)}</td>
        </tr>
      `
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
              <div class="metric-label">VALOR DO CONTRATO</div>
              <div class="metric-value">${formatBRL(valorLiberado)}</div>
            </div>
            <div class="metric-card" id="metric-card-prazo">
              <div class="metric-label">PRAZO ESTRATÉGIA</div>
              <div class="metric-value metric-highlight">${term} parcelas</div>
            </div>
            <div class="metric-card" id="metric-card-parcela">
              <div class="metric-label">PARCELA MÉDIA</div>
              <div class="metric-value">${formatBRL(pmt)}</div>
            </div>
            <div class="metric-card" id="metric-card-taxa">
              <div class="metric-label">TAXA A.M.</div>
              <div class="metric-value">${formatPercent(tx, 2)}</div>
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
  const handleParcelaChange = (v: number) => {
    setParcela(v)
  }

  const handleCoeficienteChange = (v: string) => {
    setCoeficienteInput(v)
  }

  const handleLiberadoChange = (v: number) => {
    if (v > 0 && parcela > 0) {
      const calc = parcela / v
      setCoeficienteInput(Number.isFinite(calc) ? calc.toString() : "")
    } else {
      setCoeficienteInput("")
    }
  }

  return (
    <div className="p-6 md:p-8 lg:p-10 min-h-screen bg-slate-50 text-slate-800">
      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto space-y-6">
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

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                        PARCELA / MARGEM (R$)
                      </label>
                      <input
                        type="number"
                        value={parcela || ""}
                        onChange={(e) => handleParcelaChange(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                        placeholder="1000"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                        COEFICIENTE
                      </label>
                      <input
                        type="number"
                        step="any"
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
                        type="number"
                        value={Math.round(valorLiberado * 100) / 100 || ""}
                        onChange={(e) => handleLiberadoChange(parseFloat(e.target.value) || 0)}
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
                        type="number"
                        value={prazo || ""}
                        onChange={(e) => setPrazo(parseInt(e.target.value) || 0)}
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
                        type="number"
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
                    {planosAmortizacao.map((p) => {
                      const isSelected = selectedPlanTerm === p.term
                      return (
                        <button
                          key={p.term}
                          disabled={p.invalido}
                          onClick={() => {
                            if (!p.invalido) {
                              setSelectedPlanTerm(p.term)
                            }
                          }}
                          className={cn(
                            "p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1",
                            p.invalido
                              ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-80"
                              : isSelected
                                ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-[#00D492]"
                                : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          )}
                        >
                          <span className="text-xl font-extrabold tracking-tight">
                            {p.term}x
                          </span>
                          {p.invalido ? (
                            <span className="text-[10px] font-semibold text-rose-500 leading-tight">
                              Condição específica não alcançada
                            </span>
                          ) : (
                            <span className={cn(
                              "text-[10px] font-semibold flex flex-col items-center gap-0.5",
                              isSelected ? "text-[#00D492]" : "text-slate-500"
                            )}>
                              <span>Taxa {formatPercent(p.taxa, 4)} · {p.term === prazo ? "Parcela" : "Média"} {formatBRL(p.parcelaMedia)}</span>
                            </span>
                          )}
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

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Total a pagar</span>
                      <span className="font-bold text-slate-900">{formatBRL(activeResult.totalAPagar)}</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Total de juros</span>
                      <span className="font-bold text-slate-900">{formatBRL(activeResult.totalJuros)}</span>
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
                  <div className="pt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setActiveTab("amort_liberacao")}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs py-3 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <TableIcon className="w-4 h-4 text-slate-600" />
                      <span>Ver amortização</span>
                    </button>

                    <button
                      onClick={() => setShowSummaryModal(true)}
                      className="flex-1 bg-[#00D492] hover:bg-[#00b87f] text-slate-900 font-bold text-xs py-3 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Resumo</span>
                    </button>

                    <button
                      onClick={handleGerarPDF}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3 px-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 border border-slate-800"
                    >
                      <FileText className="w-4 h-4 text-[#00D492]" />
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
                          type="number"
                          step="0.01"
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
                          type="number"
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
                          type="number"
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
                    {[12, 24, 36, 48, 60, 72, 84, 96, 120].map((t) => {
                      const isSelected = novoPrazo === t
                      const isAvailable = t <= novoPrazo
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setNovoPrazoInput(t.toString())
                            setSelectedPlanTerm(t)
                            setShowPlanModal(true)
                          }}
                          className={cn(
                            "p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-slate-400",
                            isSelected
                              ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-[#00D492]"
                              : isAvailable
                              ? "bg-white text-slate-800 border-slate-200"
                              : "bg-slate-50/70 text-slate-400 border-slate-200/60"
                          )}
                        >
                          <span className="text-lg font-extrabold tracking-tight">{t}x</span>
                          <span className={cn(
                            "text-[10px] font-semibold",
                            isSelected
                              ? "text-[#00D492]"
                              : isAvailable
                              ? "text-slate-500"
                              : "text-red-400/80"
                          )}>
                            {!isAvailable
                              ? "Indisponível (prazo maior que contrato)"
                              : t === novoPrazo
                              ? `Prazo Selecionado (${formatBRL(pmtNova)})`
                              : "Condição específica não alcançada"}
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
                    type="number"
                    step="any"
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
                    type="number"
                    step="any"
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
                    type="number"
                    step="any"
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
    </div>
  )
}
