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
import { Loader2, Eye, EyeOff, MessageCircle, Landmark } from "lucide-react"
import { cn, withRetry } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { translateOrgao } from "@/lib/orgaos-mapping"

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

  return (
    <tr className="group bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
      <td className="py-3 pl-4 text-[11px] font-bold text-slate-700 rounded-l-xl border-y border-l border-blue-100">{loan.banco}</td>
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
  numero_contrato: string;
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

interface ClientDetailsModalProps {
  cpf: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ClientDetailsModal({ cpf, isOpen, onClose }: ClientDetailsModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  const [client, setClient] = useState<ClientData | null>(null)
  const [clientType, setClientType] = useState<'siape' | 'governo_sp' | 'prefeitura_sp' | 'governo_pi' | 'governo_ma' | null>(null)
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
    }
  }, [isOpen, cpf, fetchClientData])

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
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">PESSOAL</Badge>
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

            {/* Matrículas Tabs */}
            {clientType === 'siape' && registrations.length > 0 && (() => {
              const allRegs = registrations.flatMap(reg => {
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

              if (allRegs.length === 0) return null;

              const activeReg = allRegs[activeRegIndex];

              return (
                <div className="space-y-4">
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
                        Matrícula {reg.numero_matricula}
                      </Button>
                    ))}
                  </div>

                  <div className="space-y-6">
                    {/* Info Card */}
                    <Card className="card-shadow bg-white border border-slate-200">
                      <CardContent className="p-6 space-y-8">
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

                        {/* Margens Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Saldo 70%</p>
                            <p className="text-xl font-black text-slate-900">{formatCurrency(activeReg.saldo_70)}</p>
                          </div>
                          <div className={cn(
                            "p-4 border rounded-xl",
                            (activeReg.margem_35 || 0) > 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
                          )}>
                            <p className={cn("text-[9px] font-bold uppercase tracking-widest mb-1", (activeReg.margem_35 || 0) > 0 ? "text-emerald-700" : "text-red-700")}>Margem 35%</p>
                            <p className={cn("text-xl font-black", (activeReg.margem_35 || 0) > 0 ? "text-emerald-700" : "text-red-700")}>{formatCurrency(activeReg.margem_35)}</p>
                          </div>
                          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                            <p className="text-[9px] font-bold text-orange-700 uppercase tracking-widest mb-1">Soma Líquidas</p>
                            <p className="text-xl font-black text-orange-700">
                              {formatCurrency(
                                (Number(activeReg.margem_35) || 0) + 
                                (Number(activeReg.liquida_5) || 0) + 
                                (Number(activeReg.beneficio_liquida_5) || 0)
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Bruta 5%</p>
                            <p className="text-[14px] font-bold text-slate-700">{formatCurrency(activeReg.bruta_5)}</p>
                          </div>
                          <div className={cn(
                            "p-3 border rounded-lg",
                            getUtilizadaStatus(activeReg.bruta_5, activeReg.liquida_5) === "SIM" ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                          )}>
                            <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5 opacity-60">Líquida 5%</p>
                            <p className="text-[14px] font-bold">{formatCurrency(activeReg.liquida_5)}</p>
                          </div>
                          <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Bef. Bruta 5%</p>
                            <p className="text-[14px] font-bold text-slate-700">{formatCurrency(activeReg.beneficio_bruta_5)}</p>
                          </div>
                          <div className={cn(
                            "p-3 border rounded-lg",
                            getUtilizadaStatus(activeReg.beneficio_bruta_5, activeReg.beneficio_liquida_5) === "SIM" ? "bg-red-50 border-red-100 text-red-700" : "bg-emerald-50 border-emerald-100 text-emerald-700"
                          )}>
                            <p className="text-[8px] font-bold uppercase tracking-widest mb-0.5 opacity-60">Bef. Líquida 5%</p>
                            <p className="text-[14px] font-bold">{formatCurrency(activeReg.beneficio_liquida_5)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Contratos Table */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-primary" />
                        <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Contratos e Cartões</h4>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                          <thead>
                            <tr>
                              <th className="pb-2 pl-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Banco</th>
                              <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Tipo</th>
                              <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Contrato</th>
                              <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Parcela</th>
                              <th className="pb-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Prazo</th>
                              <th className="pb-2 pr-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Saldo Est.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(activeReg.itens_credito as Contract[] || []).length > 0 ? (
                              (activeReg.itens_credito as Contract[]).map((contract, cIdx) => (
                                <LoanRow key={cIdx} loan={{
                                  banco: contract.banco,
                                  orgao: contract.orgao,
                                  contrato: contract.numero_contrato,
                                  parcela: contract.parcela,
                                  prazo: contract.prazo,
                                  tipo: contract.tipo
                                }} />
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} className="py-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white rounded-xl border border-dashed border-slate-200">
                                  Nenhum contrato encontrado
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Other types of clients would go here, maybe generic cards for now */}
            {clientType !== 'siape' && registrations.length > 0 && (
               <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
                 <p className="text-slate-500 font-bold uppercase text-[11px] tracking-widest">Base de dados: {clientType?.toUpperCase()}</p>
                 <p className="text-slate-400 text-[10px] mt-2">Os dados detalhados para esta base estão sendo implementados.</p>
               </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
