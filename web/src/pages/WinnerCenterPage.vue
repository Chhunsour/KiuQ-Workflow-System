<template>
  <div v-if="auth.canAccessWinnerCenter" class="wc-page">
    <!-- ══ 1. Header ══ -->
    <header class="wc-header">
      <div class="wc-header-left">
        <div class="wc-header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8S13 3 16.5 3a2.5 2.5 0 0 1 0 5"/>
          </svg>
        </div>
        <div>
          <span class="wc-kicker">Monthly Team Reward</span>
          <h1 class="wc-title">Winner Center</h1>
          <p class="wc-subtitle">Select monthly winners, manage prizes, and reward team performance.</p>
        </div>
      </div>
      <div class="wc-header-right">
        <MonthSelector v-model="selectedMonth" />
        <span v-if="store.testingModeEnabled" class="wc-testing-badge">🧪 Testing Mode Enabled</span>
        <div class="wc-header-actions">
          <button type="button" class="wc-btn-ghost" @click="openPreviewWheel">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview Wheel
          </button>
          <button type="button" class="wc-btn-ghost" @click="openCreatePrize">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Create Prize
          </button>
          <button type="button" class="wc-btn-primary" @click="scrollToReview">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Select Winner
          </button>
        </div>
      </div>
    </header>

    <!-- Retroactive warning banner -->
    <div v-if="isPastMonth && !currentWinner" class="wc-retroactive-banner">
      <div class="wc-retroactive-banner-icon">⚠️</div>
      <div class="wc-retroactive-banner-text">
        <strong>Month completed retroactively:</strong> This month is completed. You can retroactively select and approve a winner.
      </div>
    </div>

    <!-- ══ Winner Center Settings ══ -->
    <section class="wc-card wc-settings">
      <div class="wc-card-head">
        <div>
          <h2 class="wc-card-title">Winner Center Settings</h2>
          <p class="wc-card-sub">Testing mode keeps spin tests separate from production winner history.</p>
        </div>
        <span v-if="store.testingModeEnabled" class="wc-testing-badge wc-testing-badge--inline">🧪 Testing Mode Enabled</span>
      </div>

      <div class="wc-settings-grid">
        <label class="wc-setting-toggle" :class="{ 'wc-setting-toggle--disabled': !canControlTesting }">
          <input
            type="checkbox"
            :checked="store.testingModeEnabled"
            :disabled="!canControlTesting || store.settingsSaving"
            @change="onToggleTestingMode"
          />
          <span>
            <strong>Enable Testing Mode</strong>
            <span class="wc-setting-note">{{ canControlTesting ? 'Owner/Admin/Head/Supervisor control' : 'You do not have permission to change this' }}</span>
          </span>
        </label>

        <div class="wc-settings-actions">
          <button
            type="button"
            class="wc-btn-ghost"
            :disabled="!store.testingModeEnabled"
            @click="sendTestNotification"
          >
            Test Notification
          </button>
          <button
            type="button"
            class="wc-btn-ghost"
            :disabled="!store.testingModeEnabled || !canControlTesting"
            @click="clearTestSpins"
          >
            Clear Test Spins
          </button>
        </div>
      </div>
    </section>

    <!-- ══ 2. Selected Winner Card ══ -->
    <section v-if="currentWinner" class="wc-winner-card">
      <div class="wc-winner-glow" aria-hidden="true"></div>
      <div class="wc-winner-crown" aria-hidden="true">👑</div>
      <div class="wc-winner-main">
        <span class="wc-winner-avatar">
          <img v-if="winnerProfile?.avatarUrl" :src="winnerProfile.avatarUrl" :alt="winnerProfile.fullName" />
          <span v-else>{{ initials(winnerProfile?.fullName || 'Winner') }}</span>
        </span>
        <div class="wc-winner-info">
          <span class="wc-winner-badge">{{ monthLabel(currentWinner.monthKey) }} Winner</span>
          <h2 class="wc-winner-name">{{ winnerProfile?.fullName || 'Selected member' }}</h2>
          <p class="wc-winner-role">{{ winnerProfile?.position || roleLabel(winnerProfile?.role) }}</p>
          <p class="wc-winner-summary">{{ currentWinner.achievementSummary || 'Outstanding work this month.' }}</p>
          <div class="wc-winner-meta">
            <span><strong>{{ formatNumber(currentWinner.scoreSnapshot) }}</strong> points</span>
            <span>Selected by {{ selectedByLabel(currentWinner) }}</span>
            <span>{{ formatDate(currentWinner.selectedAt) }}</span>
          </div>

          <!-- Official Reward Setup panel -->
          <div v-if="currentWinner.status === 'selected' || currentWinner.status === 'approved_retroactively'" class="wc-official-setup-panel">
            <h3 class="wc-setup-heading">Official Reward Setup</h3>
            <p class="wc-setup-hint">Assign the reward first — the winner then spins to reveal it.</p>

            <div class="wc-setup-options-row">
              <label class="wc-setup-radio-label">
                <input type="radio" value="exact" v-model="officialPrizeMode" />
                <span>Owner Assigned Prize <em class="wc-setup-rec">Recommended</em></span>
              </label>

              <label class="wc-setup-radio-label">
                <input type="radio" value="random" v-model="officialPrizeMode" />
                <span>Random Equal Mode</span>
              </label>
            </div>

            <div v-if="officialPrizeMode === 'exact'" class="wc-setup-select-container">
              <label class="wc-setup-select-label">Reward to assign:</label>
              <select v-model="exactPrizeId" class="wc-setup-select">
                <option :value="null" disabled>Choose a reward…</option>
                <option v-for="prize in activePrizes" :key="prize.id" :value="prize.id">
                  {{ prize.name }}
                </option>
              </select>
            </div>

            <button
              type="button"
              class="wc-btn-ghost wc-setup-save-btn"
              :disabled="savingSetup || (officialPrizeMode === 'exact' && !exactPrizeId)"
              @click="saveOfficialSetup"
            >
              {{ savingSetup ? 'Saving...' : 'Save Reward Setup' }}
            </button>
          </div>
          <div v-else class="wc-official-setup-locked">
            <span class="wc-setup-locked-text">
              Official setup locked: <strong>{{ currentWinner.officialPrizeMode === 'exact' ? 'Owner Assigned Prize' : 'Random Equal Mode' }}</strong>
            </span>
          </div>
        </div>
      </div>

      <div class="wc-winner-side">
        <!-- Prize state -->
        <div v-if="currentWinner.status !== 'selected'" class="wc-prize-won">
          <span class="wc-prize-won-label">Prize won</span>
          <div class="wc-prize-won-row">
            <span class="wc-prize-won-img">
              <img v-if="wonPrizeImage(currentWinner)" :src="wonPrizeImage(currentWinner)!" :alt="wonPrizeName(currentWinner)" />
              <span v-else>🎁</span>
            </span>
            <span class="wc-prize-won-name">{{ wonPrizeName(currentWinner) }}</span>
          </div>
          <span class="wc-status-pill" :class="`wc-status-${currentWinner.status}`">{{ statusLabel(currentWinner.status) }}</span>
        </div>

        <div class="wc-winner-buttons">
          <button
            v-if="currentWinner.status === 'selected'"
            type="button"
            class="wc-btn-primary wc-btn-spin"
            :disabled="activePrizes.length < 2"
            :title="activePrizes.length < 2 ? 'Add at least 2 prizes first' : ''"
            @click="openLiveWheel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>
            Spin Prize Wheel
          </button>
          <button
            v-if="store.testingModeEnabled"
            type="button"
            class="wc-btn-ghost"
            :disabled="activePrizes.length < 2"
            @click="onReSpin"
          >
            Re-Spin Wheel
          </button>
          <button
            v-if="!store.testingModeEnabled && currentWinner.status === 'prize_spun'"
            type="button"
            class="wc-btn-primary"
            @click="confirmMarkGiven"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Mark Prize as Given
          </button>
          <span v-if="!store.testingModeEnabled && currentWinner.status === 'prize_given'" class="wc-given-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Prize delivered
          </span>
          <button type="button" class="wc-btn-ghost" @click="changeWinner">Change Winner</button>
          <button
            v-if="canControlTesting"
            type="button"
            class="wc-btn-danger wc-btn-reset"
            :disabled="!store.testingModeEnabled"
            :title="store.testingModeEnabled ? '' : 'Enable Testing Mode to reset winners'"
            @click="onResetWinner"
          >
            Reset Winner
          </button>
        </div>
      </div>
    </section>

    <!-- ══ 3. Monthly Leaderboard Review ══ -->
    <section ref="reviewRef" class="wc-card wc-review">
      <div class="wc-card-head">
        <div>
          <h2 class="wc-card-title">Monthly Leaderboard Review</h2>
          <p class="wc-card-sub">
            {{ monthLabel(selectedMonth) }} · Leaderboard score is a <strong>reference only</strong> — you choose the official winner.
          </p>
        </div>
        <span v-if="!lbLoading" class="wc-count">{{ leaderboardRows.length }} member{{ leaderboardRows.length === 1 ? '' : 's' }}</span>
      </div>

      <div v-if="lbLoading" class="wc-skeleton-rows">
        <div v-for="n in 4" :key="n" class="wc-skeleton-row" />
      </div>

      <div v-else-if="lbError" class="wc-empty">
        <p>{{ lbError }}</p>
        <button type="button" class="wc-btn-ghost" @click="loadLeaderboard">Retry</button>
      </div>

      <div v-else-if="leaderboardRows.length === 0" class="wc-empty">
        <p>No member activity recorded for {{ monthLabel(selectedMonth) }}.</p>
      </div>

      <div v-else class="wc-review-list">
        <article
          v-for="row in leaderboardRows"
          :key="row.userId"
          class="wc-review-row"
          :class="{ 'wc-review-row--winner': currentWinner?.winnerUserId === row.userId }"
        >
          <div class="wc-review-rank">{{ row.rank }}</div>
          <span class="wc-review-avatar">
            <img v-if="row.avatarUrl" :src="row.avatarUrl" :alt="row.fullName" />
            <span v-else>{{ initials(row.fullName) }}</span>
          </span>
          <div class="wc-review-id">
            <div class="wc-review-name">
              {{ row.fullName }}
              <span v-if="currentWinner?.winnerUserId === row.userId" class="wc-review-tag">Current winner</span>
            </div>
            <div class="wc-review-position">{{ row.position || roleLabel(row.role) }}</div>
          </div>

          <div class="wc-review-stats">
            <div class="wc-stat wc-stat--score"><strong>{{ formatNumber(row.totalPoints) }}</strong><span>score</span></div>
            <div class="wc-stat"><strong>{{ row.approvedCount }}</strong><span>approved</span></div>
            <div class="wc-stat"><strong>{{ row.submittedCount }}</strong><span>completed</span></div>
            <div class="wc-stat"><strong>{{ row.followupsCount }}</strong><span>followups</span></div>
            <div class="wc-stat" :class="{ 'wc-stat--warn': penalties(row) > 0 }"><strong>{{ penalties(row) }}</strong><span>penalties</span></div>
          </div>

          <button
            type="button"
            class="wc-select-btn"
            :class="{ 'wc-select-btn--active': currentWinner?.winnerUserId === row.userId }"
            @click="onSelectWinner(row)"
          >
            {{ selectWinnerButtonLabel(row.userId) }}
          </button>
        </article>
      </div>
    </section>

    <!-- ══ 4. Prize Library ══ -->
    <section class="wc-card">
      <div class="wc-card-head">
        <div>
          <h2 class="wc-card-title">Prize Library</h2>
          <p class="wc-card-sub">An image and a title — that's a prize. The image is the focus.</p>
        </div>
        <div class="wc-card-head-actions">
          <button
            type="button"
            class="wc-btn-ghost"
            :disabled="store.prizes.length < 2"
            :title="store.prizes.length < 2 ? 'Add at least 2 prizes to preview' : ''"
            @click="openPreviewWheel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview Wheel
          </button>
          <button type="button" class="wc-btn-primary" @click="openCreatePrize">+ New Prize</button>
        </div>
      </div>

      <div v-if="store.prizes.length === 0 && !store.loading" class="wc-empty">
        <p>No prizes yet. Create your first reward to get started.</p>
        <button type="button" class="wc-btn-primary" @click="openCreatePrize">Create Prize</button>
      </div>

      <!-- Collectible reward cards: large image, title -->
      <div v-else class="wc-prize-grid">
        <article
          v-for="prize in store.prizes"
          :key="prize.id"
          class="wc-prize-card"
          @click="openEditPrize(prize)"
        >
          <button type="button" class="wc-prize-edit" title="Edit prize" @click.stop="openEditPrize(prize)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          </button>
          <div class="wc-prize-img" @click.stop="triggerPrizePreview(prize)">
            <img v-if="prize.imageUrl" :src="prize.imageUrl" :alt="prize.name" />
            <span v-else class="wc-prize-img-fallback">🎁</span>
            <div class="wc-prize-img-overlay">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <span>Preview</span>
            </div>
          </div>
          <h3 class="wc-prize-title">{{ prize.name }}</h3>
        </article>
      </div>
    </section>

    <!-- ══ 6. Winner History ══ -->
    <section class="wc-card">
      <div class="wc-card-head">
        <div>
          <h2 class="wc-card-title">Winner History</h2>
          <p class="wc-card-sub">Permanent monthly reward record.</p>
        </div>
        <span class="wc-count">{{ store.winners.length }} month{{ store.winners.length === 1 ? '' : 's' }}</span>
      </div>

      <div v-if="store.winners.length === 0" class="wc-empty">
        <p>No winners recorded yet.</p>
      </div>

      <div v-else class="wc-history-wrap">
        <table class="wc-history">
          <thead>
            <tr>
              <th>Month</th>
              <th>Winner</th>
              <th>Prize won</th>
              <th class="wc-num">Score</th>
              <th>Selected by</th>
              <th>Awarded date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in sortedHistory" :key="w.id">
              <td data-label="Month">{{ monthLabel(w.monthKey) }}</td>
              <td data-label="Winner">
                <div class="wc-history-winner">
                  <span class="wc-history-avatar">
                    <img v-if="w.winnerUserId && profileMap[w.winnerUserId]?.avatarUrl" :src="profileMap[w.winnerUserId]?.avatarUrl" :alt="profileMap[w.winnerUserId]?.fullName" />
                    <span v-else>{{ initials(w.winnerUserId ? (profileMap[w.winnerUserId]?.fullName || '?') : '?') }}</span>
                  </span>
                  {{ w.winnerUserId ? (profileMap[w.winnerUserId]?.fullName || 'Member') : 'Retroactive Reward (No Winner)' }}
                </div>
              </td>
              <td data-label="Prize won">{{ wonPrizeName(w) || '—' }}</td>
              <td data-label="Score" class="wc-num">{{ formatNumber(w.scoreSnapshot) }}</td>
              <td data-label="Selected by">{{ selectedByLabel(w) }}</td>
              <td data-label="Awarded date">{{ awardedDate(w) }}</td>
              <td data-label="Status">
                <span class="wc-status-pill" :class="`wc-status-${w.status}`">{{ statusLabel(w.status) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ══ Prize create/edit modal ══ -->
    <Modal
      :open="prizeModalOpen"
      :title="editingPrize ? 'Edit Prize' : 'Create Prize'"
      subtitle="Use a clear name and an optional image URL."
      size="md"
      @close="closePrizeModal"
    >
      <div class="wc-form">
        <label class="wc-label">Prize name</label>
        <input v-model="prizeForm.name" type="text" class="wc-input" placeholder="e.g. $20 Bonus" />

        <label class="wc-label">Prize image URL <span class="wc-optional">(optional)</span></label>
        <input v-model="prizeForm.imageUrl" type="text" class="wc-input" placeholder="https://…" />

        <p v-if="prizeError" class="wc-error">{{ prizeError }}</p>
      </div>

      <template #footer>
        <button v-if="editingPrize" type="button" class="wc-btn-danger" :disabled="prizeSaving" @click="onDeletePrize">Delete</button>
        <button type="button" class="wc-btn-ghost" @click="closePrizeModal">Cancel</button>
        <button type="button" class="wc-btn-primary" :disabled="prizeSaving" @click="onSavePrize">
          {{ prizeSaving ? 'Saving…' : (editingPrize ? 'Save Changes' : 'Create Prize') }}
        </button>
      </template>
    </Modal>

    <!-- ══ 5. Prize Wheel modal ══ -->
    <Modal
      :open="wheelOpen"
      :title="wheelTitle"
      :subtitle="wheelSubtitle"
      size="xl"
      @close="closeWheel"
    >
      <div class="wc-wheel-modal-layout">
        <!-- Left Column: Pool control panel -->
        <div class="wc-pool-panel">
          <div class="wc-pool-head">
            <span>Prize Pool</span>
            <span class="wc-pool-hint">{{ selectedPoolPrizes.length }} selected</span>
          </div>
          
          <div class="wc-pool-chips-scroll">
            <button
              v-for="prize in activePrizes"
              :key="prize.id"
              type="button"
              class="wc-pool-chip"
              :class="{ 'wc-pool-chip--on': poolIds.has(prize.id) }"
              :disabled="spinning"
              @click="togglePool(prize.id)"
            >
              <span class="wc-pool-chip-icon">🎁</span>
              <span class="wc-pool-chip-name">{{ prize.name }}</span>
            </button>
          </div>
          
          <div class="wc-pool-options-footer">
            <label class="wc-pool-toggle">
              <input type="checkbox" v-model="exactLandingMode" :disabled="spinning" />
              <span>Exact Landing Mode</span>
            </label>

            <div v-if="exactLandingMode" class="wc-exact-select-wrap">
              <select v-model="exactLandingPrizeId" class="wc-input wc-exact-select" :disabled="spinning">
                <option v-for="prize in selectedPoolPrizes" :key="prize.id" :value="prize.id">
                  {{ prize.name }}
                </option>
              </select>
            </div>

            <!-- Sound Toggle control -->
            <button
              type="button"
              class="wc-audio-toggle"
              @click="toggleSound"
              title="Toggle spin sounds"
            >
              <svg v-if="soundEnabled" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
              <span>Sound: {{ soundEnabled ? 'ON' : 'OFF' }}</span>
            </button>
          </div>
        </div>

        <!-- Right Column: Large Wheel Stage -->
        <div class="wc-wheel-hero-stage">
          <div class="wc-wheel-stage" :class="{ 'wc-winding-up': buildingUp, 'wc-spinning-live': spinning }">
            <!-- Premium Pointer SVG with spring wiggler simulation -->
            <div class="wc-wheel-pointer-container">
              <svg 
                class="wc-wheel-pointer-svg" 
                viewBox="0 0 40 60" 
                width="42" 
                height="58"
                :style="{ transform: `rotate(${pointerAngle}deg)` }"
                :class="{ 'wc-pointer-flash': flashActive }"
              >
                <defs>
                  <filter id="pointer-shadow" x="-30%" y="-30%" width="160%" height="160%">
                    <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.35" />
                  </filter>
                  <linearGradient id="peg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#fef08a" />
                    <stop offset="60%" stop-color="#ca8a04" />
                    <stop offset="100%" stop-color="#854d0e" />
                  </linearGradient>
                </defs>
                <path d="M20 56 L6 18 A14 14 0 1 1 34 18 Z" fill="url(#peg-grad)" stroke="#78350f" stroke-width="2" filter="url(#pointer-shadow)" />
                <path d="M20 50 L10 18 A10 10 0 1 1 30 18 Z" fill="#0f172a" />
                <circle cx="20" cy="18" r="7" fill="url(#peg-grad)" stroke="#ca8a04" stroke-width="1.5" />
                <circle cx="20" cy="18" r="4" fill="#ef4444" />
                <circle cx="20" cy="18" r="1.5" fill="#ffffff" />
              </svg>
            </div>

            <svg
              class="wc-wheel-svg"
              viewBox="0 0 300 300"
              :class="{ 'wc-wheel-svg--spinning': spinning }"
            >
              <defs>
                <filter id="hub-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="var(--primary)" flood-opacity="0.65" />
                </filter>
                <filter id="card-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.25" />
                </filter>
                <linearGradient id="wheel-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#fbbf24" />
                  <stop offset="30%" stop-color="#fef08a" />
                  <stop offset="50%" stop-color="#b45309" />
                  <stop offset="70%" stop-color="#fbbf24" />
                  <stop offset="100%" stop-color="#fef08a" />
                </linearGradient>
                <linearGradient id="gold-metallic-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#fef08a" />
                  <stop offset="35%" stop-color="#fbbf24" />
                  <stop offset="65%" stop-color="#ca8a04" />
                  <stop offset="100%" stop-color="#854d0e" />
                </linearGradient>
                <linearGradient id="hub-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#15D6C2" />
                  <stop offset="100%" stop-color="#1e3a8a" />
                </linearGradient>
                <linearGradient id="wheel-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="rgba(255, 255, 255, 0.2)" />
                  <stop offset="40%" stop-color="rgba(255, 255, 255, 0)" />
                  <stop offset="100%" stop-color="rgba(0, 0, 0, 0.25)" />
                </linearGradient>
              </defs>

              <!-- 1. STATIC CABINET BACKING & SHADOWS -->
              <circle cx="150" cy="150" r="148" fill="#1e293b" stroke="#0f172a" stroke-width="1.5" />
              <circle cx="150" cy="150" r="142" fill="#0f172a" />

              <!-- 2. ROTATING WHEEL GROUP -->
              <g :style="{ transform: `rotate(${wheelRotation}deg)`, transformOrigin: '150px 150px' }">
                <g v-if="wheelSegments.length">
                  <!-- Slice Background Wedges -->
                  <path
                    v-for="(seg, i) in wheelSegments"
                    :key="'w' + seg.prize.id + i"
                    :d="seg.path"
                    :fill="seg.color"
                    :class="{ 
                      'wc-slice-flash': flashActive && winningIndex === i,
                      'wc-slice-winning-active': showWinnerHighlight && winningIndex === i
                    }"
                    stroke="var(--card-bg)"
                    stroke-width="2.5"
                  />

                  <!-- Slice Separators Trim (Inner ring details for better structure) -->
                  <circle cx="150" cy="150" r="95" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
                  <circle cx="150" cy="150" r="137" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

                  <!-- Slice Contents (Rotated Groups) - Rounded Cards, no text -->
                  <g
                    v-for="(seg, i) in wheelSegments"
                    :key="'c' + seg.prize.id + i"
                    :transform="`rotate(${seg.midAngle}, 150, 150)`"
                  >
                    <!-- Clip path for rounded-corner card frame -->
                    <clipPath :id="'clip-' + i">
                      <rect
                        :x="150 - imageSize / 2"
                        :y="imageY - imageSize / 2"
                        :width="imageSize"
                        :height="imageSize"
                        rx="8"
                        ry="8"
                      />
                    </clipPath>

                    <!-- Card Background and Border Frame -->
                    <rect
                      :x="150 - imageSize / 2"
                      :y="imageY - imageSize / 2"
                      :width="imageSize"
                      :height="imageSize"
                      rx="8"
                      ry="8"
                      fill="#ffffff"
                      stroke="#fbbf24"
                      stroke-width="2"
                      filter="url(#card-shadow)"
                    />

                    <!-- Image or fallback -->
                    <image
                      v-if="seg.prize.imageUrl"
                      :href="seg.prize.imageUrl"
                      :x="150 - imageSize / 2"
                      :y="imageY - imageSize / 2"
                      :width="imageSize"
                      :height="imageSize"
                      :clip-path="'url(#clip-' + i + ')'"
                      preserveAspectRatio="xMidYMid slice"
                    />
                    <!-- Fallback Gift Icon -->
                    <g v-else :clip-path="'url(#clip-' + i + ')'">
                      <rect :x="150 - imageSize / 2" :y="imageY - imageSize / 2" :width="imageSize" :height="imageSize" fill="var(--primary-soft)" />
                      <text
                        x="150"
                        :y="imageY"
                        font-size="28"
                        text-anchor="middle"
                        dominant-baseline="middle"
                      >🎁</text>
                    </g>
                  </g>

                  <!-- Pegs/pins on slice dividers at outer edge -->
                  <circle
                    v-for="(seg, i) in wheelSegments"
                    :key="'peg-' + i"
                    :cx="pointAt(i * (360 / wheelSegments.length), 136).x"
                    :cy="pointAt(i * (360 / wheelSegments.length), 136).y"
                    r="3"
                    fill="url(#peg-grad)"
                    stroke="#78350f"
                    stroke-width="0.75"
                  />
                </g>
                <circle v-else cx="150" cy="150" r="137" fill="var(--soft-bg)" />
              </g>

              <!-- 3. STATIC CARNIVAL RIM (Always stays fixed!) -->
              <!-- Outer Metallic Border Rim -->
              <circle cx="150" cy="150" r="141" fill="none" stroke="url(#gold-metallic-grad)" stroke-width="7" pointer-events="none" />
              <!-- Outer rim inline border -->
              <circle cx="150" cy="150" r="145" fill="none" stroke="#78350f" stroke-width="1.5" pointer-events="none" />
              <circle cx="150" cy="150" r="137.5" fill="none" stroke="#78350f" stroke-width="1.5" pointer-events="none" />

              <!-- Bulb Lights along the outer rim (chasing blinking) -->
              <circle
                v-for="(b, idx) in bulbs"
                :key="'bulb-' + idx"
                :cx="b.x"
                :cy="b.y"
                r="3.5"
                class="wc-rim-bulb"
                :style="{ animationDelay: b.delay }"
              />

              <!-- 3D Gloss / Shine Overlay (Static so gloss stays stationary while wheel spins!) -->
              <circle cx="150" cy="150" r="137" fill="url(#wheel-shine)" pointer-events="none" />

              <!-- 4. STATIC POLISHED CENTER HUB (Fixed on top) -->
              <g class="wc-wheel-hub-group" @click="spin" filter="url(#hub-glow)">
                <circle cx="150" cy="150" r="28" fill="url(#gold-metallic-grad)" stroke="#78350f" stroke-width="1.5" />
                <circle cx="150" cy="150" r="21" fill="#1e293b" />
                <circle cx="150" cy="150" r="21" fill="url(#wheel-shine)" pointer-events="none" />
                <text
                  x="150"
                  y="152"
                  fill="#fef08a"
                  font-size="8.5"
                  font-weight="900"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  letter-spacing="0.08em"
                >
                  {{ spinning ? '...' : 'SPIN' }}
                </text>
              </g>
            </svg>

            <!-- Preview Mode Badge -->
            <span v-if="wheelMode === 'preview'" class="wc-preview-badge">Preview Mode</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button type="button" class="wc-btn-ghost" :disabled="spinning" @click="closeWheel">Cancel</button>
        <button
          type="button"
          class="wc-btn-primary wc-btn-spin"
          :disabled="spinning || selectedPoolPrizes.length < 2"
          @click="spin"
        >
          {{ spinning ? 'Spinning…' : 'Spin Wheel' }}
        </button>
      </template>
    </Modal>

    <!-- ══ Immersive Celebratory Result Modal (Side-by-Side Premium Layout) ══ -->
    <Modal
      :open="resultModalOpen"
      title="Victory Spin Complete!"
      subtitle="The wheel has chosen the reward!"
      size="lg"
      @close="closeResultModal"
    >
      <div class="wc-result-grid-layout">
        <!-- Confetti container -->
        <div class="wc-celebration-confetti" aria-hidden="true">
          <span v-for="i in 40" :key="i" :style="confettiStyle(i)" />
        </div>

        <!-- Left Showcase Panel -->
        <div class="wc-result-showcase">
          <div class="wc-result-halo" />
          <div class="wc-result-floating-box" @click="triggerPrizePreview(spinResult!)" style="cursor: pointer;" title="Click to view larger image">
            <img v-if="spinResult?.imageUrl" :src="spinResult.imageUrl" :alt="spinResult.name" class="wc-result-box-img" />
            <span v-else class="wc-result-box-fallback">🎁</span>
          </div>
        </div>

        <!-- Right Info Panel -->
        <div class="wc-result-details">
          <div class="wc-result-crown-row">
            <span class="wc-result-crown-icon">👑</span>
            <span class="wc-result-kicker-badge">{{ monthLabel(selectedMonth) }}</span>
          </div>
          <h2 class="wc-result-winner-name">{{ resultWinnerName }}</h2>
          <p class="wc-result-congrats-text">has been awarded the monthly prize!</p>
          
          <div class="wc-result-prize-tag">
            <span class="wc-result-prize-label">OFFICIAL REWARD</span>
            <h3 class="wc-result-prize-title-text">{{ spinResult?.name }}</h3>
          </div>

          <div class="wc-result-meta-row">
            <span class="wc-result-meta-pill" :class="{ 'wc-result-meta-pill--preview': wheelMode === 'preview' }">
              {{ wheelMode === 'preview' ? 'Preview Mode' : 'Production Spin' }}
            </span>
          </div>

          <p v-if="wheelMode !== 'preview'" class="wc-result-saved-note-new">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ resultSaveMessage }}
          </p>
        </div>
      </div>
      
      <template #footer>
        <button
          v-if="wheelMode === 'preview' || (wheelMode === 'live' && store.testingModeEnabled)"
          type="button"
          class="wc-btn-ghost"
          @click="handleResultReSpin"
        >
          🧪 Re-Spin
        </button>
        <button
          v-if="wheelMode === 'live' && !store.testingModeEnabled && currentWinner?.status === 'prize_spun'"
          type="button"
          class="wc-btn-ghost"
          @click="handleResultMarkGiven"
        >
          Mark Given
        </button>
        <button type="button" class="wc-btn-primary" @click="closeResultModal">
          Confirm Prize
        </button>
      </template>
    </Modal>

    <!-- ══ Retroactive Winner Approval Modal ══ -->
    <Modal
      :open="retroactiveModalOpen"
      title="Retroactive Winner Approval"
      subtitle="Approve reward retroactively for a past month"
      size="md"
      @close="retroactiveModalOpen = false"
    >
      <div class="wc-form">
        <p class="wc-retroactive-modal-intro">
          You are selecting <strong>{{ pendingRetroactiveRow?.fullName }}</strong> as the winner for the completed month of <strong>{{ monthLabel(selectedMonth) }}</strong>. Please provide an approval reason.
        </p>

        <label class="wc-label">Retroactive Approval Reason</label>
        <textarea
          v-model="retroactiveReasonInput"
          rows="3"
          class="wc-input wc-textarea"
          placeholder="e.g. retroactively approved for June leaderboard effort"
        ></textarea>
      </div>
      <template #footer>
        <button type="button" class="wc-btn-ghost" @click="retroactiveModalOpen = false">Cancel</button>
        <button type="button" class="wc-btn-primary" :disabled="!retroactiveReasonInput.trim()" @click="submitRetroactiveWinner">
          Approve & Select Winner
        </button>
      </template>
    </Modal>

    <!-- ══ Prize Preview Modal ══ -->
    <Modal
      :open="previewModalOpen"
      title="Prize Preview"
      subtitle="Reward details"
      size="md"
      @close="closePreviewModal"
    >
      <div class="wc-preview-modal-body">
        <div class="wc-preview-modal-image-container">
          <img v-if="previewPrize?.imageUrl" :src="previewPrize.imageUrl" :alt="previewPrize.name" class="wc-preview-modal-img" />
          <div v-else class="wc-preview-modal-fallback">🎁</div>
        </div>
        <h2 class="wc-preview-modal-title">{{ previewPrize?.name }}</h2>
      </div>
      <template #footer>
        <button type="button" class="wc-btn-primary" @click="closePreviewModal">Close</button>
      </template>
    </Modal>
  </div>

  <!-- ══ Access restricted ══ -->
  <div v-else class="wc-restricted">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--status-needs-fix-fg, #dc2626)" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    <h2>Access Restricted</h2>
    <p>The Winner Center is available only to Owner, Admin, Head, and Supervisor roles.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import MonthSelector from '@/components/board/MonthSelector.vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useWinnerCenterStore, type WinnerPrize, type MonthlyWinner } from '@/stores/winnerCenter';
