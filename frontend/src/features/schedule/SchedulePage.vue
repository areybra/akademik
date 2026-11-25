<template>
  <div class="space-y-8 pb-16">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Jadwal Pelajaran</h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ isPersonal ? 'Jadwal kelas anak Anda.' : 'Penjadwalan aktivitas belajar mengajar SMK.' }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <Button v-if="canEdit" variant="primary" size="lg" @click="openAddModal">
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Jadwal
        </Button>
        <Button v-if="canEdit" variant="outline" size="lg" class="no-print" @click="openImportModal">Impor CSV</Button>
        <Button v-if="canExport" variant="outline" size="lg" class="no-print" @click="exportSchedules">Ekspor CSV</Button>
      </div>
    </div>

    <!-- Filter -->
    <div class="premium-card p-4 sm:p-6 space-y-4">
      <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div class="flex-1 max-w-md">
          <label :for="uid + '-filter-class'" class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Filter Kelas</label>
          <div class="relative">
            <select
              :id="uid + '-filter-class'"
              v-model="selectedClassFilter"
              class="w-full pl-11 pr-5 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:border-brand-500 transition-all appearance-none cursor-pointer"
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
                        <p v-if="slot.teacherEmail" class="text-[10px] text-surface-500 truncate">{{ slot.teacherEmail }}</p>
                        <p v-else-if="canEdit" class="text-[10px] text-amber-700">Akun guru belum tertaut</p>
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

    <!-- Modal jadwal -->
    <Modal
      :is-open="showModal"
      :title="editingSchedule ? 'Ubah Konfigurasi Jadwal' : 'Tambah Jadwal Akademik Baru'"
      subtitle="Guru terisi dari penugasan mapel dan kelas."
      confirm-text="Simpan Jadwal"
      @close="closeModal"
      @confirm="saveSchedule"
    >
      <div class="space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label :for="uid + '-day'" class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Hari</label>
            <select
              :id="uid + '-day'"
              v-model="formData.day"
              class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:border-brand-500 transition-all appearance-none cursor-pointer"
            >
              <option v-for="day in dayOptions" :key="day" :value="day">{{ day }}</option>
            </select>
          </div>
          <div>
            <label :for="uid + '-class'" class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Kelas</label>
            <select
              :id="uid + '-class'"
              v-model="formData.class"
              class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:border-brand-500 transition-all appearance-none cursor-pointer"
              @change="onClassChange"
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

        <div>
          <label :for="uid + '-subject'" class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Mata Pelajaran</label>
          <select
            :id="uid + '-subject'"
            v-model="formData.subject"
            class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:border-brand-500 transition-all appearance-none cursor-pointer"
            @change="onSubjectChange"
          >
            <option value="">Pilih Mapel...</option>
            <option v-for="subject in subjectOptions" :key="subject" :value="subject">{{ subject }}</option>
          </select>
        </div>

        <div>
          <label :for="uid + '-teacher'" class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Guru Pengajar</label>
          <select
            :id="uid + '-teacher'"
            v-model="formData.teacherId"
            :disabled="teacherLocked"
            class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:border-brand-500 transition-all appearance-none cursor-pointer disabled:opacity-70"
          >
            <option value="">Pilih guru pengampu...</option>
            <option v-for="teacher in teacherOptions" :key="teacher.id" :value="teacher.id">
              {{ teacher.name }} ({{ teacher.email }})
            </option>
          </select>
          <p class="mt-1 px-1 text-[10px] text-surface-500">
            <template v-if="teacherLocked">Guru mengikuti penugasan {{ formData.subject }} di {{ formData.class }}. Untuk mengganti, ubah di Penugasan Mengajar.</template>
            <template v-else-if="formData.class && formData.subject">Belum ada penugasan untuk kombinasi ini. Guru yang dipilih akan menjadi penanggung jawab mapel dan kelas tersebut.</template>
            <template v-else>Pilih kelas dan mapel untuk mengisi guru secara otomatis.</template>
          </p>
        </div>

        <Input
          v-model="formData.room"
          label="Lokasi / Ruangan"
          placeholder="Contoh: Lab RPL 2"
          required
        />
      </div>
    </Modal>

    <!-- Modal impor -->
    <Modal
      :is-open="showImportModal"
      title="Impor Jadwal CSV"
      subtitle="Periksa dulu, baru terapkan. Satu baris bermasalah membatalkan seluruh impor."
      :confirm-text="importing ? 'Menerapkan...' : 'Terapkan Impor'"
      @close="closeImportModal"
      @confirm="executeImport"
    >
      <div class="space-y-5">
        <div class="rounded-2xl border border-surface-200/70 bg-surface-50 p-4 space-y-3">
          <p class="text-xs font-semibold text-surface-700">
            Format kolom: Hari, Kelas, Mapel, Jam Mulai, Jam Selesai, Ruangan, Email Guru.
          </p>
          <button type="button" class="text-xs font-bold text-brand-600 hover:underline" @click="downloadTemplate">
            Unduh template CSV
          </button>
        </div>

        <div>
          <label :for="uid + '-import-file'" class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">File CSV</label>
          <input
            :id="uid + '-import-file'"
            type="file"
            accept=".csv,text/csv"
            class="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:text-xs file:font-bold file:text-brand-700 hover:file:bg-brand-100"
            @change="onFileChange"
          />
          <p v-if="importFileName" class="mt-1 px-1 text-[10px] text-surface-500">{{ importFileName }}</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label :for="uid + '-import-mode'" class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Mode</label>
            <select
              :id="uid + '-import-mode'"
              v-model="importMode"
              class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-ring focus:border-brand-500 transition-all appearance-none cursor-pointer"
              @change="resetPreview"
            >
              <option value="merge">Gabung dengan jadwal yang ada</option>
              <option value="replace">Ganti seluruh jadwal</option>
            </select>
          </div>
          <label class="flex items-start gap-2 rounded-2xl border border-surface-200/70 bg-surface-50 px-4 py-3 text-xs font-semibold text-surface-700">
            <input v-model="syncAssignments" type="checkbox" class="mt-0.5" @change="resetPreview" />
            <span>Selaraskan guru penugasan bila berbeda dengan file</span>
          </label>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" :disabled="!importFile || previewLoading || importing" @click="previewImport">
            {{ previewLoading ? 'Memeriksa...' : 'Periksa File' }}
          </Button>
          <p v-if="importing" class="text-[11px] font-semibold text-brand-600">Menerapkan impor, jangan tutup jendela ini.</p>
          <p v-if="importError" class="text-[11px] font-semibold text-rose-600">{{ importError }}</p>
        </div>

        <div v-if="preview" class="space-y-3">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            <div class="rounded-xl border border-surface-200/70 bg-panel px-2 py-2">
              <p class="text-[10px] font-black uppercase tracking-widest text-surface-500">Baru</p>
              <p class="text-lg font-black text-emerald-600">{{ preview.summary.create }}</p>
            </div>
            <div class="rounded-xl border border-surface-200/70 bg-panel px-2 py-2">
              <p class="text-[10px] font-black uppercase tracking-widest text-surface-500">Diperbarui</p>
              <p class="text-lg font-black text-brand-600">{{ preview.summary.update }}</p>
            </div>
            <div class="rounded-xl border border-surface-200/70 bg-panel px-2 py-2">
              <p class="text-[10px] font-black uppercase tracking-widest text-surface-500">Sama</p>
              <p class="text-lg font-black text-surface-700">{{ preview.summary.same }}</p>
            </div>
            <div class="rounded-xl border border-surface-200/70 bg-panel px-2 py-2">
              <p class="text-[10px] font-black uppercase tracking-widest text-surface-500">Bermasalah</p>
              <p class="text-lg font-black" :class="preview.summary.error > 0 ? 'text-rose-600' : 'text-surface-700'">{{ preview.summary.error }}</p>
            </div>
          </div>

          <div v-if="preview.mode === 'replace'" class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">
            Mode ganti akan mengganti {{ preview.summary.delete }} jadwal lama. Slot dengan kelas, hari, dan jam mulai yang sama tetap memakai id lama.
          </div>

          <div v-if="preview.errors.length > 0" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
            <p class="text-[11px] font-black uppercase tracking-widest text-rose-700 mb-1">Perbaiki dulu</p>
            <ul class="space-y-1 text-[11px] font-semibold text-rose-700">
              <li v-for="item in preview.errors" :key="`${item.row}-${item.message}`">Baris {{ item.row }}: {{ item.message }}</li>
            </ul>
          </div>

          <div v-if="preview.warnings.length > 0" class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
            <ul class="space-y-1 text-[11px] font-semibold text-amber-800">
              <li v-for="item in preview.warnings" :key="`${item.row}-${item.message}`">{{ item.message }}</li>
            </ul>
          </div>

          <div v-if="preview.assignmentChanges.length > 0" class="rounded-xl border border-surface-200/70 bg-panel px-3 py-2">
            <p class="text-[11px] font-black uppercase tracking-widest text-surface-500 mb-1">Perubahan guru penugasan</p>
            <ul class="space-y-1 text-[11px] font-semibold text-surface-700">
              <li v-for="item in preview.assignmentChanges" :key="`${item.class}-${item.subject}`">
                {{ item.subject }} di {{ item.class }}:
                {{ item.fromName || 'belum ada' }} menjadi {{ item.toName }}
              </li>
            </ul>
          </div>

          <div v-if="preview.rows.length > 0" class="max-h-64 overflow-auto rounded-xl border border-surface-200/70">
            <table class="w-full text-left text-[11px]">
              <thead class="sticky top-0 bg-surface-50">
                <tr class="text-[10px] uppercase tracking-widest text-surface-500">
                  <th class="px-2 py-2 font-bold">Baris</th>
                  <th class="px-2 py-2 font-bold">Status</th>
                  <th class="px-2 py-2 font-bold">Kelas</th>
                  <th class="px-2 py-2 font-bold">Mapel</th>
                  <th class="px-2 py-2 font-bold">Jam</th>
                  <th class="px-2 py-2 font-bold">Guru</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-surface-100">
                <tr v-for="row in preview.rows" :key="row.row">
                  <td class="px-2 py-1.5 font-mono tabular-nums">{{ row.row }}</td>
                  <td class="px-2 py-1.5 font-bold" :class="statusClass(row.action)">{{ statusLabel(row.action) }}</td>
                  <td class="px-2 py-1.5">{{ row.class }}</td>
                  <td class="px-2 py-1.5">{{ row.subject }}</td>
                  <td class="px-2 py-1.5 font-mono tabular-nums">{{ row.time }}</td>
                  <td class="px-2 py-1.5">{{ row.teacherEmail }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useScheduleStore, type ImportReport } from '../../stores/schedule'
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
const uid = useId()
const CSV_HEADERS = ['Hari', 'Kelas', 'Mapel', 'Jam Mulai', 'Jam Selesai', 'Ruangan', 'Email Guru']

