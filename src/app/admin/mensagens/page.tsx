import Link from 'next/link';
import {redirect} from 'next/navigation';
import {configured} from '../../../lib/config';
import {serverClient} from '../../../lib/supabase/server';
import type {PromoOffer} from '../../../lib/automation/whatsapp-message';
import {MessageStudio} from './MessageStudio';

export const dynamic='force-dynamic';
export default async function WhatsAppMessagePage(){
  let products:PromoOffer[]=[];
  if(configured){
    const db=await serverClient();
    const {data:{user}}=await db.auth.getUser();
    if(!user)redirect('/admin/login');
    const {data:admin,error:adminError}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
    if(adminError||!admin) return <><main className="main"><h1>Acesso não autorizado</h1></main></>;
    const {data,error}=await db.from('affiliate_products')
      .select('id,title,source,price,original_price,pix_price,installment_total,installment_count,coupon_code,coupon_verified_at,offer_verified_at,offer_expires_at,affiliate_url,image_url,status')
      .order('created_at',{ascending:false}).limit(30);
    if(error)throw new Error(error.message);
    products=(data||[]) as PromoOffer[];
  }
  return <><main className="main" style={{maxWidth:1200,margin:'auto'}}>
    
    <div className="eyebrow" style={{marginTop:20}}>ANÚNCIOS PARA WHATSAPP</div>
    <h1>Mensagens que ajudam a converter</h1>
    <p className="subtext">Crie mensagens atraentes como a referência enviada, com foto e informações reais das ofertas dos seus programas de afiliados.</p>
    <div className="notice">A publicação automática em grupos permanece desativada até confirmação de uma integração autorizada. Ofertas ilustrativas ou não verificadas nunca são liberadas para compartilhamento.</div>
    <MessageStudio products={products}/>
  </main></>;
}
