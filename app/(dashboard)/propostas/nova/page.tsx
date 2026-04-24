"use client"

import { useState, Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { 
  ChevronLeft, 
  Calendar, 
  Save, 
  Bold,
  Italic,
  Underline,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Type,
  Link2,
  Image as ImageIcon,
  Paperclip,
  Loader2
} from "lucide-react"

function NewProposalForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  
  const [dbConvenios, setDbConvenios] = useState<string[]>([])
  const [dbBancos, setDbBancos] = useState<string[]>([])
  const [dbOperacoes, setDbOperacoes] = useState<string[]>([])

  const [selection, setSelection] = useState({
    convenio: "",
    banco: "",
    operacao: ""
  })

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const [
          { data: convData, error: convErr },
          { data: bancoData, error: bancoErr },
          { data: operData, error: operErr }
        ] = await Promise.all([
          supabase.from('convenios').select('nome').order('nome'),
          supabase.from('bancos').select('nome').order('nome'),
          supabase.from('tipos_operacao').select('nome').order('nome')
        ])

        if (convErr) throw convErr
        if (bancoErr) throw bancoErr
        if (operErr) throw operErr

        setDbConvenios(convData?.map(c => c.nome) || [])
        setDbBancos(bancoData?.map(b => b.nome) || [])
        setDbOperacoes(operData?.map(o => o.nome) || [])
      } catch (error: unknown) {
        console.error("Erro ao buscar dados de configuração:", error)
        toast.error("Erro ao carregar opções de proposta")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])
  
  const [formData, setFormData] = useState({
    nome: searchParams.get("nome") || "",
    cpf: searchParams.get("cpf") || "",
    nascimento: searchParams.get("nascimento") || "",
    idLead: searchParams.get("idLead") || "",
    origem: searchParams.get("origem") || "",
    matricula: "",
    naturalidade: "",
    uf_naturalidade: "",
    identidade: "",
    orgao_emissor: "",
    uf_emissao: "",
    data_emissao: "",
    nome_pai: "",
    nome_mae: "",
    tel_residencial_1: "",
    tel_residencial_2: "",
    tel_comercial: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    banco_cliente: "",
    chave_pix: "",
    conta: "",
    agencia: "",
    dv: "",
    tipo_conta: "",
    valor_parcela: "",
    valor_operacao_operacional: "",
    valor_cliente_operacional: "",
    margem_utilizada: "",
    coeficiente_prazo: "",
    observacoes: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchClientData() {
      if (!formData.cpf) return
      
      const cleanCPF = formData.cpf.replace(/\D/g, "")
      if (cleanCPF.length !== 11) return

      try {
        const { data } = await supabase
          .from('base_consulta_rapida')
          .select('numero_matricula')
          .eq('cpf', cleanCPF)
          .maybeSingle()

        if (data?.numero_matricula) {
          setFormData(prev => ({ ...prev, matricula: data.numero_matricula }))
        }
      } catch (err) {
        console.error("Erro ao buscar matrícula:", err)
      }
    }
    fetchClientData()
  }, [formData.cpf])

  useEffect(() => {
    async function generateLeadId() {
      // Only generate if we don't have one from searchParams
      if (searchParams.get("idLead")) return

      try {
        // Query both tables to find the maximum ID
        const [chamadosRes, propostasRes] = await Promise.all([
          supabase.from('chamados').select('id').order('id', { ascending: false }).limit(1),
          supabase.from('propostas').select('id_lead').order('id_lead', { ascending: false }).limit(1)
        ])

        let maxId = 0

        if (!chamadosRes.error && chamadosRes.data && chamadosRes.data.length > 0) {
          maxId = Math.max(maxId, parseInt(chamadosRes.data[0].id))
        }

        if (!propostasRes.error && propostasRes.data && propostasRes.data.length > 0) {
          maxId = Math.max(maxId, parseInt(propostasRes.data[0].id_lead))
        }

        // If no records found, start from 1
        const nextId = maxId > 0 ? maxId + 1 : 1
        setFormData(prev => ({ ...prev, idLead: nextId.toString() }))
      } catch (err) {
        console.error("Erro ao gerar ID de Lead:", err)
      }
    }
    generateLeadId()
  }, [searchParams])

  const handleSubmit = async () => {
    if (!selection.convenio || !selection.banco || !selection.operacao) {
      toast.error("Por favor, selecione o convênio, banco e tipo de operação.")
      return
    }

    if (!formData.nome || !formData.cpf || !formData.matricula) {
      toast.error("Preencha os campos obrigatórios (Matrícula, CPF e Nome).")
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading("Salvando proposta...")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const cleanMoney = (val: string) => {
        if (!val) return null
        const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".")
        return parseFloat(cleaned) || null
      }

      const formatDate = (val: string) => {
        if (!val) return null
        try {
          const parts = val.split('/')
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`
          }
          return val
        } catch {
          return null
        }
      }

      const { error } = await supabase.from('propostas').insert({
        id_lead: formData.idLead,
        cliente_cpf: formData.cpf.replace(/\D/g, ""),
        nome_cliente: formData.nome,
        data_nascimento: formatDate(formData.nascimento),
        origem: formData.origem,
        matricula: formData.matricula,
        convenio: selection.convenio,
        banco: selection.banco,
        tipo_operacao: selection.operacao,
        corretor_id: user?.id,
        status: 'AGUARDANDO DIGITAÇÃO',
        naturalidade: formData.naturalidade,
        uf_naturalidade: formData.uf_naturalidade,
        identidade: formData.identidade,
        orgao_emissor: formData.orgao_emissor,
        uf_emissao: formData.uf_emissao,
        data_emissao: formatDate(formData.data_emissao),
        nome_pai: formData.nome_pai,
        nome_mae: formData.nome_mae,
        tel_residencial_1: formData.tel_residencial_1,
        tel_residencial_2: formData.tel_residencial_2,
        tel_comercial: formData.tel_comercial,
        cep: formData.cep,
        endereco: formData.endereco,
        numero: formData.numero,
        complemento: formData.complemento,
        bairro: formData.bairro,
        cidade: formData.cidade,
        uf: formData.uf,
        banco_cliente: formData.banco_cliente,
        chave_pix: formData.chave_pix,
        conta: formData.conta,
        agencia: formData.agencia,
        dv: formData.dv,
        tipo_conta: formData.tipo_conta,
        valor_parcela: cleanMoney(formData.valor_parcela),
        valor_operacao_operacional: cleanMoney(formData.valor_operacao_operacional),
        valor_cliente_operacional: cleanMoney(formData.valor_cliente_operacional),
        margem_utilizada: cleanMoney(formData.margem_utilizada),
        coeficiente_prazo: formData.coeficiente_prazo,
        observacoes: formData.observacoes
      })

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success("Proposta cadastrada com sucesso!")
      router.push("/propostas")
    } catch (err: unknown) {
      console.error("Erro ao salvar proposta:", err)
      toast.dismiss(loadingToast)
      toast.error((err as Error).message || "Erro ao salvar proposta.")
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    async function fetchClientDetails() {
      if (!formData.cpf) return
      
      try {
        const { data, error } = await supabase
          .from('base_consulta_rapida')
          .select('numero_matricula, data_nascimento, nome, telefone_1')
          .eq('cpf', formData.cpf.replace(/\D/g, ""))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          setFormData(prev => ({ 
            ...prev, 
            matricula: prev.matricula || data.numero_matricula || "",
            nascimento: prev.nascimento || (data.data_nascimento ? format(new Date(data.data_nascimento), "dd/MM/yyyy") : ""),
            nome: prev.nome || data.nome || ""
          }))
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes do cliente:", error)
      }
    }
    fetchClientDetails()
  }, [formData.cpf])

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const nextStep = () => setStep(prev => prev + 1)
  const prevStep = () => setStep(prev => prev - 1)

  const handleSelect = (key: string, value: string) => {
    setSelection(prev => ({ ...prev, [key]: value }))
    nextStep()
  }

  const renderStep1 = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
        ESCOLHA O <span className="text-slate-900 font-extrabold">CONVÊNIO</span> QUE SERÁ UTILIZADO NO CONTRATO
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>
        ) : dbConvenios.length === 0 ? (
          <div className="col-span-full text-center text-slate-400 font-bold text-[11px] uppercase tracking-widest">Nenhum convênio cadastrado</div>
        ) : (
          dbConvenios.map(c => (
            <button
              key={c}
              onClick={() => handleSelect("convenio", c)}
              className="w-full h-8 px-4 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[9px] font-extrabold text-[#1A2B49] transition-all uppercase tracking-wider shadow-sm leading-tight"
            >
              {c}
            </button>
          ))
        )}
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-center gap-4 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={prevStep}
          className="absolute left-0 text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          ESCOLHA O <span className="text-slate-900 font-extrabold">BANCO DE EMPRÉSTIMO</span> QUE SERÁ UTILIZADO NO CONTRATO
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>
        ) : dbBancos.length === 0 ? (
          <div className="col-span-full text-center text-slate-400 font-bold text-[11px] uppercase tracking-widest">Nenhum banco cadastrado</div>
        ) : (
          dbBancos.map(b => (
            <button
              key={b}
              onClick={() => handleSelect("banco", b)}
              className="w-full h-9 px-6 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[10px] font-extrabold text-[#1A2B49] transition-all uppercase tracking-wider leading-tight shadow-sm"
            >
              {b}
            </button>
          ))
        )}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-center gap-4 relative">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={prevStep}
          className="absolute left-0 text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <h2 className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">
          ESCOLHA O <span className="text-slate-900 font-extrabold">TIPO DE OPERAÇÃO</span> DESEJADO
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>
        ) : dbOperacoes.length === 0 ? (
          <div className="col-span-full text-center text-slate-400 font-bold text-[11px] uppercase tracking-widest">Nenhum tipo de operação cadastrado</div>
        ) : (
          dbOperacoes.map(o => (
            <button
              key={o}
              onClick={() => handleSelect("operacao", o)}
              className="w-full h-9 px-6 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[10px] font-extrabold text-[#1A2B49] transition-all uppercase tracking-wider leading-tight shadow-sm"
            >
              {o}
            </button>
          ))
        )}
      </div>
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex flex-col items-center gap-4">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={prevStep}
          className="self-start text-slate-400 hover:text-primary font-bold text-[10px] uppercase tracking-widest"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Alterar Seleção
        </Button>
        <div className="flex flex-wrap justify-center gap-2 md:gap-8 items-center bg-white py-4 px-8 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Convênio</span>
            <span className="text-[11px] font-black text-[#1A2B49] uppercase">{selection.convenio}</span>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Banco</span>
            <span className="text-[11px] font-black text-[#1A2B49] uppercase">{selection.banco}</span>
          </div>
          <div className="h-8 w-px bg-slate-100 hidden md:block" />
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Operação</span>
            <span className="text-[11px] font-black text-[#1A2B49] uppercase leading-tight text-center md:text-left max-w-[300px]">{selection.operacao}</span>
          </div>
        </div>
      </div>

      <Card className="card-shadow border border-slate-200 bg-white">
        <CardContent className="p-10 space-y-16">
          {/* Top Fields */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID Lead</label>
              <Input 
                value={formData.idLead}
                readOnly
                className="h-9 border-none bg-transparent p-0 text-lg font-bold text-black/80 shadow-none focus-visible:ring-0 cursor-default" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Origem do Cliente</label>
              <select 
                value={formData.origem}
                onChange={(e) => handleFormChange("origem", e.target.value)}
                className="w-full h-9 px-4 rounded-md border border-slate-100 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Selecione</option>
                <option value="disparo">DISPARO</option>
                <option value="tráfego">TRÁFEGO</option>
                <option value="indicação">INDICAÇÃO</option>
                <option value="cliente da casa">CLIENTE DA CASA</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matrícula <span className="text-red-500">*</span></label>
              <Input 
                value={formData.matricula}
                onChange={(e) => handleFormChange("matricula", e.target.value)}
                className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
              />
            </div>
          </div>

          {/* Dados Pessoais */}
          <div className="space-y-10">
            <h3 className="text-center text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">DADOS PESSOAIS</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CPF</label>
                <Input 
                  value={formData.cpf}
                  onChange={(e) => handleFormChange("cpf", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome</label>
                <Input 
                  value={formData.nome}
                  onChange={(e) => handleFormChange("nome", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Nascimento</label>
                <div className="relative">
                  <Input 
                    value={formData.nascimento}
                    onChange={(e) => handleFormChange("nascimento", e.target.value)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors pr-10" 
                  />
                  <Calendar className="absolute right-3 top-2 w-5 h-5 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Naturalidade</label>
                <Input 
                  value={formData.naturalidade}
                  onChange={(e) => handleFormChange("naturalidade", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF Naturalidade</label>
                <select 
                  value={formData.uf_naturalidade}
                  onChange={(e) => handleFormChange("uf_naturalidade", e.target.value)}
                  className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Selecione</option>
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Identidade</label>
                <Input 
                  value={formData.identidade}
                  onChange={(e) => handleFormChange("identidade", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Órgão Emissor</label>
                <Input 
                  value={formData.orgao_emissor}
                  onChange={(e) => handleFormChange("orgao_emissor", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF Emissão</label>
                <select 
                  value={formData.uf_emissao}
                  onChange={(e) => handleFormChange("uf_emissao", e.target.value)}
                  className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Selecione</option>
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Data de Emissão</label>
                <div className="relative">
                  <Input 
                    value={formData.data_emissao}
                    onChange={(e) => handleFormChange("data_emissao", e.target.value)}
                    placeholder="DD/MM/AAAA"
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors pr-10" 
                  />
                  <Calendar className="absolute right-3 top-2 w-5 h-5 text-slate-400" />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome do Pai</label>
                <Input 
                  value={formData.nome_pai}
                  onChange={(e) => handleFormChange("nome_pai", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nome da Mãe</label>
                <Input 
                  value={formData.nome_mae}
                  onChange={(e) => handleFormChange("nome_mae", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone Residencial 1</label>
                <Input 
                  value={formData.tel_residencial_1}
                  onChange={(e) => handleFormChange("tel_residencial_1", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone Residencial 2</label>
                <Input 
                  value={formData.tel_residencial_2}
                  onChange={(e) => handleFormChange("tel_residencial_2", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Telefone Comercial</label>
                <Input 
                  value={formData.tel_comercial}
                  onChange={(e) => handleFormChange("tel_comercial", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CEP</label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.cep}
                    onChange={(e) => handleFormChange("cep", e.target.value)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                  />
                  <button type="button" className="text-[10px] font-bold text-primary italic whitespace-nowrap hover:underline">Buscar CEP</button>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Endereço</label>
                <Input 
                  value={formData.endereco}
                  onChange={(e) => handleFormChange("endereco", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Número</label>
                <Input 
                  value={formData.numero}
                  onChange={(e) => handleFormChange("numero", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Complemento</label>
                <Input 
                  value={formData.complemento}
                  onChange={(e) => handleFormChange("complemento", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bairro</label>
                <Input 
                  value={formData.bairro}
                  onChange={(e) => handleFormChange("bairro", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cidade</label>
                <Input 
                  value={formData.cidade}
                  onChange={(e) => handleFormChange("cidade", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UF</label>
                <select 
                  value={formData.uf}
                  onChange={(e) => handleFormChange("uf", e.target.value)}
                  className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Selecione</option>
                  {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Dados Bancários */}
          <div className="space-y-10">
            <h3 className="text-center text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">DADOS BANCÁRIOS</h3>
            
            {/* Primeira linha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Banco</label>
                <Input 
                  value={formData.banco_cliente}
                  onChange={(e) => handleFormChange("banco_cliente", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">CHAVE PIX</label>
                <Input 
                  value={formData.chave_pix}
                  onChange={(e) => handleFormChange("chave_pix", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
            </div>

            {/* Segunda linha */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Conta</label>
                <Input 
                  value={formData.conta}
                  onChange={(e) => handleFormChange("conta", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Agência</label>
                <Input 
                  value={formData.agencia}
                  onChange={(e) => handleFormChange("agencia", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">DV</label>
                <Input 
                  value={formData.dv}
                  onChange={(e) => handleFormChange("dv", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tipo de Conta</label>
                <select 
                  value={formData.tipo_conta}
                  onChange={(e) => handleFormChange("tipo_conta", e.target.value)}
                  className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Selecione</option>
                  <option value="corrente">CORRENTE</option>
                  <option value="poupanca">POUPANÇA</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dados da Operação */}
          <div className="space-y-10">
            <h3 className="text-center text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">DADOS DA OPERAÇÃO</h3>
            
            {/* Operacional Box */}
            <div className="bg-[#FEFCE8] border border-amber-100 rounded-xl p-8 space-y-6">
              <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-900">Operacional:</span> Preencha os campos abaixo em caso de divergência nos valores informados pelo corretor do valores do banco. Salvar valor operacional atualizará somente os campos abaixo.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parcela</label>
                  <Input 
                    value={formData.valor_parcela}
                    onChange={(e) => handleFormChange("valor_parcela", e.target.value)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                    placeholder="R$ 0,00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Operação</label>
                  <Input 
                    value={formData.valor_operacao_operacional}
                    onChange={(e) => handleFormChange("valor_operacao_operacional", e.target.value)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                    placeholder="R$ 0,00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Cliente</label>
                  <Input 
                    value={formData.valor_cliente_operacional}
                    onChange={(e) => handleFormChange("valor_cliente_operacional", e.target.value)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                    placeholder="R$ 0,00" 
                  />
                </div>
                <Button 
                  onClick={handleSubmit} 
                  className="h-9 bg-[#1A2B49] hover:bg-[#1A2B49]/90 text-white w-12 p-0 shadow-lg shadow-slate-200"
                >
                  <Save className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Margem Utilizada</label>
                <Input 
                  value={formData.margem_utilizada}
                  onChange={(e) => handleFormChange("margem_utilizada", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                  placeholder="R$ 0,00" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coeficiente e Prazo</label>
                <Input 
                  value={formData.coeficiente_prazo}
                  onChange={(e) => handleFormChange("coeficiente_prazo", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Parcela</label>
                <Input 
                  value={formData.valor_parcela}
                  onChange={(e) => handleFormChange("valor_parcela", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                  placeholder="R$ 0,00" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Valor Cliente</label>
                <Input 
                  value={formData.valor_cliente_operacional}
                  onChange={(e) => handleFormChange("valor_cliente_operacional", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                  placeholder="R$ 0,00" 
                />
              </div>
            </div>
          </div>

          {/* Outras Informações */}
          <div className="space-y-10">
            <h3 className="text-center text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">OUTRAS INFORMAÇÕES</h3>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Observações</label>
              <div className="border border-slate-100 rounded-lg overflow-hidden focus-within:border-primary transition-colors">
                <div className="bg-slate-50 border-b border-slate-200 p-2 flex flex-wrap gap-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Bold className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Italic className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Underline className="w-3.5 h-3.5" /></Button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Quote className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><AlignLeft className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><AlignCenter className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><AlignRight className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><List className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><ListOrdered className="w-4 h-4" /></Button>
                  <div className="w-px h-5 bg-slate-200 mx-0.5 self-center" />
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Type className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Link2 className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><ImageIcon className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-600 hover:bg-white"><Paperclip className="w-4 h-4" /></Button>
                </div>
                <textarea 
                  value={formData.observacoes}
                  onChange={(e) => handleFormChange("observacoes", e.target.value)}
                  className="w-full p-6 text-[14px] font-medium focus:outline-none min-h-[200px] bg-[#E8E8E8]" 
                  placeholder="Digite suas observações aqui..."
                />
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-12">
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full max-w-md h-12 bg-primary text-white text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  SALVANDO...
                </>
              ) : (
                "CADASTRAR PROPOSTA"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="flex-1 flex flex-col">
      <Header title="DIGITAR PROPOSTA" />
      
      <main className="flex-1 p-4 lg:p-8 bg-slate-50/50">
        <div className="max-w-[1400px] mx-auto w-full">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>
      </main>
    </div>
  )
}

export default function NewProposalPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center">Carregando...</div>}>
      <NewProposalForm />
    </Suspense>
  )
}