const authStore = useAuthStore()
const scheduleStore = useScheduleStore()
const teacherStore = useTeacherStore()
const studentStore = useStudentStore()
const relationStore = useRelationStore()
const portalStore = usePortalStore()

const canEdit = computed(() => authStore.hasAnyRole(['admin', 'kepala_tu', 'staff_tu']))
const isPersonal = computed(() => authStore.hasAnyRole(['orang_tua', 'siswa']))
const canExport = computed(() => !isPersonal.value)

const { exportToCsv, toCsv } = useExport()
const exportSchedules = () => {
  const rows = scheduleStore.schedules.map((s) => {
    const [start, end] = s.time.split(' - ')
    return [s.day, s.class, s.subject, start || '', end || s.time, s.room || '', s.teacherEmail || '']
  })
  exportToCsv(CSV_HEADERS, rows, 'jadwal-pelajaran')
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
    await relationStore.fetchAssignments()
    await relationStore.fetchTeacherDirectory()
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
  teacherId: '',
  room: ''
})

const assignmentFor = (className: string, subject: string) =>
  relationStore.assignments.find(
    (item) =>
      item.class.trim().toLowerCase() === className.trim().toLowerCase() &&
      item.subject.trim().toLowerCase() === subject.trim().toLowerCase()
  )

