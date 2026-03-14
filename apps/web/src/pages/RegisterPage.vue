<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { isAxiosError } from 'axios'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { CheckCircle2, Eye, EyeOff, LineChart, Sparkles } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/authStore'
import { useUserPreferencesStore } from '@/stores/userPreferencesStore'
import { normalizeApiError } from '@/utils/apiError'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const userPreferencesStore = useUserPreferencesStore()

const name = ref('')
const email = ref('')
const password = ref('')
const passwordConfirmation = ref('')
const revealPassword = ref(false)
const revealPasswordConfirmation = ref(false)
const emailTouched = ref(false)
const passwordTouched = ref(false)
const passwordConfirmationTouched = ref(false)
const errorMessage = ref<string | null>(null)

const submitting = computed(() => authStore.loading)
const allowSelfRegister = computed(() => authStore.allowSelfRegister)
const normalizedEmail = computed(() => email.value.trim())
const emailLooksValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail.value))
const emailError = computed(() => {
  if (!emailTouched.value || normalizedEmail.value === '') return null
  return emailLooksValid.value ? null : 'Enter a valid email address.'
})
const passwordLengthValid = computed(() => password.value.length >= 8)
const passwordHasLetter = computed(() => /[A-Za-z]/.test(password.value))
const passwordHasNumber = computed(() => /\d/.test(password.value))
const passwordRuleText = computed(() => 'Use at least 8 characters. A mix of letters and numbers is recommended.')
const passwordError = computed(() => {
  if (!passwordTouched.value || password.value === '') return null
  return passwordLengthValid.value ? null : 'Password must be at least 8 characters.'
})
const passwordMismatch = computed(() =>
  passwordConfirmation.value !== '' && password.value !== passwordConfirmation.value
)
const passwordConfirmationError = computed(() => {
  if (!passwordConfirmationTouched.value || passwordConfirmation.value === '') return null
  return passwordMismatch.value ? 'Passwords do not match.' : null
})
const passwordStrength = computed(() => {
  const score = [
    passwordLengthValid.value,
    password.value.length >= 12,
    passwordHasLetter.value,
    passwordHasNumber.value,
  ].filter(Boolean).length

  if (password.value === '') {
    return { label: 'Add a password', tone: 'empty', width: '0%' }
  }
  if (score <= 2) {
    return { label: 'Basic', tone: 'weak', width: '34%' }
  }
  if (score === 3) {
    return { label: 'Good', tone: 'medium', width: '68%' }
  }
  return { label: 'Strong', tone: 'strong', width: '100%' }
})
const canSubmit = computed(() =>
  name.value.trim() !== ''
  && normalizedEmail.value !== ''
  && emailLooksValid.value
  && password.value.trim() !== ''
  && passwordConfirmation.value.trim() !== ''
  && passwordLengthValid.value
  && !passwordMismatch.value
)

function onEmailInput(value: string) {
  email.value = value
  errorMessage.value = null
}

function onPasswordInput(value: string) {
  password.value = value
  errorMessage.value = null
}

function onPasswordConfirmationInput(value: string) {
  passwordConfirmation.value = value
  errorMessage.value = null
}

watch(allowSelfRegister, (enabled) => {
  if (!enabled) {
    void router.replace('/auth/login')
  }
}, { immediate: true })

async function submit() {
  errorMessage.value = null
  emailTouched.value = true
  passwordTouched.value = true
  passwordConfirmationTouched.value = true
  if (!canSubmit.value) return

  try {
    await authStore.register(name.value, email.value, password.value, passwordConfirmation.value)
    await userPreferencesStore.initialize(true)

    const redirectTarget = typeof route.query.redirect === 'string' && route.query.redirect !== ''
      ? route.query.redirect
      : '/dashboard'
    await router.replace(redirectTarget)
  } catch (error) {
    if (isAxiosError(error)) {
      if (!error.response) {
        errorMessage.value = error.code === 'ECONNABORTED'
          ? 'Authentication request timed out. Please try again.'
          : 'Unable to reach the API. Verify production API URL/proxy and CORS settings.'
        return
      }

      const payload = error.response?.data
      if (typeof payload === 'string' && /<(!doctype|html)/i.test(payload.trim())) {
        errorMessage.value = 'API returned HTML instead of JSON. Verify Railway API_UPSTREAM_URL and backend route configuration.'
        return
      }

      errorMessage.value = normalizeApiError(error).message
      return
    }

    errorMessage.value = 'Authentication failed.'
  }
}

