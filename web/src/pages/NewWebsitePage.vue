<template>
  <div class="nw-page">
    <!-- Header -->
    <PageHeader
      :title="isEdit ? $t('websites.editWebsiteTitle') : (mode === 'existing' ? $t('websites.addNewWebsite') : $t('websites.newWebsiteTitle'))"
      :subtitle="isEdit ? $t('websites.updateSavedDetails') : (mode === 'existing' ? $t('websites.addExistingDesc') : $t('websites.newDesc'))"
    >
      <template #actions>
        <RouterLink :to="isEdit ? '/websites/my' : (auth.isAdmin ? '/websites/my' : '/my-dashboard')" class="btn-secondary">{{ $t('common.cancel') }}</RouterLink>
      </template>
    </PageHeader>

    <!-- Read-only Alert Banner -->
    <div v-if="auth.isViewer" class="rounded-card border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
      <strong>{{ $t('websites.viewOnlyMode') }}</strong> {{ $t('websites.viewOnlyModeDesc') }}
    </div>

    <!-- Mode switcher (only on create, not edit) -->
    <div v-if="!isEdit" class="nw-mode-tabs">
      <button
        class="nw-mode-tab"
        :class="{ 'nw-mode-tab--active': mode === 'new' }"
        type="button"
        @click="mode = 'new'"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
        {{ $t('websites.newWebsiteTitle') }}
      </button>
      <button
        class="nw-mode-tab"
        :class="{ 'nw-mode-tab--active': mode === 'existing' }"
        type="button"
        @click="mode = 'existing'"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>
        {{ $t('websites.existingWebsite') }}
      </button>
    </div>

    <LoadingBlock v-if="isEdit && loadingExisting" :loading="true" :error="null" />

    <!-- ── EXISTING WEBSITE simple form ── -->
    <template v-else-if="mode === 'existing' && !isEdit">
      <fieldset :disabled="auth.isViewer" class="nw-ex-wrap" style="border: none; padding: 0; margin: 0; display: contents;">

        <!-- Identity card -->
        <div class="nw-ex-card">
          <div class="nw-ex-card-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>
            {{ $t('websites.websiteDetails') }}
          </div>

          <div class="nw-ex-fields">
            <!-- Name -->
            <div class="nw-field" :class="{ 'nw-field--error': exErrors.name }">
              <label class="nw-label">{{ $t('websites.websiteName') }} <span class="nw-req">*</span></label>
              <input
                v-model="exModel.name"
                class="input"
                type="text"
                :placeholder="$t('websites.websiteNamePlaceholder')"
                @input="delete exErrors.name"
              />
              <span v-if="exErrors.name" class="nw-error-msg">{{ exErrors.name }}</span>
            </div>

            <!-- Domain -->
            <div class="nw-field" :class="{ 'nw-field--error': exErrors.domain }">
              <label class="nw-label">{{ $t('websites.domainUrl') }} <span class="nw-req">*</span></label>
              <input
                v-model="exModel.domain"
                class="input"
                type="text"
                :placeholder="$t('websites.domainUrlPlaceholder')"
                @input="onExDomainInput"
              />
              <span v-if="exErrors.domain" class="nw-error-msg">{{ exErrors.domain }}</span>
            </div>
            <!-- Platform selection dropdown -->
            <div class="nw-field">
              <label class="nw-label">{{ $t('websites.platformLabel') }}</label>
              <select v-model="exModel.platformType" class="input">
                <option value="wordpress">{{ $t('websites.wordpress') }}</option>
                <option value="framework">{{ $t('websites.framework') }}</option>
                <option value="unknown">{{ $t('performance.unknown') }}</option>
              </select>
              <p class="nw-hint">{{ $t('websites.choosePlatformDesc') }}</p>
            </div>
          </div>
        </div>

        <!-- Favicon card -->
        <div class="nw-ex-card nw-ex-card--favicon">
          <div class="nw-ex-card-label">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h4"/></svg>
            {{ $t('Favicon') }}
            <span class="nw-optional-pill">{{ $t('common.optional') }}</span>
          </div>
          <FaviconPicker v-model="exModel.faviconUrl" :domain="exModel.domain" />
        </div>

        <!-- Info notice -->
        <div class="nw-ex-notice">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          <span>{{ $t('websites.defaultDesignDesc') }}</span>
        </div>
      </fieldset>

      <!-- Actions -->
      <div class="nw-footer">
        <div class="nw-footer-left">
          <RouterLink :to="auth.isAdmin ? '/websites/my' : '/my-dashboard'" class="btn-secondary">{{ $t('common.cancel') }}</RouterLink>
        </div>
        <div class="nw-footer-right">
          <button class="btn-primary nw-submit-btn" type="button" :disabled="!!exSaving || auth.isViewer" @click="submitExisting">
            <svg v-if="!exSaving" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            {{ exSaving ? $t('websites.saving') : $t('websites.saveWebsite') }}
          </button>
        </div>
      </div>

      <div v-if="data.errors.websites" class="nw-save-error">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ data.errors.websites }}
      </div>

      <Transition name="toast">
        <div v-if="showToast" class="nw-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {{ toastMsg }}
        </div>
      </Transition>
    </template>

    <template v-else>
      <!-- Step progress -->
      <div class="nw-steps">
        <button
          v-for="(step, i) in steps"
          :key="step.key"
          class="nw-step"
          :class="{
            'nw-step--active': currentStep === i,
            'nw-step--done': currentStep > i,
            'nw-step--error': stepHasErrors(i)
          }"
          type="button"
          @click="goToStep(i)"
        >
          <span class="nw-step-num">
            <svg v-if="currentStep > i && !stepHasErrors(i)" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span class="nw-step-label">{{ step.label }}</span>
        </button>
      </div>

      <!-- Step content -->
      <fieldset :disabled="auth.isViewer" class="nw-body" style="border: none; padding: 0; margin: 0; display: contents;">

        <!-- ─ STEP 0: Basic Info ─ -->
        <div v-show="currentStep === 0" class="nw-section">
          <div class="nw-section-head">
            <div class="nw-section-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>
            </div>
            <div>
              <h2 class="nw-section-title">{{ $t('websites.basicInfo') }}</h2>
              <p class="nw-section-sub">{{ $t('websites.basicInfoDesc') }}</p>
            </div>
          </div>

          <div class="nw-grid-2">
            <div class="nw-field" :class="{ 'nw-field--error': errors.name }">
              <label class="nw-label">{{ $t('websites.websiteName') }} <span class="nw-req">*</span></label>
              <input v-model="model.name" class="input" type="text" :placeholder="$t('websites.websiteNamePlaceholder')" @input="clearError('name')" />
              <span v-if="errors.name" class="nw-error-msg">{{ errors.name }}</span>
            </div>
            <div class="nw-field" :class="{ 'nw-field--error': errors.domain }">
              <label class="nw-label">{{ $t('websites.domainUrl') }} <span class="nw-req">*</span></label>
              <input v-model="model.domain" class="input" type="text" :placeholder="$t('websites.domainUrlPlaceholder')" @input="onNwDomainInput" />
              <span v-if="errors.domain" class="nw-error-msg">{{ errors.domain }}</span>
            </div>
            <div class="nw-field" :class="{ 'nw-field--error': errors.websiteType }">
              <label class="nw-label">{{ $t('websites.type') }} <span class="nw-req">*</span></label>
              <select v-model="model.websiteType" class="input" @change="clearError('websiteType')">
                <option value="">— {{ $t('websites.platformPlaceholder') }} —</option>
                <option value="ecommerce">{{ $t('websites.normalEcommerce') }}</option>
                <option value="landing">{{ $t('websites.productLanding') }}</option>
                <option value="catalog">{{ $t('websites.catalogWebsite') }}</option>
                <option value="blog">{{ $t('websites.blogGuide') }}</option>
                <option value="service">{{ $t('websites.serviceWebsite') }}</option>
                <option value="brand">{{ $t('websites.brandWebsite') }}</option>
              </select>
              <span v-if="errors.websiteType" class="nw-error-msg">{{ errors.websiteType }}</span>
            </div>
            <div class="nw-field">
              <label class="nw-label">{{ $t('websites.industry') }}</label>
              <input v-model="model.industry" class="input" type="text" :placeholder="$t('Machinery, Fashion, Tech…')" />
              <p class="nw-hint">{{ $t('websites.industryDesc') }}</p>
            </div>
          </div>

          <div class="nw-field nw-field--full">
            <label class="nw-label">{{ $t('websites.targetAudience') }}</label>
            <input v-model="model.targetAudience" class="input" type="text" :placeholder="$t('Young professionals aged 25–40 looking for…')" />
            <p class="nw-hint">{{ $t('websites.targetAudienceDesc') }}</p>
          </div>

          <div class="nw-field nw-field--full">
            <label class="nw-label">{{ $t('websites.websiteGoal') }}</label>
            <textarea v-model="model.websiteGoal" class="input" rows="3" :placeholder="$t('The goal of this website is to sell premium skincare products directly to consumers via a clean, fast online store.')" />
            <p class="nw-hint">{{ $t('websites.websiteGoalDesc') }}</p>
          </div>

          <div class="nw-grid-2">
            <div class="nw-field">
              <label class="nw-label">{{ $t('common.status') }}</label>
              <select v-model="model.status" class="input">
                <option value="in_development">{{ $t('common.statuses.in_development') }}</option>
                <option value="active">{{ $t('common.statuses.active') }}</option>
                <option value="inactive">{{ $t('common.statuses.inactive') }}</option>
              </select>
            </div>
            <div class="nw-field">
              <label class="nw-label">{{ $t('websites.platformLabel') }}</label>
              <select v-model="model.platformType" class="input" @change="model.isFramework = model.platformType === 'framework'">
                <option value="wordpress">{{ $t('websites.wordpress') }}</option>
                <option value="framework">{{ $t('websites.framework') }}</option>
                <option value="unknown">{{ $t('performance.unknown') }}</option>
              </select>
              <p class="nw-hint">{{ $t('websites.choosePlatformDesc') }}</p>
            </div>
            <div v-if="auth.isAdmin" class="nw-field">
              <label class="nw-label">{{ $t('websites.assignedMember') }}</label>
              <select v-model="model.createdBy" class="input">
                <option value="">— {{ $t('qualityCheck.unassigned') }} —</option>
                <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.fullName || m.email }}</option>
              </select>
              <p class="nw-hint">{{ $t('websites.assigneeDesc') }}</p>
            </div>
          </div>

          <div class="nw-field nw-field--full">
            <label class="nw-label">{{ $t('Favicon') }} <span class="nw-optional-tag">{{ $t('common.optional') }}</span></label>
            <FaviconPicker v-model="model.faviconUrl" :domain="model.domain" />
          </div>
        </div>

        <!-- ─ STEP 1: Brand & Design ─ -->
        <div v-show="currentStep === 1" class="nw-section">
          <div class="nw-section-head">
            <div class="nw-section-icon nw-section-icon--design">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="13" r="2.5"/><circle cx="6.5" cy="13" r="2.5"/><circle cx="13.5" cy="19.5" r="2.5"/><path d="M13.5 9v2M11 7.5l1.5 1.5M16 7.5l-1.5 1.5M19 10.5l-1.5 2M13.5 17v-2M11 15.5l1.5-1.5M16 15.5l-1.5-1.5M8.5 10.5l1.5 2"/></svg>
            </div>
            <div>
              <h2 class="nw-section-title">{{ $t('websites.design') }}</h2>
              <p class="nw-section-sub">{{ $t('websites.designDesc') }}</p>
            </div>
          </div>

          <div class="nw-color-grid">
            <div class="nw-colorfield" :class="{ 'nw-field--error': errors.primaryColor }">
              <label class="nw-label">{{ $t('websites.primaryColor') }} <span class="nw-req">*</span></label>
              <div class="nw-color-row">
                <input v-model="model.primaryColor" class="nw-color-picker" type="color" @input="clearError('primaryColor')" />
                <input v-model="model.primaryColor" class="input nw-color-text" type="text" :placeholder="$t('#15D6C2')" @input="clearError('primaryColor')" />
              </div>
              <span v-if="errors.primaryColor" class="nw-error-msg">{{ errors.primaryColor }}</span>
            </div>
            <div class="nw-colorfield">
              <label class="nw-label">{{ $t('websites.secondaryColor') }}</label>
              <div class="nw-color-row">
                <input v-model="model.secondaryColor" class="nw-color-picker" type="color" />
                <input v-model="model.secondaryColor" class="input nw-color-text" type="text" :placeholder="$t('#0f172a')" />
              </div>
            </div>
            <div class="nw-colorfield">
              <label class="nw-label">{{ $t('websites.backgroundColor') }}</label>
              <div class="nw-color-row">
                <input v-model="model.backgroundColor" class="nw-color-picker" type="color" />
                <input v-model="model.backgroundColor" class="input nw-color-text" type="text" :placeholder="$t('#fbfbfb')" />
              </div>
            </div>
          </div>

          <div class="nw-divider" />

          <div class="nw-grid-2">
            <div class="nw-field" :class="{ 'nw-field--error': errors.fontFamily }">
              <label class="nw-label">{{ $t('websites.fontFamily') }} <span class="nw-req">*</span></label>
              <input v-model="model.fontFamily" class="input" type="text" :placeholder="$t('Inter')" @input="clearError('fontFamily')" />
              <p class="nw-hint">{{ $t('websites.fontFamilyDesc') }}</p>
              <span v-if="errors.fontFamily" class="nw-error-msg">{{ errors.fontFamily }}</span>
            </div>
            <div class="nw-field">
              <label class="nw-label">{{ $t('websites.buttonFontFamily') }}</label>
              <input v-model="model.buttonFontFamily" class="input" type="text" :placeholder="$t('Inter')" />
              <p class="nw-hint">{{ $t('websites.buttonFontFamilyDesc') }}</p>
            </div>
            <div class="nw-field" :class="{ 'nw-field--error': errors.maxWidth }">
              <label class="nw-label">{{ $t('websites.maxWidth') }} <span class="nw-req">*</span></label>
              <input v-model="model.maxWidth" class="input" type="text" :placeholder="$t('1200px')" @input="clearError('maxWidth')" />
              <p class="nw-hint">{{ $t('websites.maxWidthDesc') }}</p>
              <span v-if="errors.maxWidth" class="nw-error-msg">{{ errors.maxWidth }}</span>
            </div>
            <div class="nw-field">
              <label class="nw-label">{{ $t('websites.borderRadius') }}</label>
              <input v-model="model.borderRadius" class="input" type="text" :placeholder="$t('12px')" />
              <p class="nw-hint">{{ $t('websites.borderRadiusDesc') }}</p>
            </div>
          </div>

          <div class="nw-field nw-field--full">
            <label class="nw-label">{{ $t('websites.designStyleNotes') }}</label>
            <textarea v-model="model.designStyleNotes" class="input" rows="3" :placeholder="$t('Clean, minimal, modern. Uses soft shadows. No heavy gradients.')" />
            <p class="nw-hint">{{ $t('websites.designStyleNotesDesc') }}</p>
          </div>
        </div>

        <!-- ─ STEP 2: Contact Info ─ -->
        <div v-show="currentStep === 2" class="nw-section">
          <div class="nw-section-head">
            <div class="nw-section-icon nw-section-icon--contact">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.39 2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/></svg>
            </div>
            <div>
              <h2 class="nw-section-title">{{ $t('websites.contact') }}</h2>
              <p class="nw-section-sub">{{ $t('websites.contactDesc') }}</p>
            </div>
          </div>

          <div class="nw-grid-2">
            <div class="nw-field">
              <label class="nw-label">{{ $t('websites.phoneNumber') }}</label>
              <input v-model="model.phoneNumber" class="input" type="text" placeholder="+1 555 123 4567" />
            </div>
            <div class="nw-field">
              <label class="nw-label">{{ $t('settings.email') }}</label>
              <input v-model="model.email" class="input" type="email" placeholder="hello@acme.com" />
            </div>
          </div>

          <div class="nw-field nw-field--full">
            <label class="nw-label">{{ $t('websites.businessAddress') }}</label>
            <textarea v-model="model.businessAddress" class="input" rows="2" :placeholder="$t('123 Main Street, New York, NY 10001')" />
          </div>

          <div class="nw-divider" />
          <p class="nw-subsection-title">{{ $t('Social Media') }}</p>

          <div class="nw-grid-2">
            <div class="nw-field">
              <label class="nw-label">{{ $t('websites.whatsappLink') }}</label>
              <input v-model="model.whatsappLink" class="input" type="url" placeholder="https://wa.me/1234567890" />
            </div>
            <div class="nw-field">
              <label class="nw-label">{{ $t('Facebook') }}</label>
              <input v-model="model.facebookLink" class="input" type="url" placeholder="https://facebook.com/acme" />
            </div>
            <div class="nw-field">
              <label class="nw-label">{{ $t('Instagram') }}</label>
              <input v-model="model.instagramLink" class="input" type="url" placeholder="https://instagram.com/acme" />
            </div>
            <div class="nw-field">
              <label class="nw-label">{{ $t('YouTube') }}</label>
              <input v-model="model.youtubeLink" class="input" type="url" placeholder="https://youtube.com/@acme" />
            </div>
          </div>

          <div class="nw-field nw-field--full">
            <label class="nw-label">{{ $t('websites.otherSocialLinks') }}</label>
            <textarea v-model="model.otherSocialLinks" class="input" rows="3" placeholder="TikTok: https://tiktok.com/@acme&#10;LinkedIn: https://linkedin.com/company/acme" />
            <p class="nw-hint">{{ $t('websites.otherSocialLinksDesc') }}</p>
          </div>
        </div>

        <!-- ─ STEP 3: Product Docs ─ -->
        <div v-show="currentStep === 3" class="nw-section">
          <div class="nw-section-head">
            <div class="nw-section-icon nw-section-icon--docs">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            </div>
            <div>
              <h2 class="nw-section-title">{{ $t('websites.productDocs') }} <span class="nw-optional-tag">{{ $t('common.optional') }}</span></h2>
              <p class="nw-section-sub">{{ $t('websites.productDocsDesc') }}</p>
            </div>
          </div>

          <!-- Search + Filter -->
          <div class="nw-docs-toolbar">
            <div class="nw-docs-search-wrap">
              <svg class="nw-docs-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input
                v-model="docsSearch"
                class="nw-docs-search"
                type="text"
                :placeholder="$t('websites.searchDocsPlaceholder')"
              />
            </div>
            <select v-model="docsFilterFolder" class="nw-docs-folder-filter">
              <option value="">{{ $t('websites.allFolders') }}</option>
              <option v-for="f in data.docsFolders" :key="f.id" :value="f.id">{{ f.name }}</option>
            </select>
          </div>

          <!-- Selected docs chips -->
          <div v-if="selectedDocIds.length > 0" class="nw-docs-selected">
            <span class="nw-docs-selected-label">{{ $t('websites.selectedDocs', { count: selectedDocIds.length }) }}</span>
            <div class="nw-docs-chips">
              <div
                v-for="docId in selectedDocIds"
                :key="docId"
                class="nw-doc-chip"
              >
                <span>{{ docById(docId)?.title || docId }}</span>
                <button type="button" class="nw-doc-chip-remove" @click="toggleDoc(docId)">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Doc cards grid -->
          <div v-if="filteredDocs.length > 0" class="nw-docs-grid">
            <button
              v-for="doc in filteredDocs"
              :key="doc.id"
              type="button"
              class="nw-doc-card"
              :class="{ 'nw-doc-card--selected': selectedDocIds.includes(doc.id) }"
              @click="toggleDoc(doc.id)"
            >
              <div class="nw-doc-card-top">
                <div class="nw-doc-check">
                  <svg v-if="selectedDocIds.includes(doc.id)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </div>
                <span class="nw-doc-type-badge">{{ docTypeLabel(doc.type) }}</span>
              </div>
              <div class="nw-doc-card-title">{{ doc.title }}</div>
              <div class="nw-doc-card-folder">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                {{ folderNameForDoc(doc) }}
              </div>
              <div v-if="doc.description" class="nw-doc-card-desc">{{ doc.description }}</div>
            </button>
          </div>

          <div v-else class="nw-docs-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p>{{ docsSearch || docsFilterFolder ? $t('websites.noDocsMatchSearch') : $t('websites.noDocsFoundDesc') }}</p>
          </div>
        </div>

        <!-- ─ STEP 4: Review ─ -->
        <div v-show="currentStep === 4" class="nw-section">
          <div class="nw-section-head">
            <div class="nw-section-icon nw-section-icon--review">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            </div>
            <div>
              <h2 class="nw-section-title">{{ $t('websites.reviewSubmit') }}</h2>
              <p class="nw-section-sub">{{ $t('websites.reviewSubmitDesc') }}</p>
            </div>
          </div>

          <!-- Review cards -->
          <div class="nw-review-grid">
            <div class="nw-review-card">
              <div class="nw-review-card-title">{{ $t('websites.basicInfo') }}</div>
              <div class="nw-review-row"><span>{{ $t('websites.websiteName') }}</span><strong>{{ model.name || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('Domain') }}</span><strong>{{ model.domain || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('websites.type') }}</span><strong>{{ websiteTypeLabel(model.websiteType) || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('websites.platform') }}</span><strong>{{ model.platformType === 'wordpress' ? 'WordPress' : (model.platformType === 'framework' ? 'Framework' : 'Unknown') }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('websites.assignedMember') }}</span><strong>{{ creatorName(model) || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('websites.industry') }}</span><strong>{{ model.industry || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('websites.status') }}</span><strong>{{ model.status }}</strong></div>
            </div>

            <div class="nw-review-card">
              <div class="nw-review-card-title">{{ $t('websites.design') }}</div>
              <div class="nw-review-row">
                <span>{{ $t('websites.primaryColor') }}</span>
                <strong class="nw-review-color">
                  <span class="nw-color-swatch" :style="{ background: model.primaryColor }" />
                  {{ model.primaryColor }}
                </strong>
              </div>
              <div class="nw-review-row">
                <span>{{ $t('websites.secondaryColor') }}</span>
                <strong class="nw-review-color">
                  <span class="nw-color-swatch" :style="{ background: model.secondaryColor }" />
                  {{ model.secondaryColor }}
                </strong>
              </div>
              <div class="nw-review-row">
                <span>{{ $t('websites.backgroundColor') }}</span>
                <strong class="nw-review-color">
                  <span class="nw-color-swatch" :style="{ background: model.backgroundColor }" />
                  {{ model.backgroundColor }}
                </strong>
              </div>
              <div class="nw-review-row"><span>{{ $t('websites.fontFamily') }}</span><strong>{{ model.fontFamily || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('websites.maxWidth') }}</span><strong>{{ model.maxWidth || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('websites.borderRadius') }}</span><strong>{{ model.borderRadius || '—' }}</strong></div>
            </div>

            <div class="nw-review-card">
              <div class="nw-review-card-title">{{ $t('websites.contact') }}</div>
              <div class="nw-review-row"><span>{{ $t('websites.phoneNumber') }}</span><strong>{{ model.phoneNumber || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('settings.email') }}</span><strong>{{ model.email || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('WhatsApp') }}</span><strong>{{ model.whatsappLink || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('Facebook') }}</span><strong>{{ model.facebookLink || '—' }}</strong></div>
              <div class="nw-review-row"><span>{{ $t('Instagram') }}</span><strong>{{ model.instagramLink || '—' }}</strong></div>
            </div>

            <div class="nw-review-card nw-review-card--products">
              <div class="nw-review-card-title">{{ $t('websites.productDocs') }}</div>
              <div v-if="selectedDocIds.length === 0" class="nw-review-none">{{ $t('websites.noDocsMatchSearch') }}</div>
              <div v-else>
                <div v-for="docId in selectedDocIds" :key="docId" class="nw-review-product">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  {{ docById(docId)?.title || docId }}
                  <span class="nw-review-doc-folder">· {{ folderNameForDoc(docById(docId) ?? { folderId: null }) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Validation summary -->
          <div v-if="Object.keys(errors).length > 0" class="nw-validation-summary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <div>
              <p class="nw-validation-title">{{ $t('websites.pleaseFixIssues') }}</p>
              <ul>
                <li v-for="(msg, field) in errors" :key="field">{{ msg }}</li>
              </ul>
            </div>
          </div>
        </div>
      </fieldset>

      <!-- Bottom nav -->
      <div class="nw-footer">
        <div class="nw-footer-left">
          <button v-if="currentStep > 0" class="btn-secondary" type="button" @click="prevStep">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
            {{ $t('websites.back') }}
          </button>
        </div>
        <div class="nw-footer-right">
          <button class="btn-secondary" type="button" :disabled="!!saving || auth.isViewer" @click="saveDraft">
            {{ saving === 'draft' ? $t('websites.saving') : $t('settings.saveDraft') }}
          </button>
          <button v-if="currentStep < steps.length - 1" class="btn-primary" type="button" @click="nextStep">
            {{ $t('pageIndexing.next') }}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
          <button v-else class="btn-primary nw-submit-btn" type="button" :disabled="!!saving || auth.isViewer" @click="submit">
            <svg v-if="!saving" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            {{ saving === 'submit' ? $t('websites.creating') : (isEdit ? $t('websites.saveChanges') : $t('websites.createWebsite')) }}
          </button>
        </div>
      </div>

      <!-- Global save error -->
      <div v-if="data.errors.websites" class="nw-save-error">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        {{ data.errors.websites }}
      </div>

      <!-- Success toast -->
      <Transition name="toast">
        <div v-if="showToast" class="nw-toast">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {{ toastMsg }}
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import { useDataStore, type Website, type DocsFileType } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import FaviconPicker from '@/components/ui/FaviconPicker.vue';

const { t } = useI18n();
const data   = useDataStore();
const auth   = useAuthStore();
const route  = useRoute();
const router = useRouter();

const editId  = computed(() => (typeof route.params.id === 'string' ? route.params.id : undefined));
const isEdit  = computed(() => !!editId.value);

// ── Mode: 'new' = full form, 'existing' = quick form ─────────────────────────
const mode = ref<'new' | 'existing'>('new');

// ── Existing-website quick form ───────────────────────────────────────────────
interface ExModel { name: string; domain: string; faviconUrl: string; platformType: 'wordpress' | 'framework' | 'unknown'; }
const exModel   = reactive<ExModel>({ name: '', domain: '', faviconUrl: '', platformType: 'unknown' });
const exErrors  = reactive<Record<string, string>>({});
const exSaving  = ref(false);

const validateDomain = (val: string) => {
  const v = val.trim();
  if (!v) return false;
  try { new URL(v.startsWith('http') ? v : `https://${v}`); return true; } catch { return false; }
};

const validateExisting = (): boolean => {
  Object.keys(exErrors).forEach((k) => delete exErrors[k]);
  if (!exModel.name.trim())        exErrors.name   = t('websites.errors.nameRequired');
  if (!exModel.domain.trim())      exErrors.domain = t('websites.errors.domainRequired');
  else if (!validateDomain(exModel.domain)) exErrors.domain = t('websites.errors.domainInvalid');
  return Object.keys(exErrors).length === 0;
};

const onExDomainInput = () => { delete exErrors.domain; };
const onNwDomainInput = () => { clearError('domain'); };

const submitExisting = async () => {
  if (auth.isViewer) return;
  if (!validateExisting()) return;
  exSaving.value = true;

  const domain = exModel.domain.trim();
  const website: Website = {
    id: '',
    name: exModel.name.trim(),
    domain: domain.startsWith('http') ? domain : `https://${domain}`,
    websiteType: 'existing',
    industry: 'Machinery',
    websiteGoal: '',
    primaryColor: '#15D6C2',
    secondaryColor: '#0f172a',
    accentColor: '#15D6C2',
    textColor: '#0f172a',
    backgroundColor: '#fbfbfb',
    fontFamily: 'Raleway',
    buttonFontFamily: 'Google Sans',
    maxWidth: '1200px',
    borderRadius: '16px',
    designStyleNotes: 'Existing website added with basic info only.',
    phoneNumber: '',
    email: '',
    businessAddress: '',
    whatsappLink: '',
    facebookLink: '',
    instagramLink: '',
    youtubeLink: '',
    otherSocialLinks: '',
    mainKeyword: '',
    seoNotes: '',
    internalLinkingNotes: '',
    targetCountry: '',
    targetAudience: '',
    extraInstructions: '',
    productCategories: '',
    importantPages: '',
    brandNotes: '',
    socialLinks: '',
    status: 'active',
    notes: '',
    faviconUrl: exModel.faviconUrl,
    createdBy: auth.user?.id || '',
    createdAt: '',
    qualityClassId: null,
    isFramework: exModel.platformType === 'framework',
    platformType: exModel.platformType,
    lastAccessedAt: null,
    products: [],
  };

  const savedId = await data.upsertWebsite(website);
  exSaving.value = false;
  if (savedId) {
    showToastMsg(t('websites.existingSaved'));
    setTimeout(() => {
      router.push(auth.isAdmin ? '/websites/my' : '/websites/my');
    }, 1000);
  }
};

const loadingExisting = ref(false);
const saving          = ref<false | 'draft' | 'submit'>(false);
const currentStep     = ref(0);
const showToast       = ref(false);
const toastMsg        = ref('');

const steps = computed(() => [
  { key: 'basic',   label: t('websites.basicInfo') },
  { key: 'design',  label: t('websites.design') },
  { key: 'contact', label: t('websites.contact') },
  { key: 'docs',    label: t('websites.productDocs') },
  { key: 'review',  label: t('websites.review') },
]);

// ── Model ─────────────────────────────────────────────────────────────────────
const blank = (): Website => ({
  id: '',
  name: '',
  domain: '',
  websiteType: '',
  industry: 'Machinery',
  websiteGoal: '',
  primaryColor: '#15D6C2',
  secondaryColor: '#0f172a',
  accentColor: '#15D6C2',
  textColor: '#0f172a',
  backgroundColor: '#fbfbfb',
  fontFamily: 'Inter',
  buttonFontFamily: 'Inter',
  maxWidth: '1200px',
  borderRadius: '12px',
  designStyleNotes: '',
  phoneNumber: '',
  email: '',
  businessAddress: '',
  whatsappLink: '',
  facebookLink: '',
  instagramLink: '',
  youtubeLink: '',
  otherSocialLinks: '',
  mainKeyword: '',
  seoNotes: '',
  internalLinkingNotes: '',
  targetCountry: '',
  targetAudience: '',
  extraInstructions: '',
  productCategories: '',
  importantPages: '',
  brandNotes: '',
  socialLinks: '',
  status: 'in_development',
  notes: '',
  faviconUrl: '',
  createdBy: auth.user?.id || '',
  createdAt: '',
  qualityClassId: null,
  isFramework: false,
  platformType: 'unknown',
  lastAccessedAt: null,
  products: [],
});

const model  = reactive<Website>(blank());
const errors = reactive<Record<string, string>>({});

// ── Product Docs ───────────────────────────────────────────────────────────────
const selectedDocIds   = ref<string[]>([]);
const docsSearch       = ref('');
const docsFilterFolder = ref('');

const docById = (id: string) => data.docsFiles.find((f) => f.id === id);

const folderNameForDoc = (doc: { folderId: string | null }) => {
  if (!doc.folderId) return 'No folder';
  return data.docsFolders.find((f) => f.id === doc.folderId)?.name ?? 'Unknown';
};

const DOC_TYPE_LABELS: Record<DocsFileType, string> = {
  text_doc:     'Text Doc',
  google_doc:   'Google Doc',
  google_sheet: 'Sheet',
  google_drive: 'Drive',
  pdf:          'PDF',
  image_folder: 'Images',
  website_link: 'Link',
  other:        'Other',
};
const docTypeLabel = (t: DocsFileType) => DOC_TYPE_LABELS[t] ?? t;

const filteredDocs = computed(() => {
  let list = data.docsFiles;
  if (docsFilterFolder.value) list = list.filter((f) => f.folderId === docsFilterFolder.value);
  if (docsSearch.value.trim()) {
    const q = docsSearch.value.toLowerCase();
    list = list.filter((f) => f.title.toLowerCase().includes(q) || f.description.toLowerCase().includes(q));
  }
  return list;
});

const toggleDoc = (id: string) => {
  const idx = selectedDocIds.value.indexOf(id);
  if (idx === -1) selectedDocIds.value.push(id);
  else selectedDocIds.value.splice(idx, 1);
};

// ── Validation ────────────────────────────────────────────────────────────────
const clearError = (field: string) => { delete errors[field]; };

const validate = (): boolean => {
  Object.keys(errors).forEach((k) => delete errors[k]);
  if (!model.name.trim())        errors.name        = t('websites.errors.nameRequired');
  if (!model.domain.trim())      errors.domain      = t('websites.errors.domainRequired');
  if (!model.websiteType)        errors.websiteType = t('websites.errors.typeRequired');
  if (!model.primaryColor)       errors.primaryColor = t('websites.errors.primaryColorRequired');
  if (!model.fontFamily.trim())  errors.fontFamily  = t('websites.errors.fontFamilyRequired');
  if (!model.maxWidth.trim())    errors.maxWidth    = t('websites.errors.maxWidthRequired');
  return Object.keys(errors).length === 0;
};

// Which step has a required-field error?
const stepHasErrors = (stepIdx: number): boolean => {
  if (stepIdx === 0) return !!(errors.name || errors.domain || errors.websiteType);
  if (stepIdx === 1) return !!(errors.primaryColor || errors.fontFamily || errors.maxWidth);
  return false;
};

// ── Navigation ────────────────────────────────────────────────────────────────
const goToStep = (i: number) => { currentStep.value = i; };
const nextStep = () => { if (currentStep.value < steps.value.length - 1) currentStep.value++; };
const prevStep = () => { if (currentStep.value > 0) currentStep.value--; };

// ── Helpers ───────────────────────────────────────────────────────────────────
const websiteTypeLabel = (val: string) => {
  const map: Record<string, string> = {
    ecommerce: 'Normal E-commerce Website',
    landing:   'Product Landing Website',
    catalog:   'Catalog Website',
    blog:      'Blog / Guide Website',
    service:   'Service Website',
    brand:     'Brand Website',
  };
  return map[val] ?? val;
};

const creatorName = (w: Website) => {
  if (!w.createdBy) return '';
  const member = data.memberById(w.createdBy);
  return member?.fullName ?? '';
};

const showToastMsg = (msg: string) => {
  toastMsg.value  = msg;
  showToast.value = true;
  setTimeout(() => { showToast.value = false; }, 3200);
};

// ── Load existing ─────────────────────────────────────────────────────────────
const loadFromStore = () => {
  if (!editId.value) { Object.assign(model, blank()); return; }
  const found = data.websiteById(editId.value);
  if (found) Object.assign(model, { ...found, products: found.products.map((p) => ({ ...p })) });
};

watch(() => data.websites.length, loadFromStore);

onMounted(async () => {
  if (isEdit.value && data.websites.length === 0) {
    loadingExisting.value = true;
    try { await data.fetchWebsites(); } catch (err) { console.error(err); } finally { loadingExisting.value = false; }
  }
  loadFromStore();
  if (auth.isAdmin) {
    data.fetchMembers();
  }
  // Load docs for the selector
  await Promise.all([data.fetchDocsFolders(), data.fetchDocsFiles()]);
  // If editing, load existing linked docs
  if (isEdit.value && editId.value) {
    await data.fetchWebsiteProductDocs(editId.value);
    selectedDocIds.value = [...(data.websiteProductDocs[editId.value] ?? [])];
  }
});

// ── Save ──────────────────────────────────────────────────────────────────────
const saveDraft = async () => {
  if (auth.isViewer) return;
  if (saving.value) return;
  saving.value = 'draft';
  const savedId = await data.upsertWebsite({ ...model });
  if (savedId) {
    if (selectedDocIds.value.length > 0) await data.setWebsiteProductDocs(savedId, selectedDocIds.value);
    showToastMsg(t('websites.draftSaved'));
  }
  saving.value = false;
};

const submit = async () => {
  if (auth.isViewer) return;
  if (!validate()) {
    currentStep.value = 4;
    return;
  }
  saving.value = 'submit';
  const savedId = await data.upsertWebsite({ ...model });
  if (savedId) {
    await data.setWebsiteProductDocs(savedId, selectedDocIds.value);
    showToastMsg(isEdit.value ? t('websites.updatedMsg') : t('websites.createdMsg'));
    setTimeout(() => {
      router.push(auth.isAdmin ? '/websites/my' : '/websites/my');
    }, 1000);
  }
  saving.value = false;
};
</script>

<style scoped>
.nw-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-bottom: 3rem;
}

/* ── Steps ── */
.nw-steps {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 0.65rem 0.75rem;
}

.nw-step {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: transparent;
  border: none;
  border-radius: 9px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
  color: var(--text-muted);
  transition: background 120ms, color 120ms;
}

.nw-step:hover { background: var(--soft-bg); color: var(--text-main); }

.nw-step--active {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.nw-step--done { color: #16a34a; }
.nw-step--error { color: #dc2626; }

.nw-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  border-radius: 50%;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  background: var(--soft-bg);
  border: 1.5px solid var(--border);
  flex-shrink: 0;
}

.nw-step--active .nw-step-num {
  background: var(--primary);
  border-color: var(--primary);
  color: #f8fbff;
}

.nw-step--done .nw-step-num {
  background: rgba(22,163,74,0.12);
  border-color: rgba(22,163,74,0.3);
  color: #16a34a;
}

.nw-step--error .nw-step-num {
  background: rgba(220,38,38,0.1);
  border-color: rgba(220,38,38,0.3);
  color: #dc2626;
}

.nw-step-label {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
}

/* ── Section ── */
.nw-body { display: flex; flex-direction: column; }

.nw-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card-bg);
  padding: 1.5rem;
}

.nw-section-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}

