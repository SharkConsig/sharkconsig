"use client"

import React, { useState, useEffect, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { X, Printer, Search, Loader2, FileText } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export interface RankingContractModalParams {
  personId: string
  personName: string
  category: "paid" | "in_process" | "today"
  categoryLabel: string
  startDate?: string
  endDate?: string
  isPJ?: boolean
}

interface RankingContractsModalProps {
  isOpen: boolean
  onClose: () => void
  params: RankingContractModalParams | null
}

const PAID_STATUSES = [
  "PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA",
  "PÓS-VENDA REALIZADA"
]

const IN_PROCESS_STATUSES = [
  "ANDAMENTO / AGUARDANDO PAGAMENTO",
  "COM INCONSISTÊNCIA NO BANCO",
  "COM INCONSISTÊNCIA NO BANCO / AGUARDANDO OPERACIONAL",
  "AGUARDANDO DIGITAÇÃO OPERACIONAL",
  "COM INCONSISTÊNCIA / AGUARDANDO OPERACIONAL"
]

const parseDateSafe = (dateVal?: string | Date | null) => {
  if (!dateVal) return null
  if (dateVal instanceof Date) return dateVal
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number)
      return new Date(y, m - 1, d, 12, 0, 0)
    }
    const parsed = new Date(trimmed.replace(' ', 'T'))
    if (!isNaN(parsed.getTime())) return parsed
  }
  const d = new Date(dateVal)
  return isNaN(d.getTime()) ? null : d
}

function parseVal(val: any): number {
  if (val === null || val === undefined || val === "") return 0
  if (typeof val === "number") return isNaN(val) ? 0 : val
  if (typeof val === "string") {
    const cleaned = val.replace(/[R$\s]/g, "")
    if (cleaned.includes(",")) {
      const normalized = cleaned.replace(/\./g, "").replace(",", ".")
      const num = parseFloat(normalized)
      return isNaN(num) ? 0 : num
    } else {
      const num = parseFloat(cleaned)
      return isNaN(num) ? 0 : num
    }
  }
  return 0
}

