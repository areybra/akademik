<template>
  <div class="space-y-5 pb-10">
    <!-- Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{{ greeting }}</p>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          {{ authStore.user?.name }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Ringkasan belajar
          <span v-if="selected" class="font-semibold text-slate-700">{{ selected.profile.name }}</span>
          <span v-if="selected" class="text-slate-400"> · {{ selected.profile.class }}</span>
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <div class="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="Mode tampilan">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id"
            class="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
            :class="activeTab === tab.id ? 'bg-panel text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
            @click="setTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        </div>

        <button
          type="button"
          class="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          :disabled="portalStore.loading"
          aria-label="Muat ulang ringkasan"
          @click="refresh"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': portalStore.loading }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Child switcher -->
    <div v-if="children.length > 1" class="flex flex-wrap gap-2" role="tablist" aria-label="Pilih anak">
      <button
        v-for="child in children"
        :key="child.id"
        type="button"
        role="tab"
        :aria-selected="selected?.profile.id === child.id"
        class="flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors"
        :class="selected?.profile.id === child.id
          ? 'border-cta bg-cta text-cta-ink shadow-sm'
          : 'border-line bg-panel text-slate-700 hover:border-indigo-300'"
        @click="selectChild(child.id)"
      >
        <span
          class="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold"
          :class="selected?.profile.id === child.id ? 'bg-black/10' : 'bg-indigo-50 text-indigo-600'"
        >
          {{ initials(child.name) }}
        </span>
        <span class="min-w-0">
          <span class="block truncate text-xs font-bold">{{ child.name }}</span>
          <span class="block text-[10px] opacity-80">{{ child.class }}</span>
        </span>
      </button>
    </div>

    <!-- Loading / empty -->
    <div v-if="portalStore.loading && !selected" class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div v-for="index in 3" :key="`portal-skeleton-${index}`" class="clean-card p-5 animate-pulse">
        <div class="h-3 w-24 rounded bg-slate-100"></div>
        <div class="mt-3 h-8 w-20 rounded bg-slate-100"></div>
        <div class="mt-4 h-3 w-32 rounded bg-slate-100"></div>
      </div>
    </div>

    <div v-else-if="!selected" class="clean-card p-8 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.2 16a2 2 0 001.73 3z" />
        </svg>
      </div>
      <h2 class="mt-3 text-base font-bold text-slate-900">Data anak belum tersedia</h2>
      <p class="mt-1 text-sm text-slate-500">{{ portalStore.summary?.message || 'Hubungi admin sekolah untuk menautkan akun.' }}</p>
    </div>

    <template v-else>
      <!-- ================= RINGKASAN ================= -->
      <template v-if="activeTab === 'ringkasan'">
        <!-- Status hari ini -->
        <section class="rounded-card border p-5 sm:p-6" :class="statusMeta.card">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-start gap-4">
              <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/70" :class="statusMeta.icon">
                <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="statusMeta.path" />
                </svg>
              </div>
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">{{ selected.profile.name }}</p>
                <h2 class="mt-1 text-xl sm:text-2xl font-bold tracking-tight">{{ statusMeta.label }}</h2>
                <p class="mt-1 text-sm opacity-80">{{ statusMeta.detail }}</p>
              </div>
            </div>
            <div class="sm:text-right">
              <p class="text-[10px] font-bold uppercase tracking-[0.15em] opacity-70">Kehadiran 30 hari</p>
              <p class="text-2xl font-bold tabular-nums">{{ selected.attendance.rate }}%</p>
              <p class="text-xs opacity-80">{{ selected.attendance.counts.hadir }} dari {{ selected.attendance.counts.total }} hari</p>
            </div>
          </div>
        </section>

        <!-- Tiga kartu ringkas -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            class="clean-card p-4 text-left transition-colors hover:border-indigo-300"
            @click="goTo('/attendance')"
          >
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kehadiran bulan ini</span>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            </div>
            <p class="mt-3 text-2xl font-bold text-slate-900 tabular-nums">{{ selected.attendance.counts.hadir }} hari</p>
            <p class="mt-1 text-[11px] text-slate-500">
              Izin {{ selected.attendance.counts.izin }} · Tanpa kabar {{ selected.attendance.counts.alfa }}
            </p>
          </button>

          <button
            type="button"
            class="clean-card p-4 text-left transition-colors hover:border-indigo-300"
            @click="goTo('/grades')"
          >
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rata-rata nilai</span>
              <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m4 0h2a2 2 0 002-2V5a2 2 0 00-2-2h-2a2 2 0 00-2 2v14z" />
                </svg>
              </span>
            </div>
            <div class="mt-3 flex items-end gap-2">
              <p class="text-2xl font-bold text-slate-900 tabular-nums">{{ formatScore(selected.grades.average) }}</p>
              <span class="mb-1 rounded-md px-2 py-0.5 text-[10px] font-bold" :class="predicateMeta(selected.grades.average).badge">
                {{ predicateMeta(selected.grades.average).label }}
              </span>
            </div>
            <p class="mt-1 text-[11px] text-slate-500">{{ selected.grades.subjects.length }} mata pelajaran</p>
          </button>

          <button
            type="button"
            class="clean-card p-4 text-left transition-colors hover:border-indigo-300"
            @click="goTo('/billing')"
          >
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">SPP</span>
              <span
                class="flex h-8 w-8 items-center justify-center rounded-lg"
                :class="selected.billing.outstanding > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 10c-4.418 0-8-1.79-8-4V8c0-2.21 3.582-4 8-4s8 1.79 8 4v6c0 2.21-3.582 4-8 4z" />
                </svg>
              </span>
            </div>
            <p class="mt-3 text-2xl font-bold tabular-nums" :class="selected.billing.outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'">
              {{ selected.billing.outstanding > 0 ? formatMoney(selected.billing.outstanding) : 'Lunas' }}
            </p>
            <p class="mt-1 text-[11px] text-slate-500">
              {{ selected.billing.outstanding > 0 ? 'Belum dibayar' : 'Tidak ada tunggakan' }}
            </p>
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <!-- Jadwal -->
          <section class="clean-card p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900">Pelajaran hari ini</h3>
              <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {{ selected.schedule.todayLabel }}
              </span>
            </div>

            <ul v-if="todaySchedule.length > 0" class="mt-3 divide-y divide-line">
              <li v-for="slot in todaySchedule" :key="`${slot.time}-${slot.subject}`" class="flex items-center gap-3 py-2.5">
                <span class="w-20 shrink-0 rounded-lg bg-indigo-50 px-2 py-1 text-center text-[11px] font-bold text-indigo-600 tabular-nums">
                  {{ slot.time.split(' - ')[0] }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-bold text-slate-800">{{ slot.subject }}</p>
                  <p class="truncate text-[10px] text-slate-400">{{ slot.teacher }} · {{ slot.room }}</p>
                </div>
              </li>
            </ul>
            <p v-else class="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
              Tidak ada pelajaran hari ini.
              <span v-if="tomorrowSchedule.length > 0" class="block mt-1 text-slate-600">
                Besok: {{ tomorrowSchedule[0].subject }} pukul {{ tomorrowSchedule[0].time.split(' - ')[0] }}.
              </span>
            </p>
          </section>

          <!-- Nilai terbaru -->
          <section class="clean-card p-4 sm:p-5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-900">Nilai terbaru</h3>
              <button type="button" class="text-[11px] font-bold text-indigo-600 hover:underline" @click="goTo('/grades')">
                Lihat semua
              </button>
            </div>

            <ul v-if="selected.grades.subjects.length > 0" class="mt-3 divide-y divide-line">
              <li v-for="item in selected.grades.subjects.slice(0, 3)" :key="item.subject" class="flex items-center gap-3 py-2.5">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-bold text-slate-800">{{ item.subject }}</p>
                  <p class="text-[10px] text-slate-400">
                    {{ item.count }} nilai
                    <span v-if="item.delta !== 0" :class="item.delta > 0 ? 'text-emerald-600' : 'text-rose-500'">
                      · {{ item.delta > 0 ? 'naik' : 'turun' }} {{ Math.abs(item.delta) }}
                    </span>
                  </p>
                </div>
                <span class="text-sm font-bold text-slate-900 tabular-nums">{{ item.score }}</span>
                <span class="w-24 rounded-md px-2 py-1 text-center text-[10px] font-bold" :class="predicateMeta(item.score).badge">
                  {{ predicateMeta(item.score).label }}
                </span>
              </li>
            </ul>
            <p v-else class="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">Belum ada nilai yang diinput.</p>
          </section>
        </div>

        <!-- Prestasi & wali kelas -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          <section class="clean-card p-4 sm:p-5">
            <h3 class="text-sm font-bold text-slate-900">Kabar sekolah</h3>
            <ul v-if="selected.prestasi.length > 0" class="mt-3 space-y-2">
              <li v-for="item in selected.prestasi" :key="`${item.event}-${item.tahun}`" class="flex items-start gap-3 rounded-xl bg-amber-50/60 px-3 py-2.5">
                <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </span>
                <div class="min-w-0">
                  <p class="text-xs font-bold text-slate-800">{{ item.juara }} — {{ item.kategori }}</p>
                  <p class="truncate text-[10px] text-slate-500">{{ item.event }} · {{ item.tahun }}</p>
                </div>
              </li>
            </ul>
            <p v-else class="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">Belum ada kabar prestasi.</p>
          </section>

          <section class="clean-card p-4 sm:p-5">
            <h3 class="text-sm font-bold text-slate-900">Wali kelas</h3>
            <div class="mt-3 flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-50 text-sm font-bold text-indigo-600">
                {{ initials(selected.profile.waliKelas || 'WK') }}
              </div>
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-slate-800">{{ selected.profile.waliKelas || 'Belum ditentukan' }}</p>
                <p class="text-[10px] text-slate-400">Wali kelas {{ selected.profile.class }}</p>
              </div>
            </div>
            <p class="mt-3 text-[11px] leading-relaxed text-slate-500">
              Ingin menanyakan perkembangan anak? Hubungi wali kelas melalui menu bantuan di sekolah.
            </p>
          </section>
        </div>
      </template>

      <!-- ================= STATISTIK ================= -->
      <template v-else>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          <ChartCard
            class="lg:col-span-2"
            title="Kehadiran 30 Hari"
            :subtitle="`Hadir ${selected.attendance.counts.hadir} hari dari ${selected.attendance.counts.total} hari sekolah`"
            :empty="selected.attendance.counts.total === 0"
            empty-text="Belum ada data kehadiran"
            :min-height="220"
          >
            <DonutChart
              :segments="attendanceSegments"
              :center-value="`${selected.attendance.rate}%`"
              center-label="Hadir"
              :size="150"
            />
          </ChartCard>

          <ChartCard
            title="Status SPP"
            :subtitle="`${selected.billing.paidCount} lunas · ${selected.billing.unpaidCount} belum`"
            :empty="selected.billing.total === 0"
            empty-text="Belum ada tagihan"
            :min-height="220"
          >
            <DonutChart
              :segments="billingSegments"
              :center-value="selected.billing.outstanding > 0 ? formatMoneyCompact(selected.billing.outstanding) : 'Lunas'"
              center-label="Tunggakan"
              :size="150"
              stacked
            />
          </ChartCard>
        </div>

        <ChartCard
          title="Nilai per Mata Pelajaran"
          :subtitle="`Rata-rata ${formatScore(selected.grades.average)} · skala 0–100`"
          :empty="selected.grades.subjects.length === 0"
          empty-text="Belum ada data nilai"
          :min-height="200"
        >
          <HorizontalBarChart
            :items="gradeItems"
            :max="100"
            :color="CHART_COLORS.indigo"
            :value-formatter="formatScore"
          />
        </ChartCard>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="clean-card p-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Hadir</p>
            <p class="mt-2 text-2xl font-bold text-emerald-600 tabular-nums">{{ selected.attendance.counts.hadir }} hari</p>
          </div>
          <div class="clean-card p-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Izin / sakit</p>
            <p class="mt-2 text-2xl font-bold text-amber-600 tabular-nums">{{ selected.attendance.counts.izin }} hari</p>
          </div>
          <div class="clean-card p-4">
            <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tanpa kabar</p>
            <p class="mt-2 text-2xl font-bold text-rose-500 tabular-nums">{{ selected.attendance.counts.alfa }} hari</p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { usePortalStore } from '../../stores/portal'
import ChartCard from '../../components/charts/ChartCard.vue'
import DonutChart from '../../components/charts/DonutChart.vue'
import HorizontalBarChart from '../../components/charts/HorizontalBarChart.vue'
import { CHART_COLORS, formatDateShort } from '../../components/charts/chartUtils'

type TabId = 'ringkasan' | 'statistik'

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'statistik', label: 'Statistik' }
]

