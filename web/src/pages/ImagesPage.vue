<template>
  <!-- ════════ ACCESS DENIED VIEW FOR QUALITY CHECKER ════════ -->
  <div v-if="auth.isQualityChecker" class="card p-10 text-center flex flex-col items-center justify-center min-h-[400px]">
    <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-status-needs-fix-bg text-status-needs-fix-fg mb-4">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
    </div>
    <h1 class="text-xl font-bold text-text-main">Access Denied</h1>
    <p class="text-sm text-text-muted mt-2 max-w-sm">Quality Checkers do not have access to the Team Media Library.</p>
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
          Team Media Library
        </h1>
        <p class="text-xs text-text-muted mt-1">A shared workspace for storing, organizing, and accessing team images.</p>
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
              <div class="text-[9px] uppercase font-bold tracking-wider text-text-soft leading-none">Images</div>
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
              <div class="text-[9px] uppercase font-bold tracking-wider text-text-soft leading-none">Folders</div>
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
                <div class="text-[9px] uppercase font-bold tracking-wider text-text-soft leading-none">Storage</div>
                <span 
                  v-if="(libraryStats?.unknown_size_count ?? 0) > 0"
                  class="text-[9px] text-text-muted hover:text-warning cursor-help leading-none flex items-center"
                  title="Some older files may not include size metadata."
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
                  {{ isFolderOnlyFilter ? 'Folder' : 'Filtered' }}: {{ formatTotalStorage(filteredStorageUsed) }}
                </span>
                <span v-else>All images</span>
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
            Export CSV
          </button>
          <button type="button" class="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5" @click="uploaderExpanded = !uploaderExpanded">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {{ uploaderExpanded ? 'Hide Upload' : 'Upload Images' }}
          </button>
          <button type="button" class="btn-primary py-1.5 px-3 text-xs flex items-center gap-1" @click="onAddFolderClick">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Folder
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
              {{ uploadStatusMsg || 'Drop, paste (Ctrl+V / Cmd+V), or click to upload images.' }}
            </span>
            <span class="text-[10px] text-text-muted block mt-1">PNG · JPG · WebP · GIF · SVG  ·  Up to 20MB</span>
          </div>
        </div>
      </section>
    </Transition>

    <!-- ════════ MEDIA MANAGER PANEL ════════ -->
    <div class="img-manager-layout">
      <!-- ─── Left Folder Sidebar ─── -->
      <aside class="card p-3 shrink-0 w-full md:w-[280px] md:max-h-[700px] flex flex-col gap-3">
        <!-- Desktop sidebar header: hidden on mobile -->
        <div class="hidden md:flex items-center justify-between border-b border-border pb-2">
          <h3 class="text-xs font-bold uppercase tracking-wider text-text-soft">Folders</h3>
          <button type="button" class="text-xs text-primary font-bold flex items-center gap-0.5 hover:underline" @click="onAddFolderClick">
            + New
          </button>
        </div>

        <!-- Folder Search: hidden on mobile -->
        <div class="hidden md:block">
          <input
            v-model="folderSearchQuery"
            type="text"
            placeholder="Search folders..."
            class="w-full bg-soft text-xs border border-border/80 rounded px-2.5 py-1.5 focus:outline-none focus:border-primary placeholder:text-text-soft"
          />
        </div>

        <!-- Inline Folder Creator on Desktop -->
        <div v-if="showNewFolderInput" class="hidden md:flex border border-border/60 rounded bg-soft/50 p-2 flex-col gap-2">
          <input
            ref="newFolderInputRef"
            v-model="newFolderName"
            type="text"
            placeholder="Folder name..."
            class="w-full bg-card border border-border text-xs rounded px-2 py-1 focus:outline-none focus:border-primary"
            @keyup.enter="createFolder"
            @keyup.esc="showNewFolderInput = false"
          />
          <div class="flex justify-end gap-1.5">
            <button type="button" class="btn-secondary py-1 px-2 h-6 text-[10px]" @click="showNewFolderInput = false">Cancel</button>
            <button type="button" class="btn-primary py-1 px-2.5 h-6 text-[10px]" @click="createFolder">Create</button>
          </div>
        </div>

        <!-- Folder list -->
        <ul class="folder-list-scroll flex md:flex-col gap-1.5 md:gap-0.5 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 scrollbar-none whitespace-nowrap md:whitespace-normal">
          <!-- New Folder button on mobile -->
          <li
            class="md:hidden inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border border-dashed border-border text-text-muted bg-soft/30 hover:bg-soft shrink-0"
            @click="onAddFolderClick"
          >
            + New Folder
          </li>

          <!-- Inline Folder Creator on Mobile (as a chip) -->
          <li v-if="showNewFolderInput" class="md:hidden inline-flex items-center gap-1.5 bg-soft/50 border border-border/80 rounded-full px-3 py-1 shrink-0">
            <input
              ref="newFolderInputRef"
              v-model="newFolderName"
              type="text"
              placeholder="Folder name..."
              class="bg-transparent text-xs outline-none text-text-main w-24"
              @keyup.enter="createFolder"
              @keyup.esc="showNewFolderInput = false"
            />
            <button type="button" class="text-text-muted hover:text-text-main text-[10px] font-bold" @click="showNewFolderInput = false">✕</button>
            <button type="button" class="text-primary hover:text-primary-hover text-[10px] font-bold" @click="createFolder">Save</button>
          </li>

          <!-- All Library -->
          <li
            class="folder-row select-none"
            :class="{ active: currentFolder === 'all' }"
            @click="currentFolder = 'all'"
          >
            <span class="folder-icon" v-html="ICON_SVG.folderOpen" />
            <span class="folder-name truncate">All Library</span>
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
            <span class="folder-name truncate">Uncategorized</span>
            <span class="folder-count">{{ uncategorizedCount }}</span>
            <div class="w-[16px] h-5 hidden md:block"></div>
          </li>

          <!-- Custom User Folders -->
          <li
            v-for="folder in filteredFolders"
            :key="folder.id"
            class="folder-row relative group"
            :class="{ active: currentFolder === folder.id, 'drag-over': dragOverFolderId === folder.id }"
            @click="currentFolder = folder.id"
            @dragover.prevent
            @dragenter.prevent="dragOverFolderId = folder.id"
            @dragleave="onDragLeaveFolder(folder.id)"
            @drop="onImageDrop($event, folder.id)"
            :title="folder.name"
          >
            <span class="folder-icon" v-html="ICON_SVG.folder" />
            
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
            <span v-else class="folder-name truncate">{{ folder.name }}</span>

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
                @click.stop="toggleFolderMenu(folder.id)"
              >
                <span v-html="ICON_SVG.dots" />
              </button>

              <!-- Folder Actions Dropdown (Desktop only) -->
              <div
                v-if="activeFolderMenuId === folder.id"
                class="absolute right-0 top-7 z-10 w-44 bg-card border border-border shadow-lg rounded-btn py-1"
                v-click-outside="closeFolderMenu"
              >
                <button
                  v-if="canManageFolder(folder)"
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs text-text-main hover:bg-soft flex items-center gap-1.5"
                  @click.stop="startFolderRename(folder)"
                >
                  Rename
                </button>
                <button
                  v-if="canManageFolder(folder)"
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs text-status-needs-fix-fg hover:bg-soft flex items-center gap-1.5"
                  @click.stop="deleteFolder(folder.id)"
                >
                  Delete Folder
                </button>
                <button
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs text-text-main hover:bg-soft flex items-center gap-1.5"
                  @click.stop="copyFolderLink(folder.id)"
                >
                  Copy Link
                </button>
                <button
                  v-if="selectedImageKeys.length > 0"
                  type="button"
                  class="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-soft flex items-center gap-1.5 font-bold border-t border-border/40 mt-1"
                  @click.stop="bulkMoveToFolder(folder.id)"
                >
                  Move Selected Here
                </button>
              </div>

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
                placeholder="Search images..."
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
                <option value="all">All Uploaders</option>
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
                <option value="all">All File Types</option>
                <option value="webp">WebP</option>
                <option value="png">PNG</option>
                <option value="jpeg">JPG / JPEG</option>
                <option value="gif">GIF</option>
                <option value="svg">SVG</option>
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
                <option v-if="currentFolder !== 'all' && currentFolder !== 'uncategorized'" value="custom">Arranged Order</option>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">Name A-Z</option>
                <option value="alphabetical-desc">Name Z-A</option>
                <option value="largest-size">Largest Size</option>
                <option value="smallest-size">Smallest Size</option>
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
                title="Fill aspect ratio"
              >
                Cover
              </button>
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="objectFit === 'contain' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="objectFit = 'contain'"
                title="Contain logo / SVG"
              >
                Contain
              </button>
            </div>

            <!-- Grid vs List View -->
            <div class="flex border border-border rounded-btn p-0.5 shrink-0 bg-soft items-center h-9">
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="viewMode === 'comfortable' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="viewMode = 'comfortable'"
                title="Comfortable Grid"
              >
                Comfort
              </button>
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="viewMode === 'compact' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="viewMode = 'compact'"
                title="Compact Grid"
              >
                Compact
              </button>
              <button
                type="button"
                class="px-2.5 lg:px-3 py-1 text-xs font-semibold transition-all duration-200 rounded-[8px] h-7 flex items-center justify-center whitespace-nowrap"
                :class="viewMode === 'list' ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-text-main'"
                @click="viewMode = 'list'"
                title="List Tabular View"
              >
                List
              </button>
            </div>
          </div>
        </div>

        <!-- Active folder / Filter Chips banner -->
        <div class="flex flex-wrap items-center justify-between gap-3 text-xs bg-soft/20 p-2 rounded">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="font-bold text-text-main shrink-0 capitalize">{{ currentFolderTitle }}</span>
            <span class="text-text-muted shrink-0">·</span>
            <span class="text-text-muted font-medium shrink-0">{{ filteredLibrary.length }} result{{ filteredLibrary.length === 1 ? '' : 's' }}</span>
            
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
              Arrange Images
            </button>

            <button
              v-if="filterMyUploads || filterUploadedBy !== 'all' || filterFileType !== 'all' || search"
              type="button"
              class="text-primary hover:underline font-semibold text-[11px] ml-2 shrink-0"
              @click="resetAllFilters"
            >
              Reset Filters
            </button>
          </div>

          <div class="flex items-center gap-2">
            <label class="flex items-center gap-1.5 cursor-pointer text-text-muted font-semibold">
              <input type="checkbox" v-model="filterMyUploads" class="rounded border-border text-primary focus:ring-primary/20" />
              My Uploads
            </label>
            <span class="text-text-muted">·</span>
            <button type="button" class="text-text-muted hover:text-text-main font-semibold" @click="toggleSelectAll">
              {{ selectedImageKeys.length === filteredLibrary.length && filteredLibrary.length > 0 ? 'Deselect All' : 'Select All' }}
            </button>
          </div>
        </div>



        <!-- ── Organize Mode Workspace ── -->
        <div v-if="isOrganizeMode" class="arrange-workspace space-y-6 mt-4 p-4 border border-border rounded bg-card/45">
          <!-- 1. Header Toolbar -->
          <div class="flex items-center justify-between border-b border-border pb-3 flex-wrap gap-3">
            <div>
              <h3 class="text-sm font-bold text-text-main flex items-center gap-1.5">
                Arrange Images in "{{ currentFolderTitle }}"
              </h3>
              <p class="text-xs text-text-muted mt-0.5">
                Drag images to set gallery order, choose one feature image, and save changes.
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="btn-secondary py-1.5 px-3 text-xs font-semibold h-8 rounded-btn"
                @click="cancelOrganize"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-primary py-1.5 px-4 text-xs font-semibold h-8 rounded-btn flex items-center gap-1 shadow-sm"
                @click="saveOrganizeOrder"
              >
                Save Order
              </button>
            </div>
          </div>

          <!-- 2. Feature Image Selection Zone -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-text-main uppercase tracking-wider">Feature Image</h4>
            
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
                    FEATURE IMAGE
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
                      Preview
                    </button>
                    <button
                      type="button"
                      class="btn-secondary py-1 px-2.5 text-[11px] rounded"
                      @click="copyUrl(getFeatureImage()!)"
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      class="btn-danger py-1 px-2.5 text-[11px] rounded font-semibold text-status-rejected-fg bg-status-rejected-bg/20 border border-status-rejected-fg/30 hover:bg-status-rejected-bg/40"
                      @click="removeFeature"
                    >
                      Remove Feature
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
                <p class="font-bold text-xs text-text-main">No feature image selected.</p>
                <p class="text-[11px] text-text-muted mt-1">
                  Drag a gallery image here, or click "Set Feature" on any image card below.
                </p>
              </div>
            </div>
          </div>

          <!-- 3. Gallery Ordering Zone -->
          <div class="space-y-2">
            <h4 class="text-xs font-bold text-text-main uppercase tracking-wider">Gallery Images</h4>
            
            <div v-if="!organizeImages.length" class="text-center p-8 border border-border border-dashed rounded-btn text-text-muted italic bg-soft/5">
              No gallery images remaining in this folder.
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
                    title="Drag to reorder"
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
                        title="Move Up"
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
                        title="Move Down"
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
                        Preview
                      </button>
                      <button
                        type="button"
                        class="btn-secondary py-0.5 px-1.5 text-[10px] rounded h-6 font-semibold"
                        @click="setAsFeature(img.key)"
                      >
                        Set Feature
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
          <p class="font-bold text-sm text-text-main">No images in your library yet.</p>
          <p class="text-xs text-text-muted mt-1 max-w-sm">Use the expandable dropzone above to drag, paste, or select your first files!</p>
        </div>

        <div v-else-if="!filteredLibrary.length" class="p-10 text-center text-text-muted italic flex flex-col items-center justify-center min-h-[300px]">
          <p class="font-bold text-sm text-text-main">No images found matching these filters.</p>
          <p class="text-xs text-text-muted mt-1">Try relaxing your search terms or folder selections.</p>
          <button type="button" class="btn-secondary mt-3 py-1 px-3 text-xs" @click="resetAllFilters">Reset Filters</button>
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
                <span class="text-[9px] font-bold text-white uppercase tracking-wider">{{ item.status }}...</span>
              </div>

              <!-- Failed Overlay -->
              <div v-else class="absolute inset-0 bg-status-needs-fix-bg/85 flex flex-col items-center justify-center p-3 text-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5" class="mb-1">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span class="text-[9px] font-bold text-status-needs-fix-fg uppercase tracking-wider">Upload Failed</span>
              </div>
            </div>

            <!-- Meta details -->
            <div class="p-2.5 flex flex-col gap-1.5 min-w-0">
              <div class="text-xs font-bold text-text-main truncate" :title="item.name">
                {{ item.name }}
              </div>
              <div class="flex items-center justify-between text-[10px] text-text-muted font-medium">
                <span class="truncate">Saving to folder...</span>
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
                  Retry
                </button>
                <button type="button" class="btn-secondary py-1 px-2 text-[10px] h-6 flex-1 flex items-center justify-center" @click="removeUploadItem(item.id)">
                  Remove
                </button>
              </div>
              <div v-else class="h-6 mt-1 opacity-20 pointer-events-none flex gap-1.5">
                <div class="btn-secondary py-1 px-2 text-[10px] h-6 flex-1 text-center">Processing...</div>
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
                  FEATURE IMAGE
                </span>
                <span v-else-if="img.sortOrder > 0 && img.sortOrder !== 9999" class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-zinc-800 text-white shadow-sm border border-border/50">
                  Gallery #{{ img.sortOrder }}
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
                  <option value="">Uncategorized</option>
                  <option v-for="f in customFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
                </select>
              </div>
            </div>

            <!-- Overlay Actions (Hover only) -->
            <div class="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition flex gap-1 bg-card/90 border border-border p-1 rounded shadow-md" @click.stop>
              <button type="button" class="p-1 hover:text-primary text-text-muted rounded" @click="copyUrl(img)" title="Copy URL">
                <span v-html="ICON_SVG.copy" />
              </button>
              <button
                v-if="canManageImage(img)"
                type="button"
                class="p-1 hover:text-status-needs-fix-fg text-text-muted rounded"
                @click="deleteImage(img)"
                title="Delete Image"
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
                <span class="text-[8px] font-bold text-white uppercase tracking-wider mt-1 truncate max-w-full px-1">{{ item.status }}</span>
              </div>
              <div v-else class="absolute inset-0 bg-status-needs-fix-bg/85 flex flex-col items-center justify-center text-center p-1" @click.stop>
                <span class="text-[8px] font-bold text-status-needs-fix-fg uppercase tracking-wider block">Failed</span>
                <div class="flex gap-1 mt-1">
                  <button type="button" class="bg-primary text-white text-[8px] font-bold px-1 rounded hover:bg-primary-hover" @click="retryUploadItem(item)">Retry</button>
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
                  FEATURE
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
              <button type="button" class="p-0.5 hover:text-primary text-text-muted rounded scale-90" @click="copyUrl(img)" title="Copy URL">
                <span v-html="ICON_SVG.copy" />
              </button>
              <button
                v-if="canManageImage(img)"
                type="button"
                class="p-0.5 hover:text-status-needs-fix-fg text-text-muted rounded scale-90"
                @click="deleteImage(img)"
                title="Delete Image"
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
                <th class="px-4 py-2.5 w-8 table-head">Select</th>
                <th class="px-4 py-2.5 w-12 table-head">Preview</th>
                <th class="px-4 py-2.5 table-head">Name</th>
                <th class="px-4 py-2.5 table-head">Folder</th>
                <th class="px-4 py-2.5 table-head">Uploaded By</th>
                <th class="px-4 py-2.5 table-head">Date</th>
                <th class="px-4 py-2.5 table-head">Size</th>
                <th class="px-4 py-2.5 table-head text-right">Actions</th>
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
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary ml-2 uppercase font-bold tracking-wider animate-pulse inline-block">{{ item.status }}</span>
                </td>
                <td class="px-4 py-2 text-text-soft font-light">{{ currentFolderTitle }}</td>
                <td class="px-4 py-2 text-text-muted truncate">Uploading...</td>
                <td class="px-4 py-2 text-text-soft font-light">-</td>
                <td class="px-4 py-2 text-text-soft font-light">{{ item.file.size ? fmt(item.file.size) : '-' }}</td>
                <td class="px-4 py-2 text-right">
                  <div v-if="item.status === 'failed'" class="flex items-center justify-end gap-1.5">
                    <button type="button" class="btn-primary py-0.5 px-2 text-[10px] h-6 flex items-center" @click="retryUploadItem(item)">
                      Retry
                    </button>
                    <button type="button" class="btn-secondary py-0.5 px-1 h-6 text-status-needs-fix-fg flex items-center" @click="removeUploadItem(item.id)">
                      Remove
                    </button>
                  </div>
                  <span v-else class="text-[10px] text-text-soft italic">Pending...</span>
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
                      FEATURE IMAGE
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
                    <option value="">Uncategorized</option>
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
                      Copy URL
                    </button>
                    <button
                      v-if="canManageImage(img)"
                      type="button"
                      class="btn-secondary p-1 h-7 text-status-needs-fix-fg hover:bg-status-needs-fix-bg/10 border-status-needs-fix-bg/60"
                      @click="deleteImage(img)"
                      title="Delete Image"
                    >
                      Delete
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
          Load More ({{ filteredLibrary.length - visibleCount }} items remaining)
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
                <span class="text-text-soft font-light text-xs">Folder Info</span>
              </h2>
              <div class="flex items-center gap-2 text-xs text-text-muted">
                <span>{{ activeFolderObjStats.imageCount }} images</span>
                <span class="text-text-muted/40">•</span>
                <span :class="activeFolderObjStats.hasFeature ? 'text-primary font-bold' : 'text-status-needs-fix-fg font-semibold'">
                  {{ activeFolderObjStats.hasFeature ? 'Feature selected' : 'No feature image' }}
                </span>
                <span class="text-text-muted/40">•</span>
                <span>{{ activeFolderObjStats.orderedCount }} ordered</span>
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
              {{ hasFolderContent(activeFolderObj) ? 'Edit Folder Info' : 'Add Folder Info' }}
            </button>
          </div>

          <!-- Content Details Preview -->
          <div v-if="hasFolderContent(activeFolderObj)" class="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-border/40 pt-3 text-xs">
            <div class="md:col-span-2 space-y-3.5">
              <div v-if="activeFolderObj.short_description">
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">Short Description</span>
                <p class="text-text-main font-medium leading-relaxed">
                  {{ activeFolderObj.short_description }}
                </p>
              </div>

              <!-- Full description View option -->
              <div v-if="activeFolderObj.description">
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">Full Description</span>
                <p class="text-text-main font-light leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {{ activeFolderObj.description }}
                </p>
              </div>
            </div>

            <div class="space-y-3 md:border-l md:border-border/40 md:pl-4">
              <div>
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">Button URL</span>
                <div v-if="activeFolderObj.button_url" class="flex items-center gap-1.5">
                  <a
                    :href="activeFolderObj.button_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-primary hover:underline font-bold break-all flex items-center gap-1"
                  >
                    <span>Open Link</span>
                    <svg class="w-3 h-3 inline shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>
                <span v-else class="text-text-muted italic">No link added</span>
              </div>

              <div v-if="activeFolderObj.updated_at">
                <span class="text-text-muted font-bold block uppercase tracking-wider text-[9px] mb-0.5">Last Updated</span>
                <span class="text-text-muted font-mono font-medium">{{ fmtDateFull(activeFolderObj.updated_at) }}</span>
              </div>
            </div>
          </div>
          
          <div v-else class="text-xs text-text-muted italic flex items-center justify-between border-t border-border/40 pt-3">
            <span>No folder description added yet.</span>
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
        <h3 class="text-sm font-bold text-text-main">Image Details</h3>
        <div class="flex items-center gap-2">
          <!-- Keyboard navigation indicator / arrows -->
          <div class="flex border border-border/80 rounded overflow-hidden mr-2 bg-soft/40">
            <button type="button" class="p-1.5 hover:bg-soft text-text-muted" @click="selectPreviousImage" title="Previous Image (Left Arrow)">
              <span v-html="ICON_SVG.arrowLeft" />
            </button>
            <span class="px-2.5 py-1 text-[11px] font-bold text-text-muted flex items-center justify-center bg-soft/10">
              {{ activeImageIndex + 1 }} / {{ filteredLibrary.length }}
            </span>
            <button type="button" class="p-1.5 hover:bg-soft text-text-muted" @click="selectNextImage" title="Next Image (Right Arrow)">
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
            title="Click to view full screen"
          />
        </div>

        <!-- Image Info -->
        <div class="space-y-4">
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-text-soft">Image Title</label>
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
              <span class="text-text-muted">Folder</span>
              <div class="mt-1 font-semibold text-text-main" @click.stop>
                <select
                  :value="selectedImage.folderId || ''"
                  @change="(e) => moveImage(selectedImage!.key, (e.target as HTMLSelectElement).value || null)"
                  class="bg-transparent border-0 p-0 text-xs font-semibold text-text-main focus:outline-none cursor-pointer"
                >
                  <option value="">Uncategorized</option>
                  <option v-for="f in customFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
                </select>
              </div>
            </div>
            <div>
              <span class="text-text-muted">Uploaded By</span>
              <div class="mt-1 font-semibold text-text-main">{{ selectedImage.uploaderName }}</div>
            </div>
            <div>
              <span class="text-text-muted">Upload Date</span>
              <div class="mt-1 font-semibold text-text-main">{{ fmtDateFull(selectedImage.createdAt) }}</div>
            </div>
            <div>
              <span class="text-text-muted">Dimensions</span>
              <div class="mt-1 font-semibold text-text-main font-mono text-[11px]">{{ imageDimensions }}</div>
            </div>
            <div>
              <span class="text-text-muted">File Type</span>
              <div class="mt-1 font-semibold text-text-main">{{ selectedImage.fileType }}</div>
            </div>
            <div>
              <span class="text-text-muted">File Size</span>
              <div class="mt-1 font-semibold text-text-main">{{ fmt(selectedImage.fileSize) }}</div>
            </div>
          </div>

          <!-- URL bar -->
          <div>
            <label class="text-[10px] font-bold uppercase tracking-wider text-text-soft">Image URL</label>
            <div class="flex gap-2 mt-1">
              <input
                type="text"
                readonly
                :value="selectedImage.url"
                class="flex-1 bg-soft border border-border/80 text-[11px] font-mono rounded px-2.5 py-1.5 focus:outline-none text-text-muted truncate"
                @click="(e) => (e.target as HTMLInputElement).select()"
              />
              <button type="button" class="btn-secondary h-8 py-1.5 px-3 text-xs" @click="copyUrl(selectedImage)">
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Drawer Footer (Quick Actions) -->
      <div v-if="selectedImage" class="border-t border-border bg-soft/40 px-5 py-4 shrink-0 flex flex-col gap-2">
        <div class="text-[10px] font-bold uppercase tracking-wider text-text-soft mb-1">Actions</div>
        <div class="grid grid-cols-2 gap-2">
          <a :href="selectedImage.url" target="_blank" rel="noopener" class="btn-secondary py-2 text-xs flex justify-center items-center">
            Open Original
          </a>
          <button type="button" class="btn-secondary py-2 text-xs flex justify-center items-center gap-1.5" @click="downloadSingleImage(selectedImage)">
            <span v-html="ICON_SVG.download" />
            Download
          </button>
          <button
            v-if="canManageImage(selectedImage)"
            type="button"
            class="btn-danger py-2 text-xs col-span-2 flex justify-center items-center"
            @click="deleteImage(selectedImage)"
          >
            Delete Permanently
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
        <span class="text-xs font-bold text-text-main">selected</span>
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
            <option value="" disabled selected>Move to...</option>
            <option value="">Uncategorized</option>
            <option v-for="f in customFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
          </select>
        </div>

        <button type="button" class="btn-secondary h-8 py-1.5 px-3 text-xs" @click="bulkCopyUrls">
          Copy URLs
        </button>
        
        <button type="button" class="btn-secondary h-8 py-1.5 px-3 text-xs" @click="bulkDownloadSelected" title="Download as files">
          Download
        </button>

        <button type="button" class="btn-danger h-8 py-1.5 px-3 text-xs" @click="bulkDeleteSelected">
          Delete
        </button>
        
        <button type="button" class="btn-ghost h-8 px-2 text-xs font-bold text-text-muted hover:text-text-main" @click="clearSelection">
          Cancel
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
          <h4 class="text-xs font-bold uppercase tracking-wider text-text-soft">Folder: {{ mobileFolderMenuFolder.name }}</h4>
          <button class="text-text-muted hover:text-text-main p-1 font-bold text-xs" @click="mobileFolderMenuFolder = null">✕</button>
        </div>
        <div class="flex flex-col gap-2">
          <button
            v-if="canManageFolder(mobileFolderMenuFolder)"
            type="button"
            class="w-full text-left py-2.5 px-3 text-xs font-semibold text-text-main hover:bg-soft rounded-btn"
            @click="startMobileFolderRename"
          >
            Rename Folder
          </button>
          <button
            v-if="canManageFolder(mobileFolderMenuFolder)"
            type="button"
            class="w-full text-left py-2.5 px-3 text-xs font-semibold text-status-needs-fix-fg hover:bg-soft rounded-btn"
            @click="deleteFolder(mobileFolderMenuFolder.id); mobileFolderMenuFolder = null"
          >
            Delete Folder
          </button>
          <button
            type="button"
            class="w-full text-left py-2.5 px-3 text-xs font-semibold text-text-main hover:bg-soft rounded-btn"
            @click="copyFolderLink(mobileFolderMenuFolder.id); mobileFolderMenuFolder = null"
          >
            Copy Link
          </button>
          <button
            v-if="selectedImageKeys.length > 0"
            type="button"
            class="w-full text-left py-2.5 px-3 text-xs font-bold text-primary hover:bg-soft rounded-btn border-t border-border/40 mt-1"
            @click="bulkMoveToFolder(mobileFolderMenuFolder.id); mobileFolderMenuFolder = null"
          >
            Move Selected Images Here
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ CSV EXPORT MODAL ════════ -->
    <Modal
      :open="showExportModal"
      title="Export Folders to CSV"
      subtitle="Select folders and configure settings to export image URL orders."
      size="xl"
      @close="showExportModal = false"
    >
      <div class="space-y-3 text-[11px] text-text-main leading-tight">
        
        <!-- 2-Column Wide Grid Layout -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          <!-- LEFT SIDE: Folders Selection List (Takes 7 columns of 12) -->
          <div class="lg:col-span-7 flex flex-col gap-2.5 min-w-0">
            <div class="flex items-center justify-between border-b border-border/40 pb-1.5">
              <h3 class="text-[11px] font-bold text-text-soft uppercase tracking-wider">Select Folders</h3>
              <span class="text-text-muted font-mono text-[9px]">
                Showing {{ filteredExportFolders.length }} of {{ exportFoldersList.length }} folders
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
                  placeholder="Search folders by name..."
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
                Clear Selection
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
                  <span class="font-semibold">Select All</span>
                </label>
                
                <label class="flex items-center gap-1.5 cursor-pointer select-none text-text-main hover:text-text-main/80 transition-colors">
                  <input
                    type="checkbox"
                    v-model="exportImagesOnlyFilter"
                    class="rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer h-3 w-3"
                  />
                  <span class="font-semibold">With images only</span>
                </label>
              </div>

              <span class="text-primary font-bold text-[9px] uppercase tracking-wider bg-primary/10 px-1.5 py-0.25 rounded border border-primary/20">
                {{ selectedExportFolderIds.length }} Selected
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
                      <span>{{ folder.imageCount }} images</span>
                      <span class="text-text-muted/40">•</span>
                      <span>{{ folder.isVirtual ? 'N/A' : (folder.hasFeature ? 'Feature selected' : 'Feature missing') }}</span>
                      <span class="text-text-muted/40">•</span>
                      <span>{{ folder.orderedCount }} ordered</span>
                    </div>
                  </div>

                  <!-- Status Chip -->
                  <div class="shrink-0 flex items-center">
                    <span
                      v-if="folder.imageCount === 0"
                      class="px-1.5 py-0.25 rounded text-[7.5px] bg-status-needs-fix-bg/10 text-status-needs-fix-fg border border-status-needs-fix-bg/20 font-bold uppercase tracking-wide"
                    >
                      Empty
                    </span>
                    <span
                      v-else-if="!folder.isVirtual && !folder.hasFeature"
                      class="px-1.5 py-0.25 rounded text-[7.5px] bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-wide font-medium"
                    >
                      Missing feature image
                    </span>
                    <span
                      v-else
                      class="px-1.5 py-0.25 rounded text-[7.5px] bg-primary/10 text-primary border border-primary/20 font-bold uppercase tracking-wide"
                    >
                      Ready
                    </span>
                  </div>
                </label>
                
                <div v-if="filteredExportFolders.length === 0" class="p-6 text-center text-text-muted italic flex flex-col items-center justify-center h-[260px]">
                  <svg class="w-7 h-7 text-text-muted/30 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  No folders match search or filters.
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT SIDE: Summary, Options, and Warnings (Takes 5 columns of 12) -->
          <div class="lg:col-span-5 flex flex-col gap-2.5">
            
            <!-- Summary Section -->
            <div class="border border-border rounded-xl p-2 bg-soft/10 space-y-1.5">
              <h4 class="font-bold text-[8.5px] text-text-soft uppercase tracking-wider flex items-center justify-between">
                <span>Export Summary</span>
                <span class="w-1 h-1 rounded-full bg-primary"></span>
              </h4>
              
              <!-- Stat Grid -->
              <div class="grid grid-cols-2 gap-1">
                <!-- Selected Folders -->
                <div class="bg-card/40 border border-border/50 rounded-lg p-1.5 flex flex-col justify-between">
                  <span class="text-[7.5px] text-text-muted uppercase tracking-wider font-semibold">Selected folders</span>
                  <span class="text-xs font-extrabold text-text-main mt-0.5 leading-none">{{ selectedFoldersStats.count }}</span>
                </div>
                <!-- Ready Folders -->
                <div class="bg-card/40 border border-border/50 rounded-lg p-1.5 flex flex-col justify-between">
                  <span class="text-[7.5px] text-text-muted uppercase tracking-wider font-semibold">Ready folders</span>
                  <span class="text-xs font-extrabold text-primary mt-0.5 leading-none">{{ selectedFoldersStats.readyFoldersCount }}</span>
                </div>
                <!-- Empty Folders Skipped -->
                <div class="bg-card/40 border border-border/50 rounded-lg p-1.5 flex flex-col justify-between">
                  <span class="text-[7.5px] text-text-muted uppercase tracking-wider font-semibold">Empty skipped</span>
                  <span class="text-xs font-extrabold mt-0.5 leading-none" :class="selectedFoldersStats.skippedEmpty > 0 ? 'text-status-needs-fix-fg font-black' : 'text-text-muted'">
                    {{ selectedFoldersStats.skippedEmpty }}
                  </span>
                </div>
                <!-- Missing Feature -->
                <div class="bg-card/40 border border-border/50 rounded-lg p-1.5 flex flex-col justify-between">
                  <span class="text-[7.5px] text-text-muted uppercase tracking-wider font-semibold">Missing feature</span>
                  <span class="text-xs font-extrabold mt-0.5 leading-none" :class="selectedFoldersStats.missingFeature > 0 ? 'text-amber-500 font-black' : 'text-text-muted'">
                    {{ selectedFoldersStats.missingFeature }}
                  </span>
                </div>
              </div>

              <!-- Total Image URLs (Full Width Highlight) -->
              <div class="bg-primary/5 border border-primary/20 rounded-lg p-1.5 flex items-center justify-between">
                <div class="flex flex-col">
                  <span class="text-[7.5px] text-primary uppercase tracking-wider font-bold">Total Image URLs</span>
                  <span class="text-[8.5px] text-text-muted mt-0.5">URLs included in CSV</span>
                </div>
                <span class="text-sm font-black text-primary font-mono leading-none">{{ selectedFoldersStats.totalUrls }}</span>
              </div>
            </div>

            <!-- Options Section -->
            <div class="border border-border rounded-xl p-2 bg-soft/10 space-y-2 flex-1 flex flex-col justify-between">
              <div class="space-y-2">
                <h4 class="font-bold text-[8.5px] text-text-soft uppercase tracking-wider">Export Options</h4>
                
                <div class="space-y-2">
                  <!-- Option: Skip Empty -->
                  <label class="flex items-start gap-1.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      v-model="skipEmptyFolders"
                      class="rounded border-border text-primary focus:ring-primary/20 accent-primary mt-0.5 h-3 w-3 transition-colors animate-none"
                    />
                    <div>
                      <span class="font-semibold text-text-main text-[10px] block leading-tight group-hover:text-primary transition-colors">Skip empty folders</span>
                      <span class="text-[8.5px] text-text-muted block mt-0.25 leading-tight">Exclude folders with 0 images from CSV row generation.</span>
                    </div>
                  </label>
                  
                  <!-- Option: Include folders without feature image -->
                  <label class="flex items-start gap-1.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      v-model="includeNoFeatureFolders"
                      class="rounded border-border text-primary focus:ring-primary/20 accent-primary mt-0.5 h-3 w-3 transition-colors animate-none"
                    />
                    <div>
                      <span class="font-semibold text-text-main text-[10px] block leading-tight group-hover:text-primary transition-colors">Include folders without feature image</span>
                      <span class="text-[8.5px] text-text-muted block mt-0.25 leading-tight font-normal">Keep folders in export even if feature image is missing.</span>
                    </div>
                  </label>

                  <!-- Option: Include folder content fields -->
                  <label class="flex items-start gap-1.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      v-model="exportIncludeContentFields"
                      class="rounded border-border text-primary focus:ring-primary/20 accent-primary mt-0.5 h-3 w-3 transition-colors animate-none"
                    />
                    <div>
                      <span class="font-semibold text-text-main text-[10px] block leading-tight group-hover:text-primary transition-colors">Include folder content fields</span>
                      <span class="text-[8.5px] text-text-muted block mt-0.25 leading-tight">Export short description, description, and button URL.</span>
                    </div>
                  </label>

                  <hr class="border-border/40 my-1.5" />

                  <!-- Locked/Always-on features in premium representation -->
                  <div class="space-y-1 bg-card/20 p-1.5 rounded-lg border border-border/40">
                    <div class="text-[8px] text-text-soft font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                      <svg class="w-2.5 h-2.5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Locked Preset Configurations
                    </div>
                    
                    <div class="flex items-center justify-between text-[8.5px] text-text-muted">
                      <span class="font-medium">Use feature image first</span>
                      <span class="bg-primary/10 text-primary border border-primary/20 font-bold uppercase text-[7px] tracking-wider px-1 py-0.25 rounded">Always On</span>
                    </div>
                    <div class="flex items-center justify-between text-[8.5px] text-text-muted">
                      <span class="font-medium">Use saved gallery order</span>
                      <span class="bg-primary/10 text-primary border border-primary/20 font-bold uppercase text-[7px] tracking-wider px-1 py-0.25 rounded">Always On</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Warnings (Slim alert design) -->
        <div v-if="(selectedFoldersStats.missingFeature > 0 && includeNoFeatureFolders) || (selectedFoldersStats.emptyFolders > 0 && !skipEmptyFolders)" class="bg-status-needs-fix-bg/10 border border-status-needs-fix-bg/25 rounded-lg p-2 text-status-needs-fix-fg flex items-start gap-1.5 text-[10px]">
          <span class="text-xs leading-none mt-0.5">⚠️</span>
          <div class="flex-1 space-y-0.5">
            <div v-if="selectedFoldersStats.missingFeature > 0 && includeNoFeatureFolders">
              <strong>Missing feature image:</strong> {{ selectedFoldersStats.missingFeature }} folder(s) will be exported with the regular gallery image order first.
            </div>
            <div v-if="selectedFoldersStats.emptyFolders > 0 && !skipEmptyFolders">
              <strong>Empty folders included:</strong> {{ selectedFoldersStats.emptyFolders }} empty folder(s) will be exported with blank image lists.
            </div>
          </div>
        </div>

        <!-- Export Preview (Compact box, first 5 rows) -->
        <div v-if="selectedExportFolderIds.length > 0" class="space-y-1 border-t border-border/40 pt-2.5">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-[8.5px] text-text-soft uppercase tracking-wider">Export Preview (First 5 selected rows)</h4>
            <span class="text-[9px] text-text-muted">Interactive preview of compiled rows</span>
          </div>
          <div class="border border-border/60 rounded-xl bg-soft/5 overflow-hidden">
            <div class="max-h-[110px] overflow-y-auto">
              <table class="w-full text-[9.5px] text-left border-collapse">
                <thead>
                  <tr class="bg-soft/40 border-b border-border/80 font-bold text-text-soft sticky top-0 z-10">
                    <th class="p-1.5 pl-2.5">Folder Name</th>
                    <th class="p-1.5 text-center">Images</th>
                    <th class="p-1.5 text-center">Feature Image</th>
                    <th class="p-1.5 text-center">Export Status</th>
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
                        :class="row.status === 'Ready' || row.status === 'Ready (Empty)' ? 'bg-primary/10 text-primary' : row.status === 'Skipped' ? 'bg-soft text-text-muted' : 'bg-status-needs-fix-bg/10 text-status-needs-fix-fg'"
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
              ⚠️ Select at least one folder to export.
            </span>
            <span v-else-if="selectedFoldersStats.readyFoldersCount === 0" class="text-status-needs-fix-fg font-semibold flex items-center gap-1.5">
              ⚠️ No folders qualify for export under current filters.
            </span>
            <span v-else class="text-text-muted">
              Ready to export <strong class="text-text-main font-semibold">{{ selectedFoldersStats.readyFoldersCount }}</strong> folder(s) ({{ selectedFoldersStats.totalUrls }} URLs total).
            </span>
          </div>

          <div class="flex items-center gap-2 ml-auto">
            <button
              type="button"
              class="btn-ghost py-1 px-3.5 text-[11px] font-semibold h-8 rounded-lg transition-all"
              @click="showExportModal = false"
              :disabled="exportingCsv"
            >
              Cancel
            </button>
            
            <button
              type="button"
              class="btn-primary py-1 px-4 text-[11px] font-bold h-8 rounded-lg shadow-md flex items-center gap-1.5 hover:scale-[1.01] active:scale-[0.99] transition-all"
              @click="triggerCsvExport"
              :disabled="exportingCsv || selectedExportFolderIds.length === 0 || selectedFoldersStats.readyFoldersCount === 0"
            >
              <svg v-if="exportingCsv" class="animate-spin -ml-0.5 mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ exportingCsv ? 'Exporting...' : 'Export Selected CSV' }}
            </button>
          </div>
        </div>
      </template>
    </Modal>

    <!-- ════════ EDIT FOLDER INFO MODAL ════════ -->
    <Modal
      :open="showEditFolderInfoModal"
      title="Edit Folder Info"
      subtitle="Modify folder name and configure product description details."
      size="md"
      @close="showEditFolderInfoModal = false"
    >
      <div class="space-y-4 text-xs">
        <!-- Error Message -->
        <div v-if="editFolderError" class="p-2.5 bg-status-needs-fix-bg/15 border border-status-needs-fix-bg/50 rounded-xl text-status-needs-fix-fg font-semibold flex items-center gap-1.5">
          <span>⚠️</span>
          <span>{{ editFolderError }}</span>
        </div>

        <!-- Folder Name -->
        <div class="space-y-1">
          <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">Folder Name</label>
          <input
            type="text"
            v-model="editFolderName"
            placeholder="Folder Name"
            class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
        </div>

        <!-- Short Description -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">Short Description</label>
            <span class="text-[10px] text-text-muted font-mono font-medium">{{ editFolderShortDescription.length }} characters (limit: 160–300)</span>
          </div>
          <textarea
            v-model="editFolderShortDescription"
            placeholder="Compact mini excavator built for tight job sites..."
            rows="3"
            class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Description -->
        <div class="space-y-1">
          <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">Description</label>
          <textarea
            v-model="editFolderDescription"
            placeholder="A longer product description explaining the machine, usage, benefits, and important details..."
            rows="5"
            class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          ></textarea>
        </div>

        <!-- Button URL -->
        <div class="space-y-1">
          <label class="block font-bold text-text-soft uppercase tracking-wider text-[10px]">Button URL</label>
          <input
            type="text"
            v-model="editFolderButtonUrl"
            placeholder="https://example.com/product-page"
            class="w-full px-3 py-2 bg-soft/20 border border-border rounded-xl text-xs text-text-main focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-colors"
          />
          <span class="text-[10px] text-text-muted block mt-0.5 font-normal">Optional. Will automatically format missing protocol to https://</span>
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
            Cancel
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
            {{ savingFolderInfo ? 'Saving...' : 'Save Folder Info' }}
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
          <span class="text-xs font-bold text-text-main">Upload Queue ({{ uploadingItems.filter(i => i.status !== 'success').length }})</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button 
            type="button" 
            class="text-[10px] text-text-muted hover:text-text-main font-semibold"
            @click="clearCompletedQueue"
          >
            Clear Done
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
              <div class="text-[9px] text-text-soft font-bold capitalize leading-none mt-0.5">{{ item.status }}</div>
            </div>
          </div>
          
          <div class="shrink-0 flex items-center gap-1.5">
            <span v-if="item.status === 'success'" class="text-primary font-bold">✓</span>
            <div v-else-if="item.status === 'failed'" class="flex gap-1">
              <button type="button" class="text-[10px] text-primary font-bold hover:underline" @click="retryUploadItem(item)">Retry</button>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { optimizeImage, formatFileSize } from '@/utils/imageOptimizer';
