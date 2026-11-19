<template>
  <!-- ================= ORANG TUA / SISWA ================= -->
  <div v-if="isPersonal" class="space-y-6 pb-16">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Kehadiran</h1>
        <p class="text-sm text-slate-500 mt-1">{{ personalSubtitle }}</p>
      </div>
      <input
        v-model="month"
        type="month"
        class="rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      />
    </div>

    <div v-if="children.length > 1" class="flex flex-wrap gap-2">
      <button
        v-for="child in children"
        :key="child.id"
        type="button"
        class="rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
        :class="selectedChildId === child.id
          ? 'border-cta bg-cta text-cta-ink shadow-sm'
          : 'border-line bg-panel text-slate-600 hover:border-indigo-300'"
        @click="selectChild(child.id)"
      >
        {{ child.name }}
      </button>
    </div>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div v-for="item in personalCounts" :key="item.status" class="clean-card p-4">
        <p class="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <span class="h-2 w-2 rounded-full" :class="item.dot"></span>
          {{ item.label }}
        </p>
        <p class="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{{ item.count }}</p>
      </div>
    </div>

    <section class="clean-card p-4 sm:p-6">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-slate-900">{{ monthLabel }}</h2>
        <p class="text-[11px] text-slate-500">{{ personalRecords.length }} hari tercatat</p>
      </div>

      <div class="mt-4 grid grid-cols-7 gap-1.5 text-center">
        <span v-for="day in dayNames" :key="day" class="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {{ day }}
        </span>
        <span v-for="blank in leadingBlanks" :key="`blank-${blank}`"></span>
        <div
          v-for="day in daysInMonth"
          :key="day.date"
          class="flex aspect-square flex-col items-center justify-center rounded-xl border text-xs font-semibold"
          :class="dayClass(day)"
          :title="day.title"
        >
          <span>{{ day.day }}</span>
          <span v-if="day.status" class="mt-1 h-1.5 w-1.5 rounded-full" :class="statusDot(day.status)"></span>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap gap-3 border-t border-line pt-3">
        <span v-for="item in legend" :key="item.status" class="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span class="h-2 w-2 rounded-full" :class="item.dot"></span>
          {{ item.label }}
        </span>
      </div>
    </section>

    <section class="clean-card p-4 sm:p-6">
      <h2 class="text-sm font-bold text-slate-900">Catatan terakhir</h2>
      <ul v-if="recentRecords.length > 0" class="mt-2 divide-y divide-line">
        <li v-for="record in recentRecords" :key="record.date" class="flex items-center justify-between gap-3 py-3">
          <div class="min-w-0">
            <p class="text-xs font-bold text-slate-800">{{ formatDate(record.date) }}</p>
            <p v-if="record.note" class="text-[11px] text-slate-500 truncate">{{ record.note }}</p>
          </div>
          <span class="rounded-md px-2 py-1 text-[10px] font-bold" :class="statusBadge(record.status)">
            {{ statusLabel(record.status) }}
          </span>
        </li>
      </ul>
      <p v-else class="mt-3 rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">Belum ada absensi bulan ini.</p>
    </section>
  </div>

  <!-- ================= STAF / GURU ================= -->
  <div v-else class="space-y-8 pb-16">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Presensi Kehadiran</h1>
        <p class="text-sm text-slate-500 mt-1">Pemantauan kehadiran siswa harian.</p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:justify-end">
        <div v-if="canEdit" class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <p v-if="!selectedClass" class="text-[11px] font-medium text-slate-500 sm:max-w-[220px] sm:text-right">
            Pilih kelas dulu untuk menyimpan rekap.
          </p>
          <Button variant="primary" :disabled="!selectedClass || filteredStudents.length === 0" @click="saveAttendance">
            Simpan Rekap
          </Button>
        </div>
        <Button v-if="canExport" variant="outline" class="no-print" @click="exportAttendance">Ekspor CSV</Button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-end bg-panel p-4 sm:p-6 rounded-card border border-line shadow-sm">
      <div class="space-y-2">
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Pilih Tanggal</label>
        <input
          v-model="selectedDate"
          type="date"
          class="w-full px-4 py-3 bg-slate-50 border border-line rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>
      <div class="space-y-2">
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Pilih Kelas</label>
        <select
          v-model="selectedClass"
          class="w-full px-4 py-3 bg-slate-50 border border-line rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none"
        >
          <option value="">Semua Kelas</option>
          <option v-for="c in classesList" :key="c.id" :value="c.name">
            Kelas {{ c.name }}
          </option>
        </select>
      </div>
      <div class="space-y-2">
        <label class="block text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Status Kehadiran</label>
        <select
          v-model="statusFilter"
          class="w-full px-4 py-3 bg-slate-50 border border-line rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 appearance-none cursor-pointer"
        >
          <option value="">Semua Status</option>
          <option value="hadir">Hadir</option>
          <option value="izin">Izin</option>
          <option value="alfa">Tanpa kabar</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Hadir</p>
        <p class="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{{ stats.present }}</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Izin / sakit</p>
        <p class="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{{ stats.permission }}</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Tanpa kabar</p>
        <p class="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{{ stats.absent }}</p>
      </div>
    </div>

    <div class="bg-panel border border-line rounded-card shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-slate-50 border-b border-line">
              <th class="px-4 sm:px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest w-16">No</th>
              <th class="px-4 sm:px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Nama Siswa</th>
              <th class="px-4 sm:px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Status</th>
              <th class="px-4 sm:px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Keterangan</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="(student, idx) in filteredStudents" :key="student.id" class="hover:bg-slate-50/80">
              <td class="px-4 sm:px-6 py-3 text-slate-500 font-mono text-sm tabular-nums">{{ String(idx + 1).padStart(2, '0') }}</td>
              <td class="px-4 sm:px-6 py-3">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="w-8 h-8 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-[10px]">
                    {{ student.name.charAt(0) }}
                  </div>
                  <div class="min-w-0">
                    <div class="font-bold text-slate-900 text-sm max-w-xs truncate">{{ student.name }}</div>
                    <div class="text-[11px] text-indigo-500 font-bold uppercase tracking-wider mt-0.5">{{ student.class }}</div>
                  </div>
                </div>
              </td>
              <td class="px-4 sm:px-6 py-3">
                <select
                  :value="getAttendanceStatus(student.id)"
                  @change="setAttendanceStatus(student.id, ($event.target as HTMLSelectElement).value as any)"
                  :disabled="!canEdit"
                  class="px-3 py-2 bg-slate-50 border border-line rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 appearance-none min-w-[110px] cursor-pointer"
                  :class="{
                    'text-emerald-600 !bg-emerald-50 !border-emerald-100': getAttendanceStatus(student.id) === 'hadir',
                    'text-amber-600 !bg-amber-50 !border-amber-100': getAttendanceStatus(student.id) === 'izin',
                    'text-rose-600 !bg-rose-50 !border-rose-100': getAttendanceStatus(student.id) === 'alfa',
                  }"
                >
                  <option value="hadir">Hadir</option>
                  <option value="izin">Izin</option>
                  <option value="alfa">Tanpa kabar</option>
                </select>
              </td>
              <td class="px-4 sm:px-6 py-3">
                <input
                  :value="getAttendanceNote(student.id)"
                  @input="setAttendanceNote(student.id, ($event.target as HTMLInputElement).value)"
                  type="text"
                  placeholder="Catatan..."
                  :disabled="!canEdit"
                  class="w-full max-w-[200px] px-3 py-2 bg-slate-50 border border-line rounded-lg text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
                />
              </td>
            </tr>
            <tr v-if="filteredStudents.length === 0">
              <td colspan="4" class="px-4 py-6 text-center text-sm text-slate-400">Tidak ada siswa pada filter ini.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useStudentStore } from '../../stores/student'
