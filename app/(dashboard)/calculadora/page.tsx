"use client"

import { useState, useMemo } from "react"
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
function formatPercent(val: number, decimals = 4): string {
  if (isNaN(val) || !isFinite(val)) return "0,0000%"
  return (val * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + "%"
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
  const [iofPercent, setIofPercent] = useState<number>(0)
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

  // 3. Price Amortization Schedule
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

  // 4. Antecipação / Resumo Amortização
  const valorBolso = parseFloat(valorBolsoInput) || 0
  const temAntecipacao = valorBolso > 0 && valorBolso < valorLiberado

  const resumoAmortizacao = useMemo(() => {
    if (!temAntecipacao || tabelaPrice.length === 0) {
      return null
    }

    const valorAntecipacao = Math.max(0, valorLiberado - valorBolso)

    // Find parcelas quitadas q from the back (from month n down to 1)
    let parcelasQuitadas = 0
    let quantoAntecipado = 0
    let remanescentes = prazo
    let saldoParaPort = contratoComIof

    for (let q = 1; q < prazo; q++) {
      const remIndex = prazo - q - 1
      const sdRem = remIndex >= 0 ? tabelaPrice[remIndex].saldoDevedor : contratoComIof
      const pvAnt = contratoComIof - sdRem

      if (pvAnt <= valorAntecipacao + 0.01) {
        parcelasQuitadas = q
        quantoAntecipado = pvAnt
        remanescentes = prazo - q
        saldoParaPort = sdRem
      } else {
        break
      }
    }

    return {
      valorAntecipacao,
      quantoAntecipado,
      parcelasQuitadas,
      remanescentes,
      saldoParaPort
    }
  }, [temAntecipacao, valorLiberado, valorBolso, contratoComIof, prazo, tabelaPrice])

  // 5. Plano de Amortização (Term options: 12x, 24x, 36x, 48x, 60x, 72x, 84x, 96x, 120x)
  const planosAmortizacao = useMemo(() => {
    const terms = [12, 24, 36, 48, 60, 72, 84, 96, 120]
    
    return terms.map(t => {
      const ratio = t / 120
      const rateN = t === 120 
        ? taxaImplicita 
        : taxaImplicita * (0.15 + 0.85 * Math.pow(ratio, 0.85))

      const compound = Math.pow(1 + rateN, t)
      const pmtN = compound > 1 
        ? contratoComIof * ((rateN * compound) / (compound - 1))
        : 0

      return {
        term: t,
        taxa: rateN,
        parcelaMedia: pmtN
      }
    })
  }, [taxaImplicita, contratoComIof])

  const selectedPlanObj = useMemo(() => {
    return planosAmortizacao.find(p => p.term === selectedPlanTerm) || planosAmortizacao[0]
  }, [planosAmortizacao, selectedPlanTerm])

  // Portabilidade da Liberação - Handshake & Calculations
  const saldoPort = resumoAmortizacao ? resumoAmortizacao.saldoParaPort : contratoComIof
  const nAtual = resumoAmortizacao ? resumoAmortizacao.remanescentes : prazo
  const pmtAtual = parcela
  const iAtual = taxaImplicita

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
            <title>Plano de Portabilidade - ${client}</title>
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1E293B; background: #FFF; }
              .header-banner { background-color: #111827; color: #FFF; padding: 24px 32px; border-bottom: 4px solid #00D492; }
              .header-banner h1 { margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800; text-transform: uppercase; }
              .sub-header { background-color: #1E293B; color: #FFF; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; }
              .client-info { display: flex; align-items: center; gap: 12px; }
              .avatar { width: 38px; height: 38px; border-radius: 50%; background: #00D492; color: #111827; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 14px; }
              .consultant-info { text-align: right; font-size: 12px; }
              .consultant-info .name { color: #00D492; font-weight: bold; font-size: 13px; }
              .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 24px 32px; }
              .metric-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #FFF; }
              .metric-label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
              .metric-value { font-size: 20px; font-weight: 900; color: #0F172A; margin: 4px 0; }
              .metric-highlight { color: #00D492; }
              .metric-sub { font-size: 11px; color: #64748B; font-weight: 600; }
              .table-container { margin: 0 32px 24px 32px; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
              table { width: 100%; border-collapse: collapse; font-size: 12px; }
              th { background-color: #111827; color: #00D492; padding: 12px 16px; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-align: center; }
              .footer-note { margin: 24px 32px; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <div class="header-banner">
              <h1>PLANO DE PORTABILIDADE & AMORTIZAÇÃO</h1>
            </div>
            <div class="sub-header">
              <div class="client-info">
                <div class="avatar">${initials}</div>
                <div>
                  <div style="font-weight: 800; font-size: 15px; text-transform: uppercase;">${client}</div>
                  <div style="font-size: 11px; color: #94A3B8;">Proposta de Portabilidade</div>
                </div>
              </div>
              <div class="consultant-info">
                <div style="color: #94A3B8; font-size: 10px; text-transform: uppercase; font-weight: 700;">Consultor</div>
                <div class="name">${consultant}</div>
                <div style="color: #CBD5E1;">${email}</div>
              </div>
            </div>

            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">SALDO PORTADO</div>
                <div class="metric-value">${formatBRL(saldoPort)}</div>
                <div class="metric-sub">Prazo anterior: ${nAtual} meses</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">NOVA PARCELA</div>
                <div class="metric-value metric-highlight">${formatBRL(pmtNova)}</div>
                <div class="metric-sub">Economia mensal: ${formatBRL(economiaMensal)}</div>
              </div>
              <div class="metric-card">
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

            <div class="footer-note">
              <div>
                Esta simulação de portabilidade utiliza cálculo de tabela Price refinanciada. Proposta válida somente para a data de emissão (${todayStr}). Taxas sujeitas à alteração.
              </div>
              <div style="font-weight: bold; white-space: nowrap; margin-left: 16px;">
                Desenvolvido por SharkConsig
              </div>
            </div>

            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
      return
    }

    const term = selectedPlanTerm || 48
    const totalExtraAmort = Math.max(0, prazo - term)
    const extraPerMonth = totalExtraAmort / term

    let currentBackInstallment = prazo - 1
    let rowsHtml = ""

    for (let m = 1; m <= term; m++) {
      const numAmortThisMonth = Math.min(
        Math.round(m * extraPerMonth) - Math.round((m - 1) * extraPerMonth),
        currentBackInstallment - term + 1
      )

      const amortNums: number[] = []
      const amortVals: string[] = []

      for (let k = 0; k < numAmortThisMonth && currentBackInstallment >= term; k++) {
        amortNums.push(currentBackInstallment)
        const remMonths = currentBackInstallment - m + 1
        const valAmort = Math.max(0, parcela / Math.pow(1 + taxaImplicita, remMonths))
        amortVals.push(formatBRL(valAmort))
        currentBackInstallment--
      }

      const isEven = m % 2 === 0
      const rowBg = isEven ? "#F8FAFC" : "#FFFFFF"

      const amortNumsStr = amortNums.length > 0 ? amortNums.join("<br/>") : "-"
      const amortValsStr = amortVals.length > 0 ? amortVals.join("<br/>") : formatBRL(0)

      rowsHtml += `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${m}</td>
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(parcela)}</td>
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #475569; vertical-align: top;">${amortNumsStr}</td>
          <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${amortValsStr}</td>
        </tr>
      `
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Plano de Amortização - ${client}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #1E293B; background: #FFF; }
            .header-banner { background-color: #111827; color: #FFF; padding: 24px 32px; border-bottom: 4px solid #00D492; }
            .header-banner h1 { margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800; text-transform: uppercase; }
            .sub-header { background-color: #1E293B; color: #FFF; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; }
            .client-info { display: flex; align-items: center; gap: 12px; }
            .avatar { width: 38px; height: 38px; border-radius: 50%; background: #00D492; color: #111827; font-weight: 900; display: flex; align-items: center; justify-content: center; font-size: 14px; }
            .consultant-info { text-align: right; font-size: 12px; }
            .consultant-info .name { color: #00D492; font-weight: bold; font-size: 13px; }
            .metrics-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin: 24px 32px; }
            .metric-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; background: #FFF; }
            .metric-label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
            .metric-value { font-size: 20px; font-weight: 900; color: #0F172A; margin: 4px 0; }
            .metric-highlight { color: #00D492; }
            .metric-sub { font-size: 11px; color: #64748B; font-weight: 600; }
            .table-container { margin: 0 32px 24px 32px; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { background-color: #111827; color: #00D492; padding: 12px 16px; text-transform: uppercase; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-align: center; }
            .footer-note { margin: 24px 32px; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <h1>PLANO DE AMORTIZAÇÃO</h1>
          </div>
          <div class="sub-header">
            <div class="client-info">
              <div class="avatar">${initials}</div>
              <div>
                <div style="font-weight: 800; font-size: 15px; text-transform: uppercase;">${client}</div>
                <div style="font-size: 11px; color: #94A3B8;">Plano de Amortização</div>
              </div>
            </div>
            <div class="consultant-info">
              <div style="color: #94A3B8; font-size: 10px; text-transform: uppercase; font-weight: 700;">Consultor</div>
              <div class="name">${consultant}</div>
              <div style="color: #CBD5E1;">${email}</div>
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">VALOR DO CONTRATO</div>
              <div class="metric-value">${formatBRL(contratoComIof)}</div>
              <div class="metric-sub">Prazo original: ${prazo} meses</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">PRAZO ESTIMADO</div>
              <div class="metric-value metric-highlight">${term} parcelas</div>
              <div class="metric-sub">Economia expressiva de tempo</div>
            </div>
            <div class="metric-card">
              <div class="metric-label">PARCELA MÉDIA</div>
              <div class="metric-value">${formatBRL(selectedPlanObj?.parcelaMedia ?? 0)}</div>
              <div class="metric-sub">Fixa em folha: ${formatBRL(parcela)}</div>
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
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <div class="footer-note">
            <div>
              Esta simulação pode utilizar estratégia de amortização, podendo haver variação nos valores conforme cálculos diários. Proposta válida somente para a data de emissão (${todayStr}). Taxas sujeitas à alteração.
            </div>
            <div style="font-weight: bold; white-space: nowrap; margin-left: 16px;">
              Desenvolvido por SharkConsig
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            };
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
                        onChange={(e) => setIofPercent(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <option value={0}>0%</option>
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
                        onChange={(e) => setValorBolsoInput(e.target.value)}
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
                          onClick={() => {
                            setSelectedPlanTerm(p.term)
                            setShowPlanModal(true)
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
                            "text-[10px] font-semibold",
                            isSelected ? "text-[#00D492]" : "text-slate-500"
                          )}>
                            Taxa {formatPercent(p.taxa)} · {p.term === prazo ? "Parcela" : "Média"} {formatBRL(p.parcelaMedia)}
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
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        VALOR LIBERADO
                      </p>
                      <p className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                        {formatBRL(valorLiberado)}
                      </p>
                    </div>

                    <div className="bg-slate-900 text-white p-4 rounded-xl space-y-1 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        CONTRATO + IOF
                      </p>
                      <p className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                        {formatBRL(contratoComIof)}
                      </p>
                    </div>
                  </div>

                  {/* Summary Rows */}
                  <div className="divide-y divide-slate-100 text-xs">
                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Parcela</span>
                      <span className="font-bold text-slate-900">{formatBRL(parcela)}</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Taxa implícita</span>
                      <span className="font-bold text-slate-900">{formatPercent(taxaImplicita)}</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Prazo</span>
                      <span className="font-bold text-slate-900">{prazo} meses</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Total a pagar</span>
                      <span className="font-bold text-slate-900">{formatBRL(totalAPagar)}</span>
                    </div>

                    <div className="py-2.5 flex justify-between items-center">
                      <span className="font-semibold text-slate-500">Total de juros</span>
                      <span className="font-bold text-slate-900">{formatBRL(totalJuros)}</span>
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
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                      <TableIcon className="w-4 h-4 text-slate-600" />
                      <span>Ver amortização</span>
                    </button>

                    <button
                      onClick={() => setShowSummaryModal(true)}
                      className="flex-1 bg-[#00D492] hover:bg-[#00b87f] text-slate-900 font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Resumo completo</span>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <button
                  onClick={() => setActiveTab("liberacao")}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-1"
                >
                  ← Voltar para Liberação
                </button>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Amort. Liberação
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir</span>
                </button>
              </div>
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
                <span className="text-[#00D492] font-bold">{formatBRL(parcela)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Prazo:</span>
                <span className="text-[#00D492] font-bold">{prazo} meses</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Taxa:</span>
                <span className="text-[#00D492] font-bold">{formatPercent(taxaImplicita)}</span>
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
                  {tabelaPrice.length} parcelas geradas
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
                    {tabelaPrice.map((row) => {
                      const isQuitada = resumoAmortizacao && row.pmtNum > (prazo - resumoAmortizacao.parcelasQuitadas)
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
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                >
                  ← Voltar
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
                  <div>Parcela: <span className="font-bold">{formatBRL(parcela)}</span></div>
                  <div>Coeficiente: <span className="font-bold">{coeficiente}</span></div>
                  <div>Valor Liberado: <span className="font-bold">{formatBRL(valorLiberado)}</span></div>
                  <div>IOF: <span className="font-bold">{iofPercent}%</span></div>
                  <div>Prazo: <span className="font-bold">{prazo} meses</span></div>
                  <div>Taxa: <span className="font-bold">{formatPercent(taxaImplicita)}</span></div>
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
                    <span className="font-bold">{formatBRL(totalAPagar)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total de Juros:</span>
                    <span className="font-bold">{formatBRL(totalJuros)}</span>
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
                <span>Gerar PDF</span>
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
