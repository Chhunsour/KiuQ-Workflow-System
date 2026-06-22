<template>
  <div>
    <!-- Breadcrumb -->
    <nav class="mb-3 flex items-center gap-2 text-sm text-text-muted" aria-:label="$t('Breadcrumb')">
      <RouterLink to="/folders" class="hover:text-text-main">{{ $t('Folders') }}</RouterLink>
      <span aria-hidden="true">›</span>
      <span class="ui-font font-medium text-text-main truncate">{{ folder?.name ?? '...' }}</span>
    </nav>

    <PageHeader
      :title="folder?.name ?? 'Folder'"
      :subtitle="folder?.description || 'Items in this folder.'"
    >
      <template #actions>
        <RouterLink to="/folders" class="btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          {{ $t('Back to Folders') }}
        </RouterLink>
        <button v-if="auth.isAdmin" class="btn-secondary" type="button" @click="openAddPrompts">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {{ $t('Add Prompts') }}
        </button>
        <button class="btn-primary" type="button" @click="openCreateResource">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {{ $t('Add Resource') }}
        </button>
      </template>
    </PageHeader>

    <!-- Stats + filters -->
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <span class="ui-font rounded-full bg-soft px-3 py-1 text-sm font-medium text-primary">
        {{ totalItems }} item{{ totalItems === 1 ? '' : 's' }}
      </span>
      <input
        v-model="search"
        class="input max-w-sm"
        type="search"
        :placeholder="$t('Search items...')"
      />
      <FormSelect
        v-model="kindFilter"
        :options="kindFilterOptions"
        class="max-w-[180px]"
      />
      <FormSelect
        v-if="kindFilter === 'all' || kindFilter === 'prompt'"
        v-model="typeFilter"
        :options="typeOptions"
        class="max-w-[200px]"
      />
    </div>

    <LoadingBlock
      :loading="data.loading.folders || data.loading.prompts || data.loading.resources || data.loading.notes || data.loading.docs || data.loading.docsFiles"
      :error="data.errors.folders || data.errors.prompts || data.errors.resources || data.errors.notes || data.errors.docs || data.errors.docsFiles"
      :retry="reload"
    >
      <div v-if="folderMissing" class="card card-pad text-center">
        <h3 class="ui-font text-base font-semibold text-text-main">{{ $t('Folder not found') }}</h3>
        <p class="mt-1 text-sm text-text-muted">
          {{ $t('It may have been deleted, or you don\'t have access to it.') }}
        </p>
        <div class="mt-4">
          <RouterLink to="/folders" class="btn-primary">{{ $t('Back to Folders') }}</RouterLink>
        </div>
      </div>

      <template v-else>
        <div
          v-if="filteredItems.length"
          class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        >
          <template v-for="item in filteredItems" :key="`${item.kind}-${item.id}`">
            <!-- Prompt card -->
            <article
              v-if="item.kind === 'prompt'"
              class="card card-pad flex flex-col"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-btn bg-soft text-primary">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                  </span>
                  <div class="min-w-0">
                    <div class="ui-font text-xs font-medium uppercase tracking-wide text-text-muted">
                      Prompt · {{ promptTypeLabel(item.data.promptType) }}
                    </div>
                    <h3 class="ui-font text-base font-semibold text-text-main truncate">
                      {{ item.data.title }}
                    </h3>
                  </div>
                </div>
                <StatusBadge :status="item.data.status" />
              </div>

              <p class="mt-3 line-clamp-3 text-sm text-text-muted">
                {{ shortDescription(item.data) }}
              </p>

              <div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                <span v-if="item.data.category" class="ui-font rounded-full bg-soft px-2 py-0.5">{{ item.data.category }}</span>
                <span>{{ item.data.editableFields.length }} field{{ item.data.editableFields.length === 1 ? '' : 's' }}</span>
                <span aria-hidden="true">·</span>
                <span>v{{ item.data.version }}</span>
              </div>

              <div class="mt-2 flex items-center gap-2 text-xs text-text-muted">
                <span>{{ $t('Created by Admin') }}</span>
                <span aria-hidden="true">·</span>
                <span>Updated {{ item.data.updatedAt || item.data.createdAt || '—' }}</span>
              </div>

              <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <button class="btn-secondary" type="button" @click="openView(item.data)">{{ $t('View') }}</button>
                <button class="btn-primary" type="button" @click="copyPrompt(item.data)">
                  {{ copiedId === item.data.id ? 'Copied!' : 'Copy Prompt' }}
                </button>
                <button
                  v-if="auth.isAdmin"
                  class="btn-ghost"
                  type="button"
                  :disabled="busy"
                  @click="confirmRemoveFromFolder(item.data)"
                >
                  {{ $t('Remove') }}
                </button>
              </div>
            </article>

            <!-- Resource card (file / link / note / etc.) -->
            <ResourceCard
              v-else-if="item.kind === 'resource'"
              :resource="item.data"
              @view="openResourceView"
              @edit="openResourceEdit"
              @delete="confirmDeleteResource"
            />

            <!-- Admin notes assigned to this folder -->
            <article
              v-else-if="item.kind === 'note'"
              class="card card-pad flex flex-col"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="ui-font text-xs font-medium uppercase tracking-wide text-text-muted">
                    Note · {{ noteRelatedLabel(item.data) }}
                  </div>
                  <h3 class="ui-font text-base font-semibold text-text-main truncate">
                    {{ item.data.title }}
                  </h3>
                </div>
                <span class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-primary">{{ $t('Note') }}</span>
              </div>
              <p class="mt-3 line-clamp-4 whitespace-pre-line text-sm text-text-muted">
                {{ item.data.content || '(empty note)' }}
              </p>
              <div class="mt-3 flex items-center gap-2 text-xs text-text-muted">
                <span>{{ $t('Created by Admin') }}</span>
                <span aria-hidden="true">·</span>
                <span>Updated {{ item.data.updatedAt || item.data.createdAt || '—' }}</span>
              </div>
              <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <button class="btn-secondary" type="button" @click="openTextView('Note', item.data.title, item.data.content, item.data.updatedAt)">
                  {{ $t('View') }}
                </button>
              </div>
            </article>

            <!-- Published team docs assigned to this folder -->
            <article
              v-else-if="item.kind === 'doc'"
              class="card card-pad flex flex-col"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="ui-font text-xs font-medium uppercase tracking-wide text-text-muted">
                    Doc · {{ docCategoryLabel(item.data.category) }}
                  </div>
                  <h3 class="ui-font text-base font-semibold text-text-main truncate">
                    {{ item.data.title }}
                  </h3>
                </div>
                <StatusBadge :status="item.data.status" />
              </div>
              <p class="mt-3 line-clamp-4 whitespace-pre-line text-sm text-text-muted">
                {{ item.data.content || '(empty doc)' }}
              </p>
              <div class="mt-3 flex items-center gap-2 text-xs text-text-muted">
                <span>Created by {{ memberName(item.data.createdBy) }}</span>
                <span aria-hidden="true">·</span>
                <span>Updated {{ item.data.updatedAt || item.data.createdAt || '—' }}</span>
              </div>
              <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <button class="btn-secondary" type="button" @click="openTextView('Doc', item.data.title, item.data.content, item.data.updatedAt)">
                  {{ $t('View') }}
                </button>
              </div>
            </article>

            <!-- Docs Drive files / links assigned to this folder id -->
            <article
              v-else-if="item.kind === 'docs_file'"
              class="card card-pad flex flex-col"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2.5">
                  <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-btn" :class="fileTypeMeta(item.data.type).swatch">
                    <span v-html="fileTypeMeta(item.data.type).icon" />
                  </span>
                  <div class="min-w-0">
                    <div class="ui-font text-xs font-medium uppercase tracking-wide text-text-muted">
                      File / Link · {{ fileTypeMeta(item.data.type).label }}
                    </div>
                    <h3 class="ui-font text-base font-semibold text-text-main truncate">
                      {{ item.data.title }}
                    </h3>
                  </div>
                </div>
                <span class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-primary">{{ $t('File') }}</span>
              </div>
              <p class="mt-3 line-clamp-3 text-sm text-text-muted">
                {{ item.data.description || item.data.url || '(no description)' }}
              </p>
              <div class="mt-3 flex items-center gap-2 text-xs text-text-muted">
                <span>Created by {{ memberName(item.data.createdBy) }}</span>
                <span aria-hidden="true">·</span>
                <span>Updated {{ item.data.updatedAt || item.data.createdAt || '—' }}</span>
              </div>
              <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <button class="btn-secondary" type="button" @click="openTextView(fileTypeMeta(item.data.type).label, item.data.title, item.data.description || item.data.url, item.data.updatedAt, safeOpenUrl(item.data.url))">
                  {{ $t('View') }}
                </button>
                <a
                  v-if="safeOpenUrl(item.data.url)"
                  :href="safeOpenUrl(item.data.url)!"
                  target="_blank"
                  rel="noopener"
                  class="btn-primary"
                >
                  {{ $t('Open Link') }}
                </a>
              </div>
            </article>
          </template>
        </div>

        <EmptyState
          v-else-if="!hasItemsAtAll"
          :title="$t('This folder is empty.')"
          description="Add prompts, docs, files, or links to this folder to keep work organized."
        >
          <template #action>
            <div class="flex gap-2">
              <button v-if="auth.isAdmin" class="btn-secondary" type="button" @click="openAddPrompts">
                {{ $t('Add Prompts') }}
              </button>
              <button class="btn-primary" type="button" @click="openCreateResource">
                {{ $t('Add Resource') }}
              </button>
            </div>
          </template>
        </EmptyState>

        <EmptyState
          v-else
          :title="$t('No items match your filters')"
          description="Try a different search term or item type."
        />
      </template>
    </LoadingBlock>

    <!-- View modal -->
    <Modal
      :open="viewOpen"
      :title="viewItem?.title ?? 'Prompt'"
      :subtitle="viewItem ? `${promptTypeLabel(viewItem.promptType)} · v${viewItem.version}` : undefined"
      size="lg"
      @close="viewOpen = false"
    >
      <div v-if="viewItem" class="space-y-5">
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge :status="viewItem.status" />
          <span v-if="viewItem.category" class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-primary">
            {{ viewItem.category }}
          </span>
          <span class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-primary">
            Output: {{ outputTypeLabel(viewItem.outputType) }}
          </span>
        </div>

        <div v-if="viewItem.lockedRules">
          <div class="ui-font mb-1.5 text-sm font-semibold text-text-main">{{ $t('Locked admin rules') }}</div>
          <pre class="whitespace-pre-wrap break-words rounded-card border border-border bg-soft p-4 text-sm text-text-main">{{ viewItem.lockedRules }}</pre>
        </div>

        <div v-if="viewItem.editableFields.length">
          <div class="ui-font mb-1.5 text-sm font-semibold text-text-main">{{ $t('Editable fields') }}</div>
          <ul class="space-y-1.5 text-sm">
            <li
              v-for="f in viewItem.editableFields"
              :key="f.id"
              class="flex flex-wrap items-baseline gap-2 rounded-btn border border-border px-3 py-2"
            >
              <span class="ui-font font-medium text-text-main">{{ f.label || f.key }}</span>
              <code class="rounded bg-soft px-1.5 py-0.5 text-xs text-text-muted">{{ displayToken(f.key) }}</code>
              <span class="text-xs text-text-muted">({{ f.type }})</span>
              <span v-if="f.helper" class="ml-auto text-xs text-text-muted">{{ f.helper }}</span>
            </li>
          </ul>
        </div>

        <div>
          <div class="ui-font mb-1.5 text-sm font-semibold text-text-main">{{ $t('Template') }}</div>
          <pre class="whitespace-pre-wrap break-words rounded-card border border-border bg-soft p-4 text-sm text-text-main">{{ viewItem.templateContent || '(empty template)' }}</pre>
        </div>

        <div v-if="viewItem.notes">
          <div class="ui-font mb-1.5 text-sm font-semibold text-text-main">{{ $t('Notes') }}</div>
          <p class="whitespace-pre-line text-sm text-text-muted">{{ viewItem.notes }}</p>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="viewOpen = false">{{ $t('Close') }}</button>
        <RouterLink v-if="auth.isAdmin" to="/library" class="btn-secondary">{{ $t('Open in Library') }}</RouterLink>
        <button class="btn-primary" type="button" @click="copyPromptFromView">
          {{ viewItem && copiedId === viewItem.id ? 'Copied!' : 'Copy Prompt' }}
        </button>
      </template>
    </Modal>

    <Modal
      :open="textViewOpen"
      :title="textView.title || textView.type"
      :subtitle="textView.updatedAt ? `${textView.type} · Updated ${textView.updatedAt}` : textView.type"
      size="lg"
      @close="textViewOpen = false"
    >
      <div class="space-y-4">
        <pre class="max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-card border border-border bg-soft p-4 text-sm text-text-main">{{ textView.body || '(empty)' }}</pre>
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="textViewOpen = false">{{ $t('Close') }}</button>
        <a
          v-if="textView.href"
          :href="textView.href"
          target="_blank"
          rel="noopener"
          class="btn-primary"
        >
          {{ $t('Open Link') }}
        </a>
      </template>
    </Modal>

    <!-- Add prompts modal (admin only) -->
    <Modal
      :open="addOpen"
      :title="$t('Add prompts to folder')"
      subtitle="Pick prompts from your library. They'll be moved into this folder."
      size="lg"
      @close="addOpen = false"
    >
      <div class="space-y-3">
        <input
          v-model="addSearch"
          class="input"
          type="search"
          :placeholder="$t('Search by title or category...')"
        />
        <div
          v-if="availablePrompts.length === 0"
          class="rounded-card border border-dashed border-border bg-soft/40 px-4 py-6 text-center text-sm text-text-muted"
        >
          {{ $t('No prompts available — they\'re all already in a folder.') }}
        </div>
        <div v-else class="max-h-[420px] overflow-y-auto rounded-card border border-border">
          <label
            v-for="p in filteredAvailablePrompts"
            :key="p.id"
            class="flex cursor-pointer items-start gap-3 border-b border-border p-3 last:border-b-0 hover:bg-soft"
          >
            <input
              type="checkbox"
              class="mt-1 h-4 w-4 flex-shrink-0 rounded border-border text-primary focus:ring-primary/30"
              :checked="selectedAddIds.includes(p.id)"
              @change="toggleAddSelection(p.id)"
            />
            <div class="min-w-0">
              <div class="ui-font text-sm font-medium text-text-main">{{ p.title }}</div>
              <div class="text-xs text-text-muted">
                {{ promptTypeLabel(p.promptType) }}
                <span v-if="p.category"> · {{ p.category }}</span>
                <span v-if="p.folderId"> · already in: {{ folderName(p.folderId) }}</span>
              </div>
            </div>
            <StatusBadge :status="p.status" />
          </label>
        </div>
      </div>
      <div v-if="data.errors.prompts" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.prompts }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="addOpen = false">{{ $t('Cancel') }}</button>
        <button
          class="btn-primary"
          type="button"
          :disabled="busy || selectedAddIds.length === 0"
          @click="saveAddPrompts"
        >
          {{ busy ? 'Adding...' : `Add ${selectedAddIds.length || 0} prompt${selectedAddIds.length === 1 ? '' : 's'}` }}
        </button>
      </template>
    </Modal>

    <!-- Resource add/edit modal -->
    <Modal
      :open="resourceFormOpen"
      :title="resourceFormMode === 'edit' ? 'Edit resource' : 'Add resource to folder'"
      size="lg"
      @close="resourceFormOpen = false"
    >
      <ResourceForm
        ref="resourceFormRef"
        :initial="resourceFormInitial"
        @uploading="(v) => (resourceUploading = v)"
      />
      <div v-if="data.errors.resources" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.resources }}
      </div>
      <template #footer>
        <button
          class="btn-ghost"
          type="button"
          :disabled="resourceSaving || resourceUploading"
          @click="resourceFormOpen = false"
        >{{ $t('Cancel') }}</button>
        <button
          class="btn-primary"
          type="button"
          :disabled="resourceSaving || resourceUploading"
          @click="saveResource"
        >
          {{ resourceSaving ? 'Saving...' : resourceUploading ? 'Uploading...' : 'Save Resource' }}
        </button>
      </template>
    </Modal>

    <!-- Resource detail modal -->
    <ResourceDetailModal
      :open="resourceDetailOpen"
      :resource="resourceDetailItem"
      @close="resourceDetailOpen = false"
      @edit="(r) => (resourceDetailOpen = false, openResourceEdit(r))"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Modal from '@/components/ui/Modal.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ResourceCard from '@/components/resources/ResourceCard.vue';
