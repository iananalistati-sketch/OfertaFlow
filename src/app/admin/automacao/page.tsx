import Link from 'next/link';
import { redirect } from 'next/navigation';
import { configured, mockNiches, mockProducts } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { makeOpportunityPlan, type OpportunityCandidate, type NicheConfig } from '../../../lib/automation/opportunity-engine';
import { buildWhatsappCaption, type PromoOffer } from '../../../lib/automation/whatsapp-message';

export const dynamic = 'force-dynamic';

type NicheRow = { slug:string; name:string; interval_minutes:number; is_active:boolean };
type ProductRow = {
  id:string; external_id:string|null; title:string; source:string; price:number|null;
  original_price:number|null; commission_rate:number|null; commission_verified_at:string|null; sales_count:number|null; sales_verified_at:string|null; image_url:string|null; affiliate_url:string|null;
  offer_verified_at:string|null; offer_expires_at:string|null; status:string;
};

const currency = new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' });
const clock = new Intl.DateTimeFormat('pt-BR', { timeZone:'America/Sao_Paulo', day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });

function exampleOffers(): OpportunityCandidate[] {
  const values = mockProducts.map(p => ({
    provider: (p.platform.startsWith('Shopee') ? 'shopee' : 'aliexpress') as 'shopee'|'aliexpress',
    externalId: p.id, title:p.title,
    price:Number(p.price.replace(/[^0-9,]/g,'').replace(',','.')),
    originalPrice:null, affiliateUrl:null, imageUrl:null, verifiedAt:null,
    expiresAt:null, status:'draft' as const, commissionRate:null, origin:'sample' as const,
  }));
  // O registro duplicado serve somente para demonstrar a regra de deduplicação.
  return [...values, { ...values[0] }];
}

function asCandidate(row: ProductRow): OpportunityCandidate {
  return {
    provider: row.source === 'shopee' || row.source === 'aliexpress' ? row.source : 'manual',
    externalId: row.external_id || row.id,
    title: row.title,
    price: row.price == null ? null : Number(row.price),
    originalPrice: row.original_price == null ? null : Number(row.original_price),
    affiliateUrl: row.affiliate_url,
    imageUrl: row.image_url,
    verifiedAt: row.offer_verified_at,
    expiresAt: row.offer_expires_at,
    status: row.status === 'ready' ? 'ready' : row.status === 'expired' ? 'expired' : 'draft',
    commissionRate: row.commission_verified_at && Date.now()-Date.parse(row.commission_verified_at)<86400000
      ? row.commission_rate : null,
    salesCount: row.sales_verified_at && Date.now()-Date.parse(row.sales_verified_at)<86400000
      ? row.sales_count : null,
    origin: 'database',
  };
}

function previewCaption(o: OpportunityCandidate, sample:boolean, now:number): string {
  const promo:PromoOffer = {
    id:o.externalId, title:o.title, source:o.provider, price:o.price,
    original_price:o.originalPrice ?? null, pix_price:null, installment_total:null,
    installment_count:null, coupon_code:null, coupon_verified_at:null,
    offer_verified_at:o.verifiedAt, offer_expires_at:o.expiresAt || null,
    affiliate_url:o.affiliateUrl, image_url:o.imageUrl, status:o.status,
  };
  return buildWhatsappCaption(promo, now, sample);
}

