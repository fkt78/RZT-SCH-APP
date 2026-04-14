import React, { useState, useEffect } from 'react';
import { verifyStudentPassword } from './studentPasswordCrypto';
import { APP_VERSION_LABEL } from './appVersion';
import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, serverTimestamp
} from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged, signOut, setPersistence, inMemoryPersistence } from "firebase/auth";
import {
  Activity, Calendar, LogOut,
  Home, Settings, List, Users, AlertCircle, XCircle, Award, RefreshCw
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import LoginScreen from './components/LoginScreen';
import HomeBoard from './components/HomeBoard';
import CalendarView from './components/CalendarView';
import StudentGradesView from './components/StudentGradesView';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';

// --- 1. Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyCO4HcceGbMowW3O27a52NcslEuz-H1jdA",
  authDomain: "rizutore-6adb2.firebaseapp.com",
  projectId: "rizutore-6adb2",
  storageBucket: "rizutore-6adb2.firebasestorage.app",
  messagingSenderId: "787141528970",
  appId: "1:787141528970:web:87c073d27fee57206d4c73",
  measurementId: "G-EWLQHZ42FN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
// リロード時に必ずログイン画面から開始したいので、永続化しない設定にする
setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.error("認証永続化設定エラー:", error);
});

// --- 2. Main Application Component ---

