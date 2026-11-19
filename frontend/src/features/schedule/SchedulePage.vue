<template>
  <div class="space-y-8 pb-16">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Jadwal Pelajaran</h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ isPersonal ? 'Jadwal kelas anak Anda.' : 'Penjadwalan aktivitas belajar mengajar SMK.' }}
        </p>
      </div>
      <div class="flex gap-3">
        <Button v-if="canEdit" variant="primary" size="lg" @click="openAddModal">
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Jadwal
        </Button>
        <Button v-if="canExport" variant="outline" size="lg" class="no-print" @click="exportSchedules">Ekspor CSV</Button>
      </div>
    </div>

    <!-- Filter -->
    <div class="premium-card p-4 sm:p-6 space-y-4">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div class="flex-1 max-w-md">
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Filter Kelas</label>
          <div class="relative">
            <select
              v-model="selectedClassFilter"
              class="w-full pl-11 pr-5 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
            >
              <option v-if="!isPersonal" value="">Semua Kelas</option>
              <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
            </select>
            <svg class="w-5 h-5 text-surface-400 absolute left-4 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>
        <div v-if="selectedClassFilter" class="text-right">
          <p class="text-[10px] font-black text-surface-500 uppercase tracking-widest">Menampilkan Jadwal</p>
          <p class="text-lg font-black text-brand-600 tracking-tight">Kelas {{ selectedClassFilter }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2" role="tablist" aria-label="Pilih hari">
        <button
          v-for="day in dayOptions"
          :key="day"
          type="button"
          role="tab"
          :aria-selected="selectedDay === day"
          class="rounded-xl border px-3 py-2 text-xs font-bold transition-colors"
          :class="selectedDay === day
            ? 'border-cta bg-cta text-cta-ink shadow-sm'
            : 'border-line bg-panel text-slate-600 hover:border-indigo-300'"
          @click="selectedDay = day"
        >
          {{ day }}
          <span class="ml-1 opacity-70">{{ dayCount(day) }}</span>
        </button>
      </div>
    </div>

    <!-- Schedule by Classes -->
    <div class="space-y-10">
      <div v-if="filteredClasses.length === 0" class="clean-card p-8 text-center">
        <div class="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-surface-200">
          <svg class="w-8 h-8 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-surface-500 text-sm font-medium">Belum ada jadwal pada hari {{ selectedDay }}.</p>
      </div>

      <div v-for="className in filteredClasses" :key="`${selectedDay}-${className}`" class="space-y-5">
        <div class="flex items-center gap-4 px-2">
          <div class="h-8 w-1.5 bg-brand-600 rounded-full"></div>
          <h2 class="text-xl font-black text-surface-900 tracking-tight">Kelas {{ className }}</h2>
          <div class="flex-1 h-px bg-surface-200/60"></div>
        </div>

        <div class="premium-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left">
              <thead>
                <tr class="bg-surface-50 border-b border-surface-200/60">
                  <th class="px-4 sm:px-6 lg:px-8 py-4 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em] w-48">Waktu</th>
                  <th class="px-4 sm:px-6 lg:px-8 py-4 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em]">Mata Pelajaran</th>
                  <th class="px-4 sm:px-6 lg:px-8 py-4 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em]">Guru Pengajar</th>
                  <th class="px-4 sm:px-6 lg:px-8 py-4 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em]">Ruangan</th>
                  <th v-if="canEdit" class="px-4 sm:px-6 lg:px-8 py-4 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em] text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-100">
                <tr v-for="slot in getSchedulesByClass(className)" :key="slot.id" class="hover:bg-surface-50/80 transition-all duration-300 group">
                  <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div class="inline-flex items-center px-3 py-1.5 bg-surface-100 text-surface-700 text-[11px] font-bold rounded-lg border border-surface-200/60 font-mono tabular-nums">
                      {{ slot.time }}
                    </div>
                  </td>
                  <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div class="font-black text-surface-900 text-[15px] tracking-tight max-w-xs truncate">{{ slot.subject }}</div>
                  </td>
                  <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-8 h-8 shrink-0 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 text-[11px] font-black border border-brand-100">
                        {{ slot.teacher.charAt(0) }}
                      </div>
                      <div class="min-w-0">
                        <p class="text-[13px] text-surface-700 font-bold max-w-xs truncate">{{ slot.teacher }}</p>
                        <p v-if="!slot.teacherId && canEdit" class="text-[10px] text-surface-400">Akun guru belum tertaut</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                    <div class="inline-flex items-center gap-2 text-surface-500 bg-surface-50 px-3 py-1 rounded-lg border border-surface-100">
                      <svg class="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <span class="text-[12px] font-bold">{{ slot.room }}</span>
                    </div>
                  </td>
                  <td v-if="canEdit" class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-right">
                    <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      <button @click="openEditModal(slot)" aria-label="Ubah jadwal" class="p-2.5 bg-surface-100 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-surface-200/60 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button @click="deleteSchedule(slot.id)" aria-label="Hapus jadwal" class="p-2.5 bg-surface-100 text-surface-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-surface-200/60 transition-all">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Modal
      :is-open="showModal"
      :title="editingSchedule ? 'Ubah Konfigurasi Jadwal' : 'Tambah Jadwal Akademik Baru'"
      subtitle="Lengkapi hari, kelas, dan guru pengajar."
      confirm-text="Simpan Jadwal"
      @close="closeModal"
      @confirm="saveSchedule"
    >
      <div class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Hari</label>
            <select
              v-model="formData.day"
              class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
            >
              <option v-for="day in dayOptions" :key="day" :value="day">{{ day }}</option>
            </select>
          </div>
          <div>
            <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Kelas</label>
            <select
              v-model="formData.class"
              class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Pilih Kelas...</option>
              <option v-for="c in classes" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <Input v-model="formData.startTime" label="Waktu Mulai" type="time" required />
          <Input v-model="formData.endTime" label="Waktu Selesai" type="time" required />
        </div>

        <Input
          v-model="formData.subject"
          label="Mata Pelajaran"
          placeholder="Contoh: Pemrograman Berorientasi Objek"
          required
        />

        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Akun Guru Pengajar</label>
          <select
            v-model="formData.teacherId"
            class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
            @change="onTeacherChange"
          >
            <option value="">— Pilih akun guru —</option>
            <option v-for="teacher in teacherAccounts" :key="teacher.id" :value="teacher.id">
              {{ teacher.name }} ({{ teacher.email }})
            </option>
          </select>
          <p class="mt-1 px-1 text-[10px] text-surface-400">
            Akun guru dipakai agar jadwal muncul di halaman “Mengajar” milik guru.
          </p>
        </div>

        <Input
          v-model="formData.teacher"
          label="Nama Guru (tampilan)"
          placeholder="Contoh: Budi Santoso, S.Kom."
          required
        />

        <Input
          v-model="formData.room"
          label="Lokasi / Ruangan"
          placeholder="Contoh: Lab RPL 2"
          required
        />
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useScheduleStore } from '../../stores/schedule'
import { useTeacherStore } from '../../stores/teacher'
import { useStudentStore } from '../../stores/student'
import { useRelationStore } from '../../stores/relation'
import { usePortalStore } from '../../stores/portal'
import type { Schedule } from '../../types'
import Button from '../../components/ui/Button.vue'
import Modal from '../../components/ui/Modal.vue'
import Input from '../../components/ui/Input.vue'
import { useExport } from '../../composables/useExport'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const dayOptions = DAYS

