<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'mailgun' => [
        'domain' => env('MAILGUN_DOMAIN'),
        'secret' => env('MAILGUN_SECRET'),
        'endpoint' => env('MAILGUN_ENDPOINT', 'api.mailgun.net'),
    ],

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    /*
    | Mercado Pago (Checkout Pro). O token pode vir do .env ou ser cadastrado
    | pelo admin em Configurações (o valor do painel tem prioridade).
    */
    'mercadopago' => [
        'access_token' => env('MERCADOPAGO_ACCESS_TOKEN'),
        'webhook_secret' => env('MERCADOPAGO_WEBHOOK_SECRET'),
        'base_url' => env('MERCADOPAGO_BASE_URL', 'https://api.mercadopago.com'),
    ],

    // URL pública do front (React), usada nos links de retorno do pagamento.
    'frontend_url' => env('FRONTEND_URL', 'http://localhost:5173'),

    // Localização de CEPs para o frete por distância (OpenStreetMap pede um User-Agent do sistema)
    'geocodificacao' => [
        'user_agent' => env('GEOCODIFICACAO_USER_AGENT', 'Lojaria/1.0 (frete por distancia)'),
        // Intervalo mínimo entre consultas ao Nominatim (a política de uso pede no máximo 1 por segundo)
        'intervalo_ms' => (int) env('GEOCODIFICACAO_INTERVALO_MS', 1100),
    ],

];
