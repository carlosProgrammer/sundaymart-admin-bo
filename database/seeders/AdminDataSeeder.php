<?php

namespace Database\Seeders;

use App\Models\Admin;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $data = [
            [
                'id' => 1,
                'name' => 'System',
                'surname' => 'Administrator',
                'email' => 'kkobtk@gmail.com',
                'password' => Hash::make('admin1234'),
                'active' => 1,
                'id_role' => 1,
            ]
        ];

        foreach ($data as $value) {
            Admin::firstOrCreate(['id' => $value['id']],$value);
        }
    }
}