const authStore = useAuthStore()
const scheduleStore = useScheduleStore()
const teacherStore = useTeacherStore()
const studentStore = useStudentStore()
const relationStore = useRelationStore()
const portalStore = usePortalStore()

const canEdit = computed(() => authStore.hasAnyRole(['admin', 'kepala_tu', 'staff_tu']))
const isPersonal = computed(() => authStore.hasAnyRole(['orang_tua', 'siswa']))
const canExport = computed(() => !isPersonal.value)

const { exportToCsv } = useExport()
const exportSchedules = () => {
  const headers = ['Hari', 'Kelas', 'Jam', 'Mata Pelajaran', 'Guru', 'Ruang']
  const rows = scheduleStore.schedules.map((s) => [s.day, s.class, s.time, s.subject, s.teacher || '', s.room || ''])
  exportToCsv(headers, rows, 'ekspor-jadwal')
}

const todayIndex = new Date().getDay()
const initialDay = todayIndex === 0 ? 'Senin' : DAYS[todayIndex - 1] || 'Senin'
const selectedDay = ref(initialDay)
const selectedClassFilter = ref('')

onMounted(async () => {
  if (scheduleStore.schedules.length === 0) await scheduleStore.fetchSchedules()
  if (teacherStore.teachers.length === 0) await teacherStore.fetchTeachers()
  if (studentStore.students.length === 0) await studentStore.fetchStudents()
  if (canEdit.value) {
    if (relationStore.teachers.length === 0) await relationStore.fetchTeachers()
  }
  if (isPersonal.value) {
    if (!portalStore.summary?.selected) await portalStore.fetchSummary()
    selectedClassFilter.value =
      portalStore.summary?.selected?.profile.class || studentStore.classes[0] || ''
  }
})