import { useNotificationsStore } from '@/stores/notifications';
import { usePageRealtime, pushToast } from '@/services/realtimeService';
import { roleLabel } from '@/lib/roles';

// ── Sound System Web Audio API ────────────────────────────────────────────────
class SoundSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    this.enabled = localStorage.getItem('wc_wheel_sound') !== 'false';
  }

  toggle(on: boolean) {
    this.enabled = on;
    localStorage.setItem('wc_wheel_sound', on ? 'true' : 'false');
  }

  isEnabled() {
    return this.enabled;
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  playStart() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.35);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playTick() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.012);
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.012);
  }

  playWin() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    const now = ctx.currentTime;
    
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + idx * 0.1;
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);
      
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(0.12, noteStart + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.65);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(noteStart);
      osc.stop(noteStart + 0.65);
    });
  }

  playCelebration() {
    if (!this.enabled) return;
    const ctx = this.initCtx();
    const now = ctx.currentTime;
    
    const chord1 = [261.63, 329.63, 392.00];
    const chord2 = [349.23, 440.00, 523.25];
    const chord3 = [392.00, 493.88, 587.33];
    const chord4 = [523.25, 659.25, 783.99];
    
    const playChord = (freqs: number[], startTime: number, duration: number) => {
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    };
    
    playChord(chord1, now, 0.3);
    playChord(chord2, now + 0.25, 0.3);
    playChord(chord3, now + 0.5, 0.4);
    playChord(chord4, now + 0.85, 1.2);
  }
}

