'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from './LogoutButton';

const items = [
  { href:'/admin', label:'Visão geral', symbol:'▦' },
  { href:'/admin/shopee', label:'Integração Shopee', symbol:'◈' },
  { href:'/admin/catalogo', label:'Catálogo', symbol:'▤' },
  { href:'/admin/nichos', label:'Nichos e intervalos', symbol:'◷' },
  { href:'/admin/grupos', label:'Grupos WhatsApp', symbol:'♧' },
  { href:'/admin/automacao', label:'Motor de ofertas', symbol:'⚙' },
  { href:'/admin/mensagens', label:'Mensagens', symbol:'✉' },
  { href:'/admin/seguranca', label:'Segurança', symbol:'◇' },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return <aside className="sidebar admin-sidebar" aria-label="Navegação administrativa">
    <div className="sidehead">OFERTAFLOW · ADMIN</div>
    <nav className="side-nav" aria-label="Seções do painel">
      {items.map(item => {
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
        return <Link key={item.href} href={item.href}
          className={'sideitem' + (active ? ' active' : '')}
          aria-current={active ? 'page' : undefined}>
          <span aria-hidden="true">{item.symbol}</span>{item.label}
        </Link>;
      })}
    </nav>
    <div className="sidebottom admin-sidebottom">
      <p>Publicação automática: <strong className="muted">Desativada</strong></p>
      <LogoutButton/>
    </div>
  </aside>;
}
