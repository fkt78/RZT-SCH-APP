import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { hashStudentPassword } from './studentPasswordCrypto.js';

const buildStudentDisplayName = (data) => {
  if (!data || typeof data !== 'object') return '';
  const lastName = data.lastName || data.苗字 || data.姓 || '';
  const firstName = data.firstName || data.名前 || data.名 || '';
  const middleName = data.middleName || data.ミドルネーム || '';
  const nameParts = [];
  if (lastName) nameParts.push(lastName);
  if (middleName && String(middleName).trim() !== '') nameParts.push(middleName);
  if (firstName) nameParts.push(firstName);
  if (nameParts.length > 0) return nameParts.join(' ');
  if (data.name) return String(data.name).trim();
  if (data.studentName) return String(data.studentName).trim();
  if (data.fullName) return String(data.fullName).trim();
  return '';
};

export default function AdminStudentPasswordPanel({ db }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState('');
  const [resetPw, setResetPw] = useState('');
  const [saving, setSaving] = useState(false);
  const [newLast, setNewLast] = useState('');
  const [newFirst, setNewFirst] = useState('');
  const [newPw, setNewPw] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const q = collection(db, 'students');
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        displayName: buildStudentDisplayName(d.data()) || '(氏名なし)',
      }));
      list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'ja'));
      setRows(list);
      setLoading(false);
    }, (err) => {
      console.error('students 購読エラー:', err);
      setLoading(false);
    });
    return () => unsub();
  }, [db]);

  const handleUpdatePassword = async () => {
    if (!selectedId) {
      toast.error('生徒を選択してください');
      return;
    }
    const pw = String(resetPw ?? '').trim();
    if (!pw) {
      toast.error('パスワードを入力してください');
      return;
    }
    setSaving(true);
    try {
      const hashed = await hashStudentPassword(pw);
      await updateDoc(doc(db, 'students', selectedId), {
        password: hashed,
        updatedAt: serverTimestamp(),
      });
      setResetPw('');
      toast.success('パスワードを更新しました（bcrypt で保存済み）');
    } catch (e) {
      toast.error('保存に失敗しました: ' + (e.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleAddStudent = async () => {
    const ln = String(newLast ?? '').trim();
    const fn = String(newFirst ?? '').trim();
    const pw = String(newPw ?? '').trim();
    if (!ln || !fn) {
      toast.error('苗字と名前を入力してください');
      return;
    }
    if (!pw) {
      toast.error('パスワードを入力してください');
      return;
    }
    setAdding(true);
    try {
      const hashed = await hashStudentPassword(pw);
      await addDoc(collection(db, 'students'), {
        lastName: ln,
        firstName: fn,
        password: hashed,
        updatedAt: serverTimestamp(),
      });
      setNewLast('');
      setNewFirst('');
      setNewPw('');
      toast.success('生徒を登録しました（パスワードは bcrypt で保存済み）');
    } catch (e) {
      toast.error('登録に失敗しました: ' + (e.message || e));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
      <h3 className="font-bold text-slate-700 mb-3 text-sm flex items-center gap-2">
        <Key size={18} className="text-amber-600" /> 生徒ログイン用パスワード（bcrypt）
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Firestore の <code className="bg-slate-100 px-1 rounded">students</code> に保存するパスワードは平文ではなくハッシュ化されます。既存の平文パスワードは下記から再設定してください。
      </p>

      <div className="border border-slate-200 rounded-lg p-3 mb-4 space-y-3">
        <p className="text-xs font-bold text-slate-600">既存生徒のパスワードを設定・変更</p>
        {loading ? (
          <p className="text-sm text-slate-400">読み込み中...</p>
        ) : (
          <>
            <select
              value={selectedId}
              onChange={(e) => { setSelectedId(e.target.value); setResetPw(''); }}
              className="w-full p-2 border border-slate-300 rounded-lg text-sm"
            >
              <option value="">生徒を選択</option>
              {rows.map((r) => (
                <option key={r.id} value={r.id}>{r.displayName}</option>
              ))}
            </select>
            <input
              type="password"
              value={resetPw}
              onChange={(e) => setResetPw(e.target.value)}
              placeholder="新しいパスワード"
              className="w-full p-2 border border-slate-300 rounded-lg text-sm"
              autoComplete="new-password"
            />
            <button
              type="button"
              disabled={saving}
              onClick={handleUpdatePassword}
              className="w-full sm:w-auto bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-700 disabled:bg-slate-400"
            >
              {saving ? '保存中…' : 'パスワードを保存'}
            </button>
          </>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg p-3 space-y-3">
        <p className="text-xs font-bold text-slate-600">新規生徒の登録</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <input
            type="text"
            value={newLast}
            onChange={(e) => setNewLast(e.target.value)}
            placeholder="苗字"
            className="p-2 border border-slate-300 rounded-lg text-sm"
            autoComplete="family-name"
          />
          <input
            type="text"
            value={newFirst}
            onChange={(e) => setNewFirst(e.target.value)}
            placeholder="名前"
            className="p-2 border border-slate-300 rounded-lg text-sm"
            autoComplete="given-name"
          />
        </div>
        <input
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="ログインパスワード"
          className="w-full p-2 border border-slate-300 rounded-lg text-sm"
          autoComplete="new-password"
        />
        <button
          type="button"
          disabled={adding}
          onClick={handleAddStudent}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 disabled:bg-slate-400"
        >
          {adding ? '登録中…' : '生徒を登録'}
        </button>
      </div>
    </div>
  );
}
