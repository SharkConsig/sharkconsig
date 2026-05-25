"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Settings2,
  Tag,
  Trophy,
  Target,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Check,
  Zap,
  CalendarDays,
  Gift
} from "lucide-react"
import { HexColorPicker } from "react-colorful"
import { motion, AnimatePresence } from "motion/react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn, withRetry } from "@/lib/utils"

interface GenericConfig {
  id: string
  nome: string
  ativo: boolean
  created_at: string
}

interface TicketStatus {
  id: string
  nome: string
  cor: string
  cor_texto: string
  ativo: boolean
  created_at: string
}

interface ProdutoRegra {
  prazo: string
  coeficiente: string
  percentual_producao: string
}

interface ProdutoConfig {
  id: string
  banco_id: string
  convenio_id: string
  operacoes: string[]
  nome_tabela?: string
  prazo?: number
  coeficiente?: number
  percentual_producao?: number
  regras?: ProdutoRegra[]
  ativo: boolean
  created_at: string
}

interface MetaConfig {
  id: string
  tipo: 'empresa' | 'time' | 'corretor'
  alvo_id?: string
  alvo_nome?: string
  valor_mensal: number
  mes: number
  ano: number
  ativo?: boolean
  created_at: string
}

interface FaixaMetaCorretor {
  id: string
  nome: string
  valor_minimo: number
  premio: string
  ativo: boolean
  ano: number
  created_at: string
}

interface DashboardBanner {
  id: string
  image_url: string
  title: string | null
  is_active: boolean
  created_at: string
}

interface UsuarioAPI {
  id: string
  nome: string
  funcao: string
}

