<template>
  <Modal
    :is-open="isOpen"
    :title="user ? 'Ubah akun' : 'Tambah akun'"
    :subtitle="user ? 'Kosongkan password bila tidak ingin mengubahnya.' : 'Akun dan relasi disimpan dalam satu langkah.'"
    confirm-text="Simpan"
    size="lg"
    :initial-focus="focusPassword ? `#${uid}-password` : `#${uid}-name`"
    @close="emit('close')"
    @confirm="submit"
  >
    <div class="space-y-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label :for="`${uid}-name`" class="clean-label">Nama lengkap</label>
          <input :id="`${uid}-name`" v-model="form.name" type="text" class="clean-input" placeholder="Nama pengguna" />
        </div>
        <div>
          <label :for="`${uid}-email`" class="clean-label">Email</label>
          <input :id="`${uid}-email`" v-model="form.email" type="email" class="clean-input" placeholder="nama@sekolah.id" />
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label :for="`${uid}-role`" class="clean-label">Role utama</label>
          <select :id="`${uid}-role`" v-model="form.role" class="clean-input appearance-none cursor-pointer">
            <option v-for="option in ROLE_OPTIONS" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>
        <div>
          <label :for="`${uid}-password`" class="clean-label">Password</label>
          <input
            :id="`${uid}-password`"
            v-model="form.password"
            type="password"
            class="clean-input"
            :placeholder="user ? 'Kosongkan bila tidak diubah' : 'Minimal 6 karakter'"
            autocomplete="new-password"
          />
        </div>
      </div>

      <div role="group" :aria-labelledby="`${uid}-extra-roles`">
        <span :id="`${uid}-extra-roles`" class="clean-label">Role tambahan</span>
        <div class="flex flex-wrap gap-3">
          <label
            v-for="role in EXTRA_ROLES"
            v-show="form.role !== role.value"
            :key="role.value"
            class="inline-flex items-center gap-2 rounded-xl border border-line bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <input v-model="form.extraRoles" type="checkbox" name="extraRoles" :value="role.value" class="accent-indigo-600" />
            {{ role.label }}
          </label>
          <span v-if="form.role === 'guru'" class="text-[11px] text-slate-400 self-center">
            Role utama sudah guru.
          </span>
        </div>
      </div>

      <!-- Siswa -->
      <div v-if="needsStudent" class="rounded-xl border border-line bg-slate-50/60 p-3 space-y-2">
        <label :for="`${uid}-student`" class="clean-label">Siswa yang ditautkan</label>
        <input :id="`${uid}-student-query`" v-model="form.studentQuery" type="text" class="clean-input" placeholder="Cari nama siswa…" />
        <select :id="`${uid}-student`" v-model="form.studentId" class="clean-input appearance-none cursor-pointer">
          <option value="">— Pilih siswa —</option>
          <option v-for="student in studentOptions" :key="student.id" :value="student.id">
            {{ student.name }} · {{ student.class }}
          </option>
        </select>
      </div>

      <!-- Orang tua -->
      <div v-if="needsParent" role="group" :aria-labelledby="`${uid}-children`" class="rounded-xl border border-line bg-slate-50/60 p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span :id="`${uid}-children`" class="clean-label mb-0">Anak / siswa</span>
          <span class="text-[11px] font-semibold text-slate-500">{{ form.parentStudentIds.length }} dipilih</span>
        </div>
        <input :id="`${uid}-child-query`" v-model="form.childQuery" type="text" class="clean-input" placeholder="Cari nama siswa…" aria-label="Cari nama siswa" />
        <div class="max-h-44 overflow-y-auto rounded-lg border border-line bg-panel divide-y divide-line">
          <label
            v-for="student in filteredStudents"
            :key="student.id"
            class="flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
          >
            <input v-model="form.parentStudentIds" type="checkbox" name="parentStudentIds" :value="student.id" class="accent-indigo-600" />
            <span class="min-w-0 flex-1 truncate">{{ student.name }}</span>
            <span class="text-[10px] text-slate-400">{{ student.class }}</span>
          </label>
          <p v-if="filteredStudents.length === 0" class="px-3 py-3 text-xs text-slate-400">
            Siswa tidak ditemukan.
          </p>
        </div>
      </div>

      <!-- Guru / guru mapel -->
      <div v-if="isTeacherRole" role="group" :aria-labelledby="`${uid}-assignments`" class="rounded-xl border border-line bg-slate-50/60 p-3 space-y-2">
        <div class="flex items-center justify-between gap-2">
          <span :id="`${uid}-assignments`" class="clean-label mb-0">Mapel &amp; kelas yang diampu</span>
          <button type="button" class="text-[11px] font-bold text-indigo-600 hover:underline" @click="addAssignment">
            + Tambah baris
          </button>
        </div>
        <div v-for="(row, index) in form.assignments" :key="`assign-${index}`" class="flex flex-col sm:flex-row gap-2">
          <input :id="`${uid}-assign-${index}-subject`" v-model="row.subject" list="ufm-subjects" type="text" class="clean-input flex-1" placeholder="Mapel" aria-label="Mata pelajaran" />
          <input :id="`${uid}-assign-${index}-class`" v-model="row.class" list="ufm-classes" type="text" class="clean-input flex-1" placeholder="Kelas" aria-label="Kelas" />
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
            @click="removeAssignment(index)"
          >
            Hapus
          </button>
        </div>
        <p v-if="form.assignments.length === 0" class="text-xs text-slate-400">Belum ada penugasan.</p>
      </div>

      <!-- Wali kelas -->
      <div v-if="needsWali" class="rounded-xl border border-line bg-slate-50/60 p-3">
        <label :for="`${uid}-class`" class="clean-label">Kelas wali</label>
        <input :id="`${uid}-class`" v-model="form.className" list="ufm-classes" type="text" class="clean-input" placeholder="Contoh: X RPL 1" />
      </div>

      <datalist id="ufm-subjects">
        <option v-for="subject in subjectOptions" :key="subject" :value="subject" />
      </datalist>
      <datalist id="ufm-classes">
        <option v-for="className in classOptions" :key="className" :value="className" />
      </datalist>

      <p v-if="error" class="rounded-lg bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-700">{{ error }}</p>
      <p v-if="user" class="text-[11px] text-slate-400">
        Perubahan role atau kelas baru berlaku setelah pengguna login ulang. Relasi langsung berlaku.
      </p>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue'