const loginLink = computed(() => {
  const redirect = typeof route.query.redirect === 'string' && route.query.redirect !== ''
    ? route.query.redirect
    : ''

  return redirect !== ''
    ? { path: '/auth/login', query: { redirect } }
    : { path: '/auth/login' }
})
</script>

<template>
  <div class="auth-shell">
    <a class="auth-skip-link" href="#register-main">Skip to account creation form</a>
    <div class="auth-grid-overlay" />
    <div class="auth-glow auth-glow-a" />
    <div class="auth-glow auth-glow-b" />

    <main id="register-main" class="auth-shell-grid" tabindex="-1">
      <aside class="auth-stage" aria-labelledby="register-stage-title">
        <a class="auth-brand-row" href="/" aria-label="IZLedger home">
          <span class="auth-brand-mark">
            <LineChart class="h-4 w-4" />
          </span>
          <span class="auth-brand-label">IZLedger</span>
        </a>

        <p class="auth-stage-kicker">Workspace Setup</p>
        <h1 id="register-stage-title" class="auth-stage-title">Create your IZLedger workspace</h1>
        <p class="auth-stage-subtitle">
          Set up a private trading journal workspace built for execution review, rule-break tracking, and disciplined
          session analysis.
        </p>

        <div class="auth-stage-metrics">
          <div class="metric-card">
            <small>Workspace</small>
            <strong>Private and secure</strong>
          </div>
          <div class="metric-card">
            <small>Setup time</small>
            <strong>About 3 minutes</strong>
          </div>
        </div>

        <div class="auth-stage-note">
          <Sparkles class="h-4 w-4" />
          <span>One account keeps your sessions, dashboards, rules, and review notes in one place.</span>
        </div>
      </aside>

      <section class="auth-panel" aria-labelledby="register-form-title">
        <header class="auth-panel-head">
          <p class="auth-kicker">Authentication</p>
          <h2 id="register-form-title" class="auth-title">Start free</h2>
          <p id="register-form-help" class="auth-subtitle">Create your account to begin logging trades and reviewing execution with structure.</p>
        </header>

        <form class="auth-form" novalidate @submit.prevent="submit">
          <label class="auth-field" for="register-name">
            <span class="auth-label">Name</span>
            <input
              id="register-name"
              v-model.trim="name"
              class="auth-input"
              type="text"
              autocomplete="name"
              aria-describedby="register-name-help"
              required
            />
            <span id="register-name-help" class="auth-helper">Use the name you want attached to your workspace.</span>
          </label>

          <label class="auth-field" for="register-email">
            <span class="auth-label">Email</span>
            <input
              id="register-email"
              :value="email"
              class="auth-input"
              :class="{ 'auth-input-error': emailError }"
              type="email"
              autocomplete="email"
              inputmode="email"
              :aria-invalid="emailError ? 'true' : 'false'"
              :aria-describedby="emailError ? 'register-email-error' : undefined"
              required
              @input="onEmailInput(($event.target as HTMLInputElement).value)"
              @blur="emailTouched = true"
            />
            <span v-if="emailError" id="register-email-error" class="auth-helper error" role="alert">{{ emailError }}</span>
          </label>

          <label class="auth-field" for="register-password">
            <span class="auth-label">Password</span>
            <span class="auth-input-wrap">
              <input
                id="register-password"
                class="auth-input with-toggle"
                :class="{ 'auth-input-error': passwordError }"
                :value="password"
                :type="revealPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :aria-invalid="passwordError ? 'true' : 'false'"
                aria-describedby="register-password-help register-password-strength"
                required
                @input="onPasswordInput(($event.target as HTMLInputElement).value)"
                @blur="passwordTouched = true"
              />
              <button
                type="button"
                class="auth-visibility-btn"
                :aria-label="revealPassword ? 'Hide password' : 'Show password'"
                :aria-pressed="revealPassword ? 'true' : 'false'"
                @click="revealPassword = !revealPassword"
              >
                <EyeOff v-if="revealPassword" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </span>
            <span id="register-password-help" class="auth-helper">{{ passwordRuleText }}</span>
            <span v-if="passwordError" id="register-password-error" class="auth-helper error" role="alert">{{ passwordError }}</span>

            <div id="register-password-strength" class="password-strength" role="status" aria-live="polite" aria-label="Password strength">
              <div class="password-strength-track">
                <span :class="passwordStrength.tone" :style="{ width: passwordStrength.width }" />
              </div>
              <small :class="passwordStrength.tone">{{ passwordStrength.label }}</small>
            </div>
          </label>

          <label class="auth-field" for="register-password-confirmation">
            <span class="auth-label">Confirm Password</span>
            <span class="auth-input-wrap">
              <input
                id="register-password-confirmation"
                class="auth-input with-toggle"
                :class="{ 'auth-input-error': passwordConfirmationError }"
                :value="passwordConfirmation"
                :type="revealPasswordConfirmation ? 'text' : 'password'"
                autocomplete="new-password"
                :aria-invalid="passwordConfirmationError ? 'true' : 'false'"
                :aria-describedby="passwordConfirmationError ? 'register-password-confirmation-error' : 'register-password-confirmation-success'"
                required
                @input="onPasswordConfirmationInput(($event.target as HTMLInputElement).value)"
                @blur="passwordConfirmationTouched = true"
              />
              <button
                type="button"
                class="auth-visibility-btn"
                :aria-label="revealPasswordConfirmation ? 'Hide confirmation password' : 'Show confirmation password'"
                :aria-pressed="revealPasswordConfirmation ? 'true' : 'false'"
                @click="revealPasswordConfirmation = !revealPasswordConfirmation"
              >
                <EyeOff v-if="revealPasswordConfirmation" class="h-4 w-4" />
                <Eye v-else class="h-4 w-4" />
              </button>
            </span>
            <span
              v-if="passwordConfirmation !== '' && !passwordConfirmationError"
              id="register-password-confirmation-success"
              class="auth-helper success"
              role="status"
              aria-live="polite"
            >
              Passwords match.
            </span>
            <span
              v-if="passwordConfirmationError"
              id="register-password-confirmation-error"
              class="auth-helper error"
              role="alert"
            >{{ passwordConfirmationError }}</span>
          </label>

          <p v-if="errorMessage" class="auth-error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="auth-submit" :disabled="submitting || !canSubmit">
            {{ submitting ? 'Creating workspace...' : 'Create Account' }}
          </button>

          <div class="next-steps-card">
            <small>What happens next</small>
            <ol>
              <li>
                <CheckCircle2 class="h-4 w-4" />
                <span>Set session preferences</span>
              </li>
              <li>
                <CheckCircle2 class="h-4 w-4" />
                <span>Log your first trades</span>
              </li>
              <li>
                <CheckCircle2 class="h-4 w-4" />
                <span>Review execution score</span>
              </li>
            </ol>
          </div>

          <p class="auth-switch-link">
            Already have an account?
            <RouterLink :to="loginLink">Sign in</RouterLink>
          </p>
        </form>
      </section>
    </main>
  </div>
