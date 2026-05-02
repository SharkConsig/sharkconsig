-- Create metas_config table
CREATE TABLE IF NOT EXISTS public.metas_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo TEXT NOT NULL CHECK (tipo IN ('empresa', 'time', 'corretor')),
    alvo_id UUID, -- NULL para 'empresa', ID do supervisor para 'time', ID do corretor para 'corretor'
    alvo_nome TEXT,
    valor_mensal NUMERIC(15, 2) NOT NULL DEFAULT 0,
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campanhas_bonificacao table
CREATE TABLE IF NOT EXISTS public.campanhas_bonificacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    regras JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.metas_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas_bonificacao ENABLE ROW LEVEL SECURITY;

-- Policies for metas_config
CREATE POLICY "Acesso total para autenticados em metas_config" ON public.metas_config
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policies for campanhas_bonificacao
CREATE POLICY "Acesso total para autenticados em campanhas_bonificacao" ON public.campanhas_bonificacao
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_metas_config_tipo_mes_ano ON public.metas_config(tipo, mes, ano);
CREATE INDEX IF NOT EXISTS idx_metas_config_alvo_id ON public.metas_config(alvo_id);
