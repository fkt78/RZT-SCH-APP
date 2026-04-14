/**
 * Firestore `students` ドキュメントから表示名を取得（ログイン画面のドロップダウンと同一ロジック）
 */
export function getStudentDisplayName(data) {
  if (!data || typeof data !== 'object') return '';
  let name = null;
  const lastName = data.lastName || data.苗字 || data.姓 || '';
  const firstName = data.firstName || data.名前 || data.名 || '';
  const middleName = data.middleName || data.ミドルネーム || '';
  const nameParts = [];
  if (lastName) nameParts.push(lastName);
  if (middleName && middleName.trim() !== '') nameParts.push(middleName);
  if (firstName) nameParts.push(firstName);
  if (nameParts.length > 0) {
    name = nameParts.join(' ');
  } else if (data.name) {
    name = data.name;
  } else if (data.名前 && !data.苗字 && !data.lastName) {
    name = data.名前;
  } else if (data.studentName) {
    name = data.studentName;
  } else if (data.fullName) {
    name = data.fullName;
  } else {
    for (const key in data) {
      if (key === 'enrollmentDate' || key === 'birthDate' || key === 'createdAt' || key === 'updatedAt') {
        continue;
      }
      if (typeof data[key] === 'string' && data[key].trim() !== '') {
        name = data[key];
        break;
      }
    }
  }
  if (typeof name !== 'string' || name.trim() === '') return '';
  return name.trim();
}

/** 出欠の氏名と students の表示名を突き合わせるための正規化（空白差を吸収） */
export function normalizeStudentNameKey(s) {
  return String(s ?? '').trim().replace(/\s+/g, '');
}
