import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

export interface TeacherAccount {
  id: string
  name: string
  email: string
  role: string
  roles?: string | null
}

export interface TeacherAssignment {
  id: string
  teacher_id: string
  teacher_name: string
  teacher_email: string
  subject: string
  class: string
}

export const useRelationStore = defineStore('relation', () => {
  const teachers = ref<TeacherAccount[]>([])
  const assignments = ref<TeacherAssignment[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const { fetchWithAuth } = useApi()

  const fetchTeachers = async () => {
    const { data, error: fetchError } = await fetchWithAuth('/relations/teachers')
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      teachers.value = data
    }
  }

  const fetchAssignments = async () => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await fetchWithAuth('/relations/teacher-assignments')
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      assignments.value = data
    }
    loading.value = false
  }

  const addAssignment = async (teacherEmail: string, subject: string, className: string) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth('/relations/teacher-assignments', {
      method: 'POST',
      body: JSON.stringify({ teacherEmail, subject, class: className })
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    await fetchAssignments()
    return true
  }

  const removeAssignment = async (id: string) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth(`/relations/teacher-assignments/${id}`, {
      method: 'DELETE'
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    assignments.value = assignments.value.filter((item) => item.id !== id)
    return true
  }

  return {
    teachers,
    assignments,
    loading,
    error,
    fetchTeachers,
    fetchAssignments,
    addAssignment,
    removeAssignment
  }
})
