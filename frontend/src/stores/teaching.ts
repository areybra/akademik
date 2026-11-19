import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

export interface TeachingAssignment {
  id: string
  subject: string
  class: string
}

export interface TeachingSlot {
  id: string
  class: string
  time: string
  subject: string
  teacher: string
  teacherId?: string | null
  room: string
  day: string
  sessionId: string | null
  filled: number
  total: number
  complete: boolean
  status: 'draft' | 'submitted'
  submittedAt: string | null
  startAt: string | null
  endAt: string | null
  missingInput: boolean
}

export interface SessionStudent {
  id: string
  name: string
  class: string
}

export interface SessionRecord {
  studentId: string
  studentName: string
  status: 'hadir' | 'izin' | 'alfa'
  note: string
}

export interface LessonSession {
  id: string
  scheduleId: string
  date: string
  class: string
  subject: string
  teacherId: string
  updatedAt: string
  status: 'draft' | 'submitted'
  submittedAt: string | null
  records: SessionRecord[]
  students: SessionStudent[]
}

export interface GradebookStudent extends SessionStudent {
  latestScore: number | null
  latestDate: string | null
}

export const useTeachingStore = defineStore('teaching', () => {
  const slots = ref<TeachingSlot[]>([])
  const assignments = ref<TeachingAssignment[]>([])
  const gradebook = ref<GradebookStudent[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { fetchWithAuth } = useApi()

  const fetchToday = async (date?: string) => {
    loading.value = true
    error.value = null
    const suffix = date ? `?date=${date}` : ''
    const { data, error: fetchError } = await fetchWithAuth(`/teaching/today${suffix}`)
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      slots.value = data.slots
      assignments.value = data.assignments
    }
    loading.value = false
  }

  const openSession = async (scheduleId: string, date: string): Promise<LessonSession | null> => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await fetchWithAuth('/teaching/sessions', {
      method: 'POST',
      body: JSON.stringify({ scheduleId, date })
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return null
    }
    return data as LessonSession
  }

  const saveSession = async (
    sessionId: string,
    attendances: Array<{ studentId: string; status: 'hadir' | 'izin' | 'alfa'; note?: string }>
  ) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth(`/teaching/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify({ attendances })
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    return true
  }

  const submitSession = async (sessionId: string) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth(`/teaching/sessions/${sessionId}/submit`, { method: 'POST' })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    return true
  }

  const unlockSession = async (sessionId: string) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth(`/teaching/sessions/${sessionId}/unlock`, { method: 'POST' })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    return true
  }

  const fetchGradebook = async (className: string, subject: string) => {
    loading.value = true
    error.value = null
    const params = new URLSearchParams({ class: className, subject })
    const { data, error: fetchError } = await fetchWithAuth(`/teaching/gradebook?${params.toString()}`)
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      gradebook.value = data.students
    }
    loading.value = false
  }

  return {
    slots,
    assignments,
    gradebook,
    loading,
    error,
    fetchToday,
    openSession,
    saveSession,
    submitSession,
    unlockSession,
    fetchGradebook
  }
})
