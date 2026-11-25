<?php

/*
|--------------------------------------------------------------------------
| Modelos de loja (templates)
|--------------------------------------------------------------------------
| Ao criar uma loja, o dono escolhe um modelo e a loja já nasce com visual
| (cores, fontes, cantos), categorias, cores de produto, grades de tamanho,
| especificações com opções prontas e guia de medidas. Tudo pode ser
| alterado depois no painel.
|
| - tema.fonte_*: nomes da lista App\Support\Fontes::LISTA
| - tema.estilo_cantos: reto | suave | arredondado
| - especificacoes.*.tipo: unica (escolhe uma) | multipla (várias) | texto (livre)
| - exemplos: usados só na prévia do celular da página da plataforma
*/

$cuidadosRoupa = ['Lavar à mão', 'Lavar na máquina (delicado)', 'Lavagem a seco', 'Não usar alvejante', 'Passar do avesso', 'Secar à sombra'];
$letras = ['nome' => 'Letras', 'valores' => ['PP', 'P', 'M', 'G', 'GG']];

return [

    'moda-feminina' => [
        'nome' => 'Moda feminina',
        'descricao' => 'Vestidos, blusas, conjuntos e acessórios com cara de vitrine de shopping.',
        'segmento' => 'Moda',
        'icone' => 'vestido',
        'tema' => ['cor_primaria' => '#1F1A24', 'cor_secundaria' => '#D6336C', 'fonte_titulos' => 'Playfair Display', 'fonte_texto' => 'Inter', 'estilo_cantos' => 'suave'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Noite e pink', '#1F1A24', '#D6336C'], ['Nude elegante', '#F4E9E1', '#9C5B4A'], ['Oliva e caramelo', '#3B4A2F', '#D9A066'], ['Marinho e coral', '#14213D', '#F2765A'], ['Lilás', '#2E1F3D', '#B98CD8']],
        'slogan' => 'Peças que contam a sua história',
        'descricao_loja' => 'Moda feminina com curadoria, conforto e muito estilo.',
        'categorias' => ['Vestidos', 'Blusas', 'Saias', 'Calças', 'Conjuntos', 'Moda praia', 'Acessórios'],
        'cores' => [['Preto', '#111111'], ['Branco', '#FFFFFF'], ['Off-white', '#F5F0E6'], ['Bege', '#D9C3A5'], ['Rosa', '#E8A0B4'], ['Vermelho', '#C1121F'], ['Azul marinho', '#1B2A4A'], ['Verde oliva', '#6B7B3A'], ['Caramelo', '#A0612B']],
        'grades' => [$letras, ['nome' => 'Numeração', 'valores' => ['34', '36', '38', '40', '42', '44', '46']], ['nome' => 'Tamanho único', 'valores' => ['Único']]],
        'especificacoes' => [
            ['nome' => 'Tecido', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Algodão', 'Linho', 'Viscose', 'Malha', 'Crepe', 'Jeans', 'Seda', 'Tricô', 'Cetim']],
            ['nome' => 'Modelagem', 'tipo' => 'unica', 'opcoes' => ['Justa', 'Reta', 'Ampla', 'Oversized', 'Evasê']],
            ['nome' => 'Comprimento', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Curto', 'Midi', 'Longo']],
            ['nome' => 'Ocasião', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Casual', 'Trabalho', 'Festa', 'Praia']],
            ['nome' => 'Cuidados', 'tipo' => 'multipla', 'opcoes' => $cuidadosRoupa],
        ],
        'guia_medidas' => [
            'colunas' => ['Busto (cm)', 'Cintura (cm)', 'Quadril (cm)'],
            'linhas' => [['PP', '78-82', '60-64', '86-90'], ['P', '82-86', '64-68', '90-94'], ['M', '86-92', '68-74', '94-100'], ['G', '92-98', '74-80', '100-106'], ['GG', '98-104', '80-86', '106-112']],
        ],
        'exemplos' => [['nome' => 'Vestido Midi Floral', 'preco' => 219.9], ['nome' => 'Blusa de Linho', 'preco' => 129.9], ['nome' => 'Saia Plissada', 'preco' => 159.9], ['nome' => 'Conjunto Alfaiataria', 'preco' => 289.9]],
    ],

    'moda-indiana' => [
        'nome' => 'Moda indiana',
        'descricao' => 'Anarkalis, lehengas, sarees e kurtis com bordados, tecidos nobres e guia de medidas.',
        'segmento' => 'Moda',
        'icone' => 'lotus',
        'tema' => ['cor_primaria' => '#4A0E2B', 'cor_secundaria' => '#C8963E', 'fonte_titulos' => 'Cormorant Garamond', 'fonte_texto' => 'Montserrat', 'estilo_cantos' => 'suave'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Vinho e ouro', '#4A0E2B', '#C8963E'], ['Esmeralda e ouro', '#0B4F3C', '#C9A44C'], ['Rubi e rosa', '#7C1230', '#E39AAE'], ['Berinjela e açafrão', '#3B1D3F', '#E0892B'], ['Índigo e ouro', '#1E2A5A', '#D4AF37'], ['Turquesa e coral', '#0F4C5C', '#E36F55'], ['Marfim e vinho', '#F6EFE6', '#7B1E3A']],
        'slogan' => 'Elegância que atravessa culturas',
        'descricao_loja' => 'Vestidos indianos com bordados feitos à mão, tecidos nobres e caimento impecável.',
        'categorias' => ['Anarkali', 'Lehenga', 'Saree', 'Kurti', 'Salwar Kameez', 'Sharara', 'Conjuntos', 'Dupattas e acessórios'],
        'cores' => [['Vermelho', '#B3122E'], ['Bordô', '#6D1A36'], ['Rosa pink', '#D81B78'], ['Rosa chá', '#E8B4B8'], ['Dourado', '#C8963E'], ['Mostarda', '#D4A017'], ['Açafrão', '#F09A0F'], ['Pêssego', '#F6B99B'], ['Verde esmeralda', '#0B6E4F'], ['Verde menta', '#98D7C2'], ['Azul royal', '#1D3FBB'], ['Azul turquesa', '#2AA7B8'], ['Roxo', '#5E2B97'], ['Off-white', '#F5F0E6'], ['Preto', '#111111']],
        'grades' => [
            ['nome' => 'Letras', 'valores' => ['PP', 'P', 'M', 'G', 'GG', 'XGG']],
            ['nome' => 'Numeração', 'valores' => ['36', '38', '40', '42', '44', '46', '48']],
            ['nome' => 'Tamanho único (free size)', 'valores' => ['Único']],
            ['nome' => 'Sob medida', 'valores' => ['Sob medida']],
        ],
        'especificacoes' => [
            ['nome' => 'Estilo', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Anarkali', 'Lehenga', 'Saree', 'Kurti', 'Salwar Kameez', 'Sharara', 'Gharara', 'Kaftan', 'Vestido longo']],
            ['nome' => 'Tecido', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Seda', 'Georgette', 'Chiffon', 'Crepe', 'Cetim', 'Brocado', 'Tule', 'Veludo', 'Organza', 'Algodão', 'Linho']],
            ['nome' => 'Comprimento', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Curto', 'Midi', 'Longo']],
            ['nome' => 'Manga', 'tipo' => 'unica', 'opcoes' => ['Sem manga', 'Alça', 'Curta', '3/4', 'Longa']],
            ['nome' => 'Decote', 'tipo' => 'unica', 'opcoes' => ['Redondo', 'V', 'Quadrado', 'Canoa', 'Gola alta', 'Ombro a ombro']],
            ['nome' => 'Acabamento', 'tipo' => 'multipla', 'opcoes' => ['Bordado zari', 'Pedraria', 'Espelhos (mirror work)', 'Paetê', 'Bordado à mão', 'Renda', 'Estampa block print', 'Franjas']],
            ['nome' => 'Ocasião', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Festa', 'Casamento', 'Noivado', 'Dia a dia', 'Religiosa']],
            ['nome' => 'Peças inclusas', 'tipo' => 'multipla', 'opcoes' => ['Vestido', 'Dupatta (véu)', 'Calça / legging', 'Saia', 'Blusa (choli)', 'Forro']],
            ['nome' => 'Cuidados', 'tipo' => 'multipla', 'opcoes' => ['Lavar à mão', 'Lavagem a seco', 'Não usar alvejante', 'Passar do avesso', 'Secar à sombra']],
        ],
        'guia_medidas' => [
            'colunas' => ['Busto (cm)', 'Cintura (cm)', 'Quadril (cm)'],
            'linhas' => [['PP', '80-84', '62-66', '88-92'], ['P', '84-88', '66-70', '92-96'], ['M', '88-94', '70-76', '96-102'], ['G', '94-100', '76-82', '102-108'], ['GG', '100-106', '82-88', '108-114'], ['XGG', '106-112', '88-94', '114-120']],
        ],
        'exemplos' => [['nome' => 'Anarkali Bordado Zari', 'preco' => 489.9], ['nome' => 'Lehenga Rosa Festa', 'preco' => 899.0], ['nome' => 'Saree de Seda', 'preco' => 659.0], ['nome' => 'Kurti Block Print', 'preco' => 189.9]],
    ],

    'moda-masculina' => [
        'nome' => 'Moda masculina',
        'descricao' => 'Camisas, camisetas, calças e acessórios com visual sóbrio e direto.',
        'segmento' => 'Moda',
        'icone' => 'camisa',
        'tema' => ['cor_primaria' => '#0F172A', 'cor_secundaria' => '#B45309', 'fonte_titulos' => 'Oswald', 'fonte_texto' => 'Inter', 'estilo_cantos' => 'reto'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Grafite e cobre', '#0F172A', '#B45309'], ['Petróleo e mostarda', '#0B3C49', '#D9A441'], ['Verde militar', '#2F3A2F', '#C2A878'], ['Café', '#2B1D14', '#C08552'], ['Branco e preto', '#FFFFFF', '#111111']],
        'slogan' => 'Estilo sem esforço',
        'descricao_loja' => 'Básicos de qualidade e peças que vão do trabalho ao fim de semana.',
        'categorias' => ['Camisetas', 'Camisas', 'Calças', 'Bermudas', 'Jaquetas', 'Acessórios'],
        'cores' => [['Preto', '#111111'], ['Branco', '#FFFFFF'], ['Cinza', '#6B7280'], ['Azul marinho', '#1B2A4A'], ['Verde militar', '#4B5320'], ['Bege', '#D9C3A5'], ['Vinho', '#5C1A2B']],
        'grades' => [['nome' => 'Letras', 'valores' => ['P', 'M', 'G', 'GG', 'XG']], ['nome' => 'Numeração', 'valores' => ['38', '40', '42', '44', '46', '48']]],
        'especificacoes' => [
            ['nome' => 'Tecido', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Algodão', 'Linho', 'Jeans', 'Sarja', 'Malha', 'Poliéster']],
            ['nome' => 'Modelagem', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Slim', 'Regular', 'Oversized']],
            ['nome' => 'Manga', 'tipo' => 'unica', 'opcoes' => ['Curta', 'Longa', 'Regata']],
            ['nome' => 'Cuidados', 'tipo' => 'multipla', 'opcoes' => $cuidadosRoupa],
        ],
        'guia_medidas' => [
            'colunas' => ['Tórax (cm)', 'Cintura (cm)', 'Comprimento (cm)'],
            'linhas' => [['P', '92-96', '76-80', '70'], ['M', '96-102', '80-86', '72'], ['G', '102-108', '86-92', '74'], ['GG', '108-114', '92-98', '76'], ['XG', '114-120', '98-104', '78']],
        ],
        'exemplos' => [['nome' => 'Camiseta Essencial', 'preco' => 79.9], ['nome' => 'Camisa de Linho', 'preco' => 199.9], ['nome' => 'Calça Chino', 'preco' => 229.9], ['nome' => 'Jaqueta Jeans', 'preco' => 299.9]],
    ],

    'tenis' => [
        'nome' => 'Tênis e sneakers',
        'descricao' => 'Numeração BR, filtros por uso e material e destaque para lançamentos.',
        'segmento' => 'Calçados',
        'icone' => 'tenis',
        'tema' => ['cor_primaria' => '#0A0A0A', 'cor_secundaria' => '#FF4D00', 'fonte_titulos' => 'Bebas Neue', 'fonte_texto' => 'Inter', 'estilo_cantos' => 'arredondado'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Preto e laranja', '#0A0A0A', '#FF4D00'], ['Branco esportivo', '#FFFFFF', '#111111'], ['Azul elétrico', '#0B1F4D', '#22D3EE'], ['Verde neon', '#111111', '#A3E635'], ['Vermelho', '#141414', '#E11D48']],
        'slogan' => 'Cada passo conta',
        'descricao_loja' => 'Tênis para correr, treinar e ir para a rua com estilo.',
        'categorias' => ['Corrida', 'Casual', 'Basquete', 'Skate', 'Chuteiras', 'Infantil', 'Acessórios'],
        'cores' => [['Preto', '#111111'], ['Branco', '#FFFFFF'], ['Cinza', '#9CA3AF'], ['Vermelho', '#DC2626'], ['Azul', '#2563EB'], ['Verde', '#16A34A'], ['Bege', '#D9C3A5']],
        'grades' => [['nome' => 'Numeração adulto', 'valores' => ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44']], ['nome' => 'Numeração infantil', 'valores' => ['24', '25', '26', '27', '28', '29', '30', '31', '32', '33']]],
        'especificacoes' => [
            ['nome' => 'Uso', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Corrida', 'Academia', 'Casual', 'Skate', 'Basquete', 'Futebol']],
            ['nome' => 'Gênero', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Masculino', 'Feminino', 'Unissex', 'Infantil']],
            ['nome' => 'Material', 'tipo' => 'multipla', 'opcoes' => ['Couro', 'Camurça', 'Mesh', 'Lona', 'Knit', 'Sintético']],
            ['nome' => 'Cano', 'tipo' => 'unica', 'opcoes' => ['Baixo', 'Médio', 'Alto']],
            ['nome' => 'Marca', 'tipo' => 'texto', 'filtravel' => false, 'opcoes' => []],
        ],
        'guia_medidas' => [
            'colunas' => ['Comprimento do pé (cm)'],
            'linhas' => [['36', '23,5'], ['37', '24'], ['38', '24,7'], ['39', '25,3'], ['40', '26'], ['41', '26,7'], ['42', '27,3'], ['43', '28'], ['44', '28,7']],
        ],
        'exemplos' => [['nome' => 'Runner Pro 2', 'preco' => 499.9], ['nome' => 'Street Classic', 'preco' => 349.9], ['nome' => 'Court High', 'preco' => 599.9], ['nome' => 'Skate Low', 'preco' => 279.9]],
    ],

    'games' => [
        'nome' => 'Games e geek',
        'descricao' => 'Consoles, jogos, periféricos e colecionáveis com filtro por plataforma.',
        'segmento' => 'Entretenimento',
        'icone' => 'controle',
        'tema' => ['cor_primaria' => '#0B0B1A', 'cor_secundaria' => '#8B5CF6', 'fonte_titulos' => 'Orbitron', 'fonte_texto' => 'Inter', 'estilo_cantos' => 'reto'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Roxo neon', '#0B0B1A', '#8B5CF6'], ['Verde gamer', '#0A0F0A', '#22C55E'], ['Ciano', '#0B1020', '#06B6D4'], ['Vermelho arcade', '#120A0A', '#EF4444']],
        'slogan' => 'Level up no seu setup',
        'descricao_loja' => 'Jogos, consoles e acessórios com entrega rápida e garantia.',
        'categorias' => ['Consoles', 'Jogos', 'Controles', 'Headsets', 'PC gamer', 'Colecionáveis', 'Camisetas geek'],
        'cores' => [['Preto', '#111111'], ['Branco', '#FFFFFF'], ['Vermelho', '#DC2626'], ['Azul', '#2563EB'], ['Verde neon', '#22C55E'], ['Roxo', '#7C3AED']],
        'grades' => [['nome' => 'Armazenamento', 'valores' => ['256 GB', '512 GB', '1 TB', '2 TB']], ['nome' => 'Camisetas', 'valores' => ['P', 'M', 'G', 'GG']]],
        'especificacoes' => [
            ['nome' => 'Plataforma', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['PlayStation 5', 'PlayStation 4', 'Xbox Series', 'Nintendo Switch', 'PC', 'Mobile']],
            ['nome' => 'Condição', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Novo', 'Seminovo', 'Usado']],
            ['nome' => 'Mídia', 'tipo' => 'unica', 'opcoes' => ['Física', 'Digital']],
            ['nome' => 'Classificação indicativa', 'tipo' => 'unica', 'opcoes' => ['Livre', '10 anos', '12 anos', '14 anos', '16 anos', '18 anos']],
            ['nome' => 'Garantia', 'tipo' => 'texto', 'opcoes' => []],
        ],
        'guia_medidas' => null,
        'exemplos' => [['nome' => 'Controle Sem Fio', 'preco' => 399.9], ['nome' => 'Headset 7.1', 'preco' => 289.9], ['nome' => 'Action Figure', 'preco' => 179.9], ['nome' => 'Teclado Mecânico', 'preco' => 349.9]],
    ],

    'eletronicos' => [
        'nome' => 'Eletrônicos',
        'descricao' => 'Celulares, fones, carregadores e smartwatches com ficha técnica completa.',
        'segmento' => 'Tecnologia',
        'icone' => 'fone',
        'tema' => ['cor_primaria' => '#0F172A', 'cor_secundaria' => '#0EA5E9', 'fonte_titulos' => 'Space Grotesk', 'fonte_texto' => 'Inter', 'estilo_cantos' => 'suave'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Azul tecnologia', '#0F172A', '#0EA5E9'], ['Grafite e verde', '#111827', '#10B981'], ['Branco clean', '#FFFFFF', '#2563EB'], ['Laranja', '#1C1917', '#F97316']],
        'slogan' => 'Tecnologia que facilita o seu dia',
        'descricao_loja' => 'Acessórios e eletrônicos com garantia e envio para todo o Brasil.',
        'categorias' => ['Celulares', 'Fones', 'Carregadores', 'Smartwatches', 'Caixas de som', 'Informática', 'Acessórios'],
        'cores' => [['Preto', '#111111'], ['Branco', '#FFFFFF'], ['Grafite', '#374151'], ['Azul', '#2563EB'], ['Rosa', '#F472B6'], ['Verde', '#16A34A']],
        'grades' => [['nome' => 'Armazenamento', 'valores' => ['64 GB', '128 GB', '256 GB', '512 GB']], ['nome' => 'Voltagem', 'valores' => ['110V', '220V', 'Bivolt']]],
        'especificacoes' => [
            ['nome' => 'Conectividade', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Bluetooth', 'Wi-Fi', 'USB-C', 'Lightning', 'P2 (3,5 mm)', 'NFC']],
            ['nome' => 'Condição', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Novo', 'Seminovo', 'Recondicionado']],
            ['nome' => 'Bateria', 'tipo' => 'texto', 'opcoes' => []],
            ['nome' => 'Garantia', 'tipo' => 'texto', 'opcoes' => []],
        ],
        'guia_medidas' => null,
        'exemplos' => [['nome' => 'Fone Bluetooth ANC', 'preco' => 349.9], ['nome' => 'Carregador 65W', 'preco' => 149.9], ['nome' => 'Smartwatch Fit', 'preco' => 499.9], ['nome' => 'Caixa de Som', 'preco' => 259.9]],
    ],

    'beleza' => [
        'nome' => 'Beleza e cosméticos',
        'descricao' => 'Skincare, maquiagem e perfumes com filtros por tipo de pele e benefício.',
        'segmento' => 'Beleza',
        'icone' => 'beleza',
        'tema' => ['cor_primaria' => '#2B2024', 'cor_secundaria' => '#B76E79', 'fonte_titulos' => 'DM Serif Display', 'fonte_texto' => 'DM Sans', 'estilo_cantos' => 'arredondado'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Rosé', '#2B2024', '#B76E79'], ['Nude', '#F5EBE6', '#B5838D'], ['Verde chá', '#2F3E36', '#C9A9A6'], ['Lavanda', '#2E2440', '#C3A6E0']],
        'slogan' => 'Sua rotina, do seu jeito',
        'descricao_loja' => 'Cosméticos selecionados para cuidar de você todos os dias.',
        'categorias' => ['Skincare', 'Maquiagem', 'Cabelos', 'Perfumes', 'Corpo e banho', 'Unhas', 'Kits'],
        'cores' => [['Nude', '#E3BC9A'], ['Rosado', '#E8A0B4'], ['Vermelho', '#B3122E'], ['Coral', '#FF7F6B'], ['Marrom', '#7B4B2A'], ['Transparente', '#F3F4F6']],
        'grades' => [['nome' => 'Volume', 'valores' => ['30 ml', '50 ml', '100 ml', '200 ml']], ['nome' => 'Tons de base', 'valores' => ['01', '02', '03', '04', '05', '06', '07', '08']]],
        'especificacoes' => [
            ['nome' => 'Tipo de pele', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Oleosa', 'Seca', 'Mista', 'Sensível', 'Todos os tipos']],
            ['nome' => 'Benefício', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Hidratação', 'Anti-idade', 'Uniformização', 'Controle de oleosidade', 'Proteção solar']],
            ['nome' => 'Vegano', 'tipo' => 'unica', 'opcoes' => ['Sim', 'Não']],
            ['nome' => 'Cruelty-free', 'tipo' => 'unica', 'opcoes' => ['Sim', 'Não']],
        ],
        'guia_medidas' => null,
        'exemplos' => [['nome' => 'Sérum Vitamina C', 'preco' => 129.9], ['nome' => 'Batom Matte', 'preco' => 49.9], ['nome' => 'Perfume Floral', 'preco' => 249.9], ['nome' => 'Kit Skincare', 'preco' => 199.9]],
    ],

    'joias' => [
        'nome' => 'Joias e semijoias',
        'descricao' => 'Anéis, colares e brincos com aro, comprimento e material bem descritos.',
        'segmento' => 'Acessórios',
        'icone' => 'joia',
        'tema' => ['cor_primaria' => '#111111', 'cor_secundaria' => '#C9A227', 'fonte_titulos' => 'Cinzel', 'fonte_texto' => 'Raleway', 'estilo_cantos' => 'reto'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Preto e ouro', '#111111', '#C9A227'], ['Champanhe', '#F7F1E8', '#9A7B4F'], ['Safira e ouro', '#0F1F3D', '#C9A227'], ['Prata', '#1F2937', '#CBD5E1'], ['Rosé gold', '#2B1F24', '#D4A59A']],
        'slogan' => 'Brilho para todos os momentos',
        'descricao_loja' => 'Joias e semijoias com acabamento impecável e garantia.',
        'categorias' => ['Anéis', 'Colares', 'Brincos', 'Pulseiras', 'Conjuntos', 'Relógios'],
        'cores' => [['Dourado', '#C9A227'], ['Prateado', '#C0C0C0'], ['Rose gold', '#D9A38F'], ['Ródio negro', '#2B2B2B']],
        'grades' => [['nome' => 'Aro', 'valores' => ['12', '14', '16', '18', '20', '22', '24']], ['nome' => 'Comprimento', 'valores' => ['40 cm', '45 cm', '50 cm', '60 cm']]],
        'especificacoes' => [
            ['nome' => 'Material', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Prata 925', 'Ouro 18k', 'Banho de ouro', 'Banho de ródio', 'Aço inox']],
            ['nome' => 'Pedra', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Zircônia', 'Pérola', 'Cristal', 'Pedra natural', 'Sem pedra']],
            ['nome' => 'Hipoalergênico', 'tipo' => 'unica', 'opcoes' => ['Sim', 'Não']],
            ['nome' => 'Garantia', 'tipo' => 'texto', 'opcoes' => []],
        ],
        'guia_medidas' => [
            'colunas' => ['Diâmetro interno (mm)'],
            'linhas' => [['12', '16,5'], ['14', '17,2'], ['16', '17,8'], ['18', '18,5'], ['20', '19,1'], ['22', '19,8'], ['24', '20,4']],
        ],
        'exemplos' => [['nome' => 'Anel Solitário', 'preco' => 189.9], ['nome' => 'Colar Ponto de Luz', 'preco' => 149.9], ['nome' => 'Brinco Argola', 'preco' => 99.9], ['nome' => 'Pulseira Riviera', 'preco' => 229.9]],
    ],

    'doces' => [
        'nome' => 'Doces e confeitaria',
        'descricao' => 'Bolos, brigadeiros e encomendas com sabores, quantidades e restrições.',
        'segmento' => 'Alimentação',
        'icone' => 'bolo',
        'tema' => ['cor_primaria' => '#4E2A1E', 'cor_secundaria' => '#E46A8F', 'fonte_titulos' => 'Baloo 2', 'fonte_texto' => 'Nunito', 'estilo_cantos' => 'arredondado'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Chocolate e morango', '#4E2A1E', '#E46A8F'], ['Baunilha', '#FFF6EC', '#C26A3D'], ['Menta', '#1F3B36', '#7FD1B9'], ['Caramelo', '#3D2314', '#E0A458']],
        'slogan' => 'Feito com carinho, do forno para você',
        'descricao_loja' => 'Doces artesanais para adoçar o seu dia e as suas festas.',
        'categorias' => ['Bolos', 'Brigadeiros', 'Doces finos', 'Tortas', 'Cestas', 'Encomendas'],
        'cores' => [],
        'grades' => [['nome' => 'Quantidade', 'valores' => ['Caixa com 4', 'Caixa com 6', 'Caixa com 12', 'Cento']], ['nome' => 'Tamanho do bolo', 'valores' => ['P (10 fatias)', 'M (20 fatias)', 'G (30 fatias)']]],
        'especificacoes' => [
            ['nome' => 'Sabor', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Chocolate', 'Ninho', 'Morango', 'Doce de leite', 'Limão', 'Red velvet', 'Coco']],
            ['nome' => 'Restrições', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Sem glúten', 'Sem lactose', 'Vegano', 'Zero açúcar']],
            ['nome' => 'Disponibilidade', 'tipo' => 'unica', 'opcoes' => ['Pronta entrega', 'Sob encomenda (48 h)', 'Sob encomenda (5 dias)']],
            ['nome' => 'Validade', 'tipo' => 'texto', 'opcoes' => []],
        ],
        'guia_medidas' => null,
        'exemplos' => [['nome' => 'Bolo de Chocolate', 'preco' => 129.9], ['nome' => 'Brigadeiros Gourmet', 'preco' => 39.9], ['nome' => 'Torta de Limão', 'preco' => 89.9], ['nome' => 'Cesta de Café', 'preco' => 159.9]],
    ],

    'pet' => [
        'nome' => 'Pet shop',
        'descricao' => 'Rações, petiscos e acessórios com filtros por espécie, idade e porte.',
        'segmento' => 'Pets',
        'icone' => 'pet',
        'tema' => ['cor_primaria' => '#1E3A5F', 'cor_secundaria' => '#F59E0B', 'fonte_titulos' => 'Quicksand', 'fonte_texto' => 'Nunito', 'estilo_cantos' => 'arredondado'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Azul e amarelo', '#1E3A5F', '#F59E0B'], ['Verde e laranja', '#1F3D2B', '#F2A541'], ['Uva e laranja', '#3A2E39', '#FF8C42'], ['Turquesa', '#0E3B43', '#4FD1C5']],
        'slogan' => 'Tudo para quem tem quatro patas',
        'descricao_loja' => 'Produtos para cães, gatos e outros pets com entrega rápida.',
        'categorias' => ['Rações', 'Petiscos', 'Brinquedos', 'Camas', 'Coleiras', 'Higiene', 'Roupinhas'],
        'cores' => [['Azul', '#2563EB'], ['Rosa', '#F472B6'], ['Vermelho', '#DC2626'], ['Preto', '#111111'], ['Verde', '#16A34A'], ['Amarelo', '#FACC15']],
        'grades' => [['nome' => 'Porte', 'valores' => ['Mini', 'Pequeno', 'Médio', 'Grande', 'Gigante']], ['nome' => 'Peso do pacote', 'valores' => ['1 kg', '3 kg', '10 kg', '15 kg']]],
        'especificacoes' => [
            ['nome' => 'Espécie', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Cachorro', 'Gato', 'Pássaro', 'Peixe', 'Roedor']],
            ['nome' => 'Idade', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Filhote', 'Adulto', 'Sênior']],
            ['nome' => 'Porte', 'tipo' => 'multipla', 'opcoes' => ['Mini', 'Pequeno', 'Médio', 'Grande', 'Gigante']],
        ],
        'guia_medidas' => [
            'colunas' => ['Pescoço (cm)', 'Peito (cm)', 'Peso (kg)'],
            'linhas' => [['Mini', '20-25', '30-35', 'até 3'], ['Pequeno', '25-30', '35-45', '3-8'], ['Médio', '30-40', '45-60', '8-15'], ['Grande', '40-50', '60-75', '15-30']],
        ],
        'exemplos' => [['nome' => 'Ração Premium 10 kg', 'preco' => 189.9], ['nome' => 'Cama Nuvem', 'preco' => 149.9], ['nome' => 'Petisco Natural', 'preco' => 24.9], ['nome' => 'Coleira Ajustável', 'preco' => 39.9]],
    ],

    'casa' => [
        'nome' => 'Casa e decoração',
        'descricao' => 'Decoração, cama, mesa e banho com filtros por ambiente e estilo.',
        'segmento' => 'Casa',
        'icone' => 'sofa',
        'tema' => ['cor_primaria' => '#2F3E36', 'cor_secundaria' => '#C47F5A', 'fonte_titulos' => 'Fraunces', 'fonte_texto' => 'Work Sans', 'estilo_cantos' => 'suave'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Verde e terracota', '#2F3E36', '#C47F5A'], ['Areia', '#F3EDE4', '#8A6A4F'], ['Azul e mostarda', '#1F3A4D', '#D9A441'], ['Grafite e ouro', '#262626', '#C9A227']],
        'slogan' => 'Sua casa com a sua cara',
        'descricao_loja' => 'Objetos e têxteis para deixar cada canto mais aconchegante.',
        'categorias' => ['Decoração', 'Cama', 'Mesa posta', 'Banho', 'Iluminação', 'Organização', 'Plantas'],
        'cores' => [['Off-white', '#F5F0E6'], ['Bege', '#D9C3A5'], ['Terracota', '#C47F5A'], ['Verde sálvia', '#9CAF88'], ['Cinza', '#9CA3AF'], ['Preto', '#111111'], ['Madeira', '#8B5A2B']],
        'grades' => [['nome' => 'Cama', 'valores' => ['Solteiro', 'Casal', 'Queen', 'King']], ['nome' => 'Tamanho', 'valores' => ['P', 'M', 'G']]],
        'especificacoes' => [
            ['nome' => 'Material', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Algodão', 'Linho', 'Cerâmica', 'Madeira', 'Vidro', 'Metal', 'Palha']],
            ['nome' => 'Ambiente', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Sala', 'Quarto', 'Cozinha', 'Banheiro', 'Varanda', 'Escritório']],
            ['nome' => 'Estilo', 'tipo' => 'unica', 'opcoes' => ['Moderno', 'Rústico', 'Escandinavo', 'Boho', 'Clássico']],
            ['nome' => 'Dimensões', 'tipo' => 'texto', 'opcoes' => []],
        ],
        'guia_medidas' => null,
        'exemplos' => [['nome' => 'Vaso de Cerâmica', 'preco' => 119.9], ['nome' => 'Jogo de Lençol Linho', 'preco' => 389.9], ['nome' => 'Luminária Palha', 'preco' => 229.9], ['nome' => 'Manta Tricô', 'preco' => 179.9]],
    ],

    'infantil' => [
        'nome' => 'Infantil',
        'descricao' => 'Roupas de bebê e criança, brinquedos e calçados com tamanhos por idade.',
        'segmento' => 'Infantil',
        'icone' => 'bebe',
        'tema' => ['cor_primaria' => '#2D3A8C', 'cor_secundaria' => '#FF7A59', 'fonte_titulos' => 'Baloo 2', 'fonte_texto' => 'Nunito', 'estilo_cantos' => 'arredondado'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Azul e coral', '#2D3A8C', '#FF7A59'], ['Roxo e amarelo', '#3A0CA3', '#FFBE0B'], ['Menta e laranja', '#1B4D4B', '#FF9F1C'], ['Uva e rosa', '#5A189A', '#FF70A6']],
        'slogan' => 'Para crescer brincando',
        'descricao_loja' => 'Roupas confortáveis e brinquedos que encantam os pequenos.',
        'categorias' => ['Bebê', 'Meninas', 'Meninos', 'Brinquedos', 'Calçados', 'Acessórios'],
        'cores' => [['Azul bebê', '#A7C7E7'], ['Rosa bebê', '#F4C2C2'], ['Amarelo', '#FDE68A'], ['Verde água', '#99F6E4'], ['Branco', '#FFFFFF'], ['Cinza mescla', '#B8B8B8']],
        'grades' => [['nome' => 'Bebê', 'valores' => ['RN', 'P', 'M', 'G']], ['nome' => 'Infantil', 'valores' => ['1', '2', '3', '4', '6', '8', '10', '12', '14']]],
        'especificacoes' => [
            ['nome' => 'Idade', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['0 a 1 ano', '1 a 3 anos', '3 a 6 anos', '6 a 10 anos', '10+ anos']],
            ['nome' => 'Gênero', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Menina', 'Menino', 'Unissex']],
            ['nome' => 'Tecido', 'tipo' => 'multipla', 'opcoes' => ['Algodão', 'Malha', 'Moletom', 'Plush', 'Linho']],
            ['nome' => 'Selo Inmetro', 'tipo' => 'unica', 'opcoes' => ['Sim', 'Não se aplica']],
        ],
        'guia_medidas' => [
            'colunas' => ['Altura (cm)', 'Idade aproximada'],
            'linhas' => [['RN', 'até 50', '0-1 mês'], ['P', '50-60', '1-3 meses'], ['M', '60-70', '3-6 meses'], ['G', '70-80', '6-12 meses'], ['2', '86-92', '2 anos'], ['4', '98-104', '4 anos'], ['6', '110-116', '6 anos'], ['8', '122-128', '8 anos']],
        ],
        'exemplos' => [['nome' => 'Body Algodão', 'preco' => 49.9], ['nome' => 'Vestido Rodado', 'preco' => 89.9], ['nome' => 'Pelúcia Urso', 'preco' => 69.9], ['nome' => 'Tênis Luz', 'preco' => 129.9]],
    ],

    'fitness' => [
        'nome' => 'Fitness e esportes',
        'descricao' => 'Moda fitness e acessórios com filtros por modalidade e compressão.',
        'segmento' => 'Esportes',
        'icone' => 'haltere',
        'tema' => ['cor_primaria' => '#111111', 'cor_secundaria' => '#A3E635', 'fonte_titulos' => 'Oswald', 'fonte_texto' => 'Inter', 'estilo_cantos' => 'reto'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Preto e lima', '#111111', '#A3E635'], ['Azul energia', '#0B132B', '#3A86FF'], ['Laranja', '#121212', '#FB5607'], ['Rosa', '#1A1A1A', '#FF006E']],
        'slogan' => 'Treine com estilo',
        'descricao_loja' => 'Roupas e acessórios que acompanham o seu ritmo.',
        'categorias' => ['Leggings', 'Tops', 'Shorts', 'Camisetas', 'Conjuntos', 'Acessórios'],
        'cores' => [['Preto', '#111111'], ['Grafite', '#374151'], ['Verde limão', '#A3E635'], ['Rosa', '#EC4899'], ['Azul', '#2563EB'], ['Vinho', '#7F1D1D']],
        'grades' => [['nome' => 'Letras', 'valores' => ['PP', 'P', 'M', 'G', 'GG', 'XG']]],
        'especificacoes' => [
            ['nome' => 'Modalidade', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Academia', 'Corrida', 'Yoga', 'Crossfit', 'Ciclismo', 'Natação']],
            ['nome' => 'Tecido', 'tipo' => 'multipla', 'opcoes' => ['Poliamida', 'Elastano', 'Dry-fit', 'Algodão']],
            ['nome' => 'Compressão', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Leve', 'Média', 'Alta']],
            ['nome' => 'Proteção UV', 'tipo' => 'unica', 'opcoes' => ['Sim', 'Não']],
        ],
        'guia_medidas' => [
            'colunas' => ['Busto (cm)', 'Cintura (cm)', 'Quadril (cm)'],
            'linhas' => [['PP', '76-80', '58-62', '84-88'], ['P', '80-86', '62-68', '88-94'], ['M', '86-92', '68-74', '94-100'], ['G', '92-98', '74-80', '100-106'], ['GG', '98-104', '80-86', '106-112']],
        ],
        'exemplos' => [['nome' => 'Legging Compressão', 'preco' => 139.9], ['nome' => 'Top Alta Sustentação', 'preco' => 99.9], ['nome' => 'Short Dry-fit', 'preco' => 79.9], ['nome' => 'Garrafa Térmica', 'preco' => 69.9]],
    ],

    'livros' => [
        'nome' => 'Livraria e papelaria',
        'descricao' => 'Livros, HQs e papelaria com autor, editora e gênero bem organizados.',
        'segmento' => 'Cultura',
        'icone' => 'livro',
        'tema' => ['cor_primaria' => '#1E293B', 'cor_secundaria' => '#B45309', 'fonte_titulos' => 'Libre Baskerville', 'fonte_texto' => 'Work Sans', 'estilo_cantos' => 'reto'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Azul e cobre', '#1E293B', '#B45309'], ['Verde biblioteca', '#1F3A2E', '#C9A227'], ['Vinho', '#3D0C11', '#D4A373'], ['Papel', '#F5F0E6', '#7F5539']],
        'slogan' => 'Histórias que ficam',
        'descricao_loja' => 'Livros novos e usados, HQs e papelaria criativa.',
        'categorias' => ['Romance', 'Ficção', 'Infantil', 'Autoajuda', 'Negócios', 'HQs e mangás', 'Papelaria'],
        'cores' => [],
        'grades' => [['nome' => 'Edição', 'valores' => ['Brochura', 'Capa dura', 'Box']]],
        'especificacoes' => [
            ['nome' => 'Gênero', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Romance', 'Fantasia', 'Suspense', 'Biografia', 'Infantil', 'Negócios', 'Autoajuda']],
            ['nome' => 'Idioma', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Português', 'Inglês', 'Espanhol']],
            ['nome' => 'Condição', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Novo', 'Usado - ótimo', 'Usado - bom']],
            ['nome' => 'Autor', 'tipo' => 'texto', 'opcoes' => []],
            ['nome' => 'Editora', 'tipo' => 'texto', 'opcoes' => []],
        ],
        'guia_medidas' => null,
        'exemplos' => [['nome' => 'Romance de Época', 'preco' => 59.9], ['nome' => 'Box Fantasia', 'preco' => 189.9], ['nome' => 'Mangá Vol. 1', 'preco' => 34.9], ['nome' => 'Planner 2027', 'preco' => 79.9]],
    ],

    'artesanato' => [
        'nome' => 'Artesanato',
        'descricao' => 'Peças feitas à mão, sob encomenda ou pronta entrega, com técnica e material.',
        'segmento' => 'Feito à mão',
        'icone' => 'artesanato',
        'tema' => ['cor_primaria' => '#3D2B1F', 'cor_secundaria' => '#D97706', 'fonte_titulos' => 'Lora', 'fonte_texto' => 'Nunito', 'estilo_cantos' => 'suave'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Terra', '#3D2B1F', '#D97706'], ['Oliva', '#3A4A2B', '#E9C46A'], ['Barro', '#5C2E1F', '#F4A261'], ['Anil', '#1D3557', '#E9C46A']],
        'slogan' => 'Feito à mão, com alma',
        'descricao_loja' => 'Peças únicas, produzidas com carinho e técnica artesanal.',
        'categorias' => ['Crochê', 'Bordados', 'Cerâmica', 'Macramê', 'Velas e aromas', 'Presentes'],
        'cores' => [['Cru', '#EFE6D2'], ['Terracota', '#C47F5A'], ['Mostarda', '#D4A017'], ['Verde', '#6B8E23'], ['Azul', '#4A6FA5'], ['Rosa', '#E8A0B4']],
        'grades' => [['nome' => 'Tamanho', 'valores' => ['P', 'M', 'G']]],
        'especificacoes' => [
            ['nome' => 'Técnica', 'tipo' => 'multipla', 'filtravel' => true, 'opcoes' => ['Crochê', 'Tricô', 'Bordado', 'Cerâmica', 'Macramê', 'Costura', 'Pintura']],
            ['nome' => 'Material', 'tipo' => 'multipla', 'opcoes' => ['Algodão', 'Lã', 'Barro', 'Cera de soja', 'Madeira', 'Papel']],
            ['nome' => 'Produção', 'tipo' => 'unica', 'filtravel' => true, 'opcoes' => ['Pronta entrega', 'Sob encomenda']],
            ['nome' => 'Personalizável', 'tipo' => 'unica', 'opcoes' => ['Sim', 'Não']],
        ],
        'guia_medidas' => null,
        'exemplos' => [['nome' => 'Bolsa de Crochê', 'preco' => 159.9], ['nome' => 'Vela Aromática', 'preco' => 49.9], ['nome' => 'Caneca de Cerâmica', 'preco' => 69.9], ['nome' => 'Bastidor Bordado', 'preco' => 89.9]],
    ],

    'personalizado' => [
        'nome' => 'Começar do zero',
        'descricao' => 'Uma loja limpa e neutra para você montar do seu jeito.',
        'segmento' => 'Outros',
        'icone' => 'magica',
        'tema' => ['cor_primaria' => '#111827', 'cor_secundaria' => '#2563EB', 'fonte_titulos' => 'Plus Jakarta Sans', 'fonte_texto' => 'Inter', 'estilo_cantos' => 'suave'],
        // Paletas prontas (nome, cor principal, cor de destaque); a primeira é a do tema
        'paletas' => [['Azul', '#111827', '#2563EB'], ['Verde', '#064E3B', '#F59E0B'], ['Roxo', '#2E1065', '#F472B6'], ['Vermelho', '#1F1F1F', '#DC2626']],
        'slogan' => '',
        'descricao_loja' => 'Bem-vindo à nossa loja!',
        'categorias' => [],
        'cores' => [['Preto', '#111111'], ['Branco', '#FFFFFF']],
        'grades' => [$letras],
        'especificacoes' => [],
        'guia_medidas' => null,
        'exemplos' => [['nome' => 'Produto 1', 'preco' => 99.9], ['nome' => 'Produto 2', 'preco' => 149.9], ['nome' => 'Produto 3', 'preco' => 59.9], ['nome' => 'Produto 4', 'preco' => 199.9]],
    ],
];
