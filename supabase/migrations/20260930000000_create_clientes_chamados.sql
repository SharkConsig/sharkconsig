-- ==============================================================================
-- MIGRAÇÃO / TABELA: public.clientes_chamados
-- CRM SharkConsig - Registro e Métricas de Clientes Chamados por Usuário e Campanha
-- ==============================================================================

-- 1. Criação da tabela principal
-- Chave estrangeira com ON DELETE SET NULL e coluna campanha_nome permanente:
-- se a campanha for apagada, os registros desta tabela NÃO são apagados.
CREATE TABLE IF NOT EXISTS public.clientes_chamados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    usuario_nome VARCHAR(255) NOT NULL,
    usuario_funcao VARCHAR(100), -- 'Corretor', 'Estágio', 'CLT', 'PJ', etc.
    campanha_id UUID REFERENCES public.campanhas(id) ON DELETE SET NULL,
    campanha_nome VARCHAR(255) NOT NULL DEFAULT 'Sem Campanha',
    cliente_cpf VARCHAR(11) NOT NULL,
    cliente_nome VARCHAR(255),
    telefones_contatados TEXT[],
    tabulacao VARCHAR(100) NOT NULL DEFAULT 'CLIENTE CHAMADO',
    origem VARCHAR(50) DEFAULT 'CAMPANHA', -- 'CAMPANHA', 'KANBAN', 'AVULSO'
    data_chamado DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para consultas de alta performance e economia de recursos
CREATE INDEX IF NOT EXISTS idx_clientes_chamados_usuario_data 
    ON public.clientes_chamados(usuario_id, data_chamado);

CREATE INDEX IF NOT EXISTS idx_clientes_chamados_campanha_data 
    ON public.clientes_chamados(campanha_id, data_chamado);

CREATE INDEX IF NOT EXISTS idx_clientes_chamados_cpf 
    ON public.clientes_chamados(cliente_cpf);

CREATE INDEX IF NOT EXISTS idx_clientes_chamados_data 
    ON public.clientes_chamados(data_chamado);

CREATE INDEX IF NOT EXISTS idx_clientes_chamados_tabulacao 
    ON public.clientes_chamados(tabulacao);

-- 3. Habilitação de Segurança e Políticas de Acesso (RLS)
ALTER TABLE public.clientes_chamados ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clientes_chamados' AND policyname = 'Permitir leitura para autenticados'
    ) THEN
        CREATE POLICY "Permitir leitura para autenticados" ON public.clientes_chamados
            FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clientes_chamados' AND policyname = 'Permitir insercao para autenticados'
    ) THEN
        CREATE POLICY "Permitir insercao para autenticados" ON public.clientes_chamados
            FOR INSERT TO authenticated WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'clientes_chamados' AND policyname = 'Permitir atualizacao para autenticados'
    ) THEN
        CREATE POLICY "Permitir atualizacao para autenticados" ON public.clientes_chamados
            FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

-- 4. SEGURANÇA MÁXIMA CONTRA EXCLUSÃO:
-- A) Revogação de permissão DELETE para usuários da aplicação
REVOKE DELETE ON public.clientes_chamados FROM authenticated, anon, public;

-- B) Trigger imutável no PostgreSQL: bloqueia qualquer tentativa de exclusão de registros
CREATE OR REPLACE FUNCTION public.fn_prevent_delete_clientes_chamados()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operação negada: Os registros de clientes chamados são auditoria permanente e não podem ser apagados, mesmo que campanhas ou usuários sejam excluídos do sistema.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_delete_clientes_chamados ON public.clientes_chamados;
CREATE TRIGGER trg_prevent_delete_clientes_chamados
BEFORE DELETE ON public.clientes_chamados
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_delete_clientes_chamados();

-- 5. View Consolidada para Relatórios por Usuário, Campanha e Período
CREATE OR REPLACE VIEW public.vw_resumo_clientes_chamados AS
SELECT 
    usuario_id,
    usuario_nome,
    usuario_funcao,
    campanha_id,
    COALESCE(campanha_nome, 'Sem Campanha') AS campanha_nome,
    data_chamado,
    TO_CHAR(data_chamado, 'YYYY-MM') AS periodo_mes,
    COUNT(*) AS total_chamados,
    COUNT(DISTINCT cliente_cpf) AS total_clientes_unicos
FROM public.clientes_chamados
WHERE tabulacao = 'CLIENTE CHAMADO'
GROUP BY 
    usuario_id,
    usuario_nome,
    usuario_funcao,
    campanha_id,
    campanha_nome,
    data_chamado;

-- 6. Carga retroativa automática dos clientes já chamados em campanhas existentes
INSERT INTO public.clientes_chamados (
    campanha_id,
    campanha_nome,
    usuario_id,
    usuario_nome,
    usuario_funcao,
    cliente_cpf,
    tabulacao,
    origem,
    data_chamado,
    created_at,
    updated_at
)
SELECT 
    ca.campanha_id,
    COALESCE(c.nome, 'Campanha Legada'),
    ca.corretor_id AS usuario_id,
    COALESCE(u.raw_user_meta_data->>'nome_completo', u.email, 'Usuário') AS usuario_nome,
    COALESCE(u.raw_user_meta_data->>'funcao', 'Corretor') AS usuario_funcao,
    ca.cliente_cpf,
    ca.tabulacao,
    'CAMPANHA',
    DATE(ca.created_at),
    ca.created_at,
    ca.updated_at
FROM public.campanha_atendimentos ca
LEFT JOIN public.campanhas c ON c.id = ca.campanha_id
LEFT JOIN auth.users u ON u.id = ca.corretor_id
WHERE ca.tabulacao = 'CLIENTE CHAMADO'
  AND ca.cliente_cpf <> '00000000000'
  AND NOT EXISTS (
      SELECT 1 FROM public.clientes_chamados cc 
      WHERE cc.cliente_cpf = ca.cliente_cpf 
        AND cc.campanha_id = ca.campanha_id 
        AND cc.usuario_id = ca.corretor_id 
        AND cc.data_chamado = DATE(ca.created_at)
  );
