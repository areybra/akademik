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
        class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600 focus:outline-none px-2 py-1 rounded"
        @click="showPassword = !showPassword"
      >
        {{ showPassword ? 'Sembunyikan' : 'Tampilkan' }}
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
