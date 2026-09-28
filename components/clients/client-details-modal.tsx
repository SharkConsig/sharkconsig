"use client"
import React, { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  MessageCircle, 
  User, 
  FileText, 
  TrendingUp, 
  Landmark, 
  CreditCard, 
  Calendar, 
  Copy, 
  Check, 
  Building,
  X 
} from "lucide-react"
import { cn, withRetry } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
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

interface Lotacao {
  lotacao?: string;
  orgao?: string;
  mb_consignacoes?: number;
  md_consignacoes?: number;
  mb_cartao_credito?: number;
  md_cartao_credito?: number;
  mb_cartao_beneficio?: number;
  md_cartao_beneficio?: number;
  margem_emprestimo_consignado?: number;
  margem_disponivel_emprestimo?: number;
  margem_cartao_consignado?: number;
  margem_cartao_beneficio?: number;
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
  governo_sp_lotacoes?: Lotacao[];
  prefeitura_sp_lotacoes?: Lotacao[];
  governo_pi_lotacoes?: Lotacao[];
  governo_ma_lotacoes?: Lotacao[];
  governo_rr_instituidores?: Record<string, unknown>[];
  prefeitura_natal_lotacoes?: Lotacao[];
  prefeitura_porto_velho_lotacoes?: Lotacao[];
  matricula?: string;
  regime_contratacao?: string;
  displayId?: string;
  currentInstituidor?: string;
  [key: string]: unknown;
}

interface ClientData {
  id: string;
  nome: string | null;
  cpf: string;
  data_nascimento: string | null;
  idade?: number | null;
  telefone_1: string | null;
  telefone_2: string | null;
  telefone_3: string | null;
  [key: string]: unknown;
}

type ConvenioType = 'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | 'prefeitura_natal' | 'prefeitura_porto_velho' | 'governo_ba' | 'governo_am' | 'governo_ce' | 'governo_ro' | 'prefeitura_ponta_grossa';

interface ConvenioProfile {
  type: ConvenioType;
  client: ClientData;
  registrations: Registration[];
}

function ensureArray<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as T[];
  return [val] as T[];
}

export interface LeadContactInfo {
  cpf: string;
  nome: string;
  telefones: string[];
}

interface ClientDetailsModalProps {
  cpf: string;
  isOpen: boolean;
  onClose: () => void;
  initialMatricula?: string;
  onSelectTabulacao?: (
    tabulacao: "CLIENTE CHAMADO" | "NÃO EXISTE WHATSAPP" | "WHATSAPP DIVERGENTE",
    clientInfo: LeadContactInfo
  ) => Promise<void> | void;
  title?: string;
  showTabulacoes?: boolean;
}

