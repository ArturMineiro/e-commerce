<?php

namespace App\Http\Controllers;

use App\Models\Cor;
use Illuminate\Http\Request;

class CorController extends Controller
{
    public function index()
    {
        $cores = Cor::all();
        return response()->json($cores);
    }

    public function cadastrarCor(Request $request)
    {
        $validated = $request->validate([
            'nome' => 'required|string|max:50',
            'codigo_hex' => 'nullable|string|max:7',
        ]);

        $cor = Cor::create($validated);
        return response()->json($cor, 201);
    }

    public function mostrarCor($id)
    {
        $cor = Cor::findOrFail($id);
        return response()->json($cor);
    }

    public function atualizarCor(Request $request, $id)
    {
        $cor = Cor::findOrFail($id);

        $validated = $request->validate([
            'nome' => 'required|string|max:50',
            'codigo_hex' => 'nullable|string|max:7',
        ]);

        $cor->update($validated);
        return response()->json($cor);
    }

    public function apagarCor($id)
    {
        $cor = Cor::findOrFail($id);
        $cor->delete();

        return response()->json(['message' => 'Cor deletada com sucesso']);
    }
}
