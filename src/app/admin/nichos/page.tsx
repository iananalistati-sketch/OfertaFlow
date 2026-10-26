import Link from 'next/link';
import { redirect } from 'next/navigation';
import { configured, mockNiches } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { saveNiche, toggleNiche } from './actions';
export const dynamic = 'force-dynamic';
type Niche = {id:string;name:string;slug:string;emoji:string;interval_minutes:number;is_active:boolean};
export default async function NichosPage(){
 let niches:Niche[] = mockNiches.map((n,i)=>({id:String(i),name:n.name,slug:n.slug,emoji:n.emoji,interval_minutes:n.interval,is_active:true}));
 if(configured){
  const db=await serverClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/admin/login');
  const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!admin) return <><main className="main"><h1>Acesso não autorizado</h1></main></>;
  const {data,error}=await db.from('niches').select('id,name,slug,emoji,interval_minutes,is_active').order('name');
  if(error) throw new Error(error.message);
  niches=data||[];
 }
 return <><main className="main" style={{maxWidth:1100,margin:'auto'}}>
 
 <div className="heading"><div><div className="eyebrow">CADASTROS</div><h1>Nichos e intervalos</h1><p>Configure as categorias e suas frequências. Nenhum disparo é realizado por esta tela.</p></div></div>
 {!configured && <div className="notice">Modo demonstração: os dados abaixo são fictícios. Conecte o Supabase para habilitar alterações.</div>}
 <section className="panel" style={{marginTop:25}}>
 <h2>Novo nicho</h2>
 <form action={saveNiche} className="form" style={{gridTemplateColumns:'repeat(auto-fit,minmax(170px,1fr))',alignItems:'end'}}>
 <label>Nome<input name="name" placeholder="Ex.: Livros" required minLength={2} maxLength={80} disabled={!configured}/></label>
 <label>Identificador<input name="slug" placeholder="ex.: livros" required pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={!configured}/></label>
 <label>Emoji<input name="emoji" defaultValue="🏷️" required maxLength={12} disabled={!configured}/></label>
 <label>Intervalo (min)<input name="interval_minutes" type="number" defaultValue={5} min={5} max={1440} disabled={!configured}/></label>
 <input type="hidden" name="is_active" value="on"/>
 <button type="submit" className="btn primary" disabled={!configured}>Adicionar nicho</button>
 </form></section>
 <div className="sectionrow"><h2>Nichos cadastrados</h2><span className="subtext">{niches.length} registro(s)</span></div>
 <div className="campaigns">
 {niches.map(n=><section className="panel" key={n.id}>
 <form action={saveNiche} className="form">
 <input type="hidden" name="id" value={n.id}/>
 <label>Nome<input name="name" defaultValue={n.name} required minLength={2} disabled={!configured}/></label>
 <label>Identificador<input name="slug" defaultValue={n.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" disabled={!configured}/></label>
 <label>Emoji<input name="emoji" defaultValue={n.emoji} required maxLength={12} disabled={!configured}/></label>
 <label>Intervalo em minutos<input name="interval_minutes" type="number" min={5} max={1440} defaultValue={n.interval_minutes} disabled={!configured}/></label>
 <label className="consent"><input name="is_active" type="checkbox" defaultChecked={n.is_active} disabled={!configured}/> Nicho ativo</label>
 <button className="btn primary" type="submit" disabled={!configured}>Salvar alterações</button>
 </form>
 <form action={toggleNiche} style={{marginTop:12}}>
 <input type="hidden" name="id" value={n.id}/><input type="hidden" name="current" value={String(n.is_active)}/>
 <button type="submit" className="btn outline" disabled={!configured}>{n.is_active?'Desativar nicho':'Reativar nicho'}</button>
 </form>
 </section>)}
 </div>
 <p className="footnote">A categoria “Todas as Ofertas” funciona como destino geral. A publicação automática permanece desativada e condicionada à validação do WhatsApp e às políticas de cada afiliado.</p>
 </main></>;
}
