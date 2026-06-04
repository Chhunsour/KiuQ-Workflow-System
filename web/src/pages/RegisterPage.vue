<template>
  <div class="card card-pad register-card">
    <h1 class="ui-font text-xl font-semibold text-text-main">Create an account</h1>
    <p class="mt-1 text-sm text-text-muted">
      New accounts start as <strong>Quality Checker</strong>. A Head or Supervisor can promote you later.
    </p>

    <form class="mt-6 space-y-4" @submit.prevent="onSubmit">
      <FormInput v-model="fullName" label="Full name" placeholder="Jane Smith" />
      <FormInput v-model="email" label="Email" type="email" placeholder="you@team.io" />
      <FormInput v-model="password" label="Password" type="password" placeholder="At least 6 characters" />

      <div v-if="errorMessage" class="rounded-btn border border-status-needs-fix-bg bg-status-needs-fix-bg/30 px-3 py-2 text-sm text-status-needs-fix-fg">
        {{ errorMessage }}
      </div>

      <div v-if="info" class="rounded-btn border border-status-approved-bg bg-status-approved-bg/30 px-3 py-2 text-sm text-status-approved-fg">
        {{ info }}
      </div>

      <button class="btn-primary w-full" :disabled="submitting" type="submit">
        {{ submitting ? 'Creating account...' : 'Create account' }}
      </button>
    </form>

    <div class="mt-6 text-center text-sm text-text-muted">
      Already have an account?
      <RouterLink to="/login" class="ui-font font-medium text-primary hover:underline">
        Sign in
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import FormInput from '@/components/ui/FormInput.vue';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();

const fullName = ref('');
const email = ref('');
const password = ref('');
const submitting = ref(false);
const localError = ref<string | null>(null);
const info = ref<string | null>(null);

const errorMessage = computed(() => localError.value ?? auth.error);

const onSubmit = async () => {
  if (!fullName.value || !email.value || !password.value) {
    localError.value = 'All fields are required.';
    return;
  }
  if (password.value.length < 6) {
    localError.value = 'Password must be at least 6 characters.';
    return;
  }
  localError.value = null;
  info.value = null;
  submitting.value = true;
  const ok = await auth.signUp(email.value, password.value, fullName.value);
  submitting.value = false;
  if (ok) {
    if (auth.session) {
      router.replace('/');
    } else {
      info.value =
        'Account created. Your account has Quality Checker access. Check your email to confirm, then sign in.';
    }
  }
};
</script>

<style scoped>
/* Mobile: trim card padding + form spacing so the page fits without
   scrolling on iPhone 11+ class screens. Desktop is untouched. */
@media (max-width: 480px) {
  .register-card { padding: 1.1rem !important; }
  .register-card .mt-6 { margin-top: 1.1rem !important; }
  .register-card form.space-y-4 > * + * { margin-top: 0.7rem !important; }
}
</style>
