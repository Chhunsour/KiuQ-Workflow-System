<template>
  <div>
    <PageHeader
      title="Prompt Library"
      :subtitle="activeWebsite ? `You are working on ${activeWebsite.name}.` : 'Select a website to open its prompt library.'"
    >
      <template #actions>
        <RouterLink v-if="activeWebsite" to="/prompt-library" class="btn-secondary">Change Website</RouterLink>
        <RouterLink v-if="activeWebsite && activeGroup" :to="websiteLibraryLink(activeWebsite.id)" class="btn-secondary">
          All Page Groups
        </RouterLink>
        <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="openCreate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Prompt
        </button>
      </template>
    </PageHeader>

    <LoadingBlock :loading="pageLoading" :error="combinedError" :retry="loadPageData">
      <template v-if="routeWebsiteId && !activeWebsite">
        <div class="card card-pad text-center">
          <h2 class="section-title">Website not available</h2>
          <p class="mt-2 text-sm text-text-muted">
            This website is not assigned to your account, or it no longer exists.
          </p>
          <RouterLink to="/prompt-library" class="btn-primary mt-5">Change Website</RouterLink>
        </div>
      </template>

      <template v-else-if="activeWebsite && activePrompt">
        <nav class="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-muted" aria-label="Breadcrumb">
          <RouterLink to="/prompt-library" class="hover:text-text-main">Prompt Library</RouterLink>
          <span aria-hidden="true">›</span>
          <RouterLink :to="websiteLibraryLink(activeWebsite.id)" class="hover:text-text-main">
            {{ activeWebsite.name }}
          </RouterLink>
          <span aria-hidden="true">›</span>
          <RouterLink :to="websiteGroupLink(activeWebsite.id, promptPageGroupSlug(activePrompt))" class="hover:text-text-main">
            {{ promptPageGroupLabel(activePrompt) }}
          </RouterLink>
          <span aria-hidden="true">›</span>
          <span class="ui-font font-medium text-text-main">{{ activePrompt.title }}</span>
        </nav>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section class="card card-pad lg:col-span-2">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div class="ui-font text-xs font-semibold uppercase tracking-wide text-primary">
                  {{ promptPageGroupLabel(activePrompt) }}
                </div>
                <h2 class="mt-1 text-2xl font-bold text-text-main">{{ activePrompt.title }}</h2>
                <p class="mt-2 text-sm text-text-muted">
                  {{ activePrompt.shortDescription || 'Reusable website-building prompt.' }}
                </p>
              </div>
              <StatusBadge :status="activePrompt.status" />
            </div>

            <div class="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <InfoTile label="Website" :value="activeWebsite.name" highlight />
              <InfoTile label="Section type" :value="activePrompt.sectionType || '—'" />
              <InfoTile label="Prompt mode" :value="promptModeLabel(activePrompt.promptMode)" />
              <InfoTile label="Output" :value="outputTypeLabel(activePrompt.outputType)" />
              <InfoTile label="Version" :value="`v${activePrompt.version}`" />
            </div>

            <div v-if="activePrompt.topicType" class="mt-4">
              <span class="ui-font rounded-full bg-soft px-3 py-1 text-xs font-medium text-primary">
                {{ topicTypeLabel(activePrompt.topicType) }}
              </span>
            </div>

            <div class="mt-6 space-y-5">
              <div>
                <h3 class="section-title">Locked Rules</h3>
                <pre class="mt-2 whitespace-pre-wrap break-words rounded-card border border-border bg-soft p-4 text-sm text-text-main">{{ activePrompt.lockedRules || 'No locked rules.' }}</pre>
              </div>
              <div>
                <h3 class="section-title">Editable Fields</h3>
                <div v-if="activePrompt.editableFields.length" class="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div v-for="field in activePrompt.editableFields" :key="field.id" class="rounded-card border border-border bg-soft/40 p-3">
                    <div class="ui-font text-sm font-semibold text-text-main">{{ field.label || field.key }}</div>
                    <div class="mt-1 text-xs text-text-muted">{{ field.key }} · {{ field.type }}</div>
                  </div>
                </div>
                <p v-else class="mt-2 text-sm text-text-muted">No editable fields.</p>
              </div>
              <div v-if="activePrompt.requiredWebsiteFields.length || activePrompt.requiredProductFields.length">
                <h3 class="section-title">Required Data</h3>
                <div class="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div class="rounded-card border border-border bg-soft/40 p-3">
                    <div class="ui-font text-sm font-semibold text-text-main">Website fields</div>
                    <p class="mt-1 text-xs text-text-muted">
                      {{ activePrompt.requiredWebsiteFields.length ? activePrompt.requiredWebsiteFields.join(', ') : 'None' }}
                    </p>
                  </div>
                  <div class="rounded-card border border-border bg-soft/40 p-3">
                    <div class="ui-font text-sm font-semibold text-text-main">Product fields</div>
                    <p class="mt-1 text-xs text-text-muted">
                      {{ activePrompt.requiredProductFields.length ? activePrompt.requiredProductFields.join(', ') : 'None' }}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 class="section-title">Template Body</h3>
                <pre class="mt-2 max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-card border border-border bg-soft p-4 text-sm text-text-main">{{ activePrompt.templateContent || 'No template body.' }}</pre>
              </div>
            </div>
          </section>

          <aside class="space-y-4">
            <div class="card card-pad">
              <h3 class="section-title">Use This Prompt</h3>
              <p class="mt-1 text-sm text-text-muted">
                The selected website profile will load automatically in Prompt Builder.
              </p>
              <RouterLink :to="usePromptLink(activePrompt)" class="btn-primary mt-4 w-full justify-center">
                Use Prompt
              </RouterLink>
              <button
                v-if="auth.isAdmin"
                class="btn-secondary mt-2 w-full justify-center"
                type="button"
                @click="copyTemplate(activePrompt)"
              >
                {{ copiedPromptId === activePrompt.id ? 'Copied!' : 'Copy Template' }}
              </button>
            </div>

            <div class="card card-pad">
              <h3 class="section-title">Selected Website Profile</h3>
              <div class="mt-4 space-y-2 text-sm">
                <DetailRow label="Domain" :value="activeWebsite.domain || '—'" />
                <DetailRow label="Type" :value="websiteTypeLabel(activeWebsite.websiteType)" />
                <DetailRow label="Industry" :value="activeWebsite.industry || '—'" />
                <DetailRow label="Goal" :value="activeWebsite.websiteGoal || '—'" />
                <DetailRow label="Main keyword" :value="activeWebsite.mainKeyword || '—'" />
                <DetailRow label="Primary color" :value="activeWebsite.primaryColor || '—'" />
                <DetailRow label="Font" :value="activeWebsite.fontFamily || '—'" />
                <DetailRow label="Max width" :value="activeWebsite.maxWidth || '—'" />
                <DetailRow label="Phone" :value="activeWebsite.phoneNumber || '—'" />
                <DetailRow label="Email" :value="activeWebsite.email || '—'" />
                <DetailRow label="Country" :value="activeWebsite.targetCountry || '—'" />
              </div>
            </div>

            <div v-if="auth.isAdmin" class="card card-pad">
              <h3 class="section-title">Admin Tools</h3>
              <div class="mt-4 flex flex-col gap-2">
                <button class="btn-secondary justify-center" type="button" @click="openEdit(activePrompt)">Edit Prompt</button>
                <button class="btn-secondary justify-center" type="button" @click="openAssign(activePrompt)">Assign to Team</button>
                <button class="btn-secondary justify-center" type="button" @click="duplicatePrompt(activePrompt)">Duplicate New Version</button>
                <button
                  v-if="activePrompt.qualityStatus !== 'archived'"
                  class="btn-secondary justify-center"
                  type="button"
                  @click="archivePrompt(activePrompt)"
                >
                  Archive Prompt
                </button>
                <button class="btn-danger justify-center" type="button" @click="confirmDelete(activePrompt)">Delete Prompt</button>
              </div>
            </div>
          </aside>
        </div>
      </template>

      <template v-else-if="activeWebsite && activeGroup">
        <nav class="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-muted" aria-label="Breadcrumb">
          <RouterLink to="/prompt-library" class="hover:text-text-main">Prompt Library</RouterLink>
          <span aria-hidden="true">›</span>
          <RouterLink :to="websiteLibraryLink(activeWebsite.id)" class="hover:text-text-main">
            {{ activeWebsite.name }}
          </RouterLink>
          <span aria-hidden="true">›</span>
          <span class="ui-font font-medium text-text-main">{{ activeGroup.label }}</span>
        </nav>

        <WebsiteSummary :website="activeWebsite" />

        <div class="mt-6 mb-5 card card-pad">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-2xl font-bold text-text-main">{{ activeGroup.label }}</h2>
              <p class="mt-1 text-sm text-text-muted">{{ activeGroup.description }}</p>
            </div>
            <span class="ui-font rounded-full bg-soft px-3 py-1 text-sm font-medium text-primary">
              {{ groupPrompts.length }} prompt{{ groupPrompts.length === 1 ? '' : 's' }}
            </span>
          </div>
        </div>

        <div class="mb-5 flex flex-wrap items-center gap-3">
          <input v-model="search" class="input max-w-sm" type="search" placeholder="Search prompts..." />
          <FormSelect
            v-model="promptModeFilter"
            :options="[{ value: '', label: 'Section + Full Page' }, ...promptModeOptions]"
            class="max-w-[200px]"
          />
          <FormSelect v-model="promptTypeFilter" :options="[{ value: '', label: 'All prompt types' }, ...promptTypeOptions]" class="max-w-[200px]" />
          <FormSelect v-model="outputTypeFilter" :options="[{ value: '', label: 'All output types' }, ...outputTypeOptions]" class="max-w-[220px]" />
          <FormSelect v-model="statusFilter" :options="statusOptions" class="max-w-[160px]" />
          <FormSelect
            v-if="activeGroup.slug === 'topic-pages'"
            v-model="topicTypeFilter"
            :options="[{ value: '', label: 'All topic types' }, ...topicTypeOptions]"
            class="max-w-[260px]"
          />
        </div>

        <div v-if="filteredGroupPrompts.length" class="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <PromptCard
            v-for="prompt in filteredGroupPrompts"
            :key="prompt.id"
            :prompt="prompt"
            :can-admin="auth.isAdmin"
            :copied="copiedPromptId === prompt.id"
            :view-link="promptDetailLink(prompt)"
            :use-link="usePromptLink(prompt)"
            @copy="copyTemplate"
            @assign="openAssign"
            @edit="openEdit"
          />
        </div>

        <EmptyState
          v-else
          title="No prompts found"
          description="Try another search or filter. Admins can add prompts for this page group."
        >
          <template v-if="auth.isAdmin" #action>
            <button class="btn-primary" type="button" @click="openCreate">New Prompt</button>
          </template>
        </EmptyState>
      </template>

      <template v-else-if="activeWebsite">
        <WebsiteSummary :website="activeWebsite" />

        <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article v-for="group in pageGroups" :key="group.slug" class="card card-pad flex flex-col">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="ui-font text-lg font-semibold text-text-main">{{ group.label }}</h3>
                <p class="mt-2 text-sm text-text-muted">{{ group.description }}</p>
              </div>
              <span class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-semibold text-primary">
                {{ promptsForGroup(group.slug).length }}
              </span>
            </div>
            <div class="mt-3 flex flex-wrap gap-1.5 text-xs text-text-muted">
              <span class="ui-font rounded-full bg-soft px-2 py-0.5">{{ sectionCountFor(group.slug) }} section</span>
              <span class="ui-font rounded-full bg-soft px-2 py-0.5">{{ fullPageCountFor(group.slug) }} full page</span>
            </div>
            <div class="mt-auto pt-5">
              <RouterLink :to="websiteGroupLink(activeWebsite.id, group.slug)" class="btn-primary w-full justify-center">
                Open
              </RouterLink>
            </div>
          </article>
        </div>
      </template>

      <template v-else>
        <div class="mb-5 card card-pad">
          <h2 class="text-2xl font-bold text-text-main">Select a website to open its prompt library.</h2>
          <p class="mt-2 text-sm text-text-muted">
            Choose the website you are working on first. The final prompt will automatically use that website profile.
          </p>
        </div>

        <div v-if="availableWebsites.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="website in availableWebsites" :key="website.id" class="card card-pad flex flex-col">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-2 min-w-0">
                <div v-if="website.faviconUrl" class="pl-site-avatar">
                  <img :src="website.faviconUrl" alt="" class="pl-site-favicon" @error="(e) => ((e.target as HTMLImageElement).parentElement!.style.display = 'none')" />
                </div>
                <div class="min-w-0">
                  <h3 class="ui-font text-lg font-semibold text-text-main">{{ website.name }}</h3>
                  <p class="mt-1 text-sm text-text-muted">{{ website.domain || 'No domain saved' }}</p>
                </div>
              </div>
              <span class="h-8 w-8 rounded-full border border-border" :style="{ backgroundColor: website.primaryColor || '#3f8dfe' }" />
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
              <DetailRow label="Website type" :value="websiteTypeLabel(website.websiteType)" compact />
              <DetailRow label="Font family" :value="website.fontFamily || '—'" compact />
              <DetailRow label="Prompts" :value="`${promptCountForWebsite(website)} available`" compact />
              <DetailRow label="Primary" :value="website.primaryColor || '—'" compact />
            </div>
            <div class="mt-auto pt-5">
              <RouterLink :to="websiteLibraryLink(website.id)" class="btn-primary w-full justify-center">
                Open Prompt Library
              </RouterLink>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          title="No websites available"
          description="Ask admin to assign a website or create a website profile first."
        >
          <template v-if="auth.isAdmin" #action>
            <RouterLink to="/websites/new" class="btn-primary">New Website</RouterLink>
          </template>
        </EmptyState>
      </template>
    </LoadingBlock>

    <Modal
      :open="editorOpen"
      :title="editing ? 'Edit prompt' : 'New prompt'"
      subtitle="Define page group, locked rules, editable fields, and template body."
      size="xl"
      @close="closeEditor"
    >
      <PromptEditor ref="editorRef" :initial="formInitial" />
      <div v-if="data.errors.prompts" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.prompts }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="closeEditor">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="savePrompt">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </template>
    </Modal>

    <Modal
      :open="assignOpen"
      :title="`Assign: ${assignPrompt?.title ?? ''}`"
      subtitle="Send this prompt to a team member."
      size="md"
      @close="assignOpen = false"
    >
      <div class="space-y-4">
        <FormSelect v-model="assignForm.assignedMemberId" label="Assign to" placeholder="Pick a member" :options="memberOptions" />
        <FormSelect v-model="projectValue" label="Project (optional)" placeholder="None" :options="projectOptions" />
        <FormSelect v-model="websiteValue" label="Website (optional)" placeholder="None" :options="websiteOptions" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput v-model="assignForm.dueDate" label="Due date" type="date" />
          <FormSelect v-model="assignForm.priority" label="Priority" :options="priorityOptions" />
        </div>
        <FormTextarea v-model="assignForm.adminNote" label="Admin note" :rows="3" />
      </div>
      <div v-if="data.errors.assignments" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.assignments }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="assignOpen = false">Cancel</button>
        <button class="btn-primary" type="button" :disabled="!assignForm.assignedMemberId || sendingAssignment" @click="saveAssignment">
          {{ sendingAssignment ? 'Sending...' : 'Send Assignment' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, type PropType } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import PromptEditor from '@/components/prompt/PromptEditor.vue';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';
import {
  useDataStore,
  type OutputType,
  type Prompt,
  type PromptAssignment,
  type PromptMode,
  type PromptStatus,
  type PromptType,
  type Website
} from '@/stores/data';
import {
  outputTypeLabel,
  outputTypeOptions,
  pageGroupByRouteSlug,
  pageGroupRouteSlug,
  pageGroups,
  promptModeLabel,
  promptModeOptions,
  promptPageGroupLabel,
  promptPageGroupRouteSlug,
  promptPageGroupSlug,
  promptTypeLabel,
  promptTypeOptions,
  topicTypeLabel,
  topicTypes,
  websiteTypeLabel
} from '@/lib/promptLibrary';

const route = useRoute();
const auth = useAuthStore();
const data = useDataStore();
const notifs = useNotificationsStore();

const search = ref('');
const promptModeFilter = ref<PromptMode | ''>('');
const promptTypeFilter = ref<PromptType | ''>('');
const outputTypeFilter = ref<OutputType | ''>('');
const statusFilter = ref<PromptStatus | ''>('');
const topicTypeFilter = ref('');
const copiedPromptId = ref('');

const routeWebsiteId = computed(() =>
  typeof route.params.websiteId === 'string' ? route.params.websiteId : ''
);
const activeGroup = computed(() =>
  typeof route.params.pageGroup === 'string' ? pageGroupByRouteSlug(route.params.pageGroup) : undefined
);
const activeGroupSlug = computed(() => activeGroup.value?.slug ?? '');
const activePromptId = computed(() =>
  typeof route.params.promptId === 'string' ? route.params.promptId : ''
);

const assignedPromptIds = computed(() => new Set(data.myAssignments.map((assignment) => assignment.promptId)));
const assignedWebsiteIds = computed(() => {
  const ids = new Set<string>();
  data.myAssignments.forEach((assignment) => {
    if (assignment.websiteId) ids.add(assignment.websiteId);
    const projectWebsiteId = data.projectById(assignment.projectId)?.websiteId;
    if (projectWebsiteId) ids.add(projectWebsiteId);
  });
  data.mySectionTasks.forEach((task) => {
    const projectWebsiteId = data.projectById(task.projectId)?.websiteId;
    if (projectWebsiteId) ids.add(projectWebsiteId);
  });
  return ids;
});

const availableWebsites = computed(() =>
  auth.isAdmin ? data.websites : data.websites.filter((website) => assignedWebsiteIds.value.has(website.id))
);
const activeWebsite = computed(() =>
  routeWebsiteId.value ? availableWebsites.value.find((website) => website.id === routeWebsiteId.value) : undefined
);

const visiblePrompts = computed(() =>
  data.prompts.filter((prompt) => {
    if (!auth.isAdmin && prompt.qualityStatus === 'archived') return false;
    return auth.isAdmin || prompt.status === 'approved' || assignedPromptIds.value.has(prompt.id);
  })
);

const promptCompatibleWithWebsite = (prompt: Prompt, website: Website | undefined) => {
  if (!website || prompt.compatibleWebsiteTypes.length === 0 || !website.websiteType) return true;
  return prompt.compatibleWebsiteTypes.includes(website.websiteType);
};

const promptsForWebsite = (website: Website) =>
  visiblePrompts.value.filter((prompt) => promptCompatibleWithWebsite(prompt, website));
const promptCountForWebsite = (website: Website) => promptsForWebsite(website).length;
const promptsForGroup = (slug: string) =>
  activeWebsite.value
    ? promptsForWebsite(activeWebsite.value).filter((prompt) => promptPageGroupSlug(prompt) === slug)
    : [];

const groupPrompts = computed(() => promptsForGroup(activeGroupSlug.value));
const filteredGroupPrompts = computed(() =>
  groupPrompts.value.filter((prompt) => {
    const q = search.value.trim().toLowerCase();
    if (q && !`${prompt.title} ${prompt.sectionType} ${prompt.shortDescription} ${prompt.templateContent}`.toLowerCase().includes(q)) return false;
    if (promptModeFilter.value && prompt.promptMode !== promptModeFilter.value) return false;
    if (promptTypeFilter.value && prompt.promptType !== promptTypeFilter.value) return false;
    if (outputTypeFilter.value && prompt.outputType !== outputTypeFilter.value) return false;
    if (statusFilter.value && prompt.status !== statusFilter.value) return false;
    if (activeGroupSlug.value === 'topic-pages' && topicTypeFilter.value && prompt.topicType !== topicTypeFilter.value) return false;
    return true;
  })
);
const activePrompt = computed(() =>
  activePromptId.value ? groupPrompts.value.find((prompt) => prompt.id === activePromptId.value) : null
);

const sectionCountFor = (slug: string) =>
  promptsForGroup(slug).filter((prompt) => prompt.promptMode === 'section').length;
const fullPageCountFor = (slug: string) =>
  promptsForGroup(slug).filter((prompt) => prompt.promptMode === 'full_page').length;

const pageLoading = computed(
  () =>
    data.loading.websites ||
    data.loading.prompts ||
    (auth.isMember && (data.loading.assignments || data.loading.projects || data.loading.sectionTasks))
);
const combinedError = computed(
  () =>
    data.errors.websites ||
    data.errors.prompts ||
    data.errors.assignments ||
    data.errors.projects ||
    data.errors.sectionTasks ||
    null
);

const statusOptions = computed(() => [
  { value: '', label: 'All statuses' },
  ...(auth.isAdmin ? [{ value: 'draft', label: 'Draft' }] : []),
  { value: 'approved', label: 'Approved' }
]);
const topicTypeOptions = computed(() =>
  topicTypes.map((topic) => ({ value: topic.slug, label: topic.label }))
);
const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
];

