import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '../../../components/Nav';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { demoDiscovery } from '../../../lib/automation/discovery';
export const dynamic='force-dynamic';
export default async function AutomationPage(){
 if(configured){
  const db=await serverClient();
  const {data:{user}}=await db.auth.getUser();if(!user)redirect('/admin/login');
  const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!admin)return <><Nav/><main className="main"><h1>Acesso não autorizado</h1></main></>;
 }
 const offers=demoDiscovery();
 return <><Nav/><main className="main" style={{maxWidth:1120,margin:'auto'}}>
 <Link href="/admin" className="subtext">← Voltar ao painel</Link>
 <div className="eyebrow" style={{marginTop:20}}>AUTOMAÇÃO DE OFERTAS</div><h1>Descoberta e distribuição por nicho</h1>
 <p className="subtext">Demonstração do fluxo automático com produtos fictícios. Nenhuma API foi consultada e nenhuma publicação foi enviada.</p>
 <div className="notice">A execução real depende de credenciais aprovadas para Shopee/AliExpress. Disparos em grupos do WhatsApp continuam desativados até validação de compatibilidade.</div>
 <div className="stats"><div className="stat"><span>Ofertas simuladas</span><strong>{offers.length}</strong><small>Sem consulta a marketplaces</small></div>
 <div className="stat"><span>Links validados</span><strong>0</strong><small>Credenciais pendentes</small></div>
 <div className="stat"><span>Envios realizados</span><strong>0</strong><small>Canal bloqueado</small></div>
 <div className="stat"><span>Cadência geral</span><strong>30 min</strong><small>Configuração inicial</small></div></div>
 <div className="sectionrow"><h2>Prévia da classificação</h2><span className="subtext">Classificador local por palavras-chave · IA futura</span></div>
 <div className="campaigns">{offers.map(o=><article className="panel" key={o.externalId}>
 <span className="chip">{o.provider.toUpperCase()} · EXEMPLO</span>
 <h3>{o.title}</h3>
 <p>💰 {new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(o.price)}</p>
 <p>Nichos detectados: {o.niches.length?o.niches.join(', '):'não identificado'}</p>
 <p>Destinos previstos: {o.destinations.join(', ')}</p>
 <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',background:'#0d1425',padding:14,borderRadius:9,fontFamily:'inherit',fontSize:13}}>{o.copy}</pre>
 <span className="chip">Aguardando credenciais e validação</span>
 </article>)}</div>
 <p className="footnote">Fluxo planejado: API de afiliados → normalização → filtro e classificação → link comissionado verificado → aprovação e fila → envio somente por canal autorizado. Limites de API, duplicidade e horários serão aplicados pelos workers nas próximas etapas.</p>
 </main></>;
}