import { useAttendanceStore } from '../../stores/attendance'
import { usePortalStore } from '../../stores/portal'
import Button from '../../components/ui/Button.vue'
import { useExport } from '../../composables/useExport'
import { useApi } from '../../composables/useApi'

const authStore = useAuthStore()
const studentStore = useStudentStore()
const attendanceStore = useAttendanceStore()
const portalStore = usePortalStore()
const { exportToCsv } = useExport()
const { fetchWithAuth } = useApi()

const isPersonal = computed(() => authStore.hasAnyRole(['orang_tua', 'siswa']))
const personalSubtitle = computed(() =>
  authStore.hasAnyRole(['orang_tua']) ? 'Kalender kehadiran anak per bulan.' : 'Kalender kehadiran Anda per bulan.'
)
const canEdit = computed(() => authStore.hasAnyRole(['admin', 'kepala_sekolah', 'waka', 'guru_mapel', 'wali_kelas', 'guru']))
const canExport = computed(() => canEdit.value || authStore.hasAnyRole(['kepala_tu', 'staff_tu']))

/* ---------------- Mode personal ---------------- */
const month = ref(new Date().toISOString().slice(0, 7))
const selectedChildId = ref('')
const personalRecords = ref<Array<{ date: string; status: string; note?: string | null }>>([])
const dayNames = ['S', 'S', 'R', 'K', 'J', 'S', 'M']

