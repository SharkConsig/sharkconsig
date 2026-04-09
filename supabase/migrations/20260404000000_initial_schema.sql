-- 0. Limpeza Total (Reset do Banco de Dados)
DROP TABLE IF EXISTS public.itens_credito CASCADE;
DROP TABLE IF EXISTS public.instituidores CASCADE;
DROP TABLE IF EXISTS public.matriculas CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.lotes CASCADE;

-- Limpeza de tabelas antigas (nomes em inglês)
DROP TABLE IF EXISTS public.contracts CASCADE;
DROP TABLE IF EXISTS public.registrations CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.batches CASCADE;

-- 1. Tabela de Clientes (Baseado no Modelo SIAPE/Contratos)
CREATE TABLE public.clientes (
    cpf TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    data_nascimento DATE,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabela de Matrículas (Baseado no Modelo SIAPE/Contratos)
CREATE TABLE public.matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_cpf TEXT NOT NULL REFERENCES public.clientes(cpf) ON DELETE CASCADE,
    numero_matricula TEXT NOT NULL,
    orgao TEXT,
    situacao_funcional TEXT,
    salario NUMERIC(15, 2),
    regime_juridico TEXT,
    uf TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_cpf, numero_matricula)
);

-- 3. Tabela de Instituidores (Para o fluxo de Pensão e Margens)
CREATE TABLE public.instituidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_id UUID NOT NULL REFERENCES public.matriculas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL DEFAULT '', -- Vazio para não-pensionistas
    -- Campos específicos SIAPE (Margens e Saldos vinculados ao Instituidor)
    saldo_70 NUMERIC(15, 2),
    margem_35 NUMERIC(15, 2),
    bruta_5 NUMERIC(15, 2),
    utilizada_5 NUMERIC(15, 2),
    liquida_5 NUMERIC(15, 2),
    beneficio_bruta_5 NUMERIC(15, 2),
    beneficio_utilizada_5 NUMERIC(15, 2),
    beneficio_liquida_5 NUMERIC(15, 2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(matricula_id, nome)
);

-- 4. Tabela de Itens de Crédito (Baseado no Modelo Contratos)
CREATE TABLE public.itens_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instituidor_id UUID NOT NULL REFERENCES public.instituidores(id) ON DELETE CASCADE,
    numero_contrato TEXT NOT NULL,
    banco TEXT,
    orgao TEXT,
    tipo TEXT,
    parcela NUMERIC(15, 2),
    prazo INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(instituidor_id, numero_contrato)
);

-- 5. Tabela de Lotes (Controle de Importação)
CREATE TABLE public.lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT,
    tipo TEXT, -- 'SIAPE', 'CONTRATOS'
    status TEXT DEFAULT 'PENDENTE',
    progresso INTEGER DEFAULT 0,
    total_linhas TEXT,
    erro TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instituidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Acesso total para autenticados" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON public.matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON public.instituidores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON public.itens_credito FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON public.lotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
