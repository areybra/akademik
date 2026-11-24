<template>
  <section class="space-y-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Daftar Akun</h2>
        <p class="text-xs text-slate-500 mt-1">
          Buat akun beserta relasinya dalam satu form. Akun nonaktif tidak bisa login.
        </p>
      </div>
      <Button variant="primary" size="sm" @click="openCreate">Tambah akun</Button>
    </div>

    <div class="clean-card p-4 space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label :for="`${uid}-search`" class="clean-label">Cari</label>
          <input :id="`${uid}-search`" v-model="search" type="text" class="clean-input" placeholder="Nama atau email…" />
        </div>
        <div>
          <label :for="`${uid}-role`" class="clean-label">Role</label>
          <select :id="`${uid}-role`" v-model="roleFilter" class="clean-input appearance-none cursor-pointer">
            <option value="">Semua role</option>
            <option v-for="role in ROLE_OPTIONS" :key="role" :value="role">{{ roleLabel(role) }}</option>
          </select>
        </div>
        <div>
          <label :for="`${uid}-status`" class="clean-label">Status</label>
          <select :id="`${uid}-status`" v-model="statusFilter" class="clean-input appearance-none cursor-pointer">
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
        </div>
      </div>
      <p class="text-[11px] text-slate-400">
        {{ filteredUsers.length }} dari {{ userStore.users.length }} akun ditampilkan.
      </p>
    </div>

    <p
      v-if="message"
      class="rounded-lg px-3 py-2 text-[11px] font-semibold"
      :class="messageType === 'error' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'"
    >
      {{ message }}
    </p>

    <div class="clean-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-line text-[10px] uppercase tracking-widest text-slate-400">
              <th class="px-4 py-2.5 font-bold">Nama</th>
              <th class="px-4 py-2.5 font-bold">Role</th>
              <th class="px-4 py-2.5 font-bold">Relasi</th>
              <th class="px-4 py-2.5 font-bold">Status</th>
              <th class="px-4 py-2.5 text-right font-bold">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line">
            <tr v-for="user in filteredUsers" :key="user.id" class="align-top hover:bg-slate-50/60">
              <td class="px-4 py-3">
                <p class="font-bold text-slate-800">{{ user.name }}</p>
                <p class="text-[10px] text-slate-400 break-all">{{ user.email }}</p>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap items-center gap-1">
                  <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                    {{ roleLabel(user.role) }}
                  </span>
                  <span
                    v-if="extraRoleCount(user) > 0"
                    class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500"
                    :title="extraRoleNames(user)"
                  >
                    +{{ extraRoleCount(user) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 text-[11px] text-slate-600 max-w-[240px]">
                <span class="line-clamp-2">{{ relationLabel(user) }}</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  :class="isActive(user) ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'"
                >
                  {{ isActive(user) ? 'Aktif' : 'Nonaktif' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap justify-end gap-1">
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50"
                    @click="openEdit(user)"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100"
                    @click="openReset(user)"
                  >
                    Reset password
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1 text-[10px] font-bold"
                    :class="isActive(user) ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'"
                    @click="toggleActive(user)"
                  >
                    {{ isActive(user) ? 'Nonaktifkan' : 'Aktifkan' }}
                  </button>
                  <button
                    type="button"
                    class="rounded-lg px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50"
                    @click="removeUser(user)"
                  >
                    Hapus
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredUsers.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-slate-400">
                Tidak ada akun yang cocok dengan filter.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <UserFormModal
      :is-open="modalOpen"
      :user="modalUser"
      :focus-password="focusPassword"
      @close="modalOpen = false"
      @saved="onSaved"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import Button from '../../components/ui/Button.vue'
import UserFormModal from './UserFormModal.vue'
import { useUserStore, type User, type UserDetail } from '../../stores/users'
import { useToastStore } from '../../stores/toastStore'

const ROLE_OPTIONS = [
  'admin',
  'kepala_sekolah',
  'waka',
  'guru',
  'guru_mapel',
  'wali_kelas',
  'kepala_tu',
  'staff_tu',
  'siswa',
  'orang_tua'
]

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  kepala_sekolah: 'Kepala sekolah',
  waka: 'Wakil kepala sekolah',
  guru: 'Guru',
  guru_mapel: 'Guru mapel',
  wali_kelas: 'Wali kelas',
  kepala_tu: 'Kepala TU',
  staff_tu: 'Staff TU',
  siswa: 'Siswa',
  orang_tua: 'Orang tua'
}

const userStore = useUserStore()
const toastStore = useToastStore()
const uid = useId()

const search = ref('')
const roleFilter = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const message = ref('')
const messageType = ref<'ok' | 'error'>('ok')

const modalOpen = ref(false)
const modalUser = ref<UserDetail | null>(null)
const focusPassword = ref(false)

const roleLabel = (role: string) => ROLE_LABELS[role] || role

const rolesOf = (user: User) => (user.roles && user.roles.length > 0 ? user.roles : [user.role])
const isActive = (user: User) => Number(user.active) !== 0
const extraRoleCount = (user: User) => Math.max(0, rolesOf(user).length - 1)
const extraRoleNames = (user: User) => rolesOf(user).slice(1).map(roleLabel).join(', ')

const relationLabel = (user: User) => {
  const parts: string[] = []
  const roles = rolesOf(user)
  if (roles.includes('orang_tua')) parts.push(`Anak: ${user.children || 'belum ditautkan'}`)
  if (roles.includes('siswa')) parts.push(`Siswa: ${user.student_name || 'belum ditautkan'}`)
  if (roles.includes('wali_kelas')) parts.push(`Wali kelas: ${user.class || 'belum diisi'}`)
  if (user.assignments) parts.push(`Mapel: ${user.assignments}`)
  return parts.length > 0 ? parts.join(' · ') : '—'
}

const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase()
  return userStore.users.filter((user) => {
    const matchQuery =
      !query || user.name.toLowerCase().includes(query) || user.email.toLowerCase().includes(query)
    const matchRole = !roleFilter.value || rolesOf(user).includes(roleFilter.value)
    const matchStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'active' ? isActive(user) : !isActive(user))
    return matchQuery && matchRole && matchStatus
  })
})

