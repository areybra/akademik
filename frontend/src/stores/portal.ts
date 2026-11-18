import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../composables/useApi'
import { useAuthStore } from './auth'

export interface PortalChild {
  id: string
  name: string
  class: string
  photo?: string | null
}

export interface PortalSubject {
  subject: string
  score: number
  average: number
  delta: number
  count: number
  date: string | null
}

export interface PortalSummary {
  generatedAt?: string
  children: PortalChild[]
  selected: {
    profile: PortalChild & { waliKelas?: string | null }
    attendance: {
      referenceDate: string
      rate: number
      counts: { hadir: number; izin: number; alfa: number; total: number }
      trend: Array<{ date: string; status: string | null; hadir: number; izin: number; alfa: number }>
      records: Array<{ date: string; status: string; note?: string | null }>
      today: { date: string; status: string | null; note?: string | null; isToday: boolean }
    }
    grades: {
      average: number
      subjects: PortalSubject[]
      recent: Array<{ subject: string; score: number; date: string }>
    }
    billing: {
      total: number
      paidCount: number
      unpaidCount: number
      outstanding: number
      totalAmount: number
      paidAmount: number
      nextBill: { period: string; amount: number; status: string; label: string } | null
      byStatus: Array<{ status: string; label: string; count: number; amount: number }>
    }
    schedule: {
      today: Array<{ time: string; subject: string; teacher: string; room: string }>
      tomorrow: Array<{ time: string; subject: string; teacher: string; room: string }>
      todayLabel: string
      tomorrowLabel: string
    }
    prestasi: Array<{ kategori: string; juara: string; event: string; tahun: string }>
  } | null
  message?: string
}

export const usePortalStore = defineStore('portal', () => {
  const summary = ref<PortalSummary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { fetchWithAuth } = useApi()

  const childStorageKey = () => `akademik-portal-child-${useAuthStore().user?.id || 'guest'}`

  const rememberChild = (id: string) => {
    if (id) localStorage.setItem(childStorageKey(), id)
  }

  const fetchSummary = async (studentId?: string) => {
    loading.value = true
    error.value = null
    const preferred = studentId || localStorage.getItem(childStorageKey()) || ''
    const suffix = preferred ? `?studentId=${encodeURIComponent(preferred)}` : ''
    const { data, error: fetchError } = await fetchWithAuth(`/portal/summary${suffix}`)

    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      summary.value = data
      if (data.selected?.profile?.id) {
        localStorage.setItem(childStorageKey(), data.selected.profile.id)
      }
    }
    loading.value = false
  }

  return { summary, loading, error, fetchSummary, rememberChild }
})
