<script setup lang="ts">
import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  ClipboardList,
  Flag,
  LayoutDashboard,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from 'lucide-vue-next'

const previewNav = [
  { label: 'Dashboard', href: '#dashboard', icon: LayoutDashboard },
  { label: 'Session Command Panel', href: '#session-command-panel', icon: ShieldCheck },
  { label: 'Trade Log', href: '#trade-log', icon: ClipboardList },
  { label: 'Rule Breaks', href: '#rule-breaks', icon: Flag },
  { label: 'Emotion Analytics', href: '#emotion-analytics', icon: BrainCircuit },
  { label: 'Calendar', href: '#calendar', icon: CalendarDays },
]

const workspaceNav = [
  {
    label: 'Dashboard',
    hint: 'Overview, score, and session health',
    status: 'active',
  },
  {
    label: 'Sessions',
    hint: 'Daily journals and review history',
    status: 'default',
  },
  {
    label: 'Trades',
    hint: 'Executed trades with context',
    status: 'default',
  },
  {
    label: 'Rule Breaks',
    hint: 'Track repeat discipline mistakes',
    status: 'default',
  },
  {
    label: 'Emotion Analytics',
    hint: 'Behavior patterns behind execution',
    status: 'default',
  },
  {
    label: 'Calendar',
    hint: 'Session replay over time',
    status: 'default',
  },
  {
    label: 'Settings',
    hint: 'Profile, accounts, and preferences',
    status: 'default',
  },
]

const topMetrics = [
  { label: 'Execution score', value: '91 / 100', detail: 'Across the last 12 sessions', tone: 'good' },
  { label: 'Rule breaks flagged', value: '4', detail: '2 repeat patterns detected', tone: 'warn' },
  { label: 'Average R / trade', value: '+0.43R', detail: 'Filtered to A and B setups', tone: 'good' },
  { label: 'Review cadence', value: '6 days', detail: 'Journals completed this week', tone: 'neutral' },
]

const performanceBars = [
  { label: 'Mon', value: 42, tone: 'good' },
  { label: 'Tue', value: 78, tone: 'good' },
  { label: 'Wed', value: 36, tone: 'warn' },
  { label: 'Thu', value: 88, tone: 'good' },
  { label: 'Fri', value: 65, tone: 'good' },
  { label: 'Mon', value: 52, tone: 'good' },
  { label: 'Tue', value: 28, tone: 'warn' },
]

const commandChecklist = [
  {
    title: 'Bias locked',
    detail: 'Only short failed reclaims under VWAP during New York open.',
    state: 'ready',
  },
  {
    title: 'Risk limits active',
    detail: '0.50 percent per trade with 1.50 percent daily stop.',
    state: 'ready',
  },
  {
    title: 'News filter',
    detail: 'No new positions inside the 10:00 ET data window.',
    state: 'watch',
  },
  {
    title: 'Review note queued',
    detail: 'Track first-loss response and impulse-entry risk after open.',
    state: 'ready',
  },
]

const tradeRows = [
  {
    instrument: 'ES',
    setup: 'Opening Drive Fade',
    session: 'NY Open',
    result: '+1.8R',
    execution: '94',
    emotion: 'Calm',
    note: 'Clean reclaim failure with disciplined partials.',
  },
  {
    instrument: 'NQ',
    setup: 'Liquidity Sweep',
    session: 'NY Midday',
    result: '-0.7R',
    execution: '71',
    emotion: 'Rushed',
    note: 'Entry was early. Plan was valid but timing was not.',
  },
  {
    instrument: 'XAUUSD',
    setup: 'London Continuation',
    session: 'London',
    result: '+1.2R',
    execution: '88',
    emotion: 'Focused',
    note: 'Good patience and full checklist alignment before entry.',
  },
  {
    instrument: 'BTC',
    setup: 'Range Fade',
    session: 'PM Review',
    result: 'Scratch',
    execution: '82',
    emotion: 'Neutral',
    note: 'Flattened early after volume failed to confirm.',
  },
]

const ruleBreaks = [
  {
    title: 'Impulse entry after first loss',
    severity: 'High',
    sessions: '3 sessions this month',
    impact: 'Average execution score drops by 14 points when this appears.',
  },
  {
    title: 'Moved stop outside planned invalidation',
    severity: 'Medium',
    sessions: '2 sessions this month',
    impact: 'Creates larger-than-planned loss without improving win rate.',
  },
  {
    title: 'Skipped post-session notes',
    severity: 'Low',
    sessions: '4 sessions this month',
    impact: 'Makes behavioral review less reliable the next day.',
  },
]

