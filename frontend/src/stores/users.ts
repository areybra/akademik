import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useApi } from '../composables/useApi'

export interface User {
  id: string
  name: string
  email: string
  role: string
  class: string | null
  roles: string[]
  student_id: string | null
  avatar: string | null
}

export interface UserForm {
  name: string
  email: string
  password: string
  role: string
  class: string
  roles?: string[]
}

export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const { fetchWithAuth } = useApi()

  const fetchUsers = async () => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await fetchWithAuth('/api/users')
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      users.value = data
    }
    loading.value = false
  }

  const fetchMe = async () => {
    loading.value = true
    error.value = null
    const { data, error: fetchError } = await fetchWithAuth('/api/users/me')
    if (fetchError) {
      error.value = fetchError
    } else if (data) {
      // fallback kalau data pengguna sedang login belum ada di list
      if (!users.value.some((u) => u.id === data.id)) {
        users.value.unshift(data)
      }
    }
    loading.value = false
  }

  const createUser = async (form: UserForm) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth('/api/users', {
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

  const updateUser = async (id: string, form: Partial<UserForm>) => {
    loading.value = true
    error.value = null
    const { error: fetchError } = await fetchWithAuth(`/api/users/${id}`, {
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
    const { error: fetchError } = await fetchWithAuth(`/api/users/${id}`, {
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

  return {
    users,
    loading,
    error,
    fetchUsers,
    fetchMe,
    createUser,
    updateUser,
    deleteUser
  }
})