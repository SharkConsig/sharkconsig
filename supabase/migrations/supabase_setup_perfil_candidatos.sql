-- ==============================================================================
-- SharkConsig: Tabela para Registro de Perfil Profissional de Candidatos (Supabase)
-- Otimizado para isolamento total de acesso, tokens de uso único e alto desempenho
-- ==============================================================================

CREATE TABLE IF NOT EXISTS perfil_candidatos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(50),
    endereco TEXT,
    cargo_pretendido VARCHAR(100),
    
    -- Token de Acesso Público Temporário (UUID v4 de uso único)
    token_acesso UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    status VARCHAR(50) NOT NULL DEFAULT 'pendente', -- 'pendente', 'concluido', 'expirado'
    utilizado BOOLEAN NOT NULL DEFAULT false,
    data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL,
    data_conclusao TIMESTAMP WITH TIME ZONE,
    
    versao_instrumento VARCHAR(20) DEFAULT 'v1.0',
    
    -- Respostas brutas das 36 questões: {"1": "A", "2": "B", ...}
    respostas JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Cálculos psicométricos e arquétipos
    raw_scores JSONB,
    normalized_scores JSONB,
    faixas JSONB,
    arquetipo_primario VARCHAR(50),
    arquetipo_secundario VARCHAR(50),
    tipo_resultado VARCHAR(100),
    modo_aprendizagem VARCHAR(100),
    
    -- Consistência interna lógica
    consistencia_pontos INTEGER,
    consistencia_indice NUMERIC(5, 2),
    consistencia_classificacao VARCHAR(50),
    
    -- Auditoria interna do RH
    criado_por_id UUID,
    criado_por_nome VARCHAR(255),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices essenciais para consultas rápidas sem Table Scan
CREATE INDEX IF NOT EXISTS idx_perfil_candidatos_token ON perfil_candidatos(token_acesso);
CREATE INDEX IF NOT EXISTS idx_perfil_candidatos_email ON perfil_candidatos(email);
CREATE INDEX IF NOT EXISTS idx_perfil_candidatos_status ON perfil_candidatos(status);
CREATE INDEX IF NOT EXISTS idx_perfil_candidatos_data_expiracao ON perfil_candidatos(data_expiracao);

-- Trigger para atualização automática do campo updated_at
CREATE OR REPLACE FUNCTION update_perfil_candidatos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_perfil_candidatos_updated_at ON perfil_candidatos;
CREATE TRIGGER trigger_update_perfil_candidatos_updated_at
    BEFORE UPDATE ON perfil_candidatos
    FOR EACH ROW
    EXECUTE FUNCTION update_perfil_candidatos_updated_at();

-- Políticas de RLS
ALTER TABLE perfil_candidatos ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados internos (RH, Admin, Desenvolvedor) podem ler e gerenciar
DROP POLICY IF EXISTS "Permitir gestao interna de candidatos" ON perfil_candidatos;
CREATE POLICY "Permitir gestao interna de candidatos"
    ON perfil_candidatos
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