const children = computed(() => portalStore.summary?.children ?? [])

const monthLabel = computed(() => {
  const [year, monthValue] = month.value.split('-').map(Number)
  return new Date(year, (monthValue || 1) - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
})

const monthRange = computed(() => {
  const [year, monthValue] = month.value.split('-').map(Number)
  const start = `${year}-${String(monthValue).padStart(2, '0')}-01`
  const lastDay = new Date(year, monthValue, 0).getDate()
  const end = `${year}-${String(monthValue).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end, lastDay, firstWeekday: new Date(year, monthValue - 1, 1).getDay() }
})

const leadingBlanks = computed(() => Array.from({ length: monthRange.value.firstWeekday }, (_, i) => i))

const daysInMonth = computed(() => {
  const map = new Map(personalRecords.value.map((row) => [row.date, row]))
  return Array.from({ length: monthRange.value.lastDay }, (_, index) => {
    const day = index + 1
    const date = `${month.value}-${String(day).padStart(2, '0')}`
    const record = map.get(date)
    return {
      day,
      date,
      status: record?.status ?? null,
      title: record ? `${formatDate(date)} · ${statusLabel(record.status)}${record.note ? ` · ${record.note}` : ''}` : formatDate(date)
    }
  })
})

const personalCounts = computed(() => {
  const count = (status: string) => personalRecords.value.filter((row) => row.status === status).length
  return [
    { status: 'hadir', label: 'Hadir', count: count('hadir'), dot: 'bg-emerald-500' },
    { status: 'izin', label: 'Izin / sakit', count: count('izin'), dot: 'bg-amber-500' },
    { status: 'alfa', label: 'Tanpa kabar', count: count('alfa'), dot: 'bg-rose-500' },
    { status: 'total', label: 'Hari tercatat', count: personalRecords.value.length, dot: 'bg-slate-400' }
  ]
})

const legend = computed(() => personalCounts.value.slice(0, 3))

const recentRecords = computed(() =>
  [...personalRecords.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)
)

const statusDot = (status: string) => {
  if (status === 'hadir') return 'bg-emerald-500'
  if (status === 'izin') return 'bg-amber-500'
  return 'bg-rose-500'
}

const statusLabel = (status: string) => {
  if (status === 'hadir') return 'Hadir'
  if (status === 'izin') return 'Izin / sakit'
  if (status === 'alfa') return 'Tanpa kabar'
  return 'Belum dicatat'
}

const statusBadge = (status: string) => {
  if (status === 'hadir') return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
  if (status === 'izin') return 'bg-amber-50 text-amber-700 border border-amber-100'
  if (status === 'alfa') return 'bg-rose-50 text-rose-700 border border-rose-100'
  return 'bg-slate-100 text-slate-500'
}

const dayClass = (day: { status: string | null; date: string }) => {
  const isToday = day.date === new Date().toISOString().slice(0, 10)
  if (day.status === 'hadir') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (day.status === 'izin') return 'border-amber-200 bg-amber-50 text-amber-800'
  if (day.status === 'alfa') return 'border-rose-200 bg-rose-50 text-rose-800'
  return isToday ? 'border-indigo-300 bg-indigo-50/40 text-slate-700' : 'border-line bg-panel text-slate-400'
}

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

const loadPersonal = async () => {
  if (!selectedChildId.value) return
  const params = new URLSearchParams({
    studentId: selectedChildId.value,
    from: monthRange.value.start,
    to: monthRange.value.end
  })
  const { data, error } = await fetchWithAuth(`/attendances?${params.toString()}`)
  if (!error && data) {
    personalRecords.value = data.map((row: any) => ({
      date: row.date,
      status: row.status,
      note: row.note
    }))
  } else {
    personalRecords.value = []
  }
}

const selectChild = async (id: string) => {
  selectedChildId.value = id
  portalStore.rememberChild(id)
  await loadPersonal()
}

/* ---------------- Mode staf ---------------- */
const selectedDate = ref(new Date().toISOString().split('T')[0])
const selectedClass = ref('')
const statusFilter = ref('')

const attendanceStatusMap = ref<Map<string, 'hadir' | 'izin' | 'alfa'>>(new Map())
const attendanceNotesMap = ref<Map<string, string>>(new Map())

const filteredStudents = computed(() => {
  let list = studentStore.students
  if (selectedClass.value) {
    list = list.filter((s) => s.class === selectedClass.value)
  }
  if (statusFilter.value) {
    list = list.filter((s) => getAttendanceStatus(s.id) === statusFilter.value)
  }
  return list
})

const classesList = computed(() => studentStore.classes.map((name) => ({ id: name, name })))

const stats = computed(() => {
  let present = 0
  let permission = 0
  let absent = 0
  filteredStudents.value.forEach((s) => {
    const status = getAttendanceStatus(s.id)
    if (status === 'hadir') present++
    else if (status === 'izin') permission++
    else if (status === 'alfa') absent++
  })
  return { present, permission, absent }
})

const syncWithStore = () => {
  attendanceStatusMap.value.clear()
  attendanceNotesMap.value.clear()
  attendanceStore.attendances
    .filter((a) => a.date === selectedDate.value)
    .forEach((record) => {
      attendanceStatusMap.value.set(record.studentId, record.status)
      if (record.note) attendanceNotesMap.value.set(record.studentId, record.note)
    })
}

watch(selectedDate, syncWithStore)

const getAttendanceStatus = (studentId: string) => attendanceStatusMap.value.get(studentId) || 'hadir'

const setAttendanceStatus = (studentId: string, status: 'hadir' | 'izin' | 'alfa') => {
  attendanceStatusMap.value.set(studentId, status)
}

const getAttendanceNote = (studentId: string) => attendanceNotesMap.value.get(studentId) || ''

const setAttendanceNote = (studentId: string, note: string) => {
  attendanceNotesMap.value.set(studentId, note)
}

const exportAttendance = () => {
  const headers = ['Tanggal', 'Nama Siswa', 'Kelas', 'Status Kehadiran']
  const rows = filteredStudents.value.map((s) => [
    selectedDate.value,
    s.name,
    s.class,
    statusLabel(getAttendanceStatus(s.id))
  ])
  exportToCsv(headers, rows, 'ekspor-absensi')
}

const saveAttendance = async () => {
  if (!selectedClass.value) {
    alert('Pilih kelas terlebih dahulu agar rekap tidak menimpa seluruh sekolah.')
    return
  }
  const recordsToSave = filteredStudents.value.map((student) => {
    const existingRecord = attendanceStore.attendances.find(
      (a) => a.studentId === student.id && a.date === selectedDate.value
    )
    return {
      ...(existingRecord ? { id: existingRecord.id } : {}),
      studentId: student.id,
      studentName: student.name,
      date: selectedDate.value,
      status: getAttendanceStatus(student.id),
      note: getAttendanceNote(student.id)
    }
  })

  if (recordsToSave.length === 0) return
  const success = await attendanceStore.saveBulkAttendance(recordsToSave)

  if (success) {
    alert(`Absensi untuk tanggal ${selectedDate.value} berhasil disimpan!`)
  } else {
    alert(`Gagal menyimpan absensi: ${attendanceStore.error}`)
  }
}

onMounted(async () => {
  if (isPersonal.value) {
    if (!portalStore.summary?.selected) await portalStore.fetchSummary()
    selectedChildId.value = portalStore.summary?.selected?.profile.id || ''
    await loadPersonal()
    return
  }

  if (studentStore.students.length === 0) await studentStore.fetchStudents()
  if (attendanceStore.attendances.length === 0) await attendanceStore.fetchAttendances()
  syncWithStore()
})

watch(month, () => {
  if (isPersonal.value) loadPersonal()
})
</script>
