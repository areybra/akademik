<template>
  <div class="space-y-6 pb-16">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Mengajar</h1>
        <p class="text-sm text-slate-500 mt-1">
          Absensi dan nilai langsung dari jadwal mengajar Anda.
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 px-1">Tanggal</label>
          <input
            v-model="selectedDate"
            type="date"
            class="px-3 py-2 rounded-xl border border-line bg-panel text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <Button variant="outline" :disabled="teachingStore.loading" @click="load">
          Muat ulang
        </Button>
      </div>
    </div>

    <!-- Ringkasan -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Jadwal {{ dayLabel }}</p>
        <p class="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{{ teachingStore.slots.length }} sesi</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Absensi selesai</p>
        <p class="mt-2 text-2xl font-bold text-emerald-600 tabular-nums">{{ completedCount }} sesi</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Belum diisi</p>
        <p class="mt-2 text-2xl font-bold text-amber-600 tabular-nums">{{ pendingCount }} sesi</p>
      </div>
    </div>

    <!-- Peringatan sesi -->
    <div v-if="missedSlots.length || endingSoon.length" class="space-y-2">
      <div
        v-if="missedSlots.length"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
      >
        {{ missedSlots.length }} sesi lewat jam selesai tanpa input absensi:
        {{ missedSlots.map((slot) => `${slot.subject} (${slot.class})`).join(', ') }}.
      </div>
      <div
        v-for="item in endingSoon"
        :key="`warn-${item.slot.id}`"
        class="rounded-xl border px-4 py-3 text-xs font-medium"
        :class="item.minutes <= 5 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-800'"
      >
        Sesi {{ item.slot.subject }} ({{ item.slot.class }}) selesai dalam {{ item.minutes }} menit —
        {{ item.slot.total > 0 && item.slot.filled >= item.slot.total ? 'absensi sudah diisi, belum dikirim' : 'absensi belum diisi' }}.
      </div>
    </div>

    <!-- Jadwal -->
    <div v-if="teachingStore.loading && teachingStore.slots.length === 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div v-for="index in 2" :key="`teach-skeleton-${index}`" class="clean-card p-5 animate-pulse">
        <div class="h-3 w-24 rounded bg-slate-100"></div>
        <div class="mt-3 h-6 w-40 rounded bg-slate-100"></div>
        <div class="mt-4 h-3 w-32 rounded bg-slate-100"></div>
      </div>
    </div>

    <div v-else-if="teachingStore.slots.length === 0" class="clean-card p-8 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 class="mt-3 text-base font-bold text-slate-900">Tidak ada jadwal mengajar</h2>
      <p class="mt-1 text-sm text-slate-500">
        Tidak ada jadwal untuk {{ dayLabel }}. Pilih tanggal lain atau hubungi admin bila jadwal belum diatur.
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <article v-for="slot in teachingStore.slots" :key="slot.id" class="clean-card p-4 sm:p-5 flex flex-col">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 tabular-nums">{{ slot.time }}</span>
              <span class="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{{ slot.class }}</span>
            </div>
            <h3 class="mt-2 text-base font-bold text-slate-900 truncate">{{ slot.subject }}</h3>
            <p class="mt-0.5 text-[11px] text-slate-500 truncate">{{ slot.teacher }} · {{ slot.room }}</p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold"
            :class="slot.status === 'submitted'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
              : slot.complete
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : slot.sessionId
                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                  : 'bg-slate-100 text-slate-500'"
          >
            {{ slot.status === 'submitted'
              ? 'Terkunci'
              : slot.complete
                ? 'Absensi lengkap'
                : slot.sessionId ? `Tersimpan ${slot.filled}/${slot.total}` : 'Belum diisi' }}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <Button
            :variant="slot.status === 'submitted' ? 'outline' : 'primary'"
            size="sm"
            :disabled="slot.total === 0 || (!isLocked(slot) && isNotStarted(slot))"
            @click="openAttendance(slot)"
          >
            {{ isLocked(slot) ? 'Lihat Absensi' : isNotStarted(slot) ? 'Belum dimulai' : slot.sessionId ? 'Ubah Absensi' : 'Isi Absensi' }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="slot.total === 0 || isNotStarted(slot)"
            @click="openGradebook(slot)"
          >
            {{ isLocked(slot) ? 'Lihat Nilai' : 'Input Nilai' }}
          </Button>
          <Button v-if="isAdmin && isLocked(slot)" variant="secondary" size="sm" @click="unlock(slot)">
            Buka Kunci
          </Button>
          <span class="text-[10px] text-slate-400 ml-auto">
            {{ slot.total === 0 ? 'Belum ada siswa di kelas ini' : `${slot.filled}/${slot.total} siswa` }}
          </span>
        </div>
      </article>
    </div>

    <!-- Mapel & kelas -->
    <section class="clean-card p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Mapel &amp; kelas saya</h2>
          <p class="text-[11px] text-slate-500 mt-0.5">Penugasan dari admin. Nilai hanya bisa diinput untuk mapel ini.</p>
        </div>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{{ teachingStore.assignments.length }} penugasan</span>
      </div>

      <div v-if="teachingStore.assignments.length > 0" class="mt-3 flex flex-wrap gap-2">
        <span
          v-for="assignment in teachingStore.assignments"
          :key="assignment.id"
          class="rounded-xl border border-line bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-700"
        >
          {{ assignment.subject }}
          <span class="text-slate-400">· {{ assignment.class }}</span>
        </span>
      </div>
      <p v-else class="mt-3 rounded-xl bg-amber-50 px-3 py-3 text-[11px] font-medium text-amber-800">
        Belum ada penugasan mapel. Hubungi admin agar Anda dapat menginput nilai.
      </p>
    </section>

    <!-- Modal absensi -->
    <Modal
      :is-open="attendanceOpen"
      :title="activeLocked ? `Absensi ${activeSlot?.subject || ''} (terkunci)` : `Absensi ${activeSlot?.subject || ''}`"
      :subtitle="activeSlot ? `${activeSlot.class} · ${selectedDate} · ${activeSlot.time}` : ''"
      confirm-text="Simpan Absensi"
      :cancel-text="activeLocked ? 'Tutup' : 'Batal'"
      :hide-confirm="activeLocked"
      size="lg"
      @close="attendanceOpen = false"
      @confirm="saveAttendance"
    >
      <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <p class="text-xs text-slate-500">
            {{ session?.students.length ?? 0 }} siswa · {{ attendanceSaved }} hadir
          </p>
          <button
            v-if="!activeLocked"
            type="button"
            class="text-[11px] font-bold text-indigo-600 hover:underline"
            @click="markAllPresent"
          >
            Tandai semua hadir
          </button>
        </div>

        <div v-if="!session" class="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">Memuat daftar siswa…</div>

        <ul v-else class="divide-y divide-line">
          <li v-for="student in session.students" :key="student.id" class="py-2.5">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-slate-800">{{ student.name }}</p>
                <p class="text-[10px] text-slate-400">{{ student.class }}</p>
              </div>
              <div class="flex items-center gap-1">
                <button
                  v-for="option in statusOptions"
                  :key="option.value"
                  type="button"
                  :disabled="activeLocked"
                  class="rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  :class="attendanceForm[student.id] === option.value ? option.active : 'border-line bg-panel text-slate-500 hover:bg-slate-50'"
                  @click="setStatus(student.id, option.value)"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <input
              v-if="attendanceForm[student.id] !== 'hadir'"
              v-model="attendanceNotes[student.id]"
              type="text"
              :disabled="activeLocked"
              placeholder="Keterangan (opsional)"
              class="mt-2 w-full rounded-lg border border-line bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </li>
        </ul>

        <p v-if="session && session.students.length === 0" class="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
          Belum ada siswa aktif di kelas ini.
        </p>

        <p v-if="attendanceError" class="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">{{ attendanceError }}</p>

        <div v-if="session && !activeLocked" class="rounded-xl border border-line bg-slate-50 px-3 py-3">
          <p class="text-[11px] text-slate-500">
            Setelah dikirim, absensi dan nilai sesi ini terkunci. Hanya admin yang dapat membuka kembali.
          </p>
          <Button variant="primary" size="sm" class="mt-2" :disabled="teachingStore.loading" @click="submitAttendance">
            Konfirmasi &amp; Kirim
          </Button>
        </div>
        <p v-else-if="activeLocked" class="rounded-xl bg-indigo-50 px-3 py-3 text-[11px] font-medium text-indigo-700">
          Sesi sudah dikirim{{ activeSubmittedAt ? ` pada ${formatDate(activeSubmittedAt)}` : '' }}.
        </p>
      </div>
    </Modal>

    <!-- Modal nilai -->
    <Modal
      :is-open="gradeOpen"
      :title="activeLocked ? `Nilai ${gradeSubject} (terkunci)` : `Input Nilai ${gradeSubject}`"
      :subtitle="`${gradeClass} · ${selectedDate}`"
      confirm-text="Simpan Nilai"
      :hide-confirm="activeLocked"
      size="lg"
      @close="gradeOpen = false"
      @confirm="saveGrades"
    >
      <div class="space-y-4">
        <div class="rounded-xl bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Terisi</p>
          <p class="text-sm font-bold text-slate-800">{{ filledScoreCount }} / {{ teachingStore.gradebook.length }} siswa</p>
        </div>

        <div v-if="teachingStore.loading && teachingStore.gradebook.length === 0" class="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">Memuat daftar siswa…</div>
        <p v-else-if="teachingStore.gradebook.length === 0" class="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
          Belum ada siswa aktif di kelas ini.
        </p>

        <ul v-else class="divide-y divide-line">
          <li v-for="student in teachingStore.gradebook" :key="student.id" class="flex items-center gap-3 py-2.5">
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-bold text-slate-800">{{ student.name }}</p>
              <p class="text-[10px] text-slate-400">
                {{ student.latestScore !== null ? `Terakhir ${student.latestScore} · ${formatDate(student.latestDate)}` : 'Belum ada nilai' }}
              </p>
            </div>
            <input
              v-model.number="scoreForm[student.id]"
              type="number"
              min="0"
              max="100"
              :disabled="activeLocked"
              placeholder="0–100"
              class="w-24 rounded-xl border border-line bg-panel px-3 py-2 text-right text-sm font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </li>
        </ul>

        <p v-if="activeLocked" class="rounded-xl bg-indigo-50 px-3 py-3 text-[11px] font-medium text-indigo-700">
          Sesi sudah ditutup. Nilai hanya dapat dilihat.
        </p>
        <p v-if="gradeError" class="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">{{ gradeError }}</p>
        <p v-if="gradeSuccess" class="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700">{{ gradeSuccess }}</p>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import Button from '../../components/ui/Button.vue'
import Modal from '../../components/ui/Modal.vue'
import { useTeachingStore, type TeachingSlot } from '../../stores/teaching'
import { useGradeStore } from '../../stores/grade'
import { useAuthStore } from '../../stores/auth'

const teachingStore = useTeachingStore()
const gradeStore = useGradeStore()
const authStore = useAuthStore()

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref(today)

const statusOptions = [
  { value: 'hadir' as const, label: 'Hadir', active: 'border-emerald-200 bg-emerald-50 text-emerald-700' },
  { value: 'izin' as const, label: 'Izin', active: 'border-amber-200 bg-amber-50 text-amber-700' },
  { value: 'alfa' as const, label: 'Tanpa kabar', active: 'border-rose-200 bg-rose-50 text-rose-700' }
]

const dayLabel = computed(() => {
  const date = new Date(`${selectedDate.value}T00:00:00`)
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
})

const completedCount = computed(() => teachingStore.slots.filter((slot) => slot.complete).length)
const pendingCount = computed(() => teachingStore.slots.filter((slot) => !slot.complete).length)

/* ---------------- Waktu & kunci sesi ---------------- */
const isAdmin = computed(() => authStore.hasAnyRole(['admin']))
const now = ref(Date.now())
const timer = setInterval(() => { now.value = Date.now() }, 30000)
onUnmounted(() => clearInterval(timer))

const startMs = (slot: TeachingSlot) => (slot.startAt ? new Date(slot.startAt).getTime() : 0)
const endMs = (slot: TeachingSlot) => (slot.endAt ? new Date(slot.endAt).getTime() : 0)
const liveSlot = (slot: TeachingSlot) => teachingStore.slots.find((item) => item.id === slot.id) || slot
const isLocked = (slot: TeachingSlot) => liveSlot(slot).status === 'submitted'
const isNotStarted = (slot: TeachingSlot) => !!slot.startAt && now.value < startMs(slot)

const missedSlots = computed(() => teachingStore.slots.filter((slot) => slot.missingInput))
const endingSoon = computed(() =>
  teachingStore.slots
    .filter((slot) => slot.endAt && !isLocked(slot) && now.value >= startMs(slot) && now.value < endMs(slot))
    .map((slot) => ({ slot, minutes: Math.max(1, Math.ceil((endMs(slot) - now.value) / 60000)) }))
    .filter((item) => item.minutes <= 30)
    .sort((a, b) => a.minutes - b.minutes)
)

const load = () => teachingStore.fetchToday(selectedDate.value)

onMounted(load)
watch(selectedDate, load)

/* ---------------- Absensi per sesi ---------------- */
const attendanceOpen = ref(false)
const activeSlot = ref<TeachingSlot | null>(null)
const session = ref<Awaited<ReturnType<typeof teachingStore.openSession>>>(null)
const attendanceForm = reactive<Record<string, 'hadir' | 'izin' | 'alfa'>>({})
const attendanceNotes = reactive<Record<string, string>>({})
const attendanceError = ref('')
const attendanceSaved = computed(() =>
  Object.values(attendanceForm).filter((status) => status === 'hadir').length
)
const activeLocked = computed(() => (activeSlot.value ? isLocked(activeSlot.value) : false) || session.value?.status === 'submitted')
const activeSubmittedAt = computed(() => (activeSlot.value ? liveSlot(activeSlot.value).submittedAt : null))

const openAttendance = async (slot: TeachingSlot) => {
  activeSlot.value = slot
  attendanceError.value = ''
  attendanceOpen.value = true
  session.value = null
  Object.keys(attendanceForm).forEach((key) => delete attendanceForm[key])
  Object.keys(attendanceNotes).forEach((key) => delete attendanceNotes[key])

  const result = await teachingStore.openSession(slot.id, selectedDate.value)
  if (!result) {
    attendanceError.value = teachingStore.error || 'Gagal membuka sesi absensi'
    return
  }

  session.value = result
  const saved = new Map(result.records.map((record) => [record.studentId, record]))
  for (const student of result.students) {
    const record = saved.get(student.id)
    attendanceForm[student.id] = record ? record.status : 'hadir'
    attendanceNotes[student.id] = record?.note || ''
  }
}

const setStatus = (studentId: string, status: 'hadir' | 'izin' | 'alfa') => {
  attendanceForm[studentId] = status
}

const markAllPresent = () => {
  for (const student of session.value?.students ?? []) attendanceForm[student.id] = 'hadir'
}

const persistAttendance = async () => {
  if (!session.value) return false
  attendanceError.value = ''
  const payload = session.value.students.map((student) => ({
    studentId: student.id,
    status: attendanceForm[student.id] || 'hadir',
    note: attendanceNotes[student.id] || ''
  }))
  const success = await teachingStore.saveSession(session.value.id, payload)
  if (!success) {
    attendanceError.value = teachingStore.error || 'Gagal menyimpan absensi'
    return false
  }
  return true
}

const saveAttendance = async () => {
  if (!(await persistAttendance())) return
  attendanceOpen.value = false
  await load()
}

const submitAttendance = async () => {
  if (!session.value) return
  if (!(await persistAttendance())) return
  const success = await teachingStore.submitSession(session.value.id)
  if (!success) {
    attendanceError.value = teachingStore.error || 'Gagal mengirim sesi'
    return
  }
  session.value = { ...session.value, status: 'submitted', submittedAt: new Date().toISOString() }
  attendanceOpen.value = false
  await load()
}

const unlock = async (slot: TeachingSlot) => {
  if (!slot.sessionId) return
  if (!(await teachingStore.unlockSession(slot.sessionId))) return
  await load()
}

/* ---------------- Nilai per mapel ---------------- */
const gradeOpen = ref(false)
const gradeClass = ref('')
const gradeSubject = ref('')
const scoreForm = reactive<Record<string, number | ''>>({})
const gradeError = ref('')
const gradeSuccess = ref('')

const filledScoreCount = computed(
  () => Object.values(scoreForm).filter((value) => value !== '' && value !== null && value !== undefined).length
)

const openGradebook = async (slot: TeachingSlot) => {
  activeSlot.value = slot
  session.value = null
  gradeClass.value = slot.class
  gradeSubject.value = slot.subject
  gradeError.value = ''
  gradeSuccess.value = ''
  gradeOpen.value = true
  Object.keys(scoreForm).forEach((key) => delete scoreForm[key])
  await teachingStore.fetchGradebook(slot.class, slot.subject)
  for (const student of teachingStore.gradebook) scoreForm[student.id] = ''
}

const saveGrades = async () => {
  gradeError.value = ''
  gradeSuccess.value = ''
  const entries = teachingStore.gradebook
    .filter((student) => scoreForm[student.id] !== '' && scoreForm[student.id] !== undefined)
    .map((student) => ({
      studentId: student.id,
      studentName: student.name,
      subject: gradeSubject.value,
      score: Number(scoreForm[student.id]),
      date: selectedDate.value
    }))

  if (entries.length === 0) {
    gradeError.value = 'Isi minimal satu nilai siswa.'
    return
  }
  if (entries.some((entry) => !Number.isFinite(entry.score) || entry.score < 0 || entry.score > 100)) {
    gradeError.value = 'Nilai harus berada di antara 0 dan 100.'
    return
  }

  const success = await gradeStore.bulkSaveGrades(entries)
  if (!success) {
    gradeError.value = gradeStore.error || 'Gagal menyimpan nilai'
    return
  }
  gradeSuccess.value = `${entries.length} nilai tersimpan.`
  await load()
  setTimeout(() => {
    if (gradeOpen.value) gradeOpen.value = false
  }, 600)
}

const formatDate = (value: string | null) => {
  if (!value) return ''
  const date = value.includes('T') ? new Date(value) : new Date(`${value}T00:00:00`)
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}
</script>