import Modal from '@/components/ui/Modal.vue';

const auth = useAuthStore();
const route = useRoute();

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
const filterMyUploads = ref(false);
const sortBy = ref('newest');

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

// ─── Folder Content Editing States ───────────────────────────────────────────
const showEditFolderInfoModal = ref(false);
const editingFolderObj = ref<CustomFolder | null>(null);
const editFolderName = ref('');
const editFolderShortDescription = ref('');
const editFolderDescription = ref('');
const editFolderButtonUrl = ref('');
const editFolderError = ref('');
const savingFolderInfo = ref(false);
const exportIncludeContentFields = ref(true);

const canEditFolderInfo = (folder: CustomFolder) => {
  if (auth.isQualityChecker) return false;
  if (auth.isAdmin || auth.isHeadOrSupervisor || auth.isAssistantHead) return true;
  return folder.created_by === auth.user?.id;
};

const hasFolderContent = (folder: CustomFolder) => {
  return !!(folder.short_description || folder.description || folder.button_url);
};

const validateAndFormatUrl = (url: string): { isValid: boolean; formattedUrl: string } => {
  if (!url || url.trim() === '') {
    return { isValid: true, formattedUrl: '' };
  }
  let target = url.trim();
  if (!/^https?:\/\//i.test(target)) {
    target = 'https://' + target;
  }
  try {
    const parsed = new URL(target);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return { isValid: false, formattedUrl: '' };
    }
    return { isValid: true, formattedUrl: target };
  } catch (e) {
    return { isValid: false, formattedUrl: '' };
  }
};

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
  
  const { isValid, formattedUrl } = validateAndFormatUrl(editFolderButtonUrl.value);
  if (!isValid) {
    editFolderError.value = 'Please enter a valid URL.';
    return;
  }
  
  savingFolderInfo.value = true;
  editFolderError.value = '';
  
  try {
    const folderId = editingFolderObj.value.id;
    const { error } = await supabase
      .from('team_folders')
      .update({
        name,
        short_description: editFolderShortDescription.value.trim() || null,
        description: editFolderDescription.value.trim() || null,
        button_url: formattedUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', folderId);
      
    if (error) throw error;
    
    // Update local state instantly
    const folderIndex = customFolders.value.findIndex(f => f.id === folderId);
    if (folderIndex !== -1) {
      customFolders.value[folderIndex] = {
        ...customFolders.value[folderIndex],
        name,
        short_description: editFolderShortDescription.value.trim() || null,
        description: editFolderDescription.value.trim() || null,
        button_url: formattedUrl || null,
        updated_at: new Date().toISOString()
      };
    }
    
    showToast('Folder info saved.');
    showEditFolderInfoModal.value = false;
  } catch (err) {
    console.error('[save-folder-info] Failed to save folder info:', err);
    showToast('Could not save folder info. Please try again.');
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
    let status = 'Ready';
    if (f.imageCount === 0) {
      status = skipEmptyFolders.value ? 'Skipped' : 'Ready (Empty)';
    } else if (!f.isVirtual && !f.hasFeature) {
      status = includeNoFeatureFolders.value ? 'Warning (No Feature)' : 'Skipped';
    }
    return {
      name: f.name,
      imageCount: f.imageCount,
      featureStatus: f.isVirtual ? 'N/A' : (f.hasFeature ? '✓ Yes' : '❌ Missing'),
      status
    };
  });
});

