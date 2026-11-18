<template>
  <div class="space-y-6 pb-16">
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Profil</h1>
      <p class="text-sm text-slate-500 mt-1">Data singkat anak dan kelasnya.</p>
    </div>

    <div v-if="portalStore.loading && !selected" class="clean-card p-6 animate-pulse">
      <div class="h-4 w-32 rounded bg-slate-100"></div>
      <div class="mt-4 h-20 w-20 rounded-full bg-slate-100"></div>
      <div class="mt-4 h-3 w-48 rounded bg-slate-100"></div>
    </div>

    <div v-else-if="!selected" class="clean-card p-8 text-center">
      <h2 class="text-base font-bold text-slate-900">Data belum tersedia</h2>
      <p class="mt-1 text-sm text-slate-500">{{ portalStore.summary?.message || 'Hubungi admin sekolah untuk menautkan akun.' }}</p>
    </div>

    <template v-else>
      <!-- Pemilih anak -->
      <div v-if="children.length > 1" class="flex flex-wrap gap-2">
        <button
          v-for="child in children"
          :key="child.id"
          type="button"
          class="rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
          :class="selected.profile.id === child.id
            ? 'border-cta bg-cta text-cta-ink shadow-sm'
            : 'border-line bg-panel text-slate-600 hover:border-indigo-300'"
          @click="selectChild(child.id)"
        >
          {{ child.name }}
        </button>
      </div>

      <!-- Kartu profil -->
      <section class="clean-card overflow-hidden">
        <div class="bg-slate-50 px-5 py-6 sm:px-6">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <img
              v-if="selected.profile.photo"
              :src="photoUrl(selected.profile.photo)"
              :alt="selected.profile.name"
              class="h-20 w-20 rounded-2xl object-cover border border-line bg-panel"
            />
            <div
              v-else
              class="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-xl font-bold text-indigo-600 border border-indigo-100"
            >
              {{ initials(selected.profile.name) }}
            </div>
            <div class="min-w-0">
              <h2 class="text-xl font-bold text-slate-900 tracking-tight truncate">{{ selected.profile.name }}</h2>
              <p class="mt-1 text-sm font-semibold text-slate-600">{{ selected.profile.class }}</p>
              <p class="mt-0.5 text-xs text-slate-500">
                Wali kelas:
                <span class="font-semibold text-slate-700">{{ selected.profile.waliKelas || 'Belum ditentukan' }}</span>
              </p>
            </div>
          </div>
        </div>

        <dl class="divide-y divide-line px-5 sm:px-6">
          <div class="flex items-start justify-between gap-4 py-3.5">
            <dt class="text-xs font-semibold text-slate-500">Kelas</dt>
            <dd class="text-xs font-bold text-slate-800 text-right">{{ selected.profile.class }}</dd>
          </div>
          <div class="flex items-start justify-between gap-4 py-3.5">
            <dt class="text-xs font-semibold text-slate-500">Wali kelas</dt>
            <dd class="text-xs font-bold text-slate-800 text-right">{{ selected.profile.waliKelas || '—' }}</dd>
          </div>
          <div class="flex items-start justify-between gap-4 py-3.5">
            <dt class="text-xs font-semibold text-slate-500">Kehadiran 30 hari</dt>
            <dd class="text-xs font-bold text-slate-800 text-right">
              {{ selected.attendance.counts.hadir }} dari {{ selected.attendance.counts.total }} hari
            </dd>
          </div>
          <div class="flex items-start justify-between gap-4 py-3.5">
            <dt class="text-xs font-semibold text-slate-500">Rata-rata nilai</dt>
            <dd class="text-xs font-bold text-slate-800 text-right">{{ formatScore(selected.grades.average) }}</dd>
          </div>
        </dl>
      </section>

      <section class="clean-card p-5">
        <h3 class="text-sm font-bold text-slate-900">Butuh bantuan?</h3>
        <p class="mt-1 text-xs leading-relaxed text-slate-500">
          Hubungi wali kelas {{ selected.profile.waliKelas || selected.profile.class }} melalui menu bantuan sekolah
          untuk menanyakan perkembangan belajar anak.
        </p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePortalStore } from '../../stores/portal'

const portalStore = usePortalStore()
const selectedId = ref('')

const children = computed(() => portalStore.summary?.children ?? [])
const selected = computed(() => portalStore.summary?.selected ?? null)

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

const formatScore = (value: number) => (Number(value) || 0).toFixed(1).replace('.', ',')

const photoUrl = (path: string) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `http://localhost:3000${path.startsWith('/') ? '' : '/'}${path}`
}

const selectChild = (id: string) => {
  selectedId.value = id
  portalStore.fetchSummary(id)
}

onMounted(async () => {
  if (!portalStore.summary?.selected) await portalStore.fetchSummary()
  if (portalStore.summary?.selected) selectedId.value = portalStore.summary.selected.profile.id
})
</script>
