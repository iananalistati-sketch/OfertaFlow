# OfertaFlow — ingestão automática por fontes autorizadas

Este módulo é uma **entrada de dados** para feeds/webhooks consentidos e parceiros. Ele **não monitora grupos do WhatsApp**, não acessa sessões, não cria links de afiliados nem envia mensagens.

## Preparação

1. Atualize o projeto com `git pull origin main` e inicie `npm.cmd run dev`.
2. Abra `/admin/origens` como administrador.
3. Cadastre uma origem do tipo **Webhook de parceiro autorizado**. Informe nome e nicho, se fizer sentido.
4. No cartão da origem, confirme que controla a fonte ou tem autorização expressa para receber seus eventos.
5. Clique em **Ativar webhook e gerar chave**. O servidor gera token aleatório `ofw_...`; no Supabase é salvo somente SHA-256 da chave. **Copie o token naquele momento**. Não aparece novamente.
6. Clique em **Enviar evento demonstrativo à API**. O frontend faz uma requisição ao backend da própria aplicação. Uma oferta marcada `is_test=true` será registrada em `captured_offers`, com `conversion_status=pending`.
7. Atualize `/admin/origens` e veja a oferta no histórico, sem envio de WhatsApp.

Para fonte externa real, configure um integrador autorizado para enviar um POST com JSON para:

```text
POST https://SEU-HOST-HTTPS/api/ingest/offers
Content-Type: application/json
Authorization: Bearer TOKEN_EXCLUSIVO_DA_ORIGEM
```

Payload suportado:

```json
{
  "event_id": "evento-12345",
  "message": "Canhão de Espuma WAP 1L\nDe: R$ 80 | Por: R$ 34 pix\nCupom: OFERTATEST\nhttps://meli.la/EXEMPLO",
  "image_url": "https://exemplo-autorizado.com.br/foto.jpg"
}
```

* `event_id` deve ser único por fonte. Repetições retornam `duplicate: true` e não criam outra oferta.
* `message` (texto) é interpretada pelo leitor; a mensagem bruta **não é salva**.
* `image_url` é opcional, HTTPS; **nenhuma imagem remota é baixada**. O uso da imagem depende de autorização.
* `test: true` é opcional e identifica teste. 
* Mensagens de texto de até 12.000 caracteres, JSON total de até 16 KiB. Há limite de 600 eventos/hora por origem.
* O status é sempre `pending`; não há publicação de ofertas sem verificação atual de preço, imagem, cupom e link afiliado próprio.
* A rota usa autenticação Bearer por origem e o servidor usa `SUPABASE_SECRET_KEY` somente no backend.
* **Rotacionar** substitui o token antigo. **Desativar** invalida a chave e impede novos eventos.

## Segurança e limitações

- Token de webhook NÃO é a Publishable Key nem a Secret Key do Supabase. Não compartilhe em mensagens, não envie por query string, não inclua no repositório nem em JavaScript público.
- Fora do localhost, use HTTPS com certificado válido e controle de logs para não registrar o header Authorization.
- Um webhook **não é coletor de mensagens**. Para começar a receber ofertas sem digitação, é necessário que um feed, aplicativo próprio ou parceiro autorizado emita eventos. Não obtenha acesso a grupos privados de terceiros por este endpoint.
- Links `meli.la` originais podem pertencer a outro afiliado. Nenhuma URL recebida é convertida automaticamente e nenhum link é enviado aos seus grupos.
- O módulo foi desenhado para aceitar um integrador de marketplace ou fonte consentida no futuro, independente da tecnologia de transporte.