.nw-section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 12px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  flex-shrink: 0;
}

.nw-section-icon--design   { background: rgba(124,58,237,0.1); color: #7c3aed; }
.nw-section-icon--contact  { background: rgba(20,184,166,0.1); color: #14b8a6; }
.nw-section-icon--seo      { background: rgba(249,115,22,0.1); color: #f97316; }
.nw-section-icon--products { background: rgba(234,179,8,0.1);  color: #ca8a04; }
.nw-section-icon--review   { background: rgba(22,163,74,0.1);  color: #16a34a; }

.nw-section-title {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.05rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nw-section-sub {
  font-size: 0.83rem;
  color: var(--text-muted);
  margin: 0.2rem 0 0;
}

.nw-optional-tag {
  font-size: 0.7rem;
  font-weight: 700;
  background: var(--soft-bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  letter-spacing: 0.03em;
}

.nw-divider {
  height: 1px;
  background: var(--border);
  margin: 0.25rem 0;
}

.nw-subsection-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

/* ── Grid / Fields ── */
.nw-grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
  gap: 1rem;
}

.nw-field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.nw-field--full { grid-column: 1 / -1; }

.nw-field--error .input {
  border-color: rgba(220,38,38,0.5);
  background: rgba(220,38,38,0.03);
}

.nw-label {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
}

.nw-req { color: #dc2626; }

.nw-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}

.nw-hint-inline {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 400;
}

.nw-error-msg {
  font-size: 0.72rem;
  color: #dc2626;
  font-weight: 600;
}

/* ── Color fields ── */
.nw-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
  gap: 1rem;
}

.nw-colorfield {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.nw-color-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nw-color-picker {
  width: 2.8rem;
  height: 2.4rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.1rem;
  background: var(--card-bg);
  cursor: pointer;
  flex-shrink: 0;
}

.nw-color-text { flex: 1; }

/* ── Products ── */
.nw-products-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2.5rem 1rem;
  border: 2px dashed var(--border);
  border-radius: 14px;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
}

.nw-product-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nw-product-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
}

.nw-product-header {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: var(--soft-bg);
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--border);
}

.nw-product-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--text-muted);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.1rem 0.45rem;
}

.nw-product-name {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-main);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nw-product-remove {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  transition: color 120ms, background 120ms;
}

.nw-product-remove:hover { color: #dc2626; background: rgba(220,38,38,0.08); }

.nw-product-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.nw-add-product-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: transparent;
  border: 2px dashed var(--border);
  border-radius: 12px;
  padding: 0.6rem 1.1rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--primary);
  cursor: pointer;
  transition: border-color 140ms, background 140ms;
  width: fit-content;
}

