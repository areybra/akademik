<template>
  <div class="w-full">
    <label v-if="label" :for="id" class="clean-label">{{ label }}</label>
    <div class="relative">
      <input
        :id="id"
        :type="inputType"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="error ? 'true' : undefined"
        class="clean-input min-h-[40px] pr-10"
        :class="{ 'border-rose-500 focus:ring-rose-500/20 focus:border-rose-500': error }"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="togglePassword"
        type="button"
        :aria-label="showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'"
        class="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none p-1.5 rounded"
        @click="showPassword = !showPassword"
      >
        <svg v-if="showPassword" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 10-6 0 3 3 0 006 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 104.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29m0 0a3 3 0 10-4.243-4.243m-4.243 4.243L9.88 9.88z" /></svg>
      </button>
    </div>
    <p v-if="error" class="mt-1.5 text-xs font-semibold text-rose-600 uppercase tracking-wider">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
interface Props {
  modelValue: string | number
  label?: string
  type?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  id?: string
  togglePassword?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  placeholder: '',
  required: false,
  disabled: false,
  togglePassword: false,
  id: () => `input-${Math.random().toString(36).substr(2, 9)}`
})

const showPassword = ref(false)
const inputType = computed(() => {
  if (!props.togglePassword) return props.type
  return showPassword.value ? 'text' : 'password'
})

defineEmits(['update:modelValue'])
</script>
