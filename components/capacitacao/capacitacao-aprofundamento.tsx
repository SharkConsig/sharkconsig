"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Check, 
  Copy, 
  CheckCheck, 
  BookOpen, 
  FileText, 
  Download, 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  Zap, 
  Target, 
  ArrowRight, 
  ArrowLeft,
  Search,
  ExternalLink,
  ShieldCheck,
  Award,
  Layers,
  MessageSquare
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface LessonItem {
  id: string
  number: string
  title: string
  subtitle: string
  pdf_page: number
  duration: string
  overview: string
  keyPoints?: string[]
  doAndDonts?: { do: string[]; dont: string[] }
  callout?: { type: "info" | "warning" | "success" | "tip"; title: string; text: string }
  tableData?: { headers: string[]; rows: string[][] }
  checklist?: string[]
  exampleText?: { label: string; weak: string; strong: string }
}

export interface ModuleSection {
  id: string
  number: number
  title: string
  subtitle: string
  badgeText: string
  badgeColor: string
  pdf_name: string
  pdf_url: string
  lessons: LessonItem[]
}

interface CapacitacaoAprofundamentoProps {
  completedLessonIds: string[]
  onToggleComplete: (lessonId: string) => void
  initialModuleId?: string
}

export function CapacitacaoAprofundamento({
  completedLessonIds,
  onToggleComplete,
  initialModuleId = "mod_1"
}: CapacitacaoAprofundamentoProps) {
  const [activeModuleId, setActiveModuleId] = useState<string>(initialModuleId)
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => {
      setCopiedText(null)
    }, 2500)
  }

  const toggleCard = (lessonId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [lessonId]: prev[lessonId] !== undefined ? !prev[lessonId] : false
    }))
  }

  const MODULES: ModuleSection[] = [
    {
      id: "mod_1",
      number: 1,
      title: "Módulo 01: Guia Inicial do Parceiro",
      subtitle: "Fundamentos, Abordagem e Postura Comercial",
      badgeText: "Fundamentos & Abordagem",
      badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
      pdf_name: "01 - GUIA INICIAL DO PARCEIRO.pdf",
      pdf_url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/01%20-%20GUIA%20INICIAL%20DO%20PARCEIRO.pdf",
      lessons: [
        {
          id: "lesson_1_1",
          number: "1.1",
          title: "O Papel do Parceiro e Leitura de Contexto",
          subtitle: "O que o cliente tem hoje vs. O que apresentar",
          pdf_page: 2,
          duration: "5 min",
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
        },
        {
          id: "lesson_1_2",
          number: "1.2",
          title: "Conhecendo a Persona e Interpretando a Primeira Resposta",
          subtitle: "Lidando com 'Não tenho interesse' sem perder a oportunidade",
          pdf_page: 3,
          duration: "6 min",
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
        },
        {
          id: "lesson_1_3",
          number: "1.3",
          title: "Postura e Comunicação: O que evitar e por onde começar",
          subtitle: "Termos que enfraquecem a mensagem e gatilhos de abertura",
          pdf_page: 4,
          duration: "7 min",
          overview: "Clareza não é explicar tudo de uma vez. Clareza é entregar a informação certa para o cliente continuar a conversa sem se sentir pressionado.",
          doAndDonts: {
            dont: [
              "Começar por Margem, Taxa, Parcela ou Tabela isolada",
              "Enviar simulação sem explicação do contexto",
              "Perguntar 'Tem interesse?' ou 'Quer fazer um empréstimo?'",
              "Mandar blocos gigantes de texto com excesso de detalhes técnicos",
              "Usar palavras como 'Acho', 'Talvez', 'Quem sabe', 'Pode ser', 'Acredito que dê'"
            ],
            do: [
              "Começar por o que mudou no órgão ou na secretaria do cliente",
              "Destacar o que foi identificado no perfil específico dele",
              "Apresentar a oportunidade e o impacto positivo que ela gera",
              "Fazer uma pergunta simples e natural que abra o diálogo",
              "Transmitir firmeza com proximidade e linguagem segura"
            ]
          },
          callout: {
            type: "warning",
            title: "Palavras que ENFRAQUECEM sua mensagem",
            text: "Evite usar: 'Acho', 'Talvez', 'Quem sabe', 'Pode ser', 'Acredito que dê', 'Provavelmente'. Transmita firmeza com proximidade!"
          }
        },
        {
          id: "lesson_1_4",
          number: "1.4",
          title: "Transformando Produtos em Benefícios",
          subtitle: "Como apresentar Margem, Quitação, Refin e Reorganização",
          pdf_page: 5,
          duration: "8 min",
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
        },
        {
          id: "lesson_1_5",
          number: "1.5",
          title: "Conduzindo a Conversa e Evitando Erros/Achismos",
          subtitle: "Sair do papel de passivo e direcionar o cliente ao próximo passo",
          pdf_page: 6,
          duration: "6 min",
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
        },
        {
          id: "lesson_1_6",
          number: "1.6",
          title: "Checklist do Parceiro: Autonomia e Apoio da Acerto Fácil",
          subtitle: "Saber quando agir sozinho e quando acionar o suporte operacional",
          pdf_page: 8,
          duration: "5 min",
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
      ]
    },
    {
      id: "mod_2",
      number: 2,
      title: "Módulo 02: Órgãos, Produtos e Oportunidades",
      subtitle: "Estratégias por Base de Dados e Perfis de Atuação",
      badgeText: "Produtos & Convênios",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      pdf_name: "02 - ORGAOS, PRODUTOS E OPORTUNIDADES.pdf",
      pdf_url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/02%20-%20ORGAOS,%20PRODUTOS%20E%20OPORTUNIDADES.pdf",
      lessons: [
        {
          id: "lesson_2_1",
          number: "2.1",
          title: "Como Usar o Guia e Comparativo Real de Taxas",
          subtitle: "Entendendo o contexto e a legenda de entrada nas bases",
          pdf_page: 2,
          duration: "6 min",
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
        },
        {
          id: "lesson_2_2",
          number: "2.2",
          title: "O Poder da Margem Complementar",
          subtitle: "Valor em conta, saque parcelado e oportunidade de amortização",
          pdf_page: 4,
          duration: "7 min",
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
        },
        {
          id: "lesson_2_3",
          number: "2.3",
          title: "Oportunidades Recomendadas para Iniciantes",
          subtitle: "Atuação no Governo do PI, PM Porto Velho e PM Santo André",
          pdf_page: 5,
          duration: "8 min",
          overview: "Essas três bases são classificadas como 'BOM PARA COMEÇAR' devido à alta receptividade e facilidade de fechamento.",
          tableData: {
            headers: ["Órgão / Convênio", "Perfil do Cliente", "Estratégia Recomendada"],
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
        },
        {
          id: "lesson_2_4",
          number: "2.4",
          title: "Oportunidades Nível Intermediário",
          subtitle: "São Paulo (Governo e Prefeitura) e SIAPE por Secretarias",
          pdf_page: 8,
          duration: "9 min",
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
        },
        {
          id: "lesson_2_5",
          number: "2.5",
          title: "Operações Especiais e Pontuais",
          subtitle: "Digio Refin, Quitação de Cartão e Compra de Dívida",
          pdf_page: 9,
          duration: "7 min",
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
      ]
    },
    {
      id: "mod_3",
      number: 3,
      title: "Módulo 03: Fluxo do Sistema e Operação na Prática",
      subtitle: "Uso Completo da Plataforma SharkConsig",
      badgeText: "Sistema & Operação",
      badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
      pdf_name: "03 - FLUXO DO SISTEMA E OPERACAO NA PRATICA.pdf",
      pdf_url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/03%20-%20SHARKCONSIG%20-%20TEMPORARIO.pdf",
      lessons: [
        {
          id: "lesson_3_1",
          number: "3.1",
          title: "Visão Geral: O Fluxo em 4 Movimentos",
          subtitle: "Da campanha ao acompanhamento e fechamento da proposta",
          pdf_page: 2,
          duration: "5 min",
          overview: "O sistema SharkConsig foi desenhado para organizar a operação em 4 passos sequenciais e lógicos.",
          keyPoints: [
            "01. ENTRAR E LOCALIZAR: Acesse o sistema, entre na campanha ou pesquise um cliente específico.",
            "02. LER O PERFIL: Confirme órgão, vínculo, margem principal, margem cartão e contratos existentes.",
            "03. SIMULAR OU PEDIR APOIO: Use o simulador para traduzir a proposta ou abra um chamado operacional.",
            "04. REGISTRAR E ACOMPANHAR: Tabule o atendimento, digite a proposta, anexe documentos e acompanhe até o pagamento."
          ]
        },
        {
          id: "lesson_3_2",
          number: "3.2",
          title: "Acesso, Campanhas e Leitura Completa do Cliente",
          subtitle: "Navegação na fila de contatos e leitura da ficha do servidor",
          pdf_page: 4,
          duration: "7 min",
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
        },
        {
          id: "lesson_3_3",
          number: "3.3",
          title: "Tabulação Obrigatória e Pesquisa de Clientes",
          subtitle: "Manutenção da base limpa e buscas rápidas por CPF",
          pdf_page: 6,
          duration: "6 min",
          overview: "A seleção da tabulação é obrigatória para liberar o botão 'Próximo Cliente' e manter a esteira da campanha organizada.",
          keyPoints: [
            "Status Obrigatórios: 'Cliente Chamado', 'Não Existe WhatsApp', 'WhatsApp Divergente', 'Sem Interesse', 'Em Negociação'.",
            "Pesquisa Global: Utilize o ícone de Lupa no menu lateral para buscar qualquer cliente localizado anteriormente por CPF ou Nome.",
            "Sair da Campanha: Sempre utilize o botão 'Sair da Campanha' antes de fechar a aba para não prender a ficha do cliente."
          ]
        },
        {
          id: "lesson_3_4",
          number: "3.4",
          title: "Simulação vs. Abertura de Chamados Operacionais",
          subtitle: "Qual botão escolher na ficha do cliente?",
          pdf_page: 9,
          duration: "6 min",
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
        },
        {
          id: "lesson_3_5",
          number: "3.5",
          title: "Digitação de Propostas, Anexo de Documentos e Pendências",
          subtitle: "As 3 escolhas obrigatórias e envio sem erros",
          pdf_page: 15,
          duration: "8 min",
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
        },
        {
          id: "lesson_3_6",
          number: "3.6",
          title: "Apresentando a Proposta Emitida ao Cliente",
          subtitle: "Condução do fechamento usando os layouts visuais gerados",
          pdf_page: 19,
          duration: "7 min",
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
      ]
    },
    {
      id: "mod_4",
      number: 4,
      title: "Módulo 04: Prospecção e Condução das Conversas",
      subtitle: "Mensagens práticas por etapa, órgão e oportunidade",
      badgeText: "Scripts & Fechamento",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      pdf_name: "04 - PROSPECCAO INICIAL.pdf",
      pdf_url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/04%20-%20PROSPECCAO%20INICIAL.pdf",
      lessons: [
        {
          id: "lesson_4_1",
          number: "4.1",
          title: "Como Usar o Guia, Mapa da Conversa e Regras de Linguagem",
          subtitle: "Objetivo, Princípio e Regras do que Evitar e Preferir",
          pdf_page: 1,
          duration: "6 min",
          overview: "Ajudar o parceiro a iniciar conversas com contexto, identificar a necessidade, apresentar a proposta e conduzir o próximo passo sem transformar o atendimento em um texto longo ou genérico.",
          keyPoints: [
            "1. Contextualizar: O que mudou ou foi identificado no vínculo do cliente.",
            "2. Gerar resposta: Pergunta simples e direta que abre o diálogo.",
            "3. Diagnosticar: Descobrir o que o cliente busca (maior valor, menor parcela, quitação).",
            "4. Apresentar: Destacar o principal ganho da nova condição.",
            "5. Conduzir: Deixar o próximo passo claro e objetivo."
          ],
          doAndDonts: {
            dont: [
              "Começar por margem, taxa, tabela ou parcela isolada",
              "Perguntar 'Tem interesse?' ou 'Quer empréstimo?'",
              "Usar termos inseguros como 'Acho', 'Talvez', 'Quem sabe', 'Provavelmente'",
              "Mandar texto longo no primeiro contato sem pergunta final",
              "Prometer aprovação ou valor sem validação",
              "Pressionar o cliente sem fundamento real"
            ],
            do: [
              "Começar pela mudança, condição ou ponto identificado no órgão",
              "Fazer pergunta ligada ao benefício ou problema do cliente",
              "Usar linguagem segura baseada no que foi confirmado no sistema",
              "Enviar uma informação principal acompanhada de uma pergunta",
              "Explicar que a condição depende de validação e enquadramento",
              "Informar prazo somente quando ele for real"
            ]
          },
          callout: {
            type: "info",
            title: "Princípio Central da Abordagem",
            text: "A primeira mensagem não precisa explicar tudo de uma vez. Ela precisa apenas dar um motivo legítimo para o cliente continuar a conversa."
          }
        },
        {
          id: "lesson_4_2",
          number: "4.2",
          title: "Mensagens Gerais de Abertura e Contorno Inicial",
          subtitle: "Scripts por contexto, dúvida inicial e receio de golpe",
          pdf_page: 2,
          duration: "7 min",
          overview: "Modelos práticos de mensagens iniciais para abertura de contato, além de respostas para 'Do que se trata?' e clientes com receio de golpes.",
          keyPoints: [
            "ATUALIZAÇÃO IDENTIFICADA (A): '[NOME], tudo bem? Atualizou no portal da Prefeitura a nova margem e vi que a sua matrícula teve sinalização positiva. Já viu o demonstrativo do antes e depois de como fica?'",
            "MENSAGEM INICIAL (B): '[NOME], tudo bem? Identifiquei uma atualização importante no seu vínculo da [ÓRGÃO] que mudou a condição disponível para você. Posso te mostrar o que apareceu?'",
            "CONTATO DO GESTOR: '[NOME], tudo bem? Aqui é [SEU NOME]. Atendo os teus colegas da [ÓRGÃO] e apareceu uma condição que vale comparar. Posso te explicar em dois pontos?'",
            "REORGANIZAÇÃO DA FOLHA: '[NOME], como você está? Andei acompanhando e identifiquei que alguns descontos da sua folha podem ser reduzidos agora e entregar valor sem aumentar a tua folha. Isso faz sentido para você analisar?'",
            "REFINANCIAMENTO: '[NOME], seu contrato apresentou uma possibilidade temporária de refinanciamento. Posso verificar quanto ele gera de novo valor e como ficaria a condição?'"
          ],
          exampleText: {
            label: "Quando o cliente pergunta 'Do que se trata?'",
            weak: "\"É sobre um empréstimo consignado no seu banco disponível agora.\"",
            strong: "\"É uma nova condição que abriu ligada à sua matrícula da [ÓRGÃO DO CLIENTE]. Primeiro verifico qual formato entrega mais vantagem no seu caso e depois te apresento o demonstrativo para você comparar com clareza.\""
          },
          callout: {
            type: "warning",
            title: "Quando o cliente demonstra receio de golpe (Segurança)",
            text: "\"Entendo a preocupação, até porque tem muito servidor caindo em golpe. Não preciso de senha, código ou pagamento antecipado. Posso te enviar nossos canais oficiais e a proposta completa com banco, valores e identificação para você validar antes de decidir qualquer coisa.\""
          }
        },
        {
          id: "lesson_4_3",
          number: "4.3",
          title: "Perguntas Diagnósticas e Apresentação da Proposta",
          subtitle: "Perguntas investigativas e estrutura ideal para apresentar simulações",
          pdf_page: 4,
          duration: "7 min",
          overview: "Como fazer as perguntas certas para descobrir o objetivo do cliente e como estruturar a apresentação da proposta sem ruídos.",
          tableData: {
            headers: ["Situação", "Pergunta Recomendada", "O que descobrir"],
            rows: [
              ["Nova liberação", "Hoje sua prioridade seria receber o maior valor possível?", "Objetivo principal"],
              ["Quitação", "Pelo que vi você não usa esse cartão. Faz sentido quitar e tirar esse desconto?", "Dor principal"],
              ["Contratos em folha", "Você prefere reduzir o que já paga ou manter a parcela e buscar mais valor?", "Estratégia desejada"],
              ["Prazo", "Você quer comparar o valor máximo com uma opção de prazo menor?", "Sensibilidade ao prazo"],
              ["Proposta concorrente", "Nessa outra proposta, qual é o valor líquido, a parcela e o prazo?", "Comparação equivalente"],
              ["Retomada", "O que faltou ficar claro para você avançar ou descartar essa condição?", "Objeção real"],
              ["Refinanciamento", "O novo valor seria útil agora ou sua prioridade é reduzir o contrato atual?", "Uso do refin"]
            ]
          },
          checklist: [
            "Relembre o contexto: o que foi identificado no sistema ou o que o cliente pediu",
            "Destaque um benefício principal: mais valor, menor desconto, quitação ou reorganização",
            "Mostre o antes e depois com clareza sempre que houver comparação",
            "Confirme se o cliente entendeu o ponto principal antes de enviar links",
            "Indique o próximo passo imediato: envio de documentos, validação ou digitação"
          ]
        },
        {
          id: "lesson_4_4",
          number: "4.4",
          title: "Scripts Específicos por Órgão e Oportunidade",
          subtitle: "Modelos para Governo do PI, P. Velho, SP, SIAPE, S. André e Digio",
          pdf_page: 5,
          duration: "10 min",
          overview: "Cada órgão possui particularidades. Use a abordagem temática correta para aumentar a conversão do atendimento.",
          keyPoints: [
            "GOVERNO DO PIAUÍ (Margem Complementar): Foco em transformar a margem complementar em valor na conta corrente em vez de vender apenas o cartão físico.",
            "PREFEITURA DE PORTO VELHO: Destaque para a alternativa complementar aos servidores que estavam sem margem principal (zerada ou negativa).",
            "PREFEITURA DE SÃO PAULO: Três perfis (Clientes que voltaram a ter margem positiva com valores altos; Quitação de cartão caro; Apenas margem complementar).",
            "GOVERNO DO ESTADO DE SP: Raciocínio similar ao da prefeitura, adaptando para reorganização da folha ou substituição de linha cara.",
            "SIAPE (Celetistas e Secretarias): Foco em atualizações recentes da secretaria, redução de parcela com valor em conta ou margem intermediária/alta com extrato de consignações.",
            "PREFEITURA DE SANTO ANDRÉ & DIGIO REFIN: Modalidade nova para Santo André com constância e resgate prioritário de valores em contratos Digio existentes."
          ],
          callout: {
            type: "warning",
            title: "Cuidados Específicos por Órgão",
            text: "Piauí: Não afirme liberação de 100% sem confirmar o banco | Porto Velho: Não diga que todos são elegíveis | SP: Não informe economia antes de validar o cálculo | SIAPE: Não generalize condições entre secretarias diferentes | Digio: Não trate como produção mensal garantida."
          }
        },
        {
          id: "lesson_4_5",
          number: "4.5",
          title: "Contorno de Objeções Frequentes e Respostas Curtas",
          subtitle: "Como responder 'Taxa alta', 'Prazo longo', 'Não quero cartão' e 'Já recebi outra proposta'",
          pdf_page: 15,
          duration: "8 min",
          overview: "Matriz rápida de contorno das 10 objeções mais comuns enfrentadas no dia a dia da prospecção.",
          tableData: {
            headers: ["Objeção do Cliente", "Resposta Sugerida"],
            rows: [
              ["\"Não tenho interesse.\"", "Sem problema. Para eu registrar corretamente: hoje não faz sentido por não precisar de valor ou porque a condição ainda não ficou boa?"],
              ["\"A taxa está alta.\"", "Faz sentido comparar. Vamos colocar lado a lado taxa, valor líquido, parcela e prazo, porque taxas de linhas diferentes não entregam a mesma condição."],
              ["\"O prazo é muito longo.\"", "Podemos comparar o valor máximo no prazo padrão com uma opção menor. A decisão depende de quanto você quer receber e do impacto da parcela."],
              ["\"Não quero cartão.\"", "Exatamente por isso que eu tenho uma opção sem ligação alguma com cartão. Eu te explico o formato antes de qualquer decisão."],
              ["\"Já recebi outra proposta.\"", "Ótimo, assim conseguimos comparar de forma objetiva. Me diga valor líquido, parcela, prazo e o banco, para verificarmos se são condições realmente melhores."],
              ["\"Vou esperar o fim do mês.\"", "Tudo bem. Vou encerrar a análise por agora para não tomar seu tempo. Quando fizer sentido comparar uma condição completa, me chama. Só lembre que a proposta tem validade dentro do banco."],
              ["\"Manda tudo por mensagem.\"", "Envio sim. Vou destacar primeiro o ponto principal e depois deixo banco, valor, parcela e prazo para você consultar com calma."],
              ["\"Não tenho margem.\"", "A margem principal pode estar comprometida, mas agora você possui condição complementar. Vou mostrar como fica no seu caso."],
              ["\"Tenho medo de fraude.\"", "Você está certo em validar. Não pedimos senha, código ou pagamento antecipado. Envio nossos canais oficiais e a proposta identificada para conferência."],
              ["\"Vou pensar.\"", "Claro. Qual ponto você precisa avaliar melhor: segurança, valor, parcela, prazo ou comparação com outra proposta?"]
            ]
          }
        },
        {
          id: "lesson_4_6",
          number: "4.6",
          title: "Retomadas, Encerramentos e Checklist Final",
          subtitle: "Scripts para acompanhamento sem resposta, pós-proposta e protocolo de envio",
          pdf_page: 16,
          duration: "6 min",
          overview: "Como retomar clientes silenciosos de forma elegante, encerrar com posicionamento e validar mensagens antes do envio.",
          keyPoints: [
            "RETOMADA SEM RESPOSTA 1: '[NOME], consegui concluir a leitura do seu caso. Existe um ponto muito importante que muda [VALOR/PARCELA/CONDIÇÃO]. Posso te enviar o resumo em uma mensagem?'",
            "RETOMADA SEM RESPOSTA 2: '[NOME], vou encerrar sua análise por agora para não insistir sem necessidade. Antes disso, quer que eu te envie somente a exceção que consegui para tua matrícula?'",
            "RETOMADA APÓS PROPOSTA: '[NOME], olhando a proposta, qual ponto ainda precisa ficar mais claro para você: valor, parcela, prazo ou segurança da operação?'",
            "ENCERRAMENTO COM POSICIONAMENTO: 'Vou encerrar por aqui para não tomar seu tempo. Caso queira voltar a comparar uma proposta completa e validada, fico à disposição para revisar as condições disponíveis naquele momento.'",
            "CLIENTE QUE PEDIU DATA: 'Combinado. Retomo no dia [DATA] com a condição atualizada, porque valor e tabela podem sofrer alteração até lá, mas farei o melhor para você.'"
          ],
          checklist: [
            "A mensagem corresponde ao órgão e ao perfil correto do cliente?",
            "A informação principal está confirmada no sistema ou pela operação?",
            "O texto possui uma pergunta simples e natural no final?",
            "Existe alguma promessa de aprovação, valor ou prazo sem ter sido validada?",
            "O próximo passo para o cliente avançar está explícito e claro?",
            "A interação foi devidamente registrada no sistema para futura retomada?"
          ],
          callout: {
            type: "success",
            title: "Mensagem de Fechamento",
            text: "Não existe mensagem perfeita para todos. Existe mensagem coerente com o contexto, enviada para o perfil certo e conduzida com segurança."
          }
        }
      ]
    }
  ]

  const currentModule = useMemo(() => {
    return MODULES.find(m => m.id === activeModuleId) || MODULES[0]
  }, [activeModuleId])

  const totalLessonsCount = useMemo(() => {
    return MODULES.reduce((acc, m) => acc + m.lessons.length, 0)
  }, [MODULES])

  const completedCount = completedLessonIds.length
  const progressPercent = Math.round((completedCount / totalLessonsCount) * 100) || 0

  // Filter lessons based on search
  const displayedLessons = useMemo(() => {
    if (!searchTerm.trim()) return currentModule.lessons
    const term = searchTerm.toLowerCase()
    return currentModule.lessons.filter(l => 
      l.title.toLowerCase().includes(term) ||
      l.subtitle.toLowerCase().includes(term) ||
      l.overview.toLowerCase().includes(term)
    )
  }, [currentModule, searchTerm])

  return (
    <div className="space-y-8">
      {/* Top Value Banner - Same Design as START Comercial */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#1C2643] rounded-2xl p-6 text-white shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            CAPACITAÇÃO — APROFUNDAMENTO TÉCNICO & COMERCIAL
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-semibold">
              Progresso: <strong className="text-emerald-400">{completedCount}/{totalLessonsCount} aulas ({progressPercent}%)</strong>
            </span>
          </div>
        </div>

        <div className="space-y-1.5 max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Biblioteca de Formação e Especialização
          </h2>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
            Conteúdo técnico e comercial organizado em módulos:{" "}
            <span className="text-emerald-400 font-bold">FUNDAMENTOS → PRODUTOS E ÓRGÃOS → FLUXO DO SISTEMA → SCRIPTS E FECHAMENTO</span>.
          </p>
        </div>

        {/* Sequential Module Selector Stepper */}
        <div className="pt-3 border-t border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {MODULES.map((mod, idx) => {
              const isActive = activeModuleId === mod.id
              const modCompleted = mod.lessons.filter(l => completedLessonIds.includes(l.id)).length
              const modTotal = mod.lessons.length
              const isMod100 = modCompleted === modTotal

              return (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => {
                    setActiveModuleId(mod.id)
                    setSearchTerm("")
                  }}
                  className={cn(
                    "p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1.5",
                    isActive
                      ? "bg-emerald-500/20 border-emerald-400 text-white shadow-md ring-1 ring-emerald-400/40"
                      : "bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-emerald-400">
                      Módulo 0{mod.number}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                      {isMod100 ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 inline" />
                      ) : null}
                      {modCompleted}/{modTotal} aulas
                    </span>
                  </div>
                  <p className="text-[11px] font-bold leading-tight line-clamp-1">
                    {mod.title.replace(/^Módulo \d+:\s*/, "")}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Active Module Header & PDF Material Box */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border inline-block", currentModule.badgeColor)}>
                {currentModule.badgeText}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {currentModule.lessons.length} aulas neste módulo
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-900">
              {currentModule.title}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 font-medium">
              {currentModule.subtitle}
            </p>
          </div>

          {/* Download PDF Material Button */}
          <a
            href={currentModule.pdf_url}
            download={currentModule.pdf_name}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-nowrap self-start md:self-center"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Baixar PDF do Módulo 0{currentModule.number}
          </a>
        </div>

        {/* Search within current module */}
        <div className="p-4 bg-slate-100/60 border-b border-slate-200 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={`Pesquisar aulas no Módulo 0${currentModule.number}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white text-slate-800 placeholder-slate-400 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 border border-slate-300 shadow-2xs"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Lesson Cards (Organized exactly like Start Comercial stages) */}
      <div className="space-y-6">
        {displayedLessons.map((lesson) => {
          const isCompleted = completedLessonIds.includes(lesson.id)
          const isExpanded = expandedCards[lesson.id] ?? true

          return (
            <Card 
              key={lesson.id} 
              id={lesson.id}
              className={cn(
                "rounded-2xl border transition-all overflow-hidden bg-white shadow-sm hover:shadow-md",
                isCompleted ? "border-emerald-200" : "border-slate-200"
              )}
            >
              {/* Lesson Card Header */}
              <div 
                onClick={() => toggleCard(lesson.id)}
                className="p-5 md:p-6 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer select-none"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded border inline-block",
                      currentModule.badgeColor
                    )}>
                      Aula {lesson.number}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      Página {lesson.pdf_page} • {lesson.duration}
                    </span>
                    {isCompleted && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Concluída
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg md:text-xl font-black text-slate-900">
                    {lesson.title}
                  </h3>

                  <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 align-middle" />
                    <strong className="text-slate-800 font-bold">Objetivo:</strong>{" "}
                    {lesson.overview}
                  </p>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <Button
                    type="button"
                    variant={isCompleted ? "outline" : "default"}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleComplete(lesson.id)
                    }}
                    className={cn(
                      "font-bold text-xs gap-1.5 shadow-2xs h-8 px-3 rounded-lg",
                      isCompleted 
                        ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" 
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Concluída
                      </>
                    ) : (
                      <>
                        <Circle className="w-3.5 h-3.5 text-slate-400" />
                        Marcar Concluída
                      </>
                    )}
                  </Button>

                  <div className="p-1 rounded-lg bg-slate-200/60 text-slate-600 hover:bg-slate-200">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Lesson Body Content */}
              {isExpanded && (
                <CardContent className="p-5 md:p-6 space-y-6 bg-white">
                  
                  {/* Key Points (Pontos Chave / O Que Fazer) */}
                  {lesson.keyPoints && lesson.keyPoints.length > 0 && (
                    <div className="space-y-3">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-600" />
                        Pontos-Chave & Regras de Aplicação
                      </span>
                      <div className="grid grid-cols-1 gap-2.5">
                        {lesson.keyPoints.map((pt, pIdx) => (
                          <div 
                            key={pIdx} 
                            className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs md:text-sm font-medium text-slate-800 flex items-start gap-2.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                            <span className="leading-relaxed">{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Do & Don'ts Grid */}
                  {lesson.doAndDonts && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* O que EVITAR */}
                      <div className="p-4 bg-red-50/60 rounded-xl border border-red-200 space-y-2.5">
                        <span className="text-xs font-black uppercase tracking-wider text-red-700 flex items-center gap-1.5">
                          ❌ O que EVITAR
                        </span>
                        <ul className="space-y-1.5">
                          {lesson.doAndDonts.dont.map((item, idx) => (
                            <li key={idx} className="text-xs text-red-900 font-medium flex items-start gap-2 leading-relaxed">
                              <span className="text-red-500 font-bold">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* O que PREFERIR */}
                      <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2.5">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                          ✅ O que PREFERIR
                        </span>
                        <ul className="space-y-1.5">
                          {lesson.doAndDonts.do.map((item, idx) => (
                            <li key={idx} className="text-xs text-emerald-900 font-medium flex items-start gap-2 leading-relaxed">
                              <span className="text-emerald-600 font-bold">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Example Weak vs Strong */}
                  {lesson.exampleText && (
                    <div className="space-y-3">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-emerald-600" />
                        {lesson.exampleText.label}
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-1">
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest block">
                            Exemplo Fraco / Passivo
                          </span>
                          <p className="text-xs italic text-slate-700 font-medium leading-relaxed">
                            {lesson.exampleText.weak}
                          </p>
                        </div>

                        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-300 space-y-1">
                          <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest block">
                            Exemplo Condutor / Recomendado
                          </span>
                          <p className="text-xs italic text-slate-900 font-bold leading-relaxed">
                            {lesson.exampleText.strong}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Table Data */}
                  {lesson.tableData && (
                    <div className="space-y-3">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600" />
                        Tabela Comparativa de Apoio
                      </span>
                      <div className="overflow-x-auto border border-slate-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-900 text-white">
                            <tr>
                              {lesson.tableData.headers.map((h, i) => (
                                <th key={i} className="p-3 font-extrabold uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {lesson.tableData.rows.map((row, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                {row.map((cell, j) => (
                                  <td key={j} className="p-3 font-medium text-slate-700 leading-relaxed">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Callout Box */}
                  {lesson.callout && (
                    <div className={cn(
                      "p-4 rounded-xl border space-y-1 shadow-2xs",
                      lesson.callout.type === "warning" && "bg-amber-50 border-amber-200 text-amber-950",
                      lesson.callout.type === "info" && "bg-blue-50 border-blue-200 text-blue-950",
                      lesson.callout.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-950"
                    )}>
                      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4" />
                        {lesson.callout.title}
                      </div>
                      <p className="text-xs font-medium leading-relaxed">
                        {lesson.callout.text}
                      </p>
                    </div>
                  )}

                  {/* Checklist */}
                  {lesson.checklist && lesson.checklist.length > 0 && (
                    <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2.5">
                      <span className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Checklist Prático
                      </span>
                      <div className="space-y-1.5">
                        {lesson.checklist.map((item, i) => (
                          <div key={i} className="flex items-center gap-2.5 text-xs text-slate-200 font-medium">
                            <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
