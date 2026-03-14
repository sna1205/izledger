import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { setScope } from '@/services/storageScope'
import { useUiStore } from '@/stores/uiStore'

class MemoryStorage implements Storage {
  private readonly map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) ?? null) : null
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value))
  }
}

function installMemoryStorage() {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
}

function installDocument() {
  const themeColorMeta = { name: 'theme-color', content: '' }
  Object.defineProperty(globalThis, 'document', {
    value: {
      documentElement: {
        dataset: {} as Record<string, string>,
        style: {
          colorScheme: '',
        },
      },
      body: {
        dataset: {} as Record<string, string>,
      },
      head: {
        appendChild: () => undefined,
      },
      querySelector: (selector: string) => (selector === 'meta[name="theme-color"]' ? themeColorMeta : null),
      createElement: (tag: string) => ({
        tagName: tag,
        name: '',
        content: '',
      }),
    },
    configurable: true,
  })
}

describe('uiStore theme persistence', () => {
  beforeEach(() => {
    installMemoryStorage()
    installDocument()
    setActivePinia(createPinia())
    setScope({ userId: null, accountId: null })
  })

  it('prefers the authenticated scoped theme over the legacy theme key', () => {
    localStorage.setItem('theme_mode', 'light')
    localStorage.setItem('tj:v3:u:42:a:all:ui-preferences:theme_mode', 'forest')
    setScope({ userId: 42, accountId: null })

    const uiStore = useUiStore()
    uiStore.initTheme()

    expect(uiStore.theme).toBe('forest')
    expect(document.documentElement.dataset.theme).toBe('forest')
    expect(document.body.dataset.theme).toBe('forest')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })

  it('falls back to the legacy theme key before auth scope is known', () => {
    localStorage.setItem('theme_mode', 'dawn')

    const uiStore = useUiStore()
    uiStore.initTheme()

    expect(uiStore.theme).toBe('dawn')
    expect(document.documentElement.dataset.theme).toBe('dawn')
    expect(document.body.dataset.theme).toBe('dawn')
  })

  it('persists theme updates to both scoped and legacy keys and updates browser chrome metadata', () => {
    setScope({ userId: 7, accountId: null })
    const uiStore = useUiStore()

    uiStore.setTheme('dark')
    const themeColorMeta = document.querySelector('meta[name="theme-color"]') as { content?: string } | null

    expect(localStorage.getItem('theme_mode')).toBe('dark')
    expect(localStorage.getItem('tj:v3:u:7:a:all:ui-preferences:theme_mode')).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.body.dataset.theme).toBe('dark')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    expect(themeColorMeta?.content).toBe('#020906')
  })
})
