import { redirect } from 'next/navigation';
import { configured,mockNiches,mockProducts } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { saveAccount,saveProduct } from './actions';
export const dynamic='force-dynamic';
type Account={id:string;display_name:string;provider:string;status:string};
type Niche={id:string;name:string};
type Product={id:string;title:string;description:string|null;price:number|null;affiliate_url:string|null;image_url:string|null;account_id:string|null;status:string};
export default async function CatalogPage(){
 let accounts:Account[]=[];let niches:Niche[]=mockNiches.map((x,i)=>({id:String(i),name:x.name}));let products:Product[]=mockProducts.map(x=>({id:x.id,title:x.title,description:'Produto de demonstração',price:Number(x.price.replace(/[^0-9,]/g,'').replace(',','.')),affiliate_url:null,image_url:null,account_id:null,status:'draft'}));let links:{product_id:string;niche_id:string}[]=[];
 if(configured){
  const db=await serverClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/admin/login');
  const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();if(!admin)return <><main className="main"><h1>Acesso não autorizado</h1></main></>;
  const [a,n,p,l]=await Promise.all([db.from('affiliate_accounts').select('id,display_name,provider,status').order('created_at',{ascending:false}),db.from('niches').select('id,name').eq('is_active',true).order('name'),db.from('affiliate_products').select('id,title,description,price,affiliate_url,image_url,account_id,status').order('created_at',{ascending:false}),db.from('product_niches').select('product_id,niche_id')]);
  for(const x of [a,n,p,l])if(x.error)throw Error(x.error.message);
  accounts=a.data||[];niches=n.data||[];products=p.data||[];links=l.data||[];
 }
 const selectStyle={padding:14,borderRadius:9,background:'#0e1729',color:'#fff',border:'1px solid #34415b'};
 return <><main className="main" style={{maxWidth:1150,margin:'auto'}}>
 
 <div className="heading"><div><div className="eyebrow">CATÁLOGO DE AFILIADOS</div><h1>Plataformas e produtos</h1><p>Cadastre ofertas para preparar campanhas. Não há sincronização nem envio automático nesta versão.</p></div></div>
 {!configured&&<div className="notice">Modo demonstração: conecte o Supabase para salvar contas e produtos.</div>}
 <div className="campaigns" style={{marginTop:25}}>
 <section className="panel"><h2>Nova conta de afiliado</h2><form action={saveAccount} className="form">
 <label>Identificação<input name="display_name" placeholder="Minha conta Shopee" required minLength={2} disabled={!configured}/></label>
 <label>Plataforma<select name="provider" style={selectStyle} disabled={!configured}><option value="shopee">Shopee</option><option value="aliexpress">AliExpress</option><option value="manual">Manual / outra</option></select></label>
 <button className="btn primary" disabled={!configured}>Cadastrar conta</button></form>
 <h3>Contas cadastradas</h3>{accounts.length?accounts.map(a=><form key={a.id} action={saveAccount} className="form" style={{marginBottom:15}}>
 <input type="hidden" name="id" value={a.id}/><label>Nome<input name="display_name" defaultValue={a.display_name} required/></label>
 <label>Plataforma<select name="provider" style={selectStyle} defaultValue={a.provider}><option value="shopee">Shopee</option><option value="aliexpress">AliExpress</option><option value="manual">Manual</option></select></label>
 <small>Status: {a.status} · sem credenciais conectadas</small><button className="btn outline">Salvar conta</button></form>):<p>Nenhuma conta cadastrada.</p>}
 </section>
 <section className="panel"><h2>Novo produto</h2><form action={saveProduct} className="form">
 <label>Produto<input name="title" placeholder="Nome do produto" required minLength={3} disabled={!configured}/></label>
 <label>Descrição<input name="description" placeholder="Benefícios resumidos" disabled={!configured}/></label>
 <label>Preço (R$)<input name="price" type="number" min="0" step="0.01" required disabled={!configured}/></label>
 <label>Link de afiliado<input name="affiliate_url" type="url" placeholder="https://..." disabled={!configured}/></label>
 <label>Imagem (URL)<input name="image_url" type="url" placeholder="https://..." disabled={!configured}/></label>
 <label>Conta<select name="account_id" style={selectStyle} disabled={!configured}><option value="">Sem conta / manual</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select></label>
 <fieldset disabled={!configured} style={{border:'1px solid #34415b',borderRadius:9,padding:13}}><legend>Nichos do produto</legend>{niches.map(n=><label key={n.id} className="consent"><input type="checkbox" name="niche_ids" value={n.id}/>{n.name}</label>)}</fieldset>
 <button className="btn primary" disabled={!configured}>Cadastrar produto</button></form></section>
 </div>
 <div className="sectionrow"><h2>Produtos cadastrados</h2><span className="subtext">{products.length} registro(s)</span></div>
 {products.map(p=><section className="panel" style={{marginBottom:16}} key={p.id}><h3>{p.title} <span className="chip">{p.status}</span></h3>
 <form action={saveProduct} className="form" style={{gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))'}}>
 <input type="hidden" name="id" value={p.id}/><label>Nome<input name="title" defaultValue={p.title} required disabled={!configured}/></label>
 <label>Descrição<input name="description" defaultValue={p.description||''} disabled={!configured}/></label>
 <label>Preço<input name="price" type="number" min="0" step="0.01" defaultValue={p.price??0} required disabled={!configured}/></label>
 <label>Link de afiliado<input name="affiliate_url" type="url" defaultValue={p.affiliate_url||''} disabled={!configured}/></label>
 <label>Imagem<input name="image_url" type="url" defaultValue={p.image_url||''} disabled={!configured}/></label>
 <label>Conta<select name="account_id" style={selectStyle} defaultValue={p.account_id||''} disabled={!configured}><option value="">Manual</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.display_name}</option>)}</select></label>
 <fieldset disabled={!configured} style={{border:'1px solid #34415b',borderRadius:9,padding:13}}><legend>Nichos</legend>{niches.map(n=><label key={n.id} className="consent"><input type="checkbox" name="niche_ids" value={n.id} defaultChecked={links.some(x=>x.product_id===p.id&&x.niche_id===n.id)}/>{n.name}</label>)}</fieldset>
 <button className="btn outline" disabled={!configured}>Salvar produto</button></form></section>)}
 <p className="footnote">Produtos salvos como rascunho. Preço e ofertas não são verificados automaticamente. Adaptadores Shopee e AliExpress permanecem desativados.</p>
 </main></>;
}
