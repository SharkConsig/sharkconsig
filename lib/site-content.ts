export interface SiteJob {
  id: string
  titulo: string
  area: string
  local: string
  tipo: string
  descricao: string
  requisitos: string[]
  ativo: boolean
}

export interface SiteTestimonial {
  id: string
  nome: string
  perfil: string
  tipo: "cliente" | "colaborador"
  texto: string
  estrelas: number
  foto?: string
}

export interface SiteTeamPhoto {
  id: string
  titulo: string
  url: string
  categoria: string
}

export interface SiteInstagramPost {
  id: string
  imagem: string
  legenda: string
  likes: number
  data: string
  url: string
}

export interface SiteContent {
  hero: {
    badge: string
    titulo: string
    subtitulo: string
    ctaCliente: string
    ctaTrabalhe: string
    avisoRegulatorio: string
  }
  metricas: {
    creditoLiberado: string
    clientesAtendidos: string
    notaGoogle: string
    anosMercado: string
  }
  cultura: {
    titulo: string
    subtitulo: string
    pilares: { titulo: string; descricao: string }[]
    beneficios: { titulo: string; descricao: string; icon: string }[]
  }
  vagas: SiteJob[]
  depoimentos: SiteTestimonial[]
  fotosEquipe: SiteTeamPhoto[]
  instagram: {
    handle: string
    url: string
    posts: SiteInstagramPost[]
  }
}

