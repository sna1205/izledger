<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  Activity,
  BrainCircuit,
  CalendarDays,
  Flag,
  ShieldCheck,
  Sparkles,
} from 'lucide-vue-next'

const scrolled = ref(false)
let revealObserver: IntersectionObserver | null = null

const nav = [
  { label: 'Platform', href: '#platform' },
  { label: 'Method', href: '#method' },
  { label: 'FAQ', href: '#faq' },
]

const previewTabs = ['Dashboard', 'Sessions', 'Trades', 'Rule Breaks', 'Emotion Analytics', 'Calendar', 'Settings']

const sessionCommandChecklist = [
  {
    label: 'Bias locked',
    detail: 'Short only on failed reclaim below VWAP',
    state: 'ready',
  },
  {
    label: 'Risk cap active',
    detail: '0.50% risk per trade with 1.50% daily max',
    state: 'ready',
  },
  {
    label: 'News filter',
    detail: 'No new entries inside the 10:00 ET event window',
    state: 'watch',
  },
  {
    label: 'Exit plan set',
    detail: 'Scale at 1R and flatten on thesis failure',
    state: 'ready',
  },
]

const heroStats = [
  { k: 'Execution score', v: '91 / 100', tone: 't-good' },
  { k: 'Rule breaks', v: '1 flagged', tone: 't-warn' },
  { k: 'A setups taken', v: '5 / 6', tone: '' },
  { k: 'Session result', v: '+2.4R', tone: 't-good' },
]

const heroWorkflow = [
  {
    title: 'Pre-session checklist locked',
    body: 'Risk, bias, and invalidation were confirmed before the open.',
  },
  {
    title: 'Trade logged with context',
    body: 'ES short tagged with setup grade, screenshots, and execution notes.',
  },
  {
    title: 'Review queue prepared',
    body: 'Emotion tags and rule-break checks are ready for the post-session review.',
  },
]

const disciplinePulse = [
  { label: 'Rule compliance', value: '97%', width: '97%', tone: 'good' },
  { label: 'Plan adherence', value: '89%', width: '89%', tone: 'good' },
  { label: 'Impulse entries', value: '1 flag', width: '28%', tone: 'warn' },
]

const problemPoints = [
  {
    pain: 'Behavior never gets reviewed',
    explanation: 'Many traders log entries and exits, then never study the decisions behind them.',
  },
  {
    pain: 'Rule breaks keep repeating',
    explanation: 'Without visible tracking, the same execution mistakes show up across sessions.',
  },
  {
    pain: 'Emotions stay vague',
    explanation: 'Hesitation, revenge, and overconfidence are felt in the moment but rarely measured clearly.',
  },
  {
    pain: 'P/L hides weak execution',
    explanation: 'A green day can still reinforce bad habits if review stops at profit alone.',
  },
]

const problemSolutionSummary =
  'IZLedger turns each session into a structured review loop with behavior tracking, rule-break visibility, and execution scoring that helps traders improve the process behind the result.'

const insideShowcases = [
  {
    eyebrow: 'Trade capture',
    image: '/images/landing/izledger-trade-log.png',
    alt: 'IZLedger Execute Log trade logging interface',
    title: 'Log trades with context',
    body: 'Capture the full trade story while the session is still fresh, including setup quality, risk, screenshots, and decision notes.',
    workflow: [
      'Select account, market, and setup before saving the trade.',
      'Attach screenshots, execution notes, and emotional context in one entry.',
      'Tag the trade by session, playbook, and discipline score for later review.',
    ],
    metric: {
      value: '< 45 sec',
      label: 'Average time to complete a structured trade entry',
      detail: 'Faster logging means traders actually keep the journal current.',
    },
    previewLabel: 'Trade Log',
    previewMeta: 'Session 14 · ES · Opening Drive',
    previewChips: ['Execution notes', 'Chart screenshot', 'Rule check'],
    reverse: false,
  },
  {
    eyebrow: 'Performance review',
    image: '/images/landing/izledger-performance-dashboard.png',
    alt: 'IZLedger Overview Dashboard with performance analytics',
    title: 'Understand your trading performance',
    body: 'Turn raw journal data into a performance view traders can actually act on, from expectancy to setup quality and session consistency.',
    workflow: [
      'Review win rate, expectancy, and average R across accounts or periods.',
      'Filter by setup, session, or account to see where performance actually comes from.',
      'Spot when strong P/L is masking weak execution before it becomes expensive.',
    ],
    metric: {
      value: '+0.6R',
      label: 'Weekly expectancy lift after removing low-quality setups',
      detail: 'The dashboard ties results back to decision quality, not just outcome.',
    },
    previewLabel: 'Performance Dashboard',
    previewMeta: 'Last 20 sessions · Account comparison',
    previewChips: ['Expectancy', 'Setup grade', 'Risk consistency'],
    reverse: true,
  },
  {
    eyebrow: 'Behavior analytics',
    image: '/images/landing/izledger-behavior-analytics.png',
    alt: 'IZLedger Emotion Analytics dashboard',
    title: 'Analyze the behavior behind your trades',
    body: 'See which emotions, habits, and repeated mistakes are driving your trades so review turns into actual behavior change.',
    workflow: [
      'Track confidence, hesitation, revenge, and focus alongside each trade or session.',
      'Surface recurring rule-break patterns by time, setup, and emotional state.',
      'Use the review to tighten routines and remove the behaviors that keep repeating.',
    ],
    metric: {
      value: '3 repeat patterns',
      label: 'Detected across the last 10 sessions',
      detail: 'Behavior tags make recurring discipline leaks visible instead of anecdotal.',
    },
    previewLabel: 'Behavior View',
    previewMeta: 'Emotion analytics · Rule-break clusters',
    previewChips: ['Emotion tags', 'Rule-break map', 'Execution score'],
    reverse: false,
  },
  {
    eyebrow: 'Session replay',
    image: '/images/landing/izledger-trading-calendar.png',
    alt: 'IZLedger trading calendar with daily execution tracking',
    title: 'Review sessions visually with calendar',
    body: 'Use the calendar to replay consistency over time, spot discipline streaks, and jump straight into the sessions that need review.',
    workflow: [
      'Scan the month by outcome, execution score, and rule-break intensity.',
      'Open any trading day to review trades, notes, and missed opportunities in context.',
      'Use the pattern view to compare strong weeks against weak ones and adjust routines.',
    ],
    metric: {
      value: '28-day view',
      label: 'Clear read on consistency, not just isolated winners',
      detail: 'Calendar review helps traders audit routines at the session level.',
    },
    previewLabel: 'Session Calendar',
    previewMeta: 'March review · New York and London sessions',
    previewChips: ['Daily score', 'Session replay', 'Streak tracking'],
    reverse: true,
  },
]

const differentiationPillars = [
  {
    icon: Activity,
    title: 'Execution scoring',
    contrast: 'Most journals record outcomes. IZLedger scores how well the trade was actually executed.',
    body: 'Review plan quality, risk control, and discipline per trade so a green day does not hide bad process.',
    label: 'Score the process, not just the result',
  },
  {
    icon: Flag,
    title: 'Rule-break tracking',
    contrast: 'Most journals rely on memory. IZLedger makes repeated mistakes visible across sessions.',
    body: 'Tag broken rules, review recurring failures, and turn costly habits into something you can measure and reduce.',
    label: 'Spot repeat mistakes faster',
  },
  {
    icon: BrainCircuit,
    title: 'Behavior analytics',
    contrast: 'Most journals miss the emotional context behind good and bad decisions.',
    body: 'Track hesitation, revenge, confidence, and focus so behavioral patterns become part of the review workflow.',
    label: 'Make emotions reviewable',
  },
  {
    icon: CalendarDays,
    title: 'Session-based review',
    contrast: 'Most journals isolate trades. IZLedger helps traders review complete sessions and routines over time.',
    body: 'Study the full day with calendar context, session summaries, and streaks instead of disconnected trade entries.',
    label: 'Review the day as a system',
  },
  {
    icon: ShieldCheck,
    title: 'Discipline-first approach',
    contrast: 'Most journals are built around analytics dashboards. IZLedger is built around daily trading discipline.',
    body: 'The workflow starts with structure, readiness, and review so better habits become the product, not a side effect.',
    label: 'Built for disciplined traders',
  },
]

