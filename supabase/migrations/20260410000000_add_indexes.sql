-- Adiciona índices para melhorar a performance das consultas de campanha
-- Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_data_nascimento ON public.clientes(data_nascimento);

-- Matrículas
CREATE INDEX IF NOT EXISTS idx_matriculas_cliente_cpf ON public.matriculas(cliente_cpf);
CREATE INDEX IF NOT EXISTS idx_matriculas_orgao ON public.matriculas(orgao);
CREATE INDEX IF NOT EXISTS idx_matriculas_situacao_funcional ON public.matriculas(situacao_funcional);
CREATE INDEX IF NOT EXISTS idx_matriculas_regime_juridico ON public.matriculas(regime_juridico);
CREATE INDEX IF NOT EXISTS idx_matriculas_uf ON public.matriculas(uf);

-- Instituidores
CREATE INDEX IF NOT EXISTS idx_instituidores_matricula_id ON public.instituidores(matricula_id);
CREATE INDEX IF NOT EXISTS idx_instituidores_margem_35 ON public.instituidores(margem_35);
CREATE INDEX IF NOT EXISTS idx_instituidores_saldo_70 ON public.instituidores(saldo_70);
CREATE INDEX IF NOT EXISTS idx_instituidores_liquida_5 ON public.instituidores(liquida_5);
CREATE INDEX IF NOT EXISTS idx_instituidores_beneficio_liquida_5 ON public.instituidores(beneficio_liquida_5);

-- Itens de Crédito
CREATE INDEX IF NOT EXISTS idx_itens_credito_instituidor_id ON public.itens_credito(instituidor_id);
CREATE INDEX IF NOT EXISTS idx_itens_credito_banco ON public.itens_credito(banco);
CREATE INDEX IF NOT EXISTS idx_itens_credito_tipo ON public.itens_credito(tipo);
CREATE INDEX IF NOT EXISTS idx_itens_credito_prazo ON public.itens_credito(prazo);
CREATE INDEX IF NOT EXISTS idx_itens_credito_orgao ON public.itens_credito(orgao);
