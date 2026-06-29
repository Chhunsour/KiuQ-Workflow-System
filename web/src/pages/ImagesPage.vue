<template>
  <!-- ════════ ACCESS DENIED VIEW FOR QUALITY CHECKER ════════ -->
  <div v-if="auth.isQualityChecker" class="card p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-status-needs-fix-bg text-status-needs-fix-fg mb-4">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
    <h1 class="text-xl font-bold text-text-main">{{ $t('mediaLibrary.accessDenied') }}</h1>
    <p class="text-sm text-text-muted mt-2 max-w-sm">{{ $t('mediaLibrary.qualityCheckerMediaDenied') }}</p>
  </div>

  <div v-else class="img-dashboard flex flex-col gap-4">
    <!-- ════════ HEADER ════════ -->
    <header class="card p-4 flex flex-wrap items-center justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-lg font-bold text-text-main flex items-center gap-2">
          <span class="inline-flex h-8 w-8 items-center justify-center rounded-btn bg-primary/10 text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </span>
          {{ $t('mediaLibrary.title') }}
        </h1>
        <p class="text-xs text-text-muted mt-1">{{ $t('mediaLibrary.sharedWorkspaceSubtitle') }}</p>
      </div>

      <div class="flex items-center gap-4">
        <!-- Quick Stats -->
        <div class="flex items-center gap-3">
          <!-- Images Stat -->
          <div class="flex items-center gap-2.5 px-3 py-1.5 bg-soft/40 border border-border/60 rounded-btn transition-all duration-200 hover:border-primary/40 hover:bg-soft">
            <span class="flex h-7 w-7 items-center justify-center rounded bg-primary-soft text-primary shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
              </svg>
            </span>
            <div class="min-w-0">
              <div class="text-[9px] uppercase font-bold tracking-wider text-text-soft leading-none">{{ $t('mediaLibrary.images') }}</div>
              <div class="text-xs font-extrabold text-text-main mt-0.5 leading-none">{{ library.length }}</div>
            </div>
          </div>

          <!-- Folders Stat -->
          <div class="flex items-center gap-2.5 px-3 py-1.5 bg-soft/40 border border-border/60 rounded-btn transition-all duration-200 hover:border-primary/40 hover:bg-soft">
            <span class="flex h-7 w-7 items-center justify-center rounded bg-primary-soft text-primary shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <div class="min-w-0">
              <div class="text-[9px] uppercase font-bold tracking-wider text-text-soft leading-none">{{ $t('mediaLibrary.folders') }}</div>
              <div class="text-xs font-extrabold text-text-main mt-0.5 leading-none">{{ customFolders.length }}</div>
            </div>
          </div>

          <!-- Storage Stat -->
          <div 
            class="flex items-center gap-2.5 px-3 py-1.5 bg-soft/40 border border-border/60 rounded-btn transition-all duration-200 hover:border-primary/40 hover:bg-soft"
            :title="(libraryStats?.unknown_size_count ?? 0) > 0 ? 'Some older files may not include size metadata.' : undefined"
          >
            <span class="flex h-7 w-7 items-center justify-center rounded bg-primary-soft text-primary shrink-0">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"/>
              </svg>
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-1">
                <div class="text-[9px] uppercase font-bold tracking-wider text-text-soft leading-none">{{ $t('mediaLibrary.storage') }}</div>
                <span 
                  v-if="(libraryStats?.unknown_size_count ?? 0) > 0"
                  class="text-[9px] text-text-muted hover:text-warning cursor-help leading-none flex items-center"
                  :title="$t('Some older files may not include size metadata.')"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                  </svg>
                </span>
              </div>
              <div class="text-xs font-extrabold text-text-main mt-0.5 leading-none">
                {{ formatTotalStorage(libraryStats?.total_storage_bytes ?? 0) }}
              </div>
              <div class="text-[8px] text-text-muted mt-0.5 leading-none">
                <span v-if="isFiltered">
                  {{ isFolderOnlyFilter ? $t('mediaLibrary.folder') : $t('mediaLibrary.filtered') }}: {{ formatTotalStorage(filteredStorageUsed) }}
                </span>
                <span v-else>{{ $t('mediaLibrary.allLibrary') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button 
            v-if="!auth.isQualityChecker"
            type="button"
            class="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            @click="openExportModal"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {{ $t('mediaLibrary.exportCsvFile') }}
          </button>
          <button 
            v-if="!auth.isQualityChecker"
            type="button"
            class="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="selectedFolderIds.length === 0"
            :title="selectedFolderIds.length === 0 ? 'Select at least one product to export.' : ''"
            @click="triggerSelectedCsvExport"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Selected ({{ selectedFolderIds.length }})
          </button>
          <button
            v-if="!auth.isQualityChecker"
            type="button"
            class="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5"
            @click="showImportModal = true"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" />
            </svg>
            Scan &amp; Import
          </button>
          <button type="button" class="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5" @click="uploaderExpanded = !uploaderExpanded">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {{ uploaderExpanded ? $t('mediaLibrary.hideUpload') : $t('mediaLibrary.uploadImages') }}
          </button>
          <button type="button" class="btn-primary py-1.5 px-3 text-xs flex items-center gap-1" @click="onAddFolderClick">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ $t('mediaLibrary.newFolder') }}
          </button>
        </div>
      </div>
    </header>

    <!-- ════════ COLLAPSIBLE UPLOADER ════════ -->
    <Transition name="expand-uploader">
      <section v-if="uploaderExpanded" class="card p-4 flex flex-col gap-3">
        <div
          class="img-drop flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-card cursor-pointer transition-all hover:bg-soft/40"
          :class="{ 'border-primary bg-primary/5': isDragging, 'opacity-60 cursor-wait': converting }"
          @dragover.prevent="onDragOver"
          @dragleave="onDragLeave"
          @drop.prevent="onDrop"
          @click="openFilePicker"
        >
          <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onPick" />
          
          <div class="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
            <svg v-if="converting" class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          
          <div class="text-center">
            <span class="text-xs font-bold text-text-main block">
              {{ uploadStatusMsg || $t('mediaLibrary.uploadStatusMsg') }}
            </span>
            <span class="text-[10px] text-text-muted block mt-1">{{ $t('mediaLibrary.uploaderLimit') }}</span>
          </div>
        </div>
      </section>
    </Transition>

    <!-- ════════ MEDIA MANAGER PANEL ════════ -->
    <div class="img-manager-layout">
      <!-- ─── Left Folder Sidebar ─── -->
      <aside class="card p-3 shrink-0 w-full md:w-[280px] md:max-h-[calc(100vh-2rem)] flex flex-col gap-3">
        <!-- Desktop sidebar header: hidden on mobile -->
        <div class="hidden md:flex items-center justify-between border-b border-border pb-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-soft">{{ $t('mediaLibrary.folders') }}</h3>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="text-xs font-bold flex items-center gap-0.5 hover:underline"
              :class="folderSelectMode ? 'text-status-needs-fix-fg' : 'text-text-soft hover:text-text-main'"
              @click="toggleFolderSelectMode"
            >
              {{ folderSelectMode ? $t('mediaLibrary.cancel') : $t('mediaLibrary.select') }}
            </button>
            <button v-if="!folderSelectMode" type="button" class="text-xs text-primary font-bold flex items-center gap-0.5 hover:underline" @click="onAddFolderClick">
              + {{ $t('mediaLibrary.new') }}
            </button>
          </div>
        </div>

        <!-- Select-mode action bar (desktop & mobile responsive) -->
        <div v-if="folderSelectMode" class="flex flex-col gap-2 bg-soft/30 border border-border rounded-xl p-2 text-left shrink-0">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-text-main">
              {{ selectedFolderIds.length }} {{ selectedFolderIds.length === 1 ? 'product selected' : 'products selected' }}
            </span>
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                @click="selectAllVisibleFolders"
              >
                Select All Visible
              </button>
              <span class="text-text-muted text-[10px]">•</span>
              <button
                type="button"
                class="text-[10px] font-bold text-text-soft hover:underline cursor-pointer"
                @click="selectedFolderIds = []"
              >
                Clear Selection
              </button>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-1.5">
            <!-- Export Selected Products Button -->
            <button
              type="button"
              class="flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              :disabled="selectedFolderIds.length === 0"
              :title="selectedFolderIds.length === 0 ? 'Select at least one product to export.' : ''"
              @click="triggerSelectedCsvExport"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Selected
            </button>
            
            <!-- Move to Trash Button -->
            <button
              type="button"
              class="flex items-center justify-center gap-1 text-[10px] font-bold px-2 py-1.5 rounded-lg border border-status-needs-fix-bg/60 text-status-needs-fix-fg hover:bg-status-needs-fix-bg/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
              :disabled="selectedFolderIds.length === 0 || processingTrash"
              @click="moveSelectedToTrash"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
              Move to Trash
            </button>
          </div>
        </div>

        <!-- Mobile Search & Collapsible Filter Panel -->
        <div class="md:hidden flex flex-col gap-2 shrink-0 p-1">
          <div class="flex items-center justify-between gap-2">
            <input
              v-model="folderSearchQuery"
              type="text"
              placeholder="Search folders..."
              class="flex-1 bg-soft text-xs border border-border/80 rounded-full px-3 py-1.5 focus:outline-none text-text-main placeholder:text-text-soft"
            />
            <button
              type="button"
              class="px-3 py-1.5 rounded-full border text-[11px] font-bold flex items-center gap-1 transition-all"
              :class="hasActiveFolderFilters ? 'bg-primary-soft text-primary border-primary/20' : 'bg-soft/40 border-border text-text-muted hover:text-text-main'"
              @click="showMobileFilters = !showMobileFilters"
            >
              <span>Filters</span>
              <span v-if="activeFiltersCount > 0" class="bg-primary text-white text-[9px] px-1 rounded-full font-bold font-mono">{{ activeFiltersCount }}</span>
            </button>
          </div>

          <!-- Mobile Filters Drawer Content -->
          <div v-if="showMobileFilters" class="flex flex-col gap-2.5 p-3 bg-soft/10 border border-border/60 rounded-xl mt-1 text-left transition-all">
            <div class="flex items-center justify-between text-[10px] font-bold text-text-soft uppercase tracking-wider">
              <span>Filter Options</span>
              <button
                v-if="hasActiveFolderFilters"
                type="button"
                class="text-primary hover:underline text-[9px] font-bold lowercase"
                @click="clearFolderFilters"
              >
                Clear Filters
              </button>
            </div>
            
            <div class="grid grid-cols-2 gap-3">
              <!-- Type Dropdown -->
              <div class="space-y-1">
                <label class="block font-bold text-text-soft uppercase tracking-wider text-[8px]">Type</label>
                <div class="custom-dropdown-container relative w-full">
                  <button
                    type="button"
                    class="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 bg-soft/60 border border-border/80 rounded-lg text-[11px] text-text-main font-semibold hover:border-primary/40 focus:outline-none"
                    @click.stop="openProductTypeDropdown = !openProductTypeDropdown; openMachineCategoryDropdown = false"
                  >
                    <span class="truncate">{{ getProductTypeFilterLabel(filterFolderProductType) }}</span>
                    <svg class="w-2.5 h-2.5 text-text-soft shrink-0 transition-transform" :class="openProductTypeDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  <div v-if="openProductTypeDropdown" class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-[#f6f8fa] dark:bg-[#1b1c1e] p-1 shadow-lg max-h-48 overflow-y-auto">
                    <button
                      v-for="opt in productTypeFilterOptions"
                      :key="opt.value"
                      type="button"
                      class="w-full text-left px-2 py-1 rounded text-[11px] font-semibold text-text-main hover:bg-soft transition-colors flex items-center gap-1.5"
                      @click.stop="selectFilterProductType(opt.value)"
                    >
                      <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getProductTypeMarkerClass(opt.value)"></span>
                      <span>{{ opt.label }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Category Dropdown -->
              <div class="space-y-1">
                <label class="block font-bold text-text-soft uppercase tracking-wider text-[8px]">Category</label>
                <div class="custom-dropdown-container relative w-full">
                  <button
                    type="button"
                    class="w-full flex items-center justify-between gap-1.5 px-2 py-1.5 bg-soft/60 border border-border/80 rounded-lg text-[11px] text-text-main font-semibold hover:border-primary/40 focus:outline-none disabled:opacity-40"
                    :disabled="filterFolderProductType === 'all'"
                    @click.stop="openMachineCategoryDropdown = !openMachineCategoryDropdown; openProductTypeDropdown = false"
                  >
                    <span class="truncate">{{ getMachineCategoryFilterLabel(filterFolderMachineCategory) }}</span>
                    <svg class="w-2.5 h-2.5 text-text-soft shrink-0 transition-transform" :class="openMachineCategoryDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="m19.5 8.25-7.5 7.5-7.5-7.5" /></svg>
                  </button>
                  <div v-if="openMachineCategoryDropdown" class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-[#f6f8fa] dark:bg-[#1b1c1e] p-1 shadow-lg flex flex-col gap-1 min-w-[160px]">
                    <div class="px-1.5 py-1 flex items-center gap-1 bg-soft/40 border border-border/40 rounded m-1">
                      <input
                        v-model="machineCategorySearch"
                        type="text"
                        placeholder="Search..."
                        class="bg-transparent border-none text-[9px] outline-none text-text-main w-full"
                        @click.stop
                      />
                    </div>
                    <div class="max-h-40 overflow-y-auto p-0.5 flex flex-col gap-0.5 scrollbar-thin">
                      <button
                        v-for="opt in filteredMachineCategoryOptions"
                        :key="opt.value"
                        type="button"
                        class="w-full text-left px-2 py-1 rounded text-[11px] font-semibold text-text-main hover:bg-soft transition-colors"
                        @click.stop="selectFilterMachineCategory(opt.value)"
                      >
                        <span>{{ opt.label }}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop Search & Redesigned Filters Panel -->
        <div class="hidden md:flex flex-col gap-2.5">
          <!-- Search folders -->
          <input
            v-model="folderSearchQuery"
            type="text"
            :placeholder="$t('mediaLibrary.searchFolders')"
            class="w-full bg-soft text-xs border border-border/80 rounded px-2.5 py-1.5 focus:outline-none focus:border-primary placeholder:text-text-soft"
          />

          <!-- Clean Filters Header -->
          <div class="flex items-center justify-between text-[10px] font-bold text-text-soft uppercase tracking-wider border-b border-border/30 pb-1">
            <span>Folder Filters</span>
            <button
              v-if="hasActiveFolderFilters"
              type="button"
              class="text-primary hover:underline text-[9px] font-bold lowercase transition-all"
              @click="clearFolderFilters"
            >
              Clear Filters
            </button>
          </div>

          <!-- Product Type custom dropdown trigger -->
          <div class="space-y-1">
            <label class="block font-bold text-text-soft uppercase tracking-wider text-[8px]">Product Type</label>
            <div class="custom-dropdown-container relative w-full">
              <button
                type="button"
                class="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-soft/50 hover:bg-soft border border-border/80 hover:border-primary/40 rounded-lg text-xs text-text-main font-semibold focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
                @click.stop="openProductTypeDropdown = !openProductTypeDropdown; openMachineCategoryDropdown = false"
              >
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getProductTypeMarkerClass(filterFolderProductType)"></span>
                  <span class="truncate">{{ getProductTypeFilterLabel(filterFolderProductType) }}</span>
                </div>
                <svg class="w-2.5 h-2.5 text-text-soft shrink-0 transition-transform" :class="openProductTypeDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              
              <!-- Product Type dropdown popover -->
              <div v-if="openProductTypeDropdown" class="absolute z-50 mt-1 w-full rounded-lg border border-border bg-[#f6f8fa] dark:bg-[#1b1c1e] p-1 shadow-lg max-h-60 overflow-y-auto">
                <button
                  v-for="opt in productTypeFilterOptions"
                  :key="opt.value"
                  type="button"
                  class="w-full text-left px-2 py-1.5 rounded text-xs font-semibold text-text-main hover:bg-soft transition-colors flex items-center gap-1.5"
                  :class="filterFolderProductType === opt.value ? 'bg-primary-soft/10 text-primary font-bold' : ''"
                  @click.stop="selectFilterProductType(opt.value)"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="getProductTypeMarkerClass(opt.value)"></span>
                  <span>{{ opt.label }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Machine Category custom dropdown trigger -->
          <div class="space-y-1">
            <label class="block font-bold text-text-soft uppercase tracking-wider text-[8px]">Machine Category</label>
            <div class="custom-dropdown-container relative w-full">
              <button
                type="button"
                class="w-full flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-soft/50 hover:bg-soft border border-border/80 hover:border-primary/40 rounded-lg text-xs text-text-main font-semibold focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="filterFolderProductType === 'all'"
                @click.stop="openMachineCategoryDropdown = !openMachineCategoryDropdown; openProductTypeDropdown = false"
              >
                <span class="truncate">{{ getMachineCategoryFilterLabel(filterFolderMachineCategory) }}</span>
                <svg class="w-2.5 h-2.5 text-text-soft shrink-0 transition-transform" :class="openMachineCategoryDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              
              <!-- Machine Category dropdown popover with search inside -->
              <div v-if="openMachineCategoryDropdown" class="absolute z-50 mt-1 w-full min-w-[200px] rounded-lg border border-border bg-[#f6f8fa] dark:bg-[#1b1c1e] p-1 shadow-lg flex flex-col gap-1">
                <div class="px-2 py-1 flex items-center gap-1 bg-soft/40 border border-border/40 rounded m-1">
                  <input
                    v-model="machineCategorySearch"
                    type="text"
                    placeholder="Search categories..."
                    class="bg-transparent border-none text-[10px] outline-none text-text-main w-full placeholder:text-text-soft"
                    @click.stop
                  />
                  <button v-if="machineCategorySearch" type="button" class="text-text-soft hover:text-text-main text-[9px] font-bold" @click.stop="machineCategorySearch = ''">✕</button>
                </div>
                <div class="max-h-48 overflow-y-auto p-0.5 flex flex-col gap-0.5 scrollbar-thin">
                  <button
                    v-for="opt in filteredMachineCategoryOptions"
                    :key="opt.value"
                    type="button"
                    class="w-full text-left px-2 py-1.5 rounded text-xs font-semibold text-text-main hover:bg-soft transition-colors flex items-center justify-between"
                    :class="filterFolderMachineCategory === opt.value ? 'bg-primary-soft/10 text-primary font-bold' : ''"
                    @click.stop="selectFilterMachineCategory(opt.value)"
                  >
                    <span>{{ opt.label }}</span>
                    <span v-if="filterFolderMachineCategory === opt.value" class="text-primary text-[10px]">✓</span>
                  </button>
                  <div v-if="filteredMachineCategoryOptions.length === 0" class="px-2 py-3 text-center text-text-soft text-[10px] italic">
                    No results found
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Active Filter Badges Container -->
          <div v-if="hasActiveFolderFilters" class="flex flex-wrap gap-1 border-t border-border/30 pt-2 transition-all">
            <span
              v-if="filterFolderProductType !== 'all'"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider transition-colors hover:bg-primary/15"
            >
              <span>Type: {{ filterFolderProductType }}</span>
              <button type="button" class="hover:text-primary-hover font-bold text-[8px] cursor-pointer" @click="filterFolderProductType = 'all'">✕</button>
            </span>
            <span
              v-if="filterFolderMachineCategory !== 'all'"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider transition-colors hover:bg-primary/15"
            >
              <span>MC: {{ filterFolderMachineCategory === 'not_set' ? 'Not Set' : filterFolderMachineCategory }}</span>
              <button type="button" class="hover:text-primary-hover font-bold text-[8px] cursor-pointer" @click="filterFolderMachineCategory = 'all'">✕</button>
            </span>
          </div>
        </div>

        <!-- Missing-info filter: surfaces folders missing any product field -->
        <button
          type="button"
          class="hidden md:flex items-center justify-between gap-2 w-full rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
          :class="folderMissingFilter
            ? 'border-amber-500/60 bg-amber-500/15 text-amber-500'
            : 'border-border text-text-muted hover:text-text-main hover:bg-soft/20'"
          @click="folderMissingFilter = !folderMissingFilter"
        >
          <span class="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            {{ folderMissingFilter ? $t('mediaLibrary.missingFilterOn') : $t('mediaLibrary.missingFilter') }}
          </span>
          <span
            v-if="incompleteFolderCount > 0"
            class="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
            :class="folderMissingFilter ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-500'"
          >{{ incompleteFolderCount }}</span>
        </button>

        <!-- Inline Folder Creator on Desktop -->
        <div v-if="showNewFolderInput" class="hidden md:flex border border-border/60 rounded bg-soft/50 p-2 flex-col gap-2">
          <input
            ref="newFolderInputRef"
            v-model="newFolderName"
            type="text"
            :placeholder="$t('mediaLibrary.folderName')"
            class="w-full bg-card border border-border text-xs rounded px-2 py-1 focus:outline-none focus:border-primary"
            @keyup.enter="createFolder"
            @keyup.esc="showNewFolderInput = false"
          />
          <div class="flex justify-end gap-1.5">
            <button type="button" class="btn-secondary py-1 px-2 h-6 text-[10px]" @click="showNewFolderInput = false">{{ $t('mediaLibrary.cancel') }}</button>
            <button type="button" class="btn-primary py-1 px-2.5 h-6 text-[10px]" @click="createFolder">{{ $t('mediaLibrary.create') }}</button>
          </div>
        </div>

        <!-- Folder list -->
        <ul
          class="folder-list-scroll flex md:flex-col gap-1.5 md:gap-0.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none whitespace-nowrap md:whitespace-normal"
          :class="{ 'scroll-active': shouldScrollFolders }"
        >
          <!-- New Folder button on mobile -->
          <li
            class="md:hidden inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border border-dashed border-border text-text-muted bg-soft/30 hover:bg-soft shrink-0"
            @click="onAddFolderClick"
          >
            + {{ $t('mediaLibrary.newFolder') }}
          </li>

          <!-- Inline Folder Creator on Mobile (as a chip) -->
          <li v-if="showNewFolderInput" class="md:hidden inline-flex items-center gap-1.5 bg-soft/50 border border-border/80 rounded-full px-3 py-1 shrink-0">
            <input
              ref="newFolderInputRef"
              v-model="newFolderName"
              type="text"
              :placeholder="$t('mediaLibrary.folderName')"
              class="bg-transparent text-xs outline-none text-text-main w-24"
              @keyup.enter="createFolder"
              @keyup.esc="showNewFolderInput = false"
            />
            <button type="button" class="text-text-muted hover:text-text-main text-[10px] font-bold" @click="showNewFolderInput = false">✕</button>
            <button type="button" class="text-primary hover:text-primary-hover text-[10px] font-bold" @click="createFolder">{{ $t('common.save') }}</button>
          </li>

          <!-- All Library -->
          <li
            class="folder-row select-none"
            :class="{ active: currentFolder === 'all' }"
            @click="currentFolder = 'all'"
          >
            <span class="folder-icon" v-html="ICON_SVG.folderOpen" />
            <span class="folder-name truncate">{{ $t('mediaLibrary.allLibrary') }}</span>
            <span class="folder-count">{{ library.length }}</span>
            <div class="w-[16px] h-5 hidden md:block"></div>
          </li>

          <!-- Uncategorized -->
          <li
            class="folder-row select-none"
            :class="{ active: currentFolder === 'uncategorized', 'drag-over': dragOverFolderId === 'uncategorized' }"
            @click="currentFolder = 'uncategorized'"
            @dragover.prevent
            @dragenter.prevent="dragOverFolderId = 'uncategorized'"
            @dragleave="onDragLeaveFolder('uncategorized')"
            @drop="onImageDrop($event, null)"
          >
            <span class="folder-icon" v-html="ICON_SVG.folder" />
            <span class="folder-name truncate">{{ $t('mediaLibrary.uncategorized') }}</span>
            <span class="folder-count">{{ uncategorizedCount }}</span>
            <div class="w-[16px] h-5 hidden md:block"></div>
          </li>

          <!-- Custom User Folders -->
          <li
            v-for="(folder, index) in filteredFolders"
            :key="folder.id"
            class="folder-row relative group"
            :class="{ active: !folderSelectMode && currentFolder === folder.id, 'drag-over': dragOverFolderId === folder.id, 'folder-selected': folderSelectMode && selectedFolderIds.includes(folder.id) }"
            @click="folderSelectMode ? toggleFolderSelection(folder.id) : (currentFolder = folder.id)"
            @dragover.prevent
            @dragenter.prevent="!folderSelectMode && (dragOverFolderId = folder.id)"
            @dragleave="onDragLeaveFolder(folder.id)"
            @drop="!folderSelectMode && onImageDrop($event, folder.id)"
            :title="folder.name"
          >
            <!-- Selection checkbox (select mode) -->
            <input
              v-if="folderSelectMode"
              type="checkbox"
              class="shrink-0 w-3.5 h-3.5 accent-primary cursor-pointer"
              :checked="selectedFolderIds.includes(folder.id)"
              :disabled="!canManageFolder(folder)"
              :title="!canManageFolder(folder) ? $t('mediaLibrary.deleteSelectNoneHint') : ''"
              @click.stop="canManageFolder(folder) && toggleFolderSelection(folder.id)"
            />
            <span class="folder-icon" v-html="ICON_SVG.folder" />
            
            <!-- Stacking folder details (desktop and mobile responsive) -->
            <div class="flex flex-col min-w-0 py-1 text-left">
              <!-- Inline Folder Rename Input -->
              <input
                v-if="editingFolderId === folder.id"
                ref="renameFolderInputRef"
                v-model="editFolderInput"
                type="text"
                class="bg-card border border-primary text-[11px] rounded px-1.5 py-0.5 focus:outline-none text-text-main w-full"
                @blur="saveFolderRename(folder.id)"
                @keyup.enter="saveFolderRename(folder.id)"
                @keyup.esc="editingFolderId = null"
                @click.stop
              />
              <span v-else class="folder-name truncate text-[11px] font-bold text-text-main leading-tight" :title="folder.name">{{ folder.name }}</span>
              
              <!-- Matched WooCommerce product name (if different) -->
              <span v-if="folder.matched_product_title && folder.matched_product_title !== folder.name" class="text-[9px] text-text-soft truncate leading-tight font-semibold mt-0.5">
                Prod: {{ folder.matched_product_title }}
              </span>

              <!-- SKU badge, Product Type & Machine Category path -->
              <span class="text-[9px] text-text-soft mt-0.5 truncate leading-tight">
                <span v-if="folder.sku" class="font-mono text-text-main bg-soft px-1 rounded-sm text-[8px] mr-1">SKU: {{ folder.sku }}</span>
                <span v-else class="text-text-muted/60 mr-1">[No SKU]</span>
                
                <template v-if="folder.product_type">
                  <span class="capitalize font-semibold">{{ folder.product_type }}</span> &gt; <span class="font-semibold">{{ folder.machine_category || 'Not Set' }}</span>
                </template>
                <template v-else>
                  Machine Category: Not Set
                </template>
              </span>
              
              <!-- Completion Status Info -->
              <span class="text-[9px] mt-0.5 flex items-center gap-1.5">
                <span
                  class="w-1.5 h-1.5 rounded-full shrink-0"
                  :class="isFolderMissingInfo(folder) ? 'bg-amber-500' : 'bg-emerald-500'"
                ></span>
                <span class="text-[8px] text-text-muted font-semibold">
                  {{ isFolderMissingInfo(folder) ? 'Incomplete' : 'Ready' }}
                </span>
                <span v-if="folder.match_verified_by_user" class="text-sky-400 font-extrabold text-[8px]">✓ Verified</span>
              </span>
            </div>

            <!-- Missing-info indicator -->
            <span
              v-if="editingFolderId !== folder.id && !folderSelectMode && isFolderMissingInfo(folder)"
              class="shrink-0 text-amber-500"
              :title="folderMissingSummary(folder)"
              aria-label="Missing product info"
              @click.stop="currentFolder = folder.id"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>

            <!-- Folder count -->
            <span v-if="editingFolderId !== folder.id" class="folder-count">
              {{ getFolderImageCount(folder.id) }}
            </span>
            <div v-else class="w-4 h-5"></div>

            <!-- Actions Menu Wrapper -->
            <div class="folder-actions">
              <!-- Desktop Actions Dropdown Trigger -->
              <button
                v-if="editingFolderId !== folder.id"
                type="button"
                class="desktop-action-btn p-0.5 hover:text-text-main hover:bg-soft rounded text-text-soft transition-all duration-200"
                :class="{ 'menu-open': activeFolderMenuId === folder.id }"
                @click.stop="toggleFolderMenu(folder, $event)"
              >
                <span v-html="ICON_SVG.dots" />
              </button>

              <!-- Mobile Folder Actions Menu Trigger -->
              <button
                v-if="editingFolderId !== folder.id"
                type="button"
                class="mobile-action-btn md:hidden p-0.5 text-text-muted hover:text-text-main"
                @click.stop="mobileFolderMenuFolder = folder"
              >
                <span v-html="ICON_SVG.dots" class="scale-90" />
              </button>
            </div>
          </li>

          <!-- Trash bin -->
          <li
            v-if="trashedFolders.length > 0"
            class="folder-row select-none md:mt-1 md:border-t md:border-border/40 md:pt-2 shrink-0"
            :class="{ active: showTrashModal }"
            @click="showTrashModal = true"
            :title="$t('mediaLibrary.trash')"
          >
            <span class="folder-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
            </span>
            <span class="folder-name truncate">{{ $t('mediaLibrary.trash') }}</span>
            <span class="folder-count">{{ trashedFolders.length }}</span>
            <div class="w-[16px] h-5 hidden md:block"></div>
          </li>
        </ul>
      </aside>

      <!-- ─── Center Media Grid ─── -->
      <section class="card p-4 flex-1 flex flex-col gap-4 min-w-0">
        <!-- Grid Toolbar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-3 bg-transparent md:flex-nowrap">
          <div class="flex flex-row items-center gap-2 w-full md:w-auto flex-1 min-w-0 flex-nowrap overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-none">
            <!-- Search bar -->
            <div class="relative w-[200px] md:w-auto md:flex-1 max-w-[260px] shrink-0 md:shrink">
              <input
                v-model="search"
                type="search"
                :placeholder="$t('mediaLibrary.searchImages')"
                class="w-full bg-input text-xs border border-border rounded-btn pl-8 pr-3 h-9 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-text-soft text-text-main transition-all"
              />
              <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-soft">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                </svg>
              </span>
            </div>

            <!-- Creator filter -->
            <div class="relative shrink-0 w-[120px] lg:w-[140px]">
              <select
                v-model="filterUploadedBy"
                class="appearance-none w-full bg-input text-xs border border-border rounded-btn pl-3 pr-8 h-9 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all"
              >
                <option value="all">{{ $t('mediaLibrary.allUploaders') }}</option>
                <option v-for="user in uniqueUploaders" :key="user.id" :value="user.id">{{ user.name }}</option>
              </select>
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-soft">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <!-- File Type filter -->
            <div class="relative shrink-0 w-[110px] lg:w-[120px]">
              <select
                v-model="filterFileType"
                class="appearance-none w-full bg-input text-xs border border-border rounded-btn pl-3 pr-8 h-9 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all"
              >
                <option value="all">{{ $t('mediaLibrary.allFileTypes') }}</option>
                <option value="webp">{{ $t('WebP') }}</option>
                <option value="png">{{ $t('PNG') }}</option>
                <option value="jpeg">{{ $t('JPG / JPEG') }}</option>
                <option value="gif">{{ $t('GIF') }}</option>
                <option value="svg">{{ $t('SVG') }}</option>
              </select>
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-soft">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>

            <!-- Sort option -->
            <div class="relative shrink-0 w-[110px] lg:w-[130px]">
              <select
                v-model="sortBy"
                class="appearance-none w-full bg-input text-xs border border-border rounded-btn pl-3 pr-8 h-9 text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 cursor-pointer transition-all"
              >
                <option v-if="currentFolder !== 'all' && currentFolder !== 'uncategorized'" value="custom">{{ $t('mediaLibrary.arrangedOrder') }}</option>
                <option value="newest">{{ $t('mediaLibrary.newestFirst') }}</option>
                <option value="oldest">{{ $t('mediaLibrary.oldestFirst') }}</option>
                <option value="alphabetical">{{ $t('mediaLibrary.nameAZ') }}</option>
                <option value="alphabetical-desc">{{ $t('mediaLibrary.nameZA') }}</option>
                <option value="largest-size">{{ $t('mediaLibrary.largestSize') }}</option>
                <option value="smallest-size">{{ $t('mediaLibrary.smallestSize') }}</option>
              </select>
              <span class="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-soft">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          </div>

          <!-- Density & View Mode toggles -->
          <div class="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-between md:justify-end shrink-0">
            <!-- Object Fit Toggle -->
            <div class="flex border border-border rounded-btn p-0.5 shrink-0 bg-soft items-center h-9">
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="objectFit === 'cover' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="objectFit = 'cover'"
                :title="$t('mediaLibrary.cover')"
              >
                {{ $t('mediaLibrary.cover') }}
              </button>
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="objectFit === 'contain' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="objectFit = 'contain'"
                :title="$t('mediaLibrary.contain')"
              >
                {{ $t('mediaLibrary.contain') }}
              </button>
            </div>

            <!-- Grid vs List View -->
            <div class="flex border border-border rounded-btn p-0.5 shrink-0 bg-soft items-center h-9">
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="viewMode === 'comfortable' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="viewMode = 'comfortable'"
                :title="$t('mediaLibrary.comfort')"
              >
                {{ $t('mediaLibrary.comfort') }}
              </button>
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="viewMode === 'compact' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="viewMode = 'compact'"
                :title="$t('mediaLibrary.compact')"
              >
                {{ $t('mediaLibrary.compact') }}
              </button>
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="viewMode = 'list'"
                :title="$t('mediaLibrary.list')"
              >
                {{ $t('mediaLibrary.list') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Active folder / Filter Chips banner -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs bg-soft/20 p-2 rounded">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-bold text-text-main shrink-0 capitalize">{{ currentFolderTitle }}</span>
            <span class="text-text-muted shrink-0">·</span>
            <span class="text-text-muted font-medium shrink-0">{{ $t('mediaLibrary.resultsCount', { count: filteredLibrary.length }) }}</span>
            
            <button
              v-if="currentFolder !== 'all' && currentFolder !== 'uncategorized' && canOrganize"
              type="button"
              class="btn-primary py-1 px-2.5 text-[11px] h-6 flex items-center gap-1 ml-2 font-semibold shadow-sm rounded-btn"
              @click="startOrganizing"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="mr-0.5">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              {{ $t('mediaLibrary.arrangeImages') }}
            </button>

            <button
              v-if="filterMyUploads || filterUploadedBy !== 'all' || filterFileType !== 'all' || search"
              type="button"
              class="text-primary hover:underline font-semibold text-[11px] ml-2 shrink-0"
              @click="resetAllFilters"
            >
              {{ $t('mediaLibrary.resetFilters') }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1.5 cursor-pointer text-text-muted font-semibold">
              <input type="checkbox" v-model="filterMyUploads" class="rounded border-border text-primary focus:ring-primary/20" />
              {{ $t('mediaLibrary.myUploads') }}
            </label>
            <span class="text-text-muted">·</span>
            <button type="button" class="text-text-muted hover:text-text-main font-semibold" @click="toggleSelectAll">
              {{ selectedImageKeys.length === filteredLibrary.length && filteredLibrary.length > 0 ? $t('mediaLibrary.deselectAll') : $t('mediaLibrary.selectAll') }}
            </button>
          </div>
        </div>



        <!-- ── Organize Mode Workspace ── -->
        <div v-if="isOrganizeMode" class="arrange-workspace space-y-6 mt-4 p-4 border border-border rounded bg-card/45">
          <!-- 1. Header Toolbar -->
          <div class="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
            <div>
              <h3 class="text-sm font-bold text-text-main flex items-center gap-1.5">
                {{ $t('mediaLibrary.arrangeImagesIn', { name: currentFolderTitle }) }}
              </h3>
              <p class="text-xs text-text-muted mt-0.5">
                {{ $t('mediaLibrary.dragImagesInstruction') }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn-secondary py-1.5 px-3 text-xs font-semibold h-8 rounded-btn"
                @click="cancelOrganize"
              >
                {{ $t('mediaLibrary.cancel') }}
              </button>
              <button
                type="button"
                class="btn-primary py-1.5 px-4 text-xs font-semibold h-8 rounded-btn flex items-center gap-1 shadow-sm"
                @click="saveOrganizeOrder"
              >
                {{ $t('mediaLibrary.saveOrder') }}
              </button>
            </div>
          </div>

          <!-- 2. Feature Image Selection Zone -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-text-main uppercase tracking-wider">{{ $t('mediaLibrary.featureImage') }}</h4>
            
            <!-- Dropzone for Feature Image -->
            <div
              class="relative rounded-btn border-2 border-dashed p-4 transition-all duration-200"
              :class="isDraggingOverFeature 
                ? 'border-primary bg-primary/10 shadow-inner scale-[1.01]' 
                : featureImageId 
                  ? 'border-primary/40 bg-soft/10' 
                  : 'border-border bg-soft/5 hover:border-text-soft/40 cursor-pointer'"
              @dragover.prevent
              @dragenter.prevent="isDraggingOverFeature = true"
              @dragleave="isDraggingOverFeature = false"
              @drop="onDropFeature"
            >
              <!-- Render Selected Feature Image -->
              <div v-if="featureImageId" class="flex flex-col md:flex-row items-center gap-4">
                <!-- Bolder KiuQ border card -->
                <div class="relative w-40 h-40 shrink-0 rounded-btn border-2 border-primary overflow-hidden bg-soft shadow-md scale-[1.02]">
                  <img :src="getFeatureImage()?.url" class="w-full h-full object-cover" />
                  <span class="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary text-white uppercase tracking-wider shadow-sm">
                    {{ $t('mediaLibrary.featureImageBadge') }}
                  </span>
                </div>
                <div class="flex-1 space-y-2 text-xs">
                  <p class="font-bold text-text-main text-sm truncate max-w-md">{{ getFeatureImage()?.name }}</p>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="btn-secondary py-1 px-2.5 text-[11px] rounded"
                      @click="previewImage(getFeatureImage())"
                    >
                      {{ $t('mediaLibrary.preview') }}
                    </button>
                    <button
                      type="button"
                      class="btn-secondary py-1 px-2.5 text-[11px] rounded"
                      @click="copyUrl(getFeatureImage()!)"
                    >
                      {{ $t('mediaLibrary.copyUrl') }}
                    </button>
                    <button
                      type="button"
                      class="btn-danger py-1 px-2.5 text-[11px] rounded font-semibold text-status-rejected-fg bg-status-rejected-bg/20 border border-status-rejected-fg/30 hover:bg-status-rejected-bg/40"
                      @click="removeFeature"
                    >
                      {{ $t('mediaLibrary.removeFeature') }}
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Empty state for Feature Dropzone -->
              <div v-else class="text-center p-6 text-text-muted flex flex-col items-center justify-center min-h-[120px]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="mb-2 text-text-soft">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
                <p class="font-bold text-xs text-text-main">{{ $t('mediaLibrary.noFeatureSelected') }}</p>
                <p class="text-[11px] text-text-muted mt-1">
                  {{ $t('mediaLibrary.dragGalleryImageInstruction') }}
                </p>
              </div>
            </div>
          </div>

          <!-- 3. Gallery Ordering Zone -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-text-main uppercase tracking-wider">{{ $t('mediaLibrary.galleryImages') }}</h4>
            
            <div v-if="!organizeImages.length" class="text-center p-8 border border-border border-dashed rounded-btn text-text-muted italic bg-soft/5">
              {{ $t('mediaLibrary.noGalleryImagesRemaining') }}
            </div>
            
            <div
              v-else
              class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5"
              @dragover.prevent
            >
              <!-- Gallery Item Card -->
              <div
                v-for="(img, index) in organizeImages"
                :key="img.key"
                draggable="true"
                @dragstart="onDragStart($event, index)"
                @dragenter="onDragEnter($event, index)"
                @dragend="onDragEnd"
                class="card flex flex-col border border-border bg-card relative group card-hover cursor-grab overflow-hidden select-none hover:shadow-md transition-all duration-200"
                :class="{ 
                  'opacity-40 scale-95 border-primary bg-primary/5': draggedIndex === index
                }"
              >
                <!-- Image thumbnail container -->
                <div class="aspect-square bg-soft overflow-hidden border-b border-border relative select-none flex items-center justify-center">
                  <img :src="img.url" class="w-full h-full object-cover pointer-events-none" />
                  
                  <!-- Order Number Badge -->
                  <span class="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-white shadow-sm flex items-center justify-center min-w-[20px] border border-border/50">
                    {{ index + 1 }}
                  </span>
                  
                  <!-- Drag Handle -->
                  <div 
                    class="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white cursor-grab hover:bg-black/80 shadow-sm border border-border/20 active:cursor-grabbing shrink-0 flex items-center justify-center"
                    :title="$t('Drag to reorder')"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
                      <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
                    </svg>
                  </div>
                </div>

                <!-- Content and Action buttons -->
                <div class="p-2.5 flex-1 flex flex-col justify-between gap-2.5 bg-card/65 text-xs">
                  <p class="font-bold text-text-main truncate max-w-full" :title="img.displayName">{{ img.displayName }}</p>
                  
                  <!-- Up / Down Reordering Buttons for mobile & keyboard accessibility -->
                  <div class="flex items-center justify-between gap-1 mt-auto">
                    <div class="flex items-center gap-1">
                      <button
                        type="button"
                        class="btn-secondary p-1 rounded hover:bg-soft text-text-muted hover:text-text-main h-6 w-6 flex items-center justify-center shrink-0 disabled:opacity-20 disabled:pointer-events-none"
                        :disabled="index === 0"
                        @click="moveItem(index, -1)"
                        :title="$t('Move Up')"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="btn-secondary p-1 rounded hover:bg-soft text-text-muted hover:text-text-main h-6 w-6 flex items-center justify-center shrink-0 disabled:opacity-20 disabled:pointer-events-none"
                        :disabled="index === organizeImages.length - 1"
                        @click="moveItem(index, 1)"
                        :title="$t('Move Down')"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    </div>
                    <div class="flex gap-1">
                      <button
                        type="button"
                        class="btn-secondary py-0.5 px-1.5 text-[10px] rounded h-6"
                        @click="previewImage(img)"
                      >
                        {{ $t('mediaLibrary.preview') }}
                      </button>
                      <button
                        type="button"
                        class="btn-secondary py-0.5 px-1.5 text-[10px] rounded h-6 font-semibold"
                        @click="setAsFeature(img.key)"
                      >
                        {{ $t('mediaLibrary.setAsFeature') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template v-else>
        <!-- ── Image Grid Content ── -->
        <div v-if="!library.length" class="p-10 text-center text-text-muted italic flex flex-col items-center justify-center min-h-[300px]">
          <div class="h-12 w-12 rounded-full bg-soft text-text-muted flex items-center justify-center mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <p class="font-bold text-sm text-text-main">{{ $t('mediaLibrary.noImagesInLibrary') }}</p>
          <p class="text-xs text-text-muted mt-1 max-w-sm">{{ $t('mediaLibrary.useDropzoneInstruction') }}</p>
        </div>

        <div v-if="!filteredLibrary.length" class="p-10 text-center text-text-muted italic flex flex-col items-center justify-center min-h-[300px]">
          <p class="font-bold text-sm text-text-main">{{ $t('mediaLibrary.noImagesFoundFilters') }}</p>
          <p class="text-xs text-text-muted mt-1">{{ $t('mediaLibrary.tryRelaxingFilters') }}</p>
          <button type="button" class="btn-secondary mt-3 py-1 px-3 text-xs" @click="resetAllFilters">{{ $t('mediaLibrary.resetFilters') }}</button>
        </div>

        <!-- ── GRID: COMFORTABLE VIEW ── -->
        <div v-else-if="viewMode === 'comfortable'" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          <!-- Uploading temporary cards -->
          <div
            v-for="item in visibleUploadingItems"
            :key="item.id"
            class="card flex flex-col border border-border bg-card relative overflow-hidden"
            :class="{ 'border-status-needs-fix-bg': item.status === 'failed' }"
          >
            <!-- Image thumbnail container -->
            <div class="aspect-square bg-soft overflow-hidden border-b border-border relative select-none flex items-center justify-center">
              <img
                :src="item.previewUrl"
                class="w-full h-full object-cover opacity-60"
              />
              
              <!-- Loader Overlay -->
              <div v-if="item.status !== 'failed'" class="absolute inset-0 bg-black/45 flex flex-col items-center justify-center p-3 text-center">
                <svg class="animate-spin text-primary mb-2" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-[9px] font-bold text-white uppercase tracking-wider">{{ $t('mediaLibrary.' + item.status) }}...</span>
              </div>

              <!-- Failed Overlay -->
              <div v-else class="absolute inset-0 bg-status-needs-fix-bg/85 flex flex-col items-center justify-center p-3 text-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" class="mb-1">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span class="text-[9px] font-bold text-status-needs-fix-fg uppercase tracking-wider">{{ $t('mediaLibrary.uploadFailed') }}</span>
              </div>
            </div>

            <!-- Meta details -->
            <div class="p-2.5 flex flex-col gap-1.5 min-w-0">
              <div class="text-xs font-bold text-text-main truncate" :title="item.name">
                {{ item.name }}
              </div>
              <div class="flex items-center justify-between text-[10px] text-text-muted font-medium">
                <span class="truncate">{{ $t('mediaLibrary.savingToFolder') }}</span>
              </div>

              <div class="w-full bg-soft rounded-full h-1 overflow-hidden">
                <div 
                  class="h-full rounded-full transition-all duration-300"
                  :class="item.status === 'failed' ? 'bg-status-needs-fix-fg' : 'bg-primary animate-pulse'"
                  :style="{ width: item.status === 'failed' ? '100%' : (item.progress || 30) + '%' }"
                ></div>
              </div>

              <div v-if="item.status === 'failed'" class="flex gap-1.5 mt-1" @click.stop>
                <button type="button" class="btn-primary py-1 px-2 text-[10px] h-6 flex-1 flex items-center justify-center" @click="retryUploadItem(item)">
                  {{ $t('mediaLibrary.retry') }}
                </button>
                <button type="button" class="btn-secondary py-1 px-2 text-[10px] h-6 flex-1 flex items-center justify-center" @click="removeUploadItem(item.id)">
                  {{ $t('mediaLibrary.remove') }}
                </button>
              </div>
              <div v-else class="h-6 mt-1 opacity-20 pointer-events-none flex gap-1.5">
                <div class="btn-secondary py-1 px-2 text-[10px] h-6 flex-1 text-center">{{ $t('mediaLibrary.processing') }}...</div>
              </div>
            </div>
          </div>

          <div
            v-for="(img, idx) in pagedLibrary"
            :key="img.key"
            class="card flex flex-col border border-border bg-card relative group card-hover cursor-grab overflow-hidden"
            :class="{ 
              'card-selected': isImageSelected(img.key), 
              'opacity-40 border-dashed': draggedImage?.key === img.key,
              'border-primary ring-2 ring-primary/20 scale-[1.01]': img.isFeatureImage && currentFolder !== 'all' && currentFolder !== 'uncategorized'
            }"
            draggable="true"
            @dragstart="onImageDragStart($event, img)"
            @dragend="onImageDragEnd"
          >
            <!-- Checkbox wrapper -->
            <div class="absolute left-2.5 top-2.5 z-10">
              <input
                type="checkbox"
                :checked="isImageSelected(img.key)"
                @change="toggleImageSelection(img.key)"
                class="rounded border-border text-primary focus:ring-primary/20 scale-105 shadow-sm"
                @click.stop
              />
            </div>

            <!-- Image thumbnail container -->
            <div class="aspect-square bg-soft overflow-hidden border-b border-border relative select-none" @click="openImageDrawer(idx)">
              <img
                :src="img.url"
                :alt="img.displayName"
                loading="lazy"
                class="w-full h-full select-none"
                :class="objectFit === 'cover' ? 'object-cover' : 'object-contain p-2'"
                @error="(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')"
              />
              
              <!-- Badge overlay -->
              <div v-if="currentFolder !== 'all' && currentFolder !== 'uncategorized'" class="absolute bottom-2 left-2 z-10 pointer-events-none">
                <span v-if="img.isFeatureImage" class="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary text-white uppercase tracking-wider shadow-sm border border-primary/20">
                  {{ $t('mediaLibrary.featureImageBadge') }}
                </span>
                <span v-else-if="img.sortOrder > 0 && img.sortOrder !== 9999" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-white shadow-sm border border-border/50">
                  #{{ img.sortOrder }}
                </span>
              </div>
            </div>

            <!-- Meta details -->
            <div class="p-2.5 flex flex-col gap-1.5 min-w-0" @click="openImageDrawer(idx)">
              <div class="flex items-start justify-between gap-1">
                <!-- Editable Rename Textbox -->
                <input
                  v-if="renamingImageKey === img.key"
                  ref="renameImageInputRef"
                  v-model="renameImageInput"
                  type="text"
                  class="w-full bg-card border border-primary text-[11px] rounded px-1.5 py-0.5 focus:outline-none text-text-main"
                  @blur="saveImageRename(img.key)"
                  @keyup.enter="saveImageRename(img.key)"
                  @keyup.esc="renamingImageKey = null"
                  @click.stop
                />
                <div v-else class="text-xs font-bold text-text-main truncate cursor-pointer hover:text-primary leading-snug" :title="img.displayName" @dblclick.stop="startRenameImage(img)">
                  {{ img.displayName }}
                </div>
              </div>

              <div class="flex items-center justify-between text-[10px] text-text-muted font-medium">
                <span class="truncate">{{ img.uploaderName }}</span>
                <span class="shrink-0 font-light">{{ fmtDate(img.createdAt) }}</span>
              </div>

              <!-- Folder Select -->
              <div class="flex items-center gap-1.5 border border-border/40 rounded px-1.5 py-0.5 bg-soft/50 text-[10px] text-text-muted" @click.stop>
                <span v-html="ICON_SVG.folder" class="shrink-0 select-icon opacity-80" />
                <select
                  :value="img.folderId || ''"
                  @change="(e) => moveImage(img.key, (e.target as HTMLSelectElement).value || null)"
                  class="w-full border-0 bg-transparent p-0 text-[10px] text-text-muted outline-none font-semibold cursor-pointer"
                >
                  <option value="">{{ $t('mediaLibrary.uncategorized') }}</option>
                  <option v-for="f in customFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
                </select>
              </div>
            </div>

            <!-- Overlay Actions (Hover only) -->
            <div class="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition flex gap-1 bg-card/90 border border-border p-1 rounded shadow-md" @click.stop>
              <button type="button" class="p-1 hover:text-primary text-text-muted rounded" @click="copyUrl(img)" :title="$t('mediaLibrary.copyUrl')">
                <span v-html="ICON_SVG.copy" />
              </button>
              <button
                v-if="canManageImage(img)"
                type="button"
                class="p-1 hover:text-status-needs-fix-fg text-text-muted rounded"
                @click="deleteImage(img)"
                :title="$t('mediaLibrary.deleteImage')"
              >
                <span v-html="ICON_SVG.trash" />
              </button>
            </div>
          </div>
        </div>

        <!-- ── GRID: COMPACT VIEW ── -->
        <div v-else-if="viewMode === 'compact'" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          <!-- Uploading temporary cards -->
          <div
            v-for="item in visibleUploadingItems"
            :key="item.id"
            class="card flex flex-col border border-border bg-card relative overflow-hidden aspect-square"
            :class="{ 'border-status-needs-fix-bg': item.status === 'failed' }"
          >
            <div class="w-full h-full bg-soft overflow-hidden relative select-none">
              <img :src="item.previewUrl" class="w-full h-full object-cover opacity-60" />
              
              <div v-if="item.status !== 'failed'" class="absolute inset-0 bg-black/45 flex flex-col items-center justify-center text-center">
                <svg class="animate-spin text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="text-[8px] font-bold text-white uppercase tracking-wider mt-1 truncate max-w-full px-1">{{ $t('mediaLibrary.' + item.status) }}</span>
              </div>
              <div class="absolute inset-0 bg-status-needs-fix-bg/85 flex flex-col items-center justify-center text-center p-1" v-else @click.stop>
                <span class="text-[8px] font-bold text-status-needs-fix-fg uppercase tracking-wider block">{{ $t('mediaLibrary.failed') }}</span>
                <div class="flex gap-1 mt-1">
                  <button type="button" class="bg-primary text-white text-[8px] font-bold px-1 rounded hover:bg-primary-hover" @click="retryUploadItem(item)">{{ $t('mediaLibrary.retry') }}</button>
                  <button type="button" class="bg-card text-text-main border border-border text-[8px] font-bold px-1 rounded" @click="removeUploadItem(item.id)">✕</button>
                </div>
              </div>
            </div>
          </div>

          <div
            v-for="(img, idx) in pagedLibrary"
            :key="img.key"
            class="card flex flex-col border border-border bg-card relative group cursor-grab overflow-hidden aspect-square"
            :class="{ 
              'card-selected': isImageSelected(img.key), 
              'opacity-40 border-dashed': draggedImage?.key === img.key,
              'border-primary ring-2 ring-primary/20 scale-[1.01]': img.isFeatureImage && currentFolder !== 'all' && currentFolder !== 'uncategorized'
            }"
            draggable="true"
            @dragstart="onImageDragStart($event, img)"
            @dragend="onImageDragEnd"
          >
            <!-- Checkbox wrapper -->
            <div class="absolute left-1.5 top-1.5 z-10">
              <input
                type="checkbox"
                :checked="isImageSelected(img.key)"
                @change="toggleImageSelection(img.key)"
                class="rounded border-border text-primary focus:ring-primary/20 scale-95 shadow-sm"
                @click.stop
              />
            </div>

            <!-- Image thumbnail -->
            <div class="w-full h-full bg-soft overflow-hidden relative select-none" @click="openImageDrawer(idx)">
              <img
                :src="img.url"
                :alt="img.displayName"
                loading="lazy"
                class="w-full h-full select-none"
                :class="objectFit === 'cover' ? 'object-cover' : 'object-contain p-1.5'"
                @error="(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')"
              />
              
              <!-- Badge overlay -->
              <div v-if="currentFolder !== 'all' && currentFolder !== 'uncategorized'" class="absolute bottom-1.5 left-1.5 z-10 pointer-events-none scale-90 origin-bottom-left">
                <span v-if="img.isFeatureImage" class="px-1 py-0.5 rounded text-[8px] font-bold bg-primary text-white uppercase tracking-wider shadow-sm border border-primary/20 animate-pulse">
                  {{ $t('mediaLibrary.cover') }}
                </span>
                <span v-else-if="img.sortOrder > 0 && img.sortOrder !== 9999" class="px-1 py-0.5 rounded text-[8px] font-bold bg-zinc-800 text-white shadow-sm border border-border/50">
                  #{{ img.sortOrder }}
                </span>
              </div>
            </div>

            <!-- Hover metadata banner -->
            <div class="absolute inset-x-0 bottom-0 bg-card/95 border-t border-border px-1.5 py-1 text-[10px] font-bold text-text-main truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none select-none">
              {{ img.displayName }}
            </div>

            <!-- Actions (Hover only) -->
            <div class="absolute right-1 top-1 z-10 opacity-0 group-hover:opacity-100 transition flex gap-0.5 bg-card/90 border border-border p-0.5 rounded shadow" @click.stop>
              <button type="button" class="p-0.5 hover:text-primary text-text-muted rounded scale-90" @click="copyUrl(img)" :title="$t('mediaLibrary.copyUrl')">
                <span v-html="ICON_SVG.copy" />
              </button>
              <button
                v-if="canManageImage(img)"
                type="button"
                class="p-0.5 hover:text-status-needs-fix-fg text-text-muted rounded scale-90"
                @click="deleteImage(img)"
                :title="$t('mediaLibrary.deleteImage')"
              >
                <span v-html="ICON_SVG.trash" />
              </button>
            </div>
          </div>
        </div>

        <!-- ── GRID: LIST VIEW ── -->
        <div v-else class="overflow-x-auto border border-border/80 rounded-card">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="border-b border-border bg-soft/50">
                <th class="px-4 py-2.5 w-8 table-head">{{ $t('mediaLibrary.selectHeader') }}</th>
                <th class="px-4 py-2.5 w-12 table-head">{{ $t('mediaLibrary.previewHeader') }}</th>
                <th class="px-4 py-2.5 table-head">{{ $t('mediaLibrary.nameHeader') }}</th>
                <th class="px-4 py-2.5 table-head">{{ $t('mediaLibrary.folderHeader') }}</th>
                <th class="px-4 py-2.5 table-head">{{ $t('mediaLibrary.uploaderHeader') }}</th>
                <th class="px-4 py-2.5 table-head">{{ $t('mediaLibrary.dateHeader') }}</th>
                <th class="px-4 py-2.5 table-head">{{ $t('mediaLibrary.sizeHeader') }}</th>
                <th class="px-4 py-2.5 table-head text-right">{{ $t('mediaLibrary.actionsHeader') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <!-- Uploading temporary rows -->
              <tr v-for="item in visibleUploadingItems" :key="item.id" class="bg-soft/10 animate-pulse">
                <td class="px-4 py-2 w-8">
                  <input type="checkbox" disabled class="opacity-30 rounded border-border" />
                </td>
                <td class="px-4 py-1.5 w-12">
                  <div class="h-8 w-8 rounded overflow-hidden border border-border bg-soft flex items-center justify-center relative">
                    <img :src="item.previewUrl" class="w-full h-full object-cover opacity-60" />
                    <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <svg class="animate-spin text-primary" width="10" height="10" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-2 font-semibold text-text-main max-w-xs truncate">
                  {{ item.name }}
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-2 uppercase font-bold tracking-wider animate-pulse inline-block">{{ $t('mediaLibrary.' + item.status) }}</span>
                </td>
                <td class="px-4 py-2 text-text-soft font-light">{{ currentFolderTitle }}</td>
                <td class="px-4 py-2 text-text-muted truncate">{{ $t('mediaLibrary.uploading') }}...</td>
                <td class="px-4 py-2 text-text-soft font-light">-</td>
                <td class="px-4 py-2 text-text-soft font-light">{{ item.file.size ? fmt(item.file.size) : '-' }}</td>
                <td class="px-4 py-2 text-right">
                  <div v-if="item.status === 'failed'" class="flex items-center justify-end gap-1.5">
                    <button type="button" class="btn-primary py-0.5 px-2 text-[10px] h-6 flex items-center" @click="retryUploadItem(item)">
                      {{ $t('mediaLibrary.retry') }}
                    </button>
                    <button type="button" class="btn-secondary py-0.5 px-1 h-6 text-status-needs-fix-fg flex items-center" @click="removeUploadItem(item.id)">
                      {{ $t('mediaLibrary.remove') }}
                    </button>
                  </div>
                  <span v-else class="text-[10px] text-text-soft italic">{{ $t('mediaLibrary.processing') }}...</span>
                </td>
              </tr>

              <tr v-for="(img, idx) in pagedLibrary" :key="img.key" class="table-row hover:bg-soft/20">
                <!-- Checkbox -->
                <td class="px-4 py-2 w-8">
                  <input
                    type="checkbox"
                    :checked="isImageSelected(img.key)"
                    @change="toggleImageSelection(img.key)"
                    class="rounded border-border text-primary focus:ring-primary/20 scale-95"
                  />
                </td>

                <!-- Mini Thumbnail -->
                <td class="px-4 py-1.5 w-12 cursor-pointer" @click="openImageDrawer(idx)">
                  <div class="h-8 w-8 rounded overflow-hidden border border-border bg-soft flex items-center justify-center">
                    <img :src="img.url" :alt="img.displayName" class="w-full h-full object-cover" />
                  </div>
                </td>

                <!-- Name -->
                <td class="px-4 py-2 font-semibold text-text-main max-w-xs truncate cursor-pointer hover:text-primary" @click="openImageDrawer(idx)">
                  <!-- Inline rename inside table -->
                  <input
                    v-if="renamingImageKey === img.key"
                    ref="renameImageInputRef"
                    v-model="renameImageInput"
                    type="text"
                    class="w-full bg-card border border-primary rounded px-1.5 py-0.5 text-xs text-text-main"
                    @blur="saveImageRename(img.key)"
                    @keyup.enter="saveImageRename(img.key)"
                    @keyup.esc="renamingImageKey = null"
                    @click.stop
                  />
                  <template v-else>
                    <span class="align-middle" @click.stop="startRenameImage(img)">{{ img.displayName }}</span>
                    <!-- Badges for list view -->
                    <span v-if="currentFolder !== 'all' && currentFolder !== 'uncategorized' && img.isFeatureImage" class="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary text-white uppercase tracking-wider shadow-sm align-middle">
                      {{ $t('FEATURE IMAGE') }}
                    </span>
                    <span v-else-if="currentFolder !== 'all' && currentFolder !== 'uncategorized' && img.sortOrder > 0 && img.sortOrder !== 9999" class="ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-800 text-white shadow-sm border border-border/50 align-middle">
                      #{{ img.sortOrder }}
                    </span>
                  </template>
                </td>

                <!-- Folder Selector -->
                <td class="px-4 py-2">
                  <select
                    :value="img.folderId || ''"
                    @change="(e) => moveImage(img.key, (e.target as HTMLSelectElement).value || null)"
                    class="bg-soft border border-border/40 text-[11px] rounded px-1.5 py-0.5 text-text-muted focus:outline-none"
                  >
                    <option value="">{{ $t('mediaLibrary.uncategorized') }}</option>
                    <option v-for="f in customFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
                  </select>
                </td>

                <!-- Uploaded By -->
                <td class="px-4 py-2 text-text-muted truncate">{{ img.uploaderName }}</td>

                <!-- Date -->
                <td class="px-4 py-2 text-text-soft font-light">{{ fmtDate(img.createdAt) }}</td>

                <!-- Size -->
                <td class="px-4 py-2 text-text-soft font-light">{{ fmt(img.fileSize) }}</td>

                <!-- Actions -->
                <td class="px-4 py-2 text-right">
                  <div class="flex items-center justify-end gap-1.5">
                    <button type="button" class="btn-secondary p-1 h-7 text-[10px] flex items-center gap-1" @click="copyUrl(img)">
                      {{ $t('mediaLibrary.copyUrl') }}
                    </button>
                    <button
                      v-if="canManageImage(img)"
                      type="button"
                      class="btn-secondary p-1 h-7 text-status-needs-fix-fg hover:bg-status-needs-fix-bg/10 border-status-needs-fix-bg/60"
                      @click="deleteImage(img)"
                      :title="$t('mediaLibrary.deleteImage')"
                    >
                      {{ $t('mediaLibrary.delete') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Safe VisibleCount Pagination trigger -->
        <button
          v-if="filteredLibrary.length > visibleCount"
          type="button"
          class="img-loadmore text-xs uppercase"
          @click="visibleCount += 24"
        >
          {{ $t('mediaLibrary.loadMore', { count: filteredLibrary.length - visibleCount }) }}
        </button>

        <!-- Folder Info Preview Card -->
        <div
          v-if="!isOrganizeMode && currentFolder !== 'all' && currentFolder !== 'uncategorized' && activeFolderObj"
          class="border border-border rounded-xl p-4 bg-soft/10 mt-6 space-y-4"
        >
          <!-- Header and Title -->
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-1 min-w-0 flex-1">
              <h2 class="text-sm font-extrabold text-text-main leading-tight flex items-center gap-2">
                <span>{{ activeFolderObj.name }}</span>
                <span class="text-text-soft font-light text-xs">{{ $t('mediaLibrary.folderInfoCol') }}</span>
              </h2>
              <div class="flex items-center gap-2 text-xs text-text-muted">
                <span>{{ $t('mediaLibrary.imagesCount', { count: activeFolderObjStats.imageCount }) }}</span>
                <span class="text-text-muted/40">•</span>
                <span :class="activeFolderObjStats.hasFeature ? 'text-primary font-bold' : 'text-status-needs-fix-fg font-semibold'">
                  {{ activeFolderObjStats.hasFeature ? $t('mediaLibrary.featureSelected') : $t('mediaLibrary.noFeatureImage') }}
                </span>
                <span class="text-text-muted/40">•</span>
                <span>{{ $t('mediaLibrary.orderedCount', { count: activeFolderObjStats.orderedCount }) }}</span>
              </div>
            </div>

            <!-- Edit Button / Add Button -->
            <button
              v-if="canEditFolderInfo(activeFolderObj)"
              type="button"
              class="btn-secondary h-8 px-3 text-xs font-semibold rounded-xl flex items-center gap-1.5 shrink-0"
              @click="openEditFolderInfo(activeFolderObj)"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              {{ hasFolderContent(activeFolderObj) ? $t('mediaLibrary.editFolderInfo') : $t('mediaLibrary.addFolderInfo') }}
            </button>
          </div>

          <!-- Content Details Preview -->
          <div v-if="hasFolderContent(activeFolderObj)" class="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-3 text-xs">
            <div class="md:col-span-2 space-y-3.5">
              <div v-if="activeFolderObj.short_description && !isMetadataOnlyText(activeFolderObj.short_description)">
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.shortDescription') }}</span>
                <p class="text-text-main font-medium leading-relaxed">
                  {{ activeFolderObj.short_description }}
                </p>
              </div>
              <div v-else-if="activeFolderObj.short_description && isMetadataOnlyText(activeFolderObj.short_description)">
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.shortDescription') }}</span>
                <p class="text-status-needs-fix-fg font-semibold">Invalid Short Description</p>
              </div>

              <!-- Full description View option (renders HTML from rich editor) -->
              <div v-if="activeFolderObj.description && !isMetadataOnlyText(activeFolderObj.description)">
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.fullDescription') }}</span>
                <div class="fde-preview text-text-main font-light leading-relaxed max-h-40 overflow-y-auto text-xs" v-html="activeFolderObj.description"></div>
              </div>
              <div v-else-if="activeFolderObj.description && isMetadataOnlyText(activeFolderObj.description)">
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.fullDescription') }}</span>
                <p class="text-status-needs-fix-fg font-semibold">Invalid Description</p>
              </div>
            </div>

            <div class="space-y-3 md:border-l md:border-border/40 md:pl-4">
              <div>
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.productType') }}</span>
                <span
                  v-if="activeFolderObj.product_type"
                  class="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider"
                >{{ productTypeLabel(activeFolderObj.product_type) }}</span>
                <span v-else class="text-text-muted italic">{{ $t('mediaLibrary.notSet') }}</span>
              </div>

              <div>
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.machineCategory') }}</span>
                <span
                  v-if="activeFolderObj.machine_category"
                  class="inline-block px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[10px] uppercase tracking-wider"
                >{{ activeFolderObj.machine_category }}</span>
                <span v-else class="text-text-muted italic">{{ $t('mediaLibrary.notSet') }}</span>
              </div>

              <div>
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.sku') }}</span>
                <span v-if="activeFolderObj.sku" class="text-text-main font-mono font-semibold break-all">{{ activeFolderObj.sku }}</span>
                <span v-else class="text-text-muted italic">{{ $t('mediaLibrary.notSet') }}</span>
              </div>

              <div>
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">GTIN</span>
                <span v-if="activeFolderObj.gtin || activeFolderObj.product_gtin" class="text-text-main font-mono font-semibold break-all">{{ activeFolderObj.gtin || activeFolderObj.product_gtin }}</span>
                <span v-else class="text-text-muted italic">{{ $t('mediaLibrary.notSet') }}</span>
              </div>

              <div>
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.price') }}</span>
                <span v-if="activeFolderObj.product_price" class="text-text-main font-semibold break-words">{{ activeFolderObj.product_price }}</span>
                <span v-else class="text-text-muted italic">{{ $t('mediaLibrary.notSet') }}</span>
              </div>

              <div>
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.buttonUrl') }}</span>
                <div v-if="activeFolderObj.button_url && isLinkLikeUrl(activeFolderObj.button_url)" class="flex items-center gap-1.5">
                  <a
                    :href="activeFolderObj.button_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline font-bold break-all flex items-center gap-1"
                  >
                    <span>{{ $t('mediaLibrary.openLink') }}</span>
                    <svg class="w-3 h-3 inline shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>
                <span v-else-if="activeFolderObj.button_url" class="text-text-main font-mono break-all">{{ activeFolderObj.button_url }}</span>
                <span v-else class="text-text-muted italic">{{ $t('mediaLibrary.noLinkAdded') }}</span>
              </div>

              <div v-if="activeFolderObj.updated_at">
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">{{ $t('mediaLibrary.lastUpdated') }}</span>
                <span class="text-text-muted font-mono font-medium">{{ fmtDateFull(activeFolderObj.updated_at) }}</span>
              </div>
            </div>
          </div>
          
          <div v-else class="text-xs text-text-muted italic flex items-center justify-between border-t border-border/40 pt-3">
            <span>{{ $t('mediaLibrary.noFolderDescriptionAdded') }}</span>
          </div>
        </div>
        </template>
      </section>
    </div>

    <!-- ════════ RIGHT-SIDE DETAILS DRAWER ════════ -->
    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-50 bg-black/60 transition-opacity backdrop-blur-sm"
      @click="closeDrawer"
    ></div>

    <div
      class="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border shadow-lg transition-transform duration-300 transform flex flex-col"
      :class="drawerOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Drawer Header -->
      <div class="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
        <h3 class="text-sm font-bold text-text-main">{{ $t('mediaLibrary.imageDetails') }}</h3>
        <div class="flex items-center gap-2">
          <!-- Keyboard navigation indicator / arrows -->
          <div class="flex border border-border/80 rounded overflow-hidden mr-2 bg-soft/40">
            <button type="button" class="p-1.5 hover:bg-soft text-text-muted" @click="selectPreviousImage" :title="$t('Previous Image (Left Arrow)')">
              <span v-html="ICON_SVG.arrowLeft" />
            </button>
            <span class="px-2.5 py-1 text-[11px] font-bold text-text-muted flex items-center justify-center bg-soft/10">
              {{ activeImageIndex + 1 }} / {{ filteredLibrary.length }}
            </span>
            <button type="button" class="p-1.5 hover:bg-soft text-text-muted" @click="selectNextImage" :title="$t('Next Image (Right Arrow)')">
              <span v-html="ICON_SVG.arrowRight" />
            </button>
          </div>
          <button class="text-text-muted hover:text-text-main p-1 focus:outline-none" @click="closeDrawer">
            <span v-html="ICON_SVG.close" />
          </button>
        </div>
      </div>

      <!-- Drawer Body -->
      <div v-if="selectedImage" class="flex-1 overflow-y-auto p-5 space-y-6">
        <!-- Image Big Preview -->
        <div class="rounded-card border border-border bg-soft/50 p-2.5 flex items-center justify-center overflow-hidden min-h-[200px] max-h-[300px] select-none">
          <img
            :src="selectedImage.url"
            :alt="selectedImage.displayName"
            class="max-w-full max-h-[280px] rounded object-contain select-none cursor-pointer"
            @click="openUrlInNewTab(selectedImage.url)"
            :title="$t('Click to view full screen')"
          />
        </div>

        <!-- Image Info -->
        <div class="space-y-4">
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-text-soft">{{ $t('mediaLibrary.imageTitle') }}</label>
            <input
              v-if="canManageImage(selectedImage)"
              v-model="renameImageInput"
              type="text"
              class="w-full bg-soft border border-border/80 text-xs rounded px-3 py-2 mt-1 focus:outline-none focus:border-primary text-text-main"
              @blur="saveImageRename(selectedImage!.key)"
              @keyup.enter="saveImageRename(selectedImage!.key)"
            />
            <div v-else class="text-xs font-bold text-text-main mt-1 p-2 bg-soft rounded">{{ selectedImage.displayName }}</div>
          </div>

          <!-- Metadata table -->
          <div class="grid grid-cols-2 gap-3 text-xs bg-soft/50 rounded-btn p-3">
            <div>
              <span class="text-text-muted">{{ $t('mediaLibrary.folder') }}</span>
              <div class="mt-1 font-semibold text-text-main" @click.stop>
                <select
                  :value="selectedImage.folderId || ''"
                  @change="(e) => moveImage(selectedImage!.key, (e.target as HTMLSelectElement).value || null)"
                  class="bg-transparent border-0 p-0 text-xs font-semibold text-text-main focus:outline-none cursor-pointer"
                >
                  <option value="">{{ $t('mediaLibrary.uncategorized') }}</option>
                  <option v-for="f in customFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
                </select>
              </div>
            </div>
            <div>
              <span class="text-text-muted">{{ $t('mediaLibrary.uploaderHeader') }}</span>
              <div class="mt-1 font-semibold text-text-main">{{ selectedImage.uploaderName }}</div>
            </div>
            <div>
              <span class="text-text-muted">{{ $t('mediaLibrary.uploadDate') }}</span>
              <div class="mt-1 font-semibold text-text-main">{{ fmtDateFull(selectedImage.createdAt) }}</div>
            </div>
            <div>
              <span class="text-text-muted">{{ $t('mediaLibrary.dimensions') }}</span>
              <div class="mt-1 font-semibold text-text-main font-mono text-[11px]">{{ imageDimensions }}</div>
            </div>
            <div>
              <span class="text-text-muted">{{ $t('mediaLibrary.fileType') }}</span>
              <div class="mt-1 font-semibold text-text-main">{{ selectedImage.fileType }}</div>
            </div>
            <div>
              <span class="text-text-muted">{{ $t('mediaLibrary.fileSize') }}</span>
              <div class="mt-1 font-semibold text-text-main">{{ fmt(selectedImage.fileSize) }}</div>
            </div>
          </div>

          <!-- URL bar -->
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-text-soft">{{ $t('mediaLibrary.imageUrl') }}</label>
            <div class="flex gap-2 mt-1">
              <input
                type="text"
                readonly
                :value="selectedImage.url"
                class="flex-1 bg-soft border border-border/80 text-[11px] font-mono rounded px-2.5 py-1.5 focus:outline-none text-text-muted truncate"
                @click="(e) => (e.target as HTMLInputElement).select()"
              />
              <button type="button" class="btn-secondary h-8 py-1.5 px-3 text-xs" @click="copyUrl(selectedImage)">
                {{ $t('mediaLibrary.copy') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Drawer Footer (Quick Actions) -->
      <div v-if="selectedImage" class="border-t border-border bg-soft/40 px-5 py-4 shrink-0 flex flex-col gap-2">
        <div class="text-[10px] font-bold uppercase tracking-wider text-text-soft mb-1">{{ $t('mediaLibrary.actionsHeader') }}</div>
        <div class="grid grid-cols-2 gap-2">
          <a :href="selectedImage.url" target="_blank" rel="noopener" class="btn-secondary py-2 text-xs flex justify-center items-center">
            {{ $t('mediaLibrary.openOriginal') }}
          </a>
          <button type="button" class="btn-secondary py-2 text-xs flex justify-center items-center gap-1.5" @click="downloadSingleImage(selectedImage)">
            <span v-html="ICON_SVG.download" />
            {{ $t('mediaLibrary.download') }}
          </button>
          <button
            v-if="canManageImage(selectedImage)"
            type="button"
            class="btn-danger py-2 text-xs col-span-2 flex justify-center items-center"
            @click="deleteImage(selectedImage)"
          >
            {{ $t('mediaLibrary.deletePermanently') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ STICKY BOTTOM BULK ACTION BAR ════════ -->
    <div
      v-if="selectedImageKeys.length > 0"
      class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-card border border-border shadow-xl rounded-card px-4 py-3 flex items-center justify-between gap-5 max-w-xl w-[90%] md:w-auto"
    >
      <div class="flex items-center gap-2">
        <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-bold">
          {{ selectedImageKeys.length }}
        </span>
        <span class="text-xs font-bold text-text-main">{{ $t('mediaLibrary.selected') }}</span>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <!-- Move Selected select dropdown -->
        <div class="flex items-center border border-border/80 rounded bg-soft px-2 py-1 select-wrap max-w-[150px]">
          <span v-html="ICON_SVG.folder" class="shrink-0 text-text-soft scale-90 mr-1" />
          <select
            class="bg-transparent border-0 p-0 text-xs font-semibold text-text-muted outline-none cursor-pointer w-full text-ellipsis"
            @change="(e) => bulkMoveToFolder((e.target as HTMLSelectElement).value || null)"
            value=""
          >
            <option value="" disabled selected>{{ $t('mediaLibrary.moveTo') }}</option>
            <option value="">{{ $t('mediaLibrary.uncategorized') }}</option>
            <option v-for="f in customFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
        </div>

        <button type="button" class="btn-secondary h-8 py-1.5 px-3 text-xs" @click="bulkCopyUrls">
          {{ $t('mediaLibrary.copyUrls') }}
        </button>
        
        <button type="button" class="btn-secondary h-8 py-1.5 px-3 text-xs" @click="bulkDownloadSelected" :title="$t('mediaLibrary.download')">
          {{ $t('mediaLibrary.download') }}
        </button>

        <button type="button" class="btn-danger h-8 py-1.5 px-3 text-xs" @click="bulkDeleteSelected">
          {{ $t('mediaLibrary.delete') }}
        </button>
        
        <button type="button" class="btn-ghost h-8 px-2 text-xs font-bold text-text-muted hover:text-text-main" @click="clearSelection">
          {{ $t('mediaLibrary.cancel') }}
        </button>
      </div>
    </div>

    <!-- Toast Notification -->
    <Transition name="img-toast">
      <div v-if="toastVisible" class="img-toast">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ toastMsg }}
      </div>
    </Transition>

    <!-- ════════ MOBILE FOLDER ACTIONS MODAL ════════ -->
    <div
      v-if="mobileFolderMenuFolder"
      class="md:hidden fixed inset-0 z-50 bg-black/60 flex items-end justify-center backdrop-blur-sm"
      @click="mobileFolderMenuFolder = null"
    >
      <div
        class="bg-card w-full rounded-t-card border-t border-border p-5 space-y-4 max-h-[60%] overflow-y-auto"
        @click.stop
      >
        <div class="flex items-center justify-between border-b border-border pb-2">
          <h4 class="text-xs font-bold uppercase tracking-wider text-text-soft">{{ $t('mediaLibrary.folder') }}: {{ mobileFolderMenuFolder.name }}</h4>
          <button class="text-text-muted hover:text-text-main p-1 font-bold text-xs" @click="mobileFolderMenuFolder = null">✕</button>
        </div>
        <div class="flex flex-col gap-2">
          <button
            v-if="canManageFolder(mobileFolderMenuFolder)"
            type="button"
            class="w-full text-left py-2.5 px-3 text-xs font-semibold text-text-main hover:bg-soft rounded-btn"
            @click="startMobileFolderRename"
          >
            {{ $t('mediaLibrary.renameFolder') }}
          </button>
          <button
            v-if="canManageFolder(mobileFolderMenuFolder)"
            type="button"
            class="w-full text-left py-2.5 px-3 text-xs font-semibold text-status-needs-fix-fg hover:bg-soft rounded-btn"
            @click="deleteFolder(mobileFolderMenuFolder.id); mobileFolderMenuFolder = null"
          >
            {{ $t('mediaLibrary.deleteFolder') }}
          </button>
          <button
            type="button"
            class="w-full text-left py-2.5 px-3 text-xs font-semibold text-text-main hover:bg-soft rounded-btn"
            @click="copyFolderLink(mobileFolderMenuFolder.id); mobileFolderMenuFolder = null"
          >
            {{ $t('mediaLibrary.copyLink') }}
          </button>
          <button
            v-if="selectedImageKeys.length > 0"
            type="button"
            class="w-full text-left py-2.5 px-3 text-xs font-bold text-primary hover:bg-soft rounded-btn border-t border-border/40 mt-1"
            @click="bulkMoveToFolder(mobileFolderMenuFolder.id); mobileFolderMenuFolder = null"
          >
            {{ $t('mediaLibrary.moveSelectedHere') }}
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ CSV EXPORT MODAL ════════ -->
    <Modal
      :open="showExportModal"
      :title="$t('mediaLibrary.manageFoldersTitle')"
      :subtitle="$t('mediaLibrary.manageFoldersSubtitle')"
      size="xl"
      @close="showExportModal = false"
    >
      <div class="space-y-3 text-[11px] text-text-main leading-tight">
        
        <!-- 2-Column Wide Grid Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          <!-- LEFT SIDE: Folders Selection List (Takes 7 columns of 12) -->
          <div class="lg:col-span-7 flex flex-col gap-2.5 min-w-0">
            <div class="flex items-center justify-between border-b border-border/40 pb-1.5">
              <h3 class="text-[11px] font-bold text-text-soft uppercase tracking-wider">{{ $t('mediaLibrary.selectFolders') }}</h3>
              <span class="text-text-muted font-mono text-[9px]">
                {{ $t('mediaLibrary.showingFoldersCount', { count: filteredExportFolders.length, total: exportFoldersList.length }) }}
              </span>
            </div>

            <!-- Search bar & Clear selection -->
            <div class="flex gap-2">
              <!-- Search Input -->
              <div class="relative flex-1">
                <span class="absolute inset-y-0 left-0 flex items-center pl-2.5 text-text-muted pointer-events-none">
                  <svg class="h-3.5 w-3.5 text-text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="text"
                  v-model="exportSearchQuery"
                  :placeholder="$t('mediaLibrary.searchFoldersByName')"
                  class="w-full pl-8 pr-7 py-1.5 bg-soft/20 border border-border rounded-xl text-[11px] text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder-text-muted/65 transition-colors"
                />
                <button
                  v-if="exportSearchQuery"
                  type="button"
                  @click="exportSearchQuery = ''"
                  class="absolute inset-y-0 right-0 pr-2.5 flex items-center text-text-muted hover:text-text-main"
                >
                  <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <!-- Clear Selection Button -->
              <button
                type="button"
                class="btn-secondary h-8 px-3 text-[11px] font-semibold rounded-lg flex items-center gap-1 shrink-0 transition-all"
                @click="clearExportSelection"
              >
                {{ $t('mediaLibrary.clearSelection') }}
              </button>
            </div>

            <!-- Bulk Actions / Quick Filters -->
            <div class="flex items-center justify-between gap-3 px-1 py-0.5 text-[10px]">
              <div class="flex items-center gap-3">
                <label class="flex items-center gap-1.5 cursor-pointer select-none text-text-main hover:text-text-main/80 transition-colors">
                  <input
                    type="checkbox"
                    v-model="isAllSelected"
                    class="rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer h-3 w-3"
                  />
                  <span class="font-semibold">{{ $t('mediaLibrary.selectAll') }}</span>
                </label>
                
                <label class="flex items-center gap-1.5 cursor-pointer select-none text-text-main hover:text-text-main/80 transition-colors">
                  <input
                    type="checkbox"
                    v-model="exportImagesOnlyFilter"
                    class="rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer h-3 w-3"
                  />
                  <span class="font-semibold">{{ $t('mediaLibrary.withImagesOnly') }}</span>
                </label>
              </div>

              <span class="text-primary font-bold text-[9px] uppercase tracking-wider bg-primary/10 px-1.5 py-0.25 rounded border border-primary/20">
                {{ $t('mediaLibrary.selectedBadge', { count: selectedExportFolderIds.length }) }}
              </span>
            </div>

            <!-- Scrollable Folder List -->
            <div class="border border-border rounded-xl bg-soft/5 flex flex-col overflow-hidden">
              <div class="overflow-y-auto divide-y divide-border/40 max-h-[260px] min-h-[260px]">
                <!-- Folder item layout -->
                <label
                  v-for="folder in filteredExportFolders"
                  :key="folder.id"
                  class="flex items-center gap-2.5 p-2 hover:bg-soft/30 cursor-pointer select-none transition-all border-b border-border/30 last:border-0"
                  :class="selectedExportFolderIds.includes(folder.id) ? 'bg-soft/20 border-l-2 border-l-primary pl-1.5' : ''"
                >
                  <!-- Checkbox -->
                  <input
                    type="checkbox"
                    :value="folder.id"
                    v-model="selectedExportFolderIds"
                    class="rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0 h-3.5 w-3.5"
                  />
                  
                  <!-- Folder Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <span class="truncate font-bold text-text-main text-[11px]" :title="folder.name">
                        {{ folder.name }}
                      </span>
                    </div>
                    <div class="mt-0.5 text-[9px] text-text-muted flex items-center gap-1.5 flex-wrap">
                      <span>{{ $t('mediaLibrary.imagesCount', { count: folder.imageCount }) }}</span>
                      <span class="text-text-muted/40">•</span>
                      <span>{{ folder.isVirtual ? 'N/A' : (folder.hasFeature ? $t('mediaLibrary.featureSelected') : $t('mediaLibrary.missingFeatureImage')) }}</span>
                      <span class="text-text-muted/40">•</span>
                      <span>{{ $t('mediaLibrary.orderedCount', { count: folder.orderedCount }) }}</span>
                    </div>
                  </div>

                  <!-- Status Chip -->
                  <div class="shrink-0 flex items-center">
                    <span
                      v-if="folder.imageCount === 0"
                      class="px-1.5 py-0.25 rounded text-[7.5px] bg-status-needs-fix-bg/10 text-status-needs-fix-fg border border-status-needs-fix-bg/20 font-bold uppercase tracking-wide"
                    >
                      {{ $t('mediaLibrary.empty') }}
                    </span>
                    <span
                      v-else-if="!folder.isVirtual && !folder.hasFeature"
                      class="px-1.5 py-0.25 rounded text-[7.5px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wide font-medium"
                    >
                      {{ $t('mediaLibrary.missingFeatureImage') }}
                    </span>
                    <span
                      v-else
                      class="px-1.5 py-0.25 rounded text-[7.5px] bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wide"
                    >
                      {{ $t('mediaLibrary.ready') }}
                    </span>
                  </div>
                </label>
                
                <div v-if="filteredExportFolders.length === 0" class="p-6 text-center text-text-muted italic flex flex-col items-center justify-center h-[260px]">
                  <svg class="w-7 h-7 text-text-muted/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {{ $t('mediaLibrary.noFoldersMatchSearch') }}
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT SIDE: Summary, Options, and Warnings (Takes 5 columns of 12) -->
          <div class="lg:col-span-5 flex flex-col gap-2.5">
            
            <!-- Summary Section -->
            <div class="border border-border rounded-xl p-2 bg-soft/10 space-y-1.5">
              <h4 class="font-bold text-[8.5px] text-text-soft uppercase tracking-wider flex items-center justify-between">
                <span>{{ $t('mediaLibrary.exportSummary') }}</span>
                <span class="w-1 h-1 rounded-full bg-primary"></span>
              </h4>
              
              <!-- Stat Grid -->
              <div class="grid grid-cols-2 gap-1">
                <!-- Selected Folders -->
                <div class="bg-card/40 border border-border/50 rounded-lg p-1.5 flex flex-col justify-between">
                  <span class="text-[7.5px] text-text-muted uppercase tracking-wider font-semibold">{{ $t('mediaLibrary.selectedFolders') }}</span>
                  <span class="text-xs font-extrabold text-text-main mt-0.5 leading-none">{{ selectedFoldersStats.count }}</span>
                </div>
                <!-- Ready Folders -->
                <div class="bg-card/40 border border-border/50 rounded-lg p-1.5 flex flex-col justify-between">
                  <span class="text-[7.5px] text-text-muted uppercase tracking-wider font-semibold">{{ $t('mediaLibrary.readyFolders') }}</span>
                  <span class="text-xs font-extrabold text-primary mt-0.5 leading-none">{{ selectedFoldersStats.readyFoldersCount }}</span>
                </div>
                <!-- Empty Folders Skipped -->
                <div class="bg-card/40 border border-border/50 rounded-lg p-1.5 flex flex-col justify-between">
                  <span class="text-[7.5px] text-text-muted uppercase tracking-wider font-semibold">{{ $t('mediaLibrary.emptySkipped') }}</span>
                  <span class="text-xs font-extrabold mt-0.5 leading-none" :class="selectedFoldersStats.skippedEmpty > 0 ? 'text-status-needs-fix-fg font-black' : 'text-text-muted'">
                    {{ selectedFoldersStats.skippedEmpty }}
                  </span>
                </div>
                <!-- Missing Feature -->
                <div class="bg-card/40 border border-border/50 rounded-lg p-1.5 flex flex-col justify-between">
                  <span class="text-[7.5px] text-text-muted uppercase tracking-wider font-semibold">{{ $t('mediaLibrary.missingFeature') }}</span>
                  <span class="text-xs font-extrabold mt-0.5 leading-none" :class="selectedFoldersStats.missingFeature > 0 ? 'text-amber-500 font-black' : 'text-text-muted'">
                    {{ selectedFoldersStats.missingFeature }}
                  </span>
                </div>
              </div>

              <!-- Total Image URLs (Full Width Highlight) -->
              <div class="bg-primary/5 border border-primary/20 rounded-lg p-1.5 flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="text-[7.5px] text-primary uppercase tracking-wider font-bold">{{ $t('mediaLibrary.totalImageUrls') }}</span>
                  <span class="text-[8.5px] text-text-muted mt-0.5">{{ $t('mediaLibrary.urlsIncludedInCsv') }}</span>
                </div>
                <span class="text-sm font-black text-primary font-mono leading-none">{{ selectedFoldersStats.totalUrls }}</span>
              </div>
            </div>

            <!-- Options Section -->
            <div class="border border-border rounded-xl p-2 bg-soft/10 space-y-2 flex-1 flex flex-col justify-between">
              <div class="space-y-2">
                <h4 class="font-bold text-[8.5px] text-text-soft uppercase tracking-wider">{{ $t('mediaLibrary.exportOptions') }}</h4>
                
                <div class="space-y-2">
                  <!-- Option: Export Scope (Export Selected vs Filtered vs All) -->
                  <div class="space-y-1 text-left">
                    <span class="font-semibold text-text-main text-[10px] block leading-tight">Export Scope</span>
                    <div class="flex flex-col gap-1 bg-soft/30 p-1.5 rounded-lg border border-border/40">
                      <label class="flex items-center gap-1.5 cursor-pointer text-[10px] text-text-main">
                        <input type="radio" value="selected" v-model="exportScope" class="accent-primary" />
                        <span>Selected Products Only ({{ selectedExportFolderIds.length }} selected)</span>
                      </label>
                      <label class="flex items-center gap-1.5 cursor-pointer text-[10px] text-text-main">
                        <input type="radio" value="filtered" v-model="exportScope" class="accent-primary" />
                        <span>Filtered Dashboard Products ({{ filteredFolders.length }} visible)</span>
                      </label>
                      <label class="flex items-center gap-1.5 cursor-pointer text-[10px] text-text-main">
                        <input type="radio" value="all" v-model="exportScope" class="accent-primary" />
                        <span>All Products ({{ customFolders.length }} total)</span>
                      </label>
                    </div>
                  </div>

                  <!-- Option: Output format (CSV plain-text vs JSON HTML-preserving) -->
                  <div class="space-y-1">
                    <span class="font-semibold text-text-main text-[10px] block leading-tight">{{ $t('mediaLibrary.exportFormatLabel') }}</span>
                    <div class="flex gap-1">
                      <button
                        type="button"
                        @click="exportFormat = 'csv'"
                        :class="exportFormat === 'csv' ? 'bg-primary text-white border-primary' : 'bg-card/30 text-text-muted border-border'"
                        class="flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border transition-colors"
                      >CSV</button>
                      <button
                        type="button"
                        @click="exportFormat = 'json'"
                        :class="exportFormat === 'json' ? 'bg-primary text-white border-primary' : 'bg-card/30 text-text-muted border-border'"
                        class="flex-1 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border transition-colors"
                      >JSON</button>
                    </div>
                  </div>

                  <!-- CSV Specific Layout Options -->
                  <div v-if="exportFormat === 'csv'" class="space-y-2 border-t border-border/30 pt-1.5">
                    <!-- CSV Format Type -->
                    <div class="space-y-1 text-left">
                      <span class="font-semibold text-text-main text-[10px] block leading-tight">CSV Export Format</span>
                      <select
                        v-model="csvExportType"
                        class="w-full bg-soft border border-border/80 rounded-lg px-2 py-1 text-[10px] text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      >
                        <option value="woocommerce">WordPress/WooCommerce CSV</option>
                        <option value="framework">Framework CSV</option>
                        <option value="simple">Simple CSV</option>
                      </select>
                    </div>

                    <!-- Include Header Row Checkbox -->
                    <label class="flex items-center gap-1.5 cursor-pointer select-none text-left">
                      <input
                        type="checkbox"
                        v-model="exportIncludeHeaderRow"
                        class="rounded border-border text-primary focus:ring-primary/20 accent-primary h-3.5 w-3.5"
                      />
                      <span class="font-semibold text-text-main text-[10px]">Include Header Row</span>
                    </label>
                  </div>

                  <hr class="border-border/40 my-1.5" />

                  <!-- Option: Skip Empty -->
                  <label class="flex items-start gap-1.5 cursor-pointer select-none group text-left">
                    <input
                      type="checkbox"
                      v-model="skipEmptyFolders"
                      class="rounded border-border text-primary focus:ring-primary/20 accent-primary mt-0.5 h-3 w-3 transition-colors animate-none"
                    />
                    <div>
                      <span class="font-semibold text-text-main text-[10px] block leading-tight group-hover:text-primary transition-colors">{{ $t('mediaLibrary.skipEmptyFolders') }}</span>
                      <span class="text-[8.5px] text-text-muted block mt-0.25 leading-tight">{{ $t('mediaLibrary.skipEmptyFoldersDesc') }}</span>
                    </div>
                  </label>
                  
                  <!-- Option: Include folders without feature image -->
                  <label class="flex items-start gap-1.5 cursor-pointer select-none group text-left">
                    <input
                      type="checkbox"
                      v-model="includeNoFeatureFolders"
                      class="rounded border-border text-primary focus:ring-primary/20 accent-primary mt-0.5 h-3 w-3 transition-colors animate-none"
                    />
                    <div>
                      <span class="font-semibold text-text-main text-[10px] block leading-tight group-hover:text-primary transition-colors">{{ $t('mediaLibrary.includeNoFeatureFolders') }}</span>
                      <span class="text-[8.5px] text-text-muted block mt-0.25 leading-tight font-normal">{{ $t('mediaLibrary.includeNoFeatureFoldersDesc') }}</span>
                    </div>
                  </label>

                  <!-- Option: Include folder content fields -->
                  <label class="flex items-start gap-1.5 cursor-pointer select-none group text-left">
                    <input
                      type="checkbox"
                      v-model="exportIncludeContentFields"
                      class="rounded border-border text-primary focus:ring-primary/20 accent-primary mt-0.5 h-3 w-3 transition-colors animate-none"
                    />
                    <div>
                      <span class="font-semibold text-text-main text-[10px] block leading-tight group-hover:text-primary transition-colors">{{ $t('mediaLibrary.includeFolderContentFields') }}</span>
                      <span class="text-[8.5px] text-text-muted block mt-0.25 leading-tight">{{ $t('mediaLibrary.includeFolderContentFieldsDesc') }}</span>
                    </div>
                  </label>

                  <hr class="border-border/40 my-1.5" />

                  <!-- Locked/Always-on features in premium representation -->
                  <div class="space-y-1 bg-card/20 p-1.5 rounded-lg border border-border/40 text-left">
                    <div class="text-[8px] text-text-soft font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <svg class="w-2.5 h-2.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      {{ $t('mediaLibrary.lockedPresetConfigs') }}
                    </div>
                    
                    <div class="flex items-center justify-between text-[8.5px] text-text-muted">
                      <span class="font-medium">{{ $t('mediaLibrary.useFeatureImageFirst') }}</span>
                      <span class="bg-primary/10 text-primary border border-primary/20 font-bold uppercase text-[7px] tracking-wider px-1 py-0.25 rounded">{{ $t('mediaLibrary.alwaysOn') }}</span>
                    </div>
                    <div class="flex items-center justify-between text-[8.5px] text-text-muted">
                      <span class="font-medium">{{ $t('mediaLibrary.useSavedGalleryOrder') }}</span>
                      <span class="bg-primary/10 text-primary border border-primary/20 font-bold uppercase text-[7px] tracking-wider px-1 py-0.25 rounded">{{ $t('mediaLibrary.alwaysOn') }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Warnings (Slim alert design) -->
        <div v-if="(selectedFoldersStats.missingFeature > 0 && includeNoFeatureFolders) || (selectedFoldersStats.emptyFolders > 0 && !skipEmptyFolders)" class="bg-status-needs-fix-bg/10 border border-status-needs-fix-bg/25 rounded-lg p-2 text-status-needs-fix-fg flex items-start gap-1.5 text-[10px]">
          <span class="text-xs leading-none mt-0.5">{{ $t('⚠️') }}</span>
          <div class="flex-1 space-y-0.5">
            <div v-if="selectedFoldersStats.missingFeature > 0 && includeNoFeatureFolders" v-html="$t('mediaLibrary.warningMissingFeature', { count: selectedFoldersStats.missingFeature })"></div>
            <div v-if="selectedFoldersStats.emptyFolders > 0 && !skipEmptyFolders" v-html="$t('mediaLibrary.warningEmptyFolders', { count: selectedFoldersStats.emptyFolders })"></div>
          </div>
        </div>

        <!-- Export Preview (Compact box, first 5 rows) -->
        <div v-if="selectedExportFolderIds.length > 0" class="space-y-1 border-t border-border/40 pt-2.5">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-[8.5px] text-text-soft uppercase tracking-wider">{{ $t('mediaLibrary.exportPreviewTitle') }}</h4>
            <span class="text-[9px] text-text-muted">{{ $t('mediaLibrary.exportPreviewDesc') }}</span>
          </div>
          <div class="border border-border/60 rounded-xl bg-soft/5 overflow-hidden">
            <div class="max-h-[110px] overflow-y-auto">
              <table class="w-full text-[9.5px] text-left border-collapse">
                <thead>
                  <tr class="bg-soft/40 border-b border-border/80 font-bold text-text-soft sticky top-0 z-10">
                    <th class="p-1.5 pl-2.5">{{ $t('mediaLibrary.folderNameHeader') }}</th>
                    <th class="p-1.5 text-center">{{ $t('mediaLibrary.images') }}</th>
                    <th class="p-1.5 text-center">{{ $t('mediaLibrary.featureImage') }}</th>
                    <th class="p-1.5 text-center">{{ $t('mediaLibrary.exportStatusHeader') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/40">
                  <tr v-for="row in previewRows" :key="row.name" class="hover:bg-soft/20 transition-colors">
                    <td class="p-1.5 pl-2.5 font-semibold text-text-main truncate max-w-[200px]" :title="row.name">
                      {{ row.name }}
                    </td>
                    <td class="p-1.5 text-center text-text-muted font-mono font-bold">{{ row.imageCount }}</td>
                    <td class="p-1.5 text-center">
                      <span :class="row.featureStatus.startsWith('✓') ? 'text-primary font-bold' : row.featureStatus.startsWith('❌') ? 'text-status-needs-fix-fg/80' : 'text-text-muted'">
                        {{ row.featureStatus }}
                      </span>
                    </td>
                    <td class="p-1.5 text-center">
                      <span
                        class="px-1.5 py-0.25 rounded text-[9px] font-bold"
                        :class="row.statusCode === 'ready' || row.statusCode === 'readyEmpty' ? 'bg-primary/10 text-primary' : row.statusCode === 'skipped' ? 'bg-soft text-text-muted' : 'bg-status-needs-fix-bg/10 text-status-needs-fix-fg'"
                      >
                        {{ row.status }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
      </div>
      
      <template #footer>
        <div class="flex items-center justify-between gap-3 w-full">
          <!-- Warnings / Helper text for disabled state -->
          <div class="text-[10px] shrink-0 select-none">
            <span v-if="selectedExportFolderIds.length === 0" class="text-status-needs-fix-fg font-semibold flex items-center gap-1.5">
              ⚠️ {{ $t('mediaLibrary.toast.exportSelectFolder') }}
            </span>
            <span v-else-if="selectedFoldersStats.readyFoldersCount === 0" class="text-status-needs-fix-fg font-semibold flex items-center gap-1.5">
              ⚠️ {{ $t('mediaLibrary.toast.exportNoValidFolders') }}
            </span>
            <span v-else class="text-text-muted" v-html="$t('mediaLibrary.readyToExport', { count: selectedFoldersStats.readyFoldersCount, total: selectedFoldersStats.totalUrls })"></span>
          </div>

          <div class="flex items-center gap-2 ml-auto">
            <button
              type="button"
              class="btn-ghost py-1 px-3.5 text-[11px] font-semibold h-8 rounded-lg transition-all"
              @click="showExportModal = false"
              :disabled="exportingCsv || processingTrash"
            >
              {{ $t('mediaLibrary.cancel') }}
            </button>

            <!-- Move selected folders to Trash (reversible) -->
            <button
              type="button"
              class="py-1 px-4 text-[11px] font-bold h-8 rounded-lg flex items-center gap-1.5 border border-status-needs-fix-bg/60 text-status-needs-fix-fg hover:bg-status-needs-fix-bg/15 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              @click="deleteSelectedFolders"
              :disabled="exportingCsv || processingTrash || deletableSelectedFolderIds.length === 0"
              :title="deletableSelectedFolderIds.length === 0 ? $t('mediaLibrary.deleteSelectNoneHint') : ''"
            >
              <svg v-if="processingTrash" class="animate-spin -ml-0.5" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              </svg>
              {{ $t('mediaLibrary.moveToTrashBtn', { count: deletableSelectedFolderIds.length }) }}
            </button>

            <button
              type="button"
              class="btn-primary py-1 px-4 text-[11px] font-bold h-8 rounded-lg shadow-md flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all"
              @click="triggerCsvExport"
              :disabled="exportingCsv || processingTrash || selectedExportFolderIds.length === 0 || selectedFoldersStats.readyFoldersCount === 0"
            >
              <svg v-if="exportingCsv" class="animate-spin -ml-0.5 mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ exportingCsv ? $t('mediaLibrary.exporting') : (exportFormat === 'json' ? $t('mediaLibrary.exportSelectedJson') : $t('mediaLibrary.exportSelectedCsv')) }}
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- ════════ TRASH MODAL ════════ -->
    <Modal
      :open="showTrashModal"
      :title="$t('mediaLibrary.trashTitle')"
      :subtitle="$t('mediaLibrary.trashSubtitle')"
      size="lg"
      @close="showTrashModal = false"
    >
      <div v-if="trashedFolders.length === 0" class="py-10 text-center text-text-muted text-xs">
        {{ $t('mediaLibrary.trashEmpty') }}
      </div>
      <ul v-else class="divide-y divide-border/40 max-h-[58vh] overflow-y-auto">
        <li v-for="f in trashedFolders" :key="f.id" class="flex items-center gap-3 py-2.5">
          <span class="shrink-0 w-7 h-7 rounded-lg bg-soft/40 border border-border/60 flex items-center justify-center text-text-soft">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 7h18M5 7l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
            </svg>
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-xs font-bold text-text-main truncate" :title="f.name">{{ f.name }}</p>
            <p class="text-[10px] text-text-muted">
              {{ $t('mediaLibrary.imagesCount', { count: getFolderImageCount(f.id) }) }}
              <span v-if="f.deleted_at"> · {{ $t('mediaLibrary.trashedOn', { date: fmtDateFull(f.deleted_at) }) }}</span>
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-md border border-border hover:border-primary hover:text-primary disabled:opacity-40 transition-colors"
            :disabled="processingTrash || !canManageFolder(f)"
            @click="restoreFolder(f)"
          >
            {{ $t('mediaLibrary.restore') }}
          </button>
          <button
            type="button"
            class="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-md border border-status-needs-fix-bg/60 text-status-needs-fix-fg hover:bg-status-needs-fix-bg/15 disabled:opacity-40 transition-colors"
            :disabled="processingTrash || !canManageFolder(f)"
            @click="deleteFolderPermanently(f)"
          >
            {{ $t('mediaLibrary.deletePermanently') }}
          </button>
        </li>
      </ul>

      <template #footer>
        <div class="flex items-center justify-between gap-3 w-full">
          <span class="text-[10px] text-text-muted">{{ $t('mediaLibrary.trashFooterHint') }}</span>
          <button type="button" class="btn-ghost py-1 px-4 text-[11px] font-semibold h-8 rounded-lg" @click="showTrashModal = false">
            {{ $t('mediaLibrary.cancel') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- ════════ SCAN & IMPORT MODAL ════════ -->
    <Modal
      :open="showImportModal"
      title="Scan & Import Product Data"
      subtitle="Scan a WooCommerce product category and safely match SKU + descriptions to your folders. Nothing changes until you Apply."
      size="xxl"
      panelClass="h-[90vh] max-h-[90vh] flex flex-col overflow-hidden"
      bodyClass="flex-1 min-h-0 overflow-hidden flex flex-col !p-0"
      @close="showImportModal = false"
    >
      <div class="flex flex-col h-full overflow-hidden">
        <!-- Sticky Top Panel -->
        <div class="border-b border-border bg-card p-5 space-y-4 shrink-0 shadow-sm">
          <!-- URL + Scan input -->
          <div class="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div class="flex-1 min-w-0">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-text-soft mb-1">Source category URL</label>
              <input
                v-model="importSourceUrl"
                type="url"
                placeholder="https://typhonmachinery.com/product-category/equipment/"
                class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-[11px] focus:outline-none focus:border-primary/50 text-text-main placeholder-text-muted/50"
              />
            </div>
            <button type="button" class="btn-primary py-2 px-5 text-xs flex items-center gap-2 shrink-0 font-bold" :disabled="importScanning" @click="runScan">
              <svg v-if="importScanning" class="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>
              {{ importScanning ? 'Scanning…' : 'Scan Category' }}
            </button>
          </div>

          <div v-if="importError" class="rounded-lg border border-status-needs-fix-bg bg-status-needs-fix-bg/15 text-status-needs-fix-fg px-3 py-2 text-xs">
            {{ importError }}
          </div>

          <div v-if="importScanning && importProgress" class="rounded-lg border border-primary/30 bg-primary/10 text-primary px-3 py-2 text-xs flex items-center gap-2">
            <svg class="animate-spin shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" /></svg>
            <span>{{ importProgress }}</span>
          </div>

          <!-- Summary Stats Cards -->
          <div v-if="importRows.length" class="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <!-- Scanned Card -->
            <div class="bg-soft/20 border border-border/40 p-2.5 rounded-xl flex flex-col justify-between">
              <span class="text-[9px] text-text-muted font-bold uppercase tracking-wider">Scanned</span>
              <span class="text-xl font-bold text-text-main mt-1 leading-none font-mono">{{ importScannedCount }}</span>
            </div>
            <!-- Ready Card -->
            <div class="bg-emerald-500/10 border border-emerald-500/25 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer hover:bg-emerald-500/15 transition-all" @click="importStatusFilter = 'ready'">
              <span class="text-[9px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span> Ready
              </span>
              <span class="text-xl font-bold text-emerald-400 mt-1 leading-none font-mono">{{ readyCount }}</span>
            </div>
            <!-- Needs Review Card -->
            <div class="bg-amber-500/10 border border-amber-500/25 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer hover:bg-amber-500/15 transition-all" @click="importStatusFilter = 'needs_review'">
              <span class="text-[9px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span> Review
              </span>
              <span class="text-xl font-bold text-amber-400 mt-1 leading-none font-mono">{{ reviewCount }}</span>
            </div>
            <!-- No Match Card -->
            <div class="bg-zinc-500/10 border border-zinc-500/25 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer hover:bg-zinc-500/15 transition-all" @click="importStatusFilter = 'no_match'">
              <span class="text-[9px] text-zinc-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-zinc-400"></span> No Match
              </span>
              <span class="text-xl font-bold text-zinc-400 mt-1 leading-none font-mono">{{ noMatchCount }}</span>
            </div>
            <!-- Conflicts Card -->
            <div class="bg-rose-500/10 border border-rose-500/25 p-2.5 rounded-xl flex flex-col justify-between cursor-pointer hover:bg-rose-500/15 transition-all" @click="importStatusFilter = 'conflict'">
              <span class="text-[9px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <span class="h-1.5 w-1.5 rounded-full bg-rose-400"></span> Conflicts
              </span>
              <span class="text-xl font-bold text-rose-400 mt-1 leading-none font-mono">{{ conflictCount }}</span>
            </div>
          </div>

          <!-- Filters Row -->
          <div v-if="importRows.length" class="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-1">
            <div class="flex items-center gap-1.5">
              <span class="text-text-muted font-semibold mr-1.5">Status:</span>
              <button
                v-for="filter in importStatusFilterOptions"
                :key="filter.value"
                type="button"
                class="h-7 rounded-lg border px-3 text-xs transition-all font-semibold"
                :class="importStatusFilter === filter.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:text-text-main hover:bg-soft/10'"
                @click="importStatusFilter = filter.value"
              >
                {{ filter.label }}
              </button>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-text-muted font-semibold mr-1.5">Type:</span>
              <button
                v-for="filter in importTypeFilterOptions"
                :key="filter.value"
                type="button"
                class="h-7 rounded-lg border px-3 text-xs transition-all font-semibold"
                :class="importTypeFilter === filter.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:text-text-main hover:bg-soft/10'"
                @click="importTypeFilter = filter.value"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Main Body Workspace -->
        <div v-if="importRows.length" class="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden bg-background">
          <!-- LEFT SIDE: Folders / Matches list table (7/12 cols) -->
          <div
            v-show="isLargeScreen || activeMobileTab === 'list'"
            class="lg:col-span-7 flex flex-col h-full border-r border-border/40 overflow-hidden"
          >
            <!-- Check/Action header of Left side -->
            <div class="bg-soft/10 px-4 py-2 border-b border-border/40 flex items-center justify-between shrink-0 text-xs">
              <div class="flex items-center gap-2">
                <input
                  type="checkbox"
                  class="rounded border-border text-primary focus:ring-primary/20 accent-primary"
                  :checked="selectedRowIds.length > 0 && selectedRowIds.length === filteredImportRows.filter(r => r.status === 'ready' || r.status === 'verified_match').length"
                  :indeterminate="selectedRowIds.length > 0 && selectedRowIds.length < filteredImportRows.filter(r => r.status === 'ready' || r.status === 'verified_match').length"
                  @change="(e) => {
                    const checked = (e.target as HTMLInputElement).checked;
                    if (checked) {
                      selectedRowIds = filteredImportRows
                        .filter(r => r.status === 'ready' || r.status === 'verified_match')
                        .map(r => r.folderId);
                    } else {
                      selectedRowIds = [];
                    }
                  }"
                />
                <span class="text-text-muted font-medium">Select All Ready ({{ filteredImportRows.filter(r => r.status === 'ready' || r.status === 'verified_match').length }})</span>
              </div>
              <span class="text-text-muted font-mono">{{ filteredImportRows.length }} matching folders</span>
            </div>

            <!-- Table content -->
            <div class="flex-1 overflow-auto">
              <table class="w-full text-xs text-left border-collapse">
                <thead>
                  <tr class="bg-soft/20 text-text-soft border-b border-border/40 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10">
                    <th class="w-10 px-4 py-2.5"></th>
                    <th class="px-3 py-2.5">Folder</th>
                    <th class="px-3 py-2.5">Matched Product</th>
                    <th class="w-16 px-3 py-2.5 text-center">Conf.</th>
                    <th class="w-24 px-3 py-2.5 text-center">Status</th>
                    <th class="w-8 px-3 py-2.5"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/20">
                  <template v-for="row in filteredImportRows" :key="row.folderId">
                  <tr
                    class="hover:bg-soft/10 transition-colors align-middle cursor-pointer"
                    :class="[selectedRow?.folderId === row.folderId ? 'bg-primary/5 border-l-2 border-l-primary' : '']"
                    @click="() => {
                      selectedRow = row;
                      activeMobileTab = 'detail';
                    }"
                  >
                    <!-- Checkbox column -->
                    <td class="px-4 py-3" @click.stop>
                      <input
                        type="checkbox"
                        v-model="selectedRowIds"
                        :value="row.folderId"
                        :disabled="row.status !== 'ready' && row.status !== 'verified_match'"
                        class="rounded border-border text-primary focus:ring-primary/20 accent-primary disabled:opacity-40"
                      />
                    </td>
                    <!-- Folder name & info -->
                    <td class="px-3 py-3">
                      <div class="font-bold text-text-main text-xs truncate max-w-[200px]" :title="row.folderName">{{ row.folderName }}</div>
                      <div class="mt-0.5 text-[9px] text-text-muted flex items-center flex-wrap gap-1.5">
                        <span class="bg-soft px-1 rounded-sm text-[8px] font-bold font-mono tracking-wide uppercase text-text-soft">
                          {{ productTypeLabel(getFolderProductType(currentFolderObj(row.folderId) || { name: row.folderName })) }}
                        </span>
                        <span v-if="(currentFolderObj(row.folderId) || {}).machine_category" class="bg-soft px-1 rounded-sm text-[8px] font-bold font-mono tracking-wide uppercase text-text-soft">
                          {{ (currentFolderObj(row.folderId) || {}).machine_category }}
                        </span>
                        <span v-if="completenessForRow(row).hasVerifiedMatch" class="text-sky-400 font-semibold flex items-center gap-0.5">
                          ✓ Verified
                        </span>
                      </div>
                    </td>
                    <!-- Matched Product + "Select Related Product" toggle -->
                    <td class="px-3 py-3">
                      <div v-if="row.match" class="mb-1.5">
                        <div class="font-semibold text-text-main text-xs truncate max-w-[240px]" :title="row.match.title">
                          {{ row.match.title }}
                        </div>
                        <div class="text-[9px] text-text-muted mt-0.5 flex items-center flex-wrap gap-1 truncate max-w-[240px]">
                          <span class="capitalize">{{ row.matchMethod }}</span> · <span>{{ matchReasonLabel(row.matchReason) }}</span>
                          <span v-if="row.productSlug" class="text-[8.5px]">({{ row.productSlug }})</span>
                          <span v-if="inferMachineCategory(row.match.title, row.productType || getProductType(row.match))" class="bg-primary/10 text-primary px-1 rounded-sm text-[8px] font-bold font-mono uppercase tracking-wide">
                            {{ inferMachineCategory(row.match.title, row.productType || getProductType(row.match)) }}
                          </span>
                        </div>
                      </div>
                      <span v-else class="text-text-muted italic text-xs block mb-1.5">No Matched Product</span>

                      <button
                        type="button"
                        class="w-full max-w-[260px] flex items-center justify-between gap-1 border rounded-lg px-2 py-1 text-[10px] font-bold transition-colors"
                        :class="row.conflict ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-400' : row.showDropdown ? 'border-primary/50 bg-primary/5 text-text-main' : 'bg-soft/20 hover:bg-soft/40 border-border text-text-main'"
                        @click.stop="row.showDropdown = !row.showDropdown"
                      >
                        <span class="truncate">{{ row.conflict ? `Resolve Conflict · ${(row.conflictCandidates || []).length} candidates` : 'Select Related Product' }}</span>
                        <svg class="w-3 h-3 shrink-0 transition-transform" :class="row.showDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </td>
                    <!-- Confidence Column -->
                    <td class="px-3 py-3 text-center font-bold font-mono text-[10px]">
                      <span v-if="row.match" class="px-1.5 py-0.5 rounded" :class="confBadgeClass(row.tier)">
                        {{ row.score }}%
                      </span>
                      <span v-else class="text-text-muted">—</span>
                    </td>
                    <!-- Status Badge -->
                    <td class="px-3 py-3 text-center">
                      <span class="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider" :class="statusBadgeClass(row.status)">
                        {{ statusLabel(row.status) }}
                      </span>
                    </td>
                    <!-- Quick actions -->
                    <td class="px-3 py-3 text-right" @click.stop>
                      <div class="flex items-center justify-end gap-0.5">
                        <button
                          v-if="row.match"
                          type="button"
                          title="Preview & apply product data"
                          class="btn-ghost p-1 h-7 w-7 inline-flex items-center justify-center text-text-muted hover:text-primary"
                          @click="openPreview(row, 'missing')"
                        >
                          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.5 12C4 7 8 4 12 4s8 3 9.5 8c-1.5 5-5.5 8-9.5 8s-8-3-9.5-8z" /></svg>
                        </button>
                        <a
                          v-if="row.match?.url"
                          :href="row.match.url"
                          target="_blank"
                          rel="noopener"
                          title="Open source product page"
                          class="btn-ghost p-1 h-7 w-7 inline-flex items-center justify-center text-text-muted hover:text-primary"
                          @click.stop
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5h5v5M19 5l-7 7M10 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-4" /></svg>
                        </a>
                        <button
                          v-if="row.match"
                          type="button"
                          title="Clear match"
                          class="btn-ghost p-1 h-7 w-7 inline-flex items-center justify-center text-text-muted hover:text-rose-400"
                          @click="setRowMatch(row, null)"
                        >
                          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <svg class="w-4 h-4 text-text-muted/60 inline-block lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </td>
                  </tr>

                  <!-- Inline "Select Related Product" expansion (normal flow → never clipped) -->
                  <tr v-if="row.showDropdown" :class="selectedRow?.folderId === row.folderId ? 'bg-primary/5' : ''" @click.stop>
                    <td></td>
                    <td colspan="5" class="px-3 pb-3 pt-0">
                      <div class="bg-card border border-border rounded-xl overflow-hidden max-w-[560px] shadow-sm">
                        <div class="flex items-center gap-2 px-3 py-2 border-b border-border bg-soft/10">
                          <input
                            type="text"
                            v-model="row.searchQuery"
                            placeholder="Search title, SKU, model number, URL…"
                            class="flex-1 bg-soft/20 border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50 text-text-main placeholder-text-muted/60"
                          />
                          <button type="button" class="text-text-muted hover:text-text-main text-[10px] font-bold px-2 py-1" @click="row.showDropdown = false">Close</button>
                        </div>
                        <div class="max-h-72 overflow-y-auto divide-y divide-border/30">
                          <button type="button" class="w-full text-left px-3 py-2 text-[11px] hover:bg-soft/30 text-text-muted italic" @click="selectProductFromSearch(row, null)">— Clear Match —</button>
                          <button
                            v-for="p in getFilteredProducts(row)"
                            :key="p.url"
                            type="button"
                            class="w-full text-left px-3 py-2 hover:bg-soft/35 flex flex-col gap-0.5 transition-colors"
                            :class="row.match?.url === p.url ? 'bg-primary/5' : ''"
                            @click="selectProductFromSearch(row, p)"
                          >
                            <div class="flex items-start justify-between gap-2">
                              <span class="font-semibold text-text-main text-[11px] line-clamp-2 flex-1" :title="p.title">{{ p.title }}</span>
                              <span class="shrink-0 text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded" :class="confBadgeClass(tierForConfidence(productMatchScore(row, p)))">{{ productMatchScore(row, p) }}%</span>
                            </div>
                            <div class="flex flex-wrap items-center gap-1.5 text-[9px] text-text-muted">
                              <span class="bg-soft px-1 rounded-sm text-[8px] font-bold uppercase tracking-wider">{{ productTypeLabel(getProductType(p)) }}</span>
                              <span>·</span>
                              <span>SKU: <strong class="font-mono">{{ p.sku || 'missing' }}</strong></span>
                              <span>·</span>
                              <span>Short: {{ formatDescriptionStatus(p, 'short') }}</span>
                              <span>·</span>
                              <span>Full: {{ formatDescriptionStatus(p, 'full') }}</span>
                            </div>
                            <!-- Matched keywords / model tokens -->
                            <div v-if="matchedKeywordsFor(row, p).length" class="flex flex-wrap gap-1 mt-0.5">
                              <span v-for="kw in matchedKeywordsFor(row, p)" :key="kw" class="text-[8.5px] font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 px-1 rounded-sm tracking-wider">{{ kw }}</span>
                            </div>
                            <div class="text-[8.5px] text-text-muted/80 truncate" :title="p.url">{{ p.url }}</div>
                          </button>
                          <div v-if="getFilteredProducts(row).length === 0" class="px-3 py-4 text-center text-text-muted italic text-[11px]">No scanned products match "{{ row.searchQuery }}"</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>

          <!-- RIGHT SIDE: Selected Detail Panel (5/12 cols) -->
          <div
            v-show="isLargeScreen || activeMobileTab === 'detail'"
            class="lg:col-span-5 flex flex-col h-full bg-soft/5 overflow-hidden border-l border-border/40"
          >
            <!-- Mobile header to go back to list -->
            <div class="bg-soft/10 px-4 py-2.5 border-b border-border/40 flex items-center lg:hidden shrink-0">
              <button
                type="button"
                class="text-xs text-primary font-bold flex items-center gap-1"
                @click="activeMobileTab = 'list'"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
                </svg>
                Back to Folders List
              </button>
            </div>

            <!-- Detail panel container -->
            <div class="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
              <div v-if="selectedRow" class="space-y-5">
                <!-- Header -->
                <div>
                  <h3 class="text-sm font-bold text-text-main leading-tight">{{ selectedRow.folderName }}</h3>
                  <div class="flex items-center gap-2 mt-1.5">
                    <span class="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                      Folder: {{ productTypeLabel(getFolderProductType(currentFolderObj(selectedRow.folderId) || { name: selectedRow.folderName })) }}
                    </span>
                    <span class="px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider" :class="statusBadgeClass(selectedRow.status)">
                      Status: {{ statusLabel(selectedRow.status) }}
                    </span>
                  </div>
                </div>

                <!-- Match Stats Card -->
                <div class="bg-soft/20 border border-border/40 rounded-xl p-4 space-y-3.5">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] text-text-soft font-bold uppercase tracking-wider">Matched Product</span>
                    <span v-if="selectedRow.match" class="text-xs font-mono font-bold px-2 py-0.5 rounded" :class="confBadgeClass(selectedRow.tier)">
                      {{ selectedRow.score }}% Confidence
                    </span>
                  </div>

                  <div v-if="selectedRow.match" class="space-y-3">
                    <div>
                      <div class="text-xs font-bold text-text-main leading-snug">{{ selectedRow.match.title }}</div>
                      <div class="text-[10px] text-text-muted mt-0.5 capitalize">
                        Method: {{ selectedRow.matchMethod }} · Reason: {{ matchReasonLabel(selectedRow.matchReason) }}
                        <span v-if="selectedRow.verified" class="text-sky-400"> (Verified)</span>
                      </div>
                    </div>

                  </div>
                  <div v-else class="text-xs text-text-muted italic">
                    No product is currently mapped to this folder.
                  </div>
                </div>

                <!-- Warnings explanation box -->
                <div v-if="selectedRow.warnings.length || selectedRow.conflict" class="bg-status-needs-fix-bg/10 border border-status-needs-fix-bg/20 rounded-xl p-3.5 text-status-needs-fix-fg space-y-2">
                  <div class="font-bold text-xs flex items-center gap-1.5">
                    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Safety Warning & Reviews Needed:
                  </div>
                  <ul class="list-disc pl-5 text-[11px] space-y-1">
                    <li v-if="selectedRow.conflict" class="font-bold">
                      Conflict: This product is also matched to other folder(s). Verify mappings to avoid duplicating resources.
                    </li>
                    <li v-for="w in selectedRow.warnings" :key="w">
                      {{ warningText(w) }}
                    </li>
                  </ul>
                </div>

                <!-- Comparison details -->
                <div v-if="selectedRow.match" class="space-y-2">
                  <span class="text-[10px] text-text-soft font-bold uppercase tracking-wider block">Field Comparisons</span>
                  <div class="border border-border/40 rounded-xl overflow-hidden bg-card text-[11px]">
                    <table class="w-full border-collapse">
                      <thead>
                        <tr class="bg-soft/30 text-text-soft font-bold text-[10px] uppercase border-b border-border/40">
                          <th class="px-3 py-2 text-left w-20">Field</th>
                          <th class="px-3 py-2 text-left border-l border-border/30">Current</th>
                          <th class="px-3 py-2 text-left border-l border-border/30">Incoming</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border/20">
                        <!-- SKU -->
                        <tr class="hover:bg-soft/10">
                          <td class="px-3 py-2 font-semibold">SKU</td>
                          <td class="px-3 py-2 border-l border-border/30 text-text-soft font-mono truncate max-w-[120px]" :title="currentFolderObj(selectedRow.folderId)?.sku || '—'">
                            {{ currentFolderObj(selectedRow.folderId)?.sku || '—' }}
                          </td>
                          <td
                            class="px-3 py-2 border-l border-border/30 font-mono truncate max-w-[120px]"
                            :class="[!currentFolderObj(selectedRow.folderId)?.sku && selectedRow.match.sku ? 'text-emerald-400 font-bold bg-emerald-500/5' : '']"
                            :title="selectedRow.match.sku || '—'"
                          >
                            {{ selectedRow.match.sku || '—' }}
                          </td>
                        </tr>
                        <!-- Price -->
                        <tr class="hover:bg-soft/10">
                          <td class="px-3 py-2 font-semibold">Price</td>
                          <td class="px-3 py-2 border-l border-border/30 text-text-soft font-mono truncate max-w-[120px]" :title="currentFolderObj(selectedRow.folderId)?.product_price || '—'">
                            {{ currentFolderObj(selectedRow.folderId)?.product_price || '—' }}
                          </td>
                          <td class="px-3 py-2 border-l border-border/30 font-mono truncate max-w-[120px]" :title="selectedRow.match.price || '—'">
                            {{ selectedRow.match.price || '—' }}
                          </td>
                        </tr>
                        <!-- Category -->
                        <tr class="hover:bg-soft/10">
                          <td class="px-3 py-2 font-semibold">Category</td>
                          <td class="px-3 py-2 border-l border-border/30 text-text-soft truncate max-w-[120px]" :title="currentFolderObj(selectedRow.folderId)?.product_category || '—'">
                            {{ currentFolderObj(selectedRow.folderId)?.product_category || '—' }}
                          </td>
                          <td class="px-3 py-2 border-l border-border/30 truncate max-w-[120px]" :title="selectedRow.match.category || '—'">
                            {{ selectedRow.match.category || '—' }}
                          </td>
                        </tr>
                        <!-- Product Type -->
                        <tr class="hover:bg-soft/10">
                          <td class="px-3 py-2 font-semibold">Type</td>
                          <td class="px-3 py-2 border-l border-border/30 text-text-soft truncate max-w-[120px]">
                            {{ productTypeLabel(getFolderProductType(currentFolderObj(selectedRow.folderId) || { name: selectedRow.folderName })) }}
                          </td>
                          <td
                            class="px-3 py-2 border-l border-border/30 truncate max-w-[120px]"
                            :class="[getFolderProductType(currentFolderObj(selectedRow.folderId) || { name: selectedRow.folderName }) !== (selectedRow.productType || getProductType(selectedRow.match)) ? 'text-rose-400 font-bold bg-rose-500/5' : '']"
                          >
                            {{ productTypeLabel(selectedRow.productType || getProductType(selectedRow.match)) }}
                          </td>
                        </tr>
                        <!-- Short Description -->
                        <tr class="hover:bg-soft/10 align-top">
                          <td class="px-3 py-2.5 font-semibold">Short Desc</td>
                          <td
                            class="px-3 py-2.5 border-l border-border/30 leading-relaxed max-h-20 max-w-[160px] truncate-3-lines"
                            :class="isMetadataOnlyText(currentFolderObj(selectedRow.folderId)?.short_description) ? 'text-rose-400 font-bold bg-rose-500/5' : 'text-text-muted'"
                            :title="isMetadataOnlyText(currentFolderObj(selectedRow.folderId)?.short_description) ? 'Invalid Short Description' : currentFolderObj(selectedRow.folderId)?.short_description || ''"
                          >
                            {{ isMetadataOnlyText(currentFolderObj(selectedRow.folderId)?.short_description) ? 'Invalid Short Description' : (currentFolderObj(selectedRow.folderId)?.short_description || '—') }}
                          </td>
                          <td
                            class="px-3 py-2.5 border-l border-border/30 leading-relaxed max-h-20 max-w-[160px] truncate-3-lines"
                            :class="[hasInvalidShortDescription(selectedRow.match) ? 'text-rose-400 font-bold bg-rose-500/5' : (!currentFolderObj(selectedRow.folderId)?.short_description && selectedRow.match.shortDescription ? 'text-emerald-400 bg-emerald-500/5' : 'text-text-muted')]"
                            :title="hasInvalidShortDescription(selectedRow.match) ? 'Invalid Short Description' : stripHtml(selectedRow.match.shortDescription || '')"
                          >
                            {{ hasInvalidShortDescription(selectedRow.match) ? 'Invalid Short Description' : cleanDescriptionPreview(selectedRow.match.shortDescription) }}
                          </td>
                        </tr>
                        <!-- Full Description -->
                        <tr class="hover:bg-soft/10 align-top">
                          <td class="px-3 py-2.5 font-semibold">Full Desc</td>
                          <td
                            class="px-3 py-2.5 border-l border-border/30 leading-relaxed max-h-24 max-w-[160px] truncate-3-lines"
                            :class="isMetadataOnlyText(currentFolderObj(selectedRow.folderId)?.description) ? 'text-rose-400 font-bold bg-rose-500/5' : 'text-text-muted'"
                            :title="isMetadataOnlyText(currentFolderObj(selectedRow.folderId)?.description) ? 'Invalid Description' : stripHtml(currentFolderObj(selectedRow.folderId)?.description || '')"
                          >
                            {{ isMetadataOnlyText(currentFolderObj(selectedRow.folderId)?.description) ? 'Invalid Description' : (stripHtml(currentFolderObj(selectedRow.folderId)?.description || '') || '—') }}
                          </td>
                          <td
                            class="px-3 py-2.5 border-l border-border/30 leading-relaxed max-h-24 max-w-[160px] truncate-3-lines"
                            :class="[hasInvalidFullDescription(selectedRow.match) ? 'text-rose-400 font-bold bg-rose-500/5' : (!currentFolderObj(selectedRow.folderId)?.description && selectedRow.match.description ? 'text-emerald-400 bg-emerald-500/5' : 'text-text-muted')]"
                            :title="hasInvalidFullDescription(selectedRow.match) ? 'Invalid Description' : stripHtml(selectedRow.match.description || '')"
                          >
                            {{ hasInvalidFullDescription(selectedRow.match) ? 'Invalid Description' : (cleanDescriptionPreview(selectedRow.match.description, 'Missing full description')) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div v-if="selectedRow.match" class="space-y-2">
                  <span class="text-[10px] text-text-soft font-bold uppercase tracking-wider block">Full Scraped Description</span>
                  <div
                    class="border border-border/40 rounded-xl p-3 text-[11px] leading-relaxed max-h-56 overflow-auto"
                    :class="hasInvalidFullDescription(selectedRow.match) || !selectedRow.match.description ? 'bg-status-needs-fix-bg/10 text-status-needs-fix-fg' : 'bg-card text-text-main'"
                  >
                    {{ hasInvalidFullDescription(selectedRow.match) ? 'Invalid Description' : cleanDescriptionPreview(selectedRow.match.description, 'Missing full description') }}
                  </div>
                </div>

                <!-- Manual Mapping Section (Wide custom dropdown) -->
                <div class="space-y-2">
                  <span class="text-[10px] text-text-soft font-bold uppercase tracking-wider block">Manual Product Mapping</span>
                  
                  <div v-click-outside="() => selectedRow && closeSearchDropdown(selectedRow)" class="relative">
                    <!-- Search Input Box -->
                    <div class="relative flex items-center">
                      <input
                        type="text"
                        v-model="selectedRow.searchQuery"
                        placeholder="Search Scanned WooCommerce Products…"
                        class="w-full bg-soft/20 border border-border rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none focus:border-primary/50 text-text-main placeholder-text-muted/60"
                        @focus="selectedRow.showDropdown = true"
                      />
                      <!-- Clear mapping button -->
                      <button
                        v-if="selectedRow.match"
                        type="button"
                        class="absolute right-2 text-text-muted hover:text-text-main p-1 transition-colors"
                        @click="setRowMatch(selectedRow, null)"
                        title="Clear mapping"
                      >
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <span v-else class="absolute right-2.5 text-text-muted/40 pointer-events-none">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>

                    <!-- Custom Search Dropdown (Widescreen styling) -->
                    <div
                      v-if="selectedRow.showDropdown"
                      class="absolute left-0 right-0 z-50 bg-card border border-border rounded-xl shadow-2xl divide-y divide-border/30 max-h-64 overflow-y-auto mt-1.5"
                    >
                      <button
                        type="button"
                        class="w-full text-left px-3 py-2 text-xs hover:bg-soft/30 transition-colors text-text-muted italic font-medium"
                        @click="selectedRow && selectProductFromSearch(selectedRow, null)"
                      >
                        — No match (Clear Match) —
                      </button>
                      <button
                        v-for="p in (selectedRow ? getFilteredProducts(selectedRow) : [])"
                        :key="p.url"
                        type="button"
                        class="w-full text-left px-3 py-2.5 text-xs hover:bg-soft/35 transition-colors text-text-main flex flex-col gap-1"
                        :class="selectedRow.match?.url === p.url ? 'bg-primary/5 text-primary font-bold' : ''"
                        @click="selectedRow && selectProductFromSearch(selectedRow, p)"
                      >
                        <div class="flex items-start justify-between gap-3 w-full">
                          <span class="font-semibold text-text-main break-words line-clamp-2 flex-1" :title="p.title">{{ p.title }}</span>
                          <span class="shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold" :class="confBadgeClass(tierForConfidence(productMatchScore(selectedRow, p)))">
                            {{ productMatchScore(selectedRow, p) }}% match
                          </span>
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5 text-[9.5px] text-text-muted mt-0.5">
                          <span class="bg-soft px-1 rounded-sm text-[8px] font-bold uppercase tracking-wider">{{ productTypeLabel(getProductType(p)) }}</span>
                          <span>·</span>
                          <span>SKU: <strong class="font-mono">{{ p.sku || 'missing' }}</strong></span>
                          <span>·</span>
                          <span>Short Desc: {{ formatDescriptionStatus(p, 'short') }}</span>
                          <span>·</span>
                          <span>Full Desc: {{ formatDescriptionStatus(p, 'full') }}</span>
                        </div>
                        <div class="text-[9px] text-text-muted truncate w-full" :title="p.url">{{ p.url }}</div>
                      </button>
                      <div v-if="selectedRow && getFilteredProducts(selectedRow).length === 0" class="px-3 py-4 text-center text-text-muted italic text-xs">
                        No scanned products match "{{ selectedRow.searchQuery }}"
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Actions card -->
                <div class="pt-4 border-t border-border/40 flex flex-wrap gap-2">
                  <template v-if="selectedRow.status === 'applied'">
                    <div class="w-full py-2 bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/25 rounded-xl text-center flex items-center justify-center gap-1.5 text-xs">
                      ✓ Changes Applied to Folder
                    </div>
                  </template>
                  <template v-else-if="selectedRow.match">
                    <!-- Accept Match / Verification -->
                    <button
                      v-if="!selectedRow.verified && selectedRow.status !== 'no_match'"
                      type="button"
                      class="btn-primary flex-1 py-2 px-3 text-xs font-bold rounded-xl shadow transition-all hover:scale-[1.01]"
                      @click="selectedRow && saveMatchOnly(selectedRow, true)"
                    >
                      Accept Match
                    </button>
                    <!-- Apply Missing -->
                    <button
                      type="button"
                      class="btn-secondary py-2 px-3 text-xs font-bold rounded-xl border border-border transition-all"
                      :class="[!selectedRow.warnings.length ? 'bg-primary/10 text-primary border-primary/20' : '']"
                      @click="selectedRow && openPreview(selectedRow, 'missing')"
                    >
                      Apply Missing Fields
                    </button>
                    <!-- Replace Existing -->
                    <button
                      type="button"
                      class="btn-secondary py-2 px-3 text-xs font-bold rounded-xl border border-border transition-all"
                      @click="selectedRow && openPreview(selectedRow, 'replace')"
                    >
                      Replace All Fields
                    </button>
                    <!-- Clear mapping -->
                    <button
                      type="button"
                      class="btn-secondary py-2 px-3 text-xs font-semibold rounded-xl text-rose-400 hover:bg-rose-500/10 border-rose-500/20"
                      @click="selectedRow && setRowMatch(selectedRow, null)"
                    >
                      Clear Match
                    </button>
                  </template>
                  <!-- Skip / Ignore -->
                  <button
                    v-if="selectedRow.status !== 'ignored'"
                    type="button"
                    class="btn-secondary py-2 px-3 text-xs font-semibold rounded-xl border border-border"
                    @click="selectedRow && (selectedRow.status = 'ignored')"
                  >
                    Skip Folder
                  </button>
                </div>
              </div>

              <!-- Detail panel empty state -->
              <div v-else class="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div class="h-12 w-12 rounded-full bg-soft/20 flex items-center justify-center text-text-muted">
                  <svg class="w-6 h-6 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h4 class="text-xs font-bold text-text-main">No Folder Selected</h4>
                  <p class="text-[10px] text-text-muted max-w-[220px] mx-auto mt-1 leading-normal">
                    Select a folder from the list on the left to review match details, compare fields, or resolve conflicts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Scan Modal Landing empty view -->
        <div v-else-if="!importScanning" class="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
          <div class="h-16 w-16 bg-soft/20 border border-border/40 rounded-full flex items-center justify-center text-text-muted shadow-inner">
            <svg class="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-text-main">Import WooCommerce Products to Folders</h3>
            <p class="text-xs text-text-muted max-w-md mx-auto mt-1.5 leading-relaxed">
              Enter the target WooCommerce product-category URL at the top and click "Scan Category" to retrieve product pages. Match details will be displayed for validation before import.
            </p>
          </div>
        </div>

        <!-- Scan Scanning loader -->
        <div v-else class="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
          <svg class="animate-spin text-primary" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          <div>
            <h4 class="text-xs font-bold text-text-main animate-pulse">Scanning WooCommerce Category Pages…</h4>
            <p class="text-[10px] text-text-muted max-w-[280px] mx-auto mt-1">
              Extracting SKUs, titles, URLs, short & full descriptions from WooCommerce. This might take a few moments.
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <!-- Bulk Mode configuration -->
          <div class="flex items-center gap-3">
            <div v-if="importRows.length && selectedRowIds.length > 0" class="flex items-center gap-2 text-xs">
              <span class="text-text-muted font-semibold">Bulk Mode:</span>
              <select
                v-model="bulkApplyMode"
                class="bg-soft/30 border border-border rounded-lg text-xs py-1 px-2.5 text-text-main focus:outline-none focus:border-primary/50"
              >
                <option value="missing">Apply Missing Fields (Safe)</option>
                <option value="replace">Replace Existing Fields (Overwrite)</option>
              </select>
            </div>
            <div v-else class="text-[10px] text-text-muted">
              Select verified or ready folder matches to apply import actions in batch.
            </div>
          </div>

          <!-- Buttons -->
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn-ghost h-8 px-4 text-xs font-semibold rounded-lg"
              @click="showImportModal = false"
              :disabled="bulkApplying"
            >
              Close
            </button>
            <button
              v-if="importRows.length"
              type="button"
              class="btn-primary h-8 px-5 text-xs font-bold rounded-lg shadow-md flex items-center gap-2"
              :disabled="selectedRowIds.length === 0 || bulkApplying"
              @click="triggerBulkApply"
            >
              <svg v-if="bulkApplying" class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              {{ bulkApplying ? 'Applying Batch…' : 'Apply Selected Matches (' + selectedRowIds.length + ')' }}
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- ════════ IMPORT PREVIEW MODAL ════════ -->
    <Modal
      :open="!!previewRow"
      title="Preview import"
      :subtitle="previewRow ? `${previewRow.folderName}  ·  ${previewRow.score}% confidence` : ''"
      size="xl"
      @close="previewRow = null"
    >
      <div v-if="previewRow && previewRow.match" class="space-y-3 text-[11px]">
        <div v-if="previewWarnings.length" class="rounded-lg border border-status-needs-fix-bg/40 bg-status-needs-fix-bg/10 px-3 py-2 text-status-needs-fix-fg">
          <div class="font-bold text-[10px] mb-1">Warnings</div>
          <ul class="list-disc pl-4 space-y-0.5">
            <li v-for="warning in previewWarnings" :key="warning">{{ warning }}</li>
          </ul>
        </div>
        <div class="grid grid-cols-[64px_1fr_1fr] gap-x-3 gap-y-2 items-start">
          <div></div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-text-soft border-b border-border/40 pb-1">Current</div>
          <div class="text-[10px] font-bold uppercase tracking-wider text-primary border-b border-primary/30 pb-1">Imported</div>
          <template v-for="p in previewPairs" :key="p.label">
            <div class="text-[10px] font-bold text-text-soft pt-1.5">{{ p.label }}</div>
            <div class="text-text-main whitespace-pre-wrap break-words bg-soft/20 rounded p-1.5 min-h-[30px] max-h-[140px] overflow-auto">{{ p.current || '—' }}</div>
            <div
              class="whitespace-pre-wrap break-words rounded p-1.5 min-h-[30px] max-h-[140px] overflow-auto"
              :class="p.imported && p.imported !== p.current ? 'bg-primary/10 text-text-main' : 'bg-soft/20 text-text-muted'"
            >{{ p.imported || '—' }}</div>
          </template>
        </div>
        <div class="flex flex-wrap justify-end gap-2 pt-2 border-t border-border/40">
          <button type="button" class="btn-secondary py-1.5 px-3 text-xs" @click="previewRow = null">Cancel</button>
          <button type="button" class="btn-secondary py-1.5 px-3 text-xs" @click="applyFromPreview('save')">Save Match Only</button>
          <button type="button" class="btn-secondary py-1.5 px-3 text-xs" @click="applyFromPreview('missing')">Apply Missing Fields</button>
          <button type="button" class="btn-primary py-1.5 px-3 text-xs" @click="applyFromPreview('replace')">Replace Existing Fields</button>
        </div>
      </div>
    </Modal>

    <!-- ════════ EDIT FOLDER INFO MODAL ════════ -->
    <Modal
      :open="showEditFolderInfoModal"
      :title="$t('mediaLibrary.editFolderInfo')"
      :subtitle="$t('mediaLibrary.editFolderSubtitle')"
      size="lg"
      @close="saveFolderInfo"
    >
      <div class="space-y-4 text-xs">
        <!-- Error Message -->
        <div v-if="editFolderError" class="p-2.5 bg-status-needs-fix-bg/15 border border-status-needs-fix-bg/50 rounded-xl text-status-needs-fix-fg font-semibold flex items-center gap-1.5">
          <span>{{ $t('⚠️') }}</span>
          <span>{{ editFolderError }}</span>
        </div>

        <!-- Folder Name -->
        <div class="space-y-1">
          <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">{{ $t('mediaLibrary.folderNameHeader') }}</label>
          <input
            type="text"
            v-model="editFolderName"
            :placeholder="$t('mediaLibrary.renameFolder')"
            class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
        </div>

        <!-- Short Description -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">{{ $t('mediaLibrary.shortDescription') }}</label>
            <span class="text-[10px] text-text-muted font-mono font-medium">{{ editFolderShortDescription.length }} {{ $t('mediaLibrary.charactersLimit') }}</span>
          </div>
          <textarea
            v-model="editFolderShortDescription"
            :placeholder="$t('Compact mini excavator built for tight job sites...')"
            rows="3"
            class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Description (Rich Text Editor) -->
        <div class="space-y-1">
          <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">{{ $t('mediaLibrary.fullDescription') }}</label>
          <FolderDescriptionEditor v-model="editFolderDescription" />
        </div>

        <!-- Product Type -->
        <div class="space-y-1">
          <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">{{ $t('mediaLibrary.productType') }}</label>
          <div class="inline-flex rounded-xl border border-border bg-soft/20 p-0.5">
            <button
              type="button"
              @click="editFolderProductType = 'equipment'"
              :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors', editFolderProductType === 'equipment' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main']"
            >{{ $t('mediaLibrary.equipment') }}</button>
            <button
              type="button"
              @click="editFolderProductType = 'attachment'"
              :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors', editFolderProductType === 'attachment' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main']"
            >{{ $t('mediaLibrary.attachment') }}</button>
            <button
              type="button"
              @click="editFolderProductType = ''"
              :class="['px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors', editFolderProductType === '' ? 'bg-soft text-text-main shadow-sm' : 'text-text-muted hover:text-text-main']"
            >{{ $t('mediaLibrary.notSet') }}</button>
          </div>
        </div>

        <!-- Machine Category -->
        <div class="space-y-1">
          <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">{{ $t('mediaLibrary.machineCategory') }}</label>
          <select
            v-model="editFolderMachineCategory"
            :disabled="!editFolderProductType"
            class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors disabled:opacity-50"
          >
            <option value="">{{ $t('mediaLibrary.notSet') }}</option>
            <option
              v-for="cat in availableMachineCategories"
              :key="cat"
              :value="cat"
            >{{ cat }}</option>
          </select>
        </div>

        <!-- SKU + GTIN + Price -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="space-y-1">
            <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">{{ $t('mediaLibrary.sku') }}</label>
            <input
              type="text"
              v-model="editFolderSku"
              :placeholder="$t('mediaLibrary.skuPlaceholder')"
              class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div class="space-y-1">
            <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">GTIN</label>
            <input
              type="text"
              v-model="editFolderGtin"
              placeholder="Enter GTIN"
              class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main font-mono focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
          <div class="space-y-1">
            <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">{{ $t('mediaLibrary.price') }}</label>
            <input
              type="text"
              v-model="editFolderPrice"
              :placeholder="$t('mediaLibrary.pricePlaceholder')"
              class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
            />
          </div>
        </div>

        <!-- Button URL -->
        <div class="space-y-1">
          <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">{{ $t('mediaLibrary.buttonUrl') }}</label>
          <input
            type="text"
            v-model="editFolderButtonUrl"
            :placeholder="$t('mediaLibrary.buttonUrlPlaceholder')"
            class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          <span class="text-[10px] text-text-muted block mt-0.5 font-normal">{{ $t('mediaLibrary.buttonUrlAnyHint') }}</span>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2 w-full">
          <button
            type="button"
            class="btn-ghost py-1.5 px-4 text-xs font-semibold h-9 rounded-xl"
            @click="showEditFolderInfoModal = false"
            :disabled="savingFolderInfo"
          >
            {{ $t('mediaLibrary.cancel') }}
          </button>
          
          <button
            type="button"
            class="btn-primary py-1.5 px-5 text-xs font-semibold h-9 rounded-xl shadow-sm flex items-center gap-1.5"
            @click="saveFolderInfo"
            :disabled="savingFolderInfo"
          >
            <svg v-if="savingFolderInfo" class="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {{ savingFolderInfo ? $t('mediaLibrary.saving') : $t('common.save') }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Uploading Queue Panel (floating bottom-right) -->
    <div v-if="uploadingItems.length > 0" class="fixed bottom-6 right-6 z-40 w-72 bg-card border border-border rounded-lg shadow-lg overflow-hidden flex flex-col">
      <!-- Panel Header -->
      <div class="bg-soft/80 border-b border-border px-3 py-2 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="inline-flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse"></span>
          <span class="text-xs font-bold text-text-main">{{ $t('mediaLibrary.uploadQueue', { count: uploadingItems.filter(i => i.status !== 'success').length }) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button 
            type="button" 
            class="text-[10px] text-text-muted hover:text-text-main font-semibold"
            @click="clearCompletedQueue"
          >
            {{ $t('mediaLibrary.clearDone') }}
          </button>
          <button 
            type="button" 
            class="text-text-muted hover:text-text-main p-0.5"
            @click="isQueueCollapsed = !isQueueCollapsed"
          >
            <svg v-if="isQueueCollapsed" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        </div>
      </div>

      <!-- Queue Items List -->
      <div v-if="!isQueueCollapsed" class="max-h-60 overflow-y-auto divide-y divide-border/60">
        <div 
          v-for="item in uploadingItems" 
          :key="item.id" 
          class="p-2 flex items-center justify-between gap-2.5 text-xs hover:bg-soft/10"
        >
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <!-- Thumbnail preview inside queue -->
            <div class="h-6 w-6 rounded bg-soft overflow-hidden border border-border/80 shrink-0">
              <img :src="item.previewUrl" class="h-full w-full object-cover" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-[11px] font-semibold text-text-main truncate" :title="item.name">{{ item.name }}</div>
              <div class="text-[9px] text-text-soft font-bold capitalize leading-none mt-0.5">{{ $t('mediaLibrary.' + item.status) }}</div>
            </div>
          </div>
          
          <div class="shrink-0 flex items-center gap-1.5">
            <span v-if="item.status === 'success'" class="text-primary font-bold">✓</span>
            <div v-else-if="item.status === 'failed'" class="flex gap-1">
              <button type="button" class="text-[10px] text-primary font-bold hover:underline" @click="retryUploadItem(item)">{{ $t('mediaLibrary.retry') }}</button>
              <button type="button" class="text-[10px] text-status-needs-fix-fg font-bold hover:underline" @click="removeUploadItem(item.id)">✕</button>
            </div>
            <svg v-else class="animate-spin text-primary" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      </div>
    </div>
    <!-- Desktop Folder Actions Dropdown (Viewport fixed position to prevent parent container clipping) -->
    <div
      v-if="activeFolderMenuId && menuActiveFolder"
      class="fixed z-50 w-44 bg-card border border-border shadow-lg rounded-btn py-1"
      :style="{ top: folderMenuPosition.top + 'px', left: folderMenuPosition.left + 'px' }"
      v-click-outside="closeFolderMenu"
    >
      <button
        v-if="canManageFolder(menuActiveFolder)"
        type="button"
        class="w-full text-left px-3 py-1.5 text-xs text-text-main hover:bg-soft flex items-center gap-1.5"
        @click.stop="startFolderRename(menuActiveFolder)"
      >
        {{ $t('mediaLibrary.rename') }}
      </button>
      <button
        v-if="canManageFolder(menuActiveFolder)"
        type="button"
        class="w-full text-left px-3 py-1.5 text-xs text-status-needs-fix-fg hover:bg-soft flex items-center gap-1.5"
        @click.stop="deleteFolder(menuActiveFolder.id)"
      >
        {{ $t('mediaLibrary.deleteFolder') }}
      </button>
      <button
        type="button"
        class="w-full text-left px-3 py-1.5 text-xs text-text-main hover:bg-soft flex items-center gap-1.5"
        @click.stop="copyFolderLink(menuActiveFolder.id)"
      >
        {{ $t('mediaLibrary.copyLink') }}
      </button>
      <button
        v-if="selectedImageKeys.length > 0"
        type="button"
        class="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-soft flex items-center gap-1.5 font-bold border-t border-border/40 mt-1"
        @click.stop="bulkMoveToFolder(menuActiveFolder.id)"
      >
        {{ $t('mediaLibrary.moveSelectedHere') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/stores/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { debounceRealtime } from '@/services/realtimeService';
import { optimizeImage, formatFileSize } from '@/utils/imageOptimizer';
import Modal from '@/components/ui/Modal.vue';
import FolderDescriptionEditor from '@/components/ui/FolderDescriptionEditor.vue';
import {
  exactIdentityConfidence,
  getFolderProductType,
  getProductIdentitySlug,
  getProductType,
  mappingForFolder,
  normalizeProductType,
  productTypeLabel,
  productSlugFromUrl,
  resolveExactProductMatch,
  slugifyProductIdentity,
  inferMachineCategory,
  type ProductType
} from '@/lib/productIdentity';

const auth = useAuthStore();
const route = useRoute();
const { t } = useI18n();

const canUpload = computed(() => !auth.isViewer && !auth.isQualityChecker);
const canView = computed(() => !auth.isQualityChecker);

// ─── Directives ─────────────────────────────────────────────────────────────
// Simple click outside implementation
const vClickOutside = {
  mounted(el: any, binding: any) {
    el.clickOutsideEvent = (event: Event) => {
      if (!(el === event.target || el.contains(event.target))) {
        binding.value(event);
      }
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el: any) {
    document.body.removeEventListener('click', el.clickOutsideEvent);
  }
};

// ─── Custom Type Interfaces ──────────────────────────────────────────────────
interface CustomFolder {
  id: string;
  name: string;
  created_by: string | null;
  short_description: string | null;
  description: string | null;
  button_url: string | null;
  updated_at?: string | null;
  // Product-import fields (migration 0139)
  sku?: string | null;
  product_gtin?: string | null;
  gtin?: string | null;
  product_price?: string | null;
  product_category?: string | null;
  imported_from_url?: string | null;
  imported_product_title?: string | null;
  import_confidence?: number | null;
  imported_at?: string | null;
  imported_by?: string | null;
  matched_product_url?: string | null;
  matched_product_title?: string | null;
  matched_product_sku?: string | null;
  match_method?: 'auto' | 'manual' | null;
  match_confidence?: number | null;
  match_verified_by_user?: boolean | null;
  matched_at?: string | null;
  product_id?: string | null;
  product_type?: ProductType | null;
  machine_category?: string | null;
  product_slug?: string | null;
  product_folder_path?: string | null;
  image_folder_path?: string | null;
  product_mapping_status?: 'mapped' | 'needs_manual_mapping' | 'unmapped' | null;
  // Soft delete (Trash bin)
  deleted_at?: string | null;
  deleted_by?: string | null;
}

interface DBImage {
  id: string;
  url: string;
  name: string;
  folder_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  source: string;
  file_type: string | null;
  file_size: number | null;
  file_size_bytes?: number | null;
  width?: number | null;
  height?: number | null;
  storage_path?: string | null;
  is_feature_image: boolean;
  sort_order: number;
  profiles: { full_name: string } | null;
}

interface LibImage {
  key: string;
  url: string;
  name: string;
  displayName: string;
  folderId: string | null;
  uploadedBy: string | null;
  uploaderName: string;
  createdAt: string;
  source: string;
  fileType: string;
  fileSize: number | null;
  width?: number | null;
  height?: number | null;
  isFeatureImage: boolean;
  sortOrder: number;
}

// ─── SVG Vector Icons ────────────────────────────────────────────────────────
const ICON_SVG = {
  folder: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  folderOpen: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M2 10h20"/></svg>`,
  trash: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  dots: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>`,
  copy: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>`,
  download: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  close: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  arrowLeft: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  arrowRight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`
};

// ─── Store State & Local Cache ────────────────────────────────────────────────
const dbImages = ref<DBImage[]>([]);
const customFolders = ref<CustomFolder[]>([]);

// ─── Folder selection + Trash (soft delete) ──────────────────────────────────
const folderSelectMode = ref(false);
const selectedFolderIds = ref<string[]>([]);
const folderMissingFilter = ref(false);
const trashedFolders = ref<CustomFolder[]>([]);
const showTrashModal = ref(false);
const processingTrash = ref(false);

const libraryStats = ref<{
  total_images: number;
  total_folders: number;
  total_storage_bytes: number;
  uncategorized_count: number;
  unknown_size_count: number;
} | null>(null);

const loadLibraryStats = async () => {
  if (!supabaseConfigured) return;
  try {
    const { data, error } = await supabase.rpc('get_media_library_stats');
    if (!error && data) {
      libraryStats.value = data;
    } else if (error) {
      console.error('[images] failed to fetch library stats RPC', error);
    }
  } catch (e) {
    console.error('[images] failed to load library stats', e);
  }
};

const getImageDimensions = (file: File): Promise<{ width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      return resolve(null);
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
};
const currentFolder = ref<string>('all');
const uploaderExpanded = ref(false);
const viewMode = ref<'comfortable' | 'compact' | 'list'>('comfortable');
const objectFit = ref<'cover' | 'contain'>('cover');

// Filters & Sort States
const search = ref('');
const folderSearchQuery = ref('');
const filterUploadedBy = ref('all');
const filterFileType = ref('all');

// Machine Category constants
const ALL_MACHINE_CATEGORIES = [
  'Mini Excavator',
  'Skid Steer',
  'Forklift',
  'Road Roller',
  'Backhoe Loader',
  'Towable Excavator',
  'Wheel Loader',
  'Scissor Lift',
  'Stone Crusher',
  'Dumper',
  'Trencher'
];

const ATTACHMENT_MACHINE_CATEGORIES = [
  'Mini Excavator',
  'Skid Steer',
  'Wheel Loader'
];

// Product Content Dashboard filters
const filterFolderProductType = ref<'all' | 'equipment' | 'attachment'>('all');
const filterFolderMachineCategory = ref<string>('all');
const filterMyUploads = ref(false);
const sortBy = ref('newest');

// Redesigned Custom Dropdown States
const openProductTypeDropdown = ref(false);
const openMachineCategoryDropdown = ref(false);
const machineCategorySearch = ref('');
const showMobileFilters = ref(false);

const productTypeFilterOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'attachment', label: 'Attachment' }
];

const getProductTypeFilterLabel = (val: string) => {
  if (val === 'equipment') return 'Equipment';
  if (val === 'attachment') return 'Attachment';
  return 'All Types';
};

const getProductTypeMarkerClass = (val: string) => {
  if (val === 'equipment') return 'bg-emerald-500';
  if (val === 'attachment') return 'bg-sky-500';
  return 'bg-zinc-400';
};

const getMachineCategoryFilterLabel = (val: string) => {
  if (val === 'all') return 'All Machine Categories';
  if (val === 'not_set') return 'Not Set';
  return val;
};

const selectFilterProductType = (val: any) => {
  filterFolderProductType.value = val;
  openProductTypeDropdown.value = false;
};

const selectFilterMachineCategory = (val: string) => {
  filterFolderMachineCategory.value = val;
  openMachineCategoryDropdown.value = false;
  machineCategorySearch.value = '';
};

const hasActiveFolderFilters = computed(() => {
  return filterFolderProductType.value !== 'all' || filterFolderMachineCategory.value !== 'all';
});

const activeFiltersCount = computed(() => {
  let count = 0;
  if (filterFolderProductType.value !== 'all') count++;
  if (filterFolderMachineCategory.value !== 'all') count++;
  return count;
});

const clearFolderFilters = () => {
  filterFolderProductType.value = 'all';
  filterFolderMachineCategory.value = 'all';
  machineCategorySearch.value = '';
};

// Reset category option selection if no longer allowed under attachment
watch(filterFolderProductType, (newType) => {
  if (newType === 'attachment') {
    if (filterFolderMachineCategory.value !== 'all' && filterFolderMachineCategory.value !== 'not_set' && !ATTACHMENT_MACHINE_CATEGORIES.includes(filterFolderMachineCategory.value)) {
      filterFolderMachineCategory.value = 'all';
    }
  }
});

const filteredMachineCategoryOptions = computed(() => {
  const q = machineCategorySearch.value.trim().toLowerCase();
  const cats = filterFolderProductType.value === 'equipment'
    ? ALL_MACHINE_CATEGORIES
    : filterFolderProductType.value === 'attachment'
      ? ATTACHMENT_MACHINE_CATEGORIES
      : ALL_MACHINE_CATEGORIES;

  let list = cats.map(cat => ({ value: cat, label: cat }));
  const options = [
    { value: 'all', label: 'All Machine Categories' },
    ...list,
    { value: 'not_set', label: 'Not Set' }
  ];

  if (q) {
    return options.filter(o => o.label.toLowerCase().includes(q));
  }
  return options;
});

const closeFilterDropdowns = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target.closest('.custom-dropdown-container')) {
    openProductTypeDropdown.value = false;
    openMachineCategoryDropdown.value = false;
  }
};

// Selections
const selectedImageKeys = ref<string[]>([]);

// Drag & Drop
const draggedImage = ref<LibImage | null>(null);
const dragOverFolderId = ref<string | null>(null);

// Add / Rename folder states
const showNewFolderInput = ref(false);
const newFolderName = ref('');
const newFolderInputRef = ref<HTMLInputElement | null>(null);
const editingFolderId = ref<string | null>(null);
const editFolderInput = ref('');
const renameFolderInputRef = ref<HTMLInputElement[] | null>(null);

// Mobile folder drawer/menu states
const mobileFolderMenuFolder = ref<CustomFolder | null>(null);

const startMobileFolderRename = async () => {
  if (!mobileFolderMenuFolder.value) return;
  const folder = mobileFolderMenuFolder.value;
  mobileFolderMenuFolder.value = null;
  editingFolderId.value = folder.id;
  editFolderInput.value = folder.name;
  await nextTick();
  if (renameFolderInputRef.value && renameFolderInputRef.value[0]) {
    renameFolderInputRef.value[0].focus();
  }
};

// Card Image Renaming States
const renamingImageKey = ref<string | null>(null);
const renameImageInput = ref('');
const renameImageInputRef = ref<HTMLInputElement[] | null>(null);

// Folder action dropdown menu tracker
const activeFolderMenuId = ref<string | null>(null);
const menuActiveFolder = ref<CustomFolder | null>(null);
const folderMenuPosition = ref({ top: 0, left: 0 });

// Detail Drawer States
const drawerOpen = ref(false);
const activeImageIndex = ref<number>(-1);
const imageDimensions = ref<string>('');
const selectedImage = computed<LibImage | null>(() => {
  if (activeImageIndex.value >= 0 && activeImageIndex.value < filteredLibrary.value.length) {
    return filteredLibrary.value[activeImageIndex.value];
  }
  return null;
});

// ─── Image Ordering & Organize Mode States ────────────────────────────────────
const isOrganizeMode = ref(false);
const organizeImages = ref<LibImage[]>([]);
const featureImageId = ref<string | null>(null);
const isDraggingOverFeature = ref(false);
const draggedIndex = ref<number | null>(null);

// ─── CSV Export States ────────────────────────────────────────────────────────
const showExportModal = ref(false);
const selectedExportFolderIds = ref<string[]>([]);
const skipEmptyFolders = ref(true);
const includeNoFeatureFolders = ref(true);
const exportingCsv = ref(false);
const exportSearchQuery = ref('');
const exportImagesOnlyFilter = ref(false);
const exportFormat = ref<'csv' | 'json'>('csv');
const csvExportType = ref<'woocommerce' | 'framework' | 'simple'>('framework');
const exportIncludeHeaderRow = ref(true);
const exportScope = ref<'selected' | 'filtered' | 'all'>('selected');

// Selected folders that can actually be deleted: real folders (not the
// "uncategorized" pseudo-folder) the current user is allowed to manage.
const deletableSelectedFolderIds = computed(() =>
  selectedExportFolderIds.value.filter((id) => {
    if (id === 'uncategorized') return false;
    const folder = customFolders.value.find((f) => f.id === id);
    return !!folder && canManageFolder(folder);
  })
);

// ─── Folder Content Editing States ───────────────────────────────────────────
const showEditFolderInfoModal = ref(false);
const editingFolderObj = ref<CustomFolder | null>(null);
const editFolderName = ref('');
const editFolderShortDescription = ref('');
const editFolderDescription = ref('');
const editFolderButtonUrl = ref('');
const editFolderSku = ref('');
const editFolderGtin = ref('');
const editFolderPrice = ref('');
const editFolderProductType = ref<'' | ProductType>('');
const editFolderMachineCategory = ref<string>('');
const editFolderError = ref('');
const savingFolderInfo = ref(false);

const availableMachineCategories = computed(() => {
  if (editFolderProductType.value === 'equipment') {
    return ALL_MACHINE_CATEGORIES;
  }
  if (editFolderProductType.value === 'attachment') {
    return ATTACHMENT_MACHINE_CATEGORIES;
  }
  return [];
});

watch(editFolderProductType, (newType) => {
  if (!newType) {
    editFolderMachineCategory.value = '';
  } else if (newType === 'attachment') {
    if (!ATTACHMENT_MACHINE_CATEGORIES.includes(editFolderMachineCategory.value)) {
      editFolderMachineCategory.value = '';
    }
  }
});
const exportIncludeContentFields = ref(true);

const canEditFolderInfo = (folder: CustomFolder) => {
  if (auth.isQualityChecker) return false;
  if (auth.isAdmin || auth.isHeadOrSupervisor || auth.isAssistantHead) return true;
  return folder.created_by === auth.user?.id;
};

const hasFolderContent = (folder: CustomFolder) => {
  return !!(
    folder.short_description ||
    folder.description ||
    folder.button_url ||
    folder.sku ||
    folder.product_price ||
    folder.product_type
  );
};

/**
 * The button URL "can be anything" — a full URL, a relative path (/cart),
 * an anchor, mailto:, or even plain text used by a custom button. We never
 * reject it. We only auto-prefix https:// for a bare domain (single token,
 * has a dot, no scheme/space/slash) as a convenience.
 */
const normalizeButtonUrl = (value: string): string => {
  const v = (value || '').trim();
  if (!v) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v; // has a scheme (https:, mailto:, tel:…)
  if (/^[/#?]/.test(v)) return v; // relative path / anchor / query
  // bare domain like "example.com/page" → https://
  if (!/\s/.test(v) && /^[^\s/]+\.[^\s/]+/.test(v)) return 'https://' + v;
  return v; // anything else: keep verbatim
};

/** True when a button URL string is something a browser can open as a link. */
const isLinkLikeUrl = (value: string | null | undefined): boolean =>
  !!value && (/^https?:\/\//i.test(value) || /^(mailto:|tel:|\/|#)/i.test(value));

const activeFolderObj = computed(() => {
  if (currentFolder.value === 'all' || currentFolder.value === 'uncategorized') return null;
  return customFolders.value.find(f => f.id === currentFolder.value) || null;
});

const activeFolderObjStats = computed(() => {
  const folder = activeFolderObj.value;
  if (!folder) return { imageCount: 0, hasFeature: false, orderedCount: 0 };
  const imgs = library.value.filter(img => img.folderId === folder.id);
  const feat = imgs.find(img => img.isFeatureImage);
  const ordered = imgs.filter(img => img.sortOrder > 0 && img.sortOrder !== 9999);
  return {
    imageCount: imgs.length,
    hasFeature: !!feat,
    orderedCount: ordered.length
  };
});

const openEditFolderInfo = (folder: CustomFolder) => {
  editingFolderObj.value = folder;
  editFolderName.value = folder.name || '';
  editFolderShortDescription.value = folder.short_description || '';
  editFolderDescription.value = folder.description || '';
  editFolderButtonUrl.value = folder.button_url || '';
  editFolderSku.value = folder.sku || '';
  editFolderGtin.value = folder.gtin || folder.product_gtin || '';
  editFolderPrice.value = folder.product_price || '';
  editFolderProductType.value = folder.product_type || '';
  editFolderMachineCategory.value = folder.machine_category || '';
  editFolderError.value = '';
  showEditFolderInfoModal.value = true;
};

const saveFolderInfo = async () => {
  if (!editingFolderObj.value || !supabaseConfigured) return;
  
  const name = editFolderName.value.trim();
  if (!name) {
    editFolderError.value = 'Folder name is required.';
    return;
  }
  
  // Button URL can be anything (full URL, relative path, anchor, plain text).
  const buttonUrl = normalizeButtonUrl(editFolderButtonUrl.value);

  savingFolderInfo.value = true;
  editFolderError.value = '';

  try {
    const folderId = editingFolderObj.value.id;
    const patch = {
      name,
      short_description: editFolderShortDescription.value.trim() || null,
      description: editFolderDescription.value.trim() || null,
      button_url: buttonUrl || null,
      sku: editFolderSku.value.trim() || null,
      product_gtin: editFolderGtin.value.trim() || null,
      gtin: editFolderGtin.value.trim() || null,
      product_price: editFolderPrice.value.trim() || null,
      product_type: editFolderProductType.value || null,
      machine_category: editFolderMachineCategory.value || null,
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase
      .from('team_folders')
      .update(patch)
      .eq('id', folderId);

    if (error) throw error;

    // Update local state instantly
    const folderIndex = customFolders.value.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      customFolders.value[folderIndex] = {
        ...customFolders.value[folderIndex],
        ...patch
      };
    }
    
    showToast(t('mediaLibrary.toast.folderInfoSaved'));
    showEditFolderInfoModal.value = false;
  } catch (err) {
    console.error('[save-folder-info] Failed to save folder info:', err);
    showToast(t('mediaLibrary.toast.folderInfoSaveFailed'));
  } finally {
    savingFolderInfo.value = false;
  }
};


const exportFoldersList = computed(() => {
  if (auth.isQualityChecker) return [];
  
  let folders = [...customFolders.value];
  // Team members can only export folders they own (created)
  if (!auth.isAdmin && !auth.isAssistantHead) {
    folders = folders.filter(f => f.created_by === auth.user?.id);
  }
  
  const list = folders.map(f => {
    const imgs = library.value.filter(img => img.folderId === f.id);
    const feat = imgs.find(img => img.isFeatureImage);
    const ordered = imgs.filter(img => img.sortOrder > 0 && img.sortOrder !== 9999);
    return {
      id: f.id,
      name: f.name,
      imageCount: imgs.length,
      hasFeature: !!feat,
      orderedCount: ordered.length,
      isVirtual: false
    };
  });
  
  // Uncategorized virtual folder selection
  const uncategorizedImgs = library.value.filter(img => !img.folderId);
  if (uncategorizedImgs.length > 0) {
    list.push({
      id: 'uncategorized',
      name: 'Uncategorized',
      imageCount: uncategorizedImgs.length,
      hasFeature: false,
      orderedCount: 0,
      isVirtual: true
    });
  }
  
  return list;
});

const filteredExportFolders = computed(() => {
  let list = exportFoldersList.value;
  
  if (exportImagesOnlyFilter.value) {
    list = list.filter(f => f.imageCount > 0);
  }
  
  if (exportSearchQuery.value.trim() !== '') {
    const query = exportSearchQuery.value.toLowerCase().trim();
    list = list.filter(f => {
      const realF = customFolders.value.find(cf => cf.id === f.id);
      return f.name.toLowerCase().includes(query) ||
             (realF && (
               (realF.short_description && realF.short_description.toLowerCase().includes(query)) ||
               (realF.description && realF.description.toLowerCase().includes(query)) ||
               (realF.button_url && realF.button_url.toLowerCase().includes(query))
             ));
    });
  }
  
  return list;
});

const isAllSelected = computed({
  get: () => {
    const visible = filteredExportFolders.value;
    if (visible.length === 0) return false;
    return visible.every(f => selectedExportFolderIds.value.includes(f.id));
  },
  set: (val) => {
    const visible = filteredExportFolders.value;
    if (val) {
      const current = new Set(selectedExportFolderIds.value);
      visible.forEach(f => current.add(f.id));
      selectedExportFolderIds.value = Array.from(current);
    } else {
      const visibleIds = visible.map(f => f.id);
      selectedExportFolderIds.value = selectedExportFolderIds.value.filter(id => !visibleIds.includes(id));
    }
  }
});

const clearExportSelection = () => {
  selectedExportFolderIds.value = [];
};

const selectedFoldersStats = computed(() => {
  const selected = exportFoldersList.value.filter(f => selectedExportFolderIds.value.includes(f.id));
  const emptyFoldersCount = selected.filter(f => f.imageCount === 0).length;
  const missingFeature = selected.filter(f => !f.isVirtual && f.imageCount > 0 && !f.hasFeature).length;
  
  // Skipped empty folders: empty folders count if skipEmptyFolders is true
  const skippedEmpty = skipEmptyFolders.value ? emptyFoldersCount : 0;
  // Skipped missing feature: missing feature folders if includeNoFeatureFolders is false
  const skippedNoFeature = !includeNoFeatureFolders.value ? missingFeature : 0;
  
  // Ready folders: selected folders minus skipped empty and skipped no-feature
  const readyFoldersCount = selected.length - (skipEmptyFolders.value ? emptyFoldersCount : 0) - (!includeNoFeatureFolders.value ? missingFeature : 0);
  
  // Total image URLs: sum of imageCount for ready folders (excluding skipped ones)
  const readyList = selected.filter(f => {
    if (f.imageCount === 0 && skipEmptyFolders.value) return false;
    if (!f.isVirtual && f.imageCount > 0 && !f.hasFeature && !includeNoFeatureFolders.value) return false;
    return true;
  });
  const totalUrls = readyList.reduce((sum, f) => sum + f.imageCount, 0);
  
  return {
    count: selected.length,
    totalUrls,
    missingFeature,
    emptyFolders: emptyFoldersCount,
    skippedEmpty,
    skippedNoFeature,
    readyFoldersCount
  };
});

const previewRows = computed(() => {
  const selected = exportFoldersList.value.filter(f => selectedExportFolderIds.value.includes(f.id));
  return selected.slice(0, 5).map(f => {
    let status = t('mediaLibrary.ready');
    let statusCode = 'ready';
    if (f.imageCount === 0) {
      status = skipEmptyFolders.value ? t('mediaLibrary.skipped') : t('mediaLibrary.readyEmpty');
      statusCode = skipEmptyFolders.value ? 'skipped' : 'readyEmpty';
    } else if (!f.isVirtual && !f.hasFeature) {
      status = includeNoFeatureFolders.value ? t('mediaLibrary.warningNoFeature') : t('mediaLibrary.skipped');
      statusCode = includeNoFeatureFolders.value ? 'warningNoFeature' : 'skipped';
    }
    return {
      name: f.name,
      imageCount: f.imageCount,
      featureStatus: f.isVirtual ? 'N/A' : (f.hasFeature ? `✓ ${t('common.yes')}` : `❌ ${t('mediaLibrary.missingFeature')}`),
      status,
      statusCode
    };
  });
});

const getRowStatusText = (folder: any) => {
  if (folder.imageCount === 0) {
    return skipEmptyFolders.value ? t('mediaLibrary.willBeSkipped') : t('mediaLibrary.ready');
  }
  if (!folder.isVirtual && !folder.hasFeature) {
    return includeNoFeatureFolders.value ? t('mediaLibrary.ready') : t('mediaLibrary.willBeSkipped');
  }
  return t('mediaLibrary.ready');
};

const getRowStatusClass = (folder: any) => {
  if (folder.imageCount === 0) {
    return skipEmptyFolders.value ? 'text-text-muted font-normal' : 'text-primary font-bold';
  }
  if (!folder.isVirtual && !folder.hasFeature) {
    return includeNoFeatureFolders.value ? 'text-warning font-bold' : 'text-text-muted font-normal';
  }
  return 'text-primary font-bold';
};

const openExportModal = () => {
  selectedExportFolderIds.value = [];
  exportSearchQuery.value = '';
  exportImagesOnlyFilter.value = false;
  
  if (selectedFolderIds.value.length > 0) {
    selectedExportFolderIds.value = [...selectedFolderIds.value];
    exportScope.value = 'selected';
  } else if (currentFolder.value !== 'all' && currentFolder.value !== 'uncategorized') {
    const hasPermission = exportFoldersList.value.some(f => f.id === currentFolder.value);
    if (hasPermission) {
      selectedExportFolderIds.value = [currentFolder.value];
      exportScope.value = 'selected';
    }
  } else if (currentFolder.value === 'uncategorized') {
    const hasUncategorized = exportFoldersList.value.some(f => f.id === 'uncategorized');
    if (hasUncategorized) {
      selectedExportFolderIds.value = ['uncategorized'];
      exportScope.value = 'selected';
    }
  } else {
    selectedExportFolderIds.value = exportFoldersList.value.map(f => f.id);
    exportScope.value = 'all';
  }
  showExportModal.value = true;
};

const escapeCSV = (val: string) => {
  if (val === null || val === undefined) return '""';
  const escaped = val.replace(/"/g, '""');
  return `"${escaped}"`;
};

// Strip HTML tags for CSV export (preserves line breaks as spaces)
const stripHtml = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?(p|div|h[1-6]|li|ul|ol|blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const getExportFilename = () => {
  const dateStr = new Date().toISOString().split('T')[0];
  let baseName = '';
  
  if (selectedExportFolderIds.value.length === exportFoldersList.value.length) {
    baseName = `image-library-export-${dateStr}`;
  } else if (selectedExportFolderIds.value.length === 1) {
    const folderId = selectedExportFolderIds.value[0];
    const folder = exportFoldersList.value.find(f => f.id === folderId);
    const folderName = folder ? folder.name : 'folder';
    const sanitizedName = folderName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/g, '');
    baseName = `${sanitizedName}-images-${dateStr}`;
  } else {
    baseName = `selected-folder-images-${dateStr}`;
  }
  return `${baseName}.${exportFormat.value === 'json' ? 'json' : 'csv'}`;
};

const fetchAllImages = async (
  apply: (q: any) => any,
  columns = 'id, url, folder_id, is_feature_image, sort_order'
): Promise<any[]> => {
  const PAGE = 1000;
  let out: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await apply(supabase.from('team_images').select(columns))
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    out = out.concat(data);
    if (data.length < PAGE) break;
  }
  return out;
};

const runCsvExport = async (folderIds: string[]) => {
  if (folderIds.length === 0) {
    showToast(t('mediaLibrary.toast.exportSelectFolder'));
    return;
  }
  
  exportingCsv.value = true;
  showToast(t('mediaLibrary.toast.preparingExport'));
  
  try {
    const realFolderIds = folderIds.filter(id => id !== 'uncategorized');
    let allImages: any[] = [];
    
    if (realFolderIds.length > 0) {
      const data = await fetchAllImages((q) => q.in('folder_id', realFolderIds));
      allImages = [...allImages, ...data];
    }

    if (folderIds.includes('uncategorized')) {
      const data = await fetchAllImages((q) => q.is('folder_id', null));
      allImages = [...allImages, ...data];
    }
    
    let hasMissingUrls = false;
    const validImgs = allImages.filter(img => {
      if (!img.url) {
        hasMissingUrls = true;
        return false;
      }
      return true;
    });
    
    if (hasMissingUrls) {
      showToast(t('mediaLibrary.toast.exportSkippedMissingUrl'));
    }
    
    const csvRows: {
      name: string;
      images: string;
      shortDescription: string;
      description: string;
      descriptionHtml: string;
      buttonUrl: string;
      sku: string;
      gtin: string;
      price: string;
      category: string;
      productType: string;
      machineCategory: string;
      featureImage: string;
      galleryImages: string;
    }[] = [];

    folderIds.forEach(folderId => {
      let folderName = '';
      let imgs: any[] = [];
      let isVirtualFolder = false;
      let hasFeature = false;
      let shortDesc = '';
      let desc = '';
      let descHtml = '';
      let btnUrl = '';
      let sku = '';
      let gtin = '';
      let price = '';
      let category = '';
      let productType = '';
      let machineCategory = '';

      if (folderId === 'uncategorized') {
        folderName = t('mediaLibrary.uncategorized');
        imgs = validImgs.filter(img => !img.folder_id);
        isVirtualFolder = true;
      } else {
        const folder = exportFoldersList.value.find(f => f.id === folderId);
        if (!folder) return;
        folderName = folder.name;
        imgs = validImgs.filter(img => img.folder_id === folderId);
        hasFeature = folder.hasFeature;

        const realFolderObj = customFolders.value.find(cf => cf.id === folderId);
        if (realFolderObj) {
          shortDesc = realFolderObj.short_description || '';
          descHtml = isMetadataOnlyText(realFolderObj.description) ? '' : (realFolderObj.description || '');
          desc = isMetadataOnlyText(realFolderObj.description) ? '' : stripHtml(realFolderObj.description || '');
          btnUrl = realFolderObj.button_url || '';
          sku = realFolderObj.sku || '';
          gtin = realFolderObj.gtin || realFolderObj.product_gtin || '';
          price = realFolderObj.product_price || '';
          category = realFolderObj.product_category || '';
          productType = getFolderProductType(realFolderObj) || '';
          machineCategory = realFolderObj.machine_category || 'Not set';
        }
      }
      
      if (imgs.length === 0 && skipEmptyFolders.value) {
        return;
      }
      
      if (!isVirtualFolder && imgs.length > 0 && !hasFeature && !includeNoFeatureFolders.value) {
        return;
      }
      
      imgs.sort((a, b) => {
        if (a.is_feature_image && !b.is_feature_image) return -1;
        if (!a.is_feature_image && b.is_feature_image) return 1;
        const orderA = a.sort_order === 9999 || a.sort_order === 0 || a.sort_order === null ? 999999 : a.sort_order;
        const orderB = b.sort_order === 9999 || b.sort_order === 0 || b.sort_order === null ? 999999 : b.sort_order;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });
      
      const uniqueUrls = [...new Set(imgs.map(img => img.url))];
      const featureImg = imgs.find(img => img.is_feature_image);
      const featureUrl = featureImg ? featureImg.url : (uniqueUrls[0] || '');
      const galleryUrls = uniqueUrls.filter(u => u !== featureUrl);
      csvRows.push({
        name: folderName,
        images: uniqueUrls.join(', '),
        shortDescription: shortDesc,
        description: desc,
        descriptionHtml: descHtml,
        buttonUrl: btnUrl,
        sku,
        gtin,
        price,
        category,
        productType,
        machineCategory,
        featureImage: featureUrl,
        galleryImages: galleryUrls.join(', ')
      });
    });
    
    if (csvRows.length === 0) {
      showToast(t('mediaLibrary.toast.exportNoImages'));
      exportingCsv.value = false;
      return;
    }
    
    const splitUrls = (joined: string) => joined.split(', ').map(u => u.trim()).filter(Boolean);

    let fileContent = '';
    let mimeType = 'text/csv;charset=utf-8;';

    if (exportFormat.value === 'json') {
      mimeType = 'application/json;charset=utf-8;';
      const records = csvRows.map(r => {
        const base: Record<string, unknown> = {
          name: r.name,
          featureImage: r.featureImage,
          galleryImages: splitUrls(r.galleryImages),
          images: splitUrls(r.images),
        };
        if (exportIncludeContentFields.value) {
          base.productType = r.productType;
          base.machineCategory = r.machineCategory;
          base.category = r.category;
          base.sku = r.sku;
          base.gtin = r.gtin;
          base.price = r.price;
          base.shortDescription = r.shortDescription;
          base.description = r.descriptionHtml;
          base.buttonUrl = r.buttonUrl;
        }
        return base;
      });
      fileContent = JSON.stringify(records, null, 2);
    } else {
      let header = '';
      let body = '';

      if (csvExportType.value === 'woocommerce') {
        header = 'Type,SKU,GTIN,Name,Published,Short description,Description,Regular price,Categories,Images,External URL,Button text,Meta: product_type,Meta: machine_category';
        body = csvRows.map(r =>
          `"simple",${escapeCSV(r.sku)},${escapeCSV(r.gtin)},${escapeCSV(r.name)},"1",${escapeCSV(r.shortDescription)},${escapeCSV(r.description)},${escapeCSV(r.price)},${escapeCSV(r.category)},${escapeCSV(r.images)},${escapeCSV(r.buttonUrl)},"Buy Now",${escapeCSV(r.productType)},${escapeCSV(r.machineCategory)}`
        ).join('\n');
      } else if (csvExportType.value === 'simple') {
        header = 'Name,SKU,GTIN,Price,Images';
        body = csvRows.map(r =>
          `${escapeCSV(r.name)},${escapeCSV(r.sku)},${escapeCSV(r.gtin)},${escapeCSV(r.price)},${escapeCSV(r.images)}`
        ).join('\n');
      } else {
        if (exportIncludeContentFields.value) {
          header = 'Name,Product Type,Machine Category,Category,SKU,GTIN,Price,Short Description,Description,Images,Feature Image,Gallery Images,Button URL';
          body = csvRows.map(r =>
            `${escapeCSV(r.name)},${escapeCSV(r.productType)},${escapeCSV(r.machineCategory)},${escapeCSV(r.category)},${escapeCSV(r.sku)},${escapeCSV(r.gtin)},${escapeCSV(r.price)},${escapeCSV(r.shortDescription)},${escapeCSV(r.description)},${escapeCSV(r.images)},${escapeCSV(r.featureImage)},${escapeCSV(r.galleryImages)},${escapeCSV(r.buttonUrl)}`
          ).join('\n');
        } else {
          header = 'Name,Images';
          body = csvRows.map(r => `${escapeCSV(r.name)},${escapeCSV(r.images)}`).join('\n');
        }
      }

      if (exportIncludeHeaderRow.value) {
        fileContent = '\ufeff' + header + '\n' + body;
      } else {
        fileContent = '\ufeff' + body;
      }
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', getExportFilename());
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast(t('mediaLibrary.toast.exportSuccess'));
  } catch (err) {
    console.error('[csv-export] Export failed:', err);
    showToast(t('mediaLibrary.toast.exportFailed'));
  } finally {
    exportingCsv.value = false;
  }
};

const triggerCsvExport = async () => {
  let targetIds: string[] = [];
  if (exportScope.value === 'selected') {
    targetIds = selectedExportFolderIds.value;
  } else if (exportScope.value === 'filtered') {
    targetIds = filteredFolders.value.map(f => f.id);
  } else {
    targetIds = customFolders.value.map(f => f.id);
  }
  await runCsvExport(targetIds);
  showExportModal.value = false;
};

const triggerSelectedCsvExport = async () => {
  if (selectedFolderIds.value.length === 0) {
    showToast('Select at least one product to export.');
    return;
  }
  await runCsvExport(selectedFolderIds.value);
};

const selectAllVisibleFolders = () => {
  const visibleIds = filteredFolders.value.map(f => f.id);
  selectedFolderIds.value = Array.from(new Set([...selectedFolderIds.value, ...visibleIds]));
};

/* ─── Product Data Auto-Import ──────────────────────────────────────────────
   Scans a WooCommerce category via the scan-product-category edge function,
   maps scanned products by exact product identity, and applies
   SKU / short / full description with safe defaults (never overwrites populated
   fields unless the user chooses Replace). */
interface ScannedProduct {
  productId?: string | null;
  sourceSlug?: string | null;
  productType?: ProductType | 'unknown' | null;
  title: string;
  url: string;
  sku: string | null;
  gtin?: string | null;
  price?: string | null;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  imageUrl: string | null;
  metaDescription: string | null;
  sources?: {
    title?: string;
    sku?: string;
    short?: string;
    full?: string;
    title_source?: string;
    sku_source?: string;
    gtin_source?: string;
    price_source?: string;
    category_source?: string;
    short_description_source?: string;
    full_description_source?: string;
    full_description_character_count?: number;
    extraction_warnings?: string[];
  };
  warnings?: string[];
  shortLength?: number;
  fullLength?: number;
}
type ImportStatus =
  | 'ready'
  | 'needs_review'
  | 'wrong_match_suspected'
  | 'invalid_description'
  | 'missing_full_description'
  | 'missing_short_description'
  | 'no_match'
  | 'conflict'
  | 'already_has_data'
  | 'verified_match'
  | 'applied'
  | 'ignored';
type MatchMethod = 'auto' | 'manual';
type MatchTier = 'high' | 'medium' | 'low' | 'none';
type MatchReason = 'verified_url' | 'product_id' | 'product_slug' | 'mapping_file' | 'folder_path_slug' | 'manual' | 'fuzzy_name' | 'none';
interface ImportRow {
  folderId: string;
  folderName: string;
  match: ScannedProduct | null;
  score: number;
  tier: MatchTier;
  conflict: boolean;
  status: ImportStatus;
  alternatives: { product: ScannedProduct; score: number }[];
  /** Top fuzzy candidates for the conflict resolver (best→worst, with keywords). */
  conflictCandidates?: { product: ScannedProduct; score: number; matchedTokens: string[] }[];
  /** Folder tokens that matched the current `match` title — for display in the dropdown. */
  matchedKeywords?: string[];
  searchQuery?: string;
  showDropdown?: boolean;
  matchMethod: MatchMethod;
  matchReason: MatchReason;
  productId: string;
  productType: ProductType | null;
  productSlug: string;
  verified: boolean;
  warnings: string[];
}

interface ImportScanSummary {
  categoryPagesScanned?: number;
  productUrlsFound?: number;
  duplicatesSkipped?: number;
  productPagesScanned?: number;
  detailPagesScanned?: number;
  failedCategoryPages?: string[];
  failedProductPages?: string[];
  failedPages?: string[];
  missingSku?: number;
  missingShort?: number;
  missingFull?: number;
  invalidFullDescriptions?: number;
  equipmentProducts?: number;
  attachmentProducts?: number;
  unknownTypeProducts?: number;
}

const showImportModal = ref(false);
const importSourceUrl = ref('https://typhonmachinery.com/product-category/equipment/');
const importScanning = ref(false);
const importProgress = ref('');
const importError = ref('');
const importRows = ref<ImportRow[]>([]);
const scannedProducts = ref<ScannedProduct[]>([]);
const importScannedCount = ref(0);
const importScanSummary = ref<ImportScanSummary | null>(null);
const previewRow = ref<ImportRow | null>(null);
const previewAction = ref<'missing' | 'replace' | 'save' | null>(null);

// Widescreen & Split Review UX variables
const selectedRow = ref<ImportRow | null>(null);
const selectedRowIds = ref<string[]>([]);
const bulkApplying = ref(false);
const bulkApplyMode = ref<'missing' | 'replace'>('missing');
const isLargeScreen = ref(typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
const activeMobileTab = ref<'list' | 'detail'>('list');

const importStatusFilter = ref<'all' | 'ready' | 'needs_review' | 'missing_sku' | 'missing_short_description' | 'missing_full_description' | 'invalid_description' | 'wrong_match_suspected' | 'no_match' | 'verified_match' | 'conflict'>('all');
const importTypeFilter = ref<'all' | ProductType | 'unknown'>('all');
const importStatusFilterOptions = [
  { value: 'all' as const, label: 'All' },
  { value: 'ready' as const, label: 'Ready' },
  { value: 'verified_match' as const, label: 'Verified Match' },
  { value: 'needs_review' as const, label: 'Review' },
  { value: 'conflict' as const, label: 'Conflicts' },
  { value: 'no_match' as const, label: 'No Match' },
  { value: 'invalid_description' as const, label: 'Invalid Description' }
];
const importTypeFilterOptions: { value: typeof importTypeFilter.value; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'attachment', label: 'Attachments' },
  { value: 'unknown', label: 'Needs Type' }
];

const readyCount = computed(() => importRows.value.filter(r => r.status === 'ready' || r.status === 'verified_match').length);
const reviewCount = computed(() => importRows.value.filter(r => ['needs_review', 'wrong_match_suspected', 'invalid_description', 'missing_short_description', 'missing_full_description', 'already_has_data'].includes(r.status)).length);
const noMatchCount = computed(() => importRows.value.filter(r => r.status === 'no_match').length);
const conflictCount = computed(() => importRows.value.filter(r => r.conflict || r.status === 'conflict').length);

const currentFolderObj = (id: string) => customFolders.value.find(f => f.id === id) || null;

const confBadgeClass = (tier: MatchTier) =>
  tier === 'high' ? 'bg-status-approved-bg/20 text-status-approved-fg'
    : tier === 'medium' ? 'bg-status-submitted-bg/20 text-status-submitted-fg'
      : 'bg-status-needs-fix-bg/20 text-status-needs-fix-fg';
const tierForConfidence = (confidence: number): MatchTier => {
  if (confidence >= 100) return 'high';
  if (confidence >= 70) return 'medium';
  if (confidence > 0) return 'low';
  return 'none';
};
const matchReasonLabel = (reason: MatchReason) =>
  ({
    verified_url: 'verified URL',
    product_id: 'product ID',
    product_slug: 'product slug',
    mapping_file: 'mapping file',
    folder_path_slug: 'folder path',
    manual: 'manual',
    fuzzy_name: 'name match',
    none: 'not mapped'
  } as Record<MatchReason, string>)[reason];
const statusLabel = (s: ImportStatus) =>
  ({
    ready: 'Ready',
    needs_review: 'Needs Review',
    wrong_match_suspected: 'Wrong Match Suspected',
    invalid_description: 'Invalid Description',
    missing_full_description: 'Missing Full Description',
    missing_short_description: 'Missing Short Description',
    no_match: 'No Match',
    conflict: 'Conflict',
    already_has_data: 'Already Has Data',
    verified_match: 'Verified Match',
    applied: 'Applied',
    ignored: 'Ignored'
  } as Record<ImportStatus, string>)[s];
const statusBadgeClass = (s: ImportStatus) =>
  s === 'ready' || s === 'verified_match' || s === 'applied' ? 'bg-status-approved-bg/20 text-status-approved-fg'
    : s === 'needs_review' || s === 'already_has_data' ? 'bg-status-submitted-bg/20 text-status-submitted-fg'
      : s === 'wrong_match_suspected' || s === 'invalid_description' || s === 'missing_full_description' || s === 'missing_short_description' || s === 'conflict'
        ? 'bg-status-needs-fix-bg/20 text-status-needs-fix-fg'
        : 'bg-soft text-text-muted';

const metadataOnlyTextPattern = /^\s*(gtin|gtin-?8|gtin-?12|gtin-?13|gtin-?14|sku|upc|ean|isbn|mpn|price|category|categories|tag|tags|brand|availability|shipping|stock)\s*:?\s*[-#A-Z0-9., $/]+\.?\s*$/i;
const metadataLabelPattern = /\b(gtin|gtin-?8|gtin-?12|gtin-?13|gtin-?14|sku|upc|ean|isbn|mpn|price|category|categories|tag|tags|brand|availability|shipping|stock|weight|dimensions?)\b/i;

const isMetadataOnlyText = (raw: string | null | undefined) => {
  const text = stripHtml(raw || '').trim();
  if (!text) return false;
  if (metadataOnlyTextPattern.test(text)) return true;
  const lines = text.split(/\n|\. /).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return false;
  const metadataLines = lines.filter((line) => metadataOnlyTextPattern.test(line) || metadataLabelPattern.test(line));
  return metadataLines.length / lines.length >= 0.65;
};

const hasUsableDescription = (raw: string | null | undefined) =>
  !!raw?.trim() && !isMetadataOnlyText(raw);

const rowHasExistingData = (folder: CustomFolder | null) =>
  !!(folder?.sku?.trim() || hasUsableDescription(folder?.short_description) || hasUsableDescription(folder?.description));

const productWarnings = (product: ScannedProduct | null) => {
  if (!product) return [] as string[];
  const warnings = new Set<string>(product.warnings || product.sources?.extraction_warnings || []);
  if (!getProductType(product)) warnings.add('product_type_required');
  if (isMetadataOnlyText(product.description)) {
    warnings.add('invalid_full_description');
    warnings.add('description_metadata_only');
  }
  if (isMetadataOnlyText(product.shortDescription)) {
    warnings.add('invalid_short_description');
  }
  if (warnings.has('description_metadata_only')) warnings.add('invalid_full_description');
  if (!product.description) warnings.add('missing_full_description');
  if (!product.shortDescription) warnings.add('missing_short_description');
  if (product.description && stripHtml(product.description).length < 40) warnings.add('full_description_very_short');
  if (
    product.shortDescription &&
    product.description &&
    stripHtml(product.shortDescription).toLowerCase() === stripHtml(product.description).toLowerCase()
  ) {
    warnings.add('short_full_identical');
  }
  return [...warnings];
};

const warningText = (warning: string) => ({
  missing_sku: 'Missing SKU.',
  missing_short_description: 'Missing Short Description.',
  missing_full_description: 'Missing Full Description.',
  full_description_very_short: 'Full description may be incomplete.',
  full_description_short_review: 'Full description is short and needs review.',
  invalid_short_description: 'Invalid short description.',
  invalid_full_description: 'Invalid Description.',
  description_metadata_only: 'Description candidate was metadata only.',
  short_full_identical: 'Short and full description look identical.',
  full_from_meta_only: 'Full description came from meta description only.',
  exact_identity_required: 'Exact product identity is required before importing.',
  missing_identity_mapping: 'Folder needs product slug or mapping file entry.',
  missing_product_type_mapping: 'Folder needs equipment or attachment type before matching.',
  folder_type_conflicts_mapping: 'Folder type conflicts with the exact mapping file entry.',
  product_type_required: 'Product type is required before importing.',
  cross_product_type_blocked: 'Equipment and attachment products cannot be matched together.',
  saved_match_not_in_latest_scan: 'Saved match was not found in this scan.'
} as Record<string, string>)[warning] || warning.replace(/_/g, ' ');

const statusForRow = (row: Pick<ImportRow, 'match' | 'tier' | 'conflict' | 'verified' | 'score' | 'warnings' | 'matchMethod'>, folder: CustomFolder | null): ImportStatus => {
  if (!row.match) return 'no_match';
  if (row.conflict) return 'conflict';
  if (row.warnings.includes('invalid_full_description') || row.warnings.includes('description_metadata_only')) return 'invalid_description';
  if (row.verified) return 'verified_match';
  if (row.matchMethod === 'manual') return 'needs_review';
  // Exact identity (100) OR a high-confidence fuzzy name match (tier 'high', >=90)
  // are Ready-eligible; everything weaker is review/no-match.
  if (row.tier !== 'high') return row.score > 0 ? 'needs_review' : 'no_match';
  if (row.warnings.includes('missing_full_description')) return 'missing_full_description';
  if (row.warnings.includes('missing_short_description')) return 'missing_short_description';
  if (row.warnings.includes('invalid_short_description') || row.warnings.includes('full_description_very_short') || row.warnings.includes('full_description_short_review') || row.warnings.includes('short_full_identical')) return 'needs_review';
  if (rowHasExistingData(folder)) return 'already_has_data';
  return 'ready';
};

const productSearchText = (p: ScannedProduct) =>
  [
    p.productId || '',
    p.sourceSlug || '',
    productTypeLabel(getProductType(p)),
    getProductIdentitySlug(p),
    p.title,
    p.sku || '',
    p.gtin || '',
    p.price || '',
    p.category || '',
    p.url,
    ...tokenizeProductModelPieces(p.title),
    ...tokenizeProductModelPieces(p.sku || '')
  ].join(' ').toLowerCase();

const tokenizeProductModelPieces = (raw: string) =>
  (raw || '').toLowerCase().match(/[a-z]+[\s-]?\d+(?:\.\d+)?|\d+(?:\.\d+)?[a-z]*/g) || [];

const formatDescriptionStatus = (product: ScannedProduct | null, field: 'short' | 'full') => {
  if (!product) return 'Missing';
  const warnings = new Set(productWarnings(product));
  if (field === 'full' && (warnings.has('invalid_full_description') || warnings.has('description_metadata_only'))) return 'Invalid Description';
  if (field === 'short' && warnings.has('invalid_short_description')) return 'Invalid Short';
  if (field === 'short') return product.shortDescription ? 'Present' : 'Missing Short Description';
  return product.description ? (warnings.has('full_description_short_review') || stripHtml(product.description).length < 120 ? 'Review' : 'Present') : 'Missing Full Description';
};

const hasInvalidFullDescription = (product: ScannedProduct | null) => {
  if (!product) return false;
  const warnings = new Set(productWarnings(product));
  return warnings.has('invalid_full_description') || warnings.has('description_metadata_only');
};

const hasInvalidShortDescription = (product: ScannedProduct | null) => {
  if (!product) return false;
  return new Set(productWarnings(product)).has('invalid_short_description');
};

const cleanDescriptionPreview = (html: string | null | undefined, fallback = '—') => {
  const text = stripHtml(html || '').trim();
  return text || fallback;
};

const identityScoreForProduct = (folder: CustomFolder | { name: string }, product: ScannedProduct) =>
  exactIdentityConfidence(folder, product);

const productSlugFromSavedFolder = (folder: CustomFolder) =>
  slugifyProductIdentity(folder.product_slug || folder.product_id || productSlugFromUrl(folder.matched_product_url) || '');

const identityWarningsForFolder = (folder: CustomFolder) => {
  const warnings: string[] = [];
  const explicitType = normalizeProductType(folder.product_type);
  const mapping = mappingForFolder(folder);
  if (!getFolderProductType(folder)) warnings.push('missing_product_type_mapping');
  if (explicitType && mapping && explicitType !== mapping.type) warnings.push('folder_type_conflicts_mapping');
  if (!folder.product_id && !folder.product_slug && !folder.product_folder_path && !mappingForFolder(folder)) {
    warnings.push('missing_identity_mapping');
  }
  return warnings;
};

const makeSavedProduct = (folder: CustomFolder): ScannedProduct | null => {
  if (!folder.matched_product_url && !folder.matched_product_title) return null;
  return {
    productId: folder.product_id || folder.product_slug || productSlugFromSavedFolder(folder),
    sourceSlug: folder.product_slug || productSlugFromSavedFolder(folder),
    productType: getFolderProductType(folder) || 'unknown',
    title: folder.matched_product_title || folder.imported_product_title || folder.name,
    url: folder.matched_product_url || folder.imported_from_url || '',
    sku: folder.matched_product_sku || folder.sku || null,
    gtin: folder.product_gtin || null,
    price: folder.product_price || null,
    shortDescription: null,
    description: null,
    category: folder.product_category || null,
    imageUrl: null,
    metaDescription: null,
    warnings: ['saved_match_not_in_latest_scan']
  };
};

/* ── Fuzzy name matching (fallback when there is no exact identity match) ───
   Used so folders without a product_type/slug still get suggestions. Weights
   model codes (V980, X1300, 1.5) and roman numerals (XI, XIII, XVIII) strongly;
   ignores generic words (mini, loader, excavator, machine, typhon…). Roman
   numerals must match EXACTLY so XI never matches XIII / XIX. */
const FUZZY_STOPWORDS = new Set(['the','a','an','for','and','with','of','to','new','sale','machine','machinery','equipment','series','model','type','typhon','konstructz','konstruct','mini','compact','loader','excavator','skid','steer','dumper','trencher','crusher','stone','wheel','backhoe','towable','tracked']);
const FUZZY_ROMAN_RE = /^(m{0,4})(cm|cd|d?c{0,3})(xc|xl|l?x{0,3})(ix|iv|v?i{0,3})$/i;
const fuzzyTokenize = (raw: string): string[] =>
  (raw || '').toLowerCase().replace(/[^a-z0-9.]+/g, ' ').split(' ').map(t => t.replace(/^\.+|\.+$/g, '')).filter(t => t && t !== '.');
const isDigitTok = (t: string) => /\d/.test(t);
const isRomanTok = (t: string) => t.length >= 1 && t.length <= 7 && /^[ivxlcdm]+$/i.test(t) && FUZZY_ROMAN_RE.test(t);
const isModelTok = (t: string) => isDigitTok(t) || isRomanTok(t);

interface FuzzyDetail { score: number; matchedTokens: string[]; missingModel: boolean; hasModel: boolean; }

const fuzzyNameDetail = (folderName: string, title: string): FuzzyDetail => {
  const f = fuzzyTokenize(folderName);
  const tt = fuzzyTokenize(title);
  if (!f.length || !tt.length) return { score: 0, matchedTokens: [], missingModel: false, hasModel: false };
  const tset = new Set(tt);
  const weightOf = (t: string) => isModelTok(t) ? 3 : FUZZY_STOPWORDS.has(t) ? 0.25 : 1;
  const matches = (t: string): boolean => {
    if (tset.has(t)) return true;
    if (isRomanTok(t)) return false;                                   // roman: exact only
    if (isDigitTok(t)) return t.length >= 2 && tt.some(x => isDigitTok(x) && (x.includes(t) || t.includes(x)));
    if (!FUZZY_STOPWORDS.has(t) && t.length >= 4) return tt.some(x => x.includes(t) || t.includes(x));
    return false;
  };
  let total = 0, matched = 0, missingModel = false, distinctive = false;
  const matchedTokens: string[] = [];
  for (const t of f) {
    const w = weightOf(t); total += w;
    if (matches(t)) {
      matched += w;
      // Surface model tokens + distinctive words (not stopwords) as "matched keywords"
      if (isModelTok(t) || !FUZZY_STOPWORDS.has(t)) matchedTokens.push(t);
      if (!isModelTok(t) && !FUZZY_STOPWORDS.has(t)) distinctive = true;
    } else if (isModelTok(t)) missingModel = true;
  }
  let score = total > 0 ? Math.round((matched / total) * 100) : 0;
  const hasModel = f.some(isModelTok);
  if (hasModel && missingModel) score = Math.min(score, 45);          // model mismatch = danger
  if (!hasModel && !distinctive) score = Math.min(score, 55);         // all-generic = weak
  return { score, matchedTokens, missingModel, hasModel };
};

const fuzzyNameScore = (folderName: string, title: string): number => fuzzyNameDetail(folderName, title).score;

interface FuzzyCandidate { product: ScannedProduct; score: number; matchedTokens: string[]; hasModel: boolean; missingModel: boolean; }

const fuzzyRankAll = (folderName: string, products: ScannedProduct[], folderMachineCategory?: string | null): FuzzyCandidate[] => {
  const out: FuzzyCandidate[] = [];
  for (const p of products) {
    const pType = getProductType(p);
    const pMC = inferMachineCategory(p.title, pType);
    if (folderMachineCategory && pMC && folderMachineCategory.toLowerCase() !== pMC.toLowerCase()) {
      continue;
    }
    const d = fuzzyNameDetail(folderName, p.title);
    if (d.score <= 0) continue;
    out.push({ product: p, score: d.score, matchedTokens: d.matchedTokens, hasModel: d.hasModel, missingModel: d.missingModel });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
};

const buildRows = (products: ScannedProduct[]) => {
  const rows: ImportRow[] = customFolders.value.map(folder => {
    const folderType = getFolderProductType(folder);
    const folderWarnings = identityWarningsForFolder(folder);
    const savedProductFromScan = products.find(p => folder.matched_product_url && p.url === folder.matched_product_url) || null;
    const savedProductType = savedProductFromScan ? getProductType(savedProductFromScan) : null;
    const exact = resolveExactProductMatch(folder, products);
    const alternatives = products
      .filter(p => identityScoreForProduct(folder, p) === 100)
      .map(p => ({ product: p, score: 100 }));

    if (!exact && folder.match_verified_by_user && folderType && (folder.matched_product_url || folder.matched_product_title)) {
      const savedMatch = makeSavedProduct(folder);
      if (savedMatch && getProductType(savedMatch) === folderType && getProductIdentitySlug(savedMatch)) {
        const productSlug = getProductIdentitySlug(savedMatch);
        const warnings = productWarnings(savedMatch);
        return {
          folderId: folder.id,
          folderName: folder.name,
          match: savedMatch,
          score: 100,
          tier: 'high' as MatchTier,
          conflict: false,
          status: 'verified_match' as ImportStatus,
          alternatives,
          searchQuery: savedMatch.title,
          showDropdown: false,
          matchMethod: 'manual' as MatchMethod,
          matchReason: 'verified_url' as MatchReason,
          productId: folder.product_id || productSlug,
          productType: folderType,
          productSlug,
          verified: true,
          warnings
        };
      }
    }

    if (!exact) {
      // Fuzzy fallback — full ranked list so we can show alternatives & resolve
      // conflicts without re-scoring later.
      const ranked = fuzzyRankAll(folder.name, products, folder.machine_category);
      const FUZZY_MIN = 70;
      const best = ranked[0];
      if (best && best.score >= FUZZY_MIN) {
        const second = ranked[1];
        const tier: MatchTier = best.score >= 90 ? 'high' : 'medium';
        // Strict conflict: BOTH candidates must be high (≥90) AND within 5 points
        // AND share the model-token signature. Stops "Stomp V980 vs V1000" (45 vs 100)
        // from being flagged, but keeps genuinely ambiguous high-score ties.
        const conflict =
          !!second && best.score >= 90 && second.score >= 90 && (best.score - second.score) <= 5 &&
          best.hasModel === second.hasModel && !best.missingModel && !second.missingModel;
        const productSlug = getProductIdentitySlug(best.product) || '';
        return {
          folderId: folder.id,
          folderName: folder.name,
          match: best.product,
          score: best.score,
          tier,
          conflict,
          status: 'needs_review' as ImportStatus,
          alternatives,
          conflictCandidates: ranked.slice(0, 6).map(c => ({ product: c.product, score: c.score, matchedTokens: c.matchedTokens })),
          matchedKeywords: best.matchedTokens,
          searchQuery: best.product.title,
          showDropdown: false,
          matchMethod: 'auto' as MatchMethod,
          matchReason: 'fuzzy_name' as MatchReason,
          productId: productSlug,
          productType: folderType || getProductType(best.product) || 'equipment',
          productSlug,
          verified: false,
          warnings: productWarnings(best.product)
        };
      }

      const mapping = mappingForFolder(folder);
      const warnings = [...folderWarnings, 'exact_identity_required'];
      if (savedProductFromScan && folderType && savedProductType && savedProductType !== folderType) {
        warnings.push('cross_product_type_blocked');
      }
      return {
        folderId: folder.id,
        folderName: folder.name,
        match: null,
        score: 0,
        tier: 'none' as MatchTier,
        conflict: false,
        status: 'no_match' as ImportStatus,
        alternatives,
        searchQuery: folder.product_slug || mapping?.slug || '',
        showDropdown: false,
        matchMethod: 'auto' as MatchMethod,
        matchReason: 'none' as MatchReason,
        productId: folder.product_id || mapping?.productId || '',
        productType: folderType,
        productSlug: folder.product_slug || mapping?.slug || '',
        verified: false,
        warnings
      };
    }
    const warnings = productWarnings(exact.product);
    const verified = !!folder.match_verified_by_user && (
      (!!folder.matched_product_url && folder.matched_product_url === exact.product.url) ||
      (!!productSlugFromSavedFolder(folder) && productSlugFromSavedFolder(folder) === exact.slug)
    );
    return {
      folderId: folder.id,
      folderName: folder.name,
      match: exact.product,
      score: exact.confidence,
      tier: tierForConfidence(exact.confidence),
      conflict: false,
      status: 'needs_review' as ImportStatus,
      alternatives,
      searchQuery: exact.product.title,
      showDropdown: false,
      matchMethod: 'auto' as MatchMethod,
      matchReason: exact.reason,
      productId: exact.productId,
      productType: exact.productType,
      productSlug: exact.slug,
      verified,
      warnings
    };
  });

  // ── Enforce one-to-one auto matching ─────────────────────────────────
  // When multiple folders auto-pick the SAME product URL, only the highest-scoring
  // folder keeps it; the losers slide down to their next-best fuzzy alternative
  // (>=70) or fall to no_match. Verified/manual matches are sacrosanct.
  const ownedByUrl = new Map<string, ImportRow>();
  const claimable = rows.filter(r => r.match && !r.verified && r.matchMethod === 'auto')
    .sort((a, b) => b.score - a.score);
  for (const r of claimable) {
    const url = r.match!.url;
    const owner = ownedByUrl.get(url);
    if (!owner) { ownedByUrl.set(url, r); continue; }
    // r loses — try to slide it down to its next fuzzy alternative
    const next = (r.conflictCandidates || []).find(c => c.product.url !== url && c.score >= 70 && !ownedByUrl.has(c.product.url));
    if (next) {
      const slug = getProductIdentitySlug(next.product) || '';
      r.match = next.product;
      r.score = next.score;
      r.tier = next.score >= 90 ? 'high' : 'medium';
      r.matchedKeywords = next.matchedTokens;
      r.productId = slug;
      r.productSlug = slug;
      r.searchQuery = next.product.title;
      r.warnings = productWarnings(next.product);
      ownedByUrl.set(next.product.url, r);
    } else {
      r.match = null;
      r.score = 0;
      r.tier = 'none';
      r.matchedKeywords = [];
      r.matchReason = 'none';
      r.status = 'no_match';
    }
  }

  // ── Conflict flag is now ONLY from the strict per-row check above ─────
  // (the old global URL cascade is gone — it created false conflicts).

  for (const r of rows) {
    const folder = currentFolderObj(r.folderId);
    r.status = statusForRow(r, folder);
    // Auto-open the resolver dropdown for conflict rows so the user sees the
    // candidates immediately (they can still close it manually).
    if (r.conflict && (r.conflictCandidates?.length ?? 0) > 1) r.showDropdown = true;
  }
  importRows.value = rows;
};

const DETAIL_BATCH_SIZE = 25;

const runScan = async () => {
  const url = importSourceUrl.value.trim();
  if (!/^https?:\/\//i.test(url)) { importError.value = 'Enter a valid http(s) URL.'; return; }
  importScanning.value = true;
  importError.value = '';
  importProgress.value = 'Discovering products…';
  scannedProducts.value = [];
  importRows.value = [];
  importScannedCount.value = 0;
  try {
    // 1. DISCOVER — fast crawl of all category pages → product URLs only.
    const { data: disc, error: discErr } = await supabase.functions.invoke('scan-product-category', {
      body: { sourceUrl: url, websiteType: 'woocommerce', mode: 'discover' },
    });
    if (discErr) { importError.value = `Could not reach scan-product-category: ${discErr.message}`; return; }
    if (!disc || !disc.ok) { importError.value = (disc && disc.message) || 'No products were found at that URL.'; return; }
    const urls: string[] = disc.productUrls || [];
    if (urls.length === 0) { importError.value = 'No product links were found at that URL.'; return; }

    // 2. DETAILS — scan in batches so no single request times out; render live.
    const all: ScannedProduct[] = [];
    const failed: string[] = [];
    for (let i = 0; i < urls.length; i += DETAIL_BATCH_SIZE) {
      const batch = urls.slice(i, i + DETAIL_BATCH_SIZE);
      importProgress.value = `Scanning products ${Math.min(i + batch.length, urls.length)} / ${urls.length}…`;
      const { data: det, error: detErr } = await supabase.functions.invoke('scan-product-category', {
        body: { mode: 'details', urls: batch },
      });
      if (detErr || !det || !det.ok) {
        failed.push(...batch);
        continue; // keep going — a failed batch shouldn't abort the whole scan
      }
      all.push(...((det.products || []) as ScannedProduct[]));
      if (det.failed) failed.push(...det.failed);
      scannedProducts.value = [...all];
      importScannedCount.value = all.length;
    }

    // 3. Dedupe scanned products by canonical URL + slug (req #5: pagination
    //    can yield the same product twice; matching needs a clean unique set).
    const canonical = (u: string) => u.split('#')[0].split('?')[0].replace(/\/+$/, '');
    const dedupedMap = new Map<string, ScannedProduct>();
    for (const p of all) {
      const key = canonical(p.url) || p.productId || p.sourceSlug || p.title.toLowerCase();
      // keep the richer record (more SKU/description info wins)
      const prev = dedupedMap.get(key);
      const score = (x: ScannedProduct) => (x.sku ? 1 : 0) + (x.shortDescription ? 1 : 0) + (x.description ? 2 : 0);
      if (!prev || score(p) > score(prev)) dedupedMap.set(key, p);
    }
    const deduped = [...dedupedMap.values()];
    const duplicatesMerged = all.length - deduped.length;
    scannedProducts.value = deduped;
    importScannedCount.value = deduped.length;

    // 4. Build the review table once with the full set (so conflict detection is correct).
    importScanSummary.value = {
      ...(disc.summary || {}),
      detailPagesScanned: urls.length,
      duplicatesSkipped: (disc.summary?.duplicatesSkipped ?? 0) + duplicatesMerged,
      failedPages: failed,
      missingSku: deduped.filter(p => !p.sku).length,
      missingShort: deduped.filter(p => !p.shortDescription).length,
      missingFull: deduped.filter(p => !p.description).length,
    } as ImportScanSummary;
    buildRows(deduped);
    if (all.length === 0) importError.value = 'No product details could be scanned.';
  } catch (e: any) {
    importError.value = e?.message || 'Scan failed.';
  } finally {
    importScanning.value = false;
    importProgress.value = '';
  }
};

const setRowMatch = (row: ImportRow, product: ScannedProduct | null) => {
  if (!product) {
    row.match = null;
    row.score = 0;
    row.tier = 'none';
    row.status = 'no_match';
    row.searchQuery = '';
    row.conflict = false;
    row.matchMethod = 'manual';
    row.matchReason = 'none';
    row.productId = '';
    row.productType = null;
    row.productSlug = '';
    row.verified = false;
    row.warnings = [];
    return;
  }
  // A deliberate manual pick is always honored — type is never a hard gate here
  // (apply still requires user confirmation, so a manual choice is safe). Cross-type
  // picks just carry a soft warning. Unknown product type defaults to the folder
  // type, or equipment for this category scan.
  const folder = currentFolderObj(row.folderId);
  const folderType = folder ? getFolderProductType(folder) : null;
  const productType = getProductType(product);
  const warnings = productWarnings(product);
  if (folderType && productType && folderType !== productType) warnings.unshift('cross_product_type_review');
  const productSlug = getProductIdentitySlug(product);
  row.match = product;
  row.score = 100;
  row.tier = 'high';
  row.conflict = false;             // a deliberate manual pick clears the conflict flag for this row
  row.matchMethod = 'manual';
  row.matchReason = 'manual';
  row.productId = product.productId || productSlug;
  row.productType = productType || folderType || 'equipment';
  row.productSlug = productSlug;
  row.verified = false;
  row.warnings = warnings;
  row.status = statusForRow(row, folder);
  row.searchQuery = product.title;
};

/** Best-of exact-identity and fuzzy-name score for a candidate against a row's folder. */
const productMatchScore = (row: ImportRow, p: ScannedProduct) => {
  const folder = currentFolderObj(row.folderId) || { name: row.folderName };
  return Math.max(identityScoreForProduct(folder, p), fuzzyNameScore(row.folderName, p.title));
};

/** Folder tokens that matched this candidate — shown as keyword chips in the resolver. */
const matchedKeywordsFor = (row: ImportRow, p: ScannedProduct): string[] =>
  fuzzyNameDetail(row.folderName, p.title).matchedTokens;

const getFilteredProducts = (row: ImportRow) => {
  const query = (row.searchQuery || '').toLowerCase().trim();
  const folder = currentFolderObj(row.folderId) || { name: row.folderName };
  // Rank by best of exact-identity and fuzzy-name score so relevant suggestions
  // surface first even for folders without an identity mapping.
  const scored = (p: ScannedProduct) => Math.max(identityScoreForProduct(folder, p), fuzzyNameScore(row.folderName, p.title));
  // Search ALL scanned products by default; only the explicit global type filter narrows.
  const typedProducts = scannedProducts.value.filter((p) => {
    if (importTypeFilter.value !== 'all') return (getProductType(p) || 'unknown') === importTypeFilter.value;
    return true;
  });
  if (!query) {
    return typedProducts
      .map(p => ({ product: p, score: scored(p) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(item => item.product);
  }
  return typedProducts
    .filter(p =>
      productSearchText(p).includes(query)
    )
    .map(p => ({ product: p, score: scored(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(item => item.product);
};

const selectProductFromSearch = (row: ImportRow, product: ScannedProduct | null) => {
  setRowMatch(row, product);
  row.showDropdown = false;
};

const closeSearchDropdown = (row: ImportRow) => {
  row.showDropdown = false;
  row.searchQuery = row.match ? row.match.title : '';
};

const filteredImportRows = computed(() => {
  const rows = importRows.value.filter((row) => {
    if (importTypeFilter.value === 'all') return true;
    return (row.productType || (row.match ? getProductType(row.match) : null) || 'unknown') === importTypeFilter.value;
  });
  if (importStatusFilter.value === 'all') return rows;
  if (importStatusFilter.value === 'ready') return rows.filter(row => row.status === 'ready' || row.status === 'verified_match');
  if (importStatusFilter.value === 'needs_review') return rows.filter(row => ['needs_review', 'wrong_match_suspected', 'invalid_description', 'missing_short_description', 'missing_full_description', 'already_has_data'].includes(row.status));
  if (importStatusFilter.value === 'invalid_description') return rows.filter(row => row.status === 'invalid_description' || row.warnings.includes('invalid_full_description') || row.warnings.includes('description_metadata_only'));
  if (importStatusFilter.value === 'conflict') return rows.filter(row => row.conflict || row.status === 'conflict');
  if (importStatusFilter.value === 'no_match') return rows.filter(row => row.status === 'no_match');
  
  // fallback compatibility
  if (importStatusFilter.value === 'missing_sku') return rows.filter(row => !row.match?.sku);
  if (importStatusFilter.value === 'missing_short_description') return rows.filter(row => !row.match?.shortDescription || row.status === 'missing_short_description');
  if (importStatusFilter.value === 'missing_full_description') return rows.filter(row => !row.match?.description || row.status === 'missing_full_description');
  if (importStatusFilter.value === 'wrong_match_suspected') return rows.filter(row => row.status === 'wrong_match_suspected' || row.status === 'conflict');
  return rows.filter(row => row.status === importStatusFilter.value);
});

const scanSummaryItems = computed(() => {
  const s = importScanSummary.value;
  if (!s) return [] as { label: string; value: number }[];
  return [
    { label: 'category pages', value: s.categoryPagesScanned ?? 0 },
    { label: 'URLs found', value: s.productUrlsFound ?? 0 },
    { label: 'duplicates skipped', value: s.duplicatesSkipped ?? 0 },
    { label: 'product pages', value: s.productPagesScanned ?? s.detailPagesScanned ?? 0 },
    { label: 'failed products', value: (s.failedProductPages ?? s.failedPages ?? []).length },
    { label: 'equipment', value: s.equipmentProducts ?? 0 },
    { label: 'attachments', value: s.attachmentProducts ?? 0 },
    { label: 'unknown type', value: s.unknownTypeProducts ?? 0 },
    { label: 'missing SKU', value: s.missingSku ?? 0 },
    { label: 'missing short', value: s.missingShort ?? 0 },
    { label: 'missing full', value: s.missingFull ?? 0 },
    { label: 'invalid full', value: s.invalidFullDescriptions ?? 0 }
  ];
});

const completenessForRow = (row: ImportRow) => {
  const folder = currentFolderObj(row.folderId);
  const imgs = library.value.filter(img => img.folderId === row.folderId);
  return {
    hasImages: imgs.length > 0,
    hasFeatureImage: imgs.some(img => img.isFeatureImage),
    hasSku: !!(folder?.sku || row.match?.sku),
    hasShortDescription: !!(hasUsableDescription(folder?.short_description) || row.match?.shortDescription),
    hasFullDescription: !!(hasUsableDescription(folder?.description) || row.match?.description),
    hasVerifiedMatch: !!(folder?.match_verified_by_user || row.verified)
  };
};

const openPreview = (row: ImportRow, action: 'missing' | 'replace' | 'save' | null = null) => {
  previewRow.value = row;
  previewAction.value = action;
};

const previewWarnings = computed(() => {
  const row = previewRow.value;
  if (!row) return [] as string[];
  const folder = currentFolderObj(row.folderId);
  const warnings = new Set<string>();
  if (row.score < 90 || row.tier !== 'high') warnings.add('Confidence is not high.');
  if (row.status === 'wrong_match_suspected' || row.status === 'conflict') warnings.add('Product identity does not clearly map to this folder.');
  if (!row.productType) warnings.add('Equipment or attachment type is missing.');
  if (!row.productSlug) warnings.add('Exact product slug is missing.');
  if (row.warnings.includes('invalid_full_description') || row.warnings.includes('description_metadata_only')) warnings.add('Invalid Description.');
  if (!row.match?.description) warnings.add('Missing full description.');
  if (row.match?.description && stripHtml(row.match.description).length < 120) warnings.add('Full description is short and needs review.');
  if (rowHasExistingData(folder)) warnings.add('Existing folder already has data.');
  row.warnings.forEach(w => warnings.add(warningText(w)));
  return [...warnings];
});

const saveMatchOnly = async (row: ImportRow, verified = true) => {
  if (!row.match) return;
  const folder = customFolders.value.find(f => f.id === row.folderId);
  if (!folder) return;
  const productType = row.productType || getProductType(row.match);
  const folderType = getFolderProductType(folder);
  if (!productType) {
    showToast('Save blocked: product type is missing.');
    return;
  }
  if (folderType && folderType !== productType) {
    showToast('Save blocked: equipment and attachment matches cannot be mixed.');
    return;
  }
  const patch: Partial<CustomFolder> = {
    matched_product_url: row.match.url || null,
    matched_product_title: row.match.title,
    matched_product_sku: row.match.sku || null,
    product_gtin: row.match.gtin || null,
    product_price: row.match.price || null,
    product_category: row.match.category || null,
    match_method: row.matchMethod,
    match_confidence: row.score,
    match_verified_by_user: verified,
    matched_at: new Date().toISOString(),
    product_id: row.productId || row.productSlug || null,
    product_type: productType,
    product_slug: row.productSlug || null,
    product_folder_path: slugifyProductIdentity(folder.product_folder_path || folder.name),
    image_folder_path: folder.image_folder_path || slugifyProductIdentity(folder.name),
    product_mapping_status: verified ? 'mapped' : 'needs_manual_mapping',
    updated_at: new Date().toISOString()
  };
  try {
    const { error } = await supabase.from('team_folders').update(patch).eq('id', folder.id);
    if (error) throw error;
    const idx = customFolders.value.findIndex(f => f.id === folder.id);
    if (idx !== -1) customFolders.value[idx] = { ...customFolders.value[idx], ...patch };
    row.verified = verified;
    row.status = verified ? 'verified_match' : statusForRow(row, customFolders.value[idx] || folder);
    showToast(verified ? `Saved verified match for "${folder.name}".` : `Saved match for "${folder.name}".`);
  } catch (e: any) {
    console.error('[product-import] save match failed', e);
    showToast('Save match failed — ' + (e?.message || 'unknown error'));
  }
};

const applyRow = async (row: ImportRow, mode: 'missing' | 'replace', silent = false) => {
  if (!row.match) return;
  const folder = customFolders.value.find(f => f.id === row.folderId);
  if (!folder) return;
  const p = row.match;
  const productType = row.productType || getProductType(p);
  const folderType = getFolderProductType(folder);
  if (!productType) {
    if (!silent) showToast('Import blocked: product type is missing.');
    return;
  }
  if (folderType && folderType !== productType) {
    if (!silent) showToast('Import blocked: equipment and attachment matches cannot be mixed.');
    return;
  }
  const patch: Record<string, any> = {};
  const setField = (col: 'sku' | 'short_description' | 'description' | 'machine_category' | 'product_gtin' | 'gtin', current: string | null | undefined, incoming: string | null) => {
    if (!incoming || !incoming.trim()) return;                       // nothing to import
    if (mode === 'missing' && current && current.trim()) {
      if ((col !== 'description' && col !== 'short_description') || !isMetadataOnlyText(current)) return; // keep existing usable content
    }
    patch[col] = incoming;
  };
  setField('sku', folder.sku, p.sku);
  setField('product_gtin', folder.product_gtin, p.gtin || (p as any).product_gtin || null);
  setField('gtin', folder.gtin, p.gtin || (p as any).product_gtin || null);
  setField('short_description', folder.short_description, hasInvalidShortDescription(p) ? null : p.shortDescription);
  setField('description', folder.description, hasInvalidFullDescription(p) ? null : p.description);

  const suggestedMC = inferMachineCategory(p.title, productType);
  setField('machine_category', folder.machine_category, suggestedMC);

  // Always record provenance metadata.
  patch.matched_product_url = p.url || null;
  patch.matched_product_title = p.title;
  patch.matched_product_sku = p.sku || null;
  patch.product_gtin = p.gtin || null;
  patch.product_price = p.price || null;
  patch.product_category = p.category || null;
  patch.match_method = row.matchMethod;
  patch.match_confidence = row.score;
  patch.match_verified_by_user = row.matchMethod === 'manual' || row.verified;
  patch.matched_at = new Date().toISOString();
  patch.product_id = row.productId || row.productSlug || null;
  patch.product_type = productType;
  patch.product_slug = row.productSlug || getProductIdentitySlug(p) || null;
  patch.product_folder_path = slugifyProductIdentity(folder.product_folder_path || folder.name);
  patch.image_folder_path = folder.image_folder_path || slugifyProductIdentity(folder.name);
  patch.product_mapping_status = 'mapped';
  patch.imported_from_url = p.url;
  patch.imported_product_title = p.title;
  patch.import_confidence = row.score;
  patch.imported_at = new Date().toISOString();
  patch.imported_by = auth.user?.id ?? null;
  patch.updated_at = new Date().toISOString();

  try {
    const { error } = await supabase.from('team_folders').update(patch).eq('id', folder.id);
    if (error) throw error;
    const idx = customFolders.value.findIndex(f => f.id === folder.id);
    if (idx !== -1) customFolders.value[idx] = { ...customFolders.value[idx], ...patch };
    row.status = 'applied';
    row.verified = patch.match_verified_by_user;
    if (!silent) {
      showToast(`Imported into "${folder.name}".`);
    }
  } catch (e: any) {
    console.error('[product-import] apply failed', e);
    if (!silent) {
      showToast('Import failed — ' + (e?.message || 'unknown error'));
    }
    throw e;
  }
};

const triggerBulkApply = async () => {
  if (selectedRowIds.value.length === 0) return;
  bulkApplying.value = true;
  let successCount = 0;
  let failCount = 0;
  
  const idsToProcess = [...selectedRowIds.value];
  
  for (const folderId of idsToProcess) {
    const row = importRows.value.find(r => r.folderId === folderId);
    if (!row || !row.match) continue;
    
    // Safety check: only import ready or verified matches
    if (row.status !== 'ready' && row.status !== 'verified_match') continue;
    
    try {
      await applyRow(row, bulkApplyMode.value, true);
      successCount++;
    } catch (err) {
      console.error(`Bulk apply failed for folder ${row.folderName}:`, err);
      failCount++;
    }
  }
  
  showToast(`Bulk apply complete: ${successCount} folder(s) updated successfully.` + (failCount > 0 ? ` ${failCount} failed.` : ''));
  selectedRowIds.value = selectedRowIds.value.filter(id => {
    const row = importRows.value.find(r => r.folderId === id);
    return row && row.status !== 'applied';
  });
  bulkApplying.value = false;
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    showToast('Source URL copied to clipboard.');
  } catch (err) {
    console.error('Failed to copy text: ', err);
    showToast('Failed to copy URL.');
  }
};

const applyFromPreview = async (mode: 'missing' | 'replace' | 'save') => {
  if (previewRow.value) {
    if (mode === 'save') await saveMatchOnly(previewRow.value, true);
    else await applyRow(previewRow.value, mode);
  }
  previewRow.value = null;
  previewAction.value = null;
};
const previewPairs = computed(() => {
  const row = previewRow.value;
  if (!row || !row.match) return [] as { label: string; current: string; imported: string }[];
  const f = currentFolderObj(row.folderId);
  return [
    { label: 'Folder', current: f?.name || row.folderName, imported: row.match.title || '' },
    { label: 'Type', current: productTypeLabel(getFolderProductType(f || { name: row.folderName })), imported: productTypeLabel(row.productType || getProductType(row.match)) },
    { label: 'Machine Category', current: f?.machine_category || 'Not set', imported: (row.match as any).machine_category || inferMachineCategory(row.match.title, row.productType || getProductType(row.match)) || 'Not set' },
    { label: 'Product ID', current: f?.product_id || '', imported: row.productId || row.productSlug || '' },
    { label: 'Slug', current: f?.product_slug || '', imported: row.productSlug || getProductIdentitySlug(row.match) || '' },
    { label: 'SKU', current: f?.sku || '', imported: row.match.sku || '' },
    { label: 'GTIN', current: f?.gtin || f?.product_gtin || '', imported: (row.match as any).gtin || (row.match as any).product_gtin || '' },
    { label: 'Price', current: f?.product_price || '', imported: row.match.price || '' },
    { label: 'Category', current: f?.product_category || '', imported: row.match.category || '' },
    { label: 'Short', current: isMetadataOnlyText(f?.short_description) ? 'Invalid Short Description' : f?.short_description || '', imported: hasInvalidShortDescription(row.match) ? 'Invalid Short Description' : cleanDescriptionPreview(row.match.shortDescription, '') },
    { label: 'Full', current: isMetadataOnlyText(f?.description) ? 'Invalid Description' : cleanDescriptionPreview(f?.description, ''), imported: hasInvalidFullDescription(row.match) ? 'Invalid Description' : cleanDescriptionPreview(row.match.description, '') },
    { label: 'Confidence', current: f?.import_confidence != null ? `${f.import_confidence}%` : '', imported: `${row.score}% (${row.matchMethod}, ${matchReasonLabel(row.matchReason)})` },
    { label: 'Extraction', current: '', imported: `Title: ${row.match.sources?.title_source || row.match.sources?.title || '—'}\nSKU: ${row.match.sources?.sku_source || row.match.sources?.sku || '—'}\nGTIN: ${row.match.sources?.gtin_source || '—'}\nPrice: ${row.match.sources?.price_source || '—'}\nCategory: ${row.match.sources?.category_source || '—'}\nShort: ${row.match.sources?.short_description_source || row.match.sources?.short || '—'}\nFull: ${row.match.sources?.full_description_source || row.match.sources?.full || '—'}\nFull chars: ${row.match.sources?.full_description_character_count ?? row.match.fullLength ?? 0}` },
  ];
});

watch(currentFolder, (newVal) => {
  isOrganizeMode.value = false;
  if (newVal !== 'all' && newVal !== 'uncategorized') {
    sortBy.value = 'custom';
  } else {
    sortBy.value = 'newest';
  }
});

const canOrganize = computed(() => {
  if (!supabaseConfigured) return false;
  if (auth.isQualityChecker) return false;
  if (auth.isAdmin || auth.isHeadOrSupervisor || auth.isAssistantHead) return true;
  
  if (currentFolder.value !== 'all' && currentFolder.value !== 'uncategorized') {
    const folder = customFolders.value.find(f => f.id === currentFolder.value);
    return folder ? folder.created_by === auth.user?.id : false;
  }
  return false;
});

const startOrganizing = () => {
  const folderImgs = library.value.filter(img => img.folderId === currentFolder.value);
  
  const featImg = folderImgs.find(img => img.isFeatureImage);
  featureImageId.value = featImg ? featImg.key : null;
  
  const galleryImgs = folderImgs
    .filter(img => !img.isFeatureImage)
    .sort((a, b) => {
      const orderA = a.sortOrder === 9999 || a.sortOrder === 0 || a.sortOrder === null ? 999999 : a.sortOrder;
      const orderB = b.sortOrder === 9999 || b.sortOrder === 0 || b.sortOrder === null ? 999999 : b.sortOrder;
      return orderA - orderB;
    });
    
  organizeImages.value = galleryImgs;
  isOrganizeMode.value = true;
};

const cancelOrganize = () => {
  isOrganizeMode.value = false;
  organizeImages.value = [];
  featureImageId.value = null;
};

const getFeatureImage = () => {
  if (!featureImageId.value) return null;
  return library.value.find(img => img.key === featureImageId.value) || null;
};

const removeFeature = () => {
  if (!featureImageId.value) return;
  const featImg = library.value.find(img => img.key === featureImageId.value);
  if (featImg) {
    organizeImages.value.unshift(featImg);
  }
  featureImageId.value = null;
};

const setAsFeature = (imgKey: string) => {
  const selectedImgIdx = organizeImages.value.findIndex(img => img.key === imgKey);
  if (selectedImgIdx === -1) return;
  
  const newFeat = organizeImages.value[selectedImgIdx];
  if (featureImageId.value) {
    const prevFeat = library.value.find(img => img.key === featureImageId.value);
    if (prevFeat) {
      organizeImages.value.push(prevFeat);
    }
  }
  
  featureImageId.value = imgKey;
  organizeImages.value.splice(selectedImgIdx, 1);
};

// Drag and drop handlers
const onDragStart = (e: DragEvent, index: number) => {
  draggedIndex.value = index;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }
};

const onDragEnter = (e: DragEvent, index: number) => {
  if (draggedIndex.value === null || draggedIndex.value === index) return;
  const temp = organizeImages.value[draggedIndex.value];
  organizeImages.value.splice(draggedIndex.value, 1);
  organizeImages.value.splice(index, 0, temp);
  draggedIndex.value = index;
};

const onDragEnd = () => {
  draggedIndex.value = null;
};

const onDropFeature = (e: DragEvent) => {
  isDraggingOverFeature.value = false;
  if (draggedIndex.value !== null) {
    const imgKey = organizeImages.value[draggedIndex.value].key;
    setAsFeature(imgKey);
  }
};

// up/down handlers
const moveItem = (index: number, direction: number) => {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= organizeImages.value.length) return;
  const temp = organizeImages.value[index];
  organizeImages.value.splice(index, 1);
  organizeImages.value.splice(targetIndex, 0, temp);
};

// preview helper inside organize workspace
const previewImage = (img: LibImage | null) => {
  if (!img) return;
  const idx = filteredLibrary.value.findIndex(item => item.key === img.key);
  if (idx !== -1) {
    activeImageIndex.value = idx;
    drawerOpen.value = true;
  } else {
    showToast(t('mediaLibrary.toast.cannotPreview'));
  }
};

// save ordering to DB
const saveOrganizeOrder = async () => {
  const allFolderImgs = library.value.filter(img => img.folderId === currentFolder.value);
  if (allFolderImgs.length === 0) {
    showToast(t('mediaLibrary.toast.orderMinImages'));
    return;
  }
  
  if (!featureImageId.value) {
    showToast(t('mediaLibrary.toast.orderSelectFeature'));
    return;
  }

  try {
    const { data, error } = await supabase.rpc('save_folder_image_order', {
      p_folder_id: currentFolder.value,
      p_feature_image_id: featureImageId.value,
      p_ordered_image_ids: organizeImages.value.map(img => img.key)
    });

    if (error) {
      console.error('[images] failed to save folder order:', error);
      showToast(t('mediaLibrary.toast.orderSaveFailed'));
    } else {
      showToast(t('mediaLibrary.toast.orderSaved'));
      isOrganizeMode.value = false;
      await loadLibraryFromDB();
    }
  } catch (err) {
    console.error('[images] save order error:', err);
    showToast(t('mediaLibrary.toast.orderSaveFailed'));
  }
};

// Toast / Uploader Status
const toastVisible = ref(false);
const toastMsg = ref('');
const uploadStatusMsg = ref('');
const converting = ref(false);
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
const visibleCount = ref(24);
let dragTimer: ReturnType<typeof setTimeout> | null = null;

interface UploadingItem {
  id: string;
  name: string;
  previewUrl: string;
  file: File;
  folderId: string | null;
  status: 'processing' | 'compressing' | 'uploading' | 'saving' | 'success' | 'failed';
  errorMessage?: string;
  source: 'click_upload' | 'drag_drop' | 'pasted_clipboard';
  progress?: number;
}

const uploadingItems = ref<UploadingItem[]>([]);
const isQueueCollapsed = ref(false);

const visibleUploadingItems = computed(() => {
  return uploadingItems.value.filter((item) => {
    // Hide items that are success (they are already loaded as real DB items)
    if (item.status === 'success') return false;
    
    if (currentFolder.value === 'all') return true;
    if (currentFolder.value === 'uncategorized') return item.folderId === null;
    return item.folderId === currentFolder.value;
  });
});

const removeUploadItem = (id: string) => {
  const index = uploadingItems.value.findIndex(item => item.id === id);
  if (index !== -1) {
    const item = uploadingItems.value[index];
    if (item.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(item.previewUrl);
    }
    uploadingItems.value.splice(index, 1);
  }
};

const clearCompletedQueue = () => {
  uploadingItems.value = uploadingItems.value.filter(item => {
    if (item.status === 'success') {
      if (item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return false;
    }
    return true;
  });
};

// Realtime channels
let foldersSubscription: any = null;
let imagesSubscription: any = null;

// ─── Database Sync / Fetches ──────────────────────────────────────────────────
const loadLibraryFromDB = async () => {
  if (!supabaseConfigured) return;
  try {
    // 1. Fetch folders
    const { data: foldersData, error: foldersErr } = await supabase
      .from('team_folders')
      .select('id, name, created_by, short_description, description, button_url, updated_at, sku, product_gtin, gtin, product_price, product_category, imported_from_url, imported_product_title, import_confidence, imported_at, imported_by, matched_product_url, matched_product_title, matched_product_sku, match_method, match_confidence, match_verified_by_user, matched_at, product_id, product_type, machine_category, product_slug, product_folder_path, image_folder_path, product_mapping_status, deleted_at, deleted_by')
      .order('created_at', { ascending: true });

    if (!foldersErr && foldersData) {
      // Active folders exclude anything in the Trash; trashed ones live in their
      // own list (newest-trashed first) for the Trash view.
      const all = foldersData as CustomFolder[];
      customFolders.value = all.filter((f) => !f.deleted_at);
      trashedFolders.value = all
        .filter((f) => !!f.deleted_at)
        .sort((a, b) => (b.deleted_at || '').localeCompare(a.deleted_at || ''));
    }

    // 2. Fetch images (joining profiles to get uploader full_name).
    // Supabase caps each request at 1000 rows, so we page through with .range()
    // until every image is loaded — otherwise only the newest 1000 would show
    // and older folders would appear (wrongly) to have lost their images.
    const PAGE = 1000;
    let imagesData: any[] = [];
    let imagesErr: any = null;
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('team_images')
        .select('id, url, name, folder_id, uploaded_by, created_at, source, file_type, file_size, file_size_bytes, width, height, storage_path, is_feature_image, sort_order, profiles(full_name)')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }) // stable tiebreaker for clean paging
        .range(from, from + PAGE - 1);
      if (error) { imagesErr = error; break; }
      if (!data || data.length === 0) break;
      imagesData = imagesData.concat(data);
      if (data.length < PAGE) break; // last page
    }

    if (!imagesErr) {
      dbImages.value = (imagesData as any[]).map((r) => {
        // Handle PostgREST relation shapes (can be array or object)
        const profileObj = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
          ...r,
          profiles: profileObj ? { full_name: profileObj.full_name } : null
        };
      });
    }

    await loadLibraryStats();
  } catch (e) {
    console.error('[images] failed to load DB data', e);
  }
};

// Cross-window sync. Local mutations already patch state optimistically and do
// their own targeted reload, so realtime only needs to catch changes from OTHER
// windows. Debounce so a burst (e.g. another user saving image order, which
// touches many rows) collapses into one refetch instead of an egress storm.
const reloadLibraryDebounced = debounceRealtime(() => {
  void loadLibraryFromDB();
}, 500);

const subscribeRealtime = () => {
  if (!supabaseConfigured) return;
  foldersSubscription = supabase
    .channel('public:team_folders_dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_folders' }, () => {
      reloadLibraryDebounced();
    })
    .subscribe();

  imagesSubscription = supabase
    .channel('public:team_images_dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_images' }, () => {
      reloadLibraryDebounced();
    })
    .subscribe();
};

// ─── Computed Properties ──────────────────────────────────────────────────────
const library = computed<LibImage[]>(() => {
  return dbImages.value.map((img) => ({
    key: img.id,
    url: img.url,
    name: img.name,
    displayName: img.name,
    folderId: img.folder_id,
    uploadedBy: img.uploaded_by,
    uploaderName: img.profiles?.full_name ?? 'Unknown User',
    createdAt: img.created_at,
    source: img.source ?? 'upload',
    fileType: img.file_type || 'image/png',
    fileSize: img.file_size_bytes || img.file_size || null,
    width: img.width || null,
    height: img.height || null,
    isFeatureImage: img.is_feature_image || false,
    sortOrder: img.sort_order || 0
  }));
});

const uncategorizedCount = computed(() => {
  return dbImages.value.filter((img) => !img.folder_id).length;
});

const totalStorageUsed = computed(() => {
  return library.value.reduce((sum, img) => sum + (img.fileSize || 0), 0);
});

const filteredStorageUsed = computed(() => {
  return filteredLibrary.value.reduce((sum, img) => sum + (img.fileSize || 0), 0);
});

const isFiltered = computed(() => {
  return currentFolder.value !== 'all' ||
         search.value.trim() !== '' ||
         filterUploadedBy.value !== 'all' ||
         filterFileType.value !== 'all' ||
         filterMyUploads.value;
});

const isFolderOnlyFilter = computed(() => {
  return currentFolder.value !== 'all' &&
         search.value.trim() === '' &&
         filterUploadedBy.value === 'all' &&
         filterFileType.value === 'all' &&
         !filterMyUploads.value;
});

// ─── "Missing info" completeness check ───────────────────────────────────────
// A product folder is "incomplete" if it's missing any core product field.
// Returns the list of missing field keys so we can show exactly what's absent.
const folderMissingFields = (folder: CustomFolder): string[] => {
  const missing: string[] = [];
  if (!hasUsableDescription(folder.short_description)) missing.push('short');
  if (!hasUsableDescription(folder.description)) missing.push('full');
  if (!folder.sku?.trim()) missing.push('sku');
  if (!folder.product_price?.trim()) missing.push('price');
  if (!getFolderProductType(folder)) missing.push('type');
  const imgs = library.value.filter((i) => i.folderId === folder.id);
  if (imgs.length === 0) missing.push('images');
  else if (!imgs.some((i) => i.isFeatureImage)) missing.push('feature');
  return missing;
};
const isFolderMissingInfo = (folder: CustomFolder): boolean =>
  folderMissingFields(folder).length > 0;

const missingFieldLabel = (key: string): string =>
  ({
    short: t('mediaLibrary.shortDescription'),
    full: t('mediaLibrary.fullDescription'),
    sku: t('mediaLibrary.sku'),
    price: t('mediaLibrary.price'),
    type: t('mediaLibrary.productType'),
    feature: t('mediaLibrary.featureImageLabel'),
    images: t('mediaLibrary.imagesLabel'),
  } as Record<string, string>)[key] || key;

const folderMissingSummary = (folder: CustomFolder): string => {
  const fields = folderMissingFields(folder).map(missingFieldLabel);
  return fields.length ? `${t('mediaLibrary.missingPrefix')} ${fields.join(', ')}` : '';
};

const incompleteFolderCount = computed(
  () => customFolders.value.filter(isFolderMissingInfo).length
);

const filteredFolders = computed(() => {
  const q = folderSearchQuery.value.trim().toLowerCase();
  let list = customFolders.value;
  if (q) {
    list = list.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      (f.short_description && f.short_description.toLowerCase().includes(q)) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      (f.button_url && f.button_url.toLowerCase().includes(q)) ||
      (f.sku && f.sku.toLowerCase().includes(q)) ||
      (f.matched_product_title && f.matched_product_title.toLowerCase().includes(q)) ||
      (f.imported_product_title && f.imported_product_title.toLowerCase().includes(q)) ||
      (f.machine_category && f.machine_category.toLowerCase().includes(q))
    );
  }
  if (folderMissingFilter.value) list = list.filter(isFolderMissingInfo);

  // Product Type filter
  if (filterFolderProductType.value !== 'all') {
    list = list.filter((f) => {
      const type = getFolderProductType(f);
      return type === filterFolderProductType.value;
    });
  }

  // Machine Category filter
  if (filterFolderMachineCategory.value !== 'all') {
    list = list.filter((f) => {
      if (filterFolderMachineCategory.value === 'not_set') {
        return !f.machine_category;
      }
      return f.machine_category === filterFolderMachineCategory.value;
    });
  }

  return list;
});

const shouldScrollFolders = computed(() => {
  return filteredFolders.value.length > 5;
});

// Dynamic uploader list for filters
const uniqueUploaders = computed(() => {
  const map = new Map<string, string>();
  library.value.forEach((img) => {
    if (img.uploadedBy) {
      map.set(img.uploadedBy, img.uploaderName);
    }
  });
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
});

const filteredLibrary = computed(() => {
  const searchQ = search.value.trim().toLowerCase();
  
  let list = [...library.value];

  // 1. Folder filter
  if (currentFolder.value === 'uncategorized') {
    list = list.filter((img) => img.folderId === null);
  } else if (currentFolder.value !== 'all') {
    list = list.filter((img) => img.folderId === currentFolder.value);
  }

  // 2. Search query (by title, folder name or creator)
  if (searchQ) {
    list = list.filter((img) => {
      const folderName = img.folderId ? customFolders.value.find(f => f.id === img.folderId)?.name?.toLowerCase() || '' : 'uncategorized';
      return img.displayName.toLowerCase().includes(searchQ) ||
             img.uploaderName.toLowerCase().includes(searchQ) ||
             folderName.includes(searchQ);
    });
  }

  // 3. Uploader filter
  if (filterUploadedBy.value !== 'all') {
    list = list.filter((img) => img.uploadedBy === filterUploadedBy.value);
  }

  // 4. File type filter
  if (filterFileType.value !== 'all') {
    list = list.filter((img) => img.fileType.toLowerCase().includes(filterFileType.value));
  }

  // 5. My uploads filter
  if (filterMyUploads.value) {
    list = list.filter((img) => img.uploadedBy === auth.user?.id);
  }

  // 6. Sorting
  if (sortBy.value === 'newest') {
    if (currentFolder.value !== 'all' && currentFolder.value !== 'uncategorized') {
      list.sort((a, b) => {
        if (a.isFeatureImage && !b.isFeatureImage) return -1;
        if (!a.isFeatureImage && b.isFeatureImage) return 1;
        const orderA = a.sortOrder === 9999 || a.sortOrder === 0 || a.sortOrder === null ? 999999 : a.sortOrder;
        const orderB = b.sortOrder === 9999 || b.sortOrder === 0 || b.sortOrder === null ? 999999 : b.sortOrder;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } else if (sortBy.value === 'custom') {
    list.sort((a, b) => {
      if (a.isFeatureImage && !b.isFeatureImage) return -1;
      if (!a.isFeatureImage && b.isFeatureImage) return 1;
      const orderA = a.sortOrder === 9999 || a.sortOrder === 0 || a.sortOrder === null ? 999999 : a.sortOrder;
      const orderB = b.sortOrder === 9999 || b.sortOrder === 0 || b.sortOrder === null ? 999999 : b.sortOrder;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (sortBy.value === 'oldest') {
    list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  } else if (sortBy.value === 'alphabetical') {
    list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  } else if (sortBy.value === 'alphabetical-desc') {
    list.sort((a, b) => b.displayName.localeCompare(a.displayName));
  } else if (sortBy.value === 'largest-size') {
    list.sort((a, b) => (b.fileSize || 0) - (a.fileSize || 0));
  } else if (sortBy.value === 'smallest-size') {
    list.sort((a, b) => (a.fileSize || 0) - (b.fileSize || 0));
  }

  return list;
});

const pagedLibrary = computed(() => {
  return filteredLibrary.value.slice(0, visibleCount.value);
});

const currentFolderTitle = computed(() => {
  if (currentFolder.value === 'all') return t('mediaLibrary.allLibrary');
  if (currentFolder.value === 'uncategorized') return t('mediaLibrary.uncategorized');
  const folder = customFolders.value.find((f) => f.id === currentFolder.value);
  return folder ? folder.name : 'Library';
});

// ─── Permissions Rules checks ─────────────────────────────────────────────────
const canManageFolder = (folder: CustomFolder) => {
  return auth.isAdmin || folder.created_by === auth.user?.id;
};

const canManageImage = (img: LibImage) => {
  return auth.isAdmin || img.uploadedBy === auth.user?.id;
};

// ─── Folder Actions ──────────────────────────────────────────────────────────
const onAddFolderClick = async () => {
  showNewFolderInput.value = true;
  await nextTick();
  newFolderInputRef.value?.focus();
};

const createFolder = async () => {
  const name = newFolderName.value.trim();
  if (!name || !supabaseConfigured) return;
  const uid = auth.user?.id;

  const { data, error } = await supabase
    .from('team_folders')
    .insert({ name, created_by: uid })
    .select()
    .single();

  if (error) {
    showToast(t('mediaLibrary.toast.createFolderFailed'));
    console.error(error);
  } else {
    newFolderName.value = '';
    showNewFolderInput.value = false;
    if (data) {
      currentFolder.value = data.id;
      showToast(t('mediaLibrary.toast.createFolderSuccess', { name }));
    }
    loadLibraryFromDB();
  }
};

const startFolderRename = async (folder: CustomFolder) => {
  editingFolderId.value = folder.id;
  editFolderInput.value = folder.name;
  await nextTick();
  if (renameFolderInputRef.value && renameFolderInputRef.value[0]) {
    renameFolderInputRef.value[0].focus();
  }
};

const saveFolderRename = async (folderId: string) => {
  const name = editFolderInput.value.trim();
  if (!name || !supabaseConfigured) {
    editingFolderId.value = null;
    return;
  }

  const { error } = await supabase
    .from('team_folders')
    .update({ name })
    .eq('id', folderId);

  if (error) {
    showToast(t('mediaLibrary.toast.renameFolderFailed'));
    console.error(error);
  } else {
    showToast(t('mediaLibrary.toast.renameFolderSuccess'));
    loadLibraryFromDB();
  }
  editingFolderId.value = null;
};

/* ─── Folder Trash (soft delete) ─────────────────────────────────────────────
   Moving to Trash is reversible: it sets deleted_at so the folder is hidden
   from the library but kept. Restore clears it; permanent delete (from the
   Trash view) removes the row (images fall back to Uncategorized via FK). */

// Move the given folders to Trash. Only folders the user may manage are moved.
const moveFoldersToTrash = async (ids: string[]): Promise<boolean> => {
  if (!supabaseConfigured) return false;
  const manageable = ids.filter((id) => {
    const f = customFolders.value.find((x) => x.id === id);
    return !!f && canManageFolder(f);
  });
  if (manageable.length === 0) {
    showToast(t('mediaLibrary.toast.trashSelectNone'));
    return false;
  }
  processingTrash.value = true;
  try {
    const { error } = await supabase
      .from('team_folders')
      .update({ deleted_at: new Date().toISOString(), deleted_by: auth.user?.id ?? null })
      .in('id', manageable);
    if (error) throw error;
    if (manageable.includes(currentFolder.value)) currentFolder.value = 'all';
    showToast(t('mediaLibrary.toast.movedToTrash', { count: manageable.length }));
    await loadLibraryFromDB();
    return true;
  } catch (e) {
    console.error('[trash] move failed', e);
    showToast(t('mediaLibrary.toast.trashFailed'));
    return false;
  } finally {
    processingTrash.value = false;
  }
};

// Sidebar multi-select
const toggleFolderSelectMode = () => {
  folderSelectMode.value = !folderSelectMode.value;
  if (!folderSelectMode.value) selectedFolderIds.value = [];
};
const toggleFolderSelection = (id: string) => {
  const i = selectedFolderIds.value.indexOf(id);
  if (i >= 0) selectedFolderIds.value.splice(i, 1);
  else selectedFolderIds.value.push(id);
};
const moveSelectedToTrash = async () => {
  const ok = await moveFoldersToTrash([...selectedFolderIds.value]);
  if (ok) {
    selectedFolderIds.value = [];
    folderSelectMode.value = false;
  }
};

// Restore a trashed folder back to the library.
const restoreFolder = async (folder: CustomFolder) => {
  if (!supabaseConfigured) return;
  processingTrash.value = true;
  try {
    const { error } = await supabase
      .from('team_folders')
      .update({ deleted_at: null, deleted_by: null })
      .eq('id', folder.id);
    if (error) throw error;
    showToast(t('mediaLibrary.toast.folderRestored', { name: folder.name }));
    await loadLibraryFromDB();
  } catch (e) {
    console.error('[trash] restore failed', e);
    showToast(t('mediaLibrary.toast.trashFailed'));
  } finally {
    processingTrash.value = false;
  }
};

// Permanently delete a trashed folder (its images return to Uncategorized).
const deleteFolderPermanently = async (folder: CustomFolder) => {
  if (!supabaseConfigured) return;
  if (!confirm(t('mediaLibrary.confirm.deletePermanent', { name: folder.name }))) return;
  processingTrash.value = true;
  try {
    const { error } = await supabase.from('team_folders').delete().eq('id', folder.id);
    if (error) throw error;
    showToast(t('mediaLibrary.toast.folderDeletedPermanently'));
    await loadLibraryFromDB();
  } catch (e) {
    console.error('[trash] permanent delete failed', e);
    showToast(t('mediaLibrary.toast.deleteFolderFailed'));
  } finally {
    processingTrash.value = false;
  }
};

// Export-modal "Move to Trash" action (reuses the shared soft-delete).
const deleteSelectedFolders = async () => {
  const ok = await moveFoldersToTrash(deletableSelectedFolderIds.value);
  if (ok) {
    selectedExportFolderIds.value = [];
    showExportModal.value = false;
  }
};

const deleteFolder = async (folderId: string) => {
  if (!supabaseConfigured) return;
  const targetFolder = customFolders.value.find(f => f.id === folderId);
  if (!targetFolder) return;
  if (!canManageFolder(targetFolder)) {
    showToast(t('mediaLibrary.toast.deleteFolderPermission'));
    return;
  }

  if (confirm(t('mediaLibrary.confirm.deleteFolder', { name: targetFolder.name }))) {
    const { error } = await supabase
      .from('team_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      showToast(t('mediaLibrary.toast.deleteFolderFailed'));
      console.error(error);
    } else {
      if (currentFolder.value === folderId) {
        currentFolder.value = 'all';
      }
      showToast(t('mediaLibrary.toast.deleteFolderSuccess'));
      loadLibraryFromDB();
    }
  }
  closeFolderMenu();
};

const copyFolderLink = (folderId: string) => {
  const link = `${window.location.origin}${window.location.pathname}?folder=${folderId}`;
  navigator.clipboard.writeText(link).then(() => {
    showToast(t('mediaLibrary.toast.linkCopied'));
  });
  closeFolderMenu();
};

const toggleFolderMenu = (folder: CustomFolder, event: MouseEvent) => {
  if (activeFolderMenuId.value === folder.id) {
    closeFolderMenu();
    return;
  }
  
  activeFolderMenuId.value = folder.id;
  menuActiveFolder.value = folder;
  
  // Calculate viewport coordinates for fixed positioning
  const buttonRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const dropdownWidth = 176; // w-44 is 11rem = 176px
  const hasMoveAction = selectedImageKeys.value.length > 0;
  const dropdownHeight = hasMoveAction ? 122 : 90;
  
  const spaceBelow = window.innerHeight - buttonRect.bottom;
  const showUpward = spaceBelow < dropdownHeight + 20;
  
  folderMenuPosition.value = {
    top: showUpward ? (buttonRect.top - dropdownHeight - 4) : (buttonRect.bottom + 4),
    left: Math.max(10, buttonRect.right - dropdownWidth)
  };
};

const closeFolderMenu = () => {
  activeFolderMenuId.value = null;
  menuActiveFolder.value = null;
};

const getFolderImageCount = (folderId: string) => {
  return dbImages.value.filter((img) => img.folder_id === folderId).length;
};

// ─── Image Actions ────────────────────────────────────────────────────────────
const moveImage = async (imageKey: string, folderId: string | null) => {
  if (!supabaseConfigured) return;

  // Optimistic UI update
  const imgIdx = dbImages.value.findIndex(i => i.id === imageKey);
  let oldFolderId: string | null = null;
  if (imgIdx !== -1) {
    oldFolderId = dbImages.value[imgIdx].folder_id;
    dbImages.value[imgIdx].folder_id = folderId;
  }

  const { error } = await supabase
    .from('team_images')
    .update({ folder_id: folderId })
    .eq('id', imageKey);

  if (error) {
    // Revert optimistic update
    if (imgIdx !== -1) dbImages.value[imgIdx].folder_id = oldFolderId;
    showToast(t('mediaLibrary.toast.moveImageFailed'));
    console.error(error);
  } else {
    const targetName = folderId
      ? customFolders.value.find((f) => f.id === folderId)?.name || 'Folder'
      : t('mediaLibrary.uncategorized');
    showToast(t('mediaLibrary.toast.moveImageSuccess', { name: targetName }));
    loadLibraryFromDB();
  }
};

const startRenameImage = async (img: LibImage) => {
  if (!canManageImage(img)) {
    showToast(t('mediaLibrary.toast.renameImagePermission'));
    return;
  }
  renamingImageKey.value = img.key;
  renameImageInput.value = img.displayName;
  await nextTick();
  if (renameImageInputRef.value && renameImageInputRef.value[0]) {
    renameImageInputRef.value[0].focus();
  }
};

const saveImageRename = async (imageKey: string) => {
  const name = renameImageInput.value.trim();
  if (!name || !supabaseConfigured) {
    renamingImageKey.value = null;
    return;
  }

  // Optimistic UI Update
  const imgIdx = dbImages.value.findIndex(i => i.id === imageKey);
  let oldName = '';
  if (imgIdx !== -1) {
    oldName = dbImages.value[imgIdx].name;
    dbImages.value[imgIdx].name = name;
  }

  const { error } = await supabase
    .from('team_images')
    .update({ name })
    .eq('id', imageKey);

  if (error) {
    // Revert
    if (imgIdx !== -1) dbImages.value[imgIdx].name = oldName;
    showToast(t('mediaLibrary.toast.renameImageFailed'));
    console.error(error);
  } else {
    showToast(t('mediaLibrary.toast.renameImageSuccess'));
    loadLibraryFromDB();
  }
  renamingImageKey.value = null;
};

const deleteImage = async (img: LibImage) => {
  if (!supabaseConfigured) return;
  if (!canManageImage(img)) {
    showToast(t('mediaLibrary.toast.deleteImagePermission'));
    return;
  }

  if (confirm(t('mediaLibrary.confirm.deleteImage', { name: img.displayName }))) {
    // Save current stats for rollback
    const origStats = libraryStats.value ? { ...libraryStats.value } : null;

    // Optimistic UI removal
    const origImages = [...dbImages.value];
    dbImages.value = dbImages.value.filter(i => i.id !== img.key);

    // Decrement stats optimistically
    if (libraryStats.value) {
      libraryStats.value.total_images = Math.max(0, libraryStats.value.total_images - 1);
      libraryStats.value.total_storage_bytes = Math.max(0, libraryStats.value.total_storage_bytes - (img.fileSize || 0));
      if (!img.fileSize) {
        libraryStats.value.unknown_size_count = Math.max(0, libraryStats.value.unknown_size_count - 1);
      }
    }

    closeDrawer();

    try {
      const { error: dbErr } = await supabase
        .from('team_images')
        .delete()
        .eq('id', img.key);

      if (dbErr) {
        dbImages.value = origImages;
        libraryStats.value = origStats;
        showToast(t('mediaLibrary.toast.deleteImageFailed'));
        console.error(dbErr);
        return;
      }

      // Remove from storage
      const bucketMarker = '/public/team-images/';
      const markerIndex = img.url.indexOf(bucketMarker);
      if (markerIndex !== -1) {
        const storagePath = decodeURIComponent(img.url.substring(markerIndex + bucketMarker.length));
        await supabase.storage.from('team-images').remove([storagePath]);
      }

      showToast(t('mediaLibrary.toast.deleteImageSuccess'));
      selectedImageKeys.value = selectedImageKeys.value.filter(k => k !== img.key);
      loadLibraryFromDB();
    } catch (e) {
      dbImages.value = origImages;
      libraryStats.value = origStats;
      console.error('[images] delete image failed', e);
      showToast(t('mediaLibrary.toast.deleteImageError'));
    }
  }
};

const copyUrl = async (img: LibImage) => {
  try {
    await navigator.clipboard.writeText(img.url);
    showToast(t('mediaLibrary.toast.urlCopied'));
  } catch {
    showToast(t('mediaLibrary.toast.copyFailed'));
  }
};

// Drawer keyboard navigation and arrow actions
const openImageDrawer = (idx: number) => {
  activeImageIndex.value = idx;
  drawerOpen.value = true;
  if (selectedImage.value) {
    renameImageInput.value = selectedImage.value.displayName;
  }
};

const closeDrawer = () => {
  drawerOpen.value = false;
  activeImageIndex.value = -1;
  imageDimensions.value = '';
};

const selectPreviousImage = () => {
  if (filteredLibrary.value.length === 0) return;
  activeImageIndex.value = (activeImageIndex.value - 1 + filteredLibrary.value.length) % filteredLibrary.value.length;
};

const selectNextImage = () => {
  if (filteredLibrary.value.length === 0) return;
  activeImageIndex.value = (activeImageIndex.value + 1) % filteredLibrary.value.length;
};

// Dynamic client-side dimension loading
watch(
  () => selectedImage.value,
  (img) => {
    if (!img) {
      imageDimensions.value = '';
      return;
    }
    imageDimensions.value = 'Loading...';
    const tempImg = new Image();
    tempImg.onload = () => {
      imageDimensions.value = `${tempImg.naturalWidth} × ${tempImg.naturalHeight}`;
    };
    tempImg.onerror = () => {
      imageDimensions.value = 'N/A';
    };
    tempImg.src = img.url;
    renameImageInput.value = img.displayName;
  },
  { immediate: true }
);

const downloadSingleImage = async (img: LibImage) => {
  try {
    showToast(t('mediaLibrary.toast.downloading'));
    await downloadImageBlob(img.url, `${img.displayName}.${img.fileType.split('/')[1] || 'png'}`);
  } catch (err) {
    console.error('Download failed:', err);
    showToast(t('mediaLibrary.toast.downloadFailed'));
  }
};

const downloadImageBlob = async (url: string, filename: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const openUrlInNewTab = (url: string) => {
  window.open(url, '_blank', 'noopener');
};

// ─── Drag & Drop Images (Sidebar Moves) ───────────────────────────────────────
const onImageDragStart = (e: DragEvent, img: LibImage) => {
  draggedImage.value = img;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', img.key);
  }
};

const onImageDragEnd = () => {
  draggedImage.value = null;
  dragOverFolderId.value = null;
};

const onDragLeaveFolder = (folderId: string | null) => {
  if (dragOverFolderId.value === folderId) {
    dragOverFolderId.value = null;
  }
};

const onImageDrop = (e: DragEvent, folderId: string | null) => {
  dragOverFolderId.value = null;
  const imageKey = e.dataTransfer?.getData('text/plain') || draggedImage.value?.key;
  if (imageKey) {
    moveImage(imageKey, folderId);
  }
};

// ─── Uploader Files Handler ───────────────────────────────────────────────────
const openFilePicker = () => fileInput.value?.click();

const onPick = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  await uploadImagesToCurrentFolder(files, 'click_upload');
};

const onDragOver = () => {
  if (dragTimer) clearTimeout(dragTimer);
  isDragging.value = true;
  uploaderExpanded.value = true; // Auto expand dropzone on drag over!
};

const onDragLeave = () => {
  if (dragTimer) clearTimeout(dragTimer);
  dragTimer = setTimeout(() => { isDragging.value = false; }, 60);
};

const onDrop = async (e: DragEvent) => {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
  await uploadImagesToCurrentFolder(files, 'drag_drop');
};

const pastedStamp = (): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  const d = new Date();
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const uploadImagesToCurrentFolder = async (
  files: File[],
  source: 'click_upload' | 'drag_drop' | 'pasted_clipboard'
) => {
  if (!files.length || !supabaseConfigured) return;
  if (!canUpload.value) {
    showToast(t('mediaLibrary.toast.uploadPermission'));
    return;
  }

  // If pasting and no folder is selected (currentFolder.value is 'all')
  if (source === 'pasted_clipboard' && currentFolder.value === 'all') {
    showToast(t('mediaLibrary.toast.uploadSelectFolder'));
    return;
  }

  // Validate files are images
  const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
  if (invalidFiles.length > 0) {
    showToast(t('mediaLibrary.toast.uploadOnlyImages'));
    return;
  }

  const destFolderId = (currentFolder.value !== 'all' && currentFolder.value !== 'uncategorized')
    ? currentFolder.value
    : null;

  const stamp = pastedStamp();
  
  // Create uploading items instantly for all files in the batch
  const newQueueItems: UploadingItem[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    let displayName = file.name;
    if (source === 'pasted_clipboard') {
      displayName = t('mediaLibrary.toast.pastedImage');
      showToast(t('mediaLibrary.toast.uploadPastedDetected'));
    } else {
      showToast(files.length === 1 ? t('mediaLibrary.toast.uploadingSingle') : t('mediaLibrary.toast.uploadingCount', { count: files.length }));
    }
    
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const previewUrl = URL.createObjectURL(file);
    
    const item: UploadingItem = {
      id,
      name: displayName,
      previewUrl,
      file,
      folderId: destFolderId,
      status: 'processing',
      source,
      progress: 10
    };
    
    uploadingItems.value.push(item);
    newQueueItems.push(item);
  }

  // Process uploads in parallel asynchronously (non-blocking)
  newQueueItems.forEach(item => {
    performUploadProcess(item, stamp);
  });
};

const performUploadProcess = async (item: UploadingItem, stampInput?: string) => {
  const stamp = stampInput || pastedStamp();
  const uid = auth.user?.id;
  if (!uid) {
    item.status = 'failed';
    item.errorMessage = 'User not signed in';
    showToast(t('mediaLibrary.toast.pleaseSignIn'));
    return;
  }

  try {
    let fileToUpload = item.file;
    let finalName = item.file.name;

    // Stage 1: Compressing / Processing
    item.status = 'compressing';
    item.progress = 25;

    const isGifOrSvg = item.file.type === 'image/gif' || item.file.type === 'image/svg+xml';
    if (!isGifOrSvg && item.file.type.startsWith('image/')) {
      try {
        const result = await optimizeImage(item.file, {
          maxWidth: 2048,
          maxHeight: 2048,
          targetSizeKB: 500,
          maxSizeKB: 800,
          initialQuality: 0.9,
          minQuality: 0.7,
          outputType: 'image/webp'
        });
        const resBlob = await fetch(result.previewUrl).then((r) => r.blob());
        fileToUpload = new File([resBlob], item.file.name.replace(/\.[^/.]+$/, '.webp'), {
          type: 'image/webp'
        });
        finalName = fileToUpload.name;
      } catch (err) {
        console.warn('[images] optimize failed, uploading original', err);
      }
    }

    if (item.source === 'pasted_clipboard') {
      const ext = fileToUpload.type === 'image/webp' ? 'webp' : (fileToUpload.type.split('/')[1] || 'png');
      finalName = `pasted-image-${stamp}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      item.name = 'Pasted image';
    }

    // Stage 2: Uploading to Supabase Storage
    item.status = 'uploading';
    item.progress = 50;

    const safeName = getSafeName(finalName);
    const storagePath = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from('team-images')
      .upload(storagePath, fileToUpload, {
        cacheControl: '31536000',
        upsert: false
      });

    if (uploadError) {
      console.error('[images] storage upload failed', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    item.progress = 75;

    // Stage 3: Saving to DB
    item.status = 'saving';
    const { data: publicUrlData } = supabase.storage.from('team-images').getPublicUrl(storagePath);
    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      throw new Error('Public URL generation failed');
    }

    const dims = await getImageDimensions(fileToUpload);
    const newRecord = {
      url: publicUrl,
      name: finalName.replace(/\.[^/.]+$/, ''),
      folder_id: item.folderId,
      uploaded_by: uid,
      source: item.source,
      file_type: fileToUpload.type || null,
      file_size: fileToUpload.size || null,
      file_size_bytes: fileToUpload.size || 0,
      width: dims?.width || null,
      height: dims?.height || null,
      storage_path: storagePath
    };

    const { data: dbData, error: dbError } = await supabase
      .from('team_images')
      .insert(newRecord)
      .select('id, url, name, folder_id, uploaded_by, created_at, source, file_type, file_size, file_size_bytes, width, height, storage_path, is_feature_image, sort_order, profiles(full_name)')
      .single();

    if (dbError) {
      console.error('[images] DB insert failed', dbError);
      throw new Error(`DB insert failed: ${dbError.message}`);
    }

    if (dbData) {
      item.status = 'success';
      item.progress = 100;

      // Add to local list instantly
      const profileObj = Array.isArray((dbData as any).profiles) ? (dbData as any).profiles[0] : (dbData as any).profiles;
      const parsedImage: DBImage = {
        ...dbData,
        profiles: profileObj ? { full_name: profileObj.full_name } : { full_name: auth.profile?.fullName ?? 'Unknown User' }
      };

      // Add to our main reactive list in Vue
      dbImages.value = [parsedImage, ...dbImages.value];

      // Optimistically update library stats count and storage size
      if (libraryStats.value) {
        libraryStats.value.total_images += 1;
        libraryStats.value.total_storage_bytes += (dbData.file_size_bytes || dbData.file_size || 0);
        if (!dbData.file_size_bytes && !dbData.file_size) {
          libraryStats.value.unknown_size_count += 1;
        }
      }

      // Sync stats from DB in parallel
      loadLibraryStats();
      
      showToast(t('mediaLibrary.toast.imageAdded'));
      
      // Clean up object URL since we are done and now using the real URL from Supabase
      if (item.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      
      // Remove successful item from uploading queue after 3 seconds
      setTimeout(() => {
        const idx = uploadingItems.value.findIndex(i => i.id === item.id);
        if (idx !== -1) {
          uploadingItems.value.splice(idx, 1);
        }
      }, 3000);
    }
  } catch (err: any) {
    console.error('[images] Upload process error:', err);
    item.status = 'failed';
    item.errorMessage = err.message || 'Unknown error occurred';
    showToast(t('mediaLibrary.toast.uploadFailedRetry'));
  }
};

const retryUploadItem = async (item: UploadingItem) => {
  item.status = 'processing';
  item.progress = 10;
  await performUploadProcess(item);
};

const getSafeName = (fileName: string) => {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
};

const isTypingTarget = (el: EventTarget | null): boolean => {
  const node = el as HTMLElement | null;
  const active = (document.activeElement as HTMLElement | null);
  const check = (n: HTMLElement | null) =>
    !!n && (
      n.tagName === 'INPUT' ||
      n.tagName === 'TEXTAREA' ||
      n.tagName === 'SELECT' ||
      n.isContentEditable === true
    );
  return check(node) || check(active);
};

const imagesFromClipboard = (data: DataTransfer | null): File[] => {
  if (!data) return [];
  const files: File[] = [];
  for (const item of data.items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  return files;
};

const onGlobalPaste = async (e: ClipboardEvent) => {
  if (!canUpload.value) return;
  if (isTypingTarget(e.target)) return;
  if (converting.value) return;

  const files = imagesFromClipboard(e.clipboardData);
  if (!files.length) return;

  e.preventDefault();
  await uploadImagesToCurrentFolder(files, 'pasted_clipboard');
};

// ─── Filter Reset ─────────────────────────────────────────────────────────────
const resetAllFilters = () => {
  search.value = '';
  filterUploadedBy.value = 'all';
  filterFileType.value = 'all';
  filterMyUploads.value = false;
  sortBy.value = 'newest';
  currentFolder.value = 'all';
  folderSearchQuery.value = '';
  folderMissingFilter.value = false;
  filterFolderProductType.value = 'all';
  filterFolderMachineCategory.value = 'all';
};

// ─── Bulk Actions ─────────────────────────────────────────────────────────────
const isImageSelected = (key: string) => selectedImageKeys.value.includes(key);

const toggleImageSelection = (key: string) => {
  const idx = selectedImageKeys.value.indexOf(key);
  if (idx !== -1) {
    selectedImageKeys.value.splice(idx, 1);
  } else {
    selectedImageKeys.value.push(key);
  }
};

const toggleSelectAll = () => {
  if (selectedImageKeys.value.length === filteredLibrary.value.length) {
    clearSelection();
  } else {
    selectedImageKeys.value = filteredLibrary.value.map(img => img.key);
  }
};

const clearSelection = () => {
  selectedImageKeys.value = [];
};

const bulkMoveToFolder = async (folderId: string | null) => {
  if (!supabaseConfigured || selectedImageKeys.value.length === 0) return;
  
  // Filter only images user has permission to manage
  const manageableKeys = selectedImageKeys.value.filter((k) => {
    const img = library.value.find(i => i.key === k);
    return img ? canManageImage(img) : false;
  });

  if (manageableKeys.length === 0) {
    showToast(t('mediaLibrary.toast.moveSelectedPermission'));
    return;
  }

  // Optimistic update
  manageableKeys.forEach((key) => {
    const idx = dbImages.value.findIndex(i => i.id === key);
    if (idx !== -1) dbImages.value[idx].folder_id = folderId;
  });

  const { error } = await supabase
    .from('team_images')
    .update({ folder_id: folderId })
    .in('id', manageableKeys);

  if (error) {
    showToast(t('mediaLibrary.toast.bulkMoveFailed'));
    console.error(error);
  } else {
    const folderName = folderId ? customFolders.value.find(f => f.id === folderId)?.name || 'Folder' : t('mediaLibrary.uncategorized');
    showToast(t('mediaLibrary.toast.bulkMoveSuccess', { count: manageableKeys.length, folderName }));
    clearSelection();
    loadLibraryFromDB();
  }
};

const bulkCopyUrls = () => {
  const urls = selectedImageKeys.value
    .map(key => library.value.find(i => i.key === key)?.url)
    .filter(Boolean)
    .join('\n');

  if (urls) {
    navigator.clipboard.writeText(urls).then(() => {
      showToast(t('mediaLibrary.toast.bulkUrlCopied', { count: selectedImageKeys.value.length }));
      clearSelection();
    });
  }
};

const bulkDownloadSelected = async () => {
  if (selectedImageKeys.value.length === 0) return;
  showToast(t('mediaLibrary.toast.bulkDownloadStart', { count: selectedImageKeys.value.length }));
  
  const promises = selectedImageKeys.value.map(async (key) => {
    const img = library.value.find(i => i.key === key);
    if (img) {
      try {
        await downloadImageBlob(img.url, `${img.displayName}.${img.fileType.split('/')[1] || 'png'}`);
      } catch (err) {
        console.error(`Failed downloading ${img.displayName}:`, err);
      }
    }
  });

  await Promise.allSettled(promises);
  showToast(t('mediaLibrary.toast.bulkDownloadFinished'));
  clearSelection();
};

const bulkDeleteSelected = async () => {
  if (!supabaseConfigured || selectedImageKeys.value.length === 0) return;

  const manageableKeys = selectedImageKeys.value.filter((k) => {
    const img = library.value.find(i => i.key === k);
    return img ? canManageImage(img) : false;
  });

  if (manageableKeys.length === 0) {
    showToast(t('mediaLibrary.toast.deleteImagePermission'));
    return;
  }

  if (confirm(t('mediaLibrary.confirm.bulkDelete', { count: manageableKeys.length, skipped: selectedImageKeys.value.length - manageableKeys.length }))) {
    // Save current stats for rollback
    const origStats = libraryStats.value ? { ...libraryStats.value } : null;

    // Optimistic remove
    const origImages = [...dbImages.value];
    dbImages.value = dbImages.value.filter(i => !manageableKeys.includes(i.id));

    // Decrement stats optimistically
    if (libraryStats.value) {
      let sizeSum = 0;
      let unknownCount = 0;
      manageableKeys.forEach((key) => {
        const img = library.value.find((i) => i.key === key);
        if (img) {
          sizeSum += (img.fileSize || 0);
          if (!img.fileSize) unknownCount++;
        }
      });
      libraryStats.value.total_images = Math.max(0, libraryStats.value.total_images - manageableKeys.length);
      libraryStats.value.total_storage_bytes = Math.max(0, libraryStats.value.total_storage_bytes - sizeSum);
      libraryStats.value.unknown_size_count = Math.max(0, libraryStats.value.unknown_size_count - unknownCount);
    }

    const { error: dbErr } = await supabase
      .from('team_images')
      .delete()
      .in('id', manageableKeys);

    if (dbErr) {
      dbImages.value = origImages;
      libraryStats.value = origStats;
      showToast(t('mediaLibrary.toast.bulkDeleteFailed'));
      console.error(dbErr);
      return;
    }

    // Remove from storage in parallel
    const pathsToRemove: string[] = [];
    manageableKeys.forEach((key) => {
      // Find image in the original list before optimistic filter
      const rawImg = origImages.find((i) => i.id === key);
      if (rawImg) {
        const bucketMarker = '/public/team-images/';
        const markerIndex = rawImg.url.indexOf(bucketMarker);
        if (markerIndex !== -1) {
          pathsToRemove.push(decodeURIComponent(rawImg.url.substring(markerIndex + bucketMarker.length)));
        }
      }
    });

    if (pathsToRemove.length > 0) {
      await supabase.storage.from('team-images').remove(pathsToRemove);
    }

    showToast(t('mediaLibrary.toast.bulkDeleteSuccess', { count: manageableKeys.length }));
    clearSelection();
    loadLibraryFromDB();
  }
};

// Keyboard listener for Arrow keys
const handleKeydown = (e: KeyboardEvent) => {
  if (!drawerOpen.value) return;
  if (isTypingTarget(e.target)) return;
  if (e.key === 'ArrowLeft') {
    selectPreviousImage();
  } else if (e.key === 'ArrowRight') {
    selectNextImage();
  }
};

// ─── Toasts & Formatter Helpers ───────────────────────────────────────────────
const showToast = (msg: string) => {
  toastMsg.value = msg;
  toastVisible.value = true;
  setTimeout(() => { toastVisible.value = false; }, 2000);
};

const fmt = (bytes: number | null) => {
  if (bytes === null) return 'N/A';
  return formatFileSize(bytes);
};

const formatTotalStorage = (bytes: number | null) => {
  if (bytes === null || bytes === undefined) return '0 KB';
  if (bytes === 0) return '0 KB';
  
  const kb = bytes / 1024;
  if (kb < 1024) {
    return parseFloat(kb.toFixed(1)) + ' KB';
  }
  
  const mb = kb / 1024;
  if (mb < 1024) {
    return parseFloat(mb.toFixed(1)) + ' MB';
  }
  
  const gb = mb / 1024;
  return parseFloat(gb.toFixed(1)) + ' GB';
};

const fmtDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear().toString().slice(-2)}`;
  } catch {
    return dateStr;
  }
};

const fmtDateFull = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return dateStr;
  }
};

const handleResize = () => {
  isLargeScreen.value = window.innerWidth >= 1024;
};

// Lifecycle Hooks
onMounted(() => {
  // Sync selected folder from URL params if present
  if (route.query.folder && typeof route.query.folder === 'string') {
    currentFolder.value = route.query.folder;
  }

  loadLibraryFromDB();
  subscribeRealtime();
  window.addEventListener('paste', onGlobalPaste);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', handleResize);
  handleResize();
});

onUnmounted(() => {
  if (foldersSubscription) foldersSubscription.unsubscribe();
  if (imagesSubscription) imagesSubscription.unsubscribe();
  window.removeEventListener('paste', onGlobalPaste);
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
/* Grid and Sidebar Layout */
.img-manager-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
@media (min-width: 768px) {
  .img-manager-layout {
    flex-direction: row;
    align-items: flex-start;
  }
}

.img-drop {
  transition: all 180ms ease;
}

/* Card select shadows and states */
.card-selected {
  border-color: var(--primary) !important;
  box-shadow: 0 0 0 3px var(--primary-ring) !important;
}

/* Expand Collapse Transitions */
.expand-uploader-enter-active,
.expand-uploader-leave-active {
  transition: all 200ms ease;
  max-height: 200px;
}
.expand-uploader-enter-from,
.expand-uploader-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  overflow: hidden;
}

/* Toast */
.img-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: #16a34a;
  color: #f8fbff;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.3);
}
.img-toast-enter-active,
.img-toast-leave-active {
  transition: all 0.2s ease;
}
.img-toast-enter-from,
.img-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

.img-loadmore {
  align-self: center;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 0.45rem 1rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  margin-top: 0.5rem;
  transition: all 120ms ease;
}
.img-loadmore:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.select-wrap select {
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
}

/* Hide scrollbar for Chrome, Safari and Opera */
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
/* Hide scrollbar for IE, Edge and Firefox */
.scrollbar-none {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}

/* Folder Sidebar Styles */
.folder-row {
  display: flex;
  align-items: center;
  gap: 0.375rem; /* gap-1.5 */
  padding: 0.375rem 0.75rem; /* px-3 py-1.5 */
  border-radius: 8px; /* rounded-lg */
  font-size: 0.75rem; /* text-xs */
  font-weight: 600; /* font-semibold */
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
  height: auto; /* auto height */
  color: var(--text-muted);
  background-color: rgba(var(--color-soft-bg, 0, 0, 0), 0.3);
}

.folder-row:hover {
  background-color: rgba(var(--color-soft-bg, 0, 0, 0), 0.5);
  color: var(--text-main);
}

.folder-row.active {
  background-color: var(--primary-soft);
  color: var(--primary);
}

/* Selected for Trash (select mode) */
.folder-row.folder-selected {
  background-color: var(--primary-soft);
  box-shadow: inset 2px 0 0 0 var(--primary);
}

/* Drag over animations */
.folder-row.drag-over {
  background-color: rgba(var(--color-primary), 0.15);
  border: 1px dashed var(--primary);
  animation: pulse 2s infinite;
}

@media (min-width: 768px) {
  .folder-row {
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr) auto 16px;
    align-items: center;
    gap: 0.5rem; /* gap: 8px */
    padding: 0.375rem 0.125rem 0.375rem 0.375rem;
    border-radius: 6px; /* rounded-btn */
    background-color: transparent;
    min-height: 4.25rem; /* Taller on desktop to support stacked metadata details */
    color: var(--text-muted);
  }
  
  .folder-row:hover {
    background-color: var(--soft-bg);
    color: var(--text-main);
  }
  
  .folder-row.active {
    background-color: var(--primary-soft);
    color: var(--primary);
  }
}

.folder-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
@media (min-width: 768px) {
  .folder-icon {
    width: 24px;
    justify-content: start;
  }
}

.folder-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.folder-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  min-width: 1.75rem; /* 28px minimum width */
  height: 1.25rem; /* h-5 */
  padding: 0 4px;
  border-radius: 9999px;
  background-color: var(--soft-bg);
  color: var(--text-soft);
  flex-shrink: 0;
  transition: background-color 150ms ease, color 150ms ease;
  justify-self: end; /* align count badge to the right of the column */
}

/* Active and Hover states */
.folder-row.active .folder-count {
  background-color: var(--primary-soft-strong);
  color: var(--primary);
}

.folder-row:hover .folder-count {
  color: var(--text-main);
}

.folder-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 20px;
  position: relative;
}

.desktop-action-btn {
  display: none;
}

@media (min-width: 768px) {
  .desktop-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    visibility: hidden;
    transition: opacity 150ms ease, visibility 150ms ease;
  }
  
  .desktop-action-btn.menu-open,
  .folder-row:hover .desktop-action-btn,
  .folder-row.active .desktop-action-btn,
  .folder-row:focus-within .desktop-action-btn {
    opacity: 1;
    visibility: visible;
  }
}

/* Folder Custom Scrollbar */
@media (min-width: 768px) {
  .folder-list-scroll {
    overflow-y: visible; /* Default to visible so dropdowns are not clipped when list is small */
    max-height: calc(100vh - 220px); /* fill available viewport height so more folders are visible */
    scrollbar-gutter: stable;
    padding-right: 2px; /* Reduced right padding so content naturally extends close to the edge */
    margin-right: -4px; /* Pull container closer to the sidebar edge */
    padding-left: 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--primary) #2C2C2F;
  }

  .folder-list-scroll.scroll-active {
    overflow-y: auto !important;
  }
  
  .folder-list-scroll::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .folder-list-scroll::-webkit-scrollbar-track {
    background: #2C2C2F;
    border-radius: 99px;
  }
  
  .folder-list-scroll::-webkit-scrollbar-thumb {
    background: var(--primary);
    border-radius: 99px;
    transition: background-color 150ms ease;
  }
  
  .folder-list-scroll::-webkit-scrollbar-thumb:hover {
    background: var(--primary-hover);
  }
}

/* ── Rich Description Preview (folder detail area) ── */
.fde-preview h1 { font-size: 16px; font-weight: 800; margin: 8px 0 4px; line-height: 1.3; }
.fde-preview h1:first-child { margin-top: 0; }
.fde-preview h2 { font-size: 14px; font-weight: 700; margin: 6px 0 3px; line-height: 1.35; }
.fde-preview h2:first-child { margin-top: 0; }
.fde-preview h3 { font-size: 12px; font-weight: 700; margin: 5px 0 2px; line-height: 1.4; }
.fde-preview h3:first-child { margin-top: 0; }
.fde-preview p { margin: 0 0 4px; }
.fde-preview p:last-child { margin-bottom: 0; }
.fde-preview ul, .fde-preview ol { padding-left: 18px; margin: 4px 0 6px; }
.fde-preview ul { list-style-type: disc; }
.fde-preview ol { list-style-type: decimal; }
.fde-preview li { margin-bottom: 2px; }
.fde-preview li p { margin: 0; }
.fde-preview strong { font-weight: 700; }
.fde-preview em { font-style: italic; }
.fde-preview u { text-decoration: underline; }
.fde-preview a { color: var(--primary); text-decoration: underline; }
.fde-preview img { max-width: 100%; height: auto; border-radius: 6px; margin: 4px 0; }
</style>
