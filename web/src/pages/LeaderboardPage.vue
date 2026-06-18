<template>
  <div class="lb-page">
    <!-- ══ Hero ══ -->
    <section class="lb-hero">
      <div class="lb-hero-left">
        <div class="lb-hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/>
          </svg>
        </div>
        <div>
          <span class="lb-kicker">Team Leaderboard</span>
          <h1 class="lb-title">Member Leaderboard</h1>
          <p class="lb-subtitle">Live ranking from real work — approvals, submissions, and followups.</p>
        </div>
      </div>
      <div class="lb-hero-right">
        <MonthSelector v-model="selectedMonth" />
        <div v-if="auth.isAdmin" class="lb-preview-row">
          <button type="button" class="lb-preview-btn" @click="previewRecap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18l7-5 7 5V3z"/></svg>
            Preview month recap
          </button>
          <button type="button" class="lb-preview-btn" @click="previewWinnersBanner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Winners only
          </button>
        </div>
      </div>
    </section>

    <!-- ══ Error ══ -->
    <div v-if="error" class="lb-card lb-state">
      <div class="lb-state-title">Could not load the leaderboard.</div>
      <p class="lb-state-sub">{{ error }}</p>
      <button class="btn-primary" type="button" @click="load">Retry</button>
    </div>

    <template v-else>
      <!-- ══ Loading ══ -->
      <section v-if="loading" class="lb-podium">
        <div v-for="n in 3" :key="n" class="lb-podium-card lb-skel-card">
          <div class="lb-skel lb-skel-avatar" />
          <div class="lb-skel lb-skel-line" />
          <div class="lb-skel lb-skel-points" />
        </div>
      </section>

      <!-- ══ Empty ══ -->
      <EmptyState
        v-else-if="rows.length === 0"
        title="No team members yet"
        description="Once members are active, their standings show up here automatically."
      />

      <template v-else>
        <!-- ══ Podium (top 3) ══ -->
        <section class="lb-podium">
          <article
            v-for="slot in podium"
            :key="slot.rank"
            class="lb-podium-card"
            :class="[`lb-rank-${slot.rank}`, slot.row ? '' : 'lb-podium-empty', slot.row && slot.row.userId === myId ? 'lb-mine' : '']"
          >
            <div class="lb-podium-top">
              <span class="lb-medal" :class="`lb-medal-${slot.rank}`">{{ slot.medal }}</span>
              <span class="lb-place">{{ slot.label }}</span>
            </div>

            <template v-if="slot.row">
              <span class="lb-podium-avatar" :class="`lb-ring-${slot.rank}`">
                <img
                  v-if="slot.row.avatarUrl"
                  :src="slot.row.avatarUrl"
                  :alt="slot.row.fullName"
                  class="cursor-pointer transition hover:scale-110"
                  @click.prevent.stop="openPhotoPreview(slot.row)"
                />
                <span v-else>{{ initials(slot.row.fullName) }}</span>
              </span>
              <h2 class="lb-podium-name">{{ slot.row.fullName }}</h2>
              <span class="lb-role" :class="roleBadgeClass(slot.row.role)">{{ roleLabel(slot.row.role) }}</span>
              <div class="lb-podium-points">{{ formatNumber(slot.row.totalPoints) }}</div>
              <div class="lb-podium-points-label">points</div>

              <div v-if="slot.row.breakdown.length" class="lb-podium-bd">
                <div v-for="b in slot.row.breakdown" :key="b.label" class="lb-bd-row">
                  <span>{{ b.label }}<span v-if="b.count > 1" class="lb-bd-count"> ×{{ b.count }}</span></span>
                  <strong :class="b.points >= 0 ? 'lb-pos' : 'lb-neg'">{{ b.points >= 0 ? '+' : '' }}{{ b.points }}</strong>
                </div>
              </div>
            </template>

            <div v-else class="lb-podium-empty-body">
              <span class="lb-podium-avatar lb-podium-avatar--empty">{{ slot.rank }}</span>
              <p>Open spot</p>
            </div>
          </article>
        </section>

        <!-- ══ Monthly Reward Wheel Section ══ -->
        <section class="lb-card lb-reward-wheel-section">
          <div class="lb-reward-wheel-head">
            <h2 class="lb-reward-wheel-title">Monthly Reward Wheel</h2>
            <p class="lb-reward-wheel-subtitle">Top performers may be selected by Head/Supervisor for this month’s reward spin.</p>
          </div>

          <div class="lb-reward-wheel-layout">
            <!-- Left: Wheel Preview or Celebration Showcase -->
            <div class="lb-wheel-preview-area">
              <div v-if="!showPracticeWheel && isCurrentUserSelectedWinner && isPrizeSpun" class="lb-winner-showcase-container">
                <div class="wc-celebration-confetti" aria-hidden="true" style="overflow: hidden; pointer-events: none;">
                  <span v-for="i in 30" :key="i" :style="confettiStyle(i)" />
                </div>
                <div class="lb-showcase-halo" />
                <div class="lb-showcase-card">
                  <div class="lb-showcase-badge">👑 MONTHLY REWARD WINNER</div>
                  <div class="lb-showcase-img-wrap">
                    <img v-if="wonPrizeImageUrl" :src="wonPrizeImageUrl" :alt="wonPrizeName(currentWinner)" class="lb-showcase-img" />
                    <span v-else class="lb-showcase-fallback">🎁</span>
                  </div>
                  <h3 class="lb-showcase-prize-title">You won {{ wonPrizeName(currentWinner) }}!</h3>
                  <p class="lb-showcase-msg">Congratulations! You won this month's reward spin.</p>
                </div>
              </div>
              <div v-else class="lb-wheel-stage-lb">
                <!-- Top Pointer -->
                <div class="lb-wheel-pointer-container-lb">
                  <svg 
                    class="lb-wheel-pointer-svg-lb" 
                    viewBox="0 0 40 60" 
                    width="36" 
                    height="50"
                    :style="{ transform: `rotate(${pointerAngle}deg)`, transformOrigin: '20px 18px' }"
                  >
                    <path d="M20 56 L6 18 A14 14 0 1 1 34 18 Z" fill="url(#peg-grad-lb)" stroke="#78350f" stroke-width="2" filter="url(#pointer-shadow-lb)" />
                    <path d="M20 50 L10 18 A10 10 0 1 1 30 18 Z" fill="#0f172a" />
                    <circle cx="20" cy="18" r="7" fill="url(#peg-grad-lb)" stroke="#ca8a04" stroke-width="1.5" />
                    <circle cx="20" cy="18" r="4" fill="#ef4444" />
                    <circle cx="20" cy="18" r="1.5" fill="#ffffff" />
                  </svg>
                </div>

                <svg
                  class="lb-wheel-svg-lb"
                  viewBox="0 0 300 300"
                >
                  <defs>
                    <filter id="pointer-shadow-lb" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#000" flood-opacity="0.35" />
                    </filter>
                    <filter id="hub-glow-lb" x="-30%" y="-30%" width="160%" height="160%">
                      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="var(--primary)" flood-opacity="0.65" />
                    </filter>
                    <filter id="card-shadow-lb" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-color="#000" flood-opacity="0.25" />
                    </filter>
                    <linearGradient id="wheel-border-grad-lb" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#fbbf24" />
                      <stop offset="30%" stop-color="#fef08a" />
                      <stop offset="50%" stop-color="#b45309" />
                      <stop offset="70%" stop-color="#fbbf24" />
                      <stop offset="100%" stop-color="#fef08a" />
                    </linearGradient>
                    <linearGradient id="gold-metallic-grad-lb" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#fef08a" />
                      <stop offset="35%" stop-color="#fbbf24" />
                      <stop offset="65%" stop-color="#ca8a04" />
                      <stop offset="100%" stop-color="#854d0e" />
                    </linearGradient>
                    <linearGradient id="wheel-shine-lb" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="rgba(255, 255, 255, 0.2)" />
                      <stop offset="40%" stop-color="rgba(255, 255, 255, 0)" />
                      <stop offset="100%" stop-color="rgba(0, 0, 0, 0.25)" />
                    </linearGradient>
                    <linearGradient id="peg-grad-lb" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stop-color="#fef08a" />
                      <stop offset="60%" stop-color="#ca8a04" />
                      <stop offset="100%" stop-color="#854d0e" />
                    </linearGradient>
                  </defs>

                  <!-- 1. STATIC CABINET BACKING & SHADOWS -->
                  <circle cx="150" cy="150" r="148" fill="#1e293b" stroke="#0f172a" stroke-width="1.5" />
                  <circle cx="150" cy="150" r="142" fill="#0f172a" />

                  <!-- 2. ROTATING WHEEL GROUP -->
                  <g 
                    ref="wheelGroupRef"
                    :style="{ transform: `rotate(${wheelRotation}deg)`, transformOrigin: '150px 150px' }"
                  >
                    <g v-if="wheelSegments.length">
                      <!-- Slice Background Wedges -->
                      <path
                        v-for="(seg, i) in wheelSegments"
                        :key="'w' + seg.prize.id + i"
                        :d="seg.path"
                        :fill="seg.color"
                        stroke="var(--card-bg)"
                        stroke-width="2.5"
                      />

                      <!-- Slice Separators Trim -->
                      <circle cx="150" cy="150" r="95" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" />
                      <circle cx="150" cy="150" r="137" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" />

                      <!-- Slice Contents (Rotated Groups) - Rounded Cards, no text -->
                      <g
                        v-for="(seg, i) in wheelSegments"
                        :key="'c' + seg.prize.id + i"
                        :transform="`rotate(${seg.midAngle}, 150, 150)`"
                      >
                        <!-- Clip path for rounded-corner card frame -->
                        <clipPath :id="'clip-lb-' + i">
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
                          filter="url(#card-shadow-lb)"
                        />

                        <!-- Image or fallback -->
                        <image
                          v-if="seg.prize.imageUrl"
                          :href="seg.prize.imageUrl"
                          :x="150 - imageSize / 2"
                          :y="imageY - imageSize / 2"
                          :width="imageSize"
                          :height="imageSize"
                          :clip-path="'url(#clip-lb-' + i + ')'"
                          preserveAspectRatio="xMidYMid slice"
                        />
                        <!-- Fallback Gift Icon -->
                        <g v-else :clip-path="'url(#clip-lb-' + i + ')'">
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
                        fill="url(#peg-grad-lb)"
                        stroke="#78350f"
                        stroke-width="0.75"
                      />
                    </g>
                    <circle v-else cx="150" cy="150" r="137" fill="var(--soft-bg)" />
                  </g>

                  <!-- 3. STATIC CARNIVAL RIM -->
                  <circle cx="150" cy="150" r="141" fill="none" stroke="url(#gold-metallic-grad-lb)" stroke-width="7" pointer-events="none" />
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

                  <!-- 3D Gloss / Shine Overlay -->
                  <circle cx="150" cy="150" r="137" fill="url(#wheel-shine-lb)" pointer-events="none" />

                  <!-- 4. STATIC POLISHED CENTER HUB -->
                  <g class="lb-wheel-hub-group" filter="url(#hub-glow-lb)">
                    <circle cx="150" cy="150" r="28" fill="url(#gold-metallic-grad-lb)" stroke="#78350f" stroke-width="1.5" />
                    <circle cx="150" cy="150" r="21" fill="#1e293b" />
                    <circle cx="150" cy="150" r="21" fill="url(#wheel-shine-lb)" pointer-events="none" />
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
                      PREVIEW
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            <!-- Right: Details, Pool, and Status -->
            <div class="lb-wheel-details-area">
              <!-- Winner Status Banner -->
              <div class="lb-reward-status-banner">
                <div class="lb-reward-month-title">{{ monthLabel(selectedMonth) }} Standings</div>
                
                <div class="lb-reward-status-content">
                  <div v-if="!currentWinner" class="lb-reward-status-text lb-reward-status-text--unselected">
                    <span class="lb-reward-status-icon">⚪</span>
                    Winner has not been selected yet.
                  </div>
                  <div v-else class="lb-reward-status-selected-state">
                    <div class="lb-reward-status-text lb-reward-status-text--winner">
                      <span class="lb-reward-status-icon">👑</span>
                      This month’s winner: <span class="lb-winner-highlight">{{ winnerProfile?.fullName || 'Selected member' }}</span>
                    </div>
                    <div v-if="currentWinner.status !== 'selected'" class="lb-reward-status-text lb-reward-status-text--prize">
                      <span class="lb-reward-status-icon">🎁</span>
                      Prize awarded: <span class="lb-prize-highlight">{{ wonPrizeName(currentWinner) }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Spin Button State -->
              <div class="lb-spin-locked-container">
                <!-- State Details / Info Banner -->
                <div class="lb-spin-header-info">
                  <!-- Case 1: User is selected winner and has NOT spun yet -->
                  <div v-if="isCurrentUserSelectedWinner && !isPrizeSpun" class="lb-winner-badge-wrap">
                    <span class="wc-winner-badge">👑 Selected Winner</span>
                    <span class="lb-winner-note-text">You are this month’s selected winner. Your first official spin will be locked.</span>
                  </div>
                  
                  <!-- Case 2: User is selected winner and HAS already spun -->
                  <div v-else-if="isCurrentUserSelectedWinner && isPrizeSpun" class="lb-winner-badge-wrap">
                    <span class="wc-winner-badge wc-winner-badge--won">🔒 Official Locked</span>
                    <span class="lb-winner-note-text">Official prize locked: <strong>{{ wonPrizeName(currentWinner) }}</strong></span>
                  </div>
                  
                  <!-- Case 3: User is NOT selected winner -->
                  <div v-else class="lb-winner-badge-wrap">
                    <span class="wc-winner-badge wc-winner-badge--locked">👁️ Reward Preview</span>
                    <span class="lb-winner-note-text">Only the selected monthly winner can spin the official prize.</span>
                  </div>
                </div>

                <!-- Action buttons -->
                <div class="lb-spin-actions-row">
                  <!-- Practice Spin button is always available to test and have fun -->
                  <button
                    type="button"
                    class="lb-practice-spin-btn"
                    :disabled="spinning || activePrizes.length < 2"
                    @click="handlePracticeSpin"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="12" cy="12" r="10"/><path d="m12 8 4 4-4 4M8 12h8"/>
                    </svg>
                    Practice Spin
                  </button>

                  <!-- Official Spin Button (active if winner and not spun) -->
                  <button
                    v-if="isCurrentUserSelectedWinner && !isPrizeSpun"
                    type="button"
                    class="lb-official-spin-btn-new"
                    :disabled="spinning || activePrizes.length < 2"
                    @click="spinOfficial"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    Spin Official Prize
                  </button>

                  <!-- Locked Button for non-winners / already spun users -->
                  <button
                    v-else
                    type="button"
                    class="lb-spin-locked-btn-new"
                    disabled
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    Spin Locked
                  </button>
                </div>

                <!-- Practice Disclaimer -->
                <div class="lb-practice-disclaimer-text">
                  🎯 This is a practice spin only. No official prize will be awarded.
                </div>
              </div>

              <!-- Prize pool list -->
              <div class="lb-pool-preview-section">
                <h3 class="lb-pool-preview-title">Available Rewards ({{ activePrizes.length }})</h3>
                
                <div v-if="activePrizes.length === 0" class="lb-pool-empty">
                  No rewards listed for this month.
                </div>
                
                <div v-else class="lb-pool-preview-grid">
                  <div
                    v-for="prize in activePrizes"
                    :key="prize.id"
                    class="lb-pool-preview-card"
                    @click="triggerPrizePreview(prize)"
                    style="cursor: pointer;"
                    title="Click to preview reward in large size"
                  >
                    <div class="lb-pool-preview-img">
                      <img v-if="prize.imageUrl" :src="prize.imageUrl" :alt="prize.name" />
                      <span v-else class="lb-pool-preview-fallback">🎁</span>
                      <div class="lb-pool-preview-img-overlay">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <span>Preview</span>
                      </div>
                    </div>
                    <div class="lb-pool-preview-name" :title="prize.name">
                      {{ prize.name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ══ Full standings ══ -->
        <section class="lb-card lb-standings">
          <div class="lb-standings-head">
            <h2>Full standings</h2>
            <span class="lb-standings-count">{{ rows.length }} member{{ rows.length === 1 ? '' : 's' }}</span>
          </div>

          <div class="lb-rows">
            <div
              v-for="row in rows"
              :key="row.userId"
              class="lb-row"
              :class="{ 'lb-row-mine': row.userId === myId }"
            >
              <div class="lb-row-rank" :class="row.rank <= 3 ? `lb-row-rank-${row.rank}` : ''">{{ row.rank }}</div>
              <span class="lb-row-avatar">
                <img
                  v-if="row.avatarUrl"
                  :src="row.avatarUrl"
                  :alt="row.fullName"
                  class="cursor-pointer transition hover:scale-110"
                  @click.prevent.stop="openPhotoPreview(row)"
                />
                <span v-else>{{ initials(row.fullName) }}</span>
              </span>
              <div class="lb-row-info">
                <div class="lb-row-name">
                  {{ row.fullName }}
                  <span v-if="row.userId === myId" class="lb-you">You</span>
                </div>
                <div class="lb-row-chips">
                  <span v-if="row.approvedCount" class="lb-chip lb-chip-green">{{ row.approvedCount }} approved</span>
                  <span v-if="row.submittedCount" class="lb-chip">{{ row.submittedCount }} submitted</span>
                  <span v-if="row.followupsCount" class="lb-chip lb-chip-blue">{{ row.followupsCount }} followups</span>
                  <span v-if="row.needsFixCount" class="lb-chip lb-chip-amber">{{ row.needsFixCount }} needs fix</span>
                  <span v-if="row.rejectedCount" class="lb-chip lb-chip-red">{{ row.rejectedCount }} rejected</span>
                  <span v-if="row.adjustmentPoints" class="lb-chip lb-chip-gold">★ {{ row.adjustmentPoints > 0 ? '+' : '' }}{{ row.adjustmentPoints }} bonus</span>
                  <span v-if="!hasActivity(row)" class="lb-chip lb-chip-muted">No points yet</span>
                </div>
              </div>
              <div class="lb-row-points">
                <strong>{{ formatNumber(row.totalPoints) }}</strong>
                <span>pts</span>
              </div>
              <button v-if="auth.isAdmin" type="button" class="lb-adjust-btn" title="Adjust score" @click="openAdjust(row)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            </div>
          </div>
        </section>

        <!-- ══ Scoring rules ══ -->
        <section class="lb-card lb-rules">
          <h2>How points are earned</h2>
          <p class="lb-rules-sub">Updated live from real workflow activity — no manual recalculation needed.</p>
          <div class="lb-rules-grid">
            <div v-for="rule in scoreRules" :key="rule.label" class="lb-rule">
              <span>{{ rule.label }}</span>
              <strong :class="rule.points >= 0 ? 'lb-pos' : 'lb-neg'">{{ rule.points >= 0 ? '+' : '' }}{{ rule.points }} pts</strong>
            </div>
          </div>
        </section>
      </template>
    </template>

    <!-- ══ Adjust score (admin / head) ══ -->
    <Modal
      :open="adjustOpen"
      title="Adjust score"
      :subtitle="adjustTarget ? `${adjustTarget.name} · ${selectedMonth}` : ''"
      size="sm"
      @close="closeAdjust"
    >
      <div class="lb-adjust-body">
        <p class="lb-adjust-hint">Add a bonus or penalty for work done outside the system (or to reward something special). Use a negative number to subtract.</p>

        <label class="lb-adjust-label">Points</label>
        <input
          v-model.number="adjustPoints"
          type="number"
          class="lb-adjust-input"
          placeholder="e.g. 25 or -10"
          @keyup.enter="saveAdjust"
        />

        <label class="lb-adjust-label">Reason</label>
        <input
          v-model="adjustReason"
          type="text"
          class="lb-adjust-input"
          placeholder="e.g. Helped a client off-platform 🙌"
          @keyup.enter="saveAdjust"
        />

        <p v-if="adjustError" class="lb-adjust-error">{{ adjustError }}</p>

        <!-- Existing adjustments -->
        <div v-if="adjustList.length" class="lb-adjust-list">
          <div class="lb-adjust-list-head">Previous adjustments this month</div>
          <div v-for="a in adjustList" :key="a.id" class="lb-adjust-item">
            <span class="lb-adjust-item-pts" :class="a.points >= 0 ? 'lb-pos' : 'lb-neg'">{{ a.points > 0 ? '+' : '' }}{{ a.points }}</span>
            <span class="lb-adjust-item-reason">{{ a.reason || 'No reason given' }}</span>
            <span class="lb-adjust-item-date">{{ formatDate(a.created_at) }}</span>
            <button type="button" class="lb-adjust-item-del" title="Remove" @click="removeAdjust(a.id)">✕</button>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-ghost" type="button" @click="closeAdjust">Done</button>
        <button class="btn-primary" type="button" :disabled="adjustSaving" @click="saveAdjust">
          {{ adjustSaving ? 'Saving…' : 'Add adjustment' }}
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
      <div class="lb-preview-modal-body">
        <div class="lb-preview-modal-image-container">
          <img v-if="previewPrize?.imageUrl" :src="previewPrize.imageUrl" :alt="previewPrize.name" class="lb-preview-modal-img" />
          <div v-else class="lb-preview-modal-fallback">🎁</div>
        </div>
        <h2 class="lb-preview-modal-title">{{ previewPrize?.name }}</h2>
      </div>
      <template #footer>
        <button type="button" class="btn-primary" @click="closePreviewModal">Close</button>
      </template>
    </Modal>

    <!-- ══ Test Result Modal (Team Member Preview Spin) ══ -->
    <Modal
      :open="testResultModalOpen"
      title="Practice Result"
      subtitle="This was only a practice spin. Official reward result was not saved."
      size="lg"
      @close="testResultModalOpen = false; showPracticeWheel = false"
    >
      <div class="wc-result-grid-layout">
        <!-- Confetti container -->
        <div class="wc-celebration-confetti" aria-hidden="true">
          <span v-for="i in 40" :key="i" :style="confettiStyle(i)" />
        </div>

        <!-- Left Showcase Panel -->
        <div class="wc-result-showcase">
          <div class="wc-result-halo" />
          <div class="wc-result-floating-box">
            <img v-if="testResultPrize?.imageUrl" :src="testResultPrize.imageUrl" :alt="testResultPrize.name" class="wc-result-box-img" />
            <span v-else class="wc-result-box-fallback">🎁</span>
          </div>
        </div>

        <!-- Right Info Panel -->
        <div class="wc-result-details">
          <div class="wc-result-crown-row">
            <span class="wc-result-crown-icon">🎯</span>
            <span class="wc-result-kicker-badge" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6; border-color: rgba(59, 130, 246, 0.2);">Practice Mode</span>
          </div>
          <h2 class="wc-result-winner-name">Practice Spin Complete!</h2>
          <p class="wc-result-congrats-text">This result was not saved.</p>
          
          <div class="wc-result-prize-tag">
            <span class="wc-result-prize-label">PRACTICE RESULT</span>
            <h3 class="wc-result-prize-title-text">{{ testResultPrize?.name }}</h3>
          </div>

          <p class="wc-result-saved-note-new" style="background: rgba(59, 130, 246, 0.08); border-color: rgba(59, 130, 246, 0.16); color: #3b82f6;">
            🎯 This was only a practice spin. Official reward result was not saved.
          </p>
        </div>
      </div>
      
      <template #footer>
        <button type="button" class="btn-ghost" @click="testResultModalOpen = false; showPracticeWheel = false">Close</button>
        <button type="button" class="btn-primary" @click="testResultModalOpen = false; handlePracticeSpin()">
          Spin Again
        </button>
      </template>
    </Modal>

    <!-- ══ Official Result Modal (Team Member Official Spin) ══ -->
    <Modal
      :open="officialResultModalOpen"
      title="Congratulations!"
      subtitle="Your monthly reward spin is complete!"
      size="lg"
      @close="officialResultModalOpen = false"
    >
      <div class="wc-result-grid-layout">
        <!-- Confetti container -->
        <div class="wc-celebration-confetti" aria-hidden="true">
          <span v-for="i in 40" :key="i" :style="confettiStyle(i)" />
        </div>

        <!-- Left Showcase Panel -->
        <div class="wc-result-showcase">
          <div class="wc-result-halo" />
          <div class="wc-result-floating-box">
            <img v-if="officialResultPrize?.imageUrl" :src="officialResultPrize.imageUrl" :alt="officialResultPrize.name" class="wc-result-box-img" />
            <span v-else class="wc-result-box-fallback">🎁</span>
          </div>
        </div>

        <!-- Right Info Panel -->
        <div class="wc-result-details">
          <div class="wc-result-crown-row">
            <span class="wc-result-crown-icon">👑</span>
            <span class="wc-result-kicker-badge" style="background: rgba(245, 158, 11, 0.16); color: #d97706; border-color: rgba(245, 158, 11, 0.25);">Official Result</span>
          </div>
          <h2 class="wc-result-winner-name">Congratulations, {{ auth.profile?.fullName || 'Winner' }}!</h2>
          <p class="wc-result-congrats-text">Your monthly reward has been drawn.</p>
          
          <div class="wc-result-prize-tag">
            <span class="wc-result-prize-label">YOUR REWARD</span>
            <h3 class="wc-result-prize-title-text">{{ officialResultPrize?.name }}</h3>
          </div>

          <p class="wc-result-saved-note-new" style="background: rgba(22, 163, 74, 0.08); border-color: rgba(22, 163, 74, 0.16); color: #16a34a;">
            ✅ Official prize locked.
          </p>
        </div>
      </div>
      
      <template #footer>
        <button type="button" class="btn-primary" @click="officialResultModalOpen = false">
          Close
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Modal from '@/components/ui/Modal.vue';
import MonthSelector from '@/components/board/MonthSelector.vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useImagePreviewStore } from '@/stores/imagePreview';
import { useWinnerCenterStore, canSpinOfficialWheel, type MonthlyWinner } from '@/stores/winnerCenter';
import { pushToast } from '@/services/realtimeService';

const previewStore = useImagePreviewStore();
const openPhotoPreview = (member: any) => {
  if (member?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName,
      role: member.role
    });
  }
};

const auth = useAuthStore();
const myId = computed(() => auth.user?.id ?? '');

const todayMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const selectedMonth = ref(todayMonth());

import { roleBadgeClass, roleLabel } from '@/lib/roles';

// Winner Center Store integration
const winnerStore = useWinnerCenterStore();
const spinning = ref(false);
const spinningTest = ref(false);
const spinningOfficial = ref(false);
const wheelRotation = ref(0);
const winningIndex = ref<number | null>(null);
const flashActive = ref(false);
const showWinnerHighlight = ref(false);

const pointerAngle = ref(0);
let pointerVelocity = 0;

const testResultModalOpen = ref(false);
const testResultPrize = ref<any | null>(null);

const officialResultModalOpen = ref(false);
const officialResultPrize = ref<any | null>(null);
const wheelGroupRef = ref<SVGElement | null>(null);

// ── Sound System Web Audio API ────────────────────────────────────────────────
class SoundSystem {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;

  constructor() {
    this.enabled = localStorage.getItem('wc_wheel_sound') !== 'false';
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

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }
}

const soundSystem = new SoundSystem();

const confettiStyle = (i: number) => {
  const colors = ['#15D6C2', '#2563EB', '#fbbf24', '#f472b6', '#34d399', '#a78bfa'];
  return {
    left: `${(i * 3.7) % 100}%`,
    background: colors[i % colors.length],
    animationDelay: `${(i % 8) * 0.07}s`,
    '--drift': `${((i % 5) - 2) * 18}px`
  } as Record<string, string>;
};

const profileMap = ref<Record<string, { fullName: string; avatarUrl: string; role: string }>>({});
const fetchProfiles = async () => {
  if (!supabaseConfigured) return;
  try {
    const { data, error: err } = await supabase
      .from('team_directory')
      .select('id, full_name, avatar_url, role');
    if (err) throw err;
    const next: typeof profileMap.value = {};
    (data as any[] ?? []).forEach((p) => {
      next[p.id] = {
        fullName: p.full_name || 'Member',
        avatarUrl: p.avatar_url || '',
        role: p.role || 'member'
      };
    });
    profileMap.value = next;
  } catch (e) {
    console.warn('[leaderboard] profile directory fetch failed', e);
  }
};

const activePrizes = computed(() => winnerStore.activePrizes);
const currentWinner = computed(() => winnerStore.winnerForMonth(selectedMonth.value));

const winnerProfile = computed(() => {
  const w = currentWinner.value;
  if (!w || !w.winnerUserId) return null;
  return profileMap.value[w.winnerUserId]
    ?? rows.value.find((r) => r.userId === w.winnerUserId)
    ?? null;
});

const wonPrizeName = (w: MonthlyWinner | null): string => {
  if (!w) return '';
  if (w.prizeId) {
    const prize = winnerStore.prizes.find((p) => p.id === w.prizeId);
    if (prize) return prize.name;
  }
  const spin = winnerStore.latestProductionSpinForMonth(w.monthKey);
  return spin?.prizeName ?? '';
};

// Wheel styling palette
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

// Preview prize state
const previewModalOpen = ref(false);
const previewPrize = ref<any | null>(null);
const triggerPrizePreview = (prize: any) => {
  previewPrize.value = prize;
  previewModalOpen.value = true;
};
const closePreviewModal = () => {
  previewModalOpen.value = false;
  previewPrize.value = null;
};

const imageSize = computed(() => {
  const n = activePrizes.value.length || 4;
  return Math.max(38, Math.min(76, 420 / n));
});

const imageY = 60;

// Computes for winner states
const isWinnerSelected = computed(() => !!currentWinner.value && !!currentWinner.value.winnerUserId);
const isCurrentUserSelectedWinner = computed(() => isWinnerSelected.value && currentWinner.value?.winnerUserId === myId.value);
const isPrizeSpun = computed(() => !!currentWinner.value && (currentWinner.value.status === 'prize_spun' || currentWinner.value.status === 'prize_given' || !!currentWinner.value.prizeId || !!currentWinner.value.prizeSpunAt));

const wonPrizeImageUrl = computed(() => {
  const w = currentWinner.value;
  if (!w) return null;
  if (w.prizeId) {
    const prize = winnerStore.prizes.find((p) => p.id === w.prizeId);
    if (prize?.imageUrl) return prize.imageUrl;
  }
  const spin = winnerStore.latestProductionSpinForMonth(w.monthKey);
  if (spin?.prizeId) {
    const prize = winnerStore.prizes.find((p) => p.id === spin.prizeId);
    if (prize?.imageUrl) return prize.imageUrl;
  }
  return null;
});

const canSpinOfficial = computed(() => canSpinOfficialWheel(auth.user, currentWinner.value));

// Continuous JS-based smooth idle rotation loop
const isIdle = computed(() => !spinning.value && (!isCurrentUserSelectedWinner.value || !isPrizeSpun.value));

let idleFrameId: number | null = null;

const startIdleRotation = () => {
  if (spinning.value || (isCurrentUserSelectedWinner.value && isPrizeSpun.value)) return;
  stopIdleRotation();
  const tick = () => {
    if (spinning.value || (isCurrentUserSelectedWinner.value && isPrizeSpun.value)) return;
    wheelRotation.value = (wheelRotation.value + 0.05) % 360; // slow gentle rotation
    idleFrameId = requestAnimationFrame(tick);
  };
  idleFrameId = requestAnimationFrame(tick);
};

const stopIdleRotation = () => {
  if (idleFrameId !== null) {
    cancelAnimationFrame(idleFrameId);
    idleFrameId = null;
  }
};

watch([selectedMonth, isIdle], ([_, newIdle]) => {
  if (newIdle) {
    startIdleRotation();
  } else {
    stopIdleRotation();
  }
}, { immediate: true });

onUnmounted(() => {
  stopIdleRotation();
});

// Physics & Animation
const runSpinAnimation = async (winningPrizeId: string): Promise<number> => {
  spinning.value = true;
  winningIndex.value = null;
  flashActive.value = false;
  showWinnerHighlight.value = false;

  stopIdleRotation();

  const list = activePrizes.value;
  const n = list.length;
  const seg = 360 / n;
  
  // Find index of winning prize
  const idx = list.findIndex(p => p.id === winningPrizeId);
  winningIndex.value = idx !== -1 ? idx : 0;

  const mid = winningIndex.value * seg + seg / 2; // clockwise from top
  const landing = (360 - mid) % 360;             // rotate the winning slice to the top pointer
  
  const startRot = wheelRotation.value;
  const fullSpins = 7;
  
  // Calculate target rotation to avoid jump
  const currentAngleModulo = startRot % 360;
  const additionalRotation = (landing - currentAngleModulo + 360) % 360;
  const targetRot = startRot + 360 * fullSpins + additionalRotation;

  soundSystem.playStart();

  return new Promise<number>((resolve) => {
    let startTime: number | null = null;
    const duration = 8500; // 8.5 seconds
    let lastRot = startRot;
    let lastPegCrossing = Math.floor((startRot + seg / 2) / seg);
    let lastTickTime = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const t = progress;
      let eased = 0;
      if (t < 0.82) {
        const tNorm = t / 0.82;
        eased = 0.975 * (1 - Math.pow(1 - tNorm, 5));
      } else {
        const tLocal = (t - 0.82) / 0.18;
        const startVal = 0.975;
        const targetVal = 1.006;
        
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

      const currentPegCrossing = Math.floor((currentRot + seg / 2) / seg);
      const instVelocity = currentRot - lastRot;
      
      if (currentPegCrossing !== lastPegCrossing) {
        const nowMs = performance.now();
        if (nowMs - lastTickTime > 35) {
          soundSystem.playTick();
          lastTickTime = nowMs;
        }
        pointerVelocity += Math.min(15, Math.max(1, instVelocity * 1.5));
        lastPegCrossing = currentPegCrossing;
      }

      lastRot = currentRot;

      const k = 0.22;
      const damping = 0.16;
      const force = -k * pointerAngle.value - damping * pointerVelocity;
      pointerVelocity += force;
      pointerAngle.value += pointerVelocity;

      if (progress < 1 || Math.abs(pointerAngle.value) > 0.08 || Math.abs(pointerVelocity) > 0.08) {
        requestAnimationFrame(animate);
      } else {
        pointerAngle.value = 0;
        pointerVelocity = 0;
        resolve(winningIndex.value ?? 0);
      }
    };

    requestAnimationFrame(animate);
  });
};

const spinTest = async () => {
  const list = activePrizes.value;
  if (spinning.value || list.length < 2) return;
  
  spinningTest.value = true;
  testResultPrize.value = null;

  // Pick a random prize
  const randomPrize = list[Math.floor(Math.random() * list.length)];
  
  const finalIdx = await runSpinAnimation(randomPrize.id);
  
  soundSystem.playWin();
  showWinnerHighlight.value = true;
  flashActive.value = true;

  await new Promise((resolve) => setTimeout(resolve, 1600));

  soundSystem.playCelebration();
  showWinnerHighlight.value = false;
  flashActive.value = false;
  spinning.value = false;
  spinningTest.value = false;

  testResultPrize.value = list[finalIdx];
  testResultModalOpen.value = true;
};

const showPracticeWheel = ref(false);

const handlePracticeSpin = () => {
  showPracticeWheel.value = true;
  nextTick(() => {
    void spinTest();
  });
};

const spinOfficial = async () => {
  const list = activePrizes.value;
  const winner = currentWinner.value;
  if (!winner || !winner.winnerUserId || spinning.value || list.length < 2) return;

  if (!canSpinOfficial.value) {
    pushToast('Spin Locked', 'You do not have permission to spin this official reward wheel.', 'warning');
    return;
  }

  spinningOfficial.value = true;
  officialResultPrize.value = null;

  // Pick the prize according to supervisor setup (Random Equal vs Exact Prize Mode)
  let chosenPrize = list[Math.floor(Math.random() * list.length)];
  if (winner.officialPrizeMode === 'exact' && winner.exactPrizeId) {
    const exact = list.find((p) => p.id === winner.exactPrizeId);
    if (exact) chosenPrize = exact;
  }

  const finalIdx = await runSpinAnimation(chosenPrize.id);

  const saved = await winnerStore.recordSpin({
    monthKey: selectedMonth.value,
    winnerUserId: winner.winnerUserId,
    prizeId: chosenPrize.id,
    prizeName: chosenPrize.name,
    prizeImageUrl: chosenPrize.imageUrl,
    isOfficial: true,
    isLocked: true,
    spinResult: {
      prize_id: chosenPrize.id,
      prize_name: chosenPrize.name,
      mode: 'production',
      wheel_rotation: wheelRotation.value,
      pool_size: list.length
    }
  });

  if (!saved) {
    pushToast('Could not save result', winnerStore.error || 'Please try again.', 'warning');
    spinning.value = false;
    spinningOfficial.value = false;
    startIdleRotation();
    return;
  }

  soundSystem.playWin();
  showWinnerHighlight.value = true;
  flashActive.value = true;

  await new Promise((resolve) => setTimeout(resolve, 1600));

  soundSystem.playCelebration();
  showWinnerHighlight.value = false;
  flashActive.value = false;
  spinning.value = false;
  spinningOfficial.value = false;

  officialResultPrize.value = list[finalIdx];
  officialResultModalOpen.value = true;

  pushToast('Congratulations!', `You won ${chosenPrize.name}!`, 'success');
};

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

const pointAt = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 150 + radius * Math.sin(rad), y: 150 - radius * Math.cos(rad) };
};

