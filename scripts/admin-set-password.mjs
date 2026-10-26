/**
 * Recuperação local e explícita do primeiro acesso administrativo.
 *
 * Usa somente a Secret key em .env.local (nunca exponha essa chave ou as senhas).
 * Exige terminal interativo e confirma os dois valores de senha.
 * Não cria, confirma ou promove contas; apenas define senha de admin existente e confirmado.
 */
import { createClient } from '@supabase/supabase-js';
import { emitKeypressEvents } from 'node:readline';

const expectedHost = 'pbualjlqihfncjzuxnrt.supabase.co';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secretKey = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const expectedEmail = process.env.OFERTAFLOW_ADMIN_EMAIL?.trim().toLowerCase();

function fail(message) {
  console.error('✗ ' + message);
  process.exit(1);
}
let endpoint;
try {
  endpoint = new URL(url);
} catch {
  fail('NEXT_PUBLIC_SUPABASE_URL não é uma URL válida no .env.local.');
}
if (endpoint.protocol !== 'https:' || endpoint.hostname !== expectedHost || endpoint.pathname !== '/') {
  fail('O arquivo .env.local não aponta para o projeto Supabase OfertaFlow. Operação cancelada.');
}
if (!secretKey || secretKey === publicKey || secretKey.startsWith('sb_publishable_') || secretKey.includes('COLE_')) {
  fail('É necessária a SUPABASE_SECRET_KEY administrativa no .env.local. Nunca envie essa chave.');
}
if (!process.stdin.isTTY || !process.stdout.isTTY) {
  fail('Por segurança, execute este comando em um terminal interativo do VS Code.');
}

const client = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
console.log('OfertaFlow: configuração local de senha administrativa');
console.log('Nenhuma senha será mostrada, gravada em arquivo ou incluída no GitHub.\n');

let adminId;
let adminEmail;
try {
  const { data: records, error: readError } = await client.from('admin_users')
    .select('user_id').limit(3);
  if (readError) throw new Error('A Secret key não conseguiu consultar os administradores.');
  if (!records || records.length !== 1) {
    throw new Error('Esperava exatamente um administrador no banco. Não vou escolher outra conta automaticamente.');
  }
  adminId = records[0].user_id;
  const { data: response, error } = await client.auth.admin.getUserById(adminId);
  if (error || !response?.user) throw new Error('Não foi possível validar o usuário no Supabase Auth.');
  const user = response.user;
  if (!user.email || !user.email_confirmed_at) {
    throw new Error('Conta ainda não está confirmada. Não é seguro definir senha.');
  }
  if (expectedEmail && user.email.toLowerCase() !== expectedEmail) {
    throw new Error('O e-mail administrativo no .env.local não corresponde ao banco.');
  }
  adminEmail = user.email;
} catch (error) {
  fail(error.message || 'Falha de validação do administrador.');
}

console.log('Administrador validado: ' + adminEmail);
console.log('Escolha uma senha única, com no mínimo 12 caracteres.\n');

emitKeypressEvents(process.stdin);
function hiddenInput(prompt) {
  return new Promise(resolve => {
    let value = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();

    function cleanup() {
      process.stdin.off('keypress', handler);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }
    function handler(str, key) {
      if (key?.ctrl && key?.name === 'c') {
        cleanup();
        process.stdout.write('\nOperação cancelada.\n');
        process.exit(130);
      }
      if (key?.name === 'return' || key?.name === 'enter') {
        cleanup();
        process.stdout.write('\n');
        resolve(value);
      } else if (key?.name === 'backspace') {
        if (value.length) {
          value = value.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else if (typeof str === 'string' && str.length && !key?.ctrl && !key?.meta && !key?.sequence?.startsWith('\u001b')) {
        // Compatível com caracteres unicode e colagem no terminal.
        const printable = [...str].filter(char => char >= ' ' && char !== '\u007f').join('');
        if (printable && value.length + printable.length <= 128) {
          value += printable;
          process.stdout.write('*'.repeat([...printable].length));
        }
      }
    }
    process.stdin.on('keypress', handler);
  });
}

let password = await hiddenInput('Nova senha: ');
let repeated = await hiddenInput('Confirme a senha: ');
if (password.length < 12 || password.length > 128) fail('A senha precisa ter entre 12 e 128 caracteres.');
if (password !== repeated) fail('As senhas não coincidem. Nenhuma alteração foi feita.');
repeated = '';

console.log('Atualizando somente a senha do administrador confirmado...');
try {
  const { error } = await client.auth.admin.updateUserById(adminId, { password });
  if (error) throw new Error(error.code || 'Falha na API de autenticação');

  // Teste usando a chave pública, não a chave administrativa.
  if (publicKey && publicKey !== secretKey) {
    const browserLike = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { error: loginError } = await browserLike.auth.signInWithPassword({
      email: adminEmail, password,
    });
    if (loginError) {
      console.log('! Senha alterada, mas o teste de login não confirmou o acesso: ' + (loginError.code || 'erro de autenticação'));
    } else {
      await browserLike.auth.signOut({ scope: 'local' }).catch(() => {});
      console.log('✓ Login por senha validado com a chave pública do OfertaFlow.');
    }
  }
  console.log('✓ Senha salva no Supabase Auth. Agora acesse http://localhost:3000/admin/login');
} catch (error) {
  console.error('✗ Falha ao definir a senha: ' + (error.message || 'erro desconhecido'));
  process.exitCode = 1;
} finally {
  password = '';
}
