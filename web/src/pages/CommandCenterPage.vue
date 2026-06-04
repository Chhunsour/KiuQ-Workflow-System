<template>
  <div class="command-center-page flex flex-col gap-6" v-if="auth.isHeadOrSupervisor">
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 class="page-title flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Command Center
        </h1>
        <p class="page-subtitle">Private Executive Workspace & Company Operating System</p>
      </div>

      <!-- Global Actions / Search -->
      <div class="flex items-center gap-3">
        <div class="relative w-full md:w-64">
          <input
            v-model="searchQuery"
            type="text"
            class="input pl-9 py-2"
            placeholder="Search all logs, ideas, notes..."
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-text-soft">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
        </div>
      </div>
    </header>

    <!-- Executive Metrics Row -->
    <section class="metrics-section">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-bold uppercase tracking-wider text-text-soft">Executive Metrics</h3>
        <button
          type="button"
          class="text-xs text-primary font-bold hover:underline flex items-center gap-1"
          @click="openMetricModal(null)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add KPI
        </button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          v-for="m in ccStore.metrics"
          :key="m.id"
          class="kpi cursor-pointer relative group transition-all"
          @click="openMetricModal(m)"
        >
          <div class="flex-1">
            <span class="kpi-label block truncate">{{ m.label }}</span>
            <span class="kpi-value block mt-1 truncate">{{ m.value }}</span>
          </div>
          <div class="flex flex-col items-end gap-1">
            <span
              v-if="m.trend"
              class="badge text-[10px] px-1.5 py-0.5"
              :class="[
                m.trend.startsWith('+')
                  ? 'bg-status-approved-bg text-status-approved-fg'
                  : m.trend.startsWith('-')
                    ? 'bg-status-needs-fix-bg text-status-needs-fix-fg'
                    : 'bg-soft text-text-muted'
              ]"
            >
              {{ m.trend }}
            </span>
            <span class="opacity-0 group-hover:opacity-100 text-[10px] text-primary transition-opacity font-medium">
              Edit
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Workspace Layout -->
    <div class="workspace-container grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 mt-2">
      <!-- Subbar Tabs -->
      <nav class="flex flex-row lg:flex-col overflow-x-auto lg:overflow-x-visible border-b lg:border-b-0 lg:border-r border-border pb-3 lg:pb-0 lg:pr-4 gap-1.5 scrollbar-none select-none">
        <button
          v-for="tab in centerTabs"
          :key="tab.id"
          type="button"
          class="flex items-center gap-2.5 px-3 py-2 text-sm font-semibold rounded-btn transition-all text-left whitespace-nowrap"
          :class="[
            activeSection === tab.id
              ? 'bg-primary-soft text-primary font-bold'
              : 'text-text-muted hover:bg-soft hover:text-text-main'
          ]"
          @click="activeSection = tab.id"
        >
          <span class="flex-shrink-0" v-html="tab.icon"></span>
          <span>{{ tab.label }}</span>
          <span
            v-if="getTabBadge(tab.id)"
            class="ml-auto text-[10px] bg-soft px-1.5 py-0.5 rounded-full font-bold text-text-muted"
          >
            {{ getTabBadge(tab.id) }}
          </span>
        </button>
      </nav>

      <!-- Main Workspace Panel -->
      <main class="flex flex-col gap-4">
        <!-- List controls & tags filter -->
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div class="flex items-center gap-2">
            <h2 class="section-title capitalize">{{ activeSectionName }}</h2>
            <span class="text-xs text-text-soft font-mono" v-if="activeSection !== 'playbook' && filteredEntries.length">
              ({{ filteredEntries.length }} entries)
            </span>
            <span class="text-xs text-text-soft font-mono" v-else-if="activeSection === 'playbook'">
              (SaaS Frameworks & Guides)
            </span>
          </div>

          <div class="flex items-center gap-3">
            <!-- Tags Multi-select dropdown / listing -->
            <div class="flex items-center gap-1.5 flex-wrap" v-if="activeSection !== 'playbook'">
              <span
                v-for="tag in allTags"
                :key="tag"
                class="chip select-none"
                :class="{ 'chip-active': selectedTags.includes(tag) }"
                @click="toggleTag(tag)"
              >
                #{{ tag }}
              </span>
            </div>

            <!-- Create button inside section -->
            <template v-if="activeSection !== 'playbook'">
              <button
                v-if="activeSection !== 'reminder'"
                type="button"
                class="btn-primary py-1.5 px-3.5 text-xs rounded-xl"
                @click="createNewEntry"
              >
                + Create Entry
              </button>
              <button
                v-else
                type="button"
                class="btn-primary py-1.5 px-3.5 text-xs rounded-xl"
                @click="createNewReminder"
              >
                + Add Reminder
              </button>
            </template>
          </div>
        </div>

        <!-- Content Area -->
        <div class="content-split grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5 min-h-[450px]">
          <!-- Left side: Entry List OR Playbook list -->
          <div v-if="activeSection === 'playbook'" class="entry-list-panel border-r border-border/50 pr-4 flex flex-col gap-2.5 overflow-y-auto max-h-[550px] scrollbar-thin">
            <!-- Playbook category filters -->
            <div class="flex items-center gap-1 flex-wrap mb-1.5">
              <span
                class="chip text-[10px] px-2.5 py-0.5 rounded-full"
                :class="{ 'chip-active': !selectedPlaybookCategory }"
                @click="selectedPlaybookCategory = null"
              >
                All
              </span>
              <span
                v-for="cat in playbookCategories"
                :key="cat"
                class="chip text-[10px] px-2.5 py-0.5 rounded-full"
                :class="{ 'chip-active': selectedPlaybookCategory === cat }"
                @click="selectedPlaybookCategory = cat"
              >
                {{ cat }}
              </span>
            </div>
            <!-- Playbook items list -->
            <div
              v-for="item in filteredPlaybookItems"
              :key="item.id"
              class="card card-pad card-hover cursor-pointer p-3.5 select-none flex flex-col gap-1.5 border border-border"
              :class="{ 'card-selected border-primary': selectedPlaybookItemId === item.id }"
              @click="selectedPlaybookItemId = item.id"
            >
              <div class="flex items-start justify-between gap-2">
                <h4 class="font-bold text-sm text-text-main truncate flex-1">{{ item.title }}</h4>
                <span class="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase shrink-0 scale-95">
                  {{ item.category }}
                </span>
              </div>
              <p class="text-xs text-text-muted line-clamp-2">{{ item.summary }}</p>
              <div class="flex gap-1 flex-wrap mt-1">
                <span v-for="tag in item.tags" :key="tag" class="text-[9px] text-text-soft font-semibold bg-soft px-1.5 py-0.5 rounded">
                  #{{ tag }}
                </span>
              </div>
            </div>
          </div>

          <div v-else class="entry-list-panel border-r border-border/50 pr-4 flex flex-col gap-2.5 overflow-y-auto max-h-[550px] scrollbar-thin">
            <div v-if="ccStore.loading" class="flex flex-col gap-3">
              <div v-for="i in 3" :key="i" class="skeleton h-16 w-full"></div>
            </div>

            <div v-else-if="!filteredEntries.length" class="py-12 text-center text-text-muted text-sm">
              <svg class="mx-auto mb-2 text-text-soft" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path d="M8 12h8"/>
              </svg>
              No entries found.
            </div>

            <template v-else>
              <div
                v-for="entry in filteredEntries"
                :key="entry.id"
                class="card card-pad card-hover cursor-pointer p-3 select-none flex flex-col gap-1.5 border border-border"
                :class="{ 'card-selected border-primary': selectedEntryId === entry.id }"
                @click="selectEntry(entry.id)"
              >
                <div class="flex items-start justify-between gap-2">
                  <h4 class="font-bold text-sm text-text-main truncate flex-1">{{ entry.title || 'Untitled Entry' }}</h4>
                  <span class="text-[10px] text-text-soft font-mono shrink-0">{{ formatDate(entry.createdAt) }}</span>
                </div>
                <!-- Reminders Checklist -->
                <div v-if="entry.category === 'reminder'" class="flex items-center gap-2">
                  <input
                    type="checkbox"
                    :checked="entry.status === 'completed'"
                    class="rounded border-border text-primary focus:ring-primary/20"
                    @change.stop="toggleReminderStatus(entry)"
                  />
                  <span
                    class="text-xs truncate flex-1"
                    :class="{ 'line-through text-text-soft': entry.status === 'completed' }"
                  >
                    {{ entry.metadata.due_date ? `Due: ${entry.metadata.due_date}` : 'No due date' }}
                  </span>
                  <span
                    v-if="entry.metadata.priority === 'high'"
                    class="text-[9px] bg-status-needs-fix-bg text-status-needs-fix-fg px-1.5 rounded font-black uppercase shrink-0"
                  >
                    High
                  </span>
                </div>

                <p class="text-xs text-text-muted line-clamp-2" v-else v-html="stripHtml(entry.content)"></p>

                <!-- Entry Tags -->
                <div class="flex gap-1 flex-wrap mt-1" v-if="entry.tags.length">
                  <span v-for="tag in entry.tags.slice(0, 3)" :key="tag" class="text-[9px] text-text-soft font-semibold bg-soft px-1.5 py-0.5 rounded">
                    #{{ tag }}
                  </span>
                </div>
              </div>
            </template>
          </div>

          <!-- Right side: Active Editor / Viewer OR Playbook Viewer -->
          <div class="active-editor-panel flex flex-col gap-4">
            <template v-if="activeSection === 'playbook'">
              <div v-if="!activePlaybookItem" class="flex-1 flex flex-col items-center justify-center text-center text-text-muted py-24">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-soft opacity-60 mb-3">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
                <h3 class="font-bold text-base text-text-main mb-1">Select a Playbook Guide</h3>
                <p class="text-sm max-w-xs">Select a playbook or guide from the list to view modern management practices and copy them into your active workspace.</p>
              </div>
              <template v-else>
                <!-- Playbook Preview & Copy Panel -->
                <div class="flex flex-col gap-3 border-b border-border/50 pb-3">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h3 class="text-lg font-bold text-text-main">{{ activePlaybookItem.title }}</h3>
                      <p class="text-xs text-text-muted mt-0.5">{{ activePlaybookItem.subtitle }}</p>
                    </div>
                    <button
                      type="button"
                      class="btn-primary py-1.5 px-4 text-xs rounded-xl flex items-center gap-1.5 shrink-0"
                      @click="usePlaybookTemplate(activePlaybookItem)"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      Use Template
                    </button>
                  </div>
                  <div class="flex items-center gap-3 flex-wrap">
                    <span class="text-xs text-text-soft font-mono">Suggested category:</span>
                    <span class="badge bg-primary-soft text-primary capitalize text-[10px] py-0.5 font-bold">
                      {{ activePlaybookItem.suggestedCategory.replace('_', ' ') }}
                    </span>
                    <div class="flex gap-1.5">
                      <span v-for="tag in activePlaybookItem.tags" :key="tag" class="text-[10px] text-text-soft font-semibold bg-soft px-1.5 py-0.5 rounded">
                        #{{ tag }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Beautiful scrollable playbook content -->
                <div class="playbook-rich-content overflow-y-auto max-h-[480px] pr-2 scrollbar-thin text-text-main leading-relaxed" v-html="activePlaybookItem.content">
                </div>
              </template>
            </template>
            <template v-else>
              <div v-if="!activeEntry" class="flex-1 flex flex-col items-center justify-center text-center text-text-muted py-24">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="text-text-soft opacity-60 mb-3">
                  <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M9 14h6M9 18h4"/>
                </svg>
                <h3 class="font-bold text-base text-text-main mb-1">No Entry Selected</h3>
                <p class="text-sm max-w-xs">Select an entry from the list to view and edit details, or create a new one to get started.</p>
              </div>

              <template v-else>
                <!-- Editor Title -->
                <div class="flex flex-col gap-2 border-b border-border/50 pb-3">
                  <div class="flex items-center justify-between gap-3">
                    <input
                      v-model="editorForm.title"
                      type="text"
                      class="text-lg font-bold bg-transparent border-0 border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full px-1 py-0.5 text-text-main"
                      placeholder="Entry Title"
                      @input="onContentChange"
                    />
                    
                    <div class="flex items-center gap-1.5 shrink-0">
                      <span class="text-[10px] text-text-soft font-mono" v-if="saveStatus">
                        {{ saveStatus }}
                      </span>
                      <button
                        type="button"
                        class="text-text-soft hover:text-status-needs-fix-fg p-1.5 rounded-lg hover:bg-soft transition"
                        title="Delete Entry"
                        @click="deleteActiveEntry"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- Metadata Row -->
                  <div class="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                    <span class="flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      Created: {{ formatDateFull(activeEntry.createdAt) }}
                    </span>

                    <!-- Custom fields depending on type -->
                    <div v-if="activeEntry.category === 'reminder'" class="flex items-center gap-3">
                      <span class="flex items-center gap-1">
                        Due Date:
                        <input
                          v-model="editorForm.dueDate"
                          type="date"
                          class="bg-soft border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none"
                          @change="onContentChange"
                        />
                      </span>
                      <span class="flex items-center gap-1">
                        Priority:
                        <select
                          v-model="editorForm.priority"
                          class="bg-soft border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none"
                          @change="onContentChange"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                        </select>
                      </span>
                    </div>

                    <div v-if="activeEntry.category === 'decision'" class="flex items-center gap-1">
                      Decision Date:
                      <input
                        v-model="editorForm.decisionDate"
                        type="date"
                        class="bg-soft border border-border rounded px-1.5 py-0.5 text-xs focus:outline-none"
                        @change="onContentChange"
                      />
                    </div>
                  </div>

                  <!-- Tags editing -->
                  <div class="flex items-center gap-2 flex-wrap mt-1">
                    <span
                      v-for="tag in editorForm.tags"
                      :key="tag"
                      class="badge bg-primary/10 text-primary flex items-center gap-1 text-[10px] py-0.5"
                    >
                      #{{ tag }}
                      <button
                        type="button"
                        class="hover:text-status-needs-fix-fg font-black"
                        @click="removeEditorTag(tag)"
                      >
                        &times;
                      </button>
                    </span>
                    <input
                      v-model="editorTagInput"
                      type="text"
                      class="bg-transparent border-0 border-b border-border/40 hover:border-border text-xs focus:outline-none py-0.5 px-1 w-24 text-text-main"
                      placeholder="+ Add tag..."
                      @keydown.enter.prevent="addEditorTag"
                    />
                  </div>
                </div>

                <!-- Editor Details body -->
                <RichEditor
                  v-model="editorForm.content"
                  :saving="saving"
                  class="flex-1"
                  placeholder="Start typing your strategy, meeting notes, log details or decision outcomes here... Auto-saves automatically."
                  @change="onContentChange"
                />
              </template>
            </template>
          </div>
        </div>
      </main>
    </div>

    <!-- Metric Editor Modal -->
    <Modal :open="metricModalOpen" :title="editingMetricId ? 'Edit Metric' : 'Add Executive Metric'" size="sm" @close="metricModalOpen = false">
      <div class="flex flex-col gap-4 py-2">
        <div>
          <label class="label">Metric Label</label>
          <input
            v-model="metricForm.label"
            type="text"
            class="input"
            placeholder="e.g. Monthly Revenue, Conversions"
            required
          />
        </div>
        <div>
          <label class="label">Value</label>
          <input
            v-model="metricForm.value"
            type="text"
            class="input"
            placeholder="e.g. $45,200, 1.4M, 14%"
            required
          />
        </div>
        <div>
          <label class="label">Trend Badge (Optional)</label>
          <input
            v-model="metricForm.trend"
            type="text"
            class="input"
            placeholder="e.g. +12.4%, -3.1%, stable"
          />
          <span class="helper">Prefix with + for positive green tone, - for red tone.</span>
        </div>
      </div>
      <template #footer>
        <div class="w-full flex justify-between gap-3 pt-2">
          <button
            v-if="editingMetricId"
            class="btn-danger py-1.5 px-3 text-xs rounded-xl"
            type="button"
            @click="deleteMetric"
          >
            Delete
          </button>
          <div class="flex gap-2 ml-auto">
            <button class="btn-ghost px-4 py-1.5 text-xs rounded-xl" type="button" @click="metricModalOpen = false">Cancel</button>
            <button class="btn-primary py-1.5 px-4 text-xs rounded-xl" type="button" @click="saveMetric">Save</button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
  <div v-else class="flex flex-col items-center justify-center py-24 text-center">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--status-needs-fix-fg)" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    <h2 class="text-lg font-bold text-text-main mt-4">Access Restricted</h2>
    <p class="text-sm text-text-muted max-w-sm mt-1">This workspace is private and restricted strictly to Head and Supervisor executive roles.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useCommandCenterStore, type CommandCenterCategory, type CommandCenterEntry, type CommandCenterMetric } from '@/stores/commandCenter';