const wheelSegments = computed(() => {
  const list = activePrizes.value;
  const n = list.length;
  if (n === 0) return [];
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

const monthLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

// ── Scoring (mirrors get_team_leaderboard in migration 0070) ──────────────────
const SCORE = {
  approved:  15,
  submitted: 5,
  followup:  3,
  needs_fix: -3,
  rejected:  -8,
} as const;

const scoreRules = [
  { label: 'Task approved by admin', points: SCORE.approved },
  { label: 'Submit a task for review', points: SCORE.submitted },
  { label: 'Followup done (blog / plugin / speed / eBay)', points: SCORE.followup },
  { label: 'Task needs fix', points: SCORE.needs_fix },
  { label: 'Work rejected', points: SCORE.rejected },
];

interface BreakdownItem { label: string; points: number; count: number }
interface Row {
  userId: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  rank: number;
  totalPoints: number;
  approvedCount: number;
  submittedCount: number;
  followupsCount: number;
  needsFixCount: number;
  rejectedCount: number;
  adjustmentPoints: number;
  breakdown: BreakdownItem[];
}

// Raw shape returned by the RPC.
interface RpcRow {
  member_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  total_points: number;
  approved_count: number;
  submitted_count: number;
  followups_count: number;
  needs_fix_count: number;
  rejected_count: number;
  adjustment_points: number;
  rank: number;
}

const rows = ref<Row[]>([]);
const loading = ref(true);
const error = ref('');

const buildBreakdown = (r: RpcRow): BreakdownItem[] =>
  [
    { label: 'Approved work', points: r.approved_count * SCORE.approved, count: r.approved_count },
    { label: 'Submitted tasks', points: r.submitted_count * SCORE.submitted, count: r.submitted_count },
    { label: 'Followups done', points: r.followups_count * SCORE.followup, count: r.followups_count },
    { label: 'Needs fix', points: r.needs_fix_count * SCORE.needs_fix, count: r.needs_fix_count },
    { label: 'Rejected', points: r.rejected_count * SCORE.rejected, count: r.rejected_count },
    { label: 'Head bonus', points: r.adjustment_points, count: r.adjustment_points !== 0 ? 1 : 0 },
  ].filter((b) => b.count !== 0);

const load = async () => {
  if (!supabaseConfigured) {
    error.value = 'Leaderboard is not configured.';
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const { data, error: err } = await supabase.rpc('get_team_leaderboard', {
      p_month_key: selectedMonth.value,
    });
    if (err) throw err;
    rows.value = ((data ?? []) as RpcRow[]).map((r) => ({
      userId: r.member_id,
      fullName: r.full_name || 'Team member',
      avatarUrl: r.avatar_url || '',
      role: r.role || 'member',
      rank: r.rank,
      totalPoints: r.total_points,
      approvedCount: r.approved_count,
      submittedCount: r.submitted_count,
      followupsCount: r.followups_count,
      needsFixCount: r.needs_fix_count,
      rejectedCount: r.rejected_count,
      adjustmentPoints: r.adjustment_points,
      breakdown: buildBreakdown(r),
    }));
    // Background fetch Winner Center data & profile directory
    if (auth.isAuthenticated) {
      await Promise.all([
        winnerStore.fetchAll(),
        fetchProfiles()
      ]);
    }
  } catch (e: unknown) {
    console.error('[leaderboard] get_team_leaderboard failed', e);
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
    error.value = msg
      ? `${msg} — make sure migration 0070_team_leaderboard_live.sql has been run in Supabase.`
      : 'Please try again.';
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

watch(selectedMonth, load);
onMounted(load);

// ── Podium ──
interface PodiumSlot { rank: 1 | 2 | 3; label: string; medal: string; row?: Row }
const podium = computed<PodiumSlot[]>(() => [
  { rank: 1, label: '1st place', medal: '🥇', row: rows.value[0] },
  { rank: 2, label: '2nd place', medal: '🥈', row: rows.value[1] },
  { rank: 3, label: '3rd place', medal: '🥉', row: rows.value[2] },
]);

const previewWinnersBanner = () => window.dispatchEvent(new Event('open-winners-banner'));
const previewRecap = () => window.dispatchEvent(new Event('preview-monthly-recap'));

// ── Manual score adjustment (admin / head) ────────────────────────────────────
interface Adjustment { id: string; points: number; reason: string | null; created_at: string }
const adjustOpen = ref(false);
const adjustTarget = ref<{ id: string; name: string } | null>(null);
const adjustPoints = ref<number | null>(null);
const adjustReason = ref('');
const adjustSaving = ref(false);
const adjustError = ref('');
const adjustList = ref<Adjustment[]>([]);
const adjustListLoading = ref(false);

const fetchAdjustments = async (memberId: string) => {
  adjustListLoading.value = true;
  try {
    const { data, error: err } = await supabase
      .from('leaderboard_adjustments')
      .select('id, points, reason, created_at')
      .eq('month_key', selectedMonth.value)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    if (err) throw err;
    adjustList.value = (data ?? []) as Adjustment[];
  } catch (e) {
    console.error('[leaderboard] fetch adjustments failed', e);
    adjustList.value = [];
  } finally {
    adjustListLoading.value = false;
  }
};

const openAdjust = (row: Row) => {
  adjustTarget.value = { id: row.userId, name: row.fullName };
  adjustPoints.value = null;
  adjustReason.value = '';
  adjustError.value = '';
  adjustOpen.value = true;
  void fetchAdjustments(row.userId);
};
const closeAdjust = () => { adjustOpen.value = false; adjustTarget.value = null; };

const saveAdjust = async () => {
  if (!adjustTarget.value) return;
  const pts = Number(adjustPoints.value);
  if (!Number.isFinite(pts) || pts === 0) { adjustError.value = 'Enter a non-zero points value (e.g. 25 or -10).'; return; }
  adjustSaving.value = true;
  adjustError.value = '';
  try {
    const { error: err } = await supabase.rpc('add_leaderboard_adjustment', {
      p_month_key: selectedMonth.value,
      p_member_id: adjustTarget.value.id,
      p_points: Math.round(pts),
      p_reason: adjustReason.value.trim() || null,
    });
    if (err) throw err;
    adjustPoints.value = null;
    adjustReason.value = '';
    await Promise.all([fetchAdjustments(adjustTarget.value.id), load()]);
  } catch (e: unknown) {
    console.error('[leaderboard] add adjustment failed', e);
    adjustError.value = (e instanceof Error ? e.message : (e as { message?: string })?.message) || 'Could not save adjustment.';
  } finally {
    adjustSaving.value = false;
  }
};

const removeAdjust = async (id: string) => {
  try {
    const { error: err } = await supabase.rpc('delete_leaderboard_adjustment', { p_id: id });
    if (err) throw err;
    if (adjustTarget.value) await Promise.all([fetchAdjustments(adjustTarget.value.id), load()]);
  } catch (e) {
    console.error('[leaderboard] delete adjustment failed', e);
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Helpers ──
const hasActivity = (row: Row) =>
  row.approvedCount + row.submittedCount + row.followupsCount + row.needsFixCount + row.rejectedCount + Math.abs(row.adjustmentPoints) > 0;
const formatNumber = (v: number) => new Intl.NumberFormat().format(v);
const initials = (name: string) =>
  (name || '?').split(/[\s@.]+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
</script>

<style scoped>
.lb-page { display: flex; flex-direction: column; gap: 1.4rem; padding-bottom: 2.5rem; }

/* ── Hero ── */
.lb-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 12%, transparent), transparent 32%),
    var(--card-bg);
  padding: 1.25rem;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}
.lb-hero-left { display: flex; align-items: center; gap: 1rem; min-width: 0; }
.lb-hero-icon {
  display: flex; height: 3rem; width: 3rem; flex: 0 0 auto;
  align-items: center; justify-content: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 13%, var(--card-bg));
  color: var(--primary);
}
.lb-hero-icon svg { height: 1.45rem; width: 1.45rem; }
.lb-kicker {
  display: block;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem; font-weight: 850; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--primary); margin-bottom: 0.2rem;
}
.lb-title {
  margin: 0;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.4rem; font-weight: 900; color: var(--text-main); line-height: 1.15;
}
.lb-subtitle { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
.lb-hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
.lb-preview-row { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: flex-end; }
.lb-preview-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.4rem 0.8rem; border-radius: 10px;
  border: 1px solid var(--border); background: var(--card-bg);
  color: var(--text-muted); font-size: 0.78rem; font-weight: 700; cursor: pointer;
  transition: border-color 140ms, color 140ms, background 140ms;
}
.lb-preview-btn:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
}

/* ── Generic card / states ── */
.lb-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card-bg);
  padding: 1.1rem 1.25rem;
}
.lb-state { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2.5rem 1.5rem; }
.lb-state-title { font-weight: 800; color: var(--text-main); }
.lb-state-sub { color: var(--text-muted); font-size: 0.85rem; max-width: 32rem; margin: 0; }

