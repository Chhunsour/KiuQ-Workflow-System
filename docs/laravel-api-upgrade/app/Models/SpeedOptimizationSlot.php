<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SpeedOptimizationSlot extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'website_id',
        'week_start',
        'status',
        'before_score',
        'after_score',
        'completed_by',
        'completed_at',
    ];

    protected $casts = [
        'week_start' => 'date',
        'completed_at' => 'datetime',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class, 'website_id');
    }

    public function completedByMember(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'completed_by');
    }
}
