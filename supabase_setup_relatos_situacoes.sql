-- =========================================================================
-- SCRIPT DIRETO PARA EXECUTAR NO SQL EDITOR DO SUPABASE
-- CRIAÇÃO DA TABELA 'relatos_situacoes'
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.relatos_situacoes (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    usuario_id TEXT,
    usuario_nome VARCHAR(255) NOT NULL,
    usuario_email VARCHAR(255),
    usuario_role VARCHAR(100),
    titulo VARCHAR(255),
    relato TEXT NOT NULL,
    imagem_url TEXT,
    lido BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_relatos_situacoes_created_at ON public.relatos_situacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relatos_situacoes_lido ON public.relatos_situacoes(lido);

ALTER TABLE public.relatos_situacoes ENABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.relatos_situacoes TO authenticated;
GRANT ALL ON TABLE public.relatos_situacoes TO anon;
GRANT ALL ON TABLE public.relatos_situacoes TO service_role;

DROP POLICY IF EXISTS "Acesso total livre para relatos_situacoes" ON public.relatos_situacoes;
CREATE POLICY "Acesso total livre para relatos_situacoes" 
ON public.relatos_situacoes FOR ALL USING (true) WITH CHECK (true);