const auth = useAuthStore();
const store = useWinnerCenterStore();
const notifications = useNotificationsStore();
const canControlTesting = computed(() => auth.canAccessWinnerCenter);

const soundSystem = new SoundSystem();
const soundEnabled = ref(soundSystem.isEnabled());
const toggleSound = () => {
  const next = !soundEnabled.value;
  soundEnabled.value = next;
  soundSystem.toggle(next);
};

// Retroactive approval state
const retroactiveModalOpen = ref(false);
const retroactiveReasonInput = ref('');
const pendingRetroactiveRow = ref<LbRow | null>(null);

// Preview prize state
const previewModalOpen = ref(false);
const previewPrize = ref<WinnerPrize | null>(null);
const triggerPrizePreview = (prize: WinnerPrize) => {
  previewPrize.value = prize;
  previewModalOpen.value = true;
};
const closePreviewModal = () => {
  previewModalOpen.value = false;
  previewPrize.value = null;
};

usePageRealtime([
  'winner_center_prizes',
  'winner_center_monthly_winners',
  'winner_center_wheel_spins',
  'winner_center_settings',
  'winner_center_audit_log'
]);

// ── Month state ────────────────────────────────────────────────────────────────
const todayMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const selectedMonth = ref(todayMonth());

// ── Leaderboard review (reference data only) ────────────────────────────────────
interface LbRow {
  userId: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  position: string;
  rank: number;
  totalPoints: number;
  approvedCount: number;
  submittedCount: number;
  followupsCount: number;
  needsFixCount: number;
  rejectedCount: number;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface LbRpcRow { member_id: string; full_name: string; avatar_url: string | null; role: string; total_points: number; approved_count: number; submitted_count: number; followups_count: number; needs_fix_count: number; rejected_count: number; rank: number; }

const leaderboardRows = ref<LbRow[]>([]);
const lbLoading = ref(true);
const lbError = ref('');

const profileMap = ref<Record<string, { fullName: string; avatarUrl: string; role: string; position: string }>>({});

const fetchProfiles = async () => {
  if (!supabaseConfigured) return;
  try {
    const { data, error } = await supabase
      .from('team_directory')
      .select('id, full_name, avatar_url, role, position');
    if (error) throw error;
    const next: typeof profileMap.value = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any[] ?? []).forEach((p) => {
      next[p.id] = {
        fullName: p.full_name || 'Member',
        avatarUrl: p.avatar_url || '',
        role: p.role || 'member',
        position: p.position || ''
      };
    });
    profileMap.value = next;
  } catch (e) {
    console.warn('[winner-center] profile directory fetch failed', e);
  }
};

