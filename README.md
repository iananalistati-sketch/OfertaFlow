# OfertaFlow — Plataforma de Afiliados v1.0

Primeira entrega executável com **Next.js 16 / TypeScript / Supabase**: landing page, painel administrativo, formulário de captação com múltiplos nichos, migração PostgreSQL com RLS, dados fictícios e adaptadores Shopee e AliExpress intencionalmente desativados.

## Executar localmente

1. Requer Node.js 20.9+ (recomendado Node 22) e npm.
2. Rode `npm install` e `npm run dev`.
3. Acesse `http://localhost:3000`, `/admin` e `/entrar`.
4. Sem Supabase, navegação e painel mostram **dados fictícios**, e o formulário não persiste dados pessoais.

## Conectar ao Supabase OfertaFlow

O projeto Supabase fornecido para esta aplicação é `pbualjlqihfncjzuxnrt`, **independente** do BPF Manager. A estrutura SQL ainda deve ser aplicada ao projeto por um administrador autorizado.

Siga as instruções detalhadas em [Configuração do Supabase](docs/SUPABASE_SETUP.md). Resumo:

1. Atualize o repositório e copie `.env.example` para `.env.local` (sem sobrescrever configurações existentes).
2. Copie a Publishable key e a Secret key no Dashboard do projeto para suas variáveis locais. **Nunca envie a Secret key ao GitHub**.
3. Execute o arquivo `supabase/migrations/20261016150000_initial_schema.sql` uma única vez no SQL Editor do banco OfertaFlow.
4. Crie seu usuário no Supabase Authentication e vincule seu UID à tabela `admin_users`.
5. Configure os redirects do login, reinicie o Next.js e valide os cadastros pelo Table Editor.

## Reparação automatizada do banco

Para projetos parcialmente configurados (por exemplo, PGRST205 na tabela `niches`), há o comando `npm.cmd run setup:apply`. Ele executa a reparação SQL idempotente e a preparação do primeiro administrador **sem o usuário copiar comandos SQL**. Exige a URL de conexão PostgreSQL administrativa `OFERTAFLOW_DATABASE_URL` e o e-mail `OFERTAFLOW_ADMIN_EMAIL` no arquivo local `.env.local`. Veja [o passo a passo](docs/SUPABASE_SETUP.md). **Não publique a URL do banco nem a senha**. O comando não foi executado remotamente enquanto a conexão Supabase do ChatGPT está indisponível.

## Situação atual do ambiente OfertaFlow (22/10/2026)

A conexão Supabase **OfertaFlow** foi autorizada no ChatGPT e as tabelas iniciais já foram criadas remotamente no projeto `pbualjlqihfncjzuxnrt`. O schema tem 12 tabelas com RLS, 4 nichos e campos adicionais de promoções. **Não é necessário executar `setup:apply` para esse projeto** — a rotina continua como ferramenta de recuperação, não como próximo passo.

Para atualizar e verificar:

```powershell
git pull origin main
npm.cmd run setup:check
npm.cmd run dev
```

`setup:check` confirma agora que o `.env.local` aponta ao projeto correto. A pendência de `admin_users` será resolvida quando o e-mail autorizado fizer o primeiro login em `/admin/login` e **confirmar o link de acesso**. O Supabase pode criar a conta Auth automaticamente nesse fluxo (se cadastros estiverem habilitados); o gatilho já instalado concederá a permissão após a confirmação. Não é preciso adicionar IDs de usuário nem executar SQL. Para os templates de links que retornam `#access_token`, a rota `/auth/finish` completa a sessão no navegador.

A tela `/admin/mensagens` permite visualizar o novo **anúncio estilo WhatsApp** com foto, oferta, Pix, parcelamento, cupom verificado e link de afiliado. Na ausência de produtos realmente verificados, mostra somente exemplo bloqueado. O botão de compartilhar prepara o texto manualmente — **não envia foto, não posta em grupo nem atribui comissão automaticamente**.

Se você havia inserido `OFERTAFLOW_DATABASE_URL` no `.env.local` apenas para o bootstrap, pode removê-la: esse segredo não é necessário no funcionamento cotidiano do aplicativo.

## Solução sem e-mail — configurar senha pelo terminal

Se o e-mail de acesso ou recuperação **não chegar** devido a restrições do SMTP do Supabase, use a operação local segura:

```powershell
git pull origin main
npm.cmd run admin:set-password
```

O comando:
- verifica a URL do projeto `pbualjlqihfncjzuxnrt`, a `SUPABASE_SECRET_KEY` e a existência de **exatamente um administrador já cadastrado e confirmado**;
- solicita a senha **duas vezes** no terminal com caracteres ocultos (12–128 caracteres);
- altera somente a senha desse administrador pelo endpoint oficial `auth.admin.updateUserById`;
- quando a chave pública também estiver configurada, testa login com e-mail e senha e não mantém sessão no script.