import { usePageRealtime } from '@/services/realtimeService';
import RichEditor from '@/components/ui/RichEditor.vue';
import Modal from '@/components/ui/Modal.vue';
import { pushToast } from '@/services/realtimeService';

const auth = useAuthStore();
const ccStore = useCommandCenterStore();

// Subscribe to Command Center tables in Realtime
usePageRealtime(['command_center_entries', 'command_center_metrics']);

const activeSection = ref<CommandCenterCategory | 'playbook'>('daily_log');
const searchQuery = ref('');
const selectedTags = ref<string[]>([]);

const selectedEntryId = ref<string | null>(null);
const editorTagInput = ref('');
const saving = ref(false);
const saveStatus = ref('');

const editorForm = reactive({
  title: '',
  content: '',
  tags: [] as string[],
  dueDate: '',
  priority: 'normal',
  decisionDate: ''
});

// Sidebar / Nav Tabs definitions
const centerTabs = [
  {
    id: 'daily_log' as const,
    label: 'Daily Log',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 14h6M9 18h4"/></svg>`
  },
  {
    id: 'idea' as const,
    label: 'Ideas Vault',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .5 2.5 1.5 3.5.7.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>`
  },
  {
    id: 'decision' as const,
    label: 'Decisions',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
  },
  {
    id: 'strategy' as const,
    label: 'Website Strategy',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>`
  },
  {
    id: 'meeting_notes' as const,
    label: 'Meeting Notes',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
  },
  {
    id: 'reminder' as const,
    label: 'Reminders',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
  },
  {
    id: 'note' as const,
    label: 'General Notes',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`
  },
  {
    id: 'playbook' as const,
    label: 'Executive Playbook',
    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`
  }
];

