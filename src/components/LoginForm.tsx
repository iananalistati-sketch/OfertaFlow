'use client';

import { useState } from 'react';

export function LoginForm() {
  const [method, setMethod] = useState<'password' | 'email-link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatus('');
    try {
      const isPassword = method === 'password';
      const response = await fetch(isPassword ? '/api/auth/password-login' : '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isPassword ? { email, password } : { email }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || 'Falha na autenticação. Tente novamente.');
        return;
      }
      if (isPassword) {
        window.location.assign('/admin');
        return;
      }
      setStatus(result.message || 'Confira o link enviado para seu e-mail.');
    } catch {
      setStatus('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
      setPassword('');
    }
  }

  function changeMethod(next: 'password' | 'email-link') {
    setMethod(next);
    setStatus('');
    setPassword('');
  }

  return <form onSubmit={submit} className="form">
    <label>E-mail administrativo
      <input type="email" autoComplete="username" required value={email}
        onChange={event => setEmail(event.target.value)} placeholder="seuemail@exemplo.com" />
    </label>
    {method === 'password' && <label>Senha
      <input type="password" autoComplete="current-password" required value={password}
        onChange={event => setPassword(event.target.value)} placeholder="Sua senha do OfertaFlow" />
    </label>}
    <button className="btn primary" disabled={loading}>
      {loading ? 'Aguarde...' : method === 'password' ? 'Entrar com senha' : 'Receber link de acesso'}
    </button>
    <button type="button" className="btn outline" disabled={loading}
      onClick={() => changeMethod(method === 'password' ? 'email-link' : 'password')}>
      {method === 'password' ? 'Primeiro acesso ou esqueci a senha' : 'Voltar ao login com senha'}
    </button>
    {method === 'email-link' && <p className="subtext">Você receberá um link no e-mail autorizado. Após entrar, abra “Segurança da conta” no painel para definir uma senha.</p>}
    {status && <p aria-live="polite">{status}</p>}
  </form>;
}