.nw-add-product-btn:hover {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 5%, transparent);
}

/* ── Review ── */
.nw-review-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 0.85rem;
}

.nw-review-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  background: var(--soft-bg);
}

.nw-review-card--products {
  grid-column: 1 / -1;
}

.nw-review-card-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
  margin-bottom: 0.2rem;
}

.nw-review-row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.8rem;
}

.nw-review-row span { color: var(--text-muted); flex-shrink: 0; }
.nw-review-row strong { color: var(--text-main); text-align: right; }

.nw-review-color {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.nw-color-swatch {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 4px;
  border: 1px solid rgba(0,0,0,0.1);
  flex-shrink: 0;
}

.nw-review-truncate {
  max-width: 12rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nw-review-none {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-style: italic;
}

.nw-review-product {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  color: var(--text-main);
  padding: 0.25rem 0;
}

/* Validation summary */
.nw-validation-summary {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  background: rgba(220,38,38,0.06);
  border: 1px solid rgba(220,38,38,0.25);
  border-radius: 12px;
  padding: 0.85rem 1rem;
  color: #dc2626;
}

.nw-validation-summary svg { flex-shrink: 0; margin-top: 2px; }

.nw-validation-title {
  font-size: 0.82rem;
  font-weight: 700;
  margin: 0 0 0.3rem;
}

.nw-validation-summary ul {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.nw-validation-summary li {
  font-size: 0.8rem;
}

/* ── Footer ── */
.nw-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 0.85rem 1.1rem;
}

.nw-footer-left { display: flex; gap: 0.5rem; }
.nw-footer-right { display: flex; gap: 0.6rem; align-items: center; }

.nw-submit-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #16a34a;
}

.nw-submit-btn:hover:not(:disabled) { opacity: 0.9; }

.nw-save-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(220,38,38,0.06);
  border: 1px solid rgba(220,38,38,0.2);
  border-radius: 10px;
  color: #dc2626;
  font-size: 0.82rem;
  padding: 0.65rem 0.85rem;
}