const loadLeaderboard = async () => {
  if (!supabaseConfigured) {
    lbError.value = 'Leaderboard is not configured.';
    lbLoading.value = false;
    return;
  }
  lbLoading.value = true;
  lbError.value = '';
  try {
    const { data, error } = await supabase.rpc('get_team_leaderboard', { p_month_key: selectedMonth.value });
    if (error) throw error;
    leaderboardRows.value = ((data ?? []) as LbRpcRow[]).map((r) => ({
      userId: r.member_id,
      fullName: r.full_name || 'Team member',
      avatarUrl: r.avatar_url || '',
      role: r.role || 'member',
      position: profileMap.value[r.member_id]?.position || '',
      rank: r.rank,
      totalPoints: r.total_points,
      approvedCount: r.approved_count,
      submittedCount: r.submitted_count,
      followupsCount: r.followups_count,
      needsFixCount: r.needs_fix_count,
      rejectedCount: r.rejected_count
    }));
  } catch (e: unknown) {
    console.error('[winner-center] get_team_leaderboard failed', e);
    lbError.value = e instanceof Error ? e.message : 'Could not load leaderboard.';
    leaderboardRows.value = [];
  } finally {
    lbLoading.value = false;
  }
};

const penalties = (row: LbRow) => row.needsFixCount + row.rejectedCount;

// ── Current winner derived state ────────────────────────────────────────────────
const currentWinner = computed(() => store.winnerForMonth(selectedMonth.value));
const activePrizes = computed(() => store.activePrizes);

// Official Reward Setup reactive state — Owner Assigned (exact) is the default.
const officialPrizeMode = ref<'random' | 'exact'>('exact');
const exactPrizeId = ref<string>('');
const savingSetup = ref(false);

watch(currentWinner, (newWinner) => {
  if (newWinner) {
    officialPrizeMode.value = newWinner.officialPrizeMode || 'exact';
    exactPrizeId.value = newWinner.exactPrizeId || activePrizes.value[0]?.id || '';
  }
}, { immediate: true });

watch(activePrizes, (newPrizes) => {
  if (newPrizes.length && !exactPrizeId.value) {
    exactPrizeId.value = newPrizes[0].id;
  }
}, { immediate: true });

const saveOfficialSetup = async () => {
  if (!currentWinner.value) return;
  savingSetup.value = true;
  const targetPrizeId = officialPrizeMode.value === 'exact' ? exactPrizeId.value : null;
  const res = await store.updateOfficialPrizeMode(
    currentWinner.value.monthKey,
    officialPrizeMode.value,
    targetPrizeId
  );
  savingSetup.value = false;
  if (res) {
    pushToast('Setup Saved', 'Official reward setup updated successfully.', 'success');
  } else {
    pushToast('Save Failed', store.error || 'Please try again.', 'warning');
  }
};

const winnerProfile = computed(() => {
  const w = currentWinner.value;
  if (!w || !w.winnerUserId) return null;
  return profileMap.value[w.winnerUserId]
    ?? (() => {
      const row = leaderboardRows.value.find((r) => r.userId === w.winnerUserId);
      return row ? { fullName: row.fullName, avatarUrl: row.avatarUrl, role: row.role, position: row.position } : null;
    })();
});

const sortedHistory = computed(() =>
  [...store.winners].sort((a, b) => b.monthKey.localeCompare(a.monthKey))
);

const wonPrizeName = (w: MonthlyWinner): string => {
  if (w.prizeId) {
    const prize = store.prizes.find((p) => p.id === w.prizeId);
    if (prize) return prize.name;
  }
  const spin = store.latestProductionSpinForMonth(w.monthKey);
  return spin?.prizeName ?? '';
};

const wonPrizeImage = (w: MonthlyWinner): string | null => {
  if (!w.prizeId) return null;
  return store.prizes.find((p) => p.id === w.prizeId)?.imageUrl ?? null;
};

const selectedByLabel = (w: MonthlyWinner): string => {
  if (w.selectedBy && w.selectedBy === auth.user?.id) return 'you';
  return profileMap.value[w.selectedBy ?? '']?.fullName ?? 'Head';
};

const awardedDate = (w: MonthlyWinner): string => {
  const iso = w.prizeGivenAt || w.prizeSpunAt || w.selectedAt;
  return iso ? formatDate(iso) : '—';
};

// ── Testing settings ─────────────────────────────────────────────────────────
const onToggleTestingMode = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const next = input.checked;
  const ok = await store.updateTestingMode(next);
  if (!ok) {
    input.checked = store.testingModeEnabled;
    pushToast('Could not update testing mode', store.error || 'Please try again.', 'warning');
    return;
  }
  pushToast(
    next ? 'Testing Mode enabled' : 'Testing Mode disabled',
    next ? 'Test spins will not update production winner records.' : 'Production winner protections are active.',
    next ? 'info' : 'success'
  );
};

const clearTestSpins = async () => {
  if (!store.testingModeEnabled || !canControlTesting.value) return;
  if (!confirm('Clear all test spin results? Audit log entries will remain.')) return;
  const ok = await store.clearTestSpins();
  if (ok) pushToast('Test spins cleared', 'Winner Center test spin results were deleted.', 'success');
  else pushToast('Could not clear test spins', store.error || 'Please try again.', 'warning');
};

// ── Select / change winner ───────────────────────────────────────────────────────
const buildSummary = (row: LbRow): string => {
  const parts: string[] = [];
  if (row.approvedCount) parts.push(`${row.approvedCount} approved task${row.approvedCount === 1 ? '' : 's'}`);
  if (row.submittedCount) parts.push(`${row.submittedCount} completed`);
  if (row.followupsCount) parts.push(`${row.followupsCount} followups`);
  if (!parts.length) return 'Recognised for outstanding monthly performance.';
  return `Top performer this month — ${parts.join(' · ')}.`;
};

const selectWinnerButtonLabel = (userId: string) => {
  if (currentWinner.value?.winnerUserId !== userId) return 'Select as Winner';
  return store.testingModeEnabled ? 'Re-select Winner' : 'Winner ✓';
};

const onSelectWinner = async (row: LbRow) => {
  if (!auth.canAccessWinnerCenter) {
    pushToast('Permission denied', 'Only Head, Supervisor or Admin can select winners.', 'warning');
    return;
  }
  const existing = currentWinner.value;
  if (existing && existing.winnerUserId === row.userId && !store.testingModeEnabled) return;
  
  if (isPastMonth.value && !existing) {
    pendingRetroactiveRow.value = row;
    retroactiveReasonInput.value = '';
    retroactiveModalOpen.value = true;
    return;
  }

  if (existing && (!store.testingModeEnabled || existing.winnerUserId !== row.userId)) {
    const existingName = (existing.winnerUserId ? profileMap.value[existing.winnerUserId]?.fullName : null) || 'the current winner';
    if (!confirm(`Replace ${existingName} with ${row.fullName} as ${monthLabel(selectedMonth.value)} winner? Any prize won this month will be reset.`)) return;
  }
  const winner = await store.selectWinner({
    monthKey: selectedMonth.value,
    winnerUserId: row.userId,
    scoreSnapshot: row.totalPoints,
    achievementSummary: buildSummary(row)
  });
  if (!winner) {
    pushToast('Could not select winner', store.error || 'Please try again.', 'warning');
    return;
  }
  pushToast('Winner selected', `${row.fullName} is the ${monthLabel(selectedMonth.value)} winner.`, 'success');
  if (!store.testingModeEnabled) void notifyWinnerSelected(row.userId);
};

const submitRetroactiveWinner = async () => {
  const row = pendingRetroactiveRow.value;
  if (!row) return;
  if (!retroactiveReasonInput.value.trim()) {
    pushToast('Reason required', 'Please provide a reason for retroactive approval.', 'warning');
    return;
  }
  
  retroactiveModalOpen.value = false;
  
  const approved = await store.approveRetroactively({
    monthKey: selectedMonth.value,
    reason: retroactiveReasonInput.value.trim()
  });
  
  if (!approved) {
    pushToast('Could not approve retroactive reward', store.error || 'Please try again.', 'warning');
    return;
  }
  
  const winner = await store.selectWinner({
    monthKey: selectedMonth.value,
    winnerUserId: row.userId,
    scoreSnapshot: row.totalPoints,
    achievementSummary: buildSummary(row)
  });
  
  if (!winner) {
    pushToast('Could not select winner', store.error || 'Please try again.', 'warning');
    return;
  }
  
  pushToast('Winner selected retroactively', `${row.fullName} is the ${monthLabel(selectedMonth.value)} winner.`, 'success');
  if (!store.testingModeEnabled) void notifyWinnerSelected(row.userId);
  
  pendingRetroactiveRow.value = null;
};

const changeWinner = () => {
  scrollToReview();
  pushToast('Change winner', 'Pick a new winner from the leaderboard review below.', 'info');
};

const confirmMarkGiven = async () => {
  if (!currentWinner.value) return;
  const ok = await store.markPrizeGiven(selectedMonth.value);
  if (ok) pushToast('Prize delivered', 'Marked the prize as given.', 'success');
  else pushToast('Could not update', store.error || 'Please try again.', 'warning');
};

// ── Notifications ────────────────────────────────────────────────────────────────
const notifyWinnerSelected = async (userId: string) => {
  await notifications.createNotification({
    recipientId: userId,
    actorId: auth.user?.id,
    type: 'announcement',
    title: 'Congratulations!',
    message: "You were selected as this month's winner.",
    priority: 'high'
  });
};

const notifyPrizeAwarded = async (userId: string, prizeName: string) => {
  await notifications.createNotification({
    recipientId: userId,
    actorId: auth.user?.id,
    type: 'announcement',
    title: 'Prize Awarded',
    message: `You won ${prizeName} for ${monthLabel(selectedMonth.value)}.`,
    priority: 'high'
  });
};

const sendTestNotification = async () => {
  if (!store.testingModeEnabled || !auth.user?.id) return;
  const ok = await notifications.createNotification({
    recipientId: auth.user.id,
    actorId: auth.user.id,
    type: 'announcement',
    title: 'Winner Center test notification',
    message: 'Testing Mode notification check completed.',
    priority: 'normal'
  });
  if (ok) pushToast('Test notification sent', 'Check the notification bell.', 'success');
  else pushToast('Could not send test notification', 'Please try again.', 'warning');
};

// ── Prize library CRUD ─────────────────────────────────────────────────────────
const prizeModalOpen = ref(false);
const editingPrize = ref<WinnerPrize | null>(null);
const prizeSaving = ref(false);
const prizeError = ref('');
const prizeForm = ref<{ name: string; imageUrl: string }>({
  name: '',
  imageUrl: ''
});

const openCreatePrize = () => {
  editingPrize.value = null;
  prizeForm.value = { name: '', imageUrl: '' };
  prizeError.value = '';
  prizeModalOpen.value = true;
};

const openEditPrize = (prize: WinnerPrize) => {
  editingPrize.value = prize;
  prizeForm.value = {
    name: prize.name,
    imageUrl: prize.imageUrl ?? ''
  };
  prizeError.value = '';
  prizeModalOpen.value = true;
};

const closePrizeModal = () => {
  prizeModalOpen.value = false;
  editingPrize.value = null;
};

const onSavePrize = async () => {
  if (!auth.canAccessWinnerCenter) {
    pushToast('Permission denied', 'Only Head, Supervisor or Admin can save prizes.', 'warning');
    return;
  }
  if (!prizeForm.value.name.trim()) {
    prizeError.value = 'Prize name is required.';
    return;
  }
  prizeSaving.value = true;
  prizeError.value = '';
  const payload = {
    name: prizeForm.value.name.trim(),
    imageUrl: prizeForm.value.imageUrl.trim() || null
  };
  const result = editingPrize.value
    ? await store.updatePrize(editingPrize.value.id, payload)
    : await store.createPrize(payload);
  prizeSaving.value = false;
  if (!result) {
    prizeError.value = store.error || 'Could not save prize.';
    return;
  }
  pushToast(editingPrize.value ? 'Prize updated' : 'Prize created', payload.name, 'success');
  closePrizeModal();
};

