"use client"

import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { 
  Target, 
  Search, 
  User, 
  Award, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  TrendingUp, 
  Compass, 
  Copy, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Calendar, 
  ChevronRight, 
  ExternalLink, 
  Save, 
  Check, 
  Briefcase, 
  Sparkles,
  Building2,
  Mail,
  Phone,
  LayoutGrid,
  List,
  ChevronDown
} from "lucide-react"

// Types
export type EtapaProfissional = 
  | "Integração" 
  | "Desenvolvimento" 
  | "Acompanhamento" 
  | "Preparação para Promoção/Efetivação"

export interface WeeklyLog {
  acaoPrevista: string
  evidenciaObservada: string
  status: "Não iniciado" | "Em andamento" | "Concluído" | "Precisa de reforço"
  proximoPasso: string
}

export interface PDIFeedback {
  id: string
  data: string
  responsavel: string
  contexto: string
  percepcaoFuncionario: string
  pontosPositivos: string
  pontosMelhoria: string
  combinados: string
  dataRetorno: string
}

export interface PDIComportamento {
  id: string
  comportamento: string
  situacao: string
  impacto: string
  comportamentoEsperado: string
  prioridade: "Alta" | "Média" | "Baixa"
  status: "Não iniciado" | "Em desenvolvimento" | "Consolidado"
}

export interface PDIAcao {
  id: string
  objetivo: string
  acoesPraticas: string
  responsavel: string
  prazo: string
  frequencia: "Semanal" | "Quinzenal" | "Mensal"
  indicador: string
  resultadoEsperado: string
  resultadoAlcancado: string
  status: "Não iniciado" | "Em andamento" | "Concluído" | "Precisa de reforço"
}

export interface PDIEvidencia {
  id: string
  titulo: string
  atividadesConcluidas: string
  situacaoReal: string
  resultadoAntesDepois: string
  linkDocumento: string
  evidenciaAplicacao: string
  validacaoLideranca: "Validado" | "Em análise" | "Necessita reforço"
  dataValidacao: string
}

export interface PDIData {
  // 1. Perfil & Contexto
  etapaProfissional: EtapaProfissional
  liderancaDireta: string
  area: string
  cargo: string
  objetivosProfissionais: string
  interessesCrescimento: string
  
  // 2. Habilidades & Forças
  habilidadesTecnicas: Array<{ nome: string; nivel: "Básico" | "Intermediário" | "Avançado" }>
  habilidadesComportamentais: string[]
  pontosFortes: string[]
  competenciasNovas: string[]

  // 3. Histórico de Feedbacks
  feedbacks: PDIFeedback[]

  // 4. Comportamentos a Desenvolver
  comportamentos: PDIComportamento[]

  // 5. Plano de Ação & Registro Semanal
  acoes: PDIAcao[]
  registroSemanal: {
    semana1: WeeklyLog
    semana2: WeeklyLog
    semana3: WeeklyLog
    semana4: WeeklyLog
  }

  // 6. Evidências & Entregas
  evidencias: PDIEvidencia[]

  // 7. Evolução & Reavaliações
  avaliacaoInicial: string
  revisoesPeriodicas: string
  evolucoesPercebidas: string
  pontosAtencao: string
  validacaoRotina: string
  proximosPassosEvolucao: string

  // 8. Potencial & Próximos Passos
  competenciasProximoNivel: string
  preparacaoNovasResponsabilidades: string
  necessidadesTreinamento: string
  criteriosEfetivacao: string
  decisoesAcordadas: string
  prontidao: "Pronto para Promoção" | "Pronto em 3-6 Meses" | "Em Desenvolvimento Ativo" | "Foco no Cargo Atual"
}

export interface CollaboratorBasic {
  id: string
  name: string
  role: string
  area?: string
  email?: string
  phone?: string
  joinDate?: string
  status?: string
  usuarioId?: string
  workLocation?: string
  pdiData?: PDIData
}

const DEFAULT_WEEKLY_LOG: WeeklyLog = {
  acaoPrevista: "",
  evidenciaObservada: "",
  status: "Em andamento",
  proximoPasso: ""
}

