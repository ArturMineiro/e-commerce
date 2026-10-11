# E-commerce white-label

Loja virtual em que o dono personaliza tudo pelo painel `/admin` (nome, logo, cores, contatos,
frete, banners, produtos, promoções) e recebe os pagamentos pelo Mercado Pago.

- `backend/`: Laravel 8 (API REST + JWT)
- `frontend/`: React + Vite + TypeScript + React Query + React Bootstrap

## Rodando localmente

Backend:

```bash
cd backend
composer install
cp .env.example .env        # ajuste DB_* e rode: php artisan key:generate && php artisan jwt:secret
php artisan migrate
php artisan storage:link    # necessário para exibir fotos/banners/logo
php artisan serve           # http://localhost:8000
```

Frontend (`frontend/.env` com `VITE_API_URL=http://localhost:8000/api`):

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

O primeiro usuário cadastrado vira o administrador da loja. Os demais são clientes
(o admin pode promover outros em Painel → Clientes).

## Testes

```bash
cd backend && php vendor/bin/phpunit   # usa o banco "ecommerce_test" (crie-o vazio no MySQL)
cd frontend && npm run lint && npm run build
```

## Pagamentos (Mercado Pago Checkout Pro)

1. O dono cria uma aplicação em https://www.mercadopago.com.br/developers/panel/app e cola o
   **Access Token** em Painel → Configurações da loja (fica criptografado no banco).
2. No checkout o backend cria o pedido, recalcula preços/estoque e gera o link de pagamento.
   O cliente paga (Pix, cartão, boleto) no Mercado Pago e o dinheiro cai na conta do dono.
3. O Mercado Pago avisa `POST /api/pagamentos/webhook` e/ou devolve o cliente para
   `/pagamento/retorno`. Nos dois casos o backend consulta o pagamento na API do Mercado Pago
   antes de marcar o pedido como pago e baixar o estoque.

O webhook só funciona com URL pública HTTPS (em produção, ou com um túnel como ngrok em
desenvolvimento). Em localhost, a confirmação acontece quando o cliente volta para a loja.
