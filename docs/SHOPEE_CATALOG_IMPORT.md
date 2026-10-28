# Catálogo Shopee — importação no OfertaFlow

## O que foi integrado (28/10/2026)

- Consulta real pela Affiliate Open API via `productOfferV2`, com App ID/Secret autorizados e assinatura SHA256 feita no servidor.
- Tela `/admin/shopee` consulta e exibe prévia dos produtos. O botão **Importar ofertas desta busca para o Supabase** faz uma **nova consulta autenticada no servidor**, sem confiar no preço transmitido pelo navegador.
- A importação grava `affiliate_products` usando chave única `(account_id, external_id)`. Reimportar o mesmo item atualiza o registro em vez de duplicá-lo.
- O importador classifica por palavras-chave configuradas nos nichos e associa produtos em `product_niches`.
- Comissão retornada pela API é normalizada para pontos percentuais (taxas fracionárias multiplicadas por 100). Não são criadas comissões, descontos, preço anterior nem cupons que a API não informe.
- Todos os produtos importados permanecem `status = draft`, sem campanhas e sem envios.
- Não há comunicação com WhatsApp e a conta de afiliado continua com o estado que já possuía.

## Como testar quando a Shopee autorizar sua conta

1. Na conta de afiliado Shopee, solicite/aprove a Open API: https://affiliate.shopee.com.br/open_api.
2. Adicione as credenciais ao `.env.local` da sua máquina (somente servidor):
   ```dotenv
   SHOPEE_AFFILIATE_APP_ID=SEU_APP_ID
   SHOPEE_AFFILIATE_SECRET=SEU_SECRET
   ```
3. Reinicie `npm.cmd run dev` e acesse `/admin/shopee` autenticado como administrador.
4. Pesquise por palavra-chave. Se a API retornar produtos válidos, clique em **Importar ofertas desta busca para o Supabase**.
5. Abra `/admin/automacao` para avaliar a classificação e o estado dos produtos. Produtos estarão em rascunho.
6. Repita a mesma importação para confirmar que o catálogo não é duplicado.

**Não compartilhe App Secret em chats, screenshots ou GitHub.** O app só testa a API real quando as credenciais forem liberadas; não possui acesso antecipado e não simula uma resposta da Shopee.

## Limitações atuais

- A importação é iniciada no painel; não é um agendador contínuo e não funciona enquanto o computador está desligado. A programação periódica fica para uma etapa posterior, com hospedagem/job autenticado.
- `productOfferV2` é consultado em uma página de até 10 itens por palavra-chave; paginação e busca automática dos nichos ainda serão evoluídas.
- O link `offerLink` recebido pela API é mantido; não estamos ainda realizando `generateShortLink`.
- Dados de preço e comissão podem variar; atribuição de vendas precisa ser confirmada com relatórios da API, e o uso dos canais de divulgação precisa ser permitido pelo programa.
- Não publica em grupos do WhatsApp sem conector oficialmente permitido.

Referência técnica: https://open-api.affiliate.shopee.co.id/explorer/v2
