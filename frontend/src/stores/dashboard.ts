import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DashboardSummary } from '../types'
import { useApi } from '../composables/useApi'

export const DASHBOARD_POLL_INTERVAL = 60_000

export const useDashboardStore = defineStore('dashboard', () => {
  const summary = ref<DashboardSummary | null>(null)
  const loading = ref(false)
  const refreshing = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)
  const { fetchWithAuth } = useApi()

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const fetchSummary = async (silent = false) => {
    if (!summary.value) {
      loading.value = true
    } else if (!silent) {
      refreshing.value = true
    }

    const { data, error: fetchError } = await fetchWithAuth('/dashboard/summary')

    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      summary.value = data as DashboardSummary
      lastUpdated.value = new Date()
      error.value = null
    }

    loading.value = false
    refreshing.value = false
  }

  const onVisibilityChange = () => {
    if (typeof document !== 'undefined' && !document.hidden) {
      fetchSummary(true)
    }
  }

  const startPolling = () => {
    if (typeof window === 'undefined' || pollTimer) return

    pollTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return
      fetchSummary(true)
    }, DASHBOARD_POLL_INTERVAL)

    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  return {
    summary,
    loading,
    refreshing,
    error,
    lastUpdated,
    fetchSummary,
    startPolling,
    stopPolling
  }
})
