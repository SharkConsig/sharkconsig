"use client"

import React, { useState } from "react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/context/auth-context"
import { 
  ShieldAlert, 
  Loader2, 
  Check, 
  Copy, 
  Search, 
  MessageSquare, 
  ArrowDown, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Calculator, 
  FileText, 
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  ArrowUp,
  Sparkles,
  Phone,
  Bookmark,
  TrendingDown,
  Percent,
  Layers,
  FileCheck,
  Send,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  Info,
  X,
  SlidersHorizontal,
  Compass,
  CheckCheck,
  Download
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function StartComercialDevPage() {
  const { perfil, user, isLoading, isAdmin, isDeveloper, isCorretor } = useAuth()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("todos")
  const [activeTab2, setActiveTab2] = useState<"inicial" | "contexto">("inicial")
  const [activeTab6, setActiveTab6] = useState<"senff" | "facultativa" | "reacoes" | "plano" | "quitacao" | "documentos">("senff")
  const [activeStep, setActiveStep] = useState<number | "all">(1)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  const regimeUpper = (perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || '').toUpperCase().trim()
  const isCorretorPJ = (perfil?.role === 'Corretor' || isCorretor) && regimeUpper === 'PJ'

  const isAuthorized = 
    isAdmin || 
    isDeveloper || 
    perfil?.role === 'Desenvolvedor' || 
    user?.user_metadata?.role === 'Desenvolvedor' || 
    perfil?.role === 'Administrador' || 
    user?.user_metadata?.role === 'Administrador' || 
    isCorretorPJ ||
    user?.email === "donajericoescritorio@gmail.com"

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  const downloadImage = async (url: string, filename: string = "nova_parametrizacao_pm_sp.png") => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch {
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  const goToStep = (stepNumber: number | "all") => {
    setActiveStep(stepNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToStep = (stepId: string) => {
    if (stepId === "indice-fluxo") {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const el = document.getElementById(stepId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/80">
        <Header title="START COMERCIAL" />
        <main className="flex-1 flex items-center justify-center p-6">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </main>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50/80">
        <Header title="START COMERCIAL" />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white p-6 rounded-2xl border border-slate-200 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900">Acesso Restrito</h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              Esta área está em desenvolvimento e é visível exclusivamente para os perfis autorizados.
            </p>
          </div>
        </main>
      </div>
    )
  }

  // Objeções do Apoio Rápido "Cliente disse..."
  const quickSupportItems = [
    {
      id: "apoio-1",
      category: "interesse",
      clientSays: "Não tenho interesse.",
      response: "Tranquilo.\n\nSó para eu encerrar corretamente: hoje o problema é *não precisar de valor*, *não querer mexer na folha* ou *já ter resolvido isso*?",
      whenToUse: "Descobre a causa real sem confrontar.",
      nextStep: "SONDAGEM"
    },
    {
      id: "apoio-2",
      category: "interesse",
      clientSays: "Vou pensar / Preciso analisar.",
      response: "Claro.\n\nPara eu não ficar te procurando sem contexto: o que você quer avaliar melhor - *necessidade*, *valor*, *parcela*, *prazo* ou *segurança*?",
      whenToUse: "Cria critério objetivo para follow-up.",
      nextStep: "RETOMAR PELO MOTIVO IDENTIFICADO"
    },
    {
      id: "apoio-3",
      category: "interesse",
      clientSays: "Agora não posso falar.",
      response: "Sem problema. Tem uma situação importante para te falar.\n\nPrefere que eu te chame ainda *hoje* ou em *outro dia*?",
      whenToUse: "Combina retorno em vez de dizer 'te ligo mais tarde' sem autorização.",
      nextStep: "AGENDAR RETORNO"
    },
    {
      id: "apoio-4",
      category: "banco",
      clientSays: "Faço tudo direto com meu banco.",
      response: "Faz sentido.\n\nMinha proposta é só te dar uma *segunda referência*.\n\nSe o teu banco ficar melhor, você segue com ele.\n\nMe passa a condição que te deram e eu *comparo lado a lado*.",
      whenToUse: "Não ataque o banco de relacionamento. Respeite e crie comparação.",
      nextStep: "COMPARAR CONDIÇÃO"
    },
    {
      id: "apoio-5",
      category: "banco",
      clientSays: "Qual banco é esse? (Antes do cálculo)",
      response: "Eu ainda estou comparando qual estrutura fica melhor para o teu perfil.\n\nAssim que eu fechar o cenário, te digo a instituição junto com *valor*, *parcela* e *prazo* - antes de qualquer avanço.",
      whenToUse: "Não precisa esconder; apenas não chute antes de ter base.",
      nextStep: "CALCULAR / DEFINIR CENÁRIO"
    },
    {
      id: "apoio-6",
      category: "banco",
      clientSays: "Qual banco é esse? (Depois do cálculo)",
      response: "Nesse cenário, a melhor condição é da estrutura que te apresentei.\n\nEla é bem diferenciada, por isso tem validade por pouquíssimo tempo.",
      whenToUse: "Depois de cenário definido. Entre no mérito do banco apenas se o cliente questionar novamente.",
      nextStep: "AVANÇAR PARA PROPOSTA"
    },
    {
      id: "apoio-7",
      category: "seguranca",
      clientSays: "Isso parece golpe / Não confio.",
      response: "Você está certo em validar.\n\nAntes de qualquer documento, eu te envio nossos *canais oficiais* para conferir empresa e atendimento.\n\nA formalização acontece pelo *fluxo oficial da instituição* e *não existe pagamento antecipado nem posterior*, pois recebemos diretamente do banco.\n\nDepois de validar, você decide se quer continuar.",
      whenToUse: "Enviar imediatamente o kit oficial de confiança da Acerto (Instagram @acertofacilpromotora, Reclame Aqui, Google).",
      nextStep: "ENVIAR KIT DE CONFIANÇA"
    },
    {
      id: "apoio-8",
      category: "seguranca",
      clientSays: "Já recebi muitos contatos e tentativas de golpe.",
      response: "Imagino.\n\nEntão não vou te pedir para confiar só no que eu estou dizendo.\n\nEu te mando as *referências oficiais*, você valida com calma e só depois a gente continua.",
      whenToUse: "Prova antes de argumento. Não discuta.",
      nextStep: "ENVIAR PROVAS E CANAIS"
    },
    {
      id: "apoio-9",
      category: "seguranca",
      clientSays: "Como conseguiu meu contato?",
      response: "Atuamos com praticamente todos os bancos e recebemos sinalizações quando há disponibilidade em condição especial. Faz sentido avaliarmos o cenário do teu caso ou encerramos a tratativa?",
      whenToUse: "Explicação formal e respeitosa com chamada para decisão.",
      nextStep: "DECIDIR SEGUIR"
    },
    {
      id: "apoio-10",
      category: "valor",
      clientSays: "Não tenho margem.",
      response: "Pode ser que você esteja olhando uma margem diferente da que o sistema considera para essa operação.\n\nEu confiro a leitura do sistema antes de concluir.\n\nSe realmente não houver espaço, eu te aviso sem insistir.",
      whenToUse: "Validação em vez de discussão com o cliente.",
      nextStep: "VALIDAR LEITURA NO SISTEMA"
    },
    {
      id: "apoio-11",
      category: "valor",
      clientSays: "O valor ficou muito baixo.",
      response: "Qual valor faria sentido para você considerar?\n\nEu vejo se a margem sustenta algo próximo; se não sustentar, eu já te digo sem rodeio.",
      whenToUse: "Converte 'baixo' em um número objetivo antes de recalcular.",
      nextStep: "RECALCULAR SE HOUVER ESPAÇO"
    },
    {
      id: "apoio-12",
      category: "valor",
      clientSays: "A taxa é boa demais para ser verdade.",
      response: "Essa taxa é do cenário que eu validei.\n\nEu te mostro junto *valor*, *parcela*, *prazo* e *instituição* para você conferir a condição inteira antes de formalizar.",
      whenToUse: "Sem 'pode confiar' genérico. Mostre os números da operação.",
      nextStep: "APRESENTAR PLANO / COMPARATIVO"
    },
    {
      id: "apoio-13",
      category: "plano",
      clientSays: "Por que o prazo não aparece igual no contrato?",
      response: "Porque o contrato mostra o *prazo da tabela bancária* e o plano mostra a *redução projetada por amortização*.\n\nEu te separo as duas coisas para você enxergar exatamente o que está contratando e o que será antecipado.",
      whenToUse: "Clareza antes do aceite. Separe contrato bancário de duração projetada.",
      nextStep: "EXPLICAR AMORTIZAÇÃO"
    },
    {
      id: "apoio-14",
      category: "plano",
      clientSays: "Esse PDF é o boleto? / Como recebo o boleto?",
      response: "Não. Esse arquivo é o *plano de amortização*, para você visualizar a programação.\n\nO boleto/código de barras é emitido pelo *canal oficial definido para essa operação* quando chegar o momento da amortização.\n\nEu te acompanho em cada passo.",
      whenToUse: "Evita confundir plano de amortização com instrumento de cobrança.",
      nextStep: "DIRECIONAR CANAL OFICIAL"
    },
    {
      id: "apoio-15",
      category: "plano",
      clientSays: "Não vou mandar documento.",
      response: "Sem problema.\n\nNão envie enquanto não estiver confortável.\n\nPrimeiro eu te explico a *condição*, a *empresa* e o *fluxo de formalização*; depois você decide se quer avançar.",
      whenToUse: "Gera segurança antes da coleta documental.",
      nextStep: "ESCLARECER PROCESSO"
    }
  ]

  const filteredApoio = quickSupportItems.filter(item => {
    const matchesCat = activeCategory === "todos" || item.category === activeCategory
    const matchesSearch = searchQuery === "" || 
      item.clientSays.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.response.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.whenToUse.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCat && matchesSearch
  })

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc]">
      <Header title="START COMERCIAL" />

      <div className="w-full px-4 md:px-6 lg:px-10 max-w-[1240px] mx-auto mt-6">
        {/* ========================================================================= */}
        {/* 1. STEPPER INTERATIVO DO FLUXO COMERCIAL (PIPELINE) */}
        {/* ========================================================================= */}
        <section id="indice-fluxo" className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm mb-8 w-full transition-all scroll-mt-44 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                  Esteira da Negociação Comercial
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 font-medium mt-0.5">
                {activeStep === "all" 
                  ? "Exibindo todas as 6 etapas do fluxo comercial na página."
                  : `Você está na Etapa ${activeStep} de 6. Siga as orientações focadas abaixo:`}
              </p>
            </div>

            {/* TOGGLE MODO FOCO vs VER TODAS */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => goToStep(activeStep === "all" ? 1 : "all")}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5",
                  activeStep === "all"
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                )}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {activeStep === "all" ? "✓ Todas as Etapas Abertas" : "Ver Todas as Etapas"}
              </button>
            </div>
          </div>

          {/* PIPELINE / STEPPER DE 6 CARDS INTERATIVOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            
            {/* ETAPA 1 */}
            <button
              onClick={() => goToStep(1)}
              className={cn(
                "w-full text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 1
                  ? "bg-emerald-950 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30 scale-[1.02]"
                  : "bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-300 text-emerald-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 1 ? "bg-emerald-500 text-white" : "bg-emerald-600 text-white"
                  )}>
                    Etapa 1
                  </span>
                  {activeStep === 1 && (
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 1 ? "text-white" : "text-emerald-950")}>
                  1. ACIONEI O LEAD
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 1 ? "text-emerald-200" : "text-emerald-800")}>
                  Envie a mensagem inicial e busque resposta.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 1 ? "text-emerald-400 translate-x-1" : "text-emerald-600")} />
              </div>
            </button>

            {/* ETAPA 2 */}
            <button
              onClick={() => goToStep(2)}
              className={cn(
                "w-full text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 2
                  ? "bg-blue-950 text-white border-blue-500 shadow-md ring-2 ring-blue-500/30 scale-[1.02]"
                  : "bg-blue-50/70 hover:bg-blue-100/80 border-blue-300 text-blue-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 2 ? "bg-blue-500 text-white" : "bg-blue-600 text-white"
                  )}>
                    Etapa 2
                  </span>
                  {activeStep === 2 && (
                    <span className="text-[9px] font-black text-blue-400 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 2 ? "text-white" : "text-blue-950")}>
                  2. RESPONDEU?
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 2 ? "text-blue-200" : "text-blue-800")}>
                  SIM → Sonde. NÃO → Use a retomada prevista.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 2 ? "text-blue-400 translate-x-1" : "text-blue-600")} />
              </div>
            </button>

            {/* ETAPA 3 */}
            <button
              onClick={() => goToStep(3)}
              className={cn(
                "w-full text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 3
                  ? "bg-amber-950 text-white border-amber-500 shadow-md ring-2 ring-amber-500/30 scale-[1.02]"
                  : "bg-amber-50/70 hover:bg-amber-100/80 border-amber-300 text-amber-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 3 ? "bg-amber-500 text-white" : "bg-amber-600 text-white"
                  )}>
                    Etapa 3
                  </span>
                  {activeStep === 3 && (
                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 3 ? "text-white" : "text-amber-950")}>
                  3. O QUE ELE QUER?
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 3 ? "text-amber-200" : "text-amber-800")}>
                  Já tem proposta? Mais valor? Prazo menor? Segurança?
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 3 ? "text-amber-400 translate-x-1" : "text-amber-600")} />
              </div>
            </button>

            {/* ETAPA 4 */}
            <button
              onClick={() => goToStep(4)}
              className={cn(
                "w-full text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 4
                  ? "bg-indigo-950 text-white border-indigo-500 shadow-md ring-2 ring-indigo-500/30 scale-[1.02]"
                  : "bg-indigo-50/70 hover:bg-indigo-100/80 border-indigo-300 text-indigo-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 4 ? "bg-indigo-500 text-white" : "bg-indigo-600 text-white"
                  )}>
                    Etapa 4
                  </span>
                  {activeStep === 4 && (
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 4 ? "text-white" : "text-indigo-950")}>
                  4. TENHO BASE PARA CRAVAR NÚMEROS?
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 4 ? "text-indigo-200" : "text-indigo-800")}>
                  SIM → Calcule e apresente. NÃO → Consulte primeiro.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 4 ? "text-indigo-400 translate-x-1" : "text-indigo-600")} />
              </div>
            </button>

            {/* ETAPA 5 */}
            <button
              onClick={() => goToStep(5)}
              className={cn(
                "w-full text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 5
                  ? "bg-rose-950 text-white border-rose-500 shadow-md ring-2 ring-rose-500/30 scale-[1.02]"
                  : "bg-rose-50/70 hover:bg-rose-100/80 border-rose-300 text-rose-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 5 ? "bg-rose-500 text-white" : "bg-rose-600 text-white"
                  )}>
                    Etapa 5
                  </span>
                  {activeStep === 5 && (
                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 5 ? "text-white" : "text-rose-950")}>
                  5. SURGIU DÚVIDA TÉCNICA?
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 5 ? "text-rose-200" : "text-rose-800")}>
                  SIM → Abra chamado. NÃO → Continue o fluxo comercial.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 5 ? "text-rose-400 translate-x-1" : "text-rose-600")} />
              </div>
            </button>

            {/* ETAPA 6 */}
            <button
              onClick={() => goToStep(6)}
              className={cn(
                "w-full text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 6
                  ? "bg-teal-950 text-white border-teal-500 shadow-md ring-2 ring-teal-500/30 scale-[1.02]"
                  : "bg-teal-50/70 hover:bg-teal-100/80 border-teal-300 text-teal-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 6 ? "bg-teal-500 text-white" : "bg-teal-600 text-white"
                  )}>
                    Etapa 6
                  </span>
                  {activeStep === 6 && (
                    <span className="text-[9px] font-black text-teal-400 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 6 ? "text-white" : "text-teal-950")}>
                  6. ACEITOU?
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 6 ? "text-teal-200" : "text-teal-800")}>
                  SIM → Documentos / formalização. PAROU → Retome do ponto exato.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 6 ? "text-teal-400 translate-x-1" : "text-teal-600")} />
              </div>
            </button>

          </div>
        </section>
      </div>

      <main className="flex-1 px-4 md:px-6 lg:px-10 pb-24 pt-0 max-w-[1240px] w-full mx-auto space-y-10">

        {/* ========================================================================= */}
        {/* ETAPA 1: PEGUE UM LEAD (ACIONEI O CLIENTE) */}
        {/* ========================================================================= */}
        {(activeStep === 1 || activeStep === "all") && (
        <section id="etapa-1" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
                1
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Pegue um lead
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Saia da etapa com um cliente acionado — não com uma proposta pronta.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FAÇA AGORA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Faça Agora</h3>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[12.75px] font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Abra uma campanha ou base ativa.</span>
                </li>
                <li className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[12.75px] font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Pegue um cliente.</span>
                </li>
                <li className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[12.75px] font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Confira somente o contexto essencial: <strong>nome</strong>, <strong>órgão/convênio</strong> e <strong>origem da campanha</strong>.</span>
                </li>
                <li className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[12.75px] font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Vá para a abordagem.</span>
                </li>
              </ul>
            </div>

            {/* REGRAS E EVITE */}
            <div className="space-y-4">
              <div className="p-4 bg-emerald-100/80 border border-emerald-400 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-emerald-700 text-white rounded-md">Regra de Simplicidade</span>
                </div>
                <p className="text-[12.75px] text-emerald-950 font-medium leading-relaxed">
                  O objetivo da Etapa 1 é <strong>gerar interação</strong>. Não gaste 10 ou 15 minutos montando cenários ou calculando propostas para alguém que ainda nem respondeu.
                </p>
              </div>

              <div className="p-4 bg-rose-100/80 border border-rose-400 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-700" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Evite</span>
                </div>
                <p className="text-[12.75px] text-rose-950 font-medium leading-relaxed">
                  Calcular todos os coeficientes, estudar contratos antigos e montar proposta completa antes de existir uma conversa real com o cliente.
                </p>
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO INFERIOR */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-6 border-t border-slate-100">
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-600" /> Objeções Rápidas
            </button>
            <button
              onClick={() => goToStep(2)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              Avançar para Etapa 2 (Respondeu?) <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 2: PRIMEIRA MENSAGEM - GERAR RESPOSTA (RESPONDEU?) */}
        {/* ========================================================================= */}
        {(activeStep === 2 || activeStep === "all") && (
        <section id="etapa-2" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-600/20">
                2
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Primeira mensagem - gerar resposta
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Abra a conversa sem transformar o WhatsApp em anúncio ou aula de consignado.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-200">
                Foco: Gerar Resposta
              </span>
            </div>
          </div>

          <div className="p-5 bg-emerald-50/70 border border-emerald-500 rounded-xl space-y-1.5">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider block">
              REGRA PARA O NOVO
            </span>
            <p className="text-[13px] text-slate-800 font-medium leading-relaxed">
              A primeira mensagem não precisa explicar banco, amortização, engenharia da operação ou todas as condições. Ela precisa dar contexto, mostrar uma vantagem e gerar resposta.
            </p>
          </div>

          {/* SCRIPTS COPIÁVEIS COM ABAS */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 pb-2.5 border-b border-slate-200">
              <div className="flex items-center gap-2 mr-1">
                <div className={cn("w-1.5 h-4.5 rounded-full transition-colors", activeTab2 === "inicial" ? "bg-blue-600" : "bg-emerald-600")}></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                  O Que Falar
                </h3>
              </div>

              {/* TABS DE MENSAGENS COM MAIOR DESTAQUE E APROXIMADAS */}
              <div className="flex items-center bg-slate-200/90 p-1 rounded-xl border border-slate-300/80 shadow-inner">
                <button
                  type="button"
                  onClick={() => setActiveTab2("inicial")}
                  className={cn(
                    "px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab2 === "inicial"
                      ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-600/30"
                      : "text-slate-700 hover:text-slate-950 hover:bg-slate-100/60"
                  )}
                >
                  <Sparkles className={cn("w-3.5 h-3.5", activeTab2 === "inicial" ? "text-amber-300" : "text-blue-600")} />
                  MENSAGEM INICIAL
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab2("contexto")}
                  className={cn(
                    "px-4 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer",
                    activeTab2 === "contexto"
                      ? "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/30"
                      : "text-slate-700 hover:text-slate-950 hover:bg-slate-100/60"
                  )}
                >
                  <MessageSquare className={cn("w-3.5 h-3.5", activeTab2 === "contexto" ? "text-white" : "text-emerald-600")} />
                  ESCOLHA CONFORME O CONTEXTO
                </button>
              </div>
            </div>

            {/* ABA 1: MENSAGEM INICIAL (COM CRIATIVO / IMAGEM BAIXÁVEL) */}
            {activeTab2 === "inicial" && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>
                      Modelos de abordagem inicial com o criativo de <strong>Nova Parametrização</strong>. Clique na imagem para baixar diretamente para o seu computador.
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* MODELO INICIAL 1 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          1. Notícia Positiva + Priorização (PM)
                        </span>
                      </div>

                      {/* MOCK WHATSAPP */}
                      <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative space-y-2.5">
                        <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[95%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                          <p>E aí, [Nome]! Como anda por aí?</p>
                          <p className="mt-2">Pessoal da PM foi surpreendido com uma notícia positiva. E estou priorizando você e seus colegas:</p>
                          <p className="mt-2 font-semibold text-slate-900">24 meses no consignado e taxa na casa de 1%.</p>
                          <p className="mt-2">Recebeu alguma proposta nesse sentido, [Nome]?</p>

                          {/* IMAGEM BAIXÁVEL */}
                          <div 
                            onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                            className="mt-3 group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-black/90 shadow-sm"
                            title="Clique para baixar a imagem"
                          >
                            <img
                              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png"
                              alt="Nova Parametrização - PM SP"
                              className="w-full max-h-56 object-cover object-top transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                              <Download className="w-6 h-6 text-white" />
                              <span className="text-xs font-bold">Clique para baixar a imagem</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                        className="px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        title="Baixar imagem do criativo"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                        Baixar Imagem
                      </button>
                      <button
                        onClick={() => copyToClipboard("E aí, [Nome]! Como anda por aí?\n\nPessoal da PM foi surpreendido com uma notícia positiva. E estou priorizando você e seus colegas:\n\n24 meses no consignado e taxa na casa de 1%.\n\nRecebeu alguma proposta nesse sentido, [Nome]?", "ini-1")}
                        className="flex-1 py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {copiedId === "ini-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedId === "ini-1" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                      </button>
                    </div>
                  </div>

                  {/* MODELO INICIAL 2 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          2. Atendimento ao Órgão + Comparação
                        </span>
                      </div>

                      {/* MOCK WHATSAPP */}
                      <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative space-y-2.5">
                        <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[95%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                          <p>Oi, [Nome]! Tudo certo por aí?</p>
                          <p className="mt-2">Faz um tempo que atendo o pessoal da <strong>[ÓRGÃO CLIENTE]</strong>, e estou conversando com mais servidores sobre:</p>
                          <p className="mt-2 font-semibold text-slate-900">24 meses no consignado e taxa na casa de 1%.</p>
                          <p className="mt-2">Recebeu alguma proposta nesse sentido ou posso trazer o cenário do teu caso, [Nome]?</p>

                          {/* IMAGEM BAIXÁVEL */}
                          <div 
                            onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                            className="mt-3 group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-black/90 shadow-sm"
                            title="Clique para baixar a imagem"
                          >
                            <img
                              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png"
                              alt="Nova Parametrização - PM SP"
                              className="w-full max-h-56 object-cover object-top transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                              <Download className="w-6 h-6 text-white" />
                              <span className="text-xs font-bold">Clique para baixar a imagem</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                        className="px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        title="Baixar imagem do criativo"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                        Baixar Imagem
                      </button>
                      <button
                        onClick={() => copyToClipboard("Oi, [Nome]! Tudo certo por aí?\n\nFaz um tempo que atendo o pessoal da [ÓRGÃO CLIENTE], e estou conversando com mais servidores sobre:\n\n24 meses no consignado e taxa na casa de 1%.\n\nRecebeu alguma proposta nesse sentido ou posso trazer o cenário do teu caso, [Nome]?", "ini-2")}
                        className="flex-1 py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {copiedId === "ini-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedId === "ini-2" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                      </button>
                    </div>
                  </div>

                  {/* MODELO INICIAL 3 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          3. Aprovação no CPF + Variação de Taxa
                        </span>
                      </div>

                      {/* MOCK WHATSAPP */}
                      <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative space-y-2.5">
                        <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[95%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                          <p>[Nome], tudo bem?</p>
                          <p className="mt-2">Localizamos uma aprovação no seu CPF pela condição especial para servidores da <strong>[ÓRGÃO CLIENTE]</strong>.</p>
                          <p className="mt-2">As condições variam de 0,82% a 1,32% conforme seu órgão e tempo de contrato, por isso o valor pode mudar se você não confirmar logo.</p>
                          <p className="mt-2 font-medium text-slate-900">Consulta rápida, sem compromisso, só dar <strong>*Oi*</strong> 👇</p>

                          {/* IMAGEM BAIXÁVEL */}
                          <div 
                            onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                            className="mt-3 group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-black/90 shadow-sm"
                            title="Clique para baixar a imagem"
                          >
                            <img
                              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png"
                              alt="Nova Parametrização - PM SP"
                              className="w-full max-h-56 object-cover object-top transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                              <Download className="w-6 h-6 text-white" />
                              <span className="text-xs font-bold">Clique para baixar a imagem</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                        className="px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        title="Baixar imagem do criativo"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                        Baixar Imagem
                      </button>
                      <button
                        onClick={() => copyToClipboard("[Nome], tudo bem?\nLocalizamos uma aprovação no seu CPF pela condição especial para servidores da [ÓRGÃO CLIENTE].\n\nAs condições variam de 0,82% a 1,32% conforme seu órgão e tempo de contrato, por isso o valor pode mudar se você não confirmar logo.\n\nConsulta rápida, sem compromisso, só dar *Oi* 👇", "ini-3")}
                        className="flex-1 py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {copiedId === "ini-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedId === "ini-3" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                      </button>
                    </div>
                  </div>

                  {/* MODELO INICIAL 4 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          4. Atualização de Matrícula (12, 24 e 36m)
                        </span>
                      </div>

                      {/* MOCK WHATSAPP */}
                      <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative space-y-2.5">
                        <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[95%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                          <p>[Nome]! 👀 Atualizou uma alteração que beneficiou a sua matrícula, com possibilidade de 12, 24 e 36 meses no seu consignado.</p>
                          <p className="mt-2">Antes de eu encerrar sua análise, quero confirmar se você já aproveitou a condição de 1% ou ainda posso verificar para você?</p>
                          <p className="mt-2 font-medium text-slate-900">Me responde aqui que mostro antes do encerramento.</p>

                          {/* IMAGEM BAIXÁVEL */}
                          <div 
                            onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                            className="mt-3 group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-black/90 shadow-sm"
                            title="Clique para baixar a imagem"
                          >
                            <img
                              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png"
                              alt="Nova Parametrização - PM SP"
                              className="w-full max-h-56 object-cover object-top transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                              <Download className="w-6 h-6 text-white" />
                              <span className="text-xs font-bold">Clique para baixar a imagem</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                        className="px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        title="Baixar imagem do criativo"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                        Baixar Imagem
                      </button>
                      <button
                        onClick={() => copyToClipboard("[Nome]! 👀 Atualizou uma alteração que beneficiou a sua matrícula, com possibilidade de 12, 24 e 36 meses no seu consignado.\n\nAntes de eu encerrar sua análise, quero confirmar se você já aproveitou a condição de 1% ou ainda posso verificar para você?\n\nMe responde aqui que mostro antes do encerramento.", "ini-4")}
                        className="flex-1 py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {copiedId === "ini-4" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedId === "ini-4" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                      </button>
                    </div>
                  </div>

                  {/* MODELO INICIAL 5 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          5. Enquadramento Temporário (0.96%)
                        </span>
                      </div>

                      {/* MOCK WHATSAPP */}
                      <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative space-y-2.5">
                        <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[95%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                          <p>Oi, [Nome]! Tudo bem?</p>
                          <p className="mt-2">Identifiquei que o seu CPF ficou temporariamente enquadrado em um consignado com:</p>
                          <p className="mt-2 font-semibold text-slate-900">24 meses e taxa de 0.96%.</p>
                          <p className="mt-2">Você recebeu alguma proposta sobre isso recentemente?</p>

                          {/* IMAGEM BAIXÁVEL */}
                          <div 
                            onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                            className="mt-3 group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-black/90 shadow-sm"
                            title="Clique para baixar a imagem"
                          >
                            <img
                              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png"
                              alt="Nova Parametrização - PM SP"
                              className="w-full max-h-56 object-cover object-top transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                              <Download className="w-6 h-6 text-white" />
                              <span className="text-xs font-bold">Clique para baixar a imagem</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/pm_sp.png", "nova_parametrizacao_pm_sp.png")}
                        className="px-3 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        title="Baixar imagem do criativo"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                        Baixar Imagem
                      </button>
                      <button
                        onClick={() => copyToClipboard("Oi, [Nome]! Tudo bem?\n\nIdentifiquei que o seu CPF ficou temporariamente enquadrado em um consignado com:\n24 meses e taxa de 0.96%.\n\nVocê recebeu alguma proposta sobre isso recentemente?", "ini-5")}
                        className="flex-1 py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {copiedId === "ini-5" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        {copiedId === "ini-5" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ABA 2: ESCOLHA CONFORME O CONTEXTO */}
            {activeTab2 === "contexto" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SCRIPT 1 */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                        1. Contexto + Comparação
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">Opção Principal</span>
                    </div>

                    {/* MOCK WHATSAPP */}
                    <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>Oi, [Nome].</p>
                        <p className="mt-2">Tudo certo por aí?</p>
                        <p className="mt-2">Estou falando com alguns servidores da <strong>[ÓRGÃO]</strong> porque abriu uma condição que pode <strong>reduzir bastante a duração</strong> do consignado.</p>
                        <p className="mt-2">Você recebeu alguma proposta recente ou ainda não chegou a comparar?</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11.75px] text-slate-500 italic">
                      <strong>Quando usar:</strong> Boa opção genérica quando você ainda vai consultar o caso.
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard("Oi, [Nome].\n\nTudo certo por aí?\n\nEstou falando com alguns servidores da *[ÓRGÃO]* porque abriu uma condição que pode *reduzir bastante a duração* do consignado.\n\nVocê recebeu alguma proposta recente ou ainda não chegou a comparar?", "p-1")}
                    className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedId === "p-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "p-1" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* SCRIPT 2 */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                        2. CAMPANHA COM CONDIÇÃO JÁ LIBERADA PARA A BASE
                      </span>
                    </div>

                    {/* MOCK WHATSAPP */}
                    <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>Oi, [Nome].</p>
                        <p className="mt-2">Para servidores da <strong>[ÓRGÃO]</strong>, estamos trabalhando uma estrutura de <strong>duração reduzida</strong> e taxa na casa de <strong>[REFERÊNCIA DA CAMPANHA]</strong>.</p>
                        <p className="mt-2">Você já recebeu alguma proposta nesse formato ou posso conferir o teu cenário?</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11.75px] text-slate-500 italic">
                      <strong>Quando usar:</strong> Use somente quando a campanha realmente sustenta a referência anunciada. Não transforme condição de campanha em número fechado do cliente antes da consulta.
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard("Oi, [Nome].\n\nPara servidores da *[ÓRGÃO]*, estamos trabalhando uma estrutura de *duração reduzida* e taxa na casa de *[REFERÊNCIA DA CAMPANHA]*.\n\nVocê já recebeu alguma proposta nesse formato ou posso conferir o teu cenário?", "p-2")}
                    className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedId === "p-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "p-2" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* SCRIPT 3 */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                        3. Direta e Curta
                      </span>
                    </div>

                    {/* MOCK WHATSAPP */}
                    <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>[Nome], tudo bem?</p>
                        <p className="mt-2">0.96% no teu consignado hoje pode ser uma boa opção.</p>
                        <p className="mt-2">Você já recebeu proposta recentemente?</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11.75px] text-slate-500 italic">
                      <strong>Quando usar:</strong> Quando o canal/base pede mensagem mais enxuta.
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard("[Nome], tudo bem?\n\n0.96% no teu consignado hoje pode ser uma boa opção.\n\nVocê já recebeu proposta recentemente?", "p-3")}
                    className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedId === "p-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "p-3" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* SCRIPT 4 */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                        4. Reativação
                      </span>
                    </div>

                    {/* MOCK WHATSAPP */}
                    <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>[Nome], antes de eu encerrar tua análise por aqui: você chegou a comparar alguma condição com o <strong>prazo reduzido</strong> ou ainda não olhou isso?</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>

                    <p className="text-[11.75px] text-slate-500 italic">
                      <strong>Quando usar:</strong> Lead que já foi acionado anteriormente.
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard("[Nome], antes de eu encerrar tua análise por aqui: você chegou a comparar alguma condição com o *prazo reduzido* ou ainda não olhou isso?", "p-4")}
                    className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copiedId === "p-4" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "p-4" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2.1 E SE O CLIENTE NÃO RESPONDER? */}
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4.5 bg-amber-500 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                E se o cliente não responder?
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* RETOMADA 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Retomada Curta
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>[Nome], você viu como ficou o teu caso com <strong>1% ao mês</strong> dentro do plano que disponibilizamos?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11.75px] text-slate-500 italic">
                    <strong>Uso:</strong> Primeira retomada sem repetir a mensagem inteira.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard("[Nome], você viu como ficou o teu caso com *1% ao mês* dentro do plano que disponibilizamos?", "ret-1")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "ret-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "ret-1" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* RETOMADA 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Retomada com Fechamento
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Você já pagou na prática <strong>1% em algum consignado da tua folha</strong>? Se a resposta é não, posso te mostrar um cenário que agora você pode. Posso enviar abaixo?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11.75px] text-slate-500 italic">
                    <strong>Uso:</strong> Quando ainda não houve resposta e se quer uma última tentativa com pergunta simples.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard("Você já pagou na prática *1% em algum consignado da tua folha*? Se a resposta é não, posso te mostrar um cenário que agora você pode.\n\nPosso enviar abaixo?", "ret-2")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "ret-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "ret-2" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* RETOMADA 3 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Encerramento sem Pressão
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Chato não é o caminho que gosto de seguir. Vou encerrar por aqui para não insistir. Se quiser conferir o formato que abriu para você, estou à disposição, sem compromisso, [Nome].</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11.75px] text-slate-500 italic">
                    <strong>Uso:</strong> Para deixar porta aberta sem sequência de mensagens.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard("Chato não é o caminho que gosto de seguir. Vou encerrar por aqui para não insistir.\n\nSe quiser conferir o formato que abriu para você, estou à disposição, sem compromisso, *[Nome]*.", "ret-3")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "ret-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "ret-3" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>
            </div>

            <div className="p-4 bg-rose-100/80 border border-rose-400 rounded-2xl space-y-2">
              <div className="flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                <span className="text-[10.75px] font-black uppercase tracking-wider">Erros Comuns na Retomada (Evite)</span>
              </div>
              <ul className="text-[12.75px] text-rose-950 list-disc list-inside space-y-1 font-medium">
                <li>Mandar apenas "??", "viu?", "está aí?" como sequência de cobrança.</li>
                <li>Mandar cálculo completo em imagem sem o cliente ter respondido ou demonstrado interesse.</li>
                <li>Criar falsa urgência dizendo que "a proposta encerra hoje às 18h" se isso não for regra real do banco.</li>
                <li>Afirmar que o CPF já está "aprovado" se o sistema ainda não processou a esteira.</li>
              </ul>
            </div>
          </div>

          {/* NAVEGAÇÃO INFERIOR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(1)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Etapa 1 (Lead)
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Objeções Rápidas
              </button>
              <button
                onClick={() => goToStep(3)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar para Etapa 3 (Sondagem) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 3: RESPONDEU? SONDE SEM INTERROGAR (O QUE ELE QUER?) */}
        {/* ========================================================================= */}
        {(activeStep === 3 || activeStep === "all") && (
        <section id="etapa-3" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-xl flex items-center justify-center shadow-md shadow-amber-500/20">
                3
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Respondeu? Sonde sem interrogar
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Descubra a referência e o que pesa na decisão com <strong>uma pergunta de cada vez</strong>.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-amber-50 text-amber-800 text-xs font-bold rounded-lg border border-amber-200">
              Regra: 1 Pergunta por vez
            </span>
          </div>

          {/* CARD DE REGRA */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-1">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
              REGRA
            </span>
            <p className="text-[13px] text-slate-800 font-medium leading-relaxed">
              Sondagem não é questionário. Faça UMA pergunta, use a resposta e só então faça a próxima.
            </p>
          </div>

          {/* MATRIZ SE O CLIENTE... */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-amber-500 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                Se o Cliente Responder...
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* SCRIPT 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded uppercase">
                      "Pode ver" / "Como funciona?"
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Perfeito.</p>
                      <p className="mt-2">Antes de eu calcular, só para eu direcionar certo: você recebeu alguma proposta recentemente ou ainda não comparou nada?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Perfeito.\n\nAntes de eu calcular, só para eu direcionar certo: você recebeu alguma proposta recentemente ou ainda não comparou nada?", "sonde-1")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-1" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* SCRIPT 2 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded uppercase">
                      "Já recebi proposta"
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Entendi.</p>
                      <p className="mt-2">Você lembra mais ou menos o <strong>valor e em quantas parcelas</strong> ficou?</p>
                      <p className="mt-2">Eu comparo pela mesma referência para não misturar condições.</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Entendi.\n\nVocê lembra mais ou menos o *valor e em quantas parcelas* ficou?\n\nEu comparo pela mesma referência para não misturar condições.", "sonde-2")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-2" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* SCRIPT 3 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded uppercase">
                      "Ainda não recebi nada"
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Hoje faria mais sentido para você priorizar <strong>valor na mão</strong> ou uma estrutura que <strong>termine antes</strong>?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Hoje faria mais sentido para você priorizar *valor na mão* ou uma estrutura que *termine antes*?", "sonde-3")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-3" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* SCRIPT 4 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded uppercase">
                      "Não estou precisando de valor"
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Entendi.</p>
                      <p className="mt-2">Se hoje não existe necessidade de valor, não faz sentido criar uma <strong>parcela</strong> só por criar.</p>
                      <p className="mt-2">Antes de eu encerrar: existe algum contrato atual que você gostaria de encurtar ou reduzir custo, ou isso também não é prioridade?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Entendi.\n\nSe hoje não existe necessidade de valor, não faz sentido criar uma *parcela* só por criar.\n\nAntes de eu encerrar: existe algum contrato atual que você gostaria de encurtar ou reduzir custo, ou isso também não é prioridade?", "sonde-4")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-4" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-4" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>
            </div>
          </div>

          {/* SINAIS DE AVANÇO - PARE DE SONDAR */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                  Sinais de Avanço — Pare de Sondar!
                </h3>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                Não revenda o que já foi vendido
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 sm:px-6">Se o cliente falar...</th>
                    <th className="p-3.5 sm:px-6">Faça exatamente isso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“O que precisa para fazer?”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Responda objetivamente e avance direto para a coleta de documentos.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“Como eu assino?”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Explique a formalização digital e envie o fluxo.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“Quando o dinheiro cai?”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Responda o prazo operacional validado e avance.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“Pode seguir.”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Não volte a vender nem justifique taxas. Apenas execute a digitação.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“Esse valor é líquido?”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Confirme objetivamente ("Sim, direto na sua conta") e peça o próximo passo.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* NAVEGAÇÃO INFERIOR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(2)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Etapa 2 (Respondeu?)
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Objeções Rápidas
              </button>
              <button
                onClick={() => goToStep(4)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar para Etapa 4 (Consulta) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 4: TENHO BASE PARA CRAVAR NÚMEROS? (CONSULTE ANTES DE CRAVAR) */}
        {/* ========================================================================= */}
        {(activeStep === 4 || activeStep === "all") && (
        <section id="etapa-4" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-600/20">
                4
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Prometer certo: consulte antes de cravar
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Venda com total segurança sem matar a força comercial.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Conceito Central</h3>
            <p className="text-[12.75px] text-slate-700 font-medium leading-relaxed">
              Promessa comercial faz parte da venda. O erro não é prometer valor; é transformar uma referência de campanha em número fechado do cliente sem ter consultado a base. <strong>Prometa oportunidade, processo e cenário. Crave números específicos somente depois de consultar.</strong>
            </p>
          </div>

          {/* ANTES VS DEPOIS DA CONSULTA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="p-5 border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Antes da Consulta (Pode Afirmar)
                </h4>
              </div>
              <ul className="text-[12.75px] text-amber-900 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>“Temos uma condição aberta para esse público e vou conferir se tua matrícula encaixa no melhor cenário.”</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>“Vou comparar o que te apresentaram e te devolver pela mesma referência.”</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>“Vou procurar uma estrutura que privilegie prazo menor.”</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>“Vou validar tua margem e te devolver com números fechados.”</span>
                </li>
              </ul>
            </div>

            <div className="p-5 border-2 border-emerald-400 bg-emerald-100/70 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                  Depois da Consulta (Pode Cravar)
                </h4>
              </div>
              <ul className="text-[12.75px] text-emerald-900 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Valor exato de liberação na conta.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Parcela exata em folha.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Taxa aplicada naquele cenário.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Prazo contratual e duração projetada com amortizações.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Banco, tabela e documentos necessários.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* MATRIZ DE DECISÃO RÁPIDA */}
          <div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">
              Matriz de Decisão Rápida
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Está na tela / sistema?</p>
                <p className="font-bold text-emerald-400 mt-1">CONSULTE. Não pergunte ao gestor.</p>
              </div>
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-400 font-bold uppercase">É preferência do cliente?</p>
                <p className="font-bold text-amber-400 mt-1">PERGUNTE ao cliente (valor, prazo, parcela).</p>
              </div>
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Divergência técnica?</p>
                <p className="font-bold text-rose-400 mt-1">ABRA CHAMADO / Peça apoio.</p>
              </div>
              <div className="p-3 bg-slate-800/90 rounded-xl border border-slate-700">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Prestes a chutar um número?</p>
                <p className="font-bold text-red-400 mt-1">PARE e consulte antes de enviar.</p>
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO INFERIOR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(3)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Etapa 3 (Sondagem)
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Objeções Rápidas
              </button>
              <button
                onClick={() => goToStep(5)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar para Etapa 5 (Dúvida Técnica) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 5: SURGIU DÚVIDA TÉCNICA? (ABRIR CHAMADO QUANDO PRECISAR) */}
        {/* ========================================================================= */}
        {(activeStep === 5 || activeStep === "all") && (
        <section id="etapa-5" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-rose-600/20">
                5
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Abrir chamado quando precisar
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Use a retaguarda para destravar a venda, não para terceirizar toda decisão comercial.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-rose-50 text-rose-800 text-xs font-bold rounded-lg border border-rose-200">
              Retaguarda & Suporte
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ABRA CHAMADO QUANDO */}
            <div className="p-5 bg-rose-100/80 border border-rose-400 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                <h3 className="text-xs font-black uppercase tracking-wider">Abra Chamado Quando</h3>
              </div>
              <ul className="text-[12.75px] text-rose-950 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>Margem exibida não faz sentido ou diverge do contracheque.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>Contrato ou desconto possui informação que você não consegue interpretar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>O cálculo não fecha com as regras operacionais do sistema.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>É necessário enviar contracheque ou documento para análise da mesa.</span>
                </li>
              </ul>
            </div>

            {/* NÃO PRECISA ABRIR CHAMADO QUANDO */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-slate-900">
                <HelpCircle className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-black uppercase tracking-wider">Não Precisa Abrir Chamado Quando</h3>
              </div>
              <ul className="text-[12.75px] text-slate-700 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>A informação está claramente na tela do cliente.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>A dúvida é "o cliente quer mais valor ou prazo menor?" (pergunte a ele).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>Você ainda nem fez a consulta básica do CPF.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>O cliente ainda não respondeu e não existe dúvida técnica.</span>
                </li>
              </ul>
            </div>

          </div>

          <div className="p-4 bg-emerald-100/80 border border-emerald-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-900">Modelo de Chamado Objetivo</p>
              <p className="text-xs font-bold text-emerald-950 mt-0.5">“CONSULTAR MARGEM ATUAL DO CLIENTE.”</p>
              <p className="text-[11.75px] text-emerald-800 mt-1">Chamado curto e contextualizado para a retaguarda decidir rápido.</p>
            </div>
            <button
              onClick={() => copyToClipboard("CONSULTAR MARGEM ATUAL DO CLIENTE.", "chamado-mod")}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all shrink-0"
            >
              {copiedId === "chamado-mod" ? "Copiado!" : "Copiar Modelo"}
            </button>
          </div>

          {/* NAVEGAÇÃO INFERIOR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(4)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Etapa 4 (Consulta)
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Objeções Rápidas
              </button>
              <button
                onClick={() => goToStep(6)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar para Etapa 6 (Fechamento) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 6: CALCULAR, APRESENTAR, QUITAÇÃO & ACEITOU */}
        {/* ========================================================================= */}
        {(activeStep === 6 || activeStep === "all") && (
        <section id="etapa-6" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
                6
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Calcular, Apresentar & Aceite
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Transforme a sondagem em uma proposta clara, conduza o plano, quitação e formalização.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
              Fechamento & Formalização
            </span>
          </div>

          {/* NAVEGAÇÃO DE ABAS DA ETAPA 6 */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab6("senff")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                activeTab6 === "senff"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              6.0A Comparativo Senff
            </button>
            <button
              onClick={() => setActiveTab6("facultativa")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                activeTab6 === "facultativa"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              6.0B Margem Facultativa
            </button>
            <button
              onClick={() => setActiveTab6("reacoes")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                activeTab6 === "reacoes"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Reações à Proposta
            </button>
            <button
              onClick={() => setActiveTab6("plano")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                activeTab6 === "plano"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Plano de Amortização
            </button>
            <button
              onClick={() => setActiveTab6("quitacao")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                activeTab6 === "quitacao"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Quitação de Cartão
            </button>
            <button
              onClick={() => setActiveTab6("documentos")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                activeTab6 === "documentos"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              Documentos & Aceitou
            </button>
          </div>

          {/* CONTEÚDO TAB SENFF */}
          {activeTab6 === "senff" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded">
                    Identificador Visível: CARTÃO SENFF (MARGEM COMPLEMENTAR)
                  </span>
                  <p className="text-xs text-emerald-950 font-semibold mt-1">
                    Comparativo Real de Duração Reduzida vs Referência Bancária
                  </p>
                </div>
              </div>

              {/* CARD VISUAL DO COMPARATIVO REAL SENFF */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 12 MESES */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-800 shadow-md">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 text-lg font-black tracking-tight">12 Meses</span>
                    <p className="text-[10px] text-slate-400 uppercase">Plano de Amortização</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Liberado</span>
                      <span className="text-emerald-400 font-bold">R$ 10.385,41</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Parcela Média</span>
                      <span className="font-bold">R$ 913,01</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxa Mês</span>
                      <span className="font-bold">0,82%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Previsto</span>
                      <span className="font-bold">R$ 10.956,06</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-bold text-emerald-300">Economia no Total</p>
                    <p className="text-sm font-black text-emerald-400">R$ 32.243,94</p>
                  </div>
                </div>

                {/* 24 MESES */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border-2 border-emerald-500 shadow-lg relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-[9px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full">
                    Mais Escolhido
                  </div>
                  <div className="text-center pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 text-lg font-black tracking-tight">24 Meses</span>
                    <p className="text-[10px] text-slate-400 uppercase">Plano de Amortização</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Liberado</span>
                      <span className="text-emerald-400 font-bold">R$ 10.385,41</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Parcela Média</span>
                      <span className="font-bold">R$ 486,72</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxa Mês</span>
                      <span className="font-bold">0,96%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Previsto</span>
                      <span className="font-bold">R$ 11.681,28</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-bold text-emerald-300">Economia no Total</p>
                    <p className="text-sm font-black text-emerald-400">R$ 31.518,72</p>
                  </div>
                </div>

                {/* 96 MESES */}
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-800 opacity-80">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <span className="text-slate-200 text-lg font-black tracking-tight">96 Meses</span>
                    <p className="text-[10px] text-slate-400 uppercase">Tabela Bancária Padrão</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Liberado</span>
                      <span className="text-emerald-400 font-bold">R$ 10.385,41</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Parcela Média</span>
                      <span className="font-bold">R$ 450,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxa Mês</span>
                      <span className="font-bold">4,03%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Previsto</span>
                      <span className="font-bold">R$ 43.200,00</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-800/80 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-bold text-slate-400">Sem Economia</p>
                    <p className="text-sm font-bold text-slate-400">Custo Total Elevado</p>
                  </div>
                </div>

              </div>

              {/* SCRIPTS DE ENVIO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Antes de Enviar a Imagem</span>
                  <p className="text-xs text-slate-800 font-mono">
                    "Fiz a simulação e essa é a diferença que eu queria te mostrar.{'\n\n'}Olha a vantagem que está aberta."
                  </p>
                  <button
                    onClick={() => copyToClipboard("Fiz a simulação e essa é a diferença que eu queria te mostrar.\n\nOlha a vantagem que está aberta.", "s-env-1")}
                    className="w-full py-2 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded-lg transition-all"
                  >
                    {copiedId === "s-env-1" ? "Copiado!" : "Copiar"}
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Junto / Logo Após a Imagem</span>
                  <p className="text-xs text-slate-800 font-mono">
                    "Observe cada cenário.{'\n\n'}A ideia não é escolher só pela menor taxa. É enxergar qual formato entrega o melhor equilíbrio entre *valor*, *parcela* e *duração* para o que você busca hoje."
                  </p>
                  <button
                    onClick={() => copyToClipboard("Observe cada cenário.\n\nA ideia não é escolher só pela menor taxa. É enxergar qual formato entrega o melhor equilíbrio entre *valor*, *parcela* e *duração* para o que você busca hoje.", "s-env-2")}
                    className="w-full py-2 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded-lg transition-all"
                  >
                    {copiedId === "s-env-2" ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB FACULTATIVA */}
          {activeTab6 === "facultativa" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-2xl">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 bg-blue-200/80 px-2 py-0.5 rounded">
                  Identificador Visível: MARGEM FACULTATIVA
                </span>
                <p className="text-xs text-blue-950 font-semibold mt-1">
                  Exemplo de apresentação com amortização na margem facultativa
                </p>
              </div>

              {/* GRID COMPARATIVO FACULTATIVA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-800 shadow-md">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 text-lg font-black tracking-tight">36 Meses</span>
                    <p className="text-[10px] text-slate-400 uppercase">Plano de Amortização</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Liberado</span>
                      <span className="text-emerald-400 font-bold">R$ 43.066,32</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Parcela Média</span>
                      <span className="font-bold">R$ 1.455,23</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxa Mês</span>
                      <span className="font-bold">1,10%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Previsto</span>
                      <span className="font-bold">R$ 52.388,16</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-bold text-emerald-300">Economia no Total</p>
                    <p className="text-sm font-black text-emerald-400">R$ 43.611,84</p>
                  </div>
                </div>

                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border-2 border-blue-500 shadow-lg">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 text-lg font-black tracking-tight">48 Meses</span>
                    <p className="text-[10px] text-slate-400 uppercase">Plano de Amortização</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Liberado</span>
                      <span className="text-emerald-400 font-bold">R$ 43.066,32</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Parcela Média</span>
                      <span className="font-bold">R$ 1.216,99</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxa Mês</span>
                      <span className="font-bold">1,32%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Previsto</span>
                      <span className="font-bold">R$ 58.415,30</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-bold text-emerald-300">Economia no Total</p>
                    <p className="text-sm font-black text-emerald-400">R$ 37.584,70</p>
                  </div>
                </div>

                <div className="bg-slate-900 text-white rounded-2xl p-5 space-y-4 border border-slate-800">
                  <div className="text-center pb-2 border-b border-slate-800">
                    <span className="text-emerald-400 text-lg font-black tracking-tight">60 Meses</span>
                    <p className="text-[10px] text-slate-400 uppercase">Plano de Amortização</p>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor Liberado</span>
                      <span className="text-emerald-400 font-bold">R$ 43.066,32</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Parcela Média</span>
                      <span className="font-bold">R$ 1.093,60</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Taxa Mês</span>
                      <span className="font-bold">1,50%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Previsto</span>
                      <span className="font-bold">R$ 65.616,09</span>
                    </div>
                  </div>
                  <div className="p-2.5 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-center">
                    <p className="text-[9px] uppercase font-bold text-emerald-300">Economia no Total</p>
                    <p className="text-sm font-black text-emerald-400">R$ 30.383,91</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Script para Transformar em Decisão</span>
                <p className="text-xs font-mono text-slate-800">
                  "Nessa comparação, qual cenário está mais dentro do que faz sentido para você?"
                </p>
                <button
                  onClick={() => copyToClipboard("Nessa comparação, qual cenário está mais dentro do que faz sentido para você?", "fac-dec")}
                  className="w-full sm:w-auto px-6 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg transition-all"
                >
                  {copiedId === "fac-dec" ? "Copiado!" : "Copiar Pergunta"}
                </button>
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB REAÇÕES À PROPOSTA */}
          {activeTab6 === "reacoes" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Quer mais valor</span>
                <p className="text-xs font-mono text-slate-800 whitespace-pre-line">
                  Consigo tentar puxar a estrutura para liberação.{'\n\n'}Me diz só uma coisa: existe um valor mínimo que faria sentido para você?
                </p>
                <button onClick={() => copyToClipboard("Consigo tentar puxar a estrutura para liberação.\n\nMe diz só uma coisa: existe um valor mínimo que faria sentido para você?", "reac-1")} className="w-full py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg">
                  {copiedId === "reac-1" ? "Copiado!" : "Copiar"}
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Quer prazo menor</span>
                <p className="text-xs font-mono text-slate-800 whitespace-pre-line">
                  Perfeito.{'\n\n'}Vou reduzir a duração e te mostro quanto muda no valor para você decidir.
                </p>
                <button onClick={() => copyToClipboard("Perfeito.\n\nVou reduzir a duração e te mostro quanto muda no valor para você decidir.", "reac-2")} className="w-full py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg">
                  {copiedId === "reac-2" ? "Copiado!" : "Copiar"}
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">A parcela ficou alta</span>
                <p className="text-xs font-mono text-slate-800 whitespace-pre-line">
                  Entendi.{'\n\n'}Qual faixa de parcela cabe com tranquilidade no teu orçamento?{'\n\n'}Eu ajusto em cima disso.
                </p>
                <button onClick={() => copyToClipboard("Entendi.\n\nQual faixa de parcela cabe com tranquilidade no teu orçamento?\n\nEu ajusto em cima disso.", "reac-3")} className="w-full py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg">
                  {copiedId === "reac-3" ? "Copiado!" : "Copiar"}
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Essa taxa está baixa demais. Não confio.</span>
                <p className="text-[12.75px] font-mono text-slate-800 whitespace-pre-line">
                  Boa pergunta.{'\n\n'}Essa é a taxa que pagará na prática deixando a duração do contrato em X meses.{'\n\n'}Vou te mandar o plano completo em que você poderá visualizar, calcular e tirar dúvidas.
                </p>
                <button onClick={() => copyToClipboard("Boa pergunta.\n\nEssa é a taxa que pagará na prática deixando a duração do contrato em X meses.\n\nVou te mandar o plano completo em que você poderá visualizar, calcular e tirar dúvidas.", "reac-4")} className="w-full py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg">
                  {copiedId === "reac-4" ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB PLANO */}
          {activeTab6 === "plano" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Regra do Plano de Amortização</span>
                <p className="text-[12.75px] text-slate-800 font-medium leading-relaxed">
                  Primeiro o cliente precisa entender <strong>POR QUE</strong> a estrutura é boa. Depois, ele entende <strong>COMO</strong> o plano realiza a duração projetada.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Mensagem Antes do Link/PDF</span>
                  <p className="text-[12.75px] font-mono text-slate-800 whitespace-pre-line">
                    Vou te mandar agora o *Plano de Amortização*.{'\n\n'}Ele serve para você enxergar como a operação é organizada ao longo do tempo e como chegamos à *duração projetada* que eu te apresentei.{'\n\n'}Quando abrir, não precisa tentar interpretar tudo sozinho. Eu vou te mostrar os *pontos que realmente importam*.
                  </p>
                  <button onClick={() => copyToClipboard("Vou te mandar agora o *Plano de Amortização*.\n\nEle serve para você enxergar como a operação é organizada ao longo do tempo e como chegamos à *duração projetada* que eu te apresentei.\n\nQuando abrir, não precisa tentar interpretar tudo sozinho. Eu vou te mostrar os *pontos que realmente importam*.", "plano-1")} className="w-full py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg">
                    {copiedId === "plano-1" ? "Copiado!" : "Copiar"}
                  </button>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Mensagem Junto com o Link/PDF</span>
                  <p className="text-[12.75px] font-mono text-slate-800 whitespace-pre-line">
                    Segue o plano, [Nome].{'\n\n'}Repara principalmente em 3 pontos:{'\n'}1. a parcela que fica em folha{'\n'}2. as amortizações previstas{'\n'}3. a duração projetada da operação{'\n\n'}Se quiser, eu já te explico a linha do teu caso sem você precisar ler isso como uma planilha.
                  </p>
                  <button onClick={() => copyToClipboard("Segue o plano, [Nome].\n\nRepara principalmente em 3 pontos:\n1. a parcela que fica em folha\n2. as amortizações previstas\n3. a duração projetada da operação\n\nSe quiser, eu já te explico a linha do teu caso sem você precisar ler isso como uma planilha.", "plano-2")} className="w-full py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg">
                    {copiedId === "plano-2" ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB QUITAÇÃO */}
          {activeTab6 === "quitacao" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-emerald-100/80 border border-emerald-400 rounded-2xl space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900">Quitação de Cartão (Operação Especial)</span>
                <p className="text-[12.75px] text-emerald-950 font-medium leading-relaxed">
                  Quando a proposta for quitação de cartão, a liberação ocorre pela margem facultativa, liberando valor para quitar o saldo devedor e reduzir a folha.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Cálculo Rápido de Saldo Devedor</span>
                  <div className="space-y-2 text-[12.75px] font-semibold text-slate-800">
                    <p className="p-2.5 bg-white border rounded-lg">1. Saldo prévio: Margem Bruta do Benefício - Margem Líquida = Margem Averbada</p>
                    <p className="p-2.5 bg-white border rounded-lg">2. Saldo devedor prévio = Margem Averbada × 16,6667</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Mensagem de Abordagem para Quitação</span>
                  <p className="text-[12.75px] font-mono text-slate-800 whitespace-pre-line">
                    Oi, [NOME], Mais de *R$ 15 mil* estão saindo do seu bolso por causa de 1 desconto!{'\n\n'}Resolvemos isso em *menos de 48h*. Posso mostrar a diferença?
                  </p>
                  <button onClick={() => copyToClipboard("Oi, [NOME], Mais de *R$ 15 mil* estão saindo do seu bolso por causa de 1 desconto!\n\nResolvemos isso em *menos de 48h*. Posso mostrar a diferença?", "quit-1")} className="w-full py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg">
                    {copiedId === "quit-1" ? "Copiado!" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONTEÚDO TAB DOCUMENTOS & ACEITOU */}
          {activeTab6 === "documentos" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Coleta de Documentos</span>
                <p className="text-[12.75px] font-mono text-slate-800 whitespace-pre-line">
                  Perfeito, [Nome].{'\n\n'}Para eu deixar essa condição pronta para você conferir, preciso de:{'\n'}- Foto RG ou CNH;{'\n'}- Endereço e e-mail por escrito;{'\n'}- Último contracheque.{'\n\n'}Assim que receber, eu digito e te devolvo o *próximo passo*.
                </p>
                <button onClick={() => copyToClipboard("Perfeito, [Nome].\n\nPara eu deixar essa condição pronta para você conferir, preciso de:\n- Foto RG ou CNH;\n- Endereço e e-mail por escrito;\n- Último contracheque.\n\nAssim que receber, eu digito e te devolvo o *próximo passo*.", "doc-1")} className="w-full sm:w-auto px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg">
                  {copiedId === "doc-1" ? "Copiado!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* RETOMADAS PELO PONTO ONDE PAROU */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Retomadas pelo Ponto Onde Parou</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Parou Depois da Proposta</p>
                    <p className="text-[12.75px] text-slate-800">"[Nome], deixei teu cenário separado aqui. Antes de eu encerrar, me diz o que travou: valor, parcela, prazo ou segurança?"</p>
                    <button onClick={() => copyToClipboard("[Nome], deixei teu cenário separado aqui.\n\nAntes de eu encerrar, me diz o que travou: valor, parcela, prazo ou segurança da operação?", "ret-p-1")} className="w-full py-1.5 bg-white border text-[11px] font-bold rounded">Copiar</button>
                  </div>

                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Parou nos Documentos</p>
                    <p className="text-[12.75px] text-slate-800">"[Nome], ficou pendente apenas [DOCUMENTO]. Assim que você me enviar, eu consigo dar sequência com prioridade."</p>
                    <button onClick={() => copyToClipboard("[Nome], ficou pendente apenas [DOCUMENTO].\n\nAssim que você me enviar, eu consigo dar sequência na proposta com prioridade sem refazer a análise.", "ret-p-2")} className="w-full py-1.5 bg-white border text-[11px] font-bold rounded">Copiar</button>
                  </div>

                  <div className="p-3.5 bg-slate-50 border rounded-xl space-y-2">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Parou na Formalização</p>
                    <p className="text-[12.75px] text-slate-800">"[Nome], falta apenas um detalhe para o pagamento. Se travou em alguma tela ou validação, me fala onde parou que eu te direciono."</p>
                    <button onClick={() => copyToClipboard("[Nome], falta apenas um detalhe para o pagamento.\n\nSe travou em alguma tela ou validação, me fala onde parou que eu te direciono.", "ret-p-3")} className="w-full py-1.5 bg-white border text-[11px] font-bold rounded">Copiar</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* NAVEGAÇÃO INFERIOR */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(5)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Etapa 5 (Chamado Técnico)
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Objeções Rápidas
              </button>
              <button
                onClick={() => goToStep(1)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Iniciar Novo Lead (Etapa 1) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* APOIO RÁPIDO TRANSVERSAL: "CLIENTE DISSE..." COM BUSCA E FILTROS */}
        {/* ========================================================================= */}
        {(activeStep === "all" || activeStep === 6) && (
        <section id="apoio-rapido" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  APOIO RÁPIDO ÀS OBJEÇÕES DO CLIENTE
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-700 font-semibold mt-1">
                Biblioteca para encontrar respostas exatas a qualquer momento da conversa.
              </p>
            </div>

            {/* BOTÃO VOLTAR AO ÍNDICE */}
            <button
              onClick={() => goToStep(1)}
              className="text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all self-start md:self-auto cursor-pointer"
            >
              Voltar ao Início ↑
            </button>
          </div>

          {/* BARRA DE PESQUISA E CATEGORIAS */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Digite o que o cliente disse (ex: golpe, banco, não tenho interesse, prazo, boleto, pensar...)"
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-inner"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                { id: "todos", label: "Todas as Situações" },
                { id: "interesse", label: "Interesse / Decisão" },
                { id: "banco", label: "Comparação / Banco" },
                { id: "seguranca", label: "Segurança / Golpe" },
                { id: "valor", label: "Valor / Margem" },
                { id: "plano", label: "Formalização / Plano" }
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                    activeCategory === cat.id
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* LISTA DE RESULTADOS DO APOIO RÁPIDO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredApoio.map((item) => (
              <div
                key={item.id}
                className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all shadow-xs"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 bg-white border px-2.5 py-1 rounded-lg">
                      “{item.clientSays}”
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {item.nextStep}
                    </span>
                  </div>

                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono leading-relaxed whitespace-pre-line select-all">
                    {item.response}
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    <strong>Quando usar:</strong> {item.whenToUse}
                  </p>
                </div>

                <button
                  onClick={() => copyToClipboard(item.response, item.id)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {copiedId === item.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === item.id ? "Copiado com Negrito!" : "Copiar Resposta"}
                </button>
              </div>
            ))}
          </div>

          {/* KIT OFICIAL DE CONFIANÇA */}
          <div className="p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-black uppercase tracking-wider">Kit Oficial de Confiança</h4>
              </div>
              <p className="text-xs text-slate-300">
                Mais de 35 mil servidores atendidos no Brasil • 5 estrelas no Google • Verificada no Reclame Aqui
              </p>
            </div>
            <a
              href="https://instagram.com/acertofacilpromotora"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl transition-all flex items-center gap-2 shrink-0"
            >
              Instagram Oficial <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>

          {/* NAVEGAÇÃO INFERIOR */}
          <div className="flex items-center justify-end pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(1)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUp className="w-4 h-4" /> Voltar ao Início
            </button>
          </div>
        </section>
        )}

      </main>

      {/* ========================================================================= */}
      {/* BOTÃO FLUTUANTE (FAB) PARA ABRIR O PAINEL DE OBJEÇÕES RÁPIDAS */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/25 flex items-center gap-2.5 border-2 border-emerald-400/40 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
          </span>
          <Zap className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
          <span>Objeções Rápidas ({quickSupportItems.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PAINEL LATERAL (DRAWER / SLIDE-OVER) DE APOIO RÁPIDO ÀS OBJEÇÕES */}
      {/* ========================================================================= */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* BACKDROP ESCURO */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl sm:max-w-2xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
              
              {/* CABEÇALHO DO DRAWER */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                    <Zap className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">
                      Apoio Rápido às Objeções
                    </h3>
                    <p className="text-xs text-slate-400">
                      Scripts prontos para copiar com formatação WhatsApp
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* BUSCA E FILTROS NO DRAWER */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Filtrar por dúvida (ex: golpe, banco, sem margem, prazo...)"
                    className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                    autoFocus
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "todos", label: "Todas" },
                    { id: "interesse", label: "Interesse" },
                    { id: "banco", label: "Banco / Taxa" },
                    { id: "seguranca", label: "Segurança / Golpe" },
                    { id: "valor", label: "Valor / Margem" },
                    { id: "plano", label: "Fechamento" }
                  ].map((cat) => (
                    <button
                      key={`drawer-${cat.id}`}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all",
                        activeCategory === cat.id
                          ? "bg-emerald-700 text-white shadow-xs"
                          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* LISTA DE OBJEÇÕES NO DRAWER */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div className="text-[11px] font-bold text-slate-500 px-1">
                  Exibindo {filteredApoio.length} script(s) de resposta
                </div>

                {filteredApoio.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <p className="text-xs font-bold text-slate-700">Nenhuma resposta encontrada para "{searchQuery}"</p>
                    <p className="text-[11px] text-slate-500">Tente buscar por termos genéricos como taxa, banco ou golpe.</p>
                  </div>
                ) : (
                  filteredApoio.map((item) => (
                    <div
                      key={`drawer-item-${item.id}`}
                      className="p-4 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-emerald-300 rounded-2xl space-y-2.5 transition-all shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900 bg-white border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs">
                          “{item.clientSays}”
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {item.nextStep}
                        </span>
                      </div>

                      {/* MOCK WHATSAPP */}
                      <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                        <div className="bg-white rounded-2xl rounded-tl-xs p-3 shadow-sm max-w-[95%] border border-slate-100 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-line select-all">
                          {item.response}
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-normal">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-slate-500 italic max-w-[280px] truncate">
                          {item.whenToUse}
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.response, `drawer-${item.id}`)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
                        >
                          {copiedId === `drawer-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedId === `drawer-${item.id}` ? "Copiado!" : "Copiar Script"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* RODAPÉ DO DRAWER */}
              <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>35k+ servidores atendidos</span>
                </div>
                <button
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all"
                >
                  Fechar Painel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}

