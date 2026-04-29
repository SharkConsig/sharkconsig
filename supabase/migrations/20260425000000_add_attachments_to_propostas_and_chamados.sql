-- Add attachment columns to propostas
ALTER TABLE public.propostas 
ADD COLUMN IF NOT EXISTS arquivo_rg_frente TEXT,
ADD COLUMN IF NOT EXISTS arquivo_rg_verso TEXT,
ADD COLUMN IF NOT EXISTS arquivo_contracheque TEXT,
ADD COLUMN IF NOT EXISTS arquivo_extrato TEXT,
ADD COLUMN IF NOT EXISTS arquivo_outros TEXT,
ADD COLUMN IF NOT EXISTS arquivo_outros_2 TEXT;

-- Add second outros column to chamados
ALTER TABLE public.chamados 
ADD COLUMN IF NOT EXISTS arquivo_outros_2 TEXT;

-- Inserir bucket se não existir para chamados
INSERT INTO storage.buckets (id, name, public)
VALUES ('chamados-attachments', 'chamados-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Inserir bucket se não existir para propostas
INSERT INTO storage.buckets (id, name, public)
VALUES ('propostas-attachments', 'propostas-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao Storage para propostas
CREATE POLICY "Acesso Público para Visualização Propostas" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'propostas-attachments');

CREATE POLICY "Upload para Autenticados Propostas" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'propostas-attachments');
