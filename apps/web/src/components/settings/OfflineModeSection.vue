<script setup lang="ts">
import GlassPanel from '@/components/layout/GlassPanel.vue'

const props = defineProps<{
  enabled: boolean
  busy?: boolean
  isOnline?: boolean
  isFallbackMode?: boolean
  draftCount?: number
  pendingCount?: number
  conflictCount?: number
  syncing?: boolean
  lastSyncAt?: string | null
  lastSyncError?: string | null
}>()

const emit = defineEmits<{
  (event: 'toggle', next: boolean): void
  (event: 'sync-now'): void
}>()

function toggle() {
  if (props.busy) return
  emit('toggle', !props.enabled)
}

function requestSyncNow() {
  if (props.syncing) return
  emit('sync-now')
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Never'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleString()
}
</script>

<template>
  <GlassPanel>
    <header class="section-head">
      <div>
        <h2 class="section-title">Offline Mode</h2>
        <p class="section-note">Control whether sensitive trade/account drafts persist locally.</p>
      </div>
    </header>

    <article class="panel p-3">
      <p class="kicker-label">Sensitive Data Persistence</p>
      <p class="mt-1 text-sm text-[var(--muted)]">
        OFF keeps sensitive trade/account drafts in memory only. ON stores them in IndexedDB with scoped TTL and caps.
      </p>
      <p class="mt-2 text-sm">
        Current status:
        <strong>{{ enabled ? 'ON (IndexedDB persistence enabled)' : 'OFF (no sensitive persistence)' }}</strong>
      </p>
      <div class="mt-3 grid gap-2 text-sm md:grid-cols-2">
        <p>
          Connectivity:
          <strong>{{ isOnline === false ? 'Offline' : 'Online' }}</strong>
        </p>
        <p>
          Sync mode:
          <strong>{{ isFallbackMode ? 'Offline draft mode' : 'Server sync mode' }}</strong>
        </p>
        <p>
          Queue:
          <strong>{{ draftCount ?? 0 }} draft / {{ pendingCount ?? 0 }} pending / {{ conflictCount ?? 0 }} conflict</strong>
        </p>
        <p>
          Last sync:
          <strong>{{ formatDateTime(lastSyncAt) }}</strong>
        </p>
      </div>
      <p class="mt-2 text-sm text-[var(--muted)]">
        Reconnect flow: queued drafts sync automatically when connectivity is stable. Conflicts require review before local changes can be resolved.
      </p>
      <p v-if="lastSyncError" class="field-error-text mt-2">{{ lastSyncError }}</p>
    </article>

    <div class="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        class="btn px-4 py-2 text-sm"
        :class="enabled ? 'btn-secondary' : 'btn-ghost'"
        :disabled="busy"
        @click="toggle"
      >
        {{ busy ? 'Updating...' : enabled ? 'Turn OFF' : 'Turn ON' }}
      </button>
      <button
        type="button"
        class="btn btn-ghost px-4 py-2 text-sm"
        :disabled="syncing"
        @click="requestSyncNow"
      >
        {{ syncing ? 'Syncing...' : 'Sync now' }}
      </button>
    </div>
  </GlassPanel>
</template>
