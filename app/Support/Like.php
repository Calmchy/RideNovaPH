<?php

namespace App\Support;

/** Builds a safe LIKE pattern from user input (escapes % _ and \ so "100%" can't act as a wildcard). */
class Like
{
    public static function contains(string $term): string
    {
        return '%'.addcslashes(trim($term), '%_\\').'%';
    }
}
