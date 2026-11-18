<template>
  <div :class="stacked ? 'flex flex-col' : 'flex flex-col sm:flex-row'" class="items-center gap-5">
    <div class="relative shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg viewBox="0 0 100 100" class="w-full h-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--chart-track)" :stroke-width="thickness" />
        <circle
          v-for="segment in computedSegments"
          :key="segment.label"
          cx="50"
          cy="50"
          r="42"
          fill="none"
          :stroke="segment.color"
          :stroke-width="thickness"
          :stroke-dasharray="segment.dasharray"
          :stroke-dashoffset="segment.dashoffset"
          stroke-linecap="butt"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span class="text-xl font-bold text-slate-900 tabular-nums leading-none">{{ centerValue }}</span>
        <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-1">{{ centerLabel }}</span>
      </div>
    </div>

    <ul v-if="showLegend" class="flex-1 w-full min-w-0 space-y-2">
      <li
        v-for="segment in segmentsWithPercent"
        :key="`legend-${segment.label}`"
        class="flex items-center gap-2 text-[11px]"
      >
        <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: segment.color }"></span>
        <span class="text-slate-600 truncate flex-1" :title="segment.label">{{ segment.label }}</span>
        <span class="font-bold tabular-nums text-slate-800">{{ valueFormatter(segment.value) }}</span>
        <span class="w-10 text-right text-slate-400 tabular-nums">{{ segment.percent }}%</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatNumber } from './chartUtils'

interface DonutSegment {
  label: string
  value: number
  color: string
}

const props = withDefaults(
  defineProps<{
    segments: DonutSegment[]
    size?: number
    thickness?: number
    centerLabel?: string
    centerValue?: string
    showLegend?: boolean
    stacked?: boolean
    valueFormatter?: (value: number) => string
  }>(),
  {
    size: 168,
    thickness: 12,
    centerLabel: 'Total',
    centerValue: '',
    showLegend: true,
    stacked: false,
    valueFormatter: (value: number) => formatNumber(value)
  }
)

const CIRCUMFERENCE = 2 * Math.PI * 42

const total = computed(() =>
  props.segments.reduce((sum, segment) => sum + (Number(segment.value) || 0), 0)
)

const computedSegments = computed(() => {
  let offset = 0
  return props.segments
    .filter((segment) => (Number(segment.value) || 0) > 0)
    .map((segment) => {
      const value = Number(segment.value) || 0
      const length = total.value > 0 ? (value / total.value) * CIRCUMFERENCE : 0
      const entry = {
        label: segment.label,
        color: segment.color,
        dasharray: `${length} ${CIRCUMFERENCE - length}`,
        dashoffset: -offset
      }
      offset += length
      return entry
    })
})

const segmentsWithPercent = computed(() =>
  props.segments.map((segment) => {
    const value = Number(segment.value) || 0
    return {
      ...segment,
      value,
      percent: total.value > 0 ? Math.round((value / total.value) * 100) : 0
    }
  })
)
</script>
