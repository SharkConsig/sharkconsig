// Dicionários, Questões e Regras do Perfil Profissional SharkConsig (v1.0)
export type DimensaoCodigo = "ACT" | "COM" | "CON" | "PRE" | "RES" | "AUT"
export type FaixaScore = "Muito baixa" | "Baixa" | "Equilibrada" | "Alta" | "Muito alta"
export type ArquetipoNome = "Executor" | "Influenciador" | "Construtor" | "Estruturador" | "Desafiador" | "Estrategista"
export type ModoAprendizagem = "PRACTICE" | "GUIDED" | "LOGIC" | "DISCOVERY"

export interface QuestaoOpcao {
  letra: "A" | "B" | "C" | "D"
  texto: string
  pesos: Partial<Record<DimensaoCodigo, number>>
  learn?: ModoAprendizagem
}

export interface Questao {
  numero: number
  enunciado: string
  opcoes: QuestaoOpcao[]
}

export const DIMENSOES_INFO: Record<DimensaoCodigo, { nome: string; oQueMede: string; arquetipo: ArquetipoNome }> = {
  ACT: { nome: "Ação", oQueMede: "Iniciativa, velocidade e tendência a transformar direcionamento em execução.", arquetipo: "Executor" },
  COM: { nome: "Comunicação e Influência", oQueMede: "Tendência à interação, expressão, conexão e influência.", arquetipo: "Influenciador" },
  CON: { nome: "Constância", oQueMede: "Tendência à manutenção de ritmo, repetição, rotina e estabilidade.", arquetipo: "Construtor" },
  PRE: { nome: "Precisão", oQueMede: "Tendência à conferência, estrutura, análise e cuidado com detalhes.", arquetipo: "Estruturador" },
  RES: { nome: "Resiliência Comercial", oQueMede: "Tendência a recuperar ritmo diante de negativas, pressão e oscilação.", arquetipo: "Desafiador" },
  AUT: { nome: "Autonomia", oQueMede: "Tendência a avançar de forma independente após compreender objetivo e limites.", arquetipo: "Estrategista" }
}

export const ARQUETIPOS_MAP: Record<DimensaoCodigo, ArquetipoNome> = {
  ACT: "Executor",
  COM: "Influenciador",
  CON: "Construtor",
  PRE: "Estruturador",
  RES: "Desafiador",
  AUT: "Estrategista"
}

export const ARQUETIPO_INFO: Record<ArquetipoNome, {
  dimensao: DimensaoCodigo
  essencia: string
  forcas: string
  riscos: string
  comoLiderar: string
  desafioPadrao: string
  motivador: string
}> = {
  Executor: {
    dimensao: "ACT",
    essencia: "Move, inicia e transforma objetivo em execução.",
    forcas: "Velocidade, iniciativa, senso de avanço.",
    riscos: "Pressa, dispersão e menor conferência.",
    comoLiderar: "Objetivo claro → ação → checkpoint.",
    desafioPadrao: "Transformar velocidade em execução consistente e conferida",
    motivador: "progresso/desafio"
  },
  Influenciador: {
    dimensao: "COM",
    essencia: "Cria conexão e movimenta pessoas pela comunicação.",
    forcas: "Relacionamento, persuasão e energia social.",
    riscos: "Excesso de fala, improviso ou baixa objetividade.",
    comoLiderar: "Contexto curto → interação → conclusão objetiva.",
    desafioPadrao: "Transformar conexão em conversas objetivas e conclusivas",
    motivador: "interação/reconhecimento"
  },
  Construtor: {
    dimensao: "CON",
    essencia: "Sustenta ritmo, rotina e repetição com estabilidade.",
    forcas: "Disciplina, previsibilidade e continuidade.",
    riscos: "Resistência a mudanças bruscas ou acomodação em método conhecido.",
    comoLiderar: "Rotina clara → cadência → evolução incremental.",
    desafioPadrao: "Preservar constância sem perder adaptação",
    motivador: "clareza/cadência"
  },
  Estruturador: {
    dimensao: "PRE",
    essencia: "Organiza, confere e reduz risco antes de concluir.",
    forcas: "Qualidade, análise e controle de detalhes.",
    riscos: "Excesso de análise e lentidão para decidir.",
    comoLiderar: "Critério claro → prazo → decisão.",
    desafioPadrao: "Preservar qualidade sem atrasar decisões",
    motivador: "qualidade/domínio"
  },
  Desafiador: {
    dimensao: "RES",
    essencia: "Mantém busca e recuperação diante de pressão e negativas.",
    forcas: "Persistência, recuperação e intensidade.",
    riscos: "Insistência sem revisão ou desgaste acumulado.",
    comoLiderar: "Desafio → tentativa → revisão → nova tentativa.",
    desafioPadrao: "Persistir com revisão de estratégia",
    motivador: "superação/desafio"
  },
  Estrategista: {
    dimensao: "AUT",
    essencia: "Prefere compreender objetivo e encontrar o próprio caminho.",
    forcas: "Independência, decisão e adaptação.",
    riscos: "Desalinhamento ou resistência a controle excessivo.",
    comoLiderar: "Objetivo + limites → autonomia → checkpoint de resultado.",
    desafioPadrao: "Usar autonomia mantendo alinhamento",
    motivador: "autonomia/responsabilidade"
  }
}