const audience = [
  {
    title: 'Day Traders',
    body: 'Track intraday decisions and improve execution one session at a time.',
  },
  {
    title: 'Prop Firm Traders',
    body: 'Stay disciplined, respect constraints, and review rule adherence under pressure.',
  },
  {
    title: 'Developing Traders',
    body: 'Build consistent habits with a structured process from planning to review.',
  },
]

const method = [
  {
    n: '01',
    title: 'Prepare',
    body: 'Define bias, risk limits, and your trading plan before execution.',
  },
  {
    n: '02',
    title: 'Execute',
    body: 'Log trades and capture decision context while the market is live.',
  },
  {
    n: '03',
    title: 'Review',
    body: 'Analyze behavior, execution quality, and rule adherence after session close.',
  },
  {
    n: '04',
    title: 'Improve',
    body: 'Identify mistakes and refine process rules for the next trading day.',
  },
]

const socialProofMetrics = [
  {
    value: '47',
    label: 'active beta traders',
    detail: 'Using IZLedger in daily review workflows',
  },
  {
    value: '6d / wk',
    label: 'average review cadence',
    detail: 'Sessions are being reviewed consistently, not just logged',
  },
  {
    value: '3 min',
    label: 'to start a first journal',
    detail: 'Fast enough to fit into a live trading workflow',
  },
]

const credibilityBadges = ['Prop challenge workflow ready', 'Built with active trader feedback', 'Used for daily review routines']

const testimonials = [
  {
    quote:
      'The biggest difference is that I can review why I traded badly, not just whether the day finished green or red.',
    name: 'Marcus T.',
    role: 'Futures day trader',
  },
  {
    quote:
      'The rule-break tracking makes recurring mistakes obvious. That alone changes how I prepare for the next session.',
    name: 'Elena R.',
    role: 'Prop firm evaluation trader',
  },
  {
    quote:
      'Most journals feel like archives. IZLedger feels like an actual daily review system built around execution.',
    name: 'Jay P.',
    role: 'Intraday index trader',
  },
]

const pricingPlans = [
  {
    name: 'Free',
    audience: 'For traders starting a consistent review habit',
    price: '$0',
    cadence: '/month',
    badge: '',
    summary: 'Start journaling trades with enough structure to build a repeatable review routine.',
    features: ['Trade logging', 'Basic analytics', 'Calendar review', 'Session notes'],
    limits: ['90 days of history', 'Single workspace', 'Core dashboard only'],
    cta: 'Start Free',
    href: '/register',
  },
  {
    name: 'Pro',
    audience: 'For serious traders optimizing discipline and execution quality',
    price: '$24',
    cadence: '/month',
    badge: 'Most Popular',
    summary: 'Unlock deeper review tools built to reduce rule breaks and improve session-level execution.',
    features: [
      'Unlimited history',
      'Execution score',
      'Behavior analytics',
      'Rule-break detection',
      'Advanced dashboards',
    ],
    limits: ['Multiple review workflows', 'Priority feature access', 'Expanded session analysis'],
    cta: 'Start Free - Upgrade later',
    href: '/register',
  },
]

const faqs = [
  {
    q: 'Is my data secure?',
    a: 'Yes. IZLedger is designed around a private workspace per user, encrypted transport, and account-scoped access so your trade history and review notes stay isolated to your account.',
  },
  {
    q: 'What markets are supported?',
    a: 'IZLedger is built for mixed trading workflows, including futures, forex, equities, indices, and crypto. The review system is designed around execution and behavior, so it works across instruments instead of forcing one market-specific setup.',
  },
  {
    q: 'Can I track multiple accounts?',
    a: 'Yes. You can track multiple trading accounts and review performance by account, session, or setup. This is especially useful for traders balancing personal accounts, funded accounts, or evaluation accounts.',
  },
  {
    q: 'What is included in Free vs Pro?',
    a: 'Free gives you structured trade logging, basic analytics, calendar review, and limited history so you can build the habit. Pro adds unlimited history, execution scoring, behavior analytics, rule-break detection, and more advanced review dashboards.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. If you upgrade to Pro, you can cancel anytime. The goal is to make upgrading feel low risk and keep the product earned through daily usefulness, not lock-in.',
  },
  {
    q: 'Can I import trades later?',
    a: 'Yes. Manual logging works today, and the product is being structured so traders can layer in imports later without losing the review context that makes the journal useful.',
  },
  {
    q: 'Do you support MT4/MT5/cTrader imports?',
    a: 'Not yet as a full public workflow. Platform import support for MT4, MT5, and cTrader is planned, and the current journal flow is designed so traders can start reviewing sessions now and add import-based workflows later.',
  },
]

const openFaqIndex = ref(0)

function faqButtonId(index: number): string {
  return `landing-faq-trigger-${index}`
}

function faqPanelId(index: number): string {
  return `landing-faq-panel-${index}`
}

function toggleFaq(index: number) {
  openFaqIndex.value = openFaqIndex.value === index ? -1 : index
}

function focusFaqButton(index: number) {
  if (typeof document === 'undefined') return
  const button = document.getElementById(faqButtonId(index)) as HTMLButtonElement | null
  button?.focus()
}

function onFaqKeydown(index: number, event: KeyboardEvent) {
  const lastIndex = faqs.length - 1

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    focusFaqButton(index === lastIndex ? 0 : index + 1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    focusFaqButton(index === 0 ? lastIndex : index - 1)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    focusFaqButton(0)
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    focusFaqButton(lastIndex)
  }
}

function onScroll() {
  scrolled.value = window.scrollY > 10
}

function setupRevealEffects() {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
  if (!nodes.length) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    nodes.forEach((node) => node.classList.add('is-visible'))
    return
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-visible')
        revealObserver?.unobserve(entry.target)
      })
    },
    {
      threshold: 0.18,
      rootMargin: '0px 0px -8% 0px',
    },
  )

  nodes.forEach((node) => revealObserver?.observe(node))
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  setupRevealEffects()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  revealObserver?.disconnect()
})
</script>

