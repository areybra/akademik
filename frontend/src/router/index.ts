import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import type { UserRole } from '../types'
import LoginPage from '../features/auth/LoginPage.vue'
import DashboardPage from '../features/dashboard/DashboardPage.vue'
import StudentsPage from '../features/students/StudentsPage.vue'
import TeachersPage from '../features/teachers/TeachersPage.vue'
import SchedulePage from '../features/schedule/SchedulePage.vue'
import AttendancePage from '../features/attendance/AttendancePage.vue'
import GradesPage from '../features/grades/GradesPage.vue'
import BillingPage from '../features/billing/BillingPage.vue'
import ClassesPage from '../features/classes/ClassesPage.vue'
import EkskulPage from '../features/ekskul/EkskulPage.vue'
import PrestasiPage from '../features/prestasi/PrestasiPage.vue'
import SettingsPage from '../features/settings/SettingsPage.vue'
import TeachingPage from '../features/teaching/TeachingPage.vue'
import ProfilePage from '../features/profile/ProfilePage.vue'

const ALL_ROLES: UserRole[] = ['admin', 'kepala_sekolah', 'waka', 'guru_mapel', 'wali_kelas', 'kepala_tu', 'staff_tu', 'guru', 'siswa', 'orang_tua']

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/login',
    component: LoginPage,
    meta: { requiresAuth: false, layout: 'auth' }
  },
  {
    path: '/dashboard',
    component: DashboardPage,
    meta: { requiresAuth: true, roles: ALL_ROLES }
  },
  {
    path: '/classes',
    component: ClassesPage,
    meta: { requiresAuth: true, roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu', 'wali_kelas'] }
  },
  {
    path: '/students',
    component: StudentsPage,
    meta: { requiresAuth: true, roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu', 'wali_kelas'] }
  },
  {
    path: '/teachers',
    component: TeachersPage,
    meta: { requiresAuth: true, roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu'] }
  },
  {
    path: '/schedule',
    component: SchedulePage,
    meta: { requiresAuth: true, roles: ALL_ROLES }
  },
  {
    path: '/teaching',
    component: TeachingPage,
    meta: { requiresAuth: true, roles: ['guru', 'guru_mapel', 'wali_kelas'] }
  },
  {
    path: '/profile',
    component: ProfilePage,
    meta: { requiresAuth: true, roles: ['siswa', 'orang_tua'] }
  },
  {
    path: '/attendance',
    component: AttendancePage,
    meta: { requiresAuth: true, roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu', 'siswa', 'orang_tua'] }
  },
  {
    path: '/grades',
    component: GradesPage,
    meta: { requiresAuth: true, roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu', 'siswa', 'orang_tua'] }
  },
  {
    path: '/billing',
    component: BillingPage,
    meta: { requiresAuth: true, roles: ['admin', 'kepala_sekolah', 'waka', 'kepala_tu', 'staff_tu', 'wali_kelas', 'siswa', 'orang_tua'] }
  },
  {
    path: '/ekskul',
    component: EkskulPage,
    meta: { requiresAuth: true, roles: ['admin', 'kepala_sekolah', 'waka', 'guru', 'wali_kelas', 'siswa', 'orang_tua'] }
  },
  {
    path: '/prestasi',
    component: PrestasiPage,
    meta: { requiresAuth: true, roles: ['admin', 'kepala_sekolah', 'waka', 'guru', 'wali_kelas', 'siswa', 'orang_tua'] }
  },
  {
    path: '/settings',
    component: SettingsPage,
    meta: { requiresAuth: true, roles: ['admin'] }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guards
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (!authStore.isAuthenticated) {
    await authStore.initAuth()
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/dashboard')
  } else if (to.meta.roles && !((to.meta.roles as string[]).some((r) => authStore.hasAnyRole([r as UserRole])))) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
