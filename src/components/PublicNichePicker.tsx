'use client';
import { useState } from 'react';

export type PublicNiche = { slug:string; name:string; emoji:string; available:boolean; availabilityKnown:boolean };
export function PublicNichePicker({niches}:{niches:PublicNiche[]}) {
  const [chosen,setChosen] = useState<string[]>([]);
  function toggle(slug:string) {
    setChosen(current=>current.includes(slug)?current.filter(v=>v!==slug):[...current,slug]);
  }
  const selected=niches.filter(n=>chosen.includes(n.slug));
  return <section className="panel">
    <h2>Escolha seus interesses</h2>
    <p className="subtext">Selecione quantos nichos quiser. Não pedimos seu nome, telefone ou senha para mostrar os convites.</p>
    <div className="nichegrid">
      {niches.map(n=><button type="button" key={n.slug}
        aria-pressed={chosen.includes(n.slug)}
        className={'niche '+(chosen.includes(n.slug)?'selected':'')}
        onClick={()=>toggle(n.slug)}>
        <span className="nichememoji">{n.emoji}</span>
        <span>{n.name}</span>
        <span className="checkboxvisual">{chosen.includes(n.slug)?'✓':''}</span>
      </button>)}
    </div>
    <p className="hint">Você decide em quais grupos deseja entrar. Não adicionamos ninguém automaticamente.</p>
    {selected.length>0 && <div className="invites" style={{marginTop:20}}>
      <h3>Convites selecionados</h3>
      {selected.map(n=>n.available
        ? <a key={n.slug} className="btn primary" href={'/g/'+encodeURIComponent(n.slug)}
            target="_blank" rel="noopener noreferrer">
            Abrir grupo de {n.name} no WhatsApp ↗
          </a>
        : <div key={n.slug} className="notice">
            {n.name}: ainda não há convite disponível. Um novo grupo precisará ser cadastrado.
          </div>)}
    </div>}
    <p className="footnote">O clique é registrado apenas como acesso ao convite, não como confirmação de ingresso. A lotação depende de informação atualizada pelo administrador ou por integração autorizada.</p>
  </section>;
}
