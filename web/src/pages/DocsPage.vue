<template>
  <div>
    <PageHeader
      :title="auth.isAdmin ? 'Docs Drive' : 'Docs'"
      :subtitle="
        auth.isAdmin
          ? 'Organize product content in folders. Each folder opens a Google Docs-style text editor for writing and storing documents.'
          : 'Your folders and documents. Click a folder to open the document editor.'
      "
    >
      <template #actions>
        <button class="btn-secondary" type="button" @click="openCreateFolder">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Folder
        </button>
        <button class="btn-secondary" type="button" @click="openCreateFile()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M12 12v6M9 15h6" />
          </svg>
          Add File / Link
        </button>
        <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="openAssignPicker">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m22 2-7 20-4-9-9-4z" />
            <path d="M22 2 11 13" />
          </svg>
          Assign Doc
        </button>
      </template>
    </PageHeader>

    <!-- Tabs -->
    <div class="mb-6 border-b border-border">
      <div class="flex flex-wrap gap-1">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="ui-font -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition"
          :class="
            activeTab === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-text-muted hover:text-text-main'
          "
          @click="activeTab = tab.value"
        >
          {{ tab.label }}
          <span
            v-if="tab.count !== undefined"
            class="ml-1.5 rounded-full bg-soft px-2 py-0.5 text-xs"
          >
            {{ tab.count }}
          </span>
        </button>
      </div>
    </div>

    <!-- Filters (search + filters always available) -->
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input
        v-model="search"
        class="input max-w-sm"
        type="search"
        placeholder="Search..."
      />
      <FormSelect
        v-if="activeTab === 'product-docs'"
        v-model="productDocCategoryFilter"
        :options="categoryOptions"
        class="max-w-[200px]"
      />
      <FormSelect
        v-if="activeTab === 'product-docs'"
        v-model="productDocWebsiteFilter"
        :options="[{ value: '', label: 'All websites' }, ...websiteFilterOptions]"
        class="max-w-[200px]"
      />
      <FormSelect
        v-if="activeTab === 'all-files' || activeTab === 'assigned-to-me' || activeTab === 'files'"
        v-model="typeFilter"
        :options="[{ value: '', label: 'All types' }, ...fileTypeSelectOptions]"
        class="max-w-[180px]"
      />
      <FormSelect
        v-if="auth.isAdmin && activeTab === 'assigned-docs'"
        v-model="statusFilter"
        :options="statusFilterOptions"
        class="max-w-[180px]"
      />
      <FormSelect
        v-if="activeTab !== 'product-docs'"
        v-model="projectFilter"
        :options="[{ value: '', label: 'All projects' }, ...projectFilterOptions]"
        class="max-w-[200px]"
      />
      <FormSelect
        v-if="activeTab !== 'product-docs'"
        v-model="websiteFilter"
        :options="[{ value: '', label: 'All websites' }, ...websiteFilterOptions]"
        class="max-w-[200px]"
      />
    </div>

    <!-- ============ PRODUCT DOCS TAB (shared admin + member) ============ -->
    <LoadingBlock
      v-if="activeTab === 'product-docs'"
      :loading="data.loading.docsFiles"
      :error="data.errors.docsFiles"
      :retry="data.fetchDocsFiles"
    >
      <div v-if="filteredProductDocs.length" class="pd-docs-grid">
        <div
          v-for="f in filteredProductDocs"
          :key="f.id"
          class="pd-doc-card card"
        >
          <!-- Category badge + actions row -->
          <div class="pd-doc-top">
            <span class="pd-doc-category-badge">{{ categoryLabel(f.category) }}</span>
            <div class="pd-doc-top-actions">
              <button
                v-if="auth.isAdmin"
                class="btn-ghost pd-icon-btn"
                type="button"
                title="Edit"
                @click="openEditFile(f)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              </button>
              <button
                v-if="auth.isAdmin"
                class="btn-ghost pd-icon-btn pd-icon-btn--danger"
                type="button"
                title="Delete"
                @click="confirmDeleteFile(f)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
              </button>
            </div>
          </div>

          <!-- Product image -->
          <div v-if="f.productImageUrl" class="pd-doc-img-wrap">
            <img :src="f.productImageUrl" :alt="f.productName || f.title" class="pd-doc-img" @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')" />
          </div>

          <!-- Title + name -->
          <h3 class="pd-doc-title">{{ f.productName || f.title }}</h3>
          <p v-if="f.productName && f.title !== f.productName" class="pd-doc-subtitle">{{ f.title }}</p>
          <p v-if="f.productShortDesc" class="pd-doc-desc">{{ f.productShortDesc }}</p>

          <!-- Meta row -->
          <div class="pd-doc-meta">
            <span v-if="f.productPrice" class="pd-doc-meta-chip pd-doc-meta-chip--price">{{ f.productPrice }}</span>
            <span v-if="f.productSku" class="pd-doc-meta-chip">SKU: {{ f.productSku }}</span>
            <span v-if="websiteName(f.relatedWebsiteId)" class="pd-doc-meta-chip">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              {{ websiteName(f.relatedWebsiteId) }}
            </span>
            <span v-if="linkedPrompt(f)" class="pd-doc-meta-chip pd-doc-meta-chip--prompt">
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Prompt linked
            </span>
          </div>

          <!-- Links row -->
          <div v-if="f.productUrl || f.driveLink || safeOpenUrl(f.url)" class="pd-doc-links">
            <a v-if="f.productUrl" :href="f.productUrl" target="_blank" rel="noopener" class="pd-doc-link">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Product Page
            </a>
            <a v-if="f.driveLink" :href="f.driveLink" target="_blank" rel="noopener" class="pd-doc-link">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 15l5-9 5 9H3z"/><path d="M13 15l4-7 4 7h-8z"/><path d="M7.5 15l4.5 8"/><path d="M16.5 15L12 23"/></svg>
              Google Drive
            </a>
            <a v-if="safeOpenUrl(f.url)" :href="safeOpenUrl(f.url)!" target="_blank" rel="noopener" class="pd-doc-link">Open File</a>
          </div>

          <!-- Action buttons -->
          <div class="pd-doc-actions">
            <button class="btn-secondary pd-doc-action-btn" type="button" @click="openDetail(f)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              Details
            </button>
            <button
              class="btn-secondary pd-doc-action-btn"
              type="button"
              @click="copyToClipboard(buildDetailsText(f), 'details-' + f.id)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              {{ copied === 'details-' + f.id ? 'Copied!' : 'Copy Details' }}
            </button>
            <button
              v-if="linkedPrompt(f)"
              class="btn-secondary pd-doc-action-btn"
              type="button"
              @click="copyToClipboard(linkedPrompt(f)!.templateBody, 'prompt-' + f.id)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              {{ copied === 'prompt-' + f.id ? 'Copied!' : 'Copy Prompt' }}
            </button>
            <button
              class="btn-primary pd-doc-action-btn"
              type="button"
              @click="copyToClipboard(buildCombinedPrompt(f), 'combined-' + f.id)"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              {{ copied === 'combined-' + f.id ? 'Copied!' : 'Copy Prompt + Docs' }}
            </button>
          </div>
        </div>
      </div>

      <EmptyState
        v-else-if="!data.loading.docsFiles"
        title="No product docs yet"
        :description="auth.isAdmin ? 'Add a file and set its category to \'Product Details\' to see it here.' : 'No product docs have been assigned to you yet.'"
      >
        <template v-if="auth.isAdmin" #action>
          <button class="btn-primary" type="button" @click="openCreateFile(undefined, true)">Add Product Doc</button>
        </template>
      </EmptyState>
    </LoadingBlock>

    <!-- ============ ADMIN VIEW ============ -->
    <template v-if="auth.isAdmin && activeTab !== 'product-docs'">
      <!-- All Folders -->
      <LoadingBlock
        v-if="activeTab === 'all-folders'"
        :loading="data.loading.docsFolders"
        :error="data.errors.docsFolders"
        :retry="data.fetchDocsFolders"
      >
        <div
          v-if="adminFilteredFolders.length"
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          <article
            v-for="folder in adminFilteredFolders"
            :key="folder.id"
            role="link"
            tabindex="0"
            class="card card-pad flex min-w-0 cursor-pointer flex-col transition hover:border-primary/40 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            @click="openDocsFolder(folder.id)"
            @keydown.enter.prevent="openDocsFolder(folder.id)"
            @keydown.space.prevent="openDocsFolder(folder.id)"
          >
            <div class="flex items-start gap-3">
              <span
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn"
                :style="{ backgroundColor: tintColor(folder.folderColor), color: folder.folderColor }"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <h3 class="ui-font text-base font-semibold text-text-main truncate">{{ folder.name }}</h3>
                <p class="text-xs text-text-muted">
                  {{ textDocsInFolder(folder.id) }} document{{ textDocsInFolder(folder.id) === 1 ? '' : 's' }}
                  <template v-if="filesInFolder(folder.id).length - textDocsInFolder(folder.id) > 0">
                    · {{ filesInFolder(folder.id).length - textDocsInFolder(folder.id) }} link{{ filesInFolder(folder.id).length - textDocsInFolder(folder.id) === 1 ? '' : 's' }}
                  </template>
                </p>
              </div>
            </div>
            <p v-if="folder.description" class="mt-3 line-clamp-2 text-sm text-text-muted">{{ folder.description }}</p>
            <div class="mt-3 flex flex-wrap gap-1.5 text-xs text-text-muted">
              <span v-if="projectName(folder.relatedProjectId)" class="ui-font rounded-full bg-soft px-2 py-0.5">
                {{ projectName(folder.relatedProjectId) }}
              </span>
              <span v-if="websiteName(folder.relatedWebsiteId)" class="ui-font rounded-full bg-soft px-2 py-0.5">
                {{ websiteName(folder.relatedWebsiteId) }}
              </span>
            </div>
            <div class="mt-auto flex flex-col gap-3 pt-4">
              <span class="text-xs text-text-muted">Updated {{ folder.updatedAt }}</span>
              <div class="flex flex-wrap gap-2">
                <button class="btn-primary h-8 whitespace-nowrap px-3 text-xs" @click.stop="openDocsFolder(folder.id)">
                  Open
                </button>
                <button class="btn-secondary h-8 whitespace-nowrap px-3 text-xs" @click.stop="openAssignFolder(folder)">
                  Assign
                </button>
                <button class="btn-secondary h-8 whitespace-nowrap px-3 text-xs" @click.stop="openEditFolder(folder)">Edit</button>
                <button class="btn-danger h-8 whitespace-nowrap px-3 text-xs" @click.stop="confirmDeleteFolder(folder)">Delete</button>
              </div>
            </div>
          </article>
        </div>
        <EmptyState
          v-else
          title="No folders yet"
          description="Create a folder for each product category (e.g. Mini Excavator, Forklift). Inside each folder you can write and save text documents."
        >
          <template #action>
            <button class="btn-primary" type="button" @click="openCreateFolder">Add Folder</button>
          </template>
        </EmptyState>
      </LoadingBlock>

      <!-- All Files -->
      <LoadingBlock
        v-else-if="activeTab === 'all-files'"
        :loading="data.loading.docsFiles"
        :error="data.errors.docsFiles"
        :retry="data.fetchDocsFiles"
      >
        <div v-if="adminFilteredFiles.length" class="card overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-soft text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th class="ui-font px-6 py-3 font-medium">File</th>
                <th class="ui-font px-6 py-3 font-medium">Type</th>
                <th class="ui-font px-6 py-3 font-medium">Folder</th>
                <th class="ui-font px-6 py-3 font-medium">Linked to</th>
                <th class="ui-font px-6 py-3 font-medium">Sent to</th>
                <th class="ui-font px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="file in adminFilteredFiles" :key="file.id" class="table-row">
                <td class="px-6 py-4">
                  <div class="ui-font font-medium text-text-main">{{ file.title }}</div>
                  <div class="line-clamp-1 text-xs text-text-muted">{{ file.url || 'No URL' }}</div>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="ui-font inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="fileTypeMeta(file.type).swatch"
                  >
                    <span class="flex h-3.5 w-3.5 items-center" v-html="fileTypeMeta(file.type).icon" />
                    {{ fileTypeMeta(file.type).label }}
                  </span>
                </td>
                <td class="px-6 py-4 text-text-muted">{{ docsFolderName(file.folderId) }}</td>
                <td class="px-6 py-4 text-text-muted">
                  <div v-if="projectName(file.relatedProjectId)">{{ projectName(file.relatedProjectId) }}</div>
                  <div v-if="websiteName(file.relatedWebsiteId)" class="text-xs">{{ websiteName(file.relatedWebsiteId) }}</div>
                  <span v-if="!file.relatedProjectId && !file.relatedWebsiteId">—</span>
                </td>
                <td class="px-6 py-4 text-text-muted">
                  {{ accessSummary(file.id) }}
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-end gap-1">
                    <a
                      v-if="safeOpenUrl(file.url)"
                      :href="safeOpenUrl(file.url)!"
                      target="_blank"
                      rel="noopener"
                      class="btn-secondary h-8 px-3 text-xs"
                    >Open</a>
                    <button class="btn-secondary h-8 px-3 text-xs" @click="openAssignFile(file)">Assign</button>
                    <button class="btn-secondary h-8 px-3 text-xs" @click="openEditFile(file)">Edit</button>
                    <button class="btn-danger h-8 px-3 text-xs" @click="confirmDeleteFile(file)">Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          title="No files yet"
          description="Add a Google Doc, Sheet, Drive folder, PDF, or any reference link."
        >
          <template #action>
            <button class="btn-primary" type="button" @click="openCreateFile()">Add File / Link</button>
          </template>
        </EmptyState>
      </LoadingBlock>

      <!-- Assigned Docs -->
      <LoadingBlock
        v-else-if="activeTab === 'assigned-docs'"
        :loading="data.loading.docsAssignments"
        :error="data.errors.docsAssignments"
        :retry="data.fetchDocsAssignments"
      >
        <div v-if="adminFilteredAssignments.length" class="card overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-soft text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th class="ui-font px-6 py-3 font-medium">Item</th>
                <th class="ui-font px-6 py-3 font-medium">Sent to</th>
                <th class="ui-font px-6 py-3 font-medium">Project / Website</th>
                <th class="ui-font px-6 py-3 font-medium">Priority</th>
                <th class="ui-font px-6 py-3 font-medium">Due</th>
                <th class="ui-font px-6 py-3 font-medium">Status</th>
                <th class="ui-font px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="a in adminFilteredAssignments" :key="a.id" class="table-row">
                <td class="px-6 py-4">
                  <div class="ui-font font-medium text-text-main">{{ assignmentTargetTitle(a) }}</div>
                  <div class="text-xs text-text-muted">{{ assignmentTargetSub(a) }}</div>
                </td>
                <td class="px-6 py-4 text-text-main">{{ memberName(a.assignedTo) }}</td>
                <td class="px-6 py-4 text-text-muted">
                  <div v-if="projectName(a.relatedProjectId)">{{ projectName(a.relatedProjectId) }}</div>
                  <div v-if="websiteName(a.relatedWebsiteId)" class="text-xs">{{ websiteName(a.relatedWebsiteId) }}</div>
                  <span v-if="!a.relatedProjectId && !a.relatedWebsiteId">—</span>
                </td>
                <td class="px-6 py-4">
                  <span
                    class="ui-font rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="docsPriorityMeta(a.priority).classes"
                  >
                    {{ docsPriorityMeta(a.priority).label }}
                  </span>
                </td>
                <td class="px-6 py-4 text-text-muted">{{ a.dueDate || '—' }}</td>
                <td class="px-6 py-4">
                  <span
                    class="ui-font rounded-full px-2.5 py-1 text-xs font-medium"
                    :class="docsStatusMeta(a.status).classes"
                  >
                    {{ docsStatusMeta(a.status).label }}
                  </span>
                </td>
                <td class="px-6 py-4">
                  <div class="flex justify-end gap-1">
                    <button class="btn-danger h-8 px-3 text-xs" @click="confirmDeleteAssignment(a)">
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          title="No assignments yet"
          description="Pick a folder or file and click Assign to send it to a team member."
        >
          <template #action>
            <button class="btn-primary" type="button" @click="openAssignPicker">Assign Doc</button>
          </template>
        </EmptyState>
      </LoadingBlock>

      <!-- Recently Added -->
      <LoadingBlock
        v-else-if="activeTab === 'recently-added'"
        :loading="data.loading.docsFiles || data.loading.docsFolders"
        :error="data.errors.docsFiles || data.errors.docsFolders"
        :retry="data.fetchDocsFolders"
      >
        <div v-if="recentlyAdded.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="entry in recentlyAdded"
            :key="entry.kind + entry.id"
            class="card card-pad"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="ui-font text-xs font-medium uppercase tracking-wide text-text-muted">
                  {{ entry.kind === 'folder' ? 'Folder' : fileTypeMeta(entry.fileType!).label }}
                </div>
                <h3 class="mt-1 ui-font text-base font-semibold text-text-main">{{ entry.title }}</h3>
                <p v-if="entry.subtitle" class="mt-1 line-clamp-2 text-xs text-text-muted">
                  {{ entry.subtitle }}
                </p>
              </div>
              <span class="text-xs text-text-muted whitespace-nowrap">{{ entry.timestamp }}</span>
            </div>
          </article>
        </div>
        <EmptyState
          v-else
          title="Nothing added recently"
          description="Add a folder or file to see it here."
        />
      </LoadingBlock>
    </template>

    <!-- ============ MEMBER VIEW ============ -->
    <template v-else-if="activeTab !== 'product-docs'">
      <!-- Assigned to Me -->
      <LoadingBlock
        v-if="activeTab === 'assigned-to-me'"
        :loading="data.loading.docsAssignments"
        :error="data.errors.docsAssignments"
        :retry="data.fetchDocsAssignments"
      >
        <div v-if="memberFilteredAssignments.length" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="a in memberFilteredAssignments" :key="a.id" class="card card-pad flex flex-col">
            <div class="flex items-start gap-3">
              <span
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn"
                :class="a.assignmentType === 'folder' ? 'bg-soft text-primary' : fileTypeMeta(fileFor(a)?.type ?? 'other').swatch"
              >
                <span v-if="a.assignmentType === 'folder'" v-html="folderIconSvg" />
                <span v-else v-html="fileTypeMeta(fileFor(a)?.type ?? 'other').icon" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="ui-font text-xs font-medium uppercase tracking-wide text-text-muted">
                  {{ a.assignmentType === 'folder' ? 'Folder' : fileTypeMeta(fileFor(a)?.type ?? 'other').label }}
                </div>
                <h3 class="ui-font text-base font-semibold text-text-main">
                  {{ assignmentTargetTitle(a) }}
                </h3>
                <p v-if="docsFolderName(folderIdFor(a))" class="text-xs text-text-muted">
                  in {{ docsFolderName(folderIdFor(a)) }}
                </p>
              </div>
              <span
                class="ui-font rounded-full px-2.5 py-1 text-xs font-medium"
                :class="docsStatusMeta(a.status).classes"
              >
                {{ docsStatusMeta(a.status).label }}
              </span>
            </div>

            <div class="mt-3 flex flex-wrap gap-1.5">
              <span
                v-if="projectName(a.relatedProjectId)"
                class="ui-font rounded-full bg-soft px-2 py-0.5 text-xs text-text-muted"
              >
                {{ projectName(a.relatedProjectId) }}
              </span>
              <span
                v-if="websiteName(a.relatedWebsiteId)"
                class="ui-font rounded-full bg-soft px-2 py-0.5 text-xs text-text-muted"
              >
                {{ websiteName(a.relatedWebsiteId) }}
              </span>
              <span
                class="ui-font rounded-full px-2 py-0.5 text-xs font-medium"
                :class="docsPriorityMeta(a.priority).classes"
              >
                {{ docsPriorityMeta(a.priority).label }}
              </span>
              <span v-if="a.dueDate" class="text-xs text-text-muted">Due {{ a.dueDate }}</span>
            </div>

            <p
              v-if="a.message"
              class="mt-3 whitespace-pre-line rounded-btn bg-soft px-3 py-2 text-sm text-text-main"
            >
              <span class="ui-font block text-xs font-medium text-text-muted">From admin</span>
              {{ a.message }}
            </p>

            <div class="mt-auto flex flex-wrap gap-2 pt-4">
              <a
                v-if="openUrlForAssignment(a)"
                :href="openUrlForAssignment(a)!"
                target="_blank"
                rel="noopener"
                class="btn-primary"
                @click="autoMarkViewed(a)"
              >Open Link</a>
              <button
                v-if="a.status !== 'viewed' && a.status !== 'used'"
                class="btn-secondary"
                type="button"
                @click="markStatus(a, 'viewed')"
              >Mark Viewed</button>
              <button
                v-if="a.status !== 'used'"
                class="btn-secondary"
                type="button"
                @click="markStatus(a, 'used')"
              >Mark Used</button>
              <button
                v-if="a.status !== 'archived'"
                class="btn-ghost"
                type="button"
                @click="markStatus(a, 'archived')"
              >Archive</button>
            </div>
          </article>
        </div>
        <EmptyState
          v-else
          title="No docs assigned yet"
          description="No docs assigned yet. Your admin will send project files, Google Docs, or folders here."
        />
      </LoadingBlock>

      <!-- Folders -->
      <LoadingBlock
        v-else-if="activeTab === 'folders'"
        :loading="data.loading.docsFolders"
        :error="data.errors.docsFolders"
        :retry="data.fetchDocsFolders"
      >
        <div v-if="memberFilteredFolders.length" class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="folder in memberFilteredFolders"
            :key="folder.id"
            role="link"
            tabindex="0"
            class="card card-pad flex min-w-0 cursor-pointer flex-col transition hover:border-primary/40 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            @click="openDocsFolder(folder.id)"
            @keydown.enter.prevent="openDocsFolder(folder.id)"
            @keydown.space.prevent="openDocsFolder(folder.id)"
          >
            <div class="flex items-start gap-3">
              <span
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn"
                :style="{ backgroundColor: tintColor(folder.folderColor), color: folder.folderColor }"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <div class="min-w-0 flex-1">
                <h3 class="ui-font text-base font-semibold text-text-main truncate">{{ folder.name }}</h3>
                <p class="text-xs text-text-muted">
                  {{ textDocsInFolder(folder.id) }} document{{ textDocsInFolder(folder.id) === 1 ? '' : 's' }}
                </p>
              </div>
            </div>
            <p v-if="folder.description" class="mt-3 text-sm text-text-muted">{{ folder.description }}</p>
            <div class="mt-3 flex flex-wrap gap-1.5 text-xs text-text-muted">
              <span v-if="isOwnDocsFolder(folder)" class="ui-font rounded-full bg-soft px-2 py-0.5 text-primary">
                Your folder
              </span>
              <span v-else-if="isDocsFolderAssignedToMe(folder)" class="ui-font rounded-full bg-soft px-2 py-0.5 text-primary">
                Assigned
              </span>
              <span v-if="projectName(folder.relatedProjectId)" class="ui-font rounded-full bg-soft px-2 py-0.5">
                {{ projectName(folder.relatedProjectId) }}
              </span>
              <span v-if="websiteName(folder.relatedWebsiteId)" class="ui-font rounded-full bg-soft px-2 py-0.5">
                {{ websiteName(folder.relatedWebsiteId) }}
              </span>
            </div>
            <div class="mt-auto flex flex-col gap-3 pt-4">
              <span class="text-xs text-text-muted">Updated {{ folder.updatedAt }}</span>
              <div class="flex flex-wrap gap-2">
                <button class="btn-primary h-8 whitespace-nowrap px-3 text-xs" @click.stop="openDocsFolder(folder.id)">
                  Open
                </button>
                <button v-if="isOwnDocsFolder(folder)" class="btn-secondary h-8 whitespace-nowrap px-3 text-xs" @click.stop="openEditFolder(folder)">Edit</button>
                <button v-if="isOwnDocsFolder(folder)" class="btn-danger h-8 whitespace-nowrap px-3 text-xs" @click.stop="confirmDeleteFolder(folder)">Delete</button>
              </div>
            </div>
          </article>
        </div>
        <EmptyState
          v-else
          title="No folders yet"
          description="Create your own folders here, or wait for your admin to share project folders with you."
        >
          <template #action>
            <button class="btn-primary" type="button" @click="openCreateFolder">Add Folder</button>
          </template>
        </EmptyState>
      </LoadingBlock>

      <!-- Files -->
      <LoadingBlock
        v-else-if="activeTab === 'files'"
        :loading="data.loading.docsFiles"
        :error="data.errors.docsFiles"
        :retry="data.fetchDocsFiles"
      >
        <div v-if="memberAccessibleFiles.length" class="card overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-soft text-left text-xs uppercase tracking-wide text-text-muted">
              <tr>
                <th class="ui-font px-6 py-3 font-medium">File</th>
                <th class="ui-font px-6 py-3 font-medium">Type</th>
                <th class="ui-font px-6 py-3 font-medium">Folder</th>
                <th class="ui-font px-6 py-3 font-medium">Linked to</th>
                <th class="ui-font px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="file in memberAccessibleFiles" :key="file.id" class="table-row">
                <td class="px-6 py-4 ui-font font-medium text-text-main">{{ file.title }}</td>
                <td class="px-6 py-4">
                  <span class="ui-font inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" :class="fileTypeMeta(file.type).swatch">
                    {{ fileTypeMeta(file.type).label }}
                  </span>
                </td>
                <td class="px-6 py-4 text-text-muted">{{ docsFolderName(file.folderId) }}</td>
                <td class="px-6 py-4 text-text-muted">
                  <span v-if="projectName(file.relatedProjectId)">{{ projectName(file.relatedProjectId) }}</span>
                  <span v-else-if="websiteName(file.relatedWebsiteId)">{{ websiteName(file.relatedWebsiteId) }}</span>
                  <span v-else>—</span>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-1">
                    <a
                      v-if="safeOpenUrl(file.url)"
                      :href="safeOpenUrl(file.url)!"
                      target="_blank"
                      rel="noopener"
                      class="btn-secondary h-8 px-3 text-xs"
                    >Open</a>
                    <button
                      v-if="isOwnDocsFile(file)"
                      class="btn-secondary h-8 px-3 text-xs"
                      type="button"
                      @click="openEditFile(file)"
                    >Edit</button>
                    <button
                      v-if="isOwnDocsFile(file)"
                      class="btn-danger h-8 px-3 text-xs"
                      type="button"
                      @click="confirmDeleteFile(file)"
                    >Delete</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <EmptyState
          v-else
          title="No files yet"
          description="Add your own file or link, or wait for your admin to send you project docs."
        >
          <template #action>
            <button class="btn-primary" type="button" @click="openCreateFile()">Add File / Link</button>
          </template>
        </EmptyState>
      </LoadingBlock>

      <!-- Recently Viewed -->
      <LoadingBlock
        v-else-if="activeTab === 'recently-viewed'"
        :loading="data.loading.docsAssignments"
        :error="data.errors.docsAssignments"
        :retry="data.fetchDocsAssignments"
      >
        <div v-if="recentlyViewedAssignments.length" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article v-for="a in recentlyViewedAssignments" :key="a.id" class="card card-pad">
            <div class="flex items-start gap-3">
              <span
                class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-btn"
                :class="a.assignmentType === 'folder' ? 'bg-soft text-primary' : fileTypeMeta(fileFor(a)?.type ?? 'other').swatch"
              >
                <span v-if="a.assignmentType === 'folder'" v-html="folderIconSvg" />
                <span v-else v-html="fileTypeMeta(fileFor(a)?.type ?? 'other').icon" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="ui-font text-xs uppercase tracking-wide text-text-muted">
                  {{ a.assignmentType === 'folder' ? 'Folder' : fileTypeMeta(fileFor(a)?.type ?? 'other').label }}
                </div>
                <div class="ui-font font-medium text-text-main">{{ assignmentTargetTitle(a) }}</div>
                <div class="text-xs text-text-muted">{{ docsStatusMeta(a.status).label }} · {{ a.updatedAt }}</div>
              </div>
            </div>
            <a
              v-if="openUrlForAssignment(a)"
              :href="openUrlForAssignment(a)!"
              target="_blank"
              rel="noopener"
              class="btn-secondary mt-3 inline-flex w-full justify-center"
              @click="autoMarkViewed(a)"
            >Open again</a>
          </article>
        </div>
        <EmptyState
          v-else
          title="Nothing here yet"
          description="Files you open or mark as Used will appear here."
        />
      </LoadingBlock>
    </template>

    <!-- ============== Folder Modal ============== -->
    <Modal
      :open="folderModalOpen"
      :title="folderForm.id ? 'Edit folder' : 'New folder'"
      size="md"
      @close="folderModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="saveFolder">
        <FormInput v-model="folderForm.name" label="Folder name" placeholder="Website Requirements" />
        <FormTextarea v-model="folderForm.description" label="Description" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            v-model="folderForm.relatedProjectIdValue"
            label="Related project (optional)"
            placeholder="None"
            :options="projectOptions"
          />
          <FormSelect
            v-model="folderForm.relatedWebsiteIdValue"
            label="Related website (optional)"
            placeholder="None"
            :options="websiteOptions"
          />
        </div>
        <ColorField v-model="folderForm.folderColor" label="Folder color (optional)" />
      </form>
      <div v-if="data.errors.docsFolders" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.docsFolders }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="folderModalOpen = false">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="saveFolder">
          {{ saving ? 'Saving...' : 'Save Folder' }}
        </button>
      </template>
    </Modal>

    <!-- ============== File Modal ============== -->
    <Modal
      :open="fileModalOpen"
      :title="fileForm.id ? 'Edit file / link' : 'New file / link'"
      subtitle="Save a Google Doc, Sheet, Drive folder, PDF, or any reference link."
      size="lg"
      @close="fileModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="saveFile">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormInput v-model="fileForm.title" label="Title" placeholder="Homepage Brief" />
          <FormSelect
            v-model="fileForm.category"
            label="Category"
            :options="categoryOptions.filter(o => o.value !== '')"
          />
        </div>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            v-model="fileForm.type"
            label="File type"
            :options="fileTypeSelectOptions"
          />
          <FormSelect
            v-model="fileForm.folderIdValue"
            label="Folder"
            placeholder="No folder"
            :options="folderOptions"
          />
        </div>
        <FormInput
          v-model="fileForm.url"
          label="URL"
          placeholder="https://docs.google.com/..."
          :helper="urlHelperText"
        />
        <FormTextarea v-model="fileForm.description" label="Description (optional)" :rows="2" />

        <!-- Product detail fields (shown when category is product_details) -->
        <template v-if="fileForm.category === 'product_details'">
          <div class="pd-product-section-header">Product Details</div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormInput v-model="fileForm.productName" label="Product name" placeholder="Mini Excavator 1.5T" />
            <FormInput v-model="fileForm.productUrl" label="Product page URL" placeholder="https://..." />
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormInput v-model="fileForm.productImageUrl" label="Image URL" placeholder="https://..." />
            <FormInput v-model="fileForm.productPrice" label="Price (optional)" placeholder="$24,900" />
            <FormInput v-model="fileForm.productSku" label="SKU (optional)" placeholder="EX-15T-2024" />
          </div>
          <FormTextarea v-model="fileForm.productShortDesc" label="Short description" :rows="2" placeholder="One-sentence summary for badges and cards." />
          <FormTextarea v-model="fileForm.productLongDesc" label="Full description" :rows="4" placeholder="Full marketing description." />
          <FormTextarea v-model="fileForm.productFeatures" label="Features (one per line)" :rows="4" placeholder="Compact design for tight spaces&#10;360° rotation&#10;Fast dig cycle" />
          <FormTextarea v-model="fileForm.productSpecs" label="Specifications (one per line, key: value)" :rows="4" placeholder="Operating Weight: 1,500 kg&#10;Bucket Capacity: 0.045 m³&#10;Engine: 13.5 kW" />
          <FormInput v-model="fileForm.driveLink" label="Google Drive folder link (optional)" placeholder="https://drive.google.com/..." />
          <FormTextarea v-model="fileForm.productNotes" label="Internal notes (optional)" :rows="2" />
        </template>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            v-model="fileForm.relatedProjectIdValue"
            label="Related project (optional)"
            placeholder="None"
            :options="projectOptions"
          />
          <FormSelect
            v-model="fileForm.relatedWebsiteIdValue"
            label="Related website (optional)"
            placeholder="None"
            :options="websiteOptions"
          />
        </div>
        <FormSelect
          v-if="fileForm.category === 'product_details'"
          v-model="fileForm.linkedPromptIdValue"
          label="Link to prompt template (optional)"
          placeholder="None"
          :options="[{ value: '', label: 'None' }, ...pw.templates.filter(t => t.status === 'approved').map(t => ({ value: t.id, label: t.title }))]"
        />
      </form>
      <div v-if="data.errors.docsFiles" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.docsFiles }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="fileModalOpen = false">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="saveFile">
          {{ saving ? 'Saving...' : 'Save File' }}
        </button>
      </template>
    </Modal>

    <!-- ============== Product Doc Detail Modal ============== -->
    <Modal
      :open="detailModalOpen"
      :title="detailFile?.productName || detailFile?.title || 'Product Doc'"
      size="xl"
      @close="detailModalOpen = false"
    >
      <template v-if="detailFile">
        <div class="pd-detail-grid">
          <!-- Left: image + links -->
          <div class="pd-detail-left">
            <img
              v-if="detailFile.productImageUrl"
              :src="detailFile.productImageUrl"
              :alt="detailFile.productName"
              class="pd-detail-img"
              @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
            />
            <div class="pd-detail-links">
              <a v-if="detailFile.productUrl" :href="detailFile.productUrl" target="_blank" rel="noopener" class="btn-secondary w-full justify-center text-xs">
                Product Page
              </a>
              <a v-if="detailFile.driveLink" :href="detailFile.driveLink" target="_blank" rel="noopener" class="btn-secondary w-full justify-center text-xs">
                Google Drive
              </a>
            </div>
          </div>

          <!-- Right: fields -->
          <div class="pd-detail-right">
            <div v-if="detailFile.productPrice || detailFile.productSku" class="pd-detail-chips">
              <span v-if="detailFile.productPrice" class="pd-doc-meta-chip pd-doc-meta-chip--price">{{ detailFile.productPrice }}</span>
              <span v-if="detailFile.productSku" class="pd-doc-meta-chip">SKU: {{ detailFile.productSku }}</span>
            </div>
            <p v-if="detailFile.productShortDesc" class="pd-detail-short-desc">{{ detailFile.productShortDesc }}</p>
            <p v-if="detailFile.productLongDesc" class="pd-detail-long-desc">{{ detailFile.productLongDesc }}</p>

            <div v-if="detailFile.productFeatures" class="pd-detail-section">
              <div class="pd-detail-section-label">Features</div>
              <ul class="pd-detail-list">
                <li v-for="(feat, i) in detailFile.productFeatures.split('\n').filter(Boolean)" :key="i">{{ feat }}</li>
              </ul>
            </div>
            <div v-if="detailFile.productSpecs" class="pd-detail-section">
              <div class="pd-detail-section-label">Specifications</div>
              <div class="pd-detail-specs">
                <div v-for="(spec, i) in detailFile.productSpecs.split('\n').filter(Boolean)" :key="i" class="pd-detail-spec-row">
                  <span class="pd-detail-spec-key">{{ spec.split(':')[0]?.trim() }}</span>
                  <span class="pd-detail-spec-val">{{ spec.split(':').slice(1).join(':').trim() }}</span>
                </div>
              </div>
            </div>
            <div v-if="detailFile.productNotes" class="pd-detail-section">
              <div class="pd-detail-section-label">Notes</div>
              <p class="pd-detail-notes">{{ detailFile.productNotes }}</p>
            </div>
            <div v-if="linkedPrompt(detailFile)" class="pd-detail-section pd-detail-prompt-info">
              <div class="pd-detail-section-label">Linked Prompt</div>
              <div class="pd-detail-prompt-name">{{ linkedPrompt(detailFile)!.title }}</div>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <button class="btn-ghost" type="button" @click="detailModalOpen = false">Close</button>
        <button
          v-if="detailFile"
          class="btn-secondary"
          type="button"
          @click="copyToClipboard(buildDetailsText(detailFile), 'modal-details')"
        >
          {{ copied === 'modal-details' ? 'Copied!' : 'Copy Details' }}
        </button>
        <button
          v-if="detailFile && linkedPrompt(detailFile)"
          class="btn-secondary"
          type="button"
          @click="copyToClipboard(linkedPrompt(detailFile)!.templateBody, 'modal-prompt')"
        >
          {{ copied === 'modal-prompt' ? 'Copied!' : 'Copy Prompt' }}
        </button>
        <button
          v-if="detailFile"
          class="btn-primary"
          type="button"
          @click="copyToClipboard(buildCombinedPrompt(detailFile), 'modal-combined')"
        >
          {{ copied === 'modal-combined' ? 'Copied!' : 'Copy Prompt + Docs' }}
        </button>
      </template>
    </Modal>

    <!-- ============== Assign Modal ============== -->
    <Modal
      :open="assignModalOpen"
      title="Assign to Team"
      subtitle="Send this folder or document to selected members."
      size="xl"
      @close="assignModalOpen = false"
    >
      <div class="assign-docs-flow">
        <section class="assign-selected-card">
          <div class="assign-selected-icon" :class="assignForm.type === 'folder' ? 'assign-selected-icon--folder' : 'assign-selected-icon--file'">
            <span v-if="assignForm.type === 'folder'" v-html="folderIconSvg" />
            <span v-else v-html="assignTargetFileIcon" />
          </div>
          <div class="assign-selected-main">
            <div class="assign-kicker">{{ assignTargetTypeLabel }}</div>
            <h3>{{ assignTargetLabel || 'Choose a folder or document' }}</h3>
            <p>{{ assignTargetSubLabel }}</p>
          </div>
          <button v-if="assignForm.targetId" class="assign-link-btn" type="button" @click="resetAssignTarget">
            Change selection
          </button>
        </section>

        <div v-if="assignForm.targetId === ''" class="assign-picker-grid">
          <FormSelect
            v-model="assignForm.type"
            label="What are you sending?"
            :options="[
              { value: 'folder', label: 'A whole folder' },
              { value: 'file', label: 'A single file or link' }
            ]"
          />
          <FormSelect
            v-model="assignForm.targetId"
            :label="assignForm.type === 'folder' ? 'Pick folder' : 'Pick file'"
            placeholder="Choose..."
            :options="assignForm.type === 'folder' ? folderOptions : fileOptions"
          />
        </div>

        <section class="assign-section">
          <div class="assign-section-head">
            <div>
              <h3>Send to members</h3>
              <p>Pick one or more active team members.</p>
            </div>
            <div class="assign-member-actions">
              <button class="btn-secondary assign-small-btn" type="button" @click="selectAllAssignMembers">
                Select All
              </button>
              <button class="btn-ghost assign-small-btn" type="button" @click="clearAssignMembers">
                Clear
              </button>
            </div>
          </div>

          <input
            v-model="assignMemberSearch"
            class="input assign-member-search"
            type="search"
            placeholder="Search members..."
          />

          <div v-if="filteredAssignMembers.length" class="assign-member-grid">
            <button
              v-for="m in filteredAssignMembers"
              :key="m.id"
              type="button"
              class="assign-member-card"
              :class="{ 'assign-member-card--selected': assignForm.memberIds.includes(m.id) }"
              @click="toggleAssignMember(m.id)"
            >
              <span class="assign-member-avatar">
                <img v-if="m.avatarUrl" :src="m.avatarUrl" :alt="`${m.fullName || m.email} avatar`" class="cursor-pointer transition hover:scale-110" @click.prevent.stop="openPhotoPreview(m)" />
                <span v-else>{{ initials(m.fullName || m.email) }}</span>
              </span>
              <span class="assign-member-copy">
                <strong>{{ m.fullName || m.email }}</strong>
                <span v-if="m.fullName">{{ m.email }}</span>
              </span>
            </button>
          </div>
          <p v-else class="assign-empty-note">
            {{ activeMembers.length ? 'No members match your search.' : 'No active members yet.' }}
          </p>
        </section>

        <FormTextarea
          v-model="assignForm.message"
          label="Message (optional)"
          placeholder="Add instructions for the team..."
          :rows="3"
        />

        <section class="assign-details-grid">
          <FormSelect
            v-model="assignForm.priority"
            label="Priority"
            :options="priorityOptions"
          />
          <FormInput v-model="assignForm.dueDate" label="Due date" type="date" />
          <FormSelect
            v-model="assignForm.relatedProjectIdValue"
            label="Project"
            placeholder="None"
            :options="projectOptions"
          />
        </section>

        <div class="assign-website-row">
          <FormSelect
            v-model="assignForm.relatedWebsiteIdValue"
            label="Website (optional)"
            placeholder="None"
            :options="websiteOptions"
          />
        </div>

        <div v-if="assignTargetIsGoogleDrive" class="assign-warning-card">
          <div class="assign-warning-icon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
              <path d="M12 9v4M12 17h.01" />
            </svg>
          </div>
          <p>Make sure this Google Drive file is shared with selected members, or they may not be able to open it.</p>
        </div>
      </div>
      <div v-if="data.errors.docsAssignments" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.docsAssignments }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="assignModalOpen = false">Cancel</button>
        <button
          class="btn-primary"
          type="button"
          :disabled="saving || !assignForm.targetId || !assignForm.memberIds.length"
          @click="saveAssignment"
        >
          {{ saving ? 'Sending...' : `Send to ${assignForm.memberIds.length || 0} member${assignForm.memberIds.length === 1 ? '' : 's'}` }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Modal from '@/components/ui/Modal.vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import ColorField from '@/components/ui/ColorField.vue';
import {
  fileTypeMeta,
  fileTypeSelectOptions,
  safeOpenUrl,
  docsStatusMeta,
  docsPriorityMeta,
  isGoogleDriveType,
  priorityOptions,
  statusFilterOptions
} from '@/components/docs/docMeta';
import { useAuthStore } from '@/stores/auth';
import {
  useDataStore,
  type DocsAssignment,
  type DocsAssignmentPriority,
  type DocsAssignmentType,
  type DocsFile,
  type DocsFileCategory,
  type DocsFileType,
  type DocsFolder
} from '@/stores/data';
import { usePromptWorkflowStore } from '@/stores/promptWorkflow';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['docs_folders', 'docs_files', 'docs_assignments']);

