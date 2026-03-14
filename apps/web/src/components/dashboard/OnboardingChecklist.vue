<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, CheckCircle2, CircleDashed, Sparkles } from 'lucide-vue-next'

interface OnboardingItem {
  key: string
  title: string
  description: string
  completed: boolean
  href: string
  cta: string
}

const props = defineProps<{
  items: OnboardingItem[]
}>()

const completedCount = computed(() => props.items.filter((item) => item.completed).length)
const totalCount = computed(() => props.items.length)
const completionPct = computed(() => {
  if (totalCount.value === 0) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})
const nextItemKey = computed(() => props.items.find((item) => !item.completed)?.key ?? null)
const nextItem = computed(() => props.items.find((item) => item.key === nextItemKey.value) ?? null)
const allComplete = computed(() => totalCount.value > 0 && completedCount.value === totalCount.value)

function itemState(item: OnboardingItem) {
  if (item.completed) return 'done'
  if (item.key === nextItemKey.value) return 'next'
  return 'pending'
}
</script>

<template>
  <section class="onboarding-card">
    <div class="onboarding-head">
      <div>
        <p class="onboarding-kicker">First-run checklist</p>
        <h2 class="onboarding-title">Set up your workspace for stronger daily review</h2>
        <p class="onboarding-subtitle">
          Complete the core setup steps so IZLedger can start tracking execution quality, rule breaks, and session
          discipline properly.
        </p>
      </div>

      <div class="onboarding-summary">
        <strong>{{ completedCount }} / {{ totalCount }}</strong>
        <span>{{ allComplete ? 'Setup complete' : 'Steps completed' }}</span>
      </div>
    </div>

    <div class="onboarding-progress">
      <div class="onboarding-progress-track">
        <span :style="{ width: `${completionPct}%` }" />
      </div>
      <span class="onboarding-progress-label">{{ completionPct }}% ready</span>
    </div>

    <div v-if="allComplete" class="onboarding-complete">
      <Sparkles class="h-4 w-4" />
      <div>
        <strong>Workspace ready for review</strong>
        <p>Your onboarding checklist is complete. Keep the momentum by reviewing today’s session and execution score.</p>
      </div>
    </div>

    <div class="onboarding-list">
      <article
        v-for="item in items"
        :key="item.key"
        class="onboarding-item"
        :class="itemState(item)"
      >
        <div class="onboarding-item-state">
          <CheckCircle2 v-if="item.completed" class="h-4 w-4" />
          <Sparkles v-else-if="itemState(item) === 'next'" class="h-4 w-4" />
          <CircleDashed v-else class="h-4 w-4" />
        </div>

        <div class="onboarding-item-copy">
          <div class="onboarding-item-top">
            <strong>{{ item.title }}</strong>
            <span class="onboarding-state-chip" :class="itemState(item)">
              {{ item.completed ? 'Done' : itemState(item) === 'next' ? 'Next' : 'Pending' }}
            </span>
          </div>
          <p>{{ item.description }}</p>
        </div>

        <RouterLink v-if="!item.completed" :to="item.href" class="onboarding-item-link">
          {{ item.cta }}
          <ArrowRight class="h-4 w-4" />
        </RouterLink>
      </article>
    </div>

    <RouterLink v-if="nextItem" :to="nextItem.href" class="onboarding-primary-link">
      Continue setup
      <ArrowRight class="h-4 w-4" />
    </RouterLink>
  </section>
</template>

<style scoped>
.onboarding-card {
  border: 1px solid color-mix(in srgb, var(--border) 82%, transparent 18%);
  border-radius: 1rem;
  background:
    radial-gradient(circle at 100% 0, color-mix(in srgb, var(--primary) 12%, transparent 88%), transparent 30%),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--panel-strong) 90%, transparent 10%),
      color-mix(in srgb, var(--panel-soft) 92%, transparent 8%)
    );
  box-shadow: var(--shadow-soft);
  padding: 1rem;
  display: grid;
  gap: 1rem;
}

.onboarding-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.onboarding-kicker {
  margin: 0;
  color: color-mix(in srgb, var(--primary) 72%, var(--text) 28%);
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.onboarding-title {
  margin: 0.45rem 0 0;
  font-size: clamp(1.2rem, 2vw, 1.55rem);
  letter-spacing: -0.02em;
}

.onboarding-subtitle {
  margin: 0.52rem 0 0;
  max-width: 58ch;
  color: var(--muted);
  line-height: 1.62;
}

.onboarding-summary {
  min-width: 9rem;
  border: 1px solid color-mix(in srgb, var(--border) 74%, transparent 26%);
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--panel) 84%, transparent 16%);
  padding: 0.78rem 0.86rem;
  text-align: right;
}

