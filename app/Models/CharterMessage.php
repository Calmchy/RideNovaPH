<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharterMessage extends Model
{
    protected $fillable = ['charter_request_id', 'user_id', 'body'];

    public function request(): BelongsTo
    {
        return $this->belongsTo(CharterRequest::class, 'charter_request_id');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