const emotionRows = [
  { label: 'Calm', share: '38%', width: '38%', tone: 'good' },
  { label: 'Focused', share: '26%', width: '26%', tone: 'good' },
  { label: 'Hesitant', share: '18%', width: '18%', tone: 'warn' },
  { label: 'Rushed', share: '11%', width: '11%', tone: 'warn' },
  { label: 'Revenge', share: '7%', width: '7%', tone: 'danger' },
]

const behaviorNotes = [
  'Highest execution scores occur when calm and focused tags appear together.',
  'Rushed entries cluster after the first losing trade of the session.',
  'Revenge behavior is low-frequency but drives the largest drop in discipline score.',
]

const calendarDays = [
  { day: '', score: '', state: 'empty' },
  { day: '', score: '', state: 'empty' },
  { day: '1', score: '84', state: 'good' },
  { day: '2', score: '91', state: 'good' },
  { day: '3', score: '76', state: 'warn' },
  { day: '4', score: '88', state: 'good' },
  { day: '5', score: '90', state: 'good' },
  { day: '6', score: '81', state: 'good' },
  { day: '7', score: '', state: 'off' },
  { day: '8', score: '', state: 'off' },
  { day: '9', score: '68', state: 'warn' },
  { day: '10', score: '93', state: 'good' },
  { day: '11', score: '72', state: 'warn' },
  { day: '12', score: '95', state: 'good' },
  { day: '13', score: '89', state: 'good' },
  { day: '14', score: '', state: 'off' },
  { day: '15', score: '', state: 'off' },
  { day: '16', score: '87', state: 'good' },
  { day: '17', score: '79', state: 'good' },
  { day: '18', score: '62', state: 'warn' },
  { day: '19', score: '86', state: 'good' },
  { day: '20', score: '92', state: 'good' },
  { day: '21', score: '', state: 'off' },
  { day: '22', score: '', state: 'off' },
  { day: '23', score: '90', state: 'good' },
  { day: '24', score: '83', state: 'good' },
  { day: '25', score: '70', state: 'warn' },
  { day: '26', score: '94', state: 'good' },
  { day: '27', score: '88', state: 'good' },
  { day: '28', score: '', state: 'off' },
  { day: '29', score: '', state: 'off' },
  { day: '30', score: '89', state: 'good' },
  { day: '31', score: '91', state: 'good' },
  { day: '', score: '', state: 'empty' },
  { day: '', score: '', state: 'empty' },
]
</script>

