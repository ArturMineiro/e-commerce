<?php

return [
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
