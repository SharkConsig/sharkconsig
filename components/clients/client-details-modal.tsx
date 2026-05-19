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
  const [clientType, setClientType] = useState<'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | 'governo_rr' | null>(null)
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
            .select(`
              *,
              governo_sp_lotacoes (*)
            `)
            .eq('cliente_id', (govSpData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar identificações Governo SP:", idError)
        setRegistrations((idData as Registration[]) || [])
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
            .select(`
              *,
              prefeitura_sp_lotacoes (*)
            `)
            .eq('cliente_id', (pmspData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar identificações Prefeitura SP:", idError)
        setRegistrations((idData as Registration[]) || [])
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

        const { data: idData, error: idError } = await withRetry<Record<string, unknown>[] | null>(async () =>
          await supabase
            .from('governo_pi_identificacoes')
            .select(`
              *,
              governo_pi_lotacoes (*)
            `)
            .eq('cliente_id', (govPiData as ClientData).id)
        )

        if (idError) console.error("Erro ao buscar identificações Governo PI:", idError)
        setRegistrations((idData as Registration[]) || [])
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
        setRegistrations((idData as Registration[]) || [])
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
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Identificação</p>
                                <p className="text-[12px] font-bold text-slate-900">{activeReg.identificacao}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Vínculo</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase">{activeReg.tipo_vinculo || "NÃO INFORMADO"}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Nomeação</p>
                                <p className="text-[12px] font-bold text-slate-900">{formatDate(activeReg.data_nomeacao)}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lotação / Órgão</p>
                                <p className="text-[12px] font-bold text-slate-900 uppercase truncate">
                                  {activeReg.governo_sp_lotacoes?.[0]?.lotacao || activeReg.prefeitura_sp_lotacoes?.[0]?.lotacao || "---"}
                                </p>
                              </div>
                            </div>

                            {/* Margens Grid Gov SP / PMSP - Layout image.png */}
                            {(() => {
                              const lotacao = activeReg.governo_sp_lotacoes?.[0] || activeReg.prefeitura_sp_lotacoes?.[0];
                              if (!lotacao) return (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dados de lotação/margens não encontrados</p>
                                </div>
                              );
                              
                              const getUtilizedStatus = (bruta: number | null, liquida: number | null) => {
                                const b = bruta || 0;
                                const l = liquida || 0;
                                if (l <= 0) return "SIM";
                                if (l < b) return "PARCIAL";
                                return "NÃO";
                              };

                              const sections = [
                                { 
                                  title: "EMPRÉSTIMO CONSIGNADO",
                                  color: "bg-blue-500",
                                  items: [
                                    { label: "Bruta", value: lotacao.mb_consignacoes },
                                    { label: "Utilizada", type: 'status', bruta: lotacao.mb_consignacoes, liquida: lotacao.md_consignacoes },
                                    { label: "Líquida", value: lotacao.md_consignacoes, isLiquida: true }
                                  ]
                                },
                                { 
                                  title: "CARTÃO CONSIGNADO (RMC)",
                                  color: "bg-emerald-500",
                                  items: [
                                    { label: "Bruta", value: lotacao.mb_cartao_credito },
                                    { label: "Utilizada", type: 'status', bruta: lotacao.mb_cartao_credito, liquida: lotacao.md_cartao_credito },
                                    { label: "Líquida", value: lotacao.md_cartao_credito, isLiquida: true }
                                  ]
                                },
                                { 
                                  title: "CARTÃO BENEFÍCIO (RCC)",
                                  color: "bg-purple-500",
                                  items: [
                                    { label: "Bruta", value: lotacao.mb_cartao_beneficio },
                                    { label: "Utilizada", type: 'status', bruta: lotacao.mb_cartao_beneficio, liquida: lotacao.md_cartao_beneficio },
                                    { label: "Líquida", value: lotacao.md_cartao_beneficio, isLiquida: true }
                                  ]
                                }
                              ];

                              return (
                                <div className="space-y-8">
                                  {sections.map((section, sIdx) => (
                                    <div key={sIdx} className="space-y-4">
                                      <div className="flex items-center gap-2">
                                        <div className={cn("w-1 h-3.5 rounded-full", section.color)}></div>
                                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{section.title}</h4>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {section.items.map((item, iIdx) => {
                                          if (item.type === 'status') {
                                            const utilized = getUtilizedStatus(item.bruta || 0, item.liquida || 0);
                                            return (
                                              <div key={iIdx} className={cn(
                                                "p-4 border rounded-2xl",
                                                utilized === "SIM" ? "bg-red-50 border-red-200" : 
                                                utilized === "PARCIAL" ? "bg-[#f1f5f9] border-slate-200" : 
                                                "bg-emerald-50 border-emerald-200"
                                              )}>
                                                <p className={cn(
                                                  "text-[9px] font-bold uppercase tracking-widest mb-1",
                                                  utilized === "SIM" ? "text-red-700" : 
                                                  utilized === "PARCIAL" ? "text-slate-500" : 
                                                  "text-emerald-700"
                                                )}>{item.label}</p>
                                                <p className={cn(
                                                  "text-xl font-black",
                                                  utilized === "SIM" ? "text-red-700" : 
                                                  utilized === "PARCIAL" ? "text-[#1e293b]" : 
                                                  "text-emerald-700"
                                                )}>{utilized}</p>
                                              </div>
                                            );
                                          }

                                          const isPositive = (item.value || 0) > 0;
                                          const isLiquida = item.isLiquida;

                                          return (
                                            <div key={iIdx} className={cn(
                                              "p-4 border rounded-2xl",
                                              isLiquida 
                                                ? (isPositive ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")
                                                : "bg-[#f8fafc] border-slate-200"
                                            )}>
                                              <p className={cn(
                                                "text-[9px] font-bold uppercase tracking-widest mb-1",
                                                isLiquida 
                                                  ? (isPositive ? "text-emerald-700" : "text-red-700") 
                                                  : "text-slate-500"
                                              )}>{item.label}</p>
                                              <p className={cn(
                                                "text-xl font-black",
                                                isLiquida 
                                                  ? (isPositive ? "text-emerald-700" : "text-red-700")
                                                  : "text-slate-900"
                                              )}>{formatCurrency(item.value)}</p>
                                              {isLiquida && (
                                                <div className="flex items-center gap-1.5 mt-2">
                                                  <div className={cn("w-1.5 h-1.5 rounded-full", isPositive ? "bg-emerald-500" : "bg-red-500")}></div>
                                                  <p className={cn("text-[8px] font-bold uppercase tracking-widest", isPositive ? "text-emerald-600" : "text-red-600")}>
                                                    {isPositive ? "Disponível" : "Indisponível"}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()}
                          </>
                        ) : clientType === 'governo_pi' || clientType === 'governo_ma' ? (
                          <>
                            {/* Governo PI ou MA */}
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
                                  {activeReg.governo_pi_lotacoes?.[0]?.orgao || activeReg.governo_ma_lotacoes?.[0]?.orgao || "---"}
                                </p>
                              </div>
                            </div>

                            {/* Margens Grid PI / MA - Layout image.png */}
                            {(() => {
                              const lotacao = activeReg.governo_pi_lotacoes?.[0] || activeReg.governo_ma_lotacoes?.[0];
                              if (!lotacao) return (
                                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Dados de margens não encontrados</p>
                                </div>
                              );
                              
                              const isConsigAvailable = (lotacao.margem_emprestimo_consignado || 0) > 0;
                              const isCardAvailable = (lotacao.margem_cartao_consignado || 0) > 0;
                              const isBenefAvailable = (lotacao.margem_cartao_beneficio || 0) > 0;

                              const sections = [
                                {
                                  title: "EMPRÉSTIMO CONSIGNADO",
                                  color: "bg-blue-500",
                                  value: lotacao.margem_emprestimo_consignado,
                                  isAvailable: isConsigAvailable,
                                  bgColor: "bg-[#f0f7ff]",
                                  borderColor: "border-blue-100",
                                  textColor: "text-blue-600",
                                  mainTextColor: "text-blue-700",
                                  dotColor: "bg-blue-500"
                                },
                                {
                                  title: "CARTÃO CONSIGNADO (RMC)",
                                  color: "bg-emerald-500",
                                  value: lotacao.margem_cartao_consignado,
                                  isAvailable: isCardAvailable,
                                  bgColor: "bg-[#f0fff4]",
                                  borderColor: "border-emerald-100",
                                  textColor: "text-emerald-600",
                                  mainTextColor: "text-emerald-700",
                                  dotColor: "bg-emerald-500"
                                },
                                {
                                  title: "CARTÃO BENEFÍCIO (RCC)",
                                  color: "bg-purple-500",
                                  value: lotacao.margem_cartao_beneficio,
                                  isAvailable: isBenefAvailable,
                                  bgColor: "bg-[#fdf4ff]",
                                  borderColor: "border-purple-100",
                                  textColor: "text-purple-600",
                                  mainTextColor: "text-purple-700",
                                  dotColor: "bg-purple-500"
                                }
                              ];

                              return (
                                <div className="space-y-8">
                                  {sections.map((section, sIdx) => (
                                    <div key={sIdx} className="space-y-4">
                                      <div className="flex items-center gap-2">
                                        <div className={cn("w-1 h-3.5 rounded-full", section.color)}></div>
                                        <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{section.title}</h4>
                                      </div>
                                      <div className="grid grid-cols-1">
                                        <div className={cn(
                                          "p-5 border rounded-2xl transition-all",
                                          section.isAvailable ? `${section.bgColor} ${section.borderColor}` : "bg-red-50 border-red-100"
                                        )}>
                                          <p className={cn("text-[9px] font-black uppercase tracking-widest mb-2", section.isAvailable ? section.textColor : "text-red-600")}>
                                            Margem Disponível
                                          </p>
                                          <p className={cn("text-2xl font-black", section.isAvailable ? section.mainTextColor : "text-red-700")}>
                                            {formatCurrency(section.value)}
                                          </p>
                                          <div className="flex items-center gap-1.5 mt-2">
                                            <div className={cn("w-1.5 h-1.5 rounded-full", section.isAvailable ? section.dotColor : "bg-red-500")}></div>
                                            <p className={cn("text-[9px] font-black uppercase tracking-widest", section.isAvailable ? section.textColor : "text-red-600")}>
                                              {section.isAvailable ? "Disponível" : "Indisponível"}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
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
