'use client';

import { useActionState } from 'react';
import { saveGroup, type SaveGroupState } from './actions';

type Niche = { id:string; name:string; emoji:string };
type Group = {
  id:string; name:string; niche_id:string; invite_url:string|null; is_active:boolean;
  member_count:number|null; capacity_limit:number|null; is_full:boolean;
};
const initialState:SaveGroupState = {error:null};

export function GroupForm({niches,group}:{niches:Niche[];group?:Group}) {
  const [state,action,pending] = useActionState(saveGroup,initialState);

  return <form action={action} className="form">
    {group && <input type="hidden" name="id" value={group.id}/>}
    <label>Nome do grupo
      <input name="name" placeholder="Ex.: Ofertas de Tecnologia" required minLength={3} maxLength={120}
        defaultValue={group?.name||''}/>
    </label>
    <label>Nicho
      <select name="niche_id" required defaultValue={group?.niche_id||''}
        style={{padding:14,borderRadius:9,background:'#0e1729',color:'#fff',border:'1px solid #34415b'}}>
        <option value="">Selecione o nicho</option>
        {niches.map(n=><option value={n.id} key={n.id}>{n.emoji} {n.name}</option>)}
      </select>
    </label>
    <label>Link de convite do WhatsApp
      <input name="invite_url" type="url" defaultValue={group?.invite_url||''}
        placeholder="https://chat.whatsapp.com/AbCdEf123..."
        aria-describedby="group-link-hint"/>
    </label>
    <p id="group-link-hint" className="subtext">
      Cole o link inteiro obtido no WhatsApp. Links com parâmetros extras de compartilhamento são aceitos.
      O link só é obrigatório quando o convite está ativo.
    </p>
    <label>Capacidade do grupo (opcional)
      <input name="capacity_limit" type="number" min={2} max={10000}
        defaultValue={group?.capacity_limit??''}
        placeholder="Capacidade conhecida"/>
    </label>
    <label>Membros atuais (opcional)
      <input name="member_count" type="number" min={0} max={10000}
        defaultValue={group?.member_count??''}
        placeholder="Número de participantes conhecido"/>
    </label>
    <label className="consent">
      <input name="is_full" type="checkbox" defaultChecked={group?.is_full||false}/>
      Grupo lotado — não encaminhar novos visitantes
    </label>
    <label className="consent">
      <input name="is_active" type="checkbox" defaultChecked={group?.is_active||false}/>
      Disponibilizar convite para visitantes
    </label>
    <button type="submit" className="btn primary" disabled={pending||!niches.length}>
      {pending?'Salvando...':group?'Salvar alterações':'Salvar grupo'}
    </button>
    {state.error && <div role="alert" className="notice" style={{margin:0}}>
      {state.error}
    </div>}
  </form>;
}
