<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BlogUploadSlot extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'website_id',
        'scheduled_date',
        'status',
        'blog_title',
        'blog_url',
        'completed_by',
        'completed_at',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
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
