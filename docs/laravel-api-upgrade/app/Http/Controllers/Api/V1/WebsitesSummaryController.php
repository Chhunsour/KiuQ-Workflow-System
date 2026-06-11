<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Http\JsonResponse;

class WebsitesSummaryController extends Controller
{
    /**
     * Get a comprehensive summary of all websites, including their profiles,
     * follow-up metrics, member board tasks, and quality check counters.
     *
     * Supports filtering relations by day, week, month, or a custom date range.
     */
    public function index(Request $request): JsonResponse
    {
        // 1. Request Validation
        $request->validate([
            'start_date' => 'nullable|date',
            'end_date'   => 'nullable|date|after_or_equal:start_date',
            'range'      => 'nullable|string|in:day,week,month,all',
        ]);

        // 2. Resolve Date Bounds
        $startDate = null;
        $endDate   = null;

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
            $endDate   = Carbon::parse($request->input('end_date'))->endOfDay();
        } elseif ($request->filled('range')) {
            switch ($request->input('range')) {
                case 'day':
                    $startDate = Carbon::today()->startOfDay();
                    $endDate   = Carbon::today()->endOfDay();
                    break;
                case 'week':
                    $startDate = Carbon::now()->startOfWeek()->startOfDay(); // Monday
                    $endDate   = Carbon::now()->endOfWeek()->endOfDay();   // Sunday
                    break;
                case 'month':
                    $startDate = Carbon::now()->startOfMonth()->startOfDay();
                    $endDate   = Carbon::now()->endOfMonth()->endOfDay();
                    break;
                case 'all':
                default:
                    // Keep bounds as null to retrieve all history
                    break;
            }
        }

        // 3. Query with Optimized Eager Loading (prevents N+1 database queries)
        $websitesQuery = Website::with([
            'creator:id,full_name,email',
            'blogSchedule',
            'blogSlots' => function ($query) use ($startDate, $endDate) {
                if ($startDate && $endDate) {
                    $query->whereBetween('scheduled_date', [$startDate->toDateString(), $endDate->toDateString()]);
                }
                $query->orderBy('scheduled_date', 'desc');
            },
            'pluginSlots' => function ($query) use ($startDate, $endDate) {
                if ($startDate && $endDate) {
                    $query->whereBetween('week_start', [$startDate->toDateString(), $endDate->toDateString()]);
                }
                $query->orderBy('week_start', 'desc');
            },
            'speedSlots' => function ($query) use ($startDate, $endDate) {
                if ($startDate && $endDate) {
                    $query->whereBetween('week_start', [$startDate->toDateString(), $endDate->toDateString()]);
                }
                $query->orderBy('week_start', 'desc');
            },
            'ebayFollowups' => function ($query) use ($startDate, $endDate) {
                if ($startDate && $endDate) {
                    $query->whereBetween('date', [$startDate->toDateString(), $endDate->toDateString()]);
                }
                $query->orderBy('date', 'desc');
            },
            'tasks' => function ($query) use ($startDate, $endDate) {
                if ($startDate && $endDate) {
                    $query->whereBetween('updated_at', [$startDate, $endDate]);
                }
                $query->with('assignedMember:id,full_name,email');
            },
            'qualityIssues' => function ($query) use ($startDate, $endDate) {
                if ($startDate && $endDate) {
                    $query->whereBetween('created_at', [$startDate, $endDate]);
                }
            }
        ]);

        $websites = $websitesQuery->get();

        // 4. Format Payload explicitly structured by website domain/profile
        $result = $websites->map(function (Website $website) {
            // Quality Check counters
            $newIssues = $website->qualityIssues->where('status', 'new_issue')->count();
            $fixedIssues = $website->qualityIssues->where('status', 'fixed')->count();
            $approvedIssues = $website->qualityIssues->where('status', 'approved')->count();

            return [
                'id'           => $website->id,
                'name'         => $website->name,
                'domain'       => $website->domain,
                'status'       => $website->status,
                'created_by'   => $website->creator ? [
                    'id'        => $website->creator->id,
                    'name'      => $website->creator->full_name,
                    'email'     => $website->creator->email,
                ] : null,
                'followup_schedule' => $website->blogSchedule ? [
                    'type'         => $website->blogSchedule->schedule_type,
                    'weekdays'     => $website->blogSchedule->weekdays,
                    'monthly_days' => $website->blogSchedule->monthly_days,
                ] : null,
                'followups' => [
                    'ebay_click_logs' => $website->ebayFollowups->map(fn($item) => [
                        'id'           => $item->id,
                        'date'         => $item->date->toDateString(),
                        'day_name'     => $item->day_name,
                        'status'       => $item->status,
                        'completed_at' => $item->completed_at ? $item->completed_at->toIso8601String() : null,
                    ])->values()->all(),
                    'blog_audits' => $website->blogSlots->map(fn($item) => [
                        'id'             => $item->id,
                        'scheduled_date' => $item->scheduled_date->toDateString(),
                        'status'         => $item->status,
                        'blog_title'     => $item->blog_title,
                        'blog_url'       => $item->blog_url,
                    ])->values()->all(),
                    'plugin_updates' => $website->pluginSlots->map(fn($item) => [
                        'id'            => $item->id,
                        'week_start'    => $item->week_start->toDateString(),
                        'status'        => $item->status,
                        'check_result'  => $item->check_result,
                        'updated_count' => $item->plugins_updated_count,
                    ])->values()->all(),
                    'website_optimizations' => $website->speedSlots->map(fn($item) => [
                        'id'           => $item->id,
                        'week_start'   => $item->week_start->toDateString(),
                        'status'       => $item->status,
                        'before_score' => $item->before_score,
                        'after_score'  => $item->after_score,
                    ])->values()->all(),
                ],
                'tasks' => $website->tasks->map(fn($task) => [
                    'id'              => $task->id,
                    'title'           => $task->title,
                    'status'          => $this->mapTaskStatus($task->status),
                    'assigned_member' => $task->assignedMember ? [
                        'id'   => $task->assignedMember->id,
                        'name' => $task->assignedMember->full_name,
                    ] : null,
                ])->values()->all(),
                'quality_check' => [
                    'new_issues_count' => $newIssues,
                    'fixed_count'      => $fixedIssues,
                    'approved_count'   => $approvedIssues,
                ]
            ];
        });

        return response()->json([
            'success' => true,
            'count'   => $result->count(),
            'data'    => $result,
        ]);
    }

    /**
     * Map database statuses to human-readable statuses on the Work Board.
     */
    private function mapTaskStatus(string $dbStatus): string
    {
        $mapping = [
            'pending'            => 'To Do',
            'in_progress'        => 'In Progress',
            'postponed'          => 'Postpone',
            'submitted'          => 'Waiting Review',
            'needs_fix'          => 'Needs Fix',
            'approved'           => 'Completed',
            'rejected'           => 'Needs Fix',
            'needs_resubmission' => 'Needs Fix',
        ];

        return $mapping[$dbStatus] ?? 'To Do';
    }
}
