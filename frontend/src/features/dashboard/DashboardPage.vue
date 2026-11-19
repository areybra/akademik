<template>
  <PersonalPortal v-if="isPersonal" />
  <div v-else class="space-y-5 sm:space-y-6 pb-10">
    <!-- Header -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Selamat Datang, {{ authStore.user?.name }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ audienceSubtitle }}
          <span v-if="referenceLabel" class="text-slate-400">Data absensi {{ referenceLabel }}.</span>
        </p>
      </div>

      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          <span class="relative flex w-2 h-2">
            <span class="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
            <span class="relative inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
          </span>
          Live
        </span>
        <span class="text-[11px] font-medium text-slate-400 tabular-nums">
          Diperbarui {{ formatDateTime(dashboardStore.lastUpdated) }}
        </span>
        <button
          type="button"
          class="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-50"
          :disabled="dashboardStore.refreshing"
          aria-label="Muat ulang data dashboard"
          title="Muat ulang"
          @click="refresh"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': dashboardStore.refreshing }" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-if="dashboardStore.error && summary"
      class="flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700"
    >
      <svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M4.93 19h14.14a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.2 16a2 2 0 001.73 3z" />
      </svg>
      Gagal memperbarui data. Menampilkan data terakhir yang berhasil dimuat.
    </div>

    <!-- KPI -->
    <div v-if="!summary && dashboardStore.loading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="index in 4" :key="`kpi-skeleton-${index}`" class="clean-card p-4 animate-pulse">
        <div class="h-3 w-24 bg-slate-100 rounded"></div>
        <div class="h-7 w-20 bg-slate-100 rounded mt-3"></div>
        <div class="h-3 w-32 bg-slate-100 rounded mt-4"></div>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <div v-for="stat in stats" :key="stat.label" class="clean-card p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{{ stat.label }}</p>
            <p class="text-2xl font-bold text-slate-900 mt-1 tabular-nums leading-none truncate">{{ stat.value }}</p>
          </div>
          <div :class="['w-9 h-9 rounded-lg flex items-center justify-center shrink-0', stat.iconBg, stat.iconClass]">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="stat.icon" />
            </svg>
          </div>
        </div>

        <div class="mt-3 flex items-end justify-between gap-3">
          <p class="text-[11px] font-medium text-slate-500 truncate" :title="stat.hint">{{ stat.hint }}</p>
          <div v-if="stat.sparkline.length > 1" class="w-20 shrink-0">
            <Sparkline :values="stat.sparkline" :color="stat.sparkColor" :height="28" />
          </div>
        </div>
      </div>
    </div>

    <!-- Sesi mengajar hari ini -->
    <section v-if="audience === 'teacher'" class="clean-card p-4 sm:p-5">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Sesi Mengajar Hari Ini</h2>
          <p class="mt-0.5 text-[11px] text-slate-500">
            {{ summary?.teaching?.total ?? 0 }} sesi ·
            {{ summary?.teaching?.pending ?? 0 }} belum dikirim ·
            {{ summary?.teaching?.missing ?? 0 }} tanpa input
          </p>
        </div>
        <RouterLink to="/teaching" class="text-[11px] font-bold text-indigo-600 hover:underline">
          Buka Mengajar
        </RouterLink>
      </div>

      <ul v-if="(summary?.teaching?.slots.length ?? 0) > 0" class="mt-3 divide-y divide-line">
        <li v-for="slot in summary?.teaching?.slots ?? []" :key="slot.id" class="flex flex-wrap items-center gap-3 py-2.5">
          <span class="w-24 text-[11px] font-bold text-slate-600 tabular-nums">{{ slot.time }}</span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-bold text-slate-800">{{ slot.subject }}</p>
            <p class="text-[10px] text-slate-400">{{ slot.class }} · {{ slot.room }}</p>
          </div>
          <span class="rounded-full px-2.5 py-1 text-[10px] font-bold" :class="teachingStatus(slot.status).class">
            {{ teachingStatus(slot.status).label }}
          </span>
        </li>
      </ul>
      <p v-else class="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
        Tidak ada jadwal mengajar hari ini.
      </p>

      <div v-if="homeroom" class="mt-4 rounded-xl border border-line bg-slate-50 px-3 py-3 text-[11px] text-slate-600">
        Wali kelas <strong>{{ homeroom }}</strong> · kehadiran {{ summary?.attendance.today.percentage ?? 0 }}%
        ({{ summary?.attendance.today.hadir ?? 0 }} hadir dari {{ summary?.attendance.today.total ?? 0 }} catatan)
      </div>
    </section>

    <!-- Attendance -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
      <ChartCard
        class="lg:col-span-2"
        title="Tren Kehadiran 14 Hari"
        :subtitle="`Rekap harian sampai ${referenceLabel}`"
        :loading="dashboardStore.loading"
        :empty="!hasTrend"
        empty-text="Belum ada data absensi pada periode ini"
        :min-height="240"
      >
        <LineChart :labels="trendLabels" :series="trendSeries" :height="230" />
      </ChartCard>

      <ChartCard
        title="Kehadiran"
        :subtitle="`${attendanceTotal} catatan • ${referenceLabel}`"
        :loading="dashboardStore.loading"
        :empty="attendanceTotal === 0"
        empty-text="Belum ada absensi"
        :min-height="240"
      >
        <DonutChart
          :segments="attendanceSegments"
          :center-value="`${summary?.attendance.today.percentage ?? 0}%`"
          center-label="Hadir"
          :size="150"
        />
      </ChartCard>
    </div>

    <!-- Student composition -->
    <div v-if="showStudentComposition" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
      <ChartCard
        title="Siswa per Tingkat"
        subtitle="Distribusi kelas X, XI, dan XII"
        :empty="studentTotal === 0"
        :min-height="190"
      >
        <BarChart :items="levelItems" :height="170" />
      </ChartCard>

      <ChartCard
        title="Siswa per Jurusan"
        subtitle="Jumlah siswa tiap program keahlian"
        :empty="studentTotal === 0"
        :min-height="190"
      >
        <HorizontalBarChart :items="majorItems" :max="majorMax" />
      </ChartCard>

      <ChartCard
        title="Komposisi Gender"
        subtitle="Perbandingan siswa laki-laki dan perempuan"
        :empty="studentTotal === 0"
        :min-height="190"
      >
        <DonutChart
          :segments="genderSegments"
          :center-value="formatNumber(studentTotal)"
          center-label="Siswa"
          :size="132"
        />
      </ChartCard>
    </div>

    <!-- Academic -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
      <ChartCard
        title="Rata-rata Nilai per Mata Pelajaran"
        :subtitle="`Skala 0–100 • ${summary?.grades.total ?? 0} nilai tercatat`"
        :empty="(summary?.grades.bySubject.length ?? 0) === 0"
        empty-text="Belum ada data nilai"
        :min-height="170"
      >
        <HorizontalBarChart
          :items="subjectItems"
          :max="100"
          :color="CHART_COLORS.indigo"
          :value-formatter="formatScore"
        />
      </ChartCard>

      <ChartCard
        title="Distribusi Nilai"
        subtitle="Sebaran nilai siswa per rentang"
        :empty="(summary?.grades.total ?? 0) === 0"
        empty-text="Belum ada data nilai"
        :min-height="170"
      >
        <BarChart :items="distributionItems" :height="165" :value-formatter="formatNumber" />
      </ChartCard>
    </div>

    <!-- Billing -->
    <div v-if="showBilling" class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
      <ChartCard
        title="Status Pembayaran SPP"
        :subtitle="`${summary?.billing.paid ?? 0} dari ${summary?.billing.total ?? 0} tagihan lunas`"
        :empty="(summary?.billing.total ?? 0) === 0"
        empty-text="Belum ada tagihan"
        :min-height="190"
      >
        <DonutChart
          :segments="billingSegments"
          :center-value="`${summary?.billing.paid ?? 0}/${summary?.billing.total ?? 0}`"
          center-label="Lunas"
          :size="140"
          stacked
        />
      </ChartCard>

      <ChartCard
        class="lg:col-span-2"
        title="Nominal SPP per Bulan"
        subtitle="Total tagihan dibanding yang sudah lunas"
        :empty="(summary?.billing.monthly.length ?? 0) === 0"
        empty-text="Belum ada data pembayaran"
        :min-height="190"
      >
        <LineChart
          :labels="monthlyLabels"
          :series="monthlySeries"
          :height="180"
          :value-formatter="formatMoneyCompact"
        />
      </ChartCard>
    </div>

    <!-- Summary tables -->
    <div v-if="summary && showSupervision" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
      <ChartCard
        title="Kehadiran Terendah per Kelas"
        subtitle="30 hari terakhir"
        :empty="summary.topClasses.length === 0"
        empty-text="Belum ada data absensi"
        :min-height="140"
      >
        <ul class="divide-y divide-slate-100">
          <li v-for="row in summary.topClasses" :key="row.class" class="flex items-center gap-3 py-2.5">
            <span class="flex-1 min-w-0 text-xs font-semibold text-slate-700 truncate">{{ row.class }}</span>
            <div class="w-24 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full rounded-full bg-rose-400" :style="{ width: `${row.rate}%` }"></div>
            </div>
            <span class="w-12 text-right text-xs font-bold text-slate-800 tabular-nums">{{ row.rate }}%</span>
          </li>
        </ul>
      </ChartCard>

      <ChartCard
        title="Nilai Tertinggi"
        subtitle="Rata-rata nilai per siswa"
        :empty="summary.topStudents.length === 0"
        empty-text="Belum ada data nilai"
        :min-height="140"
      >
        <ul class="divide-y divide-slate-100">
          <li v-for="row in summary.topStudents" :key="`${row.name}-${row.class}`" class="flex items-center gap-3 py-2.5">
            <div class="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-bold uppercase shrink-0">
              {{ initials(row.name) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-xs font-semibold text-slate-800 truncate">{{ row.name }}</p>
              <p class="text-[10px] text-slate-400 truncate">{{ row.class || '—' }}</p>
            </div>
            <span class="text-xs font-bold text-slate-800 tabular-nums">{{ formatScore(row.average) }}</span>
          </li>
        </ul>
      </ChartCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { useDashboardStore } from '../../stores/dashboard'
import { useAuthStore } from '../../stores/auth'
import PersonalPortal from '../portal/PersonalPortal.vue'
import ChartCard from '../../components/charts/ChartCard.vue'
import LineChart from '../../components/charts/LineChart.vue'
import BarChart from '../../components/charts/BarChart.vue'
import HorizontalBarChart from '../../components/charts/HorizontalBarChart.vue'
import DonutChart from '../../components/charts/DonutChart.vue'
import Sparkline from '../../components/charts/Sparkline.vue'
import {
  CHART_COLORS,
  formatCompact,
  formatDateShort,
  formatDateTime,
  formatNumber
} from '../../components/charts/chartUtils'

const dashboardStore = useDashboardStore()
const authStore = useAuthStore()

const summary = computed(() => dashboardStore.summary)
const isPersonal = computed(() => authStore.hasAnyRole(['orang_tua', 'siswa']))
const audience = computed(() => summary.value?.audience ?? 'teacher')
const homeroom = computed(() => authStore.user?.class || '')

const audienceSubtitle = computed(() => ({
  admin: 'Kontrol penuh data sekolah.',
  supervisor: 'Pemantauan akademik sekolah.',
  tu: 'Administrasi dan keuangan sekolah.',
  teacher: 'Ringkasan mengajar Anda.',
  personal: 'Ringkasan pribadi.'
}[audience.value] ?? 'Ringkasan akademik.'))

const showStudentComposition = computed(() => ['admin', 'tu'].includes(audience.value))
const showBilling = computed(() => ['admin', 'tu'].includes(audience.value))
const showSupervision = computed(() => ['admin', 'supervisor'].includes(audience.value))

const teachingStatus = (status: string) => ({
  locked: { label: 'Terkunci', class: 'bg-indigo-50 text-indigo-700 border border-indigo-100' },
  complete: { label: 'Lengkap', class: 'bg-emerald-50 text-emerald-700 border border-emerald-100' },
  partial: { label: 'Sebagian', class: 'bg-amber-50 text-amber-700 border border-amber-100' },
  empty: { label: 'Belum diisi', class: 'bg-slate-100 text-slate-500' }
}[status] ?? { label: status, class: 'bg-slate-100 text-slate-500' })

const refresh = () => dashboardStore.fetchSummary()

onMounted(async () => {
  if (isPersonal.value) return
  await dashboardStore.fetchSummary()
  dashboardStore.startPolling()
})

onBeforeUnmount(() => dashboardStore.stopPolling())

const formatScore = (value: number) => (Number(value) || 0).toFixed(1).replace('.', ',')
const formatMoneyCompact = (value: number) => `Rp ${formatCompact(value)}`

const referenceLabel = computed(() => {
  const data = summary.value
  if (!data) return ''
  const label = formatDateShort(data.attendance.referenceDate)
  return data.attendance.isToday ? `hari ini (${label})` : label
})

const attendanceTotal = computed(() => summary.value?.attendance.today.total ?? 0)

const attendanceSegments = computed(() => {
  const today = summary.value?.attendance.today
  return [
    { label: 'Hadir', value: today?.hadir ?? 0, color: CHART_COLORS.emerald },
    { label: 'Izin', value: today?.izin ?? 0, color: CHART_COLORS.amber },
    { label: 'Alfa', value: today?.alfa ?? 0, color: CHART_COLORS.rose }
  ]
})

const trendLabels = computed(
  () => summary.value?.attendance.trend.map((point) => formatDateShort(point.date)) ?? []
)

const trendSeries = computed(() => {
  const trend = summary.value?.attendance.trend ?? []
  return [
    { name: 'Hadir', color: CHART_COLORS.emerald, values: trend.map((point) => point.hadir) },
    { name: 'Izin', color: CHART_COLORS.amber, values: trend.map((point) => point.izin) },
    { name: 'Alfa', color: CHART_COLORS.rose, values: trend.map((point) => point.alfa) }
  ]
})

const hasTrend = computed(() =>
  (summary.value?.attendance.trend ?? []).some((point) => point.total > 0)
)

const studentTotal = computed(() => summary.value?.counts.students ?? 0)

const levelItems = computed(
  () => summary.value?.students.byLevel.map((item) => ({ label: item.label, value: item.count })) ?? []
)

const majorItems = computed(
  () => summary.value?.students.byMajor.map((item) => ({ label: item.label, value: item.count })) ?? []
)

const majorMax = computed(() => Math.max(1, ...majorItems.value.map((item) => item.value)))

const genderSegments = computed(() => {
  const colors = [CHART_COLORS.indigo, '#ec4899']
  return (summary.value?.students.byGender ?? []).map((item, index) => ({
    label: item.label,
    value: item.count,
    color: colors[index] || CHART_COLORS.slate
  }))
})

const subjectItems = computed(
  () =>
    summary.value?.grades.bySubject.map((item) => ({
      label: item.subject,
      value: item.average
    })) ?? []
)

const distributionItems = computed(() => {
  const colors: Record<string, string> = {
    '90+': CHART_COLORS.emerald,
    '80-89': CHART_COLORS.indigo,
    '70-79': CHART_COLORS.amber,
    '<70': CHART_COLORS.rose
  }
  return (summary.value?.grades.distribution ?? []).map((item) => ({
    label: item.label,
    value: item.count,
    color: colors[item.label] || CHART_COLORS.slate
  }))
})

const billingSegments = computed(() => {
  const colors: Record<string, string> = {
    paid: CHART_COLORS.emerald,
    pending_verification: CHART_COLORS.amber,
    requested: CHART_COLORS.sky,
    rejected: CHART_COLORS.rose
  }
  return (summary.value?.billing.byStatus ?? []).map((item) => ({
    label: item.label,
    value: item.count,
    color: colors[item.status] || CHART_COLORS.slate
  }))
})

const monthName = (period: string) => {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'short' })
}