<template>
  <div class="lp">
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <header class="nav" :class="{ scrolled }">
      <div class="container nav-inner">
        <a href="#top" class="brand" aria-label="IZLedger home">
          <span class="mark">IZ</span>
          <span class="wordmark">IZLedger</span>
        </a>

        <nav class="nav-links" aria-label="Primary navigation">
          <a v-for="item in nav" :key="item.label" :href="item.href">{{ item.label }}</a>
        </nav>

        <div class="nav-cta">
          <a class="btn ghost desktop-only" href="/login">Log in</a>
          <a class="btn solid" href="/register">Start Free</a>
        </div>
      </div>
    </header>

    <main id="main-content" tabindex="-1">
      <section class="hero" id="top" aria-labelledby="landing-hero-title">
        <div class="bg-grid" />
        <div class="bg-chart" />
        <div class="blob blob-a" />
        <div class="blob blob-b" />

        <div class="container hero-layout">
          <div class="hero-copy" data-reveal>
            <p class="cred-line">For day traders and prop firm traders who want cleaner execution.</p>
            <h1 id="landing-hero-title">Track execution, reduce rule breaks, and review every session with structure.</h1>
            <p class="sub">
              IZLedger is a behavior-first trading journal built to help traders log context, score discipline, and
              turn every session into measurable improvement instead of another P/L screenshot.
            </p>

            <div class="actions">
              <a class="btn solid big glow" href="/register">Start Free &ndash; No card required</a>
              <a class="btn ghost big" href="/product-tour">View product tour</a>
            </div>

            <p class="pricing-line">Set up your first session journal in under 3 minutes.</p>

            <div class="hero-trust-strip" aria-label="Core product capabilities">
              <span>Execution scoring</span>
              <span>Rule-break tracking</span>
              <span>Session-based review</span>
            </div>
          </div>

          <article class="hero-preview" data-reveal aria-label="IZLedger product dashboard preview">
            <div class="preview-topbar">
              <div class="preview-branding">
                <span class="preview-logo">IZ</span>
                <div>
                  <strong>IZLedger Workspace</strong>
                  <span>Discipline-first trader review</span>
                </div>
              </div>

              <div class="preview-badges">
                <span class="preview-badge">New York Open</span>
                <span class="preview-badge muted">Apex Eval 50K</span>
              </div>
            </div>

            <div class="preview-tabs" aria-hidden="true">
              <span v-for="tab in previewTabs" :key="tab" :class="{ active: tab === 'Dashboard' }">
                {{ tab }}
              </span>
            </div>

            <div class="preview-grid">
              <section class="command-card">
                <div class="card-head">
                  <div>
                    <p>Live workflow</p>
                    <h2>Session Command Panel</h2>
                  </div>
                  <span class="status-pill">Ready to trade</span>
                </div>

                <div class="focus-card">
                  <span>Focus rule</span>
                  <strong>No revenge entries after first loss.</strong>
                  <p>All trades must match the opening-drive playbook and pre-defined invalidation.</p>
                </div>

                <div class="checkline">
                  <div class="checkline-head">Pre-session controls</div>
                  <ul>
                    <li
                      v-for="(item, idx) in sessionCommandChecklist"
                      :key="item.label"
                      :style="{ '--tick-delay': `${120 + idx * 120}ms` }"
                    >
                      <i :class="item.state" />
                      <div>
                        <strong>{{ item.label }}</strong>
                        <span>{{ item.detail }}</span>
                      </div>
                    </li>
                  </ul>
                </div>
              </section>

              <div class="preview-side">
                <section class="metric-card">
                  <div class="card-head compact">
                    <div>
                      <p>Today</p>
                      <h3>Execution snapshot</h3>
                    </div>
                    <span class="status-pill quiet">Updated 11:42 ET</span>
                  </div>

                  <div class="snap-grid">
                    <div v-for="stat in heroStats" :key="stat.k" class="stat-card">
                      <small>{{ stat.k }}</small>
                      <strong :class="stat.tone">{{ stat.v }}</strong>
                    </div>
                  </div>
                </section>

                <section class="workflow-card">
                  <div class="card-head compact">
                    <div>
                      <p>Review path</p>
                      <h3>What happens in one session</h3>
                    </div>
                  </div>

                  <ol>
                    <li v-for="item in heroWorkflow" :key="item.title">
                      <strong>{{ item.title }}</strong>
                      <span>{{ item.body }}</span>
                    </li>
                  </ol>
                </section>

                <section class="pulse-card">
                  <div class="card-head compact">
                    <div>
                      <p>Behavior metrics</p>
                      <h3>Discipline pulse</h3>
                    </div>
                  </div>

                  <div class="pulse-list">
                    <div v-for="item in disciplinePulse" :key="item.label" class="pulse-row">
                      <div class="pulse-meta">
                        <span>{{ item.label }}</span>
                        <strong :class="item.tone === 'warn' ? 't-warn' : 't-good'">{{ item.value }}</strong>
                      </div>
                      <div class="pulse-track">
                        <span :class="item.tone" :style="{ width: item.width }" />
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="section problem alt" id="problem">
        <div class="container problem-layout">
          <div class="section-head left" data-reveal>
            <p class="kicker">Problem</p>
            <h2>Most traders log activity without reviewing execution.</h2>
            <p>
              Logging is easy. Improving is harder when the journal does not make behavior, rule breaks, and session quality easy to review.
            </p>
          </div>

          <article class="problem-card lift-card" data-reveal>
            <div class="problem-table" role="list" aria-label="Trading review pain points">
              <div v-for="point in problemPoints" :key="point.pain" class="problem-row" role="listitem">
                <strong>{{ point.pain }}</strong>
                <span>{{ point.explanation }}</span>
              </div>
            </div>

            <div class="problem-summary">
              <small>How IZLedger solves it</small>
              <p>{{ problemSolutionSummary }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="section" id="inside">
        <div class="container">
          <div class="section-head" data-reveal>
            <p class="kicker">Inside IZLedger</p>
            <h2>What traders actually do inside IZLedger</h2>
            <p>Each workflow is built to make review faster, clearer, and more actionable for disciplined traders.</p>
          </div>

          <div class="inside-stack">
            <article
              v-for="(module, idx) in insideShowcases"
              :key="module.title"
              class="inside-showcase lift-card"
              :class="{ reverse: module.reverse }"
              data-reveal
              :style="{ '--reveal-delay': `${idx * 80}ms` }"
            >
              <div class="inside-media">
                <div class="inside-media-top">
                  <div class="window-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div class="inside-media-meta">
                    <strong>{{ module.previewLabel }}</strong>
                    <span>{{ module.previewMeta }}</span>
                  </div>
                </div>

                <div class="inside-media-frame">
                  <img :src="module.image" :alt="module.alt" loading="lazy" decoding="async" />
                </div>

                <div class="inside-media-foot">
                  <span v-for="chip in module.previewChips" :key="chip">{{ chip }}</span>
                </div>
              </div>

              <div class="inside-copy">
                <p class="inside-eyebrow">{{ module.eyebrow }}</p>
                <h3>{{ module.title }}</h3>
                <p>{{ module.body }}</p>

                <div class="inside-workflow">
                  <p class="inside-workflow-label">Mini workflow</p>
                  <ol>
                    <li v-for="(item, workflowIdx) in module.workflow" :key="item">
                      <span>{{ workflowIdx + 1 }}</span>
                      <p>{{ item }}</p>
                    </li>
                  </ol>
                </div>

                <div class="inside-metric">
                  <small>Outcome metric</small>
                  <strong>{{ module.metric.value }}</strong>
                  <p>{{ module.metric.label }}</p>
                  <span>{{ module.metric.detail }}</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section alt" id="platform">
        <div class="container">
          <div class="section-head" data-reveal>
            <p class="kicker">How IZLedger Is Different</p>
            <h2>Not just another trading journal</h2>
            <p>
              IZLedger is built for traders who want to improve execution quality, reduce repeat mistakes, and review
              discipline with more structure than a basic trade log.
            </p>
          </div>

          <div class="difference-grid">
            <article
              v-for="(pillar, idx) in differentiationPillars"
              :key="pillar.title"
              class="difference-card lift-card"
              data-reveal
              :style="{ '--reveal-delay': `${idx * 80}ms` }"
            >
              <div class="difference-top">
                <span class="difference-icon">
                  <component :is="pillar.icon" />
                </span>
                <span class="difference-label">{{ pillar.label }}</span>
              </div>

              <h3>{{ pillar.title }}</h3>

              <div class="difference-compare">
                <span>Most journals</span>
                <p>{{ pillar.contrast }}</p>
              </div>

              <div class="difference-solution">
                <span>IZLedger</span>
                <p>{{ pillar.body }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section" id="audience">
        <div class="container">
          <div class="section-head" data-reveal>
            <p class="kicker">Who It Is For</p>
            <h2>Built for serious retail traders</h2>
          </div>

          <div class="audience-grid">
            <article
              v-for="(item, idx) in audience"
              :key="item.title"
              class="audience-card lift-card"
              data-reveal
              :style="{ '--reveal-delay': `${idx * 80}ms` }"
            >
              <h3>{{ item.title }}</h3>
              <p>{{ item.body }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section alt" id="method">
        <div class="container">
          <div class="section-head" data-reveal>
            <p class="kicker">Method</p>
            <h2>The trading improvement loop</h2>
          </div>

          <div class="method-grid">
            <article
              v-for="(step, idx) in method"
              :key="step.n"
              class="method-card lift-card"
              data-reveal
              :style="{ '--reveal-delay': `${idx * 80}ms` }"
            >
              <span>{{ step.n }}</span>
              <h3>{{ step.title }}</h3>
              <p>{{ step.body }}</p>
            </article>
          </div>
        </div>
      </section>

      <section class="section proof" id="social">
        <div class="container proof-wrap" data-reveal>
          <p class="kicker">Credibility</p>
          <h2>Built with active trader feedback</h2>
          <p class="proof-copy">
            IZLedger is being shaped with input from active day traders and prop-style workflows focused on review,
            discipline, and session consistency.
          </p>

          <div class="proof-metrics">
            <article v-for="item in socialProofMetrics" :key="item.label" class="proof-metric-card">
              <strong>{{ item.value }}</strong>
              <span>{{ item.label }}</span>
              <p>{{ item.detail }}</p>
            </article>
          </div>

          <div class="proof-badges" aria-label="Product credibility badges">
            <span v-for="badge in credibilityBadges" :key="badge">
              <Sparkles class="proof-icon" />
              <span>{{ badge }}</span>
            </span>
          </div>

          <div class="testimonial-grid">
            <article v-for="item in testimonials" :key="item.name" class="testimonial-card">
              <p class="testimonial-quote">“{{ item.quote }}”</p>
              <div class="testimonial-meta">
                <strong>{{ item.name }}</strong>
                <span>{{ item.role }}</span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section alt" id="pricing">
        <div class="container">
          <div class="section-head" data-reveal>
            <p class="kicker">Pricing</p>
            <h2>Start free, upgrade when your review process gets deeper</h2>
            <p>
              Keep the first step simple. Start with structured journaling, then move to Pro when you want deeper
              execution review and behavior analytics.
            </p>
          </div>

          <div class="pricing-grid">
            <article
              v-for="(plan, idx) in pricingPlans"
              :key="plan.name"
              class="pricing-card lift-card"
              :class="{ featured: plan.badge }"
              data-reveal
              :style="{ '--reveal-delay': `${idx * 80}ms` }"
            >
              <div class="pricing-head">
                <div>
                  <p class="pricing-name">{{ plan.name }}</p>
                  <h3>{{ plan.audience }}</h3>
                </div>
                <span v-if="plan.badge" class="pricing-badge">{{ plan.badge }}</span>
              </div>

              <div class="pricing-price">
                <strong>{{ plan.price }}</strong>
                <span>{{ plan.cadence }}</span>
              </div>

              <p class="pricing-summary">{{ plan.summary }}</p>

              <a class="btn" :class="plan.badge ? 'solid big glow' : 'ghost big'" :href="plan.href">
                {{ plan.cta }}
              </a>

              <div class="pricing-block">
                <small>Included</small>
                <ul>
                  <li v-for="feature in plan.features" :key="feature">{{ feature }}</li>
                </ul>
              </div>

              <div class="pricing-block muted">
                <small>{{ plan.name === 'Free' ? 'Limits' : 'Upgrade path' }}</small>
                <ul>
                  <li v-for="limit in plan.limits" :key="limit">{{ limit }}</li>
                </ul>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="section alt" id="faq">
        <div class="container faq-layout">
          <div class="section-head left" data-reveal>
            <p class="kicker">FAQ</p>
            <h2>Questions traders ask before they start</h2>
            <p>
              The goal is to keep setup simple, protect your workspace, and make it easy to grow from manual review
              into a deeper journaling workflow.
            </p>
          </div>

          <div class="faq-list" data-reveal>
            <article
              v-for="(item, index) in faqs"
              :key="item.q"
              class="faq-item"
              :class="{ open: openFaqIndex === index }"
            >
              <h3 class="faq-question">
                <button
                  :id="faqButtonId(index)"
                  class="faq-trigger"
                  type="button"
                  :aria-expanded="openFaqIndex === index ? 'true' : 'false'"
                  :aria-controls="faqPanelId(index)"
                  @click="toggleFaq(index)"
                  @keydown="onFaqKeydown(index, $event)"
                >
                  <span>{{ item.q }}</span>
                  <span class="faq-icon" aria-hidden="true">+</span>
                </button>
              </h3>
              <div
                v-show="openFaqIndex === index"
                :id="faqPanelId(index)"
                class="faq-panel"
                role="region"
                :aria-labelledby="faqButtonId(index)"
              >
                <p>{{ item.a }}</p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="cta" id="final">
        <div class="container cta-wrap" data-reveal>
          <p class="kicker">Final Call</p>
          <h2>Raise your execution standard.</h2>
          <p>Start journaling with structure and turn your trades into data you can actually learn from.</p>

          <div class="actions center">
            <a class="btn solid big glow" href="/register">Start Free</a>
            <a class="btn ghost big" href="/login">Log in</a>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer" role="contentinfo">
      <div class="container foot-inner">
        <div>
          <strong>IZLedger</strong>
          <p>Discipline first. Data-backed execution.</p>
        </div>
        <span>All rights reserved</span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.lp {
  --lp-bg: #050d0a;
  --lp-bg-soft: #07130f;
  --lp-surface: #0b1914;
  --lp-surface-2: #10221b;
  --lp-ink: #ecf5ef;
  --lp-muted: #9ab0a5;
  --lp-line: rgba(89, 132, 111, 0.36);
  --lp-accent: #44c78a;
  --lp-accent-deep: #2d8e63;
  --lp-highlight: #d8b466;
  --lp-shadow: 0 20px 42px rgba(1, 6, 4, 0.44);
  color: var(--lp-ink);
  background:
    radial-gradient(circle at 8% -2%, rgba(66, 184, 124, 0.2), transparent 34%),
    radial-gradient(circle at 94% 14%, rgba(31, 76, 56, 0.5), transparent 33%),
    linear-gradient(180deg, #040b08 0%, #030806 100%);
}

.skip-link {
  position: absolute;
  left: 1rem;
  top: 1rem;
  z-index: 60;
  transform: translateY(-220%);
  border-radius: 0.72rem;
  background: #f1f8f3;
  color: #082317;
  padding: 0.72rem 0.94rem;
  font-weight: 700;
  text-decoration: none;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28);
}

.skip-link:focus-visible {
  transform: translateY(0);
  outline: 2px solid rgba(95, 221, 160, 0.85);
  outline-offset: 2px;
}

:global(html) {
  scroll-behavior: smooth;
}

:global(body) {
  margin: 0;
}

.container {
  width: min(1160px, calc(100% - 2.2rem));
  margin: 0 auto;
}

.nav {
  position: fixed;
  inset: 0 0 auto;
  z-index: 40;
  border-bottom: 1px solid transparent;
  transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
}

.nav.scrolled {
  border-color: var(--lp-line);
  background: rgba(9, 19, 15, 0.82);
  backdrop-filter: blur(12px);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.3);
}

.nav-inner {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.72rem;
  text-decoration: none;
}

.mark {
  width: 2rem;
  height: 2rem;
  border-radius: 0.58rem;
  background: linear-gradient(135deg, var(--lp-accent), var(--lp-accent-deep));
  color: #042414;
  display: grid;
  place-items: center;
  font-size: 0.72rem;
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.wordmark {
  color: var(--lp-ink);
  font-size: 1rem;
  font-family: var(--font-display);
  font-weight: 700;
  letter-spacing: -0.02em;
}

.nav-links {
  display: inline-flex;
  align-items: center;
  gap: 1.4rem;
}

.nav-links a {
  text-decoration: none;
  color: var(--lp-muted);
  font-size: 0.89rem;
  font-weight: 600;
  font-family: var(--font-body);
  transition: color 180ms ease;
}

.nav-links a:hover {
  color: var(--lp-ink);
}

.brand:focus-visible,
.nav-links a:focus-visible,
.btn:focus-visible,
.faq-trigger:focus-visible {
  outline: 2px solid rgba(95, 221, 160, 0.82);
  outline-offset: 3px;
}

.nav-cta {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.btn {
  border-radius: 0.74rem;
  text-decoration: none;
  font-family: var(--font-body);
  font-size: 0.87rem;
  font-weight: 700;
  padding: 0.62rem 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease, border-color 180ms ease;
}

.btn:hover {
  transform: translateY(-1px);
}

.btn.solid {
  color: #042414;
  background: linear-gradient(135deg, var(--lp-accent), var(--lp-accent-deep));
  box-shadow: 0 10px 20px rgba(34, 120, 80, 0.45);
}

.btn.solid.glow {
  box-shadow: 0 12px 24px rgba(50, 193, 125, 0.3), 0 0 0 1px rgba(95, 221, 160, 0.22) inset;
}

.btn.solid.glow:hover {
  box-shadow: 0 16px 30px rgba(44, 188, 119, 0.38), 0 0 30px rgba(72, 227, 149, 0.24);
}

.btn.ghost {
  color: var(--lp-ink);
  border-color: var(--lp-line);
  background: rgba(15, 33, 26, 0.72);
}

.btn.ghost:hover {
  border-color: rgba(106, 174, 141, 0.62);
  background: rgba(20, 41, 33, 0.92);
}

.btn.big {
  padding: 0.8rem 1.24rem;
  font-size: 0.92rem;
}

.hero {
  position: relative;
  overflow: hidden;
  padding: 7.8rem 0 3.4rem;
}

.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(89, 132, 111, 0.24) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(89, 132, 111, 0.24) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(circle at 50% 18%, black, transparent 72%);
  pointer-events: none;
}

.bg-chart {
  position: absolute;
  inset: auto 0 16% 0;
  height: 180px;
  background:
    linear-gradient(120deg, transparent 0%, rgba(66, 199, 136, 0.18) 38%, transparent 78%),
    linear-gradient(160deg, transparent 12%, rgba(216, 180, 102, 0.14) 58%, transparent 85%);
  mask-image: linear-gradient(180deg, transparent, black 28%, black 70%, transparent);
  pointer-events: none;
}

.blob {
  position: absolute;
  border-radius: 999px;
  pointer-events: none;
}

.blob-a {
  width: 380px;
  height: 380px;
  top: -140px;
  left: -140px;
  background: radial-gradient(circle, rgba(68, 199, 138, 0.24), transparent 72%);
}

.blob-b {
  width: 380px;
  height: 380px;
  top: -90px;
  right: -130px;
  background: radial-gradient(circle, rgba(216, 180, 102, 0.2), transparent 70%);
}

.hero-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 1.2rem;
  align-items: stretch;
}

.cred-line {
  margin: 0;
  color: #b7d8c6;
  font-size: 0.8rem;
  font-family: var(--font-body);
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 0.68rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(2.08rem, 5.4vw, 3.76rem);
  line-height: 1.05;
  letter-spacing: -0.03em;
}

.sub {
  margin: 0.95rem 0 0;
  color: var(--lp-muted);
  line-height: 1.7;
  max-width: 56ch;
  font-family: var(--font-body);
  font-size: 1rem;
}

.actions {
  margin-top: 1.42rem;
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.actions.center {
  justify-content: center;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.3rem 0;
}

.pricing-line {
  margin: 0.82rem 0 0;
  font-size: 0.85rem;
  color: #c2d6cb;
  font-family: var(--font-body);
}

.hero-trust-strip {
  margin-top: 1.1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.hero-trust-strip span {
  border: 1px solid rgba(108, 157, 132, 0.36);
  border-radius: 999px;
  padding: 0.5rem 0.8rem;
  background: rgba(12, 27, 21, 0.72);
  color: #d8e8df;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.hero-preview {
  border: 1px solid var(--lp-line);
  border-radius: 1.2rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(68, 199, 138, 0.14), transparent 34%),
    radial-gradient(circle at 100% 0%, rgba(216, 180, 102, 0.08), transparent 28%),
    linear-gradient(180deg, #0d1a16, #09120f);
  padding: 1rem;
  box-shadow: var(--lp-shadow);
}

.preview-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding-bottom: 0.9rem;
  border-bottom: 1px solid rgba(101, 148, 125, 0.24);
}

.preview-branding {
  display: flex;
  align-items: center;
  gap: 0.72rem;
}

.preview-logo {
  width: 2rem;
  height: 2rem;
  border-radius: 0.62rem;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, rgba(97, 224, 161, 0.94), rgba(45, 142, 99, 0.92));
  color: #072014;
  font-size: 0.72rem;
  font-family: var(--font-display);
  font-weight: 800;
  letter-spacing: 0.08em;
}

.preview-branding strong {
  display: block;
  font-size: 0.88rem;
  font-family: var(--font-display);
}

.preview-branding span {
  display: block;
  margin-top: 0.14rem;
  color: var(--lp-muted);
  font-size: 0.75rem;
}

.preview-badges {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.45rem;
}

.preview-badge,
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.42rem 0.72rem;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.preview-badge {
  border: 1px solid rgba(96, 159, 130, 0.3);
  background: rgba(15, 32, 26, 0.9);
  color: #d6e9dd;
}

.preview-badge.muted,
.status-pill.quiet {
  color: #a7beb1;
  background: rgba(13, 27, 22, 0.9);
}

.preview-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  padding: 0.9rem 0 1rem;
}

.preview-tabs span {
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.44rem 0.76rem;
  color: #9eb3a8;
  background: rgba(10, 22, 18, 0.74);
  font-size: 0.76rem;
  font-weight: 700;
}

.preview-tabs span.active {
  color: #f1f7f3;
  border-color: rgba(100, 170, 137, 0.4);
  background: rgba(21, 47, 36, 0.92);
}

.preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(290px, 0.92fr);
  gap: 0.85rem;
}

