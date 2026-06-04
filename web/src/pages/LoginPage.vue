<template>
  <section class="kiuq-login-card overflow-hidden rounded-[24px] border shadow-card">
    <div class="kiuq-login-grid">
      <aside class="kiuq-brand-panel flex flex-col justify-between p-8 sm:p-10">
        <div>
          <div class="flex flex-col gap-1">
            <div class="mb-2">
              <img
                src="/kiuq-logo.png"
                alt="KiuQ Website System"
                class="h-auto w-full max-w-[220px] object-contain"
              />
            </div>
            <div class="kiuq-text-muted text-sm font-medium">Company access only</div>
          </div>

          <div class="mt-12">
            <p class="ui-font text-xs font-semibold uppercase tracking-wide text-primary">KiuQ Website System</p>
            <h1 class="kiuq-text-main mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              Internal workflow for website teams.
            </h1>
            <p class="kiuq-text-muted mt-5 max-w-sm text-sm leading-6">
              Manage website prompts, team workflow, resources, and project reviews in one place.
            </p>
          </div>
        </div>

        <div class="mt-10 space-y-3">
          <div v-for="item in featurePoints" :key="item" class="kiuq-text-main flex items-center gap-3 text-sm">
            <span class="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="m20 6-11 11-5-5" />
              </svg>
            </span>
            <span>{{ item }}</span>
          </div>
        </div>
      </aside>

      <div class="flex items-center px-6 py-8 sm:px-10 lg:px-12">
        <div class="w-full">
          <div>
            <p class="ui-font text-sm font-semibold text-primary">KiuQ Website System</p>
            <h2 class="kiuq-text-main mt-2 ui-font text-3xl font-semibold">Sign in</h2>
            <p class="kiuq-text-muted mt-2 text-sm leading-6">
              Use your KiuQ team account to continue.
            </p>
          </div>

          <form class="mt-8 space-y-5" novalidate @submit.prevent="onSubmit">
            <div>
              <label class="kiuq-label" for="login-email">Email address</label>
              <input
                id="login-email"
                v-model.trim="email"
                class="kiuq-login-input"
                :class="errorField === 'email' ? 'kiuq-login-input-error' : ''"
                type="email"
                autocomplete="email"
                placeholder="name@kiuq.com"
                :aria-invalid="errorField === 'email'"
                @input="clearError"
              />
            </div>

            <div>
              <label class="kiuq-label" for="login-password">Password</label>
              <div class="relative">
                <input
                  id="login-password"
                  v-model="password"
                  class="kiuq-login-input pr-24"
                  :class="errorField === 'password' ? 'kiuq-login-input-error' : ''"
                  :type="showPassword ? 'text' : 'password'"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  :aria-invalid="errorField === 'password'"
                  @input="clearError"
                />
                <button
                  class="kiuq-show-button ui-font absolute right-2 top-1/2 -translate-y-1/2 rounded-btn px-3 py-1.5 text-xs font-medium"
                  type="button"
                  :aria-label="showPassword ? 'Hide password' : 'Show password'"
                  @click="showPassword = !showPassword"
                >
                  {{ showPassword ? 'Hide' : 'Show' }}
                </button>
              </div>
              <p class="kiuq-text-muted mt-2 text-sm">
                Forgot your password?
                <a
                  href="https://chat.whatsapp.com/Knw2RPjAhMr0c9O2M8ERKv?mode=gi_t"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-primary hover:underline"
                >
                  Contact Sour.
                </a>
              </p>
            </div>

            <div
              v-if="errorMessage"
              class="rounded-btn border border-status-needs-fix-bg bg-status-needs-fix-bg/10 px-4 py-3 text-sm leading-6 text-status-needs-fix-fg"
              role="alert"
            >
              <template v-if="errorMessage === failedLoginMessage">
                Incorrect email or password. If you forgot your password,
                <a
                  href="https://chat.whatsapp.com/Knw2RPjAhMr0c9O2M8ERKv?mode=gi_t"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="font-medium underline decoration-status-needs-fix-fg/40 underline-offset-2 hover:decoration-status-needs-fix-fg"
                >
                  contact Sour.
                </a>
              </template>
              <template v-else>
                {{ errorMessage }}
              </template>
            </div>

            <button class="btn-primary h-12 w-full text-base" :disabled="submitting" type="submit">
              {{ submitting ? 'Signing in...' : 'Sign In' }}
            </button>
          </form>

          <div class="mt-6 rounded-btn border border-white/10 bg-white/[0.03] px-4 py-3 text-center text-sm text-slate-300">
            Need a local account?
            <RouterLink to="/register" class="ui-font font-medium text-primary hover:underline">
              Create account
            </RouterLink>
          </div>

          <p class="kiuq-text-muted mt-8 text-center text-xs">
            © KiuQ. Internal system access only.
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const featurePoints = [
  'Website prompt library',
  'Team task workflow',
  'Review and approval system'
];

const email = ref('');
const password = ref('');
const submitting = ref(false);
const showPassword = ref(false);
const errorMessage = ref('');
const errorField = ref<'email' | 'password' | 'form' | ''>('');

