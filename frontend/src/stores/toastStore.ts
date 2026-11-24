import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastType = 'success' | 'danger' | 'warning' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])
  let nextId = 1

  const remove = (id: number) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const push = (message: string, type: ToastType) => {
    const id = nextId++
    toasts.value.push({ id, message, type })
    setTimeout(() => remove(id), 4000)
  }

  const success = (message: string) => push(message, 'success')
  const error = (message: string) => push(message, 'danger')
  const warning = (message: string) => push(message, 'warning')
  const info = (message: string) => push(message, 'info')

  return { toasts, remove, success, error, warning, info }
})