.command-card,
.metric-card,
.workflow-card,
.pulse-card {
  border: 1px solid rgba(98, 148, 124, 0.24);
  border-radius: 1rem;
  background: rgba(11, 24, 20, 0.84);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.command-card {
  padding: 1rem;
}

.preview-side {
  display: grid;
  gap: 0.85rem;
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.card-head.compact {
  padding: 0.92rem 0.92rem 0;
}

.card-head p {
  margin: 0;
  color: #97b2a3;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.card-head h2,
.card-head h3 {
  margin: 0;
  font-size: 1.04rem;
  font-family: var(--font-display);
  letter-spacing: -0.02em;
}

.status-pill {
  color: #d9f0e2;
  border: 1px solid rgba(111, 177, 145, 0.26);
  background: rgba(24, 64, 46, 0.72);
}

.focus-card {
  margin-top: 0.9rem;
  border: 1px solid rgba(103, 155, 129, 0.24);
  border-radius: 0.9rem;
  background:
    linear-gradient(180deg, rgba(18, 42, 33, 0.92), rgba(14, 28, 23, 0.96)),
    rgba(255, 255, 255, 0.02);
  padding: 0.92rem;
}

.focus-card span {
  display: block;
  color: #9eb9ab;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.focus-card strong {
  display: block;
  margin-top: 0.38rem;
  font-size: 1rem;
  font-family: var(--font-display);
  color: #edf6f0;
}

.focus-card p {
  margin: 0.48rem 0 0;
  color: var(--lp-muted);
  line-height: 1.58;
  font-size: 0.85rem;
}

.checkline {
  margin-top: 0.9rem;
  border: 1px solid rgba(103, 155, 129, 0.2);
  border-radius: 0.82rem;
  padding: 0.82rem;
  background: rgba(10, 22, 18, 0.92);
}

.checkline-head {
  color: #a6c0b3;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-weight: 800;
  font-family: var(--font-body);
}

.checkline ul {
  margin: 0.62rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.46rem;
}

.checkline li {
  display: flex;
  align-items: flex-start;
  gap: 0.62rem;
  font-family: var(--font-body);
  opacity: 0;
  transform: translateY(6px);
  animation: tick-in 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--tick-delay, 0ms);
}

.checkline i {
  width: 0.62rem;
  height: 0.62rem;
  border-radius: 999px;
  display: inline-block;
  margin-top: 0.38rem;
  box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
}

.checkline li strong {
  display: block;
  color: #e4f0e8;
  font-size: 0.88rem;
  font-weight: 700;
}

.checkline li span {
  display: block;
  margin-top: 0.14rem;
  color: var(--lp-muted);
  font-size: 0.8rem;
  line-height: 1.48;
}

.checkline i.ready {
  background: var(--lp-accent);
}

.checkline i.watch {
  background: var(--lp-highlight);
}

.snap-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.62rem;
  padding: 0.92rem;
}

.stat-card {
  border: 1px solid rgba(98, 148, 124, 0.24);
  border-radius: 0.82rem;
  background: rgba(14, 29, 23, 0.84);
  padding: 0.78rem;
  transition: border-color 180ms ease, transform 180ms ease;
}

.stat-card:hover {
  border-color: rgba(96, 164, 131, 0.64);
  transform: translateY(-1px);
}

.snap-grid small {
  color: var(--lp-muted);
  font-size: 0.74rem;
  display: block;
  margin-bottom: 0.2rem;
  font-family: var(--font-body);
}

.snap-grid strong {
  font-size: 1rem;
  font-family: var(--font-display);
}

.workflow-card ol {
  margin: 0;
  padding: 0.9rem 0.92rem 1rem;
  list-style: none;
  display: grid;
  gap: 0.76rem;
}

.workflow-card li {
  display: grid;
  gap: 0.2rem;
  padding-left: 1rem;
  position: relative;
}

.workflow-card li::before {
  content: '';
  position: absolute;
  top: 0.4rem;
  left: 0;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: var(--lp-accent);
  box-shadow: 0 0 14px rgba(68, 199, 138, 0.28);
}

.workflow-card li strong {
  color: #ecf5ef;
  font-size: 0.86rem;
}

.workflow-card li span {
  color: var(--lp-muted);
  font-size: 0.8rem;
  line-height: 1.48;
}

.pulse-list {
  display: grid;
  gap: 0.82rem;
  padding: 0.92rem;
}

.pulse-row {
  display: grid;
  gap: 0.42rem;
}

.pulse-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.pulse-meta span {
  color: #dbe8e0;
  font-size: 0.82rem;
}

.pulse-meta strong {
  font-size: 0.8rem;
}

.pulse-track {
  height: 0.42rem;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(78, 102, 91, 0.28);
}

.pulse-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.pulse-track span.good {
  background: linear-gradient(90deg, #43c489, #67dfac);
}

.pulse-track span.warn {
  background: linear-gradient(90deg, #d7a553, #e0c37a);
}

.t-good {
  color: var(--lp-accent);
}

.t-warn {
  color: var(--lp-highlight);
}

.section {
  padding: 5.2rem 0;
}

.section.alt {
  background: rgba(7, 17, 13, 0.88);
  border-top: 1px solid var(--lp-line);
  border-bottom: 1px solid var(--lp-line);
}

.section-head {
  text-align: center;
  max-width: 760px;
  margin: 0 auto 2rem;
}

.section-head.left {
  text-align: left;
  margin: 0;
}

.kicker {
  margin: 0;
  color: #8ad7b0;
  font-size: 0.74rem;
  font-family: var(--font-body);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.section-head h2 {
  margin: 0.55rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.72rem, 3.4vw, 2.65rem);
  letter-spacing: -0.02em;
}

.section-head p {
  margin: 0.84rem 0 0;
  color: var(--lp-muted);
  line-height: 1.66;
  font-family: var(--font-body);
}

.problem-layout {
  display: grid;
  grid-template-columns: 0.95fr 1.05fr;
  gap: 0.8rem;
  align-items: start;
}

.problem-card {
  border: 1px solid var(--lp-line);
  border-radius: 1rem;
  background: rgba(11, 24, 20, 0.74);
  padding: 1rem;
}

.problem-table {
  display: grid;
  gap: 0;
}

.problem-row {
  display: grid;
  grid-template-columns: minmax(180px, 0.8fr) minmax(0, 1.2fr);
  gap: 1rem;
  align-items: start;
  padding: 0.88rem 0;
  border-bottom: 1px solid rgba(110, 152, 131, 0.14);
}

.problem-row:first-child {
  padding-top: 0;
}

.problem-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.problem-row strong {
  color: #eef7f1;
  font-size: 0.96rem;
  line-height: 1.4;
  font-family: var(--font-display);
  letter-spacing: -0.01em;
}

.problem-row span {
  color: var(--lp-muted);
  line-height: 1.6;
  font-family: var(--font-body);
}

.problem-summary {
  margin-top: 1rem;
  border-top: 1px solid rgba(110, 152, 131, 0.16);
  padding-top: 0.95rem;
}

.problem-summary small {
  display: block;
  color: #9ab6a7;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.problem-summary p {
  margin: 0.42rem 0 0;
  color: #d2e4da;
  line-height: 1.58;
  font-family: var(--font-body);
}

.inside-stack {
  display: grid;
  gap: 1.1rem;
  max-width: 1080px;
  margin: 0 auto;
}

.inside-showcase {
  display: grid;
  grid-template-columns: minmax(0, 1.22fr) minmax(0, 0.92fr);
  gap: 1.05rem;
  align-items: center;
  border-radius: 1.25rem;
  background:
    linear-gradient(140deg, rgba(28, 58, 45, 0.24), rgba(11, 26, 20, 0.9)),
    rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(118, 163, 139, 0.16);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.34);
  padding: 1.05rem;
}

.inside-showcase.reverse .inside-media {
  order: 2;
}

.inside-showcase.reverse .inside-copy {
  order: 1;
}

.inside-media {
  border-radius: 1rem;
  overflow: hidden;
  border: 1px solid rgba(92, 145, 119, 0.26);
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.28);
  background:
    linear-gradient(180deg, rgba(9, 18, 14, 0.96), rgba(7, 14, 11, 0.96)),
    rgba(6, 14, 11, 0.94);
}

.inside-media-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.78rem 0.88rem;
  border-bottom: 1px solid rgba(87, 128, 107, 0.22);
}

