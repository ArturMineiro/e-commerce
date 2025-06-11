<?php

namespace App\Http\Controllers;

use App\Models\Modelo;
use Illuminate\Http\Request;

class ModeloController extends Controller
{
    // Listar todos os modelos
    public function index()
    {
        $modelos = Modelo::with(['produto', 'cor'])->get();
        return response()->json($modelos);
    }

    // Criar um novo modelo
    public function criarModelo(Request $request)
    {
        $validatedData = $request->validate([
            'produto_id' => 'required|exists:produtos,id',
            'cor_id' => 'nullable|exists:cores,id',
            'tamanho' => 'nullable|string|max:50',
            'preco' => 'nullable|numeric',
            'quantidade' => 'required|integer|min:0',
        ]);

        $modelo = Modelo::create($validatedData);

        return response()->json(['message' => 'Modelo criado com sucesso', 'modelo' => $modelo], 201);
    }

    // Mostrar um modelo específico
    public function mostrarModelo($id)
    {
        $modelo = Modelo::with(['produto', 'cor'])->findOrFail($id);
        return response()->json($modelo);
    }

    // Atualizar modelo
    public function atualizarModelo(Request $request, $id)
    {
        $modelo = Modelo::findOrFail($id);

        $validatedData = $request->validate([
            
            'produto_id' => 'required|exists:produtos,id',
            'cor_id' => 'nullable|exists:cores,id',
            'tamanho' => 'nullable|string|max:50',
            'preco' => 'nullable|numeric',
            'quantidade' => 'required|integer|min:0',
        ]);

        $modelo->update($validatedData);

        return response()->json(['message' => 'Modelo atualizado com sucesso', 'modelo' => $modelo]);
    }

    // Deletar modelo
    public function deletarModelo($id)
    {
        $modelo = Modelo::findOrFail($id);
        $modelo->delete();

        return response()->json(['message' => 'Modelo deletado com sucesso'], 204);
    }
}
