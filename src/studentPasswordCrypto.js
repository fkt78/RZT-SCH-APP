import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Firestore の `students.password` に保存する bcrypt ハッシュを生成する */
export function hashStudentPassword(plain) {
  return bcrypt.hash(String(plain ?? ''), SALT_ROUNDS);
}

/**
 * ログイン時: 入力パスワードと Firestore に保存された値を照合する。
 * - bcrypt ハッシュ（$2 で始まる）→ bcrypt.compare
 * - それ以外（従来の平文）→ 文字列の一致
 */
export async function verifyStudentPassword(plain, stored) {
  const s = String(stored ?? '').trim();
  const p = String(plain ?? '').trim();
  if (!s || !p) return false;
  if (s.startsWith('$2')) {
    try {
      return await bcrypt.compare(p, s);
    } catch {
      return false;
    }
  }
  return p === s;
}
