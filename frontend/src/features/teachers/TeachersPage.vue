<template>
  <div class="space-y-6 pb-20">
    <!-- Page Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-xl font-bold text-slate-900 tracking-tight">Manajemen Guru</h1>
        <p class="text-sm text-slate-500 mt-0.5">Kelola data tenaga pendidik dan bidang studi mereka.</p>
      </div>
      <div v-if="isAdmin" class="flex gap-2">
        <Button variant="secondary" @click="openImportModal">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Impor Data
        </Button>
        <Button variant="primary" @click="openAddModal">
          <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Tambah Guru
        </Button>
      </div>
    </div>

    <!-- Filters Bar -->
    <div class="clean-card p-4 sm:p-6 flex flex-col lg:flex-row lg:items-end gap-4 sm:gap-6">
      <div class="flex-1">
        <Input
          v-model="searchQuery"
          label="Cari Guru"
          placeholder="Nama, NIUP, atau Mata Pelajaran..."
        />
      </div>
      <div class="w-full lg:w-64">
        <label class="clean-label">Mata Pelajaran</label>
        <select 
          v-model="filterSubject"
          class="clean-input appearance-none cursor-pointer"
        >
          <option value="">Semua Mata Pelajaran</option>
          <option v-for="s in uniqueSubjects" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div class="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
        <button 
          @click="viewMode = 'table'"
          class="p-2 rounded-md transition-all"
          :class="viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        <button 
          @click="viewMode = 'grid'"
          class="p-2 rounded-md transition-all"
          :class="viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Data Display -->
    <div v-if="filteredTeachers.length === 0" class="clean-card p-8 sm:p-12 text-center">
      <p class="text-slate-500 font-medium">Tidak ada data guru yang sesuai.</p>
    </div>

    <div v-else-if="viewMode === 'table'" class="clean-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-200">
              <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Nama Guru</th>
              <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Identitas / NIUP</th>
              <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider text-[10px] text-center">L/P</th>
              <th class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider text-[10px]">Spesialisasi</th>
              <th v-if="isAdmin" class="px-6 py-4 font-bold text-slate-700 uppercase tracking-wider text-[10px] text-right">Opsi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="teacher in filteredTeachers" :key="teacher.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-6 py-4">
                <span class="font-semibold text-slate-900">{{ teacher.name }}</span>
              </td>
              <td class="px-6 py-4 text-slate-600 font-medium">{{ teacher.niup }}</td>
              <td class="px-6 py-4 text-center">
                <span class="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black border border-slate-200">{{ teacher.gender }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="s in teacher.subjects" :key="s" class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{{ s }}</span>
                </div>
              </td>
              <td v-if="isAdmin" class="px-6 py-4 text-right">
                <div class="flex justify-end gap-1">
                  <button @click="openEditModal(teacher)" class="p-2 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button @click="deleteTeacher(teacher.id)" class="p-2 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

    <!-- Grid Mode -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      <div v-for="teacher in filteredTeachers" :key="teacher.id" class="clean-card p-4 sm:p-6 group">
        <div class="flex justify-end mb-4">
          <div v-if="isAdmin" class="flex gap-1">
            <button @click="openEditModal(teacher)" class="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
            <button @click="deleteTeacher(teacher.id)" class="p-2 text-slate-400 hover:text-rose-600 transition-colors"><svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
          </div>
        </div>
        <h3 class="font-bold text-slate-900 truncate">{{ teacher.name }}</h3>
        <p class="text-xs text-slate-500 mt-0.5 truncate">NIUP: {{ teacher.niup }}</p>
        <div class="flex flex-wrap gap-1.5 mt-4">
          <span v-for="s in teacher.subjects" :key="s" class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase">{{ s }}</span>
        </div>
        <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
          <div class="flex items-center gap-1.5">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span class="text-[10px] font-bold text-slate-500 uppercase">Aktif</span>
          </div>
          <button class="text-[10px] font-bold text-indigo-600 uppercase hover:underline py-1.5 -my-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">Detail Profil</button>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <Modal
      :is-open="showModal"
      :title="editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'"
      subtitle="Pastikan data yang dimasukkan sesuai dengan dokumen resmi."
      confirm-text="Simpan Data"
      @close="closeModal"
      @confirm="saveTeacher"
    >
      <div class="space-y-4">
        <Input v-model="formData.name" label="Nama Lengkap" placeholder="Masukkan nama dan gelar" />
        <div class="grid grid-cols-2 gap-4">
          <Input v-model="formData.niup" label="NIUP" placeholder="Nomor Induk Unit Pendidikan" />
          <div>
            <label class="clean-label">Jenis Kelamin</label>
            <select v-model="formData.gender" class="clean-input appearance-none cursor-pointer">
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
        </div>
        <Input v-model="subjectsInput" label="Mata Pelajaran" placeholder="Gunakan koma sebagai pemisah" />
        <Input v-model="classesInput" label="Daftar Kelas" placeholder="Contoh: X RPL 1, XI TKJ 2" />
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="clean-label">NIP</label>
            <Input v-model="formData.nip" type="text" placeholder="Nomor Induk Pendidik" />
          </div>
          <div>
            <label class="clean-label">Pangkat</label>
            <Input v-model="formData.pangkat" type="text" placeholder="Contoh: SE, S.Pd, M.Pd" />
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="clean-label">Pendidikan Terakhir</label>
            <Input v-model="formData.pendidikan" type="text" placeholder="Contoh: S1, S2, Magister" />
          </div>
          <div>
            <label class="clean-label">Foto Guru</label>
            <div class="flex items-center gap-2">
              <!-- Tombol pilih file -->
              <button
                type="button"
                id="foto-guru-btn"
                class="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
              >
                <svg class="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 6h16m10 0v6a2 2 0 01-2 2H8a2 2 0 01-2-2v-6m12 0v6a2 2 0 01-2 2H10a2 2 0 01-2-2v-6" />
                </svg>
                Pilih Foto
              </button>
              <!-- Input file tersembunyi -->
              <input
                type="file"
                id="foto-guru-input"
                accept="image/*"
                class="hidden"
                @change="handleFotoGuruChange"
              />
            </div>
            <!-- Preview foto jika ada -->
            <div v-if="formData.foto_guru" class="ml-4 flex items-center gap-2">
              <img
                :src="'/uploads/' + formData.foto_guru"
                alt="Preview Foto"
                class="w-10 h-10 rounded-lg object-cover"
              />
              <span class="text-xs text-indigo-600">{{ formData.foto_guru }}</span>
            </div>
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="clean-label">Provinsi</label>
            <select v-model="formData.provinsi" class="clean-input appearance-none cursor-pointer">
              <option value="Indonesia">Indonesia</option>
            </select>
          </div>
          <div>
            <label class="clean-label">Kabupaten/Kota</label>
            <Input v-model="formData.kabupaten" type="text" placeholder="Kabupaten/Kota" />
          </div>
        </div>
        
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="clean-label">Kecamatan</label>
            <Input v-model="formData.kecamatan" type="text" placeholder="Kecamatan" />
          </div>
          <div>
            <label class="clean-label">Negara</label>
            <select v-model="formData.negara" class="clean-input appearance-none cursor-pointer">
              <option value="Indonesia">Indonesia</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>

    <!-- Import Modal -->
    <Modal
      :is-open="showImportModal"
      title="Impor Data Guru Masal"
      subtitle="Ikuti 3 langkah berikut: baca petunjuk, unduh template CSV, lalu unggah file."
      confirm-text="Konfirmasi Import"
      @close="closeImportModal"
      @confirm="processImport"
    >
      <div class="space-y-5">
        <!-- STEP 1: Keterangan (paling atas) -->
        <div class="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
          <div class="flex items-center gap-2 mb-3">
            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-black">1</span>
            <p class="text-sm font-black text-amber-900">Petunjuk Pengisian</p>
          </div>
          <ol class="text-xs text-amber-800 leading-relaxed space-y-1 list-decimal list-inside">
            <li>Unduh template <strong>CSV</strong> dengan tombol pada langkah 2</li>
            <li>Buka file dengan Excel atau Google Sheets</li>
            <li>Isi setiap kolom, lalu simpan kembali sebagai <strong>.csv</strong></li>
            <li>Unggah file CSV melalui form pada langkah 3</li>
          </ol>
          <div class="mt-3 pt-3 border-t border-amber-200/60">
            <p class="text-[11px] font-bold text-amber-900/70 mb-1">Urutan kolom:</p>
            <p class="text-[11px] text-amber-700 font-mono leading-relaxed break-words">
              Nama, NIUP, NIP, Pangkat, Pendidikan, Gender (L/P), Mata Pelajaran, Kelas, Foto, Provinsi, Kabupaten, Kecamatan, Negara
            </p>
          </div>
        </div>

        <!-- STEP 2: Unduh Template CSV (tengah) -->
        <div class="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
          <div class="flex items-center gap-2 mb-3">
            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black">2</span>
            <p class="text-sm font-black text-emerald-900">Unduh Template CSV</p>
          </div>
          <Button variant="secondary" size="sm" class="w-full" @click="downloadTemplate">
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Unduh Template (.csv)
          </Button>
          <p class="text-[11px] text-emerald-700/70 mt-2">File yang diunduh: <strong>teachers_sample.csv</strong></p>
        </div>

        <!-- STEP 3: Unggah File (paling bawah) -->
        <div class="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
          <div class="flex items-center gap-2 mb-3">
            <span class="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black">3</span>
            <p class="text-sm font-black text-indigo-900">Unggah File CSV</p>
          </div>
          <input
            ref="csvFileInput"
            type="file"
            accept=".csv,text/csv"
            @change="onFileChange"
            class="block w-full text-sm text-surface-700 bg-white rounded-xl border border-indigo-200 cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
          />
          <p class="text-[11px] text-indigo-700/70 mt-2">
            Pilih file berformat <strong>.csv</strong> hasil pengisian template di atas.
          </p>
        </div>

        <!-- Pratinjau setelah upload -->
        <div v-if="importPreview.length > 0" class="space-y-3">
          <div class="flex items-center justify-between px-1">
            <p class="text-[11px] font-black text-surface-500 uppercase tracking-widest">Pratinjau ({{ importPreview.length }} Guru)</p>
            <button class="text-[11px] font-bold text-rose-500 hover:underline" @click="clearPreview">Hapus</button>
          </div>
          <div class="max-h-48 overflow-y-auto border border-surface-200 rounded-xl divide-y divide-surface-100">
            <div v-for="(p, i) in importPreview" :key="i" class="px-4 py-2 text-[11px] flex justify-between items-center">
              <span class="font-bold text-surface-900">{{ p.name }}</span>
              <span class="text-surface-500">{{ p.niup }} | {{ p.nip }} | {{ p.pangkat }}</span>
            </div>
          </div>
        </div>

        <!-- Tombol konfirmasi -->
        <div v-if="importPreview.length > 0" class="pt-4 border-t border-surface-200">
          <Button variant="primary" class="w-full" @click="processImport">
            <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Konfirmasi Import ({{ importPreview.length }} guru)
          </Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useTeacherStore } from '../../stores/teacher'