**Não é necessário `OFERTAFLOW_DATABASE_URL`, copiar SQL, cadastrar novo administrador, nem compartilhar senha com o ChatGPT.** Nunca guarde sua senha em `.env.local`, argumentos de terminal, mensagens ou GitHub. Esta rotina depende de uma chave administrativa que deve existir **somente na máquina confiável do administrador**. Caso a Secret key esteja ausente ou inválida, o script interrompe sem modificar usuários.

Quando concluído, acesse `http://localhost:3000/admin/login` e entre com e-mail e a nova senha. Para o funcionamento futuro da recuperação por e-mail, configurar SMTP próprio em Supabase Authentication → SMTP Settings.

## Acesso administrativo com e-mail e senha (26/10/2026)

A conta administrativa já foi criada, confirmada e autorizada no Supabase. Não é necessário novo cadastro nem edição manual da tabela `admin_users`.

1. Execute `git pull origin main` e reinicie `npm.cmd run dev`.
2. Em `http://localhost:3000/admin/login`, escolha **Primeiro acesso ou esqueci a senha** e solicite um link de acesso no endereço administrativo autorizado.
3. Abra o link no e-mail para iniciar a sessão. Em seguida, no painel, clique em **Segurança da conta** (`/admin/seguranca`).
4. Defina uma senha exclusiva de pelo menos 12 caracteres.
5. Os próximos logins funcionam com e-mail e senha. Caso esqueça a senha, use o link de e-mail novamente.

A aplicação usa o Supabase Auth; senhas não são salvas nas tabelas do OfertaFlow. A rota de login por senha valida também a presença do usuário em `admin_users`. A rota de Magic Link foi ajustada para **não criar novos usuários** automaticamente.

**O formulário de captação pública, os disparos de WhatsApp e as integrações de afiliados reais continuam inativos ou experimentais.** Não enviar dados reais de consumidores antes das proteções antiabuso e LGPD.

## Shopee Open API: próxima etapa (26/10/2026)

A interface `/admin/shopee` contém um teste real de consulta de produtos. O backend usa `productOfferV2` com autenticação GraphQL SHA256, **somente se a conta tiver acesso aprovado e credenciais válidas**.

1. Acesse a área `https://affiliate.shopee.com.br/open_api` com sua conta de afiliado.
2. Se App ID e Secret estiverem liberados, adicione **somente** ao arquivo local `.env.local`:
   ```dotenv
   SHOPEE_AFFILIATE_APP_ID=COLE_SEU_ID
   SHOPEE_AFFILIATE_SECRET=COLE_SEU_SECRET_DA_API
   ```
3. Reinicie o Next.js (`npm.cmd run dev`) e acesse `http://localhost:3000/admin/shopee` após login administrativo.
4. Clique em **Buscar produtos via API**, informando uma palavra-chave. A página retorna uma amostra real de até oito ofertas sem salvá-las.
5. Se a API retornar erro de permissão `10035`, solicite a liberação da Open API à Shopee. Erro `10020` indica assinatura ou credenciais inválidas; `10030` indica limite de chamadas.

**Cuidados:** a tela não grava ofertas no Supabase, não confirma atribuições/vendas, não cria links de afiliado novos e não envia WhatsApp. A operação só utiliza links `offerLink` que a API devolveu. A estrutura do endpoint foi consultada em documentação técnica **não oficial**, portanto pode requerer ajustes após teste da conta autorizada. Não envie as credenciais no chat, em imagens ou GitHub. A próxima entrega será persistência idempotente e classificação após a primeira consulta bem-sucedida.

## Motor de automação demonstrável (26/10/2026)

A autorização para a **Shopee Affiliate Open API está pendente de análise**. Enquanto isso, a rota administrativa `/admin/automacao` já executa o motor de oportunidades em **dry-run**:

- classificação automática por múltiplos nichos, incluindo Todas as Ofertas;
- deduplicação por plataforma e identificador externo;
- pontuação explicável de qualidade das ofertas, sem estimar conversões/comissões inexistentes;
- bloqueios de preço não validado, imagem/link comissionado ausentes, dados expirados ou itens fictícios;
- próxima janela teórica baseada no intervalo gravado na tabela `niches`.

Se não houver ofertas importadas, usa exemplos **explicitamente simulados**; não os confunda com produtos reais. O resultado não persiste filas, não posta no WhatsApp e não faz scraping.

Para atualizar e verificar no VS Code:

```powershell
git pull origin main
npm.cmd run typecheck
npm.cmd run automation:test
npm.cmd run dev
```

Abra `http://localhost:3000/admin/automacao` após o login. O GitHub Actions também valida tipos e testes do motor no branch principal sem usar segredos Supabase/Shopee.

A próxima etapa após a liberação da Open API é consulta real, normalização com dados de comissão elegíveis, importação idempotente, revisão de links, fila transacional e publicação **apenas** por provedor de mensagens autorizado.

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
