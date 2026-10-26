'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function FinishLogin() {
  const [message, setMessage] = useState('Confirmando seu acesso administrativo...');

  useEffect(() => {
    let mounted = true;
    const finish = async () => {
      // O fragmento é processado somente no navegador; tokens não são enviados ao servidor.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const error = hash.get('error_description') || hash.get('error');
      if (error) {
        if (mounted) setMessage('Não foi possível concluir o login. Solicite um novo link de acesso.');
        return;
      }
      if (!accessToken || !refreshToken) {
        if (mounted) setMessage('O link não contém uma sessão válida. Solicite um novo link de acesso.');
        return;
      }
      try {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) throw new Error('missing_configuration');
        const client = createBrowserClient(url, key);
        const { error: sessionError } = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
        window.history.replaceState({}, '', window.location.pathname);
        window.location.replace('/admin');
      } catch {
        if (mounted) setMessage('Falha ao confirmar a sessão. Solicite um novo link de acesso.');
      }
    };
    void finish();
    return () => { mounted = false; };
  }, []);

  return <main className="formpage" style={{display:'block',maxWidth:620}}>
    <section className="panel">
      <div className="eyebrow">OFERTAFLOW · AUTENTICAÇÃO</div>
      <h1>Confirmação de acesso</h1>
      <p role="status">{message}</p>
      <Link className="btn outline" href="/admin/login">Solicitar outro link de acesso</Link>
    </section>
  </main>;
}
