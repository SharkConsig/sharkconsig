"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/context/auth-context"
import { useSidebar } from "@/context/sidebar-context"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import {
  GraduationCap,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Calculator,
  Search,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
  RotateCcw,
  Save,
  MessageSquare,
  Award,
  BarChart3,
  BookmarkCheck,
  AlertCircle,
  Lightbulb,
  Check,
  X,
  Clock,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react"

// Types
interface DailyContent {
  dia: number
  titulo: string
  subtitulo?: string
  voceEstaAqui: string
  oQueVaiEntender: string
  conteudoPrincipal: {
    titulo: string
    paragrafos: string[]
  }[]
  vejaNaFerramenta?: {
    titulo: string
    imagens: (string | { url: string; legenda?: string })[]
  }
  vejaAcontecendo?: {
    tipo?: "dialogo" | "calculadora" | "comparativo" | "caso"
    texto?: string
    detalhes?: string
    calcMargem?: number
    calcCoef?: number
    calcPrazo?: number
    calcValor?: number
  }
  perguntaAberta: string
  decisao: {
    pergunta: string
    opcoes: string[]
    respostaCorreta: number
    explicacao: string
  }
  oQueLevar: string[]
  isAvaliacao?: boolean
  regra?: string
}

export interface QuestaoAvaliacao {
  numero: number
  titulo: string
  tipo: "aberta" | "escolha"
  pergunta: string
  opcoes?: string[]
  respostaCorreta?: number
  gabarito: string
  criterioEsperado: string
}

export const QUESTOES_AVALIACAO_1: QuestaoAvaliacao[] = [
  {
    numero: 1,
    titulo: "1. Conceito",
    tipo: "aberta",
    pergunta: "Em uma frase, o que significa margem consignável?",
    gabarito: "Gabarito / critério: ABERTA",
    criterioEsperado: "Esperado: capacidade de comprometimento/parcela dentro da regra da modalidade; não confundir com dinheiro liberado."
  },
  {
    numero: 2,
    titulo: "2. Margem x valor",
    tipo: "escolha",
    pergunta: "R$ 1.000 de margem significam necessariamente R$ 1.000 liberados?",
    opcoes: [
      "A) Sim",
      "B) Não, o valor depende da tabela/coeficiente e prazo",
      "C) Só na margem complementar",
      "D) Só no crédito novo"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "Margem é referência de parcela/capacidade, não de valor líquido."
  },
  {
    numero: 3,
    titulo: "3. Nomenclatura",
    tipo: "escolha",
    pergunta: "Qual associação está correta?",
    opcoes: [
      "A) Facultativa, principal e nova são três margens",
      "B) Complementar e cartão são duas margens",
      "C) Facultativa = nova/principal; complementar = margem vinculada ao cartão",
      "D) Todas são iguais"
    ],
    respostaCorreta: 2,
    gabarito: "Gabarito / critério: C",
    criterioEsperado: "É a nomenclatura definida para a operação."
  },
  {
    numero: 4,
    titulo: "4. Calculadora",
    tipo: "escolha",
    pergunta: "Quais são os três campos básicos usados no primeiro cálculo?",
    opcoes: [
      "A) Margem/parcela, coeficiente e prazo",
      "B) CPF, salário e banco",
      "C) Taxa, idade e valor líquido",
      "D) Órgão, sexo e prazo"
    ],
    respostaCorreta: 0,
    gabarito: "Gabarito / critério: A",
    criterioEsperado: "Esses são os campos apresentados na ferramenta."
  },
  {
    numero: 5,
    titulo: "5. Interpretação",
    tipo: "escolha",
    pergunta: "A mesma margem gerou dois valores liberados diferentes. Qual a explicação mais provável?",
    opcoes: [
      "A) O sistema errou",
      "B) Foram usados coeficientes/tabelas diferentes",
      "C) A margem mudou sozinha",
      "D) Isso só acontece em portabilidade"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "A tabela/coeficiente altera o valor gerado pela mesma parcela."
  },
  {
    numero: 6,
    titulo: "6. Crédito novo",
    tipo: "escolha",
    pergunta: "Crédito novo parte principalmente de:",
    opcoes: [
      "A) Contrato existente",
      "B) Margem facultativa disponível",
      "C) Portabilidade automática",
      "D) Quitação obrigatória"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "É a lógica trabalhada para nova contratação."
  },
  {
    numero: 7,
    titulo: "7. Refinanciamento",
    tipo: "escolha",
    pergunta: "Cliente tem três contratos. O que você pode afirmar?",
    opcoes: [
      "A) Os três refinanciam",
      "B) Nenhum refinancia",
      "C) Existem contratos que podem merecer análise, mas a condição precisa ser consultada",
      "D) Ele só pode usar margem complementar"
    ],
    respostaCorreta: 2,
    gabarito: "Gabarito / critério: C",
    criterioEsperado: "Contrato é informação, não garantia."
  },
  {
    numero: 8,
    titulo: "8. Portabilidade",
    tipo: "escolha",
    pergunta: "Antes de dizer que uma portabilidade é melhor, você deve:",
    opcoes: [
      "A) Atacar o banco atual",
      "B) Comparar as referências da condição atual e da alternativa",
      "C) Prometer dinheiro novo",
      "D) Ignorar o prazo"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "Portabilidade precisa de comparação real."
  },
  {
    numero: 9,
    titulo: "9. Margem complementar",
    tipo: "escolha",
    pergunta: "Qual posicionamento está correto?",
    opcoes: [
      "A) Esconder a modalidade definitivamente",
      "B) Começar com explicação técnica",
      "C) Usar margem complementar como linguagem comercial inicial e esclarecer a estrutura quando necessário/perguntado",
      "D) Dizer que complementar não tem relação com cartão"
    ],
    respostaCorreta: 2,
    gabarito: "Gabarito / critério: C",
    criterioEsperado: "A comunicação é progressiva, mas deve permanecer verdadeira."
  },
  {
    numero: 10,
    titulo: "10. Caso",
    tipo: "escolha",
    pergunta: "Cliente diz: 'Não tenho margem e já tenho empréstimos'. Qual a melhor leitura?",
    opcoes: [
      "A) Encerrar imediatamente",
      "B) Prometer refin",
      "C) Entender qual margem ele consultou e verificar os contratos antes de concluir",
      "D) Enviar comparativo de plano"
    ],
    respostaCorreta: 2,
    gabarito: "Gabarito / critério: C",
    criterioEsperado: "A resposta do cliente ainda precisa de interpretação."
  },
  {
    numero: 11,
    titulo: "11. Caso aberto",
    tipo: "aberta",
    pergunta: "Cliente possui margem facultativa e margem complementar. Escreva quais informações você buscaria antes de decidir o que apresentar.",
    gabarito: "Gabarito / critério: ABERTA",
    criterioEsperado: "Observar se o aluno fala de necessidade, parcela/objetivo, propostas existentes, cenário real e consulta, e não apenas de 'maior valor'."
  },
  {
    numero: 12,
    titulo: "12. Cálculo reflexivo",
    tipo: "aberta",
    pergunta: "Explique por que selecionar o coeficiente errado pode gerar um resultado matematicamente correto, mas comercialmente errado.",
    gabarito: "Gabarito / critério: ABERTA",
    criterioEsperado: "Esperado: ferramenta calcula o dado informado; coeficiente precisa corresponder à operação/tabela correta."
  }
]

export const QUESTOES_AVALIACAO_2: QuestaoAvaliacao[] = [
  {
    numero: 1,
    titulo: "1. Abertura",
    tipo: "escolha",
    pergunta: "Qual é o objetivo principal de uma primeira mensagem?",
    opcoes: [
      "A) Explicar um contexto novo para o cliente",
      "B) Gerar interação com contexto e motivo suficiente para continuar",
      "C) Enviar uma mensagem que evite a resposta \"sem interesse\" e gere interesse em fechamento",
      "D) Mostrar que não sou um golpista de crédito"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "A primeira mensagem abre conversa; não substitui toda a venda."
  },
  {
    numero: 2,
    titulo: "2. Segurança",
    tipo: "escolha",
    pergunta: "Cliente pergunta 'é golpe?'. Sua prioridade é:",
    opcoes: [
      "A) Falar com autoridade: 'confia em mim'",
      "B) Apresentar informações verificáveis antes de continuar vendendo",
      "C) Ignorar, e seguir com naturalidade",
      "D) Mostrar print de clients que fecharam com a empresa"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "Segurança é o bloqueio atual."
  },
  {
    numero: 3,
    titulo: "3. Perfil",
    tipo: "escolha",
    pergunta: "Cliente pede banco, taxa, prazo e contrato. O comportamento predominante é:",
    opcoes: [
      "A) Analítico",
      "B) Relacional",
      "C) Sem interesse",
      "D) Apressado"
    ],
    respostaCorreta: 0,
    gabarito: "Gabarito / critério: A",
    criterioEsperado: "Ele está buscando detalhe e estrutura."
  },
  {
    numero: 4,
    titulo: "4. Sondagem",
    tipo: "escolha",
    pergunta: "Cliente responde 'pode ver'. Qual é a melhor próxima ação?",
    opcoes: [
      "A) Mandar proposta imediatamente",
      "B) Fazer uma pergunta que descubra referência antes de calcular",
      "C) Fazer uma ligação para apresentar proposta",
      "D) Questionar se ele está negociando com alguém"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "Ainda falta direção."
  },
  {
    numero: 5,
    titulo: "5. Parcela",
    tipo: "escolha",
    pergunta: "Cliente diz 'a parcela ficou alta'. O que fazer?",
    opcoes: [
      "A) Explicar a vantagem da nossa taxa",
      "B) Perguntar qual faixa cabe",
      "C) Dizer que é a melhor do mercado",
      "D) Mandar plano"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "Transforma objeção em critério."
  },
  {
    numero: 6,
    titulo: "6. Valor",
    tipo: "escolha",
    pergunta: "Cliente diz 'o valor ficou baixo'. O que fazer?",
    opcoes: [
      "A) Argumentar para cliente aceitar",
      "B) Perguntar qual valor faria sentido e verificar se o cenário sustenta",
      "C) Conduzir com naturalidade para outro assunto",
      "D) Mostrar que valor não é baixo"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "Objetivo precisa virar dado."
  },
  {
    numero: 7,
    titulo: "7. Concorrente",
    tipo: "escolha",
    pergunta: "Cliente tem proposta do banco. O que fazer?",
    opcoes: [
      "A) Mostrar deficiências do banco que fez a proposta",
      "B) Comparar pelas mesmas referências",
      "C) Dizer que a Acerto é melhor",
      "D) Encerrar amistosamente"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "A comparação precisa ser demonstrável."
  },
  {
    numero: 8,
    titulo: "8. Silêncio",
    tipo: "escolha",
    pergunta: "Cliente visualizou e não respondeu. O que você sabe?",
    opcoes: [
      "A) Que não tem interesse",
      "B) Que está negociando com outro",
      "C) Que não deu atenção à mensagem",
      "D) Que já fez"
    ],
    respostaCorreta: 2,
    gabarito: "Gabarito / critério: C",
    criterioEsperado: "Silêncio não é diagnóstico."
  },
  {
    numero: 9,
    titulo: "9. Sinal de fechamento",
    tipo: "escolha",
    pergunta: "Qual frase pede avanço, não nova argumentação?",
    opcoes: [
      "A) 'Vou pensar'",
      "B) 'Do que precisa?'",
      "C) 'Quanto tempo cai na conta?'",
      "D) 'Qual taxa?'"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "O cliente está em formalização."
  },
  {
    numero: 10,
    titulo: "10. Limite técnico",
    tipo: "escolha",
    pergunta: "Surge dúvida específica sobre uma regra que você não domina. O que fazer?",
    opcoes: [
      "A) Improviso com naturalidade",
      "B) Consulto chamado operacional",
      "C) Prometo vou ajustando depois",
      "D) Digo que não sei e vou verificar"
    ],
    respostaCorreta: 1,
    gabarito: "Gabarito / critério: B",
    criterioEsperado: "Dúvida técnica não deve virar improviso."
  },
  {
    numero: 11,
    titulo: "11. Caso integrado",
    tipo: "aberta",
    pergunta: "Cliente diz: 'Não tenho margem, já tenho contratos e meu banco ofereceu outra coisa'. Em até seis linhas, descreva sua sequência inicial de raciocínio.",
    gabarito: "Gabarito / critério: ABERTA",
    criterioEsperado: "Observar: qual margem, contratos, referência concorrente, necessidade, consulta antes de promessa, escolha do que calcular."
  },
  {
    numero: 12,
    titulo: "12. Escrita comercial",
    tipo: "aberta",
    pergunta: "Escreva uma resposta curta para 'vou pensar', com o objetivo de descobrir o que o cliente quer analisar melhor sem pressionar.",
    gabarito: "Gabarito / critério: ABERTA",
    criterioEsperado: "Observar capacidade de diagnosticar sem confronto."
  },
  {
    numero: 13,
    titulo: "13. Follow-up",
    tipo: "aberta",
    pergunta: "Escreva um follow-up para um cliente que pediu retorno hoje após comparar a parcela.",
    gabarito: "Gabarito / critério: ABERTA",
    criterioEsperado: "Observar uso de contexto e respeito ao combinado."
  },
  {
    numero: 14,
    titulo: "14. Autoavaliação",
    tipo: "aberta",
    pergunta: "Qual parte deste módulo você ainda sente que precisaria revisar antes de atender sozinho? Explique por quê.",
    gabarito: "Gabarito / critério: ABERTA",
    criterioEsperado: "Resposta ajuda Supervisor/RH a comparar autopercepção com desempenho real."
  }
]

// Complete 22 Days Dataset from briefing
const DIAS_TREINAMENTO: DailyContent[] = [
  {
    dia: 1,
    titulo: "Onde você está entrando: crédito consignado e o papel da Acerto",
    voceEstaAqui: "Hoje é o ponto de partida. Você ainda não precisa saber calcular, argumentar ou reconhecer todas as operações. Primeiro precisa entender o ambiente em que vai trabalhar e quem participa dele.",
    oQueVaiEntender: "Ao terminar, você deve conseguir explicar com suas palavras o que torna o crédito consignado diferente de uma operação de crédito comum e qual é o papel de cada participante.",
    conteudoPrincipal: [
      {
        titulo: "Crédito Consignado, em Linguagem Simples",
        paragrafos: [
          "O crédito consignado é uma modalidade em que as parcelas são vinculadas ao pagamento do cliente e descontadas conforme as regras do seu vínculo. Para o profissional comercial, isso significa que a folha não é apenas um comprovante de renda: ela também ajuda a mostrar quais descontos já existem, que capacidade pode estar disponível e quais operações precisam ser investigadas.",
          "Você não precisa decorar legislação nem regras de todos os órgãos neste primeiro momento. O que precisa construir é um mapa mental: existe um cliente, existe um vínculo, existem regras para aquele vínculo, existem instituições financeiras com tabelas e condições, e existe uma operação que precisa fazer sentido para o cenário real daquele cliente."
        ]
      },
      {
        titulo: "Quem Participa",
        paragrafos: [
          "• CLIENTE / SERVIDOR: é a pessoa cuja remuneração e vínculo serão analisados.",
          "• ÓRGÃO / CONVÊNIO: é o ambiente de vínculo do servidor. Regras e possibilidades podem variar de um público para outro.",
          "• INSTITUIÇÃO FINANCEIRA: é quem disponibiliza as condições da operação e formaliza o contrato bancário.",
          "• ACERTO FÁCIL: atua na leitura do cenário, comparação, orientação comercial, montagem das alternativas permitidas e acompanhamento do processo. O profissional da Acerto não precisa fingir ser o banco para gerar confiança. A confiança vem de clareza, processo e domínio."
        ]
      },
      {
        titulo: "Primeira Regra de Raciocínio",
        paragrafos: [
          "No consignado, quase nunca é suficiente olhar uma informação isolada. Uma margem sem prazo não conta a história inteira. Uma taxa sem valor e duração também não. Um cliente com contratos não significa automaticamente uma oportunidade. O trabalho comercial começa quando você conecta informações suficientes para decidir o próximo passo correto."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Imagine que um servidor diga apenas: 'Tenho empréstimo em folha'. Isso ainda não informa se existe margem, refinanciamento, portabilidade ou qualquer outra oportunidade. A informação é útil, mas incompleta. O primeiro aprendizado é justamente este: informação não é conclusão."
    },
    perguntaAberta: "Explique em até três frases: o que é crédito consignado e qual é o papel da Acerto dentro dessa relação?",
    decisao: {
      pergunta: "Um cliente diz: 'Vocês são o banco?' Qual resposta demonstra melhor entendimento do seu papel?",
      opcoes: [
        "A) Sim. Para facilitar, diga que somos o banco responsável pela operação.",
        "B) Não. Somos a Acerto e conduzimos a análise e o atendimento dentro das operações disponíveis, atuamos com todos os bancos, exceto cooperativas.",
        "C) Não importa quem somos; basta falar da taxa.",
        "D) Diga apenas que somos do consignado."
      ],
      respostaCorreta: 1,
      explicacao: "O profissional precisa saber explicar seu papel sem criar uma identidade que não existe. Segurança comercial não depende de parecer banco."
    },
    oQueLevar: [
      "Consignado é crédito vinculado à folha/pagamento dentro das regras do vínculo.",
      "Cliente, órgão/convênio, instituição e Acerto ocupam papéis diferentes.",
      "Uma informação isolada ainda não é uma oportunidade.",
      "O objetivo inicial é entender o cenário antes de concluir."
    ]
  },
  {
    dia: 2,
    titulo: "O servidor público: dores, atenção e segurança",
    voceEstaAqui: "Ontem você construiu o mapa básico do consignado. Agora vamos olhar para a pessoa que está do outro lado. O mesmo produto pode gerar reações completamente diferentes dependendo de como o servidor percebe a abordagem.",
    oQueVaiEntender: "Ao terminar, você deve conseguir identificar por que um servidor pode ignorar uma boa oportunidade e quais elementos aumentam ou diminuem a confiança na conversa.",
    conteudoPrincipal: [
      {
        titulo: "Um Público que Já Recebe Muitas Ofertas",
        paragrafos: [
          "O servidor público costuma estar exposto a abordagens recorrentes de bancos e correspondentes. Isso cria um paradoxo: ele conhece o assunto, mas pode estar cansado dele. Uma mensagem pode ser tecnicamente correta e ainda assim ser ignorada porque parece igual a todas as outras.",
          "Por isso, atenção não nasce apenas de 'oferecer crédito'. Ela nasce quando o cliente percebe contexto e relevância: algo mudou, existe algo para comparar, há uma possibilidade que toca uma necessidade ou uma condição atual."
        ]
      },
      {
        titulo: "Dores que Podem Existir",
        paragrafos: [
          "Nem todo servidor procura dinheiro novo. Alguns querem aliviar a folha. Outros querem terminar uma operação antes. Outros querem comparar o que receberam do banco. Outros estão apenas inseguros porque não entendem os próprios descontos.",
          "Para o comercial, isso muda tudo. Se você presume que todo cliente quer 'pegar dinheiro', reduz o atendimento a uma única motivação e perde a chance de entender o que realmente move aquela pessoa."
        ]
      },
      {
        titulo: "O que Gera Insegurança e o que Chama Atenção",
        paragrafos: [
          "O servidor pode pensar: 'É golpe?', 'Como conseguiram meu contato?', 'Vocês são o banco?', 'Isso vai aumentar meu desconto?', 'Vão pedir senha?', 'O contrato vai mostrar outra coisa?'. A resposta comercial não deve ser 'confia em mim'. Confiança se constrói com processo, informação verificável, postura e ausência de promessa vazia.",
          "Condições diferentes, possibilidade de comparar, duração menor, impacto mensal diferente, valor disponível quando há necessidade e alguma mudança relevante no vínculo podem chamar atenção. Mas atenção significa abrir espaço para descobrir se existe interesse real naquele benefício."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Compare duas mensagens mentais: 'Tem interesse em empréstimo?' versus 'Quero conferir se a condição que apareceu para servidores do seu vínculo muda alguma coisa em relação ao que você já tem'. A segunda não garante venda, mas cria contexto e reduz a sensação de abordagem genérica."
    },
    perguntaAberta: "Escreva três motivos pelos quais um servidor poderia ignorar uma mensagem mesmo existindo uma oportunidade real.",
    decisao: {
      pergunta: "Qual atitude mais ajuda a construir segurança com um servidor desconfiado?",
      opcoes: [
        "A) Garantir que não existe nenhum risco e pedir para confiar.",
        "B) Aumentar a urgência para ele decidir mais rápido.",
        "C) Usar canais e informações verificáveis e responder objetivamente ao que ele questionou.",
        "D) Evitar responder perguntas técnicas e voltar ao valor liberado."
      ],
      respostaCorreta: 2,
      explicacao: "Segurança vem de clareza e prova, não de pressão ou promessa."
    },
    oQueLevar: [
      "O servidor pode estar saturado de ofertas.",
      "Necessidade não é sinônimo de dinheiro novo.",
      "Medo de golpe e falta de clareza travam conversas.",
      "Relevância + segurança + contexto aumentam a chance de interação."
    ]
  },
  {
    dia: 3,
    titulo: "Folha, margem e capacidade de contratação",
    voceEstaAqui: "Você já sabe onde está trabalhando e por que o servidor pode reagir com resistência. Hoje vamos entrar no primeiro conceito técnico indispensável: margem.",
    oQueVaiEntender: "Ao terminar, você precisa conseguir diferenciar margem de dinheiro liberado e entender por que 'não tenho margem' ainda é uma informação que precisa ser interpretada.",
    conteudoPrincipal: [
      {
        titulo: "O que é Margem",
        paragrafos: [
          "Margem consignável é a capacidade de comprometimento da remuneração do cliente com determinadas operações, dentro das regras aplicáveis ao vínculo e à modalidade. Na prática comercial, ela funciona como referência de parcela possível para aquela estrutura.",
          "A frase mais importante de hoje é: MARGEM NÃO É DINHEIRO. Se a tela mostra R$ 1.000 de margem, isso não significa que o cliente receberá R$ 1.000. Significa que existe uma capacidade de parcela de R$ 1.000 naquela referência."
        ]
      },
      {
        titulo: "Por que o Valor Liberado é Diferente",
        paragrafos: [
          "O valor que uma margem consegue gerar depende das condições da tabela utilizada. O sistema vai transformar margem/parcela em valor a partir do coeficiente e do prazo informados. Por isso, a mesma margem pode gerar valores diferentes em operações diferentes."
        ]
      },
      {
        titulo: "Margem Disponível e Margem Utilizada",
        paragrafos: [
          "Quando parte da capacidade já está ocupada por descontos da mesma modalidade, ela pode aparecer como utilizada. Quando ainda existe espaço dentro daquela regra, existe margem disponível. Você não precisa aprender todos os detalhes de todos os convênios hoje; precisa aprender a olhar a informação sem confundir capacidade de parcela com dinheiro."
        ]
      },
      {
        titulo: "'Não Tenho Margem' Não Encerra Automaticamente a Análise",
        paragrafos: [
          "Quando um cliente fala 'não tenho margem', ele está trazendo a percepção dele sobre uma consulta ou sobre a folha. O profissional não deve discutir. Deve entender qual margem foi consultada, quais contratos existem e se há outra estrutura que mereça verificação. Às vezes realmente não haverá oportunidade. O ponto é não concluir antes de olhar."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Se uma tela mostra R$ 1.000 de margem e outra operação usa uma tabela diferente, o valor liberado pode mudar mesmo mantendo os mesmos R$ 1.000 de parcela. É por isso que margem e valor liberado são conceitos diferentes."
    },
    perguntaAberta: "Explique com suas palavras por que R$ 1.000 de margem não significa R$ 1.000 disponíveis para o cliente.",
    decisao: {
      pergunta: "O cliente diz: 'Tenho R$ 800 de margem'. O que você pode afirmar imediatamente?",
      opcoes: [
        "A) Ele receberá R$ 800.",
        "B) Ele está aprovado para qualquer operação.",
        "C) Existe uma referência de capacidade de parcela de R$ 800, mas o valor e a operação dependem da tabela e da análise.",
        "D) Ele só pode fazer margem complementar."
      ],
      respostaCorreta: 2,
      explicacao: "A margem é ponto de partida do cálculo, não resultado final nem aprovação."
    },
    oQueLevar: [
      "Margem é capacidade de comprometimento/parcela.",
      "Margem não é valor liberado.",
      "Tabela, coeficiente e prazo transformam margem em cenário.",
      "'Sem margem' precisa ser interpretado antes de encerrar."
    ]
  },
  {
    dia: 4,
    titulo: "Margem facultativa e margem complementar",
    voceEstaAqui: "Ontem você aprendeu o conceito de margem. Hoje vamos organizar as duas nomenclaturas que você encontrará com mais frequência na operação, sem criar categorias que não existem.",
    oQueVaiEntender: "Ao terminar, você deve conseguir reconhecer margem facultativa e margem complementar e explicar internamente como cada uma entra na análise.",
    conteudoPrincipal: [
      {
        titulo: "Margem Facultativa",
        paragrafos: [
          "Neste treinamento, margem facultativa, margem nova e margem principal serão tratadas como a mesma referência operacional. É a margem utilizada para uma nova operação de empréstimo dentro da regra vigente para aquele vínculo.",
          "Quando alguém da equipe falar 'margem nova' ou 'margem principal', você precisa conectar mentalmente ao mesmo conceito: margem facultativa."
        ]
      },
      {
        titulo: "Margem Complementar",
        paragrafos: [
          "Margem complementar é a nomenclatura comercial utilizada para a margem vinculada à modalidade de cartão. Não existem aqui 'margem de cartão' e 'margem complementar' como duas coisas separadas. É a mesma margem, observada e posicionada pela operação como uma capacidade complementar."
        ]
      },
      {
        titulo: "Entender Internamente x Comunicar Externamente",
        paragrafos: [
          "O profissional precisa conhecer a estrutura para não vender algo que não entende. Mas conhecer não significa abrir a conversa despejando toda a taxonomia do produto. O contato comercial pode começar por ‘margem complementar’, porque o objetivo inicial é gerar entendimento da oportunidade e do benefício.",
          "Isso não autoriza informação enganosa. Se o cliente perguntar a natureza da operação, ou quando essa informação for necessária para a decisão e formalização, a explicação deve ser feita de forma simples e correta. A metodologia é comunicação em camadas, não ocultação."
        ]
      },
      {
        titulo: "Uma Margem Não Substitui Automaticamente a Outra",
        paragrafos: [
          "Estar sem margem facultativa não significa automaticamente existir margem complementar; e existir margem complementar não significa que toda operação estará disponível. Cada cenário precisa de consulta. O raciocínio correto é: ‘o que a tela mostra e o que essa operação permite?’"
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente: 'Já usei toda minha margem de empréstimo'. O profissional não responde 'então acabou' nem 'com certeza tem complementar'. Ele olha a consulta e verifica se existe capacidade complementar e se a operação está disponível para aquele vínculo."
    },
    perguntaAberta: "Em duas frases, diferencie margem facultativa e margem complementar usando a nomenclatura da Acerto.",
    decisao: {
      pergunta: "Qual frase está correta para o treinamento?",
      opcoes: [
        "A) Margem principal, margem nova e margem facultativa são três margens diferentes.",
        "B) Margem complementar e margem de cartão são duas margens diferentes.",
        "C) Margem facultativa também pode ser chamada internamente de margem nova/principal; margem complementar corresponde à margem vinculada ao cartão.",
        "D) Margem complementar só deve ser explicada como cartão desde a primeira palavra da abordagem."
      ],
      respostaCorreta: 2,
      explicacao: "Facultativa = nova = principal. Complementar = margem vinculada ao cartão."
    },
    oQueLevar: [
      "Facultativa = nova = principal.",
      "Complementar = margem vinculada ao cartão.",
      "O profissional entende a estrutura inteira; a comunicação com o cliente é progressiva.",
      "Nunca prometa existência de margem sem consultar."
    ]
  },
  {
    dia: 5,
    titulo: "Calculadora I: da margem ao valor liberado",
    voceEstaAqui: "Até aqui você já sabe o que é consignado, quem participa, por que o servidor reage de formas diferentes, o que é margem e quais são as duas referências principais usadas pela Acerto. Hoje vamos transformar isso em cálculo.",
    oQueVaiEntender: "Ao terminar, você deve conseguir preencher margem/parcela, coeficiente e prazo da tabela, interpretar o valor liberado e entender por que a mesma margem pode gerar valores diferentes.",
    conteudoPrincipal: [
      {
        titulo: "Os Três Campos de Entrada",
        paragrafos: [
          "A calculadora começa por três informações: PARCELA / MARGEM, COEFICIENTE e PRAZO DA TABELA.",
          "• PARCELA / MARGEM é a capacidade que queremos transformar em um cenário.",
          "• COEFICIENTE é a referência da tabela selecionada para converter aquela parcela em valor liberado.",
          "• PRAZO é a duração da tabela bancária usada naquele cálculo."
        ]
      },
      {
        titulo: "O Resultado Não Nasce da Margem Sozinha",
        paragrafos: [
          "Quando você preenche os campos, o sistema calcula e apresenta o valor liberado e outras referências da operação. Neste primeiro módulo, o foco não é dominar taxa implícita nem engenharia de comparação. Seu foco é entender a relação básica: mesma margem + coeficiente diferente = valor liberado diferente."
        ]
      },
      {
        titulo: "O Que Observar na Tela",
        paragrafos: [
          "Antes de pensar em ‘qual é melhor’, confirme se você colocou a margem correta, o coeficiente da operação correta e o prazo correto. Um erro de entrada gera um resultado coerente com o que você digitou, mas errado para o cliente. A ferramenta calcula; o profissional é responsável por escolher os dados certos."
        ]
      }
    ],
    vejaNaFerramenta: {
      titulo: "Veja na Ferramente",
      imagens: [
        {
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images%20TREINAMENTO/aula5_print1.png",
          legenda: "Referência 1 — cálculo com coeficiente de margem complementar."
        },
        {
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images%20TREINAMENTO/aula5_print2.png",
          legenda: "Referência 2 — mesma margem, coeficiente de contrato novo."
        }
      ]
    },
    vejaAcontecendo: {
      tipo: "caso",
      texto: "Nos prints de referência: Margem R$ 1.000 com coeficiente de margem complementar 0,04333 gera valor liberado de R$ 23.078,70. Em outro cenário, com coeficiente de contrato novo 0,02322, a mesma margem gera R$ 43.066,32. A diferença veio da tabela/coeficiente usada."
    },
    perguntaAberta: "Se você tivesse de explicar para um colega por que R$ 1.000 de margem gerou dois valores liberados diferentes, como explicaria?",
    decisao: {
      pergunta: "Você colocou R$ 1.000 de margem, mas selecionou o coeficiente de outra operação. O que deve fazer?",
      opcoes: [
        "A) Usar o resultado porque o sistema calculou.",
        "B) Corrigir a operação/tabela e recalcular antes de apresentar qualquer valor.",
        "C) Enviar os dois valores e deixar o cliente escolher.",
        "D) Escolher o maior valor."
      ],
      respostaCorreta: 1,
      explicacao: "A calculadora só interpreta os dados informados. Escolher a tabela correta faz parte do trabalho."
    },
    oQueLevar: [
      "Entrada básica: margem/parcela + coeficiente + prazo.",
      "A mesma margem pode gerar valores diferentes.",
      "Coeficiente e prazo precisam corresponder à operação real.",
      "Neste módulo, interprete o resultado básico; comparação avançada fica para depois."
    ]
  },
  {
    dia: 6,
    titulo: "Crédito novo: transformando margem facultativa em cenário",
    voceEstaAqui: "Ontem você usou a calculadora e viu que a mesma margem pode gerar valores diferentes. Hoje vamos colocar esse cálculo dentro de uma oportunidade específica: crédito novo utilizando margem facultativa.",
    oQueVaiEntender: "Ao terminar, você deve reconhecer quando a análise está partindo de margem facultativa e transformar essa margem em um cenário simples de crédito novo.",
    conteudoPrincipal: [
      {
        titulo: "O que Significa Crédito Novo",
        paragrafos: [
          "Crédito novo é uma nova contratação baseada em capacidade disponível para aquela operação. Dentro deste módulo, quando trabalharmos uma nova operação de empréstimo, a referência será a margem facultativa."
        ]
      },
      {
        titulo: "Do Dado Para o Cenário",
        paragrafos: [
          "Imagine que a consulta mostre R$ 1.000 de margem facultativa. Isso ainda não é uma proposta. Primeiro você seleciona a tabela/coeficiente correspondente ao contrato novo e o prazo adequado da tabela. Só então o sistema transforma aquela margem em valor liberado."
        ]
      },
      {
        titulo: "O Cliente Não Compra 'Margem'",
        paragrafos: [
          "O profissional pode pensar tecnicamente em margem, coeficiente e prazo. O cliente geralmente pensa em algo mais concreto: quanto recebe, quanto compromete, por quanto tempo e se isso atende ao que precisa.",
          "Por isso, o cálculo vem depois de uma pergunta importante: o que faria sentido para esse cliente? Se ele não precisa de valor, não faz sentido criar parcela só porque existe margem."
        ]
      },
      {
        titulo: "Primeira Noção de Escolha",
        paragrafos: [
          "Neste momento, não queremos ensinar o aluno a analisar todas as taxas do comparativo. Queremos ensinar uma disciplina: calcular a operação correta, confirmar o resultado e relacionar esse resultado à prioridade do cliente."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente diz: 'Tenho R$ 1.000 de margem, mas não quero comprometer tudo'. O cálculo não precisa usar os R$ 1.000 obrigatoriamente. Primeiro precisamos descobrir a faixa de parcela que ele aceita e então simular dentro desse limite."
    },
    perguntaAberta: "Escreva uma pergunta que você faria antes de usar toda a margem facultativa disponível de um cliente.",
    decisao: {
      pergunta: "Qual é a melhor sequência para um crédito novo?",
      opcoes: [
        "A) Ver margem → usar sempre 100% → enviar valor.",
        "B) Entender a necessidade → definir a parcela/margem que faz sentido → selecionar tabela correta → calcular → confirmar o cenário.",
        "C) Perguntar apenas a taxa desejada.",
        "D) Enviar todas as tabelas possíveis."
      ],
      respostaCorreta: 1,
      explicacao: "O cálculo deve responder ao cenário do cliente, não apenas à existência de margem."
    },
    oQueLevar: [
      "Crédito novo usa a margem facultativa dentro da operação adequada.",
      "Margem disponível não obriga uso total.",
      "Primeiro descubra o que o cliente precisa.",
      "Calcule com a tabela correta e apresente um cenário coerente."
    ]
  },
  {
    dia: 7,
    titulo: "Refinanciamento: oportunidade a partir de um contrato existente",
    voceEstaAqui: "Você já viu uma oportunidade que nasce de margem disponível. Agora vamos para uma lógica diferente: quando o cliente já possui um contrato em andamento.",
    oQueVaiEntender: "Ao terminar, você deve diferenciar crédito novo de refinanciamento e reconhecer quando um contrato existente merece ser analisado.",
    conteudoPrincipal: [
      {
        titulo: "De Onde Nasce o Refinanciamento",
        paragrafos: [
          "Quando o cliente já possui um contrato consignado, esse contrato tem saldo, parcelas pagas, parcelas futuras e uma situação atual. Dependendo da operação e da instituição, pode existir possibilidade de refinanciamento.",
          "Em linguagem simples: o refinanciamento parte de algo que já existe. Não começa de uma nova margem como o crédito novo."
        ]
      },
      {
        titulo: "O que o Profissional Precisa Enxergar",
        paragrafos: [
          "Quando um cliente diz ‘já tenho empréstimos’, isso não é apenas uma objeção. É também uma informação sobre a folha. O profissional treinado pensa: quais contratos? Há algum que possa ser analisado? Existe condição de refinanciamento disponível?"
        ]
      },
      {
        titulo: "O que Você Não Pode Concluir",
        paragrafos: [
          "Contrato existente não significa refinanciamento garantido. E refinanciamento não significa automaticamente valor novo interessante. É preciso consultar as condições reais. Não focaremos em realizar refinanciamento porque é juros sobre juros, mas é importante entender."
        ]
      },
      {
        titulo: "Como Falar Comercialmente",
        paragrafos: [
          "Você não precisa iniciar dizendo ‘vou refinanciar seu contrato’. Pode dizer que vai verificar se algum contrato atual permite uma condição diferente ou nova disponibilidade. Depois, com a análise validada, explica a estrutura necessária."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente: 'Não tenho margem e já tenho três empréstimos'. O iniciante pode encerrar. O profissional capacitado registra duas informações: ausência percebida de margem + existência de contratos. Isso cria uma pergunta de análise, não uma promessa."
    },
    perguntaAberta: "Explique em uma frase a principal diferença entre crédito novo e refinanciamento.",
    decisao: {
      pergunta: "O cliente possui quatro contratos. Qual é o próximo raciocínio correto?",
      opcoes: [
        "A) Prometer refinanciamento dos quatro.",
        "B) Ignorar os contratos porque ele não tem margem.",
        "C) Verificar se algum contrato está elegível a uma condição de refinanciamento e só então construir o cenário.",
        "D) Oferecer margem complementar sem olhar mais nada."
      ],
      respostaCorreta: 2,
      explicacao: "Refinanciamento depende de condição real do contrato e da operação."
    },
    oQueLevar: [
      "Crédito novo parte de margem disponível.",
      "Refinanciamento parte de contrato existente.",
      "Contrato existente é pista, não garantia.",
      "Consulte antes de afirmar valor, taxa, prazo ou disponibilidade."
    ]
  },
  {
    dia: 8,
    titulo: "Portabilidade: comparação e mudança de instituição",
    voceEstaAqui: "Você já conhece crédito novo e refinanciamento. Hoje vamos acrescentar uma terceira lógica: quando a oportunidade envolve uma dívida existente em uma instituição e uma possível condição em outra.",
    oQueVaiEntender: "Ao terminar, você deve entender o conceito de portabilidade em nível inicial e saber por que ela exige comparação antes de virar argumento.",
    conteudoPrincipal: [
      {
        titulo: "O que é Portabilidade",
        paragrafos: [
          "Portabilidade é a transferência de uma dívida de uma instituição para outra, dentro das regras aplicáveis. Ela existe porque um contrato atual pode ser comparado com uma condição disponível em outra instituição."
        ]
      },
      {
        titulo: "O Ponto Comercial Não é o Nome do Produto",
        paragrafos: [
          "Falar ‘tem portabilidade’ não responde à pergunta principal do cliente: ‘o que muda para mim?’. Antes de defender uma portabilidade, precisamos saber qual é a situação atual e qual ganho real existe na alternativa."
        ]
      },
      {
        titulo: "Portabilidade x Refinanciamento",
        paragrafos: [
          "Refinanciamento reorganiza um contrato existente dentro de uma nova estrutura de refinanciamento. Portabilidade envolve a mudança da dívida entre instituições. Em alguns fluxos comerciais podem existir estratégias relacionadas, mas você não precisa dominar combinações avançadas neste módulo."
        ]
      },
      {
        titulo: "Comparação Respeitosa",
        paragrafos: [
          "Se o cliente diz ‘faço tudo no meu banco’, não ataque o banco. Peça a referência que ele recebeu e compare elementos equivalentes. O valor da Acerto está em ajudar a enxergar a diferença real, não em dizer que o concorrente é ruim."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente recebeu uma condição do banco atual. Antes de dizer que a portabilidade é melhor, você precisa saber ao menos o que está comparando: valor, parcela, prazo e situação do contrato."
    },
    perguntaAberta: "Escreva duas informações que você pediria para comparar uma condição recebida pelo cliente com outra alternativa.",
    decisao: {
      pergunta: "Qual frase demonstra melhor postura?",
      opcoes: [
        "A) Seu banco está cobrando caro; fazemos melhor.",
        "B) Me passa os principais números que te apresentaram e eu comparo pela mesma referência.",
        "C) Portabilidade é sempre melhor.",
        "D) Se for outro banco, nem vale analisar."
      ],
      respostaCorreta: 1,
      explicacao: "Comparação precisa de referências equivalentes e postura objetiva."
    },
    oQueLevar: [
      "Portabilidade envolve mudança de instituição da dívida.",
      "Não venda o nome; descubra o ganho.",
      "Compare condições pela mesma referência.",
      "Não ataque o banco do cliente."
    ]
  },
  {
    dia: 9,
    titulo: "Margem complementar na prática: cálculo e posicionamento",
    voceEstaAqui: "Você já aprendeu o conceito de margem complementar. Hoje vai usar a ferramenta e também entender como posicionar a oportunidade sem transformar a primeira conversa em uma explicação técnica desnecessária.",
    oQueVaiEntender: "Ao terminar, você deve calcular um cenário simples de margem complementar, reconhecer a diferença para contrato novo e usar a nomenclatura comercial correta.",
    conteudoPrincipal: [
      {
        titulo: "A Lógica Interna",
        paragrafos: [
          "Margem complementar é a margem vinculada à modalidade de cartão. Internamente, você precisa saber disso. Comercialmente, começamos pela ideia de capacidade complementar porque ela descreve o papel daquela margem no cenário sem abrir a conversa com uma palavra que pode gerar resistência antes de existir entendimento."
        ]
      },
      {
        titulo: "Cálculo Básico",
        paragrafos: [
          "Na referência apresentada, R$ 1.000 de margem com coeficiente 0,04333 gera valor liberado de R$ 23.078,70. O sistema também mostra prazo e outras referências. Neste módulo, seu objetivo é conferir se está usando o coeficiente correto e interpretar o valor básico."
        ]
      },
      {
        titulo: "Comparar sem Aprofundar",
        paragrafos: [
          "A ferramenta possui botão ‘Comparar’. Na margem complementar, existem três prazos definidos para comparação. Você precisa reconhecer que há alternativas de duração, mas não precisa dominar agora toda a leitura de taxa, economia ou plano de amortização. Essa profundidade ficará para módulo posterior."
        ]
      },
      {
        titulo: "Como Posicionar",
        paragrafos: [
          "Se o cliente está sem margem facultativa e existe margem complementar, a conversa pode começar pela existência de uma capacidade complementar que merece análise. Depois, à medida que a conversa avança e quando for necessário para decisão/formalização, a estrutura vinculada à modalidade deve ser explicada com clareza."
        ]
      }
    ],
    vejaNaFerramenta: {
      titulo: "Veja na Ferramenta",
      imagens: [
        {
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images%20TREINAMENTO/aula9_print1.png",
          legenda: "Referência — cálculo de margem complementar."
        },
        {
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images%20TREINAMENTO/aula9_print2.png",
          legenda: "Referência — comparação de três prazos definidos para margem complementar."
        }
      ]
    },
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Você calculou margem complementar e obteve R$ 23.078,70. Isso não significa que deve mandar imediatamente esse valor. Primeiro confirme o contexto: o cliente precisa de valor? Qual faixa de parcela faz sentido? Ele já recebeu outra proposta? O cálculo é ferramenta para a conversa, não substituto da sondagem."
    },
    perguntaAberta: "Escreva uma forma curta de explicar internamente o que é margem complementar e uma forma de apresentá-la inicialmente ao cliente sem despejar tecnicismo.",
    decisao: {
      pergunta: "Qual conduta está alinhada à metodologia?",
      opcoes: [
        "A) Esconder definitivamente a modalidade para o cliente nunca descobrir.",
        "B) Começar toda conversa com uma explicação longa sobre cartão.",
        "C) Usar 'margem complementar' como posicionamento inicial, dominar internamente a estrutura e esclarecer a natureza da operação quando necessário ou perguntado.",
        "D) Tratar margem complementar e margem de cartão como duas margens diferentes."
      ],
      respostaCorreta: 2,
      explicacao: "A comunicação é progressiva e precisa permanecer correta."
    },
    oQueLevar: [
      "Margem complementar corresponde à margem vinculada ao cartão.",
      "O coeficiente precisa ser o da operação correta.",
      "Comparação existe, mas análise avançada fica para depois.",
      "O comercial começa pela oportunidade e aprofunda a explicação no momento certo."
    ]
  },
  {
    dia: 10,
    titulo: "Mapa de oportunidades: juntar informação antes de oferecer",
    voceEstaAqui: "Nos últimos dias você construiu o terreno técnico: margem, cálculo, crédito novo, refinanciamento, portabilidade e margem complementar. Hoje vamos juntar isso e impedir um dos maiores erros de quem está começando: escolher produto antes de entender o cenário.",
    oQueVaiEntender: "Ao terminar, você deve olhar um conjunto de informações e dizer o que merece investigação sem transformar hipótese em promessa.",
    conteudoPrincipal: [
      {
        titulo: "A Pergunta Muda",
        paragrafos: [
          "O iniciante pergunta: ‘Qual produto eu ofereço?’. O profissional começa a perguntar: ‘O que existe aqui e o que o cliente precisa?’. Essa mudança parece pequena, mas muda a qualidade da venda."
        ]
      },
      {
        titulo: "Quatro Fontes de Oportunidade",
        paragrafos: [
          "MARGEM FACULTATIVA DISPONÍVEL — pode abrir caminho para crédito novo.",
          "CONTRATO EXISTENTE — pode merecer análise de refinanciamento.",
          "DÍVIDA/CONDIÇÃO EM OUTRA INSTITUIÇÃO — pode abrir comparação e eventual portabilidade.",
          "MARGEM COMPLEMENTAR — pode existir como capacidade adicional quando disponível."
        ]
      },
      {
        titulo: "Quitação como Oportunidade",
        paragrafos: [
          "Às vezes o cenário não é simplesmente colocar dinheiro novo, mas substituir uma condição mais pesada por outra estrutura quando existe ganho real. Neste primeiro módulo, você não vai aprender engenharia completa de quitação. Vai aprender a reconhecer o sinal e encaminhar a análise."
        ]
      },
      {
        titulo: "Hipótese x Confirmação",
        paragrafos: [
          "‘Pode existir’ é diferente de ‘existe’. Você pode reconhecer pistas e ainda assim precisar consultar. O objetivo da capacitação não é criar excesso de confiança; é criar autonomia com limite."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "caso",
      texto: "CASO: Ana diz que não tem margem facultativa, possui dois contratos e recebeu uma proposta do banco. A consulta também mostra margem complementar disponível. Você tem quatro linhas de análise possíveis. A resposta não é escolher uma no chute. A resposta é descobrir o objetivo de Ana e verificar quais caminhos realmente entregam algo melhor."
    },
    perguntaAberta: "Liste, em ordem, as três primeiras coisas que você procuraria entender no caso de Ana antes de apresentar uma solução.",
    decisao: {
      pergunta: "Qual frase representa melhor o raciocínio aprendido até aqui?",
      opcoes: [
        "A) Encontrou margem = manda proposta.",
        "B) Encontrou contrato = promete refin.",
        "C) Reúne cenário + necessidade + condição disponível e então decide o que calcular/apresentar.",
        "D) Sempre prioriza a operação de maior valor."
      ],
      respostaCorreta: 2,
      explicacao: "A oportunidade nasce do encontro entre cenário real, necessidade e condição disponível."
    },
    oQueLevar: [
      "Não escolha produto antes do cenário.",
      "Margem, contratos e propostas concorrentes são pistas.",
      "Quitação avançada fica para depois; aqui reconhecemos a oportunidade.",
      "Hipótese comercial não deve virar promessa antes da consulta."
    ]
  },
  {
    dia: 11,
    titulo: "DIA 11 — AVALIAÇÃO 1",
    subtitulo: "Fundamentos, margens, cálculo básico e leitura inicial de oportunidades",
    voceEstaAqui: "Chegamos ao primeiro ponto de checagem. Durante a avaliação, responda com atenção e consolide os conceitos essenciais aprendidos até o momento.",
    oQueVaiEntender: "Validar domínio de margens, vocabulário operacional, fundamentos da calculadora e raciocínio de oportunidade.",
    isAvaliacao: true,
    regra: "Durante a avaliação, o aluno não deve acessar os conteúdos do módulo nem o Guia Rápido. As respostas abertas devem ser salvas integralmente para consulta do aluno, Supervisor Comercial e RH.",
    conteudoPrincipal: [],
    perguntaAberta: "",
    decisao: {
      pergunta: "",
      opcoes: [],
      respostaCorreta: 0,
      explicacao: ""
    },
    oQueLevar: [
      "Margem é capacidade de comprometimento, não valor líquido.",
      "Tabela e coeficiente convertem margem em valor.",
      "Comunicação inicial deve ser clara, respeitosa e sem falsas promessas."
    ]
  },
  {
    dia: 12,
    titulo: "Como o servidor decide: relevância, confiança e silêncio",
    voceEstaAqui: "Você passou pela primeira avaliação e já possui base técnica suficiente para não tratar toda conversa como uma oferta genérica. A partir de agora, vamos aprofundar a leitura comercial.",
    oQueVaiEntender: "Ao terminar, você deve entender por que um cliente pode ficar em silêncio, responder pouco ou demonstrar desconfiança mesmo quando existe uma condição interessante.",
    conteudoPrincipal: [
      {
        titulo: "Silêncio Não é Diagnóstico",
        paragrafos: [
          "Quando o cliente não responde, você ainda não sabe o motivo. Pode estar ocupado, saturado, desconfiado, sem prioridade, sem entender o benefício ou simplesmente não ter visto. O erro é transformar silêncio em uma história inventada."
        ]
      },
      {
        titulo: "O Que Move Uma Decisão",
        paragrafos: [
          "Uma pessoa tende a prestar mais atenção quando percebe relevância para o próprio cenário. Isso pode ser dinheiro, redução de impacto, comparação, segurança, duração, reorganização ou outra necessidade. A função da comunicação é descobrir qual dessas dimensões importa — não assumir que todos querem a mesma coisa."
        ]
      },
      {
        titulo: "Confiança Antes de Profundidade",
        paragrafos: [
          "Em contatos frios, confiança pode ser pré-requisito para qualquer conversa técnica. Se o cliente pergunta 'quem é você?', não faz sentido responder com cinco números. Primeiro resolva a insegurança."
        ]
      },
      {
        titulo: "Momento Também Importa",
        paragrafos: [
          "Um 'agora não' pode ser literalmente sobre momento. A pergunta comercial é: existe algo para retomar depois e qual contexto precisa ser registrado? Isso começa a transformar follow-up em processo, não insistência."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente visualizou sua mensagem e não respondeu. Você não tem dado suficiente para dizer 'não tem interesse'. Registre o estágio, espere a janela adequada e retome com contexto — não com uma sequência de 'oi, viu?'."
    },
    perguntaAberta: "Liste três explicações possíveis para o silêncio de um cliente e escreva o que você evitaria fazer em cada uma.",
    decisao: {
      pergunta: "O cliente pergunta 'de onde você conseguiu meu contato?'. Qual é a prioridade?",
      opcoes: [
        "A) Mudar de assunto.",
        "B) Responder objetivamente com segurança.",
        "C) Explicar sobre o crédito consignado.",
        "D) Dizer que cliente foi indicado."
      ],
      respostaCorreta: 1,
      explicacao: "A pergunta é de segurança. Antes de vender, resolva o ponto que bloqueia a conversa."
    },
    oQueLevar: [
      "Silêncio é ausência de informação, não diagnóstico.",
      "Relevância depende do cenário do cliente.",
      "Perguntas de segurança precisam ser resolvidas antes da venda.",
      "'Agora não' pode virar follow-up contextualizado."
    ]
  },
  {
    dia: 13,
    titulo: "Leitura de WhatsApp: sinais e perfis observáveis",
    voceEstaAqui: "Ontem você aprendeu a não interpretar silêncio automaticamente. Hoje vamos aprender a ler o que aparece quando o cliente responde.",
    oQueVaiEntender: "Ao terminar, você deve identificar sinais observáveis na conversa e adaptar ritmo, quantidade de informação e próximo passo sem rotular permanentemente o cliente.",
    conteudoPrincipal: [
      {
        titulo: "Leia Comportamento, Não Personalidade",
        paragrafos: [
          "Não precisamos diagnosticar pessoas. Precisamos observar como elas estão se comunicando agora. Um cliente pode ser objetivo em uma conversa e analítico em outra."
        ]
      },
      {
        titulo: "Cinco Comportamentos Úteis",
        paragrafos: [
          "OBJETIVO — mensagens curtas, pergunta 'quanto?', quer síntese.",
          "ANALÍTICO — pergunta banco, prazo, taxa, contrato, detalhes.",
          "DESCONFIADO — questiona origem do contato, segurança, formalização.",
          "RELACIONAL — responde melhor à proximidade, conversa antes de decidir.",
          "APRESSADO — quer saber documento, prazo de liberação e próximo passo."
        ]
      },
      {
        titulo: "O Mesmo Conteúdo, Ritmos Diferentes",
        paragrafos: [
          "Para o objetivo, entregue o essencial e faça uma pergunta. Para o analítico, organize informação e evite pular etapas. Para o desconfiado, prova e clareza vêm antes da oferta. Para o apressado, elimine fricção e deixe o próximo passo claro."
        ]
      },
      {
        titulo: "Sinais de Avanço",
        paragrafos: [
          "Perguntas como 'o que precisa mandar?', 'como assina?', 'quando cai?', 'pode seguir?' indicam movimento para formalização. Quando isso acontece, continuar vendendo demais pode criar nova dúvida."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Três clientes perguntam sobre a mesma proposta. Um diz 'quanto fica?'. Outro pede taxa, banco e prazo. Outro pergunta 'isso é seguro?'. A condição pode ser a mesma, mas a condução não precisa ter o mesmo tamanho nem a mesma ordem."
    },
    perguntaAberta: "Pegue um comportamento acima e escreva como você adaptaria sua resposta sem mudar a informação verdadeira.",
    decisao: {
      pergunta: "Cliente pergunta: 'Qual banco? Qual taxa? Quantas parcelas?'. Qual comportamento está mais evidente?",
      opcoes: [
        "A) Analítico",
        "B) Relacional",
        "C) Silencioso",
        "D) Sem interesse"
      ],
      respostaCorreta: 0,
      explicacao: "Ele está buscando estrutura e detalhe. A resposta deve organizar as informações e depois retomar a decisão."
    },
    oQueLevar: [
      "Perfil aqui é comportamento observado, não rótulo.",
      "Adapte ritmo e profundidade.",
      "Perguntas do cliente indicam o que ele precisa para avançar.",
      "Sinais de compra pedem ação, não mais argumentação."
    ]
  },
  {
    dia: 14,
    titulo: "Postura comercial: abrir conversa sem despejar tecnicismo",
    voceEstaAqui: "Você já sabe observar o comportamento. Hoje vai ligar isso à linguagem: como abrir uma conversa sem parecer anúncio, aula ou pressão.",
    oQueVaiEntender: "Ao terminar, você deve construir uma abordagem curta com contexto, vantagem legítima e pergunta simples.",
    conteudoPrincipal: [
      {
        titulo: "O Objetivo da Primeira Mensagem",
        paragrafos: [
          "A primeira mensagem não precisa vender toda a operação. Precisa gerar interação suficiente para você descobrir se existe algo para analisar."
        ]
      },
      {
        titulo: "Três Peças da Abertura",
        paragrafos: [
          "CONTEXTO — por que estou falando com você agora?",
          "VANTAGEM / MOTIVO — o que merece atenção sem transformar campanha em spam?",
          "PERGUNTA — uma pergunta fácil de responder que ajude a escolher o próximo passo."
        ]
      },
      {
        titulo: "O Que Enfraquece",
        paragrafos: [
          "'Tem interesse em empréstimo?' joga todo o esforço para o cliente e não traz contexto. Textos muito longos parecem disparo. Excesso de tecnicismo cria esforço antes de existir interesse. Promessa de número antes da consulta cria risco."
        ]
      },
      {
        titulo: "Postura Segura",
        paragrafos: [
          "Evite 'acho', 'talvez', 'deve dar' quando você deveria consultar. Também evite urgência inventada. Se existe validade real de campanha, ela pode ser comunicada. Se não existe, não fabrique pressão."
        ]
      },
      {
        titulo: "Comunicação em Camadas",
        paragrafos: [
          "Você conhece internamente margem complementar, refinanciamento e demais estruturas. Na primeira conversa, entregue apenas o que ajuda o cliente a entender por que vale responder. A profundidade cresce conforme a necessidade."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Exemplo de lógica: 'Estou revisando condições para os policiais de SP e abriu uma condição com taxa reduzida. Você recebeu proposta recentemente ou ainda não comparou?' A mensagem não promete valor e cria uma resposta útil."
    },
    perguntaAberta: "Escreva uma primeira mensagem com no máximo quatro blocos curtos contendo contexto, motivo e pergunta. Não use 'tem interesse em empréstimo?'.",
    decisao: {
      pergunta: "Qual abertura está mais alinhada?",
      opcoes: [
        "A) Oi. Você possui uma liberação disponível na sua margem, chegou a conferir?",
        "B) Oi, Carlos! Tudo bem por aí? O pessoal da PM está com uma nova condição de 1% no consignado. Recebeu alguma proposta?",
        "C) Boa tarde. Eu me chamo Ana Claudia da Acerto Fácil Promotora e identifiquei que você possui uma disponibilidade.",
        "D) 0.96 em 24 meses até amanhã. Posso simular para você?"
      ],
      respostaCorreta: 1,
      explicacao: "Ela cria contexto sem detalhar condição individual antes da consulta."
    },
    oQueLevar: [
      "Primeira mensagem serve para gerar interação.",
      "Contexto + motivo + pergunta.",
      "Evite textão, promessa e urgência falsa.",
      "Profundidade técnica entra conforme a conversa avança."
    ]
  },
  {
    dia: 15,
    titulo: "Sondagem: descobrir a prioridade antes de calcular",
    voceEstaAqui: "Você aprendeu a abrir a conversa. Hoje vamos trabalhar a transição entre 'o cliente respondeu' e 'eu sei o que calcular'.",
    oQueVaiEntender: "Ao terminar, você deve fazer perguntas em sequência, usando cada resposta para descobrir a prioridade do cliente.",
    conteudoPrincipal: [
      {
        titulo: "Sondagem Não é Questionário",
        paragrafos: [
          "Fazer seis perguntas de uma vez aumenta esforço e reduz naturalidade. Faça uma pergunta, use a resposta e só então faça a próxima."
        ]
      },
      {
        titulo: "O Que Você Está Tentando Descobrir",
        paragrafos: [
          "O cliente prioriza valor na mão? Parcela menor? Prazo menor? Segurança? Comparação com outra proposta? Resolver uma condição atual? Isso muda o cálculo e a apresentação."
        ]
      },
      {
        titulo: "Perguntas Que Criam Direção",
        paragrafos: [
          "'Você recebeu proposta recentemente?' ajuda a saber se existe referência concorrente.",
          "'Hoje faria mais sentido priorizar valor ou uma estrutura que termine antes?' ajuda a escolher direção.",
          "'Qual faixa de parcela cabe com tranquilidade?' transforma 'parcela alta' em dado de recálculo.",
          "'Qual valor faria a operação valer a pena?' transforma 'valor baixo' em referência."
        ]
      },
      {
        titulo: "Quando Parar de Sondar",
        paragrafos: [
          "Se o cliente já mostrou claramente o objetivo e existe informação suficiente para calcular, continue o processo. Sondagem demais também pode cansar."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente: 'Ainda não recebi proposta. Só não quero uma parcela pesada'. Você já ganhou uma direção: parcela é restrição importante. O cálculo precisa respeitar isso."
    },
    perguntaAberta: "Escreva uma sequência de três perguntas para um cliente que respondeu 'pode ver', sem colocar todas na mesma mensagem.",
    decisao: {
      pergunta: "Cliente diz: 'O valor ficou baixo'. Qual pergunta transforma a reação em dado útil?",
      opcoes: [
        "A) Mas é uma ótima taxa, não acha?",
        "B) Qual valor faria sentido para você considerar?",
        "C) Se eu aumentar, fechamos?",
        "D) 5 mil a mais adianta?"
      ],
      respostaCorreta: 1,
      explicacao: "Você transforma uma reação vaga em critério de recálculo."
    },
    oQueLevar: [
      "Faça uma pergunta por vez.",
      "Descubra prioridade antes de calcular.",
      "Use a resposta para escolher a próxima pergunta.",
      "Pare de sondar quando já houver direção suficiente."
    ]
  },
  {
    dia: 16,
    titulo: "Construção da proposta: calcular para o que o cliente pediu",
    voceEstaAqui: "Você já sabe sondar. Hoje vai transformar necessidade em cenário e usar o comparativo apenas no nível necessário para este primeiro módulo.",
    oQueVaiEntender: "Ao terminar, você deve escolher uma direção de cálculo, montar um cenário principal e apresentar a vantagem central sem despejar todas as tabelas.",
    conteudoPrincipal: [
      {
        titulo: "Do Objetivo Para o Cálculo",
        paragrafos: [
          "Se o cliente prioriza valor, você testa uma configuração coerente com esse objetivo. Se prioriza parcela, respeita a faixa informada. Se quer prazo menor, precisa enxergar como a duração muda o cenário. A calculadora deixa de ser um gerador de números e passa a responder uma pergunta comercial."
        ]
      },
      {
        titulo: "Poucos Cenários",
        paragrafos: [
          "O cliente não precisa receber tudo o que você testou. O profissional pode explorar várias possibilidades internamente e selecionar uma ou poucas referências que façam sentido."
        ]
      },
      {
        titulo: "Comparar sem Aprofundar Taxa",
        paragrafos: [
          "Na margem facultativa, o botão 'Comparar' permite selecionar prazos variados. Neste módulo, o aluno deve perceber que prazo diferente altera parcela média, duração e resultado geral. Não é necessário aprofundar a matemática da taxa mês ou o plano de amortização."
        ]
      },
      {
        titulo: "Uma Vantagem Principal",
        paragrafos: [
          "Antes de enviar o comparativo, defina qual ponto o cliente deve observar: maior valor, parcela mais adequada, duração mais curta ou outra diferença confirmada. Se você não sabe o que quer que ele veja, provavelmente ainda não entendeu a prioridade."
        ]
      }
    ],
    vejaNaFerramenta: {
      titulo: "Veja na Ferramenta",
      imagens: [
        {
          url: "https://ezvownnpgayspkereexu.supabase.co/storage/v1/object/public/capacitacao-pj/images%20TREINAMENTO/aula16_print1.png",
          legenda: "Referência — comparação de prazos em operação de margem facultativa. Neste módulo, observar diferenças básicas; análise de taxa e plano fica para depois."
        }
      ]
    },
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente disse que quer terminar mais cedo e aceita reduzir o valor liberado. Você calcula cenários com prazos menores e escolhe uma referência que mostre essa troca de forma simples. Não manda oito tabelas."
    },
    perguntaAberta: "Descreva em até quatro linhas como você escolheria um cenário para um cliente cuja prioridade é 'parcela que caiba com tranquilidade'.",
    decisao: {
      pergunta: "Depois de testar vários prazos, qual é a melhor forma de apresentar?",
      opcoes: [
        "A) Enviar todos os cenários e pedir o feedback do cliente.",
        "B) Selecionar o cenário que melhor responde à prioridade, destacar uma vantagem e fazer uma pergunta de decisão.",
        "C) Mostrar a menor taxa, enfatizar a economia e fazer uma pergunta de decisão.",
        "D) Mandar o plano de amortização para explicar o comparativo."
      ],
      respostaCorreta: 1,
      explicacao: "A proposta deve ser recomendação orientada, não depósito de tabelas."
    },
    oQueLevar: [
      "Necessidade define direção do cálculo.",
      "O profissional testa; o cliente recebe poucos cenários.",
      "Destaque uma vantagem principal e conduza a próxima decisão."
    ]
  },
  {
    dia: 17,
    titulo: "Reação à proposta: parcela, valor, prazo e recálculo",
    voceEstaAqui: "Ontem você construiu uma proposta a partir da prioridade. Hoje vai aprender a usar a reação do cliente como dado para melhorar a proposta quando isso for possível.",
    oQueVaiEntender: "Ao terminar, você deve diferenciar objeção de critério de recálculo e saber quando ajustar em vez de argumentar.",
    conteudoPrincipal: [
      {
        titulo: "Parcela Alta",
        paragrafos: [
          "Se o cliente diz que a parcela ficou alta, não comece defendendo a condição. Pergunte qual faixa cabe com tranquilidade. Se houver possibilidade, recalcule."
        ]
      },
      {
        titulo: "Valor Baixo",
        paragrafos: [
          "Se o valor liberado não atende, descubra qual valor faria sentido. Isso evita perder tempo tentando convencer alguém de que uma quantia insuficiente deveria ser suficiente."
        ]
      },
      {
        titulo: "Prazo Longo",
        paragrafos: [
          "Se o cliente quer terminar antes, teste o impacto de prazos menores conforme as tabelas disponíveis. Explique a troca de forma objetiva."
        ]
      },
      {
        titulo: "Pergunta Sobre Taxa",
        paragrafos: [
          "Quando a taxa estiver validada no cenário, responda. Mas depois reconecte com valor, parcela e prazo. Uma taxa isolada não substitui a condição completa."
        ]
      },
      {
        titulo: "Proposta Concorrente",
        paragrafos: [
          "Peça as referências principais e compare pela mesma base. Evite 'a nossa é melhor' sem demonstrar a diferença."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente: 'Gostei, mas R$ 1.000 por mês fica pesado'. A resposta útil é descobrir a faixa confortável e recalcular. Defender a proposta original só aumenta atrito."
    },
    perguntaAberta: "Escreva como responderia a 'o valor ficou baixo' sem tentar convencer o cliente a aceitar algo que não atende ao objetivo dele.",
    decisao: {
      pergunta: "Cliente quer prazo menor. O que fazer primeiro?",
      opcoes: [
        "A) Explicar por que prazo disponível é melhor.",
        "B) Avaliar se há estrutura com prazos menores e mostrar o cenário real para o cliente.",
        "C) Trazer 3 comparativos de prazos.",
        "D) Prometer 24 meses em qualquer contrato."
      ],
      respostaCorreta: 1,
      explicacao: "Quando a reação cria um critério objetivo, transforme-o em recálculo."
    },
    oQueLevar: [
      "Parcela, valor e prazo podem virar critérios de ajuste.",
      "Recalcule quando houver possibilidade, em vez de defender tudo.",
      "Compare propostas pela mesma referência."
    ]
  },
  {
    dia: 18,
    titulo: "Objeções: diagnosticar em vez de combater",
    voceEstaAqui: "Você já aprendeu a recalcular quando a reação é objetiva. Hoje vamos trabalhar respostas mais vagas: 'não tenho interesse', 'vou pensar', 'faço no meu banco', 'não confio'.",
    oQueVaiEntender: "Ao terminar, você deve usar a objeção como convite para descobrir o motivo real, sem confronto e sem insistência automática.",
    conteudoPrincipal: [
      {
        titulo: "Objeção Não é Batalha",
        paragrafos: [
          "O objetivo não é 'vencer' o cliente. É entender o que está impedindo avanço e verificar se existe algo real para resolver."
        ]
      },
      {
        titulo: "\"Vou Pensar\"",
        paragrafos: [
          "Pensar sobre o quê? Necessidade do valor? Parcela? Prazo? Segurança? A resposta comercial é uma pergunta que transforma o genérico em concreto."
        ]
      },
      {
        titulo: "\"Não Tenho Interesse\"",
        paragrafos: [
          "Pode ser falta de necessidade, falta de confiança, produto inadequado ou simplesmente momento. Respeite a resposta e, se existir uma alternativa coerente, faça uma pergunta curta antes de encerrar. Não transforme isso em perseguição."
        ]
      },
      {
        titulo: "\"Faço Tudo no Meu Banco\"",
        paragrafos: [
          "Não ataque o banco. Uma segunda referência pode ter valor por comparação. Se o cliente não quer comparar, preserve a relação."
        ]
      },
      {
        titulo: "\"Não Confio\"",
        paragrafos: [
          "Resolva a insegurança com processo e informação verificável. Se você não sabe responder uma dúvida técnica, consulte. Inventar uma resposta para manter a venda é pior do que parar dois minutos e confirmar."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente: 'Preciso pensar'. Você responde: 'Claro. Para eu não ficar te procurando sem contexto: o que você quer analisar melhor — necessidade do valor, parcela, prazo ou segurança da operação?'"
    },
    perguntaAberta: "Escolha uma objeção que você considera difícil e escreva: 1) o que pode estar por trás; 2) uma pergunta para diagnosticar.",
    decisao: {
      pergunta: "Cliente diz 'faço direto com meu banco'. Qual resposta é mais adequada?",
      opcoes: [
        "A) O banco que está falando não entrega a operação que fazemos.",
        "B) Tudo bem. Faz sentido. Minha proposta é te dar uma segunda referência apenas.",
        "C) Por que você só faz com o seu banco?",
        "D) Ignorar e mandar proposta."
      ],
      respostaCorreta: 1,
      explicacao: "A resposta preserva respeito e oferece comparação sem ataque."
    },
    oQueLevar: [
      "Não combata a objeção; descubra o motivo.",
      "'Vou pensar' precisa de contexto.",
      "Banco concorrente é referência de comparação, não inimigo."
    ]
  },
  {
    dia: 19,
    titulo: "Ligação comercial: quando a voz resolve melhor",
    voceEstaAqui: "Até aqui você trabalhou principalmente WhatsApp. Hoje vamos aprender quando uma ligação pode reduzir ruído e acelerar entendimento.",
    oQueVaiEntender: "Ao terminar, você deve estruturar uma ligação curta com abertura, contexto, pergunta, escuta, síntese e próximo passo.",
    conteudoPrincipal: [
      {
        titulo: "Quando a Ligação Ajuda",
        paragrafos: [
          "Quando a conversa por texto está confusa, quando há muitas perguntas encadeadas, quando o cliente demonstra interesse mas não consegue organizar a decisão, ou quando uma explicação curta em voz pode reduzir ruído."
        ]
      },
      {
        titulo: "Antes de Ligar",
        paragrafos: [
          "Saiba por que você está ligando. Não ligue apenas para 'ver se o cliente atende'. Tenha um objetivo: entender prioridade, explicar uma diferença, confirmar uma dúvida, conduzir formalização."
        ]
      },
      {
        titulo: "Estrutura Simples",
        paragrafos: [
          "1. ABERTURA — Seu tom e postura verbal abrem o caminho para a atenção.",
          "2. CONTEXTO — contextualize em uma frase por que estão conversando.",
          "3. PERGUNTA — descubra o ponto central.",
          "4. ESCUTA — não responda enquanto o cliente ainda está explicando.",
          "5. SÍNTESE — repita o que entendeu.",
          "6. RECOMENDAÇÃO — apresente o próximo passo.",
          "7. CONFIRMAÇÃO — combine o que acontecerá depois."
        ]
      },
      {
        titulo: "O Erro do Monólogo",
        paragrafos: [
          "Uma ligação não é o momento de despejar todo o conhecimento adquirido. Se você fala por cinco minutos sem descobrir nada novo, provavelmente está dando uma palestra, não conduzindo uma venda."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente está comparando duas condições e troca muitas mensagens. Você pode propor uma ligação de 3 a 5 minutos para organizar valor, parcela e prazo e sair com uma decisão clara."
    },
    perguntaAberta: "Escreva uma abertura de ligação de no máximo três frases para um cliente que já conversou com você no WhatsApp.",
    decisao: {
      pergunta: "Em uma ligação, o cliente começa a explicar por que a parcela o preocupa. O que fazer?",
      opcoes: [
        "A) Interromper e mostrar o benefício da taxa.",
        "B) Escutar, confirmar o que entendeu e indicar o caminho adequado.",
        "C) Ouvir, fazer uma pergunta se entendeu e falar que seguirá no WhatsApp.",
        "D) Explicar outros cenários e questionar qual faz sentido."
      ],
      respostaCorreta: 1,
      explicacao: "A ligação é útil porque capta contexto e emoção sem transformar isso em disputa."
    },
    oQueLevar: [
      "Ligue com um objetivo.",
      "Confirme se o cliente pode falar.",
      "Pergunte, escute, sintetize e recomende.",
      "Evite monólogo técnico."
    ]
  },
  {
    dia: 20,
    titulo: "Follow-up e sinais de fechamento: saber retomar e saber parar",
    voceEstaAqui: "Você já sabe abrir, sondar, calcular, apresentar, recalcular e ligar. Hoje vamos cuidar do que acontece quando a venda não fecha no mesmo momento — ou quando já está pronta para avançar.",
    oQueVaiEntender: "Ao terminar, você deve fazer follow-up com contexto e reconhecer sinais de compra para parar de argumentar.",
    conteudoPrincipal: [
      {
        titulo: "Follow-up Não É 'Oi, Viu?'",
        paragrafos: [
          "Uma retomada boa lembra onde a conversa parou e traz uma razão para voltar. Pode ser uma informação pendente, um recálculo, uma comparação solicitada, uma mudança confirmada ou simplesmente o retorno combinado."
        ]
      },
      {
        titulo: "Registre o Motivo",
        paragrafos: [
          "Se o cliente disse que precisava analisar a parcela, registre isso. Se pediu retorno em determinada data, registre. Sem histórico, o follow-up vira repetição."
        ]
      },
      {
        titulo: "Quando Parar",
        paragrafos: [
          "Se não existe ganho real, se o cliente pediu para não ser contatado ou se já houve tentativas adequadas sem contexto novo, encerrar pode ser a melhor decisão. Preservar relação também é gestão comercial."
        ]
      },
      {
        titulo: "Sinais de Fechamento",
        paragrafos: [
          "Perguntas como 'o que precisa enviar?', 'como assina?', 'quando cai?', 'pode seguir?' indicam que a pessoa saiu da avaliação e entrou no processo. Nesse momento, mais argumentos podem abrir novas dúvidas. Avance."
        ]
      },
      {
        titulo: "Próximo Passo Claro",
        paragrafos: [
          "Toda conversa deveria terminar com algo definido: calcular, enviar proposta, confirmar documento, ligar depois, aguardar retorno combinado ou encerrar."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "dialogo",
      texto: "Cliente pergunta 'o que eu preciso mandar para seguir?'. Não volte a falar da taxa. Responda o próximo passo correto e avance."
    },
    perguntaAberta: "Escreva um follow-up contextualizado para alguém que disse ontem: 'quero pensar melhor na parcela'.",
    decisao: {
      pergunta: "Qual é um sinal forte de compra?",
      opcoes: [
        "A) 'Não tenho interesse'",
        "B) 'Qual é a taxa?'",
        "C) 'O que é necessário?'",
        "D) Silêncio"
      ],
      respostaCorreta: 2,
      explicacao: "O cliente está perguntando sobre formalização. O trabalho agora é facilitar o avanço."
    },
    oQueLevar: [
      "Follow-up precisa de contexto.",
      "Registre o motivo da pausa.",
      "Sinal de compra pede próximo passo, não mais venda.",
      "Saber encerrar também é competência."
    ]
  },
  {
    dia: 21,
    titulo: "Caso completo: do lead ao próximo passo correto",
    voceEstaAqui: "Chegamos ao último dia de conteúdo do módulo 1. Hoje vamos conectar tudo em um único caso prático ponta a ponta.",
    oQueVaiEntender: "Ao terminar, você deve percorrer uma oportunidade do primeiro contato ao próximo passo, escolhendo quando perguntar, calcular, recalcular, comparar, ligar ou consultar.",
    conteudoPrincipal: [
      {
        titulo: "Caso — Juliana",
        paragrafos: [
          "Juliana é servidora. Na base, você possui nome, vínculo e origem da campanha. Você envia uma mensagem curta com contexto e pergunta se ela recebeu alguma proposta recente.",
          "Juliana responde: 'Meu banco já falou comigo. E acho que nem tenho margem.'"
        ]
      },
      {
        titulo: "Etapa 1 — O Que Você Ainda Não Sabe",
        paragrafos: [
          "Você não sabe qual margem ela consultou. Não sabe a proposta do banco. Não sabe o objetivo dela. Não sabe se possui contratos que mereçam análise. Portanto, ainda não existe motivo para mandar uma simulação."
        ]
      },
      {
        titulo: "Etapa 2 — Sondagem",
        paragrafos: [
          "Você pergunta qual condição o banco apresentou. Juliana responde que lembra de um valor aproximado, mas a parcela ficou pesada. Agora surge uma prioridade: parcela."
        ]
      },
      {
        titulo: "Etapa 3 — Consulta",
        paragrafos: [
          "A consulta mostra margem facultativa limitada, dois contratos existentes e margem complementar disponível. Isso não significa que você deve oferecer tudo. Significa que existem linhas para analisar."
        ]
      },
      {
        titulo: "Etapa 4 — Cálculo",
        paragrafos: [
          "Você decide testar uma condição que respeite a faixa de parcela mencionada. Usa a calculadora com a tabela correta. Em seguida, seleciona uma alternativa simples para apresentar."
        ]
      },
      {
        titulo: "Etapa 5 — Reação",
        paragrafos: [
          "Juliana responde: 'Esse valor ainda é baixo'. Em vez de defender a proposta, você pergunta qual valor faria sentido. A resposta cria novo critério."
        ]
      },
      {
        titulo: "Etapa 6 — Limite Técnico",
        paragrafos: [
          "Durante a análise de um dos contratos, surge uma regra específica que você não domina. Aqui entra autonomia com limite: você não inventa. Consulta a retaguarda/chamado e retorna com informação validada."
        ]
      },
      {
        titulo: "Etapa 7 — Próximo Passo",
        paragrafos: [
          "Depois da nova simulação, Juliana pergunta: 'Se eu quiser seguir, o que preciso fazer?'. Esse é o momento de parar de vender e conduzir o próximo passo."
        ]
      },
      {
        titulo: "Ponte Para os Próximos Módulos",
        paragrafos: [
          "Você viu no sistema botões de comparação e plano. Neste primeiro módulo, aprendeu apenas a reconhecer e usar o comparativo em nível básico. Engenharia de amortização, leitura aprofundada de taxas, regras por instituição e detalhamento de plano pertencem ao aprofundamento posterior."
        ]
      }
    ],
    vejaAcontecendo: {
      tipo: "caso",
      texto: "Releia o caso de Juliana e observe quantas vezes uma nova informação mudou o próximo passo. A competência que estamos formando não é decorar uma sequência rígida; é saber qual informação precisa vir antes da próxima decisão."
    },
    perguntaAberta: "Em qual momento do caso de Juliana seria mais perigoso 'chutar' uma informação? Por quê?",
    decisao: {
      pergunta: "Juliana pergunta uma regra específica de contrato que você não domina. O que fazer?",
      opcoes: [
        "A) Responder com o que acha para não perder ritmo.",
        "B) Consultar chamado e retornar com informação validada.",
        "C) Mudar de assunto.",
        "D) Perguntar para o colega ao lado."
      ],
      respostaCorreta: 1,
      explicacao: "Autonomia não significa inventar. Saber quando consultar faz parte da competência."
    },
    oQueLevar: [
      "Cenário + necessidade + condição disponível orientam a ação.",
      "A próxima decisão muda quando surge informação nova.",
      "Calculadora responde ao objetivo; não substitui sondagem.",
      "Se não souber uma regra técnica, consulte."
    ]
  },
  {
    dia: 22,
    titulo: "DIA 22 — AVALIAÇÃO 2",
    subtitulo: "Autonomia inicial, comportamento comercial e raciocínio integrado",
    voceEstaAqui: "Você concluiu os 21 dias de formação do Módulo 1. Chegamos à avaliação final para consolidar sua autonomia comercial e raciocínio integrado.",
    oQueVaiEntender: "Validar autonomia comercial, leitura de comportamento, segurança no WhatsApp, manejo de objeções e condução de casos.",
    isAvaliacao: true,
    regra: "Sem acesso aos conteúdos. Misturar questões objetivas, decisões de cenário e respostas abertas. Registrar tempo, alterações de resposta e texto final para apoiar a leitura de Supervisor Comercial e RH.",
    conteudoPrincipal: [],
    perguntaAberta: "",
    decisao: {
      pergunta: "",
      opcoes: [],
      respostaCorreta: 0,
      explicacao: ""
    },
    oQueLevar: [
      "Comunicação consultiva em camadas.",
      "Diagnóstico preciso antes de qualquer cálculo.",
      "Respeito às regras e clareza no processo geram confiança duradoura."
    ]
  }
]

export default function TreinamentoPage() {
  const { user, perfil, isDeveloper, isAdmin } = useAuth()
  const { setIsTrainingBlocked } = useSidebar()
  const userRole = (perfil?.role || "").trim()
  const isDevUser = Boolean(isDeveloper || userRole === "Desenvolvedor")
  const isAdminUser = Boolean(isAdmin || userRole === "Administrador")
  const isSupervisorUser = userRole === "Supervisor"
  const isOperacionalUser = userRole === "Operacional"
  const isRHUser = userRole === "Recursos Humanos" || userRole === "RH"

  // Perfis autorizados a acessar o Painel de Controle no Treinamento
  const isGestorTreinamento = Boolean(
    isDevUser ||
    isAdminUser ||
    isSupervisorUser ||
    isOperacionalUser ||
    isRHUser
  )

  // Regra de visibilidade do progresso do 'Corretor do regime PJ':
  // Somente Administrador e Desenvolvedor podem ver Corretor PJ.
  // Supervisor, Operacional e Recursos Humanos não podem ver Corretor PJ.
  const podeVerCorretorPJ = Boolean(isDevUser || isAdminUser)

  // Perfis autorizados a acessar a área de Treinamento
  const temAcessoTreinamento = Boolean(
    isDeveloper ||
    ["Administrador", "Desenvolvedor", "Supervisor", "Operacional", "Monitoramento", "Corretor", "Estágio", "Processo Seletivo", "PROCESSO SELETIVO", "Recursos Humanos", "RH"].includes(perfil?.role as string)
  )

  // Isenção da 'Regra de Liberação Diária (Trava de 1 Aula por Dia Útil)'
  // Isentos: Administrador, Supervisor, Operacional, Recursos Humanos, Desenvolvedor e regime PJ
  const regimeUsuario = (perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || "").toUpperCase().trim()
  const isPJ = regimeUsuario.includes("PJ")
  const isIsentoLimiteDiario = Boolean(
    isDevUser || 
    isAdminUser || 
    isSupervisorUser || 
    isOperacionalUser || 
    isRHUser ||
    isPJ
  )

  // Isenção do 'Cronômetro Flutuante de 30 Minutos'
  // Isentos: Administrador, Supervisor, Operacional, Recursos Humanos, Desenvolvedor e regime PJ
  const isIsentoCronometro = Boolean(
    isDevUser || 
    isAdminUser || 
    isSupervisorUser || 
    isOperacionalUser || 
    isRHUser ||
    isPJ
  )

  // Isenção do 'Bloqueio Geral de outras áreas durante a aula'
  // Isentos: Administrador, Corretor do regime PJ, Supervisor, Operacional, Recursos Humanos e Desenvolvedor
  const isIsentoBloqueioGeral = isIsentoLimiteDiario

  // Isenção de obrigatoriedade de respostas e navegação livre por todas as aulas:
  // Administrador, Supervisor, Operacional, Recursos Humanos e Desenvolvedor
  const isIsentoNavegacao = Boolean(
    isDevUser ||
    isAdminUser ||
    isSupervisorUser ||
    isOperacionalUser ||
    isRHUser
  )

  const [selectedDia, setSelectedDia] = useState<number>(1)
  const [respostasAbertas, setRespostasAbertas] = useState<Record<number, string>>({})
  const [decisoesTomadas, setDecisoesTomadas] = useState<Record<number, number>>({})
  const [diasConcluidos, setDiasConcluidos] = useState<number[]>([])
  const [datasConclusao, setDatasConclusao] = useState<Record<number, string>>({})
  const [datasEntrada, setDatasEntrada] = useState<Record<number, string>>({})
  const [savedStatus, setSavedStatus] = useState<string | null>(null)
  const [iniciouCurso, setIniciouCurso] = useState<boolean>(false)
  const [carregandoDados, setCarregandoDados] = useState<boolean>(true)

  // Estados específicos para a Avaliação 1 (Dia 11)
  const [respostasAbertasAv1, setRespostasAbertasAv1] = useState<Record<number, string>>({})
  const [respostasEscolhaAv1, setRespostasEscolhaAv1] = useState<Record<number, number>>({})
  const [av1SalvaStatus, setAv1SalvaStatus] = useState<string | null>(null)
  const [av1ValidacaoErro, setAv1ValidacaoErro] = useState<string | null>(null)

  // Estados específicos para a Avaliação 2 (Dia 22)
  const [respostasAbertasAv2, setRespostasAbertasAv2] = useState<Record<number, string>>({})
  const [respostasEscolhaAv2, setRespostasEscolhaAv2] = useState<Record<number, number>>({})
  const [av2SalvaStatus, setAv2SalvaStatus] = useState<string | null>(null)
  const [av2ValidacaoErro, setAv2ValidacaoErro] = useState<string | null>(null)

  // Liberações programadas via Painel de Controle
  const [liberacoesProgramadas, setLiberacoesProgramadas] = useState<any[]>([])

  // Estado do Painel de Controle de Treinamento
  const [painelCarregando, setPainelCarregando] = useState<boolean>(false)
  const [painelUsuarios, setPainelUsuarios] = useState<any[]>([])
  const [painelProgresso, setPainelProgresso] = useState<any[]>([])
  const [painelLiberacoes, setPainelLiberacoes] = useState<any[]>([])
  const [progDia, setProgDia] = useState<number>(2)
  const [progUsuarioId, setProgUsuarioId] = useState<string>("ALL")
  const [progData, setProgData] = useState<string>(() => {
    const agoraSp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))
    return agoraSp.toISOString().split("T")[0]
  })
  const [progHora, setProgHora] = useState<string>("14:00")
  const [salvandoLiberacao, setSalvandoLiberacao] = useState<boolean>(false)
  const [feedbackMsg, setFeedbackMsg] = useState<{ tipo: "sucesso" | "erro"; texto: string } | null>(null)
  const [usuarioExpandidoId, setUsuarioExpandidoId] = useState<string | null>(null)
  const [filtroPesquisaAluno, setFiltroPesquisaAluno] = useState<string>("")
  const [abaFuncaoSelecionada, setAbaFuncaoSelecionada] = useState<string>("TODAS")
  const [avisoBloqueioColar, setAvisoBloqueioColar] = useState<string | null>(null)
  const [liberandoAlunoKey, setLiberandoAlunoKey] = useState<string | null>(null)
  const [acaoMassaCarregando, setAcaoMassaCarregando] = useState<"liberar" | "bloquear" | null>(null)
  const [modalGabaritoAv1Aberto, setModalGabaritoAv1Aberto] = useState<boolean>(false)
  const [modalGabaritoAv2Aberto, setModalGabaritoAv2Aberto] = useState<boolean>(false)

  // Interactive Mini Calculator on Day 5
  const [calcMargem, setCalcMargem] = useState<number>(1000)
  const [calcCoef, setCalcCoef] = useState<number>(0.04333)
  const [calcPrazo, setCalcPrazo] = useState<number>(96)

  // Cálculo da liberação da aula no próximo dia útil ou via agendamento do Painel de Controle
  const calcularLiberacaoDia = (diaAlvo: number): { liberado: boolean; dataHoraLiberacao?: Date; mensagemBloqueio?: string } => {
    // Dias já concluídos ou dia 1 sempre liberados
    if (diasConcluidos.includes(diaAlvo) || diaAlvo <= 1) {
      return { liberado: true }
    }

    // Se o usuário é isento (PJ, Gestores ou RH), libera imediatamente qualquer dia
    if (isIsentoLimiteDiario || isIsentoNavegacao) {
      return { liberado: true }
    }

    // Verifica se há liberação programada pelo Painel de Controle para este dia
    const userIdAtual = (user?.id || perfil?.id || "").trim().toLowerCase()
    const libProgramada = liberacoesProgramadas.find(
      l => l.dia === diaAlvo && (
        l.usuario_id === "ALL" ||
        (l.usuario_id && l.usuario_id.trim().toLowerCase() === userIdAtual)
      )
    )

    if (libProgramada && libProgramada.data_hora_liberacao) {
      const dataHoraLib = new Date(libProgramada.data_hora_liberacao)
      const agora = new Date()
      // Se a liberação foi feita para o momento atual ou já passou, libera imediatamente
      if (agora.getTime() >= dataHoraLib.getTime() - 60000) {
        return { liberado: true, dataHoraLiberacao: dataHoraLib }
      }
      const dataStr = dataHoraLib.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      const horaStr = dataHoraLib.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      return {
        liberado: false,
        dataHoraLiberacao: dataHoraLib,
        mensagemBloqueio: `Disponível em ${dataStr} às ${horaStr}.`
      }
    }

    // Para o dia N, depende da conclusão do dia anterior (N - 1)
    const diaAnterior = diaAlvo - 1
    if (!diasConcluidos.includes(diaAnterior)) {
      return { liberado: false, mensagemBloqueio: `Conclua a aula do DIA ${diaAnterior} primeiro.` }
    }

    const dataConclusaoIso = datasConclusao[diaAnterior]
    if (!dataConclusaoIso) {
      return { liberado: true }
    }

    try {
      const dataConclusao = new Date(dataConclusaoIso)
      const spDateStr = dataConclusao.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
      const spDate = new Date(spDateStr)

      const targetSpDate = new Date(spDate)
      const dayOfWeek = spDate.getDay() // 0 = Domingo, 5 = Sexta, 6 = Sábado

      let daysToAdd = 1
      if (dayOfWeek === 5) { // Sexta -> Segunda
        daysToAdd = 3
      } else if (dayOfWeek === 6) { // Sábado -> Segunda
        daysToAdd = 2
      } else if (dayOfWeek === 0) { // Domingo -> Segunda
        daysToAdd = 1
      }

      targetSpDate.setDate(targetSpDate.getDate() + daysToAdd)
      targetSpDate.setHours(0, 0, 0, 0)

      const agoraSp = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }))

      if (agoraSp >= targetSpDate) {
        return { liberado: true, dataHoraLiberacao: targetSpDate }
      }

      return {
        liberado: false,
        dataHoraLiberacao: targetSpDate,
        mensagemBloqueio: "Disponível no próximo dia útil."
      }
    } catch {
      return { liberado: true }
    }
  }

  // Dia ativo em curso (próximo dia a ser concluído)
  const diaAtivoEmCurso = diasConcluidos.length > 0
    ? Math.min(22, Math.max(...diasConcluidos) + 1)
    : 1

  const statusLiberacaoDiaAtivo = calcularLiberacaoDia(diaAtivoEmCurso)

  // Cronômetro da aula (30 minutos = 1800 segundos contínuos para cada aula em estudo)
  // REGRA ESTRITA: O cronômetro só inicia e conta quando o dia estiver liberado e não concluído (aula ativa) E quando o usuário estiver dentro da aula (iniciouCurso = true).
  // Se a aula estiver bloqueada ou se for um dia já concluído (histórico), o cronômetro fica zerado (00:00). Isenção para perfis gestores e Corretor PJ.
  const [tempoRestante, setTempoRestante] = useState<number>(0)

  // Bloqueio do sistema: o bloqueio SOMENTE deve ocorrer enquanto o usuário estiver em um dia (aula) ainda não concluído.
  // Se o dia (aula) estiver finalizado (histórico), ou o outro dia estiver bloqueado e o usuário não estiver em aula ativa,
  // as outras áreas do sistema não ficam bloqueadas; assim que ele concluir, deve liberar as outras áreas.
  const isAulaAtivaNaoConcluida = Boolean(
    iniciouCurso &&
    !diasConcluidos.includes(selectedDia) &&
    calcularLiberacaoDia(selectedDia).liberado &&
    !isIsentoBloqueioGeral
  )

  useEffect(() => {
    if (setIsTrainingBlocked) {
      setIsTrainingBlocked(isAulaAtivaNaoConcluida)
    }
    return () => {
      if (setIsTrainingBlocked) {
        setIsTrainingBlocked(false)
      }
    }
  }, [isAulaAtivaNaoConcluida, setIsTrainingBlocked])

  // Atualiza/sincroniza o tempo restante do dia selecionado
  useEffect(() => {
    if (typeof window === "undefined" || isIsentoCronometro) return

    // Se o usuário ainda não entrou na aula, não inicia contagem
    if (!iniciouCurso) return

    const statusDia = calcularLiberacaoDia(selectedDia)
    const isConcluido = diasConcluidos.includes(selectedDia)

    // Se o dia selecionado estiver bloqueado ou for um dia já concluído (histórico), mantém o cronômetro zerado
    if (!statusDia.liberado || isConcluido) {
      setTempoRestante(0)
      return
    }

    const storageKey = `shark_treinamento_timer_dia_${selectedDia}_${user?.id || "anon"}`
    const duracaoTotal = 30 * 60 // 1800s

    let startTime = localStorage.getItem(storageKey)
    if (!startTime) {
      // Inicia a contagem apenas a partir do momento em que o usuário acessou a aula ativa desbloqueada
      startTime = Date.now().toString()
      localStorage.setItem(storageKey, startTime)
    }

    const segundosPassados = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000)
    const restante = Math.max(0, duracaoTotal - segundosPassados)
    setTempoRestante(restante)
  }, [user?.id, isIsentoCronometro, iniciouCurso, selectedDia, diasConcluidos, datasConclusao])

  // Contagem regressiva ativa (continua apenas enquanto estiver dentro de aula desbloqueada e não concluída)
  useEffect(() => {
    if (typeof window === "undefined" || isIsentoCronometro || !iniciouCurso || tempoRestante <= 0) return

    const statusDia = calcularLiberacaoDia(selectedDia)
    const isConcluido = diasConcluidos.includes(selectedDia)
    if (!statusDia.liberado || isConcluido) {
      setTempoRestante(0)
      return
    }

    const storageKey = `shark_treinamento_timer_dia_${selectedDia}_${user?.id || "anon"}`
    const duracaoTotal = 30 * 60

    const timer = setInterval(() => {
      const startTime = localStorage.getItem(storageKey)
      if (startTime) {
        const segundosPassados = Math.floor((Date.now() - parseInt(startTime, 10)) / 1000)
        const restante = Math.max(0, duracaoTotal - segundosPassados)
        setTempoRestante(restante)
        if (restante <= 0) {
          clearInterval(timer)
        }
      } else {
        setTempoRestante(prev => Math.max(0, prev - 1))
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [user?.id, isIsentoCronometro, iniciouCurso, selectedDia, tempoRestante, diasConcluidos, datasConclusao])

  // Load state directly and exclusively from API / Supabase
  useEffect(() => {
    async function carregarDadosTreinamento() {
      try {
        // Limpa resquícios antigos do localStorage para não persistir offline
        if (typeof window !== "undefined") {
          localStorage.removeItem("shark_treinamento_respostas")
          localStorage.removeItem("shark_treinamento_decisoes")
          localStorage.removeItem("shark_treinamento_concluidos")
        }

        const targetUserId = user?.id || perfil?.id
        if (!targetUserId) {
          // Se não houver usuário autenticado, reseta para o estado inicial limpo
          setRespostasAbertas({})
          setDecisoesTomadas({})
          setDiasConcluidos([])
          return
        }

        const res = await fetch(`/api/treinamento?userId=${targetUserId}`)
        if (!res.ok) {
          setRespostasAbertas({})
          setDecisoesTomadas({})
          setDiasConcluidos([])
          return
        }

        const json = await res.json()
        const data = json.data
        if (json.liberacoes && Array.isArray(json.liberacoes)) {
          setLiberacoesProgramadas(json.liberacoes)
        }

        if (data && Array.isArray(data) && data.length > 0) {
          const remoteRespostas: Record<number, string> = {}
          const remoteDecisoes: Record<number, number> = {}
          const remoteConcluidos: number[] = []
          const remoteDatasConclusao: Record<number, string> = {}
          const remoteDatasEntrada: Record<number, string> = {}

          data.forEach((item: any) => {
            if (item.resposta_aberta) remoteRespostas[item.dia] = item.resposta_aberta
            if (item.decisao_opcao_idx !== null && item.decisao_opcao_idx !== undefined) {
              remoteDecisoes[item.dia] = item.decisao_opcao_idx
            }
            if (item.concluido && !remoteConcluidos.includes(item.dia)) {
              remoteConcluidos.push(item.dia)
            }
            if (item.data_hora_conclusao || item.updated_at || item.created_at) {
              remoteDatasConclusao[item.dia] = item.data_hora_conclusao || item.updated_at || item.created_at
            }
            if (item.data_hora_entrada) {
              remoteDatasEntrada[item.dia] = item.data_hora_entrada
            }
          })

          // Carrega avaliação se existir na resposta
          if (json.avaliacoes && Array.isArray(json.avaliacoes)) {
            const av1 = json.avaliacoes.find((a: any) => a.dia === 11)
            if (av1) {
              if (av1.respostas_abertas) setRespostasAbertasAv1(av1.respostas_abertas)
              if (av1.respostas_escolha) setRespostasEscolhaAv1(av1.respostas_escolha)
              if (av1.concluido) {
                if (!remoteConcluidos.includes(11)) remoteConcluidos.push(11)
                if (av1.data_hora_conclusao) {
                  remoteDatasConclusao[11] = av1.data_hora_conclusao
                }
              }
              if (av1.data_hora_entrada) {
                remoteDatasEntrada[11] = av1.data_hora_entrada
              }
            }

            const av2 = json.avaliacoes.find((a: any) => a.dia === 22)
            if (av2) {
              if (av2.respostas_abertas) setRespostasAbertasAv2(av2.respostas_abertas)
              if (av2.respostas_escolha) setRespostasEscolhaAv2(av2.respostas_escolha)
              if (av2.concluido) {
                if (!remoteConcluidos.includes(22)) remoteConcluidos.push(22)
                if (av2.data_hora_conclusao) {
                  remoteDatasConclusao[22] = av2.data_hora_conclusao
                }
              }
              if (av2.data_hora_entrada) {
                remoteDatasEntrada[22] = av2.data_hora_entrada
              }
            }
          }

          setRespostasAbertas(remoteRespostas)
          setDecisoesTomadas(remoteDecisoes)
          setDiasConcluidos(remoteConcluidos)
          setDatasConclusao(remoteDatasConclusao)
          setDatasEntrada(remoteDatasEntrada)
        } else {
          // Se não houver registros no banco (ou se tiverem sido apagados), reseta tudo
          setRespostasAbertas({})
          setDecisoesTomadas({})
          setDiasConcluidos([])
          setDatasConclusao({})
          setDatasEntrada({})
          setRespostasAbertasAv1({})
          setRespostasEscolhaAv1({})
          setRespostasAbertasAv2({})
          setRespostasEscolhaAv2({})
        }
      } catch (err) {
        console.error("Erro ao carregar dados do treinamento:", err)
        setRespostasAbertas({})
        setDecisoesTomadas({})
        setDiasConcluidos([])
        setDatasConclusao({})
        setDatasEntrada({})
        setRespostasAbertasAv1({})
        setRespostasEscolhaAv1({})
        setRespostasAbertasAv2({})
        setRespostasEscolhaAv2({})
      } finally {
        setCarregandoDados(false)
      }
    }

    carregarDadosTreinamento()
  }, [user?.id, perfil?.id])

  // Carrega dados completos para o Painel de Controle (Gestores e Participantes)
  const carregarDadosPainel = async () => {
    setPainelCarregando(true)
    try {
      const res = await fetch("/api/treinamento?action=painel")
      if (!res.ok) return
      const json = await res.json()
      const rawRows: any[] = json.rows || []
      const users: any[] = json.usuarios || []
      const libs: any[] = json.liberacoes || []

      setPainelUsuarios(users)
      setPainelLiberacoes(libs)
      setLiberacoesProgramadas(libs)

      // Agrupar linhas por usuário
      const progressoPorUser: Record<string, any> = {}

      rawRows.forEach(row => {
        if (!row.user_id) return
        const authUser = users.find(u => u.id === row.user_id)

        // Se o usuário foi desativado no sistema (status === "INATIVO"), não deve ser mostrado no painel
        if (authUser?.status === "INATIVO") {
          return
        }

        if (!progressoPorUser[row.user_id]) {
          progressoPorUser[row.user_id] = {
            user_id: row.user_id,
            nome: authUser?.nome || row.usuario_nome || "Aluno",
            email: authUser?.email || row.usuario_email || "",
            funcao: authUser?.funcao || "Corretor",
            regime_contratacao: authUser?.regime_contratacao || row.regime_contratacao || "CLT",
            status: authUser?.status || "ATIVO",
            rows: []
          }
        }
        progressoPorUser[row.user_id].rows.push(row)
      })

      const progressoLista: any[] = []

      // Processa exclusivamente os registros existentes na tabela 'treinamento' do banco de dados (SUPABASE)
      Object.values(progressoPorUser).forEach(aluno => {
        const concluidos = aluno.rows.filter((r: any) => r.concluido)
        // Somente exibe registros com aulas concluídas registradas na tabela 'treinamento' do Supabase
        if (concluidos.length < 1) return

        let totalAcertos = 0
        let totalQuestoes = 0
        let ultimaConclusaoIso = ""

        concluidos.forEach((r: any) => {
          if (r.decisao_opcao_idx !== null && r.decisao_opcao_idx !== undefined) {
            totalQuestoes++
            if (r.decisao_acertou) totalAcertos++
          }
          const dt = r.data_hora_conclusao || r.updated_at || r.created_at
          if (dt && (!ultimaConclusaoIso || dt > ultimaConclusaoIso)) {
            ultimaConclusaoIso = dt
          }
        })

        const percentual = Math.round((concluidos.length / 22) * 100)
        const taxaAcerto = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0

        progressoLista.push({
          user_id: aluno.user_id,
          nome: aluno.nome,
          email: aluno.email,
          funcao: aluno.funcao,
          regime_contratacao: aluno.regime_contratacao,
          status: aluno.status,
          totalDiasConcluidos: concluidos.length,
          percentual,
          totalAcertos,
          totalQuestoes,
          taxaAcerto,
          ultimaConclusaoIso,
          historico: concluidos.sort((a: any, b: any) => a.dia - b.dia)
        })
      })

      // Ordena por maior progresso
      progressoLista.sort((a, b) => b.totalDiasConcluidos - a.totalDiasConcluidos || a.nome.localeCompare(b.nome))

      setPainelProgresso(progressoLista)
    } catch (err) {
      console.error("Erro ao carregar dados do painel:", err)
    } finally {
      setPainelCarregando(false)
    }
  }

  useEffect(() => {
    carregarDadosPainel()
  }, [user?.id, perfil?.id])

  // Liberar a próxima aula do aluno imediatamente
  const handleLiberarProximaAula = async (aluno: any, proximoDia: number) => {
    const key = `${aluno.user_id}_${proximoDia}`
    setLiberandoAlunoKey(key)

    try {
      const res = await fetch("/api/treinamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "programar_liberacao",
          dia: proximoDia,
          usuario_id: aluno.user_id,
          usuario_nome: aluno.nome,
          data_hora_liberacao: new Date().toISOString(),
          liberado_por: perfil?.nome || user?.email || "Gestor"
        })
      })

      const json = await res.json()
      if (res.ok && json.liberacoes) {
        setPainelLiberacoes(json.liberacoes)
        setLiberacoesProgramadas(json.liberacoes)
      }
    } catch (err) {
      console.error("Erro ao liberar próxima aula:", err)
    } finally {
      setLiberandoAlunoKey(null)
    }
  }

  // Cancelar liberação programada / re-bloquear aula
  const handleRemoverLiberacao = async (id: string) => {
    try {
      const res = await fetch("/api/treinamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remover_liberacao", id })
      })
      const json = await res.json()
      if (res.ok && json.liberacoes) {
        setPainelLiberacoes(json.liberacoes)
        setLiberacoesProgramadas(json.liberacoes)
      }
    } catch (err) {
      console.error("Erro ao cancelar liberação:", err)
    }
  }

  // Desbloquear próxima aula para todos os alunos visíveis
  const handleLiberarProximaAulaTodos = async (itens: Array<{ dia: number; usuario_id: string; usuario_nome: string }>) => {
    if (itens.length === 0) return
    setAcaoMassaCarregando("liberar")
    try {
      const res = await fetch("/api/treinamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "liberar_em_massa",
          itens: itens.map(item => ({
            ...item,
            data_hora_liberacao: new Date().toISOString()
          })),
          liberado_por: perfil?.nome || user?.email || "Gestor"
        })
      })
      const json = await res.json()
      if (res.ok && json.liberacoes) {
        setPainelLiberacoes(json.liberacoes)
        setLiberacoesProgramadas(json.liberacoes)
      }
    } catch (err) {
      console.error("Erro ao desbloquear próximas aulas em massa:", err)
    } finally {
      setAcaoMassaCarregando(null)
    }
  }

  // Bloquear / revogar liberação da próxima aula de todos
  const handleBloquearProximaAulaTodos = async (ids: string[]) => {
    if (ids.length === 0) return
    setAcaoMassaCarregando("bloquear")
    try {
      const res = await fetch("/api/treinamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "remover_liberacoes_em_massa",
          ids
        })
      })
      const json = await res.json()
      if (res.ok && json.liberacoes) {
        setPainelLiberacoes(json.liberacoes)
        setLiberacoesProgramadas(json.liberacoes)
      }
    } catch (err) {
      console.error("Erro ao revogar liberações em massa:", err)
    } finally {
      setAcaoMassaCarregando(null)
    }
  }

  // Filtro de alunos para exibição no progresso (Regras de visibilidade estritas)
  const currentUserId = user?.id || perfil?.id

  const alunosVisiveisBase = painelProgresso.filter(aluno => {
    // Usuários desativados no sistema não devem ser mostrados no acompanhamento de progresso
    if (aluno.status === "INATIVO") {
      return false
    }

    // Para participantes (Corretor CLT/PJ, Estagiário, Processo Seletivo, Monitoramento, etc.):
    // Cada um vê estritamente o seu próprio progresso individual.
    if (!isGestorTreinamento) {
      return aluno.user_id === currentUserId
    }

    const regime = (aluno.regime_contratacao || "").toUpperCase().trim()
    const roleNorm = (aluno.funcao || "").trim()
    const isCorretor = roleNorm === "Corretor"
    const isPJ = regime.includes("PJ")

    // Requisito 3: Administrador e Desenvolvedor podem ver Corretor PJ.
    if (podeVerCorretorPJ) {
      // Dev e Admin visualizam todos
    } else {
      // Supervisor, Operacional e Recursos Humanos NÃO podem ver Corretor PJ
      if (isCorretor && isPJ) {
        return false
      }
      // Somente podem ver: 'Corretor do regime CLT', 'Estágio', 'Monitoramento', 'Processo Seletivo', 'Supervisor', 'Operacional' e 'Recursos Humanos'
      const funcoesPermitidas = [
        "Corretor",
        "Estágio",
        "Estagio",
        "Monitoramento",
        "Processo Seletivo",
        "PROCESSO SELETIVO",
        "Supervisor",
        "Operacional",
        "Recursos Humanos",
        "RH"
      ]
      const permitida = funcoesPermitidas.some(f => f.toLowerCase() === roleNorm.toLowerCase())
      if (!permitida) return false
    }

    // Filtro por texto de pesquisa
    if (filtroPesquisaAluno.trim()) {
      const termo = filtroPesquisaAluno.toLowerCase()
      const matchNome = (aluno.nome || "").toLowerCase().includes(termo)
      const matchEmail = (aluno.email || "").toLowerCase().includes(termo)
      const matchFuncao = (aluno.funcao || "").toLowerCase().includes(termo)
      return matchNome || matchEmail || matchFuncao
    }

    return true
  })

  // Lista de funções disponíveis para as abas dos gestores (normalizadas em MAIÚSCULO)
  const funcoesAbas = useMemo(() => {
    if (!isGestorTreinamento) return []
    const mapa = new Map<string, number>()
    alunosVisiveisBase.forEach(aluno => {
      let f = (aluno.funcao || "OUTROS").trim().toUpperCase()
      if (f === "ESTAGIO") f = "ESTÁGIO"
      if (f === "RH") f = "RECURSOS HUMANOS"
      mapa.set(f, (mapa.get(f) || 0) + 1)
    })
    return Array.from(mapa.entries()).map(([nome, count]) => ({ nome, count }))
  }, [alunosVisiveisBase, isGestorTreinamento])

  // Lista final exibida de acordo com a aba de função selecionada
  const progressoFiltrado = useMemo(() => {
    if (!isGestorTreinamento || abaFuncaoSelecionada === "TODAS") {
      return alunosVisiveisBase
    }
    return alunosVisiveisBase.filter(aluno => {
      let f = (aluno.funcao || "OUTROS").trim().toUpperCase()
      if (f === "ESTAGIO") f = "ESTÁGIO"
      if (f === "RH") f = "RECURSOS HUMANOS"
      return f === abaFuncaoSelecionada
    })
  }, [alunosVisiveisBase, abaFuncaoSelecionada, isGestorTreinamento])

  // Lista de usuários para o select de agendamento de liberação
  const usuariosDisponiveisParaLiberacao = painelUsuarios
    .filter(u => {
      // Usuários desativados no sistema não devem constar no select de liberação
      if (u.status === "INATIVO") {
        return false
      }
      if (!podeVerCorretorPJ) {
        const regime = (u.regime_contratacao || "").toUpperCase().trim()
        const role = (u.funcao || "").trim()
        if (role === "Corretor" && regime.includes("PJ")) {
          return false
        }
      }
      return true
    })
    .sort((a, b) => (a.nome || "").localeCompare(b.nome || ""))

  // Scroll to the top of the lesson whenever the user changes the day
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" })
    const topEl = document.getElementById("inicio-aula")
    if (topEl) {
      topEl.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [selectedDia])

  // Helper para salvar ou atualizar registro no Supabase via API Route
  const sincronizarSupabase = async (
    dia: number,
    dados: {
      resposta_aberta?: string
      decisao_opcao_idx?: number
      decisao_opcao_texto?: string
      decisao_acertou?: boolean
      concluido?: boolean
      data_hora_entrada?: string
      data_hora_conclusao?: string
    }
  ) => {
    try {
      let targetUserId = user?.id || perfil?.id
      let currentNome = perfil?.nome || user?.user_metadata?.nome_completo || user?.user_metadata?.username || ""
      let currentEmail = user?.email || perfil?.email || ""
      let currentRegime = perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || ""

      if (!targetUserId) {
        const { data: authData } = await supabase.auth.getUser()
        if (authData?.user) {
          targetUserId = authData.user.id
          currentNome = authData.user.user_metadata?.nome_completo || authData.user.user_metadata?.username || currentNome
          currentEmail = authData.user.email || currentEmail
          currentRegime = authData.user.user_metadata?.regime_contratacao || currentRegime
        }
      }

      if (!targetUserId) {
        console.warn("Usuário não identificado para salvar treinamento.")
        return
      }

      const payload: any = {
        user_id: targetUserId,
        usuario_nome: currentNome,
        usuario_email: currentEmail,
        regime_contratacao: currentRegime,
        modulo: 1,
        dia: dia,
      }

      if (dados.resposta_aberta !== undefined) {
        payload.resposta_aberta = dados.resposta_aberta
      }
      if (dados.decisao_opcao_idx !== undefined) {
        payload.decisao_opcao_idx = dados.decisao_opcao_idx
        payload.decisao_opcao_texto = dados.decisao_opcao_texto || ""
        payload.decisao_acertou = dados.decisao_acertou ?? false
      }
      if (dados.concluido) {
        payload.concluido = true
      }
      if (dados.data_hora_entrada) {
        payload.data_hora_entrada = dados.data_hora_entrada
      }
      if (dados.data_hora_conclusao) {
        payload.data_hora_conclusao = dados.data_hora_conclusao
      }

      const res = await fetch("/api/treinamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json()
        console.error("Erro ao salvar treinamento:", errData)
      }
    } catch (err) {
      console.error("Falha ao salvar no Supabase:", err)
    }
  }

  // Registra o horário de 'Início' no momento em que o colaborador/aluno entra no DIA/aula
  useEffect(() => {
    if (!iniciouCurso || !selectedDia || carregandoDados) return
    const targetUserId = user?.id || perfil?.id
    if (!targetUserId) return

    // Se este dia já tem data_hora_entrada registrada, preserva e não sobrescreve
    if (datasEntrada[selectedDia]) return

    const agoraIso = new Date().toISOString()
    setDatasEntrada(prev => ({ ...prev, [selectedDia]: agoraIso }))
    sincronizarSupabase(selectedDia, { data_hora_entrada: agoraIso })
  }, [iniciouCurso, selectedDia, carregandoDados, datasEntrada, user?.id, perfil?.id])

  const handleSalvarResposta = async (dia: number, texto: string) => {
    const updated = { ...respostasAbertas, [dia]: texto }
    setRespostasAbertas(updated)
    setSavedStatus("Resposta salva com sucesso!")
    setTimeout(() => setSavedStatus(null), 3000)

    // Persiste exclusivamente no Supabase sem concluir o dia prematuramente
    await sincronizarSupabase(dia, {
      resposta_aberta: texto
    })
  }

  const handleTomarDecisao = async (dia: number, opcaoIndex: number) => {
    const updated = { ...decisoesTomadas, [dia]: opcaoIndex }
    setDecisoesTomadas(updated)

    const diaInfo = DIAS_TREINAMENTO.find(d => d.dia === dia)
    const textoOpcao = diaInfo?.decisao.opcoes[opcaoIndex] || ""
    const acertou = opcaoIndex === diaInfo?.decisao.respostaCorreta

    // Persiste exclusivamente no Supabase sem concluir o dia prematuramente
    await sincronizarSupabase(dia, {
      decisao_opcao_idx: opcaoIndex,
      decisao_opcao_texto: textoOpcao.replace(/^[A-Za-z]\)\s*/, ""),
      decisao_acertou: acertou
    })
  }

  const salvarAvaliacaoNoSupabase = async (
    diaAvaliacao: 11 | 22,
    abertas: Record<number, string>,
    escolhas: Record<number, number>,
    concluido: boolean = false
  ) => {
    try {
      let targetUserId = user?.id || perfil?.id
      if (!targetUserId) return

      const questoes = diaAvaliacao === 11 ? QUESTOES_AVALIACAO_1 : QUESTOES_AVALIACAO_2
      const questoesEscolha = questoes.filter(q => q.tipo === "escolha")

      let acertosCount = 0
      questoesEscolha.forEach(q => {
        if (escolhas[q.numero] === q.respostaCorreta) {
          acertosCount++
        }
      })

      const payload: any = {
        action: "salvar_avaliacao",
        user_id: targetUserId,
        usuario_nome: perfil?.nome || user?.user_metadata?.nome_completo || "",
        usuario_email: user?.email || perfil?.email || "",
        regime_contratacao: perfil?.regime_contratacao || user?.user_metadata?.regime_contratacao || "",
        modulo: 1,
        dia: diaAvaliacao,
        respostas_abertas: abertas,
        respostas_escolha: escolhas,
        acertos: acertosCount,
        total_questoes_escolha: questoesEscolha.length,
        concluido: Boolean(concluido),
        data_hora_entrada: datasEntrada[diaAvaliacao] || new Date().toISOString()
      }

      if (concluido) {
        payload.data_hora_conclusao = new Date().toISOString()
      }

      await fetch("/api/treinamento", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error(`Erro ao sincronizar avaliação ${diaAvaliacao}:`, err)
    }
  }

  const handleSalvarRespostaAv1 = async (num: number, texto: string) => {
    const updated = { ...respostasAbertasAv1, [num]: texto }
    setRespostasAbertasAv1(updated)
    setAv1SalvaStatus("Resposta salva!")
    setTimeout(() => setAv1SalvaStatus(null), 2500)

    await salvarAvaliacaoNoSupabase(11, updated, respostasEscolhaAv1, false)
  }

  const handleSelecionarOpcaoAv1 = async (num: number, optIdx: number) => {
    const updated = { ...respostasEscolhaAv1, [num]: optIdx }
    setRespostasEscolhaAv1(updated)

    await salvarAvaliacaoNoSupabase(11, respostasAbertasAv1, updated, false)
  }

  const handleSalvarRespostaAv2 = async (num: number, texto: string) => {
    const updated = { ...respostasAbertasAv2, [num]: texto }
    setRespostasAbertasAv2(updated)
    setAv2SalvaStatus("Resposta salva!")
    setTimeout(() => setAv2SalvaStatus(null), 2500)

    await salvarAvaliacaoNoSupabase(22, updated, respostasEscolhaAv2, false)
  }

  const handleSelecionarOpcaoAv2 = async (num: number, optIdx: number) => {
    const updated = { ...respostasEscolhaAv2, [num]: optIdx }
    setRespostasEscolhaAv2(updated)

    await salvarAvaliacaoNoSupabase(22, respostasAbertasAv2, updated, false)
  }

  const handleAvancarProximoDia = async () => {
    const diaAtual = currentDiaData.dia

    // Tratamento especial para o Dia 11 (Avaliação 1)
    if (diaAtual === 11) {
      if (!diasConcluidos.includes(11)) {
        if (!isIsentoNavegacao) {
          const abertasFaltando = [1, 11, 12].some(n => !(respostasAbertasAv1[n] || "").trim())
          const escolhasFaltando = [2, 3, 4, 5, 6, 7, 8, 9, 10].some(n => respostasEscolhaAv1[n] === undefined || respostasEscolhaAv1[n] === null)
          if (abertasFaltando || escolhasFaltando) {
            setAv1ValidacaoErro("Por favor, responda todas as questões da Avaliação 1 antes de finalizar.")
            setTimeout(() => setAv1ValidacaoErro(null), 5000)
            return
          }
        }
        const agoraIso = new Date().toISOString()
        const newConcluidos = [...diasConcluidos, 11]
        setDiasConcluidos(newConcluidos)
        setDatasConclusao(prev => ({ ...prev, [11]: agoraIso }))
        await salvarAvaliacaoNoSupabase(11, respostasAbertasAv1, respostasEscolhaAv1, true)
        await sincronizarSupabase(11, { concluido: true, data_hora_conclusao: agoraIso })

        if (!isIsentoLimiteDiario) {
          setIniciouCurso(false)
          return
        }
      }
      setSelectedDia(12)
      return
    }

    // Tratamento especial para o Dia 22 (Avaliação 2)
    if (diaAtual === 22) {
      if (!diasConcluidos.includes(22)) {
        if (!isIsentoNavegacao) {
          const abertasFaltando = [11, 12, 13, 14].some(n => !(respostasAbertasAv2[n] || "").trim())
          const escolhasFaltando = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].some(n => respostasEscolhaAv2[n] === undefined || respostasEscolhaAv2[n] === null)
          if (abertasFaltando || escolhasFaltando) {
            setAv2ValidacaoErro("Por favor, responda todas as questões da Avaliação 2 antes de finalizar.")
            setTimeout(() => setAv2ValidacaoErro(null), 5000)
            return
          }
        }
        const agoraIso = new Date().toISOString()
        const newConcluidos = [...diasConcluidos, 22]
        setDiasConcluidos(newConcluidos)
        setDatasConclusao(prev => ({ ...prev, [22]: agoraIso }))
        await salvarAvaliacaoNoSupabase(22, respostasAbertasAv2, respostasEscolhaAv2, true)
        await sincronizarSupabase(22, { concluido: true, data_hora_conclusao: agoraIso })

        if (!isIsentoLimiteDiario) {
          setIniciouCurso(false)
          return
        }
      }
      return
    }

    const respostaAtual = (respostasAbertas[diaAtual] || "").trim()
    const decisaoAtual = decisoesTomadas[diaAtual]

    // O encerramento/conclusão do dia ocorre exclusivamente ao clicar em 'Próximo Dia'
    if (!diasConcluidos.includes(diaAtual)) {
      if (!isIsentoNavegacao && (!respostaAtual || decisaoAtual === undefined || decisaoAtual === null)) {
        return
      }
      const agoraIso = new Date().toISOString()
      const newConcluidos = [...diasConcluidos, diaAtual]
      setDiasConcluidos(newConcluidos)
      setDatasConclusao(prev => ({ ...prev, [diaAtual]: agoraIso }))
      await sincronizarSupabase(diaAtual, {
        concluido: true,
        data_hora_conclusao: agoraIso,
        resposta_aberta: respostaAtual || undefined,
        decisao_opcao_idx: decisaoAtual !== undefined && decisaoAtual !== null ? decisaoAtual : undefined
      })

      // Se o usuário não for isento (ou seja, é CLT, Estágio, Processo Seletivo, etc.)
      // o próximo dia só será liberado no próximo dia útil. Volta para a tela inicial informando o status.
      if (!isIsentoLimiteDiario) {
        setIniciouCurso(false)
        return
      }
    }
    setSelectedDia(prev => Math.min(22, prev + 1))
  }

  const currentDiaData = DIAS_TREINAMENTO.find(d => d.dia === selectedDia) || DIAS_TREINAMENTO[0]

  // Acesso à página: usuários autorizados (Desenvolvedor, Administrador, Supervisor, Operacional, Monitoramento, Corretor CLT/PJ, Estágio, RH)
  if (!temAcessoTreinamento) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Área Restrita: Treinamento</h1>
        <p className="text-sm text-slate-500 max-w-md">
          Seu perfil não possui permissão para acessar o Treinamento.
        </p>
      </div>
    )
  }

  // Se o usuário ainda não clicou em COMEÇAR ou CONTINUAR (ex: ao acessar pelo sidebar)
  if (!iniciouCurso) {
    const totalConcluidos = diasConcluidos.length
    const progressoPercentual = Math.round((totalConcluidos / 22) * 100)
    const diaInfoAtivo = DIAS_TREINAMENTO.find(d => d.dia === diaAtivoEmCurso)

    // Painel de Controle unificado (Gestores e Participantes):
    // Gestores visualizam a equipe de acordo com as regras de gestão.
    // Participantes (Corretores CLT/PJ, Estagiários, Processo Seletivo, Monitoramento) visualizam apenas o seu próprio progresso individual.
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col pb-16">
        <Header title="TREINAMENTO" />

        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Header do Painel de Controle */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                {isGestorTreinamento ? "Painel de Gestão" : "Painel do Aluno"}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {isGestorTreinamento ? "Painel de Controle de Treinamento" : "Meu Painel de Treinamento"}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                {isGestorTreinamento
                  ? "Gerencie a programação e liberação de aulas para os usuários e acompanhe em tempo real o progresso e o desempenho de gabarito dos alunos."
                  : "Acompanhe seu progresso de aprendizado, histórico de gabarito e status de liberação das suas aulas."}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedDia(diaAtivoEmCurso || 1)
                  setIniciouCurso(true)
                }}
                className="inline-flex items-center gap-2 bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-3 px-5 rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-[#00D492]" />
                <span>
                  {totalConcluidos === 0
                    ? "Iniciar Treinamento"
                    : isGestorTreinamento
                    ? "Acessar Conteúdo das Aulas"
                    : "Continuar o Treinamento"}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ACOMPANHAMENTO DE PROGRESSO E GABARITO */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                    {isGestorTreinamento ? "Acompanhamento de Progresso e Gabarito" : "Meu Progresso e Gabarito"}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {isGestorTreinamento
                      ? "Visualização detalhada dos alunos que já iniciaram o treinamento (com pelo menos 1 dia concluído)."
                      : "Histórico detalhado das suas aulas concluídas, taxa de acerto e respostas reflexivas."}
                  </p>
                </div>
              </div>

              {/* Filtro de Busca e Gabarito Oficial (Apenas para Gestores com múltiplos alunos) */}
              {isGestorTreinamento && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalGabaritoAv1Aberto(true)}
                      className="inline-flex items-center justify-center gap-2 bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#00D492]" />
                      <span>Gabarito Oficial — Dia 11</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalGabaritoAv2Aberto(true)}
                      className="inline-flex items-center justify-center gap-2 bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-2 px-3.5 rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#00D492]" />
                      <span>Gabarito Oficial — Dia 22</span>
                    </button>
                  </div>

                  <div className="w-full sm:w-72">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por nome, e-mail ou perfil..."
                        value={filtroPesquisaAluno}
                        onChange={e => setFiltroPesquisaAluno(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

              {/* Abas de Navegação por Função do Aluno (Gestores) */}
              {isGestorTreinamento && funcoesAbas.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-b border-slate-100 scrollbar-thin scrollbar-thumb-slate-200">
                  <button
                    type="button"
                    onClick={() => setAbaFuncaoSelecionada("TODAS")}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                      abaFuncaoSelecionada === "TODAS"
                        ? "bg-[#0F172B] text-white shadow-xs"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <span>TODAS AS FUNÇÕES</span>
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
                        abaFuncaoSelecionada === "TODAS"
                          ? "bg-white/20 text-white"
                          : "bg-white text-slate-700 border border-slate-200"
                      )}
                    >
                      {alunosVisiveisBase.length}
                    </span>
                  </button>

                  {funcoesAbas.map(f => (
                    <button
                      key={f.nome}
                      type="button"
                      onClick={() => setAbaFuncaoSelecionada(f.nome)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                        abaFuncaoSelecionada === f.nome
                          ? "bg-[#0F172B] text-white shadow-xs"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900"
                      )}
                    >
                      <span>{f.nome}</span>
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
                          abaFuncaoSelecionada === f.nome
                            ? "bg-white/20 text-white"
                            : "bg-white text-slate-700 border border-slate-200"
                        )}
                      >
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {painelCarregando ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-slate-300 border-t-[#0F172B] rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-semibold">Carregando dados...</p>
                </div>
              ) : progressoFiltrado.length === 0 ? (
                <div className="py-12 text-center space-y-2 bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">
                    {isGestorTreinamento
                      ? (abaFuncaoSelecionada !== "TODAS"
                          ? `Nenhum aluno com a função "${abaFuncaoSelecionada}" com progresso registrado`
                          : "Nenhum aluno com progresso registrado")
                      : "Nenhum progresso registrado ainda"}
                  </p>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {isGestorTreinamento
                      ? "Os alunos aparecerão nesta lista assim que concluírem pelo menos uma aula do treinamento."
                      : "Clique em 'Iniciar Treinamento' para acessar sua primeira aula e registrar seu progresso."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {(() => {
                    const alunosElegiveis = progressoFiltrado.map(aluno => {
                      const maxDiaConcluido = Math.max(...aluno.historico.map((h: any) => Number(h.dia)), 0)
                      const proximoDia = maxDiaConcluido + 1
                      const lib = proximoDia <= 22 ? painelLiberacoes.find(
                        (l: any) => l.dia === proximoDia && (l.usuario_id === aluno.user_id || l.usuario_id === "ALL")
                      ) : null
                      return { aluno, proximoDia, lib }
                    }).filter(item => item.proximoDia <= 22)

                    const pendentesDesbloqueio = alunosElegiveis.filter(item => !item.lib)
                    const liberadosParaRevogar = alunosElegiveis.filter(item => !!item.lib)

                    return (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="text-xs font-bold text-slate-500">
                          {isGestorTreinamento
                            ? `Mostrando ${progressoFiltrado.length} ${progressoFiltrado.length === 1 ? "aluno" : "alunos"}`
                            : "Seu Registro Individual"}
                        </div>

                        {isGestorTreinamento && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {pendentesDesbloqueio.length > 0 && (
                              <button
                                type="button"
                                disabled={acaoMassaCarregando !== null}
                                onClick={() =>
                                  handleLiberarProximaAulaTodos(
                                    pendentesDesbloqueio.map(p => ({
                                      dia: p.proximoDia,
                                      usuario_id: p.aluno.user_id,
                                      usuario_nome: p.aluno.nome
                                    }))
                                  )
                                }
                                className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>
                                  {acaoMassaCarregando === "liberar"
                                    ? "Desbloqueando..."
                                    : `Desbloquear Próxima Aula para Todos (${pendentesDesbloqueio.length})`}
                                </span>
                              </button>
                            )}

                            {liberadosParaRevogar.length > 0 && (
                              <button
                                type="button"
                                disabled={acaoMassaCarregando !== null}
                                onClick={() =>
                                  handleBloquearProximaAulaTodos(
                                    liberadosParaRevogar.map(p => p.lib.id)
                                  )
                                }
                                className="inline-flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 font-bold text-xs px-3.5 py-2 rounded-xl border border-rose-200 transition-all cursor-pointer shadow-2xs"
                                title="Revogar liberação da próxima aula de todos os alunos"
                              >
                                <Lock className="w-3.5 h-3.5 text-rose-600" />
                                <span>
                                  {acaoMassaCarregando === "bloquear"
                                    ? "Bloqueando..."
                                    : `Bloquear para Revogar (${liberadosParaRevogar.length})`}
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                    {progressoFiltrado.map(aluno => {
                      const isExpandido = usuarioExpandidoId === aluno.user_id
                      const dataUltima = aluno.ultimaConclusaoIso
                        ? new Date(aluno.ultimaConclusaoIso).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })
                        : "-"

                      return (
                        <div key={aluno.user_id} className="bg-white hover:bg-slate-50/50 transition-colors">
                          <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {isGestorTreinamento ? (
                              <>
                                {/* Aluno & Perfil */}
                                <div className="min-w-[240px] space-y-1">
                                  <div className="text-sm font-black text-slate-900">
                                    {aluno.nome}
                                  </div>
                                  <div className="text-xs text-slate-500 font-medium">
                                    {aluno.email}
                                  </div>
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                                      {aluno.funcao}
                                    </span>
                                    {aluno.regime_contratacao && (
                                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                                        {aluno.regime_contratacao}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Progresso Concluído (Apenas para Gestores) */}
                                <div className="min-w-[200px] space-y-1.5">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700">Aulas Concluídas</span>
                                    <span className="font-black text-slate-900">{aluno.totalDiasConcluidos} de 22 ({aluno.percentual}%)</span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                      style={{ width: `${aluno.percentual}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Gabarito / Tomada de Decisão (Gestores) */}
                                <div className="min-w-[240px] space-y-1">
                                  <div className="text-xs font-bold text-slate-700 text-center">
                                    Acertos no Gabarito
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={cn(
                                        "inline-flex items-center justify-center w-[240px] py-1 rounded-lg text-xs font-black uppercase tracking-wider border",
                                        aluno.taxaAcerto >= 80
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                          : aluno.taxaAcerto >= 50
                                          ? "bg-amber-50 text-amber-800 border-amber-300"
                                          : "bg-rose-50 text-rose-800 border-rose-300"
                                      )}
                                    >
                                      {aluno.totalAcertos} de {aluno.totalQuestoes} ({aluno.taxaAcerto}%)
                                    </span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              /* Acertos no Gabarito (Participantes) - No lugar do Nome/Email/Etiquetas, alinhado à esquerda com o dobro da largura */
                              <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-700 text-left">
                                  Acertos no Gabarito
                                </div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      "inline-flex items-center justify-center w-[480px] max-w-full py-1 rounded-lg text-xs font-black uppercase tracking-wider border",
                                      aluno.taxaAcerto >= 80
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                        : aluno.taxaAcerto >= 50
                                        ? "bg-amber-50 text-amber-800 border-amber-300"
                                        : "bg-rose-50 text-rose-800 border-rose-300"
                                    )}
                                  >
                                    {aluno.totalAcertos} de {aluno.totalQuestoes} ({aluno.taxaAcerto}%)
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Última Atividade & Ação */}
                            <div className="flex items-center justify-between lg:justify-end gap-3 min-w-[200px]">
                              <div className="text-right hidden sm:block space-y-0.5">
                                <div className="text-[11px] font-bold text-slate-400 uppercase">Última Aula</div>
                                <div className="text-xs font-bold text-slate-700">{dataUltima}</div>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  setUsuarioExpandidoId(isExpandido ? null : aluno.user_id)
                                }
                                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow ml-10"
                              >
                                <span>{isExpandido ? "Ocultar" : "Ver Gabarito"}</span>
                                {isExpandido ? (
                                  <ChevronUp className="w-3.5 h-3.5 text-white" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-white" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Detalhes expandidos com o histórico do gabarito e respostas reflexivas */}
                          {isExpandido && (
                            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 space-y-4">
                              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>Histórico de Respostas e Gabarito do Aluno</span>
                              </h4>

                              <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                                {aluno.historico.map((item: any) => {
                                  const diaInfo = DIAS_TREINAMENTO.find(d => d.dia === item.dia)
                                  const inicioRaw = item.data_hora_entrada || item.created_at
                                  const conclusaoRaw = item.concluido ? (item.data_hora_conclusao || item.updated_at) : null

                                  const dataInicioObj = inicioRaw ? new Date(inicioRaw) : null
                                  const dataConclusaoObj = conclusaoRaw ? new Date(conclusaoRaw) : null

                                  const dataStr = (dataConclusaoObj || dataInicioObj)?.toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric"
                                  }) || "-"

                                  const horaInicioStr = dataInicioObj
                                    ? dataInicioObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                    : "--:--"

                                  const horaConclusaoStr = dataConclusaoObj
                                    ? dataConclusaoObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                                    : "--:--"

                                  return (
                                    <div
                                      key={item.dia}
                                      className="w-[320px] sm:w-[380px] shrink-0 bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs flex flex-col justify-between"
                                    >
                                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                        <div className="font-black text-xs text-slate-900">
                                          DIA {item.dia}: {diaInfo?.titulo || "Aula"}
                                        </div>
                                        <span
                                          className={cn(
                                            "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                            item.decisao_acertou
                                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                              : "bg-rose-50 text-rose-800 border-rose-200"
                                          )}
                                        >
                                          {item.decisao_acertou ? "✓ Gabarito Correto" : "✕ Gabarito Incorreto"}
                                        </span>
                                      </div>

                                      {/* Resposta de Tomada de Decisão */}
                                      <div className="space-y-1">
                                        <div className="text-[11px] font-bold text-slate-500 uppercase">
                                          Opção Escolhida na Tomada de Decisão:
                                        </div>
                                        <div className="text-xs font-semibold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                                          {item.decisao_opcao_texto || "Opção registrada"}
                                        </div>
                                      </div>

                                      {/* Resposta Reflexiva Aberta */}
                                      {item.resposta_aberta && (
                                        <div className="space-y-1">
                                          <div className="text-[11px] font-bold text-slate-500 uppercase">
                                            Resposta Reflexiva do Aluno:
                                          </div>
                                          <div className="text-xs text-slate-700 italic bg-blue-50/50 p-2.5 rounded-xl border border-blue-100 leading-relaxed">
                                            "{item.resposta_aberta}"
                                          </div>
                                        </div>
                                      )}

                                      <div className="text-[11px] text-slate-500 font-medium pt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 border-t border-slate-100">
                                        <span><strong className="font-semibold text-slate-700">Data:</strong> {dataStr}</span>
                                        <span className="text-slate-300">•</span>
                                        <span><strong className="font-semibold text-slate-700">Início:</strong> {horaInicioStr}</span>
                                        <span className="text-slate-300">•</span>
                                        <span><strong className="font-semibold text-slate-700">Conclusão:</strong> {horaConclusaoStr}</span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>

                              {/* Card / Botão para liberar a próxima aula */}
                              {(() => {
                                const maxDiaConcluido = Math.max(...aluno.historico.map((h: any) => Number(h.dia)), 0)
                                const proximoDia = maxDiaConcluido + 1

                                if (proximoDia > 22) {
                                  return (
                                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                                      <Award className="w-5 h-5 text-emerald-600 shrink-0" />
                                      <div>
                                        <div className="text-xs font-black text-emerald-900">
                                          Treinamento Concluído!
                                        </div>
                                        <div className="text-[11px] text-emerald-700 font-medium">
                                          {isGestorTreinamento ? "Este aluno já concluiu todas as 22 aulas do programa." : "Parabéns! Você concluiu com sucesso todas as 22 aulas do treinamento comercial."}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                }

                                const proximoDiaInfo = DIAS_TREINAMENTO.find(d => d.dia === proximoDia)
                                const libExistente = painelLiberacoes.find(
                                  (l: any) => l.dia === proximoDia && (l.usuario_id === aluno.user_id || l.usuario_id === "ALL")
                                )
                                const estaCarregando = liberandoAlunoKey === `${aluno.user_id}_${proximoDia}`
                                const statusProximoDia = calcularLiberacaoDia(proximoDia)

                                return (
                                  <div className="p-4 bg-white border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                          Próxima Aula
                                        </span>
                                        <span className="text-xs font-black text-slate-900">
                                          DIA {proximoDia}: {proximoDiaInfo?.titulo || "Aula Seguinte"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 font-medium">
                                        {isGestorTreinamento
                                          ? (libExistente
                                              ? "Esta aula foi liberada manualmente para o aluno e já está disponível para realização."
                                              : "A aula está bloqueada para realização. Clique no botão ao lado para liberar imediatamente.")
                                          : (statusProximoDia.liberado
                                              ? "Esta aula está liberada e pronta para você realizar agora."
                                              : (statusProximoDia.mensagemBloqueio || "Disponível no próximo dia útil."))}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {isGestorTreinamento ? (
                                        libExistente ? (
                                          <div className="flex items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
                                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                              Aula {proximoDia} Liberada
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoverLiberacao(libExistente.id)}
                                              className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-3 py-2 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                                              title="Bloquear novamente esta aula"
                                            >
                                              Bloquear
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            disabled={estaCarregando}
                                            onClick={() => handleLiberarProximaAula(aluno, proximoDia)}
                                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow"
                                          >
                                            <Unlock className="w-4 h-4" />
                                            <span>{estaCarregando ? "Liberando..." : `Liberar Aula do DIA ${proximoDia}`}</span>
                                          </button>
                                        )
                                      ) : (
                                        statusProximoDia.liberado ? (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setSelectedDia(proximoDia)
                                              setIniciouCurso(true)
                                            }}
                                            className="inline-flex items-center gap-2 bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-xs hover:shadow"
                                          >
                                            <BookOpen className="w-3.5 h-3.5 text-[#00D492]" />
                                            <span>Iniciar DIA {proximoDia}</span>
                                          </button>
                                        ) : (
                                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl">
                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Disponível no próximo dia útil.</span>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )
                              })()}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )
    }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      <Header title="TREINAMENTO" />

      {/* Top Header Anchor */}
      <div id="inicio-aula" className="scroll-mt-20" />

      {/* Top Header Banner */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Aulas Concluídas
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Clique na etiqueta do dia concluído para revisitar o conteúdo quando desejar.
                </p>
              </div>
              {/* Botão de Início liberado se não estiver em aula ativa não concluída ou para perfis isentos */}
              {(!isAulaAtivaNaoConcluida || isIsentoBloqueioGeral) && (
                <button
                  type="button"
                  onClick={() => setIniciouCurso(false)}
                  className="text-xs text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg shrink-0"
                >
                  <span>← Painel de Controle</span>
                </button>
              )}
            </div>

            {/* Barra com dias concluídos e o dia ativo atual em curso */}
            <div className="flex items-center gap-2 overflow-x-auto p-[5px] scrollbar-thin">
              {isIsentoNavegacao ? (
                Array.from({ length: 22 }, (_, i) => i + 1).map(diaNum => {
                  const isCurrent = diaNum === selectedDia
                  const isConcluido = diasConcluidos.includes(diaNum)
                  return (
                    <button
                      key={diaNum}
                      type="button"
                      onClick={() => setSelectedDia(diaNum)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5",
                        isCurrent
                          ? "bg-[#0F172B] text-white shadow-xs ring-2 ring-slate-900/30"
                          : isConcluido
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100"
                          : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                      )}
                      title={`Acessar DIA ${diaNum}`}
                    >
                      {isConcluido && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      <span>DIA {diaNum}</span>
                    </button>
                  )
                })
              ) : (
                <>
                  {diasConcluidos
                    .slice()
                    .sort((a, b) => a - b)
                    .map(diaNum => {
                      const isCurrent = diaNum === selectedDia
                      return (
                        <button
                          key={diaNum}
                          type="button"
                          onClick={() => setSelectedDia(diaNum)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100",
                            isCurrent && "ring-2 ring-emerald-500/50"
                          )}
                          title={`Revisitar o DIA ${diaNum}`}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>DIA {diaNum}</span>
                        </button>
                      )
                    })}

                  {/* Dia Ativo (Em curso) */}
                  {!diasConcluidos.includes(diaAtivoEmCurso) && (
                    statusLiberacaoDiaAtivo.liberado ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDia(diaAtivoEmCurso)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 bg-[#0F172B] hover:bg-slate-800 text-white shadow-xs"
                        title={`Ir para o DIA ${diaAtivoEmCurso}`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-[#00D492]" />
                        <span>DIA {diaAtivoEmCurso}</span>
                      </button>
                    ) : (
                      <div
                        className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-300 opacity-80 cursor-not-allowed"
                        title={`DIA ${diaAtivoEmCurso}: ${statusLiberacaoDiaAtivo.mensagemBloqueio}`}
                      >
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>DIA {diaAtivoEmCurso}</span>
                      </div>
                    )
                  )}
                </>
              )}
            </div>
          </div>

          {/* MODAL DO GABARITO OFICIAL DA AVALIAÇÃO 1 (EXCLUSIVO PARA GESTORES) */}
          {isGestorTreinamento && modalGabaritoAv1Aberto && (
            <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header do Modal */}
                <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                        DIA 11
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                        GABARITO OFICIAL
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-2">
                      AVALIAÇÃO 1 — Gabarito e Critérios de Correção
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Fundamentos, margens, cálculo básico e leitura inicial de oportunidades • Acesso exclusivo para Gestores (Administrador, RH, Supervisor, Operacional e Desenvolvedor)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalGabaritoAv1Aberto(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo do Modal */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {/* Quadro de Orientação do Supervisor e RH */}
                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl p-4 space-y-1 shadow-xs">
                    <div className="text-xs font-black text-amber-900 uppercase tracking-wider">
                      LEITURA DO SUPERVISOR E RH
                    </div>
                    <p className="text-xs text-amber-950 font-medium leading-relaxed">
                      Mais importante que a nota isolada: observar se o aluno confunde margem com dinheiro, cria promessa sem validação, escolhe sempre a maior liberação, ainda mistura nomenclaturas ou consegue explicar o raciocínio com linguagem própria.
                    </p>
                  </div>

                  {/* Lista com as 12 Questões */}
                  <div className="space-y-5">
                    {QUESTOES_AVALIACAO_1.map((q) => {
                      if (q.tipo === "aberta") {
                        return (
                          <div key={q.numero} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black text-[#0F172B] uppercase tracking-wider">
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                              <span>{q.titulo} (Questão Aberta)</span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900">
                              {q.pergunta}
                            </p>
                            <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl text-xs space-y-1">
                              <p className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">
                                {q.gabarito}
                              </p>
                              <p className="text-emerald-950 font-medium leading-relaxed">
                                {q.criterioEsperado}
                              </p>
                            </div>
                          </div>
                        )
                      }

                      // Múltipla escolha
                      return (
                        <div key={q.numero} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                          <div className="flex items-center gap-2 text-xs font-black text-[#0F172B] uppercase tracking-wider">
                            <HelpCircle className="w-4 h-4 text-blue-600" />
                            <span>{q.titulo} (Múltipla Escolha)</span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900">
                            {q.pergunta}
                          </p>
                          <div className="space-y-1.5 pt-1">
                            {q.opcoes?.map((opcao, optIdx) => {
                              const isCorrect = optIdx === q.respostaCorreta
                              return (
                                <div
                                  key={optIdx}
                                  className={cn(
                                    "p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border",
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                                      : "bg-slate-50 border-slate-200 text-slate-600"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0",
                                      isCorrect
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-600"
                                    )}
                                  >
                                    {isCorrect ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{opcao.replace(/^[A-Za-z]\)\s*/, "")}</span>
                                  {isCorrect && (
                                    <span className="ml-auto text-[10px] font-black uppercase text-emerald-700">
                                      Alternativa Correta
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs space-y-1 mt-2">
                            <p className="font-bold text-[#00D492] uppercase tracking-wider text-[10px]">
                              {q.gabarito}
                            </p>
                            <p className="text-slate-200 leading-relaxed">
                              {q.criterioEsperado}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer do Modal */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalGabaritoAv1Aberto(false)}
                    className="bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-xl transition-all cursor-pointer"
                  >
                    Fechar Gabarito
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* MODAL DO GABARITO OFICIAL DA AVALIAÇÃO 2 (EXCLUSIVO PARA GESTORES) */}
          {isGestorTreinamento && modalGabaritoAv2Aberto && (
            <div className="fixed inset-0 z-[300] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
                {/* Header do Modal */}
                <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                        DIA 22
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                        GABARITO OFICIAL
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-2">
                      AVALIAÇÃO 2 — Gabarito e Critérios de Correção
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Autonomia inicial, comportamento comercial e raciocínio integrado • Acesso exclusivo para Gestores (Administrador, RH, Supervisor, Operacional e Desenvolvedor)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalGabaritoAv2Aberto(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Conteúdo do Modal */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {/* Quadro de Orientação do Supervisor e RH */}
                  <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-2xl p-4 space-y-1 shadow-xs">
                    <div className="text-xs font-black text-amber-900 uppercase tracking-wider">
                      LEITURA DO SUPERVISOR E RH
                    </div>
                    <p className="text-xs text-amber-950 font-medium leading-relaxed">
                      Comparar nota objetiva com qualidade das respostas abertas. Pontos de atenção: excesso de confiança, promessa antes de consulta, dificuldade em explicar conceitos com palavras próprias, baixa adaptação ao cliente, tendência a argumentar em vez de diagnosticar e incapacidade de reconhecer limite técnico.
                    </p>
                  </div>

                  {/* Lista com as 14 Questões */}
                  <div className="space-y-5">
                    {QUESTOES_AVALIACAO_2.map((q) => {
                      if (q.tipo === "aberta") {
                        return (
                          <div key={q.numero} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                            <div className="flex items-center gap-2 text-xs font-black text-[#0F172B] uppercase tracking-wider">
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                              <span>{q.titulo} (Questão Aberta)</span>
                            </div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900">
                              {q.pergunta}
                            </p>
                            <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl text-xs space-y-1">
                              <p className="font-bold text-emerald-800 uppercase tracking-wider text-[10px]">
                                {q.gabarito}
                              </p>
                              <p className="text-emerald-950 font-medium leading-relaxed">
                                {q.criterioEsperado}
                              </p>
                            </div>
                          </div>
                        )
                      }

                      // Múltipla escolha
                      return (
                        <div key={q.numero} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                          <div className="flex items-center gap-2 text-xs font-black text-[#0F172B] uppercase tracking-wider">
                            <HelpCircle className="w-4 h-4 text-blue-600" />
                            <span>{q.titulo} (Múltipla Escolha)</span>
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-slate-900">
                            {q.pergunta}
                          </p>
                          <div className="space-y-1.5 pt-1">
                            {q.opcoes?.map((opcao, optIdx) => {
                              const isCorrect = optIdx === q.respostaCorreta
                              return (
                                <div
                                  key={optIdx}
                                  className={cn(
                                    "p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 border",
                                    isCorrect
                                      ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-bold"
                                      : "bg-slate-50 border-slate-200 text-slate-600"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0",
                                      isCorrect
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-200 text-slate-600"
                                    )}
                                  >
                                    {isCorrect ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + optIdx)}
                                  </span>
                                  <span>{opcao.replace(/^[A-Za-z]\)\s*/, "")}</span>
                                  {isCorrect && (
                                    <span className="ml-auto text-[10px] font-black uppercase text-emerald-700">
                                      Alternativa Correta
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs space-y-1 mt-2">
                            <p className="font-bold text-[#00D492] uppercase tracking-wider text-[10px]">
                              {q.gabarito}
                            </p>
                            <p className="text-slate-200 leading-relaxed">
                              {q.criterioEsperado}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer do Modal */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModalGabaritoAv2Aberto(false)}
                    className="bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-2 px-5 rounded-xl transition-all cursor-pointer"
                  >
                    Fechar Gabarito
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 relative">
        {/* Cronômetro Flutuante ao lado direito do conteúdo da aula (não exibido para Administrador, Supervisor, Operacional, Desenvolvedor e Corretor PJ) */}
        {!isIsentoCronometro && (() => {
          const statusDiaAtual = calcularLiberacaoDia(currentDiaData.dia)
          const isBloqueada = !statusDiaAtual.liberado
          const isConcluido = diasConcluidos.includes(currentDiaData.dia)
          const isAtivaDesbloqueada = statusDiaAtual.liberado && !isConcluido
          const tempoExibido = isAtivaDesbloqueada ? tempoRestante : 0

          return (
            <div className="fixed right-4 sm:right-6 lg:right-8 top-[212px] sm:top-[228px] z-40">
              <div className="bg-[#0F172B]/95 backdrop-blur-md text-white border border-slate-700/80 shadow-2xl rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 transition-all hover:scale-[1.02]">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 transition-colors",
                  !isAtivaDesbloqueada
                    ? "bg-slate-800 text-slate-400"
                    : tempoExibido <= 300
                      ? "bg-rose-500/20 text-rose-400 animate-pulse"
                      : "bg-emerald-500/20 text-[#00D492]"
                )}>
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex flex-col pr-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      TEMPO DA AULA
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                      DIA {currentDiaData.dia}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={cn(
                      "font-mono font-black text-lg sm:text-xl tracking-tight",
                      !isAtivaDesbloqueada
                        ? "text-slate-400"
                        : tempoExibido <= 300 ? "text-rose-400" : "text-white"
                    )}>
                      {String(Math.floor(tempoExibido / 60)).padStart(2, "0")}:{String(tempoExibido % 60).padStart(2, "0")}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      / 30:00
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}

        {(() => {
          const statusDiaAtual = calcularLiberacaoDia(currentDiaData.dia)
          if (!statusDiaAtual.liberado) {
            return (
              <div className="max-w-4xl mx-auto py-12">
                <div className="bg-[#FFFDF5] border border-amber-400 rounded-3xl p-6 sm:p-8 text-center space-y-1.5 max-w-lg mx-auto shadow-2xs">
                  <div className="flex items-center justify-center gap-2 font-black text-amber-950 uppercase tracking-wider text-xs sm:text-sm">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>AULA DO DIA {currentDiaData.dia} AGUARDANDO LIBERAÇÃO</span>
                  </div>
                  <p className="text-amber-900 font-semibold text-xs sm:text-sm">
                    {statusDiaAtual.mensagemBloqueio || "Disponível no próximo dia útil."}
                  </p>
                  <p className="text-amber-800 text-[11px] sm:text-xs font-medium">
                    Você pode revisitar os dias concluídos a qualquer momento.
                  </p>
                </div>
              </div>
            )
          }

          return (
            <div
              onCopy={(e) => {
                e.preventDefault()
                return false
              }}
              onCut={(e) => {
                e.preventDefault()
                return false
              }}
              className="max-w-4xl mx-auto space-y-6 select-none"
            >
              {currentDiaData.dia === 11 || currentDiaData.dia === 22 ? (() => {
                const isAv1 = currentDiaData.dia === 11
                const diaNum = isAv1 ? 11 : 22
                const diaAnterior = isAv1 ? 10 : 21
                const questoes = isAv1 ? QUESTOES_AVALIACAO_1 : QUESTOES_AVALIACAO_2
                const respostasAbertas = isAv1 ? respostasAbertasAv1 : respostasAbertasAv2
                const setRespostasAbertas = isAv1 ? setRespostasAbertasAv1 : setRespostasAbertasAv2
                const respostasEscolha = isAv1 ? respostasEscolhaAv1 : respostasEscolhaAv2
                const salvaStatus = isAv1 ? av1SalvaStatus : av2SalvaStatus
                const validacaoErro = isAv1 ? av1ValidacaoErro : av2ValidacaoErro
                const onSalvarAberta = isAv1 ? handleSalvarRespostaAv1 : handleSalvarRespostaAv2
                const onSelecionarOpcao = isAv1 ? handleSelecionarOpcaoAv1 : handleSelecionarOpcaoAv2
                const isDiaBloqueado = diasConcluidos.includes(diaNum)

                return (
                  <>
                    {/* Day Header Bar Avaliação */}
                    <div className="pt-4 pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                            DIA {diaNum}
                          </span>
                        </div>
                        <h2 className="text-[30px] sm:text-[33px] font-black text-slate-900 tracking-tight mt-4 leading-snug">
                          DIA {diaNum} — {isAv1 ? "AVALIAÇÃO 1" : "AVALIAÇÃO 2"}
                        </h2>
                        <p className="text-sm sm:text-base font-semibold text-slate-600 mt-1">
                          {isAv1
                            ? "Fundamentos, margens, cálculo básico e leitura inicial de oportunidades"
                            : "Autonomia inicial, comportamento comercial e raciocínio integrado"}
                        </p>
                      </div>
                    </div>

                    {/* Questões */}
                    <div className="space-y-6 py-2">
                      {questoes.map((q) => {
                        if (q.tipo === "aberta") {
                          return (
                            <div key={q.numero} className="bg-amber-100/90 border border-amber-300 rounded-2xl p-6 space-y-3">
                              <div className="flex items-center gap-2 text-sm font-black text-amber-950 uppercase tracking-wider">
                                <MessageSquare className="w-4.5 h-4.5 text-amber-800" />
                                <span>{q.titulo}</span>
                              </div>

                              <p className="text-xs sm:text-sm font-semibold text-slate-900">
                                {q.pergunta}
                              </p>

                              <textarea
                                rows={3}
                                disabled={isDiaBloqueado}
                                value={respostasAbertas[q.numero] || ""}
                                onChange={(e) =>
                                  setRespostasAbertas({ ...respostasAbertas, [q.numero]: e.target.value })
                                }
                                onPaste={(e) => {
                                  e.preventDefault()
                                  setAvisoBloqueioColar("Não é permitido colar texto. Por favor, digite a resposta com suas próprias palavras.")
                                  setTimeout(() => setAvisoBloqueioColar(null), 4500)
                                  return false
                                }}
                                onDrop={(e) => {
                                  e.preventDefault()
                                  setAvisoBloqueioColar("Não é permitido arrastar ou colar texto. Digite sua resposta com suas próprias palavras.")
                                  setTimeout(() => setAvisoBloqueioColar(null), 4500)
                                  return false
                                }}
                                onKeyDown={(e) => {
                                  if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
                                    e.preventDefault()
                                    setAvisoBloqueioColar("Não é permitido colar texto (Ctrl+V desativado). Por favor, digite com suas próprias palavras.")
                                    setTimeout(() => setAvisoBloqueioColar(null), 4500)
                                  }
                                }}
                                placeholder="Digite sua resposta com suas próprias palavras..."
                                className={cn(
                                  "w-full bg-white border border-amber-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm",
                                  isDiaBloqueado && "bg-amber-50/60 text-slate-700 cursor-not-allowed opacity-90 resize-none"
                                )}
                              />

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-xs text-emerald-700 font-bold">
                                  {salvaStatus && <span>✓ {salvaStatus}</span>}
                                </span>
                                {!isDiaBloqueado && (
                                  <button
                                    type="button"
                                    onClick={() => onSalvarAberta(q.numero, respostasAbertas[q.numero] || "")}
                                    className="bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Salvar Resposta</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        }

                        // tipo === 'escolha'
                        const selectedOpt = respostasEscolha[q.numero]
                        const hasAnswered = selectedOpt !== undefined && selectedOpt !== null

                        return (
                          <div key={q.numero} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                            <div className="flex items-center gap-2 text-sm font-black text-[#0F172B] uppercase tracking-wider border-b border-slate-100 pb-3">
                              <HelpCircle className="w-4.5 h-4.5 text-blue-600" />
                              <span>{q.titulo}</span>
                            </div>

                            <p className="text-sm sm:text-[15px] font-bold text-slate-900">
                              {q.pergunta}
                            </p>

                            <div className="space-y-2">
                              {q.opcoes?.map((opcao, optIdx) => {
                                const isSelected = selectedOpt === optIdx

                                return (
                                  <button
                                    key={optIdx}
                                    type="button"
                                    disabled={isDiaBloqueado}
                                    onClick={() => !isDiaBloqueado && onSelecionarOpcao(q.numero, optIdx)}
                                    className={cn(
                                      "w-full text-left p-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border-2 flex items-start gap-3",
                                      isDiaBloqueado ? "cursor-default" : "cursor-pointer",
                                      hasAnswered
                                        ? isSelected
                                          ? "bg-[#87A9FF] border-[#658de6] text-slate-900 font-bold shadow-xs"
                                          : "bg-slate-50 border-slate-200 text-slate-500 opacity-70"
                                        : isDiaBloqueado
                                        ? "bg-slate-50 border-slate-200 text-slate-400 opacity-50"
                                        : "bg-white border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-300"
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        "w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5",
                                        isSelected
                                          ? "bg-[#0F172B] text-white"
                                          : "bg-slate-100 text-slate-700"
                                      )}
                                    >
                                      {String.fromCharCode(65 + optIdx)}
                                    </span>
                                    <span>{opcao.replace(/^[A-Za-z]\)\s*/, "")}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Alerta de validação */}
                    {validacaoErro && (
                      <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 text-xs sm:text-sm text-rose-800 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{validacaoErro}</span>
                      </div>
                    )}

                    {/* Rodapé de Navegação da Avaliação */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedDia(diaAnterior)}
                        className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                      >
                        ← DIA {diaAnterior}
                      </button>

                      <button
                        type="button"
                        onClick={handleAvancarProximoDia}
                        className="bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm py-2.5 px-5 rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                      >
                        <span>
                          {isAv1
                            ? (isDiaBloqueado ? "Avançar para o DIA 12 →" : "Finalizar Avaliação e Avançar →")
                            : (isDiaBloqueado ? "Avaliação 2 Concluída ✓" : "Finalizar Avaliação Final →")}
                        </span>
                      </button>
                    </div>
                  </>
                )
              })() : (
                <>
                  {/* Day Header Bar */}
              <div className="pt-4 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                      DIA {currentDiaData.dia}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">Sessão de estudo guiado • aproximadamente 30 minutos</span>
                  </div>
                  <h2 className="text-[30px] sm:text-[33px] font-black text-slate-900 tracking-tight mt-4 leading-snug">
                    {currentDiaData.titulo}
                  </h2>
                </div>
              </div>

              {/* 1. VOCÊ ESTÁ AQUI (Card Neutro) */}
              <div className="bg-slate-100/80 border border-slate-300 rounded-2xl p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black text-slate-600 uppercase tracking-wider">
                  <Lightbulb className="w-4 h-4 text-slate-500" />
                  <span>VOCÊ ESTÁ AQUI</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-700 leading-relaxed">
                  {currentDiaData.voceEstaAqui}
                </p>
              </div>

              {/* 2. O QUE VOCÊ VAI ENTENDER HOJE (Card Destaque) */}
              <div className="bg-emerald-100/90 border border-emerald-300 rounded-2xl p-5 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-900 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>O QUE VOCÊ VAI ENTENDER HOJE</span>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-emerald-950 leading-relaxed">
                  {currentDiaData.oQueVaiEntender}
                </p>
              </div>

              {/* 3. CONTEÚDO PRINCIPAL (Blocos de Leitura) */}
              <div className="space-y-6 py-2">
                <div className="space-y-6">
                  {currentDiaData.conteudoPrincipal.map((bloco, idx) => (
                    <div key={idx} className="space-y-2.5">
                      <h3 className="text-base font-black text-slate-900">
                        {bloco.titulo}
                      </h3>
                      <div className="space-y-2 text-xs sm:text-sm text-slate-700 leading-relaxed">
                        {bloco.paragrafos.map((p, pIdx) => (
                          <p key={pIdx}>{p}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* VEJA NA FERRAMENTA */}
              {currentDiaData.vejaNaFerramenta && (
                <div className="space-y-4 py-2">
                  <h3 className="text-base font-black text-slate-900">
                    {currentDiaData.vejaNaFerramenta.titulo}
                  </h3>
                  <div className="space-y-6">
                    {currentDiaData.vejaNaFerramenta.imagens.map((item, imgIdx) => {
                      const url = typeof item === "string" ? item : item.url
                      const legenda = typeof item === "string" ? undefined : item.legenda
                      return (
                        <div key={imgIdx} className="space-y-2">
                          <img
                            src={url}
                            alt={legenda || `${currentDiaData.vejaNaFerramenta?.titulo || "Imagem"} ${imgIdx + 1}`}
                            className="w-full h-auto rounded-xl border border-slate-200 shadow-sm"
                          />
                          {legenda && (
                            <p className="text-xs sm:text-sm text-slate-600 font-medium">
                              {legenda}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 4. VEJA ISSO ACONTECENDO / VEJA NA FERRAMENTA */}
              {currentDiaData.vejaAcontecendo && (
                <div className="bg-[#0F172B] text-white rounded-2xl p-6 border border-slate-800 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-xs font-black text-[#00D492] uppercase tracking-wider">
                    <Calculator className="w-4 h-4" />
                    <span>VEJA ISSO ACONTECENDO</span>
                  </div>

                  {currentDiaData.vejaAcontecendo.texto && (
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {currentDiaData.vejaAcontecendo.texto}
                    </p>
                  )}
                </div>
              )}

              {/* 5. ESCREVA COM SUAS PALAVRAS (Textarea Obrigatório) */}
              {(() => {
                const isDiaBloqueado = diasConcluidos.includes(currentDiaData.dia)
                return (
                  <>
                    <div className="bg-amber-100/90 border border-amber-300 rounded-2xl p-6 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-black text-amber-950 uppercase tracking-wider">
                        <MessageSquare className="w-4.5 h-4.5 text-amber-800" />
                        <span>ESCREVA COM SUAS PALAVRAS</span>
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-slate-900">
                        {currentDiaData.perguntaAberta}
                      </p>

                      <textarea
                        rows={4}
                        disabled={isDiaBloqueado}
                        value={respostasAbertas[currentDiaData.dia] || ""}
                        onChange={(e) =>
                          setRespostasAbertas({ ...respostasAbertas, [currentDiaData.dia]: e.target.value })
                        }
                        onPaste={(e) => {
                          e.preventDefault()
                          setAvisoBloqueioColar("Não é permitido colar texto. Por favor, digite a resposta com suas próprias palavras.")
                          setTimeout(() => setAvisoBloqueioColar(null), 4500)
                          return false
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          setAvisoBloqueioColar("Não é permitido arrastar ou colar texto. Digite sua resposta com suas próprias palavras.")
                          setTimeout(() => setAvisoBloqueioColar(null), 4500)
                          return false
                        }}
                        onKeyDown={(e) => {
                          if ((e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V")) {
                            e.preventDefault()
                            setAvisoBloqueioColar("Não é permitido colar texto (Ctrl+V desativado). Por favor, digite com suas próprias palavras.")
                            setTimeout(() => setAvisoBloqueioColar(null), 4500)
                          }
                        }}
                        placeholder="Digite sua explicação com suas próprias palavras..."
                        className={cn(
                          "w-full bg-white border border-amber-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm",
                          isDiaBloqueado && "bg-amber-50/60 text-slate-700 cursor-not-allowed opacity-90 resize-none"
                        )}
                      />

                      {avisoBloqueioColar && (
                        <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 text-xs text-rose-800 font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                          <span className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
                          <span>{avisoBloqueioColar}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-emerald-700 font-bold">
                          {savedStatus && <span>✓ {savedStatus}</span>}
                        </span>
                        {!isDiaBloqueado && (
                          <button
                            type="button"
                            onClick={() => handleSalvarResposta(currentDiaData.dia, respostasAbertas[currentDiaData.dia] || "")}
                            className="bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Salvar Resposta</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 6. TOME UMA DECISÃO (Múltipla Escolha / Cenário) */}
                    <div className="space-y-4 py-2">
                      <div className="flex items-center gap-2 text-sm font-black text-[#0F172B] uppercase tracking-wider border-b border-slate-100 pb-3">
                        <HelpCircle className="w-4.5 h-4.5 text-blue-600" />
                        <span>TOME UMA DECISÃO</span>
                      </div>

                      <p className="text-sm sm:text-[15px] font-bold text-slate-900">
                        {currentDiaData.decisao.pergunta}
                      </p>

                      <div className="space-y-2">
                        {currentDiaData.decisao.opcoes.map((opcao, optIdx) => {
                          const isSelected = decisoesTomadas[currentDiaData.dia] === optIdx
                          const isCorrect = optIdx === currentDiaData.decisao.respostaCorreta
                          const hasAnswered = decisoesTomadas[currentDiaData.dia] !== undefined

                          return (
                            <button
                              key={optIdx}
                              type="button"
                              disabled={isDiaBloqueado}
                              onClick={() => !isDiaBloqueado && handleTomarDecisao(currentDiaData.dia, optIdx)}
                              className={cn(
                                "w-full text-left p-3.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border-2 flex items-start gap-3",
                                isDiaBloqueado ? "cursor-default" : "cursor-pointer",
                                hasAnswered
                                  ? isSelected
                                    ? "bg-[#87A9FF] border-[#658de6] text-slate-900 font-bold shadow-xs"
                                    : "bg-slate-50 border-slate-200 text-slate-500 opacity-70"
                                  : isDiaBloqueado
                                  ? "bg-slate-50 border-slate-200 text-slate-400 opacity-50"
                                  : "bg-white border-slate-300 text-slate-800 hover:bg-blue-50 hover:border-blue-300"
                              )}
                            >
                              <span
                                className={cn(
                                  "w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5",
                                  hasAnswered && isDiaBloqueado
                                    ? isCorrect
                                      ? "bg-emerald-600 text-white"
                                      : isSelected
                                      ? "bg-rose-600 text-white"
                                      : "bg-slate-200 text-slate-600"
                                    : isSelected
                                    ? "bg-[#0F172B] text-white"
                                    : "bg-slate-100 text-slate-700"
                                )}
                              >
                                {hasAnswered && isDiaBloqueado && isCorrect ? (
                                  <Check className="w-3 h-3" />
                                ) : hasAnswered && isDiaBloqueado && isSelected ? (
                                  <X className="w-3 h-3" />
                                ) : (
                                  String.fromCharCode(65 + optIdx)
                                )}
                              </span>
                              <span>{opcao.replace(/^[A-Za-z]\)\s*/, "")}</span>
                            </button>
                          )
                        })}
                      </div>

                      {/* Feedback Explicativo (Visível exclusivamente quando o dia já estiver concluído/bloqueado) */}
                      {isDiaBloqueado && decisoesTomadas[currentDiaData.dia] !== undefined && (
                        <div className="bg-slate-900 text-white p-4 rounded-xl text-xs space-y-1 mt-3">
                          <p className="font-bold text-[#00D492] uppercase tracking-wider text-[10px]">
                            GABARITO E JUSTIFICATIVA
                          </p>
                          <p className="text-slate-200 leading-relaxed">
                            {currentDiaData.decisao.explicacao}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}

              {/* 7. O QUE LEVAR DESTA ETAPA (Card Resumo) */}
              <div className="bg-slate-100/90 border border-slate-300 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-black text-slate-900 uppercase tracking-wider">
                  <BookmarkCheck className="w-4.5 h-4.5 text-emerald-600" />
                  <span>O QUE LEVAR DESTA ETAPA</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm font-semibold text-emerald-950">
                  {currentDiaData.oQueLevar.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 bg-emerald-50/90 p-3.5 rounded-xl border border-emerald-300/80 shadow-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                {selectedDia > 1 ? (
                  <button
                    type="button"
                    onClick={() => setSelectedDia(prev => Math.max(1, prev - 1))}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-bold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                  >
                    ← Dia Anterior
                  </button>
                ) : (
                  <div />
                )}
                {(() => {
                  const isDiaConcluido = diasConcluidos.includes(currentDiaData.dia)
                  const temResposta = Boolean(respostasAbertas[currentDiaData.dia]?.trim())
                  const temDecisao = decisoesTomadas[currentDiaData.dia] !== undefined && decisoesTomadas[currentDiaData.dia] !== null
                  const requisitosAtendidos = isIsentoNavegacao || isDiaConcluido || (temResposta && temDecisao)
                  const proximoDiaAlvo = selectedDia + 1
                  const statusProximo = calcularLiberacaoDia(proximoDiaAlvo)
                  const podeAvancar = isIsentoNavegacao
                    ? selectedDia < 22
                    : (requisitosAtendidos && selectedDia < 22 && (!isDiaConcluido || statusProximo.liberado))

                  return (
                    <div className="flex items-center gap-3">
                      {!isIsentoNavegacao && isDiaConcluido && !statusProximo.liberado && selectedDia < 22 && (
                        <span className="text-[11px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>DIA {proximoDiaAlvo}: {statusProximo.mensagemBloqueio}</span>
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={!podeAvancar}
                        onClick={handleAvancarProximoDia}
                        title={
                          isIsentoNavegacao
                            ? "Avançar para o próximo dia"
                            : !requisitosAtendidos
                            ? "Preencha a explicação em 'ESCREVA COM SUAS PALAVRAS' e selecione uma opção em 'TOME UMA DECISÃO' para avançar."
                            : isDiaConcluido && !statusProximo.liberado
                            ? statusProximo.mensagemBloqueio
                            : undefined
                        }
                        className="bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <span>Próximo Dia</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#00D492]" />
                      </button>
                    </div>
                  )
                })()}
              </div>
                </>
              )}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
