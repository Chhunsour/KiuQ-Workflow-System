<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Profile extends Model
{
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'id',
        'full_name',
        'email',
        'role',
        'status',
        'notes',
    ];

    public function websites(): HasMany
    {
        return $this->hasMany(Website::class, 'created_by');
    }

    public function ebayFollowups(): HasMany
    {
        return $this->hasMany(EbayClickFollowup::class, 'user_id');
    }

    public function taskAssignments(): HasMany
    {
        return $this->hasMany(PromptAssignment::class, 'assigned_member_id');
    }

    public function qualityIssues(): HasMany
    {
        return $this->hasMany(QualityIssue::class, 'assigned_to');
    }
}