export const DICIONARIO_DIMENSOES: Record<DimensaoCodigo, Record<FaixaScore, {
  significado: string
  forcaPotencial: string
  riscoPotencial: string
  acaoLider: string
}>> = {
  ACT: {
    "Muito baixa": {
      significado: "Tende a iniciar com cautela e buscar maior segurança antes de agir.",
      forcaPotencial: "Pode reduzir impulsividade e favorecer decisões mais preparadas.",
      riscoPotencial: "Pode demorar a entrar em movimento sem prioridade clara.",
      acaoLider: "Dê primeiro passo muito concreto, prazo curto e checkpoint inicial."
    },
    "Baixa": {
      significado: "Prefere compreender e organizar antes de acelerar.",
      forcaPotencial: "Boa capacidade de evitar ação precipitada.",
      riscoPotencial: "Pode perder velocidade em ambientes de alta cadência.",
      acaoLider: "Quebre objetivos em ações pequenas e visíveis."
    },
    "Equilibrada": {
      significado: "Alterna análise e ação conforme o contexto.",
      forcaPotencial: "Flexibilidade entre preparar e executar.",
      riscoPotencial: "Pode variar o ritmo dependendo da clareza da prioridade.",
      acaoLider: "Defina prioridade e resultado esperado; acompanhe pela entrega."
    },
    "Alta": {
      significado: "Tende a agir rapidamente quando entende o objetivo.",
      forcaPotencial: "Iniciativa e velocidade.",
      riscoPotencial: "Pode avançar antes de conferir todos os detalhes.",
      acaoLider: "Seja direto; dê espaço para executar e use checkpoints."
    },
    "Muito alta": {
      significado: "Forte impulso para movimento, iniciativa e resultado imediato.",
      forcaPotencial: "Alta energia de execução.",
      riscoPotencial: "Risco maior de pressa, dispersão ou atropelo de processo.",
      acaoLider: "Use desafios curtos, limites claros e conferência em pontos críticos."
    }
  },
  COM: {
    "Muito baixa": {
      significado: "Tende a ser mais reservado e seletivo nas interações.",
      forcaPotencial: "Escuta e menor necessidade de exposição.",
      riscoPotencial: "Pode comunicar pouco ou demorar a construir presença comercial.",
      acaoLider: "Prepare scripts, objetivos de conversa e prática estruturada."
    },
    "Baixa": {
      significado: "Comunica-se melhor com propósito e contexto claros.",
      forcaPotencial: "Objetividade e menor dispersão social.",
      riscoPotencial: "Pode precisar de estímulo para iniciar interações.",
      acaoLider: "Dê modelos de abertura e metas de contato."
    },
    "Equilibrada": {
      significado: "Consegue alternar escuta e expressão conforme a situação.",
      forcaPotencial: "Adaptação social.",
      riscoPotencial: "Pode não usar influência de forma consistente.",
      acaoLider: "Treine perguntas, escuta e fechamento de conversa."
    },
    "Alta": {
      significado: "Tende a criar conexão e se expressar com facilidade.",
      forcaPotencial: "Relacionamento e persuasão natural.",
      riscoPotencial: "Pode falar mais do que escuta ou alongar conversas.",
      acaoLider: "Use role play e feedback sobre escuta/objetividade."
    },
    "Muito alta": {
      significado: "Forte necessidade e facilidade de interação e influência.",
      forcaPotencial: "Energia social, conexão e capacidade de mobilizar.",
      riscoPotencial: "Risco de excesso de fala, improviso ou busca de aprovação.",
      acaoLider: "Dê espaço para interação, mas cobre estrutura, escuta e conclusão."
    }
  },
  CON: {
    "Muito baixa": {
      significado: "Tende a buscar variedade e pode perder energia em repetição.",
      forcaPotencial: "Flexibilidade e abertura a mudança.",
      riscoPotencial: "Risco de abandonar cadências e rotinas.",
      acaoLider: "Use blocos curtos, metas visíveis e checkpoints frequentes."
    },
    "Baixa": {
      significado: "Mantém rotina melhor quando percebe propósito e progresso.",
      forcaPotencial: "Adapta-se com facilidade.",
      riscoPotencial: "Pode oscilar em tarefas repetitivas.",
      acaoLider: "Crie cadência simples e acompanhe aderência."
    },
    "Equilibrada": {
      significado: "Consegue sustentar rotina sem depender totalmente dela.",
      forcaPotencial: "Equilíbrio entre repetição e mudança.",
      riscoPotencial: "Ritmo pode oscilar em períodos de menor estímulo.",
      acaoLider: "Use rotina clara com espaço para ajustes."
    },
    "Alta": {
      significado: "Tende a manter cadência e repetir processos com estabilidade.",
      forcaPotencial: "Disciplina e previsibilidade.",
      riscoPotencial: "Pode demorar a abandonar um método que deixou de funcionar.",
      acaoLider: "Mantenha rotina clara e sinalize explicitamente quando mudar."
    },
    "Muito alta": {
      significado: "Forte preferência por continuidade, ritmo e previsibilidade.",
      forcaPotencial: "Alta estabilidade de execução.",
      riscoPotencial: "Mudanças bruscas podem reduzir velocidade ou segurança.",
      acaoLider: "Antecipe mudanças, explique a nova rotina e preserve referências."
    }
  },
  PRE: {
    "Muito baixa": {
      significado: "Tende a privilegiar avanço e visão geral sobre conferência detalhada.",
      forcaPotencial: "Rapidez e baixa paralisia por análise.",
      riscoPotencial: "Maior risco de erro em etapas sensíveis.",
      acaoLider: "Use checklists obrigatórios e validação em pontos críticos."
    },
    "Baixa": {
      significado: "Confere quando percebe risco, mas não busca detalhe espontaneamente.",
      forcaPotencial: "Agilidade.",
      riscoPotencial: "Pode subestimar pequenas inconsistências.",
      acaoLider: "Defina quais itens sempre precisam de conferência."
    },
    "Equilibrada": {
      significado: "Alterna velocidade e conferência conforme a demanda.",
      forcaPotencial: "Boa adaptação entre detalhe e execução.",
      riscoPotencial: "Pode variar padrão de qualidade sem critérios explícitos.",
      acaoLider: "Defina critérios objetivos de qualidade."
    },
    "Alta": {
      significado: "Tende a analisar e conferir antes de concluir.",
      forcaPotencial: "Qualidade, organização e redução de erro.",
      riscoPotencial: "Pode gastar tempo demais em validações.",
      acaoLider: "Defina limite de análise e prazo para decisão."
    },
    "Muito alta": {
      significado: "Forte orientação a detalhe, estrutura e prevenção de erro.",
      forcaPotencial: "Excelente atenção a processo e risco.",
      riscoPotencial: "Risco de perfeccionismo, lentidão ou excesso de validação.",
      acaoLider: "Dê critérios de 'bom o suficiente', prazo e autonomia para concluir."
    }
  },
  RES: {
    "Muito baixa": {
      significado: "Negativas e pressão tendem a afetar mais o ritmo imediato.",
      forcaPotencial: "Sensibilidade para perceber impacto e necessidade de ajuste.",
      riscoPotencial: "Pode demorar a retomar após frustração.",
      acaoLider: "Faça retomadas curtas, normalize o processo e foque na próxima ação."
    },
    "Baixa": {
      significado: "Consegue retomar, mas pode precisar de apoio após sequência ruim.",
      forcaPotencial: "Capacidade de reflexão após dificuldade.",
      riscoPotencial: "Oscilação de ritmo em dias adversos.",
      acaoLider: "Use checkpoints próximos e metas por bloco."
    },
    "Equilibrada": {
      significado: "Recupera-se de dificuldades em ritmo compatível com o contexto.",
      forcaPotencial: "Boa adaptação emocional à rotina.",
      riscoPotencial: "Pode precisar de estratégia específica em pressão prolongada.",
      acaoLider: "Acompanhe tendência de recuperação e reforce processo."
    },
    "Alta": {
      significado: "Tende a voltar ao ritmo rapidamente após negativas.",
      forcaPotencial: "Persistência e estabilidade sob pressão.",
      riscoPotencial: "Pode insistir além do necessário sem revisar estratégia.",
      acaoLider: "Estimule persistência com pausas de análise."
    },
    "Muito alta": {
      significado: "Forte capacidade de continuar buscando resultado em cenário adverso.",
      forcaPotencial: "Alta recuperação e tolerância à rejeição.",
      riscoPotencial: "Risco de insistência automática ou pouca leitura do desgaste.",
      acaoLider: "Use desafios, mas obrigue revisão de estratégia quando o padrão não muda."
    }
  },
  AUT: {
    "Muito baixa": {
      significado: "Prefere direcionamento frequente e validação antes de avançar.",
      forcaPotencial: "Boa aderência quando o caminho está claro.",
      riscoPotencial: "Pode ficar dependente da liderança.",
      acaoLider: "Dê instrução clara e reduza validações gradualmente."
    },
    "Baixa": {
      significado: "Funciona melhor com referências e checkpoints definidos.",
      forcaPotencial: "Segurança na execução orientada.",
      riscoPotencial: "Pode hesitar diante de ambiguidade.",
      acaoLider: "Defina limites e ofereça pequenas zonas de decisão."
    },
    "Equilibrada": {
      significado: "Consegue alternar orientação e independência.",
      forcaPotencial: "Flexibilidade de gestão.",
      riscoPotencial: "Pode buscar validação em situações novas.",
      acaoLider: "Explique o que pode decidir sozinho e o que deve escalar."
    },
    "Alta": {
      significado: "Tende a avançar bem com objetivo e limites claros.",
      forcaPotencial: "Independência e capacidade de decisão.",
      riscoPotencial: "Pode alinhar menos do que o necessário.",
      acaoLider: "Dê autonomia com checkpoints de resultado."
    },
    "Muito alta": {
      significado: "Forte preferência por decidir e executar com liberdade.",
      forcaPotencial: "Protagonismo e independência.",
      riscoPotencial: "Risco de desalinhamento ou resistência a microgestão.",
      acaoLider: "Defina objetivo, limites e critérios; evite controlar o caminho."
    }
  }
}

