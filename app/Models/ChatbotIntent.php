<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatbotIntent extends Model
{
    protected $fillable = ['name', 'answer', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function keywords(): HasMany
    {
        return $this->hasMany(ChatbotKeyword::class, 'intent_id');
    }

    /**
     * Find the reply for a user's message.
     * Whole-word matching (so "id" never fires inside "paid"), and when several
     * intents match, the one with the MOST matching keywords wins.
     */
    public static function replyFor(string $message): ?string
    {
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($message), -1, PREG_SPLIT_NO_EMPTY) ?: [];

        if ($words === []) {
            return null;
        }

        // Count matching keywords per intent with a plain GROUP BY (portable on SQLite and MySQL),
        // then take the best active intent. Ties go to the oldest intent.
        $best = ChatbotKeyword::query()
            ->whereIn('keyword', $words)
            ->whereIn('intent_id', static::query()->where('is_active', true)->select('id'))
            ->selectRaw('intent_id, COUNT(*) as matched')
            ->groupBy('intent_id')
            ->orderByDesc('matched')
            ->orderBy('intent_id')
            ->first();

        return $best ? static::query()->whereKey($best->intent_id)->value('answer') : null;
    }
}