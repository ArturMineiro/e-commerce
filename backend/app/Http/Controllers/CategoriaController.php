<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;

class CategoriaController extends Controller
{
    public function index()
    {
        return response()->json(Categoria::withCount('produtos')->orderBy('nome')->get());
    }

    public function show($id)
    {
        return response()->json(Categoria::findOrFail($id));
    }

    public function store(Request $request)
    {
        $dados = $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string|max:1000',
        ]);

        return response()->json(Categoria::create($dados), 201);
    }

    public function update(Request $request, $id)
    {
        $categoria = Categoria::findOrFail($id);
        $categoria->update($request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string|max:1000',
        ]));

        return response()->json($categoria);
    }

    /** Os produtos da categoria NÃO são apagados (ficam sem categoria). */
    public function destroy($id)
    {
        Categoria::findOrFail($id)->delete();

        return response()->json(['message' => 'Categoria removida']);
    }
}