const getRowStatusText = (folder: any) => {
  if (folder.imageCount === 0) {
    return skipEmptyFolders.value ? 'Will be skipped' : 'Ready';
  }
  if (!folder.isVirtual && !folder.hasFeature) {
    return includeNoFeatureFolders.value ? 'Ready' : 'Will be skipped';
  }
  return 'Ready';
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
  
  if (currentFolder.value !== 'all' && currentFolder.value !== 'uncategorized') {
    const hasPermission = exportFoldersList.value.some(f => f.id === currentFolder.value);
    if (hasPermission) {
      selectedExportFolderIds.value = [currentFolder.value];
    }
  } else if (currentFolder.value === 'uncategorized') {
    const hasUncategorized = exportFoldersList.value.some(f => f.id === 'uncategorized');
    if (hasUncategorized) {
      selectedExportFolderIds.value = ['uncategorized'];
    }
  } else {
    selectedExportFolderIds.value = exportFoldersList.value.map(f => f.id);
  }
  showExportModal.value = true;
};

const escapeCSV = (val: string) => {
  if (val === null || val === undefined) return '""';
  const escaped = val.replace(/"/g, '""');
  return `"${escaped}"`;
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
  return `${baseName}.csv`;
};

const triggerCsvExport = async () => {
  if (selectedExportFolderIds.value.length === 0) {
    showToast('Select at least one folder to export.');
    return;
  }
  
  // Calculate if there are valid folders after skip rules
  if (selectedFoldersStats.value.readyFoldersCount === 0) {
    showToast('No valid folders to export after applying skip rules.');
    return;
  }
  
  exportingCsv.value = true;
  showToast('Preparing CSV export…');
  
  try {
    const realFolderIds = selectedExportFolderIds.value.filter(id => id !== 'uncategorized');
    let allImages: any[] = [];
    
    // Fetch custom folders' images
    if (realFolderIds.length > 0) {
      const { data, error } = await supabase
        .from('team_images')
        .select('id, url, folder_id, is_feature_image, sort_order')
        .in('folder_id', realFolderIds);
      if (error) throw error;
      allImages = [...allImages, ...(data || [])];
    }
    
    // Fetch uncategorized images if selected
    if (selectedExportFolderIds.value.includes('uncategorized')) {
      const { data, error } = await supabase
        .from('team_images')
        .select('id, url, folder_id, is_feature_image, sort_order')
        .is('folder_id', null);
      if (error) throw error;
      allImages = [...allImages, ...(data || [])];
    }
    
    let hasMissingUrls = false;
    const validImgs = allImages.filter(img => {
      if (!img.url) {
        console.warn(`[csv-export] Image ${img.id} is missing URL. Skipping.`);
        hasMissingUrls = true;
        return false;
      }
      return true;
    });
    
    if (hasMissingUrls) {
      showToast('Some images were skipped because they are missing URLs.');
    }
    
    const csvRows: {
      name: string;
      images: string;
      shortDescription: string;
      description: string;
      buttonUrl: string;
    }[] = [];
    
    selectedExportFolderIds.value.forEach(folderId => {
      let folderName = '';
      let imgs: any[] = [];
      let isVirtualFolder = false;
      let hasFeature = false;
      let shortDesc = '';
      let desc = '';
      let btnUrl = '';
      
      if (folderId === 'uncategorized') {
        folderName = 'Uncategorized';
        imgs = validImgs.filter(img => !img.folder_id);
        isVirtualFolder = true;
      } else {
        const folder = exportFoldersList.value.find(f => f.id === folderId);
        if (!folder) return;
        folderName = folder.name;
        imgs = validImgs.filter(img => img.folder_id === folderId);
        hasFeature = folder.hasFeature;
        
        const realFolderObj = customFolders.value.find(f => f.id === folderId);
        if (realFolderObj) {
          shortDesc = realFolderObj.short_description || '';
          desc = realFolderObj.description || '';
          btnUrl = realFolderObj.button_url || '';
        }
      }
      
      // Skip if empty and skip empty active
      if (imgs.length === 0 && skipEmptyFolders.value) {
        return;
      }
      
      // Skip if missing feature and includeNoFeatureFolders is false
      if (!isVirtualFolder && imgs.length > 0 && !hasFeature && !includeNoFeatureFolders.value) {
        return;
      }
      
      // Sort images: Feature first, then sort_order ascending
      imgs.sort((a, b) => {
        if (a.is_feature_image && !b.is_feature_image) return -1;
        if (!a.is_feature_image && b.is_feature_image) return 1;
        const orderA = a.sort_order === 9999 || a.sort_order === 0 || a.sort_order === null ? 999999 : a.sort_order;
        const orderB = b.sort_order === 9999 || b.sort_order === 0 || b.sort_order === null ? 999999 : b.sort_order;
        if (orderA !== orderB) return orderA - orderB;
        return a.id.localeCompare(b.id);
      });
      
      const uniqueUrls = [...new Set(imgs.map(img => img.url))];
      csvRows.push({
        name: folderName,
        images: uniqueUrls.join(', '),
        shortDescription: shortDesc,
        description: desc,
        buttonUrl: btnUrl
      });
    });
    
    if (csvRows.length === 0) {
      showToast('No valid images found for selected folders.');
      exportingCsv.value = false;
      return;
    }
    
    let header = 'Name,Images';
    let body = '';
    
    if (exportIncludeContentFields.value) {
      header = 'Name,Images,Short Description,Description,Button URL';
      body = csvRows.map(r => 
        `${escapeCSV(r.name)},${escapeCSV(r.images)},${escapeCSV(r.shortDescription)},${escapeCSV(r.description)},${escapeCSV(r.buttonUrl)}`
      ).join('\n');
    } else {
      body = csvRows.map(r => `${escapeCSV(r.name)},${escapeCSV(r.images)}`).join('\n');
    }
    
    const csvContent = '\ufeff' + header + '\n' + body;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', getExportFilename());
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV exported successfully.');
    showExportModal.value = false;
  } catch (err) {
    console.error('[csv-export] Export failed:', err);
    showToast('CSV export failed. Please try again.');
  } finally {
    exportingCsv.value = false;
  }
};

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
    showToast('Cannot preview this image.');
  }
};

