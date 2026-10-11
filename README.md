# E-commerce white-label

Loja virtual em que o dono personaliza tudo pelo painel `/admin` (nome, logo, cores, contatos,
frete, banners, produtos, variações, promoções) e recebe os pagamentos pelo Mercado Pago.

| Pasta       | Tecnologia                                                   | Porta padrão |
| ----------- | ------------------------------------------------------------ | ------------ |
| `backend/`  | Laravel 8, API REST, autenticação JWT (`tymon/jwt-auth`)      | 8000         |
| `frontend/` | React 18 + Vite + TypeScript + React Query + React Bootstrap | 5173         |

## Requisitos

- PHP 8.0+ com as extensões `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `gd` e `curl`
  (o XAMPP já traz; confira em `php -m`)
- Composer 2
- MySQL ou MariaDB (o do XAMPP serve)
- Node.js 18+ e npm

## Instalação passo a passo

### 1. Banco de dados

Crie dois bancos vazios (no phpMyAdmin ou pelo terminal):

```sql
CREATE DATABASE ecommerce      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE ecommerce_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; -- só para os testes
```

### 2. Backend

```bash
cd backend
composer install
cp .env.example .env          # no Windows (cmd): copy .env.example .env
php artisan key:generate      # APP_KEY: obrigatório (criptografa o token do Mercado Pago)
php artisan jwt:secret        # JWT_SECRET: assina os tokens de login
```

Edite o `backend/.env` (veja a tabela [Variáveis do backend](#variáveis-do-backend)) e depois:

```bash
php artisan migrate           # cria as tabelas
php artisan db:seed           # cria o usuário admin e o cliente de teste
php artisan storage:link      # publica as fotos enviadas em /storage
php artisan serve             # http://localhost:8000
```

### 3. Frontend

Crie `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000/api
# Opcional: só se as imagens forem servidas de outro endereço
# VITE_STORAGE_URL=http://localhost:8000/storage
```

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

Acesse http://localhost:5173 e entre com um dos usuários abaixo.

## Usuários do seed

O `php artisan db:seed` pode ser rodado quantas vezes quiser. Se o e-mail já existir, ele **não
duplica**: atualiza o nome e o papel e redefine a senha para a do `.env`.

| Tipo                 | E-mail             | Senha       | Acesso                                     |
| -------------------- | ------------------ | ----------- | ------------------------------------------ |
| Master (dono/admin)  | `admin@loja.com`   | `Senha1234` | Painel `/admin` e loja                     |
| Cliente comum        | `cliente@loja.com` | `Senha1234` | Loja, carrinho, pedidos, favoritos         |

Para trocar os dados, use as variáveis `SEED_ADMIN_*` e `SEED_CLIENTE_*` no `.env`. Em
`APP_ENV=production` o seed se recusa a rodar com a senha padrão: defina
`SEED_ADMIN_PASSWORD` e `SEED_CLIENTE_PASSWORD` antes.

Comandos úteis:

```bash
php artisan db:seed --class=UsuariosSeeder   # só os usuários
php artisan migrate:fresh --seed             # APAGA o banco inteiro, recria e popula
```

Outras regras de acesso:

- Pelo cadastro do site, o **primeiro usuário** de uma instalação vazia vira admin; os demais
  são sempre clientes (não dá para se cadastrar como admin pela API).
- O admin promove ou rebaixa outros usuários em Painel → Clientes.

## Variáveis do backend

| Variável                     | Exemplo / padrão              | Para que serve                                                                              |
| ---------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| `APP_KEY`                    | gerado pelo `key:generate`    | Criptografia. **Não troque depois de configurar o Mercado Pago** (o token salvo se perde).  |
| `APP_URL`                    | `http://localhost:8000`       | Endereço público da API. Usado para montar a URL do webhook e os links das imagens.         |
| `APP_TIMEZONE`               | `America/Sao_Paulo`           | Fuso das datas dos pedidos e do dashboard.                                                   |
| `DB_*`                       | `ecommerce`, `root`, vazio    | Conexão com o MySQL.                                                                         |
| `JWT_SECRET`                 | gerado pelo `jwt:secret`      | Assinatura dos tokens de login.                                                              |
| `JWT_TTL`                    | `1440`                        | Validade do login em minutos (1440 = 24 h). O padrão do pacote é 60.                        |
| `FRONTEND_URL`               | `http://localhost:5173`       | Para onde o Mercado Pago devolve o cliente após pagar.                                       |
| `CORS_ALLOWED_ORIGINS`       | `http://localhost:5173`       | Endereços do front que podem chamar a API (separe vários por vírgula).                      |
| `MERCADOPAGO_ACCESS_TOKEN`   | vazio                         | Opcional. O ideal é o dono informar pelo painel; o valor do painel tem prioridade.          |
| `MERCADOPAGO_WEBHOOK_SECRET` | vazio                         | Opcional, idem. Valida a assinatura das notificações.                                       |
| `SEED_ADMIN_*`, `SEED_CLIENTE_*` | ver `.env.example`        | Nome, e-mail e senha dos usuários criados pelo seed.                                         |
| `MAIL_MAILER`                | `log` (dev) / `smtp` (produção) | Como os e-mails saem. `log` grava em `storage/logs/laravel.log`, sem enviar de verdade.   |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION` | dados do provedor | Servidor SMTP (veja [E-mails](#e-mails)).                                 |
| `MAIL_FROM_ADDRESS`          | vazio                         | Remetente. Vazio = e-mail da loja (Configurações) ou `nao-responda@{domínio}`.              |

Depois de alterar o `.env`, rode `php artisan config:clear`.

## Personalizando a loja (dono)

Tudo pelo painel, sem mexer em código:

- **Configurações da loja**: nome, slogan, logo, cor principal (topo/rodapé) e cor de destaque
  (botões), contatos, WhatsApp, redes sociais, texto do rodapé, frete e Mercado Pago.
- **Produtos**: fotos, descrição, categoria, preço, estoque, desconto em % com data de validade,
  "visível na loja" e "destaque" na home.
- **Variações**: combinações de cor e tamanho, cada uma com estoque e, se quiser, preço próprio.
  Cadastre antes as cores em **Cores**.
- **Banners**: imagens do carrossel da home (recomendado 1600 × 500 px), com link opcional.
- **Pedidos**: status (pago, em separação, enviado, entregue, cancelado) e código de rastreio.
  Marcar como pago baixa o estoque; cancelar devolve.
- **Cupons**: código, desconto em % ou R$, pedido mínimo, validade e limite de usos. O desconto vale
  sobre os produtos (não sobre o frete). Cancelar um pedido devolve o uso do cupom.

## Frete

Em Painel → Configurações da loja → Frete, escolha o modo:

- **Valor fixo por pedido**: um valor único (0 = grátis).
- **Por CEP, com Melhor Envio**: o cliente digita o CEP no checkout e escolhe entre as opções das
  transportadoras (Correios, Jadlog, Loggi...) com preço e prazo. O preço é recalculado no servidor
  ao fechar o pedido.

Nos dois modos vale o **frete grátis acima de R$ X** (opcional; considera o desconto do cupom).

Para usar o Melhor Envio:

1. Crie uma conta em https://melhorenvio.com.br (para testes: https://sandbox.melhorenvio.com.br).
2. Em *Configurações → Permissões de acesso → Tokens*, gere um token com a permissão
   `shipping-calculate` e cole no painel. Marque "ambiente de teste" se o token for do sandbox.
3. Informe o **CEP de onde você envia** e, se quiser, os dias para postar (somados ao prazo).
4. Cadastre **peso e medidas** em cada produto (card "Envio"). Produtos sem medidas usam o pacote
   padrão do painel (0,3 kg, 10 × 15 × 20 cm).

Sem token ou sem CEP de origem, a loja continua usando o valor fixo automaticamente. O sistema só
**cota** o frete: a etiqueta continua sendo comprada no site do Melhor Envio.

## E-mails

Enviados automaticamente:

| Quando                        | Para o cliente                         | Para a loja (e-mail das Configurações) |
| ----------------------------- | -------------------------------------- | -------------------------------------- |
| Pedido criado                 | "Recebemos seu pedido", com os itens   | "Novo pedido"                          |
| Pagamento confirmado          | "Pagamento confirmado"                 | "Venda paga"                           |
| Status "enviado"              | "Pedido enviado" + código de rastreio  | —                                      |
| Status "entregue"/"cancelado" | Aviso do status                        | —                                      |
| "Esqueci minha senha"         | Link para criar nova senha (60 min)    | —                                      |

Em desenvolvimento, com `MAIL_MAILER=log`, os e-mails vão para `backend/storage/logs/laravel.log`
(procure por `redefinir-senha?token=` para testar a recuperação de senha). Se o servidor de e-mail
falhar, a compra **não** é interrompida: o erro só fica registrado no log.

Em produção, configure um SMTP no `.env`:

```env
# Gmail (crie uma "senha de app" em https://myaccount.google.com/apppasswords)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=sualoja@gmail.com
MAIL_PASSWORD=senha-de-app
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=sualoja@gmail.com

