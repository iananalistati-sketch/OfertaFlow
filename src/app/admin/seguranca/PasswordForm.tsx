'use client';
import { useState } from 'react';

export function PasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 12) { setStatus('Use pelo menos 12 caracteres.'); return; }
    if (password !== confirmation) { setStatus('As senhas não coincidem.'); return; }
    setStatus('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || 'Não foi possível atualizar a senha.');
        return;
      }
      setPassword('');
      setConfirmation('');
      setDone(true);
      setStatus(result.message || 'Senha configurada com sucesso.');
    } catch {
      setStatus('Falha de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return <form onSubmit={save} className="form">
    <label>Nova senha
      <input type={showPassword ? 'text' : 'password'} autoComplete="new-password"
        minLength={12} maxLength={128} required value={password}
        onChange={event => setPassword(event.target.value)} placeholder="Mínimo de 12 caracteres" />
    </label>
    <label>Confirmar senha
      <input type={showPassword ? 'text' : 'password'} autoComplete="new-password"
        minLength={12} maxLength={128} required value={confirmation}
        onChange={event => setConfirmation(event.target.value)} placeholder="Repita sua senha" />
    </label>
    <label className="consent">
      <input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} />
      Mostrar senha
    </label>
    <button className="btn primary" disabled={loading || !password || !confirmation}>
      {loading ? 'Salvando...' : done ? 'Atualizar senha novamente' : 'Definir minha senha'}
    </button>
    {status && <p role="status" className="subtext">{status}</p>}
  </form>;
}