const auth = useAuthStore();
const data = useDataStore();
const pw = usePromptWorkflowStore();
const router = useRouter();
import { useImagePreviewStore } from '@/stores/imagePreview';
const previewStore = useImagePreviewStore();

const openPhotoPreview = (member: any) => {
  if (member?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName,
      email: member.email,
      role: member.role
    });
  }
};

const folderIconSvg =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';

const openDocsFolder = (folderId: string) => {
  router.push(`/docs/folders/${folderId}`);
};

// =====================
// Tabs
// =====================
const adminTabs = [
  { value: 'product-docs', label: 'Product Docs' },
  { value: 'all-folders', label: 'All Folders' },
  { value: 'all-files', label: 'All Files' },
  { value: 'assigned-docs', label: 'Assigned Docs' },
  { value: 'recently-added', label: 'Recently Added' }
] as const;

const memberTabs = [
  { value: 'product-docs', label: 'Product Docs' },
  { value: 'assigned-to-me', label: 'Assigned to Me' },
  { value: 'folders', label: 'Folders' },
  { value: 'files', label: 'Files' },
  { value: 'recently-viewed', label: 'Recently Viewed' }
] as const;

type TabValue =
  | (typeof adminTabs)[number]['value']
  | (typeof memberTabs)[number]['value'];