const activeSectionName = computed(() => {
  const matched = centerTabs.find((t) => t.id === activeSection.value);
  return matched ? matched.label : '';
});

// Playbook static data & reactive state
const selectedPlaybookCategory = ref<string | null>(null);
const selectedPlaybookItemId = ref<string | null>('delegation-framework');

const playbookCategories = ['Management', 'UX/UI', 'CRO', 'Planning'];

interface PlaybookItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  summary: string;
  tags: string[];
  suggestedCategory: CommandCenterCategory;
  content: string;
}

const playbookItems: PlaybookItem[] = [
  {
    id: 'delegation-framework',
    category: 'Management',
    title: 'The 5 Levels of Delegation',
    subtitle: 'Accountability & Autonomy Blueprint',
    summary: 'A structured management framework to assign clear goals, build trust, and prevent micro-management.',
    tags: ['management', 'delegation', 'leadership', 'alignment'],
    suggestedCategory: 'meeting_notes',
    content: `
      <div class="gradient-badge">Management & Leadership</div>
      <h4 class="text-base font-bold mb-2">The 5 Levels of Delegation</h4>
      <p>Use this delegation playbook to assign tasks clearly and build team autonomy while retaining proper supervisory boundaries. Setting the level of delegation upfront prevents misunderstandings and micro-management.</p>

      <div class="highlight-card">
        <h5 class="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" class="shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Quick Reference
        </h5>
        <p class="mb-2"><strong>Level 1: Do exactly what I ask.</strong> Research has been done; follow instructions precisely.</p>
        <p class="mb-2"><strong>Level 2: Research and report.</strong> Investigate options and lay them out, but I will decide.</p>
        <p class="mb-2"><strong>Level 3: Recommend path forward.</strong> Investigate, narrow down options, recommend one, and get my go-ahead.</p>
        <p class="mb-2"><strong>Level 4: Decide and inform.</strong> Make the call, act, and let me know immediately what you did.</p>
        <p class="mb-2"><strong>Level 5: Act autonomously.</strong> Full trust and responsibility. Decide and execute without notifying.</p>
      </div>

      <h4 class="text-base font-bold mb-2">Quarterly Execution Agenda</h4>
      <p>Implement this agenda for quarterly performance alignment meetings with team leaders:</p>
      <ul class="list-disc pl-5 mb-4">
        <li><strong>Review key metrics (15m):</strong> Assess previous OKR completion rates and KPI statuses.</li>
        <li><strong>Bottleneck analysis (20m):</strong> Identify workflow inhibitors or design blockages.</li>
        <li><strong>Prioritization board (20m):</strong> Align on three high-priority goals for the upcoming quarter.</li>
        <li><strong>Delegation mapping (15m):</strong> Assign owners and clarify delegation levels (1-5) for each goal.</li>
      </ul>
    `
  },
  {
    id: 'uxui-usability',
    category: 'UX/UI',
    title: 'SaaS Usability & Design Guidelines',
    subtitle: 'Fitts\'s Law & Progressive Disclosure Checklists',
    summary: 'Core design rules to maximize conversion rate optimization, lower user cognitive load, and design responsive layouts.',
    tags: ['ux-ui', 'design-rules', 'usability', 'fitts-law'],
    suggestedCategory: 'strategy',
    content: `
      <div class="gradient-badge">UX/UI Design</div>
      <h4 class="text-base font-bold mb-2">SaaS Usability & Fitts's Law Checklist</h4>
      <p>Maximize feature discoverability and reduce user cognitive load by applying Fitts's law and accessibility standard hierarchies across web products.</p>

      <div class="key-metrics">
        <div class="metric-pill">
          <span class="num">350ms</span>
          <span class="label">Interaction Delay Max</span>
        </div>
        <div class="metric-pill">
          <span class="num">48px</span>
          <span class="label">Min Touch Target</span>
        </div>
        <div class="metric-pill">
          <span class="num">4.5:1</span>
          <span class="label">Contrast Ratio</span>
        </div>
      </div>

      <h4 class="text-base font-bold mb-2">Core Layout Rules</h4>
      <ul class="list-disc pl-5 mb-4">
        <li><strong>Fitts's Law:</strong> Buttons and interactive triggers must have target sizes of at least 44x44px. Place related controls close to natural user cursor trails.</li>
        <li><strong>Aesthetic-Usability Effect:</strong> A visually polished, premium UI creates high-trust user perception and makes users more tolerant of minor usability issues.</li>
        <li><strong>Hick's Law:</strong> Minimize choices during onboarding and quick actions. Group options into clean capsules or collapsible progressive disclosure drawers.</li>
      </ul>

      <div class="highlight-card">
        <h5 class="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" class="shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Avoid Common Pitfalls
        </h5>
        <p>Never rely on pure placeholder inputs. Ensure validation states trigger clear borders (e.g. green for success, red for errors) and error text appears immediately under fields.</p>
      </div>
    `
  },
  {
    id: 'cro-landing',
    category: 'CRO',
    title: 'High-Converting Page Structure',
    subtitle: 'Conversion Optimization & Hierarchy Blueprint',
    summary: 'A step-by-step layout structure blueprint optimized to convert search traffic, landing pages, and paid ads.',
    tags: ['cro', 'conversions', 'copywriting', 'marketing'],
    suggestedCategory: 'strategy',
    content: `
      <div class="gradient-badge">Conversion Rate Optimization</div>
      <h4 class="text-base font-bold mb-2">Landing Page Layout Blueprint</h4>
      <p>Increase conversions on product pages by utilizing a highly optimized visual flow. This architecture works universally for SEO search intent and paid landing campaigns.</p>

      <h4 class="text-base font-bold mb-2">Visual Hierarchy Structure</h4>
      <ol class="list-decimal pl-5 mb-4">
        <li class="mb-2"><strong>Hero Section:</strong> Bold, clear benefit-driven headline (max 8 words) + brief subtitle + primary call-to-action button (above the fold) + high-quality product image or visual mockup.</li>
        <li class="mb-2"><strong>Social Proof Banner:</strong> Trust logos, ratings, or immediate client testaments.</li>
        <li class="mb-2"><strong>Problem vs. Solution Matrix:</strong> Emphasize the visitor's pain point and contrast it with how your solution resolves it.</li>
        <li class="mb-2"><strong>Interactive Demonstration:</strong> Keep users engaged with a product builder, slider, or live video.</li>
        <li class="mb-2"><strong>FAQ & Final CTA:</strong> Clear up purchasing hesitation and place a secondary high-contrast CTA button.</li>
      </ol>

      <div class="highlight-card">
        <h5 class="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" class="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
          CRO Metrics to Track
        </h5>
        <p>Monitor **Bounce Rate**, **Average Session Duration**, and **Click-Through-Rate (CTR)** of primary buttons. Aim for mobile load times under **1.8s** to preserve traffic.</p>
      </div>
    `
  },
  {
    id: 'okr-alignment',
    category: 'Planning',
    title: 'Quarterly OKR Definition Planner',
    subtitle: 'Objectives & Key Results Planning Framework',
    summary: 'Plan company goals, align teams, set quantitative targets, and track confidence scores weekly.',
    tags: ['planning', 'okr', 'product-strategy', 'kpi'],
    suggestedCategory: 'strategy',
    content: `
      <div class="gradient-badge">Product Strategy</div>
      <h4 class="text-base font-bold mb-2">Quarterly OKR Definition Planner</h4>
      <p>Implement Objectives & Key Results to unify company efforts toward measurable outcomes. Objectives define *what* we want to achieve; Key Results define *how* we measure success.</p>

      <div class="highlight-card">
        <h5 class="flex items-center gap-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.5" class="shrink-0"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          OKR Formula
        </h5>
        <p class="italic">"We will [Objective] as measured by [Key Result 1], [Key Result 2], and [Key Result 3]."</p>
      </div>

      <h4 class="text-base font-bold mb-2">Checklist for Effective OKRs</h4>
      <ul class="list-disc pl-5 mb-4">
        <li><strong>Ambitious but achievable:</strong> Objectives should feel challenging but physically possible.</li>
        <li><strong>Strictly quantifiable:</strong> Key Results must contain numbers (e.g. increase organic traffic by 25%, reduce load time to 1.2s, launch 3 landing pages).</li>
        <li><strong>Time-bound:</strong> Plan execution boundaries within a 90-day quarterly sprint.</li>
        <li><strong>Reviewed weekly:</strong> Supervisors must run a 15-minute weekly standup to update confidence scores (0.0 to 1.0) on Key Results.</li>
      </ul>
    `
  }
];

