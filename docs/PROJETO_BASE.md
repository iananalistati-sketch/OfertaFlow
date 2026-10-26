# OfertaFlow — Documento Base do Projeto

**Versão da referência:** 1.0 — 16/10/2026  
**Status:** escopo funcional aprovado; implementação parcial e experimental.  
**Objetivo central:** maximizar **comissões líquidas** por meio da descoberta, seleção e distribuição de produtos afiliados elegíveis, sem exigir cadastro manual de cada produto.

## 1. Princípios imutáveis

1. **Automação primeiro.** Conectar contas autorizadas, buscar ofertas elegíveis, obter links comissionados próprios, classificar, priorizar, preparar anúncio e distribuir.
2. **Lucro, não volume.** Otimizar ofertas considerando comissão elegível, conversão, relevância, qualidade, custos e restrições. Não prometer lucro nem comissões sem atribuição confirmada.
3. **Interface mínima.** Página pública simples para seleção de múltiplos nichos e acesso voluntário aos convites do WhatsApp. Administração pode começar com painel técnico enxuto; nada de construir um marketplace público.
4. **Um motor, múltiplos provedores.** Adaptadores isolados para afiliados, IA e canais de publicação.
5. **Links afiliados verificáveis.** Nenhum link comum deve ser tratado como comissionado; atribuição e permissão por canal dependem dos termos de cada programa.
6. **Respeito às regras.** Somente APIs, feeds e métodos autorizados; observar limites, retenção de dados, marca e uso de imagens/preços. Sem scraping não autorizado ou automação de WhatsApp Web como requisito central.
7. **WhatsApp seguro.** Convites voluntários para grupos; não adicionar pessoas automaticamente. Envio automático **bloqueado por padrão**, liberado só após prova técnica e contratual de compatibilidade do canal/provedor e das plataformas.
8. **Proteção de dados.** Consentimento explícito e específico, política de privacidade, revogação/descadastro, minimização e segurança de dados.
9. **Rastreabilidade.** Toda oferta, classificação, link, decisão e tentativa de envio deve ter origem, data, estado e histórico.
10. **Banco e segurança.** Supabase/PostgreSQL com RLS, autorização administrativa no servidor, credenciais de provedores armazenadas apenas em segredo no backend, jamais no cliente ou GitHub.

## 2. Fluxo de negócio obrigatório

Contas de afiliados habilitadas → API/feed permitido → produtos elegíveis → normalização e deduplicação → dados e link comissionado da conta validado → classificação por 0..N nichos → estimativa/priorização por oportunidade → copy curta com informações verificadas → filas de destinos → publicação somente nos canais compatíveis, autorizados e no horário → cliques e conversões quando disponíveis → relatórios de comissões e lucro líquido estimado/real.

Quando não houver credenciais, elegibilidade, API, link ou canal, apresentar **pendência**, nunca simular que publicou ou gerou comissão.

## 3. Experiência pública

- Página inicial: explicação breve, campos mínimos necessários, seleção de um ou vários nichos, incluindo **Todas as Ofertas**.
- Consentimento explícito para o propósito aplicável; cada grupo é ingressado **via convite** pelo próprio visitante.
- Grupos disponibilizados apenas quando ativos, com links de convite válidos.
- Implementar mecanismo de cancelamento e política de privacidade antes da operação pública.
- Nunca prometer adicionar automaticamente ao WhatsApp ou conhecer com certeza quem entrou no grupo apenas porque recebeu o convite.

## 4. Nichos e agendamentos iniciais

| Nicho | Cadência inicial |
|---|---:|
| Tecnologia | 60 minutos |
| Games | 60 minutos |
| Casa | 60 minutos |
| Todas as Ofertas | 30 minutos |

Esses são limites configuráveis de tentativas por destino, **não cotas obrigatórias**. Considerar janelas de horário, disponibilidade, qualidade, duplicidade e políticas do canal. Uma oferta pode ser classificada em vários nichos, mas não repetida indevidamente no mesmo destino. O grupo geral agrega elegíveis de todos os nichos.

## 5. Integrações e requisitos

