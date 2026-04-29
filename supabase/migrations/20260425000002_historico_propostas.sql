-- Migration to create historico_propostas table
CREATE TABLE IF NOT EXISTS public.historico_propostas (
    id BIGSERIAL PRIMARY KEY,
    proposta_id_lead TEXT NOT NULL REFERENCES public.propostas(id_lead) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    status_anterior TEXT,
    status_novo TEXT,
    descricao TEXT,
    observacoes TEXT,
    alteracoes JSONB, -- To store detailed field changes
    tipo TEXT DEFAULT 'default', -- 'default', 'warning', 'info'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.historico_propostas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Acesso total para autenticados" ON public.historico_propostas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger to log initial creation
CREATE OR REPLACE FUNCTION public.log_proposta_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.historico_propostas (proposta_id_lead, usuario_id, status_novo, descricao, tipo)
    VALUES (NEW.id_lead, NEW.corretor_id, NEW.status, 'Proposta criada no sistema', 'default');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_log_proposta_creation
AFTER INSERT ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.log_proposta_creation();

-- Trigger to log status changes and other updates
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

CREATE TRIGGER tr_log_proposta_update
AFTER UPDATE ON public.propostas
FOR EACH ROW
EXECUTE FUNCTION public.log_proposta_update();
