<?php

namespace App\Models;

use App\Models\Concerns\PertenceALoja;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Tymon\JWTAuth\Contracts\JWTSubject;

/**
 * Usuários são por loja: o mesmo e-mail pode ter conta (e senha) diferente em cada loja.
 * role: customer | admin (dono/equipe da loja) | superadmin (plataforma, sem loja).
 */
class User extends Authenticatable implements JWTSubject
{
    use Notifiable;
    use PertenceALoja;

    public const SUPERADMIN = 'superadmin';

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

    protected $casts = [
        'loja_id' => 'integer',
    ];

    public function exigeLoja(): bool
    {
        return $this->role !== self::SUPERADMIN;
    }

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
            'loja' => $this->loja_id,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isSuperadmin(): bool
    {
        return $this->role === self::SUPERADMIN && $this->loja_id === null;
    }

    /**
     * Chave do token de "esqueci minha senha". Inclui a loja porque o mesmo e-mail
     * pode existir em várias lojas (a tabela password_resets é indexada só pelo e-mail).
     */
    public function getEmailForPasswordReset()
    {
        return ($this->loja_id ?? 'plataforma') . '|' . $this->email;
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