const activeTab = ref<TabValue>('product-docs');

const tabs = computed(() => {
  const productDocCount = data.docsFiles.filter((f) => f.category === 'product_details').length;
  if (auth.isAdmin) {
    return adminTabs.map((t) => ({
      ...t,
      count:
        t.value === 'product-docs'
          ? productDocCount
          : t.value === 'all-folders'
            ? data.docsFolders.length
            : t.value === 'all-files'
              ? data.docsFiles.length
              : t.value === 'assigned-docs'
                ? data.docsAssignments.length
                : undefined
    }));
  }
  const myAssignments = data.docsAssignments.filter((a) => a.assignedTo === auth.user?.id);
  return memberTabs.map((t) => ({
    ...t,
    count:
      t.value === 'product-docs'
        ? productDocCount
        : t.value === 'assigned-to-me'
          ? myAssignments.length
          : t.value === 'folders'
            ? memberFolderIds.value.size
            : t.value === 'files'
              ? memberAccessibleFiles.value.length
              : undefined
  }));
});

// =====================
// Filters
// =====================
const search = ref('');
const typeFilter = ref<DocsFileType | ''>('');
const statusFilter = ref('');
const projectFilter = ref('');
const websiteFilter = ref('');

const projectFilterOptions = computed(() =>
  data.projects.map((p) => ({ value: p.id, label: p.name }))
);
const websiteFilterOptions = computed(() =>
  data.websites.map((w) => ({ value: w.id, label: w.name }))
);