export function RankingContractsModal({ isOpen, onClose, params }: RankingContractsModalProps) {
  const [proposals, setProposals] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [selectedPersonUser, setSelectedPersonUser] = useState<any>(null)
  const [usersMap, setUsersMap] = useState<Map<string, any>>(new Map())

  const checkUserPJ = (u?: any) => {
    if (!u) return false
    const regime = (u.regime_contratacao || "").trim().toLowerCase()
    const func = (u.funcao || "").trim().toLowerCase()
    const role = (u.role || "").trim().toLowerCase()
    if (func === "desenvolvedor" || func === "developer") return false
    return regime === "pj" || func === "pj" || role === "pj" || func.includes("pj") || role.includes("pj") || regime.includes("pj")
  }

  const isSelectedPersonPJ = useMemo(() => {
    if (params?.isPJ === true) return true
    if (params?.isPJ === false) return false
    // 1. Direct user object check
    if (selectedPersonUser && checkUserPJ(selectedPersonUser)) {
      return true
    }
    // 2. Name match in usersMap
    if (params?.personName) {
      const cleanName = params.personName.trim().toLowerCase()
      const matched = Array.from(usersMap.values()).find(
        (u) => (u.nome || "").trim().toLowerCase() === cleanName
      )
      if (matched && checkUserPJ(matched)) {
        return true
      }
    }
    // 3. Category label check if contains PJ
    if (params?.categoryLabel?.toLowerCase().includes("pj")) {
      return true
    }
    // 4. Check if proposals belong to a PJ user
    if (proposals.length > 0) {
      const isPJFromProposals = proposals.some((p) => {
        const targetUserId = (p.estagiario_colaborador_id && p.estagiario_colaborador_id.trim() !== "")
          ? p.estagiario_colaborador_id
          : p.corretor_id
        if (targetUserId && usersMap.has(targetUserId)) {
          if (checkUserPJ(usersMap.get(targetUserId))) return true
        }
        const cName = (p.estagiario_colaborador_nome || p.nome_corretor || "").trim().toLowerCase()
        if (cName) {
          const match = Array.from(usersMap.values()).find((u) => (u.nome || "").trim().toLowerCase() === cName)
          if (match && checkUserPJ(match)) return true
        }
        return false
      })
      if (isPJFromProposals) return true
    }
    return false
  }, [params?.isPJ, selectedPersonUser, params?.personName, params?.categoryLabel, usersMap, proposals])

  useEffect(() => {
    if (!isOpen || !params) {
      setProposals([])
      setSearchQuery("")
      setSelectedPersonUser(null)
      return
    }

    const fetchContracts = async () => {
      setIsLoading(true)
      try {
        // Fetch users to accurately distinguish Corretores PJ vs CLT/Supervisor/Estágio
        const { data: usersData } = await supabase
          .from("usuarios")
          .select("id, regime_contratacao, funcao, role, nome")

        const newUsersMap = new Map<string, any>()
        if (usersData) {
          usersData.forEach((u) => newUsersMap.set(u.id, u))
        }
        setUsersMap(newUsersMap)

        const cleanId = (params.personId || "").trim()
        const cleanNameLower = (params.personName || "").trim().toLowerCase()
        let foundUser = null
        if (cleanId && cleanId !== "ESTAGIL_AND_PJ") {
          foundUser = newUsersMap.get(cleanId) || null
        }
        if (!foundUser && cleanNameLower) {
          foundUser = Array.from(newUsersMap.values()).find(
            (u) => (u.nome || "").trim().toLowerCase() === cleanNameLower
          ) || null
        }
        setSelectedPersonUser(foundUser)

        let query = supabase
          .from("propostas")
          .select("*")

        // Status Filter
        if (params.category === "paid") {
          query = query.in("status", PAID_STATUSES)
        } else {
          query = query.neq("status", "CANCELADO")
        }

        // Person Filter
        const cleanName = (params.personName || "").trim()

        if (cleanId && cleanId !== "ESTAGIL_AND_PJ") {
          query = query.or(`corretor_id.eq.${cleanId},estagiario_colaborador_id.eq.${cleanId}`)
        } else if (cleanName) {
          query = query.or(`nome_corretor.ilike.%${cleanName}%,estagiario_colaborador_nome.ilike.%${cleanName}%`)
        }

        query = query.order("updated_at", { ascending: false })

        const { data, error } = await query

        if (error) {
          console.error("Erro ao buscar contratos para o ranking:", error.message)
          setProposals([])
        } else {
          let results = data || []

          // If cleanId returned nothing, fallback to name query if available
          if (results.length === 0 && cleanName && cleanId) {
            const fallbackRes = await supabase
              .from("propostas")
              .select("*")
              .or(`nome_corretor.ilike.%${cleanName}%,estagiario_colaborador_nome.ilike.%${cleanName}%`)
              .order("updated_at", { ascending: false })

            if (fallbackRes.data) {
              results = fallbackRes.data
            }
          }

          // Date Range Filtering to match dashboard metric counts
          const parseStart = (str?: string) => {
            if (!str) return null
            const p = str.split("-")
            if (p.length === 3) return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 0, 0, 0, 0)
            const d = parseDateSafe(str)
            if (d) {
              const copy = new Date(d)
              copy.setHours(0, 0, 0, 0)
              return copy
            }
            return null
          }

          const parseEnd = (str?: string) => {
            if (!str) return null
            const p = str.split("-")
            if (p.length === 3) return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]), 23, 59, 59, 999)
            const d = parseDateSafe(str)
            if (d) {
              const copy = new Date(d)
              copy.setHours(23, 59, 59, 999)
              return copy
            }
            return null
          }

          const now = new Date()
          const rangeStart = parseStart(params.startDate) || new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
          const rangeEnd = parseEnd(params.endDate) || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

          const startOfMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1, 0, 0, 0, 0)
          const targetDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
          const targetDayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

          results = results.filter((p) => {
            const createdDate = parseDateSafe(p.created_at) || new Date()
            const updatedDate = parseDateSafe(p.updated_at) || new Date()
            const effectivePaymentDate = p.data_pago_cliente ? (parseDateSafe(p.data_pago_cliente) || updatedDate) : updatedDate

            const isPaid = PAID_STATUSES.includes(p.status)
            const isInProcess = IN_PROCESS_STATUSES.includes(p.status)
            const isCancelled = p.status === "CANCELADO"

            const isRetroactivePayment = isPaid && (effectivePaymentDate < startOfMonth)
            const isTodayCreated = createdDate >= targetDayStart && createdDate <= targetDayEnd
            const isDigitadaHoje = isTodayCreated && !isCancelled && !isRetroactivePayment && !isPaid

            if (params.category === "paid") {
              return isPaid && (effectivePaymentDate >= rangeStart && effectivePaymentDate <= rangeEnd)
            } else if (params.category === "in_process") {
              return isInProcess || isDigitadaHoje
            } else if (params.category === "today") {
              return isTodayCreated && !isCancelled && !isRetroactivePayment
            }

            return true
          })

          setProposals(results)
        }
      } catch (err) {
        console.error("Erro inesperado ao carregar contratos:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchContracts()
  }, [isOpen, params])

  const getProposalValue = (p: any): number => {
    let isRowPJ = isSelectedPersonPJ
    if (!isRowPJ) {
      if (!params?.personId || params.personId === "ESTAGIL_AND_PJ") {
        const targetUserId = (p.estagiario_colaborador_id && p.estagiario_colaborador_id.trim() !== "")
          ? p.estagiario_colaborador_id
          : p.corretor_id
        if (targetUserId && usersMap.has(targetUserId)) {
          isRowPJ = checkUserPJ(usersMap.get(targetUserId))
        }
      }
    }

    if (isRowPJ) {
      // Corretores PJ: VALOR OPERAÇÃO
      const opVal = parseVal(p.valor_operacao) || parseVal(p.valor_cliente) || parseVal(p.valor_cliente_operacional) || parseVal(p.valor_base)
      if (opVal > 0) return opVal
      return parseVal(p.valor_producao) || 0
    } else {
      // Corretores internos (CLT, Supervisor) e estagiários: VALOR PRODUÇÃO
      const prodVal = parseVal(p.valor_producao)
      if (prodVal > 0) return prodVal
      return parseVal(p.valor_operacao) || parseVal(p.valor_cliente) || parseVal(p.valor_cliente_operacional) || parseVal(p.valor_base) || 0
    }
  }

  const cleanObservationText = (raw?: string): string => {
    if (!raw) return ""
    let cleaned = String(raw)
      .replace(/\[FINANCE_METADATA_V1:[\s\S]*?\]/gi, "")
      .replace(/\[[A-Z0-9_]+_METADATA[A-Z0-9_]*:[\s\S]*?\]/gi, "")
      .replace(/\[METADATA:[\s\S]*?\]/gi, "")
      .trim()

    cleaned = cleaned
      .replace(/^[\s|:]+|[\s|:]+$/g, "")
      .replace(/\s*\|\s*\|\s*/g, " | ")
      .trim()

    return cleaned
  }

  const getFormattedObservation = (p: any) => {
    let obsCorr = cleanObservationText(p.obs_corretor)
    let obsOper = cleanObservationText(p.obs_operacional)

    if (!obsCorr && !obsOper && p.observacoes) {
      const obs = cleanObservationText(p.observacoes)
      const corretorMatch = obs.match(/\[CORRETOR\]: ([\s\S]*?)(?=\n\[OPERACIONAL\]|$)/)
      const operacionalMatch = obs.match(/\[OPERACIONAL\]: ([\s\S]*?)$/)
      if (corretorMatch) obsCorr = cleanObservationText(corretorMatch[1])
      if (operacionalMatch) obsOper = cleanObservationText(operacionalMatch[1])
      if (!obsCorr && !obsOper) {
        return obs || "-"
      }
    }

    if (obsCorr && obsOper) return `${obsCorr} | ${obsOper}`
    return obsOper || obsCorr || "-"
  }

  const filteredProposals = useMemo(() => {
    if (!searchQuery.trim()) return proposals
    const q = searchQuery.toLowerCase().trim()
    return proposals.filter((p) => {
      const idLead = String(p.id_lead || "").toLowerCase()
      const ade = String(p.ade || "").toLowerCase()
      const clientName = String(p.nome_cliente || "").toLowerCase()
      const clientCpf = String(p.cliente_cpf || "").toLowerCase()
      const corretor = String(p.nome_corretor || "").toLowerCase()
      const banco = String(p.banco || "").toLowerCase()
      const convenio = String(p.convenio || "").toLowerCase()
      const status = String(p.status || "").toLowerCase()

      return (
        idLead.includes(q) ||
        ade.includes(q) ||
        clientName.includes(q) ||
        clientCpf.includes(q) ||
        corretor.includes(q) ||
        banco.includes(q) ||
        convenio.includes(q) ||
        status.includes(q)
      )
    })
  }, [proposals, searchQuery])

  const totalValue = useMemo(() => {
    return filteredProposals.reduce((acc, p) => {
      const val = getProposalValue(p)
      return acc + (isNaN(val) ? 0 : val)
    }, 0)
  }, [filteredProposals, isSelectedPersonPJ, selectedPersonUser, usersMap])

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  }

  const handleGeneratePdf = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const nowFormatted = format(new Date(), "dd/MM/yyyy HH:mm")
    const valueColumnLabel = isSelectedPersonPJ ? "VALOR OPERAÇÃO" : "VALOR PRODUÇÃO"

    const tableRowsHtml = filteredProposals.map((p, index) => {
      const valOp = getProposalValue(p)
      const formattedValOp = isNaN(valOp) ? "R$ 0,00" : formatCurrency(valOp)

      let updatedStr = "-"
      if (p.updated_at || p.created_at) {
        try {
          updatedStr = format(new Date(p.updated_at || p.created_at), "dd/MM/yyyy HH:mm")
        } catch {
          updatedStr = "-"
        }
      }

      const obs = getFormattedObservation(p)

      return `
        <tr style="background-color: ${index % 2 === 0 ? "#f8fafc" : "#ffffff"}; font-size: 10px;">
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #475569;">${p.id_lead || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${p.ade || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-transform: uppercase; color: #1e293b;">${p.nome_corretor || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-transform: uppercase; color: #475569;">${p.equipe || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; text-transform: uppercase; color: #d97706;">${p.estagiario_colaborador_nome || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${p.cliente_cpf || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-transform: uppercase; color: #0f172a;">${p.nome_cliente || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${p.banco || "-"}/${p.convenio || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${p.tipo_operacao || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-transform: uppercase; color: #2563eb;">${p.status || "-"}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 800; text-align: right; color: #0f172a;">${formattedValOp}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b; max-width: 200px; word-wrap: break-word;">${obs}</td>
          <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">${updatedStr}</td>
        </tr>
      `
    }).join("")

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Contratos - ${params?.personName || "Ranking"}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 12px;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1c2643;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title-area {
            display: flex;
            flex-direction: column;
          }
          .brand {
            font-size: 20px;
            font-weight: 900;
            color: #1c2643;
            letter-spacing: -0.5px;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 13px;
            font-weight: 800;
            color: #2563eb;
            margin-top: 2px;
            text-transform: uppercase;
          }
          .meta-box {
            text-align: right;
            font-size: 11px;
            color: #64748b;
          }
          .summary-cards {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
          }
          .card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 8px 14px;
            display: flex;
            flex-direction: column;
          }
          .card-label {
            font-size: 9px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .card-value {
            font-size: 15px;
            font-weight: 900;
            color: #1c2643;
            margin-top: 2px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th {
            background-color: #f1f5f9;
            color: #475569;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px;
            text-align: left;
            border-bottom: 2px solid #cbd5e1;
          }
          .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title-area">
            <div class="brand">SharkConsig</div>
            <div class="subtitle">Relatório de Contratos &bull; ${params?.categoryLabel || "Ranking"} &bull; ${params?.personName || ""}</div>
          </div>
          <div class="meta-box">
            <div>Data de Emissão: <strong>${nowFormatted}</strong></div>
            <div>Total de Registros: <strong>${filteredProposals.length}</strong></div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="card">
            <span class="card-label">Colaborador / Corretor</span>
            <span class="card-value">${params?.personName || "Geral"}</span>
          </div>
          <div class="card">
            <span class="card-label">Categoria</span>
            <span class="card-value">${params?.categoryLabel || "-"}</span>
          </div>
          <div class="card">
            <span class="card-label">Total de Contratos</span>
            <span class="card-value">${filteredProposals.length}</span>
          </div>
          <div class="card">
            <span class="card-label">Valor Total</span>
            <span class="card-value">${formatCurrency(totalValue)}</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ADE</th>
              <th>CORRETOR</th>
              <th>SUPERVISOR (EQUIPE)</th>
              <th>ESTAGIÁRIO (COLABORADOR)</th>
              <th>CPF</th>
              <th>CLIENTE</th>
              <th>BANCO/CONVÊNIO</th>
              <th>OPERAÇÃO</th>
              <th>STATUS</th>
              <th style="text-align: right;">${valueColumnLabel}</th>
              <th>OBSERVAÇÃO</th>
              <th>ÚLTIMA ATUALIZAÇÃO</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colSpan="13" style="text-align:center; padding: 20px;">Nenhum contrato encontrado.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          <div>Documento gerado automaticamente pelo CRM SharkConsig</div>
          <div>Página 1 de 1</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  if (!isOpen || !params) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-[96vw] max-w-[1600px] max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1C2643] text-white flex items-center justify-center font-black shadow-md shrink-0">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[#1C2643] tracking-tight uppercase">
                  Contratos: {params.personName}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200">
                  {params.categoryLabel}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                Listagem completa de contratos para a métrica selecionada no ranking
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Print PDF Button */}
            <button
              onClick={handleGeneratePdf}
              disabled={isLoading || filteredProposals.length === 0}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[12px] font-extrabold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Gerar PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar & Search */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por cliente, CPF, ADE, banco..."
              className="w-full pl-9 pr-3 py-1.5 text-[12px] bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#1C2643]/20 focus:bg-white transition-all font-medium text-slate-700"
            />
          </div>

          <div className="flex items-center gap-4 text-[12px] font-bold text-slate-600">
            <div>
              Total: <span className="text-[#1C2643] font-black">{filteredProposals.length}</span> {filteredProposals.length === 1 ? "contrato" : "contratos"}
            </div>
            <div className="w-px h-4 bg-slate-200" />
            <div>
              Valor Total: <span className="text-emerald-600 font-black">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-[#1C2643]" />
              <p className="text-xs font-bold uppercase tracking-wider animate-pulse">Carregando contratos...</p>
            </div>
          ) : filteredProposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <FileText className="w-12 h-12 mb-2 stroke-[1.5] text-slate-300" />
              <p className="text-sm font-bold text-slate-600">Nenhum contrato encontrado</p>
              <p className="text-xs text-slate-400 mt-1">Não há registros correspondentes aos filtros atuais.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-left border-collapse min-w-[1450px]">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200">
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ID</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ADE</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CORRETOR</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">SUPERVISOR (EQUIPE)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ESTAGIÁRIO (COLABORADOR)</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CPF</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CLIENTE</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">BANCO/CONVÊNIO</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">OPERAÇÃO</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">STATUS</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">
                      {isSelectedPersonPJ ? "VALOR OPERAÇÃO" : "VALOR PRODUÇÃO"}
                    </th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">OBSERVAÇÃO</th>
                    <th className="px-4 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ÚLTIMA ATUALIZAÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProposals.map((proposal, idx) => {
                    const valOp = getProposalValue(proposal)
                    const formattedValOp = isNaN(valOp) ? "R$ 0,00" : formatCurrency(valOp)

                    let updatedStr = "-"
                    if (proposal.updated_at || proposal.created_at) {
                      try {
                        updatedStr = format(new Date(proposal.updated_at || proposal.created_at), "dd/MM/yyyy HH:mm")
                      } catch {
                        updatedStr = "-"
                      }
                    }

                    return (
                      <tr
                        key={proposal.id || proposal.id_lead || idx}
                        className={cn("hover:bg-slate-50 transition-colors", idx % 2 === 0 ? "bg-slate-50/30" : "bg-white")}
                      >
                        <td className="px-4 py-3.5 text-[11px] font-bold text-slate-500">{proposal.id_lead || "-"}</td>
                        <td className="px-4 py-3.5 text-[11px] font-medium text-slate-500">{proposal.ade || "-"}</td>
                        <td className="px-4 py-3.5 text-[11px] font-bold text-slate-700 uppercase bg-blue-50/20">{proposal.nome_corretor || "-"}</td>
                        <td className="px-4 py-3.5 text-[11px] font-bold text-slate-600 uppercase bg-indigo-50/20">{proposal.equipe || "-"}</td>
                        <td className="px-4 py-3.5 text-[11px] font-bold text-slate-600 uppercase bg-amber-50/20">{proposal.estagiario_colaborador_nome || "-"}</td>
                        <td className="px-4 py-3.5 text-[11px] font-medium text-slate-500">{proposal.cliente_cpf || "-"}</td>
                        <td className="px-4 py-3.5 text-[11px] font-bold text-slate-800 uppercase tracking-tight">{proposal.nome_cliente || "-"}</td>
                        <td className="px-4 py-3.5 text-[11px] font-bold text-slate-600">{proposal.banco || "-"}/{proposal.convenio || "-"}</td>
                        <td className="px-4 py-3.5 text-[11px] font-bold text-slate-600">{proposal.tipo_operacao || "-"}</td>
                        <td className="px-4 py-3.5 max-w-[220px]">
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200/80 px-2 py-1 rounded-md uppercase tracking-tight inline-block whitespace-normal break-words leading-tight">
                            {proposal.status || "-"}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[11px] font-bold text-slate-900 text-right">{formattedValOp}</td>
                        <td className="px-4 py-3.5 text-[11px] text-slate-500 max-w-[220px] whitespace-pre-wrap break-words">{getFormattedObservation(proposal)}</td>
                        <td className="px-4 py-3.5 text-[10px] font-bold text-slate-600">{updatedStr}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