const setMessage = (text: string, type: 'ok' | 'error') => {
  message.value = text
  messageType.value = type
  if (type === 'error') toastStore.error(text)
  else toastStore.success(text)
}

const openCreate = () => {
  modalUser.value = null
  focusPassword.value = false
  modalOpen.value = true
}

const loadDetail = async (user: User) => {
  const detail = await userStore.fetchUser(user.id)
  if (!detail) {
    setMessage(userStore.error || 'Gagal memuat data akun.', 'error')
    return null
  }
  return detail
}

const openEdit = async (user: User) => {
  const detail = await loadDetail(user)
  if (!detail) return
  modalUser.value = detail
  focusPassword.value = false
  modalOpen.value = true
}

const openReset = async (user: User) => {
  const detail = await loadDetail(user)
  if (!detail) return
  modalUser.value = detail
  focusPassword.value = true
  modalOpen.value = true
}

const onSaved = () => {
  const wasEdit = modalUser.value !== null
  modalOpen.value = false
  setMessage(wasEdit ? 'Akun diperbarui.' : 'Akun berhasil dibuat.', 'ok')
}

const toggleActive = async (user: User) => {
  const nextActive = !isActive(user)
  const question = nextActive
    ? `Aktifkan kembali akun ${user.name}?`
    : `Nonaktifkan akun ${user.name}? Pengguna tidak bisa login sampai diaktifkan lagi.`
  if (!window.confirm(question)) return
  const ok = await userStore.toggleActive(user.id, nextActive)
  if (!ok) {
    setMessage(userStore.error || 'Gagal mengubah status akun.', 'error')
    return
  }
  setMessage(nextActive ? 'Akun diaktifkan.' : 'Akun dinonaktifkan.', 'ok')
}

const removeUser = async (user: User) => {
  const question = `Hapus akun ${user.name} (${user.email})? Relasi dan jadwal terkait ikut dibersihkan. Tindakan ini tidak bisa dibatalkan.`
  if (!window.confirm(question)) return
  const ok = await userStore.deleteUser(user.id)
  if (!ok) {
    setMessage(userStore.error || 'Gagal menghapus akun.', 'error')
    return
  }
  setMessage('Akun dihapus.', 'ok')
}

onMounted(() => {
  userStore.fetchUsers()
})
</script>
