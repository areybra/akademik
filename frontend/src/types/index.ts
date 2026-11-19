export type UserRole =
  | 'admin'
  | 'kepala_sekolah'
  | 'waka'
  | 'guru_mapel'
  | 'wali_kelas'
  | 'kepala_tu'
  | 'staff_tu'
  | 'guru'
  | 'siswa'
  | 'orang_tua'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  roles?: UserRole[]
  avatar?: string
  student_id?: string | null
  class?: string | null
}

export interface Student {
  id: string
  name: string
  niup: string
  nisn: string
  class: string
  status: 'siswa aktif' | 'siswa berhenti' | 'siswa lulus'
  gender: 'L' | 'P'
  tgl_lahir: string
  tmp_lahir: string
  provinsi: string
  kabupaten: string
  kecamatan: string
  negara: string
  foto_siswa: string
}

export interface Teacher {
  id: string
  name: string
  niup: string
  nip?: string
  gender: 'L' | 'P'
  pangkat?: string
  pendidikan?: string
  subjects: string[]
  classes: string[]
  foto_guru?: string
  provinsi?: string
  kabupaten?: string
  kecamatan?: string
  negara?: string
}

export interface Announcement {
  id: string
  title: string
  content: string
  author: string
  createdAt: string
  category: 'info' | 'warning' | 'urgent'
}

export interface AttendanceRecord {
  id: string
  studentId: string
  studentName: string
  date: string
  status: 'hadir' | 'izin' | 'alfa'
  note?: string
}

export interface Grade {
  id: string
  studentId: string
  studentName: string
  subject: string
  score: number
  date: string
}

export interface Schedule {
  id: string
  class: string
  time: string
  subject: string
  teacher: string
  teacherId?: string | null
  room: string
  day: string
}

export type BillingStatus = 'requested' | 'pending_verification' | 'paid' | 'rejected'

export interface Bill {
  id: string
  studentId: string
  studentName: string
  amount: number
  period: string
  description?: string
  status: BillingStatus
  paymentProof?: string | null
  proofFilename?: string | null
  createdAt: string
  updatedAt: string
}

export interface Class {
  id: string
  name: string
  major?: string
  teacher: string
  capacity: number
}

export interface Ekskul {
  id: string
  nama: string
  pembina: string
  jadwal: string
  deskripsi: string
}

export interface Prestasi {
  id: string
  studentId: string
  siswa: string
  kelas: string
  kategori: string
  juara: string
  event: string
  tahun: string
}

export interface DashboardSummary {
  generatedAt: string
  audience: 'admin' | 'supervisor' | 'tu' | 'teacher' | 'personal'
  fullAccess: boolean
  counts: {
    students: number
    teachers: number | null
    classes: number
  }
  attendance: {
    referenceDate: string
    isToday: boolean
    today: {
      total: number
      hadir: number
      izin: number
      alfa: number
      percentage: number
    }
    trend: Array<{
      date: string
      hadir: number
      izin: number
      alfa: number
      total: number
    }>
  }
  students: {
    byLevel: Array<{ label: string; count: number }>
    byMajor: Array<{ label: string; count: number }>
    byGender: Array<{ label: string; count: number }>
  }
  grades: {
    average: number
    total: number
    bySubject: Array<{ subject: string; average: number; count: number }>
    distribution: Array<{ label: string; count: number }>
  }
  billing: {
    total: number
    paid: number
    unpaid: number
    amountTotal: number
    amountPaid: number
    amountOutstanding: number
    byStatus: Array<{ status: string; label: string; count: number; amount: number }>
    monthly: Array<{ period: string; total: number; paid: number }>
  }
  topClasses: Array<{ class: string; total: number; hadir: number; rate: number }>
  topStudents: Array<{ name: string; class: string; average: number }>
  teaching?: {
    date: string
    total: number
    submitted: number
    pending: number
    missing: number
    slots: Array<{
      id: string
      time: string
      class: string
      subject: string
      room: string
      filled: number
      total: number
      status: 'locked' | 'complete' | 'partial' | 'empty'
    }>
  } | null
}
