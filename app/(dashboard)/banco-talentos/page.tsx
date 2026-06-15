"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Header } from "@/components/layout/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { 
  Search, 
  Plus, 
  MapPin, 
  Phone, 
  Mail, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Heart, 
  Calendar, 
  Check, 
  Loader2, 
  ChevronRight, 
  X, 
  Sparkles, 
  Upload, 
  Download, 
  FileText, 
  UserPlus,
  Trash2,
  Edit2
} from "lucide-react"

interface TalentCandidate {
  id: string
  // 1. Informações Básicas e de Contato
  nome: string
  pronome?: string
  email: string
  telefone: string
  localizacao: string // Cidade, Estado/País
  links?: string // LinkedIn, Portfólio, GitHub...
  
  // 2. Formação Acadêmica e Idiomas
  escolaridade: string // Ensino Médio, Superior, Pós-graduação, etc.
  instituicao?: string
  conclusao?: string // Data ou Previsão
  cursos_complementares?: string // Certificações, bootcamps
  idiomas?: string // e.g., Inglês avançado, espanhol fluente
  
  // 3. Experiência Profissional
  experiencias?: string // Empresas e cargos ocupados
  tempo_funcao?: string // Tempo de atuação
  setores?: string // Setores de mercado
  atividades_conquistas?: string // Principais conquistas e descrição
  
  // 4. Competências e Habilidades (Hard e Soft Skills)
  hard_skills?: string // Pacote Office, Python, Power BI, etc.
  soft_skills?: string // Liderança, negociação, etc.
  
  // 5. Interesses e Perfil Cultural
  pretensao_salarial?: string
  disponibilidade: string // Presencial, Híbrido, Remoto, Viagens
  areas_interesse?: string // Finanças, tecnologia, vendas, etc.
  vagas_afirmativas?: string // "Sim" / "Não" ou área de diversidade (Inclusão)
  
  // 6. Histórico de Processos Seletivos
  processos_anteriores?: string // Vagas que participou
  etapas_alcancadas?: string // Entrevista com RH, Painel, etc.
  motivo_desclassificacao?: string // Feedback / Motivos

  // Curriculum file storage fields
  curriculo_url?: string
  curriculo_name?: string
  
  created_at?: string
}

const DEFAULT_TALENTS: TalentCandidate[] = []