const classes = computed(() => {
  const fromStudents = studentStore.classes.length > 0
    ? studentStore.classes
    : Array.from(new Set(scheduleStore.schedules.map((s) => s.class))).sort()
  return fromStudents
})

const teacherAccounts = computed(() => relationStore.teachers)

const filteredClasses = computed(() => {
  const list = selectedClassFilter.value ? [selectedClassFilter.value] : classes.value
  return list.filter((className) => scheduleStore.schedules.some((s) => s.class === className && s.day === selectedDay.value))
})

const dayCount = (day: string) =>
  scheduleStore.schedules.filter(
    (s) => s.day === day && (!selectedClassFilter.value || s.class === selectedClassFilter.value)
  ).length

const getSchedulesByClass = (className: string) => {
  return scheduleStore.schedules.filter((s) => s.class === className && s.day === selectedDay.value)
}

const showModal = ref(false)
const editingSchedule = ref<Schedule | null>(null)
const formData = reactive({
  class: '',
  day: 'Senin',
  startTime: '',
  endTime: '',
  subject: '',
  teacher: '',
  teacherId: '',
  room: ''
})

const onTeacherChange = () => {
  const account = teacherAccounts.value.find((teacher) => teacher.id === formData.teacherId)
  if (account) formData.teacher = account.name
}

const openAddModal = () => {
  editingSchedule.value = null
  formData.class = selectedClassFilter.value || classes.value[0] || ''
  formData.day = selectedDay.value || 'Senin'
  formData.startTime = ''
  formData.endTime = ''
  formData.subject = ''
  formData.teacher = ''
  formData.teacherId = ''
  formData.room = ''
  showModal.value = true
}

const openEditModal = (slot: Schedule) => {
  editingSchedule.value = slot
  formData.class = slot.class
  formData.day = slot.day || 'Senin'
  const [start, end] = slot.time.split(' - ')
  formData.startTime = start || ''
  formData.endTime = end || ''
  formData.subject = slot.subject
  formData.teacher = slot.teacher
  formData.teacherId = slot.teacherId || ''
  formData.room = slot.room
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const saveSchedule = async () => {
  const time = `${formData.startTime} - ${formData.endTime}`
  const dataToSave = {
    class: formData.class,
    day: formData.day,
    time,
    subject: formData.subject,
    teacher: formData.teacher,
    teacherId: formData.teacherId || null,
    room: formData.room
  }

  let success = false
  if (editingSchedule.value) {
    success = await scheduleStore.updateSchedule(editingSchedule.value.id, dataToSave)
  } else {
    success = await scheduleStore.addSchedule(dataToSave)
  }

  if (success) {
    selectedDay.value = formData.day
    closeModal()
  } else {
    alert(`Gagal menyimpan jadwal: ${scheduleStore.error}`)
  }
}

const deleteSchedule = async (id: string) => {
  if (confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) {
    const success = await scheduleStore.deleteSchedule(id)
    if (!success) alert(`Gagal menghapus jadwal: ${scheduleStore.error}`)
  }
}
</script>
