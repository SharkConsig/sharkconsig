"use client"

import React, { useState } from "react"
import Link from "next/link"
import Image from "next/image"
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
  AlertCircle,
  X,
  SlidersHorizontal,
  Compass,
  CheckCheck,
  Download,
  Mic,
  Video
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function StartComercialDevPage() {
  const { perfil, user, isLoading, isAdmin, isDeveloper, isCorretor } = useAuth()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeCategory, setActiveCategory] = useState<string>("todos")
  const [activeTab6, setActiveTab6] = useState<"senff" | "facultativa" | "reacoes" | "plano" | "quitacao" | "documentos">("senff")
  const [activeStep, setActiveStep] = useState<number | "all">(1)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isCampaignImageModalOpen, setIsCampaignImageModalOpen] = useState(false)
  const [isLeadImageModalOpen, setIsLeadImageModalOpen] = useState(false)
  const [isPropostaQuitacaoModalOpen, setIsPropostaQuitacaoModalOpen] = useState(false)
  const [isRetomadaImageModalOpen, setIsRetomadaImageModalOpen] = useState(false)
  const [isRetomadaVideoModalOpen, setIsRetomadaVideoModalOpen] = useState(false)
  const [isCalcularImageModalOpen, setIsCalcularImageModalOpen] = useState(false)
  const [isFacultativaImageModalOpen, setIsFacultativaImageModalOpen] = useState(false)
  const [isDadosContaImageModalOpen, setIsDadosContaImageModalOpen] = useState(false)
  const [isImageBankModalOpen, setIsImageBankModalOpen] = useState(false)
  const [downloadingImage, setDownloadingImage] = useState<string | null>(null)

  const BANCO_DE_IMAGENS = [
    {
      id: "alteracao",
      title: "Alteração",
      filename: "alteracao.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/alteracao.jpeg"
    },
    {
      id: "alteracao_pmsp",
      title: "Alteração PM SP",
      filename: "alteracao_pmsp.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/alteracao_pmsp.jpeg"
    },
    {
      id: "alteracao_pref_sp",
      title: "Alteração Prefeitura SP",
      filename: "alteracao_pref_sp.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/alteracao_pref_sp.jpeg"
    },
    {
      id: "alteracao_seu_contrato",
      title: "Alteração Seu Contrato",
      filename: "alteracao_seu_contrato.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/alteracao_seu_contrato.jpeg"
    },
    {
      id: "carencia",
      title: "Carência",
      filename: "carencia.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/carencia.jpeg"
    },
    {
      id: "contra_cheque_atualizado",
      title: "Contra Cheque Atualizado",
      filename: "contra_cheque_atualizado.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/contra_cheque_atualizado.jpeg"
    },
    {
      id: "matriculas_spprev",
      title: "Matrículas SPPREV",
      filename: "matriculas_spprev.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/matriculas_spprev.jpeg"
    },
    {
      id: "mudanca_entrou_em_vigor",
      title: "Mudança Entrou em Vigor",
      filename: "mudanca_entrou_em_vigor.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/mudanca_entrou_em_vigor.jpeg"
    },
    {
      id: "nova_alteracao",
      title: "Nova Alteração",
      filename: "nova_alteracao.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/nova_alteracao.jpeg"
    },
    {
      id: "pagar_taxas_como_estas",
      title: "Pagar Taxas Como Estas",
      filename: "pagar_taxas_como_estas.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/pagar_taxas_como_estas.jpeg"
    },
    {
      id: "pm_sp",
      title: "PM SP",
      filename: "pm_sp.png",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/pm_sp.png"
    },
    {
      id: "prejudicando_voce",
      title: "Prejudicando Você",
      filename: "prejudicando_voce.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/prejudicando_voce.jpeg"
    },
    {
      id: "voce_tem_aprovacao",
      title: "Você Tem Aprovação",
      filename: "voce_tem_aprovacao.jpeg",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/voce_tem_aprovacao.jpeg"
    },
    {
      id: "retomada_1",
      title: "Retomada 1",
      filename: "retomada_1.png",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/retomada_1.png"
    },
    {
      id: "retomada_video",
      title: "Retomada Vídeo",
      filename: "retomada_video.png",
      url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/retomada_video.png"
    }
  ]

  const regimeUpper = (perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || '').toUpperCase().trim()
  const isCorretorPJ = (perfil?.role === 'Corretor' || isCorretor) && regimeUpper === 'PJ'

  const isAuthorized = 
    isAdmin || 
    isDeveloper || 
    perfil?.role === 'Desenvolvedor' || 
    user?.user_metadata?.role === 'Desenvolvedor' || 
    perfil?.role === 'Administrador' || 
    user?.user_metadata?.role === 'Administrador' || 
    perfil?.role === 'Supervisor' || 
    user?.user_metadata?.role === 'Supervisor' || 
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
      response: "Nosso grupo trabalha com todos os bancos. Hoje, para esse cenário que estou te apresentando, a dinâmica está sendo feita pelo banco [NOME DO BANCO].",
      whenToUse: "Depois de cenário definido. Entre no mérito do banco apenas se o cliente questionar novamente.",
      nextStep: "AVANÇAR PARA PROPOSTA"
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
      id: "apoio-7",
      category: "seguranca",
      clientSays: "Isso parece golpe / Não confio.",
      response: "Você está certo em validar e até estranharia se não fizesse.\n\nEntão vou começar com o ponto da segurança, combinado?",
      whenToUse: "Envie vídeo curto, inferior a 30 segundos, com uma apresentação natural, leve sorriso e posicionamento.",
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
      response: "Porque o contrato mostra o prazo padrão do órgão, e o que eu te trouxe foi o plano de amortização para te dar clareza e você entender exatamente o que está contratando.\n\nSeguindo o plano apresentado, você quita exatamente no que acordamos.\n\nEu separo as duas coisas para você enxergar com clareza o que está contratando e ter autonomia para antecipar. Aqui quem manda é você!",
      responses: [
        {
          label: "Opção A",
          text: "Porque o contrato mostra o prazo padrão do órgão, e o que eu te trouxe foi o plano de amortização para te dar clareza e você entender exatamente o que está contratando.\n\nSeguindo o plano apresentado, você quita exatamente no que acordamos.\n\nEu separo as duas coisas para você enxergar com clareza o que está contratando e ter autonomia para antecipar. Aqui quem manda é você!"
        },
        {
          label: "Opção B (Dominante)",
          text: "Porque o contrato mostra o prazo padrão do órgão. O que eu te trouxe foi o plano de amortização para você enxergar exatamente como vai funcionar.\n\nSeguindo o plano, você quita no que acordamos. Eu separo as duas coisas justamente para você ter clareza e autonomia para antecipar quando quiser. Aqui quem manda é você."
        },
        {
          label: "Opção C (Influente)",
          text: "O contrato vai mostrar o prazo padrão do órgão, mas por isso eu te trouxe o plano separado: para você enxergar de forma simples como fica o que combinamos.\n\nSeguindo esse plano, você quita exatamente como conversamos e ainda fica com liberdade para antecipar. A ideia é você entender tudo sem complicação."
        },
        {
          label: "Opção D (Estável)",
          text: "O contrato mostra o prazo padrão do órgão. O plano de amortização serve justamente para você visualizar com tranquilidade como será a quitação dentro do que combinamos.\n\nSeguindo o plano, você chega ao prazo acordado e ainda mantém a possibilidade de antecipar. Assim você sabe exatamente o caminho que está seguindo."
        },
        {
          label: "Opção E (Analítico)",
          text: "São duas informações diferentes: o contrato apresenta o prazo padrão do órgão; o plano de amortização apresenta o cenário de quitação que estruturamos.\n\nSeguindo o plano apresentado, a quitação acontece no prazo acordado. Eu separo contrato e plano justamente para você analisar cada informação com clareza e manter autonomia para antecipar."
        }
      ],
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
    },
    {
      id: "apoio-16",
      category: "referencias",
      clientSays: "Referências da empresa",
      response: "Já atendemos mais de 35 mil servidores no Brasil. Atuamos com foco em servidores públicos, todos os bancos, exceto cooperativas.\n\nCentenas de comentários no Google, 5 estrelas e verificada no RA.\n\nhttps://instagram.com/acertofacilpromotora",
      whenToUse: "Apresenta credenciais e canais oficiais da empresa para gerar total confiança.",
      nextStep: "ENVIAR REFERÊNCIAS"
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
                  ? "Exibindo todas as 9 etapas do fluxo comercial na página."
                  : `Você está na Etapa ${activeStep} de 9. Siga as orientações focadas abaixo:`}
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

          {/* PIPELINE / STEPPER DE 9 CARDS INTERATIVOS COM ROLAGEM HORIZONTAL */}
          <div className="flex gap-3 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent snap-x">
            
            {/* ETAPA 1 */}
            <button
              onClick={() => goToStep(1)}
              className={cn(
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
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
                  ACIONE O LEAD
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
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
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
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
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
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
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
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
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
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
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
                  6. APRESENTAR PROPOSTA
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 6 ? "text-teal-200" : "text-teal-800")}>
                  Calcule, mostre poucos cenários e trate reações.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 6 ? "text-teal-400 translate-x-1" : "text-teal-600")} />
              </div>
            </button>

            {/* ETAPA 7 */}
            <button
              onClick={() => goToStep(7)}
              className={cn(
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 7
                  ? "bg-purple-950 text-white border-purple-500 shadow-md ring-2 ring-purple-500/30 scale-[1.02]"
                  : "bg-purple-50/70 hover:bg-purple-100/80 border-purple-300 text-purple-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 7 ? "bg-purple-500 text-white" : "bg-purple-600 text-white"
                  )}>
                    Etapa 7
                  </span>
                  {activeStep === 7 && (
                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 7 ? "text-white" : "text-purple-950")}>
                  7. PLANO AMORTIZAÇÃO
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 7 ? "text-purple-200" : "text-purple-800")}>
                  Envie o plano e guie e leitura.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 7 ? "text-purple-400 translate-x-1" : "text-purple-600")} />
              </div>
            </button>

            {/* ETAPA 8 */}
            <button
              onClick={() => goToStep(8)}
              className={cn(
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 8
                  ? "bg-emerald-950 text-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30 scale-[1.02]"
                  : "bg-emerald-50/70 hover:bg-emerald-100/80 border-emerald-300 text-emerald-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 8 ? "bg-emerald-500 text-white" : "bg-emerald-600 text-white"
                  )}>
                    Etapa 8
                  </span>
                  {activeStep === 8 && (
                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 8 ? "text-white" : "text-emerald-950")}>
                  8. QUITAÇÃO DE CARTÃO
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 8 ? "text-emerald-200" : "text-emerald-800")}>
                  Operação especial de quitação de saldo e redução de folha.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 8 ? "text-emerald-400 translate-x-1" : "text-emerald-600")} />
              </div>
            </button>

            {/* ETAPA 9 */}
            <button
              onClick={() => goToStep(9)}
              className={cn(
                "min-w-[185px] w-[185px] shrink-0 snap-start text-left rounded-2xl p-3.5 transition-all cursor-pointer flex flex-col justify-between relative border-2",
                activeStep === 9
                  ? "bg-slate-950 text-white border-slate-500 shadow-md ring-2 ring-slate-500/30 scale-[1.02]"
                  : "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-950 hover:scale-[1.01]"
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    activeStep === 9 ? "bg-slate-800 text-white" : "bg-slate-700 text-white"
                  )}>
                    Etapa 9
                  </span>
                  {activeStep === 9 && (
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-wide">
                      ● Ativa
                    </span>
                  )}
                </div>
                <h3 className={cn("text-xs font-black uppercase tracking-wide", activeStep === 9 ? "text-white" : "text-slate-950")}>
                  9. DOCUMENTOS & ACEITOU
                </h3>
                <p className={cn("text-[11px] font-semibold mt-1 leading-snug", activeStep === 9 ? "text-slate-300" : "text-slate-700")}>
                  Coleta documental e retomadas pelo ponto de parada.
                </p>
              </div>
              <div className="flex justify-end pt-2">
                <ChevronRight className={cn("w-4 h-4 transition-transform", activeStep === 9 ? "text-slate-400 translate-x-1" : "text-slate-600")} />
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
                  <span>Abra uma campanha.</span>
                </li>
                <li className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[12.75px] font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Pegue o contato do cliente e abra o Whatsapp.</span>
                </li>
                <li className="flex items-start gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-[12.75px] font-semibold text-slate-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Escolha a mensagem na ETAPA 2 para abordar o cliente.</span>
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

          {/* SEÇÃO: COMO ABRIR UMA CAMPANHA */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-emerald-600 rounded-full"></div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
                COMO ABRIR UMA CAMPANHA
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* LADO ESQUERDO: ORIENTAÇÃO */}
              <div className="lg:col-span-6 space-y-4">
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
                  Para abrir e trabalhar com os leads de uma campanha no SharkConsig, siga este passo a passo simples:
                </p>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-[#19223D] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs text-slate-800 leading-relaxed">
                      No menu lateral (sidebar), clique no link <strong className="text-slate-950 font-black">ACESSAR CAMPANHA</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-[#19223D] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs text-slate-800 leading-relaxed">
                      Na lista de campanhas disponíveis, escolha a campanha que deseja operar.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-[#009966] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs text-slate-800 leading-relaxed">
                      Clique no botão <strong className="text-emerald-700 font-black">"INICIAR"</strong> para abrir a fila de atendimento e começar o contato com os clientes.
                    </div>
                  </div>
                </div>
              </div>

              {/* LADO DIREITO: PREVIEW CLICÁVEL DA IMAGEM E BOTÃO */}
              <div className="lg:col-span-6 flex flex-col space-y-3">
                <div 
                  onClick={() => setIsCampaignImageModalOpen(true)}
                  className="group relative rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-emerald-500 bg-slate-900 cursor-pointer transition-all shadow-md hover:shadow-xl"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsCampaignImageModalOpen(true) }}
                >
                  <div className="relative w-full aspect-[16/10] bg-slate-950">
                    <Image
                      src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/abrir_campanha.png"
                      alt="Tela de como abrir uma campanha"
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* OVERLAY INDICANDO CLIQUE PARA AMPLIAR */}
                  <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-emerald-400" /> Clique para ampliar
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO: COMO APARECERÃO OS DADOS DO LEAD */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-5 bg-emerald-600 rounded-full"></div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wide">
                COMO APARECERÃO OS DADOS DO LEAD
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              {/* LADO ESQUERDO: PASSOS */}
              <div className="lg:col-span-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-[#19223D] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <div className="text-xs text-slate-800 leading-relaxed font-medium">
                      Pegue o whatsapp e chame o cliente.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-[#19223D] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <div className="text-xs text-slate-800 leading-relaxed font-medium">
                      Após isso, selecione o status e clique em próximo cliente para avançar para o próximo lead.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-[#009966] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <div className="text-xs text-slate-800 leading-relaxed font-medium">
                      Você só conseguirá sair da campanha, após selecionar a tabulação.
                    </div>
                  </div>
                </div>
              </div>

              {/* LADO DIREITO: IMAGEM */}
              <div className="lg:col-span-6 flex flex-col space-y-3">
                <div 
                  onClick={() => setIsLeadImageModalOpen(true)}
                  className="group relative rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-emerald-500 bg-slate-900 cursor-pointer transition-all shadow-md hover:shadow-xl"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsLeadImageModalOpen(true) }}
                >
                  <div className="relative w-full aspect-[16/10] bg-slate-950">
                    <Image
                      src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/lead_campanha.png"
                      alt="Como aparecerão os dados do lead"
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* OVERLAY INDICANDO CLIQUE PARA AMPLIAR */}
                  <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-emerald-400" /> Clique para ampliar
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BOTÃO PARA ACESSAR A CAMPANHA */}
          <div className="flex justify-center">
            <Link
              href="/campanhas/distribuicao"
              className="inline-flex items-center justify-center gap-2 w-4/5 py-2.5 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <span>clique aqui para acessar uma campanha</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
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
              REGRA PARA O NOVO CLIENTE
            </span>
            <p className="text-[13px] text-slate-800 font-medium leading-relaxed">
              A primeira mensagem não precisa explicar banco, amortização, engenharia da operação ou todas as condições. Ela precisa dar contexto, mostrar uma vantagem e gerar resposta.
            </p>
          </div>

          {/* SCRIPTS COPIÁVEIS */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200">
              <div className="w-1.5 h-4.5 bg-blue-600 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                O Que Falar - Mensagem Inicial
              </h3>
            </div>

            {/* LISTA COMPLETA DE MENSAGENS INICIAIS E DE CONTEXTO */}
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-blue-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    Modelos de abordagem inicial para novos clientes. Utilize o botão <strong>BANCO DE IMAGENS</strong> para escolher e baixar os criativos diretamente para seu computador.
                  </span>
                </div>
                <button
                  id="btn-banco-de-imagens"
                  onClick={() => setIsImageBankModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-[10px] font-bold rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-auto"
                  title="Abrir banco de imagens para mensagens"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>BANCO DE IMAGENS</span>
                </button>
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

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard("E aí, [Nome]! Como anda por aí?\n\nPessoal da PM foi surpreendido com uma notícia positiva. E estou priorizando você e seus colegas:\n\n24 meses no consignado e taxa na casa de 1%.\n\nRecebeu alguma proposta nesse sentido, [Nome]?", "ini-1")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "ini-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "ini-1" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                    </button>
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

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard("Oi, [Nome]! Tudo certo por aí?\n\nFaz um tempo que atendo o pessoal da [ÓRGÃO CLIENTE], e estou conversando com mais servidores sobre:\n\n24 meses no consignado e taxa na casa de 1%.\n\nRecebeu alguma proposta nesse sentido ou posso trazer o cenário do teu caso, [Nome]?", "ini-2")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "ini-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "ini-2" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                    </button>
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

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard("[Nome], tudo bem?\nLocalizamos uma aprovação no seu CPF pela condição especial para servidores da [ÓRGÃO CLIENTE].\n\nAs condições variam de 0,82% a 1,32% conforme seu órgão e tempo de contrato, por isso o valor pode mudar se você não confirmar logo.\n\nConsulta rápida, sem compromisso, só dar *Oi* 👇", "ini-3")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "ini-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "ini-3" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                    </button>
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

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard("[Nome]! 👀 Atualizou uma alteração que beneficiou a sua matrícula, com possibilidade de 12, 24 e 36 meses no seu consignado.\n\nAntes de eu encerrar sua análise, quero confirmar se você já aproveitou a condição de 1% ou ainda posso verificar para você?\n\nMe responde aqui que mostro antes do encerramento.", "ini-4")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "ini-4" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "ini-4" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                    </button>
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

                          <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard("Oi, [Nome]! Tudo bem?\n\nIdentifiquei que o seu CPF ficou temporariamente enquadrado em um consignado com:\n24 meses e taxa de 0.96%.\n\nVocê recebeu alguma proposta sobre isso recentemente?", "ini-5")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "ini-5" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "ini-5" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                    </button>
                  </div>

                  {/* MODELO 6 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          6. Contexto + Comparação
                        </span>
                        <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200/80 px-1.5 py-0.5 rounded">Opção Principal</span>
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
                    </div>
                    <button
                      onClick={() => copyToClipboard("Oi, [Nome].\n\nTudo certo por aí?\n\nEstou falando com alguns servidores da *[ÓRGÃO]* porque abriu uma condição que pode *reduzir bastante a duração* do consignado.\n\nVocê recebeu alguma proposta recente ou ainda não chegou a comparar?", "p-1")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "p-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "p-1" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                    </button>
                  </div>

                  {/* MODELO 7 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          7. Condição Já Liberada para a Base
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
                    </div>
                    <button
                      onClick={() => copyToClipboard("Oi, [Nome].\n\nPara servidores da *[ÓRGÃO]*, estamos trabalhando uma estrutura de *duração reduzida* e taxa na casa de *[REFERÊNCIA DA CAMPANHA]*.\n\nVocê já recebeu alguma proposta nesse formato ou posso conferir o teu cenário?", "p-2")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "p-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "p-2" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                    </button>
                  </div>

                  {/* MODELO 8 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          8. Direta e Curta
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
                    </div>
                    <button
                      onClick={() => copyToClipboard("[Nome], tudo bem?\n\n0.96% no teu consignado hoje pode ser uma boa opção.\n\nVocê já recebeu proposta recentemente?", "p-3")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "p-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "p-3" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                    </button>
                  </div>

                  {/* MODELO 9 */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                          9. Reativação
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
              </div>
            </div>

          {/* 2.1 E SE O CLIENTE NÃO RESPONDER? */}
          <div className="pt-6 border-t border-slate-100 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4.5 bg-amber-500 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                E se o cliente não responder?
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* RETOMADA 1 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Retomada Curta
                    </span>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200/80 text-slate-700 text-xs font-black shrink-0">
                      1
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

                  <p className="text-[12.75px] font-medium text-black/90 italic flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-black/90 shrink-0 not-italic" />
                    <span>
                      <strong className="font-bold">Observação:</strong> <span className="font-semibold">Turno inverso da mensagem inicial.</span>
                    </span>
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

              {/* RETOMADA COM ÁUDIO (POSIÇÃO 2) */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Retomada com Áudio
                    </span>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200/80 text-slate-700 text-xs font-black shrink-0">
                      2
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[95%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 not-italic select-none">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Mic className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          Gravar em Áudio
                        </span>
                      </div>
                      <p>[NOME CLIENTE], Pessoal da [ÓRGÃO CLIENTE] que atendo muito, na grande maioria tem gostado bastante da opção que surgiu no consignado.</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  {/* OBSERVAÇÃO ABAIXO DE ENVIAR ÁUDIO */}
                  <p className="text-[12.75px] font-semibold text-black/90 italic flex items-start gap-1.5 leading-snug">
                    <AlertCircle className="w-4 h-4 text-black/90 shrink-0 not-italic mt-0.5" />
                    <span className="text-black/90">
                      Pular um dia após a ultima retomada, se enviou a retomada anterior na segunda-feira, envie o áudio na quarta-feira, em horário diferente.
                    </span>
                  </p>

                  {/* TEXTO COMPLEMENTAR */}
                  <div className="space-y-2">
                    <p className="text-[12px] font-semibold text-emerald-700 leading-snug">
                      Texto complementar para enviar 2 horas após o envio do áudio, caso cliente não tenha interagido:
                    </p>
                    <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed space-y-1 select-all">
                        <p>Pensei em você porque os colegas tem gostado.</p>
                        <p>Você recebeu o comparativo?</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => copyToClipboard("Pensei em você porque os colegas tem gostado.\n\nVocê recebeu o comparativo?", "ret-audio-comp")}
                      className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedId === "ret-audio-comp" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "ret-audio-comp" ? "Copiado!" : "Copiar Texto Complementar"}
                    </button>
                  </div>
                </div>
              </div>

              {/* RETOMADA COM IMAGEM */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Retomada com imagem (pular 2 dias)
                    </span>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200/80 text-slate-700 text-xs font-black shrink-0">
                      3
                    </span>
                  </div>

                  {/* ORIENTAÇÃO */}
                  <p className="text-[12.75px] font-semibold text-black/90 italic flex items-start gap-1.5 leading-snug">
                    <AlertCircle className="w-4 h-4 text-black/90 shrink-0 not-italic mt-0.5" />
                    <span>
                      Envie comparativo (especifico do cliente) caso não tenha enviado ainda com mensagem de texto junto da imagem. Ajustando os valores citados no texto. Exemplo:
                    </span>
                  </p>

                  {/* MOCK WHATSAPP COM IMAGEM E LEGENDA */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-1.5 shadow-sm max-w-[95%] border border-slate-100 text-slate-800 font-sans">
                      <div 
                        onClick={() => setIsRetomadaImageModalOpen(true)}
                        className="rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900/5 cursor-zoom-in group relative"
                        title="Clique para ver a imagem em tamanho real"
                      >
                        <img
                          src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/retomada_1.png"
                          alt="Comparativo - Retomada"
                          className="w-full h-auto object-cover max-h-60 group-hover:scale-[1.02] transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm pointer-events-none">
                            Clique para ampliar
                          </span>
                        </div>
                      </div>
                      <div className="px-2 pt-2 pb-1 text-[12.75px] leading-relaxed select-all">
                        <p>Faz sentido pagar apenas <em>R$ 35</em> a menos por mês e ficar <em>72</em> meses a mais pagando?</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Faz sentido pagar apenas _R$ 35_ a menos por mês e ficar _72_ meses a mais pagando?", "ret-img-1")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "ret-img-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "ret-img-1" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* RETOMADA COM VÍDEO */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Retomada com vídeo
                    </span>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200/80 text-slate-700 text-xs font-black shrink-0">
                      4
                    </span>
                  </div>

                  {/* MOCK WHATSAPP COM VÍDEO */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[95%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 not-italic select-none">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Video className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          Gravar Vídeo
                        </span>
                      </div>
                      <p>[NOME CLIENTE] já pagou na prática <strong>1% em algum consignado da tua folha</strong>? Se a resposta é não, posso te mostrar um cenário que agora você pode. Posso enviar abaixo?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  {/* OBSERVAÇÃO */}
                  <p className="text-[12.75px] font-semibold text-black/90 italic flex items-start gap-1.5 leading-snug">
                    <AlertCircle className="w-4 h-4 text-black/90 shrink-0 not-italic mt-0.5" />
                    <span className="text-black/90">
                      Envie esta mensagem de 2 a 4 dias seguintes após a retomada anterior.
                    </span>
                  </p>

                  {/* EXEMPLO DE ENVIO DO VÍDEO COM LEGENDA */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[12px] font-semibold text-emerald-700 leading-snug">
                      No envio do vídeo, colocar no campo texto (legenda) do whatsapp o primeiro nome do cliente (junto do vídeo e não após o envio do vídeo). Exemplo:
                    </p>
                    <div 
                      onClick={() => setIsRetomadaVideoModalOpen(true)}
                      className="rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900/5 cursor-zoom-in group relative"
                      title="Clique para ver a imagem em tamanho real"
                    >
                      <img
                        src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/retomada_video.png"
                        alt="Exemplo envio de vídeo com legenda"
                        className="w-full h-52 object-cover object-bottom group-hover:scale-[1.02] transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm pointer-events-none">
                          Clique para ampliar
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* LIGAÇÃO PARA CLIENTE */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Ligação para cliente
                    </span>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200/80 text-slate-700 text-xs font-black shrink-0">
                      5
                    </span>
                  </div>

                  {/* ORIENTAÇÃO */}
                  <p className="text-[12.75px] font-semibold text-black/90 italic flex items-start gap-1.5 leading-snug">
                    <AlertCircle className="w-4 h-4 text-black/90 shrink-0 not-italic mt-0.5" />
                    <span>
                      Não mencione a falta de interação nem faça apresentação formal. Conduza a ligação como continuidade natural da conversa, de forma objetiva, com autoridade e sem arrogância. Se cliente não atender e você quer ganhar dinheiro, sugiro que ligue mais vezes ao longo do dia.
                    </span>
                  </p>

                  {/* ROTEIRO DA LIGAÇÃO */}
                  <div className="pt-1">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs relative text-[12.75px] text-slate-800 font-sans leading-relaxed space-y-2 select-all">
                      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 not-italic select-none">
                        <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                          <Phone className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          Roteiro da Ligação
                        </span>
                      </div>
                      <p>“[PRIMEIRO NOME DO CLIENTE], como você tá?</p>
                      <p>[NOME], você tá na correria e eu não gosto de ficar só pelo Whats. Pra otimizar: aquilo que te mostrei sobre conseguir a condição na casa de 1% no consignado, faz sentido eu te mostrar como fica no teu caso antes da nova alteração que vai tirar essa opção pra você da [ÓRGÃO CLIENTE]?”</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RETOMADA 3 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                      Encerramento sem Pressão
                    </span>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200/80 text-slate-700 text-xs font-black shrink-0">
                      6
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Chato não é o caminho que gosto de seguir. Vou encerrar por aqui para não insistir. Se quiser conferir o formato que abriu para você, estou à disposição, sem compromisso, [NOME DO CLIETNE].</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <p className="text-[12.75px] font-semibold text-black/90 italic flex items-start gap-1.5 leading-snug">
                    <AlertCircle className="w-4 h-4 text-black/90 shrink-0 not-italic mt-0.5" />
                    <span className="text-black/90">
                      Enviar em 1 a 2 dias após a ligação.
                    </span>
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard("Chato não é o caminho que gosto de seguir. Vou encerrar por aqui para não insistir.\n\nSe quiser conferir o formato que abriu para você, estou à disposição, sem compromisso, *[NOME DO CLIETNE]*.", "ret-3")}
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
                <li>Enviar volume do tipo Ctrl C e Ctrl V de uma única mensagem para diversos clientes ou enviar muitas mensagens variadas em curto espaço de tempo.</li>
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
                      <p className="mt-2">Qual foi o motivo que travou para não fechar a negociação?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Entendi.\n\nQual foi o motivo que travou para não fechar a negociação?", "sonde-2")}
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
                      <p className="mt-2">Se hoje não existe necessidade de valor, não faz sentido te passar uma proposta por passar.</p>
                      <p className="mt-2">Você possui algum contrato ou cartão dentro (ou fora de folha) que você gostaria de reduzir ou quitar?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Entendi.\n\nSe hoje não existe necessidade de valor, não faz sentido te passar uma proposta por passar.\n\nVocê possui algum contrato ou cartão dentro (ou fora de folha) que você gostaria de reduzir ou quitar?", "sonde-4")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-4" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-4" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* SCRIPT 5 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded uppercase">
                      "Preciso pensar / Analisar"
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Claro.</p>
                      <p className="mt-2">Para eu não ficar te procurando sem contexto: o que você quer analisar melhor - necessidade do valor, <strong>parcela, prazo</strong> ou segurança da operação?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Claro.\n\nPara eu não ficar te procurando sem contexto: o que você quer analisar melhor - necessidade do valor, *parcela, prazo* ou segurança da operação?", "sonde-5")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-5" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-5" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* SCRIPT 6 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded uppercase">
                      "Não tenho interesse em nova liberação"
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Entendi.</p>
                      <p className="mt-2">Então não vou insistir em nova liberação.</p>
                      <p className="mt-2">Se a operação permitir melhoria em algo que você já tem, eu posso conferir isso; se não houver ganho real, encerramos.</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Entendi.\n\nEntão não vou insistir em nova liberação.\n\nSe a operação permitir melhoria em algo que você já tem, eu posso conferir isso; se não houver ganho real, encerramos.", "sonde-6")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-6" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-6" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* SCRIPT 7 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded uppercase">
                      "O valor ficou baixo"
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Entendi.</p>
                      <p className="mt-2">Qual valor faria sentido para você considerar?</p>
                      <p className="mt-2">Se a margem não sustentar algo próximo disso, eu já te digo e não estico a conversa.</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Entendi.\n\nQual valor faria sentido para você considerar?\n\nSe a margem não sustentar algo próximo disso, eu já te digo e não estico a conversa.", "sonde-7")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-7" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-7" ? "Copiado com Negrito!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* SCRIPT 8 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded uppercase">
                      "Não tenho margem"
                    </span>
                  </div>

                  {/* MOCK WHATSAPP */}
                  <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm max-w-[92%] border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Muitos servidores comentaram isso. Como houve bastante oscilação, o que você viu pode já ter mudado.</p>
                      <p className="mt-2">Posso conferir e te passar a informação atualizada, sem compromisso.</p>
                      <p className="mt-2">Pode ser?</p>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Muitos servidores comentaram isso. Como houve bastante oscilação, o que você viu pode já ter mudado.\n\nPosso conferir e te passar a informação atualizada, sem compromisso.\n\nPode ser?", "sonde-8")}
                  className="w-full py-2.5 bg-[#0f172a] hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedId === "sonde-8" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "sonde-8" ? "Copiado com Negrito!" : "Copiar Mensagem"}
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

            {/* CARD DE REGRA */}
            <div className="p-3.5 sm:px-4 bg-[#f0fdf4] border border-[#009966] rounded-xl text-left">
              <span className="text-[11px] font-black text-[#009966] uppercase tracking-wider block">
                REGRA
              </span>
              <p className="text-[13px] text-slate-800 font-medium mt-0.5">
                Quando o cliente demonstra intenção clara de avançar, não continue vendendo o que já foi vendido.
              </p>
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
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Responda e avance direto para a coleta de documentos.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“Como eu assino?”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Explique a formalização e avance.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“Quando o dinheiro cai?”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Responda o prazo operacional validado e avance.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“Pode seguir.”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Não volte a vender. Execute.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/80">
                    <td className="p-3.5 sm:px-6 font-bold text-slate-900 text-[12.75px]">“Esse valor é líquido?”</td>
                    <td className="p-3.5 sm:px-6 text-emerald-700 font-semibold text-[12.75px]">Responda objetivamente e confirme o próximo passo</td>
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
                  <span>Valor exato de liberação.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Parcela exata.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Taxa aplicada naquele cenário.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Prazo contratual e duração projetada quando houver amortização.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Margem disponível/averbada.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Banco/tabela escolhidos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Condição de quitação e documentos necessários.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* EXEMPLO ERRADO / EXEMPLO CERTO */}
          <div className="space-y-3">
            {/* EXEMPLO ERRADO */}
            <div className="p-3.5 sm:px-4 bg-[#fef2f2] border border-[#ef4444] rounded-xl text-left">
              <span className="text-[11px] font-black text-[#dc2626] uppercase tracking-wider block">
                EXEMPLO ERRADO
              </span>
              <p className="text-[13px] text-slate-800 font-medium mt-0.5">
                “Sua proposta é R$ 8.588,50 em 24 meses com taxa X” se o corretor ainda não abriu o cliente nem possui base para esses números.
              </p>
            </div>

            {/* EXEMPLO CERTO */}
            <div className="p-3.5 sm:px-4 bg-[#f0fdf4] border border-[#009966] rounded-xl text-left">
              <span className="text-[11px] font-black text-[#009966] uppercase tracking-wider block">
                EXEMPLO CERTO
              </span>
              <div className="text-[13px] text-slate-800 font-medium mt-0.5 space-y-1">
                <p>“Temos uma condição que vale a pena conferir.</p>
                <p>Vou abrir teu caso agora e enquadrar a condição mais favorável que está abrindo.”</p>
              </div>
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
                  CLIENTE INTERAGIU? ABRA/ATUALIZE O CHAMADO. SEMPRE!
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
            <div className="p-5 bg-emerald-100/80 border border-emerald-400 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h3 className="text-xs font-black uppercase tracking-wider">Abra Chamado Quando</h3>
              </div>
              <ul className="text-[12.75px] text-emerald-950 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Margem exibida não faz sentido ou diverge do contracheque.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>Contrato ou desconto possui informação que você não consegue interpretar.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>O cálculo não fecha com as regras operacionais do sistema.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>É necessário enviar contracheque ou documento para análise.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>O caso foge do padrão que você conhece.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>A condição depende de validação de enquadramento ou retaguarda.</span>
                </li>
              </ul>
            </div>

            {/* NÃO PRECISA ABRIR CHAMADO QUANDO */}
            <div className="p-5 bg-rose-100/80 border border-rose-400 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
                <h3 className="text-xs font-black uppercase tracking-wider">Não Precisa Abrir Chamado Quando</h3>
              </div>
              <ul className="text-[12.75px] text-rose-950 space-y-2 font-medium">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>A informação está claramente na tela.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>A dúvida é "o cliente quer mais valor ou prazo menor?" (pergunte a ele).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>Você ainda nem fez a consulta básica.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>O cliente ainda não respondeu e não existe dúvida técnica.</span>
                </li>
              </ul>
            </div>

          </div>

          {/* MODELO DE CHAMADO */}
          <div className="p-4 bg-emerald-50/80 border border-emerald-400 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-xs font-black uppercase tracking-wider text-emerald-700">MODELO DE CHAMADO</p>
              <p className="text-sm font-bold text-slate-900">CONSULTAR MARGEM ATUAL DO CLIENTE.</p>
              <p className="text-xs text-slate-800">
                <strong className="font-black text-slate-900">Quando usar:</strong> Chamado curto, com contexto suficiente para a retaguarda decidir.
              </p>
            </div>
            <button
              onClick={() => copyToClipboard("CONSULTAR MARGEM ATUAL DO CLIENTE.", "chamado-mod")}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer"
            >
              {copiedId === "chamado-mod" ? "Copiado!" : "Copiar Modelo"}
            </button>
          </div>

          {/* REGRA */}
          <div className="p-4 bg-rose-50/80 border border-rose-400 rounded-2xl space-y-1.5">
            <p className="text-xs font-black uppercase tracking-wider text-rose-700">REGRA</p>
            <p className="text-xs sm:text-sm text-slate-800 font-medium">
              Não invente resposta para manter a conversa andando. Dúvida técnica não é objeção comercial.
            </p>
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
                  Calcular e escolher o que mostrar
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Transforme a sondagem em uma proposta que o cliente entenda em poucos segundos.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
              Proposta Simples
            </span>
          </div>

          {/* FAÇA AGORA */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Faça Agora</h3>
            </div>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-[12.75px] font-bold text-slate-800 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Calcule de acordo com a prioridade identificada.</span>
              </li>
              <li className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-[12.75px] font-bold text-slate-800 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Mostre poucos cenários. O cliente não precisa receber todas as tabelas que você testou.</span>
              </li>
              <li className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-[12.75px] font-bold text-slate-800 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Use o comparativo para destacar UMA vantagem principal.</span>
              </li>
              <li className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-[12.75px] font-bold text-slate-800 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Envie a imagem e em seguida faça uma pergunta de decisão.</span>
              </li>
            </ul>

            {/* EVITE */}
            <div className="p-3.5 sm:px-4 bg-[#fef2f2] border border-[#ef4444] rounded-2xl text-left space-y-1.5 shadow-xs">
              <span className="text-[11px] font-black text-[#dc2626] uppercase tracking-wider block">
                EVITE
              </span>
              <ul className="text-[13px] text-slate-800 font-medium space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>Mandar cinco cenários e pedir para o cliente escolher sozinho.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>Responder “é a melhor taxa do mercado” sem comparação real.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>Defender uma proposta que não atende ao objetivo que o próprio cliente informou.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* LISTA VERTICAL DE TÓPICOS DA ETAPA 6 */}
          <div className="space-y-10 pt-4 border-t border-slate-100">

            {/* 6.0A - COMPARATIVO SENFF */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                  Comparativo inicial | Margem complementar (utilizando operação cartão Senff)
                </span>
              </div>

              {/* SCRIPTS DE ENVIO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ANTES DE ENVIAR A IMAGEM */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    Antes de Enviar a Imagem
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Fiz a simulação e essa é a diferença que eu queria te mostrar.</p>
                      <p className="mt-2 font-semibold text-slate-900">Olha a vantagem que está aberta.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Fiz a simulação e essa é a diferença que eu queria te mostrar.\n\nOlha a vantagem que está aberta.", "s-env-1")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "s-env-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "s-env-1" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* IMAGEM CALCULAR COM LEGENDA */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-1.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans">
                      <div
                        onClick={() => setIsCalcularImageModalOpen(true)}
                        className="rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900/5 cursor-zoom-in group relative"
                        title="Clique para ver a imagem em tamanho real"
                      >
                        <img
                          src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/calcular.png"
                          alt="Comparativo - Calcular"
                          className="w-full h-auto object-cover max-h-60 group-hover:scale-[1.02] transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm pointer-events-none">
                            Clique para ampliar
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 select-all">
                        <p className="text-slate-800 leading-relaxed font-sans">Me conta aqui suas primeiras impressões</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Me conta aqui suas primeiras impressões", "s-env-2")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "s-env-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "s-env-2" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>
            </div>

            {/* 6.0B - MARGEM FACULTATIVA */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg">
                  Comparativo inicial | Margem Facultativa
                </span>
              </div>

              {/* CARD: COMO LER A REFERÊNCIA */}
              <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-2xl space-y-1 text-left">
                <span className="text-[11px] font-black text-blue-900 uppercase tracking-wider block">
                  COMO LER A REFERÊNCIA
                </span>
                <p className="text-[12.75px] text-slate-800 font-medium leading-relaxed">
                  Na margem facultativa, a primeira imagem abaixo serve como referência da escolha de prazo/taxa dentro da calculadora. A segunda é o comparativo visual que pode ser usado como gancho com o cliente.
                </p>
              </div>

              {/* IMAGENS DE REFERÊNCIA FACULTATIVA */}
              <div className="space-y-6">
                {/* IMAGEM 1 */}
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <div className="w-full max-w-[40%] rounded-2xl overflow-hidden border border-slate-200 shadow-md bg-slate-900">
                      <img
                        src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/selecao_prazo.png"
                        alt="Referência interna - seleção de prazo e taxa na margem facultativa"
                        className="w-full h-auto object-contain block rounded-2xl"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <p className="text-center text-xs text-slate-600 italic">
                    1. Referência interna - seleção de prazo e taxa na margem facultativa.
                  </p>
                </div>
              </div>

              {/* SCRIPTS DE ENVIO FACULTATIVA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ANTES DE ENVIAR O COMPARATIVO - FACULTATIVA */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    ANTES DE ENVIAR O COMPARATIVO - FACULTATIVA
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Levantei aqui o teu cenário pela <strong>margem facultativa</strong> e montei uma comparação para ficar simples de enxergar.</p>
                      <p className="mt-2">Vou te enviar a imagem e te aponto exatamente <strong>o que vale observar</strong> antes de qualquer decisão.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Levantei aqui o teu cenário pela *margem facultativa* e montei uma comparação para ficar simples de enxergar.\n\nVou te enviar a imagem e te aponto exatamente *o que vale observar* antes de qualquer decisão.", "fac-env-1")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "fac-env-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "fac-env-1" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* LEITURA DA IMAGEM - FACULTATIVA */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-1.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans">
                      <div
                        onClick={() => setIsFacultativaImageModalOpen(true)}
                        className="rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900/5 cursor-zoom-in group relative"
                        title="Clique para ver a imagem em tamanho real"
                      >
                        <img
                          src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/comparar_facultativa.png"
                          alt="Comparativo visual da margem facultativa"
                          className="w-full h-auto object-cover max-h-60 group-hover:scale-[1.02] transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm pointer-events-none">
                            Clique para ampliar
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5 select-all">
                        <p className="text-slate-800 leading-relaxed font-sans">Nessa comparação, qual cenário está mais dentro do que faz sentido para você?</p>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Nessa comparação, qual cenário está mais dentro do que faz sentido para você?", "fac-env-2")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "fac-env-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "fac-env-2" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>
            </div>

            {/* O CLIENTE REAGIU À PROPOSTA. E AGORA? */}
            <div className="space-y-4 pt-6 border-t border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg inline-block mb-[6px]">
                O CLIENTE REAGIU À PROPOSTA. E AGORA?
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. QUER MAIS VALOR */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    QUER MAIS VALOR
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Consigo tentar puxar a estrutura para liberação.</p>
                      <p className="mt-2">Me diz só uma coisa: existe um valor mínimo que faria sentido para você?</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Consigo tentar puxar a estrutura para liberação.\n\nMe diz só uma coisa: existe um valor mínimo que faria sentido para você?", "reac-1")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "reac-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "reac-1" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* 2. QUER PRAZO MENOR */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    QUER PRAZO MENOR
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Perfeito.</p>
                      <p className="mt-2">Vou reduzir a duração e te mostro quanto muda no valor para você decidir.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Perfeito.\n\nVou reduzir a duração e te mostro quanto muda no valor para você decidir.", "reac-2")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "reac-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "reac-2" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* 3. ESTÁ COMPARANDO COM OUTRA PROPOSTA */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    ESTÁ COMPARANDO COM OUTRA PROPOSTA
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Me passa o valor, a <strong>parcela</strong> e o <strong>prazo</strong> que te apresentaram.</p>
                      <p className="mt-2">Eu coloco pela mesma referência e te mostro a diferença real.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Me passa o valor, a *parcela* e o *prazo* que te apresentaram.\n\nEu coloco pela mesma referência e te mostro a diferença real.", "reac-3")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "reac-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "reac-3" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* 4. PERGUNTA A TAXA */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    PERGUNTA A TAXA
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Nesse cenário validado, a taxa é [TAXA] ao mês.</p>
                      <p className="mt-2">Agora vamos olhar junto valor, <strong>parcela</strong> e <strong>prazo</strong> para você comparar a condição completa.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Nesse cenário validado, a taxa é [TAXA] ao mês.\n\nAgora vamos olhar junto valor, *parcela* e *prazo* para você comparar a condição completa.", "reac-4")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "reac-4" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "reac-4" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* 5. "A PARCELA FICOU ALTA" */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    "A PARCELA FICOU ALTA"
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Entendi.</p>
                      <p className="mt-2">Qual faixa de <strong>parcela</strong> cabe com tranquilidade no teu orçamento?</p>
                      <p className="mt-2">Eu ajusto em cima disso.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Entendi.\n\nQual faixa de *parcela* cabe com tranquilidade no teu orçamento?\n\nEu ajusto em cima disso.", "reac-5")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "reac-5" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "reac-5" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* 6. "O VALOR É BAIXO" */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    "O VALOR É BAIXO"
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Entendi.</p>
                      <p className="mt-2">Qual valor faria a operação valer a pena para você?</p>
                      <p className="mt-2">Eu vejo se a margem sustenta algo próximo e te respondo sem rodeio.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Entendi.\n\nQual valor faria a operação valer a pena para você?\n\nEu vejo se a margem sustenta algo próximo e te respondo sem rodeio.", "reac-6")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "reac-6" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "reac-6" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* 7. "ESSA TAXA ESTÁ BAIXA DEMAIS. NÃO CONFIO." */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    "ESSA TAXA ESTÁ BAIXA DEMAIS. NÃO CONFIO."
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Boa pergunta.</p>
                      <p className="mt-2">Essa é a taxa que pagará na prática deixando a duração do contrato em X meses.</p>
                      <p className="mt-2">Vou te mandar o plano completo em que você poderá visualizar, calcular e tirar dúvidas.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Boa pergunta.\n\nEssa é a taxa que pagará na prática deixando a duração do contrato em X meses.\n\nVou te mandar o plano completo em que você poderá visualizar, calcular e tirar dúvidas.", "reac-7")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "reac-7" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "reac-7" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* NAVEGAÇÃO INFERIOR DA ETAPA 6 */}
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
                onClick={() => goToStep(7)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar para Etapa 7 (Plano de Amortização) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 7: PLANO DE AMORTIZAÇÃO */}
        {/* ========================================================================= */}
        {(activeStep === 7 || activeStep === "all") && (
        <section id="etapa-7" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white font-black text-xl flex items-center justify-center shadow-md shadow-purple-700/20">
                7
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Comparativo primeiro. Plano depois.
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Explique amortização somente quando ela ajuda a decisão, sem transformar a venda em aula financeira.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-purple-50 text-purple-800 text-xs font-bold rounded-lg border border-purple-200">
              Projeção & Amortização
            </span>
          </div>

          <div className="space-y-6">
            {/* REGRA */}
            <div className="p-3.5 sm:px-4 bg-[#f0fdf4] border border-[#10b981] rounded-xl text-left space-y-2.5">
              <div className="text-[13px] text-slate-800 font-medium leading-relaxed space-y-2.5">
                <p>
                  Valide com o seu gestor se o órgão, banco e tipo de operação permite esta estratégia.
                </p>
                <p className="font-bold text-slate-900">
                  Gatilhos para apresentar o plano antes dos documentos
                </p>
                <p>
                  Se o cliente trouxer alguma destas dúvidas:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>“Por que parcela média?”</li>
                  <li>“Não é fixa?”</li>
                  <li>“Como assim média?”</li>
                  <li>“Amortização?”</li>
                  <li>“24 meses em contrato?”</li>
                </ul>
                <p className="font-bold text-slate-900">
                  Não avance para os documentos. Siga primeiro para a apresentação do plano.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* MENSAGEM ANTES DO LINK */}
              <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                  MENSAGEM ANTES DO LINK
                </span>

                <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                  <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                    <p>Vou te mandar agora o <strong>Plano de Amortização</strong>.</p>
                    <p className="mt-2">Ele serve para você enxergar <strong>como a operação é organizada ao longo do tempo</strong> e como chegamos à duração projetada que eu te apresentei.</p>
                    <p className="mt-2">Quando abrir, não precisa tentar interpretar tudo sozinho. Eu vou te mostrar <strong>os pontos que realmente importam</strong>.</p>
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                      <span>Agora</span>
                      <Check className="w-3 h-3 text-sky-500" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Vou te mandar agora o *Plano de Amortização*.\n\nEle serve para você enxergar *como a operação é organizada ao longo do tempo* e como chegamos à duração projetada que eu te apresentei.\n\nQuando abrir, não precisa tentar interpretar tudo sozinho. Eu vou te mostrar *os pontos que realmente importam*.", "plano-1")}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {copiedId === "plano-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "plano-1" ? "Copiado!" : "Copiar Mensagem"}
                </button>
              </div>

              {/* MENSAGEM JUNTO COM O LINK */}
              <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                  MENSAGEM JUNTO COM O LINK
                </span>

                <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                  <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                    <p>Você vai ver no contrato que a parcela é menor do que a que eu te prometi, essa parcela menor é a fixa descontada mensalmente no teu contracheque.</p>
                    <p className="mt-2">O restante da parcela vem emitido em boleto pelo banco a partir do quarto mês.</p>
                    <p className="mt-2">Então no mês 24 quando solicitar o ultimo se encerra o desconto da folha e é emitido o último boleto do banco, quitando e encerrando a operação.</p>
                    <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                      <span>Agora</span>
                      <Check className="w-3 h-3 text-sky-500" />
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => copyToClipboard("Você vai ver no contrato que a parcela é menor do que a que eu te prometi, essa parcela menor é a fixa descontada mensalmente no teu contracheque.\n\nO restante da parcela vem emitido em boleto pelo banco a partir do quarto mês.\n\nEntão no mês 24 quando solicitar o ultimo se encerra o desconto da folha e é emitido o último boleto do banco, quitando e encerrando a operação.", "plano-2")}
                  className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {copiedId === "plano-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copiedId === "plano-2" ? "Copiado!" : "Copiar Mensagem"}
                </button>
              </div>
            </div>

            {/* REGRA DE SEGURANÇA */}
            <div className="p-3.5 sm:px-4 bg-[#fffbeb] border border-[#f59e0b] rounded-xl text-left space-y-1.5">
              <span className="text-[11px] font-black text-[#d97706] uppercase tracking-wider block">
                REGRA DE SEGURANÇA
              </span>
              <p className="text-[13px] text-slate-800 font-medium leading-relaxed">
                Use essa fala apenas depois de o plano estar validado para a operação. Mês de início, valores de amortização, canal de boleto/código de barras e duração projetada devem seguir a regra real daquela proposta.
              </p>
            </div>

            {/* EVITE */}
            <div className="p-3.5 sm:px-4 bg-[#fef2f2] border border-[#ef4444] rounded-xl text-left space-y-1.5">
              <span className="text-[11px] font-black text-[#dc2626] uppercase tracking-wider block">
                EVITE
              </span>
              <ul className="text-[13px] text-slate-800 font-medium space-y-1">
                <li className="flex items-start gap-2">
                  <span className="text-slate-900 font-bold">•</span>
                  <span>Dizer que “24x está no contrato” quando o contrato mostra outro prazo.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-900 font-bold">•</span>
                  <span>Chamar o plano de amortização de boleto.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-900 font-bold">•</span>
                  <span>Prometer que valores nunca mudam se a regra da operação admitir variação.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-slate-900 font-bold">•</span>
                  <span>Usar explicações longas em áudio quando uma imagem + duas frases resolvem.</span>
                </li>
              </ul>
            </div>

            {/* EXPLICAÇÃO SIMPLES */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                Explicação simples
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    PLANO EM UMA FRASE
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>O contrato do banco segue a tabela da operação.</p>
                      <p className="mt-2">O plano mostra como as amortizações antecipam <strong>parcelas</strong> para reduzir a duração efetiva até [MÊS/OBJETIVO VALIDADO].</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="italic">
                      <strong className="font-semibold text-slate-700 not-italic">Quando usar:</strong> Primeira explicação. Só aprofunde se o cliente perguntar.
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard("O contrato do banco segue a tabela da operação.\n\nO plano mostra como as amortizações antecipam *parcelas* para reduzir a duração efetiva até [MÊS/OBJETIVO VALIDADO].", "plano-frase")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "plano-frase" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "plano-frase" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>
            </div>

            {/* DÚVIDAS COMUNS */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                DÚVIDAS COMUNS
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* DÚVIDA 1 */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    “POR QUE APARECE 96X NO CONTRATO SE VOCÊ FALOU 24 MESES?”
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Porque 96x é o <strong>prazo</strong> contratual da tabela bancária.</p>
                      <p className="mt-2">Os <strong>24 meses</strong> são a <strong>duração projetada</strong> pela estratégia de amortização, com a programação do plano executada.</p>
                      <p className="mt-2">Eu te mostro separado o que fica em folha e o que é amortizado.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="italic">
                      <strong className="font-semibold text-slate-700 not-italic">Quando usar:</strong> Resposta deve diferenciar prazo contratual de duração projetada.
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Porque 96x é o *prazo* contratual da tabela bancária.\n\nOs *24 meses* são a *duração projetada* pela estratégia de amortização, com a programação do plano executada.\n\nEu te mostro separado o que fica em folha e o que é amortizado.", "duvida-plano-1")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "duvida-plano-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "duvida-plano-1" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* DÚVIDA 2 */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    “ENTÃO QUANTO EU PAGO POR MÊS?”
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Na folha fica R$ [<strong>PARCELA</strong> FIXA].</p>
                      <p className="mt-2">Nos meses com amortização, o plano prevê mais R$ [VALOR/FAIXA VALIDADA], totalizando R$ [TOTAL VALIDADO].</p>
                      <p className="mt-2">Vou te mostrar mês a mês para não ficar nenhuma dúvida.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="italic">
                      <strong className="font-semibold text-slate-700 not-italic">Quando usar:</strong> Nunca responda apenas &quot;parcela X&quot; quando existe complemento previsto.
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Na folha fica R$ [*PARCELA* FIXA].\n\nNos meses com amortização, o plano prevê mais R$ [VALOR/FAIXA VALIDADA], totalizando R$ [TOTAL VALIDADO].\n\nVou te mostrar mês a mês para não ficar nenhuma dúvida.", "duvida-plano-2")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "duvida-plano-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "duvida-plano-2" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* DÚVIDA 3 */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    “A PARCELA VAI SUBINDO?”
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>A <strong>parcela</strong> descontada em folha é a que consta no contrato.</p>
                      <p className="mt-2">O que pode existir além dela são amortizações previstas no plano.</p>
                      <p className="mt-2">Eu vou te mostrar exatamente os valores previstos antes de formalizar.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="italic">
                      <strong className="font-semibold text-slate-700 not-italic">Quando usar:</strong> Se houver variação real no plano, mostre; não diga &quot;não muda&quot; genericamente.
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard("A *parcela* descontada em folha é a que consta no contrato.\n\nO que pode existir além dela são amortizações previstas no plano.\n\nEu vou te mostrar exatamente os valores previstos antes de formalizar.", "duvida-plano-3")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "duvida-plano-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "duvida-plano-3" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* DÚVIDA 4 */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    “ESSE PDF É O BOLETO?”
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Não.</p>
                      <p className="mt-2">Esse arquivo é o plano de amortização, para você visualizar a programação.</p>
                      <p className="mt-2">O boleto/código de barras é o instrumento de pagamento usado no momento da amortização, conforme o fluxo da instituição.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="italic">
                      <strong className="font-semibold text-slate-700 not-italic">Quando usar:</strong> Evita confundir plano com boleto.
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Não.\n\nEsse arquivo é o plano de amortização, para você visualizar a programação.\n\nO boleto/código de barras é o instrumento de pagamento usado no momento da amortização, conforme o fluxo da instituição.", "duvida-plano-4")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "duvida-plano-4" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "duvida-plano-4" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* DÚVIDA 5 */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    “COMO VOU RECEBER/SOLICITAR O BOLETO?”
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Eu te passo o passo a passo do canal oficial definido para essa operação.</p>
                      <p className="mt-2">Se houver qualquer dúvida na solicitação, eu acompanho com você.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="italic">
                      <strong className="font-semibold text-slate-700 not-italic">Quando usar:</strong> O canal exato deve vir da regra operacional, não da memória do corretor.
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Eu te passo o passo a passo do canal oficial definido para essa operação.\n\nSe houver qualquer dúvida na solicitação, eu acompanho com você.", "duvida-plano-5")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "duvida-plano-5" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "duvida-plano-5" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* DÚVIDA 6 */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                    “TENHO MEDO DE VIR UM BOLETO MAIOR DO QUE VOCÊ FALOU.”
                  </span>

                  <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                    <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                      <p>Esse ponto precisa estar fechado antes de você avançar.</p>
                      <p className="mt-2">Vou conferir o plano validado e te mostrar o valor previsto de cada etapa.</p>
                      <p className="mt-2">Se houver qualquer faixa variável, eu te explico agora.</p>
                      <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                        <span>Agora</span>
                        <Check className="w-3 h-3 text-sky-500" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-600">
                    <p className="italic">
                      <strong className="font-semibold text-slate-700 not-italic">Quando usar:</strong> Se o corretor não souber, abrir chamado.
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Esse ponto precisa estar fechado antes de você avançar.\n\nVou conferir o plano validado e te mostrar o valor previsto de cada etapa.\n\nSe houver qualquer faixa variável, eu te explico agora.", "duvida-plano-6")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "duvida-plano-6" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "duvida-plano-6" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO INFERIOR DA ETAPA 7 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(6)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Etapa 6 (Apresentar Proposta)
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Objeções Rápidas
              </button>
              <button
                onClick={() => goToStep(8)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar para Etapa 8 (Quitação de Cartão) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 8: QUITAÇÃO DE CARTÃO (OPERAÇÃO ESPECIAL) */}
        {/* ========================================================================= */}
        {(activeStep === 8 || activeStep === "all") && (
        <section id="etapa-8" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
                8
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Quitação de Cartão
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Reconhecer a oportunidade e saber encaminhar - sem tentar formar um especialista nesta etapa.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
              Operação Especial
            </span>
          </div>

          <div className="space-y-6">
            <div className="p-4 bg-emerald-100/80 border border-emerald-400 rounded-2xl space-y-1">
              <p className="text-[12.75px] text-emerald-950 font-medium leading-relaxed">
                Quando a proposta for quitação de cartão, a liberação ocorre pela margem facultativa, liberando valor para quitar o saldo devedor e reduzir a folha.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                {/* 3 CARDS NUMERADOS */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl shadow-xs">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black shrink-0">
                      1
                    </span>
                    <p className="text-[12.75px] text-slate-800 font-medium leading-tight">
                      Saldo prévio: margem bruta do benefício – margem líquida = margem averbada.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl shadow-xs">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black shrink-0">
                      2
                    </span>
                    <p className="text-[12.75px] text-slate-800 font-medium leading-tight">
                      Margem averbada × 16,6667 = saldo devedor prévio.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl shadow-xs">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black shrink-0">
                      3
                    </span>
                    <p className="text-[12.75px] text-slate-800 font-medium leading-tight">
                      Em Acessar Cliente → Simular Proposta → usar a opção Quitação para criar a apresentação visual.
                    </p>
                  </div>
                </div>

                {/* IMAGEM DA PROPOSTA AMPLIÁVEL */}
                <div 
                  onClick={() => setIsPropostaQuitacaoModalOpen(true)}
                  className="group relative rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-emerald-500 bg-slate-900 cursor-pointer transition-all shadow-md hover:shadow-xl"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsPropostaQuitacaoModalOpen(true) }}
                >
                  <div className="relative w-full aspect-[16/10] bg-slate-950">
                    <Image
                      src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/proposta_reducao_ROGERIO_JOSE_FIORINI.jpg"
                      alt="Exemplo de Proposta de Redução e Quitação de Cartão"
                      fill
                      className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                      referrerPolicy="no-referrer"
                    />
                  </div>

                  {/* OVERLAY INDICANDO CLIQUE PARA AMPLIAR */}
                  <div className="absolute inset-0 bg-slate-950/30 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20 shadow-lg flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-emerald-400" /> Clique para ampliar
                    </span>
                  </div>
                </div>
              </div>

              {/* MENSAGEM DE ABORDAGEM PARA QUITAÇÃO */}
              <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                  MENSAGEM DE ABORDAGEM PARA QUITAÇÃO
                </span>

                <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                  <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                    <p>Oi, [NOME]! Mais de <strong>R$ 15 mil</strong> estão saindo do seu bolso por causa de 1 desconto!</p>
                    <p className="mt-2">Resolvemos isso em <strong>menos de 48h</strong>. Posso mostrar a diferença?</p>

                    {/* IMAGEM BAIXÁVEL */}
                    <div 
                      onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/quitacaodecartao.png", "quitacaodecartao.png")}
                      className="mt-3 group relative rounded-xl overflow-hidden border border-slate-200 cursor-pointer bg-black/90 shadow-sm"
                      title="Clique para baixar a imagem"
                    >
                      <img
                        src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/quitacaodecartao.png"
                        alt="Quitação de Cartão"
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

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => downloadImage("https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/quitacaodecartao.png", "quitacaodecartao.png")}
                    className="px-3.5 py-2.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
                    title="Baixar imagem"
                  >
                    <Download className="w-4 h-4 text-slate-600" />
                    Baixar Imagem
                  </button>
                  <button
                    onClick={() => copyToClipboard("Oi, [NOME]! Mais de *R$ 15 mil* estão saindo do seu bolso por causa de 1 desconto!\n\nResolvemos isso em *menos de 48h*. Posso mostrar a diferença?", "quit-1")}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    {copiedId === "quit-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "quit-1" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO INFERIOR DA ETAPA 8 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(7)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Etapa 7 (Plano de Amortização)
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" /> Objeções Rápidas
              </button>
              <button
                onClick={() => goToStep(9)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Avançar para Etapa 9 (Documentos & Aceitou) <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
        )}

        {/* ========================================================================= */}
        {/* ETAPA 9: DOCUMENTOS & ACEITOU */}
        {/* ========================================================================= */}
        {(activeStep === 9 || activeStep === "all") && (
        <section id="etapa-9" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8 scroll-mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white font-black text-xl flex items-center justify-center shadow-md shadow-slate-900/20">
                9
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                  Documentos, Digitação e Acompanhamento
                </h2>
                <p className="text-xs sm:text-sm text-slate-700 font-semibold">
                  Transformar o aceite em execução rápida, clara e acompanhada.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-200">
              Formalização & Retomada
            </span>
          </div>

          <div className="space-y-8">
            {/* FAÇA AGORA */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Faça Agora</h3>
              </div>
              <ul className="space-y-2.5">
                <li className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-[12.75px] font-bold text-slate-800 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Confirme o cenário que o cliente aceitou.</span>
                </li>
                <li className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-[12.75px] font-bold text-slate-800 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Peça somente os documentos exigidos pela operação/tabela escolhida.</span>
                </li>
                <li className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-[12.75px] font-bold text-slate-800 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Digite e acompanhe o status.</span>
                </li>
                <li className="flex items-center gap-3 p-3 sm:px-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl text-[12.75px] font-bold text-slate-800 shadow-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Se houver pendência, retome exatamente a pendência - não recomece a venda.</span>
                </li>
              </ul>
            </div>

            {/* SEÇÃO: COLETA DE DOCUMENTOS (2 CARDS WHATSAPP) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                Coleta de Documentos
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* CARD 1: COLETA DE DOCUMENTOS */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                      COLETA DE DOCUMENTOS
                    </span>

                    {/* OBSERVAÇÃO 1 */}
                    <p className="text-[12.75px] font-semibold text-black/90 italic flex items-start gap-1.5 leading-snug">
                      <AlertCircle className="w-4 h-4 text-black/90 shrink-0 not-italic mt-0.5" />
                      <span className="text-black/90">
                        Esses são os dados básicos. Valide com o operacional os documentos necessários para o órgão e perfil do cliente.
                      </span>
                    </p>

                    <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>Perfeito, [Nome].</p>
                        <p className="mt-2">Para eu deixar essa condição pronta para você conferir, preciso de:</p>
                        <ul className="mt-2 space-y-1 pl-2">
                          <li>- Foto RG ou CNH;</li>
                          <li>- Endereço e e-mail por escrito;</li>
                          <li>- Último contracheque.</li>
                        </ul>
                        <p className="mt-2">Assim que receber, eu digito e te devolvo o <strong>próximo passo</strong>.</p>
                        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard("Perfeito, [Nome].\n\nPara eu deixar essa condição pronta para você conferir, preciso de:\n\n- Foto RG ou CNH;\n- Endereço e e-mail por escrito;\n- Último contracheque.\n\nAssim que receber, eu digito e te devolvo o *próximo passo*.", "doc-coleta")}
                      className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                    >
                      {copiedId === "doc-coleta" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "doc-coleta" ? "Copiado!" : "Copiar Mensagem"}
                    </button>

                    {/* OBSERVAÇÃO 2: DADOS ATUAIS PARA RECEBIMENTO */}
                    <p className="text-[12.75px] font-semibold text-black/90 italic leading-snug pt-2">
                      Confirme se estes são os dados atuais para o recebimento.
                    </p>

                    {/* CAMPO COPIÁVEL: ME CONFIRMA OS DADOS DA SUA CONTA COM IMAGEM */}
                    <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner mt-1">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-1.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans">
                        <div 
                          onClick={() => setIsDadosContaImageModalOpen(true)}
                          className="rounded-xl overflow-hidden border border-slate-200/80 bg-slate-900/5 cursor-zoom-in group relative"
                          title="Clique para ver a imagem em tamanho real"
                        >
                          <img
                            src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/dados_conta.png"
                            alt="Me confirma os dados da sua conta"
                            className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm pointer-events-none">
                              Clique para ampliar
                            </span>
                          </div>
                        </div>
                        <div className="p-2.5 select-all">
                          <p className="text-slate-800 leading-relaxed font-sans">Me confirma os dados da sua conta</p>
                          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                            <span>Agora</span>
                            <Check className="w-3 h-3 text-sky-500" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyToClipboard("Me confirma os dados da sua conta", "doc-conta")}
                      className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                    >
                      {copiedId === "doc-conta" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      {copiedId === "doc-conta" ? "Copiado!" : "Copiar Mensagem"}
                    </button>
                  </div>
                </div>

                {/* CARD 2: CLIENTE PERGUNTA CONTRACHEQUE DE QUAL MÊS */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs">
                  <div className="space-y-3">
                    <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                      CLIENTE PERGUNTA “CONTRACHEQUE DE QUAL MÊS?”
                    </span>

                    <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>Precisamos do [REGRA DA OPERAÇÃO: mais recente / competência específica].</p>
                        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("Precisamos do [REGRA DA OPERAÇÃO: mais recente / competência específica].", "doc-mes")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                  >
                    {copiedId === "doc-mes" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "doc-mes" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>
            </div>

            {/* SEÇÃO: RETOMADAS PELO PONTO ONDE PAROU (4 CARDS WHATSAPP + CARD VERDE) */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                Retomadas pelo Ponto Onde Parou
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* CARD RETOMADA 1: PAROU DEPOIS DA PROPOSTA */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                      PAROU DEPOIS DA PROPOSTA
                    </span>

                    <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>[Nome], deixei teu cenário separado aqui.</p>
                        <p className="mt-2">Antes de eu encerrar, me diz o que travou: valor, <strong>parcela</strong>, <strong>prazo</strong> ou segurança da operação?</p>
                        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("[Nome], deixei teu cenário separado aqui.\n\nAntes de eu encerrar, me diz o que travou: valor, *parcela*, *prazo* ou segurança da operação?", "ret-1")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                  >
                    {copiedId === "ret-1" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "ret-1" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* CARD RETOMADA 2: DISSE "VOU PENSAR" */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                      DISSE “VOU PENSAR”
                    </span>

                    <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>[Nome], retomando pelo ponto que você queria analisar: ficou alguma dúvida em [MOTIVO IDENTIFICADO] ou você decidiu não seguir?</p>
                        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("[Nome], retomando pelo ponto que você queria analisar: ficou alguma dúvida em [MOTIVO IDENTIFICADO] ou você decidiu não seguir?", "ret-2")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                  >
                    {copiedId === "ret-2" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "ret-2" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* CARD RETOMADA 3: PAROU NOS DOCUMENTOS */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                      PAROU NOS DOCUMENTOS
                    </span>

                    <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>[Nome], ficou pendente apenas <strong>[DOCUMENTO]</strong>.</p>
                        <p className="mt-2">Assim que você me enviar, eu consigo dar sequência na proposta com prioridade sem refazer a análise.</p>
                        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("[Nome], ficou pendente apenas *[DOCUMENTO]*.\n\nAssim que você me enviar, eu consigo dar sequência na proposta com prioridade sem refazer a análise.", "ret-3")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                  >
                    {copiedId === "ret-3" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "ret-3" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>

                {/* CARD RETOMADA 4: PAROU NA FORMALIZAÇÃO */}
                <div className="p-4 sm:p-5 bg-white border border-slate-200 rounded-3xl space-y-3 shadow-xs flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[11px] font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md uppercase inline-block">
                      PAROU NA FORMALIZAÇÃO
                    </span>

                    <div className="bg-[#efeae2] p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-inner">
                      <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 shadow-sm border border-slate-100 text-[12.75px] text-slate-800 font-sans leading-relaxed select-all">
                        <p>[Nome], falta apenas um detalhe para o pagamento.</p>
                        <p className="mt-2">Se travou em alguma tela ou validação, me fala onde parou que eu te direciono.</p>
                        <div className="flex items-center justify-end gap-1 mt-2 text-[10px] text-slate-400">
                          <span>Agora</span>
                          <Check className="w-3 h-3 text-sky-500" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => copyToClipboard("[Nome], falta apenas um detalhe para o pagamento.\n\nSe travou em alguma tela ou validação, me fala onde parou que eu te direciono.", "ret-4")}
                    className="w-full py-2.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-2"
                  >
                    {copiedId === "ret-4" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedId === "ret-4" ? "Copiado!" : "Copiar Mensagem"}
                  </button>
                </div>
              </div>

              {/* CARD VERDE: REGRA DE FOLLOW-UP */}
              <div className="p-4 sm:p-5 bg-emerald-50/70 border border-emerald-500 rounded-2xl space-y-1.5 mt-4">
                <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
                  REGRA DE FOLLOW-UP
                </span>
                <p className="text-[13px] text-emerald-950 font-medium leading-relaxed">
                  Retomada não é repetir a primeira mensagem. É voltar exatamente ao ponto onde o cliente parou, relembrando a vantagem ou a pendência que já existia.
                </p>
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO INFERIOR DA ETAPA 9 */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-100">
            <button
              onClick={() => goToStep(8)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" /> Etapa 8 (Quitação de Cartão)
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
                    { id: "referencias", label: "Referências da empresa" },
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
                      {"responses" in item && Array.isArray((item as any).responses) ? (
                        <div className="space-y-3">
                          {(item as any).responses.map((resp: { label: string; text: string }, idx: number) => (
                            <div key={`resp-${item.id}-${idx}`} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700 bg-slate-200/70 px-2 py-0.5 rounded-md">
                                  {resp.label}
                                </span>
                                <button
                                  onClick={() => copyToClipboard(resp.text, `drawer-${item.id}-${idx}`)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                                >
                                  {copiedId === `drawer-${item.id}-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  {copiedId === `drawer-${item.id}-${idx}` ? "Copiado!" : "Copiar"}
                                </button>
                              </div>
                              <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                                <div className="bg-white rounded-2xl rounded-tl-xs p-3 shadow-sm max-w-[95%] border border-slate-100 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-line select-all">
                                  {resp.text}
                                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-normal">
                                    <span>Agora</span>
                                    <Check className="w-3 h-3 text-sky-500" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-[#efeae2] p-3 rounded-2xl border border-slate-200 shadow-inner relative">
                          <div className="bg-white rounded-2xl rounded-tl-xs p-3 shadow-sm max-w-[95%] border border-slate-100 text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-line select-all">
                            {item.response}
                            <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 font-normal">
                              <span>Agora</span>
                              <Check className="w-3 h-3 text-sky-500" />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-3 pt-1">
                        <span className="text-xs text-black/90 font-semibold italic leading-relaxed">
                          {item.whenToUse}
                        </span>
                        {!((item as any).responses) && (
                          <button
                            onClick={() => copyToClipboard(item.response, `drawer-${item.id}`)}
                            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
                          >
                            {copiedId === `drawer-${item.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedId === `drawer-${item.id}` ? "Copiado!" : "Copiar Script"}
                          </button>
                        )}
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

      {/* MODAL DE AMPLIAÇÃO DA IMAGEM: ABRIR CAMPANHA */}
      {isCampaignImageModalOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsCampaignImageModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Tela de Referência: Acessar e Iniciar Campanha
                </h3>
              </div>
              <button
                onClick={() => setIsCampaignImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL COM IMAGEM AMPLIADA (SCROLL SE NECESSÁRIO E AJUSTE DE ALTURA) */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <div className="relative w-full aspect-[16/10] max-h-[70vh]">
                <Image
                  src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/abrir_campanha.png"
                  alt="Tela de como abrir uma campanha ampliada"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400 text-center sm:text-left">
                Acesse o menu lateral &gt; <strong>ACESSAR CAMPANHA</strong> &gt; Clique no botão <strong>INICIAR</strong>
              </span>
              <Link
                href="/campanhas/distribuicao"
                onClick={() => setIsCampaignImageModalOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm w-full sm:w-auto"
              >
                <span>Acessar Campanha</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO DA IMAGEM: DADOS DO LEAD */}
      {isLeadImageModalOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsLeadImageModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Tela de Referência: Como Aparecerão os Dados do Lead
                </h3>
              </div>
              <button
                onClick={() => setIsLeadImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <div className="relative w-full aspect-[16/10] max-h-[70vh]">
                <Image
                  src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/lead_campanha.png"
                  alt="Como aparecerão os dados do lead ampliado"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO DA IMAGEM: PROPOSTA DE QUITAÇÃO */}
      {isPropostaQuitacaoModalOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsPropostaQuitacaoModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Exemplo de Proposta: Redução e Quitação de Cartão
                </h3>
              </div>
              <button
                onClick={() => setIsPropostaQuitacaoModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL COM IMAGEM AMPLIADA */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <div className="relative w-full aspect-[16/10] max-h-[75vh]">
                <Image
                  src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/proposta_reducao_ROGERIO_JOSE_FIORINI.jpg"
                  alt="Proposta de Redução e Quitação de Cartão ampliada"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Acesse o cliente &gt; <strong>Simular Proposta</strong> &gt; Selecione a opção <strong>Quitação</strong>
              </span>
              <button
                onClick={() => setIsPropostaQuitacaoModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO DA IMAGEM: RETOMADA COM IMAGEM */}
      {isRetomadaImageModalOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsRetomadaImageModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Comparativo de Retomada: Imagem em Tamanho Real
                </h3>
              </div>
              <button
                onClick={() => setIsRetomadaImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL COM IMAGEM AMPLIADA */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <div className="relative w-full aspect-[16/10] max-h-[75vh]">
                <Image
                  src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/retomada_1.png"
                  alt="Comparativo Retomada 1 ampliado"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Retomada com imagem: <em>&quot;Faz sentido pagar apenas R$ 35 a menos por mês e ficar 72 meses a mais pagando?&quot;</em>
              </span>
              <button
                onClick={() => setIsRetomadaImageModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO DA IMAGEM: RETOMADA COM VÍDEO */}
      {isRetomadaVideoModalOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsRetomadaVideoModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Exemplo de Envio de Vídeo com Legenda no WhatsApp: Imagem em Tamanho Real
                </h3>
              </div>
              <button
                onClick={() => setIsRetomadaVideoModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL COM IMAGEM AMPLIADA */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <div className="relative w-full aspect-[16/10] max-h-[75vh]">
                <Image
                  src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/retomada_video.png"
                  alt="Exemplo Retomada Vídeo ampliado"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Retomada com vídeo: <em>Primeiro nome do cliente colocado diretamente na legenda do vídeo no WhatsApp</em>
              </span>
              <button
                onClick={() => setIsRetomadaVideoModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO DA IMAGEM: CALCULAR */}
      {isCalcularImageModalOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsCalcularImageModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Comparativo: Imagem em Tamanho Real
                </h3>
              </div>
              <button
                onClick={() => setIsCalcularImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL COM IMAGEM AMPLIADA */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <div className="relative w-full aspect-[16/10] max-h-[75vh]">
                <Image
                  src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/calcular.png"
                  alt="Comparativo - Calcular ampliado"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Legenda: <em>&quot;Me conta aqui suas primeiras impressões&quot;</em>
              </span>
              <button
                onClick={() => setIsCalcularImageModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO DA IMAGEM: COMPARATIVO FACULTATIVA */}
      {isFacultativaImageModalOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsFacultativaImageModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Comparativo Facultativa: Imagem em Tamanho Real
                </h3>
              </div>
              <button
                onClick={() => setIsFacultativaImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL COM IMAGEM AMPLIADA */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <div className="relative w-full aspect-[16/10] max-h-[75vh]">
                <Image
                  src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/comparar_facultativa.png"
                  alt="Comparativo visual da margem facultativa ampliado"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Legenda: <em>&quot;Nessa comparação, qual cenário está mais dentro do que faz sentido para você?&quot;</em>
              </span>
              <button
                onClick={() => setIsFacultativaImageModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE AMPLIAÇÃO DA IMAGEM: DADOS DA CONTA */}
      {isDadosContaImageModalOpen && (
        <div 
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setIsDadosContaImageModalOpen(false)}
        >
          <div 
            className="relative bg-slate-900 border border-slate-700 rounded-2xl sm:rounded-3xl max-w-5xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                  Dados da Conta: Imagem em Tamanho Real
                </h3>
              </div>
              <button
                onClick={() => setIsDadosContaImageModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CORPO DO MODAL COM IMAGEM AMPLIADA */}
            <div className="relative w-full flex-1 min-h-0 bg-slate-950 p-2 sm:p-4 flex items-center justify-center overflow-auto">
              <div className="relative w-full aspect-[16/10] max-h-[75vh]">
                <Image
                  src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/imagens%20para%20mensagens/dados_conta.png"
                  alt="Dados da conta ampliado"
                  fill
                  className="object-contain"
                  referrerPolicy="no-referrer"
                  priority
                />
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-slate-950 border-t border-slate-800 shrink-0">
              <span className="text-xs text-slate-400">
                Legenda: <em>&quot;Me confirma os dados da sua conta&quot;</em>
              </span>
              <button
                onClick={() => setIsDadosContaImageModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BANCO DE IMAGENS */}
      {isImageBankModalOpen && (
        <div 
          id="modal-banco-de-imagens"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsImageBankModalOpen(false)
          }}
        >
          <div className="relative w-full max-w-5xl max-h-[92vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* CABEÇALHO DO MODAL */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Banco de Imagens - Criativos para Mensagens</h3>
                  <p className="text-xs text-slate-500">Clique na miniatura desejada para baixar a imagem original para seu computador</p>
                </div>
              </div>
              <button
                id="btn-fechar-modal-banco-imagens"
                onClick={() => setIsImageBankModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-200/80 hover:bg-slate-300 text-slate-700 transition-colors cursor-pointer"
                title="Fechar banco de imagens"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GRID DE MINIATURAS */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 bg-slate-100/60">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {BANCO_DE_IMAGENS.map((item) => {
                  const isDownloading = downloadingImage === item.id
                  return (
                    <div
                      key={item.id}
                      id={`card-imagem-${item.id}`}
                      onClick={async () => {
                        if (isDownloading) return
                        setDownloadingImage(item.id)
                        try {
                          await downloadImage(item.url, item.filename)
                        } finally {
                          setDownloadingImage(null)
                        }
                      }}
                      className="group relative bg-white border border-slate-200 hover:border-blue-500 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer"
                      title={`Clique para baixar ${item.title}`}
                    >
                      {/* PREVIEW CONTAINER */}
                      <div className="relative w-full aspect-[4/3] bg-slate-900 flex items-center justify-center overflow-hidden">
                        <img
                          src={item.url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* OVERLAY DE DOWNLOAD */}
                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white p-2 text-center">
                          {isDownloading ? (
                            <>
                              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                              <span className="text-[11px] font-bold">Baixando...</span>
                            </>
                          ) : (
                            <>
                              <div className="p-2 rounded-full bg-blue-600 shadow-md">
                                <Download className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-[11px] font-bold">Clique para baixar</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* LEGENDA / NOME */}
                      <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <span className="text-xs font-semibold text-slate-800 truncate" title={item.title}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-blue-600 font-bold shrink-0 flex items-center gap-0.5">
                          <Download className="w-3 h-3" />
                          Baixar
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* RODAPÉ DO MODAL */}
            <div className="flex items-center justify-between gap-3 px-5 py-3 bg-white border-t border-slate-200 shrink-0">
              <span className="text-xs text-slate-500">
                Total de <strong>{BANCO_DE_IMAGENS.length} imagens</strong> disponíveis para download
              </span>
              <button
                onClick={() => setIsImageBankModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

