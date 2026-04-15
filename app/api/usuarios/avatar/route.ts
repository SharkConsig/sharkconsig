import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    // 1. Garantir que o bucket existe
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.id === 'avatars');

    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
        public: true,
        fileSizeLimit: 2097152, // 2MB
      });
      if (createError) throw createError;
    }

    // 2. Upload do arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // 3. Obter URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return NextResponse.json({ publicUrl });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Erro no proxy de upload:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
