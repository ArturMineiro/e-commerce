<?php

namespace App\Http\Controllers;

use App\Models\Produto;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function search(Request $request){
    $request->validate([
        'query' => 'required|string|max:255',
    ]);
    $query = $request->input('query');


    $produtos = Produto::where('nome','LIKE', "%{$query}%")
                            ->orWhere('descricao', 'Like', "%{$query}%")
                            ->get();
                    return response()->json($produtos);
                        }
}