import ResourceForm from '@/components/resources/ResourceForm.vue';
import ResourceDetailModal from '@/components/resources/ResourceDetailModal.vue';
import { fileTypeMeta, safeOpenUrl } from '@/components/docs/docMeta';
import { useAuthStore } from '@/stores/auth';
import {
  useDataStore,
  type DocsFile,
  type Note,
  type OutputType,
  type Prompt,
  type PromptType,
  type Resource,
  type ResourceVisibility,
  type TeamDoc
} from '@/stores/data';

const route = useRoute();
const auth = useAuthStore();
const data = useDataStore();

const folderId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const folder = computed(() => data.folderById(folderId.value));

// Show "not found" only after the initial folders load completes.
const initialFolderLoaded = ref(false);
const folderMissing = computed(
  () => initialFolderLoaded.value && !folder.value && !data.loading.folders
);

const search = ref('');
const typeFilter = ref<PromptType | ''>('');
type FolderKindFilter = 'all' | 'prompt' | 'resource' | 'note' | 'doc' | 'docs_file';
const kindFilter = ref<FolderKindFilter>('all');

const kindFilterOptions = [
  { value: 'all', label: 'All types' },
  { value: 'prompt', label: 'Prompts only' },
  { value: 'resource', label: 'Resources only' },
  { value: 'note', label: 'Notes only' },
  { value: 'doc', label: 'Docs only' },
  { value: 'docs_file', label: 'Files / links only' }
];