const filteredPlaybookItems = computed(() => {
  if (!selectedPlaybookCategory.value) return playbookItems;
  return playbookItems.filter((i) => i.category === selectedPlaybookCategory.value);
});

const activePlaybookItem = computed(() => {
  return playbookItems.find((i) => i.id === selectedPlaybookItemId.value) || null;
});

const usePlaybookTemplate = async (item: PlaybookItem) => {
  try {
    const created = await ccStore.createEntry(
      item.suggestedCategory,
      `Copy of ${item.title}`,
      item.content,
      item.tags
    );
    if (created) {
      pushToast(
        'Template Imported!',
        `Created entry under "${item.suggestedCategory.replace('_', ' ')}"`,
        'success'
      );
      activeSection.value = item.suggestedCategory;
      selectEntry(created.id);
    }
  } catch (error) {
    pushToast('Import Failed', 'Could not create entry from template.', 'warning');
  }
};

// Dynamic filtering for entries in the selected category + search query + tags
const filteredEntries = computed(() => {
  if (activeSection.value === 'playbook') return [];
  let list = ccStore.entries.filter((e) => e.category === activeSection.value);

  // Filter search query
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase();
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.content.toLowerCase().includes(q) ||
        e.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  // Filter tags (must match all selected tags)
  if (selectedTags.value.length) {
    list = list.filter((e) => selectedTags.value.every((t) => e.tags.includes(t)));
  }

  return list;
});