const currentAssignment = computed(() => assignmentFor(formData.class, formData.subject))
const teacherLocked = computed(() => Boolean(currentAssignment.value))

const subjectOptions = computed(() => {
  const set = new Set<string>()
  for (const item of relationStore.assignments) {
    if (item.class.trim().toLowerCase() === formData.class.trim().toLowerCase()) set.add(item.subject)
  }
  for (const row of relationStore.teacherDirectory) {
    for (const subject of row.subjects || []) set.add(subject)
  }
  for (const slot of scheduleStore.schedules) set.add(slot.subject)
  return [...set].sort((a, b) => a.localeCompare(b, 'id'))
})

const teacherOptions = computed(() => {
  if (!formData.subject) return teacherAccounts.value
  const target = formData.subject.trim().toLowerCase()
  const capableIds = new Set(
    relationStore.teacherDirectory
      .filter((row) => row.subjects.some((item) => item.trim().toLowerCase() === target))
      .map((row) => row.account_id)
      .filter((id): id is string => Boolean(id))
  )
  const capable = teacherAccounts.value.filter((teacher) => capableIds.has(teacher.id))
  if (formData.teacherId && !capable.some((teacher) => teacher.id === formData.teacherId)) {
    const selected = teacherAccounts.value.find((teacher) => teacher.id === formData.teacherId)
    if (selected) capable.unshift(selected)
  }
  return capable
})

const syncTeacherFromAssignment = () => {
  const assignment = currentAssignment.value
  if (assignment) {
    formData.teacherId = assignment.teacher_id || ''
    return
  }
  if (formData.teacherId && !teacherOptions.value.some((teacher) => teacher.id === formData.teacherId)) {
    formData.teacherId = ''
  }
}

const onClassChange = () => {
  formData.subject = ''
  formData.teacherId = ''
}