// Items in this folder — discriminated union so the template can render
// the right card based on item.kind.
type FolderItem =
  | { kind: 'prompt'; id: string; data: Prompt; updatedAt: string }
  | { kind: 'resource'; id: string; data: Resource; updatedAt: string }
  | { kind: 'note'; id: string; data: Note; updatedAt: string }
  | { kind: 'doc'; id: string; data: TeamDoc; updatedAt: string }
  | { kind: 'docs_file'; id: string; data: DocsFile; updatedAt: string };

const promptsInFolder = computed(() =>
  data.prompts
    .filter((p) => p.folderId === folderId.value)
    .filter((p) => (auth.isAdmin ? true : p.status === 'approved'))
);

const resourcesInFolder = computed(() =>
  data.resources.filter((r) => r.folderId === folderId.value)
);

const notesInFolder = computed(() =>
  data.notes.filter((n) => n.folderId === folderId.value)
);

const docsInFolder = computed(() =>
  data.docs
    .filter((doc) => doc.folderId === folderId.value)
    .filter((doc) => (auth.isAdmin ? true : doc.status === 'published'))
);

const docsFilesInFolder = computed(() =>
  data.docsFiles.filter((file) => file.folderId === folderId.value)
);

const allItemsInFolder = computed<FolderItem[]>(() => {
  const items: FolderItem[] = [
    ...promptsInFolder.value.map<FolderItem>((p) => ({
      kind: 'prompt',
      id: p.id,
      data: p,
      updatedAt: p.updatedAt || p.createdAt
    })),
    ...resourcesInFolder.value.map<FolderItem>((r) => ({
      kind: 'resource',
      id: r.id,
      data: r,
      updatedAt: r.updatedAt || r.createdAt
    })),
    ...notesInFolder.value.map<FolderItem>((n) => ({
      kind: 'note',
      id: n.id,
      data: n,
      updatedAt: n.updatedAt || n.createdAt
    })),
    ...docsInFolder.value.map<FolderItem>((doc) => ({
      kind: 'doc',
      id: doc.id,
      data: doc,
      updatedAt: doc.updatedAt || doc.createdAt
    })),
    ...docsFilesInFolder.value.map<FolderItem>((file) => ({
      kind: 'docs_file',
      id: file.id,
      data: file,
      updatedAt: file.updatedAt || file.createdAt
    }))
  ];
  return items.sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1));
});