</template>

<style scoped>
.auth-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  padding: 1.2rem;
  background: var(--bg);
}

.auth-skip-link {
  position: absolute;
  left: 1rem;
  top: 1rem;
  z-index: 3;
  transform: translateY(-220%);
  border-radius: 0.75rem;
  background: color-mix(in srgb, var(--panel-strong) 92%, transparent 8%);
  color: var(--text);
  padding: 0.72rem 0.95rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: var(--shadow-soft);
}

.auth-skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid color-mix(in srgb, var(--primary) 60%, transparent 40%);
  outline-offset: 2px;
}

.auth-grid-overlay {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, color-mix(in srgb, var(--border) 28%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--border) 22%, transparent) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(circle at 50% 10%, black, transparent 72%);
  pointer-events: none;
}

.auth-glow {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.auth-glow-a {
  width: 420px;
  height: 420px;
  top: -180px;
  left: -130px;
  background: radial-gradient(circle, color-mix(in srgb, var(--primary) 20%, transparent), transparent 68%);
}

.auth-glow-b {
  width: 420px;
  height: 420px;
  right: -150px;
  bottom: -180px;
  background: radial-gradient(circle, color-mix(in srgb, var(--warning) 18%, transparent), transparent 70%);
}

.auth-shell-grid {
  position: relative;
  z-index: 1;
  width: min(1120px, 100%);
  min-height: calc(100vh - 2.4rem);
  margin: 0 auto;
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr;
}

.auth-stage,
.auth-panel {
  border-radius: 1rem;
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent 22%);
  background: linear-gradient(
    165deg,
    color-mix(in srgb, var(--panel-strong) 88%, transparent 12%),
    color-mix(in srgb, var(--panel-soft) 88%, transparent 12%)
  );
  box-shadow: var(--shadow-soft);
}

