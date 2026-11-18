<template>
  <div class="space-y-3">
    <div v-for="item in items" :key="item.label" class="flex items-center gap-3 group">
      <span class="w-20 sm:w-28 shrink-0 text-[11px] font-semibold text-slate-600 truncate" :title="item.label">
        {{ item.label }}
      </span>
      <div class="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
          :style="{ width: `${barWidth(item.value)}%`, backgroundColor: item.color || color }"
        ></div>
      </div>
      <span class="w-14 shrink-0 text-right text-[11px] font-bold text-slate-700 tabular-nums">
        {{ valueFormatter(item.value) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CHART_COLORS, formatNumber } from './chartUtils'

interface HorizontalBarItem {
  label: string
  value: number
  color?: string
}

const props = withDefaults(
  defineProps<{
    items: HorizontalBarItem[]
    max?: number
    color?: string
    valueFormatter?: (value: number) => string
  }>(),
  {
    max: 0,
    color: CHART_COLORS.indigo,
    valueFormatter: (value: number) => formatNumber(value)
  }
)

const maxValue = computed(() => {
  if (props.max > 0) return props.max
  return Math.max(1, ...props.items.map((item) => Number(item.value) || 0))
})

const barWidth = (value: number) => {
  const ratio = Math.min(1, Math.max(0, (Number(value) || 0) / maxValue.value))
  return ratio * 100
}
</script>