export default async function AutomationPage({ searchParams }: { searchParams: Promise<{ niche?:string }> }) {
  if (!configured) redirect('/admin/login');
  const db = await serverClient();
  const { data:{ user } } = await db.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data:admin } = await db.from('admin_users').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) return <><main className="main"><h1>Acesso não autorizado</h1></main></>;

  const [nichesResult, productsResult] = await Promise.all([
    db.from('niches').select('slug,name,interval_minutes,is_active').order('name'),
    db.from('affiliate_products').select('id,external_id,title,source,price,original_price,commission_rate,commission_verified_at,sales_count,sales_verified_at,image_url,affiliate_url,offer_verified_at,offer_expires_at,status')
      .order('created_at',{ascending:false}).limit(200),
  ]);
  if (nichesResult.error) throw new Error('Falha ao consultar configurações dos nichos: ' + nichesResult.error.message);
  if (productsResult.error) throw new Error('Falha ao consultar produtos do banco: ' + productsResult.error.message);
  const nicheRows = (nichesResult.data || []) as NicheRow[];
  const productRows = (productsResult.data || []) as ProductRow[];
  const niches:NicheConfig[] = nicheRows.length ? nicheRows.map(n => ({
    slug:n.slug, name:n.name, intervalMinutes:n.interval_minutes, isActive:n.is_active,
  })) : mockNiches.map(n=>({ slug:n.slug, name:n.name, intervalMinutes:n.interval, isActive:true }));

  const simulated = productRows.length === 0;
  const input = simulated ? exampleOffers() : productRows.map(asCandidate);
  const now = Date.now();
  const plan = makeOpportunityPlan(input, niches, now);
  const { niche = 'todos' } = await searchParams;
  const filtered = niche === 'todos' ? plan.opportunities :
    plan.opportunities.filter(o => o.destinations.includes(niche));

  return <><main className="main" style={{maxWidth:1250,margin:'auto'}}>
    
    <div className="eyebrow" style={{marginTop:20}}>MOTOR DE OPORTUNIDADES · MODO DE SIMULAÇÃO</div>
    <h1>Classificação, prioridade e distribuição</h1>
    <p className="subtext">O motor processa produtos, identifica nichos, elimina duplicados e calcula a próxima janela teórica. Nenhum anúncio é enviado e nenhuma fila de publicação é criada.</p>
    <div className="notice">
      {simulated
        ? 'MODO DEMONSTRAÇÃO: não há ofertas reais no banco. Os produtos, preços e a duplicata são exemplos locais; não são promoções e nunca serão publicados.'
        : 'ANÁLISE LOCAL: utilizando registros do Supabase, sujeitos à verificação de preço, imagem, link comissionado, status e validade. Publicação automática desativada.'}
    </div>

    <div className="stats">
      <div className="stat"><span>Ofertas analisadas</span><strong>{plan.opportunities.length}</strong><small>{simulated?'Exemplos ilustrativos':'Registros únicos do banco'}</small></div>
      <div className="stat"><span>Duplicatas descartadas</span><strong>{plan.duplicateCount}</strong><small>Mesmo provedor + ID externo</small></div>
      <div className="stat"><span>Aptas para revisão</span><strong>{plan.reviewableCount}</strong><small>Com dados e validações recentes</small></div>
      <div className="stat"><span>Mensagens enviadas</span><strong>0</strong><small>Envio não habilitado</small></div>
    </div>

    <div className="sectionrow"><h2>Próximas janelas por nicho</h2><span className="subtext">Planejamento hipotético · horário de Brasília</span></div>
    <div className="tablewrap">
      <table><thead><tr><th>NICHO</th><th>INTERVALO</th><th>PRÓXIMA JANELA</th><th>OFERTA PRIORIZADA</th><th>RESULTADO</th></tr></thead>
        <tbody>{plan.slots.map(slot=><tr key={slot.niche}>
          <td><strong>{slot.nicheName}</strong></td><td>{slot.intervalMinutes} min</td>
          <td>{clock.format(new Date(slot.nextSlotAt))}</td>
          <td>{slot.selectedTitle||'Nenhuma identificada'}</td>
          <td>{slot.label}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <p className="footnote">Cada nicho possui seu próprio intervalo. Um produto pode participar de mais de um nicho e do agregador “Todas as Ofertas”, mas apenas uma vez por destino na mesma janela. Essa tabela não representa mensagens agendadas ou enviadas.</p>

    <div className="sectionrow"><h2>Ofertas ranqueadas</h2><span className="subtext">Score explicável (0–100): prioriza ofertas aptas, comissão e vendas observadas quando existirem</span></div>
    <div style={{display:'flex',gap:9,flexWrap:'wrap',marginBottom:18}}>
      <Link className={'btn '+(niche==='todos'?'primary':'outline')} href="/admin/automacao">Todos</Link>
      {niches.filter(n=>n.isActive).map(n=><Link key={n.slug} className={'btn '+(niche===n.slug?'primary':'outline')}
        href={'/admin/automacao?niche='+encodeURIComponent(n.slug)}>{n.name}</Link>)}
    </div>
    <div className="campaigns">
      {filtered.map(o=><article key={o.id} className="panel" style={{minWidth:0}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <span className="chip">{o.provider.toUpperCase()} {o.origin==='sample'?'· EXEMPLO':'· BANCO'}</span>
          <span className="chip">Score: {o.score}/100</span>
        </div>
        <h3>{o.title}</h3>
        <p><strong>{o.price && o.price > 0 ? currency.format(o.price) : 'Preço não informado'}</strong></p>
        <p className="subtext">Nichos: {o.niches.length?o.niches.join(', '):'sem categoria específica'}<br/>
          Destinos candidatos: {o.destinations.join(', ')}<br/>
          Pontuação: relevância {o.breakdown.relevance}, dados {o.breakdown.quality}, atualização {o.breakdown.freshness}, desconto {o.breakdown.savings}, comissão reportada {o.breakdown.commission}, vendas observadas {o.breakdown.sales}.
        </p>
        <p style={{color:o.reviewable?'#a7f5d3':'#ffc78d',fontWeight:700}}>
          {o.reviewable?'✓ Oferta apta ao motor — aguardando canal autorizado':'🔒 Não publicável'}
        </p>
        {!o.reviewable && <ul style={{paddingLeft:20,lineHeight:1.6,fontSize:13}}>
          {o.reasons.map(reason=><li key={reason}>{reason}</li>)}
        </ul>}
        <details><summary style={{cursor:'pointer',fontWeight:700}}>Ver texto preparado para WhatsApp</summary>
          <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontFamily:'inherit',fontSize:13,padding:15,borderRadius:10,background:'#0d1425'}}>
            {previewCaption(o,simulated,now)}
          </pre>
          <p className="footnote">Prévia apenas; não copia nem envia mensagens.</p>
        </details>
      </article>)}
    </div>
    {!filtered.length && <section className="panel">Nenhuma oferta para este nicho na seleção atual.</section>}
    <p className="footnote">Próximas integrações: Shopee Open API quando aprovada → confirmação de links e comissões → persistência idempotente → revisão e fila controlada → envio somente por canal autorizado. O motor não acessa sites não autorizados.</p>
  </main></>;
}