const activeEntry = computed(() => {
  return ccStore.entries.find((e) => e.id === selectedEntryId.value) || null;
});

// List of all unique tags inside the current category
const allTags = computed(() => {
  if (activeSection.value === 'playbook') return [];
  const set = new Set<string>();
  ccStore.entries
    .filter((e) => e.category === activeSection.value)
    .forEach((e) => e.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
});

// Badge counts for each tab
const getTabBadge = (tabId: CommandCenterCategory | 'playbook') => {
  if (tabId === 'playbook') return playbookItems.length;
  if (tabId === 'reminder') {
    // Count active reminders only
    return ccStore.entries.filter((e) => e.category === 'reminder' && e.status === 'active').length;
  }
  return ccStore.entries.filter((e) => e.category === tabId).length;
};

// Reset selected tag when section changes
watch(activeSection, () => {
  selectedTags.value = [];
  if (activeSection.value === 'playbook') {
    selectedPlaybookItemId.value = playbookItems[0]?.id || null;
  } else if (filteredEntries.value.length > 0) {
    selectEntry(filteredEntries.value[0].id);
  } else {
    selectedEntryId.value = null;
  }
});

// Select entry to load in the form
const selectEntry = (id: string) => {
  selectedEntryId.value = id;
  const entry = activeEntry.value;
  if (entry) {
    editorForm.title = entry.title;
    editorForm.content = entry.content;
    editorForm.tags = [...entry.tags];
    editorForm.dueDate = entry.metadata.due_date || '';
    editorForm.priority = entry.metadata.priority || 'normal';
    editorForm.decisionDate = entry.metadata.decision_date || '';
    editorTagInput.value = '';
    saveStatus.value = '';
  }
};

// Toggle tags search filter
const toggleTag = (tag: string) => {
  const idx = selectedTags.value.indexOf(tag);
  if (idx !== -1) {
    selectedTags.value.splice(idx, 1);
  } else {
    selectedTags.value.push(tag);
  }
};

// Strip HTML for list snippet preview
const stripHtml = (html: string) => {
  const tmp = document.createElement('DIV');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
};

// Add tag to the active entry
const addEditorTag = () => {
  const clean = editorTagInput.value.trim().toLowerCase();
  if (clean && !editorForm.tags.includes(clean)) {
    editorForm.tags.push(clean);
    saveEntryDebounced();
  }
  editorTagInput.value = '';
};

const removeEditorTag = (tag: string) => {
  editorForm.tags = editorForm.tags.filter((t) => t !== tag);
  saveEntryDebounced();
};

// Creation actions
const createNewEntry = async () => {
  if (activeSection.value === 'playbook') return;
  const title = `New ${activeSectionName.value} Entry`;
  const created = await ccStore.createEntry(activeSection.value, title, '', []);
  if (created) {
    selectEntry(created.id);
  }
};

const createNewReminder = async () => {
  const created = await ccStore.createEntry('reminder', 'New Reminder', '', [], 'active', {
    priority: 'normal',
    due_date: new Date().toISOString().substring(0, 10)
  });
  if (created) {
    selectEntry(created.id);
  }
};

// Toggle reminder checkbox status
const toggleReminderStatus = async (entry: CommandCenterEntry) => {
  const nextStatus = entry.status === 'completed' ? 'active' : 'completed';
  await ccStore.updateEntry(entry.id, { status: nextStatus });
  pushToast(
    nextStatus === 'completed' ? 'Reminder Done' : 'Reminder Reopened',
    `Marked "${entry.title}" as ${nextStatus}.`,
    'success'
  );
};

// Delete entry action
const deleteActiveEntry = async () => {
  if (!selectedEntryId.value) return;
  if (confirm('Are you sure you want to delete this entry? This cannot be undone.')) {
    const success = await ccStore.deleteEntry(selectedEntryId.value);
    if (success) {
      pushToast('Entry deleted', 'Successfully removed the entry from CommandCenter.', 'info');
      selectedEntryId.value = null;
      if (filteredEntries.value.length > 0) {
        selectEntry(filteredEntries.value[0].id);
      }
    }
  }
};

// Debounced Auto-save handler
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
const onContentChange = () => {
  saveStatus.value = 'Typing...';
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void saveEntryDebounced();
  }, 1000);
};

