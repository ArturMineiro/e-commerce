<?php

namespace App\Http\Controllers;

use App\Models\Cor;
use Illuminate\Http\Request;

class CorController extends Controller
{
    private function regras(): array
    {
        return [
            'nome' => 'required|string|max:50',
            'codigo_hex' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }

    public function index()
    {
        return response()->json(Cor::orderBy('nome')->get());
    }

    public function store(Request $request)
    {
        return response()->json(Cor::create($request->validate($this->regras())), 201);
    }

    public function update(Request $request, $id)
    {
        $cor = Cor::findOrFail($id);
        $cor->update($request->validate($this->regras()));

        return response()->json($cor);
    }

    public function destroy($id)
    {
        Cor::findOrFail($id)->delete();

        return response()->json(['message' => 'Cor removida']);
    }
}
