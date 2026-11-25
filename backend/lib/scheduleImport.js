const db = require('../database');
const { normalizeSubject, canTeachSubject } = require('./capability');

const DAY_MAP = {
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu'
};
const DAYS = new Set(Object.values(DAY_MAP));
const MAX_ROWS = 500;

const HEADER_ALIASES = {
  day: ['hari', 'day'],
  class: ['kelas', 'class'],
  subject: ['mapel', 'mata pelajaran', 'subject', 'mata_pelajaran'],
  start: ['jam mulai', 'mulai', 'start', 'jam_mulai'],
  end: ['jam selesai', 'selesai', 'end', 'jam_selesai'],
  time: ['jam', 'waktu', 'time'],
  room: ['ruangan', 'ruang', 'room'],
  email: ['email guru', 'email_guru', 'guru email', 'email', 'guru']
};

const normalizeHeader = (value) => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
const pad = (value) => String(value).padStart(2, '0');

function detectDelimiter(line) {
  const commas = (line.match(/,/g) || []).length;
  const semicolons = (line.match(/;/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

// Parser CSV sederhana: kutip ganda, kutip ter-escape, CRLF, pemisah koma atau titik koma.
function parseCsv(text) {
  const source = String(text || '').replace(/^\uFEFF/, '');
  const firstLine = source.split(/\r?\n/)[0] || '';
  const delimiter = detectDelimiter(firstLine);
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }
    if (char === '\r') continue;
    field += char;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => String(cell).trim() !== ''));
}

function mapHeaders(headerRow) {
  const map = {};
  headerRow.forEach((cell, index) => {
    const key = normalizeHeader(cell);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (map[field] === undefined && aliases.includes(key)) map[field] = index;
    }
  });
  return map;
}

function normalizeTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return `${pad(hours)}:${pad(minutes)}`;
}

function splitTime(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}[:.]\d{2})\s*[-–]\s*(\d{1,2}[:.]\d{2})$/);
  return match ? [match[1], match[2]] : [null, null];
}

const minutesOf = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const scheduleKey = (className, day, start) => `${className}\u0000${day}\u0000${start}`;
const assignmentKey = (className, subject) => `${className}\u0000${subject}`;
const formatTime = (start, end) => `${start} - ${end}`;

function teacherAccounts() {
  return db
    .prepare("SELECT id, name, email, role, roles FROM users WHERE role IN ('guru', 'guru_mapel') OR roles LIKE '%guru%'")
    .all();
}

