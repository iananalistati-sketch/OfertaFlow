'use client';

import { usePathname } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { Nav } from './Nav';

export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Login/recuperação não expõem o menu interno antes da autenticação.
  if (pathname === '/admin/login') return <>{children}</>;

  return <>
    <Nav variant="admin"/>
    <div className="app admin-app">
      <AdminSidebar/>
      <div className="admin-page">{children}</div>
    </div>
  </>;
}