export default function BancoTalentosPage() {
  const [talents, setTalents] = useState<TalentCandidate[]>([])
  const [filteredTalents, setFilteredTalents] = useState<TalentCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [isSupabaseSynced, setIsSupabaseSynced] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formStep, setFormStep] = useState(1) // Form has 6 sub-sections (tabs)
  const [uploading, setUploading] = useState(false)
  
  // Detail Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<TalentCandidate | null>(null)
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState("")
  const [filterEscolaridade, setFilterEscolaridade] = useState("TODOS")
  const [filterDisponibilidade, setFilterDisponibilidade] = useState("TODOS")
  const [filterAreaInteresse, setFilterAreaInteresse] = useState("TODOS")
  const [filterAfirmativa, setFilterAfirmativa] = useState("TODOS")

  // Form State
  const [formData, setFormData] = useState<Partial<TalentCandidate>>({
    nome: "",
    pronome: "",
    email: "",
    telefone: "",
    localizacao: "",
    links: "",
    escolaridade: "Graduação Completa",
    instituicao: "",
    conclusao: "",
    cursos_complementares: "",
    idiomas: "",
    experiencias: "",
    tempo_funcao: "",
    setores: "",
    atividades_conquistas: "",
    hard_skills: "",
    soft_skills: "",
    pretensao_salarial: "",
    disponibilidade: "Remoto",
    areas_interesse: "",
    vagas_afirmativas: "Não",
    processos_anteriores: "",
    etapas_alcancadas: "Triagem",
    motivo_desclassificacao: "",
    curriculo_url: "",
    curriculo_name: ""
  })

  const applyFilters = useCallback(() => {
    let result = [...talents]

    // Text search (search in Nome, Email, Telefoner, Localização, Hard Skills, Soft Skills)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(item => 
        item.nome.toLowerCase().includes(q) ||
        (item.email || "").toLowerCase().includes(q) ||
        (item.telefone || "").toLowerCase().includes(q) ||
        (item.localizacao || "").toLowerCase().includes(q) ||
        (item.hard_skills || "").toLowerCase().includes(q) ||
        (item.soft_skills || "").toLowerCase().includes(q)
      )
    }

    // Filter Escolaridade
    if (filterEscolaridade !== "TODOS") {
      result = result.filter(item => item.escolaridade === filterEscolaridade)
    }

    // Filter Disponibilidade
    if (filterDisponibilidade !== "TODOS") {
      result = result.filter(item => item.disponibilidade === filterDisponibilidade)
    }

    // Filter Área de Interesse
    if (filterAreaInteresse !== "TODOS") {
      result = result.filter(item => 
        (item.areas_interesse || "").toLowerCase().includes(filterAreaInteresse.toLowerCase())
      )
    }

    // Filter Vaga Afirmativa
    if (filterAfirmativa !== "TODOS") {
      result = result.filter(item => item.vagas_afirmativas === filterAfirmativa)
    }

    setFilteredTalents(result)
  }, [talents, searchQuery, filterEscolaridade, filterDisponibilidade, filterAreaInteresse, filterAfirmativa])

  useEffect(() => {
    loadTalents()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const loadTalents = async () => {
    setLoading(true)
    let localData: TalentCandidate[] = []
    
    // 1. Try reading from LocalStorage first (for local backups/fallbacks)
    const saved = localStorage.getItem("shark_hr_banco_talentos")
    if (saved) {
      try {
        localData = JSON.parse(saved) as TalentCandidate[]
      } catch {
        localData = DEFAULT_TALENTS
      }
    }

    // 2. Fetch from Supabase Table
    try {
      const { data, error } = await supabase
        .from("hr_banco_talentos")
        .select("*")
        .order("nome", { ascending: true })

      if (error) {
        console.warn("Supabase local table hr_banco_talentos not found or inaccessible. Falling back to LocalStorage.", error.message)
        setIsSupabaseSynced(false)
        setTalents(localData)
      } else {
        console.log("Successfully connected and loaded talents from Supabase on table public.hr_banco_talentos!")
        setIsSupabaseSynced(true)
        if (data && data.length > 0) {
          const mapped: TalentCandidate[] = (data as unknown[]).map((itm) => {
            const item = itm as Record<string, unknown>;
            return {
              id: (item.id as string) || "",
              nome: (item.nome as string) || "",
              pronome: (item.pronome as string) || "",
              email: (item.email as string) || "",
              telefone: (item.telefone as string) || "",
              localizacao: (item.localizacao as string) || "",
              links: (item.links as string) || "",
              escolaridade: (item.escolaridade as string) || "Graduação Completa",
              instituicao: (item.instituicao as string) || "",
              conclusao: (item.conclusao as string) || "",
              cursos_complementares: (item.cursos_complementares as string) || "",
              idiomas: (item.idiomas as string) || "",
              experiencias: (item.experiencias as string) || "",
              tempo_funcao: (item.tempo_funcao as string) || "",
              setores: (item.setores as string) || "",
              atividades_conquistas: (item.atividades_conquistas as string) || "",
              hard_skills: (item.hard_skills as string) || "",
              soft_skills: (item.soft_skills as string) || "",
              pretensao_salarial: (item.pretensao_salarial as string) || "",
              disponibilidade: (item.disponibilidade as string) || "Remoto",
              areas_interesse: (item.areas_interesse as string) || "",
              vagas_afirmativas: (item.vagas_afirmativas as string) || "Não",
              processos_anteriores: (item.processos_anteriores as string) || "",
              etapas_alcancadas: (item.etapas_alcancadas as string) || "Triagem",
              motivo_desclassificacao: (item.motivo_desclassificacao as string) || "",
              curriculo_url: (item.curriculo_url as string) || "",
              curriculo_name: (item.curriculo_name as string) || "",
              created_at: (item.created_at as string) || ""
            }
          })
          setTalents(mapped)
          localStorage.setItem("shark_hr_banco_talentos", JSON.stringify(mapped))
        } else {
          setTalents(localData)
        }
      }
    } catch (err) {
      console.warn("Unexpected connection error during database fetch.", err)
      setIsSupabaseSynced(false)
      setTalents(localData)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.nome || !formData.email || !formData.telefone) {
      toast.error("Por gentileza, preencha os dados obrigatórios do candidato (Nome, Email e Telefone).")
      return
    }

    const isEditing = !!formData.id
    const candidateId = formData.id || `tal-${Date.now()}`
    
    const recordToSave: TalentCandidate = {
      id: candidateId,
      nome: formData.nome || "",
      pronome: formData.pronome || "",
      email: formData.email || "",
      telefone: formData.telefone || "",
      localizacao: formData.localizacao || "",
      links: formData.links || "",
      escolaridade: formData.escolaridade || "Graduação Completa",
      instituicao: formData.instituicao || "",
      conclusao: formData.conclusao || "",
      cursos_complementares: formData.cursos_complementares || "",
      idiomas: formData.idiomas || "",
      experiencias: formData.experiencias || "",
      tempo_funcao: formData.tempo_funcao || "",
      setores: formData.setores || "",
      atividades_conquistas: formData.atividades_conquistas || "",
      hard_skills: formData.hard_skills || "",
      soft_skills: formData.soft_skills || "",
      pretensao_salarial: formData.pretensao_salarial || "",
      disponibilidade: formData.disponibilidade || "Remoto",
      areas_interesse: formData.areas_interesse || "",
      vagas_afirmativas: formData.vagas_afirmativas || "Não",
      processos_anteriores: formData.processos_anteriores || "",
      etapas_alcancadas: formData.etapas_alcancadas || "Triagem",
      motivo_desclassificacao: formData.motivo_desclassificacao || "",
      curriculo_url: formData.curriculo_url || "",
      curriculo_name: formData.curriculo_name || "",
      created_at: formData.created_at || new Date().toISOString()
    }

    // Update Local Memory & LocalStorage
    let updatedList: TalentCandidate[] = []
    if (isEditing) {
      updatedList = talents.map(t => t.id === candidateId ? recordToSave : t)
    } else {
      updatedList = [recordToSave, ...talents]
    }

    setTalents(updatedList)
    localStorage.setItem("shark_hr_banco_talentos", JSON.stringify(updatedList))

    // Attempt to Save to Supabase
    if (isSupabaseSynced) {
      try {
        let { error } = await supabase
          .from("hr_banco_talentos")
          .upsert({
            id: recordToSave.id,
            nome: recordToSave.nome,
            pronome: recordToSave.pronome,
            email: recordToSave.email,
            telefone: recordToSave.telefone,
            localizacao: recordToSave.localizacao,
            links: recordToSave.links,
            escolaridade: recordToSave.escolaridade,
            instituicao: recordToSave.instituicao,
            conclusao: recordToSave.conclusao,
            cursos_complementares: recordToSave.cursos_complementares,
            idiomas: recordToSave.idiomas,
            experiencias: recordToSave.experiencias,
            tempo_funcao: recordToSave.tempo_funcao,
            setores: recordToSave.setores,
            atividades_conquistas: recordToSave.atividades_conquistas,
            hard_skills: recordToSave.hard_skills,
            soft_skills: recordToSave.soft_skills,
            pretensao_salarial: recordToSave.pretensao_salarial,
            disponibilidade: recordToSave.disponibilidade,
            areas_interesse: recordToSave.areas_interesse,
            vagas_afirmativas: recordToSave.vagas_afirmativas,
            processos_anteriores: recordToSave.processos_anteriores,
            etapas_alcancadas: recordToSave.etapas_alcancadas,
            motivo_desclassificacao: recordToSave.motivo_desclassificacao,
            curriculo_url: recordToSave.curriculo_url,
            curriculo_name: recordToSave.curriculo_name
          }, { onConflict: "id" })

        if (error && error.message?.includes("column")) {
          console.warn("Database missing native curriculo columns. Appending URL to links for safety.", error.message)
          const backupLinks = recordToSave.links 
            ? `${recordToSave.links}, CV: ${recordToSave.curriculo_url}`
            : `CV: ${recordToSave.curriculo_url}`

          const retryRes = await supabase
            .from("hr_banco_talentos")
            .upsert({
              id: recordToSave.id,
              nome: recordToSave.nome,
              pronome: recordToSave.pronome,
              email: recordToSave.email,
              telefone: recordToSave.telefone,
              localizacao: recordToSave.localizacao,
              links: backupLinks,
              escolaridade: recordToSave.escolaridade,
              instituicao: recordToSave.instituicao,
              conclusao: recordToSave.conclusao,
              cursos_complementares: recordToSave.cursos_complementares,
              idiomas: recordToSave.idiomas,
              experiencias: recordToSave.experiencias,
              tempo_funcao: recordToSave.tempo_funcao,
              setores: recordToSave.setores,
              atividades_conquistas: recordToSave.atividades_conquistas,
              hard_skills: recordToSave.hard_skills,
              soft_skills: recordToSave.soft_skills,
              pretensao_salarial: recordToSave.pretensao_salarial,
              disponibilidade: recordToSave.disponibilidade,
              areas_interesse: recordToSave.areas_interesse,
              vagas_afirmativas: recordToSave.vagas_afirmativas,
              processos_anteriores: recordToSave.processos_anteriores,
              etapas_alcancadas: recordToSave.etapas_alcancadas,
              motivo_desclassificacao: recordToSave.motivo_desclassificacao
            }, { onConflict: "id" })
          
          error = retryRes.error
        }

        if (error) {
          console.error("Failing to sync with cloud table. Kept locally inside storage.", error.message)
          toast.warning("Candidato salvo localmente no navegador (Erro de sincronização)")
        } else {
          toast.success(isEditing ? "Candidato atualizado com sucesso no Supabase!" : "Candidato registrado com sucesso no Supabase!")
        }
      } catch (err) {
        console.error("Supabase upsert error.", err)
        toast.warning("Candidato salvo localmente no navegador (Conexão offline)")
      }
    } else {
      toast.success(isEditing ? "Candidato atualizado com sucesso no storage local!" : "Candidato registrado com sucesso no storage local!")
    }

    setIsModalOpen(false)
    resetForm()
  }

  const handleDeleteCandidate = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente remover o candidato ${name} permanentemente?`)) return

    const updatedList = talents.filter(t => t.id !== id)
    setTalents(updatedList)
    localStorage.setItem("shark_hr_banco_talentos", JSON.stringify(updatedList))

    if (isSupabaseSynced) {
      try {
        const { error } = await supabase
          .from("hr_banco_talentos")
          .delete()
          .eq("id", id)

        if (error) {
          toast.error("Ocorreu um erro ao deletar da nuvem, mas foi removido localmente.")
        } else {
          toast.success("Candidato removido com sucesso de toda a plataforma!")
        }
      } catch (err) {
        console.error("Delete error.", err)
        toast.warning("Removido localmente. O Supabase está temporariamente offline.")
      }
    } else {
      toast.success("Candidato removido do armazenamento local!")
    }

    if (selectedCandidate?.id === id) {
      setSelectedCandidate(null)
    }
  }

  const handlePromoteToInterview = async (candidate: TalentCandidate) => {
    if (!confirm(`Deseja promover o candidato ${candidate.nome} de volta para as ENTREVISTAS/LIGAÇÕES no calendário ativo?`)) return

    // Pre-fill fields for recruitment tracking
    const interviewId = `int-${Date.now()}`
    const today = new Date().toISOString().split('T')[0]
    
    // Check if hr_interviews is configured in Supabase
    try {
      const { error } = await supabase
        .from('hr_interviews')
        .insert({
          id: interviewId,
          name: candidate.nome,
          phone: candidate.telefone,
          date: today,
          time: "14:00:00",
          fase: "Entrevista",
          plataforma: "Banco de Talentos",
          area: (candidate.areas_interesse && candidate.areas_interesse.trim() !== "") ? candidate.areas_interesse.split(",")[0] : "Comercial",
          notes: `Promovido do Banco de Talentos. Escolaridade: ${candidate.escolaridade}. Pretensão Salarial: ${candidate.pretensao_salarial || 'Não informada'}.`
        })

      if (error) {
        console.error("Supabase error promoting:", error)
        // Check if we have interviews in localStorage
        const interviewsSaved = localStorage.getItem("shark_hr_interviews_spreadsheet")
        const interviewsList = interviewsSaved ? JSON.parse(interviewsSaved) : []
        interviewsList.push({
          id: interviewId,
          name: candidate.nome,
          phone: candidate.telefone,
          date: today,
          time: "14:00:00",
          fase: "Agendada",
          plataforma: "Banco de Talentos",
          area: "Comercial",
          notes: `Promovido do Banco de Talentos. Pretensão: ${candidate.pretensao_salarial || 'Não informada'}.`,
          tipo: "ENTREVISTAS"
        })
        localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(interviewsList))
        toast.success(`Candidato ${candidate.nome} promovido com sucesso no cache local (Entrevistas).`)
      } else {
        toast.success(`Candidato ${candidate.nome} promovido com sucesso para a tabela ativa de Entrevistas!`)
      }
    } catch {
      // Offline fallback
      const interviewsSaved = localStorage.getItem("shark_hr_interviews_spreadsheet")
      const interviewsList = interviewsSaved ? JSON.parse(interviewsSaved) : []
      interviewsList.push({
        id: interviewId,
        name: candidate.nome,
        phone: candidate.telefone,
        date: today,
        time: "14:00:00",
        fase: "Agendada",
        plataforma: "Banco de Talentos",
        area: "Comercial",
        notes: `Promovido do Banco de Talentos.`,
        tipo: "ENTREVISTAS"
      })
      localStorage.setItem("shark_hr_interviews_spreadsheet", JSON.stringify(interviewsList))
      toast.success(`Candidato ${candidate.nome} promovido localmente para o Calendário.`)
    }
  }

  const handleEditClick = (candidate: TalentCandidate) => {
    setFormData(candidate)
    setFormStep(1)
    setIsModalOpen(true)
  }

  const handleAddClick = () => {
    resetForm()
    setFormStep(1)
    setIsModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      nome: "",
      pronome: "",
      email: "",
      telefone: "",
      localizacao: "",
      links: "",
      escolaridade: "Graduação Completa",
      instituicao: "",
      conclusao: "",
      cursos_complementares: "",
      idiomas: "",
      experiencias: "",
      tempo_funcao: "",
      setores: "",
      atividades_conquistas: "",
      hard_skills: "",
      soft_skills: "",
      pretensao_salarial: "",
      disponibilidade: "Remoto",
      areas_interesse: "",
      vagas_afirmativas: "Não",
      processos_anteriores: "",
      etapas_alcancadas: "Triagem",
      motivo_desclassificacao: "",
      curriculo_url: "",
      curriculo_name: ""
    })
  }

  const handleUploadCurriculo = async (file: File) => {
    if (!file) return
    setUploading(true)
    try {
      // Create bucket dynamically if it doesn't exist
      await supabase.storage.createBucket('curriculos', { public: true }).catch(() => {})

      // Generate a unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `resumes/${fileName}`

      // Upload file to dedicated curriculos bucket
      const { error } = await supabase.storage
        .from('curriculos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('curriculos')
        .getPublicUrl(filePath)

      setFormData(prev => ({
        ...prev,
        curriculo_url: publicUrl,
        curriculo_name: file.name
      }))
      toast.success("Currículo enviado com sucesso para a rede de armazenamento do Supabase!")
    } catch (err: unknown) {
      console.error("Upload error:", err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      toast.error(`Erro ao subir arquivo para o Supabase: ${errorMsg}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#f8fafc] min-h-screen">
      <Header title="REGISTRO & BANCO DE TALENTOS" />

      <main className="flex-1 p-4 lg:p-8 space-y-6">
        {/* Info & Sync Banner */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5 card-shadow">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600 mt-1">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-[13px] font-black text-slate-800 uppercase tracking-wider mb-1">Central de Banco de Talentos</h2>
              <p className="text-[10px] text-slate-500 font-medium">Filtre candidatos excelentes por competência, escolaridade, disponibilidade ou pretensão salarial e reative-os.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleAddClick}
              className="px-4 h-8 text-[9px] font-black uppercase tracking-widest bg-[#171717] hover:bg-[#171717]/90 text-white rounded-lg gap-1.5 shadow-md shadow-slate-100"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Candidato
            </Button>
          </div>
        </section>

        {/* Dynamic Filters Section */}
        <section className="bg-white border border-slate-200 rounded-2xl p-5 card-shadow space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-1 h-3 bg-primary rounded-full" />
            <h3 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest">Painel Inteligente de Filtros</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* Search Input */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Busque por nome, contato ou competência..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-4 text-[11px] border-slate-200 rounded-lg placeholder-slate-400 bg-slate-50/50"
              />
              <div className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4" />
              </div>
            </div>

            {/* Filter Escolaridade */}
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider pl-1 font-mono">Formação Mínima</label>
              <select
                value={filterEscolaridade}
                onChange={(e) => setFilterEscolaridade(e.target.value)}
                className="h-9 px-3 text-[11px] font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
              >
                <option value="TODOS">Todas Formações</option>
                <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                <option value="Técnico Incompleto">Técnico Incompleto</option>
                <option value="Técnico Completo">Técnico Completo</option>
                <option value="Superior Incompleto">Superior Incompleto</option>
                <option value="Graduação Completa">Graduação Completa</option>
                <option value="Pós-Graduação / Especialização">Pós-Graduação / Especialização</option>
                <option value="Mestrado / Doutorado">Mestrado / Doutorado</option>
              </select>
            </div>

            {/* Filter Disponibilidade */}
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider pl-1 font-mono">Tipo de Trabalho</label>
              <select
                value={filterDisponibilidade}
                onChange={(e) => setFilterDisponibilidade(e.target.value)}
                className="h-9 px-3 text-[11px] font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
              >
                <option value="TODOS">Qualquer Modelo</option>
                <option value="Presencial">Presencial</option>
                <option value="Híbrido">Híbrido</option>
                <option value="Remoto">Remoto</option>
                <option value="Viagens">Disponibilidade para Viagens</option>
              </select>
            </div>

            {/* Filter Area Interesse */}
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider pl-1 font-mono">Área Pretendida</label>
              <select
                value={filterAreaInteresse}
                onChange={(e) => setFilterAreaInteresse(e.target.value)}
                className="h-9 px-3 text-[11px] font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
              >
                <option value="TODOS">Todos os Setores</option>
                <option value="Vendas">Vendas / Comercial</option>
                <option value="Tecnologia">Tecnologia / TI</option>
                <option value="Finanças">Finanças / Cobrança</option>
                <option value="Administração">Administração / Backoffice</option>
                <option value="Atendimento">Atendimento / Telemarketing</option>
                <option value="Marketing">Marketing / Comunicação</option>
                <option value="Recursos Humanos">Recursos Humanos / DP</option>
              </select>
            </div>

            {/* Filter Vagas Afirmativas */}
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider pl-1 font-mono">D&I (Inclusão)</label>
              <select
                value={filterAfirmativa}
                onChange={(e) => setFilterAfirmativa(e.target.value)}
                className="h-9 px-3 text-[11px] font-semibold text-slate-700 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
              >
                <option value="TODOS">Todos</option>
                <option value="Sim">Apenas Afirmativas (Diversidade/PCD)</option>
                <option value="Não">Sem Restrição de Inclusão</option>
              </select>
            </div>
          </div>
        </section>

        {/* Talent List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Carregando currículos e bancos...</span>
          </div>
        ) : filteredTalents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center card-shadow">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-tight mb-1">Nenhum Candidato Encontrado</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Não localizamos perfis que batam com os critérios selecionados no momento. Tente expandir ou limpar a busca.
            </p>
            {(searchQuery || filterEscolaridade !== "TODOS" || filterDisponibilidade !== "TODOS" || filterAreaInteresse !== "TODOS" || filterAfirmativa !== "TODOS") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setFilterEscolaridade("TODOS")
                  setFilterDisponibilidade("TODOS")
                  setFilterAreaInteresse("TODOS")
                  setFilterAfirmativa("TODOS")
                }}
                className="mt-4 text-[9px] font-bold uppercase tracking-widest border-indigo-200 hover:bg-slate-50 text-indigo-600 px-4 h-8"
              >
                Limpar Filtros ativos
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTalents.map((candidate) => (
              <motion.div
                key={candidate.id}
                layoutId={`candidate-card-${candidate.id}`}
                className="bg-white border border-slate-200 rounded-2xl p-5 card-shadow hover:border-indigo-400 transition-all flex flex-col justify-between group relative overflow-hidden"
              >
                {candidate.vagas_afirmativas === "Sim" && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-indigo-500 to-sky-500 text-white text-[8px] font-black px-2.5 py-1 rounded-bl-xl tracking-widest shadow-sm uppercase">
                    D&I (Diversidade)
                  </div>
                )}

                <div className="space-y-4">
                  {/* Title & Pronouns */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase group-hover:text-indigo-600 transition-colors tracking-wide truncate max-w-[190px]">
                        {candidate.nome}
                      </h4>
                      {candidate.pronome && (
                        <span className="text-[8px] font-bold text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 uppercase tracking-wide">
                          {candidate.pronome}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-slate-350" />
                      <span className="text-[10px] font-semibold text-slate-400 tracking-wide uppercase truncate">
                        {candidate.localizacao || "Não informada"}
                      </span>
                    </div>
                  </div>

                  {/* Core Attribute Badges */}
                  <div className="flex flex-wrap gap-1">
                    <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[8.5px] font-bold px-2 py-1 rounded">
                      🎓 {candidate.escolaridade}
                    </span>
                    <span className="bg-slate-50 border border-slate-200 text-slate-600 text-[8.5px] font-bold px-2 py-1 rounded">
                      💼 {candidate.disponibilidade}
                    </span>
                    {candidate.areas_interesse && (
                      <span className="bg-indigo-50 border border-indigo-105 text-indigo-600 text-[8.5px] font-black px-2 py-1 rounded uppercase tracking-wider">
                        ★ {candidate.areas_interesse}
                      </span>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-3.5 space-y-2">
                    {/* Hard Skills */}
                    {candidate.hard_skills && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider font-mono">Competências Técnicas</span>
                        <div className="flex flex-wrap gap-1">
                          {candidate.hard_skills.split(",").slice(0, 4).map((s, idx) => (
                            <span key={idx} className="bg-sky-50 text-sky-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
                              {s.trim()}
                            </span>
                          ))}
                          {candidate.hard_skills.split(",").length > 4 && (
                            <span className="bg-slate-100 text-slate-500 text-[8px] font-extrabold px-1 py-0.5 rounded">
                              +{candidate.hard_skills.split(",").length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pre-selection historic highlights */}
                    {candidate.pretensao_salarial && (
                      <div className="flex justify-between items-center bg-slate-50/50 rounded-lg p-2 border border-slate-100">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider">Pretensão:</span>
                        <span className="text-[10px] font-extrabold text-indigo-600 font-mono">
                          {candidate.pretensao_salarial}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditClick(candidate)}
                      className="h-8 w-8 text-slate-400 hover:text-indigo-600 p-0"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteCandidate(candidate.id, candidate.nome)}
                      className="h-8 w-8 text-slate-400 hover:text-rose-500 p-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button 
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePromoteToInterview(candidate)}
                      className="h-8 px-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Entrevista
                    </Button>

                    <Button
                      onClick={() => setSelectedCandidate(candidate)}
                      className="h-8 px-3 text-[9px] font-black uppercase tracking-widest bg-gradient-to-r from-slate-900 to-indigo-950 hover:bg-slate-800 text-white rounded-lg gap-1 shadow-sm"
                    >
                      Ficha Completa
                      <ChevronRight className="w-3 h-3 text-slate-300" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Candidate Registration / Edit Slide Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100"
            >
              {/* Modal Title & Navigation */}
              <div className="bg-[#171717] p-5.5 flex items-center justify-between border-b border-neutral-800">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {formData.id ? "ATUALIZAR CANDIDATURA" : "REGISTRO DE CANDIDATO"}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1.5 tracking-wider">
                    {
                      formStep === 1 ? "Dados Básicos & Links" :
                      formStep === 2 ? "Formação & Idiomas" :
                      formStep === 3 ? "Experiência Profissional" :
                      formStep === 4 ? "Competências & Interesses" :
                      formStep === 5 ? "Histórico de Seleção" : "Anexar Currículo / Arquivo"
                    } (Etapa {formStep} de 6)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-neutral-800/80 rounded-lg transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Step Navigation Bar */}
              <div className="flex bg-slate-50 border-b border-slate-150 px-4 py-2 justify-between gap-1 overflow-x-auto no-scrollbar">
                {["Básico", "Formação", "Experiência", "Skills", "Histórico", "Anexo"].map((name, index) => {
                  const step = index + 1
                  return (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setFormStep(step)}
                      className={cn(
                        "flex-1 py-2 text-center text-[9px] font-black uppercase tracking-widest border-b-2 transition-all min-w-[70px]",
                        formStep === step 
                          ? "border-[#171717] text-slate-900 font-extrabold" 
                          : "border-transparent text-slate-400 hover:text-slate-600"
                      )}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveCandidate} className="p-6">
                <div className="h-[340px] overflow-y-auto pr-2 no-scrollbar">
                  
                  {/* STEP 1: Basic Info */}
                  {formStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Nome Completo *</label>
                          <Input
                            type="text"
                            required
                            value={formData.nome || ""}
                            onChange={(e) => setFormData({...formData, nome: e.target.value})}
                            placeholder="Ex: Gabriel Dias de Moura"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Pronomes / Nome Social</label>
                          <Input
                            type="text"
                            value={formData.pronome || ""}
                            onChange={(e) => setFormData({...formData, pronome: e.target.value})}
                            placeholder="Ex: Ele/Dele ou Ela/Dela"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Email Principal *</label>
                          <Input
                            type="email"
                            required
                            value={formData.email || ""}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="Ex: gabriel@gmail.com"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Telefone / WhatsApp *</label>
                          <Input
                            type="tel"
                            required
                            value={formData.telefone || ""}
                            onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                            placeholder="Ex: (11) 98765-4321"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Localização (Cidade, Estado, País) *</label>
                          <Input
                            type="text"
                            required
                            value={formData.localizacao || ""}
                            onChange={(e) => setFormData({...formData, localizacao: e.target.value})}
                            placeholder="Ex: São Paulo, SP - Brasil"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1 font-mono">Portfólio / LinkedIn / GitHub Links</label>
                          <Input
                            type="text"
                            value={formData.links || ""}
                            onChange={(e) => setFormData({...formData, links: e.target.value})}
                            placeholder="Ex: linkedin.com/in/perfil, github.com/user"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Academics & Languages */}
                  {formStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Nível de Escolaridade</label>
                          <select
                            value={formData.escolaridade || "Graduação Completa"}
                            onChange={(e) => setFormData({...formData, escolaridade: e.target.value})}
                            className="h-10 px-3 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                          >
                            <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                            <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                            <option value="Técnico Incompleto">Técnico Incompleto</option>
                            <option value="Técnico Completo">Técnico Completo</option>
                            <option value="Superior Incompleto">Superior Incompleto</option>
                            <option value="Graduação Completa">Graduação Completa</option>
                            <option value="Pós-Graduação / Especialização">Pós-Graduação / Especialização</option>
                            <option value="Mestrado / Doutorado">Mestrado / Doutorado</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Instituição de Ensino</label>
                          <Input
                            type="text"
                            value={formData.instituicao || ""}
                            onChange={(e) => setFormData({...formData, instituicao: e.target.value})}
                            placeholder="Ex: USP ou SENAC"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Data Conclusão ou Previsão</label>
                          <Input
                            type="text"
                            value={formData.conclusao || ""}
                            onChange={(e) => setFormData({...formData, conclusao: e.target.value})}
                            placeholder="Ex: Julho 2026 ou Concluído em 2024"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Idiomas / Proficiência</label>
                          <Input
                            type="text"
                            value={formData.idiomas || ""}
                            onChange={(e) => setFormData({...formData, idiomas: e.target.value})}
                            placeholder="Ex: Inglês fluente, Espanhol básico"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Cursos Complementares / Bootcamp / Certificações</label>
                        <textarea
                          value={formData.cursos_complementares || ""}
                          onChange={(e) => setFormData({...formData, cursos_complementares: e.target.value})}
                          placeholder="Ex: MBA Vendas de Impacto, Certificação HubSpot CRM, Bootcamp Rocketseat, Liderança Ágil..."
                          className="w-full h-20 text-xs border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 p-2.5 bg-white border placeholder-slate-350"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 3: Professional Experience */}
                  {formStep === 3 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Cargos Ocupados / Histórico</label>
                          <Input
                            type="text"
                            value={formData.experiencias || ""}
                            onChange={(e) => setFormData({...formData, experiencias: e.target.value})}
                            placeholder="Ex: Consultor Interno em Acerto Fácil, Vendedor na Casas Bahia"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Tempo na Função / Tempo Comercial</label>
                          <Input
                            type="text"
                            value={formData.tempo_funcao || ""}
                            onChange={(e) => setFormData({...formData, tempo_funcao: e.target.value})}
                            placeholder="Ex: 2 anos e 3 meses"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 flex-1">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Setores de Mercado Atuados</label>
                        <Input
                          type="text"
                          value={formData.setores || ""}
                          onChange={(e) => setFormData({...formData, setores: e.target.value})}
                          placeholder="Ex: Empréstimo Consignado, Telecomunicações, Varejo, Bancário..."
                          className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Atividades Principais, Métricas de Impacto ou Conquistas</label>
                        <textarea
                          value={formData.atividades_conquistas || ""}
                          onChange={(e) => setFormData({...formData, atividades_conquistas: e.target.value})}
                          placeholder="Ex: Responsável por faturamento comercial de R$150K/mês. Gestão de CRM e carteira consignada ativa com alto impacto."
                          className="w-full h-24 text-xs border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 p-2.5 bg-white border placeholder-slate-350"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 4: Skills & Cultural Fit */}
                  {formStep === 4 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Pretensão Salarial ou Remuneração Atual</label>
                          <Input
                            type="text"
                            value={formData.pretensao_salarial || ""}
                            onChange={(e) => setFormData({...formData, pretensao_salarial: e.target.value})}
                            placeholder="Ex: R$ 3.000,00"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Vagas Afirmativas / Diversidade (D&I) ?</label>
                          <select
                            value={formData.vagas_afirmativas || "Não"}
                            onChange={(e) => setFormData({...formData, vagas_afirmativas: e.target.value})}
                            className="h-10 px-3 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                          >
                            <option value="Não">Não se aplica</option>
                            <option value="Sim">Sim (Prefiro declarar interesse em Diversidade/PCD)</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Modelo de Trabalho Pretendido</label>
                          <select
                            value={formData.disponibilidade || "Remoto"}
                            onChange={(e) => setFormData({...formData, disponibilidade: e.target.value})}
                            className="h-10 px-3 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                          >
                            <option value="Remoto">Remoto integral</option>
                            <option value="Híbrido">Híbrido</option>
                            <option value="Presencial">Presencial integral</option>
                            <option value="Viagens">Mobilidade / Viagens frequentes</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Áreas Internas de Maior Interesse</label>
                          <Input
                            type="text"
                            value={formData.areas_interesse || ""}
                            onChange={(e) => setFormData({...formData, areas_interesse: e.target.value})}
                            placeholder="Ex: Vendas, Tecnologia, Marketing, Cobrança..."
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1 font-mono">Hard Skills (Competências - Comma separated)</label>
                          <Input
                            type="text"
                            value={formData.hard_skills || ""}
                            onChange={(e) => setFormData({...formData, hard_skills: e.target.value})}
                            placeholder="Ex: Power BI, Pacote Office, CRM Pipefy, Telemarketing"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1 font-mono">Soft Skills (Comportamentos)</label>
                          <Input
                            type="text"
                            value={formData.soft_skills || ""}
                            onChange={(e) => setFormData({...formData, soft_skills: e.target.value})}
                            placeholder="Ex: Liderança, Negociação Ágil, Resiliência"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 5: Recruitment History */}
                  {formStep === 5 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Processos que Já Participou (Vagas)</label>
                          <Input
                            type="text"
                            value={formData.processos_anteriores || ""}
                            onChange={(e) => setFormData({...formData, processos_anteriores: e.target.value})}
                            placeholder="Ex: Corretor SIAPE Consignado SP, Supervisor Operacional"
                            className="h-10 text-xs border-slate-200 rounded-lg placeholder-slate-350"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1">Etapa Máxima Alcançada</label>
                          <select
                            value={formData.etapas_alcancadas || "Triagem"}
                            onChange={(e) => setFormData({...formData, etapas_alcancadas: e.target.value})}
                            className="h-10 px-3 text-xs text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                          >
                            <option value="Triagem">Triagem de Currículo</option>
                            <option value="Entrevista RH">Entrevista Inicial com RH</option>
                            <option value="Teste Técnico">Teste Técnico ou Mentalidade</option>
                            <option value="Painel Gestores">Painel de Negócios / Gestores</option>
                            <option value="Proposta">Proposta Financeira final</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest pl-1 text-rose-500">Motivo de Desclassificação anterior & Feedbacks Úteis</label>
                        <textarea
                          value={formData.motivo_desclassificacao || ""}
                          onChange={(e) => setFormData({...formData, motivo_desclassificacao: e.target.value})}
                          placeholder="Ex: Desclassificado no painel porque optou por vaga CLT presencial na concorrência na época. Muito motivado e comunicativo. Vale a pena reatar contrato."
                          className="w-full h-28 text-xs border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary/20 p-2.5 bg-white border placeholder-slate-350"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 6: Curriculum Upload */}
                  {formStep === 6 && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                        <Upload className="w-4 h-4 text-indigo-500" />
                        <h4 className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest">Currículo e Documentação do Candidato</h4>
                      </div>

                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Arraste ou selecione o arquivo do currículo do candidato (formatos suportados: PDF, DOC, DOCX ou Imagens até 5MB). O arquivo será armazenado com segurança em um bucket Supabase dedicado.
                      </p>

                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer relative group min-h-[160px]">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                          onChange={async (e) => {
                            if (e.target.files && e.target.files.length > 0) {
                              await handleUploadCurriculo(e.target.files[0])
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          disabled={uploading}
                        />
                        
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Enviando para o Supabase...</span>
                          </div>
                        ) : formData.curriculo_url ? (
                          <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                            <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                              <Check className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 truncate max-w-xs block">
                              {formData.curriculo_name || "arquivo_curriculo.pdf"}
                            </span>
                            <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider">
                              Enviado com Sucesso! Clique para substituir
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                            <div className="p-3 bg-indigo-50 rounded-full text-indigo-500 group-hover:scale-110 transition-transform">
                              <Upload className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 block mt-1">
                              Clique ou arraste o currículo aqui
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold block">
                              Formato PDF, DOC, DOCX ou Imagens (Máx. 5MB)
                            </span>
                          </div>
                        )}
                      </div>

                      {formData.curriculo_url && (
                        <div className="flex items-center justify-between p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-xl">
                          <div className="flex items-center gap-2.5 truncate">
                            <FileText className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <div className="truncate">
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Link do Documento na Nuvem</span>
                              <a 
                                href={formData.curriculo_url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-[10px] font-bold text-indigo-600 hover:underline truncate block"
                              >
                                {formData.curriculo_url}
                              </a>
                            </div>
                          </div>
                          
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, curriculo_url: "", curriculo_name: "" }));
                              toast.info("Arquivo de currículo removido da ficha.");
                            }}
                            className="h-7 px-2.5 text-[9px] font-bold uppercase text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                          >
                            Remover
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* Footers controls */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-5 mt-5">
                  <div className="flex items-center gap-1.5">
                    {formStep > 1 && (
                      <Button
                        type="button"
                        variant="slate"
                        onClick={() => setFormStep(formStep - 1)}
                        className="px-4 h-9 text-[10px] font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 uppercase rounded-lg tracking-widest"
                      >
                        Passo Anterior
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 h-9 text-[10px] font-black uppercase tracking-widest border-slate-200 text-slate-400 rounded-lg"
                    >
                      Cancelar
                    </Button>

                    {formStep < 6 ? (
                      <Button
                        type="button"
                        onClick={() => setFormStep(formStep + 1)}
                        className="px-5 h-9 text-[10px] bg-[#171717] hover:bg-[#171717]/90 text-white font-black uppercase tracking-widest rounded-lg flex items-center gap-1"
                      >
                        Próximo Passo
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </Button>
                    ) : (
                      <Button
                        type="submit"
                        disabled={uploading}
                        className="px-5 h-9 text-[10px] bg-[#171717] hover:bg-[#171717]/90 text-white font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 shadow-lg shadow-slate-200"
                      >
                        <Check className="w-4 h-4 text-emerald-400" />
                        Salvar e Concluir
                      </Button>
                    )}
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Showcase Drawer (Candidate File Profile) */}
      <AnimatePresence>
        {selectedCandidate && (
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-[220] flex justify-end">
            {/* Click outside dismisses */}
            <div className="absolute inset-0" onClick={() => setSelectedCandidate(null)} />
            
            <motion.div
              initial={{ x: "100%", opacity: 0.9 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0.9 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="relative w-full max-w-xl bg-white h-screen shadow-2xl flex flex-col border-l border-slate-150 z-30 overflow-hidden"
            >
              {/* Header Details */}
              <div className="p-6 bg-slate-900 text-white flex flex-col gap-1 relative">
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase bg-[#00E5FF]/10 text-[#00E5FF] px-2.5 py-0.5 rounded tracking-widest">
                    Cadastro Consolidado
                  </span>
                  {selectedCandidate.vagas_afirmativas === "Sim" && (
                    <span className="text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded tracking-widest">
                      D&I INCLUSÃO
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider mt-1.5">
                  {selectedCandidate.nome}
                </h3>
                {selectedCandidate.pronome && (
                  <p className="text-[10px] font-semibold text-slate-300 font-mono tracking-wider">{selectedCandidate.pronome}</p>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="bg-slate-50 border-b border-slate-150 p-4 flex items-center justify-between">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="slate"
                    onClick={() => {
                      const current = selectedCandidate;
                      setSelectedCandidate(null);
                      handleEditClick(current);
                    }}
                    className="h-8 text-[9px] font-black bg-slate-100 hover:bg-slate-200 text-slate-700 uppercase tracking-widest px-3 rounded-lg"
                  >
                    Editar Ficha
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handlePromoteToInterview(selectedCandidate)}
                    className="h-8 text-[9px] font-black bg-emerald-600 hover:bg-emerald-700 text-white uppercase tracking-widest px-3 rounded-lg flex items-center gap-1 shadow shadow-emerald-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Enviar p/ Entrevistas
                  </Button>
                </div>
              </div>

              {/* Scrollable Curriculum content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">

                {/* Cloud Attached Resume (Bucket Storage) */}
                {selectedCandidate.curriculo_url && (
                  <div className="bg-gradient-to-r from-emerald-500/5 to-indigo-500/5 border border-emerald-100 rounded-xl p-4 flex items-center justify-between gap-4 card-shadow">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
                        <FileText className="w-5.5 h-5.5" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Currículo Armazenado</h4>
                        <p className="text-[8.5px] text-slate-400 font-bold mt-1 max-w-[210px] truncate" title={selectedCandidate.curriculo_name}>
                          {selectedCandidate.curriculo_name || "arquivo_curriculo.pdf"}
                        </p>
                      </div>
                    </div>
                    <a 
                      href={selectedCandidate.curriculo_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[8.5px] font-black uppercase tracking-widest rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar / Ver
                    </a>
                  </div>
                )}
                
                {/* 1. Informações Básicas e de Contato */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <UserPlus className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-widest">1. Dados Básicos & Comunicação</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Telefone Principal</span>
                      <p className="text-[11px] font-bold text-slate-700 mt-0.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedCandidate.telefone}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Email</span>
                      <p className="text-[11px] font-bold text-slate-700 mt-0.5 flex items-center gap-1.5 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedCandidate.email}
                      </p>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between gap-4">
                    <div className="truncate">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Localização Física</span>
                      <p className="text-[11px] font-semibold text-slate-700 mt-0.5 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {selectedCandidate.localizacao || "Não informada"}
                      </p>
                    </div>
                    <div className="max-w-[150px] text-right">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Portfólio / Redes</span>
                      {selectedCandidate.links ? (
                        <span className="text-[10.5px] font-medium text-indigo-600 block truncate" title={selectedCandidate.links}>
                          {selectedCandidate.links}
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-medium text-slate-400 block">Nenhum</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Formação Acadêmica e Idiomas */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <GraduationCap className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-widest">2. Formação Acadêmica & Idiomas</h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Escolaridade</span>
                        <span className="text-[11px] font-bold text-slate-700">{selectedCandidate.escolaridade}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Previsão/Status</span>
                        <span className="text-[11px] font-semibold text-slate-600">{selectedCandidate.conclusao || "Não informada"}</span>
                      </div>
                    </div>
                    {selectedCandidate.instituicao && (
                      <div className="pt-1.5 border-t border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Instituição de Ensino</span>
                        <span className="text-[11px] font-semibold text-slate-600">{selectedCandidate.instituicao}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCandidate.idiomas && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Idiomas</span>
                        <span className="text-[10.5px] font-bold text-slate-700 block mt-0.5">{selectedCandidate.idiomas}</span>
                      </div>
                    )}
                    {selectedCandidate.cursos_complementares && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 col-span-1 md:col-span-2">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Cursos / Bootcamps Complementares</span>
                        <p className="text-[10px] font-semibold text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                          {selectedCandidate.cursos_complementares}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Experiência Profissional */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-widest">3. Experiência Profissional</h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Cargos & Empresas</span>
                        <span className="text-[11px] font-bold text-slate-700 leading-normal block">{selectedCandidate.experiencias || "Não informada"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Tempo Atuação</span>
                        <span className="text-[11px] font-black text-indigo-600">{selectedCandidate.tempo_funcao || "Não cadastrado"}</span>
                      </div>
                    </div>
                    {selectedCandidate.setores && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Setores de Mercado Atuados</span>
                        <span className="text-[11px] font-bold text-slate-600">{selectedCandidate.setores}</span>
                      </div>
                    )}
                    {selectedCandidate.atividades_conquistas && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Atividades, Métricas & Conquistas</span>
                        <p className="text-[10px] font-semibold text-slate-600 mt-1 leading-relaxed whitespace-pre-line bg-white/50 rounded-lg p-2.5 border border-slate-100">
                          {selectedCandidate.atividades_conquistas}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Competências e Habilidades */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <Award className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-widest">4. Competências & Soft Skills</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedCandidate.hard_skills && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Conhecimentos Técnicos (Hard)</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedCandidate.hard_skills.split(",").map((skill, index) => (
                            <span key={index} className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[8.5px] font-bold px-2 py-0.5 rounded uppercase">
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedCandidate.soft_skills && (
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">Competências Comportamentais (Soft)</span>
                        <div className="flex flex-wrap gap-1">
                          {selectedCandidate.soft_skills.split(",").map((skill, index) => (
                            <span key={index} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8.5px] font-bold px-2 py-0.5 rounded uppercase">
                              {skill.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 5. Interesses e Perfil Cultural */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <Heart className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-widest">5. Perfil Cultural & Interesses</h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Pretensão Salarial Mínima</span>
                      <span className="text-[11px] font-bold text-indigo-600 font-mono mt-0.5 block">{selectedCandidate.pretensao_salarial || "Não informada"}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Disponibilidade</span>
                      <span className="text-[11px] font-bold text-slate-700 mt-0.5 block">{selectedCandidate.disponibilidade}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-150">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Áreas de Interesse para Atuação</span>
                      <span className="text-[11px] font-bold text-slate-700 mt-0.5 block uppercase">{selectedCandidate.areas_interesse || "Todas as vagas abertas"}</span>
                    </div>
                  </div>
                </div>

                {/* 6. Histórico de Seleções */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b border-indigo-50 pb-2">
                    <Calendar className="w-4 h-4 text-indigo-500" />
                    <h4 className="text-[10.5px] font-extrabold text-slate-800 uppercase tracking-widest">6. Histórico Seletivo & Avaliação</h4>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-150">
                      <div>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Último Processo</span>
                        <span className="text-[11px] font-bold text-slate-700 block mt-0.5">{selectedCandidate.processos_anteriores || "Nenhum histórico"}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">Etapa de Reprovação</span>
                        <span className="text-[10px] font-extrabold text-rose-500 uppercase bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded tracking-wide">
                          {selectedCandidate.etapas_alcancadas || "Triagem"}
                        </span>
                      </div>
                    </div>
                    {selectedCandidate.motivo_desclassificacao && (
                      <div>
                        <span className="text-[8px] font-bold text-rose-450 uppercase tracking-wider block">Anotações do RH & Por Que Desqualificou</span>
                        <p className="text-[10px] font-semibold text-slate-600 mt-1 lines-relaxed bg-white/70 border border-slate-150 rounded-lg p-2.5">
                          {selectedCandidate.motivo_desclassificacao}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Drawer footer */}
              <div className="border-t border-slate-150 p-4 bg-slate-50 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCandidate(null)}
                  className="px-5 h-9 text-[10px] font-bold uppercase tracking-widest border-slate-200 text-slate-500 rounded-lg"
                >
                  Fechar Painel
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