.window-dots {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
}

.window-dots span {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 999px;
  background: rgba(136, 164, 150, 0.45);
}

.window-dots span:first-child {
  background: rgba(216, 180, 102, 0.72);
}

.window-dots span:nth-child(2) {
  background: rgba(80, 168, 127, 0.72);
}

.inside-media-meta {
  display: grid;
  gap: 0.14rem;
  justify-items: end;
  text-align: right;
}

.inside-media-meta strong {
  font-size: 0.8rem;
  font-family: var(--font-display);
  color: #eef7f1;
}

.inside-media-meta span {
  color: #9db4a8;
  font-size: 0.72rem;
}

.inside-media-frame {
  padding: 0.82rem;
}

.inside-media-frame img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 0.82rem;
  border: 1px solid rgba(109, 151, 128, 0.18);
}

.inside-media-foot {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0 0.82rem 0.82rem;
}

.inside-media-foot span {
  border-radius: 999px;
  border: 1px solid rgba(96, 150, 124, 0.22);
  background: rgba(16, 33, 26, 0.88);
  color: #c9ddd1;
  padding: 0.42rem 0.66rem;
  font-size: 0.74rem;
  font-weight: 700;
}

.inside-copy {
  display: grid;
  gap: 0.95rem;
}

.inside-eyebrow {
  margin: 0;
  color: #8fdab4;
  font-size: 0.74rem;
  font-family: var(--font-body);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.inside-copy h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(1.32rem, 2.3vw, 1.82rem);
  letter-spacing: -0.02em;
}