.auth-stage {
  padding: 1.45rem;
  display: grid;
  align-content: start;
  gap: 1rem;
}

.auth-brand-row {
  display: inline-flex;
  align-items: center;
  gap: 0.58rem;
  width: fit-content;
  text-decoration: none;
}

.auth-brand-mark {
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 0.58rem;
  display: grid;
  place-items: center;
  background: linear-gradient(
    140deg,
    color-mix(in srgb, var(--primary) 86%, black 14%),
    color-mix(in srgb, var(--primary) 54%, var(--panel-strong) 46%)
  );
  color: color-mix(in srgb, var(--panel-strong) 82%, var(--text) 18%);
}

.auth-brand-label {
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
}

.auth-stage-kicker,
.auth-kicker {
  margin: 0;
  font-size: 0.71rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--primary) 70%, var(--text) 30%);
}

.auth-stage-title {
  margin: 0;
  font-size: clamp(1.8rem, 4.9vw, 2.6rem);
  line-height: 1.03;
}

.auth-stage-subtitle {
  margin: 0;
  max-width: 42ch;
  color: var(--muted);
  line-height: 1.68;
  font-size: 0.98rem;
}

.auth-stage-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.metric-card {
  border: 1px solid color-mix(in srgb, var(--border) 78%, transparent 22%);
  border-radius: 0.74rem;
  background: color-mix(in srgb, var(--panel) 74%, transparent 26%);
  padding: 0.62rem 0.7rem;
}

.metric-card small {
  display: block;
  margin-bottom: 0.2rem;
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.metric-card strong {
  font-size: 0.96rem;
}

.auth-stage-note {
  display: inline-flex;
  align-items: center;
  gap: 0.52rem;
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent 28%);
  border-radius: 0.74rem;
  background: color-mix(in srgb, var(--panel-soft) 68%, transparent 32%);
  color: var(--muted);
  font-size: 0.84rem;
  padding: 0.5rem 0.7rem;
}

.auth-stage-note svg {
  color: var(--primary);
}

.auth-panel {
  padding: 1.35rem;
  display: grid;
  align-content: start;
  gap: 1.15rem;
}

.auth-panel-head {
  display: grid;
  gap: 0.34rem;
}

.auth-title {
  margin: 0;
  font-size: 1.56rem;
}

.auth-subtitle {
  margin: 0;
  color: var(--muted);
  line-height: 1.6;
}

.auth-form {
  display: grid;
  gap: 0.95rem;
}

.auth-field {
  display: grid;
  gap: 0.42rem;
}

.auth-label {
  font-size: 0.82rem;
  color: var(--muted);
  font-weight: 700;
}

.auth-input-wrap {
  position: relative;
}

.auth-input {
  width: 100%;
  min-height: 2.92rem;
  border-radius: 0.8rem;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent 26%);
  background: color-mix(in srgb, var(--panel-soft) 74%, transparent 26%);
  color: var(--text);
  padding: 0.72rem 0.86rem;
}

.auth-input.with-toggle {
  padding-right: 2.75rem;
}

.auth-input:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary) 42%, transparent 58%);
  outline-offset: 1px;
}

.auth-input-error {
  border-color: color-mix(in srgb, var(--danger) 58%, transparent 42%);
  background: color-mix(in srgb, var(--danger) 8%, var(--panel-soft) 92%);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--danger) 10%, transparent 90%);
}

.auth-visibility-btn {
  position: absolute;
  top: 50%;
  right: 0.48rem;
  transform: translateY(-50%);
  width: 2rem;
  height: 2rem;
  border-radius: 0.55rem;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  display: grid;
  place-items: center;
}