const onDeletePrize = async () => {
  if (!auth.canAccessWinnerCenter) {
    pushToast('Permission denied', 'Only Head, Supervisor or Admin can delete prizes.', 'warning');
    return;
  }
  if (!editingPrize.value) return;
  if (!confirm(`Delete "${editingPrize.value.name}"? This cannot be undone.`)) return;
  prizeSaving.value = true;
  const ok = await store.deletePrize(editingPrize.value.id);
  prizeSaving.value = false;
  if (ok) {
    pushToast('Prize deleted', '', 'info');
    closePrizeModal();
  } else {
    prizeError.value = store.error || 'Could not delete prize.';
  }
};

// ── Prize Wheel ───────────────────────────────────────────────────────────────
const WHEEL_PALETTE = [
  { bg: '#2563eb', text: '#ffffff' }, // Bright Blue (KiuQ Blue)
  { bg: '#fbbf24', text: '#0f172a' }, // Yellow
  { bg: '#15D6C2', text: '#0f172a' }, // KiuQ Teal
  { bg: '#f97316', text: '#ffffff' }, // Orange
  { bg: '#a855f7', text: '#ffffff' }, // Purple
  { bg: '#38bdf8', text: '#0f172a' }, // Sky Blue
  { bg: '#ec4899', text: '#ffffff' }, // Pink
  { bg: '#10b981', text: '#ffffff' }, // Emerald Green
];

const wheelOpen = ref(false);
const resultModalOpen = ref(false);
const exactLandingMode = ref(false);
const exactLandingPrizeId = ref('');
const poolIds = ref<Set<string>>(new Set());
const spinning = ref(false);
const wheelRotation = ref(0);
const spinResult = ref<WinnerPrize | null>(null);
const wheelMode = ref<'live' | 'preview'>('live');
const winningIndex = ref<number | null>(null);
const buildingUp = ref(false);
const flashActive = ref(false);

// Physics states for the premium pointer
const pointerAngle = ref(0);
let pointerVelocity = 0;
const showWinnerHighlight = ref(false);

const selectedPoolPrizes = computed(() => activePrizes.value.filter((p) => poolIds.value.has(p.id)));

const imageSize = computed(() => {
  const n = selectedPoolPrizes.value.length || 4;
  return Math.max(38, Math.min(76, 420 / n));
});

const imageY = 60;

const bulbs = computed(() => {
  const list = [];
  const count = 24;
  for (let i = 0; i < count; i++) {
    const angle = (i * 360) / count;
    const rad = (angle * Math.PI) / 180;
    const x = 150 + 145 * Math.sin(rad);
    const y = 150 - 145 * Math.cos(rad);
    list.push({
      x,
      y,
      delay: `${(i % 3) * 0.15}s`
    });
  }
  return list;
});

const isPastMonth = computed(() => {
  return selectedMonth.value < todayMonth();
});

const wheelTitle = computed(() => wheelMode.value === 'preview' ? 'Prize Wheel Preview' : 'Prize Wheel');
const wheelSubtitle = computed(() => {
  if (wheelMode.value === 'preview') return 'Preview only · no winner history, prize result, or notification is saved';
  const mode = store.testingModeEnabled ? 'Testing Mode · spin is saved as test only' : 'Production spin';
  return `${mode} · ${winnerProfile.value?.fullName || 'the winner'} · ${monthLabel(selectedMonth.value)}`;
});
const resultWinnerName = computed(() =>
  wheelMode.value === 'preview' ? 'Preview mode' : (winnerProfile.value?.fullName || 'Winner')
);
const resultSaveMessage = computed(() => {
  if (wheelMode.value === 'preview') return 'Preview only. No result saved, no winner locked, no prize quantity changed.';
  if (store.testingModeEnabled) return 'Test spin saved with is_test_spin. Production winner and prize records were not changed.';
  return 'Result saved permanently and winner notified.';
});

const openWheel = (mode: 'live' | 'preview') => {
  if (activePrizes.value.length < 2) {
    pushToast('Not enough prizes', 'Add at least 2 prizes before spinning.', 'warning');
    return;
  }
  if (mode === 'live' && !currentWinner.value) {
    pushToast('Select a winner first', 'Choose a monthly winner before spinning the production wheel.', 'warning');
    return;
  }
  wheelMode.value = mode;
  poolIds.value = new Set(activePrizes.value.map((p) => p.id));
  if (mode === 'live' && currentWinner.value) {
    exactLandingMode.value = currentWinner.value.officialPrizeMode === 'exact';
    if (exactLandingMode.value) {
      exactLandingPrizeId.value = currentWinner.value.exactPrizeId || activePrizes.value[0]?.id || '';
    } else {
      exactLandingPrizeId.value = activePrizes.value[0]?.id || '';
    }
  } else {
    exactLandingMode.value = false;
    exactLandingPrizeId.value = activePrizes.value[0]?.id || '';
  }
  spinResult.value = null;
  spinning.value = false;
  wheelRotation.value = 0;
  winningIndex.value = null;
  flashActive.value = false;
  showWinnerHighlight.value = false;
  wheelOpen.value = true;
};

const openLiveWheel = () => openWheel('live');
const openPreviewWheel = () => openWheel('preview');

const closeWheel = () => {
  if (spinning.value) return;
  wheelOpen.value = false;
};

const closeResultModal = () => {
  resultModalOpen.value = false;
};

const handleResultMarkGiven = async () => {
  resultModalOpen.value = false;
  await confirmMarkGiven();
};

const handleResultReSpin = async () => {
  resultModalOpen.value = false;
  if (wheelMode.value === 'preview') {
    openWheel('preview');
  } else {
    await onReSpin();
  }
};

const togglePool = (id: string) => {
  const next = new Set(poolIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  poolIds.value = next;
};

// Point on a circle measured clockwise from the top (12 o'clock).
const pointAt = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 150 + radius * Math.sin(rad), y: 150 - radius * Math.cos(rad) };
};

const wheelSegments = computed(() => {
  const list = selectedPoolPrizes.value;
  const n = list.length;
  if (n === 0) return [] as { prize: WinnerPrize; path: string; labelX: number; labelY: number; midAngle: number; color: string; textColor: string }[];
  const seg = 360 / n;
  return list.map((prize, i) => {
    const start = i * seg;
    const end = (i + 1) * seg;
    const p1 = pointAt(start, 140);
    const p2 = pointAt(end, 140);
    const largeArc = seg > 180 ? 1 : 0;
    const midAngle = start + seg / 2;
    const mid = pointAt(midAngle, n <= 2 ? 78 : 90);
    const colorObj = WHEEL_PALETTE[i % WHEEL_PALETTE.length];
    return {
      prize,
      path: `M150 150 L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A140 140 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`,
      labelX: mid.x,
      labelY: mid.y,
      midAngle,
      color: colorObj.bg,
      textColor: colorObj.text
    };
  });
});

const spin = async () => {
  if (!auth.canAccessWinnerCenter) {
    pushToast('Permission denied', 'Only Head, Supervisor or Admin can spin.', 'warning');
    return;
  }
  const list = selectedPoolPrizes.value;
  if (spinning.value || list.length < 2) return;
  if (wheelMode.value === 'live' && !currentWinner.value) return;
  spinning.value = true;
  spinResult.value = null;
  winningIndex.value = null;
  flashActive.value = false;
  showWinnerHighlight.value = false;

  const n = list.length;
  const seg = 360 / n;
  
  // Decide winning index (equally distributed, or exact choice if enabled)
  let idx = 0;
  if (exactLandingMode.value && exactLandingPrizeId.value) {
    const foundIdx = list.findIndex((p) => p.id === exactLandingPrizeId.value);
    idx = foundIdx !== -1 ? foundIdx : Math.floor(Math.random() * n);
  } else {
    idx = Math.floor(Math.random() * n);
  }

  const mid = idx * seg + seg / 2;          // clockwise from top
  const landing = (360 - mid) % 360;        // rotate the winning slice to the top pointer
  const fullSpins = 7; // spin intensely
  const base = wheelRotation.value - (wheelRotation.value % 360);
  const startRot = wheelRotation.value;
  const targetRot = base + 360 * fullSpins + landing;
  winningIndex.value = idx;

  // ── Build-up: glow + energy pulse + start sound, then launch ──
  soundSystem.playStart();
  buildingUp.value = true;
  await new Promise((r) => setTimeout(r, 520));
  buildingUp.value = false;

  let startTime: number | null = null;
  // Preview is quick & fun (~5.5s); a live/official reveal is longer & dramatic (~10s).
  const duration = wheelMode.value === 'preview' ? 5500 : 10000;
  let lastRot = startRot;
  let lastPegCrossing = Math.floor((startRot + seg / 2) / seg);
  let lastTickTime = 0;

  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Two-stage easing: Quintic ease-out followed by spring-damped overshoot/settle
    const t = progress;
    let eased = 0;
    if (t < 0.82) {
      // First 82% of time: fast spin decelerating to a slow-motion crawl (97.5% progress)
      const tNorm = t / 0.82;
      eased = 0.975 * (1 - Math.pow(1 - tNorm, 5));
    } else {
      // Last 18% of time: suspenseful slow landing and overshoot settle
      const tLocal = (t - 0.82) / 0.18; // 0..1
      const startVal = 0.975;
      const targetVal = 1.006; // overshoots by 0.6% (about 2 degrees)
      
      if (tLocal < 0.65) {
        const nt = tLocal / 0.65;
        eased = startVal + (targetVal - startVal) * Math.sin(nt * Math.PI / 2);
      } else {
        const nt = (tLocal - 0.65) / 0.35;
        const cosVal = (1 - Math.cos(nt * Math.PI)) / 2;
        eased = targetVal + (1.0 - targetVal) * cosVal;
      }
    }

    const currentRot = startRot + (targetRot - startRot) * eased;
    wheelRotation.value = currentRot;

    // Check pointer crossing dividers (for physical deflection & sound ticks)
    const currentPegCrossing = Math.floor((currentRot + seg / 2) / seg);
    const instVelocity = currentRot - lastRot;
    
    if (currentPegCrossing !== lastPegCrossing) {
      const nowMs = performance.now();
      // Throttle tick sounds during high-speed rotation to sound crisp
      if (nowMs - lastTickTime > 35) {
        soundSystem.playTick();
        lastTickTime = nowMs;
      }
      // Add deflection impulse proportional to velocity
      pointerVelocity += Math.min(15, Math.max(1, instVelocity * 1.5));
      lastPegCrossing = currentPegCrossing;
    }

    lastRot = currentRot;

    // Run pointer spring physics update: F = -k*x - c*v
    const k = 0.22;
    const damping = 0.16;
    const force = -k * pointerAngle.value - damping * pointerVelocity;
    pointerVelocity += force;
    pointerAngle.value += pointerVelocity;

    // Keep animate loop running until wheel progress is complete AND pointer has settled
    if (progress < 1 || Math.abs(pointerAngle.value) > 0.08 || Math.abs(pointerVelocity) > 0.08) {
      requestAnimationFrame(animate);
    } else {
      pointerAngle.value = 0;
      pointerVelocity = 0;
      finalizeSpin(list[idx]);
    }
  };

  requestAnimationFrame(animate);
};

const finalizeSpin = async (result: WinnerPrize) => {
  soundSystem.playWin();

  // Highlight the winning slice
  showWinnerHighlight.value = true;
  flashActive.value = true;

  // Suspenseful dramatic pause before the popup reveal
  await new Promise((resolve) => setTimeout(resolve, 1600));

  soundSystem.playCelebration();

  showWinnerHighlight.value = false;
  flashActive.value = false;
  spinning.value = false;

  if (wheelMode.value === 'preview') {
    spinResult.value = result;
    wheelOpen.value = false;
    resultModalOpen.value = true;
    return;
  }

  const winner = currentWinner.value;
  if (!winner || !winner.winnerUserId) return;

  const saved = await store.recordSpin({
    monthKey: selectedMonth.value,
    winnerUserId: winner.winnerUserId,
    prizeId: result.id,
    prizeName: result.name,
    prizeImageUrl: result.imageUrl,
    isOfficial: !store.testingModeEnabled,
    isLocked: !store.testingModeEnabled,
    spinResult: {
      prize_id: result.id,
      prize_name: result.name,
      mode: store.testingModeEnabled ? 'testing' : 'production',
      wheel_rotation: wheelRotation.value,
      pool_size: selectedPoolPrizes.value.length
    }
  }, { isTestSpin: store.testingModeEnabled });
  if (!saved) {
    pushToast('Could not save result', store.error || 'Please try again.', 'warning');
    return;
  }
  spinResult.value = result;
  if (!store.testingModeEnabled) void notifyPrizeAwarded(winner.winnerUserId, result.name);
  else pushToast('Test spin saved', 'Production winner and prize records were not changed.', 'success');

  wheelOpen.value = false;
  resultModalOpen.value = true;
};