.inside-copy p {
  margin: 0;
  color: var(--lp-muted);
  line-height: 1.62;
  font-family: var(--font-body);
}

.inside-workflow {
  border: 1px solid rgba(113, 157, 135, 0.16);
  border-radius: 1rem;
  background: rgba(10, 21, 17, 0.72);
  padding: 0.9rem;
}

.inside-workflow-label {
  margin: 0;
  color: #a8c0b3;
  font-size: 0.74rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.inside-workflow ol {
  margin: 0.82rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.72rem;
}

.inside-workflow li {
  display: flex;
  align-items: flex-start;
  gap: 0.72rem;
}

.inside-workflow li span {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.48rem;
  display: grid;
  place-items: center;
  background: rgba(20, 49, 37, 0.94);
  border: 1px solid rgba(95, 158, 126, 0.26);
  color: #ddf0e5;
  font-size: 0.78rem;
  font-weight: 800;
  flex: 0 0 auto;
}

.inside-workflow li p {
  color: #d3e3da;
  font-size: 0.88rem;
  line-height: 1.5;
}

.inside-metric {
  border: 1px solid rgba(101, 151, 126, 0.18);
  border-radius: 1rem;
  background:
    radial-gradient(circle at 100% 0, rgba(68, 199, 138, 0.12), transparent 28%),
    rgba(10, 22, 17, 0.88);
  padding: 0.95rem;
}

.inside-metric small {
  display: block;
  color: #9eb7aa;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.inside-metric strong {
  display: block;
  margin-top: 0.38rem;
  color: #eff7f2;
  font-size: clamp(1.35rem, 2vw, 1.8rem);
  font-family: var(--font-display);
  letter-spacing: -0.03em;
}

.inside-metric p {
  margin-top: 0.34rem;
  color: #d9e7df;
  font-size: 0.88rem;
  line-height: 1.45;
}

.inside-metric span {
  display: block;
  margin-top: 0.36rem;
  color: var(--lp-muted);
  font-size: 0.8rem;
  line-height: 1.5;
}

.difference-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.difference-card {
  border: 1px solid rgba(108, 154, 131, 0.18);
  border-radius: 1rem;
  background:
    linear-gradient(180deg, rgba(16, 31, 25, 0.94), rgba(10, 20, 16, 0.94)),
    rgba(255, 255, 255, 0.02);
  padding: 1rem;
  display: grid;
  gap: 0.9rem;
}

.difference-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.difference-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.6rem;
  display: grid;
  place-items: center;
  background: rgba(65, 178, 124, 0.12);
  border: 1px solid rgba(90, 171, 130, 0.26);
}

