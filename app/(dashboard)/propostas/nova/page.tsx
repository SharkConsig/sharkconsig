"use client"

import { useState, Suspense, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Header } from "@/components/layout/header"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { 
  ChevronLeft, 
  ChevronDown,
  Search,
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
  Loader2,
  UploadCloud,
  X
} from "lucide-react"
import { useAuth } from "@/context/auth-context"

function NewProposalForm() {
  const { isCorretor } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  
  const [dbConvenios, setDbConvenios] = useState<{id: string, nome: string}[]>([])
  const [dbBancos, setDbBancos] = useState<{id: string, nome: string}[]>([])
  const [dbOperacoes, setDbOperacoes] = useState<{id: string, nome: string}[]>([])
  interface ProdutoConfig {
    id: string
    nome_tabela: string | null
    prazo: number
    coeficiente: number
    percentual_producao: number
    convenio_id: string
    operacoes: string[]
    convenios: { nome: string } | null
  }

  const [dbProdutosConfigs, setDbProdutosConfigs] = useState<ProdutoConfig[]>([])
  const [selectedCoefValue, setSelectedCoefValue] = useState<number | null>(null)
  const [selectedProdPercent, setSelectedProdPercent] = useState<number | null>(null)

  const [selection, setSelection] = useState({
    convenio: "",
    convenioId: "",
    banco: "",
    bancoId: "",
    operacao: "",
    operacaoId: ""
  })

  const [isCoefDropdownOpen, setIsCoefDropdownOpen] = useState(false)
  const [coefSearchTerm, setCoefSearchTerm] = useState("")
  const coefDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (coefDropdownRef.current && !coefDropdownRef.current.contains(event.target as Node)) {
        setIsCoefDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        const [
          { data: convData, error: convErr },
          { data: bancoData, error: bancoErr },
          { data: operData, error: operErr }
        ] = await Promise.all([
          supabase.from('convenios').select('id, nome').eq('ativo', true).order('nome'),
          supabase.from('bancos').select('id, nome').eq('ativo', true).order('nome'),
          supabase.from('tipos_operacao').select('id, nome').eq('ativo', true).order('nome')
        ])

        if (convErr) throw convErr
        if (bancoErr) throw bancoErr
        if (operErr) throw operErr

        setDbConvenios(convData || [])
        setDbBancos(bancoData || [])
        setDbOperacoes(operData || [])
      } catch (error: unknown) {
        console.error("Erro ao buscar dados de configuração:", error)
        toast.error("Erro ao carregar opções de proposta")
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    async function loadTicketAttachments() {
      const idLead = searchParams.get("idLead")
      const origem = searchParams.get("origem")

      if (idLead && (origem === "chamado" || searchParams.has("idLead"))) {
        try {
          const { data: ticket, error } = await supabase
            .from('chamados')
            .select('*')
            .eq('id', idLead)
            .maybeSingle()

          if (ticket && !error) {
            setExistingAttachments({
              frente: ticket.arquivo_rg_frente || null,
              verso: ticket.arquivo_rg_verso || null,
              contracheque: ticket.arquivo_contracheque || null,
              extrato: ticket.arquivo_extrato || null,
              outros: ticket.arquivo_outros || null,
              outros_2: ticket.arquivo_outros_2 || null
            })
          }
        } catch (err) {
          console.error("Erro ao carregar anexos do chamado:", err)
        }
      }
    }
    loadTicketAttachments()
  }, [searchParams])

  // Fetch product configurations
  useEffect(() => {
    async function fetchConfigs() {
      try {
        const { data, error } = await supabase
          .from('produtos_config')
          .select(`
            id,
            nome_tabela,
            prazo,
            coeficiente,
            percentual_producao,
            convenio_id,
            operacoes,
            convenios (nome)
          `)
          .eq('ativo', true)

        if (error) throw error

        const filtered = data || []
        // Optional: filter by selected operation ID if it exists in the array
        // and bank/convention if they are set, but the request says "todas"
        /*
        if (selection.bancoId) {
          filtered = filtered.filter(config => config.banco_id === selection.bancoId)
        }
        if (selection.operacaoId) {
          filtered = filtered.filter(config => 
            config.operacoes && config.operacoes.includes(selection.operacaoId)
          )
        }
        if (selection.convenioId) {
          filtered = filtered.filter(config => config.convenio_id === selection.convenioId)
        }
        */

        setDbProdutosConfigs(filtered)
      } catch (err) {
        console.error("Erro ao buscar tabelas de regras:", err)
      }
    }
    fetchConfigs()
  }, []) // Fetch once on mount or when needed, request says "todas as regras"
  
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
    tel_1: searchParams.get("tel1") || "",
    tel_2: searchParams.get("tel2") || "",
    tel_3: searchParams.get("tel3") || "",
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
    valor_producao_corretor: "",
    observacoes: ""
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSearchingCEP, setIsSearchingCEP] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    frente: null,
    verso: null,
    contracheque: null,
    extrato: null,
    outros: null,
    outros_2: null
  })
  const [existingAttachments, setExistingAttachments] = useState<{ [key: string]: string | null }>({
    frente: null,
    verso: null,
    contracheque: null,
    extrato: null,
    outros: null,
    outros_2: null
  })
  const [pastedImages, setPastedImages] = useState<File[]>([])

  const fileRefs = {
    frente: useRef<HTMLInputElement>(null),
    verso: useRef<HTMLInputElement>(null),
    contracheque: useRef<HTMLInputElement>(null),
    extrato: useRef<HTMLInputElement>(null),
    outros: useRef<HTMLInputElement>(null),
    outros_2: useRef<HTMLInputElement>(null)
  }

  const handleSearchCEP = async () => {
    console.log("handleSearchCEP called. Current CEP:", formData.cep);
    const cep = formData.cep.replace(/\D/g, "")
    if (cep.length !== 8) {
      console.warn("Invalid CEP length:", cep.length);
      toast.error("Por favor, informe um CEP válido com 8 dígitos.")
      return
    }

    setIsSearchingCEP(true)
    const loadingToast = toast.loading("Buscando endereço...")
    
    try {
      console.log("Fetching from ViaCEP:", cep);
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json()
      console.log("ViaCEP response data:", data);

      if (data.erro) {
        toast.error("CEP não encontrado.", { id: loadingToast })
      } else {
        setFormData(prev => ({
          ...prev,
          endereco: data.logradouro || prev.endereco,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          uf: data.uf || prev.uf
        }))
        toast.success("Endereço preenchido com sucesso!", { id: loadingToast })
      }
    } catch (error) {
      console.error("Erro ao buscar CEP:", error)
      toast.error("Erro ao conectar com o serviço de CEP.", { id: loadingToast })
    } finally {
      setIsSearchingCEP(false)
    }
  }

  const handleFileClick = (ref: React.RefObject<HTMLInputElement | null>) => {
    ref.current?.click()
  }

  const handleFileChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFiles(prev => ({ ...prev, [field]: file }))
    // If a new file is uploaded, clear the existing attachment for that slot
    setExistingAttachments(prev => ({ ...prev, [field]: null }))
  }

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const fullPath = `${path}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('propostas-attachments')
      .upload(fullPath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage
      .from('propostas-attachments')
      .getPublicUrl(fullPath)

    return data.publicUrl
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const file = new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type });
          files.push(file);
        }
      }
    }
    if (files.length > 0) {
      setPastedImages(prev => [...prev, ...files]);
      toast.success(`${files.length} imagem(ns) colada(s) do clipboard`);
    }
  };

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
      } catch (err: unknown) {
        console.error("Erro ao gerar ID de Lead:", err)
      }
    }
    generateLeadId()
  }, [searchParams])

  const handleSubmit = async (targetStatus?: string) => {
    if (!selection.convenio || !selection.banco || !selection.operacao) {
      toast.error("Por favor, selecione o convênio, banco e tipo de operação.")
      return
    }

    if (!formData.nome || !formData.cpf || !formData.matricula) {
      toast.error("Preencha os campos obrigatórios (Matrícula, CPF e Nome).")
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading("Salvando proposta e anexos...")

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não autenticado")

      // Upload de arquivos
      const fileUrls: { [key: string]: string | null } = {
        frente: null,
        verso: null,
        contracheque: null,
        extrato: null,
        outros: null,
        outros_2: null
      };

      for (const [key, file] of Object.entries(selectedFiles)) {
        if (file) {
          try {
            const url = await uploadFile(file, `${user.id}/${Date.now()}`);
            fileUrls[key] = url;
          } catch (uploadErr: unknown) {
            const err = uploadErr as { message?: string };
            console.error(`Erro ao enviar arquivo ${key}:`, err);
            throw new Error(`Falha no upload do arquivo ${key}: ${err.message || 'Erro desconhecido'}`);
          }
        }
      }

      // Upload de imagens coladas (screenshots)
      const pastedUrls = [];
      if (pastedImages.length > 0) {
        for (const file of pastedImages) {
          try {
            const url = await uploadFile(file, `pasted/${user.id}/${Date.now()}`);
            pastedUrls.push(url);
          } catch (err: unknown) {
            console.error("Erro ao subir imagem colada:", err);
          }
        }
      }

      // Se houver imagens coladas, adiciona às observações
      let finalObservations = formData.observacoes;
      if (pastedUrls.length > 0) {
        finalObservations += "\n\n--- IMAGENS EM ANEXO ---\n" + pastedUrls.map((url, i) => `![Print ${i+1}](${url})`).join("\n");
      }

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

      const currentStatus = targetStatus || 'AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO'

      const { error } = await supabase.from('propostas').upsert({
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
        status: currentStatus,
        naturalidade: formData.naturalidade,
        uf_naturalidade: formData.uf_naturalidade,
        identidade: formData.identidade,
        orgao_emissor: formData.orgao_emissor,
        uf_emissao: formData.uf_emissao,
        data_emissao: formatDate(formData.data_emissao),
        nome_pai: formData.nome_pai,
        nome_mae: formData.nome_mae,
        tel_residencial_1: formData.tel_1,
        tel_residencial_2: formData.tel_2,
        tel_comercial: formData.tel_3,
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
        observacoes: finalObservations,
        arquivo_rg_frente: fileUrls.frente || existingAttachments.frente,
        arquivo_rg_verso: fileUrls.verso || existingAttachments.verso,
        arquivo_contracheque: fileUrls.contracheque || existingAttachments.contracheque,
        arquivo_extrato: fileUrls.extrato || existingAttachments.extrato,
        arquivo_outros: fileUrls.outros || existingAttachments.outros,
        arquivo_outros_2: fileUrls.outros_2 || existingAttachments.outros_2,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id_lead' })

      if (error) throw error

      toast.dismiss(loadingToast)
      toast.success("Proposta salva com sucesso!")
      router.push("/propostas")
    } catch (err: unknown) {
      console.error("Erro ao salvar proposta:", JSON.stringify(err, null, 2))
      console.log("Detalhes do erro:", err)
      toast.dismiss(loadingToast)
      const error = err as { message?: string; error_description?: string }
      const message = error?.message || error?.error_description || "Erro ao salvar proposta."
      toast.error(message)
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
          .select('numero_matricula, data_nascimento, nome, telefone_1, telefone_2, telefone_3')
          .eq('cpf', formData.cpf.replace(/\D/g, ""))
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!error && data) {
          setFormData(prev => ({ 
            ...prev, 
            matricula: prev.matricula || data.numero_matricula || "",
            nascimento: prev.nascimento || (data.data_nascimento ? format(new Date(data.data_nascimento), "dd/MM/yyyy") : ""),
            nome: prev.nome || data.nome || "",
            tel_1: prev.tel_1 || data.telefone_1 || "",
            tel_2: prev.tel_2 || data.telefone_2 || "",
            tel_3: prev.tel_3 || data.telefone_3 || ""
          }))
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes do cliente:", error)
      }
    }
    fetchClientDetails()
  }, [formData.cpf])

  // Helper to convert DD/MM/YYYY to YYYY-MM-DD for native input
  const toInputDate = (val: string) => {
    if (!val || !val.includes('/')) return val;
    const [d, m, y] = val.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  };

  // Helper to convert YYYY-MM-DD to DD/MM/YYYY for state
  const fromInputDate = (val: string) => {
    if (!val || !val.includes('-')) return val;
    const [y, m, d] = val.split('-');
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  };

  const handleFormChange = (field: string, value: string) => {
    let newValue = value
    
    // CEP formatting (00000-000)
    if (field === "cep") {
      const digits = value.replace(/\D/g, "")
      if (digits.length <= 8) {
        if (digits.length > 5) {
          newValue = `${digits.substring(0, 5)}-${digits.substring(5, 8)}`
        } else {
          newValue = digits
        }
      } else {
        return // Reject values longer than 8 digits
      }
    }

    // Currency fields formatting
    if (["valor_parcela", "valor_operacao_operacional", "valor_cliente_operacional", "margem_utilizada", "valor_producao_corretor"].includes(field)) {
      const digits = value.replace(/\D/g, "")
      if (digits) {
        const amount = parseFloat(digits) / 100
        newValue = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(amount)
      } else {
        newValue = ""
      }
    }

    // Date fields formatting (DD/MM/AAAA)
    if (["nascimento", "data_emissao"].includes(field)) {
      const digits = value.replace(/\D/g, "")
      if (digits.length <= 8) {
        if (digits.length > 4) {
          newValue = `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4, 8)}`
        } else if (digits.length > 2) {
          newValue = `${digits.substring(0, 2)}/${digits.substring(2, 4)}`
        } else {
          newValue = digits
        }
      } else {
        return // Reject values longer than 8 digits
      }
    }
    // Phone fields formatting
    if (["tel_1", "tel_2", "tel_3"].includes(field)) {
      const digits = value.replace(/\D/g, "")
      if (digits.length <= 11) {
        if (digits.length > 2) {
          const part1 = digits.substring(0, 2)
          const part2 = digits.substring(2, 7)
          const part3 = digits.substring(7, 11)
          newValue = `(${part1}) ${part2}${part3 ? "-" + part3 : ""}`
        } else if (digits.length > 0) {
          newValue = `(${digits}`
        }
      } else {
        return // Reject values longer than 11 digits
      }
    }

    setFormData(prev => {
      const updated = { ...prev, [field]: newValue }

      // Se o CPF mudar, podemos tentar limpar ou reagir se necessário
      if (field === "cpf") {
        // ... ja tratado no useEffect
      }

      // Sync parcel with margin
      if (field === "margem_utilizada") {
        updated.valor_parcela = newValue
      } else if (field === "valor_parcela") {
        updated.margem_utilizada = newValue
      }

      // Auto-calculations check
      if ((field === "margem_utilizada" || field === "valor_parcela") && selectedCoefValue) {
        const rawMargem = (field === "margem_utilizada" ? newValue : updated.margem_utilizada).replace(/\D/g, "")
        if (rawMargem) {
          const margemValue = parseFloat(rawMargem) / 100
          const valorCliente = margemValue / selectedCoefValue
          updated.valor_cliente_operacional = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorCliente)
          
          // Re-calculate production if percent is available
          if (selectedProdPercent) {
            const valorProducao = (valorCliente * selectedProdPercent) / 100
            updated.valor_producao_corretor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorProducao)
          }
        } else {
          updated.valor_cliente_operacional = ""
          updated.valor_producao_corretor = ""
        }
      }

      if (field === "valor_cliente_operacional" && selectedProdPercent) {
        const rawValue = newValue.replace(/\D/g, "")
        if (rawValue) {
          const valorCliente = parseFloat(rawValue) / 100
          const valorProducao = (valorCliente * selectedProdPercent) / 100
          updated.valor_producao_corretor = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorProducao)
        } else {
          updated.valor_producao_corretor = ""
        }
      }

      return updated
    })
  }

  const nextStep = () => setStep(prev => prev + 1)
  const prevStep = () => setStep(prev => prev - 1)

  const handleSelect = (key: string, id: string, name: string) => {
    setSelection(prev => ({ 
      ...prev, 
      [key]: name,
      [`${key}Id`]: id
    }))
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
              key={c.id}
              onClick={() => handleSelect("convenio", c.id, c.nome)}
              className="w-full h-8 px-4 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[9px] font-extrabold text-[#1A2B49] transition-all uppercase tracking-wider shadow-sm leading-tight"
            >
              {c.nome}
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
              key={b.id}
              onClick={() => handleSelect("banco", b.id, b.nome)}
              className="w-full h-9 px-6 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[10px] font-extrabold text-[#1A2B49] transition-all uppercase tracking-wider leading-tight shadow-sm"
            >
              {b.nome}
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
              key={o.id}
              onClick={() => handleSelect("operacao", o.id, o.nome)}
              className="w-full h-9 px-6 bg-[#E9EAEB] hover:bg-[#DDE0E2] border border-slate-200 rounded-lg text-[10px] font-extrabold text-[#1A2B49] transition-all uppercase tracking-wider leading-tight shadow-sm"
            >
              {o.nome}
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
              <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">ID Lead</label>
              <span className="block text-xl font-black text-slate-900 tracking-tight py-1">
                {formData.idLead}
              </span>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Origem do Cliente</label>
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
              <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Matrícula <span className="text-red-500">*</span></label>
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
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">CPF</label>
                <Input 
                  value={formData.cpf}
                  onChange={(e) => handleFormChange("cpf", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Nome</label>
                <Input 
                  value={formData.nome}
                  onChange={(e) => handleFormChange("nome", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Data de Nascimento</label>
                <div className="relative">
                  <Input 
                    type="date"
                    value={toInputDate(formData.nascimento)}
                    onChange={(e) => handleFormChange("nascimento", fromInputDate(e.target.value))}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors px-3 text-[11px] font-normal text-slate-600 appearance-none" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Naturalidade</label>
                <Input 
                  value={formData.naturalidade}
                  onChange={(e) => handleFormChange("naturalidade", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">UF Naturalidade</label>
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
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Identidade</label>
                <Input 
                  value={formData.identidade}
                  onChange={(e) => handleFormChange("identidade", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Órgão Emissor</label>
                <Input 
                  value={formData.orgao_emissor}
                  onChange={(e) => handleFormChange("orgao_emissor", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">UF Emissão</label>
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
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Data de Emissão</label>
                <div className="relative">
                  <Input 
                    type="date"
                    value={toInputDate(formData.data_emissao)}
                    onChange={(e) => handleFormChange("data_emissao", fromInputDate(e.target.value))}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors px-3 text-[11px] font-normal text-slate-600 appearance-none" 
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Nome do Pai</label>
                <Input 
                  value={formData.nome_pai}
                  onChange={(e) => handleFormChange("nome_pai", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Nome da Mãe</label>
                <Input 
                  value={formData.nome_mae}
                  onChange={(e) => handleFormChange("nome_mae", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Telefone 1</label>
                <Input 
                  value={formData.tel_1}
                  onChange={(e) => handleFormChange("tel_1", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Telefone 2</label>
                <Input 
                  value={formData.tel_2}
                  onChange={(e) => handleFormChange("tel_2", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Telefone 3</label>
                <Input 
                  value={formData.tel_3}
                  onChange={(e) => handleFormChange("tel_3", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">CEP</label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.cep}
                    onChange={(e) => handleFormChange("cep", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearchCEP();
                      }
                    }}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                    placeholder="00000-000"
                  />
                  <button 
                    type="button" 
                    disabled={isSearchingCEP}
                    onClick={handleSearchCEP}
                    className="text-[10px] font-bold text-primary italic whitespace-nowrap hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isSearchingCEP ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    Buscar CEP
                  </button>
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Endereço</label>
                <Input 
                  value={formData.endereco}
                  onChange={(e) => handleFormChange("endereco", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Número</label>
                <Input 
                  value={formData.numero}
                  onChange={(e) => handleFormChange("numero", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Complemento</label>
                <Input 
                  value={formData.complemento}
                  onChange={(e) => handleFormChange("complemento", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Bairro</label>
                <Input 
                  value={formData.bairro}
                  onChange={(e) => handleFormChange("bairro", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Cidade</label>
                <Input 
                  value={formData.cidade}
                  onChange={(e) => handleFormChange("cidade", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">UF</label>
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
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Banco</label>
                <Input 
                  value={formData.banco_cliente}
                  onChange={(e) => handleFormChange("banco_cliente", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">CHAVE PIX</label>
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
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Conta</label>
                <Input 
                  value={formData.conta}
                  onChange={(e) => handleFormChange("conta", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Agência</label>
                <Input 
                  value={formData.agencia}
                  onChange={(e) => handleFormChange("agencia", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">DV</label>
                <Input 
                  value={formData.dv}
                  onChange={(e) => handleFormChange("dv", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Tipo de Conta</label>
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
            {!isCorretor && (
              <div className="bg-[#FEFCE8] border border-amber-100 rounded-xl p-8 space-y-6">
                <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-900">Operacional:</span> Preencha os campos abaixo em caso de divergência nos valores informados pelo corretor do valores do banco. Salvar valor operacional atualizará somente os campos abaixo.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Parcela</label>
                    <Input 
                      value={formData.valor_parcela}
                      onChange={(e) => handleFormChange("valor_parcela", e.target.value)}
                      className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                      placeholder="R$ 0,00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Operação</label>
                    <Input 
                      value={formData.valor_operacao_operacional}
                      onChange={(e) => handleFormChange("valor_operacao_operacional", e.target.value)}
                      className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                      placeholder="R$ 0,00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Cliente</label>
                    <Input 
                      value={formData.valor_cliente_operacional}
                      onChange={(e) => handleFormChange("valor_cliente_operacional", e.target.value)}
                      className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                      placeholder="R$ 0,00" 
                    />
                  </div>
                  <Button 
                    onClick={handleSubmit} 
                    className="h-9 bg-[#171717] hover:bg-[#171717]/90 text-white w-12 p-0 shadow-lg shadow-slate-200"
                  >
                    <Save className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Margem Utilizada</label>
                <Input 
                  value={formData.margem_utilizada}
                  onChange={(e) => handleFormChange("margem_utilizada", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                  placeholder="R$ 0,00" 
                />
              </div>
              <div className="space-y-2 relative" ref={coefDropdownRef}>
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Coeficiente e Prazo</label>
                <div 
                  className={cn(
                    "h-9 px-4 rounded-md border border-slate-800 bg-[#171717] flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 transition-all",
                    isCoefDropdownOpen && "ring-2 ring-primary/20 border-primary"
                  )}
                  onClick={() => setIsCoefDropdownOpen(!isCoefDropdownOpen)}
                >
                  <span className="text-[13px] font-medium text-white truncate">
                    {formData.coeficiente_prazo || "Selecione uma tabela"}
                  </span>
                  <ChevronDown className={cn("w-4 h-4 text-white/70 transition-transform", isCoefDropdownOpen && "rotate-180")} />
                </div>

                {isCoefDropdownOpen && (
                  <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl z-[50] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col max-h-[300px]">
                    {/* Search Input */}
                    <div className="p-2 border-b border-slate-50 bg-slate-50/50 sticky top-0 z-10">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                          autoFocus
                          type="text"
                          placeholder="Buscar tabela..."
                          className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                          value={coefSearchTerm}
                          onChange={(e) => setCoefSearchTerm(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto custom-scrollbar p-1">
                      {dbProdutosConfigs.filter(config => {
                        const searchStr = `${config.nome_tabela || ''} ${config.prazo || ''} ${config.coeficiente || ''} ${config.convenios?.nome || ''}`.toLowerCase()
                        return searchStr.includes(coefSearchTerm.toLowerCase())
                      }).length > 0 ? (
                        dbProdutosConfigs
                          .filter(config => {
                            const searchStr = `${config.nome_tabela || ''} ${config.prazo || ''} ${config.coeficiente || ''} ${config.convenios?.nome || ''}`.toLowerCase()
                            return searchStr.includes(coefSearchTerm.toLowerCase())
                          })
                          .map((config) => {
                            const label = config.nome_tabela || `${config.convenios?.nome || 'Tabela'} - ${config.prazo}x ${config.coeficiente}`
                            return (
                              <div
                                key={config.id}
                                onClick={() => {
                                  handleFormChange("coeficiente_prazo", label)
                                  setSelectedCoefValue(config.coeficiente)
                                  setSelectedProdPercent(config.percentual_producao)
                                  
                                  // Auto-calculate Valor Cliente (Margin / Coef)
                                  let currentValorCliente = 0
                                  if (formData.margem_utilizada && config.coeficiente) {
                                    const rawMargem = formData.margem_utilizada.replace(/\D/g, "")
                                    const margemValue = parseFloat(rawMargem) / 100
                                    currentValorCliente = margemValue / config.coeficiente
                                    const formattedCliente = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentValorCliente)
                                    handleFormChange("valor_cliente_operacional", formattedCliente)
                                  } else if (formData.valor_cliente_operacional) {
                                    currentValorCliente = parseFloat(formData.valor_cliente_operacional.replace(/\D/g, "")) / 100
                                  }

                                  // Auto-calculate production value based on Valor Cliente
                                  if (currentValorCliente && config.percentual_producao) {
                                    const valorProducao = (currentValorCliente * config.percentual_producao) / 100
                                    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorProducao)
                                    handleFormChange("valor_producao_corretor", formatted)
                                  }

                                  setIsCoefDropdownOpen(false)
                                  setCoefSearchTerm("")
                                }}
                                className={cn(
                                  "px-3 py-2.5 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer flex flex-col gap-0.5",
                                  formData.coeficiente_prazo === label 
                                    ? "bg-primary text-white" 
                                    : "text-slate-600 hover:bg-slate-50"
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{label}</span>
                                  {formData.coeficiente_prazo === label && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className={cn(
                                  "text-[9px] font-medium lowercase tracking-normal",
                                  formData.coeficiente_prazo === label ? "text-white/80" : "text-slate-400"
                                )}>
                                  Prazo: {config.prazo}x | Coef: {config.coeficiente} | Prod: {config.percentual_producao}%
                                </span>
                              </div>
                            )
                          })
                      ) : (
                        <div className="px-3 py-4 text-center text-[10px] text-slate-400 italic">
                          Nenhuma tabela encontrada
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Produção</label>
                <Input 
                  value={formData.valor_producao_corretor}
                  onChange={(e) => handleFormChange("valor_producao_corretor", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                  placeholder="R$ 0,00" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Parcela</label>
                <Input 
                  value={formData.valor_parcela}
                  onChange={(e) => handleFormChange("valor_parcela", e.target.value)}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                  placeholder="R$ 0,00" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Cliente</label>
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
                <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Observações</label>
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

          {/* Anexos */}
          <div className="space-y-8" onPaste={handlePaste}>
            <div className="text-center space-y-2">
              <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">ANEXAR DOCUMENTOS</h3>
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Anexar RG VERSO somente se não tiver enviado um CNH.</p>
              <p className="text-[10px] text-slate-400 max-w-2xl mx-auto">Você pode enviar arquivos com tamanho máximo de 20 mb dos tipos jpg, jpeg, png, webp, gif, pdf, doc, docx, ppt, pptx, pps, ppsx, odt, xls, xlsx.</p>
            </div>

            {Object.values(existingAttachments).some(val => !!val) && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-6">
                <p className="text-[10px] font-bold text-slate-700 uppercase mb-4 tracking-widest text-center">Arquivos Vinculados ao Chamado</p>
                <div className="flex flex-wrap justify-center gap-4">
                  {Object.entries(existingAttachments).map(([field, url]) => {
                    if (!url) return null;
                    const labels: { [key: string]: string } = {
                      frente: "RG/CNH Frente",
                      verso: "RG Verso",
                      contracheque: "Contra Cheque",
                      extrato: "Extrato",
                      outros: "Outros",
                      outros_2: "Outros 2"
                    };
                    return (
                      <div key={field} className="relative group">
                        <a 
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 px-4 py-2.5 bg-white border border-slate-200 rounded-lg hover:border-primary hover:shadow-md transition-all"
                        >
                          <Paperclip className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-bold text-slate-600 uppercase whitespace-nowrap">{labels[field]}</span>
                        </a>
                        <button 
                          onClick={() => setExistingAttachments(prev => ({ ...prev, [field]: null }))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover vínculo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {pastedImages.length > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-[10px] font-bold text-emerald-700 uppercase mb-3">Imagens Coladas ({pastedImages.length})</p>
                <div className="flex flex-wrap gap-3">
                  {pastedImages.map((file, idx) => (
                    <div key={idx} className="relative group">
                      <div className="w-20 h-20 rounded-lg border-2 border-emerald-200 overflow-hidden bg-white">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt="Pasted" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button 
                        onClick={() => setPastedImages(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                  { label: "RG ou CNH (FRENTE)", id: "frente", ref: fileRefs.frente },
                  { label: "RG (VERSO)", id: "verso", ref: fileRefs.verso },
                  { label: "CONTRA CHEQUE", id: "contracheque", ref: fileRefs.contracheque },
                  { label: "EXTRATO DE CONSIGNAÇÃO", id: "extrato", ref: fileRefs.extrato },
                  { label: "OUTROS", id: "outros", ref: fileRefs.outros },
                  { label: "OUTROS", id: "outros_2", ref: fileRefs.outros_2 }
              ].map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest block">
                    {field.label}
                  </label>
                  <div 
                    onClick={() => handleFileClick(field.ref)}
                    className={cn(
                      "w-full h-11 px-4 rounded-lg border text-[12px] flex items-center gap-3 cursor-pointer transition-all",
                      selectedFiles[field.id]
                        ? "bg-[#171717] text-white border-[#171717] shadow-lg"
                        : "bg-[#E8E8E8] text-slate-500 border-slate-100 hover:bg-slate-200"
                    )}
                  >
                    <UploadCloud className={cn("w-5 h-5", selectedFiles[field.id] ? "text-white" : "text-slate-400")} />
                    <span className={cn("truncate font-medium", selectedFiles[field.id] ? "text-white" : "text-slate-500")}>
                      {selectedFiles[field.id] 
                        ? selectedFiles[field.id]?.name 
                        : "Selecionar arquivo..."}
                    </span>
                    {selectedFiles[field.id] && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFiles(prev => ({ ...prev, [field.id]: null }));
                        }}
                        className="ml-auto p-1 hover:bg-white/10 rounded-full transition-colors"
                      >
                        <X className="w-4 h-4 text-white/70" />
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={field.ref} 
                    className="hidden" 
                    accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.ppt,.pptx,.pps,.ppsx,.odt,.xls,.xlsx"
                    onChange={(e) => handleFileChange(field.id, e)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-12">
            <Button 
              onClick={() => handleSubmit()}
              disabled={isSubmitting}
              className="w-full max-w-xs h-12 bg-primary text-white text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-slate-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
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

            <Button 
              onClick={() => handleSubmit('AGUARDANDO DIGITAÇÃO OPERACIONAL')}
              disabled={isSubmitting}
              className="w-full max-w-xs h-12 bg-[#00C853] hover:bg-[#00B248] text-white text-[12px] font-bold uppercase tracking-widest shadow-lg shadow-[#00C853]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ENVIANDO...
                </>
              ) : (
                "ENVIAR PROPOSTA PARA DIGITAÇÃO"
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
