'use client';

import {useMemo,useState} from 'react';
import {buildWhatsappCaption,promoSafety,type PromoOffer} from '../../../lib/automation/whatsapp-message';
import styles from './message-studio.module.css';

const illustration:PromoOffer = {
  id:'demo', title:'Parafusadeira e Furadeira WAP BPF 12K3 + Maleta',
  source:'mercadolivre', price:96.39, original_price:199.99,
  pix_price:96.39, installment_total:107.10, installment_count:8,
  coupon_code:'PROMOCONSTRU', coupon_verified_at:new Date().toISOString(),
  offer_verified_at:null, offer_expires_at:null, affiliate_url:null, image_url:null, status:'draft'
};

export function MessageStudio({products}:{products:PromoOffer[]}){
  const [selectedId,setSelectedId]=useState(products[0]?.id||'demo');
  const [copied,setCopied]=useState('');
  const demo=!products.length;
  const active=products.find(p=>p.id===selectedId)||products[0]||illustration;
  const safety=promoSafety(active);
  const caption=useMemo(()=>buildWhatsappCaption(active,Date.now(),demo),[active,demo]);
  const available=!demo&&safety.ready;
  const url=available?`https://wa.me/?text=${encodeURIComponent(caption)}`:'';
  async function copy(){
    if(!available)return;
    try{
      await navigator.clipboard.writeText(caption);
      setCopied('Texto copiado. Anexe a foto do produto no WhatsApp antes de enviar.');
    }catch{
      setCopied('Não foi possível copiar automaticamente. Selecione o texto da prévia.');
    }
  }
  return <div className={styles.layout}>
    <section className="panel">
      <h2>Composição do anúncio</h2>
      <p className="subtext">Formato de oferta semelhante ao exemplo recebido: chamada, foto, preço, parcelamento, cupom e link de afiliado.</p>
      {!demo&&<label className={styles.field}>Produto
        <select value={active.id} onChange={event=>{setSelectedId(event.target.value);setCopied('');}}>
          {products.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </label>}
      {demo&&<div className="notice">Visualização ilustrativa baseada na referência. Preços e cupom não foram conferidos, e não existe link comissionado. Envio bloqueado.</div>}
      <div className={styles.detail}>
        <span className="chip">{active.source.toUpperCase()}</span>
        <span className="chip">{active.status==='ready'?'Pronta para revisão':'Rascunho'}</span>
      </div>
      <h3>Critérios para liberar uma oferta real</h3>
      <p className="subtext">Imagem original do produto, link comissionado autorizado, preço válido e validação da oferta nas últimas 24 horas. Cupons só aparecem quando confirmados recentemente.</p>
      <p className={available?styles.approved:styles.blocked}>{available?'✓ '+safety.reason:demo?'🔒 Apenas demonstração. Não pode ser distribuída.':'🔒 '+safety.reason}</p>
      <div className={styles.actions}>
        <button type="button" className="btn primary" disabled={!available} onClick={copy}>Copiar texto</button>
        {available?<a className="btn outline" href={url} target="_blank" rel="noopener noreferrer">Abrir WhatsApp ↗</a>:<span className={styles.disabledButton}>Compartilhamento indisponível</span>}
      </div>
      {copied&&<p role="status" className={styles.message}>{copied}</p>}
      <p className="footnote">O botão abre o compartilhamento manual de <strong>texto</strong>. A foto precisa ser anexada no WhatsApp pelo operador. Publicação automática com foto e legenda requer um canal/API de mensagens autorizado; ainda não está ativada.</p>
    </section>
    <section className={styles.phoneWrap}>
      <div className={styles.phoneHead}><span>Ofertas do OfertaFlow</span><small>Prévia do WhatsApp</small></div>
      <div className={styles.chat}>
        <div className={styles.bubble}>
          {active.image_url?<img className={styles.productImg} src={active.image_url} alt={active.title}/>:<div className={styles.noImage}><span>📷</span><b>Foto do produto</b><small>Será obtida da plataforma autorizada</small></div>}
          <div className={styles.caption}>{caption}</div>
          <div className={styles.timestamp}>prévia · não enviada</div>
        </div>
      </div>
    </section>
  </div>;
}
