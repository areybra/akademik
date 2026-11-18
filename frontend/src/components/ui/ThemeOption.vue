<template>
  <div class="flex items-center gap-3 w-full">
    <div class="flex -space-x-1.5 shrink-0">
      <span
        class="w-5 h-5 rounded-full border-2 border-panel ring-1 ring-slate-300/40"
        :style="{ backgroundColor: theme.canvas }"
      ></span>
      <span
        class="w-5 h-5 rounded-full border-2 border-panel ring-1 ring-slate-300/40"
        :style="{ backgroundColor: theme.panel }"
      ></span>
      <span
        class="w-5 h-5 rounded-full border-2 border-panel ring-1 ring-slate-300/40"
        :style="{ backgroundColor: theme.accent }"
      ></span>
    </div>

    <div class="min-w-0 flex-1">
      <p class="text-xs font-bold text-slate-900 truncate">{{ theme.name }}</p>
      <p class="text-[10px] text-slate-500 truncate mt-0.5">{{ theme.headline }}</p>
    </div>

    <span
      v-if="active"
      class="shrink-0 w-5 h-5 rounded-full bg-cta text-cta-ink flex items-center justify-center"
    >
      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  </div>
</template>

<script setup lang="ts">
import type { ThemeDefinition } from '../../stores/theme'

defineProps<{
  theme: ThemeDefinition
  active: boolean
}>()
</script>
