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

export interface ParentAccount {
  id: string
  name: string
  email: string
}

export interface ParentRelation {
  parent_id: string
  parent_name: string
  parent_email: string
  student_id: string
  student_name: string
  class: string
}

export const useRelationStore = defineStore('relation', () => {
  const teachers = ref<TeacherAccount[]>([])
  const assignments = ref<TeacherAssignment[]>([])
  const parentAccounts = ref<ParentAccount[]>([])
  const parentRelations = ref<ParentRelation[]>([])
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

  const fetchParentAccounts = async () => {
    const { data, error: fetchError } = await fetchWithAuth('/relations/parent-accounts')
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      parentAccounts.value = data
    }
  }

  const fetchParents = async () => {
    const { data, error: fetchError } = await fetchWithAuth('/relations/parents')
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      parentRelations.value = data
    }
  }

  const addParentRelation = async (parentEmail: string, studentId: string) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth('/relations/parents', {
      method: 'POST',
      body: JSON.stringify({ parentEmail, studentId })
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    await fetchParents()
    return true
  }

  const removeParentRelation = async (parentId: string, studentId: string) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth(`/relations/parents/${parentId}/${studentId}`, {
      method: 'DELETE'
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    parentRelations.value = parentRelations.value.filter((item) => !(item.parent_id === parentId && item.student_id === studentId))
    return true
  }

  return {
    teachers,
    assignments,
    parentAccounts,
    parentRelations,
    loading,
    error,
    fetchTeachers,
    fetchAssignments,
    addAssignment,
    removeAssignment,
    fetchParentAccounts,
    fetchParents,
    addParentRelation,
    removeParentRelation
  }
})
