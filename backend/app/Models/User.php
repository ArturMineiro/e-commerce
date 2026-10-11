<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    use Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'email_verified_at',
    ];

    public function getJWTIdentifier()
    {
        return $this->getKey();
    }

    public function getJWTCustomClaims()
    {
        return [
            'role' => $this->role,
            'name' => $this->name,
            'email' => $this->email,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /** Usa o e-mail em português com link para o front (React). */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new \App\Notifications\RedefinirSenha($token));
    }

    public function favoritos()
    {
        return $this->belongsToMany(Produto::class, 'favoritos')->withTimestamps();
    }

    public function pedidos()
    {
        return $this->hasMany(Pedido::class);
    }
}
