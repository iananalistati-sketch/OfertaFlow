import { NextResponse, type NextRequest } from 'next/server';
import { offerflowServerDb } from '../../../lib/supabase/service';
import { selectInviteGroup, type GroupAvailability } from '../../../lib/groups/availability';

export const dynamic='force-dynamic';
export const runtime='nodejs';

export async function GET(request:NextRequest,{params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const landing = new URL('/entrar', request.url);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length>80) {
    return NextResponse.redirect(landing,303);
  }
  try {
    const db=offerflowServerDb();
    const {data:niche,error:nicheError}=await db.from('niches').select('id,slug')
      .eq('slug',slug).eq('is_active',true).maybeSingle();
    if(nicheError || !niche)return NextResponse.redirect(landing,303);
    const {data:groups,error:groupsError}=await db.from('whatsapp_groups')
      .select('id,niche_id,name,invite_url,is_active,is_full,member_count,capacity_limit,created_at')
      .eq('niche_id',niche.id).eq('is_active',true);
    if(groupsError) return new NextResponse('Convites temporariamente indisponíveis.',{status:503});
    const chosen=selectInviteGroup((groups||[]) as GroupAvailability[]);
    if (!chosen) {
      // Uma única pendência por nicho; não significa que um novo grupo real foi criado.
      const {data:pending}=await db.from('group_expansion_requests').select('id')
        .eq('niche_id',niche.id).eq('status','pending').limit(1);
      if(!pending?.length)await db.from('group_expansion_requests')
        .insert({niche_id:niche.id,reason:'no_available_group'});
      landing.searchParams.set('sem-vagas',slug);
      return NextResponse.redirect(landing,303);
    }
    // Conta abertura de convite, não ingresso, usuário ou membro do grupo.
    // Erro na telemetria não deve impedir acesso do visitante.
    await db.from('group_invite_clicks').insert({niche_id:niche.id,group_id:chosen.id});
    const url=new URL(chosen.invite_url!);
    if(url.protocol!=='https:'||url.hostname!=='chat.whatsapp.com'||
       !/^\/[A-Za-z0-9]+$/.test(url.pathname)){
      return new NextResponse('O link de convite precisa ser atualizado.',{status:503});
    }
    return NextResponse.redirect(url,302,{headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  } catch {
    return new NextResponse('O convite está temporariamente indisponível.',{status:503});
  }
}