import Modal from '../../components/ui/Modal.vue'
import { useUserStore, type UserDetail, type UserForm } from '../../stores/users'
import { useStudentStore } from '../../stores/student'
import { useScheduleStore } from '../../stores/schedule'

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'kepala_sekolah', label: 'Kepala sekolah' },
  { value: 'waka', label: 'Wakil kepala sekolah' },
  { value: 'guru', label: 'Guru' },
  { value: 'guru_mapel', label: 'Guru mapel' },
  { value: 'wali_kelas', label: 'Wali kelas' },
  { value: 'kepala_tu', label: 'Kepala TU' },
  { value: 'staff_tu', label: 'Staff TU' },
  { value: 'siswa', label: 'Siswa' },
  { value: 'orang_tua', label: 'Orang tua / wali' }
]

const EXTRA_ROLES = [
  { value: 'guru', label: 'Guru' },
  { value: 'guru_mapel', label: 'Guru mapel' },
  { value: 'wali_kelas', label: 'Wali kelas' }
]

const props = withDefaults(
  defineProps<{
    isOpen: boolean
    user: UserDetail | null
    focusPassword?: boolean
  }>(),
  { focusPassword: false }
)

const emit = defineEmits(['close', 'saved'])

const userStore = useUserStore()
const studentStore = useStudentStore()
const scheduleStore = useScheduleStore()

const form = reactive({
  name: '',
  email: '',
  password: '',
  role: 'orang_tua',
  extraRoles: [] as string[],
  className: '',
  studentId: '',
  parentStudentIds: [] as string[],
  assignments: [] as Array<{ subject: string; class: string }>,
  studentQuery: '',
  childQuery: ''
})

const error = ref('')
const saving = ref(false)
const uid = useId()

const activeRoles = computed(() => {
  const roles = [form.role]
  for (const role of form.extraRoles) {
    if (!roles.includes(role)) roles.push(role)
  }
  return roles
})

const needsStudent = computed(() => activeRoles.value.includes('siswa'))
const needsParent = computed(() => activeRoles.value.includes('orang_tua'))
const needsWali = computed(() => activeRoles.value.includes('wali_kelas'))
const isTeacherRole = computed(
  () => activeRoles.value.includes('guru') || activeRoles.value.includes('guru_mapel')
)

const filteredStudents = computed(() => {
  const query = form.childQuery.trim().toLowerCase()
  if (!query) return studentStore.students
  return studentStore.students.filter(
    (student) =>
      student.name.toLowerCase().includes(query) ||
      student.class.toLowerCase().includes(query) ||
      student.niup.toLowerCase().includes(query)
  )
})

