-- Create table historico_proposta_comercial
CREATE TABLE IF NOT EXISTS historico_proposta_comercial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_cpf VARCHAR(11) NOT NULL,
    cliente_nome VARCHAR(255),
    user_id UUID,
    user_nome VARCHAR(255),
    user_email VARCHAR(255),
    telefone_consultor VARCHAR(50),
    contratos_considerados JSONB DEFAULT '[]'::jsonb,
    contratos_excluidos JSONB DEFAULT '[]'::jsonb,
    percentual_reducao DECIMAL(10, 2),
    total_parcela_atual DECIMAL(15, 2),
    total_parcela_nova DECIMAL(15, 2),
    arquivo_url TEXT,
    tipo_arquivo VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE historico_proposta_comercial ENABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE historico_proposta_comercial TO authenticated, service_role;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Permitir tudo para todos" ON historico_proposta_comercial;
DROP POLICY IF EXISTS "Acesso total para autenticados" ON historico_proposta_comercial;

-- Create policies for authenticated users
CREATE POLICY "Acesso total para autenticados" ON historico_proposta_comercial FOR ALL TO authenticated USING (true) WITH CHECK (true);
