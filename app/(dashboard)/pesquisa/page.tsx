"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { Landmark, Search, Eye, EyeOff, MessageSquare, FileEdit, MessageCircle, Loader2, Calculator, History, Download, FileText, FileImage } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { cn, withRetry, formatShortName } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { SimulationModal } from "@/components/simulation/simulation-modal"
import { translateOrgao } from "@/lib/orgaos-mapping"
import { getContractTypeInfo } from "@/lib/contratos-mapping"

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
  // Formula: SD = P * [(1 - (1 + i)^-n) / i]
  const saldo = p * ((1 - Math.pow(1 + i, -n)) / i);

  const info = getContractTypeInfo(loan.tipo);
  const displayedBank = info.bank || loan.banco;

  return (
    <tr className="group bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
      <td className="py-4 pl-4 text-[12px] font-bold text-slate-700 rounded-l-xl border-y border-l border-blue-100">{displayedBank}</td>
      <td className="py-4 text-[12px] font-bold text-slate-900 text-center border-y border-blue-100">{loan.orgao || "-"}</td>
      <td className="py-4 text-[12px] font-bold text-slate-900 text-center border-y border-blue-100">{loan.contrato}</td>
      <td className="py-4 text-[12px] font-bold text-slate-900 text-center border-y border-blue-100">
        {loan.parcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
      <td className="py-4 text-[12px] font-bold text-slate-900 text-center border-y border-blue-100">{loan.prazo}</td>
      <td className="py-4 text-center border-y border-blue-100">
        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 shadow-sm">
          <input 
            type="number" 
            value={taxa}
            onChange={(e) => setTaxa(Number(e.target.value))}
            className="w-14 bg-transparent text-[12px] font-bold text-slate-900 focus:outline-none text-right pr-1"
            step="0.01"
          />
          <span className="text-[10px] font-bold text-slate-400">%</span>
        </div>
      </td>
      <td className="py-4 pr-4 text-[12px] font-bold text-slate-900 text-right rounded-r-xl border-y border-r border-blue-100">
        {saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </td>
    </tr>
  );
}

import { useAuth } from "@/context/auth-context"

interface Contract {
  id?: string;
  tipo: string;
  banco: string;
  orgao: string | null;
  numero_do_contrato: string;
  parcela: number;
  prazo: number;
  [key: string]: unknown;
}

interface Instituidor {
  id: string;
  nome: string | null;
  itens_credito?: Contract[];
  [key: string]: unknown;
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
  [key: string]: unknown;
}

interface ClientData {
  id: string;
  nome: string | null;
  cpf: string;
  data_nascimento: string | null;
  telefone_1: string | null;
  telefone_2: string | null;
  telefone_3: string | null;
  [key: string]: unknown;
}

interface ConvenioProfile {
  type: 'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | 'governo_ms' | 'prefeitura_natal' | 'prefeitura_porto_velho' | 'governo_ba' | 'governo_am' | 'governo_ce' | 'governo_ro';
  client: ClientData;
  registrations: Registration[];
}

export default function SearchClientPage() {
  const router = useRouter()
  const { perfil, isEstagio } = useAuth()
  const isUserEstagio = isEstagio || perfil?.role?.toLowerCase() === 'estágio' || perfil?.role?.toLowerCase() === 'estagio'
  const [searchQuery, setSearchQuery] = useState("")
  const [showProfile, setShowProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [isSimulationModalOpen, setIsSimulationModalOpen] = useState(false)
  
  const [client, setClient] = useState<ClientData | null>(null)
  const [clientType, setClientType] = useState<'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | 'governo_ms' | 'prefeitura_natal' | 'prefeitura_porto_velho' | 'governo_ba' | 'governo_am' | 'governo_ce' | 'governo_ro' | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [profiles, setProfiles] = useState<ConvenioProfile[]>([])
  const [activeRegIndex, setActiveRegIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const [clientTickets, setClientTickets] = useState<Record<string, unknown>[]>([])
  const [isLoadingClientTickets, setIsLoadingClientTickets] = useState(false)

  const [clientProposals, setClientProposals] = useState<Record<string, any>[]>([])
  const [isLoadingClientProposals, setIsLoadingClientProposals] = useState(false)

  const fetchClientProposals = async () => {
    if (!client?.cpf) {
      setClientProposals([])
      return
    }
    setIsLoadingClientProposals(true)
    try {
      const cleanCpf = client.cpf.replace(/\D/g, "")
      
      const [p1, p2, p3, p4] = await Promise.all([
        supabase
          .from('historico_proposta_comercial')
          .select('*')
          .eq('cliente_cpf', cleanCpf),
        supabase
          .from('historico_proposta_comercial_novo_formato')
          .select('*')
          .eq('cliente_cpf', cleanCpf),
        supabase
          .from('historico_proposta_comercial_quitacao_contrato')
          .select('*')
          .eq('cliente_cpf', cleanCpf),
        supabase
          .from('historico_proposta_comercial_calculadora')
          .select('*')
          .eq('cliente_cpf', cleanCpf)
      ]);

      let combined: Record<string, any>[] = [];
      if (p1.data) {
        combined = combined.concat(p1.data.map((item: any) => ({ ...item, isNovoFormato: false, isQuitacao: false, isCalculadora: false })));
      }
      if (p2.data) {
        combined = combined.concat(p2.data.map((item: any) => ({ ...item, isNovoFormato: true, isQuitacao: false, isCalculadora: false })));
      }
      if (p3.data) {
        combined = combined.concat(p3.data.map((item: any) => ({ ...item, isNovoFormato: false, isQuitacao: true, isCalculadora: false })));
      }
      if (p4.data) {
        combined = combined.concat(p4.data.map((item: any) => ({ ...item, isNovoFormato: false, isQuitacao: false, isCalculadora: true })));
      }

      combined.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setClientProposals(combined);
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingClientProposals(false)
    }
  }

  useEffect(() => {
    fetchClientProposals()
  }, [client?.cpf])

  useEffect(() => {
    async function fetchClientTickets() {
      if (!client?.cpf) {
        setClientTickets([])
        return
      }
      setIsLoadingClientTickets(true)
      try {
        const cleanCpf = client.cpf.replace(/\D/g, "")
        const { data, error: fetchErr } = await supabase
          .from('chamados')
          .select(`
            *,
            status_chamados:status_id (nome)
          `)
          .eq('cliente_cpf', cleanCpf)
          .order('created_at', { ascending: false })

        if (fetchErr) {
          console.error("Erro ao buscar chamados do cliente:", fetchErr)
        } else {
          setClientTickets(data || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoadingClientTickets(false)
      }
    }
    fetchClientTickets()
  }, [client?.cpf])

  const renderClientTicketsHistory = () => {
    if (isLoadingClientTickets) {
      return (
        <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-2 justify-center py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
          <span>Buscando histórico de atendimentos...</span>
        </div>
      );
    }

    if (clientTickets.length === 0) return null;

    return (
      <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-rose-500 rounded-full"></div>
          <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            Histórico de Atendimento{" "}
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-rose-500/10 text-rose-600 border-none font-black font-sans uppercase">
              {clientTickets.length} {clientTickets.length === 1 ? 'Chamado' : 'Chamados'}
            </Badge>
          </h4>
        </div>
        
        <div className="flex flex-col gap-3">
          {clientTickets.map((chamado) => {
            const statusLabel = chamado.status_chamados?.nome || chamado.status || "ABERTO";
            const statusUpper = statusLabel.toUpperCase();
            
            return (
              <div 
                key={chamado.id} 
                className="p-4 rounded-xl border border-rose-100 bg-rose-50/10 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_1px_3px_rgba(244,63,94,0.02)] hover:border-rose-200 hover:bg-rose-50/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200/50 flex items-center justify-center font-bold text-[10px] text-rose-500 font-mono">
                    #{chamado.id}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Corretor</span>
                    <span className="text-[12px] font-extrabold text-slate-700 uppercase leading-none block">{formatShortName(chamado.user_nome)}</span>
                  </div>
                </div>
                
                <div className="flex flex-col md:items-end justify-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 md:text-right">Status do Chamado</span>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase",
                    statusUpper === "ABERTO" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                    statusUpper === "FECHADO" || statusUpper === "CONCLUÍDO" || statusUpper === "CONCLUIDO" ? "bg-slate-100 text-slate-600 border-slate-200" :
                    "bg-amber-50 text-amber-700 border-amber-100"
                  )}>
                    {statusUpper}
                  </span>
                </div>

                <div className="flex flex-col md:items-end justify-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5 md:text-right">Abertura</div>
                  <div className="flex items-center gap-2">
                    <div className="text-[12px] font-bold text-slate-700">
                      {(() => {
                        if (!chamado.created_at) return "--/--/----";
                        try {
                          const d = new Date(chamado.created_at);
                          if (isNaN(d.getTime())) return "--/--/----";
                          const day = String(d.getDate()).padStart(2, '0');
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const year = d.getFullYear();
                          return `${day}/${month}/${year}`;
                        } catch (e) {
                          return String(chamado.created_at).split('T')[0] || "Sem data";
                        }
                      })()}
                    </div>
                    <div className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 uppercase tracking-tight">
                      {(() => {
                        if (!chamado.created_at) return "0 dias passados";
                        try {
                          const createdDate = new Date(chamado.created_at);
                          if (isNaN(createdDate.getTime())) return "";
                          const today = new Date();
                          const createdDateZero = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
                          const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                          const diffTime = todayZero.getTime() - createdDateZero.getTime();
                          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                          if (diffDays <= 0) {
                            return "0 dias passados (Hoje)";
                          }
                          return `${diffDays} ${diffDays === 1 ? "dia passado" : "dias passados"}`;
                        } catch (e) {
                          return "";
                        }
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderClientProposalsHistory = () => {
    if (isLoadingClientProposals) {
      return (
        <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-2 justify-center py-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-[#162546]" />
          <span>Buscando histórico de propostas...</span>
        </div>
      );
    }

    if (clientProposals.length === 0) return null;

    const generatePersonalizedPdfWindow = (proposal: any) => {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const clientName = proposal.cliente_nome || client?.nome || "CLIENTE";
      const cpf = proposal.cliente_cpf || client?.cpf || "";
      const getOrgao = () => {
        if (proposal.orgao) return proposal.orgao;
        if (proposal.cliente_orgao) return proposal.cliente_orgao;
        if (proposal.orgao_nome) return proposal.orgao_nome;
        if (proposal.secretaria) return proposal.secretaria;

        if (registrations && registrations.length > 0) {
          for (const reg of registrations) {
            if (reg.orgao) return reg.orgao;
            if ((reg as any).secretaria) return (reg as any).secretaria;
            
            const gLotacoes = (reg as any).governo_sp_lotacoes;
            if (Array.isArray(gLotacoes) && gLotacoes.length > 0) {
              if (gLotacoes[0]?.orgao) return gLotacoes[0].orgao;
              if (gLotacoes[0]?.secretaria) return gLotacoes[0].secretaria;
              if (gLotacoes[0]?.lotacao) return gLotacoes[0].lotacao;
            }

            const pLotacoes = (reg as any).prefeitura_sp_lotacoes;
            if (Array.isArray(pLotacoes) && pLotacoes.length > 0) {
              if (pLotacoes[0]?.orgao) return pLotacoes[0].orgao;
              if (pLotacoes[0]?.secretaria) return pLotacoes[0].secretaria;
              if (pLotacoes[0]?.lotacao) return pLotacoes[0].lotacao;
            }
          }
        }

        if (client) {
          if ((client as any).orgao) return (client as any).orgao;
          if ((client as any).orgao_nome) return (client as any).orgao_nome;
          if ((client as any).cliente_orgao) return (client as any).cliente_orgao;
          if ((client as any).secretaria) return (client as any).secretaria;
        }

        if (clientType) {
          if (clientType === 'governo_sp') return 'SPPREV';
          if (clientType === 'prefeitura_sp') return 'PREFEITURA SP';
          if (clientType === 'siape') return 'SIAPE';
          return clientType.toUpperCase().replace(/_/g, ' ');
        }

        return "";
      };

      const rawOrgao = getOrgao();
      const orgao = rawOrgao ? (typeof translateOrgao === 'function' ? translateOrgao(rawOrgao) : rawOrgao) : "";
      const consultant = proposal.user_nome || perfil?.nome || "CONSULTOR";
      const email = proposal.user_email || perfil?.email || "";
      const phone = proposal.telefone_consultor || (perfil as any)?.telefone || "";
      const consultantPhoto = proposal.consultantPhoto || proposal.foto_proposta_url || proposal.foto_url || (perfil as any)?.foto_proposta_url || (perfil as any)?.foto_url || "";

      const vContrato = Number(proposal.valor_contrato) || 0;
      const przEst = Number(proposal.prazo_estrategia) || 0;
      const pmMedia = Number(proposal.parcela_media) || 0;
      const txAm = Number(proposal.taxa_am) || 0;

      const formatBRL = (val: number) => {
        return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      };

      const formatMaskedCPF = (val: string) => {
        if (!val) return "";
        if (val.includes("*")) return val;
        const digits = String(val).replace(/\D/g, "");
        if (digits.length === 11) {
          return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
        }
        return val;
      };

      let rowsHtml = "";
      if (przEst > 0 && pmMedia > 0) {
        const term = przEst;
        const isSpecialCoef =
          (term === 12 && (Math.abs(txAm - 0.82) < 0.15 || txAm < 1.0)) ||
          (term === 24 && (Math.abs(txAm - 0.96) < 0.15 || txAm < 1.0));

        const rateForAmort = isSpecialCoef ? 0.05 : (txAm > 0 ? txAm / 100 : 0.0165);
        const originalPrazo = 96;

        let parcela = pmMedia;
        if (isSpecialCoef) {
          if (term === 24) {
            parcela = pmMedia / 1.0816;
          } else if (term === 12) {
            parcela = pmMedia / 2.0289;
          }
        }

        const totalExtraAmort = Math.max(0, originalPrazo - term);
        const extraPerMonth = term > 0 ? totalExtraAmort / term : 0;

        let currentBackInstallment = originalPrazo;

        for (let m = 1; m <= term; m++) {
          let numAmortThisMonth = 0;

          if (isSpecialCoef && term === 24) {
            if (m >= 1 && m <= 8) {
              numAmortThisMonth = 7;
            } else if (m >= 9 && m <= 16) {
              numAmortThisMonth = 2;
            } else {
              numAmortThisMonth = currentBackInstallment - term;
            }
            numAmortThisMonth = Math.min(numAmortThisMonth, currentBackInstallment - term);
          } else if (isSpecialCoef && term === 12) {
            if (m >= 1 && m <= 4) {
              numAmortThisMonth = 10;
            } else if (m === 5 || m === 6) {
              numAmortThisMonth = 9;
            } else if (m === 7) {
              numAmortThisMonth = 8;
            } else if (m === 8) {
              numAmortThisMonth = 6;
            } else if (m >= 9 && m <= 12) {
              numAmortThisMonth = 3;
            } else {
              numAmortThisMonth = currentBackInstallment - term;
            }
            numAmortThisMonth = Math.min(numAmortThisMonth, currentBackInstallment - term);
          } else {
            numAmortThisMonth = Math.min(
              Math.round(m * extraPerMonth) - Math.round((m - 1) * extraPerMonth),
              currentBackInstallment - term
            );
          }

          const amortNums: number[] = [];
          const amortVals: string[] = [];
          let sumAmortValsThisMonth = 0;

          for (let k = 0; k < numAmortThisMonth && currentBackInstallment > term; k++) {
            amortNums.push(currentBackInstallment);
            const valAmort = Math.max(0, parcela / Math.pow(1 + rateForAmort, currentBackInstallment));
            sumAmortValsThisMonth += valAmort;
            amortVals.push(formatBRL(valAmort));
            currentBackInstallment--;
          }

          const isEven = m % 2 === 0;
          const rowBg = isEven ? "#F8FAFC" : "#FFFFFF";

          const amortNumsStr = amortNums.length > 0 ? amortNums.join(", ") : "-";
          const amortValsStr = amortVals.length > 0 ? amortVals.join("<br/>") : formatBRL(0);
          const totalMes = parcela + sumAmortValsThisMonth;

          rowsHtml += `
            <tr style="background-color: ${rowBg}; border-bottom: 1px solid #E2E8F0;">
              <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${m}</td>
              <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(parcela)}</td>
              <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #475569; vertical-align: top;">${amortNumsStr}</td>
              <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${amortValsStr}</td>
              <td style="padding: 10px 16px; text-align: center; font-weight: bold; color: #1E293B; vertical-align: top;">${formatBRL(totalMes)}</td>
            </tr>
          `;
        }
      }

      const d = new Date();
      d.setDate(d.getDate() + 1);
      const validityDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Proposta Comercial - ${clientName}</title>
            <style>
              @page { size: A4; margin: 0mm; }
              * { font-family: Arial, Helvetica, sans-serif !important; box-sizing: border-box; }
              body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 10mm 12mm; color: #1E293B; background: #FFF; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              @media print { 
                .no-print { display: none !important; }
                body { padding: 10mm 12mm; }
              }
              .pdf-header { padding: 10px 0 0 0; }
              .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
              .metric-card { border: 1px solid #E2E8F0; border-radius: 12px; padding: 14px 12px; background: #FFF; }
              .metric-label { font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.5px; }
              .metric-value { font-size: 16px; font-weight: 900; color: #0F172A; margin: 6px 0 4px 0; }
              .metric-highlight { color: #00D492; }
              .table-container { margin: 20px 0; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden; }
              table { width: 100%; border-collapse: collapse; font-size: 11px; }
              th { background-color: #111827; color: #00D492; padding: 10px 12px; text-transform: uppercase; font-size: 10px; font-weight: 800; text-align: center; }
            </style>
          </head>
          <body>
            <div class="pdf-header">
              <div style="display: flex; align-items: center; justify-content: center; gap: 16px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0; margin-bottom: 24px;">
                <img src="/logo.png" alt="SharkConsig" style="height: 38px; object-fit: contain;" />
                <span style="color: #CBD5E1; font-size: 28px; font-weight: 300;">|</span>
                <div style="display: flex; flex-direction: column; text-align: left;">
                  <span style="font-size: 10px; color: #64748B; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px;">FORMALIZAÇÃO DE</span>
                  <span style="font-size: 24px; font-weight: 900; color: #162546; letter-spacing: -0.5px; text-transform: uppercase;">PROPOSTA</span>
                </div>
              </div>

              <div style="background-color: #162546 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; border-radius: 18px; padding: 20px 24px; color: #FFF; display: flex; justify-content: space-between; align-items: center; position: relative; overflow: visible;">
                <div style="display: flex; align-items: center; gap: 16px;">
                  <div style="width: 44px; height: 44px; border-radius: 50%; border: 1.5px solid #F4C600; display: flex; align-items: center; justify-content: center; background: rgba(244, 198, 0, 0.1); color: #F4C600; font-weight: 900; font-size: 15px; flex-shrink: 0;">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div style="display: flex; flex-direction: column; text-align: left;">
                    <div style="font-weight: 900; font-size: 14px; text-transform: uppercase; color: #FFFFFF; letter-spacing: 0.5px; line-height: 1.2;">${clientName}</div>
                    <div style="font-size: 11px; color: #94A3B8; margin-top: 3px; font-weight: 600; display: flex; flex-direction: column; gap: 2px;">
                      <span class="cpf-display">${cpf ? 'CPF: ' + formatMaskedCPF(cpf) : ''}</span>
                      ${orgao ? `<span class="orgao-display">Órgão: ${orgao}</span>` : ''}
                    </div>
                  </div>
                </div>

                <div style="display: flex; flex-direction: column; text-align: right; align-items: flex-end; gap: 4px; border-left: 1px solid rgba(255, 255, 255, 0.15); padding-left: 20px;">
                  <div style="color: #F4C600; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${consultant}</div>
                  ${email ? `
                  <div style="display: flex; align-items: center; gap: 6px; color: #E2E8F0; font-size: 11px; font-weight: 500;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                    </svg>
                    <span>${email}</span>
                  </div>
                  ` : ''}
                  ${phone ? `
                  <div style="display: flex; align-items: center; gap: 6px; color: #E2E8F0; font-size: 11px; font-weight: 500;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F4C600" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <span>${phone}</span>
                  </div>
                  ` : ''}
                </div>
              </div>
            </div>

            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-label">VALOR DO CONTRATO</div>
                <div class="metric-value">${formatBRL(vContrato)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">DURAÇÃO</div>
                <div class="metric-value metric-highlight">${przEst} parcelas</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">PARCELA MÉDIA</div>
                <div class="metric-value">${formatBRL(pmMedia)}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">TAXA A.M.</div>
                <div class="metric-value">${txAm.toFixed(2).replace('.', ',')}%</div>
              </div>
            </div>

            ${rowsHtml ? `
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>PRAZO</th>
                    <th>FIXA EM FOLHA</th>
                    <th>AMORTIZADAS</th>
                    <th>VALOR AMORTIZAÇÕES</th>
                    <th>TOTAL MÊS</th>
                  </tr>
                </thead>
                <tbody>
                  ${rowsHtml}
                </tbody>
              </table>
            </div>
            ` : ''}

            <div style="margin: 24px 0; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0; padding-top: 12px;">
              • Cálculos de amortização de parcela são diários e sofrem alteração.<br/>
              • Proposta válida até ${validityDateStr}, sujeita a alteração sem aviso prévio.<br/>
              • A taxa de juros final e a redução do valor da parcela poderão sofrer oscilações a critério das instituições bancárias.
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
      `);
      printWindow.document.close();
    };

    const handleDownloadProposal = (proposal: any) => {
      if (proposal.isCalculadora || proposal.isPersonalize) {
        if (proposal.arquivo_url && proposal.arquivo_url.startsWith("http")) {
          const link = document.createElement("a");
          link.href = proposal.arquivo_url;
          const safeName = (proposal.cliente_nome || "Cliente").trim().replace(/\s+/g, "_");
          link.download = `proposta_personalizada_${safeName}.pdf`;
          link.click();
          return;
        }
        generatePersonalizedPdfWindow(proposal);
        return;
      }

      if (!proposal.arquivo_url) return;
      const link = document.createElement("a");
      link.href = proposal.arquivo_url;
      const extension = proposal.tipo_arquivo?.toLowerCase() === "pdf" ? "pdf" : "jpg";
      const safeName = (proposal.cliente_nome || "Cliente").trim().replace(/\s+/g, "_");
      link.download = `proposta_reducao_${safeName}.${extension}`;
      link.click();
    };

    return (
      <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-5 bg-[#162546] rounded-full"></div>
          <h4 className="text-[12px] font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
            Histórico de Propostas Comerciais{" "}
            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-[#162546]/10 text-[#162546] border-none font-black font-sans uppercase">
              {clientProposals.length} {clientProposals.length === 1 ? 'Proposta' : 'Propostas'}
            </Badge>
          </h4>
        </div>
        
        <div className="flex flex-col gap-3">
          {clientProposals.map((proposal) => {
            const dateStr = proposal.created_at ? (() => {
              try {
                const d = new Date(proposal.created_at);
                if (isNaN(d.getTime())) return "--/--/---- às --:--";
                const day = String(d.getDate()).padStart(2, '0');
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const year = d.getFullYear();
                const hours = String(d.getHours()).padStart(2, '0');
                const minutes = String(d.getMinutes()).padStart(2, '0');
                return `${day}/${month}/${year} às ${hours}:${minutes}`;
              } catch (e) {
                return "Sem data";
              }
            })() : "--/--/---- às --:--";

            const roleLower = perfil?.role?.toLowerCase() || "";
            const isCorretor = roleLower === 'corretor';
            const isEstagiario = isUserEstagio || roleLower === 'estágio' || roleLower === 'estagio';
            const isSupervisor = roleLower === 'supervisor';
            const shouldHideDownload = isCorretor || isEstagiario || isSupervisor;

            return (
              <div 
                key={proposal.id} 
                className="p-4 rounded-xl border border-slate-100 bg-slate-50/10 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[#162546]/20 hover:bg-slate-50/20 transition-all shadow-[0_1px_3px_rgba(22,37,70,0.01)]"
              >
                <div className="flex items-center gap-3 min-w-[150px]">
                  <div className="w-8 h-8 rounded-lg bg-[#162546]/5 border border-[#162546]/15 flex items-center justify-center text-[#162546]">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gerada por</span>
                    <span className="text-[12px] font-extrabold text-slate-700 uppercase leading-none block truncate max-w-[140px]">{formatShortName(proposal.user_nome || proposal.user_email)}</span>
                  </div>
                </div>

                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Estratégia</span>
                  {proposal.isCalculadora ? (
                    <span className="text-[12px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                      PERSONALIZADA
                    </span>
                  ) : proposal.isQuitacao ? (
                    <span className="text-[12px] font-bold text-[#162546] bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                      Quitação de Contrato
                    </span>
                  ) : proposal.isNovoFormato ? (
                    <span className="text-[12px] font-bold text-yellow-600 bg-yellow-50 border border-yellow-100 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                      Novo Formato
                    </span>
                  ) : (
                    <span className="text-[12px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 uppercase tracking-tight w-fit">
                      REDUÇÃO DE PARCELA
                    </span>
                  )}
                </div>

                {proposal.isCalculadora && (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Valor do Contrato</span>
                      <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                        <span className="text-emerald-600 font-bold">{proposal.valor_contrato ? formatCurrency(proposal.valor_contrato) : "--"}</span>
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Duração</span>
                      <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                        {proposal.prazo_estrategia ? `${proposal.prazo_estrategia}x` : "--"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Parcela Média</span>
                      <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                        {proposal.parcela_media ? formatCurrency(proposal.parcela_media) : "--"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Taxa a.m.</span>
                      <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                        {proposal.taxa_am !== null && proposal.taxa_am !== undefined ? `${Number(proposal.taxa_am).toFixed(2).replace('.', ',')}%` : "--"}
                      </span>
                    </div>
                  </>
                )}

                {!proposal.isQuitacao && !proposal.isNovoFormato && !proposal.isCalculadora && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Valor Liberado</span>
                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                      {proposal.valor_liberado ? (
                        <span className="text-emerald-600 font-bold">{formatCurrency(proposal.valor_liberado)}</span>
                      ) : (
                        <span className="text-slate-400">--</span>
                      )}
                    </span>
                  </div>
                )}

                {proposal.isNovoFormato && (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Valor Antigo</span>
                      <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                        {proposal.valor_liberado ? (
                          <span className="text-slate-500 font-bold">{formatCurrency(proposal.valor_liberado * 0.70)}</span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Valor Atual</span>
                      <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                        {proposal.valor_liberado ? (
                          <span className="text-[#F4C600] font-black">{formatCurrency(proposal.valor_liberado)}</span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </span>
                    </div>
                  </>
                )}

                {!proposal.isNovoFormato && !proposal.isQuitacao && !proposal.isCalculadora && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                      PARCELA ANTIGA {"->"} PARCELA NOVA
                    </span>
                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                      <span className="text-slate-800">{formatCurrency(proposal.total_parcela_atual || 0)}</span> ➔ <span className="text-emerald-600 font-bold">{formatCurrency(proposal.total_parcela_nova || 0)}</span>
                    </span>
                  </div>
                )}

                {proposal.isQuitacao && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                      Saldo para Quitação
                    </span>
                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                      <span className="text-[#c44a4a] font-bold">
                        {proposal.saldo_quitacao ? formatCurrency(proposal.saldo_quitacao) : "--"}
                      </span>
                    </span>
                  </div>
                )}

                {proposal.isQuitacao && (() => {
                  const prazo = parseInt(proposal.prazo_restante) || 96;
                  const pAtual = parseFloat(proposal.parcela_atual) || 0;
                  const pNova = parseFloat(proposal.nova_parcela) || 0;
                  const economiaTotal = Math.max(0, (pAtual - pNova) * prazo);
                  return (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                        Economia Total
                      </span>
                      <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                        <span className="text-emerald-600 font-bold">
                          {formatCurrency(economiaTotal)}
                        </span>
                      </span>
                    </div>
                  );
                })()}

                {!proposal.isNovoFormato && !proposal.isQuitacao && !proposal.isCalculadora && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Diferença nas Parcelas</span>
                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                      <span className="text-emerald-600 font-black">
                        {formatCurrency((proposal.total_parcela_nova || 0) - (proposal.total_parcela_atual || 0))}
                      </span>
                    </span>
                  </div>
                )}

                {proposal.isQuitacao && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Redução Mensal</span>
                    <span className="text-[12px] font-extrabold text-slate-700 leading-none block">
                      <span className="text-emerald-600 font-black">
                        {formatCurrency(proposal.reducao_mensal || 0)}
                      </span>
                    </span>
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Gerado em</span>
                  <span className="text-[11px] font-bold text-slate-500 leading-none block">{dateStr}</span>
                </div>

                <div className="flex items-center gap-2">
                  {!shouldHideDownload && (
                    <Button
                      type="button"
                      onClick={() => handleDownloadProposal(proposal)}
                      className="h-8 px-3 text-[10px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-md transition-all rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {proposal.tipo_arquivo || "PDF"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const fetchRegistrationsForType = async (
    type: 'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | 'governo_ms' | 'prefeitura_natal' | 'prefeitura_porto_velho' | 'governo_ba' | 'governo_am' | 'governo_ce' | 'governo_ro',
    clientData: ClientData
  ): Promise<Registration[]> => {
    const ensureArray = (val: unknown): Record<string, unknown>[] => {
      if (!val) return []
      if (Array.isArray(val)) return val as Record<string, unknown>[]
      return [val] as unknown as Record<string, unknown>[]
    }

    if (type === 'siape') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('matriculas').select('*, instituidores(*, itens_credito(*))').eq('cliente_cpf', clientData.cpf)
      )
      if (regError) throw regError
      return (regData || []) as Registration[]
    } else if (type === 'governo_sp') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_sp_identificacoes').select('*, governo_sp_lotacoes(*)').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        const lotacoes = ensureArray(r.governo_sp_lotacoes)
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.identificacao as string) || '---',
          identificacao: (r.identificacao as string) || '---',
          situacao_funcional: r.situacao_funcional as string | null,
          salario: 0,
          orgao: r.secretaria as string | null,
          regime_juridico: r.regime_juridico as string | null,
          uf: 'SP',
          governo_sp_lotacoes: lotacoes,
          instituidores: lotacoes.map((l) => ({
            id: l.id as string,
            nome: null,
            itens_credito: []
          }))
        }
      }) as unknown as Registration[]
    } else if (type === 'prefeitura_sp') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('prefeitura_sp_identificacoes').select('*, prefeitura_sp_lotacoes(*)').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        const lotacoes = ensureArray(r.prefeitura_sp_lotacoes)
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.identificacao as string) || '---',
          identificacao: (r.identificacao as string) || '---',
          situacao_funcional: (r.tipo_vinculo as string) || (r.situacao_funcional as string) || null,
          salario: 0,
          orgao: (lotacoes[0]?.orgao as string) || (r.orgao as string) || (r.secretaria as string) || null,
          regime_juridico: (lotacoes[0]?.lotacao as string) || (r.regime_juridico as string) || null,
          uf: 'SP',
          prefeitura_sp_lotacoes: lotacoes,
          instituidores: lotacoes.map((l) => ({
            id: l.id as string,
            nome: null,
            itens_credito: []
          }))
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_pi') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_pi_identificacoes').select('*, governo_pi_lotacoes(*)').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        const lotacoes = ensureArray(r.governo_pi_lotacoes)
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          situacao_funcional: r.situacao_funcional as string | null,
          salario: 0,
          orgao: r.secretaria as string | null,
          regime_juridico: r.regime_juridico as string | null,
          uf: 'PI',
          governo_pi_lotacoes: lotacoes,
          instituidores: lotacoes.map((l) => ({
            id: l.id as string,
            nome: null,
            itens_credito: []
          }))
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_ma') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_ma_identificacoes').select('*, governo_ma_lotacoes(*)').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        const lotacoes = ensureArray(r.governo_ma_lotacoes)
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          situacao_funcional: r.situacao_funcional as string | null,
          salario: 0,
          orgao: r.secretaria as string | null,
          regime_juridico: r.regime_juridico as string | null,
          uf: 'MA',
          governo_ma_lotacoes: lotacoes,
          instituidores: lotacoes.map((l) => ({
            id: l.id as string,
            nome: null,
            itens_credito: []
          }))
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_rr') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_rr_matriculas').select('*, governo_rr_instituidores(*)').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        const instituidores = ensureArray(r.governo_rr_instituidores)
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          situacao_funcional: r.situacao_funcional as string | null,
          salario: 0,
          orgao: r.secretaria as string | null,
          regime_juridico: r.regime_juridico as string | null,
          uf: 'RR',
          governo_rr_instituidores: instituidores,
          instituidores: instituidores.map((l) => ({
            id: l.id as string,
            nome: null,
            itens_credito: []
          }))
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_rj') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_rj_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          situacao_funcional: null,
          salario: 0,
          orgao: r.orgao as string | null,
          regime_juridico: null,
          uf: 'RJ',
          instituidores: []
        }
      }) as unknown as Registration[]
    } else if (type === 'prefeitura_santo_andre') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('prefeitura_santo_andre_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          situacao_funcional: null,
          salario: 0,
          orgao: r.orgao as string | null,
          vinculo: r.vinculo as string | null,
          regime_juridico: null,
          uf: 'SP',
          margem_bruta_cartao: r.margem_bruta_cartao || 0.00,
          margem_liquida_cartao: r.margem_liquida_cartao || 0.00,
          instituidores: []
        }
      }) as unknown as Registration[]
    } else if (type === 'prefeitura_contagem') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('prefeitura_contagem_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          situacao_funcional: r.situacao_funcional as string | null,
          data_de_admissao: r.data_de_admissao as string | null,
          salario: 0,
          orgao: r.orgao as string | null,
          regime_juridico: null,
          uf: 'MG',
          margem_emprestimo_bruta: r.margem_emprestimo_bruta || 0.00,
          margem_emprestimo_liquida: r.margem_emprestimo_liquida || 0.00,
          margem_cartao_bruta: r.margem_cartao_bruta || 0.00,
          margem_cartao_liquida: r.margem_cartao_liquida || 0.00,
          instituidores: []
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_mg') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_mg_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          orgao: r.orgao as string | null,
          uf: 'MG',
          margem_70: r.margem_70 || 0.00,
          margem_emprestimo: r.margem_emprestimo || 0.00,
          cartao_credito: r.cartao_credito || 0.00,
          cartao_beneficio: r.cartao_beneficio || r.margem_beneficio || 0.00,
          margem_beneficio: r.cartao_beneficio || r.margem_beneficio || 0.00,
          instituidores: []
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_ms') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_ms_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          orgao: r.orgao as string | null,
          uf: 'MS',
          instituidores: []
        }
      }) as unknown as Registration[]
    } else if (type === 'prefeitura_natal') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('prefeitura_natal_identificacoes').select('*, prefeitura_natal_lotacoes(*)').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        const lotacoes = ensureArray(r.prefeitura_natal_lotacoes)
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          vinculo: r.vinculo as string | null,
          salario: 0,
          orgao: lotacoes[0]?.orgao as string | null,
          uf: 'RN',
          prefeitura_natal_lotacoes: lotacoes,
          instituidores: lotacoes.map((l) => ({
            id: l.id as string,
            nome: null,
            itens_credito: []
          }))
        }
      }) as unknown as Registration[]
    } else if (type === 'prefeitura_porto_velho') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('prefeitura_porto_velho_identificacoes').select('*, prefeitura_porto_velho_lotacoes(*)').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        const lotacoes = ensureArray(r.prefeitura_porto_velho_lotacoes)
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          vinculo: r.vinculo as string | null,
          salario: 0,
          orgao: lotacoes[0]?.orgao as string | null,
          uf: 'RO',
          prefeitura_porto_velho_lotacoes: lotacoes,
          instituidores: lotacoes.map((l) => ({
            id: l.id as string,
            nome: null,
            itens_credito: []
          }))
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_ba') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_ba_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          orgao: r.orgao as string | null,
          secretaria: r.secretaria as string | null,
          situacao: r.situacao as string | null,
          tipo_servidor: r.tipo_servidor as string | null,
          margem_emprestimo_total: r.margem_emprestimo_total || 0.00,
          margem_emprestimo_disponivel: r.margem_emprestimo_disponivel || 0.00,
          uf: 'BA',
          instituidores: []
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_am') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_am_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          orgao: r.orgao as string | null,
          secretaria: r.secretaria as string | null,
          cargo: r.cargo as string | null,
          situacao: r.situacao as string | null,
          tipo_servidor: r.tipo_servidor as string | null,
          margem_consignavel: r.margem_consignavel || 0.00,
          margem_cartao: r.margem_cartao || 0.00,
          margem_cartao_beneficio: r.margem_cartao_beneficio || 0.00,
          margem_cartao_beneficio_saque: r.margem_cartao_beneficio_saque || 0.00,
          uf: 'AM',
          instituidores: []
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_ce') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_ce_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: '---',
          matricula: '---',
          orgao: r.orgao as string | null,
          secretaria: r.secretaria as string | null,
          vinculo: r.vinculo as string | null,
          salario: r.salario || 0.00,
          uf: 'CE',
          instituidores: []
        }
      }) as unknown as Registration[]
    } else if (type === 'governo_ro') {
      const { data: regData, error: regError } = await withRetry(async () => 
        await supabase.from('governo_ro_matriculas').select('*').eq('cliente_id', clientData.id)
      )
      if (regError) throw regError
      return (regData || []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          orgao: (r.orgao as string) || "GOVERNO DE RONDÔNIA",
          secretaria: r.secretaria as string | null,
          cargo: r.cargo as string | null,
          vinculo: r.vinculo as string | null,
          salario: r.salario || 0.00,
          margem_emprestimo: r.margem_emprestimo || 0.00,
          margem_cartao: r.margem_cartao || 0.00,
          margem_cartao_beneficio: r.margem_cartao_beneficio || 0.00,
          uf: 'RO',
          instituidores: []
        }
      }) as unknown as Registration[]
    }
    return []
  }

  const loadProfilesForCpf = async (cpf: string, preferredType?: 'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | 'governo_ms' | 'prefeitura_natal' | 'prefeitura_porto_velho' | 'governo_ba' | 'governo_am' | 'governo_ce' | 'governo_ro' | null) => {
    const tableMap = {
      siape: 'clientes',
      governo_sp: 'governo_sp_clientes',
      prefeitura_sp: 'prefeitura_sp_clientes',
      governo_pi: 'governo_pi_clientes',
      governo_ma: 'governo_ma_clientes',
      governo_rr: 'governo_rr_clientes',
      governo_rj: 'governo_rj_clientes',
      prefeitura_santo_andre: 'prefeitura_santo_andre_clientes',
      prefeitura_contagem: 'prefeitura_contagem_clientes',
      governo_mg: 'governo_mg_clientes',
      governo_ms: 'governo_ms_clientes',
      prefeitura_natal: 'prefeitura_natal_clientes',
      prefeitura_porto_velho: 'prefeitura_porto_velho_clientes',
      governo_ba: 'governo_ba_clientes',
      governo_am: 'governo_am_clientes',
      governo_ce: 'governo_ce_clientes',
      governo_ro: 'governo_ro_clientes'
    }

    const foundProfiles: ConvenioProfile[] = []

    const queryPromises = Object.entries(tableMap).map(async ([type, table]) => {
      try {
        const { data, error } = await withRetry(async () => 
          await supabase.from(table).select('*').eq('cpf', cpf).maybeSingle()
        )
        if (!error && data) {
          const clientObj: ClientData = {
            id: (data.id as string) || (data.cpf as string),
            nome: data.nome as string | null,
            cpf: data.cpf as string,
            data_nascimento: data.data_nascimento as string | null,
            telefone_1: data.telefone_1 as string | null,
            telefone_2: (data.telefone_2 || data.telefone_recado) as string | null,
            telefone_3: data.telefone_3 as string | null,
          }
          const regs = await fetchRegistrationsForType(type as ConvenioProfile['type'], clientObj)
          return {
            type: type as ConvenioProfile['type'],
            client: clientObj,
            registrations: regs
          }
        }
      } catch (err) {
        console.error(`Erro ao carregar perfil ${type} para o CPF ${cpf}:`, err)
      }
      return null
    })

    const results = await Promise.all(queryPromises)
    results.forEach(p => {
      if (p) foundProfiles.push(p)
    })

    if (foundProfiles.length === 0) {
      throw new Error("Cliente não encontrado.")
    }

    setProfiles(foundProfiles)

    const initialProfile = foundProfiles.find(p => p.type === preferredType) || foundProfiles[0]
    
    setClient(initialProfile.client)
    setClientType(initialProfile.type)
    setRegistrations(initialProfile.registrations)
    setActiveRegIndex(0)
    setShowProfile(true)
  }

  const triggerAutoSearch = async (targetCpf: string) => {
    if (!targetCpf) return
    setIsLoading(true)
    setError(null)
    setShowProfile(false)
    setShowSensitiveData(false)
    setClient(null)
    setClientType(null)
    setRegistrations([])
    setProfiles([])
    setActiveRegIndex(0)

    try {
      const digits = targetCpf.replace(/\D/g, "")
      if (!digits) {
        setError("Por favor, insira um CPF ou telefone.")
        setIsLoading(false)
        return
      }
      
      const cleanCPF = digits.padStart(11, '0')
      const phoneDigits = digits.length >= 8 ? (digits.length > 11 ? digits.slice(-11) : digits) : digits;

      const searchTerms = [
        `cpf.eq.${cleanCPF}`,
        `telefone_1.eq.${digits}`,
        `telefone_2.eq.${digits}`,
        `telefone_3.eq.${digits}`
      ]

      if (digits.length >= 8) {
        if (digits !== phoneDigits) {
          searchTerms.push(`telefone_1.eq.${phoneDigits}`, `telefone_2.eq.${phoneDigits}`, `telefone_3.eq.${phoneDigits}`)
        }
        if (digits.length === 11) {
          const withoutNinth = digits.slice(0, 2) + digits.slice(3)
          searchTerms.push(`telefone_1.eq.${withoutNinth}`, `telefone_2.eq.${withoutNinth}`, `telefone_3.eq.${withoutNinth}`)
        }
        if (digits.length === 11) {
          const withZero = `0${digits}`
          searchTerms.push(`telefone_1.eq.${withZero}`, `telefone_2.eq.${withZero}`, `telefone_3.eq.${withZero}`)
        }
      }

      const splitTables = [
        { name: 'base_consulta_siape', convenio: 'siape' },
        { name: 'base_consulta_governo_sp', convenio: 'governo_sp' },
        { name: 'base_consulta_prefeitura_sp', convenio: 'prefeitura_sp' },
        { name: 'base_consulta_governo_pi', convenio: 'governo_pi' },
        { name: 'base_consulta_governo_ma', convenio: 'governo_ma' },
        { name: 'base_consulta_governo_rr', convenio: 'governo_rr' },
        { name: 'base_consulta_governo_rj', convenio: 'governo_rj' },
        { name: 'base_consulta_prefeitura_santo_andre', convenio: 'prefeitura_santo_andre' },
        { name: 'base_consulta_prefeitura_contagem', convenio: 'prefeitura_contagem' },
        { name: 'base_consulta_governo_mg', convenio: 'governo_mg' },
        { name: 'base_consulta_governo_ms', convenio: 'governo_ms' },
        { name: 'base_consulta_prefeitura_natal', convenio: 'prefeitura_natal' },
        { name: 'base_consulta_prefeitura_porto_velho', convenio: 'prefeitura_porto_velho' },
        { name: 'base_consulta_governo_ba', convenio: 'governo_ba' },
        { name: 'base_consulta_governo_am', convenio: 'governo_am' },
        { name: 'base_consulta_governo_ce', convenio: 'governo_ce' },
        { name: 'base_consulta_governo_ro', convenio: 'governo_ro' },
      ];

      const results = await Promise.all(
        splitTables.map(async (t) => {
          try {
            const { data, error } = await supabase
              .from(t.name)
              .select('*')
              .or(searchTerms.join(','))
              .limit(1)
              .maybeSingle();
            if (!error && data) {
              return { ...data, convenio: t.convenio, origem: t.convenio };
            }
          } catch (e) {
            console.warn(`Erro na tabela ${t.name}:`, e);
          }
          return null;
        })
      );

      const quickData = results.find(r => r !== null) || null;

      let preferredType: 'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | 'governo_ms' | 'prefeitura_natal' | 'prefeitura_porto_velho' | 'governo_ba' | 'governo_am' | 'governo_ce' | 'governo_ro' | null = null
      let resolvedCpf = cleanCPF

      if (quickData) {
        resolvedCpf = quickData.cpf || cleanCPF
        const source = quickData.origem
        if (source === 'siape') preferredType = 'siape'
        else if (source === 'governo_sp') preferredType = 'governo_sp'
        else if (source === 'prefeitura_sp') preferredType = 'prefeitura_sp'
        else if (source === 'governo_pi') preferredType = 'governo_pi'
        else if (source === 'governo_ma') preferredType = 'governo_ma'
        else if (source === 'governo_rr') preferredType = 'governo_rr'
        else if (source === 'governo_rj') preferredType = 'governo_rj'
        else if (source === 'prefeitura_santo_andre') preferredType = 'prefeitura_santo_andre'
        else if (source === 'prefeitura_contagem') preferredType = 'prefeitura_contagem'
        else if (source === 'governo_mg') preferredType = 'governo_mg'
        else if (source === 'governo_ms') preferredType = 'governo_ms'
        else if (source === 'prefeitura_natal') preferredType = 'prefeitura_natal'
        else if (source === 'prefeitura_porto_velho') preferredType = 'prefeitura_porto_velho'
        else if (source === 'governo_ba') preferredType = 'governo_ba'
        else if (source === 'governo_am') preferredType = 'governo_am'
        else if (source === 'governo_ce') preferredType = 'governo_ce'
        else if (source === 'governo_ro') preferredType = 'governo_ro'
      }

      await loadProfilesForCpf(resolvedCpf, preferredType)
    } catch (err) {
      console.error("Erro na busca automática:", err)
      setError("Ocorreu um erro ao buscar o cliente. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const cpfParam = params.get("cpf")
      if (cpfParam) {
        setSearchQuery(cpfParam)
        triggerAutoSearch(cpfParam)
      }
    }
  }, [])

  const handleSearch = async () => {
    if (!searchQuery) return
    
    setIsLoading(true)
    setError(null)
    setShowProfile(false)
    setShowSensitiveData(false)
    setClient(null)
    setClientType(null)
    setRegistrations([])
    setProfiles([])
    setActiveRegIndex(0)

    try {
      const digits = searchQuery.replace(/\D/g, "")
      if (!digits) {
        setError("Por favor, insira um CPF ou telefone.")
        setIsLoading(false)
        return
      }
      
      const cleanCPF = digits.padStart(11, '0')
      const formattedCPF = cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
      const phoneDigits = digits.length >= 8 ? (digits.length > 11 ? digits.slice(-11) : digits) : digits;

      // ESTRATÉGIA DE BUSCA OTIMIZADA (Split Tables)
      const searchTerms = [
        `cpf.eq.${cleanCPF}`,
        `cpf.eq."${formattedCPF}"`,
        `telefone_1.eq.${digits}`,
        `telefone_2.eq.${digits}`,
        `telefone_3.eq.${digits}`
      ]

      if (digits.length >= 8) {
        if (digits !== phoneDigits) {
          searchTerms.push(`telefone_1.eq.${phoneDigits}`, `telefone_2.eq.${phoneDigits}`, `telefone_3.eq.${phoneDigits}`)
        }
        if (digits.length === 11) {
          const withoutNinth = digits.slice(0, 2) + digits.slice(3)
          searchTerms.push(`telefone_1.eq.${withoutNinth}`, `telefone_2.eq.${withoutNinth}`, `telefone_3.eq.${withoutNinth}`)
        }
        if (digits.length === 11) {
          const withZero = `0${digits}`
          searchTerms.push(`telefone_1.eq.${withZero}`, `telefone_2.eq.${withZero}`, `telefone_3.eq.${withZero}`)
        }

        // Adiciona telefones com variações de formatos comuns usando aspas duplas para o Supabase .or() aceitar caracteres especiais
        if (digits.length === 11) {
          const ddd = digits.slice(0, 2);
          const prefix = digits.slice(2, 7);
          const suffix = digits.slice(7);
          searchTerms.push(
            `telefone_1.eq."(${ddd}) ${prefix}-${suffix}"`,
            `telefone_2.eq."(${ddd}) ${prefix}-${suffix}"`,
            `telefone_3.eq."(${ddd}) ${prefix}-${suffix}"`,
            `telefone_1.eq."(${ddd})${prefix}-${suffix}"`,
            `telefone_2.eq."(${ddd})${prefix}-${suffix}"`,
            `telefone_3.eq."(${ddd})${prefix}-${suffix}"`,
            `telefone_1.eq."${ddd} ${prefix}-${suffix}"`,
            `telefone_2.eq."${ddd} ${prefix}-${suffix}"`,
            `telefone_3.eq."${ddd} ${prefix}-${suffix}"`
          );
        } else if (digits.length === 10) {
          const ddd = digits.slice(0, 2);
          const prefix = digits.slice(2, 6);
          const suffix = digits.slice(6);
          searchTerms.push(
            `telefone_1.eq."(${ddd}) ${prefix}-${suffix}"`,
            `telefone_2.eq."(${ddd}) ${prefix}-${suffix}"`,
            `telefone_3.eq."(${ddd}) ${prefix}-${suffix}"`,
            `telefone_1.eq."(${ddd})${prefix}-${suffix}"`,
            `telefone_2.eq."(${ddd})${prefix}-${suffix}"`,
            `telefone_3.eq."(${ddd})${prefix}-${suffix}"`,
            `telefone_1.eq."${ddd} ${prefix}-${suffix}"`,
            `telefone_2.eq."${ddd} ${prefix}-${suffix}"`,
            `telefone_3.eq."${ddd} ${prefix}-${suffix}"`
          );
        }
      }

      const splitTables = [
        { name: 'base_consulta_siape', convenio: 'siape' },
        { name: 'base_consulta_governo_sp', convenio: 'governo_sp' },
        { name: 'base_consulta_prefeitura_sp', convenio: 'prefeitura_sp' },
        { name: 'base_consulta_governo_pi', convenio: 'governo_pi' },
        { name: 'base_consulta_governo_ma', convenio: 'governo_ma' },
        { name: 'base_consulta_governo_rr', convenio: 'governo_rr' },
        { name: 'base_consulta_governo_rj', convenio: 'governo_rj' },
        { name: 'base_consulta_prefeitura_santo_andre', convenio: 'prefeitura_santo_andre' },
        { name: 'base_consulta_prefeitura_contagem', convenio: 'prefeitura_contagem' },
        { name: 'base_consulta_governo_mg', convenio: 'governo_mg' },
        { name: 'base_consulta_governo_ms', convenio: 'governo_ms' },
        { name: 'base_consulta_prefeitura_natal', convenio: 'prefeitura_natal' },
        { name: 'base_consulta_prefeitura_porto_velho', convenio: 'prefeitura_porto_velho' },
        { name: 'base_consulta_governo_ba', convenio: 'governo_ba' },
        { name: 'base_consulta_governo_am', convenio: 'governo_am' },
        { name: 'base_consulta_governo_ce', convenio: 'governo_ce' },
        { name: 'base_consulta_governo_ro', convenio: 'governo_ro' },
      ];

      const results = await Promise.all(
        splitTables.map(async (t) => {
          try {
            const { data, error } = await supabase
              .from(t.name)
              .select('cpf')
              .or(searchTerms.join(','))
              .limit(1)
              .maybeSingle();
            if (!error && data) {
              return { ...data, convenio: t.convenio };
            }
          } catch (e) {
            console.warn(`Erro na tabela ${t.name}:`, e);
          }
          return null;
        })
      );

      const quickData = results.find(r => r !== null) || null;

      const targetConvenio = quickData?.convenio as 'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | 'governo_ms' | 'prefeitura_natal' | 'prefeitura_porto_velho' | 'governo_ba' | 'governo_am' | 'governo_ce' | 'governo_ro' | undefined
      const finalCpf = quickData?.cpf || cleanCPF
      
      const isActuallyAPhone = digits.length >= 8 && digits.length <= 13

      if (quickData?.cpf) {
        await loadProfilesForCpf(quickData.cpf, targetConvenio || null)
        return
      }

      // FALLBACK: busca sequencial nas tabelas de produção pelo telefone ou CPF diretamente
      const tableMap = {
        siape: 'clientes',
        governo_sp: 'governo_sp_clientes',
        prefeitura_sp: 'prefeitura_sp_clientes',
        governo_pi: 'governo_pi_clientes',
        governo_ma: 'governo_ma_clientes',
        governo_rr: 'governo_rr_clientes',
        governo_rj: 'governo_rj_clientes',
        prefeitura_santo_andre: 'prefeitura_santo_andre_clientes',
        prefeitura_contagem: 'prefeitura_contagem_clientes',
        governo_mg: 'governo_mg_clientes',
        governo_ms: 'governo_ms_clientes',
        prefeitura_natal: 'prefeitura_natal_clientes',
        prefeitura_porto_velho: 'prefeitura_porto_velho_clientes',
        governo_ba: 'governo_ba_clientes',
        governo_am: 'governo_am_clientes',
        governo_ce: 'governo_ce_clientes',
        governo_ro: 'governo_ro_clientes'
      }

      let foundCpf: string | null = null
      let foundType: 'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | 'governo_ms' | 'prefeitura_natal' | 'prefeitura_porto_velho' | 'governo_ba' | 'governo_am' | 'governo_ce' | 'governo_ro' | null = null

      for (const [type, table] of Object.entries(tableMap)) {
        const query = supabase.from(table).select('cpf')
        if (isActuallyAPhone) {
          const prodSearch = [`cpf.eq.${cleanCPF}`, `telefone_1.eq.${digits}`, `telefone_2.eq.${digits}`, `telefone_3.eq.${digits}`]
          if (digits !== phoneDigits) prodSearch.push(`telefone_1.eq.${phoneDigits}`, `telefone_2.eq.${phoneDigits}`, `telefone_3.eq.${phoneDigits}`)
          query.or(prodSearch.join(','))
        } else {
          query.eq('cpf', finalCpf)
        }
        
        const { data } = await withRetry(async () => await query.limit(1).maybeSingle())
        if (data?.cpf) {
          foundCpf = data.cpf as string
          foundType = type as 'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem'
          break
        }
      }

      if (foundCpf) {
        await loadProfilesForCpf(foundCpf, foundType)
        return
      }

      setError("Cliente não encontrado.")
    } catch (err: unknown) {
      console.error("Erro na busca:", err)
      setError("Ocorreu um erro ao buscar os dados.")
    } finally {
      setIsLoading(false)
    }
  }

  const maskCPF = (cpf: string) => {
    if (!cpf) return ""
    if (showSensitiveData) {
      return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    }
    return cpf.replace(/(\d{3})\d{6}(\d{2})/, "$1.***.***-$2")
  }

  const maskPhone = (phone: string) => {
    if (!phone) return "NÃO INFORMADO"
    if (showSensitiveData) {
      // Format as (XX) XXXXX-XXXX
      const cleaned = phone.replace(/\D/g, "")
      if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      }
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    }
    return phone.replace(/\d{4}$/, "****")
  }

  const unmaskPhone = (phone: string) => {
    if (!phone) return ""
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    }
    return cleaned
  }

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return null
    const birth = new Date(birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "R$ 0,00"
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const handlePhoneClick = (phone: string | null | undefined) => {
    if (!phone || phone === '0' || phone === 'NÃO INFORMADO') return;
    
    // Clean phone number (remove non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;
    
    // Add country code if missing (assuming Brazil 55)
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    
    window.open(`https://wa.me/${finalPhone}`, '_blank');
  };

  const getUtilizadaStatus = (bruta: number | null, liquida: number | null) => {
    const b = bruta || 0;
    const l = liquida || 0;
    // Se a líquida for diferente da bruta, quer dizer que foi utilizado
    return Math.abs(l - b) > 0.01 ? "SIM" : "NÃO"
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "NÃO INFORMADO"
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const allRegs = clientType === 'siape' 
    ? registrations.flatMap(reg => {
        const isPension = reg.situacao_funcional === 'BENEFICIARIO PENSAO';
        if (!reg.instituidores || reg.instituidores.length === 0) {
          const rawName = isPension ? "" : (reg.orgao || "");
          return [{ 
            ...reg, 
            currentInstituidor: isPension ? rawName : translateOrgao(rawName), 
            currentInstituidorId: null 
          }];
        }
        return reg.instituidores.map((inst) => ({
          ...reg,
          ...inst,
          id: reg.id,
          instituidor_id: inst.id,
          currentInstituidor: inst.nome ? (isPension ? inst.nome : translateOrgao(inst.nome)) : (isPension ? "" : translateOrgao(reg.orgao || "")),
          currentInstituidorId: inst.id
        }));
      })
    : registrations;

  return (
    <div className="flex-1 flex flex-col">
      <Header title="ACESSAR CLIENTE" />
      
      <div className="p-3 sm:p-4 lg:p-8 space-y-6 max-w-[1400px] mx-auto w-full">
        <Card className="card-shadow">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
              <div className="flex-1">
                <Input 
                  placeholder="Buscar Cliente por CPF ou Telefone" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  icon={<Search className="w-4 h-4" />}
                  className="h-11 text-[12px]"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isLoading}
                className="h-11 px-12 text-[12px] font-bold uppercase tracking-widest w-full md:w-auto"
              >
                {isLoading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
            {error && (
              <p className="mt-2 text-[11px] font-bold text-red-500 uppercase tracking-wider pl-1">
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {showProfile && client && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {profiles.length > 1 && (
              <div className="flex flex-col gap-2.5 bg-[#FAF9F6]/50 border border-slate-200/60 p-4 rounded-xl shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#171717]/40">
                  Convênios Vinculados a este CPF ({profiles.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {profiles.map((p) => {
                    const isActive = clientType === p.type;
                    const convenioDisplayName = 
                      p.type === 'siape' ? 'SIAPE' :
                      p.type === 'governo_sp' ? 'GOVERNO SP' :
                      p.type === 'prefeitura_sp' ? 'PREFEITURA SP' :
                      p.type === 'governo_pi' ? 'GOVERNO PIAUÍ' :
                      p.type === 'governo_ma' ? 'GOVERNO MARANHÃO' :
                      p.type === 'governo_rr' ? 'GOVERNO RORAIMA' :
                      p.type === 'governo_rj' ? 'GOVERNO RIO DE JANEIRO' :
                      p.type === 'prefeitura_santo_andre' ? 'PREFEITURA SANTO ANDRÉ' :
                      p.type === 'prefeitura_contagem' ? 'PREFEITURA CONTAGEM' :
                      p.type === 'governo_mg' ? 'GOVERNO MINAS GERAIS' : 
                      p.type === 'governo_ms' ? 'GOVERNO MATO GROSSO DO SUL' : 
                      p.type === 'prefeitura_natal' ? 'PREFEITURA DE NATAL' :
                      p.type === 'prefeitura_porto_velho' ? 'PREFEITURA DE PORTO VELHO' :
                      p.type === 'governo_ba' ? 'GOVERNO BAHIA' :
                      p.type === 'governo_am' ? 'GOVERNO AMAZONAS' :
                      p.type === 'governo_ce' ? 'GOVERNO CEARÁ' :
                      p.type === 'governo_ro' ? 'GOVERNO RONDÔNIA' : String(p.type).toUpperCase();
                    
                    return (
                      <button
                        key={`profile-tab-${p.type}`}
                        type="button"
                        onClick={() => {
                          setClient(p.client);
                          setClientType(p.type);
                          setRegistrations(p.registrations);
                          setActiveRegIndex(0);
                        }}
                        className={cn(
                          "px-4 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all border cursor-pointer",
                          isActive 
                            ? "bg-[#171717] text-white border-[#171717] shadow-sm font-black scale-102" 
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        {convenioDisplayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {/* Dados Pessoais */}
            <Card className="card-shadow border border-slate-200">
              <CardContent className="p-8 space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                    <h3 className="text-[16px] font-bold text-slate-900">Dados Pessoais</h3>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowSensitiveData(!showSensitiveData)}
                    className="text-slate-500 hover:text-slate-700 transition-colors p-2 hover:bg-slate-100 rounded-full"
                  >
                    {showSensitiveData ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</p>
                    <p className="text-[13px] font-bold text-slate-900 uppercase">{client.nome || "NÃO INFORMADO"}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</p>
                    <p className="text-[13px] font-bold text-slate-900">{maskCPF(client.cpf)}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Nascimento</p>
                    <div className="flex flex-col gap-0.5">
                      <p className="text-[13px] font-bold text-slate-900">{formatDate(client.data_nascimento)}</p>
                      {client.data_nascimento && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{calculateAge(client.data_nascimento)} Anos</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone 1</p>
                    <div className="flex items-center gap-1.5">
                      <p 
                        className={cn(
                          "text-[13px] font-bold text-slate-900",
                          client.telefone_1 && client.telefone_1 !== '0' && client.telefone_1 !== 'NÃO INFORMADO' && "cursor-pointer hover:text-emerald-600 transition-colors"
                        )}
                        onClick={() => handlePhoneClick(client.telefone_1)}
                      >
                        {maskPhone(client.telefone_1)}
                      </p>
                      {client.telefone_1 && client.telefone_1 !== '0' && client.telefone_1 !== 'NÃO INFORMADO' && (
                        <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]/10" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone 2</p>
                    <div className="flex items-center gap-1.5">
                      <p 
                        className={cn(
                          "text-[13px] font-bold text-slate-900",
                          client.telefone_2 && client.telefone_2 !== '0' && client.telefone_2 !== 'NÃO INFORMADO' && "cursor-pointer hover:text-emerald-600 transition-colors"
                        )}
                        onClick={() => handlePhoneClick(client.telefone_2)}
                      >
                        {maskPhone(client.telefone_2)}
                      </p>
                      {client.telefone_2 && client.telefone_2 !== '0' && client.telefone_2 !== 'NÃO INFORMADO' && (
                        <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]/10" />
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone 3</p>
                    <div className="flex items-center gap-1.5">
                      <p 
                        className={cn(
                          "text-[13px] font-bold text-slate-900",
                          client.telefone_3 && client.telefone_3 !== '0' && client.telefone_3 !== 'NÃO INFORMADO' && "cursor-pointer hover:text-emerald-600 transition-colors"
                        )}
                        onClick={() => handlePhoneClick(client.telefone_3)}
                      >
                        {maskPhone(client.telefone_3)}
                      </p>
                      {client.telefone_3 && client.telefone_3 !== '0' && client.telefone_3 !== 'NÃO INFORMADO' && (
                        <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]/10" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Matrículas Section */}
            {clientType === 'siape' && registrations.length > 0 && (() => {
              if (allRegs.length === 0) return null;

              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {allRegs.map((reg, idx) => (
                      <button
                        key={`tab-${reg.id}-${idx}`}
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)]" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        <div className="flex flex-col items-center">
                          <span>Matrícula {reg.numero_matricula}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Active Content */}
                  {allRegs[activeRegIndex] && (
                    <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                      <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                        <div className="space-y-8 sm:space-y-10">
                          <div className="flex items-center gap-3">
                            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                            <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula</h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                              <p className="text-[13px] font-bold text-slate-900">{allRegs[activeRegIndex].numero_matricula}</p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Situação Funcional</p>
                              <p className="text-[13px] font-bold text-slate-900 uppercase">{allRegs[activeRegIndex].situacao_funcional || "NÃO INFORMADO"}</p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salário</p>
                              <p className="text-[13px] font-bold text-slate-900">{formatCurrency(allRegs[activeRegIndex].salario)}</p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {allRegs[activeRegIndex].situacao_funcional === 'BENEFICIARIO PENSAO' ? 'Instituidor' : 'Órgão (Vínculo)'}
                              </p>
                              <p className="text-[13px] font-bold text-slate-900 uppercase">
                                {allRegs[activeRegIndex].currentInstituidor}
                              </p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regime Jurídico</p>
                              <p className="text-[13px] font-bold text-slate-900 uppercase">{allRegs[activeRegIndex].regime_juridico || "NÃO INFORMADO"}</p>
                            </div>
                            <div className="space-y-1.5">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF</p>
                              <p className="text-[13px] font-bold text-slate-900 uppercase">{allRegs[activeRegIndex].uf || "NÃO INFORMADO"}</p>
                            </div>
                          </div>
                        </div>

                        {/* Margens Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {/* Row 1: Principais */}
                          <div className="p-3.5 bg-slate-300/60 border border-slate-400/40 rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]">
                            <div>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Saldo 70%</p>
                              <p className="text-[17px] font-bold text-slate-900 tracking-tight">{formatCurrency(allRegs[activeRegIndex].saldo_70)}</p>
                            </div>
                            <div className="flex items-center gap-1.5 invisible">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                              <span className="text-[8px] font-bold uppercase tracking-widest">STATUS</span>
                            </div>
                          </div>
                          <div className={cn(
                            "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] sm:col-span-1 lg:col-span-2",
                            (Number(allRegs[activeRegIndex].margem_35) || 0) > 0 ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                          )}>
                            <div>
                              <p className={cn(
                                "text-[9px] font-bold uppercase tracking-widest",
                                (Number(allRegs[activeRegIndex].margem_35) || 0) > 0 ? "text-emerald-700/60" : "text-red-700/60"
                              )}>LÍQUIDA FACULTATIVA GLOBAL</p>
                              <p className={cn(
                                "text-[17px] font-bold tracking-tight",
                                (Number(allRegs[activeRegIndex].margem_35) || 0) > 0 ? "text-emerald-700" : "text-red-700"
                              )}>{formatCurrency(allRegs[activeRegIndex].margem_35)}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-1.5 h-1.5 rounded-full", (Number(allRegs[activeRegIndex].margem_35) || 0) > 0 ? "bg-emerald-600" : "bg-red-600")}></div>
                              <span className={cn("text-[8px] font-bold uppercase tracking-widest", (Number(allRegs[activeRegIndex].margem_35) || 0) > 0 ? "text-emerald-600" : "text-red-600")}>
                                {(Number(allRegs[activeRegIndex].margem_35) || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                              </span>
                            </div>
                          </div>

                          {/* Row 2: 5% */}
                          <div className="p-3.5 bg-[#F1F5F9] border border-slate-200 rounded-xl space-y-0.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bruta 5%</p>
                            <p className="text-[17px] font-bold text-slate-900 tracking-tight">{formatCurrency(allRegs[activeRegIndex].bruta_5)}</p>
                          </div>
                          <div className={cn(
                            "p-3.5 border rounded-xl space-y-0.5 transition-colors duration-200",
                            getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                          )}>
                            <p className={cn(
                              "text-[9px] font-bold uppercase tracking-widest",
                              getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "text-red-700/60" : "text-emerald-700/60"
                            )}>Utilizada 5%</p>
                            <p className={cn(
                              "text-[17px] font-bold tracking-tight uppercase",
                              getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "text-red-700" : "text-emerald-700"
                            )}>
                              {getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5)}
                            </p>
                          </div>
                          <div className={cn(
                            "p-3.5 border rounded-xl space-y-0.5",
                            getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                          )}>
                            <p className={cn(
                              "text-[9px] font-bold uppercase tracking-widest",
                              getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "text-red-700/60" : "text-emerald-700/60"
                            )}>Líquida 5%</p>
                            <div className="flex flex-col">
                              <p className={cn(
                                "text-[17px] font-bold tracking-tight",
                                getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "text-red-700" : "text-emerald-700"
                              )}>{formatCurrency(allRegs[activeRegIndex].liquida_5)}</p>
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "bg-red-600" : "bg-emerald-600")}></div>
                                <span className={cn("text-[8px] font-bold uppercase tracking-widest", getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "text-red-600" : "text-emerald-600")}>
                                  {getUtilizadaStatus(allRegs[activeRegIndex].bruta_5, allRegs[activeRegIndex].liquida_5) === "SIM" ? "INDISPONÍVEL" : "DISPONÍVEL"}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="p-3.5 bg-[#F1F5F9] border border-slate-200 rounded-xl space-y-0.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Benefício Bruta 5%</p>
                            <p className="text-[17px] font-bold text-slate-900 tracking-tight">{formatCurrency(allRegs[activeRegIndex].beneficio_bruta_5)}</p>
                          </div>
                          <div className={cn(
                            "p-3.5 border rounded-xl space-y-0.5 transition-colors duration-200",
                            getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                          )}>
                            <p className={cn(
                              "text-[9px] font-bold uppercase tracking-widest",
                              getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "text-red-700/60" : "text-emerald-700/60"
                            )}>Benefício Utilizada 5%</p>
                            <p className={cn(
                              "text-[17px] font-bold tracking-tight uppercase",
                              getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "text-red-700" : "text-emerald-700"
                            )}>
                              {getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5)}
                            </p>
                          </div>
                          <div className={cn(
                            "p-3.5 border rounded-xl space-y-0.5",
                            getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                          )}>
                            <p className={cn(
                              "text-[9px] font-bold uppercase tracking-widest",
                              getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "text-red-700/60" : "text-emerald-700/60"
                            )}>Benefício Líquida 5%</p>
                            <div className="flex flex-col">
                              <p className={cn(
                                "text-[17px] font-bold tracking-tight",
                                getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "text-red-700" : "text-emerald-700"
                              )}>{formatCurrency(allRegs[activeRegIndex].beneficio_liquida_5)}</p>
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-1.5 h-1.5 rounded-full", getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "bg-red-600" : "bg-emerald-600")}></div>
                                <span className={cn("text-[8px] font-bold uppercase tracking-widest", getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "text-red-600" : "text-emerald-600")}>
                                  {getUtilizadaStatus(allRegs[activeRegIndex].beneficio_bruta_5, allRegs[activeRegIndex].beneficio_liquida_5) === "SIM" ? "INDISPONÍVEL" : "DISPONÍVEL"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Contratos Section */}
                        {(() => {
                          const currentReg = allRegs[activeRegIndex];
                          const filteredContracts = currentReg.itens_credito || [];

                          return (
                            <div className="space-y-8">
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Contratos de Empréstimo</h3>
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
                                      <th className="pb-2 pr-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Saldo</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(filteredContracts as Contract[]).filter((c) => getContractTypeInfo(c.tipo).category === "EMPRESTIMO").length > 0 ? (
                                      (filteredContracts as Contract[])
                                        .filter((c) => getContractTypeInfo(c.tipo).category === "EMPRESTIMO")
                                        .map((loan, lIdx) => (
                                          <LoanRow key={lIdx} loan={{
                                            banco: loan.banco,
                                            orgao: loan.orgao,
                                            contrato: loan.numero_do_contrato,
                                            parcela: loan.parcela,
                                            prazo: loan.prazo,
                                            tipo: loan.tipo
                                          }} />
                                        ))
                                    ) : (
                                      <tr>
                                        <td colSpan={7} className="py-8 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
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

                        {/* Cartões Section */}
                        {(() => {
                          const currentReg = allRegs[activeRegIndex];
                          const filteredContracts = (currentReg.itens_credito || []) as Contract[];

                          const consignadoCards = filteredContracts.filter((c) => getContractTypeInfo(c.tipo).category === "CARTAO_CONSIGNADO");
                          const beneficioCards = filteredContracts.filter((c) => getContractTypeInfo(c.tipo).category === "CARTAO_BENEFICIO");

                          return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                              <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                  <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                                  <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Cartão Consignado</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  {consignadoCards.length > 0 ? (
                                    consignadoCards.map((card, cIdx) => {
                                      const info = getContractTypeInfo(card.tipo);
                                      return (
                                        <div key={cIdx} className="p-5 bg-blue-50/30 border border-blue-100 rounded-2xl flex items-center justify-between group hover:border-emerald-200 transition-colors">
                                          <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-50">
                                              <Landmark className="w-5 h-5 text-slate-300" />
                                            </div>
                                            <div>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco</p>
                                              <p className="text-[12px] font-bold text-slate-900 uppercase">{info.bank || card.banco}</p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parcela</p>
                                            <p className="text-[14px] font-black text-slate-900 tracking-tight">
                                              {formatCurrency(card.parcela)}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-8 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                      Nenhum cartão consignado
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                  <div className="w-1 h-5 bg-purple-500 rounded-full"></div>
                                  <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Cartão Benefício</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  {beneficioCards.length > 0 ? (
                                    beneficioCards.map((card, bIdx) => {
                                      const info = getContractTypeInfo(card.tipo);
                                      return (
                                        <div key={bIdx} className="p-5 bg-blue-50/30 border border-blue-100 rounded-2xl flex items-center justify-between group hover:border-purple-200 transition-colors">
                                          <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-50">
                                              <Landmark className="w-5 h-5 text-slate-300" />
                                            </div>
                                            <div>
                                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco</p>
                                              <p className="text-[12px] font-bold text-slate-900 uppercase">{info.bank || card.banco}</p>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Parcela</p>
                                            <p className="text-[14px] font-black text-slate-900 tracking-tight">
                                              {formatCurrency(card.parcela)}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-8 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                      Nenhum cartão benefício
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {renderClientTicketsHistory()}
                        {renderClientProposalsHistory()}

                        {/* Footer Buttons */}
                        <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                          <Button
                            type="button"
                            onClick={() => setIsSimulationModalOpen(true)}
                            className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                          >
                            <Calculator className="w-4 h-4 mr-2" />
                            Simular Proposta
                          </Button>
                          <Button 
                            onClick={() => {
                              // Formatar CPF sem máscara para o chamado
                              const rawCpf = client.cpf || "";
                              const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                              // Determinar Convênio baseado na origem (SIAPE = FEDERAL)
                              const params = new URLSearchParams({
                                nome: client.nome || "NOME NÃO INFORMADO",
                                cpf: formattedCpf,
                                tel1: unmaskPhone(client.telefone_1),
                                tel2: unmaskPhone(client.telefone_2),
                                tel3: unmaskPhone(client.telefone_3),
                                margem: formatCurrency(allRegs[activeRegIndex].margem_35),
                                liquida5: formatCurrency(allRegs[activeRegIndex].liquida_5),
                                beneficio5: formatCurrency(allRegs[activeRegIndex].beneficio_liquida_5),
                                convenio: "FEDERAL",
                                matricula: allRegs[activeRegIndex].numero_matricula || ""
                              });
                              router.push(`/chamados/novo?${params.toString()}`);
                            }}
                            className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Abrir Chamado
                          </Button>
                          {!isUserEstagio && (
                            <Button 
                              onClick={() => {
                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: client.cpf,
                                  nascimento: formatDate(client.data_nascimento),
                                  matricula: allRegs[activeRegIndex].numero_matricula || "",
                                  idLead: allRegs[activeRegIndex].numero_matricula,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  origem: "pesquisa",
                                  convenio: "FEDERAL"
                                });
                                router.push(`/propostas/nova?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                            >
                              <FileEdit className="w-4 h-4 mr-2" />
                              Digitar Proposta
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              );
            })()}

            {clientType === 'governo_sp' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-gov-${reg.id}-${idx}`}
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        ID {reg.identificacao}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const lotacao = reg.governo_sp_lotacoes?.[0] || {};
                    
                    const getMarginLogic = (bruta: number | null, liquida_db: number | null) => {
                      const b = bruta || 0;
                      const l = liquida_db || 0;
                      
                      let status: 'SIM' | 'NÃO' | 'PARCIAL' = 'NÃO';
                      if (l <= 0) {
                        status = 'SIM';
                      } else if (l < b) {
                        status = 'PARCIAL';
                      } else {
                        status = 'NÃO';
                      }
                      
                      return { 
                        status, 
                        liquida_val: l,
                        label: l > 0 ? 'DISPONÍVEL' : 'INDISPONÍVEL'
                      };
                    };

                    const getCardLogic = (bruta: number | null, liquida_db: number | null) => {
                      const b = bruta || 0;
                      const l = liquida_db || 0;
                      const used = Math.abs(l - b) > 0.01;
                      return {
                        status: used ? 'SIM' : 'NÃO' as const,
                        liquida_val: l,
                        label: used ? 'INDISPONÍVEL' : 'DISPONÍVEL'
                      };
                    };

                    const consignacoes = getMarginLogic(lotacao.mb_consignacoes, lotacao.md_consignacoes);
                    const cartao = getCardLogic(lotacao.mb_cartao_credito, lotacao.md_cartao_credito);
                    const beneficio = getCardLogic(lotacao.mb_cartao_beneficio, lotacao.md_cartao_beneficio);

                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Identificação (GOVERNO SP)</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identificação</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.identificacao}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data da Nomeação</p>
                                <p className="text-[13px] font-bold text-slate-900">{formatDate(reg.data_nomeacao)}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.tipo_vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lotação</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.lotacao || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {/* Consignações */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bruta Consignações</p>
                                <p className="text-[17px] font-bold text-slate-900">{formatCurrency(lotacao.mb_consignacoes)}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                consignacoes.status === 'SIM' ? "bg-red-100/50 border-red-200" : 
                                consignacoes.status === 'PARCIAL' ? "bg-slate-100/80 border-slate-200" : 
                                "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", 
                                  consignacoes.status === 'SIM' ? "text-red-700/60" : 
                                  consignacoes.status === 'PARCIAL' ? "text-slate-500" : 
                                  "text-emerald-700/60"
                                )}>Utilizada</p>
                                <p className={cn("text-[17px] font-bold uppercase", 
                                  consignacoes.status === 'SIM' ? "text-red-700" : 
                                  consignacoes.status === 'PARCIAL' ? "text-slate-600" : 
                                  "text-emerald-700"
                                )}>{consignacoes.status}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                consignacoes.liquida_val > 0 ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", consignacoes.liquida_val > 0 ? "text-emerald-700/60" : "text-red-700/60")}>Líquida</p>
                                <div className="flex flex-col">
                                  <p className={cn("text-[17px] font-bold", consignacoes.liquida_val > 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(consignacoes.liquida_val)}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", consignacoes.liquida_val > 0 ? "bg-emerald-600" : "bg-red-600")}></div>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-widest", consignacoes.liquida_val > 0 ? "text-emerald-600" : "text-red-600")}>
                                      {consignacoes.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Cartão Crédito */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bruta Cartão Crédito</p>
                                <p className="text-[17px] font-bold text-slate-900">{formatCurrency(lotacao.mb_cartao_credito)}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                cartao.status === 'SIM' ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", 
                                  cartao.status === 'SIM' ? "text-red-700/60" : "text-emerald-700/60"
                                )}>Utilizada</p>
                                <p className={cn("text-[17px] font-bold uppercase", 
                                  cartao.status === 'SIM' ? "text-red-700" : "text-emerald-700"
                                )}>{cartao.status}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                cartao.status === 'SIM' ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", cartao.status === 'SIM' ? "text-red-700/60" : "text-emerald-700/60")}>Líquida</p>
                                <div className="flex flex-col">
                                  <p className={cn("text-[17px] font-bold", cartao.status === 'SIM' ? "text-red-700" : "text-emerald-700")}>{formatCurrency(cartao.liquida_val)}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", cartao.status === 'SIM' ? "bg-red-600" : "bg-emerald-600")}></div>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-widest", cartao.status === 'SIM' ? "text-red-600" : "text-emerald-600")}>
                                      {cartao.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Cartão Benefício */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bruta Cartão Benefício</p>
                                <p className="text-[17px] font-bold text-slate-900">{formatCurrency(lotacao.mb_cartao_beneficio)}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                beneficio.status === 'SIM' ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", 
                                  beneficio.status === 'SIM' ? "text-red-700/60" : "text-emerald-700/60"
                                )}>Utilizada</p>
                                <p className={cn("text-[17px] font-bold uppercase", 
                                  beneficio.status === 'SIM' ? "text-red-700" : "text-emerald-700"
                                )}>{beneficio.status}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                beneficio.status === 'SIM' ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", beneficio.status === 'SIM' ? "text-red-700/60" : "text-emerald-700/60")}>Líquida</p>
                                <div className="flex flex-col">
                                  <p className={cn("text-[17px] font-bold", beneficio.status === 'SIM' ? "text-red-700" : "text-emerald-700")}>{formatCurrency(beneficio.liquida_val)}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", beneficio.status === 'SIM' ? "bg-red-600" : "bg-emerald-600")}></div>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-widest", beneficio.status === 'SIM' ? "text-red-600" : "text-emerald-600")}>
                                      {beneficio.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for Governo SP */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: formatCurrency(consignacoes.liquida_val),
                                  liquida5: formatCurrency(cartao.liquida_val),
                                  beneficio5: formatCurrency(beneficio.liquida_val),
                                  convenio: "GOVERNO SP",
                                  matricula: reg.identificacao || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.identificacao || "",
                                    idLead: reg.identificacao,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO SP"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_ma' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-ma-${reg.id}-${idx}`}
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const lotacao = reg.governo_ma_lotacoes?.[0] || {};
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-orange-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (GOVERNO MARANHÃO)</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Margem Empréstimo Consignado */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_emprestimo_consignado || 0) > 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_emprestimo_consignado || 0) > 0 ? "text-blue-600" : "text-red-600 truncate")}>
                                MARGEM EMPRÉSTIMO CONSIGNADO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_emprestimo_consignado || 0) > 0 ? "text-blue-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_emprestimo_consignado)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_emprestimo_consignado || 0) > 0 ? "bg-blue-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_emprestimo_consignado || 0) > 0 ? "text-blue-600" : "text-red-600")}>
                                    {(lotacao.margem_emprestimo_consignado || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão Consignado */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_cartao_consignado || 0) > 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO CONSIGNADO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_cartao_consignado)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_cartao_consignado || 0) > 0 ? "bg-emerald-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-600" : "text-red-600")}>
                                    {(lotacao.margem_cartao_consignado || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão Benefício */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_cartao_beneficio || 0) > 0 ? "bg-purple-50 border-purple-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO BENEFÍCIO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_cartao_beneficio)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_cartao_beneficio || 0) > 0 ? "bg-purple-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-600" : "text-red-600")}>
                                    {(lotacao.margem_cartao_beneficio || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for Governo MA */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: formatCurrency(lotacao.margem_emprestimo_consignado),
                                  liquida5: formatCurrency(lotacao.margem_cartao_consignado),
                                  beneficio5: formatCurrency(lotacao.margem_cartao_beneficio),
                                  convenio: "GOVERNO MARANHÃO",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO MARANHÃO"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_pi' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-pi-${reg.id}-${idx}`}
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const lotacao = reg.governo_pi_lotacoes?.[0] || {};
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (GOVERNO PIAUÍ)</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Margem Disponível Empréstimo */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_disponivel_emprestimo || 0) > 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_disponivel_emprestimo || 0) > 0 ? "text-blue-600" : "text-red-600 truncate")}>
                                MARGEM DISPONÍVEL EMPRÉSTIMO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_disponivel_emprestimo || 0) > 0 ? "text-blue-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_disponivel_emprestimo)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_disponivel_emprestimo || 0) > 0 ? "bg-blue-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_disponivel_emprestimo || 0) > 0 ? "text-blue-600" : "text-red-600")}>
                                    {(lotacao.margem_disponivel_emprestimo || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão Consignado */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_cartao_consignado || 0) > 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO CONSIGNADO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_cartao_consignado)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_cartao_consignado || 0) > 0 ? "bg-emerald-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-600" : "text-red-600")}>
                                    {(lotacao.margem_cartao_consignado || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão Benefício */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_cartao_beneficio || 0) > 0 ? "bg-purple-50 border-purple-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO BENEFÍCIO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_cartao_beneficio)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_cartao_beneficio || 0) > 0 ? "bg-purple-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-600" : "text-red-600")}>
                                    {(lotacao.margem_cartao_beneficio || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for Governo PI */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: formatCurrency(lotacao.margem_disponivel_emprestimo),
                                  liquida5: formatCurrency(lotacao.margem_cartao_consignado),
                                  beneficio5: formatCurrency(lotacao.margem_cartao_beneficio),
                                  convenio: "GOVERNO PIAUÍ",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO PIAUÍ"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'prefeitura_sp' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-pmsp-${reg.id}-${idx}`}
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        ID {reg.identificacao}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const lotacao = reg.prefeitura_sp_lotacoes?.[0] || {};
                    
                    const getMarginLogic = (bruta: number | null, liquida_db: number | null) => {
                      const b = bruta || 0;
                      const l = liquida_db || 0;
                      
                      let status: 'SIM' | 'NÃO' | 'PARCIAL' = 'NÃO';
                      if (l <= 0) {
                        status = 'SIM';
                      } else if (l < b) {
                        status = 'PARCIAL';
                      } else {
                        status = 'NÃO';
                      }
                      
                      return { 
                        status, 
                        liquida_val: l,
                        label: l > 0 ? 'DISPONÍVEL' : 'INDISPONÍVEL'
                      };
                    };

                    const getCardLogic = (bruta: number | null, liquida_db: number | null) => {
                      const b = bruta || 0;
                      const l = liquida_db || 0;
                      const used = Math.abs(l - b) > 0.01;
                      return {
                        status: used ? 'SIM' : 'NÃO' as const,
                        liquida_val: l,
                        label: used ? 'INDISPONÍVEL' : 'DISPONÍVEL'
                      };
                    };

                    const consignacoes = getMarginLogic(lotacao.mb_consignacoes, lotacao.md_consignacoes);
                    const beneficio = getCardLogic(lotacao.mb_cartao_beneficio, lotacao.md_cartao_beneficio);

                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Identificação (PMSP)</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identificação</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.identificacao}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data da Nomeação</p>
                                <p className="text-[13px] font-bold text-slate-900">{formatDate(reg.data_nomeacao)}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.tipo_vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lotação</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.lotacao || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-6">
                            {/* Consignações */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bruta Consignações</p>
                                <p className="text-[17px] font-bold text-slate-900">{formatCurrency(lotacao.mb_consignacoes)}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                consignacoes.status === 'SIM' ? "bg-red-100/50 border-red-200" : 
                                consignacoes.status === 'PARCIAL' ? "bg-slate-100/80 border-slate-200" : 
                                "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", 
                                  consignacoes.status === 'SIM' ? "text-red-700/60" : 
                                  consignacoes.status === 'PARCIAL' ? "text-slate-500" : 
                                  "text-emerald-700/60"
                                )}>Utilizada</p>
                                <p className={cn("text-[17px] font-bold uppercase", 
                                  consignacoes.status === 'SIM' ? "text-red-700" : 
                                  consignacoes.status === 'PARCIAL' ? "text-slate-600" : 
                                  "text-emerald-700"
                                )}>{consignacoes.status}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                consignacoes.liquida_val > 0 ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", consignacoes.liquida_val > 0 ? "text-emerald-700/60" : "text-red-700/60")}>Líquida</p>
                                <div className="flex flex-col">
                                  <p className={cn("text-[17px] font-bold", consignacoes.liquida_val > 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(consignacoes.liquida_val)}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", consignacoes.liquida_val > 0 ? "bg-emerald-600" : "bg-red-600")}></div>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-widest", consignacoes.liquida_val > 0 ? "text-emerald-600" : "text-red-600")}>
                                      {consignacoes.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Cartão Benefício */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bruta Cartão Benefício</p>
                                <p className="text-[17px] font-bold text-slate-900">{formatCurrency(lotacao.mb_cartao_beneficio)}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                beneficio.status === 'SIM' ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", 
                                  beneficio.status === 'SIM' ? "text-red-700/60" : "text-emerald-700/60"
                                )}>Utilizada</p>
                                <p className={cn("text-[17px] font-bold uppercase", 
                                  beneficio.status === 'SIM' ? "text-red-700" : "text-emerald-700"
                                )}>{beneficio.status}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                beneficio.status === 'SIM' ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn("text-[9px] font-bold uppercase tracking-widest", beneficio.status === 'SIM' ? "text-red-700/60" : "text-emerald-700/60")}>Líquida</p>
                                <div className="flex flex-col">
                                  <p className={cn("text-[17px] font-bold", beneficio.status === 'SIM' ? "text-red-700" : "text-emerald-700")}>{formatCurrency(beneficio.liquida_val)}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", beneficio.status === 'SIM' ? "bg-red-600" : "bg-emerald-600")}></div>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-widest", beneficio.status === 'SIM' ? "text-red-600" : "text-emerald-600")}>
                                      {beneficio.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for PMSP */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: formatCurrency(consignacoes.liquida_val),
                                  liquida5: "R$ 0,00", // PMSP doesn't have 5% CC
                                  beneficio5: formatCurrency(beneficio.liquida_val),
                                  convenio: "PREFEITURA SP",
                                  matricula: registrations[activeRegIndex].identificacao || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.identificacao || "",
                                    idLead: reg.identificacao,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "PREFEITURA SP"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}
            {clientType === 'governo_rr' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-rr-${reg.id}-${idx}`}
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const lotacao = reg.governo_rr_instituidores?.[0] || {};
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-cyan-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (GOVERNO RORAIMA)</h3>
                            </div>
                            {/* ... labels update inside ... */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regime Contratação</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.regime_contratacao || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Instituidor (Origem)</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.origem || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Margem Empréstimo */}
                            <div className={cn(
                              "p-4 border rounded-2xl space-y-3 transition-all",
                              (Number(lotacao.margem_emprestimo) || 0) > 0 ? "bg-cyan-50 border-cyan-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (Number(lotacao.margem_emprestimo) || 0) > 0 ? "text-cyan-600" : "text-red-600 truncate")}>
                                MARGEM EMPRÉSTIMO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-xl font-black tracking-tighter leading-none mb-1", (Number(lotacao.margem_emprestimo) || 0) > 0 ? "text-cyan-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(Number(lotacao.margem_emprestimo))}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (Number(lotacao.margem_emprestimo) || 0) > 0 ? "bg-cyan-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (Number(lotacao.margem_emprestimo) || 0) > 0 ? "text-cyan-600" : "text-red-600")}>
                                    {(Number(lotacao.margem_emprestimo) || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão */}
                            <div className={cn(
                              "p-4 border rounded-2xl space-y-3 transition-all",
                              (Number(lotacao.margem_cartao) || 0) > 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (Number(lotacao.margem_cartao) || 0) > 0 ? "text-emerald-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-xl font-black tracking-tighter leading-none mb-1", (Number(lotacao.margem_cartao) || 0) > 0 ? "text-emerald-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(Number(lotacao.margem_cartao))}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (Number(lotacao.margem_cartao) || 0) > 0 ? "bg-emerald-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (Number(lotacao.margem_cartao) || 0) > 0 ? "text-emerald-600" : "text-red-600")}>
                                    {(Number(lotacao.margem_cartao) || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão Benefício */}
                            <div className={cn(
                              "p-4 border rounded-2xl space-y-3 transition-all",
                              (Number(lotacao.margem_cartao_beneficio) || 0) > 0 ? "bg-purple-50 border-purple-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (Number(lotacao.margem_cartao_beneficio) || 0) > 0 ? "text-purple-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO BENEFÍCIO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-xl font-black tracking-tighter leading-none mb-1", (Number(lotacao.margem_cartao_beneficio) || 0) > 0 ? "text-purple-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(Number(lotacao.margem_cartao_beneficio))}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (Number(lotacao.margem_cartao_beneficio) || 0) > 0 ? "bg-purple-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (Number(lotacao.margem_cartao_beneficio) || 0) > 0 ? "text-purple-600" : "text-red-600")}>
                                    {(Number(lotacao.margem_cartao_beneficio) || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for GOV RR */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: formatCurrency(lotacao.margem_emprestimo),
                                  liquida5: formatCurrency(lotacao.margem_cartao),
                                  beneficio5: formatCurrency(lotacao.margem_cartao_beneficio),
                                  convenio: "GOVERNO RORAIMA",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO RORAIMA"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_rj' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-rj-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-pink-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (GOVERNO RIO DE JANEIRO)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for GOV RJ */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: "R$ 0,00",
                                  liquida5: "R$ 0,00",
                                  beneficio5: "R$ 0,00",
                                  convenio: "GOVERNO RIO DE JANEIRO",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO RIO DE JANEIRO"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_ms' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-ms-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-teal-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (GOVERNO DO MATO GROSSO DO SUL)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for GOV MS */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: "R$ 0,00",
                                  liquida5: "R$ 0,00",
                                  beneficio5: "R$ 0,00",
                                  convenio: "GOVERNO MATO GROSSO DO SUL",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO MATO GROSSO DO SUL"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'prefeitura_natal' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-natal-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const lotacao = reg.prefeitura_natal_lotacoes?.[0] || {};
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-sky-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (PREFEITURA DE NATAL)</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Margem Empréstimo Consignado */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_emprestimo_consignado || 0) > 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_emprestimo_consignado || 0) > 0 ? "text-blue-600" : "text-red-600 truncate")}>
                                MARGEM EMPRÉSTIMO CONSIGNADO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_emprestimo_consignado || 0) > 0 ? "text-blue-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_emprestimo_consignado)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_emprestimo_consignado || 0) > 0 ? "bg-blue-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_emprestimo_consignado || 0) > 0 ? "text-blue-600" : "text-red-600")}>
                                    {(lotacao.margem_emprestimo_consignado || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão Consignado */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_cartao_consignado || 0) > 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO CONSIGNADO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_cartao_consignado)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_cartao_consignado || 0) > 0 ? "bg-emerald-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-600" : "text-red-600")}>
                                    {(lotacao.margem_cartao_consignado || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão Benefício */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_cartao_beneficio || 0) > 0 ? "bg-purple-50 border-purple-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO BENEFÍCIO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_cartao_beneficio)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_cartao_beneficio || 0) > 0 ? "bg-purple-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_beneficio || 0) > 0 ? "text-purple-600" : "text-red-600")}>
                                    {(lotacao.margem_cartao_beneficio || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for PREFEITURA DE NATAL */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: formatCurrency(lotacao.margem_emprestimo_consignado),
                                  liquida5: formatCurrency(lotacao.margem_cartao_consignado),
                                  beneficio5: formatCurrency(lotacao.margem_cartao_beneficio),
                                  convenio: "PREFEITURA DE NATAL",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "PREFEITURA DE NATAL"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'prefeitura_porto_velho' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-porto-velho-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const lotacao = reg.prefeitura_porto_velho_lotacoes?.[0] || {};
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (PREFEITURA DE PORTO VELHO)</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{lotacao.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Margem Empréstimo */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_emprestimo || 0) > 0 ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_emprestimo || 0) > 0 ? "text-blue-600" : "text-red-600 truncate")}>
                                MARGEM EMPRÉSTIMO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_emprestimo || 0) > 0 ? "text-blue-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_emprestimo)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_emprestimo || 0) > 0 ? "bg-blue-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_emprestimo || 0) > 0 ? "text-blue-600" : "text-red-600")}>
                                    {(lotacao.margem_emprestimo || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Margem Cartão Consignado */}
                            <div className={cn(
                              "p-5 border rounded-2xl space-y-3",
                              (lotacao.margem_cartao_consignado || 0) > 0 ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                            )}>
                              <p className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-600" : "text-red-600 truncate")}>
                                MARGEM CARTÃO CONSIGNADO
                              </p>
                              <div className="flex flex-col">
                                <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-700" : "text-red-700 font-bold")}>
                                  {formatCurrency(lotacao.margem_cartao_consignado)}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className={cn("w-2 h-2 rounded-full", (lotacao.margem_cartao_consignado || 0) > 0 ? "bg-emerald-500" : "bg-red-500")}></div>
                                  <span className={cn("text-[10px] font-bold uppercase tracking-widest", (lotacao.margem_cartao_consignado || 0) > 0 ? "text-emerald-600" : "text-red-600")}>
                                    {(lotacao.margem_cartao_consignado || 0) > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for PREFEITURA DE PORTO VELHO */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: formatCurrency(lotacao.margem_emprestimo),
                                  liquida5: formatCurrency(lotacao.margem_cartao_consignado),
                                  convenio: "PREFEITURA DE PORTO VELHO",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "PREFEITURA DE PORTO VELHO"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'prefeitura_santo_andre' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-sa-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-violet-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (PREFEITURA DE SANTO ANDRÉ)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.vinculo || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          {/* Margens Card */}
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-violet-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Margens de Cartão</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              {/* Margem Bruta Cartão */}
                              <div className="p-3.5 bg-[#F1F5F9] border border-slate-200 rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]">
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    Margem Bruta Cartão
                                  </p>
                                  <p className="text-[17px] font-bold text-slate-900 tracking-tight">
                                    {typeof reg.margem_bruta_cartao === 'number' 
                                      ? reg.margem_bruta_cartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                      : Number(reg.margem_bruta_cartao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 invisible">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                  <span className="text-[8px] font-bold uppercase tracking-widest">STATUS</span>
                                </div>
                              </div>

                              {/* Margem Líquida Cartão */}
                              {(() => {
                                const isPositive = (Number(reg.margem_liquida_cartao) || 0) > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Margem Líquida Cartão
                                      </p>
                                      <p className={cn(
                                        "text-[17px] font-bold tracking-tight",
                                        isPositive ? "text-emerald-700" : "text-red-700"
                                      )}>
                                        {typeof reg.margem_liquida_cartao === 'number' 
                                          ? reg.margem_liquida_cartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                          : Number(reg.margem_liquida_cartao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-600" : "bg-red-600")}></div>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for PREF SA */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                const mBruta = typeof reg.margem_bruta_cartao === 'number' 
                                  ? reg.margem_bruta_cartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                  : Number(reg.margem_bruta_cartao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                                const mLiquida = typeof reg.margem_liquida_cartao === 'number' 
                                  ? reg.margem_liquida_cartao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                  : Number(reg.margem_liquida_cartao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: "R$ 0,00",
                                  liquida5: mLiquida,
                                  beneficio5: "R$ 0,00",
                                  convenio: "PREFEITURA SANTO ANDRÉ",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "PREFEITURA SANTO ANDRÉ"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'prefeitura_contagem' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-contagem-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-rose-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (PREFEITURA DE CONTAGEM)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Admissão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">
                                  {reg.data_de_admissao ? formatDate(reg.data_de_admissao) : "NÃO INFORMADA"}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Situação do Funcionário</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.situacao_funcional || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          {/* Margens Card */}
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-rose-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Margens de Empréstimo & Cartão</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              {/* Margem Empréstimo Bruta */}
                              <div className="p-3.5 bg-[#F1F5F9] border border-slate-200 rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]">
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    Margem Empréstimo Bruta
                                  </p>
                                  <p className="text-[17px] font-bold text-slate-900 tracking-tight">
                                    {typeof reg.margem_emprestimo_bruta === 'number' 
                                      ? reg.margem_emprestimo_bruta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                      : Number(reg.margem_emprestimo_bruta || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 invisible">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                  <span className="text-[8px] font-bold uppercase tracking-widest">STATUS</span>
                                </div>
                              </div>

                              {/* Margem Empréstimo Líquida */}
                              {(() => {
                                const isPositive = (Number(reg.margem_emprestimo_liquida) || 0) > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Margem Empréstimo Líquida
                                      </p>
                                      <p className={cn(
                                        "text-[17px] font-bold tracking-tight",
                                        isPositive ? "text-emerald-700" : "text-red-700"
                                      )}>
                                        {typeof reg.margem_emprestimo_liquida === 'number' 
                                          ? reg.margem_emprestimo_liquida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                          : Number(reg.margem_emprestimo_liquida || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-600" : "bg-red-600")}></div>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Margem Cartão Bruta */}
                              <div className="p-3.5 bg-[#F1F5F9] border border-slate-200 rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]">
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    Margem Cartão Bruta
                                  </p>
                                  <p className="text-[17px] font-bold text-slate-900 tracking-tight">
                                    {typeof reg.margem_cartao_bruta === 'number' 
                                      ? reg.margem_cartao_bruta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                      : Number(reg.margem_cartao_bruta || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1.5 invisible">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                  <span className="text-[8px] font-bold uppercase tracking-widest">STATUS</span>
                                </div>
                              </div>

                              {/* Margem Cartão Líquida */}
                              {(() => {
                                const isPositive = (Number(reg.margem_cartao_liquida) || 0) > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Margem Cartão Líquida
                                      </p>
                                      <p className={cn(
                                        "text-[17px] font-bold tracking-tight",
                                        isPositive ? "text-emerald-700" : "text-red-700"
                                      )}>
                                        {typeof reg.margem_cartao_liquida === 'number' 
                                          ? reg.margem_cartao_liquida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                          : Number(reg.margem_cartao_liquida || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-600" : "bg-red-600")}></div>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for PREF CONTAGEM */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                const mLiquida = typeof reg.margem_emprestimo_liquida === 'number' 
                                  ? reg.margem_emprestimo_liquida.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                  : Number(reg.margem_emprestimo_liquida || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: mLiquida,
                                  liquida5: "R$ 0,00",
                                  beneficio5: "R$ 0,00",
                                  convenio: "PREFEITURA CONTAGEM",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "PREFEITURA CONTAGEM"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_mg' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-mg-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (GOVERNO DE MINAS GERAIS)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "NÃO INFORMADO"}</p>
                              </div>
                            </div>
                          </div>

                          {/* Margens Card */}
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-amber-500 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Margens Disponíveis</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                              {/* Saldo 70% */}
                              {(() => {
                                const val = Number(reg.margem_70) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Saldo 70%
                                      </p>
                                      <p className={cn(
                                        "text-[17px] font-bold tracking-tight",
                                        isPositive ? "text-emerald-700" : "text-red-700"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-600" : "bg-red-600")}></div>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Margem Empréstimo */}
                              {(() => {
                                const val = Number(reg.margem_emprestimo) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Margem Empréstimo
                                      </p>
                                      <p className={cn(
                                        "text-[17px] font-bold tracking-tight",
                                        isPositive ? "text-emerald-700" : "text-red-700"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-600" : "bg-red-600")}></div>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Cartão Crédito */}
                              {(() => {
                                const val = Number(reg.cartao_credito) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Cartão Crédito
                                      </p>
                                      <p className={cn(
                                        "text-[17px] font-bold tracking-tight",
                                        isPositive ? "text-emerald-700" : "text-red-700"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-600" : "bg-red-600")}></div>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Cartão Benefício */}
                              {(() => {
                                const val = Number(reg.cartao_beneficio || (reg as any).margem_beneficio) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Cartão Benefício
                                      </p>
                                      <p className={cn(
                                        "text-[17px] font-bold tracking-tight",
                                        isPositive ? "text-emerald-700" : "text-red-700"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-600" : "bg-red-600")}></div>
                                      <span className={cn(
                                        "text-[8px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for GOV MG */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                const mLiquida = typeof reg.margem_emprestimo === 'number' 
                                  ? reg.margem_emprestimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                                  : Number(reg.margem_emprestimo || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: mLiquida,
                                  liquida5: "R$ 0,00",
                                  beneficio5: "R$ 0,00",
                                  convenio: "GOVERNO MINAS GERAIS",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO MINAS GERAIS"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_ba' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-ba-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const regObj = reg as unknown as Record<string, unknown>;
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-teal-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (GOVERNO DA BAHIA)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secretaria</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{(regObj.secretaria as string) || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Situação / Tipo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{((regObj.situacao as string) || "N/I") + " / " + ((regObj.tipo_servidor as string) || "N/I")}</p>
                              </div>
                            </div>
                          </div>

                          {/* Margens Card */}
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-teal-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Margens de Empréstimo</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                              {/* Margem Empréstimo Total */}
                              {(() => {
                                const val = Number(regObj.margem_emprestimo_total) || 0;
                                return (
                                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200">
                                    <div>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        Margem Empréstimo Total
                                      </p>
                                      <p className="text-lg font-black text-slate-900 tracking-tight leading-none mt-1">
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Margem Empréstimo Disponível */}
                              {(() => {
                                const val = Number(regObj.margem_emprestimo_disponivel) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Margem Empréstimo Disponível
                                      </p>
                                      <p className={cn(
                                        "text-lg font-black tracking-tight leading-none mt-1",
                                        isPositive ? "text-emerald-950" : "text-red-950"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-500" : "bg-red-500")}></div>
                                      <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for GOV BA */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                const mLiquida = formatCurrency(regObj.margem_emprestimo_disponivel);

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: mLiquida,
                                  liquida5: "R$ 0,00",
                                  beneficio5: "R$ 0,00",
                                  convenio: "GOVERNO BAHIA",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO BAHIA"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_am' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-am-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const regObj = reg as unknown as Record<string, unknown>;
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula (GOVERNO DO AMAZONAS)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900">{reg.matricula}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "GOVERNO DO AMAZONAS"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secretaria / Cargo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{((regObj.secretaria as string) || "N/I") + " / " + ((regObj.cargo as string) || "N/I")}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Situação / Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{((regObj.situacao as string) || "N/I") + " / " + ((regObj.tipo_servidor as string) || "N/I")}</p>
                              </div>
                            </div>
                          </div>

                          {/* Margens Card */}
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Margens Disponíveis</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                              {/* Margem Consignável */}
                              {(() => {
                                const val = Number(regObj.margem_consignavel) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-red-700/60"
                                      )}>
                                        Margem Consignável
                                      </p>
                                      <p className={cn(
                                        "text-lg font-black tracking-tight leading-none mt-1",
                                        isPositive ? "text-emerald-950" : "text-red-950"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-500" : "bg-red-500")}></div>
                                      <span className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-600" : "text-red-600"
                                      )}>
                                        {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Margem Cartão */}
                              {(() => {
                                const val = Number(regObj.margem_cartao) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-200"
                                  )}>
                                    <div>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        Margem Cartão (RMC)
                                      </p>
                                      <p className="text-lg font-black text-slate-900 tracking-tight leading-none mt-1">
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Margem Cartão Benefício */}
                              {(() => {
                                const val = Number(regObj.margem_cartao_beneficio) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-200"
                                  )}>
                                    <div>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        Margem Cartão Benefício (RCC)
                                      </p>
                                      <p className="text-lg font-black text-slate-900 tracking-tight leading-none mt-1">
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Margem Cartão Benefício Saque */}
                              {(() => {
                                const val = Number(regObj.margem_cartao_beneficio_saque) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-200"
                                  )}>
                                    <div>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                        Margem Benefício Saque
                                      </p>
                                      <p className="text-lg font-black text-slate-900 tracking-tight leading-none mt-1">
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for GOV AM */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
                                const mLiquida = formatCurrency(regObj.margem_consignavel);

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  margem: mLiquida,
                                  liquida5: formatCurrency(regObj.margem_cartao),
                                  beneficio5: formatCurrency(regObj.margem_cartao_beneficio),
                                  convenio: "GOVERNO AMAZONAS",
                                  matricula: reg.matricula || ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    matricula: reg.matricula || "",
                                    idLead: reg.matricula,
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO AMAZONAS"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_ce' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-ce-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        VÍNCULO {idx + 1}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const regObj = reg as unknown as Record<string, unknown>;
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações do Vínculo (GOVERNO DO CEARÁ)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "GOVERNO DO CEARÁ"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secretaria</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{((regObj.secretaria as string) || "N/I")}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{((regObj.vinculo as string) || "N/I")}</p>
                              </div>
                            </div>
                          </div>

                          {/* Salário Card */}
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Dados Financeiros</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                              {(() => {
                                const val = Number(regObj.salario) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-slate-400"
                                      )}>
                                        Salário Base
                                      </p>
                                      <p className={cn(
                                        "text-lg font-black tracking-tight leading-none mt-1",
                                        isPositive ? "text-emerald-950" : "text-slate-900"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for GOV CE */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  convenio: "GOVERNO CEARÁ",
                                  matricula: ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO CEARÁ"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}

            {clientType === 'governo_ro' && registrations.length > 0 && (() => {
              return (
                <div className="space-y-0">
                  {/* Tabs Navigation */}
                  <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                    {registrations.map((reg, idx) => (
                      <button
                        key={`tab-ro-${reg.id}-${idx}`}
                        type="button"
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px]",
                          activeRegIndex === idx 
                            ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                            : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                        )}
                      >
                        MATRÍCULA {reg.matricula && reg.matricula !== '---' ? reg.matricula : idx + 1}
                      </button>
                    ))}
                  </div>

                  {registrations[activeRegIndex] && (() => {
                    const reg = registrations[activeRegIndex];
                    const regObj = reg as unknown as Record<string, unknown>;
                    
                    return (
                      <Card className="card-shadow border border-slate-200 rounded-tl-none animate-in fade-in duration-300">
                        <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações Funcionais (GOVERNO DE RONDÔNIA)</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.matricula || "---"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{reg.orgao || "GOVERNO DE RONDÔNIA"}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secretaria</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{((regObj.secretaria as string) || "N/I")}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cargo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{((regObj.cargo as string) || "N/I")}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">{((regObj.vinculo as string) || "N/I")}</p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF</p>
                                <p className="text-[13px] font-bold text-slate-900 uppercase">RO</p>
                              </div>
                            </div>
                          </div>

                          {/* Margens Card */}
                          <div className="space-y-8 sm:space-y-10">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-5 bg-emerald-600 rounded-full"></div>
                              <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Margens</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                              {(() => {
                                const val = Number(regObj.margem_emprestimo) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-slate-400"
                                      )}>
                                        Margem Empréstimo
                                      </p>
                                      <p className={cn(
                                        "text-lg font-black tracking-tight leading-none mt-1",
                                        isPositive ? "text-emerald-950" : "text-slate-900"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {(() => {
                                const val = Number(regObj.margem_cartao) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-slate-400"
                                      )}>
                                        Margem Cartão (RMC)
                                      </p>
                                      <p className={cn(
                                        "text-lg font-black tracking-tight leading-none mt-1",
                                        isPositive ? "text-emerald-950" : "text-slate-900"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}

                              {(() => {
                                const val = Number(regObj.margem_cartao_beneficio) || 0;
                                const isPositive = val > 0;
                                return (
                                  <div className={cn(
                                    "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px] transition-colors duration-200",
                                    isPositive ? "bg-emerald-100/50 border-emerald-200" : "bg-slate-50 border-slate-200"
                                  )}>
                                    <div>
                                      <p className={cn(
                                        "text-[9px] font-bold uppercase tracking-widest",
                                        isPositive ? "text-emerald-700/60" : "text-slate-400"
                                      )}>
                                        Margem Cartão Benefício (RCC)
                                      </p>
                                      <p className={cn(
                                        "text-lg font-black tracking-tight leading-none mt-1",
                                        isPositive ? "text-emerald-950" : "text-slate-900"
                                      )}>
                                        {formatCurrency(val)}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>

                          {renderClientTicketsHistory()}
                          {renderClientProposalsHistory()}

                          {/* Footer Buttons for GOV RO */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                            <Button
                              type="button"
                              onClick={() => setIsSimulationModalOpen(true)}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#162546] hover:bg-[#162546]/90 text-white shadow-xl shadow-slate-200 transition-all rounded-lg flex items-center justify-center gap-2"
                            >
                              <Calculator className="w-4 h-4 mr-2" />
                              Simular Proposta
                            </Button>
                            <Button 
                              onClick={() => {
                                const rawCpf = client.cpf || "";
                                const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: formattedCpf,
                                  tel1: unmaskPhone(client.telefone_1),
                                  tel2: unmaskPhone(client.telefone_2),
                                  tel3: unmaskPhone(client.telefone_3),
                                  convenio: "GOVERNO RONDÔNIA",
                                  matricula: reg.matricula && reg.matricula !== '---' ? reg.matricula : ""
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            {!isUserEstagio && (
                              <Button 
                                onClick={() => {
                                  const params = new URLSearchParams({
                                    nome: client.nome || "NOME NÃO INFORMADO",
                                    cpf: client.cpf,
                                    nascimento: formatDate(client.data_nascimento),
                                    tel1: unmaskPhone(client.telefone_1),
                                    tel2: unmaskPhone(client.telefone_2),
                                    tel3: unmaskPhone(client.telefone_3),
                                    origem: "pesquisa",
                                    convenio: "GOVERNO RONDÔNIA"
                                  });
                                  router.push(`/propostas/nova?${params.toString()}`);
                                }}
                                className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-transparent border-2 border-[#171717] text-[#171717] hover:bg-[#171717]/5 transition-all rounded-lg"
                              >
                                <FileEdit className="w-4 h-4 mr-2" />
                                Digitar Proposta
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              );
            })()}
          </div>
        )}
        <SimulationModal 
          isOpen={isSimulationModalOpen} 
          onClose={() => setIsSimulationModalOpen(false)} 
          client={client} 
          registrations={allRegs} 
          perfil={perfil} 
          activeRegIndex={activeRegIndex}
          onProposalSaved={fetchClientProposals}
        />
      </div>
    </div>
  )
}