const saveEntryDebounced = async () => {
  if (!selectedEntryId.value) return;
  saving.value = true;
  saveStatus.value = 'Saving...';
  try {
    const meta: Record<string, any> = {};
    if (activeSection.value === 'reminder') {
      if (editorForm.dueDate) meta['due_date'] = editorForm.dueDate;
      meta['priority'] = editorForm.priority;
    } else if (activeSection.value === 'decision') {
      meta['decision_date'] = editorForm.decisionDate;
    }

    await ccStore.updateEntry(selectedEntryId.value, {
      title: editorForm.title,
      content: editorForm.content,
      tags: editorForm.tags,
      metadata: meta
    });
    saveStatus.value = 'Saved';
  } catch (err) {
    saveStatus.value = 'Error saving';
  } finally {
    saving.value = false;
  }
};

// ── Metrics Modal & Management ──
const metricModalOpen = ref(false);
const editingMetricId = ref<string | null>(null);
const metricForm = reactive({
  label: '',
  value: '',
  trend: ''
});

const openMetricModal = (metric: CommandCenterMetric | null) => {
  if (metric) {
    editingMetricId.value = metric.id;
    metricForm.label = metric.label;
    metricForm.value = metric.value;
    metricForm.trend = metric.trend;
  } else {
    editingMetricId.value = null;
    metricForm.label = '';
    metricForm.value = '';
    metricForm.trend = '';
  }
  metricModalOpen.value = true;
};