// =====================
// Lookups
// =====================
const projectName = (id: string | null) => (id ? data.projectById(id)?.name ?? '' : '');
const websiteName = (id: string | null) => (id ? data.websiteById(id)?.name ?? '' : '');
const memberName = (id: string) => data.memberById(id)?.fullName || data.memberById(id)?.email || '—';
const docsFolderName = (id: string | null | undefined) =>
  id ? data.docsFolders.find((f) => f.id === id)?.name ?? '' : '';
const isOwnDocsFolder = (folder: DocsFolder) => !!auth.user?.id && folder.createdBy === auth.user.id;
const isOwnDocsFile = (file: DocsFile) => !!auth.user?.id && file.createdBy === auth.user.id;
const isDocsFolderAssignedToMe = (folder: DocsFolder) =>
  myAssignments.value.some(
    (assignment) => assignment.assignmentType === 'folder' && assignment.folderId === folder.id
  );
const canUseDocsFolder = (folder: DocsFolder) =>
  auth.isAdmin || isOwnDocsFolder(folder) || isDocsFolderAssignedToMe(folder);

const fileById = (id: string | null) =>
  id ? data.docsFiles.find((f) => f.id === id) : undefined;
const folderByIdLocal = (id: string | null) =>
  id ? data.docsFolders.find((f) => f.id === id) : undefined;