function createDefaultPDIData(colab?: Partial<CollaboratorBasic>): PDIData {
  return {
    etapaProfissional: "Desenvolvimento",
    liderancaDireta: "Gestão Comercial & Operacional",
    area: colab?.role?.toLowerCase().includes("vendas") || colab?.role?.toLowerCase().includes("comercial") ? "Comercial / Vendas" : "Operações Consignado",
    cargo: colab?.role || "Consultor de Crédito",
    objetivosProfissionais: "Aprimorar assertividade no fechamento de propostas de portabilidade e alcançar consistência de superação de metas mensais.",
    interessesCrescimento: "Assumir liderança de equipe júnior de televendas e especializar-se em negociações de alto valor.",
    
    habilidadesTecnicas: [
      { nome: "Cálculo de Coeficientes & Simulação", nivel: "Avançado" },
      { nome: "CRM SharkConsig & Discador", nivel: "Avançado" },
      { nome: "Esteiras Bancárias & Regras INSS", nivel: "Intermediário" },
      { nome: "Contorno de Objeções Telefônicas", nivel: "Intermediário" }
    ],
    habilidadesComportamentais: [
      "Comunicação persuasiva e clara",
      "Resiliência sob pressão",
      "Proatividade em follow-ups",
      "Disciplina com processos diários"
    ],
    pontosFortes: [
      "Excelente rapport inicial com aposentados e pensionistas",
      "Alto volume de ligações diárias com energia contagiante",
      "Cumprimento rigoroso das tabulações no sistema"
    ],
    competenciasNovas: [
      "Mentoria de novos consultores em fase de onboarding",
      "Negociação consultiva com clientes de grande margem"
    ],

    feedbacks: [
      {
        id: "fb-1",
        data: "08/10/2026",
        responsavel: "Coordenação de RH & Liderança",
        contexto: "Alinhamento quinzenal de desempenho e contorno de objeções em propostas de portabilidade com troco.",
        percepcaoFuncionario: "Reconheceu que sentia insegurança quando o cliente mencionava 'vou pensar' ou preferia falar com o banco de origem.",
        pontosPositivos: "Bateu meta de contatos tabulados e manteve postura ética exemplar em todas as gravações ouvidas.",
        pontosMelhoria: "Reforçar a técnica de fechamento imediato e evitar postergar a simulação com o cliente em linha.",
        combinados: "Realizar 2 simulações diárias guiadas pelo líder e registrar os aprendizados no registro semanal do PDI.",
        dataRetorno: "22/10/2026"
      }
    ],

    comportamentos: [
      {
        id: "comp-1",
        comportamento: "Hesitação no fechamento da proposta ao ouvir objeção de tempo",
        situacao: "Ao ouvir 'preciso pensar com meu filho', encerra a chamada sem apresentar o comparativo de juros.",
        impacto: "Queda na taxa de conversão direta de clientes quentes que acabam fechando com a concorrência.",
        comportamentoEsperado: "Conduzir a conversa com empatia, oferecendo enviar o comparativo em PDF e mantendo o canal ativo com horário marcado.",
        prioridade: "Alta",
        status: "Em desenvolvimento"
      },
      {
        id: "comp-2",
        comportamento: "Gestão do tempo e organização do pipeline diário",
        situacao: "Priorização desbalanceada entre novos leads e follow-ups de fichas em andamento.",
        impacto: "Atraso no retorno a clientes que solicitaram contato no turno da tarde.",
        comportamentoEsperado: "Blocos fixos de 1h30 para retorno de esteira e disparos automáticos.",
        prioridade: "Média",
        status: "Consolidado"
      }
    ],

    acoes: [
      {
        id: "acao-1",
        objetivo: "Dominar e aplicar contorno de objeções no primeiro contato",
        acoesPraticas: "Treinar a objeção 'vou pensar' em duas simulações e aplicar a técnica nas negociações reais.",
        responsavel: "Colaborador + Líder Direto",
        prazo: "31/10/2026",
        frequencia: "Semanal",
        indicador: "Taxa de conversão de leads contactados > 18%",
        resultadoEsperado: "Aumento de 25% nas propostas digitadas e redução do tempo médio de negociação.",
        resultadoAlcancado: "Em evolução positiva nas primeiras duas semanas.",
        status: "Em andamento"
      },
      {
        id: "acao-2",
        objetivo: "Certificação interna em regras e esteiras de refinanciamento",
        acoesPraticas: "Concluir módulo no Shark Treinamentos e obter pontuação superior a 90% no quiz final.",
        responsavel: "RH & Instrutor Técnico",
        prazo: "15/11/2026",
        frequencia: "Quinzenal",
        indicador: "Nota final do teste de proficiência",
        resultadoEsperado: "Zero erros de digitação por divergência de regras bancárias.",
        resultadoAlcancado: "Módulo 1 e 2 concluídos com sucesso.",
        status: "Em andamento"
      }
    ],

    registroSemanal: {
      semana1: {
        acaoPrevista: "Treinar a objeção 'vou pensar' em duas simulações e aplicar a técnica nas negociações reais.",
        evidenciaObservada: "Conduziu duas simulações com o supervisor, identificou os gatilhos da objeção e conseguiu reter 3 clientes que iriam desistir na quinta-feira.",
        status: "Concluído",
        proximoPasso: "Ajustar o tom de voz no momento de pedir a assinatura digital do contrato."
      },
      semana2: {
        acaoPrevista: "Aplicar a técnica de quebra de objeções nos contatos ativos de disparos matinais.",
        evidenciaObservada: "Registrou 14 contatos com a nova abordagem e gerou 4 propostas em digitação.",
        status: "Em andamento",
        proximoPasso: "Acompanhar a esteira de averbação junto ao time operacional."
      },
      semana3: {
        acaoPrevista: "Simulação de portabilidade com redução de taxa e foco no comparativo impresso em PDF.",
        evidenciaObservada: "",
        status: "Não iniciado",
        proximoPasso: "Agendar sessão de alinhamento com a coordenação na quarta-feira."
      },
      semana4: {
        acaoPrevista: "Avaliação final do ciclo mensal e consolidação dos números de conversão do mês.",
        evidenciaObservada: "",
        status: "Não iniciado",
        proximoPasso: "Consolidar relatório para a reunião mensal de 1:1."
      }
    },

    evidencias: [
      {
        id: "ev-1",
        titulo: "Gravação de Atendimento - Objeção Superada com Sucesso",
        atividadesConcluidas: "Aplicação da técnica de empatia e apresentação do valor presente da redução de parcelas.",
        situacaoReal: "Cliente pensionista com receio de portabilidade de outro banco.",
        resultadoAntesDepois: "Antes o cliente desligava; agora fechou proposta de R$ 18.500,00 com redução de juros.",
        linkDocumento: "Gravação ID #98241 / Shark CRM",
        evidenciaAplicacao: "Proposta digitada e averbada com sucesso no sistema.",
        validacaoLideranca: "Validado",
        dataValidacao: "11/10/2026"
      }
    ],

    avaliacaoInicial: "Colaborador admitido com excelente potencial comunicativo, porém com pouca vivência específica nas regras restritivas do consignado público e INSS.",
    revisoesPeriodicas: "Primeiro mês: rápida curva de aprendizado nas ferramentas. Segundo mês: destaque no volume de contatos diários. Momento atual: foco em qualidade e fechamento.",
    evolucoesPercebidas: "Aumento expressivo na maturidade emocional, maior postura profissional nas abordagens e domínio dos cálculos da calculadora.",
    pontosAtencao: "Atenção constante aos prazos de retorno das propostas pendentes de documentação.",
    validacaoRotina: "Demonstra comportamento aderente aos combinados em mais de 90% das rotinas diárias observadas pela supervisão.",
    proximosPassosEvolucao: "Completar o ciclo de 3 meses para avaliação de transição para o plano sênior ou líder multiplicador.",

    competenciasProximoNivel: "Capacidade analítica de relatórios de esteira, mentoria de pares e gestão de carteiras estratégicas.",
    preparacaoNovasResponsabilidades: "Acompanhar reuniões de alinhamento de metas da liderança e atuar como ponto focal em plantões de vendas.",
    necessidadesTreinamento: "Curso avançado de Negociação & Comunicação Não-Violenta e Workshop de Esteiras Digitais Avançadas.",
    criteriosEfetivacao: "Manutenção de no mínimo 100% da meta nos últimos 3 meses consecutivos, nota superior a 8,5 no PDI e zero faltas sem justificativa.",
    decisoesAcordadas: "Reavaliação formal do enquadramento de nível na reunião de final de ano (Dezembro/2026).",
    prontidao: "Pronto em 3-6 Meses"
  }
}