- **Shopee / AliExpress:** adaptadores preparados; somente ativar chamadas reais quando a conta tiver permissão, credenciais e endpoints oficiais verificados. Não presumir autorização de API ou acesso a comissões.
- **Outras plataformas:** acrescentar somente por adaptadores, mantendo a mesma interface normalizada.
- **Publicação WhatsApp:** abstração de destino com estados 'não verificado', 'convite apenas', 'habilitado'; a disponibilidade de publicação em grupos convencionais não é pressuposta.
- **IA:** classificação multicategoria e copy atraente, mas sem inventar preço, desconto, frete, estoque, avaliações ou comissão. Regras determinísticas devem funcionar como fallback; ambiguidades podem ir à revisão.
- **Workers:** execução periódica separada do Next.js, com rate limiting por plataforma, idempotência, backoff, observabilidade, tratamento de falhas e auditoria.

## 5.1. Modelo de anúncio no WhatsApp — referência visual 22/10/2026

Formato obrigatório de anúncio: **foto real do produto** acima de legenda curta com chamada chamativa; nome, preço anterior quando comprovado, preço promocional e no Pix quando aplicável, condições de parcelamento verificadas, cupom válido quando confirmado, link de afiliado da conta e indicação de publicidade/afiliado. Nicho e plataforma influenciam o texto; o template não pode inventar urgência, preço, frete, estoque, desconto, cupom ou comissão.

Implementação atual: estúdio em `/admin/mensagens` com prévia semelhante ao WhatsApp; campos adicionais `affiliate_products.original_price`, `pix_price`, `installment_total`, `installment_count`, `coupon_code`, `coupon_verified_at` e `offer_expires_at`. Anúncios não verificados exibem apenas demonstração e ficam bloqueados. `offer_verified_at` deve ter atualização recente (24h) para liberar compartilhamento manual. Cupom sem confirmação recente fica oculto.

**Distinção explícita:** abrir `wa.me/?text=...` apenas compartilha o **texto** manualmente, não envia a foto. Publicação automática de foto+legenda, sobretudo em grupos comuns, depende de canal aprovado e elegibilidade confirmada; não está ativa. Alternativa de distribuição futura: mensagens de marketing individuais apenas para contatos opt-in, usando templates aprovados da plataforma oficial e respeitando custos, limites e descadastro.

## 5.2. Validação de acesso Shopee Open API — primeiro teste real

Antes de persistir ofertas, o painel `/admin/shopee` disponibiliza consulta **sob demanda** de até 10 produtos via servidor, com autenticação assinada usando `SHOPEE_AFFILIATE_APP_ID` e `SHOPEE_AFFILIATE_SECRET` no ambiente local. O backend não revela chaves, não grava na tabela `affiliate_products` e não cria filas nem envia mensagens. Exibe dados e links retornados pela API **somente quando a API estiver aprovada**. Falhas de permissão, assinatura, schema e rate limit aparecem como diagnóstico controlado.

O modelo de assinatura/consulta está fundamentado em documentação técnica pública de terceiros e depende de validação com a documentação oficial e com as credenciais da própria conta. Não confundir o portal Shopee para afiliados com o programa Open Platform para vendedores.

Sequência: liberar API Shopee → configurar segredo apenas em `.env.local` → consultar amostra real → validar link e condições/termos → implementar persistência idempotente, classificação, checagem de expiração, fila e publicação em canal autorizado.

## 5.3. Motor de oportunidades e planejamento sem envios (26/10/2026)

Enquanto a conta Shopee aguarda a liberação da Open API, implementamos uma camada funcional e independente de provedores em `src/lib/automation/opportunity-engine.ts`, exibida na tela `/admin/automacao`:

- **Deduplicação:** chave `provedor:ID_externo`; preserva o cadastro mais validado/recente, sem agrupar produtos semelhantes de lojas diferentes.
- **Multinicho:** detecção por regras normalizadas com acentos, permitindo Tecnologia + Games para o mesmo produto; agregador Todas as Ofertas recebe todos os candidatos.
- **Score explicável de 0 a 100:** relevância textual (até 30), qualidade dos dados (20), validação recente (20), desconto comprovado (15) e bonificação somente para taxa de comissão fornecida e atualizada (15). É uma **heurística técnica de qualidade**, não probabilidade de compra nem rendimento garantido.
- **Bloqueios:** itens fictícios, origem manual sem verificação, status rascunho/expirado, imagens ou links HTTPS ausentes, preço nulo e verificação vencida ficam indisponíveis para envio.
- **Janelas:** calcula o próximo horário teórico de cada nicho ativo conforme `interval_minutes` do Supabase; mostra somente o melhor candidato de cada destino. Não persiste `publication_queue` nem altera grupos.
- **Dados:** lê até 200 produtos do banco administrativo; quando vazio, utiliza quatro exemplos explicitamente marcados, com uma duplicata deliberada para validação, sem URLs comissionadas.
- **Testes:** `npm run automation:test` verifica classificação, duplicação, bloqueio e cadência. O CI também roda `npm run typecheck` e `npm run automation:test` sem credenciais reais.