import type { Teacher } from '../../types'
import Button from '../../components/ui/Button.vue'
import Modal from '../../components/ui/Modal.vue'
import Input from '../../components/ui/Input.vue'

const authStore = useAuthStore()
const teacherStore = useTeacherStore()
const isAdmin = computed(() => authStore.hasAnyRole(['admin']))

onMounted(async () => {
  if (teacherStore.teachers.length === 0) {
    await teacherStore.fetchTeachers()
  }
})

const searchQuery = ref('')
const filterSubject = ref('')
const viewMode = ref<'table' | 'grid'>('table')

const uniqueSubjects = computed(() => {
  const subs = new Set<string>()
  teacherStore.teachers.forEach(t => {
    if (t.subjects && Array.isArray(t.subjects)) {
      t.subjects.forEach(s => subs.add(s))
    }
  })
  return Array.from(subs).sort()
})

const filteredTeachers = computed(() => {
  return teacherStore.teachers.filter(t => {
    const matchesSearch = !searchQuery.value || 
      t.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
      t.niup.includes(searchQuery.value) ||
      (t.subjects && Array.isArray(t.subjects) && t.subjects.some(s => s.toLowerCase().includes(searchQuery.value.toLowerCase())))
    const matchesSubject = !filterSubject.value || (t.subjects && Array.isArray(t.subjects) && t.subjects.includes(filterSubject.value))
    return matchesSearch && matchesSubject
  })
})