function planScheduleImport({ text, mode = 'merge', syncAssignments = false }) {
  const errors = [];
  const warnings = [];
  const rows = [];
  const parsed = parseCsv(text);
  const report = (extra = {}) => ({
    mode,
    errors,
    warnings,
    rows,
    summary: {
      create: 0,
      update: 0,
      same: 0,
      error: 0,
      delete: 0,
      assignmentCreate: 0,
      assignmentUpdate: 0
    },
    assignmentChanges: [],
    ...extra
  });

  if (parsed.length === 0) {
    errors.push({ row: 1, message: 'File kosong. Unduh template lalu isi minimal satu baris.' });
    return report();
  }

  const headers = mapHeaders(parsed[0]);
  const missing = ['day', 'class', 'subject', 'room'].filter((field) => headers[field] === undefined);
  const hasStartEnd = headers.start !== undefined && headers.end !== undefined;
  if (!hasStartEnd && headers.time === undefined) missing.push('start', 'end');
  if (missing.length > 0) {
    errors.push({
      row: 1,
      message: `Kolom wajib tidak ditemukan: ${missing.join(', ')}. Gunakan template yang disediakan.`
    });
    return report();
  }

  if (parsed.length - 1 > MAX_ROWS) {
    errors.push({ row: 1, message: `Maksimal ${MAX_ROWS} baris per impor.` });
    return report();
  }

  const teachers = teacherAccounts();
  const teacherById = new Map(teachers.map((teacher) => [teacher.id, teacher]));
  const teacherByEmail = new Map(teachers.map((teacher) => [String(teacher.email || '').toLowerCase(), teacher]));
  const existingAssignments = new Map(
    db
      .prepare('SELECT id, teacher_id, subject, class FROM teacher_assignments')
      .all()
      .map((assignment) => [assignmentKey(assignment.class, assignment.subject), assignment])
  );
  const existingSchedules = db.prepare('SELECT * FROM schedules').all();
  const existingByKey = new Map();
  let duplicateExisting = 0;
  for (const schedule of existingSchedules) {
    const [start] = splitTime(schedule.time);
    if (!start) continue;
    const key = scheduleKey(schedule.class, schedule.day, start);
    if (existingByKey.has(key)) duplicateExisting += 1;
    else existingByKey.set(key, schedule);
  }
  if (duplicateExisting > 0 && mode === 'merge') {
    warnings.push({
      row: 1,
      message: `${duplicateExisting} jadwal lama punya kelas, hari, dan jam mulai yang sama. Baris pertama dipakai untuk pembaruan.`
    });
  }

  const plannedAssignments = new Map();
  const fileKeys = new Set();
  const intervals = new Map();

  for (let index = 1; index < parsed.length; index += 1) {
    const rowNumber = index + 1;
    const cells = parsed[index];
    const get = (field) => (headers[field] === undefined ? '' : String(cells[headers[field]] ?? '').trim());

    const dayInput = get('day');
    const day = DAY_MAP[dayInput.toLowerCase()] || '';
    const className = get('class');
    const subject = normalizeSubject(get('subject'));
    const room = get('room');
    const email = get('email').toLowerCase();

    let start = null;
    let end = null;
    if (headers.start !== undefined || headers.end !== undefined) {
      start = normalizeTime(get('start'));
      end = normalizeTime(get('end'));
    } else {
      const [rawStart, rawEnd] = splitTime(get('time'));
      start = normalizeTime(rawStart);
      end = normalizeTime(rawEnd);
    }

    const rowErrors = [];
    if (!day) rowErrors.push('Hari harus Senin sampai Sabtu');
    if (!className) rowErrors.push('Kelas wajib diisi');
    if (!subject) rowErrors.push('Mapel wajib diisi');
    if (!room) rowErrors.push('Ruangan wajib diisi');
    if (!start) rowErrors.push('Jam mulai harus berformat HH:MM');
    if (!end) rowErrors.push('Jam selesai harus berformat HH:MM');
    if (start && end && minutesOf(end) <= minutesOf(start)) {
      rowErrors.push('Jam selesai harus lebih besar dari jam mulai');
    }

    let key = null;
    if (day && className && start) {
      key = scheduleKey(className, day, start);
      if (fileKeys.has(key)) rowErrors.push('Baris ganda untuk kelas, hari, dan jam mulai yang sama');
      else fileKeys.add(key);
    }

    let teacher = null;
    if (email) {
      teacher = teacherByEmail.get(email) || null;
      if (!teacher) rowErrors.push(`Email guru ${email} tidak ditemukan`);
    }

    const assignment = className && subject ? existingAssignments.get(assignmentKey(className, subject)) : null;
    const owner = assignment ? teacherById.get(assignment.teacher_id) : null;
    let effectiveTeacher = owner;

    if (className && subject) {
      const assignKey = assignmentKey(className, subject);
      const planned = plannedAssignments.get(assignKey);
      if (planned) {
        if (email && planned.teacher.id !== teacher?.id) {
          rowErrors.push(`Guru untuk ${subject} di ${className} berbeda dengan baris lain di file ini`);
        } else {
          effectiveTeacher = planned.teacher;
        }
      } else if (assignment) {
        if (email && teacher && teacher.id !== assignment.teacher_id) {
          if (!syncAssignments) {
            rowErrors.push(`Mapel ${subject} di ${className} diampu ${owner?.name || 'guru lain'}. Centang selaraskan guru untuk memindahkan.`);
          } else if (!canTeachSubject(teacher.id, subject)) {
            rowErrors.push(`${teacher.name} tidak mencantumkan ${subject} di Data Guru`);
          } else {
            plannedAssignments.set(assignKey, {
              action: 'update',
              id: assignment.id,
              className,
              subject,
              teacher,
              from: owner
            });
            effectiveTeacher = teacher;
          }
        }
      } else {
        if (!teacher) {
          rowErrors.push(
            email
              ? `Email guru ${email} tidak ditemukan`
              : `Email guru wajib diisi karena ${subject} di ${className} belum punya penugasan`
          );
        } else if (!canTeachSubject(teacher.id, subject)) {
          rowErrors.push(`${teacher.name} tidak mencantumkan ${subject} di Data Guru`);
        } else {
          plannedAssignments.set(assignKey, {
            action: 'create',
            className,
            subject,
            teacher,
            from: null
          });
          effectiveTeacher = teacher;
        }
      }
    }

    let action = 'create';
    let message = '';
    const existing = key ? existingByKey.get(key) : null;
    if (rowErrors.length > 0) {
      action = 'error';
      message = rowErrors.join('. ');
    } else if (existing) {
      const same =
        existing.class === className &&
        existing.day === day &&
        existing.subject === subject &&
        existing.time === formatTime(start, end) &&
        existing.room === room &&
        existing.teacher_id === effectiveTeacher?.id;
      action = same ? 'same' : 'update';
    }

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join('. ') });
    }

    if (key && !rowErrors.length) {
      const list = intervals.get(`${className}\u0000${day}`) || [];
      list.push({ row: rowNumber, start, end, key });
      intervals.set(`${className}\u0000${day}`, list);
    }

    rows.push({
      row: rowNumber,
      action,
      message,
      class: className,
      day,
      subject,
      start,
      end,
      time: start && end ? formatTime(start, end) : '',
      room,
      teacherEmail: effectiveTeacher?.email || email,
      teacherName: effectiveTeacher?.name || '',
      existingId: existing?.id || null
    });
  }

  if (errors.length === 0) {
    for (const list of intervals.values()) {
      const sorted = [...list].sort((a, b) => minutesOf(a.start) - minutesOf(b.start));
      for (let index = 1; index < sorted.length; index += 1) {
        if (minutesOf(sorted[index].start) < minutesOf(sorted[index - 1].end)) {
          errors.push({
            row: sorted[index].row,
            message: `Jam bertabrakan dengan baris ${sorted[index - 1].row} pada kelas dan hari yang sama`
          });
          const target = rows.find((item) => item.row === sorted[index].row);
          if (target && target.action !== 'error') {
            target.action = 'error';
            target.message = 'Jam bertabrakan dengan baris lain di file ini';
          }
        }
      }
    }

    if (mode === 'merge') {
      for (const [groupKey, list] of intervals.entries()) {
        const [className, day] = groupKey.split('\u0000');
        for (const item of list) {
          for (const schedule of existingSchedules) {
            if (schedule.class !== className || schedule.day !== day) continue;
            const scheduleKeyValue = scheduleKey(schedule.class, schedule.day, splitTime(schedule.time)[0] || '');
            if (fileKeys.has(scheduleKeyValue)) continue;
            const [rawStart, rawEnd] = splitTime(schedule.time);
            const existingStart = normalizeTime(rawStart);
            const existingEnd = normalizeTime(rawEnd);
            if (!existingStart || !existingEnd) continue;
            if (minutesOf(item.start) < minutesOf(existingEnd) && minutesOf(existingStart) < minutesOf(item.end)) {
              errors.push({
                row: item.row,
                message: `Jam bertabrakan dengan jadwal yang sudah ada (${schedule.subject}, ${schedule.time})`
              });
              const target = rows.find((rowItem) => rowItem.row === item.row);
              if (target && target.action !== 'error') {
                target.action = 'error';
                target.message = 'Jam bertabrakan dengan jadwal yang sudah ada';
              }
            }
          }
        }
      }
    }
  }

  const assignmentChanges = [...plannedAssignments.values()].map((change) => ({
    action: change.action,
    class: change.className,
    subject: change.subject,
    from: change.from?.email || null,
    fromName: change.from?.name || null,
    to: change.teacher.email,
    toName: change.teacher.name
  }));

  const summary = {
    create: rows.filter((row) => row.action === 'create').length,
    update: rows.filter((row) => row.action === 'update').length,
    same: rows.filter((row) => row.action === 'same').length,
    error: rows.filter((row) => row.action === 'error').length,
    delete: mode === 'replace' ? existingSchedules.length : 0,
    assignmentCreate: assignmentChanges.filter((change) => change.action === 'create').length,
    assignmentUpdate: assignmentChanges.filter((change) => change.action === 'update').length
  };

  return report({ summary, assignmentChanges });
}

