<template>
  <div class="space-y-6 pb-20 max-w-5xl">
    <div>
      <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Manajemen Akun</h1>
      <p class="text-sm text-slate-500 mt-0.5">
        Kelola akun pengguna, tautan orang tua dengan anak, dan penugasan mengajar guru.
      </p>
    </div>

    <div class="flex flex-wrap gap-2" role="tablist" aria-label="Kelola akun">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :aria-selected="activeTab === tab.id"
        class="rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
        :class="activeTab === tab.id
          ? 'border-cta bg-cta text-cta-ink shadow-sm'
          : 'border-line bg-panel text-slate-600 hover:border-indigo-300'"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <UsersPage v-show="activeTab === 'users'" />
    <ParentRelationsSettings v-show="activeTab === 'parents'" />
    <TeacherAssignmentsSettings v-show="activeTab === 'assignments'" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import UsersPage from '../users/UsersPage.vue'
import ParentRelationsSettings from './ParentRelationsSettings.vue'
import TeacherAssignmentsSettings from './TeacherAssignmentsSettings.vue'

const tabs = [
  { id: 'users', label: 'Akun Pengguna' },
  { id: 'parents', label: 'Tautan Orang Tua & Siswa' },
  { id: 'assignments', label: 'Penugasan Mengajar' }
] as const

const activeTab = ref<(typeof tabs)[number]['id']>('users')
</script>
