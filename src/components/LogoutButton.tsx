'use client';

import { useState } from 'react';

export function LogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('logout_failed');
      window.location.replace('/admin/login');
    } catch {
      setLoading(false);
      window.alert('Não foi possível encerrar a sessão. Tente novamente.');
    }
  }

  return <button type="button" className="btn outline" disabled={loading} onClick={logout}>
    {loading ? 'Saindo...' : 'Sair da conta'}
  </button>;
}
