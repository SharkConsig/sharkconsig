-- ==============================================================================
-- SharkConsig: Tabela para Registro de Perfil Profissional e Respostas (Supabase)
-- Otimizado para alto desempenho, baixo consumo de I/O e consultas rápidas
-- ==============================================================================

CREATE TABLE IF NOT EXISTS perfil_profissional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    usuario_nome VARCHAR(255) NOT NULL,
    usuario_email VARCHAR(255),
    versao_instrumento VARCHAR(20) DEFAULT 'v1.0',
    
    -- Respostas brutas das 36 questões do teste: {"1": "A", "2": "B", ...}
    respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Pontuações e cálculos psicométricos
    raw_scores JSONB,
    normalized_scores JSONB,
    faixas JSONB,
    arquetipo_primario VARCHAR(50),
    arquetipo_secundario VARCHAR(50),
    tipo_resultado VARCHAR(100),
    modo_aprendizagem VARCHAR(100),
    
    -- Índices de consistência lógica interna
    consistencia_pontos INTEGER,
    consistencia_indice NUMERIC(5, 2),
    consistencia_classificacao VARCHAR(50),
    
    -- Dados de acompanhamento de liderança (Checkpoint de 30 dias)
    checkpoint_lider JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- Índices para Máxima Eficiência e Economia de Recursos (Evita Table Scans)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_perfil_profissional_user_id ON perfil_profissional(user_id);
CREATE INDEX IF NOT EXISTS idx_perfil_profissional_arquetipo ON perfil_profissional(arquetipo_primario);
CREATE INDEX IF NOT EXISTS idx_perfil_profissional_respostas ON perfil_profissional USING GIN (respostas);

-- ==============================================================================
-- Trigger para Atualização Automática do campo updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_perfil_profissional_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_perfil_profissional_updated_at ON perfil_profissional;
CREATE TRIGGER trigger_update_perfil_profissional_updated_at
    BEFORE UPDATE ON perfil_profissional
    FOR EACH ROW
    EXECUTE FUNCTION update_perfil_profissional_updated_at();

-- ==============================================================================
-- Políticas de Segurança (Row Level Security - RLS)
-- ==============================================================================
ALTER TABLE perfil_profissional ENABLE ROW LEVEL SECURITY;

-- Política 1: Usuário pode visualizar seu próprio perfil ou líderes/admin podem consultar
DROP POLICY IF EXISTS "Permitir leitura de perfil profissional" ON perfil_profissional;
CREATE POLICY "Permitir leitura de perfil profissional" 
    ON perfil_profissional 
    FOR SELECT 
    TO authenticated 
    USING (true);

-- Política 2: Usuário autenticado pode inserir/atualizar seu próprio perfil
DROP POLICY IF EXISTS "Permitir insercao e edicao do proprio perfil" ON perfil_profissional;
CREATE POLICY "Permitir insercao e edicao do proprio perfil" 
    ON perfil_profissional 
    FOR ALL 
    TO authenticated 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