const saveMetric = async () => {
  if (!metricForm.label.trim() || !metricForm.value.trim()) {
    alert('Please enter label and value.');
    return;
  }

  if (editingMetricId.value) {
    await ccStore.updateMetric(editingMetricId.value, {
      label: metricForm.label.trim(),
      value: metricForm.value.trim(),
      trend: metricForm.trend.trim()
    });
    pushToast('Metric updated', 'Successfully saved metric KPI details.', 'success');
  } else {
    await ccStore.createMetric(
      metricForm.label.trim(),
      metricForm.value.trim(),
      metricForm.trend.trim()
    );
    pushToast('Metric created', 'Successfully added new metric KPI card.', 'success');
  }
  metricModalOpen.value = false;
};

const deleteMetric = async () => {
  if (!editingMetricId.value) return;
  if (confirm('Are you sure you want to delete this metric card?')) {
    const success = await ccStore.deleteMetric(editingMetricId.value);
    if (success) {
      pushToast('Metric deleted', 'Removed metric KPI card.', 'info');
      metricModalOpen.value = false;
    }
  }
};

// Formatting helpers
const formatDate = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const formatDateFull = (isoString: string) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(async () => {
  if (auth.isHeadOrSupervisor) {
    await Promise.all([ccStore.fetchEntries(), ccStore.fetchMetrics()]);
    // Auto-select first entry if available
    if (filteredEntries.value.length > 0) {
      selectEntry(filteredEntries.value[0].id);
    }
  }
});
</script>

