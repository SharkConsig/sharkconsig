import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import { replicateCampaignPhotoToUsers } from "@/lib/replicate-campaign-photo";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nome_completo, username, senha, funcao, regime_contratacao, avatar_url, foto_campanha_url, foto_proposta_url, supervisor_id, supervisor_nome, aplicar_campanha_todos, campanha_funcoes_alvo } = body;

    if (!nome_completo || !username || !senha || !funcao || !regime_contratacao) {
      return NextResponse.json(
        { error: "Campos obrigatórios ausentes" },
        { status: 400 }
      );
    }

    const supabaseAdmin = createAdminClient();
    
    // Sanitiza o username (remove espaços, converce para minúsculo)
    const sanitizedUsername = username.trim().toLowerCase().replace(/\s+/g, '.');
    const email = `${sanitizedUsername}@sharkconsig.com`;

    // Previne salvar Base64 no metadata (isso trava o JWT do usuário)
    const safeAvatarUrl = avatar_url?.startsWith('data:image') 
      ? `https://picsum.photos/seed/${username}/200/200` 
      : (avatar_url || `https://picsum.photos/seed/${username}/200/200`);

    const safeFotoCampanhaUrl = foto_campanha_url?.startsWith('data:image')
      ? ""
      : (foto_campanha_url || "");

    const safeFotoPropostaUrl = foto_proposta_url?.startsWith('data:image')
      ? ""
      : (foto_proposta_url || "");

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        nome_completo,
        username,
        funcao,
        regime_contratacao,
        avatar_url: safeAvatarUrl,
        foto_campanha_url: safeFotoCampanhaUrl,
        foto_proposta_url: safeFotoPropostaUrl,
        supervisor_id: supervisor_id || null,
        supervisor_nome: supervisor_nome || null
      },
    });

    if (error) {
      console.error("Erro ao criar usuário no Supabase:", error);
      let friendlyMessage = error.message;
      if (error.message.includes("email address has already been registered") || error.message.includes("already exists")) {
        friendlyMessage = "Este nome de usuário já está sendo utilizado por outro colaborador.";
      } else if (error.message.includes("Password should be at least")) {
        friendlyMessage = "A senha de acesso deve ter pelo menos 6 caracteres.";
      }
      return NextResponse.json({ error: friendlyMessage }, { status: 400 });
    }

    let campaignReplicatedCount = 0;
    if (aplicar_campanha_todos === true && safeFotoCampanhaUrl) {
      campaignReplicatedCount = await replicateCampaignPhotoToUsers(
        supabaseAdmin,
        safeFotoCampanhaUrl,
        {
          funcoesAlvo: Array.isArray(campanha_funcoes_alvo) ? campanha_funcoes_alvo : undefined,
          excludeUserId: data?.user?.id,
        }
      );
    }

    return NextResponse.json({ user: data.user, campaignReplicatedCount }, { status: 201 });
  } catch (error: unknown) {
    console.error("Erro na API create-user:", error);
    const message = error instanceof Error ? error.message : "Erro interno do servidor";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
