"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { 
  GraduationCap, 
  BookOpen, 
  CheckCircle2, 
  Circle, 
  PlayCircle, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Download, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  Target, 
  Zap, 
  TrendingUp, 
  HelpCircle,
  FileSpreadsheet,
  Award,
  Layers,
  Search,
  RotateCcw
} from "lucide-react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase"
import { useAuth } from "@/context/auth-context"

// Types
export interface Lesson {
  id: string
  title: string
  subtitle: string
  pdf_page: number
  duration: string
  content: {
    overview: string
    keyPoints: string[]
    doAndDonts?: { do: string[]; dont: string[] }
    callout?: { type: "info" | "warning" | "success" | "tip"; title: string; text: string }
    tableData?: { headers: string[]; rows: string[][] }
    checklist?: string[]
    exampleText?: { label: string; weak: string; strong: string }
  }
}

export interface CourseModule {
  id: string
  title: string
  subtitle: string
  color: "blue" | "green" | "amber"
  pdf_name: string
  pdf_url: string
  lessons: Lesson[]
}

// Full Course Structure Data
const COURSE_DATA: CourseModule[] = [
  {
    id: "mod_1",
    title: "Módulo 01: Guia Inicial do Parceiro",
    subtitle: "Fundamentos, Abordagem e Postura Comercial",
    color: "blue",
    pdf_name: "01 - GUIA INICIAL DO PARCEIRO.pdf",
    pdf_url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/01%20-%20GUIA%20INICIAL%20DO%20PARCEIRO.pdf",
    lessons: [
      {
        id: "lesson_1_1",
        title: "1.1 O Papel do Parceiro e Leitura de Contexto",
        subtitle: "O que o cliente tem hoje vs. O que apresentar",
        pdf_page: 2,
        duration: "5 min",
        content: {
          overview: "Não comece pelo produto. O sucesso da venda de consignado começa pelo entendimento claro do cenário do cliente. Você representa a operação e a experiência que o cliente terá.",
          keyPoints: [
            "01. O que o cliente tem hoje? (Contratos vigentes, descontos, margem usada, cartões).",
            "02. O que está disponível? (Atualizações recentes, novas margens, folga na folha).",
            "03. O que faz mais sentido apresentar? (A solução com maior impacto e menor resistência)."
          ],
          callout: {
            type: "info",
            title: "Informações que ajudam na leitura inicial",
            text: "Margem disponível • Contratos na folha • Descontos do contra-cheque • Cartões ativos • Refinanciamentos possíveis • Limitações do órgão • Condições dos bancos."
          },
          checklist: [
            "Confirmar se o cliente já possui margem ou cartão em folha",
            "Verificar se houve atualização recente no órgão/secretaria",
            "Mapear taxa e parcela dos contratos antigos antes de oferecer novidade"
          ]
        }
      },
      {
        id: "lesson_1_2",
        title: "1.2 Conhecendo a Persona e Interpretando a Primeira Resposta",
        subtitle: "Lidando com 'Não tenho interesse' sem perder a oportunidade",
        pdf_page: 3,
        duration: "6 min",
        content: {
          overview: "Você não está atuando com um público desconhecido. São perfis com comportamento de crédito identificado, histórico de contratação e tendência natural de voltar a utilizar crédito. A questão central é: QUANDO o cliente fará, em qual condição e com quem.",
          keyPoints: [
            "Interpretando 'Não tenho interesse': significa cliente localizado, não cliente descartado.",
            "Evite o Extremo 1: Abandonar rapidamente um cliente com alto potencial.",
            "Evite o Extremo 2: Insistir de forma incansável até sobrecarregar o cliente.",
            "Orientação Acerto Fácil: Registre a tentativa, preserve o relacionamento e retome a conversa em outro contexto ou oportunidade."
          ],
          callout: {
            type: "warning",
            title: "Regra de Ouro na Prospecção",
            text: "Preservar a relação é mais rentável a médio prazo do que forçar uma venda que gera cancelamento ou bloqueio de contato."
          }
        }
      },
      {
        id: "lesson_1_3",
        title: "1.3 Postura e Comunicação: O que evitar e por onde começar",
        subtitle: "Termos que enfraquecem a mensagem e gatilhos de abertura",
        pdf_page: 4,
        duration: "7 min",
        content: {
          overview: "Clareza não é explicar tudo de uma vez. Clareza é entregar a informação certa para o cliente continuar a conversa sem se sentir pressionado.",
          doAndDonts: {
            dont: [
              "Começar por Margem, Taxa, Parcela ou Tabela isolada",
              "Enviar simulação sem explicação do contexto",
              "Perguntar 'Tem interesse?' ou 'Quer fazer um empréstimo?'",
              "Mandar blocos gigantes de texto com excesso de detalhes técnicos"
            ],
            do: [
              "Começar por o que mudou no órgão ou na secretaria do cliente",
              "Destacar o que foi identificado no perfil específico dele",
              "Apresentar a oportunidade e o impacto positivo que ela gera",
              "Fazer uma pergunta simples e natural que abra o diálogo"
            ]
          },
          callout: {
            type: "warning",
            title: "Palavras que ENFRAQUECEM sua mensagem",
            text: "Evite usar: 'Acho', 'Talvez', 'Quem sabe', 'Pode ser', 'Acredito que dê', 'Provavelmente'. Transmita firmeza com proximidade!"
          }
        }
      },
      {
        id: "lesson_1_4",
        title: "1.4 Transformando Produtos em Benefícios",
        subtitle: "Como apresentar Margem, Quitação, Refin e Reorganização",
        pdf_page: 5,
        duration: "8 min",
        content: {
          overview: "Produto explica O QUE está sendo feito. Benefício mostra POR QUE o cliente deve considerar a proposta.",
          keyPoints: [
            "MARGEM COMPLEMENTAR: Não é apenas cartão. É uma capacidade adicional em folha que gera valor direto em conta.",
            "QUITAÇÃO: Não é apenas um novo contrato. É a substituição de uma linha cara por um prazo definido com redução de custo.",
            "REFINANCIAMENTO: Não é apenas renovar. É utilizar uma operação existente para gerar nova disponibilidade imediata.",
            "REORGANIZAÇÃO DA FOLHA: Não é só contratar. É buscar valor controlando o impacto do desconto mensal."
          ],
          tableData: {
            headers: ["Modalidade", "O que o leigo vê", "O Benefício Real para Vender"],
            rows: [
              ["Margem Complementar", "Mais um cartão plástico", "Capacidade adicional gerando troco em conta"],
              ["Quitação de Dívida", "Trocar dívida por dívida", "Trocar juros abusivos por parcela reduzida"],
              ["Refinanciamento", "Pegar mais dinheiro", "Aproveitar o contrato antigo pra liberar valor sem mexer no orçamento"],
              ["Reorganização", "Fazer empréstimo", "Limpar o contracheque e reajustar o fluxo de caixa mensal"]
            ]
          }
        }
      },
      {
        id: "lesson_1_5",
        title: "1.5 Conduzindo a Conversa e Evitando Erros/Achismos",
        subtitle: "Sair do papel de passivo e direcionar o cliente ao próximo passo",
        pdf_page: 6,
        duration: "6 min",
        content: {
          overview: "Informar não basta: você precisa CONDUZIR. Conduzir é facilitar o avanço da conversa sem fazer perguntas forçadas.",
          exampleText: {
            label: "Comparativo de Abordagem",
            weak: "\"Esse é o valor disponível. Qualquer coisa me chama.\"",
            strong: "\"Hoje essa é a condição que mais entrega valor no seu caso. Posso te mostrar como fica o valor em conta e a parcela?\""
          },
          keyPoints: [
            "Só informar: Envia valor e parcela, responde só o perguntado, encerra com 'qualquer coisa me chama'.",
            "Conduzir: Explica por que a condição faz sentido, destaca o ponto principal e deixa claro o próximo passo."
          ],
          callout: {
            type: "warning",
            title: "Achismos que limitam suas vendas",
            text: "Cuidado com frases como: 'Essa taxa tá alta', 'Esse prazo é muito longo', 'O cliente não vai querer', 'Ele já disse não'. Não julgue pelo cliente, apresente os fatos e benefícios!"
          }
        }
      },
      {
        id: "lesson_1_6",
        title: "1.6 Checklist do Parceiro: Autonomia e Apoio da Acerto Fácil",
        subtitle: "Saber quando agir sozinho e quando acionar o suporte operacional",
        pdf_page: 8,
        duration: "5 min",
        content: {
          overview: "O parceiro possui autonomia total para conduzir a operação. A Acerto Fácil entra como apoio estratégico e operacional nas situações de maior complexidade.",
          checklist: [
            "Entendi o perfil da base e a oportunidade que estou apresentando",
            "Consigo explicar o benefício em palavras simples e diretas",
            "Tenho uma abordagem inicial que cria contexto com o órgão",
            "Sei qual o próximo passo quero conduzir com o cliente",
            "Sei exatamente quando seguir sozinho e quando abrir chamado na operação"
          ],
          callout: {
            type: "success",
            title: "Quando acionar o apoio operacional da Acerto Fácil",
            text: "Cálculos complexos de quitação • Compra de dívida entre bancos • Dúvidas sobre banco/convênio específico • Condições fora do padrão da tabela • Inconsistências de sistema ou averbação."
          }
        }
      }
    ]
  },
  {
    id: "mod_2",
    title: "Módulo 02: Órgãos, Produtos e Oportunidades",
    subtitle: "Estratégias por Base de Dados e Perfis de Atuação",
    color: "green",
    pdf_name: "02 - ORGAOS, PRODUTOS E OPORTUNIDADES.pdf",
    pdf_url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/02%20-%20ORGAOS,%20PRODUTOS%20E%20OPORTUNIDADES.pdf",
    lessons: [
      {
        id: "lesson_2_1",
        title: "2.1 Como Usar o Guia e Comparativo Real de Taxas",
        subtitle: "Entendendo o contexto e a legenda de entrada nas bases",
        pdf_page: 2,
        duration: "6 min",
        content: {
          overview: "Taxa alta ou baixa depende estritamente do contexto. Uma condição não deve ser julgada isoladamente, mas sim em comparação com as alternativas reais que o cliente possui.",
          tableData: {
            headers: ["Taxa Mensal", "Julgamento Precipitado", "Realidade do Mercado Consignado"],
            rows: [
              ["1.00% ao mês", "Pode parecer alto", "Em uma linha imobiliária ou garantia real"],
              ["2.00% ao mês", "Excelente & Competitivo", "Para cartão consignado/benefício"],
              ["5.00% ao mês", "Pode parecer elevado", "Muito inferior ao crédito pessoal/cheque especial (>8% ao mês)"]
            ]
          },
          callout: {
            type: "info",
            title: "Legenda de Entrada do Sistema",
            text: "🟢 BOM PARA COMEÇAR (Acesso simples e rápido) | 🟡 REQUER MAIS EXPERIÊNCIA (Exige cálculos/negociação) | 🔵 AÇÃO PONTUAL (Campanhas específicas de refin/banco)."
          }
        }
      },
      {
        id: "lesson_2_2",
        title: "2.2 O Poder da Margem Complementar",
        subtitle: "Valor em conta, saque parcelado e oportunidade de amortização",
        pdf_page: 4,
        duration: "7 min",
        content: {
          overview: "Mesmo quando o servidor está sem margem de empréstimo tradicional, a margem de cartão benefício permite liberar valores expressivos diretamente em conta corrente.",
          keyPoints: [
            "01. CAPACIDADE ADICIONAL: Mesmo com a margem principal zerada, o cliente possui nova disponibilidade.",
            "02. VALOR EM CONTA: Bancos parceiros liberam até 100% do valor via transferência/TED sem necessidade de usar plástico.",
            "03. AMORTIZAÇÃO FLEXÍVEL: O cliente pode antecipar parcelas de trás para frente reduzindo juros futuros.",
            "04. FOCO DA VENDA: Venda o valor em conta e o impacto na vida do cliente, não o cartão físico."
          ],
          callout: {
            type: "warning",
            title: "Atenção sobre Amortização",
            text: "O abatimento de parcelas futuras depende do banco e do prazo restante. Em parcelas finais, o desconto de juros pode superar 90%!"
          }
        }
      },
      {
        id: "lesson_2_3",
        title: "2.3 Oportunidades Recomendadas para Iniciantes",
        subtitle: "Atuação no Governo do PI, PM Porto Velho e PM Santo André",
        pdf_page: 5,
        duration: "8 min",
        content: {
          overview: "Essas três bases são classificadas como 'BOM PARA COMEÇAR' devido à alta receptividade e facilidade de fechamento.",
          tableData: {
            headers: ["Órgão / Convenio", "Perfil do Cliente", "Estratégia Recomendada"],
            rows: [
              ["Governo do Piauí", "Forte tomador com margem complementar", "Apresentar liberação de até 100% em conta pela margem benefício."],
              ["Prefeitura de Porto Velho", "Margem principal negativa ou zerada", "Mostrar a nova margem de cartão disponibilizada recentemente."],
              ["Prefeitura de Santo André", "Servidores acessíveis, margem zera/baixa", "Apresentar condição separada com prazos longos e constância."]
            ]
          },
          checklist: [
            "No Piauí, priorizar bancos que liberam 100% em conta",
            "Em Porto Velho, contextualizar que surgiu nova oportunidade no vínculo",
            "Em Santo André, focar na construção de relacionamento com o servidor"
          ]
        }
      },
      {
        id: "lesson_2_4",
        title: "2.4 Oportunidades Nível Intermediário",
        subtitle: "São Paulo (Governo e Prefeitura) e SIAPE por Secretarias",
        pdf_page: 8,
        duration: "9 min",
        content: {
          overview: "Bases de grande volume que exigem segmentação de perfil antes de escolher o argumento de abordagem.",
          keyPoints: [
            "SÃO PAULO - PERFIL 1 (Margem Recuperada): Servidores que voltaram a ter margem positiva (muitos liberando +R$50mil).",
            "SÃO PAULO - PERFIL 2 (Cartão Caro + Margem): Clientes com cartão ativo acima de 4,5% a.m. Excelente para quitação/compra.",
            "SÃO PAULO - PERFIL 3 (Somente Margem Benefício): Clientes que consumiram a principal e mantêm apenas a complementar.",
            "SIAPE (Federal): Abordar especificamente pela secretaria (Ex: Saúde, Educação, Celetistas) e focar na reorganização da folha."
          ],
          callout: {
            type: "info",
            title: "Ideia central no SIAPE",
            text: "Não ofereça apenas 'mais crédito'. Mostre como reorganizar o que já existe no contracheque e gerar valor sem aumentar o desconto mensal."
          }
        }
      },
      {
        id: "lesson_2_5",
        title: "2.5 Operações Especiais e Pontuais",
        subtitle: "Digio Refin, Quitação de Cartão e Compra de Dívida",
        pdf_page: 9,
        duration: "7 min",
        content: {
          overview: "Operações voltadas para parceiros consolidados ou em campanhas de oportunidade rápida.",
          keyPoints: [
            "Digio Refin: Refinanciamento de contratos no Banco Digio. Depende do saldo, parcelas pagas e convênio.",
            "Quitação de Cartão: Substituição do cartão caro com desconto em folha por um consignado tradicional de menor taxa.",
            "Compra de Dívida: Operação técnica em que o banco liquidante compra a dívida atual e libera troco na repactuação."
          ],
          callout: {
            type: "warning",
            title: "Requisito para Iniciantes",
            text: "A compra de dívida envolve envio de propostas detalhadas e prazo mais longo. Para iniciantes, recomenda-se pedir apoio operacional da Acerto Fácil."
          }
        }
      }
    ]
  },
  {
    id: "mod_3",
    title: "Módulo 03: Fluxo do Sistema e Operação na Prática",
    subtitle: "Uso Completo da Plataforma SharkConsig",
    color: "amber",
    pdf_name: "03 - FLUXO DO SISTEMA E OPERACAO NA PRATICA.pdf",
    pdf_url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/03%20-%20SHARKCONSIG%20-%20TEMPORARIO.pdf",
    lessons: [
      {
        id: "lesson_3_1",
        title: "3.1 Visão Geral: O Fluxo em 4 Movimentos",
        subtitle: "Da campanha ao acompanhamento e fechamento da proposta",
        pdf_page: 2,
        duration: "5 min",
        content: {
          overview: "O sistema SharkConsig foi desenhado para organizar a operação em 4 passos sequenciais e lógicos.",
          keyPoints: [
            "01. ENTRAR E LOCALIZAR: Acesse o sistema, entre na campanha ou pesquise um cliente específico.",
            "02. LER O PERFIL: Confirme órgão, vínculo, margem principal, margem cartão e contratos existentes.",
            "03. SIMULAR OU PEDIR APOIO: Use o simulador para traduzir a proposta ou abra um chamado operacional.",
            "04. REGISTRAR E ACOMPANHAR: Tabule o atendimento, digite a proposta, anexe documentos e acompanhe até o pagamento."
          ]
        }
      },
      {
        id: "lesson_3_2",
        title: "3.2 Acesso, Campanhas e Leitura Completa do Cliente",
        subtitle: "Navegação na fila de contatos e leitura da ficha do servidor",
        pdf_page: 4,
        duration: "7 min",
        content: {
          overview: "Ao entrar em uma campanha no SharkConsig, os clientes são entregues em fila organizada. Nunca aborde um cliente sem antes ler os quatro blocos essenciais:",
          keyPoints: [
            "Bloco 1: Nome do Convênio e Órgão (Fica no topo da tela).",
            "Bloco 2: Matrícula e Vínculo (Estatutário, Celetista, Aposentado/Pensionista).",
            "Bloco 3: Margem de Empréstimo vs. Margem de Cartão (Visão imediata do troco).",
            "Bloco 4: Contratos em Folha (Bancos atuais, parcelas, taxas e saldo devedor)."
          ],
          checklist: [
            "Conferir se o telefone possui WhatsApp ativo antes de acionar",
            "Verificar a soma das margens líquidas disponíveis",
            "Identificar se o cliente já possui cartões consignados ativos"
          ]
        }
      },
      {
        id: "lesson_3_3",
        title: "3.3 Tabulação Obrigatória e Pesquisa de Clientes",
        subtitle: "Manutenção da base limpa e buscas rápidas por CPF",
        pdf_page: 6,
        duration: "6 min",
        content: {
          overview: "A seleção da tabulação é obrigatória para liberar o botão 'Próximo Cliente' e manter a esteira da campanha organizada.",
          keyPoints: [
            "Status Obrigatórios: 'Cliente Chamado', 'Não Existe WhatsApp', 'WhatsApp Divergente', 'Sem Interesse', 'Em Negociação'.",
            "Pesquisa Global: Utilize o ícone de Lupa no menu lateral para buscar qualquer cliente localizado anteriormente por CPF ou Nome.",
            "Sair da Campanha: Sempre utilize o botão 'Sair da Campanha' antes de fechar a aba para não prender a ficha do cliente."
          ]
        }
      },
      {
        id: "lesson_3_4",
        title: "3.4 Simulação vs. Abertura de Chamados Operacionais",
        subtitle: "Qual botão escolher na ficha do cliente?",
        pdf_page: 9,
        duration: "6 min",
        content: {
          overview: "No rodapé da ficha do cliente existem dois caminhos fundamentais para dar sequência ao atendimento:",
          tableData: {
            headers: ["Opção", "Quando Utilizar", "Resultado Gerado"],
            rows: [
              ["Simular Proposta", "Você entende a condição e quer gerar um comparativo visual para o cliente", "Abre o simulador com propostas de Redução, Novo Formato e Quitação."],
              ["Abrir Chamado", "Você precisa de consulta de saldo, validação de regras ou apoio técnico", "Envia a solicitação para a equipe da Acerto Fácil com prazos de resposta via SLA."]
            ]
          },
          callout: {
            type: "info",
            title: "Dica de Produtividade",
            text: "Chamados objetivos e com a margem correta selecionada possuem tempo de resposta até 50% mais rápido pela equipe operacional!"
          }
        }
      },
      {
        id: "lesson_3_5",
        title: "3.5 Digitação de Propostas, Anexo de Documentos e Pendências",
        subtitle: "As 3 escolhas obrigatórias e envio sem erros",
        pdf_page: 15,
        duration: "8 min",
        content: {
          overview: "Para digitar uma proposta comercial no SharkConsig, siga as 3 escolhas obrigatórias:",
          keyPoints: [
            "1ª Escolha: Convênio correto do cliente.",
            "2ª Escolha: Banco que operará a proposta.",
            "3ª Escolha: Modalidade da operação (Margem Livre, Refin, Cartão, Portabilidade).",
            "Preenchimento de Campos: Dados pessoais, endereço, conta bancária para crédito do troco e tabela comercial com coeficiente.",
            "Anexo de Documentos: RG/CNH legível, Comprovante de Residência recente e Contracheque atualizado."
          ],
          callout: {
            type: "warning",
            title: "Aviso de Pendências no Sistema",
            text: "O SharkConsig destaca em vermelho todos os campos obrigatórios pendentes antes de liberar o botão 'Cadastrar Proposta'."
          }
        }
      },
      {
        id: "lesson_3_6",
        title: "3.6 Apresentando a Proposta Emitida ao Cliente",
        subtitle: "Condução do fechamento usando os layouts visuais gerados",
        pdf_page: 19,
        duration: "7 min",
        content: {
          overview: "A proposta emitida em PDF/Imagem pelo SharkConsig é parte essencial da venda. Ela traduz a matemática em impacto visual.",
          keyPoints: [
            "01. Antes de enviar: Saiba exatamente qual benefício destacar (troco liberado, redução da parcela ou juros zerados).",
            "02. Durante a apresentação: Mostre primeiro o valor em conta ou a economia total gerada no bolso.",
            "03. Depois de enviar: Conduza para a formalização (SMS/WhatsApp ou link facial) sem fazer perguntas genéricas como 'O que achou?'."
          ],
          exampleText: {
            label: "Frase de Fechamento Recomendada",
            weak: "\"Tá aí a proposta, veja se interessa e me avisa.\"",
            strong: "\"O principal ponto aqui é que você recebe R$ 10.022 em conta e ainda reduz R$ 181 por mês na sua folha. Vou te enviar o link de confirmação no celular, ok?\""
          }
        }
      }
    ]
  }
]

