-- Migration: Normalização Modelo Governo Maranhão
-- Identificado por: cpf, nome, matricula, vinculo, data_nascimento, telefone_1, telefone_2, telefone_3, orgao, margem_emprestimo_consignado, margem_cartao_consignado, margem_cartao_beneficio

-- 1. Entidade Cliente (Unicidade por CPF)
CREATE TABLE IF NOT EXISTS public.governo_ma_clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf TEXT UNIQUE NOT NULL,
    nome TEXT,
    data_nascimento DATE,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Entidade Identificação (Relacionamento N:1 com Cliente)
CREATE TABLE IF NOT EXISTS public.governo_ma_identificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.governo_ma_clientes(id) ON DELETE CASCADE,
    matricula TEXT NOT NULL,
    vinculo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, matricula)
);

-- 3. Entidade Lotação / Margens (Relacionamento N:1 com Identificação)
CREATE TABLE IF NOT EXISTS public.governo_ma_lotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identificacao_id UUID REFERENCES public.governo_ma_identificacoes(id) ON DELETE CASCADE,
    orgao TEXT,
    margem_emprestimo_consignado NUMERIC(15, 2),
    margem_cartao_consignado NUMERIC(15, 2),
    margem_cartao_beneficio NUMERIC(15, 2),
    lote_id UUID REFERENCES public.lotes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gma_cli_cpf ON public.governo_ma_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_gma_ident_cli ON public.governo_ma_identificacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_gma_lot_ident ON public.governo_ma_lotacoes(identificacao_id);

-- RLS
ALTER TABLE public.governo_ma_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_ma_identificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_ma_lotacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
DROP POLICY IF EXISTS "Acesso total clientes_ma" ON public.governo_ma_clientes;
CREATE POLICY "Acesso total clientes_ma" ON public.governo_ma_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total identificacoes_ma" ON public.governo_ma_identificacoes;
CREATE POLICY "Acesso total identificacoes_ma" ON public.governo_ma_identificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total lotacoes_ma" ON public.governo_ma_lotacoes;
CREATE POLICY "Acesso total lotacoes_ma" ON public.governo_ma_lotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissões
GRANT ALL ON public.governo_ma_clientes TO authenticated, anon;
GRANT ALL ON public.governo_ma_identificacoes TO authenticated, anon;
GRANT ALL ON public.governo_ma_lotacoes TO authenticated, anon;