/* ── Podium ── */
.lb-podium {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
.lb-podium-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(16,24,40,0.06), 0 8px 24px rgba(15,23,42,0.06);
}
.lb-rank-1 { border-color: color-mix(in srgb, #f59e0b 55%, var(--border)); box-shadow: 0 0 0 1px color-mix(in srgb, #f59e0b 20%, transparent), 0 18px 48px color-mix(in srgb, #f59e0b 18%, transparent); }
.lb-rank-2 { border-color: color-mix(in srgb, #94a3b8 45%, var(--border)); }
.lb-rank-3 { border-color: color-mix(in srgb, #d97706 40%, var(--border)); }
.lb-mine { outline: 2px solid color-mix(in srgb, var(--primary) 45%, transparent); outline-offset: 2px; }

.lb-podium-top { display: flex; align-items: center; gap: 0.5rem; }
.lb-medal { font-size: 1.4rem; line-height: 1; }
.lb-place {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--text-muted);
}
.lb-podium-avatar {
  display: flex; align-items: center; justify-content: center;
  height: 4.75rem; width: 4.75rem; margin-top: 0.85rem;
  overflow: hidden; border-radius: 999px;
  background: var(--soft-bg); color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.25rem; font-weight: 800;
  border: 3px solid var(--border);
}
.lb-podium-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-ring-1 { height: 5.5rem; width: 5.5rem; border-color: #f59e0b; box-shadow: 0 0 0 4px color-mix(in srgb, #f59e0b 18%, transparent); }
.lb-ring-2 { border-color: #94a3b8; }
.lb-ring-3 { border-color: #d97706; }
.lb-podium-name {
  margin: 0.7rem 0 0;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.05rem; font-weight: 800; color: var(--text-main); line-height: 1.2;
}
.lb-role {
  margin-top: 0.4rem;
  border-radius: 999px; padding: 0.22rem 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem; font-weight: 700;
}
.lb-podium-points {
  margin-top: 0.75rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: clamp(1.9rem, 3.5vw, 2.4rem); font-weight: 900; line-height: 1;
  color: var(--text-main); letter-spacing: -0.02em;
}
.lb-rank-1 .lb-podium-points { color: #d97706; }
.lb-podium-points-label { color: var(--text-muted); font-size: 0.74rem; margin-top: 0.15rem; }

.lb-podium-bd {
  width: 100%; margin-top: 1rem;
  border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
}
.lb-bd-row {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  padding: 0.42rem 0.75rem; font-size: 0.78rem;
  border-bottom: 1px solid var(--border);
}
.lb-bd-row:last-child { border-bottom: none; }
.lb-bd-row span { color: var(--text-muted); }
.lb-bd-count { color: var(--text-main); font-weight: 700; }
.lb-bd-row strong { font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-weight: 800; }
.lb-pos { color: #16a34a; }
.lb-neg { color: #dc2626; }

.lb-podium-empty-body { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem 0; }
.lb-podium-avatar--empty { margin: 0; background: var(--soft-bg); color: var(--text-muted); border-style: dashed; }
.lb-podium-empty-body p { margin: 0; color: var(--text-muted); font-size: 0.82rem; }

/* ── Standings ── */
.lb-standings-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; }
.lb-standings-head h2 { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.05rem; font-weight: 800; color: var(--text-main); }
.lb-standings-count { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
.lb-rows { display: flex; flex-direction: column; gap: 0.4rem; }
.lb-row {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid var(--border); border-radius: 14px;
  background: color-mix(in srgb, var(--soft-bg) 40%, var(--card-bg));
}
.lb-row-mine { border-color: color-mix(in srgb, var(--primary) 45%, var(--border)); background: color-mix(in srgb, var(--primary) 6%, var(--card-bg)); }
.lb-row-rank {
  flex-shrink: 0; width: 1.9rem; text-align: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.95rem; font-weight: 800; color: var(--text-muted);
}
.lb-row-rank-1 { color: #d97706; }
.lb-row-rank-2 { color: #64748b; }
.lb-row-rank-3 { color: #b45309; }
.lb-row-avatar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  height: 2.5rem; width: 2.5rem; overflow: hidden; border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.78rem; font-weight: 800;
}
.lb-row-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-row-info { flex: 1; min-width: 0; }
.lb-row-name {
  display: flex; align-items: center; gap: 0.4rem;
  font-weight: 700; color: var(--text-main); font-size: 0.88rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lb-you {
  flex-shrink: 0;
  background: var(--primary); color: #fff;
  font-size: 0.62rem; font-weight: 800; border-radius: 999px; padding: 0.05rem 0.4rem;
}
.lb-row-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.3rem; }
.lb-chip {
  font-size: 0.68rem; font-weight: 700;
  border-radius: 999px; padding: 0.1rem 0.5rem;
  background: var(--soft-bg); color: var(--text-muted);
}
.lb-chip-green { background: rgba(22,163,74,0.12); color: #16a34a; }
.lb-chip-blue  { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
.lb-chip-amber { background: rgba(217,119,6,0.14); color: #d97706; }
.lb-chip-red   { background: rgba(220,38,38,0.12); color: #dc2626; }
.lb-chip-gold  { background: rgba(245,158,11,0.16); color: #d97706; }
.lb-chip-muted { opacity: 0.7; }

/* Adjust button */
.lb-adjust-btn {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; border-radius: 9px;
  border: 1px solid var(--border); background: var(--card-bg); color: var(--text-muted);
  cursor: pointer; transition: border-color 140ms, color 140ms, background 140ms;
}
.lb-adjust-btn:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}

/* Adjust modal */
.lb-adjust-body { display: flex; flex-direction: column; }
.lb-adjust-hint { margin: 0 0 0.6rem; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; }
.lb-adjust-label { font-size: 0.76rem; font-weight: 700; color: var(--text-main); margin: 0.5rem 0 0.25rem; }
.lb-adjust-input {
  width: 100%; border: 1px solid var(--border); border-radius: 10px;
  background: var(--card-bg); color: var(--text-main);
  padding: 0.55rem 0.75rem; font-size: 0.88rem; outline: none;
}
.lb-adjust-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent); }
.lb-adjust-error { margin: 0.6rem 0 0; font-size: 0.78rem; font-weight: 600; color: #dc2626; }
.lb-adjust-list { margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.7rem; }
.lb-adjust-list-head { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.4rem; }
.lb-adjust-item { display: flex; align-items: center; gap: 0.55rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
.lb-adjust-item:last-child { border-bottom: none; }
.lb-adjust-item-pts { flex-shrink: 0; font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-weight: 800; font-size: 0.85rem; min-width: 2.4rem; }
.lb-adjust-item-reason { flex: 1; min-width: 0; font-size: 0.8rem; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-adjust-item-date { flex-shrink: 0; font-size: 0.7rem; color: var(--text-muted); }
.lb-adjust-item-del { flex-shrink: 0; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.85rem; padding: 0.1rem 0.3rem; border-radius: 6px; }
.lb-adjust-item-del:hover { color: #dc2626; background: rgba(220,38,38,0.1); }
.lb-row-points {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; line-height: 1;
}
.lb-row-points strong {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.15rem; font-weight: 900; color: var(--text-main);
}
.lb-row-points span { font-size: 0.62rem; color: var(--text-muted); margin-top: 0.1rem; }

/* ── Rules ── */
.lb-rules h2 { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.05rem; font-weight: 800; color: var(--text-main); }
.lb-rules-sub { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.82rem; }
.lb-rules-grid { display: grid; grid-template-columns: 1fr; gap: 0.5rem; margin-top: 0.9rem; }
.lb-rule {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  border: 1px solid var(--border); border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 60%, transparent);
  padding: 0.6rem 0.8rem;
}
.lb-rule span { color: var(--text-muted); font-size: 0.82rem; }
.lb-rule strong { font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-weight: 800; font-size: 0.85rem; }

/* ── Skeleton ── */
.lb-skel { background: color-mix(in srgb, var(--text-muted) 14%, transparent); border-radius: 8px; animation: lb-pulse 1.3s ease-in-out infinite; }
.lb-skel-card { gap: 0.6rem; }
.lb-skel-avatar { height: 4.75rem; width: 4.75rem; border-radius: 999px; margin-top: 0.85rem; }
.lb-skel-line { height: 0.9rem; width: 60%; margin-top: 0.4rem; }
.lb-skel-points { height: 1.6rem; width: 40%; }
@keyframes lb-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Responsive podium (desktop: 2 · 1 · 3) ── */
@media (min-width: 860px) {
  .lb-podium { grid-template-columns: repeat(3, 1fr); align-items: start; }
  .lb-rank-1 { order: 2; }
  .lb-rank-2 { order: 1; margin-top: 1.75rem; }
  .lb-rank-3 { order: 3; margin-top: 1.75rem; }
  .lb-rules-grid { grid-template-columns: repeat(2, 1fr); }
}

/* ── Monthly Reward Wheel Section ── */
.lb-reward-wheel-section {
  padding: 1.5rem 1.6rem;
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--primary) 12%, transparent), transparent 45%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary) 4%, var(--card-bg)), var(--card-bg));
  box-shadow: 0 12px 36px color-mix(in srgb, var(--primary) 10%, transparent);
}
.lb-reward-wheel-head {
  margin-bottom: 1.5rem;
}
.lb-reward-wheel-title {
  margin: 0;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--text-main);
  letter-spacing: -0.01em;
}
.lb-reward-wheel-subtitle {
  margin: 0.25rem 0 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.lb-reward-wheel-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 2rem;
  align-items: start;
}

/* Wheel preview container */
.lb-wheel-preview-area {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}
.lb-wheel-stage-lb {
  position: relative;
  width: 320px;
  height: 320px;
  aspect-ratio: 1;
}
.lb-wheel-pointer-container-lb {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
}
.lb-wheel-pointer-svg-lb {
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.25));
  width: 24px;
  height: 32px;
}
.lb-wheel-svg-lb {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  box-shadow: 
    0 0 20px var(--primary-ring),
    0 10px 30px rgba(15, 23, 42, 0.25),
    inset 0 0 15px rgba(255, 255, 255, 0.08);
}
.lb-wheel-svg--idle {
  animation: lb-wheel-rotate-idle 40s linear infinite;
}
@keyframes lb-wheel-rotate-idle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.lb-wheel-hub-group {
  user-select: none;
}

/* Details and status area */
.lb-wheel-details-area {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Reward Status Banner */
.lb-reward-status-banner {
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.85rem 1rem;
}
.lb-reward-month-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 0.4rem;
}
.lb-reward-status-content {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.lb-reward-status-text {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main);
}
.lb-reward-status-text--unselected {
  color: var(--text-muted);
  font-weight: 600;
}
.lb-reward-status-icon {
  font-size: 0.95rem;
  flex-shrink: 0;
}
.lb-winner-highlight {
  color: var(--primary);
  font-weight: 900;
}
.lb-prize-highlight {
  color: #15D6C2; /* Teal highlight */
  font-weight: 900;
}

/* Spin Locked State */
.lb-spin-locked-container {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: rgba(15, 23, 42, 0.04);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 0.75rem 1rem;
}
:root[data-theme='dark-gray'] .lb-spin-locked-container {
  background: rgba(255, 255, 255, 0.02);
}
.lb-spin-locked-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.85rem;
  border-radius: 9px;
  background: var(--soft-bg);
  color: var(--text-soft);
  border: 1px solid var(--border);
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  cursor: not-allowed;
  flex-shrink: 0;
}
.lb-spin-locked-text {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
}

/* Prize Pool Preview Section */
.lb-pool-preview-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.lb-pool-preview-title {
  margin: 0;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--text-main);
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.4rem;
}
.lb-pool-empty {
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  padding: 1rem;
}
.lb-pool-preview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 0.75rem;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 0.25rem;
}
.lb-pool-preview-card {
  position: relative;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.lb-pool-preview-card:hover {
  border-color: color-mix(in srgb, var(--primary) 25%, var(--border));
  box-shadow: var(--shadow-md);
}
.lb-pool-preview-chance {
  position: absolute;
  top: 0.35rem;
  left: 0.35rem;
  z-index: 1;
  background: rgba(15, 23, 42, 0.75);
  color: #ffffff;
  font-size: 0.6rem;
  font-weight: 850;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  backdrop-filter: blur(2px);
}
.lb-pool-preview-img {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 6px;
  overflow: hidden;
  background: var(--soft-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
}
.lb-pool-preview-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.lb-pool-preview-fallback {
  font-size: 1.25rem;
}
.lb-pool-preview-name {
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--text-main);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 0.1rem;
}

/* Responsive queries */
@media (max-width: 860px) {
  .lb-reward-wheel-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .lb-wheel-preview-area {
    order: 1;
  }
  .lb-wheel-details-area {
    order: 2;
  }
  .lb-wheel-stage-lb {
    width: 280px;
    height: 280px;
  }
}
@media (max-width: 480px) {
  .lb-reward-wheel-section {
    padding: 1.1rem;
  }
  .lb-wheel-stage-lb {
    width: 240px;
    height: 240px;
  }
  .lb-pool-preview-grid {
    grid-template-columns: repeat(2, 1fr); /* 2 columns on mobile */
    max-height: 180px;
  }
  .lb-spin-locked-container {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
    gap: 0.4rem;
  }
  .lb-spin-locked-btn {
    justify-content: center;
  }
}

/* ── Premium Carnival & Preview Styles ── */
.wc-rim-bulb {
  fill: #fef08a;
  stroke: rgba(0,0,0,0.12);
  stroke-width: 0.5;
  animation: wc-bulb-glow 0.9s ease-in-out infinite alternate;
}
@keyframes wc-bulb-glow {
  0% { fill: #cbd5e1; filter: drop-shadow(0 0 1px rgba(255,255,255,0.2)); }
  100% { fill: #fbbf24; filter: drop-shadow(0 0 6px #facc15); }
}

.lb-preview-modal-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
  text-align: center;
}
.lb-preview-modal-image-container {
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
.lb-preview-modal-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lb-preview-modal-fallback {
  font-size: 5rem;
}
.lb-preview-modal-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.6rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
}

.lb-pool-preview-img {
  position: relative;
}
.lb-pool-preview-img-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.2rem;
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  transition: opacity 140ms ease;
  border-radius: 6px;
}
.lb-pool-preview-img:hover .lb-pool-preview-img-overlay {
  opacity: 1;
}

/* ── Winner Showcase Celebration Card ── */
.lb-winner-showcase-container {
  position: relative;
  width: 320px;
  height: 320px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border));
  background:
    radial-gradient(circle at center, color-mix(in srgb, var(--primary) 15%, transparent), transparent 75%),
    #090d16;
  box-shadow: 
    0 12px 30px rgba(0, 0, 0, 0.4),
    inset 0 0 20px rgba(255, 255, 255, 0.05);
}
.lb-showcase-halo {
  position: absolute;
  width: 420px;
  height: 420px;
  background: conic-gradient(from 0deg, #15D6C2, #2563EB, #a855f7, #ec4899, #fbbf24, #15D6C2);
  animation: wc-spin-slow 7s linear infinite;
  opacity: 0.45;
}
.lb-showcase-card {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 250px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  padding: 1.25rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
.lb-showcase-badge {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.62rem;
  font-weight: 850;
  letter-spacing: 0.08em;
  color: #fbbf24;
  margin-bottom: 0.6rem;
}
.lb-showcase-img-wrap {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  background: #ffffff;
  border: 3px solid #fbbf24;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  margin-bottom: 0.8rem;
  animation: wc-float-item 2.5s ease-in-out infinite alternate;
}
.lb-showcase-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.lb-showcase-fallback {
  font-size: 2.5rem;
}
.lb-showcase-prize-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
  color: #ffffff;
  margin: 0 0 0.35rem;
}
.lb-showcase-msg {
  font-size: 0.72rem;
  color: #94a3b8;
  margin: 0;
  line-height: 1.4;
}

/* ── Badges and spin states ── */
.wc-winner-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  text-transform: uppercase;
}
.wc-winner-badge--won {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}
.lb-official-spin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 75%, #000));
  color: #ffffff;
  border: none;
  font-size: 0.9rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 15px color-mix(in srgb, var(--primary) 40%, transparent);
  transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s;
}
.lb-official-spin-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 50%, transparent);
}
.lb-official-spin-btn:active:not(:disabled) {
  transform: translateY(0);
}
.lb-official-spin-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  box-shadow: none;
}
.lb-winner-badge-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.lb-winner-note-text {
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-muted);
}
.lb-official-spin-controls, .lb-official-spun-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}
.lb-spin-locked-text--won {
  color: var(--text-main);
  font-size: 0.88rem;
}