const websiteLibraryLink = (websiteId: string) => `/prompt-library/website/${websiteId}`;
const websiteGroupLink = (websiteId: string, groupSlug: string) =>
  `/prompt-library/website/${websiteId}/${pageGroupRouteSlug(groupSlug)}`;
const promptDetailLink = (prompt: Prompt) =>
  activeWebsite.value
    ? `/prompt-library/website/${activeWebsite.value.id}/${promptPageGroupRouteSlug(prompt)}/${prompt.id}`
    : `/prompt-library/${promptPageGroupRouteSlug(prompt)}/${prompt.id}`;
const usePromptLink = (prompt: Prompt) => {
  const params = new URLSearchParams();
  if (activeWebsite.value) params.set('websiteId', activeWebsite.value.id);
  params.set('pageGroup', promptPageGroupRouteSlug(prompt));
  return `/prompt-builder/use/${prompt.id}?${params.toString()}`;
};

const copyTemplate = async (prompt: Prompt) => {
  await navigator.clipboard.writeText(prompt.templateContent);
  copiedPromptId.value = prompt.id;
  setTimeout(() => {
    if (copiedPromptId.value === prompt.id) copiedPromptId.value = '';
  }, 1500);
};

const editorOpen = ref(false);
const editing = ref(false);
const saving = ref(false);
const editorRef = ref<{ model: Prompt } | null>(null);