function AppShell() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // Default to Home (掲示板)
  const [showPinCodeModal, setShowPinCodeModal] = useState(false);
  const [pendingInstructorName, setPendingInstructorName] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // Service Worker の更新を監視
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // 定期的に更新をチェック（1分ごと）
        setInterval(() => {
          registration.update();
        }, 60 * 1000);

        // 更新が見つかった時
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // 新しいバージョンが利用可能
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }
  }, []);

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "app_users", currentUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUserProfile(snap.data());
        }
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    if (data.name) return data.name;
    if (data.studentName) return data.studentName;
    if (data.fullName) return data.fullName;
    return '';
  };

  /** ログイン画面の管理者リスト生成ロジックと同一（ドキュメントIDに依存しない） */
  const buildInstructorDisplayName = (data) => {
    if (!data || typeof data !== 'object') return '';
    if (data.name) return String(data.name).trim();
    const lastName = data.lastName || data.苗字 || data.姓 || '';
    const firstName = data.firstName || data.名前 || data.名 || '';
    const middleName = data.middleName || data.ミドルネーム || '';
    const nameParts = [];
    if (lastName) nameParts.push(lastName);
    if (middleName && String(middleName).trim() !== '') nameParts.push(middleName);
    if (firstName) nameParts.push(firstName);
    if (nameParts.length > 0) return nameParts.join(' ');
    if (data.名前 && !data.苗字 && !data.lastName) return String(data.名前).trim();
    if (data.instructorName) return String(data.instructorName).trim();
    if (data.fullName) return String(data.fullName).trim();
    return '';
  };

  const doStudentSignIn = async (userName) => {
    const userCredential = await signInAnonymously(auth);
    const profile = { name: userName, updatedAt: serverTimestamp(), role: 'member' };
    await setDoc(doc(db, "app_users", userCredential.user.uid), profile, { merge: true });
    setUserProfile({ name: userName, role: 'member' });
  };

  const handleLoginWithUser = async (userName, userRole, studentPassword = '') => {
    try {
      if (userRole === 'admin') {
        setPendingInstructorName(userName);
        setShowPinCodeModal(true);
        return;
      }

      // 生徒: 名前とパスワードの両方が一致したときだけログイン可能
      if (userRole === 'member') {
        const normForMatch = (s) => String(s ?? '').trim().replace(/\s+/g, '');
        const snap = await getDocs(collection(db, 'students'));
        const userNameNorm = normForMatch(userName);
        let matchedDoc = null;
        for (const d of snap.docs) {
          const data = d.data();
          const displayName = buildStudentDisplayName(data);
          if (normForMatch(displayName) !== userNameNorm) continue;
          matchedDoc = d;
          break;
        }
        if (!matchedDoc) {
          toast.error('該当する生徒が見つかりません。');
          return;
        }
        const storedPassword = matchedDoc.data().password;
        const hasPassword = storedPassword != null && String(storedPassword).trim() !== '';
        if (!hasPassword) {
          toast.error('この生徒にはパスワードが設定されていません。管理者に連絡してください。');
          return;
        }
        if (!studentPassword || String(studentPassword).trim() === '') {
          toast.error('パスワードを入力してください');
          return;
        }
        const inputTrimmed = String(studentPassword ?? '').trim();
        const passwordOk = await verifyStudentPassword(inputTrimmed, storedPassword);
        if (!passwordOk) {
          toast.error('パスワードが正しくありません。');
          return;
        }
        await doStudentSignIn(userName);
        return;
      }

      await doStudentSignIn(userName);
    } catch (error) {
      console.error("ログインエラー詳細:", error);
      toast.error("ログインエラー: " + (error.message || error.code || "不明なエラーが発生しました"));
    }
  };

  const handlePinCodeVerify = async (userName, pinCode) => {
    try {
      const normForMatch = (s) => String(s ?? '').trim().replace(/\s+/g, '');
      const snap = await getDocs(collection(db, 'instructors'));
      const userNameNorm = normForMatch(userName);
      let matchedDoc = null;
      for (const d of snap.docs) {
        const data = d.data();
        const displayName = buildInstructorDisplayName(data);
        if (normForMatch(displayName) !== userNameNorm) continue;
        matchedDoc = d;
        break;
      }
      if (!matchedDoc) {
        toast.error('該当する管理者が見つかりません。名前の表記を確認してください。');
        return;
      }

      const data = matchedDoc.data();
      const correctPin = data.pin;
      if (correctPin === null || correctPin === undefined || String(correctPin).trim() === '') {
        toast.error('この管理者にピンコードが設定されていません。Firestore の instructors で該当ドキュメントに pin を設定してください。');
        return;
      }

      const normalizedInput = String(pinCode).trim();
      const normalizedCorrect = String(correctPin).trim();
      if (normalizedInput !== normalizedCorrect) {
        toast.error('ピンコードが正しくありません');
        return;
      }

      const userCredential = await signInAnonymously(auth);
      const profile = {
        name: userName,
        updatedAt: serverTimestamp(),
        role: 'admin',
        pinVerified: true
      };
      await setDoc(doc(db, "app_users", userCredential.user.uid), profile, { merge: true });
      setUserProfile({ name: userName, role: 'admin', pinVerified: true });
      setShowPinCodeModal(false);
      setPendingInstructorName(null);
    } catch (error) {
      console.error("ピンコード検証エラー:", error);
      toast.error("ピンコード検証エラー: " + error.message);
    }
  };

  // 管理者画面へのアクセス制御
  useEffect(() => {
    if (userProfile && userProfile.role !== 'admin' && activeTab === 'admin') {
      setActiveTab('calendar'); // 管理者以外は管理者画面にアクセスできない
    }
  }, [userProfile, activeTab]);

  // 開発時のみ: ?errorBoundaryTest=1 で Error Boundary の表示を確認（本番ビルドでは無効）
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    if (new URLSearchParams(window.location.search).get('errorBoundaryTest') === '1') {
      throw new Error('ErrorBoundary 動作確認用');
    }
  }

  if (loading) return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>
    </>
  );

  if (showPinCodeModal) {
    return (
      <>
        <Toaster position="top-right" />
        <div className="flex h-screen items-center justify-center bg-slate-100">
          <PinCodeModal
            onVerify={handlePinCodeVerify}
            onCancel={() => {
              setShowPinCodeModal(false);
              setPendingInstructorName(null);
            }}
            instructorName={pendingInstructorName}
          />
        </div>
      </>
    );
  }

  if (!user) return (
    <>
      <Toaster position="top-right" />
      <LoginScreen onLogin={handleLoginWithUser} db={db} />
    </>
  );
  if (!userProfile?.name) return (
    <>
      <Toaster position="top-right" />
      <div className="flex h-screen items-center justify-center text-slate-500">Loading...</div>
    </>
  );

  return (
    <>
    <Toaster position="top-right" />
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* 更新通知バナー */}
      {updateAvailable && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-xl flex items-center gap-3 animate-in slide-in-from-top">
          <AlertCircle size={20} />
          <div>
            <div className="font-bold text-sm">新しいバージョンがあります</div>
            <div className="text-xs opacity-90">更新して最新機能を利用しましょう</div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-white text-blue-600 px-4 py-2 rounded font-bold text-sm hover:bg-blue-50 transition ml-2"
          >
            今すぐ更新
          </button>
          <button
            onClick={() => setUpdateAvailable(false)}
            className="text-white hover:text-blue-200 transition"
          >
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* Sidebar / Bottom Nav */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={() => signOut(auth)}
        userRole={userProfile?.role}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header activeTab={activeTab} userProfile={userProfile} />

        <main className="flex-1 relative bg-slate-100 overflow-hidden">
          {activeTab === 'home' && <HomeBoard db={db} user={user} userProfile={userProfile} />}
          {activeTab === 'calendar' && <CalendarView db={db} user={user} userProfile={userProfile} />}
          {activeTab === 'grades' && <StudentGradesView db={db} userProfile={userProfile} />}
          {activeTab === 'admin' && userProfile?.role === 'admin' && <AdminDashboard db={db} user={user} />}
          {activeTab === 'admin' && userProfile?.role !== 'admin' && (
            <div className="flex h-full items-center justify-center text-slate-500">
              管理者権限が必要です
            </div>
          )}
        </main>
      </div>
    </div>
    </>
  );
}

