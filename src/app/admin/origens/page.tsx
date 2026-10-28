import Link from 'next/link';
import {redirect} from 'next/navigation';
import {configured} from '../../../lib/config';
import {serverClient} from '../../../lib/supabase/server';
import {OriginForm} from './OriginForm';
import {WebhookControls} from './WebhookControls';

export const dynamic='force-dynamic';

type Origin={
 id:string;display_name:string;source_kind:string;status:string;
 collection_enabled:boolean;capability_verified:boolean;created_at:string;
 last_received_at:string|null;
 niche_id:string|null
};

export default async function OrigensPage(){
 if(!configured) redirect('/admin/login');
 const db=await serverClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user) redirect('/admin/login');
 const {data:admin}=await db.from('admin_users').select('user_id')
   .eq('user_id',user.id).maybeSingle();
 if(!admin)return <main className="main"><h1>Acesso não autorizado</h1></main>;

 const [sourceResult,nicheResult,capturedResult]=await Promise.all([
   db.from('offer_sources').select('id,display_name,source_kind,status,collection_enabled,capability_verified,created_at,niche_id,last_received_at')
     .order('created_at',{ascending:false}),
   db.from('niches').select('id,name').eq('is_active',true).order('name'),
   db.from('captured_offers').select('id,source_id,conversion_status,marketplace,product_title,created_at,price,coupon_code,suggested_niches,is_test')
     .order('created_at',{ascending:false}).limit(30),
 ]);
 if(sourceResult.error||nicheResult.error||capturedResult.error)
   throw new Error('Não foi possível consultar as origens e o histórico de ofertas.');

 const origins=(sourceResult.data||[]) as Origin[];
 const items=capturedResult.data||[];
 const connected=origins.filter(o=>o.collection_enabled && o.capability_verified);
 const typeNames:Record<string,string>={
   group_reference:'Grupo (referência)',
   authorized_feed:'Feed autorizado',
   authorized_webhook:'Webhook autorizado',
 };

 return <main className="main" style={{maxWidth:1200,margin:'auto'}}>
   <div className="eyebrow">CAPTAÇÃO DE OFERTAS</div>
   <h1>Grupos de origem e fontes</h1>
   <p className="subtext">Fluxo inspirado no modelo de monitoramento de ofertas: identificar a origem, reconhecer produtos e converter os links para a sua conta de afiliado antes de preparar qualquer publicação.</p>
   <div className="notice">As referências de grupos cadastradas aqui NÃO conectam ao WhatsApp nem coletam suas mensagens. A captação automática só será ativada após integração e autorização compatíveis. Nenhuma sessão, cookie ou QR Code é solicitado.</div>
   <section className="panel" style={{marginTop:18}}>
     <h2>Laboratório de leitura de ofertas</h2>
     <p className="subtext">Já temos um leitor que identifica produto, preço, cupom, loja e link a partir do texto de anúncios. Use exemplos anônimos ou cole uma mensagem para conferir a classificação por nicho. Não importa mensagens do WhatsApp nem gera links próprios.</p>
     <Link className="btn primary" href="/admin/origens/analisar">Testar reconhecimento de ofertas</Link>
   </section>
   <div className="stats">
     <div className="stat"><span>Origens cadastradas</span><strong>{origins.length}</strong></div>
     <div className="stat"><span>Fontes autorizadas e ligadas</span><strong>{connected.length}</strong></div>
     <div className="stat"><span>Eventos registrados</span><strong>{items.length}</strong><small>Exibe até 30, incluindo testes</small></div>
     <div className="stat"><span>Publicação automática</span><strong>0</strong><small>Sem conector de envio autorizado</small></div>
   </div>
   <div className="campaigns" style={{marginTop:28}}>
     <section className="panel">
       <h2>Cadastrar origem</h2>
       <OriginForm niches={nicheResult.data||[]}/>
     </section>
     <section className="panel">
       <h2>Processamento planejado</h2>
       <ol style={{lineHeight:2,paddingLeft:20}}>
         <li>Captar oferta por fonte permitida</li>
         <li>Reconhecer loja e produto</li>
         <li>Gerar link da <strong>sua</strong> conta com conector autorizado</li>
         <li>Validar preço, imagem, comissão e política do canal</li>
         <li>Classificar nichos e priorizar oportunidade</li>
         <li>Preparar mensagem e fila de publicação</li>
       </ol>
       <p className="footnote">Se a conversão do link falhar, a oferta deve ser bloqueada. Nunca republicar automaticamente o link de outro afiliado.</p>
     </section>
   </div>
   <div className="sectionrow"><h2>Origens registradas</h2><span className="subtext">{origins.length} registro(s)</span></div>
   <div className="campaigns">
     {origins.map(o=><section key={o.id} className="panel">
       <h3>{o.display_name}</h3>
       <p className="subtext">{typeNames[o.source_kind]||o.source_kind}</p>
       <p><strong>Estado: {o.collection_enabled?'Webhook habilitado':'Não conectado'}</strong></p>
       {o.last_received_at&&<p className="subtext">Último evento: {new Date(o.last_received_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p>}
       {o.source_kind==='authorized_webhook'&&<WebhookControls sourceId={o.id} active={o.collection_enabled}/>}
       <p className="footnote">O cadastro não dá acesso às mensagens de um grupo. Habilitação somente após conector autorizado e verificação de capacidade.</p>
     </section>)}
   </div>
   {!origins.length&&<div className="panel">Nenhuma fonte cadastrada. Você pode registrar referências de origem, mas a captação ficará desligada até conectarmos uma fonte autorizada.</div>}
   <div className="sectionrow"><h2>Últimos eventos recebidos</h2><span className="subtext">Rascunhos de captação, sem publicação</span></div>
   <div className="tablewrap">
    <table>
      <thead><tr><th>PRODUTO</th><th>MARKETPLACE</th><th>PREÇO ANUNCIADO</th><th>ORIGEM</th><th>ESTADO</th></tr></thead>
      <tbody>
        {items.map(item=><tr key={item.id}>
          <td><strong>{item.product_title}</strong>{item.is_test&&<small>Evento demonstrativo</small>}</td>
          <td>{item.marketplace}</td>
          <td>{item.price===null?'Não identificado':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(item.price))}</td>
          <td>{origins.find(source=>source.id===item.source_id)?.display_name||'Origem não identificada'}</td>
          <td>{item.conversion_status==='converted'?'Convertido':item.conversion_status==='blocked'?'Bloqueado':'Aguardando validação'}</td>
        </tr>)}
      </tbody>
    </table>
   </div>
   {!items.length&&<p className="subtext">Nenhum evento recebido ainda. Configure uma fonte webhook autorizada e utilize o teste demonstrativo para conferir o fluxo.</p>}
   <p className="footnote">O endpoint de webhook registra anúncios com status pendente; não lê WhatsApp, não verifica preços ao vivo, não converte links comissionados nem envia mensagens. Fontes experimentais só recebem eventos de integradores autorizados.</p>
 </main>;
}