// save ordering to DB
const saveOrganizeOrder = async () => {
  const allFolderImgs = library.value.filter(img => img.folderId === currentFolder.value);
  if (allFolderImgs.length === 0) {
    showToast('Folder must have at least one image.');
    return;
  }
  
  if (!featureImageId.value) {
    showToast('Please select a feature image first.');
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
      showToast('Failed to save image order.');
    } else {
      showToast('Image order saved.');
      isOrganizeMode.value = false;
      await loadLibraryFromDB();
    }
  } catch (err) {
    console.error('[images] save order error:', err);
    showToast('Failed to save image order.');
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
      .select('id, name, created_by, short_description, description, button_url, updated_at')
      .order('created_at', { ascending: true });
    
    if (!foldersErr && foldersData) {
      customFolders.value = foldersData;
    }

    // 2. Fetch images (joining profiles to get uploader full_name)
    const { data: imagesData, error: imagesErr } = await supabase
      .from('team_images')
      .select('id, url, name, folder_id, uploaded_by, created_at, source, file_type, file_size, file_size_bytes, width, height, storage_path, is_feature_image, sort_order, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (!imagesErr && imagesData) {
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

const subscribeRealtime = () => {
  if (!supabaseConfigured) return;
  foldersSubscription = supabase
    .channel('public:team_folders_dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_folders' }, () => {
      loadLibraryFromDB();
    })
    .subscribe();

  imagesSubscription = supabase
    .channel('public:team_images_dashboard')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_images' }, () => {
      loadLibraryFromDB();
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

const filteredFolders = computed(() => {
  const q = folderSearchQuery.value.trim().toLowerCase();
  if (!q) return customFolders.value;
  return customFolders.value.filter((f) => {
    return f.name.toLowerCase().includes(q) ||
           (f.short_description && f.short_description.toLowerCase().includes(q)) ||
           (f.description && f.description.toLowerCase().includes(q)) ||
           (f.button_url && f.button_url.toLowerCase().includes(q));
  });
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
  if (currentFolder.value === 'all') return 'All Library';
  if (currentFolder.value === 'uncategorized') return 'Uncategorized';
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
    showToast('Failed to create folder');
    console.error(error);
  } else {
    newFolderName.value = '';
    showNewFolderInput.value = false;
    if (data) {
      currentFolder.value = data.id;
      showToast(`Folder "${name}" created`);
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
    showToast('Failed to rename folder');
    console.error(error);
  } else {
    showToast('Folder renamed');
    loadLibraryFromDB();
  }
  editingFolderId.value = null;
};

const deleteFolder = async (folderId: string) => {
  if (!supabaseConfigured) return;
  const targetFolder = customFolders.value.find(f => f.id === folderId);
  if (!targetFolder) return;
  if (!canManageFolder(targetFolder)) {
    showToast('You do not have permission to delete this folder');
    return;
  }

  if (confirm(`Delete folder "${targetFolder.name}"? Organized images will be returned to "Uncategorized".`)) {
    const { error } = await supabase
      .from('team_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      showToast('Failed to delete folder');
      console.error(error);
    } else {
      if (currentFolder.value === folderId) {
        currentFolder.value = 'all';
      }
      showToast('Folder deleted');
      loadLibraryFromDB();
    }
  }
  closeFolderMenu();
};

const copyFolderLink = (folderId: string) => {
  const link = `${window.location.origin}${window.location.pathname}?folder=${folderId}`;
  navigator.clipboard.writeText(link).then(() => {
    showToast('Folder filter link copied');
  });
  closeFolderMenu();
};

const toggleFolderMenu = (folderId: string) => {
  if (activeFolderMenuId.value === folderId) {
    activeFolderMenuId.value = null;
  } else {
    activeFolderMenuId.value = folderId;
  }
};

const closeFolderMenu = () => {
  activeFolderMenuId.value = null;
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
    showToast('Failed to move image');
    console.error(error);
  } else {
    const targetName = folderId
      ? customFolders.value.find((f) => f.id === folderId)?.name || 'Folder'
      : 'Uncategorized';
    showToast(`Moved to ${targetName}`);
    loadLibraryFromDB();
  }
};

const startRenameImage = async (img: LibImage) => {
  if (!canManageImage(img)) {
    showToast('You do not have permission to rename this image');
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
    showToast('Failed to rename image');
    console.error(error);
  } else {
    showToast('Image renamed');
    loadLibraryFromDB();
  }
  renamingImageKey.value = null;
};

const deleteImage = async (img: LibImage) => {
  if (!supabaseConfigured) return;
  if (!canManageImage(img)) {
    showToast('You do not have permission to delete this image');
    return;
  }

  if (confirm(`Are you sure you want to permanently delete "${img.displayName}"?`)) {
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
        showToast('Failed to delete image');
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

      showToast('Image deleted');
      selectedImageKeys.value = selectedImageKeys.value.filter(k => k !== img.key);
      loadLibraryFromDB();
    } catch (e) {
      dbImages.value = origImages;
      libraryStats.value = origStats;
      console.error('[images] delete image failed', e);
      showToast('Error deleting image');
    }
  }
};

const copyUrl = async (img: LibImage) => {
  try {
    await navigator.clipboard.writeText(img.url);
    showToast('URL copied to clipboard');
  } catch {
    showToast('Could not copy');
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
    showToast('Downloading...');
    await downloadImageBlob(img.url, `${img.displayName}.${img.fileType.split('/')[1] || 'png'}`);
  } catch (err) {
    console.error('Download failed:', err);
    showToast('Download failed');
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
    showToast("You don't have permission to upload images");
    return;
  }

  // If pasting and no folder is selected (currentFolder.value is 'all')
  if (source === 'pasted_clipboard' && currentFolder.value === 'all') {
    showToast('Open a folder first before pasting images.');
    return;
  }

  // Validate files are images
  const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
  if (invalidFiles.length > 0) {
    showToast('Only image files can be uploaded.');
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
      displayName = `Pasted image`;
      showToast('Pasted image detected. Processing…');
    } else {
      showToast(`Uploading ${files.length === 1 ? 'image' : `${files.length} images`}...`);
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
    showToast('Please sign in to upload images');
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
      
      showToast('Image added to folder.');
      
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
    showToast('Image upload failed. Please try again.');
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
    showToast('You do not have permission to move the selected images');
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
    showToast('Bulk move failed');
    console.error(error);
  } else {
    const folderName = folderId ? customFolders.value.find(f => f.id === folderId)?.name || 'Folder' : 'Uncategorized';
    showToast(`Moved ${manageableKeys.length} images to "${folderName}"`);
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
      showToast(`${selectedImageKeys.value.length} URLs copied to clipboard`);
      clearSelection();
    });
  }
};

