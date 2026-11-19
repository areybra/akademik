<template>
  <div class="flex h-screen bg-canvas overflow-hidden">
    <!-- Overlay for mobile -->
    <div v-if="isMobileMenuOpen" class="fixed inset-0 bg-black/50 z-40 lg:hidden" @click="isMobileMenuOpen = false"></div>
    
    <!-- Sidebar -->
    <aside
      class="w-64 flex flex-col h-full bg-sidebar border-r border-sidebar-border z-50 transition-all duration-300 fixed lg:static inset-y-0 left-0 overflow-hidden"
      :class="[
        isSidebarCollapsed ? 'lg:w-0 lg:border-r-0' : 'lg:w-64',
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      ]"
      aria-label="Navigasi utama"
    >
      <!-- Logo Section -->
      <div class="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center border border-sidebar-border shadow-sm">
            <img src="../../assets/logo-nj.jpg" alt="SMK Nurul Jadid" class="w-full h-full object-cover" />
          </div>
          <span class="text-sm font-bold tracking-tight text-sidebar-ink uppercase">Akademik <span class="text-sidebar-accent">SMK</span></span>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <template v-for="group in navigationItems" :key="group.category">
          <h2 class="px-3 py-2 text-[10px] font-bold text-sidebar-muted uppercase tracking-wider mb-1">
            {{ group.category }}
          </h2>
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
            :class="[
              isActive(item.path) 
                ? 'bg-sidebar-active text-sidebar-active-ink' 
                : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-ink'
            ]"
            @click="isMobileMenuOpen = false"
          >
            <div class="w-5 h-5" v-html="item.icon"></div>
            {{ item.label }}
          </RouterLink>
        </template>
      </nav>

      <!-- User Profile (Bottom) -->
      <div class="p-4 border-t border-sidebar-border bg-sidebar-footer">
        <div class="flex items-center gap-3 mb-4">
          <img :src="authStore.user?.avatar" class="w-9 h-9 rounded-full object-cover border border-sidebar-border" />
          <div class="min-w-0">
            <p class="text-xs font-semibold text-sidebar-ink truncate">{{ authStore.user?.name }}</p>
            <p class="text-[10px] font-medium text-sidebar-muted uppercase tracking-wider">{{ userRolesLabel }}</p>
          </div>
        </div>
        <button 
          @click="handleLogout"
          class="w-full h-10 flex items-center justify-center gap-2 px-3 text-xs font-semibold text-sidebar-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
        >
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Keluar
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Top Bar -->
      <header class="h-16 flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 bg-panel border-b border-line shrink-0">
        <div class="flex items-center gap-4 min-w-0">
          <button
            @click="toggleSidebar"
            class="hidden lg:inline-flex p-2 shrink-0 text-slate-500 hover:bg-slate-100 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30"
            :aria-label="isSidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'"
            :aria-expanded="!isSidebarCollapsed"
            :title="isSidebarCollapsed ? 'Tampilkan sidebar (Ctrl+B)' : 'Sembunyikan sidebar (Ctrl+B)'"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke-width="2" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4v16" />
            </svg>
          </button>
          <button @click="isMobileMenuOpen = true" aria-label="Buka menu navigasi" class="lg:hidden p-2 shrink-0 text-slate-500 hover:bg-slate-100 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30">
             <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
             </svg>
          </button>
          <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest truncate">{{ currentRouteLabel }}</span>
        </div>
        
        <div class="flex items-center gap-4 shrink-0">
          <div class="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <span class="hidden sm:inline text-[10px] font-bold uppercase tracking-wider">Live</span>
          </div>
          <div class="hidden sm:block h-8 w-px bg-slate-200"></div>
          <ThemeSwitcher />
          <button aria-label="Notifikasi" class="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        </div>
      </header>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
        <div class="max-w-6xl mx-auto">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import ThemeSwitcher from '../ui/ThemeSwitcher.vue'
import type { UserRole } from '../../types'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()

const isMobileMenuOpen = ref(false)

const SIDEBAR_STORAGE_KEY = 'sidebar-collapsed'
const isSidebarCollapsed = ref(localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1')

watch(isSidebarCollapsed, (collapsed) => {
  localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? '1' : '0')
})

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'b') {
    event.preventDefault()
    toggleSidebar()
  }
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))

