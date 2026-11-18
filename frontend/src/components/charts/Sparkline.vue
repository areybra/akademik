<template>
  <svg
    class="w-full"
    :style="{ height: `${height}px` }"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" :stop-color="color" stop-opacity="0.25" />
        <stop offset="100%" :stop-color="color" stop-opacity="0" />
      </linearGradient>
    </defs>
    <path v-if="showArea" :d="areaPath" :fill="`url(#${gradientId})`" />
    <path
      :d="linePath"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { CHART_COLORS } from './chartUtils'

const props = withDefaults(
  defineProps<{
    values: number[]
    color?: string
    height?: number
    showArea?: boolean
  }>(),
  {
    color: CHART_COLORS.indigo,
    height: 40,
    showArea: true
  }
)

const gradientId = `sparkline-${Math.random().toString(36).slice(2, 9)}`

const points = computed(() => {
  const values = props.values.map((value) => Number(value) || 0)
  if (values.length === 0) return []
  const max = Math.max(1, ...values)
  const min = Math.min(...values)
  const range = max - min || 1
  return values.map((value, index) => ({
    x: values.length === 1 ? 50 : (index / (values.length - 1)) * 100,
    y: 94 - ((value - min) / range) * 88
  }))
})

const linePath = computed(() =>
  points.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
)

const areaPath = computed(() => {
  if (points.value.length === 0) return ''
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${linePath.value} L ${last.x.toFixed(2)} 100 L ${first.x.toFixed(2)} 100 Z`
})
</script>
