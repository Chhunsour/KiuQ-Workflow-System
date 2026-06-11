<template>
  <div>
    <PageHeader
      title="Resources"
      subtitle="Files, links, notes, and references for your team."
    >
      <template #actions>
        <button v-if="!auth.isViewer" class="btn-primary" type="button" @click="openCreate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Resource
        </button>
      </template>
    </PageHeader>

    <!-- Filters -->
    <div class="mb-5 space-y-3">
      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="search"
          class="input max-w-sm"
          type="search"
          placeholder="Search resources and tools..."
        />
        <FormSelect
          v-model="typeFilter"
          :options="[{ value: '', label: 'All types' }, ...resourceTypeSelectOptions]"
          class="max-w-[200px]"
        />
        <FormSelect
          v-model="folderFilter"
          :options="[{ value: '', label: 'All folders' }, ...folderOptions]"
          class="max-w-[200px]"
        />
        <FormSelect
          v-model="ownerFilter"
          :options="ownerFilterOptions"
          class="max-w-[200px]"
        />
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="category in quickAccessCategoryOptions"
          :key="category"
          type="button"
          class="ui-font rounded-full border px-3 py-1.5 text-sm font-medium transition"
          :class="
            quickAccessCategory === category
              ? 'border-primary bg-primary text-white'
              : 'border-border bg-card text-text-muted hover:text-text-main'
          "
          @click="quickAccessCategory = category"
        >
          {{ category }}
        </button>
      </div>
    </div>

    <section class="mb-8">
      <div class="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="section-title">Team Quick Access</h2>
          <p class="helper mt-1">Open daily websites and tools in a new tab.</p>
        </div>
        <span class="ui-font rounded-full bg-soft px-3 py-1 text-xs font-medium text-text-muted">
          {{ filteredQuickAccess.length }} shortcut{{ filteredQuickAccess.length === 1 ? '' : 's' }}
        </span>
      </div>

      <div v-if="filteredQuickAccess.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="tool in filteredQuickAccess"
          :key="tool.name"
          class="card card-pad flex flex-col"
        >
          <div class="flex items-start gap-3">
            <span
              class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-btn bg-soft"
            >
              <img
                v-if="!failedQuickAccessIcons.has(tool.name)"
                :src="tool.iconUrl"
                :alt="`${tool.name} icon`"
                class="h-7 w-7 object-contain"
                loading="lazy"
                referrerpolicy="no-referrer"
                @error="markQuickAccessIconFailed(tool.name)"
              />
              <span v-else class="ui-font text-sm font-bold text-primary">
                {{ tool.initials }}
              </span>
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-1.5">
                <h3 class="ui-font truncate text-base font-semibold text-text-main">{{ tool.name }}</h3>
                <svg class="flex-shrink-0 text-text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7" />
                  <path d="M7 7h10v10" />
                </svg>
              </div>
              <span class="ui-font mt-1 inline-flex rounded-full bg-soft px-2 py-0.5 text-xs font-medium text-text-muted">
                {{ tool.category }}
              </span>
            </div>
          </div>

          <p class="mt-3 min-h-[42px] text-sm text-text-muted">
            {{ tool.description }}
          </p>

          <div class="mt-auto pt-4">
            <a
              :href="tool.url"
              target="_blank"
              rel="noopener"
              class="btn-primary w-full justify-center"
            >
              Open
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M7 17 17 7" />
                <path d="M7 7h10v10" />
              </svg>
            </a>
          </div>
        </article>
      </div>

      <EmptyState
        v-else
        title="No quick access tools found"
        description="Try another search term or category."
      >
        <template #action>
          <button class="btn-primary" type="button" @click="clearQuickAccessFilters">
            Clear filters
          </button>
        </template>
      </EmptyState>
    </section>

    <LoadingBlock
      :loading="data.loading.resources"
      :error="data.errors.resources"
      :retry="data.fetchResources"
    >
      <div class="mb-3">
        <h2 class="section-title">Saved Resources</h2>
        <p class="helper mt-1">Files, links, notes, and references saved by the team.</p>
      </div>

      <div v-if="filtered.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ResourceCard
          v-for="r in filtered"
          :key="r.id"
          :resource="r"
          @view="openView"
          @edit="openEdit"
          @delete="confirmDelete"
        />
      </div>

      <EmptyState
        v-else-if="!hasAnyResources"
        title="No resources added yet."
        description="Upload a file, save a link, or create a note to keep your workflow organized."
      >
        <template v-if="!auth.isViewer" #action>
          <button class="btn-primary" type="button" @click="openCreate">Add Resource</button>
        </template>
      </EmptyState>

      <EmptyState
        v-else
        title="No resources match your filters"
        description="Try a different search term or clear a filter."
      />
    </LoadingBlock>

    <!-- Add / Edit modal -->
    <Modal
      :open="formOpen"
      :title="formMode === 'edit' ? 'Edit resource' : 'Add resource'"
      :subtitle="formMode === 'edit' ? 'Update this resource.' : 'Pick a type, then fill the details.'"
      size="lg"
      @close="closeForm"
    >
      <ResourceForm
        ref="formRef"
        :initial="formInitial"
        @submit="save"
        @uploading="(v) => (uploading = v)"
      />
      <div v-if="data.errors.resources" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.resources }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" :disabled="saving || uploading" @click="closeForm">
          Cancel
        </button>
        <button
          class="btn-primary"
          type="button"
          :disabled="saving || uploading"
          @click="save(formRef?.model)"
        >
          {{ saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save Resource' }}
        </button>
      </template>
    </Modal>

    <!-- Detail modal -->
    <ResourceDetailModal
      :open="detailOpen"
      :resource="detailResource"
      @close="detailOpen = false"
      @edit="(r) => (detailOpen = false, openEdit(r))"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Modal from '@/components/ui/Modal.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import ResourceCard from '@/components/resources/ResourceCard.vue';
import ResourceForm from '@/components/resources/ResourceForm.vue';
import ResourceDetailModal from '@/components/resources/ResourceDetailModal.vue';
import { resourceTypeSelectOptions } from '@/components/resources/resourceMeta';
import { useAuthStore } from '@/stores/auth';
import {
  useDataStore,
  type Resource,
  type ResourceType,
  type ResourceVisibility
} from '@/stores/data';

const auth = useAuthStore();
const data = useDataStore();

const search = ref('');
const typeFilter = ref<ResourceType | ''>('');
const folderFilter = ref('');
const ownerFilter = ref<'all' | 'mine' | 'team'>('all');
type QuickAccessCategory =
  | 'All'
  | 'AI Tools'
  | 'Website Management'
  | 'Development'
  | 'Design & Assets'
  | 'Documents & Learning';

interface QuickAccessTool {
  name: string;
  url: string;
  description: string;
  category: Exclude<QuickAccessCategory, 'All'>;
  iconUrl: string;
  initials: string;
}

const quickAccessCategory = ref<QuickAccessCategory>('All');
const failedQuickAccessIcons = ref(new Set<string>());
const quickAccessCategoryOptions: QuickAccessCategory[] = [
  'All',
  'AI Tools',
  'Website Management',
  'Development',
  'Design & Assets',
  'Documents & Learning'
];
const quickAccessTools: QuickAccessTool[] = [
  {
    name: 'Pinterest',
    url: 'https://www.pinterest.com',
    description: 'Design inspiration and image ideas',
    category: 'Design & Assets',
    iconUrl: 'https://www.google.com/s2/favicons?domain=pinterest.com&sz=64',
    initials: 'P'
  },
  {
    name: 'Hostinger',
    url: 'https://www.hostinger.com',
    description: 'Website hosting and domain management',
    category: 'Website Management',
    iconUrl: 'https://www.google.com/s2/favicons?domain=hostinger.com&sz=64',
    initials: 'H'
  },
  {
    name: 'GoDaddy',
    url: 'https://www.godaddy.com',
    description: 'Domain management, DNS settings, renewals, and nameserver control.',
    category: 'Website Management',
    iconUrl: 'https://www.google.com/s2/favicons?domain=godaddy.com&sz=64',
    initials: 'GD'
  },
  {
    name: 'Google Search Console',
    url: 'https://search.google.com/search-console',
    description: 'Check Google indexing, search performance, clicks, impressions, and website SEO issues.',
    category: 'Website Management',
    iconUrl: 'https://www.google.com/s2/favicons?domain=search.google.com&sz=64',
    initials: 'GSC'
  },
  {
    name: 'GitHub',
    url: 'https://github.com',
    description: 'Code repositories, version control, and project collaboration',
    category: 'Development',
    iconUrl: 'https://www.google.com/s2/favicons?domain=github.com&sz=64',
    initials: 'GH'
  },
  {
    name: 'Supabase',
    url: 'https://supabase.com',
    description: 'Database, authentication, storage, and backend tools',
    category: 'Development',
    iconUrl: 'https://www.google.com/s2/favicons?domain=supabase.com&sz=64',
    initials: 'SB'
  },
  {
    name: 'Firebase',
    url: 'https://firebase.google.com',
    description: 'Push notifications, app tools, and backend services',
    category: 'Development',
    iconUrl: 'https://www.google.com/s2/favicons?domain=firebase.google.com&sz=64',
    initials: 'FB'
  },
  {
    name: 'Cloudflare',
    url: 'https://www.cloudflare.com',
    description: 'DNS, security, CDN, cache, and website performance tools',
    category: 'Website Management',
    iconUrl: 'https://www.google.com/s2/favicons?domain=cloudflare.com&sz=64',
    initials: 'CF'
  },
  {
    name: 'ChatGPT',
    url: 'https://chatgpt.com',
    description: 'AI writing, coding, SEO, and prompt work',
    category: 'AI Tools',
    iconUrl: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=64',
    initials: 'CG'
  },
  {
    name: 'Google Gemini',
    url: 'https://gemini.google.com',
    description: 'AI writing, research, and content help',
    category: 'AI Tools',
    iconUrl: 'https://www.google.com/s2/favicons?domain=gemini.google.com&sz=64',
    initials: 'GG'
  },
  {
    name: 'Claude',
    url: 'https://claude.ai',
    description: 'Coding, planning, and writing support',
    category: 'AI Tools',
    iconUrl: 'https://www.google.com/s2/favicons?domain=claude.ai&sz=64',
    initials: 'C'
  },
  {
    name: 'DeepSeek',
    url: 'https://www.deepseek.com',
    description: 'AI writing, coding, research, and technical help',
    category: 'AI Tools',
    iconUrl: 'https://www.google.com/s2/favicons?domain=deepseek.com&sz=64',
    initials: 'DS'
  },
  {
    name: 'Manus AI',
    url: 'https://manus.im',
    description: 'AI assistant for planning, research, and task support',
    category: 'AI Tools',
    iconUrl: 'https://www.google.com/s2/favicons?domain=manus.im&sz=64',
    initials: 'MA'
  },
  {
    name: 'Grok',
    url: 'https://grok.com',
    description: 'AI assistant by xAI for writing, coding, research, image help, and real-time answers.',
    category: 'AI Tools',
    iconUrl: 'https://www.google.com/s2/favicons?domain=grok.com&sz=64',
    initials: 'G'
  },
  {
    name: 'YouTube',
    url: 'https://www.youtube.com',
    description: 'Tutorials, references, and learning',
    category: 'Documents & Learning',
    iconUrl: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
    initials: 'YT'
  },
  {
    name: 'MonsterONE',
    url: 'https://monsterone.com',
    description: 'Website templates, assets, and design resources',
    category: 'Design & Assets',
    iconUrl: 'https://www.google.com/s2/favicons?domain=monsterone.com&sz=64',
    initials: 'MO'
  },
  {
    name: 'Envato Elements',
    url: 'https://elements.envato.com',
    description: 'Website templates, design assets, graphics, and creative resources',
    category: 'Design & Assets',
    iconUrl: 'https://www.google.com/s2/favicons?domain=elements.envato.com&sz=64',
    initials: 'EE'
  },
  {
    name: 'Freepik',
    url: 'https://www.freepik.com',
    description: 'Stock images, icons, vectors, mockups, and design assets',
    category: 'Design & Assets',
    iconUrl: 'https://www.google.com/s2/favicons?domain=freepik.com&sz=64',
    initials: 'FP'
  },
  {
    name: 'Google Docs',
    url: 'https://docs.google.com',
    description: 'Documents, writing, sharing, and team notes',
    category: 'Documents & Learning',
    iconUrl: 'https://www.gstatic.com/images/branding/product/2x/docs_2020q4_48dp.png',
    initials: 'GD'
  },
  {
    name: 'Google Sheets',
    url: 'https://sheets.google.com',
    description: 'Spreadsheets, tracking sheets, reports, and data organization',
    category: 'Documents & Learning',
    iconUrl: 'https://www.gstatic.com/images/branding/product/2x/sheets_2020q4_48dp.png',
    initials: 'GS'
  },
  {
    name: 'Figma',
    url: 'https://www.figma.com',
    description: 'UI/UX design, website layouts, prototypes, and design review',
    category: 'Design & Assets',
    iconUrl: 'https://www.google.com/s2/favicons?domain=figma.com&sz=64',
    initials: 'F'
  },
  {
    name: 'Canva',
    url: 'https://www.canva.com',
    description: 'Social posts, banners, simple graphics, and marketing assets',
    category: 'Design & Assets',
    iconUrl: 'https://www.google.com/s2/favicons?domain=canva.com&sz=64',
    initials: 'CV'
  },
  {
    name: 'PageSpeed Insights',
    url: 'https://pagespeed.web.dev',
    description: 'Website speed checking, performance testing, and loading review',
    category: 'Website Management',
    iconUrl: 'https://www.google.com/s2/favicons?domain=pagespeed.web.dev&sz=64',
    initials: 'PS'
  }
];

const markQuickAccessIconFailed = (name: string) => {
  failedQuickAccessIcons.value = new Set([...failedQuickAccessIcons.value, name]);
};

const filteredQuickAccess = computed(() =>
  quickAccessTools.filter((tool) => {
    const q = search.value.trim().toLowerCase();
    if (q && !`${tool.name} ${tool.description} ${tool.category}`.toLowerCase().includes(q)) return false;
    if (quickAccessCategory.value !== 'All' && tool.category !== quickAccessCategory.value) return false;
    return true;
  })
);

const clearQuickAccessFilters = () => {
  search.value = '';
  quickAccessCategory.value = 'All';
};

const folderOptions = computed(() =>
  data.folders.map((f) => ({ value: f.id, label: f.name }))
);
const ownerFilterOptions = [
  { value: 'all', label: 'All resources' },
  { value: 'mine', label: 'Created by me' },
  { value: 'team', label: 'Shared with team' }
];

const hasAnyResources = computed(() => data.resources.length > 0);

const filtered = computed(() =>
  data.resources.filter((r) => {
    const q = search.value.trim().toLowerCase();
    if (q) {
      const haystack = `${r.title} ${r.description} ${r.fileName} ${r.externalUrl} ${r.textContent}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (typeFilter.value && r.type !== typeFilter.value) return false;
    if (folderFilter.value && r.folderId !== folderFilter.value) return false;
    if (ownerFilter.value === 'mine' && r.createdBy !== auth.user?.id) return false;
    if (ownerFilter.value === 'team' && r.visibility === 'private') return false;
    return true;
  })
);

// =====================
// Form (add / edit)
// =====================
const formOpen = ref(false);
const formMode = ref<'create' | 'edit'>('create');
const saving = ref(false);
const uploading = ref(false);
const formRef = ref<{ model: Resource } | null>(null);

const blank = (): Resource => ({
  id: '',
  title: '',
  type: 'file',
  description: '',
  folderId: null,
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

const formInitial = ref<Resource>(blank());

const openCreate = () => {
  formInitial.value = blank();
  formMode.value = 'create';
  formOpen.value = true;
};

const openEdit = (r: Resource) => {
  formInitial.value = { ...r };
  formMode.value = 'edit';
  formOpen.value = true;
};

const closeForm = () => {
  formOpen.value = false;
};

const save = async (m: Resource | undefined) => {
  if (!m) return;
  if (!m.title.trim()) {
    data.errors.resources = 'Please give the resource a title.';
    return;
  }
  saving.value = true;
  const ok = await data.upsertResource(m);
  saving.value = false;
  if (ok) closeForm();
};

const confirmDelete = async (r: Resource) => {
  if (!confirm(`Delete "${r.title || r.fileName || 'this resource'}"?`)) return;
  await data.removeResource(r.id);
};

// =====================
// Detail modal
// =====================
const detailOpen = ref(false);
const detailResource = ref<Resource | null>(null);
const openView = (r: Resource) => {
  detailResource.value = r;
  detailOpen.value = true;
};

// =====================
// Lifecycle
// =====================
onMounted(async () => {
  await data.fetchResources();
  // Background loads for the form's organization dropdowns.
  if (!data.folders.length) data.fetchFolders();
  if (!data.projects.length) data.fetchProjects();
  if (!data.websites.length) data.fetchWebsites();
  if (!data.sectionTasks.length && data.fetchSectionTasks) data.fetchSectionTasks();
  if (!data.members.length) data.fetchMembers();
});
</script>
