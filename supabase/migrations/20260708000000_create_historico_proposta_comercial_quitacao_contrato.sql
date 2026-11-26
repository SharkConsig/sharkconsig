-- Create table historico_proposta_comercial_quitacao_contrato
CREATE TABLE IF NOT EXISTS historico_proposta_comercial_quitacao_contrato (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cliente_cpf VARCHAR(11) NOT NULL,
    cliente_nome VARCHAR(255),
    user_id UUID,
    user_nome VARCHAR(255),
    user_email VARCHAR(255),
    telefone_consultor VARCHAR(50),
    valor_liberado DECIMAL(15, 2),
    banco_atual VARCHAR(100),
    saldo_quitacao DECIMAL(15, 2),
    parcela_atual DECIMAL(15, 2),
    prazo_restante VARCHAR(50),
    nova_parcela DECIMAL(15, 2),
    reducao_mensal DECIMAL(15, 2),
    margem_voltou_folha DECIMAL(15, 2),
    banco_autorizacao VARCHAR(100),
    mostrar_troco BOOLEAN DEFAULT TRUE,
    validade_proposta INTEGER,
    documentos_necessarios JSONB DEFAULT '[]'::jsonb,
    arquivo_url TEXT,
    tipo_arquivo VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE historico_proposta_comercial_quitacao_contrato ENABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE historico_proposta_comercial_quitacao_contrato TO authenticated, service_role;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Acesso total para autenticados" ON historico_proposta_comercial_quitacao_contrato;

-- Create policies for authenticated users
CREATE POLICY "Acesso total para autenticados" ON historico_proposta_comercial_quitacao_contrato FOR ALL TO authenticated USING (true) WITH CHECK (true);
