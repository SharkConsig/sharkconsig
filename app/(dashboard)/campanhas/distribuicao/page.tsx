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
  Copy,
  FileSpreadsheet
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { supabase } from "@/lib/supabase"
import { useState, useEffect, useCallback, Fragment } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

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

async function fetchClientDetailsFromAllTables(cpfs: string[]): Promise<{ cpf: string; nome: string; telefone_1?: string | null; telefone_2?: string | null; telefone_3?: string | null }[]> {
  if (cpfs.length === 0) return [];

  const TABLE_COLUMNS_MAP: Record<string, string> = {
    'base_consulta_siape': 'cpf, nome, telefone_1, telefone_2, telefone_3',
    'base_consulta_governo_sp': 'cpf, nome, telefone_1, telefone_2, telefone_3',
    'base_consulta_prefeitura_sp': 'cpf, nome, telefone_1, telefone_2, telefone_3',
    'base_consulta_governo_pi': 'cpf, nome, telefone_1, telefone_2, telefone_3',
    'base_consulta_governo_ma': 'cpf, nome, telefone_1',
    'base_consulta_governo_rr': 'cpf, nome, telefone_1, telefone_2, telefone_3'
  };

  const results: { cpf: string; nome: string; telefone_1?: string | null; telefone_2?: string | null; telefone_3?: string | null }[] = [];
  const foundCpfs = new Set<string>();

  const queries = Object.entries(TABLE_COLUMNS_MAP).map(async ([table, selectCols]) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(selectCols)
        .in('cpf', cpfs);
      if (error) {
        console.error(`Erro ao consultar ${table} para detalhes:`, error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error(`Falha ao carregar detalhes de ${table}:`, err);
      return [];
    }
  });

  const batches = await Promise.all(queries);
  for (const batch of batches) {
    for (const item of batch) {
      if (!foundCpfs.has(item.cpf)) {
        foundCpfs.add(item.cpf);
        const phoneObj = item as { telefone_1?: string | null; telefone_2?: string | null; telefone_3?: string | null };
        results.push({
          cpf: item.cpf,
          nome: item.nome,
          telefone_1: phoneObj.telefone_1,
          telefone_2: phoneObj.telefone_2 || null,
          telefone_3: phoneObj.telefone_3 || null
        });
      }
    }
  }

  return results;
}


