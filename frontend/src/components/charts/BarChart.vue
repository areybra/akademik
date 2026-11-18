<template>
  <div>
    <div class="flex items-end gap-2 sm:gap-3" :style="{ height: `${height}px` }">
      <div
        v-for="item in items"
        :key="item.label"
        class="flex-1 h-full min-w-0 flex flex-col items-center justify-end gap-1.5 group"
      >
        <span class="text-[10px] font-bold text-slate-500 tabular-nums truncate max-w-full">
          {{ showValue ? valueFormatter(item.value) : '' }}
        </span>
        <div class="w-full flex-1 flex items-end justify-center">
          <div
            class="w-full max-w-[44px] rounded-t-md transition-all duration-500 group-hover:opacity-80"
            :style="{
              height: `${barHeight(item.value)}%`,
              minHeight: item.value > 0 ? '3px' : '0px',
              backgroundColor: item.color || color
            }"
            :title="`${item.label}: ${valueFormatter(item.value)}`"
          ></div>
        </div>
      </div>
    </div>

    <div class="mt-2 flex gap-2 sm:gap-3">
      <span
        v-for="item in items"
        :key="`label-${item.label}`"
        class="flex-1 min-w-0 text-center text-[10px] font-semibold text-slate-500 truncate"
        :title="item.label"
      >
        {{ item.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CHART_COLORS, formatNumber, niceMax } from './chartUtils'

interface BarItem {
  label: string
  value: number
  color?: string
}

const props = withDefaults(
  defineProps<{
    items: BarItem[]
    height?: number
    color?: string
    valueFormatter?: (value: number) => string
    showValue?: boolean
  }>(),
  {
    height: 170,
    color: CHART_COLORS.indigo,
    valueFormatter: (value: number) => formatNumber(value),
    showValue: true
  }
)

const maxValue = computed(() => niceMax(Math.max(0, ...props.items.map((item) => Number(item.value) || 0))))

const barHeight = (value: number) => {
  const ratio = Math.min(1, Math.max(0, (Number(value) || 0) / maxValue.value))
  return ratio * 100
}
</script>
