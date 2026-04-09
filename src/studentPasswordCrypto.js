import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Firestore の `students.password` に保存する bcrypt ハッシュを生成する */
export function hashStudentPassword(plain) {
  return bcrypt.hash(String(plain ?? ''), SALT_ROUNDS);
}

/**
 * ログイン時: 入力パスワードと Firestore に保存された値を照合する。
 * bcrypt ハッシュ（$2 で始まる）のみ対応。平文で保存された古いデータは照合失敗（管理者による再設定が必要）。
 */
export async function verifyStudentPassword(plain, stored) {
  const s = String(stored ?? '').trim();
  const p = String(plain ?? '').trim();
  if (!s || !p) return false;
  if (!s.startsWith('$2')) return false;
  try {
    return await bcrypt.compare(p, s);
  } catch {
    return false;
  }
}
