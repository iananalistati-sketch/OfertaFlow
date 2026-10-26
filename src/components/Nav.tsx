import Link from 'next/link';

export function Nav({variant='public'}:{variant?:'public'|'admin'}){
  return <header className="topbar">
    <Link href={variant === 'admin' ? '/admin' : '/'} className="brand">
      <span className="brandicon">◆</span> Oferta<span className="accent">Flow</span>
    </Link>
    <nav aria-label="Links do site">
      {variant === 'admin'
        ? <Link href="/entrar">Página pública</Link>
        : <><Link href="/admin">Painel</Link><Link href="/entrar">Participar</Link></>}
    </nav>
  </header>;
}
