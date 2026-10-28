import Link from 'next/link';
import {redirect} from 'next/navigation';
import {configured} from '../../../../lib/config';
import {serverClient} from '../../../../lib/supabase/server';
import {MessageLab} from './MessageLab';

export const dynamic='force-dynamic';

export default async function AnalyzeOriginPage(){
  if(!configured)redirect('/admin/login');
  const db=await serverClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user)redirect('/admin/login');
  const {data:admin}=await db.from('admin_users').select('user_id')
    .eq('user_id',user.id).maybeSingle();
  if(!admin)return <main className="main"><h1>Acesso não autorizado</h1></main>;
  const {data,error}=await db.from('niches')
    .select('slug,name,interval_minutes,is_active,keywords').order('name');
  if(error)throw new Error('Não foi possível carregar os nichos.');
  const niches=(data||[]).map(n=>({
    slug:n.slug,name:n.name,intervalMinutes:n.interval_minutes,
    isActive:n.is_active,keywords:n.keywords||[]
  }));
  return <main className="main" style={{maxWidth:1240,margin:'auto'}}>
    <div className="eyebrow">ORIGENS DE OFERTAS / LABORATÓRIO</div>
    <h1>Reconhecer anúncios</h1>
    <p className="subtext">Valide a leitura de mensagens no formato dos grupos de promoções. A demonstração roda no navegador, sem importar mensagens privadas, consultar links ou enviar publicações.</p>
    <Link className="btn outline" href="/admin/origens" style={{marginTop:15}}>Voltar às origens</Link>
    <MessageLab niches={niches}/>
    <p className="footnote">Próximo passo técnico: conectar uma fonte de mensagens autorizada e uma API/integração de afiliados que confirme preço, imagem, cupom e link da sua própria conta. Somente depois dessa verificação poderemos alimentar uma fila de publicação real.</p>
  </main>;
}
