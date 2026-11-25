<template>
  <section class="clean-card p-4 sm:p-6 space-y-5">
    <div>
      <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Penugasan Mengajar</h2>
      <p class="text-xs text-slate-500 mt-1">
        Satu mapel di satu kelas diampu satu guru. Pilihan mapel mengikuti kemampuan yang tercatat
        di Data Guru. Mengganti guru akan memindahkan seluruh jadwal mapel dan kelas tersebut.
      </p>
    </div>

    <form class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" @submit.prevent="submit">
      <div class="lg:col-span-2">
        <label :for="uid + '-teacher'" class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Akun guru</label>
        <select :id="uid + '-teacher'" v-model="form.teacherEmail" class="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">- Pilih akun guru -</option>
          <option v-for="teacher in relationStore.teachers" :key="teacher.id" :value="teacher.email">
            {{ teacher.name }}
          </option>
        </select>
      </div>
      <div>
        <label :for="uid + '-subject'" class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Mata pelajaran</label>
        <select
          :id="uid + '-subject'"
          v-model="form.subject"
          :disabled="!form.teacherEmail || subjectOptions.length === 0"
          class="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="">
            {{ form.teacherEmail ? (subjectOptions.length === 0 ? 'Belum ada mapel di Data Guru' : '- Pilih mapel -') : '- Pilih guru dulu -' }}
          </option>
          <option v-for="subject in subjectOptions" :key="subject" :value="subject">{{ subject }}</option>
        </select>
      </div>
      <div>
        <label :for="uid + '-class'" class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Kelas</label>
        <input
          :id="uid + '-class'"
          v-model="form.class"
          list="class-options"
          placeholder="Contoh: X RPL 1"
          class="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <datalist id="class-options">
          <option v-for="c in classOptions" :key="c" :value="c" />
        </datalist>
      </div>

      <div class="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" size="sm" :disabled="relationStore.loading">
          Tambah Penugasan
        </Button>
        <p v-if="message" class="text-[11px] font-semibold" :class="messageType === 'error' ? 'text-rose-600' : 'text-emerald-600'">
          {{ message }}
        </p>
      </div>
    </form>

    <div class="overflow-x-auto">
      <table class="w-full text-left text-xs">
        <thead>
          <tr class="border-b border-line text-[10px] uppercase tracking-widest text-slate-500">
            <th class="py-2 pr-3 font-bold">Kelas</th>
            <th class="py-2 pr-3 font-bold">Mapel</th>
            <th class="py-2 pr-3 font-bold">Guru penanggung jawab</th>
            <th class="py-2 text-right font-bold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="assignment in relationStore.assignments" :key="assignment.id">
            <td class="py-2.5 pr-3 font-semibold text-slate-700">{{ assignment.class }}</td>
            <td class="py-2.5 pr-3 font-semibold text-slate-700">{{ assignment.subject }}</td>
            <td class="py-2.5 pr-3">
              <select
                :value="assignment.teacher_email"
                :disabled="relationStore.loading"
                class="w-full min-w-[13rem] min-h-[44px] rounded-lg border border-line bg-panel px-2 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                :aria-label="`Guru pengampu ${assignment.subject} di ${assignment.class}`"
                @change="move(assignment, ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="teacher in teachersFor(assignment.subject, assignment.teacher_email)" :key="teacher.email" :value="teacher.email">
                  {{ teacher.name }}
                </option>
              </select>
            </td>
            <td class="py-2.5 text-right">
              <button
                type="button"
                class="min-h-[44px] rounded-lg px-3 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                :disabled="relationStore.loading"
                @click="remove(assignment)"
              >
                Hapus
              </button>
            </td>
          </tr>
          <tr v-if="relationStore.assignments.length === 0">
            <td colspan="4" class="py-4 text-center text-slate-500">Belum ada penugasan.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId } from 'vue'
import Button from '../../components/ui/Button.vue'
import { useRelationStore, type TeacherAssignment } from '../../stores/relation'
import { useScheduleStore } from '../../stores/schedule'
import { useStudentStore } from '../../stores/student'

const uid = useId()
const relationStore = useRelationStore()
const scheduleStore = useScheduleStore()
const studentStore = useStudentStore()

const form = reactive({ teacherEmail: '', subject: '', class: '' })
const message = ref('')
const messageType = ref<'ok' | 'error'>('ok')