.difference-icon :deep(svg) {
  width: 1rem;
  height: 1rem;
  color: #87d8af;
}

.difference-label {
  border-radius: 999px;
  border: 1px solid rgba(102, 151, 128, 0.18);
  background: rgba(12, 26, 20, 0.8);
  color: #c8ddd0;
  padding: 0.38rem 0.64rem;
  font-size: 0.72rem;
  font-weight: 700;
}

.difference-card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.08rem;
  letter-spacing: -0.02em;
}

.difference-compare,
.difference-solution {
  border-radius: 0.9rem;
  padding: 0.82rem;
}

.difference-compare {
  border: 1px solid rgba(176, 133, 79, 0.2);
  background: rgba(37, 28, 18, 0.54);
}

.difference-solution {
  border: 1px solid rgba(95, 154, 124, 0.18);
  background: rgba(15, 34, 25, 0.76);
}

.difference-compare span,
.difference-solution span {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.difference-compare span {
  color: #d4b06f;
}

.difference-solution span {
  color: #8fdab4;
}

.difference-compare p,
.difference-solution p {
  margin: 0.42rem 0 0;
  font-family: var(--font-body);
  line-height: 1.58;
}

.difference-compare p {
  color: #d7c4a0;
}

.difference-solution p {
  color: #d3e5db;
}

.audience-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.audience-card {
  border: 1px solid var(--lp-line);
  border-radius: 0.95rem;
  background: var(--lp-surface-2);
  padding: 1rem;
}

.audience-card h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 1.04rem;
}

.audience-card p {
  margin: 0.6rem 0 0;
  color: var(--lp-muted);
  line-height: 1.62;
  font-family: var(--font-body);
}

.method-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.62rem;
}

.method-card {
  border: 1px solid var(--lp-line);
  border-radius: 0.9rem;
  background: var(--lp-surface-2);
  padding: 0.92rem;
}

.method-card span {
  font-size: 0.73rem;
  color: #a6bdb1;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 800;
  font-family: var(--font-body);
}

.method-card h3 {
  margin: 0.44rem 0 0;
  font-family: var(--font-display);
  font-size: 1rem;
}

.method-card p {
  margin: 0.58rem 0 0;
  color: var(--lp-muted);
  line-height: 1.6;
  font-family: var(--font-body);
}

.proof {
  border-top: 1px solid var(--lp-line);
  border-bottom: 1px solid var(--lp-line);
  background:
    radial-gradient(circle at 50% 0, rgba(68, 199, 138, 0.2), transparent 60%),
    rgba(9, 22, 16, 0.9);
}

.proof-wrap {
  max-width: 1080px;
  text-align: center;
}

.proof-wrap h2 {
  margin: 0.55rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.62rem, 3.4vw, 2.4rem);
}

.proof-copy {
  margin: 0.92rem auto 0;
  max-width: 54rem;
  color: #c8ddd1;
  line-height: 1.66;
  font-family: var(--font-body);
}

