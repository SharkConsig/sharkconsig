-- Migration to create propostas table
CREATE TABLE IF NOT EXISTS public.propostas (
    id BIGSERIAL PRIMARY KEY,
    id_lead TEXT NOT NULL UNIQUE,
    cliente_cpf TEXT,
    nome_cliente TEXT,
    data_nascimento DATE,
    origem TEXT,
    matricula TEXT,
    convenio TEXT,
    banco TEXT,
    tipo_operacao TEXT,
    valor_parcela NUMERIC(15, 2),
    status TEXT DEFAULT 'AGUARDANDO DIGITAÇÃO',
    corretor_id UUID REFERENCES auth.users(id),
    naturalidade TEXT,
    uf_naturalidade TEXT,
    identidade TEXT,
    orgao_emissor TEXT,
    uf_emissao TEXT,
    data_emissao DATE,
    nome_pai TEXT,
    nome_mae TEXT,
    tel_residencial_1 TEXT,
    tel_residencial_2 TEXT,
    tel_comercial TEXT,
    cep TEXT,
    endereco TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    uf TEXT,
    banco_cliente TEXT,
    chave_pix TEXT,
    conta TEXT,
    agencia TEXT,
    dv TEXT,
    tipo_conta TEXT,
    valor_operacao_operacional NUMERIC(15, 2),
    valor_cliente_operacional NUMERIC(15, 2),
    margem_utilizada NUMERIC(15, 2),
    coeficiente_prazo TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Acesso total para autenticados" ON public.propostas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_propostas_cpf ON public.propostas(cliente_cpf);
CREATE INDEX IF NOT EXISTS idx_propostas_id_lead ON public.propostas(id_lead);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON public.propostas(status);
