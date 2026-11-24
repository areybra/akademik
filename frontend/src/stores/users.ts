import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

export interface UserAssignment {
  id?: string
  subject: string
  class: string
}

export interface User {
  id: string
  name: string
  email: string
  role: string
  class: string | null
  roles: string[]
  student_id: string | null
  active: number | boolean
  student_name?: string | null
  children?: string | null
  assignments?: string | null
  avatar?: string | null
}

export interface UserDetail {
  id: string
  name: string
  email: string
  role: string
  roles: string[]
  class: string | null
  student_id: string | null
  active: number | boolean
  student_name?: string | null
  parentStudentIds: string[]
  assignments: UserAssignment[]
}

export interface UserForm {
  name?: string
  email?: string
  password?: string
  role?: string
  roles?: string[]
  class?: string | null
  studentId?: string | null
  parentStudentIds?: string[]
  assignments?: UserAssignment[]
  active?: boolean
}

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { fetchWithAuth } = useApi()

  const fetchUsers = async () => {
    loading.value = true
    error.value = null
    // useApi sudah memakai base `http://localhost:3000/api`, jadi path tanpa prefix /api.
    const { data, error: fetchError } = await fetchWithAuth('/users')
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      users.value = data
    }
    loading.value = false
  }

  const fetchUser = async (id: string): Promise<UserDetail | null> => {
    error.value = null
    const { data, error: fetchError } = await fetchWithAuth(`/users/${id}`)
    if (fetchError) {
      error.value = fetchError
      return null
    }
    return data as UserDetail
  }

  const fetchMe = async () => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await fetchWithAuth('/users/me')
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      if (!users.value.some((u) => u.id === data.id)) {
        users.value.unshift(data)
      }
    }
    loading.value = false
  }

  const createUser = async (form: UserForm) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth('/users', {
      method: 'POST',
      body: JSON.stringify(form)
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    await fetchUsers()
    return true
  }

  const updateUser = async (id: string, form: UserForm) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(form)
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    await fetchUsers()
    return true
  }

  const deleteUser = async (id: string) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth(`/users/${id}`, {
      method: 'DELETE'
    })
    loading.value = false
    if (fetchError) {
      error.value = fetchError
      return false
    }
    users.value = users.value.filter((u) => u.id !== id)
    return true
  }

  const toggleActive = async (id: string, active: boolean) => updateUser(id, { active })

  const resetPassword = async (id: string, password: string) => updateUser(id, { password })

  return {
    users,
    loading,
    error,
    fetchUsers,
    fetchUser,
    fetchMe,
    createUser,
    updateUser,
    deleteUser,
    toggleActive,
    resetPassword
  }
})
