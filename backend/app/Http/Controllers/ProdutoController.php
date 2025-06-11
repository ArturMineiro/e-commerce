<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

class ProdutoController extends Controller
{
    public function favoritos($userId)
    {
        try {
            // Buscar produtos favoritados pelo usuário (assumindo relação 'favoritos' em User)
            $favoritos = User::findOrFail($userId)->favoritos;
            return response()->json($favoritos);
        } catch (\Exception $e) {
            \Log::error('Erro ao buscar produtos favoritados: ' . $e->getMessage());
            return response()->json(['message' => 'Erro ao buscar favoritos'], 500);
        }
    }

    public function index()
    {
        try {
            $produtos = Produto::with('modelos.cor')->get();

            $produtos->map(function ($produto) {
                if (is_string($produto->imagens)) {
                    $produto->imagens = json_decode($produto->imagens, true);
                } else {
                    \Log::error('O campo imagens não é uma string JSON válida.');
                    $produto->imagens = [];
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
            'preco' => 'nullable|numeric', // Preço agora fica por modelo
            'quantidade' => 'nullable|integer', // Quantidade por modelo
            'categoria_id' => 'nullable|exists:categorias,id',
            'imagens' => 'nullable|array',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'modelos' => 'required|array',
            'modelos.*.cor_id' => 'required|exists:cores,id',
            'modelos.*.tamanho' => 'required|string',
            'modelos.*.preco' => 'required|numeric',
            'modelos.*.quantidade' => 'required|integer',
        ]);

        $produto = new Produto();
        $produto->nome = $validatedData['nome'];
        $produto->descricao = $validatedData['descricao'] ?? null;
        $produto->categoria_id = $validatedData['categoria_id'] ?? null;

        // Processar imagens
        if ($request->hasFile('imagens')) {
            $imagens = [];
            foreach ($request->file('imagens') as $image) {
                $path = $image->store('imagens', 'public');
                $imagens[] = $path;
            }
            $produto->imagens = json_encode($imagens);
        }

        $produto->save();

        // Criar os modelos associados
        foreach ($validatedData['modelos'] as $modeloData) {
            $produto->modelos()->create([
                'cor_id' => $modeloData['cor_id'],
                'tamanho' => $modeloData['tamanho'],
                'preco' => $modeloData['preco'],
                'quantidade' => $modeloData['quantidade'],
            ]);
        }

        return response()->json([
            'message' => 'Produto e modelos criados com sucesso',
            'produto' => $produto->load('modelos.cor'),
        ], 201);
    }

    public function mostrarProdutos($id)
    {
        $produto = Produto::with('modelos.cor')->findOrFail($id);

        if (is_string($produto->imagens)) {
            $produto->imagens = json_decode($produto->imagens, true);
        } else {
            $produto->imagens = [];
        }

        return response()->json($produto);
    }

    public function atualizarProduto(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);

        $validatedData = $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'categoria_id' => 'nullable|exists:categorias,id',
            'imagens' => 'nullable|array',
            'imagens.*' => 'image|mimes:jpeg,png,jpg,gif,svg|max:2048',
            'modelos' => 'nullable|array',
            'modelos.*.id' => 'nullable|exists:modelos,id', // Para atualizar modelos existentes
            'modelos.*.cor_id' => 'required_with:modelos|exists:cores,id',
            'modelos.*.tamanho' => 'required_with:modelos|string',
            'modelos.*.preco' => 'required_with:modelos|numeric',
            'modelos.*.quantidade' => 'required_with:modelos|integer',
        ]);

        // Atualiza dados básicos do produto
        $produto->update([
            'nome' => $validatedData['nome'],
            'descricao' => $validatedData['descricao'] ?? $produto->descricao,
            'categoria_id' => $validatedData['categoria_id'] ?? $produto->categoria_id,
        ]);

        // Atualizar imagens (adiciona imagens novas se fornecidas)
        if ($request->hasFile('imagens')) {
            $imagensExistentes = json_decode($produto->imagens, true) ?? [];
            foreach ($request->file('imagens') as $image) {
                $path = $image->store('imagens', 'public');
                $imagensExistentes[] = $path;
            }
            $produto->imagens = json_encode($imagensExistentes);
            $produto->save();
        }

        // Atualizar modelos (se enviados)
        if (!empty($validatedData['modelos'])) {
            foreach ($validatedData['modelos'] as $modeloData) {
                if (!empty($modeloData['id'])) {
                    // Atualiza modelo existente
                    $modelo = $produto->modelos()->find($modeloData['id']);
                    if ($modelo) {
                        $modelo->update([
                            'cor_id' => $modeloData['cor_id'],
                            'tamanho' => $modeloData['tamanho'],
                            'preco' => $modeloData['preco'],
                            'quantidade' => $modeloData['quantidade'],
                        ]);
                    }
                } else {
                    // Cria novo modelo
                    $produto->modelos()->create([
                        'cor_id' => $modeloData['cor_id'],
                        'tamanho' => $modeloData['tamanho'],
                        'preco' => $modeloData['preco'],
                        'quantidade' => $modeloData['quantidade'],
                    ]);
                }
            }
        }

        return response()->json($produto->load('modelos.cor'));
    }

    public function deletarProduto($id)
    {
        $produto = Produto::findOrFail($id);

        if (!empty($produto->imagens)) {
            $imagens = json_decode($produto->imagens, true);

            foreach ($imagens as $imagem) {
                Storage::delete('public/' . $imagem);
            }
        }

        // Deletar todos os modelos relacionados primeiro (se quiser)
        $produto->modelos()->delete();

        $produto->delete();

        return response()->json(['message' => 'Produto e imagens deletados com sucesso'], 204);
    }

    public function deletarImagem(Request $request, $id)
    {
        $produto = Produto::findOrFail($id);

        $validatedData = $request->validate([
            'imagem_index' => 'required|integer',
        ]);

        $imagens = json_decode($produto->imagens, true) ?? [];

        if (!isset($imagens[$validatedData['imagem_index']])) {
            return response()->json(['message' => 'Índice da imagem inválido'], 400);
        }

        $imagemRemovida = $imagens[$validatedData['imagem_index']];
        unset($imagens[$validatedData['imagem_index']]);

        $produto->imagens = json_encode(array_values($imagens));
        $produto->save();

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

        $imagensExistentes = json_decode($produto->imagens, true) ?? [];
        $imagensAtualizadas = array_merge($imagensExistentes, $imagePaths);

        $produto->imagens = json_encode($imagensAtualizadas);
        $produto->save();

        return response()->json(['message' => 'Imagens adicionadas com sucesso']);
    }
}
