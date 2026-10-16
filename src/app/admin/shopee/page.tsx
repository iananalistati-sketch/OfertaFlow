import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '../../../components/Nav';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';

export const dynamic='force-dynamic';
export default async function ShopeeSetup(){
 if(configured){
  const db=await serverClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/admin/login');
  const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!admin) return <><Nav/><main className="main"><h1>Acesso não autorizado</h1></main></>;
 }
 const hasId=Boolean(process.env.SHOPEE_AFFILIATE_APP_ID);
 const hasSecret=Boolean(process.env.SHOPEE_AFFILIATE_SECRET);
 const ready=hasId&&hasSecret;
 return <><Nav/><main className="main" style={{maxWidth:1050,margin:'auto'}}>
  <Link href="/admin" className="subtext">← Voltar ao painel</Link>
  <div className="eyebrow" style={{marginTop:20}}>INTEGRAÇÃO OFICIAL</div>
  <h1>Shopee Afiliados</h1>
  <p className="subtext">Conectaremos sua conta de afiliado, identificaremos ofertas elegíveis e obteremos links rastreáveis antes de preparar campanhas por nicho.</p>
  <div className="notice">{ready?'Credenciais presentes no servidor, ainda não verificadas pela API. Nenhuma sincronização foi executada.':'Aguardando liberação da Open API e configuração das credenciais. Nenhum produto real foi consultado.'}</div>
  <div className="stats">
   <div className="stat"><span>App ID</span><strong>{hasId?'✓':'—'}</strong><small>{hasId?'Configurado no servidor':'Não configurado'}</small></div>
   <div className="stat"><span>App Secret</span><strong>{hasSecret?'✓':'—'}</strong><small>{hasSecret?'Presente; não exibido':'Não configurado'}</small></div>
   <div className="stat"><span>Autenticação API</span><strong>—</strong><small>Não testada</small></div>
   <div className="stat"><span>Publicação</span><strong>0</strong><small>Desativada</small></div>
  </div>
  <section className="panel" style={{marginTop:28}}>
   <h2>Etapas para ativação</h2>
   <ol style={{lineHeight:2}}>
    <li>Confirme aprovação no programa de afiliados.</li>
    <li>No portal Shopee, procure a seção Open API e solicite acesso caso necessário.</li>
    <li>Após receber App ID e Secret, adicione-os somente ao arquivo local .env.local ou ao gerenciador de segredos de hospedagem.</li>
    <li>Valide as operações de consulta de ofertas e criação de links comissionados.</li>
    <li>Somente depois habilitaremos descoberta real e sincronização agendada.</li>
   </ol>
   <a className="btn outline" href="https://affiliate.shopee.com.br/" target="_blank" rel="noopener noreferrer">Abrir portal de afiliados ↗</a>
   <p className="footnote">Não informe sua senha de login nos campos da API. Esta tela não realiza chamadas à Shopee. Mesmo com as credenciais presentes, a integração permanecerá bloqueada até teste e autorização.</p>
  </section>
 </main></>;
}
