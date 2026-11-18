<template>
  <section class="clean-card p-4 sm:p-5 flex flex-col">
    <header class="flex items-start justify-between gap-3 mb-4">
      <div class="min-w-0">
        <h2 class="text-sm font-bold text-slate-900 tracking-tight">{{ title }}</h2>
        <p v-if="subtitle" class="text-[11px] text-slate-500 mt-0.5">{{ subtitle }}</p>
      </div>
      <div class="shrink-0 flex items-center gap-2">
        <slot name="actions" />
      </div>
    </header>

    <div v-if="loading" class="animate-pulse flex-1" :style="{ minHeight: `${minHeight}px` }" aria-hidden="true">
      <div class="h-full w-full rounded-lg bg-slate-100"></div>
    </div>

    <div
      v-else-if="empty"
      class="flex-1 flex flex-col items-center justify-center text-center gap-2"
      :style="{ minHeight: `${minHeight}px` }"
    >
      <svg class="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
      <p class="text-xs text-slate-400 font-medium">{{ emptyText }}</p>
    </div>

    <div v-else class="flex-1">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    loading?: boolean
    empty?: boolean
    emptyText?: string
    minHeight?: number
  }>(),
  {
    subtitle: '',
    loading: false,
    empty: false,
    emptyText: 'Belum ada data',
    minHeight: 180
  }
)
</script>
