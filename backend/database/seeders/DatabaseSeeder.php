<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * php artisan db:seed
     */
    public function run()
    {
        $this->call(UsuariosSeeder::class);
    }
}
