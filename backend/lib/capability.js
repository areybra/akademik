const db = require('../database');

const normalizeSubject = (value) => String(value || '').trim().replace(/\s+/g, ' ');

// Mapel profil disimpan sebagai JSON; rapikan spasi dan buang duplikat tanpa membedakan huruf besar-kecil.
const normalizeSubjects = (list) => {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const subject = normalizeSubject(item);
    if (!subject) continue;
    const key = subject.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(subject);
  }
  return out;
};

const profileForAccount = (userId) =>
  db.prepare(`
    SELECT t.id, t.subjects
    FROM users u JOIN teachers t ON t.id = u.teacher_id
    WHERE u.id = ?
  `).get(userId);

const subjectsForAccount = (userId) => {
  const profile = profileForAccount(userId);
  if (!profile) return [];
  try {
    return normalizeSubjects(JSON.parse(profile.subjects || '[]'));
  } catch {
    return [];
  }
};

const canTeachSubject = (userId, subject) => {
  const target = normalizeSubject(subject).toLowerCase();
  if (!target) return false;
  return subjectsForAccount(userId).some((item) => item.toLowerCase() === target);
};

module.exports = {
  normalizeSubject,
  normalizeSubjects,
  profileForAccount,
  subjectsForAccount,
  canTeachSubject
};