/* Toast */
.nw-toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #16a34a;
  color: #f8fbff;
  border-radius: 12px;
  padding: 0.75rem 1.1rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.86rem;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(22,163,74,0.25);
  z-index: 9999;
}

.toast-enter-active, .toast-leave-active { transition: opacity 260ms, transform 260ms; }
.toast-enter-from  { opacity: 0; transform: translateY(8px); }
.toast-leave-to    { opacity: 0; transform: translateY(8px); }

/* ── Mode tabs ── */
.nw-mode-tabs {
  display: flex;
  gap: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  padding: 0.5rem 0.65rem;
  width: fit-content;
}

.nw-mode-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: transparent;
  border: none;
  border-radius: 9px;
  padding: 0.45rem 1rem;
  cursor: pointer;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.84rem;
  font-weight: 700;
  transition: background 120ms, color 120ms;
}

.nw-mode-tab:hover { background: var(--soft-bg); color: var(--text-main); }

.nw-mode-tab--active {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

/* ── Existing website redesign ── */
.nw-ex-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 680px;
}

.nw-ex-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  padding: 1.25rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.nw-ex-card-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

.nw-ex-card-label svg { color: var(--primary); flex-shrink: 0; }

.nw-optional-pill {
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--soft-bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.08rem 0.45rem;
  letter-spacing: 0.03em;
  text-transform: none;
}

