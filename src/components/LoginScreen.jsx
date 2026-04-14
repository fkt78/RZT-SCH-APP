import React, { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { Activity, User, Settings } from 'lucide-react';
import toast from 'react-hot-toast';
import { APP_VERSION_LABEL } from '../appVersion';

export default function LoginScreen({ onLogin, db }) {
  const [students, setStudents] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedInstructor, setSelectedInstructor] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(false);

  useEffect(() => {
    setLoadingStudents(true);
    const q = collection(db, "students");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentList = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        let name = null;
        if (data && typeof data === 'object') {
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
        } else if (typeof data === 'string') {
          name = data;
        }
        if (name && typeof name === 'string' && name.trim() !== '') {
          studentList.push(name.trim());
        }
      });
      const uniqueNames = [...new Set(studentList)];
      uniqueNames.sort((a, b) => a.localeCompare(b, 'ja'));
      setStudents(uniqueNames);
      setLoadingStudents(false);
    }, (error) => {
      console.error("生徒データ取得エラー:", error);
      toast.error("生徒データの取得に失敗しました: " + error.message);
      setLoadingStudents(false);
    });
    return () => unsubscribe();
  }, [db]);

  useEffect(() => {
    setLoadingInstructors(true);
    const q = collection(db, "instructors");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const instructorList = [];
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        let name = null;
        if (data && typeof data === 'object') {
          if (data.name) {
            name = data.name;
          } else {
            const lastName = data.lastName || data.苗字 || data.姓 || '';
            const firstName = data.firstName || data.名前 || data.名 || '';
            const middleName = data.middleName || data.ミドルネーム || '';
            const nameParts = [];
            if (lastName) nameParts.push(lastName);
            if (middleName && middleName.trim() !== '') nameParts.push(middleName);
            if (firstName) nameParts.push(firstName);
            if (nameParts.length > 0) {
              name = nameParts.join(' ');
            }
          }
          if (!name) {
            if (data.名前 && !data.苗字 && !data.lastName) {
              name = data.名前;
            } else if (data.instructorName) {
              name = data.instructorName;
            } else if (data.fullName) {
              name = data.fullName;
            }
          }
        } else if (typeof data === 'string') {
          name = data;
        }
        if (name && typeof name === 'string' && name.trim() !== '') {
          instructorList.push(name.trim());
        }
      });
      const uniqueNames = [...new Set(instructorList)];
      uniqueNames.sort((a, b) => a.localeCompare(b, 'ja'));
      setInstructors(uniqueNames);
      setLoadingInstructors(false);
    }, (error) => {
      console.error("管理者データ取得エラー:", error);
      toast.error("管理者データの取得に失敗しました: " + error.message);
      setLoadingInstructors(false);
    });
    return () => unsubscribe();
  }, [db]);

  const handleStudentLogin = async () => {
    if (!selectedStudent) {
      toast.error("生徒を選択してください");
      return;
    }
    try {
      await onLogin(selectedStudent, 'member', studentPassword);
    } catch (error) {
      console.error("生徒ログインエラー:", error);
      toast.error("ログインエラー: " + error.message);
    }
  };

  const handleInstructorLogin = async () => {
    if (!selectedInstructor) {
      toast.error("管理者を選択してください");
      return;
    }
    try {
      await onLogin(selectedInstructor, 'admin');
    } catch (error) {
      console.error("管理者ログインエラー:", error);
      toast.error("ログインエラー: " + error.message);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Activity size={48} className="text-blue-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">リズトレカレンダー</h1>
        <p className="text-slate-500 mb-6 text-center">レッスン日程・出欠共有アプリ</p>
        <div className="mb-6 flex justify-center">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-full">
            現在のバージョン: {APP_VERSION_LABEL}
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <User size={20} className="text-blue-600" />
              生徒を選択してください
            </h2>
            {loadingStudents ? (
              <div className="text-center text-slate-400 py-4 text-sm">読み込み中...</div>
            ) : students.length === 0 ? (
              <div className="text-center text-slate-400 py-4 border-2 border-dashed rounded-lg text-sm">
                <p>生徒が登録されていません</p>
              </div>
            ) : (
              <>
                <select
                  value={selectedStudent}
                  onChange={(e) => { setSelectedStudent(e.target.value); setStudentPassword(''); }}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                >
                  <option value="">選択してください</option>
                  {students.map((userName, index) => (
                    <option key={index} value={userName}>
                      {userName}
                    </option>
                  ))}
                </select>
                {selectedStudent && (
                  <>
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">パスワード（必須）</label>
                      <input
                        type="password"
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                        placeholder="パスワードを入力"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
                      />
                      <p className="text-xs text-slate-500 mt-0.5">※ 名前とパスワードの両方が一致したときだけログインできます。</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        handleStudentLogin();
                      }}
                      className="w-full mt-2 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md"
                    >
                      ログイン
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Settings size={20} className="text-green-600" />
              管理者を選択してください
            </h2>
            {loadingInstructors ? (
              <div className="text-center text-slate-400 py-4 text-sm">読み込み中...</div>
            ) : instructors.length === 0 ? (
              <div className="text-center text-slate-400 py-4 border-2 border-dashed rounded-lg text-sm">
                <p>管理者が登録されていません</p>
              </div>
            ) : (
              <>
                <select
                  value={selectedInstructor}
                  onChange={(e) => setSelectedInstructor(e.target.value)}
                  className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white text-slate-700"
                >
                  <option value="">選択してください</option>
                  {instructors.map((userName, index) => (
                    <option key={index} value={userName}>
                      {userName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleInstructorLogin();
                  }}
                  disabled={!selectedInstructor}
                  className="w-full mt-2 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  管理者としてログイン
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
