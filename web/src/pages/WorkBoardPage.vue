<template>
  <div class="wb-page">
    <PageHeader
      title="Work Board"
      subtitle="Manage task assignments and track team progress."
    />

    <div class="wb-cards">
      <!-- My Work Board -->
      <div class="wb-card">
        <div class="wb-card-icon wb-card-icon--my">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2"/>
            <path d="M8 8h3M8 12h5M16 8h1M16 12h1M8 16h2"/>
          </svg>
        </div>
        <div class="wb-card-body">
          <h2 class="wb-card-title">My Work Board</h2>
          <p class="wb-card-desc">View and manage only your assigned tasks — across all columns and priorities.</p>
          <ul class="wb-card-details">
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Only your assigned tasks
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
              Columns: To Do · In Progress · Waiting Review · Needs Fix · Completed
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Update status and track your progress
            </li>
          </ul>
          <RouterLink to="/work-board/my" class="wb-card-btn">
            Open My Work Board
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </RouterLink>
        </div>
      </div>

      <!-- Team Work Board (admin only) -->
      <div v-if="auth.isAdmin" class="wb-card">
        <div class="wb-card-icon wb-card-icon--team">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div class="wb-card-body">
          <h2 class="wb-card-title">Team Work Board</h2>
          <p class="wb-card-desc">View all members' work boards, assign tasks, and monitor team progress.</p>
          <ul class="wb-card-details">
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              See every member and their active tasks
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Assign new tasks to any member
            </li>
            <li>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Click any member to open their board
            </li>
          </ul>
          <RouterLink to="/work-board/members" class="wb-card-btn wb-card-btn--team">
            Open Team Work Board
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
</script>

<style scoped>
.wb-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.wb-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
  gap: 1.25rem;
}

.wb-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  padding: 1.5rem;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
  transition: box-shadow 160ms, transform 160ms;
}

.wb-card:hover {
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.09);
  transform: translateY(-2px);
}

.wb-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 16px;
  flex-shrink: 0;
}

.wb-card-icon--my {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
}

.wb-card-icon--team {
  background: rgba(124, 58, 237, 0.12);
  color: #7c3aed;
}

.wb-card-body {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1;
}

.wb-card-title {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.2rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
}

.wb-card-desc {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.55;
  margin: 0;
}

.wb-card-details {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.wb-card-details li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.wb-card-details svg {
  flex-shrink: 0;
  color: var(--primary);
  opacity: 0.7;
}

.wb-card-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 12px;
  background: var(--primary);
  color: #fff;
  padding: 0.6rem 1.1rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.84rem;
  font-weight: 800;
  text-decoration: none;
  align-self: flex-start;
  margin-top: auto;
  transition: opacity 150ms;
}

.wb-card-btn:hover { opacity: 0.88; }

.wb-card-btn--team {
  background: #7c3aed;
}
</style>
