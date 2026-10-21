-- =========================================================================
-- MIGRATION: CRIAÇÃO DA TABELA 'relatos_situacoes'
-- SharkConsig - Canal de Relato de Situações e Dúvidas para o Administrador
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

-- Índices para buscas rápidas e ordenação da fila do Administrador
CREATE INDEX IF NOT EXISTS idx_relatos_situacoes_created_at ON public.relatos_situacoes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relatos_situacoes_lido ON public.relatos_situacoes(lido);
CREATE INDEX IF NOT EXISTS idx_relatos_situacoes_usuario_id ON public.relatos_situacoes(usuario_id);

-- Configuração de Row Level Security (RLS)
ALTER TABLE public.relatos_situacoes ENABLE ROW LEVEL SECURITY;

-- Permissões para roles do Supabase
GRANT ALL ON TABLE public.relatos_situacoes TO authenticated;
GRANT ALL ON TABLE public.relatos_situacoes TO anon;
GRANT ALL ON TABLE public.relatos_situacoes TO service_role;

-- Política de Acesso Geral (Permite envio para todos e gestão pelo Administrador/service_role)
DROP POLICY IF EXISTS "Acesso total livre para relatos_situacoes" ON public.relatos_situacoes;
CREATE POLICY "Acesso total livre para relatos_situacoes" 
ON public.relatos_situacoes FOR ALL USING (true) WITH CHECK (true);

-- Trigger para atualização automática da coluna updated_at
CREATE OR REPLACE FUNCTION public.update_relatos_situacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_relatos_situacoes_updated_at ON public.relatos_situacoes;
CREATE TRIGGER trigger_update_relatos_situacoes_updated_at
    BEFORE UPDATE ON public.relatos_situacoes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_relatos_situacoes_updated_at();
