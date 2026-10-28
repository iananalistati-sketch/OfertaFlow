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
- Intervalos: Tecnologia, Games, Casa e Todas as Ofertas: **5 min por nicho**. Estes são parâmetros de banco, **não um job de envio habilitado**.

## Próximos incrementos

Painel CRUD real para nichos, grupos, ofertas e contas; sincronização de catálogo autorizada, verificação de ofertas, fila worker transacional com retry/idempotência, rastreamento de clique com privacidade, moderação e publicação por canal oficial compatível. Integração de grupos de WhatsApp depende de elegibilidade comprovada da API/provedor.

## Verificação

`npm run typecheck` / `npm run build`, após instalar dependências. Confira também segurança RLS no Supabase Database Advisors.


## Interface administrativa e cadência (26/10/2026)

O painel agora utiliza **um único menu lateral navegável** em todas as telas privadas (no celular, menu horizontal rolável). Os botões redundantes da região central foram removidos. A visão geral consulta indicadores e intervalos reais do Supabase.

Todos os nichos existentes foram alterados para **5 minutos** e o limite mínimo do cadastro, do banco e do motor agora é 5 minutos. A cadência representa uma janela teórica de planejamento, **não uma rotina automática habilitada**. Nenhuma mensagem de WhatsApp é disparada apenas por essa configuração.

## Operação simplificada (26/10/2026)

O painel principal usa somente as seções **Visão geral, Integrações, Nichos e envios, Grupos WhatsApp, Divulgação pública e Segurança**. Os programas de afiliados, incluindo Shopee e AliExpress, compartilham a área de Integrações.

Em **Nichos e envios**:
- criar nichos e indicar palavras-chave de produtos relevantes;
- configurar a cadência (atualmente 5 min);
- ligar ou desligar a intenção de publicação automática individualmente por nicho, **sem aprovar oferta por oferta**.

O botão de intenção não libera disparos por si só. Sem API de afiliados, link comissionado válido, provedor de grupos autorizado e confirmação do canal, o envio continua tecnicamente bloqueado.

Em **Grupos WhatsApp**:
- criar cadastro local de convite (o grupo real é criado no próprio WhatsApp até haver integração elegível);
- informar capacidade, número de membros conhecido e marcar grupos lotados;
- acompanhar contagem de **aberturas de convites** e solicitações de expansão sem grupos disponíveis;
- após cadastrar novo grupo do mesmo nicho com convite ativo, novos visitantes usam o endereço estável correspondente, sem alterar o link publicado nas redes.

**Para divulgar:** a página pública `/entrar` agora mostra nichos atuais, permite várias escolhas e abre o WhatsApp pelo endereço interno `/g/[slug]`. Ela não exige nome nem telefone; o endpoint legado `/api/subscribe` não recolhe mais dados. **Apenas depois de hospedagem pública** esse endereço poderá ser divulgado nas redes — `localhost` funciona somente em seu computador.

**Métricas com significados diferentes:** cliques em convites NÃO são ingresso confirmado; mensagens marcadas como enviadas só contarão quando uma integração legítima enviar e registrar resultado; o número de membros é preenchido manualmente até que um provedor autorizado possa aferi-lo.

**Limite importante:** criação automática de grupo no WhatsApp e monitoramento de membros dependem de API elegível. Para grupos convencionais, não há uma integração oficial disponível que possamos presumir. A Meta disponibiliza uma Groups API de uso restrito, para contas elegíveis, com grupos pequenos; não confundir com grupos convencionais de ofertas. O sistema registra pendência de expansão, **não afirma criar um grupo real**.

O motor pontua relevância, condições verificadas, comissão elegível e vendas observadas de plataformas autorizadas; faltando dados de vendas/comissões, marca-os como desconhecidos. O acesso à API Shopee permanece pendente.

## Captação por fontes, inspirada no modelo operacional AfiliFlow (26/10/2026)

A direção estratégica mudou de pesquisa de produtos somente via catálogo para um pipeline composto por **origens autorizadas → reconhecimento da oferta → link próprio verificado → score por nicho → fila de envio compatível → métricas**. O objetivo é chegar à mesma proposta funcional, com código, identidade visual e conectores próprios.

**Já disponível:** em `/admin/origens`, registre grupos de origem como referências ou outras fontes permitidas (feed/webhook), escolha o nicho e consulte seu estado. A migração criou `offer_sources` e `captured_offers`, com RLS e bloqueios para ativação sem capacidade verificada. O motor `link-conversion.ts` reconhece links das lojas e só considera uma oferta elegível quando o link comissionado próprio, o preço, a imagem e o canal estiverem comprovados e atualizados. Testes em `npm run automation:test`.

**Não está conectado:** nenhum grupo de WhatsApp está sendo monitorado; o cadastro da referência não lê mensagens. Não há extensão Chrome de conversão de links, geração automática de meli.la, QR Code WhatsApp, monitoramento em tempo real, nem disparo por canal não autorizado.

O AfiliFlow declara usar extensão do Chrome para Mercado Livre/Amazon e QR Code para conexão WhatsApp. Isso **não comprova** que nossa conta possua essas permissões nem que devamos replicar técnicas de sessão sem autorização. Links do Mercado Livre em grupos privados também têm restrições próprias. Conectores só serão habilitados após aprovação técnica e de política.

Para atualizar e conferir:
```powershell
git pull origin main
npm.cmd run typecheck
npm.cmd run automation:test
npm.cmd run dev
```
Acesse `http://localhost:3000/admin/origens` após entrar como administrador.

## Ingestão de ofertas por webhook autorizado (28/10/2026)

Foi implementado um endpoint real e autenticado, `POST /api/ingest/offers`, para receber automaticamente anúncios de fontes autorizadas, sem cadastrar produto por produto. Cada origem tem token exclusivo rotacionável (hash SHA-256 no Supabase), limites de payload e volume, deduplicação por `event_id`, classificação de nichos e persistência como oferta não verificada. O webhook **não monitora WhatsApp por conta própria**.

No painel `/admin/origens`, cadastre uma fonte do tipo **Webhook de parceiro autorizado**, confirme controle/autorização, gere uma chave temporariamente visível e clique em **Enviar evento demonstrativo à API** para validar a entrada. Atualize a página e consulte os eventos. Nenhum link de terceiro é reutilizado para publicação e nenhum WhatsApp é enviado.

Guia de configuração, integração externa e regras de segurança: [Ingestão autorizada](docs/INGESTAO_AUTORIZADA.md).

Pendente para automação do objetivo final: emissor de eventos proveniente de fonte autorizada, integração aprovada para conversão de links afiliados, confirmação de informações comerciais e provedor de publicação elegível.
