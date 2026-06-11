<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Profiles Table
        if (!Schema::hasTable('profiles')) {
            Schema::create('profiles', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('full_name');
                $table->string('email')->unique();
                $table->string('role')->default('member'); // admin, member, supervisor, viewer, tester, employee, quality_checker
                $table->string('status')->default('active'); // active, inactive
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index('role');
                $table->index('status');
            });
        }

        // 2. Websites Table
        if (!Schema::hasTable('websites')) {
            Schema::create('websites', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('name');
                $table->string('domain')->index();
                $table->string('website_type')->nullable();
                $table->string('status')->default('in_development'); // in_development, active, inactive
                $table->uuid('created_by')->nullable();
                $table->timestamps();

                $table->foreign('created_by')->references('id')->on('profiles')->onDelete('set null');
                $table->index(['status', 'created_by']);
            });
        }

        // 3. Blog Followup Schedules Table
        if (!Schema::hasTable('blog_followup_schedules')) {
            Schema::create('blog_followup_schedules', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('website_id')->unique();
                $table->string('schedule_type')->default('weekly'); // weekly, monthly, custom
                $table->json('weekdays')->nullable(); // JSON array of numbers [0..6] (e.g., [2, 6] for Tue, Sat)
                $table->json('monthly_days')->nullable(); // JSON array of day-of-month numbers [1..31]
                $table->integer('monthly_target')->nullable(); // count per calendar month (legacy fallback)
                $table->json('custom_dates')->nullable(); // JSON array of explicit ISO date strings
                $table->timestamps();

                $table->foreign('website_id')->references('id')->on('websites')->onDelete('cascade');
            });
        }

        // 4. Blog Upload Slots Table (Followup checklists)
        if (!Schema::hasTable('blog_upload_slots')) {
            Schema::create('blog_upload_slots', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('website_id');
                $table->date('scheduled_date');
                $table->string('status')->default('pending'); // pending, done, missed, late
                $table->string('blog_title')->nullable();
                $table->string('blog_url')->nullable();
                $table->uuid('completed_by')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->foreign('website_id')->references('id')->on('websites')->onDelete('cascade');
                $table->foreign('completed_by')->references('id')->on('profiles')->onDelete('set null');
                $table->unique(['website_id', 'scheduled_date']);
                $table->index(['scheduled_date', 'status']);
            });
        }

        // 5. Plugin Update Slots Table (Weekly plugin update logs)
        if (!Schema::hasTable('plugin_update_slots')) {
            Schema::create('plugin_update_slots', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('website_id');
                $table->date('week_start'); // Monday of the ISO week
                $table->string('status')->default('pending'); // pending, done, missed, needs_attention
                $table->string('check_result')->nullable(); // no_updates_needed, updated_successfully, etc.
                $table->integer('plugins_updated_count')->nullable();
                $table->uuid('completed_by')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->foreign('website_id')->references('id')->on('websites')->onDelete('cascade');
                $table->foreign('completed_by')->references('id')->on('profiles')->onDelete('set null');
                $table->unique(['website_id', 'week_start']);
                $table->index(['week_start', 'status']);
            });
        }

        // 6. Speed Optimization Slots Table (Website Speed Optimization Logs)
        if (!Schema::hasTable('speed_optimization_slots')) {
            Schema::create('speed_optimization_slots', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('website_id');
                $table->date('week_start'); // Monday of the ISO week
                $table->string('status')->default('pending'); // pending, done, missed, needs_attention
                $table->integer('before_score')->nullable();
                $table->integer('after_score')->nullable();
                $table->uuid('completed_by')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->foreign('website_id')->references('id')->on('websites')->onDelete('cascade');
                $table->foreign('completed_by')->references('id')->on('profiles')->onDelete('set null');
                $table->unique(['website_id', 'week_start']);
                $table->index(['week_start', 'status']);
            });
        }

        // 7. eBay Click Followup Table
        if (!Schema::hasTable('ebay_click_followup')) {
            Schema::create('ebay_click_followup', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('user_id');
                $table->date('date');
                $table->string('day_name');
                $table->string('status')->default('done'); // done, missed
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();

                $table->foreign('user_id')->references('id')->on('profiles')->onDelete('cascade');
                $table->unique(['user_id', 'date']);
                $table->index(['date', 'status']);
            });
        }

        // 8. Prompt Assignments Table (Member Board Tasks)
        if (!Schema::hasTable('prompt_assignments')) {
            Schema::create('prompt_assignments', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('website_id')->nullable();
                $table->uuid('assigned_member_id');
                $table->string('title')->nullable();
                $table->string('status')->default('pending'); // pending, in_progress, submitted, approved, needs_fix, postponed, etc.
                $table->timestamp('assigned_at')->nullable();
                $table->timestamps();

                $table->foreign('website_id')->references('id')->on('websites')->onDelete('set null');
                $table->foreign('assigned_member_id')->references('id')->on('profiles')->onDelete('cascade');
                $table->index(['website_id', 'status']);
                $table->index('assigned_member_id');
            });
        }

        // 9. Quality Issues Table (Quality Check board)
        if (!Schema::hasTable('quality_issues')) {
            Schema::create('quality_issues', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->uuid('website_id');
                $table->string('title');
                $table->string('status')->default('new_issue'); // new_issue, in_progress, fixed, needs_review, approved
                $table->uuid('assigned_to')->nullable();
                $table->timestamps();

                $table->foreign('website_id')->references('id')->on('websites')->onDelete('cascade');
                $table->foreign('assigned_to')->references('id')->on('profiles')->onDelete('set null');
                $table->index(['website_id', 'status']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quality_issues');
        Schema::dropIfExists('prompt_assignments');
        Schema::dropIfExists('ebay_click_followup');
        Schema::dropIfExists('speed_optimization_slots');
        Schema::dropIfExists('plugin_update_slots');
        Schema::dropIfExists('blog_upload_slots');
        Schema::dropIfExists('blog_followup_schedules');
        Schema::dropIfExists('websites');
        Schema::dropIfExists('profiles');
    }
};
