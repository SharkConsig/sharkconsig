"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Eye, History, FileText, Save, Loader2, Search, ChevronDown, UploadCloud, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { FichaPropostaModal } from "./ficha-proposta-modal"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { format } from "date-fns"
import { useAuth } from "@/context/auth-context"
import { useRef } from "react"
interface HistoryItem {
  id: string;
  created_at: string;
  status_anterior: string | null;
  status_novo: string;
  descricao: string;
  observacoes: string;
  tipo: string;
  alteracoes: Record<string, { old: string | number; new: string | number }> | null;
  usuario_id: string;
}

interface Proposal {
  id: number
  id_lead: string
  corretor_id?: string
  ade?: string
  nome_corretor?: string
  equipe?: string
  nome_cliente: string
  cliente_cpf: string
  convenio: string
  banco: string
  tipo_operacao: string
  status: string
  resposta_corretor?: string
  obs_corretor?: string
  obs_operacional?: string
  observacoes?: string
  valor_base?: number
  valor_parcela?: number
  updated_at?: string
  created_at: string
  data_nascimento?: string
  origem?: string
  matricula?: string
  naturalidade?: string
  uf_naturalidade?: string
  identidade?: string
  orgao_emissor?: string
  uf_emissao?: string
  data_emissao?: string
  nome_pai?: string
  nome_mae?: string
  tel_residencial_1?: string
  tel_residencial_2?: string
  tel_comercial?: string
  email?: string
  cep?: string
  endereco?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  uf?: string
  banco_cliente?: string
  chave_pix?: string
  conta?: string
  agencia?: string
  dv?: string
  tipo_conta?: string
  valor_operacao_operacional?: number
  valor_producao_operacional?: number
  valor_producao?: number
  valor_operacao?: number
  valor_cliente?: number
  valor_cliente_operacional?: number
  margem_utilizada?: number
  coeficiente_prazo?: string
  valor_producao_corretor?: number
  arquivo_rg_frente?: string
  arquivo_rg_verso?: string
  arquivo_contracheque?: string
  arquivo_extrato?: string
  arquivo_outros?: string
  arquivo_outros_2?: string
}

