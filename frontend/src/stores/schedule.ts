import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Schedule } from '../types'
import { useApi } from '../composables/useApi'

export const useScheduleStore = defineStore('schedule', () => {
  const schedules = ref<Schedule[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { fetchWithAuth } = useApi()

  const mapSchedule = (s: any): Schedule => ({
    id: s.id,
    class: s.class,
    time: s.time,
    subject: s.subject,
    teacher: s.teacher,
    teacherId: s.teacher_id ?? s.teacherId ?? null,
    room: s.room,
    day: s.day || 'Belum ditentukan'
  })

  const fetchSchedules = async (query: { class?: string; day?: string; teacherId?: string } = {}) => {
    loading.value = true
    error.value = null
    const params = new URLSearchParams()
    if (query.class) params.set('class', query.class)
    if (query.day) params.set('day', query.day)
    if (query.teacherId) params.set('teacherId', query.teacherId)
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const { data, error: fetchError } = await fetchWithAuth(`/schedules${suffix}`)

    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      schedules.value = data.map(mapSchedule)
    }
    loading.value = false
  }

  const addSchedule = async (schedule: Omit<Schedule, 'id'>) => {
    loading.value = true
    const { data, error: fetchError } = await fetchWithAuth('/schedules', {
      method: 'POST',
      body: JSON.stringify({
        class: schedule.class,
        time: schedule.time,
        subject: schedule.subject,
        teacher: schedule.teacher,
        teacherId: schedule.teacherId || null,
        room: schedule.room,
        day: schedule.day
      })
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    if (data) schedules.value.push(mapSchedule(data))
    loading.value = false
    return true
  }

  const updateSchedule = async (id: string, updates: Partial<Schedule>) => {
    loading.value = true
    const payload: Record<string, unknown> = {}
    if (updates.class) payload.class = updates.class
    if (updates.time) payload.time = updates.time
    if (updates.subject) payload.subject = updates.subject
    if (updates.teacher) payload.teacher = updates.teacher
    if (updates.teacherId !== undefined) payload.teacherId = updates.teacherId
    if (updates.room) payload.room = updates.room
    if (updates.day) payload.day = updates.day

    const { data, error: fetchError } = await fetchWithAuth(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    if (data) {
      const index = schedules.value.findIndex((s) => s.id === id)
      if (index !== -1) schedules.value[index] = mapSchedule(data)
    }
    loading.value = false
    return true
  }

  const deleteSchedule = async (id: string) => {
    loading.value = true
    const { error: fetchError } = await fetchWithAuth(`/schedules/${id}`, {
      method: 'DELETE'
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    schedules.value = schedules.value.filter((s) => s.id !== id)
    loading.value = false
    return true
  }

  return {
    schedules,
    loading,
    error,
    fetchSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule
  }
})