# Brevo, Resend, Mailgun, Hostinger etc.: use host/porta/usuário/senha SMTP do painel deles
```

Depois rode `php artisan config:clear`.

## Pagamentos (Mercado Pago Checkout Pro)

### Configuração

1. Crie uma aplicação em https://www.mercadopago.com.br/developers/panel/app (produto
   **Checkout Pro**).
2. Copie o **Access Token** (`APP_USR-...`) e cole em Painel → Configurações da loja. Ele é
   guardado criptografado e nunca é exibido de novo.
   - Para testar sem dinheiro real, use as **credenciais de teste** e as
     [contas/cartões de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/your-integrations/test/cards)
     do Mercado Pago.
3. Em **Webhooks** na aplicação do Mercado Pago, cadastre a URL exibida no painel
   (`{APP_URL}/api/pagamentos/webhook`) com o evento **Pagamentos**. Copie a assinatura
   secreta e cole no painel (opcional, mas recomendado).

### Fluxo

1. O cliente finaliza a compra: o backend cria o pedido, recalcula preços e estoque no servidor e
   pede ao Mercado Pago um link de pagamento.
2. O cliente paga com Pix, cartão ou boleto no ambiente do Mercado Pago. O dinheiro cai na conta
   dona do Access Token.
3. O Mercado Pago chama o webhook e/ou devolve o cliente para `/pagamento/retorno`. Nos dois
   casos o backend **consulta o pagamento na API do Mercado Pago** antes de marcar o pedido como
   pago e baixar o estoque (nunca confia no que vem do navegador).
4. Sem token configurado, o pedido fica "Aguardando pagamento" e o dono confirma manualmente.

### Localhost x produção

O Mercado Pago só envia webhooks para endereços **HTTPS públicos**. Em localhost a confirmação
acontece quando o cliente volta para a loja. Para testar o webhook localmente use um túnel:

```bash
ngrok http 8000
# coloque a URL https gerada em APP_URL, rode php artisan config:clear
# e cadastre {URL}/api/pagamentos/webhook no Mercado Pago
```

## Testes

```bash
cd backend && php vendor/bin/phpunit       # usa o banco ecommerce_test (definido no phpunit.xml)
cd frontend && npm run lint && npm run build
```

Os testes do backend apagam e recriam o `ecommerce_test` a cada execução; o banco de
desenvolvimento não é tocado. As chamadas ao Mercado Pago são simuladas.

## Colocando em produção

- **Backend**
  - `APP_ENV=production`, `APP_DEBUG=false`, `APP_URL=https://api.seudominio.com`
  - `FRONTEND_URL` e `CORS_ALLOWED_ORIGINS` com o domínio do front
  - `composer install --no-dev --optimize-autoloader`
  - `php artisan migrate --force`, `php artisan storage:link`, `php artisan config:cache`
  - A pasta pública do servidor web deve apontar para `backend/public`
  - `storage/` e `bootstrap/cache/` precisam ter permissão de escrita
