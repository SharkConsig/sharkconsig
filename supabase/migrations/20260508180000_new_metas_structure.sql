-- Create configuracoes_metas_anuais
CREATE TABLE IF NOT EXISTS public.configuracoes_metas_anuais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano INTEGER NOT NULL UNIQUE,
    valor_anual NUMERIC(15, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create faixas_metas_corretor
CREATE TABLE IF NOT EXISTS public.faixas_metas_corretor (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    valor_minimo NUMERIC(15, 2) NOT NULL,
    premio TEXT NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.configuracoes_metas_anuais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faixas_metas_corretor ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Acesso total para autenticados em metas_anuais" ON public.configuracoes_metas_anuais
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Acesso total para autenticados em faixas_metas" ON public.faixas_metas_corretor
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
