"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"
import { 
  Target, 
  Loader2, 
  ChevronRight, 
  LogOut, 
  CheckCircle2, 
  MessageCircle
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "react-hot-toast"
import { translateOrgao } from "@/lib/orgaos-mapping"
import { getContractTypeInfo } from "@/lib/contratos-mapping"

// --- Interfaces ---
interface CampaignFilters {
  convenio?: string;
  orgaos?: string[];
  situacoes?: string[];
  regimes?: string[];
  ufs?: string[];
  corretores_selecionados?: string[];
}

interface Contract {
  id?: string;
  tipo: string;
  banco: string;
  orgao: string | null;
  numero_do_contrato: string;
  parcela: number;
  prazo: number;
}

interface Instituidor {
  id: string;
  nome: string | null;
  saldo_70?: number;
  margem_35?: number;
  bruta_5?: number;
  utilizada_5?: number;
  liquida_5?: number;
  beneficio_bruta_5?: number;
  beneficio_utilizada_5?: number;
  beneficio_liquida_5?: number;
  itens_credito?: Contract[];
}

interface Registration {
  id: string;
  numero_matricula: string;
  situacao_funcional: string | null;
  salario: number | null;
  orgao: string | null;
  regime_juridico: string | null;
  uf: string | null;
  instituidores?: Instituidor[];
  itens_credito?: Contract[];
}

interface ClientData {
  id: string;
  nome: string | null;
  cpf: string;
  data_nascimento: string | null;
  telefone_1: string | null;
  telefone_2: string | null;
  telefone_3: string | null;
}

interface Campaign {
  id: string;
  nome: string;
  filtros: CampaignFilters;
}

// --- Components ---

function InfoCard({ label, value, color = "default" }: { label: string; value: string | number | null; color?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className={cn("text-[13px] font-bold uppercase", color === "default" ? "text-slate-900" : "")}>{value || "NÃO INFORMADO"}</p>
    </div>
  )
}

function MarginCard({ label, value, status, type = "neutral" }: { label: string; value: string; status?: string; type: 'neutral' | 'success' | 'danger' | 'warning' }) {
  const colors = {
    neutral: "bg-slate-300/60 border-slate-400/40 text-slate-900 status-slate-400",
    success: "bg-emerald-100/50 border-emerald-200 text-emerald-700 status-emerald-600",
    danger: "bg-red-100/50 border-red-200 text-red-700 status-red-600",
    warning: "bg-orange-100/50 border-orange-200 text-orange-700 status-orange-400"
  }
  
  const selectedColor = colors[type]
  const statusColor = selectedColor.split('status-')[1]

  return (
    <div className={cn("p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]", selectedColor.split(' status-')[0])}>
      <div>
        <p className={cn("text-[9px] font-bold uppercase tracking-widest opacity-60")}>{label}</p>
        <p className="text-[17px] font-bold tracking-tight">{value}</p>
      </div>
      {status && (
        <div className="flex items-center gap-1.5">
          <div className={cn("w-1.5 h-1.5 rounded-full", `bg-${statusColor}`)}></div>
          <span className={cn("text-[8px] font-bold uppercase tracking-widest", `text-${statusColor}`)}>{status}</span>
        </div>
      )}
    </div>
  )
}

// --- Main Page ---

export default function CampanhaAtendimentoPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  
  const campaignId = params.id as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [currentLead, setCurrentLead] = useState<ClientData | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [activeRegIndex, setActiveRegIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Tabulation
  const [tabulacao, setTabulacao] = useState<string>("")
  const [observacao, setObservacao] = useState<string>("")
  
  // Stats
  const [completedCount, setCompletedCount] = useState(0)

  const loadNextLead = useCallback(async (camp: Campaign, offset: number) => {
    if (!user) return
    setCurrentLead(null)
    setRegistrations([])
    setActiveRegIndex(0)
    setTabulacao("")
    setObservacao("")

    try {
      const filters = camp.filtros
      const brokers = filters.corretores_selecionados || []
      const numBrokers = brokers.length || 1
      const myIndex = brokers.indexOf(user.id)
      const brokerRelIndex = myIndex === -1 ? 0 : myIndex // Fallback to 0 if not explicitly listed

      // Logic: Lead index in global sequence = (FinishedCount * NumBrokers) + myIndex
      const globalOffset = (offset * numBrokers) + brokerRelIndex
      
      // Determine table
      let table = 'base_consulta_siape'
      const campaignName = (camp.nome || "").toUpperCase()
      if (campaignName.includes("GOVERNO SP")) table = 'base_consulta_governo_sp'
      else if (campaignName.includes("PREFEITURA SP")) table = 'base_consulta_prefeitura_sp'
      else if (campaignName.includes("GOVERNO PI")) table = 'base_consulta_governo_pi'
      else if (campaignName.includes("GOVERNO MA")) table = 'base_consulta_governo_ma'
      
      // Build Query
      let query = supabase.from(table).select('*')
      
      // Apply Campaign Filters
      if (filters.ufs && filters.ufs.length > 0) query = query.in('uf', filters.ufs)
      if (filters.orgaos && filters.orgaos.length > 0) query = query.in('orgao', filters.orgaos)
      if (filters.situacoes && filters.situacoes.length > 0) query = query.in('situacao_funcional', filters.situacoes)
      
      // Sort and Offset
      query = query.order('cpf', { ascending: true }).range(globalOffset, globalOffset)
      
      const { data, error } = await query.maybeSingle()
      
      if (error) throw error
      
      if (data) {
        // Transform base data to ClientData and Fetch registrations
        const client: ClientData = {
          id: data.id || data.cpf,
          nome: data.nome,
          cpf: data.cpf,
          data_nascimento: data.data_nascimento,
          telefone_1: data.telefone_1,
          telefone_2: data.telefone_2 || data.telefone_recado,
          telefone_3: data.telefone_3
        }
        
        setCurrentLead(client)
        
        // Fetch detailed registrations if SIAPE
        if (table === 'base_consulta_siape') {
          const { data: regData } = await supabase
            .from('matriculas')
            .select('*, instituidores(*, itens_credito(*))')
            .eq('cliente_cpf', client.cpf)
          
          setRegistrations(regData || [])
        } else {
          // Wrapped generic data
          setRegistrations([{
            id: data.id || data.cpf,
            numero_matricula: data.numero_matricula || '---',
            situacao_funcional: data.situacao_funcional,
            salario: data.salario,
            orgao: data.orgao,
            regime_juridico: data.regime_juridico,
            uf: data.uf,
            instituidores: [{
               id: 'main',
               nome: data.orgao,
               saldo_70: data.saldo_70,
               margem_35: data.margem_35,
               bruta_5: data.bruta_5,
               utilizada_5: data.utilizada_5,
               liquida_5: data.liquida_5,
               beneficio_bruta_5: data.beneficio_bruta_5,
               beneficio_utilizada_5: data.beneficio_utilizada_5,
               beneficio_liquida_5: data.beneficio_liquida_5,
               itens_credito: []
            }]
          } as unknown as Registration])
        }
      } else {
        toast.info("Não há mais leads disponíveis nesta campanha seguindo a fila atual.")
      }
    } catch (err) {
      console.error("Erro ao carregar lead:", err)
      toast.error("Erro ao carregar próximo cliente.")
    }
  }, [user])

  const fetchCampaignAndProgress = useCallback(async () => {
    if (!user || !campaignId) return
    
    setIsLoading(true)
    try {
      // 1. Fetch Campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from('campanhas')
        .select('*')
        .eq('id', campaignId)
        .single()
      
      if (campaignError) throw campaignError
      setCampaign(campaignData)

      // 2. Count progress for this broker
      const { count, error: countError } = await supabase
        .from('campanha_atendimentos')
        .select('*', { count: 'exact', head: true })
        .eq('campanha_id', campaignId)
        .eq('corretor_id', user.id)
      
      if (countError) throw countError
      setCompletedCount(count || 0)
      
      // 3. Fetch next lead
      await loadNextLead(campaignData, count || 0)
      
    } catch (err: unknown) {
      console.error("Erro ao carregar campanha:", err)
      toast.error("Erro ao carregar dados da campanha.")
    } finally {
      setIsLoading(false)
    }
  }, [user, campaignId, loadNextLead])

  useEffect(() => {
    fetchCampaignAndProgress()
  }, [fetchCampaignAndProgress])

  const handleTabulateAndNext = async () => {
    if (!tabulacao) {
      toast.error("Por favor, selecione uma tabulação.")
      return
    }
    if (!currentLead || !campaign || !user) return
    
    setIsSubmitting(true)
    try {
      const { error } = await supabase.from('campanha_atendimentos').insert({
        campanha_id: campaign.id,
        corretor_id: user.id,
        cliente_cpf: currentLead.cpf,
        tabulacao,
        observacao
      })
      
      if (error) throw error
      
      toast.success("Atendimento registrado!")
      setCompletedCount(prev => prev + 1)
      await loadNextLead(campaign, completedCount + 1)
      
    } catch (err) {
      console.error("Erro ao salvar tabulação:", err)
      toast.error("Erro ao salvar atendimento.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExit = () => {
    router.push('/campanhas/distribuicao')
  }

  // --- Formatting Helpers Reused from pesquisa ---
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "R$ 0,00"
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const maskCPF = (cpf: string) => {
    if (!cpf) return ""
    return cpf.replace(/(\d{3})\d{6}(\d{2})/, "$1.***.***-$2")
  }

  const maskPhone = (phone: string | null) => {
    if (!phone || phone === '0') return "NÃO INFORMADO"
    return phone.replace(/\d{4}$/, "****")
  }

  const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const getUtilizadaStatus = (bruta: number | null | undefined, liquida: number | null | undefined) => {
    const b = bruta || 0;
    const l = liquida || 0;
    return Math.abs(l - b) > 0.01 ? "SIM" : "NÃO"
  }

  const handlePhoneClick = (phone: string | null | undefined) => {
    if (!phone || phone === '0' || phone === 'NÃO INFORMADO') return;
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${finalPhone}`, '_blank');
  };

  // --- Derived for UI ---
  const allRegs = useMemo(() => {
     return registrations.flatMap(reg => {
       if (!reg.instituidores || reg.instituidores.length === 0) {
         return [{ ...reg, currentInstituidor: reg.orgao ? translateOrgao(reg.orgao) : "NÃO INFORMADO", instituidorData: null }];
       }
       return reg.instituidores.map(inst => ({
         ...reg,
         currentInstituidor: inst.nome ? translateOrgao(inst.nome) : translateOrgao(reg.orgao || ""),
         instituidorData: inst
       }));
     })
  }, [registrations])

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="w-12 h-12 text-slate-300 animate-spin mb-4" />
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Carregando fila da campanha...</p>
      </div>
    )
  }

  if (!currentLead) {
    return (
       <div className="flex-1 flex flex-col bg-[#F8FAFC]">
         <Header title={campaign?.nome || "ATENDIMENTO"} />
         <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
           <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
             <CheckCircle2 className="w-10 h-10 text-emerald-500" />
           </div>
           <h3 className="text-xl font-black text-[#1C2643] mb-4 uppercase tracking-tight">Fila Concluída!</h3>
           <p className="text-sm text-slate-500 mb-8 font-medium">Você percorreu todos os leads disponíveis para você nesta campanha seguindo a rotação atual.</p>
           <Button onClick={handleExit} className="h-12 px-12 bg-[#171717] hover:bg-black rounded-2xl text-[11px] font-bold uppercase tracking-widest w-full">
             VOLTAR PARA CAMPANHAS
           </Button>
         </div>
       </div>
    )
  }

  const activeReg = allRegs[activeRegIndex]
  const activeInst = activeReg?.instituidorData

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] pb-12">
      <Header title={`${campaign?.nome || "ATENDIMENTO"}`} />
      
      {/* --- Action Bar (Floating Logic) --- */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-3 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl">
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-widest">{completedCount} Leads Finalizados</span>
            </div>
            <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex items-center gap-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tabulação:</span>
                 <Select value={tabulacao} onValueChange={setTabulacao}>
                   <SelectTrigger className="w-[200px] h-10 rounded-xl text-[10px] font-bold border-slate-200 bg-white">
                     <SelectValue placeholder="SELECIONE O STATUS" />
                   </SelectTrigger>
                   <SelectContent className="rounded-xl">
                     <SelectItem value="CLIENTE CHAMADO" className="text-[10px] font-bold">CLIENTE CHAMADO</SelectItem>
                     <SelectItem value="NÃO EXISTE WHATSAPP" className="text-[10px] font-bold">NÃO EXISTE WHATSAPP</SelectItem>
                     <SelectItem value="WHATSAPP DIVERGENTE" className="text-[10px] font-bold">WHATSAPP DIVERGENTE</SelectItem>
                   </SelectContent>
                 </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button 
                variant="outline" 
                onClick={handleExit}
                className="h-10 px-6 rounded-xl text-[10px] font-bold uppercase border-slate-200 hover:bg-slate-50 flex-1 md:flex-none"
            >
              <LogOut className="w-4 h-4 mr-2" /> SAIR
            </Button>
            <Button 
                onClick={handleTabulateAndNext}
                disabled={isSubmitting}
                className="h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100 flex-1 md:flex-none"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "PRÓXIMO CLIENTE"} <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLead.cpf}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Observação (Fixed on top of client data) */}
            <Card className="card-shadow border-slate-200 bg-blue-50/20">
                <CardContent className="p-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <MessageCircle className="w-3.5 h-3.5" /> Observações do Atendimento
                    </p>
                    <Textarea 
                        placeholder="Escreva detalhes sobre o contato (Opcional)..."
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        className="min-h-[80px] bg-white border-slate-200 rounded-xl text-[12px] font-medium"
                    />
                </CardContent>
            </Card>

            {/* Dados Pessoais */}
            <Card className="card-shadow border border-slate-200">
              <CardContent className="p-8 space-y-10">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                  <h3 className="text-[16px] font-bold text-slate-900">Perfil do Cliente</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                  <InfoCard label="Nome" value={currentLead.nome} />
                  <InfoCard label="CPF" value={maskCPF(currentLead.cpf)} />
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Nascimento</p>
                    <div className="flex flex-col">
                      <p className="text-[13px] font-bold text-slate-900">
                        {currentLead.data_nascimento ? new Date(currentLead.data_nascimento).toLocaleDateString('pt-BR') : "NÃO INFORMADO"}
                      </p>
                      {currentLead.data_nascimento && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{calculateAge(currentLead.data_nascimento)} Anos</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone Principal</p>
                    <div className="flex items-center gap-2">
                      <p 
                        className="text-[13px] font-bold text-slate-900 cursor-pointer hover:text-emerald-600 transition-colors"
                        onClick={() => handlePhoneClick(currentLead.telefone_1)}
                      >
                        {maskPhone(currentLead.telefone_1)}
                      </p>
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone 2</p>
                    <p className="text-[13px] font-bold text-slate-900">{maskPhone(currentLead.telefone_2)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone 3</p>
                    <p className="text-[13px] font-bold text-slate-900">{maskPhone(currentLead.telefone_3)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Matrículas Tabs */}
            {allRegs.length > 0 && (
              <div className="space-y-0">
                <div className="flex flex-wrap gap-1 px-8">
                  {allRegs.map((reg, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveRegIndex(idx)}
                      className={cn(
                        "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                        activeRegIndex === idx 
                          ? "bg-white border-slate-200 text-slate-900" 
                          : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                      )}
                    >
                      Matrícula {reg.numero_matricula}
                    </button>
                  ))}
                </div>

                {activeReg && (
                  <Card className="card-shadow border border-slate-200 rounded-tl-none">
                    <CardContent className="p-8 space-y-12">
                      <div className="space-y-10">
                        <div className="flex items-center gap-3">
                          <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                          <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações Funcionais</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-12">
                          <InfoCard label="Matrícula" value={activeReg.numero_matricula} />
                          <InfoCard label="Situação" value={activeReg.situacao_funcional} />
                          <InfoCard label="Salário" value={formatCurrency(activeReg.salario)} />
                          <InfoCard label="Vínculo / Instituidor" value={activeReg.currentInstituidor} />
                          <InfoCard label="Regime" value={activeReg.regime_juridico} />
                          <InfoCard label="Estado (UF)" value={activeReg.uf} />
                        </div>
                      </div>

                      {/* Margens */}
                      {activeInst && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <MarginCard label="Saldo 70%" value={formatCurrency(activeInst.saldo_70)} type="neutral" />
                          <MarginCard 
                            label="Margem 35%" 
                            value={formatCurrency(activeInst.margem_35)} 
                            type={(activeInst.margem_35 || 0) > 0 ? "success" : "danger"}
                            status={(activeInst.margem_35 || 0) > 0 ? "DISPONÍVEL" : "NÃO DISPONÍVEL"}
                          />
                          <MarginCard 
                            label="Soma Líquidas (5% + 5%)" 
                            value={formatCurrency((activeInst.liquida_5 || 0) + (activeInst.beneficio_liquida_5 || 0))} 
                            type="warning" 
                          />
                          
                          <MarginCard label="Bruta 5%" value={formatCurrency(activeInst.bruta_5)} type="neutral" />
                          <MarginCard 
                             label="Utilizada 5%" 
                             value={getUtilizadaStatus(activeInst.bruta_5, activeInst.liquida_5)} 
                             type={getUtilizadaStatus(activeInst.bruta_5, activeInst.liquida_5) === "SIM" ? "danger" : "success"}
                          />
                          <MarginCard 
                            label="Líquida 5%" 
                            value={formatCurrency(activeInst.liquida_5)} 
                            type={(activeInst.liquida_5 || 0) > 0 ? "success" : "danger"}
                            status={(activeInst.liquida_5 || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                          />
                        </div>
                      )}

                      {/* Contratos */}
                      {activeInst && activeInst.itens_credito && activeInst.itens_credito.length > 0 && (
                         <div className="space-y-8">
                            <div className="flex items-center gap-3">
                                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Contratos</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                        <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            <th className="pb-2 text-left">Banco</th>
                                            <th className="pb-2 text-center">Contrato</th>
                                            <th className="pb-2 text-center">Parcela</th>
                                            <th className="pb-2 text-center">Prazo</th>
                                            <th className="pb-2 text-right">Tipo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[12px] font-bold text-slate-700">
                                        {activeInst.itens_credito.map((c, i) => (
                                            <tr key={i} className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                                <td className="p-4 rounded-l-xl border-y border-l border-slate-100">{c.banco}</td>
                                                <td className="p-4 text-center border-y border-slate-100">{c.numero_do_contrato}</td>
                                                <td className="p-4 text-center border-y border-slate-100">{formatCurrency(c.parcela)}</td>
                                                <td className="p-4 text-center border-y border-slate-100">{c.prazo}</td>
                                                <td className="p-4 text-right rounded-r-xl border-y border-r border-slate-100">{getContractTypeInfo(c.tipo).label}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                         </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
