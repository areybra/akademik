// Smoke test akun admin + relasi. Jalankan dengan server hidup:
//   node smoke-accounts.mjs
// Base bisa dioverride: SMOKE_BASE=http://localhost:3100/api
const BASE = process.env.SMOKE_BASE || `http://localhost:${process.env.PORT || 3000}/api`;
const stamp = Date.now();
const parentEmail = `smoke-ortu-${stamp}@example.com`;
const teacherEmail = `smoke-guru-${stamp}@example.com`;
const PASSWORD = 'rahasia123';

const results = [];
const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, actual, expected, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: ${JSON.stringify(actual)} (expected ${JSON.stringify(expected)})`);
};

const request = async (token, method, path, body) => {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    /* respons tanpa JSON */
  }
  return { status: response.status, body: payload };
};

const login = async (email, password) => {
  const response = await request(null, 'POST', '/auth/login', { email, password });
  return { ...response, token: response.body?.token || null };
};

const createdIds = [];

const run = async () => {
  // 1. Login admin demo.
  const admin = await login('admin@example.com', 'Password123');
  check('login admin demo', admin.status, 200);
  if (!admin.token) throw new Error('Token admin tidak didapat, smoke test berhenti.');
  const adminToken = admin.token;

  // 2. Buat akun orang tua + relasi anak.
  const createParent = await request(adminToken, 'POST', '/users', {
    name: 'Smoke Orang Tua',
    email: parentEmail,
    password: PASSWORD,
    role: 'orang_tua',
    parentStudentIds: ['std-001']
  });
  check('POST /users ortu = 201', createParent.status, 201);
  check('akun ortu punya parentStudentIds', createParent.body?.parentStudentIds, ['std-001']);
  if (createParent.body?.id) createdIds.push(createParent.body.id);

  // 3. Email duplikat ditolak.
  const duplicate = await request(adminToken, 'POST', '/users', {
    name: 'Smoke Duplikat',
    email: parentEmail.toUpperCase(),
    password: PASSWORD,
    role: 'orang_tua',
    parentStudentIds: ['std-001']
  });
  check('POST email duplikat (case-insensitive) = 409', duplicate.status, 409);

  // 4. Login ortu baru lalu baca portal.
  const parent = await login(parentEmail, PASSWORD);
  check('login ortu baru', parent.status, 200);
  const parentToken = parent.token;
  if (!parentToken) throw new Error('Token ortu baru tidak didapat.');
  const portal = await request(parentToken, 'GET', '/portal/summary');
  check('GET /portal/summary ortu = 200', portal.status, 200);
  check('portal children[0].id = std-001', portal.body?.children?.[0]?.id, 'std-001');

  // 5. Buat akun guru_mapel + penugasan.
  const createTeacher = await request(adminToken, 'POST', '/users', {
    name: 'Smoke Guru Mapel',
    email: teacherEmail,
    password: PASSWORD,
    role: 'guru_mapel',
    assignments: [{ subject: 'Bahasa Inggris', class: 'XI RPL 1' }]
  });
  check('POST /users guru_mapel = 201', createTeacher.status, 201);
  check('akun guru punya 1 penugasan', createTeacher.body?.assignments?.length, 1);
  if (createTeacher.body?.id) createdIds.push(createTeacher.body.id);

  // 6. Login guru baru lalu baca penugasan mengajar.
  const teacher = await login(teacherEmail, PASSWORD);
  check('login guru baru', teacher.status, 200);
  const teacherToken = teacher.token;
  if (!teacherToken) throw new Error('Token guru baru tidak didapat.');
  const teaching = await request(teacherToken, 'GET', '/teaching/today');
  check('GET /teaching/today guru = 200', teaching.status, 200);
  check('teaching assignments >= 1', (teaching.body?.assignments?.length || 0) >= 1, true);

  // 7. Update tanpa password: hash lama harus dipertahankan.
  const rename = await request(adminToken, 'PUT', `/users/${createParent.body.id}`, {
    name: 'Smoke Orang Tua Diubah'
  });
  check('PUT tanpa password = 200', rename.status, 200);
  const reloginParent = await login(parentEmail, PASSWORD);
  check('password lama masih berlaku setelah PUT', reloginParent.status, 200);

  // 8. Guru tidak boleh mengelola akun.
  const forbidden = await request(teacherToken, 'POST', '/users', {
    name: 'Smoke Ilegal',
    email: `smoke-illegal-${stamp}@example.com`,
    password: PASSWORD,
    role: 'orang_tua',
    parentStudentIds: ['std-001']
  });
  check('guru POST /users = 403', forbidden.status, 403);

  // 9. Nonaktifkan akun ortu: login baru 403, token lama 401.
  const deactivate = await request(adminToken, 'PUT', `/users/${createParent.body.id}`, { active: false });
  check('PUT active=false = 200', deactivate.status, 200);
  const inactiveLogin = await login(parentEmail, PASSWORD);
  check('login akun nonaktif = 403', inactiveLogin.status, 403);
  const staleToken = await request(parentToken, 'GET', '/portal/summary');
  check('token lama akun nonaktif = 401', staleToken.status, 401);

  // 10. Akun demo tetap bisa login.
  const demoParent = await login('ortu@smk.id', 'ortu123');
  check('login demo ortu tetap sukses', demoParent.status, 200);
  const demoTeacher = await login('guru@smk.id', 'guru123');
  check('login demo guru tetap sukses', demoTeacher.status, 200);

  // 11. Hapus akun uji lalu pastikan relasinya ikut hilang.
  for (const id of createdIds) {
    const removed = await request(adminToken, 'DELETE', `/users/${id}`);
    check(`DELETE /users/${id} = 200`, removed.status, 200);
  }
  const relations = await request(adminToken, 'GET', '/relations/parents');
  const leftoverParents = (relations.body || []).filter((item) => item.parent_email === parentEmail);
  check('relasi parent_students akun uji terhapus', leftoverParents.length, 0);
  const assignmentList = await request(adminToken, 'GET', '/relations/teacher-assignments');
  const leftoverAssignments = (assignmentList.body || []).filter((item) => item.teacher_email === teacherEmail);
  check('penugasan akun uji terhapus', leftoverAssignments.length, 0);

  const failed = results.filter((item) => !item.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) {
    console.log('FAILURES:', JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
};

try {
  await run();
} catch (error) {
  console.error('SMOKE ERROR:', error.message);
  process.exitCode = 1;
}