function applyScheduleImport(options) {
  const plan = planScheduleImport(options);
  if (plan.errors.length > 0) {
    return { ...plan, applied: false };
  }

  const teacherById = new Map(teacherAccounts().map((teacher) => [teacher.id, teacher]));
  const assignments = new Map(
    db
      .prepare('SELECT id, teacher_id, subject, class FROM teacher_assignments')
      .all()
      .map((assignment) => [assignmentKey(assignment.class, assignment.subject), assignment])
  );
  const existingSchedules = db.prepare('SELECT * FROM schedules').all();
  const existingByKey = new Map();
  for (const schedule of existingSchedules) {
    const [start] = splitTime(schedule.time);
    if (!start) continue;
    const key = scheduleKey(schedule.class, schedule.day, start);
    if (!existingByKey.has(key)) existingByKey.set(key, schedule);
  }

  const insertSchedule = db.prepare(`
    INSERT INTO schedules (id, class, time, subject, teacher, teacher_id, room, day)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const updateSchedule = db.prepare(`
    UPDATE schedules SET class = ?, time = ?, subject = ?, teacher = ?, teacher_id = ?, room = ?, day = ?
    WHERE id = ?
  `);
  const insertAssignment = db.prepare(
    'INSERT INTO teacher_assignments (id, teacher_id, subject, class) VALUES (?, ?, ?, ?)'
  );
  const updateAssignment = db.prepare('UPDATE teacher_assignments SET teacher_id = ? WHERE id = ?');
  const syncSchedules = db.prepare(
    'UPDATE schedules SET teacher_id = ?, teacher = ? WHERE class = ? AND subject = ?'
  );

  db.transaction(() => {
    for (const change of plan.assignmentChanges) {
      const key = assignmentKey(change.class, change.subject);
      const teacher = [...teacherById.values()].find((item) => item.email === change.to);
      if (!teacher) continue;
      if (change.action === 'update') {
        const assignment = assignments.get(key);
        if (assignment) {
          updateAssignment.run(teacher.id, assignment.id);
          syncSchedules.run(teacher.id, teacher.name, change.class, change.subject);
        }
      } else {
        const id = `assign-${teacher.id}-${change.subject}-${change.class}-${Date.now()}`
          .replace(/\s+/g, '-')
          .toLowerCase();
        insertAssignment.run(id, teacher.id, change.subject, change.class);
      }
    }

    for (const row of plan.rows) {
      if (row.action === 'error') continue;
      const teacher = [...teacherById.values()].find((item) => item.email === row.teacherEmail);
      const teacherId = teacher?.id || null;
      const teacherName = teacher?.name || '';
      if (row.action === 'update' && row.existingId) {
        updateSchedule.run(
          row.class,
          row.time,
          row.subject,
          teacherName,
          teacherId,
          row.room,
          row.day,
          row.existingId
        );
      } else if (row.action === 'create') {
        insertSchedule.run(
          `imp-${Date.now()}-${row.row}-${Math.random().toString(36).slice(2, 7)}`,
          row.class,
          row.time,
          row.subject,
          teacherName,
          teacherId,
          row.room,
          row.day
        );
      }
    }

    if (plan.mode === 'replace') {
      const keep = new Set(plan.rows.filter((row) => row.existingId).map((row) => row.existingId));
      for (const schedule of existingSchedules) {
        if (!keep.has(schedule.id)) {
          db.prepare('DELETE FROM schedules WHERE id = ?').run(schedule.id);
        }
      }
    }
  })();

  return { ...plan, applied: true };
}

module.exports = { parseCsv, planScheduleImport, applyScheduleImport };
