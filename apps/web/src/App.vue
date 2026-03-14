<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import SidebarLayout from '@/components/layout/SidebarLayout.vue'
import ToastCenter from '@/components/layout/ToastCenter.vue'
import ConfirmDialog from '@/components/layout/ConfirmDialog.vue'
import { resolveAppShellLayout } from '@/appShell'
import { useAuthStore } from '@/stores/authStore'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const routerReady = ref(false)
const appShellLayout = computed(() =>
  resolveAppShellLayout({
    routerReady: routerReady.value,
    authStatus: authStore.status,
    matched: route.matched,
  })
)
const useAuthLayout = computed(() => appShellLayout.value === 'auth')
const showBootstrapError = computed(() => appShellLayout.value === 'loading' && authStore.bootstrapState === 'error')

async function retryAuthBootstrap() {
  await authStore.initialize(true)
}

async function handleUnauthorized() {
  await authStore.clearSession()
  if (route.path === '/auth/login' || route.path === '/login') return
  await router.replace({
    path: '/auth/login',
    query: { redirect: route.fullPath },
  })
}

function onUnauthorized() {
  void handleUnauthorized()
}

onMounted(() => {
  void router.isReady().then(() => {
    routerReady.value = true
  })
  window.addEventListener('auth:unauthorized', onUnauthorized)
})

onBeforeUnmount(() => {
  window.removeEventListener('auth:unauthorized', onUnauthorized)
})
</script>

<template>
  <div v-if="appShellLayout === 'loading'" class="app-boot-gate" role="status" aria-live="polite">
    <div class="app-boot-card">
      <p class="app-boot-kicker">{{ showBootstrapError ? 'Session check failed' : 'Securing workspace' }}</p>
      <h1 class="app-boot-title">
        {{ showBootstrapError ? 'We could not verify your session.' : 'Checking your session...' }}
      </h1>
      <p class="app-boot-copy">
        {{ showBootstrapError
          ? (authStore.bootstrapError ?? 'Retry to validate your session before entering the workspace.')
          : 'Protected pages stay hidden until access is confirmed.' }}
      </p>
      <button
        v-if="showBootstrapError"
        type="button"
        class="app-boot-retry"
        :disabled="authStore.loading"
        @click="retryAuthBootstrap"
      >
        {{ authStore.loading ? 'Retrying...' : 'Retry session check' }}
      </button>
    </div>
  </div>
  <RouterView v-else-if="useAuthLayout" />
  <SidebarLayout v-else />
  <ToastCenter />
  <ConfirmDialog />
</template>

<style scoped>
.app-boot-gate {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background:
    radial-gradient(circle at top, color-mix(in srgb, var(--accent) 18%, transparent), transparent 42%),
    linear-gradient(180deg, var(--bg-primary), var(--bg-secondary));
}

.app-boot-card {
  width: min(28rem, 100%);
  padding: 2rem;
  border: 1px solid var(--border-primary);
  border-radius: 1.5rem;
  background: color-mix(in srgb, var(--panel-bg) 94%, transparent);
  box-shadow: 0 24px 64px rgba(15, 23, 42, 0.18);
  text-align: center;
}

.app-boot-kicker {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.app-boot-title {
  margin: 0.85rem 0 0;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
  line-height: 1.1;
  color: var(--text-primary);
}

.app-boot-copy {
  margin: 0.85rem 0 0;
  color: var(--text-secondary);
}

.app-boot-retry {
  margin-top: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 12rem;
  border: 1px solid var(--border-primary);
  border-radius: 999px;
  padding: 0.8rem 1.1rem;
  background: var(--panel-bg);
  color: var(--text-primary);
  font-weight: 600;
  transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
}

.app-boot-retry:hover:not(:disabled),
.app-boot-retry:focus-visible {
  border-color: var(--accent);
  transform: translateY(-1px);
}

.app-boot-retry:disabled {
  opacity: 0.7;
  cursor: wait;
}
</style>