export default function DistribuicaoCampanhaPage() {
  const router = useRouter()
  const { user, perfil, isAdmin, isDeveloper, isOperational } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [startedCampaigns, setStartedCampaigns] = useState<string[]>([])
  const [workedCounts, setWorkedCounts] = useState<Record<string, number>>({})
  const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<BrokerUser[]>([])
  const [selectedCampaignForTeam, setSelectedCampaignForTeam] = useState<Campaign | null>(null)

  const canStart = !isAdmin && !isDeveloper && !isOperational && (
    perfil?.role === 'Corretor' || 
    perfil?.role === 'Estágio' || 
    perfil?.role === 'Estagio' ||
    perfil?.role === 'Processo Seletivo' ||
    perfil?.role === 'PROCESSO SELETIVO'
  );

  const isSupervisor = perfil?.role === 'Supervisor';

  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [monitoringData, setMonitoringData] = useState<Record<string, Record<string, { total: number; tabulacoes: Record<string, number>; last_active: string | null; entrou?: string | null; saiu?: string | null; isOnline?: boolean }>>>({});
  const [isLoadingMonitoring, setIsLoadingMonitoring] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Modal para detalhamento de clientes tabulados
  const [selectedTabulationDetails, setSelectedTabulationDetails] = useState<{
    campaignId: string;
    campaignName: string;
    brokerId: string;
    brokerNome: string;
    tabName: string;
    campaignConvenio: string | undefined;
  } | null>(null);

  // Relatório de sessões do corretor
  const [sessionReportUser, setSessionReportUser] = useState<{
    campaignId: string;
    campaignName: string;
    brokerId: string;
    brokerNome: string;
    history: Array<{ entrou: string; saiu?: string | null }>;
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

  const [exportDropdownCampaignId, setExportDropdownCampaignId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const handleExportTabulation = async (campaign: Campaign, tabName: string) => {
    const key = `${campaign.id}-${tabName}`;
    setIsExporting(key);
    
    try {
      const { data: atendimentos, error: attErr } = await supabase
        .from('campanha_atendimentos')
        .select('cliente_cpf, corretor_id, created_at')
        .eq('campanha_id', campaign.id)
        .eq('tabulacao', tabName)
        .neq('cliente_cpf', '00000000000');
      
      if (attErr) throw attErr;

      if (!atendimentos || atendimentos.length === 0) {
        toast.error(`Nenhum cliente encontrado com a tabulação "${tabName}" nesta campanha.`);
        setIsExporting(null);
        return;
      }

      const cpfToAtendimentoMap = new Map<string, { brokerId: string; date: string }>();
      atendimentos.forEach(a => {
        if (a.cliente_cpf) {
          const existing = cpfToAtendimentoMap.get(a.cliente_cpf);
          if (!existing || new Date(a.created_at) > new Date(existing.date)) {
            cpfToAtendimentoMap.set(a.cliente_cpf, {
              brokerId: a.corretor_id || '',
              date: a.created_at
            });
          }
        }
      });

      const uniqueCpfs = Array.from(cpfToAtendimentoMap.keys());

      const cNameUpper = campaign.nome.toUpperCase();
      const convenioKey = campaign.filtros?.convenio;

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

      const clientsBatchList: { cpf: string; nome: string; telefone_1?: string | null; telefone_2?: string | null; telefone_3?: string | null }[] = [];
      const batchSize = 500;
      for (let i = 0; i < uniqueCpfs.length; i += batchSize) {
        const batchCpfs = uniqueCpfs.slice(i, i + batchSize);
        let clientDetailsOfBatch;
        if (convenioKey === 'importado' || convenioKey === 'multi' || convenioKey === 'detect') {
          clientDetailsOfBatch = await fetchClientDetailsFromAllTables(batchCpfs);
        } else {
          const { data: details, error: clientErr } = await supabase
            .from(targetTable)
            .select('cpf, nome, telefone_1, telefone_2, telefone_3')
            .in('cpf', batchCpfs);
          if (clientErr) throw clientErr;
          clientDetailsOfBatch = details || [];
        }
        clientsBatchList.push(...clientDetailsOfBatch);
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Tabulação - ${tabName.substring(0, 20)}`);

      worksheet.columns = [
        { header: 'CPF CLIENTE', key: 'cpf', width: 20 },
        { header: 'NOME CLIENTE', key: 'nome', width: 40 },
        { header: 'TELEFONE 1', key: 'tel1', width: 20 },
        { header: 'TELEFONE 2', key: 'tel2', width: 20 },
        { header: 'TELEFONE 3', key: 'tel3', width: 20 },
        { header: 'CORRETOR', key: 'corretor', width: 30 },
        { header: 'DATA ATENDIMENTO', key: 'data', width: 25 },
      ];

      uniqueCpfs.forEach(cpf => {
        const detail = clientsBatchList.find(c => c.cpf === cpf);
        const attInfo = cpfToAtendimentoMap.get(cpf);
        const brokerUser = allUsers.find(u => u.id === attInfo?.brokerId);

        worksheet.addRow({
          cpf,
          nome: detail?.nome || 'CHAVE NÃO LOCALIZADA NO BANCO',
          tel1: detail?.telefone_1 || '',
          tel2: detail?.telefone_2 || '',
          tel3: detail?.telefone_3 || '',
          corretor: brokerUser?.nome || 'Não identificado',
          data: attInfo?.date ? new Date(attInfo.date).toLocaleString('pt-BR') : '',
        });
      });

      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1C2643' }
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const fileNameStr = `Export_${campaign.nome.replace(/\s+/g, '_')}_${tabName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      saveAs(blob, fileNameStr);
      toast.success("Excel gerado e baixado com sucesso!");
    } catch (err) {
      console.error("Erro ao exportar:", err);
      toast.error("Ocorreu um erro ao exportar a planilha.");
    } finally {
      setIsExporting(null);
    }
  };

  const fetchBrokerHistory = async (campaignId: string, brokerId: string) => {
    try {
      const { data, error } = await supabase
        .from('campanha_atendimentos')
        .select('created_at, tabulacao')
        .eq('campanha_id', campaignId)
        .eq('corretor_id', brokerId)
        .eq('cliente_cpf', '00000000000')
        .in('tabulacao', ['ENTROU', 'SAIU']);

      if (error) throw error;

      const sorted = (data || []).slice().sort((a, b) => {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      const builtHistory: { entrou: string; saiu?: string | null }[] = [];
      sorted.forEach(row => {
        if (row.tabulacao === 'ENTROU') {
          // Se o último ainda estiver aberto, fecha-o automaticamente no momento do novo login/entrada (auto-close)
          if (builtHistory.length > 0) {
            const lastIndex = builtHistory.length - 1;
            if (!builtHistory[lastIndex].saiu) {
              builtHistory[lastIndex].saiu = row.created_at;
            }
          }
          builtHistory.push({ entrou: row.created_at, saiu: null });
        } else if (row.tabulacao === 'SAIU') {
          if (builtHistory.length > 0) {
            const lastIndex = builtHistory.length - 1;
            if (!builtHistory[lastIndex].saiu) {
              builtHistory[lastIndex].saiu = row.created_at;
            } else {
              builtHistory.push({ entrou: row.created_at, saiu: row.created_at });
            }
          } else {
            builtHistory.push({ entrou: row.created_at, saiu: row.created_at });
          }
        }
      });

      return builtHistory;
    } catch (err) {
      console.error("Erro ao carregar histórico da tabela campanha_atendimentos:", err);
      return [];
    }
  };

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
        .eq('corretor_id', brokerId)
        .neq('cliente_cpf', '00000000000');

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

      let clientDetails;
      if (convenioKey === 'importado' || convenioKey === 'multi' || convenioKey === 'detect') {
        clientDetails = await fetchClientDetailsFromAllTables(cpfs);
      } else {
        const { data: details, error: clientErr } = await supabase
          .from(targetTable)
          .select('cpf, nome, telefone_1, telefone_2, telefone_3')
          .in('cpf', cpfs);
        if (clientErr) throw clientErr;
        clientDetails = details || [];
      }

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

  const refreshMonitoringData = useCallback(async (campaignId: string, silent = false) => {
    if (!silent) {
      setIsLoadingMonitoring(true);
    }
    try {
      const { data: attendances, error: fetchError } = await supabase
        .from('campanha_atendimentos')
        .select('*')
        .eq('campanha_id', campaignId);

      if (fetchError) throw fetchError;

      const brokerStats: Record<string, { total: number; tabulacoes: Record<string, number>; last_active: string | null; entrou: string | null; saiu: string | null; isOnline: boolean }> = {};

      const sortedAtts = (attendances || []).slice().sort((a, b) => {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      });

      sortedAtts.forEach((att) => {
        const brokerId = att.corretor_id || 'unknown';
        if (!brokerStats[brokerId]) {
          brokerStats[brokerId] = {
            total: 0,
            tabulacoes: {},
            last_active: null,
            entrou: null,
            saiu: null,
            isOnline: false
          };
        }

        if (att.cliente_cpf === '00000000000') {
          if (att.tabulacao === 'ENTROU') {
            brokerStats[brokerId].entrou = att.created_at;
            brokerStats[brokerId].saiu = null;
            brokerStats[brokerId].isOnline = true;
          } else if (att.tabulacao === 'SAIU') {
            brokerStats[brokerId].saiu = att.created_at;
            brokerStats[brokerId].isOnline = false;
          }
        } else {
          brokerStats[brokerId].total += 1;
          const tab = att.tabulacao || 'Não tabulado';
          brokerStats[brokerId].tabulacoes[tab] = (brokerStats[brokerId].tabulacoes[tab] || 0) + 1;

          if (att.created_at) {
            if (!brokerStats[brokerId].last_active || new Date(att.created_at) > new Date(brokerStats[brokerId].last_active)) {
              brokerStats[brokerId].last_active = att.created_at;
            }
          }
        }
      });

      setMonitoringData(prev => ({
        ...prev,
        [campaignId]: brokerStats
      }));
    } catch (err) {
      console.error("Erro ao carregar monitoramento:", err);
      if (!silent) {
        toast.error("Erro ao carregar dados de monitoramento.");
      }
    } finally {
      if (!silent) {
        setIsLoadingMonitoring(false);
      }
    }
  }, []);

  const toggleCampaignExpansion = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
    } else {
      setExpandedCampaignId(campaignId);
      const isAlreadyMonitoring = !!monitoringData[campaignId];
      await refreshMonitoringData(campaignId, isAlreadyMonitoring);
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

  const fetchCampaigns = useCallback(async (silent = false) => {
    if (!user || !perfil) return
    if (!silent) {
      setIsLoading(true)
      setError(null)
    }
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
        
        if (!isAdmin && !isDeveloper && !isOperational) {
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

      // Fetch worked counts for all active campaigns
      try {
        const campaignIds = filteredData.map(c => c.id)
        if (campaignIds.length > 0) {
          const { data: countRecords } = await supabase
            .from('campanha_atendimentos')
            .select('campanha_id')
            .in('campanha_id', campaignIds)
            .neq('cliente_cpf', '00000000000')

          const counts: Record<string, number> = {}
          if (countRecords) {
            countRecords.forEach(r => {
              counts[r.campanha_id] = (counts[r.campanha_id] || 0) + 1
            })
          }
          setWorkedCounts(counts)
        } else {
          setWorkedCounts({})
        }
      } catch (countErr) {
        console.warn("Could not fetch campaign worked counts:", countErr)
      }
    } catch (err: unknown) {
      console.error("Erro ao buscar campanhas distribuídas:", err)
      if (!silent) {
        const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
        setError(errorMsg)
      }
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }, [user, perfil, isAdmin, isDeveloper, isOperational])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  // Polling interval to auto-refresh campaign and monitoring stats in near real-time (every 5 seconds)
  useEffect(() => {
    if (!expandedCampaignId) return;

    const intervalId = setInterval(() => {
      fetchCampaigns(true);
      refreshMonitoringData(expandedCampaignId, true);
    }, 5000);

    return () => clearInterval(intervalId);
  }, [expandedCampaignId, fetchCampaigns, refreshMonitoringData]);

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
                      <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-center">À Trabalhar</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-center">Status</th>
                     <th className="px-8 py-4 text-[8.5px] font-semibold text-slate-400 uppercase tracking-widest text-right">Ação</th>
                   </tr>
                 </thead>
                 <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <Loader2 className="w-10 h-10 text-primary animate-spin" />
                          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Carregando campanhas liberadas...</p>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className="px-8 py-20 text-center">
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
                      <td colSpan={7} className="px-8 py-20 text-center">
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
                              {(() => {
                                const totalWorked = workedCounts[campaign.id] || 0;
                                const publico = campaign.publico_estimado || 0;
                                const toWork = Math.max(0, publico - totalWorked);
                                return (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[12.5px] font-black text-[#1C2643] tracking-tight">
                                      {toWork.toLocaleString('pt-BR')}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CPFs</span>
                                  </div>
                                );
                              })()}
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

                                {(isSupervisor || isAdmin || isDeveloper || isOperational) && (
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
                              <td colSpan={7} className="px-8 pb-6 pt-2">
                                <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-5 h-5 text-[#1C2643]" />
                                      <span className="text-[12px] font-black uppercase tracking-widest text-[#1C2643]">
                                        Acompanhamento de Execução da Campanha
                                      </span>
                                    </div>
                                    {(() => {
                                      const brokersDef = campaign.filtros?.corretores_selecionados || [];
                                      const matchedBrokers = allUsers.filter(u => brokersDef.includes(u.id));
                                      const stats = monitoringData[campaign.id] || {};
                                      const totalTrabalhados = matchedBrokers.reduce((acc, b) => acc + (stats[b.id]?.total || 0), 0);
                                      return (
                                        <div className="flex items-center gap-4 relative">
                                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            {brokersDef.length} corretores selecionados
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider border-l border-slate-200 pl-4">
                                            {totalTrabalhados} clientes trabalhados
                                          </span>

                                          {(isAdmin || isDeveloper || isOperational || isSupervisor) && (
                                            <div className="relative flex items-center border-l border-slate-200 pl-4">
                                              <button
                                                onClick={() => {
                                                  setExportDropdownCampaignId(exportDropdownCampaignId === campaign.id ? null : campaign.id);
                                                }}
                                                className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-100 hover:text-slate-900 rounded-lg transition-all duration-150 border border-slate-200/80 bg-white shadow-sm cursor-pointer"
                                                id={`btn-export-${campaign.id}`}
                                                title="Exportar clientes por tabulação"
                                              >
                                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                                <span>Exportar</span>
                                                <ChevronDown className="w-3 h-3 text-slate-400" />
                                              </button>

                                              {exportDropdownCampaignId === campaign.id && (
                                                <>
                                                  {/* Backdrop standard overlay to dismiss on click */}
                                                  <div 
                                                    className="fixed inset-0 z-40" 
                                                    onClick={() => setExportDropdownCampaignId(null)}
                                                  />
                                                  
                                                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-slate-300 shadow-2xl rounded-xl p-2.5 z-50 animate-in fade-in-50 slide-in-from-top-1 duration-150 max-h-64 flex flex-col">
                                                    <p className="text-[9px] font-black uppercase text-slate-400 px-2 py-1.5 border-b border-slate-100 tracking-wider">
                                                      Selecione a Tabulação
                                                    </p>
                                                    <div className="overflow-y-auto mt-1.5 space-y-0.5 flex-1 pr-1 scrollbar-thin">
                                                      {(() => {
                                                        const appliedSet = new Set<string>();
                                                        const bStats = stats;
                                                        Object.values(bStats).forEach((bStat) => {
                                                          if (bStat.tabulacoes) {
                                                            Object.keys(bStat.tabulacoes).forEach(tab => {
                                                              if (tab && tab !== 'Não tabulado') {
                                                                appliedSet.add(tab);
                                                              }
                                                            });
                                                          }
                                                        });
                                                        
                                                        const defaultTabs = ["CLIENTE CHAMADO", "NÃO EXISTE WHATSAPP", "WHATSAPP DIVERGENTE"];
                                                        const allAvailableTabs = Array.from(new Set([...defaultTabs, ...Array.from(appliedSet)]));

                                                        return allAvailableTabs.map((tabName) => {
                                                          const key = `${campaign.id}-${tabName}`;
                                                          const isCurrentExporting = isExporting === key;
                                                          return (
                                                            <button
                                                              key={tabName}
                                                              disabled={!!isExporting}
                                                              onClick={async () => {
                                                                await handleExportTabulation(campaign, tabName);
                                                                setExportDropdownCampaignId(null);
                                                              }}
                                                              className="w-full text-left px-2 py-1.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors flex items-center justify-between disabled:opacity-50 cursor-pointer"
                                                            >
                                                              <span className="truncate pr-2">{tabName}</span>
                                                              {isCurrentExporting ? (
                                                                <Loader2 className="w-3 h-3 animate-spin text-slate-400 flex-shrink-0" />
                                                              ) : (
                                                                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0" />
                                                              )}
                                                            </button>
                                                          );
                                                        });
                                                      })()}
                                                    </div>
                                                  </div>
                                                </>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
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
                                            <th className="font-bold text-slate-400 uppercase tracking-widest text-[8.5px] pb-3 text-center px-4">Histórico</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(() => {
                                            const brokersDef = campaign.filtros?.corretores_selecionados || [];
                                            const matchedBrokers = allUsers.filter(u => brokersDef.includes(u.id));

                                            if (brokersDef.length === 0) {
                                              return (
                                                <tr>
                                                  <td colSpan={7} className="py-6 text-center text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                                    Nenhum corretor associado a esta campanha.
                                                  </td>
                                                </tr>
                                              );
                                            }

                                            const stats = monitoringData[campaign.id] || {};

                                            return matchedBrokers.map((broker) => {
                                              const bStats = stats[broker.id] || { total: 0, tabulacoes: {}, last_active: null, entrou: null, saiu: null, isOnline: false };
                                              const brokerStats = bStats;
                                              
                                              // Ativo se interagiu nos últimos 15 min
                                              const isBrokerActive = brokerStats.last_active 
                                                ? (new Date().getTime() - new Date(brokerStats.last_active).getTime()) < 15 * 60 * 1000
                                                : false;

                                              const tabulacoesEntries = Object.entries(brokerStats.tabulacoes);
                                               const _isBrokerPresentUnused = false; // sessao 
                                                 // ? (!!sessao.entrou && !sessao.saiu) 
                                                 // : isBrokerActive;
                                              const sessao = campaign.filtros?.sessoes_corretores?.[broker.id];
                                              const finalIsBrokerPresent = bStats.isOnline || (sessao?.entrou && !sessao?.saiu);
                                              const finalHoraEntrada = bStats.entrou 
                                                ? new Date(bStats.entrou).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                                                : (sessao?.entrou
                                                   ? new Date(sessao.entrou).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                                   : "-");
                                              const finalHoraSaida = bStats.saiu 
                                                ? new Date(bStats.saiu).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                                                : (sessao?.saiu
                                                   ? new Date(sessao.saiu).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                                   : "-");
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
                                                    {finalIsBrokerPresent ? (
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
                                                    {finalHoraEntrada}
                                                  </td>
                                                  <td className="py-4 text-center text-[11px] font-mono text-slate-600 font-semibold">
                                                    {finalIsBrokerPresent ? (
                                                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-[9px] text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-bold uppercase animate-pulse">
                                                        Trabalhando...
                                                      </span>
                                                    ) : (
                                                      finalHoraSaida
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
                                                  <td className="py-4 text-center px-4">
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={async () => {
                                                        setSessionReportUser({
                                                          campaignId: campaign.id,
                                                          campaignName: campaign.nome,
                                                          brokerId: broker.id,
                                                          brokerNome: broker.nome,
                                                          history: []
                                                        });
                                                        setIsLoadingHistory(true);
                                                        const historyData = await fetchBrokerHistory(campaign.id, broker.id);
                                                        const legacyHistory = campaign.filtros?.historico_sessoes?.[broker.id] || [];
                                                        const mergedHistory = historyData.length > 0 ? historyData : legacyHistory;
                                                        
                                                        setSessionReportUser(prev => prev ? {
                                                          ...prev,
                                                          history: mergedHistory
                                                        } : null);
                                                        setIsLoadingHistory(false);
                                                      }}
                                                      disabled={isLoadingHistory}
                                                      className="h-7 text-[9px] font-bold uppercase tracking-wider border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                      {isLoadingHistory && sessionReportUser?.brokerId === broker.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                                                      ) : (
                                                        "Relatório"
                                                      )}
                                                    </Button>
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
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
                            <td className="px-4 py-3 font-mono text-[11px] whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  const textToCopy = client.cpf ? client.cpf.replace(/\D/g, "") : "";
                                  if (!textToCopy) return;
                                  if (navigator?.clipboard?.writeText) {
                                    navigator.clipboard.writeText(textToCopy);
                                    toast.success(`CPF copiado: ${formattedCpf}`);
                                  } else {
                                    try {
                                      const textarea = document.createElement("textarea");
                                      textarea.value = textToCopy;
                                      textarea.style.position = "fixed";
                                      document.body.appendChild(textarea);
                                      textarea.select();
                                      document.execCommand("copy");
                                      document.body.removeChild(textarea);
                                      toast.success(`CPF copiado: ${formattedCpf}`);
                                    } catch {
                                      toast.error("Erro ao copiar CPF.");
                                    }
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 text-slate-600 hover:text-sky-600 focus:text-sky-600 transition-colors font-semibold font-mono cursor-pointer border-none bg-transparent p-0 text-left focus:outline-none group"
                                title="Clique para copiar CPF limpo"
                              >
                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-sky-500 group-focus:text-sky-500 transition-colors" />
                                <span>{formattedCpf}</span>
                              </button>
                            </td>
                            <td className="px-4 py-3 text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const textToCopy = client.nome ? client.nome.toUpperCase() : "";
                                  if (!textToCopy) return;
                                  if (navigator?.clipboard?.writeText) {
                                    navigator.clipboard.writeText(textToCopy);
                                    toast.success(`Nome copiado: ${textToCopy}`);
                                  } else {
                                    try {
                                      const textarea = document.createElement("textarea");
                                      textarea.value = textToCopy;
                                      textarea.style.position = "fixed";
                                      document.body.appendChild(textarea);
                                      textarea.select();
                                      document.execCommand("copy");
                                      document.body.removeChild(textarea);
                                      toast.success(`Nome copiado: ${textToCopy}`);
                                    } catch {
                                      toast.error("Erro ao copiar nome.");
                                    }
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 text-slate-800 hover:text-sky-600 focus:text-sky-600 transition-colors font-black uppercase text-left cursor-pointer border-none bg-transparent p-0 focus:outline-none group"
                                title="Clique para copiar nome"
                              >
                                <Copy className="w-3 h-3 text-slate-400 group-hover:text-sky-500 group-focus:text-sky-500 transition-colors flex-shrink-0" />
                                <span className="capitalize">{client.nome.toLowerCase()}</span>
                              </button>
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

      {sessionReportUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[200] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-xl w-full border border-slate-200 shadow-2xl flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-150 text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Histórico de Conexão</span>
                <h3 className="text-[14px] font-black uppercase tracking-wider text-[#1C2643] mt-0.5">
                  Atividade do Corretor
                </h3>
              </div>
              <button 
                onClick={() => setSessionReportUser(null)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 bg-slate-50 hover:bg-slate-100 transition-colors"
                title="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-left p-3 rounded-xl bg-slate-50/50 border border-slate-100">
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Campanha</span>
                <span className="text-[12px] font-bold text-[#1C2643] uppercase line-clamp-1">{sessionReportUser.campaignName}</span>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Corretor</span>
                <span className="text-[12px] font-bold text-[#1C2643] capitalize block">{sessionReportUser.brokerNome.toLowerCase()}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin text-left min-h-[250px] flex flex-col justify-start">
              {sessionReportUser.history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 flex-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Sem histórico de sessões registrado</span>
                  <p className="text-[10px] text-slate-400 max-w-xs text-center">
                    Este corretor ainda não registrou entradas completas na campanha com a nova estrutura de histórico.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  <div className="border-l-2 border-amber-500/20 ml-3 pl-5 space-y-5 py-2">
                    {sessionReportUser.history.slice().reverse().map((sess, idx, arr) => {
                      const dtEntrou = sess.entrou ? new Date(sess.entrou) : null;
                      const dtSaiu = sess.saiu ? new Date(sess.saiu) : null;
                      
                      const fmtEntrou = dtEntrou 
                        ? dtEntrou.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '-';
                      
                      const fmtSaiu = dtSaiu
                        ? dtSaiu.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '-';

                      const isOnline = !!dtEntrou && !dtSaiu;
                      const sessionNumber = arr.length - idx;

                      return (
                        <div key={idx} className="relative">
                          <div className={cn(
                            "absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white transition-all",
                            isOnline ? "border-emerald-500 animate-pulse bg-emerald-50" : "border-amber-500"
                          )} />
                          
                          <div className="flex flex-col gap-1 bg-slate-50 border border-slate-100 rounded-xl p-3 hover:bg-slate-50/80 transition-colors">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-slate-500">Sessão #{sessionNumber}</span>
                              {isOnline && (
                                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md text-[8px] font-black text-emerald-600 uppercase animate-pulse">
                                  Conectado agora
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-1.5 text-[11px]">
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Entrou</span>
                                <span className="font-semibold font-mono text-slate-700">{fmtEntrou}</span>
                              </div>
                              <div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Saiu</span>
                                {isOnline ? (
                                  <span className="font-semibold text-emerald-600 font-mono">Em atividade...</span>
                                ) : (
                                  <span className="font-semibold font-mono text-slate-700">{fmtSaiu}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 pt-4 mt-4 flex justify-end">
              <Button 
                onClick={() => setSessionReportUser(null)}
                variant="outline"
                className="h-9 px-4 text-[11px] font-bold uppercase tracking-wider"
              >
                Fechar Relatório
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