// 30 Combinações Direcionais (Seção 8)
export const COMBINACOES_ARQUETIPOS: Record<string, string> = {
  "Executor-Influenciador": "velocidade com conexão; atenção para não acelerar a conversa antes de escutar",
  "Executor-Construtor": "velocidade com capacidade de sustentar cadência; atenção para não transformar ritmo em automatismo",
  "Executor-Estruturador": "velocidade com conferência; combinação útil para equilibrar execução e qualidade",
  "Executor-Desafiador": "velocidade com alta recuperação; atenção para intensidade sem revisão",
  "Executor-Estrategista": "velocidade com independência; atenção para agir sem alinhar pontos críticos",

  "Influenciador-Executor": "conexão com iniciativa; atenção para excesso de fala e pressa",
  "Influenciador-Construtor": "conexão com estabilidade; atenção para conversas longas sem avanço",
  "Influenciador-Estruturador": "conexão com leitura de detalhes; atenção para sobreanalisar reações",
  "Influenciador-Desafiador": "conexão com persistência; atenção para insistência em objeções já encerradas",
  "Influenciador-Estrategista": "conexão com independência; atenção para improvisar fora do alinhamento",

  "Construtor-Executor": "cadência com iniciativa; atenção para acelerar sem perder o método",
  "Construtor-Influenciador": "cadência com relacionamento; atenção para interrupções sociais quebrarem o ritmo",
  "Construtor-Estruturador": "cadência com precisão; atenção para rigidez e excesso de processo",
  "Construtor-Desafiador": "cadência com persistência; atenção para manter método mesmo sem resultado",
  "Construtor-Estrategista": "cadência com autonomia; atenção para criar rotinas próprias desalinhadas",

  "Estruturador-Executor": "precisão com capacidade de agir; atenção para conflito entre velocidade e conferência",
  "Estruturador-Influenciador": "precisão com comunicação; atenção para buscar informação demais antes de conduzir",
  "Estruturador-Construtor": "precisão com constância; atenção para rigidez e perfeccionismo",
  "Estruturador-Desafiador": "precisão com persistência; atenção para insistir em aperfeiçoamento além do necessário",
  "Estruturador-Estrategista": "precisão com autonomia; atenção para decisões independentes excessivamente analíticas",

  "Desafiador-Executor": "persistência com velocidade; atenção para intensidade sem pausa de análise",
  "Desafiador-Influenciador": "persistência com influência; atenção para transformar objeção em disputa",
  "Desafiador-Construtor": "persistência com cadência; atenção para repetir estratégia que precisa mudar",
  "Desafiador-Estruturador": "persistência com análise; atenção para prolongar tentativas por excesso de ajuste",
  "Desafiador-Estrategista": "persistência com independência; atenção para insistir sem buscar segunda visão",

  "Estrategista-Executor": "autonomia com velocidade; atenção para avançar sem alinhamento",
  "Estrategista-Influenciador": "autonomia com comunicação; atenção para compromissos assumidos sem validação",
  "Estrategista-Construtor": "autonomia com estabilidade; atenção para criar processos paralelos",
  "Estrategista-Estruturador": "autonomia com precisão; atenção para excesso de análise individual",
  "Estrategista-Desafiador": "autonomia com persistência; atenção para insistir sozinho por tempo demais"
}

export const MODOS_APRENDIZAGEM_INFO: Record<ModoAprendizagem, { nome: string; sequencia: string }> = {
  PRACTICE: {
    nome: "Prática rápida",
    sequencia: "Ver rapidamente → praticar → repetir → corrigir."
  },
  GUIDED: {
    nome: "Prática guiada",
    sequencia: "Demonstração → execução acompanhada → feedback → nova execução."
  },
  LOGIC: {
    nome: "Lógica antes da prática",
    sequencia: "Entender lógica/processo → ver exemplo → praticar."
  },
  DISCOVERY: {
    nome: "Descoberta orientada",
    sequencia: "Receber objetivo e limites → tentar → revisar resultado → ajustar."
  }
}

