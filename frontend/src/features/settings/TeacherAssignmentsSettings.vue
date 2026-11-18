<template>
  <section class="clean-card p-4 sm:p-6 space-y-5">
    <div>
      <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Penugasan Mengajar</h2>
      <p class="text-xs text-slate-500 mt-1">
        Tentukan mata pelajaran dan kelas yang diampu tiap akun guru. Guru hanya dapat mengisi nilai
        untuk penugasan di bawah ini.
      </p>
    </div>

    <form class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" @submit.prevent="submit">
      <div class="lg:col-span-2">
        <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Akun guru</label>
        <select v-model="form.teacherEmail" class="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
          <option value="">— Pilih akun guru —</option>
          <option v-for="teacher in relationStore.teachers" :key="teacher.id" :value="teacher.email">
            {{ teacher.name }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Mata pelajaran</label>
        <input
          v-model="form.subject"
          list="subject-options"
          placeholder="Contoh: Informatika"
          class="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <datalist id="subject-options">
          <option v-for="subject in subjectOptions" :key="subject" :value="subject" />
        </datalist>
      </div>
      <div>
        <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Kelas</label>
        <input
          v-model="form.class"
          list="class-options"
          placeholder="Contoh: X RPL 1"
          class="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
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
          <tr class="border-b border-line text-[10px] uppercase tracking-widest text-slate-400">
            <th class="py-2 pr-3 font-bold">Guru</th>
            <th class="py-2 pr-3 font-bold">Mapel</th>
            <th class="py-2 pr-3 font-bold">Kelas</th>
            <th class="py-2 text-right font-bold">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="assignment in relationStore.assignments" :key="assignment.id">
            <td class="py-2.5 pr-3">
              <p class="font-bold text-slate-800">{{ assignment.teacher_name }}</p>
              <p class="text-[10px] text-slate-400">{{ assignment.teacher_email }}</p>
            </td>
            <td class="py-2.5 pr-3 font-semibold text-slate-700">{{ assignment.subject }}</td>
            <td class="py-2.5 pr-3 font-semibold text-slate-700">{{ assignment.class }}</td>
            <td class="py-2.5 text-right">
              <button
                type="button"
                class="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                @click="remove(assignment.id)"
              >
                Hapus
              </button>
            </td>
          </tr>
          <tr v-if="relationStore.assignments.length === 0">
            <td colspan="4" class="py-4 text-center text-slate-400">Belum ada penugasan.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import Button from '../../components/ui/Button.vue'
import { useRelationStore } from '../../stores/relation'
import { useScheduleStore } from '../../stores/schedule'
import { useStudentStore } from '../../stores/student'

const relationStore = useRelationStore()
const scheduleStore = useScheduleStore()
const studentStore = useStudentStore()

const form = reactive({ teacherEmail: '', subject: '', class: '' })
const message = ref('')
const messageType = ref<'ok' | 'error'>('ok')

const subjectOptions = computed(() => {
  const fromAssignments = relationStore.assignments.map((a) => a.subject)
  const fromSchedules = scheduleStore.schedules.map((s) => s.subject)
  return Array.from(new Set([...fromAssignments, ...fromSchedules])).sort()
})

const classOptions = computed(() => {
  const fromStudents = studentStore.classes
  const fromSchedules = scheduleStore.schedules.map((s) => s.class)
  return Array.from(new Set([...fromStudents, ...fromSchedules])).sort()
})

const submit = async () => {
  message.value = ''
  if (!form.teacherEmail || !form.subject.trim() || !form.class.trim()) {
    messageType.value = 'error'
    message.value = 'Lengkapi guru, mapel, dan kelas.'
    return
  }

  const success = await relationStore.addAssignment(
    form.teacherEmail,
    form.subject.trim(),
    form.class.trim()
  )
  if (!success) {
    messageType.value = 'error'
    message.value = relationStore.error || 'Gagal menambah penugasan.'
    return
  }

  messageType.value = 'ok'
  message.value = 'Penugasan tersimpan.'
  form.subject = ''
  form.class = ''
}

const remove = async (id: string) => {
  message.value = ''
  if (!confirm('Hapus penugasan ini?')) return
  const success = await relationStore.removeAssignment(id)
  if (!success) {
    messageType.value = 'error'
    message.value = relationStore.error || 'Gagal menghapus penugasan.'
    return
  }
  messageType.value = 'ok'
  message.value = 'Penugasan dihapus.'
}

onMounted(async () => {
  if (relationStore.teachers.length === 0) await relationStore.fetchTeachers()
  await relationStore.fetchAssignments()
  if (scheduleStore.schedules.length === 0) await scheduleStore.fetchSchedules()
  if (studentStore.students.length === 0) await studentStore.fetchStudents()
})
</script>