export function ProposalDetailsAccordion({ proposal, onRefresh: _onRefresh }: { proposal: Proposal; onRefresh: () => void }) {
  const { perfil: user } = useAuth()
  const isCorretor = user?.role === 'Corretor'
  const isFinancialEditor = ['Operacional', 'Administrativo', 'Desenvolvedor', 'Admin'].includes(user?.role || '')
  
  const canEditFields = !isCorretor || [
    'AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO',
    'COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO'
  ].includes(proposal.status);

  const canAttach = !isCorretor || [
    'AGUARDANDO SOLICITAÇÃO DE DIGITAÇÃO',
    'COM INCONSISTÊNCIA / PENDÊNCIA PARA DIGITAÇÃO',
    'COM INCONSISTÊNCIA NO BANCO'
  ].includes(proposal.status);

  const canSave = canEditFields || canAttach;

  const [activeTab, setActiveTab] = useState<"visualizar" | "historico">("visualizar")
  const [isFichaModalOpen, setIsFichaModalOpen] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [usersMap, setUsersMap] = useState<Map<string, string>>(new Map())
  const [isSaving, setIsSaving] = useState(false)
  
  const [dbProdutosConfigs, setDbProdutosConfigs] = useState<Record<string, unknown>[]>([])
  const [selectedCoefValue, setSelectedCoefValue] = useState<number | null>(null)
  const [selectedProdPercent, setSelectedProdPercent] = useState<number | null>(null)
  const [isCoefDropdownOpen, setIsCoefDropdownOpen] = useState(false)
  const [coefSearchTerm, setCoefSearchTerm] = useState("")
  const coefDropdownRef = useRef<HTMLDivElement>(null)

  const [selection] = useState({
    convenio: proposal.convenio || "",
    banco: proposal.banco || "",
    operacao: proposal.tipo_operacao || ""
  })

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await fetch('/api/usuarios')
        if (response.ok) {
          const users = await response.json()
          const map = new Map<string, string>()
          users.forEach((u: { id: string; nome?: string; username?: string }) => map.set(u.id, u.nome || u.username || 'Sem Nome'))
          setUsersMap(map)
        }
      } catch (err) {
        console.warn("Erro ao buscar usuários para histórico:", err)
      }
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    async function fetchHistory() {
      if (activeTab !== "historico") return
      setIsLoadingHistory(true)
      try {
        const { data, error } = await supabase
          .from('historico_propostas')
          .select(`
            id,
            created_at,
            status_anterior,
            status_novo,
            descricao,
            observacoes,
            tipo,
            alteracoes,
            usuario_id
          `)
          .eq('proposta_id_lead', proposal.id_lead)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.warn("Aviso na busca de histórico:", error.message)
          setHistory([])
        } else {
          setHistory(data || [])
        }
      } catch (err) {
        console.error("Exceção ao carregar histórico:", err)
        setHistory([])
      } finally {
        setIsLoadingHistory(false)
      }
    }
    fetchHistory()
  }, [activeTab, proposal.id_lead])

  const [formData, setFormData] = useState({
    nome: proposal.nome_cliente || "",
    cpf: proposal.cliente_cpf || "",
    nascimento: proposal.data_nascimento ? format(new Date(proposal.data_nascimento), "dd/MM/yyyy") : "",
    idLead: proposal.id_lead || "",
    origem: proposal.origem || "",
    matricula: proposal.matricula || "",
    naturalidade: proposal.naturalidade || "",
    uf_naturalidade: proposal.uf_naturalidade || "",
    identidade: proposal.identidade || "",
    orgao_emissor: proposal.orgao_emissor || "",
    uf_emissao: proposal.uf_emissao || "",
    data_emissao: proposal.data_emissao ? format(new Date(proposal.data_emissao), "dd/MM/yyyy") : "",
    nome_pai: proposal.nome_pai || "",
    nome_mae: proposal.nome_mae || "",
    tel_1: proposal.tel_residencial_1 || "",
    tel_2: proposal.tel_residencial_2 || "",
    tel_3: proposal.tel_comercial || "",
    email: proposal.email || "",
    cep: proposal.cep || "",
    endereco: proposal.endereco || "",
    numero: proposal.numero || "",
    complemento: proposal.complemento || "",
    bairro: proposal.bairro || "",
    cidade: proposal.cidade || "",
    uf: proposal.uf || "",
    banco_cliente: proposal.banco_cliente || "",
    chave_pix: proposal.chave_pix || "",
    conta: proposal.conta || "",
    agencia: proposal.agencia || "",
    dv: proposal.dv || "",
    tipo_conta: proposal.tipo_conta || "",
    valor_parcela: (proposal.valor_parcela !== undefined && proposal.valor_parcela !== null) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.valor_parcela) : "",
    valor_operacao_operacional: (proposal.valor_operacao_operacional !== undefined && proposal.valor_operacao_operacional !== null) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.valor_operacao_operacional) : "",
    valor_cliente_operacional: (proposal.valor_cliente_operacional !== undefined && proposal.valor_cliente_operacional !== null) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.valor_cliente_operacional) : "",
    valor_producao_operacional: (proposal.valor_producao_operacional !== undefined && proposal.valor_producao_operacional !== null) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.valor_producao_operacional) : "",
    margem_utilizada: (proposal.margem_utilizada !== undefined && proposal.margem_utilizada !== null) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.margem_utilizada) : "",
    coeficiente_prazo: proposal.coeficiente_prazo || "",
    valor_producao: (proposal.valor_producao !== undefined && proposal.valor_producao !== null) ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proposal.valor_producao) : "",
    observacoes: proposal.observacoes || ""
  })

  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File | null }>({
    frente: null,
    verso: null,
    contracheque: null,
    extrato: null,
    outros: null,
    outros_2: null
  })

  const [existingAttachments] = useState<{ [key: string]: string | null }>({
    frente: (proposal.arquivo_rg_frente as string) || null,
    verso: (proposal.arquivo_rg_verso as string) || null,
    contracheque: (proposal.arquivo_contracheque as string) || null,
    extrato: (proposal.arquivo_extrato as string) || null,
    outros: (proposal.arquivo_outros as string) || null,
    outros_2: (proposal.arquivo_outros_2 as string) || null
  })

  const getFileName = (url: string) => {
    try {
      const decodedUrl = decodeURIComponent(url);
      const parts = decodedUrl.split('/');
      const lastPart = parts[parts.length - 1];
      // Remove query params and possible supabase path prefixes
      return lastPart.split('?')[0].replace(/^[a-z0-9-]+\//i, '');
    } catch {
      return "Documento";
    }
  }

  const [isSearchingCEP, setIsSearchingCEP] = useState(false)
  const [pastedImages, setPastedImages] = useState<File[]>([])

  const fileRefs = {
    frente: useRef<HTMLInputElement>(null),
    verso: useRef<HTMLInputElement>(null),
    contracheque: useRef<HTMLInputElement>(null),
    extrato: useRef<HTMLInputElement>(null),
    outros: useRef<HTMLInputElement>(null),
    outros_2: useRef<HTMLInputElement>(null)
  }

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
        setDbProdutosConfigs(data || [])
      } catch (err) {
        console.error("Erro ao buscar tabelas de regras:", err)
      }
    }
    fetchConfigs()
  }, [])

  useEffect(() => {
    if (dbProdutosConfigs.length > 0 && proposal.coeficiente_prazo) {
      const config = dbProdutosConfigs.find(c => {
        const label = c.nome_tabela || `${c.convenios?.nome || 'Tabela'} - ${c.prazo}x ${c.coeficiente}`
        return label === proposal.coeficiente_prazo
      })
      if (config) {
        setSelectedCoefValue(config.coeficiente as number)
        setSelectedProdPercent(config.percentual_producao as number)
      }
    }
  }, [dbProdutosConfigs, proposal.coeficiente_prazo])

  const handleSearchCEP = async () => {
    const cep = formData.cep.replace(/\D/g, "")
    if (cep.length !== 8) {
      toast.error("Por favor, informe um CEP válido com 8 dígitos.")
      return
    }
    setIsSearchingCEP(true)
    const loadingToast = toast.loading("Buscando endereço...")
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await response.json()
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
    } catch {
      toast.error("Erro ao conectar com o serviço de CEP.", { id: loadingToast })
    } finally {
      setIsSearchingCEP(false)
    }
  }

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
    if (field === "cep") {
      const digits = value.replace(/\D/g, "")
      if (digits.length <= 8) {
        if (digits.length > 5) newValue = `${digits.substring(0, 5)}-${digits.substring(5, 8)}`
        else newValue = digits
      } else return
    }
    if (["valor_parcela", "valor_operacao_operacional", "valor_cliente_operacional", "valor_producao_operacional", "margem_utilizada", "valor_producao"].includes(field)) {
      const digits = value.replace(/\D/g, "")
      if (digits) {
        const amount = parseFloat(digits) / 100
        newValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
      } else newValue = ""
    }
    if (["nascimento", "data_emissao"].includes(field)) {
      const digits = value.replace(/\D/g, "")
      if (digits.length <= 8) {
        if (digits.length > 4) newValue = `${digits.substring(0, 2)}/${digits.substring(2, 4)}/${digits.substring(4, 8)}`
        else if (digits.length > 2) newValue = `${digits.substring(0, 2)}/${digits.substring(2, 4)}`
        else newValue = digits
      } else return
    }
    if (["tel_1", "tel_2", "tel_3"].includes(field)) {
      const digits = value.replace(/\D/g, "")
      if (digits.length <= 11) {
        if (digits.length > 2) {
          const part1 = digits.substring(0, 2), part2 = digits.substring(2, 7), part3 = digits.substring(7, 11)
          newValue = `(${part1}) ${part2}${part3 ? "-" + part3 : ""}`
        } else if (digits.length > 0) newValue = `(${digits}`
      } else return
    }
    setFormData(prev => {
      const updated = { ...prev, [field]: newValue }
      if (field === "margem_utilizada") updated.valor_parcela = newValue
      else if (field === "valor_parcela") updated.margem_utilizada = newValue
      
      // Operational field changes propagate to primary fields
      if (field === "valor_operacao_operacional") {
        updated.valor_cliente_operacional = newValue
        if (selectedProdPercent) {
          const rawOp = newValue.replace(/\D/g, "")
          if (rawOp) {
            const opValue = parseFloat(rawOp) / 100
            const prodValue = (opValue * selectedProdPercent) / 100
            updated.valor_producao_operacional = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prodValue)
            updated.valor_producao = updated.valor_producao_operacional
          }
        }
      }

      if (field === "valor_producao_operacional") {
        updated.valor_producao = newValue
      }

      if (field === "valor_cliente_operacional") {
        // Updated requirement: Valor Cliente = Valor Operação
        updated.valor_operacao_operacional = newValue
        if (selectedProdPercent) {
          const rawVal = newValue.replace(/\D/g, "")
          if (rawVal) {
            const val = parseFloat(rawVal) / 100
            const prodValue = (val * selectedProdPercent) / 100
            updated.valor_producao_operacional = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prodValue)
            updated.valor_producao = updated.valor_producao_operacional
          }
        }
      }

      if ((field === "margem_utilizada" || field === "valor_parcela") && selectedCoefValue) {
        const rawMargem = (field === "margem_utilizada" ? newValue : updated.margem_utilizada).replace(/\D/g, "")
        if (rawMargem && selectedCoefValue > 0) {
          const margemValue = parseFloat(rawMargem) / 100
          const valorOperacao = margemValue / selectedCoefValue
          
          const formattedOp = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorOperacao)
          
          updated.valor_operacao_operacional = formattedOp
          updated.valor_cliente_operacional = formattedOp
          
          if (selectedProdPercent) {
            const valorProducao = (valorOperacao * selectedProdPercent) / 100
            const formattedProd = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorProducao)
            updated.valor_producao_operacional = formattedProd
            updated.valor_producao = formattedProd
          }
        } else {
          updated.valor_operacao_operacional = ""
          updated.valor_cliente_operacional = ""
          updated.valor_producao_operacional = ""
          updated.valor_producao = ""
        }
      }
      return updated
    })
  }

  const uploadFile = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const fullPath = `${path}/${fileName}`
    const { error: uploadError } = await supabase.storage.from('propostas-attachments').upload(fullPath, file)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('propostas-attachments').getPublicUrl(fullPath)
    return data.publicUrl
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) files.push(new File([blob], `screenshot_${Date.now()}.png`, { type: blob.type }));
      }
    }
    if (files.length > 0) {
      setPastedImages(prev => [...prev, ...files]);
      toast.success(`${files.length} imagem(ns) colada(s)`);
    }
  };

  const handleUpdateProposal = async () => {
    setIsSaving(true)
    const loadingToast = toast.loading("Atualizando proposta...")
    try {
      const currentUser = user
      if (!currentUser) throw new Error("Usuário não autenticado")

      const fileUrls: { [key: string]: string | null } = {}
      for (const [key, file] of Object.entries(selectedFiles)) {
        if (file) fileUrls[key] = await uploadFile(file, `${currentUser.id}/${Date.now()}`)
      }

      const pastedUrls = []
      for (const file of pastedImages) pastedUrls.push(await uploadFile(file, `pasted/${currentUser.id}/${Date.now()}`))

      let finalObservations = formData.observacoes
      if (pastedUrls.length > 0) {
        finalObservations += "\n\n--- IMAGENS EM ANEXO ---\n" + pastedUrls.map((url, i) => `![Print ${i+1}](${url})`).join("\n")
      }

      const cleanMoney = (val: string) => {
        if (!val) return null
        const cleaned = val.replace(/[R$\s.]/g, "").replace(",", ".")
        return isNaN(parseFloat(cleaned)) ? null : parseFloat(cleaned)
      }

      const formatDate = (val: string) => {
        if (!val) return null
        const parts = val.split('/')
        return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : val
      }

      const updateData: Record<string, string | number | null> = {
        updated_at: new Date().toISOString()
      };

      if (canEditFields) {
        Object.assign(updateData, {
          cliente_cpf: formData.cpf.replace(/\D/g, ""),
          nome_cliente: formData.nome,
          data_nascimento: formatDate(formData.nascimento),
          origem: formData.origem,
          matricula: formData.matricula,
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
          email: formData.email,
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
          valor_producao_operacional: cleanMoney(formData.valor_producao_operacional),
          valor_producao: cleanMoney(formData.valor_producao),
          valor_operacao: cleanMoney(formData.valor_operacao_operacional),
          valor_cliente: cleanMoney(formData.valor_cliente_operacional),
          margem_utilizada: cleanMoney(formData.margem_utilizada),
          coeficiente_prazo: formData.coeficiente_prazo,
          observacoes: finalObservations,
        });
      }

      if (canAttach) {
        Object.assign(updateData, {
          arquivo_rg_frente: fileUrls.frente || existingAttachments.frente,
          arquivo_rg_verso: fileUrls.verso || existingAttachments.verso,
          arquivo_contracheque: fileUrls.contracheque || existingAttachments.contracheque,
          arquivo_extrato: fileUrls.extrato || existingAttachments.extrato,
          arquivo_outros: fileUrls.outros || existingAttachments.outros,
          arquivo_outros_2: fileUrls.outros_2 || existingAttachments.outros_2,
        });
      }

      const { error } = await supabase.from('propostas').update(updateData).eq('id_lead', proposal.id_lead)

      if (error) throw error
      
      // Log de Histórico para Edição
      try {
        await supabase.from('historico_propostas').insert({
          proposta_id_lead: proposal.id_lead,
          usuario_id: currentUser.id,
          status_anterior: proposal.status,
          status_novo: proposal.status,
          descricao: "Dados da proposta atualizados pelo usuário",
          tipo: 'info',
          observacoes: "Edição de campos do formulário e/ou anexos.",
          created_at: new Date().toISOString()
        })
      } catch (histErr) {
        console.warn("Erro ao gravar histórico de edição:", histErr)
      }

      toast.success("Proposta atualizada com sucesso!", { id: loadingToast })
      if (_onRefresh) _onRefresh()
    } catch (error) {
      console.error("Erro ao atualizar:", error)
      toast.error("Erro ao atualizar proposta", { id: loadingToast })
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileClick = (ref: React.RefObject<HTMLInputElement | null>) => ref.current?.click()
  const handleFileChange = (field: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFiles(prev => ({ ...prev, [field]: file }))
  }

  return (
    <div className="bg-slate-50/50 p-6 space-y-6 border-t border-slate-100">
      {/* Tabs */}
      <div className="flex justify-center gap-2">
        <Button 
          onClick={() => setActiveTab("visualizar")}
          className={cn(
            "h-8 px-4 text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === "visualizar" 
              ? "bg-[#00C853] hover:bg-[#00C853]/90 text-white shadow-md" 
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <Eye className="w-3.5 h-3.5 mr-2" />
          VISUALIZAR/EDITAR
        </Button>
        <Button 
          onClick={() => setActiveTab("historico")}
          className={cn(
            "h-8 px-4 text-[10px] font-bold uppercase tracking-widest transition-all",
            activeTab === "historico" 
              ? "bg-[#00C853] hover:bg-[#00C853]/90 text-white shadow-md" 
              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          )}
        >
          <History className="w-3.5 h-3.5 mr-2" />
          Histórico
        </Button>
        <Button 
          variant="outline"
          onClick={() => setIsFichaModalOpen(true)}
          className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
        >
          <FileText className="w-3.5 h-3.5 mr-2" />
          Ficha Proposta
        </Button>

        {/* Botão Deletar removido a pedido do usuário */}
      </div>

      <FichaPropostaModal 
        isOpen={isFichaModalOpen} 
        onClose={() => setIsFichaModalOpen(false)} 
        proposal={proposal} 
      />

      {activeTab === "visualizar" && (
        <div className="space-y-12 animate-in fade-in duration-500 pb-10 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar" onPaste={handlePaste}>
          <div className="flex flex-wrap justify-center gap-2 md:gap-8 items-center bg-white py-4 px-8 rounded-2xl border border-slate-200 shadow-sm w-fit mx-auto mb-6 text-left">
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

          <div className="bg-white border border-slate-200 rounded-xl p-8 space-y-12 shadow-sm text-left">
            {/* Top Info */}
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
                  disabled={!canEditFields}
                  className="w-full h-9 px-4 rounded-md border border-slate-100 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed"
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
                  disabled={!canEditFields}
                  className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
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
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Nome</label>
                  <Input 
                    value={formData.nome}
                    onChange={(e) => handleFormChange("nome", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Data de Nascimento</label>
                  <div className="relative">
                    <Input 
                      type="date"
                      value={toInputDate(formData.nascimento)}
                      onChange={(e) => handleFormChange("nascimento", fromInputDate(e.target.value))}
                      disabled={!canEditFields}
                      className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors px-3 text-[11px] font-normal text-slate-600 appearance-none disabled:opacity-75" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Naturalidade</label>
                  <Input 
                    value={formData.naturalidade}
                    onChange={(e) => handleFormChange("naturalidade", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">UF Naturalidade</label>
                  <select 
                    value={formData.uf_naturalidade}
                    onChange={(e) => handleFormChange("uf_naturalidade", e.target.value)}
                    disabled={!canEditFields}
                    className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed"
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
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Órgão Emissor</label>
                  <Input 
                    value={formData.orgao_emissor}
                    onChange={(e) => handleFormChange("orgao_emissor", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">UF Emissão</label>
                  <select 
                    value={formData.uf_emissao}
                    onChange={(e) => handleFormChange("uf_emissao", e.target.value)}
                    disabled={!canEditFields}
                    className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed"
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
                      disabled={!canEditFields}
                      className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors px-3 text-[11px] font-normal text-slate-600 appearance-none disabled:opacity-75" 
                    />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Nome do Pai</label>
                  <Input 
                    value={formData.nome_pai}
                    onChange={(e) => handleFormChange("nome_pai", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Nome da Mãe</label>
                  <Input 
                    value={formData.nome_mae}
                    onChange={(e) => handleFormChange("nome_mae", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Telefone 1</label>
                  <Input 
                    value={formData.tel_1}
                    onChange={(e) => handleFormChange("tel_1", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Telefone 2</label>
                  <Input 
                    value={formData.tel_2}
                    onChange={(e) => handleFormChange("tel_2", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Telefone 3</label>
                  <Input 
                    value={formData.tel_3}
                    onChange={(e) => handleFormChange("tel_3", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">E-MAIL</label>
                  <Input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFormChange("email", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">CEP</label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.cep}
                      onChange={(e) => handleFormChange("cep", e.target.value)}
                      disabled={!canEditFields}
                      className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                      placeholder="00000-000"
                    />
                    <button 
                      type="button" 
                      disabled={isSearchingCEP || !canEditFields}
                      onClick={handleSearchCEP}
                      className="text-[10px] font-bold text-primary italic whitespace-nowrap hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isSearchingCEP ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Buscar CEP
                    </button>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Endereço</label>
                  <Input 
                    value={formData.endereco}
                    onChange={(e) => handleFormChange("endereco", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Número</label>
                  <Input 
                    value={formData.numero}
                    onChange={(e) => handleFormChange("numero", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Complemento</label>
                  <Input 
                    value={formData.complemento}
                    onChange={(e) => handleFormChange("complemento", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Bairro</label>
                  <Input 
                    value={formData.bairro}
                    onChange={(e) => handleFormChange("bairro", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Cidade</label>
                  <Input 
                    value={formData.cidade}
                    onChange={(e) => handleFormChange("cidade", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">UF</label>
                  <select 
                    value={formData.uf}
                    onChange={(e) => handleFormChange("uf", e.target.value)}
                    disabled={!canEditFields}
                    className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed"
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Banco</label>
                  <Input 
                    value={formData.banco_cliente}
                    onChange={(e) => handleFormChange("banco_cliente", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">CHAVE PIX</label>
                  <Input 
                    value={formData.chave_pix}
                    onChange={(e) => handleFormChange("chave_pix", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Conta</label>
                  <Input 
                    value={formData.conta}
                    onChange={(e) => handleFormChange("conta", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Agência</label>
                  <Input 
                    value={formData.agencia}
                    onChange={(e) => handleFormChange("agencia", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">DV</label>
                  <Input 
                    value={formData.dv}
                    onChange={(e) => handleFormChange("dv", e.target.value)}
                    disabled={!canEditFields}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Tipo de Conta</label>
                  <select 
                    value={formData.tipo_conta}
                    onChange={(e) => handleFormChange("tipo_conta", e.target.value)}
                    disabled={!canEditFields}
                    className="w-full h-9 px-4 rounded-md border border-slate-300 bg-[#E8E8E8] text-[13px] font-medium focus:border-primary focus:outline-none transition-colors disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed"
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
              
              {!isCorretor && (
                <div className="bg-[#FEFCE8] border border-amber-100 rounded-xl p-8 space-y-6">
                  <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
                    <span className="font-bold text-slate-900">Operacional:</span> Preencha os campos abaixo em caso de divergência nos valores informados pelo corretor do valores do banco. Salvar valor operacional atualizará somente os campos abaixo.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Parcela</label>
                      <Input 
                        id="operacional-valor-parcela"
                        value={formData.valor_parcela}
                        onChange={(e) => handleFormChange("valor_parcela", e.target.value)}
                        className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                        placeholder="R$ 0,00" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Operação</label>
                      <Input 
                        id="operacional-valor-operacao"
                        value={formData.valor_operacao_operacional}
                        onChange={(e) => handleFormChange("valor_operacao_operacional", e.target.value)}
                        className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                        placeholder="R$ 0,00" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Cliente</label>
                      <Input 
                        id="operacional-valor-cliente"
                        value={formData.valor_cliente_operacional}
                        onChange={(e) => handleFormChange("valor_cliente_operacional", e.target.value)}
                        className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors" 
                        placeholder="R$ 0,00" 
                      />
                    </div>
                    <Button 
                      id="save-divergencia-operacional"
                      onClick={handleUpdateProposal} 
                      className="h-9 bg-[#171717] hover:bg-[#171717]/90 text-white w-12 p-0 shadow-lg shadow-slate-200"
                      disabled={isSaving}
                    >
                      {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
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
                    disabled={!isFinancialEditor && (!isCorretor ? true : !canEditFields)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                    placeholder="R$ 0,00" 
                  />
                </div>
                <div className="space-y-2 relative" ref={coefDropdownRef}>
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Coeficiente e Prazo</label>
                  <div 
                    className={cn(
                      "h-9 px-4 rounded-md border border-slate-800 bg-[#171717] flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 transition-all",
                      isCoefDropdownOpen && "ring-2 ring-primary/20 border-primary",
                      (!isFinancialEditor && (!isCorretor || !canEditFields)) && "opacity-75 cursor-not-allowed pointer-events-none"
                    )}
                    onClick={() => (isFinancialEditor || (isCorretor && canEditFields)) && setIsCoefDropdownOpen(!isCoefDropdownOpen)}
                  >
                    <span className="text-[13px] font-medium text-white truncate">
                      {formData.coeficiente_prazo || "Selecione uma tabela"}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 text-white/70 transition-transform", isCoefDropdownOpen && "rotate-180")} />
                  </div>

                  {isCoefDropdownOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl z-[50] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col max-h-[300px]">
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
                      <div className="overflow-y-auto p-1">
                        {dbProdutosConfigs.filter(config => {
                          const searchStr = `${config.nome_tabela || ''} ${config.prazo || ''} ${config.coeficiente || ''} ${config.convenios?.nome || ''}`.toLowerCase()
                          return searchStr.includes(coefSearchTerm.toLowerCase())
                        }).map((config) => {
                          const label = config.nome_tabela || `${config.convenios?.nome || 'Tabela'} - ${config.prazo}x ${config.coeficiente}`
                          return (
                            <div
                              key={config.id}
                              onClick={() => {
                                handleFormChange("coeficiente_prazo", label)
                                setSelectedCoefValue(config.coeficiente)
                                setSelectedProdPercent(config.percentual_producao)
                                
                                // Auto-calculate Valor Operação (Margin / Coef)
                                let currentValorOp = 0
                                if (formData.margem_utilizada && config.coeficiente) {
                                  const rawMargem = formData.margem_utilizada.replace(/\D/g, "")
                                  const margemValue = parseFloat(rawMargem) / 100
                                  currentValorOp = margemValue / config.coeficiente
                                  const formattedOp = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentValorOp)
                                  handleFormChange("valor_operacao_operacional", formattedOp)
                                  handleFormChange("valor_cliente_operacional", formattedOp)
                                } else if (formData.valor_operacao_operacional) {
                                  currentValorOp = parseFloat(formData.valor_operacao_operacional.replace(/\D/g, "")) / 100
                                }

                                // Auto-calculate production value based on Valor Operação
                                if (currentValorOp && config.percentual_producao) {
                                  const valorProducao = (currentValorOp * config.percentual_producao) / 100
                                  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorProducao)
                                  handleFormChange("valor_producao_operacional", formatted)
                                  handleFormChange("valor_producao", formatted)
                                }

                                setIsCoefDropdownOpen(false)
                                setCoefSearchTerm("")
                              }}
                              className={cn(
                                "px-3 py-2.5 rounded-lg text-[11px] font-bold uppercase transition-all cursor-pointer flex flex-col gap-0.5",
                                formData.coeficiente_prazo === label ? "bg-primary text-white" : "text-slate-600 hover:bg-slate-50"
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
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Produção</label>
                  <Input 
                    value={formData.valor_producao}
                    onChange={(e) => handleFormChange("valor_producao", e.target.value)}
                    disabled={!isFinancialEditor && (!isCorretor ? true : !canEditFields)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
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
                    disabled={!isFinancialEditor && (!isCorretor ? true : !canEditFields)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                    placeholder="R$ 0,00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Operação</label>
                  <Input 
                    value={formData.valor_operacao_operacional}
                    onChange={(e) => handleFormChange("valor_operacao_operacional", e.target.value)}
                    disabled={!isFinancialEditor && (!isCorretor ? true : !canEditFields)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
                    placeholder="R$ 0,00" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest">Valor Cliente</label>
                  <Input 
                    value={formData.valor_cliente_operacional}
                    onChange={(e) => handleFormChange("valor_cliente_operacional", e.target.value)}
                    disabled={!isFinancialEditor && (!isCorretor ? true : !canEditFields)}
                    className="h-9 border-slate-100 bg-[#E8E8E8] focus:border-primary transition-colors disabled:opacity-75" 
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
                  <textarea 
                    value={formData.observacoes}
                    onChange={(e) => handleFormChange("observacoes", e.target.value)}
                    disabled={!canEditFields}
                    className="w-full p-6 text-[14px] font-medium focus:outline-none min-h-[200px] bg-[#E8E8E8] disabled:opacity-75" 
                    placeholder="Digite suas observações aqui..."
                  />
                </div>
              </div>
            </div>

            {/* Anexos Editáveis */}
            <div className="space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.3em]">ANEXAR DOCUMENTOS</h3>
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Anexar RG VERSO somente se não tiver enviado um CNH.</p>
              </div>

              {/* Arquivos Atuais - Estilo Chamados */}
              {Object.entries(existingAttachments).some(([, url]) => url) && (
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">ANEXOS</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(existingAttachments).map(([key, url]) => {
                      if (!url) return null
                      const fileName = getFileName(url)
                      const labelMap: { [key: string]: string } = {
                        frente: "RG ou CNH (FRENTE)",
                        verso: "RG (VERSO)",
                        contracheque: "CONTRA CHEQUE",
                        extrato: "EXTRATO DE CONSIGNAÇÃO",
                        outros: "OUTROS",
                        outros_2: "OUTROS"
                      }
                      const label = labelMap[key] || "ANEXO"
                      
                      return (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 bg-[#F1F1F1] hover:bg-slate-200 text-slate-900 px-4 py-2.5 rounded-full text-[11px] font-bold transition-all border border-transparent hover:border-slate-300 shadow-sm"
                        >
                          <FileText className="w-4 h-4 text-slate-600" />
                          <div className="flex flex-col items-start leading-tight">
                            <span className="text-[9px] text-primary uppercase tracking-wider">{label}</span>
                            <span className="max-w-[200px] truncate uppercase tracking-tight">{fileName}</span>
                          </div>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {pastedImages.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex flex-wrap gap-3">
                  {pastedImages.map((file, idx) => (
                    <div key={idx} className="relative group w-16 h-16 rounded-lg border border-emerald-200 overflow-hidden bg-white shadow-sm">
                      <Image 
                        src={URL.createObjectURL(file)} 
                        alt="Pasted" 
                        width={64} 
                        height={64} 
                        className="w-full h-full object-cover" 
                        unoptimized
                        referrerPolicy="no-referrer"
                      />
                      <button onClick={() => setPastedImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
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
                    <label className="text-[10px] font-bold text-black/90 uppercase tracking-widest block">{field.label}</label>
                    <div 
                      onClick={() => canAttach && handleFileClick(field.ref)}
                      className={cn(
                        "w-full h-11 px-4 rounded-lg border text-[12px] flex items-center gap-3 cursor-pointer transition-all",
                        selectedFiles[field.id]
                          ? "bg-[#171717] text-white border-[#171717] shadow-lg"
                          : "bg-[#E8E8E8] text-slate-500 border-slate-100 hover:bg-slate-200",
                        !canAttach && "opacity-50 cursor-not-allowed pointer-events-none"
                      )}
                    >
                      <UploadCloud className={cn("w-5 h-5", selectedFiles[field.id] ? "text-white" : "text-slate-400")} />
                      <span className="truncate font-medium flex-1">
                        {selectedFiles[field.id] ? selectedFiles[field.id]?.name : "Selecionar arquivo..."}
                      </span>
                      {selectedFiles[field.id] && canAttach && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedFiles(prev => ({ ...prev, [field.id]: null })); 
                          }} 
                          className="p-1 hover:bg-white/10 rounded-full"
                        >
                          <X className="w-4 h-4 text-white/70" />
                        </button>
                      )}
                    </div>
                    <input type="file" ref={field.ref} className="hidden" onChange={(e) => handleFileChange(field.id, e)} />
                  </div>
                ))}
              </div>
            </div>

            {canSave && (
              <div className="flex justify-center pt-8">
                <Button 
                  onClick={handleUpdateProposal}
                  disabled={isSaving}
                  className="w-full max-w-md h-12 bg-[#171717] hover:bg-[#171717]/90 text-white text-[12px] font-bold uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02]"
                >
                  {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> SALVANDO...</> : "SALVAR ALTERAÇÕES"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "historico" && (
        <div className="space-y-8 animate-in fade-in duration-500 max-h-[700px] overflow-y-auto pb-10 px-4 custom-scrollbar border-t border-slate-100 pt-8">
          <div className="flex flex-col items-center">
            <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-[0.2em] mb-2">Rastreamento do Contrato</h3>
            <div className="w-full h-px bg-slate-100 max-w-2xl" />
          </div>

          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Carregando Histórico...</span>
            </div>
          ) : (
            <div className="relative pt-4">
              {/* Central Line */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-slate-200/60" />
              
              <div className="space-y-12 relative">
                {history.length > 0 ? history.map((event, index) => {
                  const isEven = index % 2 === 0;
                  const stepNumber = history.length - index;
                  
                  // Logic for status colors
                  let statusColor = "bg-[#D1D5DB]"; // Gray
                  const upperStatus = (event.status_novo || "").toUpperCase();
                  if (upperStatus.includes("PAGO") || upperStatus.includes("FINALIZADO") || upperStatus.includes("CONCLUÍDO")) {
                    statusColor = "bg-[#43A047]"; // Green
                  } else if (upperStatus.includes("BANCO") || upperStatus.includes("PENDENTE") || upperStatus.includes("REPROVADO") || upperStatus.includes("INCONSISTÊNCIA")) {
                    statusColor = "bg-[#FB8C00]"; // Orange
                  } else if (event.tipo === 'info' || upperStatus.includes("DIGITAÇÃO") || upperStatus.includes("AGUARDANDO")) {
                    statusColor = "bg-[#039BE5]"; // Blue
                  } else if (index === history.length - 1) {
                    statusColor = "bg-slate-400"; // Gray for first step
                  }

                  return (
                    <div key={event.id} className="grid grid-cols-[1fr_auto_1fr] items-start w-full">
                      {/* Left Side */}
                      <div className={cn("px-4", isEven ? "text-right" : "")}>
                        {isEven ? (
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-black text-slate-900">{new Date(event.created_at).toLocaleDateString('pt-BR')}</p>
                            <p className="text-[10px] font-medium text-slate-500">{new Date(event.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        ) : (
                          <HistoryCard event={event} usersMap={usersMap} />
                        )}
                      </div>

                      {/* Center Badge */}
                      <div className="relative z-10 flex flex-col items-center">
                        <div className={cn(
                          "w-10 h-10 rounded-full border-4 border-white shadow-md flex items-center justify-center text-[13px] font-black text-white transition-transform hover:scale-110",
                          statusColor
                        )}>
                          {stepNumber}
                        </div>
                      </div>

                      {/* Right Side */}
                      <div className={cn("px-4", !isEven ? "text-left" : "")}>
                        {!isEven ? (
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-black text-slate-900">{new Date(event.created_at).toLocaleDateString('pt-BR')}</p>
                            <p className="text-[10px] font-medium text-slate-500">{new Date(event.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        ) : (
                          <HistoryCard event={event} usersMap={usersMap} />
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-20 relative z-10">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-4 py-2 rounded-full inline-block border border-slate-100">
                      Nenhum histórico encontrado
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function HistoryCard({ event, usersMap }: { event: HistoryItem; usersMap: Map<string, string> }) {
  const userName = usersMap.get(event.usuario_id) || event.usuario_id || "SISTEMA";
  
  return (
    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3 w-full max-w-[450px] transition-all hover:shadow-md">
      <div className="space-y-1">
        <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-tight leading-tight">
          {event.status_novo || event.descricao}
        </h4>
        <div className="flex flex-col gap-1">
          {event.status_anterior && event.status_anterior !== event.status_novo && (
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
              Status Anterior: <span className="text-slate-500 line-through">{event.status_anterior}</span>
            </p>
          )}
          {event.status_novo && (
            <p className="text-[11px] font-medium text-slate-600 leading-relaxed">
              {event.descricao}
            </p>
          )}
        </div>
      </div>

      {event.alteracoes && Object.keys(event.alteracoes).length > 0 && (
        <div className="border border-slate-100 rounded overflow-hidden">
          <div className="bg-[#E3F2FD] px-3 py-1.5 flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-800 uppercase tracking-tighter">Alterações no Contrato</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>
          <div className="p-3 space-y-3 bg-white">
            {Object.entries(event.alteracoes).map(([key, value], i) => (
              <div key={i} className="space-y-0.5">
                <p className="text-[9px] font-black text-slate-900 uppercase tracking-tighter">{key.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-medium text-slate-500 italic">Nova:</span>
                  <span className="text-[10px] font-bold text-slate-800">
                    {typeof value.new === 'number' 
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value.new)
                      : String(value.new || '---')}
                  </span>
                </div>
                {i < Object.keys(event.alteracoes!).length - 1 && (
                  <div className="border-b border-dotted border-slate-200 pt-1" />
                )}
              </div>
            ))}
          </div>
          <div className="bg-slate-50 h-1.5 flex items-center justify-end px-3">
             <ChevronDown className="w-3 h-3 text-slate-300 rotate-180" />
          </div>
        </div>
      )}

      {event.observacoes && (
        <div className="space-y-1 pt-2 border-t border-slate-50">
          <p className="text-[9px] font-black text-slate-900 uppercase tracking-tighter">Observações:</p>
          <p className="text-[10px] font-medium text-slate-700 whitespace-pre-line leading-snug">{event.observacoes}</p>
        </div>
      )}

      <div className="pt-2 border-t border-slate-50">
        <p className="text-[9px] font-medium text-slate-400 italic">
          Alterado por: <span className="font-bold text-slate-500 uppercase">{userName}</span>
        </p>
      </div>
    </div>
  );
}
