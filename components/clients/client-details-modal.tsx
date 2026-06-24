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
import { Loader2, Eye, EyeOff, MessageCircle } from "lucide-react"
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
  telefone_1: string | null;
  telefone_2: string | null;
  telefone_3: string | null;
  [key: string]: unknown;
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
  const [clientType, setClientType] = useState<'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | 'governo_rj' | 'prefeitura_santo_andre' | 'prefeitura_contagem' | 'governo_mg' | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [activeRegIndex, setActiveRegIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchClientData = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    setClient(null)
    setClientType(null)
    setRegistrations([])
    setActiveRegIndex(0)

    try {
      const digits = cpf.replace(/\D/g, "")
      const paddedCpf = digits.padStart(11, '0')
      
      // 1. Try search in SIAPE Clients
      const { data: siapeData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (siapeData) {
        setClient(siapeData)
        setClientType('siape')

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
        setRegistrations((regData as Registration[]) || [])
        setIsLoading(false)
        return
      }

      // 2. Try search in Governo SP Clients
      const { data: govSpData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_sp_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govSpData) {
        setClient(govSpData)
        setClientType('governo_sp')

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

        setRegistrations(mappedRegs as unknown as Registration[])
        setIsLoading(false)
        return
      }

      // 3. Try search in Prefeitura SP Clients
      const { data: pmspData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_sp_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (pmspData) {
        setClient(pmspData)
        setClientType('prefeitura_sp')

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

        setRegistrations(mappedRegs as unknown as Registration[])
        setIsLoading(false)
        return
      }

      // 4. Try search in Governo PI Clients
      const { data: govPiData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_pi_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govPiData) {
        setClient(govPiData)
        setClientType('governo_pi')

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

        setRegistrations(mappedIdData)
        setIsLoading(false)
        return
      }

      // 5. Try search in Governo MA Clients
      const { data: govMaData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_ma_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govMaData) {
        setClient(govMaData)
        setClientType('governo_ma')

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

        setRegistrations(mappedRegs as unknown as Registration[])
        setIsLoading(false)
        return
      }

      // 6. Try search in Governo RR Clients
      const { data: govRrData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_rr_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govRrData) {
        setClient(govRrData)
        setClientType('governo_rr')

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
        setRegistrations((idData as Registration[]) || [])
        setIsLoading(false)
        return
      }

      // 7. Try search in Governo RJ Clients
      const { data: govRjData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_rj_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (govRjData) {
        setClient(govRjData)
        setClientType('governo_rj')

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

        setRegistrations(mappedRegs as unknown as Registration[])
        setIsLoading(false)
        return
      }

      // 8. Try search in Prefeitura Santo André Clients
      const { data: saData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_santo_andre_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (saData) {
        setClient(saData)
        setClientType('prefeitura_santo_andre')

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

        setRegistrations(mappedRegs as unknown as Registration[])
        setIsLoading(false)
        return
      }

      // 9. Try search in Prefeitura Contagem Clients
      const { data: contagemData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('prefeitura_contagem_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (contagemData) {
        setClient(contagemData)
        setClientType('prefeitura_contagem')

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

        setRegistrations(mappedRegs as unknown as Registration[])
        setIsLoading(false)
        return
      }

      // 10. Try search in Governo MG Clients
      const { data: mgData } = await withRetry<ClientData | null>(async () => 
        await supabase.from('governo_mg_clientes').select('*').eq('cpf', paddedCpf).maybeSingle()
      )

      if (mgData) {
        setClient(mgData)
        setClientType('governo_mg')

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
          margem_emprestimo: r.margem_emprestimo || 0.00,
          margem_beneficio: r.margem_beneficio || 0.00,
          instituidores: []
        }))

        setRegistrations(mappedRegs as unknown as Registration[])
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
  }, [cpf])

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
    if (value === null || value === undefined) return "R$ 0,00"
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl max-h-[90vh] overflow-y-auto p-0 border-none bg-slate-50">
        <DialogHeader className="p-6 bg-white border-b border-slate-200 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full"></div>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Dados do Cliente</DialogTitle>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-4 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-[10px] font-bold uppercase tracking-widest">Buscando dados completos...</p>
          </div>
        ) : error ? (
          <div className="p-20 text-center">
            <p className="text-red-500 font-bold uppercase text-[12px] tracking-widest">{error}</p>
            <Button variant="outline" onClick={onClose} className="mt-4">Fechar</Button>
          </div>
        ) : client && (
          <div className="p-6 space-y-6">
            {/* Dados Pessoais */}
            <Card className="card-shadow bg-white border border-slate-200">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Dados Pessoais</h3>
                  </div>
                  <button 
                    onClick={() => setShowSensitiveData(!showSensitiveData)}
                    className="text-slate-400 hover:text-primary transition-colors p-2 hover:bg-slate-50 rounded-full"
                  >
                    {showSensitiveData ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nome</p>
                    <p className="text-[12px] font-bold text-slate-900 uppercase truncate" title={client.nome || ""}>{client.nome || "NÃO INFORMADO"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">CPF</p>
                    <p className="text-[12px] font-bold text-slate-900">{maskCPF(client.cpf)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nascimento</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[12px] font-bold text-slate-900">{formatDate(client.data_nascimento)}</p>
                      {client.data_nascimento && (
                        <Badge variant="secondary" className="text-[9px] font-bold h-4 px-1.5">{calculateAge(client.data_nascimento)} ANOS</Badge>
                      )}
                    </div>
                  </div>
                  {[client.telefone_1, client.telefone_2, client.telefone_3].map((tel, i) => tel && (
                    <div key={i} className="space-y-1">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Telefone {i + 1}</p>
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-emerald-600 transition-colors" onClick={() => handlePhoneClick(tel)}>
                        <p className="text-[12px] font-bold text-slate-900">{maskPhone(tel)}</p>
                        {tel !== '0' && tel !== 'NÃO INFORMADO' && (
                          <MessageCircle className="w-3.5 h-3.5 text-[#25D366] fill-[#25D366]/10" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Matrículas / Identificações Tabs */}
            {registrations.length > 0 && (() => {
              let allRegs: Registration[] = [];
              
              if (clientType === 'siape') {
                allRegs = registrations.flatMap(reg => {
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
                });
              } else {
                // Para Governo SP, Prefeitura SP, PI, MA
                // registrations já são as Identificações
                allRegs = registrations.map(reg => ({
                  ...reg,
                  displayId: reg.matricula || reg.identificacao || reg.numero_matricula || "---"
                }));
              }

              if (allRegs.length === 0) return null;

              const activeReg = allRegs[activeRegIndex] || allRegs[0];

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full"></div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                      {clientType === 'siape' ? 'Matrículas e Margens' : 'Identificações e Lotações'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allRegs.map((reg, idx) => (
                      <Button
                        key={`tab-${reg.id}-${idx}`}
                        variant={activeRegIndex === idx ? "default" : "outline"}
                        onClick={() => setActiveRegIndex(idx)}
                        className={cn(
                          "h-10 px-4 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
                          activeRegIndex === idx ? "bg-primary shadow-lg shadow-primary/20" : "bg-white text-slate-400"
                        )}
                      >
                        {clientType === 'siape' ? (
                          `Matrícula ${reg.numero_matricula}${reg.currentInstituidor ? ` - ${reg.currentInstituidor}` : ''}`
                        ) : (
                          `Identificação: ${reg.displayId}`
                        )}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-6">
                    {/* Info Card */}
                    <Card className="card-shadow bg-white border border-slate-200">
                      <CardContent className="p-6 space-y-8">
                        {clientType === 'siape' ? (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.numero_matricula}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">{activeReg.situacao_funcional || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Salário</p>
                                <p className="text-[12px] font-bold text-slate-900">{formatCurrency(activeReg.salario)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Órgão / Instituidor</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate" title={activeReg.currentInstituidor}>{activeReg.currentInstituidor}</p>
                              </div>
                            </div>

                            {/* Margens Grid SIAPE - Layout image.png */}
                            <div className="space-y-8">
                              {/* Seção Empréstimo Consignado */}
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-3.5 bg-blue-500 rounded-full"></div>
                                  <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">EMPRÉSTIMO CONSIGNADO</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="p-4 bg-[#eef2f6] border border-slate-200 rounded-2xl">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Saldo 70%</p>
                                    <p className="text-xl font-black text-slate-900">{formatCurrency(activeReg.saldo_70)}</p>
                                  </div>
                                  <div className={cn(
                                    "p-4 border rounded-2xl",
                                    (activeReg.margem_35 || 0) > 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                                  )}>
                                    <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", (activeReg.margem_35 || 0) > 0 ? "text-emerald-700" : "text-red-700")}>Margem 35%</p>
                                    <p className={cn("text-xl font-black", (activeReg.margem_35 || 0) > 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(activeReg.margem_35)}</p>
                                    <div className="flex items-center gap-1.5 mt-2">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", (activeReg.margem_35 || 0) > 0 ? "bg-emerald-500" : "bg-red-500")}></div>
                                      <p className={cn("text-[8px] font-bold uppercase tracking-widest", (activeReg.margem_35 || 0) > 0 ? "text-emerald-600" : "text-red-600")}>
                                        {(activeReg.margem_35 || 0) > 0 ? "Disponível" : "Indisponível"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="p-4 bg-[#fff7ed] border border-orange-200 rounded-2xl">
                                    <p className="text-[9px] font-bold text-orange-700 uppercase tracking-widest mb-1">Soma Margens Líquidas</p>
                                    <p className="text-xl font-black text-orange-700">
                                      {formatCurrency(
                                        (Number(activeReg.margem_35) || 0) + 
                                        (Number(activeReg.liquida_5) || 0) + 
                                        (Number(activeReg.beneficio_liquida_5) || 0)
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Seção Cartão Consignado */}
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-3.5 bg-emerald-500 rounded-full"></div>
                                  <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">CARTÃO CONSIGNADO (RMC)</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="p-4 bg-[#f1f5f9] border border-slate-100 rounded-2xl">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Bruta 5%</p>
                                    <p className="text-xl font-black text-slate-900">{formatCurrency(activeReg.bruta_5)}</p>
                                  </div>
                                  {(() => {
                                    const utilizada = getUtilizadaStatus(activeReg.bruta_5, activeReg.liquida_5);
                                    const isSim = utilizada === "SIM";
                                    return (
                                      <>
                                        <div className={cn(
                                          "p-4 border rounded-2xl",
                                          isSim ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
                                        )}>
                                          <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isSim ? "text-red-700" : "text-emerald-700")}>Utilizada 5%</p>
                                          <p className={cn("text-xl font-black", isSim ? "text-red-700" : "text-emerald-700")}>{utilizada}</p>
                                        </div>
                                        <div className={cn(
                                          "p-4 border rounded-2xl",
                                          isSim ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
                                        )}>
                                          <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isSim ? "text-red-700" : "text-emerald-700")}>Líquida 5%</p>
                                          <p className={cn("text-xl font-black", isSim ? "text-red-700" : "text-emerald-700")}>{formatCurrency(activeReg.liquida_5)}</p>
                                          <div className="flex items-center gap-1.5 mt-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", isSim ? "bg-red-500" : "bg-emerald-500")}></div>
                                            <p className={cn("text-[8px] font-bold uppercase tracking-widest", isSim ? "text-red-600" : "text-emerald-600")}>
                                              {isSim ? "Indisponível" : "Disponível"}
                                            </p>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Seção Cartão Benefício */}
                              <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-3.5 bg-purple-500 rounded-full"></div>
                                  <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">CARTÃO BENEFÍCIO (RCC)</h4>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="p-4 bg-[#f1f5f9] border border-slate-100 rounded-2xl">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Benefício Bruta 5%</p>
                                    <p className="text-xl font-black text-slate-900">{formatCurrency(activeReg.beneficio_bruta_5)}</p>
                                  </div>
                                  {(() => {
                                    const utilizada = getUtilizadaStatus(activeReg.beneficio_bruta_5, activeReg.beneficio_liquida_5);
                                    const isSim = utilizada === "SIM";
                                    return (
                                      <>
                                        <div className={cn(
                                          "p-4 border rounded-2xl",
                                          isSim ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
                                        )}>
                                          <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isSim ? "text-red-700" : "text-emerald-700")}>Benefício Utilizada 5%</p>
                                          <p className={cn("text-xl font-black", isSim ? "text-red-700" : "text-emerald-700")}>{utilizada}</p>
                                        </div>
                                        <div className={cn(
                                          "p-4 border rounded-2xl",
                                          isSim ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
                                        )}>
                                          <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isSim ? "text-red-700" : "text-emerald-700")}>Benefício Líquida 5%</p>
                                          <p className={cn("text-xl font-black", isSim ? "text-red-700" : "text-emerald-700")}>{formatCurrency(activeReg.beneficio_liquida_5)}</p>
                                          <div className="flex items-center gap-1.5 mt-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", isSim ? "bg-red-500" : "bg-emerald-500")}></div>
                                            <p className={cn("text-[8px] font-bold uppercase tracking-widest", isSim ? "text-red-600" : "text-emerald-600")}>
                                              {isSim ? "Indisponível" : "Disponível"}
                                            </p>
                                          </div>
                                        </div>
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          </>
                        ) : clientType === 'governo_sp' || clientType === 'prefeitura_sp' ? (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identificacao</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.identificacao}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vinculo</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase">
                                  {clientType === 'governo_sp' ? (activeReg.tipo_vinculo || "NÃO INFORMADO") : (activeReg.tipo_vinculo || activeReg.situacao_funcional || "NÃO INFORMADO")}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nomeação</p>
                                <p className="text-[12px] font-bold text-slate-900">{formatDate(activeReg.data_nomeacao)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lotação / Órgão</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.governo_sp_lotacoes?.[0]?.lotacao || activeReg.prefeitura_sp_lotacoes?.[0]?.lotacao || activeReg.regime_juridico || "---"}
                                </p>
                              </div>
                            </div>

                            {/* Margens Grid Gov SP / PMSP - Layout correspondente a pesquisa/page.tsx */}
                            {(() => {
                              const lotacao = activeReg.governo_sp_lotacoes?.[0] || activeReg.prefeitura_sp_lotacoes?.[0];
                              if (!lotacao) return (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dados de lotação/margens não encontrados</p>
                                </div>
                              );

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
                              const cartao = clientType === 'governo_sp' ? getCardLogic(lotacao.mb_cartao_credito, lotacao.md_cartao_credito) : null;
                              const beneficio = getCardLogic(lotacao.mb_cartao_beneficio, lotacao.md_cartao_beneficio);

                              return (
                                <div className="space-y-6">
                                  {/* Consignações */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1 h-3.5 bg-blue-600 rounded-full"></div>
                                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">EMPRÉSTIMO CONSIGNADO</h4>
                                    </div>
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
                                  </div>

                                  {/* Cartão Crédito (apenas para Governo SP) */}
                                  {clientType === 'governo_sp' && cartao && (
                                    <div className="space-y-3">
                                      <div className="flex items-center gap-2">
                                        <div className="w-1 h-3.5 bg-emerald-500 rounded-full"></div>
                                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">CARTÃO CONSIGNADO (RMC)</h4>
                                      </div>
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
                                    </div>
                                  )}

                                  {/* Cartão Benefício */}
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1 h-3.5 bg-purple-500 rounded-full"></div>
                                      <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">CARTÃO BENEFÍCIO (RCC)</h4>
                                    </div>
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
                                </div>
                              );
                            })()}
                          </>
                        ) : clientType === 'governo_pi' ? (
                          <>
                            {/* Governo PI */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
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
                                  {(() => {
                                    const ensureArray = (val: unknown): Lotacao[] => {
                                      if (!val) return [];
                                      if (Array.isArray(val)) return val as Lotacao[];
                                      return [val] as Lotacao[];
                                    };
                                    const lotacoes = ensureArray(activeReg.governo_pi_lotacoes);
                                    return lotacoes?.[0]?.orgao || "---";
                                  })()}
                                </p>
                              </div>
                            </div>

                            {/* Margens Grid PI - Side-by-side as shown in ACESSAR CLIENTE */}
                            {(() => {
                              const ensureArray = (val: unknown): Lotacao[] => {
                                if (!val) return [];
                                if (Array.isArray(val)) return val as Lotacao[];
                                return [val] as Lotacao[];
                              };
                              const lotacoes = ensureArray(activeReg.governo_pi_lotacoes);
                              const lotacao = lotacoes?.[0];
                              if (!lotacao) return (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dados de margens não encontrados</p>
                                </div>
                              );
                              
                              const valConsig = lotacao.margem_disponivel_emprestimo ?? lotacao.margem_emprestimo_consignado ?? 0;
                              const valCard = lotacao.margem_cartao_consignado ?? 0;
                              const valBenef = lotacao.margem_cartao_beneficio ?? 0;

                              const isConsigAvailable = valConsig > 0;
                              const isCardAvailable = valCard > 0;
                              const isBenefAvailable = valBenef > 0;

                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  {/* Margem Disponível Empréstimo */}
                                  <div className={cn(
                                    "p-5 border rounded-2xl space-y-3",
                                    isConsigAvailable ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
                                  )}>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", isConsigAvailable ? "text-blue-600" : "text-red-600 truncate")}>
                                      MARGEM DISPONÍVEL EMPRÉSTIMO
                                    </p>
                                    <div className="flex flex-col">
                                      <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", isConsigAvailable ? "text-blue-700" : "text-red-700 font-bold")}>
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
                                    "p-5 border rounded-2xl space-y-3",
                                    isCardAvailable ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                                  )}>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", isCardAvailable ? "text-emerald-600" : "text-red-600 truncate")}>
                                      MARGEM CARTÃO CONSIGNADO
                                    </p>
                                    <div className="flex flex-col">
                                      <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", isCardAvailable ? "text-emerald-700" : "text-red-700 font-bold")}>
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
                                    "p-5 border rounded-2xl space-y-3",
                                    isBenefAvailable ? "bg-purple-50 border-purple-100" : "bg-red-50 border-red-100"
                                  )}>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", isBenefAvailable ? "text-purple-600" : "text-red-600 truncate")}>
                                      MARGEM CARTÃO BENEFÍCIO
                                    </p>
                                    <div className="flex flex-col">
                                      <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", isBenefAvailable ? "text-purple-700" : "text-red-700 font-bold")}>
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
                        ) : clientType === 'governo_ma' ? (
                          <>
                            {/* Governo MA */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.matricula}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase">{activeReg.vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.governo_ma_lotacoes?.[0]?.orgao || "---"}
                                </p>
                              </div>
                            </div>

                            {/* Margens Grid MA */}
                            {(() => {
                              const lotacao = activeReg.governo_ma_lotacoes?.[0];
                              if (!lotacao) return (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dados de margens não encontrados</p>
                                </div>
                              );
                              
                              const valConsig = lotacao.margem_emprestimo_consignado ?? 0;
                              const valCard = lotacao.margem_cartao_consignado ?? 0;
                              const valBenef = lotacao.margem_cartao_beneficio ?? 0;

                              const isConsigAvailable = valConsig > 0;
                              const isCardAvailable = valCard > 0;
                              const isBenefAvailable = valBenef > 0;

                              return (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  {/* Margem Empréstimo Consignado */}
                                  <div className={cn(
                                    "p-5 border rounded-2xl space-y-3",
                                    isConsigAvailable ? "bg-blue-50 border-blue-100" : "bg-red-50 border-red-100"
                                  )}>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", isConsigAvailable ? "text-blue-600" : "text-red-600 truncate")}>
                                      MARGEM EMPRÉSTIMO CONSIGNADO
                                    </p>
                                    <div className="flex flex-col">
                                      <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", isConsigAvailable ? "text-blue-700" : "text-red-700 font-bold")}>
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
                                    "p-5 border rounded-2xl space-y-3",
                                    isCardAvailable ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                                  )}>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", isCardAvailable ? "text-emerald-600" : "text-red-600 truncate")}>
                                      MARGEM CARTÃO CONSIGNADO
                                    </p>
                                    <div className="flex flex-col">
                                      <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", isCardAvailable ? "text-emerald-700" : "text-red-700 font-bold")}>
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
                                    "p-5 border rounded-2xl space-y-3",
                                    isBenefAvailable ? "bg-purple-50 border-purple-100" : "bg-red-50 border-red-100"
                                  )}>
                                    <p className={cn("text-[10px] font-bold uppercase tracking-widest", isBenefAvailable ? "text-purple-600" : "text-red-600 truncate")}>
                                      MARGEM CARTÃO BENEFÍCIO
                                    </p>
                                    <div className="flex flex-col">
                                      <p className={cn("text-2xl font-black tracking-tighter leading-none mb-1", isBenefAvailable ? "text-purple-700" : "text-red-700 font-bold")}>
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
                        ) : clientType === 'governo_rr' ? (
                          <>
                            {/* Governo Roraima */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.matricula || "---"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase">
                                  {activeReg.regime_contratacao || "---"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Origem</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.governo_rr_instituidores?.[0]?.origem || "---"}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-6">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-cyan-600 rounded-full"></div>
                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Margens de Crédito</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className={cn(
                                  "p-6 border rounded-2xl transition-all",
                                  (Number(activeReg.governo_rr_instituidores?.[0]?.margem_emprestimo) || 0) > 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                                )}>
                                  <p className={cn("text-[10px] font-black uppercase tracking-widest mb-2", (Number(activeReg.governo_rr_instituidores?.[0]?.margem_emprestimo) || 0) > 0 ? "text-emerald-700" : "text-red-700")}>
                                    Margem Empréstimo
                                  </p>
                                  <p className={cn("text-2xl font-black", (Number(activeReg.governo_rr_instituidores?.[0]?.margem_emprestimo) || 0) > 0 ? "text-emerald-700" : "text-red-700")}>
                                    {formatCurrency(Number(activeReg.governo_rr_instituidores?.[0]?.margem_emprestimo))}
                                  </p>
                                </div>
                                <div className={cn(
                                  "p-6 border rounded-2xl transition-all",
                                  (Number(activeReg.governo_rr_instituidores?.[0]?.margem_cartao) || 0) > 0 ? "bg-cyan-50 border-cyan-200" : "bg-red-50 border-red-200"
                                )}>
                                  <p className={cn("text-[10px] font-black uppercase tracking-widest mb-2", (Number(activeReg.governo_rr_instituidores?.[0]?.margem_cartao) || 0) > 0 ? "text-cyan-700" : "text-red-700")}>
                                    Margem Cartão
                                  </p>
                                  <p className={cn("text-2xl font-black", (Number(activeReg.governo_rr_instituidores?.[0]?.margem_cartao) || 0) > 0 ? "text-cyan-700" : "text-red-700")}>
                                    {formatCurrency(Number(activeReg.governo_rr_instituidores?.[0]?.margem_cartao))}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : clientType === 'governo_rj' ? (
                          <>
                            {/* Governo Rio de Janeiro */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.matricula || "---"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.orgao || "---"}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : clientType === 'prefeitura_santo_andre' ? (
                          <>
                            {/* Prefeitura de Santo André */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.matricula || "---"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.orgao || "---"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.vinculo || "---"}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-6 mt-6">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-violet-600 rounded-full"></div>
                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Margens de Cartão</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-[#F1F5F9] border border-slate-200 rounded-2xl">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Margem Bruta Cartão</p>
                                  <p className="text-xl font-black text-slate-900">
                                    {formatCurrency(Number(activeReg.margem_bruta_cartao))}
                                  </p>
                                </div>
                                {(() => {
                                  const isPositive = (Number(activeReg.margem_liquida_cartao) || 0) > 0;
                                  return (
                                    <div className={cn(
                                      "p-4 border rounded-2xl",
                                      isPositive ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                                    )}>
                                      <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isPositive ? "text-emerald-700" : "text-red-700")}>Margem Líquida Cartão</p>
                                      <p className={cn("text-xl font-black", isPositive ? "text-emerald-700" : "text-red-700")}>
                                        {formatCurrency(Number(activeReg.margem_liquida_cartao))}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-500" : "bg-red-500")}></div>
                                        <p className={cn("text-[8px] font-bold uppercase tracking-widest", isPositive ? "text-emerald-600" : "text-red-600")}>
                                          {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </>
                        ) : clientType === 'prefeitura_contagem' ? (
                          <>
                            {/* Prefeitura de Contagem */}
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.matricula || "---"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.orgao || "---"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Admissão</p>
                                <p className="text-[12px] font-bold text-slate-900">
                                  {activeReg.data_de_admissao ? new Date(activeReg.data_de_admissao as string).toLocaleDateString('pt-BR') : "---"}
                                </p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Situação</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.situacao_funcional || "---"}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-6 mt-6">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-rose-600 rounded-full"></div>
                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Margens de Empréstimo & Cartão</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-[#F1F5F9] border border-slate-200 rounded-2xl">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Margem Empréstimo Bruta</p>
                                  <p className="text-xl font-black text-slate-900">
                                    {formatCurrency(Number(activeReg.margem_emprestimo_bruta))}
                                  </p>
                                </div>
                                {(() => {
                                  const isPositive = (Number(activeReg.margem_emprestimo_liquida) || 0) > 0;
                                  return (
                                    <div className={cn(
                                      "p-4 border rounded-2xl",
                                      isPositive ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                                    )}>
                                      <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isPositive ? "text-emerald-700" : "text-red-700")}>Margem Empréstimo Líquida</p>
                                      <p className={cn("text-xl font-black", isPositive ? "text-emerald-700" : "text-red-700")}>
                                        {formatCurrency(Number(activeReg.margem_emprestimo_liquida))}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-500" : "bg-red-500")}></div>
                                        <p className={cn("text-[8px] font-bold uppercase tracking-widest", isPositive ? "text-emerald-600" : "text-red-600")}>
                                          {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}

                                <div className="p-4 bg-[#F1F5F9] border border-slate-200 rounded-2xl">
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Margem Cartão Bruta</p>
                                  <p className="text-xl font-black text-slate-900">
                                    {formatCurrency(Number(activeReg.margem_cartao_bruta))}
                                  </p>
                                </div>
                                {(() => {
                                  const isPositive = (Number(activeReg.margem_cartao_liquida) || 0) > 0;
                                  return (
                                    <div className={cn(
                                      "p-4 border rounded-2xl",
                                      isPositive ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                                    )}>
                                      <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isPositive ? "text-emerald-700" : "text-red-700")}>Margem Cartão Líquida</p>
                                      <p className={cn("text-xl font-black", isPositive ? "text-emerald-700" : "text-red-700")}>
                                        {formatCurrency(Number(activeReg.margem_cartao_liquida))}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-500" : "bg-red-500")}></div>
                                        <p className={cn("text-[8px] font-bold uppercase tracking-widest", isPositive ? "text-emerald-600" : "text-red-600")}>
                                          {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </>
                        ) : clientType === 'governo_mg' ? (
                          <>
                            {/* Governo de Minas Gerais */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Matrícula</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.matricula || "---"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Órgão</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.orgao || "---"}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-6 mt-6">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-3.5 bg-amber-500 rounded-full"></div>
                                <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Margens de Empréstimo & Benefício</h4>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {(() => {
                                  const isPositive = (Number(activeReg.margem_emprestimo) || 0) > 0;
                                  return (
                                    <div className={cn(
                                      "p-4 border rounded-2xl",
                                      isPositive ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                                    )}>
                                      <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isPositive ? "text-emerald-700" : "text-red-700")}>Margem Empréstimo</p>
                                      <p className={cn("text-xl font-black", isPositive ? "text-emerald-700" : "text-red-700")}>
                                        {formatCurrency(Number(activeReg.margem_emprestimo))}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-500" : "bg-red-500")}></div>
                                        <p className={cn("text-[8px] font-bold uppercase tracking-widest", isPositive ? "text-emerald-600" : "text-red-600")}>
                                          {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {(() => {
                                  const isPositive = (Number(activeReg.margem_beneficio) || 0) > 0;
                                  return (
                                    <div className={cn(
                                      "p-4 border rounded-2xl",
                                      isPositive ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                                    )}>
                                      <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", isPositive ? "text-emerald-700" : "text-red-700")}>Margem Benefício</p>
                                      <p className={cn("text-xl font-black", isPositive ? "text-emerald-700" : "text-red-700")}>
                                        {formatCurrency(Number(activeReg.margem_beneficio))}
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-2">
                                        <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-500" : "bg-red-500")}></div>
                                        <p className={cn("text-[8px] font-bold uppercase tracking-widest", isPositive ? "text-emerald-600" : "text-red-600")}>
                                          {isPositive ? "DISPONÍVEL" : "INDISPONÍVEL"}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </>
                        ) : null}
                      </CardContent>
                    </Card>

                    {/* Contratos Section (SIAPE) */}
                    {clientType === 'siape' && (
                      <div className="space-y-10 pt-4">
                        {/* Contratos de Empréstimo */}
                        {(() => {
                          const contracts = (activeReg.itens_credito as Contract[] || []);
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

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Cartão Consignado Section */}
                          {(() => {
                            const contracts = (activeReg.itens_credito as Contract[] || []);
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
                            const contracts = (activeReg.itens_credito as Contract[] || []);
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
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
