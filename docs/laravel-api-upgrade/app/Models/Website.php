<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Website extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'name',
        'domain',
        'website_type',
        'status',
        'created_by',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(Profile::class, 'created_by');
    }

    public function blogSchedule(): HasOne
    {
        return $this->hasOne(BlogFollowupSchedule::class, 'website_id');
    }

    public function blogSlots(): HasMany
    {
        return $this->hasMany(BlogUploadSlot::class, 'website_id');
    }

    public function pluginSlots(): HasMany
    {
        return $this->hasMany(PluginUpdateSlot::class, 'website_id');
    }

    public function speedSlots(): HasMany
    {
        return $this->hasMany(SpeedOptimizationSlot::class, 'website_id');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(PromptAssignment::class, 'website_id');
    }

    public function qualityIssues(): HasMany
    {
        return $this->hasMany(QualityIssue::class, 'website_id');
    }

    /**
     * Cross-reference eBay Click followups via the website owner/creator.
     */
    public function ebayFollowups(): HasMany
    {
        return $this->hasMany(EbayClickFollowup::class, 'user_id', 'created_by');
    }
}