const onReSpin = async () => {
  if (!auth.canAccessWinnerCenter) {
    pushToast('Permission denied', 'Only Head, Supervisor or Admin can re-spin.', 'warning');
    return;
  }
  const winner = currentWinner.value;
  if (!winner || !store.testingModeEnabled) return;
  const reset = await store.resetPrizeResultForTesting(winner);
  if (!reset) {
    pushToast('Could not reset spin', store.error || 'Please try again.', 'warning');
    return;
  }
  openLiveWheel();
};

const onResetWinner = async () => {
  if (!canControlTesting.value) {
    pushToast('Permission denied', 'Only Head or Supervisor can reset winners.', 'warning');
    return;
  }
  const winner = currentWinner.value;
  if (!winner || !canControlTesting.value) return;
  if (!store.testingModeEnabled) {
    pushToast('Testing Mode required', 'Enable Testing Mode before resetting a winner.', 'warning');
    return;
  }
  if (!confirm('Reset this winner for testing?')) return;
  const ok = await store.resetWinnerForTesting(winner);
  if (ok) pushToast('Winner reset', 'Selection, wheel result, and awarded prize were removed. Audit log kept.', 'success');
  else pushToast('Could not reset winner', store.error || 'Please try again.', 'warning');
};

// ── Display helpers ───────────────────────────────────────────────────────────
const monthLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatNumber = (v: number) => new Intl.NumberFormat().format(v);

const initials = (name: string) =>
  (name || '?').split(/[\s@.]+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const statusLabel = (status: string) =>
  status === 'prize_given' ? 'Prize Given' : status === 'prize_spun' ? 'Prize Spun' : 'Selected';

const formatChance = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);

const confettiStyle = (i: number) => {
  const colors = ['#15D6C2', '#2563EB', '#fbbf24', '#f472b6', '#34d399', '#a78bfa'];
  return {
    left: `${(i * 3.7) % 100}%`,
    background: colors[i % colors.length],
    animationDelay: `${(i % 8) * 0.07}s`,
    '--drift': `${((i % 5) - 2) * 18}px`
  } as Record<string, string>;
};

// ── Scroll to review ──────────────────────────────────────────────────────────
const reviewRef = ref<HTMLElement | null>(null);
const scrollToReview = () => {
  nextTick(() => reviewRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
};

// ── Lifecycle ───────────────────────────────────────────────────────────────────
watch(selectedMonth, loadLeaderboard);

onMounted(async () => {
  if (!auth.canAccessWinnerCenter) return;
  await fetchProfiles();
  await Promise.all([store.fetchAll(), loadLeaderboard()]);
});
</script>

<style scoped>
.wc-page { display: flex; flex-direction: column; gap: 1.4rem; padding-bottom: 3rem; }

/* ── Header ── */
.wc-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.25rem; flex-wrap: wrap;
  border: 1px solid var(--border); border-radius: 18px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 14%, transparent), transparent 34%),
    var(--card-bg);
  padding: 1.25rem; box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}
.wc-header-left { display: flex; align-items: center; gap: 1rem; min-width: 0; }
.wc-header-icon {
  display: flex; height: 3rem; width: 3rem; flex: 0 0 auto;
  align-items: center; justify-content: center; border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 14%, var(--card-bg)); color: var(--primary);
}
.wc-header-icon svg { height: 1.5rem; width: 1.5rem; }
.wc-kicker {
  display: block; font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem; font-weight: 850; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--primary); margin-bottom: 0.2rem;
}
.wc-title { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.45rem; font-weight: 900; color: var(--text-main); line-height: 1.15; }
.wc-subtitle { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
.wc-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem; }
.wc-header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; }

/* ── Buttons ── */
.wc-btn-primary, .wc-btn-ghost, .wc-btn-danger {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.5rem 0.95rem; border-radius: 11px; cursor: pointer;
  font-size: 0.82rem; font-weight: 700; border: 1px solid transparent;
  transition: transform 120ms ease, background 140ms, border-color 140ms, color 140ms, box-shadow 140ms;
}
.wc-btn-primary { background: var(--primary); color: #04201d; box-shadow: var(--shadow-primary); }
.wc-btn-primary:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
.wc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.wc-btn-ghost { background: var(--card-bg); color: var(--text-muted); border-color: var(--border); }
.wc-btn-ghost:hover:not(:disabled) { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); background: var(--primary-soft); }
.wc-btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.wc-btn-danger { background: rgba(220,38,38,0.1); color: #dc2626; border-color: rgba(220,38,38,0.2); margin-right: auto; }
.wc-btn-danger:hover:not(:disabled) { background: rgba(220,38,38,0.16); }
.wc-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Cards ── */
.wc-card { border: 1px solid var(--border); border-radius: 18px; background: var(--card-bg); padding: 1.1rem 1.25rem; }
.wc-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.wc-card-head-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; }
.wc-card-title { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.05rem; font-weight: 800; color: var(--text-main); }
.wc-card-sub { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.82rem; max-width: 48rem; }
.wc-count { font-size: 0.76rem; color: var(--text-muted); font-weight: 600; white-space: nowrap; }

.wc-empty { text-align: center; color: var(--text-muted); font-size: 0.86rem; padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }

/* ── Testing settings ── */
.wc-testing-badge {
  display: inline-flex; align-items: center; gap: 0.35rem; width: fit-content;
  border: 1px solid rgba(217,119,6,0.28); border-radius: 8px;
  background: rgba(245,158,11,0.14); color: #b45309;
  padding: 0.3rem 0.55rem; font-size: 0.76rem; font-weight: 850;
}
.wc-testing-badge--inline { margin-top: 0.05rem; }
.wc-settings { border-color: color-mix(in srgb, var(--primary) 22%, var(--border)); }
.wc-settings-grid { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.wc-setting-toggle {
  display: inline-flex; align-items: center; gap: 0.75rem;
  border: 1px solid var(--border); border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 34%, var(--card-bg));
  padding: 0.75rem 0.85rem; cursor: pointer; min-width: min(100%, 22rem);
}
.wc-setting-toggle input { width: 1.1rem; height: 1.1rem; accent-color: var(--primary); flex: 0 0 auto; }
.wc-setting-toggle strong { display: block; color: var(--text-main); font-size: 0.9rem; line-height: 1.15; }
.wc-setting-note { display: block; margin-top: 0.18rem; color: var(--text-muted); font-size: 0.75rem; }
.wc-setting-toggle--disabled { cursor: not-allowed; opacity: 0.68; }
.wc-settings-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.5rem; flex-wrap: wrap; }