export const DEFAULT_SITE_CONTENT: SiteContent = {
  hero: {
    badge: "Correspondente Bancário Autorizado",
    titulo: "Crédito Consignado Seguro, Rápido e Sem Burocracia",
    subtitulo: "Ajudamos aposentados, pensionistas do INSS e servidores públicos a conquistarem seus objetivos com as melhores taxas do mercado e atendimento humanizado.",
    ctaCliente: "Simular Crédito Agora",
    ctaTrabalhe: "Trabalhe Conosco",
    avisoRegulatorio: "Correspondente bancário regulamentado pelas resoluções do Banco Central do Brasil."
  },
  metricas: {
    creditoLiberado: "+R$ 150 Milhões",
    clientesAtendidos: "+30.000 Clientes",
    notaGoogle: "4.9 ★★★★★",
    anosMercado: "+8 Anos de Solidez"
  },
  cultura: {
    titulo: "Muito mais que crédito: pessoas transformando pessoas",
    subtitulo: "Na Acerto Fácil, acreditamos no potencial do nosso time. Construímos um ambiente vibrante, acolhedor e com oportunidades reais de crescimento acelerado.",
    pilares: [
      {
        titulo: "Transparência Absoluta",
        descricao: "Sem letras miúdas. Clareza e ética em cada simulação e relacionamento com o cliente."
      },
      {
        titulo: "Meritocracia & Reconhecimento",
        descricao: "Planos de bonificação agressivos e plano de carreira estruturado para quem entrega resultado."
      },
      {
        titulo: "Cultura de Cuidado",
        descricao: "Ambiente descontraído, escuta ativa, lideranças acessíveis e respeito à sua qualidade de vida."
      }
    ],
    beneficios: [
      {
        titulo: "Remuneração & Comissões Agressivas",
        descricao: "Comissionamento sem teto e prêmios mensais para bater e superar metas.",
        icon: "TrendingUp"
      },
      {
        titulo: "Vale Alimentação & Refeição Flexível",
        descricao: "Cartão de benefícios aceito amplamente em mercados e restaurantes.",
        icon: "Utensils"
      },
      {
        titulo: "Plano de Saúde e Odontológico",
        descricao: "Cobertura completa para você e sua família cuidarem do bem mais precioso.",
        icon: "HeartPulse"
      },
      {
        titulo: "Plano de Carreira Acelerado",
        descricao: "Possibilidade real de promoção para cargos de supervisão e coordenação.",
        icon: "Award"
      },
      {
        titulo: "Ambiente & Descompressão",
        descricao: "Café à vontade, espaço de descanso, comemorações de aniversários e confraternizações.",
        icon: "Coffee"
      },
      {
        titulo: "Treinamento Contínuo",
        descricao: "Capacitação completa em técnicas comerciais e sistemas de crédito.",
        icon: "GraduationCap"
      }
    ]
  },
  vagas: [
    {
      id: "vaga-1",
      titulo: "Consultor Comercial de Crédito Consignado",
      area: "Comercial / Vendas",
      local: "Florianópolis / SC (Presencial)",
      tipo: "Tempo Integral",
      descricao: "Atuar no atendimento consultivo ativo e receptivo de aposentados, pensionistas e servidores, oferecendo as melhores opções de crédito e portabilidade.",
      requisitos: [
        "Experiência com vendas ativas ou teleatendimento",
        "Boa comunicação verbal e capacidade de persuasão",
        "Foco em metas e dinamismo",
        "Desejável conhecimento em crédito consignado"
      ],
      ativo: true
    },
    {
      id: "vaga-2",
      titulo: "Operacional de Crédito & Formalização",
      area: "Operações",
      local: "Florianópolis / SC (Presencial)",
      tipo: "Tempo Integral",
      descricao: "Acompanhamento de esteira de digitação bancária, análise de inconsistências cadastrais, conferência de documentação e suporte aos corretores.",
      requisitos: [
        "Atenção aos detalhes e facilidade com sistemas bancários",
        "Organização e agilidade no cumprimento de prazos",
        "Experiência prévia em promotoras de crédito ou correspondentes"
      ],
      ativo: true
    },
    {
      id: "vaga-3",
      titulo: "Estágio em Atendimento Comercial",
      area: "Comercial",
      local: "Florianópolis / SC (Presencial)",
      tipo: "Estágio (6h/dia)",
      descricao: "Apoio no primeiro contato com clientes, qualificação de leads, agendamento de atendimentos e suporte ao time de vendas sênior.",
      requisitos: [
        "Cursando Administração, Gestão Comercial, Marketing ou áreas afins",
        "Vontade de aprender e crescer no mercado financeiro",
        "Comunicação fluida e proatividade"
      ],
      ativo: true
    }
  ],
  depoimentos: [
    {
      id: "dep-1",
      nome: "Dona Maria Helena",
      perfil: "Aposentada INSS • Florianópolis/SC",
      tipo: "cliente",
      texto: "Fui muito bem atendida pela equipe da Acerto Fácil. O dinheiro caiu na minha conta no mesmo dia e com parcelas que couberam direitinho no meu orçamento. Super recomendo!",
      estrelas: 5
    },
    {
      id: "dep-2",
      nome: "Seu José Carlos Ribeiro",
      perfil: "Pensionista INSS • São José/SC",
      tipo: "cliente",
      texto: "Consegui reduzir os juros dos empréstimos que eu já tinha através da portabilidade. O atendimento foi honesto e muito claro em todas as etapas.",
      estrelas: 5
    },
    {
      id: "dep-3",
      nome: "Beatriz Fermiano",
      perfil: "Consultora de Vendas • Equipe Acerto Fácil",
      tipo: "colaborador",
      texto: "Entrei como estagiária e em poucos meses já tive a oportunidade de me desenvolver e aumentar minha remuneração. O ambiente é acolhedor e a liderança joga junto com a gente!",
      estrelas: 5
    },
    {
      id: "dep-4",
      nome: "Isac Martins",
      perfil: "Supervisor Comercial • Equipe Acerto Fácil",
      tipo: "colaborador",
      texto: "Trabalhar na Acerto Fácil é saber que o seu esforço é visto e recompensado todos os meses. Temos ferramentas modernas e todo o suporte para entregar o melhor para o cliente.",
      estrelas: 5
    }
  ],
  fotosEquipe: [
    {
      id: "foto-1",
      titulo: "Celebração de Metas Batidas",
      url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
      categoria: "Equipe"
    },
    {
      id: "foto-2",
      titulo: "Nosso Espaço Comercial Integrado",
      url: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80",
      categoria: "Ambiente"
    },
    {
      id: "foto-3",
      titulo: "Reconhecimento dos Destaques do Mês",
      url: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80",
      categoria: "Premiações"
    },
    {
      id: "foto-4",
      titulo: "Treinamentos e Desenvolvimento",
      url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80",
      categoria: "Treinamento"
    }
  ],
  instagram: {
    handle: "@acertofacilpromotora",
    url: "https://www.instagram.com/acertofacilpromotora/",
    posts: [
      {
        id: "ig-1",
        imagem: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80",
        legenda: "Dia de celebrar nossos destaques comerciais do mês! Orgulho de quem faz acontecer com ética e dedicação 🚀🏆",
        likes: 142,
        data: "Há 2 dias",
        url: "https://www.instagram.com/acertofacilpromotora/"
      },
      {
        id: "ig-2",
        imagem: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=600&q=80",
        legenda: "Dúvidas sobre como funciona a portabilidade de crédito consignado? Confira as dicas do nosso time de especialistas! 💡",
        likes: 98,
        data: "Há 4 dias",
        url: "https://www.instagram.com/acertofacilpromotora/"
      },
      {
        id: "ig-3",
        imagem: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80",
        legenda: "Cultura forte é quando o trabalho em equipe é leve, acolhedor e focado no crescimento de todos. Vem ser Acerto Fácil! 💙✨",
        likes: 215,
        data: "Há 1 semana",
        url: "https://www.instagram.com/acertofacilpromotora/"
      },
      {
        id: "ig-4",
        imagem: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=600&q=80",
        legenda: "Mais de 30 mil famílias já confiaram na nossa consultoria financeira. Obrigado pela confiança diária! 🙏🤝",
        likes: 187,
        data: "Há 2 semanas",
        url: "https://www.instagram.com/acertofacilpromotora/"
      }
    ]
  }
}

export const STORAGE_KEY_SITE_CONTENT = "acerto_facil_site_content"

export function getLocalSiteContent(): SiteContent {
  if (typeof window === "undefined") return DEFAULT_SITE_CONTENT
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SITE_CONTENT)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_SITE_CONTENT, ...parsed }
    }
  } catch (err) {
    console.error("Erro ao carregar conteúdo do site local:", err)
  }
  return DEFAULT_SITE_CONTENT
}

export function saveLocalSiteContent(content: SiteContent): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY_SITE_CONTENT, JSON.stringify(content))
    window.dispatchEvent(new CustomEvent("site_content_updated", { detail: content }))
  } catch (err) {
    console.error("Erro ao salvar conteúdo do site local:", err)
  }
}
