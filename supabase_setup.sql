-- SQL para configurar as tabelas do SharkConsig no Supabase

-- 1. Tabela de Clientes (Dados Pessoais)
CREATE TABLE IF NOT EXISTS clientes (
    cpf VARCHAR(11) PRIMARY KEY,
    nome VARCHAR(255),
    data_nascimento DATE,
    telefone_1 VARCHAR(20),
    telefone_2 VARCHAR(20),
    telefone_3 VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Matrículas (Vínculos Funcionais)
CREATE TABLE IF NOT EXISTS matriculas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpf VARCHAR(11) REFERENCES clientes(cpf) ON DELETE CASCADE,
    matricula VARCHAR(50),
    orgao VARCHAR(255),
    situacao_funcional VARCHAR(255),
    regime_juridico VARCHAR(255),
    salario DECIMAL(15, 2),
    uf VARCHAR(2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cpf, matricula)
);

-- 3. Tabela de Instituidores (Margens e Saldos)
-- Nota: Para BENEFICIARIO PENSAO, um CPF pode ter várias matrículas e cada matrícula vários instituidores.
CREATE TABLE IF NOT EXISTS instituidores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula_id UUID REFERENCES matriculas(id) ON DELETE CASCADE,
    instituidor VARCHAR(255),
    saldo_70 DECIMAL(15, 2),
    margem_35 DECIMAL(15, 2),
    bruta_5 DECIMAL(15, 2),
    utilizada_5 DECIMAL(15, 2),
    liquida_5 DECIMAL(15, 2),
    beneficio_bruta_5 DECIMAL(15, 2),
    beneficio_utilizada_5 DECIMAL(15, 2),
    beneficio_liquida_5 DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Tabela de Itens de Crédito (Contratos, Cartões)
CREATE TABLE IF NOT EXISTS itens_credito (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instituidor_id UUID REFERENCES instituidores(id) ON DELETE CASCADE,
    banco VARCHAR(255),
    orgao VARCHAR(255),
    tipo VARCHAR(50), -- 'EMPRESTIMO', 'CARTAO CONSIGNADO', 'CARTAO BENEFICIO'
    numero_do_contrato VARCHAR(100),
    parcela DECIMAL(15, 2),
    prazo INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Tabela de Campanhas (Filtros Salvos)
CREATE TABLE IF NOT EXISTS campanhas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    filtros JSONB NOT NULL,
    publico_estimado INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Tabela de Lotes (Histórico de Importação)
CREATE TABLE IF NOT EXISTS lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descricao TEXT,
    tipo VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PROCESSING',
    progresso INTEGER DEFAULT 0,
    total_linhas VARCHAR(50) DEFAULT '0',
    erro TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE instituidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE clientes TO authenticated, service_role;
GRANT ALL ON TABLE matriculas TO authenticated, service_role;
GRANT ALL ON TABLE instituidores TO authenticated, service_role;
GRANT ALL ON TABLE itens_credito TO authenticated, service_role;
GRANT ALL ON TABLE campanhas TO authenticated, service_role;
GRANT ALL ON TABLE lotes TO authenticated, service_role;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir tudo para todos" ON clientes;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON matriculas;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON instituidores;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON itens_credito;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON campanhas;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON lotes;

-- Criar políticas para usuários autenticados (CRUD completo)
CREATE POLICY "Acesso total para autenticados" ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON instituidores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON itens_credito FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON campanhas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON lotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
