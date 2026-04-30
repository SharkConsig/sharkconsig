-- Migration: Normalização Modelo Governo SP
DROP TABLE IF EXISTS public.base_governo_sp;

-- 1. Entidade Cliente (Unicidade por CPF)
CREATE TABLE IF NOT EXISTS public.governo_sp_clientes (
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
CREATE TABLE IF NOT EXISTS public.governo_sp_identificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.governo_sp_clientes(id) ON DELETE CASCADE,
    identificacao TEXT NOT NULL,
    data_nomeacao DATE,
    tipo_vinculo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, identificacao)
);

-- 3. Entidade Lotação (Relacionamento N:1 com Identificação)
CREATE TABLE IF NOT EXISTS public.governo_sp_lotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identificacao_id UUID REFERENCES public.governo_sp_identificacoes(id) ON DELETE CASCADE,
    lotacao TEXT,
    orgao TEXT,
    mb_consignacoes NUMERIC(15, 2),
    md_consignacoes NUMERIC(15, 2),
    mb_cartao_credito NUMERIC(15, 2),
    md_cartao_credito NUMERIC(15, 2),
    mb_cartao_beneficio NUMERIC(15, 2),
    md_cartao_beneficio NUMERIC(15, 2),
    lote_id UUID REFERENCES public.lotes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_gsp_cli_cpf ON public.governo_sp_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_gsp_ident_cli ON public.governo_sp_identificacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_gsp_lot_ident ON public.governo_sp_lotacoes(identificacao_id);

-- RLS
ALTER TABLE public.governo_sp_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_sp_identificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governo_sp_lotacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (Drop and Recreate to ensure correct state)
DROP POLICY IF EXISTS "Acesso total clientes" ON public.governo_sp_clientes;
CREATE POLICY "Acesso total clientes" ON public.governo_sp_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total identificacoes" ON public.governo_sp_identificacoes;
CREATE POLICY "Acesso total identificacoes" ON public.governo_sp_identificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acesso total lotacoes" ON public.governo_sp_lotacoes;
CREATE POLICY "Acesso total lotacoes" ON public.governo_sp_lotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Garantir permissões básicas para roles
GRANT ALL ON public.governo_sp_clientes TO authenticated, anon;
GRANT ALL ON public.governo_sp_identificacoes TO authenticated, anon;
GRANT ALL ON public.governo_sp_lotacoes TO authenticated, anon;
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