/* ── Selected Winner Card ── */
.wc-winner-card {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap;
  border: 1px solid color-mix(in srgb, var(--primary) 38%, var(--border)); border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--primary) 18%, transparent), transparent 46%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--card-bg)), var(--card-bg));
  padding: 1.5rem 1.6rem;
  box-shadow: 0 18px 44px color-mix(in srgb, var(--primary) 16%, transparent);
}
.wc-winner-glow { position: absolute; inset: 0; background: radial-gradient(circle at 80% -10%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 40%); pointer-events: none; }
.wc-winner-crown { position: absolute; top: 0.85rem; left: 1.1rem; font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); animation: wc-bob 3s ease-in-out infinite; }
.wc-winner-main { display: flex; align-items: center; gap: 1.25rem; min-width: 0; position: relative; z-index: 1; }
.wc-winner-avatar {
  flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  height: 5.5rem; width: 5.5rem; overflow: hidden; border-radius: 999px;
  background: var(--soft-bg); color: var(--primary);
  font-size: 1.5rem; font-weight: 900;
  border: 4px solid var(--primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent);
}
.wc-winner-avatar img { width: 100%; height: 100%; object-fit: cover; }
.wc-winner-info { min-width: 0; }
.wc-winner-badge {
  display: inline-block; font-size: 0.68rem; font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--primary); background: var(--primary-soft-strong); padding: 0.2rem 0.6rem; border-radius: 999px;
}
.wc-winner-name { margin: 0.4rem 0 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.6rem; font-weight: 900; color: var(--text-main); line-height: 1.1; }
.wc-winner-role { margin: 0.1rem 0 0; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
.wc-winner-summary { margin: 0.5rem 0 0; font-size: 0.86rem; color: var(--text-main); max-width: 30rem; line-height: 1.45; }
.wc-winner-meta { display: flex; flex-wrap: wrap; gap: 0.9rem; margin-top: 0.7rem; font-size: 0.78rem; color: var(--text-muted); }
.wc-winner-meta strong { color: var(--text-main); font-size: 0.95rem; }
.wc-winner-side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.8rem; position: relative; z-index: 1; }
.wc-winner-buttons { display: flex; flex-direction: column; gap: 0.5rem; align-items: stretch; }
.wc-winner-buttons .wc-btn-primary, .wc-winner-buttons .wc-btn-ghost { justify-content: center; }
.wc-btn-spin { font-size: 0.9rem; padding: 0.62rem 1.1rem; }
.wc-prize-won { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; text-align: right; }
.wc-prize-won-label { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-soft); font-weight: 800; }
.wc-prize-won-row { display: inline-flex; align-items: center; justify-content: flex-end; gap: 0.45rem; min-width: 0; }
.wc-prize-won-img {
  display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto;
  width: 2rem; height: 2rem; overflow: hidden; border-radius: 9px;
  background: var(--primary-soft); border: 1px solid color-mix(in srgb, var(--primary) 24%, var(--border));
  font-size: 1rem;
}
.wc-prize-won-img img { width: 100%; height: 100%; object-fit: cover; }
.wc-prize-won-name { font-size: 1.05rem; font-weight: 900; color: var(--text-main); }
.wc-given-note { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; font-weight: 700; color: #16a34a; }
.wc-btn-reset { justify-content: center; margin-right: 0; }

/* ── Status pills ── */
.wc-status-pill { display: inline-block; font-size: 0.66rem; font-weight: 800; border-radius: 999px; padding: 0.16rem 0.55rem; white-space: nowrap; }
.wc-status-selected { background: var(--primary-soft-strong); color: var(--primary); }
.wc-status-prize_spun { background: rgba(245,158,11,0.16); color: #d97706; }
.wc-status-prize_given { background: rgba(22,163,74,0.14); color: #16a34a; }

/* ── Leaderboard Review ── */
.wc-review-list { display: flex; flex-direction: column; gap: 0.5rem; }
.wc-review-row {
  display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem 0.85rem;
  border: 1px solid var(--border); border-radius: 14px;
  background: color-mix(in srgb, var(--soft-bg) 40%, var(--card-bg)); flex-wrap: wrap;
}
.wc-review-row--winner { border-color: color-mix(in srgb, var(--primary) 50%, var(--border)); background: var(--primary-soft); }
.wc-review-rank { flex-shrink: 0; width: 1.7rem; text-align: center; font-weight: 800; color: var(--text-muted); font-size: 0.9rem; }
.wc-review-avatar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  height: 2.6rem; width: 2.6rem; overflow: hidden; border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary);
  font-size: 0.8rem; font-weight: 800;
}
.wc-review-avatar img { width: 100%; height: 100%; object-fit: cover; }
.wc-review-id { flex: 1 1 9rem; min-width: 0; }
.wc-review-name { display: flex; align-items: center; gap: 0.4rem; font-weight: 700; color: var(--text-main); font-size: 0.9rem; }
.wc-review-tag { font-size: 0.6rem; font-weight: 800; background: var(--primary); color: #04201d; border-radius: 999px; padding: 0.05rem 0.4rem; text-transform: uppercase; letter-spacing: 0.03em; }
.wc-review-position { font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem; }
.wc-review-stats { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.wc-stat { display: flex; flex-direction: column; align-items: center; min-width: 3.4rem; padding: 0.3rem 0.4rem; border-radius: 10px; background: var(--card-bg); border: 1px solid var(--border); }
.wc-stat strong { font-size: 0.95rem; font-weight: 800; color: var(--text-main); line-height: 1; }
.wc-stat span { font-size: 0.62rem; color: var(--text-soft); margin-top: 0.15rem; text-transform: uppercase; letter-spacing: 0.02em; }
.wc-stat--score { background: var(--primary-soft); border-color: color-mix(in srgb, var(--primary) 30%, var(--border)); }
.wc-stat--score strong { color: var(--primary); }
.wc-stat--warn strong { color: #d97706; }
.wc-select-btn {
  flex-shrink: 0; padding: 0.5rem 0.9rem; border-radius: 10px; cursor: pointer; font-size: 0.8rem; font-weight: 700;
  border: 1px solid var(--primary); background: var(--card-bg); color: var(--primary); transition: background 140ms, transform 120ms;
}
.wc-select-btn:hover { background: var(--primary); color: #04201d; transform: translateY(-1px); }
.wc-select-btn--active { background: var(--primary); color: #04201d; }

/* ── Skeleton ── */
.wc-skeleton-rows { display: flex; flex-direction: column; gap: 0.5rem; }
.wc-skeleton-row { height: 3.6rem; border-radius: 14px; background: color-mix(in srgb, var(--text-muted) 12%, transparent); animation: wc-pulse 1.3s ease-in-out infinite; }
@keyframes wc-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Prize Library ── */
.wc-prize-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.85rem; }
.wc-prize-card { position: relative; border: 1px solid var(--border); border-radius: 14px; background: var(--card-bg); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; cursor: pointer; transition: border-color 140ms, box-shadow 140ms; }
.wc-prize-card:hover { border-color: color-mix(in srgb, var(--primary) 35%, var(--border)); box-shadow: var(--shadow-md); }
.wc-prize-card--inactive { opacity: 0.6; }
.wc-prize-top { display: flex; align-items: flex-start; justify-content: space-between; }
.wc-prize-img {
  display: flex; align-items: center; justify-content: center; overflow: hidden;
  width: 100%; aspect-ratio: 4 / 3; border-radius: 11px;
  background: color-mix(in srgb, var(--soft-bg) 70%, var(--card-bg));
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
}
.wc-prize-img img { width: 100%; height: 100%; object-fit: cover; display: block; }
.wc-prize-img-fallback { display: inline-flex; align-items: center; justify-content: center; font-size: 2rem; color: var(--primary); }
.wc-prize-title { margin: 0; color: var(--text-main); font-size: 0.93rem; font-weight: 850; line-height: 1.25; overflow-wrap: anywhere; }
.wc-prize-chance {
  position: absolute; top: 0.65rem; left: 0.65rem; z-index: 1;
  border-radius: 7px; border: 1px solid rgba(15,23,42,0.1);
  background: color-mix(in srgb, var(--card-bg) 88%, white);
  color: var(--text-main); padding: 0.16rem 0.42rem;
  font-size: 0.68rem; font-weight: 850;
}
.wc-prize-thumb { display: flex; align-items: center; justify-content: center; height: 3rem; width: 3rem; border-radius: 12px; background: var(--primary-soft); font-size: 1.5rem; overflow: hidden; }
.wc-prize-thumb--img { background: var(--soft-bg); }
.wc-prize-thumb img { width: 100%; height: 100%; object-fit: cover; }
.wc-prize-edit { position: absolute; top: 0.65rem; right: 0.65rem; z-index: 1; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-muted); border-radius: 8px; width: 1.9rem; height: 1.9rem; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.wc-prize-edit:hover { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); }
.wc-prize-name { margin: 0.2rem 0 0; font-size: 0.95rem; font-weight: 800; color: var(--text-main); }
.wc-prize-desc { margin: 0; font-size: 0.76rem; color: var(--text-muted); line-height: 1.4; min-height: 2.1em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wc-prize-foot { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.3rem; }
.wc-prize-type { font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--primary); background: var(--primary-soft); padding: 0.12rem 0.45rem; border-radius: 6px; }
.wc-prize-qty { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
.wc-prize-state { margin-left: auto; font-size: 0.64rem; font-weight: 800; border-radius: 999px; padding: 0.1rem 0.45rem; }
.wc-prize-state--on { background: rgba(22,163,74,0.14); color: #16a34a; }
.wc-prize-state--off { background: var(--soft-bg); color: var(--text-soft); }

/* ── Winner History table ── */
.wc-history-wrap { overflow-x: auto; }
.wc-history { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.wc-history th { text-align: left; padding: 0.55rem 0.7rem; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-soft); font-weight: 800; border-bottom: 1px solid var(--border); white-space: nowrap; }
.wc-history td { padding: 0.65rem 0.7rem; border-bottom: 1px solid var(--border); color: var(--text-main); vertical-align: middle; }
.wc-history tr:last-child td { border-bottom: none; }
.wc-history .wc-num { text-align: right; font-weight: 700; }
.wc-history-winner { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
.wc-history-avatar { flex-shrink: 0; display: flex; align-items: center; justify-content: center; height: 1.8rem; width: 1.8rem; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); font-size: 0.62rem; font-weight: 800; }
.wc-history-avatar img { width: 100%; height: 100%; object-fit: cover; }

/* ── Forms ── */
.wc-form { display: flex; flex-direction: column; gap: 0.4rem; }
.wc-label { font-size: 0.74rem; font-weight: 700; color: var(--text-main); margin: 0.5rem 0 0.1rem; }
.wc-optional { color: var(--text-soft); font-weight: 500; }
.wc-input { width: 100%; border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); color: var(--text-main); padding: 0.55rem 0.7rem; font-size: 0.86rem; outline: none; }
.wc-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
.wc-textarea { resize: vertical; font-family: inherit; }
.wc-form-row { display: flex; gap: 0.75rem; }
.wc-form-col { flex: 1; display: flex; flex-direction: column; }
.wc-toggle { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.7rem; font-size: 0.83rem; color: var(--text-main); cursor: pointer; }
.wc-toggle input { width: 1rem; height: 1rem; accent-color: var(--primary); }
.wc-error { margin: 0.6rem 0 0; color: #dc2626; font-size: 0.78rem; font-weight: 600; }

/* ── Prize Wheel ── */
.wc-wheel-modal-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2rem;
  align-items: start;
  width: 100%;
  margin-top: 0.5rem;
}
.wc-pool-panel {
  display: flex;
  flex-direction: column;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.25rem;
  max-height: 520px;
  box-shadow: var(--shadow-sm);
}
.wc-pool-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.65rem;
}
.wc-pool-head > span:first-child {
  font-weight: 850;
  color: var(--text-main);
  font-size: 0.95rem;
  font-family: 'Raleway', 'Google Sans', sans-serif;
}
.wc-pool-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
}
.wc-pool-chips-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  flex: 1;
  padding-right: 0.25rem;
  min-height: 200px;
}
.wc-pool-chip {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.8rem;
  font-weight: 700;
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-muted);
  transition: all 140ms ease;
  text-align: left;
  width: 100%;
}
.wc-pool-chip:hover:not(:disabled) {
  color: var(--text-main);
  border-color: var(--border-strong);
  background: var(--soft-bg);
}
.wc-pool-chip--on {
  border-color: var(--primary);
  background: var(--primary-soft);
  color: var(--primary);
}
.wc-pool-chip--on:hover:not(:disabled) {
  background: var(--primary-soft-strong);
  color: var(--primary);
}
.wc-pool-chip:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.wc-pool-chip-icon {
  font-size: 1rem;
  flex-shrink: 0;
}
.wc-pool-chip-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wc-pool-options-footer {
  margin-top: 1rem;
  border-top: 1px solid var(--border);
  padding-top: 0.85rem;
}
.wc-pool-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.76rem;
  font-weight: 750;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  transition: color 140ms;
}
.wc-pool-toggle:hover {
  color: var(--text-main);
}
.wc-pool-toggle input {
  accent-color: var(--primary);
  width: 0.95rem;
  height: 0.95rem;
  cursor: pointer;
}

.wc-wheel-hero-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
.wc-wheel-stage {
  position: relative;
  width: 500px;
  height: 500px;
  max-width: 90vw;
  max-height: 90vw;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Build-up wind-up: centered scale pulse + glow (pointer never rotates) */
.wc-winding-up .wc-wheel-svg {
  animation: wc-windup 0.52s ease-in-out;
}
@keyframes wc-windup {
  0%   { transform: scale(1); }
  45%  { transform: scale(1.04); }
  100% { transform: scale(1); }
}
.wc-winding-up .wc-wheel-svg,
.wc-spinning-live .wc-wheel-svg {
  box-shadow:
    0 0 55px color-mix(in srgb, var(--primary) 65%, transparent),
    0 0 95px color-mix(in srgb, var(--primary) 32%, transparent),
    0 20px 50px rgba(15, 23, 42, 0.4),
    inset 0 0 25px rgba(255, 255, 255, 0.14);
}
.wc-wheel-pointer-container {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
}
.wc-wheel-pointer-svg {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  width: 36px;
  height: 48px;
  transition: transform 0.2s ease, filter 0.2s ease;
}
.wc-wheel-svg {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  box-shadow: 
    0 0 35px var(--primary-ring),
    0 20px 50px rgba(15, 23, 42, 0.35),
    inset 0 0 25px rgba(255, 255, 255, 0.12);
  transition: transform 4.8s cubic-bezier(0.1, 0.8, 0.1, 1);
}
.wc-wheel-svg--spinning {
  animation: wc-wheel-glow-pulse 1.5s ease-in-out infinite alternate;
}

@keyframes wc-wheel-glow-pulse {
  0% {
    box-shadow: 
      0 0 25px var(--primary-ring),
      0 20px 50px rgba(15, 23, 42, 0.35);
  }
  100% {
    box-shadow: 
      0 0 55px var(--primary),
      0 20px 50px rgba(15, 23, 42, 0.45);
  }
}

.wc-wheel-hub-group {
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: 150px 150px;
}
.wc-wheel-hub-group:hover {
  transform: scale(1.08);
}
.wc-wheel-hub-group:active {
  transform: scale(0.95);
}

.wc-preview-badge {
  position: absolute;
  bottom: -15px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.3rem 0.8rem;
  border-radius: 999px;
  box-shadow: 0 4px 12px rgba(217, 158, 11, 0.35);
  z-index: 5;
  animation: wc-badge-float 2s ease-in-out infinite alternate;
}

@keyframes wc-badge-float {
  0% { transform: translate(-50%, 0); }
  100% { transform: translate(-50%, -4px); }
}

.wc-slice-flash {
  animation: wc-slice-shimmer 0.15s ease-in-out infinite alternate;
}
@keyframes wc-slice-shimmer {
  0% { fill: #ffffff; filter: brightness(1.6); }
  100% { filter: brightness(1); }
}
.wc-pointer-flash {
  animation: wc-pointer-glow 0.15s ease-in-out infinite alternate;
  transform: scale(1.15);
}
@keyframes wc-pointer-glow {
  0% { filter: drop-shadow(0 0 16px var(--primary)); }
  100% { filter: drop-shadow(0 0 4px var(--primary-ring)); }
}

/* ── Immersive Celebratory Result Modal ── */
.wc-result-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem 0 0.5rem;
  position: relative;
  overflow: hidden;
  animation: wc-celebrate-entrance 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes wc-celebrate-entrance {
  0% { transform: scale(0.35); opacity: 0; filter: brightness(1.8); }
  70% { transform: scale(1.06); filter: brightness(1.2); }
  100% { transform: scale(1); opacity: 1; filter: brightness(1); }
}

.wc-result-crown {
  font-size: 2.8rem;
  margin-bottom: 0.25rem;
  animation: wc-result-crown-bob 3s ease-in-out infinite;
}

@keyframes wc-result-crown-bob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(3deg); }
}

.wc-celebration-winner {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
  line-height: 1.15;
}
.wc-celebration-text {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin: 0.2rem 0 1.25rem;
}