// 36 Questões Objetivas Exatas da Seção 4
export const QUESTOES_TESTE: Questao[] = [
  {
    numero: 1,
    enunciado: "Quando recebo uma tarefa nova com objetivo claro, minha tendência inicial é:",
    opcoes: [
      { letra: "A", texto: "Começar logo e ajustar enquanto avanço", pesos: { ACT: 3, AUT: 1 } },
      { letra: "B", texto: "Organizar uma sequência para manter o ritmo", pesos: { CON: 3, PRE: 1 } },
      { letra: "C", texto: "Conferir detalhes antes de iniciar", pesos: { PRE: 3, CON: 1 } },
      { letra: "D", texto: "Definir meu próprio caminho e avançar", pesos: { AUT: 3, ACT: 1 } }
    ]
  },
  {
    numero: 2,
    enunciado: "Em uma conversa profissional com alguém que ainda não conheço, normalmente:",
    opcoes: [
      { letra: "A", texto: "Busco criar conexão rapidamente", pesos: { COM: 3, ACT: 1 } },
      { letra: "B", texto: "Observo primeiro para adaptar minha abordagem", pesos: { PRE: 2, COM: 1 } },
      { letra: "C", texto: "Mantenho uma abordagem estável e cordial", pesos: { CON: 3, COM: 1 } },
      { letra: "D", texto: "Vou direto ao objetivo da conversa", pesos: { ACT: 2, AUT: 2 } }
    ]
  },
  {
    numero: 3,
    enunciado: "Depois de várias negativas seguidas, eu tendo a:",
    opcoes: [
      { letra: "A", texto: "Buscar a próxima oportunidade rapidamente", pesos: { RES: 3, ACT: 1 } },
      { letra: "B", texto: "Rever minha abordagem antes de continuar", pesos: { PRE: 2, RES: 2 } },
      { letra: "C", texto: "Manter o processo e continuar no ritmo planejado", pesos: { CON: 3, RES: 1 } },
      { letra: "D", texto: "Mudar a estratégia por conta própria e testar", pesos: { AUT: 3, RES: 1 } }
    ]
  },
  {
    numero: 4,
    enunciado: "Quando uma atividade exige repetição por várias horas, eu:",
    opcoes: [
      { letra: "A", texto: "Consigo manter um ritmo constante", pesos: { CON: 3, RES: 1 } },
      { letra: "B", texto: "Procuro formas de acelerar e variar a execução", pesos: { ACT: 3, AUT: 1 } },
      { letra: "C", texto: "Uso conferências para preservar a qualidade", pesos: { PRE: 3, CON: 1 } },
      { letra: "D", texto: "Prefiro intercalar com atividades de interação", pesos: { COM: 3, ACT: 1 } }
    ]
  },
  {
    numero: 5,
    enunciado: "Quando recebo uma orientação curta, mas suficiente, eu prefiro:",
    opcoes: [
      { letra: "A", texto: "Ter liberdade para executar do meu jeito", pesos: { AUT: 3, ACT: 1 } },
      { letra: "B", texto: "Começar imediatamente", pesos: { ACT: 3, AUT: 1 } },
      { letra: "C", texto: "Confirmar os pontos críticos antes", pesos: { PRE: 3, CON: 1 } },
      { letra: "D", texto: "Transformar a orientação em uma rotina clara", pesos: { CON: 3, PRE: 1 } }
    ]
  },
  {
    numero: 6,
    enunciado: "Em uma negociação difícil, minha reação mais natural é:",
    opcoes: [
      { letra: "A", texto: "Usar conversa e argumentos para construir abertura", pesos: { COM: 3, RES: 1 } },
      { letra: "B", texto: "Persistir sem me abalar com a resistência", pesos: { RES: 3, ACT: 1 } },
      { letra: "C", texto: "Analisar sinais e ajustar os detalhes da proposta", pesos: { PRE: 3, COM: 1 } },
      { letra: "D", texto: "Tomar iniciativa e conduzir para uma decisão", pesos: { ACT: 3, COM: 1 } }
    ]
  },
  {
    numero: 7,
    enunciado: "Se meu dia começa diferente do planejado, eu normalmente:",
    opcoes: [
      { letra: "A", texto: "Reorganizo e sigo sem perder muito ritmo", pesos: { RES: 3, AUT: 1 } },
      { letra: "B", texto: "Refaço a ordem das tarefas para manter constância", pesos: { CON: 3, PRE: 1 } },
      { letra: "C", texto: "Escolho a prioridade e parto para execução", pesos: { ACT: 3, AUT: 1 } },
      { letra: "D", texto: "Procuro entender o que mudou antes de agir", pesos: { PRE: 3, CON: 1 } }
    ]
  },
  {
    numero: 8,
    enunciado: "Quando preciso aprender algo novo, a experiência que mais me ajuda é:",
    opcoes: [
      { letra: "A", texto: "Ver um exemplo e praticar logo depois", pesos: { ACT: 1 }, learn: "PRACTICE" },
      { letra: "B", texto: "Entender a lógica e os detalhes antes de praticar", pesos: { PRE: 1 }, learn: "LOGIC" },
      { letra: "C", texto: "Receber um objetivo e descobrir fazendo", pesos: { AUT: 1 }, learn: "DISCOVERY" },
      { letra: "D", texto: "Praticar com alguém e receber feedback durante", pesos: { COM: 1 }, learn: "GUIDED" }
    ]
  },
  {
    numero: 9,
    enunciado: "Quando percebo uma oportunidade no meio de uma tarefa, eu:",
    opcoes: [
      { letra: "A", texto: "Aproveito rapidamente se fizer sentido", pesos: { ACT: 3, AUT: 1 } },
      { letra: "B", texto: "Avalio o impacto antes de mudar o plano", pesos: { PRE: 3, AUT: 1 } },
      { letra: "C", texto: "Termino o que estava fazendo antes de mudar", pesos: { CON: 3, PRE: 1 } },
      { letra: "D", texto: "Converso com alguém para validar a oportunidade", pesos: { COM: 2, PRE: 1 } }
    ]
  },
  {
    numero: 10,
    enunciado: "Quando meu resultado fica abaixo do esperado, minha primeira tendência é:",
    opcoes: [
      { letra: "A", texto: "Aumentar meu movimento", pesos: { ACT: 3, RES: 1 } },
      { letra: "B", texto: "Analisar onde o processo está falhando", pesos: { PRE: 3, RES: 1 } },
      { letra: "C", texto: "Manter a rotina e corrigir aos poucos", pesos: { CON: 3, RES: 1 } },
      { letra: "D", texto: "Buscar troca de ideias e novas abordagens", pesos: { COM: 3, RES: 1 } }
    ]
  },
  {
    numero: 11,
    enunciado: "Em um grupo de trabalho, eu naturalmente:",
    opcoes: [
      { letra: "A", texto: "Estimulo a conversa e a participação", pesos: { COM: 3, ACT: 1 } },
      { letra: "B", texto: "Ajudo a manter organização e continuidade", pesos: { CON: 3, PRE: 1 } },
      { letra: "C", texto: "Assumo iniciativa quando algo precisa andar", pesos: { ACT: 3, AUT: 1 } },
      { letra: "D", texto: "Observo padrões e riscos que podem passar despercebidos", pesos: { PRE: 3, AUT: 1 } }
    ]
  },
  {
    numero: 12,
    enunciado: "Quando uma regra de processo parece pouco eficiente, eu:",
    opcoes: [
      { letra: "A", texto: "Sigo enquanto proponho uma melhoria", pesos: { CON: 2, COM: 1 } },
      { letra: "B", texto: "Testo uma alternativa se tiver autonomia", pesos: { AUT: 3, ACT: 1 } },
      { letra: "C", texto: "Analiso o motivo da regra antes de mudar", pesos: { PRE: 3, AUT: 1 } },
      { letra: "D", texto: "Busco rapidamente uma forma mais eficiente", pesos: { ACT: 3, AUT: 1 } }
    ]
  },
  {
    numero: 13,
    enunciado: "Se recebo um feedback crítico, normalmente:",
    opcoes: [
      { letra: "A", texto: "Consigo separar a crítica da minha motivação e seguir", pesos: { RES: 3, CON: 1 } },
      { letra: "B", texto: "Quero entender exatamente o que devo corrigir", pesos: { PRE: 3, RES: 1 } },
      { letra: "C", texto: "Prefiro transformar rapidamente em uma nova ação", pesos: { ACT: 3, RES: 1 } },
      { letra: "D", texto: "Converso para compreender contexto e intenção", pesos: { COM: 3, RES: 1 } }
    ]
  },
  {
    numero: 14,
    enunciado: "Quando tenho muitas tarefas simultâneas, eu:",
    opcoes: [
      { letra: "A", texto: "Priorizo e começo pela que pode gerar mais resultado", pesos: { ACT: 3, AUT: 1 } },
      { letra: "B", texto: "Crio uma ordem e sigo até concluir", pesos: { CON: 3, PRE: 1 } },
      { letra: "C", texto: "Analiso dependências e riscos antes", pesos: { PRE: 3, AUT: 1 } },
      { letra: "D", texto: "Alinho com pessoas envolvidas para coordenar", pesos: { COM: 3, CON: 1 } }
    ]
  },
  {
    numero: 15,
    enunciado: "Quando não existe um passo a passo completo, eu:",
    opcoes: [
      { letra: "A", texto: "Consigo avançar definindo meu próprio caminho", pesos: { AUT: 3, ACT: 1 } },
      { letra: "B", texto: "Prefiro construir um método antes de continuar", pesos: { PRE: 2, CON: 2 } },
      { letra: "C", texto: "Começo e ajusto na prática", pesos: { ACT: 3, RES: 1 } },
      { letra: "D", texto: "Busco referências com outras pessoas", pesos: { COM: 3, PRE: 1 } }
    ]
  },
  {
    numero: 16,
    enunciado: "Em uma rotina comercial, o que mais naturalmente sustenta meu ritmo é:",
    opcoes: [
      { letra: "A", texto: "Perceber avanço e novos desafios", pesos: { ACT: 2, RES: 2 } },
      { letra: "B", texto: "Interagir e construir oportunidades com pessoas", pesos: { COM: 3, ACT: 1 } },
      { letra: "C", texto: "Ter uma cadência clara para repetir", pesos: { CON: 3, RES: 1 } },
      { letra: "D", texto: "Ter controle sobre qualidade e detalhes", pesos: { PRE: 3, CON: 1 } }
    ]
  },
  {
    numero: 17,
    enunciado: "Quando uma tentativa não funciona como esperado, eu:",
    opcoes: [
      { letra: "A", texto: "Tento novamente sem carregar muito a frustração", pesos: { RES: 3, ACT: 1 } },
      { letra: "B", texto: "Mudo rapidamente a forma de executar", pesos: { AUT: 2, ACT: 2 } },
      { letra: "C", texto: "Investigo o erro antes da próxima tentativa", pesos: { PRE: 3, RES: 1 } },
      { letra: "D", texto: "Repito o processo correto por mais algumas tentativas", pesos: { CON: 3, RES: 1 } }
    ]
  },
  {
    numero: 18,
    enunciado: "Ao explicar algo para outra pessoa, eu tendo a:",
    opcoes: [
      { letra: "A", texto: "Usar exemplos e adaptar minha fala à reação dela", pesos: { COM: 3, PRE: 1 } },
      { letra: "B", texto: "Ser direto e chegar rapidamente ao ponto", pesos: { ACT: 3, COM: 1 } },
      { letra: "C", texto: "Seguir uma sequência para não esquecer etapas", pesos: { CON: 3, PRE: 1 } },
      { letra: "D", texto: "Explicar a lógica para que ela consiga se virar depois", pesos: { AUT: 2, PRE: 2 } }
    ]
  },
  {
    numero: 19,
    enunciado: "Se ninguém estiver acompanhando de perto meu trabalho, eu:",
    opcoes: [
      { letra: "A", texto: "Mantenho a execução se o objetivo estiver claro", pesos: { AUT: 3, CON: 1 } },
      { letra: "B", texto: "Crio meus próprios checkpoints", pesos: { PRE: 2, AUT: 2 } },
      { letra: "C", texto: "Mantenho o ritmo por hábito e rotina", pesos: { CON: 3, AUT: 1 } },
      { letra: "D", texto: "Busco novos alvos assim que termino o que foi pedido", pesos: { ACT: 3, AUT: 1 } }
    ]
  },
  {
    numero: 20,
    enunciado: "Quando preciso tomar uma decisão com informação incompleta, eu:",
    opcoes: [
      { letra: "A", texto: "Decido e corrijo se necessário", pesos: { ACT: 3, RES: 1 } },
      { letra: "B", texto: "Uso minha experiência e assumo a decisão", pesos: { AUT: 3, RES: 1 } },
      { letra: "C", texto: "Busco reduzir a incerteza antes de decidir", pesos: { PRE: 3, AUT: 1 } },
      { letra: "D", texto: "Procuro uma segunda visão rapidamente", pesos: { COM: 2, PRE: 1 } }
    ]
  },
  {
    numero: 21,
    enunciado: "Em períodos de resultado muito bom, eu tendo a:",
    opcoes: [
      { letra: "A", texto: "Aumentar ainda mais o ritmo", pesos: { ACT: 3, RES: 1 } },
      { letra: "B", texto: "Manter a cadência que está funcionando", pesos: { CON: 3, RES: 1 } },
      { letra: "C", texto: "Observar o que gerou o resultado para repetir", pesos: { PRE: 3, CON: 1 } },
      { letra: "D", texto: "Compartilhar energia e envolver outras pessoas", pesos: { COM: 3, ACT: 1 } }
    ]
  },
  {
    numero: 22,
    enunciado: "Quando alguém discorda de mim profissionalmente, eu:",
    opcoes: [
      { letra: "A", texto: "Argumento e busco construir convencimento", pesos: { COM: 3, RES: 1 } },
      { letra: "B", texto: "Mantenho minha posição se tiver evidências", pesos: { RES: 2, AUT: 2 } },
      { letra: "C", texto: "Reavalio os dados antes de insistir", pesos: { PRE: 3, RES: 1 } },
      { letra: "D", texto: "Procuro uma decisão prática para seguir", pesos: { ACT: 3, AUT: 1 } }
    ]
  },
  {
    numero: 23,
    enunciado: "Em um processo com várias etapas, eu naturalmente:",
    opcoes: [
      { letra: "A", texto: "Gosto de saber exatamente onde estou e o que falta", pesos: { PRE: 3, CON: 1 } },
      { letra: "B", texto: "Mantenho uma sequência até terminar", pesos: { CON: 3, PRE: 1 } },
      { letra: "C", texto: "Foco no resultado final e acelero etapas possíveis", pesos: { ACT: 3, AUT: 1 } },
      { letra: "D", texto: "Adapto o caminho conforme novas informações", pesos: { AUT: 3, RES: 1 } }
    ]
  },
  {
    numero: 24,
    enunciado: "Quando o trabalho exige contato com muitas pessoas no mesmo dia, eu:",
    opcoes: [
      { letra: "A", texto: "Ganho energia com a interação", pesos: { COM: 3, RES: 1 } },
      { letra: "B", texto: "Consigo manter a mesma abordagem por bastante tempo", pesos: { CON: 3, RES: 1 } },
      { letra: "C", texto: "Busco objetividade para avançar mais contatos", pesos: { ACT: 3, COM: 1 } },
      { letra: "D", texto: "Ajusto minha abordagem conforme cada pessoa", pesos: { PRE: 2, COM: 2 } }
    ]
  },
  {
    numero: 25,
    enunciado: "Se uma meta parece difícil de atingir, eu:",
    opcoes: [
      { letra: "A", texto: "Encaro como desafio e continuo buscando", pesos: { RES: 3, ACT: 1 } },
      { letra: "B", texto: "Quebro em etapas e sigo uma cadência", pesos: { CON: 3, PRE: 1 } },
      { letra: "C", texto: "Procuro uma estratégia diferente para chegar lá", pesos: { AUT: 3, RES: 1 } },
      { letra: "D", texto: "Aumento imediatamente a intensidade", pesos: { ACT: 3, RES: 1 } }
    ]
  },
  {
    numero: 26,
    enunciado: "Quando erro em uma atividade, eu prefiro:",
    opcoes: [
      { letra: "A", texto: "Corrigir imediatamente e seguir", pesos: { ACT: 2, RES: 2 } },
      { letra: "B", texto: "Entender a causa para não repetir", pesos: { PRE: 3, RES: 1 } },
      { letra: "C", texto: "Reforçar o processo correto nas próximas vezes", pesos: { CON: 3, PRE: 1 } },
      { letra: "D", texto: "Pedir uma visão externa se não estiver claro", pesos: { COM: 2, PRE: 1 } }
    ]
  },
  {
    numero: 27,
    enunciado: "Quando recebo liberdade para organizar meu dia, eu:",
    opcoes: [
      { letra: "A", texto: "Defino minhas prioridades e avanço sozinho", pesos: { AUT: 3, ACT: 1 } },
      { letra: "B", texto: "Monto uma rotina e procuro segui-la", pesos: { CON: 3, PRE: 1 } },
      { letra: "C", texto: "Começo pelos maiores impactos", pesos: { ACT: 3, AUT: 1 } },
      { letra: "D", texto: "Organizo considerando detalhes e dependências", pesos: { PRE: 3, AUT: 1 } }
    ]
  },
  {
    numero: 28,
    enunciado: "Quando preciso convencer alguém resistente, eu tendo a:",
    opcoes: [
      { letra: "A", texto: "Explorar perguntas e adaptar meu argumento", pesos: { COM: 3, PRE: 1 } },
      { letra: "B", texto: "Persistir mesmo depois das primeiras objeções", pesos: { RES: 3, COM: 1 } },
      { letra: "C", texto: "Apresentar dados e lógica com cuidado", pesos: { PRE: 3, COM: 1 } },
      { letra: "D", texto: "Conduzir de forma objetiva para uma decisão", pesos: { ACT: 3, COM: 1 } }
    ]
  },
  {
    numero: 29,
    enunciado: "Em uma mudança de processo inesperada, eu:",
    opcoes: [
      { letra: "A", texto: "Adapto rápido e começo a usar", pesos: { RES: 2, ACT: 2 } },
      { letra: "B", texto: "Quero entender a nova lógica antes", pesos: { PRE: 3, AUT: 1 } },
      { letra: "C", texto: "Crio uma nova rotina para estabilizar", pesos: { CON: 3, PRE: 1 } },
      { letra: "D", texto: "Exploro sozinho a melhor forma de aplicar", pesos: { AUT: 3, RES: 1 } }
    ]
  },
  {
    numero: 30,
    enunciado: "Quando tenho uma hora livre para melhorar meu resultado, eu prefiro:",
    opcoes: [
      { letra: "A", texto: "Atacar imediatamente novas oportunidades", pesos: { ACT: 3, RES: 1 } },
      { letra: "B", texto: "Revisar onde estou perdendo qualidade", pesos: { PRE: 3, RES: 1 } },
      { letra: "C", texto: "Reforçar uma rotina que precisa de volume", pesos: { CON: 3, ACT: 1 } },
      { letra: "D", texto: "Trocar experiências e testar argumentos", pesos: { COM: 3, ACT: 1 } }
    ]
  },
  {
    numero: 31,
    enunciado: "Qual cenário de aprendizagem mais combina comigo?",
    opcoes: [
      { letra: "A", texto: "Alguém demonstra; eu faço; recebo correção", pesos: { COM: 1 }, learn: "GUIDED" },
      { letra: "B", texto: "Recebo material claro; entendo; depois pratico", pesos: { PRE: 1 }, learn: "LOGIC" },
      { letra: "C", texto: "Recebo o desafio; tento; aprendo corrigindo", pesos: { AUT: 1 }, learn: "DISCOVERY" },
      { letra: "D", texto: "Vejo rapidamente; pratico várias vezes", pesos: { CON: 1 }, learn: "PRACTICE" }
    ]
  },
  {
    numero: 32,
    enunciado: "Quando uma atividade importante está quase pronta, eu:",
    opcoes: [
      { letra: "A", texto: "Quero concluir logo e colocar em movimento", pesos: { ACT: 3, AUT: 1 } },
      { letra: "B", texto: "Faço uma conferência final antes de concluir", pesos: { PRE: 3, CON: 1 } },
      { letra: "C", texto: "Sigo a sequência prevista até o final", pesos: { CON: 3, PRE: 1 } },
      { letra: "D", texto: "Se já tenho segurança, concluo sem precisar validar", pesos: { AUT: 3, ACT: 1 } }
    ]
  },
  {
    numero: 33,
    enunciado: "Quando o ambiente fica pressionado, eu normalmente:",
    opcoes: [
      { letra: "A", texto: "Consigo continuar buscando oportunidades", pesos: { RES: 3, ACT: 1 } },
      { letra: "B", texto: "Fico mais objetivo e acelerado", pesos: { ACT: 3, RES: 1 } },
      { letra: "C", texto: "Me apoio no processo para manter estabilidade", pesos: { CON: 3, RES: 1 } },
      { letra: "D", texto: "Aumento a conferência para evitar erros", pesos: { PRE: 3, RES: 1 } }
    ]
  },
  {
    numero: 34,
    enunciado: "Em uma conversa de feedback, eu aproveito melhor quando:",
    opcoes: [
      { letra: "A", texto: "Recebo exemplos claros e específicos", pesos: { PRE: 3, COM: 1 } },
      { letra: "B", texto: "Saio com uma ação objetiva para testar", pesos: { ACT: 3, AUT: 1 } },
      { letra: "C", texto: "Posso conversar e esclarecer percepções", pesos: { COM: 3, RES: 1 } },
      { letra: "D", texto: "Tenho um combinado claro para acompanhar depois", pesos: { CON: 3, PRE: 1 } }
    ]
  },
  {
    numero: 35,
    enunciado: "Se eu já domino uma atividade, eu prefiro que meu líder:",
    opcoes: [
      { letra: "A", texto: "Defina o objetivo e me dê autonomia", pesos: { AUT: 3, ACT: 1 } },
      { letra: "B", texto: "Mantenha checkpoints claros de qualidade", pesos: { PRE: 3, CON: 1 } },
      { letra: "C", texto: "Me desafie com um resultado maior", pesos: { RES: 2, ACT: 2 } },
      { letra: "D", texto: "Mantenha uma cadência previsível de acompanhamento", pesos: { CON: 3, PRE: 1 } }
    ]
  },
  {
    numero: 36,
    enunciado: "Ao terminar uma semana difícil, o que mais representa minha reação?",
    opcoes: [
      { letra: "A", texto: "Consigo virar a página e recomeçar", pesos: { RES: 3, ACT: 1 } },
      { letra: "B", texto: "Reviso o que aconteceu para ajustar a próxima", pesos: { PRE: 3, RES: 1 } },
      { letra: "C", texto: "Retomo minha rotina e mantenho a cadência", pesos: { CON: 3, RES: 1 } },
      { letra: "D", texto: "Procuro novas ideias e conversas para ganhar energia", pesos: { COM: 3, RES: 1 } }
    ]
  }
]