.nw-ex-fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.85rem;
}

.nw-ex-notice {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.65rem 0.9rem;
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.nw-ex-notice svg { flex-shrink: 0; margin-top: 2px; color: var(--primary); }

/* ── Product Docs step ── */
.nw-section-icon--docs { background: rgba(99,102,241,0.1); color: #6366f1; }

.nw-docs-toolbar {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.nw-docs-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
}

.nw-docs-search-icon {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.nw-docs-search {
  width: 100%;
  padding: 0.5rem 0.75rem 0.5rem 2rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 120ms;
}
.nw-docs-search:focus { border-color: var(--primary); }

.nw-docs-folder-filter {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.85rem;
  outline: none;
  min-width: 140px;
  cursor: pointer;
}

.nw-docs-selected {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.nw-docs-selected-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  white-space: nowrap;
  padding-top: 0.3rem;
}

.nw-docs-chips {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.nw-doc-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  border: 1px solid color-mix(in srgb, var(--primary) 25%, transparent);
  border-radius: 999px;
  padding: 0.2rem 0.5rem 0.2rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  max-width: 220px;
}

.nw-doc-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nw-doc-chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--primary);
  cursor: pointer;
  border-radius: 50%;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.7;
  transition: opacity 120ms;
}
.nw-doc-chip-remove:hover { opacity: 1; }

.nw-docs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.65rem;
}