export default function PDIPage() {
  const [collaborators, setCollaborators] = useState<CollaboratorBasic[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterEtapa, setFilterEtapa] = useState<string>("todos")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Selection
  const [selectedColab, setSelectedColab] = useState<CollaboratorBasic | null>(null)
  const [activeTab, setActiveTab] = useState<number>(1)
  
  // Active Weekly Log Tab in Tab 5 (Semana 1 a 4)
  const [selectedSemana, setSelectedSemana] = useState<"semana1" | "semana2" | "semana3" | "semana4">("semana1")
  
  // New entry modals & states
  const [showAddFeedbackModal, setShowAddFeedbackModal] = useState(false)
  const [newFeedbackData, setNewFeedbackData] = useState<Partial<PDIFeedback>>({
    data: new Date().toLocaleDateString("pt-BR"),
    responsavel: "",
    contexto: "",
    percepcaoFuncionario: "",
    pontosPositivos: "",
    pontosMelhoria: "",
    combinados: "",
    dataRetorno: ""
  })

  const [showAddComportamentoModal, setShowAddComportamentoModal] = useState(false)
  const [newCompData, setNewCompData] = useState<Partial<PDIComportamento>>({
    comportamento: "",
    situacao: "",
    impacto: "",
    comportamentoEsperado: "",
    prioridade: "Média",
    status: "Não iniciado"
  })

  const [showAddAcaoModal, setShowAddAcaoModal] = useState(false)
  const [newAcaoData, setNewAcaoData] = useState<Partial<PDIAcao>>({
    objetivo: "",
    acoesPraticas: "",
    responsavel: "",
    prazo: "",
    frequencia: "Semanal",
    indicador: "",
    resultadoEsperado: "",
    resultadoAlcancado: "",
    status: "Em andamento"
  })

  // Load collaborators from Supabase or fallback
  useEffect(() => {
    async function fetchCollaborators() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from("hr_colaboradores")
          .select("id, nome, funcao, local_trabalho, email, telefone, data_admissao, status, usuario_id")
          .order("nome", { ascending: true })

        let list: CollaboratorBasic[] = []

        if (!error && data && data.length > 0) {
          list = data.map((d: any) => ({
            id: String(d.id),
            name: d.nome || "Colaborador",
            role: d.funcao || "Consultor",
            area: d.local_trabalho === "Home Office" ? "Vendas Remoto (Home Office)" : "Comercial Presencial",
            email: d.email || `${d.nome?.toLowerCase().replace(/\s+/g, '.')}@sharkconsig.com.br`,
            phone: d.telefone || "(11) 99999-0000",
            joinDate: d.data_admissao ? new Date(d.data_admissao).toLocaleDateString("pt-BR") : "02/01/2026",
            status: d.status || "Ativo",
            usuarioId: d.usuario_id || ""
          }))
        } else {
          // Default mock list if DB is empty so user can test right away
          list = [
            {
              id: "colab-1",
              name: "Maria Dolores Rodriguez",
              role: "Consultora de Vendas - Consignado",
              area: "Comercial / Vendas",
              email: "maria.dolores@sharkconsig.com.br",
              phone: "(11) 98765-4321",
              joinDate: "02/01/2026",
              status: "Ativo",
              usuarioId: "USR-0039"
            },
            {
              id: "colab-2",
              name: "Pablo Navarro Muñoz",
              role: "Operador de Atendimento",
              area: "Operações & Esteiras",
              email: "pablo.navarro@sharkconsig.com.br",
              phone: "(11) 98765-1122",
              joinDate: "15/02/2026",
              status: "Ativo",
              usuarioId: "USR-0040"
            },
            {
              id: "colab-3",
              name: "Sónia Jiménez Ruiz",
              role: "Supervisora Comercial",
              area: "Comercial / Liderança",
              email: "sonia.jimenez@sharkconsig.com.br",
              phone: "(11) 98765-9988",
              joinDate: "10/06/2025",
              status: "Ativo",
              usuarioId: "USR-0012"
            },
            {
              id: "colab-4",
              name: "Francisco Martín Rodriguez",
              role: "Consultor de Portabilidade",
              area: "Vendas Externas",
              email: "francisco.martin@sharkconsig.com.br",
              phone: "(11) 97654-3321",
              joinDate: "18/03/2026",
              status: "Ativo",
              usuarioId: "USR-0055"
            }
          ]
        }

        // Attach saved PDI data from localStorage for each collaborator
        const enriched = list.map((c) => {
          try {
            const saved = localStorage.getItem(`shark_pdi_data_${c.id}`)
            if (saved) {
              return { ...c, pdiData: JSON.parse(saved) }
            }
          } catch (e) {
            // ignore
          }
          return { ...c, pdiData: createDefaultPDIData(c) }
        })

        setCollaborators(enriched)
      } catch (err) {
        console.error("Erro ao carregar colaboradores do PDI:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchCollaborators()
  }, [])

  // Sync selected collaborator's changes to state and localStorage
  const handleUpdatePDIData = (updatedData: PDIData) => {
    if (!selectedColab) return
    const updatedColab = { ...selectedColab, pdiData: updatedData }
    setSelectedColab(updatedColab)
    setCollaborators((prev) => prev.map((c) => (c.id === updatedColab.id ? updatedColab : c)))

    try {
      localStorage.setItem(`shark_pdi_data_${selectedColab.id}`, JSON.stringify(updatedData))
    } catch (e) {
      console.error("Erro ao salvar PDI no localStorage:", e)
    }
  }

  const handleSaveExplicitly = () => {
    if (!selectedColab?.pdiData) return
    try {
      localStorage.setItem(`shark_pdi_data_${selectedColab.id}`, JSON.stringify(selectedColab.pdiData))
      toast.success(`Ficha do PDI de ${selectedColab.name} salva com sucesso!`)
    } catch (e) {
      toast.error("Erro ao persistir dados localmente.")
    }
  }

  // Copy Weekly Log Formatted (conforme Imagem 3.jpeg)
  const handleCopyWeeklyLog = () => {
    if (!selectedColab || !selectedColab.pdiData) return
    const curWeek = selectedColab.pdiData.registroSemanal[selectedSemana]
    const weekLabel = 
      selectedSemana === "semana1" ? "Semana 1" :
      selectedSemana === "semana2" ? "Semana 2" :
      selectedSemana === "semana3" ? "Semana 3" : "Semana 4"

    const textToCopy = `📋 REGISTRO SEMANAL — ${selectedColab.name.toUpperCase()}
────────────────────────────────────────
📌 Período: ${weekLabel}
🎯 Ação prevista:
${curWeek.acaoPrevista || "Não informada"}

👁️ Evidência observada:
${curWeek.evidenciaObservada || "Não informada"}

📊 Status do Progresso: [ ${curWeek.status.toUpperCase()} ]
🚀 Próximo passo / obstáculo identificado:
${curWeek.proximoPasso || "Não informado"}
────────────────────────────────────────
Registrado no SharkConsig CRM - Módulo PDI`

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success(`Registro da ${weekLabel} de ${selectedColab.name.split(" ")[0]} copiado para a área de transferência!`)
    }).catch(() => {
      toast.error("Não foi possível copiar o texto automaticamente.")
    })
  }

  // Filtered collaborators for the directory grid
  const filteredCollaborators = useMemo(() => {
    return collaborators.filter((c) => {
      const matchSearch = 
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
      
      if (!matchSearch) return false

      if (filterEtapa !== "todos") {
        const etapa = c.pdiData?.etapaProfissional || "Desenvolvimento"
        if (etapa !== filterEtapa) return false
      }

      return true
    })
  }, [collaborators, searchQuery, filterEtapa])

  // Get initials for avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(" ")
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const getEtapaBadgeClass = (etapa: EtapaProfissional) => {
    switch (etapa) {
      case "Integração":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Desenvolvimento":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "Acompanhamento":
        return "bg-purple-50 text-purple-700 border-purple-200"
      case "Preparação para Promoção/Efetivação":
        return "bg-amber-50 text-amber-700 border-amber-200"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Concluído":
      case "Consolidado":
      case "Validado":
        return "bg-emerald-100 text-emerald-800 border-emerald-300"
      case "Em andamento":
      case "Em desenvolvimento":
      case "Em análise":
        return "bg-blue-100 text-blue-800 border-blue-300"
      case "Precisa de reforço":
      case "Necessita reforço":
        return "bg-amber-100 text-amber-800 border-amber-300"
      default:
        return "bg-slate-100 text-slate-700 border-slate-200"
    }
  }

  return (
    <div className="flex-1 min-h-screen bg-[#F8FAFC] pb-16">
      <Header title="PDI — PLANO DE DESENVOLVIMENTO INDIVIDUAL" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* ============================================================== */}
        {/* VIEW 1: DIRETÓRIO DE COLABORADORES (Estilo Bizneo HR Imagem 1) */}
        {/* ============================================================== */}
        {!selectedColab && (
          <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Target className="w-6 h-6 text-[#00D492]" />
                    <span>Diretório de Talentos & PDI</span>
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">
                    Acompanhamento contínuo, ciclos semanais, habilidades e matriz de evolução profissional.
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        viewMode === "grid" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                      title="Visualização em Grade (Cards)"
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span className="hidden sm:inline">Grade</span>
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                        viewMode === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                      )}
                      title="Visualização em Lista"
                    >
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">Lista</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Search & Filter Chips */}
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisa por nome, cargo ou e-mail..."
                    className="w-full pl-10 pr-4 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00D492] focus:bg-white transition-all text-slate-800 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter by Etapa */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-semibold text-slate-600">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Etapa:</span>
                  {[
                    { key: "todos", label: "Todas" },
                    { key: "Integração", label: "Integração" },
                    { key: "Desenvolvimento", label: "Desenvolvimento" },
                    { key: "Acompanhamento", label: "Acompanhamento" },
                    { key: "Preparação para Promoção/Efetivação", label: "Promoção / Efetivação" }
                  ].map((chip) => (
                    <button
                      key={chip.key}
                      onClick={() => setFilterEtapa(chip.key)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all whitespace-nowrap cursor-pointer",
                        filterEtapa === chip.key
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Total counter */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>{filteredCollaborators.length} colaborador(es) encontrado(s)</span>
              <span className="text-[11px] font-medium text-slate-400">Clique em qualquer colaborador para acessar o PDI completo</span>
            </div>

            {/* GRID VIEW (Estilo Bizneo HR Imagem 1) */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCollaborators.map((c) => {
                  const etapa = c.pdiData?.etapaProfissional || "Desenvolvimento"
                  const totalAcoes = c.pdiData?.acoes?.length || 0
                  const totalFeedbacks = c.pdiData?.feedbacks?.length || 0
                  const weeklyStatus = c.pdiData?.registroSemanal?.semana1?.status || "Em andamento"

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedColab(c)
                        setActiveTab(1)
                      }}
                      className="group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md hover:border-slate-400/80 transition-all cursor-pointer flex flex-col justify-between space-y-4"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Avatar com status ativo */}
                        <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-slate-800 to-slate-900 text-white flex items-center justify-center font-black text-base shadow-sm ring-2 ring-white">
                            {getInitials(c.name)}
                          </div>
                          <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#00D492] border-2 border-white rounded-full" title="Colaborador Ativo" />
                        </div>

                        {/* Informações Básicas */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate group-hover:text-[#00D492] transition-colors">
                            {c.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                            {c.role} {c.area ? `— ${c.area}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{c.email || "email@sharkconsig.com.br"}</span>
                          </p>
                        </div>
                      </div>

                      {/* Badges de Etapa & Status */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <span className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border", getEtapaBadgeClass(etapa))}>
                          {etapa}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Desde {c.joinDate || "2026"}</span>
                        </span>
                      </div>

                      {/* Mini Indicadores de PDI */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Ações PDI</span>
                          <span className="text-xs font-black text-slate-800">{totalAcoes}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Feedbacks</span>
                          <span className="text-xs font-black text-slate-800">{totalFeedbacks}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Ciclo Sem.</span>
                          <span className="text-[10px] font-extrabold text-[#00D492] truncate block">{weeklyStatus}</span>
                        </div>
                      </div>

                      {/* Botão Acessar */}
                      <button
                        type="button"
                        className="w-full bg-slate-900 group-hover:bg-[#00D492] group-hover:text-slate-950 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <span>Acessar Ficha do Colaborador</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* LIST VIEW */
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
                      <th className="py-3.5 px-4">Colaborador</th>
                      <th className="py-3.5 px-4">Cargo & Área</th>
                      <th className="py-3.5 px-4">Etapa Profissional</th>
                      <th className="py-3.5 px-4 text-center">Ações PDI</th>
                      <th className="py-3.5 px-4 text-center">Feedbacks</th>
                      <th className="py-3.5 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                    {filteredCollaborators.map((c, idx) => (
                      <tr 
                        key={c.id} 
                        onClick={() => {
                          setSelectedColab(c)
                          setActiveTab(1)
                        }}
                        className={cn("hover:bg-slate-50 transition-colors cursor-pointer", idx % 2 === 0 ? "bg-white" : "bg-slate-50/40")}
                      >
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                            {getInitials(c.name)}
                          </div>
                          <div>
                            <span className="block text-slate-900 font-extrabold">{c.name}</span>
                            <span className="text-[11px] text-slate-400 font-normal">{c.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">{c.role}</td>
                        <td className="py-3 px-4">
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getEtapaBadgeClass(c.pdiData?.etapaProfissional || "Desenvolvimento"))}>
                            {c.pdiData?.etapaProfissional || "Desenvolvimento"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{c.pdiData?.acoes?.length || 0}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-900">{c.pdiData?.feedbacks?.length || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-[#00D492] font-bold text-xs hover:underline flex items-center justify-end gap-1">
                            Abrir Ficha <ChevronRight className="w-3 h-3" />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: FICHA DO COLABORADOR - BIZNEO HR (Imagens 2 & 3)       */}
        {/* ============================================================== */}
        {selectedColab && selectedColab.pdiData && (
          <div className="space-y-6">
            
            {/* Top Navigation & Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedColab(null)}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm cursor-pointer transition-all hover:bg-slate-50 w-fit"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>Voltar ao Diretório de Talentos</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Switch Collaborator Selector */}
                <select
                  value={selectedColab.id}
                  onChange={(e) => {
                    const found = collaborators.find((c) => c.id === e.target.value)
                    if (found) setSelectedColab(found)
                  }}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00D492]"
                >
                  {collaborators.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleSaveExplicitly}
                  className="bg-[#00D492] hover:bg-[#00BD82] text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Ficha</span>
                </button>
              </div>
            </div>

            {/* ========================================================== */}
            {/* CABEÇALHO DO COLABORADOR ESTILO BIZNEO HR (Imagem 2)       */}
            {/* ========================================================== */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                
                {/* Avatar e Dados Principais */}
                <div className="flex items-start sm:items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md ring-4 ring-slate-100">
                      {getInitials(selectedColab.name)}
                    </div>
                    <span className="absolute bottom-1 right-1 w-4 h-4 bg-[#00D492] border-2 border-white rounded-full" title="Colaborador Ativo" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                        {selectedColab.name}
                      </h2>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Ativo
                      </span>
                      <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border", getEtapaBadgeClass(selectedColab.pdiData.etapaProfissional))}>
                        {selectedColab.pdiData.etapaProfissional}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-600 font-semibold">
                      {selectedColab.role} • {selectedColab.pdiData.area}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 font-medium pt-1">
                      <span>ID: <strong className="text-slate-700 font-bold">{selectedColab.usuarioId || selectedColab.id.substring(0, 8)}</strong></span>
                      <span>Admissão: <strong className="text-slate-700 font-bold">{selectedColab.joinDate || "02/01/2026"}</strong></span>
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <strong className="text-slate-700 font-bold">{selectedColab.email}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Métricas Rápidas do Cabeçalho */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Feedbacks</span>
                    <span className="text-sm font-black text-slate-900">{selectedColab.pdiData.feedbacks.length}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ações Ativas</span>
                    <span className="text-sm font-black text-[#00D492]">{selectedColab.pdiData.acoes.length}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prontidão</span>
                    <span className="text-xs font-black text-slate-800">{selectedColab.pdiData.prontidao}</span>
                  </div>
                </div>

              </div>

              {/* ======================================================== */}
              {/* AS 8 ABAS DO BIZNEO HR & PDI                             */}
              {/* ======================================================== */}
              <div className="mt-6 pt-2 border-t border-slate-100">
                <nav className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                  {[
                    { id: 1, label: "1. Perfil & Contexto", icon: User },
                    { id: 2, label: "2. Habilidades & Forças", icon: Award },
                    { id: 3, label: "3. Histórico de Feedbacks", icon: MessageSquare },
                    { id: 4, label: "4. Comportamentos a Desenvolver", icon: AlertCircle },
                    { id: 5, label: "5. PDI & Registro Semanal", icon: Target },
                    { id: 6, label: "6. Evidências & Entregas", icon: FileCheck },
                    { id: 7, label: "7. Evolução & Reavaliações", icon: TrendingUp },
                    { id: 8, label: "8. Potencial & Próximos Passos", icon: Compass },
                  ].map((tab) => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer border",
                          isActive
                            ? "bg-slate-900 text-[#00D492] border-slate-900 shadow-sm"
                            : "bg-white text-slate-600 border-transparent hover:border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#00D492]" : "text-slate-400")} />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>

            </div>

            {/* ========================================================== */}
            {/* CONTEÚDO DAS 8 ABAS                                        */}
            {/* ========================================================== */}

            {/* ---------------------------------------------------------- */}
            {/* ABA 1: PERFIL & CONTEXTO                                   */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Card 1: Informações Gerais */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <User className="w-4 h-4 text-[#00D492]" />
                    <span>Informações Gerais do Profissional</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        value={selectedColab.name}
                        disabled
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-bold"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Cargo / Função
                        </label>
                        <input
                          type="text"
                          value={selectedColab.pdiData.cargo}
                          onChange={(e) => handleUpdatePDIData({
                            ...selectedColab.pdiData,
                            cargo: e.target.value
                          })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-[#00D492]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Área / Setor
                        </label>
                        <input
                          type="text"
                          value={selectedColab.pdiData.area}
                          onChange={(e) => handleUpdatePDIData({
                            ...selectedColab.pdiData,
                            area: e.target.value
                          })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-[#00D492]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Liderança Direta / Gestor Responsável
                      </label>
                      <input
                        type="text"
                        value={selectedColab.pdiData.liderancaDireta}
                        onChange={(e) => handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          liderancaDireta: e.target.value
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-medium focus:ring-2 focus:ring-[#00D492]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Etapa Profissional
                      </label>
                      <select
                        value={selectedColab.pdiData.etapaProfissional}
                        onChange={(e) => handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          etapaProfissional: e.target.value as EtapaProfissional
                        })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold focus:ring-2 focus:ring-[#00D492]"
                      >
                        <option value="Integração">Integração (Onboarding / Primeiros 90 dias)</option>
                        <option value="Desenvolvimento">Desenvolvimento (Consolidação de metas)</option>
                        <option value="Acompanhamento">Acompanhamento (Rotina e reciclagem)</option>
                        <option value="Preparação para Promoção/Efetivação">Preparação para Promoção / Efetivação</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card 2: Objetivos e Interesses de Crescimento */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <Sparkles className="w-4 h-4 text-[#00D492]" />
                    <span>Objetivos Profissionais & Interesses de Crescimento</span>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Objetivos Profissionais (Curto e Médio Prazo)
                      </label>
                      <textarea
                        rows={4}
                        value={selectedColab.pdiData.objetivosProfissionais}
                        onChange={(e) => handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          objetivosProfissionais: e.target.value
                        })}
                        placeholder="Ex.: Aprimorar assertividade no fechamento de propostas..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-800 font-medium focus:ring-2 focus:ring-[#00D492]"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Interesses de Crescimento & Próximos Passos na Carreira
                      </label>
                      <textarea
                        rows={4}
                        value={selectedColab.pdiData.interessesCrescimento}
                        onChange={(e) => handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          interessesCrescimento: e.target.value
                        })}
                        placeholder="Ex.: Assumir liderança de equipe júnior de televendas..."
                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-800 font-medium focus:ring-2 focus:ring-[#00D492]"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 2: HABILIDADES & PONTOS FORTES                         */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Habilidades Técnicas (Hard Skills) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
                      <Award className="w-4 h-4 text-[#00D492]" />
                      <span>Habilidades Técnicas (Hard Skills)</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {selectedColab.pdiData.habilidadesTecnicas.map((h, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <span className="text-xs font-bold text-slate-800">{h.nome}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={h.nivel}
                            onChange={(e) => {
                              const updated = [...selectedColab.pdiData.habilidadesTecnicas]
                              updated[i].nivel = e.target.value as any
                              handleUpdatePDIData({
                                ...selectedColab.pdiData,
                                habilidadesTecnicas: updated
                              })
                            }}
                            className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold px-2 py-1 text-slate-700"
                          >
                            <option value="Básico">Básico</option>
                            <option value="Intermediário">Intermediário</option>
                            <option value="Avançado">Avançado</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = selectedColab.pdiData.habilidadesTecnicas.filter((_, idx) => idx !== i)
                              handleUpdatePDIData({ ...selectedColab.pdiData, habilidadesTecnicas: updated })
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Add Hard Skill */}
                    <button
                      type="button"
                      onClick={() => {
                        const skillName = prompt("Nome da Habilidade Técnica:")
                        if (skillName) {
                          handleUpdatePDIData({
                            ...selectedColab.pdiData,
                            habilidadesTecnicas: [
                              ...selectedColab.pdiData.habilidadesTecnicas,
                              { nome: skillName, nivel: "Intermediário" }
                            ]
                          })
                        }
                      }}
                      className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-600 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar Habilidade Técnica</span>
                    </button>
                  </div>
                </div>

                {/* Habilidades Comportamentais (Soft Skills) */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <Sparkles className="w-4 h-4 text-[#00D492]" />
                    <span>Habilidades Comportamentais (Soft Skills)</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedColab.pdiData.habilidadesComportamentais.map((soft, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl">
                        <span>{soft}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = selectedColab.pdiData.habilidadesComportamentais.filter((_, idx) => idx !== i)
                            handleUpdatePDIData({ ...selectedColab.pdiData, habilidadesComportamentais: updated })
                          }}
                          className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const soft = prompt("Nome da Habilidade Comportamental:")
                      if (soft) {
                        handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          habilidadesComportamentais: [...selectedColab.pdiData.habilidadesComportamentais, soft]
                        })
                      }
                    }}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-600 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Soft Skill</span>
                  </button>
                </div>

                {/* Pontos Fortes Validados */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <CheckCircle2 className="w-4 h-4 text-[#00D492]" />
                    <span>Pontos Fortes Identificados pelo RH & Liderança</span>
                  </div>

                  <ul className="space-y-2 text-xs">
                    {selectedColab.pdiData.pontosFortes.map((ponto, i) => (
                      <li key={i} className="flex items-start gap-2 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl text-slate-800 font-semibold">
                        <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{ponto}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = selectedColab.pdiData.pontosFortes.filter((_, idx) => idx !== i)
                            handleUpdatePDIData({ ...selectedColab.pdiData, pontosFortes: updated })
                          }}
                          className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      const forte = prompt("Ponto forte identificado:")
                      if (forte) {
                        handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          pontosFortes: [...selectedColab.pdiData.pontosFortes, forte]
                        })
                      }
                    }}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-600 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Ponto Forte</span>
                  </button>
                </div>

                {/* Competências a Explorar */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-slate-900 font-black text-sm border-b border-slate-100 pb-3">
                    <Compass className="w-4 h-4 text-[#00D492]" />
                    <span>Competências para Novas Responsabilidades</span>
                  </div>

                  <ul className="space-y-2 text-xs">
                    {selectedColab.pdiData.competenciasNovas.map((comp, i) => (
                      <li key={i} className="flex items-start gap-2 bg-purple-50/50 border border-purple-100 p-2.5 rounded-xl text-slate-800 font-semibold">
                        <ChevronRight className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span className="flex-1">{comp}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = selectedColab.pdiData.competenciasNovas.filter((_, idx) => idx !== i)
                            handleUpdatePDIData({ ...selectedColab.pdiData, competenciasNovas: updated })
                          }}
                          className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    onClick={() => {
                      const comp = prompt("Competência a ser explorada:")
                      if (comp) {
                        handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          competenciasNovas: [...selectedColab.pdiData.competenciasNovas, comp]
                        })
                      }
                    }}
                    className="w-full border-2 border-dashed border-slate-200 hover:border-slate-400 text-slate-600 font-bold text-xs py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Competência</span>
                  </button>
                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 3: HISTÓRICO DE FEEDBACKS                              */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 3 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-[#00D492]" />
                      <span>Linha do Tempo de Feedbacks & Alinhamentos</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Histórico transparente de 1:1s, alinhamentos de expectativas e combinados acordados.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddFeedbackModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 text-[#00D492]" />
                    <span>Registrar Novo Feedback</span>
                  </button>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  {selectedColab.pdiData.feedbacks.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                      Nenhum feedback registrado ainda para este colaborador.
                    </div>
                  ) : (
                    selectedColab.pdiData.feedbacks.map((fb, idx) => (
                      <div key={fb.id || idx} className="relative pl-6 border-l-2 border-slate-200 space-y-3 pb-6 last:pb-0">
                        {/* Timeline Pin */}
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 ring-4 ring-white" />

                        {/* Feedback Card */}
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-slate-900">{fb.data}</span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs font-semibold text-slate-600">Por: <strong>{fb.responsavel}</strong></span>
                            </div>

                            {fb.dataRetorno && (
                              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>Retorno agendado: {fb.dataRetorno}</span>
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contexto ou Situação Abordada</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{fb.contexto}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Percepção do Colaborador</span>
                              <p className="font-semibold text-slate-800 mt-0.5">{fb.percepcaoFuncionario || "—"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200/80">
                            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">Pontos Positivos</span>
                              <p className="font-semibold text-slate-800">{fb.pontosPositivos}</p>
                            </div>
                            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
                              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block mb-1">Pontos de Melhoria</span>
                              <p className="font-semibold text-slate-800">{fb.pontosMelhoria}</p>
                            </div>
                          </div>

                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Combinados Definidos & Próximos Passos</span>
                            <p className="font-bold text-slate-900">{fb.combinados}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 4: COMPORTAMENTOS A DESENVOLVER                        */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 4 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#00D492]" />
                      <span>Matriz de Comportamentos a Desenvolver</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Mapeamento de desvios, situações recorrentes, impactos e comportamentos esperados.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddComportamentoModal(true)}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 text-[#00D492]" />
                    <span>Adicionar Comportamento</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {selectedColab.pdiData.comportamentos.map((c, i) => (
                    <div key={c.id || i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{c.comportamento}</h4>
                          <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap", getStatusBadgeClass(c.status))}>
                            {c.status}
                          </span>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Situação em que aparece:</span>
                            <p className="font-medium text-slate-700">{c.situacao}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Impacto nos resultados/trabalho:</span>
                            <p className="font-semibold text-slate-800">{c.impacto}</p>
                          </div>
                          <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Comportamento esperado:</span>
                            <p className="font-bold text-slate-900 mt-0.5">{c.comportamentoEsperado}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 text-xs">
                        <span className="text-[11px] font-bold text-slate-500">
                          Prioridade: <strong className={c.prioridade === "Alta" ? "text-rose-600" : "text-slate-800"}>{c.prioridade}</strong>
                        </span>

                        <select
                          value={c.status}
                          onChange={(e) => {
                            const updated = [...selectedColab.pdiData.comportamentos]
                            updated[i].status = e.target.value as any
                            handleUpdatePDIData({ ...selectedColab.pdiData, comportamentos: updated })
                          }}
                          className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold px-2 py-1 text-slate-800"
                        >
                          <option value="Não iniciado">Não iniciado</option>
                          <option value="Em desenvolvimento">Em desenvolvimento</option>
                          <option value="Consolidado">Consolidado</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 5: PDI & REGISTRO SEMANAL (Fiel à Imagem 3.jpeg)        */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 5 && (
              <div className="space-y-6">
                
                {/* ====================================================== */}
                {/* COMPONENTE INTERATIVO DE REGISTRO SEMANAL (Imagem 3)   */}
                {/* ====================================================== */}
                <div className="bg-white rounded-2xl border-2 border-slate-900/10 p-6 shadow-sm space-y-6">
                  
                  {/* Header do Registro Semanal */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        Registro semanal — {selectedColab.name.split(" ")[0]}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Acompanhamento prático das metas semana a semana com cópia rápida para atas de 1:1.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyWeeklyLog}
                      className="bg-slate-950 hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer self-start sm:self-auto"
                    >
                      <Copy className="w-4 h-4 text-[#00D492]" />
                      <span>Copiar registro semanal</span>
                    </button>
                  </div>

                  {/* 1. Seleção de Período (Radio buttons horizontais da Imagem 3) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Período
                    </label>
                    <div className="flex flex-wrap items-center gap-6 pt-1">
                      {[
                        { key: "semana1", label: "Semana 1" },
                        { key: "semana2", label: "Semana 2" },
                        { key: "semana3", label: "Semana 3" },
                        { key: "semana4", label: "Semana 4" },
                      ].map((sem) => (
                        <label
                          key={sem.key}
                          className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name="weekly_period"
                            checked={selectedSemana === sem.key}
                            onChange={() => setSelectedSemana(sem.key as any)}
                            className="w-4 h-4 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                          />
                          <span>{sem.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 2. Ação prevista */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Ação prevista
                    </label>
                    <textarea
                      rows={3}
                      value={selectedColab.pdiData.registroSemanal[selectedSemana].acaoPrevista}
                      onChange={(e) => {
                        const curWeek = { ...selectedColab.pdiData.registroSemanal[selectedSemana], acaoPrevista: e.target.value }
                        handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          registroSemanal: {
                            ...selectedColab.pdiData.registroSemanal,
                            [selectedSemana]: curWeek
                          }
                        })
                      }}
                      placeholder="Treinar a objeção 'vou pensar' em duas simulações e aplicar a técnica nas negociações reais."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D492] focus:border-transparent transition-all shadow-inner"
                    />
                  </div>

                  {/* 3. Evidência observada */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Evidência observada
                    </label>
                    <textarea
                      rows={3}
                      value={selectedColab.pdiData.registroSemanal[selectedSemana].evidenciaObservada}
                      onChange={(e) => {
                        const curWeek = { ...selectedColab.pdiData.registroSemanal[selectedSemana], evidenciaObservada: e.target.value }
                        handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          registroSemanal: {
                            ...selectedColab.pdiData.registroSemanal,
                            [selectedSemana]: curWeek
                          }
                        })
                      }}
                      placeholder="Ex.: conduziu duas simulações, identificou a objeção e combinou a retomada..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D492] focus:border-transparent transition-all shadow-inner"
                    />
                  </div>

                  {/* 4. Status (Radio buttons verticais da Imagem 3) */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Status
                    </label>
                    <div className="space-y-2 pt-0.5">
                      {[
                        { val: "Não iniciado", label: "Não iniciado" },
                        { val: "Em andamento", label: "Em andamento" },
                        { val: "Concluído", label: "Concluído" },
                        { val: "Precisa de reforço", label: "Precisa de reforço" },
                      ].map((opt) => (
                        <label
                          key={opt.val}
                          className="flex items-center gap-2.5 text-xs font-bold text-slate-800 cursor-pointer select-none"
                        >
                          <input
                            type="radio"
                            name="weekly_status"
                            value={opt.val}
                            checked={selectedColab.pdiData.registroSemanal[selectedSemana].status === opt.val}
                            onChange={() => {
                              const curWeek = { ...selectedColab.pdiData.registroSemanal[selectedSemana], status: opt.val as any }
                              handleUpdatePDIData({
                                ...selectedColab.pdiData,
                                registroSemanal: {
                                  ...selectedColab.pdiData.registroSemanal,
                                  [selectedSemana]: curWeek
                                }
                              })
                            }}
                            className="w-4 h-4 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer"
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 5. Próximo passo / obstáculo identificado */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Próximo passo / obstáculo identificado
                    </label>
                    <input
                      type="text"
                      value={selectedColab.pdiData.registroSemanal[selectedSemana].proximoPasso}
                      onChange={(e) => {
                        const curWeek = { ...selectedColab.pdiData.registroSemanal[selectedSemana], proximoPasso: e.target.value }
                        handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          registroSemanal: {
                            ...selectedColab.pdiData.registroSemanal,
                            [selectedSemana]: curWeek
                          }
                        })
                      }}
                      placeholder="O que será feito, por quem e até quando?"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00D492] focus:border-transparent transition-all shadow-inner"
                    />
                  </div>

                  {/* Botão de Rodapé Copiar Registro Semanal (Idêntico ao da imagem 3) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleCopyWeeklyLog}
                      className="w-full bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-[#00D492]" />
                      <span>Copiar registro semanal</span>
                    </button>
                  </div>

                </div>

                {/* ====================================================== */}
                {/* TABELA DE METAS E AÇÕES PRÁTICAS DO PDI                */}
                {/* ====================================================== */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                        <Target className="w-5 h-5 text-[#00D492]" />
                        <span>Metas & Plano de Ação Individual (PDI)</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Objetivos de desenvolvimento, atividades propostas, prazos e indicadores de sucesso.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddAcaoModal(true)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                    >
                      <Plus className="w-4 h-4 text-[#00D492]" />
                      <span>Adicionar Nova Meta</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
                          <th className="py-3 px-3 rounded-l-lg">Objetivo</th>
                          <th className="py-3 px-3">Ações Práticas</th>
                          <th className="py-3 px-3">Responsável</th>
                          <th className="py-3 px-3">Prazo</th>
                          <th className="py-3 px-3">Indicador</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3 text-right rounded-r-lg">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                        {selectedColab.pdiData.acoes.map((acao, i) => (
                          <tr key={acao.id || i} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 font-bold text-slate-900">{acao.objetivo}</td>
                            <td className="py-3 px-3 text-slate-600">{acao.acoesPraticas}</td>
                            <td className="py-3 px-3 text-slate-500">{acao.responsavel}</td>
                            <td className="py-3 px-3 font-bold text-slate-800">{acao.prazo}</td>
                            <td className="py-3 px-3 text-slate-600">{acao.indicador}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", getStatusBadgeClass(acao.status))}>
                                {acao.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = selectedColab.pdiData.acoes.filter((_, idx) => idx !== i)
                                  handleUpdatePDIData({ ...selectedColab.pdiData, acoes: updated })
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 6: EVIDÊNCIAS & ENTREGAS                               */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 6 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <FileCheck className="w-5 h-5 text-[#00D492]" />
                      <span>Repositório de Evidências & Entregas</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Comprovação do que foi realizado e aprendido, registros de situações reais e validação da liderança.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const titulo = prompt("Título da evidência / entrega:")
                      if (titulo) {
                        const novaEv: PDIEvidencia = {
                          id: `ev-${Date.now()}`,
                          titulo,
                          atividadesConcluidas: "Aplicação prática das novas rotinas combinadas no PDI.",
                          situacaoReal: "Atendimento ou projeto com cliente real.",
                          resultadoAntesDepois: "Melhoria perceptível na conversão e satisfação.",
                          linkDocumento: "Link ou ID de proposta anexada",
                          evidenciaAplicacao: "Demonstrada na prática diária.",
                          validacaoLideranca: "Validado",
                          dataValidacao: new Date().toLocaleDateString("pt-BR")
                        }
                        handleUpdatePDIData({
                          ...selectedColab.pdiData,
                          evidencias: [...selectedColab.pdiData.evidencias, novaEv]
                        })
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm self-start sm:self-auto"
                  >
                    <Plus className="w-4 h-4 text-[#00D492]" />
                    <span>Adicionar Evidência</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {selectedColab.pdiData.evidencias.map((ev, i) => (
                    <div key={ev.id || i} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#00D492]" />
                          <h4 className="font-extrabold text-sm text-slate-900">{ev.titulo}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border", getStatusBadgeClass(ev.validacaoLideranca))}>
                            {ev.validacaoLideranca}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">Data: {ev.dataValidacao}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Atividades Concluídas</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{ev.atividadesConcluidas}</p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Situação Real Enfrentada</span>
                          <p className="font-semibold text-slate-800 mt-0.5">{ev.situacaoReal}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-slate-200/80">
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Resultado Antes vs Depois</span>
                          <p className="font-bold text-slate-900">{ev.resultadoAntesDepois}</p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Material / Link de Comprovação</span>
                          <p className="font-bold text-slate-900 flex items-center gap-1.5">
                            <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                            <span>{ev.linkDocumento}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 7: EVOLUÇÃO & REAVALIAÇÕES                             */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 7 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#00D492]" />
                    <span>Evolução & Reavaliações Periódicas</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Comparativo entre o ponto de partida e o momento atual da jornada profissional.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Avaliação Inicial (Ponto de Partida)
                    </label>
                    <textarea
                      rows={4}
                      value={selectedColab.pdiData.avaliacaoInicial}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        avaliacaoInicial: e.target.value
                      })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Revisões Periódicas Realizadas
                    </label>
                    <textarea
                      rows={4}
                      value={selectedColab.pdiData.revisoesPeriodicas}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        revisoesPeriodicas: e.target.value
                      })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-1.5">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Evoluções Percebidas na Rotina
                    </label>
                    <textarea
                      rows={4}
                      value={selectedColab.pdiData.evolucoesPercebidas}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        evolucoesPercebidas: e.target.value
                      })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl space-y-1.5">
                    <label className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                      Pontos que Continuam Exigindo Atenção
                    </label>
                    <textarea
                      rows={4}
                      value={selectedColab.pdiData.pontosAtencao}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        pontosAtencao: e.target.value
                      })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ---------------------------------------------------------- */}
            {/* ABA 8: POTENCIAL & PRÓXIMOS PASSOS                         */}
            {/* ---------------------------------------------------------- */}
            {activeTab === 8 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <Compass className="w-5 h-5 text-[#00D492]" />
                      <span>Potencial, Prontidão & Plano de Carreira</span>
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Visibilidade de oportunidades, competências para o próximo nível e critérios para promoção/efetivação.
                    </p>
                  </div>

                  {/* Prontidão Badge / Selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Prontidão:</span>
                    <select
                      value={selectedColab.pdiData.prontidao}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        prontidao: e.target.value as any
                      })}
                      className="bg-slate-900 text-[#00D492] font-black text-xs px-3 py-2 rounded-xl border border-slate-800 focus:outline-none"
                    >
                      <option value="Pronto para Promoção">Pronto para Promoção (Imediato)</option>
                      <option value="Pronto em 3-6 Meses">Pronto em 3-6 Meses</option>
                      <option value="Em Desenvolvimento Ativo">Em Desenvolvimento Ativo</option>
                      <option value="Foco no Cargo Atual">Foco no Cargo Atual</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Competências Necessárias para o Próximo Nível
                    </label>
                    <textarea
                      rows={3}
                      value={selectedColab.pdiData.competenciasProximoNivel}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        competenciasProximoNivel: e.target.value
                      })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Preparação para Novas Responsabilidades
                    </label>
                    <textarea
                      rows={3}
                      value={selectedColab.pdiData.preparacaoNovasResponsabilidades}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        preparacaoNovasResponsabilidades: e.target.value
                      })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Necessidades de Treinamento & Capacitação
                    </label>
                    <textarea
                      rows={3}
                      value={selectedColab.pdiData.necessidadesTreinamento}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        necessidadesTreinamento: e.target.value
                      })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 font-medium"
                    />
                  </div>

                  <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-xl space-y-1.5">
                    <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                      Critérios para Efetivação ou Promoção
                    </label>
                    <textarea
                      rows={3}
                      value={selectedColab.pdiData.criteriosEfetivacao}
                      onChange={(e) => handleUpdatePDIData({
                        ...selectedColab.pdiData,
                        criteriosEfetivacao: e.target.value
                      })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-3 text-slate-800 font-medium"
                    />
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
                  <span className="text-[10px] font-extrabold text-[#00D492] uppercase tracking-wider block">
                    Decisões & Encaminhamentos Acordados (RH & Liderança)
                  </span>
                  <textarea
                    rows={3}
                    value={selectedColab.pdiData.decisoesAcordadas}
                    onChange={(e) => handleUpdatePDIData({
                      ...selectedColab.pdiData,
                      decisoesAcordadas: e.target.value
                    })}
                    placeholder="Decisões pactuadas para os próximos ciclos de desenvolvimento..."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00D492]"
                  />
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      {/* ============================================================== */}
      {/* MODAL: NOVO FEEDBACK                                           */}
      {/* ============================================================== */}
      {showAddFeedbackModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00D492]" />
                <span>Registrar Novo Feedback (1:1)</span>
              </h3>
              <button
                onClick={() => setShowAddFeedbackModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Data</label>
                  <input
                    type="text"
                    value={newFeedbackData.data}
                    onChange={(e) => setNewFeedbackData({ ...newFeedbackData, data: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Responsável</label>
                  <input
                    type="text"
                    value={newFeedbackData.responsavel}
                    onChange={(e) => setNewFeedbackData({ ...newFeedbackData, responsavel: e.target.value })}
                    placeholder="Nome do Líder / RH"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Contexto ou Situação Abordada</label>
                <input
                  type="text"
                  value={newFeedbackData.contexto}
                  onChange={(e) => setNewFeedbackData({ ...newFeedbackData, contexto: e.target.value })}
                  placeholder="Ex.: Alinhamento de metas de conversão de propostas..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Percepção do Colaborador</label>
                <input
                  type="text"
                  value={newFeedbackData.percepcaoFuncionario}
                  onChange={(e) => setNewFeedbackData({ ...newFeedbackData, percepcaoFuncionario: e.target.value })}
                  placeholder="Como o colaborador reagiu..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-emerald-700 block mb-1">Pontos Positivos</label>
                  <textarea
                    rows={2}
                    value={newFeedbackData.pontosPositivos}
                    onChange={(e) => setNewFeedbackData({ ...newFeedbackData, pontosPositivos: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-amber-700 block mb-1">Pontos de Melhoria</label>
                  <textarea
                    rows={2}
                    value={newFeedbackData.pontosMelhoria}
                    onChange={(e) => setNewFeedbackData({ ...newFeedbackData, pontosMelhoria: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Combinados Definidos</label>
                <input
                  type="text"
                  value={newFeedbackData.combinados}
                  onChange={(e) => setNewFeedbackData({ ...newFeedbackData, combinados: e.target.value })}
                  placeholder="Acordos e ações práticas..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Data para Retomar o Assunto (Follow-up)</label>
                <input
                  type="text"
                  value={newFeedbackData.dataRetorno}
                  onChange={(e) => setNewFeedbackData({ ...newFeedbackData, dataRetorno: e.target.value })}
                  placeholder="dd/mm/aaaa"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddFeedbackModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newFeedbackData.responsavel || !newFeedbackData.contexto) {
                    toast.error("Preencha ao menos o responsável e o contexto.")
                    return
                  }
                  const created: PDIFeedback = {
                    id: `fb-${Date.now()}`,
                    data: newFeedbackData.data || new Date().toLocaleDateString("pt-BR"),
                    responsavel: newFeedbackData.responsavel || "",
                    contexto: newFeedbackData.contexto || "",
                    percepcaoFuncionario: newFeedbackData.percepcaoFuncionario || "",
                    pontosPositivos: newFeedbackData.pontosPositivos || "",
                    pontosMelhoria: newFeedbackData.pontosMelhoria || "",
                    combinados: newFeedbackData.combinados || "",
                    dataRetorno: newFeedbackData.dataRetorno || ""
                  }
                  handleUpdatePDIData({
                    ...selectedColab.pdiData!,
                    feedbacks: [created, ...selectedColab.pdiData!.feedbacks]
                  })
                  setShowAddFeedbackModal(false)
                  toast.success("Feedback registrado com sucesso!")
                }}
                className="bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Salvar Feedback
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVO COMPORTAMENTO                                      */}
      {/* ============================================================== */}
      {showAddComportamentoModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#00D492]" />
                <span>Adicionar Comportamento a Desenvolver</span>
              </h3>
              <button
                onClick={() => setShowAddComportamentoModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Comportamento Identificado</label>
                <input
                  type="text"
                  value={newCompData.comportamento}
                  onChange={(e) => setNewCompData({ ...newCompData, comportamento: e.target.value })}
                  placeholder="Ex.: Hesitação no fechamento ao ouvir objeção..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Situação em que ele aparece</label>
                <input
                  type="text"
                  value={newCompData.situacao}
                  onChange={(e) => setNewCompData({ ...newCompData, situacao: e.target.value })}
                  placeholder="Ex.: Chamadas ativas de portabilidade..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-rose-500 block mb-1">Impacto no trabalho ou resultados</label>
                <input
                  type="text"
                  value={newCompData.impacto}
                  onChange={(e) => setNewCompData({ ...newCompData, impacto: e.target.value })}
                  placeholder="Ex.: Perda de clientes quentes..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-emerald-700 block mb-1">Comportamento Esperado</label>
                <textarea
                  rows={2}
                  value={newCompData.comportamentoEsperado}
                  onChange={(e) => setNewCompData({ ...newCompData, comportamentoEsperado: e.target.value })}
                  placeholder="Padrão de excelência acordado..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Prioridade</label>
                  <select
                    value={newCompData.prioridade}
                    onChange={(e) => setNewCompData({ ...newCompData, prioridade: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Status</label>
                  <select
                    value={newCompData.status}
                    onChange={(e) => setNewCompData({ ...newCompData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="Não iniciado">Não iniciado</option>
                    <option value="Em desenvolvimento">Em desenvolvimento</option>
                    <option value="Consolidado">Consolidado</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddComportamentoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newCompData.comportamento) {
                    toast.error("Informe o comportamento a ser trabalhado.")
                    return
                  }
                  const created: PDIComportamento = {
                    id: `comp-${Date.now()}`,
                    comportamento: newCompData.comportamento || "",
                    situacao: newCompData.situacao || "",
                    impacto: newCompData.impacto || "",
                    comportamentoEsperado: newCompData.comportamentoEsperado || "",
                    prioridade: newCompData.prioridade as any || "Média",
                    status: newCompData.status as any || "Não iniciado"
                  }
                  handleUpdatePDIData({
                    ...selectedColab.pdiData!,
                    comportamentos: [...selectedColab.pdiData!.comportamentos, created]
                  })
                  setShowAddComportamentoModal(false)
                  toast.success("Comportamento adicionado!")
                }}
                className="bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Salvar Comportamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: NOVA META PDI                                           */}
      {/* ============================================================== */}
      {showAddAcaoModal && selectedColab && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00D492]" />
                <span>Adicionar Meta ao PDI</span>
              </h3>
              <button
                onClick={() => setShowAddAcaoModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-600 block mb-1">Objetivo de Desenvolvimento</label>
                <input
                  type="text"
                  value={newAcaoData.objetivo}
                  onChange={(e) => setNewAcaoData({ ...newAcaoData, objetivo: e.target.value })}
                  placeholder="Ex.: Dominar e aplicar contorno de objeções..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Ações Práticas e Atividades Propostas</label>
                <textarea
                  rows={2}
                  value={newAcaoData.acoesPraticas}
                  onChange={(e) => setNewAcaoData({ ...newAcaoData, acoesPraticas: e.target.value })}
                  placeholder="Ex.: Treinar a objeção 'vou pensar' em duas simulações..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Responsável</label>
                  <input
                    type="text"
                    value={newAcaoData.responsavel}
                    onChange={(e) => setNewAcaoData({ ...newAcaoData, responsavel: e.target.value })}
                    placeholder="Colaborador + Líder"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Prazo</label>
                  <input
                    type="text"
                    value={newAcaoData.prazo}
                    onChange={(e) => setNewAcaoData({ ...newAcaoData, prazo: e.target.value })}
                    placeholder="dd/mm/aaaa"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Frequência</label>
                  <select
                    value={newAcaoData.frequencia}
                    onChange={(e) => setNewAcaoData({ ...newAcaoData, frequencia: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="Semanal">Semanal</option>
                    <option value="Quinzenal">Quinzenal</option>
                    <option value="Mensal">Mensal</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-600 block mb-1">Status</label>
                  <select
                    value={newAcaoData.status}
                    onChange={(e) => setNewAcaoData({ ...newAcaoData, status: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 font-bold"
                  >
                    <option value="Não iniciado">Não iniciado</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Precisa de reforço">Precisa de reforço</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-600 block mb-1">Indicador de Evolução</label>
                <input
                  type="text"
                  value={newAcaoData.indicador}
                  onChange={(e) => setNewAcaoData({ ...newAcaoData, indicador: e.target.value })}
                  placeholder="Ex.: Taxa de conversão de leads > 18%"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddAcaoModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newAcaoData.objetivo) {
                    toast.error("Informe o objetivo de desenvolvimento.")
                    return
                  }
                  const created: PDIAcao = {
                    id: `acao-${Date.now()}`,
                    objetivo: newAcaoData.objetivo || "",
                    acoesPraticas: newAcaoData.acoesPraticas || "",
                    responsavel: newAcaoData.responsavel || "Colaborador",
                    prazo: newAcaoData.prazo || "A definir",
                    frequencia: newAcaoData.frequencia as any || "Semanal",
                    indicador: newAcaoData.indicador || "",
                    resultadoEsperado: newAcaoData.resultadoEsperado || "",
                    resultadoAlcancado: newAcaoData.resultadoAlcancado || "",
                    status: newAcaoData.status as any || "Em andamento"
                  }
                  handleUpdatePDIData({
                    ...selectedColab.pdiData!,
                    acoes: [...selectedColab.pdiData!.acoes, created]
                  })
                  setShowAddAcaoModal(false)
                  toast.success("Meta adicionada ao PDI!")
                }}
                className="bg-slate-900 hover:bg-[#00D492] hover:text-slate-950 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
