-- Migration to create Prefeitura de SP tables
CREATE TABLE IF NOT EXISTS public.prefeitura_sp_clientes (
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

CREATE TABLE IF NOT EXISTS public.prefeitura_sp_identificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_id UUID REFERENCES public.prefeitura_sp_clientes(id) ON DELETE CASCADE,
    identificacao TEXT NOT NULL,
    data_nomeacao DATE,
    tipo_vinculo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(cliente_id, identificacao)
);

CREATE TABLE IF NOT EXISTS public.prefeitura_sp_lotacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identificacao_id UUID REFERENCES public.prefeitura_sp_identificacoes(id) ON DELETE CASCADE,
    lotacao TEXT,
    orgao TEXT,
    mb_consignacoes NUMERIC,
    md_consignacoes NUMERIC,
    mb_cartao_beneficio NUMERIC,
    md_cartao_beneficio NUMERIC,
    lote_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pmsp_cli_cpf ON public.prefeitura_sp_clientes(cpf);
CREATE INDEX IF NOT EXISTS idx_pmsp_ident_cli ON public.prefeitura_sp_identificacoes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pmsp_lot_ident ON public.prefeitura_sp_lotacoes(identificacao_id);

-- RLS
ALTER TABLE public.prefeitura_sp_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefeitura_sp_identificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prefeitura_sp_lotacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total clientes pmsp" ON public.prefeitura_sp_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total identificacoes pmsp" ON public.prefeitura_sp_identificacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total lotacoes pmsp" ON public.prefeitura_sp_lotacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON public.prefeitura_sp_clientes TO authenticated;
GRANT ALL ON public.prefeitura_sp_identificacoes TO authenticated;
GRANT ALL ON public.prefeitura_sp_lotacoes TO authenticated;
