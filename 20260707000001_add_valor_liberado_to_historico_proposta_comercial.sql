-- Add valor_liberado to historico_proposta_comercial
ALTER TABLE historico_proposta_comercial ADD COLUMN IF NOT EXISTS valor_liberado DECIMAL(15, 2);