export function ClientDetailsModal({ 
  cpf, 
  isOpen, 
  onClose, 
  initialMatricula, 
  onSelectTabulacao,
  title,
  showTabulacoes
}: ClientDetailsModalProps) {
  const modalTitle = title || (onSelectTabulacao ? "INFORMAÇÕES DO LEAD" : "INFORMAÇÕES DO CLIENTE")
  const hasTabulacoes = showTabulacoes !== undefined ? showTabulacoes : Boolean(onSelectTabulacao)
  const [isLoading, setIsLoading] = useState(false)
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [client, setClient] = useState<ClientData | null>(null)
  const [clientType, setClientType] = useState<ConvenioType | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [profiles, setProfiles] = useState<ConvenioProfile[]>([])
  const [activeRegIndex, setActiveRegIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, boolean>>({})

  const fetchClientData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setClient(null)
    setClientType(null)
    setRegistrations([])
    setProfiles([])
    setActiveRegIndex(0)
    setSelectedStatuses({})

    try {
      const digits = cpf.replace(/\D/g, "")
      const paddedCpf = digits.padStart(11, '0')
      const foundProfiles: ConvenioProfile[] = []
      
      // 1. Try search in SIAPE Clients
      const { data: siapeData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (siapeData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase
            .from('matriculas')
            .select(`
              *,
              instituidores (
                *,
                itens_credito (*)
              )
            `)
            .eq('cliente_cpf', (siapeData as ClientData).cpf)
        )

        if (regError) console.error("Erro ao buscar matrículas SIAPE:", regError)
        foundProfiles.push({
          type: 'siape',
          client: siapeData,
          registrations: (regData as Registration[]) || []
        })
      }

      // 2. Try search in Governo SP Clients
      const { data: govSpData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_sp_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govSpData) {
        const { data: idData, error: idError } = await withRetry<Record<string, unknown>[] | null>(async () =>
          await supabase
            .from('governo_sp_identificacoes')
            .select('*, governo_sp_lotacoes(*)')
            .eq('cliente_id', (govSpData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar identificações Governo SP:", idError)
        
        const mappedRegs = (idData || []).map((r: Record<string, unknown>) => {
          const lotacoes = ensureArray<Lotacao>(r.governo_sp_lotacoes)
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
              id: (l.id as string) || (l.identificacao_id as string) || "---",
              nome: null,
              itens_credito: []
            }))
          }
        })

        foundProfiles.push({
          type: 'governo_sp',
          client: govSpData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 3. Try search in Prefeitura SP Clients
      const { data: pmspData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_sp_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (pmspData) {
        const { data: idData, error: idError } = await withRetry<Record<string, unknown>[] | null>(async () =>
          await supabase
            .from('prefeitura_sp_identificacoes')
            .select('*, prefeitura_sp_lotacoes(*)')
            .eq('cliente_id', (pmspData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar identificações Prefeitura SP:", idError)
        
        const mappedRegs = (idData || []).map((r: Record<string, unknown>) => {
          const lotacoes = ensureArray<Lotacao>(r.prefeitura_sp_lotacoes)
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
              id: (l.id as string) || (l.identificacao_id as string) || "---",
              nome: null,
              itens_credito: []
            }))
          }
        })

        foundProfiles.push({
          type: 'prefeitura_sp',
          client: pmspData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 4. Try search in Governo PI Clients
      const { data: govPiData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_pi_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govPiData) {
        interface BasePiData {
          matricula?: string;
          vinculo?: string;
          orgao?: string;
          margem_disponivel_emprestimo?: number;
          margem_cartao_consignado?: number;
          margem_cartao_beneficio?: number;
          [key: string]: unknown;
        }

        const { data: idData, error: idError } = await withRetry<Record<string, unknown>[] | null>(async () =>
          await supabase
            .from('governo_pi_identificacoes')
            .select(`
              *,
              governo_pi_lotacoes (*)
            `)
            .eq('cliente_id', (govPiData as ClientData).id)
        )

        // Robust fallback: query base_consulta_governo_pi directly by CPF
        const { data: basePiData } = await withRetry<BasePiData | null>(async () =>
          await supabase
            .from('base_consulta_governo_pi')
            .select('*')
            .eq('cpf', paddedCpf)
            .maybeSingle()
        )

        if (idError) console.error("Erro ao buscar identificações Governo PI:", idError)
        
        let mappedIdData: Registration[] = (idData || []) as unknown as Registration[];

        if (basePiData) {
          if (mappedIdData.length === 0) {
            mappedIdData = [{
              id: 'pseudo-pi',
              numero_matricula: basePiData.matricula || '---',
              matricula: basePiData.matricula || '---',
              vinculo: basePiData.vinculo || '---',
              situacao_funcional: null,
              salario: null,
              orgao: basePiData.orgao || '---',
              regime_juridico: null,
              uf: 'PI',
              governo_pi_lotacoes: [{
                orgao: basePiData.orgao || '---',
                lotacao: basePiData.orgao || '---',
                margem_disponivel_emprestimo: basePiData.margem_disponivel_emprestimo,
                margem_cartao_consignado: basePiData.margem_cartao_consignado,
                margem_cartao_beneficio: basePiData.margem_cartao_beneficio,
              }]
            }];
          } else {
            mappedIdData = mappedIdData.map(reg => {
              const currentLotacoes = reg.governo_pi_lotacoes;
              const hasMargins = Array.isArray(currentLotacoes)
                ? currentLotacoes.length > 0 && currentLotacoes[0].margem_disponivel_emprestimo !== undefined
                : currentLotacoes && currentLotacoes.margem_disponivel_emprestimo !== undefined;
              
              if (!hasMargins) {
                return {
                  ...reg,
                  governo_pi_lotacoes: [{
                    orgao: basePiData.orgao || (Array.isArray(currentLotacoes) ? currentLotacoes[0]?.orgao : currentLotacoes?.orgao) || '---',
                    lotacao: basePiData.orgao || (Array.isArray(currentLotacoes) ? currentLotacoes[0]?.lotacao : currentLotacoes?.lotacao) || '---',
                    margem_disponivel_emprestimo: basePiData.margem_disponivel_emprestimo,
                    margem_cartao_consignado: basePiData.margem_cartao_consignado,
                    margem_cartao_beneficio: basePiData.margem_cartao_beneficio
                  }]
                };
              } else {
                const resolvedLot = Array.isArray(currentLotacoes) ? currentLotacoes[0] : currentLotacoes;
                return {
                  ...reg,
                  governo_pi_lotacoes: [{
                    orgao: resolvedLot?.orgao || basePiData.orgao || '---',
                    lotacao: resolvedLot?.lotacao || basePiData.orgao || '---',
                    margem_disponivel_emprestimo: resolvedLot?.margem_disponivel_emprestimo !== undefined ? resolvedLot.margem_disponivel_emprestimo : basePiData.margem_disponivel_emprestimo,
                    margem_cartao_consignado: resolvedLot?.margem_cartao_consignado !== undefined ? resolvedLot.margem_cartao_consignado : basePiData.margem_cartao_consignado,
                    margem_cartao_beneficio: resolvedLot?.margem_cartao_beneficio !== undefined ? resolvedLot.margem_cartao_beneficio : basePiData.margem_cartao_beneficio
                  }]
                };
              }
            });
          }
        } else {
          mappedIdData = mappedIdData.map(reg => {
            const currentLotacoes = reg.governo_pi_lotacoes;
            const resolvedLot = Array.isArray(currentLotacoes) ? currentLotacoes[0] : currentLotacoes;
            if (resolvedLot) {
              return {
                ...reg,
                governo_pi_lotacoes: [resolvedLot]
              };
            }
            return reg;
          });
        }

        foundProfiles.push({
          type: 'governo_pi',
          client: govPiData,
          registrations: mappedIdData
        })
      }

      // 5. Try search in Governo MA Clients
      const { data: govMaData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_ma_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govMaData) {
        const { data: idData, error: idError } = await withRetry<Record<string, unknown>[] | null>(async () =>
          await supabase
            .from('governo_ma_identificacoes')
            .select(`
              *,
              governo_ma_lotacoes (*)
            `)
            .eq('cliente_id', (govMaData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar identificações Governo MA:", idError)
        
        const mappedRegs = (idData || []).map((r: Record<string, unknown>) => {
          const lotacoes = ensureArray<Lotacao>(r.governo_ma_lotacoes)
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
              id: (l.id as string) || "---",
              nome: null,
              itens_credito: []
            }))
          }
        })

        foundProfiles.push({
          type: 'governo_ma',
          client: govMaData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 6. Try search in Governo RR Clients
      const { data: govRrData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_rr_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govRrData) {
        const { data: idData, error: idError } = await withRetry<Record<string, unknown>[] | null>(async () =>
          await supabase
            .from('governo_rr_matriculas')
            .select(`
              *,
              governo_rr_instituidores (*)
            `)
            .eq('cliente_id', (govRrData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar matrículas Governo Roraima:", idError)

        // Query base_consulta_governo_rr for fallback/robust details
        const { data: baseRrData } = await withRetry<Record<string, unknown> | null>(async () =>
          await supabase
            .from('base_consulta_governo_rr')
            .select('*')
            .eq('cpf', paddedCpf)
            .maybeSingle()
        )

        let mappedIdData = (idData || []).map((r: Record<string, unknown>) => {
          const instituidores = ensureArray<Record<string, unknown>>(r.governo_rr_instituidores)
          return {
            ...r,
            id: r.id as string,
            numero_matricula: (r.matricula as string) || '---',
            matricula: (r.matricula as string) || '---',
            regime_contratacao: (r.regime_contratacao as string) || null,
            uf: 'RR',
            governo_rr_instituidores: instituidores,
            instituidores: instituidores.map((l) => ({
              id: (l.id as string) || "---",
              nome: null,
              itens_credito: []
            }))
          }
        })

        if (baseRrData) {
          if (mappedIdData.length === 0) {
            mappedIdData = [{
              id: 'pseudo-rr',
              numero_matricula: baseRrData.matricula || '---',
              matricula: baseRrData.matricula || '---',
              regime_contratacao: baseRrData.regime_contratacao || '---',
              uf: 'RR',
              governo_rr_instituidores: [{
                origem: baseRrData.origem || '---',
                margem_emprestimo: baseRrData.margem_emprestimo,
                margem_cartao: baseRrData.margem_cartao,
                margem_cartao_beneficio: baseRrData.margem_cartao_beneficio
              }],
              instituidores: [{
                id: 'pseudo-inst-rr',
                nome: null,
                itens_credito: []
              }]
            }];
          } else {
            mappedIdData = mappedIdData.map(reg => {
              const currentInsts = reg.governo_rr_instituidores;
              const hasMargins = Array.isArray(currentInsts)
                ? currentInsts.length > 0 && currentInsts[0].margem_emprestimo !== undefined
                : currentInsts && currentInsts.margem_emprestimo !== undefined;

              if (!hasMargins) {
                return {
                  ...reg,
                  governo_rr_instituidores: [{
                    origem: baseRrData.origem || (Array.isArray(currentInsts) ? currentInsts[0]?.origem : currentInsts?.origem) || '---',
                    margem_emprestimo: baseRrData.margem_emprestimo,
                    margem_cartao: baseRrData.margem_cartao,
                    margem_cartao_beneficio: baseRrData.margem_cartao_beneficio
                  }]
                };
              } else {
                const resolvedInst = Array.isArray(currentInsts) ? currentInsts[0] : currentInsts;
                return {
                  ...reg,
                  governo_rr_instituidores: [{
                    origem: resolvedInst?.origem || baseRrData.origem || '---',
                    margem_emprestimo: resolvedInst?.margem_emprestimo !== undefined ? resolvedInst.margem_emprestimo : baseRrData.margem_emprestimo,
                    margem_cartao: resolvedInst?.margem_cartao !== undefined ? resolvedInst.margem_cartao : baseRrData.margem_cartao,
                    margem_cartao_beneficio: resolvedInst?.margem_cartao_beneficio !== undefined ? resolvedInst.margem_cartao_beneficio : baseRrData.margem_cartao_beneficio
                  }]
                };
              }
            });
          }
        }

        foundProfiles.push({
          type: 'governo_rr',
          client: govRrData,
          registrations: mappedIdData as unknown as Registration[]
        })
      }

      // 7. Try search in Governo RJ Clients
      const { data: govRjData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_rj_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govRjData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('governo_rj_matriculas').select('*').eq('cliente_id', (govRjData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Governo RJ:", regError)
        
        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
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
        }))

        foundProfiles.push({
          type: 'governo_rj',
          client: govRjData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 8. Try search in Prefeitura Santo André Clients
      const { data: saData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_santo_andre_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (saData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('prefeitura_santo_andre_matriculas').select('*').eq('cliente_id', (saData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Santo André:", regError)

        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
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
        }))

        foundProfiles.push({
          type: 'prefeitura_santo_andre',
          client: saData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 9. Try search in Prefeitura Contagem Clients
      const { data: contagemData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_contagem_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (contagemData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('prefeitura_contagem_matriculas').select('*').eq('cliente_id', (contagemData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Contagem:", regError)

        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
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
        }))

        foundProfiles.push({
          type: 'prefeitura_contagem',
          client: contagemData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 10. Try search in Governo MG Clients
      const { data: mgData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_mg_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (mgData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('governo_mg_matriculas').select('*').eq('cliente_id', (mgData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Governo MG:", regError)

        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
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
        }))

        foundProfiles.push({
          type: 'governo_mg',
          client: mgData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 11. Try search in Prefeitura Natal Clients
      const { data: natalData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_natal_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (natalData) {
        const { data: idData, error: idError } = await withRetry<Record<string, unknown>[] | null>(async () =>
          await supabase
            .from('prefeitura_natal_identificacoes')
            .select('*, prefeitura_natal_lotacoes(*)')
            .eq('cliente_id', (natalData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar identificações Prefeitura Natal:", idError)
        
        const mappedRegs = (idData || []).map((r: Record<string, unknown>) => {
          const lotacoes = ensureArray<Lotacao>(r.prefeitura_natal_lotacoes)
          return {
            ...r,
            id: r.id as string,
            numero_matricula: (r.matricula as string) || '---',
            matricula: (r.matricula as string) || '---',
            situacao_funcional: (r.vinculo as string) || null,
            salario: 0,
            orgao: (lotacoes[0]?.orgao as string) || (r.orgao as string) || null,
            regime_juridico: null,
            uf: 'RN',
            prefeitura_natal_lotacoes: lotacoes,
            instituidores: lotacoes.map((l) => ({
              id: (l.id as string) || (l.identificacao_id as string) || "---",
              nome: null,
              itens_credito: []
            }))
          }
        })

        foundProfiles.push({
          type: 'prefeitura_natal',
          client: natalData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 12. Try search in Prefeitura Porto Velho Clients
      const { data: portoVelhoData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_porto_velho_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (portoVelhoData) {
        const { data: idData, error: idError } = await withRetry<Record<string, unknown>[] | null>(async () =>
          await supabase
            .from('prefeitura_porto_velho_identificacoes')
            .select('*, prefeitura_porto_velho_lotacoes(*)')
            .eq('cliente_id', (portoVelhoData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar identificações Prefeitura Porto Velho:", idError)
        
        const mappedRegs = (idData || []).map((r: Record<string, unknown>) => {
          const lotacoes = ensureArray<Lotacao>(r.prefeitura_porto_velho_lotacoes)
          return {
            ...r,
            id: r.id as string,
            numero_matricula: (r.matricula as string) || '---',
            matricula: (r.matricula as string) || '---',
            situacao_funcional: (r.vinculo as string) || null,
            salario: 0,
            orgao: (lotacoes[0]?.orgao as string) || (r.orgao as string) || null,
            regime_juridico: null,
            uf: 'RO',
            prefeitura_porto_velho_lotacoes: lotacoes,
            instituidores: lotacoes.map((l) => ({
              id: (l.id as string) || (l.identificacao_id as string) || "---",
              nome: null,
              itens_credito: []
            }))
          }
        })

        foundProfiles.push({
          type: 'prefeitura_porto_velho',
          client: portoVelhoData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 13. Try search in Governo BA Clients
      const { data: baData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_ba_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (baData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('governo_ba_matriculas').select('*').eq('cliente_id', (baData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Governo BA:", regError)

        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
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
        }))

        foundProfiles.push({
          type: 'governo_ba',
          client: baData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 14. Try search in Governo AM Clients
      const { data: amData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_am_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (amData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('governo_am_matriculas').select('*').eq('cliente_id', (amData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Governo AM:", regError)

        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
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
        }))

        foundProfiles.push({
          type: 'governo_am',
          client: amData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 15. Try search in Governo CE Clients
      const { data: ceData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_ce_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (ceData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('governo_ce_matriculas').select('*').eq('cliente_id', (ceData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Governo CE:", regError)

        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
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
        }))

        foundProfiles.push({
          type: 'governo_ce',
          client: ceData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 16. Try search in Governo RO Clients
      const { data: roData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_ro_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (roData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('governo_ro_matriculas').select('*').eq('cliente_id', (roData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Governo RO:", regError)

        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
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
        }))

        foundProfiles.push({
          type: 'governo_ro',
          client: roData,
          registrations: mappedRegs as unknown as Registration[]
        })
      }

      // 17. Try search in Prefeitura Ponta Grossa Clients
      const { data: pgData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_ponta_grossa_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (pgData) {
        const { data: regData, error: regError } = await withRetry<Record<string, unknown>[] | null>(async () => 
          await supabase.from('prefeitura_ponta_grossa_matriculas').select('*').eq('cliente_id', (pgData as ClientData).id)
        )
        if (regError) console.error("Erro ao buscar matrículas Prefeitura Ponta Grossa:", regError)

        const mappedRegs = (regData || []).map((r: Record<string, unknown>) => ({
          ...r,
          id: r.id as string,
          numero_matricula: (r.matricula as string) || '---',
          matricula: (r.matricula as string) || '---',
          orgao: (r.origem as string) || (r.orgao as string) || "PREFEITURA DE PONTA GROSSA",
          situacao: r.situacao as string | null,
          vinculo: (r.vinculo as string) || (r.situacao as string) || null,
          margem_total: r.margem_total || 0.00,
          margem_disponivel: r.margem_disponivel || 0.00,
          uf: 'PR',
          instituidores: []
        }))

        foundProfiles.push({
          type: 'prefeitura_ponta_grossa',
          client: pgData,
          registrations: mappedRegs as unknown as Registration[]
        })
      } else {
        // Fallback: search in base_consulta_prefeitura_ponta_grossa directly
        const { data: basePgData } = await withRetry<Record<string, unknown> | null>(async () =>
          await supabase.from('base_consulta_prefeitura_ponta_grossa').select('*').eq('cpf', paddedCpf).maybeSingle()
        )

        if (basePgData) {
          const mappedRegs = [{
            id: (basePgData.id as string) || (basePgData.matricula as string) || '---',
            numero_matricula: (basePgData.matricula as string) || '---',
            matricula: (basePgData.matricula as string) || '---',
            orgao: (basePgData.origem as string) || 'PREFEITURA DE PONTA GROSSA',
            situacao: (basePgData.situacao as string) || null,
            vinculo: (basePgData.vinculo as string) || (basePgData.situacao as string) || null,
            margem_total: basePgData.margem_total || 0.00,
            margem_disponivel: basePgData.margem_disponivel || 0.00,
            uf: 'PR',
            instituidores: []
          }]

          foundProfiles.push({
            type: 'prefeitura_ponta_grossa',
            client: {
              ...basePgData,
              nome: (basePgData.nome as string) || null,
              cpf: basePgData.cpf as string,
              data_nascimento: null,
              idade: (basePgData.idade as number | undefined) ?? null,
              telefone_1: (basePgData.telefone_1 as string) || null,
              telefone_2: (basePgData.telefone_2 as string) || null,
              telefone_3: (basePgData.telefone_3 as string) || null,
            } as ClientData,
            registrations: mappedRegs as unknown as Registration[]
          })
        }
      }

      if (foundProfiles.length > 0) {
        setProfiles(foundProfiles)
        // Select first profile or match initialMatricula if present
        let selectedProfile = foundProfiles[0]
        if (initialMatricula) {
          const matchProfile = foundProfiles.find(p => 
            p.registrations.some(r => 
              r.matricula === initialMatricula || 
              r.numero_matricula === initialMatricula || 
              r.identificacao === initialMatricula ||
              (r.instituidores && r.instituidores.some(i => i.numero_matricula === initialMatricula))
            )
          )
          if (matchProfile) {
            selectedProfile = matchProfile
          }
        }
        setClient(selectedProfile.client)
        setClientType(selectedProfile.type)
        setRegistrations(selectedProfile.registrations)
        setIsLoading(false)
        return
      }

      setError("Cliente não encontrado.")
    } catch (err: unknown) {
      console.error("Erro na busca:", err)
      setError("Ocorreu um erro ao buscar os dados.")
    } finally {
      setIsLoading(false)
    }
  }, [cpf, initialMatricula])

  useEffect(() => {
    if (isOpen && cpf) {
      fetchClientData()
    } else if (!isOpen) {
      // Clear data when closing
      setClient(null)
      setRegistrations([])
      setActiveRegIndex(0)
    }
  }, [isOpen, cpf, fetchClientData])

  useEffect(() => {
    if (isOpen && registrations.length > 0 && initialMatricula) {
      let targetIndex = -1;
      
      if (clientType === 'siape') {
        const tempAllRegs = registrations.flatMap(reg => {
          if (!reg.instituidores || reg.instituidores.length === 0) return [reg];
          return reg.instituidores.map(inst => ({ ...reg, ...inst }));
        });
        targetIndex = tempAllRegs.findIndex(r => r.numero_matricula === initialMatricula);
      } else {
        targetIndex = registrations.findIndex((r: Registration) => 
          r.matricula === initialMatricula || 
          r.identificacao === initialMatricula || 
          r.numero_matricula === initialMatricula
        );
      }

      if (targetIndex !== -1) {
        setActiveRegIndex(targetIndex);
      }
    }
  }, [isOpen, registrations, initialMatricula, clientType]);

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
      const cleaned = phone.replace(/\D/g, "")
      if (cleaned.length === 11) {
        return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
      }
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3")
    }
    const cleaned = phone.replace(/\D/g, "")
    if (cleaned.length >= 8) {
      return cleaned.slice(0, -4) + "****"
    }
    return phone.replace(/\d{4}$/, "****")
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
    if (value === null || value === undefined || isNaN(value)) return "R$ 0,00"
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const handlePhoneClick = (phone: string | null | undefined) => {
    if (!phone || phone === '0' || phone === 'NÃO INFORMADO') return;
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) return;
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
    window.open(`https://wa.me/${finalPhone}`, '_blank');
  };

  const getUtilizadaStatus = (bruta: number | null, liquida: number | null) => {
    const b = bruta || 0;
    const l = liquida || 0;
    return Math.abs(l - b) > 0.01 ? "SIM" : "NÃO"
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "NÃO INFORMADO"
    const [year, month, day] = dateStr.split('-')
    return `${day}/${month}/${year}`
  }

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const copyToClipboard = (text: string, label: string) => {
    if (!text || text === "NÃO INFORMADO") return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(label);
      toast.success(`${label} copiado!`);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const getConvenioName = (type: ConvenioType | string | null | undefined) => {
    switch (type) {
      case "siape": return "SIAPE (Federal)";
      case "governo_sp": return "Governo de SP";
      case "prefeitura_sp": return "Prefeitura de SP";
      case "governo_pi": return "Governo do Piauí";
      case "governo_ma": return "Governo do Maranhão";
      case "governo_rr": return "Governo de Roraima";
      case "governo_rj": return "Governo do Rio de Janeiro";
      case "prefeitura_santo_andre": return "Prefeitura de Santo André";
      case "prefeitura_contagem": return "Prefeitura de Contagem";
      case "governo_mg": return "Governo de Minas Gerais";
      case "prefeitura_natal": return "Prefeitura de Natal";
      case "prefeitura_porto_velho": return "Prefeitura de Porto Velho";
      case "governo_ba": return "Governo da Bahia";
      case "governo_am": return "Governo do Amazonas";
      case "governo_ce": return "Governo do Ceará";
      case "governo_ro": return "Governo de Rondônia";
      case "prefeitura_ponta_grossa": return "Prefeitura de Ponta Grossa";
      default: return String(type || "CONVÊNIO").toUpperCase();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showCloseButton={false} className="max-w-[95vw] lg:max-w-6xl max-h-[92vh] overflow-hidden p-0 border border-slate-200 bg-[#FBFBFB] rounded-2xl shadow-2xl flex flex-col">
        <DialogTitle className="sr-only">{modalTitle}</DialogTitle>

        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 tracking-tight">{modalTitle}</h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Localizando dados do cliente...
            </p>
          </div>
        ) : error ? (
          <div className="p-16 text-center space-y-4">
            <p className="text-red-500 font-bold uppercase text-xs tracking-widest">{error}</p>
            <Button variant="outline" onClick={onClose}>Fechar</Button>
          </div>
        ) : client && (() => {
          let allRegs: Registration[] = [];
          if (clientType === "siape") {
            allRegs = registrations.flatMap(reg => {
              const isPension = reg.situacao_funcional === "BENEFICIARIO PENSAO";
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
            });
          } else {
            allRegs = registrations.map(reg => ({
              ...reg,
              displayId: reg.matricula || reg.identificacao || reg.numero_matricula || "---"
            }));
          }

          const activeReg = allRegs[activeRegIndex] || allRegs[0];

          // Extração normalizada de margens conforme padrão do sistema
          const anyReg = (activeReg || {}) as Record<string, unknown>;
          let margemEmpDisp = 0;
          let margemEmpBruta = 0;
          let margemRmcDisp = 0;
          let margemRmcBruta = 0;
          let margemRccDisp = 0;
          let margemRccBruta = 0;
          let saldo70Val: number | null = null;

          if (clientType === "siape") {
            margemEmpDisp = Number(anyReg.margem_35 ?? anyReg.margem_disponivel) || 0;
            margemEmpBruta = margemEmpDisp + (Number(anyReg.margem_utilizada) || 0);
            saldo70Val = anyReg.saldo_70 !== undefined && anyReg.saldo_70 !== null ? Number(anyReg.saldo_70) : null;
            margemRmcDisp = Number(anyReg.liquida_5 ?? anyReg.margem_cartao_credito) || 0;
            margemRmcBruta = Number(anyReg.bruta_5 ?? anyReg.margem_cartao_credito) || margemRmcDisp;
            margemRccDisp = Number(anyReg.beneficio_liquida_5 ?? anyReg.margem_cartao_beneficio) || 0;
            margemRccBruta = Number(anyReg.beneficio_bruta_5 ?? anyReg.margem_cartao_beneficio) || margemRccDisp;
          } else {
            const lotacoes = (anyReg.governo_sp_lotacoes || anyReg.prefeitura_sp_lotacoes || anyReg.governo_pi_lotacoes || anyReg.governo_ma_lotacoes) as Lotacao[] | undefined;
            if (Array.isArray(lotacoes) && lotacoes.length > 0) {
              const l = lotacoes[0];
              margemEmpDisp = Number(l.md_consignacoes ?? l.margem_disponivel_emprestimo ?? l.margem_disponivel ?? 0);
              margemEmpBruta = Number(l.mb_consignacoes ?? l.margem_emprestimo_consignado ?? l.margem_bruta ?? margemEmpDisp);
              margemRmcDisp = Number(l.md_cartao_credito ?? l.margem_cartao_consignado ?? 0);
              margemRmcBruta = Number(l.mb_cartao_credito ?? l.margem_cartao_consignado ?? margemRmcDisp);
              margemRccDisp = Number(l.md_cartao_beneficio ?? l.margem_cartao_beneficio ?? 0);
              margemRccBruta = Number(l.mb_cartao_beneficio ?? l.margem_cartao_beneficio ?? margemRccDisp);
            } else {
              margemEmpDisp = Number(anyReg.margem_disponivel_emprestimo ?? anyReg.margem_liquida_emprestimo ?? anyReg.margem_disponivel ?? anyReg.margem_emprestimo ?? anyReg.margem_consignavel ?? anyReg.margem_35 ?? 0);
              margemEmpBruta = Number(anyReg.margem_bruta_emprestimo ?? anyReg.margem_bruta ?? anyReg.margem_total ?? margemEmpDisp);
              margemRmcDisp = Number(anyReg.margem_cartao_consignado ?? anyReg.margem_cartao_credito ?? anyReg.margem_cartao ?? anyReg.margem_rmc ?? anyReg.liquida_5 ?? 0);
              margemRmcBruta = Number(anyReg.margem_bruta_cartao ?? anyReg.bruta_5 ?? margemRmcDisp);
              margemRccDisp = Number(anyReg.margem_cartao_beneficio ?? anyReg.margem_rcc ?? anyReg.beneficio_liquida_5 ?? 0);
              margemRccBruta = Number(anyReg.margem_bruta_beneficio ?? anyReg.beneficio_bruta_5 ?? margemRccDisp);
            }
          }

          // Extração e deduplicação de contratos
          const rawContractsList: Contract[] = [];
          if (activeReg) {
            if (Array.isArray(activeReg.itens_credito)) {
              rawContractsList.push(...activeReg.itens_credito);
            }
            if (Array.isArray(activeReg.instituidores)) {
              for (const inst of activeReg.instituidores) {
                if (Array.isArray(inst.itens_credito)) {
                  rawContractsList.push(...inst.itens_credito);
                }
              }
            }
          }

          const seenContracts = new Set<string>();
          const deduplicatedContracts: Contract[] = [];
          for (const c of rawContractsList) {
            const key = `${c.numero_do_contrato || ""}_${c.banco || ""}_${c.parcela || 0}`;
            if (!seenContracts.has(key)) {
              seenContracts.add(key);
              deduplicatedContracts.push(c);
            }
          }

          const loanContracts = deduplicatedContracts.filter(c => getContractTypeInfo(c.tipo).category === "EMPRESTIMO");
          const consignadoCards = deduplicatedContracts.filter(c => getContractTypeInfo(c.tipo).category === "CARTAO_CONSIGNADO");
          const beneficioCards = deduplicatedContracts.filter(c => getContractTypeInfo(c.tipo).category === "CARTAO_BENEFICIO");

          return (
            <>
              {/* Conteúdo rolável idêntico à Página do Cliente */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-[#FBFBFB]">
                {/* Convênios Vinculados */}
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
                          p.type === 'governo_ro' ? 'GOVERNO RONDÔNIA' :
                          p.type === 'prefeitura_ponta_grossa' ? 'PREFEITURA PONTA GROSSA' : String(p.type).toUpperCase();

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
                        className="text-slate-500 hover:text-slate-700 transition-colors p-2 hover:bg-slate-100 rounded-full cursor-pointer"
                      >
                        {showSensitiveData ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-12">
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</p>
                        <p 
                          onClick={() => copyToClipboard(client.nome || "", "Nome")}
                          title="Clique para copiar o Nome"
                          className="text-[13px] font-bold text-slate-900 uppercase cursor-pointer hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>{client.nome || "NÃO INFORMADO"}</span>
                          {client.nome && copiedField === "Nome" && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</p>
                        <p 
                          onClick={() => copyToClipboard(client.cpf || "", "CPF")}
                          title="Clique para copiar o CPF"
                          className="text-[13px] font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>{maskCPF(client.cpf)}</span>
                          {client.cpf && copiedField === "CPF" && (
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {clientType === 'prefeitura_ponta_grossa' ? 'Idade' : 'Data de Nascimento'}
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {clientType === 'prefeitura_ponta_grossa' ? (
                            <p className="text-[13px] font-bold text-slate-900">
                              {client.idade !== null && client.idade !== undefined
                                ? `${client.idade} ANOS`
                                : "NÃO INFORMADO"}
                            </p>
                          ) : (
                            <>
                              <p className="text-[13px] font-bold text-slate-900">{formatDate(client.data_nascimento)}</p>
                              {client.data_nascimento && (
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{calculateAge(client.data_nascimento)} Anos</p>
                              )}
                            </>
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

                {/* Matrículas / Benefícios Section */}
                {allRegs.length > 0 && (() => {
                  return (
                    <div className="space-y-0">
                      {/* Tabs Navigation */}
                      {allRegs.length > 1 && (
                        <div className="flex flex-wrap gap-1 px-4 sm:px-8">
                          {allRegs.map((reg, idx) => (
                            <button
                              key={`tab-${reg.id || idx}-${idx}`}
                              onClick={() => setActiveRegIndex(idx)}
                              className={cn(
                                "px-6 py-3 text-[10px] font-bold uppercase tracking-widest transition-all rounded-t-2xl border-x border-t relative z-10 -mb-[1px] cursor-pointer",
                                activeRegIndex === idx 
                                  ? "bg-white border-slate-200 text-slate-900 shadow-[0_-4px_12px_-4px_rgba(0,0,0,0.05)] font-black" 
                                  : "bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100"
                              )}
                            >
                              <div className="flex flex-col items-center">
                                <span>Matrícula {reg.numero_matricula || reg.identificacao || reg.matricula || idx + 1}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Active Content Card */}
                      {activeReg && (
                        <Card className={cn("card-shadow border border-slate-200 animate-in fade-in duration-300", allRegs.length > 1 && "rounded-tl-none")}>
                          <CardContent className="p-4 sm:p-8 space-y-10 sm:space-y-12">
                            {/* Informações da Matrícula */}
                            <div className="space-y-8 sm:space-y-10">
                              <div className="flex items-center gap-3">
                                <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
                                <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Informações da Matrícula</h3>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-8 sm:gap-y-10 gap-x-6 sm:gap-x-12">
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                  <p className="text-[13px] font-bold text-slate-900">{activeReg.numero_matricula || activeReg.identificacao || activeReg.matricula || "NÃO INFORMADA"}</p>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Situação Funcional</p>
                                  <p className="text-[13px] font-bold text-slate-900 uppercase">{activeReg.situacao_funcional || "NÃO INFORMADO"}</p>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salário</p>
                                  <p className="text-[13px] font-bold text-slate-900">{formatCurrency(Number(activeReg.salario || (activeReg as unknown as Record<string, unknown>).renda || 0))}</p>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {activeReg.situacao_funcional === 'BENEFICIARIO PENSAO' ? 'Instituidor' : 'Órgão (Vínculo)'}
                                  </p>
                                  <p className="text-[13px] font-bold text-slate-900 uppercase">
                                    {activeReg.currentInstituidor || activeReg.orgao || (activeReg as unknown as Record<string, unknown>).secretaria || "NÃO INFORMADO"}
                                  </p>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Regime Jurídico</p>
                                  <p className="text-[13px] font-bold text-slate-900 uppercase">{activeReg.regime_juridico || (activeReg as unknown as Record<string, unknown>).regime_contratacao || "NÃO INFORMADO"}</p>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF</p>
                                  <p className="text-[13px] font-bold text-slate-900 uppercase">{activeReg.uf || "NÃO INFORMADO"}</p>
                                </div>
                              </div>
                            </div>

                            {/* Margens Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                              {/* Row 1: Saldo 70% e Líquida Facultativa Global */}
                              {saldo70Val !== null && (
                                <div className="p-3.5 bg-slate-300/60 border border-slate-400/40 rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]">
                                  <div>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Saldo 70%</p>
                                    <p className="text-[17px] font-bold text-slate-900 tracking-tight">{formatCurrency(saldo70Val)}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 invisible">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                    <span className="text-[8px] font-bold uppercase tracking-widest">STATUS</span>
                                  </div>
                                </div>
                              )}
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]",
                                saldo70Val !== null ? "sm:col-span-1 lg:col-span-2" : "sm:col-span-2 lg:col-span-3",
                                margemEmpDisp > 0 ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                              )}>
                                <div>
                                  <p className={cn(
                                    "text-[9px] font-bold uppercase tracking-widest",
                                    margemEmpDisp > 0 ? "text-emerald-700/60" : "text-red-700/60"
                                  )}>LÍQUIDA FACULTATIVA GLOBAL</p>
                                  <p className={cn(
                                    "text-[17px] font-bold tracking-tight",
                                    margemEmpDisp > 0 ? "text-emerald-700" : "text-red-700"
                                  )}>{formatCurrency(margemEmpDisp)}</p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", margemEmpDisp > 0 ? "bg-emerald-600" : "bg-red-600")}></div>
                                  <span className={cn("text-[8px] font-bold uppercase tracking-widest", margemEmpDisp > 0 ? "text-emerald-600" : "text-red-600")}>
                                    {margemEmpDisp > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                  </span>
                                </div>
                              </div>

                              {/* Row 2: 5% RMC */}
                              <div className="p-3.5 bg-[#F1F5F9] border border-slate-200 rounded-xl space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Bruta 5%</p>
                                <p className="text-[17px] font-bold text-slate-900 tracking-tight">{formatCurrency(margemRmcBruta)}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5 transition-colors duration-200",
                                getUtilizadaStatus(margemRmcBruta, margemRmcDisp) === "SIM" ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn(
                                  "text-[9px] font-bold uppercase tracking-widest",
                                  getUtilizadaStatus(margemRmcBruta, margemRmcDisp) === "SIM" ? "text-red-700/60" : "text-emerald-700/60"
                                )}>Utilizada 5%</p>
                                <p className={cn(
                                  "text-[17px] font-bold tracking-tight uppercase",
                                  getUtilizadaStatus(margemRmcBruta, margemRmcDisp) === "SIM" ? "text-red-700" : "text-emerald-700"
                                )}>
                                  {getUtilizadaStatus(margemRmcBruta, margemRmcDisp)}
                                </p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                margemRmcDisp > 0 ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                              )}>
                                <p className={cn(
                                  "text-[9px] font-bold uppercase tracking-widest",
                                  margemRmcDisp > 0 ? "text-emerald-700/60" : "text-red-700/60"
                                )}>Líquida 5%</p>
                                <div className="flex flex-col">
                                  <p className={cn(
                                    "text-[17px] font-bold tracking-tight",
                                    margemRmcDisp > 0 ? "text-emerald-700" : "text-red-700"
                                  )}>{formatCurrency(margemRmcDisp)}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", margemRmcDisp > 0 ? "bg-emerald-600" : "bg-red-600")}></div>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-widest", margemRmcDisp > 0 ? "text-emerald-600" : "text-red-600")}>
                                      {margemRmcDisp > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Row 3: 5% RCC Benefício */}
                              <div className="p-3.5 bg-[#F1F5F9] border border-slate-200 rounded-xl space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Benefício Bruta 5%</p>
                                <p className="text-[17px] font-bold text-slate-900 tracking-tight">{formatCurrency(margemRccBruta)}</p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5 transition-colors duration-200",
                                getUtilizadaStatus(margemRccBruta, margemRccDisp) === "SIM" ? "bg-red-100/50 border-red-200" : "bg-emerald-100/50 border-emerald-200"
                              )}>
                                <p className={cn(
                                  "text-[9px] font-bold uppercase tracking-widest",
                                  getUtilizadaStatus(margemRccBruta, margemRccDisp) === "SIM" ? "text-red-700/60" : "text-emerald-700/60"
                                )}>Benefício Utilizada 5%</p>
                                <p className={cn(
                                  "text-[17px] font-bold tracking-tight uppercase",
                                  getUtilizadaStatus(margemRccBruta, margemRccDisp) === "SIM" ? "text-red-700" : "text-emerald-700"
                                )}>
                                  {getUtilizadaStatus(margemRccBruta, margemRccDisp)}
                                </p>
                              </div>
                              <div className={cn(
                                "p-3.5 border rounded-xl space-y-0.5",
                                margemRccDisp > 0 ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                              )}>
                                <p className={cn(
                                  "text-[9px] font-bold uppercase tracking-widest",
                                  margemRccDisp > 0 ? "text-emerald-700/60" : "text-red-700/60"
                                )}>Benefício Líquida 5%</p>
                                <div className="flex flex-col">
                                  <p className={cn(
                                    "text-[17px] font-bold tracking-tight",
                                    margemRccDisp > 0 ? "text-emerald-700" : "text-red-700"
                                  )}>{formatCurrency(margemRccDisp)}</p>
                                  <div className="flex items-center gap-1.5">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", margemRccDisp > 0 ? "bg-emerald-600" : "bg-red-600")}></div>
                                    <span className={cn("text-[8px] font-bold uppercase tracking-widest", margemRccDisp > 0 ? "text-emerald-600" : "text-red-600")}>
                                      {margemRccDisp > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Contratos de Empréstimo */}
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
                                    {loanContracts.length > 0 ? (
                                      loanContracts.map((loan, lIdx) => (
                                        <LoanRow key={lIdx} loan={{
                                          banco: loan.banco,
                                          orgao: loan.orgao,
                                          contrato: loan.numero_do_contrato || String(loan.id || lIdx + 1),
                                          parcela: Number(loan.parcela) || 0,
                                          prazo: Number(loan.prazo) || 0,
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

                            {/* Cartões Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                              {/* Cartão Consignado */}
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
                                              {formatCurrency(Number(card.parcela) || 0)}
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

                              {/* Cartão Benefício */}
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
                                              {formatCurrency(Number(card.parcela) || 0)}
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
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Footer */}
              {hasTabulacoes && (
                <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-6 bg-[#FBFBFB] shrink-0 flex-wrap">
                  {(["CLIENTE CHAMADO", "NÃO EXISTE WHATSAPP", "WHATSAPP DIVERGENTE"] as const).map((status) => {
                    const isChecked = !!selectedStatuses[status];
                    return (
                      <label
                        key={status}
                        className="flex items-center gap-2 cursor-pointer select-none group py-1"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              setSelectedStatuses({ [status]: true });
                              if (onSelectTabulacao) {
                                const phones = client ? [client.telefone_1, client.telefone_2, client.telefone_3].filter(
                                  (p): p is string => Boolean(p && p !== '0' && p !== 'NÃO INFORMADO')
                                ) : [];
                                await onSelectTabulacao(status, {
                                  cpf: client?.cpf || cpf,
                                  nome: client?.nome || "Cliente sem Nome",
                                  telefones: phones
                                });
                              }
                              onClose();
                            } else {
                              setSelectedStatuses(prev => ({
                                ...prev,
                                [status]: false
                              }));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer accent-[#171717]"
                        />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 group-hover:text-slate-900 transition-colors">
                          {status}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
