<?php

return [
    /*
    | Nome da plataforma (SaaS) que hospeda as lojas.
    */
    'nome' => env('PLATAFORMA_NOME', 'Lojaria'),

    /*
    | Cadastro público de lojas pela página da plataforma (/criar-loja).
    */
    'cadastro_aberto' => env('PLATAFORMA_CADASTRO_ABERTO', true),

    /*
    | Domínio da plataforma: com "minhaplataforma.com", a loja de slug "ana" responde
    | em ana.minhaplataforma.com (o front deve ser servido nesse endereço).
    */
    'dominio' => env('PLATAFORMA_DOMINIO'),

    /*
    | Slug da loja usada quando a requisição não indica nenhuma (sem X-Loja, sem domínio).
    | Vazio + só uma loja cadastrada = usa essa loja.
    */
    'loja_padrao' => env('LOJA_PADRAO'),
];