const blank = (): Prompt => ({
  id: '',
  title: '',
  category: activeGroupSlug.value || 'front-page',
  pageGroup: activeGroupSlug.value || 'front-page',
  sectionType: activeGroupSlug.value === 'front-page' ? 'Hero Section' : '',
  topicType: activeGroupSlug.value === 'topic-pages' ? 'equipment-category' : null,
  folderId: null,
  promptType: 'section',
  promptMode: 'section',
  compatibleWebsiteTypes: [],
  requiredWebsiteFields: [],
  requiredProductFields: [],
  requiresProducts: 0,
  shortDescription: '',
  lockedRules: '',
  editableFields: [],
  templateContent: '',
  defaultValues: {},
  outputType: 'elementor_section',
  status: 'draft',
  version: 1,
  qualityStatus: 'good',
  parentPromptId: null,
  usageCount: 0,
  approvedOutputCount: 0,
  rejectedOutputCount: 0,
  needsFixCount: 0,
  notes: '',
  createdBy: null,
  createdAt: '',
  updatedAt: ''
});

const formInitial = ref<Prompt>(blank());

const openCreate = () => {
  formInitial.value = blank();
  editing.value = false;
  editorOpen.value = true;
};
const openEdit = (prompt: Prompt) => {
  formInitial.value = {
    ...prompt,
    pageGroup: prompt.pageGroup || prompt.category || 'front-page',
    editableFields: prompt.editableFields.map((field) => ({ ...field })),
    defaultValues: { ...prompt.defaultValues },
    compatibleWebsiteTypes: [...prompt.compatibleWebsiteTypes],
    requiredWebsiteFields: [...prompt.requiredWebsiteFields],
    requiredProductFields: [...prompt.requiredProductFields]
  };
  editing.value = true;
  editorOpen.value = true;
};
const closeEditor = () => (editorOpen.value = false);

