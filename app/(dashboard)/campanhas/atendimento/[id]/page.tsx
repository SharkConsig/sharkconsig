/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"
import { Header } from "@/components/layout/header"
import { cn, withRetry } from "@/lib/utils"
import { 
  Loader2, 
  ChevronRight, 
  LogOut, 
  CheckCircle2, 
  MessageCircle,
  Eye,
  EyeOff
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
import { toast } from "sonner"
import { translateOrgao, ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { getContractTypeInfo, CONTRATOS_TIPO_MAPPING } from "@/lib/contratos-mapping"

// --- Helper Functions ---
const parseSafeNumber = (val: string | undefined | null) => {
  if (!val) return null;
  let clean = val.replace(/[R$\s]/g, "");
  
  if (clean.includes(",") && clean.includes(".")) {
    clean = clean.replace(/\./g, "").replace(",", ".");
  } else if (clean.includes(",")) {
    clean = clean.replace(",", ".");
  } else if (clean.includes(".")) {
    const parts = clean.split(".");
    if (parts[parts.length - 1].length === 3) {
      clean = clean.replace(/\./g, "");
    }
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
};

const applyCampaignFilters = (query: any, filters: CampaignFilters) => {
  if (filters.orgaos && filters.orgaos.length > 0) {
    const codeFilters = Object.entries(ORGAOS_MAPPING)
      .filter(([, name]) => filters.orgaos?.includes(name))
      .map(([code]) => code);
    const combinedOrgaos = Array.from(new Set([...filters.orgaos, ...codeFilters]));
    if (combinedOrgaos.length > 0) query = query.in('orgao', combinedOrgaos);
  }
  
  if (filters.situacoes && filters.situacoes.length > 0) query = query.in('situacao_funcional', filters.situacoes)
  if (filters.regimes && filters.regimes.length > 0) query = query.in('regime_juridico', filters.regimes)
  if (filters.ufs && filters.ufs.length > 0) query = query.in('uf', filters.ufs)

  if (filters.idadeMin) {
    const d = new Date()
    d.setFullYear(d.getFullYear() - parseInt(filters.idadeMin))
    query = query.lte('data_nascimento', d.toISOString().split('T')[0])
  }
  if (filters.idadeMax) {
    const d = new Date()
    d.setFullYear(d.getFullYear() - parseInt(filters.idadeMax) - 1)
    d.setDate(d.getDate() + 1)
    query = query.gte('data_nascimento', d.toISOString().split('T')[0])
  }
  
  const mMin = parseSafeNumber(filters.margemMin)
  const mMax = parseSafeNumber(filters.margemMax)
  if (mMin !== null || mMax !== null) {
    query = query.not('margem_35', 'is', null);
    if (mMin !== null && mMax !== null) query = query.gte('margem_35', mMin).lte('margem_35', mMax);
    else if (mMin !== null) query = query.gte('margem_35', mMin);
    else if (mMax !== null) query = query.lte('margem_35', mMax);
  }

  const sMin = parseSafeNumber(filters.saldoMin)
  if (sMin !== null) query = query.not('saldo_70', 'is', null).gte('saldo_70', sMin);
  
  const cMMin = parseSafeNumber(filters.cardMargemMin)
  if (cMMin !== null) query = query.not('liquida_5', 'is', null).gte('liquida_5', cMMin)
  
  const cBMin = parseSafeNumber(filters.cardBeneficioMin)
  if (cBMin !== null) query = query.not('beneficio_liquida_5', 'is', null).gte('beneficio_liquida_5', cBMin)

  if (filters.loanBanks && filters.loanBanks.length > 0) query = query.in('banco', filters.loanBanks)
  
  const hasCardTypeFilter = filters.cardTypes && filters.cardTypes.length > 0 && !filters.cardTypes.includes('__ACTIVE__') || (filters.cardTypes && filters.cardTypes.length > 1);
  const hasCardBankFilter = filters.cardBanks && filters.cardBanks.length > 0;

  if (hasCardTypeFilter || hasCardBankFilter) {
    const cleanCardTypes = filters.cardTypes?.filter(t => t !== '__ACTIVE__') || [];
    const cardQueryCodes = Object.entries(CONTRATOS_TIPO_MAPPING)
      .filter(([, info]) => {
        const matchesType = cleanCardTypes.length === 0 || cleanCardTypes.includes(info.label);
        const matchesBank = !hasCardBankFilter || (info.bank && filters.cardBanks?.includes(info.bank));
        return matchesType && matchesBank;
      })
      .map(([code]) => code);
    
    if (cardQueryCodes.length > 0) {
      query = query.in('tipo_prefix', cardQueryCodes);
    } else if (hasCardTypeFilter && hasCardBankFilter) {
      query = query.eq('tipo', '999999999_FORCE_EMPTY');
    }
  }

  const pMin = filters.loanPrazoMin ? parseInt(filters.loanPrazoMin) : NaN;
  const pMax = filters.loanPrazoMax ? parseInt(filters.loanPrazoMax) : NaN;
  if (!isNaN(pMin)) query = query.gte('prazo', pMin)
  if (!isNaN(pMax)) query = query.lte('prazo', pMax)

  return query;
};

// --- Interfaces ---
interface CampaignFilters {
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
  cardBanks?: string[];
  cardTypes?: string[];
  idadeMin?: string;
  idadeMax?: string;
  distribuicao?: string[];
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
  matricula?: string;
  vinculo?: string;
  margem_disponivel_emprestimo?: number;
  margem_cartao_consignado?: number;
  margem_cartao_beneficio?: number;
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

interface LoanData {
  banco: string;
  orgao: string | null;
  contrato: string;
  parcela: number;
  prazo: number;
  tipo: string;
}

function LoanRow({ loan }: { loan: LoanData }) {
  const [taxa, setTaxa] = useState(1.5);
  const i = taxa / 100;
  const n = loan.prazo;
  const p = loan.parcela;
  const saldo = p * ((1 - Math.pow(1 + i, -n)) / i);

  const info = getContractTypeInfo(loan.tipo);
  const displayedBank = info.bank || loan.banco;

  return (
    <tr className="group bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
      <td className="py-3 pl-4 text-[11px] font-bold text-slate-700 rounded-l-xl border-y border-l border-blue-100">{displayedBank}</td>
      <td className="py-3 text-[11px] font-bold text-slate-900 text-center border-y border-blue-100">{loan.orgao || "-"}</td>
      <td className="py-3 text-[11px] font-bold text-slate-900 text-center border-y border-blue-100">{loan.contrato}</td>
      <td className="py-3 text-[11px] font-bold text-slate-900 text-center border-y border-blue-100">
        {loan.parcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
      <td className="py-3 text-[11px] font-bold text-slate-900 text-center border-y border-blue-100">{loan.prazo}</td>
      <td className="py-3 text-center border-y border-blue-100">
        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-0.5 shadow-sm">
          <input 
            type="number" 
            value={taxa}
            onChange={(e) => setTaxa(Number(e.target.value))}
            className="w-12 bg-transparent text-[11px] font-bold text-slate-900 focus:outline-none text-right pr-1"
            step="0.01"
          />
          <span className="text-[10px] font-bold text-slate-400">%</span>
        </div>
      </td>
      <td className="py-3 pr-4 text-[11px] font-bold text-slate-900 text-right rounded-r-xl border-y border-r border-blue-100">
        {saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
    </tr>
  );
}

// --- Main Page ---

export default function CampanhaAtendimentoPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const userId = user?.id
  
  const campaignId = params.id as string
  
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [currentLead, setCurrentLead] = useState<ClientData | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [activeRegIndex, setActiveRegIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTable, setActiveTable] = useState<string>('base_consulta_siape')
  
  // Tabulation
  const [tabulacao, setTabulacao] = useState<string>("")
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  
  // Stats
  const [completedCount, setCompletedCount] = useState(0)
  
  const hasRegisteredSession = useRef(false)
  const hasRegisteredExit = useRef(false)

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!userId || !campaignId) return;
      const sessionKey = `active_session_${campaignId}_${userId}`;
      if (hasRegisteredSession.current && !hasRegisteredExit.current) {
        hasRegisteredExit.current = true;
        try {
          sessionStorage.removeItem(sessionKey);
        } catch {}

        // Fire both updates as quickly as possible
        supabase.from('campanha_atendimentos').insert({
          campanha_id: campaignId,
          corretor_id: userId,
          cliente_cpf: '00000000000',
          tabulacao: 'SAIU'
        }).then(() => {
          supabase.from('campanhas').select('filtros').eq('id', campaignId).maybeSingle().then(({ data: latestCamp }) => {
            if (latestCamp) {
              const currentSessoes = latestCamp.filtros?.sessoes_corretores || {};
              const nowIso = new Date().toISOString();
              const updatedFiltros = {
                ...(latestCamp.filtros || {}),
                sessoes_corretores: {
                  ...currentSessoes,
                  [userId]: {
                    ...(currentSessoes[userId] || {}),
                    saiu: nowIso
                  }
                }
              };
              supabase.from('campanhas').update({ filtros: updatedFiltros }).eq('id', campaignId).then(() => {});
            }
          });
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      const sessionKey = `active_session_${campaignId}_${userId}`;
      const isLeavingPage = typeof window !== 'undefined' && !window.location.pathname.includes(`/campanhas/atendimento/${campaignId}`);

      // On component unmount, ONLY log out if they are actually leaving the campaign page URL structure (stops spurious updates on Next clients/agreement switches)
      if (userId && campaignId && hasRegisteredSession.current && !hasRegisteredExit.current && isLeavingPage) {
        hasRegisteredExit.current = true;
        try {
          sessionStorage.removeItem(sessionKey);
        } catch {}

        supabase.from('campanha_atendimentos').insert({
          campanha_id: campaignId,
          corretor_id: userId,
          cliente_cpf: '00000000000',
          tabulacao: 'SAIU'
        }).then(() => {
          supabase.from('campanhas').select('filtros').eq('id', campaignId).maybeSingle().then(({ data: latestCamp }) => {
            if (latestCamp) {
              const currentSessoes = latestCamp.filtros?.sessoes_corretores || {};
              const nowIso = new Date().toISOString();
              const updatedFiltros = {
                ...(latestCamp.filtros || {}),
                sessoes_corretores: {
                  ...currentSessoes,
                  [userId]: {
                    ...(currentSessoes[userId] || {}),
                    saiu: nowIso
                  }
                }
              };
              supabase.from('campanhas').update({ filtros: updatedFiltros }).eq('id', campaignId).then(() => {});
            }
          });
        });
      }
    };
  }, [userId, campaignId]);

  const loadNextLead = useCallback(async (camp: Campaign, offset: number) => {
    if (!userId) return
    setIsLoading(true)
    setCurrentLead(null)
    setRegistrations([])
    setActiveRegIndex(0)
    setTabulacao("")
    setShowSensitiveData(false)

    try {
      const targetCpf: string | null = null

      // Always use the highly robust, fast, and bug-free mathematical round-robin queue from campanha_membros (same logic as SIAPE).
      // This completely avoids Postgres locks, timeouts, and stateful lead-claiming synchronization bugs.
      console.log("Applying mathematical round robin lead delivery logic from campanha_membros...");

      // Determine table
      let table = 'base_consulta_siape'
      const campaignName = (camp.nome || "").toUpperCase()
      const convenioKey = camp.filtros?.convenio

      const TABLE_MAP: Record<string, string> = {
        'siape': 'base_consulta_siape',
        'governo_sp': 'base_consulta_governo_sp',
        'prefeitura_sp': 'base_consulta_prefeitura_sp',
        'governo_pi': 'base_consulta_governo_pi',
        'governo_ma': 'base_consulta_governo_ma',
        'governo_rr': 'base_consulta_governo_rr',
      }

      if (convenioKey && TABLE_MAP[convenioKey]) {
        table = TABLE_MAP[convenioKey]
      } else if (campaignName.includes("GOVERNO SP")) {
        table = 'base_consulta_governo_sp'
      } else if (campaignName.includes("PREFEITURA SP")) {
        table = 'base_consulta_prefeitura_sp'
      } else if (campaignName.includes("GOVERNO PI")) {
        table = 'base_consulta_governo_pi'
      } else if (campaignName.includes("GOVERNO MA")) {
        table = 'base_consulta_governo_ma'
      } else if (campaignName.includes("RORAIMA") || campaignName.includes("RR")) {
        table = 'base_consulta_governo_rr'
      }
      
      let data = null;

      if (targetCpf) {
        const paddedTargetCpf = targetCpf.padStart(11, '0')
        const { data: leadData, error: leadError } = await withRetry(() => 
          supabase.from(table).select('*').eq('cpf', paddedTargetCpf).limit(1)
        )
        if (leadError) throw leadError
        data = leadData && leadData.length > 0 ? leadData[0] : null
      } else {
        // Fallback to client-side sequential real-time mathematical distribution querying campanha_membros
        const filters = camp.filtros
        const brokers = filters.corretores_selecionados || []
        const myIndex = brokers.indexOf(userId)
        const brokerRelIndex = myIndex === -1 ? 0 : myIndex // Fallback to 0 if not explicitly listed

        // Release any existing pending (uncompleted) claims for this broker on this campaign to make them self-healing
        try {
          await supabase
            .from('campanha_vinculos')
            .delete()
            .eq('campanha_id', camp.id)
            .eq('corretor_id', userId)
            .eq('completed', false)
        } catch (releaseErr) {
          console.warn("Erro ao liberar vínculos pendentes do corretor:", releaseErr)
        }

        // 1. Obter todos os CPFs já tabulados (atendidos) nesta campanha para filtrá-los em tempo real na listagem
        const { data: attendedRows, error: attendedErr } = await withRetry(() =>
          supabase
            .from('campanha_atendimentos')
            .select('cliente_cpf')
            .eq('campanha_id', camp.id)
            .neq('cliente_cpf', '00000000000')
        )
        if (attendedErr) {
          console.warn("Erro ao buscar atendimentos existentes:", attendedErr)
        }
        const attendedCpfs = new Set((attendedRows || []).map(r => r.cliente_cpf))

        // 2. Obter todos os vínculos (claims) ativos de outros corretores
        const { data: claimedRows, error: claimedErr } = await withRetry(() =>
          supabase
            .from('campanha_vinculos')
            .select('cliente_cpf')
            .eq('campanha_id', camp.id)
            .eq('completed', false)
        )
        if (claimedErr) {
          console.warn("Erro ao buscar CPFs reservados por outros corretores:", claimedErr)
        }
        const claimedCpfs = new Set((claimedRows || []).map(r => r.cliente_cpf))

        // 3. Obter todos os membros cadastrados na campanha_membros da campanha ordenados pela fila
        const { data: allMembers, error: membersErr } = await withRetry(() =>
          supabase
            .from('campanha_membros')
            .select('cliente_cpf, convenio')
            .eq('campanha_id', camp.id)
            .order('ordem_fila', { ascending: true })
        )
        if (membersErr) {
          console.error("Erro ao buscar membros da campanha:", membersErr)
          throw membersErr
        }

        // 4. Filtrar pelos CPFs que ainda não foram tabulados e não estão vinculados a outro corretor neste exato momento
        const availableMembers = (allMembers || []).filter(m => 
          !attendedCpfs.has(m.cliente_cpf) && 
          !claimedCpfs.has(m.cliente_cpf)
        )

        let fetchedLeadCpf: string | null = null
        let resolvedConvenio: string | null = null

        if (availableMembers.length > 0) {
          // Para evitar colisão extrema caso dois corretores carreguem exatamente ao mesmo tempo,
          // usamos o brokerRelIndex modulo a quantidade de itens disponíveis para indexar o pool.
          // Se houver apenas 1 disponível, dá o mesmo (0). Se houver vários, eles pegaram índices distintos.
          const selectedIndex = brokerRelIndex % availableMembers.length
          const matchedMember = availableMembers[selectedIndex]
          fetchedLeadCpf = matchedMember.cliente_cpf
          resolvedConvenio = matchedMember.convenio || null
        }

        // 5. RAPID SINGLE KEY LOOKUP:
        // Se encontramos um CPF disponível, buscamos os seus dados completos na tabela correspondente
        if (fetchedLeadCpf) {
          if (resolvedConvenio && TABLE_MAP[resolvedConvenio]) {
            table = TABLE_MAP[resolvedConvenio]
          } else if (
            !resolvedConvenio ||
            resolvedConvenio === "detect" ||
            resolvedConvenio === "importado" ||
            resolvedConvenio === "multi" ||
            convenioKey === "detect" ||
            convenioKey === "importado" ||
            convenioKey === "multi"
          ) {
            // Resolve convenio dynamically at runtime by checking all tables in parallel
            const splitTables = [
              { name: 'base_consulta_siape', convenio: 'siape' },
              { name: 'base_consulta_governo_sp', convenio: 'governo_sp' },
              { name: 'base_consulta_prefeitura_sp', convenio: 'prefeitura_sp' },
              { name: 'base_consulta_governo_pi', convenio: 'governo_pi' },
              { name: 'base_consulta_governo_ma', convenio: 'governo_ma' },
              { name: 'base_consulta_governo_rr', convenio: 'governo_rr' },
            ];
            const detectionResults = await Promise.all(
              splitTables.map(async (t) => {
                try {
                  const paddedCpf = fetchedLeadCpf!.padStart(11, '0')
                  const { data: dDataList, error: dErr } = await supabase
                    .from(t.name)
                    .select('cpf')
                    .eq('cpf', paddedCpf)
                    .limit(1)
                  if (!dErr && dDataList && dDataList.length > 0) {
                    return t.name;
                  }
                } catch (e) {
                  console.warn(`Erro na deteção do CPF ${fetchedLeadCpf} na tabela ${t.name}:`, e);
                }
                return null;
              })
            );
            const foundTable = detectionResults.find((r) => r !== null);
            if (foundTable) {
              table = foundTable;
              const detectedConvenio = splitTables.find((t) => t.name === foundTable)?.convenio;
              if (detectedConvenio) {
                // Silently cache/update back to campanha_membros for subsequent ultra-fast database query runs
                supabase
                  .from('campanha_membros')
                  .update({ convenio: detectedConvenio })
                  .eq('campanha_id', camp.id)
                  .eq('cliente_cpf', fetchedLeadCpf)
                  .then(() => {});
              }
            }
          }

          const paddedFetchedCpf = fetchedLeadCpf.padStart(11, '0')
          const { data: fullLead, error: fullLeadError } = await withRetry(() => 
            supabase.from(table).select('*').eq('cpf', paddedFetchedCpf).limit(1)
          )
          if (fullLeadError) throw fullLeadError
          data = fullLead && fullLead.length > 0 ? fullLead[0] : null
        }

        // 6. Criar vínculo temporário em campanha_vinculos para segurar a posse do lead enquanto é trabalhado
        if (data && data.cpf) {
          try {
            await supabase.from('campanha_vinculos').insert({
              campanha_id: camp.id,
              corretor_id: userId,
              cliente_cpf: data.cpf,
              completed: false,
              indice: offset
            })
          } catch (insertErr) {
            console.warn("Could not record initial lead claimed row:", insertErr)
          }
        }
      }
      
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
        setActiveTable(table)
        
        // Fetch detailed registrations if SIAPE
        if (table === 'base_consulta_siape') {
          const { data: regData } = await withRetry(() => 
            supabase
              .from('matriculas')
              .select('*, instituidores(*, itens_credito(*))')
              .eq('cliente_cpf', client.cpf)
          )
          
          setRegistrations(regData || [])
        } else {
          // Wrapped generic data
          const isGovPi = table === 'base_consulta_governo_pi';
          const isGovRr = table === 'base_consulta_governo_rr';
          setRegistrations([{
            id: data.id || data.cpf,
            numero_matricula: isGovPi 
              ? (data.matricula || '---') 
              : (data.identificacao || data.numero_matricula || '---'),
            situacao_funcional: isGovPi ? data.vinculo : data.situacao_funcional,
            salario: data.salario || 0,
            orgao: data.orgao,
            regime_juridico: data.regime_juridico,
            uf: isGovPi ? 'PI' : (isGovRr ? 'RR' : data.uf),
            matricula: isGovPi ? (data.matricula || '---') : undefined,
            vinculo: isGovPi ? (data.vinculo || '---') : undefined,
            margem_disponivel_emprestimo: isGovPi ? data.margem_disponivel_emprestimo : (isGovRr ? data.margem_emprestimo : undefined),
            margem_cartao_consignado: isGovPi ? data.margem_cartao_consignado : (isGovRr ? data.margem_cartao : undefined),
            margem_cartao_beneficio: isGovPi ? data.margem_cartao_beneficio : undefined,
            instituidores: [{
               id: 'main',
               nome: data.orgao || (isGovRr ? 'GOVERNO RR' : ''),
               saldo_70: data.saldo_70,
               margem_35: isGovRr ? data.margem_emprestimo : data.margem_35,
               bruta_5: data.bruta_5,
               utilizada_5: data.utilizada_5,
               liquida_5: isGovPi ? data.margem_cartao_consignado : (isGovRr ? data.margem_cartao : data.liquida_5),
               beneficio_bruta_5: data.beneficio_bruta_5,
               beneficio_utilizada_5: data.beneficio_utilizada_5,
               beneficio_liquida_5: isGovPi ? data.margem_cartao_beneficio : data.beneficio_liquida_5,
               itens_credito: []
            }]
          } as unknown as Registration])
        }
      } else {
        toast("Não há mais leads disponíveis nesta campanha seguindo a fila atual.", { icon: "ℹ️" })
      }
    } catch (err: unknown) {
      const error = err as { message?: string }
      console.error("Erro ao carregar lead:", error)
      const errorMsg = error?.message || "Erro ao carregar próximo cliente."
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const fetchCampaignAndProgress = useCallback(async () => {
    if (!userId || !campaignId) {
      console.warn("fetchCampaignAndProgress abortado: userId ou campaignId ausente", { userId, campaignId })
      return
    }
    
    // Validar se o campaignId é um UUID válido para evitar erro de sintaxe do Postgres
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(campaignId)) {
      console.error("ID de campanha inválido:", campaignId)
      toast.error("ID de campanha inválido.")
      router.push('/campanhas/distribuicao')
      return
    }
    
    setIsLoading(true)
    console.log("Iniciando carregamento da campanha:", campaignId)
    
    try {
      // 1. Fetch Campaign
      const { data: campaignData, error: campaignError } = await withRetry(() => 
        supabase
          .from('campanhas')
          .select('*')
          .eq('id', campaignId)
          .maybeSingle()
      )
      
      if (campaignError) {
        console.error("Erro Supabase (Camaign):", campaignError)
        throw campaignError
      }
      
      if (!campaignData) {
        toast.error("Campanha não encontrada.")
        router.push('/campanhas/distribuicao')
        return
      }
      
      setCampaign(campaignData)
      console.log("Campanha carregada com sucesso:", campaignData.nome)

      // Registrar horário de entrada
      const sessionKey = `active_session_${campaignId}_${userId}`;
      let isSessionActiveInStorage = false;
      try {
        isSessionActiveInStorage = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey) === 'true';
      } catch {}

      if (isSessionActiveInStorage) {
        hasRegisteredSession.current = true;
      }

      if (!hasRegisteredSession.current) {
        hasRegisteredSession.current = true;
        try {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(sessionKey, 'true');
          }
        } catch {}

        try {
          // Registrar na tabela campanha_atendimentos
          await supabase.from('campanha_atendimentos').insert({
            campanha_id: campaignId,
            corretor_id: userId,
            cliente_cpf: '00000000000',
            tabulacao: 'ENTROU'
          });
          console.log("Horário de entrada registrado no banco (campanha_atendimentos)!");

          // Atualizar filtros legado para compatibilidade visual instantânea
          const currentSessoes = campaignData.filtros?.sessoes_corretores || {};
          const nowIso = new Date().toISOString();
          const updatedFiltros = {
            ...(campaignData.filtros || {}),
            sessoes_corretores: {
              ...currentSessoes,
              [userId]: {
                ...currentSessoes[userId],
                entrou: nowIso,
                saiu: null
              }
            }
          };
          await supabase
            .from('campanhas')
            .update({ filtros: updatedFiltros })
            .eq('id', campaignId);
        } catch (entryTimeErr) {
          console.error("Erro ao registrar horário de entrada:", entryTimeErr);
        }
      }

      // 2. Count progress for this broker
      const { count, error: countError } = await withRetry(() => 
        supabase
          .from('campanha_atendimentos')
          .select('*', { count: 'exact', head: true })
          .eq('campanha_id', campaignId)
          .eq('corretor_id', userId)
          .neq('cliente_cpf', '00000000000')
      )
      
      if (countError) {
        console.error("Erro Supabase (Count):", countError)
        throw countError
      }
      
      const finishedCount = count || 0
      setCompletedCount(finishedCount)
      console.log("Progresso do corretor:", finishedCount)
      
      // 3. Fetch next lead
      await loadNextLead(campaignData, finishedCount)
      
    } catch (err: unknown) {
      const error = err as { message?: string; details?: string; hint?: string; code?: string }
      console.error("Erro detalhado ao carregar campanha:", {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        fullError: error
      })
      const errorMsg = error?.message || "Erro ao carregar dados da campanha."
      toast.error(`Falha ao iniciar: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }, [userId, campaignId, loadNextLead, router])

  useEffect(() => {
    fetchCampaignAndProgress()
  }, [fetchCampaignAndProgress])

  const handleTabulateAndNext = async () => {
    if (!tabulacao) {
       toast.error("Por favor, selecione uma tabulação.")
       return
     }
     if (!currentLead || !campaign || !userId) return
     
     setIsSubmitting(true)
     try {
       const { error } = await withRetry(() => 
         supabase.from('campanha_atendimentos').insert({
           campanha_id: campaign.id,
           corretor_id: userId,
           cliente_cpf: currentLead.cpf,
           tabulacao,
           
         })
       )
       
       if (error) throw error

       // Mark lead as completed in campanha_vinculos statefully
       try {
         await supabase.from('campanha_vinculos')
           .update({ completed: true })
           .eq('campanha_id', campaign.id)
           .eq('corretor_id', userId)
           .eq('cliente_cpf', currentLead.cpf)
       } catch (linkErr) {
         console.warn("Could not mark claim as completed statefully:", linkErr)
       }
       
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



  const handleExit = async () => {
    if (!campaign || !userId) {
      router.push('/campanhas/distribuicao')
      return
    }

    if (currentLead) {
      if (!tabulacao) {
        toast.error("Por favor, selecione uma tabulação para conseguir sair da campanha.")
        return
      }
      
      setIsSubmitting(true)
      try {
        const { error } = await withRetry(() => 
          supabase.from('campanha_atendimentos').insert({
            campanha_id: campaign.id,
            corretor_id: userId,
            cliente_cpf: currentLead.cpf,
            tabulacao
          })
        )
        
        if (error) throw error

        // Mark lead as completed in campanha_vinculos statefully
        try {
          await supabase.from('campanha_vinculos')
            .update({ completed: true })
            .eq('campanha_id', campaign.id)
            .eq('corretor_id', userId)
            .eq('cliente_cpf', currentLead.cpf)
        } catch (linkErr) {
          console.warn("Could not mark claim as completed statefully:", linkErr)
        }
      } catch (err) {
        console.error("Erro ao salvar tabulação ao sair:", err)
        toast.error("Erro ao salvar atendimento ao sair.")
        setIsSubmitting(false)
        return
      }
    }

    // Registrar horário de saída
    const sessionKey = `active_session_${campaign.id}_${userId}`;
    if (!hasRegisteredExit.current) {
      hasRegisteredExit.current = true;
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(sessionKey);
        }
      } catch {}

      try {
        // Registrar na tabela campanha_atendimentos
        await supabase.from('campanha_atendimentos').insert({
          campanha_id: campaign.id,
          corretor_id: userId,
          cliente_cpf: '00000000000',
          tabulacao: 'SAIU'
        });
        console.log("Horário de saída registrado no banco (campanha_atendimentos)!");

        // Registrar no visual de sessoes_corretores
        const { data: latestCamp } = await supabase
          .from('campanhas')
          .select('filtros')
          .eq('id', campaign.id)
          .maybeSingle();

        if (latestCamp) {
          const currentSessoes = latestCamp.filtros?.sessoes_corretores || {};
          const nowIso = new Date().toISOString();
          const updatedFiltros = {
            ...(latestCamp.filtros || {}),
            sessoes_corretores: {
              ...currentSessoes,
              [userId]: {
                ...(currentSessoes[userId] || {}),
                saiu: nowIso
              }
            }
          };
          await supabase
            .from('campanhas')
            .update({ filtros: updatedFiltros })
            .eq('id', campaign.id);
        }
      } catch (exitTimeErr) {
        console.error("Erro ao registrar horário de saída:", exitTimeErr);
      }
    }

    toast.success("Atendimento registrado! Saindo...")
    setIsSubmitting(false)
    router.push('/campanhas/distribuicao')
  }

  // --- Formatting Helpers Reused from pesquisa ---
  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return "R$ 0,00"
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const maskCPF = (cpf: string) => {
    if (!cpf) return ""
    if (showSensitiveData) {
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }
    return cpf.replace(/(\d{3})\d{6}(\d{2})/, "$1.***.***-$2")
  }

  const maskPhone = (phone: string | null) => {
    if (!phone || phone === '0') return "NÃO INFORMADO"
    if (showSensitiveData) {
      const cleaned = phone.replace(/\D/g, "")
      if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      }
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    }
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
      <div className="sticky top-16 lg:top-20 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3.5 shadow-lg">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4 w-full">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Tabulação:</span>
            <Select value={tabulacao} onValueChange={setTabulacao}>
              <SelectTrigger className="w-full sm:w-[220px] h-10 rounded-xl text-[10px] font-bold border-slate-200 bg-white focus:ring-1 focus:ring-slate-300">
                <SelectValue placeholder="SELECIONE O STATUS" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="CLIENTE CHAMADO" className="text-[10px] font-bold">CLIENTE CHAMADO</SelectItem>
                <SelectItem value="NÃO EXISTE WHATSAPP" className="text-[10px] font-bold">NÃO EXISTE WHATSAPP</SelectItem>
                <SelectItem value="WHATSAPP DIVERGENTE" className="text-[10px] font-bold">WHATSAPP DIVERGENTE</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button 
                variant="outline" 
                onClick={handleExit}
                className="h-10 px-6 rounded-xl text-[10px] font-bold uppercase border-slate-200 hover:bg-slate-50 flex-1 sm:flex-none whitespace-nowrap"
            >
              <LogOut className="w-4 h-4 mr-2" /> SAIR DA CAMPANHA
            </Button>
            <Button 
                onClick={handleTabulateAndNext}
                disabled={isSubmitting}
                className="h-10 px-8 bg-[#2E2E2E] hover:bg-[#1A1A1A] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-neutral-100 flex-1 sm:flex-none whitespace-nowrap"
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
            {/* Dados Pessoais */}
            <Card className="card-shadow border border-slate-200">
              <CardContent className="p-8 space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                    <h3 className="text-[16px] font-bold text-slate-900">Dados Pessoais</h3>
                  </div>
                  <button 
                    onClick={() => setShowSensitiveData(!showSensitiveData)}
                    className="text-slate-500 hover:text-slate-700 transition-colors p-2 hover:bg-slate-100 rounded-full"
                    id="toggle-sensitive-data"
                  >
                    {showSensitiveData ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
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
                      {activeReg.uf === 'PI' ? (
                        <>
                          {/* Governo PI - Visual Layout equal to ACESSAR CLIENTE modal */}
                          <div className="space-y-10 text-left">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest font-sans font-medium tracking-tight">
                                INFORMAÇÕES DA MATRÍCULA (GOVERNO PIAUÍ)
                              </h3>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-left">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.matricula || "---"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase">{activeReg.vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.orgao || "---"}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Margens Grid PI - Side-by-side as shown in ACESSAR CLIENTE */}
                          {(() => {
                            const valConsig = activeReg.margem_disponivel_emprestimo ?? 0;
                            const valCard = activeReg.margem_cartao_consignado ?? 0;
                            const valBenef = activeReg.margem_cartao_beneficio ?? 0;

                            const isConsigAvailable = valConsig > 0;
                            const isCardAvailable = valCard > 0;
                            const isBenefAvailable = valBenef > 0;

                            return (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Margem Disponível Empréstimo */}
                                <div className={cn(
                                  "p-5 border rounded-2xl space-y-3 text-left",
                                  isConsigAvailable ? "bg-blue-50/70 border-blue-100" : "bg-red-50/75 border-red-100"
                                )}>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", isConsigAvailable ? "text-blue-600" : "text-red-600 truncate")}>
                                    MARGEM DISPONÍVEL EMPRÉSTIMO
                                  </p>
                                  <div className="flex flex-col">
                                    <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1 text-blue-700", !isConsigAvailable && "text-red-700")}>
                                      {formatCurrency(valConsig)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className={cn("w-2 h-2 rounded-full", isConsigAvailable ? "bg-blue-500" : "bg-red-500")}></div>
                                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", isConsigAvailable ? "text-blue-600" : "text-red-600")}>
                                        {isConsigAvailable ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Margem Cartão Consignado */}
                                <div className={cn(
                                  "p-5 border rounded-2xl space-y-3 text-left",
                                  isCardAvailable ? "bg-emerald-50/70 border-emerald-100" : "bg-red-50/75 border-red-100"
                                )}>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", isCardAvailable ? "text-emerald-600" : "text-red-600 truncate")}>
                                    MARGEM CARTÃO CONSIGNADO
                                  </p>
                                  <div className="flex flex-col">
                                    <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1 text-emerald-700", !isCardAvailable && "text-red-700")}>
                                      {formatCurrency(valCard)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className={cn("w-2 h-2 rounded-full", isCardAvailable ? "bg-emerald-500" : "bg-red-500")}></div>
                                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", isCardAvailable ? "text-emerald-600" : "text-red-600")}>
                                        {isCardAvailable ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Margem Cartão Benefício */}
                                <div className={cn(
                                  "p-5 border rounded-2xl space-y-3 text-left",
                                  isBenefAvailable ? "bg-purple-50/70 border-purple-100" : "bg-red-50/75 border-red-100"
                                )}>
                                  <p className={cn("text-[10px] font-bold uppercase tracking-widest", isBenefAvailable ? "text-purple-600" : "text-red-600 truncate")}>
                                    MARGEM CARTÃO BENEFÍCIO
                                  </p>
                                  <div className="flex flex-col">
                                    <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1 text-purple-700", !isBenefAvailable && "text-red-700")}>
                                      {formatCurrency(valBenef)}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className={cn("w-2 h-2 rounded-full", isBenefAvailable ? "bg-purple-500" : "bg-red-500")}></div>
                                      <span className={cn("text-[10px] font-bold uppercase tracking-widest", isBenefAvailable ? "text-purple-600" : "text-red-600")}>
                                        {isBenefAvailable ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
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
                              {/* Row 1 */}
                              <MarginCard label="Saldo 70%" value={formatCurrency(activeInst.saldo_70)} type="neutral" />
                              <MarginCard 
                                label="Margem 35%" 
                                value={formatCurrency(activeInst.margem_35)} 
                                type={(activeInst.margem_35 || 0) > 0 ? "success" : "danger"}
                                status={(activeInst.margem_35 || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                              />
                              <MarginCard 
                                label="Soma das Margens Líquidas" 
                                value={formatCurrency(
                                  (activeInst.margem_35 || 0) + 
                                  (activeInst.liquida_5 || 0) + 
                                  (activeInst.beneficio_liquida_5 || 0)
                                )} 
                                type="warning" 
                              />
                              
                              {/* Row 2 */}
                              <MarginCard label="Bruta 5%" value={formatCurrency(activeInst.bruta_5)} type="neutral" />
                              <MarginCard 
                                 label="Utilizada 5%" 
                                 value={getUtilizadaStatus(activeInst.bruta_5, activeInst.liquida_5)} 
                                 type={getUtilizadaStatus(activeInst.bruta_5, activeInst.liquida_5) === "SIM" ? "danger" : "success"}
                              />
                              <MarginCard 
                                label="Líquida 5%" 
                                value={formatCurrency(activeInst.liquida_5)} 
                                type={getUtilizadaStatus(activeInst.bruta_5, activeInst.liquida_5) === "SIM" ? "danger" : "success"}
                                status={getUtilizadaStatus(activeInst.bruta_5, activeInst.liquida_5) === "SIM" ? "INDISPONÍVEL" : "DISPONÍVEL"}
                              />

                              {/* Row 3 */}
                              <MarginCard label="Benefício Bruta 5%" value={formatCurrency(activeInst.beneficio_bruta_5)} type="neutral" />
                              <MarginCard 
                                 label="Benefício Utilizada 5%" 
                                 value={getUtilizadaStatus(activeInst.beneficio_bruta_5, activeInst.beneficio_liquida_5)} 
                                 type={getUtilizadaStatus(activeInst.beneficio_bruta_5, activeInst.beneficio_liquida_5) === "SIM" ? "danger" : "success"}
                              />
                              <MarginCard 
                                label="Benefício Líquida 5%" 
                                value={formatCurrency(activeInst.beneficio_liquida_5)} 
                                type={getUtilizadaStatus(activeInst.beneficio_bruta_5, activeInst.beneficio_liquida_5) === "SIM" ? "danger" : "success"}
                                status={getUtilizadaStatus(activeInst.beneficio_bruta_5, activeInst.beneficio_liquida_5) === "SIM" ? "INDISPONÍVEL" : "DISPONÍVEL"}
                              />
                            </div>
                          )}
                        </>
                      )}

                      {/* Contratos Section (SIAPE) */}
                      {activeTable === 'base_consulta_siape' && activeInst && activeReg.uf !== 'PI' && (
                        <div className="space-y-10 border-t border-slate-100 pt-8">
                          {/* Contratos de Empréstimo */}
                          {(() => {
                            const contracts = ((activeInst?.itens_credito || activeReg?.itens_credito || []) as Contract[]);
                            const filtered = contracts.filter(c => getContractTypeInfo(c.tipo).category === "EMPRESTIMO");
                            
                            return (
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Contratos de Empréstimo</h3>
                                </div>
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-separate border-spacing-y-2">
                                    <thead>
                                      <tr>
                                        <th className="pb-2 pl-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco</th>
                                        <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Órgão</th>
                                        <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Contrato</th>
                                        <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Parcela</th>
                                        <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Prazo</th>
                                        <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Taxa</th>
                                        <th className="pb-2 pr-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Saldo Est.</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {filtered.length > 0 ? (
                                        filtered.map((contract, cIdx) => (
                                          <LoanRow key={cIdx} loan={{
                                            banco: contract.banco,
                                            orgao: contract.orgao,
                                            contrato: contract.numero_do_contrato,
                                            parcela: contract.parcela,
                                            prazo: contract.prazo,
                                            tipo: contract.tipo
                                          }} />
                                        ))
                                      ) : (
                                        <tr>
                                          <td colSpan={7} className="py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white rounded-xl border border-dashed border-slate-200">
                                            Nenhum contrato de empréstimo encontrado
                                          </td>
                                        </tr>
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
                            {/* Cartão Consignado Section */}
                            {(() => {
                              const contracts = ((activeInst?.itens_credito || activeReg?.itens_credito || []) as Contract[]);
                              const filtered = contracts.filter(c => getContractTypeInfo(c.tipo).category === "CARTAO_CONSIGNADO");
                              
                              return (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cartão Consignado</h3>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-y-2">
                                      <thead>
                                        <tr>
                                          <th className="pb-2 pl-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco</th>
                                          <th className="pb-2 pr-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Parcela</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filtered.length > 0 ? (
                                          filtered.map((card, cIdx) => {
                                            const info = getContractTypeInfo(card.tipo);
                                            const displayedBank = info.bank || card.banco;
                                            
                                            return (
                                              <tr key={cIdx} className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                                                <td className="py-3 pl-4 rounded-l-xl">
                                                  <p className="text-[11px] font-bold text-slate-700 uppercase">{displayedBank}</p>
                                                </td>
                                                <td className="py-3 pr-4 text-right rounded-r-xl">
                                                  <p className="text-[11px] font-black text-slate-900">{formatCurrency(card.parcela)}</p>
                                                </td>
                                              </tr>
                                            );
                                          })
                                        ) : (
                                          <tr>
                                            <td colSpan={2} className="py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white rounded-xl border border-dashed border-slate-200">
                                              Nenhum cartão consignado encontrado
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Cartão Benefício Section */}
                            {(() => {
                              const contracts = ((activeInst?.itens_credito || activeReg?.itens_credito || []) as Contract[]);
                              const filtered = contracts.filter(c => getContractTypeInfo(c.tipo).category === "CARTAO_BENEFICIO");
                              
                              return (
                                <div className="space-y-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Cartão Benefício</h3>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-y-2">
                                      <thead>
                                        <tr>
                                          <th className="pb-2 pl-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco</th>
                                          <th className="pb-2 pr-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Parcela</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {filtered.length > 0 ? (
                                          filtered.map((card, cIdx) => {
                                            const info = getContractTypeInfo(card.tipo);
                                            const displayedBank = info.bank || card.banco;
                                            
                                            return (
                                              <tr key={cIdx} className="bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                                                <td className="py-3 pl-4 rounded-l-xl">
                                                  <p className="text-[11px] font-bold text-slate-700 uppercase">{displayedBank}</p>
                                                </td>
                                                <td className="py-3 pr-4 text-right rounded-r-xl">
                                                  <p className="text-[11px] font-black text-slate-900">{formatCurrency(card.parcela)}</p>
                                                </td>
                                              </tr>
                                            );
                                          })
                                        ) : (
                                          <tr>
                                            <td colSpan={2} className="py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white rounded-xl border border-dashed border-slate-200">
                                              Nenhum cartão benefício encontrado
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })()}
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