const subjectsByEmail = computed(() => {
  const map = new Map<string, string[]>()
  for (const row of relationStore.teacherDirectory) {
    if (row.account_email) map.set(row.account_email.toLowerCase(), row.subjects || [])
  }
  return map
})

const subjectOptions = computed(() => {
  if (!form.teacherEmail) return []
  return [...(subjectsByEmail.value.get(form.teacherEmail.toLowerCase()) || [])].sort((a, b) => a.localeCompare(b, 'id'))
})

const classOptions = computed(() => {
  const fromStudents = studentStore.classes
  const fromAssignments = relationStore.assignments.map((a) => a.class)
  const fromSchedules = scheduleStore.schedules.map((s) => s.class)
  return Array.from(new Set([...fromStudents, ...fromAssignments, ...fromSchedules])).sort()
})

// Guru yang boleh dipilih untuk satu mapel: hanya yang mencantumkan mapel itu di Data Guru.
const teachersFor = (subject: string, currentEmail: string) => {
  const target = subject.trim().toLowerCase()
  const capable = relationStore.teacherDirectory
    .filter((row) => row.account_email && row.subjects.some((item) => item.trim().toLowerCase() === target))
    .map((row) => ({
      email: row.account_email as string,
      name: row.account_name || row.name
    }))
  if (!capable.some((item) => item.email.toLowerCase() === currentEmail.toLowerCase())) {
    capable.unshift({ email: currentEmail, name: `${currentEmail} (tidak tercatat mampu)` })
  }
  return capable
}

const submit = async () => {
  message.value = ''
  if (!form.teacherEmail || !form.subject || !form.class.trim()) {
    messageType.value = 'error'
    message.value = 'Lengkapi guru, mapel, dan kelas.'
    return
  }

  const success = await relationStore.addAssignment(form.teacherEmail, form.subject, form.class.trim())
  if (!success) {
    messageType.value = 'error'
    message.value = relationStore.error || 'Gagal menambah penugasan.'
    return
  }

  messageType.value = 'ok'
  message.value = 'Penugasan tersimpan.'
  form.subject = ''
  form.class = ''
  await scheduleStore.fetchSchedules()
}

const move = async (assignment: TeacherAssignment, teacherEmail: string) => {
  message.value = ''
  if (teacherEmail === assignment.teacher_email) return
  const target = relationStore.teacherDirectory.find((row) => row.account_email?.toLowerCase() === teacherEmail.toLowerCase())
  const ok = confirm(
    `Pindahkan ${assignment.subject} di ${assignment.class} ke ${target?.account_name || teacherEmail}? Seluruh jadwal mapel ini ikut pindah, nilai siswa tidak berubah.`
  )
  if (!ok) {
    await relationStore.fetchAssignments()
    return
  }
  const success = await relationStore.moveAssignment(assignment.id, teacherEmail)
  if (!success) {
    messageType.value = 'error'
    message.value = relationStore.error || 'Gagal memindahkan penugasan.'
    await relationStore.fetchAssignments()
    return
  }
  messageType.value = 'ok'
  message.value = 'Guru penanggung jawab diperbarui dan jadwal diselaraskan.'
  await scheduleStore.fetchSchedules()
}

const remove = async (assignment: TeacherAssignment) => {
  message.value = ''
  const label = `${assignment.subject} di ${assignment.class}`
  if (!confirm(`Hapus penugasan ${label}?`)) return

  let success = await relationStore.removeAssignment(assignment.id)
  if (!success && /jadwal/i.test(relationStore.error || '')) {
    const force = confirm(`${relationStore.error}\n\nHapus penugasan ini beserta seluruh jadwalnya?`)
    if (force) success = await relationStore.removeAssignment(assignment.id, true)
  }

  if (!success) {
    messageType.value = 'error'
    message.value = relationStore.error || 'Gagal menghapus penugasan.'
    return
  }
  messageType.value = 'ok'
  message.value = 'Penugasan dihapus.'
  await scheduleStore.fetchSchedules()
}

onMounted(async () => {
  if (relationStore.teachers.length === 0) await relationStore.fetchTeachers()
  await relationStore.fetchAssignments()
  await relationStore.fetchTeacherDirectory()
  if (scheduleStore.schedules.length === 0) await scheduleStore.fetchSchedules()
  if (studentStore.students.length === 0) await studentStore.fetchStudents()
})
</script>
