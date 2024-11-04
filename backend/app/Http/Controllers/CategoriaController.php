<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CategoriaController extends Controller
{
    // Exibir todas as categorias
    public function exibirCategoria()
    {
        $categorias = Categoria::all();
        return response()->json($categorias);
    }

    // Criar uma nova categoria
    public function criarCategoria(Request $request)
{
    $validatedData = $request->validate([
        'nome' => 'required|string|max:255',
    ]);

    $categoria = new Categoria();
    $categoria->nome = $validatedData['nome'];
    $categoria->save(); // Remove a atribuição do user_id

    return response()->json(['message' => 'Categoria criada com sucesso'], 201);
}

    

    // Mostrar uma categoria específica
    public function mostrarCategoria($id)
    {
        $categoria = Categoria::findOrFail($id);
        return response()->json($categoria);
    }

    // Atualizar uma categoria existente
    public function atualizarCategoria(Request $request, $id)
    {
        $categoria = Categoria::findOrFail($id);

        $validatedData = $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'identificador_amigavel' => 'required|string|unique:categorias,identificador_amigavel,' . $id,
            'imagem' => 'nullable|string',
            'categoria_pai_id' => 'nullable|exists:categorias,id',
        ]);

        $categoria->update($validatedData);

        return response()->json($categoria);
    }

    // Excluir uma categoria
    public function excluirCategoria($id)
    {
        $categoria = Categoria::findOrFail($id);
        $categoria->delete();

        return response()->json(null, 204);
    }
}