const fileFor = (a: DocsAssignment) =>
  a.assignmentType === 'file' ? fileById(a.fileId) : undefined;
const folderIdFor = (a: DocsAssignment): string | null => {
  if (a.assignmentType === 'folder') return a.folderId;
  return fileFor(a)?.folderId ?? null;
};

const assignmentTargetTitle = (a: DocsAssignment) => {
  if (a.assignmentType === 'folder') {
    return folderByIdLocal(a.folderId)?.name ?? '(folder removed)';
  }
  return fileFor(a)?.title ?? '(file removed)';
};
const assignmentTargetSub = (a: DocsAssignment) => {
  if (a.assignmentType === 'folder') {
    return `${data.docsFiles.filter((f) => f.folderId === a.folderId).length} files`;
  }
  const f = fileFor(a);
  return f ? fileTypeMeta(f.type).label : '';
};

const openUrlForAssignment = (a: DocsAssignment): string | null => {
  if (a.assignmentType === 'file') {
    const file = fileFor(a);
    return file ? safeOpenUrl(file.url) : null;
  }
  // For folder assignments without a single URL, just use the first file's URL.
  const firstFile = data.docsFiles.find((f) => f.folderId === a.folderId);
  return firstFile ? safeOpenUrl(firstFile.url) : null;
};

const filesInFolder = (folderId: string) =>
  data.docsFiles.filter((f) => f.folderId === folderId);

const textDocsInFolder = (folderId: string) =>
  data.docsFiles.filter((f) => f.folderId === folderId && f.type === 'text_doc').length;

const assignmentsForFolder = (folderId: string) =>
  data.docsAssignments.filter(
    (a) => a.folderId === folderId || filesInFolder(folderId).some((f) => f.id === a.fileId)
  );

const accessSummary = (fileId: string) => {
  const direct = data.docsAssignments.filter((a) => a.fileId === fileId);
  const file = fileById(fileId);
  const viaFolder = file?.folderId
    ? data.docsAssignments.filter((a) => a.folderId === file.folderId)
    : [];
  const all = [...direct, ...viaFolder];
  if (!all.length) return 'Not assigned';
  const names = Array.from(new Set(all.map((a) => memberName(a.assignedTo))));
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
};

// =====================
// Color helpers
// =====================
const tintColor = (hex: string) => {
  // Lightweight tint by injecting alpha; falls back to #f8fbff.
  if (!hex) return '#f8fbff';
  const m = hex.replace('#', '');
  if (m.length !== 6) return '#f8fbff';
  return `${hex}1a`; // ~10% alpha
};

