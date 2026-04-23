-- Migration para criar e popular a tabela de consulta rápida otimizada
-- Esta tabela funciona como um snapshot consolidado para performance nas campanhas

-- 1. Tabela de Snapshot (se não existir)
-- Usamos UNLOGGED para performance massiva (não escreve no WAL), já que é um snapshot regenerável
DROP TABLE IF EXISTS public.base_consulta_rapida;
CREATE UNLOGGED TABLE public.base_consulta_rapida (
    id BIGSERIAL PRIMARY KEY,
    cpf TEXT,
    nome TEXT,
    data_nascimento DATE,
    telefone_1 TEXT,
    telefone_2 TEXT,
    telefone_3 TEXT,
    numero_matricula TEXT,
    orgao TEXT,
    situacao_funcional TEXT,
    regime_juridico TEXT,
    salario NUMERIC(15, 2),
    uf TEXT,
    instituidor_nome TEXT,
    saldo_70 NUMERIC(15, 2),
    margem_35 NUMERIC(15, 2),
    bruta_5 NUMERIC(15, 2),
    utilizada_5 NUMERIC(15, 2),
    liquida_5 NUMERIC(15, 2),
    beneficio_bruta_5 NUMERIC(15, 2),
    beneficio_utilizada_5 NUMERIC(15, 2),
    beneficio_liquida_5 NUMERIC(15, 2),
    banco TEXT,
    tipo TEXT,
    tipo_prefix TEXT,
    prazo INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para performance máxima
CREATE INDEX IF NOT EXISTS idx_base_rapida_cpf ON public.base_consulta_rapida(cpf);
CREATE INDEX IF NOT EXISTS idx_base_rapida_uf ON public.base_consulta_rapida(uf);
CREATE INDEX IF NOT EXISTS idx_base_rapida_orgao ON public.base_consulta_rapida(orgao);
CREATE INDEX IF NOT EXISTS idx_base_rapida_margem ON public.base_consulta_rapida(margem_35);
CREATE INDEX IF NOT EXISTS idx_base_rapida_tipo ON public.base_consulta_rapida(tipo);
CREATE INDEX IF NOT EXISTS idx_base_rapida_tipo_prefix ON public.base_consulta_rapida(tipo_prefix);

-- 3. Função (RPC) para sincronização da base
-- Isso permite atualizar a base otimizada a partir dos dados brutos com uma única chamada
DROP FUNCTION IF EXISTS public.refresh_base_consulta_rapida();
CREATE OR REPLACE FUNCTION refresh_base_consulta_rapida()
RETURNS text AS $$
BEGIN
    -- 1. Aumenta o timeout da sessão (tentando 30 minutos se o banco permitir)
    PERFORM set_config('statement_timeout', '1800000', true);

    -- 2. Derruba os índices para acelerar a inserção em massa (Bulk Load)
    DROP INDEX IF EXISTS public.idx_base_rapida_uf;
    DROP INDEX IF EXISTS public.idx_base_rapida_orgao;
    DROP INDEX IF EXISTS public.idx_base_rapida_margem;
    DROP INDEX IF EXISTS public.idx_base_rapida_tipo;
    DROP INDEX IF EXISTS public.idx_base_rapida_tipo_prefix;
    DROP INDEX IF EXISTS public.idx_base_rapida_cpf;

    -- 3. Limpa a tabela atual
    TRUNCATE TABLE public.base_consulta_rapida;

    -- 4. Insere os dados consolidando oportunidades (Sem DISTINCT ON para não ocultar contratos)
    INSERT INTO public.base_consulta_rapida (
        cpf, nome, data_nascimento, telefone_1, telefone_2, telefone_3,
        numero_matricula, orgao, situacao_funcional, regime_juridico, 
        salario, uf, instituidor_nome,
        saldo_70, margem_35, bruta_5, utilizada_5, liquida_5, 
        beneficio_bruta_5, beneficio_utilizada_5, beneficio_liquida_5,
        banco, tipo, tipo_prefix, prazo
    )
    SELECT 
        c.cpf, 
        c.nome, 
        c.data_nascimento,
        c.telefone_1,
        c.telefone_2,
        c.telefone_3,
        m.numero_matricula,
        m.orgao, 
        m.situacao_funcional, 
        m.regime_juridico, 
        m.salario, 
        m.uf,
        inst.nome as instituidor_nome,
        inst.saldo_70, 
        inst.margem_35, 
        inst.bruta_5,
        inst.utilizada_5,
        inst.liquida_5, 
        inst.beneficio_bruta_5,
        inst.beneficio_utilizada_5,
        inst.beneficio_liquida_5,
        ic.banco, 
        ic.tipo,
        LEFT(ic.tipo, 5),
        ic.prazo
    FROM public.clientes c
    LEFT JOIN public.matriculas m ON c.cpf = m.cliente_cpf
    LEFT JOIN public.instituidores inst ON m.id = inst.matricula_id
    LEFT JOIN public.itens_credito ic ON inst.id = ic.instituidor_id;

    -- 5. Recria os índices para garantir performance nas consultas de filtro
    CREATE INDEX idx_base_rapida_cpf ON public.base_consulta_rapida(cpf);
    CREATE INDEX idx_base_rapida_uf ON public.base_consulta_rapida(uf);
    CREATE INDEX idx_base_rapida_orgao ON public.base_consulta_rapida(orgao);
    CREATE INDEX idx_base_rapida_margem ON public.base_consulta_rapida(margem_35);
    CREATE INDEX idx_base_rapida_tipo ON public.base_consulta_rapida(tipo);
    CREATE INDEX idx_base_rapida_tipo_prefix ON public.base_consulta_rapida(tipo_prefix);

    RETURN 'SUCCESS';
EXCEPTION 
    WHEN OTHERS THEN
        RETURN 'ERROR: ' || SQLERRM || ' (Code: ' || SQLSTATE || ')';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Habilitar RLS e Permissões
ALTER TABLE public.base_consulta_rapida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso total para autenticados" ON public.base_consulta_rapida FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.base_consulta_rapida TO authenticated, service_role;
