<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProdutoController extends Controller
{
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
        $validatedData = $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'preco' => 'required|numeric',
            'quantidade' => 'required|integer',
            'categoria' => 'nullable|string|max:255',
            'imagens' => 'nullable|array',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:2048', // validação de imagem
        ]);
    
        $imagePaths = [];
    
        if ($request->hasFile('imagens')) {
            foreach ($request->file('imagens') as $image) {
                $path = $image->store('imagens', 'public'); // Ajustado para 'imagens'
                $imagePaths[] = $path;
            }
        }
    
        $validatedData['imagens'] = json_encode($imagePaths); // Salvar os caminhos das imagens como JSON
    
        $produto = Produto::create($validatedData);
    
        return response()->json(['message' => 'Produto cadastrado com sucesso']);
    }
    
    public function mostrarProdutos($id)
    {
        $produto = Produto::findOrFail($id);
        return response()->json($produto);
    }

    public function atualizarProduto(Request $request, $id)
    {
        $validatedData = $request->validate([
            'nome' => 'sometimes|required|string|max:255',
            'descricao' => 'nullable|string',
            'preco' => 'sometimes|required|numeric',
            'quantidade' => 'sometimes|required|integer',
            'categoria'  => 'nullable|string|max:255',
            'imagens' => 'nullable|array',
        ]);
    
        $produto = Produto::findOrFail($id);
        $produto->update($validatedData);
    
        return response()->json($produto);
    }
    
    public function deletarProduto($id)
    {
        $produto = Produto::findOrFail($id);
        $produto->delete();
        return response()->json(null, 204);
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