<template>
  <div class="tour-page">
    <a class="tour-skip-link" href="#tour-main">Skip to product tour content</a>
    <div class="tour-grid" />
    <div class="tour-glow tour-glow-a" />
    <div class="tour-glow tour-glow-b" />

    <header class="tour-topbar">
      <a class="tour-brand" href="/">
        <span class="tour-brand-mark">IZ</span>
        <span class="tour-brand-text">IZLedger</span>
      </a>

      <nav class="tour-topbar-actions" aria-label="Tour actions">
        <a class="tour-link" href="/">Back to home</a>
        <a class="tour-link" href="/register">Start Free</a>
      </nav>
    </header>

    <main id="tour-main" class="tour-shell" tabindex="-1">
      <section class="tour-hero" aria-labelledby="tour-hero-title">
        <div class="tour-hero-copy">
          <p class="tour-kicker">Public product tour</p>
          <h1 id="tour-hero-title">See how disciplined traders use IZLedger before signing up.</h1>
          <p class="tour-subtitle">
            This preview uses realistic dummy data to show how sessions, trades, rule breaks, and behavior analytics
            work together inside the product.
          </p>

          <div class="tour-hero-actions">
            <a class="tour-btn solid" href="/register">
              Start Free
              <ArrowRight class="h-4 w-4" />
            </a>
            <span class="tour-demo-note">Preview only. No backend required.</span>
          </div>

          <div class="tour-proof-row">
            <span>
              <ShieldCheck class="h-4 w-4" />
              Real workflow structure
            </span>
            <span>
              <LockKeyhole class="h-4 w-4" />
              Public demo with dummy data
            </span>
            <span>
              <Sparkles class="h-4 w-4" />
              Built for execution review
            </span>
          </div>
        </div>

        <aside class="tour-sidebar-wrap">
          <div class="tour-sidebar">
            <p class="tour-sidebar-label">App navigation</p>
            <nav class="workspace-nav-preview" aria-label="Workspace navigation preview">
              <a
                v-for="item in workspaceNav"
                :key="item.label"
                href="#dashboard"
                :class="{ active: item.status === 'active' }"
              >
                <strong>{{ item.label }}</strong>
                <span>{{ item.hint }}</span>
              </a>
            </nav>
          </div>

          <div class="tour-sidebar secondary">
            <p class="tour-sidebar-label">Preview areas</p>
            <nav class="tour-sidebar-nav" aria-label="Product tour sections">
              <a v-for="item in previewNav" :key="item.label" :href="item.href">
                <component :is="item.icon" class="h-4 w-4" />
                <span>{{ item.label }}</span>
              </a>
            </nav>
          </div>
        </aside>
      </section>

      <section id="dashboard" class="tour-section">
        <div class="tour-section-head">
          <p class="tour-kicker">Dashboard</p>
          <h2>Trading performance and execution quality in one overview</h2>
          <p>Review the session at a glance before drilling into trades, rule breaks, or behavior trends.</p>
        </div>

        <div class="tour-card dashboard-shell">
          <div class="mock-sidebar">
            <p class="mock-sidebar-title">Workspace</p>
            <div class="mock-sidebar-links">
              <article
                v-for="item in workspaceNav"
                :key="item.label"
                :class="{ active: item.status === 'active' }"
              >
                <strong>{{ item.label }}</strong>
                <span>{{ item.hint }}</span>
              </article>
            </div>
          </div>

          <div class="dashboard-main">
            <div class="dashboard-main-head">
              <div>
                <small>New York Open review</small>
                <h3>Friday session summary</h3>
              </div>
              <span class="status-chip">Demo data</span>
            </div>

            <div class="metric-grid">
              <article v-for="item in topMetrics" :key="item.label" class="metric-tile">
                <small>{{ item.label }}</small>
                <strong :class="item.tone">{{ item.value }}</strong>
                <span>{{ item.detail }}</span>
              </article>
            </div>

            <div class="dashboard-panels">
              <section class="dashboard-panel">
                <div class="panel-head">
                  <div>
                    <small>Performance trend</small>
                    <h4>Last 7 review cycles</h4>
                  </div>
                  <span>Execution-weighted</span>
                </div>

                <div class="bar-chart">
                  <div v-for="bar in performanceBars" :key="`${bar.label}-${bar.value}`" class="bar-column">
                    <span class="bar-value">{{ bar.value }}</span>
                    <div class="bar-track">
                      <i :class="bar.tone" :style="{ height: `${bar.value}%` }" />
                    </div>
                    <small>{{ bar.label }}</small>
                  </div>
                </div>
              </section>

              <section class="dashboard-panel compact">
                <div class="panel-head">
                  <div>
                    <small>Review status</small>
                    <h4>Today</h4>
                  </div>
                </div>

                <div class="review-status">
                  <div class="review-status-row">
                    <span>Session journal saved</span>
                    <strong class="good">Done</strong>
                  </div>
                  <div class="review-status-row">
                    <span>Rule-break review</span>
                    <strong class="warn">1 open</strong>
                  </div>
                  <div class="review-status-row">
                    <span>Emotion tags logged</span>
                    <strong class="good">Complete</strong>
                  </div>
                  <div class="review-status-row">
                    <span>Execution score updated</span>
                    <strong class="good">Synced</strong>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </section>

      <section id="session-command-panel" class="tour-section">
        <div class="tour-section-head">
          <p class="tour-kicker">Session Command Panel</p>
          <h2>Guide the live session before bad execution starts</h2>
          <p>Keep bias, risk, and review notes visible while the market is open so discipline stays actionable.</p>
        </div>

        <div class="tour-card session-card">
          <div class="panel-head">
            <div>
              <small>Live workflow</small>
              <h3>Session Command Panel</h3>
            </div>
            <span class="status-chip live">Ready to trade</span>
          </div>

          <div class="session-focus">
            <small>Focus rule</small>
            <strong>No revenge entries after the first loss.</strong>
            <p>Every new position must match the playbook and preserve original invalidation.</p>
          </div>

          <div class="session-checklist">
            <article v-for="item in commandChecklist" :key="item.title" class="session-check-item">
              <i :class="item.state" />
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.detail }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="trade-log" class="tour-section">
        <div class="tour-section-head">
          <p class="tour-kicker">Trade Log</p>
          <h2>Capture trades with context, not just fills</h2>
          <p>The log combines outcome, execution score, emotion tags, and notes so each trade stays reviewable.</p>
        </div>

        <div class="tour-card table-card">
          <div class="table-head">
            <small>Trade log preview</small>
            <span>4 recent trades</span>
          </div>

          <div class="trade-table">
            <div class="trade-table-row trade-table-headings">
              <span>Instrument</span>
              <span>Setup</span>
              <span>Session</span>
              <span>Result</span>
              <span>Execution</span>
              <span>Emotion</span>
              <span>Review note</span>
            </div>

            <div v-for="row in tradeRows" :key="`${row.instrument}-${row.setup}`" class="trade-table-row">
              <span>{{ row.instrument }}</span>
              <span>{{ row.setup }}</span>
              <span>{{ row.session }}</span>
              <strong :class="row.result.startsWith('-') ? 'warn' : 'good'">{{ row.result }}</strong>
              <span>{{ row.execution }}</span>
              <span>{{ row.emotion }}</span>
              <span class="trade-note">{{ row.note }}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="rule-breaks" class="tour-section">
        <div class="tour-section-head">
          <p class="tour-kicker">Rule-break list</p>
          <h2>See which mistakes are repeating and where they show up</h2>
          <p>Rule breaks stop being vague when they are tracked by frequency, severity, and impact on execution.</p>
        </div>

        <div class="rule-grid">
          <article v-for="item in ruleBreaks" :key="item.title" class="tour-card rule-card">
            <div class="rule-card-head">
              <div>
                <small>Pattern flagged</small>
                <h3>{{ item.title }}</h3>
              </div>
              <span class="severity-chip" :class="item.severity.toLowerCase()">{{ item.severity }}</span>
            </div>
            <p class="rule-meta">{{ item.sessions }}</p>
            <p class="rule-impact">{{ item.impact }}</p>
          </article>
        </div>
      </section>

      <section id="emotion-analytics" class="tour-section">
        <div class="tour-section-head">
          <p class="tour-kicker">Emotion analytics</p>
          <h2>Track the behavior behind the trade</h2>
          <p>Use emotion tagging to connect discipline shifts with actual outcomes instead of relying on memory.</p>
        </div>

        <div class="emotion-grid">
          <article class="tour-card emotion-card">
            <div class="panel-head">
              <div>
                <small>Emotion mix</small>
                <h3>Last 20 sessions</h3>
              </div>
            </div>

            <div class="emotion-bars">
              <div v-for="item in emotionRows" :key="item.label" class="emotion-row">
                <div class="emotion-row-meta">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.share }}</strong>
                </div>
                <div class="emotion-row-track">
                  <i :class="item.tone" :style="{ width: item.width }" />
                </div>
              </div>
            </div>
          </article>

          <article class="tour-card emotion-card">
            <div class="panel-head">
              <div>
                <small>Behavior review</small>
                <h3>What this reveals</h3>
              </div>
            </div>

            <ul class="behavior-list">
              <li v-for="note in behaviorNotes" :key="note">{{ note }}</li>
            </ul>
          </article>
        </div>
      </section>

      <section id="calendar" class="tour-section">
        <div class="tour-section-head">
          <p class="tour-kicker">Calendar</p>
          <h2>Review sessions visually over time</h2>
          <p>Use the month view to spot discipline streaks, weak clusters, and the sessions that deserve deeper review.</p>
        </div>

        <div class="tour-card calendar-card">
          <div class="calendar-head">
            <div>
              <small>Session calendar</small>
              <h3>March 2026</h3>
            </div>
            <span>Daily execution score</span>
          </div>

          <div class="calendar-scroll">
            <div class="calendar-weekdays">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            <div class="calendar-grid">
              <div
                v-for="cell in calendarDays"
                :key="`${cell.day}-${cell.score}`"
                class="calendar-cell"
                :class="cell.state"
              >
                <span class="calendar-day">{{ cell.day }}</span>
                <strong v-if="cell.score">{{ cell.score }}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="tour-footer-cta">
        <div class="tour-card footer-card">
          <p class="tour-kicker">Ready to start?</p>
          <h2>Set up your first session journal and start reviewing with structure.</h2>
          <div class="tour-hero-actions">
            <a class="tour-btn solid" href="/register">
              Start Free
              <ArrowRight class="h-4 w-4" />
            </a>
            <a class="tour-btn ghost" href="/">Back to landing page</a>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped>