**Limitação expressa:** score e plano são apenas simulações. Não há fonte Shopee habilitada, worker cron, scoring com resultados reais de comissão ou publicação automatizada. A criação de filas persistentes, auditoria e entrega só ocorrerá depois da validação de provedor e canal autorizado. Não confundir janelas hipotéticas com mensagens programadas.

## 6. Arquitetura mínima

- **Next.js + TypeScript:** landing page, páginas técnicas e APIs autenticadas.
- **Supabase PostgreSQL:** contas e estado de integrações, produtos normalizados, nichos, grupos/convites, participantes/consentimentos, ofertas, filas, tentativas de publicação, cliques e comissões se disponibilizadas.
- **Workers/cron:** sincronização, enriquecimento, classificação, seleção e enfileiramento.
- **Adaptadores:** AffiliateProvider, Classifier, CopyGenerator e Publisher, cada um com interface testável e implementações mock/disabled/live.
- **Segredos:** variáveis de ambiente / cofre; nunca chave administrativa no navegador.
- **Testes:** fluxos de integração simulados, bloqueio de publicação, idempotência, atualização de preços, multi-nicho, consentimento e falhas.

## 7. Priorização e métricas

A seleção não deve ser apenas por desconto. Usar **score explicável** por relevância de nicho, comissão elegível/estimada (se disponível), probabilidade de conversão estimada, validade, preço competitivo e qualidade da oferta. Sem dados de comissão, exibir 'desconhecida'.

Métricas: ofertas elegíveis, links validados, ofertas encaminhadas, cliques rastreados, conversões atribuídas (se fornecidas), comissão pendente/aprovada/recebida (se fornecida), custos de infraestrutura/APIs e resultado líquido. **Cliques não são vendas**, e comissão projetada não é recebida.

## 8. Fora do escopo do produto principal

- Cadastro manual de produtos como rotina diária.
- Loja virtual/carrinho próprio ou processamento de pagamento dos produtos.
- Inclusão forçada de participantes em grupos.
- Envio massivo fora das regras das plataformas.
- Inventar produtos, preços, promoções, links ou comissões.
- Tornar o dashboard o centro da experiência; painel administrativo pode ser enxuto.

## 9. Marcos de construção

**M0 — Fundação:** versão de referência, testes e conexão Supabase com segurança.  
**M1 — Captação:** página pública de nichos, convites e consentimento; gestão mínima de grupos.  
**M2 — Descoberta:** conector inicial autorizado, listagem paginada, normalização, deduplicação, links afiliados e metadados verificáveis.  
**M3 — Inteligência comercial:** categorização multicategoria, score de oportunidade, copy segura e controle de repetição.  
**M4 — Filas:** planejamento de publicações por nicho, cadência e relatórios; simulação completa.  
**M5 — Distribuição:** liberar apenas publicadores tecnicamente/contratualmente autorizados e registrar comprovantes de envio.  
**M6 — Otimização:** acompanhar cliques, atribuições, comissão e custos; melhorar seleção.

## 10. Critérios de aceite obrigatórios

1. Ao conectar provedor autorizado, o sistema descobre produtos sem cadastro manual.
2. Um produto só entra na fila publicável com link afiliado válido, informações atualizadas e canal permitido.
3. Produto multi-nicho alcança cada destino apropriado; 'Todas as Ofertas' funciona independentemente.
4. Cadências iniciais são respeitadas sem forçar envio quando a fila está vazia.
5. Sem API ou canal válido, a interface evidencia bloqueio, com testes/simulação possíveis.
6. A página pública encaminha a convites voluntários e guarda consentimento quando aplicável.
7. Segredos não vazam pelo frontend; dados administrativos protegidos por RLS e autorização.
8. Métricas distinguem cliques, pedidos, comissões projetadas, aprovadas e recebidas.

## 11. Regra para futuras alterações de código

Antes de modificar funcionalidades, verificar alinhamento com este documento. Mudanças de escopo relevantes devem primeiro atualizar este arquivo no GitHub com motivação e efeitos sobre negócio, segurança e integrações. Priorizar entregas funcionais, testes e commits pequenos. A existência de páginas antigas de cadastro manual **não altera** o objetivo central automatizado.
