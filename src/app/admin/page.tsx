import { redirect } from 'next/navigation';
import { configured } from '../../lib/config';
import { serverClient } from '../../lib/supabase/server';

export const dynamic = 'force-dynamic';

type Niche = { slug:string; name:string; emoji:string; interval_minutes:number; is_active:boolean; auto_publish_enabled:boolean };

export default async function Admin() {
  if (!configured) return <main className="main"><h1>Configure o Supabase</h1><p>O acesso administrativo exige um banco conectado.</p></main>;
  const db = await serverClient();
  const { data:{user} } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data:admin, error:authError } = await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if (authError || !admin) return <main className="main"><h1>Acesso não autorizado</h1></main>;

  const [nicheResult, accountsResult, productsResult, publicationsResult, clicksResult, groupsResult, pendingResult] = await Promise.all([
    db.from('niches').select('slug,name,emoji,interval_minutes,is_active,auto_publish_enabled').order('name'),
    db.from('affiliate_accounts').select('id',{count:'exact',head:true}).eq('status','approved'),
    db.from('affiliate_products').select('id',{count:'exact',head:true}),
    db.from('publication_queue').select('id',{count:'exact',head:true}).eq('status','sent'),
    db.from('group_invite_clicks').select('id',{count:'exact',head:true}),
    db.from('whatsapp_groups').select('id',{count:'exact',head:true}),
    db.from('group_expansion_requests').select('id',{count:'exact',head:true}).eq('status','pending'),
  ]);
  if (nicheResult.error || accountsResult.error || productsResult.error || publicationsResult.error || clicksResult.error || groupsResult.error || pendingResult.error) {
    throw new Error('Não foi possível carregar os indicadores atuais do Supabase.');
  }
  const niches = (nicheResult.data || []) as Niche[];
  const active = niches.filter(n => n.is_active);
  return <main className="main">
    <div className="heading">
      <div>
        <div className="eyebrow">PAINEL ADMINISTRATIVO</div>
        <h1>Visão geral</h1>
        <p>Conta: {user.email}. Acompanhe a configuração e o estado da plataforma.</p>
      </div>
      <span className="chip">Ambiente de desenvolvimento</span>
    </div>

    <div className="stats">
      <div className="stat"><span>Integrações aprovadas</span><strong>{accountsResult.count ?? 0}</strong><small>Shopee: autorização de API pendente</small></div>
      <div className="stat"><span>Grupos cadastrados</span><strong>{groupsResult.count ?? 0}</strong><small>{pendingResult.count??0} expansão(ões) pendente(s)</small></div>
      <div className="stat"><span>Acessos aos convites</span><strong>{clicksResult.count??0}</strong><small>Cliques, não novos membros</small></div>
      <div className="stat"><span>Mensagens encaminhadas</span><strong>{publicationsResult.count ?? 0}</strong><small>Somente envios confirmados</small></div>
    </div>

    <div className="sectionrow"><h2>Cadência por nicho</h2><span className="subtext">Intervalos configurados no Supabase</span></div>
    <div className="campaigns">
      {active.map(n=><div className="campaign" key={n.slug}>
        <div className="emoji">{n.emoji}</div>
        <div className="grow"><b>{n.name}</b><small>Intervalo de planejamento: {n.interval_minutes} min</small></div>
        <span className="chip">{n.auto_publish_enabled?"Automação solicitada · canal pendente":"Envio desligado"}</span>
      </div>)}
    </div>
    {!active.length && <p className="notice">Nenhum nicho ativo no banco.</p>}

    <div className="sectionrow"><h2>Estado das integrações</h2><span className="subtext">Informações de operação</span></div>
    <div className="campaigns">
      <div className="panel">
        <h3>API Shopee</h3>
        <p className="subtext">Solicitação de acesso enviada. Sem credenciais aprovadas, produtos e links comissionados não são importados.</p>
      </div>
      <div className="panel">
        <h3>WhatsApp</h3>
        <p className="subtext">Modelo de anúncios preparado. Publicação em grupos continua desativada até integração autorizada.</p>
      </div>
    </div>
    <p className="footnote">Compartilhe o endereço /entrar nas redes para captar visitantes voluntários. Habilitar automação de nichos não publica mensagens enquanto não houver provedor de envio homologado.</p>
  </main>;
}