// 12 Pares de Consistência (Seção 6)
export const PARES_CONSISTENCIA: [number, number][] = [
  [1, 32], [3, 17], [4, 23], [5, 19], [6, 28], [7, 29],
  [10, 30], [13, 34], [14, 27], [15, 20], [21, 36], [25, 33]
]

// 12 Questões do Checkpoint da Liderança - 30 dias (Seção 12)
export interface CheckpointQuestao {
  id: string
  dimensao: DimensaoCodigo
  pergunta: string
  opcoes: {
    A: string
    B: string
    C: string
    D: string
    E: string
  }
}

export const QUESTOES_CHECKPOINT: CheckpointQuestao[] = [
  {
    id: "C01",
    dimensao: "ACT",
    pergunta: "Quando recebe uma tarefa com objetivo e prazo claros, o que acontece com maior frequência?",
    opcoes: {
      A: "Inicia rapidamente e avança sem precisar ser impulsionado.",
      B: "Inicia, mas às vezes demora a ganhar ritmo.",
      C: "Precisa de estímulo ou reforço para começar.",
      D: "Frequentemente posterga o início mesmo após direcionamento.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C02",
    dimensao: "ACT",
    pergunta: "Quando há oportunidade clara de ação durante o dia:",
    opcoes: {
      A: "Normalmente percebe e age.",
      B: "Age quando a prioridade é reforçada.",
      C: "Costuma esperar novo direcionamento.",
      D: "Frequentemente deixa a oportunidade passar sem ação.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C03",
    dimensao: "COM",
    pergunta: "Em contatos profissionais, ele(a):",
    opcoes: {
      A: "Cria conexão e conduz a conversa com clareza.",
      B: "Comunica-se adequadamente, com pequenas oscilações.",
      C: "Tem dificuldade recorrente em gerar interação ou clareza.",
      D: "A comunicação frequentemente impede avanço.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C04",
    dimensao: "COM",
    pergunta: "Ao receber uma objeção ou resistência:",
    opcoes: {
      A: "Escuta, adapta e responde de forma produtiva.",
      B: "Consegue responder, mas nem sempre adapta a abordagem.",
      C: "Usa respostas pouco conectadas ao que ouviu.",
      D: "Frequentemente perde a condução da conversa.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C05",
    dimensao: "CON",
    pergunta: "Ao longo de vários dias de rotina:",
    opcoes: {
      A: "Mantém a cadência combinada com estabilidade.",
      B: "Mantém na maior parte do tempo, com algumas oscilações.",
      C: "Precisa de lembretes frequentes para sustentar a cadência.",
      D: "A rotina cai rapidamente sem acompanhamento próximo.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C06",
    dimensao: "CON",
    pergunta: "Em tarefas repetitivas importantes:",
    opcoes: {
      A: "Mantém execução e padrão até concluir.",
      B: "Mantém, mas apresenta algumas quebras de ritmo.",
      C: "Perde ritmo com frequência.",
      D: "Evita ou abandona repetição antes do necessário.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C07",
    dimensao: "PRE",
    pergunta: "Em etapas que exigem conferência:",
    opcoes: {
      A: "Confere os pontos críticos e mantém bom padrão.",
      B: "Confere na maioria das vezes, com falhas pontuais.",
      C: "Precisa ser lembrado com frequência de conferir.",
      D: "Erros por falta de conferência são recorrentes.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C08",
    dimensao: "PRE",
    pergunta: "Antes de concluir uma tarefa sensível:",
    opcoes: {
      A: "Valida critérios essenciais sem travar a execução.",
      B: "Valida a maior parte dos critérios.",
      C: "Ou conclui rápido demais ou valida de forma irregular.",
      D: "Frequentemente conclui sem os critérios necessários.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C09",
    dimensao: "RES",
    pergunta: "Após negativas, erros ou um período ruim:",
    opcoes: {
      A: "Retoma o ritmo rapidamente e aplica ajustes.",
      B: "Retoma com pequena queda temporária.",
      C: "Precisa de apoio frequente para recuperar ritmo.",
      D: "A queda de ritmo costuma se prolongar.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C10",
    dimensao: "RES",
    pergunta: "Quando o resultado fica abaixo do esperado:",
    opcoes: {
      A: "Mantém busca e revisa a estratégia.",
      B: "Continua tentando, com alguma oscilação.",
      C: "Reduz bastante a intensidade.",
      D: "Frequentemente paralisa ou desorganiza a execução.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C11",
    dimensao: "AUT",
    pergunta: "Com objetivo e limites claros:",
    opcoes: {
      A: "Avança e conclui sem depender de validações desnecessárias.",
      B: "Avança, mas busca uma validação intermediária.",
      C: "Precisa de vários novos direcionamentos para continuar.",
      D: "Tem dificuldade de avançar sem acompanhamento frequente.",
      E: "Ainda não observei situações suficientes."
    }
  },
  {
    id: "C12",
    dimensao: "AUT",
    pergunta: "Diante de uma situação nova dentro de sua responsabilidade:",
    opcoes: {
      A: "Toma decisão adequada e escala apenas o necessário.",
      B: "Tenta avançar, mas ainda busca validação além do necessário.",
      C: "Espera orientação mesmo quando poderia decidir.",
      D: "Frequentemente não avança sem decisão do líder.",
      E: "Ainda não observei situações suficientes."
    }
  }
]

// Matriz Líder x Liderado (Seção 14 - 36 combinações)
export const MATRIZ_LIDER_LIDERADO: Record<string, { sinergia: string; risco: string; acao: string }> = {
  "Executor-Executor": {
    sinergia: "Sinergia natural: ambos valorizam velocidade e avanço.",
    risco: "Risco de amplificação: pode pressionar ritmo.",
    acao: "Para liderar: dar objetivo curto e checar qualidade."
  },
  "Executor-Influenciador": {
    sinergia: "O líder valoriza velocidade e avanço; o liderado tende ao padrão relacionamento, persuasão e energia social.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode pressionar ritmo.",
    acao: "Adapte a condução ao liderado: Contexto curto → interação → conclusão objetiva."
  },
  "Executor-Construtor": {
    sinergia: "O líder valoriza velocidade e avanço; o liderado tende ao padrão disciplina, previsibilidade e continuidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode pressionar ritmo.",
    acao: "Adapte a condução ao liderado: Rotina clara → cadência → evolução incremental."
  },
  "Executor-Estruturador": {
    sinergia: "O líder valoriza velocidade e avanço; o liderado tende ao padrão qualidade, análise e controle de detalhes.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode pressionar ritmo.",
    acao: "Adapte a condução ao liderado: Critério claro → prazo → decisão."
  },
  "Executor-Desafiador": {
    sinergia: "O líder valoriza velocidade e avanço; o liderado tende ao padrão persistência, recuperação e intensidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode pressionar ritmo.",
    acao: "Adapte a condução ao liderado: Desafio → tentativa → revisão → nova tentativa."
  },
  "Executor-Estrategista": {
    sinergia: "O líder valoriza velocidade e avanço; o liderado tende ao padrão independência, decisão e adaptação.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode pressionar ritmo.",
    acao: "Adapte a condução ao liderado: Objetivo + limites → autonomia → checkpoint de resultado."
  },

  "Influenciador-Executor": {
    sinergia: "O líder valoriza diálogo e conexão; o liderado tende ao padrão velocidade, iniciativa, senso de avanço.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode alongar alinhamentos.",
    acao: "Adapte a condução ao liderado: Objetivo claro → ação → checkpoint."
  },
  "Influenciador-Influenciador": {
    sinergia: "Sinergia natural: ambos valorizam diálogo e conexão.",
    risco: "Risco de amplificação: pode alongar alinhamentos.",
    acao: "Para liderar: fechar conversa com ação e prazo."
  },
  "Influenciador-Construtor": {
    sinergia: "O líder valoriza diálogo e conexão; o liderado tende ao padrão disciplina, previsibilidade e continuidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode alongar alinhamentos.",
    acao: "Adapte a condução ao liderado: Rotina clara → cadência → evolução incremental."
  },
  "Influenciador-Estruturador": {
    sinergia: "O líder valoriza diálogo e conexão; o liderado tende ao padrão qualidade, análise e controle de detalhes.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode alongar alinhamentos.",
    acao: "Adapte a condução ao liderado: Critério claro → prazo → decisão."
  },
  "Influenciador-Desafiador": {
    sinergia: "O líder valoriza diálogo e conexão; o liderado tende ao padrão persistência, recuperação e intensidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode alongar alinhamentos.",
    acao: "Adapte a condução ao liderado: Desafio → tentativa → revisão → nova tentativa."
  },
  "Influenciador-Estrategista": {
    sinergia: "O líder valoriza diálogo e conexão; o liderado tende ao padrão independência, decisão e adaptação.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode alongar alinhamentos.",
    acao: "Adapte a condução ao liderado: Objetivo + limites → autonomia → checkpoint de resultado."
  },

  "Construtor-Executor": {
    sinergia: "O líder valoriza cadência e previsibilidade; o liderado tende ao padrão velocidade, iniciativa, senso de avanço.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode insistir em rotina.",
    acao: "Adapte a condução ao liderado: Objetivo claro → ação → checkpoint."
  },
  "Construtor-Influenciador": {
    sinergia: "O líder valoriza cadência e previsibilidade; o liderado tende ao padrão relacionamento, persuasão e energia social.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode insistir em rotina.",
    acao: "Adapte a condução ao liderado: Contexto curto → interação → conclusão objetiva."
  },
  "Construtor-Construtor": {
    sinergia: "Sinergia natural: ambos valorizam cadência e previsibilidade.",
    risco: "Risco de amplificação: pode insistir em rotina.",
    acao: "Para liderar: explicitar quando a mudança é necessária."
  },
  "Construtor-Estruturador": {
    sinergia: "O líder valoriza cadência e previsibilidade; o liderado tende ao padrão qualidade, análise e controle de detalhes.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode insistir em rotina.",
    acao: "Adapte a condução ao liderado: Critério claro → prazo → decisão."
  },
  "Construtor-Desafiador": {
    sinergia: "O líder valoriza cadência e previsibilidade; o liderado tende ao padrão persistência, recuperação e intensidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode insistir em rotina.",
    acao: "Adapte a condução ao liderado: Desafio → tentativa → revisão → nova tentativa."
  },
  "Construtor-Estrategista": {
    sinergia: "O líder valoriza cadência e previsibilidade; o liderado tende ao padrão independência, decisão e adaptação.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode insistir em rotina.",
    acao: "Adapte a condução ao liderado: Objetivo + limites → autonomia → checkpoint de resultado."
  },

  "Estruturador-Executor": {
    sinergia: "O líder valoriza critério e qualidade; o liderado tende ao padrão velocidade, iniciativa, senso de avanço.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode aumentar validações.",
    acao: "Adapte a condução ao liderado: Objetivo claro → ação → checkpoint."
  },
  "Estruturador-Influenciador": {
    sinergia: "O líder valoriza critério e qualidade; o liderado tende ao padrão relacionamento, persuasão e energia social.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode aumentar validações.",
    acao: "Adapte a condução ao liderado: Contexto curto → interação → conclusão objetiva."
  },
  "Estruturador-Construtor": {
    sinergia: "O líder valoriza critério e qualidade; o liderado tende ao padrão disciplina, previsibilidade e continuidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode aumentar validações.",
    acao: "Adapte a condução ao liderado: Rotina clara → cadência → evolução incremental."
  },
  "Estruturador-Estruturador": {
    sinergia: "Sinergia natural: ambos valorizam critério e qualidade.",
    risco: "Risco de amplificação: pode aumentar validações.",
    acao: "Para liderar: definir limite de análise e decisão."
  },
  "Estruturador-Desafiador": {
    sinergia: "O líder valoriza critério e qualidade; o liderado tende ao padrão persistência, recuperação e intensidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode aumentar validações.",
    acao: "Adapte a condução ao liderado: Desafio → tentativa → revisão → nova tentativa."
  },
  "Estruturador-Estrategista": {
    sinergia: "O líder valoriza critério e qualidade; o liderado tende ao padrão independência, decisão e adaptação.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode aumentar validações.",
    acao: "Adapte a condução ao liderado: Objetivo + limites → autonomia → checkpoint de resultado."
  },

  "Desafiador-Executor": {
    sinergia: "O líder valoriza intensidade e superação; o liderado tende ao padrão velocidade, iniciativa, senso de avanço.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode elevar pressão.",
    acao: "Adapte a condução ao liderado: Objetivo claro → ação → checkpoint."
  },
  "Desafiador-Influenciador": {
    sinergia: "O líder valoriza intensidade e superação; o liderado tende ao padrão relacionamento, persuasão e energia social.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode elevar pressão.",
    acao: "Adapte a condução ao liderado: Contexto curto → interação → conclusão objetiva."
  },
  "Desafiador-Construtor": {
    sinergia: "O líder valoriza intensidade e superação; o liderado tende ao padrão disciplina, previsibilidade e continuidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode elevar pressão.",
    acao: "Adapte a condução ao liderado: Rotina clara → cadência → evolução incremental."
  },
  "Desafiador-Estruturador": {
    sinergia: "O líder valoriza intensidade e superação; o liderado tende ao padrão qualidade, análise e controle de detalhes.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode elevar pressão.",
    acao: "Adapte a condução ao liderado: Critério claro → prazo → decisão."
  },
  "Desafiador-Desafiador": {
    sinergia: "Sinergia natural: ambos valorizam intensidade e superação.",
    risco: "Risco de amplificação: pode elevar pressão.",
    acao: "Para liderar: alternar desafio com revisão de estratégia."
  },
  "Desafiador-Estrategista": {
    sinergia: "O líder valoriza intensidade e superação; o liderado tende ao padrão independência, decisão e adaptação.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode elevar pressão.",
    acao: "Adapte a condução ao liderado: Objetivo + limites → autonomia → checkpoint de resultado."
  },

  "Estrategista-Executor": {
    sinergia: "O líder valoriza autonomia e responsabilidade; o liderado tende ao padrão velocidade, iniciativa, senso de avanço.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode oferecer direção insuficiente.",
    acao: "Adapte a condução ao liderado: Objetivo claro → ação → checkpoint."
  },
  "Estrategista-Influenciador": {
    sinergia: "O líder valoriza autonomia e responsabilidade; o liderado tende ao padrão relacionamento, persuasão e energia social.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode oferecer direção insuficiente.",
    acao: "Adapte a condução ao liderado: Contexto curto → interação → conclusão objetiva."
  },
  "Estrategista-Construtor": {
    sinergia: "O líder valoriza autonomia e responsabilidade; o liderado tende ao padrão disciplina, previsibilidade e continuidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode oferecer direção insuficiente.",
    acao: "Adapte a condução ao liderado: Rotina clara → cadência → evolução incremental."
  },
  "Estrategista-Estruturador": {
    sinergia: "O líder valoriza autonomia e responsabilidade; o liderado tende ao padrão qualidade, análise e controle de detalhes.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode oferecer direção insuficiente.",
    acao: "Adapte a condução ao liderado: Critério claro → prazo → decisão."
  },
  "Estrategista-Desafiador": {
    sinergia: "O líder valoriza autonomia e responsabilidade; o liderado tende ao padrão persistência, recuperação e intensidade.",
    risco: "Possível atrito entre estilo do líder e necessidade do liderado; atenção: pode oferecer direção insuficiente.",
    acao: "Adapte a condução ao liderado: Desafio → tentativa → revisão → nova tentativa."
  },
  "Estrategista-Estrategista": {
    sinergia: "Sinergia natural: ambos valorizam autonomia e responsabilidade.",
    risco: "Risco de amplificação: pode oferecer direção insuficiente.",
    acao: "Para liderar: deixar limites e checkpoints explícitos."
  }
}