// =====================
// Admin filtered collections
// =====================
const matchesSearch = (haystack: string[]) => {
  const q = search.value.toLowerCase().trim();
  if (!q) return true;
  return haystack.some((s) => (s ?? '').toLowerCase().includes(q));
};

const adminFilteredFolders = computed(() =>
  data.docsFolders.filter((f) => {
    if (!matchesSearch([f.name, f.description])) return false;
    if (projectFilter.value && f.relatedProjectId !== projectFilter.value) return false;
    if (websiteFilter.value && f.relatedWebsiteId !== websiteFilter.value) return false;
    return true;
  })
);

const adminFilteredFiles = computed(() =>
  data.docsFiles.filter((f) => {
    if (!matchesSearch([f.title, f.description, f.url])) return false;
    if (typeFilter.value && f.type !== typeFilter.value) return false;
    if (projectFilter.value && f.relatedProjectId !== projectFilter.value) return false;
    if (websiteFilter.value && f.relatedWebsiteId !== websiteFilter.value) return false;
    return true;
  })
);

const adminFilteredAssignments = computed(() =>
  data.docsAssignments.filter((a) => {
    const targetTitle = assignmentTargetTitle(a);
    if (!matchesSearch([targetTitle, a.message])) return false;
    if (statusFilter.value && a.status !== statusFilter.value) return false;
    if (projectFilter.value && a.relatedProjectId !== projectFilter.value) return false;
    if (websiteFilter.value && a.relatedWebsiteId !== websiteFilter.value) return false;
    return true;
  })
);

interface RecentEntry {
  id: string;
  kind: 'folder' | 'file';
  fileType?: DocsFileType;
  title: string;
  subtitle: string;
  timestamp: string;
}

const recentlyAdded = computed<RecentEntry[]>(() => {
  const folderEntries: RecentEntry[] = data.docsFolders.map((f) => ({
    id: f.id,
    kind: 'folder',
    title: f.name,
    subtitle: f.description,
    timestamp: f.createdAt
  }));
  const fileEntries: RecentEntry[] = data.docsFiles.map((f) => ({
    id: f.id,
    kind: 'file',
    fileType: f.type,
    title: f.title,
    subtitle: docsFolderName(f.folderId),
    timestamp: f.createdAt
  }));
  return [...folderEntries, ...fileEntries]
    .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1))
    .slice(0, 12);
});

// =====================
// Member filtered collections
// =====================
const myAssignments = computed(() =>
  data.docsAssignments.filter((a) => a.assignedTo === auth.user?.id && a.status !== 'archived')
);

const memberFilteredAssignments = computed(() =>
  myAssignments.value.filter((a) => {
    if (!matchesSearch([assignmentTargetTitle(a), a.message])) return false;
    if (typeFilter.value) {
      if (a.assignmentType === 'file') {
        const file = fileFor(a);
        if (!file || file.type !== typeFilter.value) return false;
      } else {
        // For folder assignments, check if any file inside matches the type.
        const files = data.docsFiles.filter((f) => f.folderId === a.folderId);
        if (!files.some((f) => f.type === typeFilter.value)) return false;
      }
    }
    if (projectFilter.value && a.relatedProjectId !== projectFilter.value) return false;
    if (websiteFilter.value && a.relatedWebsiteId !== websiteFilter.value) return false;
    return true;
  })
);

const memberFolderIds = computed(() => {
  const ids = new Set<string>();
  data.docsFolders.forEach((folder) => {
    if (isOwnDocsFolder(folder)) ids.add(folder.id);
  });
  myAssignments.value.forEach((a) => {
    if (a.assignmentType === 'folder' && a.folderId) ids.add(a.folderId);
    if (a.assignmentType === 'file' && a.fileId) {
      const f = fileFor(a);
      if (f?.folderId) ids.add(f.folderId);
    }
  });
  return ids;
});

const memberFilteredFolders = computed(() =>
  data.docsFolders.filter((f) => {
    if (!memberFolderIds.value.has(f.id)) return false;
    if (!matchesSearch([f.name, f.description])) return false;
    if (projectFilter.value && f.relatedProjectId !== projectFilter.value) return false;
    if (websiteFilter.value && f.relatedWebsiteId !== websiteFilter.value) return false;
    return true;
  })
);

const memberFilesInFolder = (folderId: string) => {
  // Files inside this folder that the member has access to (folder assigned to them
  // makes everything accessible; otherwise only directly-assigned files).
  const folder = folderByIdLocal(folderId);
  const ownFolder = folder ? isOwnDocsFolder(folder) : false;
  const wholeFolderAssigned = myAssignments.value.some(
    (a) => a.assignmentType === 'folder' && a.folderId === folderId
  );
  if (wholeFolderAssigned) return data.docsFiles.filter((f) => f.folderId === folderId);
  const directlyAssignedFileIds = new Set(
    myAssignments.value
      .filter((a) => a.assignmentType === 'file')
      .map((a) => a.fileId)
      .filter(Boolean) as string[]
  );
  return data.docsFiles.filter(
    (f) => f.folderId === folderId && (directlyAssignedFileIds.has(f.id) || (ownFolder && isOwnDocsFile(f)))
  );
};

const memberAccessibleFiles = computed(() => {
  const folderIdsAssigned = new Set(
    myAssignments.value
      .filter((a) => a.assignmentType === 'folder')
      .map((a) => a.folderId)
      .filter(Boolean) as string[]
  );
  const fileIdsAssigned = new Set(
    myAssignments.value
      .filter((a) => a.assignmentType === 'file')
      .map((a) => a.fileId)
      .filter(Boolean) as string[]
  );
  return data.docsFiles.filter((f) => {
    const owned = isOwnDocsFile(f);
    if (!owned && !fileIdsAssigned.has(f.id) && !(f.folderId && folderIdsAssigned.has(f.folderId))) return false;
    if (!matchesSearch([f.title, f.description, f.url])) return false;
    if (typeFilter.value && f.type !== typeFilter.value) return false;
    if (projectFilter.value && f.relatedProjectId !== projectFilter.value) return false;
    if (websiteFilter.value && f.relatedWebsiteId !== websiteFilter.value) return false;
    return true;
  });
});

const recentlyViewedAssignments = computed(() =>
  data.docsAssignments
    .filter((a) => a.assignedTo === auth.user?.id && (a.status === 'viewed' || a.status === 'used'))
    .slice(0, 24)
);

// =====================
// Product Docs
// =====================
const productDocCategoryFilter = ref<DocsFileCategory | ''>('');
const productDocWebsiteFilter = ref('');

const categoryOptions: { value: DocsFileCategory | ''; label: string }[] = [
  { value: '', label: 'All categories' },
  { value: 'product_details', label: 'Product Details' },
  { value: 'website_instructions', label: 'Website Instructions' },
  { value: 'landing_page_prompts', label: 'Landing Page Prompts' },
  { value: 'seo_notes', label: 'SEO Notes' },
  { value: 'design_references', label: 'Design References' },
  { value: 'company_rules', label: 'Company Rules' },
  { value: 'other', label: 'Other' }
];

const categoryLabel = (cat: DocsFileCategory) =>
  categoryOptions.find((o) => o.value === cat)?.label ?? cat;

const filteredProductDocs = computed(() => {
  const q = search.value.toLowerCase().trim();
  return data.docsFiles.filter((f) => {
    if (productDocCategoryFilter.value && f.category !== productDocCategoryFilter.value) return false;
    if (productDocWebsiteFilter.value && f.relatedWebsiteId !== productDocWebsiteFilter.value) return false;
    if (q && ![ f.title, f.productName, f.productShortDesc, f.description ].some((s) => s.toLowerCase().includes(q))) return false;
    return true;
  });
});

// Detail modal
const detailModalOpen = ref(false);
const detailFile = ref<DocsFile | null>(null);
const copied = ref<string | null>(null);

const openDetail = (file: DocsFile) => {
  detailFile.value = file;
  detailModalOpen.value = true;
  copied.value = null;
};

const copyToClipboard = async (text: string, key: string) => {
  try {
    await navigator.clipboard.writeText(text);
    copied.value = key;
    setTimeout(() => { if (copied.value === key) copied.value = null; }, 2000);
  } catch {
    // ignore
  }
};

const buildDetailsText = (f: DocsFile) => {
  const lines: string[] = [];
  if (f.productName) lines.push(`Product Name: ${f.productName}`);
  if (f.productUrl) lines.push(`Product URL: ${f.productUrl}`);
  if (f.productPrice) lines.push(`Price: ${f.productPrice}`);
  if (f.productSku) lines.push(`SKU: ${f.productSku}`);
  if (f.productShortDesc) lines.push(`\nShort Description:\n${f.productShortDesc}`);
  if (f.productLongDesc) lines.push(`\nFull Description:\n${f.productLongDesc}`);
  if (f.productFeatures) lines.push(`\nFeatures:\n${f.productFeatures}`);
  if (f.productSpecs) lines.push(`\nSpecifications:\n${f.productSpecs}`);
  if (f.productNotes) lines.push(`\nNotes:\n${f.productNotes}`);
  return lines.join('\n');
};

const buildWebsiteText = (websiteId: string | null) => {
  if (!websiteId) return '';
  const w = data.websites.find((x) => x.id === websiteId);
  if (!w) return '';
  const parts = [`Website: ${w.name}`];
  if (w.domain) parts.push(`Domain: ${w.domain}`);
  if (w.primaryColor) parts.push(`Primary Color: ${w.primaryColor}`);
  if (w.secondaryColor) parts.push(`Secondary Color: ${w.secondaryColor}`);
  if (w.fontFamily) parts.push(`Font: ${w.fontFamily}`);
  return parts.join('\n');
};

const linkedPrompt = (f: DocsFile) =>
  f.linkedPromptId ? pw.templates.find((t) => t.id === f.linkedPromptId) : null;

