import { Nav } from '../../../components/Nav';
import { LoginForm } from '../../../components/LoginForm';

export default function Login() {
  return <><Nav/><main className="formpage" style={{gridTemplateColumns:'1fr',maxWidth:620}}>
    <div className="panel">
      <div className="eyebrow">ACESSO RESTRITO</div>
      <h1>Painel administrativo</h1>
      <p>Entre com seu e-mail e senha do OfertaFlow. No primeiro acesso ou se esquecer a senha, use o link de e-mail para entrar e definir uma nova senha.</p>
      <LoginForm/>
    </div>
  </main></>;
}