const hasItemsAtAll = computed(() => allItemsInFolder.value.length > 0);

const itemMatchesSearch = (item: FolderItem, q: string): boolean => {
  if (!q) return true;
  if (item.kind === 'prompt') {
    return `${item.data.title} ${item.data.category} ${item.data.templateContent} ${item.data.notes}`
      .toLowerCase()
      .includes(q);
  }
  if (item.kind === 'resource') {
    return `${item.data.title} ${item.data.description} ${item.data.fileName} ${item.data.externalUrl} ${item.data.textContent}`
      .toLowerCase()
      .includes(q);
  }
  if (item.kind === 'note') {
    return `${item.data.title} ${item.data.content}`.toLowerCase().includes(q);
  }
  if (item.kind === 'doc') {
    return `${item.data.title} ${item.data.category} ${item.data.content}`.toLowerCase().includes(q);
  }
  return `${item.data.title} ${item.data.type} ${item.data.url} ${item.data.description}`
    .toLowerCase()
    .includes(q);
};

const filteredItems = computed(() =>
  allItemsInFolder.value.filter((item) => {
    const q = search.value.trim().toLowerCase();
    if (!itemMatchesSearch(item, q)) return false;
    if (kindFilter.value !== 'all' && item.kind !== kindFilter.value) return false;
    if (item.kind === 'prompt' && typeFilter.value && item.data.promptType !== typeFilter.value)
      return false;
    return true;
  })
);