const buildCombinedPrompt = (f: DocsFile) => {
  const parts: string[] = [];

  const details = buildDetailsText(f);
  if (details) parts.push(`=== PRODUCT DETAILS ===\n${details}`);

  const websiteText = buildWebsiteText(f.relatedWebsiteId);
  if (websiteText) parts.push(`=== WEBSITE DETAILS ===\n${websiteText}`);

  const prompt = linkedPrompt(f);
  if (prompt) {
    parts.push(`=== PROMPT ===\n${prompt.templateBody}`);
    if (prompt.lockedRules) parts.push(`=== OUTPUT RULES ===\n${prompt.lockedRules}`);
  }

  parts.push(`=== OUTPUT INSTRUCTION ===\nCreate a complete product landing page section/page using the product details above. Follow the website branding guidelines. Output clean, production-ready content.`);

  return parts.join('\n\n');
};

// =====================
// Folder modal
// =====================
const folderModalOpen = ref(false);
const saving = ref(false);

const blankFolderForm = () => ({
  id: '',
  name: '',
  description: '',
  relatedProjectIdValue: '',
  relatedWebsiteIdValue: '',
  folderColor: '#3f8dfe'
});
const folderForm = reactive(blankFolderForm());

const openCreateFolder = () => {
  Object.assign(folderForm, blankFolderForm());
  folderModalOpen.value = true;
};
const openEditFolder = (folder: DocsFolder) => {
  Object.assign(folderForm, {
    id: folder.id,
    name: folder.name,
    description: folder.description,
    relatedProjectIdValue: folder.relatedProjectId ?? '',
    relatedWebsiteIdValue: folder.relatedWebsiteId ?? '',
    folderColor: folder.folderColor || '#3f8dfe'
  });
  folderModalOpen.value = true;
};
const saveFolder = async () => {
  if (!folderForm.name.trim()) return;
  saving.value = true;
  const ok = await data.upsertDocsFolder({
    id: folderForm.id,
    name: folderForm.name.trim(),
    description: folderForm.description,
    relatedProjectId: folderForm.relatedProjectIdValue || null,
    relatedWebsiteId: folderForm.relatedWebsiteIdValue || null,
    folderColor: folderForm.folderColor || '#3f8dfe',
    createdBy: null,
    createdAt: '',
    updatedAt: ''
  });
  saving.value = false;
  if (ok) folderModalOpen.value = false;
};
const confirmDeleteFolder = async (folder: DocsFolder) => {
  if (!confirm(`Delete "${folder.name}"? Files inside the folder will also be deleted.`)) return;
  await data.removeDocsFolder(folder.id);
};

// =====================
// File modal
// =====================
const fileModalOpen = ref(false);

const blankFileForm = () => ({
  id: '',
  title: '',
  type: 'google_doc' as DocsFileType,
  folderIdValue: '',
  url: '',
  description: '',
  relatedProjectIdValue: '',
  relatedWebsiteIdValue: '',
  // Product doc fields
  category: 'other' as DocsFileCategory,
  productName: '',
  productUrl: '',
  productImageUrl: '',
  productShortDesc: '',
  productLongDesc: '',
  productFeatures: '',
  productSpecs: '',
  productPrice: '',
  productSku: '',
  productNotes: '',
  driveLink: '',
  linkedPromptIdValue: ''
});
const fileForm = reactive(blankFileForm());

const openCreateFile = (folderId?: string, asProductDoc = false) => {
  Object.assign(fileForm, blankFileForm());
  if (folderId) fileForm.folderIdValue = folderId;
  if (asProductDoc) fileForm.category = 'product_details';
  fileModalOpen.value = true;
};
const openEditFile = (file: DocsFile) => {
  Object.assign(fileForm, {
    id: file.id,
    title: file.title,
    type: file.type,
    folderIdValue: file.folderId ?? '',
    url: file.url,
    description: file.description,
    relatedProjectIdValue: file.relatedProjectId ?? '',
    relatedWebsiteIdValue: file.relatedWebsiteId ?? '',
    category: file.category ?? 'other',
    productName: file.productName ?? '',
    productUrl: file.productUrl ?? '',
    productImageUrl: file.productImageUrl ?? '',
    productShortDesc: file.productShortDesc ?? '',
    productLongDesc: file.productLongDesc ?? '',
    productFeatures: file.productFeatures ?? '',
    productSpecs: file.productSpecs ?? '',
    productPrice: file.productPrice ?? '',
    productSku: file.productSku ?? '',
    productNotes: file.productNotes ?? '',
    driveLink: file.driveLink ?? '',
    linkedPromptIdValue: file.linkedPromptId ?? ''
  });
  fileModalOpen.value = true;
};

const urlHelperText = computed(() =>
  isGoogleDriveType(fileForm.type)
    ? 'Make sure this Google Drive file is shared with the team member, or they may not be able to open it.'
    : 'Paste the full URL.'
);

const saveFile = async () => {
  if (!fileForm.title.trim()) return;
  saving.value = true;
  const ok = await data.upsertDocsFile({
    id: fileForm.id,
    folderId: fileForm.folderIdValue || null,
    title: fileForm.title.trim(),
    type: fileForm.type,
    url: fileForm.url.trim(),
    description: fileForm.description,
    content: '',
    relatedProjectId: fileForm.relatedProjectIdValue || null,
    relatedWebsiteId: fileForm.relatedWebsiteIdValue || null,
    relatedTaskId: null,
    createdBy: null,
    updatedBy: null,
    createdAt: '',
    updatedAt: '',
    category: fileForm.category,
    productName: fileForm.productName,
    productUrl: fileForm.productUrl,
    productImageUrl: fileForm.productImageUrl,
    productShortDesc: fileForm.productShortDesc,
    productLongDesc: fileForm.productLongDesc,
    productFeatures: fileForm.productFeatures,
    productSpecs: fileForm.productSpecs,
    productPrice: fileForm.productPrice,
    productSku: fileForm.productSku,
    productNotes: fileForm.productNotes,
    driveLink: fileForm.driveLink,
    linkedPromptId: fileForm.linkedPromptIdValue || null
  });
  saving.value = false;
  if (ok) fileModalOpen.value = false;
};
const confirmDeleteFile = async (file: DocsFile) => {
  if (!confirm(`Delete "${file.title}"?`)) return;
  await data.removeDocsFile(file.id);
};

// =====================
// Assign modal
// =====================
const assignModalOpen = ref(false);
const assignMemberSearch = ref('');

const blankAssignForm = () => ({
  type: 'folder' as DocsAssignmentType,
  targetId: '',
  memberIds: [] as string[],
  message: '',
  priority: 'normal' as DocsAssignmentPriority,
  dueDate: '',
  relatedProjectIdValue: '',
  relatedWebsiteIdValue: ''
});
const assignForm = reactive(blankAssignForm());

const openAssignPicker = () => {
  Object.assign(assignForm, blankAssignForm());
  assignMemberSearch.value = '';
  assignModalOpen.value = true;
};
const openAssignFolder = (folder: DocsFolder) => {
  Object.assign(assignForm, {
    ...blankAssignForm(),
    type: 'folder',
    targetId: folder.id,
    relatedProjectIdValue: folder.relatedProjectId ?? '',
    relatedWebsiteIdValue: folder.relatedWebsiteId ?? ''
  });
  assignMemberSearch.value = '';
  assignModalOpen.value = true;
};
const openAssignFile = (file: DocsFile) => {
  Object.assign(assignForm, {
    ...blankAssignForm(),
    type: 'file',
    targetId: file.id,
    relatedProjectIdValue: file.relatedProjectId ?? '',
    relatedWebsiteIdValue: file.relatedWebsiteId ?? ''
  });
  assignMemberSearch.value = '';
  assignModalOpen.value = true;
};
const resetAssignTarget = () => {
  assignForm.targetId = '';
};

const toggleAssignMember = (id: string) => {
  if (assignForm.memberIds.includes(id)) {
    assignForm.memberIds = assignForm.memberIds.filter((x) => x !== id);
  } else {
    assignForm.memberIds = [...assignForm.memberIds, id];
  }
};

const selectAllAssignMembers = () => {
  const ids = filteredAssignMembers.value.map((m) => m.id);
  assignForm.memberIds = Array.from(new Set([...assignForm.memberIds, ...ids]));
};

const clearAssignMembers = () => {
  assignForm.memberIds = [];
};

const assignTargetLabel = computed(() => {
  if (!assignForm.targetId) return '';
  if (assignForm.type === 'folder') return folderByIdLocal(assignForm.targetId)?.name ?? '';
  return fileById(assignForm.targetId)?.title ?? '';
});

const assignTargetTypeLabel = computed(() =>
  assignForm.type === 'folder' ? 'Selected Folder' : 'Selected Doc'
);

const assignTargetSubLabel = computed(() => {
  if (!assignForm.targetId) return 'Select the item before sending it to the team.';
  if (assignForm.type === 'folder') {
    const count = data.docsFiles.filter((f) => f.folderId === assignForm.targetId).length;
    return `${count} file${count === 1 ? '' : 's'} in this folder`;
  }
  const file = fileById(assignForm.targetId);
  return file ? fileTypeMeta(file.type).label : 'Document';
});

const assignTargetFileIcon = computed(() => {
  const file = fileById(assignForm.targetId);
  return fileTypeMeta(file?.type ?? 'other').icon;
});

const assignTargetIsGoogleDrive = computed(() => {
  if (assignForm.type === 'folder') {
    const files = data.docsFiles.filter((f) => f.folderId === assignForm.targetId);
    return files.some((f) => isGoogleDriveType(f.type));
  }
  const file = fileById(assignForm.targetId);
  return file ? isGoogleDriveType(file.type) : false;
});

const assignModalTitle = computed(() =>
  assignForm.targetId ? 'Assign to team' : 'Assign a folder or file'
);
const assignModalSubtitle = computed(() =>
  assignForm.targetId
    ? 'Sends this to each picked member with a “Sent” status.'
    : 'Pick what to send and who should receive it.'
);