.auth-visibility-btn:hover {
  border-color: color-mix(in srgb, var(--border) 78%, transparent 22%);
  background: color-mix(in srgb, var(--panel-soft) 56%, transparent 44%);
}

.auth-brand-row:focus-visible,
.auth-visibility-btn:focus-visible,
.auth-submit:focus-visible,
.auth-switch-link a:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--primary) 56%, transparent 44%);
  outline-offset: 3px;
}

.auth-helper {
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--muted);
}

.auth-helper.error {
  color: color-mix(in srgb, var(--danger) 82%, var(--text) 18%);
}

.auth-helper.success {
  color: color-mix(in srgb, var(--primary) 78%, var(--text) 22%);
}

.auth-error {
  margin: 0;
  padding: 0.68rem 0.8rem;
  border-radius: 0.8rem;
  border: 1px solid color-mix(in srgb, var(--danger) 45%, transparent 55%);
  background: color-mix(in srgb, var(--danger) 14%, transparent 86%);
  color: color-mix(in srgb, var(--danger) 78%, var(--text) 22%);
  font-size: 0.84rem;
  line-height: 1.52;
}

.auth-submit {
  min-height: 2.92rem;
  border: 0;
  border-radius: 0.8rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--panel-strong) 88%, var(--text) 12%);
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--primary) 86%, black 14%),
    color-mix(in srgb, var(--primary) 58%, var(--panel) 42%)
  );
  box-shadow: 0 10px 20px color-mix(in srgb, var(--primary) 24%, transparent 76%);
}

.auth-submit:hover:not(:disabled) {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.auth-submit:disabled {
  opacity: 0.58;
}

.password-strength {
  display: grid;
  gap: 0.35rem;
}

.password-strength-track {
  height: 0.42rem;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--border) 60%, transparent 40%);
}

.password-strength-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.password-strength-track span.weak {
  background: linear-gradient(90deg, color-mix(in srgb, var(--danger) 82%, #fff 18%), #f19f7d);
}

.password-strength-track span.medium {
  background: linear-gradient(90deg, color-mix(in srgb, var(--warning) 78%, #fff 22%), #e9c06b);
}

.password-strength-track span.strong {
  background: linear-gradient(90deg, color-mix(in srgb, var(--primary) 82%, #fff 18%), #76ddb0);
}

.password-strength small {
  font-size: 0.78rem;
  font-weight: 700;
}

.password-strength small.weak {
  color: color-mix(in srgb, var(--danger) 82%, var(--text) 18%);
}

.password-strength small.medium {
  color: color-mix(in srgb, var(--warning) 80%, var(--text) 20%);
}

.password-strength small.strong {
  color: color-mix(in srgb, var(--primary) 80%, var(--text) 20%);
}

.password-strength small.empty {
  color: var(--muted);
}

.next-steps-card {
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent 28%);
  border-radius: 0.92rem;
  background: color-mix(in srgb, var(--panel-soft) 72%, transparent 28%);
  padding: 0.9rem;
}

.next-steps-card small {
  display: block;
  color: color-mix(in srgb, var(--primary) 76%, var(--text) 24%);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.next-steps-card ol {
  margin: 0.75rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.62rem;
}

.next-steps-card li {
  display: flex;
  align-items: center;
  gap: 0.52rem;
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 600;
}

.next-steps-card svg {
  color: var(--primary);
  flex: 0 0 auto;
}

.auth-switch-link {
  margin: 0;
  font-size: 0.85rem;
  color: var(--muted);
}

.auth-switch-link a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 600;
}

@media (min-width: 940px) {
  .auth-shell {
    padding: 2rem;
  }

  .auth-shell-grid {
    min-height: calc(100vh - 4rem);
    gap: 1.1rem;
    grid-template-columns: 1.05fr minmax(360px, 0.88fr);
  }

  .auth-stage,
  .auth-panel {
    padding: 1.6rem;
  }
}

@media (max-width: 640px) {
  .auth-shell {
    padding: 0.95rem;
  }

  .auth-shell-grid {
    min-height: calc(100vh - 1.9rem);
  }

  .auth-stage-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
