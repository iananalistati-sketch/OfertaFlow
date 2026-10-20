/**
 * Executa a reparação PostgreSQL do OfertaFlow sem copiar SQL para o dashboard.
 * Usa a connection string do banco no .env.local; as chaves da Data API NÃO fazem DDL.
 * Nunca imprima os valores do .env.local ou a connection string.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const projectRef = 'pbualjlqihfncjzuxnrt';
const databaseUrl = process.env.OFERTAFLOW_DATABASE_URL?.trim();
const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
const adminEmail = process.env.OFERTAFLOW_ADMIN_EMAIL?.trim().toLowerCase();
const workdir = process.cwd();
const runner = resolve(workdir, 'scripts/.ofertaflow-db-runner');

function stop(message) {
  console.error('✗ ' + message);
  process.exit(1);
}
if (!databaseUrl) stop('Adicione OFERTAFLOW_DATABASE_URL no .env.local (Supabase > Connect > Session pooler).');
let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  stop('OFERTAFLOW_DATABASE_URL não é uma URL PostgreSQL válida.');
}
const isDirect = parsed.hostname === `db.${projectRef}.supabase.co` && parsed.username === 'postgres';
const isPooler = parsed.hostname.endsWith('.pooler.supabase.com') && parsed.username === `postgres.${projectRef}`;
if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || (!isDirect && !isPooler) || parsed.pathname !== '/postgres') {
  stop('A connection string não corresponde ao banco OfertaFlow. Nenhuma alteração realizada.');
}
if (parsed.password === '' || parsed.password.includes('YOUR-PASSWORD') || parsed.password.includes('PASSWORD')) {
  stop('A connection string precisa conter a senha real do banco (não o marcador [YOUR-PASSWORD]).');
}
if (!apiUrl || new URL(apiUrl).hostname !== `${projectRef}.supabase.co`) {
  stop('NEXT_PUBLIC_SUPABASE_URL precisa apontar para o mesmo projeto OfertaFlow.');
}
if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) stop('OFERTAFLOW_ADMIN_EMAIL inválido.');

console.log('OfertaFlow — preparação automática do banco correto, sem apagar registros.');
// Driver separado do app: evita alterar package.json/package-lock.json.
if (!existsSync(join(runner, 'node_modules/pg/package.json'))) {
  console.log('Preparando driver PostgreSQL local...');
  try {
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    execFileSync(npm,
      ['install', '--prefix', runner, '--no-save', '--package-lock=false', '--ignore-scripts', '--no-audit', '--no-fund', 'pg@8.16.3'],
      { stdio: 'inherit', shell: process.platform === 'win32' }
    );
  } catch {
    stop('Não foi possível preparar o driver PostgreSQL. Verifique npm/conexão com internet.');
  }
}
const requireDriver = createRequire(join(runner, 'runner.cjs'));
const { Client } = requireDriver('pg');
const client = new Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: true }, connectionTimeoutMillis: 15000 });
let connected = false;
try {
  await client.connect();
  connected = true;
  const info = await client.query('select current_database() as database, current_user as login');
  if (info.rows[0].database !== 'postgres') throw new Error('database_incorreto');
  const sql = await readFile(resolve(workdir, 'supabase/bootstrap/repair.sql'), 'utf8');
  await client.query('BEGIN');
  try {
    await client.query(sql);
    // Verifica a estrutura essencial ANTES de confirmar a transação.
    const fields = await client.query(`select table_name, column_name
      from information_schema.columns where table_schema = 'public'
      and table_name = any($1::text[])`, [[
      'admin_users','affiliate_accounts','affiliate_products','niches','whatsapp_groups','subscribers',
      'subscriber_niches','product_niches','campaigns','publication_queue','publication_logs','click_events'
    ]]);
    const available = new Set(fields.rows.map(r => `${r.table_name}.${r.column_name}`));
    const essential = [
      'admin_users.user_id','niches.id','niches.slug','niches.name','niches.interval_minutes','niches.is_active',
      'affiliate_accounts.id','affiliate_products.id','whatsapp_groups.id','whatsapp_groups.niche_id',
      'subscribers.id','subscriber_niches.subscriber_id','product_niches.product_id',
      'campaigns.id','publication_queue.id','publication_logs.id','click_events.id'
    ];
    const missing = essential.filter(f => !available.has(f));
    if (missing.length) throw new Error('Colunas incompatíveis: ' + missing.join(', '));
    const rls = await client.query(`select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname = any($1::text[]) and not c.relrowsecurity`,
      [['admin_users','affiliate_accounts','affiliate_products','niches','whatsapp_groups','subscribers',
        'subscriber_niches','product_niches','campaigns','publication_queue','publication_logs','click_events']]);
    if (rls.rows.length) throw new Error('RLS inativo: ' + rls.rows.map(r=>r.relname).join(', '));
    await client.query('COMMIT');
    console.log('✓ Estrutura, nichos, permissões e RLS validados.');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }

  if (adminEmail) {
    if (!secret) throw new Error('Falta SUPABASE_SECRET_KEY para configurar a conta administrativa.');
    const { rows } = await client.query('select id from auth.users where lower(email) = lower($1) limit 1', [adminEmail]);
    if (!rows.length) {
      const service = createClient(apiUrl, secret, { auth: { autoRefreshToken: false, persistSession: false } });
      const { error } = await service.auth.admin.createUser({ email: adminEmail, email_confirm: true });
      if (error) throw new Error('Não foi possível criar usuário Auth: ' + (error.code || error.message));
      console.log('✓ Conta Auth administrativa criada (o login será por e-mail).');
    }
    const result = await client.query(`insert into public.admin_users(user_id)
      select id from auth.users where lower(email) = lower($1)
      on conflict(user_id) do nothing returning user_id`, [adminEmail]);
    const count = await client.query('select count(*)::integer as count from public.admin_users');
    console.log(`✓ Administradores cadastrados: ${count.rows[0].count}.`);
  } else {
    console.log('! Administrador não criado: informe OFERTAFLOW_ADMIN_EMAIL em .env.local e execute novamente.');
  }

  console.log('✓ Banco preparado. Confira com: npm.cmd run setup:check');
  if (adminEmail) console.log('  Acesse http://localhost:3000/admin/login com o e-mail administrativo.');
} catch (error) {
  const safe = error.message === 'database_incorreto'
    ? 'Connection string aponta para um banco diferente de postgres.'
    : error.message;
  console.error('✗ Reparação interrompida: ' + safe);
  console.error('  Nenhuma chave ou senha foi impressa. A alteração de tabelas é transacional.');
  process.exitCode = 1;
} finally {
  if (connected) await client.end().catch(() => {});
}