const filteredAssignMembers = computed(() => {
  const q = assignMemberSearch.value.trim().toLowerCase();
  if (!q) return activeMembers.value;
  return activeMembers.value.filter((m) =>
    [m.fullName, m.email, m.username, m.position]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
});

const initials = (value: string) =>
  (value || '?')
    .split(/[\s@.]+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const saveAssignment = async () => {
  if (!assignForm.targetId || !assignForm.memberIds.length) return;
  saving.value = true;
  const ok = await data.assignDocsToMembers({
    type: assignForm.type,
    targetId: assignForm.targetId,
    memberIds: assignForm.memberIds,
    message: assignForm.message,
    priority: assignForm.priority,
    dueDate: assignForm.dueDate,
    relatedProjectId: assignForm.relatedProjectIdValue || null,
    relatedWebsiteId: assignForm.relatedWebsiteIdValue || null
  });
  saving.value = false;
  if (ok) {
    assignModalOpen.value = false;
    activeTab.value = 'assigned-docs';
  }
};

const confirmDeleteAssignment = async (a: DocsAssignment) => {
  if (!confirm('Remove this assignment? The member will no longer see this doc.')) return;
  await data.removeDocsAssignment(a.id);
};

// =====================
// Member status updates
// =====================
const markStatus = async (a: DocsAssignment, status: DocsAssignment['status']) => {
  await data.markDocsAssignmentStatus(a.id, status);
};
const autoMarkViewed = (a: DocsAssignment) => {
  if (a.status === 'sent') void data.markDocsAssignmentStatus(a.id, 'viewed');
};

// =====================
// Shared option lists
// =====================
const folderOptions = computed(() =>
  data.docsFolders
    .filter((f) => canUseDocsFolder(f))
    .map((f) => ({ value: f.id, label: f.name }))
);
const fileOptions = computed(() =>
  data.docsFiles
    .filter((f) => auth.isAdmin || isOwnDocsFile(f))
    .map((f) => ({ value: f.id, label: f.title }))
);
const projectOptions = computed(() =>
  data.projects.map((p) => ({ value: p.id, label: p.name }))
);
const websiteOptions = computed(() =>
  data.websites.map((w) => ({ value: w.id, label: w.name }))
);
const activeMembers = computed(() =>
  data.members.filter((m) => m.status === 'active' && m.id !== auth.user?.id)
);

// =====================
// Lifecycle
// =====================
onMounted(async () => {
  await Promise.allSettled([
    data.fetchDocsFolders(),
    data.fetchDocsFiles(),
    data.fetchDocsAssignments()
  ]);
  // Background context loads (silent if already loaded).
  if (!data.members.length) data.fetchMembers();
  if (!data.projects.length) data.fetchProjects();
  if (!data.websites.length) data.fetchWebsites();
  if (!pw.templates.length) pw.fetchTemplates();
});
</script>

<style scoped>
.assign-docs-flow {
  display: grid;
  gap: 1rem;
}

.assign-selected-card,
.assign-section,
.assign-warning-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
}

.assign-selected-card {
  display: grid;
  grid-template-columns: 2.8rem minmax(0, 1fr) auto;
  gap: 0.85rem;
  align-items: center;
  padding: 1rem;
}

.assign-selected-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  flex-shrink: 0;
}

.assign-selected-icon--file {
  background: color-mix(in srgb, #14b8a6 12%, transparent);
  color: #0f766e;
}

:global(:root[data-theme='dark-gray']) .assign-selected-icon--file {
  color: #2dd4bf;
}

.assign-selected-main {
  min-width: 0;
}

.assign-kicker {
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.assign-selected-main h3 {
  margin: 0.15rem 0 0;
  color: var(--text-main);
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assign-selected-main p,
.assign-section-head p,
.assign-empty-note,
.assign-warning-card p {
  margin: 0.2rem 0 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.4;
}

.assign-link-btn {
  border: 0;
  background: transparent;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
}

.assign-link-btn:hover {
  text-decoration: underline;
}

.assign-picker-grid,
.assign-details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem;
}

.assign-details-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.assign-website-row {
  max-width: 22rem;
}

.assign-section {
  padding: 1rem;
}

.assign-section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.assign-section-head h3 {
  margin: 0;
  color: var(--text-main);
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}

.assign-member-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.assign-small-btn {
  height: auto;
  padding: 0.38rem 0.7rem;
  font-size: 0.75rem;
}

.assign-member-search {
  margin-bottom: 0.85rem;
}

.assign-member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
  gap: 0.55rem;
}

.assign-member-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.7rem;
  text-align: left;
  transition: border-color 140ms, background 140ms, color 140ms;
}

.assign-member-card:hover {
  border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
  background: var(--soft-bg);
}

.assign-member-card--selected {
  border-color: var(--primary);
  background: var(--primary);
  color: #fff;
}

.assign-member-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 13%, transparent);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 900;
  flex-shrink: 0;
}

.assign-member-card--selected .assign-member-avatar {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.assign-member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.assign-member-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.05rem;
}

.assign-member-copy strong,
.assign-member-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.assign-member-copy strong {
  color: inherit;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.25;
}

.assign-member-copy span {
  color: var(--text-muted);
  font-size: 0.72rem;
}

.assign-member-card--selected .assign-member-copy span {
  color: rgba(255, 255, 255, 0.78);
}

.assign-warning-card {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  border-color: rgba(217, 119, 6, 0.28);
  background: color-mix(in srgb, #d97706 9%, var(--card-bg));
  padding: 0.85rem 1rem;
}

.assign-warning-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 10px;
  background: rgba(217, 119, 6, 0.13);
  color: #b45309;
  flex-shrink: 0;
}

:global(:root[data-theme='dark-gray']) .assign-warning-icon {
  color: #fbbf24;
}

.assign-warning-card p {
  margin: 0;
  color: var(--text-main);
  font-size: 0.84rem;
}

@media (max-width: 720px) {
  .assign-selected-card,
  .assign-section-head {
    align-items: flex-start;
  }

  .assign-selected-card {
    grid-template-columns: 2.8rem minmax(0, 1fr);
  }

  .assign-link-btn {
    grid-column: 2;
    justify-self: start;
  }

  .assign-picker-grid,
  .assign-details-grid,
  .assign-website-row {
    grid-template-columns: 1fr;
    max-width: none;
  }

  .assign-section-head {
    flex-direction: column;
  }

  .assign-member-actions {
    justify-content: flex-start;
  }

  .assign-member-grid {
    grid-template-columns: 1fr;
  }
}

/* ── Product Docs Tab ──────────────────────────────────────────── */
.pd-docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.pd-doc-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.1rem 1.25rem;
}

.pd-doc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.pd-doc-category-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  white-space: nowrap;
}

.pd-doc-top-actions {
  display: flex;
  gap: 0.25rem;
}

.pd-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  padding: 0;
  border-radius: 8px;
}

.pd-icon-btn--danger:hover {
  color: var(--danger, #ef4444);
  border-color: var(--danger, #ef4444);
}

.pd-doc-img-wrap {
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  border-radius: 10px;
  background: var(--soft-bg);
}

.pd-doc-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pd-doc-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  line-height: 1.3;
}

.pd-doc-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: -0.3rem;
}

.pd-doc-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.pd-doc-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.1rem;
}

.pd-doc-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: var(--soft-bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
  white-space: nowrap;
}

.pd-doc-meta-chip--price {
  background: color-mix(in srgb, #22c55e 10%, transparent);
  color: #15803d;
  border-color: transparent;
}

:global([data-theme='dark-gray']) .pd-doc-meta-chip--price {
  color: #4ade80;
}

.pd-doc-meta-chip--prompt {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  border-color: transparent;
}

.pd-doc-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.pd-doc-link {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

.pd-doc-link:hover { text-decoration: underline; }

.pd-doc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: auto;
  padding-top: 0.4rem;
}

.pd-doc-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  padding: 0.32rem 0.65rem;
  height: auto;
  white-space: nowrap;
}

/* ── File Modal product section ─────────────────────────────────── */
.pd-product-section-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
  padding: 0.5rem 0 0.25rem;
  border-top: 1px solid var(--border);
  margin-top: 0.25rem;
}

/* ── Detail modal ───────────────────────────────────────────────── */
.pd-detail-grid {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 1.5rem;
  align-items: start;
}

.pd-detail-left {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pd-detail-img {
  width: 100%;
  border-radius: 12px;
  object-fit: cover;
}

.pd-detail-links {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.pd-detail-right {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}

.pd-detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pd-detail-short-desc {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.4;
}

.pd-detail-long-desc {
  font-size: 0.82rem;
  color: var(--text-muted);
  line-height: 1.5;
  white-space: pre-line;
}

.pd-detail-section {
  border-top: 1px solid var(--border);
  padding-top: 0.75rem;
}

.pd-detail-section-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin-bottom: 0.4rem;
}

.pd-detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pd-detail-list li {
  font-size: 0.82rem;
  color: var(--text-main);
  padding-left: 1rem;
  position: relative;
}

.pd-detail-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  color: var(--primary);
  font-size: 0.7rem;
}

.pd-detail-specs {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.pd-detail-spec-row {
  display: flex;
  gap: 0.75rem;
  font-size: 0.8rem;
}

.pd-detail-spec-key {
  color: var(--text-muted);
  min-width: 120px;
  flex-shrink: 0;
}

.pd-detail-spec-val {
  color: var(--text-main);
  font-weight: 600;
}

.pd-detail-notes {
  font-size: 0.8rem;
  color: var(--text-muted);
  white-space: pre-line;
}

.pd-detail-prompt-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--primary);
}

@media (max-width: 640px) {
  .pd-docs-grid { grid-template-columns: 1fr; }
  .pd-detail-grid { grid-template-columns: 1fr; }
}
</style>
