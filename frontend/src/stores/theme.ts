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
    id: 'light-indigo',
    name: 'Soft Cool Slate & Royal Indigo',
    headline: 'Bersih & Modern',
    mode: 'light',
    canvas: '#F1F5F9',
    panel: '#FFFFFF',
    accent: '#4F46E5',
    accentInk: '#FFFFFF',
    ink: '#0F172A',
    muted: '#64748B'
  },
  {
    id: 'light-navy',
    name: 'Academic Navy & Warm Amber',
    headline: 'Berwibawa & Selaras Logo',
    mode: 'light',
    canvas: '#F8FAFC',
    panel: '#FFFFFF',
    accent: '#F59E0B',
    accentInk: '#1E293B',
    ink: '#1E293B',
    muted: '#64748B'
  },
  {
    id: 'light-sage',
    name: 'Sage Mist & Deep Emerald',
    headline: 'Segar & Edukatif',
    mode: 'light',
    canvas: '#F4F7F5',
    panel: '#FFFFFF',
    accent: '#059669',
    accentInk: '#FFFFFF',
    ink: '#1E293B',
    muted: '#64748B'
  },
  {
    id: 'dark-indigo',
    name: 'Midnight Slate & Indigo',
    headline: 'Modern & Profesional',
    mode: 'dark',
    canvas: '#0F172A',
    panel: '#1E293B',
    accent: '#6366F1',
    accentInk: '#FFFFFF',
    ink: '#F8FAFC',
    muted: '#94A3B8'
  },
  {
    id: 'dark-teal',
    name: 'Deep Teal & Emerald',
    headline: 'Tenang & Edukatif',
    mode: 'dark',
    canvas: '#0B191E',
    panel: '#132A32',
    accent: '#10B981',
    accentInk: '#FFFFFF',
    ink: '#F1F5F9',
    muted: '#8FAAB3'
  },
  {
    id: 'dark-plum',
    name: 'Charcoal Plum & Violet',
    headline: 'Elegan & Hangat',
    mode: 'dark',
    canvas: '#181622',
    panel: '#242131',
    accent: '#8B5CF6',
    accentInk: '#FFFFFF',
    ink: '#F5F3FF',
    muted: '#A19EB5'
  }
]

export const DEFAULT_THEME_ID = 'light-indigo'
export const THEME_STORAGE_KEY = 'akademik-theme'

const isThemeId = (value: string | null): value is string =>
  Boolean(value) && THEMES.some((theme) => theme.id === value)

const applyTheme = (id: string) => {
  if (typeof document === 'undefined') return
  const theme = THEMES.find((item) => item.id === id) ?? THEMES[0]
  document.documentElement.setAttribute('data-theme', theme.id)
  document.documentElement.style.colorScheme = theme.mode
}

export const useThemeStore = defineStore('theme', () => {
  const stored = typeof window !== 'undefined' ? localStorage.getItem(THEME_STORAGE_KEY) : null
  const current = ref(isThemeId(stored) ? stored : DEFAULT_THEME_ID)

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
