import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Grade } from '../types'
import { useApi } from '../composables/useApi'

interface GradeQuery {
  class?: string
  subject?: string
  studentId?: string
}

export const useGradeStore = defineStore('grade', () => {
  const grades = ref<Grade[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { fetchWithAuth } = useApi()

  const mapGrade = (g: any): Grade => ({
    id: g.id,
    studentId: g.studentId ?? g.student_id,
    studentName: g.studentName ?? g.student_name,
    subject: g.subject,
    score: g.score,
    date: g.date
  })

  const fetchGrades = async (query: GradeQuery = {}) => {
    loading.value = true
    error.value = null
    const params = new URLSearchParams()
    Object.entries(query).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const suffix = params.toString() ? `?${params.toString()}` : ''
    const { data, error: fetchError } = await fetchWithAuth(`/grades${suffix}`)

    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      grades.value = data.map(mapGrade)
    }
    loading.value = false
  }

  const addGrade = async (grade: Omit<Grade, 'id'>) => {
    loading.value = true
    const { data, error: fetchError } = await fetchWithAuth('/grades', {
      method: 'POST',
      body: JSON.stringify({
        studentId: grade.studentId,
        studentName: grade.studentName,
        subject: grade.subject,
        score: grade.score,
        date: grade.date
      })
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    if (data) grades.value.push(mapGrade(data))
    loading.value = false
    return true
  }

  const bulkSaveGrades = async (
    entries: Array<{ studentId: string; studentName: string; subject: string; score: number; date: string }>
  ) => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await fetchWithAuth('/grades/bulk', {
      method: 'POST',
      body: JSON.stringify({ grades: entries })
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    if (data) await fetchGrades()
    loading.value = false
    return true
  }

  const updateGrade = async (id: string, updates: Partial<Grade>) => {
    loading.value = true
    const payload: Record<string, unknown> = {}
    if (updates.studentId) payload.studentId = updates.studentId
    if (updates.studentName) payload.studentName = updates.studentName
    if (updates.subject) payload.subject = updates.subject
    if (updates.score !== undefined) payload.score = updates.score
    if (updates.date) payload.date = updates.date

    const { data, error: fetchError } = await fetchWithAuth(`/grades/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    if (data) {
      const index = grades.value.findIndex((g) => g.id === id)
      if (index !== -1) grades.value[index] = mapGrade(data)
    }
    loading.value = false
    return true
  }

  const deleteGrade = async (id: string) => {
    loading.value = true
    const { error: fetchError } = await fetchWithAuth(`/grades/${id}`, {
      method: 'DELETE'
    })

    if (fetchError) {
      error.value = fetchError
      loading.value = false
      return false
    }

    grades.value = grades.value.filter((g) => g.id !== id)
    loading.value = false
    return true
  }

  return {
    grades,
    loading,
    error,
    fetchGrades,
    addGrade,
    bulkSaveGrades,
    updateGrade,
    deleteGrade
  }
})