const savePrompt = async () => {
  const model = editorRef.value?.model;
  if (!model || !model.title.trim()) return;
  saving.value = true;
  const ok = await data.upsertPrompt({
    ...model,
    category: model.pageGroup || model.category
  });
  saving.value = false;
  if (ok) closeEditor();
};

const confirmDelete = async (prompt: Prompt) => {
  if (!confirm(`Delete prompt "${prompt.title}"?`)) return;
  await data.removePrompt(prompt.id);
};
const duplicatePrompt = async (prompt: Prompt) => {
  await data.duplicatePromptAsNewVersion(prompt.id);
};
const archivePrompt = async (prompt: Prompt) => {
  if (!confirm(`Archive prompt "${prompt.title}"?`)) return;
  await data.archivePrompt(prompt.id);
};

const assignOpen = ref(false);
const sendingAssignment = ref(false);
const assignPrompt = ref<Prompt | null>(null);
const assignForm = reactive<PromptAssignment>({
  id: '',
  promptId: '',
  projectId: null,
  websiteId: null,
  assignedMemberId: '',
  status: 'pending',
  filledValues: {},
  pastedResult: '',
  dueDate: '',
  priority: 'normal',
  adminNote: '',
  startedAt: '',
  completedAt: '',
  assignedAt: '',
  assignedBy: null,
  updatedAt: ''
});

