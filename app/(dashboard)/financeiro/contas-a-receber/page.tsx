"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { format } from "date-fns"
import { useSidebar } from "@/context/sidebar-context"
import { 
  Search, 
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  RefreshCw,
  Eraser,
  FileSpreadsheet,
  TrendingUp,
  Banknote,
  Clock,
  CheckCircle,
  PiggyBank,
  ArrowRight,
  Building2,
  Lock,
  MoreVertical,
  Check,
  Edit2,
  MessageSquare,
  Folder,
  FolderOpen,
  X
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { toast } from "react-hot-toast"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

interface Proposal {
  id: number
  id_lead: string
  corretor_id?: string
  corretor?: string
  equipe?: string
  ade?: string
  nome_corretor?: string
  nome_cliente: string
  cliente_cpf: string
  convenio: string
  banco: string
  tipo_operacao: string
  status: string
  resposta_corretor?: string
  obs_corretor?: string
  obs_operacional?: string
  observacoes?: string
  valor_base?: number
  valor_cliente_operacional?: number
  valor_producao?: number
  valor_operacao?: number
  valor_cliente?: number
  valor_parcela?: number
  prazo?: number | string
  coeficiente?: number | string
  email?: string
  tel_residencial_1?: string
  tel_residencial_2?: string
  tel_comercial?: string
  matricula?: string
  data_nascimento?: string
  naturalidade?: string
  uf_naturalidade?: string
  identidade?: string
  orgao_emissor?: string
  uf_emissao?: string
  data_emissao?: string
  nome_pai?: string
  nome_mae?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  cep?: string
  banco_cliente?: string
  chave_pix?: string
  conta?: string
  agencia?: string
  dv?: string
  tipo_conta?: string
  valor_operacao_operacional?: number
  coeficiente_prazo?: string
  data_consulta?: string
  data_digitacao?: string
  data_pago_cliente?: string
  comissao_banco_porcentagem?: number | null
  comissao_banco_valor?: number | null
  updated_at?: string
  created_at: string
}

const safeFloat = (val: unknown): number => {
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (str.includes(",") && !str.includes(".")) {
    const parsed = parseFloat(str.replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  }
  if (str.includes(",") && str.includes(".")) {
    const parsed = parseFloat(str.replace(/\./g, "").replace(",", "."));
    return isNaN(parsed) ? 0 : parsed;
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

interface FinanceMetadata {
  received?: boolean
  receivedDate?: string
  paymentStatus?: "A_RECEBER" | "RECEBIDO" | "ESTORNADO"
  pjPaid?: boolean
  pjPaidDate?: string
}

const METADATA_PREFIX = "[FINANCE_METADATA_V1:"
const METADATA_SUFFIX = "]"

const parseProposalNotesAndMetadata = (observacoes: string | undefined): { notes: string; metadata: FinanceMetadata } => {
  if (!observacoes) {
    return { notes: "", metadata: {} }
  }
  const startIndex = observacoes.indexOf(METADATA_PREFIX)
  if (startIndex === -1) {
    return { notes: observacoes, metadata: {} }
  }
  const endIndex = observacoes.indexOf(METADATA_SUFFIX, startIndex)
  if (endIndex === -1) {
    return { notes: observacoes, metadata: {} }
  }
  
  const notes = (observacoes.substring(0, startIndex) + observacoes.substring(endIndex + METADATA_SUFFIX.length)).trim()
  const metadataStr = observacoes.substring(startIndex + METADATA_PREFIX.length, endIndex)
  try {
    const metadata = JSON.parse(metadataStr)
    return { notes, metadata }
  } catch (e) {
    console.error("Failed to parse finance metadata", e)
    return { notes: observacoes, metadata: {} }
  }
}

const buildProposalNotesAndMetadata = (notes: string, metadata: FinanceMetadata): string => {
  const cleanNotes = (notes || "").trim()
  const metadataStr = JSON.stringify(metadata)
  return `${cleanNotes}\n\n${METADATA_PREFIX}${metadataStr}${METADATA_SUFFIX}`.trim()
}

interface EditableAmountCellProps {
  initialValue: number
  onSave: (value: number) => void
  id: string
  textClassName?: string
  confirmNeeded?: boolean
  fieldName?: string
}

const EditableAmountCell = ({ initialValue, onSave, id, textClassName, confirmNeeded, fieldName }: EditableAmountCellProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingValue, setPendingValue] = useState<number | null>(null)

  useEffect(() => {
    setTempValue(initialValue.toFixed(2).replace(".", ","))
  }, [initialValue])

  const handleBlur = () => {
    setIsEditing(false)
    const parsed = parseFloat(tempValue.replace(/\./g, "").replace(",", "."))
    if (!isNaN(parsed) && parsed !== initialValue) {
      if (confirmNeeded) {
        setPendingValue(parsed)
        setShowConfirm(true)
      } else {
        onSave(parsed)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
    } else if (e.key === "Escape") {
      setTempValue(initialValue.toFixed(2).replace(".", ","))
      setIsEditing(false)
    }
  }

  const handleConfirmSave = () => {
    if (pendingValue !== null) {
      onSave(pendingValue)
    }
    setShowConfirm(false)
    setPendingValue(null)
  }

  const handleCancelSave = () => {
    setTempValue(initialValue.toFixed(2).replace(".", ","))
    setShowConfirm(false)
    setPendingValue(null)
  }

  return (
    <>
      {isEditing ? (
        <div 
          className="inline-flex items-center justify-end gap-1 border border-slate-300 focus-within:border-primary/50 bg-white px-2 py-1 rounded-xl transition-all w-32 shadow-sm text-right"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-[10px] text-slate-400 font-bold">R$</span>
          <input
            id={id}
            type="text"
            inputMode="decimal"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full text-right text-[11px] font-black text-[#171717] bg-transparent border-none focus:outline-none focus:ring-0 p-0"
          />
        </div>
      ) : (
        <div 
          className="inline-flex items-center justify-end gap-1 px-2 py-1 rounded-xl hover:bg-slate-150 transition-all cursor-pointer text-right group/cell ml-auto"
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
        >
          <span className={cn("text-[11px] font-bold group-hover/cell:text-primary transition-colors", textClassName || "text-slate-700")}>
            R$ {initialValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </span>
          <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/cell:opacity-100 transition-opacity ml-1" />
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && pendingValue !== null && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-fade-in"
          onClick={(e) => {
            e.stopPropagation()
            handleCancelSave()
          }}
        >
          <div 
            className="w-full max-w-md border border-slate-200 shadow-2xl bg-white rounded-2xl overflow-hidden text-left whitespace-normal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 bg-[#171717] text-white">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">⚠️ OPERAÇÃO DE ALTO RISCO</span>
              <h3 className="text-sm font-black uppercase tracking-tight mt-0.5">Confirmar Alteração de {fieldName || "Valor"}</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Você está prestes a alterar manualmente o campo <strong className="text-slate-900">{fieldName || "Valor"}</strong> deste contrato.
              </p>

              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-400">Valor Anterior:</span>
                  <span className="font-extrabold text-slate-700">R$ {initialValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-t border-slate-200/60 pt-2">
                  <span className="font-semibold text-slate-400">Novo Valor:</span>
                  <span className="font-black text-amber-600 text-sm">R$ {pendingValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="text-[10px] font-bold text-slate-400 bg-amber-50 border border-amber-100 p-3 rounded-lg flex items-start gap-2">
                <span className="text-amber-500 text-xs">ℹ️</span>
                <p className="leading-normal">
                  Ao confirmar, o sistema salvará a alteração no banco de dados.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelSave}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSave}
                  className="px-4 py-2 text-xs font-black text-white bg-[#171717] hover:bg-[#262626] rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  Confirmar Alteração
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface EditablePercentCellProps {
  initialValue: number | undefined
  onSave: (value: number | undefined) => void
  id: string
  textClassName?: string
}

const EditablePercentCell = ({ initialValue, onSave, id, textClassName }: EditablePercentCellProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState("")

  useEffect(() => {
    setTempValue(initialValue !== undefined && initialValue !== null ? initialValue.toString().replace(".", ",") : "")
  }, [initialValue])

  const handleBlur = () => {
    setIsEditing(false)
    const cleanedVal = tempValue.replace(/\./g, "").replace(",", ".")
    const val = tempValue === "" ? undefined : parseFloat(cleanedVal)
    if (val !== initialValue) {
      onSave(val)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur()
    } else if (e.key === "Escape") {
      setTempValue(initialValue !== undefined && initialValue !== null ? initialValue.toString().replace(".", ",") : "")
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <div 
        className="inline-flex items-center justify-center gap-1 border border-slate-300 focus-within:border-primary/50 bg-white px-2 py-1 rounded-xl transition-all w-24 shadow-sm text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full text-center text-[11px] font-black text-[#171717] bg-transparent border-none focus:outline-none focus:ring-0 p-0"
        />
        <span className="text-[10px] text-slate-400 font-bold">%</span>
      </div>
    )
  }

  const displayValue = initialValue !== undefined && initialValue !== null ? `${initialValue.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} %` : "0,00 %"

  return (
    <div 
      className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-xl hover:bg-slate-150 transition-all cursor-pointer text-center group/cell mx-auto"
      onClick={(e) => {
        e.stopPropagation()
        setIsEditing(true)
      }}
    >
      <span className={cn("text-[11px] font-bold group-hover/cell:text-primary transition-colors", textClassName || "text-slate-700")}>
        {displayValue}
      </span>
      <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/cell:opacity-100 transition-opacity ml-1" />
    </div>
  )
}

export default function ContasAReceberPage() {
  const { perfil, isAdmin, isDeveloper, isOperational, isSupervisor, isEstagio } = useAuth()
  const router = useRouter()
  const { isCollapsed } = useSidebar()

  // Redirect if unauthorized
  useEffect(() => {
    if (perfil) {
      const allowedRoles = ["Administrador", "Desenvolvedor"]
      const roleStr = perfil?.role || ""
      const isAllowed = allowedRoles.some(role => roleStr.toLowerCase() === role.toLowerCase()) || isAdmin
      
      if (!isAllowed) {
        toast.error("Você não tem acesso a esta página de Contas a Receber.")
        router.push("/")
      }
    }
  }, [perfil, isAdmin, router])

  const [proposals, setProposals] = useState<Proposal[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dbProdutosConfigs, setDbProdutosConfigs] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bancosList, setBancosList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("TODOS")
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>("TODOS")
  const [selectedConvenioFilter, setSelectedConvenioFilter] = useState<string>("TODOS")
  const [selectedPjPartnerFilter, setSelectedPjPartnerFilter] = useState<string>("TODOS")
  const [startDate, setStartDate] = useState(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const year = firstDay.getFullYear()
    const month = String(firstDay.getMonth() + 1).padStart(2, "0")
    const day = String(firstDay.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })
  const [endDate, setEndDate] = useState(() => {
    const now = new Date()
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    const year = lastDay.getFullYear()
    const month = String(lastDay.getMonth() + 1).padStart(2, "0")
    const day = String(lastDay.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  })
  
  const [receivedFilter, setReceivedFilter] = useState<string>("TODOS")
  const [minValorOperacao, setMinValorOperacao] = useState("")
  const [maxValorOperacao, setMaxValorOperacao] = useState("")
  const [minComissaoPercent, setMinComissaoPercent] = useState("")
  const [maxComissaoPercent, setMaxComissaoPercent] = useState("")
  const [minComissaoValor, setMinComissaoValor] = useState("")
  const [maxComissaoValor, setMaxComissaoValor] = useState("")
  
  const [commissionRate, setCommissionRate] = useState<number>(6) // Default 6% standard commission
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)
  
  const [paymentStatuses, setPaymentStatuses] = useState<Record<string, "A_RECEBER" | "RECEBIDO" | "ESTORNADO">>({})
  const [receivedProposalIds, setReceivedProposalIds] = useState<Record<string, boolean>>({})
  const [receivedProposalDates, setReceivedProposalDates] = useState<Record<string, string>>({})
  const [pjPaidProposalIds, setPjPaidProposalIds] = useState<Record<string, boolean>>({})
  const [customCommissionPercents, setCustomCommissionPercents] = useState<Record<string, number>>({})

  // Active Folder & Subfolder state for PJ
  type CardFolderType = 'total' | 'comissao' | 'recebida' | 'a_receber' | 'estorno' | 'conta_corrente' | null;
  const [activeCardFolder, setActiveCardFolder] = useState<CardFolderType>(null);
  const [showPJSubfolder, setShowPJSubfolder] = useState<boolean>(false);

  // Map of PJ Users / Brokers
  const [pjUsersMap, setPjUsersMap] = useState<Set<string>>(new Set());
  const [pjUserNames, setPjUserNames] = useState<Set<string>>(new Set());
  const [colaboradoresDocMap, setColaboradoresDocMap] = useState<Map<string, { cpf?: string; cnpj?: string }>>(new Map());

  useEffect(() => {
    async function fetchColaboradoresDocs() {
      try {
        const { data } = await supabase.from("colaboradores").select("usuario_id, nome, cpf, cnpj")
        if (data && Array.isArray(data)) {
          const map = new Map<string, { cpf?: string; cnpj?: string }>()
          const normStr = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
          data.forEach((item: any) => {
            const doc = { cpf: item.cpf || undefined, cnpj: item.cnpj || undefined }
            if (item.usuario_id) map.set(String(item.usuario_id), doc)
            if (item.nome) {
              map.set(item.nome.trim().toUpperCase(), doc)
              map.set(normStr(item.nome), doc)
            }
          })
          setColaboradoresDocMap(map)
        }
      } catch (err) {
        console.error("Erro ao buscar colaboradores para extrato:", err)
      }
    }
    fetchColaboradoresDocs()
  }, [])

  const getBrokerDocument = useCallback((proposal: Proposal) => {
    const normStr = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    let docObj: { cpf?: string; cnpj?: string } | undefined = undefined
    if (proposal.corretor_id && colaboradoresDocMap.has(String(proposal.corretor_id))) {
      docObj = colaboradoresDocMap.get(String(proposal.corretor_id))
    } else {
      const rawName = (proposal.nome_corretor || proposal.corretor || "").trim().toUpperCase()
      if (rawName && colaboradoresDocMap.has(rawName)) {
        docObj = colaboradoresDocMap.get(rawName)
      } else if (rawName && colaboradoresDocMap.has(normStr(rawName))) {
        docObj = colaboradoresDocMap.get(normStr(rawName))
      }
    }
    if (docObj?.cnpj) return docObj.cnpj
    if (docObj?.cpf) return docObj.cpf
    return "-"
  }, [colaboradoresDocMap])

  useEffect(() => {
    async function fetchPjUsers() {
      try {
        const res = await fetch("/api/usuarios")
        if (res.ok) {
          const users = await res.json()
          const pjIds = new Set<string>()
          const pjNames = new Set<string>()
          if (Array.isArray(users)) {
            users.forEach((u: any) => {
              const reg = (u.regime_contratacao || "").trim().toUpperCase()
              const func = (u.funcao || "").trim().toUpperCase()
              const role = (u.role || "").trim().toUpperCase()
              const name = (u.nome || u.nome_completo || "").trim().toUpperCase()
              const username = (u.username || "").trim().toUpperCase()
              
              if (
                reg.includes("PJ") || 
                func.includes("PJ") || 
                role.includes("PJ") || 
                name.includes("PJ") || 
                username.includes("PJ")
              ) {
                if (u.id) {
                  pjIds.add(String(u.id))
                  pjIds.add(String(u.id).toLowerCase())
                }
                if (u.username) {
                  pjIds.add(String(u.username))
                  pjIds.add(String(u.username).toLowerCase())
                }
                
                const normName = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
                if (u.nome) {
                  pjNames.add(u.nome.toLowerCase().trim())
                  pjNames.add(normName(u.nome))
                }
                if (u.nome_completo) {
                  pjNames.add(u.nome_completo.toLowerCase().trim())
                  pjNames.add(normName(u.nome_completo))
                }
                if (u.username) {
                  pjNames.add(u.username.toLowerCase().trim())
                  pjNames.add(normName(u.username))
                }
              }
            })
          }
          setPjUsersMap(pjIds)
          setPjUserNames(pjNames)
        }
      } catch (e) {
        console.error("Erro ao carregar usuarios PJ:", e)
      }
    }
    fetchPjUsers()
  }, [])

  const getPaymentStatus = useCallback((idLead: string): "A_RECEBER" | "RECEBIDO" | "ESTORNADO" => {
    if (paymentStatuses[idLead]) return paymentStatuses[idLead]
    if (receivedProposalIds[idLead]) return "RECEBIDO"
    return "A_RECEBER"
  }, [paymentStatuses, receivedProposalIds])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedStatuses = window.localStorage.getItem("receber_payment_statuses")
      if (storedStatuses) {
        try {
          setPaymentStatuses(JSON.parse(storedStatuses))
        } catch (e) {
          console.error(e)
        }
      }
      const stored = window.localStorage.getItem("receber_pago_status_ids")
      if (stored) {
        try {
          setReceivedProposalIds(JSON.parse(stored))
        } catch (e) {
          console.error(e)
        }
      }
      const storedDates = window.localStorage.getItem("receber_pago_dates")
      if (storedDates) {
        try {
          setReceivedProposalDates(JSON.parse(storedDates))
        } catch (e) {
          console.error(e)
        }
      }
      const storedPercents = window.localStorage.getItem("receber_custom_commission_percents")
      if (storedPercents) {
        try {
          setCustomCommissionPercents(JSON.parse(storedPercents))
        } catch (e) {
          console.error(e)
        }
      }
      const storedPjPaid = window.localStorage.getItem("receber_pj_paid_ids")
      if (storedPjPaid) {
        try {
          setPjPaidProposalIds(JSON.parse(storedPjPaid))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  const handlePaymentStatusChange = async (idLead: string, newStatus: "A_RECEBER" | "RECEBIDO" | "ESTORNADO") => {
    const proposal = proposals.find(p => p.id_lead === idLead)
    if (!proposal) return

    const currentObs = proposal.observacoes || ""
    const { notes, metadata } = parseProposalNotesAndMetadata(currentObs)

    const isNowReceived = newStatus === "RECEBIDO"
    const receivedDate = isNowReceived ? new Date().toISOString() : (newStatus === "A_RECEBER" ? undefined : metadata.receivedDate)

    // 1. Update UI state immediately
    setPaymentStatuses(prev => ({ ...prev, [idLead]: newStatus }))
    setReceivedProposalIds(prev => ({ ...prev, [idLead]: isNowReceived }))
    if (isNowReceived) {
      setReceivedProposalDates(prev => ({ ...prev, [idLead]: receivedDate! }))
    } else if (newStatus === "A_RECEBER") {
      setReceivedProposalDates(prev => {
        const updated = { ...prev }
        delete updated[idLead]
        return updated
      })
    }

    // 2. Persist to localStorage as secondary backup
    if (typeof window !== "undefined") {
      const storedStatuses = window.localStorage.getItem("receber_payment_statuses")
      const parsedStatuses = storedStatuses ? JSON.parse(storedStatuses) : {}
      parsedStatuses[idLead] = newStatus
      window.localStorage.setItem("receber_payment_statuses", JSON.stringify(parsedStatuses))

      const storedIds = window.localStorage.getItem("receber_pago_status_ids")
      const parsedIds = storedIds ? JSON.parse(storedIds) : {}
      parsedIds[idLead] = isNowReceived
      window.localStorage.setItem("receber_pago_status_ids", JSON.stringify(parsedIds))

      const storedDates = window.localStorage.getItem("receber_pago_dates")
      const parsedDates = storedDates ? JSON.parse(storedDates) : {}
      if (isNowReceived) {
        parsedDates[idLead] = receivedDate
      } else {
        delete parsedDates[idLead]
      }
      window.localStorage.setItem("receber_pago_dates", JSON.stringify(parsedDates))
    }

    // 3. Persist to database inside `observacoes` of the proposal
    try {
      let updatePayload: Record<string, unknown> = {}

      if (newStatus === "ESTORNADO") {
        const newMetadata: FinanceMetadata = {
          ...metadata,
          received: false,
          paymentStatus: "ESTORNADO"
        }
        const newObs = buildProposalNotesAndMetadata(notes, newMetadata)

        updatePayload = {
          status: "CANCELADO",
          observacoes: newObs,
          updated_at: new Date().toISOString()
        }
      } else {
        const targetStatus = proposal.status === "CANCELADO"
          ? "PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA"
          : proposal.status

        const newMetadata: FinanceMetadata = {
          ...metadata,
          received: isNowReceived,
          receivedDate: receivedDate,
          paymentStatus: newStatus
        }
        const newObs = buildProposalNotesAndMetadata(notes, newMetadata)

        updatePayload = {
          status: targetStatus,
          observacoes: newObs,
          updated_at: new Date().toISOString()
        }
      }

      const { error } = await supabase
        .from("propostas")
        .update(updatePayload)
        .eq("id_lead", idLead)

      if (error) {
        console.error("Erro ao salvar status de recebimento no banco:", error.message)
        toast.error("Erro ao sincronizar recebimento com o servidor.")
      } else {
        setProposals(prev => prev.map(p => p.id_lead === idLead ? {
          ...p,
          status: (updatePayload.status as string) || p.status,
          observacoes: (updatePayload.observacoes as string) || p.observacoes
        } : p))

        if (newStatus === "ESTORNADO") {
          toast.success("Pagamento estornado! Proposta alterada para CANCELADO.")
        } else if (newStatus === "RECEBIDO") {
          toast.success("Marcado como RECEBIDO!")
        } else {
          toast.success("Marcado como A RECEBER!")
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar recebimento:", err)
      toast.error("Falha ao atualizar status do pagamento.")
    }
  }

  const toggleReceivedStatus = async (idLead: string) => {
    const currentStatus = getPaymentStatus(idLead)
    const nextStatus = currentStatus === "RECEBIDO" ? "A_RECEBER" : "RECEBIDO"
    await handlePaymentStatusChange(idLead, nextStatus)
  }

  const handlePjPaidToggle = async (idLead: string) => {
    const proposal = proposals.find(p => p.id_lead === idLead)
    if (!proposal) return

    const currentPjPaid = !!pjPaidProposalIds[idLead]
    const newPjPaid = !currentPjPaid
    const pjPaidDate = newPjPaid ? new Date().toISOString() : undefined

    setPjPaidProposalIds(prev => ({ ...prev, [idLead]: newPjPaid }))

    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("receber_pj_paid_ids")
      const parsed = stored ? JSON.parse(stored) : {}
      parsed[idLead] = newPjPaid
      window.localStorage.setItem("receber_pj_paid_ids", JSON.stringify(parsed))
    }

    try {
      const currentObs = proposal.observacoes || ""
      const { notes, metadata } = parseProposalNotesAndMetadata(currentObs)
      const newMetadata: FinanceMetadata = {
        ...metadata,
        pjPaid: newPjPaid,
        pjPaidDate: pjPaidDate
      }
      const newObs = buildProposalNotesAndMetadata(notes, newMetadata)

      const { error } = await supabase
        .from("propostas")
        .update({
          observacoes: newObs,
          updated_at: new Date().toISOString()
        })
        .eq("id_lead", idLead)

      if (error) {
        console.error("Erro ao salvar status de pagamento PJ:", error.message)
        toast.error("Erro ao sincronizar pagamento PJ com o servidor.")
      } else {
        setProposals(prev => prev.map(p => p.id_lead === idLead ? {
          ...p,
          observacoes: newObs
        } : p))
        toast.success(newPjPaid ? "Marcado como PAGUEI PJ!" : "Marcado como PAGAR PJ!")
      }
    } catch (err) {
      console.error("Erro ao atualizar pagamento PJ:", err)
      toast.error("Falha ao atualizar pagamento PJ.")
    }
  }

  const handleCommissionPercentChange = async (idLead: string, value: number | undefined) => {
    // 1. Local storage state sync
    setCustomCommissionPercents(prev => {
      const updated = { ...prev }
      if (value === undefined || isNaN(value)) {
        delete updated[idLead]
      } else {
        updated[idLead] = value
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("receber_custom_commission_percents", JSON.stringify(updated))
      }
      return updated
    })

    // 2. Persist to Supabase Database
    try {
      const proposal = proposals.find(p => p.id_lead === idLead)
      if (proposal) {
        const valOp = (proposal.valor_operacao || proposal.valor_cliente || proposal.valor_cliente_operacional || proposal.valor_base || proposal.valor_parcela || 0)
        const dbValue = value !== undefined && !isNaN(value) ? value : null
        const dbValor = dbValue !== null ? (valOp * dbValue) / 100 : null

        const { error } = await supabase
          .from("propostas")
          .update({
            comissao_banco_porcentagem: dbValue,
            comissao_banco_valor: dbValor
          })
          .eq("id_lead", idLead)

        if (error) {
          console.error("Erro ao salvar comissão no banco de dados:", error.message)
        } else {
          // Update local proposal items state to reflect saved commission fields
          setProposals(prev => prev.map(p => p.id_lead === idLead ? {
            ...p,
            comissao_banco_porcentagem: dbValue,
            comissao_banco_valor: dbValor
          } : p))
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar comissão no banco:", err)
    }
  }

  const handleOperationValueChange = async (idLead: string, value: number | undefined) => {
    try {
      const proposal = proposals.find(p => p.id_lead === idLead)
      if (proposal) {
        const dbValue = value !== undefined && !isNaN(value) ? value : null
        
        const comPercent = customCommissionPercents[idLead] !== undefined 
          ? customCommissionPercents[idLead] 
          : getCommissionPercentage(proposal)
        const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(comPercent) ? comPercent : 0
        const dbValor = dbValue !== null ? (dbValue * comPercentVal) / 100 : null

        const { error } = await supabase
          .from("propostas")
          .update({
            valor_operacao: dbValue,
            comissao_banco_valor: dbValor
          })
          .eq("id_lead", idLead)

        if (error) {
          console.error("Erro ao salvar valor_operacao no banco de dados:", error.message)
          toast.error("Erro ao salvar alteração no banco de dados.")
        } else {
          setProposals(prev => prev.map(p => p.id_lead === idLead ? {
            ...p,
            valor_operacao: dbValue === null ? undefined : dbValue,
            comissao_banco_valor: dbValor
          } : p))
          toast.success("Valor da operação atualizado com sucesso!")
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar valor_operacao:", err)
    }
  }

  const handleCommissionValueChange = async (idLead: string, value: number | undefined) => {
    try {
      const proposal = proposals.find(p => p.id_lead === idLead)
      if (proposal) {
        const dbValor = value !== undefined && !isNaN(value) ? value : null
        
        const valOp = (proposal.valor_operacao || proposal.valor_cliente || proposal.valor_cliente_operacional || proposal.valor_base || proposal.valor_parcela || 0)
        let dbPercent: number | null = null
        if (dbValor !== null && valOp > 0) {
          dbPercent = (dbValor / valOp) * 100
          dbPercent = Math.round(dbPercent * 10000) / 10000
        }

        const { error } = await supabase
          .from("propostas")
          .update({
            comissao_banco_valor: dbValor,
            comissao_banco_porcentagem: dbPercent
          })
          .eq("id_lead", idLead)

        if (error) {
          console.error("Erro ao salvar comissao_banco_valor no banco de dados:", error.message)
          toast.error("Erro ao salvar alteração no banco de dados.")
        } else {
          if (dbPercent !== null) {
            setCustomCommissionPercents(prev => {
              const updated = { ...prev, [idLead]: dbPercent! }
              if (typeof window !== "undefined") {
                window.localStorage.setItem("receber_custom_commission_percents", JSON.stringify(updated))
              }
              return updated
            })
          }

          setProposals(prev => prev.map(p => p.id_lead === idLead ? {
            ...p,
            comissao_banco_valor: dbValor,
            comissao_banco_porcentagem: dbPercent
          } : p))
          toast.success("Valor da comissão atualizado com sucesso!")
        }
      }
    } catch (err) {
      console.error("Erro ao atualizar comissao_banco_valor:", err)
    }
  }
  
  // Selected detail view
  const [selectedProposalDetail, setSelectedProposalDetail] = useState<Proposal | null>(null)
  const [tempNotes, setTempNotes] = useState("")
  const [isNotesSaving, setIsNotesSaving] = useState(false)

  // Status Modal controls for Contas a Receber
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [statusTargetProposal, setStatusTargetProposal] = useState<Proposal | null>(null)
  const [selectedNewStatus, setSelectedNewStatus] = useState("")
  const [statusAde, setStatusAde] = useState("")
  const [statusObsOperacional, setObsOperacional] = useState("")

  const getCommissionPercentage = useCallback((proposal: Proposal) => {
    if (proposal.comissao_banco_porcentagem !== undefined && proposal.comissao_banco_porcentagem !== null) {
      return Number(proposal.comissao_banco_porcentagem);
    }

    if (!proposal.coeficiente_prazo || dbProdutosConfigs.length === 0) {
      return undefined;
    }

    // Helper to safely parse strings/numbers as percentage
    const parsePercent = (val: string | number | null | undefined) => {
      if (val === undefined || val === null || val === "") return undefined;
      const parsed = typeof val === "string" ? parseFloat(val.replace(",", ".")) : parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    }

    // Extract term from label (e.g., "SIAPE (96x | 0.02324)" -> 96, or "SIAPE - 96x 0.02324" -> 96)
    const extractPrazoNum = (label: string | null | undefined): number | null => {
      if (!label) return null;
      const match = label.match(/(\d+)\s*x/i);
      if (match) return parseInt(match[1], 10);
      const genericMatch = label.match(/\((\d{1,3})\s*\|/);
      if (genericMatch) return parseInt(genericMatch[1], 10);
      return null;
    }

    // Extract coefficient from label (e.g., "SIAPE (96x | 0.02103)" -> 0.02103, or "96x 0.02103" -> 0.02103)
    const extractCoeficienteNum = (label: string | null | undefined): number | null => {
      if (!label) return null;
      const match = label.match(/x\s*[| ]\s*([0-9]+[.,][0-9]+)/i);
      if (match) return parseFloat(match[1].replace(',', '.'));
      const genericMatch = label.match(/(0[.,][0-9]{2,})/);
      if (genericMatch) return parseFloat(genericMatch[0].replace(',', '.'));
      return null;
    }

    // Extract table name portion from coefficient text
    let parsedTableName = "";
    const cpStr = proposal.coeficiente_prazo.trim();
    if (cpStr.includes('(')) {
      parsedTableName = cpStr.split('(')[0].trim();
    } else if (cpStr.includes('-')) {
      parsedTableName = cpStr.split('-')[0].trim();
    } else {
      parsedTableName = cpStr;
    }

    const normalizeStr = (s: string | null | undefined) => {
      if (!s) return "";
      return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove accents
        .replace(/[^a-z0-9]/g, "")      // remove non-alphanumeric
        .trim();
    }

    const normParsedName = normalizeStr(parsedTableName);
    const parsedPrazo = extractPrazoNum(proposal.coeficiente_prazo);
    const parsedCoef = extractCoeficienteNum(proposal.coeficiente_prazo);
    const normProposalBanco = normalizeStr(proposal.banco);

    const allOptions = dbProdutosConfigs.flatMap(config => {
      const getConvenioName = () => {
        if (!config.convenios) return undefined;
        if (Array.isArray(config.convenios)) return config.convenios[0]?.nome;
        return (config.convenios as unknown as { nome: string }).nome;
      }
      const convNome = getConvenioName();

      const foundBanco = config.banco_id && bancosList.length > 0 
        ? bancosList.find(b => b.id === config.banco_id) 
        : null;
      const bancoNome = foundBanco?.nome;

      if (config.regras && config.regras.length > 0) {
        return config.regras
          .filter((r: { ativo?: boolean }) => r.ativo !== false)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((regra: any) => ({
            nome_tabela: config.nome_tabela,
            prazo: typeof regra.prazo === 'string' ? parseInt(regra.prazo, 10) : regra.prazo,
            coeficiente: typeof regra.coeficiente === 'string' ? parseFloat(regra.coeficiente.replace(',', '.')) : regra.coeficiente,
            percentual_producao: parsePercent(regra.percentual_producao),
            percentual_comissao: parsePercent(regra.percentual_comissao),
            convenioNome: convNome,
            bancoNome: bancoNome,
            banco_id: config.banco_id
          }));
      }
      return [{
        nome_tabela: config.nome_tabela,
        prazo: typeof config.prazo === 'string' ? parseInt(config.prazo, 10) : (config.prazo || 0),
        coeficiente: typeof config.coeficiente === 'string' ? parseFloat(config.coeficiente.replace(',', '.')) : (config.coeficiente || 0),
        percentual_producao: parsePercent(config.percentual_producao),
        percentual_comissao: parsePercent(config.percentual_comissao),
        convenioNome: convNome,
        bancoNome: bancoNome,
        banco_id: config.banco_id
      }];
    });

    let bestMatch: typeof allOptions[0] | null = null;
    let highestScore = -1;

    for (const opt of allOptions) {
      // STRICT REQUIREMENT: The table's bank MUST match the proposal's bank
      const normOptBanco = normalizeStr(opt.bancoNome);
      const matchesBanco = normProposalBanco && normOptBanco && (
        normProposalBanco === normOptBanco ||
        normProposalBanco.includes(normOptBanco) ||
        normOptBanco.includes(normProposalBanco)
      );

      if (!matchesBanco) {
        continue;
      }

      let score = 0;

      // 1. Math matching (numerical metrics are precise and immune to string formatting)
      const matchesPrazo = parsedPrazo !== null && opt.prazo === parsedPrazo;
      const matchesCoef = parsedCoef !== null && opt.coeficiente !== null && Math.abs(opt.coeficiente - parsedCoef) < 0.0001;

      if (matchesPrazo && matchesCoef) {
        score += 150; // Huge reward for matching exact rule numbers (physical characteristics)
      } else if (matchesPrazo) {
        score += 15;
      } else if (matchesCoef) {
        score += 15;
      }

      // 2. Name matching
      const optName = opt.nome_tabela || opt.convenioNome || "";
      const normOptName = normalizeStr(optName);

      if (normParsedName && normOptName) {
        if (normOptName === normParsedName) {
          score += 100; // Exact name match
        } else if (normParsedName.startsWith(normOptName) || normOptName.startsWith(normParsedName)) {
          score += 60; // Prefix or containment
        } else {
          // Check overlapping alphabetic words
          const wordsParsed = normParsedName.split(/\s+/).filter(w => w.length > 2);
          const wordsOpt = normOptName.split(/\s+/).filter(w => w.length > 2);
          let matchCount = 0;
          for (const wp of wordsParsed) {
            if (wordsOpt.includes(wp)) matchCount++;
          }
          score += matchCount * 15;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = opt;
      }
    }

    // If we have a decent match, return its commission rate
    if (bestMatch && highestScore >= 15 && bestMatch.percentual_comissao !== undefined) {
      return bestMatch.percentual_comissao;
    }

    // Fallback: try direct text matching of constructed labels as built in options list
    const exactClean = allOptions.find(opt => {
      // STRICT REQUIREMENT: The table's bank MUST match the proposal's bank
      const normOptBanco = normalizeStr(opt.bancoNome);
      const matchesBanco = normProposalBanco && normOptBanco && (
        normProposalBanco === normOptBanco ||
        normProposalBanco.includes(normOptBanco) ||
        normOptBanco.includes(normProposalBanco)
      );

      if (!matchesBanco) return false;

      const labelTextDot = opt.nome_tabela 
        ? `${opt.nome_tabela} (${opt.prazo}x | ${opt.coeficiente})`
        : `${opt.convenioNome || 'Tabela'} - ${opt.prazo}x ${opt.coeficiente}`;

      const labelTextComma = opt.nome_tabela 
        ? `${opt.nome_tabela} (${opt.prazo}x | ${opt.coeficiente.toString().replace('.', ',')})`
        : `${opt.convenioNome || 'Tabela'} - ${opt.prazo}x ${opt.coeficiente.toString().replace('.', ',')}`;

      const cleanLabel = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
      const cpClean = cleanLabel(proposal.coeficiente_prazo);
      return cleanLabel(labelTextDot) === cpClean || cleanLabel(labelTextComma) === cpClean;
    });

    if (exactClean && exactClean.percentual_comissao !== undefined) {
      return exactClean.percentual_comissao;
    }

    return undefined;
  }, [dbProdutosConfigs, bancosList])

  const isPJProposal = useCallback((proposal: Proposal) => {
    // Check direct proposal fields
    const rawRegime = String((proposal as any).regime_contratacao || (proposal as any).corretor_regime || (proposal as any).origem || "").toUpperCase()
    if (rawRegime.includes("PJ")) return true

    // Check corretor_id and corretor in pjUsersMap
    if (proposal.corretor_id && (pjUsersMap.has(String(proposal.corretor_id)) || pjUsersMap.has(String(proposal.corretor_id).toLowerCase()))) return true
    if (proposal.corretor && (pjUsersMap.has(String(proposal.corretor)) || pjUsersMap.has(String(proposal.corretor).toLowerCase()))) return true

    const rawName = proposal.nome_corretor || proposal.corretor || ""
    if (!rawName) return false
    
    const lowerName = rawName.toLowerCase().trim()
    if (lowerName.includes("pj")) return true

    const normCorretorName = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    if (!normCorretorName) return false

    if (pjUserNames.has(lowerName) || pjUserNames.has(normCorretorName)) return true

    for (const pjName of Array.from(pjUserNames)) {
      if (pjName && pjName.length >= 3 && (normCorretorName.includes(pjName) || pjName.includes(normCorretorName))) {
        return true
      }
    }

    return false
  }, [pjUsersMap, pjUserNames])

  const getPJCommissionPercentage = useCallback((proposal: Proposal) => {
    if (!proposal.coeficiente_prazo || dbProdutosConfigs.length === 0) {
      return undefined;
    }

    const parsePercent = (val: string | number | null | undefined) => {
      if (val === undefined || val === null || val === "") return undefined;
      const parsed = typeof val === "string" ? parseFloat(val.replace(",", ".")) : parseFloat(val);
      return isNaN(parsed) ? undefined : parsed;
    }

    const extractPrazoNum = (label: string | null | undefined): number | null => {
      if (!label) return null;
      const match = label.match(/(\d+)\s*x/i);
      if (match) return parseInt(match[1], 10);
      const genericMatch = label.match(/\((\d{1,3})\s*\|/);
      if (genericMatch) return parseInt(genericMatch[1], 10);
      return null;
    }

    const extractCoeficienteNum = (label: string | null | undefined): number | null => {
      if (!label) return null;
      const match = label.match(/x\s*[| ]\s*([0-9]+[.,][0-9]+)/i);
      if (match) return parseFloat(match[1].replace(',', '.'));
      const genericMatch = label.match(/(0[.,][0-9]{2,})/);
      if (genericMatch) return parseFloat(genericMatch[0].replace(',', '.'));
      return null;
    }

    let parsedTableName = "";
    const cpStr = proposal.coeficiente_prazo.trim();
    if (cpStr.includes('(')) {
      parsedTableName = cpStr.split('(')[0].trim();
    } else if (cpStr.includes('-')) {
      parsedTableName = cpStr.split('-')[0].trim();
    } else {
      parsedTableName = cpStr;
    }

    const normalizeStr = (s: string | null | undefined) => {
      if (!s) return "";
      return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").trim();
    }

    const normParsedName = normalizeStr(parsedTableName);
    const parsedPrazo = extractPrazoNum(proposal.coeficiente_prazo);
    const parsedCoef = extractCoeficienteNum(proposal.coeficiente_prazo);
    const normProposalBanco = normalizeStr(proposal.banco);

    const allOptions = dbProdutosConfigs.flatMap(config => {
      const getConvenioName = () => {
        if (!config.convenios) return undefined;
        if (Array.isArray(config.convenios)) return config.convenios[0]?.nome;
        return (config.convenios as unknown as { nome: string }).nome;
      }
      const convNome = getConvenioName();
      const foundBanco = config.banco_id && bancosList.length > 0 
        ? bancosList.find((b: any) => b.id === config.banco_id) 
        : null;
      const bancoNome = foundBanco?.nome;

      if (config.regras && config.regras.length > 0) {
        return config.regras
          .filter((r: { ativo?: boolean }) => r.ativo !== false)
          .map((regra: any) => ({
            nome_tabela: config.nome_tabela,
            prazo: typeof regra.prazo === 'string' ? parseInt(regra.prazo, 10) : regra.prazo,
            coeficiente: typeof regra.coeficiente === 'string' ? parseFloat(regra.coeficiente.replace(',', '.')) : regra.coeficiente,
            percentual_producao: parsePercent(regra.percentual_producao),
            percentual_comissao: parsePercent(regra.percentual_comissao),
            convenioNome: convNome,
            bancoNome: bancoNome,
            banco_id: config.banco_id
          }));
      }
      return [{
        nome_tabela: config.nome_tabela,
        prazo: typeof config.prazo === 'string' ? parseInt(config.prazo, 10) : (config.prazo || 0),
        coeficiente: typeof config.coeficiente === 'string' ? parseFloat(config.coeficiente.replace(',', '.')) : (config.coeficiente || 0),
        percentual_producao: parsePercent(config.percentual_producao),
        percentual_comissao: parsePercent(config.percentual_comissao),
        convenioNome: convNome,
        bancoNome: bancoNome,
        banco_id: config.banco_id
      }];
    });

    let bestMatch: typeof allOptions[0] | null = null;
    let highestScore = -1;

    for (const opt of allOptions) {
      const normOptBanco = normalizeStr(opt.bancoNome);
      const matchesBanco = normProposalBanco && normOptBanco && (
        normProposalBanco === normOptBanco ||
        normProposalBanco.includes(normOptBanco) ||
        normOptBanco.includes(normProposalBanco)
      );
      if (!matchesBanco) continue;

      let score = 0;
      const matchesPrazo = parsedPrazo !== null && opt.prazo === parsedPrazo;
      const matchesCoef = parsedCoef !== null && opt.coeficiente !== null && Math.abs(opt.coeficiente - parsedCoef) < 0.0001;

      if (matchesPrazo && matchesCoef) {
        score += 150;
      } else if (matchesPrazo) {
        score += 15;
      } else if (matchesCoef) {
        score += 15;
      }

      const optName = opt.nome_tabela || opt.convenioNome || "";
      const normOptName = normalizeStr(optName);

      if (normParsedName && normOptName) {
        if (normOptName === normParsedName) {
          score += 100;
        } else if (normParsedName.startsWith(normOptName) || normOptName.startsWith(normParsedName)) {
          score += 60;
        } else {
          const wordsParsed = normParsedName.split(/\s+/).filter(w => w.length > 2);
          const wordsOpt = normOptName.split(/\s+/).filter(w => w.length > 2);
          let matchCount = 0;
          for (const wp of wordsParsed) {
            if (wordsOpt.includes(wp)) matchCount++;
          }
          score += matchCount * 15;
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = opt;
      }
    }

    if (bestMatch && highestScore >= 15 && bestMatch.percentual_producao !== undefined) {
      return bestMatch.percentual_producao;
    }

    const exactClean = allOptions.find(opt => {
      const normOptBanco = normalizeStr(opt.bancoNome);
      const matchesBanco = normProposalBanco && normOptBanco && (
        normProposalBanco === normOptBanco ||
        normProposalBanco.includes(normOptBanco) ||
        normOptBanco.includes(normProposalBanco)
      );
      if (!matchesBanco) return false;

      const labelTextDot = opt.nome_tabela 
        ? `${opt.nome_tabela} (${opt.prazo}x | ${opt.coeficiente})`
        : `${opt.convenioNome || 'Tabela'} - ${opt.prazo}x ${opt.coeficiente}`;

      const labelTextComma = opt.nome_tabela 
        ? `${opt.nome_tabela} (${opt.prazo}x | ${opt.coeficiente.toString().replace('.', ',')})`
        : `${opt.convenioNome || 'Tabela'} - ${opt.prazo}x ${opt.coeficiente.toString().replace('.', ',')}`;

      const cleanLabel = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
      const cpClean = cleanLabel(proposal.coeficiente_prazo);
      return cleanLabel(labelTextDot) === cpClean || cleanLabel(labelTextComma) === cpClean;
    });

    if (exactClean && exactClean.percentual_producao !== undefined) {
      return exactClean.percentual_producao;
    }

    return undefined;
  }, [dbProdutosConfigs, bancosList]);

  const getPJCommissionValue = useCallback((proposal: Proposal) => {
    const valOp = safeFloat(proposal.valor_operacao || proposal.valor_cliente || proposal.valor_cliente_operacional || proposal.valor_base || proposal.valor_parcela || 0)

    if (proposal.valor_producao && Number(proposal.valor_producao) > 0) {
      return Number(proposal.valor_producao)
    }

    const pjPercent = getPJCommissionPercentage(proposal)
    if (pjPercent !== undefined && !isNaN(pjPercent)) {
      return (valOp * pjPercent) / 100
    }

    const comPercent = customCommissionPercents[proposal.id_lead] !== undefined 
      ? customCommissionPercents[proposal.id_lead] 
      : getCommissionPercentage(proposal)
    const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(Number(comPercent)) ? Number(comPercent) : 0
    return (valOp * comPercentVal) / 100
  }, [customCommissionPercents, getCommissionPercentage, getPJCommissionPercentage])

  const fetchProposals = async () => {
    setIsLoading(true)
    try {
      // Query proposals in 'PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA', 'PÓS-VENDA REALIZADA', 'PAGAMENTO DEVOLVIDO' and 'CANCELADO'
      const { data, error } = await supabase
        .from("propostas")
        .select("*")
        .in("status", ["PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA", "PÓS-VENDA REALIZADA", "PAGAMENTO DEVOLVIDO", "CANCELADO"])
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Erro Supabase:", error.message)
        toast.error("Erro ao conectar com o banco de dados das propostas.")
        setIsLoading(false)
        return
      }

      // Fetch product configs to match commission percentages
      try {
        let configsData = null
        let configsErr = null
        
        const resQuery = await supabase
          .from('produtos_config')
          .select(`
            id,
            nome_tabela,
            prazo,
            coeficiente,
            percentual_producao,
            percentual_comissao,
            convenio_id,
            banco_id,
            regras,
            ativo,
            convenios (nome)
          `)
        configsData = resQuery.data
        configsErr = resQuery.error

        if (configsErr) {
          console.warn("Retrying fetch with select('*') fallback because of relation error:", configsErr.message)
          const fallbackRes = await supabase
            .from('produtos_config')
            .select('*')
          configsData = fallbackRes.data
          configsErr = fallbackRes.error
        }

        if (!configsErr && configsData) {
          setDbProdutosConfigs(configsData)
        }

        // Fetch all banks to map bank_id to bank name
        try {
          const { data: bancosData, error: bancosErr } = await supabase
            .from('bancos')
            .select('id, nome')
          if (!bancosErr && bancosData) {
            setBancosList(bancosData)
          }
        } catch (errBancos) {
          console.error("Erro ao buscar bancos para contas a receber:", errBancos)
        }
      } catch (errConfig) {
        console.error("Erro ao buscar tabelas de regras:", errConfig)
      }

      if (!data || data.length === 0) {
        setProposals([])
        setIsLoading(false)
        return
      }

      // Fetch users list to map missing names
      interface UserSummary {
        id: string
        nome: string
        supervisor_nome?: string
      }
      
      const usersMap = new Map<string, { nome: string, equipe: string }>()
      try {
        const usersResponse = await fetch("/api/usuarios")
        if (usersResponse.ok) {
          const usersList: UserSummary[] = await usersResponse.json()
          usersList.forEach((u) => {
            usersMap.set(u.id, {
              nome: u.nome || "-",
              equipe: u.supervisor_nome || "-"
            })
          })
        }
      } catch (err) {
        console.warn("Erro ao buscar usuários para mapeamento do Financeiro:", err)
      }

      // Read localStorage directly to ensure we have the absolute latest and correct data for sync
      let localReceivedIds: Record<string, boolean> = {}
      let localReceivedDates: Record<string, string> = {}
      let localPaymentStatuses: Record<string, "A_RECEBER" | "RECEBIDO" | "ESTORNADO"> = {}
      let localPjPaidIds: Record<string, boolean> = {}
      if (typeof window !== "undefined") {
        try {
          const stored = window.localStorage.getItem("receber_pago_status_ids")
          if (stored) localReceivedIds = JSON.parse(stored)
          const storedDates = window.localStorage.getItem("receber_pago_dates")
          if (storedDates) localReceivedDates = JSON.parse(storedDates)
          const storedPS = window.localStorage.getItem("receber_payment_statuses")
          if (storedPS) localPaymentStatuses = JSON.parse(storedPS)
          const storedPjPaid = window.localStorage.getItem("receber_pj_paid_ids")
          if (storedPjPaid) localPjPaidIds = JSON.parse(storedPjPaid)
        } catch (e) {
          console.error("Erro ao carregar local storage para sincronização:", e)
        }
      }

      const finalPaymentStatuses: Record<string, "A_RECEBER" | "RECEBIDO" | "ESTORNADO"> = {}
      const finalReceivedIds: Record<string, boolean> = {}
      const finalReceivedDates: Record<string, string> = {}
      const finalPjPaidIds: Record<string, boolean> = {}

      const formattedData = data
        .filter((p: Proposal) => {
          if (p.status === "CANCELADO") {
            const { metadata } = parseProposalNotesAndMetadata(p.observacoes)
            const isEstornado = metadata.paymentStatus === "ESTORNADO" || localPaymentStatuses[p.id_lead] === "ESTORNADO"
            return isEstornado
          }
          return true
        })
        .map((p: Proposal) => {
          const userDetails = p.corretor_id ? usersMap.get(p.corretor_id) : null
          
          let finalEquipe = p.equipe
          if (!finalEquipe || finalEquipe === "-" || finalEquipe === "Não informado") {
            finalEquipe = userDetails?.equipe || "-"
          }

          const { notes, metadata } = parseProposalNotesAndMetadata(p.observacoes)
          let updatedObs = p.observacoes

          const effectiveStatus: "A_RECEBER" | "RECEBIDO" | "ESTORNADO" = 
            metadata.paymentStatus || 
            (metadata.received !== undefined ? (metadata.received ? "RECEBIDO" : "A_RECEBER") : undefined) ||
            localPaymentStatuses[p.id_lead] ||
            (localReceivedIds[p.id_lead] ? "RECEBIDO" : "A_RECEBER")

          finalPaymentStatuses[p.id_lead] = effectiveStatus
          finalReceivedIds[p.id_lead] = effectiveStatus === "RECEBIDO"

          const isPjPaid = metadata.pjPaid !== undefined ? metadata.pjPaid : !!localPjPaidIds[p.id_lead]
          finalPjPaidIds[p.id_lead] = isPjPaid

          if (metadata.receivedDate) {
            finalReceivedDates[p.id_lead] = metadata.receivedDate
          } else if (localReceivedDates[p.id_lead]) {
            finalReceivedDates[p.id_lead] = localReceivedDates[p.id_lead]
          }

          if (!metadata.paymentStatus && metadata.received === undefined) {
            const isLocalReceived = !!localReceivedIds[p.id_lead]
            if (isLocalReceived) {
              const localDate = localReceivedDates[p.id_lead] || new Date().toISOString()
              const newObs = buildProposalNotesAndMetadata(p.observacoes || "", {
                received: true,
                paymentStatus: "RECEBIDO",
                receivedDate: localDate
              })
              
              supabase
                .from("propostas")
                .update({
                  observacoes: newObs,
                  updated_at: new Date().toISOString()
                })
                .eq("id_lead", p.id_lead)
                .then(({ error }) => {
                  if (error) {
                    console.error(`Erro ao sincronizar proposta ${p.id_lead}:`, error.message)
                  }
                })

              updatedObs = newObs
            }
          }

          return {
            ...p,
            observacoes: updatedObs,
            nome_corretor: p.corretor || userDetails?.nome || "-",
            equipe: finalEquipe
          }
        })

      setPaymentStatuses(finalPaymentStatuses)
      setReceivedProposalIds(finalReceivedIds)
      setReceivedProposalDates(finalReceivedDates)
      setPjPaidProposalIds(finalPjPaidIds)
      setProposals(formattedData)
    } catch (err) {
      console.error("Erro geral contas a receber:", err)
      toast.error("Falha ao carregar propostas a receber.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [])

  // Quick action to change status directly from here
  const openStatusModal = (proposal: Proposal) => {
    setStatusTargetProposal(proposal)
    setSelectedNewStatus(proposal.status)
    setStatusAde(proposal.ade || "")
    setObsOperacional(proposal.obs_operacional || "")
    setIsStatusModalOpen(true)
  }

  const handleStatusUpdate = async () => {
    if (!statusTargetProposal || !perfil) return
    setIsUpdatingStatus(statusTargetProposal.id_lead)
    const loadingToast = toast.loading("Atualizando status da proposta...")

    try {
      const isoDate = new Date().toISOString()
      const updateData: Record<string, string | number | null | undefined> = {
        status: selectedNewStatus,
        updated_at: isoDate,
        ade: statusAde,
        obs_operacional: statusObsOperacional
      }

      const { error: updateError } = await supabase
        .from("propostas")
        .update(updateData)
        .eq("id_lead", statusTargetProposal.id_lead)

      if (updateError) throw updateError

      // Historic entry
      try {
        await supabase.from("historico_propostas").insert({
          proposta_id_lead: statusTargetProposal.id_lead,
          usuario_id: perfil.id,
          status_anterior: statusTargetProposal.status,
          status_novo: selectedNewStatus,
          observacoes: `Financeiro Alteração: ADE: ${statusAde} | Obs: ${statusObsOperacional}`,
          descricao: `Financeiro alterou status de "${statusTargetProposal.status}" para "${selectedNewStatus}"`,
          tipo: "alteracao_status",
          created_at: isoDate
        })
      } catch (histErr) {
        console.warn("Erro ao preencher log de alteração:", histErr)
      }

      toast.success("Status atualizado com sucesso!", { id: loadingToast })
      setIsStatusModalOpen(false)
      fetchProposals()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Erro ao atualizar status:", err)
      toast.error(`Falha ao alterar status: ${err.message || err}`, { id: loadingToast })
    } finally {
      setIsUpdatingStatus(null)
    }
  }

  // Save financial note
  const saveProposalNotes = async (proposal: Proposal) => {
    setIsNotesSaving(true)
    try {
      const { metadata } = parseProposalNotesAndMetadata(proposal.observacoes)
      const mergedObs = buildProposalNotesAndMetadata(tempNotes, metadata)

      const { error } = await supabase
        .from("propostas")
        .update({
          observacoes: mergedObs,
          updated_at: new Date().toISOString()
        })
        .eq("id_lead", proposal.id_lead)

      if (error) throw error

      toast.success("Notas atualizadas no sistema!")
      setProposals(prev => prev.map(p => p.id_lead === proposal.id_lead ? { ...p, observacoes: mergedObs } : p))
      if (selectedProposalDetail?.id_lead === proposal.id_lead) {
        setSelectedProposalDetail(prev => prev ? { ...prev, observacoes: mergedObs } : null)
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Erro ao salvar observação:", err)
      toast.error("Não foi possível salvar a observação.")
    } finally {
      setIsNotesSaving(false)
    }
  }

  // Clean-up searches
  const handleClearFilters = () => {
    setSearchTerm("")
    setSelectedStatusFilter("TODOS")
    setSelectedBankFilter("TODOS")
    setSelectedConvenioFilter("TODOS")
    setSelectedPjPartnerFilter("TODOS")
    setStartDate("")
    setEndDate("")
    setReceivedFilter("TODOS")
    setMinValorOperacao("")
    setMaxValorOperacao("")
    setMinComissaoPercent("")
    setMaxComissaoPercent("")
    setMinComissaoValor("")
    setMaxComissaoValor("")
    toast.success("Filtros limpos.")
  }

  // Unique list of banks, covenants and PJ partners present for quick dropdowns
  const availableBanks = Array.from(new Set(proposals.map(p => p.banco).filter(Boolean)))
  const availableConvenios = Array.from(new Set(proposals.map(p => p.convenio).filter(Boolean)))
  const availablePjPartners = Array.from(
    new Set(
      proposals
        .filter(p => isPJProposal(p))
        .map(p => (p.nome_corretor || p.corretor || "").trim())
        .filter(name => name && name !== "-")
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"))

  // Filtering Logic - Base filters
  const baseFilteredProposals = proposals.filter((proposal) => {
    const cleanSearch = searchTerm.toLowerCase().replace(/\D/g, "")
    const cleanCpf = (proposal.cliente_cpf || "").replace(/\D/g, "")

    const matchesSearch = 
      (proposal.id_lead?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (proposal.ade?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (proposal.nome_cliente?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (proposal.cliente_cpf?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (cleanSearch !== "" && cleanCpf.includes(cleanSearch)) ||
      (proposal.nome_corretor?.toLowerCase() || "").includes(searchTerm.toLowerCase())

    const matchesStatus = selectedStatusFilter === "TODOS" || proposal.status === selectedStatusFilter
    const matchesBank = selectedBankFilter === "TODOS" || proposal.banco === selectedBankFilter
    const matchesConvenio = selectedConvenioFilter === "TODOS" || proposal.convenio === selectedConvenioFilter

    const matchesPjPartner = (() => {
      if (selectedPjPartnerFilter === "TODOS") return true
      if (!isPJProposal(proposal)) return false
      const corretorName = (proposal.nome_corretor || proposal.corretor || "").trim().toLowerCase()
      const filterName = selectedPjPartnerFilter.trim().toLowerCase()
      return corretorName === filterName || corretorName.includes(filterName)
    })()

    const matchesDate = (() => {
      if (!startDate && !endDate) return true
      
      const isReceived = !!receivedProposalIds[proposal.id_lead]
      const receivedDate = receivedProposalDates[proposal.id_lead]
      
      const compareDate = (isReceived && receivedDate)
        ? receivedDate
        : (proposal.data_pago_cliente || proposal.updated_at || proposal.created_at)

      if (!compareDate) return true
      
      try {
        const pDate = new Date(compareDate)
        if (isNaN(pDate.getTime())) return true
        const formattedCompare = format(pDate, "yyyy-MM-dd")
        
        if (startDate && formattedCompare < startDate) return false
        if (endDate && formattedCompare > endDate) return false
      } catch (err) {
        console.error("Erro data filtro:", err)
        return true
      }
      return true
    })()

    // 1. FILTRAR POR 'A RECEBER/RECEBIDO/ESTORNADO'
    const matchesReceived = (() => {
      const currentStatus = getPaymentStatus(proposal.id_lead)
      if (receivedFilter === "TODOS") return true
      if (receivedFilter === "A_RECEBER") return currentStatus === "A_RECEBER"
      if (receivedFilter === "RECEBIDO") return currentStatus === "RECEBIDO"
      if (receivedFilter === "ESTORNADO") return currentStatus === "ESTORNADO"
      return true
    })()

    // 2. VALOR OPERAÇÃO
    const matchesValorOperacao = (() => {
      const val = safeFloat(proposal.valor_operacao || proposal.valor_cliente || proposal.valor_cliente_operacional || proposal.valor_base || proposal.valor_parcela || 0)
      const min = minValorOperacao !== "" ? parseFloat(minValorOperacao) : null
      const max = maxValorOperacao !== "" ? parseFloat(maxValorOperacao) : null
      if (min !== null && val < min) return false
      if (max !== null && val > max) return false
      return true
    })()

    // 3. COMISSÃO (%)
    const matchesComissaoPercent = (() => {
      const comPercent = customCommissionPercents[proposal.id_lead] !== undefined ? customCommissionPercents[proposal.id_lead] : getCommissionPercentage(proposal)
      const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(Number(comPercent)) ? Number(comPercent) : 0
      const min = minComissaoPercent !== "" ? parseFloat(minComissaoPercent) : null
      const max = maxComissaoPercent !== "" ? parseFloat(maxComissaoPercent) : null
      if (min !== null && comPercentVal < min) return false
      if (max !== null && comPercentVal > max) return false
      return true
    })()

    // 4. COMISSÃO ($)
    const matchesComissaoValor = (() => {
      const val = safeFloat(proposal.valor_operacao || proposal.valor_cliente || proposal.valor_cliente_operacional || proposal.valor_base || proposal.valor_parcela || 0)
      const comPercent = customCommissionPercents[proposal.id_lead] !== undefined ? customCommissionPercents[proposal.id_lead] : getCommissionPercentage(proposal)
      const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(Number(comPercent)) ? Number(comPercent) : 0
      const calculatedCommission = (val * comPercentVal) / 100
      const min = minComissaoValor !== "" ? parseFloat(minComissaoValor) : null
      const max = maxComissaoValor !== "" ? parseFloat(maxComissaoValor) : null
      if (min !== null && calculatedCommission < min) return false
      if (max !== null && calculatedCommission > max) return false
      return true
    })()

    return matchesSearch && matchesStatus && matchesBank && matchesConvenio && matchesPjPartner && matchesDate && matchesReceived && matchesValorOperacao && matchesComissaoPercent && matchesComissaoValor
  })

  // Filtered Proposals for Table (Applying Active Card / Folder & Subfolder PJ filters)
  const filteredProposals = baseFilteredProposals.filter(p => {
    // If activeCardFolder specifies status:
    if (activeCardFolder === 'recebida' && getPaymentStatus(p.id_lead) !== 'RECEBIDO') return false
    if (activeCardFolder === 'a_receber' && getPaymentStatus(p.id_lead) !== 'A_RECEBER') return false
    if (activeCardFolder === 'estorno' && getPaymentStatus(p.id_lead) !== 'ESTORNADO') return false
    if (activeCardFolder === 'conta_corrente' && (!isPJProposal(p) || !pjPaidProposalIds[p.id_lead])) return false

    // If Subpasta PJ is selected
    if (showPJSubfolder && !isPJProposal(p)) return false

    return true
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)
  const totalPages = Math.ceil(filteredProposals.length / itemsPerPage)
  const paginatedProposals = filteredProposals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calcs for metrics cards (General / Pasta Pai)
  const totalOperationSum = baseFilteredProposals.reduce((sum, p) => {
    const val = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
    return sum + val
  }, 0)
  
  const estimatedComissions = baseFilteredProposals.reduce((sum, p) => {
    const valOp = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
    const comPercent = customCommissionPercents[p.id_lead] !== undefined ? customCommissionPercents[p.id_lead] : getCommissionPercentage(p)
    const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(Number(comPercent)) ? Number(comPercent) : 0
    return sum + (valOp * comPercentVal) / 100
  }, 0)

  const estornadoComissions = baseFilteredProposals.reduce((sum, p) => {
    if (getPaymentStatus(p.id_lead) !== "ESTORNADO") return sum
    const valOp = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
    const comPercent = customCommissionPercents[p.id_lead] !== undefined ? customCommissionPercents[p.id_lead] : getCommissionPercentage(p)
    const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(Number(comPercent)) ? Number(comPercent) : 0
    return sum + (valOp * comPercentVal) / 100
  }, 0)

  const rawReceivedComissions = baseFilteredProposals.reduce((sum, p) => {
    if (getPaymentStatus(p.id_lead) !== "RECEBIDO") return sum
    const valOp = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
    const comPercent = customCommissionPercents[p.id_lead] !== undefined ? customCommissionPercents[p.id_lead] : getCommissionPercentage(p)
    const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(Number(comPercent)) ? Number(comPercent) : 0
    return sum + (valOp * comPercentVal) / 100
  }, 0)

  const receivedComissions = rawReceivedComissions - estornadoComissions

  const toReceiveComissions = baseFilteredProposals.reduce((sum, p) => {
    if (getPaymentStatus(p.id_lead) !== "A_RECEBER") return sum
    const valOp = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
    const comPercent = customCommissionPercents[p.id_lead] !== undefined ? customCommissionPercents[p.id_lead] : getCommissionPercentage(p)
    const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(Number(comPercent)) ? Number(comPercent) : 0
    return sum + (valOp * comPercentVal) / 100
  }, 0)

  // Calcs for metrics cards (Subpasta Corretores PJ)
  const pjProposals = baseFilteredProposals.filter(p => isPJProposal(p))

  const pjTotalOperationSum = pjProposals.reduce((sum, p) => {
    const val = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
    return sum + val
  }, 0)

  const pjEstimatedComissions = pjProposals.reduce((sum, p) => {
    return sum + getPJCommissionValue(p)
  }, 0)

  const pjEstornadoComissions = pjProposals.reduce((sum, p) => {
    if (getPaymentStatus(p.id_lead) !== "ESTORNADO") return sum
    return sum + getPJCommissionValue(p)
  }, 0)

  const pjRawReceivedComissions = pjProposals.reduce((sum, p) => {
    if (getPaymentStatus(p.id_lead) !== "RECEBIDO") return sum
    return sum + getPJCommissionValue(p)
  }, 0)

  const pjReceivedComissions = pjRawReceivedComissions - pjEstornadoComissions

  const pjToReceiveComissions = pjProposals.reduce((sum, p) => {
    if (getPaymentStatus(p.id_lead) !== "A_RECEBER") return sum
    return sum + getPJCommissionValue(p)
  }, 0)

  const totalPjPaidComissions = baseFilteredProposals.reduce((sum, p) => {
    if (isPJProposal(p) && pjPaidProposalIds[p.id_lead]) {
      return sum + getPJCommissionValue(p)
    }
    return sum
  }, 0)

  const contaCorrenteValue = receivedComissions - totalPjPaidComissions

  // Exports results to excel
  const exportToExcel = async () => {
    if (filteredProposals.length === 0) {
      toast.error("Nenhuma proposta encontrada para exportação.")
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Contas a Receber")

    // Columns format
    worksheet.columns = [
      { header: "ID Lead", key: "id_lead", width: 15 },
      { header: "ADE / Contrato", key: "ade", width: 15 },
      { header: "CPF Cliente", key: "cpf", width: 16 },
      { header: "Nome Cliente", key: "cliente", width: 30 },
      { header: "Corretor", key: "corretor", width: 22 },
      { header: "Equipe", key: "equipe", width: 18 },
      { header: "Banco", key: "banco", width: 15 },
      { header: "Convênio", key: "convenio", width: 15 },
      { header: "Operação", key: "operacao", width: 15 },
      { header: "Valor Operação", key: "valor", width: 18 },
      { header: "Comissão (%)", key: "comissao_pct", width: 15 },
      { header: "Pago em", key: "pago_em", width: 20 },
      { header: "Comissão ($)", key: "comissao_val", width: 18 },
    ]

    // Style headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1E293B" }
      }
      cell.alignment = { vertical: "middle", horizontal: "center" }
    })
    worksheet.getRow(1).height = 26

    filteredProposals.forEach((p) => {
      const val = p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0
      const comPercent = customCommissionPercents[p.id_lead] !== undefined ? customCommissionPercents[p.id_lead] : getCommissionPercentage(p)
      const comPercentVal = comPercent !== undefined && comPercent !== null ? comPercent : 0
      const comVal = (val * comPercentVal) / 100
      const dateStr = p.data_pago_cliente 
        ? format(new Date(p.data_pago_cliente), "dd/MM/yyyy HH:mm") 
        : p.updated_at 
          ? format(new Date(p.updated_at), "dd/MM/yyyy HH:mm") 
          : format(new Date(p.created_at), "dd/MM/yyyy")
      
      const row = worksheet.addRow({
        id_lead: p.id_lead || "-",
        ade: p.ade || "-",
        cpf: p.cliente_cpf || "-",
        cliente: p.nome_cliente || "-",
        corretor: p.nome_corretor || "-",
        equipe: p.equipe || "-",
        banco: p.banco || "-",
        convenio: p.convenio || "-",
        operacao: p.tipo_operacao || "-",
        valor: val,
        comissao_pct: comPercentVal / 100,
        pago_em: dateStr,
        comissao_val: comVal,
      })

      // Number formatting
      row.getCell("valor").numFmt = '"R$"#,##0.00'
      row.getCell("comissao_pct").numFmt = '0.00%'
      row.getCell("comissao_val").numFmt = '"R$"#,##0.00'
    })

    // Auto-fit rows
    worksheet.views = [{ showGridLines: true }]

    setIsLoading(true)
    const toastLoad = toast.loading("Gerando planilha Excel...")
    try {
      const buffer = await workbook.xlsx.writeBuffer()
      const dataBlob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      saveAs(dataBlob, `SharkConsig_Contas_a_Receber_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`)
      toast.success("Excel baixado com sucesso!", { id: toastLoad })
    } catch (err) {
      console.error(err)
      toast.error("Erro ao gerar planilha Excel.", { id: toastLoad })
    } finally {
      setIsLoading(false)
    }
  }

  // Export Extrato de Comissionamento PJ
  const exportExtratoComissionamentoPJ = async () => {
    const pjList = baseFilteredProposals.filter((p) => isPJProposal(p))
    if (pjList.length === 0) {
      toast.error("Nenhuma proposta de Corretor PJ encontrada para o extrato.")
      return
    }

    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet("Extrato Comissionamento PJ")

    worksheet.columns = [
      { header: "Corretor PJ", key: "corretor", width: 28 },
      { header: "CPF / CNPJ Corretor", key: "doc_corretor", width: 22 },
      { header: "Nº Contrato / ADE", key: "contrato", width: 18 },
      { header: "Cliente Averbado", key: "cliente", width: 32 },
      { header: "Valor do Contrato (R$)", key: "valor_contrato", width: 22 },
      { header: "Margem Gerada (R$)", key: "margem", width: 20 },
      { header: "% Comissão PJ", key: "pct_comissao_pj", width: 18 },
      { header: "Comissão PJ (R$)", key: "val_comissao_pj", width: 24 },
      { header: "Descontos / Estornos (R$)", key: "estorno", width: 24 },
      { header: "Status Repasse", key: "status_repasse", width: 18 },
      { header: "Status Operação", key: "status_operacao", width: 28 },
    ]

    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" } }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "B45309" }
      }
      cell.alignment = { vertical: "middle", horizontal: "center" }
    })
    worksheet.getRow(1).height = 28

    pjList.forEach((p) => {
      const valContrato = safeFloat(p.valor_operacao || p.valor_cliente || p.valor_cliente_operacional || p.valor_base || p.valor_parcela || 0)
      const margemGerada = safeFloat((p as any).margem || (p as any).valor_margem || (p as any).margem_liquida || (p as any).margem_livre || 0)
      const pjPercent = getPJCommissionPercentage(p) || 0
      const pjVal = getPJCommissionValue(p)
      const pStatus = getPaymentStatus(p.id_lead)
      const isPjPaid = !!pjPaidProposalIds[p.id_lead]

      const isEstornadoOrCancelled = pStatus === "ESTORNADO" || p.status === "CANCELADO" || p.status === "PAGAMENTO DEVOLVIDO"
      const valorEstorno = isEstornadoOrCancelled ? pjVal : 0

      const docCorretor = getBrokerDocument(p)

      const row = worksheet.addRow({
        corretor: (p.nome_corretor || p.corretor || "-").trim(),
        doc_corretor: docCorretor,
        contrato: p.ade || p.numero_contrato || p.id_lead || "-",
        cliente: (p.nome_cliente || "-").trim(),
        valor_contrato: valContrato,
        margem: margemGerada,
        pct_comissao_pj: pjPercent / 100,
        val_comissao_pj: pjVal,
        estorno: valorEstorno,
        status_repasse: isPjPaid ? "PAGO" : "PENDENTE",
        status_operacao: p.status || "-",
      })

      row.getCell("valor_contrato").numFmt = '"R$"#,##0.00'
      row.getCell("margem").numFmt = '"R$"#,##0.00'
      row.getCell("pct_comissao_pj").numFmt = '0.00%'
      row.getCell("val_comissao_pj").numFmt = '"R$"#,##0.00'
      row.getCell("estorno").numFmt = '"R$"#,##0.00'
    })

    worksheet.views = [{ showGridLines: true }]

    setIsLoading(true)
    const toastLoad = toast.loading("Gerando Extrato de Comissionamento PJ...")
    try {
      const buffer = await workbook.xlsx.writeBuffer()
      const dataBlob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      saveAs(dataBlob, `Extrato_Comissionamento_PJ_${format(new Date(), "yyyy-MM-dd_HHmm")}.xlsx`)
      toast.success("Extrato de Comissionamento PJ baixado com sucesso!", { id: toastLoad })
    } catch (err) {
      console.error(err)
      toast.error("Erro ao gerar extrato de comissionamento.", { id: toastLoad })
    } finally {
      setIsLoading(false)
    }
  }

  const getFolderTitle = (card: CardFolderType) => {
    switch (card) {
      case 'total': return "VALOR DAS OPERAÇÕES"
      case 'comissao': return "COMISSÃO ESTIMADA"
      case 'recebida': return "COMISSÃO RECEBIDA"
      case 'a_receber': return "COMISSÃO A RECEBER"
      case 'estorno': return "ESTORNO"
      case 'conta_corrente': return "CONTA CORRENTE"
      default: return ""
    }
  }

  const getFolderMainLabel = (card: CardFolderType) => {
    switch (card) {
      case 'total': return "Valor das Operações (Todos)"
      case 'comissao': return "Comissão Estimada (Todos)"
      case 'recebida': return "Comissão Recebida (Todos)"
      case 'a_receber': return "Comissão a Receber (Todos)"
      case 'estorno': return "Estorno (Todos)"
      case 'conta_corrente': return "Saldo Conta Corrente (Comissão Recebida - Repasse PJ Pago)"
      default: return ""
    }
  }

  const getFolderMainVal = (card: CardFolderType) => {
    switch (card) {
      case 'total': return totalOperationSum
      case 'comissao': return estimatedComissions
      case 'recebida': return receivedComissions
      case 'a_receber': return toReceiveComissions
      case 'estorno': return estornadoComissions
      case 'conta_corrente': return contaCorrenteValue
      default: return 0
    }
  }

  const getFolderMainCountStr = (card: CardFolderType) => {
    switch (card) {
      case 'total': return `${baseFilteredProposals.length} Contrato(s)`
      case 'comissao': return `${baseFilteredProposals.length} Proposta(s)`
      case 'recebida': return `${baseFilteredProposals.filter(p => getPaymentStatus(p.id_lead) === "RECEBIDO").length} Pago(s)`
      case 'a_receber': return `${baseFilteredProposals.filter(p => getPaymentStatus(p.id_lead) === "A_RECEBER").length} Pendente(s)`
      case 'estorno': return `${baseFilteredProposals.filter(p => getPaymentStatus(p.id_lead) === "ESTORNADO").length} Estornado(s)`
      case 'conta_corrente': return `${baseFilteredProposals.filter(p => isPJProposal(p) && pjPaidProposalIds[p.id_lead]).length} Pago(s) PJ`
      default: return ""
    }
  }

  const getFolderPJLabel = (card: CardFolderType) => {
    switch (card) {
      case 'total': return "Valor das Operações (Somente PJ)"
      case 'comissao': return "Comissão a Repassar para Corretores PJ"
      case 'recebida': return "Comissão Recebida a Repassar para Corretores PJ"
      case 'a_receber': return "Comissão a Receber a Repassar para Corretores PJ"
      case 'estorno': return "Estorno a Repassar para Corretores PJ"
      case 'conta_corrente': return "Total Já Repassado para Corretores PJ"
      default: return ""
    }
  }

  const getFolderPJVal = (card: CardFolderType) => {
    switch (card) {
      case 'total': return pjTotalOperationSum
      case 'comissao': return pjEstimatedComissions
      case 'recebida': return pjReceivedComissions
      case 'a_receber': return pjToReceiveComissions
      case 'estorno': return pjEstornadoComissions
      case 'conta_corrente': return totalPjPaidComissions
      default: return 0
    }
  }

  const getFolderPJCountStr = (card: CardFolderType) => {
    switch (card) {
      case 'total': return `${pjProposals.length} Contrato(s) PJ`
      case 'comissao': return `${pjProposals.length} Proposta(s) PJ`
      case 'recebida': return `${pjProposals.filter(p => getPaymentStatus(p.id_lead) === "RECEBIDO").length} Pago(s) PJ`
      case 'a_receber': return `${pjProposals.filter(p => getPaymentStatus(p.id_lead) === "A_RECEBER").length} Pendente(s) PJ`
      case 'estorno': return `${pjProposals.filter(p => getPaymentStatus(p.id_lead) === "ESTORNADO").length} Estornado(s) PJ`
      case 'conta_corrente': return `${baseFilteredProposals.filter(p => isPJProposal(p) && pjPaidProposalIds[p.id_lead]).length} Pago(s) PJ`
      default: return ""
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header title="CONTAS A RECEBER" />
      
      <main className={cn(
        "flex-1 p-4 lg:p-8 bg-slate-50/50 space-y-8 mx-auto w-full transition-all duration-300",
        isCollapsed ? "max-w-full lg:px-10" : "max-w-[1600px]"
      )}>
        
        {/* Dashboard Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 relative z-10">
          {/* Valor Total Recebível */}
          <Card 
            id="card-total-operacoes" 
            onClick={() => {
              if (activeCardFolder === 'total') {
                setActiveCardFolder(null)
                setShowPJSubfolder(false)
              } else {
                setActiveCardFolder('total')
                setShowPJSubfolder(false)
              }
            }}
            className={cn(
              "card-shadow border h-full relative transition-all cursor-pointer hover:scale-[1.02] bg-white group",
              activeCardFolder === 'total' 
                ? "border-amber-500 ring-2 ring-amber-400/30 shadow-md" 
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold uppercase h-5 leading-tight tracking-widest text-slate-600">VALOR DAS OPERAÇÕES</p>
              </div>
              <p className="text-[17px] font-black text-slate-800 tracking-tight mb-3">
                R$ {totalOperationSum.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-[#1e293b] px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[20px] flex justify-center shadow-sm">
                    {baseFilteredProposals.length}
                  </div>
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">Contrato(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comissão Estimada */}
          <Card 
            id="card-comissoes-estimadas" 
            onClick={() => {
              if (activeCardFolder === 'comissao') {
                setActiveCardFolder(null)
                setShowPJSubfolder(false)
              } else {
                setActiveCardFolder('comissao')
                setShowPJSubfolder(false)
              }
            }}
            className={cn(
              "card-shadow border h-full relative transition-all cursor-pointer hover:scale-[1.02] bg-white group",
              activeCardFolder === 'comissao' 
                ? "border-amber-500 ring-2 ring-amber-400/30 shadow-md" 
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold uppercase h-5 leading-tight tracking-widest text-slate-600">COMISSÃO</p>
              </div>
              <p className="text-[17px] font-black text-emerald-600 tracking-tight mb-3">
                R$ {estimatedComissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-[#1e293b] px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[20px] flex justify-center shadow-sm">
                    {baseFilteredProposals.length}
                  </div>
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest leading-none">Proposta(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comissão Recebida */}
          <Card 
            id="card-comissoes-recebidas" 
            onClick={() => {
              if (activeCardFolder === 'recebida') {
                setActiveCardFolder(null)
                setShowPJSubfolder(false)
              } else {
                setActiveCardFolder('recebida')
                setShowPJSubfolder(false)
              }
            }}
            className={cn(
              "card-shadow border h-full relative transition-all cursor-pointer hover:scale-[1.02] bg-white group",
              activeCardFolder === 'recebida' 
                ? "border-amber-500 ring-2 ring-amber-400/30 shadow-md" 
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold uppercase h-5 leading-tight tracking-widest text-slate-600">COMISSÃO RECEBIDA</p>
              </div>
              <p className="text-[17px] font-black text-emerald-700 tracking-tight mb-3">
                R$ {receivedComissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[20px] flex justify-center shadow-sm">
                    {baseFilteredProposals.filter(p => getPaymentStatus(p.id_lead) === "RECEBIDO").length}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Pago(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comissão A Receber */}
          <Card 
            id="card-comissoes-a-receber" 
            onClick={() => {
              if (activeCardFolder === 'a_receber') {
                setActiveCardFolder(null)
                setShowPJSubfolder(false)
              } else {
                setActiveCardFolder('a_receber')
                setShowPJSubfolder(false)
              }
            }}
            className={cn(
              "card-shadow border h-full relative transition-all cursor-pointer hover:scale-[1.02] bg-white group",
              activeCardFolder === 'a_receber' 
                ? "border-amber-500 ring-2 ring-amber-400/30 shadow-md" 
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold uppercase h-5 leading-tight tracking-widest text-slate-600">COMISSÃO A RECEBER</p>
              </div>
              <p className="text-[17px] font-black text-sky-600 tracking-tight mb-3">
                R$ {toReceiveComissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-sky-600 px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[20px] flex justify-center shadow-sm">
                    {baseFilteredProposals.filter(p => getPaymentStatus(p.id_lead) === "A_RECEBER").length}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Pendente(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estorno */}
          <Card 
            id="card-comissoes-estorno" 
            onClick={() => {
              if (activeCardFolder === 'estorno') {
                setActiveCardFolder(null)
                setShowPJSubfolder(false)
              } else {
                setActiveCardFolder('estorno')
                setShowPJSubfolder(false)
              }
            }}
            className={cn(
              "card-shadow border h-full relative transition-all cursor-pointer hover:scale-[1.02] bg-white group",
              activeCardFolder === 'estorno' 
                ? "border-amber-500 ring-2 ring-amber-400/30 shadow-md" 
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold uppercase h-5 leading-tight tracking-widest text-slate-600">ESTORNO</p>
              </div>
              <p className="text-[17px] font-black text-amber-700 tracking-tight mb-3">
                R$ {estornadoComissions.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-600 px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[20px] flex justify-center shadow-sm">
                    {baseFilteredProposals.filter(p => getPaymentStatus(p.id_lead) === "ESTORNADO").length}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Estornado(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conta Corrente */}
          <Card 
            id="card-conta-corrente" 
            onClick={() => {
              if (activeCardFolder === 'conta_corrente') {
                setActiveCardFolder(null)
                setShowPJSubfolder(false)
              } else {
                setActiveCardFolder('conta_corrente')
                setShowPJSubfolder(false)
              }
            }}
            className={cn(
              "card-shadow border h-full relative transition-all cursor-pointer hover:scale-[1.02] bg-white group",
              activeCardFolder === 'conta_corrente' 
                ? "border-amber-500 ring-2 ring-amber-400/30 shadow-md" 
                : "border-slate-200 hover:border-slate-300"
            )}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9px] font-bold uppercase h-5 leading-tight tracking-widest text-slate-600">CONTA CORRENTE</p>
              </div>
              <p className="text-[17px] font-black text-indigo-700 tracking-tight mb-3">
                R$ {contaCorrenteValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-600 px-2 py-0.5 rounded text-[10px] font-bold text-white min-w-[20px] flex justify-center shadow-sm">
                    {baseFilteredProposals.filter(p => isPJProposal(p) && pjPaidProposalIds[p.id_lead]).length}
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">PJ Pago(s)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subfolder PJ Expansion Panel */}
        {activeCardFolder && (
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-50/90 to-blue-50/60 border border-amber-300/80 rounded-2xl p-5 shadow-sm animate-fade-in transition-all">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-amber-200/80">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider">
                      {getFolderTitle(activeCardFolder)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">
                    Selecione abaixo para alternar a visualização da tabela entre o total e o repasse dos Corretores PJ.
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost"
                size="sm"
                onClick={() => { setActiveCardFolder(null); setShowPJSubfolder(false); }}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 bg-white/80 hover:bg-white border border-slate-200 rounded-xl px-3"
              >
                <X className="w-4 h-4 mr-1 text-slate-400" />
                <span>Fechar Visão Detalhada</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pasta Pai Card */}
              <div 
                onClick={() => setShowPJSubfolder(false)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  !showPJSubfolder 
                    ? "bg-white border-amber-500 shadow-md ring-2 ring-amber-400/20" 
                    : "bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl transition-colors", !showPJSubfolder ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500")}>
                    <Folder className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-800">
                      {getFolderMainLabel(activeCardFolder)}
                    </span>
                    <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                      {getFolderMainCountStr(activeCardFolder)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-slate-900 block">
                    R$ {getFolderMainVal(activeCardFolder).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={cn("text-[10px] font-extrabold block mt-0.5", !showPJSubfolder ? "text-emerald-600" : "text-slate-400")}>
                    {!showPJSubfolder ? "✓ Filtro Ativo na Tabela" : "Clique para aplicar"}
                  </span>
                </div>
              </div>

              {/* Subpasta PJ Card */}
              <div 
                onClick={() => setShowPJSubfolder(true)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                  showPJSubfolder 
                    ? "bg-amber-500/10 border-amber-500 shadow-md ring-2 ring-amber-500/30" 
                    : "bg-white/70 border-slate-200 hover:bg-white hover:border-slate-300"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl transition-colors", showPJSubfolder ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-500")}>
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-800">
                      {getFolderPJLabel(activeCardFolder)}
                    </span>
                    <div className="text-[11px] text-slate-500 font-bold mt-0.5">
                      {getFolderPJCountStr(activeCardFolder)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-amber-700 block">
                    R$ {getFolderPJVal(activeCardFolder).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                  <span className={cn("text-[10px] font-extrabold block mt-0.5", showPJSubfolder ? "text-amber-700" : "text-slate-400")}>
                    {showPJSubfolder ? "✓ Filtro Ativo na Tabela" : "Clique para aplicar"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters Card */}
        <Card id="card-financeiro-filters" className="card-shadow border border-slate-200 bg-white relative transition-all hover:scale-[1.02] rounded-2xl shadow-sm overflow-hidden">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-1 min-w-0">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 mb-1.5 block">Buscar Recebíveis</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                     <Search className="w-4 h-4" />
                  </span>
                  <Input 
                    id="input-receber-general-search"
                    placeholder="CPF, Nome, ADE ou Corretor..." 
                    className="h-[38px] bg-white border-slate-200 text-[11px] font-medium text-slate-800 pl-9 transition-colors focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg placeholder:text-[9.5px] placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">Período De Pagamento</label>
                  <div className="flex items-center gap-2">
                    {/* Data Inicial */}
                    <div className="relative">
                      <Input 
                        id="input-receber-date-start"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-[38px] w-[140px] px-3 bg-white border border-slate-200 text-[7px] font-medium text-slate-700 outline-none focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg transition-colors"
                      />
                    </div>

                    <span className="text-slate-300 text-[10px] font-bold scale-x-75">A</span>

                    {/* Data Final */}
                    <div className="relative">
                      <Input 
                        id="input-receber-date-end"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-[38px] w-[140px] px-3 bg-white border border-slate-200 text-[7px] font-medium text-slate-700 outline-none focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg transition-colors"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowFilters(!showFilters)
                    }}
                    className={cn(
                      "h-[38px] px-4 border border-slate-200 text-[9.5px] font-bold uppercase tracking-widest hover:bg-slate-50 transition-all rounded-lg gap-1.5 cursor-pointer shadow-sm",
                      showFilters ? "bg-[#171717] border-[#171717] text-white hover:bg-[#171717]/90" : "text-slate-600 bg-white"
                    )}
                  >
                    {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    FILTROS
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleClearFilters}
                    className="border border-slate-200 text-slate-600 bg-white h-[38px] text-[9.5px] font-bold uppercase tracking-widest rounded-lg transition-all px-4 gap-1.5 hover:bg-slate-50 shadow-sm active:scale-95 cursor-pointer"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    LIMPAR
                  </Button>
                  <Button 
                    onClick={fetchProposals}
                    disabled={isLoading}
                    className="bg-[#171717] hover:bg-[#171717]/90 text-white px-8 h-[38px] text-[9.5px] font-black uppercase tracking-widest rounded-lg shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "BUSCAR"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Collapsible Advanced Filters Section */}
            <div className={cn(
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-hidden transition-all duration-300",
              showFilters ? "max-h-[1000px] opacity-100 pt-4 border-t border-slate-100" : "max-h-0 opacity-0 pointer-events-none"
            )}>
              {/* Bank Selector filter */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">Filtrar por Banco</label>
                <select
                  id="select-receber-bank-filter"
                  value={selectedBankFilter}
                  onChange={(e) => setSelectedBankFilter(e.target.value)}
                  className="h-[38px] w-full text-[10px] border border-slate-200 rounded-lg bg-white px-3 focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold text-slate-700 transition-colors uppercase cursor-pointer"
                >
                  <option value="TODOS">TODOS OS BANCOS ({availableBanks.length})</option>
                  {availableBanks.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Convenio Selector filter */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">Filtrar por Convênio</label>
                <select
                  id="select-receber-convenio-filter"
                  value={selectedConvenioFilter}
                  onChange={(e) => setSelectedConvenioFilter(e.target.value)}
                  className="h-[38px] w-full text-[10px] border border-slate-200 rounded-lg bg-white px-3 focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold text-slate-700 transition-colors uppercase cursor-pointer"
                >
                  <option value="TODOS">TODOS OS CONVÊNIOS ({availableConvenios.length})</option>
                  {availableConvenios.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Parceiro PJ Selector filter */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">Filtrar por Parceiro PJ</label>
                <select
                  id="select-receber-pj-partner-filter"
                  value={selectedPjPartnerFilter}
                  onChange={(e) => setSelectedPjPartnerFilter(e.target.value)}
                  className="h-[38px] w-full text-[10px] border border-slate-200 rounded-lg bg-white px-3 focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold text-slate-700 transition-colors uppercase cursor-pointer"
                >
                  <option value="TODOS">TODOS OS PARCEIROS PJ ({availablePjPartners.length})</option>
                  {availablePjPartners.map(pj => (
                    <option key={pj} value={pj}>{pj}</option>
                  ))}
                </select>
              </div>

              {/* Filter by A RECEBER/RECEBIDO/ESTORNADO */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">Filtrar por Status do Pagamento</label>
                <select
                  id="select-receber-payment-status"
                  value={receivedFilter}
                  onChange={(e) => setReceivedFilter(e.target.value)}
                  className="h-[38px] w-full text-[10px] border border-slate-200 rounded-lg bg-white px-3 focus:outline-none focus:ring-1 focus:ring-slate-400 font-semibold text-slate-700 transition-colors uppercase cursor-pointer"
                >
                  <option value="TODOS">TODOS (A RECEBER / RECEBIDO / ESTORNADO)</option>
                  <option value="A_RECEBER">A RECEBER</option>
                  <option value="RECEBIDO">RECEBIDO</option>
                  <option value="ESTORNADO">ESTORNADO</option>
                </select>
              </div>

              {/* Valor Operação min/max */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">Valor Operação (R$)</label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="input-receber-val-op-min"
                    type="number"
                    placeholder="Mínimo"
                    value={minValorOperacao}
                    onChange={(e) => setMinValorOperacao(e.target.value)}
                    className="h-[38px] w-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg transition-colors placeholder:text-[10px] placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <span className="text-slate-300 text-[10px] font-bold">-</span>
                  <Input 
                    id="input-receber-val-op-max"
                    type="number"
                    placeholder="Máximo"
                    value={maxValorOperacao}
                    onChange={(e) => setMaxValorOperacao(e.target.value)}
                    className="h-[38px] w-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg transition-colors placeholder:text-[10px] placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Comissão (%) min/max */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">Comissão (%)</label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="input-receber-com-percent-min"
                    type="number"
                    step="0.01"
                    placeholder="Mínimo"
                    value={minComissaoPercent}
                    onChange={(e) => setMinComissaoPercent(e.target.value)}
                    className="h-[38px] w-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg transition-colors placeholder:text-[10px] placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <span className="text-slate-300 text-[10px] font-bold">-</span>
                  <Input 
                    id="input-receber-com-percent-max"
                    type="number"
                    step="0.01"
                    placeholder="Máximo"
                    value={maxComissaoPercent}
                    onChange={(e) => setMaxComissaoPercent(e.target.value)}
                    className="h-[38px] w-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg transition-colors placeholder:text-[10px] placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </div>

              {/* Comissão (R$) min/max */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#171717]/60 uppercase tracking-widest ml-1 block">Comissão (R$)</label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="input-receber-com-val-min"
                    type="number"
                    step="0.01"
                    placeholder="Mínimo"
                    value={minComissaoValor}
                    onChange={(e) => setMinComissaoValor(e.target.value)}
                    className="h-[38px] w-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg transition-colors placeholder:text-[10px] placeholder:text-slate-400 placeholder:font-normal"
                  />
                  <span className="text-slate-300 text-[10px] font-bold">-</span>
                  <Input 
                    id="input-receber-com-val-max"
                    type="number"
                    step="0.01"
                    placeholder="Máximo"
                    value={maxComissaoValor}
                    onChange={(e) => setMaxComissaoValor(e.target.value)}
                    className="h-[38px] w-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-300 rounded-lg transition-colors placeholder:text-[10px] placeholder:text-slate-400 placeholder:font-normal"
                  />
                </div>
              </div>
              
              {/* Optional clean action for advanced */}
              <div className="flex items-end sm:col-span-2 lg:col-span-3 xl:col-span-4">
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSelectedBankFilter("TODOS")
                    setSelectedConvenioFilter("TODOS")
                    setSelectedPjPartnerFilter("TODOS")
                    setReceivedFilter("TODOS")
                    setMinValorOperacao("")
                    setMaxValorOperacao("")
                    setMinComissaoPercent("")
                    setMaxComissaoPercent("")
                    setMinComissaoValor("")
                    setMaxComissaoValor("")
                  }}
                  className="text-[9.5px] font-bold text-[#171717] hover:text-[#171717]/80 uppercase tracking-widest hover:bg-slate-50 h-[38px] w-full text-center transition-all cursor-pointer rounded-lg border border-dashed border-slate-200 bg-white shadow-sm active:scale-[0.98]"
                >
                  Limpar Filtros Adicionais
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Button Row - For Operacional, Admin, Developer and Supervisor */}
        {(isAdmin || isOperational || isDeveloper || isSupervisor) && (
          <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
            <Button
              id="btn-exportar-extrato-pj"
              variant="outline"
              size="sm"
              onClick={exportExtratoComissionamentoPJ}
              className="h-10 px-5 bg-amber-500/10 border-amber-300 text-amber-800 hover:bg-amber-500/20 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer border-2 rounded-lg"
            >
              <FileSpreadsheet className="w-5 h-5 text-amber-700" />
              EXTRATO DE COMISSIONAMENTO (PJ)
            </Button>
            <Button
              id="btn-exportar-excel-geral"
              variant="outline"
              size="sm"
              onClick={exportToExcel}
              className="h-10 px-6 bg-white border-primary/20 text-primary hover:bg-primary/5 text-[11px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-sm cursor-pointer border-2 min-w-[200px] rounded-lg"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              EXPORTAR EXCEL
            </Button>
          </div>
        )}

        {/* Proposals Table Card */}
        <Card id="card-receber-table-wrapper" className="border border-slate-200 bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 px-2.5 rounded bg-slate-100 text-slate-700 text-[10px] font-extrabold shadow-sm">
                {filteredProposals.length}
              </span>
              <h2 className="text-xs font-black text-slate-700 tracking-widest uppercase">
                Propostas Encontradas
              </h2>
            </div>
            
            {/* Rows Config */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 tracking-wider">Ver por páginas:</span>
              <select
                id="select-receber-items-per-page"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(parseInt(e.target.value))
                  setCurrentPage(1)
                }}
                className="text-xs border border-slate-200 rounded px-2 py-0.5 font-bold text-slate-600 bg-slate-50 focus:outline-none"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table id="table-contas-a-receber" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100/80">
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ID Lead</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">ADE</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">CPF / Cliente</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Origem do Contrato</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Banco / Convênio</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Valor Operação</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-[#171717]/60 uppercase tracking-widest whitespace-nowrap text-center">Comissão (%)</th>
                  <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Pago em</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-right">Comissão ($)</th>
                  <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-400 text-xs font-semibold">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        Obtendo registros de propostas do Supabase...
                      </div>
                    </td>
                  </tr>
                ) : paginatedProposals.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-slate-400 text-xs font-medium">
                      {"Nenhuma proposta correspondente aos critérios no lote \"Pago ao Cliente\"."}
                    </td>
                  </tr>
                ) : (
                  paginatedProposals.map((proposal, index) => {
                    const valOp = safeFloat(proposal.valor_operacao || proposal.valor_cliente || proposal.valor_cliente_operacional || proposal.valor_base || proposal.valor_parcela || 0)
                    const comPercent = customCommissionPercents[proposal.id_lead] !== undefined ? customCommissionPercents[proposal.id_lead] : getCommissionPercentage(proposal)
                    const comPercentVal = comPercent !== undefined && comPercent !== null && !isNaN(Number(comPercent)) ? Number(comPercent) : 0
                    const calculatedCommission = (valOp * comPercentVal) / 100
                    
                    return (
                      <React.Fragment key={proposal.id_lead}>
                        <tr 
                           id={`row-receber-${proposal.id_lead}`}
                           className={cn(
                             "hover:bg-slate-50 transition-all cursor-pointer group",
                             index % 2 === 0 ? "bg-slate-50/30" : "bg-white",
                             selectedProposalDetail?.id_lead === proposal.id_lead && "bg-slate-100/80"
                           )}
                           onClick={() => {
                             if (selectedProposalDetail?.id_lead === proposal.id_lead) {
                               setSelectedProposalDetail(null)
                             } else {
                               setSelectedProposalDetail(proposal)
                               const { notes } = parseProposalNotesAndMetadata(proposal.observacoes)
                               setTempNotes(notes)
                             }
                           }}
                        >
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-400 group-hover:text-primary">
                            {proposal.id_lead}
                          </td>
                          <td className="px-4 py-4 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                            {proposal.ade || (
                              <span className="text-[10px] text-orange-400 font-extrabold italic uppercase">Sem ADE</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-tight max-w-[200px] truncate" title={proposal.nome_cliente}>
                               {proposal.nome_cliente}
                            </p>
                            <p className="text-[11px] font-medium text-slate-500">
                               {proposal.cliente_cpf}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-[11px] font-bold text-slate-600 uppercase bg-blue-50/20 px-2 py-0.5 rounded inline-block">
                               {proposal.nome_corretor || "-"}
                            </p>
                            {proposal.equipe && (
                              <p className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">
                                 Equipe: {proposal.equipe}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-[11px] font-bold text-slate-500 uppercase">
                            {proposal.banco} / {proposal.convenio}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <EditableAmountCell 
                              initialValue={valOp} 
                              onSave={(val) => handleOperationValueChange(proposal.id_lead, val)}
                              id={`input-operation-value-${proposal.id_lead}`}
                              confirmNeeded={true}
                              fieldName="Valor da Operação"
                            />
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap">
                            <EditablePercentCell 
                              initialValue={customCommissionPercents[proposal.id_lead] !== undefined ? customCommissionPercents[proposal.id_lead] : comPercent}
                              onSave={(val) => handleCommissionPercentChange(proposal.id_lead, val)}
                              id={`input-commission-percent-${proposal.id_lead}`}
                            />
                          </td>
                          <td className="px-4 py-4 text-[11px] font-medium text-slate-500 whitespace-nowrap">
                            {proposal.data_pago_cliente ? (
                              format(new Date(proposal.data_pago_cliente), "dd/MM/yyyy HH:mm")
                            ) : proposal.updated_at ? (
                              format(new Date(proposal.updated_at), "dd/MM/yyyy HH:mm")
                            ) : (
                              format(new Date(proposal.created_at), "dd/MM/yyyy")
                            )}
                          </td>
                          <td className="px-5 py-4 text-right whitespace-nowrap">
                            <EditableAmountCell 
                              initialValue={calculatedCommission} 
                              onSave={(val) => handleCommissionValueChange(proposal.id_lead, val)}
                              id={`input-commission-value-${proposal.id_lead}`}
                              textClassName="text-emerald-600"
                            />
                          </td>
                          <td className="px-5 py-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {(() => {
                              const pStatus = getPaymentStatus(proposal.id_lead)
                              const isPjPaid = !!pjPaidProposalIds[proposal.id_lead]
                              const isPJ = isPJProposal(proposal)
                              const isComissaoRecebida = (activeCardFolder === 'recebida' || activeCardFolder === 'conta_corrente' || pStatus === "RECEBIDO") && isPJ

                              return (
                                <div className="flex items-center justify-center gap-1.5">
                                  <Popover>
                                    <PopoverTrigger
                                      className={cn(
                                        "px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm outline-none focus:ring-1 focus:ring-slate-300",
                                        pStatus === "RECEBIDO" && "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100/80",
                                        pStatus === "A_RECEBER" && "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100/80",
                                        pStatus === "ESTORNADO" && "bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100/80"
                                      )}
                                    >
                                      {pStatus === "RECEBIDO" && "RECEBIDO"}
                                      {pStatus === "A_RECEBER" && "A RECEBER"}
                                      {pStatus === "ESTORNADO" && "ESTORNADO"}
                                      <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50">
                                      <div className="flex flex-col gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handlePaymentStatusChange(proposal.id_lead, "A_RECEBER")}
                                          className={cn(
                                            "w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-between",
                                            pStatus === "A_RECEBER" ? "bg-rose-50 text-rose-700" : "hover:bg-slate-50 text-slate-600"
                                          )}
                                        >
                                          <span>A RECEBER</span>
                                          {pStatus === "A_RECEBER" && <Check className="w-3 h-3 text-rose-600" />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handlePaymentStatusChange(proposal.id_lead, "RECEBIDO")}
                                          className={cn(
                                            "w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-between",
                                            pStatus === "RECEBIDO" ? "bg-emerald-50 text-emerald-700" : "hover:bg-slate-50 text-slate-600"
                                          )}
                                        >
                                          <span>RECEBIDO</span>
                                          {pStatus === "RECEBIDO" && <Check className="w-3 h-3 text-emerald-600" />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handlePaymentStatusChange(proposal.id_lead, "ESTORNADO")}
                                          className={cn(
                                            "w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-between",
                                            pStatus === "ESTORNADO" ? "bg-amber-50 text-amber-800" : "hover:bg-slate-50 text-slate-600"
                                          )}
                                        >
                                          <span>ESTORNADO</span>
                                          {pStatus === "ESTORNADO" && <Check className="w-3 h-3 text-amber-600" />}
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>

                                  {isComissaoRecebida && (
                                    <button
                                      type="button"
                                      onClick={() => handlePjPaidToggle(proposal.id_lead)}
                                      className={cn(
                                        "px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 shadow-sm outline-none border",
                                        isPjPaid
                                          ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                          : "bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                                      )}
                                    >
                                      {isPjPaid ? "PAGUEI PJ" : "PAGAR PJ"}
                                    </button>
                                  )}
                                </div>
                              )
                            })()}
                          </td>
                        </tr>

                        {/* Expandable detailed row panel */}
                        {selectedProposalDetail?.id_lead === proposal.id_lead && (
                          <tr className="bg-slate-50/20">
                            <td colSpan={10} className="px-6 py-5 border-b border-slate-100">
                              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
                                <div className="space-y-2">
                                  <h4 className="text-xs font-black text-slate-700 tracking-widest uppercase border-b border-slate-100 pb-2 flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-slate-500" /> Observações e Comentários Financeiros
                                  </h4>
                                  <textarea
                                    id={`textarea-obs-receber-${proposal.id_lead}`}
                                    rows={4}
                                    className="w-full text-xs p-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-slate-400 font-semibold text-slate-700 placeholder:text-slate-400 bg-slate-50/20"
                                    placeholder="Adicione observações financeiras internas sobre comissão, repasse ou pós-venda..."
                                    value={tempNotes}
                                    onChange={(e) => setTempNotes(e.target.value)}
                                  />
                                </div>
                                <div className="flex justify-end pt-1">
                                  <Button
                                    id={`btn-save-obs-${proposal.id_lead}`}
                                    size="sm"
                                    disabled={isNotesSaving}
                                    onClick={() => saveProposalNotes(proposal)}
                                    className="h-9 px-6 text-[10px] font-black uppercase tracking-widest bg-[#171717] hover:bg-[#171717]/90 text-white rounded-xl gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
                                  >
                                    {isNotesSaving ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <PiggyBank className="w-4 h-4" />
                                    )}
                                    Salvar Comentário
                                  </Button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredProposals.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                PÁGINA {currentPage} DE {totalPages || 1} ({filteredProposals.length} REGISTROS TOTAIS)
              </span>

              <div className="flex items-center gap-2">
                <Button
                  id="btn-pagination-prev"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-8 px-3 border-slate-200 rounded-lg text-slate-500 font-bold uppercase text-[9px] gap-1 cursor-pointer hover:bg-slate-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Voltar
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1
                    return (
                      <Button
                        id={`btn-pagination-page-${pageNum}`}
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-8 h-8 p-0 rounded-lg text-xs font-bold",
                          currentPage === pageNum ? "bg-primary text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  id="btn-pagination-next"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-8 px-3 border-slate-200 rounded-lg text-slate-500 font-bold uppercase text-[9px] gap-1 cursor-pointer hover:bg-slate-50"
                >
                  Avançar
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </Card>

      </main>

      {/* Status editing modal */}
      {isStatusModalOpen && statusTargetProposal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
          <Card className="w-full max-w-lg border border-slate-200 card-shadow overflow-hidden bg-white rounded-2xl">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">AÇÃO FINANCEIRA</span>
                <h3 className="text-base font-black uppercase tracking-tight">Alterar Status de Proposta</h3>
              </div>
              <button 
                onClick={() => setIsStatusModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                <div className="bg-[#D9EDF7] p-2 rounded-lg text-blue-600 mt-1">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase">{statusTargetProposal.nome_cliente}</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">CPF: {statusTargetProposal.cliente_cpf} | ID Lead: {statusTargetProposal.id_lead}</p>
                  <p className="text-[10px] text-indigo-600 font-black mt-1 uppercase">VALOR OPERAÇÃO: R$ {(statusTargetProposal.valor_operacao || statusTargetProposal.valor_cliente || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Status input selection */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nível de Status</label>
                <select
                  id="modal-select-status"
                  value={selectedNewStatus}
                  onChange={(e) => setSelectedNewStatus(e.target.value)}
                  className="h-11 w-full text-xs border border-slate-200 rounded-lg bg-white px-3 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary uppercase"
                >
                  <option value="PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA">PAGO AO CLIENTE - AGUARDANDO PÓS-VENDA</option>
                  <option value="PÓS-VENDA REALIZADA">PÓS-VENDA REALIZADA</option>
                  
                  {/* Give optional fallbacks to cancel/revert to inprocess in case of corrections */}
                  <option value="CANCELADO">CANCELADO</option>
                  <option value="ANDAMENTO / AGUARDANDO PAGAMENTO">ANDAMENTO / AGUARDANDO PAGAMENTO</option>
                </select>
              </div>

              {/* ADE input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número do Contrato (ADE)</label>
                <Input
                  id="modal-input-ade"
                  type="text"
                  placeholder="Informe o número do contrato para faturamento..."
                  value={statusAde}
                  onChange={(e) => setStatusAde(e.target.value)}
                  className="h-11 text-xs font-bold text-slate-700 border-slate-200 rounded-lg"
                />
              </div>

              {/* Comment field */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observações de Operação</label>
                <textarea
                  id="modal-textarea-obs"
                  rows={3}
                  placeholder="Escreva detalhes para Auditoria de faturamento / equipe operacional..."
                  value={statusObsOperacional}
                  onChange={(e) => setObsOperacional(e.target.value)}
                  className="w-full text-xs font-medium text-slate-600 p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  id="modal-btn-cancel"
                  variant="outline"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="h-10 text-[10px] font-black uppercase tracking-widest border-slate-200 hover:bg-slate-100 rounded-lg cursor-pointer px-4"
                >
                  Desistir
                </Button>
                <Button
                  id="modal-btn-save-status"
                  onClick={handleStatusUpdate}
                  className="h-10 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer px-5"
                >
                  Confirmar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
