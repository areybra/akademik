import { useAuthStore } from '../stores/auth'

export const useApi = () => {
  const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api'

  const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const authStore = useAuthStore()
    const token = localStorage.getItem('token')

    const providedHeaders = (options.headers as Record<string, string> | undefined) ?? {}
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData

    // FormData wajib dibiarkan tanpa Content-Type agar browser menulis boundary sendiri.
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...providedHeaders,
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    try {
      const response = await fetch(`${baseURL}${endpoint}`, {
        ...options,
        headers: headers as HeadersInit,
      })

      // Handle 401 Unauthorized globally
      if (response.status === 401) {
        authStore.logout()
        window.location.href = '/login'
        throw new Error('Sesi telah berakhir, silakan login kembali.')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Terjadi kesalahan pada server')
      }

      return { data, error: null }
    } catch (err: any) {
      console.error(`API Error (${endpoint}):`, err)
      return { data: null, error: err.message || 'Gagal terhubung ke server' }
    }
  }

  return { fetchWithAuth }
}