<style scoped>
.command-center-page {
  max-width: 100%;
}

.kpi {
  transition: all 150ms ease;
  min-height: 72px;
}

.workspace-container {
  align-items: start;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}

.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Specific contenteditable styling for strategy/notes inside rich content area */
.active-editor-panel :deep(h2),
.active-editor-panel :deep(h3) {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

@media (max-width: 1024px) {
  nav {
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.5rem;
  }
}

/* ── Playbook Content Styles ── */
.playbook-rich-content {
  font-family: 'Raleway', system-ui, sans-serif;
}

.playbook-rich-content :deep(h4) {
  font-size: 1.1rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.6rem;
  color: var(--text-main);
  border-left: 3px solid var(--primary);
  padding-left: 0.6rem;
}

.playbook-rich-content :deep(p) {
  margin-bottom: 0.85rem;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.playbook-rich-content :deep(ul) {
  list-style-type: disc;
  margin-bottom: 1rem;
  padding-left: 1.25rem;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.playbook-rich-content :deep(ol) {
  list-style-type: decimal;
  margin-bottom: 1rem;
  padding-left: 1.25rem;
  font-size: 0.88rem;
  color: var(--text-muted);
}

.playbook-rich-content :deep(li) {
  margin-bottom: 0.4rem;
}

.playbook-rich-content :deep(strong) {
  color: var(--text-main);
  font-weight: 700;
}

.playbook-rich-content :deep(.highlight-card) {
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.1rem;
  margin: 1.2rem 0;
  box-shadow: var(--shadow-sm);
}

.playbook-rich-content :deep(.highlight-card h5) {
  font-weight: 700;
  font-size: 0.95rem;
  margin-bottom: 0.6rem;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.playbook-rich-content :deep(.highlight-card p) {
  margin-bottom: 0;
  font-size: 0.85rem;
}

.playbook-rich-content :deep(.gradient-badge) {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--primary) 0%, #a855f7 100%);
  color: white;
  margin-bottom: 0.5rem;
}

.playbook-rich-content :deep(.key-metrics) {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin: 1.2rem 0;
}

.playbook-rich-content :deep(.metric-pill) {
  background: var(--card-bg);
  border: 1px solid var(--border);
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  text-align: center;
  box-shadow: var(--shadow-sm);
}

.playbook-rich-content :deep(.metric-pill .num) {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--primary);
  display: block;
  letter-spacing: -0.01em;
}

.playbook-rich-content :deep(.metric-pill .label) {
  font-size: 0.68rem;
  color: var(--text-soft);
  text-transform: uppercase;
  font-weight: 700;
  letter-spacing: 0.03em;
  margin-top: 0.15rem;
  display: block;
}
</style>