.tour-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 0% 0%, rgba(45, 137, 96, 0.2), transparent 28%),
    radial-gradient(circle at 100% 0%, rgba(208, 178, 98, 0.12), transparent 24%),
    linear-gradient(180deg, #040a08 0%, #07110d 100%);
  color: #ecf5ef;
}

.tour-skip-link {
  position: absolute;
  left: 1rem;
  top: 1rem;
  z-index: 30;
  transform: translateY(-220%);
  border-radius: 0.72rem;
  background: #f1f8f3;
  color: #082317;
  padding: 0.72rem 0.94rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.28);
}

.tour-skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid rgba(95, 221, 160, 0.82);
  outline-offset: 2px;
}

:global(html) {
  scroll-behavior: smooth;
}

:global(body) {
  margin: 0;
}

.tour-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(112, 149, 131, 0.16) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(112, 149, 131, 0.14) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: radial-gradient(circle at 50% 12%, black, transparent 74%);
  pointer-events: none;
}

.tour-glow {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.tour-glow-a {
  width: 420px;
  height: 420px;
  top: -180px;
  left: -120px;
  background: radial-gradient(circle, rgba(68, 199, 138, 0.18), transparent 72%);
}

.tour-glow-b {
  width: 380px;
  height: 380px;
  right: -120px;
  bottom: 10%;
  background: radial-gradient(circle, rgba(216, 180, 102, 0.12), transparent 72%);
}

.tour-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  width: min(1240px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 1rem 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.tour-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  text-decoration: none;
}

.tour-brand-mark {
  width: 2rem;
  height: 2rem;
  border-radius: 0.62rem;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #5fe1a6, #2d8e63);
  color: #082317;
  font-family: var(--font-display);
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.tour-brand-text {
  color: #f1f8f3;
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
}

.tour-topbar-actions {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.tour-link,
.tour-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.42rem;
  border-radius: 0.8rem;
  text-decoration: none;
  font-family: var(--font-body);
  font-weight: 700;
  transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
}

.tour-link {
  border: 1px solid rgba(108, 154, 131, 0.18);
  background: rgba(12, 24, 19, 0.82);
  color: #d8e8df;
  padding: 0.64rem 0.9rem;
  font-size: 0.85rem;
}

.tour-link:hover,
.tour-btn:hover {
  transform: translateY(-1px);
}

.tour-brand:focus-visible,
.tour-link:focus-visible,
.tour-btn:focus-visible,
.tour-sidebar-nav a:focus-visible,
.workspace-nav-preview a:focus-visible {
  outline: 2px solid rgba(125, 215, 172, 0.86);
  outline-offset: 3px;
}

.tour-shell {
  position: relative;
  z-index: 1;
  width: min(1240px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 2.1rem 0 4rem;
}

.tour-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 300px);
  gap: 1rem;
  align-items: start;
}

.tour-hero-copy,
.tour-sidebar,
.tour-card {
  border: 1px solid rgba(109, 152, 131, 0.18);
  border-radius: 1.1rem;
  background:
    linear-gradient(180deg, rgba(13, 25, 20, 0.92), rgba(8, 16, 13, 0.96)),
    rgba(255, 255, 255, 0.02);
  box-shadow: 0 20px 52px rgba(0, 0, 0, 0.26);
}

.tour-hero-copy {
  padding: 1.4rem;
}

.tour-sidebar-wrap {
  display: grid;
  gap: 0.8rem;
}

.tour-sidebar {
  padding: 1rem;
  position: sticky;
  top: 4.8rem;
}

.tour-sidebar.secondary {
  top: 18.2rem;
}

.tour-kicker {
  margin: 0;
  color: #8fddb6;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.tour-hero h1,
.tour-section-head h2,
.footer-card h2 {
  margin: 0.6rem 0 0;
  font-family: var(--font-display);
  letter-spacing: -0.03em;
  line-height: 1.04;
}

.tour-hero h1 {
  font-size: clamp(2.2rem, 5vw, 4rem);
  max-width: 13ch;
}

.tour-subtitle,
.tour-section-head p,
.proof-copy {
  margin: 0.9rem 0 0;
  color: #a7beb1;
  line-height: 1.68;
  font-size: 0.98rem;
  max-width: 60ch;
}

.tour-hero-actions {
  margin-top: 1.2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  align-items: center;
}

.tour-btn {
  padding: 0.82rem 1.14rem;
  border: 1px solid transparent;
  font-size: 0.92rem;
}

.tour-btn.solid {
  background: linear-gradient(135deg, #58db9f, #2d8e63);
  color: #082418;
}

.tour-btn.ghost {
  border-color: rgba(108, 154, 131, 0.2);
  background: rgba(12, 24, 19, 0.82);
  color: #e4efe8;
}

.tour-demo-note {
  color: #9fb6aa;
  font-size: 0.84rem;
}

.tour-proof-row {
  margin-top: 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.tour-proof-row span {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  border: 1px solid rgba(109, 152, 131, 0.18);
  border-radius: 999px;
  background: rgba(15, 29, 23, 0.86);
  padding: 0.52rem 0.78rem;
  color: #d9e9df;
  font-size: 0.8rem;
  font-weight: 600;
}

.tour-proof-row svg,
.tour-sidebar-nav svg {
  color: #7dd7ac;
}

.tour-sidebar-label {
  margin: 0;
  color: #9db7aa;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.tour-sidebar-nav {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.55rem;
}

.tour-sidebar-nav a {
  display: flex;
  align-items: center;
  gap: 0.58rem;
  border-radius: 0.84rem;
  border: 1px solid rgba(108, 154, 131, 0.14);
  background: rgba(14, 26, 21, 0.86);
  padding: 0.72rem 0.8rem;
  color: #e4efe8;
  text-decoration: none;
  font-weight: 600;
}

.workspace-nav-preview {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.55rem;
}

.workspace-nav-preview a {
  display: grid;
  gap: 0.18rem;
  border-radius: 0.84rem;
  border: 1px solid rgba(108, 154, 131, 0.14);
  background: rgba(14, 26, 21, 0.86);
  padding: 0.76rem 0.82rem;
  color: #dcebe3;
  text-decoration: none;
}

.workspace-nav-preview a.active {
  border-color: rgba(106, 169, 136, 0.26);
  background: rgba(21, 47, 36, 0.94);
}

.workspace-nav-preview strong {
  font-size: 0.9rem;
}

.workspace-nav-preview span {
  color: #97b2a3;
  font-size: 0.78rem;
  line-height: 1.42;
}

.tour-section {
  margin-top: 1rem;
}

.tour-section-head {
  margin-bottom: 0.85rem;
}

.tour-card {
  padding: 1rem;
}

.dashboard-shell {
  display: grid;
  grid-template-columns: minmax(210px, 240px) minmax(0, 1fr);
  gap: 0.95rem;
}

.mock-sidebar {
  border: 1px solid rgba(109, 152, 131, 0.14);
  border-radius: 0.92rem;
  background: rgba(11, 21, 17, 0.88);
  padding: 0.9rem;
}

.mock-sidebar-title {
  margin: 0;
  color: #96b0a2;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.mock-sidebar-links {
  margin-top: 0.82rem;
  display: grid;
  gap: 0.46rem;
}

.mock-sidebar-links article {
  border-radius: 0.76rem;
  padding: 0.65rem 0.76rem;
  font-weight: 600;
  background: rgba(15, 31, 24, 0.7);
  display: grid;
  gap: 0.16rem;
}

.mock-sidebar-links article strong {
  color: #dcebe3;
  font-size: 0.88rem;
}

.mock-sidebar-links article span {
  color: #8fa99c;
  font-size: 0.76rem;
  line-height: 1.42;
}

.mock-sidebar-links article.active {
  border: 1px solid rgba(106, 169, 136, 0.22);
  background: rgba(23, 50, 38, 0.92);
}

.mock-sidebar-links article.active strong {
  color: #f0f8f3;
}

.dashboard-main {
  display: grid;
  gap: 0.9rem;
}

.dashboard-main-head,
.panel-head,
.calendar-head,
.table-head,
.rule-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.dashboard-main-head small,
.panel-head small,
.calendar-head small,
.table-head small,
.rule-card-head small {
  display: block;
  color: #97b2a3;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.dashboard-main-head h3,
.panel-head h4,
.panel-head h3,
.calendar-head h3,
.rule-card-head h3 {
  margin: 0.36rem 0 0;
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}

.status-chip,
.severity-chip {
  border-radius: 999px;
  padding: 0.45rem 0.72rem;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-chip {
  border: 1px solid rgba(108, 154, 131, 0.18);
  background: rgba(17, 37, 28, 0.88);
  color: #dbede4;
}

.status-chip.live {
  background: rgba(24, 58, 42, 0.92);
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
}

.metric-tile {
  border: 1px solid rgba(109, 152, 131, 0.14);
  border-radius: 0.9rem;
  background: rgba(10, 19, 15, 0.88);
  padding: 0.82rem;
}

.metric-tile small {
  display: block;
  color: #9cb6a8;
  font-size: 0.74rem;
}

.metric-tile strong {
  display: block;
  margin-top: 0.3rem;
  font-size: 1.26rem;
  font-family: var(--font-display);
}

.metric-tile strong.good,
.review-status-row strong.good {
  color: #69d9a6;
}

.metric-tile strong.warn,
.review-status-row strong.warn,
.severity-chip.high {
  color: #ddb56b;
}

.metric-tile strong.neutral {
  color: #edf6f0;
}

.metric-tile span {
  display: block;
  margin-top: 0.36rem;
  color: #90a79a;
  line-height: 1.46;
  font-size: 0.8rem;
}

.dashboard-panels,
.emotion-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(280px, 0.8fr);
  gap: 0.8rem;
}

.dashboard-panel,
.emotion-card {
  border: 1px solid rgba(109, 152, 131, 0.14);
  border-radius: 0.96rem;
  background: rgba(9, 19, 15, 0.88);
  padding: 0.9rem;
}

.dashboard-panel.compact {
  display: grid;
  align-content: start;
}

.bar-chart {
  margin-top: 0.9rem;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.6rem;
  align-items: end;
}

.bar-column {
  display: grid;
  justify-items: center;
  gap: 0.42rem;
}

.bar-value {
  color: #dbe8e1;
  font-size: 0.76rem;
  font-weight: 700;
}

.bar-track {
  width: 100%;
  min-height: 150px;
  border-radius: 999px;
  background: rgba(84, 107, 96, 0.22);
  position: relative;
  overflow: hidden;
}

.bar-track i {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  display: block;
}

.bar-track i.good {
  background: linear-gradient(180deg, #65e0aa, #2d8e63);
}

.bar-track i.warn {
  background: linear-gradient(180deg, #e0c17a, #a8792a);
}

.bar-column small {
  color: #96afa2;
  font-size: 0.74rem;
}

.review-status {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.65rem;
}

.review-status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  border-bottom: 1px solid rgba(109, 152, 131, 0.12);
  padding-bottom: 0.65rem;
}

.review-status-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.review-status-row span {
  color: #dbe8e1;
}

.session-card {
  display: grid;
  gap: 0.9rem;
}

.session-focus {
  border: 1px solid rgba(109, 152, 131, 0.16);
  border-radius: 0.9rem;
  background: rgba(13, 28, 22, 0.9);
  padding: 0.95rem;
}

.session-focus small {
  display: block;
  color: #97b2a3;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.session-focus strong {
  display: block;
  margin-top: 0.36rem;
  font-size: 1.1rem;
  font-family: var(--font-display);
}

.session-focus p {
  margin: 0.46rem 0 0;
  color: #a7beb1;
  line-height: 1.58;
}

.session-checklist {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.session-check-item {
  display: flex;
  align-items: flex-start;
  gap: 0.62rem;
  border: 1px solid rgba(109, 152, 131, 0.14);
  border-radius: 0.9rem;
  background: rgba(10, 19, 15, 0.88);
  padding: 0.86rem;
}

.session-check-item i {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  margin-top: 0.36rem;
  flex: 0 0 auto;
}

.session-check-item i.ready {
  background: #58db9f;
}

.session-check-item i.watch {
  background: #ddb56b;
}

.session-check-item strong {
  display: block;
  color: #ecf5ef;
}

.session-check-item p {
  margin: 0.28rem 0 0;
  color: #a7beb1;
  line-height: 1.54;
}

.table-card {
  overflow: hidden;
}

.table-head span {
  color: #97b2a3;
  font-size: 0.8rem;
}

.trade-table {
  margin-top: 0.85rem;
  display: grid;
}

.trade-table-row {
  display: grid;
  grid-template-columns: 0.7fr 1.1fr 0.9fr 0.65fr 0.7fr 0.8fr 1.5fr;
  gap: 0.8rem;
  align-items: start;
  padding: 0.82rem 0;
  border-bottom: 1px solid rgba(109, 152, 131, 0.12);
}

.trade-table-row:last-child {
  border-bottom: 0;
}

.trade-table-headings {
  color: #97b2a3;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  padding-top: 0;
}

.trade-table-row span,
.trade-table-row strong {
  color: #e7f1eb;
  font-size: 0.86rem;
  line-height: 1.52;
}

.trade-table-row strong.good {
  color: #69d9a6;
}

.trade-table-row strong.warn {
  color: #ddb56b;
}

.trade-note {
  color: #a7beb1 !important;
}

.rule-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.rule-card {
  display: grid;
  gap: 0.8rem;
}

.severity-chip.medium {
  color: #e6d099;
  background: rgba(65, 54, 22, 0.84);
}

.severity-chip.low {
  color: #b9ddca;
  background: rgba(22, 54, 39, 0.84);
}

.rule-meta {
  margin: 0;
  color: #d9e9df;
  font-weight: 700;
}

.rule-impact {
  margin: 0;
  color: #9fb6aa;
  line-height: 1.58;
}

.emotion-bars {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.76rem;
}

.emotion-row {
  display: grid;
  gap: 0.4rem;
}

.emotion-row-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.emotion-row-meta span {
  color: #e6f0ea;
}

.emotion-row-track {
  height: 0.44rem;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(84, 107, 96, 0.22);
}

.emotion-row-track i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.emotion-row-track i.good {
  background: linear-gradient(90deg, #65e0aa, #2d8e63);
}

.emotion-row-track i.warn {
  background: linear-gradient(90deg, #e0c17a, #a8792a);
}

.emotion-row-track i.danger {
  background: linear-gradient(90deg, #e98d79, #bb5343);
}

.behavior-list {
  margin: 0.9rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.75rem;
}

.behavior-list li {
  position: relative;
  padding-left: 1rem;
  color: #d9e9df;
  line-height: 1.58;
}

.behavior-list li::before {
  content: '';
  position: absolute;
  top: 0.42rem;
  left: 0;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: #5ad79e;
}

.calendar-card {
  display: grid;
  gap: 0.9rem;
}

.calendar-head span {
  color: #9fb6aa;
  font-size: 0.8rem;
}

.calendar-weekdays,
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.55rem;
}

.calendar-scroll {
  overflow-x: auto;
}

.calendar-scroll .calendar-weekdays,
.calendar-scroll .calendar-grid {
  min-width: 720px;
}

.calendar-weekdays span {
  color: #8fa99c;
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.calendar-cell {
  min-height: 88px;
  border-radius: 0.86rem;
  border: 1px solid rgba(109, 152, 131, 0.12);
  padding: 0.72rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: rgba(11, 21, 17, 0.88);
}

.calendar-cell.good {
  background: linear-gradient(180deg, rgba(20, 54, 39, 0.96), rgba(10, 24, 18, 0.96));
}

.calendar-cell.warn {
  background: linear-gradient(180deg, rgba(61, 45, 19, 0.96), rgba(21, 17, 11, 0.96));
}

.calendar-cell.off,
.calendar-cell.empty {
  background: rgba(8, 14, 11, 0.76);
}

.calendar-day {
  color: #f0f8f3;
  font-weight: 700;
}

.calendar-cell strong {
  color: #eaf5ef;
  font-family: var(--font-display);
  font-size: 1rem;
}

.tour-footer-cta {
  margin-top: 1rem;
}

.footer-card {
  text-align: center;
  padding: 1.3rem;
}

.footer-card h2 {
  font-size: clamp(1.8rem, 4vw, 2.8rem);
}

.footer-card .tour-hero-actions {
  justify-content: center;
}

@media (max-width: 1080px) {
  .tour-hero,
  .dashboard-shell,
  .dashboard-panels,
  .emotion-grid {
    grid-template-columns: 1fr;
  }

  .metric-grid,
  .rule-grid,
  .session-checklist {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .tour-sidebar {
    position: static;
  }

  .trade-table-row {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .tour-topbar,
  .tour-shell {
    width: min(1240px, calc(100% - 1.2rem));
  }

  .tour-topbar {
    padding-top: 0.7rem;
    align-items: flex-start;
    flex-direction: column;
  }

  .metric-grid,
  .rule-grid,
  .session-checklist {
    grid-template-columns: 1fr;
  }

  .trade-table-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .trade-table-headings {
    display: none;
  }

  .calendar-cell {
    min-height: 72px;
  }
}
</style>
