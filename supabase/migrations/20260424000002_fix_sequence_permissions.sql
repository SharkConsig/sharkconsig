-- Migration to fix sequence permissions for propostas table
GRANT USAGE, SELECT ON SEQUENCE public.propostas_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.propostas_id_seq TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.propostas_id_seq TO service_role;

-- General grant for all sequences in public schema to be safe
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
