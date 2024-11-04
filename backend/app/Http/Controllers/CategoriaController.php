<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;

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

        $categoria = Categoria::create($validatedData);

        return response()->json($categoria, 201);
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
        $validatedData = $request->validate([
            'nome' => 'required|string|max:255',
        ]);

        $categoria = Categoria::findOrFail($id);
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
