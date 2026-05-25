"use client"
 
import { useRouter } from "next/navigation"

import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"
import { 
  Users, 
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Copy
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { useState, useEffect, useCallback, Fragment } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"

interface Campaign {
  id: string;
  nome: string;
  created_at: string;
  publico_estimado: number;
  filtros: {
    convenio?: string;
    orgaos?: string[];
    situacoes?: string[];
    regimes?: string[];
    ufs?: string[];
    margemMin?: string;
    margemMax?: string;
    saldoMin?: string;
    saldoMax?: string;
    cardMargemMin?: string;
    cardBeneficioMin?: string;
    loanBanks?: string[];
    loanPrazoMin?: string;
    loanPrazoMax?: string;
    cardTypes?: string[];
    distribuicao?: string[];
    corretores_selecionados?: string[];
    idadeMin?: string;
    idadeMax?: string;
    sessoes_corretores?: Record<string, { entrou: string; saiu?: string | null }>;
  };
}

interface BrokerUser {
  id: string;
  nome: string;
  funcao?: string;
}

export default function DistribuicaoCampanhaPage() {
  const router = useRouter()
  const { user, perfil, isAdmin, isDeveloper } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [startedCampaigns, setStartedCampaigns] = useState<string[]>([])
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<BrokerUser[]>([])
  const [selectedCampaignForTeam, setSelectedCampaignForTeam] = useState<Campaign | null>(null)

  const canStart = !isAdmin && !isDeveloper && (
    perfil?.role === 'Corretor' || 
    perfil?.role === 'Estágio' || 
    perfil?.role === 'Estagio' ||
    perfil?.role === 'Processo Seletivo' ||
    perfil?.role === 'PROCESSO SELETIVO'
  );

  const isSupervisor = perfil?.role === 'Supervisor';

  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [monitoringData, setMonitoringData] = useState<Record<string, Record<string, { total: number; tabulacoes: Record<string, number>; last_active: string | null }>>>({});
  const [isLoadingMonitoring, setIsLoadingMonitoring] = useState<boolean>(false);

  // Modal para detalhamento de clientes tabulados
  const [selectedTabulationDetails, setSelectedTabulationDetails] = useState<{
    campaignId: string;
    campaignName: string;
    brokerId: string;
    brokerNome: string;
    tabName: string;
    campaignConvenio: string | undefined;
  } | null>(null);
  const [tabulationClients, setTabulationClients] = useState<{
    cpf: string;
    nome: string;
    telefone_1?: string | null;
    telefone_2?: string | null;
    telefone_3?: string | null;
  }[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState<boolean>(false);
  const [clientsError, setClientsError] = useState<string | null>(null);

  const handleTabulationClick = async (
    campaignId: string, 
    campaignName: string, 
    campaignConvenio: string | undefined,
    brokerId: string, 
    brokerNome: string, 
    tabName: string
  ) => {
    setSelectedTabulationDetails({
      campaignId,
      campaignName,
      brokerId,
      brokerNome,
      tabName,
      campaignConvenio
    });
    setIsLoadingClients(true);
    setTabulationClients([]);
    setClientsError(null);

    try {
      let query = supabase
        .from('campanha_atendimentos')
        .select('cliente_cpf')
        .eq('campanha_id', campaignId)
        .eq('corretor_id', brokerId);

      if (tabName === 'Não tabulado') {
        query = query.or('tabulacao.is.null,tabulacao.eq.Não tabulado');
      } else {
        query = query.eq('tabulacao', tabName);
      }

      const { data: atts, error: attError } = await query;
      if (attError) throw attError;

      if (!atts || atts.length === 0) {
        setTabulationClients([]);
        return;
      }

      const cpfs = atts.map(a => a.cliente_cpf).filter(Boolean);

      const cNameUpper = campaignName.toUpperCase();
      const convenioKey = campaignConvenio;

      const TABLE_MAP: Record<string, string> = {
        'siape': 'base_consulta_siape',
        'governo_sp': 'base_consulta_governo_sp',
        'prefeitura_sp': 'base_consulta_prefeitura_sp',
        'governo_pi': 'base_consulta_governo_pi',
        'governo_ma': 'base_consulta_governo_ma',
        'governo_rr': 'base_consulta_governo_rr',
      };

      let targetTable = 'base_consulta_siape';
      if (convenioKey && TABLE_MAP[convenioKey]) {
        targetTable = TABLE_MAP[convenioKey];
      } else if (cNameUpper.includes('GOVERNO SP')) {
        targetTable = 'base_consulta_governo_sp';
      } else if (cNameUpper.includes('PREFEITURA SP')) {
        targetTable = 'base_consulta_prefeitura_sp';
      } else if (cNameUpper.includes('GOVERNO PI')) {
        targetTable = 'base_consulta_governo_pi';
      } else if (cNameUpper.includes('GOVERNO MA')) {
        targetTable = 'base_consulta_governo_ma';
      } else if (cNameUpper.includes('RORAIMA') || cNameUpper.includes('RR')) {
        targetTable = 'base_consulta_governo_rr';
      }

      const { data: clientDetails, error: clientErr } = await supabase
        .from(targetTable)
        .select('cpf, nome, telefone_1, telefone_2, telefone_3')
        .in('cpf', cpfs);

      if (clientErr) throw clientErr;

      const mappedDetails = cpfs.map(cpf => {
        const found = clientDetails?.find(c => c.cpf === cpf);
        return {
          cpf,
          nome: found?.nome || 'CLIENTE NÃO ENCONTRADO NO BANCO',
          telefone_1: found?.telefone_1 || null,
          telefone_2: found?.telefone_2 || null,
          telefone_3: found?.telefone_3 || null,
        };
      });

      setTabulationClients(mappedDetails);
    } catch (err: unknown) {
      console.error("Erro ao buscar detalhes de clientes tabulados:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setClientsError(errMsg || "Ocorreu um erro ao carregar as informações do cliente.");
    } finally {
      setIsLoadingClients(false);
    }
  };

  const toggleCampaignExpansion = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
    } else {
      setExpandedCampaignId(campaignId);
      setIsLoadingMonitoring(true);
      try {
        const { data: attendances, error: fetchError } = await supabase
          .from('campanha_atendimentos')
          .select('*')
          .eq('campanha_id', campaignId);

        if (fetchError) throw fetchError;

        const brokerStats: Record<string, { total: number; tabulacoes: Record<string, number>; last_active: string | null }> = {};

        attendances?.forEach((att) => {
          const brokerId = att.corretor_id || 'unknown';
          if (!brokerStats[brokerId]) {
            brokerStats[brokerId] = {
              total: 0,
              tabulacoes: {},
              last_active: null
            };
          }

          brokerStats[brokerId].total += 1;
          
          const tab = att.tabulacao || 'Não tabulado';
          brokerStats[brokerId].tabulacoes[tab] = (brokerStats[brokerId].tabulacoes[tab] || 0) + 1;

          if (att.created_at) {
            if (!brokerStats[brokerId].last_active || new Date(att.created_at) > new Date(brokerStats[brokerId].last_active)) {
              brokerStats[brokerId].last_active = att.created_at;
            }
          }
        });

        setMonitoringData(prev => ({
          ...prev,
          [campaignId]: brokerStats
        }));
      } catch (err) {
        console.error("Erro ao carregar monitoramento:", err);
        toast.error("Erro ao carregar dados de monitoramento.");
      } finally {
        setIsLoadingMonitoring(false);
      }
    }
  };
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const handleStartCampaign = (campaignId: string) => {
    router.push(`/campanhas/atendimento/${campaignId}`)
  }

  const handleToggleActive = async (campaign: Campaign) => {
    try {
      const isCurrentlyActive = campaign.filtros?.ativa !== false;
      const newAtivaState = !isCurrentlyActive;
      const updatedFiltros = {
        ...(campaign.filtros || {}),
        ativa: newAtivaState
      };

      const { error: updateError } = await supabase
        .from('campanhas')
        .update({ filtros: updatedFiltros })
        .eq('id', campaign.id);

      if (updateError) throw updateError;

      toast.success(newAtivaState ? "Campanha ativada com sucesso!" : "Campanha desativada com sucesso!");
      fetchCampaigns();
    } catch (err: unknown) {
      console.error("Erro ao alterar status da campanha:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      toast.error(`Erro ao alterar status da campanha: ${errorMessage}`);
    }
  };

  // Access check removed - now accessible to all roles
  useEffect(() => {
    // Access is controlled by sidebar and supabase policies
  }, [perfil, isAdmin, isDeveloper, router])

  const fetchCampaigns = useCallback(async () => {
    if (!user || !perfil) return
    setIsLoading(true)
    setError(null)
    try {
      const query = supabase.from('campanhas').select('*')
      
      const { data, error: fetchError } = await query.order('created_at', { ascending: false })

      if (fetchError) throw fetchError
      
      let filteredData = data || []
      
      // Filter for only distributed campaigns
      filteredData = filteredData.filter(c => {
        const distribution = c.filtros?.distribuicao || []
        const brokers = c.filtros?.corretores_selecionados || []
        
        const isDistributed = (Array.isArray(distribution) && distribution.length > 0) || 
                             (Array.isArray(brokers) && brokers.length > 0)
        
        if (!isAdmin && !isDeveloper) {
          if (c.filtros?.ativa === false) return false;
          if (!isDistributed) return false;
          
          const userId = user.id
          const supervisorId = perfil.supervisor_id
          
          const isSelectedBroker = Array.isArray(brokers) && brokers.includes(userId);
          const isSelectedSupervisor = Array.isArray(distribution) && distribution.includes(userId);
          const isUnderSelectedSupervisor = !!(supervisorId && Array.isArray(distribution) && distribution.includes(supervisorId));

          if (Array.isArray(brokers) && brokers.length > 0) {
            return isSelectedBroker || isSelectedSupervisor;
          }
          
          return isSelectedSupervisor || isUnderSelectedSupervisor;
        }
        
        return isDistributed
      })

      setCampaigns(filteredData as Campaign[])

      // Fetch progress (which campaigns have at least 1 record for this user)
      try {
        const { data: progressData } = await supabase
          .from('campanha_atendimentos')
          .select('campanha_id')
          .eq('corretor_id', user.id)

        if (progressData) {
          const uniqueIds = Array.from(new Set(progressData.map(p => p.campanha_id)))
          setStartedCampaigns(uniqueIds)
        }
      } catch (err) {
        // Table might not exist yet if migration didn't run, ignore silenty
        console.warn("Could not fetch campaign progress:", err)
      }
    } catch (err: unknown) {
      console.error("Erro ao buscar campanhas distribuídas:", err)
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [user, perfil, isAdmin, isDeveloper])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await fetch('/api/usuarios')
        if (response.ok) {
          const data = await response.json()
          setAllUsers(data || [])
        }
      } catch (err) {
        console.error("Erro ao buscar usuários do sistema:", err)
      }
    }
    fetchAllUsers()
  }, [])

  const filteredCampaigns = campaigns.filter(c => 
    c.nome.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const paginatedCampaigns = filteredCampaigns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC]">
      <Header title="ACESSAR CAMPANHA" />
            <div className={cn(
         "p-4 lg:p-8 space-y-8 mx-auto w-full pb-20 transition-all duration-300",
         "max-w-[1400px]"
       )}>
         <Card className="card-shadow">
           <CardContent className="p-0">
             <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
               <div className="flex-1 w-full">
                 <Input 
                   placeholder="Buscar por nome da campanha..." 
                   className="h-10 text-[12px]"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   icon={<Search className="w-4 h-4 text-slate-400" />}
                 />
               </div>
               <div className="flex items-center gap-3 w-full md:w-auto">
                 <Button 
                   className="h-10 px-8 text-[12px] font-bold uppercase tracking-widest w-full md:w-auto"
                   onClick={fetchCampaigns}
                 >
                   Atualizar
                 </Button>
               </div>
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/50 border-b border-slate-50">
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Identificação</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Campanha</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest">Convênio</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-center">Público</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-center">Status</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-right">Ação</th>
                   </tr>
                 </thead>
                 <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 text-primary animate-spin" />
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Carregando campanhas liberadas...</p>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center justify-center gap-4 bg-red-50/30">
                          <Info className="w-10 h-10 text-red-400" />
                          <p className="text-sm font-bold text-red-500 uppercase tracking-widest text-center px-8">
                            Erro ao carregar: {error}
                          </p>
                          <Button variant="outline" onClick={fetchCampaigns} className="mt-2 border-red-200 text-red-500 hover:bg-red-100 rounded-xl">
                            Tentar Novamente
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-slate-300" />
                          </div>
                          <h3 className="text-[13px] font-black text-[#1C2643] mb-1 uppercase tracking-tight">Nenhuma Campanha Liberada</h3>
                          <p className="text-[11px] text-slate-500 max-w-sm">Você ainda não possui campanhas distribuídas para sua equipe.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedCampaigns.map((campaign) => {
                      const isStarted = startedCampaigns.includes(campaign.id);
                      const isExpanded = expandedCampaignId === campaign.id;
                      return (
                        <Fragment key={campaign.id}>
                          <tr className={cn(
                            "border-b border-slate-50 hover:bg-slate-50/50 transition-colors group",
                            isExpanded && "bg-slate-50/70 border-b-0"
                          )}>
                            <td className="px-8 py-5 text-[11px] font-bold text-slate-400 truncate max-w-[100px]">
                              {campaign.id.substring(0, 8)}...
                            </td>
                            <td className="px-8 py-5">
                              <div className="flex flex-col">
                                <span className="text-[12.5px] font-black text-slate-900 uppercase tracking-tight group-hover:text-primary transition-colors">
                                  {campaign.nome}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Liberada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2.5 py-1 bg-slate-100 rounded-md border border-slate-200/50">
                                {campaign.filtros?.convenio || 'Geral'}
                              </span>
                            </td>
                            <td className="px-8 py-5 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-[12.5px] font-black text-slate-900 tracking-tight">
                                  {(campaign.publico_estimado || 0).toLocaleString('pt-BR')}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CPFs</span>
                              </div>
                            </td>
                            <td className="px-8 py-5 text-center">
                              {campaign.filtros?.ativa === false ? (
                                <button 
                                  disabled={!isAdmin && !isDeveloper}
                                  onClick={() => (isAdmin || isDeveloper) && handleToggleActive(campaign)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100 uppercase tracking-widest text-[9px] font-black text-rose-600 outline-none select-none transition-all duration-150",
                                    (isAdmin || isDeveloper) ? "cursor-pointer hover:bg-rose-100 active:scale-95" : "cursor-default"
                                  )}
                                  title={(isAdmin || isDeveloper) ? "Clique para Ativar" : undefined}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span>Inativa</span>
                                </button>
                              ) : (
                                <button 
                                  disabled={!isAdmin && !isDeveloper}
                                  onClick={() => (isAdmin || isDeveloper) && handleToggleActive(campaign)}
                                  className={cn(
                                    "inline-flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-widest text-[9px] font-black text-emerald-600 outline-none select-none transition-all duration-150",
                                    (isAdmin || isDeveloper) ? "cursor-pointer hover:bg-emerald-100 active:scale-95" : "cursor-default"
                                  )}
                                  title={(isAdmin || isDeveloper) ? "Clique para Desativar" : undefined}
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  <span>Ativa</span>
                                </button>
                              )}
                            </td>
                            <td className="px-8 py-5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {canStart && (
                                  <Button 
                                    onClick={() => handleStartCampaign(campaign.id)}
                                    className={cn(
                                      "h-9 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm transition-all active:scale-95",
                                      isStarted 
                                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                                        : "bg-[#1C2643] text-white hover:bg-black shadow-slate-200"
                                    )}
                                  >
                                    {isStarted ? "Continuar" : "INICIAR"}
                                  </Button>
                                )}

                                {(isSupervisor || isAdmin || isDeveloper) && (
                                  <Button 
                                    onClick={() => toggleCampaignExpansion(campaign.id)}
                                    className={cn(
                                      "h-9 px-5 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-1.5",
                                      isExpanded 
                                        ? "bg-amber-600 text-white hover:bg-amber-700 shadow-amber-200" 
                                        : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100"
                                    )}
                                  >
                                    <span>MONITORAMENTO</span>
                                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {isExpanded && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={6} className="px-8 pb-6 pt-2">
                                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-5 h-5 text-[#1C2643]" />
                                      <span className="text-[12px] font-black uppercase tracking-widest text-[#1C2643]">
                                        Acompanhamento de Execução da Campanha
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                      {campaign.filtros?.corretores_selecionados?.length || 0} corretores selecionados
                                    </span>
                                  </div>

                                  {isLoadingMonitoring && !monitoringData[campaign.id] ? (
                                    <div className="flex items-center justify-center py-8 gap-2">
                                      <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando dados de execução...</span>
                                    </div>
                                  ) : (
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left text-[11px] font-sans border-collapse">
                                        <thead>
                                          <tr className="border-b border-slate-100 pb-2">
                                            <th className="font-bold text-slate-400 uppercase tracking-widest text-[8.5px] pb-3">Corretor</th>
                                            <th className="font-bold text-slate-400 uppercase tracking-widest text-[8.5px] pb-3">Presença</th>
                                            <th className="font-bold text-slate-400 uppercase tracking-widest text-[8.5px] pb-3 text-center">Entrou em</th>
                                            <th className="font-bold text-slate-400 uppercase tracking-widest text-[8.5px] pb-3 text-center">Saiu em</th>
                                            <th className="font-bold text-slate-400 uppercase tracking-widest text-[8.5px] pb-3 text-center">Clientes Trabalhados</th>
                                            <th className="font-bold text-slate-400 uppercase tracking-widest text-[8.5px] pb-3 pl-4">Tabulações Realizadas</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(() => {
                                            const brokersDef = campaign.filtros?.corretores_selecionados || [];
                                            const matchedBrokers = allUsers.filter(u => brokersDef.includes(u.id));

                                            if (brokersDef.length === 0) {
                                              return (
                                                <tr>
                                                  <td colSpan={6} className="py-6 text-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                                    Nenhum corretor associado a esta campanha.
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            const stats = monitoringData[campaign.id] || {};

                                            return matchedBrokers.map((broker) => {
                                              const brokerStats = stats[broker.id] || { total: 0, tabulacoes: {}, last_active: null };
                                              
                                              // Ativo se interagiu nos últimos 15 min
                                              const isBrokerActive = brokerStats.last_active 
                                                ? (new Date().getTime() - new Date(brokerStats.last_active).getTime()) < 15 * 60 * 1000
                                                : false;

                                              const tabulacoesEntries = Object.entries(brokerStats.tabulacoes);
                                               const _isBrokerPresentUnused = false; // sessao 
                                                 // ? (!!sessao.entrou && !sessao.saiu) 
                                                 // : isBrokerActive;
                                              const sessao = campaign.filtros?.sessoes_corretores?.[broker.id];
                                              const isBrokerPresent = sessao 
                                                ? (!!sessao.entrou && !sessao.saiu) 
                                                : isBrokerActive;
                                              const horaEntrada = sessao?.entrou 
                                                ? new Date(sessao.entrou).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                                                : "-";
                                              const horaSaida = sessao?.saiu 
                                                ? new Date(sessao.saiu).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                                                : "-";

                                              return (
                                                <tr key={broker.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                                  <td className="py-4 font-bold text-slate-700 capitalize text-left">
                                                    {broker.nome.toLowerCase()}
                                                  </td>
                                                  <td className="py-4">
                                                    {isBrokerPresent ? (
                                                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 uppercase tracking-widest text-[8.5px] font-black text-emerald-600">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                        Ativo
                                                      </span>
                                                    ) : (
                                                      <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 uppercase tracking-widest text-[8.5px] font-black text-slate-400">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                                        Inativo
                                                      </span>
                                                    )}
                                                  </td>
                                                  <td className="py-4 text-center text-[11px] font-mono text-slate-600 font-semibold">
                                                    {horaEntrada}
                                                  </td>
                                                  <td className="py-4 text-center text-[11px] font-mono text-slate-600 font-semibold">
                                                    {sessao?.saiu ? (
                                                      horaSaida
                                                    ) : isBrokerPresent ? (
                                                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-[9px] text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-bold uppercase animate-pulse">
                                                        Trabalhando...
                                                      </span>
                                                    ) : (
                                                      "-"
                                                    )}
                                                  </td>
                                                  <td className="py-4 text-center text-[13px] font-black text-slate-800">
                                                    {brokerStats.total}
                                                  </td>
                                                  <td className="py-4 pl-4 text-left">
                                                    {tabulacoesEntries.length === 0 ? (
                                                      <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Nenhuma atuação registrada</span>
                                                    ) : (
                                                      <div className="flex flex-wrap gap-2 justify-start">
                                                        {tabulacoesEntries.map(([tab, count]) => (
                                                          <span key={tab} onClick={() => handleTabulationClick(campaign.id, campaign.nome, campaign.filtros?.convenio, broker.id, broker.nome, tab)} className="inline-block bg-amber-50 hover:bg-amber-100 active:scale-95 transition-all border border-amber-200 rounded-lg px-2.5 py-1 text-[9.5px] font-bold text-amber-800 uppercase cursor-pointer select-none" title="Clique para ver clientes">
                                                            {tab}: <span className="font-black text-amber-900">{count}</span>
                                                          </span>
                                                        ))}
                                                      </div>
                                                    )}
                                                  </td>
                                                </tr>
                                              );
                                            });
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                 </tbody>
               </table>
             </div>
           </CardContent>
         </Card>
      {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => (
                <Button
                  key={i}
                  variant={currentPage === i + 1 ? "default" : "outline"}
                  className={cn(
                    "h-10 w-10 rounded-xl text-[10px] font-bold",
                    currentPage === i + 1 ? "bg-slate-900 border-slate-900 text-white" : "border-slate-200"
                  )}
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </Button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-slate-200"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {campaignToDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full border border-slate-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-[13px] font-black uppercase tracking-widest text-[#1C2643]">Confirmar Exclusão</h3>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider leading-relaxed font-sans">
              Deseja excluir esta campanha definitivamente? Essa ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setCampaignToDelete(null)}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl"
              >
                Cancelar
              </Button>
              <Button 
                onClick={async () => {
                  try {
                    const { error: deleteError } = await supabase
                      .from('campanhas')
                      .delete()
                      .eq('id', campaignToDelete);

                    if (deleteError) throw deleteError;

                    toast.success("Campanha excluída com sucesso!");
                    setCampaignToDelete(null);
                    fetchCampaigns();
                  } catch (err: unknown) {
                    console.error("Erro ao excluir campanha:", err);
                    const errorMessage = err instanceof Error ? err.message : String(err);
                    toast.error(`Erro ao excluir campanha: ${errorMessage}`);
                  }
                }}
                className="flex-1 h-10 text-[10px] font-black uppercase tracking-widest bg-rose-500 hover:bg-rose-600 text-white rounded-xl active:scale-95 transition-all"
              >
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedCampaignForTeam && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#1C2643]" />
                <h3 className="text-[13px] font-black uppercase tracking-widest text-[#1C2643]">Equipe da Campanha</h3>
              </div>
              <button 
                onClick={() => setSelectedCampaignForTeam(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 bg-slate-50 hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4 text-left">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Campanha</span>
                <span className="text-[14px] font-extrabold text-[#1C2643] uppercase">{selectedCampaignForTeam.nome}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Convênio</span>
                <span className="text-[10px] font-bold text-slate-600 px-2 py-0.5 bg-slate-100/50 border border-slate-200/50 rounded-md uppercase inline-block mt-0.5">
                  {selectedCampaignForTeam.filtros?.convenio || 'Geral'}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin text-left">
              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100 pb-1">Supervisores ({selectedCampaignForTeam.filtros?.distribuicao?.length || 0})</h4>
                {(() => {
                  const supsDef = selectedCampaignForTeam.filtros?.distribuicao || [];
                  const matchedSups = allUsers.filter(u => supsDef.includes(u.id));
                  
                  if (supsDef.length === 0) {
                    return <p className="text-[10px] text-slate-400 font-bold uppercase py-1">Nenhum supervisor distribuído</p>;
                  }
                  
                  return (
                    <div className="space-y-1">
                      {supsDef.map((userId) => {
                        const matchedUser = matchedSups.find(u => u.id === userId);
                        return (
                          <div key={userId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100/50">
                            <span className="text-[11px] font-bold text-slate-700 capitalize">{matchedUser ? matchedUser.nome.toLowerCase() : `ID: ${userId.substring(0, 8)}...`}</span>
                            <span className="text-[8.5px] font-black uppercase bg-amber-50 border border-amber-100 text-amber-600 px-2 py-0.5 rounded-md">Supervisor</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 border-b border-slate-100 pb-1">Corretores ({selectedCampaignForTeam.filtros?.corretores_selecionados?.length || 0})</h4>
                {(() => {
                  const brokersDef = selectedCampaignForTeam.filtros?.corretores_selecionados || [];
                  const matchedBrokers = allUsers.filter(u => brokersDef.includes(u.id));
                  
                  if (brokersDef.length === 0) {
                    return <p className="text-[10px] text-slate-400 font-bold uppercase py-1">Nenhum corretor selecionado</p>;
                  }
                  
                  return (
                    <div className="space-y-1">
                      {brokersDef.map((userId) => {
                        const matchedUser = matchedBrokers.find(u => u.id === userId);
                        return (
                          <div key={userId} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100/50">
                            <span className="text-[11px] font-bold text-slate-700 capitalize">{matchedUser ? matchedUser.nome.toLowerCase() : `ID: ${userId.substring(0, 8)}...`}</span>
                            <span className="text-[8.5px] font-black uppercase bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-md">Corretor</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-4">
              <Button 
                onClick={() => setSelectedCampaignForTeam(null)}
                className="h-10 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl bg-[#1C2643] text-white hover:bg-black active:scale-95 transition-all"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}

      {selectedTabulationDetails && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Detalhamento por Tabulação</span>
                <h3 className="text-[14px] font-black uppercase tracking-wider text-[#1C2643] mt-0.5">
                  Filtro: {selectedTabulationDetails.tabName}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedTabulationDetails(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 bg-slate-50 hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-left p-3 rounded-xl bg-slate-50/50 border border-slate-100">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Campanha</span>
                <span className="text-[12px] font-bold text-[#1C2643] uppercase line-clamp-1">{selectedTabulationDetails.campaignName}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Corretor</span>
                <span className="text-[12px] font-bold text-[#1C2643] capitalize block">{selectedTabulationDetails.brokerNome.toLowerCase()}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin text-left min-h-[250px] flex flex-col justify-start">
              {isLoadingClients ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 flex-1">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consultando dados dos clientes...</span>
                </div>
              ) : clientsError ? (
                <div className="flex flex-col items-center justify-center py-12 text-rose-500 gap-2 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest block font-black">Erro ao buscar clientes</span>
                  <span className="text-[10px] text-slate-500 text-center max-w-sm font-semibold">{clientsError}</span>
                </div>
              ) : tabulationClients.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-widest block font-black">Nenhum cliente encontrado</span>
                  <span className="text-[10px] uppercase font-semibold text-center max-w-xs block">Nenhum registro foi encontrado para esta tabulação específica.</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-[11px] font-sans border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-155">
                        <th className="px-4 py-3 font-bold text-[#1C2643] uppercase tracking-widest text-[8.5px]">CPF</th>
                        <th className="px-4 py-3 font-bold text-[#1C2643] uppercase tracking-widest text-[8.5px]">Nome</th>
                        <th className="px-4 py-3 font-bold text-[#1C2643] uppercase tracking-widest text-[8.5px]">Telefones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tabulationClients.map((client, idx) => {
                        const formattedCpf = client.cpf 
                          ? client.cpf.replace(/\D/g, "").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") 
                          : "-";
                        
                        return (
                          <tr key={`${client.cpf}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono text-slate-600 font-semibold tracking-wider whitespace-nowrap text-[11px]">
                              {formattedCpf}
                            </td>
                            <td className="px-4 py-3 font-black text-slate-800 capitalize text-[11px]">
                              {client.nome.toLowerCase()}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                {[client.telefone_1, client.telefone_2, client.telefone_3].filter(v => v && v !== '0' && v !== 'NÃO INFORMADO').length === 0 ? (
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">-</span>
                                ) : (
                                  [client.telefone_1, client.telefone_2, client.telefone_3].filter(v => v && v !== '0' && v !== 'NÃO INFORMADO').map((tel, tIdx) => {
                                    const cleanTel = tel?.replace(/\D/g, "");
                                    const formattedPhone = cleanTel 
                                      ? cleanTel.length === 11 
                                        ? `(${cleanTel.substring(0, 2)}) ${cleanTel.substring(2, 7)}-${cleanTel.substring(7, 11)}`
                                        : cleanTel.length === 10
                                          ? `(${cleanTel.substring(0, 2)}) ${cleanTel.substring(2, 6)}-${cleanTel.substring(6, 10)}`
                                          : tel
                                      : "-";

                                    return (
                                      <button
                                        key={tIdx}
                                        type="button"
                                        onClick={() => {
                                          if (!cleanTel) return;
                                          if (navigator?.clipboard?.writeText) {
                                            navigator.clipboard.writeText(cleanTel);
                                            toast.success(`Copiado: ${formattedPhone}`);
                                          } else {
                                            try {
                                              const textarea = document.createElement("textarea");
                                              textarea.value = cleanTel;
                                              textarea.style.position = "fixed";
                                              document.body.appendChild(textarea);
                                              textarea.select();
                                              document.execCommand("copy");
                                              document.body.removeChild(textarea);
                                              toast.success(`Copiado: ${formattedPhone}`);
                                            } catch (err) {
                                              toast.error("Erro ao copiar número.");
                                            }
                                          }
                                        }}
                                        className="inline-flex items-center gap-1.5 text-slate-600 hover:text-sky-600 focus:text-sky-600 transition-colors font-semibold text-[11px] font-mono group cursor-pointer border-none bg-transparent p-0 text-left focus:outline-none"
                                        title="Clique para copiar"
                                      >
                                        <Copy className="w-3 h-3 text-slate-400 group-hover:text-sky-500 group-focus:text-sky-500 transition-colors" />
                                        <span>{formattedPhone}</span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end mt-4">
              <Button 
                onClick={() => setSelectedTabulationDetails(null)}
                className="h-10 px-6 text-[10px] font-black uppercase tracking-widest rounded-xl bg-[#1C2643] text-white hover:bg-black active:scale-95 transition-all"
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
