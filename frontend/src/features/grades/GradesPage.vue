<template>
  <!-- ================= ORANG TUA / SISWA ================= -->
  <div v-if="isPersonal" class="space-y-6 pb-16">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Nilai</h1>
        <p class="text-sm text-slate-500 mt-1">Ringkasan nilai per mata pelajaran.</p>
      </div>
      <div v-if="personalAverage !== null" class="rounded-xl border border-line bg-panel px-4 py-2 text-right">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rata-rata</p>
        <p class="text-xl font-bold text-slate-900 tabular-nums">{{ formatScore(personalAverage) }}</p>
      </div>
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

    <div v-if="personalSubjects.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <article v-for="item in personalSubjects" :key="item.subject" class="clean-card p-4 sm:p-5">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 class="truncate text-sm font-bold text-slate-900">{{ item.subject }}</h2>
            <p class="mt-0.5 text-[10px] text-slate-400">
              {{ item.count }} nilai
              <span v-if="item.delta !== 0" :class="item.delta > 0 ? 'text-emerald-600' : 'text-rose-500'">
                · {{ item.delta > 0 ? 'naik' : 'turun' }} {{ Math.abs(item.delta) }}
              </span>
            </p>
          </div>
          <div class="text-right">
            <p class="text-2xl font-bold text-slate-900 tabular-nums leading-none">{{ item.score }}</p>
            <span class="mt-1 inline-block rounded-md px-2 py-0.5 text-[10px] font-bold" :class="predicateMeta(item.score).badge">
              {{ predicateMeta(item.score).label }}
            </span>
          </div>
        </div>

        <div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div class="h-full rounded-full transition-all" :class="predicateMeta(item.score).bar" :style="{ width: `${item.score}%` }"></div>
        </div>
        <p class="mt-2 text-[10px] text-slate-400">
          Rata-rata {{ formatScore(item.average) }} · nilai terakhir {{ formatDate(item.date) }}
        </p>
      </article>
    </div>

    <div v-else class="clean-card p-8 text-center">
      <h2 class="text-base font-bold text-slate-900">Belum ada nilai</h2>
      <p class="mt-1 text-sm text-slate-500">Nilai akan muncul setelah guru menginputnya.</p>
    </div>
  </div>

  <!-- ================= STAF / GURU ================= -->
  <div v-else class="space-y-8 pb-16">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Nilai</h1>
        <p class="text-sm text-slate-500 mt-1">Rekapitulasi pencapaian akademik siswa.</p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:justify-end">
        <Button v-if="canEdit" variant="primary" @click="openAddModal">Input Nilai</Button>
        <Button v-if="canExport" variant="outline" class="no-print" @click="exportGrades">Ekspor CSV</Button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 premium-card p-4 sm:p-6">
      <div class="space-y-2">
        <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest px-1">Pilih Kelas</label>
        <select
          v-model="selectedClass"
          class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none cursor-pointer"
        >
          <option value="">Semua Kelas</option>
          <option v-for="c in classesList" :key="c.id" :value="c.name">
            Kelas {{ c.name }}
          </option>
        </select>
      </div>
      <div class="space-y-2">
        <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest px-1">Mata Pelajaran</label>
        <select
          v-model="selectedSubject"
          class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none cursor-pointer"
        >
          <option value="">Semua Mata Pelajaran</option>
          <option v-for="subject in subjectOptions" :key="subject" :value="subject">{{ subject }}</option>
        </select>
      </div>
    </div>

    <div class="premium-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-surface-50 border-b border-surface-200/60">
              <th class="px-4 sm:px-6 py-4 text-[11px] font-black text-surface-500 uppercase tracking-widest">Informasi Siswa</th>
              <th class="px-4 sm:px-6 py-4 text-[11px] font-black text-surface-500 uppercase tracking-widest">Mata Pelajaran</th>
              <th class="px-4 sm:px-6 py-4 text-[11px] font-black text-surface-500 uppercase tracking-widest text-center">Skor</th>
              <th class="px-4 sm:px-6 py-4 text-[11px] font-black text-surface-500 uppercase tracking-widest text-center">Predikat</th>
              <th class="px-4 sm:px-6 py-4 text-[11px] font-black text-surface-500 uppercase tracking-widest text-center">Tanggal</th>
              <th v-if="canEdit" class="px-4 sm:px-6 py-4 text-[11px] font-black text-surface-500 uppercase tracking-widest text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-surface-100">
            <tr v-for="grade in filteredGrades" :key="grade.id" class="hover:bg-surface-50/80 transition-colors group">
              <td class="px-4 sm:px-6 py-3">
                <div class="min-w-0">
                  <div class="font-bold text-surface-900 text-sm max-w-xs truncate">{{ grade.studentName }}</div>
                  <div class="text-[10px] text-brand-600 font-bold uppercase tracking-widest mt-1">{{ getStudentClass(grade.studentId) }}</div>
                </div>
              </td>
              <td class="px-4 sm:px-6 py-3">
                <span class="block max-w-xs truncate text-[13px] text-surface-600 font-bold">{{ grade.subject }}</span>
              </td>
              <td class="px-4 sm:px-6 py-3 text-center">
                <div class="inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold text-sm border shadow-sm tabular-nums" :class="getScoreClass(grade.score)">
                  {{ grade.score }}
                </div>
              </td>
              <td class="px-4 sm:px-6 py-3 text-center">
                <span class="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border" :class="getScoreClass(grade.score)">
                  {{ getGrade(grade.score) }}
                </span>
              </td>
              <td class="px-4 sm:px-6 py-3 text-center text-surface-500 text-[12px] font-medium tabular-nums">
                {{ formatDate(grade.date) }}
              </td>
              <td v-if="canEdit" class="px-4 sm:px-6 py-3 text-right">
                <div class="flex justify-end gap-2">
                  <button @click="openEditModal(grade)" aria-label="Ubah data nilai" class="p-2 bg-surface-100 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg border border-surface-200/60 transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button @click="deleteGrade(grade.id)" aria-label="Hapus data nilai" class="p-2 bg-surface-100 text-surface-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg border border-surface-200/60 transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredGrades.length === 0">
              <td :colspan="canEdit ? 6 : 5" class="px-4 py-8 text-center text-sm text-slate-400">
                Belum ada nilai untuk kriteria ini.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal
      :is-open="showModal"
      :title="editingGrade ? 'Ubah Data Nilai Siswa' : 'Input Nilai Akademik Baru'"
      subtitle="Masukkan rincian nilai untuk siswa yang dipilih."
      confirm-text="Simpan Nilai"
      @close="closeModal"
      @confirm="saveGrade"
    >
      <div class="space-y-5">
        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Pilih Siswa</label>
          <select
            v-model="formData.studentId"
            @change="onStudentChange"
            class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30 appearance-none cursor-pointer"
          >
            <option value="">Cari Nama Siswa...</option>
            <option v-for="student in students" :key="student.id" :value="student.id">
              {{ student.name }} ({{ student.class }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Mata Pelajaran</label>
          <input
            v-model="formData.subject"
            list="grade-subject-options"
            class="w-full px-4 py-3 bg-surface-100/50 border border-surface-200/60 rounded-xl text-surface-900 font-bold focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
          <datalist id="grade-subject-options">
            <option v-for="subject in subjectOptions" :key="subject" :value="subject" />
          </datalist>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            v-model.number="formData.score"
            type="number"
            label="Skor Nilai (0-100)"
            placeholder="0-100"
            required
          />
          <Input
            v-model="formData.date"
            type="date"
            label="Tanggal Penilaian"
            required
          />
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useGradeStore } from '../../stores/grade'
import { useStudentStore } from '../../stores/student'
import { usePortalStore } from '../../stores/portal'
import type { Grade } from '../../types'
import Button from '../../components/ui/Button.vue'
import Modal from '../../components/ui/Modal.vue'
import Input from '../../components/ui/Input.vue'
import { useExport } from '../../composables/useExport'

const authStore = useAuthStore()
const gradeStore = useGradeStore()
const studentStore = useStudentStore()
const portalStore = usePortalStore()
const { exportToCsv } = useExport()

const isPersonal = computed(() => authStore.hasAnyRole(['orang_tua', 'siswa']))
const canEdit = computed(() => authStore.hasAnyRole(['admin', 'kepala_sekolah', 'waka', 'guru_mapel', 'wali_kelas', 'guru']))
const canExport = computed(() => canEdit.value || authStore.hasAnyRole(['kepala_tu', 'staff_tu']))

/* ---------------- Mode personal ---------------- */
const selectedChildId = ref('')
const children = computed(() => portalStore.summary?.children ?? [])

const personalSubjects = computed(() => portalStore.summary?.selected?.grades.subjects ?? [])
const personalAverage = computed(() => {
  const value = portalStore.summary?.selected?.grades.average
  return typeof value === 'number' ? value : null
})

const formatScore = (value: number) => (Number(value) || 0).toFixed(1).replace('.', ',')

const formatDate = (value: string | null) =>
  value ? new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const predicateMeta = (score: number) => {
  if (score >= 90) return { label: 'Sangat baik', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', bar: 'bg-emerald-500' }
  if (score >= 80) return { label: 'Baik', badge: 'bg-sky-50 text-sky-700 border border-sky-100', bar: 'bg-sky-500' }
  if (score >= 70) return { label: 'Cukup', badge: 'bg-amber-50 text-amber-700 border border-amber-100', bar: 'bg-amber-500' }
  if (score >= 60) return { label: 'Perlu latihan', badge: 'bg-orange-50 text-orange-700 border border-orange-100', bar: 'bg-orange-500' }
  return { label: 'Perlu bimbingan', badge: 'bg-rose-50 text-rose-700 border border-rose-100', bar: 'bg-rose-500' }
}

const selectChild = async (id: string) => {
  selectedChildId.value = id
  await portalStore.fetchSummary(id)
}

/* ---------------- Mode staf ---------------- */
const selectedClass = ref('')
const selectedSubject = ref('')

const classesList = computed(() => studentStore.classes.map((name) => ({ id: name, name })))
const students = computed(() => studentStore.students)

const subjectOptions = computed(() => {
  const fromGrades = gradeStore.grades.map((grade) => grade.subject)
  return Array.from(new Set(fromGrades)).sort()
})

const filteredGrades = computed(() =>
  gradeStore.grades.filter((grade) => {
    const matchClass = !selectedClass.value || getStudentClass(grade.studentId) === selectedClass.value
    const matchSubject = !selectedSubject.value || grade.subject === selectedSubject.value
    return matchClass && matchSubject
  })
)

const showModal = ref(false)
const editingGrade = ref<Grade | null>(null)
const formData = reactive({
  studentId: '',
  studentName: '',
  subject: '',
  score: 0,
  date: new Date().toISOString().split('T')[0]
})

const getStudentClass = (studentId: string) => studentStore.getStudentById(studentId)?.class || '-'

const getGrade = (score: number) => {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'E'
}

const getScoreClass = (score: number) => {
  if (score >= 90) return 'bg-emerald-50 text-emerald-600 border-emerald-100'
  if (score >= 80) return 'bg-sky-50 text-sky-600 border-sky-100'
  if (score >= 70) return 'bg-amber-50 text-amber-600 border-amber-100'
  if (score >= 60) return 'bg-orange-50 text-orange-600 border-orange-100'
  return 'bg-rose-50 text-rose-600 border-rose-100'
}

const openAddModal = () => {
  editingGrade.value = null
  formData.studentId = ''
  formData.studentName = ''
  formData.subject = subjectOptions.value[0] || ''
  formData.score = 0
  formData.date = new Date().toISOString().split('T')[0]
  showModal.value = true
}

const openEditModal = (grade: Grade) => {
  editingGrade.value = grade
  formData.studentId = grade.studentId
  formData.studentName = grade.studentName
  formData.subject = grade.subject
  formData.score = grade.score
  formData.date = grade.date
  showModal.value = true
}

const onStudentChange = () => {
  const student = studentStore.getStudentById(formData.studentId)
  if (student) formData.studentName = student.name
}

const closeModal = () => {
  showModal.value = false
}

const saveGrade = async () => {
  if (!formData.studentId) {
    alert('Pilih siswa terlebih dahulu')
    return
  }
  if (!formData.subject.trim()) {
    alert('Isi mata pelajaran')
    return
  }

  let success = false
  if (editingGrade.value) {
    success = await gradeStore.updateGrade(editingGrade.value.id, formData)
  } else {
    success = await gradeStore.addGrade(formData)
  }

  if (success) closeModal()
  else alert(`Gagal menyimpan nilai: ${gradeStore.error}`)
}

const deleteGrade = async (id: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus data nilai ini?')) return
  const success = await gradeStore.deleteGrade(id)
  if (!success) alert(`Gagal menghapus nilai: ${gradeStore.error}`)
}

const exportGrades = () => {
  const headers = ['Siswa', 'Kelas', 'Mata Pelajaran', 'Skor', 'Predikat', 'Tanggal Input']
  const rows = filteredGrades.value.map((g) => [
    g.studentName,
    getStudentClass(g.studentId),
    g.subject,
    g.score,
    getGrade(g.score),
    formatDate(g.date)
  ])
  exportToCsv(headers, rows, 'ekspor-nilai')
}

onMounted(async () => {
  if (isPersonal.value) {
    if (!portalStore.summary?.selected) await portalStore.fetchSummary()
    selectedChildId.value = portalStore.summary?.selected?.profile.id || ''
    return
  }

  if (studentStore.students.length === 0) await studentStore.fetchStudents()
  if (gradeStore.grades.length === 0) await gradeStore.fetchGrades()
})
</script>