const projectValue = computed({
  get: () => assignForm.projectId ?? '',
  set: (value) => (assignForm.projectId = value || null)
});
const websiteValue = computed({
  get: () => assignForm.websiteId ?? '',
  set: (value) => (assignForm.websiteId = value || null)
});

const memberOptions = computed(() =>
  data.members.filter((member) => member.status === 'active').map((member) => ({ value: member.id, label: member.fullName || member.email }))
);
const projectOptions = computed(() => data.projects.map((project) => ({ value: project.id, label: project.name })));
const websiteOptions = computed(() => data.websites.map((website) => ({ value: website.id, label: website.name })));

const openAssign = (prompt: Prompt) => {
  assignPrompt.value = prompt;
  Object.assign(assignForm, {
    id: '',
    promptId: prompt.id,
    projectId: null,
    websiteId: activeWebsite.value?.id ?? null,
    assignedMemberId: '',
    status: 'pending',
    filledValues: {},
    pastedResult: '',
    dueDate: '',
    priority: 'normal',
    adminNote: '',
    startedAt: '',
    completedAt: '',
    assignedAt: '',
    updatedAt: ''
  });
  assignOpen.value = true;
};

const saveAssignment = async () => {
  if (!assignForm.assignedMemberId || !assignPrompt.value) return;
  sendingAssignment.value = true;
  const ok = await data.upsertAssignment(assignForm);
  sendingAssignment.value = false;
  if (ok) {
    assignOpen.value = false;
    if (assignForm.assignedMemberId !== auth.user?.id) {
      void notifs.createNotification({
        recipientId: assignForm.assignedMemberId,
        actorId:     auth.user?.id,
        type:        'task_assigned',
        title:       'New task assigned',
        message:     `${auth.profile?.fullName || 'Admin'} assigned you a task: "${assignPrompt.value.title}"`,
        relatedType: 'assignment',
      });
    }
  }
};

