<template>
  <div class="space-y-10 pb-20">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-black text-surface-900 tracking-tight">Manajemen Siswa</h1>
        <p class="text-surface-500 mt-1 flex items-center gap-2 font-medium">
          <span class="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
          {{ filteredStudentsList.length }} Siswa terverifikasi dalam database
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="lg" @click="showFilters = !showFilters">
          <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          {{ showFilters ? 'Sembunyikan Filter' : 'Filter' }}
          <span
            v-if="activeFilterCount > 0"
            class="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-cta text-cta-ink text-[10px] font-black"
          >
            {{ activeFilterCount }}
          </span>
        </Button>
        <div v-if="canEdit" class="flex flex-wrap gap-3">
          <Button variant="secondary" size="lg" @click="openImportModal">
            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Impor Data
          </Button>
          <Button variant="primary" size="lg" @click="openAddModal">
            <svg class="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Registrasi Siswa
          </Button>
          <Button variant="outline" size="lg" class="no-print" @click="exportStudents">Ekspor CSV</Button>
        </div>
      </div>
    </div>

    <!-- Filters Bar -->
    <div v-show="showFilters" class="premium-card p-4 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p class="text-[11px] font-black text-surface-500 uppercase tracking-widest">Filter Data Siswa</p>
        <button
          type="button"
          class="text-[11px] font-bold uppercase tracking-widest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          :class="activeFilterCount > 0 ? 'text-brand-600 hover:text-brand-700' : 'text-surface-400'"
          :disabled="activeFilterCount === 0"
          @click="resetFilters"
        >
          Reset Filter
        </button>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 items-end">
        <div class="md:col-span-2 lg:col-span-3">
          <Input
            :model-value="studentStore.searchQuery"
            type="text"
            label="Pencarian Global"
            placeholder="Cari nama atau NIUP siswa..."
            @update:model-value="(val) => studentStore.setSearch(String(val))"
          />
        </div>
        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">
            Tingkat Kelas
          </label>
          <select
            v-model="levelFilter"
            class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">Semua Tingkat</option>
            <option v-for="l in allLevels" :key="l" :value="l">Kelas {{ l }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">
            Program Keahlian
          </label>
          <select
            v-model="majorFilter"
            class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">Semua Jurusan</option>
            <option v-for="m in allMajors" :key="m" :value="m">
              {{ m }}
            </option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">
            Jenis Kelamin
          </label>
          <select
            v-model="genderFilter"
            class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">Semua Gender</option>
            <option value="L">Laki-laki</option>
            <option value="P">Perempuan</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Status</label>
          <select
            v-model="statusFilter"
            class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">Semua Status</option>
            <option value="siswa aktif">Siswa Aktif</option>
            <option value="siswa berhenti">Siswa Berhenti</option>
            <option value="siswa lulus">Siswa Lulus</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Provinsi</label>
          <select
            v-model="provinceFilter"
            class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">Semua Provinsi</option>
            <option v-for="p in allProvinces" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Kabupaten/Kota</label>
          <select
            v-model="kabupatenFilter"
            class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
          >
            <option value="">Semua Kabupaten/Kota</option>
            <option v-for="k in kabupatenOptions" :key="k" :value="k">{{ k }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Content Area -->
    <div v-if="filteredStudentsList.length === 0" class="premium-card p-8 sm:p-12 text-center">
       <div class="w-20 h-20 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-6 border border-surface-200">
         <svg class="w-10 h-10 text-surface-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
         </svg>
       </div>
       <h3 class="text-2xl font-black text-surface-900 tracking-tight">Data Tidak Terdeteksi</h3>
       <p class="text-surface-500 mt-2 font-medium">Sesuaikan parameter pencarian atau filter klaster Anda.</p>
     </div>

     <div v-else class="premium-card overflow-hidden">
       <div class="flex items-center justify-between border-b border-surface-100 px-4 py-2 lg:hidden">
         <span class="text-[11px] font-bold uppercase tracking-widest text-surface-500">Geser tabel untuk kolom lain</span>
         <svg class="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
         </svg>
       </div>
       <div class="overflow-x-auto">
         <table class="w-full text-left">
           <thead>
             <tr class="bg-surface-50 border-b border-surface-200/60">
               <th class="px-4 sm:px-6 lg:px-8 py-5 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em]">Profil Siswa</th>
               <th class="px-4 sm:px-6 lg:px-8 py-5 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em]">Identitas (NIUP)</th>
               <th class="px-4 sm:px-6 lg:px-8 py-5 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em] text-center">Jenis Kelamin</th>
               <th class="px-4 sm:px-6 lg:px-8 py-5 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em] text-center">Klaster</th>
               <th class="px-4 sm:px-6 lg:px-8 py-5 text-[11px] font-black text-surface-500 uppercase tracking-[0.2em] text-right">Aksi</th>
             </tr>
           </thead>
           <tbody class="divide-y divide-surface-100">
             <tr
               v-for="student in paginatedStudents"
               :key="student.id"
               class="hover:bg-surface-50/80 transition-all duration-300 group"
             >
               <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                 <div class="flex items-center gap-3 min-w-0">
                   <div class="shrink-0">
                     <img
                       v-if="student.foto_siswa && !failedPhotos[student.id]"
                       :src="photoUrl(student.foto_siswa)"
                       :alt="'Foto ' + student.name"
                       class="w-10 aspect-[4/6] rounded-xl object-cover border border-surface-200 bg-surface-100"
                       @error="markPhotoFailed(student.id)"
                     />
                     <div
                       v-else
                       class="w-10 aspect-[4/6] rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center text-sm font-black uppercase"
                     >
                       {{ initials(student.name) }}
                     </div>
                   </div>
                   <div class="min-w-0">
                     <button
                       type="button"
                       class="font-black text-surface-900 text-base tracking-tight max-w-xs truncate group-hover:text-brand-600 transition-colors text-left"
                       @click="showDetail(student)"
                     >
                       {{ student.name }}
                     </button>
                     <div class="text-[10px] font-bold uppercase tracking-widest mt-1" :class="{ 'text-emerald-500': student.status === 'siswa aktif', 'text-rose-500': student.status === 'siswa berhenti', 'text-amber-500': student.status === 'siswa lulus' }">
                       {{ student.status }}
                     </div>
                   </div>
                 </div>
               </td>
               <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
                 <span class="px-3 py-1.5 bg-surface-100 rounded-lg text-[11px] font-bold text-surface-600 border border-surface-200/60 font-mono tabular-nums">
                   {{ student.niup }}
                 </span>
               </td>
               <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center">
                 <span class="px-3 py-1.5 bg-surface-100 rounded-lg text-[11px] font-bold text-surface-600 border border-surface-200/60 uppercase tracking-wider">
                   {{ student.gender === 'L' ? 'Laki-laki' : 'Perempuan' }}
                 </span>
               </td>
               <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center">
                 <span class="inline-flex px-4 py-1.5 bg-brand-50 text-brand-600 text-[10px] font-bold rounded-xl border border-brand-100 uppercase tracking-widest">
                   {{ student.class }}
                 </span>
               </td>

               <td class="px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-right">
                 <div class="flex justify-end items-center gap-2">
                   <button
                     @click="showDetail(student)"
                     class="p-2.5 bg-surface-100 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-surface-200/60 transition-all"
                     title="Lihat Detail"
                     aria-label="Lihat detail siswa"
                   >
                     <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                       <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                     </svg>
                   </button>
                   <div
                     v-if="canEdit"
                     class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0"
                   >
                     <button
                       @click="editStudent(student)"
                       class="p-2.5 bg-surface-100 text-surface-400 hover:text-brand-600 hover:bg-brand-50 rounded-xl border border-surface-200/60 transition-all"
                       title="Edit Profil"
                       aria-label="Edit profil siswa"
                     >
                       <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                       </svg>
                     </button>
                     <button
                       @click="deleteStudent(student.id)"
                       class="p-2.5 bg-surface-100 text-surface-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl border border-surface-200/60 transition-all"
                       title="Hapus Record"
                       aria-label="Hapus data siswa"
                     >
                       <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                       </svg>
                     </button>
                   </div>
                 </div>
               </td>
             </tr>
           </tbody>
         </table>
       </div>
     </div>

     <Pagination
       :page="currentPage"
       :page-size="pageSize"
       :total="filteredStudentsList.length"
       label="siswa"
       @update:page="currentPage = $event"
       @update:page-size="pageSize = $event"
     />

     <!-- Modal Form -->
     <Modal
       :is-open="showModal"
       :title="editingStudent ? 'Ubah Informasi Siswa' : 'Registrasi Siswa Baru'"
       subtitle="Silakan lengkapi data identitas siswa untuk pendaftaran ke dalam sistem."
       confirm-text="Simpan Record"
       @close="closeModal"
       @confirm="saveStudent"
     >
       <div class="space-y-6">
         <Input
           v-model="formData.name"
           label="Nama Lengkap Siswa"
           placeholder="Masukkan identitas resmi siswa"
           :error="formErrors.name"
           required
         />

         <Input
           v-model="formData.niup"
           label="Nomor Induk Unit Pendidikan (NIUP)"
           placeholder="Masukkan NIUP siswa"
           :error="formErrors.niup"
           required
         />

         <div>
           <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Klaster Kelas</label>
           <select
             v-model="formData.class"
             class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
             required
           >
             <option v-for="c in sortedClasses" :key="c" :value="c">{{ c }}</option>
           </select>
           <p v-if="formErrors.class" class="mt-2 text-[10px] text-rose-500 font-bold uppercase tracking-widest px-1">{{ formErrors.class }}</p>
         </div>

         <div class="grid grid-cols-2 gap-4">
           <div>
             <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Jenis Kelamin</label>
             <select
               v-model="formData.gender"
               class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
               required
             >
               <option value="L">Laki-laki</option>
               <option value="P">Perempuan</option>
             </select>
           </div>
           <div>
             <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Tempat Lahir</label>
             <input
               v-model="formData.tmp_lahir"
               type="text"
               placeholder="Tempat lahir"
               class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
               required
             />
           </div>
         </div>
         
         <div class="grid grid-cols-2 gap-4">
           <div>
             <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Tanggal Lahir</label>
             <input
               v-model="formData.tgl_lahir"
               type="date"
               class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
               required
             />
           </div>
           <div>
             <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">NISN (Nasional)</label>
             <input
               v-model="formData.nisn"
               type="text"
               placeholder="Nomor Induk Siswa Nasional"
               class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
             />
           </div>
         </div>
         
         <div class="grid grid-cols-2 gap-4">
           <div>
             <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Provinsi</label>
             <select
               v-model="formData.provinsi"
               class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
               required
             >
               <option value="Indonesia">Indonesia</option>
               <option value="DKI Jakarta">DKI Jakarta</option>
               <option value="Jawa Barat">Jawa Barat</option>
               <option value="Jawa Tengah">Jawa Tengah</option>
               <option value="Jawa Timur">Jawa Timur</option>
               <option value="Banten">Banten</option>
               <option value="Sumatera Utara">Sumatera Utara</option>
               <option value="Sumatera Selatan">Sumatera Selatan</option>
               <option value="Sumatera Barat">Sumatera Barat</option>
               <option value="Riau">Riau</option>
               <option value="Kepulauan Riau">Kepulauan Riau</option>
               <option value="Bengkulu">Bengkulu</option>
               <option value="Lampung">Lampung</option>
               <option value="Bangka Belitung">Bangka Belitung</option>
               <option value="Gorontalo">Gorontalo</option>
               <option value="Sulawesi Utara">Sulawesi Utara</option>
               <option value="Sulawesi Tengah">Sulawesi Tengah</option>
               <option value="Sulawesi Selatan">Sulawesi Selatan</option>
               <option value="Sulawesi Barat">Sulawesi Barat</option>
               <option value="Bali">Bali</option>
               <option value="Nusa Tenggara Barat">Nusa Tenggara Barat</option>
               <option value="Nusa Tenggara Timur">Nusa Tenggara Timur</option>
               <option value="Kalimantan Barat">Kalimantan Barat</option>
               <option value="Kalimantan Tengah">Kalimantan Tengah</option>
               <option value="Kalimantan Selatan">Kalimantan Selatan</option>
               <option value="Kalimantan Timur">Kalimantan Timur</option>
               <option value="Maluku">Maluku</option>
               <option value="Maluku Utara">Maluku Utara</option>
               <option value="Papua">Papua</option>
               <option value="Papua Barat">Papua Barat</option>
             </select>
           </div>
           <div>
             <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Kabupaten/Kota</label>
             <input
               v-model="formData.kabupaten"
               type="text"
               placeholder="Kabupaten/Kota"
               class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
             />
           </div>
         </div>
         
         <div class="grid grid-cols-2 gap-4">
           <div>
             <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Kecamatan</label>
             <input
               v-model="formData.kecamatan"
               type="text"
               placeholder="Kecamatan"
               class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
             />
           </div>
           <div>
             <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Negara</label>
             <select
               v-model="formData.negara"
               class="w-full px-5 py-3.5 bg-surface-100/50 border border-surface-200/60 rounded-2xl text-surface-900 font-bold focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all appearance-none cursor-pointer"
             >
               <option value="Indonesia">Indonesia</option>
             </select>
           </div>
         </div>
         
         <div>
           <label class="block text-[11px] font-black text-surface-500 uppercase tracking-widest mb-2 px-1">Foto Siswa</label>
           <div class="flex flex-wrap items-center gap-3">
             <button
               type="button"
               class="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-50 text-brand-700 rounded-xl border border-brand-100 hover:bg-brand-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold"
               :disabled="uploadingFotoSiswa"
               @click="fotoSiswaInput?.click()"
             >
               <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
               </svg>
               {{ uploadingFotoSiswa ? 'Mengunggah...' : 'Pilih Foto' }}
             </button>
             <input
               ref="fotoSiswaInput"
               type="file"
               accept="image/*"
               class="hidden"
               @change="handleFotoSiswaChange"
             />
             <button
               v-if="formData.foto_siswa"
               type="button"
               class="text-xs font-bold text-rose-500 hover:text-rose-600 hover:underline"
               @click="removeFotoSiswa"
             >
               Hapus Foto
             </button>
           </div>
           <div v-if="formData.foto_siswa" class="mt-3 flex items-center gap-3">
             <img
               :src="photoUrl(formData.foto_siswa)"
               alt="Preview foto siswa"
               class="w-12 aspect-[4/6] rounded-lg object-cover border border-surface-200 bg-surface-100"
             />
             <span class="text-xs text-surface-500 break-all">{{ formData.foto_siswa }}</span>
           </div>
           <p class="text-xs text-surface-500 mt-2">Format gambar JPG/PNG, maksimum 2MB.</p>
         </div>
       </div>
     </Modal>

     <!-- Detail Modal (read-only) -->
     <Modal
       :is-open="showDetailModal"
       title="Detail Profil Siswa"
       subtitle="Informasi lengkap identitas siswa."
       size="lg"
       hide-confirm
       cancel-text="Tutup"
       @close="closeDetail"
     >
       <div v-if="detailStudent" class="space-y-6">
         <div class="flex flex-col sm:flex-row sm:items-center gap-5 p-5 bg-surface-50 rounded-2xl border border-surface-100">
           <img
             v-if="detailStudent.foto_siswa && !failedPhotos[detailStudent.id]"
             :src="photoUrl(detailStudent.foto_siswa)"
             :alt="'Foto ' + detailStudent.name"
             class="w-24 aspect-[4/6] rounded-2xl object-cover border border-surface-200 bg-surface-100 shrink-0"
             @error="markPhotoFailed(detailStudent.id)"
           />
           <div
             v-else
             class="w-24 aspect-[4/6] rounded-2xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center text-2xl font-black uppercase shrink-0"
           >
             {{ initials(detailStudent.name) }}
           </div>
           <div class="min-w-0">
             <p class="text-xl font-black text-surface-900 tracking-tight">{{ detailStudent.name }}</p>
             <p class="text-[11px] font-bold uppercase tracking-widest mt-1" :class="{ 'text-emerald-500': detailStudent.status === 'siswa aktif', 'text-rose-500': detailStudent.status === 'siswa berhenti', 'text-amber-500': detailStudent.status === 'siswa lulus' }">
               {{ detailStudent.status }}
             </p>
             <p class="text-xs text-surface-500 mt-2 font-mono">{{ detailStudent.niup }}</p>
           </div>
         </div>

         <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">NIUP</p>
             <p class="text-sm font-bold text-surface-900 font-mono">{{ display(detailStudent.niup) }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">NISN</p>
             <p class="text-sm font-bold text-surface-900 font-mono">{{ display(detailStudent.nisn) }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Jenis Kelamin</p>
             <p class="text-sm font-bold text-surface-900">{{ detailStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan' }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Klaster Kelas</p>
             <p class="text-sm font-bold text-surface-900">{{ display(detailStudent.class) }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Tempat Lahir</p>
             <p class="text-sm font-bold text-surface-900">{{ display(detailStudent.tmp_lahir) }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Tanggal Lahir</p>
             <p class="text-sm font-bold text-surface-900">{{ display(detailStudent.tgl_lahir) }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Provinsi</p>
             <p class="text-sm font-bold text-surface-900">{{ display(detailStudent.provinsi) }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Kabupaten/Kota</p>
             <p class="text-sm font-bold text-surface-900">{{ display(detailStudent.kabupaten) }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Kecamatan</p>
             <p class="text-sm font-bold text-surface-900">{{ display(detailStudent.kecamatan) }}</p>
           </div>
           <div>
             <p class="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1">Negara</p>
             <p class="text-sm font-bold text-surface-900">{{ display(detailStudent.negara) }}</p>
           </div>
         </div>

         <div v-if="canEdit" class="pt-4 border-t border-surface-100">
           <Button variant="primary" block @click="editFromDetail">
             <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
             </svg>
             Edit Data Siswa
           </Button>
         </div>
       </div>
     </Modal>

     <!-- Bulk Import Modal -->
     <Modal
       :is-open="showImportModal"
       title="Impor Masal Data Siswa"
       subtitle="Ikuti 3 langkah berikut: baca petunjuk, unduh template CSV, lalu unggah file."
       confirm-text="Konfirmasi Import"
       @close="closeImportModal"
       @confirm="processImport"
     >
       <div class="space-y-5">
         <!-- STEP 1: Keterangan (paling atas) -->
         <div class="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
           <div class="flex items-center gap-2 mb-3">
             <span class="flex items-center justify-center w-6 h-6 rounded-full bg-solid-amber text-white text-xs font-black">1</span>
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
               Nama, NIUP, NISN, Tgl Lahir, Tempat Lahir, Gender (L/P), Kelas, Provinsi, Kabupaten, Kecamatan, Negara, Foto, Status
             </p>
           </div>
         </div>

         <!-- STEP 2: Unduh Template CSV (tengah) -->
         <div class="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl">
           <div class="flex items-center gap-2 mb-3">
             <span class="flex items-center justify-center w-6 h-6 rounded-full bg-solid-emerald text-white text-xs font-black">2</span>
             <p class="text-sm font-black text-emerald-900">Unduh Template CSV</p>
           </div>
           <Button variant="secondary" size="sm" class="w-full" @click="downloadTemplate">
             <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
             Unduh Template (.csv)
           </Button>
           <p class="text-[11px] text-emerald-700/70 mt-2">File yang diunduh: <strong>students_sample.csv</strong></p>
         </div>

         <!-- STEP 3: Unggah File (paling bawah) -->
         <div class="p-5 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
           <div class="flex items-center gap-2 mb-3">
             <span class="flex items-center justify-center w-6 h-6 rounded-full bg-cta text-cta-ink text-xs font-black">3</span>
             <p class="text-sm font-black text-indigo-900">Unggah File CSV</p>
           </div>
           <input
             ref="csvFileInput"
             type="file"
             accept=".csv,text/csv"
             @change="onFileChange"
             class="block w-full text-sm text-surface-700 bg-panel rounded-xl border border-indigo-200 cursor-pointer file:mr-4 file:py-2.5 file:px-4 file:border-0 file:text-sm file:font-bold file:bg-cta file:text-cta-ink hover:file:bg-cta-hover focus:outline-none focus:ring-4 focus:ring-indigo-500/20"
           />
           <p class="text-[11px] text-indigo-700/70 mt-2">
             Pilih file berformat <strong>.csv</strong> hasil pengisian template di atas.
           </p>
         </div>

         <!-- Pratinjau setelah upload -->
         <div v-if="importPreview.length > 0" class="space-y-3">
           <div class="flex items-center justify-between px-1">
             <p class="text-[11px] font-black text-surface-500 uppercase tracking-widest">Pratinjau ({{ importPreview.length }} Siswa)</p>
             <button class="text-[11px] font-bold text-rose-500 hover:underline" @click="clearPreview">Hapus</button>
           </div>
           <div class="max-h-48 overflow-y-auto border border-surface-200 rounded-xl divide-y divide-surface-100">
             <div v-for="(p, i) in importPreview" :key="i" class="px-4 py-2 text-[11px] flex justify-between items-center">
               <span class="font-bold text-surface-900">{{ p.name }}</span>
               <span class="text-surface-500">{{ p.niup }} | {{ p.nisn }} | {{ p.gender }} | {{ p.class }}</span>
             </div>
           </div>
         </div>

         <!-- Tombol konfirmasi -->
         <div v-if="importPreview.length > 0" class="pt-4 border-t border-surface-200">
           <Button variant="primary" class="w-full" @click="processImport">
             <svg class="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
             </svg>
             Konfirmasi Import ({{ importPreview.length }} siswa)
           </Button>
         </div>
       </div>
     </Modal>
   </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useStudentStore } from '../../stores/student'
import { useFormValidation } from '../../composables/useFormValidation'
import { PROVINCES } from '../../constants/regions'
import type { Student } from '../../types'
import Input from '../../components/ui/Input.vue'
import Button from '../../components/ui/Button.vue'
import Modal from '../../components/ui/Modal.vue'
import Pagination from '../../components/ui/Pagination.vue'
import { sortClassNames } from '../../utils/classes'
import { useExport } from '../../composables/useExport'
import { useAuthStore } from '../../stores/auth'

const studentStore = useStudentStore()
const authStore = useAuthStore()
const { exportToCsv } = useExport()

const canEdit = computed(() => authStore.hasAnyRole(['admin', 'kepala_tu', 'staff_tu']))

onMounted(async () => {
  if (studentStore.students.length === 0) {
    await studentStore.fetchStudents()
  }
})

const showModal = ref(false)
const editingStudent = ref<Student | null>(null)

const showImportModal = ref(false)
const importPreview = ref<any[]>([])
const csvFileInput = ref<HTMLInputElement | null>(null)

const genderFilter = ref('')
const statusFilter = ref('')
const levelFilter = ref('')
const majorFilter = ref('')
const provinceFilter = ref('')
const kabupatenFilter = ref('')
const showFilters = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

const UPLOAD_BASE = 'http://localhost:3000/uploads'

const photoUrl = (filename: string) => `${UPLOAD_BASE}/${encodeURIComponent(filename)}`

const initials = (name: string) => {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

const failedPhotos = reactive<Record<string, boolean>>({})
const markPhotoFailed = (id: string) => {
  failedPhotos[id] = true
}

const display = (value?: string | null) => (value && String(value).trim() !== '' ? value : '—')

const allLevels = computed(() => {
  const uniqueLevels = new Set(
    studentStore.students
      .filter(s => s && s.class)
      .map(s => s.class.split(' ')[0])
  )
  return sortClassNames(Array.from(uniqueLevels).filter(Boolean))
})

const allMajors = computed(() => {
  const uniqueMajors = new Set(
    studentStore.students
      .filter(s => s && s.class)
      .map(s => s.class.split(' ').slice(1).join(' '))
  )
  return Array.from(uniqueMajors).filter(Boolean).sort()
})

const allProvinces = computed(() => {
  const provinces = new Set<string>(PROVINCES)
  studentStore.students.forEach(s => {
    if (s.provinsi) provinces.add(s.provinsi)
  })
  return Array.from(provinces).sort((a, b) => a.localeCompare(b))
})

const kabupatenOptions = computed(() => {
  const kabupaten = new Set<string>()
  studentStore.students.forEach(s => {
    if (!s.kabupaten) return
    if (provinceFilter.value && (s.provinsi || '') !== provinceFilter.value) return
    kabupaten.add(s.kabupaten)
  })
  return Array.from(kabupaten).sort((a, b) => a.localeCompare(b))
})

watch(provinceFilter, () => {
  if (kabupatenFilter.value && !kabupatenOptions.value.includes(kabupatenFilter.value)) {
    kabupatenFilter.value = ''
  }
})

const activeFilterCount = computed(() => {
  let count = 0
  if (studentStore.searchQuery.trim()) count++
  if (levelFilter.value) count++
  if (majorFilter.value) count++
  if (genderFilter.value) count++
  if (statusFilter.value) count++
  if (provinceFilter.value) count++
  if (kabupatenFilter.value) count++
  return count
})

const resetFilters = () => {
  levelFilter.value = ''
  majorFilter.value = ''
  genderFilter.value = ''
  statusFilter.value = ''
  provinceFilter.value = ''
  kabupatenFilter.value = ''
  studentStore.setSearch('')
}

const showDetailModal = ref(false)
const detailStudent = ref<Student | null>(null)

const showDetail = (student: Student) => {
  detailStudent.value = student
  showDetailModal.value = true
}

const closeDetail = () => {
  showDetailModal.value = false
}

const editFromDetail = () => {
  const student = detailStudent.value
  closeDetail()
  if (student) editStudent(student)
}

const fotoSiswaInput = ref<HTMLInputElement | null>(null)
const uploadingFotoSiswa = ref(false)

const handleFotoSiswaChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!file.type.startsWith('image/')) {
    alert('Hanya file gambar yang diizinkan.')
    input.value = ''
    return
  }

  if (file.size > 2 * 1024 * 1024) {
    alert('Ukuran foto melebihi 2MB.')
    input.value = ''
    return
  }

  uploadingFotoSiswa.value = true
  try {
    const fd = new FormData()
    fd.append('foto', file)

    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: fd
    })
    const result = await response.json()

    if (response.ok && result.filename) {
      formData.foto_siswa = result.filename
    } else {
      alert('Gagal upload foto: ' + (result.message || 'Unknown error'))
    }
  } catch (error) {
    alert('Terjadi kesalahan saat upload foto.')
    console.error('Upload error:', error)
  } finally {
    uploadingFotoSiswa.value = false
    input.value = ''
  }
}

const removeFotoSiswa = () => {
  formData.foto_siswa = ''
  if (fotoSiswaInput.value) fotoSiswaInput.value.value = ''
}

const filteredStudentsList = computed(() => {
  return studentStore.filteredStudents.filter(s => {
    const matchGender = !genderFilter.value || s.gender === genderFilter.value
    const matchStatus = !statusFilter.value || s.status === statusFilter.value
    const matchLevel = !levelFilter.value || s.class.startsWith(levelFilter.value + ' ')
    const matchMajor = !majorFilter.value || s.class.includes(majorFilter.value)
    const matchProvince = !provinceFilter.value || (s.provinsi || '') === provinceFilter.value
    const matchKabupaten = !kabupatenFilter.value || (s.kabupaten || '') === kabupatenFilter.value
    return matchGender && matchStatus && matchLevel && matchMajor && matchProvince && matchKabupaten
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredStudentsList.value.length / pageSize.value)))

const paginatedStudents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredStudentsList.value.slice(start, start + pageSize.value)
})

const sortedClasses = computed(() => sortClassNames(studentStore.classes))

watch(
  [levelFilter, majorFilter, genderFilter, statusFilter, provinceFilter, kabupatenFilter, () => studentStore.searchQuery],
  () => { currentPage.value = 1 }
)

watch(pageSize, () => { currentPage.value = 1 })

watch(totalPages, (total) => {
  if (currentPage.value > total) currentPage.value = total
})

const formData = reactive({
  name: '',
  niup: '',
  nisn: '',
  tgl_lahir: '',
  tmp_lahir: '',
  class: '',
  provinsi: 'Indonesia',
  kabupaten: '',
  kecamatan: '',
  negara: 'Indonesia',
  gender: 'L' as 'L' | 'P',
  status: 'siswa aktif' as 'siswa aktif' | 'siswa berhenti' | 'siswa lulus',
  foto_siswa: ''
})

const { errors: formErrors, validateForm, clearErrors } = useFormValidation({
  name: { required: true },
  niup: { required: true },
  class: { required: true },
  status: { required: true },
  gender: { required: true }
})

const clearForm = () => {
  clearErrors()
  formData.name = ''
  formData.niup = ''
  formData.nisn = ''
  formData.tgl_lahir = ''
  formData.tmp_lahir = ''
  formData.class = ''
  formData.provinsi = 'Indonesia'
  formData.kabupaten = ''
  formData.kecamatan = ''
  formData.negara = 'Indonesia'
  formData.gender = 'L'
  formData.status = 'siswa aktif'
  formData.foto_siswa = ''
  if (fotoSiswaInput.value) fotoSiswaInput.value.value = ''
}

const editStudent = (student: Student) => {
  editingStudent.value = student
  formData.name = student.name
  formData.niup = student.niup
  formData.nisn = student.nisn || ''
  formData.tgl_lahir = student.tgl_lahir || ''
  formData.tmp_lahir = student.tmp_lahir || ''
  formData.class = student.class
  formData.provinsi = student.provinsi || 'Indonesia'
  formData.kabupaten = student.kabupaten || ''
  formData.kecamatan = student.kecamatan || ''
  formData.negara = student.negara || 'Indonesia'
  formData.gender = student.gender
  formData.status = student.status
  formData.foto_siswa = student.foto_siswa || ''
  if (fotoSiswaInput.value) fotoSiswaInput.value.value = ''
  clearErrors()
  showModal.value = true
}

const openAddModal = () => {
  editingStudent.value = null
  clearForm()
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  clearForm()
}

const saveStudent = async () => {
  if (!validateForm(formData)) {
    return
  }

  let success = false
  if (editingStudent.value) {
    success = await studentStore.updateStudent(editingStudent.value.id, formData as any)
  } else {
    success = await studentStore.addStudent(formData as any)
  }

  if (success) {
    closeModal()
  } else {
    alert(`Gagal menyimpan data siswa: ${studentStore.error}`)
  }
}

const deleteStudent = async (id: string) => {
  if (confirm('Konfirmasi: Hapus record siswa ini secara permanen dari database?')) {
    const success = await studentStore.deleteStudent(id)
    if (!success) {
      alert(`Gagal menghapus data siswa: ${studentStore.error}`)
    }
  }
}

const exportStudents = () => {
  const headers = ['Nama', 'NIUP', 'NISN', 'Tgl Lahir', 'Tempat Lahir', 'Kelas', 'Provinsi', 'Kabupaten', 'Kecamatan', 'Negara', 'Jenis Kelamin', 'Status']
  const rows = filteredStudentsList.value.map(s => [
    s.name,
    s.niup,
    s.nisn,
    s.tgl_lahir,
    s.tmp_lahir,
    s.class,
    s.provinsi,
    s.kabupaten,
    s.kecamatan,
    s.negara,
    s.gender === 'L' ? 'Laki-laki' : 'Perempuan',
    s.status
  ])
  exportToCsv(headers, rows, 'ekspor-siswa')
}

// Import Modal Methods

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
    'Nama,NIUP,NISN,Tgl Lahir,Tempat Lahir,Gender (L/P),Kelas,Provinsi,Kabupaten,Kecamatan,Negara,Foto,Status',
    'Andi Wijaya,NIUP001,1234567890,2005-01-15,Jakarta,L,X RPL,DKI Jakarta,Jakarta Selatan,Kecamatan Selatan,Indonesia,foto_andi.jpg,siswa aktif',
    'Budi Santoso,NIUP002,2345678901,2004-05-20,Medan,P,X TKJ,Sumatera Utara,Medan,Kecamatan Medan,Indonesia,foto_budi.jpg,siswa aktif'
  ].join('\n')

  let csvText = fallbackCsv
  try {
    const res = await fetch('/students_sample.csv')
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
  link.download = 'students_sample.csv'
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
    const nisn = parts[2] || ''
    const tgl_lahir = parts[3] || ''
    const tmp_lahir = parts[4] || ''
    const gender = (parts[5] || '').toUpperCase().startsWith('P') ? 'P' : 'L'
    const className = parts[6] || ''
    const provinsi = parts[7] || 'Indonesia'
    const kabupaten = parts[8] || ''
    const kecamatan = parts[9] || ''
    const negara = parts[10] || 'Indonesia'
    const foto_siswa = parts[11] || ''
    const status = parts[12] || 'siswa aktif'

    importPreview.value.push({
      name,
      niup,
      nisn,
      tgl_lahir,
      tmp_lahir,
      gender,
      class: className,
      provinsi,
      kabupaten,
      kecamatan,
      negara,
      foto_siswa,
      status
    })
  }
}

// Method proses import
const processImport = async () => {
  if (importPreview.value.length === 0) {
    alert('Tidak ada data valid yang terdeteksi.')
    return
  }

  const count = importPreview.value.length
  const success = await studentStore.bulkAddStudents(importPreview.value)

  if (!success) {
    alert('Gagal mengimpor data: ' + (studentStore.error || 'Terjadi kesalahan'))
    return
  }

  await studentStore.fetchStudents()
  alert('Berhasil mengimpor ' + count + ' siswa')
  closeImportModal()
}
</script>