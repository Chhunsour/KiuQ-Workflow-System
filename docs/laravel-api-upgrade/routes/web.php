<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\WebsitesSummaryController;

/*
|--------------------------------------------------------------------------
| API Routes - "All Websites" Management Hub Upgrade
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

// Protect this endpoint with secure token-based authentication using Laravel Sanctum.
// Tokens can be issued via user->createToken('token-name')->plainTextToken.
Route::middleware('auth:sanctum')->prefix('v1')->group(function () {
    
    /**
     * GET /api/v1/websites-summary
     * 
     * Query Parameters:
     * - range:      Filters dates relative to today ('day', 'week', 'month', 'all').
     * - start_date: Custom range start date (YYYY-MM-DD).
     * - end_date:   Custom range end date (YYYY-MM-DD).
     */
    Route::get('/websites-summary', [WebsitesSummaryController::class, 'index']);
Route::get('/generate-api-token', function () {
    // Find your admin user (change the email if needed)
    $user = \App\Models\User::where('email', 'admin@kiuq.net')->first();
    
    if (!$user) {
        return "User not found. Please check the email address.";
    }

    // Create a new token
    $token = $user->createToken('dgt-hub-token')->plainTextToken;
    
    return "Your API Token is: <strong>" . $token . "</strong><br><br><em>(Please copy this and then remove this route for security!)</em>";
});

});
