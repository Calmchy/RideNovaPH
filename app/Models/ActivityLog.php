<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Append-only audit trail of sensitive admin actions (who did what, to what, when). */
class ActivityLog extends Model
{
    protected $fillable = ['user_id', 'action', 'subject_type', 'subject_id', 'meta', 'ip_address'];

    protected function casts(): array
    {
        return ['meta' => 'array'];
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** Record one action. $subject is optional (any model). */
    public static function record(?User $actor, string $action, ?Model $subject = null, array $meta = []): void
    {
        static::create([
            'user_id' => $actor?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'meta' => $meta ?: null,
            'ip_address' => request()?->ip(),
        ]);
    }
}
