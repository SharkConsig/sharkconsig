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

-- 7. Tabela de Chamados (Tickets de Atendimento)
CREATE TABLE IF NOT EXISTS chamados (
    id SERIAL PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'ABERTO',
    origem VARCHAR(255),
    cliente_nome VARCHAR(255),
    cliente_cpf VARCHAR(11),
    cliente_telefone VARCHAR(20),
    margem DECIMAL(15, 2),
    convenio VARCHAR(255),
    equipe VARCHAR(255),
    descricao TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Tabela de Colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    funcao VARCHAR(100),
    cpf VARCHAR(20),
    data_nascimento VARCHAR(50),
    estado_civil VARCHAR(50),
    endereco TEXT,
    telefone VARCHAR(50),
    email VARCHAR(255),
    telefone_emergencia VARCHAR(100),
    tamanho_calcado VARCHAR(20),
    filhos VARCHAR(255),
    tamanho_roupa VARCHAR(20),
    chocolate_preferido TEXT,
    bebida_preferida TEXT,
    comida_preferida TEXT,
    sugestao_campanhas TEXT,
    preferencia_incentivos TEXT,
    data_admissao VARCHAR(50),
    data_demissao VARCHAR(50),
    banco VARCHAR(100),
    agencia VARCHAR(50),
    conta_bancaria VARCHAR(100),
    chave_pix TEXT,
    status VARCHAR(50) DEFAULT 'Ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Tabela de Histórico de Proposta Comercial
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

-- 10. Tabela de Configuração de SLA
CREATE TABLE IF NOT EXISTS sla_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_crm VARCHAR(100) UNIQUE NOT NULL,
    prazo_horas_uteis NUMERIC(5,2) DEFAULT 1.0,
    pergunta_forcada TEXT NOT NULL,
    pergunta2_forcada TEXT DEFAULT NULL,
    prazo2_horas NUMERIC(5,2) DEFAULT NULL,
    faixa_valor_min_margem NUMERIC(15,2) DEFAULT 30000.00,
    faixa_valor_min_cartao NUMERIC(15,2) DEFAULT 5000.00,
    faixa3_min_margem NUMERIC(15,2) DEFAULT 50000.00,
    faixa3_min_cartao NUMERIC(15,2) DEFAULT 10000.00,
    prazo_faixa1_horas NUMERIC(5,2) DEFAULT NULL,
    prazo_faixa2_horas NUMERIC(5,2) DEFAULT NULL,
    prazo_faixa3_horas NUMERIC(5,2) DEFAULT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas adicionais para bancos existentes
ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS pergunta2_forcada TEXT DEFAULT NULL;
ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS prazo2_horas NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS faixa3_min_margem NUMERIC(15,2) DEFAULT 50000.00;
ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS faixa3_min_cartao NUMERIC(15,2) DEFAULT 10000.00;
ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS prazo_faixa1_horas NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS prazo_faixa2_horas NUMERIC(5,2) DEFAULT NULL;
ALTER TABLE sla_config ADD COLUMN IF NOT EXISTS prazo_faixa3_horas NUMERIC(5,2) DEFAULT NULL;

-- Remover colunas obsoletas/duplicadas se existirem no banco
ALTER TABLE sla_config DROP COLUMN IF EXISTS faixa2_min_margem;
ALTER TABLE sla_config DROP COLUMN IF EXISTS faixa2_min_cartao;
ALTER TABLE sla_config DROP COLUMN IF EXISTS prazo_escalonamento_horas;
ALTER TABLE sla_config DROP COLUMN IF EXISTS alvo_escalonamento;

-- Habilitar RLS (Row Level Security)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE instituidores ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_credito ENABLE ROW LEVEL SECURITY;
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chamados ENABLE ROW LEVEL SECURITY;
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_proposta_comercial ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_config ENABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT ALL ON TABLE clientes TO anon, authenticated, service_role;
GRANT ALL ON TABLE matriculas TO anon, authenticated, service_role;
GRANT ALL ON TABLE instituidores TO anon, authenticated, service_role;
GRANT ALL ON TABLE itens_credito TO anon, authenticated, service_role;
GRANT ALL ON TABLE campanhas TO anon, authenticated, service_role;
GRANT ALL ON TABLE lotes TO anon, authenticated, service_role;
GRANT ALL ON TABLE chamados TO anon, authenticated, service_role;
GRANT ALL ON TABLE colaboradores TO anon, authenticated, service_role;
GRANT ALL ON TABLE historico_proposta_comercial TO anon, authenticated, service_role;
GRANT ALL ON TABLE sla_config TO anon, authenticated, service_role;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir tudo para todos" ON clientes;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON matriculas;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON instituidores;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON itens_credito;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON campanhas;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON lotes;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON chamados;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON colaboradores;
DROP POLICY IF EXISTS "Permitir tudo para todos" ON historico_proposta_comercial;
DROP POLICY IF EXISTS "Acesso total sla_config" ON sla_config;

-- Criar políticas para usuários autenticados e públicos/anon (CRUD completo)
CREATE POLICY "Acesso total para autenticados" ON clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON matriculas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON instituidores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON itens_credito FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON campanhas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON lotes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON chamados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total para autenticados" ON historico_proposta_comercial FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total sla_config" ON sla_config FOR ALL TO public USING (true) WITH CHECK (true);
