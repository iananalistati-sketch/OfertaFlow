import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverClient } from '../../../lib/supabase/server';
import { configured } from '../../../lib/config';

export const dynamic='force-dynamic';

export default async function IntegracoesPage() {
  if (!configured) redirect('/admin/login');
  const db = await serverClient();
  const {data:{user}} = await db.auth.getUser();
  if(!user) redirect('/admin/login');
  const {data:admin} = await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!admin) return <main className="main"><h1>Acesso não autorizado</h1></main>;

  const {data,error} = await db.from('affiliate_accounts')
    .select('id,provider,display_name,status').order('created_at',{ascending:false});
  if(error) throw new Error(error.message);
  const shopee = (data||[]).find(a=>a.provider==='shopee');
  const aliexpress = (data||[]).find(a=>a.provider==='aliexpress');
  return <main className="main">
    <div className="eyebrow">PROVEDORES DE AFILIADOS</div>
    <h1>Integrações</h1>
    <p className="subtext">Conecte vários programas de afiliados nesta mesma área. A importação de produtos e as comissões dependem de contas e APIs autorizadas.</p>
    <div className="campaigns" style={{marginTop:30}}>
      <section className="panel">
        <h2>Shopee Afiliados</h2>
        <p>Status da conta: <strong>{shopee?.status==='approved'?'Aprovada':'Open API aguardando liberação'}</strong></p>
        <p className="subtext">A solicitação de acesso foi enviada. O teste de consulta só poderá ser executado com App ID e Secret autorizados.</p>
        <Link className="btn outline" href="/admin/shopee">Configurar Shopee</Link>
      </section>
      <section className="panel">
        <h2>AliExpress</h2>
        <p>Status: <strong>{aliexpress?.status==='approved'?'Aprovada':'Não conectada'}</strong></p>
        <p className="subtext">Conector preparado para futuras credenciais autorizadas. Nenhuma oferta real está sendo importada.</p>
      </section>
      <section className="panel">
        <h2>Mercado Livre</h2>
        <p><strong>Integração de afiliados não homologada</strong></p>
        <p className="subtext">O DevCenter permite criar aplicações para a API geral, mas isso não prova acesso à conversão automática de links comissionados. Não importaremos sessões/cookies do navegador.</p>
        <p className="footnote">A conversão automática dependerá de funcionalidade autorizada pelo programa ou parceiro homologado. A elegibilidade do WhatsApp também precisa ser confirmada.</p>
      </section>
      <section className="panel">
        <h2>Origens de ofertas</h2>
        <p className="subtext">Registre os grupos de referência e as fontes autorizadas. O motor bloqueará qualquer oferta sem link comissionado da sua conta e canal de distribuição permitido.</p>
        <Link className="btn outline" href="/admin/origens">Ver origens</Link>
      </section>
    </div>
    <p className="footnote">A existência de uma conta afiliada não comprova liberação da API nem garante comissões. Nenhum envio via WhatsApp é ativado nesta tela.</p>
  </main>;
}