export default function CapacitacaoPJPage() {
  const { user } = useAuth()
  const [completedLessonIds, setCompletedLessonIds] = useState<string[]>([])
  const [activeModuleId, setActiveModuleId] = useState<string>("mod_1")
  const [activeLessonId, setActiveLessonId] = useState<string>("lesson_1_1")
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    mod_1: true,
    mod_2: false,
    mod_3: false
  })
  const [loading, setLoading] = useState(true)
  const [savingLesson, setSavingLesson] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Calculate total lessons and progress percentage
  const allLessons = useMemo(() => {
    return COURSE_DATA.flatMap(m => m.lessons)
  }, [])

  const totalLessonsCount = allLessons.length
  const completedCount = completedLessonIds.length
  const progressPercent = Math.round((completedCount / totalLessonsCount) * 100) || 0

  // Load progress from Supabase or localStorage fallback
  useEffect(() => {
    async function loadProgress() {
      setLoading(true)
      try {
        if (isSupabaseConfigured && user?.id) {
          const { data, error } = await supabase
            .from("capacitacao_pj_progresso")
            .select("lesson_id, status")
            .eq("user_id", user.id)

          if (!error && data) {
            const completed = data.filter((item: any) => item.status === "completed").map((item: any) => item.lesson_id)
            setCompletedLessonIds(completed)
            setLoading(false)
            return
          }
        }
      } catch (err) {
        console.warn("Supabase read error, falling back to localStorage:", err)
      }

      // LocalStorage fallback
      try {
        const localKey = `shark_capacitacao_pj_${user?.id || 'guest'}`
        const stored = localStorage.getItem(localKey)
        if (stored) {
          setCompletedLessonIds(JSON.parse(stored))
        }
      } catch (e) {
        console.error("Error reading localStorage:", e)
      }
      setLoading(false)
    }

    loadProgress()
  }, [user?.id])

  // Get Active Lesson and Module
  const currentModule = useMemo(() => {
    return COURSE_DATA.find(m => m.id === activeModuleId) || COURSE_DATA[0]
  }, [activeModuleId])

  const currentLesson = useMemo(() => {
    for (const m of COURSE_DATA) {
      const found = m.lessons.find(l => l.id === activeLessonId)
      if (found) return found
    }
    return COURSE_DATA[0].lessons[0]
  }, [activeLessonId])

  // Navigation Logic
  const currentIndexInAll = useMemo(() => {
    return allLessons.findIndex(l => l.id === activeLessonId)
  }, [allLessons, activeLessonId])

  const prevLesson = currentIndexInAll > 0 ? allLessons[currentIndexInAll - 1] : null
  const nextLesson = currentIndexInAll < allLessons.length - 1 ? allLessons[currentIndexInAll + 1] : null

  // Toggle module expansion
  const toggleModuleAccordion = (modId: string) => {
    setExpandedModules(prev => ({
      ...prev,
      [modId]: !prev[modId]
    }))
  }

  // Select a lesson
  const handleSelectLesson = (modId: string, lessonId: string) => {
    setActiveModuleId(modId)
    setActiveLessonId(lessonId)
    // Automatically expand the module containing the selected lesson
    setExpandedModules(prev => ({ ...prev, [modId]: true }))
  }

  // Toggle completion status
  const handleToggleComplete = async (lessonId: string) => {
    setSavingLesson(lessonId)
    const isCompleted = completedLessonIds.includes(lessonId)
    const newCompleted = isCompleted
      ? completedLessonIds.filter(id => id !== lessonId)
      : [...completedLessonIds, lessonId]

    setCompletedLessonIds(newCompleted)

    // Save to LocalStorage
    try {
      const localKey = `shark_capacitacao_pj_${user?.id || 'guest'}`
      localStorage.setItem(localKey, JSON.stringify(newCompleted))
    } catch (e) {
      console.error("LocalStorage write error:", e)
    }

    // Save to Supabase if configured
    if (isSupabaseConfigured && user?.id) {
      try {
        await supabase
          .from("capacitacao_pj_progresso")
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            status: isCompleted ? "in_progress" : "completed",
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id,lesson_id" })
      } catch (err) {
        console.warn("Supabase upsert failed, preserved in local storage:", err)
      }
    }

    setSavingLesson(null)
  }

  // Complete & Go to Next Lesson
  const handleCompleteAndNext = async () => {
    if (!completedLessonIds.includes(activeLessonId)) {
      await handleToggleComplete(activeLessonId)
    }
    if (nextLesson) {
      // find which module has nextLesson
      const parentMod = COURSE_DATA.find(m => m.lessons.some(l => l.id === nextLesson.id))
      if (parentMod) {
        handleSelectLesson(parentMod.id, nextLesson.id)
      }
    }
  }

  // Filter lessons based on search
  const filteredModules = useMemo(() => {
    if (!searchTerm.trim()) return COURSE_DATA
    const term = searchTerm.toLowerCase()
    return COURSE_DATA.map(mod => ({
      ...mod,
      lessons: mod.lessons.filter(l => 
        l.title.toLowerCase().includes(term) || 
        l.subtitle.toLowerCase().includes(term) ||
        l.content.overview.toLowerCase().includes(term)
      )
    })).filter(mod => mod.lessons.length > 0)
  }, [searchTerm])

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/80">
      <Header title="Capacitação PJ" subtitle="Sistema de Treinamento e LMS para Parceiros PJ - SharkConsig" />

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Top Banner Title */}
        <div className="bg-gradient-to-r from-[#171717] via-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-700/50">
          <div className="space-y-2 z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              TREINAMENTO OFICIAL PARA NOSSOS PARCEIROS
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Trilha de Capacitação e Alta Performance
            </h1>
            <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-medium">
              Aprenda a abordagem de vendas, leitura de contextuabilidade no SharkConsig, análise de margens e condução de propostas de alta conversão.
            </p>
          </div>

          <div className="z-10 bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 flex flex-col items-center justify-center min-w-[200px] w-full md:w-auto text-center shadow-inner">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-300 mb-1">
              SEU PROGRESSO TOTAL
            </span>
            <div className="text-3xl font-black text-emerald-400 flex items-baseline gap-1">
              {progressPercent}%
              <span className="text-xs font-semibold text-slate-300">concluído</span>
            </div>
            <div className="w-full bg-slate-700/60 rounded-full h-2.5 mt-2 overflow-hidden p-0.5">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-semibold text-slate-300 mt-1.5">
              {completedCount} de {totalLessonsCount} aulas concluídas
            </span>
          </div>
        </div>

        {/* LMS Main Grid (2 Columns: Left Accordion Navigation, Right Lesson Viewer) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR: Course Accordion Navigation */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4 sticky top-20">
            <Card className="border-slate-200/80 shadow-md rounded-2xl overflow-hidden bg-white">
              <div className="p-4 bg-slate-900 text-white flex flex-col space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                    <h2 className="font-extrabold text-sm uppercase tracking-wider text-white">
                      Módulos do Curso
                    </h2>
                  </div>
                  <Badge className="bg-slate-800 text-emerald-400 border border-slate-700 text-[10px] font-bold">
                    3 Módulos
                  </Badge>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar aula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-800/90 text-white placeholder-slate-400 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-400 border border-slate-700"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-white text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              <CardContent className="p-3 space-y-3 max-h-[720px] overflow-y-auto custom-scrollbar">
                {filteredModules.map((module) => {
                  const isExpanded = expandedModules[module.id] ?? true
                  const modLessonsCount = module.lessons.length
                  const modCompletedCount = module.lessons.filter(l => completedLessonIds.includes(l.id)).length
                  const modProgress = Math.round((modCompletedCount / modLessonsCount) * 100) || 0

                  const badgeColorClass = 
                    module.color === "blue" 
                      ? "bg-blue-50 text-blue-700 border-blue-200" 
                      : module.color === "green" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-amber-50 text-amber-700 border-amber-200"

                  return (
                    <div 
                      key={module.id} 
                      className="border border-slate-200 rounded-xl overflow-hidden transition-all bg-white"
                    >
                      {/* Module Header Button */}
                      <button
                        type="button"
                        onClick={() => toggleModuleAccordion(module.id)}
                        className="w-full text-left p-3.5 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-start justify-between gap-3 border-b border-slate-100"
                      >
                        <div className="space-y-1">
                          <span className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border inline-block mb-1", badgeColorClass)}>
                            {module.id === "mod_1" ? "📘 Módulo 01" : module.id === "mod_2" ? "📗 Módulo 02" : "📙 Módulo 03"}
                          </span>
                          <h3 className="text-xs font-bold text-slate-800 leading-snug">
                            {module.title}
                          </h3>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium pt-0.5">
                            <span>{modCompletedCount}/{modLessonsCount} aulas</span>
                            <span>•</span>
                            <span className="font-extrabold text-slate-700">{modProgress}%</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </button>

                      {/* Module Lessons List */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 bg-white">
                          {module.lessons.map((lesson) => {
                            const isSelected = activeLessonId === lesson.id
                            const isCompleted = completedLessonIds.includes(lesson.id)

                            return (
                              <div
                                key={lesson.id}
                                onClick={() => handleSelectLesson(module.id, lesson.id)}
                                className={cn(
                                  "p-3 flex items-start gap-3 cursor-pointer transition-all hover:bg-slate-50 group border-l-4",
                                  isSelected 
                                    ? "bg-emerald-50/60 border-emerald-500 text-slate-900 font-bold" 
                                    : "border-transparent text-slate-600"
                                )}
                              >
                                {/* Status Icon */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleComplete(lesson.id)
                                  }}
                                  title={isCompleted ? "Marcar como não concluída" : "Marcar como concluída"}
                                  className="mt-0.5 flex-shrink-0 transition-transform active:scale-95"
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-100" />
                                  ) : isSelected ? (
                                    <PlayCircle className="w-4 h-4 text-amber-500 animate-pulse" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
                                  )}
                                </button>

                                <div className="flex-1 space-y-0.5 min-w-0">
                                  <p className={cn(
                                    "text-xs leading-snug line-clamp-2",
                                    isSelected ? "font-extrabold text-slate-900" : "font-medium text-slate-700"
                                  )}>
                                    {lesson.title}
                                  </p>
                                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                    <span>Página PDF: {lesson.pdf_page}</span>
                                    <span>{lesson.duration}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            {/* Support Callout Box in Sidebar */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                Dúvidas Operacionais?
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                Durante o atendimento, abra um chamado no SharkConsig informando a matrícula e o órgão do cliente.
              </p>
            </div>
          </div>

          {/* RIGHT MAIN VIEWER: Lesson Content Display */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-6">
            <Card className="border-slate-200/80 shadow-md rounded-2xl overflow-hidden bg-white">
              
              {/* Active Lesson Header */}
              <div className="p-6 bg-slate-900 text-white border-b border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800/80">
                    {currentModule.title}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">
                      Página no PDF: <strong className="text-white">{currentLesson.pdf_page}</strong>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-xs text-slate-400 font-medium">
                      Duração: <strong className="text-white">{currentLesson.duration}</strong>
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-black text-white leading-tight">
                    {currentLesson.title}
                  </h2>
                  <p className="text-slate-300 text-xs md:text-sm font-medium">
                    {currentLesson.subtitle}
                  </p>
                </div>
              </div>

              {/* PDF SUPPORT MATERIAL DOWNLOAD BANNER BOX (Fixed as required) */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-50 border-y border-amber-200/80 p-4 px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 block">
                      Material de Apoio da Aula
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      📄 Baixar [{currentModule.pdf_name}]
                    </p>
                  </div>
                </div>

                <a
                  href={currentModule.pdf_url}
                  download={currentModule.pdf_name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-nowrap"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Baixar PDF Oficial
                </a>
              </div>

              {/* Lesson Rich Content Body */}
              <CardContent className="p-6 md:p-8 space-y-6 text-slate-800">
                
                {/* Overview Card */}
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
                    <Target className="w-4 h-4 text-emerald-600" />
                    Visão Geral da Aula
                  </div>
                  <p className="text-xs md:text-sm text-slate-700 leading-relaxed font-medium">
                    {currentLesson.content.overview}
                  </p>
                </div>

                {/* Key Points */}
                {currentLesson.content.keyPoints && currentLesson.content.keyPoints.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Pontos-Chave de Aprendizado
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5">
                      {currentLesson.content.keyPoints.map((pt, i) => (
                        <div key={i} className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs md:text-sm font-semibold text-slate-800 flex items-start gap-3 shadow-2xs">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          <span className="leading-relaxed">{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Do and Don'ts Grid */}
                {currentLesson.content.doAndDonts && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* DO NOT */}
                    <div className="p-4 bg-red-50/60 rounded-2xl border border-red-200 space-y-3">
                      <span className="text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                        ❌ O que EVITAR na abordagem
                      </span>
                      <ul className="space-y-2">
                        {currentLesson.content.doAndDonts.dont.map((item, idx) => (
                          <li key={idx} className="text-xs text-red-900 font-medium flex items-start gap-2">
                            <span className="text-red-500 font-bold">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* DO */}
                    <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                        ✅ O que PREFERIR fazer
                      </span>
                      <ul className="space-y-2">
                        {currentLesson.content.doAndDonts.do.map((item, idx) => (
                          <li key={idx} className="text-xs text-emerald-900 font-medium flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">•</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Example Weak vs Strong Text */}
                {currentLesson.content.exampleText && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                      {currentLesson.content.exampleText.label}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-1">
                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                          Exemplo Fraco / Passivo
                        </span>
                        <p className="text-xs italic text-slate-700 font-medium">
                          {currentLesson.content.exampleText.weak}
                        </p>
                      </div>

                      <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-300 space-y-1">
                        <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
                          Exemplo Condutor / Recomendado
                        </span>
                        <p className="text-xs italic text-slate-900 font-bold">
                          {currentLesson.content.exampleText.strong}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table Data */}
                {currentLesson.content.tableData && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Tabela de Apoio e Comparativo
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-white">
                          <tr>
                            {currentLesson.content.tableData.headers.map((h, i) => (
                              <th key={i} className="p-3 font-extrabold uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {currentLesson.content.tableData.rows.map((row, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              {row.map((cell, j) => (
                                <td key={j} className="p-3 font-medium text-slate-700">{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Callout Box */}
                {currentLesson.content.callout && (
                  <div className={cn(
                    "p-4 rounded-2xl border space-y-1.5 shadow-2xs",
                    currentLesson.content.callout.type === "warning" && "bg-amber-50 border-amber-200 text-amber-950",
                    currentLesson.content.callout.type === "info" && "bg-blue-50 border-blue-200 text-blue-950",
                    currentLesson.content.callout.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-950"
                  )}>
                    <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                      <AlertCircle className="w-4 h-4" />
                      {currentLesson.content.callout.title}
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      {currentLesson.content.callout.text}
                    </p>
                  </div>
                )}

                {/* Checklist */}
                {currentLesson.content.checklist && currentLesson.content.checklist.length > 0 && (
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Checklist Prático do Parceiro
                    </h3>
                    <div className="space-y-2">
                      {currentLesson.content.checklist.map((item, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </CardContent>

              {/* Footer Navigation Bar */}
              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                
                {/* Previous Lesson Button */}
                <Button
                  type="button"
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => {
                    if (prevLesson) {
                      const parentMod = COURSE_DATA.find(m => m.lessons.some(l => l.id === prevLesson.id))
                      if (parentMod) handleSelectLesson(parentMod.id, prevLesson.id)
                    }
                  }}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Aula Anterior
                </Button>

                {/* Toggle Complete Button */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant={completedLessonIds.includes(currentLesson.id) ? "outline" : "default"}
                    onClick={() => handleToggleComplete(currentLesson.id)}
                    className={cn(
                      "font-extrabold text-xs gap-2 transition-all shadow-sm",
                      completedLessonIds.includes(currentLesson.id)
                        ? "border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    {completedLessonIds.includes(currentLesson.id) ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Concluída (Clique para desmarcar)
                      </>
                    ) : (
                      <>
                        <Circle className="w-4 h-4 text-slate-400" />
                        Marcar como Concluída
                      </>
                    )}
                  </Button>

                  {/* Next Lesson Button */}
                  <Button
                    type="button"
                    onClick={handleCompleteAndNext}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs gap-2 shadow-md"
                  >
                    Concluir e Próxima Aula
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>

              </div>

            </Card>
          </div>

        </div>
      </main>
    </div>
  )
}
