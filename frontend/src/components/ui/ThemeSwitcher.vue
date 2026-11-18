<template>
  <!-- Mode inline: dipakai di halaman Pengaturan -->
  <div v-if="variant === 'inline'" class="space-y-5" role="radiogroup" aria-label="Pilih tema tampilan">
    <div v-for="group in groups" :key="group.label">
      <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{{ group.label }}</p>
      <div class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="theme in group.themes"
          :key="theme.id"
          type="button"
          role="radio"
          :aria-checked="isActive(theme.id)"
          :class="cardClass(theme.id)"
          @click="select(theme.id)"
        >
          <ThemeOption :theme="theme" :active="isActive(theme.id)" />
        </button>
      </div>
    </div>
  </div>

  <!-- Mode dropdown: dipakai di header -->
  <div v-else ref="rootRef" class="relative">
    <button
      type="button"
      class="inline-flex items-center justify-center gap-2 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
      :aria-label="`Ganti tema tampilan (aktif: ${activeTheme.name})`"
      aria-haspopup="true"
      :aria-expanded="isOpen"
      title="Ganti tema"
      @click="toggleMenu"
      @keydown.down.prevent="openMenu"
      @keydown.esc="closeMenu"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
      <span class="hidden xl:inline text-xs font-semibold">{{ activeTheme.mode === 'dark' ? 'Gelap' : 'Terang' }}</span>
    </button>

    <Transition name="fade">
      <div
        v-if="isOpen"
        ref="menuRef"
        class="absolute right-0 z-50 mt-2 w-[19rem] max-w-[calc(100vw-2rem)] rounded-card border border-slate-200 bg-panel shadow-elevated p-3"
        role="menu"
        aria-label="Daftar tema"
        @keydown="onMenuKeydown"
      >
        <div v-for="group in groups" :key="`menu-${group.label}`" class="mb-3 last:mb-0">
          <p class="px-1 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{{ group.label }}</p>
          <button
            v-for="theme in group.themes"
            :key="`menu-${theme.id}`"
            type="button"
            role="menuitemradio"
            :aria-checked="isActive(theme.id)"
            :class="rowClass(theme.id)"
            @click="select(theme.id)"
          >
            <ThemeOption :theme="theme" :active="isActive(theme.id)" />
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useThemeStore } from '../../stores/theme'
import ThemeOption from './ThemeOption.vue'

withDefaults(
  defineProps<{
    variant?: 'dropdown' | 'inline'
  }>(),
  { variant: 'dropdown' }
)

const themeStore = useThemeStore()
const isOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)

const groups = computed(() => [
  { label: 'Terang', themes: themeStore.lightThemes },
  { label: 'Gelap', themes: themeStore.darkThemes }
])

const activeTheme = computed(() => themeStore.activeTheme)
const isActive = (id: string) => themeStore.current === id

const select = (id: string) => {
  themeStore.setTheme(id)
  isOpen.value = false
  rootRef.value?.querySelector<HTMLElement>('button')?.focus()
}

const openMenu = () => {
  isOpen.value = true
  requestAnimationFrame(() => {
    menuRef.value?.querySelector<HTMLElement>('[role="menuitemradio"]')?.focus()
  })
}

const toggleMenu = () => {
  if (isOpen.value) closeMenu()
  else openMenu()
}

const closeMenu = () => {
  isOpen.value = false
  rootRef.value?.querySelector<HTMLElement>('button')?.focus()
}

const onMenuKeydown = (event: KeyboardEvent) => {
  const items = Array.from(
    menuRef.value?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? []
  )
  if (items.length === 0) return
  const index = items.indexOf(document.activeElement as HTMLElement)

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    const direction = event.key === 'ArrowDown' ? 1 : -1
    items[(index + direction + items.length) % items.length].focus()
  } else if (event.key === 'Home') {
    event.preventDefault()
    items[0].focus()
  } else if (event.key === 'End') {
    event.preventDefault()
    items[items.length - 1].focus()
  }
}

const onDocumentPointerDown = (event: PointerEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (target && rootRef.value && !rootRef.value.contains(target)) {
    isOpen.value = false
  }
}

const onDocumentKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isOpen.value) closeMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
})

const cardClass = (id: string) => [
  'group text-left rounded-xl border p-3 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
  isActive(id)
    ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500/20'
    : 'border-slate-200 bg-panel hover:border-slate-300 hover:bg-slate-50'
]

const rowClass = (id: string) => [
  'flex w-full items-center gap-3 rounded-lg border px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40',
  isActive(id)
    ? 'border-brand-500 bg-brand-50'
    : 'border-transparent hover:bg-slate-50'
]
</script>
