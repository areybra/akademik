import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark'

export interface ThemeDefinition {
  id: string
  name: string
  headline: string
  mode: ThemeMode
  canvas: string
  panel: string
  accent: string
  accentInk: string
  ink: string
  muted: string
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'light-blue',
    name: 'Royal Blue & Gold',
    headline: 'Bersih & Berwibawa',
    mode: 'light',
    canvas: '#F5F7FB',
    panel: '#FFFFFF',
    accent: '#2563EB',
    accentInk: '#FFFFFF',
    ink: '#0F172A',
    muted: '#5F6F85'
  },
  {
    id: 'dark-navy',
    name: 'Midnight Navy & Gold',
    headline: 'Tenang & Kontras',
    mode: 'dark',
    canvas: '#0B1220',
    panel: '#16233A',
    accent: '#60A5FA',
    accentInk: '#0B1220',
    ink: '#F5F8FF',
    muted: '#A9B7C9'
  }
]

export const DEFAULT_THEME_ID = 'light-blue'
export const THEME_STORAGE_KEY = 'akademik-theme'

// Nilai tema lama tetap diterima agar pilihan pengguna tidak hilang
// saat daftar tema disederhanakan menjadi terang dan gelap.
const LEGACY_THEME_MAP: Record<string, string> = {
  'light-indigo': 'light-blue',
  'light-navy': 'light-blue',
  'light-sage': 'light-blue',
  'dark-indigo': 'dark-navy',
  'dark-teal': 'dark-navy',
  'dark-plum': 'dark-navy'
}

const isThemeId = (value: string | null): value is string =>
  Boolean(value) && THEMES.some((theme) => theme.id === value)

const normalizeThemeId = (value: string | null) => {
  if (isThemeId(value)) return value
  if (value && LEGACY_THEME_MAP[value]) return LEGACY_THEME_MAP[value]
  return DEFAULT_THEME_ID
}

const applyTheme = (id: string) => {
  if (typeof document === 'undefined') return
  const theme = THEMES.find((item) => item.id === id) ?? THEMES[0]
  document.documentElement.setAttribute('data-theme', theme.id)
  document.documentElement.style.colorScheme = theme.mode
}

export const useThemeStore = defineStore('theme', () => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null
  const initial = normalizeThemeId(stored)
  const current = ref(initial)

  if (stored && stored !== initial) {
    localStorage.setItem(THEME_STORAGE_KEY, initial)
  }

  const activeTheme = computed(
    () => THEMES.find((theme) => theme.id === current.value) ?? THEMES[0]
  )
  const isDark = computed(() => activeTheme.value.mode === 'dark')
  const lightThemes = computed(() => THEMES.filter((theme) => theme.mode === 'light'))
  const darkThemes = computed(() => THEMES.filter((theme) => theme.mode === 'dark'))

  const setTheme = (id: string) => {
    if (!isThemeId(id)) return
    current.value = id
    localStorage.setItem(THEME_STORAGE_KEY, id)
    applyTheme(id)
  }

  const initTheme = () => {
    applyTheme(current.value)
  }

  return {
    current,
    activeTheme,
    isDark,
    lightThemes,
    darkThemes,
    setTheme,
    initTheme
  }
})
