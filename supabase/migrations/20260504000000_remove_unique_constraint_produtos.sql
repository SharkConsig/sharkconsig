-- Remove a restrição de unicidade para permitir múltiplas tabelas de regras por banco/convênio
ALTER TABLE public.produtos_config DROP CONSTRAINT IF EXISTS produtos_config_banco_id_convenio_id_key;