.onboarding-summary strong {
  display: block;
  font-size: 1.35rem;
  font-family: var(--font-display);
}

.onboarding-summary span {
  display: block;
  margin-top: 0.18rem;
  color: var(--muted);
  font-size: 0.8rem;
}

.onboarding-progress {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.onboarding-progress-track {
  flex: 1 1 auto;
  height: 0.52rem;
  border-radius: 999px;
  overflow: hidden;
  background: color-mix(in srgb, var(--border) 70%, transparent 30%);
}

.onboarding-progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--primary) 92%, white 8%),
    color-mix(in srgb, var(--primary) 62%, white 38%)
  );
}

.onboarding-progress-label {
  color: var(--muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.onboarding-complete {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  border: 1px solid color-mix(in srgb, var(--primary) 26%, transparent 74%);
  border-radius: 0.9rem;
  background: color-mix(in srgb, var(--primary) 10%, transparent 90%);
  padding: 0.86rem 0.92rem;
}

.onboarding-complete svg {
  color: var(--primary);
  flex: 0 0 auto;
  margin-top: 0.1rem;
}

.onboarding-complete strong {
  display: block;
  color: var(--text);
}

.onboarding-complete p {
  margin: 0.18rem 0 0;
  color: var(--muted);
  line-height: 1.56;
}

.onboarding-list {
  display: grid;
  gap: 0.7rem;
}

.onboarding-item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--border) 76%, transparent 24%);
  border-radius: 0.95rem;
  background: color-mix(in srgb, var(--panel) 88%, transparent 12%);
  padding: 0.86rem 0.92rem;
}

.onboarding-item.next {
  border-color: color-mix(in srgb, var(--primary) 34%, var(--border) 66%);
  background: color-mix(in srgb, var(--primary) 8%, var(--panel) 92%);
}

.onboarding-item.done {
  background: color-mix(in srgb, var(--panel-soft) 92%, transparent 8%);
}

.onboarding-item-state {
  width: 2rem;
  height: 2rem;
  border-radius: 0.68rem;
  display: grid;
  place-items: center;
  background: color-mix(in srgb, var(--panel-soft) 88%, transparent 12%);
  border: 1px solid color-mix(in srgb, var(--border) 72%, transparent 28%);
  color: var(--muted);
}

.onboarding-item.next .onboarding-item-state {
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 28%, transparent 72%);
}

.onboarding-item.done .onboarding-item-state {
  color: color-mix(in srgb, var(--primary) 80%, var(--text) 20%);
}

.onboarding-item-copy {
  min-width: 0;
}

.onboarding-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.onboarding-item-top strong {
  font-size: 0.94rem;
}

.onboarding-item-copy p {
  margin: 0.3rem 0 0;
  color: var(--muted);
  line-height: 1.54;
  font-size: 0.84rem;
}

.onboarding-state-chip {
  border-radius: 999px;
  padding: 0.34rem 0.6rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.onboarding-state-chip.done {
  background: color-mix(in srgb, var(--primary) 14%, transparent 86%);
  color: color-mix(in srgb, var(--primary) 82%, var(--text) 18%);
}

.onboarding-state-chip.next {
  background: color-mix(in srgb, var(--warning) 16%, transparent 84%);
  color: color-mix(in srgb, var(--warning) 82%, var(--text) 18%);
}

.onboarding-state-chip.pending {
  background: color-mix(in srgb, var(--border) 32%, transparent 68%);
  color: var(--muted);
}

.onboarding-item-link,
.onboarding-primary-link {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  color: var(--primary);
  text-decoration: none;
  font-weight: 700;
  white-space: nowrap;
}

.onboarding-primary-link {
  justify-self: start;
}

@media (max-width: 820px) {
  .onboarding-head,
  .onboarding-item {
    grid-template-columns: 1fr;
  }

  .onboarding-summary {
    min-width: 0;
    text-align: left;
  }

  .onboarding-item {
    gap: 0.7rem;
  }

  .onboarding-item-top {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
