-- 1. Tabela de Perfis de Usuários (Vínculo com Auth do Supabase)
CREATE TABLE IF NOT EXISTS perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255),
    role VARCHAR(50) DEFAULT 'corretor', -- 'admin' ou 'corretor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Atribuição de Leads (Distribuição de Campanha)
CREATE TABLE IF NOT EXISTS atribuicoes_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campanha_id UUID REFERENCES campanhas(id) ON DELETE CASCADE,
    corretor_id UUID REFERENCES perfis(id) ON DELETE CASCADE,
    cliente_cpf VARCHAR(11) REFERENCES clientes(cpf) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'novo', -- 'novo', 'em_atendimento', 'contatado', 'fechado', 'perdido'
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campanha_id, cliente_cpf) -- Um cliente só pode estar uma vez na mesma campanha
);

-- Habilitar RLS
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE atribuicoes_leads ENABLE ROW LEVEL SECURITY;

-- Permissões
GRANT ALL ON TABLE perfis TO authenticated, service_role;
GRANT ALL ON TABLE atribuicoes_leads TO authenticated, service_role;

-- Políticas de Segurança (Simplificadas para o protótipo)
CREATE POLICY "Permitir leitura de perfis para todos autenticados" ON perfis FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Permitir que usuários criem seu próprio perfil" ON perfis FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Permitir que usuários atualizem seu próprio perfil" ON perfis FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Permitir tudo para admins em perfis" ON perfis FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Corretores veem apenas seus leads" ON atribuicoes_leads FOR SELECT USING (
    corretor_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins gerenciam atribuicoes" ON atribuicoes_leads FOR ALL USING (
    EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND role = 'admin')
);