const loadPageData = async () => {
  await Promise.allSettled([
    data.fetchWebsites(),
    data.fetchPrompts(),
    data.fetchAssignments(),
    data.fetchProjects(),
    data.fetchSectionTasks(),
    auth.isAdmin ? data.fetchMembers() : Promise.resolve()
  ]);
};

onMounted(() => {
  void loadPageData();
});

const DetailRow = defineComponent({
  name: 'DetailRow',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    compact: { type: Boolean, default: false }
  },
  setup(props) {
    return () =>
      h('div', { class: props.compact ? '' : 'flex items-center justify-between gap-3' }, [
        h('div', { class: 'text-xs text-text-muted' }, props.label),
        h('div', { class: props.compact ? 'ui-font mt-1 text-sm font-semibold text-text-main' : 'ui-font text-sm font-semibold text-text-main' }, props.value)
      ]);
  }
});

const InfoTile = defineComponent({
  name: 'InfoTile',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
    highlight: { type: Boolean, default: false }
  },
  setup(props) {
    return () =>
      h('div', { class: `rounded-card border p-3 ${props.highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-soft/40'}` }, [
        h('div', { class: `ui-font text-xs uppercase ${props.highlight ? 'text-primary' : 'text-text-muted'}` }, props.label),
        h('div', { class: 'mt-1 font-medium text-text-main' }, props.value)
      ]);
  }
});

