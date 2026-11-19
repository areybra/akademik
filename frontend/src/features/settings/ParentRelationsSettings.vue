<template>
<section class="clean-card p-4 sm:p-6 space-y-5">
  <div>
    <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Tautan Orang Tua &amp; Siswa</h2>
    <p class="text-xs text-slate-500 mt-1">
      Hubungkan akun orang tua dengan anak/siswa yang dimiliki. Orang tua hanya melihat data siswa yang
      tertaut di bawahnya.
    </p>
  </div>

  <form class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" @submit.prevent="submit">
    <div class="lg:col-span-2">
      <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
        Akun orang tua
      </label>
      <select
        v-model="form.parentEmail"
        class="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        <option value="">— Pilih akun orang tua —</option>
        <option v-for="parent in relationStore.parentAccounts" :key="parent.id" :value="parent.email">
          {{ parent.name }} · {{ parent.email }}
        </option>
      </select>
    </div>
    <div class="lg:col-span-2">
      <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
        Siswa
      </label>
      <select
        v-model="form.studentId"
        class="w-full rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        <option value="">— Pilih siswa —</option>
        <option v-for="student in studentStore.students" :key="student.id" :value="student.id">
          {{ student.name }} · {{ student.class }}
        </option>
      </select>
    </div>

    <div class="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3">
      <Button type="submit" variant="primary" size="sm" :disabled="relationStore.loading">
        Tautkan
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
          <th class="py-2 pr-3 font-bold">Orang Tua</th>
          <th class="py-2 pr-3 font-bold">Siswa</th>
          <th class="py-2 text-right font-bold">Aksi</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-line">
        <tr v-for="rel in relationStore.parentRelations" :key="rel.parent_id + '-' + rel.student_id">
          <td class="py-2.5 pr-3">
            <p class="font-bold text-slate-800">{{ rel.parent_name }}</p>
            <p class="text-[10px] text-slate-400">{{ rel.parent_email }}</p>
          </td>
          <td class="py-2.5 pr-3 font-semibold text-slate-700">
            {{ rel.student_name }}
            <span class="text-slate-400 text-xs"> · {{ rel.class }}</span>
          </td>
          <td class="py-2.5 text-right">
            <button
              type="button"
              class="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
              @click="remove(rel.parent_id, rel.student_id)"
            >
              Hapus
            </button>
          </td>
        </tr>
        <tr v-if="relationStore.parentRelations.length === 0">
          <td colspan="3" class="py-4 text-center text-slate-400">Belum ada relasi orang tua–siswa.</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import Button from '../../components/ui/Button.vue'
import { useRelationStore } from '../../stores/relation'
import { useStudentStore } from '../../stores/student'

const relationStore = useRelationStore()
const studentStore = useStudentStore()

const form = reactive({ parentEmail: '', studentId: '' })
const message = ref('')
const messageType = ref<'ok' | 'error'>('ok')

const submit = async () => {
  message.value = ''
  if (!form.parentEmail || !form.studentId) {
    messageType.value = 'error'
    message.value = 'Pilih akun orang tua dan siswa.'
    return
  }

  const success = await relationStore.addParentRelation(form.parentEmail, form.studentId)
  if (!success) {
    messageType.value = 'error'
    message.value = relationStore.error || 'Gagal membuat relasi.'
    return
  }

  messageType.value = 'ok'
  message.value = 'Relasi tersimpan.'
  form.parentEmail = ''
  form.studentId = ''
}

const remove = async (parentId: string, studentId: string) => {
  message.value = ''
  if (!confirm('Hapus relasi orang tua–siswa ini?')) return
  const success = await relationStore.removeParentRelation(parentId, studentId)
  if (!success) {
    messageType.value = 'error'
    message.value = relationStore.error || 'Gagal menghapus relasi.'
    return
  }
  messageType.value = 'ok'
  message.value = 'Relasi dihapus.'
}

onMounted(async () => {
  await relationStore.fetchParentAccounts()
  await relationStore.fetchParents()
  if (studentStore.students.length === 0) await studentStore.fetchStudents()
})
</script>