- **Frontend**
  - `frontend/.env` com `VITE_API_URL=https://api.seudominio.com/api`, depois `npm run build`
  - Publique a pasta `frontend/dist`
  - Configure o servidor para devolver `index.html` em qualquer rota (SPA), senão abrir
    `/produto/1` direto dá 404
- **Seed**: `php artisan db:seed --force` com `SEED_ADMIN_PASSWORD` forte definido (ou cadastre
  o dono pelo site como primeiro usuário).

## Problemas comuns

| Sintoma                                                       | Solução                                                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Fotos, banners ou logo aparecem quebrados                     | `php artisan storage:link` e confira se `APP_URL`/`VITE_API_URL` apontam para a porta certa. |
| `No application encryption key has been specified`            | `php artisan key:generate` e `php artisan config:clear`.                                     |
| Erro de CORS no navegador                                     | Inclua a URL do front em `CORS_ALLOWED_ORIGINS` e rode `php artisan config:clear`.           |
| Login cai sozinho depois de 1 hora                            | Aumente `JWT_TTL` no `.env`.                                                                 |
| Mudei algo no `.env` e nada aconteceu                         | `php artisan config:clear` e reinicie o `php artisan serve`.                                 |
| Configurações da loja antigas continuam aparecendo            | `php artisan cache:clear`.                                                                   |
| Pagamento aprovado mas pedido continua "Aguardando"           | Em localhost, o cliente precisa voltar para a loja; em produção, confira o webhook.          |
| "Pagamento online ainda não configurado"                      | Cole o Access Token em Painel → Configurações da loja.                                       |
| E-mail não chega                                              | Em dev, veja `storage/logs/laravel.log` (`MAIL_MAILER=log`). Em produção, confira o SMTP e o spam. |
| Frete por CEP não aparece no checkout                         | Confira token, CEP de origem e a opção "ambiente de teste". Os erros ficam no `laravel.log`. |
| Upload de foto falha                                          | Limite de 4 MB por imagem; confira `upload_max_filesize` e `post_max_size` no `php.ini`.     |

## Estrutura

```
backend/
  app/Http/Controllers/    Endpoints da API (loja, carrinho, pedidos, painel)
  app/Http/Middleware/     AdminMiddleware: protege as rotas /api/admin/*
  app/Models/              Produto, Modelo (variação), Pedido, Configuracao...
  app/Services/            PedidoService (estoque, frete, status), MercadoPagoService
  database/seeders/        UsuariosSeeder (admin + cliente)
  routes/api.php           Todas as rotas (públicas, cliente, admin)
  tests/Feature/           Testes de ponta a ponta da API
frontend/src/
  pages/                   Telas da loja (home, produto, carrinho, checkout, pedidos...)
  admin/                   Telas do painel
  components/              Navbar, rodapé, card de produto, tema da loja...
  hooks/                   useLoja.ts e useAdmin.ts (React Query), AuthContext
  lib/                     Cliente HTTP (api.ts) e utilitários
```
