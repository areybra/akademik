<template>
  <div class="space-y-6 pb-20 max-w-3xl">
    <div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">Pengaturan</h1>
      <p class="text-sm text-slate-500 mt-0.5">Kelola konfigurasi sistem yang tampil untuk pengguna.</p>
    </div>

    <section class="clean-card p-4 sm:p-6 space-y-5">
      <div>
        <h2 class="text-sm font-bold text-slate-900 uppercase tracking-wider">Tampilan &amp; Tema</h2>
        <p class="text-xs text-slate-500 mt-1">
          Pilih palet warna aplikasi. Perubahan langsung diterapkan dan tersimpan di perangkat ini.
        </p>
      </div>
      <ThemeSwitcher variant="inline" />
    </section>

    <TeacherAssignmentsSettings />

    <ParentRelationsSettings />

    <UsersPage />

    <UsersPage />

    <UsersPage />

    <HelpContactsSettings />
  </div>
</template>

<script setup lang="ts">
import HelpContactsSettings from './HelpContactsSettings.vue'
import TeacherAssignmentsSettings from './TeacherAssignmentsSettings.vue'
import ParentRelationsSettings from './ParentRelationsSettings.vue'
import UsersPage from '../users/UsersPage.vue'
import ThemeSwitcher from '../../components/ui/ThemeSwitcher.vue'
</script>
