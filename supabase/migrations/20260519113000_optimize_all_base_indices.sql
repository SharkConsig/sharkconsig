-- Migration to optimize search and export performance on all base tables
-- Applying indexes to most filtered columns to resolve timeout (57014)

DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY['base_consulta_siape', 'base_consulta_governo_sp', 'base_consulta_prefeitura_sp', 'base_consulta_governo_pi', 'base_consulta_governo_ma', 'base_consulta_rapida'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- CPF Index (Crucial for keyset pagination and ordering)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'cpf') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_cpf', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_cpf ON public.%I(cpf)', t, t);
            END IF;
        END IF;

        -- Categorical Indexes
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'uf') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_uf', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_uf ON public.%I(uf)', t, t);
            END IF;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'orgao') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_orgao', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_orgao ON public.%I(orgao)', t, t);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'regime_juridico') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_regime_jur', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_regime_jur ON public.%I(regime_juridico)', t, t);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'situacao_funcional') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_situacao', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_situacao ON public.%I(situacao_funcional)', t, t);
            END IF;
        END IF;
        
        -- Date Index
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'data_nascimento') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_data_nasc', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_data_nasc ON public.%I(data_nascimento)', t, t);
            END IF;
        END IF;
        
        -- Financial Indexes
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'margem_35') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_margem', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_margem ON public.%I(margem_35)', t, t);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'saldo_70') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_saldo_70', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_saldo_70 ON public.%I(saldo_70)', t, t);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'liquida_5') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_liquida_5', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_liquida_5 ON public.%I(liquida_5)', t, t);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'beneficio_liquida_5') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_benef_liq_5', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_benef_liq_5 ON public.%I(beneficio_liquida_5)', t, t);
            END IF;
        END IF;
        
        -- Contract Indexes
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'banco') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_banco', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_banco ON public.%I(banco)', t, t);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'prazo') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_prazo', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_prazo ON public.%I(prazo)', t, t);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tipo') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_tipo', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_tipo ON public.%I(tipo)', t, t);
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tipo_prefix') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = t AND indexname = format('idx_%s_tipo_prefix', t)) THEN
                EXECUTE format('CREATE INDEX idx_%s_tipo_prefix ON public.%I(tipo_prefix)', t, t);
            END IF;
        END IF;
    END LOOP;
END $$;
