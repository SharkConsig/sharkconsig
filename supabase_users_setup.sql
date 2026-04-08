-- supabase_users_setup.sql

-- 1. Remover a tabela antiga se existir
DROP TABLE IF EXISTS perfis CASCADE;

-- 2. Criar a nova tabela de perfis com os campos solicitados
CREATE TABLE perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255),
    username VARCHAR(255),
    role VARCHAR(50) DEFAULT 'Corretor', -- 'Desenvolvedor', 'Administrador', 'Operacional', 'Supervisor', 'Corretor'
    status VARCHAR(20) DEFAULT 'Ativo', -- 'Ativo', 'Inativo'
    permissoes JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança
-- Todos os usuários autenticados podem ler os perfis (necessário para o sistema funcionar)
CREATE POLICY "Leitura de perfis para autenticados" ON perfis FOR SELECT USING (auth.role() = 'authenticated');

-- Apenas Administradores e Desenvolvedores podem gerenciar perfis (CRUD completo)
CREATE POLICY "Admins e Devs gerenciam perfis" ON perfis FOR ALL USING (
    EXISTS (
        SELECT 1 FROM perfis 
        WHERE id = auth.uid() 
        AND (role = 'Administrador' OR role = 'Desenvolvedor')
    )
);

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Usuários atualizam próprio perfil" ON perfis FOR UPDATE USING (auth.uid() = id);

-- 5. Trigger para atualizar o updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_perfis_updated_at BEFORE UPDATE ON perfis FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