.proof-metrics {
  margin-top: 1.4rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.proof-metric-card {
  border: 1px solid rgba(104, 153, 128, 0.18);
  border-radius: 1rem;
  background:
    linear-gradient(180deg, rgba(16, 33, 25, 0.92), rgba(10, 22, 17, 0.94)),
    rgba(255, 255, 255, 0.02);
  padding: 1rem;
  text-align: left;
}

.proof-metric-card strong {
  display: block;
  color: #f1f8f3;
  font-size: clamp(1.5rem, 2.8vw, 2.2rem);
  font-family: var(--font-display);
  letter-spacing: -0.04em;
}

.proof-metric-card span {
  display: block;
  margin-top: 0.28rem;
  color: #d8e8df;
  font-size: 0.9rem;
  font-weight: 700;
}

.proof-metric-card p {
  margin: 0.48rem 0 0;
  color: var(--lp-muted);
  line-height: 1.56;
  font-family: var(--font-body);
}

.proof-badges {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.6rem;
}

.proof-badges span {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid rgba(108, 155, 132, 0.2);
  border-radius: 999px;
  background: rgba(15, 31, 24, 0.86);
  padding: 0.56rem 0.82rem;
  color: #d7e7de;
  font-size: 0.8rem;
  font-weight: 700;
}

.testimonial-grid {
  margin-top: 1.2rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.testimonial-card {
  border: 1px solid rgba(107, 151, 129, 0.18);
  border-radius: 1rem;
  background: rgba(12, 25, 20, 0.86);
  padding: 1rem;
  text-align: left;
}

.testimonial-quote {
  margin: 0;
  color: #e4efe8;
  font-size: 0.94rem;
  line-height: 1.66;
  font-family: var(--font-body);
}

.testimonial-meta {
  margin-top: 1rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgba(107, 151, 129, 0.14);
}

.testimonial-meta strong {
  display: block;
  color: #f0f8f3;
  font-size: 0.88rem;
}

.testimonial-meta span {
  display: block;
  margin-top: 0.16rem;
  color: var(--lp-muted);
  font-size: 0.8rem;
}

.proof-icon {
  width: 0.95rem;
  height: 0.95rem;
  color: #85d7ae;
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
  max-width: 980px;
  margin: 0 auto;
}

.pricing-card {
  border: 1px solid rgba(108, 153, 131, 0.18);
  border-radius: 1.1rem;
  background:
    linear-gradient(180deg, rgba(15, 30, 24, 0.94), rgba(10, 20, 16, 0.96)),
    rgba(255, 255, 255, 0.02);
  padding: 1.1rem;
  display: grid;
  gap: 1rem;
}

.pricing-card.featured {
  border-color: rgba(91, 168, 129, 0.34);
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(98, 183, 140, 0.14) inset;
  background:
    radial-gradient(circle at 100% 0, rgba(68, 199, 138, 0.1), transparent 32%),
    linear-gradient(180deg, rgba(18, 36, 28, 0.96), rgba(10, 21, 17, 0.98));
}

.pricing-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.8rem;
}

.pricing-name {
  margin: 0;
  color: #8fdab4;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.pricing-head h3 {
  margin: 0.4rem 0 0;
  font-family: var(--font-display);
  font-size: 1.1rem;
  letter-spacing: -0.02em;
}

.pricing-badge {
  border-radius: 999px;
  border: 1px solid rgba(101, 169, 135, 0.28);
  background: rgba(21, 51, 39, 0.88);
  color: #def2e6;
  padding: 0.42rem 0.72rem;
  font-size: 0.74rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.pricing-price {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
}

.pricing-price strong {
  color: #f1f8f3;
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-family: var(--font-display);
  letter-spacing: -0.05em;
}

.pricing-price span {
  color: var(--lp-muted);
  font-size: 0.92rem;
  font-family: var(--font-body);
}

.pricing-summary {
  margin: 0;
  color: #c9ddd1;
  line-height: 1.62;
  font-family: var(--font-body);
}

.pricing-card .btn {
  width: 100%;
}

.pricing-block {
  border-top: 1px solid rgba(109, 152, 131, 0.16);
  padding-top: 0.92rem;
}

.pricing-block.muted {
  border-top-color: rgba(109, 152, 131, 0.1);
}

.pricing-block small {
  display: block;
  color: #9cb7a9;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.pricing-block ul {
  margin: 0.72rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.58rem;
}

.pricing-block li {
  position: relative;
  padding-left: 1rem;
  color: #dbe9e1;
  line-height: 1.5;
  font-family: var(--font-body);
}

.pricing-block li::before {
  content: '';
  position: absolute;
  top: 0.42rem;
  left: 0;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: linear-gradient(180deg, #6de7b0, #2da76f);
}

.pricing-block.muted li {
  color: var(--lp-muted);
}

.faq-layout {
  display: grid;
  grid-template-columns: 0.82fr 1.18fr;
  gap: 0.8rem;
}

.faq-list {
  border: 1px solid rgba(110, 154, 132, 0.18);
  border-radius: 1rem;
  background:
    linear-gradient(180deg, rgba(14, 28, 22, 0.94), rgba(10, 20, 16, 0.96)),
    rgba(255, 255, 255, 0.02);
  overflow: hidden;
}

.faq-item {
  border-bottom: 1px solid rgba(111, 153, 131, 0.12);
  padding: 0 1rem;
}

.faq-item:last-child {
  border-bottom: 0;
}

.faq-question {
  margin: 0;
}

.faq-trigger {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  padding: 1rem 0;
  border: 0;
  background: transparent;
  text-align: left;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 700;
  color: #edf6f0;
}

.faq-icon {
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 999px;
  display: inline-grid;
  place-items: center;
  color: #d7e9de;
  background: rgba(18, 39, 30, 0.82);
  border: 1px solid rgba(101, 150, 126, 0.18);
  transition:
    transform 160ms ease,
    background 160ms ease,
    border-color 160ms ease;
}

.faq-item.open .faq-icon {
  transform: rotate(45deg);
  background: rgba(24, 54, 40, 0.96);
  border-color: rgba(101, 168, 133, 0.26);
}

.faq-panel {
  padding: 0 0 1rem;
}

.faq-panel p {
  margin: 0;
  max-width: 64ch;
  color: #c7ddd0;
  line-height: 1.68;
  font-family: var(--font-body);
}

.cta {
  padding: 5.4rem 0 5rem;
  border-top: 1px solid var(--lp-line);
  background:
    radial-gradient(circle at 50% 0, rgba(68, 199, 138, 0.2), transparent 60%),
    var(--lp-surface);
}

.cta-wrap {
  text-align: center;
  border: 1px solid var(--lp-line);
  border-radius: 1rem;
  background: var(--lp-surface-2);
  max-width: 860px;
  padding: 2rem;
  box-shadow: var(--lp-shadow);
}

.cta-wrap h2 {
  margin: 0.55rem 0 0;
  font-family: var(--font-display);
  font-size: clamp(1.8rem, 4.8vw, 2.8rem);
  letter-spacing: -0.02em;
}

.cta-wrap p {
  margin: 0.9rem auto 0;
  max-width: 58ch;
  color: var(--lp-muted);
  line-height: 1.66;
  font-family: var(--font-body);
}

.footer {
  border-top: 1px solid var(--lp-line);
  background: rgba(10, 20, 16, 0.94);
  padding: 1.2rem 0;
}

.foot-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.foot-inner strong {
  display: block;
  font-family: var(--font-display);
  font-size: 0.94rem;
}

.foot-inner p,
.foot-inner span {
  margin: 0.18rem 0 0;
  color: var(--lp-muted);
  font-family: var(--font-body);
  font-size: 0.83rem;
}

.lift-card {
  transition: transform 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
}

.lift-card:hover {
  transform: translateY(-4px);
  border-color: rgba(102, 170, 137, 0.72);
  box-shadow: 0 18px 32px rgba(0, 0, 0, 0.28);
}

[data-reveal] {
  opacity: 0;
  transform: translateY(24px);
  transition:
    opacity 620ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 620ms cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--reveal-delay, 0ms);
}

[data-reveal].is-visible {
  opacity: 1;
  transform: translateY(0);
}

@keyframes tick-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1060px) {
  .problem-layout,
  .difference-grid,
  .audience-grid,
  .method-grid,
  .proof-metrics,
  .pricing-grid,
  .testimonial-grid,
  .faq-layout {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-layout,
  .preview-grid {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    padding: 0.4rem 0 0;
  }

  .problem-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }

  .inside-showcase {
    grid-template-columns: 1fr;
  }

  .inside-showcase.reverse .inside-media,
  .inside-showcase.reverse .inside-copy {
    order: initial;
  }

  .method-grid,
  .difference-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .container {
    width: min(1160px, calc(100% - 1.2rem));
  }

  .desktop-only,
  .nav-links {
    display: none;
  }

  .hero {
    padding-top: 6.4rem;
  }

  .hero-layout,
  .preview-grid,
  .problem-layout,
  .difference-grid,
  .audience-grid,
  .method-grid,
  .proof-metrics,
  .pricing-grid,
  .testimonial-grid,
  .faq-layout {
    grid-template-columns: 1fr;
  }

  .preview-topbar,
  .card-head,
  .pulse-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .preview-badges {
    justify-content: flex-start;
  }

  .preview-tabs {
    padding-bottom: 0.7rem;
  }

  .snap-grid {
    grid-template-columns: 1fr;
  }

  .inside-showcase {
    padding: 0.72rem;
    gap: 0.82rem;
  }

  .inside-media-top,
  .inside-media-meta {
    justify-items: start;
    text-align: left;
  }

  .inside-media-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .section {
    padding: 4.2rem 0;
  }

  .proof-badges {
    justify-content: flex-start;
  }

  .cta-wrap {
    padding: 1.3rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .lift-card,
  .stat-card,
  .checkline li,
  [data-reveal] {
    transition: none;
    animation: none;
  }

  [data-reveal] {
    opacity: 1;
    transform: none;
  }

  .checkline li {
    opacity: 1;
    transform: none;
  }
}
</style>