const totalItems = computed(() => allItemsInFolder.value.length);

// =====================
// Type filter options (only the prompt sub-types currently in this folder)
// =====================
const promptTypeLabel = (t: PromptType): string => {
  switch (t) {
    case 'full_page':
      return 'Full Page';
    case 'seo':
      return 'SEO';
    case 'blog':
      return 'Blog';
    case 'image':
      return 'Image';
    case 'fixing':
      return 'Fixing';
    case 'section':
    default:
      return 'Section';
  }
};

const outputTypeLabel = (t: OutputType): string => {
  switch (t) {
    case 'html_css':
      return 'HTML / CSS';
    case 'text':
      return 'Plain text';
    case 'seo_fields':
      return 'SEO fields';
    case 'image_prompt':
      return 'Image prompt';
    case 'full_page':
      return 'Full page HTML';
    default:
      return String(t);
  }
};

const typeOptions = computed(() => {
  const present = new Set(promptsInFolder.value.map((p) => p.promptType));
  return [
    { value: '', label: 'All prompt types' },
    ...(['section', 'full_page', 'seo', 'blog', 'image', 'fixing'] as PromptType[])
      .filter((t) => present.has(t))
      .map((t) => ({ value: t, label: promptTypeLabel(t) }))
  ];
});

// =====================
// Item helpers
// =====================
const shortDescription = (p: Prompt): string => {
  if (p.notes) return p.notes;
  const tpl = (p.templateContent ?? '').replace(/\s+/g, ' ').trim();
  return tpl.length > 160 ? tpl.slice(0, 160) + '...' : tpl || '(no description)';
};

