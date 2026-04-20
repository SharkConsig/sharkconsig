-- Migration para criar e popular a tabela de consulta rápida otimizada
-- Esta tabela funciona como um snapshot consolidado para performance nas campanhas

-- 1. Tabela de Snapshot (se não existir)
CREATE TABLE IF NOT EXISTS public.base_consulta_rapida (
    cpf TEXT PRIMARY KEY,
    nome TEXT,
    data_nascimento DATE,
    orgao TEXT,
    situacao_funcional TEXT,
    regime_juridico TEXT,
    salario NUMERIC(15, 2),
    uf TEXT,
    margem_35 NUMERIC(15, 2),
    saldo_70 NUMERIC(15, 2),
    liquida_5 NUMERIC(15, 2),
    beneficio_liquida_5 NUMERIC(15, 2),
    banco TEXT,
    tipo TEXT,
    prazo INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance máxima
CREATE INDEX IF NOT EXISTS idx_base_rapida_uf ON public.base_consulta_rapida(uf);
CREATE INDEX IF NOT EXISTS idx_base_rapida_orgao ON public.base_consulta_rapida(orgao);
CREATE INDEX IF NOT EXISTS idx_base_rapida_margem ON public.base_consulta_rapida(margem_35);
CREATE INDEX IF NOT EXISTS idx_base_rapida_tipo ON public.base_consulta_rapida(tipo);

-- 3. Função (RPC) para sincronização da base
-- Isso permite atualizar a base otimizada a partir dos dados brutos com uma única chamada
CREATE OR REPLACE FUNCTION refresh_base_consulta_rapida()
RETURNS void AS $$
BEGIN
    -- Limpa a tabela atual
    TRUNCATE TABLE public.base_consulta_rapida;

    -- Insere os dados consolidados (Um registro por CPF, pegando os vínculos mais recentes)
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, orgao, situacao_funcional, regime_juridico, 
        salario, uf, margem_35, saldo_70, liquida_5, beneficio_liquida_5,
        banco, tipo, prazo
    )
    SELECT DISTINCT ON (c.cpf)
        c.cpf, 
        c.nome, 
        c.data_nascimento, 
        m.orgao, 
        m.situacao_funcional, 
        m.regime_juridico, 
        m.salario, 
        m.uf, 
        inst.margem_35, 
        inst.saldo_70, 
        inst.liquida_5, 
        inst.beneficio_liquida_5,
        ic.banco, 
        ic.tipo, 
        ic.prazo
    FROM public.clientes c
    LEFT JOIN public.matriculas m ON c.cpf = m.cliente_cpf
    LEFT JOIN public.instituidores inst ON m.id = inst.matricula_id
    LEFT JOIN public.itens_credito ic ON inst.id = ic.instituidor_id
    ORDER BY c.cpf, c.updated_at DESC, m.updated_at DESC, inst.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Habilitar RLS e Permissões
ALTER TABLE public.base_consulta_rapida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total para autenticados" ON public.base_consulta_rapida FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.base_consulta_rapida TO authenticated, service_role;