export default function SettingsPage() {
  const { perfil, isAdmin } = useAuth()
  const [statuses, setStatuses] = useState<TicketStatus[]>([])
  const [convenios, setConvenios] = useState<GenericConfig[]>([])
  const [bancos, setBancos] = useState<GenericConfig[]>([])
  const [tiposOperacao, setTiposOperacao] = useState<GenericConfig[]>([])
  const [produtosConfig, setProdutosConfig] = useState<ProdutoConfig[]>([])
  
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGenericModalOpen, setIsGenericModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [isStatusExpanded, setIsStatusExpanded] = useState(false)
  const [isConvenioExpanded, setIsConvenioExpanded] = useState(false)
  const [isBancoExpanded, setIsBancoExpanded] = useState(false)
  const [isOperacaoExpanded, setIsOperacaoExpanded] = useState(false)
  const [isProdutosExpanded, setIsProdutosExpanded] = useState(false)
  const [isMetasPremiosExpanded, setIsMetasPremiosExpanded] = useState(false)
  const [isBannersExpanded, setIsBannersExpanded] = useState(false)

  // Metas & Prêmios State
  const [metas, setMetas] = useState<MetaConfig[]>([])
  const [faixasMetas, setFaixasMetas] = useState<FaixaMetaCorretor[]>([])
  const [banners, setBanners] = useState<DashboardBanner[]>([])
  const [corretoresList, setCorretoresList] = useState<{id: string, nome: string}[]>([])
  const [supervisoresList, setSupervisoresList] = useState<{id: string, nome: string}[]>([])
  
  const [isAnnualGoalModalOpen, setIsAnnualGoalModalOpen] = useState(false)
  const [isSupervisorGoalModalOpen, setIsSupervisorGoalModalOpen] = useState(false)
  const [isBrokerGoalModalOpen, setIsBrokerGoalModalOpen] = useState(false)
  const [isFaixaMetaModalOpen, setIsFaixaMetaModalOpen] = useState(false)
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false)

  const [annualGoalForm, setAnnualGoalForm] = useState({ id: "", ano: new Date().getFullYear(), valor: "", ativo: true })
  const [faixaMetaForm, setFaixaMetaForm] = useState({ id: "", nome: "", valor_minimo: "", premio: "", ativo: true, ano: new Date().getFullYear() })
  
  const [selectedTeam, setSelectedTeam] = useState("")
  const [teamMetaValue, setTeamMetaValue] = useState("")
  const [teamMetaYear, setTeamMetaYear] = useState(new Date().getFullYear())
  const [teamMetaMonth, setTeamMetaMonth] = useState(new Date().getMonth() + 1)
  
  const [selectedCorretor, setSelectedCorretor] = useState("")
  const [individualMetaValue, setIndividualMetaValue] = useState("")
  const [individualMetaYear, setIndividualMetaYear] = useState(new Date().getFullYear())
  const [individualMetaMonth, setIndividualMetaMonth] = useState(new Date().getMonth() + 1)

  const [expandedYearId, setExpandedYearId] = useState<number | null>(null)

  const formatCurrency = (value: string) => {
    const cleanValue = value.replace(/\D/g, "")
    const amount = parseInt(cleanValue) || 0
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount / 100)
  }

  const monthsList = [
    { id: 1, name: "Janeiro" },
    { id: 2, name: "Fevereiro" },
    { id: 3, name: "Março" },
    { id: 4, name: "Abril" },
    { id: 5, name: "Maio" },
    { id: 6, name: "Junho" },
    { id: 7, name: "Julho" },
    { id: 8, name: "Agosto" },
    { id: 9, name: "Setembro" },
    { id: 10, name: "Outubro" },
    { id: 11, name: "Novembro" },
    { id: 12, name: "Dezembro" },
  ]

  const [selectedMonthForManage, setSelectedMonthForManage] = useState<number | null>(null)
  const [selectedYearForManage, setSelectedYearForManage] = useState<number | null>(null)
  const [isManageMonthModalOpen, setIsManageMonthModalOpen] = useState(false)

  const parseCurrency = (formattedValue: string) => {
    const cleanValue = formattedValue.replace(/\D/g, "")
    return (parseInt(cleanValue) || 0) / 100
  }
  
  const [bannerForm, setBannerForm] = useState({
    title: "",
    images: [] as { file: File, preview: string }[]
  })

  // Products Management State
  const [expandedBankId, setExpandedBankId] = useState<string | null>(null)
  const [isAddConvenioModalOpen, setIsAddConvenioModalOpen] = useState(false)
  const [isAddOperacaoModalOpen, setIsAddOperacaoModalOpen] = useState(false)
  const [selectedProductConfig, setSelectedProductConfig] = useState<ProdutoConfig | null>(null)
  const [selectedBancoForProd, setSelectedBancoForProd] = useState<GenericConfig | null>(null)
  const [selectedConvenioForProd, setSelectedConvenioForProd] = useState<GenericConfig | null>(null)
  const [tempNomeTabela, setTempNomeTabela] = useState<string>("")
  const [tempOperacoes, setTempOperacoes] = useState<string[]>([])
  const [tempPrazo, setTempPrazo] = useState<string>("")
  const [tempCoeficiente, setTempCoeficiente] = useState<string>("")
  const [tempPercentualProducao, setTempPercentualProducao] = useState<string>("")
  const [tempRegras, setTempRegras] = useState<ProdutoRegra[]>([])
  
  // Generic Modal States
  const [genericType, setGenericType] = useState<'convenio' | 'banco' | 'operacao' | null>(null)
  const [genericId, setGenericId] = useState<string | null>(null)
  const [genericNome, setGenericNome] = useState("")
  const [genericAtivo, setGenericAtivo] = useState(true)

  // Delete Confirmation States
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteData, setDeleteData] = useState<{
    id: string,
    type: 'status' | 'convenio' | 'banco' | 'operacao' | 'produto' | 'meta_anual' | 'meta' | 'faixa_meta' | 'banner',
    label: string,
    year?: number
  } | null>(null)
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  // Form State
  const [currentStatusId, setCurrentStatusId] = useState<string | null>(null)
  const [nome, setNome] = useState("")
  const [cor, setCor] = useState("#171717")
  const [corTexto, setCorTexto] = useState("#ffffff")
  const [showPickerFundo, setShowPickerFundo] = useState(false)
  const [showPickerTexto, setShowPickerTexto] = useState(false)

  const pickerTextoRef = useRef<HTMLDivElement>(null)
  const pickerFundoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerTextoRef.current && !pickerTextoRef.current.contains(event.target as Node)) {
        setShowPickerTexto(false)
      }
      if (pickerFundoRef.current && !pickerFundoRef.current.contains(event.target as Node)) {
        setShowPickerFundo(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (bannerForm.images.length === 0) {
      toast.error("Selecione pelo menos uma imagem primeiro")
      return
    }

    setIsSubmitting(true)
    try {
      console.log(`Iniciando processamento de ${bannerForm.images.length} banners...`)
      
      for (const item of bannerForm.images) {
        let imageUrl = item.preview

        if (item.file) {
          console.log("Iniciando validação de imagem e upload...")
          const img = new Image()
          const objectUrl = URL.createObjectURL(item.file)
          
          await new Promise((resolve, reject) => {
            img.onload = resolve
            img.onerror = () => reject(new Error("Erro ao carregar imagem para validação"))
            img.src = objectUrl
          })

          if (img.width !== 2560 || img.height !== 1440) {
            console.warn(`Dimensões inválidas: ${img.width}x${img.height}`)
            toast.error(`Dimensões incorretas: ${img.width}x${img.height}. Todas as imagens devem ter exatamente 2560x1440.`)
            URL.revokeObjectURL(objectUrl)
            continue // Pular esta imagem
          }
          URL.revokeObjectURL(objectUrl)

          const fileExt = item.file.name.split('.').pop()
          const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
          const filePath = `banners/${fileName}`

          const { error: uploadError } = await withRetry(() => 
            supabase.storage
              .from('dashboard-banners')
              .upload(filePath, item.file)
          )

          if (uploadError) throw uploadError

          const { data } = supabase.storage
            .from('dashboard-banners')
            .getPublicUrl(filePath)
          
          imageUrl = data.publicUrl
        }

        await withRetry(() => 
          supabase
            .from('dashboard_banners')
            .insert({
              image_url: imageUrl,
              title: bannerForm.title || null,
              is_active: true
            })
        )
      }

      toast.success(`${bannerForm.images.length} banners adicionados ao carrossel!`)
      setIsBannerModalOpen(false)
      setBannerForm({ title: "", images: [] })
      await fetchStatuses()
    } catch (error: unknown) {
      console.error("Erro completo ao salvar banner:", error)
      let errorMsg = "Erro desconhecido"
      
      if (typeof error === 'string') {
        errorMsg = error
      } else if (error instanceof Error) {
        errorMsg = error.message
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMsg = String(error.message)
      } else if (error && typeof error === 'object' && 'error_description' in error) {
        errorMsg = String(error.error_description)
      } else {
        try {
          errorMsg = JSON.stringify(error)
        } catch {
          errorMsg = "Erro não serializável"
        }
      }
      
      toast.error(`Erro ao salvar banner: ${errorMsg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleBanner = async (id: string, currentStatus: boolean) => {
    try {
      const newStatus = !currentStatus

      const { error: toggleError } = await supabase
        .from('dashboard_banners')
        .update({ is_active: newStatus })
        .eq('id', id)

      if (toggleError) throw toggleError
      toast.success(`Banner ${newStatus ? 'ativado' : 'desativado'}`)
      fetchStatuses()
    } catch (err: unknown) {
      console.error("Erro ao alterar status do banner:", err)
      toast.error("Erro ao alterar status do banner")
    }
  }

  const fetchStatuses = useCallback(async () => {
    setIsLoading(true)
    try {
      const [
        { data: statusData }, 
        { data: convData }, 
        { data: bancoData }, 
        { data: operData },
        { data: prodData },
        { data: metasData },
        { data: faixasMetasData },
        { data: bannersData },
        usuariosResponse
      ] = await Promise.all([
        supabase.from('status_chamados').select('*').order('created_at', { ascending: true }),
        supabase.from('convenios').select('*').order('nome', { ascending: true }),
        supabase.from('bancos').select('*').order('nome', { ascending: true }),
        supabase.from('tipos_operacao').select('*').order('nome', { ascending: true }),
        supabase.from('produtos_config').select('*'),
        supabase.from('metas_config').select('*'),
        supabase.from('faixa_meta').select('*').order('valor_minimo', { ascending: true }),
        supabase.from('dashboard_banners').select('*').order('created_at', { ascending: false }),
        fetch("/api/usuarios")
      ])

      setStatuses(statusData || [])
      setConvenios(convData || [])
      setBancos(bancoData || [])
      setTiposOperacao(operData || [])
      setProdutosConfig(prodData || [])
      setBanners(bannersData || [])
      setFaixasMetas(faixasMetasData || [])

      const perfisData: UsuarioAPI[] = usuariosResponse.ok ? await usuariosResponse.json() : []
      const brokers = perfisData?.filter((p) => p.funcao === 'Corretor' || p.funcao === 'Estágio' || p.funcao === 'Processo Seletivo' || p.funcao === 'PROCESSO SELETIVO').map((p) => ({ id: p.id, nome: p.nome })) || []
      const supervisors = perfisData?.filter((p) => p.funcao === 'Supervisor' || p.funcao === 'Administrador').map((p) => ({ id: p.id, nome: p.nome })) || []
      setCorretoresList(brokers)
      setSupervisoresList(supervisors)
      
      setMetas(metasData || [])
      
    } catch (error: unknown) {
      console.error("Erro ao carregar configurações:", error)
      toast.error("Erro ao carregar lista de configurações")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatuses()
    // Garantir que as seções comecem recolhidas
    setIsMetasPremiosExpanded(false)
    setExpandedYearId(null)
  }, [fetchStatuses])

  // Pagination Logic
  const totalPages = Math.ceil(statuses.length / itemsPerPage)
  const paginatedStatuses = statuses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  const resetForm = () => {
    setCurrentStatusId(null)
    setNome("")
    setCor("#171717")
    setCorTexto("#ffffff")
    setShowPickerFundo(false)
    setShowPickerTexto(false)
  }

  const handleOpenModal = (status?: TicketStatus) => {
    if (status) {
      setCurrentStatusId(status.id)
      setNome(status.nome)
      setCor(status.cor || "#171717")
      setCorTexto(status.cor_texto || "#ffffff")
    } else {
      resetForm()
    }
    setIsModalOpen(true)
  }

  const handleOpenGenericModal = (type: 'convenio' | 'banco' | 'operacao', item?: GenericConfig) => {
    setGenericType(type)
    if (item) {
      setGenericId(item.id)
      setGenericNome(item.nome)
      setGenericAtivo(item.ativo !== false)
    } else {
      setGenericId(null)
      setGenericNome("")
      setGenericAtivo(true)
    }
    setIsGenericModalOpen(true)
  }

  const handleGenericSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!genericNome.trim()) {
      toast.error("O nome é obrigatório")
      return
    }

    if (!genericType) return

    const table = genericType === 'convenio' ? 'convenios' : genericType === 'banco' ? 'bancos' : 'tipos_operacao'
    const typeLabel = genericType === 'convenio' ? 'Convênio' : genericType === 'banco' ? 'Banco' : 'Tipo de Operação'

    setIsSubmitting(true)
    try {
      if (genericId) {
        const { error } = await supabase
          .from(table)
          .update({ 
            nome: genericNome.toUpperCase(), 
            ativo: genericAtivo 
          })
          .eq('id', genericId)
        if (error) throw error
        toast.success(`${typeLabel} atualizado com sucesso`)
      } else {
        const { error } = await supabase
          .from(table)
          .insert({ 
            nome: genericNome.toUpperCase(), 
            ativo: genericAtivo 
          })
        if (error) throw error
        toast.success(`${typeLabel} criado com sucesso`)
      }
      setIsGenericModalOpen(false)
      fetchStatuses()
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error(`Erro ao salvar ${genericType}:`, err)
      toast.error(err.message || `Erro ao salvar ${genericType}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleAtivo = async (table: string, id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from(table)
        .update({ ativo: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
      toast.success("Status atualizado")
      fetchStatuses()
    } catch (error) {
      console.error("Erro ao alternar status:", error)
      toast.error("Erro ao alternar status")
    }
  }

  const toggleProdutoAtivo = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('produtos_config')
        .update({ ativo: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
      toast.success("Status atualizado")
      fetchStatuses()
    } catch (error) {
      console.error("Erro ao alternar status do produto:", error)
      toast.error("Erro ao alternar status")
    }
  }

  const handleRemoveProduto = (id: string) => {
    setDeleteData({ id, type: 'produto', label: 'Configuração de Produto' })
    setIsDeleteDialogOpen(true)
  }

  const handleSaveProdutoConfig = async () => {
    if (!selectedBancoForProd || !selectedConvenioForProd) return

    setIsSubmitting(true)
    try {
      // Validate rules values to avoid NaN
      const validateNumber = (val: string | number | undefined, isFloat = true) => {
        if (!val) return null
        const strVal = val.toString().replace(',', '.')
        const parsed = isFloat ? parseFloat(strVal) : parseInt(strVal)
        return isNaN(parsed) ? null : parsed
      }

      const formattedRegras = tempRegras.map(r => ({
        prazo: validateNumber(r.prazo, false)?.toString() || "",
        coeficiente: validateNumber(r.coeficiente, true)?.toString() || "",
        percentual_producao: validateNumber(r.percentual_producao, true)?.toString() || ""
      }))

      const payload = {
        nome_tabela: tempNomeTabela || null,
        operacoes: tempOperacoes,
        regras: formattedRegras,
        // Mantemos os campos antigos para compatibilidade, pegando da primeira regra se houver
        prazo: formattedRegras.length > 0 ? parseInt(formattedRegras[0].prazo) : validateNumber(tempPrazo, false),
        coeficiente: formattedRegras.length > 0 ? parseFloat(formattedRegras[0].coeficiente) : validateNumber(tempCoeficiente, true),
        percentual_producao: formattedRegras.length > 0 ? parseFloat(formattedRegras[0].percentual_producao) : validateNumber(tempPercentualProducao, true)
      }

      let result;
      if (selectedProductConfig) {
        // Update
        result = await supabase
          .from('produtos_config')
          .update(payload)
          .eq('id', selectedProductConfig.id)
      } else {
        // Insert
        result = await supabase
          .from('produtos_config')
          .insert({
            banco_id: selectedBancoForProd.id,
            convenio_id: selectedConvenioForProd.id,
            ativo: false,
            ...payload
          })
      }

      if (result.error) {
        console.error("Erro detalhado Supabase:", result.error)
        throw new Error(result.error.message || "Erro desconhecido no banco de dados")
      }

      toast.success("Configuração salva com sucesso")
      setIsAddConvenioModalOpen(false)
      setIsAddOperacaoModalOpen(false)
      fetchStatuses()
    } catch (error: unknown) {
      console.error("Erro ao salvar configuração de produto:", error)
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : "Erro ao salvar configuração")
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenericDelete = (type: 'convenio' | 'banco' | 'operacao' | 'meta_anual' | 'meta' | 'faixa_meta' | 'status' | 'produto' | 'banner', id: string | number, label?: string) => {
    let typeLabel = label || ""
    if (!typeLabel) {
      if (type === 'convenio') typeLabel = 'Convênio'
      else if (type === 'banco') typeLabel = 'Banco'
      else if (type === 'operacao') typeLabel = 'Tipo de Operação'
      else if (type === 'meta_anual') typeLabel = 'Plano de Metas'
      else if (type === 'meta') typeLabel = 'Meta'
      else if (type === 'faixa_meta') typeLabel = 'Faixa de Premiação'
      else if (type === 'status') typeLabel = 'Status'
      else if (type === 'produto') typeLabel = 'Produto'
      else if (type === 'banner') typeLabel = 'Banner'
    }
    
    setDeleteData({ 
      id: id.toString(), 
      type: type as 'status' | 'convenio' | 'banco' | 'operacao' | 'meta_anual' | 'meta' | 'faixa_meta' | 'produto' | 'banner', 
      label: typeLabel,
      year: type === 'meta_anual' ? id as number : undefined
    })
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteData) return

    const { id, type, label, year } = deleteData
    setIsDeleting(true)
    try {
      if (type === 'meta_anual' && year) {
        // Deletar metas_config para o ano
        const { error: errorMetas } = await supabase.from('metas_config').delete().eq('ano', year)
        if (errorMetas) throw errorMetas
        const { error: errorFaixas } = await supabase.from('faixa_meta').delete().eq('ano', year)
        if (errorFaixas) throw errorFaixas
        toast.success(`Plano de metas ${year} excluído`)
      } else if (type === 'meta') {
        const { error } = await supabase.from('metas_config').delete().eq('id', id)
        if (error) throw error
        toast.success("Meta excluída com sucesso")
      } else if (type === 'faixa_meta') {
        const { error } = await supabase.from('faixa_meta').delete().eq('id', id)
        if (error) throw error
        toast.success("Faixa excluída com sucesso")
      } else if (type === 'banner') {
        const { error } = await supabase.from('dashboard_banners').delete().eq('id', id)
        if (error) throw error
        toast.success("Banner excluído com sucesso")
      } else {
        let table = ""
        if (type === 'status') table = 'status_chamados'
        else if (type === 'convenio') table = 'convenios'
        else if (type === 'banco') table = 'bancos'
        else if (type === 'operacao') table = 'tipos_operacao'
        else if (type === 'produto') table = 'produtos_config'
        
        if (table) {
          const { error } = await supabase.from(table).delete().eq('id', id)
          if (error) throw error
          toast.success(`${label} excluído com sucesso`)
        }
      }

      fetchStatuses()
      setIsDeleteDialogOpen(false)
    } catch (error: unknown) {
      const err = error as { message?: string }
      console.error(`Erro ao excluir ${type}:`, err)
      toast.error(err.message || `Erro ao realizar exclusão`)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleToggleMetaAtiva = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('metas_config')
        .update({ ativo: !currentStatus })
        .eq('id', id)
      
      if (error) throw error
      toast.success("Status da meta atualizado")
      fetchStatuses()
    } catch (error) {
      console.error("Erro ao alternar status da meta:", error)
      toast.error("Erro ao alternar status da meta")
    }
  }

  const handleSaveAnnualGoal = async () => {
    const valor = parseCurrency(annualGoalForm.valor)
    if (valor <= 0) {
      toast.error("Informe um valor válido")
      return
    }

    setIsSubmitting(true)
    try {
      const mes = 0 // 0 means annual goal
      const ano = annualGoalForm.ano
      
      if (annualGoalForm.id) {
        const { error } = await supabase
          .from('metas_config')
          .update({ 
            valor_mensal: valor,
            ativo: annualGoalForm.ativo
          })
          .eq('id', annualGoalForm.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('metas_config')
          .insert({
            tipo: 'empresa',
            valor_mensal: valor,
            mes,
            ano,
            ativo: true
          })
        if (error) throw error
      }

      toast.success(`Meta anual de ${ano} salva com sucesso`)
      setIsAnnualGoalModalOpen(false)
      fetchStatuses()
    } catch (err: unknown) {
      console.error("Erro ao salvar meta anual:", err)
      const error = err as { message?: string; details?: string };
      const msg = error.message || error.details || "Erro ao conectar ao banco de dados";
      toast.error(`Falha: ${msg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveSupervisorGoal = async () => {
    if (!selectedTeam || !teamMetaValue) {
      toast.error("Preencha todos os campos")
      return
    }
    const valor = parseCurrency(teamMetaValue)
    const supervisor = supervisoresList.find(s => s.id === selectedTeam)

    setIsSubmitting(true)
    try {
      const mes = teamMetaMonth
      const ano = teamMetaYear
      const existing = metas.find(m => m.tipo === 'time' && m.alvo_id === selectedTeam && m.mes === mes && m.ano === ano)

      if (existing) {
        const { error } = await supabase.from('metas_config').update({ valor_mensal: valor }).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('metas_config').insert({
          tipo: 'time',
          alvo_id: selectedTeam,
          alvo_nome: supervisor?.nome,
          valor_mensal: valor,
          mes,
          ano
        })
        if (error) throw error
      }

      toast.success("Meta do supervisor salva")
      setIsSupervisorGoalModalOpen(false)
      fetchStatuses()
    } catch (err: unknown) {
      console.error("Erro ao salvar meta supervisor:", err)
      const error = err as { message?: string };
      toast.error(`Erro: ${error.message || "Tabela 'metas_config' não encontrada"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveBrokerGoal = async () => {
    if (!selectedCorretor || !individualMetaValue) {
      toast.error("Preencha todos os campos")
      return
    }
    const valor = parseCurrency(individualMetaValue)
    const corretor = corretoresList.find(c => c.id === selectedCorretor)

    setIsSubmitting(true)
    try {
      const mes = individualMetaMonth
      const ano = individualMetaYear
      const existing = metas.find(m => m.tipo === 'corretor' && m.alvo_id === selectedCorretor && m.mes === mes && m.ano === ano)

      if (existing) {
        const { error } = await supabase.from('metas_config').update({ valor_mensal: valor }).eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('metas_config').insert({
          tipo: 'corretor',
          alvo_id: selectedCorretor,
          alvo_nome: corretor?.nome,
          valor_mensal: valor,
          mes,
          ano
        })
        if (error) throw error
      }

      toast.success("Meta do corretor salva")
      setIsBrokerGoalModalOpen(false)
      fetchStatuses()
    } catch (err: unknown) {
      console.error("Erro ao salvar meta corretor:", err)
      const error = err as { message?: string };
      toast.error(`Erro: ${error.message || "Tabela 'metas_config' não encontrada"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSaveFaixaMeta = async () => {
    if (!faixaMetaForm.nome || !faixaMetaForm.valor_minimo || !faixaMetaForm.premio) {
      toast.error("Preencha todos os campos")
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        nome: faixaMetaForm.nome.toUpperCase(),
        valor_minimo: parseCurrency(faixaMetaForm.valor_minimo.toString()),
        premio: faixaMetaForm.premio,
        ativo: faixaMetaForm.ativo,
        ano: faixaMetaForm.ano
      }

      if (faixaMetaForm.id) {
        const { error } = await supabase
          .from('faixa_meta')
          .update(payload)
          .eq('id', faixaMetaForm.id)
        if (error) throw error
        toast.success("Faixa atualizada")
      } else {
        const { error } = await supabase
          .from('faixa_meta')
          .insert({ ...payload })
        if (error) throw error
        toast.success("Faixa criada")
      }
      setIsFaixaMetaModalOpen(false)
      fetchStatuses()
    } catch (err: unknown) {
      console.error("Erro ao salvar faixa:", err)
      const error = err as { message?: string };
      toast.error(`Erro SQL: ${error.message || "Tabela não encontrada ou falha de conexão"}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error("O nome do status é obrigatório")
      return
    }

    setIsSubmitting(true)
    try {
      if (currentStatusId) {
        // Update
        const { error } = await supabase
          .from('status_chamados')
          .update({ 
            nome: nome.toUpperCase(), 
            cor,
            cor_texto: corTexto
          })
          .eq('id', currentStatusId)
        
        if (error) throw error
        toast.success("Status atualizado com sucesso")
      } else {
        // Create
        const { error } = await supabase
          .from('status_chamados')
          .insert({ 
            nome: nome.toUpperCase(), 
            cor,
            cor_texto: corTexto
          })
        
        if (error) throw error
        toast.success("Status criado com sucesso")
      }
      
      setIsModalOpen(false)
      fetchStatuses()
    } catch (err: unknown) {
      const error = err as { message?: string; details?: string; code?: string; status?: number }
      console.error("Erro ao salvar status (detalhado):", JSON.stringify(error, null, 2))
      console.error("Objeto de erro bruto:", error)
      
      let errorMessage = error.message || error.details || "Erro ao salvar status. Tente novamente."
      if (typeof error === 'object' && error !== null) {
        const code = error.code || (error.status === 403 ? '42501' : null)
        if (code === '23505') {
          errorMessage = "Já existe um status com este nome"
        } else if (code === '42703') {
          errorMessage = "A coluna 'cor_texto' não existe no banco de dados. Por favor, execute o script SQL de atualização (migrate_chamados_status.sql)."
        } else if (code === '42501') {
          errorMessage = "Você não tem permissão para realizar esta operação (RLS). Verifique se seu cargo é Administrador ou Desenvolvedor."
        }
      }
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = (id: string) => {
    setDeleteData({ id, type: 'status', label: 'Status' })
    setIsDeleteDialogOpen(true)
  }

  // Verificação de permissão (Admin ou Dev)
  const canAccess = isAdmin || (perfil?.role === 'Administrador' || perfil?.role === 'Desenvolvedor')

  const translateColor = (color: string) => {
    if (!color || color.startsWith('#')) return color.toUpperCase();
    const map: Record<string, string> = {
      'blue': 'AZUL',
      'green': 'VERDE',
      'orange': 'LARANJA',
      'red': 'VERMELHO',
      'purple': 'ROXO',
      'slate': 'CINZA',
      'amber': 'AMARELO',
      'cyan': 'CIANO',
      'emerald': 'ESMERALDA',
      'rose': 'ROSA',
    };
    return map[color.toLowerCase()] || color.toUpperCase();
  };

  if (!canAccess && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <Card className="max-w-md w-full border-none shadow-2xl">
          <CardContent className="pt-6 text-center space-y-4">
            <Settings2 className="w-12 h-12 text-slate-300 mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-slate-500 text-sm">Você não tem permissão para acessar esta área de configurações.</p>
            <Button onClick={() => window.history.back()} variant="outline" className="w-full">Voltar</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc]">
      <Header title="CONFIGURAÇÕES DO SISTEMA" />
      
      <main className="flex-1 p-4 lg:p-8 space-y-8">
        {/* GERENCIAR METAS E PRÊMIOS */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsMetasPremiosExpanded(!isMetasPremiosExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  GERENCIAR METAS E PRÊMIOS
                  {isMetasPremiosExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Configuração de objetivos anuais, mensais e campanhas de prêmios</p>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                 onClick={(e) => {
                  e.stopPropagation()
                  setIsAnnualGoalModalOpen(true)
                }}
                className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg h-9 rounded-lg relative z-10 px-4"
              >
                <Plus className="w-4 h-4" />
                <span className="text-[10.5px] font-bold uppercase tracking-widest">Nova Campanha Anual</span>
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {isMetasPremiosExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden space-y-4"
              >
                {/* Accordion by Year */}
                {Array.from(new Set([
                  ...metas.map(m => m.ano),
                  ...faixasMetas.map(f => f.ano),
                  new Date().getFullYear()
                ])).filter(y => y > 0).sort((a, b) => b - a).map((year) => {
                  const annualMeta = metas.find(m => m.tipo === 'empresa' && m.ano === year && m.mes === 0);
                  const isMetasAtiva = annualMeta?.ativo !== false;

                  return (
                  <Card key={year} className={cn(
                    "border overflow-hidden rounded-2xl bg-white shadow-sm overflow-visible transition-all",
                    isMetasAtiva ? "border-slate-200" : "border-slate-100 opacity-75 grayscale"
                  )}>
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedYearId(expandedYearId === year ? null : year)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-black text-[12px] font-mono",
                          isMetasAtiva ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-400"
                        )}>
                          {year.toString().substring(2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-[12px] text-slate-700 uppercase tracking-widest leading-none">PLANO DE METAS {year}</h3>
                            {!isMetasAtiva && (
                              <span className="bg-slate-100 text-slate-400 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Inativo</span>
                            )}
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Gestão de desempenho e bonificações</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-4 border-r pr-4 border-slate-100">
                           <div className="flex flex-col items-end">
                            <span className="text-[8px] font-bold text-slate-300 uppercase">Meta Anual</span>
                            <span className={cn(
                              "text-[11px] font-mono font-black",
                              isMetasAtiva ? "text-emerald-600" : "text-slate-400"
                            )}>
                              {formatCurrency(((annualMeta?.valor_mensal || 0) * 100).toString())}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pr-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-7 w-7 rounded-lg transition-colors",
                              isMetasAtiva ? "text-emerald-500 hover:bg-emerald-50" : "text-slate-300 hover:bg-slate-100"
                            )}
                            onClick={() => annualMeta && handleToggleMetaAtiva(annualMeta.id, isMetasAtiva)}
                            title={isMetasAtiva ? "Desativar Plano" : "Ativar Plano"}
                          >
                            <Zap className={cn("w-3.5 h-3.5", isMetasAtiva && "fill-current")} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5"
                            onClick={() => {
                              if (annualMeta) {
                                setAnnualGoalForm({
                                  id: annualMeta.id,
                                  ano: annualMeta.ano,
                                  valor: (annualMeta.valor_mensal * 100).toString(),
                                  ativo: annualMeta.ativo !== false
                                })
                                setIsAnnualGoalModalOpen(true)
                              } else {
                                setAnnualGoalForm({ id: "", ano: year, valor: "", ativo: true })
                                setIsAnnualGoalModalOpen(true)
                              }
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenericDelete('meta_anual', year)
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {expandedYearId === year ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedYearId === year && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100">
                          <div className="p-6 bg-slate-50/30 space-y-8">
                            
                            {/* Resumo Estrutural */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                              <div className="flex items-center gap-4">
                                <div className="bg-primary/10 p-3 rounded-2xl">
                                  <BarChart3 className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                  <h5 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">RESUMO ESTRUTURAL DO ANO {year}</h5>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Gestão descentralizada por competência mensal</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-8">
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Referência Mensal</span>
                                  <span className="text-[14px] font-mono font-black text-slate-600">
                                    {annualMeta ? formatCurrency(((annualMeta.valor_mensal / 12) * 100).toString()) : '0,00'}
                                  </span>
                                </div>
                                <div className="w-[1px] h-10 bg-slate-100 hidden md:block" />
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase">Meta Total do Plano</span>
                                  <span className="text-[14px] font-mono font-black text-emerald-600">
                                    {annualMeta ? formatCurrency((annualMeta.valor_mensal * 100).toString()) : '0,00'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Target className="w-4 h-4 text-primary" />
                                  <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Cronograma de Gestão Mensal</h4>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Selecione um mês para gerenciar Supervisores, Corretores e Prêmios</p>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => {
                                  const metasMes = metas.filter(m => m.ano === year && m.mes === mes);
                                  const totalMes = metasMes.reduce((acc, curr) => acc + curr.valor_mensal, 0);
                                  const metaAnualMensalizada = (annualMeta?.valor_mensal || 0) / 12;
                                  const percAlocado = metaAnualMensalizada > 0 ? (totalMes / metaAnualMensalizada) * 100 : 0;
                                  
                                  const mDesc = monthsList.find(m => m.id === mes)?.name.toUpperCase();
                                  const isCurrentMonth = new Date().getMonth() + 1 === mes && new Date().getFullYear() === year;
                                  
                                  return (
                                    <div 
                                      key={mes} 
                                      onClick={() => {
                                        setSelectedMonthForManage(mes)
                                        setSelectedYearForManage(year)
                                        setIsManageMonthModalOpen(true)
                                      }}
                                      className={cn(
                                        "relative group/mes overflow-hidden bg-white rounded-2xl border shadow-sm p-4 hover:shadow-xl transition-all cursor-pointer",
                                        isCurrentMonth ? "border-primary ring-1 ring-primary/10" : "border-slate-100"
                                      )}
                                    >
                                      {/* Indicador de Status Alocado */}
                                      <div className={cn(
                                        "absolute top-0 right-0 w-12 h-12 -mr-6 -mt-6 rounded-full transition-transform group-hover/mes:scale-110",
                                        percAlocado >= 100 ? "bg-emerald-500/10" : percAlocado > 0 ? "bg-primary/10" : "bg-slate-50"
                                      )} />

                                      <div className="flex flex-col gap-4 relative">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1.5">
                                            <span className={cn(
                                              "text-[10px] font-black uppercase tracking-tight",
                                              isCurrentMonth ? "text-primary" : "text-slate-800"
                                            )}>{mDesc}</span>
                                            {isCurrentMonth && (
                                              <span className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                                            )}
                                          </div>
                                          {percAlocado > 0 && (
                                            <span className={cn(
                                              "text-[8px] font-black px-1.5 py-0.5 rounded-md",
                                              percAlocado >= 100 ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"
                                            )}>
                                              {Math.round(percAlocado)}%
                                            </span>
                                          )}
                                        </div>

                                        <div className="space-y-1">
                                          <div className="text-[11px] font-mono font-black text-slate-700">
                                            {totalMes > 0 ? formatCurrency((totalMes * 100).toString()) : '---'}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <TrendingUp className={cn("w-2.5 h-2.5", percAlocado > 0 ? "text-primary" : "text-slate-300")} />
                                            <span className="text-[8px] font-bold text-slate-300 uppercase">Metas Alocadas</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-2 border-t border-slate-50">
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] font-bold text-slate-400 leading-none">SUP.</span>
                                            <span className="text-[10px] font-black text-slate-700">{metas.filter(m => m.tipo === 'time' && m.ano === year && m.mes === mes).length}</span>
                                          </div>
                                          <div className="w-[1px] h-4 bg-slate-100" />
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-[8px] font-bold text-slate-400 leading-none">COR.</span>
                                            <span className="text-[10px] font-black text-slate-700">{metas.filter(m => m.tipo === 'corretor' && m.ano === year && m.mes === mes).length}</span>
                                          </div>
                                          <div className="flex-1 flex justify-end">
                                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full group-hover/mes:bg-primary group-hover/mes:text-white transition-all">
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsStatusExpanded(!isStatusExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  STATUS DE CHAMADOS
                  {isStatusExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />
                  )}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de fluxos e estados dos atendimentos</p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                handleOpenModal()
              }} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg shadow-slate-200 h-9 w-[170px] rounded-lg relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest">Novo Status</span>
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {isStatusExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="overflow-hidden space-y-6"
              >
                <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                          <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-8">Nome do Status</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Cor de Identificação</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Data Criação</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-center">Status</TableHead>
                          <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-right pr-8">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-40 text-center">
                              <div className="flex flex-col items-center justify-center gap-3">
                                <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Carregando dados...</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : paginatedStatuses.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="h-40 text-center">
                              <div className="flex flex-col items-center justify-center gap-2">
                                <Tag className="w-8 h-8 text-slate-200" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum status cadastrado</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedStatuses.map((status) => (
                            <TableRow key={status.id} className="hover:bg-slate-50/50 transition-colors border-slate-100 group">
                              <TableCell className="py-4 pl-8">
                                <span 
                                  className="px-3 py-1 rounded-md text-[10px] font-normal uppercase tracking-tight shadow-sm border border-slate-100"
                                  style={{ backgroundColor: status.cor, color: status.cor_texto || '#ffffff' }}
                                >
                                  {status.nome}
                                </span>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex items-center gap-3">
                                  <div 
                                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200" 
                                    style={{ backgroundColor: status.cor }}
                                  />
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                    {translateColor(status.cor)}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                                {format(new Date(status.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="py-4 text-center">
                                <button 
                                  onClick={() => toggleAtivo('status_chamados', status.id, status.ativo !== false)}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                                    status.ativo !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                  )}
                                >
                                  {status.ativo !== false ? "ATIVO" : "INATIVO"}
                                </button>
                              </TableCell>
                              <TableCell className="py-4 text-right pr-8">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                                    onClick={() => handleOpenModal(status)}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                                    onClick={() => handleDelete(status.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-2 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, statuses.length)} de {statuses.length} registros
                    </p>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 transition-all disabled:opacity-30"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-lg transition-all text-[10px] font-black tracking-widest",
                              currentPage === page 
                                ? "bg-primary text-white shadow-lg shadow-primary/20 border-primary" 
                                : "border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20"
                            )}
                            onClick={() => handlePageChange(page)}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-lg border-slate-200 text-slate-400 hover:text-primary hover:border-primary/20 transition-all disabled:opacity-30"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Seção Convênios */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsConvenioExpanded(!isConvenioExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  CONVÊNIOS
                  {isConvenioExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de convênios para propostas</p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                handleOpenGenericModal('convenio')
              }} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg h-9 w-[170px] rounded-lg relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest">Novo Convênio</span>
            </Button>
          </div>

          <AnimatePresence>
            {isConvenioExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-6">
                <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-8">Nome do Convênio</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Data Criação</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-center">Status</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-right pr-8">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {convenios.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-400 text-[11px] uppercase font-bold tracking-widest">Nenhum convênio cadastrado</TableCell></TableRow>
                      ) : (
                        convenios.map((item) => (
                          <TableRow key={item.id} className="group border-slate-100">
                            <TableCell className="py-4 pl-8 font-bold text-[12px] text-slate-700">{item.nome}</TableCell>
                            <TableCell className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="py-4 text-center">
                                <button 
                                  onClick={() => toggleAtivo('convenios', item.id, item.ativo !== false)}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                                    item.ativo !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                  )}
                                >
                                  {item.ativo !== false ? "ATIVO" : "INATIVO"}
                                </button>
                              </TableCell>
                            <TableCell className="py-4 text-right pr-8">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenGenericModal('convenio', item)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleGenericDelete('convenio', item.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Seção Bancos */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsBancoExpanded(!isBancoExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  BANCOS DE EMPRÉSTIMO
                  {isBancoExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de bancos para propostas</p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                handleOpenGenericModal('banco')
              }} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg h-9 w-[170px] rounded-lg relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest">Novo Banco</span>
            </Button>
          </div>

          <AnimatePresence>
            {isBancoExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-6">
                <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-8">Nome do Banco</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Data Criação</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-center">Status</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-right pr-8">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bancos.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-400 text-[11px] uppercase font-bold tracking-widest">Nenhum banco cadastrado</TableCell></TableRow>
                      ) : (
                        bancos.map((item) => (
                          <TableRow key={item.id} className="group border-slate-100">
                            <TableCell className="py-4 pl-8 font-bold text-[12px] text-slate-700">{item.nome}</TableCell>
                            <TableCell className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="py-4 text-center">
                                <button 
                                  onClick={() => toggleAtivo('bancos', item.id, item.ativo !== false)}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                                    item.ativo !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                  )}
                                >
                                  {item.ativo !== false ? "ATIVO" : "INATIVO"}
                                </button>
                              </TableCell>
                            <TableCell className="py-4 text-right pr-8">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenGenericModal('banco', item)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleGenericDelete('banco', item.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Seção Tipos de Operação */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsOperacaoExpanded(!isOperacaoExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  TIPOS DE OPERAÇÃO
                  {isOperacaoExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Gerenciamento de tipos de operação para propostas</p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.stopPropagation()
                handleOpenGenericModal('operacao')
              }} 
              className="bg-[#171717] hover:bg-[#171717]/90 text-white gap-2 shadow-lg h-9 w-[170px] rounded-lg relative z-10"
            >
              <Plus className="w-4 h-4" />
              <span className="text-[10.5px] font-bold uppercase tracking-widest">Novo Tipo</span>
            </Button>
          </div>

          <AnimatePresence>
            {isOperacaoExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-6">
                <Card className="card-shadow border border-slate-200 overflow-hidden rounded-2xl bg-white">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-slate-100">
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 pl-8">Nome do Tipo</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">Data Criação</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-center">Status</TableHead>
                        <TableHead className="text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4 text-right pr-8">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tiposOperacao.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-400 text-[11px] uppercase font-bold tracking-widest">Nenhum tipo cadastrado</TableCell></TableRow>
                      ) : (
                        tiposOperacao.map((item) => (
                          <TableRow key={item.id} className="group border-slate-100">
                            <TableCell className="py-4 pl-8 font-bold text-[12px] text-slate-700">{item.nome}</TableCell>
                            <TableCell className="py-4 text-[11px] font-bold text-slate-500 uppercase tracking-tight">
                              {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="py-4 text-center">
                                <button 
                                  onClick={() => toggleAtivo('tipos_operacao', item.id, item.ativo !== false)}
                                  className={cn(
                                    "px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all",
                                    item.ativo !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                  )}
                                >
                                  {item.ativo !== false ? "ATIVO" : "INATIVO"}
                                </button>
                              </TableCell>
                            <TableCell className="py-4 text-right pr-8">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => handleOpenGenericModal('operacao', item)}><Pencil className="w-4 h-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-500" onClick={() => handleGenericDelete('operacao', item.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* GERENCIAR PRODUTOS E COMISSÕES */}
        <section className="space-y-6">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsProdutosExpanded(!isProdutosExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  GERENCIAR PRODUTOS E COMISSÕES
                  {isProdutosExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Configuração de convênios e operações por banco</p>
            </div>
          </div>

          <AnimatePresence>
            {isProdutosExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-4">
                {bancos.filter(b => b.ativo !== false).map((banco) => (
                  <Card key={banco.id} className="border border-slate-200 overflow-hidden rounded-2xl bg-white shadow-sm overflow-visible">
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedBankId(expandedBankId === banco.id ? null : banco.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-[10px]">
                          {banco.nome.substring(0, 2)}
                        </div>
                        <h3 className="font-bold text-[12px] text-slate-700 uppercase tracking-widest">{banco.nome}</h3>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          {produtosConfig.filter(p => p.banco_id === banco.id).length} Convênios
                        </span>
                        {expandedBankId === banco.id ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                      </div>
                    </div>

                    <AnimatePresence>
                      {expandedBankId === banco.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-100">
                          <div className="p-6 bg-slate-50/30 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TABELAS DE REGRAS</h4>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[9px] font-bold uppercase tracking-widest gap-2 bg-white border-slate-200"
                                onClick={() => {
                                  setSelectedBancoForProd(banco)
                                  setIsAddConvenioModalOpen(true)
                                }}
                              >
                                <Plus className="w-3 h-3 text-primary" />
                                Adicionar Convênio
                              </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                              {produtosConfig.filter(p => p.banco_id === banco.id).map((prod) => {
                                const convenio = convenios.find(c => c.id === prod.convenio_id)
                                if (!convenio) return null
                                return (
                                  <div 
                                    key={prod.id} 
                                    className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
                                  >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                          <span className="font-bold text-[13px] text-slate-800 uppercase tracking-widest">{prod.nome_tabela || convenio.nome}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                              {format(new Date(prod.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                            </span>
                                            <span className={cn(
                                              "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                                              prod.ativo !== false ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                            )}>
                                              {prod.ativo !== false ? "ATIVO" : "INATIVO"}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Convênio</span>
                                          <div className="flex flex-wrap gap-1.5">
                                            <span className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-tight border border-slate-100">
                                              {convenio.nome}
                                            </span>
                                          </div>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Operações Permitidas</span>
                                          <div className="flex flex-wrap gap-1.5">
                                          {(prod.operacoes || []).map(opId => {
                                            const op = tiposOperacao.find(o => o.id === opId)
                                            return op ? (
                                              <span key={opId} className="px-2 py-1 bg-slate-50 text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-tight border border-slate-100">
                                                {op.nome}
                                              </span>
                                            ) : null
                                          })}
                                          </div>
                                          {(prod.operacoes || []).length === 0 && (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest italic">Nenhuma operação selecionada</span>
                                          )}
                                        </div>

                                          <div className="flex flex-col gap-1.5 min-w-[200px]">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Tabela de Coeficientes</span>
                                            {prod.regras && prod.regras.length > 0 ? (
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {prod.regras.map((regra, idx) => (
                                                  <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5">
                                                    <div className="flex flex-col">
                                                      <span className="text-[7px] font-bold text-slate-400 uppercase leading-none">Prazo</span>
                                                      <span className="text-[10px] font-bold text-slate-700">{regra.prazo}x</span>
                                                    </div>
                                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                                    <div className="flex flex-col">
                                                      <span className="text-[7px] font-bold text-slate-400 uppercase leading-none">Coef</span>
                                                      <span className="text-[10px] font-bold text-slate-700">{regra.coeficiente}</span>
                                                    </div>
                                                    <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                                                    <div className="flex flex-col">
                                                      <span className="text-[7px] font-bold text-slate-400 uppercase leading-none">Prod</span>
                                                      <span className="text-[10px] font-bold text-emerald-600">{regra.percentual_producao}%</span>
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <div className="flex gap-6">
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Prazo</span>
                                                  <span className="text-[10px] font-extrabold text-slate-600">{prod.prazo ? `${prod.prazo}x` : '--'}</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Coeficiente</span>
                                                  <span className="text-[10px] font-extrabold text-slate-600">{prod.coeficiente || '--'}</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Produção</span>
                                                  <span className="text-[10px] font-extrabold text-emerald-600">{prod.percentual_producao ? `${prod.percentual_producao}%` : '--'}</span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                      </div>

                                      <div className="flex items-center justify-end gap-2 border-t md:border-t-0 pt-4 md:pt-0 border-slate-100">
                                        {/* Botão Ativar/Inativar */}
                                        <button 
                                          onClick={() => toggleProdutoAtivo(prod.id, prod.ativo !== false)}
                                          className={cn(
                                            "h-8 px-3 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border",
                                            prod.ativo !== false 
                                              ? "bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100" 
                                              : "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                                          )}
                                        >
                                          {prod.ativo !== false ? "ATIVO" : "INATIVO"}
                                        </button>

                                        {/* Botão Editar */}
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="h-8 px-3 rounded-xl text-[9px] font-bold uppercase tracking-widest gap-2 bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                          onClick={() => {
                                            setSelectedProductConfig(prod)
                                            setSelectedBancoForProd(banco)
                                            setSelectedConvenioForProd(convenio)
                                            setTempOperacoes(prod.operacoes || [])
                                            setTempNomeTabela(prod.nome_tabela || "")
                                            setTempPrazo(prod.prazo?.toString() || "")
                                            setTempCoeficiente(prod.coeficiente?.toString().replace('.', ',') || "")
                                            setTempPercentualProducao(prod.percentual_producao?.toString().replace('.', ',') || "")
                                            setTempRegras(prod.regras || [])
                                            setIsAddOperacaoModalOpen(true)
                                          }}
                                        >
                                          <Pencil className="w-3 h-3" />
                                          Editar
                                        </Button>

                                        {/* Botão Excluir */}
                                        <Button 
                                          variant="outline" 
                                          size="sm"
                                          className="h-8 px-3 rounded-xl text-[9px] font-bold uppercase tracking-widest gap-2 bg-white border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                          onClick={() => handleRemoveProduto(prod.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          Excluir
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                              {produtosConfig.filter(p => p.banco_id === banco.id).length === 0 && (
                                <div className="col-span-full py-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2">
                                  <Tag className="w-6 h-6 text-slate-200" />
                                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Nenhum convênio vinculado</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>



        {/* GERENCIAR BANNERS DO DASHBOARD */}
        <section className="space-y-6 pb-20">
          <div 
            className="flex items-center justify-between cursor-pointer group select-none"
            onClick={() => setIsBannersExpanded(!isBannersExpanded)}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-primary rounded-full transition-transform group-hover:scale-y-125" />
                <h2 className="text-[12px] lg:text-[14px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-3">
                  GERENCIAR CARROSSEL DO DASHBOARD (2560x1440)
                  {isBannersExpanded ? <ChevronUp className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" /> : <ChevronDown className="w-4 h-4 text-slate-300 transition-colors group-hover:text-primary" />}
                </h2>
              </div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-3">Upload de campanhas visuais para o carrossel infinito do dashboard</p>
            </div>
          </div>

          <AnimatePresence>
            {isBannersExpanded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: "auto", opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }} 
                className="overflow-hidden space-y-4"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => {
                        setBannerForm({ title: "", images: [] })
                        setIsBannerModalOpen(true)
                      }}
                      className="h-9 px-6 text-[10px] font-bold uppercase tracking-widest gap-2 bg-[#171717] text-white rounded-xl"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Banner
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {banners.length > 0 ? (
                      banners.map((banner) => (
                        <Card key={banner.id} className="relative group overflow-hidden border-slate-100 rounded-2xl shadow-sm hover:shadow-xl transition-all h-[200px]">
                           <div className="absolute inset-0 w-full h-full">
                             <Image 
                               src={banner.image_url} 
                               alt={banner.title || "Banner"} 
                               fill
                               className="object-cover transition-transform duration-700 group-hover:scale-110"
                               referrerPolicy="no-referrer"
                             />
                           </div>
                           <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 z-10">
                              <p className="text-white font-bold text-[12px] uppercase tracking-tight truncate mb-3">{banner.title || "Sem título"}</p>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className={cn("h-8 flex-1 text-[9px] font-black uppercase tracking-widest gap-2", banner.is_active ? "bg-emerald-500 text-white" : "bg-white text-slate-800 hover:bg-white/90")}
                                  onClick={() => handleToggleBanner(banner.id, banner.is_active)}
                                >
                                  {banner.is_active ? <Check className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                                  {banner.is_active ? "ATIVO" : "ATIVAR"}
                                </Button>
                                <Button 
                                  size="icon" 
                                  variant="ghost" 
                                  className="h-8 w-8 bg-rose-500/80 hover:bg-rose-500 text-white rounded-lg"
                                  onClick={() => handleDeleteBanner(banner.id, banner.image_url)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                           </div>
                           {!banner.is_active && (
                             <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-0">
                                <span className="bg-white/90 text-slate-800 text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">Inativo</span>
                             </div>
                           )}
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-3xl bg-slate-50/50">
                        <Tag className="w-10 h-10 text-slate-200 mb-4" />
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nenhum banner cadastrado</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Modal Gerenciar Mês (Central de Comandos) */}
      <Dialog open={isManageMonthModalOpen} onOpenChange={setIsManageMonthModalOpen}>
        <DialogContent showCloseButton={false} className="sm:max-w-[1000px] border-none rounded-3xl shadow-2xl overflow-hidden p-0 bg-slate-50">
          <div className="flex flex-col h-[600px]">
            {/* Header */}
            <div className="px-8 py-6 bg-white border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-[16px] font-black text-slate-800 uppercase tracking-tighter">
                    Gestão de Performance - {monthsList.find(m => m.id === selectedMonthForManage)?.name} / {selectedYearForManage}
                  </h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel de gerenciamento de metas e prêmios do período</p>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Supervisores Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-sky-500" />
                    <h3 className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wider">Metas por Supervisor</h3>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-[9px] uppercase tracking-widest rounded-lg h-8 gap-2"
                    onClick={() => {
                      setTeamMetaYear(selectedYearForManage!)
                      setTeamMetaMonth(selectedMonthForManage!)
                      setSelectedTeam("")
                      setTeamMetaValue("")
                      setIsSupervisorGoalModalOpen(true)
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Nova Meta Manager
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metas.filter(m => m.ano === selectedYearForManage && m.mes === selectedMonthForManage && m.tipo === 'time').length === 0 ? (
                    <div className="col-span-full py-4 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-300 uppercase">Nenhuma meta de supervisor definida</span>
                    </div>
                  ) : (
                    metas.filter(m => m.ano === selectedYearForManage && m.mes === selectedMonthForManage && m.tipo === 'time').map(meta => {
                      const supervisor = supervisoresList.find(s => s.id === meta.alvo_id)
                      return (
                        <Card key={meta.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase truncate pr-2">{supervisor?.nome || meta.alvo_nome || 'Não Encontrado'}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-sky-500" onClick={(e) => {
                                e.stopPropagation()
                                setSelectedTeam(meta.alvo_id || "")
                                setTeamMetaValue(formatCurrency((meta.valor_mensal * 100).toString()))
                                setTeamMetaMonth(meta.mes)
                                setTeamMetaYear(meta.ano)
                                // Handle edit...
                                setIsSupervisorGoalModalOpen(true)
                              }}><Pencil className="w-3 h-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-rose-500" onClick={(e) => {
                                e.stopPropagation()
                                handleGenericDelete('meta', meta.id)
                              }}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </div>
                          <div className="text-[14px] font-black text-slate-800">{formatCurrency((meta.valor_mensal * 100).toString())}</div>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Corretores Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Target className="w-5 h-5 text-amber-500" />
                    <h3 className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wider">Metas por Corretor</h3>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] uppercase tracking-widest rounded-lg h-8 gap-2"
                    onClick={() => {
                      setIndividualMetaYear(selectedYearForManage!)
                      setIndividualMetaMonth(selectedMonthForManage!)
                      setSelectedCorretor("")
                      setIndividualMetaValue("")
                      setIsBrokerGoalModalOpen(true)
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Nova Meta Corretor
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {metas.filter(m => m.ano === selectedYearForManage && m.mes === selectedMonthForManage && m.tipo === 'corretor').length === 0 ? (
                    <div className="col-span-full py-4 border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center">
                      <span className="text-[10px] font-bold text-slate-300 uppercase">Nenhuma meta de corretor definida</span>
                    </div>
                  ) : (
                    metas.filter(m => m.ano === selectedYearForManage && m.mes === selectedMonthForManage && m.tipo === 'corretor').map(meta => {
                      const corretor = corretoresList.find(c => c.id === meta.alvo_id)
                      return (
                        <Card key={meta.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:shadow-md transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase truncate pr-2">{corretor?.nome || meta.alvo_nome || 'Não Encontrado'}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-amber-500" onClick={(e) => {
                                e.stopPropagation()
                                setSelectedCorretor(meta.alvo_id || "")
                                setIndividualMetaValue(formatCurrency((meta.valor_mensal * 100).toString()))
                                setIndividualMetaMonth(meta.mes)
                                setIndividualMetaYear(meta.ano)
                                setIsBrokerGoalModalOpen(true)
                              }}><Pencil className="w-3 h-3" /></Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-rose-500" onClick={(e) => {
                                e.stopPropagation()
                                handleGenericDelete('meta', meta.id)
                              }}><Trash2 className="w-3 h-3" /></Button>
                            </div>
                          </div>
                          <div className="text-[14px] font-black text-slate-800">{formatCurrency((meta.valor_mensal * 100).toString())}</div>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Faixas Section */}
              <div className="space-y-4 pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-[12px] font-extrabold text-slate-700 uppercase tracking-wider">Faixas de Premiação ({selectedYearForManage})</h3>
                  </div>
                  <Button 
                    size="sm"
                    className="bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] uppercase tracking-widest rounded-lg h-8 gap-2"
                    onClick={() => {
                      setFaixaMetaForm({
                        id: null,
                        nome: "",
                        valor_minimo: "",
                        premio: "",
                        ativo: true,
                        ano: selectedYearForManage!
                      })
                      setIsFaixaMetaModalOpen(true)
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Nova Faixa
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {faixasMetas.filter(f => f.ano === selectedYearForManage).length === 0 ? (
                    <div className="col-span-full py-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2">
                       <Trophy className="w-8 h-8 text-slate-100" />
                      <span className="text-[10px] font-bold text-slate-300 uppercase">Nenhuma faixa de premiação para {selectedYearForManage}</span>
                    </div>
                  ) : (
                    faixasMetas.filter(f => f.ano === selectedYearForManage).map(faixa => (
                      <Card key={faixa.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:shadow-md transition-all relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-primary" onClick={(e) => {
                            e.stopPropagation()
                            setFaixaMetaForm({
                              id: faixa.id,
                              nome: faixa.nome,
                              valor_minimo: formatCurrency(((faixa.valor_minimo || 0) * 100).toString()),
                              premio: faixa.premio,
                              ativo: faixa.ativo !== false,
                              ano: faixa.ano
                            })
                            setIsFaixaMetaModalOpen(true)
                          }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-rose-500" onClick={(e) => {
                            e.stopPropagation()
                            handleGenericDelete('faixa_meta', faixa.id)
                          }}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            faixa.ativo !== false ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                          )}>
                            <Trophy className="w-5 h-5" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{faixa.nome}</h4>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-bold text-slate-400 uppercase">A partir de:</span>
                              <span className="text-[13px] font-black text-slate-900">{formatCurrency(((faixa.valor_minimo || 0) * 100).toString())}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-2 py-1.5 px-3 bg-slate-50 rounded-lg border border-slate-100">
                               <Gift className="w-3 h-3 text-emerald-500" />
                               <span className="text-[10px] font-bold text-slate-600 uppercase truncate max-w-[200px]">{faixa.premio}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-end">
              <Button 
                onClick={() => setIsManageMonthModalOpen(false)}
                className="bg-[#171717] hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-widest px-8 h-10 rounded-xl"
              >
                Concluir Configuração
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent className="sm:max-w-[425px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase">
              {currentStatusId ? 'Editar Status' : 'Novo Status'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome do Status</Label>
              <Input 
                id="nome" 
                placeholder="EX. EM ATENDIMENTO" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="h-10 bg-slate-50 border-slate-100 rounded-lg font-bold text-[12px] text-slate-700 focus-visible:ring-primary/20 transition-all uppercase placeholder:text-slate-400/60"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2 relative" ref={pickerTextoRef}>
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">Cor da Fonte</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPickerTexto(!showPickerTexto)
                      setShowPickerFundo(false)
                    }}
                    className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm flex-shrink-0 transition-transform active:scale-95"
                    style={{ backgroundColor: corTexto }}
                  />
                  <div className="flex-1 flex gap-2">
                    <Input 
                      value={corTexto.toUpperCase()}
                      onChange={(e) => setCorTexto(e.target.value)}
                      className="h-10 bg-slate-50 border-slate-100 rounded-lg font-mono font-bold text-[12px] text-slate-700 uppercase"
                      maxLength={7}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCorTexto("#FFFFFF")}
                      className="h-10 px-3 text-[10px] font-bold uppercase border-slate-200 text-slate-500"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                {showPickerTexto && (
                  <div className="absolute z-50 mt-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                    <HexColorPicker color={corTexto} onChange={setCorTexto} />
                    <div className="grid grid-cols-6 gap-2 mt-3">
                      {['#FFFFFF', '#000000', '#F8FAFC', '#64748B', '#EF4444', '#22C55E'].map((c) => (
                        <button 
                          key={c}
                          type="button"
                          className="w-6 h-6 rounded-md border border-slate-100"
                          style={{ backgroundColor: c }}
                          onClick={() => setCorTexto(c)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 relative" ref={pickerFundoRef}>
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 leading-none">Cor de Fundo</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPickerFundo(!showPickerFundo)
                      setShowPickerTexto(false)
                    }}
                    className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm flex-shrink-0 transition-transform active:scale-95"
                    style={{ backgroundColor: cor }}
                  />
                   <div className="flex-1 flex gap-2">
                    <Input 
                      value={cor.toUpperCase()}
                      onChange={(e) => setCor(e.target.value)}
                      className="h-10 bg-slate-50 border-slate-100 rounded-lg font-mono font-bold text-[12px] text-slate-700 uppercase"
                      maxLength={7}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setCor("#171717")}
                      className="h-10 px-3 text-[10px] font-bold uppercase border-slate-200 text-slate-500"
                    >
                      Limpar
                    </Button>
                  </div>
                </div>
                {showPickerFundo && (
                  <div className="absolute z-50 mt-2 p-3 bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200 right-0">
                    <HexColorPicker color={cor} onChange={setCor} />
                    <div className="grid grid-cols-6 gap-2 mt-3">
                      {['#171717', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'].map((c) => (
                        <button 
                          key={c}
                          type="button"
                          className="w-6 h-6 rounded-md border border-slate-100"
                          style={{ backgroundColor: c }}
                          onClick={() => setCor(c)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pré-visualização</span>
              <span 
                className="px-4 py-1.5 rounded-lg text-[11px] font-normal uppercase tracking-widest shadow-md transition-all scale-110"
                style={{ backgroundColor: cor, color: corTexto }}
              >
                {nome || "EXEMPLO STATUS"}
              </span>
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsModalOpen(false)}
                className="px-6 h-[34px] border-slate-200 bg-white text-slate-600 font-bold text-[9px] rounded-lg hover:bg-slate-100 transition-all uppercase tracking-widest"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="px-6 h-[34px] bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] rounded-lg gap-2 transition-all uppercase tracking-widest shadow-lg shadow-slate-200 min-w-[120px]"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : currentStatusId ? 'Atualizar' : 'Criar Status'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modal Genérico (Convenio, Banco, Operação) */}
      <Dialog open={isGenericModalOpen} onOpenChange={setIsGenericModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase">
              {genericId ? 'Editar' : 'Novo'} {genericType === 'convenio' ? 'Convênio' : genericType === 'banco' ? 'Banco' : 'Tipo de Operação'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleGenericSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="genericNome" className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome</Label>
              <Input 
                id="genericNome" 
                placeholder="DIGITE O NOME..." 
                value={genericNome}
                onChange={(e) => setGenericNome(e.target.value)}
                className="h-10 bg-slate-50 border-slate-100 rounded-lg font-bold text-[12px] text-slate-700 focus-visible:ring-primary/20 transition-all uppercase"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Status do Registro</Label>
                <p className="text-[9px] text-slate-400 font-medium uppercase">Ativar ou inativar para uso no sistema</p>
              </div>
              <button
                type="button"
                onClick={() => setGenericAtivo(!genericAtivo)}
                className={cn(
                  "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  genericAtivo ? "bg-primary" : "bg-slate-200"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    genericAtivo ? "translate-x-4" : "translate-x-0"
                  )}
                />
              </button>
            </div>
            
            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="outline" onClick={() => setIsGenericModalOpen(false)} className="px-6 h-[34px] border-slate-200 bg-white text-slate-600 font-bold text-[9px] rounded-lg uppercase tracking-widest">Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="px-6 h-[34px] bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] rounded-lg gap-2 min-w-[120px] uppercase tracking-widest shadow-lg shadow-slate-200">
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : genericId ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              Confirmar Exclusão
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-[12px] text-slate-600 font-medium leading-relaxed">
              Tem certeza que deseja excluir este <span className="font-bold text-slate-900">{deleteData?.label.toLowerCase()}</span>? 
              Esta ação é permanente e não poderá ser desfeita.
            </p>
          </div>
          
          <DialogFooter className="pt-2 gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)} 
              disabled={isDeleting}
              className="flex-1 h-[38px] border-slate-200 bg-white text-slate-600 font-bold text-[10px] rounded-xl uppercase tracking-widest hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 h-[38px] bg-rose-500 hover:bg-rose-600 text-white font-bold text-[10px] rounded-xl gap-2 uppercase tracking-widest shadow-lg shadow-rose-100"
            >
              {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal para Adicionar Convênio ao Banco */}
      <Dialog open={isAddConvenioModalOpen} onOpenChange={setIsAddConvenioModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase">
              Adicionar Convênio
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Banco</Label>
              <Input 
                value={selectedBancoForProd?.nome || ""} 
                readOnly
                className="h-10 bg-slate-50 border-slate-100 rounded-lg font-bold text-[12px] text-slate-400 uppercase cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Informe o Convênio</Label>
              <select
                className="w-full h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none uppercase"
                value={selectedConvenioForProd?.id || ""}
                onChange={(e) => {
                  const conv = convenios.find(c => c.id === e.target.value)
                  setSelectedConvenioForProd(conv || null)
                }}
              >
                <option value="">Selecione um convênio...</option>
                {convenios.filter(c => c.ativo !== false).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            
            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddConvenioModalOpen(false)} className="px-6 h-[34px] border-slate-200 bg-white text-slate-600 font-bold text-[9px] rounded-lg uppercase tracking-widest">Cancelar</Button>
              <Button 
                onClick={() => {
                  if (!selectedConvenioForProd) {
                    toast.error("Selecione um convênio")
                    return
                  }
                  // Check if already exists - Removido a pedido do usuário para permitir múltiplas tabelas
                  // const exists = produtosConfig.find(p => p.banco_id === selectedBancoForProd?.id && p.convenio_id === selectedConvenioForProd.id)
                  // if (exists) {
                  //   toast.error("Este convênio já está vinculado a este banco")
                  //   return
                  // }
                  setSelectedProductConfig(null)
                  setTempNomeTabela("")
                  setTempOperacoes([])
                  setTempPrazo("")
                  setTempCoeficiente("")
                  setTempPercentualProducao("")
                  setTempRegras([])
                  setIsAddConvenioModalOpen(false)
                  setIsAddOperacaoModalOpen(true)
                }}
                className="px-6 h-[34px] bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] rounded-lg gap-2 min-w-[120px] uppercase tracking-widest shadow-lg shadow-slate-200"
              >
                Próximo
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para Selecionar Operações */}
      <Dialog open={isAddOperacaoModalOpen} onOpenChange={setIsAddOperacaoModalOpen}>
        <DialogContent className="sm:max-w-[600px] border-none rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase">
              OPERAÇÕES PERMITIDAS E REGRA/COEFICIENTE
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Banco</Label>
                <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center font-bold text-[12px] text-slate-400 uppercase">
                  {selectedBancoForProd?.nome}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Convênio</Label>
                <div className="h-10 bg-slate-50 border border-slate-100 rounded-lg px-3 flex items-center font-bold text-[12px] text-slate-400 uppercase">
                  {selectedConvenioForProd?.nome}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold text-sky-500 uppercase tracking-widest pl-1">Identificação da Tabela</Label>
              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome da Tabela</Label>
                  <Input 
                    type="text"
                    value={tempNomeTabela}
                    onChange={(e) => setTempNomeTabela(e.target.value)}
                    placeholder="Ex: TABELA PLUS GOV SP"
                    className="h-10 bg-white border-slate-100 rounded-lg font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none uppercase"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[11px] font-bold text-sky-500 uppercase tracking-widest pl-1">Operações Permitidas</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 max-h-[200px] overflow-y-auto">
                {tiposOperacao.filter(o => o.ativo !== false).map((operacao) => (
                  <label 
                    key={operacao.id}
                    className="flex items-center gap-3 p-2 hover:bg-white rounded-lg transition-colors cursor-pointer group"
                  >
                    <div 
                      className={cn(
                        "w-4 h-4 rounded border transition-all flex items-center justify-center flex-shrink-0",
                        tempOperacoes.includes(operacao.id) ? "bg-primary border-primary shadow-sm" : "border-slate-300 bg-white"
                      )}
                    >
                      {tempOperacoes.includes(operacao.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <input 
                      type="checkbox" 
                      className="hidden"
                      checked={tempOperacoes.includes(operacao.id)}
                      onChange={() => {
                        if (tempOperacoes.includes(operacao.id)) {
                          setTempOperacoes(tempOperacoes.filter(id => id !== operacao.id))
                        } else {
                          setTempOperacoes([...tempOperacoes, operacao.id])
                        }
                      }}
                    />
                    <span className="text-[11px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors uppercase tracking-tight">
                      {operacao.nome}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] font-bold text-sky-500 uppercase tracking-widest pl-1">REGRA/COEFICIENTE</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (!tempPrazo || !tempCoeficiente || !tempPercentualProducao) {
                      toast.error("Preencha todos os campos da regra antes de adicionar");
                      return;
                    }
                    setTempRegras([...tempRegras, { 
                      prazo: tempPrazo, 
                      coeficiente: tempCoeficiente, 
                      percentual_producao: tempPercentualProducao 
                    }]);
                    setTempPrazo("");
                    setTempCoeficiente("");
                    setTempPercentualProducao("");
                  }}
                  className="h-7 px-3 text-[9px] font-bold bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100 rounded-lg uppercase tracking-widest gap-2"
                >
                  <Zap className="w-3 h-3" />
                  Adicionar Regra
                </Button>
              </div>

              {/* Lista de Regras Adicionadas */}
              {tempRegras.length > 0 && (
                <div className="space-y-2 mb-4">
                  {tempRegras.map((regra, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl shadow-sm group">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Prazo</span>
                          <span className="text-[11px] font-bold text-slate-700">{regra.prazo}x</span>
                        </div>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Coeficiente</span>
                          <span className="text-[11px] font-bold text-slate-700">{regra.coeficiente}</span>
                        </div>
                        <div className="w-[1px] h-6 bg-slate-100" />
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-slate-400 uppercase">Produção</span>
                          <span className="text-[11px] font-bold text-sky-600">{regra.percentual_producao}%</span>
                        </div>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setTempRegras(tempRegras.filter((_, i) => i !== index))}
                        className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Prazo</Label>
                  <Input 
                    type="number"
                    value={tempPrazo}
                    onChange={(e) => setTempPrazo(e.target.value)}
                    placeholder="Ex: 84"
                    className="h-10 bg-white border-slate-100 rounded-lg font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Coeficiente</Label>
                  <Input 
                    type="text"
                    value={tempCoeficiente}
                    onChange={(e) => setTempCoeficiente(e.target.value)}
                    placeholder="Ex: 0,0225"
                    className="h-10 bg-white border-slate-100 rounded-lg font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Percentual Produção</Label>
                  <Input 
                    type="text"
                    value={tempPercentualProducao}
                    onChange={(e) => setTempPercentualProducao(e.target.value)}
                    placeholder="Ex: 15,00"
                    className="h-10 bg-white border-slate-100 rounded-lg font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none uppercase"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="outline" onClick={() => setIsAddOperacaoModalOpen(false)} className="px-6 h-[34px] border-slate-200 bg-white text-slate-600 font-bold text-[9px] rounded-lg uppercase tracking-widest">Cancelar</Button>
              <Button 
                onClick={handleSaveProdutoConfig}
                disabled={isSubmitting}
                className="px-6 h-[34px] bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] rounded-lg gap-2 min-w-[120px] uppercase tracking-widest shadow-lg shadow-slate-200"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar Dados'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal Meta Anual */}
      <Dialog open={isAnnualGoalModalOpen} onOpenChange={setIsAnnualGoalModalOpen}>
        <DialogContent className="sm:max-w-[400px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Configurar Meta Anual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ano de Vigência</Label>
                <select
                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-primary/20 appearance-none uppercase"
                  value={annualGoalForm.ano}
                  onChange={(e) => setAnnualGoalForm({...annualGoalForm, ano: parseInt(e.target.value)})}
                  disabled={!!annualGoalForm.id}
                >
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Valor Total (R$) Anual</Label>
                <Input 
                  type="text" 
                  placeholder="R$ 0,00"
                  value={annualGoalForm.valor}
                  onChange={(e) => setAnnualGoalForm({...annualGoalForm, valor: formatCurrency(e.target.value)})}
                  className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-[13px] text-slate-700 uppercase"
                />
              </div>
            </div>
            {annualGoalForm.id && (
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Status da Campanha</span>
                  <span className="text-[8px] text-slate-400 uppercase">Ative ou desative este plano anual</span>
                </div>
                <button 
                  onClick={() => setAnnualGoalForm({...annualGoalForm, ativo: !annualGoalForm.ativo})}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black transition-all",
                    annualGoalForm.ativo ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-slate-200 text-slate-500"
                  )}
                >
                  {annualGoalForm.ativo ? "ATIVO" : "INATIVO"}
                </button>
              </div>
            )}
            <p className="text-[9px] text-slate-400 font-medium uppercase mt-1 pl-1 italic">
              {annualGoalForm.id ? "Alterar o valor anual serve como referência para o balanço mensalizado." : "Ao salvar, o valor será usado como balizador para as metas mensais."}
            </p>
            <DialogFooter className="pt-4 gap-3">
              <Button variant="outline" onClick={() => setIsAnnualGoalModalOpen(false)} className="flex-1 h-[38px] border-slate-200 text-slate-600 font-bold text-[9px] rounded-xl uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleSaveAnnualGoal} disabled={isSubmitting} className="flex-1 h-[38px] bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] rounded-xl min-w-[120px] uppercase tracking-widest shadow-lg">
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : annualGoalForm.id ? 'Atualizar Plano' : 'Criar Plano Anual'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Meta Supervisor */}
      <Dialog open={isSupervisorGoalModalOpen} onOpenChange={setIsSupervisorGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-500" />
              Meta Mensal Supervisor
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ano</Label>
                <div className="h-11 bg-slate-100 border border-slate-100 rounded-xl px-3 flex items-center font-bold text-[12px] text-slate-500 uppercase cursor-not-allowed">
                  {teamMetaYear}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mês de Vigência</Label>
                <select
                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none uppercase"
                  value={teamMetaMonth}
                  onChange={(e) => setTeamMetaMonth(parseInt(e.target.value))}
                >
                  {monthsList.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Selecionar Supervisor / Equipe</Label>
              <select
                className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20 appearance-none uppercase"
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
              >
                <option value="">Selecione um gestor...</option>
                {supervisoresList.map(s => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Valor da Meta Mensal (R$)</Label>
              <Input 
                type="text" 
                placeholder="R$ 0,00"
                value={teamMetaValue}
                onChange={(e) => setTeamMetaValue(formatCurrency(e.target.value))}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-[13px] text-slate-700 uppercase"
              />
            </div>
            <p className="text-[9px] text-slate-400 font-medium uppercase mt-1 pl-1">Meta referente ao mês selecionado.</p>
            <DialogFooter className="pt-4 gap-3">
              <Button variant="outline" onClick={() => setIsSupervisorGoalModalOpen(false)} className="px-6 h-[38px] border-slate-200 text-slate-600 font-bold text-[9px] rounded-xl uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleSaveSupervisorGoal} disabled={isSubmitting} className="px-6 h-[38px] bg-sky-500 hover:bg-sky-600 text-white font-bold text-[9px] rounded-xl min-w-[120px] uppercase tracking-widest shadow-lg shadow-sky-100">
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Definir Meta'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Meta Individual */}
      <Dialog open={isBrokerGoalModalOpen} onOpenChange={setIsBrokerGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-500" />
              Meta Mensal Individual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Ano</Label>
                <div className="h-11 bg-slate-100 border border-slate-100 rounded-xl px-3 flex items-center font-bold text-[12px] text-slate-500 uppercase cursor-not-allowed">
                  {individualMetaYear}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Mês de Vigência</Label>
                <select
                  className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none uppercase"
                  value={individualMetaMonth}
                  onChange={(e) => setIndividualMetaMonth(parseInt(e.target.value))}
                >
                  {monthsList.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Selecionar Corretor</Label>
              <select
                className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-3 font-bold text-[12px] text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none uppercase"
                value={selectedCorretor}
                onChange={(e) => setSelectedCorretor(e.target.value)}
              >
                <option value="">Selecione um vendedor...</option>
                {corretoresList.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Valor da Meta (R$)</Label>
              <Input 
                type="text" 
                placeholder="R$ 0,00"
                value={individualMetaValue}
                onChange={(e) => setIndividualMetaValue(formatCurrency(e.target.value))}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-[13px] text-slate-700 uppercase"
              />
            </div>
            <p className="text-[9px] text-slate-400 font-medium uppercase mt-1 pl-1">Meta referente ao mês selecionado.</p>
            <DialogFooter className="pt-4 gap-3">
              <Button variant="outline" onClick={() => setIsBrokerGoalModalOpen(false)} className="px-6 h-[38px] border-slate-200 text-slate-600 font-bold text-[9px] rounded-xl uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleSaveBrokerGoal} disabled={isSubmitting} className="px-6 h-[38px] bg-amber-500 hover:bg-amber-600 text-white font-bold text-[9px] rounded-xl min-w-[120px] uppercase tracking-widest shadow-lg shadow-amber-100">
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar Meta'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal CRUD Faixa Meta */}
      <Dialog open={isFaixaMetaModalOpen} onOpenChange={setIsFaixaMetaModalOpen}>
        <DialogContent className="sm:max-w-[425px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-500" />
              {faixaMetaForm.id ? 'Editar' : 'Nova'} Faixa de Meta e Prêmio
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome da Faixa</Label>
              <Input 
                placeholder="EX: FAIXA DIAMANTE"
                value={faixaMetaForm.nome}
                onChange={(e) => setFaixaMetaForm({...faixaMetaForm, nome: e.target.value})}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-[12px] text-slate-700 uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Valor Mínimo de Produção (R$)</Label>
              <Input 
                type="text" 
                placeholder="R$ 0,00"
                value={faixaMetaForm.valor_minimo}
                onChange={(e) => setFaixaMetaForm({...faixaMetaForm, valor_minimo: formatCurrency(e.target.value)})}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-[12px] text-slate-700 uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Prêmio ou Bonificação</Label>
              <Input 
                placeholder="EX: IPHONE 15 OU R$ 5.000,00"
                value={faixaMetaForm.premio}
                onChange={(e) => setFaixaMetaForm({...faixaMetaForm, premio: e.target.value})}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-[12px] text-slate-700 uppercase"
              />
            </div>
            
            {faixaMetaForm.id && (
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Status da Faixa</Label>
                  <p className="text-[9px] text-slate-400 font-medium uppercase">Ativar ou inativar para uso no sistema</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFaixaMetaForm({...faixaMetaForm, ativo: !faixaMetaForm.ativo})}
                  className={cn(
                    "relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    faixaMetaForm.ativo ? "bg-primary" : "bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      faixaMetaForm.ativo ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
            )}

            <DialogFooter className="pt-4 gap-3">
              <Button variant="outline" onClick={() => setIsFaixaMetaModalOpen(false)} className="px-6 h-[38px] border-slate-200 text-slate-600 font-bold text-[9px] rounded-xl uppercase tracking-widest">Cancelar</Button>
              <Button onClick={handleSaveFaixaMeta} disabled={isSubmitting} className="px-6 h-[38px] bg-[#171717] hover:bg-[#171717]/90 text-white font-bold text-[9px] rounded-xl min-w-[120px] uppercase tracking-widest shadow-lg shadow-slate-200">
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : faixaMetaForm.id ? 'Atualizar' : 'Criar Faixa'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Upload Banner */}
      <Dialog open={isBannerModalOpen} onOpenChange={setIsBannerModalOpen}>
        <DialogContent className="sm:max-w-[600px] border-none rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-extrabold text-slate-800 tracking-widest uppercase">
              Adicionar ao Carrossel de Banners
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleBannerSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Título da Campanha (Opcional)</Label>
              <Input 
                placeholder="EX. CAMPANHA DE JUNHO - MODALIDADE INSS"
                value={bannerForm.title}
                onChange={(e) => setBannerForm(prev => ({ ...prev, title: e.target.value }))}
                className="h-10 bg-slate-50 border-slate-100 rounded-xl font-bold text-[12px] uppercase"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Imagens do Banner (2560x1440) - Selecione várias</Label>
              
              <div className="grid grid-cols-2 gap-4">
                {bannerForm.images.map((item, index) => (
                  <div key={index} className="relative aspect-[2560/1440] rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg group">
                    <img src={item.preview} className="w-full h-full object-cover" alt={`Preview ${index + 1}`} />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button 
                        type="button"
                        variant="ghost"
                        onClick={() => setBannerForm(prev => ({ 
                          ...prev, 
                          images: prev.images.filter((_, i) => i !== index) 
                        }))}
                        className="text-white hover:text-rose-400"
                      >
                        <Trash2 className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center aspect-[2560/1440] border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100/50 hover:border-primary/30 transition-all cursor-pointer">
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <Plus className="w-6 h-6 text-slate-300 mb-2" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Adicionar Imagem</p>
                  </div>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      files.forEach(file => {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error(`Arquivo ${file.name} é muito grande (Limite 5MB).`)
                          return
                        }
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setBannerForm(prev => ({ 
                            ...prev, 
                            images: [...prev.images, { file, preview: reader.result as string }] 
                          }))
                        }
                        reader.readAsDataURL(file)
                      })
                    }}
                  />
                </label>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-50 gap-3">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsBannerModalOpen(false)}
                className="px-6 h-[40px] uppercase text-[10px] font-black border-slate-200 rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                disabled={isSubmitting}
                className="px-8 h-[40px] bg-[#171717] hover:bg-[#171717]/90 text-white font-black text-[10px] rounded-xl gap-3 transition-all uppercase tracking-widest shadow-xl shadow-slate-200 min-w-[160px]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Salvar Banner</>}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