const folderName = (id: string | null) => (id ? data.folderById(id)?.name ?? '—' : '—');
const displayToken = (key: string) => `{{${key}}}`;

const memberName = (id: string | null) => {
  if (!id) return 'Team';
  const member = data.memberById(id);
  return member?.fullName || member?.email || 'Team';
};

const docCategoryLabel = (category: string) =>
  category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const noteRelatedLabel = (note: Note) => {
  if (note.relatedType === 'team') return 'Team';
  if (note.relatedType === 'project') return data.projectById(note.relatedId)?.name ?? 'Project';
  if (note.relatedType === 'website') return data.websiteById(note.relatedId)?.name ?? 'Website';
  if (note.relatedType === 'prompt') return data.promptById(note.relatedId)?.title ?? 'Prompt';
  return 'General';
};

const textViewOpen = ref(false);
const textView = ref<{
  type: string;
  title: string;
  body: string;
  updatedAt: string;
  href: string | null;
}>({
  type: '',
  title: '',
  body: '',
  updatedAt: '',
  href: null
});

const openTextView = (
  type: string,
  title: string,
  body: string,
  updatedAt: string,
  href: string | null = null
) => {
  textView.value = { type, title, body, updatedAt, href };
  textViewOpen.value = true;
};

// =====================
// Copy Prompt — assemble a useful default for clipboard
// =====================
const copiedId = ref<string | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;

