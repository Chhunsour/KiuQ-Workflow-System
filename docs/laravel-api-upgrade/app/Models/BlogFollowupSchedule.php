<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlogFollowupSchedule extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'website_id',
        'schedule_type',
        'weekdays',
        'monthly_days',
        'monthly_target',
        'custom_dates',
    ];

    protected $casts = [
        'weekdays' => 'array',
        'monthly_days' => 'array',
        'custom_dates' => 'array',
    ];

    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class, 'website_id');
    }
}
