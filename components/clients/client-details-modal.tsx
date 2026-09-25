"use client"
import React, { useState, useEffect } from "react"
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
  Building 
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

interface ClientDetailsModalProps {
  cpf: string;
  isOpen: boolean;
  onClose: () => void;
  initialMatricula?: string;
}

export function ClientDetailsModal({ cpf, isOpen, onClose, initialMatricula }: ClientDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [client, setClient] = useState<ClientData | null>(null)
  const [clientType, setClientType] = useState<ConvenioType | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [profiles, setProfiles] = useState<ConvenioProfile[]>([])
  const [activeRegIndex, setActiveRegIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchClientData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setClient(null)
    setClientType(null)
    setRegistrations([])
    setProfiles([])
    setActiveRegIndex(0)

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
      <DialogContent className="max-w-[95vw] lg:max-w-6xl max-h-[92vh] overflow-y-auto p-4 sm:p-7 border border-slate-200 bg-slate-50/70 rounded-2xl shadow-xl">
        <DialogTitle className="sr-only">Ficha de Dados do Cliente</DialogTitle>

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
              Localizando ficha cadastral e financeira...
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

          // Extração normalizada de margens
          const anyReg = (activeReg || {}) as Record<string, unknown>;
          let margemEmpDisp = 0;
          let margemEmpBruta = 0;
          let margemRmcDisp = 0;
          let margemRmcBruta = 0;
          let margemRccDisp = 0;
          let margemRccBruta = 0;
          let saldo70Val: number | null = null;

          if (clientType === "siape") {
            margemEmpDisp = Number(anyReg.margem_disponivel) || 0;
            margemEmpBruta = margemEmpDisp + (Number(anyReg.margem_utilizada) || 0);
            saldo70Val = anyReg.saldo_70 !== undefined && anyReg.saldo_70 !== null ? Number(anyReg.saldo_70) : null;
            margemRmcDisp = Number(anyReg.margem_cartao_credito) || 0;
            margemRmcBruta = margemRmcDisp;
            margemRccDisp = Number(anyReg.margem_cartao_beneficio) || 0;
            margemRccBruta = margemRccDisp;
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
              margemEmpDisp = Number(anyReg.margem_disponivel_emprestimo ?? anyReg.margem_liquida_emprestimo ?? anyReg.margem_disponivel ?? anyReg.margem_emprestimo ?? anyReg.margem_consignavel ?? 0);
              margemEmpBruta = Number(anyReg.margem_bruta_emprestimo ?? anyReg.margem_bruta ?? anyReg.margem_total ?? margemEmpDisp);
              margemRmcDisp = Number(anyReg.margem_cartao_consignado ?? anyReg.margem_cartao_credito ?? anyReg.margem_cartao ?? anyReg.margem_rmc ?? 0);
              margemRmcBruta = Number(anyReg.margem_bruta_cartao ?? margemRmcDisp);
              margemRccDisp = Number(anyReg.margem_cartao_beneficio ?? anyReg.margem_rcc ?? 0);
              margemRccBruta = Number(anyReg.margem_bruta_beneficio ?? margemRccDisp);
            }
          }

          // Extração de contratos (Empréstimos vs Cartões Consignados)
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
          const cardContracts = deduplicatedContracts.filter(c => {
            const cat = getContractTypeInfo(c.tipo).category;
            return cat === "CARTAO_CONSIGNADO" || cat === "CARTAO_BENEFICIO";
          });

          const totalLoanParcelas = loanContracts.reduce((acc, c) => acc + (Number(c.parcela) || 0), 0);
          const totalCardParcelas = cardContracts.reduce((acc, c) => acc + (Number(c.parcela) || 0), 0);

          return (
            <div className="space-y-6">
              {/* Cabeçalho da Ficha */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                        Ficha Cadastral e Financeira
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {getConvenioName(clientType)}
                      </Badge>
                      {allRegs.length > 1 && (
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {allRegs.length} Matrículas
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
                      {client.nome || "CLIENTE NÃO INFORMADO"}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">
                      CPF: <span className="font-mono text-slate-800 font-bold">{maskCPF(client.cpf)}</span>
                      {client.data_nascimento && (
                        <span className="ml-3">
                          Nascimento: <span className="text-slate-800 font-bold">{formatDate(client.data_nascimento)}</span>
                          {calculateAge(client.data_nascimento) !== null && ` (${calculateAge(client.data_nascimento)} anos)`}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSensitiveData(!showSensitiveData)}
                      className="text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 gap-1.5"
                      title={showSensitiveData ? "Ocultar CPF / Telefones" : "Mostrar dados completos"}
                    >
                      {showSensitiveData ? <Eye className="w-3.5 h-3.5 text-blue-600" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{showSensitiveData ? "Ocultar Sensíveis" : "Mostrar Completo"}</span>
                    </Button>
                  </div>
                </div>

                {/* Se houver múltiplos convênios para o CPF */}
                {profiles.length > 1 && (
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alternar Convênio ({profiles.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {profiles.map((p) => {
                        const isActive = clientType === p.type;
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
                              "px-3 py-1 text-[11px] font-bold uppercase rounded-lg border transition-all cursor-pointer",
                              isActive
                                ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            {getConvenioName(p.type)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 1: DADOS PESSOAIS */}
              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">1. Dados Pessoais</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Informações de identificação civil e contatos</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                    Seção 01
                  </span>
                </div>

                <CardContent className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Nome */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nome Completo</p>
                      <p className="text-sm font-black text-slate-900 uppercase truncate" title={client.nome || ""}>
                        {client.nome || "NÃO INFORMADO"}
                      </p>
                    </div>

                    {/* CPF */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CPF</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-900 font-mono">
                          {maskCPF(client.cpf)}
                        </p>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(client.cpf, "cpf")}
                          className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
                          title="Copiar CPF"
                        >
                          {copiedField === "cpf" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Data de Nascimento / Idade */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Data de Nascimento / Idade</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <p className="text-sm font-black text-slate-900">
                          {formatDate(client.data_nascimento)}
                        </p>
                        {client.data_nascimento && (
                          <Badge variant="secondary" className="text-[10px] font-bold bg-slate-100 text-slate-700">
                            {calculateAge(client.data_nascimento)} anos
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Telefone Principal */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone Principal (WhatsApp)</p>
                      <div className="flex items-center gap-2">
                        <p 
                          className={cn(
                            "text-sm font-black text-slate-900 font-mono",
                            client.telefone_1 && client.telefone_1 !== "0" && client.telefone_1 !== "NÃO INFORMADO" && "cursor-pointer hover:text-emerald-600 transition-colors"
                          )}
                          onClick={() => handlePhoneClick(client.telefone_1)}
                        >
                          {maskPhone(client.telefone_1)}
                        </p>
                        {client.telefone_1 && client.telefone_1 !== "0" && client.telefone_1 !== "NÃO INFORMADO" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePhoneClick(client.telefone_1)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Abrir no WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 fill-emerald-600/15" />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(client.telefone_1 as string, "tel1")}
                              className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
                              title="Copiar telefone"
                            >
                              {copiedField === "tel1" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Telefone 2 */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone 2</p>
                      <div className="flex items-center gap-2">
                        <p 
                          className={cn(
                            "text-sm font-black text-slate-900 font-mono",
                            client.telefone_2 && client.telefone_2 !== "0" && client.telefone_2 !== "NÃO INFORMADO" && "cursor-pointer hover:text-emerald-600 transition-colors"
                          )}
                          onClick={() => handlePhoneClick(client.telefone_2)}
                        >
                          {maskPhone(client.telefone_2)}
                        </p>
                        {client.telefone_2 && client.telefone_2 !== "0" && client.telefone_2 !== "NÃO INFORMADO" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePhoneClick(client.telefone_2)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Abrir no WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 fill-emerald-600/15" />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(client.telefone_2 as string, "tel2")}
                              className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
                              title="Copiar telefone"
                            >
                              {copiedField === "tel2" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Telefone 3 */}
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Telefone 3</p>
                      <div className="flex items-center gap-2">
                        <p 
                          className={cn(
                            "text-sm font-black text-slate-900 font-mono",
                            client.telefone_3 && client.telefone_3 !== "0" && client.telefone_3 !== "NÃO INFORMADO" && "cursor-pointer hover:text-emerald-600 transition-colors"
                          )}
                          onClick={() => handlePhoneClick(client.telefone_3)}
                        >
                          {maskPhone(client.telefone_3)}
                        </p>
                        {client.telefone_3 && client.telefone_3 !== "0" && client.telefone_3 !== "NÃO INFORMADO" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handlePhoneClick(client.telefone_3)}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Abrir no WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4 fill-emerald-600/15" />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(client.telefone_3 as string, "tel3")}
                              className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
                              title="Copiar telefone"
                            >
                              {copiedField === "tel3" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEÇÃO 2: INFORMAÇÕES DE MATRÍCULAS */}
              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">2. Informações de Matrículas</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Vínculos funcionais, cargo, situação e remuneração</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                    Seção 02
                  </span>
                </div>

                <CardContent className="p-5 sm:p-6 space-y-5">
                  {allRegs.length > 1 && (
                    <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100">
                      {allRegs.map((reg, idx) => {
                        const isSelected = activeRegIndex === idx;
                        const regNumber = reg.numero_matricula || reg.identificacao || reg.matricula || `Vínculo ${idx + 1}`;
                        return (
                          <button
                            key={`reg-tab-${idx}`}
                            type="button"
                            onClick={() => setActiveRegIndex(idx)}
                            className={cn(
                              "px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-2",
                              isSelected
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            )}
                          >
                            <span>Matrícula: {regNumber}</span>
                            {reg.situacao_funcional && (
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-black uppercase",
                                isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                              )}>
                                {reg.situacao_funcional}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeReg ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Número da Matrícula / ID</p>
                        <p className="text-sm font-black text-slate-900 font-mono">
                          {activeReg.numero_matricula || activeReg.identificacao || activeReg.matricula || "NÃO INFORMADA"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Situação Funcional</p>
                        <div>
                          <span className={cn(
                            "px-2.5 py-0.5 text-xs font-black uppercase rounded-md border inline-block",
                            String(activeReg.situacao_funcional || "").includes("ATIVO")
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : String(activeReg.situacao_funcional || "").includes("APOSENT")
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : String(activeReg.situacao_funcional || "").includes("PENSAO")
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          )}>
                            {activeReg.situacao_funcional || "NÃO INFORMADO"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salário / Remuneração</p>
                        <p className="text-sm font-black text-slate-900 font-mono">
                          {formatCurrency(Number(activeReg.salario || (activeReg as Record<string, unknown>).renda || 0))}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Órgão / Vínculo</p>
                        <p className="text-sm font-black text-slate-900 uppercase truncate" title={String(activeReg.currentInstituidor || activeReg.orgao || (activeReg as Record<string, unknown>).secretaria || "")}>
                          {activeReg.currentInstituidor || activeReg.orgao || (activeReg as Record<string, unknown>).secretaria || getConvenioName(clientType)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Regime Jurídico / Contrato</p>
                        <p className="text-sm font-bold text-slate-800 uppercase">
                          {activeReg.regime_juridico || (activeReg as Record<string, unknown>).regime_contratacao || "NÃO INFORMADO"}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">UF de Lotação</p>
                        <p className="text-sm font-bold text-slate-800 uppercase">
                          {activeReg.uf || "---"}
                        </p>
                      </div>

                      {activeReg.currentInstituidor && activeReg.situacao_funcional === "BENEFICIARIO PENSAO" && (
                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Instituidor da Pensão</p>
                          <p className="text-sm font-bold text-slate-800 uppercase">
                            {activeReg.currentInstituidor}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Nenhuma matrícula encontrada para este vínculo.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEÇÃO 3: MARGENS */}
              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">3. Margens</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Margens consignáveis disponíveis e limites por modalidade</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                    Seção 03
                  </span>
                </div>

                <CardContent className="p-5 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Margem Empréstimo */}
                    <div className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all",
                      margemEmpDisp > 0
                        ? "bg-emerald-50/60 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    )}>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            Margem Empréstimo
                          </span>
                          <span className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                            margemEmpDisp > 0
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-slate-200 text-slate-600 border-slate-300"
                          )}>
                            {margemEmpDisp > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                          </span>
                        </div>
                        <p className={cn(
                          "text-2xl font-black tracking-tight font-mono",
                          margemEmpDisp > 0 ? "text-emerald-700" : "text-slate-800"
                        )}>
                          {formatCurrency(margemEmpDisp)}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Margem Bruta / Base:</span>
                        <span className="font-bold text-slate-700 font-mono">{formatCurrency(margemEmpBruta)}</span>
                      </div>

                      {saldo70Val !== null && (
                        <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
                          <span>Saldo 70%:</span>
                          <span className="font-bold text-slate-700 font-mono">{formatCurrency(saldo70Val)}</span>
                        </div>
                      )}
                    </div>

                    {/* Margem Cartão Consignado RMC */}
                    <div className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all",
                      margemRmcDisp > 0
                        ? "bg-blue-50/60 border-blue-200"
                        : "bg-slate-50 border-slate-200"
                    )}>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            Cartão Consignado (RMC)
                          </span>
                          <span className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                            margemRmcDisp > 0
                              ? "bg-blue-100 text-blue-800 border-blue-300"
                              : "bg-slate-200 text-slate-600 border-slate-300"
                          )}>
                            {margemRmcDisp > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                          </span>
                        </div>
                        <p className={cn(
                          "text-2xl font-black tracking-tight font-mono",
                          margemRmcDisp > 0 ? "text-blue-700" : "text-slate-800"
                        )}>
                          {formatCurrency(margemRmcDisp)}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Margem Bruta / Limite:</span>
                        <span className="font-bold text-slate-700 font-mono">{formatCurrency(margemRmcBruta)}</span>
                      </div>
                    </div>

                    {/* Margem Cartão Benefício RCC */}
                    <div className={cn(
                      "p-4 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all",
                      margemRccDisp > 0
                        ? "bg-purple-50/60 border-purple-200"
                        : "bg-slate-50 border-slate-200"
                    )}>
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600">
                            Cartão Benefício (RCC)
                          </span>
                          <span className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full border",
                            margemRccDisp > 0
                              ? "bg-purple-100 text-purple-800 border-purple-300"
                              : "bg-slate-200 text-slate-600 border-slate-300"
                          )}>
                            {margemRccDisp > 0 ? "DISPONÍVEL" : "INDISPONÍVEL"}
                          </span>
                        </div>
                        <p className={cn(
                          "text-2xl font-black tracking-tight font-mono",
                          margemRccDisp > 0 ? "text-purple-700" : "text-slate-800"
                        )}>
                          {formatCurrency(margemRccDisp)}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Margem Bruta / Limite:</span>
                        <span className="font-bold text-slate-700 font-mono">{formatCurrency(margemRccBruta)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* SEÇÃO 4: CONTRATOS DE EMPRÉSTIMOS */}
              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">4. Contratos de Empréstimos</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Contratos consignados ativos em folha de pagamento</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {loanContracts.length} {loanContracts.length === 1 ? "Contrato" : "Contratos"}
                  </span>
                </div>

                <CardContent className="p-5 sm:p-6 space-y-4">
                  {loanContracts.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr>
                              <th className="pb-2 pl-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Banco</th>
                              <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Órgão</th>
                              <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Contrato</th>
                              <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Parcela</th>
                              <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Prazo</th>
                              <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Taxa Est.</th>
                              <th className="pb-2 pr-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Saldo Est.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loanContracts.map((loan, idx) => (
                              <LoanRow
                                key={`loan-row-${idx}`}
                                loan={{
                                  banco: loan.banco,
                                  orgao: loan.orgao,
                                  contrato: loan.numero_do_contrato || String(loan.id || idx + 1),
                                  parcela: Number(loan.parcela) || 0,
                                  prazo: Number(loan.prazo) || 0,
                                  tipo: loan.tipo
                                }}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="text-slate-600 font-medium">
                          Total de contratos de empréstimo: <span className="font-bold text-slate-900">{loanContracts.length}</span>
                        </div>
                        <div className="text-slate-600 font-medium sm:text-right">
                          Soma das parcelas:{" "}
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {formatCurrency(totalLoanParcelas)}
                          </span>
                          <span className="text-slate-400 text-[10px]"> /mês</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 px-4 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Nenhum contrato de empréstimo ativo encontrado para esta matrícula
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Não constam consignações de empréstimo ativas registradas nesta base.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* SEÇÃO 5: CONTRATOS DE CARTÕES CONSIGNADOS */}
              <Card className="border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">5. Contratos de Cartões Consignados</h3>
                      <p className="text-[11px] text-slate-500 font-medium">Descontos de reserva de margem (RMC) e cartão benefício (RCC)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {cardContracts.length} {cardContracts.length === 1 ? "Cartão" : "Cartões"}
                  </span>
                </div>

                <CardContent className="p-5 sm:p-6 space-y-4">
                  {cardContracts.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr>
                              <th className="pb-2 pl-4 text-[10px] font-black text-slate-400 uppercase tracking-wider">Tipo de Cartão</th>
                              <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider">Banco Emissor</th>
                              <th className="pb-2 text-[10px] font-black text-slate-400 uppercase tracking-wider text-center">Contrato / Ref</th>
                              <th className="pb-2 pr-4 text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Parcela / Desconto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cardContracts.map((card, idx) => {
                              const info = getContractTypeInfo(card.tipo);
                              const isRCC = info.category === "CARTAO_BENEFICIO";
                              const displayedBank = info.bank || card.banco || "BANCO CONSIGNATÁRIO";

                              return (
                                <tr key={`card-row-${idx}`} className="bg-slate-50/70 hover:bg-slate-100/70 transition-colors">
                                  <td className="py-3 pl-4 rounded-l-xl border-y border-l border-slate-200">
                                    <span className={cn(
                                      "px-2.5 py-0.5 text-[10px] font-black uppercase rounded-md border inline-block",
                                      isRCC
                                        ? "bg-purple-50 text-purple-700 border-purple-200"
                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                    )}>
                                      {isRCC ? "Cartão Benefício (RCC)" : "Cartão Consignado (RMC)"}
                                    </span>
                                  </td>
                                  <td className="py-3 text-xs font-bold text-slate-800 uppercase border-y border-slate-200">
                                    {displayedBank}
                                  </td>
                                  <td className="py-3 text-xs font-mono font-bold text-slate-600 text-center border-y border-slate-200">
                                    {card.numero_do_contrato || "---"}
                                  </td>
                                  <td className="py-3 pr-4 text-xs font-black text-slate-900 font-mono text-right rounded-r-xl border-y border-r border-slate-200">
                                    {formatCurrency(Number(card.parcela) || 0)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="text-slate-600 font-medium">
                          Total de cartões consignados: <span className="font-bold text-slate-900">{cardContracts.length}</span>
                        </div>
                        <div className="text-slate-600 font-medium sm:text-right">
                          Soma dos descontos em cartões:{" "}
                          <span className="font-black text-slate-900 text-sm font-mono">
                            {formatCurrency(totalCardParcelas)}
                          </span>
                          <span className="text-slate-400 text-[10px]"> /mês</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 px-4 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        Nenhum contrato de cartão consignado encontrado para esta matrícula
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Não constam reservas de margem (RMC) ou cartões benefício (RCC) ativos registrados.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Botão de Fechar no Rodapé */}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={onClose} className="px-6 font-bold text-slate-700">
                  Fechar Ficha
                </Button>
              </div>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>
  );
}