const authStore = useAuthStore()
const portalStore = usePortalStore()
const router = useRouter()

const activeTab = ref<TabId>('ringkasan')
const selectedId = ref('')

const tabKey = computed(() => `akademik-portal-tab-${authStore.user?.id || 'guest'}`)
const childKey = computed(() => `akademik-portal-child-${authStore.user?.id || 'guest'}`)

const summary = computed(() => portalStore.summary)
const children = computed(() => summary.value?.children ?? [])
const selected = computed(() => summary.value?.selected ?? null)

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
})

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

const formatScore = (value: number) => (Number(value) || 0).toFixed(1).replace('.', ',')

const formatMoney = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0)

const formatMoneyCompact = (value: number) => {
  const amount = Number(value) || 0
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1).replace('.', ',')} jt`
  if (amount >= 1_000) return `Rp ${Math.round(amount / 1_000)} rb`
  return `Rp ${amount}`
}

const predicateMeta = (score: number) => {
  if (score >= 90) return { label: 'Sangat baik', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100' }
  if (score >= 80) return { label: 'Baik', badge: 'bg-sky-50 text-sky-700 border border-sky-100' }
  if (score >= 70) return { label: 'Cukup', badge: 'bg-amber-50 text-amber-700 border border-amber-100' }
  if (score >= 60) return { label: 'Perlu latihan', badge: 'bg-orange-50 text-orange-700 border border-orange-100' }
  return { label: 'Perlu bimbingan', badge: 'bg-rose-50 text-rose-700 border border-rose-100' }
}

const lastRecord = computed(() => {
  const records = selected.value?.attendance.records ?? []
  return records.length > 0 ? records[records.length - 1] : null
})

const statusMeta = computed(() => {
  const today = selected.value?.attendance.today
  const status = today?.status || lastRecord.value?.status || null
  const dateLabel = today?.status
    ? 'hari ini'
    : lastRecord.value
      ? formatDateShort(lastRecord.value.date)
      : ''

  if (status === 'hadir') {
    return {
      label: 'Hadir',
      detail: today?.status ? 'Absensi hari ini sudah dicatat.' : `Absensi terakhir ${dateLabel}.`,
      card: 'border-emerald-200 bg-emerald-50/70 text-emerald-800',
      icon: 'text-emerald-600',
      path: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }
  if (status === 'izin') {
    return {
      label: 'Izin / sakit',
      detail: today?.note || (today?.status ? 'Tidak masuk dengan keterangan.' : `Absensi terakhir ${dateLabel}.`),
      card: 'border-amber-200 bg-amber-50/70 text-amber-800',
      icon: 'text-amber-600',
      path: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }
  if (status === 'alfa') {
    return {
      label: 'Tidak masuk tanpa kabar',
      detail: today?.status ? 'Belum ada keterangan dari wali kelas.' : `Absensi terakhir ${dateLabel}.`,
      card: 'border-rose-200 bg-rose-50/70 text-rose-800',
      icon: 'text-rose-600',
      path: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }
  return {
    label: 'Belum ada absensi',
    detail: 'Absensi hari ini belum dicatat oleh wali kelas.',
    card: 'border-line bg-panel text-slate-800',
    icon: 'text-slate-400',
    path: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
  }
})

const todaySchedule = computed(() => {
  const data = selected.value?.schedule
  if (!data) return []
  return data.today.length > 0 ? data.today : []
})

const tomorrowSchedule = computed(() => selected.value?.schedule.tomorrow ?? [])

const attendanceSegments = computed(() => {
  const counts = selected.value?.attendance.counts
  return [
    { label: 'Hadir', value: counts?.hadir ?? 0, color: CHART_COLORS.emerald },
    { label: 'Izin', value: counts?.izin ?? 0, color: CHART_COLORS.amber },
    { label: 'Tanpa kabar', value: counts?.alfa ?? 0, color: CHART_COLORS.rose }
  ]
})

const billingSegments = computed(() => {
  const colors: Record<string, string> = {
    paid: CHART_COLORS.emerald,
    pending_verification: CHART_COLORS.amber,
    requested: CHART_COLORS.sky,
    rejected: CHART_COLORS.rose
  }
  return (selected.value?.billing.byStatus ?? []).map((item) => ({
    label: item.label,
    value: item.count,
    color: colors[item.status] || CHART_COLORS.slate
  }))
})

const gradeItems = computed(
  () => (selected.value?.grades.subjects ?? []).map((item) => ({ label: item.subject, value: item.score }))
)

const goTo = (path: string) => router.push(path)

const setTab = (tab: TabId) => {
  activeTab.value = tab
  localStorage.setItem(tabKey.value, tab)
}

const selectChild = (id: string) => {
  selectedId.value = id
  localStorage.setItem(childKey.value, id)
  portalStore.fetchSummary(id)
}

const refresh = () => portalStore.fetchSummary(selectedId.value || undefined)

onMounted(async () => {
  const savedTab = localStorage.getItem(tabKey.value)
  if (savedTab === 'ringkasan' || savedTab === 'statistik') activeTab.value = savedTab

  const savedChild = localStorage.getItem(childKey.value) || ''
  selectedId.value = savedChild
  await portalStore.fetchSummary(savedChild || undefined)
  if (portalStore.summary?.selected) selectedId.value = portalStore.summary.selected.profile.id
})

watch(
  () => portalStore.summary?.selected?.profile.id,
  (id) => {
    if (id) selectedId.value = id
  }
)
</script>