const WebsiteSummary = defineComponent({
  name: 'WebsiteSummary',
  props: {
    website: { type: Object as PropType<Website>, required: true }
  },
  setup(props) {
    return () =>
      h('section', { class: 'card card-pad' }, [
        h('div', { class: 'flex flex-wrap items-start justify-between gap-4' }, [
          h('div', [
            h('div', { class: 'ui-font text-xs font-semibold uppercase tracking-wide text-primary' }, 'Selected Website Profile'),
            h('h2', { class: 'mt-1 text-2xl font-bold text-text-main' }, props.website.name),
            h('p', { class: 'mt-1 text-sm text-text-muted' }, `You are working on ${props.website.name}.`)
          ]),
          h('span', {
            class: 'h-10 w-10 rounded-full border border-border',
            style: { backgroundColor: props.website.primaryColor || '#3f8dfe' }
          })
        ]),
        h('div', { class: 'mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4' }, [
          h(InfoTile, { label: 'Domain', value: props.website.domain || '—' }),
          h(InfoTile, { label: 'Website type', value: websiteTypeLabel(props.website.websiteType) }),
          h(InfoTile, { label: 'Primary color', value: props.website.primaryColor || '—' }),
          h(InfoTile, { label: 'Font', value: props.website.fontFamily || '—' }),
          h(InfoTile, { label: 'Max width', value: props.website.maxWidth || '—' }),
          h(InfoTile, { label: 'Phone', value: props.website.phoneNumber || '—' }),
          h(InfoTile, { label: 'Email', value: props.website.email || '—' }),
          h(InfoTile, { label: 'Border radius', value: props.website.borderRadius || '—' })
        ])
      ]);
  }
});

