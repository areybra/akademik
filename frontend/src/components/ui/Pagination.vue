<template>
  <div
    v-if="total > 0"
    class="clean-card px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
  >
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500 font-medium">
      <span>
        Menampilkan <strong class="text-slate-800 tabular-nums">{{ rangeStart }}–{{ rangeEnd }}</strong>
        dari <strong class="text-slate-800 tabular-nums">{{ total }}</strong> {{ label }}
      </span>
      <label class="flex items-center gap-1.5">
        <span class="sr-only">Data per halaman</span>
        <select
          :value="pageSize"
          class="px-2.5 py-1.5 pr-7 bg-panel border border-slate-300 rounded-lg text-xs font-bold text-slate-600 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          @change="onPageSizeChange"
        >
          <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }} / halaman</option>
        </select>
      </label>
    </div>

    <nav class="flex items-center gap-1" aria-label="Navigasi halaman">
      <button
        type="button"
        class="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
        :disabled="page <= 1"
        aria-label="Halaman sebelumnya"
        @click="goTo(page - 1)"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <template v-for="(item, index) in visiblePages" :key="index">
        <span v-if="item === '...'" class="px-1.5 text-slate-400 select-none">…</span>
        <button
          v-else
          type="button"
          class="min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold tabular-nums transition-colors"
          :class="item === page
            ? 'bg-cta text-cta-ink shadow-sm'
            : 'text-slate-500 hover:text-indigo-600 hover:bg-indigo-50'"
          :aria-current="item === page ? 'page' : undefined"
          @click="goTo(item)"
        >
          {{ item }}
        </button>
      </template>

      <button
        type="button"
        class="p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
        :disabled="page >= totalPages"
        aria-label="Halaman berikutnya"
        @click="goTo(page + 1)"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  page: number
  pageSize: number
  total: number
  label?: string
  pageSizeOptions?: number[]
}

const props = withDefaults(defineProps<Props>(), {
  label: 'data',
  pageSizeOptions: () => [10, 20, 50, 100]
})

const emit = defineEmits<{
  (e: 'update:page', value: number): void
  (e: 'update:pageSize', value: number): void
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const rangeStart = computed(() => {
  if (props.total === 0) return 0
  return (props.page - 1) * props.pageSize + 1
})

const rangeEnd = computed(() => Math.min(props.page * props.pageSize, props.total))

const visiblePages = computed<(number | '...')[]>(() => {
  const total = totalPages.value
  const current = props.page

  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1)
  }

  const pages: (number | '...')[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('...')
  for (let page = start; page <= end; page++) pages.push(page)
  if (end < total - 1) pages.push('...')
  pages.push(total)

  return pages
})

const goTo = (target: number) => {
  if (target < 1 || target > totalPages.value || target === props.page) return
  emit('update:page', target)
}

const onPageSizeChange = (event: Event) => {
  const value = Number((event.target as HTMLSelectElement).value)
  if (Number.isFinite(value) && value > 0) {
    emit('update:pageSize', value)
    emit('update:page', 1)
  }
}
</script>
