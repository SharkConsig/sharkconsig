-- 20260425000003_cleanup_historico.sql
-- No changes needed to the table schema since we're using usuario_id.
-- We just ensure we don't have triggers trying to access auth.users directly if it causes issues,
-- though standard SQL triggers can usually access it if they are SECURITY DEFINER.
-- However, since the user wants to avoid the perfil table entirely and just use metadata,
-- we'll rely on the client or API to resolve metadata if needed (not implemented here yet).

-- Just a placeholder migration to keep the sequence clean if needed, 
-- or we can use it to fix the triggers from 20260425000002 if they were broken.

-- Re-declaring triggers to use auth.uid() safely.
CREATE OR REPLACE FUNCTION public.log_proposta_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.historico_propostas (proposta_id_lead, usuario_id, status_novo, descricao, tipo)
    VALUES (NEW.id_lead, NEW.corretor_id, NEW.status, 'Proposta criada no sistema', 'default');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.log_proposta_update()
RETURNS TRIGGER AS $$
DECLARE
    v_desc TEXT;
    v_alteracoes JSONB := '{}'::JSONB;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        v_desc := 'Alteração de status de ' || OLD.status || ' para ' || NEW.status;
        
        INSERT INTO public.historico_propostas (
            proposta_id_lead, 
            usuario_id, 
            status_anterior, 
            status_novo, 
            descricao, 
            tipo
        )
        VALUES (
            NEW.id_lead, 
            auth.uid(), 
            OLD.status, 
            NEW.status, 
            v_desc, 
            'info'
        );
    END IF;

    -- Log field changes if necessary (Operacional values)
    IF OLD.valor_parcela IS DISTINCT FROM NEW.valor_parcela OR 
       OLD.valor_operacao_operacional IS DISTINCT FROM NEW.valor_operacao_operacional OR
       OLD.valor_cliente_operacional IS DISTINCT FROM NEW.valor_cliente_operacional THEN
       
       IF OLD.valor_parcela IS DISTINCT FROM NEW.valor_parcela THEN
           v_alteracoes := v_alteracoes || jsonb_build_object('valor_parcela', jsonb_build_object('old', OLD.valor_parcela, 'new', NEW.valor_parcela));
       END IF;
       
       IF OLD.valor_operacao_operacional IS DISTINCT FROM NEW.valor_operacao_operacional THEN
           v_alteracoes := v_alteracoes || jsonb_build_object('valor_operacao_operacional', jsonb_build_object('old', OLD.valor_operacao_operacional, 'new', NEW.valor_operacao_operacional));
       END IF;

       IF OLD.valor_cliente_operacional IS DISTINCT FROM NEW.valor_cliente_operacional THEN
           v_alteracoes := v_alteracoes || jsonb_build_object('valor_cliente_operacional', jsonb_build_object('old', OLD.valor_cliente_operacional, 'new', NEW.valor_cliente_operacional));
       END IF;

       INSERT INTO public.historico_propostas (
            proposta_id_lead, 
            usuario_id, 
            descricao, 
            alteracoes,
            tipo
        )
        VALUES (
            NEW.id_lead, 
            auth.uid(), 
            'Alteração de valores operacionais', 
            v_alteracoes, 
            'info'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