const PromptCard = defineComponent({
  name: 'PromptCard',
  props: {
    prompt: { type: Object as PropType<Prompt>, required: true },
    canAdmin: { type: Boolean, default: false },
    copied: { type: Boolean, default: false },
    viewLink: { type: String, required: true },
    useLink: { type: String, required: true }
  },
  emits: ['copy', 'assign', 'edit'],
  setup(props, { emit }) {
    return () =>
      h('article', { class: 'card card-pad flex flex-col' }, [
        h('div', { class: 'flex items-start justify-between gap-4' }, [
          h('div', { class: 'min-w-0' }, [
            h('div', { class: 'ui-font text-xs font-semibold uppercase tracking-wide text-primary' }, promptPageGroupLabel(props.prompt)),
            h('h3', { class: 'ui-font mt-1 truncate text-base font-semibold text-text-main' }, props.prompt.title),
            h('p', { class: 'mt-2 line-clamp-2 text-sm text-text-muted' }, props.prompt.shortDescription || props.prompt.notes || 'Reusable website-building prompt.')
          ]),
          h(StatusBadge, { status: props.prompt.status })
        ]),
        h('div', { class: 'mt-4 flex flex-wrap gap-1.5 text-xs text-text-muted' }, [
          h('span', { class: 'ui-font rounded-full bg-primary/10 px-2 py-1 font-medium text-primary' }, promptModeLabel(props.prompt.promptMode)),
          props.prompt.sectionType ? h('span', { class: 'ui-font rounded-full bg-soft px-2 py-1' }, props.prompt.sectionType) : null,
          h('span', { class: 'ui-font rounded-full bg-soft px-2 py-1' }, promptTypeLabel(props.prompt.promptType)),
          h('span', { class: 'ui-font rounded-full bg-soft px-2 py-1' }, outputTypeLabel(props.prompt.outputType)),
          props.prompt.topicType ? h('span', { class: 'ui-font rounded-full bg-soft px-2 py-1' }, topicTypeLabel(props.prompt.topicType)) : null,
          ...props.prompt.compatibleWebsiteTypes.map((type) =>
            h('span', { class: 'ui-font rounded-full bg-soft px-2 py-1' }, websiteTypeLabel(type))
          ),
          h('span', { class: 'ui-font rounded-full bg-soft px-2 py-1' }, `v${props.prompt.version}`)
        ]),
        h('div', { class: 'mt-auto flex flex-wrap items-center gap-2 pt-4' }, [
          h(RouterLink, { to: props.viewLink, class: 'btn-secondary' }, () => 'View'),
          h(RouterLink, { to: props.useLink, class: 'btn-primary' }, () => 'Use Prompt'),
          props.canAdmin
            ? h('button', { class: 'btn-secondary', type: 'button', onClick: () => emit('copy', props.prompt) }, props.copied ? 'Copied!' : 'Copy Template')
            : null,
          props.canAdmin
            ? h('button', { class: 'btn-secondary', type: 'button', onClick: () => emit('assign', props.prompt) }, 'Assign')
            : null,
          props.canAdmin
            ? h('button', { class: 'btn-secondary', type: 'button', onClick: () => emit('edit', props.prompt) }, 'Edit')
            : null
        ])
      ]);
  }
});
</script>

<style scoped>
.pl-site-avatar {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 8px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.pl-site-favicon {
  width: 70%;
  height: 70%;
  object-fit: contain;
}
</style>