/* ── Result Modal styling ── */
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
.wc-result-box-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

@keyframes wc-spin-slow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes wc-float-item {
  0% { transform: translateY(-6px) rotate(-1.5deg); }
  100% { transform: translateY(8px) rotate(2.5deg); }
}

/* Practice and Official Spin custom styling */
.lb-spin-header-info {
  width: 100%;
  margin-bottom: 0.5rem;
}
.lb-spin-actions-row {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}
.lb-practice-spin-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex: 1;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 10%, var(--card-bg));
  border: 1px solid color-mix(in srgb, var(--primary) 25%, var(--border));
  color: var(--primary);
  font-size: 0.82rem;
  font-weight: 755;
  cursor: pointer;
  transition: transform 0.15s ease, background 0.15s ease;
}
.lb-practice-spin-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary) 16%, var(--card-bg));
  transform: translateY(-1px);
}
.lb-practice-spin-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.lb-official-spin-btn-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex: 1.2;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, #000));
  border: none;
  color: #ffffff;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 30%, transparent);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.lb-official-spin-btn-new:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px color-mix(in srgb, var(--primary) 45%, transparent);
}
.lb-spin-locked-btn-new {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  flex: 1.2;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 755;
  cursor: not-allowed;
}
.lb-practice-disclaimer-text {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-align: center;
  width: 100%;
  margin-top: 0.4rem;
}
.lb-pool-preview-chance-badge {
  position: absolute;
  top: 0.35rem;
  right: 0.35rem;
  z-index: 10;
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fef08a;
  font-size: 0.58rem;
  font-weight: 850;
  padding: 0.12rem 0.35rem;
  border-radius: 5px;
  backdrop-filter: blur(3px);
  pointer-events: none;
}
.wc-winner-badge--locked {
  background: var(--soft-bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
}
</style>
