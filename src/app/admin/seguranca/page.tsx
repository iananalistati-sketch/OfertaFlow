import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Nav } from '../../../components/Nav';
import { configured } from '../../../lib/config';
import { serverClient } from '../../../lib/supabase/server';
import { PasswordForm } from './PasswordForm';

export const dynamic = 'force-dynamic';

export default async function AdminSecurityPage() {
  if (!configured) redirect('/admin/login');
  const supabase = await serverClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  const { data: admin } = await supabase.from('admin_users')
    .select('user_id').eq('user_id', user.id).maybeSingle();
  if (!admin) redirect('/admin/login');

  return <><Nav/><main className="main" style={{maxWidth:840,margin:'auto'}}>
    <Link href="/admin" className="subtext">← Voltar ao painel</Link>
    <div className="eyebrow" style={{marginTop:25}}>ACESSO ADMINISTRATIVO</div>
    <h1>Segurança da conta</h1>
    <p className="subtext">Defina uma senha para entrar no OfertaFlow sem depender de receber um link por e-mail a cada acesso.</p>
    <section className="panel" style={{marginTop:25}}>
      <h2>Criar ou alterar senha</h2>
      <p>Conta: <strong>{user.email}</strong></p>
      <p className="subtext">Recomendamos uma senha única com 12 caracteres ou mais. Ela será protegida pelo Supabase Auth e não será salva em nossos registros de produtos ou campanhas.</p>
      <PasswordForm />
    </section>
    <p className="footnote">Se esquecer a senha, use a opção “Entrar por link de e-mail” na página de login para acessar novamente esta tela e definir outra senha.</p>
  </main></>;
}
