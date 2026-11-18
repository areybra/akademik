<template>
  <div>
    <div v-if="showLegend" class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
      <div
        v-for="s in series"
        :key="s.name"
        class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500"
      >
        <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: s.color }"></span>
        {{ s.name }}
      </div>
    </div>

    <div class="relative" :style="{ height: `${height}px` }" @mouseleave="activeIndex = -1">
      <svg
        class="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            v-for="(s, seriesIndex) in series"
            :id="gradientId(seriesIndex)"
            :key="`grad-${s.name}`"
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" :stop-color="s.color" stop-opacity="0.3" />
            <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
          </linearGradient>
        </defs>

        <line
          v-for="tick in [0, 25, 50, 75, 100]"
          :key="`tick-${tick}`"
          x1="0"
          :y1="tick"
          x2="100"
          :y2="tick"
          stroke="var(--chart-grid)"
          stroke-width="1"
          vector-effect="non-scaling-stroke"
        />

        <g v-for="(s, seriesIndex) in series" :key="s.name">
          <path v-if="showArea" :d="areaPath(s.values)" :fill="`url(#${gradientId(seriesIndex)})`" />
          <path
            :d="linePath(s.values)"
            fill="none"
            :stroke="s.color"
            stroke-width="2.5"
            stroke-linejoin="round"
            stroke-linecap="round"
            vector-effect="non-scaling-stroke"
          />
        </g>

        <rect
          v-for="(label, index) in labels"
          :key="`hit-${label}-${index}`"
          :x="hitX(index)"
          y="0"
          :width="hitWidth"
          height="100"
          fill="transparent"
          @mouseenter="activeIndex = index"
        />
      </svg>

      <span
        class="absolute right-0 top-0 text-[10px] font-semibold text-slate-400 tabular-nums pointer-events-none"
        aria-hidden="true"
      >
        {{ valueFormatter(maxValue) }}
      </span>

      <template v-if="activeIndex >= 0 && labels[activeIndex]">
        <span
          v-for="s in series"
          :key="`dot-${s.name}`"
          class="absolute w-2.5 h-2.5 rounded-full border-2 border-white shadow pointer-events-none"
          :style="{
            left: `${xPercent(activeIndex)}%`,
            top: `${yPercent(s.values[activeIndex] ?? 0)}%`,
            backgroundColor: s.color,
            transform: 'translate(-50%, -50%)'
          }"
        ></span>

        <div
          class="absolute z-10 pointer-events-none rounded-lg shadow-lg px-3 py-2 text-[11px] whitespace-nowrap"
          :style="{ left: `${tooltipLeft}%`, top: '0px', transform: 'translate(-50%, 4px)', backgroundColor: 'var(--chart-tooltip-bg)', color: 'var(--chart-tooltip-ink)' }"
        >
          <p class="font-bold mb-1">{{ labels[activeIndex] }}</p>
          <div v-for="s in series" :key="`tip-${s.name}`" class="flex items-center gap-1.5">
            <span class="w-1.5 h-1.5 rounded-full" :style="{ backgroundColor: s.color }"></span>
            <span class="text-white/70">{{ s.name }}</span>
            <span class="ml-3 font-bold tabular-nums">{{ valueFormatter(s.values[activeIndex] ?? 0) }}</span>
          </div>
        </div>
      </template>
    </div>

    <div class="mt-2 flex gap-1">
      <span
        v-for="(label, index) in labels"
        :key="`label-${label}-${index}`"
        class="flex-1 text-center text-[10px] font-semibold text-slate-400 truncate"
        :class="index % 2 === 1 ? 'hidden sm:block' : ''"
      >
        {{ label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatNumber, niceMax } from './chartUtils'

interface LineSeries {
  name: string
  color: string
  values: number[]
}

const props = withDefaults(
  defineProps<{
    labels: string[]
    series: LineSeries[]
    height?: number
    yMax?: number
    showArea?: boolean
    showLegend?: boolean
    valueFormatter?: (value: number) => string
  }>(),
  {
    height: 220,
    yMax: 0,
    showArea: true,
    showLegend: true,
    valueFormatter: (value: number) => formatNumber(value)
  }
)

let instanceCounter = 0
const instanceId = `line-chart-${++instanceCounter}-${Math.random().toString(36).slice(2, 7)}`

const activeIndex = ref(-1)
const padding = 6

const maxValue = computed(() => {
  if (props.yMax > 0) return props.yMax
  const rawMax = Math.max(0, ...props.series.flatMap((series) => series.values.map((value) => Number(value) || 0)))
  return niceMax(rawMax)
})

const xPercent = (index: number) => {
  const count = props.labels.length
  if (count <= 1) return 50
  return (index / (count - 1)) * 100
}

const yPercent = (value: number) => {
  const ratio = Math.min(1, Math.max(0, (Number(value) || 0) / maxValue.value))
  return padding + (1 - ratio) * (100 - padding * 2)
}

const linePath = (values: number[]) =>
  values
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${xPercent(index).toFixed(2)} ${yPercent(value).toFixed(2)}`)
    .join(' ')

const areaPath = (values: number[]) => {
  if (values.length === 0) return ''
  const bottom = 100 - padding
  const lastX = xPercent(values.length - 1).toFixed(2)
  return `${linePath(values)} L ${lastX} ${bottom} L ${xPercent(0).toFixed(2)} ${bottom} Z`
}

const hitWidth = computed(() => Math.max(100 / Math.max(1, props.labels.length), 2))
const hitX = (index: number) => xPercent(index) - hitWidth.value / 2
const gradientId = (index: number) => `${instanceId}-grad-${index}`

const tooltipLeft = computed(() => {
  if (activeIndex.value < 0) return 50
  return Math.min(88, Math.max(12, xPercent(activeIndex.value)))
})
</script>
