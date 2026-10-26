import { createClient } from '@supabase/supabase-js';

const label = '[OfertaFlow / Supabase]';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const secret = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

function invalid(value) {
  return !value || value.includes('COLE_') || value.includes('SUA_CHAVE_');
}

console.log(`${label} Verificando configuração local (sem imprimir chaves)...`);
if (invalid(url) || invalid(publicKey) || invalid(secret)) {
  console.error('✗ Faltam URL, Publishable key ou Secret key em .env.local.');
  console.error('  Veja docs/SUPABASE_SETUP.md. Não envie suas chaves a ninguém.');
  process.exit(1);
}
let parsedUrl;
try {
  parsedUrl = new URL(url);
} catch {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL não é uma URL válida.');
  process.exit(1);
}
const expectedHost = 'pbualjlqihfncjzuxnrt.supabase.co';
if (parsedUrl.protocol !== 'https:' || parsedUrl.hostname !== expectedHost) {
  console.error('✗ Este .env.local está apontando para outro projeto Supabase.');
  console.error('  URL esperada: https://' + expectedHost);
  console.error('  URL configurada: ' + parsedUrl.origin);
  console.error('  Confirme as chaves deste mesmo projeto em seu painel Supabase.');
  process.exit(1);
}
console.log('✓ Projeto correto: ' + expectedHost);
if (secret === publicKey || secret.startsWith('sb_publishable_')) {
  console.error('✗ SUPABASE_SECRET_KEY não deve conter a chave pública.');
  process.exit(1);
}

const db = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false }
});
let errors = 0;
function fail(message) {
  errors += 1;
  console.error(`✗ ${message}`);
}
function pass(message) {
  console.log(`✓ ${message}`);
}

try {
  const { data: niches, error: nichesError } = await db
    .from('niches').select('slug,interval_minutes').order('slug');
  if (nichesError) {
    fail(`Não foi possível ler "niches" (código: ${nichesError.code || 'desconhecido'}).`);
    if (nichesError.code === 'PGRST205') {
      console.log('  PGRST205: a tabela não foi encontrada no catálogo da API (pode estar ausente ou com cache desatualizado).');
      console.log("  No SQL Editor execute: SELECT to_regclass('public.niches');");
      console.log("  Se retornar public.niches, execute: NOTIFY pgrst, 'reload schema';");
      console.log('  Se retornar NULL, a tabela está ausente: consulte o SQL inicial e NÃO recrie todas as tabelas existentes.');
    } else {
      console.log('  Confira permissões, políticas RLS e a estrutura da tabela no SQL Editor do OfertaFlow.');
    }
  } else {
    pass(`Banco acessível; tabela niches consultada (${niches.length} registro(s)).`);
    const expected = new Map([
      ['tecnologia', 60], ['games', 60], ['casa', 60], ['todas-ofertas', 30]
    ]);
    const mismatches = [...expected].filter(([slug, minutes]) => {
      const row = niches.find(n => n.slug === slug);
      return !row || row.interval_minutes !== minutes;
    });
    if (mismatches.length) fail('Nichos ou intervalos iniciais incompletos. Confira a migração e as configurações.');
    else pass('Nichos e intervalos iniciais estão corretos.');
  }

  const { count: adminCount, error: adminError } = await db
    .from('admin_users').select('user_id', { count: 'exact', head: true });
  if (adminError) {
    fail(`Não foi possível consultar "admin_users" (código: ${adminError.code || 'desconhecido'}).`);
  } else if (!adminCount) {
    fail('O primeiro acesso administrativo ainda não foi confirmado.');
    console.log('  A conta será autorizada automaticamente após o primeiro login por e-mail.');
    console.log('  1. Abra http://localhost:3000/admin/login');
    console.log('  2. Informe o e-mail administrador que já foi autorizado no banco.');
    console.log('  3. Clique no link recebido e confirme o acesso.');
    console.log('  4. Execute npm.cmd run setup:check novamente.');
    console.log('  Não é preciso executar SQL nem setup:apply.');
  } else {
    pass(`Tabela admin_users acessível; ${adminCount} administrador(es) cadastrado(s).`);
  }

  for (const table of ['affiliate_accounts', 'affiliate_products', 'whatsapp_groups']) {
    const { error } = await db.from(table).select('id', { count: 'exact', head: true });
    if (error) fail(`Tabela ${table} indisponível (código: ${error.code || 'desconhecido'}).`);
    else pass(`Tabela ${table} acessível.`);
  }
} catch {
  fail('Falha de rede, certificado ou configuração ao acessar o Supabase.');
}

if (errors) {
  console.log(`\n${label} ${errors} pendência(s) encontrada(s). Veja docs/SUPABASE_SETUP.md.`);
  process.exitCode = 1;
} else {
  console.log(`\n${label} Conexão e estrutura básica validadas. Teste o login em /admin/login.`);
}
