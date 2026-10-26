import { Nav } from '../../components/Nav';
import { PublicNichePicker, type PublicNiche } from '../../components/PublicNichePicker';
import { offerflowServerDb } from '../../lib/supabase/service';
import { selectInviteGroup, type GroupAvailability } from '../../lib/groups/availability';

export const dynamic = 'force-dynamic';

export default async function Entrar() {
  let niches:PublicNiche[]=[];
  let unavailable=false;
  try {
    const db=offerflowServerDb();
    const [n,g] = await Promise.all([
      db.from('niches').select('id,slug,name,emoji').eq('is_active',true).order('name'),
      db.from('whatsapp_groups').select('id,niche_id,name,invite_url,is_active,is_full,member_count,capacity_limit,created_at').eq('is_active',true),
    ]);
    if(n.error || g.error) throw new Error('Unavailable');
    const groups=(g.data||[]) as GroupAvailability[];
    niches=(n.data||[]).map(niche=>{
      const selection=selectInviteGroup(groups.filter(group=>group.niche_id===niche.id));
      return {slug:niche.slug,name:niche.name,emoji:niche.emoji,
        available:!!selection,availabilityKnown:selection?.capacityState==='available'};
    });
  } catch { unavailable=true; }
  return <><Nav/><main className="formpage">
    <div className="capturehead">
      <span className="eyebrow">OFERTAS POR INTERESSE</span>
      <h1>Escolha seus nichos.<br/><span>Entre nos grupos.</span></h1>
      <p>Publique este endereço nas suas redes sociais. O visitante seleciona os assuntos que gosta e escolhe voluntariamente quais convites abrir no WhatsApp.</p>
      <p className="subtext">A entrada no grupo acontece diretamente no WhatsApp, conforme a disponibilidade real do convite.</p>
    </div>
    {unavailable
      ? <div className="panel"><h2>Convites temporariamente indisponíveis</h2><p>Não foi possível consultar os grupos. Tente novamente mais tarde.</p></div>
      : <PublicNichePicker niches={niches}/>}
  </main></>;
}
