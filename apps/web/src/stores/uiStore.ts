import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getScope, scopedKey } from '@/services/storageScope'

export type ThemeMode = 'light' | 'dark' | 'forest' | 'dawn'
export type ToastType = 'success' | 'error' | 'info'
export const THEME_OPTIONS: Array<{ value: ThemeMode; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'forest', label: 'Forest' },
  { value: 'dawn', label: 'Dawn' },
]

const LEGACY_THEME_STORAGE_KEY = 'theme_mode'
const THEME_STORAGE_NAMESPACE = 'ui-preferences'
const THEME_STORAGE_KEY = 'theme_mode'
const THEME_COLOR_BY_MODE: Record<ThemeMode, string> = {
  light: '#edf2f7',
  dark: '#020906',
  forest: '#e8f2eb',
  dawn: '#fdf3ea',
}
const COLOR_SCHEME_BY_MODE: Record<ThemeMode, 'light' | 'dark'> = {
  light: 'light',
  dark: 'dark',
  forest: 'light',
  dawn: 'light',
}

interface ToastItem {
  id: number
  type: ToastType
  title: string
  message?: string
  duration: number
}

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmText: string
  cancelText: string
  danger: boolean
  resolve?: (value: boolean) => void
}

let toastId = 1

export function isThemeMode(value: string | null): value is ThemeMode {
  if (!value) return false
  return THEME_OPTIONS.some((option) => option.value === value)
}

function safeLocalStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function safeGet(storage: Storage, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(storage: Storage, key: string, value: string): void {
  try {
    storage.setItem(key, value)
  } catch {
    // Ignore storage write failures.
  }
}

function resolveThemeStorageKey(): string {
  return scopedKey(THEME_STORAGE_NAMESPACE, THEME_STORAGE_KEY)
}

function readPersistedTheme(): ThemeMode | null {
  const storage = safeLocalStorage()
  if (!storage) return null

  const scope = getScope()
  const scopedValue = scope.userId === null ? null : safeGet(storage, resolveThemeStorageKey())
  if (isThemeMode(scopedValue)) {
    return scopedValue
  }

  const legacyValue = safeGet(storage, LEGACY_THEME_STORAGE_KEY)
  if (isThemeMode(legacyValue)) {
    return legacyValue
  }

  if (scope.userId === null) {
    const anonymousScopedValue = safeGet(storage, resolveThemeStorageKey())
    if (isThemeMode(anonymousScopedValue)) {
      return anonymousScopedValue
    }
  }

  return null
}

function persistTheme(mode: ThemeMode): void {
  const storage = safeLocalStorage()
  if (!storage) return

  safeSet(storage, LEGACY_THEME_STORAGE_KEY, mode)
  safeSet(storage, resolveThemeStorageKey(), mode)
}

function ensureThemeColorMetaTag(): HTMLMetaElement | null {
  if (typeof document === 'undefined') return null

  const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (existing) return existing

  if (!document.head?.appendChild) return null
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  document.head.appendChild(meta)
  return meta
}

export const useUiStore = defineStore('ui', () => {
  const theme = ref<ThemeMode>('dark')
  const toasts = ref<ToastItem[]>([])
  const confirm = ref<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    danger: false,
  })

  function applyTheme(mode: ThemeMode, options: { persist?: boolean } = {}) {
    theme.value = mode

    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = mode
      document.documentElement.style.colorScheme = COLOR_SCHEME_BY_MODE[mode]
      if (document.body) {
        document.body.dataset.theme = mode
      }
      const themeColorMeta = ensureThemeColorMetaTag()
      if (themeColorMeta) {
        themeColorMeta.content = THEME_COLOR_BY_MODE[mode]
      }
    }

    if (options.persist !== false) {
      persistTheme(mode)
    }
  }

  function setTheme(mode: ThemeMode) {
    applyTheme(mode)
  }

  function initTheme() {
    const initial = readPersistedTheme() ?? 'dark'
    applyTheme(initial, { persist: false })
  }

  function syncThemeFromStorage() {
    const persisted = readPersistedTheme()
    if (!persisted || persisted === theme.value) {
      return
    }
    applyTheme(persisted, { persist: false })
  }

  function toggleTheme() {
    const currentIndex = THEME_OPTIONS.findIndex((option) => option.value === theme.value)
    const nextIndex = (currentIndex + 1) % THEME_OPTIONS.length
    applyTheme(THEME_OPTIONS[nextIndex]!.value)
  }

  function toast(payload: {
    type?: ToastType
    title: string
    message?: string
    duration?: number
  }) {
    const item: ToastItem = {
      id: toastId++,
      type: payload.type ?? 'info',
      title: payload.title,
      message: payload.message,
      duration: payload.duration ?? 2600,
    }

    toasts.value.push(item)
    window.setTimeout(() => removeToast(item.id), item.duration)
  }

  function removeToast(id: number) {
    toasts.value = toasts.value.filter((item) => item.id !== id)
  }

  function askConfirmation(options: {
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    danger?: boolean
  }) {
    return new Promise<boolean>((resolve) => {
      confirm.value = {
        open: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        danger: options.danger ?? false,
        resolve,
      }
    })
  }

  function closeConfirmation(result: boolean) {
    confirm.value.resolve?.(result)
    confirm.value = {
      open: false,
      title: '',
      message: '',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      danger: false,
    }
  }

  return {
    theme,
    themeOptions: THEME_OPTIONS,
    toasts,
    confirm,
    initTheme,
    setTheme,
    syncThemeFromStorage,
    toggleTheme,
    toast,
    removeToast,
    askConfirmation,
    closeConfirmation,
  }
})