const onSubjectChange = () => {
  formData.teacherId = ''
  syncTeacherFromAssignment()
}

const openAddModal = () => {
  editingSchedule.value = null
  formData.class = selectedClassFilter.value || classes.value[0] || ''
  formData.day = selectedDay.value || 'Senin'
  formData.startTime = ''
  formData.endTime = ''
  formData.subject = ''
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
  formData.teacherId = slot.teacherId || ''
  formData.room = slot.room
  showModal.value = true
  syncTeacherFromAssignment()
}

const closeModal = () => {
  showModal.value = false
}

const saveSchedule = async () => {
  if (!formData.class || !formData.subject || !formData.startTime || !formData.endTime || !formData.room) {
    alert('Lengkapi kelas, mapel, jam, dan ruangan.')
    return
  }
  if (!formData.teacherId) {
    alert('Pilih guru pengampu terlebih dahulu.')
    return
  }
  const time = `${formData.startTime} - ${formData.endTime}`
  const teacher = teacherAccounts.value.find((item) => item.id === formData.teacherId)
  const dataToSave = {
    class: formData.class,
    day: formData.day,
    time,
    subject: formData.subject,
    teacher: teacher?.name || currentAssignment.value?.teacher_name || '',
    teacherId: formData.teacherId,
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
    await relationStore.fetchAssignments()
    await relationStore.fetchTeacherDirectory()
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

// Impor CSV
const showImportModal = ref(false)
const importFile = ref<File | null>(null)
const importFileName = ref('')
const importMode = ref<'merge' | 'replace'>('merge')
const syncAssignments = ref(false)
const preview = ref<ImportReport | null>(null)
const previewLoading = ref(false)
const importing = ref(false)
const importError = ref('')

const openImportModal = () => {
  importFile.value = null
  importFileName.value = ''
  importMode.value = 'merge'
  syncAssignments.value = false
  preview.value = null
  importError.value = ''
  showImportModal.value = true
}

const closeImportModal = () => {
  if (importing.value) return
  showImportModal.value = false
}

const onFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] || null
  importFile.value = file
  importFileName.value = file ? `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)` : ''
  preview.value = null
  importError.value = ''
}

const resetPreview = () => {
  preview.value = null
  importError.value = ''
}

const previewImport = async () => {
  if (scheduleStore.loading) return
  if (!importFile.value) {
    importError.value = 'Pilih file CSV terlebih dahulu.'
    return
  }
  previewLoading.value = true
  importError.value = ''
  const result = await scheduleStore.importSchedules(importFile.value, {
    mode: importMode.value,
    dryRun: true,
    syncAssignments: syncAssignments.value
  })
  previewLoading.value = false
  if (result.error) {
    importError.value = result.error
    preview.value = null
    return
  }
  preview.value = result.report
}

const executeImport = async () => {
  if (importing.value || scheduleStore.loading) return
  if (!importFile.value) {
    importError.value = 'Pilih file CSV terlebih dahulu.'
    return
  }
  if (!preview.value) {
    importError.value = 'Periksa file terlebih dahulu.'
    return
  }
  if (preview.value.errors.length > 0) {
    importError.value = 'Masih ada baris bermasalah. Perbaiki file lalu periksa ulang.'
    return
  }
  const modeLabel = importMode.value === 'replace' ? 'mengganti seluruh jadwal' : 'menggabungkan jadwal'
  if (!confirm(`Terapkan impor dengan ${modeLabel}?`)) return

  importing.value = true
  const result = await scheduleStore.importSchedules(importFile.value, {
    mode: importMode.value,
    dryRun: false,
    syncAssignments: syncAssignments.value
  })
  importing.value = false
  if (result.error) {
    importError.value = result.error
    return
  }
  closeImportModal()
  await relationStore.fetchAssignments()
  await relationStore.fetchTeacherDirectory()
  alert(
    `Impor diterapkan: ${result.report?.summary.create || 0} baru, ${result.report?.summary.update || 0} diperbarui, ${result.report?.summary.same || 0} tetap.`
  )
}

const downloadTemplate = () => {
  const sample = ['Senin', 'X RPL 1', 'Informatika', '07:00', '08:30', 'Lab Kom 1', 'guru@smk.id']
  const csv = '\uFEFF' + toCsv(CSV_HEADERS, [sample])
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'template-jadwal.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const statusLabel = (action: string) => {
  if (action === 'create') return 'Baru'
  if (action === 'update') return 'Diperbarui'
  if (action === 'same') return 'Sama'
  return 'Error'
}

const statusClass = (action: string) => {
  if (action === 'create') return 'text-emerald-600'
  if (action === 'update') return 'text-brand-600'
  if (action === 'same') return 'text-surface-500'
  return 'text-rose-600'
}
</script>
