"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { useAuth } from "@/context/auth-context"
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
  RotateCcw,
  Save,
  MessageSquare,
  Award,
  BarChart3,
  BookmarkCheck,
  AlertCircle,
  Lightbulb,
  Check,
  X
} from "lucide-react"

// Types
interface DailyContent {
  dia: number
  titulo: string
  voceEstaAqui: string
  oQueVaiEntender: string
  conteudoPrincipal: {
    titulo: string
    paragrafos: string[]
  }[]
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
}

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
          "O profissional precisa conhecer a estrutura para não vender algo que não entende. Mas conhecer não significa abrir a conversa despejando toda a taxonomia do produto. O contato comercial pode começar por 'margem complementar', porque o objetivo inicial é gerar entendimento da oportunidade e do benefício.",
          "A metodologia é comunicação em camadas, não ocultação. Se o cliente perguntar a natureza da operação, a explicação deve ser feita de forma simples e correta."
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
      }
    ],
    vejaAcontecendo: {
      tipo: "calculadora",
      texto: "Nos prints de referência: Margem R$ 1.000 com coeficiente de margem complementar 0,04333 gera valor liberado de R$ 23.078,70. Em outro cenário, com coeficiente de contrato novo 0,02322, a mesma margem gera R$ 43.066,32. A diferença veio da tabela/coeficiente usada.",
      calcMargem: 1000,
      calcCoef: 0.04333,
      calcPrazo: 96,
      calcValor: 23078.70
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
        titulo: "O Cliente Não Compra 'Margem'",
        paragrafos: [
          "O profissional pode pensar tecnicamente em margem, coeficiente e prazo. O cliente geralmente pensa em algo mais concreto: quanto recebe, quanto compromete, por quanto tempo e se isso atende ao que precisa.",
          "Por isso, o cálculo vem depois de uma pergunta importante: o que faria sentido para esse cliente? Se ele não precisa de valor, não faz sentido criar parcela só porque existe margem."
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
          "Quando um cliente diz 'já tenho empréstimos', isso não é apenas uma objeção. É também uma informação sobre a folha. O profissional treinado pensa: quais contratos? Há algum que possa ser analisado? Existe condição de refinanciamento disponível?",
          "Contrato existente não significa refinanciamento garantido. Não focaremos em realizar refinanciamento porque é juros sobre juros, mas é importante entender."
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
          "Portabilidade é a transferência de uma dívida de uma instituição para outra, dentro das regras aplicáveis. Ela existe porque um contrato atual pode ser comparado com uma condição disponível em outra instituição.",
          "Falar 'tem portabilidade' não responde à pergunta principal do cliente: 'o que muda para mim?'. Antes de defender uma portabilidade, precisamos saber qual é a situação atual e qual ganho real existe na alternativa."
        ]
      },
      {
        titulo: "Comparação Respeitosa",
        paragrafos: [
          "Se o cliente diz 'faço tudo no meu banco', não ataque o banco. Peça a referência que ele recebeu e compare elementos equivalentes. O valor da Acerto está em ajudar a enxergar a diferença real, não em dizer que o concorrente é ruim."
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
        titulo: "A Lógica Interna e o Cálculo Básico",
        paragrafos: [
          "Margem complementar é a margem vinculada à modalidade de cartão. Internamente, você precisa saber disso. Comercialmente, começamos pela ideia de capacidade complementar porque ela descreve o papel daquela margem no cenário sem abrir a conversa com uma palavra que pode gerar resistência antes de existir entendimento.",
          "Na referência apresentada, R$ 1.000 de margem com coeficiente 0,04333 gera valor liberado de R$ 23.078,70. O sistema também mostra prazo e outras referências."
        ]
      },
      {
        titulo: "Comparar sem Aprofundar",
        paragrafos: [
          "A ferramenta possui botão 'Comparar'. Na margem complementar, existem três prazos definidos para comparação. Você precisa reconhecer que há alternativas de duração, mas não precisa dominar agora toda a leitura de taxa, economia ou plano de amortização."
        ]
      }
    ],
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
          "O iniciante pergunta: 'Qual produto eu ofereço?'. O profissional começa a perguntar: 'O que existe aqui e o que o cliente precisa?'. Essa mudança parece pequena, mas muda a qualidade da venda."
        ]
      },
      {
        titulo: "Quatro Fontes de Oportunidade",
        paragrafos: [
          "• MARGEM FACULTATIVA DISPONÍVEL: pode abrir caminho para crédito novo.",
          "• CONTRATO EXISTENTE: pode merecer análise de refinanciamento.",
          "• DÍVIDA/CONDIÇÃO EM OUTRA INSTITUIÇÃO: pode abrir comparação e eventual portabilidade.",
          "• MARGEM COMPLEMENTAR: pode existir como capacidade adicional quando disponível."
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
    titulo: "AVALIAÇÃO 1 — Fundamentos e leitura inicial",
    voceEstaAqui: "Chegamos ao primeiro ponto de checagem. Durante a avaliação, responda com atenção e consolide os conceitos essenciais aprendidos até o momento.",
    oQueVaiEntender: "Validar domínio de margens, vocabulário operacional, fundamentos da calculadora e raciocínio de oportunidade.",
    conteudoPrincipal: [
      {
        titulo: "Instruções da Avaliação 1",
        paragrafos: [
          "Esta avaliação possui 12 questões práticas cobrindo conceitos de consignado, margem facultativa x complementar, uso correto de coeficientes e interpretação de casos reais.",
          "Suas respostas abertas e pontuações serão gravadas no seu histórico de capacitação para acompanhamento do Supervisor e RH."
        ]
      }
    ],
    perguntaAberta: "Caso aberto: Cliente possui margem facultativa e margem complementar. Escreva quais informações você buscaria antes de decidir o que apresentar.",
    decisao: {
      pergunta: "R$ 1.000 de margem significam necessariamente R$ 1.000 liberados?",
      opcoes: [
        "A) Sim, sempre.",
        "B) Não, o valor depende da tabela/coeficiente e prazo.",
        "C) Só na margem complementar.",
        "D) Só no crédito novo."
      ],
      respostaCorreta: 1,
      explicacao: "Margem é referência de parcela/capacidade, não de valor líquido disponível."
    },
    oQueLevar: [
      "Margem é capacidade de comprometimento.",
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
        titulo: "Confiança Antes de Profundidade",
        paragrafos: [
          "Em contatos frios, confiança pode ser pré-requisito para qualquer conversa técnica. Se o cliente pergunta 'quem é você?', não faz sentido responder com cinco números. Primeiro resolva a insegurança.",
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
        titulo: "Cinco Comportamentos Úteis",
        paragrafos: [
          "• OBJETIVO: mensagens curtas, pergunta 'quanto?', quer síntese.",
          "• ANALÍTICO: pergunta banco, prazo, taxa, contrato, detalhes.",
          "• DESCONFIADO: questiona origem do contato, segurança, formalização.",
          "• RELACIONAL: responde melhor à proximidade, conversa antes de decidir.",
          "• APRESSADO: quer saber documento, prazo de liberação e próximo passo."
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
        titulo: "Três Peças da Abertura",
        paragrafos: [
          "• CONTEXTO: por que estou falando com você agora?",
          "• VANTAGEM / MOTIVO: o que merece atenção sem transformar campanha em spam?",
          "• PERGUNTA: uma pergunta fácil de responder que ajude a escolher o próximo passo."
        ]
      },
      {
        titulo: "O que Enfraquece e Postura Segura",
        paragrafos: [
          "'Tem interesse em empréstimo?' joga todo o esforço para o cliente e não traz contexto. Textos muito longos parecem disparo. Excesso de tecnicismo cria esforço antes de existir interesse.",
          "Evite 'acho', 'talvez', 'deve dar' quando você deveria consultar. Também evite urgência inventada."
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
          "Fazer seis perguntas de uma vez aumenta esforço e reduz naturalidade. Faça uma pergunta, use a resposta e só então faça a próxima.",
          "O cliente prioriza valor na mão? Parcela menor? Prazo menor? Segurança? Comparação com outra proposta? Resolver uma condição atual? Isso muda o cálculo e a apresentação."
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
        titulo: "Do Objetivo para o Cálculo",
        paragrafos: [
          "Se o cliente prioriza valor, você testa uma configuração coerente com esse objetivo. Se prioriza parcela, respeita a faixa informada. Se quer prazo menor, precisa enxergar como a duração muda o cenário.",
          "O cliente não precisa receber tudo o que você testou. O profissional pode explorar várias possibilidades internamente e selecionar uma ou poucas referências que façam sentido."
        ]
      }
    ],
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
        titulo: "Parcela Alta, Valor Baixo e Prazo Longo",
        paragrafos: [
          "• Se o cliente diz que a parcela ficou alta: pergunte qual faixa cabe com tranquilidade e recalcule.",
          "• Se o valor liberado não atende: descubra qual valor faria sentido.",
          "• Se o cliente quer terminar antes: teste o impacto de prazos menores e explique a troca de forma objetiva."
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
          "O objetivo não é 'vencer' o cliente. É entender o que está impedindo avanço e verificar se existe algo real para resolver.",
          "• 'VOU PENSAR': Pensar sobre o quê? Parcela? Prazo? Segurança? Faça uma pergunta que torne o genérico em concreto.",
          "• 'NÃO CONFIO': Resolva a insegurança com processo e informação verificável. Se não souber, consulte antes de responder."
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
        titulo: "Estrutura Simples da Ligação",
        paragrafos: [
          "1. ABERTURA: Tom e postura verbal abrem o caminho.",
          "2. CONTEXTO: Contextualize em uma frase por que estão conversando.",
          "3. PERGUNTA: Descubra o ponto central.",
          "4. ESCUTA: Não responda enquanto o cliente ainda está explicando.",
          "5. SÍNTESE: Repita o que entendeu.",
          "6. RECOMENDAÇÃO e CONFIRMAÇÃO: Próximo passo definido."
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
        titulo: "Follow-up Não é 'Oi, viu?'",
        paragrafos: [
          "Uma retomada boa lembra onde a conversa parou e traz uma razão para voltar. Pode ser uma informação pendente, um recálculo ou uma mudança confirmada.",
          "Perguntas como 'o que precisa enviar?', 'como assina?', 'quando cai?' indicam que a pessoa saiu da avaliação e entrou no processo. Nesse momento, pare de vender e avance para a formalização."
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
        titulo: "Caso Juliana: As 7 Etapas",
        paragrafos: [
          "• Etapa 1 (O que você ainda não sabe): Sem dados, não mande simulação.",
          "• Etapa 2 (Sondagem): Descubra a prioridade de parcela.",
          "• Etapa 3 (Consulta): Verifique margens e contratos existentes.",
          "• Etapa 4 (Cálculo): Simule com a tabela certa respeitando o limite.",
          "• Etapa 5 (Reação): Transforme o feedback em critério de ajuste.",
          "• Etapa 6 (Limite Técnico): Se houver regra que não domina, consulte a retaguarda.",
          "• Etapa 7 (Próximo Passo): Conduza para a formalização com clareza."
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
    titulo: "AVALIAÇÃO 2 — Autonomia inicial e raciocínio integrado",
    voceEstaAqui: "Você concluiu os 21 dias de formação do Módulo 1. Agora é o momento de consolidar todo o raciocínio comercial e técnico adquirido.",
    oQueVaiEntender: "Validar autonomia comercial, leitura de comportamento, segurança no WhatsApp, manejo de objeções e condução de casos.",
    conteudoPrincipal: [
      {
        titulo: "Instruções da Avaliação Final",
        paragrafos: [
          "A Avaliação 2 integra questões objetivas de decisão rápida e cenários abertos para avaliação da sua argumentação e diagnóstico comercial.",
          "Ao concluir, seu relatório de desempenho estará disponível no Painel de Acompanhamento para visualização pelo Supervisor Comercial e RH."
        ]
      }
    ],
    perguntaAberta: "Cliente diz: 'Não tenho margem, já tenho contratos e meu banco ofereceu outra coisa'. Em até seis linhas, descreva sua sequência inicial de raciocínio.",
    decisao: {
      pergunta: "Cliente pergunta 'é golpe?'. Sua prioridade é:",
      opcoes: [
        "A) Falar com autoridade: 'confia em mim'.",
        "B) Apresentar informações verificáveis antes de continuar vendendo.",
        "C) Ignorar e seguir com naturalidade.",
        "D) Mostrar prints de outros clientes."
      ],
      respostaCorreta: 1,
      explicacao: "Segurança é o bloqueio atual e precisa ser resolvida antes de qualquer oferta comercial."
    },
    oQueLevar: [
      "Comunicação consultiva em camadas.",
      "Diagnóstico preciso antes de qualquer cálculo.",
      "Respeito às regras e clareza no processo geram confiança duradoura."
    ]
  }
]

export default function TreinamentoPage() {
  const { user, perfil, isDeveloper } = useAuth()
  const isDevUser = Boolean(isDeveloper || perfil?.role === "Desenvolvedor")
  const isAdminOrDev = Boolean(isDeveloper || perfil?.role === "Desenvolvedor" || perfil?.role === "Administrador")

  const [selectedDia, setSelectedDia] = useState<number>(1)
  const [respostasAbertas, setRespostasAbertas] = useState<Record<number, string>>({})
  const [decisoesTomadas, setDecisoesTomadas] = useState<Record<number, number>>({})
  const [diasConcluidos, setDiasConcluidos] = useState<number[]>([])
  const [savedStatus, setSavedStatus] = useState<string | null>(null)
  const [iniciouCurso, setIniciouCurso] = useState<boolean>(false)
  const [carregandoDados, setCarregandoDados] = useState<boolean>(true)

  // Interactive Mini Calculator on Day 5
  const [calcMargem, setCalcMargem] = useState<number>(1000)
  const [calcCoef, setCalcCoef] = useState<number>(0.04333)
  const [calcPrazo, setCalcPrazo] = useState<number>(96)

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

        if (data && Array.isArray(data) && data.length > 0) {
          const remoteRespostas: Record<number, string> = {}
          const remoteDecisoes: Record<number, number> = {}
          const remoteConcluidos: number[] = []

          data.forEach((item: any) => {
            if (item.resposta_aberta) remoteRespostas[item.dia] = item.resposta_aberta
            if (item.decisao_opcao_idx !== null && item.decisao_opcao_idx !== undefined) {
              remoteDecisoes[item.dia] = item.decisao_opcao_idx
            }
            if (item.concluido && !remoteConcluidos.includes(item.dia)) {
              remoteConcluidos.push(item.dia)
            }
          })

          setRespostasAbertas(remoteRespostas)
          setDecisoesTomadas(remoteDecisoes)
          setDiasConcluidos(remoteConcluidos)
        } else {
          // Se não houver registros no banco (ou se tiverem sido apagados), reseta tudo
          setRespostasAbertas({})
          setDecisoesTomadas({})
          setDiasConcluidos([])
        }
      } catch (err) {
        console.error("Erro ao carregar dados do treinamento:", err)
        setRespostasAbertas({})
        setDecisoesTomadas({})
        setDiasConcluidos([])
      } finally {
        setCarregandoDados(false)
      }
    }

    carregarDadosTreinamento()
  }, [user?.id, perfil?.id])

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

  const handleAvancarProximoDia = async () => {
    const diaAtual = currentDiaData.dia
    // O bloqueio do dia ocorre exclusivamente ao clicar em 'Próximo Dia'
    if (!diasConcluidos.includes(diaAtual)) {
      const newConcluidos = [...diasConcluidos, diaAtual]
      setDiasConcluidos(newConcluidos)
      await sincronizarSupabase(diaAtual, { concluido: true })
    }
    setSelectedDia(prev => Math.min(22, prev + 1))
  }

  const currentDiaData = DIAS_TREINAMENTO.find(d => d.dia === selectedDia) || DIAS_TREINAMENTO[0]

  // Dia ativo em curso (próximo dia a ser concluído)
  const diaAtivoEmCurso = diasConcluidos.length > 0
    ? Math.min(22, Math.max(...diasConcluidos) + 1)
    : 1


  // If user is not developer, show friendly access notice
  if (!isDevUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">Área Restrita: Treinamento</h1>
        <p className="text-sm text-slate-500 max-w-md">
          Esta área está em fase de homologação comercial e é restrita aos usuários com perfil de <strong>Desenvolvedor</strong>.
        </p>
      </div>
    )
  }

  // Se o usuário ainda não clicou em COMEÇAR ou CONTINUAR (ex: ao acessar pelo sidebar)
  if (!iniciouCurso) {
    const totalConcluidos = diasConcluidos.length
    const progressoPercentual = Math.round((totalConcluidos / 22) * 100)
    const diaInfoAtivo = DIAS_TREINAMENTO.find(d => d.dia === diaAtivoEmCurso)

    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col">
        <Header title="TREINAMENTO" />

        <div className="flex-1 flex items-center justify-center max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {carregandoDados ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs space-y-3">
              <div className="w-8 h-8 border-3 border-slate-300 border-t-[#0F172B] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-semibold">Carregando seu progresso...</p>
            </div>
          ) : totalConcluidos === 0 ? (
            /* PÁGINA DE BOAS-VINDAS (Nenhum dia concluído) */
            <div className="text-center space-y-6 pt-4 w-full">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto shadow-xs">
                <GraduationCap className="w-8 h-8" />
              </div>

              <div className="space-y-3 max-w-xl mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Programa de Capacitação
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Bem-vindo ao Treinamento Comercial
                </h1>
                <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                  Uma jornada prática e intensiva de etapas estruturadas para capacitar você em regras operacionais, fundamentos bancários, cálculos e estratégias de alta performance em crédito consignado.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-xs font-black text-slate-900 uppercase">Etapas Diárias</div>
                  <div className="text-[12px] text-slate-500 font-medium">Conteúdo direto ao ponto com foco prático no mercado.</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-xs font-black text-slate-900 uppercase">Tomada de Decisão</div>
                  <div className="text-[12px] text-slate-500 font-medium">Simulação de cenários reais para testar seu raciocínio.</div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="text-xs font-black text-slate-900 uppercase">Fixação Ativa</div>
                  <div className="text-[12px] text-slate-500 font-medium">Resumos com suas palavras para máxima retenção.</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDia(1)
                    setIniciouCurso(true)
                  }}
                  className="inline-flex items-center gap-2 bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs sm:text-xs py-2.5 px-6 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  <span>COMEÇAR</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#00D492]" />
                </button>
              </div>
            </div>
          ) : (
            /* PÁGINA DE CONTINUIDADE (1 ou mais dias concluídos) */
            <div className="text-center space-y-6 pt-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mx-auto shadow-xs">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-3 max-w-xl mx-auto">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Progresso Ativo
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Bem-vindo de volta!
                </h1>
                <p className="text-sm sm:text-[15px] text-slate-600 leading-relaxed">
                  Você já concluiu <strong>{totalConcluidos} {totalConcluidos === 1 ? "dia" : "dias"}</strong>. Retome de onde parou e bons estudos!
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDia(diaAtivoEmCurso)
                    setIniciouCurso(true)
                  }}
                  className="inline-flex items-center gap-2 bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs sm:text-xs py-2.5 px-6 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  <span>CONTINUAR</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#00D492]" />
                </button>
              </div>
            </div>
          )}
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
              <button
                type="button"
                onClick={() => setIniciouCurso(false)}
                className="text-xs text-slate-500 hover:text-slate-900 font-bold flex items-center gap-1.5 transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg shrink-0"
              >
                <span>← Início</span>
              </button>
            </div>

            {/* Barra com dias concluídos e o dia ativo atual em curso */}
            <div className="flex items-center gap-2 overflow-x-auto p-[5px] scrollbar-thin">
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
                <button
                  type="button"
                  onClick={() => setSelectedDia(diaAtivoEmCurso)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer flex items-center gap-1.5 bg-[#0F172B] hover:bg-slate-800 text-white shadow-xs"
                  title={`Voltar para o DIA ${diaAtivoEmCurso}`}
                >
                  <CheckCircle2 className="w-3 h-3 text-[#00D492]" />
                  <span>DIA {diaAtivoEmCurso}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Day Header Bar */}
            <div className="pt-4 pb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#0F172B] text-white">
                      DIA {currentDiaData.dia}
                    </span>
                    {currentDiaData.dia === 11 || currentDiaData.dia === 22 ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                        AVALIAÇÃO OFICIAL
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">Sessão de estudo guiado • aproximadamente 30 minutos</span>
                    )}
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

                  {/* Interactive Mini Simulator on Calculation Days */}
                  {currentDiaData.vejaAcontecendo.tipo === "calculadora" && (
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 space-y-3">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Simulador Rápido de Margem
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="text-slate-400 block mb-1">Margem (R$)</label>
                          <input
                            type="number"
                            value={calcMargem}
                            onChange={(e) => setCalcMargem(Number(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Coeficiente</label>
                          <input
                            type="number"
                            step="0.00001"
                            value={calcCoef}
                            onChange={(e) => setCalcCoef(Number(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-slate-400 block mb-1">Prazo</label>
                          <input
                            type="number"
                            value={calcPrazo}
                            onChange={(e) => setCalcPrazo(Number(e.target.value) || 0)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white font-bold"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                        <span className="text-xs text-slate-400">Valor Liberado Calculado:</span>
                        <span className="text-lg font-black text-[#00D492]">
                          R${" "}
                          {(calcCoef > 0 ? (calcMargem / calcCoef) * (1 - 0.05) : 0).toLocaleString(
                            "pt-BR",
                            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                          )}
                        </span>
                      </div>
                    </div>
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
                        placeholder="Digite sua explicação com suas próprias palavras..."
                        className={cn(
                          "w-full bg-white border border-amber-300 rounded-xl p-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm",
                          isDiaBloqueado && "bg-amber-50/60 text-slate-700 cursor-not-allowed opacity-90 resize-none"
                        )}
                      />

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
                                  hasAnswered && isAdminOrDev
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
                                {hasAnswered && isAdminOrDev && isCorrect ? (
                                  <Check className="w-3 h-3" />
                                ) : hasAnswered && isAdminOrDev && isSelected ? (
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

                      {/* Feedback Explicativo (Visível exclusivamente para Administrador ou Desenvolvedor) */}
                      {isAdminOrDev && decisoesTomadas[currentDiaData.dia] !== undefined && (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm font-semibold text-slate-900">
                  {currentDiaData.oQueLevar.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 bg-white p-3.5 rounded-xl border border-slate-300 shadow-xs">
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
                <button
                  type="button"
                  disabled={selectedDia >= 22}
                  onClick={handleAvancarProximoDia}
                  className="bg-[#0F172B] hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  <span>Próximo Dia</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#00D492]" />
                </button>
              </div>
            </div>
      </div>
    </div>
  )
}