const monthlyLabels = computed(
  () => summary.value?.billing.monthly.map((item) => monthName(item.period)) ?? []
)

const monthlySeries = computed(() => {
  const monthly = summary.value?.billing.monthly ?? []
  return [
    { name: 'Total', color: CHART_COLORS.indigoSoft, values: monthly.map((item) => item.total) },
    { name: 'Terbayar', color: CHART_COLORS.emerald, values: monthly.map((item) => item.paid) }
  ]
})

const stats = computed(() => {
  const data = summary.value
  if (!data) return []

  const attendanceSpark = data.attendance.trend.map((point) =>
    point.total > 0 ? (point.hadir / point.total) * 100 : 0
  )
  const teacherRatio =
    data.counts.teachers && data.counts.teachers > 0
      ? Math.round(data.counts.students / data.counts.teachers)
      : 0

  const studentCard = {
    label: 'Total Siswa',
    value: formatNumber(data.counts.students),
    hint: `${data.counts.classes} kelas terdata`,
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
    iconBg: 'bg-indigo-50',
    iconClass: 'text-indigo-600',
    sparkline: [] as number[],
    sparkColor: CHART_COLORS.indigo
  }

  const teacherCard = {
    label: data.counts.teachers !== null ? 'Tenaga Pengajar' : 'Kelas Terdata',
    value: formatNumber(data.counts.teachers ?? data.counts.classes),
    hint:
      data.counts.teachers !== null
        ? `Rasio 1 guru : ${teacherRatio} siswa`
        : 'Sesuai cakupan akses',
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    iconBg: 'bg-sky-50',
    iconClass: 'text-sky-600',
    sparkline: [] as number[],
    sparkColor: CHART_COLORS.sky
  }

  const attendanceCard = {
    label: 'Kehadiran',
    value: `${data.attendance.today.percentage}%`,
    hint: `${data.attendance.today.hadir} hadir • ${data.attendance.today.izin} izin • ${data.attendance.today.alfa} alfa`,
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    iconBg: 'bg-emerald-50',
    iconClass: 'text-emerald-600',
    sparkline: attendanceSpark,
    sparkColor: CHART_COLORS.emerald
  }

  const gradeCard = {
    label: 'Rata-rata Nilai',
    value: formatScore(data.grades.average),
    hint: `${data.grades.total} nilai tercatat`,
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    iconBg: 'bg-violet-50',
    iconClass: 'text-violet-600',
    sparkline: [] as number[],
    sparkColor: CHART_COLORS.indigo
  }

  const billingCard = {
    label: 'Tunggakan SPP',
    value: formatMoneyCompact(data.billing.amountOutstanding),
    hint: `${data.billing.unpaid} dari ${data.billing.total} tagihan belum lunas`,
    icon: 'M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 10c-4.418 0-8-1.79-8-4V8c0-2.21 3.582-4 8-4s8 1.79 8 4v6c0 2.21-3.582 4-8 4z',
    iconBg: 'bg-rose-50',
    iconClass: 'text-rose-600',
    sparkline: [] as number[],
    sparkColor: CHART_COLORS.rose
  }

  if (data.audience === 'supervisor') {
    const classCard = {
      label: 'Kelas Terdata',
      value: formatNumber(data.counts.classes),
      hint: `${data.counts.students} siswa dalam cakupan`,
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      iconBg: 'bg-sky-50',
      iconClass: 'text-sky-600',
      sparkline: [] as number[],
      sparkColor: CHART_COLORS.sky
    }
    return [attendanceCard, gradeCard, teacherCard, classCard]
  }

  if (data.audience === 'teacher') {
    return [
      {
        label: 'Sesi Hari Ini',
        value: formatNumber(data.teaching?.total ?? 0),
        hint: `${data.teaching?.submitted ?? 0} sudah ditutup`,
        icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        iconBg: 'bg-indigo-50',
        iconClass: 'text-indigo-600',
        sparkline: [] as number[],
        sparkColor: CHART_COLORS.indigo
      },
      {
        label: 'Belum Dikirim',
        value: formatNumber(data.teaching?.pending ?? 0),
        hint: `${data.teaching?.missing ?? 0} tanpa input`,
        icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
        iconBg: 'bg-amber-50',
        iconClass: 'text-amber-600',
        sparkline: [] as number[],
        sparkColor: CHART_COLORS.amber
      },
      studentCard,
      gradeCard
    ]
  }

  return [studentCard, teacherCard, attendanceCard, billingCard]
})

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
</script>