const outputInstruction = (t: OutputType): string => {
  switch (t) {
    case 'html_css':
      return 'Output: Clean, production-ready HTML with embedded CSS. No inline styles.';
    case 'text':
      return 'Output: Plain copy text only. No code, no formatting markers.';
    case 'seo_fields':
      return 'Output: Return Title, Meta Description, and Slug as labeled fields.';
    case 'image_prompt':
      return 'Output: A single image-generation prompt, no extra commentary.';
    case 'full_page':
      return 'Output: A full HTML page including <head> and <body>.';
    default:
      return '';
  }
};

const buildPromptText = (p: Prompt): string => {
  const lines: string[] = [];
  if (p.lockedRules.trim()) {
    lines.push('# Locked admin rules', p.lockedRules.trim(), '');
  }
  if (p.editableFields.length) {
    lines.push('# Inputs (fill in before sending)');
    p.editableFields.forEach((f) => {
      const placeholder = `{{${f.key}}}`;
      lines.push(`- ${f.label || f.key}: ${placeholder}`);
    });
    lines.push('');
  }
  lines.push('# Task', p.templateContent || '(no template content)');
  const out = outputInstruction(p.outputType);
  if (out) lines.push('', out);
  return lines.join('\n').trim();
};

const copyPrompt = async (p: Prompt) => {
  try {
    await navigator.clipboard.writeText(buildPromptText(p));
    copiedId.value = p.id;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedId.value = null;
    }, 1500);
  } catch {
    // Clipboard may be unavailable in some contexts; silently no-op.
  }
};

const copyPromptFromView = () => {
  if (viewItem.value) void copyPrompt(viewItem.value);
};

// =====================
// View modal
// =====================
const viewOpen = ref(false);
const viewItem = ref<Prompt | null>(null);

const openView = (p: Prompt) => {
  viewItem.value = p;
  viewOpen.value = true;
};

// =====================
// Add prompts modal (admin only)
// =====================
const addOpen = ref(false);
const addSearch = ref('');
const selectedAddIds = ref<string[]>([]);
const busy = ref(false);

const availablePrompts = computed(() =>
  data.prompts.filter((p) => p.folderId !== folderId.value)
);

const filteredAvailablePrompts = computed(() => {
  const q = addSearch.value.trim().toLowerCase();
  if (!q) return availablePrompts.value;
  return availablePrompts.value.filter((p) =>
    `${p.title} ${p.category}`.toLowerCase().includes(q)
  );
});

const openAddPrompts = () => {
  selectedAddIds.value = [];
  addSearch.value = '';
  addOpen.value = true;
};