const failedLoginMessage =
  'Incorrect email or password. If you forgot your password, contact Sour.';

const loginErrorMessage = () => {
  const message = auth.error?.trim();
  if (!message) return 'Could not sign in. Please try again.';
  if (/invalid login credentials/i.test(message)) return failedLoginMessage;
  if (/email not confirmed/i.test(message)) {
    return 'Please confirm your email before signing in.';
  }
  return message;
};

const clearError = () => {
  if (!errorMessage.value) return;
  errorMessage.value = '';
  errorField.value = '';
};

const validate = () => {
  if (!email.value.trim()) {
    errorMessage.value = 'Please enter your email.';
    errorField.value = 'email';
    return false;
  }
  if (!password.value) {
    errorMessage.value = 'Please enter your password.';
    errorField.value = 'password';
    return false;
  }
  return true;
};

const onSubmit = async () => {
  if (!validate()) return;
  errorMessage.value = '';
  errorField.value = '';
  submitting.value = true;
  const ok = await auth.signIn(email.value, password.value);
  submitting.value = false;
  if (!ok) {
    errorMessage.value = loginErrorMessage();
    errorField.value = 'form';
    return;
  }
  const redirect = (route.query.redirect as string | undefined) ?? '/';
  router.replace(redirect);
};
</script>

<style scoped>
.kiuq-login-card {
  --kiuq-card-bg: #2f2f2f;
  --kiuq-brand-bg: #2b2b2b;
  --kiuq-text-main: #f8fafc;
  --kiuq-text-muted: #cbd5e1;
  --kiuq-border: #3a3a3a;
  --kiuq-input-bg: #2a2a2a;
  --kiuq-input-placeholder: #9ca3af;
  --kiuq-help-bg: #2b2b2b;
  background: var(--kiuq-card-bg);
  border-color: var(--kiuq-border);
}

.kiuq-login-grid {
  display: grid;
  grid-template-columns: 1fr;
}
/* Desktop: restore the comfortable minimum so the two-column hero+form
   layout has presence. Mobile intentionally has no min-height so the
   brand panel only takes the space its content actually needs. */
@media (min-width: 700px) {
  .kiuq-login-grid { min-height: 560px; }
}

.kiuq-brand-panel {
  background: var(--kiuq-brand-bg);
}

.kiuq-text-main {
  color: var(--kiuq-text-main);
}

.kiuq-text-muted {
  color: var(--kiuq-text-muted);
}

.kiuq-label {
  display: block;
  margin-bottom: 0.375rem;
  color: var(--kiuq-text-main);
  font-size: 0.875rem;
  font-weight: 500;
}

.kiuq-login-input {
  width: 100%;
  height: 3rem;
  border-radius: 10px;
  border: 1px solid #444;
  background: var(--kiuq-input-bg);
  color: var(--kiuq-text-main);
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.kiuq-login-input::placeholder {
  color: var(--kiuq-input-placeholder);
}

.kiuq-login-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.18);
  outline: none;
}

.kiuq-login-input-error {
  border-color: #b91c1c;
}

.kiuq-show-button {
  color: var(--primary);
}

.kiuq-show-button:hover {
  background: var(--kiuq-help-bg);
}



@media (min-width: 700px) {
  .kiuq-login-grid {
    grid-template-columns: 0.92fr 1.08fr;
  }
}

/* ── Mobile compact pass ──────────────────────────────────────────────
   Brand panel becomes a slim header above the form: smaller logo,
   tighter padding, shorter headings, and the feature list compresses
   into a tight 3-row block. The form panel below also tightens its
   padding so the sign-in inputs start higher on the page. */
@media (max-width: 480px) {
  .kiuq-login-card { border-radius: 18px !important; }

  /* Brand panel */
  .kiuq-brand-panel {
    padding: 1rem 1.1rem 1.1rem !important;
  }
  .kiuq-brand-panel img { max-width: 130px !important; }
  .kiuq-brand-panel h1 {
    font-size: 1.4rem !important;
    line-height: 1.25 !important;
  }
  /* Tighten the big top-spacer mt-12 (3rem) → 1.1rem. */
  .kiuq-brand-panel .mt-12 { margin-top: 1.1rem !important; }
  /* Compress the feature-list block at the bottom. */
  .kiuq-brand-panel .mt-10 { margin-top: 1rem !important; }
  .kiuq-brand-panel .space-y-3 > * + * { margin-top: 0.5rem !important; }

  /* Form panel — pull the form up so the user lands on inputs faster. */
  .kiuq-login-grid > div:last-child {
    padding-left: 1.1rem !important;
    padding-right: 1.1rem !important;
    padding-top: 1.1rem !important;
    padding-bottom: 1.4rem !important;
  }
  .kiuq-login-grid > div:last-child .mt-8 { margin-top: 1.25rem !important; }
  .kiuq-login-grid > div:last-child .space-y-5 > * + * { margin-top: 0.85rem !important; }

  /* Submit button: still tap-friendly but slightly shorter than h-12. */
  .btn-primary.h-12 { height: 2.75rem !important; }
}
</style>
