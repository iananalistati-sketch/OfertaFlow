# OfertaFlow — Plataforma de Afiliados v1.0

Primeira entrega executável com **Next.js 16 / TypeScript / Supabase**: landing page, painel administrativo, formulário de captação com múltiplos nichos, migração PostgreSQL com RLS, dados fictícios e adaptadores Shopee e AliExpress intencionalmente desativados.

## Executar localmente

1. Requer Node.js 20.9+ (recomendado Node 22) e npm.
2. Rode `npm install` e `npm run dev`.
3. Acesse `http://localhost:3000`, `/admin` e `/entrar`.
4. Sem Supabase, navegação e painel mostram **dados fictícios**, e o formulário não persiste dados pessoais.

## Habilitar Supabase

1. Crie um projeto no Supabase e execute o arquivo `supabase/migrations/20261016150000_initial_schema.sql` pelo SQL Editor. Não há projeto remoto configurado aqui.
2. Copie `.env.example` para `.env.local` e preencha `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (somente no servidor).
3. Habilite autenticação de e-mail no Supabase; configure `Site URL` e os URLs de redirecionamento `http://localhost:3000/auth/confirm` ou seu domínio de produção.
4. Crie um usuário administrador no Supabase Auth e adicione seu UUID à tabela `admin_users` pelo SQL Editor: `insert into public.admin_users(user_id) values ('UUID-DO-USUARIO');`.
5. Para cada nicho, opcionalmente crie um registro em `whatsapp_groups` com convite válido e `is_active=true`. A entrada ocorre **somente mediante clique no convite**.

## Segurança e restrições

- A migração habilita **RLS em todas as tabelas**. Nada é exposto para leitura anônima; dados de inscrição são gravados por endpoint de servidor com chave privilegiada exclusivamente server-side.
- **IMPORTANTE: antes de publicar o formulário de captação em produção, adicione rate limiting durável, CAPTCHA/Turnstile, política de privacidade, canal de exclusão de dados e mecanismo de gestão/revogação de consentimento.** O honeypot atual não é suficiente para proteção antiabuso em produção.
- O login por e-mail depende do fluxo de OTP/magic link do Supabase. Teste redirects, sessão e políticas de acesso antes do deploy.
- **Não há envio de mensagens automático** nem criação automática de grupos. O campo `auto_publish` é false e um CHECK exige `channel_verified=true` caso seja habilitado. Isso não substitui a checagem de permissão real do provedor.
- Adaptadores retornam erro explícito até obter aprovação formal da API Shopee/AliExpress e verificar credenciais/termos por país. Não existe scraping nem endpoints inventados.
- Produtos, métricas e preços do painel são **exemplos simulados**. Não existem anúncios reais neste pacote.
- Intervalos: Tecnologia 60 min; Games 60 min; Casa 60 min; Todas as Ofertas 30 min. Estes são parâmetros de banco, **não um job de envio habilitado**.

## Próximos incrementos

Painel CRUD real para nichos, grupos, ofertas e contas; sincronização de catálogo autorizada, verificação de ofertas, fila worker transacional com retry/idempotência, rastreamento de clique com privacidade, moderação e publicação por canal oficial compatível. Integração de grupos de WhatsApp depende de elegibilidade comprovada da API/provedor.

## Verificação

`npm run typecheck` / `npm run build`, após instalar dependências. Confira também segurança RLS no Supabase Database Advisors.
