import Link from 'next/link';
export function Nav(){return <header className="topbar"><Link href="/" className="brand"><span className="brandicon">◆</span> Oferta<span className="accent">Flow</span></Link><nav><Link href="/admin">Painel</Link><Link href="/entrar">Participar</Link></nav></header>}
