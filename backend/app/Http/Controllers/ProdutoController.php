<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\Categoria;

class ProdutoController extends Controller
{

    public function favoritos($userId)
{
    try {
        // Busca os produtos favoritados pelo usuário (essa relação deve ser definida no modelo Produto ou User)
        $favoritos = User::findOrFail($userId)->favoritos; // Assumindo que há uma relação "favoritos"
        return response()->json($favoritos);
    } catch (\Exception $e) {
        \Log::error('Erro ao buscar produtos favoritados: ' . $e->getMessage());
        return response()->json(['message' => 'Erro ao buscar favoritos'], 500);
    }
}
    public function index()
    {
        try {
            $produtos = Produto::all();
        
            // Atualizar os caminhos das imagens
            $produtos->map(function ($produto) {
                // Verifica se o campo 'imagens' é uma string antes de decodificar
                if (is_string($produto->imagens)) {
                    $produto->imagens = json_decode($produto->imagens, true);
                } else {
                    \Log::error('O campo imagens não é uma string JSON válida.');
                    $produto->imagens = []; // Definir um valor padrão se não for uma string JSON
                }
                return $produto;
            });
        
            return response()->json($produtos);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar produtos: ' . $e->getMessage());
            return response()->json(['message' => 'Erro interno do servidor'], 500);
        }
    }
    
    public function criarProdutos(Request $request)
    {
        // Validação dos dados do produto
        $validatedData = $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'preco' => 'required|numeric',
            'quantidade' => 'required|integer',
            'categoria_id' => 'nullable|exists:categorias,id', // Certifique-se que a categoria está no banco
            'imagens' => 'nullable|array',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:2048', // Validação das imagens
        ]);
    
        // Criação do produto
        $produto = new Produto();
        $produto->nome = $validatedData['nome'];
        $produto->descricao = $validatedData['descricao'];
        $produto->preco = $validatedData['preco'];
        $produto->quantidade = $validatedData['quantidade'];
        $produto->categoria_id = $validatedData['categoria_id'];
    
        // Processando imagens, se houver
        if ($request->hasFile('imagens')) {
            $imagens = [];
            foreach ($request->file('imagens') as $image) {
                $path = $image->store('imagens', 'public');
                $imagens[] = $path;
            }
            // Salvando o caminho das imagens no banco de dados
            $produto->imagens = json_encode($imagens);
        }
    
        // Salvando o produto no banco de dados
        $produto->save();
    
        return response()->json(['message' => 'Produto cadastrado com sucesso', 'produto' => $produto], 201);
    }
    
    
    public function mostrarProdutos($id)
    {
        $produto = Produto::findOrFail($id);
        return response()->json($produto);
    }

    public function atualizarProduto(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);
    
        // Validar os dados recebidos
        $validatedData = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'descricao' => 'nullable|string',
            'preco' => 'sometimes|required|numeric',
            'quantidade' => 'sometimes|required|integer',
            'categoria' => 'nullable|string|max:255',
            'imagens' => 'nullable|array',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        // Se novas imagens forem enviadas, fazer o upload delas
        if ($request->hasFile('imagens')) {
            $existingImages = json_decode($produto->imagens, true) ?? [];
            $newImages = [];

            foreach ($request->file('imagens') as $image) {
                $path = $image->store('imagens', 'public');
                $newImages[] = $path;
            }

            // Mesclar as novas imagens com as existentes
            $mergedImages = array_merge($existingImages, $newImages);
            $produto->imagens = json_encode($mergedImages);
        }

        // Atualizar os outros campos
        $produto->update($validatedData);

        return response()->json(['message' => 'Produto atualizado com sucesso']);
    }

    
    public function deletarProduto($id)
{
    $produto = Produto::findOrFail($id);

    // Verifica se o produto tem imagens associadas
    if (!empty($produto->imagens)) {
        $imagens = json_decode($produto->imagens, true);

        // Excluir cada imagem do sistema de arquivos
        foreach ($imagens as $imagem) {
            Storage::delete('public/' . $imagem);
        }
    }

    // Deletar o produto do banco de dados
    $produto->delete();

    return response()->json(['message' => 'Produto e imagens deletados com sucesso'], 204);
}


    public function deletarImagem(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);

        // Valida que o índice da imagem a ser deletada foi passado
        $validatedData = $request->validate([
            'imagem_index' => 'required|integer',
        ]);

        // Exemplo de código corrigido para remover a imagem
        $imagens = json_decode($produto->imagens, true) ?? [];

        // Verificar se o índice da imagem é válido
        if (!isset($imagens[$validatedData['imagem_index']])) {
            return response()->json(['message' => 'Índice da imagem inválido'], 400);
        }

        // Remove a imagem do array
        $imagemRemovida = $imagens[$validatedData['imagem_index']];
        unset($imagens[$validatedData['imagem_index']]);

        // Reindexar o array e salvar novamente
        $produto->imagens = json_encode(array_values($imagens));
        $produto->save();

        // Opcional: Excluir a imagem do sistema de arquivos
        Storage::delete('public/' . $imagemRemovida);

        return response()->json(['message' => 'Imagem removida com sucesso']);
    }

    public function adicionarImagens(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);

        $validatedData = $request->validate([
            'imagens' => 'required|array',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $imagePaths = [];

        if ($request->hasFile('imagens')) {
            foreach ($request->file('imagens') as $image) {
                $path = $image->store('imagens', 'public');
                $imagePaths[] = $path;
            }
        }

        // Adicionar as novas imagens ao array existente
        $imagensExistentes = json_decode($produto->imagens, true) ?? [];
        $imagensAtualizadas = array_merge($imagensExistentes, $imagePaths);
        $produto->imagens = json_encode($imagensAtualizadas);
        $produto->save();

        return response()->json(['message' => 'Imagens adicionadas com sucesso']);
    }
}
