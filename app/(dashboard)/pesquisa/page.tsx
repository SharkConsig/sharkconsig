"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { Landmark, Search, Eye, EyeOff, MessageSquare, FileEdit, MessageCircle } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { translateOrgao, ORGAOS_MAPPING } from "@/lib/orgaos-mapping"
import { getContractTypeInfo } from "@/lib/contratos-mapping"
import { supabase } from "@/lib/supabase"
import { withRetry } from "@/lib/utils"

function LoanRow({ loan }: { loan: any }) {
  const [taxa, setTaxa] = useState(1.5);
  const i = taxa / 100;
  const n = loan.prazo;
  const p = loan.parcela;
  // Formula: SD = P * [(1 - (1 + i)^-n) / i]
  const saldo = p * ((1 - Math.pow(1 + i, -n)) / i);

  return (
    <tr className="group bg-blue-50/30 hover:bg-blue-50/50 transition-colors">
      <td className="py-4 pl-4 text-[12px] font-bold text-slate-700 rounded-l-xl border-y border-l border-blue-100">{loan.banco}</td>
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

export default function SearchClientPage() {
  const router = useRouter()
  const { } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showProfile, setShowProfile] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showSensitiveData, setShowSensitiveData] = useState(false)
  
  const [client, setClient] = useState<any>(null)
  const [clientType, setClientType] = useState<'siape' | 'governo_sp' | 'prefeitura_sp' | null>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [activeRegIndex, setActiveRegIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery) return
    
    setIsLoading(true)
    setError(null)
    setShowProfile(false)
    setShowSensitiveData(false)
    setClient(null)
    setClientType(null)
    setRegistrations([])
    setActiveRegIndex(0)

    try {
      const digits = searchQuery.replace(/\D/g, "")
      if (!digits) {
        setError("Por favor, insira um CPF ou telefone.")
        setIsLoading(false)
        return
      }
      
      // 1. Try search in SIAPE Clients
      let siapeQuery = supabase.from('clientes').select('*')
      if (digits.length <= 11) {
        const paddedCpf = digits.padStart(11, '0')
        siapeQuery = siapeQuery.or(`cpf.eq.${paddedCpf},telefone_1.eq.${digits},telefone_2.eq.${digits},telefone_3.eq.${digits}`)
      } else {
        siapeQuery = siapeQuery.or(`telefone_1.eq.${digits},telefone_2.eq.${digits},telefone_3.eq.${digits}`)
      }

      const { data: siapeData } = await withRetry<any>(async () => await siapeQuery.maybeSingle())

      if (siapeData) {
        setClient(siapeData)
        setClientType('siape')

        // 2. Search SIAPE Registrations
        const { data: regData, error: regError } = await withRetry<any>(async () => 
          await supabase
            .from('matriculas')
            .select(`
              *,
              instituidores (
                *,
                itens_credito (*)
              )
            `)
            .eq('cliente_cpf', siapeData.cpf)
        )

        if (regError) console.error("Erro ao buscar matrículas SIAPE:", regError)
        setRegistrations(regData || [])
        setShowProfile(true)
        return
      }

      // 2. Try search in Governo SP Clients
      let govSpQuery = supabase.from('governo_sp_clientes').select('*')
      if (digits.length <= 11) {
        const paddedCpf = digits.padStart(11, '0')
        govSpQuery = govSpQuery.or(`cpf.eq.${paddedCpf},telefone_1.eq.${digits},telefone_2.eq.${digits},telefone_3.eq.${digits}`)
      } else {
        govSpQuery = govSpQuery.or(`telefone_1.eq.${digits},telefone_2.eq.${digits},telefone_3.eq.${digits}`)
      }

      const { data: govSpData } = await withRetry<any>(async () => await govSpQuery.maybeSingle())

      if (govSpData) {
        setClient(govSpData)
        setClientType('governo_sp')

        // Search Governo SP Identificações and Lotações
        const { data: idData, error: idError } = await withRetry<any>(async () =>
          await supabase
            .from('governo_sp_identificacoes')
            .select(`
              *,
              governo_sp_lotacoes (*)
            `)
            .eq('cliente_id', govSpData.id)
        )

        if (idError) console.error("Erro ao buscar identificações Governo SP:", idError)
        setRegistrations(idData || [])
        setShowProfile(true)
        return
      }

      // 3. Try search in Prefeitura SP Clients
      let pmspQuery = supabase.from('prefeitura_sp_clientes').select('*')
      if (digits.length <= 11) {
        const paddedCpf = digits.padStart(11, '0')
        pmspQuery = pmspQuery.or(`cpf.eq.${paddedCpf},telefone_1.eq.${digits},telefone_2.eq.${digits},telefone_3.eq.${digits}`)
      } else {
        pmspQuery = pmspQuery.or(`telefone_1.eq.${digits},telefone_2.eq.${digits},telefone_3.eq.${digits}`)
      }

      const { data: pmspData } = await withRetry<any>(async () => await pmspQuery.maybeSingle())

      if (pmspData) {
        setClient(pmspData)
        setClientType('prefeitura_sp')

        // Search Prefeitura SP Identificações and Lotações
        const { data: idData, error: idError } = await withRetry<any>(async () =>
          await supabase
            .from('prefeitura_sp_identificacoes')
            .select(`
              *,
              prefeitura_sp_lotacoes (*)
            `)
            .eq('cliente_id', pmspData.id)
        )

        if (idError) console.error("Erro ao buscar identificações Prefeitura SP:", idError)
        setRegistrations(idData || [])
        setShowProfile(true)
        return
      }

      setError("Cliente não encontrado.")
    } catch (err: any) {
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
                return reg.instituidores.map((inst: any) => ({
                  ...reg,
                  ...inst,
                  id: reg.id, // Keep registration ID as the main ID for the tab
                  instituidor_id: inst.id, // Keep track of the specific instituidor ID
                  currentInstituidor: inst.nome ? (isPension ? inst.nome : translateOrgao(inst.nome)) : (isPension ? "" : translateOrgao(reg.orgao || "")),
                  currentInstituidorId: inst.id
                }));
              });

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
                            "p-3.5 border rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]",
                            (Number(allRegs[activeRegIndex].margem_35) || 0) > 0 ? "bg-emerald-100/50 border-emerald-200" : "bg-red-100/50 border-red-200"
                          )}>
                            <div>
                              <p className={cn(
                                "text-[9px] font-bold uppercase tracking-widest",
                                (Number(allRegs[activeRegIndex].margem_35) || 0) > 0 ? "text-emerald-700/60" : "text-red-700/60"
                              )}>Margem 35%</p>
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
                          <div className="p-3.5 bg-orange-100/50 border border-orange-200 rounded-xl space-y-0.5 flex flex-col justify-between min-h-[82px]">
                            <div>
                              <p className="text-[9px] font-bold text-orange-700/60 uppercase tracking-widest">Soma das Margens Líquidas</p>
                              <p className="text-[17px] font-bold text-orange-700 tracking-tight">
                                {formatCurrency(
                                  (Number(allRegs[activeRegIndex].margem_35) || 0) + 
                                  (Number(allRegs[activeRegIndex].liquida_5) || 0) + 
                                  (Number(allRegs[activeRegIndex].beneficio_liquida_5) || 0)
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 invisible">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                              <span className="text-[8px] font-bold uppercase tracking-widest">STATUS</span>
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
                                    {filteredContracts.filter((c: any) => getContractTypeInfo(c.tipo).category === "EMPRESTIMO").length > 0 ? (
                                      filteredContracts
                                        .filter((c: any) => getContractTypeInfo(c.tipo).category === "EMPRESTIMO")
                                        .map((loan: any, lIdx: number) => (
                                          <LoanRow key={lIdx} loan={{
                                            banco: loan.banco,
                                            orgao: loan.orgao,
                                            contrato: loan.numero_contrato,
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
                          const filteredContracts = currentReg.itens_credito || [];

                          const consignadoCards = filteredContracts.filter((c: any) => getContractTypeInfo(c.tipo).category === "CARTAO_CONSIGNADO");
                          const beneficioCards = filteredContracts.filter((c: any) => getContractTypeInfo(c.tipo).category === "CARTAO_BENEFICIO");

                          return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                              <div className="space-y-8">
                                <div className="flex items-center gap-3">
                                  <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                                  <h3 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">Cartão Consignado</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                  {consignadoCards.length > 0 ? (
                                    consignadoCards.map((card: any, cIdx: number) => {
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
                                    beneficioCards.map((card: any, bIdx: number) => {
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

                        {/* Footer Buttons */}
                        <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
                          <Button 
                            onClick={() => {
                              // Formatar CPF sem máscara para o chamado
                              const rawCpf = client.cpf || "";
                              const formattedCpf = rawCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");

                              // Determinar Convênio baseado na origem (SIAPE = FEDERAL)
                              const orgao = allRegs[activeRegIndex].orgao;
                              const determinedConvenio = (orgao && ORGAOS_MAPPING[orgao]) ? "FEDERAL" : "OUTROS";

                              const params = new URLSearchParams({
                                nome: client.nome || "NOME NÃO INFORMADO",
                                cpf: formattedCpf,
                                tel1: unmaskPhone(client.telefone_1),
                                tel2: unmaskPhone(client.telefone_2),
                                tel3: unmaskPhone(client.telefone_3),
                                margem: formatCurrency(allRegs[activeRegIndex].margem_35),
                                liquida5: formatCurrency(allRegs[activeRegIndex].liquida_5),
                                beneficio5: formatCurrency(allRegs[activeRegIndex].beneficio_liquida_5),
                                convenio: determinedConvenio
                              });
                              router.push(`/chamados/novo?${params.toString()}`);
                            }}
                            className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                          >
                            <MessageSquare className="w-4 h-4 mr-2" />
                            Abrir Chamado
                          </Button>
                          <Button 
                            onClick={() => {
                              const params = new URLSearchParams({
                                nome: client.nome || "NOME NÃO INFORMADO",
                                cpf: client.cpf,
                                nascimento: formatDate(client.data_nascimento),
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

                          {/* Footer Buttons for Governo SP */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
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
                                  convenio: "GOVERNO SP"
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            <Button 
                              onClick={() => {
                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: client.cpf,
                                  nascimento: formatDate(client.data_nascimento),
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

                          {/* Footer Buttons for PMSP */}
                          <div className="flex flex-col md:flex-row items-center justify-end gap-4 pt-10 border-t border-slate-50">
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
                                  convenio: "PREFEITURA SP"
                                });
                                router.push(`/chamados/novo?${params.toString()}`);
                              }}
                              className="w-full md:w-auto h-11 px-12 text-[12px] font-bold uppercase tracking-widest bg-[#171717] hover:bg-black text-white shadow-xl shadow-slate-200 transition-all rounded-lg"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Abrir Chamado
                            </Button>
                            <Button 
                              onClick={() => {
                                const params = new URLSearchParams({
                                  nome: client.nome || "NOME NÃO INFORMADO",
                                  cpf: client.cpf,
                                  nascimento: formatDate(client.data_nascimento),
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
      </div>
    </div>
  )
}
