<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="fixed inset-0 z-[100] overflow-y-auto">
        <!-- Backdrop -->
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

        <!-- Modal Container -->
        <div class="flex min-h-full items-center justify-center p-4">
          <div
            ref="dialogRef"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            :aria-describedby="subtitle ? subtitleId : undefined"
            class="relative bg-panel rounded-modal shadow-elevated w-full overflow-hidden transform transition-all border border-line"
            :class="sizeClass"
            @keydown="onKeydown"
          >
            <!-- Header -->
            <div class="px-4 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <h3 :id="titleId" class="text-base font-bold text-slate-900 leading-none">{{ title }}</h3>
                <p v-if="subtitle" :id="subtitleId" class="text-xs text-slate-500 mt-1 font-medium">{{ subtitle }}</p>
              </div>
              <button @click="$emit('close')" aria-label="Tutup" class="p-2 shrink-0 text-slate-500 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div ref="bodyRef" class="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
              <slot />
            </div>

            <!-- Footer -->
            <div class="px-4 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <Button variant="secondary" @click="$emit('close')">{{ cancelText }}</Button>
              <Button v-if="!hideConfirm" variant="primary" @click="$emit('confirm')">{{ confirmText }}</Button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import Button from './Button.vue'

interface Props {
  isOpen: boolean
  title: string
  subtitle?: string
  confirmText?: string
  cancelText?: string
  hideConfirm?: boolean
  size?: 'md' | 'lg'
  initialFocus?: string
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
  confirmText: 'Konfirmasi',
  cancelText: 'Batal',
  hideConfirm: false,
  size: 'md'
})

const emit = defineEmits(['close', 'confirm'])

const sizeClass = computed(() => (props.size === 'lg' ? 'max-w-2xl' : 'max-w-lg'))

const uid = useId()
const titleId = `${uid}-title`
const subtitleId = `${uid}-subtitle`

const dialogRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)
let previouslyFocused: HTMLElement | null = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const getFocusable = (): HTMLElement[] => {
  const root = dialogRef.value
  if (!root) return []
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null
  )
}

const focusFirst = () => {
  const explicit = props.initialFocus
    ? dialogRef.value?.querySelector<HTMLElement>(props.initialFocus)
    : null
  if (explicit && explicit.offsetParent !== null) {
    explicit.focus()
    return
  }
  const bodyEl = bodyRef.value
  const first = bodyEl
    ? Array.from(bodyEl.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null)[0]
    : null
  ;(first ?? getFocusable()[0])?.focus()
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
    return
  }
  if (event.key !== 'Tab') return

  const focusable = getFocusable()
  if (focusable.length === 0) {
    event.preventDefault()
    return
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = document.activeElement

  if (event.shiftKey) {
    if (active === first || !dialogRef.value?.contains(active)) {
      event.preventDefault()
      last.focus()
    }
  } else if (active === last || !dialogRef.value?.contains(active)) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.isOpen,
  async (open) => {
    if (open) {
      previouslyFocused = document.activeElement as HTMLElement | null
      await nextTick()
      focusFirst()
    } else if (previouslyFocused) {
      previouslyFocused.focus()
      previouslyFocused = null
    }
  }
)
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.98);
}
</style>
