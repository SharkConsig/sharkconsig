-- Add pdfUrl column to hr_advertencias
ALTER TABLE public.hr_advertencias 
ADD COLUMN IF NOT EXISTS "pdfUrl" TEXT;

-- Create bucket for hr-advertencias-attachments if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('hr-advertencias-attachments', 'hr-advertencias-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Grant storage access to public (viewing) and authenticated (uploads, deletions)
DROP POLICY IF EXISTS "Acesso Público para Advertências" ON storage.objects;
CREATE POLICY "Acesso Público para Advertências" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'hr-advertencias-attachments');

DROP POLICY IF EXISTS "Upload para Autenticados Advertências" ON storage.objects;
CREATE POLICY "Upload para Autenticados Advertências" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'hr-advertencias-attachments');

DROP POLICY IF EXISTS "Update para Autenticados Advertências" ON storage.objects;
CREATE POLICY "Update para Autenticados Advertências" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'hr-advertencias-attachments');

DROP POLICY IF EXISTS "Delete para Autenticados Advertências" ON storage.objects;
CREATE POLICY "Delete para Autenticados Advertências" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'hr-advertencias-attachments');