const showModal = ref(false)
const editingTeacher = ref<Teacher | null>(null)
const classesInput = ref('')
const subjectsInput = ref('')
const formData = reactive({ 
  name: '', 
  niup: '', 
  nip: '', 
  pangkat: '', 
  pendidikan: '', 
  gender: 'L' as 'L' | 'P',
  foto_guru: '',
  provinsi: 'Indonesia',
  kabupaten: '',
  kecamatan: '',
  negara: 'Indonesia'
})

// Import State
const showImportModal = ref(false)
const importPreview = ref<Teacher[]>([])
const csvFileInput = ref<HTMLInputElement | null>(null)

const openAddModal = () => {
  editingTeacher.value = null
  formData.name = ''; formData.niup = ''; formData.gender = 'L';
  classesInput.value = ''; subjectsInput.value = '';
  showModal.value = true
}

const openEditModal = (teacher: Teacher) => {
  editingTeacher.value = teacher
  formData.name = teacher.name; formData.niup = teacher.niup; formData.gender = teacher.gender;
  classesInput.value = (teacher.classes || []).join(', '); 
  subjectsInput.value = (teacher.subjects || []).join(', ');
  showModal.value = true
}

const closeModal = () => { showModal.value = false }

const saveTeacher = async () => {
  const tClasses = classesInput.value.split(',').map(c => c.trim()).filter(c => c !== '')
  const tSubjects = subjectsInput.value.split(',').map(s => s.trim()).filter(s => s !== '')
  
  let success = false
  if (editingTeacher.value) {
    success = await teacherStore.updateTeacher(editingTeacher.value.id, { 
      ...formData, 
      classes: tClasses, 
      subjects: tSubjects 
    })
  } else {
    success = await teacherStore.addTeacher({ 
      ...formData, 
      classes: tClasses, 
      subjects: tSubjects 
    })
  }

  if (success) {
    closeModal()
  } else {
    alert(`Gagal menyimpan data guru: ${teacherStore.error}`)
  }
}