watch(() => route.path, () => {
  isMobileMenuOpen.value = false
})

const ALL_ROLES = ['admin', 'kepala_sekolah', 'waka', 'guru_mapel', 'wali_kelas', 'kepala_tu', 'staff_tu', 'guru', 'siswa', 'orang_tua']

const navigationConfig = [
  {
    category: 'Navigasi Utama',
    items: [
      { 
        label: 'Dashboard', 
        path: '/dashboard', 
        roles: ALL_ROLES,
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>'
      },
      {
        label: 'Pengaturan',
        path: '/settings',
        roles: ['admin'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>'
      },
    ]
  },
  {
    category: 'Data Master',
    items: [
      { 
        label: 'Siswa', 
        path: '/students', 
        roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu', 'wali_kelas'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>'
      },
      { 
        label: 'Kelas', 
        path: '/classes', 
        roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu', 'wali_kelas'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>'
      },
      { 
        label: 'Guru', 
        path: '/teachers', 
        roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>'
      },
    ]
  },
  {
    category: 'Akademik',
    items: [
      { 
        label: 'Jadwal', 
        path: '/schedule', 
        roles: ALL_ROLES,
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>'
      },
      {
        label: 'Mengajar',
        path: '/teaching',
        roles: ['guru', 'guru_mapel', 'wali_kelas'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0121 17.5M12 14v7m-6.16-10.922A12.083 12.083 0 003 17.5" /></svg>'
      },
      { 
        label: 'Absensi', 
        path: '/attendance', 
        roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>'
      },
      { 
        label: 'Nilai', 
        path: '/grades', 
        roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>'
      },
      {
        label: 'Laporan Absensi',
        path: '/attendance',
        roles: ['siswa', 'orang_tua'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>'
      },
      {
        label: 'Laporan Nilai',
        path: '/grades',
        roles: ['siswa', 'orang_tua'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>'
      },
    ]
  },
  {
    category: 'Kegiatan Ekskul',
    items: [
      {
        label: 'Ekskul',
        path: '/ekskul',
        roles: ['admin', 'kepala_sekolah', 'waka', 'guru', 'wali_kelas', 'siswa', 'orang_tua'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>'
      },
      {
        label: 'Prestasi',
        path: '/prestasi',
        roles: ['admin', 'kepala_sekolah', 'waka', 'guru', 'wali_kelas', 'siswa', 'orang_tua'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5v10a2 2 0 002 2h10a2 2 0 002-2V5m-2 0l3-3m-3 3l3 3" /></svg>'
      },
    ]
  },
  {
    category: 'Keuangan',
    items: [
      {
        label: 'Tagihan',
        path: '/billing',
        roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu', 'wali_kelas', 'siswa', 'orang_tua'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 1.343-3 3s1.343 3 3 3 3-1.343 3-3-1.343-3-3-3zm0 10c-4.418 0-8-1.79-8-4V8c0-2.21 3.582-4 8-4s8 1.79 8 4v6c0 2.21-3.582 4-8 4z" /></svg>'  },
    ]
  },
  {
    category: 'Akun',
    items: [
      {
        label: 'Profil',
        path: '/profile',
        roles: ['siswa', 'orang_tua'],
        icon: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>'
      },
    ]
  }
]

const navigationItems = computed(() => {
  const userRoles = authStore.user?.roles || (authStore.user?.role ? [authStore.user.role] : [])
  return navigationConfig
    .map(group => ({
      category: group.category,
      items: group.items.filter(item => (item.roles as UserRole[]).some((r) => userRoles.includes(r)))
    }))
    .filter(group => group.items.length > 0)
})

const userRolesLabel = computed(() => {
  const userRoles = authStore.user?.roles || (authStore.user?.role ? [authStore.user.role] : [])
  return userRoles.join(', ')
})

const currentRouteLabel = computed(() => {
  const userRoles = authStore.user?.roles || (authStore.user?.role ? [authStore.user.role] : [])
  for (const group of navigationConfig) {
    const item = group.items.find(i => i.path === route.path && (i.roles as UserRole[]).some(r => userRoles.includes(r)))
    if (item) return item.label
  }
  return 'Halaman'
})

const isActive = (path: string) => {
  return route.path === path
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>
