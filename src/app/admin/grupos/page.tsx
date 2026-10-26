import { redirect } from 'next/navigation';
import { configured, mockNiches } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { saveGroup, toggleGroup } from './actions';
export const dynamic='force-dynamic';
type Niche={id:string;name:string;emoji:string};
type Group={id:string;name:string;niche_id:string;invite_url:string|null;is_active:boolean;auto_publish:boolean;channel_verified:boolean;member_count:number|null;capacity_limit:number|null;is_full:boolean};
export default async function GroupsPage(){
 let niches:Niche[]=mockNiches.map((n,i)=>({id:String(i),name:n.name,emoji:n.emoji}));
 let groups:Group[]=[];let pending: {id:string;niche_id:string;created_at:string}[]=[];let inviteClicks=0;
 if(configured){
  const db=await serverClient();
  const {data:{user}}=await db.auth.getUser();
  if(!user) redirect('/admin/login');
  const {data:admin}=await db.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!admin)return <><main className="main"><h1>Acesso não autorizado</h1></main></>;
  const [n,g,requests,clicks]=await Promise.all([
   db.from('niches').select('id,name,emoji').eq('is_active',true).order('name'),
   db.from('whatsapp_groups').select('id,name,niche_id,invite_url,is_active,auto_publish,channel_verified,member_count,capacity_limit,is_full').order('created_at',{ascending:false}),
   db.from('group_expansion_requests').select('id,niche_id,created_at').eq('status','pending'),
   db.from('group_invite_clicks').select('id',{count:'exact',head:true})
  ]);
  if(n.error) throw new Error(n.error.message);
  if(g.error) throw new Error(g.error.message);
  if(requests.error || clicks.error) throw new Error('Falha ao consultar pedidos e cliques.');
  niches=n.data||[];groups=g.data||[];pending=requests.data||[];inviteClicks=clicks.count||0;
 }
 return <><main className="main" style={{maxWidth:1100,margin:'auto'}}>
 
 <div className="heading"><div><div className="eyebrow">WHATSAPP</div><h1>Grupos e convites</h1><p>Configure links e ocupação dos grupos. Visitantes serão direcionados aos convites disponíveis; se um grupo estiver lotado, o próximo receberá novos acessos. Clique não confirma entrada no WhatsApp.</p></div></div>
 {!configured&&<div className="notice">Modo demonstração: conecte o Supabase para cadastrar grupos. Nenhum dado é salvo neste modo.</div>}
 <div className="stats" style={{gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))'}}><div className="stat"><span>Grupos cadastrados</span><strong>{groups.length}</strong></div><div className="stat"><span>Cliques em convites</span><strong>{inviteClicks}</strong><small>Não são membros confirmados</small></div><div className="stat"><span>Expansões pendentes</span><strong>{pending.length}</strong><small>Criar novo grupo no WhatsApp</small></div></div>
 {pending.length>0&&<div className="notice">Há nichos sem grupos disponíveis. É necessário criar um novo grupo real no WhatsApp, obter o convite e cadastrá-lo aqui. A criação automática depende de integração autorizada.</div>}
 <section className="panel" style={{marginTop:25}}>
 <h2>Cadastrar grupo</h2>
 <form action={saveGroup} className="form">
 <label>Nome do grupo<input name="name" placeholder="Ex.: Ofertas de Tecnologia" minLength={3} maxLength={120} required disabled={!configured}/></label>
 <label>Nicho<select name="niche_id" required disabled={!configured} style={{padding:14,borderRadius:9,background:'#0e1729',color:'#fff',border:'1px solid #34415b'}}>
 <option value="">Selecione o nicho</option>{niches.map(n=><option value={n.id} key={n.id}>{n.emoji} {n.name}</option>)}</select></label>
 <label>Link de convite<input name="invite_url" type="url" placeholder="https://chat.whatsapp.com/..." disabled={!configured}/></label>
 <label>Capacidade do grupo (opcional)<input type="number" name="capacity_limit" min={2} max={10000} placeholder="Limite real informado no WhatsApp"/></label>
 <label>Membros atuais (opcional)<input type="number" name="member_count" min={0} placeholder="Preencher apenas quando souber"/></label>
 <label className="consent"><input type="checkbox" name="is_full"/> Grupo lotado: não encaminhar novos visitantes</label>
 <label className="consent"><input type="checkbox" name="is_active" disabled={!configured}/> Disponibilizar convite aos visitantes</label>
 <button type="submit" className="btn primary" disabled={!configured||!niches.length}>Salvar grupo</button>
 </form></section>
 <div className="sectionrow"><h2>Grupos cadastrados</h2><span className="subtext">{groups.length} registro(s)</span></div>
 {groups.length===0?<div className="panel"><p>Nenhum grupo cadastrado. Adicione um grupo e associe-o a um nicho.</p></div>:<div className="campaigns">
 {groups.map(g=><section className="panel" key={g.id}>
 <h3>{g.name}</h3><p>{g.is_full || (g.member_count!==null && g.capacity_limit!==null && g.member_count>=g.capacity_limit)?'Lotado: fora da distribuição':g.is_active?'Convite disponível':'Convite desativado'} · Membros: {g.member_count??'não informado'} / {g.capacity_limit??'limite desconhecido'}</p>
 <form action={saveGroup} className="form">
 <input type="hidden" name="id" value={g.id}/>
 <label>Nome<input name="name" defaultValue={g.name} required minLength={3} maxLength={120}/></label>
 <label>Nicho<select name="niche_id" defaultValue={g.niche_id} required style={{padding:14,borderRadius:9,background:'#0e1729',color:'#fff',border:'1px solid #34415b'}}>
 {niches.map(n=><option value={n.id} key={n.id}>{n.emoji} {n.name}</option>)}</select></label>
 <label>Link do convite<input name="invite_url" type="url" defaultValue={g.invite_url||''} placeholder="https://chat.whatsapp.com/..."/></label>
 <label>Capacidade do grupo<input name="capacity_limit" type="number" min={2} max={10000} defaultValue={g.capacity_limit??''}/></label>
 <label>Membros atuais<input name="member_count" type="number" min={0} defaultValue={g.member_count??''}/></label>
 <label className="consent"><input name="is_full" type="checkbox" defaultChecked={g.is_full}/> Grupo cheio (interromper distribuição)</label>
 <label className="consent"><input name="is_active" type="checkbox" defaultChecked={g.is_active}/> Convite ativo</label>
 <button type="submit" className="btn primary">Salvar alterações</button>
 </form>
 <form action={toggleGroup} style={{marginTop:12}}><input type="hidden" name="id" value={g.id}/><button className="btn outline" type="submit">{g.is_active?'Desativar convite':'Ativar convite'}</button></form>
 </section>)}
 </div>}
 <p className="footnote">A ocupação é preenchida manualmente até haver acesso a uma API compatível. Se um grupo lotar, informe o estado; novos visitantes serão redirecionados para outro grupo do nicho com convite disponível. Nenhuma publicação é disparada por esta tela.</p>
 </main></>;
}