const toggleAddSelection = (id: string) => {
  selectedAddIds.value = selectedAddIds.value.includes(id)
    ? selectedAddIds.value.filter((x) => x !== id)
    : [...selectedAddIds.value, id];
};

const saveAddPrompts = async () => {
  if (!selectedAddIds.value.length) return;
  busy.value = true;
  const ok = await data.movePromptsToFolder(selectedAddIds.value, folderId.value);
  busy.value = false;
  if (ok) {
    selectedAddIds.value = [];
    addOpen.value = false;
  }
};

// =====================
// Remove from folder (admin)
// =====================
const confirmRemoveFromFolder = async (p: Prompt) => {
  if (!confirm(`Remove "${p.title}" from this folder? It stays in your Prompt Library.`)) return;
  busy.value = true;
  await data.movePromptsToFolder([p.id], null);
  busy.value = false;
};

// =====================
// Resource handlers
// =====================
const resourceFormOpen = ref(false);
const resourceFormMode = ref<'create' | 'edit'>('create');
const resourceFormRef = ref<{ model: Resource } | null>(null);
const resourceSaving = ref(false);
const resourceUploading = ref(false);

const blankResource = (): Resource => ({
  id: '',
  title: '',
  type: 'file',
  description: '',
  folderId: folderId.value || null,
  projectId: null,
  websiteId: null,
  taskId: null,
  filePath: '',
  fileName: '',
  fileType: '',
  fileSize: 0,
  externalUrl: '',
  textContent: '',
  visibility: 'team' as ResourceVisibility,
  status: 'published',
  createdBy: null,
  createdAt: '',
  updatedAt: ''
});

const resourceFormInitial = ref<Resource>(blankResource());

const openCreateResource = () => {
  resourceFormInitial.value = { ...blankResource(), folderId: folderId.value || null };
  resourceFormMode.value = 'create';
  resourceFormOpen.value = true;
};

const openResourceEdit = (r: Resource) => {
  resourceFormInitial.value = { ...r };
  resourceFormMode.value = 'edit';
  resourceFormOpen.value = true;
};

const saveResource = async () => {
  const m = resourceFormRef.value?.model;
  if (!m) return;
  if (!m.title.trim()) {
    data.errors.resources = 'Please give the resource a title.';
    return;
  }
  resourceSaving.value = true;
  // Force the folder context — keeps the resource in this folder.
  const ok = await data.upsertResource({ ...m, folderId: folderId.value || null });
  resourceSaving.value = false;
  if (ok) resourceFormOpen.value = false;
};

const confirmDeleteResource = async (r: Resource) => {
  if (!confirm(`Delete "${r.title || r.fileName || 'this resource'}"?`)) return;
  await data.removeResource(r.id);
};

// Detail modal for resources
const resourceDetailOpen = ref(false);
const resourceDetailItem = ref<Resource | null>(null);
const openResourceView = (r: Resource) => {
  resourceDetailItem.value = r;
  resourceDetailOpen.value = true;
};

// =====================
// Lifecycle
// =====================
const reload = async () => {
  await Promise.allSettled([
    data.fetchFolders().then(() => (initialFolderLoaded.value = true)),
    data.fetchPrompts(),
    data.fetchResources(),
    data.fetchNotes(),
    data.fetchDocs(),
    data.fetchDocsFiles()
  ]);
};

onMounted(async () => {
  if (data.folders.length === 0) {
    await data.fetchFolders();
  }
  initialFolderLoaded.value = true;
  if (data.prompts.length === 0) {
    await data.fetchPrompts();
  }
  if (data.resources.length === 0) {
    await data.fetchResources();
  }
  if (data.notes.length === 0) {
    await data.fetchNotes();
  }
  if (data.docs.length === 0) {
    await data.fetchDocs();
  }
  if (data.docsFiles.length === 0) {
    await data.fetchDocsFiles();
  }
  // Background loads for the resource form's organization dropdowns.
  if (!data.projects.length) data.fetchProjects();
  if (!data.websites.length) data.fetchWebsites();
  if (!data.members.length) data.fetchMembers();
});
</script>
