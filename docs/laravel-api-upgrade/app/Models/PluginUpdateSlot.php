<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PluginUpdateSlot extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'website_id',
        'week_start',
        'status',
        'check_result',
        'plugins_updated_count',
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