.nw-doc-card {
  position: relative;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.85rem;
  border: 1.5px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  cursor: pointer;
  transition: border-color 120ms, background 120ms, box-shadow 120ms;
}
.nw-doc-card:hover { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 3%, var(--card-bg)); }

.nw-doc-card--selected {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent);
}

.nw-doc-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.1rem;
}

.nw-doc-check {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1.5px solid var(--border);
  background: var(--soft-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 120ms, border-color 120ms;
}

.nw-doc-card--selected .nw-doc-check {
  background: var(--primary);
  border-color: var(--primary);
  color: #f8fbff;
}

.nw-doc-type-badge {
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.1rem 0.4rem;
}

.nw-doc-card-title {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.3;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.nw-doc-card-folder {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.73rem;
  color: var(--text-muted);
}

.nw-doc-card-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.4;
  margin-top: 0.15rem;
}

.nw-docs-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 2.5rem 1rem;
  border: 2px dashed var(--border);
  border-radius: 14px;
  color: var(--text-muted);
  font-size: 0.85rem;
  text-align: center;
}

.nw-review-doc-folder {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 400;
}

/* ── Domain row with favicon preview ── */
.nw-domain-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.nw-domain-row .input { flex: 1; min-width: 0; }

.nw-favicon-preview {
  width: 20px;
  height: 20px;
  border-radius: 3px;
  object-fit: contain;
  flex-shrink: 0;
}

.nw-favicon-status {
  display: block;
  margin-top: 0.3rem;
  font-size: 0.73rem;
}
.nw-favicon-status--loading { color: var(--text-muted); }
.nw-favicon-status--found   { color: #22c55e; }
.nw-favicon-status--notfound { color: var(--text-muted); }
</style>