const deleteTeacher = async (id: string) => {
  if (confirm('Hapus data guru ini?')) {
    const success = await teacherStore.deleteTeacher(id)
    if (!success) {
      alert(`Gagal menghapus guru: ${teacherStore.error}`)
    }
  }
}

const openImportModal = () => {
  importPreview.value = []
  if (csvFileInput.value) csvFileInput.value.value = ''
  showImportModal.value = true
}

const closeImportModal = () => {
  showImportModal.value = false
  importPreview.value = []
  if (csvFileInput.value) csvFileInput.value.value = ''
}

const clearPreview = () => {
  importPreview.value = []
  if (csvFileInput.value) csvFileInput.value.value = ''
}

// Download template CSV (menghasilkan file .csv asli, bukan HTML)
const downloadTemplate = async () => {
  const fallbackCsv = [
    'Nama,NIUP,NIP,Pangkat,Pendidikan,Gender (L/P),Mata Pelajaran,Kelas,Foto,Provinsi,Kabupaten,Kecamatan,Negara',
    'Ahmad Fauzi,NIUP001,198501012010011001,Pembina,T S1,L,Matematika;Fisika,X RPL,guru_ahmad.jpg,Jawa Barat,Bandung,Kecamatan Bandung,Indonesia',
    'Siti Aminah,NIUP002,199002022015012002,Muda,S1,P,Bahasa Inggris;Bahasa Indonesia,X TKJ,guru_siti.jpg,Jawa Timur,Surabaya,Kecamatan Surabaya,Indonesia'
  ].join('\n')

  let csvText = fallbackCsv
  try {
    const res = await fetch('/teachers_sample.csv')
    if (res.ok) {
      const text = await res.text()
      if (text && text.toLowerCase().includes('nama')) csvText = text
    }
  } catch {
    // pakai fallback bila fetch gagal
  }

  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'teachers_sample.csv'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// Method ketika file dipilih
const onFileChange = (event: any) => {
  const file = event.target.files[0]
  if (!file) return

  if (!file.name.toLowerCase().endsWith('.csv')) {
    alert('Hanya file CSV yang diizinkan!')
    return
  }

  const reader = new FileReader()
  reader.onload = (e: any) => {
    const content = e.target.result
    parseCSV(content)
  }
  reader.readAsText(file)
}

// Parse satu baris CSV dengan dukungan tanda kutip
const parseCsvLine = (line: string): string[] => {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current)
  return result.map(v => v.trim())
}