// --- 3. Structure Components ---

// ピンコード入力モーダル
const PinCodeModal = ({ onVerify, onCancel, instructorName }) => {
  const [pinCode, setPinCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pinCode.length === 4 && instructorName) {
      onVerify(instructorName, pinCode);
    } else {
      toast.error("ピンコードは4桁で入力してください");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4 text-center">管理者認証</h2>
        <p className="text-sm text-slate-600 mb-6 text-center">管理者としてログインするには、ピンコードが必要です</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
            <label className="block text-xs font-medium text-slate-500 mb-1">管理者名</label>
            <div className="text-lg font-bold text-slate-800">{instructorName}</div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">ピンコード（4桁）</label>
            <input
              type="password"
              value={pinCode}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setPinCode(value);
              }}
              className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-center text-2xl tracking-widest font-mono"
              placeholder="0000"
              maxLength={4}
              required
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={pinCode.length !== 4}
              className="flex-1 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              認証
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const Navigation = ({ activeTab, setActiveTab, onLogout, userRole }) => (
  <div className="md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all z-20 md:relative fixed bottom-0 w-full md:h-full h-16 border-t md:border-t-0 border-slate-800">
    <div className="p-6 hidden md:flex items-center gap-3 border-b border-slate-800">
      <Activity className="text-blue-400" size={24} />
      <span className="font-bold text-lg tracking-wide">Rhythm</span>
    </div>

    <nav className="flex-1 flex md:flex-col justify-around md:justify-start p-2 md:space-y-2">
      <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={<Home size={24} />} label="掲示板" />
      <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<Calendar size={24} />} label="カレンダー" />
      <NavButton active={activeTab === 'grades'} onClick={() => setActiveTab('grades')} icon={<Award size={24} />} label="成績表" />
      {userRole === 'admin' && (
        <NavButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} icon={<Settings size={24} />} label="管理者" />
      )}
    </nav>

    <div className="p-4 border-t border-slate-800 hidden md:block">
      <button onClick={onLogout} className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-300 w-full p-2 rounded hover:bg-slate-800 transition">
        <LogOut size={20} /> ログアウト
      </button>
    </div>
  </div>
);

const NavButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex flex-col md:flex-row items-center md:justify-start md:gap-3 p-2 md:px-4 md:py-3 rounded-xl transition-all w-full
      ${active ? 'text-blue-400 md:bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
  >
    {icon}
    <span className="text-[10px] md:text-sm font-medium">{label}</span>
  </button>
);

const Header = ({ activeTab, userProfile }) => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <header className="bg-white shadow-sm px-4 py-3 flex justify-between items-center z-10">
      <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
        {activeTab === 'home' && <><List className="text-blue-600"/> 今月の予定・連絡</>}
        {activeTab === 'calendar' && <><Calendar className="text-blue-600"/> カレンダー</>}
        {activeTab === 'grades' && <><Award className="text-blue-600"/> 成績表</>}
        {activeTab === 'admin' && <><Users className="text-blue-600"/> 管理・集計</>}
      </h2>
      <div className="flex items-center gap-2">
        <div className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-1 rounded-full">
          {APP_VERSION_LABEL}
        </div>
        <button
          onClick={handleRefresh}
          className="text-slate-500 hover:text-blue-600 transition p-2 hover:bg-slate-100 rounded-lg"
          title="アプリを更新"
        >
          <RefreshCw size={18} />
        </button>
        <div className="text-xs text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full">
          {userProfile.name} さん
        </div>
      </div>
    </header>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
