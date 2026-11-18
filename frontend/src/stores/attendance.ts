import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AttendanceRecord } from '../types'
import { useApi } from '../composables/useApi'

interface AttendanceQuery {
  date?: string
  from?: string
  to?: string
  class?: string
  studentId?: string
  status?: string
}

export const useAttendanceStore = defineStore('attendance', () => {
  const attendances = ref<AttendanceRecord[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { fetchWithAuth } = useApi()

  const fetchAttendances = async (query: AttendanceQuery = {}) => {
    loading.value = true
    error.value = null
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const { data, error: fetchError } = await fetchWithAuth(`/attendances${suffix}`)

    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      attendances.value = data.map((a: any) => ({
        id: a.id,
        studentId: a.studentId,
        studentName: a.studentName,
        date: a.date,
        status: a.status,
        note: a.note
      }))
    }
    loading.value = false
  }

  const saveBulkAttendance = async (
    records: (Omit<AttendanceRecord, 'id'> & { id?: string; note?: string })[]
  ) => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await fetchWithAuth('/attendances', {
      method: 'POST',
      body: JSON.stringify({
        attendances: records.map((record) => ({
          id: record.id,
          studentId: record.studentId,
          studentName: record.studentName,
          date: record.date,
          status: record.status,
          note: record.note
        }))
      })
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    if (data) {
      await fetchAttendances()
    }
    loading.value = false
    return true
  }

  const deleteAttendance = async (id: string) => {
    loading.value = true
    const { error: fetchError } = await fetchWithAuth(`/attendances/${id}`, {
      method: 'DELETE'
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    attendances.value = attendances.value.filter((a) => a.id !== id)
    loading.value = false
    return true
  }

  return {
    attendances,
    loading,
    error,
    fetchAttendances,
    saveBulkAttendance,
    deleteAttendance
  }
})