// Parsing fungsi CSV
const parseCSV = (content: string) => {
  const lines = content.replace(/\r/g, '').trim().split('\n').filter(l => l.trim() !== '')
  importPreview.value = []

  if (lines.length === 0) return

  const firstLine = lines[0].toLowerCase()
  const isHeader = firstLine.includes('nama') || firstLine.includes('name')
  const startIdx = isHeader ? 1 : 0

  for (let i = startIdx; i < lines.length; i++) {
    const parts = parseCsvLine(lines[i])
    if (parts.length < 3 || !parts[0]) continue

    const name = parts[0] || ''
    const niup = parts[1] || ''
    const nip = parts[2] || ''
    const pangkat = parts[3] || ''
    const pendidikan = parts[4] || ''
    const gender = (parts[5] || '').toUpperCase().startsWith('P') ? 'P' : 'L'
    const subjectsRaw = parts[6] || ''
    const subjects = subjectsRaw.replace(/"/g, '').split(/[;|]/).map(s => s.trim()).filter(Boolean)
    const classesRaw = parts[7] || ''
    const classes = classesRaw.replace(/"/g, '').split(/[;|]/).map(c => c.trim()).filter(Boolean)
    const foto_guru = parts[8] || ''
    const provinsi = parts[9] || 'Indonesia'
    const kabupaten = parts[10] || 'Indonesia'
    const kecamatan = parts[11] || 'Indonesia'
    const negara = parts[12] || 'Indonesia'

    importPreview.value.push({
      id: `tmp-${Date.now()}-${i}`,
      name,
      niup,
      nip,
      pangkat,
      pendidikan,
      gender,
      subjects,
      classes,
      foto_guru,
      provinsi,
      kabupaten,
      kecamatan,
      negara
    })
  }
}

// Method proses import
const processImport = async () => {
  if (importPreview.value.length === 0) {
    alert('Tidak ada data valid yang terdeteksi.')
    return
  }

  try {
    const response = await fetch('http://localhost:3000/api/teachers/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (localStorage.getItem('token') || localStorage.getItem('auth_token') || '')
      },
      body: JSON.stringify({ teachers: importPreview.value })
    })

    const result = await response.json()

    if (!response.ok) {
      alert('Gagal mengimpor data: ' + (result.message || 'Unknown error'))
      return
    }

    await teacherStore.fetchTeachers()
    alert('Berhasil mengimpor: ' + (result.message || 'data guru'))
    closeImportModal()
  } catch (err: any) {
    alert('Gagal mengimpor data: ' + (err?.message || 'Unknown error'))
  }
}

const handleFotoGuruChange = async (event: any) => {
  const file = event.target.files[0]
  if (!file) return

  // Validasi sederhana
  if (file.size > 2 * 1024 * 1024) {
    alert('Ukuran foto melebihi 2MB')
    return
  }

  const fd = new FormData()
  fd.append('foto', file)

  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: fd
    })

    const result = await response.json()

    if (response.ok && result.filename) {
      formData.foto_guru = result.filename
      alert('Foto berhasil diupload!')
    } else {
      alert('Gagal upload foto: ' + (result.message || 'Unknown error'))
    }
  } catch (error) {
    alert('Terjadi kesalahan saat upload')
    console.error('Upload error:', error)
  }
}
</script>