.wc-result-hero-image {
  width: 140px;
  height: 140px;
  border-radius: 20px;
  overflow: hidden;
  background: var(--soft-bg);
  border: 3px solid var(--primary);
  box-shadow: 
    0 0 20px var(--primary-soft-strong),
    0 10px 25px rgba(15, 23, 42, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.25rem;
  transition: transform 0.3s ease;
  animation: wc-hero-glow-pulse 2s infinite alternate;
}
.wc-result-hero-image:hover {
  transform: scale(1.06) rotate(1deg);
}
.wc-result-hero-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.wc-result-hero-fallback {
  font-size: 3.5rem;
  animation: wc-bounce-slow 2s infinite;
}

@keyframes wc-hero-glow-pulse {
  0% {
    box-shadow: 0 0 15px var(--primary-soft-strong), 0 10px 25px rgba(15, 23, 42, 0.2);
    border-color: var(--primary);
  }
  100% {
    box-shadow: 0 0 35px var(--primary), 0 10px 25px rgba(15, 23, 42, 0.3);
    border-color: #ffffff;
  }
}

@keyframes wc-bounce-slow {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.wc-result-hero-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.85rem;
  font-weight: 900;
  color: var(--primary);
  margin: 0;
  line-height: 1.1;
  filter: drop-shadow(0 2px 8px var(--primary-ring));
}
.wc-result-meta-info {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  color: var(--text-soft);
  margin-top: 0.5rem;
  font-weight: 600;
}
.wc-bullet {
  color: var(--border-strong);
}

.wc-result-saved-note {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1.25rem;
  font-size: 0.76rem;
  font-weight: 700;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.08);
  border: 1px solid rgba(22, 163, 74, 0.16);
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
}

.wc-celebration-confetti {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 10;
}
.wc-celebration-confetti span {
  position: absolute;
  top: -20px;
  width: 9px;
  height: 14px;
  border-radius: 3px;
  opacity: 0;
  animation: wc-confetti-fall 2.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}

@keyframes wc-confetti-fall {
  0% { opacity: 0; transform: translateY(-20px) rotate(0deg); }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--drift), 380px) rotate(720deg); }
}

/* ── Access restricted ── */
.wc-restricted { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 5rem 1.5rem; text-align: center; }
.wc-restricted h2 { margin: 0.6rem 0 0; font-size: 1.15rem; font-weight: 800; color: var(--text-main); }
.wc-restricted p { margin: 0; font-size: 0.86rem; color: var(--text-muted); max-width: 24rem; }

/* ── Responsive ── */
@media (max-width: 820px) {
  .wc-wheel-modal-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .wc-pool-panel {
    max-height: 260px;
  }
  .wc-pool-chips-scroll {
    min-height: 120px;
  }
  .wc-wheel-stage {
    width: 340px;
    height: 340px;
  }
}

@media (max-width: 720px) {
  .wc-header-right { width: 100%; align-items: stretch; }
  .wc-header-actions { justify-content: stretch; }
  .wc-header-actions .wc-btn-primary, .wc-header-actions .wc-btn-ghost { flex: 1; justify-content: center; }
  .wc-settings-grid { align-items: stretch; }
  .wc-setting-toggle, .wc-settings-actions { width: 100%; }
  .wc-settings-actions .wc-btn-ghost { flex: 1; justify-content: center; min-width: 9rem; }
  .wc-card-head-actions { width: 100%; justify-content: stretch; }
  .wc-card-head-actions .wc-btn-primary, .wc-card-head-actions .wc-btn-ghost { flex: 1; justify-content: center; }
  .wc-winner-card { flex-direction: column; align-items: stretch; }
  .wc-winner-main { flex-direction: column; text-align: center; }
  .wc-winner-info { text-align: center; }
  .wc-winner-meta { justify-content: center; }
  .wc-winner-side { align-items: stretch; }
  .wc-winner-buttons { flex-direction: column; }
  .wc-winner-buttons > * { width: 100%; }
  .wc-prize-won { align-items: center; text-align: center; }
  .wc-prize-won-row { justify-content: center; }
  .wc-review-row { gap: 0.6rem; }
  .wc-review-stats { width: 100%; justify-content: space-between; }
  .wc-select-btn { width: 100%; }

  /* Stacked history "cards" on mobile */
  .wc-history thead { display: none; }
  .wc-history, .wc-history tbody, .wc-history tr, .wc-history td { display: block; width: 100%; }
  .wc-history tr { border: 1px solid var(--border); border-radius: 12px; margin-bottom: 0.6rem; padding: 0.3rem 0.6rem; }
  .wc-history td { border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent); display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .wc-history td:last-child { border-bottom: none; }
  .wc-history td::before { content: attr(data-label); font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-soft); font-weight: 800; }
  .wc-history .wc-num { text-align: right; }
}

/* ── Premium Carnival & Retroactive UI ── */
.wc-retroactive-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 14px;
  padding: 0.85rem 1.1rem;
  color: #b45309;
  font-size: 0.86rem;
  margin-top: 0.2rem;
}
.wc-retroactive-banner-icon {
  font-size: 1.25rem;
}

.wc-audio-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.74rem;
  font-weight: 750;
  padding: 0.4rem 0.65rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 0.65rem;
  transition: all 140ms ease;
  width: 100%;
  justify-content: center;
}
.wc-audio-toggle:hover {
  color: var(--text-main);
  border-color: var(--border-strong);
  background: var(--soft-bg);
}

.wc-rim-bulb {
  fill: #e2e8f0;
  stroke: rgba(0,0,0,0.2);
  stroke-width: 0.75;
  animation: wc-bulb-glow 0.6s ease-in-out infinite alternate;
}
@keyframes wc-bulb-glow {
  0% { fill: #475569; filter: drop-shadow(0 0 0 transparent); }
  100% { fill: #facc15; filter: drop-shadow(0 0 8px #eab308) drop-shadow(0 0 2px #fef08a); }
}

.wc-exact-select-wrap {
  margin-top: 0.5rem;
  width: 100%;
}
.wc-exact-select {
  width: 100%;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-main);
}

.wc-slice-winning-active {
  animation: wc-winning-pulse 0.4s ease-in-out infinite alternate;
}
@keyframes wc-winning-pulse {
  0% { filter: brightness(1.1) contrast(1.1); }
  100% { filter: brightness(1.4) contrast(1.2) drop-shadow(0 0 12px var(--primary)); }
}

.wc-result-grid-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 2.5rem;
  align-items: center;
  padding: 1.5rem 1rem;
  position: relative;
}
.wc-result-showcase {
  position: relative;
  width: 280px;
  height: 280px;
  border-radius: 24px;
  background: #090d16;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #fbbf24;
  box-shadow: 
    inset 0 0 30px rgba(0,0,0,0.85),
    0 12px 28px rgba(0,0,0,0.45);
}
.wc-result-halo {
  position: absolute;
  width: 500px;
  height: 500px;
  background: conic-gradient(from 0deg, #15D6C2, #2563EB, #a855f7, #ec4899, #fbbf24, #15D6C2);
  animation: wc-spin-slow 6s linear infinite;
  opacity: 0.6;
}
@keyframes wc-spin-slow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.wc-result-floating-box {
  position: relative;
  z-index: 2;
  width: 170px;
  height: 170px;
  border-radius: 22px;
  background: var(--card-bg);
  border: 4px solid #fbbf24;
  box-shadow: 
    0 0 35px color-mix(in srgb, var(--primary) 60%, transparent),
    0 16px 40px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  animation: wc-float-item 2.5s ease-in-out infinite alternate;
}
@keyframes wc-float-item {
  0% { transform: translateY(-6px) rotate(-1.5deg); }
  100% { transform: translateY(8px) rotate(2.5deg); }
}
.wc-result-box-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: wc-prize-zoom 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
@keyframes wc-prize-zoom {
  0%   { transform: scale(0.4); opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.wc-result-box-fallback {
  font-size: 4.5rem;
}
.wc-result-details {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}
.wc-result-crown-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}
.wc-result-crown-icon {
  font-size: 2.2rem;
  animation: wc-result-crown-bob 3s ease-in-out infinite;
}
.wc-result-kicker-badge {
  font-size: 0.72rem;
  font-weight: 850;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-soft-strong);
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  letter-spacing: 0.05em;
}
.wc-result-winner-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 2.2rem;
  font-weight: 900;
  background: linear-gradient(135deg, var(--primary) 30%, #fbbf24 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  line-height: 1.15;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}
.wc-result-congrats-text {
  font-size: 0.95rem;
  color: var(--text-muted);
  margin: 0.15rem 0 1rem;
  font-weight: 600;
}
.wc-result-prize-tag {
  background: color-mix(in srgb, var(--primary) 8%, var(--soft-bg));
  border: 2px solid color-mix(in srgb, var(--primary) 30%, var(--border));
  border-radius: 16px;
  padding: 1rem 1.25rem;
  width: 100%;
  margin-bottom: 1.2rem;
  box-shadow: var(--shadow-sm);
}
.wc-result-prize-label {
  display: block;
  font-size: 0.66rem;
  font-weight: 850;
  color: var(--text-soft);
  letter-spacing: 0.08em;
  margin-bottom: 0.2rem;
}
.wc-result-prize-title-text {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.75rem;
  font-weight: 900;
  color: #fbbf24;
  margin: 0;
  line-height: 1.15;
  text-shadow: 0 2px 8px rgba(251, 191, 36, 0.25);
}
.wc-result-meta-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}
.wc-result-meta-pill {
  font-size: 0.7rem;
  font-weight: 800;
  background: rgba(22, 163, 74, 0.12);
  color: #16a34a;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}
.wc-result-meta-pill--preview {
  background: rgba(245,158,11,0.12);
  color: #d97706;
}
.wc-result-saved-note-new {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.76rem;
  font-weight: 700;
  color: #16a34a;
  background: rgba(22, 163, 74, 0.08);
  border: 1px solid rgba(22, 163, 74, 0.16);
  padding: 0.35rem 0.8rem;
  border-radius: 8px;
  line-height: 1.3;
}

.wc-retroactive-modal-intro {
  font-size: 0.88rem;
  color: var(--text-main);
  line-height: 1.45;
  margin-bottom: 0.85rem;
}

.wc-preview-modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  text-align: center;
}
.wc-preview-modal-image-container {
  width: 100%;
  max-width: 380px;
  aspect-ratio: 4 / 3;
  border-radius: 16px;
  overflow: hidden;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  margin-bottom: 1.25rem;
}
.wc-preview-modal-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.wc-preview-modal-fallback {
  font-size: 5rem;
}
.wc-preview-modal-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
}

.wc-prize-img {
  position: relative;
}
.wc-prize-img-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.25rem;
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  transition: opacity 140ms ease;
  border-radius: 11px;
}
.wc-prize-img:hover .wc-prize-img-overlay {
  opacity: 1;
}

@keyframes wc-result-crown-bob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-6px) rotate(3deg); }
}

/* Official Reward Setup styles */
.wc-official-setup-panel {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.wc-setup-heading {
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
  margin: 0;
}
.wc-setup-hint {
  margin: 0.15rem 0 0.1rem;
  font-size: 0.74rem;
  color: var(--text-muted);
}
.wc-setup-rec {
  font-style: normal;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--primary);
  background: var(--primary-soft);
  border-radius: 999px;
  padding: 0.05rem 0.4rem;
  margin-left: 0.35rem;
}
.wc-setup-options-row {
  display: flex;
  gap: 1.25rem;
  align-items: center;
}
.wc-setup-radio-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
  cursor: pointer;
}
.wc-setup-radio-label input {
  cursor: pointer;
}
.wc-setup-select-container {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.wc-setup-select-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
}
.wc-setup-select {
  padding: 0.35rem 0.5rem;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.8rem;
  font-weight: 700;
  outline: none;
}
.wc-setup-select:focus {
  border-color: var(--primary);
}
.wc-setup-save-btn {
  align-self: flex-start;
  font-size: 0.74rem;
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  color: var(--text-main);
  font-weight: 700;
  cursor: pointer;
  transition: all 140ms ease;
}
.wc-setup-save-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.wc-official-setup-locked {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);
}
.wc-setup-locked-text {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
}
</style>