const bulkDownloadSelected = async () => {
  if (selectedImageKeys.value.length === 0) return;
  showToast(`Starting parallel download of ${selectedImageKeys.value.length} files...`);
  
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
  showToast('Download batch finished.');
  clearSelection();
};

const bulkDeleteSelected = async () => {
  if (!supabaseConfigured || selectedImageKeys.value.length === 0) return;

  const manageableKeys = selectedImageKeys.value.filter((k) => {
    const img = library.value.find(i => i.key === k);
    return img ? canManageImage(img) : false;
  });

  if (manageableKeys.length === 0) {
    showToast('You do not have permission to delete any of the selected images');
    return;
  }

  if (confirm(`Permanently delete ${manageableKeys.length} selected images? (Skipping ${selectedImageKeys.value.length - manageableKeys.length} unowned images)`)) {
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
      showToast('Bulk delete failed');
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

    showToast(`Deleted ${manageableKeys.length} images.`);
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
});

onUnmounted(() => {
  if (foldersSubscription) foldersSubscription.unsubscribe();
  if (imagesSubscription) imagesSubscription.unsubscribe();
  window.removeEventListener('paste', onGlobalPaste);
  window.removeEventListener('keydown', handleKeydown);
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
  color: #fff;
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
  border-radius: 9999px; /* rounded-full */
  font-size: 0.75rem; /* text-xs */
  font-weight: 600; /* font-semibold */
  cursor: pointer;
  user-select: none;
  flex-shrink: 0;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
  height: 2.25rem; /* Consistent row height on mobile */
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
    padding: 0 0.125rem 0 0.375rem; /* Tighter padding to extend content close to scrollbar */
    border-radius: 6px; /* rounded-btn */
    background-color: transparent;
    height: 2rem; /* Consistent row height on desktop */
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
    overflow-y: auto !important;
    max-height: 480px;
    scrollbar-gutter: stable;
    padding-right: 2px; /* Reduced right padding so content naturally extends close to the edge */
    margin-right: -4px; /* Pull container closer to the sidebar edge */
    padding-left: 2px;
    scrollbar-width: thin;
    scrollbar-color: var(--primary) #2C2C2F;
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
</style>
