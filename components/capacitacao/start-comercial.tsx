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
  objectiveLabel?: string
  badgeText: string
  badgeColor: string
  steps: string[]
  copies: {
    sectionHeader?: string
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
  screenshots?: {
    title: string
    url: string
    alt: string
  }[]
  mockupType?: "campanha" | "whatsapp_abertura" | "pesquisa_cliente" | "calculadora_comparativo" | "plano_amortizacao" | "digitacao_proposta" | "dashboard_acompanhamento" | "abrir_chamado_mockup" | "calculadora_dupla_mockup" | "quitacao_cartao" | "lista_chamados"
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
    6: true,
    7: true,
    8: true,
    9: true
  })
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean
    title: string
    imageUrl: string
  }>({ isOpen: false, title: "", imageUrl: "" })

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
      screenshots: [
        {
          title: "Tela Acessar Campanha",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/etapa_1_acessar_campanha.png",
          alt: "Tela Acessar Campanha - SharkConsig"
        }
      ]
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
      ctaLabel: "Ir para Acessar Cliente",
      ctaHref: "/pesquisa",
      deepDiveTopicId: "mod_1",
      screenshots: [
        {
          title: "Tela Acessar Cliente",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/etapa_2_acessar_cliente.png",
          alt: "Tela Acessar Cliente - SharkConsig"
        }
      ]
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
          whyUse: "Permite usar a mesma referência para comprovar a vantagem da Acerto Fácil."
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
      mockupType: "whatsapp_sondagem"
    },
    {
      id: "stage_4",
      number: 4,
      shortTitle: "Consultar Margem",
      title: "4. Consultar antes de prometer",
      objective: "Conferir a margem e o perfil no SharkConsig antes de formalizar valores ao cliente.",
      badgeText: "Conferência no Sistema",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      steps: [
        "No menu Acessar Cliente (/pesquisa), busque por CPF ou telefone completo.",
        "Analise margem consignável, cartões e contratos ativos.",
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
      secondaryCtaLabel: "Abrir Chamado",
      secondaryCtaHref: "/chamados/novo",
      deepDiveTopicId: "mod_2",
      screenshots: [
        {
          title: "Ações Acessar Cliente",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/acoes_acessar_cliente.png",
          alt: "Ações Acessar Cliente - SharkConsig"
        }
      ]
    },
    {
      id: "stage_5",
      number: 5,
      shortTitle: "Chamados: Abertura & Acompanhamento",
      title: "5. Abrir e Acompanhar Chamados",
      objective: "Acionar o suporte e análise operacional sempre que precisar de conferência de margem, tirar dúvidas ou enviar documentos, e acompanhar o status das solicitações.",
      badgeText: "Apoio & Gestão Operacional",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      steps: [
        "Abertura rápida: conferência de margem no dia, dúvidas sobre demandas ou envio de documentos para análise.",
        "Acesse o link CHAMADOS na barra lateral para acompanhar o andamento.",
        "Navegue entre as abas de status do chamado (ABERTO, APROVADOS, EM NEGOCIAÇÃO).",
        "Aprovados: visão/atalho por órgãos; Em negociação: substatus para saber onde o cliente parou."
      ],
      copies: [
        {
          label: "Regra",
          text: `Chamado é suporte para análise e decisão. Não transformar todo atendimento em burocracia.`,
          whyUse: "Garante agilidade no atendimento e aciona a retaguarda somente quando houver real necessidade técnica ou conferência documental."
        }
      ],
      toAvoid: "Não fique com dúvidas ou deixe o cliente esperando sem resposta. Utilize o chamado para destravar a esteira com agilidade.",
      ctaLabel: "Abrir Chamado",
      ctaHref: "/chamados/novo",
      secondaryCtaLabel: "Ver Chamados",
      secondaryCtaHref: "/chamados",
      deepDiveTopicId: "mod_2",
      screenshots: [
        {
          title: "Abrir Chamado",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/abrir_chamado.png",
          alt: "Abrir Chamado - SharkConsig"
        },
        {
          title: "Acompanhamento dos Chamados",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/lista_chamados.png",
          alt: "Acompanhamento dos Chamados - SharkConsig"
        }
      ]
    },
    {
      id: "stage_6",
      number: 6,
      shortTitle: "Calcular & Comparar",
      title: "6. Calcular e Escolher o que Mostrar",
      objective: "Proporcionar uma forma simples de o cliente enxergar vantagem.",
      badgeText: "Simulação de Alto Impacto",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      steps: [
        "Acesse a Calculadora e simule a melhor condição (12x, 24x).",
        "Gere a imagem do comparativo clicando no botão 'Comparar'.",
        "Envie no WhatsApp a frase curta de introdução + a imagem do comparativo.",
        "Envie o texto de leitura simples do resultado conduzindo a negociação."
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
          sectionHeader: "Como Escolher a Ênfase da Mensagem",
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
      toAvoid: "Não transforme a resposta em explicação técnica com cálculos de juros compostos ou tabela cheia de números. Responda o que foi perguntado e conduza o próximo passo.",
      ctaLabel: "Ir para a Calculadora",
      ctaHref: "/calculadora",
      deepDiveTopicId: "mod_3",
      screenshots: [
        {
          title: "Calculadora Comercial",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/calculadora.png",
          alt: "Calculadora Comercial - SharkConsig"
        },
        {
          title: "Comparativo Visual",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/comparativos.png",
          alt: "Comparativo Visual - SharkConsig"
        }
      ]
    },
    {
      id: "stage_7",
      number: 7,
      shortTitle: "Plano & Amortização",
      title: "7. Comparativo Primeiro. Plano Depois (Se necessário)",
      objective: "Apresentar o Plano de Amortização apenas se o cliente pedir detalhamento de parcelas/prazos ou para gerar mais segurança.",
      badgeText: "Aprofundamento Técnico",
      badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
      steps: [
        "Abra o plano somente se houver dúvida acentuada sobre a parcela média, valor de liberação alto ou pedido expresso de detalhamento.",
        "Explique a mecânica de quitação das últimas parcelas com o código de barras com total transparência."
      ],
      copies: [
        {
          label: "Explicação Simples do Plano de Amortização",
          text: `Você vai observar que a parcela fixa é menor do que a que mencionei. A partir do 4º mês você tem o código de barras do banco para a diferença. Seguindo a programação, a estratégia encerra no prazo apresentado.`,
          whyUse: "Descomplica a engenharia financeira sem gerar medo de complexidade."
        }
      ],
      toAvoid: "Não jogar o plano completo no primeiro contato. Ele é uma ferramenta de aprofundamento, não a abertura da venda.",
      ctaLabel: "Acessar Calculadora / Planos",
      ctaHref: "/calculadora",
      deepDiveTopicId: "mod_3",
      screenshots: [
        {
          title: "Plano de Amortização",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/plano_amort.png",
          alt: "Plano de Amortização - SharkConsig"
        }
      ]
    },
    {
      id: "stage_8",
      number: 8,
      shortTitle: "Quitação de Cartão",
      title: "8. Quitação de Cartão",
      objective: "Se a proposta for quitação de cartão, a liberação ocorre pela margem facultativa, liberando valor para quitar o saldo.",
      objectiveLabel: "Quando",
      badgeText: "Operação Especial",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      steps: [
        "Saldo prévio: margem bruta do benefício – margem líquida = margem averbada.",
        "Margem averbada × 16,6667 = saldo devedor prévio.",
        "Em Acessar Cliente → Simular Proposta → usar a opção Quitação para criar a apresentação visual."
      ],
      copies: [
        {
          label: "Capacitação",
          text: `A montagem detalhada da proposta e particularidades ficam em treinamento específico, indicado depois que a pessoa já iniciou a prospecção.`,
          whyUse: "Permite que o corretor conheça a dinâmica de quitação de cartão sem sobrecarregar a fase inicial de prospecção."
        }
      ],
      toAvoid: "",
      ctaLabel: "Buscar Cliente no Sistema",
      ctaHref: "/pesquisa",
      deepDiveTopicId: "mod_2",
      screenshots: [
        {
          title: "Quitação de Cartão",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/proposta_reducao_RENATO_MENDES_CASTRO.jpg",
          alt: "Quitação de Cartão - SharkConsig"
        }
      ]
    },
    {
      id: "stage_9",
      number: 9,
      shortTitle: "Transforme Interesse em Ação",
      title: "9. Cliente Gostou? Transforme Interesse em Ação",
      objective: "Transformar o aceite em ação rápida, solicitar os documentos corretos, digitar na tabela mais vantajosa e acompanhar a esteira no Dashboard.",
      badgeText: "Formalização & Fechamento",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      steps: [
        "Assim que o cliente aceitar, dispare o script de coleta de documentos.",
        "Acesse Digitar Proposta, selecione o tipo de operação, convênio e tabela com melhor comissão/prazo para abrir a digitação.",
        "Preencha os dados e anexe os documentos com qualidade (RG/CNH frente e verso, contracheque).",
        "Acompanhe a esteira de propostas e utilize a mensagem de retomada caso o cliente pare."
      ],
      copies: [
        {
          label: "Avanço para Coleta de Documentos",
          text: `Perfeito. Para eu validar essa condição e deixar a proposta pronta para você conferir, me envia seu RG ou CNH (frente e verso), último contracheque e comprovante de residência. Assim já avanço sem perdermos essa condição.`,
          whyUse: "Cria senso de urgência saudável e direciona o cliente para o próximo passo prático."
        },
        {
          label: "Retomada — Cliente Parou",
          text: `Consegui deixar sua análise separada aqui. Antes de encerrar, quer que eu te envie novamente o comparativo que montamos ou ficou alguma dúvida na condição?`,
          whyUse: "Reabre a conversa de forma consultiva e sem pressão para destravar a proposta."
        }
      ],
      toAvoid: "",
      ctaLabel: "Ir para Digitar Proposta",
      ctaHref: "/propostas/nova",
      secondaryCtaLabel: "Acompanhar Propostas",
      secondaryCtaHref: "/propostas",
      deepDiveTopicId: "mod_2",
      screenshots: [
        {
          title: "Referência Visual da Tela Passo 2",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/digitar_proposta.png",
          alt: "Digitar Proposta - SharkConsig"
        },
        {
          title: "Referência Visual da Tela Passo 3",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/digitar_proposta_2.png",
          alt: "Digitar Proposta 2 - SharkConsig"
        },
        {
          title: "Referência Visual da Tela Passo 4",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/propostas.png",
          alt: "Acompanhamento de Propostas - SharkConsig"
        }
      ]
    },
    {
      id: "stage_10",
      number: 10,
      shortTitle: "Análise do Dashboard",
      title: "10. Dashboard e Como Analisá-lo",
      objective: "Acompanhar seus indicadores de produção e receita, entender quais bancos e produtos geram maior retorno e tomar decisões estratégicas para escalar seus resultados.",
      badgeText: "Gestão & Estratégia Comercial",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      steps: [
        "Sustentabilidade e Receita: Monitore a produção total, contratos pagos, ticket médio e a comissão real faturada no período selecionado (dia, semana, mês ou ano).",
        "Análise Comparativa: Compare sua evolução de produção e receita com os meses anteriores e acompanhe o ritmo semanal para manter a meta no radar.",
        "Diagnóstico de Desempenho: Identifique a participação por produto (Crédito Novo, Portabilidade, Cartão Benefício, Margem Livre), convênios e bancos.",
        "Ranking de Canais: Descubra quais instituições financeiras e linhas de crédito entregam o maior volume e receita para a sua carteira.",
        "Diagnóstico Estratégico & Riscos: Avalie a eficiência de margem, o yield de cada produto e evite depender de um único convênio ou banco para manter sua operação saudável."
      ],
      copies: [
        {
          label: "Dica de Gestão Comercial",
          text: `Utilize o Dashboard diariamente para calibrar seu foco: priorize produtos e tabelas com maior yield/comissionamento médio e diversifique os convênios atendidos para manter seu faturamento previsível e em crescimento contínuo.`,
          whyUse: "Focar em produtos de maior retorno e diversificar bancos aumenta seu ganho com a mesma quantidade de esforço operacional."
        }
      ],
      toAvoid: "Não olhe apenas o volume total de produção sem verificar a receita real faturada e o comissionamento médio. Evite concentrar 100% dos seus esforços em um único convênio ou banco sem explorar outras oportunidades da esteira.",
      ctaLabel: "Ir para o Dashboard",
      ctaHref: "/",
      deepDiveTopicId: "mod_3",
      screenshots: [
        {
          title: "Sustentabilidade e Receita",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/dashboard_1.png",
          alt: "Sustentabilidade e Receita - SharkConsig"
        },
        {
          title: "Análise Comparativa",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/dashboard_2.png",
          alt: "Análise Comparativa - SharkConsig"
        },
        {
          title: "Diagnóstico de Desempenho",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/dashboard_3.png",
          alt: "Diagnóstico de Desempenho - SharkConsig"
        },
        {
          title: "Ranking de Performance por Canal",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/dashboard_4.png",
          alt: "Ranking de Performance por Canal - SharkConsig"
        },
        {
          title: "Diagnóstico Financeiro e Estratégico",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/dashboard_5.png",
          alt: "Diagnóstico Financeiro e Estratégico - SharkConsig"
        }
      ]
    },
    {
      id: "stage_11",
      number: 11,
      shortTitle: "Histórico de Pagamentos",
      title: "11. Histórico dos seus Pagamentos (Comissões)",
      objective: "Acompanhar com total transparência todos os repasses e pagamentos de comissões realizados pela empresa para você.",
      badgeText: "Financeiro & Comissões",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      steps: [
        "Cards Resumo Financeiro: Visualize o Total de Operações pagas, a Comissão Bruta acumulada, Proventos adicionados, Descontos efetuados e a Comissão Líquida Total repassada.",
        "Pesquisa de Histórico de Pagamentos: Utilize os campos de busca por cliente, CPF, ID da digitação ou filtre pelo período de datas de pagamento desejado.",
        "Tabela Detalhada por Contrato: Consulte o detalhamento de cada operação contendo data de pagamento, cliente, CPF, valor da operação, comissão percentual e em reais, proventos, descontos e comissão líquida final.",
        "Exportação de Relatórios: Utilize o botão 'Exportar Excel' para baixar sua planilha financeira e manter seu controle contábil pessoal sempre atualizado."
      ],
      copies: [
        {
          label: "Dica de Controle Financeiro",
          text: `Acompanhe seus repasses periodicamente filtrando por data de pagamento para conciliar os valores depositados em sua conta com cada contrato efetivado no SharkConsig.`,
          whyUse: "Garante organização, previsibilidade financeira e controle exato de todas as comissões pagas pela empresa."
        }
      ],
      toAvoid: "Não deixe de conferir os valores líquidos repassados e evite acumular dúvidas sobre comissões de propostas já pagas sem checar antes o relatório detalhado e os filtros por período no sistema.",
      ctaLabel: "Ir para o Histórico de Pagamentos",
      ctaHref: "/financeiro/historico-pagamentos-pj",
      deepDiveTopicId: "mod_3",
      screenshots: [
        {
          title: "Histórico de Pagamentos",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/historico_pagamentos.png",
          alt: "Histórico de Pagamentos - SharkConsig"
        }
      ]
    },
    {
      id: "stage_12",
      number: 12,
      shortTitle: "Capacitação",
      title: "12. Capacitação — Formação & Aprofundamento",
      objective: "Acessar a biblioteca completa de capacitação técnica, produtos, políticas de crédito por convênio, roteiros de fechamento e materiais oficiais em PDF.",
      badgeText: "Treinamento & Alta Performance",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      steps: [
        "Módulos Especializados: Estude os 4 módulos divididos em Fundamentos & Abordagem, Produtos & Convênios, Sistema & Operação e Scripts & Fechamento.",
        "Aulas Objetivas: Cada aula apresenta objetivo central, pontos-chave de aplicação, o que evitar vs. o que preferir e comparativos práticos.",
        "Downloads Oficiais: Baixe os PDFs oficiais de apoio de cada módulo para consulta rápida durante seus atendimentos.",
        "Acompanhamento de Progresso: Marque as aulas concluídas e acompanhe em tempo real sua evolução na barra de progresso da capacitação."
      ],
      copies: [
        {
          label: "Rotina de Aprendizado Contínuo",
          text: `Reserve de 15 a 30 minutos diários para revisar os scripts por órgão e as regras de margem complementar para aumentar constantemente sua taxa de conversão.`,
          whyUse: "Acelera a curva de fechamentos e capacita você a solucionar objeções complexas com segurança."
        }
      ],
      toAvoid: "Não atue nas campanhas e órgãos sem conhecer as regras básicas de margem e enquadramento disponíveis na capacitação. Evite abordagens genéricas sem leitura de contexto.",
      ctaLabel: "Ir para a Capacitação Aprofundada",
      ctaHref: "/capacitacao-pj?tab=capacitacao",
      screenshots: [
        {
          title: "Capacitação",
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/capacitacao.png",
          alt: "Capacitação - SharkConsig"
        }
      ]
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
              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/etapa_1_acessar_campanha.png"
              alt="Tela Acessar Campanha - SharkConsig"
              className="w-full h-auto object-contain rounded-lg block"
            />
          </div>
        )

      case "whatsapp_abertura":
        return (
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/etapa_2_acessar_cliente.png"
              alt="Tela Acessar Cliente - SharkConsig"
              className="w-full h-auto object-contain rounded-lg block"
            />
          </div>
        )

      case "whatsapp_sondagem":
        return (
          <div className="bg-[#0b141a] text-slate-100 rounded-xl p-4 font-sans text-xs border border-emerald-900/40 space-y-3 shadow-sm">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white font-black text-[11px] shadow-xs">
                C
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-200 text-xs truncate">Cliente (Servidor Público)</p>
                <span className="text-[10px] text-emerald-400 font-medium">online</span>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Resposta do cliente à primeira mensagem */}
              <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-2xl rounded-tl-none mr-auto max-w-[85%] shadow-xs space-y-0.5">
                <p className="text-[11px] text-slate-200 leading-snug">
                  Oi! Pode ver sim como funciona.
                </p>
                <span className="text-[9px] text-slate-400 block text-right">10:43</span>
              </div>

              {/* Mensagem 1 de sondagem enviada */}
              <div className="bg-[#005c4b] text-slate-100 p-2.5 rounded-2xl rounded-tr-none ml-auto max-w-[88%] shadow-xs space-y-1">
                <p className="text-[11px] leading-relaxed text-slate-100">
                  Perfeito. Só para eu direcionar certo: você chegou a receber alguma proposta recentemente ou ainda não verificou nada?
                </p>
                <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70">
                  <span>10:44</span>
                  <CheckCheck className="w-3 h-3 text-cyan-400" />
                </div>
              </div>

              {/* Resposta do cliente dizendo que recebeu outra */}
              <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-2xl rounded-tl-none mr-auto max-w-[85%] shadow-xs space-y-0.5">
                <p className="text-[11px] text-slate-200 leading-snug">
                  Já me mandaram uma proposta de outro banco ontem.
                </p>
                <span className="text-[9px] text-slate-400 block text-right">10:45</span>
              </div>

              {/* Mensagem 2 de sondagem enviada */}
              <div className="bg-[#005c4b] text-slate-100 p-2.5 rounded-2xl rounded-tr-none ml-auto max-w-[88%] shadow-xs space-y-1">
                <p className="text-[11px] leading-relaxed text-slate-100">
                  Entendi. Você lembra mais ou menos o valor e em quantas parcelas ficou? Quero comparar com a condição que abriu aqui para você.
                </p>
                <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70">
                  <span>10:46</span>
                  <CheckCheck className="w-3 h-3 text-cyan-400" />
                </div>
              </div>

              {/* Resposta do cliente sobre prioridade */}
              <div className="bg-[#202c33] text-slate-100 p-2.5 rounded-2xl rounded-tl-none mr-auto max-w-[85%] shadow-xs space-y-0.5">
                <p className="text-[11px] text-slate-200 leading-snug">
                  Era 84x, mas achei o prazo muito longo.
                </p>
                <span className="text-[9px] text-slate-400 block text-right">10:47</span>
              </div>

              {/* Mensagem 3 de sondagem enviada */}
              <div className="bg-[#005c4b] text-slate-100 p-2.5 rounded-2xl rounded-tr-none ml-auto max-w-[88%] shadow-xs space-y-1">
                <p className="text-[11px] leading-relaxed text-slate-100">
                  Hoje para você faria mais sentido buscar o maior valor possível ou uma condição que pese menos e termine antes?
                </p>
                <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70">
                  <span>10:48</span>
                  <CheckCheck className="w-3 h-3 text-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        )

      case "pesquisa_cliente":
        return (
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/acoes_acessar_cliente.png"
              alt="Ações Acessar Cliente - SharkConsig"
              className="w-full h-auto object-contain rounded-lg block"
            />
          </div>
        )

      case "abrir_chamado_mockup":
        return (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/abrir_chamado.png"
                alt="Abrir Chamado - SharkConsig"
                className="w-full h-auto object-contain rounded-lg block"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/lista_chamados.png"
                alt="Acompanhamento dos Chamados - SharkConsig"
                className="w-full h-auto object-contain rounded-lg block"
              />
            </div>
          </div>
        )

      case "calculadora_dupla_mockup":
        return (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/calculadora.png"
                alt="Calculadora Comercial - SharkConsig"
                className="w-full h-auto object-contain rounded-lg block"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/comparativos.png"
                alt="Comparativo Visual - SharkConsig"
                className="w-full h-auto object-contain rounded-lg block"
              />
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
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/plano_amort.png"
              alt="Plano de Amortização - SharkConsig"
              className="w-full h-auto object-contain rounded-lg block"
            />
          </div>
        )

      case "quitacao_cartao":
        return (
          <div className={cn(
            "rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white mx-auto",
            isZoomed && "max-w-[80%]"
          )}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/proposta_reducao_RENATO_MENDES_CASTRO.jpg"
              alt="Quitação de Cartão - SharkConsig"
              className={cn(
                "w-full h-auto object-contain rounded-lg block",
                isZoomed && "max-h-[60vh] mx-auto"
              )}
            />
          </div>
        )

      case "digitacao_proposta":
        return (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/digitar_proposta.png"
                alt="Digitar Proposta - SharkConsig"
                className="w-full h-auto object-contain rounded-lg block"
              />
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/digitar_proposta_2.png"
                alt="Digitar Proposta 2 - SharkConsig"
                className="w-full h-auto object-contain rounded-lg block"
              />
            </div>
          </div>
        )

      case "lista_chamados":
        return (
          <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images/lista_chamados.png"
              alt="Acompanhamento dos Chamados - SharkConsig"
              className="w-full h-auto object-contain rounded-lg block"
            />
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
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
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
                    <span className="text-[9px] font-mono text-slate-500">
                      {String(stg.number).padStart(2, "0")}
                    </span>
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

      {/* 12 Interactive Stage Cards */}
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
                      Etapa {stage.number} de {STAGES.length}
                    </span>
                  </div>
                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    {stage.title}
                  </h3>
                  <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 align-middle" />
                    <strong className="text-slate-800 font-bold">{stage.objectiveLabel || "Objetivo"}:</strong>{" "}
                    {stage.objective}
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
                        {stage.number !== 8 && (
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" />
                            Passo a Passo da Etapa
                          </span>
                        )}
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
                      {stage.copies.length > 0 && (
                        <div className="space-y-3">
                          {stage.number !== 1 && stage.number !== 5 && stage.number !== 8 && stage.number !== 10 && stage.number !== 11 && stage.number !== 12 && (
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
                              const isStage5 = stage.number === 5
                              const isStage8 = stage.number === 8
                              const isStage10 = stage.number === 10
                              const isStage11 = stage.number === 11
                              const isStage12 = stage.number === 12

                              return (
                                <React.Fragment key={cIdx}>
                                  {copyItem.sectionHeader && (
                                    <div className="pt-2">
                                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                                        {copyItem.sectionHeader}
                                      </span>
                                    </div>
                                  )}
                                  <div 
                                    className="bg-[#f0f9f5] border border-emerald-200 rounded-2xl p-4 space-y-3 relative group"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded">
                                        {copyItem.label}
                                      </span>

                                      {!isStage1 && !isStage5 && !isStage8 && !isStage10 && !isStage11 && !isStage12 && (
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

                                    <div className="bg-white p-3.5 rounded-xl border border-emerald-100/80 shadow-2xs font-sans font-bold text-xs text-slate-900 whitespace-pre-line leading-relaxed select-text">
                                      {copyItem.text}
                                    </div>

                                    {copyItem.whyUse && (
                                      <p className="text-[13px] text-emerald-900/90 font-medium leading-relaxed">
                                        <span className="font-extrabold text-emerald-800 mr-1.5">Por que usar:</span>
                                        {copyItem.whyUse}
                                      </p>
                                    )}
                                  </div>
                                </React.Fragment>
                              )
                            })}
                          </div>
                        </div>
                      )}

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
                      {stage.number !== 8 && stage.toAvoid && (
                        <div className="p-4 bg-red-50/80 rounded-2xl border border-red-200/90 space-y-1.5">
                          <span className="text-xs font-black uppercase tracking-wider text-red-800 flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                            O que EVITAR nesta etapa
                          </span>
                          <p className="text-xs text-red-950 font-medium leading-relaxed">
                            {stage.toAvoid}
                          </p>
                        </div>
                      )}

                    </div>

                    {/* RIGHT COLUMN: Screen Mockup & Action CTAs (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                      
                      {/* Screen Preview Container (Single or Multiple Distinct Cards) */}
                      {stage.screenshots && stage.screenshots.length > 0 ? (
                        <div className="space-y-3">
                          {stage.screenshots.map((screen, sIdx) => (
                            <div key={sIdx} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                                  <Eye className="w-3.5 h-3.5 text-slate-600" />
                                  {stage.screenshots!.length > 1
                                    ? screen.title
                                    : stage.number === 8
                                      ? "REFERÊNCIA VISUAL"
                                      : "Referência Visual da Tela"}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPreviewModal({
                                    isOpen: true,
                                    title: screen.title,
                                    imageUrl: screen.url
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
                                  title: screen.title,
                                  imageUrl: screen.url
                                })}
                                className="cursor-pointer group relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-white transition-all hover:ring-2 hover:ring-emerald-500"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={screen.url}
                                  alt={screen.alt}
                                  className="w-full h-auto object-contain rounded-lg block"
                                />
                                <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                  <span className="bg-slate-950/80 text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
                                    <ZoomIn className="w-3 h-3" /> Clique para Inspecionar
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : stage.mockupType ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span />
                          </div>

                          <div className="rounded-xl overflow-hidden transition-all">
                            {renderScreenMockup(stage.mockupType)}
                          </div>
                        </div>
                      ) : null}

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

      {/* Screen Zoom Modal (Single clicked image) */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-700 overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-black text-white">
                  {previewModal.title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal({ isOpen: false, title: "", imageUrl: "" })}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-2">
              <div className="rounded-xl overflow-hidden border border-slate-700 shadow-sm bg-white max-h-[70vh] flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewModal.imageUrl}
                  alt={previewModal.title}
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg block"
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t border-slate-800">
              <Button
                type="button"
                size="sm"
                onClick={() => setPreviewModal({ isOpen: false, title: "", imageUrl: "" })}
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
