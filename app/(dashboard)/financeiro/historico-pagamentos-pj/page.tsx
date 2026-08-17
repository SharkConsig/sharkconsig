"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { 
  Search, 
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
  ListFilter,
  AlertTriangle,
  Radio,
  Eye,
  Share2,
  Undo2
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { format } from "date-fns"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

export interface HistoricoPJRecord {
  id: string // Friendly ID e.g. "1001" or "#1001"
  id_lead: string
  data_pagamento: string // "YYYY-MM-DD"
  nome: string // Corretor PJ
  cliente?: string // Nome do Cliente
  cpf_cliente?: string // CPF do Cliente
  valor_operacao: number
  aliquota_comissao: number // percentage e.g. 5.0
  comissao_bruta: number
  proventos: number
  descontos: number
  comissao_liquida: number
  espelhado?: boolean
  created_at?: string
}

export default function HistoricoPagamentosPJPage() {
  const { user, perfil } = useAuth()
  const isCorretor = perfil?.role === "Corretor"
  const isCorretorPJ = isCorretor && (perfil?.regime_contratacao === "PJ" || perfil?.tipo_contrato === "PJ")
  const isCorretorUser = isCorretor || isCorretorPJ

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
  const [mirroredVersion, setMirroredVersion] = useState<number>(0)

  // Delete Confirmation Modal state
  const [recordToDelete, setRecordToDelete] = useState<HistoricoPJRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

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

  // Load records from Supabase historico_pagamentos_pj & LocalStorage
  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true)
    }
    try {
      let localRecords: HistoricoPJRecord[] = []
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("historico_pagamentos_pj_records")
        if (raw) {
          try {
            localRecords = JSON.parse(raw)
          } catch (e) {
            console.error(e)
          }
        }
      }

      // 1. Fetch directly from Supabase historico_pagamentos_pj
      const { data: dbData, error: dbError } = await supabase
        .from("historico_pagamentos_pj")
        .select("*")
        .order("data_pagamento", { ascending: false })

      let dbRecords: HistoricoPJRecord[] = []
      let dbMirroredMap: Record<string, boolean> = {}

      if (!dbError && dbData && dbData.length > 0) {
        dbRecords = dbData.map((row: any) => {
          const isRowEspelhado = row.espelhado === true || row.pj_mirrored === true || row.mirrored === true
          if (isRowEspelhado) {
            if (row.id_lead) dbMirroredMap[row.id_lead] = true
            if (row.id) dbMirroredMap[String(row.id)] = true
          }
          return {
            id: String(row.id || ""),
            id_lead: String(row.id_lead || ""),
            data_pagamento: row.data_pagamento ? String(row.data_pagamento).split("T")[0] : "",
            nome: String(row.nome || "Corretor PJ"),
            cliente: String(row.cliente || row.nome_cliente || "").trim(),
            cpf_cliente: String(row.cpf_cliente || row.cpf || row.cliente_cpf || "").trim(),
            valor_operacao: safeFloat(row.valor_operacao),
            aliquota_comissao: safeFloat(row.aliquota_comissao),
            comissao_bruta: safeFloat(row.comissao_bruta),
            proventos: safeFloat(row.proventos),
            descontos: safeFloat(row.descontos),
            comissao_liquida: safeFloat(row.comissao_liquida),
            espelhado: isRowEspelhado,
            created_at: row.created_at || new Date().toISOString()
          }
        })
      }

      // 2. Also check propostas with pjPaid or mirrored to guarantee no payments are missed
      const { data: propData } = await supabase
        .from("propostas")
        .select("*")

      let pjPaidIds: Record<string, boolean> = {}
      if (typeof window !== "undefined") {
        const storedPj = localStorage.getItem("receber_pj_paid_ids")
        if (storedPj) {
          try {
            pjPaidIds = JSON.parse(storedPj)
          } catch (e) {
            console.error(e)
          }
        }
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("historico_pj_espelhados", JSON.stringify(dbMirroredMap))
        } catch (e) {}
      }

      const mapExisting = new Map<string, HistoricoPJRecord>()
      dbRecords.forEach(r => mapExisting.set(r.id_lead, r))
      localRecords.forEach(r => {
        if (!mapExisting.has(r.id_lead)) {
          mapExisting.set(r.id_lead, r)
        }
      })

      let nextFriendlyNum = Array.from(mapExisting.values()).reduce((max, r) => {
        const num = parseInt(String(r.id || "").replace("#", ""), 10)
        return !isNaN(num) && num > max ? num : max
      }, 1000)

      const merged: HistoricoPJRecord[] = []
      const newItemsToSync: HistoricoPJRecord[] = []

      if (propData) {
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
            const clienteName = (p.nome_cliente || p.cliente || p.nome || "").trim()
            const clienteCpf = (p.cliente_cpf || p.cpf_cliente || p.cpf || "").trim()

            if (mapExisting.has(p.id_lead)) {
              const existing = mapExisting.get(p.id_lead)!
              let changed = false
              if (!existing.cliente && clienteName) {
                existing.cliente = clienteName
                changed = true
              }
              if (!existing.cpf_cliente && clienteCpf) {
                existing.cpf_cliente = clienteCpf
                changed = true
              }
              if (changed) {
                // Also update in Supabase asynchronously
                supabase
                  .from("historico_pagamentos_pj")
                  .update({
                    cliente: existing.cliente,
                    cpf_cliente: existing.cpf_cliente,
                    updated_at: new Date().toISOString()
                  } as any)
                  .eq("id_lead", p.id_lead)
                  .then(() => {})
              }
              merged.push(existing)
            } else {
              nextFriendlyNum++
              const valOp = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
              const pjPct = safeFloat(p.comissao_pj_porcentagem || p.comissao_corretor_porcentagem || 0)
              let pjBruta = safeFloat(p.comissao_pj_valor || 0)
              if (!pjBruta && pjPct > 0) {
                pjBruta = (valOp * pjPct) / 100
              }

              const newItem: HistoricoPJRecord = {
                id: String(nextFriendlyNum),
                id_lead: p.id_lead,
                data_pagamento: pjPaidDate,
                nome: (p.nome_corretor || p.corretor || "Corretor PJ").trim(),
                cliente: clienteName,
                cpf_cliente: clienteCpf,
                valor_operacao: valOp,
                aliquota_comissao: pjPct,
                comissao_bruta: pjBruta,
                proventos: 0,
                descontos: 0,
                comissao_liquida: pjBruta,
                created_at: new Date().toISOString()
              }
              merged.push(newItem)
              newItemsToSync.push(newItem)
            }
          }
        })
      }

      // Add any database records or local records that are not in propData
      Array.from(mapExisting.values()).forEach(r => {
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

      // Sync any unsaved items to historico_pagamentos_pj
      if (newItemsToSync.length > 0) {
        for (const item of newItemsToSync) {
          try {
            const numericId = parseInt(String(item.id).replace(/\D/g, ""), 10)
            const payload: any = {
              id_lead: item.id_lead,
              data_pagamento: item.data_pagamento,
              nome: item.nome,
              cliente: item.cliente || "",
              cpf_cliente: item.cpf_cliente || "",
              valor_operacao: item.valor_operacao,
              aliquota_comissao: item.aliquota_comissao,
              comissao_bruta: item.comissao_bruta,
              proventos: item.proventos,
              descontos: item.descontos,
              comissao_liquida: item.comissao_liquida,
              updated_at: new Date().toISOString()
            }
            if (!isNaN(numericId) && numericId > 0) {
              payload.id = numericId
            }
            const { error: insErr } = await supabase.from("historico_pagamentos_pj").insert(payload)
            if (insErr) {
              delete payload.id
              await supabase.from("historico_pagamentos_pj").insert(payload)
            }
          } catch (syncErr) {
            console.warn("Aviso ao sincronizar item com historico_pagamentos_pj:", syncErr)
          }
        }
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de pagamentos PJ:", err)
      toast.error("Erro ao carregar histórico de pagamentos PJ.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(true)

    const handleUpdate = () => {
      loadData(false)
    }
    const handleMirrored = () => {
      setMirroredVersion(v => v + 1)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("historico_pj_updated", handleUpdate)
      window.addEventListener("historico_pj_espelhado", handleMirrored)
      window.addEventListener("storage", handleUpdate)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("historico_pj_updated", handleUpdate)
        window.removeEventListener("historico_pj_espelhado", handleMirrored)
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

  // Save changes to localStorage & Supabase
  const saveRecordsToStorage = async (updated: HistoricoPJRecord[], singleItemToSync?: HistoricoPJRecord) => {
    setRecords(updated)
    if (typeof window !== "undefined") {
      localStorage.setItem("historico_pagamentos_pj_records", JSON.stringify(updated))
      window.dispatchEvent(new Event("historico_pj_updated"))
    }

    if (singleItemToSync) {
      try {
        const { data: existing } = await supabase
          .from("historico_pagamentos_pj")
          .select("id")
          .eq("id_lead", singleItemToSync.id_lead)
          .maybeSingle()

        if (existing?.id) {
          await supabase
            .from("historico_pagamentos_pj")
            .update({
              data_pagamento: singleItemToSync.data_pagamento,
              nome: singleItemToSync.nome,
              valor_operacao: singleItemToSync.valor_operacao,
              aliquota_comissao: singleItemToSync.aliquota_comissao,
              comissao_bruta: singleItemToSync.comissao_bruta,
              proventos: singleItemToSync.proventos,
              descontos: singleItemToSync.descontos,
              comissao_liquida: singleItemToSync.comissao_liquida,
              updated_at: new Date().toISOString()
            })
            .eq("id", existing.id)
        } else {
          const numericId = parseInt(String(singleItemToSync.id).replace(/\D/g, ""), 10)
          const payload: any = {
            id_lead: singleItemToSync.id_lead,
            data_pagamento: singleItemToSync.data_pagamento,
            nome: singleItemToSync.nome,
            valor_operacao: singleItemToSync.valor_operacao,
            aliquota_comissao: singleItemToSync.aliquota_comissao,
            comissao_bruta: singleItemToSync.comissao_bruta,
            proventos: singleItemToSync.proventos,
            descontos: singleItemToSync.descontos,
            comissao_liquida: singleItemToSync.comissao_liquida,
            updated_at: new Date().toISOString()
          }
          if (!isNaN(numericId) && numericId > 0) {
            payload.id = numericId
          }
          const { error: insErr } = await supabase.from("historico_pagamentos_pj").insert(payload)
          if (insErr) {
            delete payload.id
            await supabase.from("historico_pagamentos_pj").insert(payload)
          }
        }
      } catch (dbErr) {
        console.error("Erro ao atualizar historico_pagamentos_pj no banco:", dbErr)
      }
    }
  }

  // Handle cell edit
  const handleCellChange = (
    idLead: string, 
    field: keyof HistoricoPJRecord, 
    value: string | number
  ) => {
    let editedItem: HistoricoPJRecord | undefined

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

        editedItem = item
        return item
      }
      return r
    })

    saveRecordsToStorage(updated, editedItem)
  }

  // Confirm and delete a record from history & revert proposal status to 'PAGAR PJ'
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return
    const idLead = recordToDelete.id_lead
    setIsDeleting(true)

    try {
      // 1. Remove from records state
      const updated = records.filter(r => r.id_lead !== idLead)
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(idLead)
        return next
      })
      saveRecordsToStorage(updated)

      // 2. Clear from LocalStorage PJ Paid IDs
      if (typeof window !== "undefined") {
        try {
          const storedPj = window.localStorage.getItem("receber_pj_paid_ids")
          const parsedPj = storedPj ? JSON.parse(storedPj) : {}
          parsedPj[idLead] = false
          window.localStorage.setItem("receber_pj_paid_ids", JSON.stringify(parsedPj))
        } catch (e) {
          console.error("Erro ao atualizar receber_pj_paid_ids:", e)
        }
      }

      // 3. Delete from Supabase historico_pagamentos_pj table
      try {
        await supabase.from("historico_pagamentos_pj").delete().eq("id_lead", idLead)
      } catch (dbErr) {
        console.error("Erro ao remover da historico_pagamentos_pj:", dbErr)
      }

      // 4. Update propostas table in Supabase to revert pjPaid status to false
      try {
        const { data: propRow } = await supabase
          .from("propostas")
          .select("observacoes")
          .eq("id_lead", idLead)
          .maybeSingle()

        if (propRow) {
          const obs = propRow.observacoes || ""
          let notes = obs
          let metadata: any = {}
          const prefix = "[FINANCE_METADATA_V1:"
          const suffix = "]"
          const startIdx = obs.indexOf(prefix)
          if (startIdx !== -1) {
            const endIdx = obs.indexOf(suffix, startIdx)
            if (endIdx !== -1) {
              notes = (obs.substring(0, startIdx) + obs.substring(endIdx + suffix.length)).trim()
              try {
                metadata = JSON.parse(obs.substring(startIdx + prefix.length, endIdx))
              } catch (e) {
                console.error("Erro ao parsear metadata da proposta:", e)
              }
            }
          }

          metadata.pjPaid = false
          metadata.pjPaidDate = null

          const cleanNotes = (notes || "").trim()
          const newObs = `${cleanNotes}\n\n${prefix}${JSON.stringify(metadata)}${suffix}`.trim()

          await supabase
            .from("propostas")
            .update({
              observacoes: newObs,
              updated_at: new Date().toISOString()
            })
            .eq("id_lead", idLead)
        }
      } catch (metaErr) {
        console.warn("Erro ao atualizar metadados da proposta:", metaErr)
      }

      // 5. Notify all components/tabs
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("historico_pj_updated"))
        window.dispatchEvent(new Event("storage"))
      }

      toast.success("Registro removido do histórico e status revertido para 'PAGAR PJ'.")
    } catch (err) {
      console.error("Erro ao excluir registro de pagamento PJ:", err)
      toast.error("Erro ao excluir registro.")
    } finally {
      setIsDeleting(false)
      setRecordToDelete(null)
    }
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
    // If logged user is a Corretor / Corretor PJ, only show mirrored records assigned to them
    let base = records
    if (isCorretorUser) {
      let mirroredMap: Record<string, boolean> = {}
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("historico_pj_espelhados")
        if (raw) {
          try {
            mirroredMap = JSON.parse(raw)
          } catch (e) {
            console.error(e)
          }
        }
      }

      const rawUserName = (perfil?.nome || perfil?.nome_completo || user?.email?.split("@")[0] || "").toLowerCase().trim()
      const norm = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
      const normalizedUserName = norm(rawUserName)
      const userFirstName = normalizedUserName.split(" ")[0] || ""

      base = records.filter(r => {
        // Must be mirrored in DB (r.espelhado === true) or active in mirroredMap
        const isMirrored = r.espelhado === true || !!mirroredMap[r.id_lead] || !!mirroredMap[r.id]
        if (!isMirrored) return false
        
        // If corretor user has a name, check if record belongs to them
        if (normalizedUserName && r.nome) {
          const recName = norm(r.nome)
          const recFirstName = recName.split(" ")[0] || ""
          const nameMatches = 
            recName.includes(normalizedUserName) || 
            normalizedUserName.includes(recName) ||
            (userFirstName.length >= 3 && recFirstName.length >= 3 && userFirstName === recFirstName)
            
          if (!nameMatches && recName !== "corretor pj" && recName !== "") {
            return false
          }
        }
        return true
      })
    }

    return base.filter(r => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim()
        const matchesSearch = 
          (r.id || "").toLowerCase().includes(term) ||
          (r.nome || "").toLowerCase().includes(term) ||
          (r.cliente || "").toLowerCase().includes(term) ||
          (r.cpf_cliente || "").replace(/\D/g, "").includes(term.replace(/\D/g, "")) ||
          (r.cpf_cliente || "").toLowerCase().includes(term) ||
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
  }, [records, searchTerm, startDate, endDate, selectedCorretor, minValor, maxValor, isCorretorUser, perfil?.nome, user?.email, mirroredVersion])

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
      { header: "Cliente", key: "cliente", width: 35 },
      { header: "CPF do Cliente", key: "cpf_cliente", width: 20 },
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
        cliente: r.cliente || "-",
        cpf_cliente: r.cpf_cliente || "-",
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

  // Handle Espelhar Histórico
  const handleEspelharHistorico = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um pagamento para espelhar.")
      return
    }

    try {
      let mirroredMap: Record<string, boolean> = {}
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("historico_pj_espelhados")
        if (raw) {
          try {
            mirroredMap = JSON.parse(raw)
          } catch (e) {}
        }
      }

      selectedIds.forEach(id => {
        mirroredMap[id] = true
      })

      if (typeof window !== "undefined") {
        localStorage.setItem("historico_pj_espelhados", JSON.stringify(mirroredMap))
        window.dispatchEvent(new Event("historico_pj_espelhado"))
      }

      // Persist to Supabase propostas table metadata and historico_pagamentos_pj table
      const selectedIdLeads = Array.from(selectedIds)
      for (const idLead of selectedIdLeads) {
        try {
          // 1. Try update historico_pagamentos_pj table directly if column exists
          await supabase
            .from("historico_pagamentos_pj")
            .update({
              espelhado: true,
              updated_at: new Date().toISOString()
            } as any)
            .eq("id_lead", idLead)
        } catch (dbErr) {}

        try {
          // 2. Also persist to propostas observacoes metadata
          const { data: prop } = await supabase
            .from("propostas")
            .select("observacoes")
            .eq("id_lead", idLead)
            .maybeSingle()

          if (prop) {
            let metadata: Record<string, any> = {}
            let notes = prop.observacoes || ""
            const obsMatch = notes.match(/\[FINANCE_METADATA\](.*?)\[\/FINANCE_METADATA\]/s)
            if (obsMatch && obsMatch[1]) {
              try {
                metadata = JSON.parse(obsMatch[1])
                notes = notes.replace(/\[FINANCE_METADATA\].*?\[\/FINANCE_METADATA\]/s, "").trim()
              } catch (e) {}
            }

            metadata.pjMirrored = true
            metadata.espelhado_pj = true
            metadata.espelhado = true
            const newObs = `${notes}\n\n[FINANCE_METADATA]${JSON.stringify(metadata)}[/FINANCE_METADATA]`.trim()

            await supabase
              .from("propostas")
              .update({
                observacoes: newObs,
                updated_at: new Date().toISOString()
              })
              .eq("id_lead", idLead)
          }
        } catch (dbErr) {
          console.warn("Aviso ao persistir espelhamento na proposta:", idLead, dbErr)
        }
      }

      // Update state in memory
      setRecords(prev => prev.map(r => selectedIds.has(r.id_lead) || selectedIds.has(r.id) ? { ...r, espelhado: true } : r))
      setMirroredVersion(v => v + 1)

      toast.success(`${selectedIds.size} pagamento(s) espelhado(s) com sucesso para o Corretor PJ!`)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao espelhar histórico.")
    }
  }

  // Handle Desfazer Espelhamento
  const handleDesfazerEspelhamento = async (record: HistoricoPJRecord) => {
    try {
      // 1. Remove from localStorage
      if (typeof window !== "undefined") {
        const raw = localStorage.getItem("historico_pj_espelhados")
        if (raw) {
          try {
            const map = JSON.parse(raw)
            delete map[record.id_lead]
            delete map[record.id]
            localStorage.setItem("historico_pj_espelhados", JSON.stringify(map))
            window.dispatchEvent(new Event("historico_pj_espelhado"))
          } catch (e) {}
        }
      }

      // 2. Update Supabase historico_pagamentos_pj table
      try {
        await supabase
          .from("historico_pagamentos_pj")
          .update({
            espelhado: false,
            updated_at: new Date().toISOString()
          } as any)
          .eq("id_lead", record.id_lead)
      } catch (dbErr) {}

      // 3. Update Supabase propostas metadata
      try {
        const { data: prop } = await supabase
          .from("propostas")
          .select("observacoes")
          .eq("id_lead", record.id_lead)
          .maybeSingle()

        if (prop) {
          let metadata: Record<string, any> = {}
          let notes = prop.observacoes || ""
          const obsMatch = notes.match(/\[FINANCE_METADATA\](.*?)\[\/FINANCE_METADATA\]/s)
          if (obsMatch && obsMatch[1]) {
            try {
              metadata = JSON.parse(obsMatch[1])
              notes = notes.replace(/\[FINANCE_METADATA\].*?\[\/FINANCE_METADATA\]/s, "").trim()
            } catch (e) {}
          }

          metadata.pjMirrored = false
          metadata.espelhado_pj = false
          metadata.espelhado = false
          const newObs = `${notes}\n\n[FINANCE_METADATA]${JSON.stringify(metadata)}[/FINANCE_METADATA]`.trim()

          await supabase
            .from("propostas")
            .update({
              observacoes: newObs,
              updated_at: new Date().toISOString()
            })
            .eq("id_lead", record.id_lead)
        }
      } catch (dbErr) {}

      // 4. Update memory state
      setRecords(prev => prev.map(r => (r.id_lead === record.id_lead || r.id === record.id) ? { ...r, espelhado: false } : r))
      setMirroredVersion(v => v + 1)

      toast.success(`Espelhamento do pagamento #${record.id} desfeito com sucesso!`)
    } catch (e) {
      console.error(e)
      toast.error("Erro ao desfazer espelhamento.")
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/50">
      <Header title={isCorretorUser ? "HISTÓRICO DE PAGAMENTOS" : "HISTÓRICO DE PAGAMENTOS PJ"} />

      <main className="flex-1 p-4 md:p-6 space-y-6 max-w-[1600px] w-full mx-auto">
        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Operações */}
          <Card className="card-shadow border border-slate-200 h-full relative transition-all hover:scale-[1.02] bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <p className="text-[9px] font-bold text-[#171717] uppercase mb-1 h-6 leading-tight tracking-widest text-[#171717]/80">
                TOTAL OPERAÇÕES
              </p>
              <p className="text-[17px] font-black text-[#1C2643] tracking-tight mb-3">
                {formatCurrency(totals.valor_operacao)}
              </p>
              <div className="flex items-center gap-2">
                <div className="bg-[#1C2643] px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[20px] flex justify-center shadow-sm">
                  {filteredRecords.length}
                </div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">registro(s)</span>
              </div>
            </CardContent>
          </Card>

          {/* Comissão Bruta */}
          <Card className="card-shadow border border-slate-200 h-full relative transition-all hover:scale-[1.02] bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <p className="text-[9px] font-bold text-[#171717] uppercase mb-1 h-6 leading-tight tracking-widest text-[#171717]/80">
                COMISSÃO BRUTA
              </p>
              <p className="text-[17px] font-black text-indigo-900 tracking-tight mb-3">
                {formatCurrency(totals.comissao_bruta)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest leading-none">Soma bruta acumulada</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Proventos */}
          <Card className="card-shadow border border-slate-200 h-full relative transition-all hover:scale-[1.02] bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <p className="text-[9px] font-bold text-[#171717] uppercase mb-1 h-6 leading-tight tracking-widest text-[#171717]/80">
                TOTAL PROVENTOS
              </p>
              <p className="text-[17px] font-black text-emerald-600 tracking-tight mb-3">
                {formatCurrency(totals.proventos)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none">+ Valores adicionados</span>
              </div>
            </CardContent>
          </Card>

          {/* Total Descontos */}
          <Card className="card-shadow border border-slate-200 h-full relative transition-all hover:scale-[1.02] bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <p className="text-[9px] font-bold text-[#171717] uppercase mb-1 h-6 leading-tight tracking-widest text-[#171717]/80">
                TOTAL DESCONTOS
              </p>
              <p className="text-[17px] font-black text-rose-600 tracking-tight mb-3">
                {formatCurrency(totals.descontos)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest leading-none">- Subtrações efetuadas</span>
              </div>
            </CardContent>
          </Card>

          {/* Comissão Líquida Total */}
          <Card className="card-shadow border border-slate-200 h-full relative transition-all hover:scale-[1.02] bg-white rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <p className="text-[9px] font-bold text-[#171717] uppercase mb-1 h-6 leading-tight tracking-widest text-[#171717]/80">
                COMISSÃO LÍQUIDA TOTAL
              </p>
              <p className="text-[17px] font-black text-blue-900 tracking-tight mb-3">
                {formatCurrency(totals.comissao_liquida)}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none">Total repassado aos PJs</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Controls Bar */}
        <Card id="card-pj-filters" className="card-shadow border border-slate-200 bg-white relative transition-all hover:scale-[1.02] rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <h3 className="text-[10px] font-black text-slate-700 tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" /> Pesquisa de Histórico de Pagamentos PJ
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              {/* BUSCAR RECEBÍVEIS / BUSCA RÁPIDA */}
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">
                  Buscar Recebíveis / Digitação
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
                    className="pl-9 h-[38px] bg-white border border-slate-200 text-[11px] font-medium text-slate-800 transition-colors focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg placeholder:text-[9.5px] placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* PERÍODO DE PAGAMENTO */}
              <div className="md:col-span-4 space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">
                  Período de Pagamento
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="h-[38px] w-full text-[11px] border border-slate-200 rounded-lg bg-white px-3 font-medium text-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-300"
                  />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">A</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="h-[38px] w-full text-[11px] border border-slate-200 rounded-lg bg-white px-3 font-medium text-slate-800 transition-colors focus:outline-none focus:ring-1 focus:ring-slate-300"
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
                    "h-[38px] px-3.5 rounded-lg border border-slate-200 text-[11px] font-bold uppercase tracking-widest gap-1.5 transition-colors cursor-pointer",
                    showAdvancedFilters ? "bg-slate-100 text-[#171717]" : "text-slate-600 hover:bg-slate-50"
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
                  className="h-[38px] px-3.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 text-[11px] font-bold uppercase tracking-widest cursor-pointer"
                >
                  <span>LIMPAR</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  className="h-[38px] px-4 bg-[#171717] hover:bg-[#171717]/90 text-white text-[11px] font-black uppercase tracking-widest gap-1.5 cursor-pointer rounded-lg border-2 border-transparent shadow-sm"
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
                  <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">
                    Corretor PJ
                  </label>
                  <select
                    value={selectedCorretor}
                    onChange={(e) => {
                      setSelectedCorretor(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="h-[38px] w-full text-[11px] border border-slate-200 rounded-lg bg-white px-3 focus:outline-none focus:ring-1 focus:ring-slate-300 font-medium text-slate-800 transition-colors"
                  >
                    <option value="">TODOS OS CORRETORES PJ</option>
                    {uniqueCorretores.map(c => (
                      <option key={c} value={c}>{c.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Valor Operação Range */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">
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
                      className="h-[38px] bg-white border border-slate-200 text-[11px] font-medium text-slate-800 rounded-lg placeholder:text-[9.5px]"
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
                      className="h-[38px] bg-white border border-slate-200 text-[11px] font-medium text-slate-800 rounded-lg placeholder:text-[9.5px]"
                    />
                  </div>
                </div>

                {/* Selected Count / Clear Action */}
                <div className="flex items-end justify-between pb-0.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                    {filteredRecords.length} registro(s) encontrado(s)
                  </span>
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="text-[11px] font-bold text-rose-600 hover:underline uppercase tracking-widest cursor-pointer"
                  >
                    Limpar todos os filtros
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table Container Card matching image.png */}
        <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
          {/* Header Bar above Table */}
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-end gap-3 bg-white">
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

            <Button
              onClick={exportToExcel}
              size="sm"
              className="h-8 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 shadow-sm cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>
                {selectedIds.size > 0 ? `Exportar Excel (${selectedIds.size})` : "Exportar Excel"}
              </span>
            </Button>

            {!isCorretorUser && (
              <Button
                onClick={handleEspelharHistorico}
                size="sm"
                className="h-8 px-3.5 rounded-xl bg-[#1C2643] hover:bg-[#2A3860] text-white text-xs font-bold gap-2 shadow-sm cursor-pointer"
                title="Espelhar histórico para o Corretor PJ"
              >
                <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                <span>
                  {selectedIds.size > 0 ? `Espelhar Histórico (${selectedIds.size})` : "Espelhar Histórico"}
                </span>
              </Button>
            )}
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
                  {!isCorretorUser && (
                    <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[220px]">
                      CORRETOR PJ
                    </th>
                  )}
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[220px]">
                    CLIENTE
                  </th>
                  <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap min-w-[150px]">
                    CPF DO CLIENTE
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
                  {!isCorretorUser && (
                    <th className="py-4 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center min-w-[80px]">
                      AÇÕES
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400 font-bold">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#1C2643]" />
                        <span>Carregando histórico de repasses...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-12 text-center text-slate-400 font-bold">
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
                        <td className="py-3 px-4 font-black text-center whitespace-nowrap">
                          {(() => {
                            const isDbMirrored = item.espelhado === true

                            if (!isCorretorUser && isDbMirrored) {
                              return (
                                <span className="bg-emerald-100 border border-emerald-300 text-emerald-800 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-xs inline-flex items-center gap-1">
                                  #{item.id}
                                </span>
                              )
                            }

                            return (
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                #{item.id}
                              </span>
                            )
                          })()}
                        </td>

                        {/* Data do Pagamento (Editable) */}
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          <input
                            type="date"
                            value={item.data_pagamento || ""}
                            disabled={isCorretorUser}
                            onChange={(e) => handleCellChange(item.id_lead, "data_pagamento", e.target.value)}
                            className={cn(
                              "h-8 px-2 rounded-lg bg-transparent font-bold text-slate-700 text-xs focus:ring-1 focus:ring-[#1C2643] focus:bg-white focus:outline-none transition-colors",
                              isCorretorUser && "pointer-events-none"
                            )}
                          />
                        </td>

                        {/* Nome do Corretor (only for admin) */}
                        {!isCorretorUser && (
                          <td className="py-3 px-4 font-black text-slate-800 uppercase whitespace-nowrap">
                            {item.nome}
                          </td>
                        )}

                        {/* CLIENTE */}
                        <td className="py-3 px-4 font-bold text-slate-700 uppercase whitespace-nowrap">
                          {item.cliente || "-"}
                        </td>

                        {/* CPF DO CLIENTE */}
                        <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                          {item.cpf_cliente || "-"}
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
                              disabled={isCorretorUser}
                              onChange={(e) => handleCellChange(item.id_lead, "aliquota_comissao", e.target.value)}
                              className={cn(
                                "h-8 w-16 px-1.5 text-right rounded-lg bg-transparent font-bold text-slate-700 text-xs focus:ring-1 focus:ring-[#1C2643] focus:bg-white focus:outline-none transition-colors",
                                isCorretorUser && "pointer-events-none"
                              )}
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
                            disabled={isCorretorUser}
                            onChange={(e) => handleCellChange(item.id_lead, "comissao_bruta", e.target.value)}
                            className={cn(
                              "h-8 w-28 px-2 text-right rounded-lg bg-transparent font-bold text-emerald-700 text-xs focus:ring-1 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-colors",
                              isCorretorUser && "pointer-events-none"
                            )}
                          />
                        </td>

                        {/* PROVENTOS (Editable) */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={item.proventos ?? ""}
                            disabled={isCorretorUser}
                            onChange={(e) => handleCellChange(item.id_lead, "proventos", e.target.value)}
                            className={cn(
                              "h-8 w-24 px-2 text-right rounded-lg bg-transparent font-bold text-emerald-700 text-xs focus:ring-1 focus:ring-emerald-400 focus:bg-white focus:outline-none transition-colors",
                              isCorretorUser && "pointer-events-none"
                            )}
                          />
                        </td>

                        {/* DESCONTOS (Editable) */}
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={item.descontos ?? ""}
                            disabled={isCorretorUser}
                            onChange={(e) => handleCellChange(item.id_lead, "descontos", e.target.value)}
                            className={cn(
                              "h-8 w-24 px-2 text-right rounded-lg bg-transparent font-bold text-rose-700 text-xs focus:ring-1 focus:ring-rose-400 focus:bg-white focus:outline-none transition-colors",
                              isCorretorUser && "pointer-events-none"
                            )}
                          />
                        </td>

                        {/* COMISSÃO LÍQUIDA */}
                        <td className="py-3 px-4 font-black text-[#1C2643] text-right whitespace-nowrap bg-slate-50/50">
                          {formatCurrency(item.comissao_liquida)}
                        </td>

                        {/* Action */}
                        {!isCorretorUser && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              {item.espelhado && (
                                <button
                                  type="button"
                                  onClick={() => handleDesfazerEspelhamento(item)}
                                  title="Desfazer espelhamento para o Corretor PJ"
                                  className="text-amber-500 hover:text-amber-700 transition-colors cursor-pointer p-1 rounded hover:bg-amber-50"
                                >
                                  <Undo2 className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setRecordToDelete(item)}
                                title="Remover do histórico"
                                className="text-slate-300 hover:text-rose-600 transition-colors cursor-pointer p-1 rounded hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
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

        {/* Modal de Confirmação de Exclusão */}
        <Dialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
          <DialogContent className="sm:max-w-[440px] p-6 rounded-2xl bg-white shadow-2xl border border-slate-200">
            <DialogHeader className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto sm:mx-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-base font-black text-[#1C2643]">
                Confirmar Exclusão de Repasse PJ
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 leading-relaxed">
                Tem certeza que deseja remover o pagamento PJ referente à proposta{" "}
                <span className="font-bold text-slate-800">#{recordToDelete?.id} - {recordToDelete?.nome}</span>?
                <br /><br />
                <span className="block p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-semibold">
                  ⚠️ <strong>Atenção:</strong> O registro será removido do histórico de pagamentos PJ e o botão no <strong>Contas a Receber</strong> será alternado de volta para <strong>PAGAR PJ</strong>. A proposta continuará salva no sistema.
                </span>
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="mt-6 flex items-center justify-end gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="h-9 px-4 rounded-xl text-xs font-bold text-slate-600 border-slate-200 hover:bg-slate-50"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="h-9 px-4 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all"
              >
                {isDeleting ? "Excluindo..." : "Sim, Excluir e Reverter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
