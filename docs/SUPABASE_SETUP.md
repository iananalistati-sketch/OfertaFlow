# Configuração do Supabase — OfertaFlow

**Projeto informado:** `pbualjlqihfncjzuxnrt`  
**Project URL (público):** `https://pbualjlqihfncjzuxnrt.supabase.co`

> Este documento não contém chaves. O projeto ainda precisa ter as tabelas criadas e as credenciais configuradas no ambiente local. A integração Supabase do ChatGPT não recebeu permissão de acesso a este projeto; por isso nenhuma migração foi aplicada remotamente por esta conexão.

## 1. Atualizar o código no computador

```powershell
git pull origin main
Copy-Item .env.example .env.local
```

Se `.env.local` já existir, **não sobrescreva**: apenas edite as variáveis necessárias.

## 2. Configurar variáveis locais

No [Supabase Dashboard do OfertaFlow](https://supabase.com/dashboard/project/pbualjlqihfncjzuxnrt), abra **Project Settings → API Keys** (ou **Connect → Next.js**), copie a **Publishable key**, e configure:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://pbualjlqihfncjzuxnrt.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=COLE_SUA_PUBLISHABLE_KEY_LOCALMENTE
SUPABASE_SECRET_KEY=COLE_SUA_SECRET_KEY_SOMENTE_LOCALMENTE
```

`SUPABASE_SECRET_KEY` é a nova chave secreta usada **somente no servidor** para registrar participantes. Se seu projeto ainda estiver usando chaves antigas, o código aceita `SUPABASE_SERVICE_ROLE_KEY` como alternativa temporária. **Nunca** coloque a chave secreta em `NEXT_PUBLIC_*`, GitHub, imagens ou mensagens. O arquivo `.env.local` já está no `.gitignore`.

A chave pública é necessária para autenticação e gestão administrativa; a chave secreta é usada pelo endpoint de cadastro de participantes. A presença de chaves não libera automaticamente a API da Shopee.

## 3. Aplicar migração inicial no banco recém-criado

1. Abra [SQL Editor — OfertaFlow](https://supabase.com/dashboard/project/pbualjlqihfncjzuxnrt/sql).
2. No GitHub, abra o arquivo [migração inicial](../supabase/migrations/20261016150000_initial_schema.sql).
3. Copie **todo** o SQL e execute **uma vez** no projeto OfertaFlow, não no BPF Manager.
4. Em **Table Editor**, confirme que existem `admin_users`, `affiliate_accounts`, `affiliate_products`, `niches`, `whatsapp_groups`, `subscribers` e demais tabelas.
5. Confira em **Database → Policies** que o Row Level Security (RLS) está ativo. Não desative RLS para “fazer funcionar”.

A migração cria os nichos Tecnologia (60 min), Games (60 min), Casa (60 min) e Todas as Ofertas (30 min). Nenhuma publicação é habilitada.

**Não execute novamente o SQL inteiro se as tabelas já existirem.** Primeiro verifique o estado ou as migrações aplicadas.

## 4. Criar o primeiro administrador

1. Abra **Authentication → Users** no projeto OfertaFlow.
2. Crie o usuário administrador (ou use o cadastro autorizado do provedor de e-mail). Confirme o e-mail.
3. Copie o **User UID** do registro, não a senha.
4. No SQL Editor do **OfertaFlow**, execute, substituindo o UUID:

```sql
insert into public.admin_users (user_id)
values ('UUID_DO_SEU_USUARIO_AQUI')
on conflict (user_id) do nothing;
```

Esse registro é obrigatório para habilitar operações de edição nas telas administrativas. A autorização é verificada no servidor e por RLS.

## 5. Configurar o login por e-mail

Em **Authentication → URL Configuration**:
- **Site URL:** `http://localhost:3000` (enquanto testar localmente).
- **Redirect URLs:** adicionar `http://localhost:3000/auth/confirm` (e o domínio de produção quando houver).

O código aceita callbacks com `?code=` (PKCE) e com `?token_hash=...&type=email`. Se utilizar template de Magic Link personalizado, confirme que o link corresponde à rota `/auth/confirm` e ao tipo de token esperado.

## 6. Teste local

```powershell
npm.cmd install
npm.cmd run dev
```

Abra `http://localhost:3000/admin/login`, solicite o link no e-mail administrativo e acesse o painel. Faça um cadastro de **teste** em `/admin/nichos`. Confira se o registro aparece no Table Editor do banco correto.

Se a API retornar erro de permissão, inspecione a tabela `admin_users`, as políticas RLS e as configurações Data API; **não desative RLS**.

## 7. Critérios para operação pública

O formulário `/entrar` ainda não deve receber tráfego público real. Antes do lançamento, implementar rate limiting persistente, proteção anti-bot, política de privacidade, descadastro e mecanismos de exclusão dos dados. O envio automatizado a grupos de WhatsApp permanece inativo até compatibilidade e permissões confirmadas.

## 8. Conexão do projeto ao ChatGPT (opcional)

Se quiser que eu execute e verifique migrações diretamente sem você copiar SQL: atualize a conexão Supabase em **Settings → Plugins** do ChatGPT, autorizando o projeto OfertaFlow. O estado atual da conexão só permite visualizar o BPF Manager. Não envie senhas nem chaves secretas por mensagens.
