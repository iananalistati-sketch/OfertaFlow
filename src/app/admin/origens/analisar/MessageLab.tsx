'use client';

import {useMemo,useState} from 'react';
import {parseOfferMessage} from '../../../../lib/automation/message-parser';
import {classifyNiches,type NicheConfig} from '../../../../lib/automation/opportunity-engine';

type Niche=NicheConfig;

const exampleTexts=[
  {
    label:'Mercado Livre · Preço + Pix + cupom',
    text:[
      'TRANSFORME A LAVAGEM EM UM BANHO DE ESPUMA',
      'Canhão de Espuma Snow Foam WAP 1L',
      'De: R$ 80 | Por: R$34 pix 🔥',
      '🏷️ Utilize o Cupom: APROVEITAMELI',
      '🛒 Link do Produto',
      'https://meli.la/EXEMPLO01',
    ].join('\n')
  },
  {
    label:'Loja intermediária · Netshoes',
    text:[
      'Tênis Adidas Response Runner 2',
      'Por R$246',
      'Cupom: BN20',
      'Achado na Netshoes',
      'https://achlinks.com.br/achados/EXEMPLO'
    ].join('\n')
  },
  {
    label:'Mercado Livre · De/Por',
    text:[
      'ÁGUA GELADA SEMPRE',
      'Garrafa Térmica Gocase 500ml',
      'De R$ 74 por R$ 67',
      'https://meli.la/EXEMPLO02'
    ].join('\n')
  }
];
const storeNames:Record<string,string>={
  mercadolivre:'Mercado Livre',shopee:'Shopee',
  amazon:'Amazon',aliexpress:'AliExpress',unknown:'Não identificado pelo domínio'
};
const currency=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const money=(n:number|null)=>n===null?'Não encontrado':currency.format(n);
const fieldLabel=(title:string,value:string)=><div style={{padding:'12px 0',borderBottom:'1px solid var(--stroke)'}}>
  <span style={{fontSize:12,color:'var(--muted)',display:'block'}}>{title}</span>
  <strong style={{fontSize:14,overflowWrap:'anywhere'}}>{value}</strong>
</div>;

export function MessageLab({niches}:{niches:Niche[]}){
  const [raw,setRaw]=useState('');
  const parsed=useMemo(()=>raw.trim()?parseOfferMessage(raw):null,[raw]);
  const assigned=useMemo(()=>parsed?.title?classifyNiches(parsed.title,niches):[],[parsed,niches]);
  const selected=[...assigned];
  if(parsed && niches.some(n=>n.slug==='todas-ofertas'&&n.isActive))selected.push('todas-ofertas');
  const unique=[...new Set(selected)];
  const destinations=unique.map(slug=>niches.find(n=>n.slug===slug)?.name||slug);

  return <div className="campaigns" style={{marginTop:25,alignItems:'start'}}>
    <section className="panel" style={{minWidth:0}}>
      <h2>Mensagem de teste</h2>
      <p className="subtext">Cole o texto de um anúncio ou carregue um exemplo anônimo. Os dados são processados apenas nesta página, sem gravar mensagens no Supabase.</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,margin:'15px 0'}}>
        {exampleTexts.map(example=><button key={example.label} type="button"
          className="btn outline" style={{padding:'10px 12px',fontSize:12}}
          onClick={()=>setRaw(example.text)}>{example.label}</button>)}
      </div>
      <label htmlFor="offer-message-input" style={{fontWeight:700,fontSize:13,display:'block',marginBottom:10}}>Texto do anúncio</label>
      <textarea id="offer-message-input" rows={13} maxLength={12000}
        placeholder="Cole aqui um texto de promoção, com título, preço, cupom e link..."
        value={raw} onChange={e=>setRaw(e.target.value)}
        style={{display:'block',width:'100%',resize:'vertical',font:'inherit',fontSize:13,
          lineHeight:1.6,background:'#0e1729',border:'1px solid #34415b',
          color:'#fff',borderRadius:10,padding:15}}/>
      <button type="button" className="btn outline" style={{marginTop:12}}
        onClick={()=>setRaw('')} disabled={!raw}>Limpar</button>
      <p className="footnote">Não inclua telefones, nomes de participantes ou conversas privadas. Exemplos são fictícios e não contêm links ativos de afiliados.</p>
    </section>

    <section className="panel" style={{minWidth:0}}>
      <h2>Resultado da interpretação</h2>
      {!parsed?<p className="subtext">Escolha um exemplo ou cole uma mensagem para visualizar os campos reconhecidos.</p>:<>
        <div className="notice" style={{margin:'13px 0'}}>
          <strong>Somente leitura — não verificado</strong>
          <div>Este resultado não é um anúncio publicável. Os preços, cupons e links ainda precisam ser confirmados pela plataforma e convertidos para sua conta.</div>
        </div>
        {fieldLabel('Produto',parsed.title||'Não identificado')}
        {fieldLabel('Marketplace detectado pelo link',storeNames[parsed.marketplace])}
        {parsed.mentionedStore&&fieldLabel('Loja mencionada no texto (não confirmada)',parsed.mentionedStore)}
        {fieldLabel('Preço anunciado',money(parsed.currentPrice)+(parsed.pixMentioned?' · Pix mencionado':''))}
        {fieldLabel('Preço anterior anunciado',money(parsed.originalPrice))}
        {fieldLabel('Desconto calculado a partir do texto',parsed.discountPercent===null?'Não calculável':parsed.discountPercent+'% — não verificado')}
        {fieldLabel('Cupom mencionado',parsed.couponCode||'Não informado')}
        {fieldLabel('Link recebido (não é seu link convertido)',parsed.productUrl||'Não informado')}
        {fieldLabel('Nicho(s) sugerido(s)',destinations.length?destinations.join(', '):'Nenhum nicho ativo compatível')}
        {fieldLabel('Imagem', 'Não extraída do texto; requer mídia permitida e verificação independente')}
        <h3 style={{fontSize:16,marginTop:21}}>Pendências de validação</h3>
        <ul style={{fontSize:13,lineHeight:1.8,paddingLeft:20,color:'var(--muted)'}}>
          {parsed.warnings.map((warning,i)=><li key={i}>{warning}</li>)}
          <li>Não existe geração automática de links de afiliados ou publicação nesta tela.</li>
        </ul>
      </>}
    </section>
  </div>;
}
