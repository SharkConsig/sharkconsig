"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { 
  Search, 
  History, 
  FileSpreadsheet, 
  RefreshCw, 
  Calendar, 
  User, 
  DollarSign, 
  TrendingUp, 
  Save, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CheckCircle2,
  ListFilter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import { format } from "date-fns"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

export interface HistoricoPJRecord {
  id: string // Friendly ID e.g. "1001" or "#1001"
  id_lead: string
  data_pagamento: string // "YYYY-MM-DD"
  nome: string // Corretor PJ
  valor_operacao: number
  aliquota_comissao: number // percentage e.g. 5.0
  comissao_bruta: number
  proventos: number
  descontos: number
  comissao_liquida: number
  created_at?: string
}

export default function HistoricoPagamentosPJPage() {
  const [records, setRecords] = useState<HistoricoPJRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedCorretor, setSelectedCorretor] = useState("")
  const [minValor, setMinValor] = useState("")
  const [maxValor, setMaxValor] = useState("")
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [pageSize, setPageSize] = useState<number>(50)
  const [currentPage, setCurrentPage] = useState<number>(1)

  // Format monetary value
  const formatCurrency = (val: number | undefined | null) => {
    const num = Number(val || 0)
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(num)
  }

  // Helper safe float
  const safeFloat = (val: any) => {
    if (val === undefined || val === null || val === "") return 0
    const parsed = typeof val === "string" ? parseFloat(val.replace(",", ".")) : Number(val)
    return isNaN(parsed) ? 0 : parsed
  }

  // Load records from LocalStorage & Supabase
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      let localRecords: HistoricoPJRecord[] = []
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("historico_pagamentos_pj_records")
        if (raw) {
          localRecords = JSON.parse(raw)
        }
      }

      // Also fetch from Supabase to recover any PJ paid proposals that might not be in local storage
      const { data: propData, error } = await supabase
        .from("propostas")
        .select("*")
        .in("status", ["PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA", "PÓS-VENDA REALIZADA"])

      if (!error && propData) {
        let pjPaidIds: Record<string, boolean> = {}
        if (typeof window !== "undefined") {
          const storedPj = localStorage.getItem("receber_pj_paid_ids")
          if (storedPj) pjPaidIds = JSON.parse(storedPj)
        }

        const mapExisting = new Map<string, HistoricoPJRecord>()
        localRecords.forEach(r => mapExisting.set(r.id_lead, r))

        let nextFriendlyNum = localRecords.reduce((max, r) => {
          const num = parseInt(String(r.id || "").replace("#", ""), 10)
          return !isNaN(num) && num > max ? num : max
        }, 1000)

        const merged: HistoricoPJRecord[] = []

        propData.forEach((p: any) => {
          let isPaid = !!pjPaidIds[p.id_lead]
          let pjPaidDate = new Date().toISOString().split("T")[0]

          if (p.observacoes) {
            try {
              const obsMatch = p.observacoes.match(/\[FINANCE_METADATA\](.*?)\[\/FINANCE_METADATA\]/s)
              if (obsMatch && obsMatch[1]) {
                const meta = JSON.parse(obsMatch[1])
                if (meta.pjPaid !== undefined) isPaid = meta.pjPaid
                if (meta.pjPaidDate) pjPaidDate = meta.pjPaidDate.split("T")[0]
              }
            } catch (e) {
              // ignore parse errors
            }
          }

          if (isPaid) {
            if (mapExisting.has(p.id_lead)) {
              merged.push(mapExisting.get(p.id_lead)!)
            } else {
              nextFriendlyNum++
              const valOp = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
              const pjPct = safeFloat(p.comissao_pj_porcentagem || p.comissao_corretor_porcentagem || 0)
              let pjBruta = safeFloat(p.comissao_pj_valor || 0)
              if (!pjBruta && pjPct > 0) {
                pjBruta = (valOp * pjPct) / 100
              }

              merged.push({
                id: String(nextFriendlyNum),
                id_lead: p.id_lead,
                data_pagamento: pjPaidDate,
                nome: (p.nome_corretor || p.corretor || "Corretor PJ").trim(),
                valor_operacao: valOp,
                aliquota_comissao: pjPct,
                comissao_bruta: pjBruta,
                proventos: 0,
                descontos: 0,
                comissao_liquida: pjBruta,
                created_at: new Date().toISOString()
              })
            }
          }
        })

        // Add any local records that might not be in propData query
        localRecords.forEach(r => {
          if (!merged.some(m => m.id_lead === r.id_lead)) {
            merged.push(r)
          }
        })

        // Sort by Date descending
        merged.sort((a, b) => (b.data_pagamento || "").localeCompare(a.data_pagamento || ""))

        setRecords(merged)
        if (typeof window !== "undefined") {
          localStorage.setItem("historico_pagamentos_pj_records", JSON.stringify(merged))
        }
      } else {
        setRecords(localRecords)
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de pagamentos PJ:", err)
      toast.error("Erro ao carregar histórico de pagamentos PJ.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const handleUpdate = () => {
      loadData()
    }
    if (typeof window !== "undefined") {
      window.addEventListener("historico_pj_updated", handleUpdate)
      window.addEventListener("storage", handleUpdate)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("historico_pj_updated", handleUpdate)
        window.removeEventListener("storage", handleUpdate)
      }
    }
  }, [loadData])

  // Unique corretor names for filter dropdown
  const uniqueCorretores = useMemo(() => {
    const set = new Set<string>()
    records.forEach(r => {
      if (r.nome && r.nome.trim()) {
        set.add(r.nome.trim())
      }
    })
    return Array.from(set).sort()
  }, [records])

  // Save changes to localStorage
  const saveRecordsToStorage = (updated: HistoricoPJRecord[]) => {
    setRecords(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("historico_pagamentos_pj_records", JSON.stringify(updated))
      window.dispatchEvent(new Event("historico_pj_updated"))
    }
  }

  // Handle cell edit
  const handleCellChange = (
    idLead: string, 
    field: keyof HistoricoPJRecord, 
    value: string | number
  ) => {
    const updated = records.map(r => {
      if (r.id_lead === idLead) {
        const item = { ...r }

        if (field === "data_pagamento") {
          item.data_pagamento = String(value)
        } else if (field === "aliquota_comissao") {
          const numPct = safeFloat(value)
          item.aliquota_comissao = numPct
          item.comissao_bruta = (item.valor_operacao * numPct) / 100
          item.comissao_liquida = item.comissao_bruta + item.proventos - item.descontos
        } else if (field === "comissao_bruta") {
          const numBruta = safeFloat(value)
          item.comissao_bruta = numBruta
          item.comissao_liquida = numBruta + item.proventos - item.descontos
        } else if (field === "proventos") {
          const numProv = safeFloat(value)
          item.proventos = numProv
          item.comissao_liquida = item.comissao_bruta + numProv - item.descontos
        } else if (field === "descontos") {
          const numDesc = safeFloat(value)
          item.descontos = numDesc
          item.comissao_liquida = item.comissao_bruta + item.proventos - numDesc
        }

        return item
      }
      return r
    })

    saveRecordsToStorage(updated)
  }

  // Remove a record from history
  const handleRemoveRecord = (idLead: string) => {
    const updated = records.filter(r => r.id_lead !== idLead)
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(idLead)
      return next
    })
    saveRecordsToStorage(updated)
    toast.success("Registro removido do histórico.")
  }

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("")
    setStartDate("")
    setEndDate("")
    setSelectedCorretor("")
    setMinValor("")
    setMaxValor("")
    setCurrentPage(1)
  }

  // Filtered list by search term and filters
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const matchesSearch = 
          (r.id || "").toLowerCase().includes(term) ||
          (r.nome || "").toLowerCase().includes(term) ||
          (r.id_lead || "").toLowerCase().includes(term) ||
          (r.data_pagamento || "").includes(term)
        if (!matchesSearch) return false
      }

      // Date range
      if (startDate && r.data_pagamento < startDate) return false
      if (endDate && r.data_pagamento > endDate) return false

      // Corretor
      if (selectedCorretor && r.nome !== selectedCorretor) return false

      // Min/Max Valor
      if (minValor) {
        const min = safeFloat(minValor)
        if (r.valor_operacao < min) return false
      }
      if (maxValor) {
        const max = safeFloat(maxValor)
        if (r.valor_operacao > max) return false
      }

      return true
    })
  }, [records, searchTerm, startDate, endDate, selectedCorretor, minValor, maxValor])

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRecords.slice(start, start + pageSize)
  }, [filteredRecords, currentPage, pageSize])

  // Selection handlers
  const isAllPageSelected = useMemo(() => {
    if (paginatedRecords.length === 0) return false
    return paginatedRecords.every(r => selectedIds.has(r.id_lead))
  }, [paginatedRecords, selectedIds])

  const toggleSelectAllPage = () => {
    const next = new Set(selectedIds)
    if (isAllPageSelected) {
      paginatedRecords.forEach(r => next.delete(r.id_lead))
    } else {
      paginatedRecords.forEach(r => next.add(r.id_lead))
    }
    setSelectedIds(next)
  }

  const toggleSelectRow = (idLead: string) => {
    const next = new Set(selectedIds)
    if (next.has(idLead)) {
      next.delete(idLead)
    } else {
      next.add(idLead)
    }
    setSelectedIds(next)
  }

  // Totals calculated from filtered records
  const totals = useMemo(() => {
    return filteredRecords.reduce((acc, r) => {
      acc.valor_operacao += Number(r.valor_operacao || 0)
      acc.comissao_bruta += Number(r.comissao_bruta || 0)
      acc.proventos += Number(r.proventos || 0)
      acc.descontos += Number(r.descontos || 0)
      acc.comissao_liquida += Number(r.comissao_liquida || 0)
      return acc
    }, {
      valor_operacao: 0,
      comissao_bruta: 0,
      proventos: 0,
      descontos: 0,
      comissao_liquida: 0
    })
  }, [filteredRecords])

  // Export Excel
  const exportToExcel = async () => {
    // If checkboxes are selected, export only selected rows; otherwise export filteredRecords
    const recordsToExport = selectedIds.size > 0 
      ? filteredRecords.filter(r => selectedIds.has(r.id_lead))
      : filteredRecords

    if (recordsToExport.length === 0) {
      toast.error("Nenhum registro para exportar.")
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Histórico Pagamentos PJ")

    worksheet.columns = [
      { header: "ID", key: "id", width: 12 },
      { header: "Data Pagamento", key: "data_pagamento", width: 16 },
      { header: "Nome Corretor PJ", key: "nome", width: 35 },
      { header: "Valor Operação", key: "valor_operacao", width: 20 },
      { header: "Alíquota (%)", key: "aliquota_comissao", width: 15 },
      { header: "Comissão Bruta", key: "comissao_bruta", width: 20 },
      { header: "Proventos", key: "proventos", width: 18 },
      { header: "Descontos", key: "descontos", width: 18 },
      { header: "Comissão Líquida", key: "comissao_liquida", width: 22 }
    ]

    // Style Header
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: "FFFFFF" } }
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1C2643" }
    }
    headerRow.height = 26

    recordsToExport.forEach(r => {
      const row = worksheet.addRow({
        id: `#${r.id}`,
        data_pagamento: r.data_pagamento ? format(new Date(r.data_pagamento + "T12:00:00"), "dd/MM/yyyy") : "-",
        nome: r.nome,
        valor_operacao: r.valor_operacao,
        aliquota_comissao: (r.aliquota_comissao || 0) / 100,
        comissao_bruta: r.comissao_bruta,
        proventos: r.proventos,
        descontos: r.descontos,
        comissao_liquida: r.comissao_liquida
      })

      row.getCell("valor_operacao").numFmt = '"R$"#,##0.00'
      row.getCell("aliquota_comissao").numFmt = '0.00%'
      row.getCell("comissao_bruta").numFmt = '"R$"#,##0.00'
      row.getCell("proventos").numFmt = '"R$"#,##0.00'
      row.getCell("descontos").numFmt = '"R$"#,##0.00'
      row.getCell("comissao_liquida").numFmt = '"R$"#,##0.00'
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    saveAs(blob, `historico_pagamentos_pj_${format(new Date(), "dd-MM-yyyy")}.xlsx`)
    toast.success(`${recordsToExport.length} registro(s) exportado(s) com sucesso!`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Header title="HISTÓRICO DE PAGAMENTOS PJ" />

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Title Header Card */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#1C2643] p-3.5 rounded-2xl text-white shadow-md">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-[#1C2643] tracking-tight">
                Histórico de Pagamento de Comissão PJ
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Registro detalhado de repasses efetuados para os corretores PJ.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50 gap-2 cursor-pointer"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
              <span>Atualizar</span>
            </Button>

            <Button
              onClick={exportToExcel}
              size="sm"
              className="h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {selectedIds.size > 0 ? `Exportar Excel (${selectedIds.size})` : "Exportar Excel"}
              </span>
            </Button>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Operações</div>
            <div className="text-lg font-black text-[#1C2643] mt-1">{formatCurrency(totals.valor_operacao)}</div>
            <div className="text-[10px] font-bold text-slate-400 mt-0.5">{filteredRecords.length} registro(s)</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Comissão Bruta</div>
            <div className="text-lg font-black text-indigo-900 mt-1">{formatCurrency(totals.comissao_bruta)}</div>
            <div className="text-[10px] font-bold text-indigo-400 mt-0.5">Soma bruta acumulada</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Proventos</div>
            <div className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(totals.proventos)}</div>
            <div className="text-[10px] font-bold text-emerald-500 mt-0.5">+ Valores adicionados</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Descontos</div>
            <div className="text-lg font-black text-rose-600 mt-1">{formatCurrency(totals.descontos)}</div>
            <div className="text-[10px] font-bold text-rose-400 mt-0.5">- Subtrações efetuadas</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 bg-gradient-to-br from-white to-blue-50/50 shadow-sm">
            <div className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Comissão Líquida Total</div>
            <div className="text-xl font-black text-blue-900 mt-1">{formatCurrency(totals.comissao_liquida)}</div>
            <div className="text-[10px] font-bold text-blue-500 mt-0.5">Total repassado aos PJs</div>
          </div>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            {/* BUSCAR RECEBÍVEIS / BUSCA RÁPIDA */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                BUSCAR RECEBÍVEIS
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="CPF, Nome, ID ou Corretor..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pl-9 h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#1C2643]/20"
                />
              </div>
            </div>

            {/* PERÍODO DE PAGAMENTO */}
            <div className="md:col-span-4 space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                PERÍODO DE PAGAMENTO
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
                <span className="text-xs font-bold text-slate-400 uppercase">A</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-10 text-xs rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Action Buttons: FILTROS, LIMPAR, BUSCAR */}
            <div className="md:col-span-3 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn(
                  "h-10 px-3 rounded-xl border-slate-200 text-xs font-bold gap-2 transition-colors cursor-pointer",
                  showAdvancedFilters ? "bg-slate-100 text-[#1C2643]" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>FILTROS</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="h-10 px-3 rounded-xl border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                <span>LIMPAR</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => setCurrentPage(1)}
                className="h-10 px-4 rounded-xl bg-[#1C2643] hover:bg-[#151c33] text-white text-xs font-bold gap-2 cursor-pointer shadow-sm"
              >
                <Search className="w-3.5 h-3.5" />
                <span>BUSCAR</span>
              </Button>
            </div>
          </div>

          {/* Expandable Filter Panel */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-200">
              {/* Corretor Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Corretor PJ
                </label>
                <select
                  value={selectedCorretor}
                  onChange={(e) => {
                    setSelectedCorretor(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#1C2643]/20"
                >
                  <option value="">Todos os Corretores PJ</option>
                  {uniqueCorretores.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Valor Operação Range */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  Valor Operação (R$)
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={minValor}
                    onChange={(e) => {
                      setMinValor(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="h-9 text-xs rounded-xl border-slate-200 bg-slate-50/50"
                  />
                  <span className="text-xs text-slate-300">-</span>
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={maxValor}
                    onChange={(e) => {
                      setMaxValor(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="h-9 text-xs rounded-xl border-slate-200 bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Selected Count / Clear Action */}
              <div className="flex items-end justify-between pb-0.5">
                <span className="text-xs font-semibold text-slate-400">
                  {filteredRecords.length} registro(s) encontrado(s)
                </span>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Limpar todos os filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table Container Card matching image.png */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          {/* Header Bar above Table */}
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-end bg-white">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                Ver por páginas:
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="h-8 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1C2643]/20"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1400px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100/80">
                  <th className="py-4 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectAllPage}
                      className="w-4 h-4 rounded border-slate-300 text-[#1C2643] focus:ring-[#1C2643] cursor-pointer"
                    />
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center min-w-[90px]">
                    ID
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[160px]">
                    DATA PAGAMENTO
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[220px]">
                    CORRETOR PJ
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right min-w-[160px]">
                    VALOR OPERAÇÃO
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right min-w-[140px]">
                    COMISSÃO (%)
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right min-w-[160px]">
                    COMISSÃO ($)
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right min-w-[140px]">
                    PROVENTOS
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right min-w-[140px]">
                    DESCONTOS
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right min-w-[180px]">
                    COMISSÃO LÍQUIDA
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center min-w-[80px]">
                    AÇÕES
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#1C2643]" />
                        <span>Carregando histórico de repasses...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400 font-bold">
                      Nenhum registro de pagamento de comissão PJ encontrado.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((item, idx) => {
                    const isSelected = selectedIds.has(item.id_lead)
                    return (
                      <tr 
                        key={item.id_lead || idx}
                        className={cn(
                          "transition-all hover:bg-slate-50/80 border-b border-slate-100/60",
                          isSelected ? "bg-amber-50/60" : "bg-white"
                        )}
                      >
                        {/* Checkbox */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(item.id_lead)}
                            className="w-4 h-4 rounded border-slate-300 text-[#1C2643] focus:ring-[#1C2643] cursor-pointer"
                          />
                        </td>

                        {/* ID */}
                        <td className="py-3 px-4 font-black text-[#1C2643] text-center whitespace-nowrap">
                          <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                            #{item.id}
                          </span>
                        </td>

                        {/* Data do Pagamento (Editable) */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <input
                            type="date"
                            value={item.data_pagamento || ""}
                            onChange={(e) => handleCellChange(item.id_lead, "data_pagamento", e.target.value)}
                            className="h-8 px-2 rounded-lg border border-slate-200 bg-white font-bold text-slate-700 text-xs focus:ring-1 focus:ring-[#1C2643] focus:outline-none"
                          />
                        </td>

                        {/* Nome do Corretor */}
                        <td className="py-3 px-4 font-black text-slate-800 uppercase whitespace-nowrap">
                          {item.nome}
                        </td>

                        {/* VALOR OPERAÇÃO */}
                        <td className="py-3 px-4 font-bold text-slate-800 text-right whitespace-nowrap">
                          {formatCurrency(item.valor_operacao)}
                        </td>

                        {/* Alíquota de Comissão % (Editable) */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.01"
                              value={item.aliquota_comissao ?? ""}
                              onChange={(e) => handleCellChange(item.id_lead, "aliquota_comissao", e.target.value)}
                              className="h-8 w-16 px-1.5 text-right rounded-lg border border-slate-200 bg-white font-bold text-slate-700 text-xs focus:ring-1 focus:ring-[#1C2643] focus:outline-none"
                            />
                            <span className="font-bold text-slate-400">%</span>
                          </div>
                        </td>

                        {/* COMISSÃO BRUTA (Editable) */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={item.comissao_bruta ?? ""}
                            onChange={(e) => handleCellChange(item.id_lead, "comissao_bruta", e.target.value)}
                            className="h-8 w-28 px-2 text-right rounded-lg border border-slate-200 bg-white font-bold text-emerald-700 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                          />
                        </td>

                        {/* PROVENTOS (Editable) */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={item.proventos ?? ""}
                            onChange={(e) => handleCellChange(item.id_lead, "proventos", e.target.value)}
                            className="h-8 w-24 px-2 text-right rounded-lg border border-slate-200 bg-emerald-50/40 font-bold text-emerald-700 text-xs focus:ring-1 focus:ring-emerald-400 focus:outline-none"
                          />
                        </td>

                        {/* DESCONTOS (Editable) */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={item.descontos ?? ""}
                            onChange={(e) => handleCellChange(item.id_lead, "descontos", e.target.value)}
                            className="h-8 w-24 px-2 text-right rounded-lg border border-slate-200 bg-rose-50/40 font-bold text-rose-700 text-xs focus:ring-1 focus:ring-rose-400 focus:outline-none"
                          />
                        </td>

                        {/* COMISSÃO LÍQUIDA */}
                        <td className="py-3 px-4 font-black text-[#1C2643] text-right whitespace-nowrap bg-slate-50/50">
                          {formatCurrency(item.comissao_liquida)}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleRemoveRecord(item.id_lead)}
                            title="Remover do histórico"
                            className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer matching image.png */}
          <div className="p-4 px-6 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              PÁGINA {currentPage} DE {totalPages} ({filteredRecords.length} REGISTROS TOTAIS)
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="h-8 px-3 rounded-xl text-[11px] font-black border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" /> VOLTAR
              </Button>

              {/* Number Buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pNum = i + 1
                if (totalPages > 5 && currentPage > 3) {
                  pNum = currentPage - 3 + i
                  if (pNum > totalPages) pNum = totalPages - (4 - i)
                }
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={cn(
                      "h-8 min-w-[32px] px-2 rounded-xl text-xs font-black transition-colors cursor-pointer",
                      currentPage === pNum
                        ? "bg-[#1C2643] text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {pNum}
                  </button>
                )
              })}

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="h-8 px-3 rounded-xl text-[11px] font-black border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer disabled:opacity-40"
              >
                AVANÇAR <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
