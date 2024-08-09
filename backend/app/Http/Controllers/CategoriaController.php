<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoriaController extends Controller
{
    public function index()
    {
        $categorias = Categoria::with('subcategoria')->get();
        return response()->json($categorias);
    }

    public function store(Request $request){
        $validateData = $request->validate([
            'nome' => 'required|string|max:255',
            'descricao' => 'nullable|string',
            'identificador_amigavel' =>'nullable|string|unique:categorias,identificador_amigavel',
            'imagem' => 'nullable|string',
            'categoria_pai_id' => 'nullable|exists:categoria,id',
        ]);

        if(empty($validateData['identificador_amigavel'])){
            $validateData['identificador_amigavel'] = Str::slug($validateData['nome']);
        }
        $categoria = Categoria::create($validateData);

        return response()->json($categoria,201);

    }

    public function show($id){
        $categoria = Categoria::with('subcategorias')->FindOrFail($id);
        return response()->json($categoria);
  
    }

    public function update(Request $request,$id){
      $validateData = $request->validate([
        'nome' => 'sometimes|required|string|max:255',
        'descricao' => 'nullable|string',
        'identificador_amigavel' => 'sometimes|required|string|unique:categorias,indetificador_amigavel,'. $id,
        'imagem'  => 'nullable|string',
        'categoria_pai_id' => 'nullable|exists:categorias,id',
        
      ]);
       $categoria = Categoria::FindOrFail($id);
       $categoria->update($validateData);

       return response()->json($categoria);
     
    }
    public function destroy($id){
        $categoria = Categoria::findOrFail($id);
        $categoria->delete();
        return response()->json(null,204);
    }

}

