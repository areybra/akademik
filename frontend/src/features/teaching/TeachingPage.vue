<template>
  <div class="space-y-4 sm:space-y-6 pb-16">
    <!-- Header -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          {{ isMonitoring ? 'Monitoring Mengajar' : 'Mengajar' }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          {{ isMonitoring
            ? 'Pantau sesi mengajar semua guru, lengkap dengan status absensi dan kunci sesi.'
            : 'Absensi dan nilai langsung dari jadwal mengajar Anda.' }}
        </p>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label :for="`${uid}-date`" class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 px-1">Tanggal</label>
          <input
            :id="`${uid}-date`"
            v-model="selectedDate"
            type="date"
            class="px-3 py-2 rounded-xl border border-line bg-panel text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button variant="outline" :disabled="teachingStore.loading" @click="() => load()">
          Muat ulang
        </Button>
      </div>
    </div>

    <!-- Ringkasan -->
    <div v-if="isMonitoring" class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Sesi {{ dayLabel }}</p>
        <p class="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{{ teachingStore.slots.length }}</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Terkunci</p>
        <p class="mt-2 text-2xl font-bold text-indigo-600 tabular-nums">{{ submittedCount }}</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Belum diisi</p>
        <p class="mt-2 text-2xl font-bold text-amber-700 tabular-nums">{{ emptyCount }}</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Lewat jam</p>
        <p class="mt-2 text-2xl font-bold text-rose-600 tabular-nums">{{ missingCount }}</p>
      </div>
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Jadwal {{ dayLabel }}</p>
        <p class="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{{ teachingStore.slots.length }} sesi</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Absensi selesai</p>
        <p class="mt-2 text-2xl font-bold text-emerald-600 tabular-nums">{{ completedCount }} sesi</p>
      </div>
      <div class="clean-card p-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Belum diisi</p>
        <p class="mt-2 text-2xl font-bold text-amber-600 tabular-nums">{{ pendingCount }} sesi</p>
      </div>
    </div>

    <!-- Filter monitoring -->
    <div v-if="isMonitoring" class="clean-card p-3 sm:p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
        <div>
          <label for="monitor-teacher" class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 px-1">Guru</label>
          <select id="monitor-teacher" v-model="teacherFilter" class="w-full px-3 py-2 rounded-xl border border-line bg-panel text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">Semua guru</option>
            <option v-for="teacher in teacherOptions" :key="teacher.id" :value="teacher.id">{{ teacher.label }}</option>
          </select>
        </div>
        <div>
          <label for="monitor-status" class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 px-1">Status</label>
          <select id="monitor-status" v-model="statusFilter" class="w-full px-3 py-2 rounded-xl border border-line bg-panel text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="all">Semua status</option>
            <option value="submitted">Terkunci</option>
            <option value="empty">Belum diisi</option>
            <option value="missing">Lewat jam</option>
          </select>
        </div>
        <p class="text-[11px] font-medium text-slate-500 sm:col-span-2 lg:text-right">
          Menampilkan {{ visibleSlots.length }} dari {{ teachingStore.slots.length }} sesi.
        </p>
      </div>
    </div>

    <div v-if="actionMessage" class="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
      <span>{{ actionMessage }}</span>
      <button type="button" class="font-bold underline" @click="actionMessage = ''">Tutup</button>
    </div>

    <!-- Peringatan sesi -->
    <div v-if="missedSlots.length || endingSoon.length" class="space-y-2">
      <div
        v-if="missedSlots.length"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700"
      >
        {{ missedSlots.length }} sesi lewat jam selesai tanpa input absensi:
        {{ missedSlots.map((slot) => `${slot.subject} (${slot.class})${isMonitoring ? ` — ${slot.teacher}` : ''}`).join(', ') }}.
      </div>
      <div
        v-for="item in endingSoon"
        :key="`warn-${item.slot.id}`"
        class="rounded-xl border px-4 py-3 text-xs font-medium"
        :class="item.minutes <= 5 ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-amber-200 bg-amber-50 text-amber-800'"
      >
        Sesi {{ item.slot.subject }} ({{ item.slot.class }}){{ isMonitoring ? ` — ${item.slot.teacher}` : '' }} selesai dalam {{ item.minutes }} menit —
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

    <div v-else-if="visibleSlots.length === 0" class="clean-card p-6 sm:p-8 text-center">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <svg class="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 class="mt-3 text-base font-bold text-slate-900">
        {{ teachingStore.slots.length === 0 ? 'Tidak ada jadwal mengajar' : 'Tidak ada sesi sesuai filter' }}
      </h2>
      <p class="mt-1 text-sm text-slate-500">
        {{ teachingStore.slots.length === 0
          ? `Tidak ada jadwal untuk ${dayLabel}. Pilih tanggal lain atau hubungi admin bila jadwal belum diatur.`
          : 'Ubah pilihan guru atau status untuk melihat sesi lain.' }}
      </p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <article v-for="slot in visibleSlots" :key="slot.id" class="clean-card p-4 sm:p-5 flex flex-col">
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
            :class="statusBadge(slot).className"
          >
            {{ statusBadge(slot).label }}
          </span>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <Button
            :variant="slot.status === 'submitted' ? 'outline' : 'primary'"
            size="sm"
            :disabled="slot.total === 0 || (isMonitoring ? !slot.sessionId : (!isLocked(slot) && isNotStarted(slot)))"
            @click="openAttendance(slot)"
          >
            {{ isMonitoring
              ? (slot.sessionId ? 'Lihat Absensi' : 'Belum ada absensi')
              : isLocked(slot) ? 'Lihat Absensi' : isNotStarted(slot) ? 'Belum dimulai' : slot.sessionId ? 'Ubah Absensi' : 'Isi Absensi' }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="slot.total === 0 || (!isMonitoring && isNotStarted(slot))"
            @click="openGradebook(slot)"
          >
            {{ isMonitoring ? 'Lihat Nilai' : isLocked(slot) ? 'Lihat Nilai' : 'Input Nilai' }}
          </Button>
          <Button v-if="isAdmin && isLocked(slot)" variant="secondary" size="sm" @click="unlock(slot)">
            Buka Kunci
          </Button>
          <span class="text-[10px] text-slate-500 ml-auto">
            {{ slot.total === 0 ? 'Belum ada siswa di kelas ini' : `${slot.filled}/${slot.total} siswa` }}
          </span>
        </div>
      </article>
    </div>

    <!-- Rekap per guru (monitoring) -->
    <section v-if="isMonitoring" class="clean-card p-4 sm:p-5">
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-bold text-slate-900">Rekap per guru</h2>
          <p class="text-[11px] text-slate-500 mt-0.5">Klik baris untuk memfilter daftar sesi.</p>
        </div>
        <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">{{ teacherSummary.length }} guru</span>
      </div>

      <div v-if="teacherSummary.length > 0" class="mt-3 overflow-x-auto">
        <table class="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr class="border-b border-line text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <th class="py-2 pr-3">Guru</th>
              <th class="py-2 px-2 text-center">Sesi</th>
              <th class="py-2 px-2 text-center">Terkunci</th>
              <th class="py-2 px-2 text-center">Belum</th>
              <th class="py-2 pl-2 text-center">Lewat jam</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr
              v-for="row in teacherSummary"
              :key="row.key"
              class="cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              :class="teacherFilter === row.key ? 'bg-indigo-50/60' : ''"
              tabindex="0"
              role="button"
              :aria-pressed="teacherFilter === row.key"
              :aria-label="`Filter sesi ${row.label}`"
              @click="teacherFilter = row.key"
              @keydown.enter.prevent="teacherFilter = row.key"
              @keydown.space.prevent="teacherFilter = row.key"
            >
              <td class="py-2 pr-3 font-semibold text-slate-800">{{ row.label }}</td>
              <td class="py-2 px-2 text-center tabular-nums text-slate-600">{{ row.total }}</td>
              <td class="py-2 px-2 text-center tabular-nums font-semibold text-indigo-600">{{ row.submitted }}</td>
              <td class="py-2 px-2 text-center tabular-nums font-semibold text-amber-700">{{ row.empty }}</td>
              <td class="py-2 pl-2 text-center tabular-nums font-semibold text-rose-600">{{ row.missing }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="mt-3 rounded-xl bg-slate-50 px-3 py-3 text-[11px] text-slate-500">
        Belum ada sesi pada tanggal ini.
      </p>
    </section>

    <!-- Mapel & kelas -->
    <section v-if="!isMonitoring" class="clean-card p-4 sm:p-5">
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
          <span class="text-slate-500">· {{ assignment.class }}</span>
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
      :cancel-text="activeLocked || isReadOnlyMonitoring ? 'Tutup' : 'Batal'"
      :hide-confirm="activeLocked || isReadOnlyMonitoring"
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
            v-if="!activeLocked && !isReadOnlyMonitoring"
            type="button"
            class="text-[11px] font-bold text-indigo-600 hover:underline"
            @click="markAllPresent"
          >
            Tandai semua hadir
          </button>
        </div>

        <p v-if="isReadOnlyMonitoring" class="rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-medium text-slate-600">
          Mode monitoring: absensi hanya dapat dilihat. Hanya admin yang dapat membuka kunci sesi.
        </p>

        <div v-if="!session" class="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">Memuat daftar siswa…</div>

        <ul v-else class="divide-y divide-line">
          <li v-for="student in session.students" :key="student.id" class="py-2.5">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div class="min-w-0">
                <p class="truncate text-xs font-bold text-slate-800">{{ student.name }}</p>
                <p class="text-[10px] text-slate-500">{{ student.class }}</p>
              </div>
              <div class="flex items-center gap-1">
                <button
                  v-for="option in statusOptions"
                  :key="option.value"
                  type="button"
                  :disabled="activeLocked || isReadOnlyMonitoring"
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
              class="mt-2 w-full rounded-lg border border-line bg-slate-50 px-3 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-ring"
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
      :title="activeLocked ? `Nilai ${gradeSubject} (terkunci)` : !canWriteActiveGradebook ? `Nilai ${gradeSubject}` : `Input Nilai ${gradeSubject}`"
      :subtitle="`${gradeClass} · ${selectedDate}`"
      confirm-text="Simpan Nilai"
      :hide-confirm="activeLocked || !canWriteActiveGradebook"
      size="lg"
      @close="gradeOpen = false"
      @confirm="saveGrades"
    >
      <div class="space-y-4">
        <div class="rounded-xl bg-slate-50 px-3 py-2">
          <p class="text-[10px] font-bold uppercase tracking-widest text-slate-500">Terisi</p>
          <p class="text-sm font-bold text-slate-800">{{ filledScoreCount }} / {{ teachingStore.gradebook.length }} siswa</p>
        </div>

        <p v-if="!canWriteActiveGradebook" class="rounded-xl bg-amber-50 px-3 py-3 text-[11px] font-medium text-amber-800">
          Slot ini Anda ampu untuk absensi. Nilai {{ gradeSubject }} kelas {{ gradeClass }} menjadi tanggung jawab guru
          mata pelajaran yang ditugaskan. Hubungi admin bila penugasan perlu diubah.
        </p>

        <div v-if="teachingStore.loading && teachingStore.gradebook.length === 0" class="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">Memuat daftar siswa…</div>
        <p v-else-if="teachingStore.gradebook.length === 0" class="rounded-xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
          Belum ada siswa aktif di kelas ini.
        </p>

        <ul v-else class="divide-y divide-line">
          <li v-for="student in teachingStore.gradebook" :key="student.id" class="flex items-center gap-3 py-2.5">
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-bold text-slate-800">{{ student.name }}</p>
              <p class="text-[10px] text-slate-500">
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
              class="w-24 rounded-xl border border-line bg-panel px-3 py-2 text-right text-sm font-bold text-slate-800 tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
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
import { computed, onMounted, onUnmounted, reactive, ref, useId, watch } from 'vue'
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
const uid = useId()

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
const isMonitoring = computed(() => authStore.hasAnyRole(['admin', 'kepala_sekolah', 'waka']))
const actionMessage = ref('')
const teacherFilter = ref('all')
const statusFilter = ref<'all' | 'submitted' | 'empty' | 'missing'>('all')

const teacherKey = (slot: TeachingSlot) => slot.teacherId || slot.teacher
const teacherOptions = computed(() => {
  const map = new Map<string, string>()
  for (const slot of teachingStore.slots) map.set(teacherKey(slot), slot.teacher)
  return Array.from(map, ([id, label]) => ({ id, label })).sort((a, b) => a.label.localeCompare(b.label, 'id'))
})

const matchesStatus = (slot: TeachingSlot) => {
  if (statusFilter.value === 'submitted') return slot.status === 'submitted'
  if (statusFilter.value === 'missing') return slot.missingInput
  if (statusFilter.value === 'empty') return !slot.sessionId || slot.filled === 0
  return true
}

const visibleSlots = computed(() =>
  teachingStore.slots.filter(
    (slot) =>
      (teacherFilter.value === 'all' || teacherKey(slot) === teacherFilter.value) &&
      matchesStatus(slot)
  )
)

const submittedCount = computed(() => teachingStore.slots.filter((slot) => slot.status === 'submitted').length)
const emptyCount = computed(() => teachingStore.slots.filter((slot) => !slot.sessionId || slot.filled === 0).length)
const missingCount = computed(() => teachingStore.slots.filter((slot) => slot.missingInput).length)

const teacherSummary = computed(() => {
  const map = new Map<string, { key: string; label: string; total: number; submitted: number; empty: number; missing: number }>()
  for (const slot of teachingStore.slots) {
    const key = teacherKey(slot)
    const row = map.get(key) ?? { key, label: slot.teacher, total: 0, submitted: 0, empty: 0, missing: 0 }
    row.total += 1
    if (slot.status === 'submitted') row.submitted += 1
    if (!slot.sessionId || slot.filled === 0) row.empty += 1
    if (slot.missingInput) row.missing += 1
    map.set(key, row)
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'id'))
})

const statusBadge = (slot: TeachingSlot) => {
  if (slot.status === 'submitted') {
    return slot.filled === 0
      ? { label: 'Terkunci · belum diisi', className: 'bg-rose-50 text-rose-700 border border-rose-200' }
      : { label: 'Terkunci', className: 'bg-indigo-50 text-indigo-700 border border-indigo-100' }
  }
  if (slot.unlockedAt) {
    return { label: `Dibuka admin · ${slot.filled}/${slot.total}`, className: 'bg-amber-50 text-amber-700 border border-amber-200' }
  }
  if (slot.complete) {
    return { label: 'Absensi lengkap', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' }
  }
  if (slot.sessionId) {
    return { label: `Tersimpan ${slot.filled}/${slot.total}`, className: 'bg-amber-50 text-amber-700 border border-amber-100' }
  }
  return { label: 'Belum diisi', className: 'bg-slate-100 text-slate-500' }
}

const now = ref(Date.now())
const timer = setInterval(() => {
  now.value = Date.now()
  // Polling ringan memakai timer yang sudah ada; tab tersembunyi tidak memuat data.
  if (!document.hidden) load(true)
}, 30000)
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

const load = (silent = false) => teachingStore.fetchToday(selectedDate.value, silent)

onMounted(() => load())
watch(selectedDate, () => {
  teacherFilter.value = 'all'
  statusFilter.value = 'all'
  actionMessage.value = ''
  load()
})

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
const isReadOnlyMonitoring = computed(() => isMonitoring.value && !isAdmin.value)
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
  if (isReadOnlyMonitoring.value) return
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
  const label = `${slot.subject} (${slot.class}) — ${slot.teacher}`
  if (!window.confirm(`Buka kunci sesi ${label}? Guru dapat mengubah absensi dan nilai lagi.`)) return
  if (!(await teachingStore.unlockSession(slot.sessionId))) return
  actionMessage.value = `Sesi ${label} dibuka kembali.`
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

const canWriteActiveGradebook = computed(
  () => isAdmin.value || teachingStore.assignments.some(
    (item) => item.class === gradeClass.value && item.subject === gradeSubject.value
  )
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
  if (!canWriteActiveGradebook.value) {
    gradeError.value = 'Nilai mapel ini menjadi tanggung jawab guru yang ditugaskan.'
    return
  }
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
