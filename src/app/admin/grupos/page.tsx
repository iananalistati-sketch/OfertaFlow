import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '../../../components/Nav';
import { configured, mockNiches } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { saveGroup, toggleGroup } from './actions';
export const dynamic='force-dynamic';
type Niche={id:string;name:string;emoji:string};
type Group={id:string;name:string;niche_id:string;invite_url:string|null;is_active:boolean;auto_publish:boolean;channel_verified:boolean};
export default async function GroupsPage(){
 let niches:Niche[]=mockNiches.map((n,i)=>({id:String(i),name:n.name,emoji:n.emoji}));
 let groups:Group[]=[];
 if(configured){
  const db=await serverClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/admin/login');
  const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!admin)return <><Nav/><main className="main"><h1>Acesso não autorizado</h1></main></>;
  const [n,g]=await Promise.all([
   db.from('niches').select('id,name,emoji').eq('is_active',true).order('name'),
   db.from('whatsapp_groups').select('id,name,niche_id,invite_url,is_active,auto_publish,channel_verified').order('created_at',{ascending:false})
  ]);
  if(n.error) throw new Error(n.error.message);
  if(g.error) throw new Error(g.error.message);
  niches=n.data||[];groups=g.data||[];
 }
 return <><Nav/><main className="main" style={{maxWidth:1100,margin:'auto'}}>
 <Link href="/admin" className="subtext">← Voltar ao painel</Link>
 <div className="heading"><div><div className="eyebrow">WHATSAPP</div><h1>Grupos e convites</h1><p>Vincule grupos aos nichos. Participantes entram voluntariamente por convite; não haverá inclusão ou publicação automática.</p></div></div>
 {!configured&&<div className="notice">Modo demonstração: conecte o Supabase para cadastrar grupos. Nenhum dado é salvo neste modo.</div>}
 <section className="panel" style={{marginTop:25}}>
 <h2>Cadastrar grupo</h2>
 <form action={saveGroup} className="form">
 <label>Nome do grupo<input name="name" placeholder="Ex.: Ofertas de Tecnologia" minLength={3} maxLength={120} required disabled={!configured}/></label>
 <label>Nicho<select name="niche_id" required disabled={!configured} style={{padding:14,borderRadius:9,background:'#0e1729',color:'#fff',border:'1px solid #34415b'}}>
 <option value="">Selecione o nicho</option>{niches.map(n=><option value={n.id} key={n.id}>{n.emoji} {n.name}</option>)}</select></label>
 <label>Link de convite<input name="invite_url" type="url" placeholder="https://chat.whatsapp.com/..." disabled={!configured}/></label>
 <label className="consent"><input type="checkbox" name="is_active" disabled={!configured}/> Disponibilizar convite aos visitantes</label>
 <button type="submit" className="btn primary" disabled={!configured||!niches.length}>Salvar grupo</button>
 </form></section>
 <div className="sectionrow"><h2>Grupos cadastrados</h2><span className="subtext">{groups.length} registro(s)</span></div>
 {groups.length===0?<div className="panel"><p>Nenhum grupo cadastrado. Adicione um grupo e associe-o a um nicho.</p></div>:<div className="campaigns">
 {groups.map(g=><section className="panel" key={g.id}>
 <h3>{g.name}</h3><p>{g.is_active?'Convite ativo':'Convite desativado'} · Publicação automática bloqueada</p>
 <form action={saveGroup} className="form">
 <input type="hidden" name="id" value={g.id}/>
 <label>Nome<input name="name" defaultValue={g.name} required minLength={3} maxLength={120}/></label>
 <label>Nicho<select name="niche_id" defaultValue={g.niche_id} required style={{padding:14,borderRadius:9,background:'#0e1729',color:'#fff',border:'1px solid #34415b'}}>
 {niches.map(n=><option value={n.id} key={n.id}>{n.emoji} {n.name}</option>)}</select></label>
 <label>Link do convite<input name="invite_url" type="url" defaultValue={g.invite_url||''} placeholder="https://chat.whatsapp.com/..."/></label>
 <label className="consent"><input name="is_active" type="checkbox" defaultChecked={g.is_active}/> Convite ativo</label>
 <button type="submit" className="btn primary">Salvar alterações</button>
 </form>
 <form action={toggleGroup} style={{marginTop:12}}><input type="hidden" name="id" value={g.id}/><button className="btn outline" type="submit">{g.is_active?'Desativar convite':'Ativar convite'}</button></form>
 </section>)}
 </div>}
 <p className="footnote">Por segurança, salvar qualquer alteração mantém auto_publish=false e channel_verified=false. A publicação depende de integração oficial compatível e validação separada.</p>
 </main></>;
}
