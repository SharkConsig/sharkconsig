"use client"

import React, { useState } from "react"
import Link from "next/link"
import { 
  Check, 
  Copy, 
  CheckCheck, 
  ExternalLink, 
  MessageSquare, 
  Phone, 
  Search, 
  Calculator, 
  FileText, 
  Send, 
  Eye, 
  AlertTriangle, 
  Sparkles, 
  Flame, 
  Users, 
  FileCheck, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  ZoomIn, 
  X, 
  Info, 
  ShieldCheck, 
  BookOpen, 
  Layers, 
  Clock, 
  TrendingUp, 
  Percent, 
  FileSpreadsheet, 
  LifeBuoy,
  CreditCard,
  ArrowUpRight
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StageItem {
  id: string
  number: number
  title: string
  shortTitle: string
  objective: string
  badgeText: string
  badgeColor: string
  steps: string[]
  copies: {
    label: string
    text: string
    whyUse?: string
  }[]
  whatToShow?: {
    title: string
    description: string
    items: string[]
  }
  toAvoid: string
  ctaLabel: string
  ctaHref: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  deepDiveTopicId?: string
  mockupType: "campanha" | "whatsapp_abertura" | "pesquisa_cliente" | "calculadora_comparativo" | "plano_amortizacao" | "digitacao_proposta" | "dashboard_acompanhamento"
}

export function StartComercial({ onNavigateToTopic }: { onNavigateToTopic?: (topicId: string) => void }) {
  const [activeStageIndex, setActiveStageIndex] = useState<number>(0)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    6: true
  })
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    title: string
    type: string
  }>({ isOpen: false, title: "", type: "" })

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => {
      setCopiedText(null)
    }, 2500)
  }

  const toggleCard = (index: number) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const STAGES: StageItem[] = [
    {
      id: "stage_1",
      number: 1,
      shortTitle: "Pegue o Lead",
      title: "1. Pegue um cliente",
      objective: "A primeira missão é chamar o cliente. Não calcular tudo antes de existir interação.",
      badgeText: "Abertura de Prospecção",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      steps: [
        "Entre no menu Acessar Campanha (/campanhas/distribuicao).",
        "Escolha uma campanha disponível com base ativa e clique no botão Iniciar.",
        "O sistema abre a ficha do lead trazendo nome, CPF mascarado, telefones e margens prévias para apoiar a prospecção.",
        "Após o primeiro contato, tabule o status (ex: CHAMOU / EM NEGOCIAÇÃO) e siga para o próximo cliente."
      ],
      copies: [
        {
          label: "AÇÃO",
          text: "Chamar o cliente imediatamente pelo WhatsApp. Não tente fazer todas as simulações e cálculos antes de saber se o cliente responde.",
          whyUse: "Economiza seu tempo e foca a energia em leads que realmente interagem."
        }
      ],
      toAvoid: "Não gaste 15 minutos simulando todos os coeficientes antes de mandar a primeira mensagem. Primeiro gere a resposta.",
      ctaLabel: "Ir para Acessar Campanha",
      ctaHref: "/campanhas/distribuicao",
      deepDiveTopicId: "mod_1",
      mockupType: "campanha"
    },
    {
      id: "stage_2",
      number: 2,
      shortTitle: "Primeira Mensagem",
      title: "2. Primeira Mensagem — Prospecção Ativa",
      objective: "Gerar resposta rápida. A primeira mensagem NÃO precisa explicar banco, engenharia da operação, amortização ou todas as condições.",
      badgeText: "Sondagem Inicial",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      steps: [
        "Copie o modelo de prospecção ativa abaixo com 1 clique.",
        "Personalize o primeiro nome do cliente e os prazos possíveis.",
        "Envie no WhatsApp de forma individual e consultiva.",
        "Tabule o contato no sistema para manter o histórico organizado."
      ],
      copies: [
        {
          label: "Modelo Principal — Prospecção Ativa",
          text: `[Nome]! 👀 Abriu uma condição diferenciada vinculada à sua matrícula, com possibilidades em 12x, 24x, 36x ou 48x.

Antes de eu encerrar sua análise, queria confirmar uma coisa: você já aproveitou essa condição ou ainda posso verificar o que ficou disponível para você?

Me chama por aqui que te mostro antes do encerramento nos próximos dias.`,
          whyUse: "Cria contexto legítimo, personaliza pelo vínculo da matrícula, desperta curiosidade e termina com uma pergunta simples de 'sim' ou 'não'."
        }
      ],
      toAvoid: "Mensagem ativa precisa parecer conversa de WhatsApp, nunca disparo publicitário frio. Evite abrir com textos longos ou listas de tabelas de bancos.",
      ctaLabel: "Ver Contatos na Campanha",
      ctaHref: "/campanhas",
      deepDiveTopicId: "mod_1",
      mockupType: "whatsapp_abertura"
    },
    {
      id: "stage_3",
      number: 3,
      shortTitle: "Sondagem",
      title: "3. Respondeu? Sonde sem interrogar",
      objective: "Descobrir rapidamente o que o cliente já viu e o que pesa na decisão sem fazer um interrogatório.",
      badgeText: "Qualificação Ágil",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      steps: [
        "Responda prontamente no WhatsApp com simpatia e clareza.",
        "Faça apenas UMA pergunta direcionada por vez.",
        "Descubra se ele já recebeu propostas de outros bancos recentemente.",
        "Identifique a prioridade dele: mais valor no bolso ou prazo menor com economia."
      ],
      copies: [
        {
          label: "Se ele disser 'Pode ver' ou 'Como funciona?'",
          text: `Perfeito. Só para eu direcionar certo: você chegou a receber alguma proposta recentemente ou ainda não verificou nada?`,
          whyUse: "Descobre se existe proposta concorrente na mesa sem abrir uma bateria de perguntas chatas."
        },
        {
          label: "Se ele disser que já recebeu outra proposta",
          text: `Entendi. Você lembra mais ou menos o valor e em quantas parcelas ficou? Quero comparar com a condição que abriu aqui para você.`,
          whyUse: "Permite usar a mesma referência para comprovar a vantagem do SharkConsig."
        },
        {
          label: "Para identificar a prioridade do cliente",
          text: `Hoje para você faria mais sentido buscar o maior valor possível ou uma condição que pese menos e termine antes?`,
          whyUse: "Mapeia se você deve focar em liberação máxima ou no plano de prazo reduzido."
        }
      ],
      toAvoid: "Evite perguntar valor, prazo, parcela, banco, objetivo, dívida e urgência tudo de uma vez. Faça a próxima pergunta a partir da resposta do cliente.",
      ctaLabel: "Ir para Acessar Cliente",
      ctaHref: "/pesquisa",
      deepDiveTopicId: "mod_1",
      mockupType: "pesquisa_cliente"
    },
    {
      id: "stage_4",
      number: 4,
      shortTitle: "Consultar Margem",
      title: "4. Consultar antes de prometer",
      objective: "Conferir a margem e o perfil no SharkConsig antes de formalizar valores ao cliente.",
      badgeText: "Conferência de Sistema",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      steps: [
        "No menu Acessar Cliente (/pesquisa), busque por CPF ou telefone completo.",
        "Analise margem consignável, margem facultativa e contratos averbados.",
        "Utilize os atalhos rápidos no rodapé: Simular Proposta, Abrir Chamado ou Digitar Proposta.",
        "Se o cliente não for localizado na base: use Abrir Chamado e informe os dados manualmente."
      ],
      copies: [
        {
          label: "Mensagem enquanto confere no sistema",
          text: `Certo. Vou conferir a condição vinculada à sua matrícula e já te mostro o cenário que faz mais sentido, sem te mandar um monte de opção solta.`,
          whyUse: "Gera profissionalismo, passa segurança e ganha tempo para você rodar o cálculo com tranquilidade."
        }
      ],
      toAvoid: "Nunca prometa valores de cabeça sem consultar o sistema. Não transforme todo atendimento em burocracia; use chamados para análise e decisão rápida.",
      ctaLabel: "Buscar Cliente no Sistema",
      ctaHref: "/pesquisa",
      secondaryCtaLabel: "Abrir Chamado / Dúvida",
      secondaryCtaHref: "/chamados/novo",
      deepDiveTopicId: "mod_2",
      mockupType: "pesquisa_cliente"
    },
    {
      id: "stage_5",
      number: 5,
      shortTitle: "Envio da Proposta",
      title: "5. A Prévia Visual — Parte Central da Conversa",
      objective: "Depois de calcular, não mandar um textão. Enviar uma frase curta + IMAGEM DO COMPARATIVO + leitura simples do resultado.",
      badgeText: "Apresentação de Alto Impacto",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      steps: [
        "Acesse a Calculadora (/calculadora) e simule a melhor condição (12x, 24x ou plano inteligente).",
        "Gere a imagem do comparativo ou PDF visual paisagem destacando a economia.",
        "Envie no WhatsApp a frase curta de introdução + a imagem do comparativo.",
        "Envie o texto de leitura simples do resultado conduzindo para o fechamento."
      ],
      copies: [
        {
          label: "1. Frase antes de enviar a imagem",
          text: `Fiz a simulação aqui e essa é a diferença que te mencionei 👇`,
          whyUse: "Prepara o olhar do cliente para prestar atenção na imagem que chega a seguir."
        },
        {
          label: "2. Frase após o envio da imagem",
          text: `Nesse cenário você consegue trabalhar com R$ [valor], levando a operação para 24 meses, com uma taxa prática de 0,96% a.m.

Hoje faria mais sentido para você aumentar o valor ou manter essa estrutura em prazo menor?`,
          whyUse: "A imagem carrega a comparação complexa; a mensagem destaca só a vantagem principal e termina com pergunta de fechamento."
        },
        {
          label: "Variação: Se o cliente quer mais valor",
          text: `Consegui estruturar uma condição que aproveita melhor a margem disponível. Nesse cenário, o ponto forte é o valor que conseguimos colocar na mão sem alongar a estratégia além do necessário.`
        },
        {
          label: "Variação: Se o cliente quer prazo menor",
          text: `Aqui o principal ganho não é só o valor liberado. É conseguir organizar a operação para encerrar muito antes do prazo convencional.`
        },
        {
          label: "Variação: Se o cliente está comparando",
          text: `Me passa o valor e o prazo que te apresentaram. Eu comparo pela mesma referência para você enxergar a diferença sem misturar condições.`
        },
        {
          label: "Variação: Se o cliente perguntar a taxa",
          text: `Nesse cenário que te apresentei, a taxa prática fica em 0,96% ao mês.`
        }
      ],
      whatToShow: {
        title: "Estrutura do Comparativo Visual",
        description: "Envie o comparativo de 3 blocos simples:",
        items: [
          "Bloco 1: 12 Meses (R$ Liberado, Parcela Média, Taxa 0,82%, Economia Total)",
          "Bloco 2: 24 Meses (R$ Liberado, Parcela Média, Taxa 0,96%, Economia Total)",
          "Bloco 3: 96 Meses Tradicional (R$ Liberado, Parcela Alta, Taxa 4,03%, Custo Elevado)"
        ]
      },
      toAvoid: "Não transforme a resposta em explicação técnica com cálculos de juros compostos ou tabela cheia de números. Responda o que foi perguntado e conduza o próximo passo.",
      ctaLabel: "Abrir Calculadora Comercial",
      ctaHref: "/calculadora",
      deepDiveTopicId: "mod_3",
      mockupType: "calculadora_comparativo"
    },
    {
      id: "stage_6",
      number: 6,
      shortTitle: "Plano & Amortização",
      title: "6. Comparativo Primeiro. Plano Depois (Se necessário)",
      objective: "Apresentar o Plano de Amortização apenas se o cliente pedir detalhamento de parcelas/prazos ou para gerar mais segurança.",
      badgeText: "Aprofundamento Técnico",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      steps: [
        "Mantenha a estratégia de 2 camadas: Camada 1 = Comparativo Visual; Camada 2 = Plano de Amortização.",
        "Abra o plano somente se houver dúvida acentuada sobre a parcela média, valor de liberação alto ou pedido expresso de detalhamento.",
        "Explique a mecânica de quitação das últimas parcelas com o código de barras com total transparência.",
        "Se surgir dúvida técnica que você não domina: abra chamado de apoio no SharkConsig imediatamente."
      ],
      copies: [
        {
          label: "Explicação Simples do Plano de Amortização",
          text: `Você vai observar que a parcela fixa é menor do que a que mencionei. A partir do 4º mês você tem o código de barras do banco para a diferença. Seguindo a programação, a estratégia encerra no prazo apresentado.`,
          whyUse: "Descomplica a engenharia financeira sem gerar medo de complexidade."
        },
        {
          label: "Se o cliente pedir mais segurança",
          text: `Posso te mostrar o comparativo e, se quiser, também o plano completo de como essa estrutura encerra. Assim você confere os números antes de formalizar.`,
          whyUse: "Garante transparência total sem assustar o cliente no início."
        }
      ],
      toAvoid: "Não jogue o plano de amortização completo logo no primeiro contato. Ele é uma ferramenta de fechamento e segurança, não a porta de entrada da venda.",
      ctaLabel: "Acessar Calculadora / Planos",
      ctaHref: "/calculadora",
      secondaryCtaLabel: "Pedir Apoio em Chamado",
      secondaryCtaHref: "/chamados/novo",
      deepDiveTopicId: "mod_3",
      mockupType: "plano_amortizacao"
    },
    {
      id: "stage_7",
      number: 7,
      shortTitle: "Digitação & Acompanhamento",
      title: "7. Coleta de Documentos, Digitação e Acompanhamento",
      objective: "Transformar o aceite em ação rápida, solicitar os documentos corretos, digitar na tabela mais vantajosa e acompanhar a esteira no Dashboard.",
      badgeText: "Formalização & Fechamento",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      steps: [
        "Assim que o cliente aceitar, dispare o script de coleta de documentos.",
        "Acesse Digitar Proposta (/propostas/nova), selecione o tipo de operação, convênio e tabela com melhor comissão/prazo.",
        "Preencha os dados e anexe os documentos com qualidade (RG/CNH frente e verso, contracheque).",
        "Acompanhe a evolução de status no Dashboard (Digitação, Em Andamento, Pago ao Cliente, Cancelados).",
        "Se o cliente parar de responder após a proposta, aplique o script de retomada."
      ],
      copies: [
        {
          label: "Avanço para Coleta de Documentos",
          text: `Perfeito. Para eu validar essa condição e deixar a proposta pronta para você conferir, me envia seu RG ou CNH (frente e verso), último contracheque e comprovante de residência. Assim já avanço sem perdermos essa condição.`,
          whyUse: "Cria senso de urgência saudável e direciona o cliente para o próximo passo prático."
        },
        {
          label: "Mensagem de Retomada (Cliente que parou)",
          text: `Consegui deixar sua análise separada aqui. Antes de encerrar, quer que eu te envie novamente o comparativo que montamos ou ficou alguma dúvida na condição?`,
          whyUse: "Reabre a conversa de forma educada, resgatando a oportunidade sem ser invasivo."
        }
      ],
      toAvoid: "Não espere horas para pedir os documentos após o aceite. Não deixe o lead sem tabulação. Caso haja pendência operacional, use os chamados para resolver rapidamente.",
      ctaLabel: "Digitar Nova Proposta",
      ctaHref: "/propostas/nova",
      secondaryCtaLabel: "Acompanhar no Dashboard",
      secondaryCtaHref: "/",
      deepDiveTopicId: "mod_2",
      mockupType: "digitacao_proposta"
    }
  ]

  // Render high-fidelity visual mockups
  const renderScreenMockup = (type: string, isZoomed = false) => {
    switch (type) {
      case "campanha":
        return (
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mockups/acessar-campanha.png"
              alt="Tela Acessar Campanha - SharkConsig"
              className="w-full h-auto object-contain rounded-lg block"
            />
          </div>
        )

      case "whatsapp_abertura":
        return (
          <div className="bg-[#0b141a] text-slate-100 rounded-xl p-4 font-sans text-xs border border-emerald-900/40 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-[10px]">
                D
              </div>
              <div>
                <p className="font-bold text-slate-200 text-xs">Douglas (Cliente Servidor)</p>
                <span className="text-[9px] text-emerald-400">online</span>
              </div>
            </div>

            <div className="space-y-2">
              {/* Sent Bubble */}
              <div className="bg-[#005c4b] text-slate-100 p-3 rounded-2xl rounded-tr-none ml-auto max-w-[90%] shadow-md space-y-1.5">
                <p className="text-[11px] leading-relaxed">
                  Douglas! 👀 Abriu uma condição diferenciada vinculada à sua matrícula, com possibilidades em 12x, 24x, 36x ou 48x.
                </p>
                <p className="text-[11px] leading-relaxed">
                  Antes de eu encerrar sua análise, queria confirmar uma coisa: você já aproveitou essa condição ou ainda posso verificar o que ficou disponível para você?
                </p>
                <p className="text-[11px] leading-relaxed">
                  Me chama por aqui que te mostro antes do encerramento nos próximos dias.
                </p>
                <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70 pt-0.5">
                  <span>10:42</span>
                  <CheckCheck className="w-3 h-3 text-cyan-400" />
                </div>
              </div>

              {/* Received Bubble */}
              <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-2xl rounded-tl-none mr-auto max-w-[80%] shadow-md space-y-0.5">
                <p className="text-[11px] text-slate-200">
                  Olá! Pode ver o que tem disponível para mim sim, por favor.
                </p>
                <span className="text-[9px] text-slate-400 block text-right">10:45</span>
              </div>
            </div>
          </div>
        )

      case "pesquisa_cliente":
        return (
          <div className="bg-slate-900 text-white rounded-xl p-4 font-sans text-xs border border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-300">
                Acessar Cliente — Histórico e Margens
              </span>
              <span className="text-[10px] text-slate-400">CPF: 311.297.***-04</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">BANCO DO BRASIL</span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-400">Parcela: R$ 426,52</span>
                  <span className="text-emerald-400 font-bold">49x (R$ 14.725)</span>
                </div>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400 block font-bold">BANCO SANTANDER</span>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-400">Parcela: R$ 1.015,37</span>
                  <span className="text-emerald-400 font-bold">52x (R$ 36.480)</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2 justify-end">
              <span className="px-2.5 py-1 bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded text-[10px] font-bold">
                ✓ SIMULAR PROPOSTA
              </span>
              <span className="px-2.5 py-1 bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold">
                ✓ ABRIR CHAMADO
              </span>
              <span className="px-2.5 py-1 bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                ✓ DIGITAR PROPOSTA
              </span>
            </div>
          </div>
        )

      case "calculadora_comparativo":
        return (
          <div className="bg-slate-950 text-white rounded-xl p-4 font-sans text-xs border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-emerald-400">
                Simulação de Proposta Comercial — Comparativo
              </span>
              <Badge className="bg-emerald-900 text-emerald-300 border border-emerald-700 text-[9px]">
                PRÉVIA VISUAL
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* 12 Months */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-center space-y-1.5">
                <span className="text-[10px] font-black text-white bg-slate-800 px-2 py-0.5 rounded uppercase">
                  12 Meses
                </span>
                <p className="text-[10px] text-slate-400">Valor Liberado</p>
                <strong className="text-emerald-400 font-extrabold text-sm block">R$ 23.078,70</strong>
                <p className="text-[10px] text-slate-400">Taxa: <strong className="text-white">0,82% a.m.</strong></p>
                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold p-1 rounded">
                  ECONOMIA: R$ 71.653,20
                </div>
              </div>

              {/* 24 Months - Highlighted */}
              <div className="bg-emerald-950/60 p-3 rounded-xl border-2 border-emerald-500 text-center space-y-1.5 shadow-lg relative">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
                  RECOMENDADO
                </span>
                <span className="text-[10px] font-black text-emerald-300 bg-emerald-900/80 px-2 py-0.5 rounded uppercase">
                  24 Meses
                </span>
                <p className="text-[10px] text-slate-300">Valor Liberado</p>
                <strong className="text-emerald-400 font-extrabold text-sm block">R$ 23.078,70</strong>
                <p className="text-[10px] text-slate-300">Taxa: <strong className="text-white">0,96% a.m.</strong></p>
                <div className="bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-[10px] font-black p-1 rounded">
                  ECONOMIA: R$ 70.041,60
                </div>
              </div>

              {/* 96 Months */}
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-center space-y-1.5 opacity-80">
                <span className="text-[10px] font-black text-slate-400 bg-slate-800 px-2 py-0.5 rounded uppercase">
                  96 Meses (Padrão)
                </span>
                <p className="text-[10px] text-slate-400">Valor Liberado</p>
                <strong className="text-slate-300 font-extrabold text-sm block">R$ 23.078,70</strong>
                <p className="text-[10px] text-slate-400">Taxa: <strong className="text-red-400">4,03% a.m.</strong></p>
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold p-1 rounded">
                  TOTAL: R$ 96.000,00
                </div>
              </div>
            </div>
          </div>
        )

      case "plano_amortizacao":
        return (
          <div className="bg-slate-900 text-white rounded-xl p-4 font-sans text-xs border border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-amber-400">
                Plano de Amortização Inteligente (2ª Camada)
              </span>
              <span className="text-[10px] text-slate-300">Contrato: R$ 23.078,70 • Duração: 24 meses</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 border-b border-slate-700">
                    <th className="p-1.5">MÊS</th>
                    <th className="p-1.5">FIXA EM FOLHA</th>
                    <th className="p-1.5">AMORTIZAÇÕES (CÓDIGO DE BARRAS)</th>
                    <th className="p-1.5 text-right">TOTAL MÊS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr className="hover:bg-slate-800/50">
                    <td className="p-1.5 font-bold">1 a 3</td>
                    <td className="p-1.5 text-slate-300">R$ 1.000,00</td>
                    <td className="p-1.5 text-slate-500">- (Apenas parcela em folha)</td>
                    <td className="p-1.5 text-right font-bold text-slate-200">R$ 1.000,00</td>
                  </tr>
                  <tr className="hover:bg-slate-800/50 bg-emerald-950/30">
                    <td className="p-1.5 font-bold text-emerald-400">4</td>
                    <td className="p-1.5 text-slate-300">R$ 1.000,00</td>
                    <td className="p-1.5 text-emerald-300">Parcelas 96, 95, 94, 93... quitadas</td>
                    <td className="p-1.5 text-right font-bold text-emerald-400">R$ 1.355,92</td>
                  </tr>
                  <tr className="hover:bg-slate-800/50 bg-emerald-950/30">
                    <td className="p-1.5 font-bold text-emerald-400">5 em diante</td>
                    <td className="p-1.5 text-slate-300">R$ 1.000,00</td>
                    <td className="p-1.5 text-emerald-300">Amortização programada das pontas</td>
                    <td className="p-1.5 text-right font-bold text-emerald-400">R$ 1.340,09</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="text-[10px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 leading-relaxed">
              💡 <strong>Regra:</strong> Apresente este quadro apenas quando o cliente tiver dúvida ou exigir segurança matemática de encerramento do contrato.
            </p>
          </div>
        )

      case "digitacao_proposta":
        return (
          <div className="bg-slate-900 text-white rounded-xl p-4 font-sans text-xs border border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-slate-300">
                Digitação de Proposta — Escolha da Tabela
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">GOVERNO SP • CARTÃO C/ SAQUE</span>
            </div>

            <div className="space-y-1.5">
              <div className="p-2 bg-emerald-950/50 border border-emerald-500/50 rounded-lg flex items-center justify-between">
                <div>
                  <strong className="text-white text-xs block">BANCO SENFF</strong>
                  <span className="text-[9px] text-slate-300">Comissão: <strong className="text-emerald-400">14,5%</strong> • Prazo: 96x</span>
                </div>
                <Badge className="bg-emerald-600 text-white text-[9px]">
                  SELECIONADO
                </Badge>
              </div>

              <div className="p-2 bg-slate-800/60 border border-slate-700 rounded-lg flex items-center justify-between opacity-80">
                <div>
                  <strong className="text-slate-300 text-xs block">BANCO SENFF</strong>
                  <span className="text-[9px] text-slate-400">Comissão: 12,0% • Prazo: 84x</span>
                </div>
                <span className="text-[10px] text-slate-400">0.04401</span>
              </div>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1 text-[10px]">
              <span className="text-slate-400 block font-bold">DOCUMENTOS NECESSÁRIOS</span>
              <p className="text-slate-300">✓ RG ou CNH (frente e verso) • ✓ Último contracheque • ✓ Comprovante de residência</p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-8">
      {/* Top Value Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#1C2643] rounded-2xl p-6 text-white shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            START COMERCIAL — GUIA OPERACIONAL PRÁTICO
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            Ordem Real da Venda no SharkConsig
          </span>
        </div>

        <div className="space-y-1.5 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Trilha Guiada: Do Lead ao Fechamento
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
            O <strong>START</strong> não é uma apostila teórica. É a execução em tempo real:{" "}
            <span className="text-emerald-400 font-bold">O QUE FAZER → O QUE FALAR → O QUE MOSTRAR → ONDE FAZER → PRÓXIMO PASSO</span>.
          </p>
        </div>

        {/* Sequential Stepper Bar */}
        <div className="pt-3 border-t border-slate-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {STAGES.map((stg, idx) => {
              const isActive = activeStageIndex === idx
              return (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => {
                    setActiveStageIndex(idx)
                    const el = document.getElementById(stg.id)
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1",
                    isActive
                      ? "bg-emerald-500/20 border-emerald-400 text-white shadow-md"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400">
                      Etapa {stg.number}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">0{stg.number}</span>
                  </div>
                  <p className="text-[11px] font-bold truncate leading-tight">
                    {stg.shortTitle}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 7 Interactive Stage Cards */}
      <div className="space-y-6">
        {STAGES.map((stage, index) => {
          const isExpanded = expandedCards[index] ?? true

          return (
            <Card 
              key={stage.id} 
              id={stage.id}
              className={cn(
                "rounded-2xl border transition-all overflow-hidden bg-white shadow-sm hover:shadow-md",
                activeStageIndex === index ? "border-emerald-500/60 ring-2 ring-emerald-500/10" : "border-slate-200"
              )}
            >
              {/* Stage Card Header */}
              <div 
                onClick={() => toggleCard(index)}
                className="p-5 md:p-6 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border inline-block", stage.badgeColor)}>
                      {stage.badgeText}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      Etapa {stage.number} de 7
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    {stage.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                    <strong>Objetivo:</strong> {stage.objective}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs font-bold text-slate-600 gap-1"
                  >
                    {isExpanded ? "Recolher" : "Expandir Detalhes"}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Stage Card Expanded Content */}
              {isExpanded && (
                <CardContent className="p-5 md:p-8 space-y-6">
                  
                  {/* Two Column Grid: Left Content, Right Interactive Screen Preview */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT COLUMN: Steps, Script Copys, What to avoid (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                      
                      {/* Passo a Passo (2 to 4 direct steps) */}
                      <div className="space-y-3">
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-600" />
                          Passo a Passo da Etapa
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          {stage.steps.map((st, sIdx) => (
                            <div key={sIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-3 text-xs text-slate-800 font-medium">
                              <span className="h-5 w-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                                {sIdx + 1}
                              </span>
                              <span className="leading-relaxed">{st}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* O Que Falar / Ações da Etapa */}
                      <div className="space-y-3">
                        {stage.number !== 1 && (
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-emerald-600" />
                            O que Falar (Script / Copy Pronta)
                          </span>
                        )}

                        <div className="space-y-3">
                          {stage.copies.map((copyItem, cIdx) => {
                            const copyId = `${stage.id}_copy_${cIdx}`
                            const isCopied = copiedText === copyId
                            const isStage1 = stage.number === 1

                            return (
                              <div 
                                key={cIdx} 
                                className="bg-[#f0f9f5] border border-emerald-200 rounded-2xl p-4 space-y-3 relative group"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                                    {copyItem.label}
                                  </span>

                                  {!isStage1 && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => copyToClipboard(copyItem.text, copyId)}
                                      className={cn(
                                        "h-7 px-2.5 text-[10px] font-black gap-1.5 transition-all",
                                        isCopied 
                                          ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                                          : "bg-slate-900 hover:bg-slate-800 text-white"
                                      )}
                                    >
                                      {isCopied ? (
                                        <>
                                          <CheckCheck className="w-3 h-3 text-white" />
                                          Copiado!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" />
                                          Copiar Mensagem
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>

                                <div className={cn(
                                  "bg-white p-3.5 rounded-xl border border-emerald-100/80 shadow-2xs font-mono text-xs text-slate-800 whitespace-pre-line leading-relaxed select-text",
                                  isStage1 && "font-sans font-bold text-slate-900"
                                )}>
                                  {copyItem.text}
                                </div>

                                {copyItem.whyUse && (
                                  <p className={cn(
                                    "text-[11px] text-emerald-900/90 font-medium leading-normal flex items-start gap-1.5",
                                    isStage1 && "text-[13px]"
                                  )}>
                                    <span className="font-extrabold text-emerald-800">Por que usar:</span>
                                    {copyItem.whyUse}
                                  </p>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* What to Show (when available) */}
                      {stage.whatToShow && (
                        <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2">
                          <span className="text-xs font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                            <Eye className="w-4 h-4 text-blue-700" />
                            {stage.whatToShow.title}
                          </span>
                          <p className="text-xs text-blue-950 font-medium">
                            {stage.whatToShow.description}
                          </p>
                          <ul className="space-y-1 pt-1">
                            {stage.whatToShow.items.map((it, iIdx) => (
                              <li key={iIdx} className="text-xs text-blue-900 flex items-start gap-2">
                                <span className="text-blue-500 font-bold">•</span>
                                {it}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* O que Evitar / Dica Importante */}
                      <div className="p-4 bg-red-50/80 rounded-2xl border border-red-200/90 space-y-1.5">
                        <span className="text-xs font-black uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          O que EVITAR nesta etapa
                        </span>
                        <p className="text-xs text-red-950 font-medium leading-relaxed">
                          {stage.toAvoid}
                        </p>
                      </div>

                    </div>

                    {/* RIGHT COLUMN: Screen Mockup & Action CTAs (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      
                      {/* Screen Preview Container */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-slate-600" />
                            Referência Visual da Tela
                          </span>
                          <button
                            type="button"
                            onClick={() => setPreviewModal({
                              isOpen: true,
                              title: stage.title,
                              type: stage.mockupType
                            })}
                            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                          >
                            <ZoomIn className="w-3 h-3" />
                            Ampliar
                          </button>
                        </div>

                        <div 
                          onClick={() => setPreviewModal({
                            isOpen: true,
                            title: stage.title,
                            type: stage.mockupType
                          })}
                          className="cursor-pointer group relative rounded-xl overflow-hidden transition-all hover:ring-2 hover:ring-emerald-500"
                        >
                          {renderScreenMockup(stage.mockupType)}
                          <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="bg-slate-950/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                              <ZoomIn className="w-3 h-3" /> Clique para Inspecionar
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Shortcuts & Deep Dive */}
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                          ONDE EXECUTAR NO SHARKCONSIG
                        </span>

                        <div className="flex flex-col gap-2">
                          <Link href={stage.ctaHref} className="w-full">
                            <Button 
                              type="button" 
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs gap-2 h-10 shadow-sm"
                            >
                              {stage.ctaLabel}
                              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                            </Button>
                          </Link>

                          {stage.secondaryCtaLabel && stage.secondaryCtaHref && (
                            <Link href={stage.secondaryCtaHref} className="w-full">
                              <Button 
                                type="button" 
                                variant="outline"
                                className="w-full border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs gap-2 h-9"
                              >
                                {stage.secondaryCtaLabel}
                                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                              </Button>
                            </Link>
                          )}
                        </div>

                        {stage.deepDiveTopicId && onNavigateToTopic && (
                          <div className="pt-2 border-t border-slate-200/80 text-center">
                            <button
                              type="button"
                              onClick={() => onNavigateToTopic(stage.deepDiveTopicId!)}
                              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 hover:underline"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Aprender mais na Capacitação Aprofundada
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>

                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Screen Zoom Modal */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-700 overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                  Inspeção Visual da Tela
                </span>
                <h4 className="text-base font-black text-white">
                  {previewModal.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal({ isOpen: false, title: "", type: "" })}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2">
              {renderScreenMockup(previewModal.type, true)}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">
                🔒 Dados sensíveis mascarados para segurança da operação.
              </span>
              <Button
                type="button"
                size="sm"
                onClick={() => setPreviewModal({ isOpen: false, title: "", type: "" })}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
              >
                Fechar Visualização
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
