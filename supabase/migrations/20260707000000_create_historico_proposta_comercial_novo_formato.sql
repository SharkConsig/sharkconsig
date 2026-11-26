-- Create table historico_proposta_comercial_novo_formato
CREATE TABLE IF NOT EXISTS historico_proposta_comercial_novo_formato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_cpf VARCHAR(11) NOT NULL,
    cliente_nome VARCHAR(255),
    user_id UUID,
    user_nome VARCHAR(255),
    user_email VARCHAR(255),
    telefone_consultor VARCHAR(50),
    valor_liberado DECIMAL(15, 2),
    nome_card_esquerdo VARCHAR(50), -- 'FORMATO ROTATIVO' or 'FORMATO ANTIGO'
    prazo_real_esquerdo INTEGER,
    taxa_real_esquerdo DECIMAL(10, 2),
    margem_esquerda DECIMAL(15, 2),
    prazo_real_direito INTEGER,
    taxa_real_direito DECIMAL(10, 2),
    meses_a_menos INTEGER,
    validade_proposta INTEGER, -- days
    documentos_necessarios JSONB DEFAULT '[]'::jsonb,
    banco VARCHAR(100),
    arquivo_url TEXT,
    tipo_arquivo VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE historico_proposta_comercial_novo_formato ENABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE historico_proposta_comercial_novo_formato TO authenticated, service_role;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Acesso total para autenticados" ON historico_proposta_comercial_novo_formato;

-- Create policies for authenticated users
CREATE POLICY "Acesso total para autenticados" ON historico_proposta_comercial_novo_formato FOR ALL TO authenticated USING (true) WITH CHECK (true);
