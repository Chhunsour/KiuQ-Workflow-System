<template>
  <div class="space-y-8">
    <section class="card card-pad space-y-5">
      <div>
        <h3 class="section-title">Basic info</h3>
        <p class="text-sm text-text-muted">Identify the website.</p>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput v-model="model.name" label="Website name" placeholder="Acme Landing" />
        <FormInput v-model="model.domain" label="Domain" placeholder="acme.example.com" />
        <FormSelect
          v-model="model.websiteType"
          label="Website type"
          placeholder="Pick a website type"
          :options="websiteTypeOptions"
        />
        <FormSelect
          v-model="model.status"
          label="Status"
          :options="[
            { value: 'in_development', label: 'In Development' },
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
          ]"
        />
      </div>
    </section>

    <section class="card card-pad space-y-5">
      <div>
        <h3 class="section-title">Contact &amp; social</h3>
        <p class="text-sm text-text-muted">
          Used by prompt placeholders like <code v-pre class="rounded bg-soft px-1">{{phone_number}}</code>
          and <code v-pre class="rounded bg-soft px-1">{{social_links}}</code>.
        </p>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput v-model="model.phoneNumber" label="Phone number" placeholder="+1 555 123 4567" />
        <FormInput v-model="model.email" label="Email address" placeholder="hello@acme.com" />
      </div>
      <FormTextarea
        v-model="model.businessAddress"
        label="Business address (optional)"
        :rows="2"
      />
      <FormTextarea
        v-model="model.socialLinks"
        label="Social media links"
        helper="One per line, e.g. Facebook: https://facebook.com/acme"
        :rows="3"
      />
    </section>

    <section class="card card-pad space-y-5">
      <div>
        <h3 class="section-title">Brand styling</h3>
        <p class="text-sm text-text-muted">Used inside prompts so the AI matches your site.</p>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ColorField v-model="model.primaryColor" label="Primary color" />
        <ColorField v-model="model.secondaryColor" label="Secondary color" />
        <ColorField v-model="model.accentColor" label="Accent color" />
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormInput v-model="model.fontFamily" label="Font family" placeholder="Inter" />
        <FormInput v-model="model.buttonFontFamily" label="Button font family" placeholder="Inter" />
        <FormInput v-model="model.maxWidth" label="Max width" placeholder="1200px" />
        <FormInput v-model="model.borderRadius" label="Border radius" placeholder="12px" />
      </div>
      <FormTextarea
        v-model="model.designStyleNotes"
        label="Design style notes"
        helper="Tone of the visual design — modern, minimal, playful, editorial..."
      />
    </section>

  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import ColorField from '@/components/ui/ColorField.vue';
import { websiteTypeOptions } from '@/lib/promptLibrary';
import type { Website } from '@/stores/data';

const props = defineProps<{ initial: Website }>();

const model = reactive<Website>({
  ...props.initial,
  products: props.initial.products.map((p) => ({ ...p }))
});

watch(
  () => props.initial,
  (next) => {
    Object.assign(model, next);
    model.products = next.products.map((p) => ({ ...p }));
  }
);

defineExpose({ model });
</script>