const studentOptions = computed(() => {
  const query = form.studentQuery.trim().toLowerCase()
  const base = query
    ? studentStore.students.filter(
        (student) =>
          student.name.toLowerCase().includes(query) ||
          student.class.toLowerCase().includes(query) ||
          student.niup.toLowerCase().includes(query)
      )
    : studentStore.students
  if (form.studentId && !base.some((student) => student.id === form.studentId)) {
    const current = studentStore.students.find((student) => student.id === form.studentId)
    if (current) return [current, ...base]
  }
  return base
})

const subjectOptions = computed(() => {
  const set = new Set<string>()
  for (const schedule of scheduleStore.schedules) set.add(schedule.subject)
  for (const row of form.assignments) if (row.subject.trim()) set.add(row.subject.trim())
  return Array.from(set).filter(Boolean).sort()
})

const classOptions = computed(() => {
  const set = new Set<string>(studentStore.classes)
  for (const schedule of scheduleStore.schedules) set.add(schedule.class)
  for (const row of form.assignments) if (row.class.trim()) set.add(row.class.trim())
  return Array.from(set).filter(Boolean).sort()
})

const resetForm = () => {
  form.name = ''
  form.email = ''
  form.password = ''
  form.role = 'orang_tua'
  form.extraRoles = []
  form.className = ''
  form.studentId = ''
  form.parentStudentIds = []
  form.assignments = []
  form.studentQuery = ''
  form.childQuery = ''
  error.value = ''
}

const initForm = () => {
  resetForm()
  const detail = props.user
  if (!detail) return
  form.name = detail.name
  form.email = detail.email
  form.role = detail.role
  form.extraRoles = detail.roles.filter(
    (role) => role !== detail.role && EXTRA_ROLES.some((option) => option.value === role)
  )
  form.className = detail.class || ''
  form.studentId = detail.student_id || ''
  form.parentStudentIds = [...detail.parentStudentIds]
  form.assignments = detail.assignments.map((item) => ({ subject: item.subject, class: item.class }))
}

watch(
  () => props.isOpen,
  async (open) => {
    if (!open) return
    initForm()
    if (studentStore.students.length === 0) await studentStore.fetchStudents()
    if (scheduleStore.schedules.length === 0) await scheduleStore.fetchSchedules()
    if (isTeacherRole.value && form.assignments.length === 0) addAssignment()
  }
)

watch(
  () => form.role,
  (role) => {
    form.extraRoles = form.extraRoles.filter((item) => item !== role)
    if (isTeacherRole.value && form.assignments.length === 0) addAssignment()
  }
)

watch(activeRoles, () => {
  if (isTeacherRole.value && form.assignments.length === 0) addAssignment()
})

const addAssignment = () => {
  form.assignments.push({ subject: '', class: '' })
}

const removeAssignment = (index: number) => {
  form.assignments.splice(index, 1)
}

const validate = () => {
  if (form.name.trim().length < 2) return 'Nama wajib diisi minimal 2 karakter.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Format email tidak valid.'
  if (!props.user && form.password.length < 6) return 'Password minimal 6 karakter.'
  if (props.user && form.password.length > 0 && form.password.length < 6) return 'Password minimal 6 karakter.'
  if (needsStudent.value && !form.studentId) return 'Pilih siswa untuk akun siswa.'
  if (needsParent.value && form.parentStudentIds.length === 0) return 'Pilih minimal satu anak untuk akun orang tua.'
  if (needsWali.value && !form.className.trim()) return 'Isi kelas untuk akun wali kelas.'
  if (
    isTeacherRole.value &&
    !form.assignments.some((row) => row.subject.trim() && row.class.trim())
  ) {
    return 'Isi minimal satu mapel dan kelas untuk akun guru.'
  }
  return ''
}

const buildPayload = (): UserForm => {
  const payload: UserForm = {
    name: form.name.trim(),
    email: form.email.trim().toLowerCase(),
    role: form.role,
    roles: activeRoles.value,
    class: needsWali.value ? form.className.trim() || null : null,
    studentId: needsStudent.value ? form.studentId : null,
    parentStudentIds: needsParent.value ? [...form.parentStudentIds] : [],
    assignments: isTeacherRole.value
      ? form.assignments
          .map((row) => ({ subject: row.subject.trim(), class: row.class.trim() }))
          .filter((row) => row.subject && row.class)
      : []
  }
  if (form.password.length > 0) payload.password = form.password
  return payload
}

const submit = async () => {
  if (saving.value) return
  error.value = ''
  const message = validate()
  if (message) {
    error.value = message
    return
  }
  saving.value = true
  const payload = buildPayload()
  const ok = props.user
    ? await userStore.updateUser(props.user.id, payload)
    : await userStore.createUser(payload)
  saving.value = false
  if (!ok) {
    error.value = userStore.error || 'Gagal menyimpan akun.'
    return
  }
  emit('saved')
}
</script>
